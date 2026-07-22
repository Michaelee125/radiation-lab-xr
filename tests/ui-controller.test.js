import test from 'node:test';
import assert from 'node:assert/strict';
import { analogueMeterAngle } from '../js/ui-controller.js';

test('analogue meter angle follows the live radiation count rate', () => {
  assert.equal(analogueMeterAngle(0), 70);
  assert.equal(analogueMeterAngle(25), 35);
  assert.equal(analogueMeterAngle(50), 0);
  assert.equal(analogueMeterAngle(75), -35);
  assert.equal(analogueMeterAngle(100), -70);
});

test('analogue meter clamps negative and above-scale readings', () => {
  assert.equal(analogueMeterAngle(-20), 70);
  assert.equal(analogueMeterAngle(140), -70);
});
