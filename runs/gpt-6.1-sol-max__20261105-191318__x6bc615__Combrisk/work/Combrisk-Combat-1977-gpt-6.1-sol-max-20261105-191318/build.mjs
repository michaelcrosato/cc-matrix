import fs from "node:fs";
import { build } from "esbuild";

const { stem } = JSON.parse(fs.readFileSync("title-selection.json", "utf8"));
const metadata = fs.readFileSync("../exit-interview.json", "utf8");
JSON.parse(metadata);
const out = await build({
	entryPoints: ["src/main.js"],
	bundle: true,
	write: false,
	format: "iife",
	target: ["es2022"],
	minify: !process.env.COMBRISK_DEBUG,
	legalComments: "inline",
	define: { __CREDITS__: metadata },
	logLevel: "silent",
});
let html = fs.readFileSync("src/template.html", "utf8");
const escapeScript = (s) => s.replaceAll("</script", "<\\/script");
html = html
	.replace(
		"<!--HUB_CLIENT-->",
		"<script>" +
			escapeScript(fs.readFileSync("reference/session.js", "utf8")) +
			"</script>",
	)
	.replace("/*GAME_CSS*/", fs.readFileSync("src/style.css", "utf8"))
	.replace("/*GAME_JS*/", escapeScript(out.outputFiles[0].text));
const licenses = [
	"Three.js r180 — MIT",
	fs.readFileSync("reference/three-LICENSE.txt", "utf8"),
	"Rapier 0.19.3 — Apache-2.0",
	fs.readFileSync("reference/rapier-LICENSE.txt", "utf8"),
].join("\n\n");
html = html.replace(
	"</body>",
	`<script type="text/plain" id="third-party-notices">${escapeScript(licenses)}</script>\n</body>`,
);
fs.writeFileSync(`../${stem}.html`, html);
fs.writeFileSync(
	"artifacts/build-info.json",
	`${JSON.stringify(
		{
			file: `${stem}.html`,
			bytes: Buffer.byteLength(html),
			three: "0.180.0",
			rapier: "0.19.3",
			selfContained: true,
		},
		null,
		2,
	)}\n`,
);
console.log(
	`Built ${stem}.html (${(Buffer.byteLength(html) / 1048576).toFixed(2)} MiB)`,
);
