import { readFile, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const dir = dirname(fileURLToPath(import.meta.url));
const report = JSON.parse(
	await readFile(resolve(dir, "../exit-interview.json"), "utf8"),
);
const exports = {
	SOURCE_INFO: report.sourceInformation,
	TESTING_FEEDBACK: report.testingFeedback,
	ENGINE_FEEDBACK: report.engineFeedback,
	PROMPT_FEEDBACK: report.promptFeedback,
};
await writeFile(
	resolve(dir, "src/credits.js"),
	Object.entries(exports)
		.map(([k, v]) => `export const ${k} = ${JSON.stringify(v)};`)
		.join("\n"),
);
const result = await build({
	entryPoints: [resolve(dir, "src/main.js")],
	bundle: true,
	format: "iife",
	target: "es2022",
	minify: true,
	write: false,
	legalComments: "inline",
	logLevel: "silent",
});
const code = result.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const session = await readFile(resolve(dir, "hub/session.js"), "utf8");
const notices = (
	await Promise.all([
		readFile(resolve(dir, "third-party/THREE-LICENSE.txt"), "utf8"),
		readFile(resolve(dir, "third-party/RAPIER-LICENSE.txt"), "utf8"),
	])
).join("\n\n");
const template = await readFile(resolve(dir, "template.html"), "utf8");
const html = template
	.replace("<!--HUB_CLIENT-->", () => `<script>\n${session}\n</script>`)
	.replace(
		"<!--GAME_SCRIPT-->",
		() =>
			`<!--\nThird-party library notices\n${notices}\n-->\n<script>\n${code}\n</script>`,
	);
await writeFile(resolve(dir, "app.bundle.js"), result.outputFiles[0].text);
await writeFile(resolve(dir, `../${basename(dir)}.html`), html);
console.log(
	`Built ${basename(dir)}.html (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB, fully self-contained)`,
);
