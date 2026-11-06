(async (G) => {
	"use strict";
	const SF = G.SF,
		E = G.My3D2dge;
	SF.title = "Space Fort After Dark";
	const info = await AIHub.connect({ mode: "shared-world", seats: [1, 4] });
	const dedicated = !!info?.server;
	const game = new E.Game({
		canvas: "screen",
		res: [960, 540],
		expand: false,
		view: "overhead",
		views: ["overhead"],
		input: SF.inputMap(E),
		id: "space-fort-after-dark",
		loop: false,
		headless: dedicated,
		live: true,
		autoPause: !info,
		corner: false,
		fullscreen: false,
		menu: {
			quit: false,
			controls: {
				attack: "Laser",
				dash: "Boost",
				skill: "Defensive pulse",
				jump: false,
			},
		},
	});
	// The engine's fixed-resolution scaler floors at one device pixel. Permit a
	// fractional fit below one so low-DPI portrait devices retain the whole arena.
	const nativeResize = game.screen.resize.bind(game.screen);
	game.screen.resize = function () {
		nativeResize();
		const c = this.canvas;
		if (c && (c.width < this.W || c.height < this.H)) {
			this.S = Math.min(c.width / this.W, c.height / this.H);
			this.OX = Math.floor((c.width - this.W * this.S) / 2);
			this.OY = Math.floor((c.height - this.H * this.S) / 2);
		}
	};
	game.screen.resize();
	game.fadeTime = 0;
	game.cam.smooth = 0;
	game.lights.enabled = false;
	const defs = [
		{ key: "music", value: 0.1 },
		{ key: "scale", value: "fill" },
		{ key: "effects", value: 0.6 },
		{ key: "glyphs", value: "playstation" },
		{
			key: "voice",
			label: "Radio voice",
			group: "Sound",
			type: "slider",
			value: 0.4,
			min: 0,
			max: 1,
			step: 0.05,
		},
		{ key: "aimAssist", label: "Aim assistance", type: "toggle", value: true },
		{
			key: "moveAssist",
			label: "Movement assistance",
			type: "toggle",
			value: true,
		},
		{
			key: "reducedFlashes",
			label: "Reduced flashes",
			type: "toggle",
			value: false,
		},
	];
	for (const d of defs)
		game.settings.define({ ...game.settings.spec(d.key), ...d });
	for (const row of SF.BALANCE)
		game.settings.define({
			key: "dev_" + row[0],
			group: "Balance",
			label: row[1],
			type: "slider",
			value: row[2],
			min: row[3],
			max: row[4],
			step: row[5],
			unit: " " + row[6],
		});
	for (const d of [
		{ key: "devGod", label: "Invulnerability", type: "toggle", value: false },
		{
			key: "devDebug",
			label: "Collision / telegraph overlay",
			type: "toggle",
			value: false,
		},
		{
			key: "devSpeed",
			label: "Simulation speed",
			type: "slider",
			value: 1,
			min: 0.25,
			max: 4,
			step: 0.25,
			unit: "×",
		},
	])
		game.settings.define(d);
	const colors = ["#6ce6ff", "#ffca71", "#b6ff88", "#d29aff"];
	const app = (SF.app = {
		game,
		hubInfo: info,
		world: new SF.World({
			seed: info?.seed || 1981,
			limitMs: info?.limitMs || 780000,
			players: info?.players.map((p, i) => ({ ...p, seat: i })),
		}),
		mode: info ? "hub" : "title",
		attract: false,
		overlay: false,
		ended: false,
		upgradeChoices: new Map(),
		status: "",
		lastActivity: 0,
		lastEvent: 0,
		lastUi: 0,
		lastLifecycle: "",
		pendingAttractExit: false,
		best: 0,
		uiRevision: 0,
	});
	G.__game = game;
	G.__siege = app;
	try {
		app.best = +localStorage.getItem("sfad-best") || 0;
	} catch {}
	app.audio = new SF.Audio(game, {
		music: game.settings.music,
		sfx: game.settings.effects,
		voice: game.settings.voice,
	});
	app.renderer = dedicated ? null : new SF.Renderer(game);
	app.activity = () => {
		if (app.ended) return;
		app.lastActivity = game.real;
		if (app.attract) app.pendingAttractExit = true;
	};
	app.controls = new SF.Controls(app);
	app.getIntent = (id) => app.controls.intent(id);
	app.onStatus = (text) => (app.status = text);
	app.onEnd = (reason) => {
		app.ended = true;
		app.status = "ROUND ENDED · " + reason;
		app.audio.stop();
		app.controls.clear();
		shell?.hide();
		hud?.setAttribute("hidden", "");
		if (menuButton) menuButton.hidden = true;
		if (touchActions) touchActions.hidden = true;
	};
	let shell = null,
		hud = null,
		notice = null,
		pilots = null,
		objective = null,
		score = null,
		prompts = null,
		touchActions = null,
		menuButton = null;
	const opts = () => ({
		music: game.settings.music,
		sfx: game.settings.effects,
		voice: game.settings.voice,
	});
	const options = () =>
		shell.show("options", {
			kicker: "FLIGHT CONSOLE",
			title: "Settings",
			rows: [
				"music",
				"effects",
				"voice",
				"glyphs",
				"aimAssist",
				"moveAssist",
				"shake",
				"reducedFlashes",
			],
			actions: [["Back", () => shell.back()]],
		});
	const controls = () =>
		shell.show("controls", {
			kicker: "PILOT HANDBOOK",
			title: "Controls",
			text: "L stick / WASD move. R stick / mouse aims. On the ground, move sideways and aim upward. Pulse clears nearby bullets and breaks tractor locks. Empty boost never disables flight or weapons.",
		});
	const about = (section = 0, page = 0) => {
		const data = SF.ABOUT,
			groups = [
				[
					"Source Information",
					Object.entries(data.sourceInformation).map(([k, v]) => [
						k.replace(/([A-Z])/g, " $1").toUpperCase(),
						String(v),
					]),
				],
				[
					"Testing Feedback",
					data.testingFeedback.map((v, i) => ["0" + (i + 1), v]),
				],
				[
					"Engine Feedback",
					data.engineFeedback.map((v, i) => ["0" + (i + 1), v]),
				],
				[
					"Prompt Feedback",
					data.promptFeedback.map((v, i) => ["0" + (i + 1), v]),
				],
			];
		const [title, rows] = groups[section],
			size = section === 0 ? 3 : section === 2 ? 3 : 2,
			pages = Math.ceil(rows.length / size);
		shell.show("credits", {
			kicker:
				"ABOUT / " +
				(section + 1) +
				" OF 4 · PAGE " +
				(page + 1) +
				" OF " +
				pages,
			title,
			sections: rows.slice(page * size, (page + 1) * size),
			actions: [
				[
					"Next page",
					() =>
						about(
							page + 1 < pages ? section : (section + 1) % 4,
							page + 1 < pages ? page + 1 : 0,
						),
				],
				[
					"Previous",
					() => {
						if (page) about(section, page - 1);
						else {
							const sec = (section + 3) % 4;
							about(sec, 0);
						}
					},
				],
				["Back", () => shell.back()],
			],
		});
	};
	function syncBalance(k) {
		if (!app.world || (app.resettingDev && k.startsWith("dev"))) return;
		if (k === "devGod") app.world.dev("invulnerable", game.settings.devGod);
		else if (k.startsWith("dev_")) app.world.dev(k.slice(4), game.settings[k]);
		else if (k === "devSpeed" && game.settings.devSpeed !== 1)
			app.world.s.modified = true;
		app.audio.setSettings(opts());
	}
	game.settings.onChange = syncBalance;
	function dev() {
		const allowed = !info || info.isHost;
		if (!allowed) {
			shell.show("inspection", {
				title: "Telemetry",
				text: () =>
					JSON.stringify({
						tick: app.world.s.tick,
						seed: app.world.s.seed,
						act: app.world.s.act + 1,
						score: app.world.s.score,
					}),
				actions: [["Back", () => shell.back()]],
			});
			return;
		}
		const actions = [
			[
				"Refill / revive team",
				() => {
					app.world.dev("refill");
					shell.toast("Team restored", "Modified run");
				},
			],
			[
				"Encounter preview",
				() =>
					shell.show("jump", {
						title: "Encounter preview",
						actions: [
							...SF.ENCOUNTERS.map((w, n) => [
								w.name,
								() => {
									app.world.dev("act", w.act);
									app.world.dev(
										"wave",
										SF.ENCOUNTERS.filter((v) => v.act === w.act).indexOf(w),
									);
									app.lastLifecycle = "";
									shell.hide();
									game.resume();
								},
							]),
							["Back", () => shell.back()],
						],
					}),
			],
			[
				"Boss phases",
				() =>
					shell.show("phases", {
						title: "Siege ship phases",
						actions: ["Side batteries", "Tractor emitters", "Exposed core"]
							.map((n, i) => [
								n,
								() => {
									app.world.dev("boss", i);
									app.lastLifecycle = "";
									shell.hide();
									game.resume();
								},
							])
							.concat([["Back", () => shell.back()]]),
					}),
			],
			[
				"Spawn threat",
				() =>
					shell.show("spawn", {
						title: "Threat preview",
						actions: Object.keys(SF.ENEMIES)
							.map((n) => [
								n.toUpperCase(),
								() => {
									app.world.dev("spawn", n);
									shell.toast(
										n.toUpperCase(),
										"Spawned outside pilot safety radius",
									);
								},
							])
							.concat([["Back", () => shell.back()]]),
					}),
			],
			...(!info
				? [
						[
							"Single step (1/120 s)",
							() => {
								app.world.s.modified = true;
								app.world.step(SF.DT, {});
								updateHud();
							},
						],
					]
				: []),
			[
				"Reset balance to defaults",
				() => {
					app.world.dev("resetBalance");
					for (const r of SF.BALANCE) game.settings.set("dev_" + r[0], r[2]);
					game.settings.set("devSpeed", 1);
					game.settings.set("devGod", false);
					shell.show("dev", {});
				},
			],
			["Back", () => shell.back()],
		];
		shell.show("dev", {
			kicker: "MODIFIED RUNS DO NOT SET BEST SCORES",
			title: "Flight laboratory",
			text: () =>
				"SEED " +
				app.world.s.seed +
				" · TICK " +
				app.world.s.tick +
				" · ACT " +
				(app.world.s.act + 1) +
				" / WAVE " +
				(app.world.s.wave + 1),
			rows: [
				"devGod",
				"devDebug",
				...(!info ? ["devSpeed"] : []),
				...SF.BALANCE.map((r) => "dev_" + r[0]),
			],
			actions,
		});
		const first = shell.root?.querySelector(".esh-mod input");
		if (first) first.focus({ preventScroll: true });
		const panel = shell.root?.querySelector(".esh-mod");
		if (panel) panel.scrollTop = 0;
	}
	function title() {
		if (info) return;
		game.allowJoin(false);
		while (game.players.length > 1) game.removePlayer(game.players.length);
		app.mode = "title";
		app.attract = false;
		app.lastLifecycle = "";
		app.lastActivity = game.real;
		app.pendingAttractExit = false;
		app.controls.clear();
		app.audio.stop();
		app.audio.setScene("title");
		app.renderer?.reset();
		game.resume();
		game.go("title", null, { fade: 0 });
		shell?.hide();
		shell?.show("title", {
			kicker: "FORTRESS 13 · NIGHT WATCH",
			name: "SPACE FORT\nAFTER DARK",
			subtitle: "Three lines. One last stand.",
			text: "Intercept. Keep cool. Hold until dawn.",
			actions: [
				["Play siege", () => startRun(false)],
				["Co-op", join],
				["Settings", options],
				["About / Credits", () => about()],
			],
			meta: ["1–4 PILOTS", "ARCADE SIEGE", "BEST " + app.best.toLocaleString()],
			footer: "Inspired by Space Fortress · Century Electronics, 1981",
			back: () => {},
		});
	}
	function join() {
		while (game.players.length > 1) game.removePlayer(game.players.length);
		game.allowJoin({ max: 4, onJoin: () => refreshJoin() });
		refreshJoin();
	}
	function refreshJoin() {
		const seats = game.players
			.map(
				(i, n) =>
					"P" +
					(n + 1) +
					" · " +
					(i.half
						? "KEYBOARD " + i.half.toUpperCase()
						: i.lastDevice === "gamepad"
							? "CONTROLLER"
							: "KEYBOARD / MOUSE"),
			)
			.join("\n");
		shell.show("join", {
			kicker: "STANDALONE COUCH CO-OP",
			title: "Assemble the night watch",
			back: () => {
				game.allowJoin(false);
				title();
			},
			text:
				seats +
				"\n\nJoin: Options on another controller, or 2 on the keyboard. P1: WASD + F/G/H. P2: arrows + . / , . Online co-op is available through AI Hub.",
			actions: [
				{
					label:
						"Launch " +
						game.players.length +
						" pilot" +
						(game.players.length > 1 ? "s" : ""),
					fn: () => startRun(true),
				},
				[
					"Back",
					() => {
						game.allowJoin(false);
						title();
					},
				],
			],
		});
	}
	function startRun(coop) {
		if (info) return;
		if (!coop) {
			while (game.players.length > 1) game.removePlayer(game.players.length);
		}
		game.allowJoin(false);
		app.mode = "play";
		app.attract = false;
		app.lastEvent = 0;
		app.lastLifecycle = "";
		app.upgradeChoices.clear();
		app.controls.clear();
		app.renderer?.reset();
		app.audio.stop();
		app.resettingDev = true;
		app.world = new SF.World({
			seed: 1981,
			epoch: app.world.s.epoch + 1,
			players: game.players.map((i, n) => ({
				id: n,
				seat: n,
				name: "VIPER " + (n + 1),
				color: colors[n],
			})),
		});
		app.audio.setScene("act0");
		game.settings.set("devSpeed", 1);
		game.settings.set("devGod", false);
		for (const r of SF.BALANCE) game.settings.set("dev_" + r[0], r[2]);
		app.resettingDev = false;
		shell.hide();
		game.resume();
		game.go("run", null, { fade: 0 });
		app.overlay = false;
	}
	function startAttract() {
		if (info) return;
		game.allowJoin(false);
		app.attract = true;
		app.mode = "attract";
		app.pendingAttractExit = false;
		app.lastLifecycle = "";
		app.lastEvent = 0;
		shell.hide();
		game.resume();
		game.go("run", null, { fade: 0 });
		app.audio.stop();
		app.world = new SF.World({ seed: 13, attract: true });
		app.world.s.players[0].invuln = 1e8;
		app.demoTime = 0;
		app.demoStage = 0;
		app.renderer?.reset();
	}
	function upgrade() {
		const s = app.world.s;
		app.upgradeChoices.clear();
		let index = 0;
		const show = () => {
			const local = info
				? s.players.filter((p) => p.id === info.me)
				: s.players.filter((p) => p.active);
			while (index < local.length && local[index].choice >= 0) index++;
			if (index >= local.length) {
				shell.hide();
				return;
			}
			const p = local[index];
			app.upgradeOwner = p.id;
			app.upgradeNav = null;
			shell.show("upgrade", {
				kicker: "FIELD REFIT · " + p.name,
				title: "Choose your edge",
				text: () =>
					"Next line deploys in " +
					Math.ceil(app.world.s.timer) +
					"s. No response: focused laser.",
				actions: [
					["FOCUSED LASER · +30% damage", () => pick(0)],
					["LONG BOOST · +35 reserve", () => pick(1)],
					["RAPID PULSE · 22% faster", () => pick(2)],
				],
				back: () => {},
			});
			function pick(n) {
				if (info) app.upgradeChoices.set(p.id, n);
				else app.world.choose(p.id, n);
				index++;
				show();
			}
		};
		show();
	}
	function result() {
		const s = app.world.s,
			r = s.result;
		if (!r) return;
		if (!info && !app.attract && !s.modified && r.score > app.best) {
			app.best = r.score;
			try {
				localStorage.setItem("sfad-best", String(app.best));
			} catch {}
		}
		if (info) return;
		shell.hide();
		shell.show("results", {
			kicker: r.won ? "NIGHT WATCH COMPLETE" : "FORTRESS 13 · AFTER ACTION",
			title: r.won ? "DAWN IS OURS" : "THE LAST SIGNAL",
			text: r.reason + (s.modified ? " · MODIFIED RUN" : ""),
			emblem: r.won ? "✦" : "◇",
			stats: [
				[r.score.toLocaleString(), "TEAM SCORE"],
				[r.rank, "RANK"],
				[Math.round(s.time) + "s", "SIEGE TIME"],
			],
			medals: s.outcomes.map((o) => [
				["PERIMETER", "FORTRESS", "GROUND LINE"][o.act],
				o.held,
			]),
			actions: [
				["Retry siege", () => startRun(game.players.length > 1)],
				["Title", title],
			],
		});
	}
	if (!dedicated) {
		shell = new E.Shell(game, {
			standard: false,
			theme: {
				ink: "#eaf5ff",
				paper: "#101b2b",
				accent: "#8de9ee",
				muted: "#9aaec4",
				line: "#334b61",
				font: "Arial, sans-serif",
				titleFont: "Arial, sans-serif",
				scale: () => Math.max(0.82, Math.min(1.85, innerWidth / 1050)),
			},
			screens: {
				pause: {
					kicker: info ? "LOCAL OVERLAY · THE SIEGE CONTINUES" : "WEAPONS SAFE",
					title: "Flight paused",
					actions: [
						["Settings", options],
						["Controls", controls],
						["Dev mode", dev],
						...(!info ? [["Return to title", title]] : []),
					],
				},
			},
		});
		app.shell = shell;
		// Keep engineering units on live balance sliders. The native Shell formats
		// all values below one as percentages, including the laser interval in seconds.
		const nativeRow = shell._row.bind(shell);
		shell._row = (key) => {
			const row = nativeRow(key);
			if (row && key.startsWith("dev_")) {
				const slider = row.querySelector('input[type="range"]'),
					out = row.querySelector("output");
				const sp = game.settings.spec(key);
				const format = () => {
					if (out)
						out.textContent =
							String(Math.round(game.settings[key] * 100) / 100) +
							(sp.unit || "");
				};
				if (slider) slider.addEventListener("input", format);
				format();
			}
			return row;
		};
		// Hover establishes focus for the native shell's controller/keyboard navigation.
		shell.root.addEventListener("pointerover", (e) => {
			const b = e.target.closest("button,input");
			if (b && !b.disabled) b.focus({ preventScroll: true });
		});
		hud = document.createElement("div");
		hud.id = "hud";
		hud.innerHTML =
			'<div class="hud-top"><div id="objective"></div><div id="team-score"></div></div><div id="radio"></div><div id="pilots"></div><div id="prompts"></div><div id="demo-label"></div>';
		document.body.appendChild(hud);
		objective = hud.querySelector("#objective");
		score = hud.querySelector("#team-score");
		notice = hud.querySelector("#radio");
		pilots = hud.querySelector("#pilots");
		prompts = hud.querySelector("#prompts");
		menuButton = document.createElement("button");
		menuButton.id = "flight-menu";
		menuButton.textContent = "Ⅱ";
		menuButton.setAttribute("aria-label", "Pause menu");
		menuButton.onclick = () => {
			app.activity();
			app.controls.clear();
			game.pause("player");
		};
		document.body.appendChild(menuButton);
		touchActions = document.createElement("div");
		touchActions.id = "touch-actions";
		touchActions.innerHTML =
			'<button id="pulse-touch">PULSE</button><button id="boost-touch">BOOST</button>';
		document.body.appendChild(touchActions);
		touchActions.querySelector("#pulse-touch").onpointerdown = (e) => {
			e.preventDefault();
			app.controls.touchPulse = true;
		};
		touchActions.querySelector("#boost-touch").onpointerdown = (e) => {
			e.preventDefault();
			app.controls.touchBoost = true;
		};
	}
	let oldPaused = false,
		lastAudioScene = "";
	function updateHud() {
		if (!hud) return;
		const s = app.world.s,
			playing = app.mode !== "title" && !app.ended,
			uiOpen = !!shell?.screen;
		hud.hidden = !playing || uiOpen;
		menuButton.hidden = !playing || uiOpen || app.attract;
		touchActions.hidden =
			!playing || uiOpen || app.attract || game.input.lastDevice !== "touch";
		const names = ["OUTER PERIMETER", "FORTRESS ORBIT", "GROUND LINE"],
			beat = SF.ENCOUNTERS[app.world.beatIndex()];
		const danger =
				s.act === 1
					? s.objective.heat
					: s.act === 2
						? s.objective.integrity
						: 100 - Math.min(100, (s.waveTime / (beat?.duration || 78)) * 100),
			label =
				s.act === 1
					? "FORTRESS HEAT"
					: s.act === 2
						? "BASE INTEGRITY"
						: "INTERCEPTION WINDOW";
		const color =
			s.act === 1
				? danger > 70
					? "#ff7869"
					: "#ffcf7b"
				: s.act === 2
					? danger < 30
						? "#ff7869"
						: "#8de9ee"
					: "#8de9ee";
		objective.innerHTML =
			'<div class="kicker">' +
			(s.act + 1) +
			" / 3 · " +
			names[s.act] +
			" <span> / " +
			(s.boss
				? "NIGHTJAR · PHASE " + (s.boss.phase + 1)
				: "WAVE " + (s.wave + 1)) +
			"</span></div><b>" +
			label +
			" <em>" +
			Math.round(danger) +
			'%</em></b><div class="meter"><i style="width:' +
			danger +
			"%;background:" +
			color +
			'"></i></div>';
		score.innerHTML =
			'<span class="kicker">TEAM SCORE ' +
			(s.modified ? " · MODIFIED" : "") +
			"</span><b>" +
			Math.round(s.score).toLocaleString() +
			" <small>×" +
			s.combo.toFixed(1) +
			"</small></b>";
		notice.textContent = s.noticeTime > 0 ? s.notice : "";
		notice.hidden = s.noticeTime <= 0;
		pilots.replaceChildren(
			...s.players
				.filter((p) => p.active)
				.map((p) => {
					const d = document.createElement("div");
					d.className = "pilot";
					d.style.setProperty("--pilot", p.color || colors[p.seat]);
					const t = document.createElement("b");
					t.textContent = p.seat + 1 + " · " + p.name;
					d.append(t);
					const inf = document.createElement("span");
					inf.textContent =
						p.hp <= 0
							? "REDEPLOY " + Math.ceil(p.respawn) + "s"
							: "HULL " +
								Math.ceil(p.hp) +
								" / " +
								p.maxHp +
								"   BOOST " +
								Math.round(p.energy);
					d.append(inf);
					const bar = document.createElement("div");
					bar.className = "meter";
					const fill = document.createElement("i");
					fill.style.width = (100 * Math.max(0, p.hp)) / p.maxHp + "%";
					bar.append(fill);
					d.append(bar);
					const readiness = document.createElement("small");
					readiness.textContent =
						p.pulse <= 0 ? "PULSE READY" : "PULSE " + Math.ceil(p.pulse) + "s";
					d.append(readiness);
					return d;
				}),
		);
		prompts.textContent = app.controls.labels();
		hud.querySelector("#demo-label").textContent = app.attract
			? "DEMO · ANY INPUT TO RETURN"
			: "";
		if (game.input.lastDevice === "touch") {
			const p = s.players.find((p) => !info || p.id === info.me);
			const useful =
				p &&
				(p.lock > 0 ||
					s.shots.some(
						(q) => q.owner === -1 && Math.hypot(q.x - p.x, q.y - p.y) < 150,
					) ||
					s.enemies.some(
						(e) =>
							e.type === "anchor" && Math.hypot(e.x - p.x, e.y - p.y) < 160,
					));
			touchActions.querySelector("#pulse-touch").hidden =
				!useful || p.pulse > 0;
			touchActions.querySelector("#boost-touch").hidden =
				!useful || p.energy < 26;
		}
		if (s.state === "briefing" || s.state === "transition") {
			notice.hidden = false;
			notice.textContent =
				(s.state === "transition"
					? "RETREAT TO " +
						(s.pendingAct === 1 ? "FORTRESS ORBIT" : "GROUND LINE")
					: "ACT " + (s.act + 1) + " · " + names[s.act]) +
				" · " +
				Math.ceil(s.timer) +
				"\n" +
				s.notice;
		}
		if (
			game.input.lastDevice === "touch" &&
			s.state === "briefing" &&
			s.act === 0
		)
			notice.textContent +=
				"\nLEFT THUMB: DRAG TO MOVE · RIGHT THUMB: AIM + FIRE";
		if (info && !app.online?.started) {
			notice.hidden = false;
			notice.textContent = app.status;
		}
		if (info && app.online?.started && AIHub.time() < 0) {
			notice.hidden = false;
			notice.textContent =
				"LAUNCH IN " + Math.ceil(-AIHub.time() / 1000) + " · WEAPONS SAFE";
		}
		if (shell?.screen === "upgrade") {
			const p = shell.root.querySelector(".esh-m");
			if (p)
				p.textContent =
					"Next line deploys in " +
					Math.ceil(s.timer) +
					"s. No response: focused laser.";
		}
	}
	function commonUpdate(dt) {
		game.focus(480, 270, 0);
		app.overlay = !!shell?.screen || game.paused;
		const s = app.world.s;
		if (!info && s.state === "upgrade" && shell?.screen === "upgrade") {
			const owner = s.players.find((p) => p.id === app.upgradeOwner),
				I = owner && game.players[owner.seat];
			if (I && owner.seat > 0) {
				const mv = I.move(),
					direction =
						mv[1] < -0.5
							? "up"
							: mv[1] > 0.5
								? "down"
								: mv[0] < -0.5
									? "left"
									: mv[0] > 0.5
										? "right"
										: null;
				if (
					direction &&
					(direction !== app.upgradeNav || game.real > (app.upgradeNavAt || 0))
				) {
					shell._nav(direction);
					app.upgradeNavAt = game.real + 0.3;
				}
				app.upgradeNav = direction;
				if (I.pressed("confirm")) document.activeElement?.click();
			}
		}
		if (info) {
			app.online?.update(dt);
			if (
				app.online?.isHost &&
				app.online.started &&
				dt > 0 &&
				AIHub.time() >= 0 &&
				(app.world.s.time + dt) * 1000 <= AIHub.time() + 0.01 &&
				!app.online.ended &&
				!app.online.finished
			) {
				app.world.step(dt, app.online.intents());
				app.online.afterStep();
			}
		} else if (app.attract) {
			if (app.pendingAttractExit) {
				title();
				game.input.consumeAll();
				return;
			}
			app.demoTime += dt;
			const stages = [0, 14, 30, 44, 58, 72];
			if (
				app.demoStage < stages.length - 1 &&
				app.demoTime >= stages[app.demoStage + 1]
			) {
				app.demoStage++;
				if (app.demoStage === 1) {
					app.world.dev("act", 0);
					app.world.dev("wave", 1);
				}
				if (app.demoStage === 2) {
					app.world.dev("act", 1);
					app.world.dev("wave", 1);
				}
				if (app.demoStage >= 3)
					app.world.dev("boss", Math.min(2, app.demoStage - 3));
				app.world.s.players[0].invuln = 1e8;
				app.lastLifecycle = "";
				app.lastEvent = 0;
			}
			if (app.demoTime > 89) {
				startAttract();
				return;
			}
			const intents = {};
			for (const p of app.world.s.players) intents[p.id] = app.world.bot(p);
			app.world.s.objective.integrity = Math.max(
				75,
				app.world.s.objective.integrity,
			);
			app.world.step(dt, intents);
		} else if (app.mode === "title") {
			if (shell?.screen !== "join" && game._join) game.allowJoin(false);
			if (!shell?.screen) title();
			if (game.real - app.lastActivity >= 10 - 1e-7) {
				startAttract();
				return;
			}
		} else if (
			!game.paused &&
			(!shell?.screen || ["upgrade"].includes(shell.screen))
		) {
			const intents = {};
			for (const p of s.players) intents[p.id] = app.getIntent(p.id);
			const speed = game.settings.devSpeed || 1;
			for (let k = 0; k < Math.ceil(speed); k++)
				app.world.step((dt * speed) / Math.ceil(speed), intents);
		}
		if (app.ended) return;
		const now = app.world.s,
			lifecycle = now.state + ":" + now.act + ":" + (now.result?.won ?? "");
		if (app.mode !== "title" && lifecycle !== app.lastLifecycle) {
			app.lastLifecycle = lifecycle;
			if (now.state === "upgrade" && !app.attract) upgrade();
			else if (shell?.screen === "upgrade") shell.hide();
			if (now.state === "result" && !app.attract) result();
		}
		if (app.mode !== "title") {
			for (const ev of now.events)
				if (ev.id > app.lastEvent) {
					app.renderer?.event(ev);
					if (!app.attract) app.audio.event(ev);
					app.lastEvent = ev.id;
					if (ev.kind === "damage" && game.settings.shake > 0) game.shake(2);
				}
		}
		const scene =
			app.mode === "title"
				? "title"
				: now.result
					? now.result.won
						? "win"
						: "lose"
					: now.boss
						? "boss"
						: "act" + now.act;
		if (scene !== lastAudioScene) {
			lastAudioScene = scene;
			app.audio.setScene(scene);
		}
		const paused = game.paused || document.hidden || app.ended || app.attract;
		if (paused !== oldPaused) {
			oldPaused = paused;
			if (paused) app.audio.suspend();
			else app.audio.resume();
		}
		app.audio.update(dt);
		// Native input polls pads with its radial deadzone. Only meaningful pad activity resets attract.
		if (
			game.players.some(
				(i) =>
					Math.hypot(...i.padMove) > 0.22 ||
					(i.padAim && Math.hypot(...i.padAim) > 0.22) ||
					i.padPrev.some(Boolean),
			)
		) {
			app.activity();
			if (!app.audio.unlocked && !app.ended) app.audio.unlock();
		}
		if (game.real - app.lastUi > 0.08) {
			app.lastUi = game.real;
			updateHud();
		}
	}
	const scene = {
		pausable: true,
		camera: { zoom: false },
		update: commonUpdate,
		draw: (r) =>
			app.renderer?.draw(r, app.world.s, {
				title: app.mode === "title",
				attract: app.attract,
				debug: game.settings.devDebug,
				reducedFlashes: game.settings.reducedFlashes,
				shake: game.settings.shake,
			}),
	};
	game.start({
		scene: info ? "run" : "title",
		scenes: { title: { ...scene, pausable: false }, run: scene },
	});
	if (info) {
		app.online = new SF.Online(info, app);
		app.mode = "hub";
	} else title();
	game.debug = {
		manual: (on = true) => {
			app.manual = on;
		},
		snapshot: () => ({
			title: SF.title,
			mode: app.mode,
			overlay: shell?.screen || null,
			state: app.world.snapshot(),
			errors: game.errors,
			audio: app.audio.diagnostics(),
			online: app.online?.diagnostics(),
		}),
		start: () => startRun(false),
		step: (seconds, bot = false) => {
			const end = app.world.s.time + seconds;
			while (app.world.s.time < end && !app.world.s.result) {
				const intents = {};
				for (const p of app.world.s.players)
					intents[p.id] = bot ? app.world.bot(p) : {};
				app.world.step(SF.DT, intents);
			}
			updateHud();
		},
		action: (a, v) => app.world.dev(a, v),
		showDev: () => {
			game.pause();
			dev();
		},
		showCredits: about,
		showSettings: options,
		title,
		attract: startAttract,
		advanceMenu: (seconds) => game.advance(seconds, { draw: true }),
	};
	let previous = performance.now();
	const timer = setInterval(() => {
		if (app.ended) return;
		const now = performance.now(),
			elapsed = (now - previous) / 1000;
		previous = now;
		if (!app.manual) game.advance(info ? elapsed : Math.min(0.1, elapsed));
	}, 16);
	let raf = 0;
	function draw() {
		if (app.ended) return;
		if (!dedicated) game.advance(0, { draw: true });
		raf = requestAnimationFrame(draw);
	}
	if (!dedicated) raf = requestAnimationFrame(draw);
	app.dispose = () => {
		clearInterval(timer);
		cancelAnimationFrame(raf);
		app.online?.shutdown();
		app.audio.stop();
		app.controls.clear();
		game.dispose();
	};
	addEventListener("pagehide", () => app.dispose(), { once: true });
	document.body.dataset.game = "space-fort-after-dark";
	document.body.dataset.ready = "true";
})(globalThis);
