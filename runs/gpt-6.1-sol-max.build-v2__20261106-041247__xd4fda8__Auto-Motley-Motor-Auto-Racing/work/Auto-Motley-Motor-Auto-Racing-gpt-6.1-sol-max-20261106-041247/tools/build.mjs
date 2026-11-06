import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = fileURLToPath(new URL("../", import.meta.url));
process.chdir(root);
const read = (p) => fs.readFileSync(p, "utf8");
const config = JSON.parse(read("build-config.json"));
const report = JSON.parse(read("../exit-interview.json"));
const ctx = {};
vm.createContext(ctx);
vm.runInContext(read("src/data.js"), ctx);
const errors = ctx.MM.validateData();
if (errors.length) throw Error(errors.join("\n"));
const escapeScript = (s) => s.replace(/<\/script/gi, "<\\/script");
const session = read("vendor/hub/session.js");
if (/<\/script/i.test(session))
	throw Error(
		"Official client contains closing tag; preserve and package carefully.",
	);
const files = [
	"src/data.js",
	"src/world.js",
	"src/sim.js",
	"src/storage.js",
	"src/art.js",
	"src/audio.js",
	"src/net.js",
	"src/ui.js",
	"src/main.js",
];
for (const f of files) new vm.Script(read(f), { filename: f });
const license = read("vendor/engine-repo/LICENSE");
const scripts = files
	.map(
		(f, i) =>
			"<script>\n" +
			escapeScript(read(f)) +
			(i === 0
				? "\nMM.REPORT=" +
					escapeScript(JSON.stringify(report)) +
					";\nMM.ENGINE_LICENSE=" +
					escapeScript(JSON.stringify(license)) +
					";"
				: "") +
			"\n</script>",
	)
	.join("\n");
const html =
	'<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<script>' +
	session +
	"</script>\n" +
	'<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">\n' +
	"<title>" +
	config.title +
	'</title>\n<meta name="description" content="Little cars. Lovely roads. Big mistakes. An original country racing game.">\n' +
	'<meta name="hub:session" content="1">\n<meta name="hub:session-players" content="1-2">\n<meta name="hub:session-mode" content="shared-world">\n' +
	'<meta name="hub:session-goal" content="First to 10 pursuit points. Opponent crash +2; twelve car lengths clear +1.">\n' +
	'<meta name="hub:session-howto" content="Left stick steer; L2 brake; hold Triangle recover; Options live menu. Keys: A/D, S/Space, hold R, Esc. Automatic acceleration.">\n' +
	'<meta name="hub:session-minutes" content="3">\n<style id="motor-css">' +
	read("src/style.css") +
	'</style>\n</head>\n<body>\n<canvas id="screen" tabindex="-1" aria-label="Auto Motley Motor countryside driving game"></canvas>\n' +
	"<!-- Engine license retained below. Original game code and art created for this build. -->\n<script>\n" +
	escapeScript(read("vendor/engine/my-3d2dge.js")) +
	"\n</script>\n" +
	scripts +
	"\n<!--\n" +
	license +
	"\n-->\n</body>\n</html>\n";
fs.writeFileSync("../" + config.stem + ".html", html);
fs.writeFileSync("index.html", html);
fs.mkdirSync("docs/evidence", { recursive: true });
fs.writeFileSync(
	"docs/evidence/build.json",
	JSON.stringify(
		{
			title: config.title,
			bytes: Buffer.byteLength(html),
			engine: "0.89.1",
			hub: "1.4.0",
			modules: files,
		},
		null,
		2,
	),
);
console.log(
	"Built " +
		config.stem +
		".html (" +
		Math.round(Buffer.byteLength(html) / 1024) +
		" KiB).",
);
