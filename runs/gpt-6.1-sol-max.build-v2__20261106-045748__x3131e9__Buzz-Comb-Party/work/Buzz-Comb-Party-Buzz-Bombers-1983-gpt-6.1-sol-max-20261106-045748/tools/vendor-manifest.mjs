import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
const files = [
	"vendor/hub/session.js",
	"tests/hub/harness.html",
	"tests/hub/bridge.js",
	"tests/hub/round.js",
];
const manifest = Object.fromEntries(
	files.map((f) => [
		f,
		createHash("sha256")
			.update(readFileSync(new URL("../" + f, import.meta.url)))
			.digest("hex"),
	]),
);
writeFileSync(
	new URL("../vendor/manifest.json", import.meta.url),
	JSON.stringify(manifest, null, 2),
);
