// 51-screens: the 10-foot screens. A big-focus list (d-pad, stick or arrows move; hover moves the focus; a click,
// Enter or Cross picks; Circle, Esc or a right click goes back), the title (a flyover of the night harbor rendered by
// Rail3D, the logo, device-aware PRESS prompts), the touch-only notice, briefings over a map of the Lumen Isles,
// results with count-ups and a rank stamp, records (tables, the range's best, INTEL), about (pages), how to play
// (device-aware), and the credits roll. Reads: input labels (46), UI (50), Session (60).

class ListMenu {
  constructor(items, o = {}) { this.items = items; this.i = o.i || 0; this.o = o; this.t = 0; this.rects = []; this.lastPtr = null; while (this.items[this.i] && this.items[this.i].disabled) this.i++; }
  update(dt, game) {
    const I = game.input; this.t += dt;
    const mv = d => { const n = this.items.length; let k = this.i; for (let s = 0; s < n; s++) { k = (k + d + n) % n; if (!this.items[k].disabled) break; } if (k !== this.i) { this.i = k; this.t = 0; game.audio.sfx && game.audio.sfx('tc-ui'); } };
    if (I.repeat('down', .3, .1)) mv(1); if (I.repeat('up', .3, .1)) mv(-1);
    const ptr = I.pointer ? I.pointer() : null;
    if (ptr && (!this.lastPtr || ptr[0] !== this.lastPtr[0] || ptr[1] !== this.lastPtr[1])) { const k = this.rects.findIndex(r => ptr[0] >= r[0] && ptr[0] < r[0] + r[2] && ptr[1] >= r[1] && ptr[1] < r[1] + r[3]); if (k >= 0 && k !== this.i && !this.items[k].disabled) { this.i = k; game.audio.sfx && game.audio.sfx('tc-ui'); } }
    this.lastPtr = ptr ? ptr.slice() : null;
    const cl = I.clicked ? I.clicked() : null;
    if (cl) { const k = this.rects.findIndex(r => cl[0] >= r[0] && cl[0] < r[0] + r[2] && cl[1] >= r[1] && cl[1] < r[1] + r[3]); if (k >= 0 && !this.items[k].disabled) { this.i = k; return this.pick(game); } }
    if (I.pressed('confirm') || I.pressed('start')) return this.pick(game);
    if ((I.pressed('cancel') || I.pressed('cover') && I.lastDevice === 'mouse') && this.o.back) { game.audio.sfx && game.audio.sfx('tc-uiback'); this.o.back(); return true; }
    return false;
  }
  pick(game) { const it = this.items[this.i]; if (!it || it.disabled) return false; game.audio.sfx && game.audio.sfx('tc-uiok'); game.input.consumeAll(); it.on && it.on(); return true; }
  draw(g, r, x, y, o = {}) {
    const w = o.w || Math.min(r.W - 40, 260), rowH = o.rowH || 20; this.rects = [];
    this.items.forEach((it, k) => {
      const yy = y + k * rowH, on = k === this.i, xx = x - w / 2;
      this.rects.push([xx, yy - 2, w, rowH - 2]);
      if (on) { E.ui.box(g, xx, yy - 2, w, rowH - 2, { bg: ['#2a5aa0', '#10305e'], border: UI.gold }); const wave = Math.sin(this.t * 6) * 2; T(g, '▸', xx + 6 + wave, yy + 2, UI.gold, { scale: 2 }); }
      T(g, it.label, x, yy + (on ? 1 : 3), it.disabled ? '#5a6078' : on ? '#ffffff' : '#b8c8e8', { align: 'center', scale: on ? 2 : 1, outline: '#000' });
    });
    const cur = this.items[this.i]; if (cur && cur.desc && o.desc !== false) { const dy = o.descY || (r.H - 26); E.ui.box(g, r.W / 2 - Math.min(r.W - 40, 300) / 2, dy - 3, Math.min(r.W - 40, 300), 13, { bg: ['#10244a', '#081428'], border: '#2a5aa0', alpha: .85 }); T(g, cur.desc, r.W / 2, dy, '#cfe0ff', { align: 'center' }); }
  }
}
TC.ListMenu = ListMenu;

// ---- the screen frame: a gradient backdrop with a slow wave band, a title, a hint line
function frame(g, r, title, t) {
  E.px.rect(g, 0, 0, r.W, r.H, '#060e1e');
  for (let y = 0; y < r.H; y += 2) { const k = y / r.H; E.px.rect(g, 0, y, r.W, 2, mixHex('#0b1a3a', '#040814', k)); }
  for (let x = 0; x < r.W; x += 2) { const h = Math.sin(x * .05 + t * 1.4) * 4 + Math.sin(x * .013 - t) * 6; E.px.rect(g, x, r.H - 34 + h, 2, 34 - h, '#0e2a52'); E.px.rect(g, x, r.H - 34 + h, 2, 1, '#3aa0e8'); }
  if (title) E.font.title(g, title, r.W / 2, 12, { scale: 2, colors: ['#ffffff', '#9fe3ff', '#3aa0e8'], outline: '#08142a', align: 'center' });
}
TC.frame = frame;
function hintLine(g, r, input, parts) { const s = parts.map(([a, txt]) => '[' + TC.label(input, a) + '] ' + txt).join('   '); T(g, s, r.W / 2, r.H - 11, '#cfe0ff', { align: 'center' }); }
TC.hintLine = hintLine;
function logo(g, r, y, t, scale = 4) {
  E.font.title(g, 'TIDE CRISIS', r.W / 2 - 12, y, { scale, colors: ['#ffffff', '#9fe3ff', '#3aa0e8', '#1a4f9c'], outline: '#08142a', depth: 3, depthColor: '#08142a', align: 'center' });
  const w = E.font.width('TIDE CRISIS', { scale }); E.font.title(g, '3', r.W / 2 + w / 2 - 4, y - 6, { scale: scale + 2, colors: ['#fff3b0', '#ffb347', '#ff5a2a', '#a81e1e'], outline: '#1a0808', depth: 3, depthColor: '#3a0808' });
  const by = y + scale * 9 + 4; for (let x = r.W / 2 - w / 2 - 10; x < r.W / 2 + w / 2 + 20; x += 2) { const h = Math.sin(x * .2 + t * 4) * 1.5; E.px.rect(g, x, by + h, 2, 2, '#3aa0e8'); E.px.rect(g, x, by + 3 + h, 2, 1, '#9fe3ff'); }
}
TC.logo = logo;

// ---- touch-only: no fine pointer, no pad, no key pressed yet
TC.touchOnly = (game) => {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  if (TC._keyed || (game.input.lastDevice === 'gamepad') || (game.input.lastDevice === 'keyboard' && TC._keyed)) return false;
  const coarse = window.matchMedia('(pointer: coarse)').matches, fine = window.matchMedia('(any-pointer: fine)').matches;
  return coarse && !fine;
};

// ---- the map of the Lumen Isles (briefings and the hub card)
function islesMap(g, x, y, w, h, stage, t) {
  E.ui.box(g, x, y, w, h, { bg: ['#0a2a4a', '#06162c'], border: '#3aa0e8' });
  for (let yy = y + 2; yy < y + h - 2; yy += 6) for (let xx = x + 2; xx < x + w - 2; xx += 6) if (((xx + yy) / 6 | 0) % 2) E.px.dot(g, xx, yy, '#0e3458');
  const isl = [[.28, .55, .2, .26, '#3a6a3a'], [.62, .38, .16, .18, '#4a6a3a'], [.78, .7, .1, .1, '#5a5a4a']];
  for (const [ix, iy, iw, ih, c] of isl) { E.px.ell ? E.px.ell(g, x + ix * w, y + iy * h, iw * w, ih * h, c) : E.px.disc(g, x + ix * w, y + iy * h, iw * w, c); }
  E.px.rect(g, x + .18 * w, y + .78 * h, .5 * w, 3, '#c8c8d0');   // the Tidewall
  const marks = { 1: [.3, .48, 'PORT LUMEN'], 2: [.64, .3, "GULL'S REST"], 3: [.42, .79, 'THE TIDEWALL'] };
  for (const k in marks) { const [mx, my, name] = marks[k], on = +k === stage; E.px.disc(g, x + mx * w, y + my * h, on ? 3 + Math.sin(t * 6) : 2, on ? '#ff5a2a' : '#ffd36a'); T(g, name, x + mx * w + 6, y + my * h - 4, on ? '#ffffff' : '#9fc3e8', { font: 'tiny' }); }
  T(g, 'LUMEN ISLES', x + 4, y + 3, '#9fe3ff', { font: 'tiny' });
}
TC.islesMap = islesMap;

// ---- briefing pages (an overlay used by the play scene before each stage)
class Briefing {
  constructor(id, portrait) { this.B = get('briefing', id); this.i = 0; this.t = 0; this.portrait = portrait; this.done = false; this.voiced = -1; }
  update(dt, game) {
    this.t += dt; const I = game.input, line = this.B.lines[this.i];
    if (this.voiced !== this.i) { this.voiced = this.i; TC.Voice.say(game, line[1], line[0]); }
    const n = Math.floor(this.t * 42);
    if (I.pressed('confirm') || I.pressed('fire') || (I.clicked && I.clicked())) { if (n < line[1].length) this.t = 99; else { this.i++; this.t = 0; if (this.i >= this.B.lines.length) this.done = true; } }
    if (I.pressed('cancel') || I.pressed('start')) this.done = true;
  }
  draw(g, r, game) {
    const st = get('stage', this.B.stage); frame(g, r, null, this.t + this.i);
    T(g, 'BRIEFING · STAGE ' + st.id, 10, 8, '#9fe3ff'); E.font.title(g, st.name, 10, 18, { scale: 2, colors: ['#ffffff', '#ffd36a'], outline: '#000' }); T(g, st.place + ' · ' + st.clock, 10, 36, '#cfe0ff');
    const mw = Math.min(r.W * .45, 200), mh = mw * .62; islesMap(g, r.W - mw - 10, 10, mw, mh, st.id, this.t);
    T(g, 'OBJECTIVES', 10, 52, UI.gold); this.B.objectives.forEach((o, k) => T(g, '▸ ' + o, 14, 63 + k * 10, '#ffffff'));
    const line = this.B.lines[Math.min(this.i, this.B.lines.length - 1)], spk = get('speaker', line[0]), w = r.W - 20, y = r.H - 78;
    E.ui.box(g, 10, y, w, 54, { bg: UI.bg, border: spk.color });
    const rig = this.portrait(line[0]); if (rig) rig.drawPortrait(g, 15, y + 6, 42, { zoom: 2.6, turn: .5, bg: '#0a1426', frame: true });
    T(g, spk.name, 64, y + 5, spk.color);
    E.font.wrap(TC.txt(line[1]).slice(0, Math.floor(this.t * 42)), w - 64).slice(0, 3).forEach((l, k) => T(g, l, 64, y + 16 + k * 10, '#ffffff'));
    hintLine(g, r, game.input, [['confirm', 'NEXT'], ['cancel', 'SKIP']]);
  }
}
TC.Briefing = Briefing;

// ---- results: count-ups, bonuses and the rank stamp
class Results {
  constructor(sim, p) {
    const s = p.stats, b = p.stageStats || {}, d = k => s[k] - (b[k] || 0), shots = d('shots'), hits = d('hits'), acc = shots ? Math.min(1, hits / shots) : 0, lost = d('livesLost');
    this.rows = [['TIME', Math.round(sim.stageT) + ' s'], ['ACCURACY', Math.round(acc * 100) + '%'], ['KILLS', d('kills')], ['HEADSHOTS', d('heads')], ['COVER SAVES', d('saves')], ['LIVES LOST', lost]];
    this.accBonus = Math.round(acc * 100) * 300; this.noDmg = lost === 0 ? 20000 : 0;
    this.rank = p.stageCont ? 'D' : acc >= .75 && lost === 0 ? 'S' : acc >= .6 && lost <= 1 ? 'A' : acc >= .45 ? 'B' : 'C';
    this.t = 0; this.p = p; this.total = p.score + this.accBonus + this.noDmg; this.stage = sim.stage; this.applied = false; this.stamped = false;
  }
  update(dt, game, sim) {
    this.t += dt;
    if (!this.applied && this.t > 2.6) { this.applied = true; sim.addScore(this.p, this.accBonus + this.noDmg, null, 'bonus'); }
    if (this.t > 3.2 && !this.stamped) { this.stamped = true; game.audio.sfx && game.audio.sfx('tc-stamp'); FX.trauma[0] = .4; }
    if (this.t < 3.4 && Math.floor(this.t * 20) !== Math.floor((this.t - dt) * 20)) game.audio.sfx && game.audio.sfx('tc-count');
    const I = game.input; if ((I.pressed('confirm') || I.pressed('fire') || (I.clicked && I.clicked())) && this.t > .4) { if (this.t < 3.4) this.t = 3.4; else return true; }
    return false;
  }
  draw(g, r, game) {
    frame(g, r, 'STAGE ' + this.stage.id + ' CLEAR', this.t);
    T(g, this.stage.name, r.W / 2, 34, UI.gold, { align: 'center', scale: 2 });
    const x0 = r.W / 2 - 110;
    this.rows.forEach(([k, v], i) => { const show = this.t > .3 + i * .25; if (!show) return; T(g, k, x0, 56 + i * 15, '#9fc3e8', { scale: 1 }); T(g, v, x0 + 150, 54 + i * 15, '#ffffff', { scale: 2, align: 'right' }); });
    if (this.t > 2) { T(g, 'ACCURACY BONUS', x0, 150, '#9fc3e8'); T(g, '+' + this.accBonus, x0 + 150, 150, UI.gold, { align: 'right' }); T(g, 'NO-DAMAGE BONUS', x0, 161, '#9fc3e8'); T(g, '+' + this.noDmg, x0 + 150, 161, UI.gold, { align: 'right' }); }
    if (this.t > 2.6) { T(g, 'TOTAL', x0, 176, '#ffffff', { scale: 2 }); T(g, this.total, x0 + 150, 176, '#ffffff', { scale: 2, align: 'right' }); }
    if (this.t > 3.2) { const k = clamp((this.t - 3.2) / .15, 0, 1), sc = Math.round(lerp(14, 7, k)); E.font.title(g, this.rank, x0 + 196, 70, { scale: sc, colors: this.rank === 'S' ? ['#fff3b0', '#ffd36a', '#ff8a2a'] : ['#ffffff', '#9fe3ff', '#3aa0e8'], outline: '#000', depth: 2, align: 'center' }); T(g, 'RANK', x0 + 196, 60, '#9fc3e8', { align: 'center' }); }
    hintLine(g, r, game.input, [['confirm', 'CONTINUE']]);
  }
}
TC.Results = Results;

// ---- the credits roll (the ending)
class Credits {
  constructor(portrait, score) { this.t = 0; this.portrait = portrait; this.score = score; this.lines = [['TIDE CRISIS 3', 't'], ['', ''], ['THE CAST', 'h'], ...['kai', 'rook', 'mari', 'juno', 'hale', 'tejada', 'krake', 'barracuda', 'hammer', 'gull'].map(id => [id, 'cast']), ['', ''], ['GAME DESIGN, CODE, ART, MUSIC', 'h'], ['Claude (Anthropic) · claude-opus-5-5', ''], ['from a plan by claude-opus-5-5', ''], ['', ''], ['MADE WITH my-3D2dge v0.85.2', 'h'], ['Every pixel, note and voice written in code', ''], ['', ''], ['INSPIRED BY', 'h'], ['Time Crisis 3 (Namco, 2003)', ''], ['An original game. No names, levels or art', ''], ['from the source were used.', ''], ['', ''], ['THANK YOU FOR PLAYING', 't'], ['FINAL SCORE ' + score, 'h']]; }
  update(dt, game) { this.t += dt; const I = game.input; if (I.down('confirm') || I.down('fire')) this.t += dt * 3; return this.t > this.lines.length * 1.2 + 6 || I.pressed('start'); }
  draw(g, r, game) {
    frame(g, r, null, this.t); const y0 = r.H - this.t * 22;
    this.lines.forEach(([s, k], i) => { const y = y0 + i * 24; if (y < -30 || y > r.H) return; if (k === 'cast') { const spk = get('speaker', s), rig = this.portrait(s); if (rig) rig.drawPortrait(g, r.W / 2 - 70, y - 4, 22, { zoom: 2, turn: .5, bg: '#0a1426', frame: true }); T(g, spk.name, r.W / 2 - 40, y + 4, spk.color, { scale: 1 }); } else if (k === 't') E.font.title(g, s, r.W / 2, y, { scale: 2, colors: ['#fff3b0', '#ffb347', '#ff5a2a'], outline: '#000', align: 'center' }); else T(g, s, r.W / 2, y, k === 'h' ? UI.gold : '#ffffff', { align: 'center' }); });
    hintLine(g, r, game.input, [['confirm', 'HOLD: FASTER'], ['start', 'SKIP']]);
  }
}
TC.Credits = Credits;

// ---- how to play (device-aware)
function drawHowto(g, r, input, t, page = 0) {
  frame(g, r, 'HOW TO PLAY', t);
  const L = a => TC.label(input, a), pad = input.lastDevice === 'gamepad';
  const rows = [
    ['AIM', pad ? 'Right stick (left stick too)' : 'Mouse — the reticle sits under it'],
    ['FIRE', L('fire') + (pad ? '' : '  ·  hold for auto-fire')],
    ['TAKE COVER', 'Hold ' + L('cover') + ' — you are safe and you reload'],
    ['SWITCH WEAPON', L('prev') + ' / ' + L('next') + (pad ? '' : '  ·  1 2 3 4') + '  ·  or fire while in cover'],
    ['QUICK RELOAD', L('reload')],
    ['PAUSE', L('pause')]];
  rows.forEach(([k, v], i) => { T(g, k, 24, 40 + i * 16, UI.gold); T(g, v, 130, 40 + i * 16, '#ffffff'); });
  const tips = ['A RED RING WITH "!" MEANS THAT SHOT WILL HIT YOU: TAKE COVER OR KILL THE SHOOTER FIRST.', 'EVERY AREA HAS A TIME LIMIT. WHEN THE TIDE COMES IN, YOU LOSE A LIFE.', 'ORANGE VESTS CARRY AMMO FOR YOUR SPECIAL WEAPONS. RED UNIFORMS NEVER MISS.', 'SHOOT GRENADES, ROCKETS AND TORPEDOES OUT OF THE AIR. NEVER SHOOT CIVILIANS.'];
  tips.forEach((s, i) => E.font.wrap(TC.txt(s), r.W - 48).forEach((l, k) => T(g, l, 24, 142 + i * 20 + k * 9, i === 0 ? '#ff9a8a' : '#cfe0ff')));
}
TC.drawHowto = drawHowto;
