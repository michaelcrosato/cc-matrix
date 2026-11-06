import { Shift, Showman, DEFAULTS, PHASES, initPhysics } from "./core.mjs";
import { InkScene } from "./scene.mjs";
import { AudioRack } from "./audio.mjs";
import { Controls } from "./input.mjs";
import { CrewNetwork, neutralInput } from "./network.mjs";

const INTERVIEW = __INTERVIEW_JSON__;
const $ = (id) => document.getElementById(id);
const esc = (s) =>
	String(s).replace(
		/[&<>"']/g,
		(c) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				c
			],
	);
const button = (action, label, detail = "", primary = false) =>
	`<button data-nav data-action="${action}" class="menu-button ${primary ? "primary" : ""}"><span>${label}</span><span class="detail">${detail}</span></button>`;
const pill = (action, label, primary = false) =>
	`<button data-nav data-action="${action}" class="pill ${primary ? "primary" : ""}">${label}</button>`;
const glyph = (key, pad = false) =>
	`<b class="key ${pad ? "pad" : ""}">${key}</b>`;
const svgBase = (content) =>
	`<svg viewBox="0 0 180 135" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#19373a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${content}</svg>`;
const snailIcon = svgBase(
	'<path d="M25 91h118c17-1 18-20 7-24-17-7-20 8-34 7" fill="#b3d480"/><circle cx="75" cy="64" r="33" fill="#efc681"/><path d="M75 80c-35 0-28-42-1-34 22 7 0 30-9 12"/><path d="m128 73 4-34m15 32 10-27"/><circle cx="133" cy="33" r="9" fill="#f8edc9"/><circle cx="159" cy="38" r="9" fill="#f8edc9"/>',
);
const crabIcon = svgBase(
	'<ellipse cx="91" cy="72" rx="42" ry="27" fill="#ee8a70"/><path d="m53 75-24 25m31-14-13 24m75-35 24 25m-31-14 13 24M49 65 29 45m103 20 20-20"/><path d="M23 52C2 43 5 20 23 20l5 20 10-17c15 15 3 35-15 29ZM155 52c21-9 18-32 0-32l-5 20-10-17c-15 15-3 35 15 29Z" fill="#ee8a70"/><path d="M75 53V35m30 18V35"/><circle cx="75" cy="30" r="10" fill="#f8edc9"/><circle cx="105" cy="30" r="10" fill="#f8edc9"/>',
);
const hopperIcon = svgBase(
	'<ellipse cx="53" cy="51" rx="27" ry="15" fill="#b7dbcf" transform="rotate(25 53 51)"/><ellipse cx="126" cy="51" rx="27" ry="15" fill="#b7dbcf" transform="rotate(-25 126 51)"/><ellipse cx="90" cy="72" rx="32" ry="30" fill="#b5a0dd"/><path d="m66 87-14 16 21 9m40-25 14 16-21 9M76 44 68 25m36 19 8-19"/><circle cx="77" cy="61" r="12" fill="#f7e9be"/><circle cx="105" cy="61" r="12" fill="#f7e9be"/>',
);
const iceIcon = svgBase(
	'<path d="m51 47 9-24 16 21 16-27 18 27 17-17 5 21" fill="#bce9e0"/><rect x="49" y="45" width="85" height="65" rx="9" fill="#9bdddc"/><circle cx="75" cy="71" r="10" fill="#edf2d4"/><circle cx="109" cy="71" r="10" fill="#edf2d4"/><path d="m78 96 14-7 13 7M49 84l-12 8m97-8 12 8"/>',
);
const stepArt = [
	svgBase(
		'<path d="M14 45h152v17H14z" fill="#d5a571"/><path d="M73 84v32m-15-18 15-14 15 14" stroke="#bd734c" stroke-width="6"/><circle cx="73" cy="79" r="12" fill="#f5d8a2"/><path d="M58 79h30v-8H58z" fill="#ed935c"/><path d="m61 61-9 9m35-9 10 9m-22-44 3-14m14 15 9-10"/><ellipse cx="88" cy="33" rx="24" ry="12" fill="#afd284"/>',
	),
	svgBase(
		'<path d="M14 95h87m32 0h33" stroke="#b38555" stroke-width="15"/><ellipse cx="72" cy="77" rx="24" ry="12" fill="#f0c17b"/><path d="m61 64-4-10m24 10 5-10"/><path d="M116 115c12-32 38-41 25-72-7-15-27-20-43-9" stroke="#698d69" stroke-width="5" stroke-dasharray="7 8"/><path d="m101 23-9 15 18 4" stroke="#698d69"/>',
	),
	svgBase(
		'<path d="M14 110h152" stroke="#b38555" stroke-width="15"/><circle cx="51" cy="58" r="14" fill="#f4d6a0"/><path d="M36 58h30v-9H36z" fill="#e58b58"/><path d="M51 74v22m0-7 24-8M51 96l-10 14" stroke="#3b5253" stroke-width="12"/><ellipse cx="117" cy="47" rx="23" ry="12" fill="#afd284" transform="rotate(-35 117 47)"/><path d="m141 34 14-7m-11 22h17m-28-27 7-13" stroke="#b97949"/>',
	),
];
const feedbackQuestions = {
	testing: [
		"How many issues did testing catch?",
		"How many were critical or game breaking?",
		"Most helpful test",
		"Least helpful test",
	],
	engine: [
		"What did you like most about the engine?",
		"Did you get stuck or guess wrong?",
		"Most important thing built yourself",
		"Hardest part of using the engine",
		"Engine changes",
		"One thing you would change",
	],
	prompt: [
		"What did you like most?",
		"What was confusing?",
		"What was hardest?",
		"What would you change?",
	],
};

class Drainio {
	constructor() {
		this.screen = "loading";
		this.modal = null;
		this.paused = false;
		this.localCount = 2;
		this.settings = {
			music: 0.1,
			sfx: 0.65,
			voices: 0.55,
			glyphs: "playstation",
			shake: true,
			difficulty: "arcade",
			muted: false,
			reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
		};
		try {
			Object.assign(
				this.settings,
				JSON.parse(localStorage.getItem("drainio.settings") || "{}"),
			);
			this.best = Number(localStorage.getItem("drainio.best") || 0);
		} catch {
			this.best = 0;
		}
		this.audio = new AudioRack(this.settings);
		this.net = new CrewNetwork((event) => this.networkEvent(event));
		this.input = new Controls(
			(kind) => this.activity(kind),
			(action) => this.navigate(action),
		);
		this.announcementTimer = 0;
		this.toastTimer = 0;
		this.accumulator = 0;
		this.fps = 60;
		this.ready = false;
		this.debugDraw = false;
		this.devLive = false;
		this.roomDigits = [0, 0, 0, 0, 0, 0];
		this.touchAction = $("touch-action");
		this.touchAction.addEventListener("pointerdown", (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.input.activity("touch");
			this.input.touch.action = true;
			this.input.touchActionUntil = Infinity;
		});
		const release = () => {
			this.input.touch.action = false;
		};
		this.touchAction.addEventListener("pointerup", release);
		this.touchAction.addEventListener("pointercancel", release);
		this.touchAction.addEventListener("pointerleave", release);
		window.addEventListener("resize", () => this.visual?.resize());
		document.addEventListener("visibilitychange", () => {
			if (document.hidden && this.screen === "play" && !this.net.online)
				this.pause();
		});
		this.installProbe();
	}
	async init() {
		const hubPromise = this.net.connectHub();
		await Promise.all([initPhysics(), document.fonts.ready]);
		$("load-detail").textContent = "Painting the night shift…";
		this.visual = new InkScene($("stage"), {
			fallback:
				new URLSearchParams(location.search).get("renderer") === "webgl",
			lowMotion: this.settings.reduced || !this.settings.shake,
		});
		await this.visual.init();
		const hub = await hubPromise;
		if (hub) {
			this.screen = "hubwait";
			this.game = new Shift({
				seed: this.net.info.seed,
				players: this.net.players.map((p) => p.id),
			});
			this.input.menu = false;
			this.input.players = 1;
			$("hud").classList.remove("hidden");
			this.announce(
				"CREW ASSEMBLED",
				"The next shift starts together.",
				"WATERWORKS / NIGHT CREW",
				20,
			);
			this.net.ready();
		} else this.title();
		this.ready = true;
		$("loading").classList.add("hidden");
		document.body.classList.toggle("reduce-motion", this.settings.reduced);
		this.lastFrame = performance.now();
		requestAnimationFrame((t) => this.frame(t));
		const join = new URLSearchParams(location.search).get("join");
		if (!hub && /^\d{6}$/.test(join || "")) {
			this.roomDigits = join.split("").map(Number);
			this.onlineMenu();
		}
	}
	installProbe() {
		const self = this;
		window.__drainio = {
			inspect: () => this.inspect(),
			audioCheck: () => this.audio.offlineCheck(),
			get ready() {
				return self.ready;
			},
			get backend() {
				return self.visual?.backend;
			},
		};
		if (new URLSearchParams(location.search).has("test"))
			Object.assign(window.__drainio, {
				start: (count) => this.startLocal(count || 1),
				advance: (ticks) => {
					for (let i = 0; i < ticks; i++) this.game.step({});
				},
				scenario: (type, opts = {}) => {
					const g = this.game;
					g.intro = 0;
					g.nextSpawn = 99999;
					g.god = true;
					const p = g.players[0];
					const x = opts.x ?? -5;
					g.setPosition(p, x, 0.65);
					p.invuln = 0;
					const e = g.spawnEnemy(type, { x, y: 3.7 });
					for (let i = 0; i < 10; i++) g.step({});
					return e.id;
				},
				position: (id, x, y) => {
					const p = this.game.players.find((p) => p.id === id);
					this.game.setPosition(p, x, y);
				},
				configure: (values) => Object.assign(this.game.config, values),
				phase: (n) => {
					this.game.beginPhase(n);
					this.game.intro = 0;
				},
				attract: () => this.startAttract(),
				getGame: () => this.game,
				getNetwork: () => this.net,
			});
		AIHub.probe(() => ({
			scene: this.screen,
			menu: this.modal,
			world: this.inspect().state,
			input: this.input.read(0),
		}));
	}
	inspect() {
		return {
			ready: this.ready,
			screen: this.screen,
			modal: this.modal,
			paused: this.paused,
			input: this.input.last,
			inputFrame: this.input.frames || 0,
			backend: this.visual?.backend || "unknown",
			initialBackend: this.visual?.initialBackend || "unknown",
			network: {
				role: this.net.role,
				seat: this.net.seat,
				players: this.net.players,
				sent: this.net.sent,
				received: this.net.received,
				joined: this.net.joined,
				code: this.net.code,
			},
			settings: { ...this.settings },
			state: this.net.host ? this.game?.snapshot() : this.net.snapshot,
			sound: {
				state: this.audio.ctx?.state || "locked",
				music: this.settings.music,
				notes: this.audio.notes,
				effects: this.audio.sfxCount,
				voices: this.audio.voiceCount,
				level: this.audio.level(),
			},
		};
	}
	activity(kind) {
		document.body.classList.toggle("touch", kind === "touch");
		if (this.screen === "attract") {
			this.title();
			this.input.keys.clear();
			this.input.touch.x = 0;
			this.input.touch.jump = false;
			this.suppressUntil = performance.now() + 250;
			return;
		}
		if (this.ready && !this.net.ended) this.audio.unlock().catch(() => {});
	}
	saveSettings() {
		try {
			localStorage.setItem("drainio.settings", JSON.stringify(this.settings));
		} catch {}
		this.audio.apply();
		this.visual.lowMotion = this.settings.reduced || !this.settings.shake;
		document.body.classList.toggle("reduce-motion", this.settings.reduced);
	}
	key(action) {
		const isPad = this.input.last === "pad";
		const xbox = this.settings.glyphs === "xbox";
		const keys = {
			move: isPad ? "L" : "A D",
			jump: isPad ? (xbox ? "A" : "×") : "Space",
			boot: isPad ? (xbox ? "X" : "□") : "E",
			pause: isPad ? "≡" : "Esc",
			accept: isPad ? (xbox ? "A" : "×") : "Enter",
			back: isPad ? (xbox ? "B" : "○") : "Esc",
		};
		return glyph(keys[action], isPad);
	}
	title() {
		if (AIHub.active) return;
		this.net.close();
		this.net.ended = false;
		this.game?.dispose();
		this.game = new Shift({ players: [0, 1], attract: true });
		this.showman = null;
		this.screen = "title";
		this.paused = false;
		this.modal = null;
		this.input.menu = true;
		this.input.lastActivity = performance.now();
		this.audio.pause(false);
		this.accumulator = 0;
		$("modal").classList.add("hidden");
		$("hud").classList.add("hidden");
		$("play-footer").classList.add("hidden");
		$("announcement").classList.add("hidden");
		$("attract-banner").classList.add("hidden");
		$("debug-label").classList.add("hidden");
		this.touchAction.classList.add("hidden");
		$("touch-coach").classList.add("hidden");
		$("title-screen").innerHTML =
			`<div class="title-left"><p class="eyebrow">AFTER HOURS AT THE WATERWORKS</p><h1 class="brand">DRAINIO<span>BROS.</span></h1><div class="brand-tag">A LITTLE PIPE DREAM</div><p class="title-copy">The pipes are crawling.<br>Time to give ’em the boot.</p><div class="menu-stack">${button("solo", "CLOCK IN", "Solo shift", true)}${button("couch", "BRING A BRO", "Couch crew · 2–4")}${button("online", "ONLINE SHIFT", "Room code · 1–4")}${button("manual", "THE FIELD MANUAL", "Learn the ropes")}</div><div class="title-small"><button data-nav data-action="settings" class="text-button">Settings</button><button data-nav data-action="about" class="text-button">About & credits</button></div></div><div class="station-stamp">CITY WATERWORKS<b>NIGHT CREW</b>EST. 1983 · OPEN ALL NIGHT</div><div class="title-bottom"><div class="hint-line" id="title-hints">${this.key("move")} Choose ${this.key("accept")} Select</div><div class="motto">BUMP. FLIP. BOOT.</div><div>BEST <b>${String(this.best).padStart(6, "0")}</b></div></div>`;
		$("title-screen").classList.remove("hidden");
		this.bind($("title-screen"));
		this.focusFirst($("title-screen"));
	}
	config() {
		const c = { ...DEFAULTS };
		if (this.settings.difficulty === "chill")
			Object.assign(c, { enemySpeed: 0.8, stun: 12, lives: 7, spawn: 3.1 });
		if (this.settings.difficulty === "spicy")
			Object.assign(c, { enemySpeed: 1.3, stun: 6, lives: 3, spawn: 2.2 });
		return c;
	}
	startLocal(count = 1) {
		if (AIHub.active) return;
		this.net.close();
		this.net.ended = false;
		this.game?.dispose();
		this.game = new Shift({
			players: Array.from({ length: count }, (_, i) => i),
			seed: crypto.getRandomValues(new Uint32Array(1))[0],
			config: this.config(),
		});
		this.net.players = this.game.players.map((p) => ({
			id: p.id,
			name: ["Pip", "Pop", "Pep", "Puck"][p.id],
		}));
		this.startPlay(count);
	}
	startPlay(count = 1) {
		this.input.clearTransient();
		this.screen = "play";
		this.paused = false;
		this.devLive = false;
		this.modal = null;
		this.input.menu = false;
		this.input.players = count;
		this.accumulator = 0;
		this.showman = null;
		this.announcementTimer = 0;
		$("title-screen").classList.add("hidden");
		$("modal").classList.add("hidden");
		$("attract-banner").classList.add("hidden");
		$("hud").classList.remove("hidden");
		$("play-footer").classList.remove("hidden");
		this.audio.pause(false);
		this.audio.babble("hello");
		this.touchHelpUntil = performance.now() + 6500;
	}
	startAttract() {
		if (AIHub.active || this.modal) return;
		this.game?.dispose();
		this.game = new Shift({
			players: [0, 1],
			attract: true,
			config: { ...DEFAULTS, spawn: 1.8 },
		});
		this.showman = new Showman(this.game);
		this.screen = "attract";
		this.input.menu = false;
		$("title-screen").classList.add("hidden");
		$("attract-banner").classList.remove("hidden");
		$("hud").classList.remove("hidden");
		$("play-footer").classList.add("hidden");
		this.accumulator = 0;
	}
	pause() {
		if (this.screen !== "play" || this.modal) return;
		this.paused = this.net.host;
		this.audio.pause(true);
		this.pauseMenu();
	}
	resume() {
		this.input.clearTransient();
		this.paused = false;
		this.devLive = false;
		this.modal = null;
		$("modal").classList.add("hidden");
		this.input.menu = false;
		this.audio.pause(false);
	}
	panel(name, content, { wide = false, back = null } = {}) {
		const previousModal = this.modal,
			previousFocus = document.activeElement?.dataset.action;
		this.modal = name;
		this.back =
			back ||
			(() =>
				this.screen === "title" ? this.closeTitleModal() : this.pauseMenu());
		this.input.menu = true;
		$("modal").classList.remove("hidden");
		$("modal").innerHTML =
			`<section class="panel ${wide ? "wide" : ""}" aria-label="${esc(name)}">${content}</section>`;
		this.bind($("modal"));
		if (previousModal === name && previousFocus)
			requestAnimationFrame(() =>
				this.focus(
					$("modal").querySelector(`[data-action="${previousFocus}"]`) ||
						$("modal").querySelector("[data-nav]"),
				),
			);
		else this.focusFirst($("modal"));
	}
	heading(kicker, title, backAction = "back") {
		return `<div class="panel-heading"><div><div class="kicker">${kicker}</div><h2>${title}</h2></div>${pill(backAction, "BACK")}</div>`;
	}
	bottom(text = "Everything you need for a good shift.") {
		return `<div class="panel-bottom"><span>${text}</span><span>${this.key("accept")} Select · ${this.key("back")} Back</span></div>`;
	}
	closeTitleModal() {
		this.modal = null;
		$("modal").classList.add("hidden");
		this.input.menu = true;
		this.input.lastActivity = performance.now();
		this.focusFirst($("title-screen"));
	}
	pauseMenu() {
		this.devLive = false;
		this.paused = this.net.host;
		this.panel(
			"pause",
			`${this.heading("TAKE A BREATHER", "OFF THE CLOCK")}<div class="menu-stack">${button("resume", "BACK TO THE PIPES", "Resume", true)}${button("manual", "FIELD MANUAL", "Rules & pests")}${button("settings", "SETTINGS", "Sound & controls")}${button("dev", "THE WORKSHOP", "Developer tools")}${button("about", "ABOUT & CREDITS", "Source & feedback")}${AIHub.active ? "" : button("quit", "CLOCK OUT", "Return to title")}</div>${this.bottom(this.net.online ? "Online shift · the host runs the world." : "Your shift is paused.")}`,
			{ back: () => this.resume() },
		);
	}
	couchMenu() {
		this.panel(
			"couch",
			`${this.heading("MORE HANDS, MORE HAVOC", "BRING A BRO")}<p>A shared score. A whole lot of plumbing.<br>Each crew member gets their own boots.</p><div class="crew-select">${pill("crew-less", "−")}<div><div class="number">${this.localCount}</div><div class="crew-label">CREW MEMBERS</div></div>${pill("crew-more", "+")}</div><p class="manual-note">Pip: A / D · Space · E<br>Pop: ← / → · ↑ or Right Shift · Right Ctrl<br>Everyone: a controller each. Crew 3 & 4 need pads.</p>${button("couch-start", "CLOCK IN TOGETHER", "One screen · all crew", true)}${this.bottom("Split the floors. Share the score. Have a ball.")}`,
			{ back: () => this.closeTitleModal() },
		);
	}
	manual(page = 0) {
		this.manualPage = page;
		const content =
			page === 0
				? `<div class="manual-grid">${["BUMP IT", "CHASE IT", "BOOT IT"].map((name, i) => `<div class="manual-step">${stepArt[i]}<h3>${i + 1}. ${name}</h3><p>${["Jump into the floor beneath a pest. A bump flips it onto its back.", "Use the gaps to jump up. Get there before the pest finds its feet!", "Touch a flipped pest, or use your boot button. Chain kicks for more points."][i]}</p></div>`).join("")}</div><p class="manual-note">${this.key("move")} Move &nbsp; ${this.key("jump")} Jump &nbsp; ${this.key("boot")} Boot / BOP<br>Down + Jump: drop through a floor. Walk off a side to wrap around.</p><p>Eight shifts, two coin breaks, one enormous clog. Clear every pest to move on. You get an extra life every 15,000 personal points.</p>`
				: `<div class="pest-grid">${[
						[
							snailIcon,
							"BOTTLEBACK",
							"One bump flips this plodding pipe dweller.",
						],
						[
							crabIcon,
							"CLAWBACK",
							"Two bumps! The first makes it red-hot and quicker.",
						],
						[
							hopperIcon,
							"SPRINGWING",
							"Time your bump while its feet are on the floor.",
						],
						[
							iceIcon,
							"FROSTIE",
							"Bump it before it melts and ices the floor. Bump frozen floors to thaw them.",
						],
					]
						.map(
							([art, name, text]) =>
								`<div class="pest-card">${art}<div><h3>${name}</h3><p>${text}</p></div></div>`,
						)
						.join(
							"",
						)}</div><p class="manual-note">BOP! The brass block has three charges. Bump its underside or press ${this.key("boot")} nearby to jolt every grounded pest. Coin breaks refill it.</p><p>Sparks and falling icicles hurt. Healthy pests hurt from every side. The Big Clog needs three bumps, then one good boot. Collect every bonus coin for 5,000 extra points!</p>`;
		const from =
			this.screen === "title"
				? () => this.closeTitleModal()
				: () => this.pauseMenu();
		this.panel(
			"manual",
			`${this.heading("THE FIELD MANUAL", page ? "KNOW YOUR PESTS" : "A THREE-STEP SERVICE")}<div class="tabs"><button data-nav data-action="manual-0" class="tab ${!page ? "active" : ""}">HOW TO PLAY</button><button data-nav data-action="manual-1" class="tab ${page ? "active" : ""}">PESTS & POWER</button></div>${content}${this.bottom("Bump from below. Healthy pests can’t be stomped.")}`,
			{ wide: true, back: from },
		);
	}
	range(key, label, value, min, max, step, suffix = "", setting = false) {
		return `<div class="row"><label for="range-${key}">${label}</label><input data-nav type="range" id="range-${key}" data-${setting ? "setting" : "config"}="${key}" min="${min}" max="${max}" step="${step}" value="${value}"><output class="value" for="range-${key}">${setting ? Math.round(value * 100) : value}${suffix}</output></div>`;
	}
	settingsMenu() {
		const s = this.settings;
		this.panel(
			"settings",
			`${this.heading("MAKE YOURSELF AT HOME", "SETTINGS")}${this.range("music", "Music", s.music, 0, 1, 0.01, "%", true)}${this.range("sfx", "Sound effects", s.sfx, 0, 1, 0.01, "%", true)}${this.range("voices", "Crew chatter", s.voices, 0, 1, 0.01, "%", true)}<div class="row"><span>Button glyphs</span>${pill("glyphs", s.glyphs === "playstation" ? "PLAYSTATION" : "XBOX")}</div><div class="row"><span>Shift difficulty</span>${pill("difficulty", s.difficulty.toUpperCase())}</div><div class="row"><span>Screen shake</span>${pill("shake", s.shake ? "ON" : "OFF")}</div><div class="row"><span>Reduced motion</span>${pill("reduced", s.reduced ? "ON" : "OFF")}</div><div class="row"><span>Big screen</span>${pill("fullscreen", document.fullscreenElement ? "WINDOWED" : "FULLSCREEN")}</div>${this.bottom("Difficulty applies when a new local shift starts.")}`,
			{
				back: () =>
					this.screen === "title" ? this.closeTitleModal() : this.pauseMenu(),
			},
		);
	}
	about(tab = "source") {
		this.aboutTab = tab;
		let content;
		if (tab === "source") {
			const labels = {
				date: "Date",
				source: "Source",
				plan: "Plan",
				genre: "Genre",
				perspective: "Perspective",
				tech: "Tech",
				artDirection: "Art direction",
				animation: "Animation",
				audio: "Audio",
				online: "Online",
				testing: "Testing",
				research: "Research",
				environment: "Environment",
				model: "Model",
				usage: "Usage",
			};
			content = `<p><strong>An original, unofficial arcade tribute.</strong> Pip, Pop, Pep & Puck are the night crew. The waterworks is all out of patience. Every shape, animation, note, and nonsense syllable was built in code.</p><dl>${Object.entries(
				INTERVIEW.sourceInformation,
			)
				.map(([k, v]) => `<dt>${labels[k] || k}</dt><dd>${esc(v)}</dd>`)
				.join(
					"",
				)}</dl><p class="credits-footnote" style="margin-top:1em">Research: Nintendo’s Arcade Archives Mario Bros. page and screenshots; 1983 Atari manual; Mario Wiki mechanics and soundtrack notes. Engine references: Three.js r180 source, Rapier JavaScript guide, PeerJS documentation, AI Hub Session Protocol v1.<br>Fonts: Bungee by David Jonathan Ross; Barlow Condensed by Jeremy Tribby (OFL). Mario Bros. is Nintendo’s. No original game assets or recordings are included.</p>`;
		} else {
			const key = `${tab}Feedback`;
			content = INTERVIEW[key]
				.map(
					(v, i) =>
						`<div class="feedback-item"><b>${esc(feedbackQuestions[tab][i])}</b><p>${esc(v)}</p></div>`,
				)
				.join("");
		}
		this.panel(
			"about",
			`${this.heading("THE PEOPLE BEHIND THE PIPES", "ABOUT & CREDITS")}<div class="tabs">${["source", "testing", "engine", "prompt"].map((t) => `<button data-nav data-action="about-${t}" class="tab ${t === tab ? "active" : ""}">${t.toUpperCase()}${t !== "source" ? " FEEDBACK" : " INFORMATION"}</button>`).join("")}</div><div data-nav data-scroll tabindex="0" class="source-content">${content}</div>${this.bottom("Focus this page and use ↑ / ↓ to read. Mouse wheel & touch scroll work too.")}`,
			{
				wide: true,
				back: () =>
					this.screen === "title" ? this.closeTitleModal() : this.pauseMenu(),
			},
		);
		$("modal").querySelector("[data-scroll]").style.touchAction = "pan-y";
	}
	onlineMenu() {
		this.panel(
			"online",
			`${this.heading("CALL IN THE CREW", "ONLINE SHIFT")}<p>One shared waterworks, up to four crew.<br>Create a room, then pass its six-digit code to a pal.</p>${button("host-room", "MAKE A ROOM", "You run the shift", true)}<p style="text-align:center;font-weight:800">— OR JOIN A CREW —</p><input data-nav class="digits-input" id="room-input" type="text" inputmode="numeric" maxlength="6" placeholder="Type a 6-digit code" aria-label="Room code" value="${this.roomDigits.some(Boolean) ? this.roomDigits.join("") : ""}"><div class="digit-controls">${this.roomDigits.map((n, i) => `<button data-nav data-digit="${i}" class="digit" aria-label="Room digit ${i + 1}, ${n}. Use up or down to change.">${n}</button>`).join("")}</div>${button("join-room", "JOIN THIS ROOM", "↑ / ↓ change digits")}<p class="network-status" id="network-status">Internet rooms use WebRTC and PeerJS signaling. Same-browser tabs also work. No account needed.</p>${this.bottom("Joining AI Hub? The hub brings your whole crew automatically.")}`,
			{
				back: () => {
					this.net.close();
					this.closeTitleModal();
				},
			},
		);
		$("room-input").addEventListener("input", (e) => {
			e.target.value = e.target.value.replace(/\D/g, "").slice(0, 6);
			this.roomDigits = e.target.value.padEnd(6, "0").split("").map(Number);
			document
				.querySelectorAll("[data-digit]")
				.forEach((el, i) => (el.textContent = this.roomDigits[i]));
		});
	}
	lobby(event) {
		if (this.screen === "play" || this.net.inRound) return;
		const host = this.net.host;
		this.panel(
			"lobby",
			`${this.heading("NIGHT CREW ROLL CALL", host ? "YOUR ROOM IS OPEN" : "YOU’RE ON THE CREW")}<p style="text-align:center">Share this code with your crew:</p><div class="room-code">${esc(event.code || this.net.code)}</div><div class="room-crew">${[
				0, 1, 2, 3,
			]
				.map((i) => {
					const p = this.net.players.find((p) => p.id === i);
					return `<div class="seat ${p ? "joined" : ""}"><i style="color:${["#b96840", "#347c70", "#8269aa", "#a78b30"][i]}">◆</i>${p ? esc(p.name) : "OPEN"}${i === this.net.seat ? " · YOU" : ""}</div>`;
				})
				.join(
					"",
				)}</div>${host ? button("online-start", "CLOCK IN, CREW!", `${this.net.players.length} on the roster`, true) : '<p class="manual-note">The host starts the shift. You’ll control your own crew member.</p>'}<p id="network-status" class="network-status">${event.internet ? "Internet signaling ready · Direct peer connection" : event.connecting ? "Room ready for local tabs. Connecting internet signaling…" : "Crew connected. Waiting for the whistle."}</p>${this.bottom("Stick / A-D to move · Cross / Space to jump · Square / E to boot.")}`,
			{
				back: () => {
					this.net.close();
					this.onlineMenu();
				},
			},
		);
	}
	workshop(tab = "feel") {
		this.devTab = tab;
		if (AIHub.active || (this.net.online && !this.net.host)) {
			this.panel(
				"dev",
				`${this.heading("THE WORKSHOP", "CREW RULES")}<p>Live testing tools are available in local shifts and to the standalone room host.</p>${this.bottom("The hub keeps session conditions shared.")}`,
				{ back: () => this.pauseMenu() },
			);
			return;
		}
		const c = this.game.config;
		let content = "";
		if (tab === "feel")
			content =
				this.range("speed", "Run speed", c.speed, 3, 10, 0.1) +
				this.range("jump", "Jump strength", c.jump, 12, 21, 0.1) +
				this.range("gravity", "Gravity", c.gravity, 18, 42, 0.5) +
				this.range("timeScale", "Time scale", c.timeScale, 0.1, 2, 0.1);
		if (tab === "pests")
			content =
				this.range("enemySpeed", "Pest speed", c.enemySpeed, 0.25, 2.5, 0.05) +
				this.range("stun", "Flip duration", c.stun, 3, 20, 0.5, "s") +
				this.range("spawn", "Spawn interval", c.spawn, 0.6, 5, 0.1, "s") +
				this.range("lives", "Starting lives", c.lives, 1, 9, 1);
		if (tab === "tools")
			content = `<div class="dev-tools">${pill("god", this.game.god ? "INVINCIBLE: ON" : "INVINCIBLE: OFF")}${pill("step", "STEP 1 FRAME")}${pill("debug-draw", this.debugDraw ? "COLLIDERS: ON" : "COLLIDERS: OFF")}${pill("skip", "NEXT SHIFT")}${pill("restart-phase", "RESTART SHIFT")}${pill("lives-refill", "REFILL BOOTS")}${pill("spawn-shell", "BOTTLEBACK")}${pill("spawn-crab", "CLAWBACK")}${pill("spawn-hopper", "SPRINGWING")}${pill("spawn-ice", "FROSTIE")}${pill("spawn-boss", "BIG CLOG")}${pill("refill-bop", "REFILL BOP")}</div>`;
		this.panel(
			"dev",
			`${this.heading("LIVE DEVELOPER TOOLS", "THE WORKSHOP")}<div class="tabs">${["feel", "pests", "tools"].map((t) => `<button data-nav data-action="dev-${t}" class="tab ${tab === t ? "active" : ""}">${t.toUpperCase()}</button>`).join("")}</div>${content}<div class="dev-stats" id="dev-stats"></div><div class="panel-bottom">${pill("dev-live", this.devLive ? "PAUSE WORLD" : "RUN WORLD")}${pill("reset-config", "RESET DEFAULTS")}${pill("resume", "PLAY SHIFT", true)}</div><p class="credits-footnote">Changes apply live. Starting lives applies next shift; refill boots applies now. Workshop changes mark this run unranked.</p>`,
			{ wide: true, back: () => this.pauseMenu() },
		);
	}
	result() {
		if (this.modal === "result" || AIHub.active) return;
		const state = this.state,
			won = state.status === "won";
		if (!state.cheated && !this.net.online && state.score > this.best) {
			this.best = state.score;
			try {
				localStorage.setItem("drainio.best", String(this.best));
			} catch {}
		}
		this.panel(
			"result",
			`${this.heading(won ? "SERVICE COMPLETE / WATERWORKS 07" : "THAT’S YOUR SHIFT", won ? "WATER’S RUNNING!" : "ALL OUT OF BOOTS")}<p>${won ? "Pipes clear. Boots muddy. A job well bopped." : "Those pipes won this round. A fresh crew is always welcome."}</p><div class="result-score">${String(state.score).padStart(6, "0")}</div><div class="result-stats"><div class="result-stat"><b>${state.stats.kicks}</b><span>PESTS BOOTED</span></div><div class="result-stat"><b>${state.maxCombo}×</b><span>BEST CHAIN</span></div><div class="result-stat"><b>${Math.floor(state.elapsed / 60)}:${String(Math.floor(state.elapsed % 60)).padStart(2, "0")}</b><span>ON THE CLOCK</span></div></div><div class="menu-stack">${this.net.online ? "" : button("replay", "ANOTHER SHIFT?", "Same crew, fresh pipes", true)}${button("quit", "CLOCK OUT", "Return to title")}</div>${this.bottom(state.cheated ? "Workshop run · score unranked" : `LOCAL BEST ${String(this.best).padStart(6, "0")}`)}`,
			{ back: () => this.title() },
		);
	}
	bind(root) {
		root.querySelectorAll("[data-nav]").forEach((el) => {
			el.addEventListener("pointerenter", (e) => {
				if (e.pointerType !== "touch") this.focus(el);
			});
			el.addEventListener("focus", () => {
				root
					.querySelectorAll(".focused")
					.forEach((x) => x.classList.remove("focused"));
				el.classList.add("focused");
			});
			if (el.dataset.action)
				el.addEventListener("click", () => {
					this.audio.fx("ui");
					this.act(el.dataset.action);
				});
			if (el.dataset.digit !== undefined)
				el.addEventListener("click", () => this.changeDigit(el, 1));
			if (el.matches("input[type=range]"))
				el.addEventListener("input", () => {
					const value = Number(el.value);
					const key = el.dataset.setting || el.dataset.config;
					el.nextElementSibling.textContent = `${el.dataset.setting ? Math.round(value * 100) : Math.round(value * 100) / 100}${el.dataset.setting ? "%" : key === "stun" || key === "spawn" ? "s" : ""}`;
					if (el.dataset.setting) {
						this.settings[key] = value;
						this.saveSettings();
					} else {
						this.game.config[key] = value;
						this.game.cheated = true;
					}
				});
		});
	}
	focus(el) {
		if (!el) return;
		document
			.querySelectorAll(".focused")
			.forEach((x) => x.classList.remove("focused"));
		el.classList.add("focused");
		el.focus({ preventScroll: true });
	}
	focusFirst(root) {
		requestAnimationFrame(() => {
			const first =
				root.querySelector(".primary[data-nav]") ||
				root.querySelector("[data-nav]");
			this.focus(first);
		});
	}
	changeDigit(el, delta) {
		const i = Number(el.dataset.digit);
		this.roomDigits[i] = (this.roomDigits[i] + delta + 10) % 10;
		el.textContent = this.roomDigits[i];
		$("room-input").value = this.roomDigits.join("");
	}
	navigate(action) {
		if (
			performance.now() < (this.suppressUntil || 0) ||
			this.screen === "hubended"
		)
			return;
		if (action === "pause") {
			this.pause();
			return;
		}
		if (action === "back") {
			if (this.modal) this.back?.();
			else if (this.screen === "play") this.pause();
			return;
		}
		if (!this.modal && this.screen !== "title") return;
		const root = this.modal ? $("modal") : $("title-screen");
		const all = Array.from(root.querySelectorAll("[data-nav]")).filter(
			(el) => !el.disabled && el.getBoundingClientRect().width > 0,
		);
		if (!all.length) return;
		let current = all.includes(document.activeElement)
			? document.activeElement
			: all[0];
		if (action === "accept") {
			if (current.matches("button")) current.click();
			else if (current.id === "room-input") this.act("join-room");
			return;
		}
		if (
			current.matches("input[type=range]") &&
			["left", "right"].includes(action)
		) {
			current.value =
				Number(current.value) +
				(action === "right" ? 1 : -1) * Number(current.step);
			current.dispatchEvent(new Event("input"));
			return;
		}
		if (
			current.dataset.digit !== undefined &&
			["up", "down"].includes(action)
		) {
			this.changeDigit(current, action === "up" ? 1 : -1);
			return;
		}
		if (
			current.hasAttribute("data-scroll") &&
			["up", "down"].includes(action)
		) {
			const direction = action === "down" ? 1 : -1;
			if (
				(direction > 0 &&
					current.scrollTop <
						current.scrollHeight - current.clientHeight - 2) ||
				(direction < 0 && current.scrollTop > 0)
			) {
				current.scrollBy({
					top: direction * 90,
					behavior: this.settings.reduced ? "instant" : "smooth",
				});
				return;
			}
		}
		const r = current.getBoundingClientRect(),
			cx = r.x + r.width / 2,
			cy = r.y + r.height / 2;
		const horiz = action === "left" || action === "right";
		const sign = action === "right" || action === "down" ? 1 : -1;
		const candidates = all
			.filter((el) => el !== current)
			.map((el) => {
				const b = el.getBoundingClientRect(),
					dx = b.x + b.width / 2 - cx,
					dy = b.y + b.height / 2 - cy;
				return {
					el,
					forward: (horiz ? dx : dy) * sign,
					cross: Math.abs(horiz ? dy : dx),
				};
			})
			.filter((c) => c.forward > 4)
			.sort((a, b) => a.forward + a.cross * 2.5 - (b.forward + b.cross * 2.5));
		this.focus(
			candidates[0]?.el ||
				all[(all.indexOf(current) + sign + all.length) % all.length],
		);
		this.audio.fx("ui");
	}
	act(action) {
		if (this.screen === "hubended") return;
		if (action === "solo") this.startLocal(1);
		else if (action === "couch") this.couchMenu();
		else if (action === "crew-less" || action === "crew-more") {
			this.localCount = Math.max(
				2,
				Math.min(4, this.localCount + (action.endsWith("more") ? 1 : -1)),
			);
			this.couchMenu();
			this.focus($("modal").querySelector(`[data-action="${action}"]`));
		} else if (action === "couch-start") this.startLocal(this.localCount);
		else if (action === "back") this.back?.();
		else if (action === "resume") this.resume();
		else if (action === "manual") this.manual(0);
		else if (action.startsWith("manual-"))
			this.manual(Number(action.slice(-1)));
		else if (action === "settings") this.settingsMenu();
		else if (action === "about") this.about();
		else if (action.startsWith("about-")) this.about(action.slice(6));
		else if (action === "online") this.onlineMenu();
		else if (action === "host-room") this.net.hostRoom();
		else if (action === "join-room") {
			const code = $("room-input")?.value || this.roomDigits.join("");
			if (!/^\d{6}$/.test(code)) this.toast("A room code has six digits.");
			else this.net.joinRoom(code);
		} else if (action === "online-start") this.net.start();
		else if (action === "quit") {
			if (!AIHub.active) this.title();
		} else if (action === "replay") this.startLocal(this.game.players.length);
		else if (action === "glyphs") {
			this.settings.glyphs =
				this.settings.glyphs === "playstation" ? "xbox" : "playstation";
			this.saveSettings();
			this.settingsMenu();
		} else if (action === "difficulty") {
			const modes = ["chill", "arcade", "spicy"];
			this.settings.difficulty =
				modes[(modes.indexOf(this.settings.difficulty) + 1) % modes.length];
			this.saveSettings();
			this.settingsMenu();
		} else if (["shake", "reduced"].includes(action)) {
			this.settings[action] = !this.settings[action];
			this.saveSettings();
			this.settingsMenu();
		} else if (action === "fullscreen") {
			const promise = document.fullscreenElement
				? document.exitFullscreen()
				: document.documentElement.requestFullscreen();
			promise?.catch(() => this.toast("Fullscreen is unavailable here."));
		} else if (action === "dev") this.workshop();
		else if (action.startsWith("dev-") && action !== "dev-live")
			this.workshop(action.slice(4));
		else if (action === "dev-live") {
			this.devLive = !this.devLive;
			this.workshop(this.devTab);
		} else if (action === "reset-config") {
			Object.assign(this.game.config, DEFAULTS);
			this.game.cheated = true;
			this.workshop(this.devTab);
		} else if (action === "god") {
			this.game.god = !this.game.god;
			this.game.cheated = true;
			this.workshop("tools");
		} else if (action === "debug-draw") {
			this.debugDraw = !this.debugDraw;
			this.workshop("tools");
		} else if (action === "step") {
			this.game.step({});
			this.game.cheated = true;
		} else if (action === "skip") {
			this.game.debugSkip();
			this.workshop("tools");
		} else if (action === "restart-phase") {
			this.game.beginPhase(this.game.phase);
			this.game.cheated = true;
		} else if (action === "lives-refill") {
			for (const p of this.game.players) {
				p.lives = Math.round(this.game.config.lives);
				p.dead = 0;
				p.body.setGravityScale(1, true);
				p.collider.setCollisionGroups(0x00020001);
				this.game.setPosition(p, p.id % 2 ? 3 : -3, 1);
			}
			this.game.cheated = true;
		} else if (action === "refill-bop") {
			this.game.pow = 3;
			this.game.cheated = true;
		} else if (action.startsWith("spawn-"))
			this.game.debugSpawn(action.slice(6));
	}
	networkEvent(event) {
		if (event.type === "lobby") this.lobby(event);
		if (event.type === "joining") {
			const el = $("network-status");
			if (el) el.textContent = `Calling room ${event.code}…`;
		}
		if (event.type === "error") {
			const el = $("network-status");
			if (el) {
				el.textContent = event.message;
				el.classList.add("error");
			} else this.toast(event.message, 7);
		}
		if (event.type === "start") {
			this.net.inRound = true;
			if (this.net.host) {
				this.game?.dispose();
				this.game = new Shift({
					seed: this.net.info?.seed || 1983,
					players: this.net.players.map((p) => p.id),
				});
			}
			this.startPlay(1);
			if (event.hub && AIHub.time() < 0)
				this.announce(
					"READY, CREW?",
					"The whistle blows in a moment.",
					"A SHARED SHIFT",
					3.1,
				);
		}
		if (event.type === "state") {
			this.remotePaused = event.paused;
		}
		if (event.type === "leave") {
			if (this.net.host && this.game) this.game.removePlayer(event.id);
			if (this.screen === "play")
				this.toast("A crew member clocked out. Keep those pipes moving.");
			else if (this.modal === "lobby") this.lobby({ code: this.net.code });
		}
		if (event.type === "timeup")
			this.net.finish(this.game?.snapshot(), this.game?.status === "won");
		if (event.type === "end") {
			this.screen = "hubended";
			this.modal = null;
			$("modal").classList.add("hidden");
			this.input.menu = false;
			this.audio.stop();
			$("announcement").classList.add("hidden");
			this.touchAction.classList.add("hidden");
		}
		if (event.type === "disconnect" && !AIHub.active) {
			this.paused = true;
			this.panel(
				"disconnect",
				`${this.heading("THE CONNECTION RAN DRY", "CREW DISCONNECTED")}<p>${esc(event.message)}</p>${button("quit", "CLOCK OUT", "Return to title", true)}`,
				{ back: () => this.title() },
			);
		}
	}
	announce(title, detail, kicker = "WATERWORKS / NIGHT SHIFT", seconds = 2.4) {
		$("announcement").innerHTML =
			`<div class="overline">${esc(kicker)}</div><h2>${esc(title)}</h2><p>${esc(detail)}</p>`;
		$("announcement").classList.remove("hidden");
		this.announcementTimer = seconds;
	}
	toast(text, seconds = 3) {
		$("toast").textContent = text;
		$("toast").classList.remove("hidden");
		this.toastTimer = seconds;
	}
	onEvent(e) {
		if (this.screen === "title" || this.screen === "hubwait") return;
		this.visual.event(e);
		this.audio.fx(e.type);
		if (e.type === "phase") {
			const def = PHASES[e.phase];
			this.announce(
				def.name,
				def.lesson,
				`${def.bonus ? "BONUS" : "SHIFT"} ${String(e.phase + 1).padStart(2, "0")} / 08`,
				2.4,
			);
			if (e.phase > 0) this.audio.babble(e.phase === 4 ? "cold" : "hello");
		}
		if (e.type === "clear")
			this.announce(
				e.perfect ? "POCKETS FULL!" : e.bonus ? "NICE HAUL!" : "PIPES CLEAR!",
				e.bonus
					? `${e.collected} / ${e.total} tokens${e.perfect ? " · Perfect bonus +5,000!" : " · Back to the pipes!"}`
					: "Good work, crew. Next shift coming up!",
				"SERVICE REPORT",
				2.3,
			);
		if (["victory", "gameover"].includes(e.type)) {
			if (AIHub.active)
				this.net.finish(this.game.snapshot(), e.type === "victory");
			else if (this.screen !== "attract") this.resultDelay = 1.4;
		}
	}
	updateHUD(state) {
		if (!state) return;
		const phase = PHASES[state.phase];
		const time = phase.bonus
			? `${Math.max(0, Math.ceil(phase.duration - state.phaseTime))}s · ${state.bonusCollected}/${state.bonusTotal} TOKENS`
			: `${state.cleared} / ${phase.types.length} PESTS CLEARED`;
		const hudKey = JSON.stringify([
			state.score,
			state.phase,
			state.players.map((p) => [p.id, p.lives]),
			time,
			state.pow,
			this.input.last,
			this.settings.glyphs,
		]);
		if (hudKey !== this.lastHud) {
			this.lastHud = hudKey;
			$("hud").innerHTML =
				`<div class="hud-card"><div class="hud-label">CREW SCORE</div><div class="hud-score">${String(state.score).padStart(6, "0")}</div><div class="crew-lives">${state.players.map((p) => `<span><i style="background:${["#ed8d58", "#79cbb4", "#b7a1d7", "#e7c558"][p.id % 4]}"></i>${esc(this.net.players.find((n) => n.id === p.id)?.name || ["Pip", "Pop", "Pep", "Puck"][p.id % 4])} ${p.lives > 0 ? "×" + p.lives : "OUT"}</span>`).join("")}</div></div><div class="phase-card"><div class="phase-small">${phase.bonus ? "BONUS" : "SHIFT"} ${String(state.phase + 1).padStart(2, "0")} / 08 · ${time}</div><div class="phase-name">${phase.name}</div><div class="phase-progress">${PHASES.map((p, i) => `<i class="${i <= state.phase ? "done" : ""}"></i>`).join("")}</div></div><div class="hud-right"><div class="bop-count">BOP ×${state.pow}</div><button id="pause-now" class="pause-button" aria-label="Pause game">Ⅱ</button></div>`;
			$("pause-now").addEventListener("click", () => this.pause());
			$("play-footer").innerHTML =
				`<div class="footer-controls"><span>${this.key("move")} Move</span><span>${this.key("jump")} Jump</span><span>${this.key("boot")} Boot / BOP</span><span>${this.key("pause")} Pause</span></div><div class="combo">${state.comboTime > 0 && state.combo > 1 ? `${state.combo}× BOOT CHAIN!` : this.net.online ? "CREW ON THE LINE" : "BUMP. FLIP. BOOT."}</div>`;
		}
		$("debug-label").classList.toggle(
			"hidden",
			!state.cheated || this.screen === "title" || this.screen === "attract",
		);
		if (this.modal === "dev" && $("dev-stats"))
			$("dev-stats").textContent =
				`${this.visual.backend} · ${Math.round(this.fps)} frames/s · ${this.game.world.bodies.len()} bodies · Shift ${state.phase + 1} · Tick ${state.tick}`;
		if (this.input.last === "touch" && this.screen === "play" && !this.modal) {
			const p = state.players.find(
				(p) => p.id === (this.net.online ? this.net.seat : 0),
			);
			const nearby =
				p &&
				state.enemies.some(
					(e) =>
						e.state === "flipped" &&
						Math.abs(e.x - p.x) < 2.1 &&
						Math.abs(e.y - p.y) < 1.2,
				);
			const bop =
				p && Math.abs(p.x) < 2.1 && p.y < 3 && state.pow > 0 && !phase.bonus;
			this.touchAction.classList.toggle("hidden", !nearby && !bop);
			this.touchAction.textContent = bop ? "BOP!" : "BOOT!";
			$("touch-coach").classList.toggle(
				"hidden",
				performance.now() > this.touchHelpUntil,
			);
		} else {
			this.touchAction.classList.add("hidden");
			$("touch-coach").classList.add("hidden");
		}
	}
	frame(now) {
		const dt = Math.min(0.1, (now - this.lastFrame) / 1000);
		this.lastFrame = now;
		this.fps += (1 / Math.max(0.001, dt) - this.fps) * 0.04;
		this.input.poll(dt);
		if (
			this.screen === "title" &&
			!this.modal &&
			now - this.input.lastActivity > 10000
		)
			this.startAttract();
		let events = [];
		const hubWaiting =
			AIHub.active && (!this.net.hubStarted || AIHub.time() < 0);
		if (
			this.net.host &&
			this.game &&
			this.screen !== "hubended" &&
			!hubWaiting
		) {
			const run = !this.paused || (this.modal === "dev" && this.devLive);
			if (run) {
				this.accumulator += dt * this.game.config.timeScale;
				let steps = 0;
				while (this.accumulator >= 1 / 60 && steps++ < 12) {
					let inputs = this.net.remoteInputs();
					if (this.screen === "attract") inputs = this.showman.update();
					else if (this.screen === "play" && !this.modal) {
						if (this.net.online) {
							if (this.net.players.some((p) => p.id === this.net.seat))
								inputs[this.net.seat] = this.input.read(0);
						} else
							for (let i = 0; i < this.game.players.length; i++)
								inputs[this.game.players[i].id] = this.input.read(i);
						if (this.input.last === "touch") {
							const p = this.game.players.find(
								(p) => p.id === (this.net.online ? this.net.seat : 0),
							);
							const control = inputs[p?.id];
							if (
								p &&
								control &&
								p.grounded &&
								!p.jumpHeld &&
								this.game.enemies.some(
									(e) =>
										e.state === "walk" &&
										e.grounded &&
										Math.abs(e.x - p.x) < 1.35 &&
										Math.abs(e.y - p.y - 3.03) < 0.7,
								)
							)
								control.jump = true;
						}
					}
					this.game.step(inputs);
					if (this.screen === "play" && !this.modal) {
						for (
							let i = 0;
							i < (this.net.online ? 1 : this.game.players.length);
							i++
						)
							this.input.consume(i);
					}
					this.accumulator -= 1 / 60;
				}
			}
			events = this.game.drainEvents();
			this.state = this.game.snapshot();
		} else if (!this.net.host) {
			this.state = this.net.snapshot || this.game?.snapshot();
			events = this.net.events.splice(0);
		} else this.state = this.game?.snapshot();
		for (const e of events) this.onEvent(e);
		if (!hubWaiting && this.screen !== "hubended") {
			const sent = this.net.poll(
				dt,
				this.net.host ? this.state : null,
				this.modal ? neutralInput() : this.input.read(0),
				events,
				this.paused,
			);
			if (sent && !this.net.host) this.input.consume(0);
		}
		if (this.state) {
			this.visual.update(this.state, dt, this.screen === "title");
			this.updateHUD(this.state);
		}
		this.visual.debugPhysics(
			this.debugDraw && this.game && this.modal === "dev"
				? this.game.world.debugRender()
				: null,
		);
		this.audio.update(this.state, this.screen === "title");
		if (this.announcementTimer > 0) {
			this.announcementTimer -= dt;
			if (this.announcementTimer <= 0)
				$("announcement").classList.add("hidden");
		}
		if (this.toastTimer > 0) {
			this.toastTimer -= dt;
			if (this.toastTimer <= 0) $("toast").classList.add("hidden");
		}
		if (this.resultDelay > 0) {
			this.resultDelay -= dt;
			if (this.resultDelay <= 0) this.result();
		}
		if (this.screen === "title" && $("title-hints"))
			$("title-hints").innerHTML =
				`${this.key("move")} Choose ${this.key("accept")} Select`;
		this.visual.render();
		requestAnimationFrame((t) => this.frame(t));
	}
}
const app = new Drainio();
app.init().catch((err) => {
	console.error(err);
	$("load-detail").textContent =
		`The pipes hit a snag: ${err.message}. Try a current browser with WebGPU or WebGL 2 and internet access for the engine downloads.`;
	if (AIHub.active) AIHub.fail(err.message);
});
