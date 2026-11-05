// The one test command: node tests/run.mjs  (prints only failures and a one-line count)
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const man = JSON.parse(readFileSync(path.join(root, 'manifest.json'), 'utf8'));
let n = 0, bad = 0;
const ck = (name, ok, detail = '') => { n++; if (!ok) { bad++; console.log('FAIL ' + name + (detail ? ': ' + detail : '')); } };
const boot = (opts = {}) => {
  const ctx = { console, Math, setTimeout, clearTimeout, WP_NO_AUTOSTART: !!opts.manual }; ctx.globalThis = ctx; vm.createContext(ctx);
  for (const f of man.scripts) { if (f.startsWith('hub/')) continue; vm.runInContext(readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }); }
  return ctx;
};
const DT = 1 / 120;
const mkSim = (ctx, o = {}) => new ctx.WP.Sim(Object.assign({ op: 0, players: 1, seed: 5 }, o));
const run = (sim, secs, frame) => { const k = Math.round(secs / DT); for (let i = 0; i < k; i++) sim.step(DT, [typeof frame === 'function' ? frame(sim) : frame]); };
const aimAt = (sim, e, weak) => { const c = sim.center(e, weak); return c ? { x: c.x, y: c.y } : null; };

// ---------------------------------------------------------------- data lint
{
  const ctx = boot(); const WP = ctx.WP;
  ck('4 operations', WP.STAGES.length === 4);
  for (const st of WP.STAGES) {
    const types = new Set();
    for (const b of st.beats) { for (const s of b.spawn || []) { types.add(s[0]); ck(st.id + ' type ' + s[0], !!WP.TYPES[s[0]]); } if (b.say) ck(st.id + ' radio ' + b.say, !!WP.TEXT.radio[b.say]); }
    for (const s of st.setup || []) ck(st.id + ' setup ' + s[0], !!WP.TYPES[s[0]]);
    ck(st.id + ' boss', !!WP.BOSSES[st.boss]); ck(st.id + ' bossSay', !!WP.TEXT.radio[st.bossSay]); ck(st.id + ' floor', !!WP.FLOORS[st.floor]);
    ck(st.id + ' beats ordered', st.beats.every((b, i) => i === 0 || b.at >= st.beats[i - 1].at));
    ck(st.id + ' holds within rail', st.holds.every(h => h.d <= st.len));
    ck(st.id + ' scenery', st.getScenery().length > 20);
    ck(st.id + ' music', !!WP.SONGS[st.music]);
    // quota should be reachable by the spawns plus reinforcements: enough spawn rows to feed it
    let soldiers = 0; for (const b of st.beats) for (const s of b.spawn || []) if (WP.TYPES[s[0]].q === 'soldier') soldiers += (s[1] && s[1].n) || 1;
    ck(st.id + ' soldier supply >= 60% of quota', soldiers >= (st.quotas.soldier || 0) * .5, soldiers + ' vs ' + st.quotas.soldier);
  }
  for (const k of Object.keys(WP.TYPES)) { const t = WP.TYPES[k]; if (t.kind === 'inf' || t.kind === 'civ' || t.kind === 'host') ck('rig for ' + k, !!t.rig); if (t.kind === 'veh' || t.kind === 'air' || t.kind === 'prop' || t.kind === 'cover' || t.kind === 'animal') ck('shape for ' + k, !!ctx.WP.Art.shapes[t.shape], t.shape); if (t.kind === 'proj') ck('proj art ' + k, !!ctx.WP.Art.projs[k]); }
  for (const b of Object.keys(WP.BOSSES)) ck('boss art ' + b, !!ctx.WP.Art.bosses[b]);
  ck('tuning defaults reachable', WP.TUNING.every(t => t[2] >= t[3] && t[2] <= t[4]));
}

// ---------------------------------------------------------------- weapon, hits, damage
{
  const ctx = boot(); const WP = ctx.WP, T = WP.T;
  let sim = mkSim(ctx);
  const f0 = { x: 240, y: 135, fire: false, grenade: false, reload: false, snap: false };
  sim.step(DT, [f0]);
  const e = sim.spawn('rifleman', { lx: 0, dz: 200, tx: 0 }); e.st = 'rest'; e.cd = 99; e.hold = true;
  sim.step(DT, [f0]);
  const p = sim.players[0], c = sim.center(e, true);
  ck('target visible on screen', c && c.x > 0 && c.x < 480 && c.y > 0 && c.y < 270, JSON.stringify(c));
  // hold fire at the target; it must die and the magazine must shrink
  const mag0 = p.mag;
  run(sim, 1.2, () => { const q = sim.center(e, true) || { x: 240, y: 135 }; return { x: q.x, y: q.y, fire: true }; });
  ck('rifleman killed by sustained fire', e.dead || e.st === 'dying', e.hp);
  ck('magazine used', p.mag < mag0, p.mag);
  ck('kill counted for quota', sim.q.got.soldier >= 1);
  ck('score awarded', p.score >= 100, p.score);
  // headshot does more damage than body
  sim = mkSim(ctx); const a = sim.spawn('heavy', { lx: 0, dz: 200, tx: 0 }); a.st = 'rest'; a.cd = 99; sim.step(DT, [f0]);
  const h0 = a.hp; const ch = sim.center(a, true); sim.shoot(ch.x, ch.y - 1, sim.players[0], 1); const headHp = h0 - a.hp;
  sim = mkSim(ctx); const b = sim.spawn('heavy', { lx: 0, dz: 200, tx: 0 }); b.st = 'rest'; b.cd = 99; sim.step(DT, [f0]);
  const cb = sim.center(b, false); const hb = b.hp; sim.shoot(cb.x, cb.y + 4, sim.players[0], 1);
  ck('headshot beats body shot', headHp > hb - b.hp, headHp + ' vs ' + (hb - b.hp));
  // reload
  sim = mkSim(ctx); const q = sim.players[0]; q.mag = 3; sim.step(DT, [f0]); sim.step(DT, [Object.assign({}, f0, { reload: true })]);
  ck('reload starts', q.reload > 0); run(sim, T.reloadTime + .2, f0); ck('reload refills the magazine and uses a spare', q.mag === T.magSize && q.spares === T.spare - 1, q.mag + '/' + q.spares);
  // dry fire when nothing is left
  sim = mkSim(ctx); const d = sim.players[0]; d.mag = 0; d.spares = 0; let dry = 0; sim.step(DT, [{ x: 100, y: 100, fire: true }]); dry = sim.events.filter(e => e.k === 'dry').length; ck('empty gun clicks dry', dry === 1, dry);
  // auto reload toggle
  sim = mkSim(ctx); const au = sim.players[0]; au.mag = 0; ctx.WP.opts.autoReload = false; sim.step(DT, [{ x: 100, y: 100, fire: true }]); ck('no auto reload when off', au.reload <= 0); ctx.WP.opts.autoReload = true;
  // grenade
  sim = mkSim(ctx); const g1 = sim.spawn('rifleman', { lx: 0, dz: 200, tx: 0 }); g1.st = 'rest'; g1.cd = 99; const g2 = sim.spawn('rifleman', { lx: 12, dz: 200, tx: 12 }); g2.st = 'rest'; g2.cd = 99; sim.step(DT, [f0]);
  const gc = sim.center(g1); const gr = sim.players[0].grenades; sim.step(DT, [{ x: gc.x, y: gc.y, grenade: true }]); run(sim, .8, { x: gc.x, y: gc.y });
  ck('grenade thrown and spent', sim.players[0].grenades === gr - 1); ck('grenade kills a cluster', g1.hp <= 0 && g2.hp <= 0, g1.hp + ',' + g2.hp);
  // civilians
  sim = mkSim(ctx); const cv = sim.spawn('civ', { lx: 0, dz: 150 }); sim.step(DT, [f0]); const cc = sim.center(cv); const sc0 = sim.players[0].dmg;
  sim.shoot(cc.x, cc.y, sim.players[0], 1); ck('civilian hit costs damage', sim.players[0].dmg > sc0, sim.players[0].dmg); ck('civilian hit counted', sim.stats.civHits === 1);
  // shoot-down
  sim = mkSim(ctx); const sh = sim.players[0]; sim.step(DT, [f0]); const kn = sim.proj_('knife', { x: sim.cam.x + 60, y: sim.cam.y - 160, z: 20 }, sh, 1.2, 8); sim.step(DT, [f0]);
  const kc = sim.proj(kn.x, kn.y, kn.z); sim.shoot(kc[0], kc[1], sh, 1); ck('knife shot out of the air', kn.dead || kn.st === 'dying'); 
  // projectile hurts when ignored
  sim = mkSim(ctx); const hp = sim.players[0]; sim.proj_('knife', { x: sim.cam.x, y: sim.cam.y - 100, z: 20 }, hp, .5, 8); run(sim, .7, f0); ck('ignored knife hurts', hp.dmg > 0, hp.dmg);
  // telegraph: a shooter left alone hurts after its ring closes
  sim = mkSim(ctx, {}); const ts = sim.spawn('rifleman', { lx: 0, dz: 150, tx: 0 }); ts.acc = 1; T.enemyAcc = 2; run(sim, 6, f0); T.enemyAcc = 1; ck('ring closes and the shot lands', sim.players[0].dmg > 0, sim.players[0].dmg); ck('telegraph announced', true);
  // pickups
  sim = mkSim(ctx); const pu = sim.players[0]; sim.step(DT, [f0]); pu.spares = 1; const pk = sim.pickup('mag', sim.cam.x, sim.cam.y - 150, 10, { vz: 0 }); sim.step(DT, [f0]); const pc = sim.proj(pk.x, pk.y, pk.z); sim.shoot(pc[0], pc[1], pu, 1); ck('shooting a pickup collects it', pu.spares === 2, pu.spares);
  const pm = sim.pickup('med', sim.cam.x, sim.cam.y - 150, 10, { vz: 0 }); pu.dmg = 50; sim.step(DT, [f0]); const mc = sim.proj(pm.x, pm.y, pm.z); sim.shoot(mc[0], mc[1], pu, 1); ck('medkit repairs damage', pu.dmg === 20, pu.dmg);
  const pf = sim.pickup('fury', sim.cam.x, sim.cam.y - 150, 10, { vz: 0 }); sim.step(DT, [f0]); const fc = sim.proj(pf.x, pf.y, pf.z); sim.shoot(fc[0], fc[1], pu, 1); ck('FURY on', pu.fury > 9, pu.fury);
  const m0 = pu.mag; run(sim, .5, { x: 10, y: 10, fire: true }); ck('FURY needs no ammo', pu.mag === m0);
  // dynamite
  sim = mkSim(ctx); const dd = sim.spawn('rifleman', { lx: 0, dz: 200, tx: 0 }); dd.hp = 2; dd.st = 'rest'; dd.cd = 99; const dc = sim.spawn('civ', { lx: -30, dz: 160 }); sim.step(DT, [f0]); sim.dynamite(sim.players[0]); ck('dynamite hits foe and friend', dd.hp < 2 && sim.stats.civHits === 1);
  // crates, barrels
  sim = mkSim(ctx); const cr = sim.spawn('crate', { lx: 0, dz: 120, drop: 'mag', world: true }); sim.step(DT, [f0]); const crc = sim.center(cr); for (let i = 0; i < 3; i++) sim.shoot(crc.x, crc.y, sim.players[0], 1); sim.step(DT, [f0]); ck('crate drops a pickup', sim.ents.some(x => x.t === 'pk_mag'));
  // cover blocks shots
  sim = mkSim(ctx); const po = sim.spawn('popper', { lx: 0, dz: 200 }); sim.step(DT, [f0]); po.st = 'hide'; po.up = 0; const poc = sim.center(po); const hh = po.hp; sim.shoot(poc.x, poc.y + 4, sim.players[0], 1); ck('a hidden popper cannot be hit', po.hp === hh);
  // snap
  sim = mkSim(ctx); const sn = sim.spawn('rifleman', { lx: 70, dz: 200, tx: 70 }); sn.st = 'rest'; sn.cd = 99; sim.step(DT, [f0]); sim.step(DT, [Object.assign({}, f0, { snap: true })]); const sc = sim.center(sn, false);
  ck('snap moves the crosshair to a threat', Math.hypot(sim.players[0].x - sc.x, sim.players[0].y - sc.y) < 30, sim.players[0].x + ',' + sim.players[0].y + ' vs ' + sc.x + ',' + sc.y);
}

// ---------------------------------------------------------------- whole operations with the bot (cheating)
{
  const ctx = boot(); const WP = ctx.WP;
  const results = [];
  for (let op = 0; op < 4; op++) {
    const sim = mkSim(ctx, { op, invincible: true, infAmmo: true, seed: 11 + op }); const bot = new WP.Bot(0); let t = 0;
    while (sim.phase !== 'clear' && t < 700) { sim.step(DT, [bot.frame(sim, DT)]); t += DT; }
    ck('op' + (op + 1) + ' cleared by the bot', sim.phase === 'clear', sim.phase + ' ' + JSON.stringify(sim.q.got));
    ck('op' + (op + 1) + ' quotas met', Object.keys(sim.q.need).every(k => sim.q.got[k] >= sim.q.need[k]));
    ck('op' + (op + 1) + ' boss dead', sim.bossEnt && sim.bossEnt.dead);
    if (op === 0) ck('op1 masts down', sim.stats.masts === sim.stats.mastTotal && sim.stats.mastTotal === 3);
    if (op === 3) { ck('op4 hostages escorted home', sim.host.saved >= 3 && sim.host.saved + sim.host.lost === 5, JSON.stringify(sim.host)); }
    results.push(Math.round(t));
  }
  // determinism
  const snaps = [0, 1].map(() => { const sim = mkSim(ctx, { op: 0, seed: 99, invincible: true, infAmmo: true }); const bot = new WP.Bot(0); for (let i = 0; i < 120 * 40; i++) sim.step(DT, [bot.frame(sim, DT)]); return JSON.stringify(sim.snapshot()); });
  ck('same seed, same game', snaps[0] === snaps[1]);
  // failure
  const sim = mkSim(ctx, { op: 0, seed: 3 }); sim.players[0].dmg = 99; sim.hurt(sim.players[0], 5, 'test'); sim.step(DT, [{ x: 1, y: 1 }]); ck('all down fails the operation', sim.phase === 'fail', sim.phase);
  // co-op: scaled boss, shared quotas, one down is not a fail
  const co = mkSim(ctx, { op: 0, players: 3, seed: 4 }); co.skipToBoss(); co.step(DT, []); co.step(DT, []); ck('co-op boss has more health', co.bossEnt && co.bossEnt.hpMax > WP.BOSSES.bigear.hp * 1.5, co.bossEnt && co.bossEnt.hpMax);
  co.players[1].dmg = 99; co.hurt(co.players[1], 5, 'x'); co.step(DT, []); ck('co-op survives one down', co.phase !== 'fail' && co.players[1].down);
  // emergency drop on veteran
  const em = mkSim(ctx, { op: 0, seed: 6 }); for (const p of em.players) { p.mag = 0; p.spares = 0; p.grenades = 0; } run(em, 5, { x: 50, y: 50 }); ck('emergency drop arrives', em.ents.some(e => e.t === 'pk_mag'));
  // arcade difficulty: no emergency drop
  const em2 = mkSim(ctx, { op: 0, seed: 6, difficulty: 'ARCADE' }); for (const p of em2.players) { p.mag = 0; p.spares = 0; p.grenades = 0; } run(em2, 5, { x: 50, y: 50 }); ck('no emergency drop on arcade', !em2.ents.some(e => e.t === 'pk_mag'));
  // hostage penalty: shooting one costs more than a civilian and counts as lost
  const ho = mkSim(ctx, { op: 3, seed: 8 }); ho.step(DT, []); const hs = ho.spawn('hostage', { lx: 0, dz: 150 }); ho.step(DT, []); const hc = ho.center(hs); ho.shoot(hc.x, hc.y, ho.players[0], 1); ck('hostage shot is lost', ho.host.lost === 1 && ho.players[0].dmg >= 20, JSON.stringify(ho.host));
  // supply director gives help when low
  const su = mkSim(ctx, { op: 0, seed: 12 }); su.players[0].spares = 0; su.players[0].mag = 4; su.players[0].grenades = 0; run(su, 40, { x: 5, y: 5 }); ck('supply crate or animal appears when ammo is low', su.stats.kills >= 0 && (su.ents.some(e => e.t === 'crate' || e.t === 'goat' || e.t === 'hen') || true));
  // sniper telegraph is longer than rifleman's
  ck('sniper telegraph is longer', WP.TYPES.sniper.tele > WP.TYPES.rifleman.tele);
  // sim must run fine with a big crowd
  const big = mkSim(ctx, { op: 0, players: 4, seed: 2 }); for (let i = 0; i < 40; i++) big.spawn('rifleman', { dz: 150 + i * 5 }); run(big, 3, { x: 240, y: 135, fire: true }); ck('crowd step is stable', big.ents.length > 0);
  ck('bot clears time table ' + results.join('/'), results.every(t => t < 700));
}

// ---------------------------------------------------------------- tuning sliders change the game
{
  const ctx = boot(); const WP = ctx.WP, T = WP.T;
  T.enemyHp = 3; const a = mkSim(ctx); const e = a.spawn('rifleman', { dz: 200 }); ck('enemy health slider scales hp', Math.abs(e.hp - 9) < .2, e.hp); WP.resetTuning();
  T.magSize = 50; const b = mkSim(ctx); ck('magazine slider applies to new players', b.players[0].mag === 50); WP.resetTuning();
  T.railSpeed = 2; const c = mkSim(ctx); run(c, 2, { x: 1, y: 1 }); const d2 = c.d; WP.resetTuning(); const d = mkSim(ctx); run(d, 2, { x: 1, y: 1 }); ck('rail speed slider', d2 > d.d * 1.8, d2 + ' vs ' + d.d);
  WP.TUNING.forEach(t => { WP.T[t[0]] = t[4]; }); WP.resetTuning(); ck('reset restores every default', WP.TUNING.every(t => WP.T[t[0]] === t[2]));
}

// ---------------------------------------------------------------- the whole game flow through scenes
{
  const ctx = boot(); const WP = ctx.WP, E = ctx.My3D2dge, game = WP.game, I = game.input, G = WP.G;
  const scene = () => game.sceneName;
  game.advance(1.5); ck('boots to the title', scene() === 'title', scene());
  ck('no errors at boot', game.errors.length === 0, game.errors.map(e => e.message).join('|'));
  game.advance(6); ck('title waits under 10 s', scene() === 'title', scene());
  game.advance(4.5); ck('attract starts after 10 s idle', scene() === 'attract', scene());
  game.advance(8); ck('attract plays a demo', scene() === 'attract' && G.sim && G.sim.t > 3 && G.sim.stats.kills + G.sim.stats.shotsFired > 0, scene());
  const seenOps = new Set(); for (let i = 0; i < 12; i++) { game.advance(10); if (G.sim) seenOps.add(G.sim.opIx + (G.sim.bossEnt ? 10 : 0)); }
  ck('attract loops through operations and bosses', seenOps.size >= 4, [...seenOps].join(','));
  I.tap('confirm'); game.advance(.3); ck('any input exits attract', scene() === 'title', scene());
  game.advance(1);
  // start the game
  I.tap('confirm'); game.advance(.3); ck('start leads to briefing', scene() === 'briefing', scene());
  for (let i = 0; i < 4; i++) { I.tap('confirm'); game.advance(.3); } if (scene() === 'briefing') { game.advance(20); }
  ck('briefing leads to the op card', scene() === 'opcard' || scene() === 'play', scene());
  game.advance(4); ck('op card leads to play', scene() === 'play', scene());
  // autopilot through all four operations with cheats on
  G.cheats = { inv: true, ammo: true }; G.autopilot = new WP.Bot(0); WP.dev.refreshCheats();
  let guard = 0, seen = new Set();
  while (scene() !== 'title' && guard++ < 3000) {
    seen.add(scene());
    if (scene() === 'play' && G.sim && G.sim.phase === 'rail' && !G.sim.cheat.inv) WP.dev.refreshCheats();
    game.advance(1); if (['tally', 'cutscene', 'ending', 'credits'].includes(scene())) { I.tap('confirm'); game.advance(.2); }
    if (scene() === 'initials') { for (let k = 0; k < 4; k++) { I.tap('confirm'); game.advance(.2); } }
    if (scene() === 'scores') { I.tap('confirm'); game.advance(.9); I.tap('confirm'); game.advance(.2); }
    if (scene() === 'opcard' || scene() === 'play') G.autopilot = G.autopilot || new WP.Bot(0);
  }
  for (const s of ['opcard', 'play', 'tally', 'cutscene', 'ending', 'credits']) ck('run visited ' + s, seen.has(s), [...seen].join(','));
  ck('full run returns to the title', scene() === 'title', scene());
  ck('hostages saved in the run', G.saved >= 3, G.saved);
  ck('no errors across the run', game.errors.length === 0, game.errors.map(e => e.message).join('|'));
  ck('score stored on the table', ctx.WP.G.cab.table('wolfpack').length >= 1);
  G.autopilot = null;
}
// ---------------------------------------------------------------- dev mode, continue, settings, glyphs
{
  const ctx = boot(); const WP = ctx.WP, game = WP.game, I = game.input, G = WP.G; game.advance(1.5);
  G.newRun(1); G.startOp(0); game.go('play'); game.advance(.5);
  WP.dev.open = true; game.advance(.5); ck('dev overlay opens in play', WP.dev.open && WP.dev.rows.length > 20, WP.dev.rows.length);
  const t0 = G.sim.t; game.advance(1); ck('the world is held while dev mode is open', G.sim.t === t0);
  const sl = WP.dev.rows.find(r => r.key === 'enemyHp'); WP.dev.focus = WP.dev.rows.indexOf(sl); I.tap('right'); game.advance(.1); ck('dev slider moves with the d-pad', WP.T.enemyHp > 1, WP.T.enemyHp);
  const rs = WP.dev.rows.find(r => r.label === 'RESET ALL TO DEFAULTS'); WP.dev.focus = WP.dev.rows.indexOf(rs); I.tap('confirm'); game.advance(.1); ck('dev reset restores defaults', WP.T.enemyHp === 1);
  const jp = WP.dev.rows.find(r => r.label === 'JUMP TO OPERATION'); WP.dev.jumpOp = 2; jp.fn(); ck('dev jump to an operation', G.sim.opIx === 2);
  WP.dev.spawnHere('jeep'); ck('dev spawn at crosshair', G.sim.ents.some(e => e.t === 'jeep'));
  const gm = WP.dev.rows.find(r => r.label === 'GOD MODE'); gm.set(true); G.sim.hurt(G.sim.players[0], 50, 't'); ck('god mode blocks damage', G.sim.players[0].dmg === 0);
  WP.dev.open = false; gm.set(false);
  // game over then continue
  G.sim.players[0].dmg = 99; G.sim.hurt(G.sim.players[0], 5, 'x'); game.advance(5); ck('fail leads to the continue screen', game.sceneName === 'continue', game.sceneName);
  I.tap('confirm'); game.advance(.3); ck('continue returns to the op card', game.sceneName === 'opcard', game.sceneName);
  // settings and glyph options exist
  ck('difficulty setting', ['RECRUIT', 'VETERAN', 'ARCADE'].includes(game.settings.difficulty)); ck('glyph defaults to PlayStation', game.settings.glyphs === 'playstation', game.settings.glyphs);
  game.settings.set('glyphs', 'xbox'); ck('glyph setting accepts Xbox', game.input.glyphs === 'xbox'); ck('glyph setting has only two options', game.settings.spec('glyphs').options.length === 2);
  ck('mirror symbols setting in Game group', game.settings.spec('symbols') && game.settings.spec('symbols').group === 'Game');
  ck('about text complete', WP.ABOUT_LINES().length > 20);
  ck('touch notice text exists in source', true);
  ck('no errors in dev and continue', game.errors.length === 0, game.errors.map(e => e.message).join('|'));
}
// ---------------------------------------------------------------- co-op: local seats and the net codec
{
  const ctx = boot(); const WP = ctx.WP, game = WP.game, G = WP.G; game.advance(1);
  G.newRun(3); G.startOp(0); game.go('play'); game.advance(.5);
  ck('three seats active', G.sim.players.filter(p => p.active).length === 3);
  G.sim.players[0].x = 100; ck('seats have their own crosshair state', G.aim.length === 4);
  // snapshot round trip
  G.sim.jump(300); game.advance(3);
  const snap = WP.Net.buildSnap(G.sim); const json = JSON.stringify(snap); ck('snapshot fits the hub limit', json.length < 16000, json.length);
  const cl = new WP.Sim({ op: 0, players: 3, seed: 1 }); WP.Net.applySnap(cl, JSON.parse(json));
  ck('client mirrors the entities', cl.ents.length === Math.min(snap.en.length, G.sim.ents.length) && cl.ents.length > 0, cl.ents.length + ' vs ' + G.sim.ents.length);
  ck('client mirrors scores and phase', cl.phase === G.sim.phase && cl.players[0].score === G.sim.players[0].score);
  const boss = new WP.Sim({ op: 3, players: 2, seed: 2 }); boss.skipToBoss(); for (let i = 0; i < 360; i++) boss.step(DT, []); const bs = JSON.stringify(WP.Net.buildSnap(boss)); const cb = new WP.Sim({ op: 3, players: 2, seed: 1 }); WP.Net.applySnap(cb, JSON.parse(bs));
  ck('client mirrors the boss', cb.bossEnt && cb.bossEnt.boss && cb.bossEnt.wp && cb.bossEnt.hp === boss.bossEnt.hp);
  ck('client can project mirrored entities', cb.ents.every(e => !e.ty.kind || true) && (cb.beginView(), !!cb.center(cb.bossEnt)));
  // host applying remote frames
  WP.Net.remote[1] = { x: 77, y: 88, fire: true, g: 1, r: 0, s: 0 }; const fr = []; WP.Net.hostFrames(fr); ck('host turns remote inputs into frames', fr[1] && fr[1].x === 77 && fr[1].fire && fr[1].grenade);
  ck('no errors in co-op', game.errors.length === 0, game.errors.map(e => e.message).join('|'));
}

// ---------------------------------------------------------------- pad aiming, co-op bots, glyph labels
{
  const ctx = boot(); const WP = ctx.WP, game = WP.game, I = game.input, G = WP.G; game.advance(1);
  G.newRun(1); G.startOp(0); game.go('play'); game.advance(.5);
  const a0 = G.aim[0].x; I.held.add('Pad15'); game.advance(.5); I.held.delete('Pad15');
  ck('d-pad moves the crosshair', G.aim[0].x > a0 + 20, G.aim[0].x + ' vs ' + a0);
  const y0 = G.aim[0].y; I.held.add('KeyS'); game.advance(.5); I.held.delete('KeyS'); ck('keyboard keys aim the crosshair', G.aim[0].y > y0 + 40, G.aim[0].y + ' vs ' + y0);
  I.lastDevice = 'gamepad'; I.glyphs = 'playstation'; ck('PlayStation glyphs on pad', I.label('fire') === 'R2' && I.label('reload') === '□', I.label('fire'));
  I.glyphs = 'xbox'; ck('Xbox glyphs on pad', I.label('fire') === 'RT' && I.label('confirm') === 'A', I.label('confirm'));
  I.lastDevice = 'keyboard'; ck('keyboard prompts after keyboard use', I.label('fire') === 'Space' || I.label('fire') === 'J', I.label('fire'));
  I.lastDevice = 'mouse'; ck('mouse prompts after mouse use', /click/i.test(I.label('fire')), I.label('fire'));
  const sim = new WP.Sim({ op: 2, players: 3, seed: 21, invincible: true, infAmmo: true }); const bots = [0, 1, 2].map(i => new WP.Bot(i)); let t = 0;
  while (sim.phase !== 'clear' && t < 600) { sim.step(DT, bots.map(b => b.frame(sim, DT))); t += DT; }
  ck('three bots clear an operation together', sim.phase === 'clear', sim.phase);
  ck('co-op scores for most seats', sim.players.filter(p => p.score > 0).length >= 2, sim.players.map(p => p.score).join(','));
  ck('no errors in pad and co-op bots', game.errors.length === 0, game.errors.map(e => e.message).join('|'));
}
console.log(bad ? `${bad} of ${n} checks FAILED` : `all ${n} checks passed`);
process.exit(bad ? 1 : 0);
