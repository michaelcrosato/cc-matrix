import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const dir = dirname(fileURLToPath(import.meta.url));
const stem = dir.split("/").pop();
const read = (n) => readFileSync(resolve(dir, n), "utf8");
const metadata = JSON.parse(
	readFileSync(resolve(dir, "../exit-interview.json"), "utf8"),
);
const files = ["sim.js", "audio.js", "hub.js", "scene.js", "main.js"];
const code =
	"import * as THREE from 'three';\nimport RAPIER from 'rapier';\nconst METADATA=" +
	JSON.stringify(metadata).replaceAll("<", "\\u003c") +
	";\n" +
	files
		.map((f) => {
			const source = read(f).replace(/export (?=class|function|const)/g, "");
			const name = { "audio.js": "AudioDirector", "hub.js": "HubLink" }[f];
			return name
				? "const " + name + "=(()=>{\n" + source + "\nreturn " + name + ";})();"
				: source;
		})
		.join("\n");
execFileSync(process.execPath, ["--check", "--input-type=module"], {
	input: code,
	stdio: ["pipe", "pipe", "pipe"],
});
let html = read("index.template.html")
	.replace(
		"<!--HUB_SESSION-->",
		"<script>\n" + read("hub-reference/session.js") + "\n</script>",
	)
	.replace("/*STYLE*/", read("style.css"))
	.replace("/*MODULE*/", code);
writeFileSync(resolve(dir, "../" + stem + ".html"), html);
console.log(
	"Built " +
		stem +
		".html (" +
		Math.round(Buffer.byteLength(html) / 1024) +
		" KiB)",
);
