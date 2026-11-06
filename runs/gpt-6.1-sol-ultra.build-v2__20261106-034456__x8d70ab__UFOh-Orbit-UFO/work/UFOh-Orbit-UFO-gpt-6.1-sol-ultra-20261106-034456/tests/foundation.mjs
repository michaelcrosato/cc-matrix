import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import {
	autopilot,
	commandWorld,
	createWorld,
	snapshotWorld,
	stepWorld,
} from "../src/simulation.js";
import { Records } from "../src/storage.js";
export async function runFoundationTests() {
	let passed = 0;
	const failures = [];
	const test = async (name, fn) => {
		try {
			await fn();
			passed++;
		} catch (e) {
			failures.push(name + ": " + e.message);
		}
	};
	const html = await readFile(
		new URL("../build/game.html", import.meta.url),
		"utf8",
	);
	await test("Exact unchanged Hub client is first script immediately after charset", async () => {
		const hub = await readFile(
			new URL("../vendor/hub/session.js", import.meta.url),
			"utf8",
		);
		assert.ok(html.startsWith("<!doctype html>"));
		assert.ok(
			html.includes('<meta charset="utf-8">\n<script>' + hub + "</script>"),
		);
		assert.equal(html.indexOf("<script>"), html.indexOf("<script>" + hub));
	});
	await test("Package is standalone without local requests", () => {
		assert.equal(/<script[^>]+src=/.test(html), false);
		assert.equal(/<link[^>]+href=/.test(html), false);
		assert.equal(/\bfrom\s+["']\.\.?\//.test(html), false);
		assert.ok(html.includes("hub:session-mode"));
		assert.ok(html.includes("shared-world"));
	});
	await test("Delivery HTML matches tested build exactly", async () => {
		const id = JSON.parse(
			await readFile(new URL("../identity.json", import.meta.url), "utf8"),
		);
		assert.equal(
			await readFile(
				new URL("../../" + id.slug + ".html", import.meta.url),
				"utf8",
			),
			html,
		);
	});
	await test("All required About and feedback sections are bundled", () => {
		for (const s of [
			"Source Information",
			"Testing Feedback",
			"Engine Feedback",
			"Prompt Feedback",
			"added on import",
		])
			assert.ok(html.includes(s), s);
	});
	await test("Native engine license retained", async () => {
		const lic = await readFile(
			new URL("../vendor/engine/LICENSE", import.meta.url),
			"utf8",
		);
		assert.ok(html.includes(lic));
	});
	const memory = {
		value: null,
		getItem() {
			return this.value;
		},
		setItem(k, v) {
			this.value = v;
		},
	};
	await test("Records round trip mode-specific six-letter names", () => {
		const r = new Records(memory);
		r.add("mission", "ORBITAL", 120);
		r.add("score-attack", "TEAM42", 510);
		const reload = new Records(memory);
		assert.equal(reload.best("mission"), 120);
		assert.equal(reload.best("score"), 510);
		assert.equal(reload.data.mission[0].name, "ORBITA");
	});
	await test("Dev and attract runs cannot write score records", () => {
		const r = new Records(memory);
		const old = memory.value;
		r.add("mission", "CHEAT", 9999, { debug: true });
		r.add("mission", "DEMO", 9999, { attract: true });
		assert.equal(memory.value, old);
	});
	await test("Corrupt or denied storage keeps records playable", () => {
		const a = new Records({
			getItem() {
				return "{bad json";
			},
			setItem() {
				throw new Error("denied");
			},
		});
		assert.equal(a.best("mission"), 0);
		assert.doesNotThrow(() => a.add("mission", "PILOT", 12));
		assert.equal(a.best("mission"), 12);
		assert.equal(a.available, false);
	});
	await test("Unrecognized storage versions are ignored", () => {
		const r = new Records({
			getItem() {
				return JSON.stringify({
					v: 99,
					mission: [{ name: "ALIEN", score: 999 }],
				});
			},
		});
		assert.equal(r.best("mission"), 0);
	});
	await test("Native headless renderer validates every actor and animation without changing simulation", async () => {
		if (!globalThis.My3D2dge)
			vm.runInThisContext(
				await readFile(
					new URL("../vendor/engine/my-3d2dge.js", import.meta.url),
					"utf8",
				),
			);
		const { Presentation } = await import("../src/presentation.js");
		const E = globalThis.My3D2dge;
		const game = new E.Game({
			headless: true,
			draw: true,
			res: [960, 540],
			view: "overhead",
			menu: false,
		});
		const p = new Presentation(game);
		const w = createWorld({ players: 2 });
		commandWorld(w, "phase", { value: 3 });
		commandWorld(w, "spawn", {
			type: "drifter",
			count: 9,
			formation: "cluster",
		});
		commandWorld(w, "spawn", { type: "hunter", x: 220 });
		commandWorld(w, "spawn", { type: "gunship", x: 70, y: 120 });
		let time = 0;
		game.start({
			update(dt) {
				time += dt;
				p.update(dt, w);
			},
			draw(r) {
				p.world(r, w);
			},
		});
		for (let i = 0; i < 30; i++) {
			stepWorld(w, [autopilot(w), autopilot(w, 1)], 1 / 120);
			game.advance(1 / 120);
		}
		const before = JSON.stringify(snapshotWorld(w));
		for (let i = 0; i < 40; i++) game.advance(1 / 120);
		assert.equal(JSON.stringify(snapshotWorld(w)), before);
		assert.deepEqual(game.errors, []);
		assert.ok(time > 0);
		game.dispose();
	});
	return { passed, failed: failures.length, failures };
}
