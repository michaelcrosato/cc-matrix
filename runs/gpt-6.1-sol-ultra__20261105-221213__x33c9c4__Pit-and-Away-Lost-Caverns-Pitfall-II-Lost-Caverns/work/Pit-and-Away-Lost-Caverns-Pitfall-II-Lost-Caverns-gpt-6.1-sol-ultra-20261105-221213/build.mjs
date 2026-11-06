import { build } from "esbuild";
import { readFile, writeFile } from "node:fs/promises";
const base =
	"Pit-and-Away-Lost-Caverns-Pitfall-II-Lost-Caverns-gpt-6.1-sol-ultra-20261105-221213";
const feedback = JSON.parse(await readFile("../exit-interview.json", "utf8"));
await writeFile(
	"credits.js",
	"export default " + JSON.stringify(feedback) + ";\n",
);
const result = await build({
	entryPoints: ["main.js"],
	bundle: true,
	write: false,
	format: "esm",
	target: "es2022",
	external: ["three", "three/webgpu", "three/tsl", "rapier"],
	minify: false,
	legalComments: "inline",
});
let html = await readFile("index.html", "utf8");
const session = await readFile("session.js", "utf8");
const metadata =
	'<meta name="hub:session" content="1"><meta name="hub:session-players" content="1-2"><meta name="hub:session-mode" content="shared-world"><meta name="hub:session-goal" content="Rescue Mina and Marmalade and recover the Sunstone together."><meta name="hub:session-howto" content="Stick/WASD: move, climb, swim. Cross/Space: jump or release balloon."><meta name="hub:session-minutes" content="8">';
html = html.replace(
	"<!-- HUB_SESSION -->",
	"<script>" +
		session.replaceAll("</script", "<\\/script") +
		"</script>" +
		metadata,
);
let js = result.outputFiles[0].text;
html = html.replace(
	"/* GAME_BUNDLE */",
	js.replaceAll("</script", "<\\/script"),
);
await writeFile("../" + base + ".html", html);
await writeFile("game.html", html);
console.log("Built single-file game.");
