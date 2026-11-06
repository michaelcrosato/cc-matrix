import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const project = JSON.parse(
	fs.readFileSync(path.join(root, "project.json"), "utf8"),
);
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const escapeScript = (s) => s.replace(/<\/script/gi, "<\\/script");
const hub = read("vendor/hub/session.js");
const scripts = [
	"vendor/my-3d2dge.js",
	"vendor/peerjs.min.js",
	"src/sim/content.js",
	"src/sim/model.js",
	"src/net/network.js",
	"src/view/art.js",
	"src/audio/audio.js",
	"src/main.js",
];
const reportPath = path.resolve(root, "../exit-interview.json");
const report = fs.existsSync(reportPath)
	? fs.readFileSync(reportPath, "utf8")
	: JSON.stringify({
			sourceInformation: {
				source: "Bomb Squad (1982)",
				plan: "PLAN.md",
				usage: "added on import",
			},
			testingFeedback: ["unknown"],
			engineFeedback: ["unknown"],
			promptFeedback: ["unknown"],
		});
const metadata =
	'<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover"><meta name="hub:session" content="1"><meta name="hub:session-players" content="1-4"><meta name="hub:session-mode" content="shared-world"><meta name="hub:session-goal" content="Repair sectors, deduce the shared stencil code and disarm the device together."><meta name="hub:session-howto" content="D-pad/left stick move focus; Cross apply or hold; Circle back/drop; L1/R1 tools; Square test; Triangle repeat; R2 evidence; Options menu."><meta name="hub:session-minutes" content="4">';
let html = `<!DOCTYPE html>\n<html lang="en"><head><meta charset="utf-8"><script>${hub}</script>\n${metadata}<title>Bomb Union — Small repairs. Enormous consequences.</title><style id="bu-style">${read("src/ui/style.css")}</style></head><body><canvas id="screen" aria-label="Bomb Union native circuit workspace"></canvas><div id="bu-loading" class="bu-loading">BOMB UNION · Checking continuity…</div>\n`;
html += `<script>globalThis.BU=globalThis.BU||{};BU.REPORT=${escapeScript(report)};</script>\n`;
for (const source of scripts)
	html += `<script>\n${escapeScript(read(source))}\n</script>\n`;
const notices = [
	"vendor/ENGINE-LICENSE",
	"vendor/PEERJS-LICENSE",
	"vendor/hub/LICENSE",
]
	.filter((p) => fs.existsSync(path.join(root, p)))
	.map((p) => `${p}\n${read(p)}`)
	.join("\n\n");
html += `<!-- Third-party notices\n${notices.replace(/-->/g, "-- >")}\n-->\n</body></html>\n`;
const output = path.resolve(root, `../${project.slug}.html`);
fs.writeFileSync(output, html);
fs.writeFileSync(
	path.join(root, "evidence/build.json"),
	JSON.stringify(
		{
			title: project.title,
			output: path.basename(output),
			bytes: Buffer.byteLength(html),
			sha256: crypto.createHash("sha256").update(html).digest("hex"),
			hubSha256: crypto.createHash("sha256").update(hub).digest("hex"),
			engineRevision: "8ecc2f62353761187bdfe226f327b7ea5d2eb691",
			hubRevision: "35a1047f2067b2af3de3943f0fe452f39105d869",
			engineVersion: "0.89.1",
			clientVersion: "1.4.0",
			peerVersion: "1.5.5",
		},
		null,
		2,
	),
);
console.log(`Built ${path.basename(output)}`);
