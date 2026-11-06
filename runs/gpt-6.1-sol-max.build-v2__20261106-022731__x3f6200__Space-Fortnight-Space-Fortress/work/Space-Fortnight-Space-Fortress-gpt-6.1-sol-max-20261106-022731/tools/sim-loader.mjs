import { readFileSync } from "node:fs";
import vm from "node:vm";
export function loadSim() {
	for (const file of [
		"src/data/balance.js",
		"src/data/encounters.js",
		"src/sim/world.js",
		"src/sim/bot.js",
	])
		vm.runInThisContext(
			readFileSync(new URL("../" + file, import.meta.url), "utf8"),
			{ filename: file },
		);
	return globalThis.Fortnight;
}
