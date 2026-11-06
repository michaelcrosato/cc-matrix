import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const base = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const root = resolve(base, "..");
const identity = JSON.parse(readFileSync(resolve(base, "identity.json"), "utf8"));
const read = (p) => readFileSync(resolve(base, p), "utf8");
const safe = (s) => s.replace(/<\/script/gi, "<\\/script");
const hub = read("vendor/hub-repo/lib/hub/session.js");
const report = JSON.parse(readFileSync(resolve(root, "exit-interview.json"), "utf8"));
const files = [
  "vendor/engine-repo/dist/handoff/my-3d2dge.js",
  "src/config.js",
  "src/content.js",
  "src/sim.js",
  "src/bot.js",
  "src/presentation.js",
  "src/audio.js",
  "src/input.js",
  "src/ui.js",
  "src/net.js",
  "src/main.js",
];
const html =
  '<!doctype html>\n<html lang="en"><head><meta charset="utf-8">\n<script>' +
  hub +
  "</script>\n" +
  '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">\n' +
  '<meta name="hub:session" content="1"><meta name="hub:session-players" content="1-2"><meta name="hub:session-mode" content="shared-world">\n' +
  '<meta name="hub:session-goal" content="Share one rescue ship. Free the crystals, break the prison carrier, and bring everyone home.">' +
  '<meta name="hub:session-howto" content="Pilot: left stick or WASD steers. Navigator: right stick or mouse aims, left stick + L2 or Shift commits hyperspace. Either R2 / square or click / Space fires.">' +
  '<meta name="hub:session-minutes" content="15"><title>' +
  identity.title +
  "</title>\n" +
  "<style>" +
  read("src/style.css") +
  '</style></head><body><canvas id="screen" aria-label="Freedom Warp Rescue flight view"></canvas>\n' +
  "<script>globalThis.FWR={REPORT:" +
  safe(JSON.stringify(report)) +
  "};</script>\n" +
  files.map((p) => "<script>\n" + safe(read(p)) + "\n</script>").join("\n") +
  "\n</body></html>\n";
writeFileSync(resolve(root, identity.stem + ".html"), html);
writeFileSync(resolve(base, "index.html"), html);
if (process.argv.includes("--verbose"))
  console.log("Built " + identity.stem + ".html (" + Buffer.byteLength(html) + " bytes)");
