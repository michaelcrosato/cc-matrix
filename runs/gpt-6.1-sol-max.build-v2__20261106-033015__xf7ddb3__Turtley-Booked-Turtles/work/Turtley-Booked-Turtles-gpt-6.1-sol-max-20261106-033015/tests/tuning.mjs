import fs from "node:fs";
import vm from "node:vm";

const c = vm.createContext({ console });
for (const f of ["vendor/engine/my-3d2dge.js", "src/content.js", "src/sim.js"])
	vm.runInContext(fs.readFileSync(f, "utf8"), c);
const evidence = [];
let count = 0,
	failures = [];
for (const seats of [[0], [0, 1]]) {
	let success = false;
	for (let seed = 1; seed <= 25; seed++) {
		const r = new c.TB.Run({ seats, seed }),
			bot = new c.TB.Bot();
		for (let i = 0; i < 120 * 1000 && !["won", "lost"].includes(r.phase); i++)
			r.step(1 / 120, bot.inputs(r));
		evidence.push({
			seats: seats.length,
			seed,
			phase: r.phase,
			rescued: r.rescued,
			t: r.elapsed,
			stats: r.stats,
		});
		if (r.phase === "won") {
			success = true;
			break;
		}
	}
	count++;
	if (!success)
		failures.push("No complete campaign for " + seats.length + " seats");
}
fs.writeFileSync(
	"build/tuning-evidence.json",
	JSON.stringify(evidence, null, 2),
);
console.log(JSON.stringify({ count, failures }));
process.exitCode = failures.length ? 1 : 0;
