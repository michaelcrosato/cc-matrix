import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
const config = JSON.parse(fs.readFileSync("build-config.json", "utf8"));
const override = process.env.CONTENT_FILE
	? JSON.parse(fs.readFileSync(process.env.CONTENT_FILE, "utf8"))
	: null;
if (override) {
	const { validateContent } = await import("../src/core.js");
	const errors = validateContent(override);
	if (errors.length) throw Error(errors.join("\n"));
}
fs.mkdirSync("build", { recursive: true });
fs.writeFileSync("build/content-override.json", JSON.stringify(override));
const r = spawnSync("bun", ["tools/bundle.ts"], {
	encoding: "utf8",
	env: process.env,
});
if (r.status !== 0) {
	process.stderr.write(r.stderr || r.stdout);
	process.exit(1);
}
const escape = (s) => s.replace(/<\/script/gi, "<\\/script");
const session = fs.readFileSync("vendor/hub/session.js", "utf8");
const script = fs.readFileSync("build/game.js", "utf8");
const css = fs.existsSync("src/style.css")
	? fs.readFileSync("src/style.css", "utf8")
	: "";
const licenseNotice = [
	"vendor/engine/LICENSE",
	"vendor/three/LICENSE",
	"vendor/rapier/LICENSE",
]
	.map((p) => p + "\n" + fs.readFileSync(p, "utf8"))
	.join("\n\n")
	.replace(/--/g, "—");
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><script>${escape(session)}</script>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover">
<meta name="hub:session" content="1"><meta name="hub:session-players" content="1-2"><meta name="hub:session-mode" content="shared-world"><meta name="hub:session-minutes" content="10"><meta name="hub:session-goal" content="Descend three floors, defeat the warden, and claim the treasure"><meta name="hub:session-howto" content="Left stick/WASD move; right stick/Q E turn; Cross/F interact; R2/click attack; Triangle/Tab pack; touchpad/M map; Options/Escape pause.">
<title>${config.title}</title><style>${css}</style></head><body><div id="stage"><canvas id="view"></canvas><canvas id="screen"></canvas><div id="vignette"></div><div id="hud"></div><div id="ui" aria-live="polite"><div class="loading">The lantern is being lit…</div></div><div id="toast" role="status"></div></div><!-- Third-party notices\n${licenseNotice}\n--><script>if(typeof self.GPUShaderStage==="undefined")self.GPUShaderStage={VERTEX:1,FRAGMENT:2,COMPUTE:4};${escape(script)}</script></body></html>`;
fs.writeFileSync("build/index.html", html);
fs.writeFileSync(path.join("..", config.slug + ".html"), html);
if (fs.existsSync("report.json"))
	fs.copyFileSync("report.json", "../exit-interview.json");
console.log(
	`Built ${config.title} · ${(Buffer.byteLength(html) / 1048576).toFixed(2)} MiB · single HTML`,
);
