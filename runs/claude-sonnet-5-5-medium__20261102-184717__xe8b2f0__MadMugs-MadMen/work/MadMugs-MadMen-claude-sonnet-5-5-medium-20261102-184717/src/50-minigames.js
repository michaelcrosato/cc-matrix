// ---------------------------------------------------------------------------------------------------------------------
// THE TWO SET PIECES: the typewriter (write the line) and the pitch (sell it)
// ---------------------------------------------------------------------------------------------------------------------
const TIMING = () => ({ relaxed: 1.4, standard: 1, tough: .72 }[game.settings.timing] || 1);
// a timing meter shared by both: a marker sweeps a bar, a sweet spot sits somewhere on it; confirm (or click) stops it
function newMeter() {
  const w = clamp(.26 + stat('polish') * .012 - S.stats.haze * .018, .1, .5) * TIMING();
  return { pos: Math.random() * .3, dir: 1, center: .25 + Math.random() * .5, w, speed: 1.05 * clamp(1 - stat('nerve') * .04, .55, 1) * (S.stats.haze >= 5 ? 1.25 : 1), done: false, grade: null, wait: .25 };
}
function meterStep(m, dt) {
  if (m.done) return;
  m.pos += m.dir * m.speed * dt; if (m.pos > 1) { m.pos = 1; m.dir = -1; } if (m.pos < 0) { m.pos = 0; m.dir = 1; }
  m.wait -= dt;
  const hit = m.wait <= 0 && (I.pressed('confirm') || I.pressed('interact') || I.clicked());
  if (hit) {
    const d = Math.abs(m.pos - m.center);
    m.grade = d <= m.w * .2 ? 'perfect' : d <= m.w / 2 ? 'good' : 'miss'; m.done = true;
  }
}
function drawMeter(g, m, x, y, w) {
  px.rect(g, x - 1, y - 1, w + 2, 11, '#0c0a12'); px.rect(g, x, y, w, 9, '#2a2234');
  const zx = Math.round(x + (m.center - m.w / 2) * w), zw = Math.max(3, Math.round(m.w * w));
  px.rect(g, zx, y, zw, 9, '#3f7a52'); px.rect(g, Math.round(x + (m.center - m.w * .2) * w), y, Math.max(2, Math.round(m.w * .4 * w)), 9, '#7ed08a');
  const mx = Math.round(x + m.pos * w); px.rect(g, mx - 1, y - 3, 3, 15, m.done ? (m.grade === 'miss' ? '#f06a5a' : '#fff4c8') : '#ffd890');
}

// ---- the typewriter ---------------------------------------------------------------------------------------------------
const TY = { phase: 'off', lead: null, close: null, opts: [], sel: 0, meter: null, strikes: 0, clean: 0, done: 0, hover: -1 };
function typeOptions() { return Object.keys(THEMES).filter(k => k === 'style' || S.cards[k]); }
function openTypewriter() {
  S.mode = 'type'; TY.phase = 'lead'; TY.opts = typeOptions(); TY.sel = 0; TY.lead = TY.close = null; TY.strikes = TY.clean = 0; game.audio.sfx('paper');
}
function closeTypewriter(spent) { TY.phase = 'off'; S.mode = 'walk'; talkCool = .3; if (spent) addTime(spent); }
function typewriterUpdate(dt) {
  if (TY.phase === 'strike') {
    if (!TY.meter) TY.meter = newMeter();
    const m = TY.meter; meterStep(m, dt);
    if (m.done && !m.shown) { m.shown = true; m.wait = .55; if (m.grade === 'miss') game.audio.sfx('carriage'); else { game.audio.sfx('typekey'); TY.clean++; } TY.strikes++; }
    else if (m.done && m.shown) { m.wait -= dt; if (m.wait <= 0) { if (TY.strikes >= 3) { TY.phase = 'read'; game.audio.sfx('typebell'); } else TY.meter = newMeter(); } }
    return;
  }
  if (TY.phase === 'read') {
    if (I.pressed('confirm') || I.pressed('interact') || I.clicked()) {
      const first = !S.tagline, text = TAG_LEAD[TY.lead] + ' ' + TAG_CLOSE[TY.close];
      S.tagline = { lead: TY.lead, close: TY.close, q: TY.clean, text };
      pop('THE LINE IS WRITTEN', '#ffe9b0'); game.audio.sfx('stamp'); closeTypewriter(first ? 60 : 30);
    }
    return;
  }
  if (I.pressed('cancel')) return closeTypewriter(0);
  const n = TY.opts.length;
  if (I.repeat('down') || I.repeat('right')) { TY.sel = (TY.sel + 1) % n; game.audio.sfx('select'); }
  if (I.repeat('up') || I.repeat('left')) { TY.sel = (TY.sel + n - 1) % n; game.audio.sfx('select'); }
  const c = I.clicked(), p = I.lastDevice === 'mouse' ? I.pointer() : null;
  const rowAt = pt => pt ? TY.rows.findIndex(q => pt[0] >= q[0] && pt[0] < q[0] + q[2] && pt[1] >= q[1] && pt[1] < q[1] + q[3]) : -1;
  if (p) { const h = rowAt(p); if (h >= 0 && h !== TY.sel && (!TY.lastP || TY.lastP[0] !== p[0] || TY.lastP[1] !== p[1])) { TY.sel = h; game.audio.sfx('tick'); } TY.lastP = p.slice(); }
  const pick = I.pressed('confirm') || I.pressed('interact') ? TY.sel : c ? rowAt(c) : -1;
  if (pick >= 0 && pick < n) {
    game.audio.sfx('confirm');
    if (TY.phase === 'lead') { TY.lead = TY.opts[pick]; TY.phase = 'close'; TY.sel = 0; }
    else { TY.close = TY.opts[pick]; TY.phase = 'strike'; TY.meter = null; }
  }
}
TY.rows = [];
function drawTypewriter(r) {
  r.overlay(g => {
    const w = Math.min(r.W - 24, 360), h = Math.min(r.H - 24, 176), x = Math.round((r.W - w) / 2), y = Math.round((r.H - h) / 2);
    px.rect(g, 0, 0, r.W, r.H, 'rgba(8,6,12,.55)');
    panel(g, x, y, w, h);
    txt(g, 'THE TYPEWRITER', x + 10, y + 7, '#ffe9b0', { scale: 1 });
    // the page
    px.rect(g, x + 10, y + 20, w - 20, 44, '#efe8d4'); px.rect(g, x + 10, y + 63, w - 20, 2, '#b8b098');
    const lead = TY.lead ? TAG_LEAD[TY.lead] : '', close = TY.close ? TAG_CLOSE[TY.close] : '';
    const line = (lead + ' ' + close).trim();
    E.font.wrap(line || ' ', w - 34, {}).slice(0, 3).forEach((ln, i) => txt(g, ln, x + 18, y + 26 + i * 10, '#2a2230', { shadow: false }));
    TY.rows = [];
    if (TY.phase === 'lead' || TY.phase === 'close') {
      txt(g, TY.phase === 'lead' ? 'HOW DOES IT BEGIN?' : 'AND HOW DOES IT END?', x + 10, y + 72, '#d8d2c0');
      TY.opts.forEach((k, i) => {
        const yy = y + 84 + i * 15, on = i === TY.sel, phrase = TY.phase === 'lead' ? TAG_LEAD[k] : TAG_CLOSE[k];
        px.rect(g, x + 10, yy - 2, w - 20, 14, on ? '#4a3a60' : '#2a2038'); px.rect(g, x + 10, yy - 2, 4, 14, THEMES[k].color);
        txt(g, THEMES[k].name, x + 20, yy + 1, THEMES[k].color); txt(g, phrase, x + 70, yy + 1, on ? '#fff' : '#cfc8d8');
        TY.rows.push([x + 10, yy - 2, w - 20, 14]);
      });
      txt(g, 'More cards, more words. Style is always at hand.', x + 10, y + h - 22, '#8a8298');
      let gx = x + 10; gx += drawGlyph(g, 'confirm', gx, y + h - 9) + 3; txt(g, 'CHOOSE', gx, y + h - 12, '#d8d2c0'); gx += tw('CHOOSE') + 10;
      gx += drawGlyph(g, 'cancel', gx, y + h - 9) + 3; txt(g, 'STAND UP', gx, y + h - 12, '#d8d2c0');
    } else if (TY.phase === 'strike') {
      txt(g, 'STRIKE THE KEYS: STOP THE MARKER IN THE GREEN  (' + (TY.strikes + (TY.meter && TY.meter.done ? 0 : 1)) + ' OF 3)', x + 10, y + 72, '#d8d2c0');
      if (TY.meter) drawMeter(g, TY.meter, x + 20, y + 96, w - 40);
      txt(g, 'CLEAN: ' + TY.clean, x + 20, y + 120, '#aee8b0');
      let gx = x + 10; gx += drawGlyph(g, 'confirm', gx, y + h - 9) + 3; txt(g, 'STRIKE', gx, y + h - 12, '#d8d2c0');
    } else {
      txt(g, TY.clean >= 3 ? 'CLEAN AS A WHISTLE.' : TY.clean === 2 ? 'ONE SMUDGE. NOBODY WILL NOTICE.' : TY.clean === 1 ? 'SMUDGED. THE POETRY SURVIVES.' : 'A MESS. IT IS STILL YOURS.', x + 10, y + 72, '#ffe9b0');
      txt(g, 'Quality ' + TY.clean + ' of 3 adds to the line\'s weight in the room.', x + 10, y + 86, '#c8c0b0');
      let gx = x + 10; gx += drawGlyph(g, 'confirm', gx, y + h - 9) + 3; txt(g, 'PULL THE PAGE', gx, y + h - 12, '#d8d2c0');
    }
  });
}

// ---- the pitch -----------------------------------------------------------------------------------------------------------
const PT = { phase: 'off', round: 0, hand: [], sel: 0, meter: null, cardId: null, rows: [], lastP: null, lastDelta: 0, tell: '', speech: '' };
function narrate(lines, after) {
  const prev = S.mode; T._tmp = { who: '', say: lines };
  runNode('_tmp', () => { S.mode = prev; if (after) after(); });
}
function askNode(say, asks, after) {
  const prev = S.mode; T._ask = { who: say[0][0], say: say.map(l => l), ask: asks };
  runNode('_ask', () => { S.mode = prev; if (after) after(); });
}
function cardAff(id) {
  if (id === 'silence') return -4;
  if (id === 'tagline') { const t = S.tagline; return (THEMES[t.lead].aff + THEMES[t.close].aff) / 2 + (t.lead === t.close ? 4 : 0) + t.q * 3; }
  return THEMES[id].aff + (S.cards[id].strong ? 6 : 0);
}
function gradeDelta(aff, grade) {
  const pos = { perfect: 1.4, good: 1, miss: .5 }, neg = { perfect: .5, good: 1, miss: 1.4 };
  return Math.round(aff * (aff >= 0 ? pos[grade] : neg[grade]));
}
function tellFor(delta) { return PITCH.tells.find(t => delta >= t[0])[1]; }
function addInterest(d) {
  S.interest = clamp(S.interest + d, 0, 100);
  if (d) pop('GARLAND ' + (d > 0 ? '+' : '') + d, d > 0 ? '#8fe0a0' : '#f08a7a');
  game.audio.sfx(d >= 10 ? 'good' : d >= 0 ? 'okay' : 'poor');
}
function startPitch() {
  S.flags.pitchStarted = true; S.mode = 'pitch'; PT.phase = 'intro'; S.round = 0; S.used = {}; game.setZoom(.82);
  const g = spotXY('conf_gil'); hero.x = g[0]; hero.y = g[1]; hero.vx = hero.vy = 0; hero.facing = 0;
  placeNpc('garland', 'garland'); placeNpc('hollis', 'conf_hollis'); placeNpc('teddy', 'conf_teddy');
  for (const id of ['garland', 'hollis', 'teddy']) npcs[id].shown = true;
  music('pitch'); game.audio.sfx('elevatorbell');
  narrate(PITCH.intro, () => beginRound(0));
}
function beginRound(i) {
  PT.round = S.round = i; PT.phase = 'wait';
  const go = () => narrate([['', PITCH.rounds[i].name + '. ' + PITCH.rounds[i].ask]], () => { buildHand(); });
  if (i === 1) {
    const tp = PITCH.teddy;
    askNode(tp.say, tp.ask.map(a => ({ t: a.t, fx: a.fx, go: null, do: () => { PT.afterTeddy = a; } })), () => {
      const a = PT.afterTeddy; if (a.hit) addInterest(a.hit);
      narrate([['', a.line]], go);
    });
  } else go();
}
function buildHand() {
  PT.hand = Object.keys(THEMES).filter(k => S.cards[k] && !S.used[k]);
  if (S.tagline && !S.used.tagline) PT.hand.push('tagline');
  PT.hand.push('silence'); PT.sel = 0; PT.phase = 'pick'; PT.meter = null; PT.speech = '';
}
function cardLabel(id) { return id === 'tagline' ? 'YOUR LINE' : id === 'silence' ? 'SILENCE' : THEMES[id].name; }
function cardColor(id) { return id === 'tagline' ? '#ffe9b0' : id === 'silence' ? '#a8a0b8' : THEMES[id].color; }
function playCard(id) {
  PT.cardId = id; game.audio.sfx('confirm');
  if (id === 'silence') { PT.phase = 'react'; return resolveCard(id, 'good'); }
  S.used[id] = true; PT.phase = 'deliver'; PT.meter = newMeter();
  PT.speech = id === 'tagline' ? '"' + S.tagline.text + '"' : SPEECH[id];
}
function resolveCard(id, grade) {
  const aff = cardAff(id), delta = id === 'silence' ? -4 : gradeDelta(aff, grade);
  PT.lastDelta = delta; PT.phase = 'react';
  const gl = id === 'silence' ? 'You say nothing. It is the loudest thing in the room.' : grade === 'perfect' ? 'You land it clean, every syllable where it belongs.' : grade === 'good' ? 'It comes out the way you rehearsed it.' : 'The sentence trips on its own shoelace.';
  addInterest(delta);
  const next = () => { PT.round < 2 ? beginRound(PT.round + 1) : trustQuestion(); };
  narrate([['', gl], ['', tellFor(delta)]], next);
}
function trustQuestion() {
  PT.phase = 'trust';
  const asks = PITCH.trust.ask.map(a => ({ t: a.t, go: null, do: () => { PT.trust = a; } }));
  askNode([['garland', 'One last thing, Mr. Mercer. ' + PITCH.rounds[2].ask.split('"')[1] ]], asks, () => {
    const a = PT.trust, ok = a.ok(S), d = ok ? a.good : a.bad;
    addInterest(d); narrate([['', ok ? a.goodLine : a.badLine]], verdict);
  });
}
function verdict() {
  PT.phase = 'verdict';
  if (S.stats.haze >= 8) { addInterest(-25); }
  S.ending = decideEnding(); S.score = computeScore();
  const E_ = ENDINGS[S.ending];
  narrate(E_.lines.slice(0, 1).map(t => ['', t]), () => finishDay());
}
function finishDay() { S.mode = 'ending'; PT.phase = 'off'; game.resetCamera(); reportResult(); game.go('end'); }

function pitchUpdate(dt) {
  if (PT.phase === 'pick') {
    const n = PT.hand.length;
    if (I.repeat('right')) { PT.sel = (PT.sel + 1) % n; game.audio.sfx('select'); }
    if (I.repeat('left')) { PT.sel = (PT.sel + n - 1) % n; game.audio.sfx('select'); }
    const c = I.clicked(), p = I.lastDevice === 'mouse' ? I.pointer() : null;
    const rowAt = pt => pt ? PT.rows.findIndex(q => pt[0] >= q[0] && pt[0] < q[0] + q[2] && pt[1] >= q[1] && pt[1] < q[1] + q[3]) : -1;
    if (p) { const h = rowAt(p); if (h >= 0 && h !== PT.sel && (!PT.lastP || PT.lastP[0] !== p[0] || PT.lastP[1] !== p[1])) { PT.sel = h; game.audio.sfx('tick'); } PT.lastP = p.slice(); }
    const pick = I.pressed('confirm') || I.pressed('interact') ? PT.sel : c ? rowAt(c) : -1;
    if (pick >= 0 && pick < n) playCard(PT.hand[pick]);
  } else if (PT.phase === 'deliver') {
    const m = PT.meter; meterStep(m, dt);
    if (m.done && !m.shown) { m.shown = true; m.wait = .7; game.audio.sfx(m.grade === 'miss' ? 'carriage' : 'typekey'); }
    else if (m.done && m.shown) { m.wait -= dt; if (m.wait <= 0) resolveCard(PT.cardId, m.grade); }
  }
}
function drawPitch(r) {
  r.overlay(g => {
    // the top: Garland's face, his interest, the line that signs
    const bw = Math.min(r.W - 20, 300), bx = Math.round((r.W - bw) / 2);
    panel(g, bx, 4, bw, 30, { alpha: .9 });
    rigs.garland.drawPortrait(g, bx + 4, 6, 26, { zoom: 2.4 });
    txt(g, 'GARLAND\'S INTEREST', bx + 36, 8, '#e8d8b8');
    px.rect(g, bx + 36, 19, bw - 46, 8, '#0c0a12'); px.rect(g, bx + 37, 20, bw - 48, 6, '#2a2234');
    const fw = bw - 48, v = S.interest / 100;
    px.rect(g, bx + 37, 20, Math.round(fw * v), 6, S.interest >= 70 ? '#7ed08a' : S.interest >= 48 ? '#e8c070' : '#e87a5a');
    px.rect(g, bx + 37 + Math.round(fw * .48), 18, 1, 10, '#fff'); px.rect(g, bx + 37 + Math.round(fw * .7), 18, 1, 10, '#fff');
    txt(g, 'MAYBE', bx + 37 + Math.round(fw * .48) - 10, 28, '#b8b0c8'); txt(g, 'SIGN', bx + 37 + Math.round(fw * .7) - 6, 28, '#b8b0c8');
    txt(g, 'ROUND ' + (PT.round + 1) + ' OF 3', bx + bw - 54, 8, '#b8b0c8');
    const ph = PT.phase;
    if (ph === 'pick') {
      const n = PT.hand.length, cw = Math.min(70, Math.floor((r.W - 16 - (n - 1) * 4) / n)), tot = n * cw + (n - 1) * 4, sx = Math.round((r.W - tot) / 2), cy = r.H - 92;
      PT.rows = [];
      PT.hand.forEach((id, i) => {
        const x = sx + i * (cw + 4), on = i === PT.sel, y = on ? cy - 6 : cy;
        px.rect(g, x - 1, y - 1, cw + 2, 72, on ? '#ffe9b0' : '#0c0a12'); px.rect(g, x, y, cw, 70, '#241a30'); px.rect(g, x, y, cw, 12, cardColor(id));
        txt(g, cardLabel(id), x + 3, y + 3, '#1a1420', { shadow: false });
        const aff = id === 'tagline' ? 'YOUR LINE' : id === 'silence' ? '' : tasteOf(id);
        const body = id === 'tagline' ? S.tagline.text : id === 'silence' ? 'Let the room speak.' : THEMES[id].blurb;
        E.font.wrap(body, cw - 6, {}).slice(0, 4).forEach((ln, k) => txt(g, ln, x + 3, y + 16 + k * 9, '#e8e4ff'));
        if (id !== 'silence' && id !== 'tagline') { if (S.cards[id].strong) txt(g, 'STRONG', x + 3, y + 60, '#ffe9b0'); txt(g, aff, x + cw - tw(aff) - 3, y + 60, aff === 'LIKES' ? '#8fe0a0' : aff === 'DISLIKES' ? '#f08a7a' : '#a8a0b8'); }
        PT.rows.push([x, y, cw, 70]);
      });
      let gx = bx; gx += drawGlyph(g, 'confirm', gx, cy + 84) + 3; txt(g, 'PLAY CARD', gx, cy + 81, '#d8d2c0'); gx += tw('PLAY CARD') + 14; gx += drawGlyph(g, 'left', gx, cy + 84) + 3; txt(g, 'CHOOSE', gx, cy + 81, '#d8d2c0');
    } else if (ph === 'deliver') {
      const w = Math.min(r.W - 24, 360), x = Math.round((r.W - w) / 2), y = r.H - 96;
      panel(g, x, y, w, 88);
      E.font.wrap(PT.speech, w - 20, {}).slice(0, 5).forEach((ln, i) => txt(g, ln, x + 10, y + 8 + i * 9, '#fff4e0'));
      drawMeter(g, PT.meter, x + 14, y + 62, w - 28);
      let gx = x + 10; gx += drawGlyph(g, 'confirm', gx, y + 80) + 3; txt(g, 'DELIVER IT IN THE GREEN', gx, y + 77, '#d8d2c0');
    }
  });
}
