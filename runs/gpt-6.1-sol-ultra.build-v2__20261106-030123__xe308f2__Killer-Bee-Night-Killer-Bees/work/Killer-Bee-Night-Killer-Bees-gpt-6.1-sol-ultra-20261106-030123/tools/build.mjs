import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, ".."),
	meta = JSON.parse(fs.readFileSync(path.join(root, "selection.json"), "utf8"));
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
const safe = (s) => s.replace(/<\/script/gi, "<\\/script");
const sdk = read("vendor/hub/session.js");
const files = [
	"vendor/engine/my-3d2dge.js",
	"content/stages.js",
	"src/sim.js",
	"src/net.js",
	"src/audio.js",
	"src/render.js",
	"src/credits.js",
	"src/main.js",
];
const scripts = files
	.map(
		(f) =>
			`<script>\n${safe(read(f) + (f === "vendor/engine/my-3d2dge.js" ? `\n/* ${read("vendor/engine/LICENSE")} */` : ""))}\n</script>`,
	)
	.join("\n");
const html = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8">\n<script>${sdk}</script>\n<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">\n<meta name="hub:session" content="1"><meta name="hub:session-players" content="1-2"><meta name="hub:session-mode" content="shared-world"><meta name="hub:session-minutes" content="13"><meta name="hub:session-goal" content="Save the moonlit garden by stinging all clockwork gardeners across six beds."><meta name="hub:session-howto" content="Steer with WASD or left stick. Hold Shift or R2 to Focus. Space or Cross fires a horizontal ray at rival swarms; gardener kills recharge it.">\n<title>${meta.title}</title><style>${read("src/style.css")}</style></head><body><canvas id="screen" aria-label="${meta.title} game"></canvas><noscript>This game needs JavaScript.</noscript>${scripts}</body></html>`;
fs.writeFileSync(path.join(root, "index.html"), html);
fs.writeFileSync(path.join(root, "..", `${meta.slug}.html`), html);
console.log(
	`Built ${meta.slug}.html (${Math.round(Buffer.byteLength(html) / 1024)} KiB)`,
);
