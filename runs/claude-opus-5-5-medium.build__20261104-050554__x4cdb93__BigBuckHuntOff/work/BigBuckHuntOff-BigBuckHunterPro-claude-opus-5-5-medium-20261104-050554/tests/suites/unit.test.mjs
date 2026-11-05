// Unit checks: lens, terrain, quadruped, shots and zones, scoring, ranks, prompts and glyphs, captions that fit.
import { load } from '../lib/load.mjs';
import { check, done } from '../lib/check.mjs';
const { B, E, game } = load();
game.advance(.2);
// ---- lens ----
const L = new B.Lens({ x: 10, y: 20, z: 5, yaw: .7, pitch: 4, fov: 30, W: 480, H: 270 });
let worst = 0;
for (let k = 0; k < 50; k++) { const P = [10 + Math.cos(k) * 60 + 40 * Math.cos(.7), 20 + Math.sin(k * 1.3) * 30 + 40 * Math.sin(.7), 2 + (k % 7)]; const s = L.project(...P); if (!s) continue; const d = L.ray(s[0], s[1]); const t = (P[0] - L.x) / d[0]; const Q = [L.x + d[0] * t, L.y + d[1] * t, L.z + d[2] * t]; worst = Math.max(worst, Math.hypot(Q[0] - P[0], Q[1] - P[1], Q[2] - P[2])); }
check('lens: project then ray returns the point', worst < 1e-6, worst);
check('lens: the horizon row follows the pitch', Math.abs(L.horizonY - (135 - L.f * Math.tan(4 * B.DEG))) < 1e-9);
const M = L.magnified(300, 100, 3.5, 108, 108), r1 = L.ray(300, 100), r2 = M.ray(54, 54);
check('lens: the scope lens centre ray equals the main ray', Math.hypot(r1[0] - r2[0], r1[1] - r2[1], r1[2] - r2[2]) < 1e-9);
// ---- terrain ----
const w = B.loadWorld('hollow');
let bad = 0; for (let k = 0; k < 40; k++) { const o = [300 + k * 5, 300 + k * 3, w.groundAt(300 + k * 5, 300 + k * 3) + 6], d = [Math.cos(k), Math.sin(k), -.08]; const l = Math.hypot(...d); d[0] /= l; d[1] /= l; d[2] /= l; const t = w.rayHit(o, d, 300, false); let bf = null; for (let s = .05; s < 300; s += .05) { const x = o[0] + d[0] * s, y = o[1] + d[1] * s; if (o[2] + d[2] * s < w.topAt(x, y)) { bf = s; break; } } if ((t === null) !== (bf === null) || (t !== null && Math.abs(t - bf) > .3)) bad++; }
check('terrain: rayHit agrees with brute force', bad <= 1, bad);
const w2 = new B.Heightfield(B.get('hunt', 'hollow'), { noColor: true });
check('terrain: generation is stable for its seed', w2.ground[12345] === w.ground[12345] && w2.trees.length === w.trees.length);
const v = w.vantages.creekStand; let blocked = 0;
for (let k = 0; k < 30; k++) { const [x, y] = B.rel(v, -30 + k * 2, 25 + (k % 5) * 8), tz = w.groundAt(x, y) + .8, o = [v.x, v.y, v.z], d = [x - v.x, y - v.y, tz - v.z], l = Math.hypot(...d); const t = w.rayHit(o, d.map(q => q / l), l - .5, false); if (t !== null) blocked++; }
check('terrain: the site fan is clear from the stand', blocked <= 2, blocked);
let wl = 0; for (let i = 0; i < w.water.length; i += 7) if (!isNaN(w.water[i]) && w.ground[i] > w.water[i] + .01) wl++;
check('terrain: water lies over its bed', wl < 40, wl);
// ---- quadruped ----
const q = new B.Quadruped({ species: 'deer', sex: 'buck', size: 1, antlers: { kind: 'whitetail', points: 10, seed: 3 } });
let finite = true;
for (const sp of [0, 1.5, 4, 8, 11]) for (let k = 0; k < 120; k++) { q.update(1 / 120, { x: k * sp / 120, y: 0, z: 0, heading: 0, speed: sp, ground: () => 0 }); for (const p of q.parts) for (const c of p.a.concat(p.b)) if (!isFinite(c)) finite = false; }
check('quadruped: joints stay finite through every gait', finite);
const stand = q.J.pelvis[2]; for (let k = 0; k < 240; k++) q.update(1 / 120, { x: 0, y: 0, z: 0, heading: 0, speed: 0, dead: 1, ground: () => 0 });
check('quadruped: the death pose lies low', q.J.pelvis[2] < .55 * Math.max(stand, .9), q.J.pelvis[2] + ' vs ' + stand);
const a1 = B.antlers('whitetail', 10, 7), a2 = B.antlers('whitetail', 10, 7);
check('antlers: deterministic per seed', JSON.stringify(a1) === JSON.stringify(a2));
const q2 = new B.Quadruped({ species: 'deer', sex: 'buck', size: 1 }); q2.update(.1, { x: 0, y: 0, z: 0, heading: 0, speed: 0, ground: () => 0 });
const heart = q2.inner[0].a, chest = q2.parts.find(p => p.zone === 'chest');
const dist = (p, a, b) => { const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], l2 = u[0] ** 2 + u[1] ** 2 + u[2] ** 2, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * u[0] + (p[1] - a[1]) * u[1] + (p[2] - a[2]) * u[2]) / l2)); return Math.hypot(p[0] - a[0] - u[0] * t, p[1] - a[1] - u[1] * t, p[2] - a[2] - u[2] * t); };
check('zones: the heart sits inside the body', q2.parts.some(p => (p.zone === 'chest' || p.zone === 'gut') && dist(heart, p.a, p.b) < Math.max(p.ra, p.rb)), JSON.stringify(heart));
// ---- shots through a site ----
B.reseed(3);
const P0 = new B.Player(0, null), play = new B.Play({ players: [P0] }), site = play.startSite('hollow-1');
site.co = { step() {}, done: false }; site.critCo = null;
const buck = site.S.pattern('stand', { kind: 'buck', from: [-2, 46], at: [0, 46], to: [2, 46], secs: 99 }); buck.pathD = buck.path.length / 2; buck.orders = [['stand', 99]];
for (let k = 0; k < 30; k++) play.update(1 / 120);
const aimZone = z => { const pt = B.aimPointOf(buck, z), Pp = site.lens.project(...pt); return B.castShot(site, site.lens, Pp[0], Pp[1]); };
check('shot: a ray at the heart scores heart', aimZone('heart').zone === 'heart', JSON.stringify(aimZone('heart').crossed));
check('shot: a ray at the head scores head', aimZone('head').zone === 'head', aimZone('head').zone);
const abv = site.lens.project(buck.x, buck.y, buck.z + 6);
check('shot: above the animal misses it', !B.castShot(site, site.lens, abv[0], abv[1]).actor);
// a trunk in front blocks
const pt = B.aimPointOf(buck, 'heart'), mid = [(pt[0] + site.lens.x) / 2, (pt[1] + site.lens.y) / 2];
site.world.occluders.push({ type: 'cyl', x: mid[0], y: mid[1], r: .5, z0: -50, z1: 50, test: true });
check('shot: a trunk in front blocks', aimZone('heart').kind === 'occluder');
site.world.occluders = site.world.occluders.filter(o => !o.test);
// a doe in front of the buck takes the shot
const doe = site.S.pattern('stand', { kind: 'doe', from: [-2, 36], at: [0, 36], to: [2, 36], secs: 99 }); doe.pathD = doe.path.length / 2; doe.orders = [['stand', 99]]; doe.x = pt[0] * .965 + site.lens.x * .035; doe.y = pt[1] * .965 + site.lens.y * .035;
for (let k = 0; k < 2; k++) play.update(1 / 120); doe.x = pt[0] * .965 + site.lens.x * .035; doe.y = pt[1] * .965 + site.lens.y * .035; doe.z = site.world.groundAt(doe.x, doe.y); doe.heading = buck.heading; doe.syncRig(0, site);
const rd = aimZone('heart'); check('shot: a doe in front takes the shot', rd.actor === doe, rd.actor && rd.actor.kind);
doe.gone = true;
// fire for real: kill, points, the bag
P0.ret = site.lens.project(...B.aimPointOf(buck, 'heart')).slice(0, 2); const res = play.fire(P0, P0.ret[0], P0.ret[1]);
check('fire: a heart shot kills and scores', buck.dead && P0.site.score > 0 && buck.bagger === 0, buck.dead + ' ' + P0.site.score);
// ---- scoring ----
const fake = { species: 'whitetail', points: 8, spread: 0 };
const kp = B.killPoints(fake, 'heart', 100, false);
check('score: base x distance x zone', kp.pts === Math.round(220 * 2 * 2), kp.pts);
check('score: running shots pay more', B.killPoints(fake, 'lung', 50, true).pts > B.killPoints(fake, 'lung', 50, false).pts);
check('score: distance caps at 3.5x', B.killPoints(fake, 'gut', 900, false).dm === 3.5);
check('ranks at the boundaries', B.rankFor(0, 1000) === 'GREENHORN' && B.rankFor(400, 1000) === 'TENDERFOOT' && B.rankFor(1250, 1000) === 'LEGEND OF THE LODGE');
// ---- the weapon ----
const W0 = new B.Player(0, null); W0.resetSite(); let t = 0;
const st = (it, s = 1 / 120) => { const r = B.stepPlayer(W0, s, { intent: Object.assign({ move: [0, 0] }, it), W: 480, H: 270, t }); t += s; return r; };
check('rifle: fires when chambered', !!st({ fire: true }) && W0.rounds === 4 && !W0.chambered);
check('rifle: dry click when not pumped', !st({ fire: true }) && W0.dry > 0);
st({ pump: true }); for (let k = 0; k < 30; k++) st({});
check('rifle: pumping chambers the next round', W0.chambered, W0.rack);
for (let k = 0; k < 4; k++) { st({ fire: true }); for (let j = 0; j < 15; j++) st({}); st({ pump: true }); for (let j = 0; j < 40; j++) st({}); }
check('rifle: an empty tube makes the pump reload', W0.reload > 0 || W0.rounds === 5, W0.rounds + ' ' + W0.reload);
for (let k = 0; k < 200; k++) st({}); check('rifle: the reload refills the tube', W0.rounds === 5 && W0.chambered);
W0.scoped = true; W0.scopeK = 1; const s1 = B.sway(W0, 3); W0.breathHeld = true; const s2 = B.sway(W0, 3); W0.breathHeld = false;
check('scope: sway shrinks while holding breath', Math.hypot(...s2) < Math.hypot(...s1) * .3 || Math.hypot(...s1) < .01);
for (let k = 0; k < 120 * 4; k++) st({ scope: true, breath: true });
check('scope: breath runs out and forces a shaky exhale', W0.shaky > 0 || W0.breath < .5, W0.breath + ' ' + W0.shaky);
const c0 = W0.calls; st({ call: true }); st({ call: true }); check('call: spends a charge, with a cooldown', W0.calls === c0 - 1, c0 + ' ' + W0.calls);
// ---- prompts and glyphs ----
I0: {
  const I = game.input; I.lastDevice = 'gamepad'; game.settings.set('glyphs', 'playstation');
  check('glyphs: PlayStation by default on a pad', B.glyphFor('confirm', I).text === '✕' && B.glyphFor('call', I).text === '△');
  game.settings.set('glyphs', 'xbox'); check('glyphs: Xbox letters by setting', B.glyphFor('confirm', I).text === 'A' && B.glyphFor('fire', I).text === 'RT');
  game.settings.set('glyphs', 'playstation');
  I.lastDevice = 'mouse'; I._bbMouse = true; check('glyphs: the mouse shows the click for fire', B.glyphFor('fire', I).kind === 'mouse');
  check('glyphs: R for pump on keyboard and mouse', B.glyphFor('pump', I).text === 'R');
  I.lastDevice = 'keyboard'; I._bbMouse = false; check('glyphs: keys on the keyboard', B.glyphFor('call', I).text === 'Q');
}
// ---- captions and banners fit the screen ----
let wide = []; for (const k in B.BARKS) for (const l of B.BARKS[k]) if (E.font.width(l) > 480 * .7 * 1.6) wide.push(l);
for (const b of B.all('beat')) for (const [, l] of b.lines) if (E.font.wrap(l, 480 * .7).length > 3) wide.push(l);
check('every bark and line fits at 10 feet', !wide.length, wide.join(' | '));
for (const z in B.ZONE) if (E.font.width(B.ZONE[z].call) * 4 > 480) wide.push(z);
check('every zone banner fits at scale 4', !wide.length, wide.join(','));
// ---- the registries ----
let missing = []; for (const h of B.HUNT_IDS) { const H = B.get('hunt', h); for (const s of H.sites) if (!B.REG.site[s]) missing.push(s); if (!B.REG.trophy[H.trophy]) missing.push(H.trophy); if (!B.REG.bonus[H.bonus]) missing.push(H.bonus); }
for (const s of B.all('site')) if (!B.get('hunt', s.hunt).vantages[s.vantage]) missing.push(s.id + '.vantage');
check('every referenced id exists', !missing.length, missing.join(','));
check('no errors', !game.errors.length, game.errors.map(e => e.message).join('|'));
done();
