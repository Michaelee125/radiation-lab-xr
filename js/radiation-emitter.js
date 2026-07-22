import { RADIATION_CONFIG, RADIATION_TYPES, SCENE_CONFIG } from './config.js';
import { shouldTransmit } from './physics-model.js';

const sphereGeometry = new THREE.SphereGeometry(1, 8, 6);
const materialCache = new Map();

function material(color, emissive = false) {
  const key = `${color}/${emissive}`;
  if (!materialCache.has(key)) {
    materialCache.set(key, new THREE.MeshBasicMaterial({ color }));
  }
  return materialCache.get(key);
}

function sphere(radius, color, position) {
  const mesh = new THREE.Mesh(sphereGeometry, material(color));
  mesh.scale.setScalar(radius);
  mesh.position.set(...position);
  return mesh;
}

function registerParticleModels() {
  AFRAME.registerComponent('alpha-particle-model', {
    init() {
      const group = new THREE.Group();
      group.add(sphere(0.055, '#ff6b57', [-0.035, 0.035, 0]));
      group.add(sphere(0.055, '#ff6b57', [0.035, -0.035, 0]));
      group.add(sphere(0.055, '#f3f7ff', [0.035, 0.035, 0]));
      group.add(sphere(0.055, '#f3f7ff', [-0.035, -0.035, 0]));
      this.el.setObject3D('alpha-model', group);
    }
  });

  AFRAME.registerComponent('beta-particle-model', {
    init() {
      const group = new THREE.Group();
      group.add(sphere(0.035, RADIATION_CONFIG.beta.color, [0, 0, 0]));
      const marker = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.012, 0.012), material('#ffffff'));
      marker.position.set(0, 0.075, 0);
      group.add(marker);
      this.el.setObject3D('beta-model', group);
    }
  });

  AFRAME.registerComponent('gamma-particle-model', {
    init() {
      const points = [];
      for (let index = 0; index <= 14; index += 1) {
        const x = (index / 14 - 0.5) * 0.28;
        points.push(new THREE.Vector3(x, Math.sin(index * 1.6) * 0.035, 0));
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({
        color: RADIATION_CONFIG.gamma.color
      }));
      this.el.setObject3D('gamma-model', line);
    }
  });

  AFRAME.registerComponent('particle-trail', {
    schema: { type: { type: 'string' } },
    init() {
      const type = this.data.type;
      const points = [];
      if (type === 'gamma') {
        for (let index = 0; index <= 18; index += 1) {
          const x = -(index / 18) * 0.5;
          points.push(new THREE.Vector3(x, Math.sin(index * 1.45) * 0.025, 0));
        }
      } else {
        points.push(new THREE.Vector3(-0.52, 0, 0), new THREE.Vector3(-0.08, 0, 0));
      }

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      let lineMaterial;
      if (type === 'beta') {
        lineMaterial = new THREE.LineDashedMaterial({
          color: RADIATION_CONFIG[type].trailColor,
          dashSize: 0.055,
          gapSize: 0.035
        });
      } else {
        lineMaterial = new THREE.LineBasicMaterial({
          color: RADIATION_CONFIG[type].trailColor,
          transparent: true,
          opacity: type === 'alpha' ? 0.72 : 0.58
        });
      }
      this.line = new THREE.Line(geometry, lineMaterial);
      if (type === 'beta') this.line.computeLineDistances();
      this.el.setObject3D('trail', this.line);
    },
    setVisible(visible) {
      if (this.line) this.line.visible = visible;
    }
  });
}

function createParticle(type, parent) {
  const el = document.createElement('a-entity');
  el.setAttribute(`${type}-particle-model`, '');
  el.setAttribute('particle-trail', `type: ${type}`);
  el.setAttribute('visible', false);
  parent.appendChild(el);
  return {
    el,
    type,
    active: false,
    x: SCENE_CONFIG.sourceX,
    encounteredShields: new Set(),
    absorbing: false,
    absorbElapsed: 0
  };
}

export function registerRadiationComponents() {
  registerParticleModels();

  AFRAME.registerComponent('radiation-emitter', {
    init() {
      this.pools = {};
      this.elapsed = { alpha: 0, beta: 0, gamma: 0 };
      this.latestState = window.radiationLab.state.snapshot();
      for (const type of RADIATION_TYPES) {
        this.pools[type] = Array.from(
          { length: RADIATION_CONFIG[type].poolSize },
          () => createParticle(type, this.el)
        );
      }
      this.unsubscribe = window.radiationLab.state.subscribe(({ state }) => {
        this.latestState = state;
        for (const type of RADIATION_TYPES) {
          for (const particle of this.pools[type]) this._setVisuals(particle, state.showPaths);
        }
      });
    },

    remove() {
      this.unsubscribe?.();
    },

    tick(_time, deltaMs) {
      if (document.hidden || !Number.isFinite(deltaMs)) return;
      const safeDelta = Math.min(deltaMs, 80);
      for (const type of RADIATION_TYPES) {
        if (this.latestState.selectedRadiation[type]) {
          this.elapsed[type] += safeDelta;
          if (this.elapsed[type] >= RADIATION_CONFIG[type].emissionIntervalMs) {
            this.elapsed[type] %= RADIATION_CONFIG[type].emissionIntervalMs;
            this._spawn(type);
          }
        } else {
          this.elapsed[type] = 0;
        }
        for (const particle of this.pools[type]) this._advance(particle, safeDelta);
      }
    },

    _spawn(type) {
      const particle = this.pools[type].find((candidate) => !candidate.active);
      if (!particle) return;
      particle.active = true;
      particle.encounteredShields.clear();
      particle.absorbing = false;
      particle.absorbElapsed = 0;
      particle.x = SCENE_CONFIG.sourceX;
      particle.el.object3D.position.set(particle.x, RADIATION_CONFIG[type].laneY, 0);
      particle.el.object3D.scale.setScalar(1);
      this._setVisuals(particle, this.latestState.showPaths);
    },

    _advance(particle, deltaMs) {
      if (!particle.active) return;
      if (particle.absorbing) {
        particle.absorbElapsed += deltaMs;
        const progress = Math.min(1, particle.absorbElapsed / SCENE_CONFIG.absorbPauseMs);
        particle.el.object3D.scale.setScalar(1 + progress * 0.65);
        if (progress >= 1) this._release(particle);
        return;
      }

      const previousX = particle.x;
      particle.x += RADIATION_CONFIG[particle.type].speed * (deltaMs / 1000);
      const interaction = this.el.sceneEl.systems['shield-manager']?.getActiveInteraction();
      if (interaction && !particle.encounteredShields.has(interaction.type)) {
        const shieldStartX = interaction.x - interaction.halfX;
        const shieldEndX = interaction.x + interaction.halfX;
        const intersectsShield = previousX <= shieldEndX && particle.x >= shieldStartX;
        if (intersectsShield) {
          particle.encounteredShields.add(interaction.type);
          if (!shouldTransmit(interaction.type, particle.type)) {
            particle.x = shieldStartX - 0.03;
            particle.absorbing = true;
          }
        }
      }
      particle.el.object3D.position.x = particle.x;
      if (particle.x >= SCENE_CONFIG.particleEndX) this._release(particle);
    },

    _setVisuals(particle, visible) {
      const showParticle = Boolean(visible && particle.active);
      particle.el.setAttribute('visible', showParticle);
      particle.el.components['particle-trail']?.setVisible(showParticle);
    },

    _release(particle) {
      particle.active = false;
      particle.el.object3D.scale.setScalar(1);
      this._setVisuals(particle, false);
    }
  });
}
