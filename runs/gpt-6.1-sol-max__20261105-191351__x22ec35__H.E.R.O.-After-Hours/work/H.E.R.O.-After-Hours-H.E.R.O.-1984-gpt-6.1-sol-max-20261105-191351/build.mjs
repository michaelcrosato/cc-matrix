import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { build } from "esbuild";

const name =
	"H.E.R.O.-After-Hours-H.E.R.O.-1984-gpt-6.1-sol-max-20261105-191351.html";
const out = await build({
	entryPoints: ["main.js"],
	bundle: true,
	write: false,
	format: "iife",
	target: "es2022",
	minify: true,
	legalComments: "inline",
	logLevel: "silent",
});
const [html, css, session] = await Promise.all(
	["shell.html", "style.css", "research/session.js"].map((x) =>
		readFile(x, "utf8"),
	),
);
const licenses = await Promise.all(
	["research/THREE-LICENSE", "research/RAPIER-LICENSE"].map((x) =>
		readFile(x, "utf8"),
	),
);
const final = html
	.replace(
		'<meta name="viewport"',
		"<!-- Third-party notices\n" +
			licenses.join("\n\n") +
			'\n-->\n<meta name="viewport"',
	)
	.replace(
		"<!--SESSION-->",
		"<script>" + session.replace(/<\/script/gi, "<\\/script") + "</script>",
	)
	.replace("/*STYLE*/", css)
	.replace("/*GAME*/", () =>
		out.outputFiles[0].text.replace(/<\/script/gi, "<\\/script"),
	);
await writeFile("../" + name, final);
await mkdir("dist", { recursive: true });
await writeFile("dist/index.html", final);
for (const x of ["harness.html", "bridge.js", "round.js"])
	await copyFile("research/" + x, "dist/" + x);
await writeFile("dist/credits.json", await readFile("credits.json"));
console.log(
	"Built " + name + " (" + (final.length / 1024 / 1024).toFixed(2) + " MB)",
);
