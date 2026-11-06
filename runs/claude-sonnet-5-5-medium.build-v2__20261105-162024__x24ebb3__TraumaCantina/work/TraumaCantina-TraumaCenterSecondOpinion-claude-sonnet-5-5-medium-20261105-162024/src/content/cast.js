// Cast: busts and figures are built from these descriptions (view/bust.js, view/figure.js).
export const CAST = {
  ilya: { name: 'DR. ILYA MARSH', skin: 0xe8b890, hair: 0x2a1c18, hairStyle: 'messy', cap: 0x5ab0e8, scrub: 0x2a9a98, extra: 'coffee', height: 1.0 },
  reyes: { name: 'NURSE ODALYS REYES', skin: 0xd8a478, hair: 0x101010, hairStyle: 'bun', cap: null, scrub: 0x1c2a5a, glasses: 0xd02828, brows: 'fierce', height: 0.88 },
  sabine: { name: 'DR. SABINE ACHTERBERG', skin: 0xf0d0b8, hair: 0xe8e8ee, hairStyle: 'bob', cap: null, scrub: 0x7a3a7a, scar: true, height: 1.02 },
  bram: { name: 'CHIEF CORNELIUS BRAM', skin: 0xe0b08c, hair: 0xe8e8e8, hairStyle: 'bald', cap: null, scrub: 0xf4f4f4, moustache: 0xe8e8e8, glasses: 0xc8c8d0, height: 1.0 },
  pem: { name: 'DR. PEMBERTON OKOYE', skin: 0xa0683c, hair: null, hairStyle: 'bald', cap: 0xf08a28, scrub: 0x2a9a98, fish: true, height: 1.0, round: true },
  hesper: { name: 'DR. HESPER LINDQVIST', skin: 0xf0d8c8, hair: 0xc8ccd4, hairStyle: 'swept', cap: null, scrub: 0xf8f8f8, pin: 0xf5b700, height: 0.98 },
  tomasz: { name: 'TOMASZ DOLAN', skin: 0xd8a070, hair: 0x4a3020, hairStyle: 'messy', cap: 0x2a4a6a, scrub: 0xa08a50, height: 1.05 },
  zamboni: { name: 'THE GREAT ZAMBONI', skin: 0xe8c0a0, hair: 0x101010, hairStyle: 'slick', cap: 0x181820, scrub: 0x6a1a8a, moustache: 0x101010, height: 1.0 },
  ollie: { name: 'OLLIE BRANDT', skin: 0xe8b890, hair: 0x8a5a2a, hairStyle: 'messy', cap: null, scrub: 0x6aa0c8, height: 0.9 },
  anselm: { name: 'MR. ANSELM', skin: 0xd8b090, hair: 0xc8c8c8, hairStyle: 'bald', cap: 0x2a2a4a, scrub: 0x8a9aa8, moustache: 0xc8c8c8, height: 1.0 },
  ottilie: { name: 'OTTILIE MARR', skin: 0xe0b098, hair: 0xa07050, hairStyle: 'bob', cap: null, scrub: 0xc86a8a, height: 0.95 },
  narrator: { name: '', skin: 0, hair: 0, hairStyle: 'none', height: 1 },
  system: { name: '', skin: 0, hair: 0, hairStyle: 'none', height: 1 },
};
export const EMOTIONS = {
  neutral: { brow: [0, 0], lid: 1, mouth: [1, 1], tilt: 0 }, stern: { brow: [-0.28, -0.05], lid: 0.8, mouth: [0.9, 0.5], tilt: 0 },
  shock: { brow: [0.28, 0.08], lid: 1.25, mouth: [0.7, 1.7], tilt: 0.05 }, sad: { brow: [0.25, 0.04], lid: 0.8, mouth: [0.8, 0.6], tilt: -0.1 },
  smile: { brow: [0.05, 0.02], lid: 0.85, mouth: [1.5, 0.6], tilt: 0.04 }, angry: { brow: [-0.42, -0.08], lid: 0.7, mouth: [1.1, 1.0], tilt: 0 },
  panic: { brow: [0.34, 0.1], lid: 1.3, mouth: [1.0, 1.5], tilt: 0.08 },
};
