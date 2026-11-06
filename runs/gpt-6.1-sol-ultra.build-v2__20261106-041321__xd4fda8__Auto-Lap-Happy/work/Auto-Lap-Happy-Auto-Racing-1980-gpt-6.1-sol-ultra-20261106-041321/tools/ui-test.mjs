import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
export function runUITests() {
	const script = fileURLToPath(new URL("./ui-test.py", import.meta.url));
	const out = spawnSync(
		"/home/micha/.local/share/pipx/venvs/playwright/bin/python",
		[script],
		{ encoding: "utf8", timeout: 180000 },
	);
	if (out.status !== 0)
		return [
			{
				name: "actual bundle UI worker",
				pass: false,
				detail: out.stderr || out.error?.message || `Exited ${out.status}`,
			},
		];
	try {
		return JSON.parse(out.stdout);
	} catch (error) {
		return [{ name: "UI worker JSON", pass: false, detail: error.message }];
	}
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const rows = runUITests();
	for (const r of rows)
		if (!r.pass) console.error(`FAIL ${r.name}: ${r.detail}`);
	console.log(
		`${rows.filter((r) => r.pass).length}/${rows.length} UI checks passed`,
	);
	process.exitCode = rows.some((r) => !r.pass) ? 1 : 0;
}
