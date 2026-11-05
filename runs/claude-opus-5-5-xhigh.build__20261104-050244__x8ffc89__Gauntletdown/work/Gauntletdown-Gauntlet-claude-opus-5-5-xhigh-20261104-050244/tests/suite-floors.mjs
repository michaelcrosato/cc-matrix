// Every floor: rectangular, bordered, in the legend, 1-4 starts, stairs, pads in pairs, fields wall to wall, specials and
// amulets listed, no generator near a start, size limits, SOLVABLE with its own keys, no dead content (PLAN 8.3), and
// the counts its brief asks for.
import { boot, suite } from './lib.mjs';
const BRIEF = {   // [monster counts, generator counts, item minimums]
  f1: [{ ghost: 7 }, { urn: 2 }, { roast: 3, loaf: 2, gold: 4, gem: 2, chest: 1, key: 1 }],
  f2: [{ gnasher: 14, ghost: 6 }, { den: 4, urn: 2 }, { flask: 3, cider: 3, roast: 2, loaf: 2, key: 3, chest: 2 }],
  f3: [{ lobber: 8, gnasher: 12, ghost: 8 }, { hutch: 3, den: 2, urn: 2 }, { special: 1, flask: 2, cider: 1, roast: 3, key: 2, lockedchest: 1 }],
  t1: [{}, {}, { gold: 30, gem: 8, crown: 1, roast: 2 }],
  f4: [{ fryar: 8, gnasher: 10, ghost: 10 }, { shrine: 2, den: 2, urn: 3 }, { amulet: 2, stew: 2, roast: 3, flask: 2, key: 3, lockedchest: 1 }],
  f5: [{ tithe: 1, fryar: 6, lobber: 8, ghost: 8 }, { shrine: 2, hutch: 2, urn: 2 }, { special: 2, flask: 4, roast: 3, cider: 2, key: 3 }],
  f6: [{ gnasher: 8, lobber: 6, fryar: 6, ghost: 8, snatcher: 4 }, { sacks: 2, urn: 1, den: 1, hutch: 1, shrine: 1 }, { special: 1, amulet: 1, crown: 3, flask: 3, roast: 3, key: 4 }],
  t2: [{}, {}, { gold: 24, gem: 10, crown: 1, lockedchest: 1, key: 1 }],
  f7: [{ imp: 12, gnasher: 10, lobber: 6 }, { grate: 4, den: 2, hutch: 2 }, { special: 1, amulet: 1, flask: 4, roast: 3, cider: 2, key: 3 }],
  f8: [{ tithe: 1 }, {}, { special: 1, amulet: 1, flask: 6, roast: 5, cider: 3, key: 5 }],
  f9: [{}, { tureen: 2 }, { platter: 3, roast: 4, flask: 2 }]
};
export default function () {
  const S = suite('floors'), t = boot(), { api } = t;
  S.check('the floor order has nine floors, two treasure rooms and the banquet', api.FLOOR_ORDER.length === 11 && api.FLOOR_ORDER.every(id => api.get('floors', id)));
  for (const id of api.FLOOR_ORDER) {
    const F = api.get('floors', id), v = api.validateFloor(F), p = v.parsed;
    S.check(id + ' validates (solvable, no dead content)', v.ok, v.errors);
    const count = l => { const o = {}; for (const q of l) o[q.type] = (o[q.type] || 0) + 1; return o; };
    const [mon, gen, items] = BRIEF[id], mc = count(p.monsters), gc = count(p.gens), ic = count(p.items);
    for (const k in mon) S.check(id + ' has ' + mon[k] + ' ' + k, (mc[k] || 0) >= mon[k], mc);
    for (const k in gen) S.check(id + ' has ' + gen[k] + ' ' + k, (gc[k] || 0) >= gen[k], gc);
    for (const k in items) S.check(id + ' has at least ' + items[k] + ' ' + k, (ic[k] || 0) >= items[k], ic);
    if (id === 'f8') { S.check('f8: 40 placed monsters of every type at rank 3', p.monsters.length >= 40 && p.monsters.filter(m => m.type !== 'snatcher' && m.type !== 'tithe').every(m => m.rank === 3) && new Set(p.monsters.map(m => m.type)).size >= 7, p.monsters.length); S.check('f8: ten generators', p.gens.length === 10); S.check('f8: two door runs in series', p.doors.length >= 2); }
    if (id === 'f2') S.check('f2: skip stairs to floor 4 behind a door', p.stairs.some(s => s.to === 4) && p.doors.length === 3);
    if (id === 'f4') S.check('f4: three transporter pairs', p.pads.length === 6);
    if (id === 'f5') S.check('f5: the Bell, stun runes, force fields', !!p.bell && p.runes.length > 0 && p.beams.length > 0);
    if (id === 'f6') S.check('f6: fake walls, a v plate, skip stairs to 8', p.fake.length >= 3 && p.plates.some(q => q.kind === 'v') && p.trapWalls.v.length > 0 && p.stairs.some(s => s.to === 8));
    if (id === 'f7') S.check('f7: lava and spikes', p.lava.length > 50 && p.spikes.length > 0);
    if (id === 'f9') S.check('f9: the King, the table, wave doors', !!p.king && p.tables.length > 20 && F.points.wave.length === 4 && F.boss);
  }
  const dec = api.decorate(api.get('floors', 'f2'), api.parseFloor(api.get('floors', 'f2')));
  S.check('decoration puts torches on walls and props in corners', dec.torches.length > 3 && dec.deco.length > 2, [dec.torches.length, dec.deco.length]);
  S.check('no errors', !t.errors().length, t.errors());
  return S;
}
