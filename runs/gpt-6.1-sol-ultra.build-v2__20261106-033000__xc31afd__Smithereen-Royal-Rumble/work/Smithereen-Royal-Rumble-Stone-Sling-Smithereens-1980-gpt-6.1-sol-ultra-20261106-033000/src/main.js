import {
	createWorld,
	command,
	step,
	finish,
	resetCastles,
	DEFAULTS,
	DT,
	health,
	planShot,
} from "./sim.js";
import { COURTS, RIVALS } from "./content.js";
import { load, save } from "./persistence.js";
import { createView } from "./view.js";
import { createAudio } from "./audio.js";
import { createUI } from "./ui.js";
import { createInput } from "./input.js";
import { connectOnline } from "./online.js";
import metadata from "../metadata.json" with { type: "json" };
export function createRuntime(options = {}) {
	const E = globalThis.My3D2dge;
	const headless = !!options.headless;
	const hosted = !!globalThis.AIHub?.active && !headless;
	const initial = load(options.storage);
	const game = new E.Game({
		canvas: "screen",
		res: [640, 360],
		expand: true,
		view: "side",
		input: {},
		menu: false,
		corner: false,
		autoPause: false,
		backGesture: false,
		fullscreen: false,
		live: true,
		headless,
		draw: headless ? !!options.draw : undefined,
		loop: options.loop === false ? false : undefined,
		id: "smithereen-royal-rumble",
	});
	game.settings.set("touch", "off");
	game.input.touchFilter = () => false;
	game.input.touchEnabled = false;
	game.input.touchButtons([]);
	game.settings.set("glyphs", "playstation");
	game.settings.set("music", 0.1);
	game.cam.smooth = 0;
	game.fadeTime = 0;
	const app = {
		game,
		metadata,
		world: createWorld({ mode: "title", court: 4 }),
		screen: hosted ? "play" : "title",
		mode: hosted ? "hub" : "title",
		hubSeat: null,
		focus: 0,
		menu: [],
		settings: initial.settings,
		savedTour: initial.tour,
		tour: null,
		idle: 0,
		device: "keyboard",
		caption: "",
		captionUntil: 0,
		online: null,
		hubEnded: false,
		dev: {
			speed: 1,
			step: false,
			paused: false,
			collision: false,
			support: false,
			prediction: false,
			invulnerable: false,
		},
		lesson: null,
		teachingSkipped: false,
		_accounted: null,
		_resultAt: null,
		_lastEvent: 0,
		_attractStage: 0,
		_attractSince: 0,
		_tourHistory: [],
		_headless: headless,
		storage: options.storage,
	};
	app.message = (text, seconds = 4) => {
		app.caption = String(text);
		app.captionUntil = game.real + seconds;
	};
	app.saveSettings = () => {
		save(app.settings, app.savedTour, app.storage);
		app.audio?.setVolumes(app.settings);
		game.settings.set(
			"glyphs",
			app.settings.glyphs === "Xbox" ? "xbox" : "playstation",
		);
		game.settings.set("reduceMotion", app.settings.reducedMotion);
	};
	app.setScreen = (name) => {
		if (app.hubEnded) return;
		app.screen = name;
		app.focus = 0;
		app.idle = 0;
		app.ui?.refresh();
	};
	app.command = (seat, c) => {
		if (app.hubEnded) return false;
		if (app.mode === "hub") return app.online?.command(seat, c) || false;
		if (app.screen !== "play" && app.mode !== "attract") return false;
		return command(app.world, seat, c);
	};
	const cancelAll = () => {
		app.input?.clear();
		for (let s = 0; s < 2; s++) {
			if (app.mode === "hub") app.online?.command(s, { type: "cancel" });
			else command(app.world, s, { type: "cancel" });
		}
	};
	app.title = () => {
		if (app.mode === "hub") return;
		const returning = app.mode === "attract" ? app._attractReturn : null;
		cancelAll();
		app.audio?.stop();
		app.view?.clear();
		app.mode = "title";
		app.world = createWorld({ court: 4, mode: "title" });
		app.caption = "";
		app.idle = 0;
		app.dev.speed = 1;
		app.dev.paused = false;
		app.tour = null;
		app.setScreen(returning?.screen || "title");
		if (returning) {
			app.focus = returning.focus;
			app.ui?.refresh();
		}
		app._attractReturn = null;
		app._lastEvent = 0;
	};
	app.start = (mode = "quick", o = {}) => {
		if (app.mode === "hub" && !o.hosted) return;
		cancelAll();
		app.audio?.stop();
		app.view?.clear();
		app.game.paused = false;
		if (mode !== "solo" && !(mode === "local" && o.war)) app.tour = null;
		app.mode = mode;
		app.hubEnded = false;
		app.dev = {
			...app.dev,
			speed: 1,
			step: false,
			paused: false,
			invulnerable: false,
		};
		let bout = Number(o.bout) || 1,
			court = Number(o.court) || 0,
			seed = Number(o.seed) || Math.floor(Math.random() * 2147483646) + 1;
		if (mode === "solo") {
			if (o.resume && app.savedTour) {
				app.tour = JSON.parse(JSON.stringify(app.savedTour));
				bout = app.tour.next;
				seed = app.tour.seed;
			} else if (o.continue && app.tour) {
				bout = app.tour.next;
				seed = app.tour.seed;
			} else {
				app.tour = { next: bout, totals: [0, 0], seed, cheated: false };
				app._tourHistory = [];
			}
			court = Math.floor((bout - 1) / 2);
		} else if (mode === "local" && o.war) {
			if (o.continue && app.tour) {
				bout = app.tour.next;
				seed = app.tour.seed;
			} else
				app.tour = {
					next: bout,
					totals: [0, 0],
					seed,
					local: true,
					cheated: false,
				};
			court = Math.floor((bout - 1) / 2);
		}
		const ai =
			mode === "local"
				? [null, null]
				: mode === "attract"
					? [
							{ style: "mason", reaction: 0.5, error: 0.005 },
							{ style: "harasser", reaction: 1.15, error: 0.02 },
						]
					: [
							null,
							mode === "solo"
								? RIVALS[bout - 1]
								: String(o.difficulty).toLowerCase() === "easy"
									? { style: "mason", reaction: 2.2, error: 0.06 }
									: String(o.difficulty).toLowerCase() === "hard"
										? { style: "adaptive", reaction: 0.9, error: 0.018 }
										: { style: "adaptive", reaction: 1.5, error: 0.035 },
						];
		const config = { ...DEFAULTS, chargeTime: app.settings.tension };
		config.assist = app.settings.touchAssist || 0;
		app.world = createWorld({
			mode,
			court,
			bout,
			seed: seed + bout * 7919,
			ai,
			config,
			available:
				mode === "solo" && bout <= 2
					? [0]
					: mode === "solo" && bout <= 4
						? [0, 1]
						: [0, 1, 2],
		});
		app.war = mode === "local" && !!app.tour;
		app._options = { ...o, court, bout, seed, war: app.war };
		app._accounted = null;
		app._resultAt = null;
		app._lastEvent = 0;
		app.lesson =
			((mode === "solo" && bout === 1 && o.teaching !== false) ||
				o.teaching === true) &&
			!app.teachingSkipped
				? { phase: 0 }
				: null;
		app.setScreen("play");
		if (mode === "solo") {
			app.savedTour = { ...app.tour };
			save(app.settings, app.savedTour, app.storage);
			app.message(
				RIVALS[bout - 1].name + ": “" + RIVALS[bout - 1].boast + "”",
				4,
			);
		} else if (mode === "attract") {
			app._attractSince = game.real;
			app._attractStage = 0;
			app.world.limit = 40;
			app.message("EXHIBITION • Any input returns to the court menu", 100);
		} else app.message(COURTS[court].subtitle, 3);
	};
	app.pause = () => {
		if (app.hubEnded || app.mode === "attract") return;
		if (app.screen === "play") {
			cancelAll();
			app.setScreen("pause");
			app.message(
				app.mode === "hub"
					? "The shared court keeps playing."
					: "A brief sporting intermission.",
			);
		} else app.ui?.back();
	};
	app.resume = () => {
		if (app.hubEnded) return;
		cancelAll();
		app.game.paused = false;
		app.setScreen("play");
	};
	app.advance = () => {
		if (app.mode === "hub" || !app.world.outcome) return;
		if (app.tour) {
			if (app.tour.next > 10) {
				app.setScreen("championship");
				return;
			}
			const mode = app.mode;
			app.start(mode, {
				...app._options,
				continue: true,
				bout: app.tour.next,
				war: mode === "local",
			});
		} else app.start(app.mode, { ...app._options, seed: undefined });
	};
	app.restart = () => {
		if (app.mode === "hub") return;
		const t = app.tour;
		const prior = app._options;
		app.start(app.mode, { ...prior, continue: !!t, bout: app.world.bout });
		if (t) {
			app.tour = t;
			app.tour.next = app.world.bout;
			app.world.cheated = true;
			app.tour.cheated = true;
		}
	};
	app.restore = () => {
		if (app.mode === "hub") return;
		resetCastles(app.world);
		app.world.phase = "play";
		app.world.outcome = null;
		app._accounted = null;
		app._resultAt = null;
	};
	app.forceResult = (winner) => {
		if (app.mode === "hub") return;
		app.world.cheated = true;
		finish(app.world, winner, "forfeit");
	};
	app.resetTuning = () => {
		if (app.mode === "hub") return;
		const w = app.world;
		const oldScale = w.config.healthScale;
		for (const b of w.blocks)
			if (!b.foundation) {
				const fraction = b.hp / b.maxHp;
				b.maxHp = b.maxHp / oldScale;
				b.hp = b.maxHp * fraction;
			}
		w.maxHealth = [0, 1].map((seat) =>
			w.blocks
				.filter((b) => b.seat === seat && !b.foundation)
				.reduce((n, b) => n + b.maxHp, 0),
		);
		w.config = { ...DEFAULTS, chargeTime: app.settings.tension };
		w.cheated = true;
	};
	app.skipTeaching = () => {
		app.teachingSkipped = true;
		app.lesson = null;
		app.message("Lesson skipped. Lower their skyline!");
	};
	app.playLesson = () => {
		app.teachingSkipped = false;
		app.start("quick", {
			court: 0,
			difficulty: "easy",
			teaching: true,
			seed: 88417,
		});
	};
	app.snapshot = () => ({
		screen: app.screen,
		mode: app.mode,
		world: {
			tick: app.world.tick,
			time: app.world.time,
			court: app.world.court,
			bout: app.world.bout,
			phase: app.world.phase,
			health: [health(app.world, 0), health(app.world, 1)],
			scores: app.world.players.map((p) => p.score),
			shots: app.world.stats.shots,
			outcome: app.world.outcome,
		},
		tour: app.tour,
		lesson: app.lesson,
		device: app.device,
		errors: game.errors,
		online: app.online?.diagnostics(),
	});
	app.update = (dt) => {
		if (app.hubEnded) {
			app.audio?.stop();
			return;
		}
		app.input?.update(dt);
		if (app.mode === "hub") {
			app.online?.update(dt);
		} else if (app.mode === "attract") {
			if (app.world.phase === "play") step(app.world, dt);
			const age = game.real - app._attractSince;
			const p = app.world.players[0];
			if (age > 8 && age < 17 && app._attractStage === 0) {
				command(app.world, 0, { type: "cancel" });
				p.ai = {
					style: "broad",
					reaction: 0.5,
					error: 0,
					next: app.world.time + 0.2,
				};
				app.world.available = [2];
				app._attractStage = 1;
			}
			if (age > 17 && app._attractStage === 1) {
				app.world.available = [0, 1, 2];
				p.ai = {
					style: "harasser",
					reaction: 0.5,
					error: 0,
					next: app.world.time + 0.2,
				};
				app._attractStage = 2;
			}
			if (app.world.phase === "over" && age > 6) {
				if (!app._resultAt) app._resultAt = game.real;
				if (game.real - app._resultAt > 3) {
					app._attractHistory ||= [];
					app._attractHistory.push({
						court: app.world.court,
						stats: JSON.parse(JSON.stringify(app.world.stats)),
						outcome: app.world.outcome,
					});
					if (app._attractHistory.length > 8) app._attractHistory.shift();
					app._attractLoopCourt = (1 + (app._attractLoopCourt || 0)) % 2;
					const court = app._attractLoopCourt ? 3 : 0;
					app.start("attract", { court, seed: 88417 + court });
				}
			}
			if (age >= 95 && app.world.phase === "play")
				finish(
					app.world,
					health(app.world, 0) >= health(app.world, 1) ? 0 : 1,
					"time",
				);
		} else if (app.screen === "play" && app.world.phase === "play") {
			app.world.invulnerable = !!app.dev.invulnerable;
			if (!app.dev.paused || app.dev.step) {
				app._speedCarry =
					(app._speedCarry || 0) +
					(app.dev.step ? 1 : Math.max(0.1, app.dev.speed || 1));
				const count = Math.floor(app._speedCarry + 1e-8);
				app._speedCarry -= count;
				for (let i = 0; i < count && app.world.phase === "play"; i++)
					step(app.world, DT);
				app.dev.step = false;
			}
		} else if (
			app.dev.step &&
			app.mode !== "title" &&
			app.world.phase === "play"
		) {
			step(app.world, DT);
			app.dev.step = false;
		}
		if (app.lesson && app.mode !== "hub") {
			if (app.lesson.phase === 0 && app.world.stats.shots[0] > 0) {
				app.lesson.phase = 1;
				app.message(
					"A fine fling! Land an actual hit on the opposing castle.",
					6,
				);
			}
			if (
				app.lesson.phase < 2 &&
				app.world.events.some(
					(e) => e.type === "impact" && e.seat === 0 && e.target === "block",
				)
			) {
				app.lesson.phase = 2;
				app.message(
					"A sporting hit! Follow the changing silhouette. The last pennant remembers your range.",
					6,
				);
			}
		}
		if (
			app.mode !== "hub" &&
			app.mode !== "attract" &&
			app.mode !== "title" &&
			app.world.phase === "over"
		) {
			if (app._accounted !== app.world) {
				app._accounted = app.world;
				app._resultAt = game.real;
				cancelAll();
				if (app.tour) {
					const out = app.world.outcome;
					app.tour.totals = app.tour.totals.map((n, s) => n + out.banked[s]);
					app.tour.next = app.world.bout + 1;
					app.tour.cheated ||= app.world.cheated;
					app._tourHistory.push({
						bout: app.world.bout,
						court: app.world.court,
						...out,
						stats: JSON.parse(JSON.stringify(app.world.stats)),
					});
					if (app.mode === "solo") {
						app.savedTour =
							app.tour.next <= 10 ? JSON.parse(JSON.stringify(app.tour)) : null;
						save(app.settings, app.savedTour, app.storage);
					}
				}
			}
			if (app.screen === "play" && game.real - app._resultAt >= 1.7)
				app.setScreen("result");
		}
		if (
			[
				"title",
				"setup",
				"settings",
				"controls",
				"about",
				"restart-tour",
			].includes(app.screen) &&
			app.mode === "title" &&
			!app.online
		) {
			app.idle += dt;
			if (app.idle >= 10 - 1e-8) {
				app._attractReturn = { screen: app.screen, focus: app.focus };
				app._attractLoopCourt = 0;
				app._attractHistory = [];
				app.start("attract", { court: 0, seed: 88417 });
			}
		}
		if (
			app.captionUntil &&
			game.real > app.captionUntil &&
			app.mode !== "attract"
		)
			app.caption = "";
		if (
			app.lesson &&
			app.lesson.phase < 2 &&
			!app.caption &&
			app.screen === "play"
		) {
			const fire =
				app.device === "pad"
					? app.settings.glyphs === "Xbox"
						? "A"
						: "Cross"
					: app.device === "touch"
						? "your friendly half"
						: app.device === "mouse"
							? "left mouse"
							: app.settings.fire1.replace("Key", "");
			app.message(
				app.lesson.phase === 0
					? "Hold " +
							fire +
							" to wind. Release to throw. Watch the landing diamond."
					: "Hit the opposing castle. Try a different tension; the LAST marker remembers.",
				8,
			);
		}
		app.view?.update(dt, app);
		app.audio?.update(dt, app);
		app.ui?.update(dt);
	};
	if (!headless) {
		app.view = createView(E, game);
		app.audio = createAudio(E, game);
		app.ui = createUI(E, game, app);
		app.input = createInput(E, game, app, app.ui, app.view);
		app.saveSettings();
	}
	game.debug = { snapshot: app.snapshot };
	game.start({
		scene: "rumble",
		scenes: {
			rumble: {
				view: "side",
				res: [640, 360],
				expand: true,
				pausable: false,
				camera: { zoom: false },
				update: app.update,
				draw(r) {
					app.view?.draw(r, app);
					app.ui?.draw(r);
				},
			},
		},
	});
	app.dispose = () => {
		app.online?.dispose();
		app.input?.dispose();
		app.audio?.stop();
		app.ui?.dispose?.();
		game.dispose();
	};
	return app;
}
export async function boot() {
	const app = createRuntime();
	globalThis.__rumble = app;
	globalThis.__game = { game: app.game };
	if (globalThis.AIHub?.active) {
		app.online = await connectOnline(app);
		if (!app.online) {
			app.mode = "title";
			app.title();
		}
	} else app.title();
	app.ui?.refresh();
	return app;
}
if (typeof document !== "undefined")
	boot().catch((error) => {
		console.error(error);
		const el = document.getElementById("boot-error");
		if (el) {
			el.hidden = false;
			el.textContent = "The court could not open: " + error.message;
		}
	});
