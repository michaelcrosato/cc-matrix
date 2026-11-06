import { build } from "esbuild";
import { readFile, writeFile } from "node:fs/promises";
const name = "Grit-Bros-Mario-Bros-1983-gpt-6.1-sol-ultra-20261105-220753";
const result = await build({
	entryPoints: ["main.js"],
	bundle: true,
	format: "esm",
	target: "es2022",
	write: false,
	minify: true,
	legalComments: "none",
	logLevel: "silent",
});
const [template, css, hub, metadata] = await Promise.all(
	["index.html", "style.css", "hub/session.js", "metadata.json"].map((p) =>
		readFile(p, "utf8"),
	),
);
const js = result.outputFiles[0].text.replaceAll("</script", "<\\/script");
const licenses =
	"\n<!-- Third-party notices\nThree.js R180\n" +
	(await readFile("LICENSE-THREE.txt", "utf8")) +
	"\nRapier 0.19.3, Dimforge contributors\n" +
	(await readFile("LICENSE-RAPIER.txt", "utf8")) +
	"\n-->\n";
const html = template
	.replace(
		"<!--HUB_CLIENT-->",
		"<script>" + hub.replaceAll("</script", "<\\/script") + "</script>",
	)
	.replace("/*STYLES*/", css)
	.replace("/*BUNDLE*/", js)
	.replace("</body>", licenses + "</body>");
await writeFile("../" + name + ".html", html);
await writeFile(
	"../exit-interview.json",
	JSON.stringify(JSON.parse(metadata), null, 2) + "\n",
);
console.log(
	`Built ${name}.html (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB)`,
);
