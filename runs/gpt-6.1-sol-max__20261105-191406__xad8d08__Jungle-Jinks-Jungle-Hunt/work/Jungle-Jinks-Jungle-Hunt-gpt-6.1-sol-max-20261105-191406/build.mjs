import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { aiHub, engineFeedback, promptFeedback, sourceInformation, testingFeedback } from "./src/metadata.js";

const root = path.dirname(fileURLToPath(import.meta.url));
const name = path.basename(root);
const result = await build({
  entryPoints: [path.join(root, "src/game.js")],
  bundle: true,
  format: "iife",
  target: "es2022",
  minify: true,
  write: false,
  legalComments: "inline",
});
const script = result.outputFiles[0].text.replaceAll("</script", "<\\/script");
const html = readFileSync(path.join(root, "src/index.html"), "utf8")
  .replace("__HUB_CLIENT__", () => readFileSync(path.join(root, "vendor/session.js"), "utf8"))
  .replace("__GAME_CODE__", () => script);
writeFileSync(path.join(root, "game.html"), html);
writeFileSync(path.join(root, "..", `${name}.html`), html);
writeFileSync(
  path.join(root, "..", "exit-interview.json"),
  JSON.stringify({ sourceInformation, testingFeedback, engineFeedback, promptFeedback, aiHub }, null, 2) +
    "\n",
);
console.log(`Built ${name}.html (${(Buffer.byteLength(html) / 1048576).toFixed(2)} MB; self-contained)`);
