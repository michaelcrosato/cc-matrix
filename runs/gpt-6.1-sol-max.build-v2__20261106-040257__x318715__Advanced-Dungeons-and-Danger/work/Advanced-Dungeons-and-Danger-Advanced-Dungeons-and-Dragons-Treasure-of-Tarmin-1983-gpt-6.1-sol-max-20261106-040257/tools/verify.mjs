import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Model } from "../src/core/model.js";
import { runNetworkTests } from "./net-test.mjs";
import { scriptedRoute } from "./route.mjs";
import { runRuleTests } from "./rules-test.mjs";

process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."));
const failures = [];
let total = 0;
const rules = runRuleTests();
total += rules.count;
failures.push(...rules.failures);
const net = await runNetworkTests();
total += net.total;
failures.push(...net.failures);
const r = scriptedRoute(new Model({ seed: 43021, runId: "browser-route" }));
fs.mkdirSync("build", { recursive: true });
fs.writeFileSync(
	"build/route-fixture.json",
	JSON.stringify({ run: "browser-route", ...r }),
);
const config = JSON.parse(fs.readFileSync("build-config.json", "utf8"));
const artifact = path.resolve("..", config.html),
	interview = path.resolve("..", "exit-interview.json");
function check(name, fn) {
	total++;
	try {
		if (!fn()) failures.push(name);
	} catch (e) {
		failures.push(name + ": " + e.message);
	}
}
check("delivery artifact exists", () => fs.statSync(artifact).size > 1000000);
check(
	"canonical JSON report matches delivery",
	() =>
		JSON.stringify(JSON.parse(fs.readFileSync(interview))) ===
		JSON.stringify(JSON.parse(fs.readFileSync("src/report.json"))),
);
check("report required shapes/usage", () => {
	const r = JSON.parse(fs.readFileSync(interview));
	return (
		Object.keys(r).join(",") ===
			"sourceInformation,testingFeedback,engineFeedback,promptFeedback,aiHub" &&
		Object.keys(r.sourceInformation).length === 15 &&
		r.sourceInformation.usage === "added on import" &&
		r.testingFeedback.length === 4 &&
		r.engineFeedback.length === 6 &&
		r.promptFeedback.length === 4 &&
		r.aiHub.tags.length >= 3 &&
		r.aiHub.tags.length <= 6
	);
});
check("unmodified session client is first head script", () => {
	const h = fs.readFileSync(artifact, "utf8"),
		s = fs
			.readFileSync("vendor/hub/session.js", "utf8")
			.replace(/<\/script/gi, "<\\/script");
	return h.includes('<meta charset="utf-8">\n<script>' + s + "</script>");
});
check("all runtime module and WASM dependencies bundled", () => {
	const h = fs
		.readFileSync(artifact, "utf8")
		.replace(
			/<script\b[^>]*>[\s\S]*?<\/script>/gi,
			(m) => m.slice(0, m.indexOf(">") + 1) + "</script>",
		);
	return (
		!/<script[^>]+src=/.test(h) &&
		!/<link[^>]+href=/.test(h) &&
		!/<script[^>]*type="module"/.test(h)
	);
});
if (!process.argv.includes("--rules")) {
	const groups = process.argv.slice(2).filter((a) => !a.startsWith("--"));
	const artifactHash = createHash("sha256")
		.update(fs.readFileSync(artifact))
		.digest("hex");
	const file =
		"evidence/release-" +
		(groups.length
			? groups
			: ["file", "touch", "rtc", "hub", "fallbacks"]
		).join("-") +
		".json";
	fs.rmSync(file, { force: true });
	const p = spawnSync(
		"/home/micha/.local/share/pipx/venvs/playwright/bin/python",
		["tools/browser-test.py", ...groups],
		{ encoding: "utf8", maxBuffer: 6000000, timeout: 600000 },
	);
	if (fs.existsSync(file)) {
		const report = JSON.parse(fs.readFileSync(file));
		if (report.artifactSha256 !== artifactHash)
			failures.push("Browser evidence belongs to a different artifact");
		total += report.total;
		failures.push(
			...report.checks
				.filter((c) => !c.pass)
				.map((c) => c.name + ": " + c.detail),
		);
	} else
		failures.push(
			"Browser runner failed to produce evidence: " + p.stdout + " " + p.stderr,
		);
	if (p.status !== 0 && !fs.existsSync(file))
		failures.push("Browser runner exit " + p.status);
	if (!groups.length || groups.includes("network-release")) {
		const netFile = "evidence/network-release-rtc-hub.json";
		fs.rmSync(netFile, { force: true });
		const release = spawnSync(
			"/home/micha/.local/share/pipx/venvs/playwright/bin/python",
			["tools/network-release.py"],
			{ encoding: "utf8", maxBuffer: 6000000, timeout: 300000 },
		);
		if (fs.existsSync(netFile)) {
			const report = JSON.parse(fs.readFileSync(netFile));
			total += report.total;
			failures.push(
				...report.checks
					.filter((c) => !c.pass)
					.map((c) => c.name + ": " + c.detail),
			);
			if (report.evidence.artifactSha256 !== artifactHash)
				failures.push("Co-op evidence belongs to a different artifact");
		} else
			failures.push(
				"Cooperative release runner failed: " +
					release.stdout +
					" " +
					release.stderr,
			);
	}
}
for (const f of failures) console.error("FAIL " + f);
console.log(
	`${total - failures.length}/${total} checks passed; ${failures.length} failures.`,
);
process.exitCode = failures.length ? 1 : 0;
