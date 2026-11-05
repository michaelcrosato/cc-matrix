import { run } from './lib/t.mjs';
import { load } from './lib/load.mjs';
import { readFileSync, readdirSync } from 'node:fs';
run('unit', async t => {
  const L = load({}), { E, game } = L, X = game.debug.internals, M = X.M, DEG = X.DEG;
  // ---- lens ----
  const lens = new E.Lens().setup({ x: 100, y: 200, z: 50, yaw: .7, pitch: 4, fov: 27 }, 480, 270);
  const p = lens.project(900, 640, 80), r = lens.ray(p[0], p[1]);
  t.ok('lens: project then ray returns the point', t.near(r.x + r.dx * p[3], 900, 1e-6) && t.near(r.y + r.dy * p[3], 640, 1e-6) && t.near(r.z + r.dz * p[3], 80, 1e-6));
  t.ok('lens: the horizon row matches the pitch', t.near(lens.hy, 135 - lens.f * Math.tan(4 * DEG), 1e-9));
  const m = lens.magnified(300, 100, 3.5, 54, 54, 108, 108), rc = m.ray(54, 54), q = lens.project(rc.x + rc.dx * 500, rc.y + rc.dy * 500, rc.z + rc.dz * 500);
  t.ok('lens: the scope centre ray is the main ray at the aim point', t.near(q[0], 300, 1e-6) && t.near(q[1], 100, 1e-6));
  const ang = lens.angles(222, 111), back = lens.fromAngles(ang[0], ang[1]);
  t.ok('lens: aim angles round-trip (ghosts)', back && t.near(back[0], 222, 1e-6) && t.near(back[1], 111, 1e-6));
  // ---- terrain ----
  const W = X.worldFor('hollow'), hf = W.hf;
  const hf2 = new E.Heightfield({ N: 1024 }); hf2.generate(Object.assign({}, hf.spec));
  t.ok('terrain: generation is the same for the same seed', hf2.hash === hf.hash, hf.hash + ' vs ' + hf2.hash);
  let riverOk = true; for (const [x, y] of [[528, 425], [556, 520], [512, 360]]) { const w = hf.waterAt(x * M, y * M), g = hf.height(x * M, y * M); if (w === null || w <= g) riverOk = false; }
  t.ok('terrain: the creek has water above its bed', riverOk);
  const e1 = W.eye('creekStand'), S1 = X.reg('site', 'hollow-1');
  let blocked = 0; for (let i = 0; i < 50; i++) { const b = S1.frame.bearings[0] + (S1.frame.bearings[1] - S1.frame.bearings[0]) * (i % 10) / 9, d = 18 + (i / 50) * 38, P = W.at('creekStand', b, d), o = { x: e1.x, y: e1.y, z: e1.z }, dv = { dx: P.x - o.x, dy: P.y - o.y, dz: P.z + 12 - o.z }, hit = hf.rayHit(o, dv, .97); if (hit !== null) blocked++; }
  t.ok('terrain: clearView leaves the fan visible from the eye', blocked <= 3, blocked + ' of 50 sightlines blocked');
  { const o = { x: 520 * M, y: 300 * M, z: hf.height(520 * M, 300 * M) + 60 * M }, d = { dx: 1, dy: .3, dz: -.2 }, t1 = hf.rayHit(o, d, 8000); let bf = null; for (let s = 0; s < 8000; s += .5) { const x = o.x + d.dx * s, y = o.y + d.dy * s, z = o.z + d.dz * s; if (z < hf.height(x, y)) { bf = s; break; } } t.ok('terrain: rayHit agrees with brute force', t1 !== null && bf !== null && Math.abs(t1 - bf) < 2, t1 + ' vs ' + bf); }
  // ---- renderer occlusion (headless: its buffers still fill) ----
  const V = W.vista, T2 = new E.VistaTarget(160, 90), L2 = new E.Lens().setup({ x: e1.x, y: e1.y, z: e1.z, yaw: e1.yaw, pitch: 4, fov: 27 }, 160, 90);
  V.render(T2, L2, []);
  let mono = true; for (let c = 0; c < 160; c++) { const n = T2.occN[c], b = c * 640; for (let k = 1; k < n; k++) if (!(T2.occD[b + k] > T2.occD[b + k - 1] && T2.occY[b + k] < T2.occY[b + k - 1])) mono = false; }
  t.ok('vista: occlusion breakpoints are monotonic per column', mono);
  let agree = 0; for (let k = 0; k < 40; k++) { const c = (k * 37) % 160, D = (20 + k * 3) * M, oc = T2.occ(c, D); let ref = 90; const u = (c + .5 - L2.cx) / L2.f, dx = L2.Fx + L2.Rx * u, dy = L2.Fy + L2.Ry * u; let s = 12; while (s < D) { const x = L2.x + dx * s, y = L2.y + dy * s; let h = hf.height(x, y); const wl = hf.waterAt(x, y); const cr = 0; if (wl !== null && wl > h) h = wl; const yy = Math.max(0, Math.ceil(L2.hy - (h - L2.z) * L2.f / s)); if (yy < ref) ref = yy; s += Math.max(3, s * .0062); } if (Math.abs(ref - oc) <= 2) agree++; }
  t.ok('vista: occ() matches a brute-force march', agree >= 34, agree + ' of 40');
  // ---- quadruped ----
  let finite = true, slide = 0, slideN = 0;
  for (const sp of ['whitetail', 'elk', 'moose', 'wolf', 'squirrel']) for (const v of [1.3, 3.5, 8.5]) {
    const R = new E.Quadruped({ species: sp, sex: 'm', antlers: { points: 8, seed: 2 } }); let x = 0, prev = null;
    for (let i = 0; i < 360; i++) { x += v * M / 120; R.update(1 / 120, { x, y: 0, vx: v * M, vy: 0, facing: 0, ground: () => 0 }); for (const k in R.J) for (const c of R.J[k]) if (!isFinite(c)) finite = false; for (const lp of R.legPts) for (const c of lp.hoof) if (!isFinite(c)) finite = false;
      const L0 = R.legs[0]; if (i > 120 && !L0.swing && prev && !prev.swing && prev.at === L0.at) { slideN++; } prev = { swing: L0.swing, at: L0.at };
    }
  }
  t.ok('quadruped: every joint stays finite through each gait', finite);
  { const R = new E.Quadruped({ species: 'whitetail' }); let maxMove = 0, wasPlanted = null; let x = 0; for (let i = 0; i < 600; i++) { x += 1.3 * M / 120; R.update(1 / 120, { x, y: 0, vx: 1.3 * M, vy: 0, facing: 0, ground: () => 0 }); const L0 = R.legs[1]; const hw = [R.x + R.legPts[1].hoof[0], R.y + R.legPts[1].hoof[1]]; if (!L0.swing) { if (wasPlanted) maxMove = Math.max(maxMove, Math.hypot(hw[0] - wasPlanted[0], hw[1] - wasPlanted[1])); else wasPlanted = hw; } else wasPlanted = null; } t.ok('quadruped: planted hooves stay put during stance', maxMove < .5, 'moved ' + maxMove.toFixed(2)); }
  { const R = new E.Quadruped({ species: 'whitetail' }); R.update(1 / 120, { x: 0, y: 0, ground: () => 0 }); const h0 = R.J.withers[2]; for (let i = 0; i < 160; i++) R.update(1 / 120, { x: 0, y: 0, ground: () => 0, dead: Math.min(1, i / 120) }); t.ok('quadruped: the death pose ends low', R.J.withers[2] < h0 * .55, R.J.withers[2].toFixed(1) + ' of ' + h0.toFixed(1)); }
  { const R = new E.Quadruped({ species: 'elk', sex: 'm', antlers: { points: 12, seed: 3 } }); R.update(1 / 120, { x: 0, y: 0, ground: () => 0 }); const z = R.zones(1), heart = z.find(q => q.id === 'heart'), sec = R.secs[1]; t.ok('quadruped: the heart sits inside the chest', heart && Math.hypot(heart.a[0] - sec.c[0], heart.a[1] - sec.c[1]) < sec.rv * 2 && heart.a[2] < sec.c[2] + sec.rv && heart.a[2] > sec.c[2] - sec.rv); }
  { const a1 = E.Antlers.make('typical', 8, 5), a2 = E.Antlers.make('typical', 8, 5), a3 = E.Antlers.make('typical', 10, 5); t.ok('antlers: deterministic per seed', JSON.stringify(a1) === JSON.stringify(a2)); t.ok('antlers: the points asked for (tines + beams)', a1.lines.length === 8 && a3.lines.length === 10, a1.lines.length + ' / ' + a3.lines.length); }
  // ---- weapon ----
  { const P = new X.Player(1, game.input), R = P.rifle; R.setup({}); const t0 = 10; t.ok('rifle: starts full and chambered', R.rounds === 5 && R.chambered); t.ok('rifle: fires', R.fire(t0) === true && R.rounds === 4 && !R.chambered); t.ok('rifle: dry click with an empty chamber', R.fire(t0 + 1) === false);
    R.pump(); for (let i = 0; i < 25; i++) R.update(1 / 120); const notYet = !R.chambered; for (let i = 0; i < 3; i++) R.update(1 / 120); t.ok('rifle: a pump racks in .22 s', notYet && R.chambered && R.rackT === 0);
    for (let k = 0; k < 4; k++) { R.fire(20 + k); R.pump(); for (let i = 0; i < 30; i++) R.update(1 / 120); } t.ok('rifle: the tube empties after five', R.rounds === 0 && !R.chambered, R.rounds + ' ' + R.chambered);
    R.pump(); for (let i = 0; i < 160; i++) R.update(1 / 120); t.ok('rifle: an empty tube reloads to five', R.rounds === 5 && R.chambered); }
  { const P = new X.Player(1, game.input); P.forceAuto = true; const R = P.rifle; R.setup({}); R.fire(30); for (let i = 0; i < 50; i++) R.update(1 / 120); t.ok('rifle: auto-pump racks by itself', R.chambered); }
  { const P = new X.Player(1, game.input), S = P.scope; S.update(.2, true, false); const s1 = S.sway(); S.t = 5; const a = Math.hypot(...S.sway()); S.holding = true; const b = Math.hypot(...S.sway()); t.ok('scope: holding breath shrinks the sway', b < a * .3 + 1e-9, a + ' ' + b); S.holding = false; S.breath = X.T('breath'); for (let i = 0; i < 400; i++) S.update(1 / 120, true, true); t.ok('scope: the breath runs out after 3 s and shakes', S.shaky > 0 && !S.holding); }
  { const P = new X.Player(1, game.input), C = P.call; C.reset(); const n = C.charges; t.ok('call: spends a charge', C.use() && C.charges === n - 1); t.ok('call: a cooldown follows', !C.use()); }
  // ---- shots on posed animals ----
  X.startHunt({ mode: 'single', hunt: 'hollow', seed: 3 }); L.step(.3); game.debug.skip(); L.step(.1); const H = X.G.hunt; H.skipTo('site', 'hollow-1'); L.step(.5);
  const mk = (kind, b, d, o = {}) => { const a = H.site.spawn(kind, Object.assign({ at: [b, d], orders: [['hold']], hidden: false, points: 8 }, o)); a.appear(); a.orders = [['hold']]; a.nextOrder(); a.heading = H.cam.yaw + Math.PI / 2; a.rig.facing = a.heading; for (let i = 0; i < 60; i++) a.update(1 / 120); return a; };
  H.setupLens();
  const zoneRay = (a, id) => { const z = id === 'ham' ? a.zones().find(q => q.id === id && q.kind === 'sphere') : a.zones().find(q => q.id === id), c = z.kind === 'sphere' || z.kind === 'ell' ? (z.c || z.a) : [(z.a[0] + z.b[0]) / 2, (z.a[1] + z.b[1]) / 2, (z.a[2] + z.b[2]) / 2], q2 = H.lens.project(c[0], c[1], c[2]); return H.lens.ray(q2[0], q2[1]); };
  const buck = mk('buck', 0, 30);
  for (const id of ['heart', 'head', 'neck', 'ham']) { const R = X.resolveRay(H, zoneRay(buck, id)); t.ok('shot: a ray through the ' + id + ' scores it', R.actor === buck && R.zone === id, (R.actor ? R.actor.kind : R.kind) + ' ' + R.zone); }
  { const R = X.resolveRay(H, zoneRay(buck, 'heart')); t.ok('shot: through the heart the lung is crossed first, heart still scores', R.all && R.all.some(h => h.id === 'lung') && R.zone === 'heart'); }
  const doe = mk('doe', 0, 20); { const R = X.resolveRay(H, zoneRay(buck, 'heart')); t.ok('shot: a doe in front of a buck takes the shot', R.actor === doe, R.actor ? R.actor.kind : R.kind); } doe.state = 'gone';
  { const w = H.world.at(H.vantageId, 0, 25), tree = H.world.place('oak', w.x, w.y, {}); H.extraOcc = []; const R = X.resolveRay(H, zoneRay(buck, 'heart')); t.ok('shot: a trunk in front blocks', R.kind === 'prop', R.kind); H.world.remove(tree); }
  { const zA = buck.zones().filter(q => q.id === 'antler').sort((u, v) => Math.max(v.a[2], v.b[2]) - Math.max(u.a[2], u.b[2]))[0]; const c = zA.a[2] > zA.b[2] ? zA.a : zA.b, q2 = H.lens.project(c[0], c[1], c[2] - .2), R = X.resolveRay(H, H.lens.ray(q2[0], q2[1])); if (R.actor === buck && R.zone === 'antler') { const hp = buck.hp; X.applyShot(H, Object.assign(R, { shot: { p: H.players[0], ray: H.lens.ray(q2[0], q2[1]) } })); t.ok('shot: an antler ping does no damage', buck.hp === hp && buck.alive); } else t.ok('shot: an antler ray finds the antlers', false, R.kind + ' ' + R.zone); }
  { const R = X.resolveRay(H, H.lens.ray(H.W / 2, H.H - 2)); t.ok('shot: the ground takes a low shot', R.kind === 'ground' || R.kind === 'water', R.kind); }
  { const P2 = new X.Player(2, game.input); H.players.push(P2); for (const p of H.players) p.resetSite(); const site = H.site; site.results.push(new (Object.getPrototypeOf(site.results[0]).constructor)(P2)); const s0 = H.players[0].score; const b2 = mk('buck', 6, 32); const ray = zoneRay(b2, 'heart'); X.resolveShots(H, [{ p: H.players[0], ray }, { p: P2, ray }]); t.ok('shot: equal zones in one step share the kill', b2.state === 'dying' && site.results[0].kills.length && site.results[0].kills[site.results[0].kills.length - 1].shared === 2 && site.results[1].kills.length === 1); H.players.pop(); site.results.pop(); }
  // ---- score ----
  { const a = { sp: X.reg('species', 'whitetail'), points: 8, trophy: null, hits: [{ pn: 1 }], label: 'BUCK', id: 'x' }, P = { n: 1, lastKillT: -9 }, Hx = { time: 100 }; const k = X.scoreKill(Hx, P, a, { zone: 'heart', dist: 100 }, {}); t.ok('score: base x distance x zone', k.points === Math.round((100 + 15 * 8) * 2 * X.T('heartMult')), k.points); const k2 = X.scoreKill(Hx, P, a, { zone: 'lung', dist: 25 }, {}); t.ok('score: a second kill within 1.5 s is a DOUBLE (+250)', k2.multi === 250 && k2.multiN === 2); Hx.time = 101; const k3 = X.scoreKill(Hx, P, a, { zone: 'lung', dist: 25 }, { running: true }); t.ok('score: a third is a TRIPLE (+750), running multiplies', k3.multi === 750 && k3.points === Math.round(220 * 1 * X.T('lungMult') * X.T('runningMult')) + 750); Hx.time = 110; t.ok('score: distance caps at 3.5x', X.scoreKill(Hx, P, a, { zone: 'heart', dist: 900 }, {}).distMult === 3.5); }
  t.ok('score: ranks at their boundaries', X.rankFor(390, 1000) === 'GREENHORN' && X.rankFor(400, 1000) === 'TENDERFOOT' && X.rankFor(999, 1000) === 'SHARPSHOOTER' && X.rankFor(1250, 1000) === 'LEGEND OF THE LODGE');
  { const P = new X.Player(1, game.input); P.addScore(-500); t.ok('score: never below zero', P.score === 0); }
  // ---- prompts and glyphs ----
  { const I = game.input; I.lastDevice = 'gamepad'; game.settings.set('glyphs', 'playstation'); t.ok('glyphs: a pad shows PlayStation by default', X.Glyph.family(I) === 'ps' && X.Glyph.code('fire', I) === 'Pad7' && X.Glyph.word('pump', I) === 'SQUARE'); game.settings.set('glyphs', 'xbox'); t.ok('glyphs: Xbox letters with the setting', X.Glyph.family(I) === 'xbox' && X.Glyph.word('pump', I) === 'X'); game.settings.set('glyphs', 'playstation');
    I.lastDevice = 'mouse'; t.ok('glyphs: with the mouse, fire is the left click', X.Glyph.code('fire', I) === 'Mouse0'); I.lastDevice = 'keyboard'; X.Glyph.mouseUsed = false; t.ok('glyphs: on the keyboard, pump is R', X.Glyph.code('pump', I) === 'KeyR');
    let all = true; for (const a of ['fire', 'pump', 'scope', 'breath', 'call', 'confirm', 'cancel', 'start']) for (const d of ['gamepad', 'keyboard', 'mouse']) { I.lastDevice = d; if (!X.Glyph.code(a, I)) all = false; } t.ok('glyphs: every prompted action has a glyph on every device', all); I.lastDevice = 'keyboard'; }
  { let wide = []; for (const k in X.BARKS) for (const l of X.BARKS[k].lines) if (E.font.width(l) > 360) wide.push(l); for (const k in X.BEATS) for (const [, l] of X.BEATS[k]) if (E.font.width(l) > 1080) wide.push(l); t.ok('text: every bark and line fits its box', !wide.length, wide.join(' | ')); }
  // ---- lint ----
  { const src = readdirSync('src').map(f => readFileSync('src/' + f, 'utf8')).join('\n') + readFileSync('engine/modules/vista.js', 'utf8') + readFileSync('engine/modules/quadruped.js', 'utf8') + readFileSync('engine/modules/babble.js', 'utf8'); t.ok('lint: no Math.random in gameplay or the new modules', !/Math\.random\s*\(/.test(src)); t.ok('lint: no unfinished markers', !/\bTODO\b|\bFIXME\b|\bXXX\b|placeholder|lorem/i.test(src)); }
  { const miss = []; for (const h of X.regAll('hunt')) { for (const s of h.sites) if (!X.has('site', s)) miss.push(s); if (h.trophy && !X.has('trophy', h.trophy)) miss.push(h.trophy); if (h.bonus && !X.has('bonus', h.bonus)) miss.push(h.bonus); for (const b of [h.intro, h.legendBeat, h.bonusBeat]) if (b && !X.has('beat', b)) miss.push(b); if (h.outro) for (const s of ['-ahead', '-behind']) if (!X.has('beat', h.outro + s)) miss.push(h.outro + s); for (const sid of h.sites) for (const c of X.reg('site', sid).critters || []) if (!X.has('critter', c[0])) miss.push(c[0]); } t.ok('lint: every referenced site, trophy, bonus, beat and critter exists', !miss.length, miss.join(', ')); }
  t.ok('no errors', !L.errs().length, L.errs().slice(0, 3).join(' | '));
});
