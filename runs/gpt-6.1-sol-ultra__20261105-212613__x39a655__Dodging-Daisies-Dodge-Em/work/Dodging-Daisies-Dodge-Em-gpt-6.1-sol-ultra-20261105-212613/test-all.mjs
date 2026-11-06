import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const directory = dirname(fileURLToPath(import.meta.url));
const python = "/home/micha/.local/share/pipx/venvs/playwright/bin/python";
const cachePath = join(directory, ".test-cache.json");
const suites = [
	{
		name: "packaging",
		command: ["node", "test-package.mjs"],
		dependencies: [
			"../Dodging-Daisies-Dodge-Em-gpt-6.1-sol-ultra-20261105-212613.html",
			"index.html",
			"../exit-interview.json",
			"main.js",
			"hub/session.js",
		],
	},
	{
		name: "core",
		command: ["node", "test-core.mjs"],
		dependencies: ["core.js"],
	},
	{
		name: "audio",
		command: [python, "test-audio.py"],
		dependencies: ["audio.js"],
	},
	{
		name: "network",
		command: [python, "test-network.py"],
		dependencies: ["net.js", "hub/session.js", "net-test.html"],
	},
	{
		name: "scene",
		command: [python, "test-scene.py"],
		dependencies: ["scene.js", "core.js#track", "scene-test.html"],
	},
	{
		name: "browser",
		command: [python, "test-browser.py"],
		dependencies: [
			"main.js",
			"core.js",
			"physics.js",
			"template.html",
			"style.css",
			"scene.js",
			"net.js",
			"audio.js",
		],
	},
	{
		name: "hub",
		command: [python, "test-hub-game.py"],
		dependencies: [
			"main.js",
			"net.js",
			"core.js",
			"physics.js",
			"hub/session.js",
			"template.html",
			"hub/harness.html",
			"hub/bridge.js",
			"hub/round.js",
		],
	},
];
// Validate the release after any rebuild performed by the browser or Hub suites.
suites.push(suites.shift());
let cache = { version: 1, suites: {} };
try {
	const stored = JSON.parse(await readFile(cachePath, "utf8"));
	if (stored.version === 1 && stored.suites) cache = stored;
} catch {
	/* A missing cache means the corresponding suites will run. */
}

async function fingerprint(suite) {
	const hash = createHash("sha256");
	hash.update(JSON.stringify(suite.command));
	for (const item of [suite.command[1], ...suite.dependencies]) {
		const [filename, portion] = item.split("#");
		let source = await readFile(join(directory, filename), "utf8");
		if (portion === "track") {
			const at = source.search(/export\s+class\s+Game\b/);
			if (at < 0)
				throw new Error("core.js does not contain the Game class boundary.");
			source = source.slice(0, at);
		}
		hash.update(item);
		hash.update("\0");
		hash.update(source);
		hash.update("\0");
	}
	return hash.digest("hex");
}

function run(command) {
	return new Promise((resolve) => {
		let output = "";
		let timedOut = false;
		const child = spawn(command[0], command.slice(1), {
			cwd: directory,
			env: { ...process.env, PYTHONUNBUFFERED: "1" },
			stdio: ["ignore", "pipe", "pipe"],
		});
		child.stdout.on("data", (data) => {
			output += data.toString();
		});
		child.stderr.on("data", (data) => {
			output += data.toString();
		});
		const timer = setTimeout(() => {
			timedOut = true;
			child.kill("SIGTERM");
		}, 300000);
		child.on("error", (error) => {
			clearTimeout(timer);
			resolve({ code: -1, output: `${output}\n${error.message}`, timedOut });
		});
		child.on("close", (code, signal) => {
			clearTimeout(timer);
			resolve({ code: code ?? -1, output, timedOut, signal });
		});
	});
}

function counts(output) {
	const matches = [
		...output.matchAll(
			/(\d+)\s+passed,\s*(\d+)\s+failed|(\d+)\/(\d+)\s+(?:scene|browser)\s+checks\s+passed|(\d+)\s+(?:core|audio|packaging)\s+checks,\s*(\d+)\s+failures/g,
		),
	];
	const match = matches.at(-1);
	if (!match) return null;
	if (match[1] !== undefined)
		return { passed: Number(match[1]), failed: Number(match[2]) };
	if (match[3] !== undefined)
		return {
			passed: Number(match[3]),
			failed: Number(match[4]) - Number(match[3]),
		};
	return {
		passed: Number(match[5]) - Number(match[6]),
		failed: Number(match[6]),
	};
}

const args = process.argv.slice(2);
if (args[0] === "--record") {
	for (const argument of args.slice(1)) {
		const match =
			/^(core|audio|network|scene|browser|hub|packaging)=(\d+)$/.exec(argument);
		if (!match)
			throw new Error(
				"Use --record suite=successful-check-count after a verified successful run.",
			);
		const suite = suites.find((item) => item.name === match[1]);
		cache.suites[suite.name] = {
			hash: await fingerprint(suite),
			passed: Number(match[2]),
			failed: 0,
			failures: [],
			verifiedAt: new Date().toISOString(),
			provenance:
				"Recorded from a prior verified successful run; recording did not execute tests.",
		};
	}
	await writeFile(cachePath, `${JSON.stringify(cache, null, 2)}\n`);
	const total = Object.values(cache.suites).reduce(
		(sum, suite) => sum + suite.passed,
		0,
	);
	console.log(
		`${total} passed, 0 failed (${Object.keys(cache.suites).length} suites recorded).`,
	);
} else {
	let passed = 0;
	let failed = 0;
	let cached = 0;
	let executed = 0;
	let rebuilt = false;
	let buildFailure = null;
	let log = `Dodging Daisies test run ${new Date().toISOString()}\n`;
	for (const suite of suites) {
		let hash;
		try {
			hash = await fingerprint(suite);
		} catch (error) {
			failed++;
			console.log(`FAIL ${suite.name}: ${error.message}`);
			log += `\n[${suite.name}] fingerprint failed: ${error.stack}\n`;
			continue;
		}
		const previous = cache.suites[suite.name];
		if (previous?.hash === hash) {
			passed += previous.passed;
			failed += previous.failed;
			cached++;
			for (const failure of previous.failures ?? [])
				console.log(`FAIL ${suite.name} (cached): ${failure}`);
			log += `\n[${suite.name}] cached: ${previous.passed} passed, ${previous.failed} failed; verified ${previous.verifiedAt}; ${previous.provenance}\n`;
			continue;
		}
		if (["browser", "hub"].includes(suite.name) && !rebuilt) {
			const build = await run(["node", "build.mjs"]);
			rebuilt = true;
			log += `\n[build]\n${build.output}\n`;
			if (build.code !== 0) buildFailure = build;
		}
		if (["browser", "hub"].includes(suite.name) && buildFailure) {
			failed++;
			console.log(`FAIL ${suite.name}: build failed; see test-last.log.`);
			continue;
		}
		const result = await run(suite.command);
		executed++;
		log += `\n[${suite.name}] ${suite.command.join(" ")}\n${result.output}\nexit=${result.code}${result.signal ? ` signal=${result.signal}` : ""}\n`;
		const summary = counts(result.output);
		const failureLines = result.output
			.split(/\r?\n/)
			.filter((line) => /^FAIL\b/.test(line))
			.map((line) => line.replace(/^FAIL\s*:?\s*/, ""));
		const outcome = summary ?? { passed: 0, failed: 1 };
		if (!summary)
			failureLines.push("No valid test summary; see test-last.log.");
		if (result.code !== 0 && outcome.failed === 0) {
			outcome.failed++;
			failureLines.push(
				result.timedOut
					? "Suite timed out after 300 seconds; see test-last.log."
					: `Suite exited ${result.code}; see test-last.log.`,
			);
		}
		if (outcome.failed > 0 && !failureLines.length)
			failureLines.push(
				`${outcome.failed} check(s) failed; see test-last.log.`,
			);
		for (const failure of failureLines)
			console.log(`FAIL ${suite.name}: ${failure}`);
		cache.suites[suite.name] = {
			hash,
			...outcome,
			failures: failureLines,
			verifiedAt: new Date().toISOString(),
			provenance: "Executed by test-all.mjs.",
		};
		passed += outcome.passed;
		failed += outcome.failed;
		await writeFile(cachePath, `${JSON.stringify(cache, null, 2)}\n`);
	}
	await writeFile(join(directory, "test-last.log"), log);
	console.log(
		`${passed} passed, ${failed} failed (${executed} suites run, ${cached} cached).`,
	);
	process.exitCode = failed ? 1 : 0;
}
