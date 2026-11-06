/* GAME START — adapted from SHOOTER's overhead x/y scene and fixed-step shell. */
(() => {
	"use strict";
	const E = My3D2dge,
		SIM = RuinSim,
		C = RuinContent,
		hasDOM = typeof document !== "undefined";
	const embedded = typeof AIHub !== "undefined" && AIHub.active;
	let world = null,
		online = null,
		attract = false,
		fromAttract = false,
		ui,
		controls,
		editor,
		visuals,
		sound,
		menuMode = "title",
		idleAt = 0,
		lastHUD = -1,
		lastMode = "",
		modeAt = 0,
		modePresented = false,
		lastSector = -1,
		resultWorld = null,
		captionUntil = 0,
		captionText = "",
		lastLesson = "",
		frozen = false,
		speed = 1,
		simAcc = 0,
		stepCount = 0,
		devQueue = [],
		onlineEnded = false;
	const game = new E.Game({
		canvas: "screen",
		id: "yars-of-ruin-v1",
		view: "overhead",
		views: ["overhead"],
		res: [960, 540],
		expand: false,
		bg: "#070f18",
		input: RuinControls.MAP,
		autoPause: !embedded,
		fullscreen: embedded ? false : "button",
		live: embedded,
		draw: true,
		menu: {
			quit: embedded ? false : "title",
			controls: { fire: "Primary shot", cannon: "Siege cannon" },
			items: () =>
				embedded
					? [["About / Credits", () => about()]]
					: [
							["Join second scout", () => join()],
							["How to Play", () => howto()],
							["Developer tools", () => dev()],
							["About / Credits", () => about()],
						],
			settings: [
				{ key: "music", value: 0.1 },
				{ key: "glyphs", value: "playstation" },
				{
					key: "voice",
					label: "Voices",
					group: "Sound",
					type: "slider",
					value: 1,
					apply: (g, v) => {
						g.audio.voiceVolume = v;
						g.audio.applyVolume();
					},
				},
				{
					key: "moveAim",
					label: "Keyboard aim follows movement",
					value: true,
					help: "Pointer movement always takes over mouse aim.",
				},
				{
					key: "aimAssist",
					label: "Controller / touch aim assist",
					value: true,
				},
				{ key: "stickFire", label: "Right-stick auto fire", value: false },
			],
		},
	});
	globalThis.__game = game;
	game.fadeTime = 0;
	game.cam.smooth = 0;
	const report = globalThis.RUIN_REPORT || {};
	const $ = (id) => (hasDOM ? document.getElementById(id) : null);
	const glyph = () => game.input.lastDevice === "gamepad";
	const zero = { mx: 0, my: 0, ax: 1, ay: 0, fire: false, cannon: false };
	const copy = (o) => JSON.parse(JSON.stringify(o));
	const sectorName = (i) =>
		C.sectors[i]?.name ||
		["The Cinder Gate", "The Glass Choir", "The Last Intelligence"][i];
	function tell(text, seconds = 3) {
		captionText = String(text || "");
		captionUntil = game.real + seconds;
		if ($("caption")) {
			$("caption").textContent = captionText;
			$("caption").hidden = !text;
		}
	}
	function fx(w, events = w.events || []) {
		for (const ev of events) {
			visuals.event(ev, w);
			sound.event(ev, w);
			if (ev.type === "death") game.input.rumble(0.5, 0.18);
			if (
				[
					"reflected",
					"reflection",
					"refuge-warning",
					"airborne-bonus",
					"refill",
					"core-hit",
				].includes(ev.type) &&
				ev.message
			)
				tell(ev.message, 3);
		}
	}
	function setPlaying(on) {
		if (hasDOM) {
			document.body.dataset.playing = String(on);
			$("game-hud").hidden = !on;
			$("demo-mark").hidden = !attract;
		}
	}
	function resetPresentation(unlock = false) {
		if (!visuals) return;
		visuals.dispose();
		sound.dispose();
		visuals = RuinRender.create(game);
		sound = RuinAudio.create(game);
		if (unlock) sound.unlock();
	}
	function resetInput() {
		controls && controls.clear();
		game.timeScale = 1;
		speed = 1;
		simAcc = 0;
		frozen = false;
		stepCount = 0;
		devQueue = [];
	}
	function title() {
		if (embedded) return;
		resetPresentation();
		controls.setCoop(false);
		onlineEnded = false;
		attract = false;
		resetInput();
		sound && sound.update(0, world, { paused: true, silent: true });
		world = SIM.create({ seed: 9182, players: 1, attract: true });
		world.players[0].x = 604;
		world.players[0].y = 285;
		world.players[0].charge = world.tuning.chargeThreshold;
		world.players[0].ready = true;
		idleAt = game.real;
		menuMode = "title";
		lastMode = "";
		setPlaying(false);
		if ($("caption")) $("caption").hidden = true;
		showTitle();
	}
	function showTitle() {
		const high = E.store.get("ruin:record:solo:normal", 0);
		ui.hide();
		ui.show("title", {
			kicker: "A signal from the ruined swarm",
			name: "Yars of Ruin",
			subtitle: "A tiny living weapon. An enormous last reply.",
			text: "They made a tomb of our sky.\nBite through the shell. Give the silence teeth.",
			actions: [
				["Begin the siege  →", () => start({})],
				["Local co-op", localLobby],
				["Sector practice", practiceMenu],
				["How to Play", howto],
				["Settings", () => ui.show("settings")],
				["About / Credits", () => about()],
			],
			meta: ["3 sectors", "1–2 scouts", "Siege / survive"],
			footer:
				"Normal / Assist in campaign setup · Online co-op when launched by AI Hub" +
				(high ? " · Best " + high.toLocaleString() : ""),
			back: () => {},
		});
	}
	function start(options = {}) {
		if (embedded) return;
		ui.show("launch", {
			kicker: options.coop ? "Two scouts · one swarm" : "One scout · one swarm",
			title: "Choose your signal",
			text: "One hit costs a scout. Your replacements are shared. Every defense can be breached.",
			actions: [
				["Normal", () => begin({ ...options, assist: false })],
				["Assist", () => begin({ ...options, assist: true })],
				["Back", () => ui.back()],
			],
			sections: [
				[
					"ASSIST",
					"Longer warnings, gentler pursuit, extra reserves. Every siege mechanic remains. Records are kept separately.",
				],
			],
		});
	}
	function join() {
		if (
			embedded ||
			!world ||
			world.mode !== "play" ||
			world.players.length >= 2
		) {
			ui.toast("Both scouts are already in flight.");
			return;
		}
		if (SIM.command(world, "join")) {
			controls.setCoop(true);
			ui.toast(
				"VENN has joined the swarm.",
				"One reserve added. Devices are assigned separately.",
			);
			hud();
		}
	}
	function localLobby() {
		ui.show("local", {
			kicker: "Simultaneous local co-op",
			title: "Bring another pair of wings",
			text: "Use two controllers, or keyboard / mouse and one controller. Without controllers: P1 uses WASD + J / Space; P2 uses arrows + . / /. Both scouts link to their own siege gun.",
			actions: [
				["Launch two scouts", () => start({ coop: true })],
				["Back", () => ui.back()],
			],
			sections: [
				[
					"ONLINE",
					"AI Hub supplies online sessions. Launch this game there with one or two players; the shared campaign starts automatically.",
				],
			],
		});
	}
	function practiceMenu() {
		const unlocked = E.store.get("ruin:unlocked", 0);
		ui.show("practice", {
			kicker: "Practice · no campaign record",
			title: "Return to a broken signal",
			text: "Sectors become available as you discover them during a campaign.",
			actions: C.sectors
				.map((s, i) => ({
					label: String(i + 1).padStart(2, "0") + "  " + s.name,
					disabled: i > unlocked,
					fn: () => start({ sector: i, practice: true }),
				}))
				.concat([["Back", () => ui.back()]]),
		});
	}
	function begin(options = {}) {
		if (embedded) return world;
		resetPresentation(true);
		lastLesson = "";
		attract = !!options.attract;
		resetInput();
		controls.setCoop(!!options.coop);
		world = SIM.create({
			players: options.coop ? 2 : 1,
			seed: options.seed ?? (Date.now() ^ 0x59415253) >>> 0,
			assist: !!options.assist,
			practice: !!options.practice,
			sector: options.sector || 0,
			attract,
		});
		lastMode = "";
		lastSector = -1;
		resultWorld = null;
		menuMode = "play";
		ui.hide();
		game.resume();
		game.go("play", null, { fade: 0 });
		setPlaying(true);
		if (!attract) tell("RILL: The swarm remembers. Leave no heart beating.", 4);
		sound.unlock();
		return world;
	}
	function howto(page = 0) {
		const lessons = [
			[
				"Open a path",
				"Hold primary fire to chip shield cells. Fly into a cell to bite it safely. Bites score more and fill your cannon charge. Five bites ready a shot.",
			],
			[
				"Call the siege gun",
				"Align your scout with the heart. Call the gun on the left rail, then move vertically out of its lane. The enormous projectile can kill either scout. A blocked shot is spent. Diamond cells reflect it once.",
			],
			[
				"Trust the static, carefully",
				"The bright band blocks guided threats, but disables both weapons. It never blocks a Swirl or your cannon. Top and bottom edges connect. The fortress itself becomes the Swirl; its warning shows the committed route.",
			],
			[
				"Break the last heart",
				"Primary fire cannot hurt the heart. A cannon interception earns a replacement scout. Brush its green docked heart for renewable charge. The final heart must be shot in flight. No cells left? Its dock always returns.",
			],
		];
		ui.show("help" + page, {
			kicker: "Field transmission " + (page + 1) + " / 4",
			title: lessons[page][0],
			text: lessons[page][1],
			keys:
				page === 0
					? [
							[glyph() ? "Left stick" : "WASD / arrows", "Fly"],
							[glyph() ? "Right stick" : "Mouse / movement", "Aim"],
							[controls.label("fire"), "Primary shot"],
						]
					: page === 1
						? [
								[controls.label("cannon"), "Call siege cannon"],
								[game.input.label("pause"), "Pause / back"],
							]
						: undefined,
			actions: [
				...(page < 3 ? [["Next transmission  →", () => howto(page + 1)]] : []),
				["Back", () => ui.back()],
			],
		});
	}
	function about(page = 0) {
		const info = Object.entries(report.sourceInformation || {}).map(
				([k, v]) => [k[0].toUpperCase() + k.slice(1), v],
			),
			tests = (report.testingFeedback || []).map((v, i) => [
				[
					"Issues found",
					"Critical issues",
					"Most helpful test",
					"Least helpful test",
				][i],
				v,
			]),
			engine = (report.engineFeedback || []).map((v, i) => [
				[
					"Liked most",
					"Got stuck / guessed wrong",
					"Built ourselves",
					"Hardest part",
					"Engine changes",
					"One improvement",
				][i],
				v,
			]),
			prompt = (report.promptFeedback || []).map((v, i) => [
				["Liked most", "Confusing", "Hardest task", "Suggested change"][i],
				v,
			]);
		const pages = [
			["Source Information · 1 / 4", info.slice(0, 5)],
			["Source Information · 2 / 4", info.slice(5, 8)],
			["Source Information · 3 / 4", info.slice(8, 11)],
			["Source Information · 4 / 4", info.slice(11)],
			["Testing Feedback · 1 / 2", tests.slice(0, 2)],
			["Testing Feedback · 2 / 2", tests.slice(2)],
			["Engine Feedback · 1 / 2", engine.slice(0, 3)],
			["Engine Feedback · 2 / 2", engine.slice(3)],
			["Prompt Feedback · 1 / 2", prompt.slice(0, 2)],
			["Prompt Feedback · 2 / 2", prompt.slice(2)],
		];
		ui.show("about" + page, {
			kicker: "Yars of Ruin · credits " + (page + 1) + " / " + pages.length,
			title: pages[page][0],
			sections: pages[page][1],
			text:
				page === 0
					? "Original game: Howard Scott Warshaw / Atari, 1982. An original adaptation; no recorded audio or external art."
					: undefined,
			actions: [
				...(page < pages.length - 1
					? [[pages[page + 1][0] + "  →", () => about(page + 1)]]
					: []),
				["Back", () => ui.back()],
			],
		});
	}
	function dev() {
		if (embedded) {
			ui.show("diagnostics", {
				title: "Session diagnostics",
				text: () => JSON.stringify(online?.debug || {}),
				actions: [["Back", () => ui.back()]],
			});
			return;
		}
		world.practice = true;
		const T = world.tuning;
		for (const k of Object.keys(C.ranges)) {
			game.settings.set("dev_" + k, T[k]);
		}
		ui.show("dev", {
			kicker: "Designer tools · this run is practice",
			title: "Listen inside the signal",
			text: () =>
				`Seed ${world.seed} · tick ${world.tick} · sector ${world.sector + 1} · phase ${world.phase + 1} · ${frozen ? "FROZEN" : "RUNNING"}`,
			rows: [
				"dev_invulnerable",
				"dev_infiniteCharge",
				"dev_collisions",
				"dev_timeScale",
			],
			actions: [
				["Live balance sliders", balance],
				["Encounter / phase selector", encounters],
				["Shield-layout editor", () => editor.show(true)],
				[
					"Freeze / unfreeze",
					() => {
						frozen = !frozen;
						ui.show("dev", {});
					},
				],
				[
					"Advance one tick",
					() => {
						stepCount++;
					},
				],
				[
					"Restart encounter",
					() => {
						queue("restart");
						ui.hide();
						game.resume();
					},
				],
				[
					"Spawn guided threat",
					() => {
						queue("spawnThreat");
					},
				],
				["Seed tools", seedScreen],
				[
					"Reset to Defaults",
					() => {
						queue("resetTuning");
						for (const k of Object.keys(C.defaults))
							if (game.settings.spec("dev_" + k))
								game.settings.set("dev_" + k, C.defaults[k]);
						for (const k of ["invulnerable", "infiniteCharge", "collisions"])
							game.settings.set("dev_" + k, false);
						frozen = false;
						speed = 1;
						game.settings.set("dev_timeScale", 1);
					},
				],
				["Back to pause", () => ui.back()],
			],
		});
	}
	function balance() {
		ui.show("balance", {
			kicker: "Live tuning · applied on fixed steps",
			title: "Shape the danger",
			rows: Object.keys(C.ranges).map((k) => "dev_" + k),
			actions: [
				[
					"Reset to Defaults",
					() => {
						queue("resetTuning");
						for (const k of Object.keys(C.ranges))
							game.settings.set("dev_" + k, C.defaults[k]);
						ui.show("balance", {});
					},
				],
				["Back", () => ui.back()],
			],
		});
	}
	function encounters() {
		ui.show("encounters", {
			kicker: "Practice selector",
			title: "Any heart. Any wound.",
			actions: C.sectors
				.map((s, i) => [
					`${i + 1} / ${s.name}`,
					() => {
						queue("sector", i);
						ui.hide();
						game.resume();
					},
				])
				.concat(
					[0, 1, 2].map((p) => [
						"Boss phase " + (p + 1),
						() => {
							queue("sector", 2);
							queue("phase", p);
							ui.hide();
							game.resume();
						},
					]),
					[["Back", () => ui.back()]],
				),
		});
	}
	function seedScreen() {
		game.settings.set("dev_seed", world.seed);
		ui.show("seed", {
			title: "Choose the same stars",
			text: "The same seed and action trace produce the same siege. Seed changes restart this encounter.",
			rows: ["dev_seed"],
			actions: [
				[
					"Load seed",
					() => {
						queue("seed", game.settings.dev_seed >>> 0);
						ui.hide();
						game.resume();
					},
				],
				["Back", () => ui.back()],
			],
		});
	}
	function queue(name, value) {
		if (!embedded) devQueue.push([name, value]);
	}
	function applyDev() {
		if (embedded || !world) return;
		for (const [name, v] of devQueue) {
			if (name === "tune") SIM.tune(world, v[0], v[1]);
			else SIM.command(world, name, v);
		}
		devQueue = [];
	}
	function continueSector() {
		if (online || world.mode !== "transition") return;
		SIM.nextSector(world);
		ui.hide();
		game.resume();
		lastMode = "";
		lastSector = -1;
		resetInput();
		setPlaying(true);
	}
	function modeChanged() {
		if (!world) return;
		if (world.sector !== lastSector) {
			lastSector = world.sector;
			if (!attract && !world.practice) {
				const unlocked = E.store.get("ruin:unlocked", 0);
				if (world.sector > unlocked) E.store.set("ruin:unlocked", world.sector);
			}
			if (!attract && world.sector > 0)
				tell(
					C.sectors[world.sector].introduction || "Deeper into the signal.",
					4,
				);
		}
		if (world.mode !== lastMode) {
			lastMode = world.mode;
			modeAt = game.real;
			modePresented = false;
		}
		if (world.mode === "play" || modePresented || game.real - modeAt < 2.2)
			return;
		modePresented = true;
		if (world.mode === "transition" && !attract && !online) {
			ui.show("sector-clear", {
				kicker: `Signal ${world.sector + 1} severed`,
				title: "The swarm flies deeper.",
				text:
					C.sectors[world.sector].clearLine ||
					"Another heart beats beyond the dark. One scout returns to the reserve.",
				stats: [
					[world.score.toLocaleString(), "Score"],
					[world.reserves, "Reserve scouts"],
				],
				actions: [
					["Continue  →", continueSector],
					["Settings", () => ui.show("settings")],
				],
			});
		}
		if (["victory", "defeat"].includes(world.mode) && !online && !attract)
			results();
	}
	function results() {
		if (resultWorld === world) return;
		resultWorld = world;
		const won = world.mode === "victory",
			category =
				(world.players.length === 2 ? "coop" : "solo") +
				":" +
				(world.assist ? "assist" : "normal"),
			key = "ruin:record:" + category;
		let high = E.store.get(key, 0);
		if (won && !world.practice) {
			high = Math.max(high, world.score);
			E.store.set(key, high);
		}
		menuMode = "results";
		setPlaying(false);
		tell("", 0);
		const stats = world.stats || {};
		ui.show("results", {
			kicker:
				(world.practice ? "Practice" : world.assist ? "Assist" : "Normal") +
				" · " +
				(world.players.length > 1 ? "Co-op" : "Solo"),
			title: won ? "The sky belongs to wings." : "The signal goes quiet.",
			emblem: won ? "✦" : "◇",
			text: won
				? "From the broken broadcast, a thousand small lights answer. The swarm has a sky again."
				: "The swarm remembers your path. A breach is never wasted.",
			stats: [
				[world.score.toLocaleString(), "Score"],
				[high.toLocaleString(), "Category best"],
				[stats.biteCount ?? 0, "Cells bitten"],
				[stats.airborne ?? 0, "Airborne strikes"],
			],
			actions: [
				["Restart campaign", () => start({ coop: world.players.length > 1 })],
				...(won
					? []
					: [
							[
								"Retry sector as practice",
								() =>
									begin({
										players: world.players.length,
										coop: world.players.length > 1,
										sector: world.sector,
										practice: true,
										assist: world.assist,
									}),
							],
						]),
				["Sector practice", practiceMenu],
				["About / Credits", () => about()],
				["Title", () => game.go("title", null, { fade: 0 })],
			],
			back: () => game.go("title", null, { fade: 0 }),
		});
	}
	function hud() {
		if (!hasDOM || !world || game.real - lastHUD < 0.09) return;
		lastHUD = game.real;
		const H = $("game-hud");
		H.hidden =
			game.sceneName !== "play" || !!ui.screen || attract || onlineEnded;
		if (H.hidden) return;
		const t = world.tuning.chargeThreshold,
			slots = world.players.map((p, i) => {
				const ready = p.charge >= t;
				const label =
					(embedded && online?.info?.players?.[i]?.name) ||
					C.scouts.map((s) => s.name)[i] ||
					"SCOUT " + (i + 1);
				return `<div class="hud-scout ${i ? "p2" : ""}"><div class="hud-scout-label">${i + 1} / <span class="scout-name"></span>${!p.alive ? " · " + (p.respawn > 0 ? "REGENERATING" : "WAITING") : ""}</div><div class="charge-pips">${Array.from({ length: Math.ceil(t) }, (_, n) => `<i class="${p.charge > n ? "on" : ""}"></i>`).join("")}</div><div class="hud-ready">${ready ? (embedded && i !== online.localIndex ? "SIEGE READY · TEAMMATE" : controls.label("cannon", embedded ? 0 : i) + " · CALL CANNON, THEN EVADE") : "BITE CELLS TO CHARGE · " + Math.floor(p.charge) + " / " + t}</div></div>`;
			});
		H.innerHTML = `<div class="hud-top"><div class="hud-sector"><span class="hud-overline">${world.practice ? "PRACTICE · " : world.assist ? "ASSIST · " : ""}SIGNAL ${String(world.sector + 1).padStart(2, "0")} / 03</span><span class="hud-station"></span><div class="hud-core">${Array.from({ length: world.core.maxHp }, (_, i) => `<i class="${i < world.core.hp ? "" : "off"}"></i>`).join("")}</div></div><div class="hud-values"><div class="hud-score">${String(world.score).padStart(7, "0")}</div><div class="hud-lives">RESERVE<br>${"◆ ".repeat(Math.max(0, Math.min(8, world.reserves))) || "EMPTY"}</div></div></div><div class="hud-charge">${slots.join("")}<div class="hud-hint">${glyph() ? "LEFT STICK" : "WASD"} FLY · ${controls.label("fire")} SHOOT<br>CONTACT BITES · TOP / BOTTOM WRAP</div></div>`;
		H.querySelector(".hud-station").textContent =
			world.customContent?.name || sectorName(world.sector);
		H.querySelectorAll(".scout-name").forEach((el, i) => {
			el.textContent =
				(embedded && online?.info?.players?.[i]?.name) ||
				C.scouts.map((s) => s.name)[i];
			if (world.players[i].color)
				el.closest(".hud-scout").style.borderColor = world.players[i].color;
		});
	}
	function tick(dt) {
		game.focus(480, 270, 0);
		if (!world) return;
		applyDev();
		if (online) {
			world = online.getWorld() || world;
			if (!onlineEnded)
				online.setInput(
					controls.frames({
						...world,
						players: [world.players[online.localIndex] || world.players[0]],
					})[0] || zero,
				);
		} else if (attract) {
			if (world.mode === "transition" && world.transitionTime > 2.2)
				SIM.nextSector(world);
			if (
				["victory", "defeat"].includes(world.mode) &&
				world.transitionTime > 3
			) {
				resetPresentation(true);
				world = SIM.create({ players: 1, seed: 9182, attract: true });
				lastMode = "";
			} else
				SIM.step(
					world,
					world.players.map((p, i) => SIM.pilot(world, i, { attract: true })),
					dt,
				);
			fx(world);
		} else if (world.mode === "play" && !frozen) {
			simAcc += dt * speed;
			const actions = controls.frames(world);
			let first = true;
			while (simAcc >= 1 / 120) {
				SIM.step(
					world,
					first ? actions : actions.map((a) => ({ ...a, cannon: false })),
					1 / 120,
				);
				fx(world);
				first = false;
				simAcc -= 1 / 120;
			}
		} else if (world.mode !== "play" && !ui.screen) {
			SIM.step(
				world,
				world.players.map(() => zero),
				dt,
			);
		}
		modeChanged();
		if (
			!attract &&
			!ui.screen &&
			world.mode === "play" &&
			world.sector === 0 &&
			world.tutorial < 4 &&
			world.messageTime <= 0 &&
			game.real >= captionUntil
		) {
			const lesson = world.sector + ":" + world.tutorial;
			if (lesson !== lastLesson) {
				lastLesson = lesson;
				tell(C.sectors[world.sector].lessons[Math.min(3, world.tutorial)], 5);
			}
		}
		if (
			world.messageTime > 0 &&
			world.message &&
			world.message !== captionText &&
			!ui.screen &&
			!attract
		)
			tell(world.message, world.messageTime);
		sound.update(dt, world, {
			paused: game.paused || !!ui.screen,
			silent: onlineEnded,
		});
		hud();
		if ($("caption") && game.real >= captionUntil) $("caption").hidden = true;
	}
	function draw(r) {
		if (world)
			visuals.draw(r, online ? online.renderWorld(1 / 60) : world, {
				title: game.sceneName === "title",
				debug: !!world.dev?.collisions || !!world.collisions,
				reducedFlash: game.reduceMotion || game.settings.flashes === 0,
				reducedShake: game.reduceMotion || game.settings.shake === 0,
			});
	}
	ui = new E.Shell(game, {
		tv: true,
		theme: {
			accent: "#d9f1a6",
			paper: "#0c1820",
			ink: "#eff8e6",
			muted: "#a9bcbc",
			line: "#3a5557",
			font: "Trebuchet MS, Arial, sans-serif",
			titleFont: "Georgia, serif",
		},
		screens: {
			pause: { kicker: "Transmission held", title: "Fold your wings" },
		},
	});
	visuals = RuinRender.create(game);
	sound = RuinAudio.create(game);
	controls = RuinControls.create(game, {
		onActivity: () => {
			idleAt = game.real;
			if (attract) {
				fromAttract = true;
				attract = false;
				game.go("title", null, { fade: 0 });
				return true;
			}
			return false;
		},
		onGesture: () => sound.unlock(),
		isPlaying: () =>
			game.sceneName === "play" && world?.mode === "play" && !attract,
		isBlocked: () => !!ui.screen || game.paused || onlineEnded,
		getWorld: () => world,
		localIndex: () => online?.localIndex || 0,
	});
	editor = RuinEditor.create(game, ui, {
		world: () => world,
		load: (c) => {
			SIM.command(world, "content", c);
			lastMode = "";
			lastSector = -1;
			setPlaying(true);
		},
	});
	for (const [k, r] of Object.entries(C.ranges))
		game.settings.define({
			key: "dev_" + k,
			label: r.label,
			min: r.min,
			max: r.max,
			step: r.step,
			unit: r.unit,
			value: C.defaults[k],
			group: "Controls",
		});
	for (const k of ["invulnerable", "infiniteCharge", "collisions"])
		game.settings.define({
			key: "dev_" + k,
			label: {
				invulnerable: "Invulnerability",
				infiniteCharge: "Infinite charge",
				collisions: "Collision / warning overlay",
			}[k],
			value: false,
			group: "Controls",
		});
	game.settings.define({
		key: "dev_timeScale",
		label: "Time scale",
		value: 1,
		min: 0.1,
		max: 3,
		step: 0.1,
		group: "Controls",
	});
	game.settings.define({
		key: "dev_seed",
		label: "Seed",
		value: 9182,
		min: 0,
		max: 4294967295,
		step: 1,
		group: "Controls",
	});
	game.settings.onChange = (key, value) => {
		if (embedded || !world || !key.startsWith("dev_")) return;
		const k = key.slice(4);
		if (k === "timeScale") {
			speed = value;
			world.practice = true;
		} else if (k in C.ranges) queue("tune", [k, value]);
		else if (["invulnerable", "infiniteCharge", "collisions"].includes(k))
			queue(k, value);
	};
	game.hook("input", (dt) => {
		controls.update();
		if (!embedded && (game.paused || ui.screen)) {
			for (const q of game.players.slice(1)) {
				for (const a of ["up", "down", "left", "right"])
					if (q.repeat(a, 0.32, 0.1) && !game.input.pressed(a)) {
						game.input.tap(a);
						game.input.lastDevice = q.lastDevice;
					}
				for (const a of ["confirm", "cancel"])
					if (q.pressed(a) && !game.input.pressed(a)) {
						game.input.tap(a);
						game.input.lastDevice = q.lastDevice;
					}
			}
		}
		if (embedded) {
			if (onlineEnded) {
				controls.clear();
				return;
			}
			if (game.paused || ui.screen) {
				online?.setInput(zero);
				game.live = true;
			}
		} else if (game.sceneName === "title" && game.real - idleAt >= 10) {
			begin({ attract: true, seed: 9182 });
		}
		if (!embedded && world) {
			applyDev();
			if (stepCount > 0) {
				stepCount--;
				SIM.step(
					world,
					world.players.map(() => zero),
					1 / 120,
				);
				fx(world);
			}
		}
		if (game.paused) sound.update(dt, world, { paused: true, silent: false });
		if (ui.screen === "editor") editor.draw();
	});
	const scenes = {
		title: {
			pausable: false,
			view: "overhead",
			camera: { zoom: false },
			enter: title,
			update(dt) {
				game.focus(480, 270, 0);
				if (world) world.time += dt;
				sound.update(dt, world, { paused: true, silent: true });
			},
			draw,
		},
		play: {
			pausable: true,
			view: "overhead",
			camera: { zoom: false },
			enter() {
				game.focus(480, 270, 0);
				ui.hide();
				setPlaying(true);
			},
			update: tick,
			draw,
			back() {
				game.pause();
				return true;
			},
		},
	};
	game.debug = {
		snapshot: () => ({
			...(world ? SIM.snapshot(world) : {}),
			scene: game.sceneName,
			screen: ui.screen,
			attract,
			paused: game.paused,
			online: !!online,
			ended: onlineEnded,
		}),
		start: (opts) => begin(opts),
		world: () => world,
		runPilot(seconds = 1) {
			if (embedded) return SIM.snapshot(world);
			for (let n = 0; n < seconds * 120; n++) {
				if (world.mode === "transition") SIM.nextSector(world);
				SIM.step(
					world,
					world.players.map((p, i) => SIM.pilot(world, i)),
					1 / 120,
				);
				fx(world);
			}
			modeChanged();
			hud();
			return SIM.snapshot(world);
		},
		command: (name, value) => {
			if (!embedded) SIM.command(world, name, value);
		},
		editor: () => editor,
		online: () => online,
	};
	globalThis.RuinApp = {
		game,
		ui,
		controls,
		get world() {
			return world;
		},
		get online() {
			return online;
		},
		presentationDebug: () => ({
			visuals: visuals.debug(),
			sound: sound.debug(),
		}),
		begin,
		showTitle,
		howto,
		about,
		dev,
		dispose() {
			online?.dispose();
			sound.dispose();
			visuals.dispose();
			game.dispose();
		},
		booted: null,
	};
	async function boot() {
		online = await RuinOnline.connect({
			sim: SIM,
			getInput: () => zero,
			onWorld: (w) => {
				world = w;
			},
			onStep: (w, events) => {
				world = w;
				fx(w, events);
			},
			onStart: () => {
				menuMode = "play";
				lastSector = -1;
				lastMode = "";
				if (game.sceneName) game.go("play", null, { fade: 0 });
			},
			onEnd: (detail) => {
				onlineEnded = true;
				controls.clear();
				sound.dispose();
				ui.hide();
				game.stop();
				setPlaying(false);
				tell(
					detail?.reason === "void"
						? "The signal has ended."
						: "The swarm awaits the next signal.",
					60,
				);
			},
			onNotice: (text) => tell(text, 4),
		});
		if (online) {
			world = online.getWorld();
			game.live = true;
			game.o.autoPause = false;
			game.start({ scene: "play", scenes });
		} else game.start({ scene: "title", scenes });
		return game;
	}
	RuinApp.booted = boot().catch((e) => {
		game.fail("boot", e);
		throw e;
	});
})();
/* GAME END */
