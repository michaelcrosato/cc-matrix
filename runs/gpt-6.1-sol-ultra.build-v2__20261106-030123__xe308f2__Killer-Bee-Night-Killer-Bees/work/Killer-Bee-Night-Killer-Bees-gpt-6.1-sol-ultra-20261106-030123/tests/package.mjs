import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(import.meta.dirname, "..");
export function runPackageTests() {
	const read = (p) => fs.readFileSync(path.join(root, p), "utf8"),
		selection = JSON.parse(read("selection.json")),
		html = read(`../${selection.slug}.html`),
		results = [];
	const check = (name, pass) => results.push({ name, pass: !!pass });
	check(
		"random title draw recorded once among fifty candidates",
		selection.candidateCount === 50 &&
			selection.randomIndex >= 0 &&
			selection.randomIndex < 50 &&
			selection.title === "Killer Bee Night",
	);
	check(
		"prescribed artifact name and title",
		selection.slug ===
			"Killer-Bee-Night-Killer-Bees-gpt-6.1-sol-ultra-20261106-030123" &&
			html.includes(`<title>${selection.title}</title>`),
	);
	check(
		"root artifact equals tested development export",
		html === read("index.html"),
	);
	const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
		(m) => m[1],
	);
	check(
		"pristine SDK first script immediately after charset",
		scripts[0] === read("vendor/hub/session.js") &&
			html.indexOf("<script>") < html.indexOf('name="viewport"'),
	);
	check(
		"full functioning native engine included once",
		scripts.filter((s) => s.includes("class Game {")).length === 1 &&
			html.includes("my-3D2dge v0.89.1"),
	);
	check(
		"engine MIT permission notice retained",
		html.includes(read("vendor/engine/LICENSE")),
	);
	check(
		"all inline scripts parse after safe closing-script export",
		scripts.length === 9 &&
			scripts.every((s) => {
				try {
					new vm.Script(s);
					return true;
				} catch {
					return false;
				}
			}),
	);
	check(
		"official Hub metadata present",
		[
			"session",
			"session-players",
			"session-mode",
			"session-minutes",
			"session-goal",
			"session-howto",
		].every((k) => html.includes(`name="hub:${k}"`)),
	);
	check(
		"standalone runtime has no external asset tags or audio files",
		!/<script[^>]+src=|<link[^>]+href=|<audio\b|<video\b|data:audio|\.mp3\b|\.ogg\b|\.wav\b/i.test(
			html,
		),
	);
	check(
		"artifact has no absolute workstation paths",
		!html.includes("/home/micha/") && !html.includes("file:///"),
	);
	const data = JSON.parse(read("../exit-interview.json")),
		required = [
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
		"exact interview root schema and complete source information",
		JSON.stringify(Object.keys(data).sort()) ===
			JSON.stringify(
				[
					"sourceInformation",
					"testingFeedback",
					"engineFeedback",
					"promptFeedback",
					"aiHub",
				].sort(),
			) &&
			required.every(
				(k) =>
					typeof data.sourceInformation[k] === "string" &&
					data.sourceInformation[k].length > 0,
			) &&
			Object.keys(data.sourceInformation).length === 15 &&
			data.sourceInformation.usage === "added on import",
	);
	check(
		"all prescribed feedback questions answered",
		data.testingFeedback.length === 4 &&
			data.engineFeedback.length === 6 &&
			data.promptFeedback.length === 4 &&
			[
				...data.testingFeedback,
				...data.engineFeedback,
				...data.promptFeedback,
			].every((s) => typeof s === "string" && s.length > 0),
	);
	const ctx = vm.createContext({});
	vm.runInContext(read("src/credits.js"), ctx);
	check(
		"in-game credits exactly match delivered interview",
		Object.keys(ctx.NightCredits).every(
			(k) => JSON.stringify(ctx.NightCredits[k]) === JSON.stringify(data[k]),
		),
	);
	check(
		"catalogue reflects chosen title and delivered modes",
		data.aiHub.name === selection.title &&
			data.aiHub.genre === "Action" &&
			data.aiHub.players === "1–2" &&
			data.aiHub.tags.length >= 3 &&
			data.aiHub.tags.length <= 6,
	);
	return results;
}
