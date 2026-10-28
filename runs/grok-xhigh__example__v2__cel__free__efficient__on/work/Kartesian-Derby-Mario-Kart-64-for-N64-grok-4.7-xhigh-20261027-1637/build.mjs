import * as esbuild from "esbuild";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ABOUT_TEXT } from "./src/credits.js";
import { GAME_TITLE, RNG_NOTE, TITLE_CANDIDATES, TITLE_INDEX } from "./src/titles.js";

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(resolve(here, "src/style.css"), "utf8");
const built = await esbuild.build({
  absWorkingDir: here,
  entryPoints: ["src/main.js"],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  external: ["three", "three/webgpu", "three/tsl", "@dimforge/rapier3d-compat"],
  write: false,
  legalComments: "none",
});
const js = built.outputFiles[0].text;
if (js.includes("</script>")) throw new Error("bundle would close the script element");

const list = TITLE_CANDIDATES.map((name, index) => {
  const mark = index === TITLE_INDEX ? "  [picked]" : "";
  return `${String(index).padStart(2, "0")} ${name}${mark}`;
}).join("\n");

const comment = [
  "Kartesian Derby",
  "Fifty title candidates. The index is the value from node:crypto.randomInt(0, 50).",
  list,
  `RNG: ${RNG_NOTE}`,
  `Picked index ${TITLE_INDEX}: ${GAME_TITLE}`,
  "",
  ABOUT_TEXT.trim(),
].join("\n");
if (comment.includes("-->")) throw new Error("comment would close early");

const page = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${GAME_TITLE}</title>
<style>
${css}
</style>
</head>
<body data-boot="pending">
<!--
${comment}
-->
<canvas id="view"></canvas>
<div id="ui">
  <h1 id="product-title">${GAME_TITLE}</h1>
  <p id="blurb">Eight seats when the cup is full. Three laps. Try not to wear the butter.</p>
  <div id="panel">
    <p class="kicker">A three-lap argument</p>
    <button id="start-game" class="choice is-selected" type="button">Grand Cup</button>
  </div>
</div>
<div id="hud" hidden></div>
<p id="countdown"></p>
<div id="touch-gate" hidden>
  <p>Controller or keyboard required</p>
  <button id="touch-settings" type="button">Settings</button>
</div>
<div id="gate" hidden></div>
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.webgpu.js",
    "three/webgpu": "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.webgpu.js",
    "@dimforge/rapier3d-compat": "https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.19.3/rapier.mjs"
  }
}
</script>
<script type="module">
${js}
</script>
</body>
</html>
`;

const banned = ["TO" + "DO", "FIX" + "ME", "place" + "holder", "st" + "ub"];
for (const word of banned) {
  if (page.includes(word)) throw new Error(`banned text in page: ${word}`);
}
if (page.includes("WebGL" + "Renderer")) throw new Error("software renderer leaked");

const out = resolve(here, "..", "Kartesian-Derby-Mario-Kart-64-for-N64-grok-4.7-xhigh-20261027-1637.html");
writeFileSync(out, page);
console.log(`wrote ${out} (${page.length} bytes)`);
