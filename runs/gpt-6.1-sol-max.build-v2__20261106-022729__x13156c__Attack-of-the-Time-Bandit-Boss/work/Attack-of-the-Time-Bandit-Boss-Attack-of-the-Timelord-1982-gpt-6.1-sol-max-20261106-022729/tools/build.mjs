import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const work = path.dirname(root),
  config = JSON.parse(
    fs.readFileSync(path.join(root, "build-config.json"), "utf8"),
  );
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
const escapeScript = (s) => s.replace(/<\/script/gi, "<\\/script");
const files = [
  "src/content/campaign.js",
  "src/game/simulation.js",
  "src/presentation/renderer.js",
  "src/audio/sound.js",
  "src/network/transports.js",
  "src/main.js",
];
const source = files
  .map(
    (f) =>
      "\n// " +
      f +
      "\n" +
      read(f)
        .replace(/^import[\s\S]*?;\r?\n/gm, "")
        .replace(/^export /gm, ""),
  )
  .join("\n");
const info = JSON.parse(
  fs.readFileSync(path.join(work, "exit-interview.json"), "utf8"),
);
const custom =
  '(()=>{\n"use strict";\nconst PEER_SOURCE=' +
  JSON.stringify(read("vendor/peerjs-1.5.5.min.js")) +
  ";\nconst BUILD_INFO=" +
  JSON.stringify(info) +
  ";\n" +
  source +
  "\n})();";
const html =
  '<!doctype html>\n<html lang="en"><head><meta charset="utf-8">\n<script>' +
  escapeScript(read("vendor/hub/session.js")) +
  "</script>\n" +
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<title>' +
  config.title +
  '</title>\n<meta name="theme-color" content="#080e1a">\n' +
  '<meta name="hub:session" content="1"><meta name="hub:session-players" content="1-4"><meta name="hub:session-mode" content="shared-world"><meta name="hub:session-minutes" content="12">\n' +
  '<meta name="hub:session-goal" content="Defend your century. Intercept four weapon families, clear eight fleets and defeat the three-phase Bandit Boss together.">\n<meta name="hub:session-howto" content="Stick or A/D moves. Cross/RT or Space fires. Square/LT or Shift spends a full time brake. Touch: drag, automatic fire.">\n' +
  '<meta name="description" content="' +
  config.title +
  ' — steal back your seconds in a complete 1–4 pilot temporal arcade campaign.">\n<style>' +
  read("src/style.css") +
  "</style></head>\n" +
  '<body><canvas id="screen" aria-label="Temporal defense arena"></canvas><div id="boot-label">BUILDING YOUR CENTURY…</div><div id="device-prompt" hidden></div><div id="touch-note" hidden></div><button id="touch-brake" hidden>TIME<br>BRAKE</button>\n' +
  "<script>" +
  escapeScript(read("vendor/engine/my-3d2dge.js")) +
  "</script>\n<script>" +
  escapeScript(custom) +
  "</script>\n</body></html>\n";
const out = path.join(work, config.base + ".html");
fs.writeFileSync(out, html);
fs.writeFileSync(
  path.join(root, "artifacts/build.json"),
  JSON.stringify(
    {
      title: config.title,
      artifact: path.basename(out),
      bytes: Buffer.byteLength(html),
      engine: config.engineCommit,
      hub: config.hubCommit,
      peerjs: "1.5.5",
    },
    null,
    2,
  ),
);
if (!process.argv.includes("--quiet"))
  console.log(
    "Built " + path.basename(out) + " (" + Buffer.byteLength(html) + " bytes)",
  );
