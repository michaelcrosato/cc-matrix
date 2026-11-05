/* 56-ui-front: the title (the platform at Akari Central at dawn, a Halo 8000 gliding in, the logo with its halo ring and
 * Haro-kun; on a touch-only device "Controller or keyboard required" and a big SETTINGS button), the Halo Map (the
 * career's stage select: a gold ring of 12 stations, each stage an arc), Free Run (a stage and four choices), and the
 * briefing (the instructor's words with portraits and voices, then the stage card). */
(() => {
'use strict';
const E = My3D2dge, DH = window.DH, game = DH.game, px = E.px, F = E.font, T = DH.T;
const SND = () => DH.Sound;
/* ================= TITLE ================= */
let titleMenu = null, touchMsg = false;
const settingsOpen = () => game.menu ? game.menu('settings') : game.shell.show('settings');
DH.scenes.title = {
  input: DH.KEYS, camera: { zoom: false },
  enter() {
    DH.attractOn = false; DH.diffOverride = null; SND().music('march'); DH.lastInput = game.real;
    titleMenu = new DH.BigMenu([
      { label: 'CAREER', sub: 'One day on the Halo Line, dawn to the last train', onPick: () => game.go('haloMap', null, { fade: 'wipe' }) },
      { label: 'FREE RUN', sub: 'Any stage you have unlocked, any hour, any weather', onPick: () => game.go('freeRun', null, { fade: 'wipe' }) },
      { label: 'DUEL', sub: 'Two drivers, split screen, the Parallel Run', onPick: () => game.go('duelLobby', null, { fade: 'wipe' }) },
      { label: 'DRIVER\'S LOG', sub: 'Records, postcards and stats', onPick: () => game.go('driversLog', null, { fade: 'wipe' }) },
      { label: 'HOW TO DRIVE', sub: 'The lever, the mark, the timetable, the calls', onPick: () => DH.showHelp() },
      { label: 'SETTINGS', sub: 'Difficulty, controller symbols, lever direction, sound', onPick: () => settingsOpen() },
      { label: 'ABOUT & CREDITS', sub: 'Source information and feedback', onPick: () => game.go('about', null, { fade: 'wipe' }) }
    ], { w: 190, y: 92, gap: 3, scale: 1 });
    DH.titleMenu = titleMenu;
  },
  update(dt) {
    touchMsg = DH.touchOnly();
    if (touchMsg) { const ck = game.input.clicked(); if (ck && DH._setBtn && ck[0] >= DH._setBtn.x && ck[0] <= DH._setBtn.x + DH._setBtn.w && ck[1] >= DH._setBtn.y && ck[1] <= DH._setBtn.y + DH._setBtn.h) settingsOpen(); }
    else titleMenu.update(dt);
    DH.idleTick(dt);
  },
  draw(r) {
    DH.drawScenic(r, 'title');
    r.overlay(g => {
      const W = r.W, H = r.H, t = game.real, ca = game.cornerArea ? game.cornerArea() : null, top = ca && ca.x0 < W / 2 + 140 ? Math.round(ca.y1) + 4 : 8;
      px.blend(g, .45, 'normal', () => px.rect(g, 0, 0, W, H, '#05060c'));
      drawLogo(g, W / 2, top + 4, t);
      T(g, 'THE HALO LINE · AKARI CITY', W / 2, top + 55, '#c8d8f8', { align: 'center', shadow: '#000' });
      if (touchMsg) {
        E.ui.box(g, W / 2 - 120, top + 84, 240, 44, { bg: ['#2a1a10', '#140c08'], border: '#f2c230' });
        T(g, 'Controller or keyboard required', W / 2, top + 92, '#ffe9a0', { align: 'center', shadow: '#000' });
        T(g, 'Connect one to drive. The demo plays meanwhile.', W / 2, top + 106, '#c8c0b0', { align: 'center', font: 'tiny' });
        const b = DH._setBtn = { x: Math.round(W / 2 - 60), y: top + 140, w: 120, h: 26 };
        E.ui.box(g, b.x, b.y, b.w, b.h, { bg: ['#3a3220', '#241c10'], border: '#f2c230' }); T(g, 'SETTINGS', W / 2, b.y + 6, '#ffe9a0', { align: 'center', scale: 2, shadow: '#000' });
      } else {
        titleMenu.y = Math.max(top + 70, Math.min(top + 80, H - 7 * titleMenu.rowH - 30)); titleMenu.draw(g, W, H, { subs: H > 290 });
        DH.promptLine(g, W, H, [['updown', 'MOVE'], ['confirm', 'SELECT']], {});
      }
      T(g, 'v' + DH.VERSION + '  ' + E.versionLabel().replace(/·/g, '-'), 6, H - 9, '#6a6a80', { font: 'tiny' });
    });
  }
};
/** the logo: DENSHA DE HALO! in gold, a glowing halo ring round the last O, Haro-kun bouncing beside */
function drawLogo(g, cx, y, t) {
  const s1 = 'DENSHA DE', s2 = 'HALO!', w2 = F.width(s2, { scale: 4 });
  F.title(g, s1, Math.round(cx), y, { scale: 2, align: 'center', colors: ['#ffffff', '#c8e0ff', '#6aa0e0'], depth: 2, depthColor: '#1a2a4a' });
  const y2 = y + 18; F.title(g, s2, Math.round(cx), y2, { scale: 4, align: 'center', colors: ['#fffbe0', '#ffe070', '#f2c230', '#c88a20'], depth: 3, depthColor: '#4a2a08' });
  // a halo ring floating over the O of HALO!
  const x0 = cx - w2 / 2, ox = x0 + F.width('HAL', { scale: 4 }) + F.width('O', { scale: 4 }) / 2, oy = y2 + 1, r = 10, sp = Math.sin(t * 2);
  px.blend(g, .35 + .15 * sp, 'add', () => { for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2; px.rect(g, ox + Math.cos(a) * r - 1, oy + Math.sin(a) * r * .3 - 1, 3, 2, '#ffe070'); } });
  for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2 + t * .8; px.rect(g, ox + Math.cos(a) * r, oy + Math.sin(a) * r * .3, 2, 1, Math.sin(a) < 0 ? '#c89a20' : '#fff4b0'); }
  DH.drawHaro(g, cx + w2 / 2 + 20, y2 + 26 - Math.abs(Math.sin(t * 3)) * 5, .8, t);
}
DH.drawLogo = drawLogo;
/* ================= HALO MAP: the career ================= */
const STAGE_ARCS = { S1: ['akari', 'kujira'], S2: ['kujira', 'okiku'], S3: ['okiku', 'shotengai'], S4: ['shotengai', 'koen'], S5: ['koen', 'akari'] };
let mapSel = 0, mapT = 0;
const mapList = () => DH.CAREER.slice();
DH.mapSel = () => mapList()[mapSel];
DH.scenes.haloMap = {
  input: DH.KEYS, camera: { zoom: false },
  enter(d) { const nx = d && d.select || DH.Progress.nextCareer(); mapSel = Math.max(0, mapList().indexOf(nx)); SND().music('timetable'); mapT = 0; DH.lastInput = game.real; },
  update(dt) {
    mapT += dt; const I = game.input, L = mapList();
    if (I.repeat('right', .3, .15) || I.repeat('down', .3, .15)) { mapSel = (mapSel + 1) % L.length; game.audio.sfx('move'); }
    if (I.repeat('left', .3, .15) || I.repeat('up', .3, .15)) { mapSel = (mapSel + L.length - 1) % L.length; game.audio.sfx('move'); }
    // the mouse: hover a stage's arc or node to select it; click to go
    const hit = p => { if (!p || !DH._mapHits) return -1; for (const h of DH._mapHits) if (Math.hypot(p[0] - h.x, p[1] - h.y) < h.r) return h.i; return -1; };
    if (I.mouse && I.mouse.t !== this._mt) { this._mt = I.mouse.t; const k = hit(I.pointer()); if (k >= 0 && k !== mapSel) { mapSel = k; game.audio.sfx('move'); } }
    const ck = I.clicked(), ch = hit(ck);
    const id = L[mapSel];
    if ((I.pressed('confirm') || (ck && ch === mapSel) || (ck && DH._mapGo && ck[0] >= DH._mapGo.x && ck[0] <= DH._mapGo.x + DH._mapGo.w && ck[1] >= DH._mapGo.y && ck[1] <= DH._mapGo.y + DH._mapGo.h))) {
      if (DH.Progress.unlocked(id)) { game.audio.sfx('ok'); I.consumeAll(); game.go('briefing', { stage: id }, { fade: 'wipe' }); } else { game.audio.sfx('bad'); }
    }
    if (I.pressed('cancel')) { game.audio.sfx('back'); game.go('title', null, { fade: 'wipe' }); }
    DH.idleTick(dt);
  },
  draw(r) {
    DH.drawScenic(r, 'map');
    r.overlay(g => {
      const W = r.W, H = r.H, tall = H > W * .9;
      px.blend(g, .6, 'normal', () => px.rect(g, 0, 0, W, H, '#05060c'));
      T(g, 'THE HALO LINE', 12, 10, '#f2c230', { scale: 2, shadow: '#000' }); T(g, 'CAREER · ONE DAY OF SERVICE', 12, 28, '#c8d0e8', { shadow: '#000' });
      const R0 = Math.round(Math.min(W * (tall ? .4 : .26), H * .34)), cx = tall ? Math.round(W / 2) : Math.round(W * .32), cy = tall ? Math.round(H * .34) : Math.round(H * .54);
      drawRing(g, cx, cy, R0, mapSel, mapT);
      const id = mapList()[mapSel], cw = Math.min(196, tall ? W - 24 : W - cx - R0 - 40), cxp = tall ? Math.round((W - cw) / 2) : Math.round(W - cw - 12), cyp = tall ? cy + R0 + 26 : Math.round(H * .24);
      DH.stageCard(g, cxp, cyp, cw, id);
      const ok = DH.Progress.unlocked(id), b = DH._mapGo = { x: cxp, y: cyp + 122, w: cw, h: 22 };
      E.ui.box(g, b.x, b.y, b.w, b.h, { bg: ok ? ['#3a3220', '#241c10'] : '#1a1a24', border: ok ? '#f2c230' : '#4a4a5a' });
      T(g, ok ? 'DRIVE' : 'LOCKED', b.x + b.w / 2, b.y + 4, ok ? '#ffe9a0' : '#7a7a8a', { align: 'center', scale: 2, shadow: '#000' });
      DH.promptLine(g, W, H, [['arrows', 'STAGE'], ['confirm', 'DRIVE'], ['cancel', 'BACK']]);
    });
  }
};
/** the ring: 12 stations, arcs for stages, rank stamps, Haro-kun in the middle */
function drawRing(g, cx, cy, R, sel, t, o = {}) {
  const Rt = DH.route('halo'), st = Rt.stations, L = mapList(), ang = s => -Math.PI / 2 + (((s % DH.LOOP) + DH.LOOP) % DH.LOOP) / DH.LOOP * Math.PI * 2;
  DH._mapHits = [];
  for (let i = 0; i < 160; i++) { const a = i / 160 * Math.PI * 2; px.rect(g, cx + Math.cos(a) * R - 1, cy + Math.sin(a) * R - 1, 2, 2, '#4a3a18'); }
  const p = DH.Progress.get();
  L.forEach((id, k) => {
    if (id === 'S0') { const x = cx, y = cy + R * .45, on = k === sel, ok = DH.Progress.unlocked(id); px.disc(g, x, y, on ? 9 : 7, on ? '#f2c230' : ok ? '#8a7a40' : '#3a3a40'); T(g, 'DEPOT', x, y + 11, on ? '#ffe9a0' : '#a8a8b8', { align: 'center', font: 'tiny', shadow: '#000' }); DH._mapHits.push({ i: k, x, y, r: 14 }); if (p.ranks[id]) DH.stamp(g, x + 16, y - 6, p.ranks[id], .6); return; }
    const [a0, a1] = STAGE_ARCS[id], s0 = st.find(q => q.id === a0).stop[6], s1 = st.find(q => q.id === a1).stop[6], A0 = ang(s0); let A1 = ang(s1); if (A1 <= A0) A1 += Math.PI * 2;
    const on = k === sel, ok = DH.Progress.unlocked(id), cleared = p.cleared.includes(id), col = on ? '#ffe070' : cleared ? '#f2c230' : ok ? '#a08a40' : '#3a3a44';
    for (let i = 0; i <= 60; i++) { const a = A0 + (A1 - A0) * i / 60, w = on ? 3 : 2; px.rect(g, cx + Math.cos(a) * R - w / 2, cy + Math.sin(a) * R - w / 2, w, w, col); }
    if (on) { const a = A0 + (A1 - A0) * ((t * .25) % 1); px.blend(g, .7, 'add', () => px.disc(g, cx + Math.cos(a) * R, cy + Math.sin(a) * R, 4, '#fff4b0')); }
    const am = (A0 + A1) / 2, mx = cx + Math.cos(am) * (R + 16), my = cy + Math.sin(am) * (R + 16);
    T(g, id, mx, my - 3, on ? '#ffe9a0' : '#a8a8b8', { align: 'center', shadow: '#000' });
    if (p.ranks[id]) DH.stamp(g, cx + Math.cos(am) * (R - 18), cy + Math.sin(am) * (R - 18), p.ranks[id], .55);
    for (let q = 0; q <= 6; q++) { const a = A0 + (A1 - A0) * q / 6; DH._mapHits.push({ i: k, x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R, r: 12 }); }
  });
  for (const s of st) { const a = ang(s.stop[6]), x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R; px.disc(g, x, y, 3, '#101018'); px.disc(g, x, y, 2, '#ffffff'); if (R > 70 && !o.noLabels) { const lx = cx + Math.cos(a) * (R - 12), ly = cy + Math.sin(a) * (R - 12); T(g, s.name.split('-')[0].split(' ')[0].slice(0, 7), lx, ly - 2, '#8a90b0', { align: Math.cos(a) > .3 ? 'right' : Math.cos(a) < -.3 ? 'left' : 'center', font: 'tiny' }); } }
  DH.drawHaro(g, cx, cy + 8 + Math.sin(t * 2) * 3, .7, t);
}
DH.drawRing = drawRing;
/* ================= FREE RUN ================= */
let freeMenu = null, freeStage = 'S1';
const freeStages = () => DH.STAGE_ORDER.filter(id => id !== 'S0' && DH.Progress.unlocked(id));
DH.scenes.freeRun = {
  input: DH.KEYS, camera: { zoom: false },
  enter() {
    SND().music('timetable'); DH.lastInput = game.real; const L = freeStages(); if (!L.includes(freeStage)) freeStage = L[0] || 'S1';
    const S = () => DH.STAGES[freeStage];
    const stageItem = { label: 'STAGE', options: L.map(id => [id, id + '  ' + DH.STAGES[id].name]), value: freeStage, onChange: v => { freeStage = v; tod.value = S().tod; wx.value = S().weather; trn.value = S().train; } };
    const tod = { label: 'TIME', options: [[5.6, 'DAWN'], [9, 'MORNING'], [12, 'NOON'], [15, 'AFTERNOON'], [17.5, 'SUNSET'], [22.5, 'NIGHT']], value: S().tod };
    if (!tod.options.some(o => o[0] === tod.value)) tod.options.unshift([S().tod, 'TIMETABLE']);
    const wx = { label: 'WEATHER', options: [['clear', 'CLEAR'], ['rain', 'RAIN'], ['fog', 'FOG']], value: S().weather };
    const trn = { label: 'TRAIN', options: [['h8000', 'HALO 8000'], ['h3000', 'HALO 3000 (RETRO)']], value: S().train };
    const dif = { label: 'DIFFICULTY', options: [['easy', 'EASY'], ['normal', 'NORMAL'], ['expert', 'EXPERT']], value: game.settings.difficulty };
    freeMenu = new DH.BigMenu([stageItem, tod, wx, trn, dif, { label: 'START', onPick: () => game.go('briefing', { stage: freeStage, free: { tod: tod.value, weather: wx.value, train: trn.value, difficulty: dif.value } }, { fade: 'wipe' }) }], { w: 250, y: 64, scale: 1, gap: 6, onCancel: () => game.go('title', null, { fade: 'wipe' }) });
    freeMenu.items[5].scale = 2;
    this.items = { tod, wx, trn, dif };
  },
  update(dt) { freeMenu.update(dt); DH.idleTick(dt); },
  draw(r) {
    const it = this.items; DH.drawScenic(r, Object.assign({}, DH.MENU_SCENES.free, { h: it.tod.value, w: it.wx.value }));
    r.overlay(g => {
      const W = r.W, H = r.H; px.blend(g, .55, 'normal', () => px.rect(g, 0, 0, W, H, '#05060c'));
      T(g, 'FREE RUN', 12, 10, '#f2c230', { scale: 2, shadow: '#000' }); T(g, 'No story, no unlocks: just the line.', 12, 28, '#c8d0e8', { shadow: '#000' });
      freeMenu.x = Math.round(W < 470 ? (W - 250) / 2 : 12); freeMenu.draw(g, W, H, { subs: false });
      if (W >= 470) DH.stageCard(g, W - 208, 64, 196, freeStage, { tod: it.tod.value, weather: it.wx.value, train: it.trn.value });
      DH.promptLine(g, W, H, [['updown', 'ROW'], ['arrows', 'CHANGE'], ['confirm', 'START'], ['cancel', 'BACK']]);
    });
  }
};
/* ================= BRIEFING ================= */
let brief = null;
DH.scenes.briefing = {
  input: DH.KEYS, camera: { zoom: false },
  enter(d) {
    const S = DH.STAGES[d.stage]; brief = { d, S, talk: new E.Dialog(game, { lines: 3, speed: 42 }), card: false, t: 0, lines: (d.free ? [] : S.briefing || []).slice() };
    SND().music('briefing');
    const next = () => { const l = brief.lines.shift(); if (!l) { brief.card = true; return; } const ch = DH.CHARS[l.who]; brief.talk.voice = DH.dialogVoice(ch.voice); brief.talk.say(l.text, { name: ch.name, portrait: DH.portrait(l.who), portraitSize: 40, onDone: next, nameColor: ch.col }); };
    brief.next = next; next();
  },
  update(dt) {
    const b = brief, I = game.input; b.t += dt;
    if (!b.card) { b.talk.update(dt); if (I.pressed('cancel')) { b.talk.close(); b.lines.length = 0; b.card = true; } return; }
    const ck = I.clicked(), go = DH._briefGo, hit = ck && go && ck[0] >= go.x && ck[0] <= go.x + go.w && ck[1] >= go.y && ck[1] <= go.y + go.h;
    if (I.pressed('confirm') || hit) { I.consumeAll(); game.audio.sfx('ok'); game.go('drive', { stage: b.d.stage, free: b.d.free }, { fade: 'iris' }); }
    if (I.pressed('cancel')) { game.audio.sfx('back'); game.go(b.d.free ? 'freeRun' : 'haloMap', b.d.free ? null : { select: b.d.stage }, { fade: 'wipe' }); }
  },
  draw(r) {
    const b = brief, S = b.S, R = DH.route(S.route), st = R.stations.find(q => q.id === S.stops[0].id), f = b.d.free || {};
    DH.drawScenic(r, { route: S.route, s: S.tutorial ? 120 : st.stop[6] - 70, h: f.tod !== undefined ? f.tod : S.tod, w: f.weather || S.weather, dir: 1, x: -3.6, h0: 2.4, horizon: .48, drift: 0, train: S.tutorial ? null : { track: 'A', livery: DH.TRAINS[f.train || S.train].livery, cars: S.cars, from: st.stop[6], to: st.stop[6], period: 999 } });
    if (!b.card) b.talk.draw(r);
    r.overlay(g => {
      const W = r.W, H = r.H;
      if (!b.card) { T(g, S.name, W / 2, 10, '#f2c230', { align: 'center', scale: 2, shadow: '#000' }); DH.promptLine(g, W, H, [['confirm', 'NEXT'], ['cancel', 'SKIP']], { raise: 66 }); return; }
      px.blend(g, .4, 'normal', () => px.rect(g, 0, 0, W, H, '#05060c'));
      const w = Math.min(280, W - 24), x = Math.round((W - w) / 2), y = Math.round(H * .16);
      DH.stageCard(g, x, y, w, S.id, { tod: f.tod, weather: f.weather, train: f.train, h: 130 });
      if (S.teaches) { T(g, 'THIS STAGE TEACHES', x, y + 136, '#f2c230', { font: 'tiny' }); S.teaches.slice(0, 4).forEach((tx, i) => T(g, '• ' + tx, x + 4, y + 146 + i * 10, '#e8e4f0', { shadow: '#000' })); }
      const go = DH._briefGo = { x: Math.round(W / 2 - 60), y: Math.min(H - 50, y + 190), w: 120, h: 24 };
      E.ui.box(g, go.x, go.y, go.w, go.h, { bg: ['#3a3220', '#241c10'], border: '#f2c230' }); T(g, 'START', W / 2, go.y + 5, '#ffe9a0', { align: 'center', scale: 2, shadow: '#000' });
      DH.promptLine(g, W, H, [['confirm', 'START'], ['cancel', 'BACK']]);
    });
  }
};
})();
