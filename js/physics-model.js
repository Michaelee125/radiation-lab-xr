import { PHYSICS_CONFIG, RADIATION_TYPES } from './config.js';

export function getTransmission(shield, radiation, config = PHYSICS_CONFIG) {
  const value = config.transmission?.[shield]?.[radiation];
  if (!Number.isFinite(value)) throw new Error(`Unknown shield/radiation pair: ${shield}/${radiation}`);
  return value;
}

export function shouldTransmit(shield, radiation, random = Math.random, config = PHYSICS_CONFIG) {
  return random() < getTransmission(shield, radiation, config);
}

export function expectedCountRate(selectedRadiation, shield, config = PHYSICS_CONFIG) {
  const sourceRate = RADIATION_TYPES.reduce((total, type) => {
    if (!selectedRadiation[type]) return total;
    return total + config.baseCountRates[type] * getTransmission(shield, type, config);
  }, 0);
  return sourceRate + config.backgroundCountRate;
}

export function poissonSample(lambda, random = Math.random) {
  if (!Number.isFinite(lambda) || lambda <= 0) return 0;
  if (lambda < 30) {
    const limit = Math.exp(-lambda);
    let product = 1;
    let count = 0;
    do {
      count += 1;
      product *= Math.max(Number.EPSILON, random());
    } while (product > limit);
    return count - 1;
  }

  // Normal approximation is efficient and sufficiently Poisson-like at classroom-scale rates.
  const u1 = Math.max(Number.EPSILON, random());
  const u2 = Math.max(Number.EPSILON, random());
  const normal = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * normal));
}

export function createSeededRandom(seed = 1) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

export function describeOutcome(type, shield, config = PHYSICS_CONFIG) {
  const label = type[0].toUpperCase() + type.slice(1);
  const transmission = getTransmission(shield, type, config);
  if (shield === 'none') return `${label} reaches the detector without shielding.`;
  if (transmission === 0) return `${label} has been stopped by ${shield}.`;
  if (transmission <= 0.1) return `${label} has been strongly absorbed by ${shield}.`;
  if (transmission <= 0.35) return `${label} has been substantially attenuated by ${shield}.`;
  if (transmission < 0.95) return `${label} has been attenuated by ${shield}.`;
  return `${label} has mostly passed through ${shield}.`;
}
