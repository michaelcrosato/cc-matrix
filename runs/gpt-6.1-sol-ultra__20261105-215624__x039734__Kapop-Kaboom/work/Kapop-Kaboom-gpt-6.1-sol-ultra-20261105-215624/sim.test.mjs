import { DEFAULTS, GameSim, initPhysics, WAVES } from "./sim.js";

let checks = 0,
	failures = [];
const check = (b, n) => {
	checks++;
	if (!b) failures.push(n);
};
await initPhysics();
const log = [];
const g = new GameSim((e) => log.push(e.type));
g.start();
check(
	g.lives === 3 && g.charge === 1 && g.players.length === 1,
	"new game has three buckets and a full splash",
);
g.intro = 0;
g.setTarget(0, 100);
for (let i = 0; i < 60; i++) g.step();
check(g.players[0].x === 7.15, "movement clamps to stage");
g.clearBombs();
g.setTarget(0, 0);
for (let i = 0; i < 60; i++) g.step();
g.clearBombs();
g.spawn("normal", 0, 2);
const score = g.score;
for (let i = 0; i < 12; i++) g.step();
check(
	g.score > score && g.stats.caught >= 1,
	"physics-driven bomb catches score",
);
g.clearBombs();
const before = g.lives;
g.spawn("normal", -7, -0.2);
for (let i = 0; i < 10; i++) g.step();
check(
	g.lives === before - 1 && g.combo === 0,
	"miss removes bucket and resets combo",
);
check(g.bombs.length === 0, "miss clears falling bombs");
g.missGrace = 0;
g.charge = 1;
g.players[0].x = 0;
g.players[0].target = 0;
g.spawn("normal", 1, 3);
g.spawn("normal", 6, 4);
check(g.pop(0), "charged splash activates");
check(g.bombs.length === 1 && g.bombs[0].x === 6, "splash respects range");
check(!g.pop(0), "empty splash cannot be reused");
g.clearBombs();
g.charge = 0;
g.spawn("gold", 0, 2);
for (let i = 0; i < 20; i++) g.step();
check(g.charge >= 0.45 && g.stats.gold === 1, "gold bomb refills splash");
g.clearBombs();
g.wave = 3;
g.spawn("split", 0, 6.01);
g.step();
check(
	g.bombs.filter((b) => b.kind === "mini").length === 2 && g.stats.split === 1,
	"split bomb makes two physics bodies",
);
g.start(4, false, [11, 12, 13, 14]);
check(
	g.players.length === 4 &&
		g.players[3].id === 14 &&
		new Set(g.players.map((p) => p.x)).size === 4,
	"four independent co-op seats initialize",
);
g.start();
g.settings.autoCatch = true;
let pops = 0;
for (let i = 0; i < 18000 && g.phase === "playing"; i++) {
	if (g.wave >= 2 && g.charge === 1 && g.bombs.some((b) => b.y < 4)) {
		if (g.pop()) pops++;
	}
	g.step();
}
check(g.phase === "victory", "scripted complete five-round playthrough wins");
check(
	g.wave === WAVES.length && g.score > 20000,
	"full run completes all rounds and scores",
);
check(
	g.stats.split > 0 && g.stats.gold > 0 && pops > 0,
	"full run demonstrates gold, splits, and splash",
);
check(
	g.lives > 0 && g.stats.missed === 0,
	"scripted full run survives using normal bucket rules",
);
check(
	log.includes("victory") && log.includes("clear"),
	"completion and clear events emitted",
);
g.start(1, true);
g.settings.autoCatch = false;
g.settings.invincible = false;
g.intro = 0;
g.spawn("normal", 7, -0.2);
g.step();
g.step();
check(g.lives === 3, "attract demo cannot lose buckets");
for (let i = 0; i < 18000 && g.phase === "playing"; i++) g.step();
check(
	g.phase === "victory" && g.stats.pops > 0,
	"attract playthrough demonstrates splash and every round",
);
Object.assign(g.settings, DEFAULTS);
check(
	g.settings.fallSpeed === 1 &&
		g.settings.catchWidth === 1.18 &&
		!g.settings.autoCatch,
	"reset restores default balance",
);
g.world.free();
for (const f of failures) console.log(`FAIL: ${f}`);
console.log(`${checks} simulation checks, ${failures.length} failures`);
if (failures.length) process.exitCode = 1;
