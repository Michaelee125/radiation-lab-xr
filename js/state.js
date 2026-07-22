import { DEFAULT_STATE, RADIATION_TYPES, SHIELD_TYPES } from './config.js';

function cloneDefaults() {
  return {
    ...DEFAULT_STATE,
    selectedRadiation: { ...DEFAULT_STATE.selectedRadiation }
  };
}

export class AppState extends EventTarget {
  constructor(initial = {}) {
    super();
    this.value = {
      ...cloneDefaults(),
      ...initial,
      selectedRadiation: {
        ...DEFAULT_STATE.selectedRadiation,
        ...(initial.selectedRadiation || {})
      }
    };
    this.#ensureRadiationSelection();
    this.#ensureModeInvariants();
  }

  snapshot() {
    return {
      ...this.value,
      selectedRadiation: { ...this.value.selectedRadiation }
    };
  }

  subscribe(listener, emitImmediately = true) {
    const wrapped = (event) => listener(event.detail);
    this.addEventListener('change', wrapped);
    if (emitImmediately) listener({ state: this.snapshot(), reason: 'initial' });
    return () => this.removeEventListener('change', wrapped);
  }

  toggleRadiation(type) {
    if (!RADIATION_TYPES.includes(type)) return false;
    const next = { ...this.value.selectedRadiation, [type]: !this.value.selectedRadiation[type] };
    if (!RADIATION_TYPES.some((key) => next[key])) return false;
    this.value.selectedRadiation = next;
    this.#notify('selectedRadiation');
    return true;
  }

  setShield(shield) {
    if (!SHIELD_TYPES.includes(shield)) return false;
    if (this.value.activeShield === shield) return true;
    this.value.activeShield = shield;
    this.#notify('activeShield');
    return true;
  }

  setPaths(visible) {
    if (this.value.mysteryMode && visible) return false;
    this.value.showPaths = Boolean(visible);
    this.#notify('showPaths');
    return true;
  }

  togglePaths() {
    return this.setPaths(!this.value.showPaths);
  }

  setControlsVisible(visible) {
    if (this.value.mysteryMode && visible) return false;
    this.value.controlsVisible = Boolean(visible);
    this.#notify('controlsVisible');
    return true;
  }

  toggleControls() {
    return this.setControlsVisible(!this.value.controlsVisible);
  }

  setMysteryMode(enabled) {
    const mysteryMode = Boolean(enabled);
    this.value.mysteryMode = mysteryMode;
    this.value.showPaths = !mysteryMode;
    this.value.controlsVisible = !mysteryMode;
    this.#notify('mysteryMode');
  }

  toggleMysteryMode() {
    this.setMysteryMode(!this.value.mysteryMode);
  }

  setSound(enabled) {
    this.value.soundEnabled = Boolean(enabled);
    this.#notify('soundEnabled');
  }

  toggleSound() {
    this.setSound(!this.value.soundEnabled);
  }

  setCounter({ instantaneousCounts, countRate = instantaneousCounts, rollingAverage }) {
    this.value.instantaneousCounts = Math.max(0, Number(instantaneousCounts) || 0);
    this.value.countRate = Math.max(0, Number(countRate) || 0);
    this.value.rollingAverage = Math.max(0, Number(rollingAverage) || 0);
    this.#notify('counter');
  }

  setOfflineReady(ready) {
    this.value.offlineReady = Boolean(ready);
    this.#notify('offlineReady');
  }

  reset() {
    // Offline readiness describes the installed app shell, not the experiment.
    // Keep it stable when classroom users reset the apparatus.
    const offlineReady = this.value.offlineReady;
    this.value = { ...cloneDefaults(), offlineReady };
    this.#notify('reset');
  }

  #ensureRadiationSelection() {
    if (!RADIATION_TYPES.some((type) => this.value.selectedRadiation[type])) {
      this.value.selectedRadiation.alpha = true;
    }
  }

  #ensureModeInvariants() {
    if (!this.value.mysteryMode) return;
    this.value.showPaths = false;
    this.value.controlsVisible = false;
  }

  #notify(reason) {
    this.dispatchEvent(new CustomEvent('change', {
      detail: { state: this.snapshot(), reason }
    }));
  }
}

export function createAppState(initial) {
  return new AppState(initial);
}
