import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const id = JSON.parse(readFileSync(resolve(root, "identity.json"), "utf8"));
mkdirSync(resolve(root, "build"), { recursive: true });
const built = spawnSync(
	"bun",
	[
		"build",
		"src/main.js",
		"--target=browser",
		"--format=iife",
		"--outfile=build/game.js",
	],
	{ cwd: root, encoding: "utf8" },
);
if (built.status !== 0) throw Error(built.stderr || built.stdout);
const sdk = readFileSync(resolve(root, "vendor/hub/session.js"), "utf8"),
	engine = readFileSync(resolve(root, "vendor/engine/my-3d2dge.js"), "utf8"),
	game = readFileSync(resolve(root, "build/game.js"), "utf8"),
	css = readFileSync(resolve(root, "src/style.css"), "utf8");
const safe = (s) => s.replace(/<\/script/gi, "<\\/script");
const html = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<script>${sdk}</script>\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<title>${id.title}</title>\n<meta name="description" content="Twelve tiny bees. One very late garden emergency. A complete moonlit arcade campaign for one or two swarms.">\n<meta name="theme-color" content="#101f27">\n<meta name="hub:type" content="Game">\n<meta name="hub:players" content="1-2">\n<meta name="hub:session" content="1">\n<meta name="hub:session-players" content="1-2">\n<meta name="hub:session-mode" content="shared-world">\n<meta name="hub:session-minutes" content="12">\n<meta name="hub:session-goal" content="Sting the clockwork gardeners, save your bees, and silence the Bellwether in six garden encounters.">\n<meta name="hub:session-howto" content="Move: left stick / WASD / arrows. Hold R2 / Shift to Focus. Cross / Space fires a horizontal ray. Kill a gardener to recharge. Touch: left drag, right hold, Ray button.">\n<style>${css}</style>\n</head>\n<body>\n<canvas id="screen" aria-label="${id.title}: moonlit swarm arcade game"></canvas>\n<script>${safe(engine)}</script>\n<script>${safe(game)}</script>\n</body>\n</html>\n`;
writeFileSync(resolve(root, "../", id.artifact), html);
writeFileSync(resolve(root, "build/index.html"), html);
const interview = JSON.parse(
	readFileSync(resolve(root, "interview.json"), "utf8"),
);
writeFileSync(
	resolve(root, "../exit-interview.json"),
	JSON.stringify(interview, null, 2) + "\n",
);
console.log(
	`Built ${id.artifact} (${(Buffer.byteLength(html) / 1024).toFixed(0)} KiB)`,
);
