import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
const selection = JSON.parse(fs.readFileSync("title-selection.json", "utf8"));
const compiled = await build({
	entryPoints: ["main.js"],
	bundle: true,
	format: "esm",
	write: false,
	minify: true,
	target: "es2022",
	external: ["three/webgpu", "three/tsl", "https://*"],
	logLevel: "silent",
});
let html = fs.readFileSync("shell.html", "utf8");
html = html.replace(
	"<!-- HUB_SESSION -->",
	"<script>" +
		fs.readFileSync("session.js", "utf8") +
		"</script>\n" +
		`<meta name="hub:session" content="1"><meta name="hub:session-players" content="1-2"><meta name="hub:session-mode" content="shared-world"><meta name="hub:session-goal" content="Cross four jungle trials and rescue Pip the toucan"><meta name="hub:session-howto" content="Move: stick or WASD. Jump/release vine: Cross or Space. Swat/ring: Square or E. Duck: Circle or S."><meta name="hub:session-minutes" content="7">`,
);
let interview;
try {
	interview = JSON.parse(fs.readFileSync("../exit-interview.json", "utf8"));
} catch {}
if (interview) {
	let esc = (s) =>
		String(s)
			.replaceAll("&", "&amp;")
			.replaceAll("<", "&lt;")
			.replaceAll(">", "&gt;");
	let about =
		"<h3>Source Information</h3>" +
		Object.entries(interview.sourceInformation)
			.map(
				([k, v]) =>
					`<p><b>${k[0].toUpperCase() + k.slice(1)}:</b> ${esc(v)}</p>`,
			)
			.join("");
	for (let key of ["testingFeedback", "engineFeedback", "promptFeedback"])
		about +=
			`<h3>${(key[0].toUpperCase() + key.slice(1)).replace("Feedback", " Feedback")}</h3>` +
			interview[key].map((v) => `<p>${esc(v)}</p>`).join("");
	about +=
		'<h3>Research & acknowledgements</h3><p>Original design, code, synthesized music and procedural artwork by OpenAI Codex. Inspired by Taito’s Jungle Hunt and its 1983 home versions. No original game assets or audio used.</p><p><a href="https://www.atariage.com/2600/manuals_old/jungle_hunt.html" target="_blank" rel="noopener">Atari instruction manual</a> · <a href="https://www.arcade-history.com/?id=1242&n=jungle-hunt&page=detail" target="_blank" rel="noopener">Arcade history</a> · <a href="https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub" target="_blank" rel="noopener">AI Hub protocol</a></p>';
	html = html.replace("<!-- ABOUT -->", about);
}
html = html.replace(
	"<!-- GAME_CODE -->",
	compiled.outputFiles[0].text.replaceAll("</script", "<\\/script"),
);
const dest = path.resolve("..", selection.folder + ".html");
fs.writeFileSync(dest, html);
console.log(
	"Built " +
		path.basename(dest) +
		" (" +
		Math.round(html.length / 1024) +
		" KB)",
);
