/* ---- THE LOOK: the sound (every voice and song is written in code), the booth's talk, the rink's props, the skaters'
 * sticks, the nets, the puck, the crowd, and the HUD (the score bug, the BOOM meters, the banner, the fight, the box). ---- */
const PUCK_SPR = E.sprite(['.kkk.', 'kkkkk', 'kkkkk', '.kkk.'], { k: '#16161e' });
for (const [name, wave, f] of BABBLE) A.define(name, { wave, freq: f, to: f * .7, dur: .06, vol: .1 });
A.define('wrist', { wave: 'noise', freq: 1200, to: 300, dur: .08, vol: .3, filter: 'lowpass' });
A.define('slap', { wave: 'noise', freq: 800, to: 150, dur: .18, vol: .45, filter: 'lowpass' });
A.define('thump', { wave: 'sine', freq: 120, to: 60, dur: .1, vol: .3 });
A.define('hit', { wave: 'noise', freq: 420, to: 120, dur: .22, vol: .5, filter: 'lowpass' });
A.define('glass', { wave: 'noise', freq: 4200, to: 1400, dur: .5, vol: .32, filter: 'lowpass' });
A.define('save', { wave: 'square', freq: 520, to: 300, dur: .15, vol: .25 });
A.define('post', { wave: 'triangle', freq: 1400, to: 1100, dur: .3, vol: .25 });
A.define('whistle', { wave: 'square', freq: 2200, vib: [30, .05], dur: .32, vol: .14 });
A.define('horn', { wave: 'square', freq: 196, to: 180, vib: [6, .08], dur: 1.4, vol: .28 });
A.define('kick', { wave: 'noise', freq: 900, to: 200, dur: .07, vol: .3 });
A.define('select', { wave: 'square', freq: 660, dur: .05, vol: .12 });
A.define('cancel', { wave: 'square', freq: 300, dur: .08, vol: .1 });
A.define('blip', { wave: 'square', freq: 880, dur: .04, vol: .08 });
const SONG_MATCH = { bpm: 156, steps: 4, tracks: [
  { wave: 'square', vol: .07, notes: 'A4 . C5 . E5 . A5 . | G5 . E5 . D5 . C5 . | F5 . A5 . C6 . A5 . | G5 - - . . . . .' },
  { wave: 'triangle', vol: .28, notes: 'A2 . E2 . A2 . E2 . | F2 . C3 . F2 . C3 . | D2 . A2 . D2 . A2 . | E2 . B2 . E2 . B2 .' },
  { wave: 'drums', vol: .1, notes: 'k . h . s . h k | k . h . s h h .' }] };
const SONG_ATTRACT = SONG_MATCH;

/** the booth: its voice, its one line at a time, the subtitles at the bottom where the touch buttons aren't */
const talk = new E.Dialog(game, { lines: 2, place: 'bottom', border: '#e8c070', voice: 'babbleA', speed: 32 });
function talkSay(text, o) { talk.say(text, Object.assign({ name: 'THE BOOTH', auto: 2.6, modal: false, alpha: .85 }, o || {})); }

/** the skater's stick: its shaft from the hand to the blade, with the tape, drawn over the body in the view */
function drawStick(g, ox, oy, sk, r) {
  const [x0, y0] = r.w(sk.x, sk.y, 0), bx = sk.x + Math.cos(sk.face) * 11, by = sk.y + Math.sin(sk.face) * 11;
  const [x1, y1] = r.w(bx, by, 0), [hx, hy] = r.w(sk.x + Math.cos(sk.face) * 3, sk.y + Math.sin(sk.face) * 3, 9);
  const dx = x1 - x0, dy = y1 - y0;
  px.line(g, Math.round(ox + hx - x0), Math.round(oy + hy - y0), Math.round(ox + dx), Math.round(oy + dy), '#c8a070', 1);
  px.line(g, Math.round(ox + dx - 1), Math.round(oy + dy), Math.round(ox + dx + 2), Math.round(oy + dy), '#1a1a1e', 2);
  px.rect(g, Math.round(ox + dx), Math.round(oy + dy - 1), 1, 1, '#f4f4f0');
}
/** the net: a translucent mesh with its posts and crossbar, drawn at the goal */
function drawNet(g, r, k) {
  const x0 = k === 0 ? 156 : 946, x1 = k === 0 ? 174 : 964, lines = [];
  for (let y = 378; y <= 422; y += 4) { lines.push([x0, y, 0, x1, y, 0]); lines.push([x0, y, 20, x1, y, 20]); }
  for (let x = x0; x <= x1; x += 4) lines.push([x, 378, 0, x, 378, 20], [x, 422, 0, x, 422, 20]);
  for (const [ax, ay, az, bx, by, bz] of lines) {
    const [p1, q1] = r.w(ax, ay, az), [p2, q2] = r.w(bx, by, bz);
    px.line(g, Math.round(p1), Math.round(q1), Math.round(p2), Math.round(q2), 'rgba(240,244,255,.35)', 1);
  }
  for (const y of [384, 416]) { const [p1, q1] = r.w(GX[k], y, 0), [p2, q2] = r.w(GX[k], y, 20); px.line(g, Math.round(p1), Math.round(q1), Math.round(p2), Math.round(q2), '#f4f4f0', 2); }
  const [p1, q1] = r.w(GX[k], 384, 20), [p2, q2] = r.w(GX[k], 416, 20); px.line(g, Math.round(p1), Math.round(q1), Math.round(p2), Math.round(q2), '#f4f4f0', 2);
}
/** the crowd: little figures in the stands around the boards, in the arena's colors, bobbing (red lights and cheers on goals) */
const CROWD = [];
for (let i = 0; i < 240; i++) {
  const side = i % 4, u = (E.hash2(i, 9) * 1000 | 0) / 1000, h = E.hash2(i, 3);
  let x, y;
  if (side === 0) { x = 120 + u * 880; y = 150 - h * 10; } else if (side === 1) { x = 120 + u * 880; y = 650 + h * 10; }
  else if (side === 2) { x = 80 - h * 10; y = 220 + u * 360; } else { x = 1040 + h * 10; y = 220 + u * 360; }
  CROWD.push({ x, y, ph: h * 9, shirt: null, skin: ['#e0b090', '#a87050', '#6a4028', '#f0c8a8'][(h * 40 | 0) % 4], i });
}
/** the rink's look for the frame: the crowd, the nets, the goal lights in the arena's color */
function drawRinkProps(r) {
  const a = M.arena;
  for (const f of CROWD) {
    const cols = a.crowd, shirt = cols[f.i % cols.length], cheer = M.phase === 'goal' && M.goals.length ? Math.abs(Math.sin(M.tick * .12 + f.ph)) * 4 * (M.goals[M.goals.length - 1].t === (f.i % 2) ? 1 : .5) : Math.sin(M.tick * .03 + f.ph) * .5;
    const wave = M.waveT > 0 ? Math.max(0, Math.sin(f.x * .02 - M.waveT * 6)) * 5 : 0;
    if (wave > 3 && f.i % 37 === 0) r.textAt(f.x, f.y, 16 + wave, CROWD_SIGNS[f.i % CROWD_SIGNS.length], '#fffbe8', { align: 'center' });   // (a sign, held up in the wave)
    r.queue(f.x, f.y, 4 + cheer * 0, g => { const [x, y] = r.w(f.x, f.y, 6 + cheer + wave), X = Math.round(x), Y = Math.round(y); px.rect(g, X - 2, Y - 5, 4, 5, shirt); px.rect(g, X - 1, Y - 8, 3, 3, f.skin); });
  }
  for (let k = 0; k < 2; k++) r.queue(k === 0 ? 166 : 954, CY, 0, g => drawNet(g, r, k), { bias: 1 });
  if (a.snow) {
    M.snow = M.snow || [];
    for (let i = M.snow.length; i < 60; i++) M.snow.push({ x: 128 + E.hash2(i, 11) * 880, y: 208 + E.hash2(i, 12) * 384, z: E.hash2(i, 13) * 60, s: .6 + E.hash2(i, 14) * .6 });
  }
}
/** the frame: the rink, the crowd, the skaters and goalies, the puck, the HUD over all of it */
function drawMatch(r) {
  if (!M) return;
  const view = E.charView(r.view);
  M.map.drawFloor(r); M.map.queueWalls(r);
  drawRinkProps(r);
  drawItems(r, view);
  if (M.bubble && M.bubble.t > 0) r.textAt(M.bubble.sk.x, M.bubble.sk.y, 36, M.bubble.text, '#fffbe8', { align: 'center' });
  for (const g of M.goalies) {
    r.shadow(g.x, g.y, 7, .35);
    r.actor(g.x, g.y, 0, (gg, ox, oy) => g.rig.draw(gg, ox, oy, view));
  }
  for (const sk of M.skaters) {
    if (sk.state === 'bin') { r.actor(sk.x, sk.y, 0, (gg, ox, oy) => sk.rig.draw(gg, ox, oy, view)); continue; }
    r.shadow(sk.x, sk.y, 6, .35);
    r.actor(sk.x, sk.y, 0, (gg, ox, oy) => { sk.rig.draw(gg, ox, oy, view); if (sk.state !== 'down') drawStick(gg, ox, oy, sk, r); });
    if (sk.human) r.queue(sk.x, sk.y, 40, g => { const [x, y] = r.w(sk.x, sk.y, 40), c = E.PLAYER_COLORS[sk.human.i] || '#ffe08a'; px.poly(g, [[x - 3, y - 4], [x + 3, y - 4], [x, y]], c); }, { emissive: true });
  }
  const pk = M.puck;
  r.shadow(pk.x, pk.y, 2.2, .45);
  r.sprite(pk.x, pk.y, pk.z + 1, PUCK_SPR, { anchor: 'center' });
  const gilded = M.cfg.chapter === STORY.length - 1, goldFor = t => gilded && t === 1;   // (Gilded Mode: the final's rival, in gold)
  if (pk.shot && pk.shot.kab && M.tick % 3 === 0) P.sparks(pk.x, pk.y, pk.z + 2, 3, null, { color: goldFor(pk.shot.by) ? '#ffd24a' : '#ff8a3a', speed: 30 });
  for (let t = 0; t < 2; t++) if (M.kab[t] > 0 && M.tick % 6 === 0) for (const sk of M.skaters) if (sk.t === t && live(sk)) P.sparks(sk.x, sk.y, 2, 2, null, { color: goldFor(t) ? '#ffd24a' : '#ff8a3a', speed: 20 });
  if (M.snow && M.arena.snow) for (const s of M.snow) { s.y += s.s * .3; s.x += Math.sin(M.tick * .01 + s.z) * .2; if (s.y > 600) s.y = 208; }
  r.overlay(g => hud(g, r));
  if (M.snow && M.arena.snow) r.overlay(g => { for (const s of M.snow) { const [x, y] = r.w(s.x, s.y, s.z); px.rect(g, Math.round(x), Math.round(y), 1, 1, '#ffffff'); } });
  talk.draw(r);
}
/** the score bug, the BOOM meters, the clock, the box, the banners, the fight */
function hud(g, r) {
  const a = M.teams[0], b = M.teams[1], W = r.W;
  E.ui.box(g, 4, 4, 150, 30, { bg: '#141826', border: '#6a7090', alpha: .85 });
  px.rect(g, 9, 9, 6, 6, TEAMS[M.cfg.teams[0]].chip); px.rect(g, 9, 21, 6, 6, TEAMS[M.cfg.teams[1]].chip);
  E.font.text(g, a.def.name, 18, 8, '#f0ecdc', { font: 'tiny', outline: false });
  E.font.text(g, b.def.name, 18, 20, '#f0ecdc', { font: 'tiny', outline: false });
  E.font.text(g, String(M.score[0]), 136, 8, '#ffe08a', { font: 'normal', outline: false, align: 'right' });
  E.font.text(g, String(M.score[1]), 136, 20, '#ffe08a', { font: 'normal', outline: false, align: 'right' });
  const clk = M.ot ? 'OT ' + mmss(M.clock) : (M.drill ? 'DRILL ' + mmss(Math.max(0, M.drill.limit - (M.drill.t || 0))) : 'P' + M.period + ' ' + mmss(M.clock));
  E.font.text(g, clk, W - 6, 8, '#c8d0e8', { font: 'tiny', align: 'right', outline: '#000' });
  // the BOOM meters: a bar under each team's chip, lit at full (press KABOOM)
  for (let t = 0; t < 2; t++) {
    const y = 38, x = 4 + t * 76;
    E.ui.bar(g, x, y, 72, 4, M.boom[t] / 100, M.boom[t] >= 100 ? '#ffb347' : M.teams[t].def.trim || '#f2c14e');
    if (M.kab[t] > 0) E.font.text(g, 'KABOOM ' + Math.ceil(M.kab[t]), x, y + 6, '#ff8a3a', { font: 'tiny', outline: '#000' });
  }
  // the box: the penalised skaters' clock, a side at a time
  let yy = 56;
  for (const sk of M.skaters) if (sk.state === 'bin') { E.font.text(g, 'BOX ' + sk.name + ' ' + Math.ceil(sk.st), 4, yy, '#ffb0a0', { font: 'tiny', outline: '#000' }); yy += 8; }
  if (M.phase === 'fight' && M.fight) {
    const f = M.fight;
    E.ui.box(g, W / 2 - 130, 34, 260, 46, { bg: '#2a0c10', border: '#ff7a5a', alpha: .92 });
    E.font.title(g, 'FIGHT!', W / 2, 36, { align: 'center', scale: 2, colors: ['#ffe0e0', '#ff7a6a', '#c8202a'] });
    const bar = (x, y, name, F, col) => { E.font.text(g, name, x, y, '#f0ecdc', { font: 'tiny', outline: '#000' }); E.ui.bar(g, x, y + 6, 110, 4, Math.max(0, F.bal) / 100, col); E.ui.bar(g, x, y + 12, 110, 2, Math.max(0, F.stam) / 100, '#7ad0ff'); };
    bar(W / 2 - 124, 58, f.a.name, f.A, '#e8443a'); bar(W / 2 + 14, 58, f.b.name, f.B, '#3b82f6');
    E.font.text(g, 'MOVES: ' + (f.A.act ? f.A.act.name : '-') + ' / ' + (f.B.act ? f.B.act.name : '-') + '   ' + Math.max(0, Math.ceil(20 - f.t)) + 's', W / 2, 82, '#ffe7a8', { align: 'center', font: 'tiny', outline: '#000' });
    E.font.text(g, prompt('pass', 'JAB') + '  ' + prompt('shoot', 'HAYMAKER') + '  ' + prompt('deke', 'DUCK') + '  ' + prompt('lob', 'YANK'), W / 2, 92, '#c8d0e8', { align: 'center', font: 'tiny', outline: '#000' });
    if (f.last) E.font.text(g, f.last.toUpperCase(), W / 2, 102, '#c8d0e8', { align: 'center', font: 'tiny', outline: '#000' });
  }
  if (M.skaters.some(sk => sk.state === 'bin')) E.font.title(g, 'POWER PLAY', W - 8, 40, { align: 'right', scale: 1, colors: ['#fffbe8', '#ffe08a'] });
  if (M.replay) E.font.title(g, 'REPLAY', W - 8, r.H - 40, { align: 'right', scale: 1, colors: ['#fffbe8', '#ffe08a'] });
  if (M.bannerT > 0 && M.banner) E.font.title(g, M.banner, W / 2, r.H * .3, { align: 'center', scale: 3, colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'] });
  if (M.phase === 'faceoff') E.font.text(g, 'FACEOFF', W / 2, r.H * .42, '#ffe7a8', { align: 'center', scale: 2, shadow: '#000', outline: false });
  // the prompts of the device used last, bottom left (out of the subtitles' and the touch buttons' way)
  const pl = M.humans[0];
  if (pl && M.phase === 'play') {
    const lines = [prompt('pass', pl.sk && M.puck.owner === pl.sk ? 'Pass' : 'Switch'), prompt('shoot', M.puck.owner === pl.sk ? 'Hold: slapshot' : 'Check'), prompt('lob', 'Saucer / gloves')];
    lines.forEach((s, i) => E.font.text(g, s, 4, r.H - 48 - i * 8, '#c8d0e8', { font: 'tiny', outline: '#000' }));
  }
}
