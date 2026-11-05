// ---- the match HUD (5.15.2), drawn in screen pixels over the world: the score bug, this over, the batter and bowler
// cards, the Kerfuffle meters, callouts, contextual prompts (by the action, in the player's own glyphs), the delivery
// panel and the release meter, the radar in the wide shot, the commentary caption, reviews, cards and pickers.
const HUD = { rects: {} };
function hudLayout(W, H, corner) {
  // every element's rectangle, so a test can check none overlap (or cover the corner's buttons)
  const top = 4, cw = corner ? Math.max(0, W - corner.x0) : 0;
  return { score: [4, top, 112, 30], over: [W - 4 - 96 - cw, top, 96, 14], striker: [4, H - 26, 120, 22], bowler: [W - 124, H - 26, 120, 22], meter: [W / 2 - 62, H - 16, 124, 12], caption: [W / 2 - 150, H - 74, 300, 44] };
}
function overlaps(L) { const ks = Object.keys(L), bad = []; for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) { const a = L[ks[i]], b = L[ks[j]]; if (a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3]) { if ((ks[i] === 'caption' || ks[j] === 'caption')) continue; bad.push(ks[i] + '/' + ks[j]); } } return bad; }
function drawHud(r, m) {
  r.overlay(g => {
    const W = r.W, H = r.H, I = m.I, corner = game.cornerArea ? game.cornerArea() : null, L = hudLayout(W, H, corner);
    const hum = m.isHumanSideIdx(), pB = m.isHuman('bat') ? m.pad('bat').I : null, pW = m.isHuman('bowl') ? m.pad('bowl').I : null, pF = m.isHuman('field') ? m.pad('field').I : null;
    const big = m.state === 'break' || m.state === 'over';
    // score bug
    if (!big) {
      const [x, y] = L.score, t = m.teams[I.bat];
      panel(g, x, y, 112, m.target() ? 30 : 21, { rule: t.chip });
      px.rect(g, x + 3, y + 4, 4, 13, t.chip);
      E.font.text(g, t.code, x + 10, y + 3, '#f4f0e0', { shadow: '#000' });
      E.font.text(g, I.runs + '/' + I.wkts, x + 34, y + 2, '#ffffff', { scale: 2, shadow: '#000' });
      E.font.text(g, m.overStr() + ' OV' + (I.so ? ' SO' : ''), x + 106, y + 9, '#c8c0e0', { align: 'right', shadow: '#000' });
      if (m.target()) { const n = m.need(), b = m.ballsLeft(), hard = n > b * 1.6; E.font.text(g, 'NEED ' + n + ' FROM ' + b, x + 4, y + 20, hard ? '#ff8a6a' : '#ffd23a', { shadow: '#000' }); }
      if (tuneChanged().length && m.cfg.mode !== 'attract') { px.rect(g, x + 116, y + 2, 22, 9, '#c82a32'); E.font.text(g, 'DEV', x + 127, y + 3, '#ffffff', { align: 'center' }); }
      // this over
      const [ox, oy] = L.over; panel(g, ox, oy, 96, 14, { alpha: .7, rule: '#3a3450' });
      I.over.slice(-7).forEach((s, k) => { const cx = ox + 8 + k * 13, c = s === 'W' ? '#ff4a4a' : s === '6' ? '#ffd23a' : s === '4' ? '#7aa7ff' : s === 'wd' || s === 'nb' ? '#8a8a9a' : s === '•' ? '#5a5870' : '#e8e4d8'; px.disc(g, cx, oy + 7, 5, c); E.font.text(g, s === '•' ? '' : s === 'wd' ? 'w' : s === 'nb' ? 'n' : s, cx, oy + 4, '#101018', { align: 'center' , outline: false, shadow: false }); });
      // the batter and the bowler
      const sc = m.striker(), bp = m.bowlerP(), bc = bp ? m.bowlCard(bp.id) : null;
      if (sc) { const [sx, sy] = L.striker; panel(g, sx, sy, 120, 22); const rig = rigFor(sc.p, 'bat'); rig.drawPortrait(g, sx + 2, sy + 2, 18, { zoom: 3, turn: .4, bg: '#1a1430' }); E.font.text(g, sc.p.short, sx + 24, sy + 3, '#f4f0e0', { shadow: '#000' }); E.font.text(g, sc.runs + '* (' + sc.balls + ')', sx + 24, sy + 12, '#ffd23a', { shadow: '#000' }); }
      if (bp && bc) { const [bx, by] = L.bowler; panel(g, bx, by, 120, 22); E.font.text(g, bp.short, bx + 116, by + 3, '#f4f0e0', { align: 'right', shadow: '#000' }); E.font.text(g, bc.wkts + '-' + bc.runs + '  ' + Math.floor(bc.balls / 6) + '.' + bc.balls % 6, bx + 116, by + 12, '#c8c0e0', { align: 'right', shadow: '#000' }); }
      // the Kerfuffle meters (batting left, bowling right)
      if (m.cfg.kerfuffle) {
        const [mx, my] = L.meter;
        for (const [t, x0] of [[m.batT, mx], [m.bowlT, mx + 64]]) {
          const v = m.hype[t] / 100, full = v >= 1;
          px.rect(g, x0, my, 60, 7, '#1a1430'); px.rect(g, x0 + 1, my + 1, Math.round(58 * v), 5, full ? (Math.floor(game.time * 6) % 2 ? '#5fd38a' : '#c8ffd8') : m.teams[t].chip === '#1a1a22' ? '#7a3aff' : E.shade(m.teams[t].chip, .2));
          if ((t === m.batT ? m.fire.batOn : m.fire.bowlOn)) for (let k = 0; k < 6; k++) px.dot(g, x0 + 4 + k * 10, my - 1 - Math.floor(Math.abs(Math.sin(game.time * 9 + k)) * 3), '#ff8a2a');
          E.font.text(g, m.teams[t].code, x0 + 30, my + 8, '#c8c0e0', { align: 'center' });
          if (full && m.isHumanSideIdx() === t && !m.pendingSpecial[t]) { glyph(g, t === m.batT ? pB : pW, 'special', x0 + 63 - (t === m.batT ? 0 : 128), my - 7); }
          const it = m.items[t]; if (it) { const s = spr()['tok_' + it]; px.sprite(g, s, x0 + (t === m.batT ? -12 : 62), my - 1); }
        }
      }
    }
    // centre callouts
    let cy = Math.round(H * .3);
    for (const c of CALL.list) { const u = c.t / c.dur, sc_ = c.small ? 2 : 3, y = c.timing ? 34 : cy; if (!c.timing) cy += c.small ? 18 : 26; const a = u > .8 ? (1 - u) * 5 : 1; if (a > .2) bigTitle(g, c.text, W / 2, y - (u < .1 ? (1 - u * 10) * 6 : 0), { scale: sc_, colors: ['#ffffff', c.color, E.shade(c.color, -.3)] }); }
    // the release speed
    if ((m.state === 'flight' || m.state === 'inPlay') && m.delInfo && !(m.delInfo.hideSpeed && !m.ball.pitched)) { E.font.text(g, m.delInfo.kmh + ' KM/H', W / 2, 6, '#ffffff', { align: 'center', scale: 1, shadow: '#000' }); E.font.text(g, upper(m.delInfo.name), W / 2, 15, '#c8c0e0', { align: 'center', shadow: '#000' }); }
    if (m.state === 'inPlay' && m.contact && m.contact.shot && m.st < 1.6) E.font.text(g, upper(SHOT[m.contact.shot] ? SHOT[m.contact.shot].name : ''), W / 2, 24, '#ffd23a', { align: 'center', shadow: '#000' });
    // contextual prompts
    const cap = H - 30;
    if (m.cfg.mode !== 'attract' && !big) {
      if ((m.state === 'setup') && pW) {
        const pb = m.bowlerP(), d = pb.bowl.del, sp = m.specialReady(m.bowlT);
        const items = [['shot', DELIVERIES[d[0]].name], ['loft', DELIVERIES[d[1]].name], ['block', DELIVERIES[d[2]].name]];
        panel(g, W / 2 - 150, H - 62, 300, 30, { alpha: .7 });
        prompts(g, pW, items, W / 2, H - 54, { align: 'center' });
        if (sp) prompts(g, pW, [['special', SPECIALS[m.bowlSpecialId()].name]], W / 2, H - 41, { align: 'center', color: '#5fd38a' });
        else prompts(g, pW, [['run', 'Field: ' + FIELDS[m.fieldPreset[m.bowlT]].name], ['back', m.overRound === 'over' ? 'Over the wicket' : 'Round the wicket']], W / 2, H - 41, { align: 'center', color: '#c8c0e0' });
        E.font.text(g, 'MOVE THE MARKER, THEN CHOOSE A DELIVERY', W / 2, H - 72, '#f4f0e0', { align: 'center', shadow: '#000' });
      }
      if (m.state === 'runup' && pW && m.meter) {
        const mx = W / 2 - 70, my = H - 48, half = T('meterSweet') * (.8 + (m.bowlerP().bowl.skill || 6) * .04) / 2;
        panel(g, mx - 4, my - 4, 148, 18, { alpha: .7 });
        px.rect(g, mx, my, 140, 10, '#c82a32'); px.rect(g, mx + Math.round(140 * (.5 - half - .18)), my, Math.round(140 * (2 * half + .36)), 10, '#e8a03a'); px.rect(g, mx + Math.round(140 * (.5 - half)), my, Math.round(140 * 2 * half), 10, '#5fd38a'); px.rect(g, mx + Math.round(140 * .94), my, Math.round(140 * .06), 10, '#5a0a10');
        const nx = mx + Math.round(140 * m.meter.p); px.rect(g, nx - 1, my - 3, 3, 16, m.meter.on ? '#ffffff' : '#6a6878');
        if (m.meter.lock) E.font.text(g, m.meter.lock === 'over' ? 'NO BALL!' : upper(m.meter.lock), W / 2, my - 12, m.meter.lock === 'green' ? '#5fd38a' : '#ffd23a', { align: 'center', shadow: '#000' });
        else prompts(g, pW, [['shot', 'Release']], W / 2, my - 9, { align: 'center' });
      }
      if ((m.state === 'setup' || m.state === 'runup' || m.state === 'flight') && pB && !m.swing) {
        const items = [['shot', 'Ground'], ['loft', 'Loft'], ['block', 'Defend']];
        if (!m.ball.pitched && !m.batters[0].charged) items.push(['charge', 'Charge']);
        if (m.specialReady(m.batT) && !m.batSpecial) items.push(['special', SPECIALS[m.batSpecialId()].name]);
        prompts(g, pB, items, W / 2, H - (pW ? 84 : 40), { align: 'center' });
        if (m.state === 'setup' && !pW) E.font.text(g, 'AIM WITH THE STICK OR MOUSE • NO BUTTON LEAVES IT', W / 2, H - 52, '#c8c0e0', { align: 'center', shadow: '#000' });
      }
      if (m.state === 'inPlay' && pB && !m.boundaryHit && S('running') !== 'Auto') {
        const b0 = m.batters[0], p = r.w(OX + b0.x, OY + b0.y, 34), hint = m.callHint();
        const items = b0.target === null ? [['run', 'Run'], ['back', 'Stay']] : [['run', m.thrown ? 'Dive / again' : 'Again'], ['back', 'Back!']];
        panel(g, p[0] - 52, p[1] - 22, 104, 22, { alpha: .7, rule: hint === 'YES' ? '#5fd38a' : hint === 'NO' ? '#ff6b6b' : '#ffd23a' });
        E.font.text(g, hint, p[0], p[1] - 20, hint === 'YES' ? '#5fd38a' : hint === 'NO' ? '#ff6b6b' : '#ffd23a', { align: 'center', shadow: '#000' });
        prompts(g, pB, items, p[0], p[1] - 7, { align: 'center' });
      }
      if (m.catchQTE && pF && m.t >= m.catchQTE.start - .3) { const f = m.catchQTE.f, p = r.w(OX + f.x, OY + f.y, 40); prompts(g, pF, [['shot', 'Catch!']], p[0], p[1] - 6, { align: 'center', color: '#ffd23a' }); }
      const holder = m.fielders.find(f => f.hasBall);
      if (m.state === 'inPlay' && holder && pF && m.assistMode() !== 'Auto' && !m.throwQ && !(Math.min(hyp(holder.x, holder.y), hyp(holder.x, holder.y - 320)) < 22)) {
        panel(g, W / 2 - 150, H - 58, 300, 18, { alpha: .75 });
        prompts(g, pF, [['shot', 'Keeper end'], ['loft', "Bowler's end"], ['block', 'Lob to keeper']], W / 2, H - 49, { align: 'center' });
      }
      if (m.canReview() && m.sideHumans(m.reviewSide()).length) { const pr = m.reviewSide() === m.batT ? pB : pW; panel(g, W / 2 - 70, H * .45, 140, 22, { rule: '#7ae0ff' }); prompts(g, pr || game.input, [['special', 'Review (' + Math.ceil(m.reviewWin) + ')']], W / 2, H * .45 + 11, { align: 'center', color: '#7ae0ff' }); }
      if (m.state === 'dead' && !m.review && !m.reviewWin && (m.replay || m.st > 1.2)) prompts(g, game.input, [['confirm', 'Skip']], W - 6, 24, { align: 'right', color: '#c8c0e0' });
    }
    // the speech bubble (YES! NO!)
    if (m.bubble) { const b0 = m.batters[0], p = r.w(OX + b0.x, OY + b0.y, 44); panel(g, p[0] - 16, p[1] - 30, 32, 11, { alpha: .9, bg: '#f4f0e0', rule: '#1a1a24' }); E.font.text(g, m.bubble.text, p[0], p[1] - 29, '#1a1a24', { align: 'center' , outline: false, shadow: false }); }
    // the radar in the wide shot
    if (WORLD.shot === 'wide' && !big) {
      const rx = W - 46, ry = 44, bb = m.boundary(), k = 34 / bb.ry;
      px.blend(g, .6, 'normal', () => px.disc(g, rx, ry, 30, '#0e1a10')); px.disc(g, rx, ry, 30, '#2a5a2a'); px.disc(g, rx, ry, 29, '#0e2a12');
      for (const f of m.fielders) px.rect(g, Math.round(rx + f.x * k * .85), Math.round(ry + (f.y - 160) * k * .85), 2, 2, m.teams[m.bowlT].chip === '#1a1a22' ? '#7a3aff' : m.teams[m.bowlT].chip);
      for (const b of m.batters) px.rect(g, Math.round(rx + b.x * k * .85), Math.round(ry + (b.y - 160) * k * .85), 2, 2, '#f4f0e0');
      px.rect(g, Math.round(rx + m.ball.x * k * .85), Math.round(ry + (m.ball.y - 160) * k * .85), 2, 2, '#ff4a4a');
    }
    if (m.replay && m.replay.on) { px.rect(g, 6, 40, 44, 11, '#c82a32'); E.font.text(g, 'REPLAY', 28, 42, '#ffffff', { align: 'center' }); }
    // the review: Owl-Eye's three lights, then the stamp
    if (m.review) {
      const rv = m.review, x = W / 2 - 80, y = 22; panel(g, x, y, 160, 46, { rule: '#7ae0ff' });
      E.font.text(g, 'OWL-EYE', W / 2, y + 3, '#7ae0ff', { align: 'center', shadow: '#000' });
      ['PITCHING', 'IMPACT', 'WICKETS'].forEach((n, k) => { const show = rv.t > .8 + k * .7, c = { green: '#5fd38a', red: '#ff4a4a', amber: '#ffb03a' }[rv.lights[k]]; px.disc(g, x + 30 + k * 50, y + 20, 6, show ? c : '#3a3450'); E.font.text(g, n, x + 30 + k * 50, y + 30, '#c8c0e0', { align: 'center' }); });
      if (rv.t > 3) bigTitle(g, rv.verdict ? 'OUT' : 'NOT OUT', W / 2, y + 52, { scale: 3, colors: rv.verdict ? ['#ffffff', '#ff4a4a', '#8a1a1a'] : ['#ffffff', '#5fd38a', '#1a6a3a'] });
      if (rv.tr.umpCall && rv.t > 2.4) E.font.text(g, "UMPIRE'S CALL", W / 2, y + 38, '#ffb03a', { align: 'center', shadow: '#000' });
    }
    if (m.third && !m.third.done || (m.third && m.third.t < 4.2)) {
      const t = m.third.t; px.rect(g, 10, 30, W - 20, 2, '#7ae0ff'); px.rect(g, 10, H - 40, W - 20, 2, '#7ae0ff');
      E.font.text(g, 'THIRD UMPIRE', W / 2, 36, '#7ae0ff', { align: 'center', scale: 2, shadow: '#000' });
      const reel = t < 2.2 ? (Math.floor(t * 10) % 2 ? 'OUT' : 'NOT OUT') : (m.ballRec && m.ballRec.wicket ? 'OUT' : 'NOT OUT');
      if (t > 1) bigTitle(g, reel, W / 2, H / 2 - 10, { scale: 3, colors: reel === 'OUT' ? ['#ffffff', '#ff4a4a', '#8a1a1a'] : ['#ffffff', '#5fd38a', '#1a6a3a'] });
    }
    // the bowler picker (a human captain)
    if (m.needBowler && m.state === 'between') drawBowlerPicker(g, r, m);
    // cards: the innings break, the Super Over, the rain and the Kerfuffle Method, the advert break
    if (m.state === 'break') drawBreakCard(g, r, m);
    if (m.rain) drawRainCard(g, r, m);
    if (m.advert > 0) { panel(g, 20, H / 2 - 40, W - 40, 80, { rule: '#ffcf3a', bg: '#1a0a2a' }); bigTitle(g, 'THRUMPTON PARKING', W / 2, H / 2 - 30, { scale: 2 }); E.font.text(g, 'PARK LIKE A LORD. FOUR HUNDRED SPACES. NO CRICKET.', W / 2, H / 2 + 2, '#f4f0e0', { align: 'center', shadow: '#000' }); E.font.text(g, 'A WORD FROM OUR SPONSOR', W / 2, H / 2 + 18, '#c8c0e0', { align: 'center' }); }
    drawCaption(g, r, H - 30);
    HUD.rects = L;
  });
}
const PICK = { i: 0 };
function drawBowlerPicker(g, r, m) {
  const list = m.needBowler, W = r.W, H = r.H, n = list.length, cw = Math.min(78, Math.floor((W - 20) / n) - 4), x0 = W / 2 - (n * (cw + 4)) / 2;
  panel(g, 0, H / 2 - 62, W, 124, { rule: '#ffd23a' });
  E.font.text(g, 'CHOOSE THE BOWLER', W / 2, H / 2 - 56, '#ffd23a', { align: 'center', scale: 2, shadow: '#000' });
  HUD.pick = [];
  list.forEach((p, k) => {
    const x = Math.round(x0 + k * (cw + 4)), y = H / 2 - 36, foc = k === PICK.i, c = m.bowlCard(p.id);
    HUD.pick.push([x, y, cw, 84]);
    px.rect(g, x, y, cw, 84, foc ? '#3a2a5a' : '#1a1430'); if (foc) { px.rect(g, x, y, cw, 1, '#ffd23a'); px.rect(g, x, y + 83, cw, 1, '#ffd23a'); }
    rigFor(p, 'field').drawPortrait(g, x + cw / 2 - 14, y + 4, 28, { zoom: 3, turn: .4, bg: '#0e0c1c' });
    E.font.text(g, p.short.slice(0, 11), x + cw / 2, y + 36, foc ? '#ffe9a0' : '#f4f0e0', { align: 'center' });
    E.font.text(g, upper(p.bowl.fam), x + cw / 2, y + 46, '#7ad0ff', { align: 'center' });
    E.font.text(g, c.overs + '/' + m.maxOvers() + ' OV', x + cw / 2, y + 56, '#c8c0e0', { align: 'center' });
    if (p.bsp) E.font.text(g, SPECIALS[p.bsp].name.slice(0, 13), x + cw / 2, y + 68, '#5fd38a', { align: 'center' });
  });
  footer(g, r, [['left', ''], ['confirm', 'Bowl']]);
}
function drawBreakCard(g, r, m) {
  const W = r.W, H = r.H, prev = m.inn[m.i - 1] || m.I, kind = m.breakKind;
  panel(g, W / 2 - 150, H / 2 - 70, 300, 140, { rule: '#ffd23a' });
  bigTitle(g, kind === 'superover' ? 'SUPER OVER!' : m.I.so ? 'SUPER OVER' : 'TEA', W / 2, H / 2 - 62, { scale: 3 });
  const top = prev.cards.slice().sort((a, b) => b.runs - a.runs)[0];
  E.font.text(g, m.teams[prev.bat].name + ' ' + prev.runs + '/' + prev.wkts, W / 2, H / 2 - 28, '#f4f0e0', { align: 'center', scale: 1, shadow: '#000' });
  if (top) E.font.text(g, 'TOP SCORER: ' + top.p.short + ' ' + top.runs, W / 2, H / 2 - 16, '#c8c0e0', { align: 'center', shadow: '#000' });
  E.font.text(g, (m.teams[m.I.bat].name + ' NEED ' + (m.target() || 0) + ' TO WIN').toUpperCase(), W / 2, H / 2 - 2, '#ffd23a', { align: 'center', shadow: '#000' });
  if (kind === 'superover') E.font.text(g, 'ONE OVER EACH, TWO WICKETS. TIED AGAIN? MOST BOUNDARIES WINS.', W / 2, H / 2 + 10, '#c8c0e0', { align: 'center' });
  if (m.needTea) { const items = TEA_TREATS; items.forEach((t, k) => { const x = W / 2 - 138 + k * 94, y = H / 2 + 16, foc = k === PICK.tea; px.rect(g, x, y, 88, 40, foc ? '#3a2a5a' : '#1a1430'); if (foc) px.rect(g, x, y, 88, 1, '#ffd23a'); E.font.text(g, t.name, x + 44, y + 6, foc ? '#ffe9a0' : '#f4f0e0', { align: 'center' }); E.font.wrap(t.text, 82).slice(0, 2).forEach((l, j) => E.font.text(g, l, x + 44, y + 18 + j * 9, '#c8c0e0', { align: 'center' })); }); HUD.tea = items.map((t, k) => [W / 2 - 138 + k * 94, H / 2 + 16, 88, 40]); footer(g, r, [['left', ''], ['confirm', 'Choose a tea treat']]); }
  else footer(g, r, [['confirm', 'Continue']]);
}
const TEA_TREATS = [{ id: 'sponge', name: 'VICTORIA SPONGE', text: 'Hype +40, at once' }, { id: 'tea', name: "BUILDER'S TEA", text: 'Timing windows +10%' }, { id: 'sandwich', name: 'CUCUMBER SANDWICH', text: 'Run speed +10%' }];
function drawRainCard(g, r, m) {
  const W = r.W, H = r.H, rn = m.rain;
  if (!rn.done) { panel(g, W / 2 - 120, 40, 240, 30, { rule: '#7ad0ff' }); E.font.text(g, 'RAIN STOPS PLAY', W / 2, 46, '#7ad0ff', { align: 'center', scale: 2, shadow: '#000' }); return; }
  const res = m.rainResult;
  panel(g, W / 2 - 140, H / 2 - 60, 280, 110, { bg: '#1a2a1a', rule: '#f4f0e0' });
  E.font.text(g, "MRS CRUMB'S CHALKBOARD", W / 2, H / 2 - 54, '#f4f0e0', { align: 'center', shadow: '#000' });
  E.font.text(g, 'THE KERFUFFLE METHOD', W / 2, H / 2 - 42, '#c8c0a0', { align: 'center' });
  E.font.text(g, 'resources × (1 - 0.07 × wickets), carry the scone...', W / 2, H / 2 - 28, '#d8d8c8', { align: 'center' });
  if (res) { bigTitle(g, 'NEW TARGET ' + res.target, W / 2, H / 2 - 14, { scale: 2 }); E.font.text(g, 'FROM ' + m.I.overs + ' OVERS', W / 2, H / 2 + 10, '#ffd23a', { align: 'center', shadow: '#000' }); }
  else E.font.text(g, 'AN OVER LOST. PLAY ON!', W / 2, H / 2, '#ffd23a', { align: 'center', scale: 2, shadow: '#000' });
}
