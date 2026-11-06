// Hero setup: loadouts, unlocks, starter gear, The Last Bell preset.
import { CLASSES, SKILLS, SLOT_LEVELS, TONE_OFFSETS, VOW_LEVELS, toneUnlockLevel } from '../data/classes.js';
import { LEGENDARIES, SETS, SET_OF_CLASS, LEGENDARY_IDS } from '../data/items.js';
import { makeItem } from './items.js';
import { makeHero, refreshStats } from './core.js';

export const slotsOpen = (level) => SLOT_LEVELS.filter((l) => level >= l).length;
export const skillUnlocked = (id, level) => level >= SKILLS[id].lvl;
export const toneUnlocked = (id, toneIdx, level) => level >= toneUnlockLevel(id, toneIdx);
export const vowSlots = (level) => VOW_LEVELS.filter((l) => level >= l).length;
export const toneList = (id) => Object.keys(SKILLS[id].tones);

/** Fill free open slots with unlocked skills not already slotted, and keep tones valid. */
export function autoLoadout(h, opts = {}) {
  const cls = CLASSES[h.cls];
  const open = slotsOpen(h.level);
  while (h.skills.length < 6) h.skills.push(null);
  const used = new Set(h.skills.filter(Boolean).map((s) => s.id));
  for (let i = 0; i < 6; i++) {
    if (i >= open) { h.skills[i] = null; continue; }
    if (h.skills[i] && !skillUnlocked(h.skills[i].id, h.level)) h.skills[i] = null;
    if (!h.skills[i]) {
      const pick = cls.skills.find((id) => skillUnlocked(id, h.level) && !used.has(id));
      if (pick) { h.skills[i] = { id: pick, tone: null }; used.add(pick); }
    }
  }
  if (opts.tones) for (const s of h.skills) if (s) {
    const ts = toneList(s.id); let best = null;
    ts.forEach((t, idx) => { if (toneUnlocked(s.id, idx, h.level)) best = t; });
    s.tone = best;
  }
  for (const s of h.skills) if (s && s.tone) { const idx = toneList(s.id).indexOf(s.tone); if (!toneUnlocked(s.id, idx, h.level)) s.tone = null; }
  const vs = vowSlots(h.level);
  h.vows = (h.vows || []).slice(0, vs);
  if (opts.vows) while (h.vows.length < vs) { const v = cls.vows.find((x) => !h.vows.includes(x.id)); if (v) h.vows.push(v.id); else break; }
  h._specKey = null;
  refreshStats({ devotion: null, tuning: { playerLife: 1 } }, h);
}

export function starterGear(w, h) {
  const r = w.lootRng.fork('start:' + h.cls);
  const c = CLASSES[h.cls];
  h.gear.main = makeItem(r, { slot: 'main', rarity: 'common', ilvl: 1, cls: h.cls, base: c.startWeapon });
}

export function createHero(w, { seat = 0, cls = 'bellwarden', name = 'Nameless', level = 1, bot = false, lastBell = false, saved = null }) {
  const h = makeHero(w, { seat, cls, name, level, bot, saved });
  if (saved) { autoLoadout(h); refreshStats(w, h, false); return h; }
  starterGear(w, h);
  if (lastBell) applyLastBell(w, h);
  autoLoadout(h, { tones: lastBell, vows: lastBell });
  refreshStats(w, h, true);
  return h;
}

export function applyLastBell(w, h) {
  h.level = 30; h.xp = 0;
  const r = w.lootRng.fork('lastbell:' + h.cls + h.seat);
  const slots = ['head', 'shoulders', 'chest', 'hands', 'legs', 'feet', 'amulet', 'ring', 'main', 'off'];
  for (const s of slots) h.gear[s] = makeItem(r, { slot: s, rarity: 'reliquary', ilvl: 28, cls: h.cls });
  // three legendaries
  const legs = LEGENDARY_IDS.filter((id) => !LEGENDARIES[id].cls || LEGENDARIES[id].cls === h.cls);
  const mine = legs.filter((id) => LEGENDARIES[id].cls === h.cls);
  const okSlot = (id) => !['head', 'chest'].includes(LEGENDARIES[id].slot);
  const mineOk = mine.filter(okSlot);
  const pick = [mineOk[0], mineOk[1], legs.find((id) => !LEGENDARIES[id].cls && okSlot(id))];
  for (const id of pick) { const it = makeItem(r, { legendary: id, ilvl: 28, cls: h.cls }); h.gear[it.slot] = it; }
  // two class set pieces
  const set = SETS[SET_OF_CLASS[h.cls]];
  const ps = Object.keys(set.pieces);
  for (const slot of [ps[0], ps[1]]) { const it = makeItem(r, { setPiece: true, rarity: 'set', slot, ilvl: 28, cls: h.cls }); h.gear[slot] = it; }
  h.mats = { scrap: 400, dust: 120, shards: 60 };
  h.gold = 20000;
  for (const k of ['ember', 'salt', 'amber']) for (let t = 0; t < 2; t++) h.gems.push({ kind: k, tier: t });
  h.devPoints = 5;
  h.grandKeys = 1;
}
