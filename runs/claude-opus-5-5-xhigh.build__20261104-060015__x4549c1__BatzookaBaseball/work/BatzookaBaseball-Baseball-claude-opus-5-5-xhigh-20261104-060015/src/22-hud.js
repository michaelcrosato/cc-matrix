/* =============================================================================
 * 22-hud: the 10-foot HUD. The scorebug (score, inning, outs, the count, a mini
 * diamond), the meters (BATZOOKA gauge, turbo, wind), the player card, the
 * context prompts in the glyphs of the device used last, call stamps, pitch info,
 * the pitch-select diamond, the Plate Cam overlays (zone, reticle, target marker,
 * release ring, crossing dot, timing feedback), throw targets and the radar.
 * Big, bold, few things at once; nothing important in color alone.
 * ========================================================================== */
const SAFE = 12;
BZ.hud = {
  stamps: [], toasts: [], feedback: null, info: null,
  stamp(text, o = {}) {
    if (!BZ.cosmetic) return;
    this.stamps = this.stamps.filter(s => s.prio > (o.prio || 1));
    this.stamps.push({ text, t: 0, dur: o.dur || 1.4, colors: o.colors || ['#fff6c0', '#ffb030', '#d8501a'], scale: o.scale || 3, prio: o.prio || 1, sub: o.sub });
  },
  toast(text, dur = 2.2) { this.toasts.push({ text, t: 0, dur }); if (this.toasts.length > 3) this.toasts.shift(); },
  step(dt) {
    for (const s of this.stamps) s.t += dt; this.stamps = this.stamps.filter(s => s.t < s.dur);
    for (const s of this.toasts) s.t += dt; this.toasts = this.toasts.filter(s => s.t < s.dur);
    if (this.feedback) { this.feedback.t += dt; if (this.feedback.t > 1.4) this.feedback = null; }
    if (this.info) { this.info.t += dt; if (this.info.t > 2.2) this.info = null; }
  },
  clear() { this.stamps = []; this.toasts = []; this.feedback = null; this.info = null; },
  hidden(M) { return M.cinematic || BZ.cams.replay || BZ.cams.moon || (BZ.talk && BZ.talk.cutscene); },
  /* ---- the whole HUD over the match ---- */
  draw(r, M, fr) {
    r.overlay(g => {
      const W = r.W, H = r.H;
      if (!this.hidden(M) && !M.derby) {
        this.scorebug(g, M);
        this.meters(g, r, M);
        if (M.phase === 'atBat' || M.phase === 'inPlay') this.playerCard(g, r, M);
        this.prompts(g, r, M);
        if (BZ.cams.mode === 'field' && (M.phase === 'inPlay' || M.phase === 'playOver')) this.radar(g, r, M);
        if (M.phase === 'atBat' && M.ab && M.ab.sub === 'select') this.pitchSelect(g, r, M);
        if (M.phase === 'halfEnd' || M.phase === 'final') this.lineScore(g, r, M);
        if (M.phase === 'halfStart' || M.phase === 'pregame') this.inningCard(g, r, M);
        if (M.phase === 'boom' && M.boom) this.boomCard(g, r, M);
      }
      if (BZ.cams.replay) { const k = Math.floor(r.game.real * 3) % 2; E.font.title(g, 'REPLAY', SAFE + 6, SAFE + 4, { scale: 2, colors: ['#ffffff', '#ff5a5a'] }); if (k) px.disc(g, SAFE + 2, SAFE + 9, 3, '#ff2a2a'); BZ.legend(g, r, [['south', 'SKIP']], this.mainInput(M)); }
      this.drawStamps(g, r);
      this.drawToasts(g, r);
      if (this.info && !this.hidden(M)) { const s = this.info; E.font.text(g, s.text, SAFE + 2, SAFE + 52, s.color || '#ffffff', { shadow: '#000', scale: 1 }); }
      if (this.feedback && !this.hidden(M)) { const f = this.feedback; E.font.text(g, f.text, W / 2, H * .62, f.color, { align: 'center', shadow: '#000', scale: 2 }); if (f.sub) E.font.text(g, f.sub, W / 2, H * .62 + 18, '#ffd040', { align: 'center', shadow: '#000' }); }
      if (BZ.dev && BZ.dev.drawPins) BZ.dev.drawPins(g, r);
    });
  },
  mainInput(M) { for (const T of M.teams) if (T.humans.length) return T.humans[0].input; return BZ.game.input; },
  scorebug(g, M) {
    const x = SAFE, y = SAFE, A = M.teams[0], Hm = M.teams[1], off = BZ.offense(M);
    E.ui.box(g, x, y, 118, 46, { bg: ['#1a2040', '#0a0e1c'], border: '#5a6a9a', alpha: .9 });
    const row = (T, yy, bat) => {
      px.rect(g, x + 4, yy, 4, 12, T.def.colors[0]); px.rect(g, x + 8, yy, 2, 12, T.def.colors[1]);
      E.font.text(g, T.def.abbr, x + 13, yy + 2, '#ffffff', { shadow: '#000' });
      if (bat) E.font.text(g, '▸', x + 33, yy + 2, '#ffd040');
      E.font.text(g, String(T.runs), x + 58, yy - 1, '#ffffff', { scale: 2, align: 'right', shadow: '#000' });
    };
    row(A, y + 5, off === A); row(Hm, y + 25, off === Hm);
    // inning, outs, count, mini diamond
    const ix = x + 66;
    E.font.text(g, (M.half === 'top' ? '▲' : '▼') + M.inning, ix, y + 5, '#ffd040', { shadow: '#000' });
    for (let i = 0; i < 2; i++) { px.disc(g, ix + 3 + i * 8, y + 19, 2.6, '#202638'); if (M.outs > i) px.disc(g, ix + 3 + i * 8, y + 19, 2.2, '#ff5a3a'); }
    E.font.text(g, 'B', ix, y + 28, '#9ab0ff'); for (let i = 0; i < 3; i++) { px.disc(g, ix + 9 + i * 6, y + 31, 2, i < M.balls ? '#5aff8a' : '#2a3048'); }
    E.font.text(g, 'S', ix, y + 37, '#9ab0ff'); for (let i = 0; i < 2; i++) { px.disc(g, ix + 9 + i * 6, y + 40, 2, i < M.strikes ? '#ff5a3a' : '#2a3048'); }
    const dx = x + 104, dy = y + 22, b = M.bases;
    const base = (bx, by, on) => { px.poly(g, [[bx, by - 4], [bx + 4, by], [bx, by + 4], [bx - 4, by]], on ? '#ffd040' : '#3a4060'); if (!on) px.poly(g, [[bx, by - 2], [bx + 2, by], [bx, by + 2], [bx - 2, by]], '#1a2040'); };
    base(dx + 7, dy, b[0]); base(dx, dy - 7, b[1]); base(dx - 7, dy, b[2]);
  },
  meters(g, r, M) {
    const ca = r.game.cornerArea && r.game.cornerArea(), right = ca && ca.y0 < 60 ? ca.x0 - 6 : r.W - SAFE;
    const off = BZ.offense(M), def = BZ.defense(M), T = M.phase === 'atBat' || M.phase === 'inPlay' ? off : off;
    const w = 108, x = right - w, y = SAFE;
    E.ui.box(g, x, y, w, 40, { bg: ['#2a1a10', '#120a06'], border: '#a86a2a', alpha: .9 });
    // the bat-shaped BATZOOKA gauge
    const full = T.meter >= 100, k = T.meter / 100, blink = full && Math.floor(r.game.real * 6) % 2;
    E.font.text(g, full ? 'BATZOOKA READY!' : 'BATZOOKA', x + 5, y + 4, blink ? '#ffffff' : '#ffd040', { shadow: '#000' });
    const bx = x + 5, by = y + 15, bw = w - 10;
    px.rect(g, bx, by + 2, 14, 4, '#3a2a1a'); px.poly(g, [[bx + 14, by + 2], [bx + bw, by - 1], [bx + bw, by + 8], [bx + 14, by + 6]], '#3a2a1a');
    const fw = Math.round(bw * k);
    if (fw > 0) { px.rect(g, bx, by + 3, Math.min(14, fw), 2, '#ff8a2a'); if (fw > 14) px.poly(g, [[bx + 14, by + 3], [bx + fw, by + 3 - (fw - 14) / (bw - 14) * 3], [bx + fw, by + 6 + (fw - 14) / (bw - 14) * 2], [bx + 14, by + 5]], full ? (blink ? '#fff4a0' : '#ffb020') : '#ff7a1a'); }
    E.font.text(g, Math.floor(T.meter) + '%', x + w - 5, y + 4, '#ffffff', { align: 'right', shadow: '#000' });
    // turbo and wind
    E.font.text(g, 'TURBO', x + 5, y + 27, '#9ae0ff', { shadow: '#000' });
    E.ui.bar(g, x + 36, y + 29, 30, 4, (M.phase === 'inPlay' && BZ.ctl.who(M, def.side, 'field') ? def : off).turbo / 100, '#4ac8ff');
    const wd = M.park.wind;
    if (wd && wd.mph) { const a = Math.atan2(wd.y, wd.x), cx = x + 80, cy = y + 31; px.line(g, cx - Math.cos(a) * 5, cy - Math.sin(a) * 4, cx + Math.cos(a) * 5, cy + Math.sin(a) * 4, '#ffffff', 1); px.disc(g, cx + Math.cos(a) * 5, cy + Math.sin(a) * 4, 1.5, '#ffd040'); E.font.text(g, wd.mph + 'mph', x + w - 4, y + 27, '#ffffff', { align: 'right' }); }
    else E.font.text(g, M.park.def.wind ? 'CALM' : 'NO WIND', x + w - 4, y + 27, '#8a90a8', { align: 'right' });
  },
  playerCard(g, r, M) {
    const x = SAFE, y = r.H - SAFE - 46, pl = M.phase === 'atBat' ? M.batter : M.batter, D = BZ.defense(M);
    const rig = BZ.rigFor(pl, 'bench');
    E.ui.box(g, x, y, 128, 44, { bg: ['#1a2040', '#0a0e1c'], border: '#5a6a9a', alpha: .9 });
    if (rig && BZ.cosmetic) rig.drawPortrait(g, x + 4, y + 4, 36, { zoom: 2.6, frame: false });
    E.font.text(g, pl.name.replace(/".*?" /, '').toUpperCase().slice(0, 16), x + 44, y + 5, '#ffffff', { shadow: '#000' });
    const s = M.stats[pl.id] || { AB: 0, H: 0, HR: 0 };
    E.font.text(g, '#' + pl.num + ' ' + pl.pos + '  ' + (pl.bt || 'R/R'), x + 44, y + 16, '#9ab0ff');
    E.font.text(g, s.H + '-' + s.AB + (s.HR ? '  ' + s.HR + ' HR' : ''), x + 44, y + 27, '#ffd040');
    // the pitcher's stamina under it
    const st = BZ.staminaOf(M, D.pitcher);
    E.font.text(g, 'P ' + D.pitcher.short, x + 2, y - 10, '#ffffff', { shadow: '#000' });
    E.ui.bar(g, x + 56, y - 8, 60, 4, st / 100, st < 15 ? '#ff3a3a' : st < 40 ? '#ffb030' : '#5aff8a');
  },
  /* ---- prompts: icon + verb for this moment, per player at their side of the screen ---- */
  prompts(g, r, M) {
    const list = [];
    for (const T of M.teams) for (const h of T.humans) {
      const I = h.input, ctx = this.context(M, T, h);
      if (ctx.length) list.push([I, ctx]);
    }
    list.forEach(([I, ctx], i) => {
      const y = r.H - SAFE - 14 - Math.floor(i / 2) * 22, right = i % 2 === 1;
      if (list.length === 1) BZ.drawPrompts(g, I, ctx, r.W / 2 + 40, y, { align: 'center' });
      else BZ.drawPrompts(g, I, ctx, right ? r.W - SAFE : SAFE + 136, y, { align: right ? 'right' : 'left' });
      if (list.length > 1) E.font.text(g, 'P' + I.player, right ? r.W - SAFE : SAFE + 136, y - 11, E.PLAYER_COLORS[(I.player - 1) % 4], { align: right ? 'right' : 'left', shadow: '#000' });
    });
  },
  /** the prompt list for a human in this moment */
  context(M, T, h) {
    const off = BZ.offense(M) === T, I = h.input, S = M.ab, out = [];
    const duty = d => BZ.ctl.who(M, T.side, d) === I;
    const pct = Math.floor(T.meter);
    if (M.phase === 'atBat' && S) {
      if (off && duty('bat')) {
        if (S.sub === 'walkup') return [['south', 'READY']];
        out.push(['move', 'AIM'], ['south', 'SWING'], ['west', 'POWER'], ['north', 'BUNT']);
        out.push(T.batzookaArmed ? ['r1', 'ARMED!', true] : ['r1', 'BATZOOKA', T.meter >= 100, pct + '%']);
        if (S.sub === 'select' && M.bases.some(Boolean) && duty('run')) out.push([['l1', 'num2'], 'STEAL']);
      } else if (off && duty('run') && S.sub === 'select' && M.bases.some(Boolean)) { out.push([['l1', 'num2'], 'STEAL'], ['r1', 'LEAD OFF']); }
      if (!off && duty('pitch')) {
        if (S.sub === 'select') { /* the pitch diamond shows these */ if (M.bases.some(Boolean)) out.push([['l1', 'num1'], 'PICKOFF']); }
        else if (S.sub === 'windup') out.push(['move', 'AIM'], [S.slot === 'r1' ? 'r1' : S.slot, 'RELEASE ON THE RING']);
        else if (S.sub === 'flight' && S.pitch && S.pitch.u < .4) out.push(['move', 'AFTERTOUCH']);
      }
      return out;
    }
    if (M.phase === 'inPlay' && M.play) {
      if (!off && duty('field')) {
        const f = M.ctlF;
        if (f && f.has) { out.push(['east', '1B'], ['north', '2B'], ['west', '3B'], ['south', 'HOME']); out.push(['r1', 'LASER', T.meter >= 50, pct + '%']); }
        else { out.push(['move', 'RUN'], ['l2', 'TURBO'], ['r1', 'JUMP'], ['r2', 'DIVE'], ['l1', 'SWITCH']); }
      }
      if (off && duty('run') && M.play.kind) {
        out.push(['r1', 'GO'], ['l1', 'BACK'], ['l2', 'TURBO']);
        out.push([['r1', 'l2'], 'AFTERBURN', T.meter >= 50, pct + '%']);
      }
      return out;
    }
    if (M.phase === 'playOver' || M.phase === 'halfEnd' || M.phase === 'halfStart' || M.phase === 'pregame' || M.phase === 'between') return [['south', 'CONTINUE']];
    return out;
  },
  /** the pitch-select diamond: four pitch names around the face-button icons, plus R1 SUPER */
  pitchSelect(g, r, M) {
    const D = BZ.defense(M), I = BZ.ctl.who(M, D.side, 'pitch'); if (!I) return;
    const lefty = (M.batter.bt || 'R/R')[0] === 'L', rep = BZ.repertoire(D.pitcher), cx = lefty ? SAFE + 74 : r.W - SAFE - 74, cy = r.H - SAFE - 104, mouse = I.lastDevice === 'mouse', keys = I.lastDevice === 'keyboard';
    E.ui.box(g, cx - 72, cy - 44, 144, 104, { bg: ['#1a1030', '#0a0614'], border: '#8a6ad8', alpha: .9 });
    E.font.text(g, 'PITCH', cx, cy - 40, '#ffd040', { align: 'center', shadow: '#000' });
    const pos = { north: [0, -20], east: [38, 0], south: [0, 20], west: [-38, 0] };
    BZ.PITCH_SLOTS.forEach((sl, i) => {
      const [dx, dy] = pos[sl], p = BZ.PITCHES[rep[i]], sel = mouse && (M.ab.pick || 0) === i;
      const act = mouse || keys ? 'num' + (i + 1) : sl, gw = BZ.glyphW(I, act, 11);
      if (sel) E.ui.box(g, cx + dx - 34, cy + dy - 3, 68, 17, { bg: '#4a2a8a', border: '#ffd040' });
      BZ.glyph(g, I, act, cx + dx - gw / 2, cy + dy - 1, 11, false, mouse ? 'keyboard' : undefined);
      E.font.text(g, p.short, cx + dx, cy + dy + 11, sel ? '#ffffff' : '#d8d0ff', { align: 'center', shadow: '#000' });
    });
    const sup = BZ.PITCHES[D.def.superPitch], ok = D.meter >= 100, sel5 = mouse && M.ab.pick === 4;
    if (sel5) E.ui.box(g, cx - 66, cy + 36, 132, 16, { bg: '#4a2a8a', border: '#ffd040' });
    const gw = BZ.glyph(g, I, keys || mouse ? 'num5' : 'r1', cx - 64, cy + 39, 11, !ok, mouse ? 'keyboard' : undefined);
    E.font.text(g, sup.short + (ok ? '' : ' ' + Math.floor(D.meter) + '%'), cx - 60 + gw, cy + 41, ok ? '#ffd040' : '#7a7090', { shadow: '#000' });
    if (mouse) E.font.text(g, 'wheel: pick  click: throw', cx, cy + 56, '#8a8aa8', { align: 'center' });
    E.ui.bar(g, cx - 60, cy - 30, 120, 3, BZ.staminaOf(M, D.pitcher) / 100, '#5aff8a');
  },
  inningCard(g, r, M) {
    const t = M.phaseT, a = Math.min(1, t * 4);
    const txt = M.phase === 'pregame' ? 'PLAY BALL!' : (M.half === 'top' ? 'TOP ' : 'BOTTOM ') + BZ.ord(M.inning);
    const cy = r.H * .42;
    E.font.title(g, txt, r.W / 2, cy - (1 - a) * 30, { scale: 3, align: 'center', colors: ['#ffffff', '#ffd040', '#ff7a1a'], depth: 2 });
    if (M.phase === 'pregame') E.font.text(g, M.teams[0].def.name.toUpperCase() + '  AT  ' + M.teams[1].def.name.toUpperCase(), r.W / 2, cy + 30, '#ffffff', { align: 'center', shadow: '#000' });
    else { const O = BZ.offense(M); E.font.text(g, O.def.name.toUpperCase() + ' AT BAT', r.W / 2, cy + 30, '#ffffff', { align: 'center', shadow: '#000' }); }
    if (M.bonusRunner && M.phase === 'halfStart') E.font.text(g, 'BONUS RUNNER ON SECOND', r.W / 2, cy + 42, '#ffd040', { align: 'center', shadow: '#000' });
    E.font.text(g, M.park.name.toUpperCase(), r.W / 2, cy + 54, '#9ab0ff', { align: 'center', shadow: '#000' });
  },
  lineScore(g, r, M) {
    const n = Math.max(M.innings, M.inning), cw = 14, w = 96 + n * cw, x = Math.round(r.W / 2 - w / 2), y = Math.round(r.H * .58);
    E.ui.box(g, x, y, w, 46, { bg: ['#1a2040', '#0a0e1c'], border: '#5a6a9a', alpha: .92 });
    for (let i = 0; i < n; i++) E.font.text(g, String(i + 1), x + 44 + i * cw, y + 4, '#9ab0ff', { align: 'center' });
    E.font.text(g, 'R', x + 52 + n * cw, y + 4, '#ffd040', { align: 'center' }); E.font.text(g, 'H', x + 66 + n * cw, y + 4, '#ffd040', { align: 'center' }); E.font.text(g, 'E', x + 80 + n * cw, y + 4, '#ffd040', { align: 'center' });
    M.teams.forEach((T, k) => {
      const yy = y + 17 + k * 13;
      E.font.text(g, T.def.abbr, x + 6, yy, '#ffffff');
      for (let i = 0; i < n; i++) { const v = T.line[i]; E.font.text(g, v === undefined ? '-' : String(v), x + 44 + i * cw, yy, '#ffffff', { align: 'center' }); }
      E.font.text(g, String(T.runs), x + 52 + n * cw, yy, '#ffffff', { align: 'center' }); E.font.text(g, String(T.hits), x + 66 + n * cw, yy, '#ffffff', { align: 'center' }); E.font.text(g, String(T.errors), x + 80 + n * cw, yy, '#ffffff', { align: 'center' });
    });
    if (M.phase === 'halfEnd') E.font.title(g, M.outs >= 3 ? 'SIDE RETIRED' : 'END OF HALF', r.W / 2, y - 26, { scale: 2, align: 'center', colors: ['#ffffff', '#9ab0ff'] });
  },
  boomCard(g, r, M) {
    const B = M.boom;
    E.font.title(g, 'SUDDEN BOOM!', r.W / 2, 60, { scale: 3, align: 'center', colors: ['#fff6c0', '#ffb030', '#d8501a'], depth: 2 });
    M.teams.forEach((T, k) => E.font.text(g, T.def.abbr + '  ' + B.slugger[k].short + '  ' + B.feet[k] + ' FT  (' + B.swings[k] + '/' + B.max + ')', r.W / 2, 100 + k * 16, '#ffffff', { align: 'center', shadow: '#000', scale: 1 }));
    if (B.last) E.font.text(g, B.last.feet ? B.last.feet + ' FEET!' : 'NO DINGER', r.W / 2, 140, B.last.feet ? '#ffd040' : '#9ab0ff', { align: 'center', shadow: '#000', scale: 2 });
  },
  drawStamps(g, r) {
    for (const s of this.stamps) {
      const k = Math.min(1, s.t * 7), out = s.t > s.dur - .2 ? (s.dur - s.t) / .2 : 1, sc = s.scale;
      const jig = s.t < .25 ? Math.round((BZ.F() - .5) * 4) : 0;
      if (out <= 0) continue;
      const y = Math.round(r.H * .2 + (1 - k) * -20) + jig;
      E.font.title(g, s.text, r.W / 2 + jig, y, { scale: sc, align: 'center', colors: s.colors, depth: 3, depthColor: '#2a0e04' });
      if (s.sub) E.font.text(g, s.sub, r.W / 2, y + sc * 9 + 6, '#ffffff', { align: 'center', shadow: '#000' });
    }
  },
  drawToasts(g, r) {
    this.toasts.forEach((s, i) => { const y = 64 + i * 16, w = E.font.width(s.text) + 16; E.ui.box(g, Math.round(r.W / 2 - w / 2), y, w, 14, { bg: ['#3a2a60', '#1a1030'], border: '#ffd040', alpha: .9 }); E.font.text(g, s.text, r.W / 2, y + 3, '#ffffff', { align: 'center' }); });
  },
  /* ---- the Plate Cam overlays ---- */
  plateOverlay(r, M, fr, m7) {
    const H = M.park.H, S = M.ab, y = H.y - 6, pr = (x, z) => m7.project(H.x + x, y, z);
    const zoneSet = (BZ.game.settings && BZ.game.settings.zone) || 'always';
    const k = ((M.batter.look && M.batter.look.size) || 1.25) / 1.25, lo = BZ.GEO.zoneLo * k, hi = BZ.GEO.zoneHi * k, hw = BZ.GEO.zoneHalfW;
    const humanBat = BZ.ctl.who(M, BZ.offense(M).side, 'bat'), humanPitch = BZ.ctl.who(M, BZ.defense(M).side, 'pitch');
    r.overlay(g => {
      if (this.hidden(M)) return;
      const showZone = zoneSet === 'always' || (zoneSet === 'pitch' && S && S.sub === 'flight') || (M.cheats && M.cheats.showZone);
      if (showZone && S) {
        const a = pr(-hw, lo), b = pr(hw, lo), c = pr(hw, hi), d = pr(-hw, hi);
        if (a && c) px.blend(g, .55, 'normal', () => {
          for (let i = 0; i <= 3; i++) { const t = i / 3, p0 = pr(-hw + 2 * hw * t, lo), p1 = pr(-hw + 2 * hw * t, hi), q0 = pr(-hw, lo + (hi - lo) * t), q1 = pr(hw, lo + (hi - lo) * t); px.line(g, p0[0], p0[1], p1[0], p1[1], i === 0 || i === 3 ? '#ffffff' : '#c8d8ff', 1); px.line(g, q0[0], q0[1], q1[0], q1[1], i === 0 || i === 3 ? '#ffffff' : '#c8d8ff', 1); }
        });
        void b; void d;
      }
      if (!S) return;
      // the batter's reticle (a human's)
      if (humanBat && (S.sub === 'select' || S.sub === 'windup' || S.sub === 'flight')) {
        const T = BZ.offense(M), type = T.batzookaArmed ? 'batzooka' : 'contact', rr = BZ.reticleR(type, M.batter, BZ.assistFor(M, T.side)), c = pr(M.reticle.x, M.reticle.z), e = pr(M.reticle.x + rr, M.reticle.z);
        if (c && e) {
          const rad = Math.abs(e[0] - c[0]), col = type === 'batzooka' ? '#ff7a1a' : '#ffe24a';
          if (type === 'batzooka') px.blend(g, .7, 'add', () => { for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + r.game.time * 4; px.disc(g, c[0] + Math.cos(a) * rad, c[1] + Math.sin(a) * rad, 2, i % 2 ? '#ffd040' : '#ff5a1a'); } });
          this.ring(g, c[0], c[1], rad, col); this.ring(g, c[0], c[1], rad * 1.6, '#ffffff40');
          const pw = BZ.reticleR('power', M.batter, BZ.assistFor(M, T.side)) / BZ.reticleR(type, M.batter, BZ.assistFor(M, T.side)) * rad; this.ring(g, c[0], c[1], pw, '#ff5a3a90');
          px.disc(g, c[0], c[1], 1.5, col);
        }
      }
      // the pitcher's target marker and the release ring
      if (humanPitch && S.sub === 'windup') {
        const c = pr(M.marker.x, M.marker.z), e = pr(M.marker.x + 2.2, M.marker.z);
        if (c && e) {
          const rad = Math.max(3, Math.abs(e[0] - c[0]));
          this.ring(g, c[0], c[1], rad, '#5affd0'); px.line(g, c[0] - rad - 3, c[1], c[0] + rad + 3, c[1], '#5affd0'); px.line(g, c[0], c[1] - rad - 3, c[0], c[1] + rad + 3, '#5affd0');
          const left = S.windT - S.t;
          if (left < BZ.RING + .2) { const k2 = clamp(left / BZ.RING, 0, 1), rr = rad + k2 * 26, close = Math.abs(left) < .04 * TUNE.releaseWindow; this.ring(g, c[0], c[1], rr, close ? '#ffffff' : '#ffd040'); if (k2 < .15) this.ring(g, c[0], c[1], rr + 1, '#ffffff'); }
        }
      }
      // where the last pitch crossed
      if (S.sub === 'settle' && S.cross && S.t < 1.5) { const c = pr(S.cross.x, S.cross.z); if (c) { px.disc(g, c[0], c[1], 3, S.result === 'ball' ? '#5aff8a' : '#ff5a3a'); px.disc(g, c[0], c[1], 1.5, '#ffffff'); } }
      // the dev timing bar and the predicted path
      if (M.cheats && M.cheats.showPath && S.pitch && S.sub === 'flight') { let prev = null; for (let u = 0; u <= 1.001; u += .05) { const p = S.pitch.pos(u), q = m7.project(H.x + p.x, H.y + p.y, p.z); if (prev && q) px.line(g, prev[0], prev[1], q[0], q[1], '#ff5aff'); prev = q; } const c = S.pitch.cross(), q = pr(c.x, c.z); if (q) this.ring(g, q[0], q[1], 4, '#ff5aff'); this.timingBar(g, r, M); }
    });
  },
  ring(g, x, y, rad, col) { const n = Math.max(12, Math.round(rad * 2)); for (let i = 0; i < n; i++) { const a = i / n * TAU; px.dot(g, Math.round(x + Math.cos(a) * rad), Math.round(y + Math.sin(a) * rad), col); } },
  timingBar(g, r, M) {
    const S = M.ab, pt = S.pitch, x = r.W / 2 - 80, y = r.H - 60, w = 160;
    E.ui.box(g, x - 4, y - 4, w + 8, 16, { bg: '#0a0a14', border: '#5a5a7a', alpha: .9 });
    const win = BZ.swingWindow(BZ.assistFor(M, BZ.offense(M).side)), span = .5, now = pt.t, T = pt.T, sx = tt => x + w / 2 + (tt - T) / span * w;
    px.rect(g, sx(T - win), y, sx(T + win) - sx(T - win), 8, '#2a5a2a'); px.rect(g, sx(T - .05), y, sx(T + .05) - sx(T - .05), 8, '#4a9a4a'); px.rect(g, sx(T - .022), y, sx(T + .022) - sx(T - .022), 8, '#8aff8a');
    px.rect(g, clamp(sx(now + BZ.SWINGS.contact.delay), x, x + w), y - 2, 1, 12, '#ffffff');
  },
  /* ---- the Broadcast Cam overlays ---- */
  fieldOverlay(r, M, fr) {
    if (this.hidden(M)) return;
    const h = BZ.play.holder(M), D = BZ.defense(M), I = BZ.ctl.who(M, D.side, 'field');
    if (M.cheats.showTargets) for (const f of M.fielders) r.decal(g => { const a = r.w(f.x, f.y, 0), c = r.w(f.tx, f.ty, 0); px.line(g, a[0], a[1], c[0], c[1], f.role === 'chase' ? '#ff5aff' : '#5affd0'); });
    if (M.cheats.showRadii) for (const f of M.fielders) r.decal(() => r.groundRing(f.x, f.y, BZ.catchReach(M, f), '#ffffff'));
    // throw targets: each base with its button while a human's fielder holds the ball
    if (h && h.human && M.phase === 'inPlay') {
      const g0 = BZ.game.mouseGround && h.human.lastDevice === 'mouse' ? BZ.game.mouseGround() : null;
      for (let b = 1; b <= 4; b++) {
        const bp = M.park.base(b), hov = g0 && Math.hypot(g0[0] - bp.x, g0[1] - bp.y) < 26;
        r.decal(() => r.groundRing(bp.x, bp.y, hov ? 18 : 13, hov ? '#ffffff' : '#ffd040'));
        r.queue(bp.x, bp.y, 0, g => { const q = r.w(bp.x, bp.y, 26); BZ.glyph(g, h.human, BZ.BASE_BTN[b], q[0] - 6, q[1] - 6, 12, false, h.human.lastDevice === 'mouse' ? 'gamepad' : undefined); }, { bias: 20 });
      }
    }
    void I; void fr;
  },
  playerArrow(r, f, pn) {
    r.queue(f.x, f.y, 44 + f.z, g => { const q = r.w(f.x, f.y, 40 + f.z), c = E.PLAYER_COLORS[(pn - 1) % 4], b = Math.sin(r.game.time * 8) * 1.5; px.poly(g, [[q[0] - 4, q[1] - 6 + b], [q[0] + 4, q[1] - 6 + b], [q[0], q[1] + b]], c); px.line(g, q[0] - 4, q[1] - 7 + b, q[0] + 4, q[1] - 7 + b, '#ffffff'); }, { bias: 30 });
  },
  throwMeter(r, f) {
    r.queue(f.x, f.y, 50, g => { const q = r.w(f.x, f.y, 46), k = Math.min(1, f.charge / .6); E.ui.bar(g, q[0] - 10, q[1] - 12, 20, 3, k, k > .85 ? '#ff3a3a' : '#ffd040'); }, { bias: 31 });
  },
  radar(g, r, M) {
    const P = M.park, s = .052, ca = r.game.cornerArea && r.game.cornerArea(), right = ca && ca.y0 < 60 ? ca.x0 - 6 : r.W - SAFE;
    const cx = right - 40, cy = SAFE + 112, H = P.H, to = (x, y) => [cx + (x - H.x) * s, cy + (y - H.y) * s];
    E.ui.box(g, cx - 40, cy - 66, 80, 72, { bg: '#0a1a0a', border: '#3a6a3a', alpha: .8 });
    const segs = P.fenceSegs; for (let i = 0; i < segs.length; i += 3) { const a = to(segs[i].x0, segs[i].y0); px.dot(g, a[0], a[1], '#5a9a5a'); }
    for (let b = 0; b < 4; b++) { const p = P.base(b), q = to(p.x, p.y); px.rect(g, q[0] - 1, q[1] - 1, 2, 2, '#ffffff'); }
    for (const f of M.fielders) { const q = to(f.x, f.y); px.rect(g, q[0] - 1, q[1] - 1, 2, 2, f.human ? E.PLAYER_COLORS[(f.human.player - 1) % 4] : BZ.defense(M).def.colors[0]); }
    for (const rn of M.runners) { if (rn.state === 'out' || rn.state === 'scored') continue; const p = BZ.runnerPos(M, rn.p), q = to(p.x, p.y); px.poly(g, [[q[0], q[1] - 2], [q[0] + 2, q[1] + 1], [q[0] - 2, q[1] + 1]], BZ.offense(M).def.colors[1] || '#ffd040'); }
    const b = M.ball, q = to(b.x, b.y); px.disc(g, q[0], q[1], 1.5, '#ffffff');
  }
};
