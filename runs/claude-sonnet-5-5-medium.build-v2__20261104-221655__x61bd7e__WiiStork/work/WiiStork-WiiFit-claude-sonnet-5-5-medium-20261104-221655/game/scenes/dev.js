// Dev Mode: a canvas panel on the left third while the game keeps running; Pose Viewer
(() => {
const E = My3D2dge, G = window.G, { px } = E, C = G.C;
const SCENES = ['title', 'member', 'bungalow', 'bodycheck', 'island', 'evening', 'recal', 'games', 'ending', 'credits', 'freeplay', 'class', 'about'];
const dev = G.dev = { open: false, i: 0, hover: false, rows: [], scroll: 0, t: 0, jump: { scene: 0, act: 0, tier: 0, day: 0 }, botI: 0, ageI: 0, fi: 0, drag: -1, rects: [], msg: '' };
const AGES = [71, 58, 40, 24, 19], BOTS = [null, 'poor', 'average', 'good', 'expert'];
const log = m => { dev.msg = m; dev.msgT = 3; };
function rows() {
  const R = []; const D = G.DEVDEF;
  R.push({ t: 'tool', label: 'Reset to defaults', run: () => { G.devReset(); log('Defaults restored'); } });
  R.push({ t: 'tool', label: () => 'Scene: ' + SCENES[dev.jump.scene], adj: d => { dev.jump.scene = (dev.jump.scene + d + SCENES.length) % SCENES.length; }, run: () => { dev.close(); G.noSave = G.noSave; G.game.go(SCENES[dev.jump.scene], { mode: 'new' }); } });
  R.push({ t: 'tool', label: () => 'Activity: ' + G.actList[dev.jump.act].name + ' T' + (dev.jump.tier + 1), adj: d => { if (Math.abs(d) === 1 && !G.dev.fine) { dev.jump.act = (dev.jump.act + d + G.actList.length) % G.actList.length; dev.jump.tier = Math.min(dev.jump.tier, G.actList[dev.jump.act].tiers.length - 1); } }, run: () => { const a = G.actList[dev.jump.act]; dev.close(); G.lastActData = { mode: 'free', tier: dev.jump.tier + 1, back: 'title' }; G.game.go('act_' + a.id, Object.assign({}, G.lastActData)); }, alt: () => { const a = G.actList[dev.jump.act]; dev.jump.tier = (dev.jump.tier + 1) % a.tiers.length; } });
  R.push({ t: 'tool', label: () => 'Day: ' + (dev.jump.day + 1), adj: d => { dev.jump.day = (dev.jump.day + d + 5) % 5; }, run: () => { dev.close(); const S = G.S; S.started = S.arrived = true; S.day = dev.jump.day + 1; S.done = 0; S.checked = false; if (!S.inst) S.inst = 'birch'; if (!S.spine.length) S.spine = [71]; G.game.go('bungalow'); } });
  R.push({ t: 'tool', label: 'Finish now: 3 stars', run: () => finish(3) }); R.push({ t: 'tool', label: 'Finish now: 2 stars', run: () => finish(2) }); R.push({ t: 'tool', label: 'Finish now: 0 stars', run: () => finish(0) });
  R.push({ t: 'tool', label: 'Unlock all', run: () => { const S = G.S; S.free = true; S.minutes = Math.max(S.minutes, 30); S.unlocked = G.UNLOCKS.map(u => u.id); G.devUnlocked = true; log('Everything is open'); } });
  R.push({ t: 'tool', label: '+10 minutes', run: () => { G.S.minutes += 10; G.unlockCheck(); log('Gerald: ' + G.S.minutes.toFixed(1)); } });
  R.push({ t: 'tool', label: () => 'Spine Age: ' + AGES[dev.ageI], adj: d => { dev.ageI = (dev.ageI + d + AGES.length) % AGES.length; }, run: () => { G.S.shownAge = AGES[dev.ageI]; G.S.spine.push(AGES[dev.ageI]); log('Spine Age set'); } });
  R.push({ t: 'tool', label: 'Reset this member', run: () => { const sl = G.S.slot; const keep = { name: G.S.name, look: G.S.look }; G.S = G.fresh(sl); Object.assign(G.S, keep, { started: true }); log('Member reset'); } });
  R.push({ t: 'tool', label: () => 'No stumbles: ' + (G.devFlags.noStumble ? 'on' : 'off'), run: () => { G.devFlags.noStumble = !G.devFlags.noStumble; } });
  R.push({ t: 'tool', label: () => 'Bot plays: ' + (BOTS[dev.botI] || 'off'), adj: d => { dev.botI = (dev.botI + d + BOTS.length) % BOTS.length; G.devFlags.bot = BOTS[dev.botI]; }, run: () => { dev.botI = (dev.botI + 1) % BOTS.length; G.devFlags.bot = BOTS[dev.botI]; } });
  R.push({ t: 'tool', label: () => 'Plate numbers: ' + (G.devFlags.trace ? 'on' : 'off'), run: () => { G.devFlags.trace = !G.devFlags.trace; } });
  R.push({ t: 'tool', label: () => 'Frame step (paused: ' + (G.game.timeScale === 0 ? 'yes' : 'no') + ')', run: () => { if (G.game.timeScale !== 0) { G.game.timeScale = 0; G.DEV.timeScale = 0; } else { G.game.advance && G.game.advance(1 / 60 / Math.max(.25, 1)); } }, alt: () => { G.DEV.timeScale = 1; G.game.timeScale = 1; } });
  R.push({ t: 'tool', label: 'Force attract', run: () => { dev.close(); G.game.go('attract'); } });
  R.push({ t: 'tool', label: 'Pose Viewer', run: () => { dev.close(); G.game.go('poseviewer'); } });
  R.push({ t: 'tool', label: 'Log snapshot to console', run: () => { const s = G.game.debug.snapshot(); console.log('snapshot', JSON.stringify(s)); log('Logged'); } });
  for (const [gname, keys] of G.DEVGROUPS) { R.push({ t: 'head', label: gname }); for (const k of keys) R.push({ t: 'slider', key: k }); }
  return R;
}
function finish(n) { const run = G.curRun; if (!run) { log('No activity running'); return; } run.force = n; run.done = true; for (const c of run.cs) { const thr = G.thresholds(run.def, run.tier); c.pct = n === 0 ? .01 : thr[n - 1] + .012; c.score = Math.round(c.pct * 1000); } dev.close(); log('Finished'); }
dev.open = function () { if (G.inSession) return; dev.rows = rows(); dev.isOpen = true; G.devFlags.open = true; dev.i = 0; G.game.input.consumeAll(); G.devOpened = true; };
dev.close = function () { dev.isOpen = false; G.devFlags.open = false; dev.hover = false; };
Object.defineProperty(dev, 'open_', { get: () => dev.isOpen });
Object.defineProperty(G.devFlags, 'open', { get: () => dev.isOpen === true, set: v => { dev.isOpen = v; } });
dev.step = function (dt) {
  const input = G.game.input; dev.t += dt; if (dev.msgT > 0) dev.msgT -= dt;
  const n = dev.rows.length, move = d => { let k = dev.i; do { k = (k + d + n) % n; } while (dev.rows[k].t === 'head'); dev.i = k; G.snd('tick'); };
  const row = dev.rows[dev.i];
  if (input.repeat('dvU')) move(-1); else if (input.repeat('dvD')) move(1);
  const coarse = input.down('dvCL') || input.down('dvCR'), rl = input.repeat('dvL', .3, .05) || input.pressed('dvCL'), rr = input.repeat('dvR', .3, .05) || input.pressed('dvCR');
  const held = Math.min(5, 1 + (input.down('dvL') || input.down('dvR') ? 0 : 0));
  if ((rl || rr) && row) { const d = rr ? 1 : -1; if (row.t === 'slider') { const [lo, hi, st, def] = G.DEVDEF[row.key]; row.h = (row.h || 0) + 1; const mult = (coarse ? 5 : 1) * (row.h > 8 ? 3 : 1); G.DEV[row.key] = G.clamp(Math.round((G.DEV[row.key] + d * st * mult) / st) * st, lo, hi); if (row.key === 'timeScale') G.game.timeScale = G.DEV.timeScale; } else if (row.adj) row.adj(d); }
  if (!input.down('dvL') && !input.down('dvR')) for (const r of dev.rows) r.h = 0;
  if (input.pressed('confirm') && row && row.t === 'tool' && row.run) { G.snd('ok'); row.run(); }
  if (input.pressed('cancel')) dev.close();
  // mouse
  const p = input.pointer && input.pointer(), pw = Math.floor(G.game.W / 3);
  dev.hover = !!(p && p[0] < pw && dev.isOpen);
  if (dev.hover) { const c = input.clicked && input.clicked(); const down = input.down && input.down('breath') && false;
    const idx = dev.rects.findIndex(q => p[1] >= q[1] && p[1] < q[1] + q[3]);
    if (idx >= 0 && dev.rows[idx] && dev.rows[idx].t !== 'head' && c) { dev.i = idx; const rw = dev.rows[idx]; if (rw.t === 'slider') { setSlider(rw, c[0], pw); dev.drag = idx; } else if (rw.t === 'tool' && rw.run) { rw.run(); } }
    if (dev.drag >= 0 && input.down('catchL')) setSlider(dev.rows[dev.drag], p[0], pw); else dev.drag = -1; }
};
function setSlider(rw, x, pw) { const [lo, hi, st] = G.DEVDEF[rw.key], k = G.clamp((x - (pw - 34)) / 30, 0, 1); G.DEV[rw.key] = G.clamp(Math.round((lo + (hi - lo) * k) / st) * st, lo, hi); if (rw.key === 'timeScale') G.game.timeScale = G.DEV.timeScale; }
dev.draw = function (r) {
  if (!dev.isOpen) { if (dev.msgT > 0) r.overlay(g => G.txt(g, dev.msg, 8, r.H - 14, C.INK, { shadow: '#fff' })); return; }
  const pw = Math.floor(r.W / 3), n = dev.rows.length, rh = 11, vis = Math.floor((r.H - 20) / rh), start = G.clamp(dev.i - (vis >> 1), 0, Math.max(0, n - vis)); dev.rects = [];
  r.overlay(g => {
    px.blend(g, .94, 'normal', () => px.rect(g, 0, 0, pw, r.H, '#f6fafa')); px.rect(g, pw, 0, 1, r.H, C.ACC);
    G.txt(g, 'DEV MODE  ·  ' + (G.curRun ? G.curRun.def.id : G.game.sceneName), 4, 3, C.ACC2); 
    for (let k = 0; k < vis; k++) { const i = start + k; if (i >= n) break; const row = dev.rows[i], y = 14 + k * rh, foc = i === dev.i; dev.rects[i] = [0, y, pw, rh];
      if (row.t === 'head') { G.txt(g, row.label.toUpperCase(), 4, y + 2, C.MUTED); continue; }
      if (foc) px.rect(g, 0, y, pw, rh, '#c8f0f8');
      if (row.t === 'tool') G.txt(g, typeof row.label === 'function' ? row.label() : row.label, 6, y + 2, foc ? C.INK : C.INK);
      else { const [lo, hi, st, def, name] = G.DEVDEF[row.key], v = G.DEV[row.key], dec = st < .1 ? 2 : st < 1 ? 1 : 0; G.txt(g, name.replace(/^[A-Za-z ]+: /, '').slice(0, 15), 6, y + 2, C.INK); const bx = pw - 34, k2 = (v - lo) / (hi - lo), dk = (def - lo) / (hi - lo); px.rect(g, bx, y + 5, 30, 2, '#c8dde2'); px.rect(g, bx + dk * 30, y + 3, 1, 6, C.MUTED); px.rect(g, bx, y + 5, 30 * k2, 2, v === def ? C.ACC : C.CORAL); px.disc(g, bx + 30 * k2, y + 6, 2.5, v === def ? C.ACC2 : C.CORAL); G.txt(g, v.toFixed(dec), bx - 4, y + 2, v === def ? C.MUTED : C.CORAL, { align: 'right' }); }
    }
    G.txt(g, 'Arrows/D-pad move + adjust, X do, O close', 4, r.H - 9, C.MUTED); if (dev.msgT > 0) G.txt(g, dev.msg, pw + 6, r.H - 14, C.INK, { shadow: '#fff' });
    if (G.devFlags.trace && G.curRun) { const c = G.curRun.cs[0]; G.txt(g, 'p ' + c.bal.p.x.toFixed(2) + ',' + c.bal.p.y.toFixed(2) + ' v ' + c.bal.speed.toFixed(2) + ' f ' + c.bal.falls + ' st ' + (c.bal.steadiness * 100 | 0) + '%', pw + 6, 6, C.INK, { shadow: '#fff' }); }
  });
};
// wrap every scene so the panel runs over it
G.wrapDev = scenes => { for (const k in scenes) { const sc = scenes[k]; if (sc.__dev) continue; sc.__dev = true; const u = sc.update, d = sc.draw, en = sc.enter; sc.enter = function (a) { if (G.talk && G.talk.open) G.talk.close(); G.cap = null; try { G.game.follow(null); G.game.cam.bounds = null; } catch (e) {} return en && en.call(this, a); }; sc.update = function (dt) { if (dev.isOpen) dev.step(dt); if (u) return u.call(this, dt); }; sc.draw = function (r) { if (d) d.call(this, r); dev.draw(r); }; } };
// Pose Viewer: pick any clip, scrub, print a pose row for game/data/poses.js
G.scenes.poseviewer = {
  pausable: false, view: 'brawler', camera: { zoom: false }, res: 'ps1', expand: true, input: G.INPUT,
  enter() { this.names = G.lib().names; this.ci = 0; this.t = 0; this.a = null; this.fig = G.playerFigure({ x: 0, y: 8, tgt: 1.5 }); this.fig.rig.o.size = 2.2; this.msg = ''; this.sync(); },
  sync() { const c = G.lib().clip(this.names[this.ci]); this.dur = c.dur; this.t = Math.min(this.t, this.dur); },
  update(dt) { const i = G.game.input; if (i.repeat('dvU')) { this.ci = (this.ci + this.names.length - 1) % this.names.length; this.t = 0; this.a = null; this.sync(); } else if (i.repeat('dvD')) { this.ci = (this.ci + 1) % this.names.length; this.t = 0; this.a = null; this.sync(); }
    const sp = i.down('dvCL') || i.down('dvCR') ? 1.5 : .5; if (i.down('dvL')) this.t = Math.max(0, this.t - sp * dt); if (i.down('dvR')) this.t = Math.min(this.dur, this.t + sp * dt);
    if (i.pressed('confirm')) { if (this.a == null) { this.a = this.t; this.msg = 'Window starts at ' + this.a.toFixed(2); } else { const row = "  name: { clip: '" + this.names[this.ci] + "', a: " + this.a.toFixed(1) + ', b: ' + this.t.toFixed(1) + ', tgt: 1.57 },'; console.log(row); this.msg = row.trim(); this.a = null; } }
    if (i.pressed('cancel')) G.game.go('title'); this.fig.scrub(this.names[this.ci], this.t); this.fig.update(dt); },
  draw(r) { G.game.focus(0, 0, 18); G.rooms.deck(r, 0); this.fig.draw(r); r.overlay(g => { G.rr(g, 8, 8, 240, 52, C.WHITE); G.txt(g, 'Pose Viewer', 14, 12, C.ACC2); G.txt(g, this.names[this.ci] + '  ' + this.t.toFixed(2) + ' / ' + this.dur.toFixed(2) + 's', 14, 24, C.INK); G.txt(g, 'Up/Down clip, Left/Right scrub, X mark start then end', 14, 36, C.MUTED); G.txt(g, this.msg, 14, 46, C.CORAL); }); }
};
})();
