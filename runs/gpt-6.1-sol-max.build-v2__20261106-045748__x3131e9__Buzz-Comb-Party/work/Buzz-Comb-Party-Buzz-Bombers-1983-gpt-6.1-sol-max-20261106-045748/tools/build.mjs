import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(resolve(root, p), "utf8");
const release = JSON.parse(read("release.json"));
const modules = [
	"tuning",
	"content",
	"simulation",
	"pilot",
	"rigs",
	"audio",
	"presentation",
	"input",
	"screens",
	"network",
	"main",
];
const escaped = (s) => s.replace(/<\/script/gi, "<\\/script");
let report = {};
try {
	report = JSON.parse(read("../exit-interview.json"));
} catch {}
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><script>${read("vendor/hub/session.js")}</script>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="hub:session" content="1"><meta name="hub:session-players" content="1-2"><meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-goal" content="Save six gardens. Spray bees, feed combs to Pip and open the pageant shields with red harvests.">
<meta name="hub:session-howto" content="Move: stick or A/D. Spray: Cross/R2 or Space. Call Pip: Square or E. Touch: drag below, tap combs. Shared score and cans.">
<meta name="hub:session-minutes" content="15"><meta name="description" content="A tactical garden arcade: spritz responsibly, feed extravagantly.">
<title>${release.title}</title><style>${read("src/style.css")}</style></head><body><canvas id="screen" aria-label="Buzz Comb Party garden arcade"></canvas>
<script>/*! ${read("vendor/engine/LICENSE")} */\n${escaped(read("vendor/engine/my-3d2dge.js"))}</script>
<script>globalThis.BCP={REPORT:${JSON.stringify(report).replaceAll("<", "\\u003c")}};</script>
<script>${escaped(modules.map((f) => read("src/" + f + ".js")).join("\n"))}</script></body></html>`;
writeFileSync(resolve(root, "../" + release.basename + ".html"), html);
writeFileSync(
	resolve(root, "evidence/build.json"),
	JSON.stringify(
		{
			title: release.title,
			bytes: Buffer.byteLength(html),
			engineRevision: release.engineRevision,
			hubRevision: release.hubRevision,
			modules,
		},
		null,
		2,
	),
);
if (!process.argv.includes("--quiet"))
	console.log(
		release.basename + ".html (" + Buffer.byteLength(html) + " bytes)",
	);
