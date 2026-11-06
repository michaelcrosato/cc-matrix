import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

await import("./vendor/patch-three.mjs");
const selection = JSON.parse(readFileSync("selection.json", "utf8"));
mkdirSync("dist", { recursive: true });
execFileSync(
	"bun",
	[
		"build",
		"src/main.js",
		"--target=browser",
		"--minify",
		"--outfile=dist/game.js",
	],
	{ stdio: "pipe" },
);
let html = readFileSync("src/shell.html", "utf8");
html = html.replace(
	"<!-- HUB_CLIENT -->",
	() => "<script>" + readFileSync("vendor/session.js", "utf8") + "</script>",
);
html = html.replace("/* STYLES */", () =>
	readFileSync("src/style.css", "utf8"),
);
const licenses = [
	"node_modules/three/LICENSE",
	"vendor/RAPIER-LICENSE.txt",
	"node_modules/peerjs/LICENSE",
];
const licenseText = licenses
	.map((p) => {
		try {
			return readFileSync(p, "utf8");
		} catch {
			return p + " — license supplied by package metadata";
		}
	})
	.join("\n\n")
	.replaceAll("-->", "—>");
html = html.replace("/* GAME_CODE */", () =>
	readFileSync("dist/game.js", "utf8").replaceAll("</script", "<\\/script"),
);
html = html.replace(
	"</head>",
	() => "<!-- Bundled dependency licenses\n" + licenseText + "\n--></head>",
);
writeFileSync("../" + selection.stem + ".html", html);
writeFileSync("index.html", html);
writeFileSync(
	"../exit-interview.json",
	JSON.stringify(JSON.parse(readFileSync("feedback.json", "utf8")), null, 2) +
		"\n",
);
console.log(
	"Built " +
		selection.stem +
		".html (" +
		(Buffer.byteLength(html) / 1024 / 1024).toFixed(2) +
		" MiB; fully bundled)",
);
