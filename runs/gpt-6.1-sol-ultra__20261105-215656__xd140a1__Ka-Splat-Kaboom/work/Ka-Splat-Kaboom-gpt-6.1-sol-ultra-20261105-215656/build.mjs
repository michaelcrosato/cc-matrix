import { readFileSync, writeFileSync } from "node:fs";

const name = "Ka-Splat-Kaboom-gpt-6.1-sol-ultra-20261105-215656";
const result = await Bun.build({
	entrypoints: ["./main.js"],
	target: "browser",
	minify: true,
	legalComments: "inline",
});
if (!result.success) throw new Error(result.logs.join("\n"));
let bundle = await result.outputs[0].text();
bundle = bundle.replace(/<\/script/gi, "<\\/script");
const hub = readFileSync("hub/session.js", "utf8");
const licenses =
	"<!--\nTHREE.JS\n" +
	readFileSync("three-LICENSE.txt", "utf8") +
	"\nRAPIER\n" +
	readFileSync("rapier-LICENSE.txt", "utf8") +
	"\n-->\n";
const html = readFileSync("template.html", "utf8")
	.replace("<!--HUB_SESSION-->", `<script>${hub}</script>`)
	.replace("/*GAME_BUNDLE*/", () => bundle)
	.replace("</head>", `${licenses}</head>`);
writeFileSync(`../${name}.html`, html);
console.log(
	`Built ${name}.html (${(html.length / 1024 / 1024).toFixed(2)} MB)`,
);
