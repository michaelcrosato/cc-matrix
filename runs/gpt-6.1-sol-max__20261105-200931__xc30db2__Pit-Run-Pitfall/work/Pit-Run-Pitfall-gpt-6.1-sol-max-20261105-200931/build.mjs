import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));
const read = (n) => readFileSync(resolve(here, n), "utf8");
const pieces = [
	"graphics.js",
	"audio.js",
	"world.js",
	"input.js",
	"network.js",
	"game.js",
	"ui.js",
	"bootstrap.js",
];
const code = pieces.map(read).join("\n");
const html = read("template.html")
	.replace("__SESSION__", () => read("hub/session.js"))
	.replace("__CSS__", () => read("style.css"))
	.replace("__CODE__", () => code)
	.replace("__INTERVIEW__", () =>
		read("../exit-interview.json").replaceAll("<", "\\u003c"),
	);
const name = "Pit-Run-Pitfall-gpt-6.1-sol-max-20261105-200931.html";
writeFileSync(resolve(here, "../" + name), html);
writeFileSync(resolve(here, name), html);
writeFileSync(resolve(here, "combined-check.mjs"), code);
console.log(name);
