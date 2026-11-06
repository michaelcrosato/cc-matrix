import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(
	fs.readFileSync(path.join(dir, "build-config.json"), "utf8"),
);
const meta = JSON.parse(
	fs.readFileSync(path.join(dir, "..", "exit-interview.json"), "utf8"),
);
const read = (p) => fs.readFileSync(path.join(dir, p), "utf8");
const script = (body) =>
	"<script>\n" + body.replace(/<\/script/gi, "<\\/script") + "\n</script>\n";
const sources = [
	"vendor/engine-repo/dist/handoff/my-3d2dge.js",
	"src/config.js",
	"src/content/campaign.js",
	"src/sim/geometry.js",
	"src/sim/simulation.js",
	"src/sim/director.js",
	"src/render/world.js",
	"src/audio/score.js",
	"src/save/save.js",
	"src/input/input.js",
	"src/net/network.js",
	"src/ui/ui.js",
	"src/main.js",
];
const license = read("vendor/engine-repo/LICENSE");
const html =
	'<!doctype html>\n<html lang="en"><head><meta charset="utf-8">\n' +
	script(read("vendor/hub/session.js")) +
	'<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#071317">\n' +
	'<meta name="hub:session" content="1"><meta name="hub:session-players" content="1-2"><meta name="hub:session-mode" content="shared-world"><meta name="hub:session-goal" content="Reunite the two halves of the Wayfarer’s Crown."><meta name="hub:session-howto" content="Move with left stick or WASD. Aim with right stick or mouse. R2 / click fires; L2 / right click listens; Cross / E interacts; Circle / Space quicksteps. Find the axe, boat and key, then defeat both summit guardians."><meta name="hub:session-minutes" content="20">\n' +
	"<!-- my-3D2dge license\n" +
	license +
	"\n-->\n<title>" +
	config.title +
	"</title><style>" +
	read("src/ui/style.css") +
	'</style></head><body><canvas id="screen" aria-label="Dungeons and Deeper Trouble game world"></canvas>\n' +
	script(
		"globalThis.DTMeta=" +
			JSON.stringify(meta).replaceAll("<", "\\u003c") +
			";",
	) +
	sources.map((s) => script(read(s))).join("") +
	"</body></html>\n";
const outfile = path.join(dir, "..", config.filename);
fs.writeFileSync(outfile, html);
fs.writeFileSync(
	path.join(dir, "reports/build.json"),
	JSON.stringify(
		{
			file: config.filename,
			bytes: Buffer.byteLength(html),
			sources,
			engine: "0.89.1",
			hub: "1.4.0",
		},
		null,
		2,
	),
);
console.log(
	"Built " +
		config.filename +
		" (" +
		Math.round(Buffer.byteLength(html) / 1024) +
		" KiB)",
);
