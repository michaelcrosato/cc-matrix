import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(
	fs.readFileSync(path.join(dir, "..", "build-config.json"), "utf8"),
);
const feedback = JSON.parse(
	fs.readFileSync(path.join(dir, "..", "exit-interview.json"), "utf8"),
);
const read = (file) => fs.readFileSync(path.join(dir, file), "utf8");
const script = (text) =>
	`<script>\n${text.replace(/<\/script/gi, "<\\/script")}\n</script>`;
const client = read("vendor/hub/session.js");
const modules = [
	"vendor/engine/my-3d2dge.js",
	"src/content/content.js",
	"src/sim/sim.js",
	"src/sim/pilot.js",
	"src/view/assets.js",
	"src/view/view.js",
	"src/audio/audio.js",
	"src/input/input.js",
	"src/net/net.js",
	"src/main.js",
];
const html = `<!doctype html>\n<html lang="en"><head>\n<meta charset="utf-8">\n<script>\n${client}\n</script>\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<meta name="theme-color" content="#071b20">\n<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="hub:session" content="1">\n<meta name="hub:session-players" content="1-2">\n<meta name="hub:session-mode" content="shared-world">\n<meta name="hub:session-minutes" content="15">\n<meta name="hub:session-goal" content="Work together to handle ore, catch a rising key and unlock a gate in each of three chambers. Finish the three-bell extraction.">\n<meta name="hub:session-howto" content="Move and climb with the stick or WASD; jump Cross/Space, hold Square/J to chop, R2/Q to redirect, Triangle/E to open or rescue. Picks break after six contacts; chase falling tools and rising keys.">\n<title>${config.title}</title>\n<style>${read("src/view/style.css")}</style>\n</head><body>\n<canvas id="screen" aria-label="Pickaxe Puddles mine arena"></canvas>\n<div id="hud" hidden><div><div class="chamber-pips" id="chamber-pips"></div><div id="chamber-label"></div><div class="chamber-sub" id="chamber-sub"></div></div><div class="hud-right"><div id="miner-hud" style="display:flex;gap:18px"></div><div class="gold-display"><span id="gold-count">000</span><small>SHIFT GOLD</small></div></div></div>\n<div id="bottom-hud" hidden><div id="objective"></div><div id="tutorial"></div><div id="control-legend"></div></div>\n<button id="pause-button" aria-label="Pause and menu" hidden>Ⅱ</button>\n<div id="caption" aria-live="polite"></div><div id="dev-mark" class="dev-mark" hidden>DEVELOPER · RECORDS OFF</div>\n<div id="attract-label" hidden>THE MINE NEVER LEARNS<small>AI DEMONSTRATION · ANY INPUT TO PLAY</small></div>\n<div id="hub-status" hidden></div><button id="context-action" hidden></button><div id="touch-hint" hidden>Left thumb moves & climbs · tap right to jump · chopping is assisted</div><div id="toast" hidden></div>\n<main id="screen-panel" class="title-screen" aria-label="Game menu"></main>\n${script(`globalThis.PP={CONFIG:${JSON.stringify(config)},FEEDBACK:${JSON.stringify(feedback)}};`)}\n${modules.map((f) => script(`/* ${f} */\n${read(f)}`)).join("\n")}\n</body></html>\n`;
const output = path.join(dir, "..", `${config.stem}.html`);
fs.writeFileSync(output, html);
if (!process.argv.includes("--quiet"))
	console.log(
		`Built ${path.basename(output)} (${Math.round(Buffer.byteLength(html) / 1024)} KiB)`,
	);

export { html, output };
