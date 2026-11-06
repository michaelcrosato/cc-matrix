import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";

const dir = path.dirname(new URL(import.meta.url).pathname);
const name = path.basename(dir);
await build({
	entryPoints: [path.join(dir, "game.js")],
	bundle: true,
	format: "iife",
	target: "es2022",
	outfile: path.join(dir, "bundle.js"),
	minify: true,
	legalComments: "none",
	logLevel: "silent",
});
let html = await readFile(path.join(dir, "template.html"), "utf8");
const [hub, css, js, credits] = await Promise.all(
	["hub-session.js", "style.css", "bundle.js", "../exit-interview.json"].map(
		(f) => readFile(path.join(dir, f), "utf8"),
	),
);
const licenses = await readFile(
	path.join(dir, "THIRD-PARTY-LICENSES.txt"),
	"utf8",
);
const safe = (s) => s.replace(/<\/script/gi, "<\\/script");
html = html
	.replace("<!--HUB_CLIENT-->", () => `<script>${safe(hub)}</script>`)
	.replace("/*STYLE*/", () => css)
	.replace("/*CREDITS*/", () => `window.GAME_CREDITS=${safe(credits)};`)
	.replace("/*GAME*/", () => safe(js));
html = html.replace(
	"</body>",
	() =>
		`<script type="text/plain" id="thirdPartyLicenses">${safe(licenses)}</script>\n</body>`,
);
await writeFile(path.join(dir, "..", name + ".html"), html);
console.log(
	`Built ${name}.html (${(Buffer.byteLength(html) / 1048576).toFixed(2)} MB)`,
);
