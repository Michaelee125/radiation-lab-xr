import { SCENE_CONFIG } from './config.js';
import { isShieldInBeam } from './physics-model.js';

function setPosition(el, position) {
  el.object3D.position.set(position.x, position.y, position.z);
  el.object3D.rotation.set(0, 0, 0);
}

function findShieldElement(object) {
  let current = object;
  while (current) {
    if (current.el?.components?.['shield-object']) return current.el;
    current = current.parent;
  }
  return null;
}

export function registerShieldComponents() {
  AFRAME.registerSystem('shield-manager', {
    init() {
      this.materials = new Map();
      this.materialBounds = new Map();
      this.activeGrab = null;
      this.latestState = window.radiationLab.state.snapshot();
      this.worldPosition = new THREE.Vector3();
      this.dragPlane = new THREE.Plane(
        new THREE.Vector3(0, 0, 1),
        -SCENE_CONFIG.apparatusZ
      );
      this.activeInteraction = {
        type: 'none',
        x: 0,
        halfX: 0
      };
      this.desktopRaycaster = new THREE.Raycaster();
      this.pointerNdc = new THREE.Vector2();
      this.holderVector = new THREE.Vector3(
        SCENE_CONFIG.holderPosition.x,
        SCENE_CONFIG.holderPosition.y,
        SCENE_CONFIG.holderPosition.z
      );
      this.releaseFromPointer = (event) => {
        if (this.activeGrab?.isDesktop) this.updateDesktopRay(event);
        this.endGrab();
      };
      this.moveFromPointer = (event) => {
        if (this.activeGrab?.isDesktop) this.updateDesktopRay(event);
      };
      this.startFromPointer = (event) => this.beginDesktopGrab(event);
      this.setupCanvasPointer = () => {
        this.canvas = this.el.canvas;
        this.canvas?.addEventListener('pointerdown', this.startFromPointer);
      };
      window.addEventListener('pointerup', this.releaseFromPointer);
      window.addEventListener('pointermove', this.moveFromPointer);
      if (this.el.canvas) this.setupCanvasPointer();
      else this.el.addEventListener('render-target-loaded', this.setupCanvasPointer, { once: true });
      this.unsubscribe = window.radiationLab.state.subscribe(({ state, reason }) => {
        this.latestState = state;
        if (reason === 'activeShield' || reason === 'reset' || reason === 'initial') this.syncToState(state);
      });
    },

    remove() {
      window.removeEventListener('pointerup', this.releaseFromPointer);
      window.removeEventListener('pointermove', this.moveFromPointer);
      this.canvas?.removeEventListener('pointerdown', this.startFromPointer);
      this.unsubscribe?.();
    },

    registerMaterial(type, el) {
      this.materials.set(type, el);
      const geometry = el.getAttribute('geometry');
      this.materialBounds.set(type, {
        x: Math.max(0, Number(geometry?.width) || 0) / 2,
        y: Math.max(0, Number(geometry?.height) || 0) / 2,
        z: Math.max(0, Number(geometry?.depth) || 0) / 2
      });
      this.syncToState(window.radiationLab.state.snapshot());
    },

    beginGrab(type, el, raycasterEl, intersection = null, ray = null) {
      if (!ray && !raycasterEl?.components?.raycaster) return;
      if (this.activeGrab?.el === el) return;
      if (this.activeGrab) this.endGrab();
      const raycasterComponent = raycasterEl?.components?.raycaster;
      const hit = intersection || raycasterComponent?.getIntersection?.(el);
      el.object3D.getWorldPosition(this.worldPosition);
      const grabOffset = new THREE.Vector3();
      if (hit?.point) {
        grabOffset.set(
          this.worldPosition.x - hit.point.x,
          this.worldPosition.y - hit.point.y,
          0
        );
      }
      this.activeGrab = {
        type,
        el,
        raycasterEl,
        ray,
        grabOffset,
        isDesktop: Boolean(ray),
        distance: Math.max(0.6, hit?.distance || SCENE_CONFIG.grabDistance)
      };
      el.setAttribute('material', 'emissive', '#233a5f');
      el.setAttribute('material', 'emissiveIntensity', 0.35);
    },

    endGrab() {
      if (!this.activeGrab) return;
      this._moveActiveGrabToRay();
      const { type, el, raycasterEl, ray } = this.activeGrab;
      el.setAttribute('material', 'emissiveIntensity', 0);
      const distance = el.object3D.position.distanceTo(this.holderVector);
      const releaseRay = ray || raycasterEl?.components?.raycaster?.raycaster?.ray;
      const aimedAtHolder = releaseRay
        ? releaseRay.distanceSqToPoint(this.holderVector) <= SCENE_CONFIG.shieldSnapDistance ** 2
        : false;
      if (distance <= SCENE_CONFIG.shieldSnapDistance || aimedAtHolder) {
        setPosition(el, SCENE_CONFIG.holderPosition);
        window.radiationLab.state.setShield(type);
      } else if (this._isMaterialInBeam(type, el)) {
        // Keep a freely placed shield exactly where the student left it in the beam.
        window.radiationLab.state.setShield(type);
      } else {
        if (this.latestState.activeShield === type) window.radiationLab.state.setShield('none');
        setPosition(el, SCENE_CONFIG.rackPositions[type]);
      }
      this.activeGrab = null;
    },

    syncToState(state) {
      for (const [type, el] of this.materials) {
        if (this.activeGrab?.el === el) continue;
        const target = state.activeShield === type
          ? SCENE_CONFIG.holderPosition
          : SCENE_CONFIG.rackPositions[type];
        setPosition(el, target);
      }
    },

    updateDesktopRay(event) {
      if (!this.canvas || !this.el.camera || !Number.isFinite(event.clientX)) return;
      const rect = this.canvas.getBoundingClientRect();
      this.pointerNdc.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );
      this.desktopRaycaster.setFromCamera(this.pointerNdc, this.el.camera);
    },

    beginDesktopGrab(event) {
      if (event.button !== 0) return;
      this.updateDesktopRay(event);
      const targets = Array.from(this.materials.values()).map((el) => el.object3D);
      const intersections = this.desktopRaycaster.intersectObjects(targets, true);
      for (const intersection of intersections) {
        const matched = Array.from(this.materials.entries()).find(([, el]) => {
          let object = intersection.object;
          while (object) {
            if (object === el.object3D) return true;
            object = object.parent;
          }
          return false;
        });
        if (!matched) continue;
        const [type, el] = matched;
        this.beginGrab(type, el, null, intersection, this.desktopRaycaster.ray);
        event.preventDefault();
        break;
      }
    },

    _isMaterialInBeam(type, el) {
      const bounds = this.materialBounds.get(type);
      if (!bounds) return false;
      el.object3D.getWorldPosition(this.worldPosition);
      return isShieldInBeam(this.worldPosition, bounds);
    },

    _updateLiveShield() {
      if (!this.activeGrab) return;
      const { type, el } = this.activeGrab;
      const isEffective = this._isMaterialInBeam(type, el);
      if (isEffective && this.latestState.activeShield !== type) {
        window.radiationLab.state.setShield(type);
      } else if (!isEffective && this.latestState.activeShield === type) {
        window.radiationLab.state.setShield('none');
      }
    },

    _moveActiveGrabToRay() {
      if (!this.activeGrab) return;
      const { el, raycasterEl, distance, grabOffset, ray } = this.activeGrab;
      const activeRay = ray || raycasterEl?.components?.raycaster?.raycaster?.ray;
      if (!activeRay) return;
      const worldPoint = activeRay.intersectPlane(this.dragPlane, this.worldPosition)
        || activeRay.at(distance, this.worldPosition);
      worldPoint.add(grabOffset);
      this.el.object3D.worldToLocal(worldPoint);
      el.object3D.position.copy(worldPoint);
    },

    getActiveInteraction() {
      const type = this.latestState.activeShield;
      const el = this.materials.get(type);
      const bounds = this.materialBounds.get(type);
      if (!el || !bounds || !this._isMaterialInBeam(type, el)) {
        this.activeInteraction.type = 'none';
        return null;
      }
      el.object3D.getWorldPosition(this.worldPosition);
      this.activeInteraction.type = type;
      this.activeInteraction.x = this.worldPosition.x;
      this.activeInteraction.halfX = bounds.x;
      return this.activeInteraction;
    },

    tick() {
      if (!this.activeGrab) return;
      this._moveActiveGrabToRay();
      this._updateLiveShield();
    }
  });

  AFRAME.registerComponent('shield-object', {
    schema: { type: { type: 'string' } },
    init() {
      this.el.sceneEl.systems['shield-manager'].registerMaterial(this.data.type, this.el);
    }
  });

  AFRAME.registerComponent('quest-shield-grab', {
    init() {
      this.onTriggerDown = () => {
        const intersections = this.el.components.raycaster?.intersections || [];
        for (const intersection of intersections) {
          const shieldEl = findShieldElement(intersection.object);
          if (!shieldEl) continue;
          const type = shieldEl.components['shield-object'].data.type;
          this.el.sceneEl.systems['shield-manager'].beginGrab(type, shieldEl, this.el, intersection);
          break;
        }
      };
      this.onTriggerUp = () => this.el.sceneEl.systems['shield-manager'].endGrab();
      this.el.addEventListener('triggerdown', this.onTriggerDown);
      this.el.addEventListener('triggerup', this.onTriggerUp);
    },
    remove() {
      this.el.removeEventListener('triggerdown', this.onTriggerDown);
      this.el.removeEventListener('triggerup', this.onTriggerUp);
    }
  });
}
