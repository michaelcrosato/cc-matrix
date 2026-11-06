import fs from "node:fs";
import { build } from "esbuild";

const project = JSON.parse(fs.readFileSync("project.json", "utf8"));
const result = await build({
	entryPoints: ["main.js"],
	bundle: true,
	write: false,
	format: "iife",
	target: "es2022",
	minify: true,
	legalComments: "none",
});
let html = fs.readFileSync("template.html", "utf8");
const session = fs.readFileSync("hub/session.js", "utf8");
html = html.replace(
	"<!--HUB_SESSION-->",
	"<script>\n" + session.replaceAll("</script", "<\\/script") + "\n</script>",
);
html = html.replace("/*GAME_BUNDLE*/", () =>
	result.outputFiles[0].text.replaceAll("</script", "<\\/script"),
);
html = html.replace(
	"</head>",
	"<!-- Bundled Three.js license\n" +
		fs.readFileSync("node_modules/three/LICENSE", "utf8") +
		"\nRapier 0.19.3: Apache-2.0, copyright Dimforge and contributors.\n--></head>",
);
fs.writeFileSync("../" + project.stem + ".html", html);
console.log(
	project.stem +
		".html · " +
		Math.round(Buffer.byteLength(html) / 1024) +
		" KB",
);
