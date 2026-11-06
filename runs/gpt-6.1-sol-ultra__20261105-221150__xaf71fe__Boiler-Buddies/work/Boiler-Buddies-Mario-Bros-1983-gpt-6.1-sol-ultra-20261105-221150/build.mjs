import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Script } from "node:vm";
import { build } from "esbuild";

const dir = dirname(fileURLToPath(import.meta.url));
const name = dir.split("/").at(-1);
const bundled = await build({
	entryPoints: [resolve(dir, "main.js")],
	bundle: true,
	write: false,
	minify: true,
	format: "iife",
	target: "es2022",
	legalComments: "none",
});
const [template, style, session, display, body, notices] = await Promise.all(
	[
		"template.html",
		"styles.css",
		"session.js",
		"display.ttf",
		"body.ttf",
		"THIRD-PARTY-NOTICES.txt",
	].map((f) => readFile(resolve(dir, f))),
);
const css = style
	.toString()
	.replace("DISPLAY_FONT", display.toString("base64"))
	.replace("BODY_FONT", body.toString("base64"));
const safe = (s) => s.replace(/<\/script/gi, "<\\/script");
const html = template
	.toString()
	.replace(
		"<!--HUB_CLIENT-->",
		() => `<script>${safe(session.toString())}</script>`,
	)
	.replace("/*STYLES*/", () => css)
	.replace("/*GAME*/", () => safe(bundled.outputFiles[0].text))
	.replace(
		"</body>",
		() => `<!--\n${notices.toString().replaceAll("--", "—")}\n-->\n</body>`,
	);
for (const script of html.matchAll(/<script>([\s\S]*?)<\/script>/g))
	new Script(script[1]);
await writeFile(resolve(dir, "..", name + ".html"), html);
console.log(
	`Built ${name}.html (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB)`,
);
