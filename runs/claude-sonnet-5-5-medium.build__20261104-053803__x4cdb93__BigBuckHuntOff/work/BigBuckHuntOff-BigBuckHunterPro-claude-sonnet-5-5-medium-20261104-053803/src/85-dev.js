/* Dev mode: live sliders with reset, tools, overlays, free camera, Animal Lab, Sound Lab. Opened from the pause menu. */
(() => {
const BB = globalThis.BB, E = BB.E, px = E.px, clamp = BB.clamp, txt = BB.txt;
const D = BB.dev; D.row = 0; D.lab = null; D.labI = 0; D.confirmReset = false; D.jump = { kind: 0, i: 0 }; D.botSkill = 0; D.msg = '';
const TABS = ['SLIDERS', 'TOOLS', 'OVERLAYS', 'LABS'];
const ctxNow = () => BB.curSite;
const JUMPS = () => {
  const out = [];
  for (const h of BB.HUNT_LIST) { const p = BB.HUNT_PLAN[h]; p.sites.forEach(s => out.push([BB.SITES[s].name + ' (site)', s])); out.push([BB.SITES[p.trophy].name + ' (trophy)', p.trophy]); out.push([BB.BONUS[p.bonus].name + ' (bonus)', 'bonus_' + p.bonus]); }
  out.push(["Uncle Dub's Range", 'range']); return out;
};
BB.devOpened = () => { D.confirmReset = false; D.msg = ''; };
function sliderRows() { return BB.TUNING_DEFS.map(d => ({ kind: 'slider', def: d })); }
function toolRows() {
  const ctx = ctxNow(), P = () => BB.players[0];
  const J = JUMPS();
  return [
    { label: () => D.freeze ? 'Unfreeze simulation' : 'Freeze simulation', fn: () => { D.freeze = !D.freeze; } },
    { label: () => D.slow ? 'Normal speed' : 'Slow motion (0.25x)', fn: () => { D.slow = !D.slow; BB.game.timeScale = D.slow ? .25 : 1; } },
    { label: () => 'Skip segment', fn: () => { const c = ctxNow(); if (c && c.state === 'play') { c.t = c.timeLimit; D.msg = 'Skipped'; } } },
    { label: () => 'Bag all bucks', fn: () => BB.devBagAll() },
    { label: () => 'Spawn buck at reticle', fn: () => BB.devSpawn('buck') },
    { label: () => 'Spawn doe at reticle', fn: () => BB.devSpawn('doe') },
    { label: () => 'Spawn trophy buck at reticle', fn: () => BB.devSpawn('trophy') },
    { label: () => 'Spawn critter at reticle', fn: () => BB.devSpawn('critter') },
    { label: () => 'Kill all animals', fn: () => { const c = ctxNow(); if (c) for (const a of c.animals) { a.dead = true; a.deadT = 0; a.mode = 'dead'; } for (const cr of (c ? c.critters : [])) { cr.dead = true; } } },
    { label: () => 'Refill ammo' + (D.infinite ? ' (infinite: ON)' : ''), fn: () => { D.infinite = !D.infinite; for (const p of BB.players) { p.rounds = Math.round(BB.T.rounds); p.chambered = true; p.calls = 9; } } },
    { label: () => 'God mode: ' + (D.god ? 'ON' : 'off'), fn: () => { D.god = !D.god; } },
    { label: () => 'Jump to: ' + J[D.jump.i % J.length][0], hint: 'left/right picks, confirm jumps', adj: d => { D.jump.i = (D.jump.i + d + J.length) % J.length; }, fn: () => BB.devJump(J[D.jump.i % J.length][1]) },
    { label: () => 'Bot plays: ' + ['off', 'novice', 'average', 'expert'][D.botSkill], adj: d => { D.botSkill = (D.botSkill + d + 4) % 4; BB.devBot(D.botSkill); }, fn: () => { D.botSkill = (D.botSkill + 1) % 4; BB.devBot(D.botSkill); } },
    { label: () => 'Free camera: ' + (D.freecam ? 'ON' : 'off'), fn: () => { D.freecam = !D.freecam; const c = ctxNow(); if (c) { c.yawOverride = D.freecam ? c.view.yaw * 180 / Math.PI : undefined; D.cam = { yaw: c.yawOverride || 0, camH: c.view.camH, fov: c.view.fov }; } } },
    { label: () => 'Unlock all trophies', fn: () => { for (const t of ['ironrack', 'duke', 'bigmo']) BB.records.mounts[t] = true; BB.saveRecords(); D.msg = 'Mounts unlocked'; } },
    { label: () => D.confirmReset ? 'Really reset save data? press again' : 'Reset save data', fn: () => { if (D.confirmReset) { BB.resetRecords(); D.confirmReset = false; D.msg = 'Save data reset'; } else D.confirmReset = true; } },
    { label: () => 'Copy snapshot (console)', fn: () => { const s = JSON.stringify(BB.snapshot()); try { console.log(s); if (navigator.clipboard) navigator.clipboard.writeText(s); } catch (e) { /* ignore */ } D.msg = 'Snapshot logged'; } },
    { label: () => 'Reset ALL sliders to defaults', fn: () => { BB.resetTuning(); BB.game.timeScale = 1; D.msg = 'Sliders reset'; } }
  ];
}
function overlayRows() { return [['zones', 'Hit volumes'], ['labels', 'Actor state labels'], ['fps', 'Frame-rate readout']].map(([k, l]) => ({ label: () => l + ': ' + (D.overlays[k] ? 'ON' : 'off'), fn: () => { D.overlays[k] = !D.overlays[k]; } })); }
function labRows() { return [{ label: () => 'Animal Lab', fn: () => { D.lab = 'animal'; D.labI = 0; } }, { label: () => 'Sound Lab', fn: () => { D.lab = 'sound'; D.labI = 0; } }]; }
const rowsFor = () => [sliderRows(), toolRows(), overlayRows(), labRows()][D.page];

/* tool helpers */
BB.devSpawn = (kind) => {
  const c = ctxNow(); if (!c) return; const p = BB.players[0] || { rx: 240, ry: 140 }, v = c.view;
  const D0 = clamp(v.camH * v.f / Math.max(2, (p.ry || 140) - v.hy), 10, 160); const [x, y] = BB.unproject(v, p.rx || 240, D0);
  if (kind === 'critter') { const type = c.hunt.id === 'hollow' ? 'rabbit' : c.hunt.id === 'bugle' ? 'marmot' : 'hare'; const cr = BB.makeCritter(type, { x, y, life: 25, mode: 'idle' }); if (BB.CRITTERS[type].motion === 'hop') { cr.def = Object.assign({}, cr.def, { motion: 'peek' }); } c.critters.push(cr); return; }
  const a = BB.makeAnimal({ species: c.hunt.species, sex: kind === 'doe' ? 'female' : 'male', pts: kind === 'trophy' ? 14 : 9, x, y, to: [x > 0 ? 80 : -80, y + 20] }, c); if (kind === 'trophy') a.trophyMult = 3;
  a.mode = 'graze'; a.linger = 12; c.animals.push(a); a.born = c.t;
};
BB.devBagAll = () => {
  const c = ctxNow(); if (!c) return; const p = BB.players[0];
  for (const a of c.animals) if (a.target && !a.dead && a.mode !== 'hidden') {
    const pr = BB.project(c.view, a.x, a.y, a.z) || [240, 140, 1, 40];
    a.hits.push({ p: p.idx, zone: 'heart', lx: .4, ly: .8, lethal: true }); a.dead = true; a.deadT = 0; a.mode = 'dead'; a.killer = p;
    const sp = BB.SPECIES[a.species], pts = Math.round(sp.base + sp.perPt * a.pts); p.siteScore += pts; p.kills++; p.siteKills++;
    c.kills.push({ id: a.id, name: sp.male, species: a.species, pts: a.pts, zone: 'heart', metres: Math.round(pr[3] || 30), running: false, quick: 0, multi: 0, score: pts, p: p.idx, shots: 1, trophy: !!a.trophyMult, hits: a.hits.slice() });
    BB.bus.emit('kill', { p, a, rec: c.kills[c.kills.length - 1] });
  }
  c.spawnIdx = c.spawns.length;
};
BB.devJump = id => {
  const H = BB.H; if (!H.run) return; const seg = { t: BB.SITES[id].bonus ? 'bonus' : 'site', id, hunt: BB.SITES[id].hunt };
  H.run.queue.splice(H.qi + 1, 0, seg); D.open = false; BB.game.timeScale = 1; BB.dev.open = false; H.qi += 0; BB.devJumpNow();
};
BB.devJumpNow = () => { const H = BB.H; H.nextHook && H.nextHook(); H.forceNext && H.forceNext(); };
BB.devBot = skill => {
  const c = ctxNow(); const p = BB.players[0]; if (!p) return;
  if (skill === 0) { p.bot = null; return; }
  p.bot = BB.makeBot(['novice', 'average', 'expert'][skill - 1], false); p.bot.rx = p.rx; p.bot.ry = p.ry; p.bot.auto = true;
};

/* ---------- update / draw ---------- */
BB.devUpdate = (I, dt) => {
  D.msg = D.msg || ''; const rows = rowsFor();
  if (D.lab) { return labUpdate(I, dt); }
  if (I.pressed('cancel') || I.pressed('pause')) { D.open = false; BB.game.timeScale = D.slow ? .25 : 1; return true; }
  if (I.padPrev && (I.padPrev[5] && !D._r1)) { D.page = (D.page + 1) % TABS.length; D.row = 0; } D._r1 = I.padPrev && I.padPrev[5];
  if (I.padPrev && (I.padPrev[4] && !D._l1)) { D.page = (D.page + TABS.length - 1) % TABS.length; D.row = 0; } D._l1 = I.padPrev && I.padPrev[4];
  if (I.pressed('call')) { D.page = (D.page + 1) % TABS.length; D.row = 0; BB.sfx('uiMove'); }
  if (I.pressed('scope')) { D.page = (D.page + TABS.length - 1) % TABS.length; D.row = 0; BB.sfx('uiMove'); }
  if (I.repeat('down', .3, .08)) { D.row = (D.row + 1) % rows.length; BB.sfx('uiMove'); }
  if (I.repeat('up', .3, .08)) { D.row = (D.row + rows.length - 1) % rows.length; BB.sfx('uiMove'); }
  const r = rows[D.row] || rows[0];
  const adj = I.repeat('left', .3, .06) ? -1 : I.repeat('right', .3, .06) ? 1 : 0;
  if (r.kind === 'slider') {
    const d = r.def, key = d[0];
    if (adj) { BB.T[key] = clamp(Math.round((BB.T[key] + adj * d[5]) / d[5]) * d[5], d[3], d[4]); BB.saveTuning(); if (key === 'timeScale') BB.game.timeScale = BB.T.timeScale; }
    if (I.pressed('confirm')) { BB.T[key] = d[2]; BB.saveTuning(); if (key === 'timeScale') BB.game.timeScale = 1; D.msg = d[1] + ' reset'; }
  } else {
    if (adj && r.adj) r.adj(adj);
    if (I.pressed('confirm')) { BB.sfx('uiOk'); r.fn(); }
  }
  /* mouse */
  const ptr = I.pointer && I.pointer(), clk = I.clicked && I.clicked();
  if (D.rects) { for (let i = 0; i < D.rects.length; i++) { const q = D.rects[i]; if (ptr && ptr[0] >= q[0] && ptr[0] < q[0] + q[2] && ptr[1] >= q[1] && ptr[1] < q[1] + q[3]) { if (D.lastPtr && Math.hypot(ptr[0] - D.lastPtr[0], ptr[1] - D.lastPtr[1]) > 1) D.row = i; } if (clk && clk[0] >= q[0] && clk[0] < q[0] + q[2] && clk[1] >= q[1] && clk[1] < q[1] + q[3]) { D.row = i; const rr = rows[i]; if (rr.kind === 'slider') { const d = rr.def, t = clamp((clk[0] - (q[0] + q[2] * .5)) / (q[2] * .5 - 8), 0, 1); BB.T[d[0]] = clamp(Math.round((d[3] + (d[4] - d[3]) * t) / d[5]) * d[5], d[3], d[4]); BB.saveTuning(); } else rr.fn(); } } D.lastPtr = ptr ? ptr.slice() : null; }
  if (clk) { for (let t = 0; t < TABS.length; t++) { const tr = D.tabRects && D.tabRects[t]; if (tr && clk[0] >= tr[0] && clk[0] < tr[0] + tr[2] && clk[1] >= tr[1] && clk[1] < tr[1] + tr[3]) { D.page = t; D.row = 0; } } }
  if (D.freecam) { freeCamUpdate(I, dt); }
  return D.freeze ? false : false;
};
function freeCamUpdate(I, dt) {
  const c = ctxNow(); if (!c || !D.cam) return; const m = I.move(), pa = I.padAim || [0, 0];
  D.cam.yaw += (m[0] * 30 + pa[0] * 30) * dt; D.cam.camH = clamp(D.cam.camH - (m[1] * 6 + pa[1] * 6) * dt, .5, 40); c.yawOverride = D.cam.yaw; c.view.camH = D.cam.camH; BB.updateView(c.view);
}
function labUpdate(I, dt) {
  const list = D.lab === 'animal' ? animalList() : soundList();
  if (I.pressed('cancel')) { D.lab = null; return true; }
  if (I.repeat('down', .3, .08)) D.labI = (D.labI + 1) % list.length; if (I.repeat('up', .3, .08)) D.labI = (D.labI + list.length - 1) % list.length;
  if (I.repeat('left', .3, .08)) D.labA = (D.labA || 0) - 1; if (I.repeat('right', .3, .08)) D.labA = (D.labA || 0) + 1;
  if (I.pressed('confirm') && D.lab === 'sound') list[D.labI].play();
  return true;
}
const animalList = () => { const out = []; for (const s of ['whitetail', 'elk', 'moose', 'cow', 'canid']) for (const sex of ['male', 'female']) out.push({ s, sex, name: s + ' ' + sex }); return out; };
const soundList = () => {
  const out = []; for (const n of ['gun', 'echo', 'pump', 'reload', 'click', 'thud', 'hit', 'kill', 'doe', 'whistle', 'boom', 'chime', 'stink', 'call_whitetail', 'call_elk', 'call_moose', 'bugle', 'cowcall', 'rumble', 'crash', 'fanfare', 'sad', 'babble']) out.push({ name: 'sfx ' + n, play: () => BB.sfx(n) });
  for (const n of Object.keys(BB.SONGS)) out.push({ name: 'song ' + n, play: () => { BB.curSong = null; BB.music(n); } });
  for (const id of Object.keys(BB.CAST)) out.push({ name: 'voice ' + id, play: () => { for (let i = 0; i < 8; i++) BB.game.after(i * .07, () => { BB.babbleFor(id); BB.sfx('babble'); }); } });
  return out;
};
BB.devDraw = (g, W, Hh) => {
  const x0 = 10, y0 = 10, w = Math.min(W - 20, 300), h = Hh - 20;
  px.blend(g, .88, 'normal', () => px.rect(g, x0, y0, w, h, '#0a0d1a')); E.ui.box(g, x0, y0, w, h, { bg: ['#141a30', '#0c1020'], border: '#9fd18a', alpha: .92 });
  txt(g, 'DEV MODE', x0 + 8, y0 + 6, '#9fd18a');
  if (D.lab) return labDraw(g, W, Hh, x0, y0, w, h);
  D.tabRects = []; TABS.forEach((t, i) => { const x = x0 + 62 + i * 58; D.tabRects[i] = [x, y0 + 3, 56, 12]; txt(g, t, x + 2, y0 + 6, i === D.page ? '#ffe27a' : '#6a7090'); if (i === D.page) px.rect(g, x, y0 + 15, 52, 1, '#ffe27a'); });
  const rows = rowsFor(), vis = 15, start = clamp(D.row - 7, 0, Math.max(0, rows.length - vis)); D.rects = [];
  for (let k = 0; k < Math.min(vis, rows.length - start); k++) {
    const i = start + k, r = rows[i], y = y0 + 22 + k * 12, sel = i === D.row; D.rects[i] = [x0 + 6, y, w - 12, 11];
    if (sel) px.rect(g, x0 + 6, y, w - 12, 11, '#2a3a24');
    if (r.kind === 'slider') {
      const d = r.def, v = BB.T[d[0]], t = (v - d[3]) / (d[4] - d[3]); txt(g, d[1], x0 + 10, y + 2, sel ? '#fff' : '#b8c0d8');
      const bx = x0 + w * .5, bw = w * .5 - 52; px.rect(g, bx, y + 4, bw, 3, '#2a3050'); px.rect(g, bx, y + 4, bw * t, 3, sel ? '#ffe27a' : '#7a86b8'); px.rect(g, bx + bw * t - 1, y + 2, 3, 7, '#fff');
      const vs = (Math.round(v * 100) / 100) + ''; txt(g, vs, x0 + w - 12 - BB.tw(vs), y + 2, v === d[2] ? '#9a9ab0' : '#ffd36a');
    } else txt(g, r.label(), x0 + 10, y + 2, sel ? '#fff' : '#b8c0d8');
  }
  const c = ctxNow(); if (c && D.freecam) { const v = c.view; txt(g, 'CAM yaw ' + (v.yaw * 180 / Math.PI).toFixed(1) + '  h ' + v.camH.toFixed(1) + 'm', x0 + 8, y0 + h - 34, '#9fd0ff'); }
  if (D.msg) txt(g, D.msg, x0 + 8, y0 + h - 22, '#ffd36a');
  BB.prompts(g, [['aim', 'ROW/VALUE'], ['confirm', 'RESET/RUN'], ['call', 'TAB'], ['cancel', 'CLOSE']], x0 + w / 2, y0 + h - 12, 'center');
  txt(g, 'Sliders: confirm resets that row', x0 + 8, y0 + h - 46, '#6a7090');
};
function labDraw(g, W, Hh, x0, y0, w, h) {
  const list = D.lab === 'animal' ? animalList() : soundList(); txt(g, D.lab === 'animal' ? 'ANIMAL LAB' : 'SOUND LAB', x0 + 80, y0 + 6, '#ffe27a');
  const vis = 14, start = clamp(D.labI - 6, 0, Math.max(0, list.length - vis));
  for (let k = 0; k < Math.min(vis, list.length - start); k++) { const i = start + k, y = y0 + 22 + k * 12; if (i === D.labI) px.rect(g, x0 + 6, y, 120, 11, '#2a3a24'); txt(g, list[i].name, x0 + 10, y + 2, i === D.labI ? '#fff' : '#b8c0d8'); }
  if (D.lab === 'animal') {
    const it = list[D.labI], poses = ['stand', 'alert', 'graze', 'walk', 'trot', 'run'], t = BB.game.time; const gx = x0 + 150;
    poses.forEach((p, i) => { const a = { species: it.s, sex: it.sex, age: 'adult', pts: 10, face: Math.floor(t / 3) % 2 ? -1 : 1, phase: t * (p === 'run' ? 10 : p === 'trot' ? 7 : 4), gait: ['walk', 'trot', 'run'].includes(p) ? p : 'stand', pose: p, mode: 'stand' }; const cx = gx + (i % 2) * 74, cy = y0 + 70 + Math.floor(i / 2) * 58; BB.drawAnimal(g, a, cx, cy, 18 + (D.labA || 0), null, {}); txt(g, p, cx - 10, cy + 4, '#9fb0d8'); });
    txt(g, 'left/right: zoom', x0 + 150, y0 + h - 28, '#6a7090');
  } else txt(g, 'confirm: play', x0 + 150, y0 + 40, '#9fb0d8');
  BB.prompts(g, [['cancel', 'BACK']], x0 + w / 2, y0 + h - 12, 'center');
}
})();
