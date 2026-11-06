import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const { id, title } = JSON.parse(fs.readFileSync("identity.json"));
const html = fs.readFileSync(path.join("..", id + ".html"), "utf8");
let count = 0;
const failures = [];
const check = (s, okay) => {
	count++;
	if (!okay) failures.push(s);
};
const metadata = JSON.parse(fs.readFileSync("../exit-interview.json", "utf8"));
check(
	"exact standalone artifact and staged build agree",
	html === fs.readFileSync("build/game.html", "utf8"),
);
check(
	"unmodified Hub client is first script after charset",
	html.match(/<meta charset="utf-8">\s*<script>([\s\S]*?)<\/script>/)?.[1] ===
		fs.readFileSync("vendor/hub/session.js", "utf8"),
);
for (const [key, value] of [
	["session", "1"],
	["session-players", "1-2"],
	["session-mode", "shared-world"],
])
	check(
		"Hub metadata " + key,
		html.includes(`name="hub:${key}" content="${value}"`),
	);
check(
	"full engine included",
	html.includes("my-3D2dge") && html.includes("v0.89.1") && html.length > 1e6,
);
check(
	"no relative runtime imports or external scripts",
	!/<script[^>]+src=|\bimport\s+[^;]*from\s*["']|<link[^>]+(?:href|src)=/i.test(
		html,
	),
);
check(
	"complete MIT license included",
	html.includes("Permission is hereby granted, free of charge"),
);
check(
	"catalogue title agrees",
	metadata.aiHub.name === title &&
		html.includes("<title>" + title + "</title>"),
);
const fields = [
	"date",
	"source",
	"plan",
	"genre",
	"perspective",
	"tech",
	"artDirection",
	"animation",
	"audio",
	"online",
	"testing",
	"research",
	"environment",
	"model",
	"usage",
];
check(
	"source fields exact and filled",
	JSON.stringify(Object.keys(metadata.sourceInformation).sort()) ===
		JSON.stringify(fields.sort()) &&
		Object.values(metadata.sourceInformation).every(
			(v) => typeof v === "string" && v.length > 0,
		),
);
check("usage literal", metadata.sourceInformation.usage === "added on import");
check(
	"feedback arrays exact and filled",
	[
		["testingFeedback", 4],
		["engineFeedback", 6],
		["promptFeedback", 4],
	].every(
		([k, n]) =>
			metadata[k].length === n &&
			metadata[k].every((v) => typeof v === "string" && v.length > 0),
	),
);
check(
	"valid catalogue schema",
	metadata.aiHub.type === "Game" &&
		metadata.aiHub.genre === "Action" &&
		metadata.aiHub.players === "1–2" &&
		metadata.aiHub.tags.length >= 3 &&
		metadata.aiHub.tags.length <= 6,
);
check(
	"interview is embedded verbatim as data",
	html.includes("TB.INTERVIEW=" + JSON.stringify(metadata) + ";"),
);
fs.writeFileSync(
	"build/export-evidence.json",
	JSON.stringify(
		{
			bytes: Buffer.byteLength(html),
			sha256: createHash("sha256").update(html).digest("hex"),
			checks: count,
		},
		null,
		2,
	),
);
console.log(JSON.stringify({ count, failures }));
process.exitCode = failures.length ? 1 : 0;
