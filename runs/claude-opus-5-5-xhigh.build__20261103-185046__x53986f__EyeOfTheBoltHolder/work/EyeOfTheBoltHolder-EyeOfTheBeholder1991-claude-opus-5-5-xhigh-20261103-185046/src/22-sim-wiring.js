/* =====================================================================================
 * 22-sim-wiring: messages, hints, and the floors' wires: a trigger (when) runs actions (do), or fail ones. A designer
 * wires a floor in its data; this file is the whole language (CONTENT.md lists it).
 * ===================================================================================== */
/** a message in the log (a text id or plain text, with {vars}) */
function say(id, v, o = {}) {
  const text = B.TXT[id] !== undefined ? B.fill(B.TXT[id], v) : B.fill(id, v);
  if (o.rate) { const k = 'r_' + id; if ((S.party[k] || -99) > S.time - o.rate) return; S.party[k] = S.time; }
  S.log.push({ t: S.time, text, c: o.c || null }); if (S.log.length > 100) S.log.shift();
  ev('msg', { text, c: o.c || null });
}
B.say = say;
/** a first-time tip (Settings: Hints) */
function hint(id) {
  if (!B.opt.hints || S.hintsShown[id] || S.mode === 'demo') return;
  S.hintsShown[id] = true; ev('hint', { id });
}
B.hint = hint;
/** run the wires of the floor that a trigger matches */
function trigger(kind, d = {}) {
  const F = B.FLOORS[S.floor], fl = FL();
  (F.wires || []).forEach((w, i) => {
    const done = fl.flags['w' + i];
    if (done && w.once) return;
    const r = matchWire(w, kind, d, fl, i);
    if (r === 'do') { if (w.once) fl.flags['w' + i] = true; for (const a of w.do) act(a, d); }
    else if (r === 'undo') { for (const a of w.do) act(inverse(a), d); }
    else if (r === 'fail' && w.fail) for (const a of w.fail) act(a, d);
  });
}
B.trigger = trigger;
const inverse = a => a[0] === 'open' ? ['close', a[1]] : a[0] === 'close' ? ['open', a[1]] : a;
function matchWire(w, kind, d, fl, i) {
  const W = w.when;
  if (W.lever && kind === 'lever' && W.lever === d.id) return 'do';
  if (W.catch && kind === 'catch' && W.catch === d.id) return 'do';
  if (W.plate && kind === 'plate' && W.plate === d.id) return w.mode === 'hold' ? (d.down ? 'do' : 'undo') : d.down ? 'do' : null;
  if (W.plates && kind === 'plate' && W.plates.includes(d.id)) return W.plates.every(p => fl.plates[p]) ? 'do' : null;
  if (W.levers && kind === 'lever' && W.levers[d.id] !== undefined) {
    const mv = fl.flags['lm' + i] || (fl.flags['lm' + i] = {}); mv[d.id] = true;
    const ok = Object.entries(W.levers).every(([id, on]) => fl.feats[id].on === on);
    if (ok) return 'do';
    return Object.keys(W.levers).every(id => mv[id]) ? 'fail' : null;
  }
  if (W.buttons && kind === 'button' && W.buttons.includes(d.id)) {
    const b = fl.btn;
    if (b && b.id !== d.id && S.time - b.t <= B.T.buttonWin) { fl.btn = null; return 'do'; }
    fl.btn = { id: d.id, t: S.time, wire: i }; return null;
  }
  if (W.buttons && kind === 'buttonTimeout' && d.wire === i) { fl.btnFails++; return fl.btnFails >= (w.failAfter || 1) ? 'fail' : null; }
  if (W.alcove && kind === 'alcove' && W.alcove === d.id) {
    const it = d.item && IT(d.item.id);
    if (W.item && d.item && d.item.id === W.item) return 'do';
    if (W.kind && it && it.kind === W.kind) return 'do';
    return null;
  }
  if (W.alcovesFull && kind === 'alcove' && W.alcovesFull.includes(d.id)) return W.alcovesFull.every(a => fl.feats[a].items.some(x => x.id === 'tumblerGear')) ? 'do' : null;
  if (W.killed && kind === 'killed' && W.killed.some(id => id === d.id)) return W.killed.every(id => !fl.mons.some(m => m.id === id && m.hp > 0)) ? 'do' : null;
  if (W.flag && kind === 'flag' && W.flag === d.id) return 'do';
  if (W.sequence && kind === 'candle' && W.sequence.includes(d.id)) {
    fl.seq.push(d.id);
    const n = fl.seq.length, ok = fl.seq.every((id, j) => id === W.sequence[j]);
    if (!ok) { fl.seq = []; return 'fail'; }
    return n === W.sequence.length ? 'do' : null;
  }
  if (W.enter && kind === 'enter' && d.x === W.enter[0] && d.y === W.enter[1]) return 'do';
  if (W.enterArea && kind === 'enter') { const [x0, y0, x1, y1] = W.enterArea; if (d.x >= x0 && d.x <= x1 && d.y >= y0 && d.y <= y1) return 'do'; }
  return null;
}
/** an action from a wire, a story step or a cheat */
function act(a, d = {}) {
  const fl = FL(), X = IX(), [op, p1, p2, p3] = a;
  switch (op) {
    case 'open': case 'close': case 'toggle': {
      const dd = X.doors[p1]; if (!dd) break; const st = fl.doors[p1];
      st.want = op === 'open' ? 1 : op === 'close' ? 0 : (st.want ? 0 : 1); if (st.want) st.locked = false;
      ev('door', { id: p1, open: st.want, kind: dd.kind, x: dd.x, y: dd.y }); noise(dd.x, dd.y, 4); break;
    }
    case 'bridge': fl.pits[p1].bridged = true; ev('bridge', { id: p1 }); break;
    case 'pitOpen': fl.pits[p1].open = true; break;
    case 'teleporter': fl.tps[p1] = !!p2; break;
    case 'msg': say(p1, d.vars); break;
    case 'hint': hint(p1); break;
    case 'story': B.startTalk(p1); break;
    case 'bark': bark(p1); break;
    case 'give': {
      const it = mkItem(p1);
      if (Array.isArray(p2)) { addItem(fl, p2[0], p2[1], it); ev('appear', { x: p2[0], y: p2[1] }); } else if (fl.feats[p2]) fl.feats[p2].items.push(it);
      break;
    }
    case 'spawn': for (let k = 0; k < (p3 || 1); k++) { const m = spawnMon(fl, p1, p2[0], p2[1], {}); m.aware = true; m.st = 'hunt'; } break;
    case 'xp': for (const m of S.party.members) if (m.state === 'ok') B.gainXp(m, p1); break;
    case 'flag': S.flags[p1] = p2 === undefined ? true : p2; trigger('flag', { id: p1 }); break;
    case 'quest': S.quests[p1] = p2 || 'open'; break;
    case 'special': if (!S.special[p1]) { S.special[p1] = true; for (const m of S.party.members) if (m.state !== 'dead') B.gainXp(m, 100, true); say('m_deed', null, { c: '#ffd36a' }); ev('sting', { id: 'deed' }); S.flags[p1] = true; trigger('flag', { id: p1 }); } break;
    case 'secret': if (!S.secrets[p1]) { S.secrets[p1] = true; S.stats.secrets++; for (const m of S.party.members) if (m.state !== 'dead') B.gainXp(m, 25, true); ev('sting', { id: 'secret' }); } break;
    case 'sfx': ev('sfx', { id: p1 }); break;
    case 'music': ev('music', { id: p1 }); break;
    case 'shake': ev('shake', { n: p1 }); break;
    case 'return': if (d.feat && d.item) { const its = fl.feats[d.feat].items, j = its.indexOf(d.item); if (j >= 0) its.splice(j, 1); S.party.hand = d.item; ev('hand', {}); } break;
    case 'take': if (d.feat && d.item) { const its = fl.feats[d.feat].items, j = its.indexOf(d.item); if (j >= 0) its.splice(j, 1); } break;
    case 'candlesOut': for (const ft of X.featList) if (ft.kind === 'candle') fl.feats[ft.id].lit = false; fl.seq = []; ev('sfx', { id: 'gutter' }); break;
    case 'clock': fl.feats[p1].running = true; ev('sfx', { id: 'chime' }); break;
    case 'checkpoint': if (S.race) B.raceCheckpoint(p1); break;
    case 'join': B.joinNpc(p1); break;
    case 'npcGive': { const it = mkItem(p2); if (!B.stow(it)) addItem(fl, S.party.cx, S.party.cy, it); say('m_take', { item: B.art(B.itemName(it)) }); break; }
    case 'npcLeave': { const n = fl.npcs[p1]; if (n) n.state = 'gone'; S.flags['left_' + p1] = true; ev('npcGone', { id: p1 }); break; }
    case 'npcShow': { const n = fl.npcs[p1]; if (n) n.state = 'here'; break; }
    case 'npcHide': { const n = fl.npcs[p1]; if (n) n.state = 'hidden'; break; }
    case 'npcGone': { const n = fl.npcs[p1]; if (n) n.state = 'gone'; ev('npcGone', { id: p1 }); break; }
    default: throw new Error('unknown action ' + op);
  }
}
B.act = act;
/** a short line that does not stop play */
function bark(id) { const b = B.BARKS[id]; if (!b) return; ev('bark', { who: b[0], text: b[1], id }); S.log.push({ t: S.time, text: (B.PEOPLE[b[0]] ? B.PEOPLE[b[0]].name + ': ' : '') + b[1], c: '#c8b8ff' }); }
B.bark = bark;
/** a noise at a cell wakes and alerts monsters within r cells (hounds hear further) */
function noise(x, y, r = 4) {
  for (const m of FL().mons) {
    if (m.hp <= 0) continue; const T = B.MON(m.type), rr = T.hear ? Math.max(r, T.hear) : r;
    if (manhattan(m.cx, m.cy, x, y) <= rr) { if (m.st === 'asleep' && !m.status.sleep) { m.st = 'hunt'; ev('wake', { uid: m.uid }); } if (m.st !== 'asleep') { m.aware = true; m.lost = 0; } }
  }
}
B.noise = noise;
/* ---- the conversations: S.talk = { node, i, line } while one runs (the world waits) ---- */
B.startTalk = id => {
  if (!B.STORY[id]) throw new Error('no story ' + id);
  S.talk = { node: id, i: -1, line: null, choices: null };
  advanceTalk();
};
function storyCond(c) { if (c === 'full') return S.party.members.length >= 6; return !!S.flags[c]; }
function advanceTalk() {
  const T = S.talk;
  for (let guard = 0; guard < 50; guard++) {
    T.i++;
    const steps = B.STORY[T.node], st = steps[T.i];
    if (!st) { S.talk = null; ev('talkEnd', {}); return; }
    if (Array.isArray(st)) { T.line = { who: st[0], text: st[1] }; T.choices = null; ev('line', { who: st[0], text: st[1] }); S.log.push({ t: S.time, text: (B.PEOPLE[st[0]] ? B.PEOPLE[st[0]].name : st[0]) + ': ' + st[1], c: '#e8dcc0' }); return; }
    if (st.do) { for (const a of st.do) act(a); if (!S.talk) return; continue; }
    if (st.goto) { if (!st.if || storyCond(st.if)) { T.node = st.goto; T.i = -1; } continue; }
    if (st.choices) { T.choices = st.choices.map(c => c[0]); T.cnodes = st.choices.map(c => c[1]); return; }
  }
}
B.talkNext = () => { if (S.talk && !S.talk.choices) advanceTalk(); };
B.talkChoose = i => { const T = S.talk; if (!T || !T.choices) return; const n = T.cnodes[clamp(i, 0, T.cnodes.length - 1)]; S.log.push({ t: S.time, text: '> ' + T.choices[i], c: '#ffd36a' }); T.node = n; T.i = -1; T.choices = null; advanceTalk(); };
