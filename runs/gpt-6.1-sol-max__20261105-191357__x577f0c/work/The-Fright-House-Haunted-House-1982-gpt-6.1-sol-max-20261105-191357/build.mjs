import { readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

const here = import.meta.dir;
const out = await Bun.build({
	entrypoints: [resolve(here, "main.js")],
	target: "browser",
	format: "esm",
	minify: true,
	write: false,
	define: { "process.env.NODE_ENV": '"production"' },
});
if (!out.success) {
	for (const log of out.logs) console.error(log);
	process.exit(1);
}
const js = await out.outputs[0].text();
const template = await readFile(resolve(here, "template.html"), "utf8");
const session = await readFile(resolve(here, "hub/session.js"), "utf8");
const metadata = JSON.parse(
	await readFile(resolve(here, "credits.json"), "utf8"),
);
const notices = await readFile(
	resolve(here, "THIRD-PARTY-NOTICES.txt"),
	"utf8",
);
const html = template
	.replace("%%SESSION%%", () => session.replace(/<\/script/gi, "<\\/script"))
	.replace("%%METADATA%%", () =>
		JSON.stringify(metadata).replace(/</g, "\\u003c"),
	)
	.replace("%%NOTICES%%", () => notices.replace(/<\/script/gi, "<\\/script"))
	.replace("%%BUNDLE%%", () => js.replace(/<\/script/gi, "<\\/script"));
const file = `${basename(here)}.html`;
await writeFile(resolve(here, `../${file}`), html);
await writeFile(resolve(here, "game.html"), html);
await writeFile(
	resolve(here, "../exit-interview.json"),
	`${JSON.stringify(metadata, null, 2)}\n`,
);
console.log(
	`${file} · ${(Buffer.byteLength(html) / 1048576).toFixed(2)} MB · self-contained`,
);
