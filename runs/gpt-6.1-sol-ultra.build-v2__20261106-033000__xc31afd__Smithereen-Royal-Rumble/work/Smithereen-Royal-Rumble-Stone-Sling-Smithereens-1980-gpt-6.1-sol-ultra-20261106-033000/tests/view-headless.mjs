import "../vendor/engine/my-3d2dge.js";
import { createWorld, command, step } from "../src/sim.js";
import { createView } from "../src/view.js";
import { createAudio } from "../src/audio.js";
import { fileURLToPath } from "node:url";
export function runViewHeadlessChecks() {
	let count = 0;
	const failures = [],
		check = (value, message) => {
			count++;
			if (!value) failures.push(message);
		};
	const E = globalThis.My3D2dge,
		game = new E.Game({
			headless: true,
			draw: true,
			loop: false,
			res: [640, 360],
			expand: true,
			view: "side",
			input: {},
			menu: false,
			corner: false,
			autoPause: false,
		});
	const app = {
			world: createWorld(),
			game,
			screen: "play",
			mode: "quick",
			settings: {
				music: 0.1,
				effects: 0.7,
				voice: 0.45,
				reducedMotion: false,
				prediction: true,
				glyphs: "PlayStation",
				fire1: "Space",
			},
			device: "keyboard",
			dev: {},
			caption: "Hold to wind. Release to throw.",
		},
		view = createView(E, game),
		audio = createAudio(E, game);
	try {
		game.start({
			update(dt) {
				step(app.world, dt);
				view.update(dt, app);
				audio.update(dt, app);
			},
			draw: (r) => view.draw(r, app),
		});
		let impacts = 0;
		for (let court = 0; court < 5; court++) {
			app.world = createWorld({ court });
			view.clear();
			game.advance(1 / 30, { draw: true });
			command(app.world, 0, { type: "begin" });
			game.advance(0.8, { draw: true });
			if (court === 0)
				check(
					view.diagnostics().prediction,
					"Native view must predict a real held charge",
				);
			command(app.world, 0, { type: "release" });
			game.advance(3, { draw: true });
			impacts += app.world.events.filter((e) => e.type === "impact").length;
			check(
				game.errors.length === 0,
				`Court ${court + 1} must render its native materials, props, rigs and impact effects without errors`,
			);
		}
		check(
			impacts === 5,
			"Five native render scenarios must each include an actual projectile impact",
		);
		check(
			!game.hitstop,
			"Native impact presentation must preserve simultaneous fixed-step combat without hit-stop",
		);
		check(
			view.diagnostics().rigs === 18,
			"Native view must retain both crews, helpers and the authored spectator rigs",
		);
		app.mode = "local";
		app.world = createWorld({ court: 4 });
		view.clear();
		command(app.world, 0, { type: "begin" });
		command(app.world, 1, { type: "begin" });
		game.advance(0.35, { draw: true });
		check(
			view.diagnostics().predictionSeats.join(",") === "0,1",
			"Both local charges must produce their own native range cue",
		);
		const nativeText = E.font.text,
			labels = [];
		E.font.text = (...args) => {
			labels.push(args[1]);
			return nativeText.apply(E.font, args);
		};
		try {
			Object.assign(app.settings, {
				seat1: "keyboard",
				seat2: "keyboard",
				prev1: "KeyZ",
				next1: "KeyX",
				fire2: "Enter",
				prev2: "KeyN",
				next2: "KeyM",
			});
			game.advance(1 / 120, { draw: true });
			check(
				labels.some((s) => s.includes("Z / X STONE")),
				"Native HUD must render the actual rebound first-seat stone controls",
			);
			check(
				labels.some(
					(s) => s.includes("P2 HOLD Enter") && s.includes("N / M STONE"),
				),
				"Native HUD must show second-seat rebound fire and stone controls",
			);
			labels.length = 0;
			app.device = "pad";
			app.settings.glyphs = "Xbox";
			game.advance(1 / 120, { draw: true });
			check(
				labels.some((s) => s.includes("HOLD A") && s.includes("LB / RB STONE")),
				"Native HUD must use Xbox face and shoulder labels together",
			);
		} finally {
			E.font.text = nativeText;
			app.device = "keyboard";
		}
		// Headless renderer stand-in: use an upright buffer to exercise the same native target inset drawing.
		app.mode = "quick";
		app.world = createWorld({ court: 4 });
		view.clear();
		game.screen.W = 390;
		game.screen.H = 844;
		game.advance(1 / 120, { draw: true });
		const full = view.diagnostics().inset;
		check(
			full?.seat === 1 &&
				full.remaining ===
					app.world.blocks.filter(
						(b) => b.alive && b.seat === 1 && !b.foundation,
					).length,
			"Portrait inset must read actual living enemy blocks",
		);
		const enemy = app.world.blocks.filter((b) => b.seat === 1 && !b.foundation);
		for (const b of enemy) b.alive = b === enemy[0];
		enemy[0].w = 9;
		enemy[0].h = 10;
		app.world.revision++;
		game.advance(1 / 120, { draw: true });
		const remnant = view.diagnostics().inset;
		check(
			remnant?.remaining === 1 && remnant.scale === 3,
			"Tiny surviving geometry must receive the maximum portrait magnification",
		);
		check(
			game.errors.length === 0,
			"Native magnified target sprites must render without errors",
		);
		const diag = audio.diagnostics();
		check(diag.musicGain === 0.1, "Native music bus default must equal 0.10");
		check(
			diag.effectsGain === 0.7 && diag.voiceGain === 0.45,
			"Effects and voice must have separate configured native buses",
		);
		check(
			diag.context === "unavailable" && !diag.unlocked,
			"Headless authority must never require an audio context or user gesture",
		);
	} catch (e) {
		failures.push(e.stack || String(e));
	} finally {
		game.dispose();
	}
	return { count, failures };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const r = runViewHeadlessChecks();
	for (const failure of r.failures) console.error(failure);
	console.log(`${r.count} native view checks, ${r.failures.length} failures`);
	if (r.failures.length) process.exitCode = 1;
}
