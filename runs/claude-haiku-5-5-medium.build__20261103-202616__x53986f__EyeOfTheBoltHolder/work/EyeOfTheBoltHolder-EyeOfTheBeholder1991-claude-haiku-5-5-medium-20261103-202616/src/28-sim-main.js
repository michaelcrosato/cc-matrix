/* ===== 28 sim · the step, the commands, saves, cheats (PLAN §3.5, §3.6, §8) =====
 * B.sim is the sim's whole interface: newGame / newRace, update(dt) (a fixed step: events come back), cmd(c) (one
 * command, its result), save / load (JSON, the state), hash, snapshot. The view, the bot and the tests only use these. */
B.sim = {
  newGame(o) { return newGame(o); },
  newRace(o) { return newRace(o); },
  get S() { return S; },
  /** one fixed step; cheats and the menus' time scale are the caller's */
  update(dt) {
    if (S.over || S.ended) return B.sim.take();
    S.time += dt; S.play += dt;
    if (S.race && !S.race.done) S.race.t += dt;
    if (S.party.busyT > 0) { S.party.busyT -= dt; if (S.party.busyT <= 0) S.party.busyT = 0; }
    for (const [id, lk] of Object.entries(S.boss ? S.boss.locks : {})) if (lk.busy > 0) { /* ticks in bossStep */ }
    if (S.party.tween) { S.party.tween.t += dt; if (S.party.tween.t >= S.party.tween.dur) finishTween(); }
    if (S.party.tween && S.party.tween.k === 'step') { /* the view reads the tween */ }
    // time passing: the statuses, food (not in a race), the camp's clock
    statusTick(dt);
    if (!S.race) hungerStep(dt);
    if (S.camp) restStep(dt);
    if (!S.cheats || !S.cheats.freeze) monstersStep(dt);
    if (S.floor === 'f4') bossStep(dt);
    stepProjectiles(dt);
    tickHints(dt);
    if (S.party.tween == null) reveal();
    settle();
    if (S.race) raceSettle();
    return B.sim.take();
  },
  /** the events since the last take: the step's and the commands' (sent to the view, the audio, the HUD) */
  take() { const out = S.events; S.events = []; return out; },
  /** one command: { c, ... } (the forms are in tools/CONTENT.md and the commands below). Returns { ok, why, ... } */
  cmd(c) { return runCmd(c); },
  /** the save's JSON (no events) */
  save() { return cloneState(S); },
  /** load a save (the state as saved; the events cleared) */
  load(data) { S = JSON.parse(JSON.stringify(data)); S.events = []; S.proj = S.proj || []; return S; },
  hash() { return B.hash(S); },
  /** the state the Journal and the tests read */
  snapshot() {
    const p = S.party, f = curFS(), d = curF();
    return { floor: S.floor, x: p.cx, y: p.cy, dir: p.dir, time: +S.time.toFixed(2), state: S.over || (S.won ? 'won' : 'play'),
      party: partyList().map(([m, pl]) => ({ name: m.name, place: pl, hp: m.hp, max: m.max, lvl: m.lvl, state: m.state, food: Math.round(m.food), status: Object.keys(m.status), main: m.slots.main && m.slots.main.id, off: m.slots.off && m.slots.off.id })),
      hand: p.hand ? p.hand.item.id : null, camp: !!S.camp, flags: S.flags, deeds: S.deeds, secrets: S.secrets, notes: S.notes.map(n => n.id),
      gates: Object.fromEntries(Object.entries(f.gates).map(([k, v]) => [k, v.open])), doors: Object.fromEntries(Object.entries(f.doors).map(([k, v]) => [k, v.open])),
      levers: Object.fromEntries(Object.entries(f.levers).map(([k, v]) => [k, v.on])), plates: Object.fromEntries(Object.entries(f.plates).map(([k, v]) => [k, !!v.down])),
      monsters: monsOn().filter(m => m.hp > 0).length, kills: S.stats.kills, log: S.log.slice(-3).map(l => l.text), race: S.race ? { label: S.race.label, score: S.race.score, done: S.race.done, time: S.race.time } : null,
      npcs: S.npcState, boss: S.boss ? { phase: S.boss.phase, bolts: S.boss.bolts, locks: Object.fromEntries(Object.entries(S.boss.locks).map(([k, v]) => [k, v.turned])), hp: (monsOn().find(m => m.type === 'boltholder') || {}).hp } : null };
  },
  /** dev and tests: move the party, give an item, set a cheat */
  warp(floor, x, y, dir) { S.floor = floor; S.party.cx = x; S.party.cy = y; S.party.dir = dir; S.party.tween = null; reveal(); settle(); },
  give(id, n) { return pushPack(mkItem(id, n)); },
  cheat(name, v) { S.cheats = S.cheats || {}; S.cheats[name] = v; },
  events() { return S.events; }
};
/** the step: the race's floor plates and the race's checkpoints */
function raceSettle() {
  const f = curFS();
  if (S.race && f.plates && f.plates.RP && f.plates.RP.down && !S.race.cps.plate) raceCheckpoint('Plate pressed');
  if (S.race && f.doors && f.doors.RL && f.doors.RL.open && !S.race.cps.door) raceCheckpoint('Door open');
  if (S.race && !S.race.cps.room) { const room = monsOn().filter(m => m.x0 !== undefined || (m.cx >= 1 && m.cx <= 4 && m.cy >= 1 && m.cy <= 5)); if (room.length && room.every(m => m.hp <= 0)) raceCheckpoint('Rat Room cleared'); }
}
/** the command dispatcher: each form in one place */
function runCmd(c) {
  const p = S.party;
  if (S.over) return { ok: false, why: 'over' };
  switch (c.c) {
    case 'move': if (p.busyT > 0 || S.camp) return { ok: false, why: 'busy' }; return moveCmd(c.d);
    case 'turn': if (p.busyT > 0 || S.camp) return { ok: false, why: 'busy' }; return turnCmd(c.s);
    case 'use': if (p.busyT > 0) return { ok: false, why: 'busy' }; return doUse();
    case 'putDown': return putDown();
    case 'throw': return throwHand();
    case 'strike': if (p.busyT > 0) return { ok: false, why: 'busy' }; return { ok: partyStrike() };
    case 'hand': { const m = S.party.roster[c.m]; return handAct(m, c.h || 'main'); }
    case 'cast': { const m = S.party.roster[c.m]; return castSpell(m, c.spell, c.target === undefined ? null : c.target); }
    case 'inv': return invCmd(c);
    case 'select': S.party.sel = c.m; return { ok: true };
    case 'camp': return campCmd(c);
    case 'npc': return c.join ? joinNpc(c.id) : { ok: dismiss(S.party.roster.findIndex(m => m.npc === c.id)).ok };
    case 'examine': return examineFront();
    case 'raise': { const m = S.party.roster[c.m]; if (m) raiseMember(m, 1); return { ok: !!m }; }
    case 'story': { if (c.set) setFlag(c.set, c.value === undefined ? true : c.value); return { ok: true }; }
    default: throw new Error('no command ' + c.c);
  }
}
/** the ✕ action: a Hand's item is placed or stowed; otherwise the thing in front acts, or the floor's item is taken */
function doUse() {
  const p = S.party, f = facing();
  if (p.hand) {
    if (f && f.kind === 'feature' && (f.w.k === 'alcove' || f.w.k === 'clock')) return alcoveUse(f.w);
    if (f && f.kind === 'cell' && (f.c === 'L' || f.c === 'K' || f.c === 'U')) { const r = f.c === 'U' ? undergateUse() : useCell(f); return r; }
    const it = p.hand.item; p.hand = null; if (pushPack(it)) { sfx('take'); return { ok: true }; }
    p.hand = { item: it, from: 'pack' }; msg('Your packs are full.'); return { ok: false, why: 'full' };
  }
  if (f) {
    if (f.kind === 'feature') {
      const r = useFeature(f.w);
      if (r.boss) { if (r.boss === 'GL3' && S.floors.f4.flags.stairLight) { S.ended = 'victory'; ev('ending', {}); return { ok: true }; } if (bossState().started && !S.boss.dead) return turnLock(r.boss); return { ok: false }; }
      if (r.ok) return r;
    } else { const r = useCell(f); if (r.ok) return r; }
  }
  return takeFloor();
}
/** the floor item in front (if the cell is open and free of monsters), else the party's own cell */
function takeFloor() {
  const p = S.party, [fx, fy] = frontCell();
  if (passable(fx, fy, 'party') && !monAt(fx, fy) && topItem(fx, fy)) return takeFrom({ where: 'floor', x: fx, y: fy }).ok ? { ok: true } : { ok: false };
  if (topItem(p.cx, p.cy)) return takeFrom({ where: 'floor', x: p.cx, y: p.cy }).ok ? { ok: true } : { ok: false };
  msg('There is nothing here.'); return { ok: false, why: 'nothing' };
}
/** the Hand's item stowed: the selected member's pack first */
function stowHand() { const p = S.party; if (!p.hand) return { ok: false }; if (pushPack(p.hand.item)) { p.hand = null; return { ok: true }; } msg('Your packs are full.'); return { ok: false }; }
/** the examine: what is in front, in the source's plain voice */
function examineFront() {
  const p = S.party, [fx, fy] = frontCell(), m = monAt(fx, fy), it = topItem(fx, fy), w = faced(), f = facing();
  if (m) msg('The ' + B.MONS[m.type].name + (m.hp < m.max * .5 ? ' looks badly hurt.' : ' waits.'));
  else if (w) msg(w.text || 'Nothing to say about it.');
  else if (f && f.kind === 'cell') msg(f.c === '+' ? 'A wooden door.' : f.c === '=' ? 'A heavy gate.' : 'A lock.');
  else if (it) msg(B.ITEMS[it.id].name + ' lies here. ' + (B.ITEMS[it.id].desc || ''));
  else msg('A plain stone floor.');
  return { ok: true };
}
/** the inventory: take, place, use or drop; a slot or pack location names the member by roster index */
function invCmd(c) {
  const at = loc => loc && loc.where === 'slot' ? { where: 'slot', m: S.party.roster[loc.m], slot: loc.slot } : loc && loc.where === 'pack' ? { where: 'pack', m: S.party.roster[loc.m], i: loc.i } : loc;
  switch (c.op) {
    case 'take': return takeFrom(at(c.from));
    case 'place': return placeInto(at(c.to));
    case 'use': return useItemRef(S.party.roster[c.from.m], at(c.from));
    case 'drop': return putDown();
    case 'stow': return stowHand();
    case 'equip': { const from = at(c.from); if (!takeFrom(from).ok) return { ok: false }; const m = S.party.roster[c.m]; const slot = slotFor(S.party.hand.item, m); if (!slot) { stowHand(); return { ok: false }; } return placeInto({ where: 'slot', m, slot }); }
    case 'unequip': { const m = S.party.roster[c.m]; return takeFrom({ where: 'slot', m, slot: c.slot }); }
    default: return { ok: false };
  }
}
/** the camp's commands */
function campCmd(c) {
  switch (c.op) {
    case 'rest': return startRest();
    case 'stopRest': if (S.camp) { S.camp = null; ev('campEnd', {}); } return { ok: true };
    case 'memorize': return memorize(S.party.roster[c.m], c.spell);
    case 'forget': return forget(S.party.roster[c.m], c.spell);
    case 'scribe': return scribe(S.party.roster[c.m], c.i);
    case 'eat': return eatAtCamp();
    case 'swapRows': { const a = S.party.place[c.a], b = S.party.place[c.b]; S.party.place[c.a] = b; S.party.place[c.b] = a; return { ok: true }; }
    case 'pray': return memorize(S.party.roster[c.m], c.spell);
    default: return { ok: false };
  }
}
/** the cheats: read where the sim asks (god, cooldowns, hunger, one-hit, noclip) */
const cheat = k => !!(S && S.cheats && S.cheats[k]);
