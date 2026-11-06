import { build } from "esbuild";
import { readFile, writeFile } from "node:fs/promises";
const result = await build({
	entryPoints: ["app.js"],
	bundle: true,
	format: "iife",
	target: "es2022",
	minify: true,
	write: false,
	legalComments: "inline",
});
const [shell, session, notices] = await Promise.all([
	readFile("shell.html", "utf8"),
	readFile("vendor/session.js", "utf8"),
	readFile("vendor/THIRD-PARTY-NOTICES.txt", "utf8"),
]);
const html = shell
	.replace(
		"<!--SESSION-->",
		"<script>" + session.replace(/<\/script/gi, "<\\/script") + "</script>",
	)
	.replace(
		"<!--APP-->",
		'<script type="text/plain" id="third-party-notices">' +
			notices.replace(/<\/script/gi, "<\\/script") +
			"</script><script>" +
			result.outputFiles[0].text.replace(/<\/script/gi, "<\\/script") +
			"</script>",
	);
const filename = "Pitfallin-Pitfall-gpt-6.1-sol-ultra-20261105-221223.html";
await writeFile("../" + filename, html);
await writeFile("index.html", html);
console.log(
	"Built " +
		filename +
		" (" +
		(html.length / 1024 / 1024).toFixed(2) +
		" MB, self-contained).",
);
