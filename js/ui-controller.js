import { PHYSICS_CONFIG, RADIATION_CONFIG, RADIATION_TYPES } from './config.js';
import { describeOutcome } from './physics-model.js';

const ACTIVE_COLOR = '#1f7a5a';
const INACTIVE_COLOR = '#243149';
const ACTION_COLOR = '#315178';

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.setAttribute('text', 'value', value);
}

function selectedNames(state) {
  return RADIATION_TYPES.filter((type) => state.selectedRadiation[type])
    .map((type) => RADIATION_CONFIG[type].label)
    .join(' + ');
}

export function registerUIComponents() {
  AFRAME.registerComponent('ui-button', {
    schema: {
      action: { type: 'string' },
      value: { type: 'string', default: '' }
    },
    init() {
      this.onClick = () => window.radiationLab.ui?.handleAction(this.data.action, this.data.value);
      this.onEnter = () => this.el.object3D.scale.setScalar(1.045);
      this.onLeave = () => this.el.object3D.scale.setScalar(1);
      this.el.addEventListener('click', this.onClick);
      this.el.addEventListener('mouseenter', this.onEnter);
      this.el.addEventListener('mouseleave', this.onLeave);
    },
    remove() {
      this.el.removeEventListener('click', this.onClick);
      this.el.removeEventListener('mouseenter', this.onEnter);
      this.el.removeEventListener('mouseleave', this.onLeave);
    }
  });
}

export class UIController {
  constructor(appState, gmCounter) {
    this.appState = appState;
    this.gmCounter = gmCounter;
    this.toastTimer = null;
    this.unsubscribe = appState.subscribe(({ state }) => this.render(state));
    this.audioListener = () => this.render(this.appState.snapshot());
    gmCounter.addEventListener('audiochange', this.audioListener);
  }

  async handleAction(action, value) {
    const audioWasReady = this.gmCounter.audioReady;
    if (this.appState.snapshot().soundEnabled) this.gmCounter.enableAudio();

    switch (action) {
      case 'toggle-radiation':
        if (!this.appState.toggleRadiation(value)) {
          this.showToast('At least one radiation type must stay selected.');
        }
        break;
      case 'toggle-paths':
        this.appState.togglePaths();
        break;
      case 'toggle-sound':
        if (this.appState.snapshot().soundEnabled && !audioWasReady) {
          const enabled = await this.gmCounter.enableAudio();
          this.showToast(enabled ? 'Sound enabled.' : 'Tap again if the browser still blocks sound.');
        } else {
          this.appState.toggleSound();
        }
        break;
      case 'remove-shield':
        this.appState.setShield('none');
        break;
      case 'reset':
        this.appState.reset();
        this.showToast('Experiment reset.');
        break;
      default:
        break;
    }
  }

  render(state) {
    for (const type of RADIATION_TYPES) {
      const active = state.selectedRadiation[type];
      const button = document.getElementById(`${type}-button`);
      button?.setAttribute('material', 'color', active ? ACTIVE_COLOR : INACTIVE_COLOR);
      button?.setAttribute('material', 'emissive', active ? RADIATION_CONFIG[type].color : '#000000');
      button?.setAttribute('material', 'emissiveIntensity', active ? 0.12 : 0);
      setText(`${type}-button-label`, `${active ? '[ON]' : '[OFF]'} ${RADIATION_CONFIG[type].label}`);
    }

    this.#updateToggle('paths-button', 'paths-button-label', state.showPaths, 'Paths');
    const soundLabel = state.soundEnabled
      ? (this.gmCounter.audioReady ? '[ON] Sound' : '[ON] Enable sound')
      : '[OFF] Sound';
    this.#updateToggle('sound-button', 'sound-button-label', state.soundEnabled, soundLabel, true);

    for (const id of ['remove-button', 'reset-button']) {
      document.getElementById(id)?.setAttribute('material', 'color', ACTION_COLOR);
    }

    const shieldLabel = state.activeShield === 'none'
      ? 'NO SHIELD'
      : state.activeShield.toUpperCase();
    setText('active-shield-label', `ACTIVE SHIELD: ${shieldLabel}`);
    setText('count-display', String(Math.round(state.instantaneousCounts)).padStart(3, '0'));
    setText('rate-display', `LAST 1 s: ${state.countRate.toFixed(0)} counts | ${state.countRate.toFixed(0)} cps`);
    setText(
      'average-display',
      `${PHYSICS_CONFIG.rollingAverageSeconds} s ROLLING AVG: ${state.rollingAverage.toFixed(1)} cps`
    );
    setText('gm-shield-display', `Shield: ${shieldLabel}`);
    setText('gm-radiation-display', `Sources: ${selectedNames(state)}`);

    const outcomes = RADIATION_TYPES
      .filter((type) => state.selectedRadiation[type])
      .map((type) => describeOutcome(type, state.activeShield));
    for (let index = 0; index < 3; index += 1) {
      setText(`outcome-line-${index + 1}`, outcomes[index] || '');
    }

    const offlineText = state.offlineReady ? 'OFFLINE READY' : 'CACHING FOR OFFLINE USE...';
    setText('offline-scene-status', offlineText);
    const status = document.getElementById('offline-status');
    if (status) {
      status.textContent = state.offlineReady ? 'Offline ready' : 'Preparing offline use…';
      status.dataset.ready = String(state.offlineReady);
    }
  }

  showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    window.clearTimeout(this.toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    this.toastTimer = window.setTimeout(() => { toast.hidden = true; }, 2600);
  }

  #updateToggle(buttonId, labelId, active, label, exactLabel = false) {
    document.getElementById(buttonId)?.setAttribute('material', 'color', active ? ACTIVE_COLOR : INACTIVE_COLOR);
    setText(labelId, exactLabel ? label : `${active ? '[ON]' : '[OFF]'} ${label}`);
  }
}
