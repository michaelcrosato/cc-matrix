import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const dev = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const root = path.dirname(dev);
const project = JSON.parse(
	fs.readFileSync(path.join(dev, "project.json"), "utf8"),
);
const read = (p) => fs.readFileSync(path.join(dev, p), "utf8");
const escape = (s) => s.replace(/<\/script/gi, "<\\/script");
const session = read("vendor/hub/session.js");
if (/<\/script/i.test(session))
	throw new Error("Pristine session client cannot be safely inlined.");
const report = JSON.parse(
	fs.readFileSync(path.join(root, "exit-interview.json"), "utf8"),
);
const names = ["sim", "tools", "view", "audio", "net", "main"];
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><script>${session}</script>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<title>${project.title}</title>
<meta name="description" content="A very hungry garden caper. Catch the tail, dodge the teeth, and share the snacks across five Venus gardens.">
<meta name="hub:session" content="1"><meta name="hub:session-players" content="1-2"><meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-minutes" content="15"><meta name="hub:session-goal" content="Clear the edible tails in five gardens while sharing lives, seeds and score.">
<meta name="hub:session-howto" content="Move with WASD, arrows, left stick or D-pad. Touch: drag a floating stick. Bite the glowing tail automatically. Space or Cross plants bait; touch PLANT. The horned head always hurts. Catch pale sentries after a bite.">
<meta name="game:title" content="${project.title}"><meta name="game:source" content="K.C.'s Krazy Chase! (1982)"><meta name="game:engine" content="my-3D2dge v0.89.1">
<style>
html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#101e2e;color:#fff0c5;overscroll-behavior:none}body{font-family:system-ui,sans-serif}canvas#screen{display:block;width:100%;height:100%;touch-action:none;image-rendering:pixelated}*{box-sizing:border-box}
.esh{--font:system-ui,sans-serif!important;--title:system-ui,sans-serif!important;--paper:#122c3bf5!important;--ink:#fff0ce!important;--accent:#ffd18d!important;--muted:#a5c7bf!important;--line:#49796f!important;--danger:#e5a5b2!important;font-size:clamp(16px,1.4vw,24px)!important}
.esh .esh-mod{max-width:min(850px,93vw)!important;max-height:85vh!important;padding:24px!important;border-radius:14px!important}.esh .esh-m{font-size:clamp(15px,1.2vw,21px)!important;line-height:1.55!important}.esh h2{font-size:clamp(25px,2.3vw,38px)!important}.esh .esh-btns button{font-size:clamp(16px,1.35vw,24px)!important;min-height:46px!important;padding:12px 20px!important}.esh .esh-k{font-size:13px!important}.esh button:focus-visible,.esh input:focus-visible{outline:3px solid #ffe4a6!important;outline-offset:3px!important}.esh .esh-row{font-size:clamp(16px,1.35vw,23px)!important}.esh .esh-row small{font-size:13px!important}.esh .esh-pan{box-shadow:0 18px 70px #0009!important}.esh .esh-mod button:hover{border-color:#ffe0a0!important}
@media(max-width:640px){.esh .esh-mod{padding:16px!important;max-height:80vh!important}.esh .esh-btns button{padding:10px 14px!important}.esh .esh-sh{padding-top:56px!important}}
</style></head><body><canvas id="screen" aria-label="${project.title}" tabindex="0"></canvas>
<script>${escape(read("vendor/engine/my-3d2dge.js"))}</script>
<script>globalThis.GARDEN_REPORT=${escape(JSON.stringify(report))};globalThis.GARDEN_LICENSE=${escape(JSON.stringify(read("vendor/engine/LICENSE")))};</script>
${names.map((n) => `<script>\n${escape(read("src/" + n + ".js"))}\n</script>`).join("\n")}
</body></html>`;
const target = path.join(root, project.slug + ".html");
fs.writeFileSync(target, html);
fs.writeFileSync(
	path.join(dev, "artifacts/build.json"),
	JSON.stringify(
		{
			title: project.title,
			artifact: path.basename(target),
			bytes: Buffer.byteLength(html),
			sha256: crypto.createHash("sha256").update(html).digest("hex"),
			engine: project.engineCommit,
			hub: project.hubCommit,
			sessionSha256: crypto.createHash("sha256").update(session).digest("hex"),
		},
		null,
		2,
	),
);
console.log(
	"Built " + path.basename(target) + " (" + Buffer.byteLength(html) + " bytes)",
);
