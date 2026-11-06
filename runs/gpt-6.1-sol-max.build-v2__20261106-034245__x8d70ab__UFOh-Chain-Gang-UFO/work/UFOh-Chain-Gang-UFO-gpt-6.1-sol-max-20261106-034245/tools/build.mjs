import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export async function build({ quiet = false } = {}) {
	const identity = JSON.parse(
		await readFile(path.join(root, "identity.json"), "utf8"),
	);
	const loaded = new Map();
	async function bundle(file) {
		const name = path.relative(root, file).replaceAll("\\", "/");
		if (loaded.has(name)) return;
		let source = await readFile(file, "utf8"),
			imports = [];
		for (const m of source.matchAll(
			/^import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"];?\s*$/gm,
		))
			imports.push({
				text: m[0],
				symbols: m[1].trim(),
				file: path.resolve(path.dirname(file), m[2]),
			});
		for (const i of imports) {
			await bundle(i.file);
			const n = path.relative(root, i.file).replaceAll("\\", "/");
			source = source.replace(
				i.text,
				`const { ${i.symbols} } = __modules[${JSON.stringify(n)}];`,
			);
		}
		const exports = [];
		source = source.replace(
			/\bexport\s+(?:async\s+)?(?:function|class|const|let)\s+(\w+)/g,
			(m, n) => {
				exports.push(n);
				return m.replace("export ", "");
			},
		);
		source = source.replace(/^export\s*\{([^}]+)\};?\s*$/gm, (_m, list) => {
			exports.push(...list.split(",").map((s) => s.trim()));
			return "";
		});
		if (/^\s*(import|export)\b/m.test(source))
			throw new Error(`Unhandled module syntax in ${name}`);
		loaded.set(
			name,
			`__modules[${JSON.stringify(name)}] = (() => {\n${source}\nreturn {${exports.join(",")}};\n})();`,
		);
	}
	await bundle(path.join(root, "src/main.js"));
	const hub = await readFile(path.join(root, "vendor/hub/session.js"), "utf8"),
		engine = await readFile(
			path.join(root, "vendor/engine/my-3d2dge.js"),
			"utf8",
		),
		license = await readFile(path.join(root, "vendor/engine/LICENSE"), "utf8"),
		style = await readFile(path.join(root, "src/style.css"), "utf8");
	const safe = (s) => s.replace(/<\/script/gi, "<\\/script");
	if (hub.includes("</script"))
		throw new Error(
			"Released client contains a script closer; cannot modify it.",
		);
	const html = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<script>${hub}</script>\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<title>${identity.title}</title>\n<meta name="description" content="A little saucer. An enormous attitude. Shoot to spend your shield; ram when it returns.">\n<meta name="theme-color" content="#07111d">\n<meta name="hub:type" content="Game">\n<meta name="hub:players" content="1-2">\n<meta name="hub:genre" content="Shooter">\n<meta name="hub:session" content="1">\n<meta name="hub:session-players" content="1-2">\n<meta name="hub:session-mode" content="shared-world">\n<meta name="hub:session-minutes" content="10">\n<meta name="hub:session-goal" content="Save Earth: clear four sectors and the three-phase command craft. Share points and rescue your wingmate with a ready shield.">\n<meta name="hub:session-howto" content="Left stick / WASD move; right stick / mouse aim; R2 or Cross / Space or click fire. Firing spends your shield. Wait for the full ring, then ram. Options / Esc menu. Touch: invisible twin sticks with safe burst assistance.">\n<style>${style}</style>\n<!-- my-3D2dge license notice\n${license}\n-->\n</head>\n<body>\n<canvas id="screen" aria-label="UFOh Chain Gang arcade game"></canvas>\n<noscript>This saucer needs JavaScript to take off.</noscript>\n<script>${safe(engine)}</script>\n<script>(() => { 'use strict'; const __modules = Object.create(null);\n${safe([...loaded.values()].join("\n"))}\n})();</script>\n</body>\n</html>\n`;
	await mkdir(path.join(root, "build"), { recursive: true });
	await writeFile(path.join(root, "build/game.html"), html);
	await writeFile(path.join(root, `../${identity.stem}.html`), html);
	const manifest = {
		title: identity.title,
		artifact: `${identity.stem}.html`,
		bytes: Buffer.byteLength(html),
		sha256: createHash("sha256").update(html).digest("hex"),
		hubClientSha256: createHash("sha256").update(hub).digest("hex"),
		engineRevision: "8ecc2f62353761187bdfe226f327b7ea5d2eb691",
		hubRevision: "35a1047f2067b2af3de3943f0fe452f39105d869",
		modules: [...loaded.keys()],
	};
	await writeFile(
		path.join(root, "build/manifest.json"),
		`${JSON.stringify(manifest, null, 2)}\n`,
	);
	if (!quiet)
		console.log(`Built ${manifest.artifact} (${manifest.bytes} bytes).`);
	return manifest;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await build();
