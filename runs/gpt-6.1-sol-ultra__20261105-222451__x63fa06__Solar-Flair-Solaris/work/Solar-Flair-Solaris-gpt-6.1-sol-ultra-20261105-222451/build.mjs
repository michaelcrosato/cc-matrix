import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
const dev = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(resolve(dev, p), "utf8");
const { title, slug } = JSON.parse(read("identity.json"));
const credits = read("../exit-interview.json");
const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><script>${read("hub-session.js")}</script>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<meta name="theme-color" content="#091120"><meta name="description" content="Solar Flair — a cel-shaded frontier rescue shooter inspired by Solaris (1986).">
<meta name="hub:session" content="1"><meta name="hub:session-players" content="1-2"><meta name="hub:session-mode" content="shared-world"><meta name="hub:session-goal" content="Rescue 5 survivors, recover Red Echo and Rift Gate signals, then destroy the siege carrier at Solaris."><meta name="hub:session-howto" content="WASD / left stick fly; mouse / right stick aim; Space / R2 fire; Shift / L2 boost; Q / Square pulse; E / Triangle tractor; Esc / Options menu. Wingmate shares the mission."><meta name="hub:session-minutes" content="7">
<title>${title} · Frontier Rescue</title>
<style>${read("style.css")}</style>
<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.webgpu.js","three/webgpu":"https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.webgpu.js"}}</script>
</head><body>
<canvas id="world" aria-label="Solar Flair space flight"></canvas><div id="grain"></div><div id="vignette"></div>
<div id="app"><main id="screens"></main>
<div id="hud" class="hidden"><div class="hud-top"><div class="sector-heading"><div class="eyebrow">F-86 Sunskipper / flight lead</div><h3 id="hud-sector"></h3><div class="objective"><span id="hud-objective"></span> <span id="hud-count"></span></div><div class="obj-line"><div id="hud-progress"></div></div></div><div class="hud-top-right"><div class="score"><small>SQUADRON SCORE</small><span id="hud-score">000000</span></div><button id="pause-button" aria-label="Pause menu">Ⅱ</button></div></div>
<div id="hud-radio" class="hud-message"></div><div id="target-labels"></div><div class="hud-bottom"><div class="ship-status"><div class="row"><span>Shield</span><span id="num-shield"></span></div><div class="bar"><div id="bar-shield"></div></div><div class="row"><span>Hull</span><span id="num-hp"></span></div><div class="bar hull"><div id="bar-hp"></div></div><div class="row"><span>Fuel</span><span id="num-fuel"></span></div><div class="bar fuel"><div id="bar-fuel"></div></div><div class="row heat"><span>Cannon heat</span><span id="num-heat"></span></div><div class="bar heat"><div id="bar-heat"></div></div><div id="hud-pulse" class="pulse-count"></div></div><div id="hud-prompts" class="hud-prompts"></div><div class="radar-wrap"><div class="radar"><div id="radar-dots"></div></div><div class="radar-label">LOCAL SCANNER / 130m</div></div></div>
<button id="touch-pulse" class="touch-action" aria-label="Use shield pulse">PULSE</button><button id="touch-context" class="touch-action hidden" aria-label="Return to chart">RETURN</button>
</div><div id="reticle" class="reticle hidden"></div><div id="warp-ui" class="warp-title hidden"><div class="eyebrow">Jump solution acquired</div><h2 id="warp-name"></h2><div class="warp-bar"><div id="warp-progress"></div></div><div class="eyebrow">Hold on to something.</div></div>
<div id="toast" class="toast hidden"></div><div id="attract" class="hidden"><div class="label"><strong>Solar Flair</strong>Live flight demonstration · any input to return</div></div></div><div id="flash"></div>
<div id="load"><div><div class="eyebrow">Frontier rescue division</div><div class="load-title">Solar Flair</div><div class="loader"></div><div class="loading-text">CONNECTING TO THE LAST LIGHT</div></div></div>
<script type="module">
import * as THREE from 'three/webgpu';
import RAPIER from 'https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.19.3/rapier.mjs';
const CREDITS=${credits};
${["audio.js", "network.js", "core.js", "scene.js", "main.js"].map(read).join("\n")}
</script></body></html>`;
writeFileSync(resolve(dev, "../" + slug + ".html"), html);
console.log(
	"Built " + slug + ".html (" + Math.round(html.length / 1024) + " KB)",
);
