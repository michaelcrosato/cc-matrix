import { build } from "esbuild";
import { readFile, writeFile } from "node:fs/promises";
const project = JSON.parse(
	await readFile(new URL("project.json", import.meta.url), "utf8"),
);
const result = await build({
	entryPoints: [new URL("main.js", import.meta.url).pathname],
	bundle: true,
	format: "esm",
	minify: true,
	write: false,
	target: "es2022",
	legalComments: "none",
});
const fontRoot = new URL("node_modules/", import.meta.url);
let fonts = "";
for (const [family, pkg, weight, style] of [
	["Barlow", "barlow", 500, "normal"],
	["Barlow", "barlow", 600, "normal"],
	["Barlow", "barlow", 700, "normal"],
	["Barlow Condensed", "barlow-condensed", 800, "italic"],
	["Barlow Condensed", "barlow-condensed", 700, "normal"],
]) {
	const name = `@fontsource/${pkg}/files/${pkg}-latin-${weight}-${style}.woff2`,
		bytes = await readFile(new URL(name, fontRoot));
	fonts += `@font-face{font-family:'${family}';font-style:${style};font-weight:${weight};font-display:swap;src:url(data:font/woff2;base64,${bytes.toString("base64")}) format('woff2')}`;
}
const meta = JSON.parse(
	await readFile(new URL("../exit-interview.json", import.meta.url), "utf8"),
);
const licenses = {};
for (const [name, path] of [
	["Three.js r180", "node_modules/three/LICENSE"],
	["Rapier 0.19.3", "vendor/rapier-LICENSE"],
	["Barlow", "node_modules/@fontsource/barlow/LICENSE"],
	["Barlow Condensed", "node_modules/@fontsource/barlow-condensed/LICENSE"],
])
	licenses[name] = await readFile(new URL(path, import.meta.url), "utf8");
const hubClient = await readFile(
	new URL("vendor/session.js", import.meta.url),
	"utf8",
);
const html = (
	await readFile(new URL("index.template.html", import.meta.url), "utf8")
)
	.replace("/*HUB_CLIENT*/", () => hubClient)
	.replace("/*FONTS*/", () => fonts)
	.replace("/*METADATA*/", () =>
		JSON.stringify(meta).replaceAll("<", "\\u003c"),
	)
	.replace("/*LICENSES*/", () =>
		JSON.stringify(licenses).replaceAll("<", "\\u003c"),
	)
	.replace("/*GAME_BUNDLE*/", () =>
		result.outputFiles[0].text.replaceAll("</script", "<\\/script"),
	);
if (/\/\*(HUB_CLIENT|FONTS|METADATA|LICENSES|GAME_BUNDLE)\*\//.test(html))
	throw new Error("Unresolved HTML template slot");
await writeFile(new URL("../" + project.name + ".html", import.meta.url), html);
await writeFile(new URL("bundle.html", import.meta.url), html);
console.log(
	`Built ${project.name}.html (${(Buffer.byteLength(html) / 1048576).toFixed(2)} MB)`,
);
