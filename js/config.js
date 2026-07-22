/**
 * Single source of truth for the simplified classroom physics and visual tuning.
 * Transmission values are teaching approximations, not universal material constants.
 */
export const PHYSICS_CONFIG = Object.freeze({
  transmission: Object.freeze({
    none: Object.freeze({ alpha: 1.0, beta: 1.0, gamma: 1.0 }),
    paper: Object.freeze({ alpha: 0.0, beta: 0.95, gamma: 0.98 }),
    aluminium: Object.freeze({ alpha: 0.0, beta: 0.05, gamma: 0.9 }),
    // Exam-syllabus simplification: the lead plate fully blocks every source type.
    lead: Object.freeze({ alpha: 0.0, beta: 0.0, gamma: 0.0 })
  }),
  baseCountRates: Object.freeze({ alpha: 18, beta: 28, gamma: 34 }),
  backgroundCountRate: 1.4,
  // Lead is also treated as suppressing the background so the classroom GM display is exactly zero.
  backgroundTransmission: Object.freeze({ none: 1.0, paper: 1.0, aluminium: 1.0, lead: 0.0 }),
  rollingAverageSeconds: 8,
  maximumAudibleClicksPerSecond: 18,
  analogueMeterMaxCps: 100
});

export const RADIATION_CONFIG = Object.freeze({
  alpha: Object.freeze({
    label: 'Alpha',
    description: 'Alpha particle: helium nucleus, 2 protons + 2 neutrons',
    color: '#ffb347',
    trailColor: '#ff9f43',
    laneY: 1.28,
    speed: 0.62,
    emissionIntervalMs: 1050,
    poolSize: 7
  }),
  beta: Object.freeze({
    label: 'Beta',
    description: 'Beta-minus particle: high-speed electron',
    color: '#49d7ff',
    trailColor: '#00c2ff',
    laneY: 1.42,
    speed: 0.98,
    emissionIntervalMs: 760,
    poolSize: 9
  }),
  gamma: Object.freeze({
    label: 'Gamma',
    description: 'Gamma radiation: high-energy electromagnetic radiation',
    color: '#d998ff',
    trailColor: '#c56cff',
    laneY: 1.56,
    speed: 1.32,
    emissionIntervalMs: 590,
    poolSize: 11
  })
});

export const SCENE_CONFIG = Object.freeze({
  sourceX: -1.78,
  detectorX: 1.72,
  apparatusZ: -2.35,
  particleEndX: 1.58,
  absorbPauseMs: 130,
  rackPositions: Object.freeze({
    paper: Object.freeze({ x: -0.56, y: 0.82, z: -1.76 }),
    aluminium: Object.freeze({ x: 0, y: 0.82, z: -1.76 }),
    lead: Object.freeze({ x: 0.56, y: 0.82, z: -1.76 })
  }),
  holderPosition: Object.freeze({ x: 0, y: 1.42, z: -2.35 }),
  // A shield becomes live wherever it spans the complete three-lane beam ribbon
  // between the source and detector. This tolerance keeps placement forgiving in VR.
  beamInteractionRadius: 0.045,
  shieldSnapDistance: 0.6,
  grabDistance: 1.45
});

export const DEFAULT_STATE = Object.freeze({
  selectedRadiation: Object.freeze({ alpha: true, beta: false, gamma: false }),
  activeShield: 'none',
  showPaths: true,
  controlsVisible: true,
  soundEnabled: true,
  instantaneousCounts: 0,
  countRate: 0,
  rollingAverage: 0,
  offlineReady: false
});

export const RADIATION_TYPES = Object.freeze(['alpha', 'beta', 'gamma']);
export const SHIELD_TYPES = Object.freeze(['none', 'paper', 'aluminium', 'lead']);
