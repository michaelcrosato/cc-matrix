/* ---- THE MATCH HUD (a pixel overlay, anchored to r.W and r.H, clear of the engine's corner area). Score bug (top
 * left), this over (top right), striker and bowler cards (bottom corners), the Kerfuffle meters (bottom centre), big
 * callouts, contextual prompts by the action (RUN / STAY by the striker, the catch ring at the ball, throw targets at
 * the stumps, REVIEW), the bowling panel and release meter, the speed readout, the radar in the wide camera, and the
 * cards that interrupt play (bowler select, innings break, rain, the third umpire, Owl-Eye). HUD.layout(W, H) gives the
 * persistent rectangles; a test checks none overlap on 4 screen sizes. ---- */
const HUD = {
  callouts: [], t: 0,
  layout(W, H, corner) {
    const cw = corner ? Math.max(0, W - corner.x0) + 4 : 0, top = 4;
    const L = { score: [4, top, 112, 32], over: [W - cw - 100, top, 96, 14], striker: [4, H - 30, 118, 26], bowler: [W - 122, H - 30, 118, 26], meter: [Math.round(W / 2 - 62), H - 22, 124, 18] };
    if (W < 380) { L.meter = [Math.round(W / 2 - 50), H - 52, 100, 18]; }
    L.radar = [W - cw - 74, top + 18, 70, 52];
    return L;
  },
  overlaps(L, corner) {
    const keys = ['score', 'over', 'striker', 'bowler', 'meter'], bad = [];
    const ov = (a, b) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];
    for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) if (ov(L[keys[i]], L[keys[j]])) bad.push(keys[i] + '/' + keys[j]);
    if (corner) for (const k of keys) if (ov(L[k], [corner.x0, corner.y0, corner.x1 - corner.x0, corner.y1 - corner.y0])) bad.push(k + '/corner');
    return bad;
  },
  callout(text, color = '#ffffff', dur = .9, big = 3, sub) { this.callouts.push({ text, color, t: 0, dur, big, sub }); if (this.callouts.length > 3) this.callouts.shift(); },
  wire() {
    const on = (t, f) => bus.on(t, d => { if (MatchView.m && d.match && d.match !== MatchView.m) return; f(d); });
    on('boundary', d => this.callout(d.n === 6 ? 'SIX! MAXIMUM!' : 'FOUR!', d.n === 6 ? '#ffd36a' : '#7aa7ff', 1.3, d.n === 6 ? 3 : 3));
    on('wicket', d => this.callout(d.freeHit ? 'FREE HIT! NOT OUT' : 'WICKET!', d.freeHit ? '#6aff8a' : '#ff5a4a', 1.4, 3, d.freeHit ? null : (d.how || '').toUpperCase()));
    on('bat:press', d => { if (K.settings('timing') && MatchView.m && MatchView.m.strikerInput() && !MatchView.m.cfg.cheat.autoBat) this.callout(d.grade === 'miss' ? 'MISS' : d.grade.toUpperCase(), { perfect: '#ffd36a', good: '#6aff8a', early: '#ffb06a', late: '#ffb06a', miss: '#ff6a6a' }[d.grade], .6, 2); });
    on('extra', d => this.callout(d.kind === 'wd' ? 'WIDE' : 'NO BALL', '#e8e8e8', .9, 2, d.kind === 'nb' ? 'FREE HIT NEXT' : null));
    on('fire:on', d => this.callout('ON FIRE!', '#ff8a2a', 1.4, 3, d.who === 'bat' ? 'TIMING x1.5' : 'PACE +10%'));
    on('target:hit', d => this.callout('KERFUFFLE BONUS +' + d.bonus, '#ffd36a', 1.8, 2, d.label));
    on('special', d => { const s = SPECIALS[d.id]; this.callout(s ? s.name.toUpperCase() : 'SPECIAL!', '#ff8ad8', 1.4, 2); });
    on('item', d => this.callout(ITEMS[d.id].name.toUpperCase(), ITEMS[d.id].color, 1.2, 2, ITEMS[d.id].text));
    on('decision', d => { if (d.kind !== 'third') this.callout(d.out ? 'OUT!' : 'NOT OUT', d.out ? '#ff5a4a' : '#6aff8a', 1.2, 3); });
    on('catch:dropped', () => this.callout('DROPPED!', '#ffb06a', 1, 2));
    on('crowd:catch', () => this.callout('CROWD CATCH!', '#ffd36a', 1.4, 2));
    on('catch:screamer', () => this.callout('SCREAMER!', '#ffd36a', 1.2, 3));
    on('run:mixup', () => this.callout('MIX-UP!', '#ff8a6a', 1, 2));
    on('chaos', d => this.callout(CHAOS[d.id] ? CHAOS[d.id].name.toUpperCase() : '', '#c8e8ff', 1.6, 2));
    on('rain:method', d => this.callout('NEW TARGET ' + d.to, '#ffd36a', 2.4, 2, 'THE KERFUFFLE METHOD'));
    on('item:used', d => { if (d.id === 'horseshoe') this.callout('LUCKY HORSESHOE! NOT OUT', '#c8ccd8', 1.8, 2); if (d.id === 'teapot') this.callout('GOLDEN TEAPOT: RUNS x2', '#ffd23a', 1.6, 2); });
    on('superover', () => this.callout('SUPER OVER!', '#ffd36a', 2.4, 3));
    on('innings:start', d => { if (d.target) this.callout('TARGET ' + d.target, '#ffd36a', 2, 3); });
  },
  step(dt) { this.t += dt; for (const c of this.callouts) c.t += dt; this.callouts = this.callouts.filter(c => c.t < c.dur); },
  draw(r) {
    const m = MatchView.m, g = K.game; if (!m || !m.inn) return;
    const corner = g.cornerArea && g.cornerArea(), L = this.layout(r.W, r.H, corner), inn = m.inn;
    r.overlay(gg => {
      if (MatchView.replay) { px.rect(gg, 0, 0, r.W, 3, '#c8202a'); UI.text(gg, 'REPLAY', r.W / 2, 8, '#ffffff', { align: 'center' }); }
      this.scoreBug(gg, L.score, m, inn);
      this.overStrip(gg, L.over, inn);
      this.cards(gg, L, m, inn);
      this.meters(gg, L.meter, m);
      if (MatchView.cam === 'wide' && !MatchView.replay) this.radar(gg, L.radar, m);
      if (K.Tuning.changed().length) { px.rect(gg, L.score[0], L.score[1] + L.score[3] + 2, 22, 9, '#c8202a'); UI.text(gg, 'DEV', L.score[0] + 11, L.score[1] + L.score[3] + 3, '#ffffff', { align: 'center', font: 'tiny' }); }
      this.prompts(gg, r, m);
      this.cardsOver(gg, r, m);
      let stack = 0;
      for (const c of this.callouts) { const k = Math.min(1, c.t / .08), y = Math.round(r.H * .26 + stack - (1 - k) * 10); stack += c.big * 9 + (c.sub ? 22 : 12); E.font.title(gg, c.text, r.W / 2, y, { align: 'center', scale: c.big, colors: ['#ffffff', c.color, c.color, '#000000'], depth: 2 }); if (c.sub) UI.text(gg, c.sub, r.W / 2, y + c.big * 9 + 4, '#ffffff', { align: 'center' }); }
    });
  },
  scoreBug(g, [x, y, w, h], m, inn) {
    const team = TEAMS[inn.bat];
    px.blend(g, .82, 'normal', () => px.rect(g, x, y, w, h, '#0c1410')); px.rect(g, x, y, 4, h, team.chip); px.rect(g, x, y + h - 1, w, 1, '#e8c060');
    UI.text(g, team.code, x + 8, y + 3, '#ffffff');
    E.font.text(g, inn.runs + '/' + inn.wkts, x + 32, y + 2, '#ffffff', { scale: 2, shadow: '#000', outline: false });
    UI.text(g, Rules.oversText(inn.balls) + (inn.overs ? '/' + fmtOvers(inn.overs) : ''), x + w - 4, y + 3, '#c8c0a8', { align: 'right' });
    const need = m.need();
    if (need) { const hard = need.runs > need.balls * 1.6; UI.text(g, need.runs > 0 ? 'NEED ' + need.runs + ' FROM ' + need.balls : 'WON', x + 8, y + 20, hard ? '#ff7a6a' : '#ffd36a'); }
    else UI.text(g, m.innNo === 0 && m.cfg.mode !== 'showdown' && m.cfg.mode !== 'hub' ? 'RUN RATE ' + (inn.balls ? (inn.runs / inn.balls * 6).toFixed(1) : '0.0') : 'MOST RUNS WINS', x + 8, y + 20, '#a8b8a8');
    if (inn.freeHit) { px.rect(g, x + w + 3, y, 44, 12, '#ffd36a'); UI.text(g, 'FREE HIT', x + w + 25, y + 3, '#1a1a1a', { align: 'center', shadow: false }); }
    if (inn.revised) UI.text(g, 'KM ' + inn.revised.from + '→' + inn.revised.to, x + w + 3, y + 16, '#ffd36a');
  },
  overStrip(g, [x, y, w, h], inn) {
    px.blend(g, .7, 'normal', () => px.rect(g, x, y, w, h, '#0c1410'));
    const balls = inn.over.length ? inn.over : [];
    for (let i = 0; i < Math.max(6, balls.length); i++) {
      const b = balls[i], cx = x + 8 + i * 14, cy = y + 7;
      if (cx > x + w - 4) break;
      const col = !b ? '#2a3a2e' : b === 'W' ? '#e83a3a' : b === '6' ? '#ffd36a' : b === '4' ? '#5a8aff' : b === 'wd' || b === 'nb' ? '#8a8a8a' : '#e8e4d8';
      px.disc(g, cx, cy, 5, col);
      if (b) E.font.text(g, b === '•' ? '' : b.length > 1 ? b[0] : b, cx + 1, cy - 3, '#0c0c0c', { align: 'center', font: 'tiny' });
    }
  },
  cards(g, L, m, inn) {
    const s = m.striker, bw = m.bowlerP;
    if (s) { const [x, y, w, h] = L.striker, c = Rules.card(inn, s.id); px.blend(g, .8, 'normal', () => px.rect(g, x, y, w, h, '#0c1410')); const rig = Cast.rig(s.p, 'field'); rig.drawPortrait(g, x + 1, y + 1, h - 2, { zoom: 3, turn: .4, bg: '#1e3020' }); UI.text(g, s.p.short.slice(0, 12), x + h + 3, y + 3, '#ffffff'); UI.text(g, c.runs + '* (' + c.balls + ')', x + h + 3, y + 14, m.fire.bat > 0 ? '#ff8a2a' : '#ffd36a'); const items = m.items[m.bat]; if (items.length) { px.rect(g, x, y - 11, 60, 10, '#3a2a10'); UI.text(g, ITEMS[items[0]].name.split(' ')[0].toUpperCase() + ' ARMED', x + 2, y - 10, ITEMS[items[0]].color, { font: 'tiny' }); } }
    if (bw) { const [x, y, w, h] = L.bowler, c = Rules.bcard(inn, bw.id); px.blend(g, .8, 'normal', () => px.rect(g, x, y, w, h, '#0c1410')); const rig = bw.machine ? null : Cast.rig(bw, 'field'); if (rig) rig.drawPortrait(g, x + w - h + 1, y + 1, h - 2, { zoom: 3, turn: -.4, bg: '#1e3020' }); else { px.rect(g, x + w - h + 1, y + 1, h - 2, h - 2, '#5a4a2a'); px.disc(g, x + w - h / 2, y + h / 2, 6, '#d8a83a'); } UI.text(g, bw.short.slice(0, 13), x + 3, y + 3, '#ffffff'); UI.text(g, c.wkts + '-' + c.runs + '  ' + Rules.oversText(c.balls), x + 3, y + 14, m.fire.bowl > 0 ? '#ff8a2a' : '#c8e8ff'); const items = m.items[m.bowlSide]; if (items.length) { px.rect(g, x + w - 60, y - 11, 60, 10, '#3a2a10'); UI.text(g, ITEMS[items[0]].name.split(' ')[0].toUpperCase() + ' ARMED', x + w - 58, y - 10, ITEMS[items[0]].color, { font: 'tiny' }); } }
  },
  meters(g, [x, y, w, h], m) {
    if (!m.kerfuffle) return;
    const sides = [m.bat, m.bowlSide];
    sides.forEach((s, k) => {
      const yy = y + k * 9, v = m.hype[s] / 100, full = v >= 1, team = m.teams[s];
      px.rect(g, x, yy, w, 7, '#0c1410'); px.rect(g, x + 22, yy + 1, w - 24, 5, '#1e2a22');
      px.rect(g, x + 22, yy + 1, Math.round((w - 24) * v), 5, full ? (Math.floor(this.t * 8) % 2 ? '#ffd36a' : '#ff8ad8') : team.chip);
      E.font.text(g, team.code, x + 2, yy, '#ffffff', { font: 'tiny' });
      const fire = k === 0 ? m.fire.bat : m.fire.bowl;
      if (fire > 0) for (let i = 0; i < 6; i++) px.dot(g, x + 24 + ((i * 17 + Math.floor(this.t * 30)) % (w - 26)), yy - 1 - (i % 2), '#ff8a2a');
      if (full && m.isHuman(s)) { const I = s === m.bat ? m.strikerInput() : m.bowlerInput(); if (I) { Glyphs.draw(g, x + w + 3, yy - 2, I, 'special'); UI.text(g, 'SPECIAL', x + w + 15, yy - 1, '#ff8ad8'); } }
    });
  },
  radar(g, [x, y, w, h], m) {
    px.blend(g, .7, 'normal', () => px.rect(g, x, y, w, h, '#0c1410'));
    const cx = x + w / 2, cy = y + h / 2, sx = (w - 6) / (2 * m.ground.rx), sy = (h - 6) / (2 * m.ground.ry);
    for (let a = 0; a < TAU; a += .2) px.dot(g, cx + Math.cos(a) * (w / 2 - 3), cy + Math.sin(a) * (h / 2 - 3), '#4a6a4a');
    px.rect(g, cx - 1, cy + (0 - G.MID_Y) * sy, 2, 320 * sy, '#c9b98a');
    for (const f of m.fielders) px.rect(g, cx + f.x * sx - 1, cy + (f.y - G.MID_Y) * sy - 1, 2, 2, m.teams[m.bowlSide].chip);
    for (const b of m.batters) px.rect(g, cx + b.x * sx - 1, cy + (b.y - G.MID_Y) * sy - 1, 2, 2, m.teams[m.bat].chip);
    px.rect(g, cx + m.ball.x * sx - 1, cy + (m.ball.y - G.MID_Y) * sy - 1, 3, 3, '#ffffff');
  },
  /** prompts by the action, in the glyphs of each player's last device */
  prompts(g, r, m) {
    const B = MatchView.B, W = (x, y, z = 0) => r.w(x + B.OX, y + B.OY, z), ph = m.phase;
    const bI = m.strikerInput(), wI = m.bowlerInput(), fI = m.fielderInput(), autoB = m.cfg.cheat.autoBat, autoW = m.cfg.cheat.autoBowl;
    // bowling: the delivery panel, the field and over/round, the meter, the marker hint
    if (wI && !autoW && (ph === 'setup' || ph === 'runup')) {
      const y = r.H - 58, ds = m.deliveryChoices, acts = ['shot', 'loft', 'block'], w = Math.min(r.W - 20, 330), x0 = Math.round(r.W / 2 - w / 2);
      if (ph === 'setup') {
        px.blend(g, .8, 'normal', () => px.rect(g, x0, y - 3, w, 26, '#0c1410')); px.rect(g, x0, y - 3, w, 1, '#e8c060');
        const cw = w / 4;
        ds.forEach((d, i) => { const cx = x0 + 4 + i * cw; Glyphs.draw(g, cx, y, wI, acts[i]); UI.text(g, DELIVERIES[d].name.toUpperCase().slice(0, 12), cx + 13, y + 1, '#ffffff'); UI.text(g, Math.round(DELIVERIES[d].kmh[1] * T('ballSpeed') / .62) + ' KM/H', cx + 13, y + 11, '#a8b8a8', { font: 'tiny' }); });
        const ready = m.specialReady(m.bowlSide, 'bowl'), cx = x0 + 4 + 3 * cw; Glyphs.draw(g, cx, y, wI, 'special'); UI.text(g, ready ? SPECIALS[m.bowlerSpecial()].name.toUpperCase().slice(0, 12) : 'SPECIAL', cx + 13, y + 1, ready ? '#ff8ad8' : '#5a5a5a'); UI.text(g, ready ? 'READY!' : 'NEEDS HYPE', cx + 13, y + 11, ready ? '#ffd36a' : '#5a5a5a', { font: 'tiny' });
        Glyphs.row(g, r.W / 2, y - 16, wI, [['aim', 'MARKER'], ['run', FIELDS[m.fieldPreset].name.toUpperCase()], ['back', m.overRound === 'over' ? 'OVER THE WICKET' : 'ROUND THE WICKET']], { align: 'center', color: '#e8e0c8' });
      }
      if (ph === 'runup' && m.meter && m.meter.on && !m.special) {
        const mw = 140, mx = Math.round(r.W / 2 - mw / 2), my = r.H - 46, sk = (m.bowlerP.bowl && m.bowlerP.bowl.skill) || 5, sweet = T('meterSweet') * (.7 + sk * .05);
        px.rect(g, mx - 2, my - 2, mw + 4, 14, '#0c0c0c');
        for (let i = 0; i < mw; i++) { const u = i / mw, gr = Bowling.grade(u, sk); px.rect(g, mx + i, my, 1, 10, gr === 'green' ? '#3ad86a' : gr === 'amber' ? '#e8b03a' : gr === 'over' ? '#ff2a6a' : '#c83a2a'); }
        const nx = mx + Math.round(m.meter.u * mw); px.rect(g, nx - 1, my - 4, 3, 18, '#ffffff'); px.rect(g, nx, my - 4, 1, 18, '#0c0c0c');
        UI.text(g, 'RELEASE', r.W / 2, my - 13, '#ffffff', { align: 'center' }); Glyphs.draw(g, mx + mw + 6, my, wI, 'shot');
        void sweet;
      }
    }
    // speed readout after release
    if ((ph === 'flight' || (ph === 'inPlay' && m.pt < 1.5)) && MatchView.cam !== 'wide' && m.cur.kmh && !(m.cur.hideSpeed && !m.ball.pitched)) { UI.text(g, m.cur.kmh + ' KM/H', r.W - 8, 22, '#ffffff', { align: 'right', scale: 1 }); UI.text(g, (DELIVERIES[m.deliveryId] || {}).name || '', r.W - 8, 32, '#a8b8a8', { align: 'right', font: 'tiny' }); }
    // batting prompts (in the setup: what the buttons do; chapter 1 and the Nets show the full row)
    if (bI && !autoB && (ph === 'setup' || ph === 'runup' || ph === 'flight')) {
      const full = m.cfg.tutorial || m.inn.balls < 2;
      const py = r.W < 380 ? r.H - 72 : r.H - 46;
      if (full) Glyphs.row(g, r.W / 2, py, bI, [['aim', 'AIM'], ['shot', 'GROUND'], ['loft', 'LOFT'], ['block', 'DEFEND']], { align: 'center' });
      if (full && m.bowlerFamily() === 'spin') Glyphs.row(g, r.W / 2, py - 14, bI, [['charge', 'CHARGE']], { align: 'center' });
      if (m.specialReady(m.bat, 'bat') && !m.batSpecialArmed) Glyphs.row(g, r.W / 2, 44, bI, [['special', (SPECIALS[m.striker.p.specBat || 'kerfuffleShot'] || {}).name.toUpperCase()]], { align: 'center', color: '#ff8ad8' });
    }
    // running: RUN / STAY by the striker, the call hint
    if (bI && !autoB && ph === 'inPlay' && m.running && m.cfg.running !== 'auto' && !m.cur.wicket) {
      const s = m.striker, [sx, sy] = W(s.x, s.y, 40), anyGoal = m.batters.some(b => b.goal);
      const hint = m.running.hint || AI.runHint(m);
      if (hint) { const col = hint === 'YES' ? '#6aff8a' : hint === 'NO' ? '#ff6a6a' : '#ffd36a'; px.rect(g, sx - 14, sy - 22, 28, 10, '#0c0c0c'); UI.text(g, hint, sx, sy - 21, col, { align: 'center' }); }
      Glyphs.row(g, sx, sy - 10, bI, anyGoal ? [['run', 'AGAIN'], ['back', 'BACK']] : [['run', 'RUN'], ['back', 'STAY']], { align: 'center' });
    }
    // the catch ring at the ball
    const CR = m.catchRing;
    if (CR && fI && m.time >= CR.t0) {
      const b = m.ball, [sx, sy] = W(b.x, b.y, b.z), k = clamp((CR.tc - m.time) / T('catchRing'), 0, 1), R = 4 + k * 26;
      for (let a = 0; a < TAU; a += .12) { px.dot(g, sx + Math.cos(a) * 6, sy + Math.sin(a) * 6, '#ffffff'); px.dot(g, sx + Math.cos(a) * R, sy + Math.sin(a) * R, k < .15 ? '#6aff8a' : '#ffd36a'); }
      Glyphs.row(g, sx, sy + 12, fI, [['shot', 'CATCH!']], { align: 'center' });
    }
    // the throw: targets at both sets of stumps
    if (fI && m.cfg.fielding !== 'auto' && m.holder && m.holder !== m.keeper && m.holder !== m.bowler && ph === 'inPlay' && !m.thrown) {
      const [ax, ay] = W(0, 0, 18), [bx, by] = W(0, G.BOWL_Y, 18);
      Glyphs.draw(g, ax - 5, ay - 10, fI, 'shot'); Glyphs.draw(g, bx - 5, by - 10, fI, 'loft');
      Glyphs.row(g, r.W / 2, 52, fI, [['shot', "KEEPER'S END"], ['loft', "BOWLER'S END"], ['block', 'LOB IN']], { align: 'center' });
    }
    // the review window
    if (m.reviewWindow > 0 && m.decision) {
      const side = m.decision.reviewSide, I = m.isHuman(side) ? (side === m.bat ? bI : wI) : null;
      if (I && !(side === m.bat ? autoB : autoW)) { px.rect(g, r.W / 2 - 70, 60, 140, 16, '#2a1a3a'); Glyphs.row(g, r.W / 2, 63, I, [['special', 'REVIEW? ' + Math.ceil(m.reviewWindow) + 's (' + m.reviews[side] + ' LEFT)']], { align: 'center', color: '#e8c8ff' }); }
    }
    // the field special and the "nudge" after a long idle in setup
    if (wI && !autoW && ph === 'setup') { const team = m.teams[m.bowlSide], star = team.players.find(p => p.specField); if (star && m.specialReady(m.bowlSide, 'field', SPECIALS[star.specField].cost || 100) && !m.specialReady(m.bowlSide, 'bowl')) UI.text(g, SPECIALS[star.specField].name.toUpperCase() + ': HOLD SPECIAL IN THE FIELD', r.W / 2, 34, '#ff8ad8', { align: 'center' }); if (m.pt > 20 && m.cfg.mode === 'quick') UI.text(g, 'CHOOSE A DELIVERY TO BOWL', r.W / 2, r.H / 2, '#ffffff', { align: 'center' }); }
  },
  /** the cards that interrupt play */
  cardsOver(g, r, m) {
    const ph = m.phase, I = m.bowlerInput() || K.game.input;
    if (ph === 'pickBowler' && m.pickOptions) {
      px.blend(g, .55, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#000000'));
      UI.text(g, 'CHOOSE YOUR BOWLER', r.W / 2, 34, UI.gold, { align: 'center', scale: 2 });
      const C = HUD.pickCards || (HUD.pickCards = new UICards({ w: 84, h: 112 })); C.cards = m.pickOptions;
      C.draw(g, r, 64, (gg, p, x, y, w, h, on) => { Cast.rig(p, 'field').drawPortrait(gg, x + w / 2 - 20, y + 6, 40, { zoom: 3, turn: .3, bg: '#22382a' }); UI.text(gg, p.short.slice(0, 11), x + w / 2, y + 50, on ? '#ffffff' : '#c8c0a8', { align: 'center' }); UI.text(gg, FAMILY[p.bowl.type].label, x + w / 2, y + 62, '#ffd36a', { align: 'center' }); UI.text(gg, (p.bowl.d.map(d => DELIVERIES[d].name.split(' ')[0]).join(' ')).slice(0, 16), x + w / 2, y + 74, '#a8b8a8', { align: 'center', font: 'tiny' }); const sp = p.specBowl && SPECIALS[p.specBowl]; if (sp) UI.text(gg, sp.name.slice(0, 16), x + w / 2, y + 86, '#ff8ad8', { align: 'center', font: 'tiny' }); UI.text(gg, 'SKILL ' + '★'.repeat(Math.round(p.bowl.skill / 2)), x + w / 2, y + 98, '#e8e0c8', { align: 'center', font: 'tiny' }); });
      UI.footer(g, r, I, [['confirm', 'BOWL'], ['left', 'CHOOSE']]);
    }
    if (ph === 'inningsBreak') {
      const i0 = m.inn; px.blend(g, .6, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#000000'));
      UI.panel(g, r.W / 2 - 120, 40, 240, 120);
      UI.text(g, m.superPending ? 'SUPER OVER' : m.innNo >= 2 ? 'SUPER OVER: HALF TIME' : 'TEA', r.W / 2, 50, UI.gold, { align: 'center', scale: 2 });
      const top = Object.entries(i0.cards).sort((a, b) => b[1].runs - a[1].runs)[0];
      UI.text(g, i0.runs + '', r.W / 2 - 70, 80, '#ffffff', { align: 'center', scale: 2 }); UI.text(g, 'RUNS', r.W / 2 - 70, 98, '#a8b8a8', { align: 'center' });
      UI.text(g, i0.wkts + '', r.W / 2, 80, '#ffffff', { align: 'center', scale: 2 }); UI.text(g, 'WICKETS', r.W / 2, 98, '#a8b8a8', { align: 'center' });
      UI.text(g, top ? top[1].runs + '' : '0', r.W / 2 + 70, 80, '#ffffff', { align: 'center', scale: 2 }); UI.text(g, top ? playerById(top[0]).short.slice(0, 10) : '', r.W / 2 + 70, 98, '#a8b8a8', { align: 'center' });
      UI.text(g, m.superPending ? 'SCORES LEVEL! ONE OVER EACH, TWO WICKETS' : 'TARGET ' + (i0.runs + 1), r.W / 2, 120, UI.gold, { align: 'center' });
      if (m.treatPick) {
        UI.text(g, 'PICK A TEA TREAT', r.W / 2, 172, '#ffffff', { align: 'center' });
        const C = HUD.teaCards || (HUD.teaCards = new UICards({ w: 96, h: 56 })); C.cards = TEA_TREATS;
        C.draw(g, r, 186, (gg, t, x, y, w, h, on) => { UI.text(gg, t.name, x + w / 2, y + 8, on ? '#ffffff' : '#c8c0a8', { align: 'center' }); UI.para(gg, t.text, x + 4, y + 22, w - 8, '#ffd36a', { font: 'tiny' }); });
      }
    }
    if (ph === 'rainDelay') {
      px.blend(g, .5, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#0a0a1a'));
      UI.panel(g, r.W / 2 - 130, 36, 260, 110, { bg: ['#1a2a1a', '#0a140a'] });
      UI.text(g, 'RAIN STOPS PLAY', r.W / 2, 46, '#c8e8ff', { align: 'center', scale: 2 });
      const crumb = Cast.extra('crumb'); crumb.drawPortrait(g, r.W / 2 - 122, 70, 40, { zoom: 3, turn: .3, bg: '#2a3a2a' });
      px.rect(g, r.W / 2 - 74, 70, 196, 66, '#1e2a22'); px.rect(g, r.W / 2 - 74, 70, 196, 2, '#8a6a3a');
      const inn = m.inn, O = inn.overs, left = O * 6 - inn.balls, cut = Math.max(1, Math.ceil(left / 2));
      const lines = m.innNo === 1 ? ['MRS CRUMB\'S KERFUFFLE METHOD', 'RESOURCES LEFT: ' + left + ' BALLS', 'LESS ' + cut + ' FOR THE RAIN', 'x WICKETS, CARRY THE SCONE...'] : ['THE COVERS ARE ON.', 'TEA IS SERVED.', 'NOBODY IS COMPLAINING.'];
      lines.forEach((l, i) => UI.text(g, l, r.W / 2 - 68, 76 + i * 14, '#f4f0e0', { font: 'default' }));
    }
    if (m.chaos.some(c => c.id === 'advert' && c.t < 3)) {
      px.rect(g, 0, 0, r.W, r.H, '#1a0a3a'); E.font.title(g, 'THRUMPTON PARKING', r.W / 2, r.H / 2 - 30, { align: 'center', scale: 3, colors: ['#ffffff', '#ffcf3a', '#ff8a2a', '#7a3aff'] }); UI.text(g, 'PARK LIKE A LORD', r.W / 2, r.H / 2 + 6, '#ffffff', { align: 'center', scale: 2 }); UI.text(g, 'FOUR HUNDRED SPACES. NO CRICKET.', r.W / 2, r.H / 2 + 30, '#c8a0ff', { align: 'center' });
    }
    if (m.chaos.some(c => c.id === 'tray' && c.t < 3)) { UI.panel(g, r.W / 2 - 100, r.H / 2 - 20, 200, 30); UI.text(g, 'TEA IS SERVED, SAYS FORTESCUE', r.W / 2, r.H / 2 - 10, UI.gold, { align: 'center' }); }
    // the third umpire's screen: a slot reel between OUT and NOT OUT
    const d = m.decision;
    if (d && d.kind === 'third') {
      const k = d.t / d.umpT;
      px.rect(g, r.W / 2 - 90, 30, 180, 44, '#0c0c18'); px.rect(g, r.W / 2 - 90, 30, 180, 2, '#7a3aff'); px.rect(g, r.W / 2 - 90, 72, 180, 2, '#7a3aff');
      UI.text(g, 'THIRD UMPIRE: ' + (d.third || '').toUpperCase(), r.W / 2, 34, '#c8a0ff', { align: 'center' });
      const word = d.pending ? (k < .6 ? (Math.floor(d.t * 10) % 2 ? 'OUT' : 'NOT OUT') : (Math.floor(d.t * 4) % 2 ? 'OUT' : 'NOT OUT')) : (d.truth ? 'OUT' : 'NOT OUT');
      E.font.title(g, word, r.W / 2, 46, { align: 'center', scale: 2, colors: word === 'OUT' ? ['#ffffff', '#ff5a4a', '#c8202a'] : ['#ffffff', '#6aff8a', '#2a8a3a'] });
    }
    // Owl-Eye's three lights during an LBW review
    if (d && d.reviewing && d.owl) {
      const x = r.W - 112, y = 40;
      UI.panel(g, x, y, 104, 62, { bg: ['#1a1030', '#0a0818'], border: '#c8a0ff' });
      UI.text(g, 'OWL-EYE', x + 52, y + 4, '#c8a0ff', { align: 'center' });
      const rows = [['PITCHING', d.owl.pitching, d.owl.pitching === 'outside leg' ? 'r' : 'g'], ['IMPACT', d.owl.impact2, d.owl.impact2 === 'in line' || d.owl.impact2 === 'outside off (no shot)' ? 'g' : 'r'], ['WICKETS', d.owl.wickets, d.owl.wickets === 'hitting' ? 'g' : d.owl.wickets === 'umpire' ? 'a' : 'r']];
      rows.forEach(([lab, val, c], i) => { if (d.rt < 1 + i * 1.2) return; px.disc(g, x + 10, y + 21 + i * 13, 4, c === 'g' ? '#3ad86a' : c === 'a' ? '#e8b03a' : '#e83a3a'); UI.text(g, lab, x + 18, y + 17 + i * 13, '#ffffff', { font: 'tiny' }); UI.text(g, String(val).toUpperCase().slice(0, 14), x + 18, y + 23 + i * 13, '#a8a0c8', { font: 'tiny' }); });
    }
  }
};
const fmtOvers = o => (Math.abs(o - Math.round(o)) < 1e-6 ? String(Math.round(o)) : Rules.oversText(Math.round(o * 6)));
/** the YES / NO / WAIT hint for a human batting side (the AI's own call) */
AI.runHint = m => { const s = m.striker, n = m.nonStriker; if (!m.running || !s || !n) return null; const e = m.otherEnd(m.batterEnd(s) || s.home); const mg = AI.fieldTime(m, e) - Math.max(AI.batTime(m, s, e), AI.batTime(m, n, m.otherEnd(e))); return mg > .35 ? 'YES' : mg < -.15 ? 'NO' : 'WAIT'; };
K.HUD = HUD;
