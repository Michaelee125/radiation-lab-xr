import test from 'node:test';
import assert from 'node:assert/strict';
import { AppState } from '../js/state.js';
import { DEFAULT_STATE } from '../js/config.js';
import { expectedCountRate } from '../js/physics-model.js';

test('state prevents the accidental all-off source state', () => {
  const state = new AppState();
  assert.equal(state.toggleRadiation('alpha'), false);
  assert.equal(state.snapshot().selectedRadiation.alpha, true);
});

test('all seven valid source combinations can be represented', () => {
  const desired = [
    { alpha: true, beta: false, gamma: false },
    { alpha: false, beta: true, gamma: false },
    { alpha: false, beta: false, gamma: true },
    { alpha: true, beta: true, gamma: false },
    { alpha: true, beta: false, gamma: true },
    { alpha: false, beta: true, gamma: true },
    { alpha: true, beta: true, gamma: true }
  ];
  for (const selectedRadiation of desired) {
    const state = new AppState({ selectedRadiation });
    assert.deepEqual(state.snapshot().selectedRadiation, selectedRadiation);
  }
});

test('reset restores documented defaults', () => {
  const state = new AppState();
  state.toggleRadiation('beta');
  state.setShield('lead');
  state.setPaths(false);
  state.setSound(false);
  state.setCounter({ instantaneousCounts: 17, rollingAverage: 12.3 });
  state.reset();
  assert.deepEqual(state.snapshot(), { ...DEFAULT_STATE, selectedRadiation: { ...DEFAULT_STATE.selectedRadiation } });
});

test('reset preserves the offline-ready installation status', () => {
  const state = new AppState();
  state.setOfflineReady(true);
  state.setShield('lead');
  state.reset();
  assert.equal(state.snapshot().offlineReady, true);
  assert.equal(state.snapshot().activeShield, DEFAULT_STATE.activeShield);
});

test('path visibility does not affect detector readings', () => {
  const state = new AppState({ selectedRadiation: { alpha: true, beta: true, gamma: true } });
  const before = expectedCountRate(state.snapshot().selectedRadiation, state.snapshot().activeShield);
  state.setPaths(false);
  const after = expectedCountRate(state.snapshot().selectedRadiation, state.snapshot().activeShield);
  assert.equal(before, after);
});

test('only one shield state can be active at a time', () => {
  const state = new AppState();
  state.setShield('paper');
  state.setShield('lead');
  assert.equal(state.snapshot().activeShield, 'lead');
});
