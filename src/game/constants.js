// World scale: metres. Runner is 1.8 m tall.
export const LANE_W = 2.2;
export const LANES = [-1, 0, 1];
export const TILE_L = 12;          // one ground tile / coach length
export const TRAIN_W = 2.0;
export const TRAIN_H = 2.6;
export const RAMP_L = 6.0;

export const PLAYER = {
  width: 0.9,
  height: 1.95,
  rollHeight: 1.35,
  depth: 1.6,
  laneChangeTime: 0.16,
  jumpVel: 11.2,
  superJumpVel: 15.5,
  gravity: 30,
  fastFallGravity: 90,
  rollTime: 0.62,
  stumbleTime: 0.5,
};

export const SPEED = {
  start: 15,
  max: 36,
  perMetre: 0.0055,      // how fast we accelerate with distance
  headstart: 70,
  hoverMultiplier: 1.0,
};

export const SCORE_PER_METRE = 10;

export const POWERUP_BASE_DURATION = { jetpack: 10, sneakers: 10, magnet: 10, multiplier: 10 };
export const POWERUP_UPGRADE_STEP = 5;   // seconds per upgrade level
export const POWERUP_UPGRADE_COST = [500, 1000, 3000, 10000, 60000];

export const HOVERBOARD_TIME = 30;      // 'Turbo' in the UI
export const BUBBLES_PER_TURBO = 3;   // message bubbles needed to earn a Turbo
export const HOVERBOARD_COST = 300;
export const HEADSTART_COST = 2000;
export const SCORE_BOOSTER_COST = 3000;
export const MYSTERY_BOX_COST = 500;
export const REVIVE_KEYS = [1, 2, 4, 8, 16];

export const CHASER = {
  farDist: 11,       // past the 9.2 m camera: rangers leave frame during clean running (like Subway Surfers) and close in on a stumble
  nearDist: 3.0,
  startDist: 4.2,
  nearTime: 5.0,
};

export const ZONE_LENGTH = 3000;   // one 'lap' Faisal Avenue -> D-Chowk
export const ZONES = [
  { id: 'avenue', name: 'FAISAL AVENUE', from: 0, to: 700 },
  { id: 'chokepoint', name: 'SRINAGAR CHOKEPOINT', from: 700, to: 1600 },
  { id: 'redzone', name: 'RED ZONE', from: 1600, to: 2600 },
  { id: 'dchowk', name: 'D-CHOWK — FINAL SPRINT', from: 2600, to: 3000 },
];

export const COLORS = {
  sky: 0x74c0ff,
  skyBottom: 0xdff1ff,
  fog: 0xc9e6ff,
};
