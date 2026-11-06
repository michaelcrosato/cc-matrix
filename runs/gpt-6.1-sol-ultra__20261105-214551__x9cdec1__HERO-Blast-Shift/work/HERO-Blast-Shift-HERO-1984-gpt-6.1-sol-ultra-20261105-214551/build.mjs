import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const filename =
	"HERO-Blast-Shift-HERO-1984-gpt-6.1-sol-ultra-20261105-214551.html";
execFileSync(
	"bun",
	[
		"build",
		"main.js",
		"--target=browser",
		"--minify",
		"--outfile=game.bundle.js",
	],
	{ stdio: "pipe" },
);
const source = readFileSync("index.html", "utf8");
const hub = readFileSync("hub-session.js", "utf8").replaceAll(
	"</script",
	"<\\/script",
);
const js = readFileSync("game.bundle.js", "utf8").replaceAll(
	"</script",
	"<\\/script",
);
const licenses = readFileSync("THIRD-PARTY-LICENSES.txt", "utf8");
const html = source
	.replace(
		"<!--THIRD_PARTY_LICENSES-->",
		() => `<!--\n${licenses.replaceAll("-->", "-- >")}\n-->`,
	)
	.replace("<!--HUB_CLIENT-->", () => `<script>${hub}</script>`)
	.replace("/*GAME_CODE*/", () => js);
writeFileSync("../" + filename, html);
writeFileSync("../exit-interview.json", readFileSync("metadata.json"));
console.log(
	`Built ${filename} (${(Buffer.byteLength(html) / 1048576).toFixed(2)} MB; dependencies embedded)`,
);
