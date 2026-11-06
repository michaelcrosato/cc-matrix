// Effects as data: what each fx key looks like. Particle presets, rings, bolts and lights.
export const ELEMENT_COLORS = { sound: ['sand', 'white'], flame: ['orange', 'red', 'sand'], grave: ['lime', 'plum', 'teal'], '': ['white', 'mist'] };
export const ELEMENT_LIGHT = { sound: 0xffe0a0, flame: 0xff8030, grave: 0x90f060, '': 0xffffff };

export function registerParticles(p) {
  p.register('hit_spark', { count: [3, 6], life: [0.12, 0.3], speed: [2, 5], gravity: 6, spread: 180, size: [1, 1], colors: ['white', 'sand'], max: 512 });
  p.register('ember', { count: [6, 10], life: [0.4, 0.9], speed: [1, 3.5], gravity: -2, spread: 160, size: [1, 1], colors: ['sand', 'orange', 'red'], max: 512 });
  p.register('ember_drift', { count: [1, 2], life: [1, 2.2], speed: [0.2, 0.7], gravity: -1.2, spread: 60, size: [1, 1], colors: ['orange', 'red', 'plum'], max: 256 });
  p.register('crackle', { count: [1, 3], life: [0.1, 0.4], speed: [1, 3], spread: 180, size: [1, 1], colors: ['cyan', 'white'], max: 128 });
  p.register('shock', { count: [6, 12], life: [0.2, 0.5], speed: [3, 7], flatten: 0.15, spread: 180, drag: 3, size: [1, 1], colors: ['white', 'sand', 'orange'], max: 512 });
  p.register('grave_smoke', { count: [6, 10], life: [0.5, 1.2], speed: [0.4, 1.4], gravity: -1, spread: 120, drag: 1, size: [2, 1], colors: ['lime', 'plum', 'night'], radius: 0.3, max: 512 });
  p.register('coin_spray', { count: [8, 14], life: [0.5, 0.9], speed: [2, 5], gravity: 10, spread: 60, size: [1, 1], colors: ['sand', 'orange'], max: 512 });
  p.register('bone_chips', { count: [8, 14], life: [0.4, 0.8], speed: [2, 6], gravity: 12, spread: 80, size: [1, 1], colors: ['white', 'mist', 'slate'], max: 512 });
  p.register('wax', { count: [5, 8], life: [0.3, 0.6], speed: [0.8, 2], gravity: 5, spread: 60, size: [1, 1], colors: ['white', 'sand'], max: 256 });
  p.register('peat', { count: [8, 14], life: [0.4, 0.8], speed: [1.5, 4.5], gravity: 11, spread: 80, size: [1, 1], colors: ['slate', 'night', 'teal'], max: 512 });
  p.register('dust_ring', { count: [10, 16], life: [0.3, 0.7], speed: [2, 5], flatten: 0.1, drag: 4, spread: 180, size: [2, 1], colors: ['mist', 'slate', 'night'], radius: 0.2, max: 512 });
  p.register('splash', { count: [4, 8], life: [0.25, 0.5], speed: [1, 2.6], gravity: 8, spread: 40, size: [1, 1], colors: ['sky', 'mist'], max: 256 });
  p.register('loot_glint', { count: [1, 2], life: [0.4, 0.9], speed: [0.3, 0.9], gravity: -0.6, spread: 30, size: [1, 1], colors: ['white', 'sand'], max: 256 });
  p.register('level_up', { count: [30, 40], life: [0.6, 1.3], speed: [1.5, 5], gravity: -2, spread: 180, size: [2, 1], colors: ['white', 'sand', 'orange'], max: 256 });
  p.register('poison', { count: [6, 10], life: [0.4, 1], speed: [0.4, 1.6], gravity: -1.4, spread: 50, size: [1, 1], colors: ['lime', 'green', 'teal'], max: 256 });
  p.register('shrine_glow', { count: [14, 20], life: [0.6, 1.2], speed: [0.8, 2.4], gravity: -2, spread: 60, size: [1, 1], colors: ['sand', 'white', 'lime'], max: 256 });
}

// r: ring colors, k: particle preset, l: light [color, intensity, radius, life]
export const FX = {
  swing: { sector: 'sand' },
  sweep: { ring: ['sand'], k: 'shock', dur: 0.22 },
  ring_bronze: { ring: ['orange', 'sand'], k: 'shock', l: [0xffc070, 8, 9, 0.25], dur: 0.45 },
  wave: { sector: 'sand', dur: 0.3, k: 'shock', wide: true },
  flare: { sector: 'white', dur: 0.2, k: 'ember', l: [0xfff0c0, 12, 10, 0.2], wide: true },
  fire_burst: { ring: ['orange', 'red'], k: 'ember', l: [0xff7020, 10, 8, 0.3], dur: 0.3, disc: 'red' },
  bone_burst: { ring: ['mist'], k: 'bone_chips', dur: 0.18 },
  grave_burst: { ring: ['lime', 'plum'], k: 'grave_smoke', l: [0x90f060, 8, 7, 0.3], dur: 0.35, disc: 'plum' },
  poison_burst: { ring: ['lime', 'teal'], k: 'poison', l: [0x90f060, 6, 6, 0.3], dur: 0.32 },
  dust_ring: { ring: ['mist'], k: 'dust_ring', dur: 0.3 },
  shrine: { ring: ['sand', 'white'], k: 'shrine_glow', l: [0xffe0a0, 12, 9, 0.8], dur: 0.7 },
  chest: { ring: ['sand'], k: 'coin_spray', l: [0xffd070, 8, 6, 0.4], dur: 0.3 },
  puff: { k: 'dust_ring' },
  raise: { ring: ['lime'], k: 'grave_smoke', dur: 0.3 },
  res_pop: { ring: ['orange'], k: 'hit_spark', dur: 0.2, small: 1 },
  snuff: { ring: ['night', 'orange'], k: 'ember', dur: 0.4 },
  snuff_one: { k: 'ember', l: [0xff8030, 4, 4, 0.2] },
  plant: { ring: ['orange'], k: 'dust_ring', dur: 0.2 },
  dash: { k: 'dust_ring' },
  note: { ring: ['sky'], dur: 0.2, small: 1 },
  coin_trail: { k: 'coin_spray', few: 3 },
  portal: { ring: ['cyan', 'white'], k: 'crackle', l: [0x60e0f0, 10, 8, 0.6], dur: 0.5 },
  ledger_slam: { ring: ['red', 'sand'], k: 'dust_ring', dur: 0.3 },
  spikes: { ring: ['slate'], k: 'bone_chips', dur: 0.15 },
  floor_crumble: { ring: ['slate', 'night'], k: 'dust_ring', dur: 0.3 },
  bone_rise: { ring: ['mist'], k: 'bone_chips', dur: 0.25 },
};

export const GIB = { peat: 'peat', bone_chips: 'bone_chips', grave_smoke: 'grave_smoke', ember: 'ember', coin_spray: 'coin_spray' };
export const MAT_SOUND = { flesh: 'hit_flesh', bone: 'hit_bone', stone: 'hit_stone', metal: 'hit_metal', wood: 'hit_wood' };
