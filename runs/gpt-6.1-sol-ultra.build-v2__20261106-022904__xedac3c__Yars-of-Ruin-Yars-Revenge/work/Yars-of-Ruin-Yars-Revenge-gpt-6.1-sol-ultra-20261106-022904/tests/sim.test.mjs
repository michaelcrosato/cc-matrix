import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const source = ["src/content.js", "src/sim.js"]
	.map((f) => fs.readFileSync(new URL(f, root), "utf8"))
	.join("\n");
function engine() {
	const sandbox = {};
	vm.createContext(sandbox);
	vm.runInContext(source, sandbox);
	return { S: sandbox.RuinSim, C: sandbox.RuinContent };
}
function clear(w) {
	w.cells.forEach((c) => {
		c.alive = false;
	});
	w.hazards = [];
	w.core.timer = 100;
}
function idle(S, w, seconds, action = {}) {
	for (let i = 0; i < Math.round(seconds * 120); i++) S.step(w, [action]);
}
function place(w, x, y, index = 0) {
	const p = w.players[index];
	Object.assign(p, { x, y, vx: 0, vy: 0, invuln: 0 });
	return p;
}
function cannon(w, x, y, extra = {}) {
	return {
		id: w.nextId++,
		owner: 0,
		x,
		px: x,
		y,
		vx: w.tuning.cannonSpeed,
		r: 7,
		warn: 0,
		reflected: false,
		returnWarn: 0,
		life: 4,
		...extra,
	};
}

export default async function runTests() {
	const results = [];
	const test = (name, fn) => {
		try {
			fn();
			results.push({ name, ok: true });
		} catch (e) {
			results.push({ name, ok: false, error: e.stack || String(e) });
		}
	};
	test("primary removes shield cells but never charges the rail gun", () => {
		const { S } = engine(),
			w = S.create();
		w.hazards = [];
		const p = place(w, 580, 270);
		idle(S, w, 2, { ax: 1, ay: 0, fire: true });
		assert.ok(w.stats.shotCells > 0);
		assert.equal(p.charge, 0);
		assert.equal(w.core.hp, 1);
	});
	test("contact bites are safe, have a cadence, score more and charge after five cells", () => {
		const { S } = engine(),
			w = S.create();
		w.hazards = [];
		const p = place(w, 622, 270);
		for (let i = 0; i < 5; i++) {
			const cell = w.cells.find((c) => c.alive);
			place(w, cell.x - 20, cell.y);
			const before = w.stats.biteCount;
			idle(S, w, i ? 0.17 : 0.01);
			assert.ok(w.stats.biteCount > before);
		}
		assert.equal(p.charge, w.tuning.chargeThreshold);
		assert.ok(p.ready);
		assert.ok(p.alive);
		assert.ok(w.stats.bites > w.stats.biteCount * 12);
	});
	test("primary fire cannot hurt a docked or airborne core", () => {
		const { S } = engine(),
			w = S.create();
		clear(w);
		place(w, 680, 270);
		idle(S, w, 1, { ax: 1, fire: true });
		assert.equal(w.core.hp, 1);
		w.core.state = "flight";
		w.core.vx = w.core.vy = 0;
		w.core.timer = 100;
		idle(S, w, 1, { ax: 1, fire: true });
		assert.equal(w.core.hp, 1);
	});
	test("static suppresses both commands and preserves ready charge", () => {
		const { S } = engine(),
			w = S.create();
		clear(w);
		const p = place(w, 400, 270);
		p.charge = 5;
		S.step(w, [{ ax: 1, fire: true, cannon: true }]);
		assert.equal(w.shots.length, 0);
		assert.equal(w.cannons.length, 0);
		assert.equal(p.charge, 5);
		assert.ok(w.events.some((e) => e.type === "static-block"));
	});
	test("static blocks pursuit damage without deleting the pursuer", () => {
		const { S } = engine(),
			w = S.create();
		clear(w);
		const p = place(w, 400, 270);
		w.hazards.push({
			id: 900,
			kind: "pursuer",
			x: 400,
			y: 270,
			vx: 0,
			vy: 0,
			angle: 0,
			r: 9,
			target: 0,
			variant: 0,
			age: 0,
			life: 100,
		});
		S.step(w);
		assert.ok(p.alive);
		assert.equal(w.hazards.length, 1);
		w.refuge.active = false;
		S.step(w);
		assert.ok(!p.alive);
	});
	test("static cannot block a physical siege projectile or the transformed fortress", () => {
		const { S } = engine();
		for (const kind of ["siege", "swirl"]) {
			const w = S.create();
			clear(w);
			const p = place(w, 400, 270);
			if (kind === "siege") w.cannons.push(cannon(w, 386, 270));
			else {
				Object.assign(w.core, {
					state: "flight",
					x: 400,
					y: 270,
					vx: 0,
					vy: 0,
					timer: 1,
				});
			}
			S.step(w);
			assert.ok(!p.alive, kind + " must hurt inside static");
		}
	});
	test("rail shot starts at the left gun, locks y and can kill its operator", () => {
		const { S } = engine(),
			w = S.create();
		clear(w);
		const p = place(w, 200, 270);
		p.charge = 5;
		S.step(w, [{ cannon: true }]);
		assert.equal(w.cannons[0].x, 30);
		assert.equal(w.cannons[0].y, 270);
		assert.equal(p.charge, 0);
		idle(S, w, 0.65);
		assert.ok(!p.alive);
		assert.equal(p.deadReason, "siege");
		assert.equal(w.reserves, 2);
	});
	test("siege warning permits ordinary movement to evade without a dodge action", () => {
		const { S } = engine(),
			w = S.create();
		clear(w);
		const p = place(w, 200, 270);
		p.charge = 5;
		S.step(w, [{ cannon: true }]);
		idle(S, w, 0.7, { my: -1 });
		assert.ok(p.alive);
	});
	test("a blocked rail shot removes one cell and is spent", () => {
		const { S } = engine(),
			w = S.create();
		w.hazards = [];
		place(w, 100, 90);
		w.cells = [
			{
				id: 0,
				baseX: 300,
				baseY: 270,
				x: 300,
				y: 270,
				plate: 0,
				material: "normal",
				alive: true,
				size: 20,
			},
			{
				id: 1,
				baseX: 340,
				baseY: 270,
				x: 340,
				y: 270,
				plate: 0,
				material: "normal",
				alive: true,
				size: 20,
			},
		];
		w.cannons.push(cannon(w, 275, 270));
		idle(S, w, 0.3);
		assert.ok(!w.cells[0].alive);
		assert.ok(w.cells[1].alive);
		assert.equal(w.cannons.length, 0);
		assert.equal(w.core.hp, 1);
	});
	test("mirror returns a shot only once, with a warning before motion resumes", () => {
		const { S } = engine(),
			w = S.create();
		clear(w);
		place(w, 100, 90);
		w.cells = [
			{
				id: 0,
				baseX: 300,
				baseY: 270,
				x: 300,
				y: 270,
				plate: 0,
				material: "reflective",
				alive: true,
				size: 20,
			},
			{
				id: 1,
				baseX: 200,
				baseY: 270,
				x: 200,
				y: 270,
				plate: 0,
				material: "reflective",
				alive: true,
				size: 20,
			},
		];
		w.cannons.push(cannon(w, 275, 270));
		idle(S, w, 0.03);
		const c = w.cannons[0];
		assert.ok(c.reflected);
		assert.ok(c.returnWarn > 0);
		assert.ok(c.vx < 0);
		const x = c.x;
		idle(S, w, 0.15);
		assert.equal(c.x, x);
		idle(S, w, 1);
		assert.equal(w.cannons.length, 0);
		assert.ok(!w.cells[1].alive);
		assert.equal(w.eventLog.filter((e) => e.type === "reflection").length, 1);
	});
	test("cannon uses its real radius at a narrow corridor", () => {
		const { S } = engine(),
			w = S.create();
		clear(w);
		place(w, 100, 90);
		// A 10-unit gap admits a primary radius 3 but blocks a siege radius 7.
		w.cells = [
			{
				id: 0,
				baseX: 300,
				baseY: 255,
				x: 300,
				y: 255,
				plate: 0,
				material: "normal",
				alive: true,
				size: 20,
			},
			{
				id: 1,
				baseX: 300,
				baseY: 285,
				x: 300,
				y: 285,
				plate: 0,
				material: "normal",
				alive: true,
				size: 20,
			},
		];
		w.shots.push({
			id: 99,
			kind: "primary",
			owner: 0,
			x: 275,
			px: 275,
			y: 270,
			py: 270,
			vx: 620,
			vy: 0,
			r: 3,
			life: 1,
		});
		idle(S, w, 0.15);
		assert.ok(w.cells.every((c) => c.alive));
		w.cannons.push(cannon(w, 275, 270));
		idle(S, w, 0.15);
		assert.equal(w.cells.filter((c) => c.alive).length, 1);
	});
	test("moving plates preserve damage and never recreate a destroyed cell", () => {
		const { S } = engine(),
			w = S.create({ sector: 1 });
		w.hazards = [];
		w.cells[3].alive = false;
		const startY = w.cells[4].y;
		idle(S, w, 2);
		assert.ok(!w.cells[3].alive);
		assert.notEqual(w.cells[4].y, startY);
		assert.equal(w.cells.length, 78);
	});
	test("vertical wrap has shortest targeting distances and no cross-arena collision sweep", () => {
		const { S } = engine(),
			w = S.create();
		clear(w);
		const p = place(w, 200, 1);
		w.hazards.push({
			id: 900,
			kind: "needle",
			x: 200,
			y: 270,
			vx: 0,
			vy: 0,
			angle: 0,
			r: 5,
			target: 0,
			age: 0,
			life: 100,
		});
		idle(S, w, 0.05, { my: -1 });
		assert.ok(p.y > 530);
		assert.ok(p.alive);
		assert.equal(S.wrappedDy(2, 538), 4);
		assert.equal(S.wrappedDy(538, 2), -4);
		w.hazards[0].y = 538;
		S.step(w);
		assert.ok(!p.alive);
	});
	test("shield and collision damage also wrap at the vertical seam", () => {
		const { S } = engine(),
			w = S.create();
		clear(w);
		const p = place(w, 580, 538);
		w.cells = [
			{
				id: 0,
				baseX: 600,
				baseY: 2,
				x: 600,
				y: 2,
				plate: 0,
				material: "normal",
				alive: true,
				size: 20,
			},
		];
		S.step(w);
		assert.ok(!w.cells[0].alive);
		assert.equal(p.charge, 1);
	});
	test("spawn protection expires and spawn selection avoids immediate hazards", () => {
		const { S } = engine(),
			w = S.create();
		clear(w);
		const p = place(w, 200, 270);
		w.hazards.push({
			id: 900,
			kind: "needle",
			x: 200,
			y: 270,
			vx: 0,
			vy: 0,
			angle: 0,
			r: 5,
			target: 0,
			age: 0,
			life: 100,
		});
		p.invuln = 0.1;
		S.step(w);
		assert.ok(p.alive);
		idle(S, w, 0.13);
		assert.ok(!p.alive);
		const reserve = w.reserves;
		idle(S, w, 1.4);
		assert.ok(p.alive);
		assert.ok(p.invuln > 0);
		assert.equal(w.reserves, reserve);
		assert.ok(S.distance(p, w.hazards[0]) > 60);
		w.hazards = [];
		idle(S, w, 2.5);
		assert.equal(p.invuln, 0);
	});
	test("ordinary shield contact is harmless and exposed core refills after all cells are gone", () => {
		const { S } = engine(),
			w = S.create();
		clear(w);
		const p = place(w, w.core.x - 15, w.core.y);
		S.step(w);
		assert.ok(p.alive);
		assert.equal(p.charge, 5);
		assert.equal(w.stats.refills, 1);
		p.charge = 0;
		idle(S, w, 0.5);
		assert.equal(p.charge, 0);
		idle(S, w, 2.1);
		assert.equal(p.charge, 5);
	});
	test("final dock is safe and immune to siege damage but always grants renewable charge", () => {
		const { S } = engine(),
			w = S.create({ sector: 2 });
		clear(w);
		S.command(w, "phase", 2);
		w.hazards = [];
		const p = place(w, 795, 270);
		S.step(w);
		assert.ok(p.alive);
		assert.equal(p.charge, 5);
		w.cannons.push(cannon(w, 780, 270));
		S.step(w);
		assert.equal(w.core.hp, 1);
		assert.equal(w.mode, "play");
	});
	test("final empty-shell recovery after paid respawn can refill and win by ordinary actions", () => {
		const { S } = engine(),
			w = S.create({ sector: 2, seed: 1982 });
		S.command(w, "phase", 2);
		w.practice = false;
		w.hazards = [];
		w.cells.forEach((c) => {
			c.alive = false;
		});
		const p = w.players[0];
		Object.assign(p, { alive: false, respawn: 0.05, charge: 0, invuln: 0 });
		w.core.timer = 0.1;
		let observedRefill = false,
			observedFlight = false;
		for (let t = 0; t < 120 * 60 && w.mode === "play"; t++) {
			S.step(w, [S.pilot(w)]);
			observedRefill ||= w.stats.refills > 0;
			observedFlight ||= w.core.state === "flight";
		}
		assert.ok(observedRefill);
		assert.ok(observedFlight);
		assert.equal(w.mode, "victory");
		assert.equal(w.stats.airborne, 1);
		assert.equal(w.dev.invulnerable, false);
	});
	test("a missed final shot returns to a new contact-safe refill window", () => {
		const { S } = engine(),
			w = S.create({ sector: 2 });
		S.command(w, "phase", 2);
		clear(w);
		const p = place(w, 570, 50);
		p.charge = 5;
		S.step(w, [{ cannon: true, my: 1 }]);
		idle(S, w, 1.8, { my: 1 });
		assert.equal(w.core.hp, 1);
		assert.equal(p.charge, 0);
		w.core.timer = 0;
		let flight = false,
			dock = false;
		for (let t = 0; t < 120 * 12; t++) {
			S.step(w, [{ mx: -1 }]);
			flight ||= w.core.state === "flight";
			if (flight && w.core.state === "dock") {
				dock = true;
				break;
			}
		}
		assert.ok(flight);
		assert.ok(dock);
		Object.assign(p, { alive: true, respawn: 0 });
		place(w, w.core.x - 15, w.core.y);
		S.step(w);
		assert.equal(p.charge, 5);
	});
	test("simultaneous co-op cell bites remove and reward a cell exactly once", () => {
		const { S } = engine(),
			w = S.create({ players: 2 });
		clear(w);
		const c = {
			id: 0,
			baseX: 600,
			baseY: 270,
			x: 600,
			y: 270,
			plate: 0,
			material: "normal",
			alive: true,
			size: 20,
		};
		w.cells = [c];
		place(w, 580, 270, 0);
		place(w, 580, 270, 1);
		S.step(w, [{}, {}]);
		assert.equal(w.stats.biteCount, 1);
		assert.equal(w.players[0].charge + w.players[1].charge, 1);
		assert.equal(w.events.filter((e) => e.type === "bite").length, 1);
	});
	test("simultaneous core strikes make only one phase transition and reserve reward", () => {
		const { S } = engine(),
			w = S.create({ players: 2, sector: 1 });
		clear(w);
		place(w, 100, 90, 0);
		place(w, 100, 430, 1);
		w.cannons.push(cannon(w, 817, 270), cannon(w, 817, 270, { owner: 1 }));
		S.step(w);
		assert.equal(w.core.hp, 1);
		assert.equal(w.phase, 1);
		assert.equal(w.stats.coreHits, 1);
		assert.equal(w.mode, "play");
		w.core.hitGrace = 0;
		w.core.state = "flight";
		w.core.vx = w.core.vy = 0;
		w.core.timer = 100;
		const reserves = w.reserves;
		w.cannons.push(
			cannon(w, w.core.x - 28, w.core.y),
			cannon(w, w.core.x - 28, w.core.y, { owner: 1 }),
		);
		S.step(w);
		assert.equal(w.mode, "transition");
		assert.equal(w.stats.coreHits, 2);
		assert.equal(w.stats.airborne, 1);
		assert.equal(w.reserves, Math.min(8, reserves + 2));
	});
	test("co-op reserve exhaustion waits for paid respawn and then fails once all are eliminated", () => {
		const { S } = engine(),
			w = S.create({ players: 2 });
		clear(w);
		w.reserves = 1;
		place(w, 200, 270, 0);
		place(w, 200, 270, 1);
		w.cannons.push(cannon(w, 186, 270));
		S.step(w);
		assert.equal(w.reserves, 0);
		assert.equal(w.players.filter((p) => p.respawn > 0).length, 1);
		assert.equal(w.mode, "play");
		w.cannons = [];
		idle(S, w, 1.4);
		const alive = w.players.find((p) => p.alive);
		assert.ok(alive);
		alive.invuln = 0;
		w.cannons.push(cannon(w, alive.x - 14, alive.y));
		S.step(w);
		assert.equal(w.mode, "defeat");
		assert.equal(w.stats.deaths, 3);
	});
	test("sector recovery restores eliminated partners and grants one capped reserve", () => {
		const { S } = engine(),
			w = S.create({ players: 2 });
		clear(w);
		place(w, 100, 90, 0);
		w.players[1].alive = false;
		w.players[1].respawn = 0;
		w.reserves = 0;
		w.cannons.push(cannon(w, 782, 270));
		S.step(w);
		assert.equal(w.mode, "transition");
		assert.ok(w.players[1].alive);
		assert.equal(w.reserves, 1);
		assert.ok(S.nextSector(w));
		assert.equal(w.sector, 1);
		assert.ok(w.players.every((p) => p.alive));
	});
	test("leaving non-host is not revived and cannot softlock campaign completion", () => {
		const { S } = engine(),
			w = S.create({ players: 2, seed: 1 });
		S.command(w, "leave", 1);
		for (
			let t = 0;
			t < 120 * 150 && !["victory", "defeat"].includes(w.mode);
			t++
		) {
			if (w.mode === "transition") S.nextSector(w);
			S.step(w, [S.pilot(w), {}]);
		}
		assert.equal(w.mode, "victory");
		assert.ok(w.players[1].departed);
		assert.ok(!w.players[1].alive);
		assert.equal(w.practice, false);
	});
	test("a safe local join adds one scout and reserve exactly once without changing campaign eligibility", () => {
		const { S } = engine(),
			w = S.create({ seed: 1 });
		const tick = w.tick,
			score = w.score,
			reserves = w.reserves;
		assert.ok(S.command(w, "join"));
		assert.equal(w.players.length, 2);
		const p = w.players[1];
		assert.equal(p.index, 1);
		assert.equal(p.id, 2);
		assert.ok(p.alive);
		assert.ok(p.invuln > 0);
		assert.equal(w.reserves, reserves + 1);
		assert.equal(w.tick, tick);
		assert.equal(w.score, score);
		assert.equal(w.practice, false);
		assert.ok(w.events.some((e) => e.type === "join" && e.player === 1));
		assert.equal(S.command(w, "join"), false);
		assert.equal(S.command(w, "join"), false);
		assert.equal(w.players.length, 2);
		assert.equal(w.reserves, reserves + 1);
		const capped = S.create();
		capped.reserves = capped.reserveCap;
		assert.ok(S.command(capped, "join"));
		assert.equal(capped.reserves, capped.reserveCap);
	});
	test("hiding and repeated terminal steps cannot farm score or duplicate the ending bonus", () => {
		const { S } = engine(),
			w = S.create({ sector: 2 });
		clear(w);
		place(w, 400, 270);
		idle(S, w, 5);
		assert.equal(w.score, 0);
		w.core.hp = 1;
		w.core.state = "flight";
		w.core.vx = w.core.vy = 0;
		w.core.timer = 100;
		w.cannons.push(cannon(w, 782, 270));
		S.step(w);
		assert.equal(w.mode, "victory");
		const score = w.score;
		idle(S, w, 3);
		assert.equal(w.score, score);
		assert.equal(w.stats.ending, 5000);
	});
	test("refuge outage is warned before loss and automatically returns", () => {
		const { S } = engine(),
			w = S.create({ sector: 2 });
		clear(w);
		const p = place(w, 400, 90);
		p.invuln = 100;
		w.refuge.cycle = 19.79;
		idle(S, w, 0.04);
		assert.ok(w.refuge.warning);
		assert.ok(w.refuge.active);
		idle(S, w, 3.2);
		assert.ok(!w.refuge.active);
		idle(S, w, w.tuning.refugeOutage + 0.1);
		assert.ok(w.refuge.active);
		assert.ok(!w.refuge.warning);
	});
	test("invalid action vectors are finite and diagonal speed is normalized", () => {
		const { S } = engine(),
			w = S.create();
		clear(w);
		const p = place(w, 200, 100);
		idle(S, w, 0.5, { mx: 1000, my: 1000, ax: NaN, ay: Infinity, fire: true });
		assert.ok(Number.isFinite(p.x + p.y + p.ax + p.ay));
		assert.ok(Math.hypot(p.vx, p.vy) <= w.tuning.scoutSpeed + 0.001);
	});
	test("live tuning clamps values, applies at the next step and resets safely", () => {
		const { S, C } = engine(),
			w = S.create();
		assert.equal(S.tune(w, "biteInterval", NaN), false);
		assert.ok(S.tune(w, "biteInterval", 0));
		assert.equal(w.tuning.biteInterval, 0.15);
		S.step(w);
		assert.equal(w.tuning.biteInterval, 0.06);
		assert.ok(w.practice);
		S.tune(w, "chargeThreshold", 1000);
		S.step(w);
		assert.equal(w.tuning.chargeThreshold, 12);
		S.command(w, "resetTuning");
		assert.equal(w.tuning.chargeThreshold, C.defaults.chargeThreshold);
		assert.ok(w.practice);
	});
	test("content export/import validates, preserves topology and plays an edited encounter", () => {
		const { S } = engine(),
			w = S.create({ seed: 1 });
		const data = S.exportContent(w);
		data.name = "AUTHORED BREACH";
		data.cells = data.cells.filter((c) => Math.abs(c.y - 270) > 25);
		data.refuge.x = 330;
		data.plates[0].amplitude = 10;
		const round = JSON.parse(JSON.stringify(data)),
			valid = S.validateContent(round);
		assert.ok(valid.ok, valid.errors.join("; "));
		const edited = S.create({ content: valid.content, seed: 1 });
		assert.ok(edited.practice);
		assert.equal(edited.refuge.x, 330);
		assert.equal(edited.cells.length, data.cells.length);
		for (let t = 0; t < 120 * 100 && edited.mode === "play"; t++)
			S.step(edited, [S.pilot(edited)]);
		assert.equal(edited.mode, "transition");
		assert.equal(edited.stats.coreHits, 1);
		assert.ok(
			!S.validateContent({ ...round, core: { x: NaN, y: 270, hp: 1 } }).ok,
		);
		assert.ok(
			!S.validateContent({ ...round, cells: [...round.cells, round.cells[0]] })
				.ok,
		);
	});
	test("snapshots and pilot actions are read-only", () => {
		const { S } = engine(),
			w = S.create();
		const before = JSON.stringify(w);
		S.snapshot(w);
		S.pilot(w);
		assert.equal(JSON.stringify(w), before);
	});
	test("identical seeds and action traces produce identical authoritative worlds", () => {
		const a = engine(),
			b = engine(),
			wa = a.S.create({ seed: 1106 }),
			wb = b.S.create({ seed: 1106 });
		for (let i = 0; i < 120 * 12; i++) {
			const action = a.S.pilot(wa);
			a.S.step(wa, [action]);
			b.S.step(wb, [action]);
		}
		assert.equal(
			JSON.stringify(a.S.snapshot(wa)),
			JSON.stringify(b.S.snapshot(wb)),
		);
	});
	test("non-cheating ordinary-action pilot completes every sector and all six heart strikes across seeds", () => {
		const traces = [];
		for (const seed of [1, 1982, 1106, 4294967295]) {
			const { S } = engine(),
				w = S.create({ seed });
			const visited = new Set([0]);
			let finalFlight = false;
			for (
				let t = 0;
				t < 120 * 200 && !["victory", "defeat"].includes(w.mode);
				t++
			) {
				if (w.mode === "transition") {
					S.nextSector(w);
					visited.add(w.sector);
				}
				S.step(
					w,
					w.players.map((_p, i) => S.pilot(w, i)),
				);
				finalFlight ||=
					w.sector === 2 && w.core.hp === 1 && w.core.state === "flight";
			}
			traces.push({
				seed,
				mode: w.mode,
				seconds: w.time,
				coreHits: w.stats.coreHits,
				airborne: w.stats.airborne,
				deaths: w.stats.deaths,
				biteCount: w.stats.biteCount,
				refills: w.stats.refills,
			});
			if (w.mode !== "victory")
				fs.writeFileSync(
					new URL("tests/artifacts/campaign-failure-" + seed + ".json", root),
					JSON.stringify({ trace: traces.at(-1), world: w }, null, 2),
				);
			assert.equal(w.mode, "victory", "seed " + seed);
			assert.equal(visited.size, 3);
			assert.equal(w.stats.coreHits, 6);
			assert.ok(finalFlight);
			assert.ok(w.stats.airborne >= 1);
			assert.ok(w.stats.biteCount >= 5);
			assert.ok(w.stats.refills > 0);
			assert.equal(w.practice, false);
			assert.equal(w.assist, false);
			assert.equal(w.dev.invulnerable, false);
		}
		fs.writeFileSync(
			new URL("tests/artifacts/campaign-replays.json", root),
			JSON.stringify(traces, null, 2),
		);
	});
	test("simultaneous co-op pilot uses the same simulation and completes the campaign", () => {
		const { S } = engine(),
			w = S.create({ players: 2, seed: 1982 });
		for (
			let t = 0;
			t < 120 * 160 && !["victory", "defeat"].includes(w.mode);
			t++
		) {
			if (w.mode === "transition") S.nextSector(w);
			S.step(
				w,
				w.players.map((_p, i) => S.pilot(w, i)),
			);
		}
		assert.equal(w.mode, "victory");
		assert.equal(w.players.length, 2);
		assert.equal(w.stats.coreHits, 6);
	});
	test("Assist preserves final interception and attract performs the real complete mechanic loop", () => {
		const traces = [];
		for (const options of [
			{ assist: true, seed: 1 },
			{ attract: true, seed: 1106 },
		]) {
			const { S } = engine(),
				w = S.create(options);
			let blocked = false,
				hadSwirl = false;
			for (
				let t = 0;
				t < 120 * 140 && !["victory", "defeat"].includes(w.mode);
				t++
			) {
				if (w.mode === "transition") S.nextSector(w);
				S.step(w, [S.pilot(w, 0, { attract: !!options.attract })]);
				blocked ||= w.events.some((e) => e.type === "static-block");
				hadSwirl ||= w.events.some((e) => e.type === "swirl-launch");
			}
			assert.equal(w.mode, "victory");
			assert.ok(w.stats.biteCount >= 5);
			assert.ok(w.stats.airborne > 0);
			assert.ok(hadSwirl);
			if (options.attract) {
				assert.ok(blocked);
				assert.equal(w.dev.infiniteCharge, false);
			}
			traces.push({
				...options,
				outcome: w.mode,
				seconds: w.time,
				stats: w.stats,
			});
		}
		fs.writeFileSync(
			new URL("tests/artifacts/mode-replays.json", root),
			JSON.stringify(traces, null, 2),
		);
	});
	return {
		passed: results.filter((r) => r.ok).length,
		failed: results.filter((r) => !r.ok).length,
		results,
	};
}

if (
	process.argv[1] &&
	fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])
) {
	const report = await runTests();
	for (const r of report.results)
		if (!r.ok) process.stderr.write("FAIL " + r.name + "\n" + r.error + "\n");
	process.stdout.write(
		report.passed + " passed, " + report.failed + " failed\n",
	);
	process.exitCode = report.failed ? 1 : 0;
}
