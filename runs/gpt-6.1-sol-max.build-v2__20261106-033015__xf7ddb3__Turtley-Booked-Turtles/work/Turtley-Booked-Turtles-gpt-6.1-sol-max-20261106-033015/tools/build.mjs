import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, ".."),
	id = JSON.parse(fs.readFileSync(path.join(root, "identity.json"))).id;
const read = (p) => fs.readFileSync(path.join(root, p), "utf8"),
	escapeScript = (s) => s.replace(/<\/script/gi, "<\\/script");
const interviewPath = path.join(root, "..", "exit-interview.json");
const interview = fs.existsSync(interviewPath)
	? JSON.parse(fs.readFileSync(interviewPath, "utf8"))
	: {
			sourceInformation: { usage: "added on import" },
			testingFeedback: ["Verification is in progress."],
			engineFeedback: [
				"Native pixel rendering, grid navigation and continuous rigs.",
			],
			promptFeedback: ["A coherent rescue-game brief."],
		};
const scripts = [
	"vendor/engine/my-3d2dge.js",
	"src/content.js",
	"src/sim.js",
	"src/art.js",
	"src/audio.js",
	"src/net.js",
	"src/main.js",
];
const html = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8">\n<script>${escapeScript(read("vendor/hub/session.js"))}</script>\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">\n<meta name="hub:session" content="1"><meta name="hub:session-players" content="1-2"><meta name="hub:session-mode" content="shared-world"><meta name="hub:session-goal" content="Rescue all 26 hatchlings across five hotel floors."><meta name="hub:session-howto" content="Move: stick / D-pad / WASD. Bomb: Cross / Space. Carry guests to lit homes."><meta name="hub:session-minutes" content="12">\n<meta name="description" content="Turtley Booked — Small shells. Big room service. An original rescue-maze arcade game.">\n<script type="application/json" id="dependency-provenance">${escapeScript(JSON.stringify({ engine: "my-3D2dge v0.89.1", commit: "8ecc2f62353761187bdfe226f327b7ea5d2eb691", license: read("vendor/engine/LICENSE"), hub: "AI Hub Session Protocol 1, client 1.4.0", hubCommit: "35a1047f2067b2af3de3943f0fe452f39105d869", hubLicense: "unknown" }))}</script>\n<title>Turtley Booked</title><style>${read("src/style.css")}</style></head><body><canvas id="screen" aria-label="Turtley Booked hotel rescue maze"></canvas>\n${scripts.map((p, i) => `<script>\n${i === 6 ? "TB.INTERVIEW=" + JSON.stringify(interview) + ";\n" : ""}${escapeScript(read(p))}\n</script>`).join("\n")}\n</body></html>\n`;
fs.writeFileSync(path.join(root, "build", "game.html"), html);
fs.writeFileSync(path.join(root, "..", id + ".html"), html);
console.log(`Built ${id}.html (${Buffer.byteLength(html)} bytes)`);
