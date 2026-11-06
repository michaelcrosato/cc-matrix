import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
const here = path.dirname(fileURLToPath(import.meta.url));
const { slug } = JSON.parse(readFileSync(path.join(here, "selection.json"), "utf8"));
const read = (f) => readFileSync(path.join(here, f), "utf8");
const report = JSON.parse(read("src/report.json"));
writeFileSync(path.join(here, "../exit-interview.json"), JSON.stringify(report, null, 2) + "\n");
const interview = JSON.parse(readFileSync(path.join(here, "../exit-interview.json"), "utf8"));
for (const [key, length] of [
  ["testingFeedback", 4],
  ["engineFeedback", 6],
  ["promptFeedback", 4],
]) {
  if (interview[key]?.length !== length || interview[key].some((v) => typeof v !== "string" || !v.trim()))
    throw new Error("Invalid exit interview: " + key);
}
if (Object.values(interview.sourceInformation).some((v) => typeof v !== "string" || !v.trim()))
  throw new Error("Every Source Information field must be filled.");
const js =
  "const REPORT=" +
  JSON.stringify(report) +
  ";\n" +
  ["engine", "audio", "world", "input", "game", "ui", "main"].map((n) => read("src/" + n + ".js")).join("\n");
const html = read("src/shell.html")
  .replace("<!-- HUB_CLIENT -->", "<script>" + read("hub-session.js") + "</script>")
  .replace("/* GAME_STYLE */", read("src/style.css"))
  .replace("/* GAME_CODE */", js.replaceAll("</script", "<\\/script"));
writeFileSync(path.join(here, "../" + slug + ".html"), html);
writeFileSync(path.join(here, "game.html"), html);
writeFileSync(path.join(here, "artifacts/bundle-check.mjs"), js);
console.log("Built " + slug + ".html");
