import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.dirname(dir),
	identity = JSON.parse(readFileSync(path.join(dir, "identity.json"), "utf8"));
const interview = JSON.parse(
	readFileSync(path.join(root, "exit-interview.json"), "utf8"),
);
const read = (p) => readFileSync(path.join(dir, p), "utf8");
const inline = (code) =>
	"<script>\n" + code.replace(/<\/script/gi, "<\\/script") + "\n</script>";
const html =
	'<!doctype html>\n<html lang="en"><head><meta charset="utf-8">\n' +
	inline(read("vendor/hub/session.js")) +
	"\n" +
	'<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">\n' +
	'<meta name="hub:session" content="1"><meta name="hub:session-players" content="1-2"><meta name="hub:session-mode" content="shared-world">\n' +
	'<meta name="hub:session-goal" content="Work together to rescue all 26 hatchlings across five hotel floors. Three shared lives.">\n' +
	'<meta name="hub:session-howto" content="Left stick/D-pad or WASD/arrows move. Cross/Space places one shared bug bomb. Carry babies to matching homes; central supply refills bombs.">\n' +
	'<meta name="hub:session-minutes" content="15">\n<title>' +
	identity.title +
	"</title>\n" +
	"<!-- my-3D2dge v0.89.1, commit 8ecc2f62353761187bdfe226f327b7ea5d2eb691. AI Hub session client 1.4.0, commit 35a1047f2067b2af3de3943f0fe452f39105d869, unmodified. Both authored by Michael Crosato. Repository license status unknown: no license file in supplied handoff. Original game and procedural art/audio authored for this brief. Historical reference images are not embedded. -->\n" +
	"<style>" +
	read("src/style.css") +
	'</style></head><body><canvas id="screen" aria-label="Turtle Shell Service: rescue maze game"></canvas><div id="boot" hidden>Opening the hotel…</div>\n' +
	inline(read("vendor/engine/my-3d2dge.js")) +
	"\n" +
	inline(
		"globalThis.TSS = { IDENTITY: " +
			JSON.stringify(identity) +
			", INTERVIEW: " +
			JSON.stringify(interview) +
			" };",
	) +
	"\n" +
	["content", "sim", "bot", "input", "audio", "art", "net", "ui", "main"]
		.map((name) => inline(read("src/" + name + ".js")))
		.join("\n") +
	"\n</body></html>\n";
mkdirSync(path.join(dir, "build"), { recursive: true });
writeFileSync(path.join(dir, "build/game.html"), html);
writeFileSync(path.join(root, identity.slug + ".html"), html);
if (!process.argv.includes("--quiet"))
	process.stdout.write(
		identity.slug +
			".html · " +
			Math.round(Buffer.byteLength(html) / 1024) +
			" KiB\n",
	);
