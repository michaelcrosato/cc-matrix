/* Killer Bee Night — original, data-authored moon garden campaign. */
(function (root) {
  'use strict';
  const entrances = [
    { x: 16, y: 48, dir: 0 }, { x: 368, y: 192, dir: 2 },
    { x: 288, y: 16, dir: 1 }, { x: 96, y: 224, dir: 3 }
  ];
  const palette = [
    { floor: '#142a2a', soil: '#1b3530', edge: '#456254', accent: '#f2d48a', flower: '#dfa5ae', name: 'Moonflower beds' },
    { floor: '#172833', soil: '#203b42', edge: '#466b70', accent: '#a8dfd0', flower: '#b6a3e5', name: 'Glasshouse court' },
    { floor: '#252631', soil: '#373139', edge: '#6d635d', accent: '#f4c98d', flower: '#e5a0bd', name: 'The bell garden' }
  ];
  function schedule(count, interval, offset = 0, boss = false) {
    const a = [];
    for (let i = 0; i < count; i++) a.push({ at: offset + Math.floor(i / 2) * interval, type: i % 2 ? 'right' : 'left', entrance: i % 4 });
    if (boss) a.unshift({ at: 0, type: 'bell', x: 192, y: 64, dir: 0 });
    return a;
  }
  const stages = [
    { id: 'first-light', title: 'First Light', subtitle: 'The moonflowers need a little muscle.', lesson: 'Fly over a gardener and stay close to sting. SPACE fires your horizontal ray. A finish recharges it.', environment: 0,
      obstacles: [{ x: 80, y: 96, w: 32, h: 32 }, { x: 272, y: 112, w: 32, h: 32 }], targets: schedule(8, 23), rivals: { first: 7, interval: 20, cap: 2, guardAt: 9, huntAt: 20, speed: 48 } },
    { id: 'forked-path', title: 'The Forked Path', subtitle: 'Left foot. Right foot. Wrong garden.', lesson: 'Pink gardeners turn left. Teal gardeners turn right. Fallen shells change the chase.', environment: 0,
      obstacles: [{ x: 88, y: 56, w: 32, h: 112 }, { x: 264, y: 72, w: 32, h: 112 }], targets: schedule(10, 20), rivals: { first: 5, interval: 17, cap: 3, guardAt: 8, huntAt: 18, speed: 51 } },
    { id: 'guarded-bloom', title: 'Guarded Bloom', subtitle: 'A glasshouse full of bad company.', lesson: 'Scouts wander. Guards screen gardeners. Hunters chase you. Line up a ray before you commit.', environment: 1,
      obstacles: [{ x: 72, y: 64, w: 80, h: 24 }, { x: 232, y: 152, w: 80, h: 24 }, { x: 184, y: 96, w: 16, h: 48 }], targets: schedule(10, 22), rivals: { first: 3, interval: 15, cap: 3, guardAt: 5, huntAt: 12, speed: 53 } },
    { id: 'needlework', title: 'Needlework', subtitle: 'Small wings. Very big nerve.', lesson: 'Hold SHIFT / R2 to Focus. Squeeze through gaps and finish a sting faster. Release to escape.', environment: 1,
      obstacles: [{ x: 96, y: 32, w: 24, h: 64 }, { x: 96, y: 120, w: 24, h: 88 }, { x: 264, y: 32, w: 24, h: 88 }, { x: 264, y: 144, w: 24, h: 64 }], targets: schedule(10, 23), rivals: { first: 3, interval: 14, cap: 3, guardAt: 5, huntAt: 12, speed: 55 } },
    { id: 'evening-rush', title: 'Evening Rush', subtitle: 'Everybody wants the last flower.', lesson: 'Save a charge for the crowd. Finish a gardener to earn your next flash.', environment: 2,
      obstacles: [{ x: 168, y: 88, w: 48, h: 64 }, { x: 64, y: 72, w: 32, h: 24 }, { x: 288, y: 144, w: 32, h: 24 }], targets: schedule(12, 19), rivals: { first: 2, interval: 12, cap: 4, guardAt: 5, huntAt: 11, speed: 57 } },
    { id: 'last-bell', title: 'The Last Bell', subtitle: 'Ring out the gardeners. Bring home the bees.', lesson: 'The Bellkeeper travels, opens its core, then winds up a harmless shove. Sting the open core!', environment: 2,
      obstacles: [{ x: 88, y: 80, w: 32, h: 80 }, { x: 264, y: 80, w: 32, h: 80 }], targets: schedule(10, 24, 0, true), rivals: { first: 3, interval: 12, cap: 4, guardAt: 4, huntAt: 10, speed: 59 } }
  ].map((s) => ({ ...s, bounds: { x: 0, y: 0, w: 384, h: 240 }, finish: { type: 'all-targets' }, entrances: entrances.map((e) => ({ ...e })), palette: { ...palette[s.environment] } }));
  root.NightContent = { stages, palettes: palette, width: 384, height: 240, tile: 16 };
})(globalThis);
