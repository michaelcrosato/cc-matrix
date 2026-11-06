import vm from "node:vm";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
export const dev = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const modules = [
	"config",
	"sim",
	"assets",
	"audio",
	"input",
	"bot",
	"net",
	"render",
	"main",
];
export function load() {
	const logs = [];
	const ctx = {
		console: {
			log() {},
			warn(...a) {
				logs.push(a.join(" "));
			},
			error(...a) {
				logs.push(a.join(" "));
			},
		},
		TextEncoder,
		structuredClone,
		performance,
	};
	vm.createContext(ctx);
	vm.runInContext(
		readFileSync(
			resolve(dev, "vendor/engine/dist/handoff/my-3d2dge.js"),
			"utf8",
		),
		ctx,
		{ filename: "engine.js" },
	);
	for (const name of modules)
		vm.runInContext(
			readFileSync(resolve(dev, "src/" + name + ".js"), "utf8"),
			ctx,
			{ filename: name + ".js" },
		);
	return { ctx, F: ctx.Moonriders, E: ctx.My3D2dge, logs };
}
