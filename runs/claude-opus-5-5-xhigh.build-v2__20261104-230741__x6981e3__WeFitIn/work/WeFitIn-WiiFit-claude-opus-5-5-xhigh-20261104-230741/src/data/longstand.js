// The Long Stand, as a timeline. A new event is a new row.
export const STAND_LENGTH = 90;
export const STAND_TIMELINE = [
  { t: 0, say: ['coach', 'Stand.'], ring: 0.4 },
  { t: 10, kevinOn: true, biasX: 0.1, say: ['ounce', 'Kevin is on your head. He is staff. Carry on.'] },
  { t: 20, sneeze: true, impulse: [0, -0.6], say: ['dennis', 'Sorry. Sorry. It\'s just the one nose.'] },
  { t: 30, ring: 0.34 },
  { t: 35, rain: true, noise: 1.2 },
  { t: 45, clap: true, say: ['ounce', 'Ignore her.'] },
  { t: 50, ring: 0.28 },
  { t: 55, juneText: 'Are you nearly done?', say: ['june', 'Are you nearly done?'] },
  { t: 65, rumble: true, randomImpulse: 0.6 },
  { t: 75, rain: false, noise: 1, sun: true, ring: 0.24, swell: true },
  { t: 85, kevinOn: false, biasX: 0, impulse: [0.3, 0.2], say: ['ounce', 'Kevin has left. He said nothing. He never does.'] },
  { t: 90, say: ['coach', 'You may blink.'] },
];
