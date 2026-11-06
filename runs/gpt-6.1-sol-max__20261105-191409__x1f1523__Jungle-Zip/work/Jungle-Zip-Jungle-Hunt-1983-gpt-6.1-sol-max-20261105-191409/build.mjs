import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const dir = path.dirname(fileURLToPath(import.meta.url));
const slug = path.basename(dir);
const result = await build({
	entryPoints: [path.join(dir, "main.js")],
	bundle: true,
	write: false,
	format: "esm",
	target: "es2022",
	minify: true,
	legalComments: "inline",
});
let shell = fs.readFileSync(path.join(dir, "shell.html"), "utf8");
shell = shell.replace(
	"<!--THIRD_PARTY_LICENSES-->",
	`<!--\n${fs.readFileSync(path.join(dir, "third-party-licenses.txt"), "utf8")}\n-->`,
);
const hub = fs.readFileSync(path.join(dir, "hub-session.js"), "utf8");
const credits = JSON.parse(
	fs.readFileSync(path.join(dir, "credits.json"), "utf8"),
);
shell = shell.replace(
	"<!--HUB_CLIENT-->",
	`<script>\n${hub.replaceAll("</script", "<\\/script")}\n</script>`,
);
shell = shell.replace(
	"/*CREDITS*/null",
	JSON.stringify(credits).replaceAll("<", "\\u003c"),
);
shell = shell.replace(
	"/*GAME_CODE*/",
	result.outputFiles[0].text.replaceAll("</script", "<\\/script"),
);
fs.writeFileSync(path.join(dir, "..", `${slug}.html`), shell);
fs.copyFileSync(
	path.join(dir, "credits.json"),
	path.join(dir, "..", "exit-interview.json"),
);
console.log(`Built ${slug}.html`);
