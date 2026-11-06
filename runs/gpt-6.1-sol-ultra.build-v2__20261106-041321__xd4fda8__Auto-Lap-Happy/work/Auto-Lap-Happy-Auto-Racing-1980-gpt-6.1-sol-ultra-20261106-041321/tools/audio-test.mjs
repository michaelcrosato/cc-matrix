import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
export function runAudioTests() {
	const script = fileURLToPath(new URL("./audio-test.py", import.meta.url));
	const out = spawnSync(
		"/home/micha/.local/share/pipx/venvs/playwright/bin/python",
		[script],
		{ encoding: "utf8", timeout: 60000 },
	);
	if (out.status !== 0)
		return [
			{
				name: "Web Audio rendering",
				pass: false,
				detail: out.stderr || out.error?.message || `Exited ${out.status}`,
			},
		];
	try {
		return JSON.parse(out.stdout);
	} catch (error) {
		return [
			{ name: "Web Audio test output", pass: false, detail: error.message },
		];
	}
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const results = runAudioTests();
	for (const r of results)
		if (!r.pass) console.error(`FAIL ${r.name}: ${r.detail}`);
	console.log(
		`${results.filter((r) => r.pass).length}/${results.length} audio checks passed`,
	);
	process.exitCode = results.some((r) => !r.pass) ? 1 : 0;
}
