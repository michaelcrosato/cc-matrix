import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const stem = path.basename(ROOT),
	about = JSON.parse(
		await readFile(path.join(ROOT, "..", "exit-interview.json"), "utf8"),
	);
const client = await readFile(
	path.join(ROOT, "vendor/hub/lib/hub/session.js"),
	"utf8",
);
if (/<\/script/i.test(client))
	throw Error("Released client embedding conflict");
const engine = await readFile(
	path.join(ROOT, "vendor/engine/my-3d2dge.js"),
	"utf8",
);
const css = await readFile(path.join(ROOT, "src/style.css"), "utf8");
const modules = [
	"data/balance",
	"data/encounters",
	"sim/world",
	"sim/bot",
	"render/assets",
	"render/scene",
	"audio",
	"input",
	"ui/screens",
	"online",
	"main",
];
let source =
	"globalThis.Fortnight={ABOUT:" +
	JSON.stringify(about) +
	",CSS:" +
	JSON.stringify(css) +
	"};\n";
for (const file of modules)
	source +=
		(await readFile(path.join(ROOT, "src", file + ".js"), "utf8")) + "\n";
const esc = (s) => s.replace(/<\/script/gi, "<\\/script");
const html = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8">\n<script>${client}</script>\n<title>Space Fortnight — Three lines. One last stand.</title>\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<meta name="description" content="An original three-act arcade siege. Intercept in free flight, cool Fortress 13, then hold the ground against the Night Admiral. Solo and 1–4 pilot co-op.">\n<meta name="theme-color" content="#07141f">\n<meta name="hub:type" content="Game">\n<meta name="hub:name" content="Space Fortnight">\n<meta name="hub:genre" content="Shooter">\n<meta name="hub:players" content="1–4">\n<meta name="hub:session" content="1">\n<meta name="hub:session-players" content="1-4">\n<meta name="hub:session-mode" content="shared-world">\n<meta name="hub:session-minutes" content="12">\n<meta name="hub:session-goal" content="Repel three defensive lines and destroy the siege ship before the ground base falls.">\n<meta name="hub:session-howto" content="Left stick / WASD: thrust; right stick / mouse: aim; R2 / left click: laser; L2 / Space: boost; Square / E / right click: pulse; Options / Escape: menu. Touch: left thumb moves, right drag aims and fires, assisted fire when released.">\n<style>html,body{margin:0;height:100%;background:#07141f;color:#f0dfb4;overflow:hidden}#boot-error{padding:32px;font:24px monospace}</style>\n</head><body>\n<canvas id="screen" aria-label="Space Fortnight combat arena"></canvas>\n<button id="menu-toggle" aria-label="Tactical menu" hidden>☰</button>\n<aside id="radio" hidden><b>FORTRESS COMMAND / RADIO</b><p></p></aside>\n<div id="flight-help" hidden></div>\n<button id="touch-pulse" class="touch-action" hidden>PULSE</button>\n<button id="touch-boost" class="touch-action boost" hidden>BOOST</button>\n<div id="hub-state" hidden></div>\n<p id="boot-error" role="alert" hidden></p>\n<script>${esc(engine)}</script>\n<script>${esc(source)}</script>\n</body></html>\n`;
await writeFile(path.join(ROOT, "..", stem + ".html"), html);
await writeFile(path.join(ROOT, "game.html"), html);
if (!process.argv.includes("--quiet")) console.log(stem + ".html");
