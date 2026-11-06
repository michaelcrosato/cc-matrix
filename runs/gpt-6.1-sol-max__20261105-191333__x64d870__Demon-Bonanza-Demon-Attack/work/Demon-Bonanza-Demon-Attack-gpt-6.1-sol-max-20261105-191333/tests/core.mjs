import R from "../vendor/rapier.mjs";
import { Game, DEFAULTS, WAVES, rng } from "../core.js";
const failures = [];
let count = 0;
let stage = "initialization";
process.on("uncaughtException", (error) => {
	console.log(
		JSON.stringify({
			count,
			failures: [...failures, `Uncaught at ${stage}: ${error.stack}`],
		}),
	);
	process.exit(1);
});
function check(label, fn) {
	stage = label;
	count++;
	try {
		fn();
	} catch (e) {
		failures.push(label + ": " + e.message);
	}
}
function assert(v, m) {
	if (!v) throw new Error(m);
}
await R.init();
check("seeded random stream", () => {
	const a = rng(42),
		b = rng(42);
	for (let i = 0; i < 100; i++) assert(a() === b(), "streams diverged");
});
const g = new Game(R);
g.start();
check("opening state", () => {
	assert(g.players.length === 1, "missing cannon");
	assert(g.lives === 3, "wrong reserves");
	assert(g.phase === "playing" && WAVES.length === 6, "campaign setup");
});
check("cannon boundaries", () => {
	g.setInput(0, { move: 1 });
	for (let i = 0; i < 180; i++) g.update();
	assert(g.players[0].x <= 14.2 && g.players[0].x > 13, "cannon escaped");
	g.setInput(0, {});
});
check("Rapier shot contact", () => {
	for (const e of [...g.entities.values()])
		if (e.kind !== "player") g.remove(e);
	g.spawned = 100;
	const e = g.enemy("armor", 0, 3);
	e.phase = 0;
	const shot = g.spawn("shot", e.x, e.y, { owner: 0, damage: 1, radius: 0.16 });
	g.update();
	assert(e.hp === 3, "projectile did not cause physics damage");
	assert(!g.entities.has(shot.id), "projectile was not consumed");
	assert(g.stats.collisions > 0, "no Rapier event");
});
check("split creates two imps", () => {
	const e = g.enemy("splitter", 0, 5);
	g.hurtEnemy(e, 5);
	assert(
		[...g.entities.values()].filter((e) => e.type === "imp").length === 2,
		"wrong split count",
	);
});
check("diving imps", () => {
	for (let i = 0; i < 190; i++) g.update();
	assert(g.stats.dives >= 2, "imps never dived");
});
check("pulse reflects and recharges", () => {
	const p = g.players[0];
	p.pulse = 0;
	const bomb = g.spawn("bomb", p.x, p.y + 3, { vx: 0, vy: -4 });
	g.pulse(p);
	assert(!g.entities.has(bomb.id), "near bomb survived");
	assert(g.stats.reflected > 0, "not reflected");
	assert(p.pulse === DEFAULTS.pulseCooldown, "wrong cooldown");
	assert(g.pulse(p) === false, "pulse can be spammed");
});
check("dash costs cooldown", () => {
	const p = g.players[0];
	p.dash = 0;
	g.setInput(0, { dash: true, move: -1 });
	g.update();
	assert(p.dash > 1 && p.invul > 0, "dash not invulnerable");
});
check("damage and reserve accounting", () => {
	g.god = false;
	const p = g.players[0];
	p.invul = 0;
	const lives = g.lives;
	assert(g.hitPlayer(p), "damage rejected");
	assert(g.lives === lives - 1, "incorrect bunker count");
	assert(!g.hitPlayer(p), "invulnerability failed");
});
check("upgrade effects", () => {
	g.phase = "upgrade";
	g.wave = 1;
	assert(g.chooseUpgrade("twin"), "choice rejected");
	assert(g.upgrades.twin === 1 && g.wave === 2, "upgrade did not advance");
	g.phase = "upgrade";
	g.wave = 3;
	g.chooseUpgrade("cool");
	assert(g.upgrades.cool === 1 && g.wave === 4, "cooling did not apply");
});
check("boss seals and phases", () => {
	g.beginWave(5);
	g.spawned = 1;
	const boss = g.enemy("boss", 0, 6);
	const hp = boss.hp;
	g.hurtEnemy(boss, 20);
	assert(boss.hp === hp, "shield failed");
	for (const e of [...g.entities.values()])
		if (e.type === "seal") g.hurtEnemy(e, 50);
	g.update();
	assert(!boss.shield, "seals did not expose boss");
	g.hurtEnemy(boss, 50);
	g.update();
	assert(boss.phaseNo >= 2 && boss.shield, "boss phase seals absent");
});
check("snapshot fits Hub packet", () => {
	const json = JSON.stringify({ t: "s", s: g.snapshot() });
	assert(json.length < 16384, "snapshot exceeds protocol");
	assert(
		JSON.parse(json).s.entities.length === g.entities.size,
		"serialization mismatch",
	);
});
g.dispose();
stage = "campaign construction";
const campaign = new Game(R, { seed: 37 });
campaign.start(1, { seed: 37 });
campaign.bot = true;
campaign.god = true;
let ticks = 0;
const seen = new Set();
stage = "campaign simulation";
let campaignError = null;
try {
	for (; ticks < 60 * 900 && campaign.phase !== "victory"; ticks++) {
		seen.add(campaign.wave);
		for (const e of campaign.entities.values())
			if (
				!Number.isFinite(e.x) ||
				!Number.isFinite(e.y) ||
				!Number.isFinite(e.vx) ||
				!Number.isFinite(e.vy)
			)
				throw new Error(
					"Non-finite body " +
						JSON.stringify({
							kind: e.kind,
							type: e.type,
							x: e.x,
							y: e.y,
							vx: e.vx,
							vy: e.vy,
						}),
				);
		campaign.update();
	}
} catch (error) {
	campaignError = {
		message: error.message,
		wave: campaign.wave,
		time: campaign.time,
		phase: campaign.phase,
		entities: campaign.entities.size,
		details: campaign.snapshot(),
	};
	failures.push(
		"Campaign exception: " +
			JSON.stringify({ ...campaignError, details: undefined }),
	);
}
check("complete default-tuning campaign playthrough", () => {
	assert(
		campaign.phase === "victory",
		`bot stalled in ${campaign.phase}, wave ${campaign.wave + 1}, ${campaign.entities.size} bodies`,
	);
	assert(seen.size === 6, "not all waves seen");
	assert(
		campaign.stats.splits > 0 && campaign.stats.dives > 0,
		"split/diving mechanics not reached",
	);
	assert(campaign.stats.beams > 0, "beam mechanics not reached");
	assert(
		campaign.upgrades.twin > 0 && campaign.upgrades.cool > 0,
		"blessings not chosen",
	);
	assert(campaign.stats.collisions > 30, "playthrough bypassed physics");
});
const playthroughStats = { ...campaign.stats };
check("victory enables endless encore", () => {
	campaign.encore();
	assert(
		campaign.phase === "playing" && campaign.run === 1 && campaign.endless,
		"encore failed",
	);
});
check("final cannon after reserves", () => {
	const p = campaign.players[0];
	campaign.god = false;
	campaign.lives = 0;
	p.invul = 0;
	campaign.hitPlayer(p);
	campaign.update();
	assert(campaign.phase === "gameover", "last cannon did not end the run");
});
check("four-player shared reserves", () => {
	campaign.start(4);
	assert(
		campaign.players.length === 4 && campaign.lives === 5,
		"team setup failed",
	);
	for (let i = 0; i < 4; i++)
		campaign.setInput(i, { fire: true, move: i % 2 ? 1 : -1 });
	for (let i = 0; i < 90; i++) campaign.update();
	assert(campaign.stats.shots >= 32, "all cannons not firing");
	assert(
		JSON.stringify(campaign.snapshot()).length < 16384,
		"multiplayer packet too large",
	);
});
check("four-player campaign stays within Hub packet limit", () => {
	const team = new Game(R, { seed: 1982 });
	team.start(4);
	team.god = true;
	team.bot = true;
	team.upgrades.twin = 2;
	let maxBytes = 0;
	for (let i = 0; i < 60 * 400 && team.phase !== "victory"; i++) {
		team.update();
		if (i % 30 === 0) {
			const size = new TextEncoder().encode(
				JSON.stringify({ t: "s", s: team.snapshot(), e: [] }),
			).length;
			maxBytes = Math.max(maxBytes, size);
		}
	}
	assert(team.phase === "victory", "team campaign did not finish");
	assert(maxBytes < 16384, "snapshot exceeded 16KB: " + maxBytes);
	team.dispose();
});
const summary = {
	count,
	failures,
	campaignError,
	campaign: { seconds: ticks / 60, stats: playthroughStats },
};
if (!campaignError) campaign.dispose();
console.log(JSON.stringify(summary));
process.exit(failures.length ? 1 : 0);
