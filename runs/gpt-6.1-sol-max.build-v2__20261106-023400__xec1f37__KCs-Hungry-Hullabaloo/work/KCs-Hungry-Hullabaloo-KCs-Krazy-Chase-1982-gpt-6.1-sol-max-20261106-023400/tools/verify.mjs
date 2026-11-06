import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findClients } from "../vendor/hub-check/scripts/lib/hub-client.mjs";
import { staticHandler } from "../vendor/hub-check/scripts/lib/serve.mjs";

const dev = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.dirname(dev),
	meta = JSON.parse(fs.readFileSync(path.join(dev, "delivery.json"), "utf8"));
const python =
	process.env.PLAYWRIGHT_PYTHON ||
	"/home/micha/.local/share/pipx/venvs/playwright/bin/python";
const selected = new Set(
	(
		process.argv.find((a) => a.startsWith("--only="))?.slice(7) ||
		"sim,net,tools,devices,integration,hub,delivery,lint"
	).split(","),
);
const tmp = path.join(dev, ".cache/browser-tmp");
fs.mkdirSync(tmp, { recursive: true });
let passed = 0,
	failed = 0;
const failures = [],
	groups = {};
function fail(message) {
	failed++;
	failures.push(message);
	console.log(`FAIL ${message}`);
}
function tally(group, result) {
	passed += result.passed;
	failed += result.failed;
	groups[group] = { passed: result.passed, failed: result.failed };
	for (const failure of result.failures || []) {
		failures.push(`${group}: ${failure}`);
		console.log(`FAIL ${group}: ${failure}`);
	}
}
async function run(command, args) {
	return new Promise((resolve) => {
		const child = spawn(command, args, {
			cwd: dev,
			env: { ...process.env, TMPDIR: tmp },
			stdio: ["ignore", "pipe", "pipe"],
		});
		let stdout = "",
			stderr = "";
		child.stdout.on("data", (s) => (stdout += s));
		child.stderr.on("data", (s) => (stderr += s));
		child.on("error", (e) =>
			resolve({ code: -1, stdout, stderr: stderr + e.message, pid: child.pid }),
		);
		child.on("close", (code) =>
			resolve({ code, stdout, stderr, pid: child.pid }),
		);
	});
}
async function browserGroup(name, file, args = []) {
	const result = await run(python, ["-u", file, ...args]);
	const matches = [...result.stdout.matchAll(/(\d+) passed,\s*(\d+) failed/g)];
	if (!matches.length) {
		fail(`${name}: no test summary\n${result.stdout}${result.stderr}`);
		return;
	}
	const m = matches.at(-1);
	const lines = result.stdout.split("\n").filter((l) => l.startsWith("FAIL "));
	tally(name, { passed: Number(m[1]), failed: Number(m[2]), failures: lines });
	if (result.code !== 0 && !Number(m[2]))
		fail(`${name}: process failed\n${result.stderr}`);
}
async function delivery() {
	let count = 0;
	const test = (label, fn) => {
		try {
			fn();
			count++;
		} catch (e) {
			fail(`delivery ${label}: ${e.message}`);
		}
	};
	const html = fs.readFileSync(path.join(root, meta.html), "utf8"),
		data = JSON.parse(
			fs.readFileSync(path.join(root, "exit-interview.json"), "utf8"),
		);
	test("interview schema", () => {
		assert.deepEqual(
			Object.keys(data).sort(),
			[
				"sourceInformation",
				"testingFeedback",
				"engineFeedback",
				"promptFeedback",
				"aiHub",
			].sort(),
		);
		for (const [key, n] of [
			["testingFeedback", 4],
			["engineFeedback", 6],
			["promptFeedback", 4],
		]) {
			assert.equal(data[key].length, n);
			assert.ok(data[key].every((v) => typeof v === "string" && v.length > 0));
		}
	});
	test("all source fields", () => {
		assert.deepEqual(
			Object.keys(data.sourceInformation).sort(),
			[
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
			].sort(),
		);
		assert.ok(
			Object.values(data.sourceInformation).every(
				(v) => typeof v === "string" && v,
			),
		);
		assert.equal(data.sourceInformation.usage, "added on import");
		assert.equal(data.sourceInformation.plan, "PLAN.md");
	});
	test("catalogue and title agreement", () => {
		assert.equal(data.aiHub.name, meta.title);
		assert.ok(html.includes(`<title>${meta.title}</title>`));
		assert.ok(html.includes(`"name":"${meta.title}"`));
		assert.equal(data.aiHub.type, "Game");
		assert.equal(data.aiHub.players, "1–2");
		assert.ok(
			data.aiHub.tags.length >= 3 &&
				data.aiHub.tags.length <= 6 &&
				data.aiHub.tags.every((t) => t === t.toLowerCase()),
		);
	});
	test("exactly one pristine first-script Hub client", () => {
		const clients = findClients(html);
		assert.equal(clients.length, 1);
		assert.ok(clients[0].pristine);
		assert.equal(clients[0].version, "1.4.0");
		const client = fs.readFileSync(
			path.join(dev, "vendor/hub/session.js"),
			"utf8",
		);
		assert.ok(
			html.startsWith(
				`<!doctype html>\n<html lang="en"><head><meta charset="utf-8">\n<script>\n${client}`,
			),
		);
	});
	test("pinned full engine and no duplicate modules", () => {
		assert.equal((html.match(/my-3D2dge v0\.89\.1 {2}\(My/g) || []).length, 1);
		assert.ok(html.includes("MIT License"));
		assert.equal((html.match(/class GridMover/g) || []).length, 1);
		assert.equal((html.match(/class Arcade \{/g) || []).length, 1);
	});
	test("self-contained deployable HTML", () => {
		assert.ok(!/<script[^>]+src\s*=/i.test(html));
		assert.ok(!/<link[^>]+href\s*=/i.test(html));
		assert.ok(html.includes('<meta name="hub:session-players" content="1-2">'));
		assert.ok(
			html.includes('<meta name="hub:session-mode" content="shared-world">'),
		);
		assert.ok(!/<meta name="hub:webgpu"/i.test(html));
		assert.ok(html.includes("globalThis.HULLABALOO_INTERVIEW="));
	});
	test("required delivery names and progress", () => {
		assert.ok(
			meta.html.endsWith(
				"-KCs-Krazy-Chase-1982-gpt-6.1-sol-max-20261106-023400.html",
			),
		);
		assert.ok(fs.existsSync(path.join(root, "PROGRESS.md")));
		assert.ok(fs.existsSync(path.join(dev, "README.md")));
	});
	const manifest = {
		title: meta.title,
		html: meta.html,
		sha256: createHash("sha256").update(html).digest("hex"),
		bytes: Buffer.byteLength(html),
		engine: meta.engine,
		hub: meta.hub,
		runtimeDependencies: "none",
	};
	fs.writeFileSync(
		path.join(dev, "artifacts/build-manifest.json"),
		`${JSON.stringify(manifest, null, 2)}\n`,
	);
	passed += count;
	groups.delivery = { passed: count, failed: 0 };
}
try {
	const build = await run(process.execPath, ["tools/build.mjs", "--quiet"]);
	if (build.code !== 0)
		throw Error(`Assembly failed: ${build.stdout}${build.stderr}`);
	if (selected.has("sim"))
		tally("sim", (await import("../tests/sim-tests.mjs")).runSimTests());
	if (selected.has("net"))
		tally("net", await (await import("../tests/net-tests.mjs")).runNetTests());
	if (selected.has("tools"))
		tally("tools", (await import("../tests/tools-tests.mjs")).runToolsTests());
	if (selected.has("devices"))
		await browserGroup("devices", "tests/device-checks.py");
	if (selected.has("integration"))
		await browserGroup("integration", "tests/integration-checks.py");
	if (selected.has("hub")) {
		const checkerRoot = path.join(dev, "vendor/hub-check");
		fs.copyFileSync(
			path.join(root, meta.html),
			path.join(checkerRoot, "game.html"),
		);
		const server = createServer(staticHandler(checkerRoot));
		await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
		try {
			const base = `http://127.0.0.1:${server.address().port}`;
			const result = await run(process.execPath, [
				"vendor/hub-check/scripts/hub-check.mjs",
				"/game.html",
				"--players",
				"2",
				"--base",
				base,
				"--json",
			]);
			fs.writeFileSync(
				path.join(dev, "artifacts/hub-official.json"),
				result.stdout,
			);
			fs.writeFileSync(
				path.join(dev, "artifacts/hub-official.stderr"),
				result.stderr,
			);
			fs.writeFileSync(
				path.join(dev, "artifacts/official-loopback.json"),
				JSON.stringify(
					{
						pid: process.pid,
						runnerPid: result.pid,
						port: server.address().port,
						base,
					},
					null,
					2,
				),
			);
			const report = JSON.parse(result.stdout);
			const checks = report.runs.flatMap((r) =>
				r.checks.map((c) => ({ ...c, scenario: r.scenario })),
			);
			tally("hub", {
				passed: checks.filter((c) => c.pass).length,
				failed: checks.filter((c) => !c.pass).length,
				failures: checks
					.filter((c) => !c.pass)
					.map((c) => `${c.scenario}: ${c.name} ${c.detail}`),
			});
			if (!report.pass && !checks.some((c) => !c.pass))
				fail("official Hub runner did not pass");
		} finally {
			await new Promise((resolve) => server.close(resolve));
		}
	}
	if (selected.has("delivery")) await delivery();
	if (selected.has("lint"))
		for (const [name, command, args] of [
			[
				"JavaScript",
				"biome",
				["check", "--diagnostic-level=error", "src", "tools", "tests"],
			],
			["Python", "ruff", ["check", "tests"]],
		]) {
			const r = await run(command, args);
			if (r.code === 0) passed++;
			else fail(`${name} checks: ${r.stdout}${r.stderr}`);
		}
} catch (e) {
	fail(e.stack || String(e));
}
const evidence = {
	passed,
	failed,
	groups,
	failures,
	selection: [...selected],
	artifact: meta.html,
};
fs.writeFileSync(
	path.join(dev, "artifacts/verification.json"),
	`${JSON.stringify(evidence, null, 2)}\n`,
);
console.log(`Verification: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
