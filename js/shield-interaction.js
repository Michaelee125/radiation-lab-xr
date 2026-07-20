import { SCENE_CONFIG } from './config.js';

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
      this.activeGrab = null;
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
      this.syncToState(window.radiationLab.state.snapshot());
    },

    beginGrab(type, el, raycasterEl, intersection = null, ray = null) {
      if (!ray && !raycasterEl?.components?.raycaster) return;
      if (this.activeGrab?.el === el) return;
      if (this.activeGrab) this.endGrab();
      const raycasterComponent = raycasterEl?.components?.raycaster;
      const hit = intersection || raycasterComponent?.getIntersection?.(el);
      this.activeGrab = {
        type,
        el,
        raycasterEl,
        ray,
        isDesktop: Boolean(ray),
        distance: Math.max(0.6, hit?.distance || SCENE_CONFIG.grabDistance)
      };
      if (window.radiationLab.state.snapshot().activeShield === type) {
        window.radiationLab.state.setShield('none');
      }
      el.setAttribute('material', 'emissive', '#233a5f');
      el.setAttribute('material', 'emissiveIntensity', 0.35);
    },

    endGrab() {
      if (!this.activeGrab) return;
      const { type, el, raycasterEl, ray } = this.activeGrab;
      this.activeGrab = null;
      el.setAttribute('material', 'emissiveIntensity', 0);
      const distance = el.object3D.position.distanceTo(this.holderVector);
      const releaseRay = ray || raycasterEl?.components?.raycaster?.raycaster?.ray;
      const aimedAtHolder = releaseRay
        ? releaseRay.distanceSqToPoint(this.holderVector) <= SCENE_CONFIG.shieldSnapDistance ** 2
        : false;
      if (distance <= SCENE_CONFIG.shieldSnapDistance || aimedAtHolder) {
        window.radiationLab.state.setShield(type);
      } else {
        setPosition(el, SCENE_CONFIG.rackPositions[type]);
      }
    },

    syncToState(state) {
      if (this.activeGrab) return;
      for (const [type, el] of this.materials) {
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

    tick() {
      if (!this.activeGrab) return;
      const { el, raycasterEl, distance, ray } = this.activeGrab;
      const activeRay = ray || raycasterEl?.components?.raycaster?.raycaster?.ray;
      if (!activeRay) return;
      const worldPoint = activeRay.at(distance, new THREE.Vector3());
      this.el.object3D.worldToLocal(worldPoint);
      el.object3D.position.copy(worldPoint);
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
