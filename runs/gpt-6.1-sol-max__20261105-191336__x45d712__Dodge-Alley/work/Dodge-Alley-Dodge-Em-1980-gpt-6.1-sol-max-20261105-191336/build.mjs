import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { basename, resolve } from "node:path";
mkdirSync(".build", { recursive: true });
const result = spawnSync(
	"bun",
	[
		"build",
		"./main.js",
		"--target",
		"browser",
		"--format",
		"esm",
		"--minify",
		"--outfile",
		".build/game.js",
	],
	{ encoding: "utf8" },
);
if (result.status !== 0) {
	process.stderr.write(result.stderr || result.stdout);
	process.exit(1);
}
const source = readFileSync("shell.html", "utf8"),
	session = readFileSync("hub/session.js", "utf8"),
	game = readFileSync(".build/game.js", "utf8").replace(
		/<\/script/gi,
		"<\\/script",
	),
	credits = JSON.parse(readFileSync("credits.json", "utf8"));
const html = source
	.replace("<!--SESSION-->", () => "<script>" + session + "</script>")
	.replace("<!--CREDITS-->", () =>
		JSON.stringify(credits).replace(/</g, "\\u003c"),
	)
	.replace("<!--GAME-->", () => game);
writeFileSync("index.html", html);
const filename = basename(resolve(".")) + ".html";
writeFileSync(resolve("..", filename), html);
writeFileSync(
	resolve("..", "exit-interview.json"),
	JSON.stringify(credits, null, 2) + "\n",
);
if (!process.argv.includes("--quiet"))
	console.log(
		"Built " +
			filename +
			" (" +
			(Buffer.byteLength(html) / 1024 / 1024).toFixed(2) +
			" MiB)",
	);
