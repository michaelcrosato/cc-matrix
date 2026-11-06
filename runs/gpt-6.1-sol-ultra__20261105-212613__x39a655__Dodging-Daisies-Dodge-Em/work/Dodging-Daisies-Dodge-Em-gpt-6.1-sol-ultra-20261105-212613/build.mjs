import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const directory = dirname(fileURLToPath(import.meta.url));
const releaseName =
	"Dodging-Daisies-Dodge-Em-gpt-6.1-sol-ultra-20261105-212613.html";
const [template, stylesheet, session] = await Promise.all([
	readFile(join(directory, "template.html"), "utf8"),
	readFile(join(directory, "style.css"), "utf8"),
	readFile(join(directory, "hub/session.js"), "utf8"),
]);
const bundled = await build({
	absWorkingDir: directory,
	entryPoints: ["main.js"],
	bundle: true,
	minify: true,
	write: false,
	format: "iife",
	target: ["es2022"],
	platform: "browser",
	define: { "process.env.NODE_ENV": '"production"' },
	legalComments: "inline",
	logLevel: "silent",
});
if (!template.includes("<!--GAME_SCRIPT-->"))
	throw new Error("template.html needs <!--GAME_SCRIPT-->.");
if (!template.includes("<!--GAME_CSS-->"))
	throw new Error("template.html needs <!--GAME_CSS-->.");
const charset = /<meta\s+charset\s*=\s*["']?utf-8["']?\s*\/?>/i;
if (!charset.test(template))
	throw new Error('template.html needs <meta charset="utf-8">.');
if (/<script/i.test(template.slice(0, template.search(charset))))
	throw new Error("No script may precede the charset and AI Hub client.");
if (/<\/script/i.test(session))
	throw new Error(
		"The unmodified AI Hub client contains an HTML closing script tag.",
	);
const metadata = {
	"hub:session": "1",
	"hub:session-players": "1-2",
	"hub:session-mode": "shared-world",
	"hub:session-goal":
		"Collect every flower. Dodge traffic. Clear all four circuits.",
	"hub:session-howto":
		"Left/Right or A/D: lanes. Space: accelerate. Esc: pause.",
	"hub:session-minutes": "6",
};
let tags = "";
for (const [name, content] of Object.entries(metadata)) {
	if (!new RegExp(`<meta\\s+[^>]*name=["']${name}["']`, "i").test(template))
		tags += `\n<meta name="${name}" content="${content}">`;
}
const script = bundled.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const html = template
	.replace(
		charset,
		(match) => `${match}\n<script>\n${session}\n</script>${tags}`,
	)
	.replace(
		"<!--GAME_CSS-->",
		() => `<style>\n${stylesheet.replace(/<\/style/gi, "<\\/style")}\n</style>`,
	)
	.replace("<!--GAME_SCRIPT-->", () => `<script>\n${script}\n</script>`);
await Promise.all([
	writeFile(join(directory, "index.html"), html),
	writeFile(resolve(directory, "..", releaseName), html),
]);
console.log(
	`Built ${releaseName} (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB).`,
);
