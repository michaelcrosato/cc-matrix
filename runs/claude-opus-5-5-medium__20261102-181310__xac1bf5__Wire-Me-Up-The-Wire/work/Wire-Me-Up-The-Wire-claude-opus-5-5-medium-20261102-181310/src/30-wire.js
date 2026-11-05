/* ============================================================================
 * 30-wire: CHAPTER 2, THE WIRE. A basement room in the Western, a clone pager and the payphone lines.
 * Decode the pages (the crew "jumps the 5" on the keypad), then monitor calls under the judge's rules:
 * flag what is pertinent, minimize what is not. Then read the meet out of what you flagged.
 * ========================================================================== */
const WIRE = (() => {
  const KEYS = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['*', '0', '#']];
  const JUMP = { 1: '9', 2: '8', 3: '7', 4: '6', 6: '4', 7: '3', 8: '2', 9: '1', 5: '0', 0: '5' };
  const enc = (s) => s.split('').map(c => JUMP[c] !== undefined ? JUMP[c] : c).join('');
  const PAGES = [
    { real: '4105553', meaning: "Callback: the payphone at Monroe & Fulton. They're telling Kev to call from the corner." },
    { real: '4107281', meaning: "Callback: the payphone outside the laundromat on Edmondson. Smoke's office." },
    { real: '4108600', meaning: "Callback ends 600: Pell says that's how they flag the boss. Pryor is calling." }
  ];
  const CALLS = [
    { title: 'CALL 1  •  PAYPHONE (MONROE) TO BURNER', pertinent: true, lines: [
      ['SMOKE', 'Yo.'], ['KEV', "Yeah, it's me. Tower's quiet."], ['SMOKE', "Tell your man the thing by the clock, where the boats come in.", true],
      ['KEV', 'The clock?'], ['SMOKE', "The two. Not the other one. The two.", true], ['SMOKE', "And burn this phone after. I mean it."]] },
    { title: 'CALL 2  •  BURNER TO (FEMALE)', pertinent: false, lines: [
      ['KEV', 'Hey baby.'], ['GIRL', "Kevin, did you get the sneakers for Lil Man? Size two, he grew."], ['KEV', "I got 'em. The white ones."],
      ['GIRL', "And his school called again. You need to come to that meeting."], ['KEV', "I'm gonna come. I said I'm gonna come."], ['GIRL', "You always say that."]] },
    { title: 'CALL 3  •  PAYPHONE (EDMONDSON) TO SMOKE', pertinent: true, lines: [
      ['DANTE', "Don't say nothing on this you don't have to."], ['SMOKE', 'Understood.'], ['DANTE', "The man from the boats wants to see me. In person.", true],
      ['SMOKE', "Same place?"], ['DANTE', "Same place, same time we said. Bring two of ours.", true], ['DANTE', "And tell your mother I said happy birthday."]] }
  ];
  let phase, talk, page, entry, cur, wrong, hint, call, line, typed, flags, minimized, lineT, results, t, flash, done, aiT, attract;
  const keyAt = (cx, cy) => KEYS[cy][cx];
  function enter(data) {
    data = data || {};
    attract = !!data.attract; talk = talk || makeTalk(); phase = 'brief'; page = 0; entry = ''; cur = [1, 1]; wrong = 0; hint = true; call = 0; line = 0; typed = 0; flags = []; minimized = false; lineT = 0; results = []; t = 0; flash = 0; done = false; aiT = 0;
    CASE.wire = { pages: 0, flagged: 0, minimized: 0, violations: 0, place: null, time: null };
    TOASTS.length = 0; L.enabled = false; game.weather = null; music('wire');
    if (attract) { phase = 'pager'; return; }
    scene(talk, [
      ['TECH', "Welcome to the basement. Mind the pipe, the pipe wins. We got the clone of Smoke's pager up, and the judge signed the payphones and the new burner off the number you pulled out of that trash."],
      ['PELL', "They page each other numbers. But nobody in this crew sends a real number. They jump the five."],
      ['PELL', "Look at a phone keypad. Every digit jumps across the five to the one opposite: 1 is 9, 2 is 8, 4 is 6. The 5 and the 0 trade places. Do that to the page, you get the real number."],
      ['TECH', "Then the calls. You flag what's about the business. Anything else, his girl, his mama, his kid, you minimize. You hit stop. That's the law, not me."],
      ['ASA', "And if you listen to a man's girlfriend for six minutes, Detective, I will be explaining it to a judge, and then I will be explaining you to a judge."]
    ], () => { phase = 'pager'; A.sfx('pager'); });
  }
  /* ---- pager ---- */
  function press(k) {
    if (k === '*') { entry = entry.slice(0, -1); A.sfx('click'); return; }
    if (k === '#') { submit(); return; }
    if (entry.length < 7) { entry += k; A.sfx('key', { pitch: 1 + +k * .03 }); }
    if (entry.length === 7) submit();
  }
  function submit() {
    const P2 = PAGES[page];
    if (entry === P2.real) {
      A.sfx('right'); CASE.wire.pages++; flash = .6; results.push(P2.meaning);
      toast('DECODED', P2.meaning.split(':')[0], '#9ae89a', 2.5);
      const m = P2.meaning; entry = ''; wrong = 0; page++;
      if (!attract) talk.who = 'TECH';
      talk.say(m, { name: 'NICKY (WIRE ROOM)', portrait: CAST.TECH.rig, portraitOpts: { zoom: 2.6, turn: .4, bg: '#1a2028' }, onDone: () => {
        if (page >= PAGES.length) { phase = 'calls'; call = 0; startCall(); } else { A.sfx('pager'); hint = false; }
      }, auto: attract ? 2 : 0 });
    } else {
      A.sfx('wrong'); wrong++; game.shake(2); entry = '';
      if (wrong >= 2) { toast('NICKY LEANS OVER', 'It\'s ' + PAGES[page].real.replace(/(\d{3})(\d{4})/, '$1-$2') + '. Jump every digit.', '#ffb040', 4); hint = true; }
      else toast('WRONG NUMBER', 'Jump each digit across the 5', '#ff7a6a', 2.5);
    }
  }
  /* ---- calls ---- */
  function startCall() { line = 0; typed = 0; flags = []; minimized = false; lineT = 0; A.sfx('ring'); game.after(.6, () => A.sfx('ring')); A.sfx('tape'); }
  const curLine = () => CALLS[call].lines[line];
  function flagLine() {
    if (minimized || !curLine() || flags.includes(line)) return;
    flags.push(line); A.sfx('pin');
    if (curLine()[2]) { CASE.wire.flagged++; toast('FLAGGED: PERTINENT', '"' + curLine()[1].slice(0, 40) + (curLine()[1].length > 40 ? '..."' : '"'), '#9ae89a', 2.2); }
    else { toast('FLAGGED', 'Nothing in that line. The ASA will strike it.', '#ffb040', 2.2); }
  }
  function minimize() {
    if (minimized) return;
    minimized = true; A.sfx('tape'); CASE.wire.minimized++;
    const c = CALLS[call];
    if (c.pertinent) toast('MINIMIZED A PERTINENT CALL', 'Whatever else they said is gone', '#ff7a6a', 3);
    else toast('MINIMIZED', line <= 3 ? 'By the book. The ASA nods.' : 'Late. That\'ll go in a report.', line <= 3 ? '#9ae89a' : '#ffb040', 3);
    if (!c.pertinent && line > 3) CASE.wire.violations++;
    game.after(1.4, endCall);
  }
  function endCall() {
    const c = CALLS[call];
    if (!c.pertinent && !minimized) { CASE.wire.violations++; toast('PRIVILEGED CALL, FULLY MONITORED', 'Violation logged. Minimize the personal ones.', '#ff5a4a', 3.5);
      if (!attract) { talk.who = 'ASA'; talk.say("That was his kid's sneakers, Detective. Minimize. Next time I pull the wire myself.", { name: 'ASA LINDQVIST', portrait: CAST.ASA.rig, portraitOpts: { zoom: 2.6, turn: .4, bg: '#24202a' } }); } }
    call++;
    if (call >= CALLS.length) { phase = 'read'; game.after(1, ask); } else game.after(1.2, startCall);
  }
  function ask() {
    if (attract) { CASE.wire.place = 'clock'; CASE.wire.time = 8; phase = 'done'; return; }
    talk.who = 'PELL';
    talk.say("So. \"The thing by the clock, where the boats come in.\" Where's the meet?", { name: 'DET. AUGIE PELL', portrait: CAST.PELL.rig, portraitOpts: { zoom: 2.6, turn: .4, bg: '#1e2a22' },
      choices: ['The clock tower pier, Locust Point', 'Penn Station clock', 'The Bromo-Seltzer tower', 'Nowhere. It\'s a dodge.'], onChoice: (i) => {
        CASE.wire.place = ['clock', 'penn', 'bromo', 'none'][i]; A.sfx(i === 0 ? 'right' : 'wrong');
        talk.who = 'PELL';
        talk.say(i === 0 ? "Boats and a clock. That's the old produce pier. Good." : "No boats at that one. Old produce pier on Locust Point has the clock and the boats. Write it down.", { name: 'DET. AUGIE PELL', portrait: CAST.PELL.rig, portraitOpts: { zoom: 2.6, turn: .4, bg: '#1e2a22' }, onDone: () => {
          talk.who = 'PELL';
          talk.say("And \"the two, not the other one.\" What time?", { name: 'DET. AUGIE PELL', portrait: CAST.PELL.rig, portraitOpts: { zoom: 2.6, turn: .4, bg: '#1e2a22' }, choices: ['Two o\'clock', 'Eight o\'clock', 'Five o\'clock', 'Ten o\'clock'], onChoice: (j) => {
            CASE.wire.time = [2, 8, 5, 10][j]; A.sfx(j === 1 ? 'right' : 'wrong');
            talk.who = 'PELL';
            talk.say(j === 1 ? "They jump the five on their times too. Two is eight. Tonight, eight o'clock... Smoke's crew runs late. Call it after midnight." : "They jump the five on everything. Two is eight. You'll get it. Tonight, then, late.", { name: 'DET. AUGIE PELL', portrait: CAST.PELL.rig, portraitOpts: { zoom: 2.6, turn: .4, bg: '#1e2a22' }, onDone: () => { phase = 'done'; CASE.chapter = Math.max(CASE.chapter, 2); game.after(.5, () => game.go('chapter', { n: 3 })); } });
          } });
        } });
      } });
  }
  /* ---- the attract mode's operator ---- */
  function aiStep(dt) {
    aiT += dt;
    if (phase === 'pager' && !talk.open && aiT > .45) { aiT = 0; const want = PAGES[page] && PAGES[page].real[entry.length]; if (want) { for (let y = 0; y < 4; y++) for (let x = 0; x < 3; x++) if (KEYS[y][x] === want) cur = [x, y]; press(want); } }
    if (phase === 'calls' && !minimized && curLine()) { const c = CALLS[call]; if (!c.pertinent && line >= 1 && typed > 10) minimize(); else if (curLine()[2] && typed > 12 && !flags.includes(line)) flagLine(); }
    if (phase === 'done' && aiT > 3) attractNext();
  }
  function update(dt) {
    tickToasts(dt); t += dt; if (flash > 0) flash -= dt;
    if (attract) { talk.update(dt); aiStep(dt); }
    else if (talk.update(dt)) return;
    const inp = game.input;
    if (phase === 'pager' && !attract) {
      if (inp.repeat('left')) { cur[0] = (cur[0] + 2) % 3; A.sfx('blip'); }
      if (inp.repeat('right')) { cur[0] = (cur[0] + 1) % 3; A.sfx('blip'); }
      if (inp.repeat('up')) { cur[1] = (cur[1] + 3) % 4; A.sfx('blip'); }
      if (inp.repeat('down')) { cur[1] = (cur[1] + 1) % 4; A.sfx('blip'); }
      if (inp.pressed('notebook')) hint = !hint;
      const p = inp.pointer(); if (p && inp.lastDevice === 'mouse') { const hit = keyHit(p[0], p[1]); if (hit) cur = hit; }
      const cl = inp.clicked(); if (cl) { const hit = keyHit(cl[0], cl[1]); if (hit) { cur = hit; press(keyAt(hit[0], hit[1])); } }
      else if (inp.pressed('interact') || (inp.pressed('confirm') && !inp.pressed('snap'))) press(keyAt(cur[0], cur[1]));
      if (inp.pressed('cancel')) press('*');
      for (let d = 0; d <= 9; d++) if (keyJust['Digit' + d] || keyJust['Numpad' + d]) { press(String(d)); for (let y = 0; y < 4; y++) for (let x = 0; x < 3; x++) if (KEYS[y][x] === String(d)) cur = [x, y]; }
    }
    if (phase === 'calls') {
      const c = CALLS[call], ln = curLine();
      if (ln && !minimized) {
        const before = Math.floor(typed); typed += dt * 26;
        const s = ln[1]; if (Math.floor(typed) > before && Math.floor(typed) <= s.length && Math.floor(typed) % 2) { const ch = s[Math.floor(typed) - 1]; if (ch && ch !== ' ') A.sfx(syllable(ln[0], ch), { vol: .9 }); }
        if (typed > s.length) { lineT += dt; if (lineT > 1.3) { lineT = 0; typed = 0; line++; if (line >= c.lines.length) { game.after(.6, endCall); } } }
        if (!attract) {
          const cl = inp.clicked(); const btn = cl && callHit(cl[0], cl[1]);
          if (inp.pressed('interact') || btn === 'flag' || (inp.pressed('confirm') && !keyJust.Space)) flagLine();
          if (inp.pressed('cancel') || inp.pressed('crouch') || btn === 'min' || keyJust.KeyM) minimize();
        }
      }
    }
    for (const k in keyJust) delete keyJust[k];
  }
  const keyJust = {};
  addEventListener('keydown', e => { if (!e.repeat) keyJust[e.code] = true; });
  /* ---- layout ---- */
  const LAY = () => { const W = game.W, H = game.H, cx = Math.round(W / 2); return { W, H, cx, kx: cx + 40, ky: Math.round(H / 2) - 54, kw: 30, kh: 22, lcdX: cx - 170, lcdY: Math.round(H / 2) - 54 }; };
  function keyHit(x, y) { const l = LAY(); for (let cy = 0; cy < 4; cy++) for (let cx = 0; cx < 3; cx++) { const bx = l.kx + cx * (l.kw + 4), by = l.ky + cy * (l.kh + 4); if (x >= bx && x < bx + l.kw && y >= by && y < by + l.kh) return [cx, cy]; } return null; }
  function callHit(x, y) { const l = LAY(), by = l.H - 46; if (y >= by && y < by + 18) { if (x >= l.cx - 120 && x < l.cx - 10) return 'flag'; if (x >= l.cx + 10 && x < l.cx + 120) return 'min'; } return null; }
  function room(g, W, H) {
    // cinderblock, a drop ceiling, a high barred window, the desk
    px.rect(g, 0, 0, W, H, '#3a3e3a');
    for (let y = 22; y < H - 50; y += 10) for (let x = ((y / 10) % 2) * 12 - 12; x < W; x += 24) { px.rect(g, x, y, 23, 9, (x + y) % 3 ? '#4a4e48' : '#464a44'); px.rect(g, x, y, 23, 1, '#565a52'); }
    px.rect(g, 0, 0, W, 20, '#c8c4b4'); for (let x = 0; x < W; x += 40) px.rect(g, x, 0, 1, 20, '#8a8678');
    const fl = Math.sin(t * 37) > .97 ? '#8a8a7a' : '#f8f8e8'; px.rect(g, W * .25, 16, 60, 3, fl); px.rect(g, W * .65, 16, 60, 3, '#f8f8e8');
    px.rect(g, W - 90, 26, 60, 22, '#1a2430'); px.rect(g, W - 88, 28, 56, 18, '#4a5a6a'); for (let x = W - 86; x < W - 32; x += 8) px.rect(g, x, 26, 2, 22, '#2a2a2a');
    px.rect(g, 0, H - 50, W, 50, '#5a4430'); px.rect(g, 0, H - 50, W, 3, '#7a5e42');
    // the clock (it is always wrong in the basement)
    const ck = [W - 130, 37]; px.disc(g, ck[0], ck[1], 11, '#1a1a1a'); px.disc(g, ck[0], ck[1], 10, '#e8e4d8'); const a = t * .1; px.line(g, ck[0], ck[1], ck[0] + Math.round(Math.cos(a) * 7), ck[1] + Math.round(Math.sin(a) * 7), '#1a1a1a'); px.line(g, ck[0], ck[1], ck[0] + 4, ck[1] - 2, '#1a1a1a');
    // a reel-to-reel and a laptop on the desk; coffee
    const rx = 18, ry = H - 46; px.rect(g, rx, ry, 64, 30, '#2a2a2e'); for (const ox of [16, 48]) { px.disc(g, rx + ox, ry + 13, 10, '#1a1a1a'); px.disc(g, rx + ox, ry + 13, 3, '#8a8a8a'); const sp = t * (phase === 'calls' && !minimized ? 6 : .5); px.line(g, rx + ox, ry + 13, rx + ox + Math.round(Math.cos(sp) * 8), ry + 13 + Math.round(Math.sin(sp) * 8), '#5a5a5a'); }
    px.rect(g, W - 70, H - 44, 14, 18, '#e8e4d8'); px.rect(g, W - 68, H - 42, 10, 3, '#3a2010'); px.rect(g, W - 56, H - 40, 4, 8, '#e8e4d8');
  }
  function draw(r) {
    const l = LAY(), W = l.W, H = l.H;
    r.overlay(g => {
      room(g, W, H);
      txt(g, 'CH.2  THE WIRE', 8, 24, '#f0c060');
      txt(g, 'WESTERN DISTRICT, BASEMENT ROOM 0-11', 8, 34, '#a8a498');
      if (phase === 'brief' || phase === 'pager') drawPager(g, l);
      if (phase === 'calls') drawCall(g, l);
      if (phase === 'read' || phase === 'done') drawSummary(g, l);
      drawToasts(g, W, phase === 'calls' ? H - 104 : 50);
    });
    talk.draw(r);
  }
  function drawPager(g, l) {
    const P2 = PAGES[Math.min(page, PAGES.length - 1)], x = l.lcdX, y = l.lcdY;
    // the clone pager
    px.rect(g, x - 4, y - 4, 160, 96, '#101012'); px.rect(g, x - 2, y - 2, 156, 92, '#2a2a30');
    txt(g, 'CLONE PAGER • SMOKE • PAGE ' + (page + 1) + '/3', x + 4, y + 2, '#c8c8d0');
    px.rect(g, x + 4, y + 14, 144, 26, flash > 0 ? '#c8e8a0' : '#8aa070'); px.rect(g, x + 4, y + 14, 144, 2, '#6a8050');
    txt(g, enc(P2.real).replace(/(\d{3})(\d{4})/, '$1-$2'), x + 76, y + 18, '#1a2a10', { align: 'center', scale: 2, shadow: false });
    txt(g, 'REAL NUMBER', x + 4, y + 46, '#a8a8b0');
    const shown = (entry + '_______').slice(0, 7).replace(/(.{3})(.{4})/, '$1 $2');
    txt(g, shown, x + 76, y + 58, '#ffd060', { align: 'center', scale: 2 });
    // the keypad
    for (let cy = 0; cy < 4; cy++) for (let cx = 0; cx < 3; cx++) {
      const bx = l.kx + cx * (l.kw + 4), by = l.ky + cy * (l.kh + 4), sel = cur[0] === cx && cur[1] === cy && phase === 'pager';
      px.rect(g, bx, by + 2, l.kw, l.kh, '#0a0a0c'); px.rect(g, bx, by, l.kw, l.kh, sel ? '#f0c060' : '#d8d4c8'); px.rect(g, bx, by + l.kh - 3, l.kw, 3, sel ? '#b08a30' : '#9a968a');
      const k = keyAt(cx, cy); txt(g, k === '*' ? 'DEL' : k === '#' ? 'OK' : k, bx + l.kw / 2, by + 6, '#16181e', { align: 'center', shadow: false });
    }
    if (hint && phase === 'pager') {   // jump the 5: lines through the middle key
      const c5 = [l.kx + 1 * (l.kw + 4) + l.kw / 2, l.ky + 1 * (l.kh + 4) + l.kh / 2];
      for (const [a, b] of [[[0, 0], [2, 2]], [[1, 0], [1, 2]], [[2, 0], [0, 2]], [[0, 1], [2, 1]]]) {
        const pa = [l.kx + a[0] * (l.kw + 4) + l.kw / 2, l.ky + a[1] * (l.kh + 4) + l.kh / 2], pb = [l.kx + b[0] * (l.kw + 4) + l.kw / 2, l.ky + b[1] * (l.kh + 4) + l.kh / 2];
        px.line(g, Math.round(pa[0]), Math.round(pa[1]) + 7, Math.round(pb[0]), Math.round(pb[1]) + 7, '#e83a3a');
      }
      px.disc(g, Math.round(c5[0]), Math.round(c5[1]) + 7, 3, '#e83a3a');
      txt(g, 'JUMP THE 5:  1-9  2-8  3-7  4-6  5-0', l.kx + 51, l.ky - 11, '#ff8a7a', { align: 'center' });
    }
    if (phase === 'pager' && !talk.open && !attract) promptRow(g, [[game.input.lastDevice === 'gamepad' ? 'up' : 'Pad:Digit1', 'Keys'], ['interact', 'Press'], [backAct(), 'Delete'], ['notebook', hint ? 'Hide hint' : 'Show hint']], l.cx, l.H - 16);
  }
  function drawCall(g, l) {
    const c = CALLS[call], x = Math.round(l.cx - 190), w = 380, y = 50;
    panel(g, x, y, w, l.H - 104, .92);
    txt(g, c.title, x + 8, y + 5, '#f0c060');
    const rec = !minimized; if (rec && Math.floor(t * 2) % 2) px.disc(g, x + w - 12, y + 9, 3, '#e83a3a'); txt(g, rec ? 'REC' : 'MINIMIZED', x + w - 20, y + 5, rec ? '#ff8a7a' : '#8a8a90', { align: 'right' });
    let yy = y + 20;
    c.lines.forEach((ln, i) => {
      if (i > line) return;
      const nm = (CAST[ln[0]] && CAST[ln[0]].name) || ln[0], shown = i < line ? ln[1] : ln[1].slice(0, Math.floor(typed));
      const lost = minimized && i >= line;
      const fl = flags.includes(i);
      txt(g, (fl ? '▸ ' : '  ') + (ln[0] === 'DANTE' ? 'UNKNOWN MALE' : nm) + ':', x + 8, yy, fl ? '#9ae89a' : '#c8b890');
      const body = lost ? '[ minimized ]' : S.subtitles ? shown : shown.replace(/[^ .,?!]/g, '~');
      const lines = E.font.wrap(body, w - 120);
      lines.forEach((s, k) => txt(g, s, x + 110, yy + k * 9, lost ? '#6a6a70' : '#f0ead8'));
      yy += Math.max(1, lines.length) * 9 + 3;
    });
    // the waveform of the voice
    const ln = curLine(); if (ln && !minimized) for (let i = 0; i < 60; i++) { const a = Math.abs(Math.sin(t * 20 + i * .7) * Math.sin(i * .3 + t * 3)) * (typed < ln[1].length ? 8 : 1); px.rect(g, x + 8 + i * 6, l.H - 66 - Math.round(a), 4, Math.max(1, Math.round(a * 2)), '#5ac08a'); }
    if (!attract) {
      const by = l.H - 46;
      for (const [bx, lab, act, col] of [[l.cx - 120, 'FLAG LINE', 'interact', '#2a4a2a'], [l.cx + 10, 'MINIMIZE', backAct('KeyM'), '#4a2a2a']]) {
        px.rect(g, bx, by, 110, 18, '#0a0a0c'); px.rect(g, bx + 1, by + 1, 108, 16, col); const gw = glyph(g, bx + 6, by + 4, act.startsWith('Pad:') ? act.slice(4) : codeFor(act)); txt(g, lab, bx + 10 + gw, by + 6, '#f0ead8');
      }
      txt(g, 'Flag what is about the business. Minimize anything personal, fast.', l.cx, l.H - 24, '#c8c0a8', { align: 'center' });
    }
  }
  function drawSummary(g, l) {
    const w = 300, x = Math.round(l.cx - w / 2), y = 54, W2 = CASE.wire;
    panel(g, x, y, w, 96, .92);
    txt(g, 'WIRE ROOM LOG', x + 8, y + 6, '#f0c060');
    txt(g, 'Pages decoded: ' + W2.pages + ' / 3', x + 8, y + 22); txt(g, 'Pertinent lines flagged: ' + W2.flagged + ' / 4', x + 8, y + 34);
    txt(g, 'Minimization violations: ' + W2.violations, x + 8, y + 46, W2.violations ? '#ff8a7a' : '#9ae89a');
    txt(g, 'The meet: ' + (W2.place ? (W2.place === 'clock' ? 'Clock tower pier' : 'wrong place, corrected') : '...') + (W2.time ? '  •  ' + (W2.time === 8 ? 'the eight (after midnight)' : 'wrong time, corrected') : ''), x + 8, y + 58, '#e8e2d0');
  }
  return { view: 'side', res: 'ps1', pausable: true, enter, update, draw, talk: () => talk, state: () => ({ phase, page, call, line, wire: CASE.wire }), exit() { } };
})();
