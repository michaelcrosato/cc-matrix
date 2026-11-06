// Particle presets, sizes in whole art pixels, palette colours.
export function registerParticles(p) {
  p.register('tyreSmoke', { count: [1, 2], life: [0.5, 1.1], speed: [0.4, 1.4], gravity: -0.8, drag: 1, size: [2, 4], colors: ['white', 'mist', 'mist', 'slate'], radius: 0.25, max: 300 });
  p.register('dust', { count: [1, 3], life: [0.8, 2.4], speed: [0.6, 2.2], gravity: -0.4, drag: 0.8, size: [2, 5], colors: ['sand', 'orange', 'orange', 'plum'], radius: 0.4, flatten: 0.5, max: 500 });
  p.register('gravelSpray', { count: [1, 2], life: [0.3, 0.6], speed: [2, 5], gravity: 9, spread: 40, size: [1, 1], colors: ['sand', 'orange', 'slate'], max: 200 });
  p.register('sparks', { count: [5, 10], life: [0.2, 0.5], speed: [3, 9], gravity: 12, size: [1, 1], colors: ['white', 'sand', 'orange'], max: 200 });
  p.register('rainSpray', { count: [1, 2], life: [0.25, 0.6], speed: [0.6, 2], gravity: 1, size: [1, 3], colors: ['white', 'mist', 'slate'], radius: 0.3, max: 300 });
  p.register('exhaustPop', { count: [2, 4], life: [0.08, 0.2], speed: [1, 3], size: [1, 2], colors: ['white', 'sand', 'orange'], max: 60 });
  p.register('foam', { count: [2, 4], life: [0.6, 1.4], speed: [0.2, 1], gravity: 1.5, drag: 1, size: [2, 3], colors: ['white', 'white', 'cyan'], radius: 0.4, max: 300 });
  p.register('confetti', { count: [8, 14], life: [1.2, 2.6], speed: [3, 7], gravity: 3, drag: 0.6, size: [1, 2], colors: ['red', 'sand', 'lime', 'sky', 'white', 'orange'], radius: 1, max: 500 });
  p.register('firework', { count: [40, 60], life: [0.7, 1.5], speed: [8, 18], gravity: 6, drag: 1.2, size: [2, 1], colors: ['white', 'sand', 'orange', 'red'], max: 500 });
  p.register('firework2', { count: [40, 60], life: [0.7, 1.5], speed: [8, 18], gravity: 6, drag: 1.2, size: [2, 1], colors: ['white', 'cyan', 'sky', 'lime'], max: 500 });
  p.register('mist', { count: [1, 2], life: [2, 4], speed: [0.2, 0.6], gravity: -0.05, size: [4, 7], colors: ['mist', 'white', 'mist'], radius: 18, max: 120 });
  p.register('waterfall', { count: [3, 5], life: [0.8, 1.2], speed: [1, 3], gravity: 14, direction: [0, -1, 0], spread: 15, size: [2, 2], colors: ['white', 'cyan', 'mist'], radius: 2.5, max: 300 });
  p.register('landDust', { count: [10, 18], life: [0.5, 1.4], speed: [1, 4], gravity: -0.2, flatten: 0.3, drag: 1, size: [3, 5], colors: ['sand', 'orange', 'plum'], radius: 0.8, max: 200 });
  p.register('devil', { count: [1, 2], life: [1, 2], speed: [1, 2.5], direction: [0, 1, 0], spread: 25, size: [3, 4], colors: ['white', 'sand', 'mist'], radius: 1.5, max: 100 });
}
