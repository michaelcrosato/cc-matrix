import fs from "node:fs/promises";
import { build } from "esbuild";

const stem = "Jungle-Scurry-Jungle-Hunt-gpt-6.1-sol-ultra-20261105-215315";
const result = await build({
	entryPoints: ["main.js"],
	bundle: true,
	minify: true,
	format: "iife",
	target: "es2022",
	write: false,
	legalComments: "none",
	logLevel: "silent",
});
const js = result.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const shell = await fs.readFile("shell.html", "utf8");
const session = await fs.readFile("hub-session.js", "utf8");
const notices = await fs.readFile("THIRD-PARTY-NOTICES.txt", "utf8");
const credits = JSON.parse(await fs.readFile("../exit-interview.json", "utf8"));
const html = shell
	.replace("<!-- HUB_SESSION -->", `<script>${session}</script>`)
	.replace(
		"<!-- GAME_SCRIPT -->",
		`<script>globalThis.JUNGLE_CREDITS=${JSON.stringify(credits).replace(/</g, "\\u003c")};</script>\n<script>${js}</script>`,
	);
await fs.writeFile(
	`../${stem}.html`,
	html.replace(
		"</head>",
		`<script type="text/plain" id="third-party-notices">${notices}</script>\n</head>`,
	),
);
console.log(
	`Built ${stem}.html (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB, all dependencies embedded).`,
);
