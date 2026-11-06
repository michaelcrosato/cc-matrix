import RAPIER from "@dimforge/rapier2d-compat";
import { readFile } from "node:fs/promises";
const source = (
	await readFile(new URL("./game.js", import.meta.url), "utf8")
).replace(
	"import RAPIER from '@dimforge/rapier2d-compat';",
	"const RAPIER=globalThis.__testRapier;",
);
globalThis.__testRapier = RAPIER;
const { Game, initPhysics, SHIFTS } = await import(
	"data:text/javascript;base64," + Buffer.from(source).toString("base64")
);
const originalWarn = console.warn;
console.warn = (...args) => {
	if (!String(args[0]).includes("deprecated parameters")) originalWarn(...args);
};
await initPhysics();
console.warn = originalWarn;
const failures = [];
let count = 0;
const check = (pass, name) => {
	count++;
	if (!pass) failures.push(name);
};
const near = (a, b, tolerance = 0.2) => Math.abs(a - b) < tolerance;
const worlds = [];
const fresh = (events = []) => {
	const game = new Game((type, data) => events.push({ type, data }));
	game.phaseDelay = 999;
	worlds.push(game);
	return game;
};
const frames = (game, n, input = {}) => {
	for (let i = 0; i < n; i++) game.step(1 / 60, [input]);
};
const move = fresh();
frames(move, 60);
check(
	near(move.players[0].y, 0.59) && move.players[0].grounded,
	"Rapier player settles on floor",
);
const startX = move.players[0].x;
frames(move, 60, { x: 1 });
check(
	move.players[0].x > startX + 5.5 &&
		near(move.players[0].vx, move.settings.speed),
	"controller axis drives horizontal movement",
);
move.teleport(move.players[0], 1.7, 0.7);
frames(move, 10);
let apex = 0;
for (let i = 0; i < 85; i++) {
	move.step(1 / 60, [{ jump: true }]);
	apex = Math.max(apex, move.players[0].y);
}
check(apex > 5.3 && apex < 6.5, "held jump reaches upper platform height");
frames(move, 40, { jump: true });
check(move.players[0].y < 0.8, "holding jump does not auto-repeat");
frames(move, 1, { jump: false });
frames(move, 6, { jump: true });
check(move.players[0].vy > 10, "jump re-arms on release");
move.teleport(move.players[0], 12.45, 0.8);
frames(move, 4, { x: 1 });
check(move.players[0].x < -11, "screen wraps at right edge");
const events = [],
	bump = fresh(events);
const pest = bump.spawn("beetle", -6, 4.7);
bump.teleport(bump.players[0], -6, 0.7);
frames(bump, 30);
frames(bump, 30, { jump: true });
check(
	bump.stats.bumps >= 1 &&
		pest.flipped &&
		events.some((e) => e.type === "bump"),
	"actual underside collision flips beetle",
);
check(bump.stats.hits === 0, "platform protects player from pest above");
bump.teleport(bump.players[0], pest.x, pest.y);
frames(bump, 1);
check(
	!bump.enemies.includes(pest) && bump.stats.kicks === 1 && bump.score >= 150,
	"touching flipped pest kicks and scores",
);
check(bump.coins.length === 1, "kick releases a brass token");
const token = bump.coins[0];
frames(bump, 17);
bump.teleport(bump.players[0], token.x, token.y);
frames(bump, 1);
check(
	bump.stats.coins === 1 && bump.score >= 250,
	"physical token pickup scores",
);
const armor = fresh();
const crab = armor.spawn("crab", -6, 4.7);
frames(armor, 30);
armor.bump(crab.x, 4);
check(
	!crab.flipped && crab.hp === 1 && crab.angry,
	"first crab bump cracks shell and enrages",
);
armor.bump(crab.x, 4);
check(crab.flipped && crab.hp === 0, "second crab bump flips");
armor.settings.stunTime = 0.1;
crab.stun = 0.1;
frames(armor, 10);
check(
	!crab.flipped && crab.hp === 2 && crab.angry,
	"unkicked pest recovers and gets faster",
);
const boss = armor.spawn("boss", 7, 13.5);
frames(armor, 30);
for (let i = 0; i < 2; i++) armor.bump(boss.x, 12);
check(
	!boss.flipped && boss.hp === 1 && armor.stats.bossHits === 2,
	"boss armor takes two hits",
);
armor.bump(boss.x, 12);
check(
	boss.flipped && armor.stats.bossHits === 3,
	"third boss bump exposes final kick",
);
armor.kick(boss, armor.players[0]);
check(
	!armor.enemies.includes(boss) && armor.score >= 2500,
	"boss kick awards big score",
);
const power = fresh();
const floorPest = power.spawn("beetle", 7, 0.7);
frames(power, 30);
check(
	power.pow() && floorPest.flipped && power.powCharges === 1,
	"POW flips grounded pests and consumes charge",
);
check(!power.pow() && power.powCharges === 1, "POW cooldown blocks repeat");
frames(power, 40);
check(
	power.pow() && power.powCharges === 0 && !power.pow(),
	"POW charges exhaust",
);
const pressure = fresh();
const pressurePest = pressure.spawn("beetle", 7, 0.7);
frames(pressure, 30);
pressure.teleport(pressure.players[0], 0, 0.7);
frames(pressure, 10);
frames(pressure, 20, { jump: true });
check(
	pressure.powCharges === 1 &&
		pressure.stats.pows === 1 &&
		pressurePest.flipped,
	"actual underside BOP-box collision triggers pressure burst",
);
frames(pressure, 45);
frames(pressure, 20, { jump: true });
check(
	pressure.powCharges === 0 &&
		pressure.stats.pows === 2 &&
		!pressure.pressureCollider.isEnabled(),
	"empty BOP-box collider disappears after last charge",
);
frames(pressure, 40);
let clearedBox = false;
for (let i = 0; i < 40; i++) {
	pressure.step(1 / 60, [{ jump: true }]);
	clearedBox ||= pressure.players[0].y > 3.7;
}
check(clearedBox, "player jumps freely through exhausted BOP-box location");
const danger = fresh();
frames(danger, 125);
const p = danger.players[0];
danger.hurt(p);
check(
	danger.lives === 4 && danger.stats.hits === 1 && p.hurt > 0,
	"damage removes shared life",
);
danger.hurt(p);
check(danger.lives === 4, "damage invulnerability prevents double hit");
p.hurt = 0;
danger.settings.invincible = true;
danger.hurt(p);
check(danger.lives === 4, "developer invincibility works");
danger.settings.invincible = false;
danger.lives = 1;
danger.hurt(p);
check(danger.ended && !danger.won, "last life ends run");
const frozenTime = danger.time;
frames(danger, 20, { x: 1 });
check(danger.time === frozenTime, "ended game freezes simulation");
const bonus = fresh();
bonus.enterPhase(3);
check(
	bonus.coins.length === 18 && bonus.coins.every((c) => c.static),
	"bonus shift places all 18 tokens",
);
for (const coin of [...bonus.coins]) bonus.collect(coin);
frames(bonus, 125);
check(
	bonus.phase === 4 && bonus.stats.bonusCoins === 18 && bonus.score >= 3800,
	"full bonus collection advances with perfect bonus",
);
bonus.nextTimer = 1;
bonus.demoTimer = 50;
bonus.reset(2);
check(
	bonus.nextTimer === 0 &&
		bonus.demoTimer === 0 &&
		bonus.phase === 1 &&
		bonus.players.every((p) => p.active),
	"reset clears progression timers and enables co-op",
);
bonus.nextTimer = 2;
bonus.enterPhase(4);
check(bonus.nextTimer === 0, "developer shift jump clears transition timer");
const ai = fresh();
ai.phaseDelay = 2.6;
const visited = new Set();
for (let i = 0; i < 60 * 300 && !ai.ended; i++) {
	visited.add(ai.phase);
	ai.demoStep();
}
check(
	ai.ended && ai.won && visited.size === SHIFTS.length && ai.phase === 5,
	"scripted full campaign clears every shift",
);
check(
	ai.stats.kicks === 23 &&
		ai.stats.bonusCoins === 18 &&
		ai.stats.bossHits === 3,
	"full playthrough exercises every enemy and perfect bonus",
);
check(
	ai.stats.pows > 0,
	"attract playthrough demonstrates emergency pressure bursts",
);
const snap = ai.snapshot();
check(
	JSON.stringify(snap).length < 15000 &&
		!JSON.stringify(snap).includes("RigidBody"),
	"network snapshots fit hub limit and omit physics bodies",
);
for (const world of worlds) world.world.free();
for (const failure of failures) console.error("FAIL " + failure);
console.log(`${count} gameplay checks, ${failures.length} failures`);
process.exitCode = failures.length ? 1 : 0;
