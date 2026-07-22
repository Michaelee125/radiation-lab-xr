import test from 'node:test';
import assert from 'node:assert/strict';
import { GMCounter } from '../js/gm-counter.js';
import { AppState } from '../js/state.js';

test('activating lead clears the GM rolling history immediately', () => {
  const state = new AppState();
  const counter = new GMCounter(state);
  counter.history.push(18, 21, 17);

  state.setShield('lead');

  assert.deepEqual(counter.history, []);
  counter.unsubscribe();
});
