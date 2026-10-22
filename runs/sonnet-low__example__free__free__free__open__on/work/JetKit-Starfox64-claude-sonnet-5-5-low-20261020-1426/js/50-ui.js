// ---------- UI: controller-first menus, settings, attract mode, boot ----------
const SCREENS = ['title', 'select', 'brief', 'settings', 'controls', 'about', 'pause', 'results', 'over', 'touch'];
const UI = { cur: null, idx: 0, stack: [], items: [], skip: 0, idle: 0, memo: {}, touchOnly: false, briefIdx: 0, res: null };
const glyph = (pad, kb) => Input.device === 'pad' ? pad : kb;
const cap = (a, b) => `<b>${a}</b>`;
function hintHtml(extra) { const pad = Input.device === 'pad'; return pad ? `<b>✕</b> Select &nbsp; <b>○</b> Back &nbsp; <b>D-pad</b> Navigate ${extra || ''}` : `<b>Enter</b> Select &nbsp; <b>Esc</b> Back &nbsp; <b>↑↓←→</b> Navigate ${extra || ''}`; }
const onOff = v => v ? 'ON' : 'OFF';
const SCR = {
  title: { items: () => { const a = [{ label: 'Start Campaign', act: () => UI.brief(0) }, { label: 'Mission Select', act: () => UI.show('select') }, { label: 'Settings', act: () => UI.show('settings', 1) }, { label: 'Controls', act: () => UI.show('controls', 1) }, { label: 'About & Credits', act: () => UI.show('about', 1) }]; return a; }, back: null },
  settings: { items: () => [
    { label: 'Master Volume', val: () => Settings.master, l: () => step('master', -1, 0, 10), r: () => step('master', 1, 0, 10), bar: 1 },
    { label: 'Music Volume', val: () => Settings.music, l: () => step('music', -1, 0, 10), r: () => step('music', 1, 0, 10), bar: 1 },
    { label: 'Effects Volume', val: () => Settings.sfx, l: () => step('sfx', -1, 0, 10), r: () => step('sfx', 1, 0, 10), bar: 1 },
    { label: 'Invert Horizontal Axis', val: () => onOff(Settings.invertX), act: () => tog('invertX') },
    { label: 'Invert Vertical Axis', val: () => onOff(Settings.invertY), act: () => tog('invertY') },
    { label: 'Invert Flight Pitch (all-range)', val: () => onOff(Settings.invertPitch), act: () => tog('invertPitch') },
    { label: 'Stick Deadzone', val: () => Math.round(Settings.dead * 100) + '%', l: () => stepf('dead', -.025, .05, .4), r: () => stepf('dead', .025, .05, .4) },
    { label: 'Lock-on Assist', val: () => Settings.aim ? 'WIDE' : 'NARROW', act: () => tog('aim') },
    { label: 'Screen Shake', val: () => onOff(Settings.shake), act: () => tog('shake') },
    { label: 'Tutorial Hints', val: () => onOff(Settings.hints), act: () => tog('hints') },
    { label: 'Reset to Defaults', act: () => { Object.assign(Settings, DEFAULTS); Settings.save(); Audio.vol(); Audio.sfx('ok'); UI.render(); } },
    { label: 'Back', act: () => UI.back() }], back: 1 },
  controls: { items: () => [{ label: 'Back', act: () => UI.back() }], back: 1 },
  about: { items: () => [{ label: 'Back', act: () => UI.back() }], back: 1 },
  brief: { items: () => [{ label: 'Launch', act: () => UI.launch(UI.briefIdx) }, { label: 'Back', act: () => UI.back() }], back: 1 },
  pause: { items: () => [{ label: 'Resume', act: () => UI.resume() }, { label: 'Retry Mission', act: () => UI.launch(G.mIdx) }, { label: 'Settings', act: () => UI.show('settings', 1) }, { label: 'Controls', act: () => UI.show('controls', 1) }, { label: 'Quit to Title', act: () => UI.toTitle() }], back: () => UI.resume() },
  results: { items: () => { const r = UI.res, a = []; if (r.success && MISSIONS[G.mIdx + 1]) a.push({ label: 'Next Mission', act: () => UI.brief(G.mIdx + 1) }); a.push({ label: 'Retry Mission', act: () => UI.launch(G.mIdx) }, { label: 'Mission Select', act: () => { G.quit(); UI.show('select'); } }, { label: 'Quit to Title', act: () => UI.toTitle() }); return a; }, back: null },
  over: { items: () => [{ label: 'Continue (retry mission)', act: () => UI.launch(G.mIdx) }, { label: 'Quit to Title', act: () => UI.toTitle() }], back: null },
  touch: { items: () => [{ label: 'Settings', act: () => UI.show('settings', 1) }], back: null },
  select: { items: () => MISSIONS.map((M, i) => ({ label: M.name, locked: i >= Save.unlocked, act: () => i < Save.unlocked ? UI.brief(i) : Audio.sfx('back') })), back: () => UI.show('title') }
};
function step(k, d, a, b) { Settings[k] = clamp(Settings[k] + d, a, b); Settings.save(); Audio.vol(); Audio.sfx('ui'); UI.render(); }
function stepf(k, d, a, b) { Settings[k] = Math.round(clamp(Settings[k] + d, a, b) * 1000) / 1000; Settings.save(); Audio.sfx('ui'); UI.render(); }
function tog(k) { Settings[k] = !Settings[k]; Settings.save(); Audio.sfx('ok'); UI.render(); }

UI.show = function (name, push) {
  if (push && UI.cur) UI.stack.push(UI.cur); else if (!push) UI.stack = [];
  for (const s of SCREENS) $('s-' + s).classList.toggle('on', s === name); UI.cur = name; UI.idx = push ? 0 : (UI.memo[name] || 0);
  if (name === 'controls') $('ctl-text').textContent = controlsText(); if (name === 'about') $('about-text').textContent = ABOUT();
  UI.render(); $('hud').style.visibility = (name === 'pause' || name === 'results' || name === 'over' || name === 'brief') ? 'hidden' : '';
  $('hud').style.visibility = G.state === 'menu' ? 'hidden' : (name ? 'hidden' : '');
};
UI.hide = function () { for (const s of SCREENS) $('s-' + s).classList.remove('on'); UI.cur = null; $('hud').style.visibility = ''; };
UI.back = function () { Audio.sfx('back'); const p = UI.stack.pop(); if (p) { UI.show(p, 0); UI.stack = UI.stack; } else UI.show('title'); };
UI.render = function () {
  const sc = SCR[UI.cur]; if (!sc) return; const items = UI.items = sc.items();
  if (UI.idx >= items.length) UI.idx = items.length - 1;
  const el = UI.cur === 'select' ? $('map') : $('m-' + UI.cur);
  if (UI.cur === 'select') {
    const pos = [[18, 62], [50, 30], [82, 62]]; el.innerHTML = items.map((it, i) => { const M = MISSIONS[i], b = Save.best[M.id]; return `<div class="node ${i === UI.idx ? 'focus' : ''} ${it.locked ? 'locked' : ''}" data-i="${i}" style="left:${pos[i][0]}%;top:${pos[i][1]}%"><b>${it.locked ? '🔒 ' : ''}${M.name}</b>${M.mode === 'rail' ? 'Rail' : 'All-Range'}<em>${b ? 'Best ' + b.toLocaleString() : it.locked ? 'Locked' : 'New'}</em></div>`; }).join('');
    $('map-desc').textContent = MISSIONS[UI.idx].blurb;
  } else {
    el.innerHTML = items.map((it, i) => { let v = ''; if (it.val) { const x = it.val(); v = `<span class="val">${it.l ? '<span class="arr" data-d="-1">◀</span>' : ''}${it.bar ? '█'.repeat(x) + '░'.repeat(10 - x) : x}${it.r ? '<span class="arr" data-d="1">▶</span>' : ''}</span>`; }
      return `<div class="item ${i === UI.idx ? 'focus' : ''}" data-i="${i}"><span>${it.label}</span>${v}</div>`; }).join('');
  }
  const h = $('hint-' + UI.cur); if (h) h.innerHTML = hintHtml(UI.cur === 'settings' ? '&nbsp; <b>◀▶</b> Adjust' : '');
  const f = el.querySelector('.focus'); if (f && f.scrollIntoView) f.scrollIntoView({ block: 'nearest' });
};
UI.act = function (dir) { const it = UI.items[UI.idx]; if (!it) return; if (dir && (it.l || it.r)) { (dir < 0 ? it.l : it.r)(); return; } if (dir) return; if (it.act) { if (it.locked) { Audio.sfx('back'); return; } Audio.sfx('ok'); it.act(); } else if (it.r) it.r(); };
function bindClicks() {
  document.addEventListener('mouseover', e => { const t = e.target.closest('[data-i]'); if (t && UI.cur && t.dataset.i != UI.idx) { UI.idx = +t.dataset.i; UI.memo[UI.cur] = UI.idx; UI.render(); Audio.sfx('ui'); } });
  document.addEventListener('click', e => { if (!UI.cur) return; const t = e.target.closest('[data-i]'); if (!t) return; UI.idx = +t.dataset.i; const a = e.target.closest('.arr'); if (a) { UI.act(+a.dataset.d); } else UI.act(0); });
}
bindClicks();

// ---- screens
UI.brief = function (i) { UI.briefIdx = i; const M = MISSIONS[i]; $('b-title').textContent = M.name; $('b-text').innerHTML = M.blurb + '<br><br>' + (M.mode === 'rail' ? 'Rail mission: your Jet flies forward on its own. Dodge, shoot, and keep your wingmen alive.' : 'All-range mission: steer freely in any direction. Press the U-turn button to flip around fast.') + `<br>Medal: destroy ${M.medal}+ enemies · Wingmen: Rook &amp; Pip`; UI.show('brief', UI.cur !== 'brief' && UI.cur !== 'results'); };
UI.launch = function (i) { const f = $('fade'); f.style.opacity = 1; UI.skip = 2; setTimeout(() => { UI.hide(); G.start(i); $('hud').style.visibility = ''; f.style.opacity = 0; }, 420); UI.cur = null; for (const s of SCREENS) $('s-' + s).classList.remove('on'); Audio.sfx('ok'); };
UI.toTitle = function () { G.quit(); UI.show('title'); Audio.sfx('back'); };
UI.pause = function () { if (G.state !== 'play') return; G.state = 'paused'; Audio.sfx('ok'); UI.show('pause'); };
UI.resume = function () { G.state = 'play'; UI.hide(); UI.skip = 2; Audio.sfx('ok'); };
UI.gameover = function () { UI.show('over'); };
UI.results = function (r) {
  UI.res = r; const M = r.M; $('res-title').textContent = r.success ? 'Mission Complete' : 'Mission Failed'; $('res-rank').textContent = r.success ? r.rank : '—';
  const t = Math.round(r.time), rows = [['Score', G.score.toLocaleString()], ['Enemies Downed', G.hits + ' / ' + M.medal + (r.medal ? '  ★ MEDAL' : '')], ['Accuracy', r.acc + '%'], ['Wingmen Saved', r.alive + ' / 2'], ['Time', Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0')]];
  $('res-stats').innerHTML = rows.map(x => `<div>${x[0]}</div><div>${x[1]}</div>`).join(''); setTimeout(() => { if (G.state === 'end') { UI.show('results'); } }, 600);
};
function controlsText() {
  return `GAMEPAD (PS5 DualSense)                       KEYBOARD / MOUSE
Left stick / D-pad  Move / steer              WASD or Arrows   Move / steer
✕  Fire (hold to auto-fire)                   Space / J / Click  Fire
□  Hold to charge & lock on, release          L / X / Mid-click  Charge lock-on
○  Nova bomb                                  K / B / Right-click Nova bomb
L1 / R1  Barrel roll (reflects shots)         Q / E            Barrel roll
R2  Boost        L2  Brake                    Shift / Ctrl     Boost / Brake
△  Somersault (rail) / U-turn (all-range)     U / F            Somersault / U-turn
Options  Pause                                Esc / P          Pause

MENUS: D-pad or stick to navigate, ✕ / Enter to select, ○ / Esc to go back.
Left/Right adjusts sliders. If your stick feels inverted, use the
Invert Horizontal / Vertical Axis toggles in Settings.

TIPS
• Barrel rolling deflects enemy shots straight back — and you take no damage while rolling.
• Charge lock-on (up to 6 targets) is the best answer to bosses and fast fighters.
• Bosses are shielded most of the time. Dodge, then strike when the shield opens.
• Shield rings repair you, Nova pickups add bombs, purple gems upgrade your laser.
• Save your wingmen: when a drone is on their tail, shoot it off.`;
}
// ---- touch-only gate
UI.touchCheck = function () {
  const coarse = matchMedia('(pointer: coarse)').matches, fine = matchMedia('(any-pointer: fine)').matches || matchMedia('(hover: hover)').matches;
  UI.touchOnly = coarse && !fine && !Input.pad; return UI.touchOnly;
};

// ---- attract mode
const Attract = { on: false, seg: 0, t: 0, plan: [{ m: 0, at: 0, len: 55 }, { m: 0, at: 108, len: 50 }, { m: 1, at: 0, len: 40 }, { m: 2, at: 0, len: 55 }], fl: 0, rt: 0, bt: 0 };
Attract.start = function () { Attract.on = true; Attract.seg = -1; Attract.next(); $('attract').classList.add('on'); UI.hide(); $('hud').style.visibility = ''; };
Attract.next = function () { Attract.seg = (Attract.seg + 1) % Attract.plan.length; const s = Attract.plan[Attract.seg]; Attract.t = 0; G.start(s.m, { attract: true, startAt: s.at }); G.P.lives = 99; $('hud').style.visibility = ''; };
Attract.stop = function () { Attract.on = false; $('attract').classList.remove('on'); G.quit(); UI.show('title'); UI.idle = 0; UI.skip = 3; };
Attract.ai = function () {
  const P = G.P, act = { fire: false, charge: false, roll_l: false, roll_r: false, boost: false, bomb: false, flip: false, brake: false }, r = { mx: 0, my: 0, act }; if (!P || G.state !== 'play') return r;
  Attract.fl += 1 / 60; const cyc = Attract.fl % 4.5; const chg = cyc > 3.2, rail = G.isRail();
  let tg = null, bd = 1e9;
  for (const e of G.enemies) { if (e.dead || e.ghost) continue; const d = e.pos.distanceTo(P.pos); const ahead = rail ? e.pos.z < P.pos.z - 8 : true; if (ahead && d < bd && d < (rail ? 280 : 500) && !(e.shield && e.boss)) { bd = d; tg = e; } }
  const boss = G.boss && !G.boss.dead ? G.boss : null; if (!tg && boss) tg = boss;
  let danger = false; for (const s of G.eshots) if (s.pos.distanceToSquared(P.pos) < 400) { danger = true; break; }
  if (rail) {
    let tx = 0, ty = 2; if (tg) { tx = tg.pos.x; ty = tg.pos.y; }
    for (const o of G.obst) if (o.z < P.pos.z && P.pos.z - o.z < 90) { tx = o.gx; ty = o.gy; break; }
    r.mx = clamp((tx - P.px) * .3, -1, 1); r.my = clamp(-(ty - P.py) * .35, -1, 1);
    act.fire = !chg; act.charge = chg && !!tg; act.boost = !tg || bd > 200;
    if (danger && Attract.rt <= 0) { act.roll_l = Attract.rt2 = !Attract.rt2; act.roll_r = !act.roll_l; Attract.rt = 1.4; } Attract.rt -= 1 / 60;
    Attract.bt -= 1 / 60; if (G.enemies.length > 7 && Attract.bt <= 0) { act.bomb = true; Attract.bt = 12; }
  } else {
    if (tg) { _a.copy(tg.pos).sub(P.pos); const d = _a.length(); const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(P.pitch, P.yaw, 0, 'YXZ')).invert(); _a.applyQuaternion(q);
      const ex = Math.atan2(_a.x, -_a.z), ey = Math.atan2(_a.y, Math.hypot(_a.x, _a.z));
      r.mx = clamp(ex * 2.2, -1, 1); r.my = -clamp(ey * 2.2, -1, 1) * (Settings.invertPitch ? -1 : 1);
      act.fire = Math.abs(ex) < .3 && Math.abs(ey) < .3 && d < 220 && !chg; act.charge = chg && d < 300; act.boost = d > 140 && Math.abs(ex) < .5;
      if (Math.abs(ex) > 2.5 && d < 160) { Attract.fl2 = (Attract.fl2 || 0) + 1; act.flip = Attract.fl2 % 120 === 1; } }
    else { r.mx = .3; }
    for (const rk of G.rocks) { _b.copy(rk.pos).sub(P.pos); if (_b.length() < rk.r + 60) { G.fwd(_c); if (_b.dot(_c) > 0) { r.my = -.8 * (Settings.invertPitch ? -1 : 1); r.mx = (_b.x > 0 ? -.6 : .6); } } }
    if (danger && Attract.rt <= 0) { act.roll_l = true; Attract.rt = 1.4; } Attract.rt -= 1 / 60;
  }
  return r;
};
Attract.update = function (dt) {
  Attract.t += dt; if (Input.consumeActivity()) { Attract.stop(); return; }
  const s = Attract.plan[Attract.seg]; if (Attract.t > s.len || G.state === 'end' || G.state === 'over' || (G.won && G.outT > 2.5)) Attract.next();
};

// ---- about text
const ABOUT = () => SOURCE_INFO;

// ---- main loop
let last = performance.now(), fadeInit = false;
function frame(now) {
  requestAnimationFrame(frame); const dt = Math.min((now - last) / 1000, .1); last = now;
  const I = Input.poll(); const act = I.act, pr = I.pressed;
  if (I.device === 'pad' && I.pad) Audio.unlock();
  if (UI.touchOnly && (I.pad || I.activity)) { if (I.pad || I.device === 'kb') { UI.touchOnly = false; if (UI.cur === 'touch') UI.show('title'); } }
  if (Attract.on) Attract.update(dt);
  else if (UI.cur && UI.touchOnly) { navMenu(I, pr); }
  else {
    const act2 = I.consumeActivity(); const menuish = G.state === 'menu' && UI.cur && UI.cur !== 'touch';
    if (menuish) { if (act2) UI.idle = 0; else UI.idle += dt; if (UI.idle >= 10) { UI.idle = 0; Attract.start(); } } else UI.idle = 0;
    if (UI.skip > 0) UI.skip--;
    else if (G.state === 'play' && !UI.cur && pr.pause) UI.pause();
    else if (UI.cur) navMenu(I, pr);
  }
  const live = Attract.on || G.state !== 'menu';
  G.update(dt); Audio.tick(); GFX.render();
  if (UI.cur === 'settings') { const el = $('stick-test'); if (el) el.textContent = `Stick test:  X ${I.mx.toFixed(2)}   Y ${I.my.toFixed(2)}   (after inversion)`; }
}
function navMenu(I, pr) {
  const sc = SCR[UI.cur]; if (!sc) return; const n = UI.items.length, np = I.navPressed;
  if (UI.cur === 'about' || UI.cur === 'controls') { const el = $(UI.cur === 'about' ? 'about-text' : 'ctl-text'); if (np.up) el.scrollTop -= 60; if (np.down) el.scrollTop += 60; }
  if (UI.cur === 'select') { if (np.right || np.down) mv(1, n); if (np.left || np.up) mv(-1, n); }
  else { if (np.down) mv(1, n); if (np.up) mv(-1, n); if (np.left) UI.act(-1); if (np.right) UI.act(1); }
  if (pr.ok || pr.fire) UI.act(0);
  else if (pr.back || (UI.cur === 'pause' && pr.pause)) { const b = sc.back; if (b === 1) UI.back(); else if (typeof b === 'function') b(); }
}
function mv(d, n) { UI.idx = (UI.idx + d + n) % n; UI.memo[UI.cur] = UI.idx; Audio.sfx('ui'); UI.render(); }
document.addEventListener('visibilitychange', () => { if (document.hidden && G.state === 'play' && !G.ai) UI.pause(); });

// ---- boot
(function boot() {
  if (typeof THREE === 'undefined' || !GFX.renderer) { $('err').style.display = 'grid'; $('err-t').textContent = 'Three.js failed to load (internet connection needed for the CDN).'; return; }
  const st = document.createElement('div'); st.id = 'stick-test'; st.style.cssText = 'margin-top:1rem;color:#9fd3ff;font-size:1rem;letter-spacing:.1em'; $('s-settings').insertBefore(st, $('hint-settings'));
  GFX.setTheme('coast'); G.state = 'menu'; Audio.music(null);
  if (UI.touchCheck()) UI.show('touch'); else UI.show('title');
  const startTitleMusic = () => { Audio.unlock(); if (!G.mission && !Attract.on) Audio.music('title'); removeEventListener('keydown', startTitleMusic); removeEventListener('pointerdown', startTitleMusic); };
  addEventListener('keydown', startTitleMusic); addEventListener('pointerdown', startTitleMusic);
  addEventListener('gamepadconnected', () => { if (UI.touchOnly) { UI.touchOnly = false; UI.show('title'); } });
  requestAnimationFrame(frame);
})();
// debug hooks for automated testing
window.__jk = { G, UI, Attract, Input, Settings, MISSIONS, Save };
