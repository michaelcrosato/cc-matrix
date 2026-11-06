import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
process.chdir(dir);
mkdirSync("dist", { recursive: true });
execFileSync(
	"bun",
	[
		"build",
		"src/main.js",
		"--outfile=dist/game.js",
		"--target=browser",
		"--minify",
	],
	{ stdio: "pipe" },
);
let html = readFileSync("template.html", "utf8");
html = html.replace(
	"<!-- HUB_CLIENT -->",
	() => "<script>" + readFileSync("research/session.js", "utf8") + "</script>",
);
const font = (family, file, weight, style) =>
	`@font-face{font-family:${family};src:url(data:font/ttf;base64,${readFileSync(file).toString("base64")}) format('truetype');font-weight:${weight};font-style:${style};font-display:swap}`;
html = html.replace(
	"/* FONT_DATA */",
	() =>
		font("Title", "assets/title.ttf", 900, "italic") +
		font("Barlow", "assets/ui.ttf", 600, "normal"),
);
html = html.replace("/* STYLES */", () =>
	readFileSync("src/style.css", "utf8"),
);
html = html.replace("/* GAME_CODE */", () =>
	readFileSync("dist/game.js", "utf8").replaceAll("</script", "<\\/script"),
);

const licenses = [
	"assets/THREE-LICENSE.txt",
	"assets/RAPIER-LICENSE.txt",
	"assets/FONT-LICENSE.txt",
]
	.map((file) => readFileSync(file, "utf8"))
	.join("\n\n");
html = html.replace(
	"</body>",
	() =>
		"<!-- THIRD-PARTY LICENSES\n" +
		licenses.replaceAll("-->", "-- >") +
		"\n-->\n</body>",
);

const slug = path.basename(dir),
	file = slug + ".html";
writeFileSync(path.join(dir, "..", file), html);
writeFileSync("dist/" + file, html);
const report = JSON.parse(readFileSync("report.json", "utf8"));
writeFileSync(
	path.join(dir, "..", "exit-interview.json"),
	JSON.stringify(report, null, 2) + "\n",
);
for (const name of ["harness.html", "bridge.js", "round.js"])
	copyFileSync("research/" + name, "dist/" + name);
console.log(
	`Built ${file} (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB)`,
);
