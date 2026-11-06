import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const info = JSON.parse(fs.readFileSync(path.join(root, "docs/build.json")));
const esc = (s) => s.replace(/<\/script/gi, "<\\/script");
const scripts = [
	"vendor/engine/my-3d2dge.js",
	"src/world.js",
	"src/render.js",
	"src/sim.js",
	"src/audio.js",
	"src/network.js",
	"src/app.js",
];
const hub = fs.readFileSync(path.join(root, "vendor/hub/session.js"), "utf8");
const css = fs.readFileSync(path.join(root, "src/style.css"), "utf8");
let metadata = {};
try {
	metadata = JSON.parse(
		fs.readFileSync(path.join(root, "../exit-interview.json"), "utf8"),
	);
} catch {}
const head = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8">\n<script>${esc(hub)}</script>\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#163438"><title>${info.title}</title><meta name="description" content="Five country circuits. One happy little road trip. An overhead racing game inspired by Auto Racing (1980)."><meta name="hub:type" content="Game"><meta name="hub:players" content="1-2"><meta name="hub:session" content="1"><meta name="hub:session-players" content="1-2"><meta name="hub:session-mode" content="shared-world"><meta name="hub:session-minutes" content="3"><meta name="hub:session-goal" content="Pursuit Duel: first to 10 points; crash +2, clear lead +1"><meta name="hub:session-howto" content="Steer: left stick or A/D; brake: L2, Space or S; recover: hold Triangle or R; automatic acceleration"><style>${css}</style></head><body><canvas id="screen" aria-label="Auto Lap Happy racing countryside"></canvas><main id="ui" aria-live="off"></main><script>globalThis.HAPPY_REPORT=${JSON.stringify(metadata).replace(/</g, "\\u003c")};</script>\n`;
const body =
	scripts
		.map(
			(s) =>
				`<script>\n${esc(fs.readFileSync(path.join(root, s), "utf8"))}\n</script>`,
		)
		.join("\n") + "\n</body></html>\n";
const dev = head + body;
fs.writeFileSync(path.join(root, "index.html"), dev);
fs.writeFileSync(path.join(root, "..", info.stem + ".html"), dev);
if (!process.argv.includes("--quiet"))
	console.log(
		`Built ${info.stem}.html (${(Buffer.byteLength(dev) / 1024).toFixed(0)} KiB)`,
	);
