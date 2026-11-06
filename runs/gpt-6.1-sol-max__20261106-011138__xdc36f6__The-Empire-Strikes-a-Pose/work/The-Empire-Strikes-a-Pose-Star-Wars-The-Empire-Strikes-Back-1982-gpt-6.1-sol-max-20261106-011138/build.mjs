import { build } from "esbuild";
import { readFile, writeFile } from "node:fs/promises";
const project = JSON.parse(await readFile("project.json", "utf8"));
const interview = JSON.parse(await readFile("../exit-interview.json", "utf8"));
const result = await build({
	entryPoints: ["src/game.js"],
	bundle: true,
	write: false,
	minify: true,
	format: "iife",
	target: "es2022",
	legalComments: "none",
});
const js = result.outputFiles[0].text.replaceAll("</script", "<\\/script");
const session = await readFile("session.js", "utf8");
const css = await readFile("src/style.css", "utf8");
const licenses = await readFile("THIRD-PARTY-LICENSES.txt", "utf8");
let template = await readFile("src/template.html", "utf8");
template = template
	.replace("/*HUB_CLIENT*/", () => session)
	.replace("/*GAME_STYLE*/", () => css)
	.replace("/*METADATA*/", () =>
		JSON.stringify(interview).replaceAll("<", "\\u003c"),
	)
	.replace("/*LICENSES*/", () =>
		JSON.stringify(licenses).replaceAll("<", "\\u003c"),
	)
	.replace("/*GAME_CODE*/", () => js);
await writeFile("../" + project.slug + ".html", template);
console.log(
	"Built " +
		project.slug +
		".html (" +
		(Buffer.byteLength(template) / 1048576).toFixed(2) +
		" MiB; all runtime dependencies embedded)",
);
