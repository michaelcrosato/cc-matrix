// AI Hub (Session Protocol v1), ghost mode: every player runs the same seeded hunt on their own device, keyed to the
// hub's clock, and sees the others' reticles and shots as ghosts. Our own card; a 3-minute Hub Hunt-Off timeline;
// progress once a second; one result (also on time-up); ROUND OVER with the standings at the end. Outside a session
// (or when connect() answers null) the game runs as it does on its own.
(() => {
const B = BB, E = B.E, px = E.px, game = B.game;
const SITES = { hollow: ['hollow-1', 'hollow-2'], bugle: ['bugle-1', 'bugle-3'], muskeg: ['muskeg-1', 'muskeg-3'] };
// the timeline in seconds of AIHub.time()
B.hubTimeline = hunt => {
  const H = B.get('hunt', hunt), [a, b] = SITES[hunt];
  return [
    { kind: 'pan', t0: 0, t1: 6, v: B.get('site', a).vantage },
    { kind: 'site', id: a, t0: 6, t1: 60, timeBox: true },
    { kind: 'walk', t0: 60, t1: 65, v: B.get('site', b).vantage },
    { kind: 'site', id: b, t0: 65, t1: 115, timeBox: true },
    { kind: 'walk', t0: 115, t1: 120, v: B.get('site', B.get('bonus', H.bonus).site).vantage },
    { kind: 'site', id: B.get('bonus', H.bonus).site, t0: 120, t1: 150 },
    { kind: 'site', id: B.get('trophy', H.trophy).site, t0: 150, t1: 175 },
    { kind: 'final', t0: 175, t1: 180 }
  ];
};
const hub = B.hubState = { phase: 'connecting', info: null, card: null, ghosts: new Map(), segI: -1, resultSent: false, progressT: 0, sendT: 0, sent: 0, progressN: 0, standings: null, readyCalled: 0 };
const now = () => (typeof AIHub !== 'undefined' && AIHub.time ? AIHub.time() / 1000 : -Infinity);
let play, me, lens, world, timeline;

B.hubScene = {
  camera: { zoom: false }, touch: [],
  enter() {
    hub.phase = 'connecting';
    AIHub.connect({ mode: 'ghost', seats: [1, 4], card: true }).then(info => {
      if (!info) { hub.phase = 'off'; B.HUB = false; game.go('title'); return; }
      hub.info = info; setup(info);
    }).catch(() => { hub.phase = 'off'; game.go('title'); });
  },
  update(dt) {
    B.stepHud(dt); B.stepBarks(dt);
    if (hub.phase === 'card') { stepCard(); return; }
    if (hub.phase === 'play' || hub.phase === 'countdown') stepPlay(dt);
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H;
      if (hub.phase === 'connecting' || hub.phase === 'off') { px.rect(g, 0, 0, W, H, '#0a0806'); B.text(g, 'CALLING THE LODGE...', W / 2, H / 2, '#e8dcc8', { align: 'center' }); return; }
      const seg = timeline && timeline[hub.segI];
      if (play.site && seg && seg.kind === 'site') {
        B.drawWorld(g, W, H, { site: play.site, time: game.real, fx: play.fx, players: play.players, t: play.t });
        B.drawOverlays(g, W, H, { site: play.site, time: game.real, players: play.players, play });
        B.drawTags(g, play); B.drawHud(g, W, H, play, { clock: B.mmss(180 - Math.max(0, now())) });
        drawGhosts(g, W, H);
        for (const p of play.players) if (!p.ghost) B.drawReticle(g, p, p.ret[0], p.ret[1]);
      } else if (lens && world) B.drawWorld(g, W, H, { world, lens, time: game.real, actors: [] });
      if (hub.phase === 'card') drawCard(g, W, H);
      if (hub.phase === 'countdown') { const c = Math.ceil(-now()); B.title(g, c > 0 ? String(c) : 'GO!', W / 2, H * .35, 5); }
      if (seg && seg.kind === 'pan' && hub.phase === 'play') { B.title(g, 'BUCKS ONLY!', W / 2, H * .3, 4); B.text(g, B.get('hunt', hub.hunt).name.toUpperCase(), W / 2, H * .3 + 40, '#fff4d0', { align: 'center', scale: 2 }); }
      if (seg && seg.kind === 'walk') B.text(g, 'ON TO THE NEXT STAND...', W / 2, H - 20, '#e8dcc8', { align: 'center' });
      if (seg && seg.kind === 'final' || hub.phase === 'over') drawFinal(g, W, H);
      drawStrip(g, W, H);
    });
  }
};
function setup(info) {
  const hunt = hub.hunt = ['hollow', 'bugle', 'muskeg'][(((info.round || 1) - 1) % 3 + 3) % 3];
  const R = AIHub.rng('hunt'); B.reseed(Math.floor(R() * 1e9)); B.resetIds();
  world = B.loadWorld(hunt); timeline = B.hubTimeline(hunt);
  const players = [];
  for (const pl of info.players) {
    const isMe = pl.id === info.me, p = new B.Player(pl.id % 4, isMe ? game.input : null, { name: String(pl.name || 'P' + (pl.id + 1)).slice(0, 12).toUpperCase() });
    p.hubId = pl.id; p.color = pl.color || B.SEATS[pl.id % 4]; p.ghost = !isMe;
    if (isMe) me = p; else hub.ghosts.set(pl.id, { p, a: null, s: -1, score: 0, puffs: [] });
    players.push(p);
  }
  if (!me) { me = new B.Player(0, game.input); players.unshift(me); }
  play = B.play = new B.Play({ players, mode: 'hub', shared: true, W: game.W || 480, H: game.H || 270 });
  const v = world.vantages[timeline[0].v]; lens = new B.Lens({ x: v.x, y: v.y, z: v.z, yaw: v.yaw, pitch: 3, fov: 30 });
  hub.phase = 'card';
  AIHub.on('card', c => { hub.card = c; });
  AIHub.on('start', () => { hub.phase = 'countdown'; B.music('stalk'); });
  AIHub.on('message', (d, from) => onMessage(d, from));
  AIHub.on('leave', ({ id }) => { hub.ghosts.delete(id); play.players = play.players.filter(p => p.hubId !== id || !p.ghost); });
  AIHub.on('time-up', () => sendResult());
  AIHub.on('end', ({ standings }) => { hub.phase = 'over'; hub.standings = standings; B.music(null); B.muteFx = true; game.input.clear && game.input.clear(); });
  AIHub.ready(); hub.readyCalled++;
  B.music('hoedown');
}
function stepCard() {
  const I = game.input, c = I.clicked && I.clicked();
  if (I.pressed('confirm') || I.pressed('start') || (c && hub.readyRect && inR(c, hub.readyRect))) { AIHub.answer('ready'); hub.answered = 'ready'; B.sfx('confirm'); }
  if (I.pressed('call') || I.pressed('more') || (c && hub.moreRect && inR(c, hub.moreRect))) { AIHub.answer('more'); hub.answered = hub.answered === 'more' ? null : 'more'; B.sfx('focus'); }
  if (lens) lens.yaw += 1 / 120 * .02;
}
const inR = (c, r) => c[0] >= r[0] && c[0] < r[0] + r[2] && c[1] >= r[1] && c[1] < r[1] + r[3];
function stepPlay() {
  const t = now(); if (!isFinite(t)) return;
  if (t < 0) { hub.phase = 'countdown'; return; }
  hub.phase = 'play';
  // the segment the hub clock is in (all copies agree)
  let i = timeline.findIndex(s => t >= s.t0 && t < s.t1); if (i < 0) i = timeline.length - 1;
  if (i !== hub.segI) enterSeg(i);
  const seg = timeline[i];
  if (seg.kind === 'site' && play.site) {
    const target = t - seg.t0; let n = 0;
    while (play.site.t + (play.site.ended ? play.site.endT : 0) < target - .004 && n < 240) { play.update(1 / 120); n++; }
    if (target - play.site.t > 2 && !play.site.ended) { enterSeg(i, true); }
  } else if (seg.kind === 'pan' || seg.kind === 'walk') {
    const u = B.clamp((t - seg.t0) / (seg.t1 - seg.t0), 0, 1), v = world.vantages[seg.v];
    if (seg.kind === 'walk' && seg.from) { lens.x = B.lerp(seg.from.x, v.x, u); lens.y = B.lerp(seg.from.y, v.y, u); lens.z = Math.max(world.groundAt(lens.x, lens.y) + 1.8, B.lerp(seg.from.z, v.z, u)); lens.yaw = B.lerp(seg.from.yaw, v.yaw, u); }
    else { lens.x = v.x; lens.y = v.y; lens.z = v.z; lens.yaw = v.yaw + (u - .5) * .5; }
  } else if (seg.kind === 'final') sendResult();
  // reporting and ghosts
  hub.progressT += 1 / 120 * 1; hub.sendT += 1 / 120;
  if (t - (hub.lastProgress || -9) >= 1) { hub.lastProgress = t; hub.progressN++; AIHub.progress({ score: me.total, label: (seg.kind === 'site' ? B.get('site', seg.id).name : 'Walking') + ' · ' + me.stats.bucks + ' bucks' }); }
  if (t - (hub.lastSend || -9) >= .1) { hub.lastSend = t; const a = aimAngles(me); AIHub.send({ t: 'g', s: hub.segI, a, sc: me.scoped ? 1 : 0, p: me.total }, { reliable: false }); hub.sent++; }
}
function enterSeg(i, catchUp) {
  const prev = timeline[hub.segI], seg = timeline[i]; hub.segI = i;
  if (seg.kind === 'site') { play.startSite(seg.id, { timeBox: !!seg.timeBox, time: seg.t1 - seg.t0, shared: true }); B.site = play.site; B.music(B.get('site', seg.id).bonus ? 'jamboree' : 'stalk'); }
  else { if (seg.kind === 'walk') seg.from = { x: lens.x, y: lens.y, z: lens.z, yaw: play.site ? play.site.lens.yaw : lens.yaw }; play.site = null; }
  if (seg.kind === 'final') B.music('results');
}
function aimAngles(p) { const L = play.site ? play.site.lens : lens; if (!play.site && L.update) L.update(); const a = B.aimPoint(p, play.t); return [Math.round(Math.atan((a[0] - L.cx) / L.f) * 1000), Math.round(Math.atan((L.horizonY - a[1]) / L.f) * 1000)]; }
function fromAngles(a) { const L = play.site.lens; return [L.cx + Math.tan(a[0] / 1000) * L.f, L.horizonY - Math.tan(a[1] / 1000) * L.f]; }
B.bus.on('shot', e => { if (!B.HUB || !hub.info || e.p !== me || hub.phase !== 'play') return; const r = e.res; AIHub.send({ t: 'shot', s: hub.segI, a: aimAngles(me), res: r.actor ? (r.actor.cat === 'animal' ? (r.actor.legal ? 'buck' : 'doe') : 'critter') : 'miss', pts: 0, zone: r.zone || null }); hub.sent++; });
B.bus.on('pop', e => { if (!B.HUB || !hub.info || e.p !== me) return; AIHub.send({ t: 'pts', s: hub.segI, pts: e.pts }); });
function onMessage(d, from) {
  const gh = hub.ghosts.get(from); if (!gh || !d) return;
  if (d.t === 'g') { gh.a = d.a; gh.s = d.s; gh.score = d.p; gh.sc = d.sc; }
  if (d.t === 'shot' && d.s === hub.segI) gh.puffs.push({ a: d.a, t: 0, res: d.res });
  if (d.t === 'pts' && d.s === hub.segI) gh.puffs.push({ a: gh.a, t: 0, pts: d.pts });
}
function drawGhosts(g, W, H) {
  for (const [, gh] of hub.ghosts) {
    if (!gh.a || gh.s !== hub.segI || !play.site) continue;
    const [x, y] = fromAngles(gh.a);
    px.blend(g, .6, 'normal', () => B.drawReticle(g, Object.assign({}, gh.p, { bloom: 0, dry: 0, benched: false }), x, y, { ghost: true, name: gh.p.name }));
    for (const pf of gh.puffs) { pf.t += 1 / 60; if (!pf.a) continue; const [px0, py0] = fromAngles(pf.a); if (pf.pts) B.text(g, (pf.pts > 0 ? '+' : '') + pf.pts, px0, py0 - 14 - pf.t * 12, gh.p.color, { align: 'center' }); else px.disc(g, Math.round(px0), Math.round(py0), Math.max(1, 4 - pf.t * 6), '#e8dcc8'); }
    gh.puffs = gh.puffs.filter(pf => pf.t < 1.2);
  }
}
function drawStrip(g, W, H) {
  if (!hub.info || hub.phase === 'card') return;
  const list = [[me.name, me.total, me.color]]; for (const [, gh] of hub.ghosts) list.push([gh.p.name, gh.score, gh.p.color]);
  list.sort((a, b) => b[1] - a[1]);
  list.forEach((e, i) => { B.text(g, e[0] + ' ' + B.fmt(e[1]), W - 8, 44 + i * 9, e[2], { align: 'right' }); });
}
function drawCard(g, W, H) {
  const c = hub.card || {}, info = hub.info;
  px.blend(g, .55, 'normal', () => px.rect(g, 0, 0, W, H, '#100804'));
  B.panel(g, W / 2 - 180, 10, 360, H - 20);
  B.title(g, 'BIG BUCK HUNT-OFF', W / 2, 16, 3);
  B.text(g, 'HUB HUNT-OFF · ' + B.get('hunt', hub.hunt).name.toUpperCase(), W / 2, 46, '#f0c060', { align: 'center' });
  B.text(g, 'Most points in 3 minutes. Bucks only, never does!', W / 2, 60, '#ffffff', { align: 'center' });
  info.players.forEach((pl, i) => { const y = 78 + i * 13, ready = c.ready && c.ready.includes(pl.id); B.text(g, (ready ? '✓ ' : '  ') + String(pl.name || 'P' + (pl.id + 1)).slice(0, 14).toUpperCase() + (pl.id === info.me ? ' (YOU)' : ''), W / 2 - 150, y, pl.color || B.SEATS[i]); });
  const I = game.input; let y = 136;
  for (const [a, t] of [['fire', 'SHOOT'], ['pump', 'PUMP'], ['scope', 'SCOPE'], ['breath', 'HOLD BREATH'], ['call', 'CALL']]) { const w = B.drawGlyph(g, a, I, W / 2 + 20, y); B.text(g, t, W / 2 + 24 + w, y + 2, '#e8dcc8'); y += 13; }
  B.text(g, 'AIM: ' + (B.lastDevice(I) === 'pad' ? 'LEFT STICK' : 'MOUSE'), W / 2 - 150, 140, '#e8dcc8');
  const left = c.left === null || c.left === undefined ? (c.starting ? 'STARTING...' : c.paused ? 'PAUSED' : '') : Math.ceil(c.left / 1000) + 's';
  B.text(g, left, W / 2 - 150, 154, '#ffd070', { scale: 2 });
  hub.readyRect = [W / 2 - 150, H - 46, 120, 22]; hub.moreRect = [W / 2 + 30, H - 46, 120, 22];
  E.ui.box(g, ...hub.readyRect, { bg: hub.answered === 'ready' ? ['#3a6a14', '#1e3a0a'] : ['#6a3a14', '#3a1e0a'], border: '#ffd070' });
  E.ui.box(g, ...hub.moreRect, { bg: hub.answered === 'more' ? ['#3a3a6a', '#1e1e3a'] : ['#2a2018', '#1a140e'], border: '#c8a060' });
  const gw = B.drawGlyph(g, 'confirm', I, hub.readyRect[0] + 6, hub.readyRect[1] + 5); B.text(g, 'READY', hub.readyRect[0] + 10 + gw, hub.readyRect[1] + 7, '#ffffff');
  const gw2 = B.drawGlyph(g, B.lastDevice(I) === 'pad' ? 'call' : { kind: 'key', text: 'M' }, I, hub.moreRect[0] + 6, hub.moreRect[1] + 5); B.text(g, c.asked ? 'TAKE IT BACK' : 'MORE TIME', hub.moreRect[0] + 10 + gw2, hub.moreRect[1] + 7, '#ffffff');
}
function drawFinal(g, W, H) {
  px.blend(g, .6, 'normal', () => px.rect(g, 0, 0, W, H, '#05040a'));
  B.title(g, hub.phase === 'over' ? 'ROUND OVER' : 'FINAL TALLY', W / 2, 30, 3);
  const rows = [];
  if (hub.standings && hub.info) { hub.standings.forEach((grp, i) => (Array.isArray(grp) ? grp : [grp]).forEach(id => { const pl = hub.info.players.find(p => p.id === id); if (pl) rows.push([i + 1, String(pl.name || '').slice(0, 14).toUpperCase(), pl.color || '#fff', pl.id === hub.info.me ? me.total : (hub.ghosts.get(id) || {}).score]); })); }
  else { rows.push([0, me.name, me.color, me.total]); for (const [, gh] of hub.ghosts) rows.push([0, gh.p.name, gh.p.color, gh.score]); rows.sort((a, b) => b[3] - a[3]); rows.forEach((r, i) => { r[0] = i + 1; }); }
  rows.forEach((r, i) => { B.text(g, r[0] + '. ' + r[1], W / 2 - 110, 76 + i * 18, r[2], { scale: 2 }); B.text(g, B.fmt(r[3] || 0), W / 2 + 110, 76 + i * 18, '#ffffff', { scale: 2, align: 'right' }); });
}
function sendResult() {
  if (hub.resultSent || !hub.info) return; hub.resultSent = true;
  const s = me.stats, acc = s.shots ? Math.round(s.hits / s.shots * 100) : 0;
  AIHub.result({ score: Math.round(me.total), stats: { 'Bucks bagged': s.bucks, Accuracy: acc + '%', 'Longest shot': Math.round(s.longest) + ' m' } });
}
B.hubDebug = () => ({ phase: hub.phase, segI: hub.segI, seg: timeline && timeline[hub.segI] ? timeline[hub.segI].kind : null, progress: hub.progressN, sent: hub.sent, resultSent: hub.resultSent, ghosts: hub.ghosts.size, ready: hub.readyCalled, score: me ? me.total : 0, spawns: play && play.site ? play.site.herd.spawnLog.length : 0, hunt: hub.hunt });
})();
