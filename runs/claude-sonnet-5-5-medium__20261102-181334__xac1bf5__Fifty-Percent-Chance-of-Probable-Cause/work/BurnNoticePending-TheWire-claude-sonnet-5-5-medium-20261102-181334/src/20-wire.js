/* ---- THE WIRE ROOM: headphones on, three intercepted calls. Log what matters, not what doesn't ---- */
const EVID = {
  E1: { id: 'E1', text: 'Re-up lands Thursday, 4 a.m.', kind: 'distribution', good: true },
  E2: { id: 'E2', text: 'The Annex on Calloway', kind: 'possession', good: true },
  E3: { id: 'E3', text: 'Boyce: "tell the corner they work for me"', kind: 'conspiracy', good: true },
  E4: { id: 'E4', text: 'Count: half a hundred, bagged', kind: 'possession', good: true },
  E5: { id: 'E5', text: 'Lonnie keeps a piece by the couch', kind: 'weapons', good: true },
  J1: { id: 'J1', text: 'Boyce wants crab cakes', kind: 'junk', good: false },
  J2: { id: 'J2', text: 'Tick owes Fats twenty', kind: 'junk', good: false }
};
const CALLS = [
  { who: 'BOYCE  >  FATS', time: '21:14', lines: [
    ['fats', "Yo. It's me. He there?"],
    ['boyce', "I'm here. Not on the phone, though. [[E1|The re-up lands Thursday]], four in the morning."],
    ['fats', 'Same spot as last time?'],
    ['boyce', "[[E2|The Annex on Calloway.]] And don't bring the little ones. [[J1|Get me crab cakes on the way.]]"]] },
  { who: 'BOYCE  >  LONNIE', time: '22:02', lines: [
    ['boyce', "Lonnie. [[E3|Tell the corner they work for me,]] not for the weather."],
    ['lonnie', 'They know. I got the count right here.'],
    ['boyce', 'How many?'],
    ['lonnie', "[[E4|Fifty. Half a hundred, bagged.]] Fats better not short it."]] },
  { who: 'LONNIE  >  TICK', time: '23:40', lines: [
    ['tick', "Yo Lon, you got that twenty? [[J2|I owe Fats twenty.]]"],
    ['lonnie', "Later. And keep away from the couch. [[E5|My piece stays by the couch,]] I ain't telling you twice."],
    ['tick', 'Man. I just wanted to sit.']] }
];
// parse "[[E1|text]]" into plain text and keyword spans
const parseLine = s => {
  let out = '', spans = []; const re = /\[\[(\w+)\|([^\]]+)\]\]/g; let last = 0, m;
  while ((m = re.exec(s))) { out += s.slice(last, m.index); spans.push({ ev: m[1], a: out.length, b: out.length + m[2].length }); out += m[2]; last = re.lastIndex; }
  return { text: out + s.slice(last), spans };
};
CALLS.forEach(c => c.lines = c.lines.map(([who, s]) => Object.assign({ who }, parseLine(s))));

const WIRE = (() => {
  let ci, li, shown, hold, phase, cd, flashMsg, endT, reelA, amp, blips, logs;
  const cur = () => CALLS[ci] && CALLS[ci].lines[li];
  function enter(data) {
    ci = 0; li = 0; shown = 0; hold = 0; phase = 'ring'; cd = 1.8; flashMsg = null; endT = 0; reelA = 0; amp = 0; blips = 0; logs = 0;
    game.follow(null); game.cam.bounds = null; L.enabled = false; music('wire'); toasts.length = 0;
    if (data && data.demo) DEMO = true;
    sfx('ring');
  }
  const windowOpen = () => {
    const ln = cur(); if (!ln || phase !== 'play') return null;
    for (const sp of ln.spans) if (shown >= sp.a + 1 && !S.logged.find(e => e.id === sp.ev)) return sp;
    return null;
  };
  function log(sp) {
    const ev = EVID[sp.ev]; S.logged.push(Object.assign({}, ev)); logs++;
    sfx('stamp'); game.flash(ev.good ? '#ffd36a' : '#888888', .08, .35); flashMsg = { t: 1.6, text: ev.good ? 'LOGGED: ' + ev.text : 'LOGGED (static): ' + ev.text, c: ev.good ? COL.green : COL.amber };
  }
  function update(dt) {
    updateToasts(dt); reelA += dt * (phase === 'play' ? 3 : .4); if (flashMsg) { flashMsg.t -= dt; if (flashMsg.t < 0) flashMsg = null; }
    if (phase === 'ring') { cd -= dt; if (cd <= 0) { phase = 'play'; shown = 0; hold = 0; } return; }
    if (phase === 'gap') { cd -= dt; if (cd <= 0) { phase = 'ring'; cd = 1.6; if (ci < CALLS.length) sfx('ring'); } return; }
    if (phase === 'end') {
      endT -= dt; if (endT <= 0) { if (HUB.active && 0) return; game.go('board'); } return; }
    const ln = cur(), fast = I.down('sprint') ? 2.4 : 1, prev = Math.floor(shown), len = ln.text.length;
    if (shown < len) {
      shown = Math.min(len, shown + 30 * dt * fast);
      for (let k = prev; k < Math.floor(shown); k++) { if (k % 2 === 0) { const v = babbleVoice(ln.who, ln.text[k]); if (v.vol) A.sfx(v, { vol: .8 }); } }
      amp = lerp(amp, .4 + Math.random() * .6, .3);
    } else { hold += dt * fast; amp = lerp(amp, 0, .2); }
    // logging
    const sp = windowOpen();
    const press = I.pressed('interact') || I.pressed('confirm') || (I.clicked() && !DEMO);
    if (DEMO && sp && EVID[sp.ev].good) log(sp);
    else if (press) {
      if (sp) log(sp); else { sfx('cancel', { vol: .5 }); flashMsg = { t: .8, text: 'Nothing there. Static.', c: COL.dim }; }
      I.consumeAll();
    }
    const spOpenAfter = ln.spans.some(sp2 => shown >= sp2.a + 1 && !S.logged.find(e => e.id === sp2.ev));
    if (shown >= len && hold > (spOpenAfter ? 2.6 : 1.1)) {
      li++; shown = 0; hold = 0;
      if (li >= CALLS[ci].lines.length) { li = 0; ci++; phase = 'gap'; cd = 1.0; if (ci >= CALLS.length) { phase = 'end'; endT = 2.8; sfx('hang' in A.presets ? 'hang' : 'cancel'); music(null); } }
    }
  }
  function drawText(g, ln, x, y, w) {
    const vis = ln.text.slice(0, Math.floor(shown)); const lines = E.font.wrap(ln.text, w); let idx = 0, yy = y;
    for (const ls of lines) {
      let xx = x;
      for (let k = 0; k < ls.length; k++, idx++) {
        // the wrapped text drops the spaces it breaks at: re-sync by looking for the char at idx
        while (idx < ln.text.length && ln.text[idx] !== ls[k]) idx++;
        if (idx >= vis.length) { return; }
        const sp = ln.spans.find(s => idx >= s.a && idx < s.b), done = sp && S.logged.find(e => e.id === sp.ev), hot = sp && !done;
        const c = done ? COL.green : hot ? COL.gold : '#e8e8e8';
        txt(g, ls[k], xx, yy, c, { shadow: '#000' });
        if (hot) px.rect(g, xx, yy + 8, E.font.width(ls[k]), 1, COL.gold);
        xx += E.font.width(ls[k]) + 1;
      }
      yy += 12;
    }
  }
  function draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H; px.rect(g, 0, 0, W, H, '#0b0a0e');
      for (let y = 0; y < H; y += 3) px.rect(g, 0, y, W, 1, '#100e14');
      // header
      panel(g, 8, 8, W - 16, 22); txt(g, 'INTERCEPT ' + Math.min(ci + 1, CALLS.length) + ' / ' + CALLS.length, 16, 12, COL.gold);
      const c = CALLS[Math.min(ci, CALLS.length - 1)]; txt(g, c.who + '    ' + c.time + '    LINE 555-0142', 16, 22, COL.blue);
      // reels
      for (const [cx, dir] of [[W * .22, 1], [W * .42, -1]]) {
        const cy = 78; px.disc(g, cx, cy, 24, '#1a1a20'); px.disc(g, cx, cy, 20, '#2a2a34'); px.disc(g, cx, cy, 5, '#0a0a0e');
        for (let k = 0; k < 3; k++) { const a = reelA * dir + k * TAU / 3; px.line(g, Math.round(cx), cy, Math.round(cx + Math.cos(a) * 19), Math.round(cy + Math.sin(a) * 19), '#6a6a78', 2); }
      }
      // meters and waveform
      panel(g, W * .55, 56, W * .4, 44, { bg: ['#101418', '#0a0e10'] }); txt(g, 'SIGNAL', W * .55 + 6, 60, '#7a8', {});
      for (let k = 0; k < 28; k++) { const h = Math.round(2 + (amp * 22) * (.35 + .65 * Math.abs(Math.sin(game.time * 9 + k * .9)))); px.rect(g, Math.round(W * .55 + 8 + k * ((W * .4 - 16) / 28)), 94 - h, 3, h, amp > .1 ? '#60e080' : '#2a4a32'); }
      // transcript
      const tx = 14, ty = 112, tw = W - 28, th = 62; panel(g, tx, ty, tw, th, { bg: ['#14141c', '#0c0c12'] });
      if (phase === 'ring') { txt(g, 'RING ... RING ...', W / 2, ty + 24, COL.amber, { align: 'center' }); }
      else if (phase === 'gap') { txt(g, 'CALL ENDED', W / 2, ty + 24, COL.dim, { align: 'center' }); }
      else if (phase === 'end') { txt(g, 'END OF TAPE', W / 2, ty + 18, COL.gold, { align: 'center' }); txt(g, logs + ' items logged this pass', W / 2, ty + 32, '#ddd', { align: 'center' }); }
      else { const ln = cur(), v = VOICES[ln.who]; txt(g, v.name, tx + 8, ty + 6, v.color); drawText(g, ln, tx + 8, ty + 19, tw - 18); }
      // the log sheet
      const sx = 14, sy = ty + th + 8, sw = W - 28, sh = Math.max(40, H - sy - 24); panel(g, sx, sy, sw, sh, { bg: ['#2a2418', '#1a160e'] });
      txt(g, 'LOG SHEET', sx + 8, sy + 5, COL.gold); let yy = sy + 16;
      for (const e of S.logged.slice(-Math.floor((sh - 16) / 10))) { txt(g, (e.good ? '+ ' : '- ') + e.text, sx + 8, yy, e.good ? COL.paper : COL.dim); yy += 10; }
      if (!S.logged.length) txt(g, 'Nothing yet.', sx + 8, yy, COL.dim);
      // prompt
      const sp = windowOpen(); if (phase === 'play') { if (sp) { const w = chip(g, W / 2 - 60, H - 20, 'interact', 'LOG IT', COL.gold); } else txt(g, 'Listen for what matters. ' + key('sprint') + ' = fast forward', W / 2, H - 16, '#999', { align: 'center' }); }
      if (flashMsg) txt(g, flashMsg.text, W / 2, ty - 10, flashMsg.c, { align: 'center' });
      drawToasts(g, W);
    });
  }
  return { view: 'side', views: ['side'], input: PRESET, res: 'ps1', pausable: true, enter, update, draw, exit() { music(null); } };
})();
scenes.wire = WIRE;

/* ---- THE CASE BOARD: pin the evidence to the charges, then ask a judge for paper ---- */
const CHARGES = [
  { id: 'C1', name: 'CONSPIRACY', note: 'Boyce directs the crew', ok: ['E3', 'PH1', 'PH2', 'PH3'] },
  { id: 'C2', name: 'DISTRIBUTION', note: 'The re-up and who moves it', ok: ['E1', 'TIP2'] },
  { id: 'C3', name: 'POSSESSION', note: 'The product, at the Annex', ok: ['E2', 'E4'] },
  { id: 'C4', name: 'WEAPONS', note: 'A piece in the house', ok: ['E5'] }
];
const BOARD = (() => {
  let cards, slots, row, step, msg, demoT, pool, result;
  const PH = { PH1: 'Photo: Little Tick', PH2: 'Photo: Mouse', PH3: 'Photo: Big Lonnie' };
  function enter(data) {
    cards = [];
    for (const e of S.logged) cards.push({ id: e.id, text: e.text, junk: !e.good });
    S.photos.forEach((id, i) => { const k = { tick: 'PH1', mouse: 'PH2', lonnie: 'PH3' }[id]; cards.push({ id: k, text: PH[k] }); });
    if (S.tip >= 2) cards.push({ id: 'TIP2', text: 'Deacon: the Annex' }); else if (S.tip === 1) cards.push({ id: 'TIP1', text: 'Deacon (leaned on): a phone' });
    slots = [null, null, null, null]; row = 0; msg = null; demoT = 0; result = null; step = 'pin';
    L.enabled = false; game.follow(null); music('board'); toasts.length = 0;
    if (data && data.demo) DEMO = true;
    if (!DEMO) say('tolly', ["Everything on that wall is a promise. Pin it to a charge it can actually carry.", 'Judge Harlow reads for ten minutes, tops. Make it tight.']);
  }
  const used = id => slots.includes(id);
  const options = r => [null].concat(cards.map(c => c.id).filter(id => !used(id) || slots[r] === id));
  const cycle = (r, d) => { const o = options(r), i = Math.max(0, o.indexOf(slots[r])); slots[r] = o[(i + d + o.length) % o.length]; sfx('select'); };
  const strength = () => CHARGES.reduce((n, c, i) => n + (c.ok.includes(slots[i]) ? 1 : 0), 0);
  function autoPin() { // demo: the right card on every charge
    CHARGES.forEach((c, i) => { const k = cards.find(cd => c.ok.includes(cd.id) && !used(cd.id)); if (k) slots[i] = k.id; });
  }
  function file(kind) {
    const st = strength(), junk = slots.filter(id => cards.find(c => c.id === id && c.junk)).length;
    S.board = { strength: st, granted: st >= 2, junk, slots: slots.slice() };
    if (kind === 'sweep') {
      S.juke = true; S.sweep = 8; S.arrests += 6; S.integrity -= 1; S.ending = 'numbers'; S.board = { strength: st, granted: false, junk, slots: slots.slice(), swept: true };
      convo([['dray', ["Good call. Two cars, ten minutes, a dozen kids in cuffs.", "The Deputy will have it in a press release by lunch."]], ['pike', ["And Boyce?"]], ['dray', ["Boyce eats dinner at home. Welcome to the numbers."]]], () => game.go('results'));
      return;
    }
    const lines = st >= 4 ? ["Four charges, each one carrying its weight. I read a lot of garbage, detective. This isn't.", 'Warrant granted. Do not make me regret it.']
      : st === 3 ? ["Three charges stand up. The fourth is wishful thinking.", "I'll sign. Narrowly."] : st === 2 ? ['Two charges. A thread, not a rope.', 'I will sign it, once, and I will remember who asked.']
      : ["There's nothing here a defense attorney can't eat for lunch.", 'Come back with more.'];
    say('judge', lines, { onDone: () => {
      if (S.board.granted) { sfx('stamp'); game.flash('#ffffff', .1, .5); toast('WARRANT GRANTED', st + ' of 4 charges hold', COL.green); game.after(1.2, () => game.go('street')); }
      else { S.overtime++; S.board = null; toast('DENIED', 'Back to the wire. Overtime +1', COL.red); game.after(1.0, () => game.go('wire')); }
    } });
  }
  function update(dt) {
    updateToasts(dt); if (msg) { msg.t -= dt; if (msg.t < 0) msg = null; }
    if (talk.update(dt)) return;
    const n = CHARGES.length + 2; // rows: 4 charges, FILE, SWEEP
    if (DEMO) { demoT += dt; if (demoT > .5 && !slots.some(Boolean)) autoPin(); if (demoT > 2.2) { file('judge'); demoT = -99; } return; }
    if (I.repeat('up')) { row = (row + n - 1) % n; sfx('select'); }
    if (I.repeat('down')) { row = (row + 1) % n; sfx('select'); }
    if (row < 4) { if (I.repeat('left')) cycle(row, -1); if (I.repeat('right')) cycle(row, 1); }
    // the mouse: hover a row to focus, click to cycle (left half) or file
    const p = I.pointer(); if (p && I.mouse.t !== board_mt) { board_mt = I.mouse.t; const k = rowAt(p[0], p[1]); if (k >= 0) row = k; }
    const clk = I.clicked(); if (clk) { const k = rowAt(clk[0], clk[1]); if (k >= 0) { row = k; I.consumeAll(); activate(clk[0] > rowX() + rowW() * .5 ? -1 : 1); return; } }
    if (I.pressed('confirm') || I.pressed('interact')) { I.consumeAll(); activate(1); }
  }
  let board_mt = 0, gW = 320, gH = 240;
  const rowX = () => 14, rowW = () => gW - 28, rowY = k => 38 + k * 26 + (k >= 4 ? 8 : 0);
  const rowAt = (x, y) => { for (let k = 0; k < 6; k++) { const ry = rowY(k); if (x >= rowX() && x < rowX() + rowW() && y >= ry && y < ry + (k < 4 ? 24 : 18)) return k; } return -1; };
  function activate(d) {
    if (row < 4) cycle(row, d);
    else if (row === 4) { if (!slots.some(Boolean)) { msg = { t: 1.5, text: 'Pin something first.' }; sfx('cancel'); } else file('judge'); }
    else if (row === 5) { say('dray', ["I can have two cars on the corner in ten minutes. Twelve arrests, no paper, no judge. Numbers, Pike.", 'Say the word.'], { choices: ['Do it', 'No. Hold for the warrant'], onChoice: i => { if (i === 0) file('sweep'); } }); }
  }
  function draw(r) {
    gW = r.W; gH = r.H;
    r.overlay(g => {
      const W = r.W, H = r.H; px.rect(g, 0, 0, W, H, '#2a1f14'); for (let y = 0; y < H; y += 8) px.rect(g, 0, y, W, 1, '#32261a');
      txt(g, 'THE CASE BOARD', W / 2, 8, COL.gold, { align: 'center', scale: 1 }); txt(g, 'Pin one card to each charge. Cards that do not carry the charge count for nothing.', W / 2, 20, '#d8c8a8', { align: 'center' });
      for (let k = 0; k < 4; k++) {
        const c = CHARGES[k], y = rowY(k), sel = row === k, card = cards.find(cd => cd.id === slots[k]);
        panel(g, rowX(), y, rowW(), 24, { border: sel ? '#ffffff' : '#7a6a4a', bg: sel ? ['#3a3020', '#241c10'] : ['#241c12', '#18120a'] });
        txt(g, c.name, rowX() + 8, y + 4, sel ? COL.gold : '#d8c8a8'); txt(g, c.note, rowX() + 8, y + 14, '#a8987a');
        const cx = rowX() + Math.floor(rowW() * .46), cw = rowW() - Math.floor(rowW() * .46) - 8;
        panel(g, cx, y + 3, cw, 18, { bg: card ? (card.junk ? ['#4a3a3a', '#2a1a1a'] : ['#e8e0c8', '#c8c0a8']) : ['#1a140c', '#120d08'], border: card ? '#fff' : '#5a4a32' });
        txt(g, card ? card.text : (sel ? 'choose a card' : '-'), cx + 5, y + 9, card ? (card.junk ? '#e88' : '#222') : '#7a6a4a', card ? { shadow: false, outline: false } : {});
        if (sel) { txt(g, '<', cx - 8, y + 9, '#fff'); txt(g, '>', cx + cw + 2, y + 9, '#fff'); }
      }
      let y = rowY(4); const sel4 = row === 4; panel(g, rowX(), y, rowW(), 18, { border: sel4 ? '#fff' : '#7a6a4a', bg: sel4 ? ['#2a4a2a', '#1a2a1a'] : ['#1a2a1a', '#101a10'] });
      txt(g, 'FILE WITH JUDGE HARLOW', W / 2, y + 6, sel4 ? COL.green : '#9ac89a', { align: 'center' });
      y = rowY(5); const sel5 = row === 5; panel(g, rowX(), y, rowW(), 18, { border: sel5 ? '#fff' : '#6a4a4a', bg: sel5 ? ['#4a2a2a', '#2a1a1a'] : ['#2a1a1a', '#1a1010'] });
      txt(g, "TAKE LT. DRAY'S FAST NUMBERS (SWEEP THE CORNER)", W / 2, y + 6, sel5 ? COL.red : '#c89a9a', { align: 'center' });
      const left = cards.filter(c => !used(c.id)).length; txt(g, left + ' unused cards', W / 2, H - 28, '#d8c8a8', { align: 'center' });
      if (msg) txt(g, msg.text, W / 2, H - 40, COL.red, { align: 'center' });
      txt(g, key('up') + key('down') + ' CHARGE   ' + key('left') + key('right') + ' CARD   ' + key('confirm') + ' SELECT', W / 2, H - 14, '#aaa', { align: 'center' });
      drawToasts(g, W); if (talk.open) { /* drawn by the scene */ }
    });
    talk.draw(r);
  }
  return { view: 'side', views: ['side'], input: PRESET, res: 'ps1', pausable: true, enter, update, draw, exit() { music(null); } };
})();
scenes.board = BOARD;
