import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
const info = JSON.parse(
	await readFile(new URL("./build-info.json", import.meta.url), "utf8"),
);
execFileSync(
	"bun",
	[
		"build",
		"game.js",
		"--target",
		"browser",
		"--minify",
		"--outfile",
		"runtime.bundle.js",
	],
	{ stdio: "pipe", cwd: import.meta.dirname },
);
const [runtime, css, session] = await Promise.all(
	["runtime.bundle.js", "style.css", "hub-session.js"].map((f) =>
		readFile(new URL(f, import.meta.url), "utf8"),
	),
);
const notices = await readFile(
	new URL("./THIRD-PARTY-NOTICES.txt", import.meta.url),
	"utf8",
);
const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><script>${session}</script>
<script type="text/plain" id="third-party-notices">${notices}</script>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#092d33">
<meta name="hub:session" content="1"><meta name="hub:session-players" content="1-2"><meta name="hub:session-mode" content="shared-world"><meta name="hub:session-goal" content="Find three lost companions and return everyone to Daylight Camp. Gold is a bonus."><meta name="hub:session-howto" content="Stick / WASD move, climb and swim. Cross / Space jump. Square / E catch balloon. Triangle / M map. Options / Esc pause."><meta name="hub:session-minutes" content="8">
<title>${info.title}</title><style>${css}\ncanvas#game{position:fixed;inset:0;display:block;width:100%;height:100%;z-index:0}#game-ui{z-index:2}</style></head>
<body><script type="module">${runtime.replaceAll("</script", "<\\/script")}</script></body></html>`;
await writeFile(new URL("../" + info.stem + ".html", import.meta.url), html);

const interview = JSON.parse(
	await readFile(new URL("./metadata.json", import.meta.url), "utf8"),
);
await writeFile(
	new URL("../exit-interview.json", import.meta.url),
	JSON.stringify(interview, null, 2) + "\n",
);
