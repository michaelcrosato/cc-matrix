import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dir, "..");
const output = await Bun.build({
	entrypoints: [path.join(root, "tests/audio-entry.js")],
	target: "browser",
	format: "iife",
	minify: true,
});
if (!output.success) throw Error(output.logs.join("\n"));
fs.writeFileSync(
	path.join(root, "tests/audio-bundle.js"),
	await output.outputs[0].text(),
);
