/* Boot, engine shell, persistence and one run lifecycle. */
(function (root) {
	"use strict";
	const F = root.Moonriders,
		E = root.My3D2dge;
	const makeSeed = () =>
		typeof crypto !== "undefined" && crypto.getRandomValues
			? crypto.getRandomValues(new Uint32Array(1))[0]
			: 61421;
	const fallbackReport = {
		sourceInformation: {
			date: "2026-11-06 02:30:10",
			source: "Freedom Fighters! (1982)",
			plan: "PLAN.md",
			genre: "Arcade rescue shooter",
			perspective: "Side-on horizontal scrolling; x/y flight plane",
			tech: "my-3D2dge 0.89.1; AI Hub client 1.4.0",
			artDirection: "Original code-drawn shaded pixel art",
			animation: "Native sprite clips and continuous part poses",
			audio: "Original code-synthesized music, effects and radio syllables",
			online: "1–2 shared-ship co-op locally and through AI Hub",
			testing: "Headless simulation and browser verification",
			research: "Original manual, screenshots and sampled recording frames",
			environment: "Codex CLI (headless); Linux",
			model: "OpenAI, gpt-6.1-sol, reasoning effort max",
			usage: "added on import",
		},
		testingFeedback: ["unknown", "unknown", "unknown", "unknown"],
		engineFeedback: [
			"unknown",
			"unknown",
			"unknown",
			"unknown",
			"none",
			"unknown",
		],
		promptFeedback: ["unknown", "unknown", "unknown", "unknown"],
	};
	class App {
		constructor(options = {}) {
			this.options = options;
			this.info = options.info || null;
			this.injected = {};
			this.ended = false;
			this.attract = false;
			this.demoT = 0;
			this._terminalHandled = false;
			this.runSerial = 0;
			this.overlay = false;
			this._devReady = false;
			this._recentFamily = "keyboard";
			this._wakeLatch = false;
			this.saved = E.store.get("moonriders-checkpoint", null);
			if (!F.Simulation.validCheckpoint(this.saved)) this.saved = null;
			this.records = E.store.get("moonriders-records", {
				v: 1,
				operation: 0,
				evasion: 0,
			});
			if (
				this.records?.v !== 1 ||
				!["operation", "evasion"].every(
					(k) => Number.isFinite(this.records[k]) && this.records[k] >= 0,
				)
			)
				this.records = { v: 1, operation: 0, evasion: 0 };
			this.game = new E.Game({
				id: "freedom-moonriders-v1",
				canvas: "screen",
				view: "overhead",
				views: ["overhead"],
				res: [480, 270],
				expand: true,
				input: F.INPUT,
				headless: options.headless,
				draw: options.draw,
				loop: options.loop,
				live: !!this.info,
				fullscreen: "button",
				camera: { zoom: false },
				menu: {
					quit: this.info ? false : "title",
					settings: [
						{ key: "music", value: 0.1 },
						{ key: "glyphs", value: "playstation" },
						{
							key: "voice",
							group: "Sound",
							label: "Radio voices",
							value: 0.65,
							apply: (g, v) => {
								g.audio.voiceVolume = v;
								g.audio.applyVolume();
							},
						},
						{
							key: "touchAssist",
							label: "Touch aim + auto-fire",
							value: true,
							group: "Game",
						},
						{
							key: "aimAssist",
							label: "Controller aim assist",
							value: true,
							group: "Game",
						},
					],
					controls: { fire: "Cannon", warp: "Hyperspace" },
					items: () => this.pauseActions(),
				},
			});
			const g = this.game;
			g.fadeTime = 0;
			g.cam.smooth = 0;
			this.sound = new F.Sound(g);
			this.ui = new E.Shell(g, {
				tv: true,
				theme: {
					ink: "#f3efe1",
					paper: "#111f30",
					accent: "#b8e9d2",
					muted: "#b0bec2",
					line: "#40545b",
					titleFont: "Georgia,serif",
					font: "system-ui,sans-serif",
				},
				screens: {
					pause: {
						kicker: () =>
							this.info ? "Local flight console" : "Rescue operation",
						text: () =>
							this.info
								? "The shared world continues. Your controls are held while this console is open."
								: "Take a breath. Your crew is safe while flight is paused.",
					},
					help: false,
				},
			});
			const nativeShellStep = this.ui._step.bind(this.ui);
			this.ui._step = () => {
				const primary = g.input;
				const owner =
					!this.info && this.ui.screen && g.pausedBy > 1
						? g.players[g.pausedBy - 1]
						: primary;
				if (owner && owner !== primary) {
					g.input = owner;
					try {
						nativeShellStep();
					} finally {
						g.input = primary;
					}
				} else nativeShellStep();
			};
			const settingsChanged = g.settings.onChange;
			g.settings.onChange = (key, value) => {
				settingsChanged?.(key, value);
				if (key === "glyphs") for (const q of g.players) q.glyphs = value;
			};
			this.touch = new F.Touch(this);
			this.presentation = new F.Presentation(this);
			this.cab = new E.Arcade(g, {
				id: "moonriders",
				idle: 10,
				demo: 60,
				hud: false,
			});
			for (const [key, label, min, max, step] of F.TUNING)
				g.settings.define({
					key: "dev_" + key,
					label,
					min,
					max,
					step,
					value: F.BALANCE[key],
					group: "Developer",
					apply: (_g, v) => {
						if (!this._devReady || this.info) return;
						this.sim.tune({ ...this.sim.balance, [key]: v });
					},
				});
			g.settings.define({
				key: "dev_timeScale",
				label: "Simulation speed",
				value: 1,
				min: 0.25,
				max: 3,
				step: 0.25,
				group: "Developer",
				apply: (_g, v) => {
					if (this._devReady && !this.info) {
						g.timeScale = v;
						this.sim.debug = true;
					}
				},
			});
			this._devReady = true;
			const normalRows = this.ui._settingsRows.bind(this.ui);
			this.ui._settingsRows = (add) => {
				const old = g.settings.keys.bind(g.settings);
				g.settings.keys = (group) =>
					old(group).filter((k) => g.settings.spec(k).group !== "Developer");
				try {
					normalRows(add);
				} finally {
					g.settings.keys = old;
				}
			};
			if (!this.info)
				g.allowJoin({ max: 2, keys: false, onJoin: () => this.joined() });
			this.sim = new F.Simulation(g, {
				seed: options.seed || this.info?.seed || 61421,
				runId: this.info ? `hub-${this.info.seed}-${this.info.round}` : "idle",
				roster: this.info ? this.info.players.map((p) => p.id) : [0],
			});
			if (this.info)
				this.net = new F.Network(this, options.hub || root.AIHub, this.info);
			if (!g.headless) {
				this.mountHUD();
				this.events();
				const style = document.getElementById("game-style");
				if (style) document.head.appendChild(style);
				document.body.dataset.game = F.BUILD;
				document.body.dataset.title = F.TITLE;
				document.getElementById("load-label")?.remove();
			}
			g.hook("input", (dt) => this.inputTick(dt));
			const scene = {
				view: "overhead",
				camera: { zoom: false },
				pausable: true,
				enter: () => {
					g.lights.enabled = true;
					g.lights.ambient = 0.78;
					g.lights.darkness = 0.12;
					this.clearInput();
				},
				update: (dt) => this.update(dt),
				draw: (r) => {
					if (!this.info?.server)
						this.presentation.draw(r, this.viewState || this.sim.snapshot());
				},
			};
			g.start({
				scenes: {
					title: {
						pausable: false,
						enter: () => this.showTitle(),
						update: (dt) => this.titleTick(dt),
						draw: (r) => {
							if (this.attract)
								this.presentation.draw(
									r,
									this.viewState || this.sim.snapshot(),
								);
							else this.presentation.title(r);
						},
					},
					play: scene,
				},
				scene: this.info ? "play" : "title",
			});
			if (this.net) {
				this._terminalHandled = false;
				this.ui.hide();
				this.net.ready();
			}
			g.debug = {
				snapshot: () => this.snapshot(),
				inject: (a, seat = 0) => {
					this.injected[seat] = F.intent(a);
				},
				release: () => {
					this.injected = {};
					this.clearInput();
				},
				advance: (seconds, draw = false) => {
					g.advance(seconds, { draw });
					return this.snapshot();
				},
				fixture: (name, options) => this.fixture(name, options),
				start: (mode = "operation", seed = 61421) => {
					if (this.info) return false;
					this.startRun(mode, seed);
					g.advance(1 / 120, { draw: false });
					return true;
				},
				command: (name, value) => this.command(name, value),
				pilot: () => F.pilot(this.sim),
				identity: F.BUILD,
			};
		}
		snapshot() {
			return {
				...this.sim.snapshot(),
				scene: this.game.sceneName,
				screen: this.ui.screen,
				attract: this.attract,
				paused: this.game.paused,
				players: this.game.players.length,
				storageSaved: this.game.settings.saved,
				records: { ...this.records },
				checkpoint: this.saved && F.clone(this.saved),
				inputFamily: this.game.input.lastDevice,
				role: this.info
					? this.sim.s.roles.pilot === this.info.me
						? "Pilot"
						: this.sim.s.roles.navigator === this.info.me
							? "Navigator"
							: "Server"
					: "Local",
				net: this.net
					? {
							authority: this.net.authority,
							started: this.net.started,
							ended: this.net.ended,
							finished: this.net.finished,
							runId: this.net.runId,
							roster: this.net.roster,
							rejected: this.net.rejected,
							dropped: this.net.dropped,
							maxBytes: this.net.maxBytes,
							maxRate: this.net.maxRate,
							readyCount: this.net.readyCount,
							snapshotTick: this.net.snapshotTick,
						}
					: null,
			};
		}
		clearInput() {
			this.injected = {};
			this.touch?.clear();
			for (const p of this.game.players) p.clear();
			if (this.sim && !this.info) {
				this.sim._warpHeld = false;
				if (this.sim.s.ship.drive === "windup") {
					this.sim.s.ship.drive = "ready";
					this.sim.s.ship.driveT = 0;
				}
			}
			this.localIntent = { ...F.NEUTRAL };
		}
		activity(family) {
			if (this.ended) return false;
			this._recentFamily = family;
			if (family === "mouse" && this.game) this.game.input.lastDevice = "mouse";
			this.cab.wake();
			if (this.attract) {
				this.attract = false;
				this.demoT = 0;
				this.sim = new F.Simulation(this.game, { seed: 61421, runId: "idle" });
				this.sound.stop();
				this.clearInput();
				this.presentation.fx = [];
				this.game.particles.list.length = 0;
				this.viewState = null;
				this.showTitle();
				this._wakeLatch = family === "gamepad";
				return true;
			}
			return false;
		}
		events() {
			const signal = this.game._abort.signal;
			let lastPointer = null;
			const wake = (e) => {
				if (
					e.type === "keydown" &&
					(e.repeat || ["Shift", "Control", "Alt", "Meta"].includes(e.key))
				)
					return;
				const family =
					e.type === "keydown"
						? "keyboard"
						: e.pointerType === "touch"
							? "touch"
							: "mouse";
				if (e.type === "pointermove") {
					if (e.pointerType !== "mouse") return;
					const now = [e.clientX, e.clientY];
					if (!lastPointer) {
						lastPointer = now;
						return;
					}
					if (Math.hypot(now[0] - lastPointer[0], now[1] - lastPointer[1]) < 2)
						return;
					lastPointer = now;
				}
				if (this.activity(family)) {
					e.preventDefault();
					e.stopImmediatePropagation();
					return;
				}
				if (e.type === "keydown" || e.type === "pointerdown")
					this.sound.unlock();
			};
			for (const ev of ["keydown", "pointerdown", "pointermove"])
				addEventListener(ev, wake, { capture: true, passive: false, signal });
			this.ui.root.addEventListener(
				"pointerover",
				(e) => {
					const b = e.target.closest("button");
					if (b && !b.disabled && e.pointerType === "mouse")
						b.focus({ preventScroll: true });
				},
				{ signal },
			);
			this.ui.root.addEventListener(
				"focusin",
				() => {
					if (this.sound.unlocked) this.game.audio.sfx("select", { vol: 0.12 });
				},
				{ signal },
			);
			addEventListener("blur", () => this.clearInput(), { signal });
		}
		inputTick(dt) {
			if (this.ended) {
				for (const q of this.game.players) q.consumeAll();
				return;
			}
			if (
				this.game.players.some(
					(q) =>
						q.lastDevice === "gamepad" &&
						(q.anyPressed() ||
							Math.hypot(...q.padMove) > 0.2 ||
							(q.padAim && Math.hypot(...q.padAim) > 0.2)),
				)
			) {
				if (this._wakeLatch) {
					const down = this.game.players.some(
						(q) =>
							q.padPrev.some(Boolean) ||
							Math.hypot(...q.padMove) > 0.2 ||
							q.padAim,
					);
					for (const q of this.game.players) q.consumeAll();
					if (!down) this._wakeLatch = false;
				} else if (this.activity("gamepad")) {
					for (const q of this.game.players) q.consumeAll();
				} else if (this.game.players.some((q) => q.anyPressed()))
					this.sound.unlock();
			}
			if (
				this._wakeLatch &&
				!this.game.players.some(
					(q) =>
						q.padPrev.some(Boolean) ||
						Math.hypot(...q.padMove) > 0.2 ||
						q.padAim,
				)
			)
				this._wakeLatch = false;
			if (!this.info && this.game.players.length > 1) {
				const P = this.game.players;
				if (P[1].padLost) {
					if (this.game.pauseReason === "controller") this.game.resume();
					this.game.removePlayer(P[1]);
					this.sim.setRoster([0]);
					this.clearInput();
					this.ui.toast(
						"Solo controls restored",
						"The remaining pilot now owns aim and hyperspace.",
					);
				} else if (P[0].padLost && P[1].padIndex !== null) {
					P[0].padLost = false;
					const remaining = P[1];
					this.game.removePlayer(remaining);
					P[0].pad = "any";
					P[0].padIndex = remaining.padIndex;
					P[0].padId = remaining.padId;
					P[0].padPrev = remaining.padPrev.slice();
					this.sim.setRoster([0]);
					this.clearInput();
					this.ui.toast(
						"Control transferred",
						"The remaining controller has all solo actions.",
					);
				}
			}
			if (!this.info && this.ui.screen) {
				const owner = this.game.players.findIndex((q) =>
					["confirm", "cancel", "start"].some((a) => q.pressed(a)),
				);
				if (owner >= 0) this.game.pausedBy = owner + 1;
			}
			if (this.info && this.game.input.padPrev[8])
				this.game.input.suppress("pause");
			if (
				this.ui.screen &&
				this.game.input.lastDevice === "keyboard" &&
				this.game.input.anyPressed()
			)
				this.game.pausedBy = 1;
			if (this.game.paused && !this._wasPaused) {
				this.clearInput();
				this.sound.clearVoices();
			}
			this._wasPaused = this.game.paused;
			// Roster mutation never pauses or rebuilds the mission.
			if (
				!this.info &&
				!this.attract &&
				this.sim.roster.length !== this.game.players.length
			)
				this.sim.setRoster(this.game.players.map((_, i) => i));
			if (this.ui.screen === "title" && this.ui.root) {
				const footer = this.ui.root.querySelector(".esh-ttl .esh-m");
				if (footer)
					footer.textContent =
						this.game.input.lastDevice === "gamepad"
							? "Left stick to choose · " +
								this.game.input.label("confirm") +
								" to launch"
							: this.game.input.lastDevice === "touch"
								? "Tap a flight to launch · left drag flies · right tap bursts"
								: ["up", "left", "down", "right"]
										.map((a) => this.game.input.label(a, "keyboard"))
										.join(" ") +
									" fly · mouse to aim · " +
									this.game.input.label("warp") +
									" to burst";
			}
			if (this.ui.screen && this.hud) {
				this.hud.hidden = true;
				this.radio.hidden = true;
				this.hint.hidden = true;
				this.stamp.hidden = true;
				this.touch.button.hidden = true;
			}
			if (
				this.ui.screen === "help" &&
				this.game.input.lastDevice !== this._helpDevice
			) {
				this._helpDevice = this.game.input.lastDevice;
				this.showHelp(true);
			}
		}
		showTitle() {
			if (this.info) return;
			this.ended = false;
			this.attract = false;
			this.game.timeScale = 1;
			this.game.resume();
			this.ui.hide();
			this.clearInput();
			this.cab.wake();
			this._terminalHandled = false;
			this.viewState = null;
			this.sound.stop();
			this.ui.show("title", {
				back: () => this.cab.wake(),
				kicker: "A rescue transmission from the outer reach",
				name: "Freedom\nMoonriders",
				subtitle:
					"A ship. Two drives. Every signal matters.\nThread the minefield. Bring the prisoners home.",
				actions: [
					["Play operation", () => this.startRun("operation")],
					this.saved && [
						"Continue checkpoint",
						() => this.startRun("operation", this.saved.seed, true),
					],
					["Evasion · 3 minutes", () => this.evasionBrief()],
					["Couch co-op", () => this.coopHelp()],
					["Settings", () => this.game.menu("settings")],
					["About / Credits", () => this.about()],
				].filter(Boolean),
				meta: ["1–2 PLAYERS · ONE SHIP", "10–15 MIN OPERATION"],
				footer: () =>
					this.game.input.lastDevice === "gamepad"
						? "Left stick to choose · " +
							this.game.input.label("confirm") +
							" to launch"
						: ["up", "left", "down", "right"]
								.map((a) => this.game.input.label(a, "keyboard"))
								.join(" ") +
							" fly · mouse to aim · " +
							this.game.input.label("warp") +
							" to burst",
			});
			this.hideHUD();
		}
		hideHUD() {
			if (this.hud) {
				this.hud.hidden = true;
				this.radio.hidden = true;
				this.hint.hidden = true;
				this.stamp.hidden = true;
			}
		}
		startRun(mode = "operation", seed = makeSeed(), resume = false) {
			if (this.info) return false;
			const cp = resume && this.saved ? F.clone(this.saved) : null;
			this.ui.hide();
			this.game.resume();
			this.game.timeScale = 1;
			this.clearInput();
			this.attract = false;
			this.demoT = 0;
			this.ended = false;
			this._terminalHandled = false;
			this.runSerial++;
			this.sim = new F.Simulation(this.game, {
				mode,
				seed,
				runId: "local-" + seed + "-" + this.runSerial,
				roster: this.game.players.map((_, i) => i),
				checkpoint: cp,
			});
			for (const [key] of F.TUNING)
				this.game.settings["dev_" + key] = F.BALANCE[key];
			this.game.settings.dev_timeScale = 1;
			this.presentation.seen = 0;
			this.presentation.fx = [];
			this.viewState = null;
			this.sound.music("flight");
			this.game.go("play", null, { fade: 0 });
			if (mode === "evasion") this.sim._checkpointPending = false;
			return true;
		}
		evasionBrief() {
			this.ui.show("evasionBrief", {
				kicker: "A three-minute survival challenge",
				title: "Fly without the cannon",
				text: "Lasers are offline for this entire round.\nRescue by contact. Use hyperspace to escape the rising minefields.\nSurvive 180 seconds to reach extraction. Three hull hits end the round.",
				actions: [
					["Launch Evasion", () => this.startRun("evasion")],
					["Back", () => this.ui.back()],
				],
			});
		}
		joined() {
			if (this.info) return;
			const primary = this.game.input;
			if (this.game.players.slice(1).some((q) => q.pad === primary.padIndex)) {
				primary.padIndex = null;
				primary.padId = "";
				primary.padPrev = [];
				primary.padMove = [0, 0];
				primary.padAim = null;
				if (primary.lastDevice === "gamepad") primary.lastDevice = "keyboard";
			}

			this.sim?.setRoster(this.game.players.map((_, i) => i));
			this.clearInput();
			this.ui.toast(
				"Two seats. One ship.",
				"Pilot: steer and fire. Navigator: aim, fire, and hyperspace.",
				8,
			);
		}
		joinPad() {
			if (this.info || this.game.players.length > 1) return false;
			let pads = [];
			try {
				pads = Array.from(navigator.getGamepads()).filter(
					(p) => p && p.connected !== false,
				);
			} catch (_) {}
			const I = this.game.input;
			const second = pads.find((p) => p.index !== I.padIndex) || pads[0];
			if (!second) {
				this.ui.toast(
					"Connect a controller",
					"Use one pad with keyboard/mouse, or connect two pads. Then choose Join controller.",
				);
				return false;
			}
			this.game.addPlayer({ pad: second.index });
			return true;
		}
		coopHelp() {
			this.ui.show("coop", {
				kicker: "Local shared-ship co-op",
				title: "Bring a navigator",
				text: "Pilot: steer and fire.\nNavigator: aim, fire, and hyperspace.\n\nUse two controllers, or keyboard/mouse plus one controller. A free second pad can press Options to join. With one pad, choose Join controller to give it the navigator seat.\n\nRemote co-op launches through an AI Hub session.",
				actions: [
					{
						label:
							this.game.players.length > 1
								? "Navigator joined"
								: "Join controller",
						fn: () => this.joinPad(),
						disabled: this.game.players.length > 1,
					},
					["Flight manual", () => this.showHelp()],
					["Back", () => this.ui.back()],
				],
			});
		}
		pauseActions() {
			return [
				["Developer tools", () => this.dev()],
				!this.info &&
					this.game.players.length < 2 && [
						"Couch co-op",
						() => this.coopHelp(),
					],
				!this.info &&
					this.game.players.length > 1 && [
						"Swap pilot / navigator",
						() => {
							this.sim.swap = !this.sim.swap;
							this.clearInput();
							this.ui.toast(
								"Roles swapped",
								"Pilot: steer and fire. Navigator: aim, fire, and hyperspace.",
							);
						},
					],
				!this.info &&
					this.game.players.length > 1 && [
						"Second seat leaves",
						() => {
							this.game.removePlayer(2);
							this.sim.setRoster([0]);
							this.clearInput();
							this.ui.hide();
						},
					],
				["Flight manual", () => this.showHelp()],
				["About / Credits", () => this.about()],
				!this.info && [
					"Retry checkpoint",
					() =>
						this.confirmAction(
							"Restore the checkpoint?",
							"Score, hull, energy and rescue credit return to the checkpoint baseline.",
							() => this.retry(),
						),
				],
				!this.info && [
					"Restart operation",
					() =>
						this.confirmAction(
							"Start a new flight?",
							"This run is abandoned. The next flight begins at the outer reach.",
							() => this.startRun(this.sim.mode),
						),
				],
			].filter(Boolean);
		}
		confirmAction(title, text, fn) {
			this.ui.show("confirm", {
				title,
				text,
				actions: [
					["Keep flying", () => this.ui.back()],
					["Proceed", fn],
				],
			});
		}
		retry() {
			if (this.info) return false;
			this.ui.hide();
			this.game.resume();
			this.clearInput();
			const beforeRetry = this.sim.s.eventSeq;
			this.sim.retry();
			this.presentation.fx = [];
			this.presentation.seen = beforeRetry;
			this.game.particles.list.length = 0;
			this._terminalHandled = false;
			this.viewState = null;
			this.sound.music("flight");
			return true;
		}
		showHelp(refresh = false) {
			this._helpDevice = this.game.input.lastDevice;
			const I = this.game.input;
			const localId = this.info ? this.info.me : this.game.players.indexOf(I);
			const shared = this.sim.s.roles.shared,
				navigatorSeat = shared && this.sim.s.roles.navigator === localId;
			const touch = I.lastDevice === "touch";
			const keys = touch
				? [
						[
							"Left contact",
							navigatorSeat
								? "Drag to preview a hyperspace direction"
								: "Drag to steer; release to brake",
						],
						["Right contact", "Drag to aim. Tap to commit hyperspace"],
						["Auto-fire", "Targets enemies only along crystal-safe lines"],
						["Menu", "Open the flight console at the top right"],
					]
				: I.lastDevice === "gamepad"
					? [
							[
								"Left stick",
								"Conventional flight; navigator previews hyperspace",
							],
							["Right stick", "Aim the cannon independently"],
							[I.label("fire"), "Hold to fire the one cannon"],
							[I.label("warp"), "Fresh press: preview, commit, recover"],
							[I.label("pause"), "Flight console"],
							[I.label("confirm") + " / " + I.label("cancel"), "Choose / back"],
						]
					: [
							[
								[
									I.label("up"),
									I.label("left"),
									I.label("down"),
									I.label("right"),
								].join(" "),
								"Conventional flight",
							],
							["Mouse", "Aim at any bearing"],
							[I.label("fire"), "Hold to fire"],
							[
								I.label("warp"),
								"Fresh press commits hyperspace in movement direction",
							],
							["Escape", "Flight console"],
						];
			this.ui.show("help", {
				kicker: "Rescue flight manual",
				title: "A signal is a life",
				text: shared
					? navigatorSeat
						? "Your seat: navigator. Aim, fire, and commit hyperspace. The pilot owns conventional flight."
						: "Your seat: pilot. Steer and fire. Your navigator owns aim and hyperspace."
					: "Solo flight: steer, aim, fire and commit hyperspace.",
				keys,
				sections: [
					[
						"Rescue before fire",
						"Touch a violet collar to secure its captive immediately. Three laser hits shatter a crystal; cracks warn you to stop.",
					],
					[
						"Break the field",
						"Destroy a mine-layer and its linked mines dissolve. A solid, spiked mine is armed. Hollow mines are still deploying. Hyperspace gives speed, never immunity. Each burst costs " +
							this.sim.balance.burstCost +
							" energy; release and press again for another burst.",
					],
					[
						"Score and rank",
						"Rescue 20 · ship 5 · mine 1. Rescue chains within 34s add 25% per link, up to four links (×1.75). Damage or a loss breaks the chain. Replacements reduce rank. Mine rewards stop after eight per layer.",
					],
					[
						"Two seats",
						"Pilot steers and fires. Navigator aims, fires, and commits hyperspace. During the preview the pilot still steers; the committed burst follows the navigator.",
					],
				],
				actions: [["Back", () => this.ui.back()]],
			});
		}
		about() {
			this.ui.show("about", {
				kicker: "Original code, art and sound",
				title: F.TITLE,
				text: "Inspired by Freedom Fighters! (1982), for the Odyssey² / Philips Videopac.\nA complete rescue operation and a cannon-free Evasion challenge.",
				actions: [
					["Source Information", () => this.reportPage("sourceInformation", 0)],
					["Testing Feedback", () => this.reportPage("testingFeedback", 0)],
					["Engine Feedback", () => this.reportPage("engineFeedback", 0)],
					["Prompt Feedback", () => this.reportPage("promptFeedback", 0)],
					["Back", () => this.ui.back()],
				],
			});
		}
		reportPage(group, page) {
			const R = F.REPORT || fallbackReport,
				names = {
					sourceInformation: "Source Information",
					testingFeedback: "Testing Feedback",
					engineFeedback: "Engine Feedback",
					promptFeedback: "Prompt Feedback",
				};
			const questions = {
				testingFeedback: [
					"How many issues did testing catch?",
					"How many were critical / game breaking?",
					"Most helpful test?",
					"Least helpful test?",
				],
				engineFeedback: [
					"What did you like most?",
					"Did you get stuck or guess wrong?",
					"Most important thing built yourself?",
					"Hardest part of using the engine?",
					"What changed in the engine, and why?",
					"One engine change you would make?",
				],
				promptFeedback: [
					"What did you like most?",
					"What was confusing?",
					"What was hardest?",
					"What would you change?",
				],
			};
			const rows =
					group === "sourceInformation"
						? Object.entries(R[group])
						: R[group].map((answer, i) => [questions[group][i], answer]),
				size = 2,
				total = Math.ceil(rows.length / size);
			const sections = rows
				.slice(page * size, page * size + size)
				.map(([q, a]) => [q, a]);
			this.ui.show("report", {
				kicker: names[group] + " · " + (page + 1) + " / " + total,
				title: names[group],
				sections,
				actions: [
					page + 1 < total && [
						"Next page",
						() => this.reportPage(group, page + 1),
					],
					page > 0 && ["Previous page", () => this.reportPage(group, page - 1)],
					["Back to credits", () => this.ui.back()],
				].filter(Boolean),
			});
		}
		dev() {
			const s = this.sim.s,
				online = !!this.info,
				text = `Seed ${s.seed} · ${s.mode} · tick ${s.tick}\n${F.MISSIONS[s.sector].place} · ${this.sim.objective()}\nPilot ${s.roles.pilot} · navigator ${s.roles.navigator}\n${s.entities.length} entities · ${s.rescued.length} rescued · ${s.lost.length} lost\n${online ? "Online diagnostics are read-only. The authority owns all shared rules." : this.sim.debug ? "MODIFIED RUN · records and saves disabled" : "Authored defaults · modifying a tool disables records and saves."}\n\nRecent events: ${s.events
					.slice(-5)
					.map((e) => e.type + " #" + e.n)
					.join(" · ")}`;
			this.ui.show("dev", {
				kicker: "Flight laboratory",
				title: online ? "Session diagnostics" : "Developer tools",
				text,
				actions: [
					{
						label: "Flight balance",
						disabled: online,
						fn: () => this.balancePage(0),
					},
					{
						label: "Combat balance",
						disabled: online,
						fn: () => this.balancePage(1),
					},
					{
						label: "Sector / checkpoint selector",
						disabled: online,
						fn: () => this.sectors(),
					},
					{
						label: "Invulnerability: " + (this.sim.invulnerable ? "on" : "off"),
						disabled: online,
						fn: () => {
							this.command("invulnerability", !this.sim.invulnerable);
							this.dev();
						},
					},
					{
						label: "Refill hyperspace energy",
						disabled: online,
						fn: () => {
							this.command("energy");
							this.dev();
						},
					},
					{
						label: "Spawn mine-layer",
						disabled: online,
						fn: () => {
							this.command("spawn", "layer");
							this.dev();
						},
					},
					{
						label: "Spawn rescue crystal",
						disabled: online,
						fn: () => {
							this.command("spawn", "crystal");
							this.dev();
						},
					},
					{
						label:
							"Collision + ownership overlay: " + (this.overlay ? "on" : "off"),
						fn: () => {
							this.overlay = !this.overlay;
							this.dev();
						},
					},
					{
						label: "Advance one fixed step",
						disabled: online,
						fn: () => {
							this.command("step");
							this.dev();
						},
					},
					{
						label: "Restart from current seed",
						disabled: online,
						fn: () => this.command("seed"),
					},
					["Refresh diagnostics", () => this.dev()],
					["Back", () => this.ui.back()],
				],
			});
		}
		balancePage(page) {
			const rows = page === 0 ? F.TUNING.slice(0, 9) : F.TUNING.slice(9);
			this.ui.show("balance", {
				kicker: "Live tuning · modified run",
				title: page === 0 ? "Flight and drive" : "Combat and rescue",
				text: "Left / right adjusts a focused slider. Hull changes preserve missing hull units and clamp the current hull to at least one. Health multipliers affect newly spawned enemies; restart the scenario for a comparison.",
				rows: rows
					.map((x) => "dev_" + x[0])
					.concat(page === 0 ? ["dev_timeScale"] : []),
				actions: [
					[
						"Reset authored defaults",
						() => {
							this.command("reset");
							this.balancePage(page);
						},
					],
					["Back", () => this.ui.back()],
				],
			});
		}
		sectors() {
			this.ui.show("sectors", {
				title: "Mission definitions",
				kicker: "Designer scenario selector",
				text: "Each selector uses the normal authored mission data and the current seed. The result is marked as a test run.",
				actions: F.MISSIONS.map((m, i) => [
					`${i} · ${m.title}`,
					() => {
						this.command("sector", i);
						this.ui.hide();
						this.game.resume();
					},
				]).concat([["Back", () => this.ui.back()]]),
			});
		}
		command(name, value) {
			if (this.info && name !== "overlay") return false;
			const s = this.sim.s;
			if (name === "overlay") {
				this.overlay = !!value;
				return true;
			}
			this.sim.debug = true;
			if (name === "invulnerability") this.sim.invulnerable = !!value;
			else if (name === "energy") s.ship.energy = 100;
			else if (name === "spawn")
				this.sim.add(value, s.ship.x + 165, F.clamp(s.ship.y + 25, 55, 215), {
					slot: "debug-" + s.tick,
				});
			else if (name === "step") this.sim.step(1 / 120, {});
			else if (name === "sector") {
				const previous = this.sim;
				this.clearInput();
				this.sim = new F.Simulation(this.game, {
					mode: "operation",
					seed: previous.seed,
					balance: previous.balance,
					roster: previous.roster,
					runId: "lab-" + previous.seed + "-" + ++this.runSerial,
				});
				this.sim.debug = true;
				this.sim.swap = previous.swap;
				this.sim.invulnerable = previous.invulnerable;
				this.sim.enter(value);
				this.presentation.fx = [];
				this.presentation.seen = 0;
				this.game.particles.list.length = 0;
				this._terminalHandled = false;
				this.viewState = null;
			} else if (name === "seed") {
				const seed = this.sim.seed,
					mode = this.sim.mode;
				this.startRun(mode, seed);
				this.sim.debug = true;
			} else if (name === "reset") {
				this.sim.tune(F.BALANCE);
				this.sim.invulnerable = false;
				this.game.timeScale = 1;
				for (const [k] of F.TUNING)
					this.game.settings["dev_" + k] = F.BALANCE[k];
				this.game.settings.dev_timeScale = 1;
			} else return false;
			this.viewState = this.sim.snapshot();
			this.presentation.update(0, this.viewState);
			return true;
		}
		fixture(name, options = {}) {
			if (this.info && !this.options.testHarness) return false;
			this.sim.debug = true;
			const s = this.sim.s;
			if (name === "ship") Object.assign(s.ship, options);
			else if (name === "clear") {
				s.entities = [];
				s.spawned = F.MISSIONS[s.sector].entries.map((x) => x.id);
				this.sim.shots.clear();
			} else if (name === "entity")
				return this.sim.add(options.kind, options.x, options.y, options);
			else if (name === "sector") this.sim.enter(options.index || 0);
			else if (name === "damage") this.sim.damage("fixture");
			else if (name === "restore") this.sim.restore(options);
			else return false;
			return true;
		}
		titleTick(dt) {
			if (this.info) return;
			if (this.attract) {
				this.demoT += dt;
				if (this.demoT > 55) {
					this.startAttract();
					return;
				}
				if (this.demoT > 30 && !this._demoCarrier) {
					this._demoCarrier = true;
					this.sim.enter(3);
					this.sim.s.ship.x = F.MISSIONS[3].bossX - 300;
					this.sim.s.elapsed = 30;
					this.sim.direct(dt);
					this.sim.debug = true;
				}
				const a = F.pilot(this.sim);
				this.sim.step(dt, { 0: a, 1: a });
				this.viewState = this.sim.snapshot();
				this.presentation.update(dt, this.viewState);
				this.updateHUD(this.viewState);
				return;
			}
			if (this.ui.screen === "title") {
				if (this.cab.attract(dt) === "demo") this.startAttract();
			} else if (!this.ui.screen && !this.game._next) this.showTitle();
			else this.cab.wake();
		}
		startAttract() {
			if (this.info) return;
			this.attract = true;
			this.demoT = 0;
			this._demoCarrier = false;
			this.ui.hide();
			this.game.resume();
			this.clearInput();
			this.sim = new F.Simulation(this.game, {
				seed: 61421,
				demo: true,
				runId: "attract-" + ++this.runSerial,
				roster: [0, 1],
			});
			this.sim.enter(1);
			this.sim.s.ship.x = 740;
			this.sim.debug = true;
			this.presentation.seen = 0;
			this.sound.stop();
		}
		update(dt) {
			if (this.ended) return;
			const g = this.game;
			const local = this.info?.server
				? { ...F.NEUTRAL }
				: F.readSeat(this, g.input, dt, 0);
			this.localIntent = local;
			if (this.net) this.net.update(dt, local);
			else {
				const seats = { 0: local };
				for (let i = 1; i < g.players.length; i++)
					seats[i] = F.readSeat(this, g.players[i], dt, i);
				this.sim.step(dt, seats);
			}
			const s = this.net ? this.net.state(dt) : this.sim.snapshot();
			this.viewState = s;
			this.presentation.update(dt, s);
			this.sound.update(s, g.paused || !!this.ui.screen);
			if (!this.info && this.sim._checkpointPending) {
				this.sim._checkpointPending = false;
				if (
					!this.sim.demo &&
					!this.sim.debug &&
					this.sim.mode === "operation"
				) {
					this.saved = F.clone(this.sim.checkpoint);
					E.store.set("moonriders-checkpoint", this.saved);
				}
			}
			if (s.outcome && !this._terminalHandled) {
				this._terminalHandled = true;
				this.endT = 0;
				this.clearInput();
				if (!this.info && !this.sim.demo && !this.sim.debug) {
					const k = this.sim.mode;
					this.records[k] = Math.max(this.records[k], s.score);
					E.store.set("moonriders-records", this.records);
					if (s.outcome === "victory" && k === "operation") {
						E.store.remove("moonriders-checkpoint");
						this.saved = null;
					}
				}
				this.sound.music(s.outcome === "victory" ? "victory" : "failure");
			}
			if (s.outcome) {
				this.endT += dt;
				if (!this.info && this.endT > 0.9 && !this.ui.screen) this.results();
			}
			this.updateHUD(s);
		}
		results() {
			const s = this.sim.s,
				won = s.outcome === "victory",
				mode = this.sim.mode,
				rank = !won
					? "Signal lost"
					: s.replacementPenalty > 0
						? "Rescue crew"
						: s.lost.length > 0
							? "Flight commander"
							: s.rescued.length >= 11
								? "Fleet admiral"
								: "Star navigator";
			this.ui.show("results", {
				kicker: mode === "evasion" ? "Evasion debrief" : "Operation debrief",
				title: won ? "The crew is home" : "A signal still waits",
				emblem: won ? "✦" : "◇",
				text: s.ending,
				stats: [
					[s.rescued.length, "rescued"],
					[s.lost.length, "lost"],
					[Math.round(s.score), "team score"],
					[Math.round(this.records[mode]), "best score"],
				],
				sections: [
					[
						"Rank · " + rank,
						`${s.rescued.length} rescues · ${s.lost.length} losses · ${s.replacementPenalty} replacement groups.\n${this.sim.debug ? "Test run: records and checkpoints were protected." : "Rescue chains reward clean approaches; every replacement group lowers rank."}`,
					],
				],
				actions: [
					!won &&
						mode === "operation" && ["Retry checkpoint", () => this.retry()],
					["Fly again", () => this.startRun(mode)],
					["Evasion", () => this.evasionBrief()],
					[
						"Front end",
						() => {
							this.ui.hide();
							this.game.go("title", null, { fade: 0 });
						},
					],
				].filter(Boolean),
			});
		}
		onHubEnd(reason) {
			this.game.audio.mute(true);
			this.game.stop();
			this.game._abort?.abort();
			this.game._corner?.remove();
			if (this.touch.button) this.touch.button.hidden = true;
			this.hideHUD();
			if (this.ui.screen) this.ui.hide();
			if (!this.game.headless && reason === "host-left")
				this.ui.toast(
					"Session round ended",
					"The host left. AI Hub owns the next round.",
				);
		}
		mountHUD() {
			const el = (tag, cls, parent, text) => {
				const e = document.createElement(tag);
				e.className = cls;
				if (text) e.textContent = text;
				parent.appendChild(e);
				return e;
			};
			const root = this.ui.root;
			this.hud = el("div", "flight-hud", root);
			const left = el("div", "hud-left", this.hud),
				h = el("div", "", left);
			el("div", "hud-caption", h, "HULL");
			this.pips = el("div", "hull-pips", h);
			const drive = el("div", "", left);
			el("div", "hud-caption", drive, "HYPERSPACE");
			const meter = el("div", "drive-meter", drive);
			this.energy = el("b", "", meter);
			this.driveState = el("div", "drive-state", drive);
			const obj = el("div", "hud-objective", this.hud);
			this.place = el("div", "hud-caption", obj);
			this.objective = el("strong", "", obj);
			const score = el("div", "hud-score", this.hud);
			el("div", "hud-caption", score, "RESCUE SCORE");
			this.score = el("div", "score-value", score);
			this.chain = el("div", "chain", score);
			this.radio = el("div", "radio-line", root);
			el("div", "radio-mark", this.radio, "M");
			this.radioText = el("div", "radio-text", this.radio);
			this.hint = el("div", "control-hint", root);
			this.stamp = el("div", "mode-stamp", root);
		}
		updateHUD(s) {
			if (!this.hud) return;
			const hide = !!this.ui.screen || this.ended;
			this.hud.hidden = hide;
			this.radio.hidden = hide || s.bannerUntil < s.elapsed;
			this.hint.hidden = hide;
			this.stamp.hidden = hide;
			if (hide) return;
			const p = s.ship;
			this.pips.replaceChildren(
				...Array.from({ length: this.sim.balance.hull }, (_, i) => {
					const e = document.createElement("i");
					if (i >= p.hull) e.className = "off";
					return e;
				}),
			);
			this.energy.style.width = p.energy + "%";
			this.driveState.textContent =
				p.drive === "ready"
					? Math.round(p.energy) + " / 100"
					: p.drive.toUpperCase();
			this.place.textContent =
				s.mode === "evasion"
					? "EVASION · CANNON OFFLINE"
					: F.MISSIONS[s.sector].place.toUpperCase();
			this.objective.textContent = this.sim.objective();
			this.score.textContent = String(Math.round(s.score)).padStart(5, "0");
			this.chain.textContent =
				s.chain > 1
					? `CHAIN ${s.chain} · ×${1 + 0.25 * (s.chain - 1)} · ${Math.ceil(s.chainLeft)}s`
					: s.weaponsOff
						? "⊘ CANNON OFFLINE"
						: "20 RESCUE · 5 SHIP · 1 MINE";
			this.radioText.textContent = s.banner;
			const I = this.game.input;
			const localId = this.info ? this.info.me : 0;
			const localNavigator = s.roles.shared && s.roles.navigator === localId;
			const driveInput = this.info
				? I
				: this.game.players[s.roles.navigator] || I;
			this.hint.textContent =
				I.lastDevice === "touch"
					? s.roles.shared
						? localNavigator
							? "LEFT DRAG · drive preview    RIGHT TAP · hyperspace"
							: "LEFT DRAG · fly    NAVIGATOR · aim + hyperspace"
						: "LEFT DRAG · fly    RIGHT TAP · hyperspace"
					: I.lastDevice === "gamepad"
						? `${I.label("fire")} fire    ${this.info && s.roles.shared && !localNavigator ? "Navigator" : driveInput.label("warp")} hyperspace    ${I.label("pause")} console`
						: `${I.label("fire")} fire    ${this.info && s.roles.shared && !localNavigator ? "Navigator" : driveInput.label("warp")} hyperspace    Esc console`;
			this.stamp.textContent = this.info
				? `AI HUB · ${s.roles.pilot === this.info.me ? "PILOT" : s.roles.navigator === this.info.me ? "NAVIGATOR" : "SERVER"} · ONE SHIP`
				: s.roles.shared
					? "SHARED SHIP · PILOT STEERS / NAVIGATOR AIMS + BURSTS"
					: this.sim.debug
						? "FLIGHT LAB · RECORDS PROTECTED"
						: "CONTACT RESCUE · DO NOT SHOOT CRYSTALS";
		}
		dispose() {
			this.sound.stop();
			this.touch.button?.remove();
			this.game.dispose();
		}
	}
	F.create = (options) => new App(options);
	if (typeof document !== "undefined" && !root.__MOONRIDERS_NO_BOOT__) {
		(async () => {
			const info = await root.AIHub.connect({
				mode: "shared-world",
				seats: [1, 2],
			});
			root.__moon = F.create({ info, hub: root.AIHub });
			root.__game = { game: root.__moon.game };
		})().catch((e) => {
			console.error(e);
			document.getElementById("load-label").textContent =
				"Flight systems failed: " + e.message;
		});
	}
})(typeof globalThis === "object" ? globalThis : window);
