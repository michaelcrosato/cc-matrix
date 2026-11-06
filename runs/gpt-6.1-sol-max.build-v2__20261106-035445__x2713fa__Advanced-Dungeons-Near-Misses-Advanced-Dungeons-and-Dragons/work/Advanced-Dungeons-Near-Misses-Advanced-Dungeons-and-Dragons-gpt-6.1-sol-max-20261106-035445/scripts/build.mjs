import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL("../", import.meta.url)),
	identity = JSON.parse(readFileSync(path.join(dir, "identity.json"), "utf8"));
const read = (p) => readFileSync(path.join(dir, p), "utf8");
const script = (code) =>
	`<script>\n${code.replace(/<\/script/gi, "<\\/script")}\n</script>`;
const modules = [
	"src/config.js",
	"src/content/campaign.js",
	"src/sim/geometry.js",
	"src/sim/simulation.js",
	"src/render/art.js",
	"src/render/render.js",
	"src/audio/audio.js",
	"src/input/input.js",
	"src/net/network.js",
	"src/save/save.js",
	"src/ui/ui.js",
	"src/main.js",
];
let interview = {};
try {
	interview = JSON.parse(
		readFileSync(path.join(dir, "..", "exit-interview.json"), "utf8"),
	);
} catch {}
const client = read("vendor/hub/session.js");
const html = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8">\n${script(client)}\n<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover">\n<meta name="theme-color" content="#102329"><meta name="description" content="A bow, three arrows, and a mountain that listens. An original 1–2 ranger expedition.">\n<meta name="hub:type" content="Game"><meta name="hub:players" content="1-2"><meta name="hub:session" content="1"><meta name="hub:session-players" content="1-2"><meta name="hub:session-mode" content="shared-world"><meta name="hub:session-minutes" content="22"><meta name="hub:session-goal" content="Recover the axe, boat and key; reunite the two guardian-held Crown halves."><meta name="hub:session-howto" content="Left stick / WASD move; right stick / mouse aim; R2 / click fire; L2 / right click listen; Circle / Space quickstep; Cross / E interact; Triangle / Tab map. Shared quiver. Revive a fallen ranger by holding interact.">\n<title>${identity.title.replaceAll("&", "&amp;")}</title>\n<style>${read("src/style.css")}</style>\n</head><body><canvas id="screen" aria-label="Advanced Dungeons and Near Misses game world"></canvas>\n${script(read("vendor/engine/my-3d2dge.js"))}\n${script(`globalThis.NM={Interview:${JSON.stringify(interview)}};`)}\n${modules.map((p) => script(read(p))).join("\n")}\n<!-- Engine license: ${read("vendor/engine/LICENSE").replaceAll("--", "—")} -->\n</body></html>`;
const out = path.join(dir, "..", identity.html);
writeFileSync(out, html);
writeFileSync(path.join(dir, "index.html"), html);
console.log(
	`Built ${identity.html} (${Buffer.byteLength(html).toLocaleString()} bytes)`,
);
