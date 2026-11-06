import { copyFile, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = path.dirname(fileURLToPath(import.meta.url));
const { base } = JSON.parse(
	await readFile(path.join(root, "selection.json"), "utf8"),
);
const bundle = await build({
	entryPoints: [path.join(root, "src/main.js")],
	bundle: true,
	minify: true,
	write: false,
	format: "iife",
	platform: "browser",
	target: ["chrome120", "safari17"],
	legalComments: "inline",
	logLevel: "silent",
});
const hub = await readFile(path.join(root, "vendor/hub/session.js"), "utf8");
const css = await readFile(path.join(root, "src/style.css"), "utf8");
let html = await readFile(path.join(root, "src/shell.html"), "utf8");
html = html.replace(
	"<!--HUB_CLIENT-->",
	() => "<script>" + hub.replace(/<\/script/gi, "<\\/script") + "</script>",
);
html = html.replace("/*STYLES*/", () => css);
html = html.replace("/*GAME_BUNDLE*/", () =>
	bundle.outputFiles[0].text.replace(/<\/script/gi, "<\\/script"),
);
await writeFile(path.join(root, "index.html"), html);
await writeFile(path.join(root, "..", base + ".html"), html);
await copyFile(
	path.join(root, "feedback.json"),
	path.join(root, "..", "exit-interview.json"),
);
if (!process.argv.includes("--quiet"))
	process.stdout.write(
		"Built " +
			base +
			".html (" +
			(html.length / 1024 / 1024).toFixed(2) +
			" MiB, self-contained)\n",
	);
