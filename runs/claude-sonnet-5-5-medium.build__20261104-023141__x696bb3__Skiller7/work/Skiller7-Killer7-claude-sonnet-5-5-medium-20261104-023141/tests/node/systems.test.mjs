// Systems: Echo Run, tuning sliders, skills, switching, the Sweep, saves, bosses' rules.
import { load, makeChecker } from '../lib/node-harness.mjs';
const { S7 } = load(); const { check, report } = makeChecker();
const st = S7.st, sim = S7.sim, bot = S7.bot, I = (o = {}) => Object.assign(S7.noIntent(), o);
const run = (sec, o = {}) => { for (let i = 0; i < sec * 60; i++) sim.update(1 / 60, typeof o === 'function' ? o(i) : I(o)); };
// ---- Echo Run, with the bot as the racer
const ev = []; S7.bus.on('echo', d => ev.push(d));
sim.startEcho({ countdown: 3 }); bot.v = { id: 'echo', time: 1e9 }; bot.route = []; bot.t = 0; st.cheats.god = true;
run(1.5); check('the countdown holds the racer', st.echo.t === 0 && st.speed === 0);
let t = 0; while (!st.echo.finished && t < 200) { sim.update(1 / 60, bot.intents(1 / 60)); t += 1 / 60; }
check('Echo Run finishes', st.echo.finished === true, 't=' + t.toFixed(0) + ' ' + st.edge + ' ' + st.s.toFixed(0));
check('thawed targets cut two seconds each', st.echo.result && Math.abs(st.echo.result.cut - 2 * st.echo.hits) < 1e-9 && st.echo.hits > 0, JSON.stringify(st.echo.result));
check('the run was recorded as an echo', st.echo.rec.length > 20, String(st.echo.rec.length));
// ---- tuning
S7.setTune('playerDmg', 99); check('sliders clamp to their range', S7.T('playerDmg') === S7.TUNING.playerDmg.max); S7.resetTune(); check('reset restores the defaults', S7.T('playerDmg') === 1 && S7.T('walkSpeed') === 3.6);
check('every slider has a label, range and default in range', Object.values(S7.TUNING).every(x => x.label && x.min < x.max && x.def >= x.min && x.def <= x.max));
S7.setTune('enemyHp', 2); S7.newState({}); sim.loadArea('00A', 'start'); const g = sim.spawnEnemy('giggler', 10, 10); check('enemy health follows its slider', Math.abs(g.hp - 6) < 1e-9); S7.resetTune();
// ---- skills
S7.newState({}); sim.loadArea('00A', 'j2'); st.done['00A:tw1'] = true; st.mode = 'rail'; st.red = 100;
st.persona = 'vesper'; st.roster.vesper.unlocked = true; const e1 = sim.spawnEnemy('giggler', st.x + 5, st.y); e1.spawnT = 0; st.face = 0; sim.useSkill();
check('Flash stuns and reveals enemies in front', e1.stun > 3 && e1.visible > 3, e1.stun + ' ' + e1.visible);
st.persona = 'rurik'; st.skillCd = 0; sim.useSkill(); check('Flare reveals things nearby and costs Red', st.flare > 0 && st.red < 100);
st.persona = 'anselma'; st.skillCd = 0; sim.useSkill(); check('Tuck speeds the walk', st.tuck > 0 && sim.walkSpeed() > 6);
st.persona = 'mara'; st.roster.mara.unlocked = true; st.skillCd = 0; sim.useSkill(); check('Charge sets a mine', st.mines.length === 1);
st.persona = 'jodl'; st.skillCd = 0; const e2 = sim.spawnEnemy('giggler', st.x + 4, st.y); e2.spawnT = 0; sim.useSkill(); check('Echo stuns nearby Whiteouts', e2.stun > 2);
st.persona = 'baron'; st.roster.baron.unlocked = true; st.skillCd = 0; st.mode = 'aim'; st.preAim = 'rail'; sim.useSkill(); check('Long Look zooms the scope', st.aim.zoom === true);
// ---- the ring and switching
st.mode = 'rail'; st.switchT = 0; st.roster.mara.unlocked = false; check('switching to a coat not yet found fails', sim.switchTo('mara') === false);
st.roster.vesper.frozen = true; check('a frozen coat cannot be worn', sim.switchTo('vesper') === false);
st.roster.vesper.frozen = false; check('a free coat can be worn', sim.switchTo('vesper') === true && st.switchT > .3);
const hp0 = st.roster.vesper.hp; sim.hurtHero(10, 't'); check('switching grants a moment of invulnerability', st.roster.vesper.hp === hp0);
// ---- the Sweep and Room 7
S7.newState({}); sim.loadArea('00A', 'start'); st.roster.rurik.frozen = true; st.roster.rurik.hp = 0; st.persona = 'anselma'; check('the Sweep chips frozen coats out', sim.reviveFrozen() === 1 && !st.roster.rurik.frozen && st.roster.rurik.hp > 0);
// ---- the Wax Bench
S7.newState({}); st.rime = 400; for (const u of S7.UPGRADES) { for (let i = 0; i < 3; i++) sim.buyUpgrade(u.id); }
check('the Bench sells every upgrade to its limit and no further', S7.UPGRADES.every(u => st.upg[u.id] === 3) && sim.buyUpgrade('edge') === 'max' && st.rime >= 0);
S7.newState({}); st.rime = 1; check('the Bench says when you are short', sim.buyUpgrade('edge') === 'poor');
// ---- healing
S7.newState({}); sim.loadArea('00A', 'start'); st.mode = 'rail'; st.roster.rurik.hp = 40; const red0 = st.red; run(1.5, { heal: true }); check('Red heals the active coat', st.roster.rurik.hp > 40 && st.red < red0, st.roster.rurik.hp + ' ' + st.red);
// ---- Whiteout rules
S7.newState({}); sim.loadArea('00A', 'j2'); st.done['00A:tw1'] = true; st.mode = 'rail'; st.cheats.god = true;
const bh = sim.spawnEnemy('bellhop', st.x + 6, st.y); bh.spawnT = 0; bh.visible = 5; bh.shieldUp = true; bh.t = 0.1; bh.stun = 99;
st.mode = 'aim'; st.preAim = 'rail'; st.aim.yaw = Math.atan2(bh.y - st.y, bh.x - st.x); st.aim.pitch = Math.atan2(bh.z + bh.def.warm[1] - (st.z + 1.55), 6);
const wx = bh.x + Math.cos(bh.face) * bh.def.r * .6; sim.update(1 / 60, I({ aim: true, fire: true, firePressed: true })); check('a raised cart shields the Warm Spot', !bh.dead && bh.hp === bh.hpMax, bh.hp + '');
const sm = sim.spawnEnemy('sumo', st.x + 6, st.y); check('the Sumo has two Warm Spots', !!sm.def.warm2);
// ---- bosses
S7.newState({}); sim.loadArea('00C', 'n0'); st.beat = null; st.mode = 'rail'; sim.startBoss('grau'); const b = st.boss; b.state = 'idle';
check('the boss shield blocks body damage mostly', (() => { const h = b.hp; sim.hitBoss(5, false); return b.hp > h - 1; })());
b.state = 'window'; const h1 = b.hp; sim.hitBoss(3, true); check('the Warm Spot hurts the boss', b.hp < h1 - 5);
check('Grau has three phases', (() => { b.hp = b.hpMax * .5; sim.hitBoss(0, false); const p2 = b.phase; b.hp = b.hpMax * .2; sim.hitBoss(0, false); return p2 === 2 && b.phase === 3; })());
// ---- dev tools via the handle
S7.newState({}); sim.loadArea('01C', 'top'); check('the Black Run has its rails and lift', S7.graph().edges.lift.kind === 'lift' && S7.graph().edges.s1.len > 100, S7.graph().edges.s1.len + '');
check('terrain rails follow the hill', S7.graph().edges.s1.pts.every(p => Math.abs(p.z - S7.blackRunHeight(p.x, p.y)) < 1e-6));
report(); process.exit(0);
