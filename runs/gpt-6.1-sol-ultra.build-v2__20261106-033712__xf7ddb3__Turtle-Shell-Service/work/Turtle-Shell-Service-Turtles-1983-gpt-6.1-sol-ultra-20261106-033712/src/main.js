(() => {
	"use strict";
	const E = My3D2dge,
		T = globalThis.TSS,
		{ px } = E;
	async function boot() {
		const info = await AIHub.connect({ mode: "shared-world", seats: [1, 2] });
		const app = {
			net: null,
			sim: null,
			demo: false,
			localStyle: "solo",
			lastResult: false,
			status: "",
			statusUntil: 0,
			introFloor: -1,
			lastMeaningful: 0,
			eventsSeen: new Set(),
		};
		const game = (app.game = new E.Game({
			id: "turtle-shell-service-v1",
			canvas: "screen",
			view: "overhead",
			views: ["overhead"],
			res: [400, 270],
			expand: true,
			bg: "#111f29",
			input: T.INPUT,
			live: !!info,
			autoPause: !info,
			fullscreen: "button",
			menu: {
				quit: info ? false : "title",
				settings: [
					{ key: "music", value: 0.1 },
					{ key: "glyphs", value: "playstation" },
					{
						key: "voice",
						label: "Little voices",
						group: "Sound",
						type: "slider",
						value: 0.7,
						min: 0,
						max: 1,
						step: 0.05,
						apply: (g, v) => {
							g.audio.voiceVolume = v;
							g.audio.applyVolume();
						},
					},
					{
						key: "touchAssist",
						label: "Touch auto-defence",
						value: true,
						help: "Plant an available bomb before imminent contact on touch. Assisted records are separate.",
					},
				],
				controls: { bomb: "Bug bomb", route: "Click to walk" },
			},
		}));
		game.fadeTime = 0.12;
		game.cam.smooth = 0;
		game.cam.bounds = null;
		game.lights.enabled = false;
		app.controls = new T.Controls(game);
		app.sound = new T.Sound(game);
		app.art = new T.Art(game);
		app.sim = new T.Simulation({ seed: 47, seats: [1] });
		app.ui = new T.UI(app);
		const arcade = (app.arcade = new E.Arcade(game, {
			id: "turtle-shell-service",
			idle: 10,
			demo: 99999,
			hud: false,
		}));
		const signal = game._abort?.signal;
		const wake = () => {
			app.lastMeaningful = game.real;
			arcade.wake();
		};
		const consume = () => {
			for (const I of game.players) I.clear();
			app.controls.routes = {};
		};
		const meaningful = (event) => {
			if (
				event.type === "keydown" &&
				(event.repeat ||
					["Shift", "Control", "Alt", "Meta"].includes(event.key))
			)
				return;
			if (event.type === "pointermove") {
				if (event.pointerType !== "mouse") return;
				const old = app.pointer || [event.clientX, event.clientY];
				app.pointer = [event.clientX, event.clientY];
				if (Math.hypot(old[0] - event.clientX, old[1] - event.clientY) < 4)
					return;
			}
			if (event.type === "keydown") game.input.lastDevice = "keyboard";
			else if (event.pointerType === "touch") game.input.lastDevice = "touch";
			else if (event.pointerType === "mouse" || event.type === "wheel")
				game.input.lastDevice = "mouse";
			wake();
			if (app.demo) {
				event.preventDefault();
				event.stopImmediatePropagation();
				app.toTitle();
				consume();
			}
		};
		for (const name of ["keydown", "pointerdown", "pointermove", "wheel"])
			addEventListener(name, meaningful, {
				capture: true,
				passive: false,
				signal,
			});
		game.hook("input", (dt) => {
			app.controls.refreshAssignments?.();
			if (app.wakeGuard) {
				let heldPad = false;
				try {
					heldPad = Array.from(navigator.getGamepads?.() || []).some(
						(p) =>
							p?.connected !== false &&
							p &&
							(p.buttons.some((b) => b.pressed) ||
								p.axes.some((a) => Math.abs(a) > 0.35)),
					);
				} catch (_) {}
				for (const I of game.players) {
					I.consumeAll();
					for (const action in I.map) I.suppress(action);
				}
				wake();
				if (!heldPad) app.wakeGuard = false;
				return;
			}
			if (game.players.some((I) => I.anyPressed())) {
				wake();
				if (app.demo) {
					app.toTitle();
					consume();
				}
			}
			if (
				game.sceneName === "title" &&
				!app.net &&
				app.ui.shell.screen === "title"
			) {
				if (arcade.attract(dt) === "demo") app.start("solo", true);
			}
		});
		app.events = (events) => {
			const fresh = (events || []).filter((event) => {
				if (app.eventsSeen.has(event.id)) return false;
				app.eventsSeen.add(event.id);
				return true;
			});
			app.sound.events(fresh);
			app.art.update(0, app.sim, fresh, { reducedMotion: game.reduceMotion });
			for (const event of fresh) {
				const kind = event.kind || event.type;
				if (kind === "pickup") {
					app.status =
						"A little passenger! Follow the matching " +
						({ "★": "star", "♥": "heart", "◆": "diamond", "●": "circle" }[
							event.symbol
						] || "symbol") +
						" home.";
					app.statusUntil = game.real + 4;
				} else if (kind === "deliver") {
					app.status = [
						"One happy homecoming!",
						"A tiny guest. A grand reunion.",
						"Safe and snug. Next little guest!",
					][event.total % 3];
					app.statusUntil = game.real + 2.3;
				} else if (kind === "empty") {
					app.status = "Empty! The central + supply bell has more.";
					app.statusUntil = game.real + 3;
				} else if (kind === "active") {
					app.status =
						"One team bomb at a time. The planted one is still active.";
					app.statusUntil = game.real + 2;
				} else if (kind === "hit") {
					app.status = "Shell-shocked! Your passenger is waiting in its room.";
					app.statusUntil = game.real + 3.5;
					app.controls.routes = {};
				} else if (kind === "supply") {
					app.status = "+2 bug bombs. A little room to breathe.";
					app.statusUntil = game.real + 2;
				} else if (kind === "floor") {
					app.statusUntil = 0;
					app.controls.routes = {};
				} else if (kind === "leave") {
					app.status = "Your partner checked out. You can finish the rescue.";
					app.statusUntil = game.real + 5;
				}
			}
			if (app.eventsSeen.size > 1500)
				app.eventsSeen = new Set([...app.eventsSeen].slice(-500));
		};
		app.start = (style = "solo", demo = false) => {
			if (app.net) return;
			app.ui.shell.hide();
			game.resume();
			app.localStyle = style;
			app.demo = demo;
			app.demoEnd = 0;
			app.titlePending = false;
			app.lastResult = false;
			app.statusUntil = 0;
			app.introFloor = -1;
			app.eventsSeen.clear();
			app.sound.flush();
			app.controls.configure(style);
			app.sim = new T.Simulation({
				seed: 47,
				seats: style === "solo" ? [1] : [1, 2],
				demo,
				runId: (demo ? "demo-" : "local-") + Date.now().toString(36),
			});
			app.bot = demo ? new T.Bot(app.sim) : null;
			app.ui.syncDev();
			app.sound.music("play");
			game.timeScale = 1;
			consume();
			game.go("play", null, { fade: 0 });
		};
		app.toTitle = () => {
			if (app.net) return;
			app.demo = false;
			app.demoEnd = 0;
			app.titlePending = true;
			app.wakeGuard = true;
			app.lastResult = false;
			app.ui.shell.hide();
			game.resume();
			app.controls.configure("solo");
			app.sound.flush();
			app.eventsSeen.clear();
			app.statusUntil = 0;
			wake();
			app.sound.music("title");
			game.go("title", null, { fade: 0 });
			consume();
		};
		const camera = () => {
			const f = T.FLOORS[app.sim.state.floor],
				W = game.W,
				H = game.H,
				tall = H > W * 1.15;
			const z = Math.min(
				(W - 28) / (f.rows[0].length * 16),
				(H - 96) / (f.rows.length * 16),
				tall ? 1.1 : 1.2,
			);
			if (Math.abs(game.zoom - z) > 0.015) game.setZoom(z);
			game.cam.offset = [0, tall ? -H * 0.16 : -10];
			game.focus(f.rows[0].length * 8, f.rows.length * 8, 0);
		};
		const update = (dt) => {
			if (app.net?.ended || app.titlePending) return;
			let intents;
			if (app.net) {
				intents = app.controls.read(app.net.sim, app.net.localSeat);
				app.net.update(
					dt,
					app.net.localSeat === null ? null : intents[app.net.localSeat],
				);
				app.sim = app.net.sim;
			} else {
				intents = app.demo ? app.bot.intents() : app.controls.read(app.sim);
				app.sim.step(dt * (app.sim.state.dev.timeScale || 1), intents);
				app.events(app.sim.events);
			}
			const s = app.sim.state;
			app.art.update(dt, app.net ? app.net.snapshot() : app.sim, [], {
				reducedMotion: game.reduceMotion,
			});
			app.sound.update(s);
			camera();
			if (s.phase === "won" || s.phase === "lost") {
				if (app.demo) {
					app.demoEnd = (app.demoEnd || 0) + dt;
					if (app.demoEnd > 4) {
						app.demoEnd = 0;
						app.start("solo", true);
					}
				} else if (!app.net && !app.lastResult) {
					app.lastResult = true;
					app.sound.music("");
					app.ui.result();
				} else if (!app.net && app.lastResult && !app.ui.shell.screen)
					app.toTitle();
			}
		};
		const text = (g, str, x, y, color = "#fff0d0", scale = 1, align = "left") =>
			E.font.text(g, str, x, y, color, {
				scale,
				align,
				outline: false,
				shadow: "#081c23",
			});
		const hud = (r) => {
			const s = app.sim.state,
				f = T.FLOORS[s.floor],
				W = r.W,
				H = r.H,
				tall = H > W * 1.15;
			r.overlay((g) => {
				const pad = 10,
					usable = W - 2 * pad;
				const header = tall ? 84 : 35;
				px.rect(g, 0, 0, W, header, "#10272c");
				px.rect(g, 0, header - 1, W, 1, "#526456");
				text(
					g,
					"FLOOR " + (s.floor + 1) + " / 5",
					pad,
					tall ? 9 : 6,
					"#9abeb1",
				);
				text(g, f.name, pad, tall ? 26 : 19, "#f7da9f", tall ? 2 : 1);
				const a = tall ? pad : pad + usable * 0.32,
					b = pad + usable * (tall ? 0.36 : 0.56),
					c = pad + usable * (tall ? 0.69 : 0.79),
					labelY = tall ? 53 : 5,
					valueY = tall ? 66 : 17;
				text(g, "GUESTS HOME", a, labelY, "#9abeb1");
				text(g, s.rescued + "/" + f.quota, a, valueY, "#fff0d0", 2);
				text(g, "TEAM LIVES", b, labelY, "#9abeb1");
				text(
					g,
					"♥".repeat(s.lives) + "·".repeat(3 - s.lives),
					b,
					valueY,
					"#efab9e",
					2,
				);
				text(g, "SCORE", c, labelY, "#9abeb1");
				text(
					g,
					String(s.score).padStart(5, "0"),
					c,
					valueY + (tall ? 0 : 1),
					"#f8d189",
					tall ? 2 : 1,
				);
				const foot = tall ? 46 : 32;
				px.rect(g, 0, H - foot, W, foot, "#10272c");
				px.rect(g, 0, H - foot, W, 1, "#526456");
				text(
					g,
					s.bomb ? "BOMB ACTIVE" : "BUG BOMBS " + s.stock + "/5",
					pad,
					H - (tall ? 34 : 24),
					s.bomb ? "#efbb8c" : "#b7d5a1",
					tall ? 2 : 1,
				);
				const tag = app.demo
					? "DEMO · PRESS ANY BUTTON"
					: app.net
						? "AI HUB · CO-OP"
						: s.practice
							? "PRACTICE"
							: s.assisted
								? "TOUCH ASSIST"
								: app.localStyle === "solo"
									? "SOLO SHIFT"
									: "CO-OP SHIFT";
				text(g, tag, W - pad, H - (tall ? 16 : 24), "#f1cf91", 1, "right");
				if (!tall || game.input.lastDevice !== "touch")
					text(g, app.controls.prompt(), W / 2, H - 11, "#a9c0b5", 1, "center");
				let guide = app.statusUntil > game.real ? app.status : "";
				const p = s.players.find(
					(p) => p.seat === (app.net?.localSeat || 1) && p.active,
				);
				if (!guide && p?.carry) {
					const home = s.homes.find((h) => h.id === p.home);
					guide =
						"Passenger aboard · find the " +
						({ "★": "star", "♥": "heart", "◆": "diamond", "●": "circle" }[
							home.symbol
						] || "matching") +
						" home";
				}
				if (!guide && s.floorTime < 12)
					guide =
						f.tutorial?.[0] ||
						f.cues?.[0] ||
						"Walk into a ? room. A little guest needs a lift!";
				if (guide && s.phase === "play") {
					const y = tall ? r.w(0, f.rows.length * 16)[1] + 22 : H - 48;
					if (tall) {
						const lines = E.font.wrap(guide, W - 36, { scale: 2 });
						px.rect(g, 10, y - 7, W - 20, lines.length * 20 + 14, "#10272c");
						E.font.text(g, guide, W / 2, y, "#f6dfad", {
							scale: 2,
							align: "center",
							wrap: W - 36,
							outline: false,
							shadow: "#081c23",
						});
					} else {
						px.rect(g, 6, y - 3, W - 12, 14, "#10272c");
						text(g, guide, W / 2, y, "#f6dfad", 1, "center");
					}
				}
				if (
					tall &&
					s.phase === "play" &&
					game.input.lastDevice === "touch" &&
					s.floorTime < 15
				)
					text(
						g,
						"Drag anywhere to move",
						W / 2,
						H - 120,
						"#829e92",
						2,
						"center",
					);
				if (app.net && !app.net.playing && !app.net.finished) {
					const time = AIHub.time(),
						label = !Number.isFinite(time)
							? "WAITING FOR THE BELL"
							: time < 0
								? "CHECKING IN · " + Math.max(1, Math.ceil(-time / 1000))
								: "CONNECTING THE HOTEL";
					panel(g, W, H, "AI HUB CO-OP", label, "Your shift begins together.");
				} else if (s.phase === "intro")
					panel(
						g,
						W,
						H,
						"FLOOR " + (s.floor + 1) + " · " + f.quota + " LITTLE GUESTS",
						f.name,
						f.subtitle ||
							f.lesson ||
							f.tagline ||
							"Everybody deserves a warm welcome.",
					);
				else if (s.phase === "transition")
					panel(
						g,
						W,
						H,
						"ALL GUESTS SAFE · +" + (250 + s.floor * 50),
						"Going up!",
						"Next stop: " + T.FLOORS[Math.min(s.floor + 1, 4)].name,
					);
				if (s.phase === "celebrate") {
					text(
						g,
						"EVERY LITTLE GUEST, HOME.",
						W / 2,
						47,
						"#ffdf92",
						2,
						"center",
					);
					text(
						g,
						"26 rescues. One very happy hotel.",
						W / 2,
						68,
						"#e4e9ca",
						1,
						"center",
					);
				}
				if (app.net?.ended)
					panel(
						g,
						W,
						H,
						"AI HUB",
						"The shift is over.",
						"Results and the next round are in AI Hub.",
					);
			});
		};
		function panel(g, W, H, kicker, heading, body) {
			const width = Math.min(W - 28, 370),
				x = (W - width) / 2,
				y = H / 2 - 36;
			E.ui.box(g, x, y, width, 76, { bg: "#122c30", border: "#b28f59" });
			text(g, kicker, W / 2, y + 9, "#c6cdb0", 1, "center");
			text(g, heading, W / 2, y + 25, "#ffdfa4", 2, "center");
			text(g, body, W / 2, y + 48, "#d4dfc4", 1, "center");
			text(
				g,
				game.input.lastDevice === "touch"
					? "The doors open in a moment…"
					: game.input.label("confirm") + " to open the doors",
				W / 2,
				y + 63,
				"#9dbab1",
				1,
				"center",
			);
		}
		game.start({
			scene: info ? "play" : "title",
			scenes: {
				title: {
					view: "overhead",
					views: ["overhead"],
					camera: { zoom: false },
					enter() {
						app.titlePending = false;
						game.lights.enabled = false;
						app.ui.title();
						app.sound.music("title");
					},
					update(dt) {
						app.art.update(dt, app.sim, []);
					},
					draw(r) {
						app.art.drawTitle(r, game.real, {
							reducedMotion: game.reduceMotion,
						});
					},
				},
				play: {
					pausable: true,
					view: "overhead",
					views: ["overhead"],
					camera: { zoom: false },
					enter() {
						game.lights.enabled = true;
						game.lights.ambient = 0.9;
					},
					update,
					draw(r) {
						const s = app.net ? app.net.snapshot() : app.sim;
						app.art.draw(r, s, {
							graph: app.sim.state.dev.overlays,
							los: app.sim.state.dev.overlays,
							collision: app.sim.state.dev.overlays,
							reducedMotion: game.reduceMotion,
						});
						hud(r);
					},
				},
			},
		});
		if (info) {
			app.ui.shell.hide();
			app.net = new T.Network({
				hub: AIHub,
				info,
				createSimulation: (opts) => new T.Simulation(opts),
				onEvent: (event) => app.events([event]),
				onStatus: (status) => {
					app.status = status;
					app.statusUntil = game.real + 4;
				},
				onEnd: () => {
					app.sound.stop();
					consume();
				},
			});
			app.sim = app.net.sim;
			game.live = true;
			game.o.autoPause = false;
			app.sound.music("play");
			camera();
			app.net.ready();
		}
		game.debug = {
			snapshot: () => ({
				title: T.IDENTITY.title,
				scene: game.sceneName,
				menu: app.ui.shell.screen,
				demo: app.demo,
				input: game.input.lastDevice,
				controls: app.controls.style,
				...app.sim.snapshot(),
				network: app.net?.inspect() || null,
				errors: game.errors,
			}),
			app,
		};
		globalThis.__TSS = app;
		globalThis.__game = game;
		document.body.dataset.game = T.IDENTITY.slug;
		document.body.dataset.ready = "true";
	}
	boot().catch((error) => {
		console.error(error);
		const e = document.getElementById("boot");
		e.hidden = false;
		e.textContent = "The hotel could not open: " + error.message;
	});
})();
