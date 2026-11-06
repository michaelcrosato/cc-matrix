((M, E) => {
	const BASE_KEYS = {
		...E.Input.DEFAULT,
		confirm: ["Enter", "Pad0"],
		gas: ["KeyW", "ArrowUp", "Pad7"],
		brake: ["KeyS", "ArrowDown", "Space", "Pad6"],
		recover: ["KeyR", "Pad3"],
		halves: {
			left: {
				confirm: ["Enter"],
				cancel: ["Escape", "Backspace"],
				gas: ["KeyW"],
				brake: ["KeyS", "Space"],
				recover: ["KeyR"],
			},
			right: { gas: ["ArrowUp"], brake: ["ArrowDown"], recover: ["Slash"] },
		},
	};
	for (const a of ["attack", "dash", "skill", "jump"]) delete BASE_KEYS[a];
	const settingItems = [
		{ key: "music", value: 0.1 },
		{ key: "glyphs", value: "playstation" },
		{
			key: "throttle",
			label: "Acceleration",
			type: "select",
			value: "auto",
			options: [
				["auto", "Automatic"],
				["manual", "Manual throttle"],
			],
			help: "Auto: release the brake to go. Manual: hold R2 / W.",
		},
		{
			key: "steering",
			label: "Steering",
			type: "select",
			value: "relative",
			options: [
				["relative", "Car relative"],
				["screen", "Screen directions"],
			],
			help: "Car relative: left turns the car left. Screen: point toward a screen edge.",
		},
		{ key: "ghost", label: "Personal best ghost", type: "toggle", value: true },
		{
			key: "voiceVolume",
			label: "Crew voice",
			group: "Sound",
			type: "slider",
			value: 0.55,
			min: 0,
			max: 1,
			step: 0.05,
		},
		{
			key: "touchAssist",
			label: "Touch re-entry assist",
			type: "slider",
			value: 0.22,
			min: 0,
			max: 0.5,
			step: 0.02,
			help: "Touch only. Gentle help back toward the road; recorded with results.",
		},
		{
			key: "courseChoice",
			label: "Circuit",
			type: "select",
			value: 0,
			options: M.COURSE_DATA.map((c, i) => [i, i + 1 + ". " + c.name]),
		},
		{
			key: "carChoice",
			label: "Motor",
			type: "select",
			value: 2,
			options: M.CARS.map((c, i) => [i, c.name]),
		},
		{
			key: "eventLaps",
			label: "Length",
			type: "select",
			value: 2,
			options: [
				[2, "Quick · 2 laps"],
				[5, "Classic · 5 laps"],
			],
		},
		{
			key: "scoreTarget",
			label: "Pursuit",
			type: "select",
			value: 10,
			options: [
				[10, "Sprint · 10 points"],
				[50, "Classic · 50 points"],
			],
		},
		{
			key: "difficulty",
			label: "Pace car",
			type: "select",
			value: "normal",
			options: [
				["easy", "Easy"],
				["normal", "Normal"],
				["hard", "Hard"],
			],
		},
		{
			key: "opponent",
			label: "Other driver",
			type: "select",
			value: "ai",
			options: [
				["ai", "Pace car · AI"],
				["couch", "Couch · human"],
			],
		},
		{
			key: "seatMode",
			label: "Seats",
			type: "select",
			value: "keyboard",
			options: [
				["keyboard", "Shared keyboard"],
				["padkeys", "Pad + keyboard"],
				["pads", "Two controllers"],
			],
		},
		{
			key: "secondCar",
			label: "Driver 2 motor",
			type: "select",
			value: 4,
			options: M.CARS.map((c, i) => [i, c.name]),
		},
	];
	const ranges = {
		speed: [0.45, 1.7, 0.05],
		accel: [0.3, 2, 0.05],
		brake: [0.3, 2, 0.05],
		steer: [0.4, 1.8, 0.05],
		roadGrip: [0.3, 1.6, 0.05],
		grassGrip: [0.15, 1.4, 0.05],
		gravelGrip: [0.1, 1.3, 0.05],
		crash: [30, 160, 2],
		ai: [0.5, 1.25, 0.05],
		lead: [132, 440, 11],
		target: [2, 50, 1],
	};
	const names = {
		speed: "Speed scale",
		accel: "Acceleration",
		brake: "Braking",
		steer: "Steering",
		roadGrip: "Road grip",
		grassGrip: "Grass grip",
		gravelGrip: "Gravel grip",
		crash: "Crash threshold",
		ai: "AI planning pace",
		lead: "Lead distance",
		target: "Duel score target",
	};
	for (const k of Object.keys(M.DEFAULTS))
		settingItems.push({
			key: "dev_" + k,
			label: names[k],
			group: "Pit bench",
			type: "slider",
			value: M.DEFAULTS[k],
			min: ranges[k][0],
			max: ranges[k][1],
			step: ranges[k][2],
			help: "Default " + M.DEFAULTS[k],
		});

	class App {
		constructor() {
			this.playMode = "boot";
			this.tourIndex = null;
			this.couch = false;
			this.peer = null;
			this.network = null;
			this.hub = null;
			this.peerRound = 0;
			this.signalGeneration = 0;
			this.idle = 0;
			this.attract = false;
			this.devAI = false;
			this.overlays = false;
			this.freeCamera = false;
			this.toastText = "";
			this.toastUntil = 0;
			this.lastEvent = 0;
			this.testIntents = {};
			this.tuning = { ...M.DEFAULTS };
			this.touches = new Map();
			this.touchSteer = 0;
			const join = globalThis.AIHub
				? AIHub.connect({ mode: "shared-world", seats: [1, 2] })
				: Promise.resolve(null);
			this.game = new E.Game({
				canvas: "screen",
				id: "auto-motley-motor",
				res: [640, 360],
				expand: true,
				view: "topdown",
				input: BASE_KEYS,
				autoPause: false,
				fullscreen: "button",
				bg: "#799962",
				menu: {
					settings: settingItems,
					controls: {
						gas: "Manual throttle",
						brake: "Brake",
						recover: "Hold to recover",
					},
					quit: false,
				},
			});
			globalThis.__game = this.game;
			this.game.settings.set("showFps", false);
			for (const k of Object.keys(M.DEFAULTS))
				this.game.settings.set("dev_" + k, M.DEFAULTS[k]);
			this.game.cam.smooth = 0;
			this.world = new M.World();
			let storage;
			try {
				storage = localStorage;
			} catch {
				storage = null;
			}
			this.saves = new M.SaveStore(storage);
			this.presentation = new M.Presentation(this.game, this.world);
			this.sound = new M.Sound(this.game);
			this.ui = new M.MotorShell(this);
			const theme = document.getElementById("motor-css");
			if (theme) document.head.appendChild(theme);
			this.game.settings.onChange = (k) => this.changedSetting(k);
			this.sound.volumes(this.game.settings);
			this.titleSim();
			this.game.start({
				scene: "main",
				scenes: {
					main: {
						pausable: true,
						view: "topdown",
						input: BASE_KEYS,
						camera: { zoom: false },
						update: (dt) => this.update(dt),
						draw: (r) => this.draw(r),
						back: () => {
							if (this.network) {
								this.onlineMenu();
								return true;
							}
							return false;
						},
					},
				},
			});
			const nativeMenu = this.game.menu.bind(this.game);
			this.game.menu = (name, o) =>
				this.network
					? name
						? this.ui.show(name)
						: this.onlineMenu()
					: nativeMenu(name, o);
			this.game.hook("input", (dt) => this.inputStep(dt));
			this.installEvents();
			this.installDebug();
			join
				.then((info) => {
					if (info) this.startHub(info);
					else {
						this.playMode = "menu";
						this.ui.title();
					}
				})
				.catch((e) => {
					this.playMode = "menu";
					this.ui.title();
					this.ui.toast("Hub unavailable", String(e.message));
				});
		}
		titleSim() {
			this.sim = new M.Simulation(this.world, {
				mode: "free",
				course: 0,
				cars: [2],
				countdown: 0,
				cap: 0,
			});
			this.sim.phase = "running";
			this.presentation.cam = { x: 800, y: 1640 };
			this.lastEvent = 0;
			this.presentation.lastEvent = 0;
			this.sound.reset();
			this.best = null;
		}
		changedSetting(k) {
			const S = this.game.settings;
			if (k.startsWith("dev_") && this.sim && !this.resettingTuning) {
				const key = k.slice(4);
				if (this.network) return;
				this.tuning[key] = S[k];
				this.sim.tuning[key] = S[k];
				if (key === "target") this.sim.config.target = S[k];
				this.markDev();
			}
			if (k === "steering") this.configureInputs();
			if (["courseChoice", "carChoice"].includes(k)) this.ui?.refreshPreview();
			if (["volume", "music", "effects", "voiceVolume", "sound"].includes(k))
				this.sound?.volumes(S);
		}
		configureInputs() {
			const keys = {
				...BASE_KEYS,
				brake:
					this.game.settings.steering === "screen"
						? ["Space", "Pad6"]
						: BASE_KEYS.brake,
			};
			for (const input of this.game.players) {
				if (input.half) {
					input._full = keys;
					input.use(E.Input.halfKeys(keys, input.half));
				} else input.use(keys);
			}
			this.game.input.touchButtons([]);
			this.game.input.touchFilter = () => false;
		}
		installEvents() {
			const meaningful = (e) => {
				if (e.type === "pointermove") {
					if (Math.abs(e.movementX) + Math.abs(e.movementY) < 3) return;
				}
				if (this.attract) {
					e.preventDefault();
					e.stopImmediatePropagation();
					this.exitAttract();
					return;
				}
				this.idle = 0;
				if (e.type !== "pointermove") this.sound.unlock();
			};
			for (const type of ["keydown", "pointerdown", "pointermove", "wheel"])
				addEventListener(type, meaningful, { capture: true, passive: false });
			addEventListener("pagehide", () => this.peer?.close());
			addEventListener("blur", () => {
				this.clearTouches();
				if (!this.network && this.playMode === "play") this.game.pause("focus");
			});
			document.addEventListener("visibilitychange", () => {
				this.clearTouches();
				if (document.hidden && !this.network && this.playMode === "play")
					this.game.pause("focus");
			});
			const canvas = this.game.screen.canvas;
			canvas.addEventListener("pointerdown", (e) => {
				if (e.pointerType !== "touch" || this.ui.screen || this.attract) return;
				e.preventDefault();
				this.game.input.lastDevice = "touch";
				this.game.input._touched = true;
				const b = canvas.getBoundingClientRect();
				this.touches.set(e.pointerId, {
					x: e.clientX,
					y: e.clientY,
					start: e.clientX,
					brake: e.clientX - b.left > b.width * 0.55,
				});
				if (e.isTrusted) canvas.setPointerCapture(e.pointerId);
			});
			canvas.addEventListener("pointermove", (e) => {
				const t = this.touches.get(e.pointerId);
				if (t) {
					t.x = e.clientX;
					t.y = e.clientY;
				}
			});
			for (const ev of ["pointerup", "pointercancel", "lostpointercapture"])
				canvas.addEventListener(ev, (e) => this.touches.delete(e.pointerId));
			this.configureInputs();
		}
		clearTouches() {
			this.touches.clear();
			this.touchSteer = 0;
			this.touchRecover = false;
			this.game.input.clear();
		}
		inputStep(dt) {
			if (this.game.paused && !this.network) this.sound.update(this.sim, true);
			const I = this.game.input,
				activePad =
					I.lastDevice === "gamepad" &&
					(I.anyPressed() ||
						Math.hypot(...I.padMove) > 0.28 ||
						I.value("brake") > 0.15);
			if (activePad) {
				if (this.attract) {
					this.exitAttract();
					I.clear();
					I.consumeAll();
					return;
				}
				this.idle = 0;
				this.sound.unlock();
			} else if (this.playMode === "menu" && !this.hub && !this.peer) {
				this.idle += dt;
				if (this.idle >= 10 - 1e-6) this.enterAttract();
			}
			if (this.network && I.pressed("pause")) {
				I.suppress("pause");
				this.onlineMenu();
				I.consumeAll();
			}
			if (I.padLost && this.playMode === "play")
				this.toast("Controller lost · that seat is braking.");
		}
		recordSettings() {
			const S = this.game.settings;
			return {
				throttle: S.throttle,
				steering: S.steering,
				assist: this.game.input.lastDevice === "touch" ? S.touchAssist : 0,
			};
		}
		readIntent(i = 0) {
			if (this.playMode === "ended" || (this.network && this.ui.screen))
				return { steer: 0, gas: 0, brake: 1, recover: false };
			if (this.testIntents[i]) return this.testIntents[i];
			if (this.devAI && !this.network && i === 0)
				return this.sim.ai(this.sim.drivers[i]);
			const I = this.network
					? this.game.input
					: this.game.players[i] || this.game.input,
				D = this.sim.drivers[i] || this.sim.drivers[0],
				S = this.game.settings;
			if (I.lastDevice === "gamepad" && (I.padLost || I.padIndex === null))
				return { steer: 0, gas: 0, brake: 1 };
			const move = I.move();
			let steer = move[0],
				brake = I.value("brake"),
				gas = S.throttle === "manual" ? I.value("gas") : brake > 0.01 ? 0 : 1,
				recover = I.down("recover") || this.touchRecover;
			if (S.steering === "screen" && Math.hypot(...move) > 0.15)
				steer = E.clamp(
					E.angDiff(D.car.angle, Math.atan2(move[1], move[0])) * 2.5,
					-1,
					1,
				);
			if (I.lastDevice === "touch") {
				let target = 0;
				for (const t of this.touches.values()) {
					if (t.brake) brake = 1;
					else target = E.clamp((t.x - t.start) / 64, -1, 1);
				}
				this.touchSteer += (target - this.touchSteer) * 0.18;
				steer = this.touchSteer;
				gas = brake ? 0 : 1;
				if (
					S.touchAssist > 0 &&
					D.car.surface !== "road" &&
					Math.abs(D.car.speed) > 10
				) {
					const help = this.sim.ai(D);
					steer = steer * (1 - S.touchAssist) + help.steer * S.touchAssist;
				}
			}
			return M.intent({ steer, gas, brake, recover });
		}
		startSim(config) {
			this.testIntents = {};
			this.clearTouches();
			this.sim = new M.Simulation(this.world, {
				...config,
				tuning: this.peer || this.hub ? M.DEFAULTS : this.tuning,
			});
			this.lastConfig = { ...config };
			this.sim.unranked =
				!this.peer &&
				!this.hub &&
				(!!config.unranked ||
					this.devAI ||
					this.freeCamera ||
					Object.keys(M.DEFAULTS).some(
						(k) => this.tuning[k] !== M.DEFAULTS[k],
					));
			this.lastEvent = 0;
			this.presentation.lastEvent = 0;
			this.presentation.skids = [];
			this.presentation.lastFxTick = 0;
			this.sound.reset();
			this.presentation.cam = {
				x: this.sim.drivers[0].car.x,
				y: this.sim.drivers[0].car.y,
			};
			this.newBest = false;
			this.toastText = "";
			this.best = this.saves.best(this.sim, this.recordSettings());
			this.presentation.ghost = this.best?.ghost || null;
			this.game.resume();
			this.ui.hide();
			this.game.scene.pausable = !this.network;
			this.game.live = !!this.network;
			this.sound.music("drive");
			this.configureInputs();
		}
		clearSeats() {
			while (this.game.players.length > 1)
				this.game.removePlayer(this.game.players.at(-1));
			this.game.input.pad = "any";
			this.game.input.keysTo = null;
			this.game.input.half = null;
			this.game.input.use(BASE_KEYS);
		}
		startStandalone(mode) {
			if (mode === "duel" && this.game.settings.opponent === "couch")
				return this.ui.seats();
			this.clearSeats();
			this.couch = false;
			this.tourIndex = null;
			this.playMode = "play";
			const S = this.game.settings;
			this.startSim({
				mode,
				course: S.courseChoice,
				cars: [S.carChoice, S.carChoice === 4 ? 3 : 4],
				laps: S.eventLaps,
				target: S.scoreTarget,
				cap: S.scoreTarget === 50 ? 0 : 180,
				difficulty: S.difficulty,
			});
		}
		launchCouch() {
			const S = this.game.settings;
			let pads = [];
			try {
				pads = [...navigator.getGamepads()].filter((p) => p?.connected);
			} catch {}
			if (
				(S.seatMode === "pads" && pads.length < 2) ||
				(S.seatMode === "padkeys" && pads.length < 1)
			) {
				this.ui.toast(
					"Controller seats unavailable",
					"Connect the required pads, or choose Shared keyboard.",
				);
				return;
			}
			this.clearSeats();
			if (S.seatMode === "keyboard") {
				this.game.input.pad = null;
				this.game.addPlayer({ keys: "right" });
			} else if (S.seatMode === "padkeys") {
				this.game.input.pad = null;
				this.game.addPlayer({ pad: pads[0].index });
			} else {
				this.game.input.pad = pads[0].index;
				this.game.addPlayer({ pad: pads[1].index });
			}
			this.couch = true;
			this.tourIndex = null;
			this.playMode = "play";
			this.startSim({
				mode: "duel",
				course: S.courseChoice,
				cars: [S.carChoice, S.secondCar],
				target: S.scoreTarget,
				cap: S.scoreTarget === 50 ? 0 : 180,
				difficulty: S.difficulty,
			});
		}
		retry() {
			if (this.tourIndex !== null) return this.ui.tourIntro(this.tourIndex);
			this.playMode = "play";
			this.startSim(this.lastConfig);
		}
		beginTour(fresh = false) {
			this.clearSeats();
			this.couch = false;
			const n = Number(this.saves.data.tour) || 0;
			if (!fresh && n > 0 && n < M.TOUR.length) {
				this.ui.show("continue-tour", {
					kicker: "YOUR ROAD TOUR",
					title: "Welcome back to the county",
					text: "The crew saved your place at stop " + (n + 1) + ".",
					actions: [
						[
							"Continue road tour",
							() => {
								this.tourIndex = n;
								this.ui.tourIntro(n);
							},
						],
						["Start from the paddock", () => this.beginTour(true)],
						["Back", () => this.ui.back()],
					],
				});
			} else {
				this.tourIndex = 0;
				this.ui.tourIntro(0);
			}
		}
		startTourStep(index) {
			const t = M.TOUR[index];
			this.tourIndex = index;
			this.playMode = "play";
			this.startSim({
				mode: t.mode,
				goal: t.goal,
				course: t.course,
				cars: [t.car, 4],
				laps: t.laps || 1,
				target: 10,
				difficulty: "easy",
				cap: t.mode === "duel" ? 180 : 0,
			});
			if (t.mode === "explore")
				this.sim.setNavigation(this.world.courses[3].at(0));
			this.sound.voice();
		}
		nextTour(index) {
			const next = index + 1;
			this.saves.data.tour = next;
			this.saves.save();
			this.playMode = "menu";
			if (next >= M.TOUR.length) {
				this.tourIndex = null;
				this.ui.tourEnd();
			} else {
				this.tourIndex = next;
				this.ui.tourIntro(next);
			}
		}
		tourCue() {
			const t = M.TOUR[this.tourIndex],
				D = this.sim.drivers[0];
			if (!t) return "";
			if (t.goal === "stop")
				return D.maxSpeed < 25
					? "Release the brake. Let your motor gather a little speed."
					: "Now hold " +
							this.game.input.label("brake") +
							" until you stop. No reversing!";
			if (t.goal === "water")
				return D.splashed
					? "SPLASH! Back to your last gate. Hold Recover later to request a reset."
					: "Practice pond → · Follow the arrow into the blue water.";
			if (t.goal === "lead")
				return "PULL CLEAR · Twelve car lengths earns 1 point.";
			if (t.goal === "crash")
				return (
					"Hold " +
					this.game.input.label("recover") +
					" · Your opponent receives 2 points."
				);
			if (t.mode === "explore")
				return "PINE LODGE → · Follow the signed eastbound connector.";
			if (!D.progress.legal)
				return "Return toward the next marked gate. Recovery costs 5 seconds.";
			return (
				this.toastText ||
				t.title + " · Follow the chevrons; brake before the bend."
			);
		}
		navigation() {
			const t = this.tourIndex !== null ? M.TOUR[this.tourIndex] : null;
			if (t?.goal === "water") return { x: 1570, y: 3050 };
			if (t?.mode === "explore") return this.world.courses[3].at(0);
			if (!["free", "explore"].includes(this.sim.config.mode))
				return this.sim.course.gates[this.sim.drivers[0].progress.next];
			return null;
		}
		update(dt) {
			if (this.playMode === "boot") return;
			if (this.playMode === "menu") {
				this.sim.step([this.sim.ai(this.sim.drivers[0])], dt);
				if (this.sim.time > 180) this.titleSim();
			} else if (this.attract) {
				this.updateAttract(dt);
			} else if (this.playMode === "play") {
				if (this.freeCamera) {
					this.sim.step(
						this.sim.drivers.map((D, i) =>
							i === 0 ? { brake: 1 } : this.sim.ai(D),
						),
						dt,
					);
				} else
					this.sim.step(
						this.sim.drivers.map((D, i) =>
							i === 0 || this.couch ? this.readIntent(i) : this.sim.ai(D),
						),
						dt,
					);
				this.handleEvents();
				if (this.sim.phase === "finished" && !this.ui.screen)
					this.showResults();
				if (this.sim.config.mode === "free") {
					this.nearEntrance = null;
					const c = this.sim.drivers[0].car;
					for (let i = 0; i < this.world.courses.length; i++) {
						const C = this.world.courses[i],
							p = C.at(0);
						if (Math.hypot(c.x - p.x, c.y - p.y) < 100)
							this.nearEntrance = { index: i, course: C };
					}
					if (this.nearEntrance && this.game.input.pressed("confirm")) {
						this.game.settings.set("courseChoice", this.nearEntrance.index);
						this.game.pause();
						this.ui.show("entry", {
							kicker: "CIRCUIT ENTRANCE",
							title: this.nearEntrance.course.name,
							text: "Care for a timed run?",
							actions: [
								["Set up time trial here", () => this.ui.setup("trial")],
								["Keep exploring", () => this.ui.hide()],
							],
						});
					}
				}
			}
			if (this.playMode === "network") this.handleEvents();
			const title = this.playMode === "menu";
			this.presentation.update(this.sim, dt, {
				title,
				attract: this.attract,
				freeCamera: this.freeCamera,
				reduced: this.game.reduceMotion,
				remote: !!this.network && !this.network.isHost,
			});
			this.sound.update(
				this.sim,
				this.game.paused && !this.network,
				this.playMode === "ended",
			);
			if (this.toastText && this.game.real > this.toastUntil)
				this.toastText = "";
			this.ui.updateHud();
			const native = this.game.o.menu;
			native.items = this.network
				? [["Read-only diagnostics", () => this.ui.dev()]]
				: [
						["Restart this drive", () => this.retry()],
						["Route passport", () => this.ui.passport()],
						["Dev mode · pit bench", () => this.ui.dev()],
						["Back to title", () => this.toTitle()],
					];
		}
		handleEvents() {
			for (const e of this.sim.events) {
				if (e.id <= this.lastEvent) continue;
				this.lastEvent = e.id;
				if (e.type === "point")
					this.toast(
						(e.driver >= 0
							? this.driverName(e.driver) + " +" + e.points + " · "
							: "") + e.reason,
					);
				if (e.type === "lap")
					this.toast("LAP " + e.lap + " · " + M.formatTime(e.split));
				if (e.type === "penalty") this.toast("RECOVERY · +5 seconds");
				if (e.type === "discovery" && !this.hub) {
					this.saves.passport(e.course);
					this.toast(
						"PASSPORT STAMP · " +
							(M.COURSE_DATA.find((c) => c.id === e.course)?.name ||
								"Old airfield"),
					);
				}
				if (e.type === "drag-finish" && !this.hub) {
					if (!this.saves.data.drag || e.time < this.saves.data.drag.time) {
						this.saves.data.drag = { time: e.time, peak: e.peak };
						this.saves.save();
					}
					this.toast(
						"STRAIGHT RUN · " +
							M.formatTime(e.time) +
							" · peak " +
							Math.round(e.peak) +
							" units/s",
					);
				}
			}
		}
		draw(r) {
			if (this.playMode === "boot") return;
			this.presentation.draw(r, this.sim, {
				title: this.playMode === "menu",
				attract: this.attract,
				reduced: this.game.reduceMotion,
				ghost: this.game.settings.ghost && !this.attract,
				gateOverlay: this.overlays,
				collisionOverlay: this.overlays,
				dev: this.sim.unranked && !this.attract,
				navigation: this.playMode === "play" ? this.navigation() : null,
			});
		}
		toast(text) {
			this.toastText = text;
			this.toastUntil = this.game.real + 3.5;
		}
		prompt(action, label) {
			return this.game.input.label(action) + " " + label;
		}
		driverName(i) {
			if (this.hub) return this.hub.players[i]?.name || "Pace car";
			if (this.peer) return i === 0 ? "Host" : "Guest";
			return i === 0
				? this.couch
					? "Driver 1"
					: "You"
				: this.couch
					? "Driver 2"
					: "Pace car";
		}
		markDev() {
			if (!this.network && this.playMode !== "menu" && this.sim)
				this.sim.unranked = true;
		}
		showResults() {
			if (this.ui.screen === "results") return;
			if (!this.network && !this.attract)
				this.newBest = this.saves.finish(this.sim, this.recordSettings());
			this.ui.results();
		}
		toTitle() {
			if (this.hub) return;
			this.network?.dispose();
			this.network = null;
			this.peer?.close();
			this.peer = null;
			this.tourIndex = null;
			this.devAI = false;
			this.freeCamera = false;
			this.game.cam.free = null;
			this.overlays = false;
			this.game.live = false;
			this.game.resume();
			this.game.scene.pausable = true;
			this.clearSeats();
			this.playMode = "menu";
			this.idle = 0;
			this.tuning = { ...M.DEFAULTS };
			this.resettingTuning = true;
			for (const k of Object.keys(M.DEFAULTS))
				this.game.settings.set("dev_" + k, M.DEFAULTS[k]);
			this.resettingTuning = false;
			this.titleSim();
			this.ui.title();
			this.sound.music("title");
		}
		enterAttract() {
			if (this.attract || this.hub || this.network || this.playMode !== "menu")
				return;
			this.attract = true;
			this.attractSaved = {
				stack: this.ui._stack.slice(),
				sim: this.sim,
				paused: this.game.paused,
				focus: this.ui._focusAt(),
				tour: this.tourIndex,
			};
			this.ui.hide();
			this.game.resume();
			this.playMode = "attract";
			this.attractIndex = 0;
			this.attractTime = 0;
			this.attractScene();
		}
		attractScene() {
			const n = this.world.courses.length,
				i = this.attractIndex % (n + 2),
				course = i < n ? i : i === n ? 0 : 3,
				mode = i === n ? "duel" : i === 2 ? "explore" : "trial";
			this.sim = new M.Simulation(this.world, {
				course,
				mode,
				cars: [i % 5, 4],
				laps: 1,
				countdown: 0,
				difficulty: "normal",
				target: 3,
				cap: 30,
			});
			this.sim.phase = "running";
			if (mode === "explore")
				this.sim.setNavigation(this.world.courses[3].at(0));
			if (mode === "trial") {
				const gate = this.sim.course.gates.length - 1;
				this.sim.stage(gate, false);
				this.sim.drivers[0].progress.gatesPassed = gate;
			}
			this.presentation.cam = {
				x: this.sim.drivers[0].car.x,
				y: this.sim.drivers[0].car.y,
			};
			this.presentation.lastEvent = 0;
			this.sound.reset();
			this.attractTime = 0;
		}
		updateAttract(dt) {
			this.attractTime += dt;
			const inputs = this.sim.drivers.map((D) => this.sim.ai(D));
			if (this.sim.config.mode === "duel")
				inputs[1] = { brake: 1, recover: this.sim.score[0] > 0 };
			this.sim.step(inputs, dt);
			if (
				(this.sim.phase === "finished" && this.attractTime > 8) ||
				this.attractTime > (this.sim.config.mode === "explore" ? 50 : 22)
			) {
				this.attractIndex++;
				this.attractScene();
			}
		}
		exitAttract() {
			if (!this.attract) return;
			const old = this.attractSaved;
			this.attract = false;
			this.sim = old.sim;
			this.tourIndex = old.tour;
			this.playMode = "menu";
			this.idle = 0;
			this.ui._stack = old.stack;
			if (old.paused) this.game.pause("menu");
			else this.game.resume();
			this.ui._render();
			const f = this.ui._focusables()[old.focus];
			f?.focus();
			this.game.input.clear();
			this.sound.reset();
			this.sound.music("title");
		}
		onlineMenu() {
			if (!this.network) return;
			if (this.ui.screen) {
				this.ui.hide();
				this.game.resume();
				return;
			}
			this.ui.show("online-pause", {
				kicker: "THE RACE CONTINUES",
				title: "Live pit menu",
				text: "The other driver keeps moving. Your motor holds the brake while this menu is open.",
				actions: [
					["Back to the road", () => this.ui.hide()],
					["Settings", () => this.ui.show("settings")],
					["Read-only diagnostics", () => this.ui.dev()],
					...(!this.hub
						? [["Leave connection", () => this.closeConnection()]]
						: []),
				],
				back: () => this.ui.hide(),
			});
		}
		startHub(info) {
			this.hub = info;
			this.clearSeats();
			this.tourIndex = null;
			this.playMode = "network";
			const rng = AIHub.rng("course"),
				course = Math.floor(rng() * this.world.courses.length);
			this.startSim({
				mode: "duel",
				course,
				cars: [3, 4],
				target: 10,
				countdown: 0,
				difficulty: "normal",
				cap: info.limitMs / 1000,
			});
			this.sim.phase = "countdown";
			this.sim.lock = 3;
			this.network = new M.NetSession(this, { hub: info });
			this.game.live = true;
			this.game.scene.pausable = false;
			AIHub.probe(() => this.snapshot());
			AIHub.ready();
		}
		sessionEnded(reason) {
			this.playMode = "ended";
			this.game.input.clear();
			this.clearTouches();
			this.sound.stop();
			this.ui.hide();
			if (!this.hub)
				this.ui.show("session-end", {
					kicker: "CONNECTION ENDED",
					title: "The road will be here.",
					text: reason,
					actions: [["Back to multiplayer", () => this.closeConnection()]],
					back: () => this.closeConnection(),
				});
		}
		openConnection() {
			if (this.hub) return;
			this.signalIn = "";
			this.signalOut = "";
			this.signalStatus =
				"Host shares an invitation. Guest returns a reply. Both drivers then ready up.";
			this.playMode = "menu";
			this.showConnection();
		}
		showConnection() {
			const actions = [];
			if (this.peer?.opened) {
				actions.push([
					this.localReady
						? "Waiting for the other driver…"
						: "Ready · matched motors · " +
							this.world.courses[this.peer.config.course].name,
					() => this.readyPeer(),
				]);
			} else if (this.peer?.role === "host") {
				actions.push(["Accept reply", () => this.acceptReply()]);
			} else {
				actions.push(
					["Host · make invitation", () => this.createInvitation()],
					["Join · make reply", () => this.createReply()],
				);
			}
			if (this.signalOut)
				actions.push(
					["Copy description", () => this.copySignal()],
					["Save description file", () => this.exportSignal()],
				);
			if (!this.peer?.opened)
				actions.push([
					"Load description file",
					() => document.getElementById("signal-file").click(),
				]);
			actions.push(["Cancel connection", () => this.closeConnection()]);
			this.ui.show("connection", {
				kicker: "DIRECT TWO-DRIVER PURSUIT",
				title: this.peer?.opened
					? "Two motors, one road."
					: this.signalOut
						? "Pass it to the other driver"
						: "Meet on the country road",
				rows: !this.peer ? ["courseChoice"] : [],
				text:
					"Biscuit and Blue · first to 10 · three-minute cap · " +
					this.world.courses[
						this.peer?.config.course ?? this.game.settings.courseChoice
					].name,
				actions,
				back: () => this.closeConnection(),
			});
		}
		makePeer(role) {
			this.peer?.close();
			const config = {
				course: this.game.settings.courseChoice,
				cars: [3, 4],
				target: 10,
				cap: 180,
			};
			this.peer = new M.PeerTransport({
				role,
				config,
				stun: this.stun || "",
				onStatus: (s) => {
					this.signalStatus = s;
					const el = document.getElementById("signal-status");
					if (el) el.textContent = s;
				},
				onOpen: () => {
					this.signalStatus = "Connected. Both drivers must select Ready.";
					this.localReady = this.remoteReady = false;
					this.showConnection();
				},
				onMessage: (p) => this.peerMessage(p),
			});
			return this.peer;
		}
		async createInvitation() {
			const generation = ++this.signalGeneration;
			try {
				this.signalStatus = "Gathering complete invitation…";
				const p = this.makePeer("host");
				this.showConnection();
				this.signalOut = await p.offer();
				if (p === this.peer && generation === this.signalGeneration)
					this.showConnection();
			} catch (e) {
				if (generation !== this.signalGeneration) return;
				this.signalStatus = e.message;
				this.showConnection();
			}
		}
		async createReply() {
			const generation = ++this.signalGeneration;
			try {
				M.PeerTransport.parse(this.signalIn, "offer");
				const text = this.signalIn,
					p = this.makePeer("guest");
				this.signalStatus = "Gathering complete reply…";
				this.signalOut = await p.answer(text);
				if (p === this.peer && generation === this.signalGeneration)
					this.showConnection();
			} catch (e) {
				if (generation !== this.signalGeneration) return;
				this.signalStatus = e.message;
				this.showConnection();
			}
		}
		async acceptReply() {
			try {
				await this.peer.accept(this.signalIn);
				this.signalStatus = "Reply accepted. Connecting…";
				this.showConnection();
			} catch (e) {
				this.signalStatus = e.message;
				this.showConnection();
			}
		}
		peerMessage(p) {
			if (p?.t === "ready") this.peerReady(p);
			else if (p?.t === "start") this.peerStart(p);
			else if (p?.t === "closed") this.connectionLost(p.reason);
		}
		readyPeer() {
			if (!this.peer?.opened) return;
			this.localReady = true;
			this.peer.send(
				{ v: M.PROTOCOL, round: this.peerRound, t: "ready" },
				true,
			);
			if (this.peer.role === "host" && this.remoteReady) this.startPeerRound();
			else if (this.ui.screen === "connection") this.showConnection();
			else
				this.ui.show("rematch-wait", {
					kicker: "REMATCH",
					title: "Ready when you are.",
					text: "Waiting for the other driver to ready up.",
					actions: [["Leave connection", () => this.closeConnection()]],
					back: () => this.closeConnection(),
				});
		}
		peerReady(p) {
			if (!M.validPacket(p) || p.round !== this.peerRound) return;
			this.remoteReady = true;
			if (this.localReady && this.peer?.role === "host") this.startPeerRound();
			else if (this.ui.screen === "connection") {
				this.signalStatus = "Other driver is ready. Your turn!";
				this.showConnection();
			}
		}
		startPeerRound() {
			const config = {
				mode: "duel",
				...this.peer.config,
				laps: 2,
				countdown: 3,
				difficulty: "normal",
				seed: 1980,
			};
			this.peerRound++;
			this.peer.send(
				{ v: M.PROTOCOL, t: "start", round: this.peerRound, config },
				true,
			);
			this.startDirect(config, this.peerRound);
		}
		peerStart(p) {
			if (
				!this.peer ||
				this.peer.role !== "guest" ||
				!M.validPacket(p) ||
				p.t !== "start" ||
				p.round <= this.peerRound ||
				!p.config ||
				p.config.target !== 10 ||
				p.config.course !== this.peer.config.course ||
				JSON.stringify(p.config.cars) !== "[3,4]"
			)
				return;
			this.peerRound = p.round;
			this.startDirect(p.config, p.round);
		}
		startDirect(config, round) {
			this.network?.dispose();
			this.network = null;
			this.localReady = this.remoteReady = false;
			this.clearSeats();
			this.tourIndex = null;
			this.playMode = "network";
			this.networkEpoch = performance.now();
			this.startSim(config);
			this.network = new M.NetSession(this, { peer: this.peer, round });
			this.game.live = true;
			this.game.scene.pausable = false;
		}
		connectionLost(reason) {
			if (this.playMode === "network") {
				this.network?.dispose();
				this.network = null;
				this.sim.finish("Connection ended", null);
				this.sessionEnded(reason);
			} else {
				this.signalStatus = reason;
				this.showConnection();
			}
		}
		closeConnection() {
			if (this.hub) return;
			this.signalGeneration++;
			this.network?.dispose();
			this.network = null;
			this.peer?.close();
			this.peer = null;
			this.signalOut = "";
			this.signalIn = "";
			this.localReady = this.remoteReady = false;
			this.peerRound = 0;
			this.toTitle();
			this.ui.multiplayer();
		}
		async copySignal() {
			try {
				await navigator.clipboard.writeText(this.signalOut);
				this.signalStatus = "Copied. Share the complete description.";
			} catch {
				const out = document.getElementById("signal-out");
				out?.focus();
				out?.select();
				this.signalStatus =
					"Clipboard unavailable. The full description is selected; copy it manually or save a file.";
			}
			const el = document.getElementById("signal-status");
			if (el) el.textContent = this.signalStatus;
		}
		exportSignal() {
			const url = URL.createObjectURL(
					new Blob([this.signalOut], { type: "application/json" }),
				),
				a = document.createElement("a");
			a.href = url;
			a.download =
				this.peer?.role === "host"
					? "motley-invitation.json"
					: "motley-reply.json";
			a.click();
			setTimeout(() => URL.revokeObjectURL(url), 1000);
		}
		snapshot() {
			return {
				title: M.TITLE,
				version: M.VERSION,
				playMode: this.playMode,
				screen: this.ui.screen,
				attract: this.attract,
				idle: this.idle,
				tour: this.tourIndex,
				couch: this.couch,
				online: !!this.network,
				isHost: this.network?.isHost,
				me: this.network?.me,
				connected: !!this.peer?.opened,
				peerRound: this.peerRound,
				localReady: this.localReady,
				remoteReady: this.remoteReady,
				settings: {
					music: this.game.settings.music,
					glyphs: this.game.settings.glyphs,
					throttle: this.game.settings.throttle,
					steering: this.game.settings.steering,
				},
				device: this.game.input.lastDevice,
				padIndex: this.game.input.padIndex,
				sim: this.sim.snapshot(),
				drivers: this.sim.drivers.map((D) => ({
					car: D.spec.id,
					crashes: D.crashes,
					penalty: D.penalty,
					stopped: D.stopped,
					splashed: D.splashed,
					gates: D.progress.gatesPassed,
					next: D.progress.next,
					lap: D.progress.laps,
					legal: D.progress.legal,
					aiS: D.aiS,
					input: { ...D.lastIntent },
					speed: D.car.speed,
					slide: D.car.slide,
					surface: D.car.surface,
				})),
				unranked: this.sim.unranked,
				tuning: { ...this.sim.tuning },
				config: {
					mode: this.sim.config.mode,
					laps: this.sim.config.laps,
					target: this.sim.config.target,
					cap: this.sim.config.cap,
				},
				passport: this.saves.data.passport.slice(),
				errors: this.game.errors.map((e) => e.message),
			};
		}
		installDebug() {
			const snapshot = () => structuredClone(this.snapshot());
			this.game.debug = { snapshot };
			globalThis.__motor = Object.freeze({ snapshot, version: M.VERSION });
			if (new URLSearchParams(location.search).get("test") === "1")
				globalThis.__motorTest = {
					snapshot,
					advance: (ticks, ai = false) => {
						if (this.network)
							throw new Error("Online authority uses the match clock.");
						for (let i = 0; i < ticks; i++) {
							if (ai && ["play", "attract"].includes(this.playMode)) {
								this.testIntents = {};
								for (const D of this.sim.drivers) {
									this.testIntents[D.i] = this.sim.ai(D);
								}
								if (
									this.sim.config.goal === "stop" &&
									this.sim.drivers[0].maxSpeed > 35
								)
									this.testIntents[0] = { brake: 1 };
								if (this.sim.config.goal === "crash")
									this.testIntents[0] = { brake: 1, recover: true };
								if (this.sim.config.goal === "water") {
									const c = this.sim.drivers[0].car,
										target = Math.atan2(3050 - c.y, 1570 - c.x);
									this.testIntents[0] = {
										steer: E.clamp(E.angDiff(c.angle, target) * 3, -1, 1),
										gas: c.speed < 65 ? 1 : 0,
										brake: c.speed > 70 ? 0.6 : 0,
									};
								}
							}
							this.game.advance(M.DT, { draw: false });
							if (ai && this.sim.phase === "finished") break;
						}
						this.testIntents = {};
						this.game.advance(0, { draw: true });
						return snapshot();
					},
					intent: (i, value) => {
						this.testIntents[i] = M.intent(value);
					},
					clearIntents: () => {
						this.testIntents = {};
					},
					nextAI: (i) => this.sim.ai(this.sim.drivers[i]),
					networkQuality: (delay, loss) => {
						if (this.peer) {
							this.peer.delay = E.clamp(delay, 0, 600);
							this.peer.drop = E.clamp(loss, 0, 0.25);
						}
					},
					state: () => ({
						signalOut: this.signalOut,
						signalStatus: this.signalStatus,
						netSeq: this.network?.seq,
						remoteSeq: this.network?.inputSeq.slice(),
						audio: this.sound.A.ctx
							? {
									ready: this.sound.A.ready,
									music: this.sound.A.musicVolume,
									master: this.sound.A.volume,
									motor: !!this.sound.motor,
								}
							: null,
					}),
				};
		}
	}
	M.App = App;
	globalThis.addEventListener(
		"DOMContentLoaded",
		() => {
			new App();
		},
		{ once: true },
	);
})(MM, My3D2dge);
