/* Auto Lap Happy — screens, input, persistence, presentation. Original code, MIT. */
(() => {
	"use strict";
	const E = My3D2dge,
		{ PROFILES, DEFAULTS, TOUR } = HappyRules,
		ui = document.getElementById("ui"),
		$ = (s) => ui.querySelector(s),
		$$ = (s) => [...ui.querySelectorAll(s)],
		clamp = (x, a, b) => Math.max(a, Math.min(b, x)),
		html = (s) =>
			String(s ?? "").replace(
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
	const defaults = {
		auto: true,
		steering: "relative",
		glyphs: "ps",
		master: 0.72,
		music: 0.1,
		sfx: 0.7,
		voice: 0.45,
		mute: false,
		reduced: false,
		assist: 0.25,
		ghost: true,
	};
	const store = {
		read(k, d) {
			try {
				const v = JSON.parse(localStorage.getItem("happy:v1:" + k));
				return v && v.version === 1 ? v.data : d;
			} catch {
				return d;
			}
		},
		write(k, d) {
			if (network?.kind === "hub" || attracting) return;
			try {
				localStorage.setItem(
					"happy:v1:" + k,
					JSON.stringify({ version: 1, data: d }),
				);
			} catch {}
		},
	};
	let settings = { ...defaults },
		records = {},
		passport = [],
		network = null,
		attracting = false;
	Object.assign(settings, store.read("settings", {}));
	for (const k of ["master", "music", "sfx", "voice", "assist"])
		settings[k] = Number.isFinite(settings[k])
			? clamp(settings[k], 0, 1)
			: defaults[k];
	records = store.read("records", {});
	if (!records || typeof records !== "object" || Array.isArray(records))
		records = {};
	passport = store.read("passport", []);
	if (!Array.isArray(passport)) passport = [];
	const world = new HappyWorld(),
		sim = new HappySim(world, settings),
		vignette = new HappySim(world, settings),
		audio = new HappyAudio(settings),
		game = new E.Game({
			canvas: "screen",
			res: [640, 360],
			expand: true,
			view: "topdown",
			views: ["topdown"],
			menu: false,
			corner: false,
			fullscreen: false,
			autoPause: false,
			input: { unused: ["F24"] },
			bg: "#89a872",
		}),
		renderer = new HappyRenderer(game, world);
	game.cam.smooth = 0.15;
	game.setZoom(0.78);
	game.lights.enabled = true;
	game.lights.ambient = 0.94;
	passport = [
		...new Set(
			passport.filter((id) => world.discoveries.some((d) => d.id === id)),
		),
	];
	sim.discovered = new Set(passport);
	vignette.start({ mode: "trial", course: 0, profile: 2, laps: 50 });
	vignette.aiAll = true;
	vignette.attract = true;
	let screen = "title",
		previousScreen = "title",
		mode = "trial",
		setup = {
			course: 0,
			profile: 2,
			opponent: 4,
			laps: 2,
			target: 10,
			difficulty: "normal",
			humans: 1,
			seats: "auto",
		},
		focusIndex = 0,
		creditPage = 0,
		lastDevice = "keyboard",
		menuIdle = 0,
		attractAge = 0,
		attractIndex = 0,
		attractReturn = null,
		attractSim = null,
		paused = false,
		devOpen = false,
		showMap = false,
		active = false,
		gameTime = 0,
		hudAge = 0,
		resultsShown = false,
		networkStatus = "",
		connectionRole = "host",
		connectionOut = "",
		netInputs = [null, null],
		lastNetEventTick = -1,
		toast = "",
		toastT = 0,
		freeCamera = false;
	let keys = new Set(),
		touches = new Map(),
		touchRecover = false,
		padState = new Map(),
		menuRepeat = 0,
		lastPadCount = 0,
		lastInputAt = performance.now(),
		testInputs = null,
		consumedPointerUntil = 0,
		localBindings = null,
		focusSafe = false;
	function say(text, seconds = 3) {
		toast = text;
		toastT = seconds;
	}
	function glyph(action) {
		const xbox = settings.glyphs === "xbox";
		if (lastDevice === "pad")
			return (
				{
					confirm: xbox ? "A" : "✕",
					back: xbox ? "B" : "○",
					recover: xbox ? "Y" : "△",
					brake: xbox ? "LT" : "L2",
					pause: "☰",
					steer: "L",
				}[action] || action
			);
		if (lastDevice === "touch")
			return (
				{
					confirm: "Tap",
					back: "Back",
					recover: "Hold",
					brake: "Hold right",
					pause: "Ⅱ",
					steer: "Drag left",
				}[action] || action
			);
		return (
			{
				confirm: "Enter",
				back: "Esc",
				recover: "R",
				brake: "Space",
				pause: "Esc",
				steer: "A / D",
			}[action] || action
		);
	}
	function footer(extra = "") {
		return `<div class="footer"><span><b class="key" data-prompt="confirm">${glyph("confirm")}</b> Select</span><span><b class="key" data-prompt="back">${glyph("back")}</b> Back</span><span class="push">${extra || "AUTO ACCELERATE · BRAKE BEFORE THE BEND"}</span></div>`;
	}
	function button(action, title, sub = "", num = "", primary = false) {
		return `<button class="choice ${primary ? "primary" : ""}" data-action="${action}">${num ? `<span class="num">${num}</span>` : ""}<span><strong>${title}</strong>${sub ? `<small>${sub}</small>` : ""}</span><span class="arrow">↗</span></button>`;
	}
	function top(title, back = "back") {
		return `<div class="topbar"><button class="back" data-action="${back}">← ${glyph("back")}</button><h2>${title}</h2></div>`;
	}
	function focusables() {
		return $$(
			"button:not(:disabled),input:not(:disabled):not([type=file]):not([type=hidden]),select,textarea",
		);
	}
	function focusAt(i = 0) {
		const all = focusables();
		focusIndex = clamp(i, 0, all.length - 1);
		all[focusIndex]?.focus({ preventScroll: true });
		all[focusIndex]?.scrollIntoView({ block: "nearest", inline: "nearest" });
	}
	function markFocus() {
		focusables().forEach((b, i) =>
			b.addEventListener("pointerenter", () => {
				focusIndex = i;
				if (document.activeElement?.tagName !== "TEXTAREA")
					b.focus({ preventScroll: true });
			}),
		);
	}
	function setUI(content, focus = 0) {
		ui.innerHTML = content;
		markFocus();
		requestAnimationFrame(() => focusAt(focus));
	}
	function openScreen(name) {
		previousScreen = screen;
		screen = name;
		menuIdle = 0;
		resultsShown = false;
		renderMenu();
	}
	function renderMenu() {
		if (screen === "title") {
			active = false;
			paused = false;
			audio.setScene("title");
			setUI(
				`<section class="screen title"><div class="brandline"><span class="brandmark"></span>THE HAPPY VALLEY MOTOR CLUB</div><h1>AUTO<br><span>LAP HAPPY</span></h1><p class="tagline">Little cars. Great country roads.</p><nav class="titlemenu">${button("tour", "Take the road tour", "A friendly first drive through Happy Valley", "01", true)}${button("quick", "Pick a road", "Time trial, pursuit duel & free drive", "02")}${button("multi", "Bring a friend", "Couch competition or a direct connection", "03")}${button("settings", "Make it yours", "Handling, sound & accessibility", "04")}${button("credits", "About the journey", "Source, credits & build notes", "05")}</nav><aside class="titlebadge"><span class="large">EST. 1980 / REIMAGINED</span><span class="small">FIVE ROADS · FIVE RIDES · ONE VALLEY</span></aside><div class="worldcaption"><span class="eyebrow">NOW DRIVING · 01</span><strong>Meadow Mile</strong><p>Follow the road. Find your rhythm.</p></div>${footer("1–2 PLAYERS · A NORTH-UP COUNTRY RACER")}</section>`,
			);
		} else if (screen === "quick") {
			setUI(
				`<section class="screen full">${top("A road for every mood")}<p class="lead">No unlocks. No hurry. Just choose your kind of drive.</p><div class="modes"><button class="modecard" data-action="choose-trial"><span class="icon">◷</span><strong>Time trial</strong><p>Find a clean line. Race two laps, or settle in for the classic five.</p><span class="pill">SOLO · PERSONAL GHOST</span></button><button class="modecard" data-action="choose-duel"><span class="icon">⇉</span><strong>Pursuit duel</strong><p>Pull ahead for 1. Rival crash for 2. First to ten takes the flag.</p><span class="pill">SOLO vs AI · 1–2 FRIENDS</span></button><button class="modecard" data-action="choose-free"><span class="icon">⌁</span><strong>Free drive</strong><p>Five connected circuits. A route passport. A secret straight to find.</p><span class="pill">EXPLORE · NO CLOCK</span></button></div><p class="lead">Automatic acceleration keeps your attention on the road. Brake before the turn, then release to go.</p>${footer()}</section>`,
			);
		} else if (screen === "setup") renderSetup();
		else if (screen === "settings") renderSettings();
		else if (screen === "multi")
			setUI(
				`<section class="screen full">${top("Good company. Close racing.")}<p class="lead">Two cars. One shared countryside. The road decides who pulls away.</p><div class="modes"><button class="modecard" data-action="couch"><span class="icon">♟♟</span><strong>Couch duel</strong><p>Two pads, keyboard + pad, or a shared keyboard. One screen. First to ten.</p><span class="pill">LOCAL · 2 DRIVERS</span></button><button class="modecard" data-action="host"><span class="icon">↗</span><strong>Invite a driver</strong><p>Create a direct invitation. Exchange the complete connection text with a friend.</p><span class="pill">WEBRTC · NO SIGN-IN</span></button><button class="modecard" data-action="join"><span class="icon">↙</span><strong>Join a driver</strong><p>Paste a friend’s invitation. Send your reply, then meet them at the grid.</p><span class="pill">DIRECT PEER CONNECTION</span></button></div><p class="lead">Playing in AI Hub? Its session starts automatically and uses the Hub’s shared world connection.</p>${footer()}</section>`,
			);
		else if (screen === "connection") renderConnection();
		else if (screen === "credits") renderCredits();
		else if (screen === "pause") renderPause();
		else if (screen === "dev") renderDev();
		else if (screen === "results") renderResults();
		else if (screen === "passport") renderPassport();
	}
	function routeSVG(c, stroke = "#e7d5a2", full = false) {
		const xs = c.samples.map((p) => p.x),
			ys = c.samples.map((p) => p.y),
			minx = Math.min(...xs),
			miny = Math.min(...ys),
			w = Math.max(...xs) - minx,
			h = Math.max(...ys) - miny;
		return `<svg viewBox="${minx - 130} ${miny - 130} ${w + 260} ${h + 260}" aria-hidden="true"><path d="${c.samples
			.filter((_, i) => i % 3 === 0)
			.map((p, i) => (i ? "L" : "M") + p.x.toFixed(0) + "," + p.y.toFixed(0))
			.join(
				" ",
			)} Z" fill="none" stroke="${stroke}" stroke-width="${full ? 38 : 48}" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${c.gates[0].x}" cy="${c.gates[0].y}" r="70" fill="#ef7659"/></svg>`;
	}
	function carCard(p, i) {
		return `<button class="car ${setup.profile === i ? "selected" : ""}" data-action="car-${i}" style="--car:${p.color}"><div class="caricon"><i></i></div><strong>${html(p.name)}</strong><small>${html(p.about)}</small>${["SPEED", "PICKUP", "GRIP"].map((n, j) => `<div class="bars"><span class="barlabel">${n}</span>${Array.from({ length: 5 }, (_, k) => `<i class="bar ${k < p.bars[j] ? "on" : ""}"></i>`).join("")}</div>`).join("")}</button>`;
	}
	function renderSetup() {
		const names = {
				trial: "Find your best line",
				duel: "A friendly pursuit",
				free: "The whole valley is yours",
			},
			c = world.courses[setup.course];
		setUI(
			`<section class="screen full">${top(names[mode])}<div class="row spread"><p class="lead" style="margin:0">${mode === "duel" ? "Crash +2 · clear lead +1 · checkpoint restarts" : mode === "trial" ? "Ordered gates. Honest laps. One more try." : "All roads connect. Follow signs and collect passport stamps."}</p><span class="pill">${setup.humans === 2 ? "2 DRIVERS" : mode === "duel" ? "YOU vs AI" : "SOLO DRIVE"}</span></div><div class="sectionlabel">01 · CHOOSE YOUR ROAD</div><div class="tracks">${world.courses.map((c, i) => `<button class="track ${setup.course === i ? "selected" : ""}" data-action="course-${i}"><span class="number">0${i + 1}</span>${routeSVG(c)}<strong>${c.name}</strong><small>${c.subtitle}</small></button>`).join("")}</div><div class="sectionlabel">02 · PICK YOUR RIDE</div><div class="cars">${PROFILES.map(carCard).join("")}</div><div class="setupbottom">${mode === "trial" ? `<button class="flat" data-action="laps">${setup.laps} LAPS · ${setup.laps === 2 ? "SHORT" : "CLASSIC"}</button>` : mode === "duel" ? `<button class="flat" data-action="target">${setup.target} POINTS · ${setup.target === 10 ? "SPRINT" : "CLASSIC"}</button><button class="flat" data-action="opponent">RIVAL: ${PROFILES[setup.opponent].name.split(" · ")[0]}</button>` : `<button class="flat" data-action="passport">ROUTE PASSPORT · ${passport.length}/${world.discoveries.length}</button>`}${mode === "duel" && setup.humans === 1 ? `<button class="flat" data-action="difficulty">AI: ${setup.difficulty.toUpperCase()}</button>` : ""}${setup.humans === 2 ? `<button class="flat" data-action="seats">SEATS: ${setup.seats.toUpperCase()}</button>` : ""}<button class="flat accent" data-action="start">LET’S DRIVE ↗</button></div><p class="portraitnote">Turn your device sideways for a bigger view of the road.</p></section>`,
			1 + setup.course,
		);
	}
	function renderSettings() {
		const range = (key, name) =>
				`<label class="setting"><span>${name}</span><input type="range" min="0" max="1" step=".01" value="${settings[key]}" data-setting="${key}" aria-label="${name}"><output>${Math.round(settings[key] * 100)}%</output></label>`,
			select = (key, name, opts) =>
				`<label class="setting"><span>${name}</span><select data-setting="${key}" aria-label="${name}">${opts.map(([v, n]) => `<option value="${v}" ${String(settings[key]) === v ? "selected" : ""}>${n}</option>`).join("")}</select></label>`;
		setUI(
			`<section class="screen full">${top("Make it yours")}<div class="settingsgrid">${select(
				"auto",
				"Acceleration",
				[
					["true", "Automatic"],
					["false", "Manual throttle"],
				],
			)}${select("steering", "Steering", [
				["relative", "Car-relative"],
				["screen", "Screen direction"],
			])}${select("glyphs", "Controller symbols", [
				["ps", "PlayStation"],
				["xbox", "Xbox A B X Y"],
			])}${select("ghost", "Personal ghost", [
				["true", "Show best run"],
				["false", "Hide"],
			])}${range("master", "Master volume")}${range("music", "Music")}${range("sfx", "Road & effects")}${range("voice", "Crew voices")}${select(
				"mute",
				"Sound",
				[
					["false", "On"],
					["true", "Muted"],
				],
			)}${select("reduced", "Reduced motion", [
				["false", "Off"],
				["true", "On"],
			])}${range("assist", "Touch road assist")}</div><p class="lead">${settings.steering === "screen" ? "Screen direction: point the stick or press keys toward the screen edge you want to face." : "Car-relative: left turns the car left. Right turns it right."} ${settings.auto ? "Brake to stop; release to accelerate." : "Hold R2 or W / ↑ to accelerate."}</p><div class="row"><button class="flat" data-action="reset-settings">Restore defaults</button><button class="flat" data-action="fullscreen">Full screen</button><button class="flat accent" data-action="back">All set ↗</button></div></section>`,
		);
	}
	function renderPause() {
		setUI(
			`<div class="overlay"><section class="dialog"><span class="eyebrow">${network.active ? "LIVE CONNECTION · RACE CONTINUES" : "A MOMENT IN THE PADDOCK"}</span><h2>${network.active ? "Keep an eye on the road" : "Take a breather."}</h2>${network.active ? "<p>Your car brakes safely while this menu is open. The shared clock keeps running.</p>" : ""}${button("resume", "Back to the road", "Resume the drive", "01", true)}${button("settings", "Settings", "Sound, controls & accessibility", "02")}${button("passport", "Valley passport", "See your discoveries and the connected roads", "03")}${sim.tourStep >= 0 ? button("tour-skip", "Skip this tour stop", "Continue to the next road", "04") : ""}${button("dev", "Developer paddock", network.active ? "Read-only online diagnostics" : "Live tuning, route overlays & testing tools", "04")}${button("restart", "Restart this drive", "A fresh grid and a clean clock", "05")}${button("quit", "Return to the club", "End this drive", "06")}</section></div>`,
		);
	}
	function renderDev() {
		const sliders = [
			["speed", "Top speed", 0.5, 1.7, 0.05],
			["acceleration", "Acceleration", 0.4, 2, 0.05],
			["braking", "Braking", 0.4, 2, 0.05],
			["steering", "Steering", 0.4, 1.8, 0.05],
			["roadGrip", "Road grip", 0.3, 1.8, 0.05],
			["grassGrip", "Grass grip", 0.2, 1.3, 0.05],
			["gravelGrip", "Gravel grip", 0.1, 1.2, 0.05],
			["crash", "Crash speed", 40, 180, 5],
			["aiPace", "AI pace", 0.45, 1.05, 0.01],
			["lead", "Lead distance", 144, 600, 12],
			["target", "Duel target", 2, 50, 1],
		];
		setUI(
			`<section class="screen full">${top("Developer paddock", "dev-back")}<div class="row spread"><span class="pill">${network.active ? "ONLINE · READ ONLY" : "TUNING MARKS THIS RUN UNRANKED"}</span><span class="pill">SEED ${sim.seed} · TICK ${sim.tick}</span></div><div class="settingsgrid" style="margin-top:1.5vh">${sliders.map(([k, n, min, max, step]) => `<label class="setting"><span>${n}</span><input type="range" min="${min}" max="${max}" step="${step}" value="${sim.tuning[k]}" data-tune="${k}" aria-label="${n}" ${network.active ? "disabled" : ""}><output>${sim.tuning[k]}</output></label>`).join("")}<button class="flat" data-action="dev-reset" ${network.active ? "disabled" : ""}>Reset tuning defaults</button></div><div class="row" style="margin-top:1.5vh;flex-wrap:wrap">${[
				["dev-ai", `AI drive: ${sim.aiAll ? "ON" : "OFF"}`],
				["dev-safe", `Invulnerability: ${sim.invulnerable ? "ON" : "OFF"}`],
				["dev-camera", `Free camera: ${freeCamera ? "ON" : "OFF"}`],
				["dev-overlay", `Gate overlays: ${devOpen ? "ON" : "OFF"}`],
				["dev-gate", "Restart at gate"],
				["dev-course", "Next course"],
				["dev-car", "Next car"],
				["dev-stage", "Finish tour step"],
			]
				.map(
					([a, l]) =>
						`<button class="flat" data-action="${a}" ${network.active && !["dev-overlay"].includes(a) ? "disabled" : ""}>${l}</button>`,
				)
				.join(
					"",
				)}</div><pre class="devsnapshot">${html(JSON.stringify({ state: sim.state, mode: sim.mode, course: sim.course.name, score: sim.score, cars: sim.cars.map((c) => ({ speed: +c.speed.toFixed(1), surface: c.surface, gate: c.route.gate, lap: c.route.lap, valid: c.route.valid })) }, null, 2))}</pre></section>`,
		);
	}
	function recordKey() {
		return `physics1:${sim.course.id}:v${sim.course.version}:p${sim.cars[0].profile}:l${sim.laps}:${settings.auto || lastDevice === "touch" ? "auto" : "manual"}:${settings.steering}:assist${lastDevice === "touch" ? settings.assist : 0}`;
	}
	function saveResult() {
		if (
			sim.mode !== "trial" ||
			!sim.finishedResult?.ranked ||
			sim.tourStep >= 0 ||
			network.active
		)
			return;
		const key = recordKey(),
			old = records[key];
		if (!old || sim.t < old.time) {
			records[key] = { time: sim.t, ghost: sim.ghost, version: 1 };
			store.write("records", records);
			sim.newBest = true;
		} else sim.newBest = false;
	}
	function renderResults() {
		const r = sim.finishedResult || {},
			tour = sim.tourStep >= 0,
			done = sim.tourComplete;
		audio.setScene("results");
		setUI(
			`<div class="overlay"><section class="dialog"><span class="eyebrow">${done ? "HAPPY VALLEY MOTOR CLUB · ROAD TOUR COMPLETE" : tour ? TOUR[sim.tourStep]?.title : sim.course.name}</span><h2>${done ? "Every road. A happy ending." : sim.mode === "duel" ? "The flag is yours to share." : "That’s a fine drive!"}</h2><p>${done ? "You found your line through the whole valley. There’s always another road, another ride, and another friendly rival. Thanks for the drive!" : html(r.reason || "The paddock is waiting.")}</p><div class="resultstats">${sim.mode === "duel" ? `<div><small>DRIVER 1</small><strong>${sim.score[0]}</strong></div><div><small>DRIVER 2</small><strong>${sim.score[1]}</strong></div>` : `<div><small>YOUR TIME</small><strong>${formatTime(r.time ?? sim.t)}</strong></div><div><small>${sim.newBest ? "PERSONAL BEST!" : "RECOVERY PENALTY"}</small><strong>${sim.newBest ? "★" : `+${sim.penalty.toFixed(0)}s`}</strong></div>`}</div>${r.splits?.length ? `<p class="splits">${r.splits.map((t, i) => `Lap ${i + 1} · ${formatTime(t)}`).join("　")}</p>` : ""}${!r.ranked ? '<span class="pill">PRACTICE / DEV RUN · NO PERSONAL RECORD</span>' : ""}${tour && !done ? button("tour-next", sim.tourStep === TOUR.length - 1 ? "Finish the journey" : "Next road", "There’s more of the valley to see", "01", true) : button("retry", network.active ? "Rematch" : "One more drive", "Same road, fresh start", "01", true)}${button("quick", "Pick another road", "All five roads, all five rides", "02")}${button("quit", "Back to the club", "Return to the title", "03")}</section></div>`,
		);
	}
	function renderPassport() {
		const sx = 6000,
			paths = world.roads
				.map(
					(r) =>
						`<path d="${r.samples
							.filter((_, i) => i % 4 === 0)
							.map((p, i) => (i ? "L" : "M") + p.x + "," + p.y)
							.join(
								" ",
							)}" fill="none" stroke="${r.connector ? "#77866a" : r.color || "#d8cdb0"}" stroke-width="${r.connector ? 18 : 35}"/>`,
				)
				.join(""),
			c = sim.cars[0];
		setUI(
			`<section class="screen full">${top("A valley worth knowing")}<div class="passportrow"><svg class="mapfull" viewBox="0 0 ${sx} ${sx}" aria-label="Connected valley map">${world.water.map((w) => `<ellipse cx="${w.x}" cy="${w.y}" rx="${w.rx}" ry="${w.ry}" fill="#608c91"/>`).join("")}${paths}${world.courses.map((r, i) => `<circle cx="${r.gates[0].x}" cy="${r.gates[0].y}" r="100" fill="#efd078"/><text x="${r.gates[0].x}" y="${r.gates[0].y + 50}" font-family="sans-serif" font-size="145" font-weight="bold" text-anchor="middle" fill="#153336">${i + 1}</text>`).join("")}${c ? `<circle cx="${c.x}" cy="${c.y}" r="65" fill="#fff8df" stroke="#e46f55" stroke-width="28"/>` : ""}</svg><div class="passportlist"><p class="lead">${passport.length} / 6 stamps collected. Visit each paddock in Free Drive. A lane by the windmill leads to an old airfield…</p>${world.discoveries.map((d) => `<div class="stamp ${passport.includes(d.id) ? "found" : ""}">${passport.includes(d.id) ? "✓" : "○"} ${d.secret && !passport.includes(d.id) ? "An undiscovered straight" : html(d.name)}</div>`).join("")}<button class="flat accent" data-action="back">Back to the journey ↗</button></div></div></section>`,
		);
	}
	function renderConnection() {
		setUI(
			`<section class="screen full"><div class="network">${top(connectionRole === "host" ? "Invite a driver" : "Join a driver", "connection-back")}<span class="eyebrow">DIRECT CONNECTION · ${connectionRole.toUpperCase()}</span><p class="lead">${connectionRole === "host" ? "1. Create an invitation and send it to your friend. 2. Paste their reply below. 3. When connected, start your duel." : "1. Paste the host’s invitation below. 2. Create your reply and send it back. 3. Wait for the host’s green flag."}</p><textarea id="connection-input" aria-label="Paste invitation or reply" placeholder="Paste the complete connection text here" spellcheck="false"></textarea><div class="row">${connectionRole === "host" ? '<button class="flat accent" data-action="create-offer">Create invitation</button><button class="flat" data-action="apply-answer">Accept reply</button>' : '<button class="flat accent" data-action="create-answer">Create reply</button>'}<button class="flat" data-action="paste">Paste from clipboard</button><button class="flat" data-action="import">Import text file</button><input type="file" id="import-connection" accept=".txt,.json" hidden></div><textarea id="connection-output" aria-label="Your connection text" readonly spellcheck="false">${html(connectionOut)}</textarea><div class="row"><button class="flat" data-action="copy">Copy complete text</button><button class="flat" data-action="export">Save text file</button>${connectionRole === "host" ? '<button class="flat accent" data-action="direct-start">Start duel ↗</button>' : ""}</div><p class="status" id="network-status">${html(networkStatus || "Ready when you are.")}</p><label class="setting"><span>Optional STUN URL</span><input id="stun" aria-label="Optional STUN server URL" value="${html(network.stun)}" placeholder="stun:your-server" style="max-width:55%;padding:8px;background:#17373b;color:#f6efd9;border:1px solid #718c7d"></label><p style="color:#b7cbba;font-size:clamp(12px,1vw,20px)">Direct connectivity depends on your networks. Some routers require TURN, which this manual connection does not provide. If connection fails, retry, play on the couch, or use AI Hub. No invitation is uploaded by this game.</p></div></section>`,
		);
	}
	const fallbackReport = {
		sourceInformation: {
			date: "2026-11-06 04:13:21",
			source: "Auto Racing (Mattel Intellivision, 1980)",
			plan: "PLAN.md",
			genre: "Arcade racing and pursuit duels",
			perspective: "North-up overhead, native 80-degree pitch",
			tech: "my-3D2dge 0.89.1; AI Hub client 1.4.0; JavaScript, Canvas 2D, Web Audio, WebRTC",
			artDirection:
				"Original shaded pixel miniature countryside and native procedural shapes",
			animation:
				"Native shape groups, continuous wheel steering, lean, flags, dust and skids",
			audio:
				"Original synthesized music, engines, effects and gibberish crew; music defaults to 10%",
			online:
				"AI Hub shared-world and manual WebRTC direct peers; local two-player",
			testing:
				"Deterministic headless simulation; scripted input; Chromium/WebKit; pad/touch stand-ins; no physical hardware or listening",
			research:
				"Original manual and Blue Sky Rangers history; archival screenshot observed; exact original sounds unknown",
			environment: "Codex CLI (headless); Linux",
			model: "OpenAI, gpt-6.1-sol, reasoning effort ultra",
			usage: "added on import",
		},
		testingFeedback: ["unknown", "unknown", "unknown", "unknown"],
		engineFeedback: [
			"Native shapes and headless simulation.",
			"unknown",
			"Directed race gates and pursuit rules.",
			"unknown",
			"none",
			"More complete overhead racing starter.",
		],
		promptFeedback: [
			"Clear source and deliverable requirements.",
			"unknown",
			"unknown",
			"unknown",
		],
	};
	function renderCredits() {
		const r = HAPPY_REPORT.sourceInformation ? HAPPY_REPORT : fallbackReport,
			s = r.sourceInformation,
			pages = [
				{
					title: "Source Information",
					body: Object.entries(s)
						.slice(0, 8)
						.map(
							([k, v]) =>
								`<p><b>${html(k.replace(/([A-Z])/g, " $1"))}:</b> ${html(v)}</p>`,
						)
						.join(""),
				},
				{
					title: "Source Information · continued",
					body: Object.entries(s)
						.slice(8)
						.map(
							([k, v]) =>
								`<p><b>${html(k.replace(/([A-Z])/g, " $1"))}:</b> ${html(v)}</p>`,
						)
						.join(""),
				},
				{
					title: "Testing Feedback",
					body: [
						"Issues caught",
						"Critical / game-breaking",
						"Most helpful test",
						"Least helpful test",
					]
						.map((q, i) => `<p><b>${q}:</b> ${html(r.testingFeedback[i])}</p>`)
						.join(""),
				},
				{
					title: "Engine Feedback",
					body: [
						"Most liked",
						"Stuck or guessed wrong",
						"Most important self-built system",
						"Hardest aspect",
						"Engine changes",
						"One desired change",
					]
						.map((q, i) => `<p><b>${q}:</b> ${html(r.engineFeedback[i])}</p>`)
						.join(""),
				},
				{
					title: "Prompt Feedback",
					body: [
						"Most liked",
						"Confusing aspects",
						"Hardest part",
						"Desired change",
					]
						.map((q, i) => `<p><b>${q}:</b> ${html(r.promptFeedback[i])}</p>`)
						.join(""),
				},
				{
					title: "A little club. A big thank-you.",
					body: "<p><b>Original design, code, vehicles, roads & music:</b> Auto Lap Happy build team.</p><p><b>Engine:</b> my-3D2dge 0.89.1 by Michael Crosato, MIT. Full native engine, shapes and driving foundation. Upstream notices are preserved in this file.</p><p><b>Online:</b> AI Hub Session Protocol v1, client 1.4.0. Official client included unchanged.</p><p><b>Historical reference:</b> Auto Racing © Mattel Electronics, 1980; Blue Sky Rangers instructions and history. This is an original inspired game with new maps and art.</p><p><b>Controls:</b> A/D or left stick steer · Space / S or L2 brake · hold R or Triangle recover · Escape / Options pause. Manual throttle: W or R2. Touch: drag left, hold right to brake.</p>",
				},
			];
		const p = pages[creditPage];
		setUI(
			`<section class="screen full">${top("About the journey")}<span class="eyebrow">BUILD NOTES · ${creditPage + 1} / ${pages.length}</span><h3 style="font-size:clamp(24px,2.2vw,44px);margin:1.5vh 0">${p.title}</h3><div class="creditbody">${p.body}</div><div class="creditnav"><button class="flat" data-action="credit-prev">← Previous page</button><button class="flat accent" data-action="credit-next">Next page →</button><button class="flat" data-action="back">Back to the club</button></div></section>`,
		);
	}
	function formatTime(t) {
		if (!Number.isFinite(t)) return "—";
		const min = Math.floor(t / 60),
			sec = Math.floor(t % 60),
			cs = Math.floor((t % 1) * 100);
		return `${min}:${String(sec).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
	}
	function createNetwork() {
		return new HappyNetwork({
			courseCount: world.courses.length,
			onStart(c) {
				onlineTick = 0;
				sim.settings = settings;
				sim.start({
					...c,
					profile: c.cars?.[0] ?? 3,
					opponent: c.cars?.[1] ?? 4,
				});
				active = true;
				paused = false;
				screen = "driving";
				menuIdle = 0;
				resultsShown = false;
				netInputs = [
					{ steer: 0, gas: 0, brake: 1, safe: true },
					{ steer: 0, gas: 0, brake: 1, safe: true },
				];
				sim.dev = false;
				sim.aiAll = false;
				audio.setScene("driving");
				renderHUD();
			},
			onInput(seat, input) {
				netInputs[seat] = {
					steer: input.steer,
					gas: input.throttle,
					brake: input.brake,
					recover: input.recover,
					safe: input.brake === 1 && input.throttle === 0,
				};
			},
			onSnapshot(s) {
				if (!network.authoritative && sim.applySnapshot(s)) {
					if (
						sim.state === "finished" &&
						!resultsShown &&
						network.kind !== "hub"
					) {
						resultsShown = true;
						screen = "results";
						renderResults();
					}
				}
			},
			onEnd(reason) {
				active = false;
				paused = false;
				audio.setScene("off");
				screen = "connection-ended";
				setUI(
					`<div class="overlay"><section class="dialog"><h2>That’s the connection.</h2><p>${html(reason || "The round has ended.")}</p>${network.kind === "hub" ? "<p>The Hub will take it from here.</p>" : button("network-lobby", "Return to multiplayer", "Reconnect or invite another driver", "01", true)}</section></div>`,
				);
			},
			onStatus(text) {
				networkStatus = text;
				const el = $("#network-status");
				if (el) el.textContent = text;
			},
			onFinish(scores) {
				if (sim.state !== "finished") {
					sim.score = [...scores];
					sim.finish("The flag is down!");
				}
				if (network.kind === "direct" && !resultsShown) {
					resultsShown = true;
					screen = "results";
					renderResults();
				}
			},
			onTimeUp() {
				if (sim.state !== "finished")
					sim.finish(
						sim.score[0] === sim.score[1]
							? "Time! A sporting draw."
							: "The Hub flag is down.",
					);
			},
			onLeave(seat) {
				if (seat !== null && seat >= 0)
					netInputs[seat] = { steer: 0, brake: 1, gas: 0, safe: true };
			},
		});
	}
	network = createNetwork();
	function startDrive(tour = false) {
		const pads = [...(navigator.getGamepads?.() || [])].filter(Boolean);
		localBindings = null;
		if (!tour && setup.humans === 2) {
			if (setup.seats === "two pads" && pads.length < 2) {
				say("Connect two controllers, or choose another seat preset.", 5);
				return;
			}
			if (setup.seats === "keys + pad" && !pads.length) {
				say("Connect a controller for Driver 2, or choose shared keys.", 5);
				return;
			}
			localBindings =
				setup.seats === "two pads" ||
				(setup.seats === "auto" && pads.length >= 2)
					? [
							{ type: "pad", index: pads[0].index },
							{ type: "pad", index: pads[1].index },
						]
					: setup.seats === "keys + pad" ||
							(setup.seats === "auto" && pads.length)
						? [{ type: "keys" }, { type: "pad", index: pads[0].index }]
						: [{ type: "keys" }, { type: "keys" }];
		}
		active = true;
		paused = false;
		screen = "driving";
		resultsShown = false;
		sim.settings = settings;
		sim.dev = false;
		sim.aiAll = false;
		sim.invulnerable = false;
		sim.tuning = { ...DEFAULTS };
		sim.start({
			...setup,
			mode: tour ? "tour" : mode,
			classic: mode === "duel" && setup.target === 50,
		});
		sim.discovered = new Set(passport);
		const r = records[recordKey()];
		sim.bestGhost =
			settings.ghost && r?.version === 1 && Array.isArray(r.ghost)
				? r.ghost
				: [];
		audio.setScene("driving");
		renderHUD();
		say(
			localBindings
				? localBindings
						.map(
							(b, i) =>
								`DRIVER ${i + 1}: ${b.type === "pad" ? "PAD " + (b.index + 1) : i ? "ARROW KEYS" : "WASD + SPACE"}`,
						)
						.join(" · ")
				: lastDevice === "touch"
					? "Drag left to steer. Hold right to brake."
					: "Brake before the turn. Release to go.",
			4,
		);
	}
	function quit() {
		if (network.kind === "direct") {
			network.destroy();
			network = createNetwork();
		}
		active = false;
		paused = false;
		devOpen = false;
		freeCamera = false;
		keys.clear();
		touches.clear();
		audio.setScene("title");
		openScreen("title");
	}
	function pause() {
		if (!active || screen === "results") return;
		paused = !paused;
		keys.clear();
		touches.clear();
		touchRecover = false;
		if (paused) {
			screen = "pause";
			renderPause();
		} else {
			screen = "driving";
			renderHUD();
		}
	}
	function back() {
		if (screen === "settings") {
			screen = active ? "pause" : "title";
			renderMenu();
		} else if (
			screen === "pause" ||
			screen === "dev" ||
			(screen === "passport" && active)
		) {
			paused = false;
			screen = "driving";
			renderHUD();
		} else if (screen === "setup")
			openScreen(setup.humans === 2 ? "multi" : "quick");
		else if (screen === "connection") action("connection-back");
		else if (screen === "title") {
		} else openScreen("title");
	}
	async function action(a) {
		audio.unlock();
		audio.cue("gate");
		if (a === "back") {
			back();
			return;
		}
		if (a === "tour") {
			startDrive(true);
			return;
		}
		if (a === "quick") {
			if (network.kind === "direct") {
				network.destroy();
				network = createNetwork();
			}
			active = false;
			paused = false;
			setup.humans = 1;
			openScreen("quick");
			return;
		}
		if (a === "multi" || a === "network-lobby") {
			if (network.kind === "direct") {
				network.destroy();
				network = createNetwork();
			}
			active = false;
			openScreen("multi");
			return;
		}
		if (a === "settings") {
			previousScreen = screen;
			screen = "settings";
			renderSettings();
			return;
		}
		if (a === "credits") {
			creditPage = 0;
			openScreen("credits");
			return;
		}
		if (a.startsWith("choose-")) {
			mode = a.slice(7);
			setup.humans = 1;
			openScreen("setup");
			return;
		}
		if (a === "couch") {
			mode = "duel";
			setup.humans = 2;
			openScreen("setup");
			return;
		}
		if (a.startsWith("course-")) {
			setup.course = Number(a.slice(7));
			renderSetup();
			return;
		}
		if (a.startsWith("car-")) {
			setup.profile = Number(a.slice(4));
			renderSetup();
			return;
		}
		if (a === "laps") {
			setup.laps = setup.laps === 2 ? 5 : 2;
			renderSetup();
			return;
		}
		if (a === "target") {
			setup.target = setup.target === 10 ? 50 : 10;
			renderSetup();
			return;
		}
		if (a === "opponent") {
			setup.opponent = (setup.opponent + 1) % 5;
			renderSetup();
			return;
		}
		if (a === "difficulty") {
			setup.difficulty = ["easy", "normal", "hard"][
				(["easy", "normal", "hard"].indexOf(setup.difficulty) + 1) % 3
			];
			renderSetup();
			return;
		}
		if (a === "seats") {
			setup.seats = ["auto", "two pads", "keys + pad", "shared keys"][
				(["auto", "two pads", "keys + pad", "shared keys"].indexOf(
					setup.seats,
				) +
					1) %
					4
			];
			renderSetup();
			return;
		}
		if (a === "start") {
			startDrive();
			return;
		}
		if (a === "pause") {
			pause();
			return;
		}
		if (a === "resume") {
			paused = false;
			screen = "driving";
			renderHUD();
			return;
		}
		if (a === "quit") {
			quit();
			return;
		}
		if (a === "restart" || a === "retry") {
			if (network.active) {
				if (network.kind === "direct" && network.authoritative)
					network.startDirect({
						...setup,
						cars: [setup.profile, setup.opponent],
					});
				else say("The host starts the rematch.");
			} else {
				if (sim.tourComplete) {
					startDrive(true);
				} else if (sim.tourStep >= 0) {
					sim.startTourStage();
					screen = "driving";
					paused = false;
					resultsShown = false;
					renderHUD();
				} else startDrive();
			}
			return;
		}
		if (a === "tour-skip") {
			sim.finish("Tour stop skipped. The next road is ready.");
			screen = "results";
			renderResults();
			resultsShown = true;
			return;
		}
		if (a === "tour-next") {
			sim.continueTour();
			resultsShown = false;
			if (sim.tourComplete) {
				screen = "results";
				renderResults();
				resultsShown = true;
			} else {
				screen = "driving";
				renderHUD();
				audio.setScene("driving");
			}
			return;
		}
		if (a === "passport") {
			previousScreen = screen;
			screen = "passport";
			renderPassport();
			return;
		}
		if (a === "credit-prev" || a === "credit-next") {
			creditPage = (creditPage + (a === "credit-next" ? 1 : 5)) % 6;
			renderCredits();
			return;
		}
		if (a === "reset-settings") {
			settings = { ...defaults };
			sim.settings = settings;
			audio.setVolumes(settings);
			store.write("settings", settings);
			renderSettings();
			return;
		}
		if (a === "fullscreen") {
			if (document.fullscreenElement) document.exitFullscreen?.();
			else
				document.documentElement
					.requestFullscreen?.()
					.catch(() => say("Full screen is unavailable here."));
			return;
		}
		if (a === "dev") {
			screen = "dev";
			renderDev();
			return;
		}
		if (a === "dev-back") {
			screen = "pause";
			renderPause();
			return;
		}
		if (a.startsWith("dev-")) {
			if (network.active && a !== "dev-overlay") return;
			if (a === "dev-overlay") {
				devOpen = !devOpen;
				renderDev();
				return;
			}
			sim.dev = true;
			if (a === "dev-reset") {
				sim.tuning = { ...DEFAULTS };
				sim.target = DEFAULTS.target;
			}
			if (a === "dev-ai") sim.aiAll = !sim.aiAll;
			if (a === "dev-safe") sim.invulnerable = !sim.invulnerable;
			if (a === "dev-camera") freeCamera = !freeCamera;
			if (a === "dev-gate") sim.cars.forEach((c) => sim.safeRestart(c));
			if (a === "dev-course") {
				const step = sim.tourStep;
				sim.startRound({
					...sim.config,
					mode: sim.mode,
					course: (sim.courseIndex + 1) % world.courses.length,
				});
				sim.tourStep = step;
				sim.dev = true;
			}
			if (a === "dev-car") sim.cars[0].profile = (sim.cars[0].profile + 1) % 5;
			if (a === "dev-stage") sim.finish("Developer stage completion");
			renderDev();
			return;
		}
		if (a === "host" || a === "join") {
			if (network.kind === "direct") {
				network.destroy();
				network = createNetwork();
			}
			connectionRole = a === "host" ? "host" : "guest";
			connectionOut = "";
			networkStatus = "";
			openScreen("connection");
			return;
		}
		if (a === "connection-back") {
			network.destroy();
			network = createNetwork();
			connectionOut = "";
			openScreen("multi");
			return;
		}
		try {
			if (a === "import") $("#import-connection")?.click();
			if (a === "create-offer") {
				network.stun = $("#stun")?.value.trim() || "";
				networkStatus = "Gathering the complete invitation…";
				$("#network-status").textContent = networkStatus;
				connectionOut = await network.createOffer();
				if (screen === "connection")
					$("#connection-output").value = connectionOut;
			}
			if (a === "create-answer") {
				network.stun = $("#stun")?.value.trim() || "";
				const input = $("#connection-input").value;
				connectionOut = await network.acceptOffer(input);
				if (screen === "connection")
					$("#connection-output").value = connectionOut;
			}
			if (a === "apply-answer")
				await network.acceptAnswer($("#connection-input").value);
			if (a === "copy") {
				if (!connectionOut) throw Error("Create connection text first.");
				const ok = await network.copy(connectionOut);
				say(
					ok
						? "Complete text copied."
						: "Select and copy the text in the output field.",
				);
			}
			if (a === "export") {
				if (!connectionOut) throw Error("Create connection text first.");
				network.exportText(connectionOut);
			}
			if (a === "paste") {
				try {
					$("#connection-input").value = await navigator.clipboard.readText();
				} catch {
					say("Clipboard access denied. Paste directly into the input field.");
					$("#connection-input")?.focus();
				}
			}
			if (a === "direct-start") {
				if (!network.connected)
					throw Error("Connect the second driver before starting.");
				network.startDirect({
					...setup,
					mode: "duel",
					cars: [3, 4],
					target: 10,
				});
			}
		} catch (err) {
			networkStatus = err.message;
			const el = $("#network-status");
			if (el) el.textContent = networkStatus;
			else say(networkStatus, 5);
		}
	}
	ui.addEventListener("click", (e) => {
		const b = e.target.closest("[data-action]");
		if (b && !b.disabled) {
			meaningful(e.pointerType === "touch" ? "touch" : "mouse");
			action(b.dataset.action);
		}
	});
	ui.addEventListener("input", (e) => {
		const el = e.target,
			k = el.dataset.setting;
		if (k) {
			meaningful("mouse");
			settings[k] =
				el.type === "range"
					? Number(el.value)
					: el.value === "true"
						? true
						: el.value === "false"
							? false
							: el.value;
			sim.settings = settings;
			audio.setVolumes(settings);
			store.write("settings", settings);
			el.parentElement
				.querySelector("output")
				?.replaceChildren(
					document.createTextNode(Math.round(settings[k] * 100) + "%"),
				);
		}
		if (el.dataset.tune && !network.active) {
			sim.tuning[el.dataset.tune] = Number(el.value);
			if (el.dataset.tune === "target") sim.target = Number(el.value);
			sim.dev = true;
			sim.cars.forEach((c) => sim.applyProfile(c));
			el.parentElement.querySelector("output").textContent = el.value;
		}
	});
	ui.addEventListener("change", async (e) => {
		if (e.target.id === "import-connection" && e.target.files[0]) {
			try {
				$("#connection-input").value = await network.importText(
					e.target.files[0],
				);
			} catch (err) {
				say(err.message);
			}
		}
	});
	function meaningful(device) {
		const changed = lastDevice !== device;
		lastDevice = device;
		if (changed) {
			ui.querySelectorAll("[data-prompt]").forEach(
				(el) => (el.textContent = glyph(el.dataset.prompt)),
			);
			ui.querySelectorAll(".back").forEach(
				(el) => (el.textContent = "← " + glyph("back")),
			);
		}
		lastInputAt = performance.now();
		menuIdle = 0;
		if (attracting) {
			exitAttract();
			return true;
		}
		return false;
	}
	function menuMove(dx, dy) {
		const all = focusables();
		if (!all.length) return;
		let at = all.indexOf(document.activeElement);
		if (at < 0) at = focusIndex;
		const cur = all[at];
		if (dy && ["settings", "dev"].includes(screen)) {
			focusAt((at + dy + all.length) % all.length);
			return;
		}
		if (dx && cur?.tagName === "INPUT" && cur.type === "range") {
			cur.stepUp(dx);
			cur.dispatchEvent(new Event("input", { bubbles: true }));
			return;
		}
		if (dx && cur?.tagName === "SELECT") {
			cur.selectedIndex = clamp(
				cur.selectedIndex + dx,
				0,
				cur.options.length - 1,
			);
			cur.dispatchEvent(new Event("input", { bubbles: true }));
			return;
		}
		const box = cur?.getBoundingClientRect();
		if (!box) {
			focusAt(0);
			return;
		}
		let best = -1,
			bestCost = Infinity;
		for (let i = 0; i < all.length; i++) {
			if (i === at) continue;
			const b = all[i].getBoundingClientRect(),
				x = b.x + b.width / 2 - box.x - box.width / 2,
				y = b.y + b.height / 2 - box.y - box.height / 2;
			if ((dx && x * dx < 5) || (dy && y * dy < 5)) continue;
			const cost = Math.hypot(x, y) + (dx ? Math.abs(y) * 2 : Math.abs(x) * 2);
			if (cost < bestCost) {
				best = i;
				bestCost = cost;
			}
		}
		if (best < 0) best = (at + (dy || dx || 1) + all.length) % all.length;
		focusAt(best);
	}
	const driving = () => active && screen === "driving" && !paused;
	addEventListener("keydown", (e) => {
		if (e.ctrlKey || e.metaKey || e.altKey) return;
		if (attracting) {
			meaningful("keyboard");
			e.preventDefault();
			return;
		}
		if (
			["TEXTAREA", "INPUT"].includes(document.activeElement?.tagName) &&
			document.activeElement?.type !== "range" &&
			e.code !== "Escape"
		)
			return;
		const relevant = [
			"ArrowUp",
			"ArrowDown",
			"ArrowLeft",
			"ArrowRight",
			"KeyW",
			"KeyA",
			"KeyS",
			"KeyD",
			"Space",
			"Enter",
			"Escape",
			"KeyR",
			"ShiftRight",
			"KeyP",
			"KeyM",
			"Tab",
		];
		if (!relevant.includes(e.code)) return;
		if (meaningful("keyboard")) {
			e.preventDefault();
			return;
		}
		keys.add(e.code);
		audio.unlock();
		if (e.code !== "Tab") e.preventDefault();
		if (e.repeat) return;
		if (e.code === "KeyM") {
			settings.mute = !settings.mute;
			audio.setVolumes(settings);
			store.write("settings", settings);
			say(settings.mute ? "Sound muted" : "Sound on");
			return;
		}
		if (e.code === "Escape" || e.code === "KeyP") {
			if (screen === "driving") pause();
			else back();
			return;
		}
		if (!driving()) {
			if (e.code === "ArrowUp" || e.code === "KeyW") menuMove(0, -1);
			if (e.code === "ArrowDown" || e.code === "KeyS") menuMove(0, 1);
			if (e.code === "ArrowLeft" || e.code === "KeyA") menuMove(-1, 0);
			if (e.code === "ArrowRight" || e.code === "KeyD") menuMove(1, 0);
			if (e.code === "Enter" || e.code === "Space") {
				const el = document.activeElement;
				if (el?.dataset.action) action(el.dataset.action);
			}
		}
	});
	addEventListener("keyup", (e) => keys.delete(e.code));
	addEventListener("focus", () => {
		focusSafe = false;
	});
	addEventListener("blur", () => {
		focusSafe = true;
		keys.clear();
		touches.clear();
		touchRecover = false;
		if (active && !network.active && !paused && screen === "driving") pause();
	});
	document.addEventListener("visibilitychange", () => {
		keys.clear();
		touches.clear();
		touchRecover = false;
		if (
			document.hidden &&
			active &&
			!network.active &&
			!paused &&
			screen === "driving"
		)
			pause();
	});
	addEventListener(
		"pointerdown",
		(e) => {
			if (e.pointerType === "touch") {
				if (meaningful("touch")) {
					consumedPointerUntil = performance.now() + 700;
					e.preventDefault();
					e.stopImmediatePropagation();
					return;
				}
				audio.unlock();
				if (e.target.id === "screen" && driving()) {
					touches.set(e.pointerId, {
						x: e.clientX,
						y: e.clientY,
						startX: e.clientX,
						left: e.clientX < innerWidth * 0.55,
					});
					e.target.setPointerCapture?.(e.pointerId);
					e.preventDefault();
				}
			} else if (attracting) {
				meaningful("mouse");
				consumedPointerUntil = performance.now() + 700;
				e.preventDefault();
				e.stopImmediatePropagation();
			}
		},
		true,
	);
	addEventListener(
		"click",
		(e) => {
			if (performance.now() < consumedPointerUntil) {
				consumedPointerUntil = 0;
				e.preventDefault();
				e.stopImmediatePropagation();
			}
		},
		true,
	);
	addEventListener(
		"wheel",
		(e) => {
			if (meaningful("mouse")) {
				e.preventDefault();
				e.stopImmediatePropagation();
			}
		},
		{ capture: true, passive: false },
	);
	addEventListener("pointermove", (e) => {
		const t = touches.get(e.pointerId);
		if (t) {
			t.x = e.clientX;
			t.y = e.clientY;
		}
		if (
			e.pointerType !== "touch" &&
			Math.abs(e.movementX) + Math.abs(e.movementY) > 3
		) {
			meaningful("mouse");
		}
	});
	for (const ev of ["pointerup", "pointercancel", "lostpointercapture"])
		addEventListener(ev, (e) => {
			touches.delete(e.pointerId);
			touchRecover = false;
		});
	ui.addEventListener("pointerdown", (e) => {
		if (e.target.closest("[data-recover]")) {
			touchRecover = true;
			e.preventDefault();
		}
	});
	function keyboardIntent(seat, shared) {
		const left = seat === 1 ? "ArrowLeft" : "KeyA",
			right = seat === 1 ? "ArrowRight" : "KeyD",
			brake = seat === 1 ? "ArrowDown" : "KeyS",
			gas = seat === 1 ? "ArrowUp" : "KeyW";
		return {
			steer:
				(keys.has(right) || (!shared && seat === 0 && keys.has("ArrowRight"))
					? 1
					: 0) -
				(keys.has(left) || (!shared && seat === 0 && keys.has("ArrowLeft"))
					? 1
					: 0),
			brake:
				keys.has(brake) ||
				(seat === 0 && keys.has("Space")) ||
				(!shared && seat === 0 && keys.has("ArrowDown"))
					? 1
					: 0,
			gas:
				keys.has(gas) || (!shared && seat === 0 && keys.has("ArrowUp")) ? 1 : 0,
			recover:
				keys.has(seat === 1 ? "ShiftRight" : "KeyR") ||
				(seat === 0 && touchRecover),
		};
	}
	function padIntent(p) {
		return {
			steer: Math.abs(p.axes[0]) > 0.13 ? p.axes[0] : 0,
			brake: p.buttons[6]?.value || 0,
			gas: p.buttons[7]?.value || 0,
			recover: !!p.buttons[3]?.pressed,
			x: p.axes[0] || 0,
			y: p.axes[1] || 0,
		};
	}
	function getInputs() {
		if (testInputs) return testInputs;
		const pads = [...(navigator.getGamepads?.() || [])].filter(Boolean),
			shared = sim.humans === 2 && !network.active;
		let a = keyboardIntent(0, shared),
			b = keyboardIntent(1, true);
		const seatMode = setup.seats;
		if (shared && localBindings) {
			const values = [a, b];
			localBindings.forEach((binding, i) => {
				if (binding.type === "pad") {
					const p = pads.find((p) => p.index === binding.index);
					values[i] = p
						? padIntent(p)
						: { steer: 0, gas: 0, brake: 1, safe: true };
				}
			});
			[a, b] = values;
		} else if (pads.length && lastDevice === "pad") a = padIntent(pads[0]);
		if (network.active && lastDevice === "pad" && !pads.length)
			a = { steer: 0, brake: 1, gas: 0, recover: false, safe: true };
		for (const t of touches.values())
			if (t.left) a.steer = clamp((t.x - t.startX) / 90, -1, 1);
			else a.brake = 1;
		if (settings.steering === "screen")
			for (const [i, it] of [a, b].entries()) {
				const c =
					sim.cars[network.active && i === 0 ? (network.localSeat ?? 0) : i];
				if (!c) continue;
				let x = it.x ?? it.steer,
					y =
						it.y ??
						(keys.has(i ? "ArrowDown" : "KeyS") ? 1 : 0) -
							(keys.has(i ? "ArrowUp" : "KeyW") ? 1 : 0);
				if (Math.hypot(x, y) > 0.25)
					it.steer = clamp(
						Math.atan2(
							Math.sin(Math.atan2(y, x) - c.angle),
							Math.cos(Math.atan2(y, x) - c.angle),
						) * 1.5,
						-1,
						1,
					);
				else it.steer = 0;
			}
		if (lastDevice === "touch") a.gas = a.brake > 0 ? 0 : 1;
		if (
			lastDevice === "touch" &&
			settings.assist > 0 &&
			sim.cars[0] &&
			Math.abs(a.steer) < 0.12
		) {
			const c = sim.cars[0],
				q = world.nearestRoad(c.x, c.y);
			if (q.road && q.distance < q.road.width + 60) {
				const angle = Math.atan2(
					Math.sin(q.angle - c.angle),
					Math.cos(q.angle - c.angle),
				);
				a.steer = clamp(angle * settings.assist, -0.3, 0.3);
			}
		}
		if (
			paused ||
			screen !== "driving" ||
			document.hidden ||
			(network.active && focusSafe)
		) {
			a = { steer: 0, brake: 1, gas: 0, recover: false, safe: true };
			b = { ...a };
		}
		return [a, b];
	}
	function pollPads(dt) {
		menuRepeat = Math.max(0, menuRepeat - dt);
		const pads = [...(navigator.getGamepads?.() || [])].filter(Boolean);
		if (lastPadCount > pads.length && active) {
			keys.clear();
			if (!network.active && !paused) {
				pause();
				say("Controller disconnected. Reconnect or use the keyboard.", 5);
			} else say("Controller disconnected. Your seat is braking safely.", 5);
		}
		lastPadCount = pads.length;
		for (const p of pads) {
			const prev = padState.get(p.index) || [],
				buttons = p.buttons.map((b) => b.pressed),
				axis = p.axes.map((v) => (Math.abs(v) > 0.25 ? v : 0)),
				change = buttons.some((v, i) => v && !prev[i]),
				moving = axis.some((v) => Math.abs(v) > 0.3);
			padState.set(p.index, buttons);
			if (!change && !moving) continue;
			if (meaningful("pad")) {
				menuRepeat = 0.3;
				continue;
			}
			audio.unlock();
			if (buttons[9] && !prev[9] && !buttons[8]) {
				if (screen === "driving") pause();
				else if (active && paused) {
					paused = false;
					screen = "driving";
					renderHUD();
				}
				continue;
			}
			if (!driving() && menuRepeat <= 0) {
				const dx = buttons[14]
						? -1
						: buttons[15]
							? 1
							: Math.abs(axis[0]) > 0.5
								? Math.sign(axis[0])
								: 0,
					dy = buttons[12]
						? -1
						: buttons[13]
							? 1
							: Math.abs(axis[1]) > 0.5
								? Math.sign(axis[1])
								: 0;
				if (dx || dy) {
					menuMove(dx, dy);
					menuRepeat = 0.2;
				}
				if (buttons[0] && !prev[0]) {
					const el = document.activeElement;
					if (el?.dataset.action) action(el.dataset.action);
				}
				if (buttons[1] && !prev[1]) back();
			}
		}
	}
	function renderHUD() {
		if (screen !== "driving") return;
		const c = sim.cars[network.localSeat ?? 0] || sim.cars[0];
		if (!c) return;
		const duel = sim.mode === "duel",
			tour = sim.tourStep >= 0,
			r = c.route,
			points = sim.score,
			route = sim.course;
		const next = route.gates[r.gate],
			mini = `<svg viewBox="${Math.min(...route.samples.map((p) => p.x)) - 160} ${Math.min(...route.samples.map((p) => p.y)) - 160} ${Math.max(...route.samples.map((p) => p.x)) - Math.min(...route.samples.map((p) => p.x)) + 320} ${Math.max(...route.samples.map((p) => p.y)) - Math.min(...route.samples.map((p) => p.y)) + 320}"><path d="${route.samples
				.filter((_, i) => i % 4 === 0)
				.map((p, i) => (i ? "L" : "M") + p.x + "," + p.y)
				.join(
					" ",
				)} Z" stroke="#a6bea1" fill="none" stroke-width="40"/><circle cx="${next.x}" cy="${next.y}" r="95" fill="#e9c565"/>${sim.cars.map((a, i) => `<circle cx="${a.x}" cy="${a.y}" r="90" fill="${PROFILES[a.profile].color}" stroke="#142e32" stroke-width="20"/>`).join("")}</svg>`;
		let goal = "";
		if (tour) {
			const step = TOUR[sim.tourStep];
			goal = `<aside class="tourcue"><strong>${step.title}</strong>${step.text}<small>${sim.t < 8 ? step.tip : sim.tourStep === 0 ? (sim.tourDemonstrated.brake ? "Good braking! Follow the numbered gates." : "Hold the brake to settle your speed.") : step.tip}</small></aside>`;
		} else if (sim.mode === "free")
			goal = `<aside class="tourcue"><strong>THE WHOLE VALLEY IS YOURS</strong>Visit the numbered paddocks. Follow the lanes between circuits.<small>${passport.length}/${world.discoveries.length} passport stamps · Pause to see the valley map.</small></aside>`;
		ui.innerHTML = `<div class="hud ${lastDevice === "touch" ? "touch" : ""}"><div class="hudtop"><div class="hudplate"><div class="label">${network.kind === "hub" ? "AI HUB · " : network.kind === "direct" ? "DIRECT DUEL · " : ""}${route.name}</div><div class="big">${duel ? `${points[0]} <span style="color:#9eb89e">:</span> ${points[1]}` : sim.mode === "free" ? "FREE DRIVE" : `LAP ${Math.min(r.lap + 1, sim.laps)} <span style="color:#9eb89e">/ ${sim.laps}</span>`}</div><div class="sub">${duel ? `FIRST TO ${sim.target} · CRASH +2 · LEAD +1` : sim.mode === "free" ? "NO RACE RULES · FIND YOUR OWN ROAD" : `GATE ${r.gate || 12} / 12${sim.penalty ? ` · +${sim.penalty}s PENALTY` : ""}`}</div></div><div class="hudright"><div class="hudplate"><div class="label">${duel ? "TIME LEFT" : "RUN TIME"}</div><div class="big">${formatTime(duel ? Math.max(0, sim.limit - sim.t) : sim.t)}</div><div class="sub">${sim.dev ? "PRACTICE · UNRANKED" : settings.auto ? "AUTOMATIC ACCELERATION" : "MANUAL THROTTLE"}</div></div><button class="pausebutton" data-action="pause" aria-label="Pause">Ⅱ</button></div></div>${lastDevice === "touch" && sim.t > 10 ? "" : goal}<div class="minimap">${mini}</div><div class="speedplate"><span class="digits">${Math.round(
			Math.abs(c.speed) * 0.58,
		)
			.toString()
			.padStart(
				2,
				"0",
			)}</span><div class="unit">KM/H<br>${c.surface?.toUpperCase() || "ROAD"}</div></div><div class="controlhint"><span><b class="key">${glyph("steer")}</b> Steer</span><span><b class="key">${glyph("brake")}</b> Brake</span><span><b class="key">${glyph("recover")}</b> Hold to recover</span>${sim.humans === 2 && !network.active ? "<span>2P: arrows · ↓ brake · RShift recover</span>" : ""}</div>${sim.state === "countdown" || sim.state === "exchange" ? `<div class="countdown">${Math.ceil(sim.countdown) || "GO"}</div>` : ""}${r.wrong ? '<div class="centerbanner"><small>WRONG WAY</small>Turn back toward the next gate ↶</div>' : !r.valid ? '<div class="centerbanner"><small>RETURN TO ROUTE</small>Hold Recover to return to the last gate.</div>' : sim.messageT > 0 ? `<div class="centerbanner"><small>HAPPY VALLEY RACE CONTROL</small>${html(sim.message)}</div>` : ""}${c.crashed > 0 || c.stuck > 2 ? '<button class="recoverbutton" data-recover="true">Hold to recover ↺</button>' : ""}${sim.dev ? '<div class="devbadge">DEV PRACTICE · RECORDS DISABLED</div>' : ""}${toastT > 0 ? `<div class="toast">${html(toast)}</div>` : ""}</div>`;
	}
	function enterAttract() {
		if (network.active || active || screen === "connection") return;
		attracting = true;
		attractAge = 0;
		attractIndex = 0;
		attractReturn = { screen, focus: focusIndex };
		attractSim = new HappySim(world, settings);
		attractSim.attract = true;
		attractSim.aiAll = true;
		attractSim.start({ mode: "trial", course: 0, profile: 2, laps: 1 });
		ui.innerHTML =
			'<div class="demo"><strong>DEMO · AUTO LAP HAPPY</strong>Any button brings you back to the club.</div>';
		audio.setScene("driving");
	}
	function exitAttract() {
		if (!attracting) return;
		attracting = false;
		attractSim = null;
		menuIdle = 0;
		screen = attractReturn?.screen || "title";
		renderMenu();
		requestAnimationFrame(() => focusAt(attractReturn?.focus || 0));
		audio.setScene("title");
		keys.clear();
	}
	function currentGhost() {
		if (!settings.ghost || sim.mode !== "trial" || !sim.bestGhost?.length)
			return null;
		const a = sim.bestGhost;
		let lo = 0,
			hi = a.length - 1;
		while (lo < hi) {
			const mid = Math.ceil((lo + hi) / 2);
			if (a[mid][0] <= sim.t) lo = mid;
			else hi = mid - 1;
		}
		let i = lo;
		if (a[i]?.length !== 4) return null;
		return {
			x: a[i][1],
			y: a[i][2],
			angle: a[i][3],
			profile: sim.cars[0].profile,
		};
	}
	sim.onEvent = (e) => {
		if (e.type === "countdown") audio.cue("countdown");
		if (
			[
				"go",
				"gate",
				"lap",
				"water",
				"crash",
				"recover",
				"point",
				"finish",
				"discovery",
			].includes(e.type)
		)
			audio.cue(e.type);
		if (["point", "finish", "discovery"].includes(e.type)) audio.gibberish();
		if (
			e.type === "discovery" &&
			!sim.dev &&
			!network.active &&
			world.discoveries.some((d) => d.id === e.id)
		) {
			if (!passport.includes(e.id)) {
				passport.push(e.id);
				store.write("passport", passport);
			}
		}
		if (e.type === "finish") {
			saveResult();
			if (network.active && network.authoritative) {
				network.latest = sim.snapshot();
				network.finish(sim.score);
			}
		}
	};
	let onlineTick = 0,
		onlinePumping = false;
	function pumpOnline() {
		if (!active || !network.active || onlinePumping) return;
		onlinePumping = true;
		try {
			const seat = network.localSeat,
				local =
					seat === null
						? { steer: 0, brake: 1, gas: 0, safe: true }
						: getInputs()[0],
				clock = network.clock();
			network.update(0, network.authoritative ? sim.snapshot() : null, {
				steer: local.steer,
				brake: local.brake,
				throttle:
					settings.auto && local.brake < 0.025 && !local.safe ? 1 : local.gas,
				recover: local.recover,
			});
			if (!network.authoritative || !Number.isFinite(clock)) return;
			if (clock < 0) {
				if (sim.tick === 0) sim.state = "countdown";
				sim.countdown = -clock;
				return;
			}
			if (sim.state === "countdown" && onlineTick === 0) {
				sim.state = "running";
				sim.countdown = 0;
				sim.event("go");
			}
			if (sim.state === "finished") {
				onlineTick = Math.floor(clock * 120);
				return;
			}
			if (Number.isFinite(sim.limit) && clock >= sim.limit) {
				sim.t = sim.limit;
				sim.finish(
					sim.score[0] === sim.score[1]
						? "Time! A sporting draw."
						: `Time! Driver ${sim.score[0] > sim.score[1] ? 1 : 2} wins.`,
				);
				return;
			}
			const controls = [...netInputs];
			if (seat !== null) controls[seat] = local;
			const target = Math.floor(clock * 120);
			let budget = 10000;
			while (
				onlineTick < target &&
				budget-- > 0 &&
				network.active &&
				sim.state !== "finished"
			) {
				sim.t = onlineTick / 120;
				sim.step(1 / 120, controls);
				onlineTick++;
				if (sim.state !== "finished") sim.t = onlineTick / 120;
			}
		} finally {
			onlinePumping = false;
		}
	}
	const onlineTimer = setInterval(pumpOnline, 1000 / 30);
	addEventListener("pagehide", () => clearInterval(onlineTimer), {
		once: true,
	});
	function update(dt) {
		gameTime += dt;
		game.reduceMotion = settings.reduced;
		game.__happyMode = sim.mode;
		toastT = Math.max(0, toastT - dt);
		pollPads(dt);
		const input = getInputs();
		if (attracting) {
			attractAge += dt;
			attractSim.step(dt);
			if (attractSim.state === "finished" || attractAge > 115) {
				attractAge = 0;
				attractIndex = (attractIndex + 1) % 7;
				attractSim.start({
					mode:
						attractIndex === 5 ? "free" : attractIndex === 6 ? "duel" : "trial",
					course: attractIndex % 5,
					profile: attractIndex % 5,
					laps: 1,
					target: 2,
					humans: 0,
				});
				attractSim.aiAll = true;
				attractSim.attract = true;
			}
			if (attractIndex === 5) {
				if (!attractSim.navigation)
					attractSim.navigation = world.routeBetween(
						attractSim.cars[0],
						world.courses[1].gates[0],
					);
				if (attractAge > 65) attractAge = 116;
			}
		} else if (active) {
			if (network.active) pumpOnline();
			else if (!paused) sim.step(dt, input);
			if (sim.state === "finished" && !resultsShown && network.kind !== "hub") {
				resultsShown = true;
				screen = "results";
				renderResults();
			}
			hudAge += dt;
			if (screen === "driving" && hudAge > 0.1) {
				hudAge = 0;
				renderHUD();
			}
		} else {
			vignette.step(dt);
			if (vignette.state === "finished")
				vignette.start({ mode: "trial", course: 0, profile: 2, laps: 50 });
			if (!["connection", "connection-ended"].includes(screen)) {
				menuIdle = Math.max(
					menuIdle + dt,
					(performance.now() - lastInputAt) / 1000,
				);
				if (menuIdle >= 10) enterAttract();
			}
		}
		const scene = attracting ? attractSim : active ? sim : vignette,
			cars = scene.cars,
			c = cars[0];
		if (c) {
			if (freeCamera && active) {
				const m = keyboardIntent(0, false);
				game.focus(
					(game.cam.tx || c.x) + m.steer * 220 * dt,
					(game.cam.ty || c.y) +
						((keys.has("KeyS") ? 1 : 0) - (keys.has("KeyW") ? 1 : 0)) *
							220 *
							dt,
					0,
				);
			} else if (cars.length === 2) {
				game.focus(
					(cars[0].x + cars[1].x) / 2,
					(cars[0].y + cars[1].y) / 2 - 35,
					0,
				);
			} else {
				const lead = settings.reduced ? 40 : 70,
					x = c.x + Math.cos(c.angle) * lead,
					y = c.y + Math.sin(c.angle) * lead;
				game.focus(
					x - (!active && !attracting ? (game.W / game.view.scale) * 0.2 : 0),
					y - 35,
					0,
				);
			}
			renderer.update(dt, scene);
			audio.update(dt, {
				speed: c.speed,
				maxSpeed: c.o.top,
				slip: c.slide,
				surface: c.surface,
				brake: input[0].brake,
				paused: paused && !network.active,
			});
		}
	}
	function draw(r) {
		const scene = attracting ? attractSim : active ? sim : vignette;
		renderer.draw(r, scene, {
			menu: !active && !attracting,
			dev: devOpen,
			ghost: currentGhost(),
		});
		if (attracting)
			r.text(
				`${String((attractIndex % 5) + 1).padStart(2, "0")}  ${scene.course.name.toUpperCase()}`,
				r.W / 2,
				14,
				"#fff4cf",
				{ align: "center", scale: 2, shadow: "#17373b" },
			);
	}
	game.start({
		scene: "drive",
		scenes: { drive: { pausable: false, view: "topdown", update, draw } },
	});
	game.audio.set?.({ music: 0 });
	game.debug = {
		snapshot: () => ({
			screen,
			paused,
			attracting,
			network: {
				kind: network.kind,
				authority: network.authoritative,
				seat: network.localSeat,
			},
			...sim.snapshot(),
		}),
	};
	window.__happy = {
		game,
		sim,
		world,
		audio,
		get network() {
			return network;
		},
		get screen() {
			return screen;
		},
		get attracting() {
			return attracting;
		},
		get settings() {
			return settings;
		},
		get passport() {
			return [...passport];
		},
		start(c) {
			if (network.active) throw Error("Tests cannot change an online round.");
			Object.assign(setup, c);
			mode = c.mode || "trial";
			startDrive(c.mode === "tour");
		},
		action,
		step(seconds, inputs) {
			if (network.active) throw Error("Tests cannot advance online authority.");
			testInputs = inputs || null;
			game.advance(seconds, { draw: false });
			testInputs = null;
		},
		input(inputs) {
			if (network.active) throw Error("Tests cannot inject online inputs.");
			testInputs = inputs;
		},
		snapshot: () => game.debug.snapshot(),
		setIdle(seconds) {
			if (network.active) throw Error("Online idle is disabled.");
			menuIdle = seconds;
			lastInputAt = performance.now() - seconds * 1000;
		},
		errors: game.errors,
	};
	renderMenu();
	network
		.connectHub()
		.then((info) => {
			if (info) {
				store.write = () => {};
				settings = { ...defaults };
				sim.settings = settings;
				audio.setVolumes(settings);
			}
		})
		.catch((err) => say("Hub connection: " + err.message, 8));
})();
