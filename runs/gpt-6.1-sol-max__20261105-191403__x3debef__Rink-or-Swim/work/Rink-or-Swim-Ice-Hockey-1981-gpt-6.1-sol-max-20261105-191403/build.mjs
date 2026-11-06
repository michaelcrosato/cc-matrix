import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const { stem } = JSON.parse(readFileSync("title-draw.json", "utf8"));
const result = spawnSync(
  "bun",
  [
    "build",
    "main.js",
    "--target=browser",
    "--external=three",
    "--external=three/*",
    "--external=@dimforge/rapier3d-compat",
    "--outfile=bundle.js",
  ],
  { encoding: "utf8" },
);
if (result.status !== 0) {
  process.stderr.write(result.stderr);
  process.exit(1);
}
const html = readFileSync("template.html", "utf8")
  .replace("/*__HUB__*/", () => readFileSync("session.js", "utf8"))
  .replace("/*__CSS__*/", () => readFileSync("style.css", "utf8"))
  .replace("/*__GAME__*/", () =>
    readFileSync("bundle.js", "utf8").replace(/<\/script/gi, "<\\/script"),
  );
writeFileSync(`../${stem}.html`, html);
writeFileSync("game.html", html);
writeFileSync("../exit-interview.json", readFileSync("exit-data.json", "utf8"));
console.log(`${stem}.html`);
