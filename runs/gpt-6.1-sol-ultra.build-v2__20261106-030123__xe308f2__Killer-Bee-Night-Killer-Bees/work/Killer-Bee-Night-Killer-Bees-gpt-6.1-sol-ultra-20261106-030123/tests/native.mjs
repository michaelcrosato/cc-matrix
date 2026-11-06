import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(import.meta.dirname, "..");
export function runNativeTests() {
	const warnings = [],
		ctx = vm.createContext({
			console: {
				log() {},
				warn(...args) {
					warnings.push(args.join(" "));
				},
				error() {},
			},
			performance,
		});
	for (const f of [
		"vendor/engine/my-3d2dge.js",
		"content/stages.js",
		"src/sim.js",
		"src/render.js",
	])
		vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx, {
			filename: f,
		});
	const E = ctx.My3D2dge,
		S = ctx.NightSim,
		results = [];
	const check = (name, pass, detail = "") =>
		results.push({ name, pass: !!pass, detail });
	const game = new E.Game({
		headless: true,
		draw: true,
		view: "overhead",
		views: ["overhead"],
		minW: 512,
		minH: 360,
		maxW: 1000,
		maxH: 1600,
		menu: false,
		loop: false,
	});
	const painter = new ctx.NightPaint.Painter(game);
	const world = S.create({ seed: 42 });
	const visited = new Set();
	let drawn = 0;
	game.start({
		update(dt) {
			painter.fit();
			S.step(
				world,
				world.players.map((p) => S.bot(world, p.id)),
				dt,
			);
			painter.update(world, dt);
			if (world.phase === "result") {
				visited.add(world.stage);
				S.next(world);
				painter.reset();
			}
			if (world.phase === "won") visited.add(world.stage);
		},
		draw(r) {
			painter.world(r, world, { inspect: true, labels: true });
			painter.hud(r, world);
			drawn++;
		},
	});
	for (
		let i = 0;
		i < 600 && world.phase !== "won" && world.phase !== "failed";
		i++
	) {
		game.advance(1, { draw: false });
		if (i % 13 === 0) game.advance(0, { draw: true });
	}
	game.advance(0, { draw: true });
	check(
		"native exact 120Hz campaign reaches ending",
		world.phase === "won" && visited.size === 6,
		`${world.phase} / ${world.time}`,
	);
	check(
		"native headless drawing covers campaign without errors",
		game.errors.length === 0 && drawn > 20,
		JSON.stringify(game.errors),
	);
	check(
		"native overhead camera contains all four arena corners",
		[
			[0, 0],
			[384, 0],
			[0, 240],
			[384, 240],
		].every(([x, y]) => {
			const [sx, sy] = game.r.w(x, y, 0);
			return sx >= 0 && sx <= game.W && sy >= 48 && sy <= game.H - 20;
		}),
	);
	const timings = world.time;
	check(
		"native bot run has no assistance",
		!world.assisted && timings > 540 && timings < 800,
	);
	check(
		"native custom anatomy extends Blob animation foundation",
		painter.hero instanceof E.Blob && painter.gardeners.size > 0,
	);
	game.dispose();
	return {
		checks: results.length,
		passed: results.filter((t) => t.pass).length,
		failed: results.filter((t) => !t.pass).length,
		results,
		warnings,
		campaign: {
			phase: world.phase,
			time: world.time,
			score: world.score,
			stats: world.stats,
		},
	};
}
if (process.argv[1] === new URL(import.meta.url).pathname) {
	const r = runNativeTests();
	fs.writeFileSync(
		path.join(root, "evidence/native-results.json"),
		JSON.stringify(r, null, 2),
	);
	for (const t of r.results)
		if (!t.pass) console.error(`FAIL ${t.name}: ${t.detail}`);
	console.log(`${r.passed}/${r.checks} native engine checks passed`);
	process.exitCode = r.failed ? 1 : 0;
}
