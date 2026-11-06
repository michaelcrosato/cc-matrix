import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(dir);
const folder = path.basename(dir);
execFileSync(
	"bun",
	[
		"build",
		"main.js",
		"--target=browser",
		"--minify",
		"--outfile=app.bundle.js",
	],
	{ cwd: dir, stdio: "pipe" },
);
let css = readFileSync(path.join(dir, "style.css"), "utf8");
const fontA = readFileSync(path.join(dir, "barlow.ttf")).toString("base64");
const fontB = readFileSync(path.join(dir, "dm-sans.ttf")).toString("base64");
css = css.replace(
	"/*__FONTS__*/",
	`@font-face{font-family:'Barlow Condensed';font-style:normal;font-weight:700 900;font-display:swap;src:url(data:font/ttf;base64,${fontA}) format('truetype')}@font-face{font-family:'DM Sans';font-style:normal;font-weight:400 800;font-display:swap;src:url(data:font/ttf;base64,${fontB}) format('truetype')}`,
);
const credits = JSON.parse(
	readFileSync(path.join(root, "exit-interview.json"), "utf8"),
);
const html = readFileSync(path.join(dir, "template.html"), "utf8")
	.replace("/*__HUB_CLIENT__*/", () =>
		readFileSync(path.join(dir, "hub-session.js"), "utf8"),
	)
	.replace("/*__STYLE__*/", () => css)
	.replace("<!--__LICENSES__-->", () => {
		const notices = [
			"LIBRARY-NOTICES.txt",
			"LICENSE-Rapier.txt",
			"LICENSE-Barlow-Condensed.txt",
			"LICENSE-DM-Sans.txt",
		]
			.map((file) => readFileSync(path.join(dir, file), "utf8"))
			.join("\n\n");
		return (
			"<!-- Third-party licences and notices\n" +
			notices.replaceAll("-->", "-- >") +
			"\n-->"
		);
	})
	.replace("/*__CREDITS__*/", () =>
		JSON.stringify(credits).replaceAll("<", "\\u003c"),
	)
	.replace("/*__GAME__*/", () =>
		readFileSync(path.join(dir, "app.bundle.js"), "utf8").replaceAll(
			"</script",
			"<\\/script",
		),
	);
writeFileSync(path.join(root, `${folder}.html`), html);
console.log(
	`Built ${folder}.html (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB)`,
);
