import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);
const results = [];
const check = (name, pass, detail = "") =>
	results.push({ name, pass: !!pass, detail });
const sub = (cmd, args) =>
	spawnSync(cmd, args, {
		cwd: root,
		encoding: "utf8",
		maxBuffer: 8 * 1024 * 1024,
		timeout: 900000,
	});
async function suite(name, fn) {
	try {
		await fn();
	} catch (e) {
		check(name, false, e.stack || String(e));
	}
}

await suite("build", async () => {
	const b = sub(process.execPath, ["tools/build.mjs", "--quiet"]);
	check("single-file reproducible build", b.status === 0, b.stderr || b.stdout);
	const identity = JSON.parse(fs.readFileSync("build-identity.json", "utf8"));
	const html = fs.readFileSync(
		path.join("..", identity.basename + ".html"),
		"utf8",
	);
	const scripts = [
		...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi),
	].map((m) => m[1]);
	for (let i = 0; i < scripts.length; i++)
		new vm.Script(scripts[i], { filename: `shipping-script-${i}.js` });
	check(
		"all embedded scripts parse",
		scripts.length === 9,
		`${scripts.length} scripts`,
	);
	const pristine = fs.readFileSync("vendor/ai-hub/session.js", "utf8");
	check(
		"one pristine Hub client first after charset",
		scripts[0] === pristine && html.match(/aihub-session 1.4.0/g)?.length === 1,
	);
	check(
		"standalone has no adjacent asset imports",
		!/<script\b[^>]*src=|<link\b[^>]*href=|<img\b[^>]*src=/i.test(html),
	);
	const interview = JSON.parse(
		fs.readFileSync("../exit-interview.json", "utf8"),
	);
	const keys = [
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
	];
	check(
		"exit interview exact schema / nonempty required strings",
		keys.every(
			(k) =>
				typeof interview.sourceInformation[k] === "string" &&
				interview.sourceInformation[k].length > 0,
		) &&
			interview.sourceInformation.usage === "added on import" &&
			interview.testingFeedback.length === 4 &&
			interview.engineFeedback.length === 6 &&
			interview.promptFeedback.length === 4 &&
			interview.aiHub.tags.length >= 3 &&
			interview.aiHub.tags.length <= 6 &&
			interview.aiHub.name === identity.title,
	);
});
await suite("rules", async () => {
	const module = await import("../tests/rules.mjs");
	const output = await (module.runRules || module.default)();
	if (Array.isArray(output)) results.push(...output);
	else {
		for (const f of output.failures || [])
			check("rule: " + (f.name || f), false, f.error || "");
		for (let i = 0; i < output.count - (output.failures?.length || 0); i++)
			check("rule scenario " + (i + 1), true);
	}
});
await suite("network", async () => {
	const module = await import("../tests/network.cjs");
	results.push(...(await module.default()));
});
await suite("presentation", async () => {
	const module = await import("../tests/presentation.cjs");
	results.push(...(await module.default()));
});
await suite("network full rescue routes", async () => {
	const module = await import("../tests/network-route.cjs");
	results.push(...(await module.default()));
});
for (const [label, script, report] of [
	["packaged browser", "tools/check-browser.py", "browser-checks.json"],
	["packaged sound", "tools/check-audio.py", "audio-checks.json"],
	["packaged controls", "tools/check-controls.py", "controls-checks.json"],
	["Hub harness", "tools/check-hub.py", "hub-checks.json"],
	["packaged Hub rescue", "tools/check-hub-rescue.py", "hub-rescue.json"],
]) {
	await suite(label, async () => {
		const p = sub("/home/micha/.local/share/pipx/venvs/playwright/bin/python", [
			script,
		]);
		let data;
		try {
			data = JSON.parse(
				fs.readFileSync(path.join("artifacts", report), "utf8"),
			);
		} catch {}
		if (Array.isArray(data))
			results.push(...data.map((r) => ({ ...r, name: label + ": " + r.name })));
		else if (data?.results)
			results.push(
				...data.results.map((r) => ({ ...r, name: label + ": " + r.name })),
			);
		if (p.status !== 0)
			check(label + " runner exit", false, (p.stderr || p.stdout).slice(-6000));
	});
}
fs.writeFileSync(
	"artifacts/verification.json",
	JSON.stringify(results, null, 2),
);
const failures = results.filter((r) => !r.pass);
for (const f of failures)
	process.stdout.write(
		"FAIL " +
			f.name +
			": " +
			(f.detail || f.error || "assertion failed") +
			"\n",
	);
process.stdout.write(
	`${results.length - failures.length}/${results.length} checks passed\n`,
);
process.exitCode = failures.length ? 1 : 0;
