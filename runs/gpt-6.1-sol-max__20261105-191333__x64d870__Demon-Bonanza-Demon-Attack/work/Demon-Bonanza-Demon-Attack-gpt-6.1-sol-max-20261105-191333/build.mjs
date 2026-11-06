import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
const folder = path.dirname(fileURLToPath(import.meta.url)),
	slug = path.basename(folder);
let html = readFileSync(path.join(folder, "index.html"), "utf8");
const modules = [
	"core.js",
	"graphics.js",
	"audio.js",
	"network.js",
	"input.js",
	"credits.js",
	"main.js",
];
const source = modules
	.map((name) =>
		readFileSync(path.join(folder, name), "utf8")
			.replace(/^import\s+[^;]+?\s+from\s+['"]\.\/[^'"]+['"];?\s*$/gm, "")
			.replace(/\bexport (?=(?:class|function|const|let)\b)/g, ""),
	)
	.join("\n\n");
const validation = spawnSync(
	process.execPath,
	["--check", "--input-type=module"],
	{ input: source, encoding: "utf8" },
);
if (validation.status !== 0) throw new Error(validation.stderr);
if (/^import .+ from ["']\.\//m.test(source))
	throw new Error("Local module import escaped bundling");
html = html.replace(
	"<!-- HUB_CLIENT -->",
	() =>
		"<script>" +
		readFileSync(path.join(folder, "vendor/session.js"), "utf8").replace(
			/<\/script/gi,
			"<\\/script",
		) +
		"</script>",
);
html = html
	.replace("/* GAME_STYLE */", () =>
		readFileSync(path.join(folder, "style.css"), "utf8"),
	)
	.replace("// GAME_MODULE", () => source.replace(/<\/script/gi, "<\\/script"));
const output = path.join(folder, "..", slug + ".html");
writeFileSync(output, html);
console.log(output);
