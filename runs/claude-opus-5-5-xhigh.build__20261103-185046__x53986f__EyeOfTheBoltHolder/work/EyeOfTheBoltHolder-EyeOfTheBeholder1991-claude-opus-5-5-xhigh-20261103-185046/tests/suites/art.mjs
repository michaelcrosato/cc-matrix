// art: every monster, person, item and wall mechanism has a look of its own, drawn by code, and it moves. The 3D pen and
// the rigs are driven headless: pen drawings go into a recorder (each primitive logged), rigs are posed by the engine and
// their joints compared, so a check fails if a look is missing, falls back to a default, or stands still.
import { fresh } from '../util.mjs';
import { readFileSync } from 'node:fs';
const rec = () => { const log = []; const P = new Proxy({ flash: false }, { get(o, k) { if (k === 'log') return log; if (k in o || typeof k === 'symbol') return o[k]; return (...a) => { log.push(k + '(' + a.map(v => typeof v === 'number' ? v.toFixed(2) : typeof v === 'string' ? v : Array.isArray(v) ? v.join('/') : '').join(',') + ')'); return P; }; }, set(o, k, v) { o[k] = v; return true; } }); return P; };
const draw = (f, ...a) => { const p = rec(); f(p, ...a); return p.log; };
const same = (a, b) => a.join('|') === b.join('|');
export async function run(t) {
  const { B, E } = await fresh({ expose: ['VIEW_THINGS', 'ICONS'] }), { VIEW_THINGS, ICONS } = B.__test;
  // monsters: every type has a look; pen bodies draw and move (idle clock, wind-up, blow, walk, death)
  for (const type of Object.keys(B.MONSTERS)) {
    const C = B.CREATURES[type];
    t.check(`monster ${type} has a look (rig, blob, orb or pen body; the Bolt-Holder its own drawing)`, type === 'boltholder' ? typeof B.drawEye === 'function' : !!C && !!(C.rig || C.blob || C.orb || C.pen), type);
    if (!C || !C.pen) continue;
    const body = B.PEN_BODIES[C.pen], s0 = { t: 0, wind: 0, strike: 0, hurt: 0, dead: 0, walk: 0, zap: 0 };
    t.check(`monster ${type}: its pen body exists`, typeof body === 'function', C.pen);
    if (typeof body !== 'function') continue;
    const at = o => draw(body, Object.assign({}, s0, o)), base = at({});
    t.check(`monster ${type}: drawn from many parts`, base.length >= 8, base.length);
    t.check(`monster ${type}: moves over time (its idle)`, !same(base, at({ t: .7 })));
    t.check(`monster ${type}: winds up before a blow`, !same(base, at({ wind: .8 })));
    t.check(`monster ${type}: strikes`, !same(base, at({ strike: .5 })));
    t.check(`monster ${type}: walks`, !same(at({ t: .3 }), at({ t: .3, walk: 1 })));
    t.check(`monster ${type}: dies`, !same(base, at({ dead: 1.2 })));
  }
  // the Bolt-Holder: phases, the gaze, the bolts out, the telegraph, death
  const eye = o => draw(B.drawEye, Object.assign({ t: 0, phase: 1, out: 0, iris: 0, tele: 0, hurt: 0, dead: 0, relocked: 0 }, o)), e0 = eye({});
  t.check('the Bolt-Holder is drawn from many parts', e0.length >= 30, e0.length);
  t.check('the Bolt-Holder moves over time', !same(e0, eye({ t: .6 })));
  const ph2 = eye({ phase: 2, out: 6 }), ph3 = eye({ phase: 3, out: 6 });
  t.check('the Bolt-Holder: each phase looks different (phase 2 its cage open, phase 3 its eye cracked)', !same(e0, ph2) && !same(ph2, ph3));
  t.check('the Bolt-Holder: relocked bolts colour its iris', !same(ph2, eye({ phase: 2, out: 6, relocked: 1 })));
  t.check('the Bolt-Holder: drawn bolts come out of the cage', !same(e0, eye({ out: 4 })));
  t.check('the Bolt-Holder: its gaze narrows', !same(e0, eye({ iris: .8 })));
  t.check('the Bolt-Holder: its lightning is telegraphed', !same(e0, eye({ tele: { k: 'lightning' } })));
  t.check('the Bolt-Holder: its rain of sparks is telegraphed', !same(e0, eye({ tele: { k: 'rain' } })) && !same(eye({ tele: { k: 'rain' } }), eye({ tele: { k: 'lightning' } })));
  t.check('the Bolt-Holder: flinches when hurt', !same(e0, eye({ hurt: .3 })));
  t.check('the Bolt-Holder: dies', !same(e0, eye({ dead: 1.5 })));
  // card monsters and people: the engine's rigs, posed; a walk moves the joints, and the cards differ from one another
  const pose = (r, steps, s) => { for (let i = 0; i < steps; i++) r.update(1 / 60, typeof s === 'function' ? s(i) : s); return JSON.stringify(r.J || r); };
  const byId = new Map(); for (const [id, P] of [...Object.entries(B.PEOPLE), ...Object.entries(B.NPCS)]) if (P.look && !byId.has(id)) byId.set(id, P.look);
  const cards = Object.entries(B.CREATURES).filter(([, C]) => C.rig).map(([id, C]) => ['monster ' + id, C.rig]);
  const people = [...byId].map(([id, look]) => ['person ' + id, look]);
  for (const [name, look] of [...cards, ...people]) {
    let r; try { r = B.rigOf(look); } catch (e) { t.check(`${name}: its rig builds`, false, e.message); continue; }
    const idle = pose(r, 30, { x: 0, y: 0, facing: 0 }), walk = pose(r, 20, i => ({ x: (i + 1) * .9, y: 0, facing: 0 }));
    t.check(`${name}: a walk moves its limbs`, idle !== walk);
    const later = pose(r, 40, { x: 18, y: 0, facing: 0 });
    t.check(`${name}: it settles again when still`, later !== walk);
  }
  const uniq = list => new Set(list.map(([, l]) => JSON.stringify(l))).size === list.length;
  t.check('every card monster looks different from the others', uniq(cards));
  t.check('every person looks different from the others', uniq(people), people.length);
  for (const [id, C] of Object.entries(B.CREATURES).filter(([, C]) => C.blob)) {
    let bl; try { bl = new E.Blob(JSON.parse(JSON.stringify(C.blob))); } catch (e) { t.check(`monster ${id}: its blob rig builds`, false, e.message); continue; }
    for (let i = 0; i < 6; i++) bl.update(1 / 60, { squash: .4, walk: 1, look: [1, 0] });
    t.check(`monster ${id}: its blob rig builds, squashes on a hit and patters when it walks`, bl.sq > .05 && bl.walk === 1);
  }
  // items: each has its own model case and icon, and they differ
  const cases = new Set([...B.itemModel.toString().matchAll(/case '([a-zA-Z]+)'/g)].map(m => m[1]));
  const looks = new Map();
  for (const [id, d] of Object.entries(B.ITEMS)) {
    t.check(`item ${id}: a model of its own kind (not the fallback)`, cases.has(d.model), d.model);
    t.check(`item ${id}: a pixel-art icon of its own kind (not the fallback)`, !!ICONS[d.icon], d.icon);
    const m = draw(B.itemModel, id, 0, 0, 0, 0, 1); t.check(`item ${id}: its model draws`, m.length >= 1);
    looks.set(id, m.join('|') + '#' + d.icon);
  }
  t.check('no two items look exactly alike (model, colour and icon)', new Set(looks.values()).size === looks.size, [...looks].filter(([, v], i, a) => a.findIndex(q => q[1] === v) !== i).map(q => q[0]).join(', '));
  // wall mechanisms: each THING draws, and the moving ones change with their state
  for (const [k, f] of Object.entries(VIEW_THINGS)) {
    let a; try { a = draw(f, { t: 0, color: '#6a6474' }); } catch (e) { t.check(`thing ${k} draws`, false, e.message); continue; }
    t.check(`thing ${k} draws`, a.length >= 1);
  }
  const MOVES = { wallLever: { on: true }, wallButton: { press: 1 }, plateF: { on: true }, catch: { used: true }, alcove: { items: ['rock'] }, candle: { on: true }, greatLock: { on: true }, undergate: { bolts: 3 }, sealDoor: { open: 1 }, pit: { bridged: true }, raiseShrine: { on: true, used: true }, clockFace: { on: true, t: 1.3 }, gearWall: { t: 1.3 }, gearNiche: { items: ['tumblerGear'] }, bigBolt: { k: 1 }, houseDoor: { open: 1 } };
  t.check('a running clock moves its hands', !same(draw(VIEW_THINGS.clockFace, { on: true, t: 1 }), draw(VIEW_THINGS.clockFace, { on: true, t: 9 })));
  t.check('a seated gear turns once the mechanism runs', !same(draw(VIEW_THINGS.gearNiche, { items: ['tumblerGear'], on: true, t: 0 }), draw(VIEW_THINGS.gearNiche, { items: ['tumblerGear'], on: true, t: 1 })));
  for (const [k, st] of Object.entries(MOVES)) {
    const f = VIEW_THINGS[k]; if (!f) { t.check(`mechanism ${k} exists`, false); continue; }
    const base = { t: 0, color: '#6a6474' };
    t.check(`mechanism ${k} changes with ${Object.keys(st).join(', ')}`, !same(draw(f, base), draw(f, Object.assign({}, base, st))));
  }
}
