/* ===== 22 sim · wiring: triggers and actions (PLAN §4.2) =====
 * A wire: { on: trigger, mode: 'toggle' | 'hold' | 'latch', once, do: actions, fail: actions, failAfter, clatter, hint }.
 * A wire runs when its trigger fires. A 'hold' wire runs its actions when the plate goes down, and their reverse when it
 * comes up. Fired wires with once are kept per floor. */
function wireFired(f, i) { f.fired = f.fired || {}; return !!f.fired[i]; }
function markFired(f, i) { f.fired = f.fired || {}; f.fired[i] = true; }
/** the wires of the current floor that a trigger matches; each runs once if its once is set */
function wireFire(kind, id, extra = {}) {
  const d = curF(), f = curFS(); if (!d.wires) return;
  d.wires.forEach((w, i) => {
    const on = w.on; let hit = false;
    if (kind === 'lever' && on.lever === id) hit = true;
    else if (kind === 'catch' && on.catch === id) hit = true;
    else if (kind === 'enter' && on.enter && on.enter[0] === id[0] && on.enter[1] === id[1]) hit = true;
    else if (kind === 'enterArea' && on.enterArea === id) hit = true;
    else if (kind === 'alcove' && on.alcove === id && (!on.accepts || (extra.item && fitsAlcove({ accepts: on.accepts }, extra.item)))) hit = true;
    else if (kind === 'sequence' && on.sequence) hit = true;
    else if (kind === 'undergate' && on.undergate === id) hit = true;
    else if (kind === 'fall' && on.fall === id) hit = true;
    else if (kind === 'seen' && on.seen === id) hit = true;
    else if (kind === 'flag' && on.flag === id && (on.value === undefined || on.value === extra.value)) hit = true;
    else if (kind === 'loops' && on.loops === extra.n && on.at && on.at[0] === id[0] && on.at[1] === id[1]) hit = true;
    else if (kind === 'full' && on.full) hit = on.full.every(a => (f.alcoves[a] || []).length > 0);
    else if (kind === 'killed' && on.killed) hit = on.killed.every(n => monsOn().some(m => m.named === n && m.hp <= 0) || !monsOn().some(m => m.named === n));
    if (kind === 'button' && on.buttons && on.buttons.includes(id)) { buttonWire(i, w); return; }
    if (kind === 'plate' && on.plate === id && !w.hold) { /* plate wires run from firePlate */ return; }
    if (!hit) return;
    if (w.once && wireFired(f, i)) return;
    if (on.killed && !on.killed.every(n => monsOn().some(m => m.named === n && m.hp <= 0))) return;
    if (on.full && !on.full.every(a => (f.alcoves[a] || []).length > 0)) return;
    if (on.seen && !(monsOn().some(m => m.named === on.seen && m.aware))) return;
    markFired(f, i); runActs(w.do || [], w, i);
  });
  if (kind === 'lever') checkLevers(id);
}
/** the button pair: both pressed within the window opens; a press that does not pair counts as a failed try */
function buttonWire(i, w) {
  const f = curFS(), win = B.T.buttonWin, now = S.time; f.buttons = f.buttons || {};
  const ids = w.on.buttons, times = ids.map(b => f.buttons[b] === undefined ? -99 : f.buttons[b]);
  if (wireFired(f, i) && w.mode !== 'toggle') return;
  if (times.every(t => now - t <= win)) { markFired(f, i); msg('Both buttons click. Something heavy shifts.'); runActs(w.do || [], w, i); return; }
  f.btnFails = (f.btnFails || 0) + 1;
  if (w.fail && f.btnFails >= (w.failAfter || 2)) { f.btnFails = -999; runActs(w.fail, w, i); }
}
/** a plate went down or up: its wires; a hold wire reverses its actions on release */
function firePlate(pk, pl) {
  const d = curF(), f = curFS();
  d.wires.forEach((w, i) => {
    const on = w.on;
    if (on.plate === pk) {
      if (pl.down) { if (w.once && wireFired(f, i)) return; markFired(f, i); runActs(w.do || [], w, i); }
      else if (w.mode === 'hold') { runActs(reverseActs(w.do || []), w, i); }
    }
    if (on.plates && on.plates.includes(pk) && on.all) {
      if (on.plates.every(p => f.plates[p] && f.plates[p].down)) { if (w.once && wireFired(f, i)) return; markFired(f, i); runActs(w.do || [], w, i); }
    }
  });
  if (d.wires.some(w => w.on.plate === pk && w.hint)) plateHint(pk);
}
/** the plate hint: a plate someone has stood on (or beside) for its seconds */
function plateHint(pk) { /* hints are timed in update(); nothing to do on the edge */ }
/** the reverse of a hold's actions (open becomes close) */
function reverseActs(list) { return list.map(a => a[0] === 'open' ? ['close', a[1]] : a[0] === 'close' ? ['open', a[1]] : null).filter(Boolean); }
/** the lever combination: LA down, LB up, LC down opens; a wrong set after all three have moved clatters */
function checkLevers(changed) {
  const d = curF(), f = curFS(); if (!d.wires) return;
  d.wires.forEach((w, i) => {
    if (!w.on.levers) return;
    const want = w.on.levers, keys = Object.keys(want);
    const match = keys.every(k => !!f.levers[k] && f.levers[k].on === want[k]);
    if (match && !wireFired(f, i)) { markFired(f, i); runActs(w.do || [], w, i); return; }
    if (!match && w.clatter && keys.every(k => f.leverLog.includes(k))) { f.leverLog = []; sfx('clatter'); msg('The tumblers clatter. The set is wrong.'); }
  });
  if (changed && f.leverLog) { if (!f.leverLog.includes(changed)) f.leverLog.push(changed); }
}
/** runs a wire's actions, in order */
function runActs(list, w, i) {
  for (const a of list) doAct(a, w);
}
function setOpen(id, v) {
  const f = curFS();
  if (f.gates[id]) { f.gates[id].open = v; ev('gate', { id, open: v }); sfx(v ? 'gate' : 'gate'); }
  else if (f.doors[id]) { f.doors[id].open = v; ev('door', { id, open: v }); sfx('door'); }
  else return;
  settle();
}
/** one action */
function doAct(a, w) {
  const f = curFS();
  switch (a[0]) {
    case 'open': setOpen(a[1], true); break;
    case 'close': setOpen(a[1], false); break;
    case 'toggle': { const g = f.gates[a[1]]; if (g) setOpen(a[1], !g.open); else if (f.doors[a[1]]) setOpen(a[1], !f.doors[a[1]].open); break; }
    case 'bridge': f.pits[a[1]] = Object.assign(f.pits[a[1]] || {}, { bridged: true }); ev('bridge', { id: a[1] }); sfx('grind'); break;
    case 'teleporter': if (f.teles[a[1]]) f.teles[a[1]].on = a[2]; break;
    case 'msg': msg(a[1]); break;
    case 'hint': hint(a[1]); break;
    case 'story': ev('story', { id: a[1] }); break;
    case 'bark': ev('bark', { id: a[1] }); break;
    case 'give': giveTo(a[1], a[2]); break;
    case 'spawn': spawnGroup(a[1], a[2], a[3] || 1); break;
    case 'xp': if (a[2] === 'secret') { S.secrets++; S.stats.secrets = S.secrets; sfx('secret'); } addXpAll(a[1]); break;
    case 'special': deed(a[1]); break;
    case 'flag': setFlag(a[1], a[2] === undefined ? true : a[2]); break;
    case 'sfx': sfx(a[1]); break;
    case 'shake': ev('shake', { n: a[1] }); break;
    case 'return': { const list = f.alcoves[w.on.alcove] || []; if (list.length) { const it = list.pop(); if (!S.party.hand) S.party.hand = { item: it, from: 'alcove' }; else pushPack(it); } break; }
    case 'bossIntro': bossState().started = true; ev('bossIntro', {}); break;
    case 'gutter': gutter(); break;
    case 'checkpoint': raceCheckpoint(a[1]); break;
    case 'undergate': break;
    case 'loop': break;
    default: throw new Error('no wire action ' + a[0]);
  }
}
/** a flag: named story and quest state, kept in the save; setting one fires its wires */
function setFlag(name, v) { S.flags[name] = v; wireFire('flag', name, { value: v }); if (name === 'veilHelped' && v) { wireFire('flag', 'veilHelped', { value: true }); } }
/** a monster group spawns at a cell, on the current floor */
function spawnGroup(type, at, n) {
  for (let i = 0; i < n; i++) monsOn().push(mkMon(type, at[0], at[1], S.floor, {}));
  ev('spawn', { type, at });
}
/** the timed hints: a plate hint after its seconds on it */
function tickHints(dt) {
  const d = curF(); if (!d.wires) return;
  const p = S.party;
  d.wires.forEach(w => {
    if (!w.hint) return;
    const [pk, secs, text] = w.hint, c = d.ids[pk];
    const near = c && cheb(p.cx, p.cy, c[0], c[1]) <= 1;
    S.tmp = S.tmp || {};
    const k = 'hint:' + S.floor + ':' + pk;
    if (near) { S.tmp[k] = (S.tmp[k] || 0) + dt; if (S.tmp[k] >= secs) hint(text, k); }
    else S.tmp[k] = 0;
  });
}
