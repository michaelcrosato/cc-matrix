import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const dev = resolve(dirname(fileURLToPath(import.meta.url)), ".."),
	root = resolve(dev, "..");
const project = JSON.parse(readFileSync(resolve(dev, "project.json"), "utf8"));
const read = (p) => readFileSync(resolve(dev, p), "utf8"),
	escape = (s) => s.replace(/<\/script/gi, "<\\/script");
const session = read("vendor/ai-hub/lib/hub/session.js");
const report = JSON.parse(read("src/report.json"));
const modules = [
	"config",
	"sim",
	"assets",
	"audio",
	"input",
	"bot",
	"net",
	"render",
	"main",
];
const html = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8">\n<script>${session}</script>\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<title>${project.title}</title>\n<meta name="description" content="Thread a living minefield. Free the captives. Bring everyone home in a shared rescue ship.">\n<meta name="theme-color" content="#081322">\n<meta name="hub:type" content="Game">\n<meta name="hub:players" content="1–2">\n<meta name="hub:session" content="1">\n<meta name="hub:session-players" content="1-2">\n<meta name="hub:session-mode" content="shared-world">\n<meta name="hub:session-minutes" content="15">\n<meta name="hub:session-goal" content="Rescue crystal captives, break linked minefields and escape the prison carrier together.">\n<meta name="hub:session-howto" content="Pilot: left stick / WASD steers. Navigator: right stick / mouse aims; L2 / Shift commits hyperspace. R2 / Cross / click / Space fires. Solo owns both seats.">\n<style id="game-style">${read("src/style.css")}</style>\n</head><body><canvas id="screen" aria-label="${project.title} rescue flight"></canvas><div id="load-label">RECEIVING RESCUE SIGNAL…</div>\n<script>${escape(read("vendor/engine/dist/handoff/my-3d2dge.js"))}</script>\n${modules
	.map((name) => "<script>" + escape(read("src/" + name + ".js")) + "</script>")
	.join("\n")
	.replace(
		"<script>/* Boot, engine shell",
		"<script>Moonriders.REPORT=" +
			escape(JSON.stringify(report)) +
			";</script>\n<script>/* Boot, engine shell",
	)}\n</body></html>`;
writeFileSync(resolve(root, project.html), html);
writeFileSync(
	resolve(root, "exit-interview.json"),
	JSON.stringify(report, null, 2) + "\n",
);
if (!html.includes("<script>" + session + "</script>"))
	throw Error("Hub client bytes changed");
console.log(`Built ${project.html} (${Buffer.byteLength(html)} bytes)`);
