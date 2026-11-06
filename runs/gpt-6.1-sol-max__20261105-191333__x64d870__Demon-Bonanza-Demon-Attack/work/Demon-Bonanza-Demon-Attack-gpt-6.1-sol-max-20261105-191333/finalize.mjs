import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { CREDITS } from "./credits.js";
const directory = path.dirname(fileURLToPath(import.meta.url));
const data = {
	...CREDITS,
	aiHub: {
		name: "Demon Bonanza",
		tagline: "Cold moon. Hot cannon. Bad company.",
		description:
			"An ice-moon arcade shooter full of winged trouble: slide, steer tracer fire and reflect the barrage. Survive six waves, dethrone a three-phase demon monarch, and share your bunker stock with friends.",
		type: "Game",
		genre: "Shooter",
		source: "Demon Attack (1982)",
		series: "",
		players: "1–4",
		controls:
			"A/D or left stick: slide; mouse or right stick: aim; Space/LMB or R2: fire; E/RMB or Square: pulse; Shift or Circle: dash; Esc or Options: pause. Touch: drag, assisted auto-fire; two fingers: pulse.",
		tags: ["arcade", "2.5d", "co-op", "retro", "sci-fi", "boss fights"],
	},
};
const output = path.join(directory, "..", "exit-interview.json");
writeFileSync(output, JSON.stringify(data, null, 2) + "\n");
JSON.parse(JSON.stringify(data));
console.log(output);
