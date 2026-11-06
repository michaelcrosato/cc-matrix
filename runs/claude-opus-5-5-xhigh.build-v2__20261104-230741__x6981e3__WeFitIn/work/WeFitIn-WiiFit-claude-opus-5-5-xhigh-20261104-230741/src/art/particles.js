// Custom particles, as data.
export const PARTICLE_DEFS = {
  zen: { count: [1, 1], life: [2, 3.4], speed: [0.05, 0.16], direction: [0.2, 1, 0], spread: 70, gravity: -0.02, size: [1, 1], colors: ['sand', 'white', 'sand'] },
  sweat: { count: [2, 4], life: [0.3, 0.6], speed: [1, 2.2], direction: [0, 1, 0], spread: 70, gravity: 7, size: [1, 1], colors: ['cyan', 'sky'] },
  confetti: { count: [18, 28], life: [0.7, 1.4], speed: [2, 5], direction: [0, 1, 0], spread: 60, gravity: 6, drag: 1.5, size: [1, 1], colors: ['red', 'sand', 'cyan', 'lime', 'orange', 'white'], max: 512 },
  splash: { count: [30, 44], life: [0.5, 1.1], speed: [3, 8], direction: [0, 1, 0], spread: 50, gravity: 12, size: [2, 1], colors: ['white', 'cyan', 'sky'], radius: 0.4, max: 512 },
  splashBig: { count: [70, 90], life: [0.7, 1.5], speed: [4, 12], direction: [0, 1, 0], spread: 42, gravity: 12, size: [2, 1], colors: ['white', 'white', 'cyan', 'sky'], radius: 0.7, max: 512 },
  bonk: { count: [6, 10], life: [0.2, 0.45], speed: [1.5, 3.5], spread: 180, gravity: 4, size: [1, 1], colors: ['sand', 'orange', 'white'] },
  hoopSpark: { count: [1, 2], life: [0.2, 0.5], speed: [0.6, 1.6], direction: [0, 1, 0], spread: 90, gravity: 1.5, size: [1, 1], colors: ['sand', 'white', 'cyan'] },
  dripDrop: { count: [3, 5], life: [0.4, 0.7], speed: [0.6, 1.4], direction: [0, 1, 0], spread: 60, gravity: 5, size: [1, 1], colors: ['sky', 'cyan'] },
  puff: { count: [6, 9], life: [0.3, 0.6], speed: [0.8, 1.8], spread: 180, flatten: 0.3, gravity: -0.3, drag: 2, size: [2, 1], colors: ['white', 'mist'] },
};
export function registerParticles(particles) {
  for (const [name, def] of Object.entries(PARTICLE_DEFS)) particles.register(name, def);
}
