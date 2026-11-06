import { readFileSync, writeFileSync } from "node:fs";
const stem = "Flip-Bros-Mario-Bros-1983-gpt-6.1-sol-max-20261105-200642";
let html = readFileSync("index.template.html", "utf8")
	.replace("/*__HUB_CLIENT__*/", () => readFileSync("hub-session.js", "utf8"))
	.replace("/*__GAME__*/", () =>
		["audio.js", "world.js", "game.js", "ui.js", "network.js", "app.js"]
			.map((f) => readFileSync(f, "utf8"))
			.join("\n"),
	)
	.replace(
		"const INTERVIEW = null;",
		() =>
			`const INTERVIEW = ${readFileSync("../exit-interview.json", "utf8")};`,
	);
writeFileSync("../" + stem + ".html", html);
writeFileSync("index.html", html);
