import { createAppState } from './state.js';
import { GMCounter } from './gm-counter.js';
import { registerRadiationComponents } from './radiation-emitter.js';
import { registerShieldComponents } from './shield-interaction.js';
import { registerQuestControls } from './quest-controls.js';
import { registerUIComponents, UIController } from './ui-controller.js';

const state = createAppState();
window.radiationLab = { state };

registerRadiationComponents();
registerShieldComponents();
registerQuestControls();
registerUIComponents();

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./service-worker.js').then(async (registration) => {
    await navigator.serviceWorker.ready;
    state.setOfflineReady(true);
    registration.update().catch(() => {});
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          window.radiationLab.ui?.showToast('Update cached. Reopen after class to use it.');
        }
      });
    });
  }).catch(() => {
    window.radiationLab.ui?.showToast('Offline caching needs localhost or HTTPS.');
  });
}

function initialize() {
  const gmCounter = new GMCounter(state);
  const ui = new UIController(state, gmCounter);
  window.radiationLab.gmCounter = gmCounter;
  window.radiationLab.ui = ui;
  gmCounter.start();
  registerServiceWorker();

  const scene = document.getElementById('lab-scene');
  scene?.addEventListener('enter-vr', () => gmCounter.enableAudio());
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) gmCounter.sample();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize, { once: true });
} else {
  initialize();
}
