import { readFile, writeFile } from "node:fs/promises";
import { build } from "esbuild";

const { stem } = JSON.parse(
	await readFile(new URL("./project.json", import.meta.url), "utf8"),
);
const result = await build({
	entryPoints: [new URL("./main.mjs", import.meta.url).pathname],
	bundle: true,
	write: false,
	format: "iife",
	target: "es2022",
	minify: true,
	legalComments: "none",
	logLevel: "silent",
});
const hub = await readFile(
	new URL("./hub-session.js", import.meta.url),
	"utf8",
);
const code = result.outputFiles[0].text.replaceAll("</script", "<\\/script");
const notices = await readFile(
	new URL("./THIRD-PARTY-NOTICES.txt", import.meta.url),
	"utf8",
);
const html = (await readFile(new URL("./shell.html", import.meta.url), "utf8"))
	.replace("<!-- HUB_CLIENT -->", `<script>\n${hub}\n</script>`)
	.replace("<!-- GAME_BUNDLE -->", `<script>\n${code}\n</script>`)
	.replace("</head>", `<!--\n${notices}\n-->\n</head>`);
await writeFile(new URL(`../${stem}.html`, import.meta.url), html);
await writeFile(new URL("./index.html", import.meta.url), html);
const credits = JSON.parse(
	await readFile(new URL("./credits.json", import.meta.url), "utf8"),
);
await writeFile(
	new URL("../exit-interview.json", import.meta.url),
	`${JSON.stringify(credits, null, 2)}\n`,
);
console.log(
	`Built ${stem}.html (${(Buffer.byteLength(html) / 1048576).toFixed(2)} MB; dependencies embedded)`,
);
