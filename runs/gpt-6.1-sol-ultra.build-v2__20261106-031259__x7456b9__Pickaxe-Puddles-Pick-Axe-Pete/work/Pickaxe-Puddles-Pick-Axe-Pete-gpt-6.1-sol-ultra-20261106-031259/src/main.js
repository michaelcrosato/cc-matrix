/* Single entry point. The engine clock owns visible stepping; Net owns hidden authority stepping. */
(async () => {
	const E = globalThis.My3D2dge,
		PP = globalThis.PP,
		$ = (id) => document.getElementById(id);
	const esc = (value) =>
		String(value ?? "").replace(
			/[&<>"']/g,
			(c) =>
				({
					"&": "&amp;",
					"<": "&lt;",
					">": "&gt;",
					'"': "&quot;",
					"'": "&#39;",
				})[c],
		);
	const neutral = () => ({
		mx: 0,
		my: 0,
		jump: false,
		jumpHeld: false,
		chop: false,
		redirect: false,
		interact: false,
		interactHeld: false,
		aim: 0,
	});
	const DEFAULTS = {
		music: 0.1,
		sfx: 0.8,
		voice: 0.65,
		mute: false,
		reducedMotion: false,
		reducedFlashes: false,
		shake: 0.5,
		glyphs: "playstation",
		deadzone: 0.22,
		hints: true,
	};
	let settings = { ...DEFAULTS };
	try {
		const saved = JSON.parse(
			localStorage.getItem("pickaxe-puddles:settings") || "{}",
		);
		for (const k of Object.keys(DEFAULTS))
			if (typeof saved[k] === typeof DEFAULTS[k]) settings[k] = saved[k];
	} catch {}
	let sim,
		game,
		input,
		view,
		audio,
		mode = "title",
		screen = "title",
		page = 0,
		focusIndex = 0,
		idle = 0,
		practice = null,
		localCoop = false,
		timeScale = 1,
		debugOverlay = false,
		scenario = false,
		panelParent = "title",
		toastT = 0,
		lastHud = -1,
		lastCaption = null,
		pendingBind = null,
		bindDevice = "keys",
		bindArmed = false,
		attractLoop = 0,
		disposed = false;
	const app = {
		version: "1.0.0",
		title: PP.CONFIG.title,
		get sim() {
			return sim;
		},
		get game() {
			return game;
		},
		get net() {
			return net;
		},
		get input() {
			return input;
		},
		get audio() {
			return audio;
		},
		get mode() {
			return mode;
		},
		get screen() {
			return screen;
		},
		get settings() {
			return { ...settings };
		},
		snapshot: () => sim?.snapshot(),
		start: (options) => startRun(options),
		pause: () => pause(),
		show: (name, p) => show(name, p),
		action: (name) => action(name),
		advance: (seconds) => game?.advance(seconds, { draw: true }),
		dispose: () => dispose(),
		diagnostics: () => ({
			mode,
			screen,
			errors: game?.errors || [],
			net: net?.diagnostics(),
			audio: audio?.diagnostics(),
			idle,
			score: sim?.score,
			timeScale,
			practice,
		}),
	};
	globalThis.__pp = app;
	const net = new PP.Net({
		createSim: (options) => new PP.Sim(options),
		onClockHandoff: (background) => {
			if (
				!background &&
				game?.scene &&
				!disposed &&
				mode !== "hub-end" &&
				!net.ended
			) {
				game.stop();
				game.start();
			}
		},
		onState: (value) => {
			sim = value;
			if (input) input.setContext(sim);
		},
		onStatus: (status, detail) => {
			if (status === "end") {
				mode = "hub-end";
				screen = null;
				input?.dispose();
				audio?.dispose();
				game?.stop();
				if (game) game.audio.stop?.();
				$("screen-panel").hidden = true;
				$("hub-status").textContent =
					detail?.reason === "host-left"
						? "ROUND VOID · authority left"
						: "ROUND COMPLETE · awaiting Hub results";
				$("hub-status").hidden = false;
			} else if (status === "time-up")
				toast("SHIFT OVER · awaiting Hub results");
		},
	});
	const active = await net.connect();
	if (active && net.server) {
		mode = "authority";
		screen = null;
		$("screen-panel").hidden = true;
		$("hub-status").textContent = "MINE AUTHORITY";
		app.ready = true;
		return;
	}
	game = new E.Game({
		canvas: "screen",
		id: "pickaxe-puddles",
		view: "side",
		views: ["side"],
		res: [960, 720],
		expand: true,
		input: "PLATFORMER",
		bg: "#071b20",
		autoPause: false,
		menu: false,
		corner: false,
		fullscreen: false,
		backGesture: false,
		camera: { zoom: false, rotate: false },
		step: 1 / 120,
	});
	view = new PP.View(game);
	audio = new PP.Audio(settings, game);
	input = new PP.Input(game, {
		onActivity: () => {
			idle = 0;
			audio.unlock();
			if (mode === "attract") {
				exitAttract();
				return true;
			}
			return false;
		},
		onPause: (event) => {
			if (mode === "play") {
				pause();
				if (event.reason === "disconnect")
					toast("CONTROLLER LOST · reconnect or use keyboard to resume");
			}
		},
		onMenu: (event) => menuInput(event.action),
	});
	input.settings = settings;
	input.localId = active ? net.localId : null;
	view.localId = active ? net.localId : null;
	const saveSettings = () => {
		try {
			localStorage.setItem(
				"pickaxe-puddles:settings",
				JSON.stringify(settings),
			);
		} catch {}
		audio.set(settings);
		input.settings = settings;
		document.body.classList.toggle("reduced-motion", settings.reducedMotion);
		game.settings.set("shake", settings.shake);
		game.settings.set("flashes", settings.reducedFlashes ? 0.2 : 1);
		game.settings.set("reduceMotion", settings.reducedMotion);
	};
	saveSettings();
	const panel = (eyebrow, title, content, footer = "") =>
		`<section class="panel ${screen === "developer" ? "panel-wide" : ""}"><div class="eyebrow">${eyebrow}</div><h2>${title}</h2>${content}${footer}</section>`;
	const button = (name, title, subtitle = "", primary = false) =>
		`<button type="button" data-nav data-do="${name}" class="menu-button ${primary ? "primary" : ""}"><span>${title}${subtitle ? `<small>${subtitle}</small>` : ""}</span><span class="arrow" aria-hidden="true">↗</span></button>`;
	const footer = (back = "back", more = null, count = "") =>
		`<div class="panel-footer"><button data-nav data-do="${back}">← Back</button><span class="page-count">${count}</span>${more ? `<button data-nav data-do="${more}">Next →</button>` : ""}</div>`;
	const range = (
		key,
		title,
		min,
		max,
		step,
		value,
		kind = "setting",
		suffix = "%",
	) =>
		`<div class="setting-row"><label for="range-${key}">${title}</label><input data-nav id="range-${key}" data-${kind}="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" aria-label="${title}"><output id="out-${key}">${Number(value).toFixed(step < 1 ? 2 : 0)}${suffix}</output></div>`;
	const toggle = (key, title) =>
		`<div class="setting-row"><label for="check-${key}">${title}</label><input data-nav data-setting="${key}" type="checkbox" id="check-${key}" ${settings[key] ? "checked" : ""}></div>`;
	function show(name, p = 0) {
		if (disposed || mode === "hub-end") return;
		screen = name;
		page = p;
		focusIndex = 0;
		pendingBind = null;
		input.menu = !!name;
		input.clear();
		const root = $("screen-panel");
		root.hidden = !name;
		root.className = name === "title" ? "title-screen" : "";
		$("hud").hidden = name === "title" || mode === "title";
		$("bottom-hud").hidden = mode === "title";
		$("pause-button").hidden = mode !== "play" || !!name;
		$("context-action").hidden = true;
		$("attract-label").hidden = mode !== "attract";
		if (!name) {
			audio.pause(false);
			return;
		}
		if (!active && mode === "play") audio.pause(true);
		if (name === "title") {
			root.innerHTML = `<section class="title-card"><div class="eyebrow">A very questionable mining expedition</div><h1>Pickaxe<span>Puddles</span></h1><p class="tagline">Big rocks. Tiny plan.<br><b>One last spectacular payday.</b></p><div class="menu-stack">${button("expedition", "Enter the mine", "Solo expedition · three chambers", true)}${button("coop", "Local co-op", "Two miners. One shared payday.")}${button("practice", "Chamber practice", "Learn the lanes. Keep your helmet.")}</div><div class="title-links"><button data-nav data-do="settings" class="text-button">Settings</button><button data-nav data-do="how" class="text-button">How to play</button><button data-nav data-do="about" class="text-button">About / credits</button></div></section><div class="title-foot"><span>Inspired by Pick Axe Pete · 1982</span><span>Keyboard · mouse · gamepad · touch <strong> / Idle for a demo</strong></span></div>`;
		} else if (name === "pause") {
			root.innerHTML = panel(
				active
					? "Live Hub session · the mine keeps running"
					: "Take a breather, prospector",
				"Tools down.",
				`<p class="panel-intro">${active ? "Your miner waits while this panel is open. The shared world and Hub deadline continue." : "The mine is paused. Your next big idea can wait a moment."}</p><div class="menu-stack">${button("resume", "Back to work", "", true)}${button("settings", "Settings")}${button("controls", "Controls / rebind")}${button("developer", active ? "Developer · observe" : "Developer tools")}${button("about", "About / credits")}${active ? "" : button("retry", "Retry this chamber", "Unbanked chamber gold is forfeited")}${!active && localCoop ? button("dropout", "Partner clock out", "Continue solo") : ""}${active ? "" : button("title", "Leave the mine")}</div>`,
			);
		} else if (name === "practice") {
			root.innerHTML = panel(
				"Chamber practice",
				"Learn the lay of the mine.",
				`<p class="panel-intro">All tools and routes are available. Practice scores stay separate from your expedition record.</p><div class="practice-grid">${PP.CHAMBERS.map((r, i) => `<button data-nav data-do="practice-${i}" class="menu-button"><span class="practice-number">0${i + 1}</span><span class="practice-copy"><strong>${r.name}</strong><small>${r.subtitle}</small></span><span>↗</span></button>`).join("")}</div>`,
				footer("title"),
			);
		} else if (name === "coop") {
			root.innerHTML = panel(
				"Simultaneous local co-op",
				"A partner in grime.",
				`<p class="panel-intro">Player one uses keyboard and mouse, or the first pad. Press <b>Options / Start on a free pad</b> to clock in as player two.</p><p class="panel-intro">A second pad may join during the first eight seconds of a chamber. Share the key, hold Interact beside a fallen partner to rescue, and watch each other’s ricochets.</p><div class="menu-stack">${button("start-coop", "Start local co-op", "Partner can join at the entrance", true)}</div><p class="settings-note">Online co-op is available when this game is launched in an AI Hub shared-world session.</p>`,
				footer("title"),
			);
		} else if (name === "settings") {
			const pages = ["Sound", "Comfort", "Controller"];
			page = ((page % pages.length) + pages.length) % pages.length;
			let content = "";
			if (page === 0)
				content =
					range("music", "Music", 0, 100, 1, Math.round(settings.music * 100)) +
					range(
						"sfx",
						"Sound effects",
						0,
						100,
						1,
						Math.round(settings.sfx * 100),
					) +
					range(
						"voice",
						"Prospector gibberish",
						0,
						100,
						1,
						Math.round(settings.voice * 100),
					) +
					toggle("mute", "Mute all sound") +
					'<p class="settings-note">An original, code-played mining score. Music starts at 10%. Sound begins after your first button press or tap.</p>';
			if (page === 1)
				content =
					toggle("reducedMotion", "Reduce motion") +
					toggle("reducedFlashes", "Reduce flashes") +
					range(
						"shake",
						"Screen shake",
						0,
						100,
						1,
						Math.round(settings.shake * 100),
					) +
					toggle("hints", "Show coaching prompts");
			if (page === 2)
				content =
					`<div class="setting-row"><span>Button symbols</span><button data-nav data-do="glyphs">${settings.glyphs === "xbox" ? "Xbox A B X Y" : "PlayStation ✕ ○ □ △"}</button></div>` +
					range(
						"deadzone",
						"Stick dead zone",
						12,
						70,
						1,
						Math.round(settings.deadzone * 100),
					) +
					`<div class="menu-stack">${button("controls", "Rebind controls")}${button("reset-settings", "Reset player settings")}</div>`;
			root.innerHTML = panel(
				"Player settings",
				pages[page],
				content,
				footer("back", "settings-next", `${page + 1} / 3`),
			);
		} else if (name === "controls") {
			root.innerHTML = panel(
				"Your own bindings · saved automatically",
				"Make yourself comfortable.",
				`<div class="setting-row"><span>Rebinding device</span><button data-nav data-do="bind-device">${bindDevice === "keys" ? "Keyboard / mouse" : "Gamepad"}</button></div>${["jump", "chop", "redirect", "interact"].map((a) => `<div class="setting-row"><span>${{ jump: "Jump", chop: "Chop · hold to repeat", redirect: "Redirect · aim high / low", interact: "Door / hold to rescue" }[a]}</span><button data-nav data-do="bind-${a}">${esc(game.input.label(a, bindDevice === "keys" ? "keyboard" : "gamepad"))}</button></div>`).join("")}<p class="settings-note" id="bind-note">Choose an action, then press its new button. Menu controls are reserved. A/D or arrows move; W/S or arrows climb and duck. Jump sideways to leave a ladder.</p><button data-nav data-do="reset-controls" class="text-button">Restore default bindings</button>`,
				footer("back"),
			);
		} else if (name === "how") {
			const pages = [
				[
					"Make the mine work for you.",
					"Hold Chop to smash ordinary ore for gold. Your pick lasts six successful contacts; misses cost nothing. Banded heavy ore takes three chops.",
					[
						["Move / climb", "A D / W S · left stick / D-pad"],
						["Jump / duck", "Space / Down · ✕ / ○"],
						["Chop / redirect", "J / Q · □ / R2"],
						["Door / rescue", "E · △ (hold to rescue)"],
					],
				],
				[
					"A better bad idea.",
					"Redirect a rock into another rock for collision rewards. Up chooses a high arc, Down a low arc. Redirected ore glows, then becomes dangerous to BOTH miners after a short grace.",
					[
						["Picks fall", "Follow the ↓ supply to a lower landing."],
						["Keys rise", "Catch the ⚿ before it escapes."],
						["Doors need a key", "Walk past freely. Interact to unlock."],
						["Broken pick?", "Jump, duck and climb. Supplies return."],
					],
				],
				[
					"Read the room.",
					"Permanent ladders always offer a route. Pale shortcuts form and fade; flashing rungs warn before expiry. Three helmet marks, a safety net, and chamber checkpoints keep a bad idea recoverable.",
					[
						["SUN ☀", "Steady rolling lanes."],
						["MOON ☾", "Bouncing ore and rich seams."],
						["STAR ✦", "Heavy ore and larger collision rewards."],
						[
							"Touch",
							"Left thumb moves/climbs; tap right to jump. Chop is assisted. Context bubble redirects, opens or rescues.",
						],
					],
				],
			];
			const data = pages[page % 3];
			root.innerHTML = panel(
				"The prospector’s field guide",
				data[0],
				`<p class="panel-intro">${data[1]}</p><div class="controls-diagram">${data[2].map(([a, b]) => `<p><strong>${a}</strong>${b}</p>`).join("")}</div>`,
				footer("back", "how-next", `${(page % 3) + 1} / 3`),
			);
		} else if (name === "about") renderAbout();
		else if (name === "developer") renderDeveloper();
		else if (name === "results") renderResults();
		bindUI();
	}
	function renderAbout() {
		const f = PP.FEEDBACK,
			source = Object.entries(f.sourceInformation),
			groups = [];
		for (let i = 0; i < source.length; i += 4)
			groups.push({
				title: "Source Information",
				entries: source
					.slice(i, i + 4)
					.map(([k, v]) => [k.replace(/([A-Z])/g, " $1"), v]),
			});
		groups.push({
			title: "Testing Feedback",
			entries: f.testingFeedback.map((v, i) => [
				[
					"Issues caught",
					"Critical issues",
					"Most helpful test",
					"Least helpful test",
				][i],
				v,
			]),
		});
		const eq = [
			"Favorite engine feature",
			"Wrong turns",
			"Most important custom system",
			"Hardest engine task",
			"Engine changes",
			"One suggested improvement",
		];
		for (let i = 0; i < 6; i += 3)
			groups.push({
				title: "Engine Feedback",
				entries: f.engineFeedback.slice(i, i + 3).map((v, j) => [eq[i + j], v]),
			});
		groups.push({
			title: "Prompt Feedback",
			entries: f.promptFeedback.map((v, i) => [
				[
					"What worked",
					"What was confusing",
					"Hardest task",
					"Suggested change",
				][i],
				v,
			]),
		});
		groups.push({
			title: "Credits & source notes",
			entries: [
				[
					"Game & score",
					"Pickaxe Puddles · original design, procedural art, animation and code-generated audio built with my-3d2dge.",
				],
				[
					"Inspiration",
					"Pick Axe Pete! (1982), Ed Averett / North American Philips. This independent adaptation adds redirects, health, co-op and an extraction finale. Original source sound is unknown.",
				],
				[
					"Dependencies",
					"my-3d2dge 0.89.1 by Michael Crosato · AI Hub client 1.4.0. Vendored unmodified; provenance and licenses included in development files.",
				],
				[
					"Verification limits",
					"Real controller feel, real iOS behavior, TV comfort and listening quality are unknown.",
				],
			],
		});
		page = ((page % groups.length) + groups.length) % groups.length;
		const group = groups[page];
		$("screen-panel").innerHTML = panel(
			"Pickaxe Puddles · made of code and questionable judgment",
			group.title,
			group.entries
				.map(
					([label, value]) =>
						`<div class="about-entry"><strong>${esc(label)}</strong><p>${esc(value)}</p></div>`,
				)
				.join(""),
			footer("back", "about-next", `${page + 1} / ${groups.length}`),
		);
	}
	function renderDeveloper() {
		const readonly = active,
			keys = Object.keys(PP.TUNING),
			tuningPages = Math.ceil(keys.length / 5),
			total = tuningPages + 2;
		page = ((page % total) + total) % total;
		let content = `<p class="panel-intro">${readonly ? "Live Hub observation. Only the authority changes game state; these tools do not alter a session." : "Using tools marks this run DEVELOPER and excludes it from score records. Balance changes apply immediately, except new-rock speed, fresh-pick capacity and pickup lifetimes at spawn."}</p>`;
		if (page === 0)
			content += `<div class="dev-grid">${["Invulnerability", "Grant fresh pick", "Grant rising key", "Spawn ordinary ore", "Spawn bouncing ore", "Spawn heavy ore", "Open collision seam", "Purge ore", "Drop replacement pick", "Restart checkpoint", "Slow motion", "Step one tick", "Collision / route overlay", "Replay seed", "Run scripted pilot", "Reset all tuning"].map((label, i) => `<button data-nav data-do="dev-${i}" ${readonly && ![12].includes(i) ? "disabled" : ""}>${label}</button>`).join("")}</div>`;
		else if (page <= tuningPages)
			content += keys
				.slice((page - 1) * 5, page * 5)
				.map((k) => {
					const s = PP.TUNING[k];
					return range(
						k,
						s.label,
						s.min,
						s.max,
						s.step,
						sim.tuning[k],
						"tuning",
						s.unit,
					);
				})
				.join("");
		else
			content += `<div class="dev-grid">${PP.CHAMBERS.map((r, i) => `<button data-nav data-do="dev-chamber-${i}" ${readonly ? "disabled" : ""}>0${i + 1} · ${r.name}</button>`).join("")}${PP.ROUTES.map((r, i) => `<button data-nav data-do="dev-route-${i}" ${readonly ? "disabled" : ""}>${r.name} lane arrangement</button>`).join("")}</div><div class="dev-status" id="dev-status"></div>`;
		content += `<p class="settings-note">Seed ${esc(sim.seed)} · tick ${sim.tick} · epoch ${sim.epoch} · ${sim.room.name} · ${sim.rocks.length} ore · ${sim.pickups.length} supplies${readonly ? " · READ ONLY" : ""}</p>`;
		$("screen-panel").innerHTML = panel(
			readonly
				? "Developer · session observer"
				: "Developer · the foreman’s toolbox",
			page === 0
				? "Make a little trouble."
				: page <= tuningPages
					? `Live balance · ${page} / ${tuningPages}`
					: "Chambers & director",
			content,
			footer("back", "dev-next", `${page + 1} / ${total}`),
		);
		if (readonly)
			$("screen-panel")
				.querySelectorAll("input")
				.forEach((el) => {
					el.disabled = true;
				});
		updateDevStatus();
	}
	function renderResults() {
		const done = sim.completed,
			won = done?.won,
			secs = Math.floor(sim.time),
			record = bestScore();
		const ore = sim.miners.reduce((n, m) => n + m.stats.ore, 0),
			dodges = sim.miners.reduce((n, m) => n + m.stats.dodges, 0);
		const headline = won
			? "That’ll buy a bigger helmet."
			: "A small dent in the plan.";
		const text = won
			? practice !== null
				? "Chamber practice complete. Ready for the whole shift?"
				: "The Motherlode is yours. The mine would like its rocks back."
			: `The crew was bowled over in ${sim.room.name}. Retry at this chamber’s checkpoint; its unbanked gold is forfeited.`;
		$("screen-panel").innerHTML = panel(
			won ? "Extraction complete · payday!" : "Shift ended · helmets off",
			headline,
			`<p class="panel-intro">${text}</p><div class="results-number">${sim.score}<span style="font-size:22px"> GOLD</span></div><div class="results-stats"><div class="stat"><strong>${ore}</strong><span>Ore broken</span></div><div class="stat"><strong>×${sim.bestChain || 1}</strong><span>Best collision</span></div><div class="stat"><strong>${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}</strong><span>Shift time</span></div></div><p class="panel-intro">${sim.miners.map((m) => `${esc(m.name)}: ${m.stats.ore} ore · ${m.stats.redirects} redirects · ${m.stats.rescues} rescues`).join("<br>")}</p><div class="menu-stack">${button(won ? "replay" : "retry", won ? "Another spectacular payday" : "Retry this chamber", "", true)}${button("practice", "Chamber practice")}${button("title", "Back to the entrance")}</div><p class="settings-note">${sim.developer ? "Developer run · record unchanged" : practice !== null ? "Practice run · record unchanged" : `Best completed expedition: ${record} gold · ${dodges} close evasions this run`}</p>`,
		);
	}
	function bindUI() {
		const root = $("screen-panel");
		root.querySelectorAll("[data-nav]").forEach((el) => {
			el.addEventListener("pointerenter", () => {
				idle = 0;
				focusIndex = navItems().indexOf(el);
				focus(false);
			});
			el.addEventListener("click", () => {
				if (el.dataset.do) action(el.dataset.do);
			});
		});
		root.querySelectorAll("input").forEach((el) => {
			el.addEventListener("input", () => {
				if (el.dataset.tuning) {
					if (active) return;
					markDeveloper();
					sim.setTuning(el.dataset.tuning, Number(el.value));
					const spec = PP.TUNING[el.dataset.tuning];
					$(`out-${el.dataset.tuning}`).textContent =
						Number(el.value).toFixed(spec.step < 1 ? 2 : 0) + spec.unit;
				} else {
					const key = el.dataset.setting;
					settings[key] =
						el.type === "checkbox" ? el.checked : Number(el.value) / 100;
					saveSettings();
					const out = $(`out-${key}`);
					if (out) out.textContent = `${el.value}%`;
				}
			});
		});
		focus(false);
	}
	function navItems() {
		return [
			...$("screen-panel").querySelectorAll("[data-nav]:not([disabled])"),
		];
	}
	function focus(sound = true) {
		const items = navItems();
		focusIndex = (focusIndex + items.length) % (items.length || 1);
		items.forEach((el, i) => {
			el.classList.toggle("focused", i === focusIndex);
		});
		const selected = items[focusIndex];
		selected?.focus({ preventScroll: true });
		selected?.scrollIntoView({ block: "nearest", behavior: "instant" });
		if (sound)
			audio.event({ id: `ui-focus-${performance.now()}`, type: "focus" });
	}
	function menuInput(a) {
		if (pendingBind) return;
		if (!screen) return;
		const items = navItems(),
			el = items[focusIndex];
		if (a === "up" || a === "down") {
			focusIndex += a === "up" ? -1 : 1;
			focus();
		} else if (a === "left" || a === "right") {
			if (el?.type === "range") {
				el.value = Math.max(
					Number(el.min),
					Math.min(
						Number(el.max),
						Number(el.value) + Number(el.step) * (a === "right" ? 1 : -1),
					),
				);
				el.dispatchEvent(new Event("input", { bubbles: true }));
			} else {
				focusIndex += a === "left" ? -1 : 1;
				focus();
			}
		} else if (a === "accept") {
			if (el?.type === "checkbox") {
				el.checked = !el.checked;
				el.dispatchEvent(new Event("input", { bubbles: true }));
			} else if (el?.type !== "range") el?.click();
		} else if (a === "back") back();
	}
	function back() {
		if (screen === "pause") show(null);
		else if (screen === "results") action("title");
		else show(mode === "play" ? "pause" : "title");
	}
	function pause() {
		if (mode !== "play") return;
		show(screen ? null : "pause");
		audio.event({ id: `ui-pause-${performance.now()}`, type: "pause" });
	}
	function toast(text) {
		if (disposed) return;
		$("toast").textContent = text;
		$("toast").hidden = false;
		toastT = 3.2;
	}
	function bestScore() {
		try {
			return Number(localStorage.getItem("pickaxe-puddles:best")) || 0;
		} catch {
			return 0;
		}
	}
	function markDeveloper() {
		if (!active) {
			sim.developer = true;
			$("dev-mark").hidden = false;
		}
	}
	function startRun({
		chamber = 0,
		coop = false,
		practice: practiceMode = false,
		seed = 1982,
	} = {}) {
		if (active) return;
		while (game.players.length > 1 && !coop) game.removePlayer(2);
		localCoop = coop;
		practice = practiceMode ? chamber : null;
		scenario = false;
		timeScale = 1;
		debugOverlay = false;
		attractLoop = 0;
		const seats = [{ id: 1, name: "Puddles", color: "#ffc56c" }];
		if (coop && game.players.length > 1)
			seats.push({ id: 2, name: "Pebbles", color: "#7de4d6" });
		sim = new PP.Sim({ seed, chamber, seats });
		mode = "play";
		idle = 0;
		audio.reset();
		view.reset();
		input.setContext(sim);
		$("dev-mark").hidden = true;
		configureJoin();
		show(null);
		lastHud = -1;
	}
	function configureJoin() {
		game.allowJoin(false);
		if (active || !localCoop) return;
		game.allowJoin({
			max: 2,
			keys: false,
			onJoin: (native, number) => {
				if (mode !== "play" || sim.miners.length >= 2 || sim.chamberTime > 8) {
					game.removePlayer(native);
					toast("PARTNER JOIN · press Start during a chamber entrance");
					return;
				}
				if (sim.addMiner({ id: number, name: "Pebbles", color: "#7de4d6" })) {
					input.clear();
					toast("PEBBLES CLOCKED IN · share the key, rescue your partner");
				}
			},
		});
	}
	function action(name) {
		idle = 0;
		audio.unlock();
		audio.event({ id: `ui-accept-${performance.now()}`, type: "accept" });
		if (name === "expedition" || name === "replay")
			return startRun({ coop: localCoop && name === "replay" });
		if (name === "start-coop") return startRun({ coop: true });
		if (name.startsWith("practice-"))
			return startRun({ chamber: Number(name.slice(-1)), practice: true });
		if (name === "resume") return show(null);
		if (name === "back") return back();
		if (name === "title") {
			if (active) return;
			mode = "title";
			practice = null;
			scenario = false;
			timeScale = 1;
			sim = new PP.Sim({ seed: 1982 });
			sim.transition = 0;
			audio.reset();
			audio.pause(false);
			view.reset();
			game.allowJoin(false);
			$("dev-mark").hidden = true;
			return show("title");
		}
		if (name === "retry") {
			if (!active) {
				sim.retry();
				mode = "play";
				scenario = false;
				audio.reset();
				view.reset();
				show(null);
			}
			return;
		}
		if (name === "dropout") {
			sim.removeMiner(2);
			game.removePlayer(2);
			localCoop = false;
			configureJoin();
			toast("PARTNER CLOCKED OUT · solo route remains open");
			return show("pause");
		}
		if (
			[
				"settings",
				"controls",
				"about",
				"how",
				"practice",
				"coop",
				"developer",
			].includes(name)
		) {
			panelParent = screen || (mode === "play" ? "pause" : "title");
			return show(name);
		}
		if (name === "settings-next") return show("settings", page + 1);
		if (name === "how-next") return show("how", page + 1);
		if (name === "about-next") return show("about", page + 1);
		if (name === "dev-next") return show("developer", page + 1);
		if (name === "glyphs") {
			settings.glyphs = settings.glyphs === "xbox" ? "playstation" : "xbox";
			saveSettings();
			return show("settings", 2);
		}
		if (name === "reset-settings") {
			settings = { ...DEFAULTS };
			saveSettings();
			return show("settings", 2);
		}
		if (name === "reset-controls") {
			game.input.resetBindings();
			return show("controls");
		}
		if (name === "bind-device") {
			bindDevice = bindDevice === "keys" ? "pad" : "keys";
			return show("controls");
		}
		if (name.startsWith("bind-")) {
			pendingBind = name.slice(5);
			bindArmed = false;
			$("bind-note").textContent =
				`Press a new ${bindDevice === "keys" ? "key or mouse button" : "gamepad button"} for ${pendingBind}. Escape cancels.`;
			input.clear();
			return;
		}
		if (name.startsWith("dev-")) devAction(name.slice(4));
	}
	function devAction(value) {
		if (active) {
			if (value === "12") {
				debugOverlay = !debugOverlay;
				toast(debugOverlay ? "COLLISION OVERLAY ON" : "COLLISION OVERLAY OFF");
			}
			return;
		}
		markDeveloper();
		const m = sim.miners.find((m) => !m.downed) || sim.miners[0],
			h = m.hero;
		if (value.startsWith("chamber-")) {
			sim.enter(Number(value.slice(-1)));
			return show("developer", page);
		}
		if (value.startsWith("route-")) {
			sim.enter(sim.chamber, Number(value.slice(-1)));
			return show("developer", page);
		}
		switch (Number(value)) {
			case 0:
				sim.invincible = !sim.invincible;
				toast(`INVULNERABILITY ${sim.invincible ? "ON" : "OFF"}`);
				break;
			case 1:
				m.tool = sim.tuning.durability;
				sim.emit("pickCollect", {
					miner: m.id,
					x: h.x,
					z: h.z,
					text: "DEVELOPER · fresh pick",
				});
				break;
			case 2:
				sim.spawnPickup("key", h.x + 25, h.z + 16);
				break;
			case 3:
			case 4:
			case 5:
				sim.spawnRock({
					x: Math.min(540, h.x + 90),
					z: h.z + 15,
					vx: -sim.tuning.rockSpeed,
					kind: ["normal", "bounce", "heavy"][Number(value) - 3],
				});
				break;
			case 6:
				sim.schedulePair();
				break;
			case 7:
				sim.rocks = [];
				break;
			case 8:
				sim.spawnPickup("pick", h.x + 40, h.z + 80);
				break;
			case 9:
				sim.completed = null;
				sim.retry();
				break;
			case 10:
				timeScale = timeScale === 1 ? 0.25 : 1;
				toast(`TIME SCALE ${timeScale}×`);
				break;
			case 11:
				sim.step(
					1 / 120,
					Object.fromEntries(sim.miners.map((m) => [m.id, neutral()])),
				);
				view.update(1 / 120, sim, settings);
				toast(`STEP ${sim.tick}`);
				break;
			case 12:
				debugOverlay = !debugOverlay;
				break;
			case 13: {
				const seed = sim.seed;
				sim = new PP.Sim({ seed, tuning: sim.tuning });
				sim.developer = true;
				audio.reset();
				view.reset();
				break;
			}
			case 14:
				scenario = true;
				sim.invincible = true;
				sim.developer = true;
				show(null);
				toast("DEVELOPER PILOT · canonical input playback");
				return;
			case 15:
				sim.tuning = PP.defaults();
				toast("ALL BALANCE VALUES RESTORED");
				break;
		}
		show("developer", page);
	}
	function updateDevStatus() {
		const el = $("dev-status");
		if (el && sim)
			el.textContent = `Seed ${sim.seed} / RNG ${sim.rngState}\nWave ${sim.director.wave} · ore broken ${sim.director.kills} · collisions ${sim.director.collisions}\nNext door ${sim.director.spawnIn.toFixed(1)}s / seam ${sim.director.pairIn.toFixed(1)}s\nUnarmed wait ${sim.director.emptyTool.toFixed(1)}s / key wait ${sim.director.noKey.toFixed(1)}s\n${active ? JSON.stringify(net.diagnostics()) : "Native fixed tick 1/120s · one stepping owner"}`;
	}
	function beginAttract() {
		if (active) return;
		mode = "attract";
		practice = null;
		timeScale = 1;
		scenario = false;
		game.allowJoin(false);
		attractLoop++;
		sim = new PP.Sim({ seed: 99 });
		sim.attract = true;
		idle = 0;
		audio.reset();
		view.reset();
		show(null);
		input.menu = false;
		$("hud").hidden = false;
		$("bottom-hud").hidden = false;
		$("pause-button").hidden = true;
		$("attract-label").hidden = false;
		$("dev-mark").hidden = true;
	}
	function exitAttract() {
		mode = "title";
		timeScale = 1;
		idle = 0;
		input.clear();
		audio.reset();
		view.reset();
		sim = new PP.Sim();
		sim.transition = 0;
		show("title");
	}
	function updateHUD(force = false) {
		if (!sim || (!force && sim.tick - lastHud < 12 && sim.tick >= lastHud))
			return;
		lastHud = sim.tick;
		const activePlay = mode === "play" || mode === "attract";
		$("hud").hidden = !activePlay;
		$("bottom-hud").hidden = !activePlay;
		if (!activePlay) return;
		$("chamber-label").textContent = `0${sim.chamber + 1} / ${sim.room.name}`;
		$("chamber-sub").textContent = sim.room.finale
			? `EXTRACTION · BELL ${sim.director.wave} / ${sim.room.finale.waves}`
			: sim.room.subtitle;
		$("chamber-pips").innerHTML = PP.CHAMBERS.map(
			(_, i) => `<i class="${i <= sim.chamber ? "on" : ""}"></i>`,
		).join("");
		$("gold-count").textContent = String(sim.score).padStart(3, "0");
		$("miner-hud").innerHTML = sim.miners
			.map(
				(m, i) =>
					`<div class="miner-card" style="border-color:${esc(m.color || (i ? "#7de4d6" : "#ffc56c"))}"><strong>${esc(m.name)}${sim.keyOwner === m.id ? '<span class="badge key-badge">⚿ KEY</span>' : ""}</strong><div class="health">${m.downed ? "✚ DOWN" : "◆".repeat(m.health) + '<span style="opacity:.25">' + "◇".repeat(3 - m.health) + "</span>"}</div><div class="tool">${Array.from({ length: Math.max(sim.tuning.durability, m.tool) }, (_, j) => `<i class="${j < m.tool ? "" : "spent"}"></i>`).join("")}</div>${m.tool < 2 ? `<div class="tool-warning">${m.tool ? "LAST CONTACT" : "UNARMED · FIND ↓ PICK"}</div>` : ""}</div>`,
			)
			.join("");
		$("objective").textContent = sim.objective;
		$("tutorial").textContent = settings.hints ? sim.hint : "";
		const labels = [
			["jump", "Jump"],
			["chop", "Chop"],
			["redirect", "Redirect"],
			["interact", "Door / rescue"],
		];
		$("control-legend").innerHTML = labels
			.map(
				([a, label]) =>
					`<span><kbd>${esc(input.label(a))}</kbd>${label}</span>`,
			)
			.join("");
		$("dev-mark").hidden = !sim.developer;
		updateDevStatus();
		if (active) {
			$("hub-status").hidden = !["waiting", "countdown"].includes(net.status);
			$("hub-status").textContent =
				net.status === "waiting"
					? "CREW ASSEMBLING…"
					: `SHIFT STARTS IN ${Math.max(0, Math.ceil(-AIHub.time() / 1000))}`;
		}
	}
	function bindKey(event) {
		if (!pendingBind || bindDevice !== "keys") return;
		event.preventDefault();
		event.stopImmediatePropagation();
		if (event.code === "Escape") {
			pendingBind = null;
			show("controls");
			return;
		}
		const result = game.input.rebind(pendingBind, "keys", event.code);
		if (result) {
			$("bind-note").textContent =
				result === "reserved"
					? "That key is reserved for menus. Try another."
					: `That key already controls ${result}. Choose a free key.`;
			return;
		}
		pendingBind = null;
		show("controls");
	}
	document.addEventListener("keydown", bindKey, { capture: true });
	document.addEventListener(
		"pointerdown",
		(event) => {
			if (
				!pendingBind ||
				bindDevice !== "keys" ||
				event.pointerType !== "mouse"
			)
				return;
			event.preventDefault();
			event.stopImmediatePropagation();
			const result = game.input.rebind(
				pendingBind,
				"keys",
				`Mouse${event.button}`,
			);
			if (result)
				$("bind-note").textContent = `Button already used by ${result}.`;
			else {
				pendingBind = null;
				show("controls");
			}
		},
		{ capture: true },
	);
	document.addEventListener("visibilitychange", () => {
		if (document.hidden && mode === "play" && !screen && !active) show("pause");
	});
	let pointerWakeAnchor = null;
	document.addEventListener("pointermove", (event) => {
		if (event.pointerType !== "mouse") return;
		const distance = pointerWakeAnchor
			? Math.hypot(
					event.clientX - pointerWakeAnchor[0],
					event.clientY - pointerWakeAnchor[1],
				)
			: Math.hypot(event.movementX, event.movementY);
		if (mode === "attract" && distance >= 4) exitAttract();
		pointerWakeAnchor = [event.clientX, event.clientY];
	});
	$("pause-button").addEventListener("click", pause);
	function update(dt) {
		if (disposed || mode === "hub-end") return;
		input.menu = !!screen;
		input.setContext(sim);
		input.update(dt);
		if (pendingBind && bindDevice === "pad") {
			const pad = [...navigator.getGamepads()].find(Boolean);
			if (pad) {
				if (pad.buttons.every((b) => !b.pressed)) bindArmed = true;
				const which = pad.buttons.findIndex((b) => b.pressed);
				if (bindArmed && which >= 0) {
					const result = game.input.rebind(pendingBind, "pad", `Pad${which}`);
					if (!result) {
						pendingBind = null;
						show("controls");
					} else {
						$("bind-note").textContent =
							`Button is ${result === "reserved" ? "reserved for menus" : `used by ${result}`}.`;
						bindArmed = false;
					}
				}
			}
		}
		if (toastT > 0) {
			toastT -= dt;
			if (toastT <= 0) $("toast").hidden = true;
		}
		if (mode === "title") {
			idle += dt;
			if (idle + 1e-7 >= 10) beginAttract();
		} else if (mode === "attract") {
			sim.step(
				dt,
				Object.fromEntries(
					sim.miners.map((m) => [
						m.id,
						PP.attractIntent(sim, m.id, attractLoop % 3),
					]),
				),
			);
			if (sim.completed) {
				idle += dt;
				if (idle >= 4) {
					idle = 0;
					beginAttract();
				}
			}
		} else if (mode === "play") {
			if (active) net.tick(dt, screen ? neutral() : input.intent(1));
			else if (!screen) {
				const intents = Object.fromEntries(
					sim.miners.map((m) => [
						m.id,
						scenario ? PP.pilot(sim, m.id, 0) : input.intent(m.id),
					]),
				);
				sim.step(dt * timeScale, intents);
				if (practice !== null && sim.chamber !== practice && !sim.completed)
					sim.finish(true, "Chamber practice complete");
				if (sim.completed) {
					if (
						sim.completed.won &&
						!sim.developer &&
						practice === null &&
						!sim.attract
					) {
						try {
							localStorage.setItem(
								"pickaxe-puddles:best",
								String(Math.max(bestScore(), sim.score)),
							);
						} catch {}
					}
					show("results");
					audio.pause(false);
				}
			}
		}
		view.update(dt, sim, settings);
		if (mode !== "title" && (!screen || screen === "results" || active))
			audio.update(dt, sim);
		updateHUD();
		const caption = audio.caption || audio.lastCaption;
		if (caption !== lastCaption) {
			lastCaption = caption;
			$("caption").textContent =
				typeof caption === "string" ? caption : caption?.text || "";
		}
	}
	if (active) {
		mode = "play";
		screen = null;
		input.localId = net.localId;
		show(null);
		game.allowJoin(false);
	} else {
		sim = new PP.Sim();
		sim.transition = 0;
		show("title");
	}
	game.start({
		scenes: {
			app: {
				pausable: false,
				view: "side",
				input: PP.Input.PRESET,
				update,
				draw: (r) =>
					view.draw(r, sim, settings, {
						attract: mode === "attract",
						debug: debugOverlay,
					}),
			},
		},
		scene: "app",
	});
	// Starting a scene applies its input preset; labels always read native saved bindings.
	input.clear();
	view.update(0, sim, settings);
	updateHUD(true);
	app.ready = true;
	function dispose() {
		if (disposed) return;
		disposed = true;
		net.dispose();
		input?.dispose();
		audio?.dispose();
		game?.dispose();
		document.removeEventListener("keydown", bindKey, { capture: true });
	}
	addEventListener("pagehide", dispose, { once: true });
})().catch((error) => {
	console.error(error);
	const root = document.getElementById("screen-panel");
	if (root) {
		root.hidden = false;
		root.innerHTML =
			'<section class="panel"><h2>The mine could not open.</h2><p id="boot-error"></p></section>';
		document.getElementById("boot-error").textContent = error.message;
	}
});
