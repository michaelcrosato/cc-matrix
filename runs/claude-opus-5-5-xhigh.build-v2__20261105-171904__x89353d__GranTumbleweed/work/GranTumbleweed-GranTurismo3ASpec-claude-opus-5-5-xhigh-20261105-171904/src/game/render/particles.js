// Particle presets, registered in code. Sizes are whole art pixels and colours are palette names.
export const PARTICLE_PRESETS = {
  tyreSmoke: { count: [1, 2], life: [0.5, 1.1], speed: [0.4, 1.2], spread: 60, gravity: -0.8, drag: 1.5, size: [2, 5], colors: ['white', 'mist', 'mist', 'slate'], radius: 0.2, max: 400 },
  dirtDust: { count: [1, 3], life: [0.8, 2.2], speed: [0.6, 2], spread: 70, gravity: -0.3, drag: 1.2, size: [3, 7], colors: ['sand', 'orange', 'orange', 'plum'], radius: 0.4, max: 600 },
  saltDust: { count: [1, 2], life: [0.5, 1.2], speed: [0.6, 1.6], spread: 70, gravity: -0.2, drag: 1.4, size: [2, 4], colors: ['white', 'white', 'mist'], radius: 0.3, max: 300 },
  gravel: { count: [2, 4], life: [0.25, 0.6], speed: [2, 5], spread: 40, gravity: 12, drag: 0.5, size: [1, 1], colors: ['slate', 'sand', 'orange'], radius: 0.2, max: 300 },
  sparks: { count: [4, 8], life: [0.2, 0.5], speed: [3, 9], spread: 60, gravity: 14, drag: 0.5, size: [1, 1], colors: ['white', 'sand', 'orange', 'red'], max: 300 },
  rainSpray: { count: [1, 2], life: [0.3, 0.7], speed: [0.8, 2], spread: 50, gravity: 3, drag: 1, size: [2, 3], colors: ['white', 'mist', 'mist'], radius: 0.4, max: 400 },
  exhaustPop: { count: [2, 4], life: [0.08, 0.18], speed: [1, 3], spread: 25, size: [2, 1], colors: ['sand', 'orange', 'red'], max: 120 },
  foam: { count: [2, 4], life: [0.6, 1.3], speed: [0.2, 0.8], spread: 180, gravity: 1, drag: 2, size: [2, 3], colors: ['white', 'white', 'mist', 'sky'], radius: 0.8, max: 400 },
  confetti: { count: [16, 24], life: [1.5, 3], speed: [2, 6], spread: 70, gravity: 3, drag: 1.2, size: [1, 1], colors: ['red', 'sand', 'sky', 'lime', 'white'], radius: 1.2, max: 500 },
  firework: { count: [30, 42], life: [0.6, 1.4], speed: [8, 18], spread: 180, gravity: 5, drag: 1.4, size: [2, 1], colors: ['white', 'sand', 'orange', 'red'], max: 500 },
  firework2: { count: [30, 42], life: [0.6, 1.4], speed: [8, 18], spread: 180, gravity: 5, drag: 1.4, size: [2, 1], colors: ['white', 'cyan', 'sky', 'blue'], max: 500 },
  firework3: { count: [30, 42], life: [0.6, 1.4], speed: [8, 18], spread: 180, gravity: 5, drag: 1.4, size: [2, 1], colors: ['white', 'lime', 'green', 'teal'], max: 500 },
  mist: { count: [1, 1], life: [2, 4], speed: [0.2, 0.6], spread: 80, drag: 0.2, gravity: -0.05, size: [5, 8], colors: ['white', 'mist'], radius: 3, max: 200 },
  waterfall: { count: [1, 3], life: [0.8, 1.4], speed: [1, 2], direction: [0, -1, 0], spread: 16, gravity: 8, size: [2, 3], colors: ['white', 'cyan', 'sky'], radius: 1, max: 300 },
  dustDevil: { count: [2, 3], life: [1, 2], speed: [1, 3], spread: 30, gravity: -2.5, drag: 0.3, size: [3, 5], colors: ['white', 'sand', 'mist'], radius: 1.2, max: 200 },
  welding: { count: [3, 6], life: [0.15, 0.4], speed: [1.5, 3.5], spread: 70, gravity: 7, size: [1, 1], colors: ['white', 'cyan', 'sand'], max: 100 },
};
export function registerParticles(ctx) { for (const [k, v] of Object.entries(PARTICLE_PRESETS)) ctx.particles.register(k, v); }
