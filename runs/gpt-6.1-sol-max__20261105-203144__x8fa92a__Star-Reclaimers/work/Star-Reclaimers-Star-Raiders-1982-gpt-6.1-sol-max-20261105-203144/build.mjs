import fs from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";

const root = path.basename(process.cwd());
const output = await build({
	entryPoints: ["main.js"],
	bundle: true,
	write: false,
	format: "iife",
	target: "es2022",
	minify: true,
	legalComments: "inline",
	logLevel: "silent",
});
const template = await fs.readFile("shell.html", "utf8");
const hub = await fs.readFile("hub-session.js", "utf8");
const licenses = await fs.readFile("THIRD-PARTY-LICENSES.txt", "utf8");
const js = output.outputFiles[0].text.replaceAll("</script", "<\\/script");
const html = template
	.replace("{{HUB_CLIENT}}", () => hub)
	.replace("{{LICENSES}}", () => licenses)
	.replace("{{GAME_BUNDLE}}", () => js);
await fs.writeFile("../" + root + ".html", html);
await fs.copyFile("hub-bridge.js", "bridge.js");
await fs.copyFile("hub-round.js", "round.js");
console.log(
	"Built " + root + ".html (" + (html.length / 1048576).toFixed(2) + " MiB)",
);
