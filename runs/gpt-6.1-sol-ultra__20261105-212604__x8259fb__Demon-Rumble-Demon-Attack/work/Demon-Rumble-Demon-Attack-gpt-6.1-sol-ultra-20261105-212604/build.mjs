import { build } from "esbuild";
import { readFile, writeFile } from "node:fs/promises";
const sel = JSON.parse(await readFile("title-selection.json", "utf8"));
const result = await build({
	entryPoints: ["main.js"],
	bundle: true,
	write: false,
	format: "iife",
	target: ["es2022"],
	minify: true,
	legalComments: "inline",
});
const [shell, css, client, metadata] = await Promise.all(
	[
		"shell.html",
		"style.css",
		"hub-reference/session.js",
		"../exit-interview.json",
	].map((f) => readFile(f, "utf8")),
);
let html = shell
	.replace(
		"<!--SESSION-->",
		() => `<script>${client.replaceAll("</script", "<\\/script")}</script>`,
	)
	.replace("/*STYLE*/", () => css)
	.replace("/*METADATA*/", () => metadata.replaceAll("<", "\\u003c"))
	.replace("/*BUNDLE*/", () =>
		result.outputFiles[0].text.replaceAll("</script", "<\\/script"),
	);
await writeFile(`../${sel.basename}.html`, html);
console.log(
	`Built ${sel.basename}.html (${(Buffer.byteLength(html) / 1048576).toFixed(2)} MB)`,
);
