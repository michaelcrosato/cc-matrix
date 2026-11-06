import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const identity = JSON.parse(read("build-identity.json"));
const interview = JSON.parse(
	fs.readFileSync(path.join(root, "../exit-interview.json"), "utf8"),
);
const js = (p) => read(p).replace(/<\/script/gi, "<\\/script");
const modules = [
	"vendor/engine-repo/dist/handoff/my-3d2dge.js",
	"content/tower.js",
	"src/simulation.js",
	"src/presentation.js",
	"src/audio.js",
	"src/network.js",
	"src/bootstrap.js",
];
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<script>${read("vendor/ai-hub/session.js")}</script>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
<meta name="theme-color" content="#122c38">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-2">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-minutes" content="8">
<meta name="hub:session-goal" content="Climb the Mutton Building, catch Mabel’s hearts, and rescue her from Horrible Hank. Win together!">
<meta name="hub:session-howto" content="Stick or WASD/arrows: move and climb open windows. Cross/Space: jump. Options/Escape: local settings. Hearts protect the whole team for six seconds.">
<meta name="build-id" content="${identity.basename}">
<title>${identity.title}</title>
<!-- my-3D2dge license\n${read("vendor/engine-repo/LICENSE")}\n-->
<style>${read("src/style.css")}</style>
</head><body data-build="${identity.basename}"><canvas id="screen" aria-label="Beauty and the Tall Tale game"></canvas>
<script>window.__TT_META=${JSON.stringify(interview).replace(/</g, "\\u003c")};window.__TT_ID=${JSON.stringify(identity)};</script>
${modules.map((p) => `<script>\n${js(p)}\n</script>`).join("\n")}
</body></html>`;
const out = path.join(root, "..", identity.basename + ".html");
fs.writeFileSync(out, html);
fs.writeFileSync(
	path.join(root, "artifacts/build.json"),
	JSON.stringify(
		{
			basename: identity.basename,
			bytes: Buffer.byteLength(html),
			engine: "0.89.1",
			engineRevision: "8ecc2f62353761187bdfe226f327b7ea5d2eb691",
			hubClient: "1.4.0",
			hubRevision: "35a1047f2067b2af3de3943f0fe452f39105d869",
		},
		null,
		2,
	),
);
if (!process.argv.includes("--quiet")) console.log(path.basename(out));
