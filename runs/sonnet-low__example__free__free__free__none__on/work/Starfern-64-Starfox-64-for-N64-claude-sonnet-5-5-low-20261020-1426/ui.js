'use strict';
/* ===== UI: HUD, menus, attract mode, main loop ===== */
const PROMPTS = {
  pad: { ok: '✕', back: '○', fire: '✕', bomb: '□', roll: 'L1 / R1', boost: 'R2', brake: 'L2', pause: 'OPTIONS', move: 'Left Stick', nav: 'D-Pad / Stick' },
  kb: { ok: 'Enter', back: 'Esc', fire: 'Space', bomb: 'X', roll: 'Q / E', boost: 'Shift', brake: 'Ctrl', pause: 'Esc', move: 'WASD / Arrows', nav: 'Arrow Keys' }
};
const P = k => (Settings.glyphs === 1 ? PROMPTS.pad : Settings.glyphs === 2 ? PROMPTS.kb : (Input.lastDevice === 'pad' ? PROMPTS.pad : PROMPTS.kb))[k];
const MEDALS = ['—', 'BRONZE', 'SILVER', 'GOLD'], MEDAL_COL = ['#889', '#d08a50', '#d8e0ea', '#ffd860'];

const UI = {
  screen: 'main', sel: 0, scroll: 0, idle: 0, ignore: 0, W: null, titleW: null, rects: [], mouse: { x: 0, y: 0, moved: false, click: null }, stack: [], stageIdx: 0, touchOnly: false, t: 0, results: null, prevScreen: 'main', aboutScroll: 0, attractStage: 0, toast: null, confirmReset: false
};
UI.touchOnly = matchMedia('(pointer: coarse)').matches && !matchMedia('(hover: hover)').matches;

/* ----- menu definitions ----- */
function T(label, key, desc) { return { label, kind: 'toggle', get: () => Settings[key], set: v => { Settings[key] = v; saveSettings(); }, desc }; }
function S(label, key, min, max, step, fmt, desc) { return { label, kind: 'slider', min, max, step, get: () => Settings[key], set: v => { Settings[key] = Math.round(v * 100) / 100; saveSettings(); Audio_.applyVol(); }, fmt, desc }; }
function Ch(label, key, opts, desc) { return { label, kind: 'choice', opts, get: () => Settings[key], set: v => { Settings[key] = v; saveSettings(); }, desc }; }
const pct = v => Math.round(v * 100) + '%';
function menuFor(sc) {
  switch (sc) {
    case 'main': return [
      { label: 'Start Mission', kind: 'btn', act: () => startGame(0), desc: 'Fly Sector F-1: Frondfall Canyon' },
      { label: 'Sector Select', kind: 'btn', act: () => go('stages'), desc: 'Choose a sector and see your best medals' },
      { label: 'Settings', kind: 'btn', act: () => go('settings'), desc: 'Controls, audio, difficulty and accessibility' },
      { label: 'Controls', kind: 'btn', act: () => go('controls'), desc: 'See every button for gamepad and keyboard' },
      { label: 'About & Credits', kind: 'btn', act: () => go('about'), desc: 'Source information and feedback' }];
    case 'stages': return STAGES.map((s, i) => ({ label: s.sector + ' · ' + s.name, kind: 'btn', act: () => startGame(i), desc: s.blurb, stage: i })).concat([{ label: 'Back', kind: 'btn', act: back }]);
    case 'settings': return [
      T('Invert Horizontal (stick)', 'invH', 'Fix a gamepad whose left/right is reversed'),
      T('Invert Vertical (stick)', 'invV', 'Fix a gamepad whose up/down is reversed'),
      S('Stick Deadzone', 'deadzone', 0, 0.4, 0.05, pct, 'Ignore tiny stick drift'),
      S('Master Volume', 'master', 0, 1, 0.1, pct), S('Music Volume', 'music', 0, 1, 0.1, pct), S('Effects Volume', 'sfx', 0, 1, 0.1, pct),
      S('Screen Shake', 'shake', 0, 1, 0.25, pct, 'Camera shake on hits and explosions'),
      T('Controller Rumble', 'rumble', 'Vibration on hits and explosions'),
      S('Lock-on Assist', 'aim', 0.5, 2, 0.25, v => v.toFixed(2) + 'x', 'Size of the homing lock-on search area'),
      Ch('Difficulty', 'diff', ['Easy', 'Normal', 'Hard'], 'Enemy damage, fire rate and toughness'),
      T('Radio Subtitles', 'subs', 'Show comms text from your team'),
      T('Tutorial Hints', 'hints', 'Show control hints in Sector F-1'),
      Ch('Button Prompts', 'glyphs', ['Auto', 'PlayStation', 'Keyboard'], 'Which symbols to show in prompts'),
      { label: 'Reset Records', kind: 'btn', act: () => { if (UI.confirmReset) { Records = {}; saveRecords(); UI.confirmReset = false; toast('Records cleared'); } else { UI.confirmReset = true; toast('Press again to confirm'); } }, desc: 'Erase best scores and medals' },
      { label: 'Back', kind: 'btn', act: back }];
    case 'controls': case 'about': return [{ label: 'Back', kind: 'btn', act: back }];
    case 'pause': return [
      { label: 'Resume', kind: 'btn', act: resume }, { label: 'Controls', kind: 'btn', act: () => go('controls') }, { label: 'Settings', kind: 'btn', act: () => go('settings') },
      { label: 'Restart from Checkpoint', kind: 'btn', act: () => { const W = UI.W; W.lives = Math.max(W.lives, 1); W.state = 'play'; UI.screen = 'play'; respawn(W); W.lives++; } },
      { label: 'Quit to Title', kind: 'btn', act: toTitle }];
    case 'results': return [
      UI.stageIdx < STAGES.length - 1 ? { label: 'Next Sector', kind: 'btn', act: () => startGame(UI.stageIdx + 1) } : { label: 'Play Again', kind: 'btn', act: () => startGame(0) },
      { label: 'Replay Sector', kind: 'btn', act: () => startGame(UI.stageIdx) }, { label: 'Quit to Title', kind: 'btn', act: toTitle }];
    case 'gameover': return [{ label: 'Retry from Checkpoint', kind: 'btn', act: () => { const W = UI.W; W.lives = 1; W.state = 'play'; UI.screen = 'play'; respawn(W); Audio_.startMusic(W.st.track); } }, { label: 'Restart Sector', kind: 'btn', act: () => startGame(UI.stageIdx) }, { label: 'Quit to Title', kind: 'btn', act: toTitle }];
    case 'touch': return [{ label: 'Settings', kind: 'btn', act: () => go('settings') }];
  }
  return [];
}
function go(sc) { Audio_.sfx('ok'); UI.stack.push([UI.screen, UI.sel, UI.scroll]); UI.screen = sc; UI.sel = 0; UI.scroll = 0; UI.confirmReset = false; }
function back() { Audio_.sfx('back'); const s = UI.stack.pop(); if (s) { UI.screen = s[0]; UI.sel = s[1]; UI.scroll = s[2]; } else if (UI.screen !== 'main') { UI.screen = 'main'; UI.sel = 0; } UI.confirmReset = false; }
function toast(t) { UI.toast = { t, life: 2 }; }
function startGame(i) {
  UI.stageIdx = i; UI.W = newWorld(i, 'play'); UI.screen = 'play'; UI.stack = []; UI.sel = 0; Audio_.sfx('ok');
}
function toTitle() { UI.W = null; UI.screen = 'main'; UI.stack = []; UI.sel = 0; UI.idle = 0; makeTitleWorld(); }
function resume() { UI.screen = 'play'; Audio_.sfx('ok'); if (UI.W && UI.W.state !== 'victory') Audio_.startMusic(UI.W.st.track); }
function makeTitleWorld() { const W = newWorld(Math.floor(Math.random() * STAGES.length), 'title'); W.evIdx = 1e9; W.state = 'play'; W.banner = null; UI.titleW = W; Audio_.startMusic(2); }
function startAttract() { UI.screen = 'attract'; UI.W = newWorld(UI.attractStage % STAGES.length, 'attract'); UI.W.state = 'play'; UI.ignore = 0.5; }

/* ----- pointer ----- */
function initPointer() {
  const cv = Gfx.cv, upd = e => { UI.mouse.x = e.clientX * Gfx.W / innerWidth; UI.mouse.y = e.clientY * Gfx.H / innerHeight; UI.mouse.moved = true; UI.idle = 0; };
  cv.addEventListener('pointermove', upd);
  cv.addEventListener('pointerdown', e => { upd(e); UI.mouse.click = { x: UI.mouse.x, y: UI.mouse.y }; Audio_.unlock(); });
}

/* ----- menu logic ----- */
function adjust(it, dir) {
  if (it.kind === 'toggle') it.set(!it.get());
  else if (it.kind === 'slider') { const v = clamp(it.get() + dir * it.step, it.min, it.max); it.set(v); }
  else if (it.kind === 'choice') it.set((it.get() + dir + it.opts.length) % it.opts.length);
  Audio_.sfx('ui');
}
function activate(it, dir = 1) {
  if (it.kind === 'btn') it.act();
  else if (it.kind === 'slider') { const nv = it.get() + it.step * dir; it.set(nv > it.max + 1e-6 ? it.min : nv < it.min - 1e-6 ? it.max : nv); Audio_.sfx('ui'); }
  else adjust(it, dir);
}
function menuUpdate(inp, dt, items, visible) {
  const m = UI.mouse;
  if (UI.ignore > 0) { UI.ignore -= dt; return; }
  if (UI.screen === 'about') { if (inp.navY) UI.aboutScroll = Math.max(0, UI.aboutScroll + inp.navY * 2); if (inp.backP || inp.okP) back(); return; }
    if (inp.navY) { UI.sel = (UI.sel + inp.navY + items.length) % items.length; Audio_.sfx('ui'); UI.confirmReset = false; }
  const it = items[UI.sel];
  if (it && inp.navX && it.kind !== 'btn') adjust(it, inp.navX);
  if (it && inp.okP) activate(it);
  if (inp.backP && UI.screen !== 'main' && UI.screen !== 'touch') { if (UI.screen === 'pause') resume(); else back(); }
  if (inp.backP && UI.screen === 'touch') { }
  if (UI.screen === 'touch' && UI.stack.length === 0) { /* touch overlay shown */ }
  // mouse
  if (m.moved) { for (const r of UI.rects) if (m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h && r.i !== undefined && UI.sel !== r.i) { UI.sel = r.i; Audio_.sfx('ui'); } m.moved = false; }
  if (m.click) { for (const r of UI.rects) if (m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h && r.i !== undefined) { UI.sel = r.i; activate(items[r.i], m.x < r.x + r.w * 0.5 && items[r.i].kind !== 'btn' ? -1 : 1); break; } m.click = null; }
  if (UI.sel < UI.scroll) UI.scroll = UI.sel; if (UI.sel >= UI.scroll + visible) UI.scroll = UI.sel - visible + 1;
}

/* ----- drawing helpers ----- */
function wrap(text, size, maxW) {
  const g = Gfx.g; g.font = `700 ${size * Gfx.u}px Trebuchet MS, Verdana, sans-serif`; const out = []; let line = '';
  for (const w of text.split(' ')) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; }
  if (line) out.push(line); return out;
}
function panel(x, y, w, h) { Gfx.rrect(x, y, w, h, 18, 'rgba(6,24,18,.78)', 'rgba(150,255,170,.55)', 3); }
function footerPrompts(items) {
  const u = Gfx.u, y = Gfx.H - 36 * u; let x = 60 * u;
  for (const [k, t] of items) { Gfx.text(k, x, y, 26, '#c8ff80'); x += Gfx.g.measureText(k).width + 12 * u; Gfx.text(t, x, y, 26, '#dfeee4'); x += Gfx.g.measureText(t).width + 48 * u; }
}
function drawLogo(cx, cy, s = 1) {
  const g = Gfx.g, u = Gfx.u; g.save(); g.translate(cx, cy); g.scale(s, s);
  g.font = `900 ${150 * u}px Impact, 'Arial Black', sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  const t = 'STARFERN';
  g.lineWidth = 14 * u; g.strokeStyle = '#06210f'; g.lineJoin = 'round'; g.strokeText(t, 0, 0);
  const gr = g.createLinearGradient(0, -80 * u, 0, 80 * u); gr.addColorStop(0, '#f4ffd0'); gr.addColorStop(0.5, '#9bf06a'); gr.addColorStop(1, '#2faa5c'); g.fillStyle = gr; g.fillText(t, 0, 0);
  g.font = `900 ${96 * u}px Impact, sans-serif`; g.strokeText('64', 380 * u, 40 * u); g.fillStyle = '#ffd860'; g.fillText('64', 380 * u, 40 * u);
  // fern fronds
  g.strokeStyle = '#7fe08a'; g.lineWidth = 4 * u; for (let k = 0; k < 2; k++) { g.save(); g.scale(k ? -1 : 1, 1); g.translate(-330 * u, 100 * u); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(160 * u, 30 * u, 330 * u, -10 * u); g.stroke(); for (let i = 1; i < 14; i++) { const x = i * 24 * u, y = 30 * u * Math.sin(i / 14 * Math.PI) * 0.6 - i * 0.7 * u; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 10 * u, y + (24 - i) * u); g.moveTo(x, y); g.lineTo(x + 10 * u, y - (24 - i) * u); g.stroke(); } g.restore(); }
  g.restore();
  Gfx.text('A  COMET  WING  ADVENTURE', cx, cy + 150 * u * s, 30, '#e6ffd8', 'center');
}
function drawMenu(title, items, visible = 7, x0 = 0.08, o = {}) {
  const g = Gfx.g, u = Gfx.u, W = Gfx.W, H = Gfx.H, rowH = 84 * u, x = W * x0, w = Math.min(W * 0.5, 820 * u), y0 = o.y || H * 0.36;
  UI.rects = [];
  if (title) Gfx.text(title, x, y0 - 40 * u, 54, '#c8ff80');
  const n = Math.min(visible, items.length), h = n * rowH + 24 * u;
  panel(x - 20 * u, y0 - 8 * u, w + 40 * u, h);
  for (let k = 0; k < n; k++) {
    const i = UI.scroll + k, it = items[i]; if (!it) break; const y = y0 + 12 * u + k * rowH, sel = i === UI.sel;
    if (sel) { Gfx.rrect(x - 8 * u, y, w + 16 * u, rowH - 8 * u, 12, 'rgba(120,230,120,.28)', '#c8ff80', 3); Gfx.text('▶', x + 6 * u, y + rowH * 0.62, 34, '#c8ff80'); }
    Gfx.text(it.label, x + 60 * u, y + rowH * 0.62, 38, sel ? '#ffffff' : '#bcd6c6');
    let v = null;
    if (it.kind === 'toggle') v = it.get() ? 'ON' : 'OFF'; else if (it.kind === 'choice') v = it.opts[it.get()]; else if (it.kind === 'slider') v = it.fmt(it.get());
    if (v !== null) {
      const vx = x + w - 20 * u;
      if (it.kind === 'slider') { const bw = 220 * u, bx = vx - bw - 110 * u, f = (it.get() - it.min) / (it.max - it.min); Gfx.rrect(bx, y + rowH * 0.4, bw, 14 * u, 7, 'rgba(255,255,255,.18)'); Gfx.rrect(bx, y + rowH * 0.4, Math.max(8 * u, bw * f), 14 * u, 7, '#9bf06a'); }
      Gfx.text(sel && it.kind !== 'btn' ? '◀  ' + v + '  ▶' : v, vx, y + rowH * 0.62, 34, it.kind === 'toggle' ? (it.get() ? '#9bf06a' : '#ff8888') : '#ffe08a', 'right');
    }
    UI.rects.push({ x: x - 8 * u, y, w: w + 16 * u, h: rowH - 8 * u, i });
  }
  if (items.length > n) { Gfx.text(UI.scroll > 0 ? '▲' : ' ', x + w / 2, y0 - 12 * u, 28, '#c8ff80', 'center'); Gfx.text(UI.scroll + n < items.length ? '▼' : ' ', x + w / 2, y0 + h + 30 * u, 28, '#c8ff80', 'center'); }
  const cur = items[UI.sel]; if (cur && cur.desc) Gfx.text(cur.desc, x, y0 + h + 80 * u, 30, '#dfeee4');
}

/* ----- HUD ----- */
function drawHUD(W) {
  const g = Gfx.g, u = Gfx.u, w = Gfx.W, h = Gfx.H, p = W.p, st = W.st, M = 44 * u;
  const attract = W.mode === 'attract';
  // score
  Gfx.text('SCORE', M, M + 20 * u, 24, '#bfe6c8'); Gfx.text(String(Math.floor(W.stats.score)).padStart(8, '0'), M, M + 74 * u, 56, '#fff');
  if (W.combo >= 2) Gfx.text(`COMBO ×${W.combo}  (x${1 + Math.min(3, Math.floor(W.combo / 3))})`, M, M + 112 * u, 30, '#ffd860');
  Gfx.text(`HITS ${W.stats.kills}`, M, M + (W.combo >= 2 ? 150 : 112) * u, 26, '#bfe6c8');
  // progress
  const bw = w * 0.3, bx = w / 2 - bw / 2, by = M + 8 * u, prog = clamp(W.dist / (st.length + 150), 0, 1);
  Gfx.text(st.sector + ' · ' + st.name.toUpperCase(), w / 2, M, 24, '#c8ff80', 'center');
  Gfx.rrect(bx, by + 12 * u, bw, 12 * u, 6, 'rgba(0,0,0,.5)', 'rgba(255,255,255,.4)', 2);
  Gfx.rrect(bx, by + 12 * u, Math.max(10 * u, bw * prog), 12 * u, 6, '#9bf06a');
  const cpx = bx + bw * clamp(W.cp.z / (st.length + 150), 0, 1); g.fillStyle = '#ffd860'; g.fillRect(cpx - 2 * u, by + 6 * u, 4 * u, 24 * u);
  Gfx.text('☠', bx + bw + 12 * u, by + 32 * u, 28, '#ff7a7a');
  // wingmen
  W.allies.forEach((a, i) => {
    const x = w - M - 330 * u, y = M + 6 * u + i * 62 * u; Gfx.rrect(x, y, 330 * u, 52 * u, 10, 'rgba(0,0,0,.45)', a.chased ? (Math.floor(W.t * 4) % 2 ? '#ff5a5a' : '#ffd0d0') : 'rgba(255,255,255,.3)', 2);
    Gfx.text(a.def.name, x + 14 * u, y + 34 * u, 26, a.alive ? '#fff' : '#777');
    Gfx.rrect(x + 130 * u, y + 18 * u, 180 * u, 16 * u, 8, 'rgba(255,255,255,.15)'); if (a.alive) Gfx.rrect(x + 130 * u, y + 18 * u, Math.max(6 * u, 180 * u * a.hp / 60), 16 * u, 8, a.hp < 20 ? '#ff6060' : '#8ef0ff'); else Gfx.text('LOST', x + 310 * u, y + 36 * u, 22, '#ff7a7a', 'right');
    if (a.chased) Gfx.text('!', x + 316 * u, y + 36 * u, 34, '#ff5a5a', 'right');
  });
  Gfx.text('LIVES ' + '♥'.repeat(Math.max(0, W.lives)), w - M, M + 220 * u, 28, '#ff9ab0', 'right');
  // shield
  const sx = M, sy = h - M - 70 * u, sw = 420 * u;
  Gfx.text('SHIELD', sx, sy - 10 * u, 24, '#bfe6c8');
  Gfx.rrect(sx, sy, sw, 34 * u, 8, 'rgba(0,0,0,.55)', 'rgba(255,255,255,.5)', 3);
  const hp = p.hp / 100, hc = hp > 0.5 ? '#9bf06a' : hp > 0.25 ? '#ffd860' : (Math.floor(W.t * 6) % 2 ? '#ff5050' : '#ff9090');
  Gfx.rrect(sx + 4 * u, sy + 4 * u, Math.max(0, (sw - 8 * u) * hp), 26 * u, 6, hc);
  for (let i = 1; i < 10; i++) { g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(sx + sw * i / 10, sy + 4 * u, 2 * u, 26 * u); }
  Gfx.text('BOMBS', sx, sy + 70 * u, 22, '#bfe6c8'); for (let i = 0; i < 5; i++) Gfx.text('◆', sx + 100 * u + i * 34 * u, sy + 70 * u, 30, i < p.bombs ? '#ffa050' : 'rgba(255,255,255,.2)');
  Gfx.text('LASER ' + ['I', 'II', 'III'][p.laser - 1], sx + 320 * u, sy + 70 * u, 24, '#9ff0ff');
  // boost
  const bx2 = w - M - 320 * u;
  Gfx.text('BOOST', bx2, sy - 10 * u, 24, '#bfe6c8'); Gfx.rrect(bx2, sy, 320 * u, 26 * u, 8, 'rgba(0,0,0,.55)', 'rgba(255,255,255,.5)', 3);
  Gfx.rrect(bx2 + 4 * u, sy + 4 * u, Math.max(0, 312 * u * p.boost), 18 * u, 5, p.boostLock ? '#ff7070' : '#7fe3ff');
  if (p.locks.length) Gfx.text('LOCK ×' + p.locks.length, w / 2, h * 0.78, 34, '#ff7088', 'center');
  // boss bar
  const b = W.boss; if (b && !b.dead) {
    const bw2 = w * 0.5, bx3 = w / 2 - bw2 / 2, by3 = h - M - 20 * u;
    Gfx.text(st.bossName, w / 2, by3 - 14 * u, 26, '#ff9a9a', 'center'); Gfx.rrect(bx3, by3, bw2, 20 * u, 8, 'rgba(0,0,0,.6)', 'rgba(255,255,255,.5)', 3); Gfx.rrect(bx3 + 3 * u, by3 + 3 * u, Math.max(0, (bw2 - 6 * u) * b.hp / b.maxHp), 14 * u, 5, '#ff5a5a');
    if (b.open && !b.dying) Gfx.text('◎ CORE EXPOSED — FIRE!', w / 2, by3 - 56 * u, 34, Math.floor(W.t * 5) % 2 ? '#ffe070' : '#fff', 'center');
  }
  // comms
  const cm = W.comms[0]; if (cm && Settings.subs) {
    const who = CAST[cm.who], cw = Math.min(w * 0.46, 760 * u), cx = M, cy = h * 0.5 - 40 * u, lines = wrap(cm.text, 30, cw - 150 * u), ch = Math.max(110 * u, 60 * u + lines.length * 38 * u);
    Gfx.rrect(cx, cy, cw, ch, 14, 'rgba(0,10,20,.72)', who.col, 3);
    Gfx.rrect(cx + 14 * u, cy + 14 * u, 84 * u, 84 * u, 12, 'rgba(255,255,255,.1)', who.col, 3); Gfx.text(who.ch, cx + 56 * u, cy + 76 * u, 60, who.col, 'center');
    Gfx.text(who.name, cx + 118 * u, cy + 40 * u, 26, who.col); lines.forEach((l, i) => Gfx.text(l, cx + 118 * u, cy + 80 * u + i * 38 * u, 30, '#fff'));
  }
  // hint
  if (W.hint && !attract) {
    const hw = Math.min(w * 0.4, 700 * u), hx = w - M - hw, hy = h * 0.5 - 40 * u, done = W.hint.done;
    Gfx.rrect(hx, hy, hw, 100 * u, 14, 'rgba(10,30,10,.75)', done ? '#9bf06a' : '#ffd860', 3);
    Gfx.text(done ? '✔ NICE!' : 'TIP', hx + 20 * u, hy + 36 * u, 24, done ? '#9bf06a' : '#ffd860');
    const txt = W.hint.text.replace('Left Stick', P('move')).replace('FIRE', P('fire') + ' FIRE').replace('L1 / R1', P('roll')).replace('R2 BOOST / L2 BRAKE', P('boost') + ' BOOST / ' + P('brake') + ' BRAKE').replace('SQUARE', P('bomb'));
    wrap(txt, 28, hw - 40 * u).forEach((l, i) => Gfx.text(l, hx + 20 * u, hy + 72 * u + i * 34 * u, 28, '#fff'));
  }
  // banners
  if (W.banner) { const t = W.banner.t, a = clamp(Math.min(t * 2, (4 - t) * 2), 0, 1); g.globalAlpha = a; const warn = W.banner.a === 'WARNING'; Gfx.text(W.banner.a, w / 2, h * 0.3, 40, warn ? '#ff6a6a' : '#c8ff80', 'center'); Gfx.text(W.banner.b, w / 2, h * 0.3 + 90 * u, 84, '#fff', 'center'); if (W.banner.c) Gfx.text(W.banner.c, w / 2, h * 0.3 + 140 * u, 30, '#dfeee4', 'center'); g.globalAlpha = 1; }
  if (W.banner2) { const t = W.banner2.t; g.globalAlpha = clamp(Math.min(t * 3, (2.5 - t) * 3), 0, 1); Gfx.text(W.banner2.text, w / 2, h * 0.22, 44, '#ffe070', 'center'); g.globalAlpha = 1; }
  if (W.state === 'dead') { g.fillStyle = `rgba(0,0,0,${clamp(W.stateT / 2.5, 0, 0.7)})`; g.fillRect(0, 0, w, h); Gfx.text(W.lives > 0 ? 'SHIP DESTROYED' : 'FINAL SHIP LOST', w / 2, h / 2, 76, '#ff7a7a', 'center'); }
  if (W.state === 'victory' || W.state === 'done') { g.globalAlpha = clamp(W.stateT, 0, 1); Gfx.text('MISSION COMPLETE', w / 2, h * 0.4, 96, '#ffe070', 'center'); g.globalAlpha = 1; }
  if (attract) {
    Gfx.rrect(w / 2 - 420 * u, h - 150 * u, 840 * u, 90 * u, 16, 'rgba(0,0,0,.6)'); if (Math.floor(UI.t * 1.6) % 2) Gfx.text('PRESS ANY BUTTON', w / 2, h - 88 * u, 52, '#ffe070', 'center'); else Gfx.text('DEMO PLAY', w / 2, h - 88 * u, 52, '#c8ff80', 'center');
  }
}

/* ----- screens ----- */
function drawTitleBackdrop() {
  const W = UI.titleW; if (!W) return; Gfx.g.fillStyle = '#000'; Gfx.g.fillRect(0, 0, Gfx.W, Gfx.H); renderWorld(W);
  const g = Gfx.g, gr = g.createLinearGradient(0, 0, Gfx.W * 0.7, 0); gr.addColorStop(0, 'rgba(0,10,5,.72)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, Gfx.W, Gfx.H);
}
function drawControlsScreen() {
  const u = Gfx.u, w = Gfx.W, h = Gfx.H, x = w * 0.08, rows = [['Move', 'Left Stick / D-Pad', 'WASD / Arrow Keys'], ['Fire lasers (tap)', '✕  Cross', 'Space / J'], ['Lock-on homing shots', 'Hold ✕, release', 'Hold Space, release'], ['Barrel roll (reflects shots)', 'L1 / R1', 'Q / E'], ['Smart bomb', '□  Square', 'X / K'], ['Boost', 'R2', 'Shift'], ['Brake', 'L2', 'Ctrl / C'], ['Pause', 'OPTIONS', 'Esc / P'], ['Menu: confirm / back', '✕ / ○', 'Enter / Esc']];
  panel(x - 20 * u, h * 0.14, w - x * 2 + 40 * u, h * 0.7); Gfx.text('CONTROLS', x, h * 0.14 - 20 * u, 54, '#c8ff80');
  Gfx.text('ACTION', x + 20 * u, h * 0.2 + 20 * u, 26, '#9bd0aa'); Gfx.text('GAMEPAD', w * 0.5, h * 0.2 + 20 * u, 26, '#9bd0aa'); Gfx.text('KEYBOARD', w * 0.75, h * 0.2 + 20 * u, 26, '#9bd0aa');
  rows.forEach((r, i) => { const y = h * 0.2 + 80 * u + i * 62 * u; Gfx.text(r[0], x + 20 * u, y, 32, '#fff'); Gfx.text(r[1], w * 0.5, y, 32, '#ffe08a'); Gfx.text(r[2], w * 0.75, y, 32, '#8ef0ff'); });
  Gfx.text('Tip: if your stick feels reversed, use Settings → Invert Horizontal / Vertical.', x + 20 * u, h * 0.8, 26, '#dfeee4');
}
function drawAbout() {
  const u = Gfx.u, w = Gfx.W, h = Gfx.H, x = w * 0.08, pw = w - x * 2, g = Gfx.g;
  panel(x - 20 * u, h * 0.12, pw + 40 * u, h * 0.74); Gfx.text('ABOUT & CREDITS', x, h * 0.12 - 20 * u, 54, '#c8ff80');
  g.save(); g.beginPath(); g.rect(x, h * 0.14, pw, h * 0.7); g.clip();
  let y = h * 0.14 + 40 * u - UI.aboutScroll * 16 * u, total = 0;
  for (const l of ABOUT) { const head = l.startsWith('#'), txt = head ? l.slice(1) : l, size = head ? 34 : 26; for (const ln of head ? [txt] : wrap(txt, size, pw - 20 * u)) { if (y > h * 0.1 && y < h * 0.9) Gfx.text(ln, x + 10 * u, y, size, head ? '#ffe070' : '#eaf6ee'); y += (head ? 52 : 36) * u; } if (head) y += 4 * u; }
  g.restore(); UI.aboutMax = (y - (h * 0.14 - UI.aboutScroll * 16 * u)) / (16 * u);
  if (UI.aboutScroll > UI.aboutMax) UI.aboutScroll = Math.max(0, UI.aboutMax - 10);
  Gfx.text('▲▼ scroll', w - x, h * 0.9, 24, '#9bd0aa', 'right');
}
function drawResults() {
  const u = Gfx.u, w = Gfx.W, h = Gfx.H, R = UI.results, x = w * 0.08;
  panel(x - 20 * u, h * 0.1, w * 0.46, h * 0.56); Gfx.text('MISSION RESULTS', x, h * 0.1 - 16 * u, 54, '#c8ff80');
  const rows = [['Score', R.score], ['Enemies destroyed', `${R.kills} / ${R.spawned}`], ['Wingmen saved', `${R.saved}`], ['Wingmen lost', `${R.lost}`], ['Rings collected', `${R.rings}`], ['Best combo', `×${R.maxCombo}`], ['Time', `${Math.floor(R.time / 60)}:${String(Math.floor(R.time % 60)).padStart(2, '0')}`], ['Best score', R.best]];
  rows.forEach((r, i) => { const y = h * 0.1 + 64 * u + i * 52 * u; Gfx.text(r[0], x + 10 * u, y, 32, '#dfeee4'); Gfx.text(String(r[1]), x + w * 0.46 - 50 * u, y, 36, '#fff', 'right'); });
  Gfx.text('MEDAL', x + w * 0.54, h * 0.2, 36, '#dfeee4'); Gfx.text(MEDALS[R.medal], x + w * 0.54, h * 0.2 + 100 * u, 90, MEDAL_COL[R.medal]);
  if (R.newBest) Gfx.text('NEW BEST!', x + w * 0.54, h * 0.2 + 160 * u, 44, '#ffe070');
  if (UI.stageIdx < STAGES.length - 1) Gfx.text('Next: ' + STAGES[UI.stageIdx + 1].name, x + w * 0.54, h * 0.2 + 220 * u, 30, '#9bd0aa');
}
function drawStageCards() {
  const u = Gfx.u, w = Gfx.W, h = Gfx.H, x = w * 0.08 + Math.min(w * 0.5, 820 * u) + 80 * u, i = menuFor('stages')[UI.sel] && menuFor('stages')[UI.sel].stage;
  if (i === undefined) return; const s = STAGES[i], r = Records[s.id] || { score: 0, medal: 0 };
  panel(x, h * 0.36, w - x - 60 * u, 360 * u); Gfx.text(s.sector, x + 30 * u, h * 0.36 + 60 * u, 30, '#c8ff80'); Gfx.text(s.name, x + 30 * u, h * 0.36 + 120 * u, 48, '#fff');
  wrap(s.blurb, 28, w - x - 120 * u).forEach((l, k) => Gfx.text(l, x + 30 * u, h * 0.36 + 170 * u + k * 36 * u, 28, '#dfeee4'));
  Gfx.text('BEST ' + String(r.score).padStart(8, '0'), x + 30 * u, h * 0.36 + 290 * u, 32, '#ffe08a'); Gfx.text(MEDALS[r.medal], x + 30 * u, h * 0.36 + 335 * u, 34, MEDAL_COL[r.medal]);
}
function drawTouchOverlay() {
  const g = Gfx.g, u = Gfx.u, w = Gfx.W, h = Gfx.H; g.fillStyle = 'rgba(0,8,4,.92)'; g.fillRect(0, 0, w, h);
  drawLogo(w / 2, h * 0.25, Math.min(1, w / (1100 * u)));
  Gfx.text('Controller or keyboard required', w / 2, h * 0.52, Math.min(64, w / u / 14), '#fff', 'center');
  Gfx.text('Connect a gamepad or use a keyboard to play.', w / 2, h * 0.52 + 60 * u, Math.min(32, w / u / 28), '#bcd6c6', 'center');
  const bw = 420 * u, bh = 110 * u, bx = w / 2 - bw / 2, by = h * 0.68; Gfx.rrect(bx, by, bw, bh, 18, 'rgba(120,230,120,.3)', '#c8ff80', 4); Gfx.text('⚙  Settings', w / 2, by + bh * 0.66, 48, '#fff', 'center');
  UI.rects = [{ x: bx, y: by, w: bw, h: bh, i: 0 }];
}

/* ----- main loop ----- */
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now; UI.t += dt;
  const inp = Input.poll(); Audio_.update();
  if (UI.toast) { UI.toast.life -= dt; if (UI.toast.life <= 0) UI.toast = null; }
  const g = Gfx.g, w = Gfx.W, h = Gfx.H, sc = UI.screen;
  const touchGate = UI.touchOnly && !Input.padConnected && !Input.kbSeen;
  const inMenu = ['main', 'stages', 'settings', 'controls', 'about'].includes(sc);
  // idle -> attract
  if (inMenu && !touchGate && UI.W === null) { UI.idle += dt; if (Input.anyPressed || UI.mouse.moved && false) UI.idle = 0; if (UI.idle >= 10) startAttract(); } else if (sc !== 'attract') UI.idle = 0;
  if (sc === 'attract') {
    const W = UI.W;
    if (Input.anyPressed || UI.mouse.click || UI.mouse.moved) { UI.mouse.click = null; UI.mouse.moved = false; Audio_.stopMusic(); UI.W = null; UI.screen = 'main'; UI.idle = 0; UI.ignore = 0.4; makeTitleWorld(); Input.poll(); }
    else {
      updateWorld(W, dt, aiInput(W));
      if (W.state === 'done' || W.state === 'gameover') { UI.attractStage++; startAttract(); }
      renderWorld(W); drawHUD(W);
    }
  } else if (sc === 'play') {
    const W = UI.W; if (inp.pauseP && W.state !== 'dead' && W.state !== 'done') { UI.screen = 'pause'; UI.sel = 0; UI.stack = []; Audio_.sfx('ok'); Audio_.stopMusic(); }
    else {
      updateWorld(W, dt, inp);
      if (W.state === 'gameover') { UI.screen = 'gameover'; UI.sel = 0; }
      if (W.state === 'done') finishStage(W);
    }
    renderWorld(W); drawHUD(W);
  } else {
    // menus over backdrop
    if (UI.W && ['pause', 'gameover', 'results'].includes(sc)) { renderWorld(UI.W); g.fillStyle = 'rgba(0,10,5,.6)'; g.fillRect(0, 0, w, h); if (sc !== 'results') drawHUD(UI.W); }
    else { if (UI.titleW) { stepTitle(UI.titleW, dt); } drawTitleBackdrop(); }
    const items = menuFor(sc);
    if (touchGate && sc === 'main') { drawTouchOverlay(); touchMenu(inp, dt); }
    else {
      menuUpdate(inp, dt, items, sc === 'settings' ? 7 : 6);
      if (sc === 'main') { drawLogo(w * 0.5, h * 0.17, Math.min(1, w / (1500 * Gfx.u))); drawMenu('', items, 5, 0.08, { y: h * 0.4 }); Gfx.text('Total best score: ' + (Object.values(Records).reduce((a, r) => a + r.score, 0)), w * 0.92, h * 0.62, 26, '#9bd0aa', 'right'); footerPrompts([[P('nav'), 'Navigate'], [P('ok'), 'Select'], ['Idle 10s', 'Demo']]); }
      else if (sc === 'stages') { drawMenu('SECTOR SELECT', items, 5, 0.08, { y: h * 0.3 }); drawStageCards(); footerPrompts([[P('ok'), 'Launch'], [P('back'), 'Back']]); }
      else if (sc === 'settings') { drawMenu('SETTINGS', items, 7, 0.08, { y: h * 0.2 }); footerPrompts([[P('nav'), 'Navigate / Adjust'], [P('back'), 'Back']]); }
      else if (sc === 'controls') { drawControlsScreen(); drawMenu('', items, 1, 0.08, { y: h * 0.88 }); }
      else if (sc === 'about') { drawAbout(); footerPrompts([[P('back'), 'Back']]); }
      else if (sc === 'pause') { Gfx.text('PAUSED', w / 2, h * 0.2, 80, '#fff', 'center'); drawMenu('', items, 5, 0.35, { y: h * 0.3 }); const W = UI.W; Gfx.text(`Checkpoint: ${W.cp.name}   ·   Lives ${W.lives}`, w / 2, h * 0.84, 28, '#bcd6c6', 'center'); footerPrompts([[P('ok'), 'Select'], [P('back'), 'Resume']]); }
      else if (sc === 'results') { drawResults(); drawMenu('', items, 3, 0.08, { y: h * 0.72 }); }
      else if (sc === 'gameover') { Gfx.text('GAME OVER', w / 2, h * 0.25, 110, '#ff7a7a', 'center'); drawMenu('', items, 3, 0.35, { y: h * 0.4 }); }
    }
  }
  if (UI.toast) { Gfx.rrect(w / 2 - 260 * Gfx.u, h * 0.9 - 50 * Gfx.u, 520 * Gfx.u, 70 * Gfx.u, 14, 'rgba(0,0,0,.8)', '#ffe070', 2); Gfx.text(UI.toast.t, w / 2, h * 0.9, 32, '#ffe070', 'center'); }
  UI.mouse.click = sc === 'attract' ? null : UI.mouse.click; if (UI.mouse.click && !inMenu) UI.mouse.click = null;
}
let _ai = null;
function runAI(W) { return aiInput(W); }
function stepTitle(W, dt) {
  W.t += dt; W.dist += BASE_SPEED * dt; const p = W.p; p.x = Math.sin(W.t * 0.5) * 8 + 8; p.y = 2 + Math.sin(W.t * 0.8) * 3; p.vx = Math.cos(W.t * 0.5) * 4; p.vy = 0; p.bank = -p.vx * 0.022; W.speed = BASE_SPEED;
  W.allies.forEach((a, i) => { a.t = (a.t || 0) + dt; a.x = p.x + [-9, 9, 0][i] + Math.sin(a.t + i) * 2; a.y = p.y + [1, 1, 5][i]; a.rz = 6 + i * 2; a.vx = Math.cos(W.t * 0.5 + i) * 2; });
  if (W.t > 45) makeTitleWorld();
}
function touchMenu(inp, dt) {
  const m = UI.mouse; if (m.click) { for (const r of UI.rects) if (m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h) { UI.touchSettings = true; go('settings'); } m.click = null; }
}
function finishStage(W) {
  const s = W.stats, st = W.st, ratio = s.spawned ? s.kills / s.spawned : 1;
  const medal = ratio >= 0.85 ? 3 : ratio >= 0.65 ? 2 : ratio >= 0.4 ? 1 : 0, rec = Records[st.id] || { score: 0, medal: 0 }, score = Math.floor(s.score) + Math.floor(Math.max(0, 1000 - s.time * 4)) + W.p.hp * 10 + s.saved * 500;
  const newBest = score > rec.score; Records[st.id] = { score: Math.max(score, rec.score), medal: Math.max(medal, rec.medal) }; saveRecords();
  UI.results = { score, kills: s.kills, spawned: s.spawned, saved: s.saved, lost: s.lost, rings: s.rings, maxCombo: s.maxCombo, time: s.time, medal, best: Records[st.id].score, newBest };
  UI.screen = 'results'; UI.sel = 0; UI.ignore = 0.6;
}

/* ----- boot ----- */
function boot() {
  Gfx.init(); Input.init(); initPointer(); makeTitleWorld();
  addEventListener('keydown', () => { UI.idle = 0; });
  requestAnimationFrame(frame);
}
boot();
