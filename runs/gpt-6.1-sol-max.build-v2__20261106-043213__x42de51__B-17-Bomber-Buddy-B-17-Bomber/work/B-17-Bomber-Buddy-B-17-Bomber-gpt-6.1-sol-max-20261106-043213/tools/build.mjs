import { build } from "esbuild";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
const id = JSON.parse(await readFile(root + "/content/identity.json", "utf8"));
const output = await build({
	entryPoints: [root + "/src/main.js"],
	bundle: true,
	write: false,
	format: "iife",
	target: "es2022",
	legalComments: "inline",
	minify: true,
	logLevel: "silent",
});
const core = await readFile(
	root + "/vendor/engine-repo/dist/handoff/my-3d2dge.js",
	"utf8",
);
const hub = await readFile(
	root + "/vendor/hub-repo/lib/hub/session.js",
	"utf8",
);
const css = await readFile(root + "/src/ui/style.css", "utf8");
const licenses = {};
for (const [name, file] of Object.entries({
	"my-3D2dge MIT": "my-3D2dge-MIT.txt",
	"Three.js MIT": "Three-MIT.txt",
	"Rapier Apache-2.0": "Apache-2.0.txt",
}))
	licenses[name] = await readFile(root + "/vendor/licenses/" + file, "utf8");
const escapeScript = (s) => s.replace(/<\/script/gi, "<\\/script");
let feedback;
try {
	feedback = JSON.parse(
		await readFile(root + "/../exit-interview.json", "utf8"),
	);
} catch {
	feedback = {
		sourceInformation: {
			source: "B-17 Bomber (1982)",
			usage: "added on import",
		},
	};
}
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><script>${hub}</script>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<meta name="hub:session" content="1"><meta name="hub:session-players" content="1-2"><meta name="hub:session-mode" content="shared-world"><meta name="hub:session-minutes" content="12">
<meta name="hub:session-goal" content="Keep one bomber flying. Disable Kestrel Shipyard and bring the crew home.">
<meta name="hub:session-howto" content="WASD fly, E/Q throttle, 1 pilot, 2 guns, 3 bombsight, 4–7 gun bearings, M map, H course hold, Space/click or R2 fire/release. Hold Triangle/Tab for stations. Cross confirms, Circle backs, Options pauses. Co-op shares one aircraft.">
<meta name="description" content="An original bomber crew adventure. Plan the crossing. Defend every bearing. Deliver the parcel. Get everyone home."><title>${id.title}</title><style>${css}</style></head><body>
<main id="stage"><canvas id="view"></canvas><canvas id="screen" aria-label="B-17 Bomber Buddy game"></canvas><div id="loading"><div class="loading-mark">✦</div><h1>BOMBER BUDDY</h1><p id="load-status">Warming four engines…</p></div><div id="html-hud"></div></main>
<script>globalThis.RELEASE_INFO=${JSON.stringify(feedback).replace(/</g, "\\u003c")};globalThis.RELEASE_LICENSES=${JSON.stringify(licenses).replace(/</g, "\\u003c")};</script>
<script>${escapeScript(core)}</script><script>
const rendererProbe=document.createElement('canvas'),rendererGL=rendererProbe.getContext('webgl2');
if(!rendererGL&&!navigator.gpu){document.querySelector('#loading h1').textContent='AIRFIELD CLOSED';document.getElementById('load-status').textContent='This browser needs WebGL 2 or WebGPU to fly. Open this file in a compatible Chromium or Safari browser.';if(AIHub.active)AIHub.connect({mode:'shared-world',seats:[1,2]}).then(()=>AIHub.fail('WebGL 2 or WebGPU unavailable'));}
else{rendererGL?.getExtension('WEBGL_lose_context')?.loseContext();${escapeScript(output.outputFiles[0].text)}}
</script>
</body></html>`;
await writeFile(root + "/../" + id.base + ".html", html);
await writeFile(root + "/game.html", html);
if (!process.argv.includes("--quiet"))
	console.log(
		"Built " +
			id.base +
			".html · " +
			(Buffer.byteLength(html) / 1024 / 1024).toFixed(2) +
			" MiB · offline, single file",
	);
