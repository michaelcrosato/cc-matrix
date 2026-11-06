import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const selected = new Set(process.argv.slice(2));
const covers = (name) => !selected.size || selected.has(name);
let checks = 0,
	failures = 0,
	log = "";
for (const suite of [
	"content",
	"sim",
	"playthrough",
	"art",
	"audio",
	"network",
	"package",
]) {
	if (!covers(suite)) continue;
	try {
		const module = await import(`../tests/${suite}.mjs`);
		checks += await module.run();
	} catch (error) {
		failures++;
		console.error(`${suite}: ${error.message}`);
		log += `${suite}\n${error.stack}\n`;
	}
}
for (const file of [
	"browser.py",
	"network_browser.py",
	"network_game_browser.py",
	"hub_browser.py",
]) {
	if (!covers(file.replace(".py", ""))) continue;
	const result = spawnSync(
		"/home/micha/.local/share/pipx/venvs/playwright/bin/python",
		[`tests/${file}`],
		{ cwd: new URL("../", import.meta.url), encoding: "utf8", timeout: 240000 },
	);
	log += `${file}\n${result.stdout}\n${result.stderr}\n`;
	if (result.status !== 0) {
		failures++;
		console.error(`${file}: ${result.stderr || result.stdout || result.error}`);
	} else {
		try {
			const data = JSON.parse(result.stdout.trim().split("\n").at(-1));
			const count = Object.entries(data)
				.filter(
					([key, value]) =>
						/checks$|^count$/i.test(key) && typeof value === "number",
				)
				.reduce((sum, [, value]) => sum + value, 0);
			if (!count) throw Error("No count");
			checks += count;
		} catch {
			failures++;
			console.error(`${file}: missing test count`);
		}
	}
}
writeFileSync(new URL("../docs/test-output.log", import.meta.url), log);
console.log(`${checks} checks passed; ${failures} suites failed.`);
if (failures) process.exitCode = 1;
