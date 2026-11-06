import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
const dir = path.dirname(fileURLToPath(import.meta.url));
const bundle = spawnSync(
	"bun",
	[
		"build",
		path.join(dir, "main.js"),
		"--target",
		"browser",
		"--minify",
		"--outfile",
		path.join(dir, "bundle.js"),
	],
	{ cwd: dir, encoding: "utf8" },
);
if (bundle.status !== 0) {
	process.stderr.write(bundle.stderr);
	process.exit(1);
}
const [template, client, code, feedback] = await Promise.all(
	["template.html", "session.js", "bundle.js", "feedback.json"].map((f) =>
		readFile(path.join(dir, f), "utf8"),
	),
);
JSON.parse(feedback);
const notices = (
	await Promise.all(
		["three-mit.txt", "peerjs-mit.txt", "rapier-apache2.txt"].map(
			async (f) =>
				f + "\n" + (await readFile(path.join(dir, "licenses", f), "utf8")),
		),
	)
).join("\n\n");
const html = template
	.replace(
		"<!--LEGAL_NOTICES-->",
		() => "<!-- Third-party license notices\n" + notices + "\n-->",
	)
	.replace("<!--HUB_CLIENT-->", () => "<script>" + client + "</script>")
	.replace("__FEEDBACK_JSON__", feedback.replaceAll("<", "\\u003c"))
	.replace("/* GAME_BUNDLE */", () =>
		code.replaceAll("</script", "<\\/script"),
	);
const name = path.basename(dir) + ".html";
await writeFile(path.join(dir, "index.html"), html);
await writeFile(path.join(dir, "..", name), html);
await writeFile(path.join(dir, "..", "exit-interview.json"), feedback);
