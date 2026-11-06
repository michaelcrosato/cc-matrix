/* activities/runtime.js: one run of an activity, whoever hosts it (a session, Class, the attract mode, the Gentle Games, a
 * hub round). A run holds contestants; each has an intent filled by a device, a bot or nothing. Families live beside this
 * file; rows in data/activities.js become registry entries. */
(() => {
'use strict';
const E = My3D2dge, G = window.G, { clamp } = E, game = G.game;

G.family = (name, f) => { G.families[name] = f; };
/** register every row: its family's code with its numbers over it */
G.registerActivities = () => {
  for (const row of G.DATA.activities) G.activity(Object.assign({}, G.families[row.family], row));
};
G.activity = def => { if (!G.activities[def.id]) G.order.push(def.id); G.activities[def.id] = def; };

/** where n people stand, and how big they are */
G.mats = n => n <= 1 ? { xs: [0], size: 2.1 } : n === 2 ? { xs: [-58, 58], size: 1.9 } : n === 3 ? { xs: [-96, 0, 96], size: 1.6 } : { xs: [-132, -44, 44, 132], size: 1.5 };

/** a contestant. spec: { name, color, input, skill, local, life (a body for show, not for score), rig, look, x, y } */
function makeContestant(ctx, spec, i) {
  const c = Object.assign({ i, name: 'Member', color: '#ff7a59', local: false, score: 0, pct: 0, stars: 0, x: 0, y: 0 }, spec);
  c.rng = E.rng(G.hashStr(ctx.id) + 1009 * (i + 1) + (ctx.seed || 0));
  c.intent = G.newIntent();
  if (c.input) c.reader = new G.DeviceReader(c.input, { mouse: (c.input.player || 1) === 1 && !c.input.half });
  if (c.skill) c.brain = new G.BotBrain(c.skill, c.rng);
  c.t = 0;
  return c;
}

/** start a run. o: { tier, mode, dur, seed, contestants, cheat, guided, rng } */
G.makeRun = (id, o = {}) => {
  const def = G.activities[id], tierIdx = o.tier || 0;
  const ctx = { def, id, tierIdx, tier: def.tiers[tierIdx], mode: o.mode || 'solo', time: 0, dur: o.dur || def.tiers[tierIdx].dur || def.dur || 60, done: false, cheat: !!o.cheat, guided: !!o.guided, seed: o.seed === undefined ? 12345 : o.seed, live: false, quiet: !!o.quiet, ghosts: new Map(), holdClock: false, short: !!o.short, durGiven: o.dur || 0, chartName: o.chart, laneActions: o.lanes };
  ctx.rng = o.rng || E.rng(ctx.seed + G.hashStr(id));
  const specs = o.contestants || [{ name: G.S.name, input: game.input, local: true, look: G.S.look, wear: G.S.wear }];
  const m = G.mats(o.matsFor || specs.length);
  ctx.size = o.size || def.rigSize || m.size;
  ctx.contestants = specs.map((s, i) => makeContestant(ctx, Object.assign({ x: m.xs[i] }, s), i));
  ctx.local = ctx.contestants.find(c => c.local) || null;
  for (const c of ctx.contestants) {
    if (!c.rig) { c.rig = c.regular ? G.regularRig(c.regular, ctx.size) : G.memberRig(c.look || G.S.look, c.wear || (c.local ? G.S.wear : {}), { size: ctx.size, color: c.shirt }); }
    c.poser = new G.Poser(c.rig);
  }
  if (def.setup) def.setup(ctx);
  return ctx;
};
/** what a contestant wants this step */
const fill = (ctx, c, dt) => {
  const dev = G.DEV.bot && c.local && !c.skill ? G.DEV.bot : null;
  if (dev && (!c.brain || c.brain.skill !== dev)) c.brain = new G.BotBrain(dev, c.rng);
  if (c.skill || dev) { if (c.brain && ctx.def.bot) ctx.def.bot(ctx, c, dt); c.intent.source = 'bot'; }
  else if (c.reader) { G.activeReader = c.reader; c.reader.read(dt, c.intent, { overPanel: !!(G.Dev && G.Dev.overPanel && G.Dev.overPanel()), axisX: ctx.def.leanAxis === 'x', keyRate: ctx.def.keyRate, keyHome: ctx.def.keyHome }); }
  else { c.intent.x = c.intent.y = 0; }
};
/** one fixed step of a live run */
G.stepRun = (ctx, dt) => {
  if (ctx.done) return;
  ctx.live = true;
  if (!ctx.holdClock) ctx.time += dt;
  for (const c of ctx.contestants) fill(ctx, c, dt);
  ctx.def.update(dt, ctx);
  if (ctx.local && ctx.local.bal) { G.dbg.lean = [+ctx.local.bal.x.toFixed(3), +ctx.local.bal.y.toFixed(3)]; G.dbg.source = ctx.local.intent.source; }
  if (ctx.time >= ctx.dur || ctx.finished) G.endRun(ctx);
};
G.endRun = ctx => {
  if (ctx.done) return; ctx.done = true; ctx.live = false; if (ctx.def.stop) ctx.def.stop(ctx);
  for (const c of ctx.contestants) { const res = ctx.def.result(ctx, c) || { pct: 0 }; c.pct = clamp(res.pct, 0, 1); c.detail = res.detail || ''; c.stars = G.starsFor(ctx.def, c.pct); c.score = Math.round(c.pct * 1000); }
};
/** the room behind a card: nothing is scored, bodies keep breathing */
G.previewRun = (ctx, dt) => { if (ctx.def.preview) ctx.def.preview(dt, ctx); };
G.drawRun = (r, ctx) => {
  ctx.def.draw(r, ctx);
  if (ctx.def.hud) r.overlay(g => ctx.def.hud(g, ctx));
  G.handCursor(r, ctx);
};
G.left = ctx => Math.max(0, ctx.dur - ctx.time);
/** the local cue: only the player's own body makes these sounds */
G.cue = (ctx, c) => !!(c && c.local && !ctx.quiet);
/** body feedback every Balance activity shares: chime with the streak, creak and rumble at the edge */
G.feelBalance = (ctx, c, dt) => {
  if (!G.cue(ctx, c)) return; const b = c.bal; c.chimeT = (c.chimeT || 0) - dt; c.creakT = (c.creakT || 0) - dt;
  if (b.inRing && b.streak > .4 && c.chimeT <= 0) { c.level = (c.level === undefined ? -1 : c.level) + 1; G.chime(c.level); c.chimeT = 1.1; }
  if (!b.inRing) c.level = -1;
  const e = b.edge;
  if (e > .68 && c.creakT <= 0 && !b.stumbling) { G.A.sfx('creak', { vol: .4 + e * .6 }); c.creakT = .5 - e * .25; if (c.input) c.input.rumble(.15 + (e - .68) * 1.8, .12); }
};
/** after a run, the bodies react: bow, cheer, or carry on */
G.celebrate = (ctx, dt) => {
  for (const c of ctx.contestants) { c.rig.body = null; c.rig.wob = [0, 0]; const P = c.poser; P.clip(c.stars >= 3 ? 'Cheering_Two_Hands' : c.stars >= 1 ? 'Victory' : c.stars === 0 && c.local ? 'Get_Up_From_Back' : 'Idle_Subtle', { loop: c.stars < 1 || true, tgt: 1.45, fade: .3 }); P.update(dt); c.rig.update(dt, { x: c.x, y: c.benchY || 0, z: 0, vx: 0, vy: 0, facing: P.facing, expr: c.stars >= 1 ? 'smile' : undefined }); }
  if (ctx.teacher && (ctx.teacherPoser || (ctx.teacherPoser = new G.Poser(ctx.teacher)))) { ctx.teacher.body = null; ctx.teacherPoser.clip('Greeting', { loop: true, tgt: 1.6, fade: .3, speed: .8 }); ctx.teacherPoser.update(dt); ctx.teacher.update(dt, { x: ctx.teacherX, y: -6, z: 0, vx: 0, vy: 0, facing: ctx.teacherPoser.facing }); }
};
/** with a mouse, the OS cursor hides during activities and a small soft hand stands in */
G.handCursor = (r, ctx) => {
  const c = ctx.local, I = game.input, on = ctx.live && !ctx.done && c && c.intent.source === 'mouse' && !game.paused; const cv = game.screen && game.screen.canvas; if (cv && cv.style) cv.style.cursor = on ? 'none' : '';
  if (!on) return; const p = I.pointer(); if (!p) return;
  r.overlay(g => { const x = Math.round(p[0]), y = Math.round(p[1]), { px } = E; px.disc(g, x, y + 1, 5, '#20404c55'); px.disc(g, x, y, 4, '#ffe0cf'); px.disc(g, x - 1, y - 1, 2, '#fff3ea'); for (const k of [-3, -1, 1, 3]) px.rect(g, x + k - .5, y - 7, 1.5, 4, '#ffe0cf'); });
};
/** a bird: gulls and pigeons */
G.makeBird = (kind = 'gull') => { const gull = kind === 'gull'; return new E.Blob({ R: gull ? 4 : 3, wings: true, feet: true, face: 'front', colors: gull ? { dk: '#9fb5bc', base: '#ffffff', lt: '#ffffff', spec: '#ffffff', eye: '#20404c', pupil: '#20404c' } : { dk: '#6a7a84', base: '#9aa8b0', lt: '#c6d0d6', spec: '#ffffff', eye: '#20404c', pupil: '#20404c' } }); };
/** the stage's camera: the whole body at ten feet */
G.stageCam = (z = 30, y = 8) => { game.cam.smooth = 0; game.follow(null); game.focus(0, y, z); };
})();
