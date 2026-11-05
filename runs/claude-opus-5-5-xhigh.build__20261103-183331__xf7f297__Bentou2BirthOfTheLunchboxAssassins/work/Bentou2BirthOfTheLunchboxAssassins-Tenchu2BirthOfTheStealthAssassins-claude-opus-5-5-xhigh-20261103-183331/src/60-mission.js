/* ---- MISSIONS: the runtime of one level: actors from its lists, objectives (assassinate, retrieve, rescue, escort,
 * reach, defeat, interact, stopTimer, flag), triggers (rect, at+r, when: objective / kill / alert / time / pickup / flag /
 * boss / interact) with actions (say, dialog, toast, tutorial, checkpoint, spawn, boss, objective, open, close, music,
 * flag, heal, cutscene), checkpoints (a snapshot restored on retry), timers and the generic fail hook ---- */
const Mission = {};
const CHEATS0 = () => ({ god: false, invisible: false, noclip: false, infinite: false, oneHit: false, freezeAI: false, reveal: false });
/** build a mission. o: { mode: 'story' | 'trial' | 'hub' | 'attract' | 'workshop', char, loadout, missionId, cheats, snapshot } */
Mission.create = (L, o = {}) => {
  if (typeof L === 'string') L = B.get('level', L);
  L = deepCopy(L);
  const M = { level: L, missionId: o.missionId || L.id, mode: o.mode || 'story', char: o.char || 'sojiro', world: new World(L), guards: [], civs: [], bosses: [], summons: [], escort: null,
    bells: [], barracks: [], pickups: [], interacts: [], objectives: [], triggers: [], timer: null, flags: {}, heightened: 0, alarm: { rung: 0, runner: null }, detectCd: 0,
    clouds: [], traps: [], baits: [], lobs: [], timers: [], waves: [], fires: [], balls: [], noises: [], shots: new E.Bullets(game, { plane: 'ground' }), cheats: Object.assign(CHEATS0(), o.cheats || {}),
    stats: { time: 0, silentCuts: 0, kills: 0, cleanKills: 0, detections: 0, civiliansHarmed: 0, optionalDone: 0, toolsUsed: 0, retries: 0, damageTaken: 0, marks: 0, cutKinds: {} },
    ended: false, failed: null, result: null, focus: false, cine: 0, holding: null, snap: null, t: 0, ghosts: [] };
  const W = M.world, fac = L.faction || 'kanemori';
  for (const s of L.guards || []) M.guards.push(Enemies.spawn(s, M, fac));
  for (const s of L.civilians || []) M.civs.push(Enemies.spawnCiv(s, M));
  if (L.boss) M.bosses.push(Bosses.spawn(L.boss, M));
  if (L.escort) M.escort = Escort.spawn(L.escort, M);
  M.bells = (L.bells || []).map(([cx, cy]) => ({ x: cellC(cx), y: cellC(cy), z: W.map.groundAt(cellC(cx), cellC(cy)) }));
  M.barracks = (L.barracks || []).map(([cx, cy]) => ({ x: cellC(cx), y: cellC(cy) }));
  M.pickups = (L.pickups || []).map((p, i) => ({ id: p.id || 'p' + i, kind: p.kind, tool: p.tool, n: p.n || 1, x: cellC(p.at[0]), y: cellC(p.at[1]), z: p.z !== undefined ? p.z : W.map.groundAt(cellC(p.at[0]), cellC(p.at[1])), taken: false, text: p.text, icon: p.icon }));
  M.interacts = (L.interact || []).map(s => Object.assign({ hold: 1, r: 18, done: false, progress: 0 }, s, { x: cellC(s.at[0]), y: cellC(s.at[1]), z: s.z !== undefined ? s.z : W.map.groundAt(cellC(s.at[0]), cellC(s.at[1])) }));
  M.objectives = (L.objectives || []).map(ob => Object.assign({ state: 'hidden', n: 0 }, ob));
  M.triggers = (L.triggers || []).map(t => Object.assign({ fired: false }, t));
  if (L.timer) M.timer = { t: L.timer.seconds, max: L.timer.seconds, spec: L.timer, stopped: false };
  // the hero, and its bento
  const hs = L.hero || { at: [2, 2] }, hx = cellC(hs.at[0]), hy = cellC(hs.at[1]);
  M.hero = Hero.make(M.char, { x: hx, y: hy, z: hs.z !== undefined ? hs.z : W.map.groundAt(hx, hy), facing: (hs.facing || 0) * Math.PI / 180 }, M);
  M.hero.bento = Bento.copy(o.loadout || Bento.fromHint((B.get('mission', M.missionId) || {}).loadoutHint || [['riceball', 2], ['shuriken', 10], ['smoke', 2]], o.save));
  M.exit = L.exit ? { x: cellC(L.exit.at[0]), y: cellC(L.exit.at[1]), r: (L.exit.r || 1.5) * T16 } : null;
  M.interact = (h, it) => Mission.interact(M, h, it);
  M.npcs = (L.npcs || []).map(n => { const x = cellC(n.at[0]), y = cellC(n.at[1]), a = Actor.make({ kind: 'npc', id: n.id, x, y, z: W.map.groundAt(x, y), facing: (n.facing || 0) * Math.PI / 180, rig: Rigs.make(n.rig, n.arg), team: 'npc' }); a.pose = n.pose; return a; });
  Mission.refreshObjectives(M, true);
  return M;
};
Mission.find = (M, id) => M.guards.find(g => g.id === id) || M.civs.find(c => c.id === id) || M.bosses.find(b => b.id === id) || (M.escort && M.escort.id === id ? M.escort : null);
/** each step of play (after the hero and the actors) */
Mission.update = (M, dt, it) => {
  if (M.ended) return;
  M.t += dt; M.stats.time += dt; M.detectCd -= dt; if (M.heightened !== Infinity) M.heightened = Math.max(0, M.heightened - dt); M.cine = Math.max(0, M.cine - dt);
  for (const n of M.noises) n.t -= dt; E.prune(M.noises, n => n.t <= 0);
  const h = M.hero, W = M.world;
  if (W.flash > 0) W.flash -= dt;
  // pickups on contact
  for (const p of M.pickups) if (!p.taken && Math.hypot(p.x - h.x, p.y - h.y) < 12 && Math.abs(p.z - h.z) < 12 && !h.dead) Mission.pick(M, p);
  // a held interaction (a lever, a cage, a mooring rope, the sake flask)
  if (M.holding) {
    const ix = M.holding;
    if (it.interactDown !== false && (it.interactDown || it.interactHold) && Math.hypot(ix.x - h.x, ix.y - h.y) < ix.r + 4 && !h.dead) {
      ix.progress += dt; if (ix.progress >= ix.hold) { Mission.doInteract(M, ix); M.holding = null; }
    } else { ix.progress = 0; M.holding = null; }
  }
  // the timer
  if (M.timer && !M.timer.stopped) { M.timer.t -= dt; if (M.timer.t <= 0) { M.timer.t = 0; M.timerFail = true; Mission.fail(M, M.timer.spec.fail || 'Time has run out.'); return; } }
  if (M.escort && !M.escort.alive && !M.failed) { Mission.fail(M, 'Tobei has fallen.'); return; }
  Mission.runTriggers(M);
  Mission.refreshObjectives(M);
  const req = M.objectives.filter(o => !o.optional);
  if (req.length && req.every(o => o.state === 'done') && !M.ended && !h.dead) Mission.complete(M);
};
Mission.pick = (M, p) => {
  p.taken = true; Au.sfx('pickup');
  if (p.kind === 'tool') { const n = Hero.give(M.hero, p.tool, p.n); B.Hud.toast('Found: ' + B.get('tool', p.tool).name, n ? '+' + n : 'The bento is full.'); }
  else if (p.kind === 'heal') { M.hero.hp = Math.min(M.hero.maxHp, M.hero.hp + 40); B.Hud.toast('A rice ball', '+40 health'); }
  else B.Hud.toast(p.text || 'Found it', '');
  B.emit('pickup', { pickup: p }); Pt.glints(p.x, p.y, p.z + 8, 10, '#ffe08a');
};
/** Interact pressed: Tobei's wait / follow, then a held interaction in reach */
Mission.interact = (M, h, it) => {
  let best = null, bd = 1e9; for (const ix of M.interacts) { if (ix.done || !Mission.interactReady(M, ix)) continue; const d = Math.hypot(ix.x - h.x, ix.y - h.y); if (d < ix.r + 4 && d < bd && Math.abs(ix.z - h.z) < 14) { bd = d; best = ix; } }
  const e = M.escort; if (!best && e && e.alive && !e.caged && Math.hypot(e.x - h.x, e.y - h.y) < 22) return Escort.toggle(e, M);
  if (!best) return false;
  if (!best.hold) { Mission.doInteract(M, best); return true; }
  M.holding = best; best.progress = 0; return true;
};
Mission.interactReady = (M, ix) => !ix.requires || Mission.cond(M, ix.requires);
Mission.nearInteract = (M, h) => { for (const ix of M.interacts) if (!ix.done && Mission.interactReady(M, ix) && Math.hypot(ix.x - h.x, ix.y - h.y) < ix.r + 4 && Math.abs(ix.z - h.z) < 14) return ix; return null; };
Mission.doInteract = (M, ix) => {
  ix.done = true; ix.progress = ix.hold; Au.sfx(ix.sfx || 'lever'); B.emit('interact', { id: ix.id, ix });
  Mission.actions(M, ix.do || []);
};
/** a condition string: 'objective:kill', 'kill:kanemori', 'alert', 'time:30', 'pickup:ledger', 'flag:x', 'boss:gonroku', 'interact:lever' */
Mission.cond = (M, c) => {
  const [k, v] = String(c).split(':');
  if (k === 'objective') { const o = M.objectives.find(o => o.id === v); return !!o && o.state === 'done'; }
  if (k === 'kill') { const a = Mission.find(M, v); return !!a && !a.alive; }
  if (k === 'alert') return M.guards.some(g => g.alive && g.mind && g.mind.state === 'alert');
  if (k === 'time') return M.t >= +v;
  if (k === 'pickup') { const p = M.pickups.find(p => p.id === v); return !!p && p.taken; }
  if (k === 'flag') return !!M.flags[v];
  if (k === 'boss') { const b = M.bosses.find(b => b.id === v); return !!b && b.defeated; }
  if (k === 'interact') { const ix = M.interacts.find(i => i.id === v); return !!ix && ix.done; }
  if (k === 'marks') return M.stats.marks >= +v;
  return false;
};
Mission.runTriggers = M => {
  const h = M.hero;
  for (const t of M.triggers) {
    if (t.fired && t.once !== false) continue;
    let ok = true;
    if (t.rect) { const cx = h.x / T16, cy = h.y / T16; ok = cx >= t.rect[0] && cx <= t.rect[2] + 1 && cy >= t.rect[1] && cy <= t.rect[3] + 1 && (t.z === undefined || h.z >= t.z - 2); }
    if (ok && t.at) ok = Math.hypot(h.x - cellC(t.at[0]), h.y - cellC(t.at[1])) < (t.r || 1.5) * T16;
    if (ok && t.when) ok = [].concat(t.when).every(c => Mission.cond(M, c));
    if (ok && h.dead) ok = false;
    if (!ok) continue;
    if (t.fired && t.once === false && t.latch) continue;
    t.fired = true; Mission.actions(M, t.do || []);
  }
};
Mission.actions = (M, list) => {
  for (const a of list) {
    const [k, ...p] = a;
    if (k === 'say') B.Cutscene.radio(p[0], B.Story.text(p[1], M.char), p[2]);
    else if (k === 'dialog') B.Cutscene.dialog(p[0], M.char);
    else if (k === 'toast') B.Hud.toast(p[0], p[1] || '');
    else if (k === 'tutorial') B.Hud.tutorial(p[0], p[1] || '', p[2]);
    else if (k === 'checkpoint') Mission.checkpoint(M);
    else if (k === 'spawn') M.guards.push(Enemies.spawn(p[0], M, M.level.faction));
    else if (k === 'boss') { const b = M.bosses.find(b => b.id === p[0]); if (b) Bosses.start(b, M); }
    else if (k === 'objective') { const o = M.objectives.find(o => o.id === p[0]); if (o) { if (p[1] === 'show' && o.state === 'hidden') { o.state = 'active'; o.forced = true; B.emit('objective', { obj: o, state: 'active' }); } else if (p[1] === 'done') Mission.setObj(M, o, 'done'); else if (p[1] === 'fail') Mission.setObj(M, o, 'failed'); } }
    else if (k === 'open') M.world.setCells(p[0], p[1], p[2] || 1, p[3] || 1, p[4] || '.');
    else if (k === 'close') M.world.setCells(p[0], p[1], p[2] || 1, p[3] || 1, p[4] || '#');
    else if (k === 'music') B.Music.play(p[0]);
    else if (k === 'flag') M.flags[p[0]] = p[1] === undefined ? true : p[1];
    else if (k === 'heal') M.hero.hp = M.hero.maxHp;
    else if (k === 'release') { const e = M.escort; if (e) { e.caged = false; e.follow = true; Brain.bark(e, 'tobeiFreed', true); B.Cutscene.radio('tobei', B.Story.text('tobei_freed', M.char)); } }
    else if (k === 'stopTimer') { if (M.timer) { M.timer.stopped = true; B.Hud.toast('The poison is gone', 'The lord’s cup is safe.'); } }
    else if (k === 'prop') { const pr = M.world.props.find(q => q.id === p[0] && toCell(q.x) === p[1] && toCell(q.y) === p[2]); if (pr) pr.id = p[3]; }
    else if (k === 'drift') { for (const pr of M.world.props) if (pr.id === 'riceBarge' && Math.hypot(toCell(pr.x) - p[0], toCell(pr.y) - p[1]) < 3) pr.drift = true; }
    else if (k === 'cower') { const c = Mission.find(M, p[0]); if (c) c.cowerAt = { x: cellC(p[1]), y: cellC(p[2]), z: 0 }; }
    else if (k === 'kill') { const g = Mission.find(M, p[0]); if (g) { g.alive = false; } }
    else if (k === 'remove') { const g = Mission.find(M, p[0]); if (g) { g.alive = false; g.sunk = true; g.marked = true; Pt.smoke(g.x, g.y, g.z + 12, 8, { size: 2 }); } }
    else if (k === 'give') Hero.give(M.hero, p[0], p[1] || 1);
    else if (k === 'cutscene') B.Cutscene.play(p[0], M.char);
  }
};
Mission.setObj = (M, o, st) => {
  if (o.state === st || o.state === 'done' || o.state === 'failed') return;
  o.state = st;
  if (st === 'done') { Au.sfx('stingObjective'); if (o.optional) M.stats.optionalDone++; B.Hud.toast(o.optional ? 'Optional task done' : 'Objective done', o.text); }
  B.emit('objective', { obj: o, state: st });
};
/** objectives: hidden until their 'after' list is done; done when their condition holds */
Mission.refreshObjectives = (M, quiet) => {
  const h = M.hero;
  for (const o of M.objectives) {
    if (o.state === 'done' || o.state === 'failed') continue;
    const ready = !o.after || o.after.every(id => { const p = M.objectives.find(q => q.id === id); return p && p.state === 'done'; });
    if (o.state === 'hidden' && (ready || o.forced) && !o.secret) { o.state = 'active'; if (!quiet) { B.Hud.objective(o); B.emit('objective', { obj: o, state: 'active' }); } }
    if (o.state !== 'active' && !(o.optional && ready)) continue;
    let done = false;
    if (o.type === 'assassinate') { const a = Mission.find(M, o.target); done = !!a && !a.alive; }
    else if (o.type === 'retrieve') { const p = M.pickups.find(p => p.id === o.pickup); done = !!p && p.taken; }
    else if (o.type === 'rescue') done = !!M.escort && !M.escort.caged;
    else if (o.type === 'escort') { const e = M.escort, z = o.zone; done = !!e && e.alive && !e.caged && (z ? toCell(e.x) >= z[0] && toCell(e.x) <= z[2] && toCell(e.y) >= z[1] && toCell(e.y) <= z[3] : M.exit && Math.hypot(e.x - M.exit.x, e.y - M.exit.y) < M.exit.r + 8); }
    else if (o.type === 'reach') { if (o.zone) done = toCell(h.x) >= o.zone[0] && toCell(h.x) <= o.zone[2] && toCell(h.y) >= o.zone[1] && toCell(h.y) <= o.zone[3] && (o.z === undefined || h.z >= o.z - 2); else done = !!M.exit && Math.hypot(h.x - M.exit.x, h.y - M.exit.y) < M.exit.r && Math.abs(h.z - M.world.map.groundAt(M.exit.x, M.exit.y)) < 20; done = done && ready; }
    else if (o.type === 'defeat') { const b = M.bosses.find(b => b.id === o.boss); done = !!b && b.defeated; }
    else if (o.type === 'interact') { const ids = [].concat(o.interact); o.n = M.interacts.filter(i => ids.includes(i.id) && i.done).length; done = o.n >= (o.count || ids.length); }
    else if (o.type === 'stopTimer') done = !!M.timer && M.timer.stopped;
    else if (o.type === 'flag') done = !!M.flags[o.flag];
    else if (o.type === 'marks') { o.n = M.stats.marks; done = o.n >= o.count; }
    else if (o.type === 'killAll') { const ids = [].concat(o.targets); o.n = ids.filter(id => { const a = Mission.find(M, id); return !a || !a.alive; }).length; done = o.n >= ids.length; }
    if (done && (ready || o.optional)) Mission.setObj(M, o, 'done');
  }
};
Mission.complete = M => { if (M.ended) return; M.ended = true; M.result = 'win'; B.emit('missionEnd', { M, win: true }); };
/** the generic fail hook: mission.fail(reason) (Tobei has fallen, time is up, the target escaped) */
Mission.fail = (M, reason) => { if (M.ended) return; M.ended = true; M.failed = reason; M.result = 'fail'; Au.sfx('stingOver'); B.emit('missionEnd', { M, win: false, reason }); };
/* ---- CHECKPOINTS: a snapshot of where things are; retry rebuilds the level and puts it back (guards calm, at their
 * route starts; the level stays heightened if it was) ---- */
Mission.checkpoint = (M, why) => {
  if (M.mode === 'hub' || M.mode === 'attract') return;
  const h = M.hero;
  M.snap = { hero: { x: h.x, y: h.y, z: h.z, facing: h.facing }, bento: Bento.copy(h.bento), rows: M.world.rows.slice(), stats: deepCopy(M.stats), flags: deepCopy(M.flags), t: M.t,
    dead: M.guards.concat(M.civs).filter(g => !g.alive).map(g => ({ id: g.id, x: g.x, y: g.y, z: g.z, facing: g.facing, sunk: g.sunk, hidden: g.hidden, found: g.found, marked: g.marked })),
    asleep: M.guards.filter(g => g.alive && (g.asleep || g.status.sleep > 0)).map(g => g.id), unmasked: M.guards.filter(g => g.unmasked).map(g => g.id),
    objectives: M.objectives.map(o => ({ id: o.id, state: o.state, n: o.n })), triggers: M.triggers.map(t => t.fired), pickups: M.pickups.map(p => p.taken), interacts: M.interacts.map(i => i.done),
    timer: M.timer ? { t: M.timer.t, stopped: M.timer.stopped } : null, heightened: M.heightened, alarm: M.alarm.rung,
    escort: M.escort ? { x: M.escort.x, y: M.escort.y, caged: M.escort.caged, follow: M.escort.follow, wait: M.escort.wait, hp: M.escort.hp } : null,
    bosses: M.bosses.map(b => ({ id: b.id, defeated: b.defeated, active: b.active, x: b.x, y: b.y, z: b.z })), props: M.world.props.map(p => p.id), music: B.Music.cur };
  if (why !== 'quiet') { B.Hud.toast('Checkpoint', ''); B.emit('checkpoint', {}); }
};
/** rebuild the mission at its checkpoint (or from the start); returns the new mission */
Mission.restore = (M, snap) => {
  const N = Mission.create(M.level, { mode: M.mode, char: M.char, missionId: M.missionId, loadout: snap ? snap.bento : M.startLoadout, cheats: M.cheats });
  N.startLoadout = M.startLoadout; N.levelSpec = M.levelSpec;
  if (!snap) { N.stats.retries = M.stats.retries + 1; return N; }
  const W = N.world;
  for (let y = 0; y < W.h; y++) if (snap.rows[y] !== W.rows[y]) for (let x = 0; x < W.w; x++) if (snap.rows[y][x] !== W.rows[y][x]) W.setCells(x, y, 1, 1, snap.rows[y][x]);
  Object.assign(N.hero, snap.hero); N.hero.hp = N.hero.maxHp;
  N.stats = Object.assign(deepCopy(snap.stats), { retries: M.stats.retries + 1 }); N.flags = deepCopy(snap.flags); N.t = snap.t;
  for (const id of snap.unmasked) { const c = N.civs.find(c => c.id === id); if (c) Enemies.unmask(c, N); }
  for (const d of snap.dead) { const g = Mission.find(N, d.id); if (g) Object.assign(g, { alive: false, x: d.x, y: d.y, z: d.z, facing: d.facing, sunk: d.sunk, hidden: d.hidden, found: d.found, marked: d.marked, hp: 0 }); }
  for (const id of snap.asleep) { const g = Mission.find(N, id); if (g) g.asleep = true; }
  snap.objectives.forEach(o => { const q = N.objectives.find(x => x.id === o.id); if (q) { q.state = o.state; q.n = o.n; } });
  snap.triggers.forEach((f, i) => { if (N.triggers[i]) N.triggers[i].fired = f; });
  snap.pickups.forEach((f, i) => { if (N.pickups[i]) N.pickups[i].taken = f; });
  snap.interacts.forEach((f, i) => { if (N.interacts[i]) { N.interacts[i].done = f; if (f) N.interacts[i].progress = N.interacts[i].hold; } });
  snap.props.forEach((id, i) => { if (N.world.props[i]) N.world.props[i].id = id; });
  if (snap.timer && N.timer) Object.assign(N.timer, snap.timer);
  N.heightened = snap.heightened; N.alarm.rung = snap.alarm;
  if (snap.escort && N.escort) Object.assign(N.escort, snap.escort, { z: W.map.groundAt(snap.escort.x, snap.escort.y) });
  for (const sb of snap.bosses) { const b = N.bosses.find(q => q.id === sb.id); if (b && sb.defeated) { b.defeated = true; b.alive = b.D.spar; b.hp = b.D.spar ? 1 : 0; Object.assign(b, { x: sb.x, y: sb.y, z: sb.z }); if (b.id === 'kurogane' || b.id === 'hotaru') b.sunk = b.id === 'hotaru'; } }
  N.snap = snap; N.music = snap.music;
  return N;
};
B.Mission = Mission;
