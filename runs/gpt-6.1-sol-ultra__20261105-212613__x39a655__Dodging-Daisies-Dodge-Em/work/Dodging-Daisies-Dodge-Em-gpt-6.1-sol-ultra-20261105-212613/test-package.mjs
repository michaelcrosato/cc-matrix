import { readFileSync } from "node:fs";

const release =
	"../Dodging-Daisies-Dodge-Em-gpt-6.1-sol-ultra-20261105-212613.html";
const html = readFileSync(release, "utf8"),
	interview = JSON.parse(readFileSync("../exit-interview.json", "utf8"));
const checks = [
	["no remote script dependencies", !/<script[^>]+src=/i.test(html)],
	[
		"no external stylesheet dependency",
		!/<link[^>]+rel=["']stylesheet/i.test(html),
	],
	[
		"no unfinished game markers",
		!/(TODO|PLACEHOLDER|stubbed feature)/.test(readFileSync("main.js", "utf8")),
	],
	[
		"unmodified session client embedded",
		html.includes(readFileSync("hub/session.js", "utf8")),
	],
	[
		"interview schema",
		Object.keys(interview).join(",") ===
			"sourceInformation,testingFeedback,engineFeedback,promptFeedback,aiHub",
	],
	[
		"all required feedback answers",
		interview.testingFeedback.length === 4 &&
			interview.engineFeedback.length === 6 &&
			interview.promptFeedback.length === 4 &&
			Object.values(interview.sourceInformation).every(
				(x) => typeof x === "string" && x.length > 0,
			),
	],
	[
		"development and release artifacts match",
		html === readFileSync("index.html", "utf8"),
	],
];
for (const [name, pass] of checks) if (!pass) console.log("FAIL " + name);
const failed = checks.filter((x) => !x[1]).length;
console.log(`${checks.length} packaging checks, ${failed} failures`);
process.exitCode = failed ? 1 : 0;
