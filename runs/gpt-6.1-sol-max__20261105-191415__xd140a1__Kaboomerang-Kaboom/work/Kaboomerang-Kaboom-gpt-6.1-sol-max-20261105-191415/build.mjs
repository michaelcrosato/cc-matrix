import { readFile, writeFile } from "node:fs/promises";
import { build } from "esbuild";

const result = await build({
	entryPoints: ["main.mjs"],
	bundle: true,
	format: "iife",
	target: "es2022",
	minify: true,
	legalComments: "inline",
	write: false,
});
let html = await readFile("shell.html", "utf8");
const licensePaths = [
	"node_modules/three/LICENSE",
	"node_modules/peerjs/LICENSE",
	"node_modules/eventemitter3/LICENSE",
	"node_modules/peerjs-js-binarypack/LICENSE",
	"node_modules/webrtc-adapter/LICENSE.md",
	"node_modules/sdp/LICENSE",
	"node_modules/@msgpack/msgpack/LICENSE",
	"licenses/rapier-Apache-2.0.txt",
];
const notices = await Promise.all(
	licensePaths.map(async (path) => `${path}\n${await readFile(path, "utf8")}`),
);
html = html.replace(
	"</body>",
	`<script type="text/plain" id="library-licenses">${notices.join("\n\n").replaceAll("</script", "<\\/script")}</script></body>`,
);
html = html
	.replace("/* HUB_CLIENT */", await readFile("hub/session.js", "utf8"))
	.replace(
		"/* GAME_CODE */",
		result.outputFiles[0].text.replaceAll("</script", "<\\/script"),
	);
await writeFile(
	"../Kaboomerang-Kaboom-gpt-6.1-sol-max-20261105-191415.html",
	html,
);
console.log("Built Kaboomerang single-file HTML.");
