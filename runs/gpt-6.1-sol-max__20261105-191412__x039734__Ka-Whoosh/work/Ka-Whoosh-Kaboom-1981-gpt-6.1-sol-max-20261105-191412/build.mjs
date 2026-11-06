import fs from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";

const root = path.dirname(new URL(import.meta.url).pathname);
const result = await build({
	entryPoints: [path.join(root, "src/app.js")],
	bundle: true,
	write: false,
	format: "esm",
	target: "es2022",
	minify: process.env.KA_DEBUG !== "1",
	legalComments: "inline",
	logLevel: "silent",
});
let html = await fs.readFile(path.join(root, "src/template.html"), "utf8");
const client = await fs.readFile(
	path.join(root, "vendor/hub-session.js"),
	"utf8",
);
let css = await fs.readFile(path.join(root, "src/style.css"), "utf8");
for (const [tag, file] of [
	["DISPLAY", "display"],
	["BODY", "body"],
])
	css = css.replace(
		`__${tag}_FONT__`,
		"data:font/ttf;base64," +
			(await fs.readFile(path.join(root, `assets/${file}.ttf`))).toString(
				"base64",
			),
	);
html = html
	.replace("<!-- HUB_CLIENT -->", () => `<script>${client}</script>`)
	.replace("/* STYLES */", () => css)
	.replace("/* BUNDLE */", () =>
		result.outputFiles[0].text.replace(/<\/script/gi, "<\\/script"),
	);
const licenses = await Promise.all(
	["Lato-OFL.txt", "Three-MIT.txt", "Rapier-Apache-2.0.txt"].map((f) =>
		fs.readFile(path.join(root, "assets", f), "utf8"),
	),
);
html = html.replace(
	"</body>",
	() =>
		`<!--\nBundled dependency notices\n${licenses.join("\n\n")}\nRapier: Copyright Dimforge and contributors. Licensed under Apache License 2.0, https://www.apache.org/licenses/LICENSE-2.0\n--></body>`,
);
const filename = "Ka-Whoosh-Kaboom-1981-gpt-6.1-sol-max-20261105-191412.html";
await fs.writeFile(path.join(root, "..", filename), html);
await fs.copyFile(
	path.join(root, "metadata.json"),
	path.join(root, "..", "exit-interview.json"),
);
for (const name of ["harness.html", "bridge.js", "round.js"])
	await fs.copyFile(
		path.join(root, "vendor", `hub-${name}`),
		path.join(root, name),
	);
console.log(
	`Built ${filename} (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MiB, self-contained)`,
);
