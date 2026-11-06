import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const dir = path.dirname(fileURLToPath(import.meta.url));
const result = await build({
	entryPoints: [path.join(dir, "main.js")],
	bundle: true,
	format: "esm",
	target: "es2022",
	minify: true,
	legalComments: "inline",
	write: false,
});
const [template, style, session] = await Promise.all(
	["index.template.html", "style.css", "hub-session.js"].map((f) =>
		readFile(path.join(dir, f), "utf8"),
	),
);
const html = template
	.replace("__HUB_SESSION__", () => session)
	.replace("__STYLE__", () => style)
	.replace("__BUNDLE__", () =>
		result.outputFiles[0].text.replace(/<\/script/gi, "<\\/script"),
	);
const output = path.join(dir, "..", path.basename(dir) + ".html");
await writeFile(output, html);
console.log(path.basename(output));
