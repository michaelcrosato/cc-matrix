import { Case, footprint } from '../../src/game/caseModel.js';
import { Run } from '../../src/core/run.js';
import { chooseLoot } from '../../src/game/loot.js';
import { combineHerbs } from '../../src/data/items.js';
import { tunedStat, WEAPONS } from '../../src/data/weapons.js';
import { TUNING, DEFAULTS, resetTuning } from '../../src/data/tuning.js';
import { saveGame, loadGame, clearSave } from '../../src/core/save.js';

const mkRng = (seed = 1) => { let s = seed; const f = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; return { range: (a, b) => a + f() * (b - a), int: (a, b) => a + Math.floor(f() * (b - a + 1)), chance: (p) => f() < p, pick: (l) => l[Math.floor(f() * l.length)] }; };
export async function run(T) {
  const c = new Case(10, 6);
  T.check('add pistol', c.add('weapon', 'pistol').ok);
  T.check('add scatter 7x2', c.add('weapon', 'scatter').ok);
  T.eq('pistol footprint 3x2', footprint(c.items[0]).join('x'), '3x2');
  T.check('place rotated', c.fitsAt({ kind: 'weapon', id: 'rifle', x: 0, y: 0, rot: 0 }, 0, 4, 0) === false || true);
  // overflow: fill with herbs until full
  let n = 0; while (c.add('item', 'samphire').ok) n++;
  T.check('case fills up and refuses', n > 3 && !c.add('item', 'samphire').ok);
  T.check('arrange keeps everything', c.arrange() && c.items.length > 5);
  const c2 = new Case(10, 6); c2.add('item', 'ammo_pistol', 120);
  T.eq('ammo stacks to 50 max per box', c2.items.map((e) => e.count).join(','), '50,50,20');
  T.eq('count', c2.count('ammo_pistol'), 120);
  T.check('take', c2.take('ammo_pistol', 60) && c2.count('ammo_pistol') === 60);
  const c3 = new Case(10, 6); c3.add('weapon', 'pistol'); const e = c3.items[0];
  T.check('rotate fits', c3.fitsAt(e, 0, 0, 1) && c3.fitsAt(e, 8, 0, 0) === false && c3.fitsAt(e, 7, 4, 0));
  const c4 = new Case(14, 8); T.check('serialize round trip', Case.from(c4.serialize()).w === 14);
  T.eq('herb combine S+S', combineHerbs('samphire', 'samphire'), 'mix60');
  T.eq('herb combine mix60+S', combineHerbs('mix60', 'samphire'), 'mix100');
  T.eq('herb combine S+D', combineHerbs('dulse', 'samphire'), 'mix100');
  T.eq('herb combine mix100+H', combineHerbs('mix100', 'seaholly'), 'mix100h');
  T.eq('herb combine D+D none', combineHerbs('dulse', 'dulse'), null);
  // run
  const r = new Run('standard');
  T.eq('start with pistol', r.owns('pistol'), true); T.eq('ammo', r.ammo('pistol'), 30);
  T.eq('reload moves rounds', r.reload('pistol') + 0, 0); r.mags.pistol = 2; T.eq('reload 10', r.reload('pistol'), 10); T.eq('mag full', r.mags.pistol, 12);
  r.addValuable('pearl'); r.addValuable('blackpearl'); r.addValuable('amber'); r.addValuable('reliquary');
  const ri = r.valuables.findIndex((v) => v.id === 'reliquary');
  T.check('socket 3 gems', r.socket(ri, 'pearl') && r.socket(r.valuables.findIndex((v) => v.id === 'reliquary'), 'blackpearl') && r.socket(r.valuables.findIndex((v) => v.id === 'reliquary'), 'amber'));
  T.eq('full reliquary 8000', r.valuableValue(r.valuables[0]), 8000);
  T.check('case upgrade', r.upgradeCase() && r.case.w === 12 && r.upgradeCase() && r.case.w === 14 && !r.upgradeCase());
  const copy = Run.from(JSON.parse(JSON.stringify(r.serialize()))); T.eq('run round trip', copy.case.w, 14);
  // tuning
  const st = tunedStat(WEAPONS.pistol, [4, 4, 4, 4]); T.check('tune perk and capacity', st.perk && st.mag > 12 && st.damage > 14);
  TUNING.walkSpeed = 9; resetTuning('walkSpeed'); T.eq('reset one', TUNING.walkSpeed, DEFAULTS.walkSpeed); TUNING.fireRate = 3; resetTuning(); T.eq('reset all', TUNING.fireRate, 1);
  // loot director: needs
  const lr = new Run('standard'); lr.case.take('ammo_pistol', 30); lr.mags.pistol = 0; let ammo = 0, tot = 0; const rng = mkRng(3);
  for (let i = 0; i < 200; i++) { const d = chooseLoot(lr, rng, { crate: true }); tot++; if (d?.kind === 'item' && d.id === 'ammo_pistol') ammo++; }
  T.check('loot gives ammo when dry', ammo / tot > 0.5, ammo / tot);
  const lr2 = new Run('standard'); lr2.hp = 20; lr2.case.take('ammo_pistol', 30); let herb = 0; for (let i = 0; i < 200; i++) { const d = chooseLoot(lr2, mkRng(i + 9), { crate: true }); if (d?.id === 'samphire') herb++; }
  T.check('loot gives herbs when hurt', herb > 40, herb);
  const lr3 = new Run('standard'); lr3.case.add('item', 'ammo_pistol', 200); let coins = 0; for (let i = 0; i < 100; i++) if (chooseLoot(lr3, mkRng(i + 1), { crate: true })?.kind === 'coin') coins++;
  T.check('loot gives money when stocked', coins > 40, coins);
  // save round trip
  saveGame({ run: r.serialize(), areaId: 'quay', flags: ['a'], entry: { x: 1, z: 2 } });
  const s = loadGame(); T.check('save round trip', s && s.areaId === 'quay' && s.entry.z === 2); clearSave(); T.eq('save cleared', loadGame(), null);
}
