import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const slug = path.basename(root),
	read = (f) => fs.readFileSync(path.join(root, f), "utf8");
const client = read("vendor/hub/session.js");
if (/<\/script/i.test(client))
	throw new Error("Official session client contains unsafe HTML sequence");
const safe = (s) => s.replace(/<\/script/gi, "<\\/script");
const files = [
	"vendor/engine/my-3d2dge.js",
	"src/content.js",
	"src/sim.js",
	"src/presentation/render.js",
	"src/presentation/audio.js",
	"src/input/controls.js",
	"src/online/hub.js",
	"src/dev/editor.js",
	"src/main.js",
];
const report = JSON.parse(
	fs.readFileSync(path.join(root, "..", "exit-interview.json"), "utf8"),
);
const html = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8">\n<script>\n${client}\n</script>\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<title>Yars of Ruin</title>\n<meta name="description" content="A tiny living weapon. An enormous last reply. Bite a breach, call the siege gun and free the swarm.">\n<meta name="theme-color" content="#070e18">\n<meta name="hub:type" content="Game"><meta name="hub:players" content="1-2">\n<meta name="hub:session" content="1"><meta name="hub:session-players" content="1-2"><meta name="hub:session-mode" content="shared-world"><meta name="hub:session-minutes" content="12">\n<meta name="hub:session-goal" content="Free the swarm: dismantle three defense stations together."><meta name="hub:session-howto" content="Left stick / WASD: fly; right stick / mouse: aim; R2 / left click: shoot; bite by contact; L2 / Space: call cannon, then evade.">\n<style>${read("src/style.css")}</style></head><body><canvas id="screen" aria-label="Yars of Ruin game arena"></canvas><div id="game-hud" hidden></div><div id="demo-mark" hidden>DEMO <span>Any input returns to title</span></div><div id="caption" hidden></div><button id="touch-cannon" hidden>CALL CANNON</button><script>globalThis.RUIN_REPORT=${safe(JSON.stringify(report))};</script>\n${files.map((f) => `<script>\n${safe(read(f))}\n</script>`).join("\n")}\n</body></html>\n`;
const out = path.join(root, "..", slug + ".html");
fs.writeFileSync(out, html);
fs.writeFileSync(path.join(root, "index.html"), html);
console.log(
	`Built ${path.basename(out)} (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MiB)`,
);
