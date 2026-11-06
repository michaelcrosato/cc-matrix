import assert from "node:assert/strict";
import { SoloSave } from "../src/save.js";
import { createRun } from "../src/core.js";
export async function testSave() {
	let count = 0;
	const failures = [];
	const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
	const check = (name, fn) => {
		count++;
		try {
			fn();
		} catch (e) {
			failures.push(name + ": " + e.message);
		}
	};
	const data = new Map();
	const mock = {
		setItem: (k, v) => data.set(k, String(v)),
		getItem: (k) => data.get(k) ?? null,
		removeItem: (k) => data.delete(k),
	};
	try {
		Object.defineProperty(globalThis, "localStorage", {
			configurable: true,
			value: mock,
		});
		let save = new SoloSave(),
			run = createRun();
		check(
			"Storage persistence is advertised only after confirmed write/read",
			() => assert(save.durable),
		);
		check("Safe solo save roundtrips full authoritative entities", () => {
			assert(save.write(run));
			assert.deepEqual(save.read(), run);
		});
		check("Network expedition never replaces solo continuation", () => {
			const other = createRun({ mode: "hub" });
			assert.equal(save.write(other), false);
			assert.equal(save.read().mode, "solo");
		});
		check("Attract expedition cannot persist", () => {
			const demo = createRun();
			demo.attract = true;
			assert.equal(save.write(demo), false);
		});
		check("Damaged stored JSON provides a usable error", () => {
			data.set("tarmin-after-dark.solo.v1", "{bad");
			assert.equal(save.read(), null);
			assert.match(save.error, /damaged/);
		});
		Object.defineProperty(globalThis, "localStorage", {
			configurable: true,
			get() {
				throw Error("blocked");
			},
		});
		save = new SoloSave();
		check("Blocked storage keeps a playable visit-long save", () => {
			assert.equal(save.durable, false);
			assert.equal(save.write(run), false);
			assert.equal(save.read().players.solo.war, 36);
		});
		check("Blocked storage explicit export/import remains valid", () =>
			assert.equal(save.import(save.export(run)).players.solo.food, 7),
		);
		check("Non-solo and corrupt imports reject gracefully", () => {
			assert.throws(() => save.import("{bad"));
			assert.throws(() =>
				save.import(JSON.stringify(createRun({ mode: "hub" }))),
			);
		});
	} finally {
		if (original) Object.defineProperty(globalThis, "localStorage", original);
		else delete globalThis.localStorage;
	}
	return { count, failures };
}
