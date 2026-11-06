import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);
const config = JSON.parse(fs.readFileSync("build-config.json", "utf8"));
const args = process.argv.slice(2);
const custom = args.indexOf("--content");
let original = null;
if (custom >= 0) {
	const filename = args[custom + 1];
	if (!filename) throw Error("--content needs a JSON filename");
	const { validateContent } = await import("../src/core/model.js");
	const data = JSON.parse(fs.readFileSync(filename));
	const r = validateContent(data);
	if (!r.ok) throw Error(r.errors.join("\n"));
	original = fs.readFileSync("src/content/campaign.js", "utf8");
	fs.writeFileSync(
		"src/content/campaign.js",
		`export const DEFAULT_TUNING=${JSON.stringify(data.tuning)};export const CONTENT=${JSON.stringify(data)};export const ITEMS=CONTENT.items;export const ENEMIES=CONTENT.enemies;export const FLOORS=CONTENT.floors;`,
	);
}
fs.mkdirSync("build", { recursive: true });
try {
	const result = spawnSync(
		"bun",
		[
			"build",
			"src/main.js",
			"--target",
			"browser",
			"--format",
			"iife",
			"--minify",
			"--outfile",
			"build/game.js",
		],
		{ encoding: "utf8" },
	);
	if (result.status !== 0) throw Error(result.stderr || result.stdout);
	const esc = (s) => s.replace(/<\/script/gi, "<\\/script");
	const css = fs.readFileSync("src/ui/style.css", "utf8");
	const session = fs.readFileSync("vendor/hub/session.js", "utf8");
	const core = fs.readFileSync("vendor/engine/my-3d2dge.js", "utf8");
	const bundle = fs.readFileSync("build/game.js", "utf8");
	const report = JSON.parse(fs.readFileSync("src/report.json", "utf8"));
	let licenses =
		"my-3D2dge / World3D\n" + fs.readFileSync("vendor/engine/LICENSE", "utf8");
	for (const file of [
		"vendor/engine/RAPIER-LICENSE.txt",
		"node_modules/three/LICENSE",
		"node_modules/@dimforge/rapier3d-simd-compat/LICENSE",
	])
		if (fs.existsSync(file))
			licenses += "\n\n" + file + "\n" + fs.readFileSync(file, "utf8");
	const html = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8">\n<script>${esc(session)}</script>\n<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover">\n<meta name="hub:session" content="1"><meta name="hub:session-players" content="1-2"><meta name="hub:session-mode" content="shared-world"><meta name="hub:session-minutes" content="10"><meta name="hub:session-goal" content="Descend three vaults, defeat the Minotaur and claim the Emberheart together."><meta name="hub:session-howto" content="WASD step; Q/E turn; F interact; Enter commit; Tab pack; M map. Standard pad: left stick move, shoulders turn, Cross interact, R2 commit, Triangle pack, Square swap, Options menu.">\n<meta name="description" content="Two strengths. Six slots. No way back. A complete first-person tactical dungeon expedition for one or two adventurers.">\n<title>${config.title}</title><style>${css}</style></head><body>\n<div id="stage"><canvas id="view" aria-hidden="true"></canvas><canvas id="screen" aria-label="First person dungeon view"></canvas></div><div id="ambience"></div>\n<div id="boot"><div class="sigil">◇</div><h1>Lighting the lantern</h1><p>Preparing stone, steel and spirit…</p><progress></progress></div>\n<div id="attract-banner" hidden>THE VAULT REMEMBERS · press any button to return</div>\n<div id="server-status" hidden>Authoritative expedition · no local adventurer</div>\n<div id="session-ended" hidden><h2>The expedition has ended.</h2><p></p><button id="ended-title" class="hud-button">Return to title</button></div>\n<script type="application/json" id="game-credits">${esc(JSON.stringify(report))}</script>\n<script type="text/plain" id="dependency-licenses">${esc(licenses)}</script>\n<script>${esc(core)}</script>\n<script>if(!globalThis.GPUShaderStage)globalThis.GPUShaderStage=Object.freeze({VERTEX:1,FRAGMENT:2,COMPUTE:4});${esc(bundle)}</script>\n</body></html>`;
	const out = path.join(root, "..", config.html);
	fs.writeFileSync(out, html);
	fs.copyFileSync(
		"src/report.json",
		path.join(root, "..", "exit-interview.json"),
	);
	fs.writeFileSync(
		"build/artifact.json",
		JSON.stringify(
			{
				file: out,
				bytes: Buffer.byteLength(html),
				built: new Date().toISOString(),
			},
			null,
			2,
		),
	);
	console.log(
		`Built ${config.html} (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MiB; all runtime dependencies embedded)`,
	);
} finally {
	if (original !== null) fs.writeFileSync("src/content/campaign.js", original);
}
