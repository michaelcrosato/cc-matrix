import { readFileSync, writeFileSync } from "node:fs";
import { build } from "esbuild";

const { title, dir } = JSON.parse(readFileSync("project.json", "utf8"));
await build({
	entryPoints: ["game.js"],
	bundle: true,
	format: "iife",
	target: "es2022",
	outfile: "bundle.js",
	minify: true,
	legalComments: "none",
});
const about = JSON.parse(readFileSync("../exit-interview.json", "utf8"));
let script = readFileSync("bundle.js", "utf8");
script +=
	"\n;(()=>{const timer=setInterval(()=>{if(window.__URN){window.__URN.setAbout(" +
	JSON.stringify(about) +
	");clearInterval(timer);}},100)})();";
let html =
	'<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><script>' +
	readFileSync("hub/session.js", "utf8").replaceAll("</script", "<\\/script") +
	'</script><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><meta name="hub:session" content="1"><meta name="hub:session-players" content="1-2"><meta name="hub:session-mode" content="shared-world"><meta name="hub:session-goal" content="Recover the three urn fragments and escape together."><meta name="hub:session-howto" content="Move: left stick / WASD. Interact: Cross / E. Relight or flash: Square / Space. Drop tool: Triangle / Q. Map: Touchpad / M. Pause: Options / Esc."><meta name="hub:session-minutes" content="8"><title>' +
	title +
	"</title><style>" +
	readFileSync("style.css", "utf8") +
	'</style></head><body><div id="loading" style="position:fixed;inset:0;display:grid;place-content:center;background:#101c25;color:#eedeb7;font:24px Georgia;z-index:9999;text-align:center"><h1>URN WELCOME</h1><p>Waking the house…</p></div><script>' +
	script.replaceAll("</script", "<\\/script") +
	"</script></body></html>";
html +=
	"\n<!--\n" +
	readFileSync("THIRD-PARTY-LICENSES.txt", "utf8").replaceAll("--", "—") +
	"\n-->";
writeFileSync("../" + dir + ".html", html);
writeFileSync("index.html", html);
console.log(
	"Built " + dir + ".html (" + (html.length / 1024 / 1024).toFixed(2) + " MB)",
);
