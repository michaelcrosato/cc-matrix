// What the Use button does, by kind. when() hides it, verb() words it, run() does it. Data plus tiny handlers.
import { WEAPONS } from './weapons.js';
const safe = (g, it) => !it.site || it.site.safe !== false;
export const INTERACTIONS = {
  bed: { verb: 'SLEEP', when: (g, it) => it.site.safe, run: (g, it) => g.ui.open('bed', it.site) },
  locker: { verb: 'OPEN LOCKER', when: (g, it) => it.site.safe, run: (g) => g.ui.open('locker') },
  crate: { verb: 'RESUPPLY', when: (g, it) => it.site.safe, run: (g) => { g.weapons.refill(); g.say('AMMO AND SYRETTES REPLENISHED.', 'player', 2); g.sfx('equip'); } },
  safehouse: { verb: 'CHECK THE SAFEHOUSE', when: (g, it) => !it.site.safe, run: (g, it) => g.say(it.site.cleared ? 'NOBODY HOME BUT THE WIND.' : 'GUARDS FIRST. THEN SLEEP.', 'player', 2.5) },
  rack: { verb: 'LOOK AT THE RACK', run: (g) => g.ui.open('rack') },
  tibor: { verb: 'TALK TO TIBOR', run: (g) => g.talk?.('tibor') },
  clinic: { verb: 'TALK TO ODILE', run: (g) => g.talk?.('odile') },
  vance: { verb: 'SEE THE COLONEL', when: (g) => g.mode === 'play', run: (g) => g.talk?.('vance') },
  ansa: { verb: 'SEE MOTHER ANSA', run: (g) => g.talk?.('ansa') },
  bar: { verb: 'SIT AT THE BAR', run: (g) => g.talk?.('bar') },
  board: { verb: 'READ THE NOTICE BOARD', run: (g) => g.ui.open('board') },
  train: { verb: 'TALK TO OLD BAKR', run: (g) => g.talk?.('bakr') },
  halt: { verb: (g, it) => `RIDE FROM ${it.halt.name.toUpperCase()}`, when: (g, it) => g.visitedHalts?.has(it.halt.id) || true, run: (g, it) => { g.visitedHalts?.add(it.halt.id); g.ui.open('halts', it.halt); } },
  trig: { verb: (g, it) => (g.trigRead?.has(it.index) ? 'READ THE NOTE AGAIN' : 'USE THE TRIG POINT'), run: (g, it) => g.readTrig?.(it.index) },
  cage: { verb: 'OPEN THE CAGE', hold: 3, when: (g, it) => !it.site.caged || true, run: (g, it) => g.events.emit('cageopen', it) },
  'ammo-bunker': { verb: 'TAKE THE AMMO', when: (g) => false, run: () => {} },
  pump: { verb: 'OPEN THE BYPASS', when: (g) => g.missions?.hasUse?.('pump'), hold: 2, run: (g, it) => g.events.emit('pumpopen', it) },
  sluice: { verb: 'TAKE HIS LEDGER', when: (g) => g.missions?.hasUse?.('sluice'), hold: 1.5, run: (g, it) => g.events.emit('sluice', it) },
  harrow: { verb: 'SIT WITH THE SURVEYOR', when: (g) => g.missions?.hasUse?.('harrow'), run: (g) => g.events.emit('harrow') },
  drop: { verb: (g, d) => `TAKE ${(WEAPONS[d.id]?.name || d.id).toUpperCase()}`, run: (g, d) => g.drops.take(d) },
  stonecase: { verb: (g, c) => 'OPEN THE CASE', hold: 1, run: (g, c) => g.takeCase?.(c) },
};
