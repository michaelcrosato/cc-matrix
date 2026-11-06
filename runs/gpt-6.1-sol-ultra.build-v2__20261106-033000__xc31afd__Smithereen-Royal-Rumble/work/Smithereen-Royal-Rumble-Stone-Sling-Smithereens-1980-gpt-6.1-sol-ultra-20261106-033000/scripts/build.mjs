import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const project = JSON.parse(
	fs.readFileSync(path.join(root, "project.json"), "utf8"),
);
const bundle = await build({
	entryPoints: [path.join(root, "src/main.js")],
	bundle: true,
	format: "iife",
	target: "es2022",
	write: false,
	legalComments: "none",
	minify: false,
});
const engine = fs.readFileSync(
	path.join(root, "vendor/engine/my-3d2dge.js"),
	"utf8",
);
const hub = fs.readFileSync(path.join(root, "vendor/hub/session.js"), "utf8");
if (/<\/script/i.test(hub))
	throw new Error("Released client contains unsafe script terminator");
const safe = (s) => s.replace(/<\/script/gi, "<\\/script");
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><script>${hub}</script>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<meta name="hub:session" content="1"><meta name="hub:session-players" content="2-2"><meta name="hub:session-mode" content="shared-world"><meta name="hub:session-minutes" content="3"><meta name="hub:session-goal" content="Demolish the opposing castle. At three minutes: castle health percentage, then direct score."><meta name="hub:session-howto" content="Hold Cross or Space to wind, release to throw. L1/R1 or Q/E choose stones. Interrupt crew or launcher; break supports.">
<title>${project.title}</title><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#141d28;color:#f7e7bd;font-family:Georgia,serif;touch-action:none;overscroll-behavior:none}canvas#screen{display:block;width:100%;height:100%;image-rendering:pixelated;outline:none}#boot-error{position:fixed;inset:20%;z-index:999;background:#231d30;padding:32px;font-size:24px}button,input,select{font:inherit}*:focus-visible{outline:3px solid #f5ca6b;outline-offset:3px}</style></head><body><canvas id="screen" tabindex="0" aria-label="Smithereen Royal Rumble battlefield"></canvas><p id="boot-error" hidden></p><script>${safe(engine)}</script><script>${safe(bundle.outputFiles[0].text)}</script></body></html>`;
fs.writeFileSync(path.join(root, "index.html"), html);
const output = path.join(root, "..", project.basename + ".html");
fs.writeFileSync(output, html);
fs.copyFileSync(
	path.join(root, "metadata.json"),
	path.join(root, "..", "exit-interview.json"),
);
fs.writeFileSync(
	path.join(root, "artifacts/build.json"),
	JSON.stringify(
		{
			title: project.title,
			output: path.basename(output),
			bytes: Buffer.byteLength(html),
			engine: "0.89.1",
			hub: "1.4.0",
		},
		null,
		2,
	) + "\n",
);
console.log(
	`Built ${path.basename(output)} (${Buffer.byteLength(html)} bytes)`,
);
