// The save profile (plan §7.24, §7.9): seeds, the Garage Garden's beds (what each costs and what it unlocks), the
// career's mission ranks, the records, the ghosts, the endings seen and the last choices. One profile in the engine's
// store, versioned, written after a run, a mission, a purchase or a setting; never in an attract demo.
(() => {
'use strict';
const E = My3D2dge, OB = window.OB || (window.OB = {});

const RANK_MULT = { C: 1, B: 1.25, A: 1.5, AAA: 2 };
const RANKS = ['C', 'B', 'A', 'AAA'];

/** the Garage Garden's beds: cost in seeds, and what each one unlocks (plan §8.9) */
OB.BEDS = [
  { id: 'primavera-bloom', name: 'Primavera Bloom Edition', cost: 400, kind: 'edition', what: 'primavera' },
  { id: 'orchidea-bloom', name: 'Orchidea Bloom Edition', cost: 500, kind: 'edition', what: 'orchidea' },
  { id: 'gardenia', name: 'Gardenia GT Targa', cost: 600, kind: 'car', what: 'gardenia', after: 'B2' },
  { id: 'magnolia', name: 'Magnolia V12 Barchetta', cost: 900, kind: 'car', what: 'magnolia', after: 'V2' },
  { id: 'girasole', name: 'Girasole Hyper Spider', cost: 1500, kind: 'car', what: 'girasole', after: 'FINALE' },
  { id: 'lemon-drop', name: 'Song: Lemon Drop Rush', cost: 300, kind: 'song', what: 'lemon', after: 'B4' },
  { id: 'moonflower', name: 'Song: Moonflower', cost: 300, kind: 'song', what: 'moonflower', after: 'M3' },
  { id: 'paint-pastel', name: 'Paint pack: Pastel', cost: 100, kind: 'paint', what: 'pastel' },
  { id: 'paint-metallic', name: 'Paint pack: Metallic', cost: 100, kind: 'paint', what: 'metallic' },
  { id: 'paint-retro', name: 'Paint pack: Retro', cost: 100, kind: 'paint', what: 'retro' },
  { id: 'paint-neon', name: 'Paint pack: Neon', cost: 100, kind: 'paint', what: 'neon' },
  { id: 'outfit-marisol', name: 'Outfit: Picnic Gingham', cost: 150, kind: 'outfit', what: 'marisol', after: 'M2' },
  { id: 'outfit-vivi', name: 'Outfit: Gala Gown', cost: 150, kind: 'outfit', what: 'vivi', after: 'V3' },
  { id: 'outfit-juni', name: 'Outfit: Rally Suit', cost: 150, kind: 'outfit', what: 'juni', after: 'J2' },
  { id: 'mirror', name: 'Mirror Roads', cost: 800, kind: 'mirror', what: 'mirror', after: 'J3' },
];
/** the paint packs: four paints each, added to every car's own paints (plan §8.4) */
OB.PAINT_PACKS = {
  pastel: ['#ffd6e8', '#c8f0e0', '#d8d0ff', '#fff0b8'], metallic: ['#8a9aaa', '#3a4a5a', '#b0a8a0', '#6a5a8a'],
  retro: ['#d86a3a', '#e8b050', '#4a8a6a', '#7a3a2a'], neon: ['#ff2a9a', '#2aff9a', '#2ad8ff', '#ffe02a'],
};

/** the default profile */
function fresh() {
  return { v: 1, seeds: 0, seenIntro: false, owned: [], career: {}, best: {}, records: { stage: {}, route: {}, medals: {} },
    ghosts: {}, endings: {}, last: { car: 1, paint: 0, passenger: 0, station: 0, mode: 'arcade' }, hints: {}, paid: {}, mission: {}, grade: {} };
}
OB.profile = fresh();
/** load from the store (migrating from an older version; blocked storage keeps the visit's profile) */
OB.loadProfile = () => {
  const p = E.store && E.store.get('outbloom:profile', null);
  if (p && p.v === 1) OB.profile = Object.assign(fresh(), p);
  else if (p && p.v === 0) OB.profile = Object.assign(fresh(), { last: p.last || {}, seeds: p.seeds || 0 });
  return OB.profile;
};
OB.saveProfile = () => { if (OB.env.noSave || (OB.race && OB.race.demo)) return; if (E.store) E.store.set('outbloom:profile', OB.profile); };
OB.resetProfile = () => { OB.profile = fresh(); OB.saveProfile(); };

/** what the player owns: the bed ids bought, and the unlocks they gave */
OB.Progress = {
  owns: (id) => OB.profile.owned.includes(id),
  seeds: () => OB.profile.seeds,
  grant(n, why) { OB.profile.seeds += Math.max(0, Math.round(n)); OB.saveProfile(); OB.bus.emit('seeds', { delta: n, why }); },
  /** a bed's price: the seeds, and the bed must have been unlocked by its mission (its `after`) */
  canBuy(bed) { return !OB.Progress.owns(bed.id) && OB.profile.seeds >= bed.cost && OB.Progress.unlockedBed(bed); },
  unlockedBed(bed) { if (!bed.after) return true; if (bed.after === 'FINALE') return OB.Progress.finaleDone(); return !!(OB.profile.career[bed.after] && OB.profile.career[bed.after].cleared); },
  buy(bed) {
    if (!OB.Progress.canBuy(bed)) return false;
    OB.profile.seeds -= bed.cost; OB.profile.owned.push(bed.id); OB.saveProfile(); if (bed.kind === 'mirror') OB.World.built().clear(); OB.bus.emit('unlock', { id: bed.id, name: bed.name }); return true;
  },
  /** what the owned beds allow: cars, songs, paints, outfits, the mirror roads, editions */
  carOwned: id => OB.CARS.find(c => c.id === id) && (OB.CARS.find(c => c.id === id).free || OB.Progress.owns(id === 'primavera' ? 'primavera-bloom' : id === 'orchidea' ? 'orchidea-bloom' : id)),
  songOwned: key => key === 'lemon' ? OB.Progress.owns('lemon-drop') : key === 'moonflower' ? OB.Progress.owns('moonflower') : true,
  paintsFor(car) { const base = car.paints.slice(0, 4), packs = []; for (const k of Object.keys(OB.PAINT_PACKS)) if (OB.Progress.owns('paint-' + k)) packs.push(...OB.PAINT_PACKS[k]); return base.concat(packs); },
  mirror: () => OB.Progress.owns('mirror'),
  /** a Bloom Edition: the same car, +8 km/h (plan §8.4) */
  edition(car) { const id = car.id === 'primavera' ? 'primavera-bloom' : car.id === 'orchidea' ? 'orchidea-bloom' : null; return id && OB.Progress.owns(id) ? Object.assign({}, car, { top: car.top + 8, zero: car.zero - .3, steer: car.steer + .1, grip: car.grip + .04 }) : car; },
  finaleDone: () => OB.Progress.cleared().length >= 9 && !!(OB.profile.career.F && OB.profile.career.F.cleared),
  cleared: () => Object.keys(OB.profile.career).filter(k => OB.profile.career[k].cleared),
  rankOf: id => (OB.profile.career[id] ? OB.profile.career[id].rank : null),
  /** the seeds a mission pays: its base times the rank's multiplier, only for the rank improvement not yet paid */
  payMission(id, rank) {
    const m = OB.MISSIONS.find(x => x.id === id), rec = OB.profile.career[id] || (OB.profile.career[id] = { cleared: false, rank: null, best: 0, paid: null });
    const idx = RANKS.indexOf(rank), paidIdx = rec.paid ? RANKS.indexOf(rec.paid) : -1;
    if (idx < 0) return 0;
    let pay = 0;
    if (idx > paidIdx) {
      const prev = paidIdx >= 0 ? m.base * RANK_MULT[rec.paid] : 0;
      pay = Math.round(m.base * RANK_MULT[rank] - prev);
      rec.paid = rank;
    }
    rec.cleared = true; if (!rec.rank || idx > RANKS.indexOf(rec.rank)) rec.rank = rank;
    OB.profile.seeds += pay; OB.saveProfile();
    return pay;
  },
  /** the seeds an arcade or love run pays: score over 20,000, 50 for a goal, 100 the first time each ending is seen */
  payRun(res) {
    let pay = Math.floor((res.score || 0) / 20000);
    if (res.goal) {
      pay += 50;
      const key = res.goal + ':' + (res.mood || 'Bloom');
      if (!OB.profile.endings[key]) { OB.profile.endings[key] = true; pay += 100; }
    }
    OB.profile.seeds += pay; OB.saveProfile(); return pay;
  },
};
})();
