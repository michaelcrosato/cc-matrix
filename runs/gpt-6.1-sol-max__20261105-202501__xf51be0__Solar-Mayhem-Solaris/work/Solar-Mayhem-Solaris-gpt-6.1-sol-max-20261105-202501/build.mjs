import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const dir = path.dirname(fileURLToPath(import.meta.url));
const slug = path.basename(dir),
	root = path.dirname(dir);
const result = await build({
	entryPoints: [path.join(dir, "src/main.js")],
	bundle: true,
	minify: true,
	format: "esm",
	target: "es2022",
	write: false,
	legalComments: "inline",
	logLevel: "silent",
});
const font = readFileSync(path.join(dir, "src/flight.ttf")).toString("base64");
const heading = readFileSync(path.join(dir, "src/heading.ttf")).toString(
	"base64",
);
let css = readFileSync(path.join(dir, "src/style.css"), "utf8").replace(
	"FONT_DATA",
	`data:font/ttf;base64,${font}`,
);
css += `@font-face{font-family:Launch;src:url(data:font/ttf;base64,${heading}) format('truetype');font-weight:800;font-display:swap}h1{font-family:Launch,Impact,sans-serif;font-weight:800;font-size:clamp(80px,10.5vw,200px);letter-spacing:-.025em}h1 em{letter-spacing:-.03em}#panel h2,#banner h2{font-family:Launch,Impact,sans-serif;letter-spacing:.01em}@media(max-width:720px){h1{font-size:23vw}}@media(max-height:650px){h1{font-size:18vh}}`;
const credits = JSON.parse(
	readFileSync(path.join(root, "exit-interview.json"), "utf8"),
);
let html = readFileSync(path.join(dir, "src/shell.html"), "utf8");
html = html
	.replace(
		"<!-- HUB_CLIENT -->",
		"<script>" +
			readFileSync(path.join(dir, "reference/session.js"), "utf8") +
			"</script>",
	)
	.replace("/* GAME_STYLE */", css)
	.replace(
		"/* GAME_CREDITS */",
		"window.GAME_CREDITS=" +
			JSON.stringify(credits).replace(/</g, "\\u003c") +
			";",
	)
	.replace(
		"/* GAME_CODE */",
		result.outputFiles[0].text.replace(/<\/script/gi, "<\\/script"),
	);
const licenses = [
	"node_modules/three/LICENSE",
	"reference/Rapier-LICENSE",
	"reference/SpaceGrotesk-OFL.txt",
	"reference/BarlowCondensed-OFL.txt",
]
	.map((f) => readFileSync(path.join(dir, f), "utf8"))
	.join("\n\n");
html = html.replace(
	"</head>",
	`<!-- Third-party licenses\n${licenses}\n--></head>`,
);
writeFileSync(path.join(root, `${slug}.html`), html);
console.log(
	"Built " +
		slug +
		".html (" +
		(Buffer.byteLength(html) / 1024 / 1024).toFixed(2) +
		" MB)",
);
