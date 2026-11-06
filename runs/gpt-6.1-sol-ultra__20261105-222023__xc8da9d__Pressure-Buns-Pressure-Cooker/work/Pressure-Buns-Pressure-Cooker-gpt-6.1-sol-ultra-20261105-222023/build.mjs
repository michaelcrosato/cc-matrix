import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { build } from "esbuild";
const result = await build({
	entryPoints: ["main.js"],
	bundle: true,
	format: "esm",
	minify: true,
	write: false,
	target: "es2022",
	legalComments: "none",
	logLevel: "silent",
});
const session = await readFile("hub-session.js", "utf8");
const notices = (await readFile("THIRD-PARTY-NOTICES.txt", "utf8")).replaceAll(
	"-->",
	"—>",
);
const bundled = result.outputFiles[0].text.replaceAll("</script", "<\\/script");
await writeFile(
	"bundle-digest.json",
	JSON.stringify(
		{
			sha256: createHash("sha256").update(bundled).digest("hex"),
			bytes: Buffer.byteLength(bundled),
		},
		null,
		2,
	),
);
const html = (await readFile("index.html", "utf8"))
	.replace("<!--HUB-->", () => "<script>" + session + "</script>")
	.replace("</body>", () => "<!--\n" + notices + "\n--></body>")
	.replace("/*GAME*/", () => bundled);
if (html.includes("/*GAME*/") || html.includes("<!--HUB-->"))
	throw new Error("Unreplaced packaging marker");
const name =
	"Pressure-Buns-Pressure-Cooker-gpt-6.1-sol-ultra-20261105-222023.html";
await writeFile("../" + name, html);
await writeFile(
	"../exit-interview.json",
	await readFile("exit-interview.json"),
);
console.log(
	"Built " + name + " (" + (html.length / 1024 / 1024).toFixed(2) + " MB)",
);
