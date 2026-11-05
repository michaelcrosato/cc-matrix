/* ===== 26 sim · magic, camp, food, progress (PLAN §4.8 to §4.12) =====
 * Mages cast arcane spells from their spellbook (held in a hand); clerics pray with their holy symbol (in a hand).
 * Slots refill after a full rest. A scroll cast by a mage is used up; a wand has charges and anyone may zap it. */
/** the spells a member can cast at a level: the prepared ones, with a slot left */
function slotLeft(m, lvl) { return slotsMax(m)[lvl] - m.used[lvl]; }
/** the cast menu's list: prepared spells, with their slots, and the level tabs */
function castList(m) {
  const out = [];
  for (const l of [1, 2, 3]) for (const sp of m.prep[l] || []) out.push({ id: sp, lvl: l, left: slotLeft(m, l), name: B.SPELLS[sp].name, target: B.SPELLS[sp].target });
  return out;
}
/** can this member cast now: the right book or symbol in a hand, conscious, not held */
function castReady(m) {
  if (m.state !== 'ok' || m.status.held) return { ok: false, why: m.state !== 'ok' ? 'down' : 'held' };
  const holds = [m.slots.main, m.slots.off].filter(Boolean).map(it => B.ITEMS[it.id].k);
  if (m.cls === 'M' && holds.includes('book')) return { ok: true };
  if (m.cls === 'C' && holds.includes('holy')) return { ok: true };
  if (m.cls === 'P' && holds.includes('holy')) return { ok: true };
  return { ok: false, why: 'nobook' };
}
/** a spell cast from a member: a slot is spent, both hands wait 2.5 s */
function castSpell(m, spell, target) {
  const sp = B.SPELLS[spell]; if (!sp) return { ok: false, why: 'nospell' };
  const r = castReady(m); if (!r.ok) { msg(r.why === 'nobook' ? (m.cls === 'M' ? 'You need your spellbook in hand.' : 'You need your holy symbol in hand.') : m.name + ' cannot cast now.'); return { ok: false, why: r.why }; }
  if (!(m.prep[sp.lvl] || []).includes(spell)) { msg(m.name + ' has not prepared that.'); return { ok: false, why: 'unprepared' }; }
  if (slotLeft(m, sp.lvl) <= 0) { msg('No ' + ['', 'first', 'second', 'third'][sp.lvl] + '-level slots left.'); return { ok: false, why: 'slots' }; }
  if (sp.kind === 'arcane' && m.cls !== 'M') return { ok: false, why: 'kind' };
  m.used[sp.lvl]++; m.cool.main = 2.5; m.cool.off = 2.5;
  const res = castSpellFx(m, spell, 'spell', target);
  S.stats.casts = (S.stats.casts || 0) + 1;
  return res;
}
/** the effect of a spell or a scroll or wand's charge; the target: 'front', 'line', a roster index, 'party' or 'door' */
function castSpellFx(m, spell, source, target) {
  const sp = B.SPELLS[spell], pw = B.T.spellPow, lvl = sp.lvl, p = S.party;
  ev('cast', { spell, m: rosterOf(m), kind: sp.kind || 'arcane', target: sp.target }); sfx('cast');
  switch (spell) {
    case 'sparkDart': {
      const n = Math.min(3, 1 + Math.floor(lvl / 2)); const foe = lineMon(6);
      ev('spark', { n, at: [p.cx, p.cy, p.dir] });
      for (let i = 0; i < n && foe && foe.hp > 0; i++) hitMon(foe, Math.max(1, Math.round(B.roll(S, 'combat', '1d4+1') * pw * B.T.partyDmg)), m, { how: 'spell' });
      break;
    }
    case 'wardOfBrass': { const t = targetMember(target, m); if (t) { t.ward = Math.round((8 + lvl) * pw); msg(t.name + ' is warded in brass.'); } break; }
    case 'findSeams': p.seeing = 90; msg('The seams of the world show in gold.'); break;
    case 'slumber': { const list = frontMons().filter(x => x.hp > 0 && ['S', 'M'].includes(B.MONS[x.type].size)); let pool = Math.round((10 + 3 * lvl) * pw); list.sort((a, b) => a.hp - b.hp); for (const x of list) { if (x.hp > pool) continue; pool -= x.hp; x.state = 'asleep'; x.status.sleep = 20; x.aware = false; ev('sleep', { mon: x.id }); } if (!list.length) msg('Nothing sleeps.'); break; }
    case 'unlatch': { const [fx, fy] = frontCell(), c = cellOf(fx, fy), k = idAt(fx, fy); const dr = curFS().doors[k];
      if (c === 'M' || c === 'L' || c === 'K') { if (dr) { dr.open = true; dr.locked = false; ev('door', { id: k, open: true }); msg('The runes unravel like smoke.'); wireFire('unlock', k); } }
      else msg('Nothing here would turn.'); break; }
    case 'frostbite': { for (const x of frontMons()) { hitMon(x, Math.max(1, Math.round(B.roll(S, 'combat', '2d6') * pw)), m, { how: 'spell' }); if (x.hp > 0) x.status.slow = 10; } if (!frontMons().length) msg('The frost falls on nothing.'); break; }
    case 'featherStep': p.floating = 120; msg('You float over the pits.'); break;
    case 'forkedLightning': { let hits = 0; for (let k = 1; k <= 5; k++) { const x = p.cx + DX[p.dir] * k, y = p.cy + DY[p.dir] * k; if (!passable(x, y, 'proj') && !(cellOf(x, y) === 'O')) break; const mo = monAt(x, y); if (mo) { const dmg = Math.max(1, Math.round(B.roll(S, 'combat', (3 + Math.max(0, lvl - 5)) + 'd6') * pw)); if (mo.type === 'boltholder') bossHealBy(Math.round(dmg / 2)); else hitMon(mo, dmg, m, { how: 'spell', lightning: true }); hits++; } } ev('bolt', { kind: 'forked' }); if (!hits) msg('The lightning finds nothing.'); break; }
    case 'blazingOrb': { let x = p.cx, y = p.cy, hit = null; for (let k = 1; k <= 6; k++) { const nx = p.cx + DX[p.dir] * k, ny = p.cy + DY[p.dir] * k; if (!passable(nx, ny, 'proj') || monAt(nx, ny)) { x = nx; y = ny; hit = true; break; } x = nx; y = ny; } const dmg = Math.round(B.roll(S, 'combat', '3d6') * pw) + lvl; ev('orb', { at: [x, y] }); for (const [ox, oy, full] of [[x, y, 1], [x + 1, y, .5], [x - 1, y, .5], [x, y + 1, .5], [x, y - 1, .5]]) { const mo = monAt(ox, oy); if (mo) { if (mo.type === 'boltholder') bossHealBy(0); else hitMon(mo, Math.max(1, Math.round(dmg * full)), m, { how: 'spell' }); } } break; }
    case 'mend': { const t = targetMember(target, m); if (t) { healMember(t, Math.round((B.roll(S, 'combat', '1d8') + 1 + Math.floor(lvl / 2)) * pw)); ev('mend', { m: rosterOf(t) }); } break; }
    case 'steadyHand': p.steady = 60; msg('A golden hand steadies the party.'); break;
    case 'turnDead': { for (const x of frontMons()) { if (!B.MONS[x.type].undead) continue; if (x.hp <= 2 * lvl) { monsterDied(x, m); msg('The ' + B.MONS[x.type].name + ' crumbles.'); } else { x.status.turned = 12; } } break; }
    case 'purge': { const t = targetMember(target, m); if (t) { delete t.status.poison; healMember(t, B.roll(S, 'combat', '1d4')); msg(t.name + ' is cleansed.'); } break; }
    case 'holdFast': { for (const x of frontMons()) { if (B.MONS[x.type].undead || B.MONS[x.type].construct || x.type === 'boltholder') continue; if (B.rnd(S, 'combat') < .25) continue; x.status.held = 10; x.state = 'held'; } break; }
    case 'loaves': for (const [mm] of partyList()) mm.food = 100; msg('Warm bread, and everyone is fed.'); sfx('eat'); break;
    case 'greaterMend': { const t = targetMember(target, m); if (t) healMember(t, Math.round((B.roll(S, 'combat', '3d8') + lvl) * pw)); break; }
    case 'raise': { const t = targetMember(target, m); if (t && t.state === 'dead') raiseMember(t, 1); else msg('Nobody needs raising.'); break; }
    case 'freeHinge': { p.freeHinge = 120; for (const [mm] of partyList()) delete mm.status.held; msg('Joints move again.'); break; }
    default: throw new Error('no spell ' + spell);
  }
  return { ok: true };
}
/** the member a target means: the roster index picked, else the caster */
function targetMember(target, caster) { if (typeof target === 'number' && target >= 0) return S.party.roster[target] || null; return caster; }
/** the monsters in the cell in front */
function frontMons() { const p = S.party, m = monAt(p.cx + DX[p.dir], p.cy + DY[p.dir]); return m ? [m] : []; }
/** the first monster down the facing line within n cells */
function lineMon(n) { const p = S.party; for (let k = 1; k <= n; k++) { const x = p.cx + DX[p.dir] * k, y = p.cy + DY[p.dir] * k; const m = monAt(x, y); if (m) return m; if (!passable(x, y, 'proj')) return null; } return null; }
/** a scroll cast by a mage at once: no slot (the scroll is the cost) */
function castScroll(m, spell) { const sp = B.SPELLS[spell]; castSpellFx(m, spell, 'scroll', null); return sp; }
/** memorize (or pray): a spell into a level's slots, if the slots of its level have room */
function memorize(m, spell) {
  const sp = B.SPELLS[spell]; if (!sp) return { ok: false };
  if (m.cls === 'M' && !m.book.includes(spell)) { msg(m.name + ' does not know that spell.'); return { ok: false }; }
  if (m.cls === 'C' && sp.kind !== 'prayer') return { ok: false, why: 'kind' };
  if (m.cls === 'M' && sp.kind !== 'arcane') return { ok: false, why: 'kind' };
  const list = m.prep[sp.lvl]; if (list.includes(spell)) return { ok: false, why: 'have' };
  if (list.length >= slotsMax(m)[sp.lvl]) { msg('No ' + ['', 'first', 'second', 'third'][sp.lvl] + '-level slots to fill.'); return { ok: false, why: 'full' }; }
  list.push(spell); sfx('confirm'); return { ok: true };
}
/** forget a prepared spell */
function forget(m, spell) { const sp = B.SPELLS[spell]; const i = m.prep[sp.lvl].indexOf(spell); if (i >= 0) m.prep[sp.lvl].splice(i, 1); return { ok: i >= 0 }; }
/** a mage learns a scroll's spell from the pack (the scroll is used up) */
function scribe(m, i) {
  const it = m.pack[i]; if (!it || B.ITEMS[it.id].k !== 'scroll' || !B.ITEMS[it.id].spell) return { ok: false };
  const sp = B.ITEMS[it.id].spell; if (m.cls !== 'M' || B.SPELLS[sp].kind !== 'arcane') return { ok: false, why: 'cls' };
  if (!m.book.includes(sp)) m.book.push(sp);
  m.pack[i] = null; msg(m.name + ' scribes ' + B.SPELLS[sp].name + ' into the book.'); sfx('scribe'); return { ok: true };
}
/* ---- camp: rest, food, interruptions ---- */
/** camp may open: no aware monster within six cells */
function campBlocked() { return monsOn().some(m => m.hp > 0 && m.aware && cheb(m.cx, m.cy, S.party.cx, S.party.cy) <= 6); }
/** a full rest of 8 hours: the rest hours tick (one an 0.4 s), each hour heals; the Hour's chance of a wanderer */
function startRest() {
  if (campBlocked()) { msg('You may not rest with enemies near.'); return { ok: false, why: 'enemies' }; }
  if (S.camp) return { ok: false };
  S.camp = { hours: 0, t: 0, safe: isSafe(), on: true };
  sfx('rest'); ev('rest', {}); return { ok: true };
}
const isSafe = () => { const d = curF(); return (d.safe || []).some(([x, y]) => x === S.party.cx && y === S.party.cy); };
/** the rest's clock: an hour a 0.4 s; the hours heal; a wanderer may come; 8 hours refill the slots */
function restStep(dt) {
  const c = S.camp; if (!c) return;
  c.t += dt; if (c.t < .4) return; c.t = 0; c.hours++;
  for (const [m] of partyList()) if (m.state === 'ok') healMember(m, Math.max(1, Math.round(B.T.restHeal * (1 + B.MOD(m.stats.con)) * B.DIFF[S.diff].rest)));
  for (const [m] of partyList()) if (m.state === 'ok' && m.cls === 'C' && m.hp < m.max && m.prep[1].includes('mend') && slotLeft(m, 1) > 0) { const w = awake().filter(x => x.hp < x.max).sort((a, b) => a.hp / a.max - b.hp / b.max)[0]; if (w) { m.used[1]++; healMember(w, B.roll(S, 'combat', '1d8') + 1); } }
  S.stats.rests++; S.hoursRested = (S.hoursRested || 0) + 1;
  if (!c.safe && c.hours >= 1 && B.rnd(S, 'world') < B.T.rest / 100 * B.DIFF[S.diff].rest) { if (spawnWanderer()) { msg('You are awakened by something moving!'); sfx('wake'); S.camp = null; ev('campEnd', { interrupted: true }); return; } }
  if (c.hours >= 8) { for (const [m] of partyList()) { m.used = { 1: 0, 2: 0, 3: 0 }; m.layOnHands = 1; m.mendOnce = 1; if (m.state === 'down') { m.state = 'ok'; m.hp = 1; } } msg('The party is rested.'); S.camp = null; ev('campEnd', {}); return; }
  if (partyList().every(([m]) => m.hp >= m.max) && partyList().every(([m]) => slotsFull(m))) { S.camp = null; ev('campEnd', {}); }
}
const slotsFull = m => [1, 2, 3].every(l => slotLeft(m, l) >= slotsMax(m)[l] || slotsMax(m)[l] === 0);
/** a member's hunger: food runs down with play; a starving member loses HP */
function hungerStep(dt) {
  const rate = B.T.hunger * B.DIFF[S.diff].hunger;
  S.hungerT = (S.hungerT || 0) + dt * rate;
  if (S.hungerT >= 60) { S.hungerT -= 60; for (const [m] of partyList()) if (m.state === 'ok') { m.food = Math.max(0, m.food - 1); if (m.food === 25) msg(m.name + ' is hungry.'); if (m.food === 0) { msg(m.name + ' is starving!'); } } }
  for (const [m] of partyList()) if (m.state === 'ok' && m.food === 0) { m._starveT = (m._starveT || 0) + dt; if (m._starveT >= 30) { m._starveT = 0; hurtMember(m, 1, 'starve'); } }
}
/** eat at camp: each member below 60% takes from the smallest food items first */
function eatAtCamp() {
  const food = []; for (const [m] of partyList()) m.pack.forEach((it, i) => { if (it && B.ITEMS[it.id].k === 'food') food.push({ m, i, it, f: B.ITEMS[it.id].food }); });
  const fed = []; for (const [m] of partyList()) if (m.food < 60) {
    food.sort((a, b) => a.f - b.f);
    const pick = food.shift(); if (!pick) break;
    m.food = Math.min(100, m.food + pick.f); if (pick.it.n > 1) pick.it.n--; else pick.m.pack[pick.i] = null; fed.push(m.name);
  }
  sfx('eat'); msg(fed.length ? fed.join(', ') + ' eat.' : 'Nobody is hungry.'); return { ok: true, fed };
}
/* ---- progress: deeds, NPCs, the Journal's tally ---- */
/** a deed (a hidden special quest): +100 XP to each member, a jingle and a line */
function deed(id) {
  if (!id.startsWith('SQ')) { S.flags[id] = true; return; }
  if (S.deeds[id]) return;
  S.deeds[id] = true; addXpAll(100); sfx('deed'); ev('deed', { id }); msg('A hidden deed is done!');
}
/** an NPC joins if the party has room (Veil gives her ward if not); the NPC's stats and gear come from her record */
function joinNpc(id) {
  if (id === 'veil') setFlag('veilHelped', true);
  const st = S.npcState[id]; if (st === 'in' || st === 'gone') return { ok: false, why: st };
  const place = S.party.place.findIndex(x => x < 0);
  const data = NPCS[id]; if (!data) return { ok: false };
  if (place < 0) { if (id === 'veil') { S.flags.veilWard = true; const r = { item: mkItem('lidlessWard'), from: 'npc' }; if (!S.party.hand) S.party.hand = r; else pushPack(mkItem('lidlessWard')); msg('Veil gives you her Lidless Ward.'); } S.npcState[id] = 'gone'; return { ok: false, why: 'full' }; }
  const m = makeMember(data, data.lvl || 3); S.party.roster.push(m); S.party.place[place] = S.party.roster.length - 1; S.npcState[id] = 'in';
  sfx('npcJoin'); ev('npcJoin', { id }); msg(m.name + ' joins the party.');
  return { ok: true };
}
/** dismissing an NPC: she goes home, gone for good; her gear comes back to the party */
function dismiss(i) {
  const m = S.party.roster[i]; if (!m || !m.npc) return { ok: false };
  for (const it of Object.values(m.slots)) if (it) pushPack(it);
  m.pack.forEach(it => { if (it) pushPack(it); });
  S.party.place = S.party.place.map(x => x === i ? -1 : x);
  S.npcState[m.npc] = 'gone'; msg(m.name + ' goes home.'); return { ok: true };
}
/** the party's wipe: nobody awake is the game over (the view shows its screen) */
function gameOver() { if (S.over) return; S.over = 'lost'; sfx('gameOver'); ev('gameover', {}); }
