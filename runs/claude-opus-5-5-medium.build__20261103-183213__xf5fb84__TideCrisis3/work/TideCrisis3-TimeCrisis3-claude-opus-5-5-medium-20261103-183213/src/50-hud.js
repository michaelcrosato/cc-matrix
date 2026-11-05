// 50-hud: the canvas pixel HUD per viewport, anchored to the viewport's edges. TIME (a plate whose water rises as time
// runs out), SCORE and the chain, LIFE badges, the weapon panel (pips, ammo, a reload ring, the weapon strip), the
// reticle (cross, ring, dot; S/M/L), hit markers, ACTION! and WAIT, banners (TIME EXTEND, TIDE'S IN!, pickups, NEW
// WEAPON, 1UP!), score popups at world points, crisis rings with a "!" and edge arrows, the cover vignette tag, the
// radio box with a live portrait, device-aware prompts, boss bars, the continue countdown and the teammate strip.
// Reads: Sim state, WorldView's Rail3D (projection), input labels.

const UI = { bg: ['#10244a', '#081428'], accent: '#3aa0e8', text: '#f4f7ff', gold: '#ffd36a', warn: '#ff3b30', dim: '#8aa0c8' };
TC.UI = UI;
const txt = s => String(s).replace(/[‘’]/g, "'").replace(/[“”]/g, '"');   // the font has ✕ ○ □ △ — … · (engine patch 5)
TC.txt = txt;
const T = (g, s, x, y, c = UI.text, o = {}) => E.font.text(g, txt(s), Math.round(x), Math.round(y), c, Object.assign({ shadow: '#000000', outline: false }, o));
TC.T = T;
const TW = (s, o = {}) => E.font.width(txt(s), o);
const WICON = {
  hg: E.sprite(['..######', '.##ww###', '########', '###.....', '##......'], { '#': '#c8d0e0', w: '#ffffff' }, 1),
  mg: E.sprite(['.##########.', '############', '####..#.....', '###...#.....', '##..........'], { '#': '#c8d0e0' }, 1),
  sg: E.sprite(['##############', '##############', '####.##.......', '###...........'], { '#': '#e0c890' }, 1),
  gl: E.sprite(['..########', '.##########', '###oooo####', '###.....##.', '##.........'], { '#': '#a8c890', o: '#ffd36a' }, 1)
};
const BADGE = E.sprite(['.rrrrr.', 'rwwwwwr', 'rwrrrwr', 'rwwwwwr', '.rwwwr.', '..rwr..', '...r...'], { r: '#e8443a', w: '#fff3e0' }, 1);
const BADGE_OFF = E.sprite(['.ddddd.', 'd.....d', 'd.....d', 'd.....d', '.d...d.', '..d.d..', '...d...'], { d: '#5a6078' }, 1);
const PIP = E.sprite(['ww', 'yy', 'yy', 'yy'], { w: '#fff0c0', y: '#e0a030' }, 1), PIP_OFF = E.sprite(['..', 'dd', 'dd', 'dd'], { d: '#3a3f58' }, 1);

class Hud {
  constructor(i) { this.i = i; this.pop = []; this.banners = []; this.markers = []; this.action = 0; this.strip = 0; this.flashR = 0; this.radio = null; this.radioQ = []; this.prompt = null; this.seen = {}; this.muzzle = 0; this.edge = 0; this.ring = 0; }
  banner(text, color = UI.gold, dur = 1.4, scale = 2) { this.banners.push({ text, color, t: 0, dur, scale }); if (this.banners.length > 3) this.banners.shift(); }
  // events from the Sim (and presentation) for this player
  onEvent(e, sim, view, game) {
    const mine = e.p === this.i;
    switch (e.type) {
      case 'points': if (mine && e.at) this.pop.push({ at: e.at.slice(), v: e.v, t: 0, c: e.v < 0 ? UI.warn : e.why === 'kill' ? UI.gold : UI.text }); break;
      case 'hit': if (mine) this.markers.push({ t: 0, gold: e.head }); break;
      case 'bosshit': if (mine) this.markers.push({ t: 0, gold: false }); break;
      case 'action': this.action = 1.2; break;
      case 'extend': this.banner('TIME EXTEND +' + e.s, '#7fe3ff'); break;
      case 'timeup': this.banner("TIDE'S IN!", UI.warn, 1.8, 3); break;
      case 'pickup': if (mine) { const w = get('weapon', e.w); this.banner((e.first ? 'NEW WEAPON: ' : '') + w.short + ' +' + e.n, '#ffb347', e.first ? 2.2 : 1.4); this.strip = 1.5; } break;
      case 'switch': if (mine) this.strip = .9; break;
      case 'extra': if (mine) this.banner('1UP!', '#8aff8a'); break;
      case 'hurt': if (mine) { this.flashR = .5; } break;
      case 'shot': if (mine) this.muzzle = .06; break;
      case 'empty': if (mine) this.banner('RELOAD!', UI.warn, .7, 2); break;
      case 'clear': this.banner(e.bonus ? 'AREA CLEAR  +' + e.bonus : 'AREA CLEAR', UI.gold, 1.4, 2); break;
      case 'headshot': if (mine) this.banner('HEADSHOT', UI.gold, .6, 1); break;
      case 'shotdown': if (mine) this.banner('SHOT DOWN +1000', '#7fe3ff', .8, 1); break;
      case 'civhit': if (mine) this.banner('CIVILIAN HIT!', UI.warn, 1.4, 2); break;
      case 'intel': if (mine) this.banner('INTEL FOUND', '#8aff8a', 1.6, 2); break;
      case 'finalshot': this.banner('FINAL SHOT!', UI.warn, 2.4, 3); break;
      case 'stageclear': this.banner('STAGE CLEAR', UI.gold, 3, 4); break;
      case 'prompt': this.showPrompt(e.id); break;
      case 'say': if (!e.modal) { this.radioQ.push({ speaker: e.speaker, text: e.text }); if (this.radioQ.length > 4) this.radioQ.shift(); } break;
      case 'surge': this.banner('TIDE RISING!', '#7fe3ff', 1.6, 3); break;
      case 'armor': if (mine) this.banner('ARMORED — USE THE GL OR SHOTGUN', '#c8d0e0', .9, 1); break;
    }
  }
  showPrompt(id) { if (this.seen[id] || this.noPrompts) return; this.seen[id] = true; this.prompt = { id, t: 0, dur: id === 'torpedo' ? 3 : 4.5 }; }
  step(dt) {
    for (const p of this.pop) p.t += dt; this.pop = this.pop.filter(p => p.t < 1.1);
    for (const b of this.banners) b.t += dt; this.banners = this.banners.filter(b => b.t < b.dur);
    for (const m of this.markers) m.t += dt; this.markers = this.markers.filter(m => m.t < .25);
    this.action = Math.max(0, this.action - dt); this.strip = Math.max(0, this.strip - dt); this.flashR = Math.max(0, this.flashR - dt); this.muzzle = Math.max(0, this.muzzle - dt);
    if (this.prompt) { this.prompt.t += dt; if (this.prompt.t > this.prompt.dur) this.prompt = null; }
    if (this.radio) { this.radio.t += dt; if (this.radio.t > this.radio.dur) this.radio = null; }
    if (!this.radio && this.radioQ.length) { const r = this.radioQ.shift(); this.radio = { speaker: r.speaker, text: r.text, t: 0, dur: clamp(r.text.length * .055 + 1.4, 2.4, 4.6) }; }
  }
  // ------------------------------------------------------------ draw over the viewport (after present)
  draw(g, sim, vp, R, ctx) {
    const p = sim.players[this.i]; if (!p) return;
    const x0 = vp.x, y0 = vp.y, W = vp.w, H = vp.h, cx = x0 + W / 2, small = W < 300, set = ctx.settings || {}, input = ctx.input;
    if (tune.view.hideHud) return;
    const cut = sim.phase === 'cut';
    if (cut) return;
    // ---- crisis rings and edge arrows (under the rest)
    this.drawThreats(g, sim, vp, R, set);
    // ---- the player's muzzle flash and the cover tag
    if (this.muzzle > 0 && p.c < .3) { const mx = x0 + W - 24, my = y0 + H - 18; E.px.blend(g, .8, 'add', () => { E.px.disc(g, mx, my, 9, '#ffb347'); E.px.disc(g, mx - 6, my - 5, 5, '#fff3b0'); }); }
    // ---- reticle
    if (sim.phase === 'action' && p.c < .5 && !p.out) this.drawReticle(g, sim, vp, p, set);
    // ---- hit markers
    for (const m of this.markers) { const a = sim.players[this.i].aim, sx = cx + a[0] * H / 2, sy = y0 + H / 2 - a[1] * H / 2, s = 4 + m.t * 10, c = m.gold ? UI.gold : '#ffffff'; E.px.line(g, sx - s, sy - s, sx - s + 3, sy - s + 3, c); E.px.line(g, sx + s, sy - s, sx + s - 3, sy - s + 3, c); E.px.line(g, sx - s, sy + s, sx - s + 3, sy + s - 3, c); E.px.line(g, sx + s, sy + s, sx + s - 3, sy + s - 3, c); }
    // ---- score popups at world points
    for (const pp of this.pop) { const s = R.project(pp.at); if (!s) continue; T(g, (pp.v > 0 ? '+' : '') + pp.v, x0 + s[0], y0 + s[1] - pp.t * 18, pp.c, { align: 'center', outline: '#000' }); }
    // ---- top: TIME, SCORE
    this.drawTime(g, sim, vp, small);
    const sc = String(p.score).padStart(7, '0'), sy = y0 + (small ? 36 : 0);
    T(g, (p.name === 'P1' || !ctx.hub ? 'SCORE' : p.name) + (small && sim.players.length > 1 ? ' ' + p.name : ''), x0 + 6, sy + 5, UI.dim);
    T(g, sc, x0 + 6, sy + 14, '#ffffff', { scale: 2 });
    if (p.contMark) T(g, 'C' + p.contMark, x0 + 8 + TW(sc, { scale: 2 }), sy + 14, UI.warn);
    const mul = 1 + Math.min(10, Math.floor(p.chain / 5)) * .1;
    if (p.chain >= 5) T(g, 'x' + mul.toFixed(1) + '  CHAIN ' + p.chain, x0 + 6, sy + 31, UI.gold);
    // ---- boss bars under TIME
    if (sim.boss && !sim.boss.defeated && sim.boss.intro <= 0) { const bars = TC.bossBars(sim.boss); bars.forEach((b, k) => { const bw = Math.min(150, W * .42), bx = cx - bw / 2, by = y0 + 38 + k * 12; T(g, b.label, bx, by - 1, '#ffb0a0', { font: 'tiny' }); E.ui.bar(g, bx, by + 5, bw, 4, b.f, b.f < .25 ? '#ff3b30' : '#ff8a3a'); }); }
    // ---- bottom left: LIFE
    const ly = y0 + H - 16;
    T(g, 'LIFE', x0 + 6, ly - 9, UI.dim);
    const shown = Math.max(p.lives, 0);
    for (let k = 0; k < Math.max(shown, Math.min(9, sim.diff.lives)); k++) E.px.sprite(g, k < shown ? BADGE : BADGE_OFF, x0 + 6 + k * 9, ly, false);
    if (shown > 9) T(g, 'x' + shown, x0 + 6 + 9 * 9, ly, '#fff');
    if (this.flashR > 0 && ((this.flashR * 20) | 0) % 2) { E.px.rect(g, x0, y0, W, 2, UI.warn); E.px.rect(g, x0, y0 + H - 2, W, 2, UI.warn); E.px.rect(g, x0, y0, 2, H, UI.warn); E.px.rect(g, x0 + W - 2, y0, 2, H, UI.warn); }
    // ---- bottom right: the weapon panel
    this.drawWeapon(g, sim, vp, p, input);
    // ---- center texts
    if (sim.phase === 'travel') { if (((sim.t * 3) | 0) % 2) E.font.title(g, 'WAIT', cx, y0 + H * .42, { scale: small ? 2 : 3, colors: ['#ffffff', '#9fe3ff', '#3aa0e8'], outline: '#08142a', align: 'center' }); }
    if (this.action > 0) { const k = clamp((1.2 - this.action) / .15, 0, 1), off = (1 - k) * W * .5; E.font.title(g, 'ACTION!', cx + off, y0 + H * .38, { scale: small ? 3 : 4, colors: ['#fff3b0', '#ffb347', '#ff5a2a', '#a81e1e'], outline: '#1a0808', depth: 2, align: 'center' }); }
    if (p.c >= .5 && sim.phase === 'action') T(g, p.reloadT > 0 || p.mag < 9 ? 'COVER · RELOADING' : 'COVER', cx, y0 + H - 12, '#9fe3ff', { align: 'center' });
    if (p.mag === 0 && p.w === 'hg' && sim.phase === 'action' && p.c < .5 && ((sim.t * 4) | 0) % 2) T(g, 'RELOAD!', cx, y0 + H * .58, UI.warn, { align: 'center', scale: 2 });
    this.banners.forEach((b, k) => { const a = b.t < .12 ? b.t / .12 : 1; T(g, b.text, cx, y0 + H * .27 + k * 14 * (b.scale > 2 ? 1.6 : 1) - (1 - a) * 6, b.color, { align: 'center', scale: small ? Math.min(2, b.scale) : b.scale, outline: '#000000' }); });
    // ---- radio box (top), prompts (bottom center)
    this.bossShown = !!(sim.boss && !sim.boss.defeated && sim.boss.intro <= 0);
    if (this.radio && set.subtitles !== false) this.drawRadio(g, vp, this.radio, ctx);
    if (this.prompt) this.drawPrompt(g, sim, vp, input);
    // ---- continue
    if (p.out) { E.ui.box(g, cx - 70, y0 + H / 2 - 26, 140, 52, { bg: UI.bg, border: UI.accent }); T(g, ctx.hub ? 'BACK IN…' : 'CONTINUE?', cx, y0 + H / 2 - 20, '#ffffff', { align: 'center', scale: 2 }); T(g, Math.ceil(p.cont), cx, y0 + H / 2 - 4, UI.gold, { align: 'center', scale: 3 }); if (!ctx.hub) T(g, 'PRESS ' + TC.label(input, 'confirm'), cx, y0 + H / 2 + 18, UI.dim, { align: 'center' }); }
    // ---- teammates (AI Hub)
    if (ctx.hub && sim.players.length > 1) { let ty = y0 + 6; for (const q of sim.players) { if (q.i === this.i) continue; const tx = x0 + W - 90; E.px.rect(g, tx, ty, 6, 6, q.color); T(g, q.name.slice(0, 10), tx + 9, ty - 1, q.left ? '#666' : '#fff'); T(g, (q.out ? 'OUT' : q.lives + '♥') + (q.c >= .5 ? ' •' : ''), tx + 66, ty - 1, q.out ? UI.warn : UI.gold); ty += 10; } }
  }
  drawTime(g, sim, vp, small) {
    const W = vp.w, cx = vp.x + W / 2, y = vp.y + 3, w = 92, h = 30, t = Math.max(0, sim.timer), frac = sim.timeMax ? 1 - t / sim.timeMax : 0;
    E.ui.box(g, cx - w / 2, y, w, h, { bg: ['#0a1a34', '#06101e'], border: '#3aa0e8', alpha: .9 });
    // the tide rising inside the plate
    const wl = Math.round((h - 4) * clamp(frac, 0, 1)), wy = y + h - 2 - wl;
    for (let xx = 0; xx < w - 4; xx++) { const s = Math.sin(xx * .35 + sim.t * 4) * 1.2; E.px.rect(g, cx - w / 2 + 2 + xx, wy + s, 1, Math.max(0, wl - s), t < 10 ? '#5a1a2a' : '#163e6a'); }
    const red = t < 10, blink = t < 5 && ((sim.t * 4) | 0) % 2;
    T(g, 'TIME', cx, y + 2, red ? '#ff8a80' : UI.dim, { align: 'center', font: 'tiny' });
    if (!blink) T(g, t.toFixed(2), cx, y + 10, red ? UI.warn : '#ffffff', { align: 'center', scale: 2 });
  }
  drawReticle(g, sim, vp, p, set) {
    const a = p.aim, sx = Math.round(vp.x + vp.w / 2 + a[0] * vp.h / 2), sy = Math.round(vp.y + vp.h / 2 - a[1] * vp.h / 2), style = set.reticle || 'Cross', size = { S: .7, M: 1, L: 1.4 }[set.reticleSize || 'M'] || 1;
    const col = p.color, out = '#ffffff', s = Math.round(6 * size), b = p.bloom ? Math.round(p.bloom * 1.5) : 0;
    const L = (x0, y0, x1, y1) => { E.px.line(g, x0, y0 + 1, x1, y1 + 1, '#000000'); E.px.line(g, x0, y0, x1, y1, col); };
    if (style === 'Cross') { L(sx - s - b - 3, sy, sx - 2 - b, sy); L(sx + 2 + b, sy, sx + s + b + 3, sy); L(sx, sy - s - b - 3, sx, sy - 2 - b); L(sx, sy + 2 + b, sx, sy + s + b + 3); E.px.dot(g, sx, sy, out); }
    else if (style === 'Ring') { for (let k = 0; k < 16; k++) { const an = k / 16 * Math.PI * 2; E.px.dot(g, sx + Math.cos(an) * (s + b), sy + Math.sin(an) * (s + b), k % 2 ? col : out); } E.px.dot(g, sx, sy, out); }
    else { E.px.disc(g, sx, sy, Math.max(1, s * .35), '#000000'); E.px.disc(g, sx, sy, Math.max(1, s * .25), col); }
  }
  drawThreats(g, sim, vp, R, set) {
    const big = set.threatSize === 'Large' ? 2 : 1;
    for (const t of sim.threats) {
      if (t.done || t.cancelled) continue;
      const mine = t.target === this.i, p = R.project(t.at || [0, 0, 0]);
      const k = clamp(t.left / t.dur, 0, 1), rad = (6 + 20 * k) * big;
      if (p && p[0] >= 0 && p[0] < vp.w && p[1] >= 0 && p[1] < vp.h) {
        const x = vp.x + p[0], y = vp.y + p[1];
        if (!mine) { for (let a = 0; a < 12; a++) { const an = a / 12 * Math.PI * 2; E.px.dot(g, x + Math.cos(an) * rad * .6, y + Math.sin(an) * rad * .6, '#ff9a8a'); } continue; }
        const n = Math.max(16, rad * 4 | 0);
        for (let a = 0; a < n; a++) { const an = a / n * Math.PI * 2; E.px.rect(g, x + Math.cos(an) * rad - 1, y + Math.sin(an) * rad - 1, 2, 2, '#ff2a1a'); }
        for (let a = 0; a < n; a++) { const an = a / n * Math.PI * 2; E.px.dot(g, x + Math.cos(an) * (rad - 2), y + Math.sin(an) * (rad - 2), '#ffffff'); }
        E.px.blend(g, .6, 'add', () => E.px.disc(g, x, y, 3 + (1 - k) * 3, '#ff6a40'));
        T(g, '!', x - 1, y - 18 - (big - 1) * 10, '#ffffff', { outline: '#ff2a1a', scale: big + 1 });
        if (t.kind === 'torpedo') T(g, 'SHOOT IT!', x, y + rad + 4, '#7fe3ff', { align: 'center', outline: '#000' });
      } else if (mine) {
        // the edge arrow toward an off-screen shooter
        const dx = p ? p[0] - vp.w / 2 : (t.at ? 1 : 0), dy = p ? p[1] - vp.h / 2 : 0, an = Math.atan2(dy, dx), ex = vp.x + vp.w / 2 + Math.cos(an) * (vp.w / 2 - 14), ey = vp.y + vp.h / 2 + Math.sin(an) * (vp.h / 2 - 14);
        const pts = [[ex + Math.cos(an) * 9, ey + Math.sin(an) * 9], [ex + Math.cos(an + 2.4) * 8, ey + Math.sin(an + 2.4) * 8], [ex + Math.cos(an - 2.4) * 8, ey + Math.sin(an - 2.4) * 8]];
        if (((sim.t * 8) | 0) % 2) E.px.poly(g, pts, '#ff2a1a'); T(g, '!', ex - 1, ey - 4, '#ffffff', { outline: '#ff2a1a' });
      }
    }
    // the FINAL SHOT ring over the lever arm
    const B = sim.boss; if (B && B.id === 'krake' && B.final > 0) { const p = R.project(B.leverAt); if (p) { const x = vp.x + p[0], y = vp.y + p[1], rad = 8 + B.final / 3 * 26; for (let a = 0; a < 40; a++) { const an = a / 40 * Math.PI * 2; E.px.rect(g, x + Math.cos(an) * rad - 1, y + Math.sin(an) * rad - 1, 2, 2, a % 2 ? '#ffd36a' : '#ffffff'); } T(g, 'SHOOT THE LEVER!', x, y + rad + 6, UI.gold, { align: 'center', outline: '#000' }); } }
  }
  drawWeapon(g, sim, vp, p, input) {
    const x1 = vp.x + vp.w - 6, y1 = vp.y + vp.h - 6, w = get('weapon', p.w), inf = sim.cheats.ammo || tune.player.infAmmo;
    const ic = WICON[p.w];
    E.ui.box(g, x1 - 84, y1 - 28, 84, 28, { bg: ['#0a1a34', '#06101e'], border: p.switchT > 0 ? UI.gold : '#3aa0e8', alpha: .85 });
    E.px.sprite(g, ic, x1 - 80, y1 - 24, false);
    T(g, w.name, x1 - 64, y1 - 25, '#ffffff', { font: 'tiny' });
    if (p.w === 'hg') { for (let k = 0; k < 9; k++) E.px.sprite(g, k < p.mag ? PIP : PIP_OFF, x1 - 64 + k * 4, y1 - 14, false); T(g, 'INF', x1 - 24, y1 - 14, UI.dim, { font: 'tiny' }); }
    else { T(g, inf ? 'INF' : p.ammo[p.w], x1 - 64, y1 - 18, '#ffffff', { scale: 2 }); E.ui.bar(g, x1 - 30, y1 - 13, 24, 3, inf ? 1 : p.ammo[p.w] / w.pool, '#ffb347'); }
    if (p.c >= .5 && p.mag < 9) { const k = clamp(p.reloadT / tune.player.reload, 0, 1); E.ui.bar(g, x1 - 80, y1 - 6, 76, 2, k, '#7fe3ff'); }
    if (this.strip > 0) {
      const ws = TC.WEAPONS; ws.forEach((id, k) => { const have = id === 'hg' || p.ammo[id] > 0 || (inf && p.owned[id]); const bx = x1 - 84 + k * 21, by = y1 - 44; E.ui.box(g, bx, by, 19, 14, { bg: id === p.w ? ['#3a5a8a', '#20304a'] : ['#101c30', '#0a1220'], border: id === p.w ? UI.gold : '#2a3a5a', alpha: have ? .95 : .5 }); E.px.sprite(g, WICON[id], bx + 2, by + 4, false); T(g, k + 1, bx + 14, by + 1, have ? '#fff' : '#555', { font: 'tiny' }); });
      T(g, TC.label(input, 'prev') + ' / ' + TC.label(input, 'next'), x1 - 42, y1 - 54, UI.dim, { align: 'center', font: 'tiny' });
    }
  }
  drawRadio(g, vp, r, ctx) {
    const spk = has('speaker', r.speaker) ? get('speaker', r.speaker) : null, w = Math.min(vp.w - 120, 260), x = vp.x + vp.w / 2 - w / 2, y = vp.y + 37 + (this.bossShown ? 26 : 0);
    E.ui.box(g, x, y, w, 30, { bg: UI.bg, border: spk ? spk.color : UI.accent, alpha: .88 });
    const rig = ctx.portrait(r.speaker); if (rig) rig.drawPortrait(g, x + 3, y + 3, 24, { zoom: 2.4, turn: .5, bg: '#0a1426', frame: false });
    T(g, spk ? spk.name : '', x + 31, y + 3, spk ? spk.color : UI.gold, { font: 'tiny' });
    const shown = txt(r.text).slice(0, Math.floor(r.t * 40)), lines = E.font.wrap(shown, w - 36);
    lines.slice(0, 2).forEach((l, k) => T(g, l, x + 31, y + 10 + k * 9, '#ffffff'));
  }
  drawPrompt(g, sim, vp, input) {
    const id = this.prompt.id, L = a => '[' + TC.label(input, a) + ']';
    const txt = { cover: 'HOLD ' + L('cover') + ' TO TAKE COVER', reload: 'YOU RELOAD IN COVER  ·  ' + L('reload') + ' QUICK RELOAD', torpedo: "COVER WON'T STOP IT — SHOOT THE TORPEDO!", switch: L('prev') + ' / ' + L('next') + ' — OR FIRE IN COVER — TO SWITCH', shield: 'SHOTGUN OR GRENADE KNOCKS THE SHIELD ASIDE', civ: "DON'T SHOOT CIVILIANS", aim: 'AIM ' + (input.lastDevice === 'gamepad' ? '[STICK]' : '[MOUSE]') + '  ·  FIRE ' + L('fire') }[id] || id;
    const w = TW(txt) + 16, x = vp.x + vp.w / 2 - w / 2, y = vp.y + vp.h - 40;
    E.ui.box(g, x, y, w, 14, { bg: ['#203a6a', '#10203e'], border: UI.gold, alpha: .92 }); T(g, txt, vp.x + vp.w / 2, y + 3, '#ffffff', { align: 'center' });
  }
}
TC.Hud = Hud;
