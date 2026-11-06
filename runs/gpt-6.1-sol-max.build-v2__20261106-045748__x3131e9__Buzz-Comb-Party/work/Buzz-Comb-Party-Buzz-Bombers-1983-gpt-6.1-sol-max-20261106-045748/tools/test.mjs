import { writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
process.chdir(root);
let passed = 0,
	failed = 0;
const cases = [];
const check = (name, pass, detail = "") => {
	cases.push({ name, pass: !!pass, ...(!pass ? { detail } : {}) });
	if (pass) passed++;
	else {
		failed++;
		console.error("FAIL " + name + (detail ? ": " + detail : ""));
	}
};
const groups = process.argv.slice(2),
	all = !groups.length,
	has = (g) => all || groups.includes(g);
try {
	if (has("sim")) await (await import("../tests/simulation.mjs")).run(check);
} catch (e) {
	check("simulation suite", false, e.stack);
}
for (const group of ["browser", "hub", "build"]) {
	if (!has(group)) continue;
	if (group === "build") {
		try {
			await (await import("../tests/build.mjs")).run(check);
		} catch (e) {
			check("build suite", false, e.stack);
		}
		continue;
	}
	const r = spawnSync(
		"/home/micha/.local/share/pipx/venvs/playwright/bin/python",
		["tests/" + group + ".py"],
		{ encoding: "utf8", maxBuffer: 8 * 1024 * 1024 },
	);
	if (r.status !== 0) {
		check(group + " suite", false, (r.stdout || "") + (r.stderr || ""));
	} else {
		try {
			const report = JSON.parse(r.stdout);
			for (const c of report.checks) check(c.name, c.pass, c.detail);
		} catch {
			check(group + " report", false, r.stdout + r.stderr);
		}
	}
}
writeFileSync(
	"evidence/test-summary.json",
	JSON.stringify(
		{ passed, failed, groups: groups.length ? groups : ["all"], checks: cases },
		null,
		2,
	),
);
console.log(`Checks: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
