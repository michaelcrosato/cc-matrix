import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const dir = dirname(fileURLToPath(import.meta.url));
const result = await build({
	entryPoints: [join(dir, "main.js")],
	bundle: true,
	format: "esm",
	target: "es2022",
	write: false,
	minify: true,
	legalComments: "inline",
});
const escapeScript = (s) => s.replace(/<\/script/gi, "<\\/script");
let html = await readFile(join(dir, "template.html"), "utf8");
html = html
	.replace(
		"<!-- HUB_CLIENT -->",
		`<script>${escapeScript(await readFile(join(dir, "session.js"), "utf8"))}</script>`,
	)
	.replace("/* GAME_CODE */", () => escapeScript(result.outputFiles[0].text));
const name =
	"Press-for-Burgers-Pressure-Cooker-1983-gpt-6.1-sol-max-20261105-201822.html";
await writeFile(join(dir, "..", name), html);
await writeFile(join(dir, "game.html"), html);
console.log(
	`Built ${name} (${(Buffer.byteLength(html) / 1048576).toFixed(2)} MiB; all libraries embedded)`,
);
