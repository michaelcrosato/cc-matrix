import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";

const dir = path.resolve(import.meta.dirname, "..");
const id = JSON.parse(await readFile(path.join(dir, "identity.json"), "utf8"));
const out = await build({
	entryPoints: [path.join(dir, "src/main.js")],
	bundle: true,
	write: false,
	format: "esm",
	target: "es2022",
	legalComments: "inline",
	minify: false,
});
const engine = await readFile(
	path.join(dir, "vendor/engine/my-3d2dge.js"),
	"utf8",
);
const hub = await readFile(path.join(dir, "vendor/hub/session.js"), "utf8");
const css = await readFile(path.join(dir, "style.css"), "utf8");
const license = await readFile(path.join(dir, "vendor/engine/LICENSE"), "utf8");
const esc = (s) => s.replace(/<\/script/gi, "<\\/script");
const html = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8">\n<script>${hub}</script>\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no"><title>${id.title}</title>\n<meta name="description" content="One shot. No shield. Your move. A complete original orbital arcade shooter inspired by UFO! (1981)."><meta name="theme-color" content="#071018">\n<meta name="hub:type" content="Game"><meta name="hub:players" content="1-2"><meta name="hub:session" content="1"><meta name="hub:session-players" content="1-2"><meta name="hub:session-mode" content="shared-world"><meta name="hub:session-minutes" content="12"><meta name="hub:session-goal" content="Clear four sectors and defeat the three-phase command craft as a team"><meta name="hub:session-howto" content="Left stick/WASD move; right stick/mouse aim; R2/Space/click fire; Options/Esc menu. Fire spends shield; ready shield rams and rescues.">\n<style>${css}</style></head><body><canvas id="screen" aria-label="UFOh Orbit orbital combat arena"></canvas><div id="controls-hint" hidden></div><button id="rescue-action" hidden>RESCUE</button>\n<!-- Engine license\n${license}\n-->\n<script>${esc(engine)}</script>\n<script type="module">${esc(out.outputFiles[0].text)}</script>\n</body></html>`;
await mkdir(path.join(dir, "build"), { recursive: true });
await writeFile(path.join(dir, "build/game.html"), html);
await writeFile(path.join(dir, "index.html"), html);
await writeFile(path.join(dir, "..", id.slug + ".html"), html);
if (process.argv.includes("--verbose")) console.log(id.slug + ".html");
