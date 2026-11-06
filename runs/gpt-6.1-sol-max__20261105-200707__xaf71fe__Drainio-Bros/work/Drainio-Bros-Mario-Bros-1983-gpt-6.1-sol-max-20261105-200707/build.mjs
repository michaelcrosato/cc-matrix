import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
const dir = path.dirname(fileURLToPath(import.meta.url));
const filename =
	"Drainio-Bros-Mario-Bros-1983-gpt-6.1-sol-max-20261105-200707.html";
const read = (file) => readFile(path.join(dir, file), "utf8");
const files = ["core", "scene", "audio", "input", "network", "main"];
const interview = JSON.parse(await read("interview.json"));
let code = (await Promise.all(files.map((f) => read(`src/${f}.mjs`))))
	.map((s) =>
		s.replace(/^import[\s\S]*?;[ \t]*\n/gm, "").replace(/^export /gm, ""),
	)
	.join("\n\n");
code =
	`import * as THREE from 'three/webgpu';\nimport RAPIER from '@dimforge/rapier2d-compat';\n${code}`.replace(
		"__INTERVIEW_JSON__",
		JSON.stringify(interview),
	);
let fonts = "";
for (const [file, family, weight] of [
	["bungee.ttf", "Bungee", 400],
	["barlow-medium.ttf", "Barlow Condensed", 500],
	["barlow-bold.ttf", "Barlow Condensed", 800],
]) {
	const buffer = await readFile(path.join(dir, "assets", file));
	fonts += `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};font-display:swap;src:url(data:font/ttf;base64,${buffer.toString("base64")}) format('truetype')}\n`;
}
const client = await read("research/session.js");
const html = (await read("src/shell.html"))
	.replace("<!--AIHUB_CLIENT-->", `<script>\n${client}\n</script>`)
	.replace("/*FONTS*/", fonts)
	.replace("/*STYLES*/", await read("src/style.css"))
	.replace("/*GAME_CODE*/", code);
const fontLicenses = await Promise.all(
	["assets/Bungee-OFL.txt", "assets/Barlow-Condensed-OFL.txt"].map(read),
);
const finalHtml = html.replace(
	"</head>",
	`<!-- Embedded font licenses:\n${fontLicenses.join("\n")}\n-->\n</head>`,
);
await writeFile(path.join(dir, "..", filename), finalHtml);
await writeFile(
	path.join(dir, "..", "exit-interview.json"),
	`${JSON.stringify(interview, null, 2)}\n`,
);
console.log(
	`Built ${filename} (${Math.round(Buffer.byteLength(html) / 1024)} KiB)`,
);
