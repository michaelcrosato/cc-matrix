import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const file = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../src/view/preview.html",
);
await access(file);
console.log(`Native room / asset preview: ${new URL(`file://${file}`).href}`);
