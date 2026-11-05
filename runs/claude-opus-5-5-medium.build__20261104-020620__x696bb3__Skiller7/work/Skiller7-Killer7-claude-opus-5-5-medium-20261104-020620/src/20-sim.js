/* SKILLER7 — the sim: one state object (S7.G), the walker on the rails, the modes, personas and switching, Red and
 * Rime, items, gates, talk and beats, Room 7, freezing and the Sweep's rescue, saves. It never touches the DOM or 3D. */
const ORDER = ['ansel', 'dagny', 'ignaz', 'rurik', 'kasimir', 'mireille', 'brigid'];
S7.ORDER = ORDER;
let G = null;            // the state (S7.G)
const W = { area: null, grid: null, rails: null };   // the loaded area (S7.W)
S7.W = W;
const AREA_CACHE = {};

function newState(o = {}) {
  const roster = {};
  for (const id of ORDER) { const P = S7.PERSONAS[id]; roster[id] = { hp: P.hp, max: P.hp, stats: { power: 0, speed: 0, crit: 0, steady: 0 }, frozen: false, statue: null, unlocked: ['ansel', 'dagny', 'ignaz', 'rurik'].includes(id) }; }
  return {
    v: 1, seed: o.seed || 7, difficulty: o.difficulty || 'Piste', time: 0, playtime: 0,
    area: null, mode: 'play', modeT: 0, cut: false, letterbox: 0,
    walker: { edge: null, s: 0, dir: 1, v: 0, node: null, arrived: null, turnT: 0, branch: 0, skiStop: false, air: 0, lastNode: null },
    persona: 'ignaz', last: 'dagny', roster, red: 60, rime: 0, items: {}, pins: [], dossier: [], exposures: [],
    gates: {}, waves: {}, spots: {}, flags: {}, visited: {}, seen: {}, tips: {},
    aim: { on: false, yaw: 0, pitch: 0, k: 0, recoil: 0, scope: false, sway: 0 },
    wpn: {}, cd: {}, scan: null, scanCd: 0, revealAll: 0, ringSel: null, switchT: 0, switchTo: null,
    enemies: [], proj: [], drops: [], fx: [], nextId: 1, statueHold: 0, gameoverT: 0,
    lastDoor: {}, r7from: null, boss: null, aval: null, echo: null,
    stats: newStats(), results: {}, target: 0, hints: 0, ending: null, cam: null
  };
}
const newStats = () => ({ time: 0, kills: 0, crits: 0, hits: 0, shots: 0, red: 0, frozen: 0, hints: 0 });
S7.newState = newState;

/* ---- areas ---- */
function loadArea(id) {
  if (AREA_CACHE[id]) return AREA_CACHE[id];
  const area = S7.AREAS[id]; if (!area) throw new Error('unknown area ' + id);
  const grid = new LevelGrid(area), rails = buildRails(area, grid);
  const spots = (area.spots || []).map(s => Object.assign({}, s, { pos: spotPos(rails, s) }));
  const targets = (area.targets || []).map(t => Object.assign({}, t, { pos: [t.at[0] * M, t.at[1] * M, (t.at[2] || 0) * M] }));
  return (AREA_CACHE[id] = { id, area, grid, rails, spots, targets });
}
S7.loadArea = loadArea;
function spotPos(R2, s) {
  if (s.node) { const n = R2.nodes[s.node]; if (!n) throw new Error(R2.area.id + ': spot ' + s.id + ' on unknown node ' + s.node); return [n.x, n.y, n.z]; }
  if (s.edge) { const e = R2.byId[s.edge]; if (!e) throw new Error(R2.area.id + ': spot ' + s.id + ' on unknown edge ' + s.edge); const p = edgePos(R2, e, (s.s ?? .5) * e.len); return [p.x, p.y, p.z]; }
  return [s.at[0] * M, s.at[1] * M, (s.at[2] || 0) * M];
}
const key = (k, area = G.area) => area + ':' + k;
const flag = f => !!(G && G.flags[f]);
const setFlag = (f, v = true) => { G.flags[f] = v; emit('flag', { flag: f, v }); };
S7.flag = flag; S7.setFlag = setFlag;

/** enter an area at a node (arriving stopped there) */
function enterArea(id, nodeId, o = {}) {
  const from = G.area, A = loadArea(id);
  Object.assign(W, { area: A.area, grid: A.grid, rails: A.rails, spots: A.spots, targets: A.targets, A });
  G.area = id; G.visited[id] = true;
  if (!o.keepEnemies) { G.enemies = []; G.proj = []; G.drops = []; }
  const n = A.rails.nodes[nodeId] || A.rails.nodes[A.area.start];
  placeAtNode(n.id, o.dir);
  G.aim.on = false; G.aval = null; G.scan = null;
  if (id !== 'room7') { G.lastDoor[id] = G.lastDoor[id] || null; }
  W.dir = director; director.cut();
  if (A.area.target !== undefined && id !== 'room7') G.target = A.area.target;
  emit('area', { from, to: id });
  if (A.area.onEnter && !o.silent) A.area.onEnter(G);
  if (!o.noAutosave && id !== 'room7') S7.autosave && S7.autosave('area');
  return A;
}
S7.enterArea = enterArea;
function placeAtNode(nodeId, dirHint) {
  const R2 = W.rails, n = R2.nodes[nodeId], wk = G.walker, es = R2.adj[nodeId].filter(edgeOpen);
  const e = es[0] || R2.adj[nodeId][0];
  wk.node = nodeId; wk.v = 0; wk.turnT = 0; wk.skiStop = false; wk.air = 0;
  if (e) { wk.edge = e.id; wk.s = e.a === nodeId ? 0 : e.len; wk.dir = e.a === nodeId ? 1 : -1; wk.arrived = null; }
  else { wk.edge = null; wk.s = 0; wk.dir = 1; }
  if (dirHint !== undefined) wk.face = dirHint;
  // the way back (to an exit or a door) counts as where we came from: the default goes on into the area
  const n0 = R2.nodes[nodeId], back = R2.adj[nodeId].find(x => { const o = x.a === nodeId ? x.B : x.A; return o.kind === 'exit' || o.kind === 'door' && o !== n0; });
  wk.arrived = back && R2.adj[nodeId].length > 1 ? back.id : null;
  wk.branch = 0; pickDefaultBranch();
  if (n0.go) { const i = branchesAt(nodeId).findIndex(x => x.id === n0.go); if (i >= 0) wk.branch = i; }
  wk.lastNode = nodeId;
}
S7.placeAtNode = placeAtNode;

/* ---- the walker ---- */
const curEdge = () => G.walker.edge ? W.rails.byId[G.walker.edge] : null;
function heroPos() {
  const wk = G.walker, e = curEdge();
  if (!e) { const n = W.rails.nodes[wk.node]; return { x: n.x, y: n.y, z: n.z, angle: 0 }; }
  const p = edgePos(W.rails, e, wk.s); if (wk.dir < 0) p.angle += Math.PI;
  return p;
}
S7.heroPos = heroPos;
/** the hero's facing for drawing (turning through 180 degrees during a quick turn) */
const heroFacing = () => { const p = heroPos(), wk = G.walker; return wk.turnT > 0 ? p.angle + Math.PI * (wk.turnT / .22) : (wk.face !== undefined && wk.node && wk.v === 0 && !curEdge() ? wk.face : p.angle); };
S7.heroFacing = heroFacing;
/** can the walker use this edge (not hidden; a one-way edge only from its start) */
function edgeOpen(e, fromNode) {
  if (e.hidden && !flag(e.hidden)) return false;
  if (e.closed && flag(e.closed)) return false;
  if (fromNode && e.oneWay && e.a !== fromNode) return false;
  if (e.onlyFor && G.persona !== e.onlyFor && !CHEATS.ghost) return false;
  return true;
}
/** the edges a walker standing at node n can take */
const branchesAt = n => W.rails.adj[n].filter(e => edgeOpen(e, n));
S7.branchesAt = branchesAt;
/** default highlight: straight on from the way we arrived (or the first) */
function pickDefaultBranch() {
  const wk = G.walker; if (!wk.node) return;
  const B = branchesAt(wk.node); if (!B.length) return;
  const n = W.rails.nodes[wk.node], arrive = wk.arrived ? W.rails.byId[wk.arrived] : null;
  let face = arrive ? (arrive.b === wk.node ? edgeHeading(arrive, wk.node, true) : edgeHeading(arrive, wk.node, true)) : null;
  if (face === null) { wk.branch = 0; return; }
  let best = 0, bd = 9;
  B.forEach((e, i) => { if (arrive && e.id === arrive.id && B.length > 1) return; const d = Math.abs(angDiff(face, edgeHeading(e, wk.node))); if (d < bd) { bd = d; best = i; } });
  wk.branch = best; void n;
}
/** the heading leaving node n along edge e (or, with arriving, the heading we had arriving at n) */
function edgeHeading(e, n, arriving) {
  const R2 = W.rails, atA = e.a === n, s0 = atA ? 0 : e.len, s1 = atA ? Math.min(e.len, 1.5 * M) : Math.max(0, e.len - 1.5 * M);
  const p0 = edgePos(R2, e, s0), p1 = edgePos(R2, e, s1), a = Math.atan2(p1.y - p0.y, p1.x - p0.x);
  return arriving ? a + Math.PI : a;
}
S7.edgeHeading = edgeHeading;
const speedOf = () => {
  const P = S7.PERSONAS[G.persona], st = G.roster[G.persona].stats;
  let v = T.walkSpeed * (P.speedK || 1) * (1 + .08 * st.speed);
  if (G.persona === 'dagny' && G.tuck) v *= 2;
  return v;
};
/** take an edge from the node the walker stands at (with its gate checked) */
function takeEdge(e) {
  const wk = G.walker, n = wk.node;
  if (!edgeOpen(e, n)) return false;
  if (e.gate && !gatePass(e.gate)) return false;
  if (e.kind === 'jump') {
    if (G.persona !== 'dagny' && !CHEATS.ghost) { refuse('TOO FAR TO JUMP.', 'gap'); return false; }
    wk.v = Math.max(wk.v, 200); emit('jump', {});
  }
  if (e.kind === 'lift') emit('lift', { on: true, edge: e.id });
  wk.edge = e.id; wk.s = e.a === n ? 0 : e.len; wk.dir = e.a === n ? 1 : -1; wk.node = null; wk.arrived = null; wk.skiStop = false;
  return true;
}
S7.takeEdge = takeEdge;
function refuse(text, hint) { emit('refuse', { text, hint }); S7.splash(text, 1.6); }

/** a step of the walker (play mode, not aiming unless a moving edge allows it) */
function walkerStep(dt, I) {
  const wk = G.walker, R2 = W.rails;
  if (wk.turnT > 0) { wk.turnT = Math.max(0, wk.turnT - dt); return; }
  if (wk.node) {   // stopped on a node
    wk.v = 0;
    const B = branchesAt(wk.node), n = R2.nodes[wk.node];
    if (I.turn && wk.arrived) { const back = R2.byId[wk.arrived]; if (back && edgeOpen(back, wk.node)) { const i = B.indexOf(back); if (i >= 0) { wk.branch = i; takeEdge(back); wk.turnT = .22; emit('turn', {}); return; } } }
    if (B.length >= 2) {
      if (I.branch >= 0 && I.branch < B.length) wk.branch = I.branch;
      if (I.left || I.right) wk.branch = (wk.branch + (I.right ? 1 : -1) + B.length) % B.length;
      else if (Math.hypot(I.stick[0], I.stick[1]) > .5 && !I.moveByStickOnly) {
        // the stick picks the branch nearest its screen angle
        const want = Math.atan2(I.stick[1], I.stick[0]); let best = -1, bd = 1.2;
        B.forEach((e, i) => { const sa = branchScreenAngle(e, wk.node); if (sa === null) return; const d = Math.abs(angDiff(want, sa)); if (d < bd) { bd = d; best = i; } });
        if (best >= 0) wk.branch = best;
      }
    } else wk.branch = 0;
    if (n.kind === 'exit' && n.open && !wk.exitDone && n.to) { wk.exitDone = true; tryExit(n); return; }
    // at a junction a held move waits a moment (time to pick a way); a fresh press goes at once
    if (B.length >= 3) { if (!I.move) wk.dwell = -1; else if (wk.dwell === undefined || wk.dwell === null) wk.dwell = 0; else if (wk.dwell >= 0) wk.dwell += 1 / 120; }
    const fresh = wk.dwell === -1 || wk.dwell === undefined || wk.dwell >= .4;
    const go = I.move && (B.length < 3 || fresh) || I.branch >= 0 && I.clickGo;
    if (go) wk.dwell = null;
    if (go && B.length) {
      const e = B[clamp(wk.branch, 0, B.length - 1)];
      if (B.length === 1 && wk.arrived && e.id === wk.arrived && n.kind !== 'start') return;   // a dead end: turn round to go back
      takeEdge(e);
    }
    return;
  }
  const e = curEdge(); if (!e) return;
  const L = e.len;
  if (e.kind === 'lift') { wk.v = (e.speed || (e.cabin ? 140 : 120)) * (G.flags.liftStop === e.id ? 0 : 1); }
  else if (e.kind === 'ski') { skiPhysics(dt, I, e); forkStep(e, I); }
  else if (e.kind === 'jump') { wk.air += dt; }
  else {
    if (I.turn && !e.oneWay) { wk.dir *= -1; wk.turnT = .22; wk.v = 0; emit('turn', {}); return; }
    const target = I.move ? speedOf() * (e.kind === 'stairs' ? .85 : 1) * (e.slow || 1) : 0;
    wk.v = approach(wk.v, target, (target > wk.v ? speedOf() / .18 : speedOf() / .12) * dt);
    // slow into a junction or a stop: arrive exactly on it
    const ahead = wk.dir > 0 ? L - wk.s : wk.s, endN = wk.dir > 0 ? e.b : e.a;
    if (stopsAt(endN, e) && ahead < 1.2 * M) wk.v = Math.min(wk.v, Math.max(28, ahead * 6));
  }
  let s = wk.s + wk.dir * wk.v * dt;
  const passed = []; for (const t of W.area.triggers || []) if (t.edge === e.id) passed.push(t);
  const s0 = wk.s; wk.s = clamp(s, 0, L);
  for (const t of passed) { const ts = (t.s ?? .5) * L; if ((s0 - ts) * (wk.s - ts) <= 0 && s0 !== wk.s) fireTrigger(t); }
  if (wk.dir > 0 ? s >= L : s <= 0) arrive(wk.dir > 0 ? e.b : e.a, e, Math.abs(s - wk.s));
}
/** a node stops the walker: a junction, a door, a dead end, any node with a kind of its own */
function stopsAt(nid, viaEdge) {
  const n = W.rails.nodes[nid], B = branchesAt(nid);
  if (viaEdge && viaEdge.kind === 'ski') { const out = B.filter(e => e.id !== viaEdge.id); if (out.length && out.every(e => e.kind === 'ski' || e.kind === 'jump') && !n.kind) return false; }
  return !!n.kind && n.kind !== 'pass' || B.length !== 2;
}
function arrive(nid, e, over) {
  const wk = G.walker, n = W.rails.nodes[nid];
  if (!G.seen[key('n:' + nid)]) G.seen[key('n:' + nid)] = true;
  G.seen[key('e:' + e.id)] = true;
  if (e.kind === 'lift') emit('lift', { on: false, edge: e.id });
  if (e.kind === 'jump') emit('land', { node: nid });
  for (const t of W.area.triggers || []) if (t.node === nid) fireTrigger(t);
  if (W.rails.nodes[nid] !== n || G.area !== W.area.id) return;   // (a trigger moved us)
  const B = branchesAt(nid), out = B.filter(x => x.id !== e.id);
  const keepGoing = !stopsAt(nid, e) && out.length >= 1;
  if (keepGoing) { wk.passed = nid; wk.passedAt = G.time; emit('pass', { node: nid }); }
  if (keepGoing && (e.kind === 'ski' || e.kind === 'jump') && out.length) {
    // a fork on the slope: the branch picked while moving (or straight on)
    const want = wk.forkIds && wk.forkIds[wk.forkPick ?? 0], pick = out.find(x => x.id === want) || out[0], v = wk.v; wk.fork = null; wk.forkIds = null;
    wk.node = nid; wk.arrived = e.id; if (takeEdge(pick)) { wk.v = v; wk.s = clamp(pick.a === nid ? over : pick.len - over, 0, pick.len); wk.forkPick = null; return; }
  } else if (keepGoing && out.length === 1 && edgeOpen(out[0], nid) && (!out[0].gate || gateOpen(out[0].gate))) {
    const v = wk.v, nx = out[0]; wk.node = nid; wk.arrived = e.id;
    if (takeEdge(nx)) { wk.v = v; wk.s = clamp(nx.a === nid ? over : nx.len - over, 0, nx.len); return; }
  }
  wk.node = nid; wk.arrived = e.id; wk.v = 0; wk.exitDone = false; wk.lastNode = nid; wk.dwell = 0;
  pickDefaultBranch();
  if (B.length >= 3) emit('junction', { node: nid, options: B.length });
  if (n.kind === 'exit' && n.open) { wk.exitDone = true; tryExit(n); }
  if (n.kind === 'end' && n.onArrive) n.onArrive(G);
}
/** the branch's angle on screen (radians, x right, y down) through the director's pose */
function branchScreenAngle(e, nid) {
  const n = W.rails.nodes[nid], atA = e.a === nid, p = edgePos(W.rails, e, atA ? Math.min(e.len, 1.5 * M) : Math.max(0, e.len - 1.5 * M));
  const a = director.project([n.x, n.y, n.z + 16]), b = director.project([p.x, p.y, p.z + 16]);
  if (!a || !b) return null; return Math.atan2(b[1] - a[1], (b[0] - a[0]) * 16 / 9);
}
S7.branchScreenAngle = branchScreenAngle;

/** a fork on the slope ahead: markers 2.5 s before it; left / right (or the stick, or a click) pick a branch */
function forkStep(e, I) {
  const wk = G.walker, nid = wk.dir > 0 ? e.b : e.a, ahead = wk.dir > 0 ? e.len - wk.s : wk.s;
  const out = branchesAt(nid).filter(x => x.id !== e.id && x.a === nid);
  if (out.length < 2 || ahead > Math.max(2.5 * wk.v, 6 * M)) { wk.fork = null; return; }
  if (!wk.fork || wk.fork.node !== nid) { let best = 0, bd = 9; const h = edgeHeading(e, nid, true); out.forEach((x, i) => { const d = Math.abs(angDiff(h, edgeHeading(x, nid))); if (d < bd) { bd = d; best = i; } }); wk.fork = { node: nid, options: out.map(x => x.id), pick: best }; }
  const F = wk.fork;
  if (I.left) F.pick = (F.pick + out.length - 1) % out.length; if (I.right) F.pick = (F.pick + 1) % out.length;
  if (I.branch >= 0 && I.branch < out.length) F.pick = I.branch;
  else if (Math.abs(I.stick[0]) > .6) { const want = I.stick[0] > 0 ? 1 : -1; let best = F.pick, bv = -9; out.forEach((x, i) => { const sa = branchScreenAngle(x, nid); if (sa === null) return; const v = Math.cos(sa) * want; if (v > bv) { bv = v; best = i; } }); F.pick = best; }
  wk.forkPick = F.pick; wk.forkIds = F.options;
}
S7.forkStep = forkStep;
/* ---- skiing (§7.1): gravity along the slope, drag, a hockey stop, tuck ---- */
function skiPhysics(dt, I, e) {
  const wk = G.walker, p0 = edgePos(W.rails, e, wk.s), p1 = edgePos(W.rails, e, clamp(wk.s + 8, 0, e.len)), slope = -(p1.z - p0.z) / Math.max(1, Math.hypot(p1.x - p0.x, p1.y - p0.y));
  if (I.turn && wk.v > 5) { wk.skiStop = true; emit('hockey', {}); }
  if (wk.skiStop) { wk.v = Math.max(0, wk.v - 600 * dt); if (I.move && wk.v === 0 && !G.aim.on) wk.skiStop = false; if (wk.skiStop) return; }
  const tuck = I.move, dagnyTuck = G.persona === 'dagny' && G.tuck, k = tuck ? .0006 : .0019;
  const top = dagnyTuck ? 260 : T.skiTop * (tuck ? 1 : .85);
  wk.v += (520 * slope - k * wk.v * wk.v - 6) * dt;
  if (tuck && wk.v < 60) wk.v += 90 * dt;   // (a skate to push off)
  wk.v = clamp(wk.v, 25, top);
  wk.tucking = tuck;
}

/* ---- gates (§7.13) ---- */
const gateDef = id => (W.area.gates || {})[id];
const gateOpen = id => !!G.gates[key(id)] || CHEATS.ghost;
S7.gateOpen = gateOpen;
function openGate(id, area = G.area) { if (G.gates[key(id, area)]) return; G.gates[key(id, area)] = true; const g = (S7.AREAS[area].gates || {})[id]; emit('gate', { gate: id, ok: true, area }); if (g && g.flag) setFlag(g.flag); if (g && g.onOpen) g.onOpen(G); }
S7.openGate = openGate;
/** try to pass a gate on the way in: true if it lets us through (perhaps opening it now) */
function gatePass(id) {
  if (gateOpen(id)) return true;
  const g = gateDef(id); if (!g) return true;
  if (g.kind === 'patrol') { if (G.persona === 'ansel') { openGate(id); S7.splash('PATROL.', 1); return true; } refuse(g.line || 'Patrol only. You are not patrol.', 'patrol'); return false; }
  if (g.kind === 'flag') { if (flag(g.flag)) { openGate(id); return true; } refuse(g.line || 'It will not open.', g.hint); return false; }
  if (g.kind === 'key') { if (G.items[g.item]) { openGate(id); S7.splash('UNLOCKED.', 1); return true; } refuse(g.line || 'Locked.', g.hint); return false; }
  refuse(g.line || 'The way is shut.', g.hint);
  return false;
}
/** interact with a gate standing beside it: buyouts, ice locks, delegate gates, keys */
function gateInteract(id) {
  const g = gateDef(id); if (!g || gateOpen(id)) return;
  if (g.kind === 'buyout') {
    if (G.persona !== 'rurik') { say([[G.persona, g.line || 'Members only. Membership is a matter of means.']]); return; }
    say([['rurik', 'Pay ' + g.price + ' Red?']], { choices: ['PAY ' + g.price + ' RED', 'LEAVE'], onChoice: i => { if (i === 0) { if (G.red >= g.price || CHEATS.infRed) { spendRed(g.price); openGate(id); emit('buyout', {}); S7.splash('PAID IN FULL.', 1.2); } else S7.splash('NOT ENOUGH RED.', 1.2); } } });
  } else if (g.kind === 'icelock') {
    if (G.items.ember) { openGate(id); emit('steam', { at: g.at }); S7.splash('THE ICE WEEPS.', 1.4); } else say([[G.persona, g.line || 'Frozen shut.']]);
  } else if (g.kind === 'delegate') {
    const n = G.items.edelweiss || 0;
    if (n >= 3) { openGate(id); emit('delegate', {}); runBeat('delegate_gate'); } else say([[G.persona, 'Three flowers. You have ' + n + '.']]);
  } else if (g.kind === 'key') { if (G.items[g.item]) { openGate(id); S7.splash('UNLOCKED.', 1); } else say([[G.persona, g.line || 'Locked.']]); }
  else say([[G.persona, g.line || 'Not with these hands.']]);
}
S7.gateInteract = gateInteract;
/** a skill went off at a point: echo walls, crystals, cornices and seracs nearby open */
function skillGates(kind, at, radius) {
  const gs = W.area.gates || {};
  for (const id in gs) {
    const g = gs[id]; if (gateOpen(id) || !g.at) continue;
    const p = [g.at[0] * M, g.at[1] * M, W.grid.floor(g.at[0] * M, g.at[1] * M) + (g.at[2] || 0) * M], d = V.dist(p, at);
    if (g.kind === kind && d <= radius * M) { openGate(id); S7.splash(g.done || 'OPEN.', 1.4); if (g.beat) runBeat(g.beat); }
  }
}
S7.skillGates = skillGates;

/* ---- exits ---- */
function tryExit(n) {
  if (n.needs) {
    if (n.needs.item && !G.items[n.needs.item]) { refuse(n.line || 'Locked.', n.hint); G.walker.exitDone = false; return false; }
    if (n.needs.flag && !flag(n.needs.flag)) { refuse(n.line || 'Not yet.', n.hint); G.walker.exitDone = false; return false; }
  }
  if (nearEnemies(40).length && !n.anyway) { refuse('Not while someone is laughing.'); G.walker.exitDone = false; return false; }
  emit('exit', { to: n.to }); S7.flurry && S7.flurry();
  enterArea(n.to[0], n.to[1]);
  return true;
}
S7.tryExit = tryExit;

/* ---- personas, the ring, switching (§7.8) ---- */
const P_ = () => G.roster[G.persona];
S7.canPick = id => { const r = G.roster[id]; if (!r || r.frozen) return false; if (!r.unlocked && !CHEATS.allPersonas) return false; if (id === 'ansel' && G.area !== 'room7' && !CHEATS.allPersonas) return false; return true; };
function switchTo(id, instant) {
  if (id === G.persona || !S7.canPick(id)) return false;
  if (G.boss && G.boss.noSwitch) { S7.splash('NO TIME TO CHANGE.', 1); return false; }
  G.switchTo = id; G.mode = 'switch'; G.switchT = instant ? 0 : .45; G.aim.on = false; G.tuck = false;
  emit('switch', { from: G.persona, to: id });
  if (instant) finishSwitch();
  return true;
}
S7.switchTo = switchTo;
function finishSwitch() {
  const from = G.persona; G.last = from; G.persona = G.switchTo; G.switchTo = null; G.mode = 'play';
  G.aim.scope = false;
  emit('switched', { from, to: G.persona });
  bark(G.persona, 'in');
}

/* ---- Red, Rime, healing, the Wax Bench (§7.11) ---- */
const addRed = n => { G.red = clamp(G.red + n, 0, 999); if (n > 0) G.stats.red += n; };
const spendRed = n => { if (CHEATS.infRed) return true; if (G.red < n) return false; G.red -= n; return true; };
S7.addRed = addRed; S7.spendRed = spendRed;
const WAX = [3, 5, 8, 12, 16];
S7.WAX = WAX;
S7.waxCost = (id, stat) => { const lv = G.roster[id].stats[stat]; return lv >= 5 ? null : WAX[lv]; };
S7.wax = (id, stat) => { const c = S7.waxCost(id, stat); if (c === null || G.rime < c) return false; G.rime -= c; G.roster[id].stats[stat]++; emit('wax', { id, stat }); return true; };
function healStep(dt, I) {
  const r = P_();
  if (!I.heal || r.hp >= r.max || (G.red <= 0 && !CHEATS.infRed)) { G.healing = false; return; }
  const amt = Math.min(T.healRate * dt, r.max - r.hp, CHEATS.infRed ? 1e9 : G.red);
  r.hp += amt; if (!CHEATS.infRed) G.red -= amt; G.healing = true; emit('heal', { amount: amt });
}
/** the player is hurt (unless switching, in Room 7 or in god mode) */
function hurt(dmg, from) {
  if (CHEATS.god || G.mode === 'switch' || G.area === 'room7' || G.mode !== 'play' && G.mode !== 'ring') return;
  if (G.attract || G.echo) return;
  const r = P_(); dmg *= diff().dmg; r.hp = Math.max(0, r.hp - dmg);
  emit('hurt', { persona: G.persona, dmg, from });
  if (r.hp <= 0) freezeActive();
  else if (r.hp < r.max * .3 && !r.lowBark) { r.lowBark = true; bark(G.persona, 'low'); }
}
S7.hurt = hurt;

/* ---- freezing and the Sweep (§7.10) ---- */
function freezeActive() {
  const id = G.persona, r = G.roster[id], wk = G.walker;
  r.hp = 0; G.mode = 'frozen'; G.modeT = 0; G.aim.on = false;
  let p = heroPos(); const e0 = curEdge();
  if (W.area.statueAt && (G.aval || e0 && (e0.kind === 'ski' || e0.kind === 'jump' || e0.kind === 'lift'))) { const n = W.rails.nodes[W.area.statueAt]; p = { x: n.x + 24, y: n.y + 10, z: n.z }; }
  r.statue = { area: G.area, at: [p.x, p.y, p.z], edge: wk.edge, s: wk.s, node: wk.node, face: heroFacing() };
  G.stats.frozen++; emit('freeze', { persona: id, at: r.statue.at }); bark(id, 'frozen');
}
S7.freezeActive = freezeActive;
function afterFreeze() {
  const id = G.persona, r = G.roster[id];
  if (id === 'ansel') { G.mode = 'gameover'; G.gameoverT = 0; emit('gameover', {}); return; }
  r.frozen = true;
  G.persona = 'ansel'; G.last = id; const sw = G.roster.ansel; if (sw.hp <= 0) sw.hp = sw.max;
  const door = G.lastDoor[G.area], A = W.rails;
  const spawn = door && A.nodes[door] ? door : (W.area.sweepAt || W.area.start);
  placeAtNode(spawn); G.mode = 'play'; director.cut();
  emit('sweep', { statue: r.statue }); S7.splash('THE SWEEP', 1.6);
  if (!G.tips.rescue) { G.tips.rescue = true; S7.tip('rescue'); }
}
/** frozen statues in this area, nearest first */
const statuesHere = () => ORDER.filter(id => G.roster[id].frozen && G.roster[id].statue && G.roster[id].statue.area === G.area).map(id => ({ id, st: G.roster[id].statue }));
S7.statuesHere = statuesHere;
function rescueStep(dt, I) {
  const p = heroPos(); let near = null;
  for (const s of statuesHere()) if (Math.hypot(s.st.at[0] - p.x, s.st.at[1] - p.y) < 1.8 * M) near = s;
  G.nearStatue = near ? near.id : null;
  if (near && I.interactHeld) { G.statueHold += dt; if (G.statueHold >= 1.5) { const r = G.roster[near.id]; r.frozen = false; r.statue = null; r.hp = Math.round(r.max * .5); r.lowBark = false; G.statueHold = 0; emit('rescue', { persona: near.id }); bark(near.id, 'revived'); } }
  else G.statueHold = 0;
}

/* ---- talk: lines typed out with voices; the sim waits while a modal line is open ---- */
const TALK = { q: [], i: 0, shown: 0, open: false, choices: null, onChoice: null, onDone: null, sel: 0, t: 0 };
S7.TALK = TALK;
function say(lines, o = {}) {
  TALK.q = lines.map(l => Array.isArray(l) ? { who: l[0], text: l[1] } : l); TALK.i = 0; TALK.shown = 0; TALK.open = true; TALK.t = 0;
  TALK.choices = o.choices || null; TALK.onChoice = o.onChoice || null; TALK.onDone = o.onDone || null; TALK.sel = 0;
  if (G.mode === 'play' || G.mode === 'ring') { TALK.prevMode = 'play'; G.mode = 'talk'; G.aim.on = false; }
  emit('say', { who: TALK.q[0] && TALK.q[0].who });
}
S7.say = say;
function talkStep(dt, I) {
  const L = TALK.q[TALK.i]; if (!L) { closeTalk(); return; }
  TALK.t += dt;
  const full = L.text.length, cps = S7.game && S7.game.settings && S7.game.settings.textSpeed === 'Fast' ? 70 : 42;
  if (TALK.shown < full) TALK.shown = Math.min(full, TALK.shown + cps * dt);
  const last = TALK.i === TALK.q.length - 1;
  if (last && TALK.choices && TALK.shown >= full) {
    if (I.up || I.left) TALK.sel = (TALK.sel + TALK.choices.length - 1) % TALK.choices.length;
    if (I.down || I.right) TALK.sel = (TALK.sel + 1) % TALK.choices.length;
    if (I.pickChoice >= 0) { TALK.sel = I.pickChoice; I.confirm = true; }
  }
  if (I.confirm || I.interact || I.firePressed || I.cancel && !TALK.choices) {
    if (TALK.shown < full) TALK.shown = full;
    else if (!last) { TALK.i++; TALK.shown = 0; TALK.t = 0; emit('say', { who: TALK.q[TALK.i].who }); }
    else { const ch = TALK.choices, f = TALK.onChoice, sel = I.cancel && ch ? ch.length - 1 : TALK.sel; closeTalk(); if (ch && f) f(sel); }
  }
}
function closeTalk() {
  const d = TALK.onDone; TALK.open = false; TALK.q = []; TALK.choices = null; TALK.onChoice = null; TALK.onDone = null;
  if (G.mode === 'talk') G.mode = 'play';
  if (d) d();
}
/* barks: short lines that do not stop play */
const BARKS = [];
S7.BARKS = BARKS;
function bark(id, kind) {
  const P = S7.PERSONAS[id]; if (!P || !P.barks) return;
  const l = P.barks[kind]; if (!l) return; const text = Array.isArray(l) ? l[Math.floor(R('bark') * l.length)] : l;
  BARKS.push({ who: id, text, t: 2.4 }); if (BARKS.length > 2) BARKS.shift(); emit('bark', { who: id, text });
}
S7.bark = bark;
S7.barkLine = (who, text, t = 2.6) => { BARKS.push({ who, text, t }); if (BARKS.length > 2) BARKS.shift(); emit('bark', { who, text }); };

/* splashes and tips (HUD) */
const SPLASH = [];
S7.SPLASH = SPLASH;
S7.splash = (text, t = 1.2, o = {}) => { SPLASH.push(Object.assign({ text, t, t0: t }, o)); if (SPLASH.length > 3) SPLASH.shift(); };
const TIPS = { cur: null };
S7.TIPS = TIPS;
S7.tip = id => { if (G.attract || !S7.TIPDEFS[id]) return; if (G.tips['shown:' + id]) return; G.tips['shown:' + id] = true; TIPS.cur = { id, t: 0 }; emit('tutorial', { id }); };
S7.tipDone = id => { if (TIPS.cur && TIPS.cur.id === id) TIPS.cur = null; };

/* ---- beats: coroutines on game time (dialog, cameras, waits, spawns, cards) ---- */
const BEATS_RUN = [];
S7.BEATS_RUN = BEATS_RUN;
function runBeat(id, arg) {
  const f = S7.BEATS[id]; if (!f) throw new Error('unknown beat ' + id);
  const gen = f(BG, arg); BEATS_RUN.push({ id, gen, wait: null }); emit('beat', { id });
  stepBeat(BEATS_RUN[BEATS_RUN.length - 1], 0);
}
S7.runBeat = runBeat;
function stepBeat(b, dt) {
  for (let guard = 0; guard < 50; guard++) {
    const w = b.wait;
    if (w !== null) {
      if (typeof w === 'number') { b.wait -= dt; if (b.wait > 0) return; dt = 0; }
      else if (typeof w === 'function') { if (!w()) return; }
    }
    const r = b.gen.next(); b.wait = null;
    if (r.done) { b.done = true; return; }
    const v = r.value;
    if (typeof v === 'number' || typeof v === 'function') b.wait = v;
    else if (v === undefined) { b.wait = 0.0001; return; }
  }
}
function beatsStep(dt) { for (const b of BEATS_RUN.slice()) { stepBeat(b, dt); if (b.done) BEATS_RUN.splice(BEATS_RUN.indexOf(b), 1); } }
/* the beat toolkit: yield BG.say(...) etc. */
const BG = {
  say(lines, o) { say(lines, o); return () => !TALK.open; },
  card(title, sub, t = 2.6, o = {}) { G.card = Object.assign({ title, sub, t, t0: t }, o); G.mode = G.mode === 'talk' ? 'talk' : 'card'; emit('card', { title }); return () => !G.card; },
  cam(shot, t) { director.override = normShot(Object.assign({ s: [0, 1] }, shot)); director.overT = t; director.cut(); },
  camOff() { director.override = null; director.cut(); },
  cut(on) { G.cut = on; if (on) G.aim.on = false; },
  wait: s => s,
  until: f => f,
  flag: (f, v) => setFlag(f, v),
  wave: id => startWave(id),
  clear: () => () => !aliveEnemies().length,
  give: (item, n) => giveItem(item, n),
  splash: (t, s) => S7.splash(t, s),
  emit: (t, d) => emit(t, d),
  G: () => G
};
S7.BG = BG;

/* ---- items, pins, the Dossier (§7.12) ---- */
function giveItem(id, n = 1) {
  const it = S7.ITEMS[id]; if (!it) throw new Error('unknown item ' + id);
  if (it.kind === 'pin') { if (!G.pins.includes(id)) G.pins.push(id); }
  else if (it.kind === 'doc') { if (!G.dossier.includes(id)) G.dossier.push(id); }
  else if (it.kind === 'exposure') { if (!G.exposures.includes(id)) G.exposures.push(id); }
  else if (it.kind === 'rime') { G.rime += n; }
  else if (it.kind === 'red') { addRed(n); }
  else G.items[id] = (G.items[id] || 0) + n;
  emit('pickup', { kind: id, amount: n }); return true;
}
S7.giveItem = giveItem;

/* ---- spots: interactables and pickups ---- */
const spotDone = s => !!G.spots[key(s.id)];
const markSpot = s => { G.spots[key(s.id)] = true; };
S7.spotDone = spotDone;
function nearSpot() {
  const p = heroPos(); let best = null, bd = 1e9;
  for (const s of W.spots) {
    if (s.kind === 'pickup' || s.kind === 'lookout' || s.kind === 'exposure') continue;
    if (s.hidden && !flag(s.hidden)) continue;
    if (s.when && !flag(s.when)) continue;
    if (s.once && spotDone(s)) continue;
    if (s.kind === 'gate' && gateOpen(s.gate)) continue;
    const d = Math.hypot(s.pos[0] - p.x, s.pos[1] - p.y);
    if (d < (s.r || 2.2) * M && Math.abs(s.pos[2] - p.z) < 3 * M && d < bd) { bd = d; best = s; }
  }
  return best;
}
S7.nearSpot = nearSpot;
function interact(s) {
  if (!s) return;
  emit('interact', { id: s.id, kind: s.kind });
  if (s.kind === 'gate') return gateInteract(s.gate);
  if (s.kind === 'room7') return enterRoom7(s);
  if (s.kind === 'npc' && s.who === 'murmel') return murmel(s);
  if (s.kind === 'phone') { markSpot(s); return runBeat(s.beat); }
  if (s.kind === 'codelock') return emit('open', { screen: 'codelock', spot: s.id, code: s.code });
  if (s.kind === 'lift') { const e = W.rails.byId[s.lift]; G.walker.node = s.node; if (e) takeEdge(e); return; }
  if (s.kind === 'r7') return room7Use(s);
  if (s.kind === 'exit') return tryExit(W.rails.nodes[s.node]);
  if (s.beat) { if (s.once) markSpot(s); return runBeat(s.beat, s); }
  if (s.lines) { const L = typeof s.lines === 'string' ? S7.LINES[s.lines] : s.lines; if (s.once) markSpot(s); return say(L.map(l => Array.isArray(l) ? l : [s.who || G.persona, l])); }
}
S7.interact = interact;
function pickupsStep() {
  const p = heroPos();
  for (const s of W.spots) {
    if (s.kind !== 'pickup' || spotDone(s)) continue;
    if (s.hidden && !flag(s.hidden)) continue;
    if (Math.hypot(s.pos[0] - p.x, s.pos[1] - p.y) < (s.r || 1.4) * M && Math.abs(s.pos[2] - p.z) < 3 * M) {
      markSpot(s); giveItem(s.item, s.n || 1);
      const it = S7.ITEMS[s.item]; S7.splash(it.kind === 'red' ? 'RED +' + (s.n || 1) : it.kind === 'rime' ? 'RIME +' + (s.n || 1) : it.name.toUpperCase(), 1.4, { small: it.kind === 'red' || it.kind === 'rime' });
      if (it.kind === 'pin' || it.kind === 'doc' || it.kind === 'key') S7.barkLine(G.persona, it.kind === 'pin' ? 'A lift pin. ' + it.slogan : it.kind === 'doc' ? 'Paperwork. Read it later.' : 'That will open something.');
    }
  }
}

/* ---- Murmel's hints (§7.14) ---- */
function murmel(s) {
  const first = !G.flags.murmelMet;
  if (first) { setFlag('murmelMet'); markSpot(s); return say(S7.LINES.murmel_first.map(l => ['murmel', l])); }
  const free = G.persona === 'rurik', cost = free ? 0 : 10;
  say([['murmel', free ? 'For you... it is on the house... Means recognise means...' : 'A hint... is ten Red... Gratuity... is customary...']], {
    choices: [free ? 'BUY A HINT (FREE)' : 'BUY A HINT (10 RED)', 'LEAVE'],
    onChoice: i => {
      if (i !== 0) return say([['murmel', 'Mind the gap... between floors...']]);
      if (cost && !spendRed(cost)) return say([['murmel', 'No Red... no hint... The mountain does not do credit...']]);
      G.hints++; G.stats.hints++; say([['murmel', S7.hintFor()]]);
    }
  });
}
S7.hintFor = () => { const o = S7.objectiveId(); const H = S7.LINES.hints; return (H[o] || S7.LINES.hint_fallback[0]); };

/* ---- Room 7 (§7.16) ---- */
function enterRoom7(s) {
  if (nearEnemies(40).length) { refuse('The door won\'t open while someone is laughing.'); return; }
  G.lastDoor[G.area] = s.node; G.r7from = { area: G.area, node: s.node };
  S7.flurry && S7.flurry(); emit('room7', { in: true });
  enterArea('room7', 'door', { noAutosave: true });
  thawLeftBehind(s && G.r7from ? G.r7from.area : null);
  S7.autosave && S7.autosave('room7');
  if (!G.tips.room7) { G.tips.room7 = true; S7.tip('room7'); }
}
S7.enterRoom7 = enterRoom7;
/** the featherbed thaws the family left frozen in other places (at a quarter of their strength) */
function thawLeftBehind(here) {
  for (const id of ORDER) { const r = G.roster[id]; if (r.frozen && r.statue && r.statue.area !== here) { r.frozen = false; r.statue = null; r.hp = Math.round(r.max * .25); emit('rescue', { persona: id, bed: true }); S7.barkLine('rosalind', 'Rosalind wrapped ' + S7.PERSONAS[id].name.split(' ')[0] + ' in the featherbed. Thawed. Barely.', 3); } }
}
S7.thawLeftBehind = thawLeftBehind;
function leaveRoom7() {
  const f = G.r7from || { area: '00A', node: 'r7' };
  S7.flurry && S7.flurry(); emit('room7', { in: false });
  if (G.persona === 'ansel' && !G.flags.sweepKeep && statuesHere().length === 0) { /* the Sweep can stay out if picked */ }
  enterArea(f.area, f.node, { noAutosave: true });
}
S7.leaveRoom7 = leaveRoom7;
function room7Use(s) {
  if (s.use === 'door') return leaveRoom7();
  if (s.use === 'clock') return emit('open', { screen: 'save' });
  if (s.use === 'bench') return emit('open', { screen: 'waxbench' });
  if (s.use === 'wardrobe') return emit('open', { screen: 'wardrobe' });
  if (s.use === 'bed') { const L = S7.LINES.holle_bed, i = (G.flags.holleI || 0) % L.length; G.flags.holleI = (G.flags.holleI || 0) + 1; return say([['holle', L[i]]]); }
  if (s.use === 'rosalind') return say([['rosalind', S7.rosalindLine()]]);
  if (s.use === 'window') { const n = G.pins.length; return say([[G.persona, 'Snow. It never stops here.'], ['rosalind', 'Lift pins in your pocket: ' + n + ' of 7. The window counts them too.']]); }
  if (s.use === 'phone') return runBeat(G.target >= 1 ? 'briefing_replay1' : 'briefing_replay0');
}
S7.wardrobePick = id => { if (!G.roster[id].unlocked && !CHEATS.allPersonas) return false; if (G.roster[id].frozen) return false; if (id === G.persona) return true; G.last = G.persona; G.persona = id; emit('switched', { from: G.last, to: id }); bark(id, 'in'); return true; };

/* ---- objectives (one line from the story flags) ---- */
S7.objectiveId = () => {
  const f = G.flags, it = G.items;
  if (G.target === 0) {
    if (!f.ropePaid && !G.gates['00A:rope']) return 'rope';
    if (!it.servicekey) return 'key';
    if (!f.bellRung) return 'bell';
    if (!f.gapJumped) return 'gap';
    return 'grau';
  }
  if (!f.liftClear) return 'bell1';
  const ed = it.edelweiss || 0;
  if (ed < 3) {
    if (!f.mirrors && !f.band) return 'mirrors';
    if (!f.exposure1 && !it.ember) return 'press';
    if (!f.patrol) return 'patrol';
    if (!f.cornice) return 'cornice';
    return 'gate';
  }
  if (!f.gondolaDone) return 'gate';
  if (!f.crystals) return 'crystals';
  if (!f.ledger) return 'ledger';
  if (!f.seracs) return 'seracs';
  return 'hansi';
};
S7.objective = () => (S7.LINES.objectives[S7.objectiveId()] || '');
S7.rosalindLine = () => (S7.LINES.rosalind_obj[S7.objectiveId()] || 'Go on. The snow is waiting.');

/* ---- the main step (§5.4 order) ---- */
const director = new Director();
S7.director = director;
Director.prototype.cut = function () { this.shotKey = null; this.lagP = null; this.cuts++; };
function aiming() { return !!(G && G.aim.on); }
S7.sim = { aiming };
function canAim() {
  if (G.mode !== 'play' || G.cut || G.area === 'room7') return false;
  const wk = G.walker, e = curEdge();
  if (wk.turnT > 0 || wk.air > 0 && e && e.kind === 'jump') return false;
  if (!e || wk.node) return true;
  if (e.kind === 'lift' || e.aimOnTheMove) return true;
  if (e.kind === 'ski') return wk.skiStop && wk.v === 0 || !!(G.boss && G.boss.aimOnTheMove);
  return true;
}
S7.canAim = canAim;

function simUpdate(dt, I) {
  if (!G || !W.area) return;
  G.time += dt; G.modeT += dt;
  if (G.area !== 'room7' && G.mode !== 'gameover') { G.playtime += dt; G.stats.time += dt; }
  for (const b of BARKS) b.t -= dt; while (BARKS.length && BARKS[0].t <= 0) BARKS.shift();
  for (const s of SPLASH) s.t -= dt; while (SPLASH.length && SPLASH[0].t <= 0) SPLASH.shift();
  if (TIPS.cur) TIPS.cur.t += dt;
  G.letterbox = approach(G.letterbox, G.cut ? 1 : 0, dt * 4);
  if (G.card) { G.card.t -= dt; const ct = G.card; if (ct.t <= 0 || ct.t < ct.t0 - .8 && (I.confirm || I.firePressed || I.cancel)) { G.card = null; if (G.mode === 'card') G.mode = 'play'; } }
  // modes
  if (G.mode === 'talk') { talkStep(dt, I); beatsStep(dt); S7.cameraStep(dt); return; }
  if (G.mode === 'card') { beatsStep(dt); S7.cameraStep(dt); return; }
  if (G.mode === 'switch') { G.switchT -= dt; if (G.switchT <= 0) finishSwitch(); S7.combatStep(dt, I, true); S7.cameraStep(dt); return; }
  if (G.mode === 'frozen') { if (G.modeT >= 1.2) afterFreeze(); S7.combatStep(dt, I, true); S7.cameraStep(dt); return; }
  if (G.mode === 'gameover') { G.gameoverT += dt; return; }
  if (G.mode === 'results' || G.mode === 'end') { beatsStep(dt); return; }
  // the ring (time slows: the scene sets game.timeScale)
  if (G.mode === 'ring') {
    if (I.pick) { const id = ORDER[I.pick - 1]; G.ringSel = id; }
    if (I.ringSel) G.ringSel = I.ringSel;
    if (Math.hypot(I.stick[0], I.stick[1]) > .5) { const a = Math.atan2(I.stick[1], I.stick[0]), k = Math.round(((a + Math.PI / 2) / TAU) * 7 + 7) % 7; G.ringSel = ORDER[k]; }
    if (!I.ring) { G.mode = 'play'; if (G.ringSel && G.ringSel !== G.persona) switchTo(G.ringSel); else if (G.modeT < .22 && G.last && S7.canPick(G.last)) switchTo(G.last); G.ringSel = null; }
    S7.combatStep(dt, I, true); S7.cameraStep(dt); return;
  }
  // play
  const wk = G.walker;
  if (G.boss && G.boss.forceAim) { I.aim = true; I.scan = false; I.skill = false; I.ringPressed = false; I.pick = 0; }
  if (!G.cut) {
    if (I.pick && !G.aim.on && G.area !== 'room7') { const id = ORDER[I.pick - 1]; if (id !== G.persona) { if (S7.canPick(id)) switchTo(id); else S7.splash(G.roster[id].frozen ? 'FROZEN.' : id === 'ansel' ? 'ROOM 7 ONLY.' : 'NOT YET.', 1); } }
    if (I.ringPressed && !G.aim.on && G.area !== 'room7' && !(G.boss && G.boss.noSwitch)) { G.mode = 'ring'; G.modeT = 0; G.ringSel = null; emit('ring', {}); S7.tipDone('ring'); }
    const wantAim = I.aim && canAim();
    if (wantAim !== G.aim.on) {
      G.aim.on = wantAim;
      if (wantAim) { const f = heroFacing(); G.aim.yaw = G.aim.keepYaw !== undefined && G.boss ? G.aim.keepYaw : f; G.aim.pitch = 0; G.aim.scope = false; emit('aim', { on: true }); S7.tipDone('aim'); if (G.walker.v && curEdge() && curEdge().kind === 'walk') G.walker.v = 0; }
      else { emit('aim', { on: false }); G.aim.scope = false; S7.collectDrops && S7.collectDrops(); }
    }
    if (!G.aim.on || (curEdge() && (curEdge().kind === 'lift' || curEdge().aimOnTheMove || curEdge().kind === 'ski' && !wk.skiStop))) {
      const pb = G.aim.on ? Object.assign({}, I, { turn: false, move: curEdge() && curEdge().kind === 'ski' ? I.move : false }) : I;
      if (!G.boss || !G.boss.lockWalker) walkerStep(dt, pb);
    }
    if (I.move && !G.aim.on) S7.tipDone('walk');
    if (!G.aim.on) healStep(dt, I); else G.healing = false;
    // interact
    const ns = G.aim.on ? null : nearSpot(); G.near = ns;
    if (G.persona === 'ansel' || statuesHere().length) rescueStep(dt, I);
    if (I.interact && !G.aim.on) { if (I.interactId) interact(W.spots.find(s => s.id === I.interactId)); else if (ns && !G.nearStatue) interact(ns); }
    pickupsStep();
  }
  S7.skillsStep(dt, I);
  S7.combatStep(dt, I, false);
  S7.bossStep && S7.bossStep(dt, I);
  beatsStep(dt);
  if (director.overT !== undefined && director.override) { director.overT -= dt; if (director.overT <= 0) { director.override = null; director.overT = undefined; director.cut(); } }
  S7.cameraStep(dt);
  if (S7.echoStep) S7.echoStep(dt, I);
}
S7.simUpdate = simUpdate;

/** each step: the director's pose (the shot covering the walker, or the eye while aiming, or a beat's override) */
S7.cameraStep = dt => {
  const d = director, wk = G.walker, e = curEdge(), H = heroPos(), f = heroFacing();
  d.t = (d.t || 0) + dt;
  G.aim.k = approach(G.aim.k, G.aim.on ? 1 : 0, dt / .15);
  let pose;
  if (d.override) pose = d.poseOf(d.override, [H.x, H.y, H.z], f, W.grid, null, 0, 1);
  else if (e) {
    const [sh, i] = d.shotFor(e, wk.s, wk.dir), k = e.id + ':' + (wk.dir < 0 ? 'r' : 'f') + i;
    if (k !== d.shotKey) { if (d.shotKey !== null && !sh.blend) d.cuts++; d.shotKey = k; d.lagP = null; d.blend = sh.blend ? { from: Object.assign({}, d.pose), t: 0, dur: sh.blend } : null; }
    pose = d.poseOf(sh, [H.x, H.y, H.z], f, W.grid, e, wk.s, wk.dir);
    if (sh.shot === 'follow' && sh.lag) { if (!d.lagP) d.lagP = [pose.x, pose.y, pose.z]; const a = 1 - Math.exp(-dt / sh.lag); d.lagP = [lerp(d.lagP[0], pose.x, a), lerp(d.lagP[1], pose.y, a), lerp(d.lagP[2], pose.z, a)]; const look = V.add([pose.x, pose.y, pose.z], V.dir(pose.yaw, pose.pitch), 64); pose.x = d.lagP[0]; pose.y = d.lagP[1]; pose.z = d.lagP[2]; const dx = look[0] - pose.x, dy = look[1] - pose.y, dz = look[2] - pose.z; pose.yaw = Math.atan2(dy, dx); pose.pitch = Math.atan2(dz, Math.hypot(dx, dy)); }
    if (d.blend) { d.blend.t += dt; const u = E.ease.inOutSine(clamp(d.blend.t / d.blend.dur, 0, 1)), A = d.blend.from; pose = { x: lerp(A.x, pose.x, u), y: lerp(A.y, pose.y, u), z: lerp(A.z, pose.z, u), yaw: A.yaw + angDiff(A.yaw, pose.yaw) * u, pitch: lerp(A.pitch, pose.pitch, u), roll: 0, fov: lerp(A.fov, pose.fov, u) }; if (u >= 1) d.blend = null; }
  } else pose = { x: H.x - 40, y: H.y - 40, z: H.z + 40, yaw: Math.PI / 4, pitch: -.5, roll: 0, fov: 55 };
  if (G.aim.k > 0) {
    const eye = S7.eye(), a = G.aim, sway = a.sway || 0, fov = a.scope ? 18 : (W.area.world && W.area.world.overlay && W.area.world.overlay.fov) || 62;
    const ep = { x: eye[0], y: eye[1], z: eye[2], yaw: a.yaw + (a.swayY || 0), pitch: a.pitch + a.recoil * Math.PI / 180 + (a.swayP || 0), roll: 0, fov };
    const u = E.ease.inOutSine(G.aim.k);
    pose = u >= 1 ? ep : { x: lerp(pose.x, ep.x, u), y: lerp(pose.y, ep.y, u), z: lerp(pose.z, ep.z, u), yaw: pose.yaw + angDiff(pose.yaw, ep.yaw) * u, pitch: lerp(pose.pitch, ep.pitch, u), roll: 0, fov: lerp(pose.fov, ep.fov, u) };
    void sway;
  }
  d.pose = pose; G.cam = pose;
};
S7.eye = () => { const H = heroPos(); return [H.x, H.y, H.z + 1.6 * M]; };

/* ---- triggers and waves ---- */
function fireTrigger(t) {
  if (G.echo) return;
  if (t.once !== false && G.flags['trig:' + key(t.id)]) return;
  if (t.when && !flag(t.when)) return;
  if (t.unless && flag(t.unless)) return;
  G.flags['trig:' + key(t.id)] = true;
  if (t.beat) runBeat(t.beat);
  if (t.wave) startWave(t.wave);
  if (t.tip) S7.tip(t.tip);
  if (t.flag) setFlag(t.flag);
}
S7.fireTrigger = fireTrigger;
function startWave(id) {
  const k = key(id); if (G.waves[k]) return;
  const w = (W.area.waves || {})[id]; if (!w) throw new Error(W.area.id + ': unknown wave ' + id);
  G.waves[k] = 'active';
  const list = w.spawn.map(([type, sp, delay]) => ({ type, sp, at: (delay || 0) / T.spawnRate }));
  G.pending = (G.pending || []).concat(list.map(x => Object.assign(x, { wave: k, t: 0 })));
  emit('wave', { id });
}
S7.startWave = startWave;
const aliveEnemies = () => G.enemies.filter(e => e.alive && !e.ambient);
const nearEnemies = m => { const H = heroPos(); return aliveEnemies().filter(e => Math.hypot(e.x - H.x, e.y - H.y) < m * M); };
S7.nearEnemies = nearEnemies;
S7.aliveEnemies = aliveEnemies;
function wavesStep(dt) {
  if (G.pending && G.pending.length) {
    for (const p of G.pending) p.t += dt;
    const alive = aliveEnemies().length;
    let room = 10 - alive;
    G.pending = G.pending.filter(p => { if (p.t < p.at || room <= 0) return true; room--; const sp = (W.area.spawns || {})[p.sp]; if (!sp) throw new Error(W.area.id + ': unknown spawn ' + p.sp); const wd = W.area.waves[p.wave.slice(G.area.length + 1)] || {}, Hp = heroPos(); let sx = sp[0] * M, sy = sp[1] * M; const dd = Math.hypot(sx - Hp.x, sy - Hp.y); if (dd < 7 * M && !wd.close) { const k = 7 * M / Math.max(1, dd), nx = Hp.x + (sx - Hp.x) * k, ny = Hp.y + (sy - Hp.y) * k; if (W.grid.walkable(Math.floor(nx / M), Math.floor(ny / M))) { sx = nx; sy = ny; } } S7.spawnEnemy(p.type, sx, sy, sp[2] !== undefined ? W.grid.floor(sp[0] * M, sp[1] * M) + sp[2] * M : undefined, { wave: p.wave, part: wd.part, revealed: wd.revealed }); return false; });
  }
  for (const k in G.waves) if (G.waves[k] === 'active' && k.startsWith(G.area + ':') && !(G.pending || []).some(p => p.wave === k) && !G.enemies.some(e => e.alive && e.wave === k)) {
    G.waves[k] = 'done'; const id = k.slice(G.area.length + 1); setFlag('wave:' + k); emit('waveDone', { id });
    const w = W.area.waves[id]; if (w && w.then) runBeat(w.then);
  }
}
S7.wavesStep = wavesStep;

/* ---- saves (§7.17) ---- */
function serialize() {
  const r = {}; for (const id of ORDER) { const x = G.roster[id]; r[id] = { hp: Math.round(x.hp * 100) / 100, max: x.max, stats: Object.assign({}, x.stats), frozen: x.frozen, statue: x.statue, unlocked: x.unlocked }; }
  return JSON.parse(JSON.stringify({ v: 1, area: G.area, node: G.walker.node || G.walker.lastNode, r7from: G.r7from, persona: G.persona, last: G.last, roster: r, red: Math.round(G.red), rime: G.rime, items: G.items, pins: G.pins, dossier: G.dossier, exposures: G.exposures,
    gates: G.gates, waves: Object.fromEntries(Object.entries(G.waves).filter(([, v]) => v === 'done')), spots: G.spots, flags: Object.fromEntries(Object.entries(G.flags).filter(([k]) => !k.startsWith('trig:') || true)), visited: G.visited, seen: G.seen, tips: G.tips,
    lastDoor: G.lastDoor, results: G.results, target: G.target, playtime: Math.round(G.playtime * 10) / 10, difficulty: G.difficulty, stats: G.stats, hints: G.hints, seed: G.seed }));
}
S7.serialize = serialize;
function migrate(d, from) { if (!d || typeof d !== 'object') return null; if (from === undefined || from < 1) { if (!d.area) return null; d.v = 1; } return d; }
S7.migrate = migrate;
function deserialize(d) {
  d = migrate(d, d && d.v); if (!d) throw new Error('This save cannot be read.');
  G = S7.G = newState({ seed: d.seed, difficulty: d.difficulty });
  for (const k of ['persona', 'last', 'red', 'rime', 'items', 'pins', 'dossier', 'exposures', 'gates', 'waves', 'spots', 'flags', 'visited', 'seen', 'tips', 'lastDoor', 'results', 'target', 'playtime', 'stats', 'hints', 'r7from']) if (d[k] !== undefined) G[k] = JSON.parse(JSON.stringify(d[k]));
  for (const id of ORDER) if (d.roster && d.roster[id]) Object.assign(G.roster[id], JSON.parse(JSON.stringify(d.roster[id])));
  enterArea(d.area, d.node, { noAutosave: true, silent: true });
  return G;
}
S7.deserialize = deserialize;
S7.newGame = (o = {}) => { G = S7.G = newState(o); BEATS_RUN.length = 0; BARKS.length = 0; SPLASH.length = 0; TALK.open = false; TIPS.cur = null; return G; };

/* ---- the code lock (§7.13): four dials; the right date opens it ---- */
S7.codeOpen = (spotId, code) => {
  const s = W.spots.find(x => x.id === spotId); if (!s || spotDone(s)) return false;
  if (String(code) !== String(s.code)) { emit('codeWrong', {}); S7.splash('CLICK. CLICK. NOTHING.', 1.2); return false; }
  markSpot(s); emit('codeRight', {}); S7.splash('THE SAFE OPENS.', 1.4); runBeat('safe_open'); return true;
};
