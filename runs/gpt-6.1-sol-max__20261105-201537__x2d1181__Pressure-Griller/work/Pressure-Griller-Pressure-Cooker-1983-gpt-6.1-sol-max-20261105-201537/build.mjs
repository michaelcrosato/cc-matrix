import { build } from "esbuild";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
const stem = path.basename(process.cwd());
const result = await build({
	entryPoints: ["main.js"],
	bundle: true,
	format: "iife",
	minify: true,
	legalComments: "none",
	target: "es2022",
	write: false,
});
const [shell, hub, credits, notices] = await Promise.all([
	readFile("shell.html", "utf8"),
	readFile("hub/session.js", "utf8"),
	readFile("metadata.json", "utf8"),
	readFile("THIRD-PARTY-LICENSES.txt", "utf8"),
]);
const html = shell
	.replace("<!-- HUB_CLIENT -->", `<script>\n${hub}\n</script>`)
	.replace("CREDITS_DATA", credits.replace(/</g, "\\u003c"))
	.replace("THIRD_PARTY_NOTICES", notices.replace(/<\/script/gi, "<\\/script"))
	.replace(
		"<!-- GAME_SCRIPT -->",
		`<script>\n${result.outputFiles[0].text.replace(/<\/script/gi, "<\\/script")}\n</script>`,
	);
await writeFile(`../${stem}.html`, html);
await writeFile(
	"../exit-interview.json",
	JSON.stringify(JSON.parse(credits), null, 2) + "\n",
);
console.log(
	`${stem}.html (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB, all dependencies embedded)`,
);
