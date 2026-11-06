import { readFile, writeFile } from "node:fs/promises";
import { build } from "esbuild";

const slug = "Kapop-Kaboom-gpt-6.1-sol-ultra-20261105-215624";
const result = await build({
	entryPoints: ["main.js"],
	bundle: true,
	write: false,
	format: "esm",
	target: "es2022",
	minify: true,
	legalComments: "none",
});
let template = await readFile("template.html", "utf8");
const session = await readFile("hub/session.js", "utf8");
template = template.replace(
	"<!--HUB_SESSION-->",
	`<script>${session.replace(/<\/script/gi, "<\\/script")}</script>`,
);
template = template.replace("/*GAME_BUNDLE*/", () =>
	result.outputFiles[0].text.replace(/<\/script/gi, "<\\/script"),
);
await writeFile(`../${slug}.html`, template);
await writeFile(
	"../exit-interview.json",
	await readFile("credits.json", "utf8"),
);
