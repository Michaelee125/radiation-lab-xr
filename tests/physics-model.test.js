import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSeededRandom,
  expectedCountRate,
  getTransmission,
  poissonSample,
  shouldTransmit
} from '../js/physics-model.js';
import { PHYSICS_CONFIG } from '../js/config.js';

test('paper blocks alpha', () => {
  assert.equal(getTransmission('paper', 'alpha'), 0);
  assert.equal(shouldTransmit('paper', 'alpha', () => 0), false);
});

test('paper mostly transmits beta', () => assert.ok(getTransmission('paper', 'beta') >= 0.9));
test('aluminium strongly reduces beta', () => assert.ok(getTransmission('aluminium', 'beta') <= 0.1));

test('lead reduces but does not eliminate gamma', () => {
  const factor = getTransmission('lead', 'gamma');
  assert.ok(factor > 0 && factor < 0.5);
});

test('background remains when selected radiation is fully blocked', () => {
  const rate = expectedCountRate({ alpha: true, beta: false, gamma: false }, 'paper');
  assert.equal(rate, PHYSICS_CONFIG.backgroundCountRate);
  assert.ok(poissonSample(rate, createSeededRandom(42)) >= 0);
});

test('multiple selected sources are additive', () => {
  const alpha = expectedCountRate({ alpha: true, beta: false, gamma: false }, 'none');
  const beta = expectedCountRate({ alpha: false, beta: true, gamma: false }, 'none');
  const combined = expectedCountRate({ alpha: true, beta: true, gamma: false }, 'none');
  assert.equal(combined, alpha + beta - PHYSICS_CONFIG.backgroundCountRate);
});

test('all seven non-empty radiation combinations produce valid rates', () => {
  const combinations = [
    [true, false, false], [false, true, false], [false, false, true],
    [true, true, false], [true, false, true], [false, true, true], [true, true, true]
  ];
  for (const [alpha, beta, gamma] of combinations) {
    assert.ok(expectedCountRate({ alpha, beta, gamma }, 'none') > PHYSICS_CONFIG.backgroundCountRate);
  }
});

test('changing shield changes expected count rate', () => {
  const selection = { alpha: true, beta: true, gamma: true };
  assert.ok(expectedCountRate(selection, 'none') > expectedCountRate(selection, 'lead'));
});

test('seeded random gives deterministic transmission and counts', () => {
  const first = createSeededRandom(2026);
  const second = createSeededRandom(2026);
  const outcomesA = Array.from({ length: 20 }, () => shouldTransmit('lead', 'gamma', first));
  const outcomesB = Array.from({ length: 20 }, () => shouldTransmit('lead', 'gamma', second));
  assert.deepEqual(outcomesA, outcomesB);
  assert.equal(poissonSample(14, first), poissonSample(14, second));
});
