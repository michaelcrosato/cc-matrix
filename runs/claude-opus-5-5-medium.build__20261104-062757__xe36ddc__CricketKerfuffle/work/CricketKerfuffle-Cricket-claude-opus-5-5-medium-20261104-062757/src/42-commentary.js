// ---- the commentary box (5.12): Sir Aubrey, Dazza and, for reviews, Prof. Priya. The director listens on the bus,
// picks at most one exchange a ball from the pools (no repeat within 20 balls), and shows it as a caption with the
// speaker's live portrait while the gibberish voice speaks it. The same listeners drive the crowd, the stings and
// the big centre callouts.
const COMM = { m: null, queue: [], cur: null, recent: [], lines: [], ballLine: false, filler: -1 };
const PORTRAITS = {};
function portraitRig(who) {
  if (PORTRAITS[who]) return PORTRAITS[who];
  const L = {
    aubrey: { build: 'heroic', hair: 'short', hat: { style: 'band', color: '#e8d8a0' }, face: { moustache: 'walrus' }, colors: { hair: '#c8c8c8', skin: '#f0c8a8', cloth: '#7a2a3a', trim: '#e8c060' } },
    dazza: { build: 'heroic', hair: 'spiky', hat: { style: 'cap', color: '#1fb5a8' }, colors: { hair: '#e8c070', skin: '#e89070', cloth: '#ffd23a' } },
    priya: { build: 'heroic', hair: 'short', face: { glasses: true }, colors: { hair: '#1a1a22', skin: '#b07a50', cloth: '#3a3a6a' } },
    edie: TEAM.ker.stars[0].look, basil: TEAM.ker.stars[3].look, dev: Object.assign({}, TEAM.ker.stars[1].look, { face: { glasses: true } }), pip: TEAM.ker.stars[2].look,
    crumb: { build: 'chibi', hair: 'long', outfit: 'robe', colors: { hair: '#c8c8d0', skin: '#f0c8a8', cloth: '#d87a9a', trim: '#f4f4f0' } },
    hollis: { build: 'heroic', hair: 'short', outfit: 'coat', face: { glasses: true }, colors: { hair: '#d8d8d8', coat: '#f4f4ee', cloth: '#1a1a1a', trim: '#f4f4f4' } },
    thrumpton: Object.assign({}, TEAM.thr.stars[0].look, { outfit: 'coat', colors: Object.assign({ coat: '#6a5a3a', cloth: '#4a3a2a' }, TEAM.thr.stars[0].look.colors) }),
    ghost: TEAM.thr.stars[2].look, machine: { build: 'bulky', hair: 'bald', hat: 'helmet', colors: { skin: '#c89a40', cloth: '#8a6a2a', hat: '#c89a40' } },
    gaz: TEAM.mud.stars[0].look, peregrine: TEAM.gen.stars[0].look, shazza: TEAM.lar.stars[0].look, spinaldo: TEAM.mag.stars[0].look, fortescue: TEAM.gen.stars[1].look, kev: TEAM.lar.stars[1].look
  }[who] || { build: 'heroic' };
  const o = Object.assign({ size: 1.2, weapon: null }, L, { face: Object.assign({}, L.face || {}, L.moustache ? { moustache: L.moustache } : {}, L.beard ? { beard: true } : {}, L.glasses ? { glasses: true } : {}) });
  if (who === 'ghost') o.eyeGlow = '#a8e0ff';
  return (PORTRAITS[who] = new E.Humanoid(o));
}
function commReset(m) { COMM.m = m; COMM.queue = []; COMM.cur = null; COMM.recent = []; COMM.filler = -1; }
function commVars(m, extra = {}) {
  if (!m || !m.I) return extra;
  const I = m.I, c = m.striker(), bp = m.bowlerP();
  return Object.assign({ batter: c ? c.p.short : '', bowler: bp ? bp.short : '', team: m.teams[I.bat].name, opp: m.teams[1 - I.bat].name, ground: m.g.name, score: m.scoreStr(), runs: '', need: m.need() || 0, balls: m.ballsLeft(), kmh: m.delInfo ? m.delInfo.kmh : '', item: '', fielder: m.catcher ? m.catcher.p.short : 'the fielder', winner: m.result && m.result.winner !== null && m.result.winner !== undefined ? m.teams[m.result.winner].name : 'nobody' }, extra);
}
function commSay(pool, vars, o = {}) {
  const m = COMM.m; if (!m || !m.I || !LINES[pool] || DEV.toggles.muteComm) return false;
  if (!o.force && T('commentaryRate') < 1 && RNG.cosmetic() > T('commentaryRate')) return false;
  const list = LINES[pool], fresh = list.filter(l => !COMM.recent.some(r => r.l === l && m.ballNo - r.n < 20));
  const pickL = (fresh.length ? fresh : list)[Math.floor(RNG.cosmetic() * (fresh.length || list.length))];
  COMM.recent.push({ l: pickL, n: m.ballNo }); if (COMM.recent.length > 60) COMM.recent.shift();
  const text = fmt(pickL[1], vars);
  if (o.urgent) COMM.queue = [];
  COMM.queue.push({ who: pickL[0], text, t: 0, dur: Math.max(2.4, Math.min(4.2, text.length * .055)) });
  COMM.lines.push(VOICES[pickL[0]].name + ': ' + text); if (COMM.lines.length > 10) COMM.lines.shift();
  if (COMM.queue.length > 2) COMM.queue.splice(1, COMM.queue.length - 2);
  return true;
}
function commStep(dt) {
  const m = COMM.m, quiet = m && (m.state === 'runup' || m.state === 'flight');
  if (quiet && COMM.cur && COMM.cur.t > 1.2) COMM.cur = null;
  if (!COMM.cur && COMM.queue.length && !quiet) { COMM.cur = COMM.queue.shift(); if (S('voices')) say(COMM.cur.text, COMM.cur.who); }
  if (COMM.cur) { COMM.cur.t += dt; if (COMM.cur.t > COMM.cur.dur) COMM.cur = null; }
}
function drawCaption(g, r, y) {
  const c = COMM.cur; if (!c || !S('captions')) return;
  const V_ = VOICES[c.who], w = Math.min(300, r.W - 20), x = Math.round((r.W - w) / 2), lines = E.font.wrap(c.text, w - 50).slice(0, 3), h = Math.max(36, 14 + lines.length * 9);
  panel(g, x, y - h, w, h, { alpha: .82, rule: V_.color });
  const rig = portraitRig(c.who); rig._talk = c.t < c.dur - .6; rig.update(1 / 60, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, expr: c.who === 'thrumpton' ? 'angry' : null });
  rig.drawPortrait(g, x + 4, y - h + 3, 30, { zoom: 3, turn: .4, bg: '#1a1430', frame: V_.color });
  E.font.text(g, V_.name, x + 40, y - h + 4, V_.color, { shadow: '#000' });
  const shown = Math.floor(c.t * 45);
  let left = shown;
  lines.forEach((l, k) => { const s = l.slice(0, Math.max(0, left)); left -= l.length; E.font.text(g, s, x + 40, y - h + 14 + k * 9, '#f4f0e0', { shadow: '#000' }); });
}
// ---- callouts: the big centre words (FOUR!, SIX! MAXIMUM!, WICKET!, FREE HIT, ON FIRE!, KERFUFFLE BONUS +10, PERFECT)
const CALL = { list: [] };
function callout(text, color = '#ffd23a', dur = 1.1, o = {}) { CALL.list.push(Object.assign({ text, color, t: 0, dur }, o)); if (CALL.list.length > 3) CALL.list.shift(); }
function slowmo(k, dur) { WORLD.slowK = k; WORLD.slowT = dur; }
function shake(n) { if (game && game.shake) game.shake(n); }
function flash(c, s) { if (game && game.flash) game.flash(c, s); }
// ---- the listeners (one set, for every match)
let listenersOn = false;
function presentationListeners() {
  if (listenersOn) return; listenersOn = true;
  const M_ = () => COMM.m, hub = () => COMM.m && COMM.m.cfg.mode === 'hub';
  on('ball:released', d => { sfx('throwWhoosh', { vol: .5 }); const m = M_(); if (m && m.delInfo && m.delInfo.special) callout(upper(m.delInfo.name), '#7ae0ff', 1.2, { small: true }); });
  on('ball:pitched', () => sfx('pitchThud'));
  on('bat:press', d => { if (S('timing') && d.grade && d.grade !== 'MISS') {} });
  on('bat:contact', d => {
    const m = M_(); sfx(d.grade === 'PERFECT' ? 'batSweet' : d.kind !== 'clean' ? 'edge' : 'bat');
    if (S('timing') && d.kind === 'clean') callout(d.grade, d.grade === 'PERFECT' ? '#ffd23a' : d.grade === 'GOOD' ? '#7ae07a' : '#ff9a6a', .6, { small: true, timing: true });
    if (d.grade === 'PERFECT' && m) game.particles.bits(OX + m.batters[0].x, OY + m.batters[0].y, 16, 6, ['#ecd9a0', '#c8a860', '#fff4d8']);
    if (d.grade === 'PERFECT') { game.freeze(.05); shake(1); }
    if (d.special) callout(upper(SPECIALS[d.special].name), '#ff9a3a', 1.2);
    CROWD.excite = Math.min(1, CROWD.excite + .15);
  });
  on('ball:edge', () => { crowdVoice('ooh', 1.2, .12); commSay('edge', commVars(M_())); });
  on('ball:beaten', () => { crowdVoice('ooh', 1.1, .1); const m = M_(); if (m) commSay('beaten', commVars(m)); });
  on('stumps', d => { sfx('stumps'); sfx('bails'); const m = M_(); if (m) { const y = d.end * 320; game.particles.bits(OX, OY + y, 12, 10, ['#e8dcb8', '#f4ecd0']); game.particles.dust(OX, OY + y, 2, 6); } shake(2); });
  on('keeper', () => sfx('gloves'));
  on('appeal', () => { const m = M_(); shout('HOWZAT!', 'gaz', { pitch: 1.1 }); crowdVoice('ooh', 1.4, .14); if (m) callout('HOWZAT!', '#ff6b6b', .9, { small: true }); });
  on('decision', d => { if (!d.out) callout('NOT OUT', '#c8c8d0', 1, { small: true }); });
  on('boundary', d => {
    const m = M_(); WORLD.cheer = 3; CROWD.excite = 1;
    if (d.n === 6) { callout('SIX! MAXIMUM!', '#ffd23a', 1.4); sting('six'); crowdVoice('roar', 2.2, .22); applause(3); flash('#fff4c8', .12); shake(2); }
    else { callout('FOUR!', '#7aa7ff', 1.2); sting('four'); crowdVoice('roar', 1.4, .16); applause(2.2); sfx('board'); }
    if (m) commSay(d.n === 6 ? 'six' : 'four', commVars(m), { urgent: true });
  });
  on('catch', d => { sfx('gloves'); if (d.screamer) { callout('SCREAMER!', '#ffd23a', 1.3); slowmo(.4, .5); } shout('CATCH IT!', 'pip'); });
  on('catch:dropped', d => { crowdVoice('groan', 1.4, .14); callout('DROPPED!', '#ff9a6a', 1, { small: true }); commSay('dropped', commVars(M_(), { fielder: d.fielder })); });
  on('throw', () => sfx('throwWhoosh'));
  on('direct', () => { callout('DIRECT HIT!', '#ffd23a', 1.1, { small: true }); });
  on('dive', () => sfx('dive'));
  on('call', d => { const m = M_(); if (m) { const h = m.batters[0]; const who = m.striker() && m.striker().p.id; shout(d.what + '!', VOICES[who] ? who : 'edie', { vol: .8 }); m.bubble = { text: d.what + '!', t: 0 }; } });
  on('run', d => { if (d.n >= 2) sfx('step'); });
  on('dead', d => { const m = M_(); if (!m) return; const r = m.ballRec; if (!r) return;
    if (r.wicket) { callout('WICKET!', '#ff4a4a', 1.4); sting('wicket'); crowdVoice('roar', 1.8, .2); applause(2.5, 70); const how = r.wicket.how; commSay(how === 'bowled' ? 'bowled' : how === 'caught' ? (m.catcher && m.catcher.dive ? 'screamer' : 'caught') : how === 'lbw' ? 'lbw' : how === 'run out' ? 'runout' : how === 'stumped' ? 'stumped' : how === 'hit wicket' ? 'hitwicket' : 'bowled', commVars(m), { urgent: true }); }
    else if (r.wide) commSay('wide', commVars(m)); else if (r.noBall) commSay('noball', commVars(m));
    else if (!r.boundary && r.runs === 1) commSay('single', commVars(m)); else if (!r.boundary && r.runs > 1) commSay('runs', commVars(m, { runs: r.runs }));
    else if (!r.boundary && !r.runs && RNG.cosmetic() < .5) commSay('dot', commVars(m));
    if (r.bonus > 0) callout('KERFUFFLE BONUS +' + r.bonus, '#ff8ad8', 1.4, { small: true });
  });
  on('extra', d => { if (d.kind === 'noBall') { callout(d.beamer ? 'BEAMER! NO BALL' : 'NO BALL', '#ffd23a', 1.1, { small: true }); sfx('whistle'); } if (d.kind === 'wide') callout('WIDE', '#c8c8d0', .9, { small: true }); });
  on('ball:done', d => { const m = M_(); if (m && m.I && m.I.freeHit) { callout('FREE HIT', '#ffd23a', 1.3); commSay('freehit', commVars(m)); } if (m && d.rec && d.rec.bonus > 0) commSay('bonus', commVars(m, { runs: d.rec.bonus })); });
  on('fire:on', d => { const m = M_(); callout('ON FIRE!', '#ff8a2a', 1.5); sfx('fireOn'); sting('six'); if (m) commSay(d.side === 'bat' ? 'fire' : 'firebowl', commVars(m), { urgent: true }); flash('#ff8a2a', .1); });
  on('hype:full', () => { sfx('hypeFull'); crowdVoice('chant', 1.6, .14); const m = M_(); if (m && !hub()) callout('SPECIAL READY', '#5fd38a', 1.2, { small: true }); });
  on('special', d => { sfx('special'); const m = M_(); if (m) commSay('special', commVars(m, { item: d.name })); });
  on('item', d => { sfx('coin'); callout(upper(d.name) + '!', ITEMS[d.id].color, 1.3, { small: true }); const m = M_(); if (m) commSay('item', commVars(m, { item: d.name })); });
  on('item:use', d => { if (d.id === 'horseshoe') callout('LUCKY HORSESHOE! NOT OUT!', '#c8ccd8', 1.6, { small: true }); if (d.id === 'teapot') callout('GOLDEN TEAPOT! RUNS ×2', '#ffd23a', 1.4, { small: true }); if (d.id === 'banana') callout('BANANA PEEL!', '#ffe04a', 1.1, { small: true }); });
  on('target:hit', d => { sfx(['fountain', 'shark', 'tower'].includes(d.id) ? 'splash' : 'glass'); flash('#ffffff', .1); shake(2); const m = M_(); if (m) { COMM.queue = []; COMM.queue.push({ who: 'aubrey', text: d.line, t: 0, dur: 4 }); } slowmo(.4, .4); });
  on('chaos', d => { const m = M_(); if (d.id === 'cow') sfx('moo'); if (d.id === 'bells') { sfx('bell'); game.after(.6, () => sfx('bell')); } if (d.id === 'bees') sfx('bees'); if (d.id === 'gulls') sfx('gull'); if (d.id === 'rain') { sfx('thunder'); CROWD.rain = true; } if (d.id === 'fireworks') sfx('firework');
    if (m && d.line) { COMM.queue = []; COMM.queue.push({ who: 'aubrey', text: d.line, t: 0, dur: 4 }); } callout(upper(d.name), '#c8f0ff', 1.4, { small: true }); });
  on('rain:end', d => { CROWD.rain = false; });
  on('cow:hit', () => { sfx('moo'); COMM.queue = [{ who: 'aubrey', text: "She's taken it on the flank, and seems rather pleased about it.", t: 0, dur: 3.4 }]; });
  on('gull', () => { sfx('gull'); callout('SEAGULL! +2', '#f4f4f0', 1.1, { small: true }); });
  on('ghost', () => { const m = M_(); if (m) commSay('ghost', commVars(m)); });
  on('fireworks', () => sfx('firework'));
  on('review:start', d => { sfx('stamp'); const m = M_(); if (d.kind === 'krs') { callout('REVIEW', '#7ae0ff', 1.2, { small: true }); if (m) commSay('review', commVars(m), { urgent: true, force: true }); } else callout('THIRD UMPIRE', '#7ae0ff', 1.2, { small: true }); });
  on('review:result', d => { sfx('stamp'); const m = M_(); callout(d.out ? 'OUT!' : 'NOT OUT!', d.out ? '#ff4a4a' : '#5fd38a', 1.4); if (m && !d.third) commSay(d.overturned ? 'overturned' : 'stands', commVars(m), { urgent: true, force: true }); });
  on('over:end', () => { const m = M_(); sting('over'); if (m && !m.inningsOver()) { if (m.need() !== null) commSay('chase', commVars(m)); else commSay('overEnd', commVars(m)); } if (m && RNG.cosmetic() < .35 && !hub()) game.after(4, () => { if (COMM.m === m && !COMM.cur && m.state !== 'over') commSay('idle', commVars(m)); }); });
  on('milestone', d => { const m = M_(); if (d.kind === 'hattrick') { callout('HAT-TRICK!', '#ffd23a', 1.8); commSay('hattrick', commVars(m), { urgent: true }); } if (d.kind === 'maiden') commSay('maiden', commVars(m)); });
  on('superover', () => { const m = M_(); callout('SUPER OVER!', '#ffd23a', 2); commSay('tie', commVars(m), { urgent: true, force: true }); });
  on('match:end', d => { const m = M_(); if (!m) return; const human = m.isHumanSideIdx(); if (m.result.winner === null) commSay('tie', commVars(m), { force: true }); else { commSay(human < 0 || m.result.winner === human || m.won ? 'win' : 'loss', commVars(m), { force: true, urgent: true }); } if (m.won || human < 0) sting('win'); else sting('lose'); });
  on('innings:start', d => { const m = M_(); if (m && m.i === 0) commSay('start', commVars(m), { force: true }); });
  on('cam', () => {});
}
function hudStep(dt) {
  for (const c of CALL.list) c.t += dt; CALL.list = CALL.list.filter(c => c.t < c.dur);
  if (WORLD.cheer > 0) WORLD.cheer -= dt;
  const m = COMM.m; if (m && m.bubble) { m.bubble.t += dt; if (m.bubble.t > 1.2) m.bubble = null; }
  commStep(dt); crowdStep(dt);
}
