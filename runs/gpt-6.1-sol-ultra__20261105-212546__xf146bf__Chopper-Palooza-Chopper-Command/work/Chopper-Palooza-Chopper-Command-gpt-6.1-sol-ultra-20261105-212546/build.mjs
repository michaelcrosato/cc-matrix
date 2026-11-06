import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const folder = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const result = await build({
	absWorkingDir: folder,
	entryPoints: ["main.js"],
	bundle: true,
	write: false,
	format: "esm",
	platform: "browser",
	target: ["es2022"],
	minify: true,
	legalComments: "eof",
	metafile: true,
	define: { "process.env.NODE_ENV": '"production"' },
	plugins: [
		{
			name: "webgpu-native-three",
			setup(builder) {
				builder.onResolve({ filter: /^three$/ }, () => ({
					path: require.resolve("three/webgpu"),
				}));
				builder.onResolve({ filter: /^https?:\/\// }, (args) => ({
					path: args.path,
					external: true,
				}));
			},
		},
	],
});
const bundle = result.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const session = await readFile(
	resolve(folder, "hub-reference/session.js"),
	"utf8",
);
let html = await readFile(resolve(folder, "index.template.html"), "utf8");
if (!html.includes("<!-- HUB_SESSION -->"))
	throw new Error("Missing HUB_SESSION insertion marker");
if (!html.includes("/* GAME_BUNDLE */"))
	throw new Error("Missing GAME_BUNDLE insertion marker");
html = html.replace(
	"<!-- HUB_SESSION -->",
	() => `<script>${session}</script>`,
);
// Keep the protocol metadata canonical even while the editable template evolves.
html = html.replace(/<meta\s+name=["']hub:[^"']*["'][^>]*>/gi, "");
const metas = [
	["hub:session", "1"],
	["hub:session-players", "1-2"],
	["hub:session-mode", "shared-world"],
	[
		"hub:session-goal",
		"Escort the convoy, rescue pilots and stop the carrier.",
	],
	[
		"hub:session-howto",
		"Stick/WASD flies; R2/Space fires; Circle/Q flares; Cross/E rescues.",
	],
	["hub:session-minutes", "5"],
	["hub:webgpu", "required"],
]
	.map(([name, content]) => `<meta name="${name}" content="${content}">`)
	.join("\n");
html = html.replace("</head>", () => `${metas}\n</head>`);
html = html.replace("/* GAME_BUNDLE */", () => bundle);
const outfile = resolve(folder, "..", `${basename(folder)}.html`);
await writeFile(outfile, html);
await writeFile(resolve(folder, "index.html"), html);
await writeFile(
	resolve(folder, "bundle-meta.json"),
	JSON.stringify(
		{
			output: basename(outfile),
			bytes: Buffer.byteLength(html),
			imports: Object.values(result.metafile.outputs).flatMap(
				(output) => output.imports,
			),
			libraries: { three: "0.180.0", rapier: "0.19.3", session: "1.4.0" },
		},
		null,
		2,
	),
);
console.log(
	`Built ${basename(outfile)} (${(Buffer.byteLength(html) / 1048576).toFixed(2)} MiB)`,
);
