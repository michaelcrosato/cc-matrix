import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const selection = JSON.parse(
	fs.readFileSync(path.join(root, "selection.json"), "utf8"),
);
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const hub = read("vendor/hub/session.js");
if (/<\/script/i.test(hub))
	throw Error("Hub client contains HTML script terminator");
const release = JSON.parse(
	fs.readFileSync(path.join(root, "../exit-interview.json"), "utf8"),
);
const script = (s) =>
	`<script>\n${s.replace(/<\/script/gi, "<\\/script")}\n</script>\n`;
const html =
	'<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><script>' +
	hub +
	"</script>\n" +
	'<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">\n' +
	'<meta name="hub:session" content="1"><meta name="hub:session-players" content="1-2"><meta name="hub:session-mode" content="shared-world"><meta name="hub:session-goal" content="Catch every runaway snack across six mazes together. Share five lives and one team score."><meta name="hub:session-howto" content="Steer with a stick, D-pad, WASD or arrows. Space / south face button reveals hidden walls. Catch bright snacks to eat the three predators."><meta name="hub:session-minutes" content="12">\n' +
	"<title>" +
	selection.title +
	"</title><style>" +
	read("src/style.css") +
	'</style></head><body><canvas id="screen" aria-label="K.C. Chomp Chase maze game"></canvas><div id="boot">WAKING THE SNACKS…</div><button id="corner" aria-label="Pause menu">☰</button><button id="chirp" aria-label="Reveal walls" hidden>♪</button><div id="editorbar" hidden></div>\n' +
	script(read("vendor/engine/my-3d2dge.js")) +
	script(`globalThis.ChompRelease=${JSON.stringify(release)};`) +
	["content", "sim", "network", "audio", "view", "workshop", "main"]
		.map((n) => script(read(`src/${n}.js`)))
		.join("") +
	"</body></html>\n";
fs.writeFileSync(path.join(root, `../${selection.folder}.html`), html);
fs.mkdirSync(path.join(root, "build"), { recursive: true });
fs.writeFileSync(path.join(root, "build/game.html"), html);
if (!html.includes(`<meta charset="utf-8"><script>${hub}</script>`))
	throw Error("Hub first script is not byte-identical");
process.stdout.write(`Built ${selection.folder}.html\n`);
