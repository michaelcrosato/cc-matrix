import fs from "node:fs/promises";
import path from "node:path";

const folder = path.dirname(new URL(import.meta.url).pathname);
const result = await Bun.build({
	entrypoints: [path.join(folder, "main.js")],
	target: "browser",
	minify: true,
	define: { "process.env.NODE_ENV": '"production"' },
});
if (!result.success) {
	for (const log of result.logs) console.error(log);
	process.exit(1);
}
const bundle = await result.outputs[0].text();
const [template, css, session, credits] = await Promise.all(
	["index.html", "style.css", "hub-session.js", "credits.json"].map((n) =>
		fs.readFile(path.join(folder, n), "utf8"),
	),
);
const script = (s) => s.replace(/<\/script/gi, "<\\/script");
let html = template
	.replace("/*STYLES*/", () => css)
	.replace(
		'<meta charset="utf-8">',
		() => '<meta charset="utf-8"><script>' + script(session) + "</script>",
	);
html = html.replace(
	'<script type="module" src="./main.js"></script>',
	() =>
		"<script>window.GAME_CREDITS=" +
		script(credits) +
		'</script><script type="module">' +
		script(bundle) +
		"</script>",
);
const notices = await fs.readFile(path.join(folder, "LICENSES.txt"), "utf8");
html = html.replace(
	"</body>",
	() =>
		'<template id="license-notices"><pre>' +
		notices.replaceAll("&", "&amp;").replaceAll("<", "&lt;") +
		"</pre></template></body>",
);
const target = path.resolve(folder, "..", path.basename(folder) + ".html");
await fs.writeFile(target, html);
console.log(
	"Built " +
		path.basename(target) +
		" (" +
		Math.round(html.length / 1024) +
		" KiB)",
);
