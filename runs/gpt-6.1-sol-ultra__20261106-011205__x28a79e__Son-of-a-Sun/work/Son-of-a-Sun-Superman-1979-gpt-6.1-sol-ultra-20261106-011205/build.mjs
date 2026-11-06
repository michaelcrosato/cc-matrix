import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
const base = new URL("./", import.meta.url),
	name = "Son-of-a-Sun-Superman-1979-gpt-6.1-sol-ultra-20261106-011205.html";
const read = (n) => readFile(new URL(n, base), "utf8");
let html = await read("index.html");
const modules = await Promise.all(
	["art.js", "audio.js", "hub.js", "extras.js", "main.js"].map(read),
);
const exports = [
	["createCity", "createHero", "createCitizen"],
	["AudioSystem", "offlineTest"],
	["OnlineLink"],
	["createExtras"],
];
const imports = modules[4]
	.split("\n")
	.filter((x) => x.startsWith("import ") && !/from\s+["']\.\//.test(x))
	.join("\n");
const script =
	imports +
	"\n" +
	modules
		.slice(0, 4)
		.map(
			(m, i) =>
				`const {${exports[i].join(",")}}=(()=>{\n${m.replace(/^import .*\n/gm, "").replace(/^export /gm, "")}\nreturn {${exports[i].join(",")}};})();`,
		)
		.join("\n") +
	"\n" +
	modules[4].replace(/^import .*\n/gm, "");
execFileSync(process.execPath, ["--check", "--input-type=module"], {
	input: script,
	encoding: "utf8",
});
html = html.replace(
	"<!-- HUB_CLIENT -->",
	`<script>${(await read("session.js")).replace(/<\/script/gi, "<\\/script")}</script>`,
);
let credits = {};
try {
	credits = JSON.parse(
		await readFile(new URL("../exit-interview.json", base), "utf8"),
	);
} catch {}
html = html.replace(
	'<script type="module" src="./main.js"></script>',
	`<script>window.GAME_CREDITS=${JSON.stringify(credits).replace(/</g, "\\u003c")};</script>\n<script type="module">${script.replace(/<\/script/gi, "<\\/script")}</script>`,
);
await writeFile(new URL("../" + name, base), html);
await writeFile(new URL("game.html", base), html);
await writeFile(new URL("bundle.mjs", base), script);
console.log(name);
