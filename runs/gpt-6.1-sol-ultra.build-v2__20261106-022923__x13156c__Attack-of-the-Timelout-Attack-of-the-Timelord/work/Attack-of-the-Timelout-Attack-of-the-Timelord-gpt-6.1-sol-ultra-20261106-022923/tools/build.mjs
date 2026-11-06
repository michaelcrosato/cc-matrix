import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const project = JSON.parse(
	fs.readFileSync(path.join(root, "project.json"), "utf8"),
);
const esc = (s) => s.replace(/<\/script/gi, "<\\/script");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const result = await build({
	entryPoints: [path.join(root, "src/main.js")],
	bundle: true,
	write: false,
	format: "iife",
	target: "es2022",
	legalComments: "inline",
	minify: false,
});
const html = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8">\n<script>${esc(read("vendor/session.js"))}</script>\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">\n<meta name="hub:session" content="1"><meta name="hub:session-players" content="1-4"><meta name="hub:session-mode" content="shared-world"><meta name="hub:session-goal" content="Defend the rail through eight fleets and defeat the three-phase temporal tyrant. All pilots share the outcome."><meta name="hub:session-howto" content="Slide with stick/D-pad or A/D. Hold Cross/R2 or Space to fire upward and intercept weapons. Square/L2 or Shift activates a charged shared time brake. Options opens local settings.">\n<title>${project.title}</title><style>${read("src/ui/styles.css")}\n#boss-hud{position:absolute;top:14%;left:50%;transform:translateX(-50%);width:32%;text-align:center;font-size:.6em;letter-spacing:.14em;color:#c6d9c7}#boss-bar{height:4px;background:#362c42;margin-top:.5em}#boss-fill{height:100%;background:#c0e7cf}</style></head>\n<body><canvas id="screen" aria-label="Attack of the Timelout game arena"></canvas><div id="hud" hidden><div class="top"><div><div class="eyebrow">TEAM SCORE</div><div id="score">000000</div></div><div id="encounter"><div id="wave"></div><div id="wave-name"></div></div></div><div id="boss-hud" hidden><div id="boss-label"></div><div id="boss-bar"><div id="boss-fill"></div></div></div><div id="subtitle" hidden></div><div id="notice" hidden><b id="notice-title"></b><small id="notice-text"></small></div><div id="brake-block"><div id="brake-label"></div><div id="meter"><div id="meter-fill"></div></div><div id="brake-hint"></div></div><div id="prompts"></div><div id="run-badge"></div><div id="brand-corner">TIME IS A SHARED RESOURCE</div><div id="demo-label" hidden>DEMONSTRATION · ANY INPUT TO RETURN</div><button id="touch-brake" hidden>TIME<br>BRAKE</button></div>\n<script>${esc(read("vendor/my-3d2dge.js"))}</script>\n<script>${esc(result.outputFiles[0].text)}</script>\n</body></html>`;
const output = path.resolve(root, "..", project.slug + ".html");
const temporary = path.join(root, "test-artifacts", "bundle.html.tmp");
fs.writeFileSync(temporary, html);
fs.renameSync(temporary, output);
fs.copyFileSync(
	path.join(root, "src/content/interview.json"),
	path.resolve(root, "..", "exit-interview.json"),
);
console.log(
	`Built ${path.basename(output)} (${Math.round(Buffer.byteLength(html) / 1024)} KiB)`,
);
