import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const meta = JSON.parse(
	fs.readFileSync(path.join(root, "../exit-interview.json"), "utf8"),
);
const imports = new Set();
let modules = ["audio.js", "network.js", "view.js", "game.js", "app.js"]
	.map((name) =>
		fs
			.readFileSync(path.join(root, name), "utf8")
			.replace(/^import .+;$/gm, (line) => {
				imports.add(line);
				return "";
			})
			.replace(/^export /gm, ""),
	)
	.join("\n");
modules =
	[...imports].join("\n") +
	"\nconst CREDITS=" +
	JSON.stringify(meta).replaceAll("<", "\\u003c") +
	";\n" +
	modules;
const session = fs.readFileSync(path.join(root, "session.js"), "utf8");
const html = fs
	.readFileSync(path.join(root, "template.html"), "utf8")
	.replace("<!-- HUB_CLIENT -->", "<script>\n" + session + "\n</script>")
	.replace("// GAME_MODULES", () => modules);
fs.writeFileSync(path.join(root, "game.html"), html);
fs.writeFileSync(path.join(root, "../" + path.basename(root) + ".html"), html);
console.log(
	"Built Solaris Detour: " +
		Math.round(Buffer.byteLength(html) / 1024) +
		" KB, single HTML.",
);
