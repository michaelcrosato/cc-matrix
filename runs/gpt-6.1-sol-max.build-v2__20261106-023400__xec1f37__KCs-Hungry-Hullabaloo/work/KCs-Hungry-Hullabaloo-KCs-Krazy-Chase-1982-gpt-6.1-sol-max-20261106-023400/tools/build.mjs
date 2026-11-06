import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
	out = path.dirname(root),
	meta = JSON.parse(fs.readFileSync(path.join(root, "delivery.json"), "utf8"));
const mods = new Map();
function collect(file) {
	file = path.resolve(file);
	if (mods.has(file)) return;
	let code = fs.readFileSync(file, "utf8");
	const exports = [];
	const dependencies = [];
	code = code.replace(
		/import\s*\{([\s\S]*?)\}\s*from\s*['"](.+?)['"];?/g,
		(_, names, from) => {
			const dep = path.resolve(path.dirname(file), from);
			dependencies.push(dep);
			const binds = names
				.trim()
				.split(",")
				.map((n) => n.trim().replace(/\s+as\s+/, ": "))
				.join(",");
			return `const {${binds}}=__modules[${JSON.stringify(path.relative(root, dep))}];`;
		},
	);
	code = code.replace(
		/export\s+(async\s+)?(const|let|function|class)\s+(\w+)/g,
		(_, async, kind, name) => {
			exports.push(name);
			return `${async || ""}${kind} ${name}`;
		},
	);
	code = code.replace(/export\s*\{([^}]+)\};?/g, (_, names) => {
		exports.push(...names.split(",").map((n) => n.trim()));
		return "";
	});
	for (const dep of dependencies) collect(dep);
	mods.set(
		file,
		`__modules[${JSON.stringify(path.relative(root, file))}]=(()=>{\n${code}\nreturn {${exports.join(",")}};\n})();`,
	);
}
collect(path.join(root, "src/app.js"));
const engine = fs.readFileSync(
		path.join(root, "vendor/engine/my-3d2dge.js"),
		"utf8",
	),
	client = fs.readFileSync(path.join(root, "vendor/hub/session.js"), "utf8");
if (/<\/script/i.test(client))
	throw Error("Pristine client cannot safely inline");
new vm.Script(
	`(function(){const __modules={};${[...mods.values()].join("\n")}})();`,
	{ filename: "hullabaloo.bundle.js" },
);
const license =
	fs.readFileSync(path.join(root, "vendor/engine/LICENSE"), "utf8") +
	"\nAI Hub client v1.4.0: original banner preserved, repository commit 35a1047f2067b2af3de3943f0fe452f39105d869. Separate license at this snapshot: unknown.";
const interview = JSON.parse(
	fs.readFileSync(path.join(out, "exit-interview.json"), "utf8"),
);
const escapeScript = (code) => code.replace(/<\/script/gi, "<\\/script");
const html = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8">\n<script>\n${client}\n</script>\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#0c1b2c">\n<title>${meta.title}</title>\n<meta name="description" content="${interview.aiHub.description}"><meta name="hub:type" content="Game"><meta name="hub:players" content="1-2"><meta name="hub:genre" content="Action"><meta name="hub:tags" content="arcade,co-op,top-down,pixel art,comedy">\n<meta name="hub:session" content="1"><meta name="hub:session-players" content="1-2"><meta name="hub:session-mode" content="shared-world"><meta name="hub:session-minutes" content="15"><meta name="hub:session-goal" content="Clear the glowing tails in all five Venus gardens. Heads always hurt; each bite frightens the sentries."><meta name="hub:session-howto" content="Move: left stick/D-pad or WASD/arrows or drag. Plant bait: Cross/Space/context button. Automatic bites. Shared lives, score and seeds.">\n<style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#0b1828;touch-action:none;overscroll-behavior:none}canvas{width:100%;height:100%;display:block;image-rendering:pixelated;touch-action:none}button{touch-action:manipulation}.esh{--accent:#ffe0a1;--bg:#0f2032;--panel:#152b3d;--text:#f6eacf;--muted:#a8c4cd;--line:#3c6870}.esh-scr{background:rgba(5,16,29,.86)!important}.esh [data-screen=controls]{max-height:92vh}#screen:focus{outline:0}</style></head>\n<body><!-- ${license} --><canvas id="screen" aria-label="${meta.title}. Arcade maze chase. Move with arrows or WASD; Space plants bait. Enter selects, Escape pauses.">Your browser needs Canvas 2D and JavaScript to play.</canvas>\n<script>\n${escapeScript(engine)}\n</script>\n<script>globalThis.HULLABALOO_INTERVIEW=${escapeScript(JSON.stringify(interview))};globalThis.HULLABALOO_DELIVERY=${JSON.stringify(meta)};</script>\n<script>\n(()=>{'use strict';const __modules={};\n${escapeScript([...mods.values()].join("\n"))}\n})();\n</script></body></html>\n`;
const destination = path.join(out, meta.html);
fs.writeFileSync(destination, html);
if (process.argv.includes("--quiet") === false)
	console.log(
		`Built ${meta.html} (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MiB)`,
	);
