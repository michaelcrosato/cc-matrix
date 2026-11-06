import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const dir = path.resolve(import.meta.dirname, "..");
for (const f of [
	"src/config.js",
	"src/content/campaign.js",
	"src/sim/geometry.js",
	"src/sim/simulation.js",
	"src/save/save.js",
])
	vm.runInThisContext(fs.readFileSync(path.join(dir, f), "utf8"), {
		filename: f,
	});
let passed = 0;
const failures = [];
const check = (name, fn) => {
	try {
		fn();
		passed++;
	} catch (e) {
		failures.push(name + ": " + e.message);
	}
};
const memory = () => {
	const map = new Map();
	return {
		getItem: (k) => map.get(k) || null,
		setItem: (k, v) => map.set(k, v),
		removeItem: (k) => map.delete(k),
		map,
	};
};
check(
	"checksummed alternating save persists current and restart snapshots",
	() => {
		const storage = memory(),
			store = new DTSave.CampaignStore(storage),
			sim = new DTSim.Simulation();
		sim.enterCave("chalk");
		sim.state.quiver = 1;
		store.write(sim);
		const read = new DTSave.CampaignStore(storage).read();
		const next = new DTSim.Simulation();
		next.load(read.save);
		assert.equal(next.state.quiver, 1);
		assert.equal(next.checkpoint.quiver, 3);
	},
);
check("an interrupted latest write falls back atomically", () => {
	const storage = memory(),
		store = new DTSave.CampaignStore(storage),
		sim = new DTSim.Simulation();
	store.write(sim);
	sim.state.quiver = 8;
	store.write(sim);
	storage.setItem(store.key + ":b", '{"schema":1');
	const saved = new DTSave.CampaignStore(storage).read();
	assert.equal(saved.save.state.quiver, 3);
});
check("checksum corruption is rejected", () => {
	const storage = memory(),
		store = new DTSave.CampaignStore(storage),
		sim = new DTSim.Simulation();
	store.write(sim);
	const key = store.key + ":a",
		data = JSON.parse(storage.getItem(key));
	data.payload = data.payload.replace('"quiver":3', '"quiver":999');
	storage.setItem(key, JSON.stringify(data));
	assert.equal(new DTSave.CampaignStore(storage).read(), null);
});
check("unsupported content and schema are rejected safely", () => {
	const storage = memory(),
		store = new DTSave.CampaignStore(storage),
		sim = new DTSim.Simulation();
	store.write(sim);
	const key = store.key + ":a",
		data = JSON.parse(storage.getItem(key));
	data.schema = 999;
	storage.setItem(key, JSON.stringify(data));
	assert.equal(new DTSave.CampaignStore(storage).read(), null);
});
check("denied storage continues in memory", () => {
	const store = new DTSave.CampaignStore({
		getItem() {
			throw Error("denied");
		},
		setItem() {
			throw Error("denied");
		},
	});
	assert.equal(store.read(), null);
	store.write(new DTSim.Simulation());
	assert.ok(store.read());
	assert.equal(store.available, false);
	assert.match(store.error, /visit/);
});
check("dev and attract never overwrite an expedition", () => {
	const storage = memory(),
		store = new DTSave.CampaignStore(storage),
		sim = new DTSim.Simulation();
	store.write(sim);
	const before = JSON.stringify([...storage.map]);
	sim.state.mode = "attract";
	assert.equal(store.write(sim), false);
	sim.state.mode = "dev";
	assert.equal(store.write(sim), false);
	sim.state.mode = "solo";
	sim.state.stats.assisted = true;
	assert.equal(store.write(sim), false);
	assert.equal(JSON.stringify([...storage.map]), before);
});
check("Hub progress cannot overwrite a local expedition", () => {
	const storage = memory(),
		store = new DTSave.CampaignStore(storage);
	assert.equal(store.write(new DTSim.Simulation({ mode: "hub" })), false);
	assert.equal(storage.map.size, 0);
});
check("save erase removes both old envelopes", () => {
	const storage = memory(),
		store = new DTSave.CampaignStore(storage);
	store.write(new DTSim.Simulation());
	store.write(new DTSim.Simulation());
	store.clear();
	assert.equal(store.read(), null);
	assert.equal(storage.map.size, 0);
});
const config = JSON.parse(fs.readFileSync(path.join(dir, "build-config.json"))),
	html = fs.readFileSync(path.join(dir, "..", config.filename), "utf8"),
	meta = JSON.parse(
		fs.readFileSync(path.join(dir, "..", "exit-interview.json")),
	);
check(
	"artifact session client is first script immediately after charset",
	() => {
		const first = html.match(
			/<meta charset="utf-8">\s*<script>([\s\S]*?)<\/script>/,
		);
		assert.ok(first);
		assert.ok(first[1].includes("AIHub"));
		assert.ok(html.includes('hub:session-players" content="1-2'));
	},
);
check("artifact has no sibling imports or downloaded art/audio", () => {
	assert.ok(!/<script[^>]+src=/i.test(html));
	assert.ok(!/<link[^>]+href=/i.test(html));
	assert.ok(!/<(?:audio|img)[^>]+src=/i.test(html));
	assert.ok(!/from\s+['"]\.\//.test(html));
});
check("metadata required fields and feedback arrays are complete", () => {
	for (const key of [
		"date",
		"source",
		"plan",
		"genre",
		"perspective",
		"tech",
		"artDirection",
		"animation",
		"audio",
		"online",
		"testing",
		"research",
		"environment",
		"model",
		"usage",
	])
		assert.ok(meta.sourceInformation[key], key);
	assert.equal(meta.sourceInformation.usage, "added on import");
	assert.equal(meta.testingFeedback.length, 4);
	assert.equal(meta.engineFeedback.length, 6);
	assert.equal(meta.promptFeedback.length, 4);
	assert.equal(meta.aiHub.name, config.title);
	assert.equal(meta.aiHub.players, "1–2");
	assert.ok(meta.aiHub.tags.length >= 3 && meta.aiHub.tags.length <= 6);
});
check("entire final HTML scripts parse independently", () => {
	const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
	assert.ok(scripts.length >= 12);
	for (const [i, s] of scripts.entries())
		new vm.Script(s[1], { filename: "inline-" + i });
});
for (const failure of failures) console.error(failure);
console.log(passed + " product checks passed; " + failures.length + " failed");
if (failures.length) process.exitCode = 1;
