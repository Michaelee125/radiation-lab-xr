import {
  PHYSICS_CONFIG,
  RADIATION_CONFIG,
  RADIATION_TYPES,
  SCENE_CONFIG
} from './config.js';

/**
 * A material is effective anywhere it physically spans the schematic beam between
 * the source and GM tube. Requiring the plate to cover all three lane centres keeps
 * the single active-shield reading consistent for every selected radiation type.
 */
export function isShieldInBeam(
  position,
  halfExtents,
  sceneConfig = SCENE_CONFIG,
  radiationConfig = RADIATION_CONFIG
) {
  if (![position?.x, position?.y, position?.z, halfExtents?.x, halfExtents?.y, halfExtents?.z]
    .every(Number.isFinite)) return false;

  const beamStartX = Math.min(sceneConfig.sourceX, sceneConfig.particleEndX);
  const beamEndX = Math.max(sceneConfig.sourceX, sceneConfig.particleEndX);
  const laneYs = RADIATION_TYPES.map((type) => radiationConfig[type].laneY);
  const lowestLaneY = Math.min(...laneYs);
  const highestLaneY = Math.max(...laneYs);
  const radius = sceneConfig.beamInteractionRadius;

  const overlapsBeamLength = position.x + halfExtents.x >= beamStartX
    && position.x - halfExtents.x <= beamEndX;
  const spansLaneHeight = position.y - halfExtents.y <= lowestLaneY + radius
    && position.y + halfExtents.y >= highestLaneY - radius;
  const overlapsBeamDepth = Math.abs(position.z - sceneConfig.apparatusZ)
    <= halfExtents.z + radius;

  return overlapsBeamLength && spansLaneHeight && overlapsBeamDepth;
}

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
  const backgroundTransmission = config.backgroundTransmission?.[shield] ?? 1;
  return sourceRate + config.backgroundCountRate * backgroundTransmission;
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
