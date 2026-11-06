((M, E) => {
	const fmt = (t) => {
		if (!Number.isFinite(t)) return "—";
		const m = Math.floor(t / 60),
			s = Math.floor(t % 60),
			d = Math.floor((t * 100) % 100);
		return (
			String(m).padStart(2, "0") +
			":" +
			String(s).padStart(2, "0") +
			"." +
			String(d).padStart(2, "0")
		);
	};
	M.formatTime = fmt;
	class MotorShell extends E.Shell {
		constructor(app) {
			super(app.game, {
				tv: false,
				theme: {
					accent: "#f3d28a",
					ink: "#fff3d5",
					paper: "#203b3eee",
					muted: "#b6ccbe",
					line: "#6d89806b",
					font: "Arial, Helvetica, sans-serif",
					titleFont: "Arial Black, Arial, sans-serif",
					scale: () =>
						innerWidth < 1000 ? 1 : E.clamp(innerWidth / 1440, 0.8, 1.45),
				},
				screens: {
					pause: { kicker: "PIT STOP", text: "A moment to catch your breath." },
					help: {
						kicker: "THE COUNTY RULES",
						title: "Finesse counts!",
						sections: [
							[
								"Driving",
								"Acceleration is automatic. Brake before a bend; release to accelerate. Grass slows you. Gravel slides. Water and hard solid impacts are crashes.",
							],
							[
								"Time trial",
								"Cross every numbered gate forward, in order. Recovery costs 5 seconds. Two-lap quick runs and classic five-lap events are separate records.",
							],
							[
								"Pursuit",
								"Opponent crash: 2 points. Twelve lengths clear: 1 point. Both crash: no points. Contact changes motion but never scores. Both restart at the leader’s last gate.",
							],
							[
								"Free drive",
								"Every road connects. Look for numbered circuit flags and the old airfield signs. Cross the airfield start marker heading west for a timed straight run.",
							],
						],
					},
				},
			});
			this.app = app;
			this._installHud();
		}
		_focusables() {
			return this.root
				? [
						...this._els.scr.querySelectorAll(
							".esh-sh button:not(:disabled), .esh-sh input:not(:disabled):not([type=file]), .esh-sh textarea",
						),
					]
				: [];
		}
		_step() {
			const f = typeof document !== "undefined" ? document.activeElement : null;
			if (
				f &&
				this.root?.contains(f) &&
				(f.tagName === "TEXTAREA" || f.type === "text")
			) {
				if (this._game.input.pressed("cancel")) this.back();
				this._game.input.consumeAll();
				return;
			}
			super._step();
		}
		_render() {
			super._render();
			if (!this.root) return;
			const name = this.screen;
			this.root.dataset.screen = name || "play";
			const sh = this._els.scr.querySelector(".esh-sh");
			if (!sh) return;
			sh.dataset.screen = name;
			this._els.scr.querySelectorAll("button").forEach((b) => {
				if (b.textContent && !b.hasAttribute("aria-label"))
					b.setAttribute("aria-label", b.textContent);
				b.addEventListener("pointerenter", () =>
					b.focus({ preventScroll: true }),
				);
			});
			const app = this.app;
			if (!app) return;
			if (name === "title") {
				const h = sh.querySelector("h1");
				h.textContent = "AUTO\nMOTLEY\nMOTOR";
				const badge = this._el("div", "motor-seal");
				badge.innerHTML =
					"<span>FIVE ROADS</span><b>ONE LOVELY<br>COUNTY.</b><span>TAKE THE SCENIC LINE ↗</span>";
				sh.appendChild(badge);
				const strip = this._el(
					"div",
					"motor-edition",
					"A NORTH-UP COUNTRY RACER  /  NO. 01",
				);
				sh.appendChild(strip);
			}
			if (["setup", "tour-intro"].includes(name))
				this.addPreview(
					sh,
					app.game.settings.courseChoice,
					app.game.settings.carChoice,
				);
			if (name === "connection") this.addConnection(sh);
		}
		_installHud() {
			if (!this.root) return;
			const h = this._el("div", "motor-hud");
			this.hudRoot = h;
			h.innerHTML =
				'<div class="motor-top"><div class="course-label"><span id="hud-mode"></span><b id="hud-course"></b><small id="hud-lap"></small></div><div id="hud-score"></div><div class="clock-label"><span id="hud-clock-label">ELAPSED</span><b id="hud-time"></b><small id="hud-best"></small></div></div><div class="motor-speed"><b id="hud-speed">0</b><span>ROAD SPEED</span><small id="hud-surface"></small></div><div class="motor-map-wrap"><canvas id="motor-map" width="240" height="172"></canvas><span id="hud-map-label"></span></div><div id="motor-cue"></div><div id="motor-countdown"></div><div id="motor-demo">DEMO <span>Any input takes the wheel</span></div><button id="motor-recover">HOLD TO RECOVER</button><div id="motor-prompts"></div>';
			this.root.appendChild(h);
			this.map = h.querySelector("canvas");
			const button = h.querySelector("#motor-recover");
			button.onpointerdown = (e) => {
				e.preventDefault();
				if (e.isTrusted) button.setPointerCapture(e.pointerId);
				this.app.touchRecover = true;
			};
			for (const ev of ["pointerup", "pointercancel", "lostpointercapture"])
				button.addEventListener(ev, () => (this.app.touchRecover = false));
			button.onkeydown = (e) => {
				if (e.code === "Space" || e.code === "Enter")
					this.app.touchRecover = true;
			};
			button.onkeyup = () => (this.app.touchRecover = false);
			this.labels = {};
			for (const e of h.querySelectorAll("[id]")) this.labels[e.id] = e;
		}
		setText(key, value) {
			const e = this.labels[key];
			if (e && e.textContent !== String(value)) e.textContent = String(value);
		}
		addPreview(sh, course, car) {
			const C = this.app.world.courses[course],
				spec = M.CARS[car],
				box = sh.firstElementChild,
				preview = this._el("div", "motor-preview");
			const caption = this._el("div", "motor-preview-caption");
			caption.innerHTML = "<span>THE ROAD</span><b></b><small></small>";
			caption.querySelector("b").textContent = C.name;
			caption.querySelector("small").textContent = C.sub;
			const cv = this._el("canvas");
			cv.width = 480;
			cv.height = 220;
			const mock = {
				course: C,
				drivers: [{ i: 0, spec, car: C.at(20), progress: { next: 1 } }],
			};
			this.app.presentation.minimap(cv, mock, false);
			const card = this._el("div", "motor-car-card");
			card.innerHTML =
				'<div class="motor-car-number">' +
				String(car + 1).padStart(2, "0") +
				"</div><div><span>YOUR MOTOR · " +
				spec.id.toUpperCase() +
				"</span><b>" +
				spec.name +
				"</b><p>" +
				spec.about +
				"</p></div>";
			card.style.setProperty("--car", spec.color);
			const bars = this._el("div", "motor-bars");
			["SPEED", "PICKUP", "CORNERING"].forEach((label, i) => {
				const row = this._el("div");
				row.innerHTML =
					"<span>" +
					label +
					'</span><div><i style="width:' +
					spec.bars[i] * 10 +
					"%;background:" +
					spec.color +
					'"></i></div>';
				bars.appendChild(row);
			});
			preview.append(caption, cv, card, bars);
			box.classList.add("motor-setup-box");
			box.appendChild(preview);
		}
		refreshPreview() {
			if (!["setup", "tour-intro"].includes(this.screen)) return;
			const sh = this._els.scr.querySelector(".esh-sh");
			sh?.querySelector(".motor-preview")?.remove();
			if (sh)
				this.addPreview(
					sh,
					this.app.game.settings.courseChoice,
					this.app.game.settings.carChoice,
				);
		}
		title() {
			this.hide();
			this.show("title", {
				kicker: "MOTLEY COUNTY MOTOR CLUB  /  EST. 1980-ISH",
				name: M.TITLE,
				subtitle: "Little cars. Lovely roads. Big mistakes.",
				actions: [
					["Start road tour", () => this.app.beginTour()],
					["Quick play", () => this.quick()],
					["Multiplayer", () => this.multiplayer()],
					["Settings", () => this.show("settings")],
					["About & credits", () => this.about(0)],
				],
				meta: ["5 CIRCUITS", "5 MOTORS", "1–2 DRIVERS"],
				footer: "Brake before the bend. Release to accelerate.",
				back: () => {},
			});
		}
		quick() {
			this.show("quick", {
				kicker: "EVERY ROAD IS OPEN",
				title: "Pick your pleasure",
				text: "All cars and courses are available from the first green light.",
				actions: [
					["Time trial", () => this.setup("trial")],
					["Pursuit the pace car", () => this.setup("duel")],
					["Free drive & passport", () => this.setup("free")],
					["Back", () => this.back()],
				],
			});
		}
		setup(mode) {
			this.app.pendingMode = mode;
			const rows = ["courseChoice", "carChoice"];
			if (mode === "trial") rows.push("eventLaps");
			if (mode === "duel") rows.push("opponent", "scoreTarget", "difficulty");
			this.show("setup", {
				kicker:
					mode === "trial"
						? "YOU AGAINST THE CLOCK"
						: mode === "free"
							? "TAKE THE ROAD LESS HURRIED"
							: "A LITTLE FRIENDLY PRESSURE",
				title:
					mode === "trial"
						? "Time trial"
						: mode === "free"
							? "Free drive"
							: "Pursuit duel",
				text:
					mode === "trial"
						? "Every gate, in order. Recovery adds 5 seconds."
						: mode === "free"
							? "Find five circuit entrances and the old airfield. Your passport saves locally."
							: "Opponent crash +2. Twelve lengths clear +1. Shared camera, proper pressure.",
				rows,
				actions: [
					["Let’s drive", () => this.app.startStandalone(mode)],
					["Back", () => this.back()],
				],
				footer:
					mode === "free"
						? "No race rules. Explore, stop, turn around. Make yourself at home."
						: "All controls use the same car. Auto acceleration is on by default.",
			});
		}
		multiplayer() {
			this.show("multiplayer", {
				kicker: "GOOD COMPANY, GOOD CORNERING",
				title: "Bring a second driver",
				text: "Pursuit races use one shared view. Race matched Biscuit and Blue motors online.",
				actions: [
					[
						"Couch duel",
						() => {
							this.app.game.settings.set("opponent", "couch");
							this.setup("duel");
						},
					],
					["Direct connection", () => this.app.openConnection()],
					[
						"How AI Hub works",
						() =>
							this.show("hub-help", {
								kicker: "AI HUB SESSIONS",
								title: "The Hub takes the wheel",
								text: "Import this HTML into AI Hub, then start a session for one or two drivers. The Hub handles the lobby, names, countdown and transport. One driver races the pace car; two drivers share the same authoritative world.",
								actions: [["Back", () => this.back()]],
							}),
					],
					["Back", () => this.back()],
				],
			});
		}
		seats() {
			const s = this.app.game.settings;
			this.show("seats", {
				kicker: "COUCH PURSUIT",
				title: "Who’s taking which wheel?",
				text: "Both drivers share the road and camera. A disconnected controller brakes its own car.",
				rows: ["seatMode", "secondCar"],
				sections: [
					[
						"Shared keyboard",
						"Driver 1: A/D steer, S or Space brake, W manual throttle, hold R recover. Driver 2: ←/→ steer, ↓ brake, ↑ manual throttle, hold / recover.",
					],
					[
						"Controller seats",
						"Two pads: pad 1 and pad 2. Pad + keys: pad 1 is driver 2, WASD is driver 1. L2 brakes, R2 is manual throttle, Triangle recovers.",
					],
				],
				actions: [
					["Seats confirmed · start", () => this.app.launchCouch()],
					["Back", () => this.back()],
				],
			});
		}
		tourIntro(index) {
			const t = M.TOUR[index];
			this.app.game.settings.set("courseChoice", t.course);
			this.app.game.settings.set("carChoice", t.car);
			this.hide();
			this.show("tour-intro", {
				kicker:
					"THE ROAD TOUR  /  " +
					String(index + 1).padStart(2, "0") +
					" OF " +
					M.TOUR.length,
				title: t.title,
				text: t.text,
				actions: [
					["Take the wheel", () => this.app.startTourStep(index)],
					["Skip this stop", () => this.app.nextTour(index)],
					["Back to title", () => this.app.toTitle()],
				],
				footer:
					"A complete little county outing. About 12–18 minutes at a first-time pace.",
			});
		}
		results() {
			const app = this.app,
				s = app.sim,
				D = s.drivers[0],
				duel = s.drivers.length === 2,
				online = app.playMode === "network",
				tour = app.tourIndex !== null;
			const title = duel
				? s.winner === null
					? "Honours even!"
					: (online
							? app.driverName(s.winner)
							: s.winner === 0
								? "You"
								: app.couch
									? "Driver 2"
									: "The pace car") + " takes it!"
				: "Lovely driving!";
			const stats = duel
				? [
						[s.score[0] + " : " + s.score[1], "FINAL SCORE"],
						[s.exchange, "EXCHANGES"],
						[fmt(s.clock), "MATCH TIME"],
					]
				: [
						[fmt(s.time + D.penalty), "TOTAL TIME"],
						[D.penalty + "s", "RECOVERY PENALTY"],
						[D.progress.laps, "VALID LAPS"],
					];
			let actions;
			if (tour)
				actions = [
					["On to the next road", () => app.nextTour(app.tourIndex)],
					["Try this stop again", () => this.tourIntro(app.tourIndex)],
					["Back to title", () => app.toTitle()],
				];
			else if (online)
				actions = app.hub
					? [{ label: "Round complete · waiting for Hub", disabled: true }]
					: [
							["Ready for rematch", () => app.readyPeer(true)],
							["Leave connection", () => app.closeConnection()],
						];
			else
				actions = [
					["Drive it again", () => app.retry()],
					[
						"Change road or car",
						() => {
							app.playMode = "menu";
							this.setup(app.lastConfig.mode);
						},
					],
					["Back to title", () => app.toTitle()],
				];
			this.hide();
			this.show("results", {
				kicker: s.unranked
					? "UNRANKED · DEV TOOLS USED"
					: app.newBest
						? "A NEW PERSONAL BEST!"
						: duel
							? "THE CHEQUERED FLAG"
							: "A ROAD WELL TRAVELLED",
				title,
				text: s.resultReason + (duel ? "" : " · " + s.course.name),
				stats,
				medals: duel
					? undefined
					: [
							["CLEAN RUN", D.crashes === 0],
							["GOLD", s.time + D.penalty < s.course.medal[0] * s.config.laps],
							[
								"SILVER",
								s.time + D.penalty < s.course.medal[1] * s.config.laps,
							],
						],
				sections:
					!duel && D.progress.splits.length
						? [
								[
									"Lap splits",
									D.progress.splits
										.map((v, i) => i + 1 + ". " + fmt(v))
										.join("   "),
								],
							]
						: undefined,
				actions,
				back: () => {
					if (!online) app.toTitle();
				},
			});
		}
		tourEnd() {
			this.hide();
			this.show("tour-end", {
				kicker: "MOTLEY COUNTY MOTOR CLUB",
				title: "You know the roads now.",
				text: "Every bend has a story, and you’ve brought a few of your own. The crew salutes your light touch, your brave lines, and your very memorable splash. Come back any time!",
				emblem: "⚑",
				stats: [
					[5, "CIRCUITS"],
					[5, "MOTORS"],
					["YOU", "COUNTY DRIVER"],
				],
				actions: [
					["Take another road tour", () => this.app.beginTour(true)],
					["Quick play", () => this.quick()],
					["Free drive", () => this.setup("free")],
					["Back to title", () => this.app.toTitle()],
				],
			});
		}
		passport() {
			const data = this.app.saves.data;
			this.show("passport", {
				kicker: "YOUR COUNTY PASSPORT",
				title: data.passport.length + " / 6 places found",
				text: "Drive through the striped circuit entrances to collect a stamp. The old airfield has one of its own.",
				medals: [
					...M.COURSE_DATA.map((c) => [c.name, data.passport.includes(c.id)]),
					["OLD AIRFIELD", data.passport.includes("airfield")],
				],
				sections: [
					[
						"Straight-run best",
						data.drag
							? fmt(data.drag.time) +
								" · peak " +
								Math.round(data.drag.peak) +
								" game units/s"
							: "Follow the old airfield signs south of Pine Lodge. Start at the east end; race west.",
					],
				],
				actions: [["Back to the road", () => this.back()]],
			});
		}
		dev(page = 0) {
			const app = this.app;
			if (app.network) {
				this.show("diagnostics", {
					kicker: "COMPETITIVE SESSION",
					title: "Read-only pit board",
					text: "Live balance changes are disabled during online play.",
					sections: [
						[
							"Authority",
							app.network.isHost
								? "This copy simulates both cars."
								: "This copy follows host snapshots.",
						],
						[
							"State",
							JSON.stringify({
								tick: app.sim.tick,
								phase: app.sim.phase,
								exchange: app.sim.exchange,
								score: app.sim.score,
							}),
						],
					],
					actions: [["Back", () => this.back()]],
				});
				return;
			}
			const groups = [
					["speed", "accel", "brake", "steer"],
					["roadGrip", "grassGrip", "gravelGrip", "crash"],
					["ai", "lead", "target"],
				],
				rows = groups[page].map((k) => "dev_" + k);
			this.show("dev", {
				kicker: "THE PIT BENCH  /  " + (page + 1) + " OF 3",
				title: "Live tuning",
				text: "Changing a slider or using a tool marks this run UNRANKED. Tan and blue always stay mechanically identical.",
				rows,
				sections: [
					[
						"Seed & state",
						String(app.sim.config.seed) +
							" · tick " +
							app.sim.tick +
							" · " +
							app.sim.phase,
					],
				],
				actions: [
					["Next tuning page", () => this.dev((page + 1) % 3)],
					[
						"AI driving: " + (app.devAI ? "on" : "off"),
						() => {
							app.devAI = !app.devAI;
							app.markDev();
							this.dev(page);
						},
					],
					[
						"Invulnerability: " + (app.sim.config.invincible ? "on" : "off"),
						() => {
							app.sim.config.invincible = !app.sim.config.invincible;
							app.markDev();
							this.dev(page);
						},
					],
					[
						"Gate & collision overlays: " + (app.overlays ? "on" : "off"),
						() => {
							app.overlays = !app.overlays;
							this.dev(page);
						},
					],
					[
						"Free camera: " + (app.freeCamera ? "on" : "off"),
						() => {
							app.freeCamera = !app.freeCamera;
							app.game.cam.free = app.freeCamera
								? { keys: true, speed: 350, edge: 0 }
								: null;
							app.markDev();
							this.dev(page);
						},
					],
					[
						"Restart at last gate",
						() => {
							app.markDev();
							app.sim.stage(app.sim.drivers[0].progress.lastGate);
							this.hide();
						},
					],
					[
						"Course / car selection",
						() => {
							app.markDev();
							this.setup(app.sim.config.mode === "duel" ? "duel" : "trial");
						},
					],
					[
						"Finish current tour stop",
						() => {
							app.markDev();
							app.sim.finish("Dev stop complete", 0);
							this.hide();
							app.showResults();
						},
					],
					[
						"Reset tuning defaults",
						() => {
							for (const k of Object.keys(M.DEFAULTS))
								app.game.settings.set("dev_" + k, M.DEFAULTS[k]);
							this.dev(page);
						},
					],
					["Back", () => this.back()],
				],
			});
		}
		about(page = 0) {
			const R = M.REPORT,
				S = R.sourceInformation,
				license = M.ENGINE_LICENSE;
			const pages = [
				{
					title: "Source information",
					kicker: "ABOUT / 01",
					sections: [
						[
							"The inspiration",
							S.source + "\nPlan: " + S.plan + "\nBuild date: " + S.date,
						],
						["The game", S.genre + " · " + S.perspective],
						["Technology", S.tech],
						["Research", S.research],
					],
				},
				{
					title: "Made of code",
					kicker: "ABOUT / 02",
					sections: [
						["Art direction", S.artDirection],
						["Animation", S.animation],
						["Audio", S.audio],
						["Online", S.online],
					],
				},
				{
					title: "Build provenance",
					kicker: "ABOUT / 03",
					sections: [
						["Environment", S.environment],
						["Model", S.model],
						["Testing permitted", S.testing],
						["Usage", S.usage],
						[
							"Unconfirmed",
							"Physical controller, real touch device, TV, listening, real iOS, and cross-NAT internet connectivity: unknown.",
						],
					],
				},
				{
					title: "Testing feedback",
					kicker: "BUILD INTERVIEW / 04",
					sections: R.testingFeedback.map((v, i) => [
						[
							"Issues found",
							"Critical / game breaking",
							"Most helpful test",
							"Least helpful test",
						][i],
						v,
					]),
				},
				{
					title: "Engine feedback",
					kicker: "BUILD INTERVIEW / 05",
					sections: R.engineFeedback
						.slice(0, 3)
						.map((v, i) => [
							[
								"What worked best",
								"Where I got stuck",
								"Most important new system",
							][i],
							v,
						]),
				},
				{
					title: "Engine feedback, continued",
					kicker: "BUILD INTERVIEW / 06",
					sections: R.engineFeedback
						.slice(3)
						.map((v, i) => [
							["Hardest engine aspect", "Engine changes", "One desired change"][
								i
							],
							v,
						]),
				},
				{
					title: "Prompt feedback",
					kicker: "BUILD INTERVIEW / 07",
					sections: R.promptFeedback.map((v, i) => [
						[
							"What I liked",
							"What was confusing",
							"Hardest task",
							"Suggested change",
						][i],
						v,
					]),
				},
				{
					title: "Credits & notices",
					kicker: "MADE FOR THE SCENIC ROUTE / 08",
					sections: [
						[
							"Original game",
							M.TITLE +
								" · original county, vehicles, code, music and procedural art created for this build. Inspired by Auto Racing (Mattel / APh, 1980; Larry Zwick). No original game art, music or code reused.",
						],
						["Engine", "my-3D2dge 0.89.1 · Michael Crosato · MIT"],
						[
							"Online client",
							"AI Hub Session Protocol 1 · official unmodified client 1.4.0",
						],
						[
							"Research",
							"Original instructions and corrected history: history.blueskyrangers.com. Reference illustrations are not embedded in the game.",
						],
					],
				},
				{ title: "Engine license", kicker: "MIT LICENSE / 09", text: license },
			];
			const p = pages[page % pages.length];
			this.show("about", {
				...p,
				actions: [
					["Next page", () => this.about((page + 1) % pages.length)],
					[
						"Previous page",
						() => this.about((page + pages.length - 1) % pages.length),
					],
					["Back", () => this.back()],
				],
				back: () => {
					this._stack = this._stack.filter((t) => t.name !== "about");
					this._render();
				},
			});
		}
		addConnection(sh) {
			const app = this.app,
				box = sh.firstElementChild,
				area = this._el("div", "motor-connection");
			const info = this._el(
				"p",
				"esh-m",
				"No microphone or camera is used. Both drivers need the same game build. Direct connections may need STUN or TURN across some networks; cross-NAT connectivity is not guaranteed.",
			);
			area.appendChild(info);
			if (app.signalOut) {
				const label = this._el(
						"label",
						"motor-field-label",
						app.peer?.role === "guest"
							? "SEND THIS REPLY TO THE HOST"
							: "SEND THIS INVITATION TO THE OTHER DRIVER",
					),
					out = this._el("textarea");
				out.id = "signal-out";
				out.value = app.signalOut;
				out.readOnly = true;
				out.setAttribute(
					"aria-label",
					"Complete connection description to share",
				);
				area.append(label, out);
			}
			if (!app.peer?.opened) {
				const label = this._el(
						"label",
						"motor-field-label",
						app.peer?.role === "host"
							? "PASTE THE OTHER DRIVER’S REPLY"
							: "PASTE A HOST INVITATION",
					),
					input = this._el("textarea");
				input.id = "signal-in";
				input.value = app.signalIn || "";
				input.placeholder = "Paste the complete JSON description here";
				input.setAttribute("aria-label", "Connection invitation or reply");
				input.oninput = () => (app.signalIn = input.value);
				area.append(label, input);
				const stunLabel = this._el(
						"label",
						"motor-field-label",
						"OPTIONAL STUN URL (EMPTY USES DIRECT CANDIDATES)",
					),
					stun = this._el("input");
				stun.type = "text";
				stun.id = "signal-stun";
				stun.value = app.stun || "";
				stun.placeholder = "stun:your-server:port";
				stun.oninput = () => (app.stun = stun.value);
				area.append(stunLabel, stun);
			}
			const file = this._el("input");
			file.type = "file";
			file.accept = ".json,.txt";
			file.id = "signal-file";
			file.hidden = true;
			file.onchange = async () => {
				const f = file.files[0];
				if (f) {
					if (f.size > 100000) {
						app.signalStatus = "Description file is too large.";
					} else app.signalIn = await f.text();
					app.showConnection();
				}
			};
			area.appendChild(file);
			const status = this._el(
				"div",
				"motor-signal-status",
				app.signalStatus ||
					"Choose Host or Join. Invitations are full descriptions, not room codes.",
			);
			status.id = "signal-status";
			status.setAttribute("role", "status");
			area.appendChild(status);
			const btns = box.querySelector(".esh-btns");
			box.insertBefore(area, btns);
		}
		updateHud() {
			const app = this.app,
				s = app.sim;
			if (!this.hudRoot || !s) return;
			const active = !this.screen || app.attract;
			this.hudRoot.hidden = !active;
			if (!active) return;
			const D = s.drivers[0],
				c = D.car,
				duel = s.drivers.length === 2,
				free = ["free", "explore"].includes(s.config.mode),
				touch = app.game.input.lastDevice === "touch";
			this.setText(
				"hud-mode",
				app.attract
					? "MOTLEY COUNTY MOTOR CLUB"
					: app.tourIndex !== null
						? "ROAD TOUR · STOP " + (app.tourIndex + 1) + " / " + M.TOUR.length
						: free
							? "TAKE THE SCENIC LINE"
							: duel
								? "PURSUIT DUEL"
								: "TIME TRIAL",
			);
			this.setText("hud-course", s.course.name);
			this.setText(
				"hud-lap",
				free
					? app.saves.data.passport.length + " / 6 PASSPORT STAMPS"
					: duel
						? "FIRST TO " +
							s.config.target +
							" · " +
							(app.network ? "ONLINE" : "SHARED ROAD")
						: "LAP " +
							Math.min(s.config.laps, D.progress.laps + 1) +
							" / " +
							s.config.laps +
							" · GATE " +
							D.progress.next +
							" / " +
							(s.course.gates.length - 1),
			);
			this.setText(
				"hud-time",
				duel
					? s.config.cap
						? fmt(Math.max(0, s.config.cap - s.clock))
						: fmt(s.clock)
					: fmt(s.time + D.penalty),
			);
			this.setText(
				"hud-clock-label",
				duel ? "TIME LEFT" : free ? "OUT FOR A DRIVE" : "ELAPSED",
			);
			const best = app.best;
			this.setText(
				"hud-best",
				s.unranked
					? "UNRANKED"
					: free
						? s.drag
							? "STRAIGHT RUN LIVE"
							: s.dragBest
								? "STRAIGHT " + fmt(s.dragBest.time)
								: "NO RUSH."
						: duel
							? "CRASH +2 · AHEAD +1"
							: best
								? "BEST " + fmt(best.time)
								: D.penalty
									? "RECOVERY +" + D.penalty + "s"
									: "YOUR FIRST RUN",
			);
			this.setText(
				"hud-score",
				duel
					? app.driverName(0) +
							"  " +
							s.score[0] +
							" : " +
							s.score[1] +
							"  " +
							app.driverName(1)
					: "",
			);
			this.setText("hud-speed", Math.round(Math.max(0, c.speed) * 0.6));
			this.setText(
				"hud-surface",
				D.crashT
					? "RECOVERING"
					: c.surface === "road"
						? "GOOD GRIP"
						: c.surface === "grass"
							? "GRASS · SLOW"
							: c.surface === "gravel"
								? "GRAVEL · EASY HANDS"
								: c.surface === "water"
									? "DEEP WATER"
									: "ON THE ROAD",
			);
			const next = s.course.gates[D.progress.next];
			this.setText(
				"hud-map-label",
				free
					? "MOTLEY COUNTY · NORTH ↑"
					: D.progress.wrong
						? "TURN AROUND ↶"
						: !D.progress.legal
							? "RETURN TO THE ROUTE"
							: s.course.region + " · NORTH ↑",
			);
			let cue = "";
			if (app.tourIndex !== null) cue = app.tourCue();
			else if (free)
				cue = s.drag
					? "KEEP IT STRAIGHT!"
					: app.nearEntrance
						? "CIRCUIT " +
							(app.nearEntrance.index + 1) +
							" · " +
							app.nearEntrance.course.name +
							" · " +
							app.prompt("confirm", "race here")
						: app.toastText ||
							"Find the circuit flags. Follow old airfield signs south of Pine Lodge.";
			else if (!D.progress.legal)
				cue =
					"NEXT GATE MISSED? Hold " +
					app.game.input.label("recover") +
					" to return to your last gate.";
			else if (D.progress.wrong)
				cue = "WRONG WAY · Turn back toward the chevrons.";
			else
				cue =
					app.toastText ||
					(!touch
						? app.prompt("brake", "brake before the bend")
						: "Drag left to steer · Hold right to brake");
			this.setText("motor-cue", cue);
			let lock = s.lock;
			if (app.hub) {
				const timeline = AIHub.time();
				if (timeline < 0)
					lock = Number.isFinite(timeline) ? -timeline / 1000 : 3;
			}
			const countdown = this.labels["motor-countdown"];
			countdown.hidden = !(
				(app.attract && s.phase === "finished") ||
				s.phase === "countdown" ||
				s.phase === "exchange" ||
				(app.hub && AIHub.time() < 0)
			);
			countdown.classList.toggle(
				"motor-finish",
				app.attract && s.phase === "finished",
			);
			countdown.textContent =
				app.attract && s.phase === "finished"
					? "FINISH!\n" + fmt(s.time)
					: s.phase === "exchange"
						? "RESET\n" + Math.max(1, Math.ceil(lock))
						: String(Math.max(1, Math.ceil(lock)));
			this.labels["motor-demo"].hidden = !app.attract;
			const recover = this.labels["motor-recover"];
			recover.hidden = !(
				touch &&
				(D.crashT > 0 || D.stuck > 2 || !D.progress.legal)
			);
			recover.textContent = D.crashT > 0 ? "RECOVERING…" : "HOLD TO RECOVER";
			this.setText(
				"motor-prompts",
				touch
					? ""
					: app.network
						? app.prompt("pause", "live menu · race continues")
						: app.prompt("recover", "hold to recover") +
							"     " +
							app.prompt("pause", "pit stop"),
			);
			if (app.game.real - (this.lastMap || -1) > 0.1) {
				this.lastMap = app.game.real;
				app.presentation.minimap(this.map, s, free);
			}
			this.root.dataset.touch = touch ? "true" : "false";
		}
	}
	M.MotorShell = MotorShell;
})(MM, My3D2dge);
