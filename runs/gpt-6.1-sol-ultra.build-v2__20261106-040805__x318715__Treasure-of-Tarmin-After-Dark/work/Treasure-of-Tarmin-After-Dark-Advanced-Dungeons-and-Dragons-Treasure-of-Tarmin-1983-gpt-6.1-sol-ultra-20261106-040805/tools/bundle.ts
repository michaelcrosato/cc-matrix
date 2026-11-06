import path from "node:path";
const root = process.cwd();
const aliases = {
	three: path.join(root, "vendor/three/three.webgpu.min.js"),
	"three/webgpu": path.join(root, "vendor/three/three.webgpu.min.js"),
	"three/tsl": path.join(root, "vendor/three/three.tsl.min.js"),
	"@dimforge/rapier3d-simd-compat": path.join(root, "vendor/rapier/rapier.js"),
};
const result = await Bun.build({
	entrypoints: [process.env.BUNDLE_ENTRY || "src/main.js"],
	outdir: "build",
	naming: "game.js",
	target: "browser",
	format: "iife",
	minify: true,
	plugins: [
		{
			name: "pinned-dependencies",
			setup(b) {
				b.onResolve(
					{ filter: /^(three($|\/)|@dimforge\/rapier3d-simd-compat$)/ },
					(args) => ({ path: aliases[args.path] }),
				);
			},
		},
	],
});
if (!result.success) {
	for (const x of result.logs) console.error(x);
	process.exit(1);
}
