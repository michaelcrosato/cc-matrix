/* DICK WHITMAN'S WILD RIDE: the three set pieces that take over the screen: the headline sprint, the pitch, the end of the day. */
(() => {
'use strict';
const game = window.__game, M = game.MAD, E = M.E, px = E.px, { clamp } = E;
M.modes = {};
const T = (g, s, x, y, c, o) => E.font.text(g, s, x, y, c || '#fdf6e6', Object.assign({ outline: false, shadow: '#05040a' }, o || {}));
const dim = (g, W, H, a) => px.blend(g, a, 'normal', () => px.rect(g, 0, 0, W, H, '#07050d'));
const inRect = (p, r) => p && p[0] >= r[0] && p[0] < r[0] + r[2] && p[1] >= r[1] && p[1] < r[1] + r[3];

/* =====================================================================================================
   THE HEADLINE SPRINT: type Margie's line before the minute is up. Arrow keys, stick, d-pad, or click the arrows.
   ===================================================================================================== */
const WORDS = ['EMBER', 'GOLD:', 'THE', 'ONE', 'THING', 'THAT', 'NEVER', 'GOES', 'OUT', 'ON YOU.'];
const DIRS = ['up', 'down', 'left', 'right'], ARROW = { up: '↑', down: '↓', left: '←', right: '→' };
let SP = null;
M.startSprint = () => {
  const R = M.rngFor ? M.rngFor('sprint') : E.rng(7);
  SP = { t: 13, i: 0, seq: WORDS.map(() => DIRS[Math.floor(R() * 4)]), misses: 0, flash: 0, bad: 0, phase: 'intro', intro: 1.6, end: 0, grade: 'C', combo: 0, best: 0 };
  M.mode = 'sprint'; M.S.flags.margie = 1; game.audio.music(M.songs.sprint, { fade: .3 });
};
const sprintPads = () => { const W = game.W, H = game.H, cx = W / 2, cy = H - 58, s = 24; return { up: [cx - s / 2, cy - s - 2, s, s], down: [cx - s / 2, cy + 2, s, s], left: [cx - s * 1.5 - 4, cy + 2, s, s], right: [cx + s * .5 + 4, cy + 2, s, s] }; };
M.modes.sprint = {
  update(dt) {
    const inp = game.input, S = SP;
    if (S.phase === 'intro') { S.intro -= dt; if (S.intro <= 0) S.phase = 'play'; return; }
    if (S.phase === 'play') {
      S.t -= dt; S.flash = Math.max(0, S.flash - dt * 3); S.bad = Math.max(0, S.bad - dt * 3);
      let pressed = DIRS.find(d => inp.pressed(d)); const c = inp.clicked();
      if (!pressed && c) { const pads = sprintPads(); pressed = DIRS.find(d => inRect(c, pads[d])); }
      if (M.S.demo && S.i < S.seq.length && Math.floor(S.t * 7) !== Math.floor((S.t + dt) * 7)) pressed = S.seq[S.i];
      if (pressed) {
        if (pressed === S.seq[S.i]) { S.i++; S.combo++; S.best = Math.max(S.best, S.combo); S.flash = 1; game.audio.sfx('typekey'); if (S.i % 3 === 0) game.audio.sfx('typebell'); }
        else { S.misses++; S.combo = 0; S.bad = 1; S.t -= .7; game.audio.sfx('hurt', { vol: .5 }); game.shake && game.shake(1.5); }
      }
      if (S.i >= S.seq.length || S.t <= 0) {
        S.phase = 'done'; S.end = 2.2;
        S.grade = S.i >= S.seq.length ? (S.t >= 4 && S.misses <= 2 ? 'S' : 'A') : (S.i >= 7 ? 'B' : 'C');
        game.audio.sfx(S.i >= S.seq.length ? 'sting_win' : 'sting_lose');
        if (S.grade === 'S') M.stat('rep', 4, 'REPUTATION', true); else if (S.grade === 'A') M.stat('rep', 2, 'REPUTATION', true);
        M.S.sprintGrade = S.grade;
      }
    } else if (S.phase === 'done') {
      S.end -= dt;
      if (S.end <= 0 || game.input.pressed('confirm') || (M.S.demo && S.end < 1.2)) { M.mode = 'world'; game.audio.music(M.songs.office, { fade: .5 }); M.run(M.T.margieAfter(S.grade)); }
    }
  },
  draw(r) {
    const S = SP, W = r.W, H = r.H;
    r.overlay(g => {
      dim(g, W, H, .82);
      E.font.title(g, 'THE HEADLINE', W / 2, 10, { scale: 2, align: 'center', colors: ['#fff6c8', '#e0a85a'], outline: '#1a0c10' });
      // the page in the typewriter
      const pw = 300, px0 = Math.round(W / 2 - pw / 2);
      E.ui.box(g, px0, 36, pw, 70, { bg: ['#f2ead6', '#e0d6b8'], border: '#6a5a3a', gradient: false });
      T(g, 'EMBER GOLD  -  CLIENT COPY  -  DRAFT 4', px0 + 8, 42, '#6a5a3a', { shadow: false });
      const typed = WORDS.slice(0, S.i).join(' ');
      E.font.wrap(typed, pw - 20, { scale: 2 }).forEach((l, i) => E.font.text(g, l, px0 + 10, 56 + i * 16, '#1a1410', { scale: 2, outline: false }));
      if (S.phase === 'play' && Math.floor(game.real * 3) % 2) px.rect(g, px0 + 10 + (E.font.wrap(typed, pw - 20, { scale: 2 }).slice(-1)[0] ? E.font.width(E.font.wrap(typed, pw - 20, { scale: 2 }).slice(-1)[0], { scale: 2 }) : 0) + 4, 56 + Math.max(0, E.font.wrap(typed, pw - 20, { scale: 2 }).length - 1) * 16, 6, 12, '#1a1410');
      // timer + prompt
      const tw = 300; E.ui.bar(g, W / 2 - tw / 2, 112, tw, 6, clamp(S.t / 13, 0, 1), S.t < 4 ? '#e8503a' : '#e8a838');
      if (S.phase === 'intro') { E.font.title(g, 'READY', W / 2, 128, { scale: 3, align: 'center', colors: ['#fff6c8', '#e07a2a'] }); T(g, 'PRESS THE ARROW SHOWN. WRONG KEYS COST TIME.', W / 2, 168, '#ffd36a', { align: 'center' }); }
      else if (S.i < S.seq.length) {
        const d = S.seq[S.i], pulse = 1 + S.flash * .1;
        E.ui.box(g, W / 2 - 30, 124, 60, 40, { bg: ['#3a2a1a', '#241810'], border: S.bad > 0 ? '#ff5a4a' : '#ffd36a' });
        E.font.text(g, ARROW[d], W / 2, 128, '#fff6c8', { align: 'center', scale: 4, outline: '#1a0c10' });
        T(g, 'NEXT WORD:  ' + WORDS[S.i], W / 2, 168, '#ffd36a', { align: 'center' });
      }
      const pads = sprintPads();
      for (const d of DIRS) { const p = pads[d]; E.ui.box(g, p[0], p[1], p[2], p[3], { bg: ['#2a2030', '#18121e'], border: S.phase === 'play' && S.seq[S.i] === d ? '#ffd36a' : '#5a5070' }); E.font.text(g, ARROW[d], p[0] + p[2] / 2, p[1] + 5, '#d8d0e8', { align: 'center', scale: 2, outline: false }); }
      T(g, 'COMBO ' + S.combo + '   MISSES ' + S.misses, W / 2, H - 10, '#8f86a8', { align: 'center' });
      if (S.phase === 'done') {
        E.ui.box(g, W / 2 - 80, 60, 160, 58, { bg: ['#1d1528', '#120c1c'], border: '#d8c8a0' });
        E.font.title(g, 'GRADE ' + S.grade, W / 2, 68, { scale: 2, align: 'center', colors: S.grade === 'C' ? ['#ffb0a0', '#d85a4a'] : ['#fff6c8', '#e0a85a'] });
        T(g, S.i >= S.seq.length ? 'FINISHED WITH ' + Math.max(0, S.t).toFixed(1) + 's SPARE' : 'TIME. ' + S.i + ' OF ' + S.seq.length + ' WORDS.', W / 2, 96, '#fdf6e6', { align: 'center' });
        T(g, 'THE SLIDE IS WORTH ' + (S.grade === 'C' ? 1 : S.grade === 'B' ? 2 : 3) + ' STARS', W / 2, 106, '#ffd36a', { align: 'center' });
      }
    });
  }
};

/* =====================================================================================================
   THE PITCH
   ===================================================================================================== */
let P = null;
M.P = null;
const tagOf = id => M.SLIDES[id].tag;
const powerOf = id => id === 'headline' ? M.S.headlinePower : M.SLIDES[id].p;
function draw3(pool, R) {
  const hand = [];
  while (hand.length < 3 && pool.length) hand.push(pool.splice(Math.floor(R() * pool.length), 1)[0]);
  return hand;
}
function newHand() {
  if (P.pool.length < 3) P.pool.push(...P.discard.splice(0));
  P.hand = draw3(P.pool, P.R); P.sel = 1 % Math.max(1, P.hand.length); P.fog = M.S.haze > 60 ? Math.floor(P.R() * P.hand.length) : -1;
}
M.startPitch = cid => {
  const S = M.S, c = M.CLIENTS[cid], R = M.rngFor('deal-' + cid);
  const late = cid === 'hollis' ? S.flags.late1 : S.flags.late2;
  P = { cid, c, R, round: 0, rounds: c.rounds, interest: c.start - (late ? 10 : 0), shown: c.start, target: c.target, pool: S.slides.slice(), discard: [], hand: [], sel: 1, phase: 'intro', t: 1.4, log: late ? 'You were late. The room has noticed.' : 'The client waits. The ice melts in someone else\'s glass.', lastTag: null, read: 0, face: null, history: [], hist: [], verdict: null, interrupted: false, lastDelta: 0, flyT: 0, played: null };
  M.P = P; M.mode = 'pitch'; newHand(); game.audio.music(M.songs.pitch, { fade: .4 });
  const npc = Object.values(M.worlds).flatMap(w => w.npcs || []).find(n => n.id === cid); P.rig = npc ? npc.rig : M.rigFor(cid);
};
const cardRects = () => {
  const W = game.W, H = game.H, n = P.hand.length, w = 118, gap = 10, tot = n * w + (n - 1) * gap, x0 = Math.round(W / 2 - tot / 2);
  return P.hand.map((_, i) => [x0 + i * (w + gap), H - 138 + (i === P.sel && P.phase === 'choose' ? -6 : 0), w, 108]);
};
function evaluate(id) {
  const S = M.S, tag = tagOf(id), p = powerOf(id), c = P.c;
  const loved = c.love.includes(tag), hated = c.hate.includes(tag);
  let d = p * 5 + (loved ? 11 : 0) - (hated ? 20 : 0) - (tag === P.lastTag ? 6 : 0);
  if (loved && p >= 3) d += 4;
  if (M.SLIDES[id].secret) d += 8;
  if (S.haze > 60) d = Math.round(d * .8);
  if (S.composure < 30) d -= 4;
  if (game.settings.difficulty === 'Brutal') d -= 3; else if (game.settings.difficulty === 'Gentle') d += 3;
  return { d, loved, hated, tag };
}
function play(i) {
  const id = P.hand[i], ev = evaluate(id); P.played = id; P.lastDelta = ev.d;
  P.interest = clamp(P.interest + ev.d, 0, 140);
  P.lastTag = ev.tag;
  const cat = ev.hated ? 'bad' : ev.d >= 26 ? 'great' : ev.d >= 15 || ev.loved ? 'good' : ev.d >= 6 ? 'meh' : 'bad';
  const lst = P.c.tells[cat]; P.log = lst[Math.floor(P.R() * lst.length)];
  P.face = cat === 'great' || cat === 'good' ? 'smile' : cat === 'bad' ? 'angry' : null; P.cat = cat;
  if (M.SLIDES[id].secret) { M.stat('heat', 1, 'HEAT', false); P.log += ' (You said too much about the farm.)'; }
  if (ev.loved) M.learn(P.cid + ':' + ev.tag + ':love'); if (ev.hated) M.learn(P.cid + ':' + ev.tag + ':hate');
  P.hist.push({ id, d: ev.d });
  P.discard.push(...P.hand.splice(i, 1)); P.discard.push(...P.hand.splice(0));
  game.audio.sfx('slide'); setTimeout(() => game.audio.sfx(cat === 'bad' ? 'hurt' : cat === 'great' ? 'sting_win' : cat === 'good' ? 'coin' : 'select'), 120);
  game.flash && cat === 'bad' && game.flash('#ff4030', .1, .25);
  P.phase = 'react'; P.t = 1.9; M.S.played++;
}
function readRoom() {
  const S = M.S;
  if (P.read >= 1) return M.toast('YOU HAVE ALREADY READ THIS ROOM', '#ff9a8a');
  if (S.cigs <= 0) return M.toast('NO CIGARETTES LEFT', '#ff9a8a');
  const unk = []; for (const t of P.c.love) if (!S.known[P.cid + ':' + t + ':love']) unk.push(P.cid + ':' + t + ':love'); for (const t of P.c.hate) if (!S.known[P.cid + ':' + t + ':hate']) unk.push(P.cid + ':' + t + ':hate');
  S.cigs--; P.read++; S.smokes++; M.stat('composure', 6, 'COMPOSURE', true); M.stat('haze', 3, 'HAZE', false); game.audio.sfx('lighter');
  game.particles.smoke(M.hero.x, M.hero.y, 30, 4, { size: 3 });
  if (unk.length) { M.learn(P.R() < .5 ? unk[0] : unk[unk.length - 1]); P.log = 'You light up and watch the room instead of the slide.'; } else P.log = 'You light up. Nothing in the room can surprise you now.';
}
function finishPitch() {
  const S = M.S, win = P.interest >= P.target, cid = P.cid;
  P.verdict = win; P.phase = 'verdict'; P.t = 0;
  S.pitches[cid] = { interest: Math.round(P.interest), win };
  if (cid === 'hollis') { S.flags.pitch1 = 1; S.flags.won1 = win ? 1 : 0; } else { S.flags.pitch2 = 1; S.flags.won2 = win ? 1 : 0; }
  M.stat('rep', win ? (cid === 'hollis' ? 12 : 22) : -6, 'REPUTATION', win);
  M.stat('composure', win ? 10 : -12, 'COMPOSURE', win);
  game.audio.sfx(win ? 'sting_win' : 'sting_lose');
}
M.modes.pitch = {
  update(dt) {
    const inp = game.input, S = M.S;
    P.shown += (P.interest - P.shown) * Math.min(1, dt * 5);
    if (P.phase === 'intro') { P.t -= dt; if (P.t <= 0) P.phase = 'choose'; return; }
    if (P.phase === 'choose') {
      if (inp.repeat('left')) { P.sel = (P.sel + P.hand.length - 1) % P.hand.length; game.audio.sfx('select'); }
      if (inp.repeat('right')) { P.sel = (P.sel + 1) % P.hand.length; game.audio.sfx('select'); }
      const rects = cardRects(), ptr = inp.pointer && inp.pointer(), c = inp.clicked();
      if (inp.lastDevice === 'mouse' && ptr) { const h = rects.findIndex(r => inRect(ptr, r)); if (h >= 0 && h !== P.sel) { P.sel = h; game.audio.sfx('select'); } }
      if (inp.pressed('skill')) readRoom();
      let choose = inp.pressed('confirm');
      if (c) { const h = rects.findIndex(r => inRect(c, r)); if (h >= 0) { P.sel = h; choose = true; } }
      if (S.demo) { // the demo cheats: it knows the client
        const best = P.hand.map((id, i) => ({ i, d: evaluate(id).d })).sort((a, b) => b.d - a.d)[0]; P.sel = best.i;
        P.demoT = (P.demoT || 0) + dt; if (P.demoT > 1.4) { P.demoT = 0; choose = true; if (P.read < 1 && S.cigs > 0 && P.round === 0) readRoom(); }
      }
      if (choose) play(P.sel);
    } else if (P.phase === 'react') {
      P.t -= dt;
      if (P.t <= 0 || (inp.pressed('confirm') && P.t < 1.2) || (S.demo && P.t < 1)) {
        P.round++; P.face = null;
        if (P.round >= P.rounds) finishPitch();
        else {
          newHand(); P.phase = 'choose'; P.log = 'Slide ' + (P.round + 1) + ' of ' + P.rounds + '. ' + (P.interest < P.target * .5 ? 'You are behind.' : 'You are in the running.');
          if (P.cid === 'teague' && P.round === 2 && !P.interrupted) { P.interrupted = true; M.run(M.T.percyInterrupt()); }
        }
      }
    } else if (P.phase === 'verdict') {
      P.t += dt;
      if (P.t > 1 && (inp.pressed('confirm') || inp.clicked() || (S.demo && P.t > 2.8))) {
        const cid = P.cid, win = P.verdict; M.mode = 'world'; M.P = null; game.audio.music(M.songs[M.W().music], { fade: .5 });
        if (cid === 'hollis') M.run(M.T.hollisAfter(win), () => { M.S.clock = Math.max(M.S.clock, 13 * 60 + 40); });
        else M.run(M.T.teagueAfter(win), () => { M.S.clock = Math.max(M.S.clock, 16 * 60 + 20); M.toast('YOUR PHONE IS RINGING', '#ffd36a'); });
      }
    }
  },
  draw(r) {
    const W = r.W, H = r.H, c = P.c;
    r.overlay(g => {
      dim(g, W, H, .86);
      // client
      E.ui.box(g, 8, 8, 62, 62, { bg: ['#2a1c28', '#1a1020'], border: '#d8c8a0' });
      P.rig.update(0, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, expr: P.face === 'smile' ? 'smile' : P.face === 'angry' ? 'angry' : undefined });
      P.rig._talk = P.phase === 'react'; P.rig.drawPortrait(g, 11, 11, 56, { zoom: 3, bg: '#2a1c28' }); P.rig._talk = false;
      T(g, c.name.toUpperCase(), 78, 10, '#ffd36a'); T(g, c.firm.toUpperCase(), 78, 20, '#c8c0d8');
      // interest bar with the line to beat
      const bx = 78, bw = Math.min(260, W - 100 - 78), by = 33, maxv = Math.max(140, c.target + 20);
      px.rect(g, bx - 1, by - 1, bw + 2, 10, '#05040a');
      E.ui.bar(g, bx, by, bw, 8, clamp(P.shown / maxv, 0, 1), P.shown >= P.target ? '#6ae07a' : P.shown > c.target * .6 ? '#e8c050' : '#e8603a');
      const tx = bx + Math.round(bw * c.target / maxv); px.rect(g, tx, by - 4, 2, 16, '#ffffff');
      T(g, 'INTEREST ' + Math.round(P.shown) + '  /  NEEDED ' + c.target, bx, by + 13, '#fdf6e6');
      T(g, 'SLIDE ' + Math.min(P.round + 1, P.rounds) + ' OF ' + P.rounds, W - 8, 10, '#c8c0d8', { align: 'right' });
      // what we know
      const S = M.S; const nm = (t, k) => S.known[P.cid + ':' + t + ':' + k] ? M.TAGS[t].n.toUpperCase() : '???';
      T(g, 'LIKES', 8, 78, '#9ee89a'); T(g, c.love.map(t => nm(t, 'love')).join('  '), 46, 78, '#fdf6e6');
      T(g, 'DISLIKES', 170, 78, '#ff9a8a'); T(g, c.hate.map(t => nm(t, 'hate')).join('  '), 220, 78, '#fdf6e6');
      // the tell
      E.ui.box(g, 8, 90, W - 16, 30, { bg: ['#241a30', '#150f20'], border: '#6a5a8a', alpha: .9 });
      E.font.wrap(P.log, W - 40).slice(0, 3).forEach((l, i) => T(g, l, 16, 95 + i * 9, '#fdf6e6'));
      if (P.phase === 'react' || P.phase === 'verdict') { const d = P.lastDelta; if (P.phase === 'react') T(g, (d >= 0 ? '+' : '') + d, W - 18, 96, d >= 0 ? '#9ee89a' : '#ff9a8a', { align: 'right', scale: 2 }); }
      if (P.phase === 'choose' || P.phase === 'intro') {
        const rects = cardRects();
        P.hand.forEach((id, i) => {
          const s = M.SLIDES[id], t = M.TAGS[s.tag], R = rects[i], sel = i === P.sel, fog = i === P.fog;
          E.ui.box(g, R[0], R[1], R[2], R[3], { bg: sel ? ['#4a3a2a', '#2e2218'] : ['#2a2030', '#18121e'], border: sel ? '#ffd36a' : '#5a5070' });
          px.rect(g, R[0] + 3, R[1] + 3, R[2] - 6, 12, fog ? '#6a6a6a' : t.c);
          T(g, fog ? '? ? ?' : t.n.toUpperCase(), R[0] + R[2] / 2, R[1] + 5, '#10080c', { align: 'center', shadow: false });
          T(g, s.t, R[0] + R[2] / 2, R[1] + 20, '#fdf6e6', { align: 'center' });
          T(g, '★'.repeat(powerOf(id)) + '☆'.repeat(3 - powerOf(id)), R[0] + R[2] / 2, R[1] + 31, '#ffd36a', { align: 'center' });
          const b = fog ? 'The words swim. You cannot quite read your own slide.' : s.b;
          E.font.wrap(b, R[2] - 12).slice(0, 5).forEach((l, k) => T(g, l, R[0] + 6, R[1] + 44 + k * 9, '#c8c0d8'));
        });
        T(g, M.label('left') + ' ' + M.label('right') + ' CHOOSE   ' + M.label('confirm') + ' PRESENT   ' + M.label('skill') + ' READ THE ROOM (' + M.S.cigs + ' CIG)', W / 2, H - 14, '#ffd36a', { align: 'center' });
      }
      if (P.phase === 'verdict') {
        const win = P.verdict;
        E.ui.box(g, W / 2 - 110, 130, 220, 80, { bg: ['#1d1528', '#120c1c'], border: win ? '#6ae07a' : '#e8603a' });
        E.font.title(g, win ? 'SIGNED' : 'PASSED', W / 2, 138, { scale: 3, align: 'center', colors: win ? ['#d8ffd0', '#6ae07a'] : ['#ffd0c0', '#e8603a'] });
        T(g, 'INTEREST ' + Math.round(P.interest) + ' OF ' + P.target, W / 2, 168, '#fdf6e6', { align: 'center' });
        T(g, win ? 'THE ACCOUNT IS YOURS.' : 'NOT TODAY. THE DAY GOES ON.', W / 2, 180, '#c8c0d8', { align: 'center' });
        if (P.t > 1) T(g, M.label('confirm') + ' CONTINUE', W / 2, 196, '#ffd36a', { align: 'center' });
      }
    });
  }
};
M.T.teagueAfter = win => win ? [
  ['teague', 'You did not try to impress me. Do you know how rare that is? Draw up the papers, Mr. Whitman.'],
  ['percy', 'Congratulations. I will have the contracts typed by morning.'],
  ['narrator', 'Percy shakes your hand like it is a piece of evidence.']
] : [
  ['teague', 'I think I will keep my current agency. They have a slogan I do not understand, and I like that in a slogan.'],
  ['narrator', 'The door closes with a polite click. Somewhere a clock agrees with him.']
];

/* =====================================================================================================
   THE END OF THE DAY
   ===================================================================================================== */
let END = null, endMenu = null;
M.endDay = () => {
  const S = M.S; init(); const won = (S.flags.won1 ? 1 : 0) + (S.flags.won2 ? 1 : 0);
  const e = M.endings(S);
  const score = Math.max(0, S.rep * 10 + won * 400 + Math.round((100 - S.haze) * 1) + S.composure + Math.max(0, (9 - S.heat) * 12) + (S.flags.margie_credit ? 40 : 0) + (S.flags.archie_helped ? 30 : 0));
  S.ended = e; END = { e, score, t: 0, shown: 0 }; S.score = score; M.mode = 'ending'; game.audio.music(M.songs.ending, { fade: .8 });
  endMenu = null;
  if (M.hubResult) M.hubResult(score, e);
};
function init() { if (!M.worlds.office) M.init(); }
M.modes.ending = {
  update(dt) {
    END.t += dt; const lines = END.e.lines.length;
    if (!endMenu && END.t > 3 + lines * 2.2) {
      if (M.S.demo) { if (END.t > 12 + lines * 2.2 && M.demoDone) M.demoDone(); return; }
      if (M.HUB) return;
      endMenu = new E.Menu(game, ['PLAY AGAIN', 'ABOUT AND CREDITS', 'BACK TO TITLE'], { x: 'center', y: game.H - 62, onPick: i => {
        if (i === 0) { game.go('play', { fresh: true }); } else if (i === 1) game.go('about', { back: 'title' }); else game.go('title');
      } });
    }
    if (endMenu) endMenu.update(dt);
    if (M.S.demo && END.t > 3 + lines * 2.2 + 4 && M.demoDone) M.demoDone();
  },
  draw(r) {
    const W = r.W, H = r.H, e = END.e, S = M.S;
    r.overlay(g => {
      dim(g, W, H, .93);
      E.font.title(g, e.title, W / 2, 14, { scale: 2, align: 'center', colors: ['#fff6c8', '#e0a85a'], outline: '#1a0c10', depth: 2, depthColor: '#6a3a1a' });
      const shown = Math.floor(END.t / 2.2);
      e.lines.forEach((l, i) => { if (i <= shown) { const a = clamp((END.t - i * 2.2) / 1.2, 0, 1); px.blend(g, a, 'normal', () => E.font.wrap(l, W - 80).forEach((ll, k) => T(g, ll, W / 2, 46 + i * 24 + k * 9, '#fdf6e6', { align: 'center' }))); } });
      if (END.t > 3 + e.lines.length * 2.2 - 2) {
        const y = 128, won = (S.flags.won1 ? 1 : 0) + (S.flags.won2 ? 1 : 0);
        E.ui.box(g, W / 2 - 150, y, 300, 56, { bg: ['#1d1528', '#120c1c'], border: '#d8c8a0', alpha: .9 });
        T(g, 'ACCOUNTS WON  ' + won + ' OF 2', W / 2 - 140, y + 6, '#9ee89a');
        T(g, 'REPUTATION ' + S.rep + '   COMPOSURE ' + Math.round(S.composure) + '   HAZE ' + Math.round(S.haze), W / 2 - 140, y + 16, '#fdf6e6');
        T(g, 'HEAT ' + S.heat + '   CIGARETTES SMOKED ' + S.smokes + '   DRINKS ' + S.drinks, W / 2 - 140, y + 26, '#c8c0d8');
        E.font.title(g, 'SCORE ' + END.score, W / 2, y + 38, { scale: 1, align: 'center', colors: ['#fff6c8', '#e0a85a'] });
      }
      if (endMenu) endMenu.draw(r);
      else if (M.HUB && END.t > 4) T(g, 'ROUND REPORTED. WAITING FOR THE OTHER PLAYERS...', W / 2, H - 20, '#ffd36a', { align: 'center' });
    });
  }
};
})();
