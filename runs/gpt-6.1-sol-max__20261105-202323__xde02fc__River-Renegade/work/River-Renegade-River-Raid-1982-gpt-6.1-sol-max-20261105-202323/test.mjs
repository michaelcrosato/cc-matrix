import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { course, DEFAULTS, Game, RAPIER, river } from "./simulation.mjs";

const checks = [],
	failures = [];
let campaign = {};
const warn = console.warn;
console.warn = (...a) => {
	if (!String(a[0]).includes("deprecated parameters")) warn(...a);
};
await RAPIER.init();
console.warn = warn;
function test(name, fn) {
	try {
		fn();
		checks.push({ name, pass: true });
	} catch (e) {
		checks.push({ name, pass: false, detail: e.message });
		failures.push(`${name}: ${e.message}`);
	}
}
function blank() {
	const g = new Game({ speed: 0, fuelBurn: 0 });
	g.specs = [];
	for (const e of [...g.entities]) g.removeEntity(e);
	g.next = 0;
	return g;
}
function step(g, n, i = {}) {
	for (let k = 0; k < n && !g.over; k++) g.update(1 / 60, i);
}
let g;
test("deterministic authored course and complete enemy roster", () => {
	assert.deepEqual(course(), course());
	const types = new Set(course().map((e) => e.type));
	for (const t of [
		"boat",
		"heli",
		"jet",
		"turret",
		"mine",
		"fuel",
		"bridge",
		"boss",
		"bossTurret",
		"island",
		"upgrade",
		"repair",
	])
		assert(types.has(t), t);
	assert.equal(course().filter((e) => e.type === "bridge").length, 3);
});
test("fuel docks have clear approaches outside enemy sweep lanes", () => {
	const specs = course();
	for (const dock of specs.filter((e) => e.type === "fuel"))
		for (const e of specs) {
			if (
				["boat", "heli", "mine", "turret"].includes(e.type) &&
				Math.abs(e.d - dock.d) < 20
			)
				assert(
					Math.abs(e.x - dock.x) > 5.5,
					`dock ${dock.d} overlaps ${e.type}`,
				);
		}
});
test("up accelerates and down brakes", () => {
	const a = new Game(),
		b = new Game();
	a.god = b.god = true;
	step(a, 60, { 0: { y: -1 } });
	step(b, 60, { 0: { y: 1 } });
	assert(a.progress > b.progress * 1.8);
	a.dispose();
	b.dispose();
});
test("steering responds and player bodies track the jet", () => {
	g = blank();
	const x = g.players[0].x;
	step(g, 20, { 0: { x: 0.5 } });
	assert(g.players[0].x > x + 1);
	assert(Math.abs(g.players[0].body.translation().x - g.players[0].x) < 0.01);
	g.dispose();
});
test("Rapier riverbank contact damages and returns the jet to water", () => {
	g = blank();
	const p = g.players[0],
		r = river(p.d);
	p.invuln = 0;
	p.x = r.center + r.width - 0.2;
	step(g, 3);
	assert.equal(p.hp, 2);
	assert(g.metrics.bankHits === 1);
	assert(p.x < r.center + r.width);
	g.dispose();
});
test("swept projectiles destroy a tanker and award its score", () => {
	g = blank();
	const p = g.players[0];
	g.addEntity({ id: 501, type: "boat", d: 28, x: p.x });
	step(g, 70, { 0: { fire: true } });
	assert(g.kills === 1);
	assert(g.score === 30);
	assert(g.metrics.hits >= 2);
	g.dispose();
});
test("fuel dock sensor refills the tank", () => {
	g = blank();
	const p = g.players[0];
	p.fuel = 20;
	g.addEntity({ id: 502, type: "fuel", d: 10, x: p.x });
	step(g, 60);
	assert(p.fuel > 48 && p.fuel < 52);
	assert(g.metrics.refueled > 28);
	g.dispose();
});
test("fuel dock can be shot for points instead of saved", () => {
	g = blank();
	const p = g.players[0];
	g.addEntity({ id: 503, type: "fuel", d: 28, x: p.x });
	step(g, 100, { 0: { fire: true } });
	assert.equal(g.score, 80);
	assert(!g.entities.some((e) => e.type === "fuel"));
	g.dispose();
});
test("pulse consumes fuel, clears bullets and respects cooldown", () => {
	g = blank();
	const p = g.players[0];
	p.fuel = 50;
	const e = g.addEntity({ id: 504, type: "boat", d: 28, x: p.x });
	g.addBullet(p.x, 14, 0, -12, -1, true);
	assert(g.pulse(p));
	assert.equal(p.fuel, 38);
	assert(e.dead);
	assert.equal(g.bullets.length, 0);
	assert(!g.pulse(p));
	assert.equal(g.metrics.pulses, 1);
	step(g, 601);
	assert.equal(p.pulse, 0);
	g.dispose();
});
test("twin-gun and repair pickups work through physics contact", () => {
	g = blank();
	const p = g.players[0];
	p.hp = 1;
	g.addEntity({ id: 505, type: "upgrade", d: 7, x: p.x });
	g.addEntity({ id: 506, type: "repair", d: 7, x: p.x });
	step(g, 2);
	assert(p.twin > 23);
	assert.equal(p.hp, 2);
	assert.equal(g.metrics.pickups, 2);
	step(g, 1, { 0: { fire: true } });
	assert.equal(g.bullets.length, 2);
	g.dispose();
});
test("enemy projectile costs a jet then redeploys it", () => {
	g = blank();
	const p = g.players[0];
	p.hp = 1;
	p.invuln = 0;
	g.addBullet(p.x, 12, 0, -16, -1, true);
	step(g, 25);
	assert.equal(p.lives, 2);
	assert(p.respawn > 0);
	step(g, 120);
	assert.equal(p.hp, 3);
	assert.equal(p.respawn <= 0, true);
	assert(p.invuln > 0);
	g.dispose();
});
test("exhausted reserves end the sortie", () => {
	g = blank();
	const p = g.players[0];
	p.fuel = 0;
	p.lives = 1;
	step(g, 2);
	assert(g.over);
	assert(!g.won);
	assert.equal(g.metrics.deaths, 1);
	g.dispose();
});
test("boss turrets shield the core until both are destroyed", () => {
	g = blank();
	const x = g.players[0].x;
	const core = g.addEntity({ id: 507, type: "boss", d: 45, x }),
		a = g.addEntity({ id: 508, type: "bossTurret", d: 40, x: x - 5 }),
		b = g.addEntity({ id: 509, type: "bossTurret", d: 40, x: x + 5 });
	g.damage(core, 10, 0);
	assert.equal(core.hp, 64);
	g.damage(a, 16, 0);
	g.damage(core, 10, 0);
	assert.equal(core.hp, 64);
	g.damage(b, 16, 0);
	g.damage(core, 10, 0);
	assert.equal(core.hp, 54);
	g.dispose();
});
test("islands survive weapons and remain collision hazards", () => {
	g = blank();
	const p = g.players[0];
	const e = g.addEntity({ id: 510, type: "island", d: 7, x: p.x });
	g.damage(e, 99999, 0);
	assert.equal(e.hp, 9999);
	p.invuln = 0;
	step(g, 3);
	assert.equal(p.hp, 2);
	assert(!e.dead);
	g.dispose();
});
test("local co-op pilots have independent controls and resources", () => {
	g = new Game({ fuelBurn: 0, speed: 0 });
	g.reset(2);
	g.god = true;
	const p = g.players;
	const a = p[0].x,
		b = p[1].x;
	step(g, 25, { 0: { x: -0.4, fire: true }, 1: { x: 0.4 } });
	assert(p[0].x < a && p[1].x > b);
	assert(g.metrics.shots > 0);
	p[0].fuel = 30;
	assert.equal(p[1].fuel, 100);
	g.dispose();
});
test("extra reserve is awarded at ten thousand points", () => {
	g = blank();
	g.score = 9990;
	const p = g.players[0];
	const e = g.addEntity({ id: 511, type: "boat", d: 24, x: p.x });
	g.damage(e, 2, 0);
	assert.equal(p.lives, 4);
	assert.equal(g.nextExtra, 20000);
	g.dispose();
});
test("live tuning changes speed and can restore defaults", () => {
	g = blank();
	g.tuning.speed = 30;
	step(g, 60);
	assert(g.progress > 29);
	Object.assign(g.tuning, DEFAULTS);
	assert.equal(g.tuning.speed, 17);
	g.dispose();
});
test("intact bridges cannot be bypassed without clearing them", () => {
	g = new Game({ fuelBurn: 0, speed: 25 });
	g.reset(1, { progress: 745 });
	g.god = true;
	step(g, 180);
	assert(g.progress <= 758.001);
	assert.equal(g.bridges, 0);
	step(g, 180, { 0: { fire: true } });
	assert(g.bridges === 1);
	assert(g.progress > 770);
	g.dispose();
});
test("complete scripted campaign with real weapons and fuel stops", () => {
	g = new Game();
	g.god = true;
	g.autopilot = true;
	const seen = new Set();
	let maxEntities = 0,
		maxBytes = 0;
	for (let i = 0; i < 15000 && !g.over; i++) {
		g.update(1 / 60);
		for (const e of g.entities) seen.add(e.type);
		maxEntities = Math.max(maxEntities, g.entities.length);
		maxBytes = Math.max(
			maxBytes,
			i % 60 === 0 ? JSON.stringify(g.snapshot()).length : 0,
		);
	}
	const s = g.snapshot();
	assert(s.won && s.over);
	assert.equal(s.bridges, 3);
	assert(s.metrics.bossHits >= 64);
	assert(s.metrics.refueled > 30);
	assert(s.metrics.pulses > 0);
	assert(s.metrics.pickups > 0);
	assert(seen.has("jet") && seen.has("island") && seen.has("bossTurret"));
	assert(maxEntities < 35);
	campaign = {
		seconds: s.time,
		score: s.score,
		metrics: s.metrics,
		seen: [...seen],
		maxEntities,
		maxSnapshotBytes: maxBytes,
	};
	g.dispose();
});
test("exit interview is valid and has the exact required shape", () => {
	const data = JSON.parse(
		readFileSync(new URL("../exit-interview.json", import.meta.url)),
	);
	assert.deepEqual(
		Object.keys(data).sort(),
		[
			"sourceInformation",
			"testingFeedback",
			"engineFeedback",
			"promptFeedback",
			"aiHub",
		].sort(),
	);
	assert.equal(data.sourceInformation.usage, "added on import");
	assert.equal(data.testingFeedback.length, 4);
	assert.equal(data.engineFeedback.length, 6);
	assert.equal(data.promptFeedback.length, 4);
	for (const v of Object.values(data.sourceInformation))
		assert.equal(typeof v, "string");
	assert.deepEqual(
		data,
		JSON.parse(readFileSync(new URL("./credits.json", import.meta.url))),
	);
});
test("root deliverable matches the tested development HTML", () => {
	const { stem } = JSON.parse(
		readFileSync(new URL("./project.json", import.meta.url)),
	);
	const root = readFileSync(
		new URL(`../${stem}.html`, import.meta.url),
		"utf8",
	);
	assert.equal(
		root,
		readFileSync(new URL("./index.html", import.meta.url), "utf8"),
	);
	assert(root.includes("<title>River Renegade"));
	assert(root.includes("THIRD-PARTY NOTICES"));
});
test("AI Hub client is embedded unmodified as the first script", () => {
	const html = readFileSync(new URL("./index.html", import.meta.url), "utf8"),
		client = readFileSync(new URL("./hub-session.js", import.meta.url), "utf8");
	assert(html.includes(`<script>\n${client}\n</script>`));
	assert.equal(
		html.slice(html.indexOf("<script>") + 9, html.indexOf("</script>")).trim(),
		client.trim(),
	);
});
test("single HTML has no external script, stylesheet, image or audio dependencies", () => {
	const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");
	assert(!/<script[^>]+src=/i.test(html));
	assert(!/<link[^>]+stylesheet/i.test(html));
	assert(!/<audio[ >]/i.test(html));
	assert(!/<img[^>]+src=["']https?:/i.test(html));
});
const py = spawnSync(
	"/home/micha/.local/share/pipx/venvs/playwright/bin/python",
	["browser-tests.py"],
	{
		cwd: new URL(".", import.meta.url),
		encoding: "utf8",
		maxBuffer: 8 * 1024 * 1024,
		timeout: 420000,
	},
);
let browser = { checks: [], failures: [] };
try {
	browser = JSON.parse(py.stdout);
} catch {
	failures.push(
		"Browser test runner failed: " +
			(py.stderr || py.stdout || py.error?.message || "unknown").slice(-3000),
	);
}
for (const c of browser.checks || []) checks.push(c);
for (const f of browser.failures || []) failures.push(f);
const report = {
	date: new Date().toISOString(),
	passed: checks.filter((c) => c.pass).length,
	failed: failures.length,
	checks,
	failures,
	campaign,
	browser,
};
writeFileSync("test-results.json", `${JSON.stringify(report, null, 2)}\n`);
for (const f of failures) console.log(`FAIL ${f}`);
console.log(`${report.passed} checks passed; ${report.failed} failed.`);
if (failures.length) process.exitCode = 1;
