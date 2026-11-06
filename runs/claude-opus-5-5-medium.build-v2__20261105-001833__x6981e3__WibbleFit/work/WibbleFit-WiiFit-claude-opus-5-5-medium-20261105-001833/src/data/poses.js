// Holding Still poses. Plain data: a new pose needs no code.
export const POSES = {
  tree: { clip: 'Tree', ring: 0.40, hold: 25, breath: 0 },
  heron: { clip: 'Heron', ring: 0.36, hold: 25, breath: 0, wander: 0.12 },
  warrior: { clip: 'Warrior', ring: 0.32, hold: 30, breath: 8, yNoise: 1.3 },
  chair: { clip: 'Chair', ring: 0.30, hold: 30, breath: 8, noiseRamp: [1, 1.5] },
  fold: { clip: 'Fold', ring: 0.28, hold: 30, breath: 6, wander: 0.18 },
  plank: { clip: 'Plank', ring: 0.24, hold: 35, breath: 6, instScale: 1.2, tremorAfter: 20 },
};
export const LONG_STAND = [
  { t: 0, say: ['coach', 'Stand.'], ring: 0.40 },
  { t: 10, say: ['ounce', 'Kevin has landed on you. He is staff.'], kevin: true, bias: 0.10 },
  { t: 20, say: ['dennis', 'Ah... ah... ACHOO.'], sneeze: true, impulse: [0, -0.6] },
  { t: 30, ring: 0.34 },
  { t: 35, say: ['ounce', 'It is raining. This is not part of it. It may be part of it.'], rain: true, noise: 1.2 },
  { t: 45, say: ['ounce', 'Ignore her.'], clap: true },
  { t: 50, ring: 0.28 },
  { t: 55, say: ['june', 'Are you nearly done?'], drift: true },
  { t: 65, say: ['ounce', 'The volcano. Mostly dormant. Mostly.'], rumble: true, randomImpulse: 0.7 },
  { t: 75, say: ['ounce', '...'], rain: false, noise: 1, ring: 0.24, swell: true },
  { t: 85, say: ['ounce', 'Kevin is leaving. Thank you, Kevin.'], kevin: false, bias: 0, randomImpulse: 0.3 },
  { t: 90, say: ['coach', 'You may blink.'], end: true },
];
