import { PHYSICS_CONFIG, RADIATION_CONFIG, RADIATION_TYPES } from './config.js';
import { describeOutcome } from './physics-model.js';

const ACTIVE_COLOR = '#1f7a5a';
const INACTIVE_COLOR = '#243149';
const ACTION_COLOR = '#315178';
const CONTROL_BUTTON_IDS = [
  'alpha-button', 'beta-button', 'gamma-button', 'paths-button',
  'sound-button', 'remove-button', 'reset-button'
];

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.setAttribute('text', 'value', value);
}

function selectedNames(state) {
  return RADIATION_TYPES.filter((type) => state.selectedRadiation[type])
    .map((type) => RADIATION_CONFIG[type].label)
    .join(' + ');
}

export function analogueMeterAngle(countRate) {
  const safeRate = Math.max(0, Number(countRate) || 0);
  const meterFraction = Math.min(1, safeRate / PHYSICS_CONFIG.analogueMeterMaxCps);
  return 70 - meterFraction * 140;
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
    this.meterAngle = 70;
    this.meterAnimationFrame = null;
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
        this.showToast(this.appState.snapshot().showPaths
          ? 'Radiation models and paths revealed.'
          : 'Radiation models and paths hidden.');
        break;
      case 'toggle-controls':
        if (this.appState.snapshot().mysteryMode) {
          this.showToast('Exit Mystery Mode before showing the control panel.');
          break;
        }
        this.appState.toggleControls();
        this.showToast(this.appState.snapshot().controlsVisible
          ? 'Source and experiment controls shown.'
          : 'Source and experiment controls hidden.');
        break;
      case 'toggle-mystery':
        this.appState.toggleMysteryMode();
        this.showToast(this.appState.snapshot().mysteryMode
          ? 'Mystery Mode: sources, paths and controls are hidden.'
          : 'Mystery Mode ended: visuals and controls restored.');
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

    this.#updateToggle(
      'paths-button',
      'paths-button-label',
      state.showPaths,
      state.showPaths ? '[VISIBLE] Radiation' : '[HIDDEN] Radiation',
      true
    );
    const soundLabel = state.soundEnabled
      ? (this.gmCounter.audioReady ? '[ON] Sound' : '[ON] Enable sound')
      : '[OFF] Sound';
    this.#updateToggle('sound-button', 'sound-button-label', state.soundEnabled, soundLabel, true);

    for (const id of ['remove-button', 'reset-button']) {
      document.getElementById(id)?.setAttribute('material', 'color', ACTION_COLOR);
    }

    const controlsInteractive = state.controlsVisible && !state.mysteryMode;
    document.getElementById('control-panel')?.setAttribute('visible', controlsInteractive);
    for (const id of CONTROL_BUTTON_IDS) {
      document.getElementById(id)?.classList.toggle('interactive', controlsInteractive);
    }
    const controlsToggle = document.getElementById('controls-toggle-button');
    controlsToggle?.setAttribute('visible', !state.mysteryMode);
    controlsToggle?.classList.toggle('interactive', !state.mysteryMode);
    controlsToggle?.setAttribute(
      'material',
      'color',
      state.controlsVisible ? ACTION_COLOR : ACTIVE_COLOR
    );
    setText('controls-toggle-label', state.controlsVisible ? '[HIDE] CONTROLS' : '[SHOW] CONTROLS');
    document.getElementById('mystery-mode-button')?.setAttribute(
      'material',
      'color',
      state.mysteryMode ? ACTIVE_COLOR : ACTION_COLOR
    );
    setText('mystery-mode-label', state.mysteryMode ? '[EXIT] MYSTERY' : '[START] MYSTERY');

    const shieldLabel = state.activeShield === 'none'
      ? 'NO SHIELD'
      : state.activeShield.toUpperCase();
    setText('active-shield-label', `LIVE SHIELD: ${shieldLabel}`);
    setText('count-display', `${Math.round(state.countRate)} CPS`);
    setText('rate-display', `LAST 1 s: ${state.instantaneousCounts.toFixed(0)} COUNTS`);
    setText(
      'average-display',
      `${PHYSICS_CONFIG.rollingAverageSeconds} s AVG: ${state.rollingAverage.toFixed(1)} CPS`
    );
    setText('gm-shield-display', `SHIELD: ${shieldLabel}`);
    setText(
      'gm-radiation-display',
      state.showPaths && !state.mysteryMode
        ? `SOURCES: ${selectedNames(state).toUpperCase()}`
        : 'SOURCES: HIDDEN - INFER FROM EVIDENCE'
    );

    const meterAngle = analogueMeterAngle(state.countRate);
    this.#animateMeterNeedle(meterAngle);

    const outcomes = state.showPaths && !state.mysteryMode
      ? RADIATION_TYPES
        .filter((type) => state.selectedRadiation[type])
        .map((type) => describeOutcome(type, state.activeShield))
      : [
        'MYSTERY MODE: RADIATION VISUALS ARE HIDDEN.',
        'USE THE SHIELDS AND GM RATE TO INFER THE SOURCE.',
        'REVEAL THE VISUALS WHEN THE CLASS IS READY.'
      ];
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

  #animateMeterNeedle(targetAngle) {
    const needle = document.getElementById('gm-meter-needle');
    if (!needle) return;
    const safeTarget = Number.isFinite(targetAngle) ? targetAngle : 70;
    needle.setAttribute('data-target-angle', safeTarget.toFixed(1));
    window.cancelAnimationFrame(this.meterAnimationFrame);

    if (!needle.object3D || Math.abs(safeTarget - this.meterAngle) < 0.05) {
      this.meterAngle = safeTarget;
      needle.setAttribute('rotation', `0 0 ${safeTarget.toFixed(1)}`);
      needle.setAttribute('data-current-angle', safeTarget.toFixed(1));
      return;
    }

    const startAngle = this.meterAngle;
    const startTime = window.performance.now();
    const durationMs = 620;
    const animate = (time) => {
      const progress = Math.min(1, (time - startTime) / durationMs);
      const eased = 1 - (1 - progress) ** 3;
      this.meterAngle = startAngle + (safeTarget - startAngle) * eased;
      needle.object3D.rotation.z = this.meterAngle * Math.PI / 180;
      needle.setAttribute('data-current-angle', this.meterAngle.toFixed(1));
      if (progress < 1) {
        this.meterAnimationFrame = window.requestAnimationFrame(animate);
      } else {
        needle.setAttribute('rotation', `0 0 ${safeTarget.toFixed(1)}`);
      }
    };
    this.meterAnimationFrame = window.requestAnimationFrame(animate);
  }

  #updateToggle(buttonId, labelId, active, label, exactLabel = false) {
    document.getElementById(buttonId)?.setAttribute('material', 'color', active ? ACTIVE_COLOR : INACTIVE_COLOR);
    setText(labelId, exactLabel ? label : `${active ? '[ON]' : '[OFF]'} ${label}`);
  }
}
