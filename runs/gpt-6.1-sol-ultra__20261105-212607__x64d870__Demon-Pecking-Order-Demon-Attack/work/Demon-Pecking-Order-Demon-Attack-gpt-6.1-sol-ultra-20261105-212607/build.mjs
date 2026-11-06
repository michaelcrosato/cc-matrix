import { readFile, writeFile } from "node:fs/promises";
import { build } from "esbuild";
const slug =
	"Demon-Pecking-Order-Demon-Attack-gpt-6.1-sol-ultra-20261105-212607";
const files = await Promise.all(
	[
		"audio.js",
		"visuals.js",
		"hub.js",
		"main.js",
		"shell.html",
		"session.js",
		"credits.json",
	].map((p) => readFile(new URL(p, import.meta.url), "utf8")),
);
const [audio, visuals, hub, main, shell, session, credits] = files;
const notices = await Promise.all(
	["node_modules/three/LICENSE", "RAPIER-LICENSE.txt"].map((p) =>
		readFile(new URL(p, import.meta.url), "utf8"),
	),
);
const entry = `import * as THREE from 'three/webgpu';\nimport RAPIER from '@dimforge/rapier3d-compat';\nwindow.GAME_INFO=${JSON.stringify(JSON.parse(credits))};\n${audio}\n${visuals}\n${hub}\n${main}`;
await writeFile(new URL("entry.js", import.meta.url), entry);
const result = await build({
	stdin: {
		contents: entry,
		resolveDir: new URL(".", import.meta.url).pathname,
		sourcefile: "entry.js",
		loader: "js",
	},
	bundle: true,
	format: "iife",
	target: "es2022",
	minify: true,
	write: false,
	legalComments: "inline",
});
const html = shell
	.replace(
		"<!--HUB_CLIENT-->",
		"<script>" +
			session.replace(/<\/script/gi, "<\\/script") +
			"</script>\n<!-- Bundled library notices\n" +
			notices.join("\n\n").replace(/-->/g, "-- >") +
			"\n-->",
	)
	.replace("/*GAME_CODE*/", () =>
		result.outputFiles[0].text.replace(/<\/script/gi, "<\\/script"),
	);
await writeFile(new URL("../" + slug + ".html", import.meta.url), html);
console.log(
	`Built ${slug}.html (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB)`,
);
