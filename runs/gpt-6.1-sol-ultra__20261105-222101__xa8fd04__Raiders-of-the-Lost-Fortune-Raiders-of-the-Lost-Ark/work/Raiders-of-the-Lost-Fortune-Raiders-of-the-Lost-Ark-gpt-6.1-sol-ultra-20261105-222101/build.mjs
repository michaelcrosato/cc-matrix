import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const dir = path.dirname(fileURLToPath(import.meta.url));
const stem = path.basename(dir);
const read = (n) => fs.readFileSync(path.join(dir, n), "utf8");
let html = read("index.template.html");
let main = read("main.js").replace(
	/^import \{[^}]+\} from ["']\.\/(?:scene|audio|online)\.js["'];\s*/gm,
	"",
);
let feedback = {};
try {
	feedback = JSON.parse(
		fs.readFileSync(path.join(dir, "..", "exit-interview.json"), "utf8"),
	);
} catch {}
if (feedback.sourceInformation)
	main = main.replace(
		/const metadata\s*=\s*\{[\s\S]*?\};\n/,
		() => `const metadata=${JSON.stringify(feedback.sourceInformation)};\n`,
	);
main = main.replace(
	/\/\*FEEDBACK\*\/\s*\{\}/,
	JSON.stringify({
		testingFeedback: feedback.testingFeedback,
		engineFeedback: feedback.engineFeedback,
		promptFeedback: feedback.promptFeedback,
	}),
);
// Scope each module to preserve its private constants in the single-file build.
const wrap = (file, names) =>
	`const {${names}}=(()=>{\n${read(file)
		.replace(/^import .*;\n/gm, "")
		.replace(/^export /gm, "")}\nreturn {${names}};\n})();\n`;
const externalImports =
	(read("scene.js").match(/^import .*;$/gm) || []).join("\n") + "\n";
const app =
	externalImports +
	wrap("scene.js", "buildWorld") +
	wrap("audio.js", "createAudio,renderAudioTest") +
	wrap("online.js", "createOnline") +
	main;
html = html
	.replace("<!--HUB_SESSION-->", `<script>\n${read("session.js")}\n</script>`)
	.replace("/*CSS*/", () => read("style.css"))
	.replace("/*APP*/", () => app);
for (const name of ["players", "mode", "minutes", "goal", "howto"])
	html = html.replace(`name="hub:${name}"`, `name="hub:session-${name}"`);
const out = path.join(dir, "..", stem + ".html");
fs.writeFileSync(out, html);
console.log(path.basename(out));
