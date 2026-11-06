import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(path.dirname(fileURLToPath(import.meta.url))),
	stem = path.basename(dir);
const read = (p) => fs.readFileSync(path.join(dir, p), "utf8");
const interview = JSON.parse(
	fs.readFileSync(path.join(dir, "../exit-interview.json"), "utf8"),
);
fs.writeFileSync(
	path.join(dir, "src/about.js"),
	"globalThis.SF=globalThis.SF||{};SF.ABOUT=" + JSON.stringify(interview) + ";",
);
const client = read("vendor/hub-repo/lib/hub/session.js");
if (/<\/script/i.test(client))
	throw Error("Released client embedding conflict");
const escape = (s) => s.replace(/<\/script/gi, "<\\/script");
const code = [
	"vendor/engine-repo/dist/handoff/my-3d2dge.js",
	"src/world.js",
	"src/render.js",
	"src/audio.js",
	"src/input.js",
	"src/online.js",
	"src/about.js",
	"src/main.js",
]
	.map((p) => "<script>\n" + escape(read(p)) + "\n</script>")
	.join("\n");
const html =
	'<!doctype html>\n<html lang="en"><head><meta charset="utf-8">\n<script>\n' +
	client +
	'\n</script>\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Space Fort After Dark</title>\n<meta name="hub:session" content="1"><meta name="hub:session-players" content="1-4"><meta name="hub:session-mode" content="shared-world"><meta name="hub:session-minutes" content="11"><meta name="hub:session-goal" content="Repel the siege across three lines and destroy Nightjar before the base falls"><meta name="hub:session-howto" content="Move: left stick / WASD. Aim: right stick / mouse. Fire: R2 / click. Boost: L2 / Space. Pulse: Square / E."><meta name="description" content="A complete three-act arcade siege for one to four pilots."><meta name="theme-color" content="#071222"><style>' +
	read("src/style.css") +
	'</style></head><body><canvas id="screen" aria-label="Space Fort After Dark playfield"></canvas>' +
	code +
	"</body></html>";
const out = path.join(dir, "..", stem + ".html");
fs.writeFileSync(out, html);
if (process.argv.includes("--print")) console.log(out);
