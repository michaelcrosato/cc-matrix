import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
let main = readFileSync(resolve(dir, "main.js"), "utf8")
	.replace(/^import \{ GameAudio \} from ['"]\.\/audio.js['"];\n/m, "")
	.replace(/^import \{ GameNetwork \} from ['"]\.\/network.js['"];\n/m, "");
const audio = readFileSync(resolve(dir, "audio.js"), "utf8").replace(
	"export class GameAudio",
	"class GameAudio",
);
const net = readFileSync(resolve(dir, "network.js"), "utf8").replace(
	"export class GameNetwork",
	"class GameNetwork",
);
const credits = JSON.parse(
	readFileSync(resolve(dir, "../exit-interview.json"), "utf8"),
);
main = `const CREDIT_DATA = ${JSON.stringify(credits)};\n${main}`;
const template = readFileSync(resolve(dir, "template.html"), "utf8");
const hub = readFileSync(resolve(dir, "vendor/session.js"), "utf8");
const html = template
	.replace("<!-- HUB_CLIENT -->", () => `<script>\n${hub}\n</script>`)
	.replace("// GAME_MODULE", () => `${audio}\n${net}\n${main}`);
if (html.includes("// GAME_MODULE")) throw new Error("Unbundled module");
writeFileSync(
	resolve(dir, "../Com-Ricochet-Combat-gpt-6.1-sol-ultra-20261105-212555.html"),
	html,
);
