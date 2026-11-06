import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
	filter = process.argv[2] || "all",
	results = [];
const take = (r) => results.push(...r),
	python = "/home/micha/.local/share/pipx/venvs/playwright/bin/python";
function py(file, args = [], timeout = 300000) {
	const r = spawnSync(python, [path.join(root, "tools", file), ...args], {
		encoding: "utf8",
		timeout,
		cwd: root,
	});
	try {
		const data = JSON.parse(r.stdout);
		if (Array.isArray(data)) take(data);
		else if (Array.isArray(data.results)) take(data.results);
		else results.push({ name: file, pass: false, detail: r.stdout });
	} catch {
		results.push({
			name: file,
			pass: false,
			detail: r.stderr || r.error?.message || r.stdout,
		});
	}
}
if (["all", "core"].includes(filter)) {
	const { runCoreTests } = await import("./core-test.mjs");
	take(runCoreTests());
}
if (["all", "audio"].includes(filter)) {
	const { runAudioTests } = await import("./audio-test.mjs");
	take(runAudioTests());
}
if (["all", "network"].includes(filter)) {
	const { runNetworkUnitTests } = await import("./network-unit.mjs");
	take(await runNetworkUnitTests());
	py("network-test.py");
	py("network-test.py", ["file"]);
}
if (["all", "hub"].includes(filter)) py("hub-test.py", [], 300000);
if (
	["all", "ui"].includes(filter) &&
	fs.existsSync(path.join(root, "tools/ui-test.py"))
)
	py("ui-test.py");
if (["all", "direct"].includes(filter)) {
	py("network-game-test.py", ["loopback"], 180000);
	py("network-game-test.py", ["file"], 180000);
}
if (["all", "gameplay"].includes(filter)) py("gameplay-test.py", [], 180000);
if (["all", "package"].includes(filter)) {
	const info = JSON.parse(fs.readFileSync(path.join(root, "docs/build.json"))),
		file = fs.readFileSync(path.join(root, "..", info.stem + ".html"), "utf8"),
		client = fs
			.readFileSync(path.join(root, "vendor/hub/session.js"), "utf8")
			.replace(/<\/script/gi, "<\\/script");
	const check = (name, pass, detail = "") =>
		results.push({ name, pass, detail });
	check(
		"Single HTML includes official unmodified client first after charset",
		file.indexOf("<script>" + client + "</script>") ===
			file.indexOf("<script>") &&
			file.indexOf("<meta charset=") < file.indexOf("<script>"),
	);
	check(
		"Final root artifact equals validated development copy",
		file === fs.readFileSync(path.join(root, "index.html"), "utf8"),
	);
	check(
		"All ordinary runtime scripts/assets are inline",
		!/<script[^>]+src=|<link[^>]+href=|<audio\b|\.mp3\b|\.wav\b/.test(file),
	);
	check(
		"Final HTML has session metadata and every reporting section",
		[
			"hub:session-mode",
			"Source Information",
			"Testing Feedback",
			"Engine Feedback",
			"Prompt Feedback",
			"added on import",
		].every((x) => file.includes(x)),
	);
	try {
		const r = JSON.parse(
			fs.readFileSync(path.join(root, "../exit-interview.json"), "utf8"),
		);
		check(
			"Exit interview exact top-level shape and complete values",
			Object.keys(r).sort().join(",") ===
				"aiHub,engineFeedback,promptFeedback,sourceInformation,testingFeedback" &&
				r.testingFeedback.length === 4 &&
				r.engineFeedback.length === 6 &&
				r.promptFeedback.length === 4 &&
				Object.values(r.sourceInformation).every(
					(x) => typeof x === "string" && x.length,
				) &&
				r.sourceInformation.usage === "added on import" &&
				r.aiHub.name === info.title &&
				r.aiHub.genre === "Racing",
		);
	} catch (e) {
		check("Exit interview parses", false, e.message);
	}
}
fs.mkdirSync(path.join(root, "evidence"), { recursive: true });
fs.writeFileSync(
	path.join(root, "evidence/test-" + filter + ".json"),
	JSON.stringify(results, null, 2),
);
for (const r of results)
	if (!r.pass)
		console.error(`FAIL ${r.name}: ${r.detail || "assertion failed"}`);
console.log(
	`${results.filter((r) => r.pass).length}/${results.length} checks passed`,
);
process.exitCode = results.some((r) => !r.pass) ? 1 : 0;
