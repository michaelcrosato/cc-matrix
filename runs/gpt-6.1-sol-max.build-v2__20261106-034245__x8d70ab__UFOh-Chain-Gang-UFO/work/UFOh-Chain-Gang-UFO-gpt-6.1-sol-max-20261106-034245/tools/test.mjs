import { writeFile, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { build } from "./build.mjs";
const root = new URL("../", import.meta.url),
	suite =
		process.argv.find((a) => a.startsWith("--suite="))?.split("=")[1] || "all";
const results = [];
try {
	if (
		![
			"all",
			"simulation",
			"network",
			"browser",
			"harness",
			"gameplay",
			"package",
			"static",
		].includes(suite)
	)
		throw new Error(`Unknown test suite: ${suite}`);
	if (["all", "package", "browser", "harness", "gameplay"].includes(suite))
		await build({ quiet: true });
	if (suite === "all" || suite === "static") {
		for (const [name, cmd, args] of [
			[
				"Static: Biome source/tools/tests",
				"biome",
				[
					"check",
					"--assist-enabled=false",
					"src",
					"tools",
					"tests/hub-unit.mjs",
					"tests/simulation.mjs",
					"tests/packaging.mjs",
				],
			],
			[
				"Static: Ruff browser coordinator",
				"ruff",
				["check", "tests/browser.py"],
			],
			[
				"Static: Python type check",
				"ty",
				[
					"check",
					"--python",
					"/home/micha/.local/share/pipx/venvs/playwright/bin/python",
					"tests/browser.py",
				],
			],
		]) {
			const run = spawnSync(cmd, args, {
				cwd: root,
				encoding: "utf8",
				timeout: 30000,
			});
			results.push({
				name,
				pass: run.status === 0,
				detail:
					run.status === 0
						? undefined
						: (run.stdout || "") + (run.stderr || ""),
			});
		}
	}
	if (suite === "all" || suite === "simulation") {
		const { runSimulationTests } = await import("../tests/simulation.mjs");
		results.push(...(await runSimulationTests()));
	}
	if (suite === "all" || suite === "network") {
		const { runHubUnitTests } = await import("../tests/hub-unit.mjs");
		results.push(...(await runHubUnitTests()));
	}
	if (["all", "browser", "harness", "gameplay"].includes(suite)) {
		const run = spawnSync(
			"/home/micha/.local/share/pipx/venvs/playwright/bin/python",
			["tests/browser.py", suite],
			{
				cwd: root,
				encoding: "utf8",
				timeout: 300000,
				maxBuffer: 4 * 1024 * 1024,
			},
		);
		await writeFile(
			new URL("../artifacts/browser-run.log", import.meta.url),
			(run.stdout || "") + (run.stderr || ""),
		);
		if (run.status !== 0)
			results.push({
				name: "Browser coordinator",
				pass: false,
				detail: run.stderr || run.stdout || String(run.error),
			});
		try {
			const data = JSON.parse(
				await readFile(
					new URL("../artifacts/browser-results.json", import.meta.url),
					"utf8",
				),
			);
			results.push(...data);
		} catch (e) {
			results.push({ name: "Browser report", pass: false, detail: e.message });
		}
	}
	if (suite === "all" || suite === "package") {
		const { runPackagingTests } = await import("../tests/packaging.mjs");
		results.push(...(await runPackagingTests()));
	}
} catch (e) {
	results.push({ name: "Test coordinator", pass: false, detail: e.stack });
}
await writeFile(
	new URL("../artifacts/test-results.json", import.meta.url),
	JSON.stringify({ suite, results }, null, 2),
);
for (const r of results)
	if (!r.pass) console.log(`FAIL ${r.name}\n${r.detail || ""}`);
const failures = results.filter((r) => !r.pass).length;
console.log(`${results.length - failures} passed, ${failures} failed`);
process.exitCode = failures ? 1 : 0;
