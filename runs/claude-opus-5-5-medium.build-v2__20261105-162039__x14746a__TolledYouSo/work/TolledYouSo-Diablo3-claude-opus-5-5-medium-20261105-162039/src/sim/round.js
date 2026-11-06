// The AI Hub round: one 8-minute Knell Run with a Warden for everybody seated.
import { CLASSES, CLASS_IDS, SKILLS, toneUnlockLevel } from '../data/classes.js';
import { DT, emit, enterZone } from './world.js';
import { levelUp, refresh, slotOpen } from './hero.js';
import { addProp } from './rules.js';
import { startKnell } from './knell.js';
import { makeItem } from './loot.js';

export const SEAT_CLASS = ['bellwarden', 'lamplighter', 'sexton', 'bellwarden'];
export function presetHero(w, h) {
  // Level 12, every slot filled from the class preset, a plain gear set.
  while (h.level < 12) levelUp(w, h);
  const skills = CLASSES[h.cls].skills.filter((s) => s.level <= 12);
  h.slots = skills.slice(0, 6).map((s) => ({ skill: s.id, tone: null }));
  while (h.slots.length < 6) h.slots.push({ skill: null, tone: null });
  h.gear = {};
  for (const slot of ['main', 'chest', 'head', 'hands', 'legs', 'feet']) h.gear[slot] = makeItem(w.rngs.loot, { slot, rarity: 'common', ilvl: 11, cls: h.cls });
  h.vows = [CLASSES[h.cls].vows[0].id];
  h.xp = 0; h.gold = 0; h.inv = [];
  refresh(w, h); h.hp = h.stats.maxHp; h.res = h.stats.maxResource * 0.5;
}
export function swapClass(w, h, cls) {
  h.cls = cls; h._skillCache = null; presetHero(w, h); emit(w, { t: 'classswap', id: h.id, seat: h.seat, cls });
}
export function setupRound(w, players) {
  w.round = { players, t: 0, started: false, wardenDead: false, timeUp: false, swapUntil: 30 };
  w.hooks.classFonts = (w2, z) => {
    const e = z.entrance;
    CLASS_IDS.forEach((c, i) => { addProp(w2, { kind: 'classfontspot', x: e.x - 3 + i * 3, z: e.z + 3, cls: c, model: 'knell_font', r: 1, label: CLASSES[c].name }); });
  };
  w.hooks.levelPickQueue = (w2, h) => {
    if (h.level <= 12) return;
    const opts = rollPicks(w2, h);
    h.levelPicks.push({ opts, t: 10 });
    emit(w2, { t: 'picks', seat: h.seat });
  };
  w.hooks.levelPick = (w2, h, i) => { const p = h.levelPicks[0]; if (!p) return false; applyPick(w2, h, p.opts[i] ?? p.opts[0]); h.levelPicks.shift(); return true; };
  startKnell(w, { session: true });
}
function rollPicks(w, h) {
  const rng = w.rngs.quest; const out = [];
  const usable = h.slots.filter((s) => s.skill && !s.tone);
  const toneSlot = usable.length ? rng.pick(usable) : null;
  if (toneSlot) { const sk = SKILLS[toneSlot.skill]; const keys = Object.keys(sk.tones); const t = rng.pick(keys); out.push({ kind: 'tone', skill: sk.id, tone: t, label: `${sk.name}: ${sk.tones[t].name}` }); }
  if (h.vows.length < 2) { const left = CLASSES[h.cls].vows.filter((v) => !h.vows.includes(v.id)); const v = rng.pick(left); out.push({ kind: 'vow', id: v.id, label: `VOW: ${v.name}` }); }
  const stats = [{ k: 'power', label: '+15 POWER', v: 15 }, { k: 'vitality', label: '+15 VITALITY', v: 15 }, { k: 'crit', label: '+5% CRIT', v: 5 }, { k: 'atkSpd', label: '+8% ATTACK SPEED', v: 8 }];
  rng.shuffle(stats);
  for (const s of stats) { if (out.length >= 3) break; out.push({ kind: 'stat', ...s }); }
  return out.slice(0, 3);
}
function applyPick(w, h, o) {
  if (o.kind === 'tone') { const s = h.slots.find((x) => x.skill === o.skill); if (s) s.tone = o.tone; }
  if (o.kind === 'vow') h.vows.push(o.id);
  if (o.kind === 'stat') { const g = h.gear.main; g.affixes.push({ k: o.k, v: o.v }); }
  refresh(w, h);
  emit(w, { t: 'toast', seat: h.seat, text: o.label, color: 'sand' });
}
export function stepRound(w) {
  const r = w.round; if (!r) return;
  r.t += DT;
  // The class fonts in the first room: stand on one for 2 s to swap, until play has run 30 s.
  if (r.t < r.swapUntil) {
    for (const h of w.heroes) {
      if (h.left || h.dead) continue;
      const f = w.props.find((p) => p.kind === 'classfontspot' && p.cls !== h.cls && Math.hypot(p.x - h.x, p.z - h.z) < 1.2);
      if (f) { h.fontT = (h.fontT ?? 0) + DT; if (h.fontT >= 2) { h.fontT = 0; swapClass(w, h, f.cls); } } else h.fontT = 0;
    }
  }
  for (const h of w.heroes) {
    if (h.levelPicks.length) { const p = h.levelPicks[0]; p.t -= DT; if (p.t <= 0) w.hooks.levelPick(w, h, 0); }
    if (h.dead && h.deadT >= 8) { h.dead = false; h.hp = h.stats.maxHp * 0.6; h.state = 'idle'; h.invulnerable = 2; const a = w.heroes.find((o) => !o.dead && !o.left && o !== h); if (a) { h.x = a.x; h.z = a.z; h.px = a.x; h.pz = a.z; } emit(w, { t: 'revive', id: h.id, x: h.x, z: h.z }); }
  }
}
export const scoreOf = (h) => h.damage / 100 + 50 * h.revives + 20 * h.eliteKills - 30 * h.deaths;
export { slotOpen, toneUnlockLevel, enterZone };
