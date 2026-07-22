import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSeededRandom,
  expectedCountRate,
  getTransmission,
  isShieldInBeam,
  poissonSample,
  shouldTransmit
} from '../js/physics-model.js';
import { PHYSICS_CONFIG } from '../js/config.js';

const paperHalfExtents = { x: 0.0125, y: 0.21, z: 0.24 };

test('shield is effective at arbitrary positions across the beam', () => {
  for (const x of [-1.2, -0.45, 0, 0.8, 1.4]) {
    assert.equal(isShieldInBeam({ x, y: 1.42, z: -2.35 }, paperHalfExtents), true);
  }
});

test('shield is not effective while parked on the material rack or outside the beam length', () => {
  assert.equal(isShieldInBeam({ x: -0.56, y: 0.82, z: -1.76 }, paperHalfExtents), false);
  assert.equal(isShieldInBeam({ x: 2.1, y: 1.42, z: -2.35 }, paperHalfExtents), false);
});

test('shield must span the visible beam lanes rather than hit a hidden drop zone', () => {
  assert.equal(isShieldInBeam({ x: 0.73, y: 1.42, z: -2.35 }, paperHalfExtents), true);
  assert.equal(isShieldInBeam({ x: 0.73, y: 1.0, z: -2.35 }, paperHalfExtents), false);
  assert.equal(isShieldInBeam({ x: 0.73, y: 1.42, z: -1.7 }, paperHalfExtents), false);
});

test('paper blocks alpha', () => {
  assert.equal(getTransmission('paper', 'alpha'), 0);
  assert.equal(shouldTransmit('paper', 'alpha', () => 0), false);
});

test('paper mostly transmits beta', () => assert.ok(getTransmission('paper', 'beta') >= 0.9));
test('aluminium strongly reduces beta', () => assert.ok(getTransmission('aluminium', 'beta') <= 0.1));

test('lead completely blocks gamma in the exam-syllabus model', () => {
  const factor = getTransmission('lead', 'gamma');
  assert.equal(factor, 0);
  assert.equal(shouldTransmit('lead', 'gamma', () => 0), false);
});

test('lead-blocked gamma produces a zero GM reading', () => {
  const rate = expectedCountRate({ alpha: false, beta: false, gamma: true }, 'lead');
  assert.equal(rate, 0);
  assert.equal(poissonSample(rate, createSeededRandom(42)), 0);
});

test('lead produces zero reading for every selected source combination', () => {
  const selections = [
    { alpha: true, beta: false, gamma: false },
    { alpha: false, beta: true, gamma: false },
    { alpha: false, beta: false, gamma: true },
    { alpha: true, beta: true, gamma: true }
  ];
  for (const selection of selections) assert.equal(expectedCountRate(selection, 'lead'), 0);
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
