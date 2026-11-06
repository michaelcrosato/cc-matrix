import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = path.dirname(fileURLToPath(import.meta.url));
const { slug } = JSON.parse(
	await readFile(path.join(root, "project.json"), "utf8"),
);
const result = await build({
	entryPoints: [path.join(root, "main.js")],
	bundle: true,
	format: "esm",
	minify: true,
	write: false,
	target: "es2022",
	external: ["three/webgpu", "three/tsl", "@dimforge/rapier3d-compat"],
});
const files = await Promise.all(
	["shell.html", "style.css", "hub-session.js"].map((file) =>
		readFile(path.join(root, file), "utf8"),
	),
);
const output = files[0]
	.replace("__STYLE__", files[1])
	.replace("__HUB_CLIENT__", () => files[2])
	.replace("__GAME_BUNDLE__", () =>
		result.outputFiles[0].text.replace(/<\/script/gi, "<\\/script"),
	);
await writeFile(path.join(root, "..", `${slug}.html`), output);
await writeFile(
	path.join(root, "..", "exit-interview.json"),
	await readFile(path.join(root, "feedback.json"), "utf8"),
);
JSON.parse(
	await readFile(path.join(root, "..", "exit-interview.json"), "utf8"),
);
console.log(
	`Built ${slug}.html (${Math.ceil(Buffer.byteLength(output) / 1024)} KiB)`,
);
