import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dir, "..");
const identity = JSON.parse(fs.readFileSync(path.join(root, "identity.json")));
const vendor = path.join(root, "vendor/engine/vendor");
const built = await Bun.build({
	entrypoints: [path.join(root, "src/app.js")],
	target: "browser",
	format: "iife",
	minify: true,
	plugins: [
		{
			name: "native-vendors",
			setup(b) {
				b.onResolve(
					{
						filter:
							/^(three(?:\/webgpu|\/tsl)?|@dimforge\/rapier3d-simd-compat)$/,
					},
					(a) => ({
						path:
							a.path === "three/tsl"
								? path.join(vendor, "three-0.182.0/three.tsl.min.js")
								: a.path.startsWith("three")
									? path.join(vendor, "three-0.182.0/three.webgpu.min.js")
									: path.join(vendor, "rapier3d-simd-compat-0.19.3/rapier.js"),
					}),
				);
			},
		},
	],
});
if (!built.success) {
	for (const l of built.logs) console.error(l);
	process.exit(1);
}
const escaped = (s) => s.replace(/<\/script/gi, "<\\/script");
// Three r182 reads WebGPU IDL constants while importing its WebGL backend too.
// Supply only the standard constants when a browser has no WebGPU interface;
// navigator.gpu stays absent and the native WebGL capability check still applies.
const compatibility = `globalThis.GPUShaderStage??=Object.freeze({VERTEX:1,FRAGMENT:2,COMPUTE:4});globalThis.GPUBufferUsage??=Object.freeze({MAP_READ:1,MAP_WRITE:2,COPY_SRC:4,COPY_DST:8,INDEX:16,VERTEX:32,UNIFORM:64,STORAGE:128,INDIRECT:256,QUERY_RESOLVE:512});globalThis.GPUTextureUsage??=Object.freeze({COPY_SRC:1,COPY_DST:2,TEXTURE_BINDING:4,STORAGE_BINDING:8,RENDER_ATTACHMENT:16});globalThis.GPUMapMode??=Object.freeze({READ:1,WRITE:2});`;
const engine = fs.readFileSync(
	path.join(root, "vendor/engine/dist/handoff/my-3d2dge.js"),
	"utf8",
);
const client = fs.readFileSync(
	path.join(root, "vendor/ai-hub/lib/hub/session.js"),
	"utf8",
);
const app = await built.outputs[0].text(),
	css = fs.readFileSync(path.join(root, "src/style.css"), "utf8");
const notices = [
	"vendor/engine/LICENSE",
	"vendor/engine/vendor/three-0.182.0/LICENSE",
	"vendor/engine/vendor/rapier3d-simd-compat-0.19.3/LICENSE",
]
	.map((p) =>
		fs.existsSync(path.join(root, p))
			? fs.readFileSync(path.join(root, p), "utf8")
			: "",
	)
	.join("\n\n");
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><script>${client}</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>${identity.title}</title>
<meta name="hub:session" content="1"><meta name="hub:session-players" content="1-2"><meta name="hub:session-mode" content="shared-world"><meta name="hub:session-minutes" content="12"><meta name="hub:session-goal" content="Destroy the Greyhaven military transport and bring your bomber crew home. Work together at flight, gun and bombardier stations."><meta name="hub:session-howto" content="WASD fly, E/Q power, 1 pilot, 2 guns, 3 bombsight, mouse aim, Space/click fire or release, M map, H course hold. Pad: sticks fly/aim, R2 fire, Triangle stations, Square map, L1/R1 power, L3 hold.">
<meta name="description" content="One bomber. Six stations. Bring everyone home. A complete cooperative flight-action sortie."><style>${css}</style></head><body>
<main id="stage"><canvas id="screen" aria-label="B-17 Cross Channel Chaos flight view"></canvas></main>
<div id="hud" hidden></div><div id="attract-label" hidden><b>DEMONSTRATION</b><span>Any input returns to the flight desk</span></div>
<div id="loading"><span class="wing-mark">✦</span><strong>ASSEMBLING THE CREW</strong><small>Preparing aircraft & airspace</small></div>
<div id="support" hidden></div><script id="legal-notices" type="text/plain">${escaped(notices)}</script>
<script>${escaped(engine)}</script><script>${compatibility}</script><script>${escaped(app)}</script></body></html>`;
fs.writeFileSync(path.join(root, "game.html"), html);
fs.writeFileSync(path.join(root, "..", identity.slug + ".html"), html);
const credits = JSON.parse(
	fs.readFileSync(path.join(root, "content/credits.json"), "utf8"),
);
fs.writeFileSync(
	path.join(root, "..", "exit-interview.json"),
	JSON.stringify(credits, null, 2) + "\n",
);
if (!process.argv.includes("--quiet"))
	console.log(
		identity.slug +
			".html · " +
			(Buffer.byteLength(html) / 1048576).toFixed(2) +
			" MB · self-contained",
	);
