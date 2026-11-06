import fs from "node:fs";
import vm from "node:vm";

const files = [
	"vendor/engine/my-3d2dge.js",
	"src/content.js",
	"src/sim.js",
	"src/art.js",
	"src/audio.js",
	"src/net.js",
	"src/main.js",
];
const load = (extra) => {
	const c = vm.createContext({
		console: { log() {}, warn() {}, error() {} },
		...extra,
	});
	for (const f of files)
		vm.runInContext(fs.readFileSync(f, "utf8"), c, { filename: f });
	return c;
};
let count = 0;
const failures = [];
const check = (name, okay) => {
	count++;
	if (!okay) failures.push(name);
};
const c = load(),
	T = c.TB,
	a = T.app,
	g = a.game;
g.advance(0.1);
g.advance(9.7);
check("no attract before ten seconds", !a.attract);
g.advance(0.4);
check("native Arcade starts attract after ten seconds", a.attract);
const seen = new Set(),
	mechanics = new Set();
let ending = false,
	looped = false,
	wasEnding = false;
for (let i = 0; i < 4800 && !looped; i++) {
	g.advance(0.25);
	const r = a.run;
	if (!r) break;
	seen.add(r.floor);
	for (const e of r.history) mechanics.add(e.type);
	if (r.phase === "won") ending = true;
	if (ending && r.floor === 0 && r.players.length === 2) looped = true;
	wasEnding = r.phase === "won";
}
check("attract demonstrates all floors and ending", seen.size === 5 && ending);
check("attract loops into simultaneous co-op", looped);
check(
	"attract reset never replays the previous run events",
	a.art.lastEvent <= a.run.eventId && a.sound.last <= a.run.eventId,
);
check(
	"attract shows rescue defence refill escalation",
	[
		"pickup",
		"delivery",
		"plant",
		"trigger",
		"refill",
		"escalate",
		"decoy",
	].every((k) => mechanics.has(k)),
);
check(
	"attract never saves a score",
	T.app.game.settings.music === 0.1 &&
		["solo", "coop", "solo-assisted", "solo-practice"].every(
			(k) => c.My3D2dge.store.get("tb-best-" + k, null) === null,
		),
);
a.title();
g.advance(0.2);
check("title clears presentation snapshot", a.state === null);
a.start();
g.advance(0.1);
check("new run clears demo effects", a.art.effects.length === 0);
check(
	"real run starts clean after attract",
	a.run.score === 0 &&
		a.run.lives === 3 &&
		a.run.stock === 3 &&
		!a.run.demo &&
		!a.run.practice &&
		!a.run.god,
);
a.run.setBalance("playerSpeed", 5);
a.run.god = true;
a.start();
g.advance(0.1);
check(
	"retry restores production defaults",
	a.run.balance.playerSpeed === 3.5 && !a.run.god && !a.run.practice,
);
a.run.phase = "playing";
const tick = a.run.tick;
g.pause();
g.advance(1);
check("standalone native pause freezes shared simulation", a.run.tick === tick);
g.resume();
g.advance(0.1);
check("resume continues simulation", a.run.tick > tick);
const online = load({
	AIHub: { active: true, connect: () => Promise.resolve(null) },
});
await new Promise((resolve) => setImmediate(resolve));
const o = online.TB.app;
o.game.advance(0.1);
check(
	"null Hub fallback restores standalone loop",
	o.game.sceneName === "title" && !o.game.live && o.game.o.autoPause,
);
o.game.advance(10.2);
check("null Hub fallback still attracts", o.attract);
const blocked = load();
Object.defineProperty(blocked, "localStorage", {
	get() {
		throw Error("denied");
	},
});
blocked.TB.app.game.settings.set("music", 0.2);
blocked.TB.app.start();
blocked.TB.app.game.advance(0.2);
check(
	"denied storage degrades safely",
	blocked.TB.app.game.errors.length === 0 &&
		blocked.TB.app.game.audio.musicVolume === 0.2,
);
const assist = load().TB.app;
assist.game.input.lastDevice = "touch";
assist.start();
assist.game.advance(0.1);
assist.game.settings.set("assist", false);
assist.game.advance(0.2);
check("assisted flag cannot be removed mid-run", assist.run.assisted);
console.log(JSON.stringify({ count, failures }));
process.exitCode = failures.length ? 1 : 0;
