// The AI Hub session round: one shared Knell Run, fill the meter, slay the Warden. Host only.
import { CLASSES } from '../data/classes.js';
import { SKILLS } from '../data/skills.js';
import { VOWS } from '../data/classes.js';
import { RULES } from '../data/tuning.js';
import { DT, ev, toast } from './core.js';
import { addHero, gearLook, newHeroData, recalcHero } from './hero.js';
import { makeItem } from './loot.js';
import { addObject } from './objects.js';
import { loadZone } from './travel.js';
import { startRun } from './knell.js';

export const SEAT_CLASSES = ['bellwarden', 'lamplighter', 'sexton', 'bellwarden'];
export const ROUND_LEVEL = 12;

export function roundHeroData(cls, seat, name, rng) {
  const d = newHeroData(cls, name, `round${seat}`);
  d.level = ROUND_LEVEL;
  d.skills = CLASSES[cls].preset.map(([id]) => ({ id, tone: null }));
  const gear = {};
  for (const slot of ['main', 'head', 'chest', 'hands', 'legs', 'feet', 'shoulders', 'amulet', 'ring']) {
    gear[slot] = makeItem(rng, { slot, rarity: 'blessed', ilvl: ROUND_LEVEL, cls });
  }
  d.gear = gear;
  return d;
}

export function setupRound(w, players) {
  w.round = { playT: 0, started: false, finished: false, time: 0, picks: new Map(), players };
  w.noPyx = true;
  w.run = {
    seedKey: 'session', mods: ['crowded'], grand: false, tier: 1, meter: 0, total: Math.round(330 * (1 + 0.25 * (players.length - 1))), state: 'fill',
    hpMul: 1, dmgMul: 1, goldMul: 1, densityMul: 1, speedMul: 1, startT: 0, timer: 0, floor: 0, warden: null, table: null,
  };
  const rng = w.root.fork('round');
  for (const p of players) {
    const cls = SEAT_CLASSES[p.id % 4];
    const d = roundHeroData(cls, p.id, p.name, rng.fork(`hero${p.id}`));
    const h = addHero(w, d, p.id, { navIndex: p.id });
    h.color = p.color;
    h.res = h.stats.maxResTotal * 0.5;
  }
  loadZone(w, 'session', 0, 'start');
  placeClassFonts(w);
}

function placeClassFonts(w) {
  const z = w.zone;
  const offs = [[-3, -1.5, 'bellwarden'], [0, -2, 'lamplighter'], [3, -1.5, 'sexton']];
  offs.forEach(([dx, dz, cls], i) => {
    let x = z.entryX + dx, y = z.entryZ + dz;
    if (!z.nav.walkable(x, y)) { x = z.entryX + dx * 0.5; y = z.entryZ + 1; }
    addObject(w, 'class_font', x, y, { id: 1600000 + i, cls, noUse: true, label: CLASSES[cls].name, announce: false });
  });
  w.swapClass = (w2, h, cls) => {
    const d = roundHeroData(cls, h.seat, h.name, w2.root.fork(`swap${h.seat}:${cls}`));
    h.cls = cls;
    h.gear = d.gear; h.skills = d.skills; h.vows = [null, null]; h.cds = {}; h.charges = {};
    recalcHero(w2, h);
    h.hp = h.stats.maxHp; h.res = h.stats.maxResTotal * 0.5;
    ev(w2, { t: 'hero_class', id: h.id, cls });
    ev(w2, { t: 'gear', id: h.id, g: gearLook(h) });
    toast(w2, `${h.name} IS NOW A ${CLASSES[cls].name}`, CLASSES[cls].color);
    for (const a of w2.allies) if (a.owner === h.id) a.life = 0.01;
  };
}

/** A level-up in a session pops a small "pick 1 of 3". The host rolls the three and the seat answers. */
export function roundLevelUp(w, h) {
  const opts = [];
  const rng = w.lootRng;
  const toned = h.skills.filter((s) => s && !s.tone);
  if (toned.length) {
    const s = rng.pick(toned);
    const ids = Object.keys(SKILLS[s.id].tones);
    const t = rng.pick(ids);
    opts.push({ k: 'tone', skill: s.id, tone: t, name: `${SKILLS[s.id].name}: ${SKILLS[s.id].tones[t].name}`, desc: SKILLS[s.id].tones[t].desc });
  }
  const vows = VOWS[h.cls].filter((v) => !h.vows.includes(v.id));
  if (vows.length && h.vows.includes(null)) {
    const v = rng.pick(vows);
    opts.push({ k: 'vow', vow: v.id, name: `VOW: ${v.name}`, desc: v.desc });
  }
  const stats = [{ k: 'stat', stat: 'power', amt: 15, name: '+15 POWER', desc: 'HIT HARDER' }, { k: 'stat', stat: 'vit', amt: 15, name: '+15 VITALITY', desc: 'STAY UP LONGER' }, { k: 'stat', stat: 'atkspd', amt: 0.08, name: '+8% ATTACK SPEED', desc: 'SWING FASTER' }];
  rng.shuffle(stats);
  while (opts.length < 3) opts.push(stats.pop());
  h.pick = { t: 10, opts };
  ev(w, { t: 'pick3', seat: h.seat, opts, level: h.level });
}

export function applyRoundPick(w, h, i) {
  if (!h.pick) return;
  const o = h.pick.opts[i] ?? h.pick.opts[0];
  h.pick = null;
  ev(w, { t: 'pick3x', seat: h.seat, name: o.name });
  if (o.k === 'tone') { const s = h.skills.find((x) => x?.id === o.skill); if (s) s.tone = o.tone; h.skillCache.clear(); }
  else if (o.k === 'vow') { const idx = h.vows.indexOf(null); if (idx >= 0) h.vows[idx] = o.vow; recalcHero(w, h); }
  else if (o.k === 'stat') {
    const ring = h.gear.ring;
    if (ring) ring.affixes.push({ k: o.stat, v: o.amt });
    recalcHero(w, h);
  }
}

export function stepRound(w) {
  const r = w.round;
  if (!r) return;
  r.playT += DT;
  for (const h of w.heroes) {
    if (!h.pick) continue;
    h.pick.t -= DT;
    if (h.pick.t <= 0) applyRoundPick(w, h, 0);
  }
}

export function roundBossDead(w, m) {
  if (!w.round) return;
  w.round.finished = true;
  w.round.won = true;
  ev(w, { t: 'round_won' });
}

export const roundScore = (h) => (h.dmgDone ?? 0) / 100 + 50 * (h.revives ?? 0) + 20 * (h.eliteKills ?? 0) - 30 * (h.roundDeaths ?? 0);

export function roundResults(w, won) {
  const heroes = w.heroes.filter((h) => !h.gone);
  const scored = heroes.map((h) => ({ id: h.seat, score: Math.round(roundScore(h)), h }));
  scored.sort((a, b) => b.score - a.score);
  const standings = [];
  for (const s of scored) {
    const last = standings[standings.length - 1];
    if (last && last.score === s.score) last.ids.push(s.id);
    else standings.push({ score: s.score, ids: [s.id] });
  }
  const scores = Object.fromEntries(scored.map((s) => [s.id, s.score]));
  const stats = Object.fromEntries(scored.map((s) => [s.id, { Damage: Math.round(s.h.dmgDone ?? 0), Kills: s.h.kills ?? 0, Revives: s.h.revives ?? 0, Gold: s.h.goldEarned ?? 0, Deaths: s.h.roundDeaths ?? 0 }]));
  const top = (f) => scored.reduce((a, b) => (f(b.h) > f(a.h) ? b : a), scored[0]);
  const awards = scored.length ? [
    { id: top((h) => h.dmgDone ?? 0).id, title: 'Bell-Ringer', detail: 'Most damage' },
    { id: top((h) => h.kills ?? 0).id, title: 'Undertaker', detail: 'Most kills' },
    { id: top((h) => h.revives ?? 0).id, title: 'Good Samaritan', detail: 'Most revives' },
    { id: top((h) => h.goldEarned ?? 0).id, title: 'Collector', detail: 'Most gold' },
    { id: top((h) => h.roundDeaths ?? 0).id, title: 'Regular Customer', detail: 'Most deaths' },
  ] : [];
  return { standings: standings.map((s) => s.ids), scores, won, stats, awards };
}

export { RULES, startRun };
