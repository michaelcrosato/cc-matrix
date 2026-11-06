import { build } from "esbuild";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { INTERVIEW } from "./metadata.js";
const dir = path.dirname(fileURLToPath(import.meta.url));
const selection = JSON.parse(
	await fs.readFile(path.join(dir, "title-selection.json"), "utf8"),
);
const bundle = await build({
	entryPoints: [path.join(dir, "main.js")],
	bundle: true,
	format: "esm",
	target: "es2022",
	minify: true,
	write: false,
	legalComments: "inline",
});
let html = await fs.readFile(path.join(dir, "shell.html"), "utf8");
const hub = await fs.readFile(
	path.join(dir, "network-dev/hub-session.js"),
	"utf8",
);
html = html.replace(
	"<!--HUB_CLIENT-->",
	() => "<script>\n" + hub.replaceAll("</script", "<\\/script") + "\n</script>",
);
html = html.replace("/*APP_BUNDLE*/", () =>
	bundle.outputFiles[0].text.replaceAll("</script", "<\\/script"),
);
const thirdParty =
	"Three.js r180\n" +
	(await fs.readFile(path.join(dir, "node_modules/three/LICENSE"), "utf8")) +
	"\nRapier 0.19.3\n" +
	(await fs.readFile(path.join(dir, "RAPIER-LICENSE.txt"), "utf8"));
html = html.replace(
	"</head>",
	() =>
		`<!-- Third-party licenses\n${thirdParty.replaceAll("--", "—")}\n-->\n</head>`,
);
const out = path.join(dir, "..", selection.stem + ".html");
await fs.writeFile(out, html);
await fs.writeFile(
	path.join(dir, "..", "exit-interview.json"),
	JSON.stringify(INTERVIEW, null, 2) + "\n",
);
console.log(
	`Built ${path.basename(out)} (${(Buffer.byteLength(html) / 1048576).toFixed(2)} MB)`,
);
