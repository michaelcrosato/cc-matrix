/* ---- AI HUB (Session Protocol v1, ghost mode, 1 to 4 players) and its standalone twin, the Shadow Trial ----
 * Every player plays their own copy of "Night Delivery" from the same seed; the others show as translucent shadow ninja in
 * their seat colours, and never touch the world. On its own, the trial races your best ghost. */
const SEAT_COLORS = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
const hub = { info: null, card: { left: null, paused: false, starting: false, ready: [], asking: 0, asked: false }, ended: null, standings: null, started: false, timeUp: false, lastSend: 0, lastProg: 0, reported: false, offs: [] };
B.hub = hub;
const ghostRigs = new Map();
function ghostRig(id) { if (!ghostRigs.has(id)) ghostRigs.set(id, makeHeroRig(id % 2 ? 'kaede' : 'sojiro')); return ghostRigs.get(id); }
const trialScore = (ok) => {
  let s = S.score + S.cuts * 250 + Math.max(0, S.kills - S.cuts) * 50;
  if (S.obj.target) s += 2000; if (ok) s += 1000;
  s += S.detected === 0 ? 600 : -150 * S.detected; s -= 500 * S.civHarm;
  if (ok) s += Math.min(1200, Math.max(0, Math.round((300 - S.t) * 4)));
  return Math.max(0, Math.round(s));
};
const stateCode = () => S.over ? 6 : S.done ? 7 : S.cutFx ? 5 : S.combo.busy ? 4 : S.swim ? (S.hero.crouch ? 3 : 2) : S.hero.crouch ? 1 : 0;
B.holdPlay = () => !!(S && S.hubWait);
B.onPlayEnter = d => {
  S.ghosts = new Map(); S.tr = null;
  if (!(d.trial || d.hub)) return;
  S.tr = { hub: !!d.hub, rec: [], recT: 0, best: B.save.ghost, ended: false };
  if (d.hub) { S.hubWait = true; S.god = false; }
  B.save.chara = d.hub && hub.info ? (hub.info.me % 2 ? 'kaede' : 'sojiro') : B.save.chara;
  if (d.hub) { S.rig = makeHeroRig(B.save.chara); S.combo = new E.Combo(B.save.chara === 'kaede' ? ['slash', 'backslash', 'spin'] : ['slash', 'backslash', 'overhead'], { window: .35 }); }
  S.t = 0;
};
const hubTime = () => HUB && window.AIHub ? AIHub.time() / 1000 : null;
B.onPlayStep = dt => {
  const tr = S.tr; if (!tr) return;
  if (tr.hub) {
    const t = hubTime(); if (t !== null) S.t = Math.max(0, t);
    const now = performance.now();
    if (!hub.ended && AIHub.me !== undefined) {
      if (now - hub.lastSend > 100 && !S.done) { hub.lastSend = now; AIHub.send({ t: 'g', a: 'delivery', x: Math.round(S.hero.x * 10) / 10, y: Math.round(S.hero.y * 10) / 10, z: Math.round(S.hero.z), f: Math.round(S.hero.facing * 100) / 100, s: stateCode(), k: S.kills }, { reliable: false }); }
      if (now - hub.lastProg > 1000) { hub.lastProg = now; AIHub.progress({ score: trialScore(false), label: S.obj.target ? 'Target down' : 'Cuts ' + S.cuts + (S.detected ? '' : ' / Unseen') }); }
    }
  }
  tr.recT += dt;
  if (tr.recT >= .1) { tr.recT = 0; if (tr.rec.length < 4000) tr.rec.push([Math.round(S.hero.x), Math.round(S.hero.y), Math.round(S.hero.z), Math.round(S.hero.facing * 100), stateCode()]); }
};
// other players' ghosts (hub), and your best ghost (standalone)
if (HUB && window.AIHub) {
  AIHub.on('message', (d, from) => {
    if (!d || !S || !S.ghosts) return;
    if (d.t === 'g' && d.a === 'delivery') { const gh = S.ghosts.get(from) || { x: d.x, y: d.y, z: d.z, f: d.f, id: from }; gh.tx = d.x; gh.ty = d.y; gh.tz = d.z; gh.tf = d.f; gh.s = d.s; gh.k = d.k; S.ghosts.set(from, gh); }
    else if (d.t === 'done') { const gh = S.ghosts.get(from); if (gh) gh.done = true; }
  });
  AIHub.on('leave', e => { if (S && S.ghosts) S.ghosts.delete(e.id); });
}
const nameOf = id => { const p = hub.info && hub.info.players.find(q => q.id === id); return p ? String(p.name) : 'P' + (id + 1); };
B.drawGhosts = r => {
  if (!S || !S.tr) return;
  const dt = 1 / 60, k = 1 - Math.pow(.002, dt);
  for (const [id, gh] of S.ghosts) {
    if (gh.tx === undefined) continue; gh.x = lerp(gh.x, gh.tx, k); gh.y = lerp(gh.y, gh.ty, k); gh.z = lerp(gh.z, gh.tz, k); gh.f = gh.tf;
    const rig = ghostRig(id), col = SEAT_COLORS[id % 4];
    rig.update(dt, { x: gh.x, y: gh.y, z: gh.z, facing: gh.f, vx: (gh.tx - gh.x) * 6, vy: (gh.ty - gh.y) * 6, crouch: gh.s === 1 || gh.s === 3, pose: gh.s === 6 ? 'down' : null, down: gh.s === 6 ? 1 : undefined });
    r.actor(gh.x, gh.y, gh.z, (g, ox, oy) => rig.draw(g, ox, oy, r.view), { alpha: .45, flash: col, flashMix: .35, ghost: { color: col, life: .5, alpha: .25, owner: gh } });
    r.overlay(g => { const [sx, sy] = r.w(gh.x, gh.y, gh.z + 40); E.font.text(g, nameOf(id), mm(sx), mm(sy) - 8, col, { align: 'center', shadow: '#000', outline: false }); });
  }
  // the standalone twin: your best run, in white
  const best = S.tr.best;
  if (!S.tr.hub && best && best.track && best.track.length) {
    const i = Math.min(best.track.length - 1, Math.floor(S.t * 10)), q = best.track[i], gr = S.bestRig || (S.bestRig = makeHeroRig(best.chara || 'sojiro'));
    gr.update(dt, { x: q[0], y: q[1], z: q[2], facing: q[3] / 100, vx: 0, vy: 0, crouch: q[4] === 1 || q[4] === 3 });
    r.actor(q[0], q[1], q[2], (g, ox, oy) => gr.draw(g, ox, oy, r.view), { alpha: .4, flash: '#ffffff', flashMix: .5 });
    r.overlay(g => { const [sx, sy] = r.w(q[0], q[1], q[2] + 40); E.font.text(g, 'BEST', mm(sx), mm(sy) - 8, '#ffffff', { align: 'center', shadow: '#000', outline: false }); });
  }
};
const FINISH_STATS = () => ({ 'Silent cuts': S.cuts, 'Detected': S.detected, 'Time': Math.floor(S.t / 60) + ':' + String(Math.floor(S.t % 60)).padStart(2, '0'), 'Rank': B.RANKS[rankOf().idx][0] });
function hubReport() {
  if (hub.reported || !S || !S.tr) return; hub.reported = true;
  const score = trialScore(!!S.result && !S.result.dead), awards = [];
  if (S.detected === 0) awards.push({ title: 'Ghost of the Moon', detail: 'Never detected' });
  if (S.cuts >= 5) awards.push({ title: 'Silent Blade', detail: 'Five or more silent cuts' });
  if (S.kills - (S.obj.target ? 1 : 0) <= 0 && S.obj.target) awards.push({ title: 'Fed by All', detail: 'No kills but the target' });
  AIHub.send({ t: 'done', score }, { reliable: true });
  AIHub.result({ score, stats: FINISH_STATS(), awards: awards.slice(0, 3) });
}
B.onTrialDone = result => {
  const tr = S && S.tr; if (!tr || tr.ended) { return; } tr.ended = true;
  result.score = trialScore(!result.dead); S.result = result;
  if (tr.hub) { A.music(null); hubReport(); return; }
  // standalone: keep the best ghost and a local board of five
  const entry = { score: result.score, rank: result.dead ? 'Fell' : B.RANKS[rankOf().idx][0], chara: B.save.chara, date: new Date().toISOString().slice(0, 10) };
  const board = (B.save.trial || []).concat([entry]).sort((a, b) => b.score - a.score).slice(0, 5); B.save.trial = board;
  tr.isBest = !B.save.ghost || result.score > B.save.ghost.score;
  if (tr.isBest) B.save.ghost = { score: result.score, chara: B.save.chara, track: tr.rec.slice(0, 3000) };
  B.persist(); tr.board = board; tr.ui = new RowsUI([{ label: 'Race your ghost again', pick: () => game.go('play', { mission: 'delivery', trial: true }) }, { label: 'Back to the title', pick: () => game.go('title') }]);
  A.music(result.dead ? null : 'victory');
};
const baseDevHud = B.devHud;
B.devHud = (g, r) => {
  baseDevHud(g, r); if (!S || !S.tr) return; const W = r.W, H = r.H, tr = S.tr;
  if (S.hubWait) {   // the 3-2-1 before the round
    const t = hubTime(), n = t === null ? 3 : Math.ceil(-t);
    if (t !== null && t < 0 && t > -3.2) E.font.title(g, String(Math.max(1, n)), mm(W / 2), mm(H / 2 - 30), { align: 'center', scale: 7, colors: ['#ffe0e0', '#e03a2a', '#901810'], depthColor: '#2a0808' });
    else if (t === null || t === -Infinity) txt(g, 'Waiting for the round...', W / 2, H / 2, '#ffe9b0', { align: 'center' });
  }
  if (hub.ended) { panel(g, W / 2 - 100, H / 2 - 40, 200, 80, .92); bigText(g, 'ROUND OVER', W / 2, H / 2 - 32, 2);
    (hub.standings || []).slice(0, 4).forEach((grp, i) => txt(g, (i + 1) + '. ' + [].concat(grp).map(nameOf).join(', '), W / 2 - 80, H / 2 - 8 + i * 11, SEAT_COLORS[[].concat(grp)[0] % 4])); }
  if (tr.ended && !tr.hub && S.result) {
    panel(g, W / 2 - 130, 22, 260, H - 44, .93); bigText(g, S.result.dead ? 'YOU FELL' : 'DELIVERED', W / 2, 28, 3, S.result.dead ? ['#ffe0e0', '#ff7a6a', '#c8202a'] : undefined);
    txt(g, 'Score ' + S.result.score + (tr.isBest ? '   NEW BEST' : ''), W / 2, 56, '#ffe9b0', { align: 'center' });
    txt(g, 'Cuts ' + S.cuts + '   Seen ' + S.detected + '   Time ' + Math.floor(S.t / 60) + ':' + String(Math.floor(S.t % 60)).padStart(2, '0'), W / 2, 67, '#b8b0d8', { align: 'center' });
    txt(g, 'LOCAL BOARD', W / 2, 82, '#d9b77c', { align: 'center' });
    (tr.board || []).forEach((e, i) => txt(g, (i + 1) + '. ' + e.score + '   ' + e.rank + '   ' + e.chara + '   ' + e.date, W / 2 - 100, 94 + i * 10, '#d8d0f0'));
    tr.ui.draw(g, mm(W / 2 - 100), H - 70, 200, 16, {});
  }
};
const baseUpdate = playUpdate;
// the standalone trial's end screen takes input (the world is done)
const trialInput = dt => { const tr = S && S.tr; if (tr && tr.ended && !tr.hub && tr.ui) { tr.ui.update(dt); return true; } return false; };
/* ---- THE CARD: the game's own, in a session and on its own (hubcard / hubtrial) ---- */
const cardScene = standalone => ({
  view: 'side', input: INPUT, res: 'ps1',
  enter() { this.t = 0; game.follow(null); game.resetCamera(); L.enabled = false; game.weather = null; S = null; A.music(standalone ? B.SONGS.shop : null); if (!standalone) A.music(B.SONGS.shop); game.cam.bounds = null; game.cam.offset = null; },
  update(dt) {
    this.t += dt; const I = game.input; syncGlyphs();
    if (standalone) {
      if (I.pressed('confirm') || I.pressed('start')) { game.go('play', { mission: 'delivery', trial: true }); }
      if (I.pressed('cancel')) game.go('title');
    } else {
      if (I.pressed('confirm')) AIHub.answer('ready');
      if (I.pressed('interact') || I.pressed('map') || (I.pad && 0)) AIHub.answer('more');
    }
    game.focus(MID, 0, 40);
    const n = standalone ? 1 : Math.max(1, hub.info ? hub.info.players.length : 1);
    for (let i = 0; i < n; i++) { const rig = ghostRig(i); rig.update(dt, { x: MID + (i - (n - 1) / 2) * 34, y: 0, z: 32, facing: 0, vx: 0, vy: 0, pose: hub.card.ready.includes(i) ? 'cheer' : 'hips' }); }
  },
  draw(r) {
    NIGHT.draw(r); stage.draw(r); const W = r.W, H = r.H, n = standalone ? 1 : Math.max(1, hub.info ? hub.info.players.length : 1);
    r.prop('lantern', MID - 90, -4, 56, { size: 1.2, light: true, anchor: 'top' }); r.prop('lantern', MID + 90, -4, 56, { size: 1.2, light: true, anchor: 'top' });
    for (let i = 0; i < n; i++) { const rig = standalone ? makeHeroRigCached() : ghostRig(i); r.actor(MID + (i - (n - 1) / 2) * 34, 0, 32, (g, ox, oy) => rig.draw(g, ox, oy, r.view), { flash: SEAT_COLORS[i % 4], flashMix: .25 }); }
    game.focus(MID, 0, 32 + (H / 2 - 56) / -game.view.bz);
    r.overlay(g => {
      bigText(g, TITLE, W / 2, 8, 4); txt(g, standalone ? 'SHADOW TRIAL: NIGHT DELIVERY' : 'NIGHT DELIVERY', W / 2, 44, '#d9b77c', { align: 'center' });
      panel(g, W / 2 - 150, 58, 300, 52);
      txt(g, 'Silence Sakubei the rice broker in his counting hall, then slip out by the canal gate. Unseen is best.', W / 2 - 144, 62, '#e8e0f8', { wrap: 288 });
      txt(g, lbl('attack') + ' Silent Cut   ' + lbl('interact') + ' Kaginawa   ' + lbl('use') + ' Tool   ' + lbl('crouch') + ' Crouch   ' + lbl('ki') + ' Ki Focus', W / 2 - 144, 90, '#a8a0c8', { wrap: 288 });
      if (!standalone) {
        const c = hub.card; (hub.info ? hub.info.players : []).forEach((p, i) => { const x = W / 2 - 140 + i * 72, rd = c.ready.includes(p.id); px.rect(g, mm(x), 118, 66, 12, SEAT_COLORS[i % 4]); txt(g, String(p.name).slice(0, 10) + (rd ? ' OK' : ''), x + 3, 121, '#000'); });
        const left = c.paused ? 'Paused: more time asked' : c.starting ? 'Starting...' : c.left === null ? '' : Math.ceil(c.left / 1000) + 's';
        txt(g, left, W / 2, 140, '#ffe9b0', { align: 'center', scale: 2 });
        txt(g, lbl('confirm') + ' Ready     ' + (lastDev() === 'gamepad' ? '△' : 'M') + ' More time' + (c.asked ? ' (asked)' : ''), W / 2, H - 14, '#8a80a8', { align: 'center' });
      } else {
        const b = B.save.ghost; txt(g, b ? 'Race your best ghost: ' + b.score + ' points' : 'No ghost yet: set a score to race', W / 2, 122, '#80e0ff', { align: 'center' });
        txt(g, lbl('confirm') + ' Start      ' + lbl('cancel') + ' Back', W / 2, H - 14, '#8a80a8', { align: 'center' });
      }
    });
  }
});
let _hr = null; const makeHeroRigCached = () => _hr || (_hr = makeHeroRig(B.save.chara));
scenes.hubcard = cardScene(false);
scenes.hubtrial = cardScene(true);
// boot into the hub: card first, no title, no attract, no menus
B.hubBoot = () => {
  AIHub.connect({ mode: 'ghost', seats: [1, 4], card: true }).then(info => {
    if (!info) { HUB_OFF(); game.go('title'); return; }
    hub.info = info;
    AIHub.on('card', c => { hub.card = c; });
    AIHub.on('start', () => { if (hub.started) return; hub.started = true; game.go('play', { mission: 'delivery', trial: true, hub: true }, { fade: 0 }); });
    AIHub.on('time-up', () => { hub.timeUp = true; if (S) { if (!S.done && !S.over) { S.result = S.result || { id: 'delivery', dead: true, time: S.t, cuts: S.cuts, detected: S.detected }; } hubReport(); } });
    AIHub.on('end', e => { hub.ended = true; hub.standings = e.standings; A.music(null); A.setVolume(0); if (game.input) game.input.consumeAll(); });
    // the trial level is built when the round starts; the game has loaded now
    AIHub.ready();
  });
};
const HUB_OFF = () => { B.hubOff = true; if (game.o && game.o.menu) game.o.menu.quit = 'title'; };
