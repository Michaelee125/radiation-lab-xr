import { PHYSICS_CONFIG } from './config.js';
import { expectedCountRate, poissonSample } from './physics-model.js';

export class GMCounter extends EventTarget {
  constructor(appState, random = Math.random) {
    super();
    this.appState = appState;
    this.random = random;
    this.history = [];
    this.timer = null;
    this.audioContext = null;
    this.audioReady = false;
    this.unsubscribe = appState.subscribe(({ state, reason }) => {
      if (reason === 'reset') this.history.length = 0;
      if (reason === 'activeShield') {
        if (state.activeShield === 'lead') this.history.length = 0;
        if (this.timer) this.sample();
      }
    });
  }

  start() {
    if (this.timer) return;
    this.sample();
    this.timer = window.setInterval(() => this.sample(), 1000);
  }

  stop() {
    window.clearInterval(this.timer);
    this.timer = null;
    this.unsubscribe?.();
  }

  sample() {
    if (document.hidden) return;
    const state = this.appState.snapshot();
    const expected = expectedCountRate(state.selectedRadiation, state.activeShield);
    const count = poissonSample(expected, this.random);
    this.history.push(count);
    if (this.history.length > PHYSICS_CONFIG.rollingAverageSeconds) this.history.shift();
    const rollingAverage = this.history.reduce((sum, value) => sum + value, 0) / this.history.length;
    this.appState.setCounter({ instantaneousCounts: count, countRate: count, rollingAverage });
    if (state.soundEnabled && this.audioReady) this.#playClicks(count);
  }

  async enableAudio() {
    if (this.audioReady) return true;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return false;
    if (!this.audioContext) this.audioContext = new AudioContext();
    try {
      await this.audioContext.resume();
      this.audioReady = this.audioContext.state === 'running';
      this.dispatchEvent(new Event('audiochange'));
      return this.audioReady;
    } catch {
      return false;
    }
  }

  #playClicks(numericalCount) {
    const audibleCount = Math.min(numericalCount, PHYSICS_CONFIG.maximumAudibleClicksPerSecond);
    if (!audibleCount || !this.audioContext) return;
    const start = this.audioContext.currentTime + 0.01;
    for (let index = 0; index < audibleCount; index += 1) {
      const at = start + (index / audibleCount) * 0.88 + this.random() * 0.012;
      const oscillator = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(1050 + this.random() * 280, at);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.055, at + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.018);
      oscillator.connect(gain).connect(this.audioContext.destination);
      oscillator.start(at);
      oscillator.stop(at + 0.02);
    }
  }
}
