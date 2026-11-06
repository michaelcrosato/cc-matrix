import fs from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = fileURLToPath(new URL("../", import.meta.url));
vm.runInThisContext(fs.readFileSync(`${root}src/content/campaign.js`, "utf8"));
const errors = DTContent.validate();
for (const e of errors) console.error(`FAIL ${e}`);
console.log(
	`Content: ${Object.keys(DTContent.caves).length} sections, ${Object.values(DTContent.caves).reduce((n, c) => n + c.rooms.length, 0)} chambers, ${errors.length} failures`,
);
process.exitCode = errors.length ? 1 : 0;
