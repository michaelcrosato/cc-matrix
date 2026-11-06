import metadata from "./metadata.json";
import { THREE } from "./visuals.js";

const $ = (id) => document.getElementById(id);
const esc = (text) =>
	String(text).replace(
		/[&<>"']/g,
		(c) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				c
			],
	);
const K = {
	accept: "Enter",
	back: "Esc",
	fire: "Space",
	boost: "Shift",
	shield: "C",
	nova: "X",
	interact: "F",
	target: "T",
	chart: "M",
	jump: "J",
	camera: "V",
	pause: "Esc",
};
const PS = {
	accept: "✕",
	back: "○",
	fire: "R2",
	boost: "L2",
	shield: "✕",
	nova: "○",
	interact: "□",
	target: "△",
	chart: "L1",
	jump: "R1",
	camera: "R3",
	pause: "Options",
};
const XB = {
	accept: "A",
	back: "B",
	fire: "RT",
	boost: "LT",
	shield: "A",
	nova: "B",
	interact: "X",
	target: "Y",
	chart: "LB",
	jump: "RB",
	camera: "RS",
	pause: "Menu",
};
const QUESTIONS = {
	testing: [
		"How many issues did testing catch?",
		"How many would be considered critical issues / game breaking?",
		"What was the most helpful test you ran?",
		"What was the least helpful test you ran?",
	],
	engine: [
		"What did you like most about the engine?",
		"Did you get stuck or guess wrong?",
		"What was the most important thing you had to build yourself?",
		"What was the hardest part about using the engine?",
		"What did you change in the engine, and why?",
		"If you could change one thing about the engine, what would it be?",
	],
	prompt: [
		"What did you like most about this prompt?",
		"What was confusing?",
		"What was the hardest thing to do?",
		"What would you change in this prompt?",
	],
};
export class UI {
	constructor(game) {
		this.g = game;
		this.page = null;
		this.parent = null;
		this.damage = 0;
		this.commTime = 0;
		this.noticeTime = 0;
		this.aboutTab = "source";
		this.defaults = { ...game.cfg };
		this.hudCtx = $("hud-canvas").getContext("2d");
		document.addEventListener("click", (e) => {
			const b = e.target.closest("[data-cmd]");
			if (!b || b.disabled || this.g.hubEnded) return;
			this.command(b.dataset.cmd, b.dataset.value);
		});
		document.addEventListener("input", (e) => {
			if (e.target.dataset.setting) {
				const key = e.target.dataset.setting;
				game.settings[key] = Number(e.target.value);
				game.saveSettings();
				this.sliderOutput(e.target);
			}
			if (e.target.dataset.tuning) {
				const key = e.target.dataset.tuning;
				game.cfg[key] = Number(e.target.value);
				this.sliderOutput(e.target);
			}
		});
		document.addEventListener("focusin", (e) => {
			if (e.target.dataset.sector) {
				this.g.selectedSector = Number(e.target.dataset.sector);
				this.selectCard();
			}
		});
	}
	glyph(action) {
		const g = this.g;
		if (g.inputMode === "touch") return "";
		const text =
			(g.inputMode === "pad" ? (g.settings.glyphs === "xbox" ? XB : PS) : K)[
				action
			] || action;
		return `<span class="glyph ${["✕", "○", "□", "△", "A", "B", "X", "Y"].includes(text) ? "circle" : ""}">${text}</span>`;
	}
	refreshPrompts() {
		document.querySelectorAll("[data-glyph]").forEach((e) => {
			e.innerHTML = this.glyph(e.dataset.glyph);
		});
		const prompts = [
			["fire", this.g.inputMode === "keyboard" ? "Fire / click" : "Fire"],
			["boost", "Boost"],
			["target", "Target"],
			["nova", "Nova"],
			["chart", "Chart"],
			["jump", "Jump"],
			["pause", "Pause"],
		];
		$("action-prompts").innerHTML = prompts
			.map(([k, t]) => `<span>${this.glyph(k)}${t}</span>`)
			.join("");
		$("title-input").textContent =
			this.g.inputMode === "pad"
				? (this.g.settings.glyphs === "xbox" ? "XBOX" : "PLAYSTATION") +
					" / STANDARD CONTROLLER"
				: this.g.inputMode === "touch"
					? "TOUCH FLIGHT / ASSISTED CANNONS"
					: "MOUSE + KEYBOARD / CONTROLLER READY";
		if (this.page === "help") this.help(false);
	}
	title() {
		this.closeModal();
		$("title-screen").classList.remove("hide");
		this.setGameplay(false);
		$("best-score").textContent = this.g.best
			? "PERSONAL BEST " + String(this.g.best).padStart(5, "0")
			: "PERSONAL BEST —";
		$("title-screen")
			.querySelector("[data-cmd=launch]")
			.focus({ preventScroll: true });
	}
	setGameplay(show) {
		$("title-screen").classList.toggle("hide", show);
		$("hud").classList.toggle("hide", !show);
		for (const id of ["touch-menu", "touch-chart", "touch-nova", "touch-hint"])
			$(id).classList.toggle("hide", !show);
		$("attract-banner").classList.toggle("hide", !show || !this.g.attract);
	}
	blocksSimulation() {
		return !!this.page;
	}
	open(page, title, eyebrow, description, body, footer = "", narrow = false) {
		this.page = page;
		this.g.mouse.active = false;
		this.g.mouse.fire = false;
		this.g.keys.clear();
		this.g.audio.fx("ui");
		$("modal").innerHTML =
			`<div class="modal-card ${narrow ? "narrow" : ""}"><div class="modal-head"><div><div class="eyebrow">${eyebrow}</div><h2>${title}</h2>${description ? `<p>${description}</p>` : ""}</div><button class="close-button" data-cmd="back" aria-label="Back">${this.glyph("back") || "×"}</button></div><div class="modal-body">${body}</div><div class="modal-footer"><span>${this.glyph("accept")}Select &nbsp; ${this.glyph("back")}Back</span>${footer}</div></div>`;
		$("modal").classList.remove("hide");
		requestAnimationFrame(() => {
			const primary =
				$("modal").querySelector("[data-focus]") ||
				$("modal").querySelector(
					".modal-body button,.modal-body input,.close-button",
				);
			primary?.focus({ preventScroll: true });
		});
	}
	closeModal() {
		this.page = null;
		$("modal").classList.add("hide");
		$("modal").innerHTML = "";
		this.g.mouse.active = false;
		this.g.mouse.fire = false;
		this.g.keys.clear();
		if (document.activeElement instanceof HTMLElement)
			document.activeElement.blur();
	}
	pause() {
		if (this.g.state !== "playing" || this.g.hubEnded) return;
		this.parent = "pause";
		this.open(
			"pause",
			"Watch on hold",
			"PATROL 082 / FLIGHT CONTROL",
			"Your ship is holding position.",
			`<div class="button-stack"><button class="menu-primary" data-cmd="resume" data-focus>Resume patrol <span>↗</span></button><button class="menu-secondary" data-cmd="help">Flight briefing</button><button class="menu-secondary" data-cmd="settings">Settings</button>${!this.g.hubActive ? '<button class="menu-secondary" data-cmd="dev">Flight lab <span class="sub">DEV MODE</span></button>' : ""}<button class="menu-secondary" data-cmd="about">About & credits</button>${!this.g.hubActive ? '<button class="text-button" data-cmd="title">End patrol & return to title</button>' : ""}</div>`,
			'<span class="mono">STAY SHARP, PILOT.</span>',
			true,
		);
	}
	back() {
		if (!this.page) {
			if (this.g.state === "playing") this.pause();
			return;
		}
		if (this.page === "pause" || this.page === "chart") {
			this.closeModal();
			return;
		}
		if (this.page === "dev") {
			this.pause();
			return;
		}
		if (this.page === "debrief") {
			this.g.toTitle();
			return;
		}
		if (this.parent === "pause" && this.g.state === "playing") this.pause();
		else {
			this.closeModal();
			$("title-screen")
				.querySelector("[data-cmd=launch]")
				?.focus({ preventScroll: true });
		}
	}
	help(setParent = true) {
		if (setParent) this.parent = this.g.state === "playing" ? "pause" : null;
		const pad = this.g.inputMode === "pad";
		const rows = pad
			? [
					["Thrust / strafe", "Left stick"],
					["Steer", "Right stick"],
					["Twin cannons", "R2 / RT"],
					["Boost", "L2 / LT"],
					["Shields", this.glyph("shield")],
					["Nova / clears torpedoes", this.glyph("nova")],
					["Target next contact", this.glyph("target")],
					["Dock / recover energy", this.glyph("interact")],
					["Sector chart", this.glyph("chart")],
					["Jump to chart selection", this.glyph("jump")],
					["Cockpit / chase camera", this.glyph("camera")],
					["Pause", this.glyph("pause")],
				]
			: [
					["Steer", "Mouse / arrow keys"],
					["Thrust / strafe", "W S / A D"],
					["Twin cannons", "Click / Space"],
					["Boost", "Shift"],
					["Shields / roll", "C / Q E"],
					["Nova / clears torpedoes", "X"],
					["Target next contact", "T / Tab"],
					["Dock / recover energy", "F"],
					["Sector chart", "M"],
					["Jump to chart selection", "J"],
					["Cockpit / chase camera", "V"],
					["Pause", "Esc"],
				];
		this.open(
			"help",
			"Know your ship",
			"FLIGHT BRIEFING / READ BEFORE IGNITION",
			"Protect Kestrel. Clear sectors 01–03. Destroy the Crown. Come home.",
			`<div class="control-grid">${rows.map(([a, b]) => `<div class="control-row"><span>${a}</span><b>${b}</b></div>`).join("")}</div><div class="instruction-cards"><div class="instruction-card"><strong>01 / Fly & fight</strong><p>Steer the centre reticle onto a contact. Cannons lead a locked target inside the aiming brackets. Boost to close the gap; pull thrust back to turn in place. Your throttle stays where you leave it.</p></div><div class="instruction-card"><strong>02 / Watch your energy</strong><p>Weapons, shields and jumps use energy. Wrecks leave cyan energy cells. Approach a cell to collect it, or use the tractor nearby. The reserve reactor prevents a stranded ship. Novas cost 18 EU.</p></div><div class="instruction-card"><strong>03 / Bring it home</strong><p>Clear the hostiles before docking. Approach the cyan station ring, slow below 90 m/s and dock to repair, refuel and rearm. The Crown has two exposed relays; its core is invulnerable until both are destroyed.</p></div></div><p class="tiny">TOUCH: left half thrust/strafe; right half steer. Targeting, shields and fire are assisted. Context actions appear when useful. &nbsp; WINGMATES: each pilot flies an independent operation; holograms show nearby pilots. Highest patrol score wins.</p>`,
			"<span>Shields regenerate after 3 seconds without a hit.</span>",
		);
	}
	chart() {
		if (this.g.state !== "playing" || this.g.jump || this.g.docking) return;
		this.parent = null;
		const g = this.g;
		const body = `<div class="chart-grid">${g.campaign
			.map((s, i) => {
				const locked = !g.unlocked(i);
				const contacts = s.enemies.filter((e) => !e.dead).length;
				return `<button class="sector-card ${g.selectedSector === i ? "selected" : ""}" data-cmd="select" data-value="${i}" data-sector="${i}" ${g.selectedSector === i ? "data-focus" : ""}><span class="sector-id">SECTOR ${String(i + 1).padStart(2, "0")} ${i === g.sector ? " / YOU ARE HERE" : ""}</span><span class="sector-symbol">${s.symbol}</span><strong>${s.name.toUpperCase()}</strong><span class="sector-type">${s.type}</span><span class="sector-status">${locked ? "SIGNAL MASKED / CLEAR 01–03" : contacts ? contacts + " HOSTILE CONTACT" + (contacts === 1 ? "" : "S") : s.station ? "DOCK AVAILABLE" : "SECTOR SECURED"}</span></button>`;
			})
			.join(
				"",
			)}</div><div class="chart-status"><span>STARBASE INTEGRITY <strong>${Math.ceil(g.baseHull)}%</strong></span><span>ENERGY <strong>${Math.floor(g.player.energy)} EU</strong> &nbsp; / &nbsp; JUMP 12 EU</span></div><button class="menu-primary" data-cmd="jump" style="width:100%">${this.glyph("jump")}Engage hyperspace <span id="jump-destination">${g.campaign[g.selectedSector].name} ↗</span></button>`;
		this.open(
			"chart",
			"The patrol chart",
			"NAVIGATION / SIX SECTORS",
			"Select a sector, then engage hyperspace. A jump costs 12 energy.",
			body,
			'<span class="mono">NO ROAD. NO PROBLEM.</span>',
		);
	}
	selectCard() {
		if (this.page !== "chart") return;
		document.querySelectorAll("[data-sector]").forEach((e) => {
			e.classList.toggle(
				"selected",
				Number(e.dataset.sector) === this.g.selectedSector,
			);
		});
		$("jump-destination").textContent =
			this.g.campaign[this.g.selectedSector].name + " ↗";
	}
	slider(name, label, value, min, max, step, kind = "setting", suffix = "") {
		return `<div class="setting"><label>${label}<span data-output="${name}">${kind === "setting" && step < 1 ? Math.round(value * 100) + "%" : value}${suffix}</span></label><input aria-label="${label}" data-${kind}="${name}" data-kind="${kind}" data-suffix="${suffix}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"></div>`;
	}
	sliderOutput(input) {
		const el = document.querySelector(
			`[data-output="${input.dataset.setting || input.dataset.tuning}"]`,
		);
		if (el)
			el.textContent =
				input.dataset.kind === "setting" && Number(input.step) < 1
					? Math.round(Number(input.value) * 100) + "%"
					: input.value + (input.dataset.suffix || "");
	}
	settings() {
		this.parent = this.g.state === "playing" ? "pause" : null;
		const s = this.g.settings;
		this.open(
			"settings",
			"Make it yours",
			"SHIP CONFIGURATION / SAVED LOCALLY",
			"The same cockpit, whether you fly by stick, mouse or touch.",
			`<div class="options-grid">${this.slider("master", "Master volume", s.master, 0, 1, 0.05)}${this.slider("music", "Music volume", s.music, 0, 1, 0.05)}${this.slider("sfx", "Effects & radio", s.sfx, 0, 1, 0.05)}${this.slider("sensitivity", "Steering sensitivity", s.sensitivity, 0.3, 2, 0.1)}<button class="toggle" data-cmd="glyphs">Controller prompts <b>${s.glyphs === "ps" ? "PlayStation" : "Xbox"}</b></button><button class="toggle" data-cmd="invert">Invert vertical steering <b>${s.invert ? "On" : "Off"}</b></button><button class="toggle" data-cmd="shake">Cockpit shake <b>${s.shake ? "On" : "Off"}</b></button><button class="toggle" data-cmd="fullscreen">Display <b>Fullscreen ↗</b></button></div><p class="tiny">Music starts at 10%. Controller prompts follow the last input. Touch flight uses invisible sticks and assisted weapons. Browsers may require a tap before sound can begin.</p>`,
			'<button class="text-button" data-cmd="resetSettings">Restore defaults</button>',
		);
	}
	dev() {
		if (this.g.hubActive) return;
		const g = this.g;
		const sliders = [
			["damage", "Cannon damage", 10, 100, 1],
			["enemyDamage", "Enemy damage", 1, 40, 1],
			["aggression", "Enemy aggression", 0.1, 3, 0.1],
			["speed", "Cruise speed", 50, 350, 5],
			["fireInterval", "Cannon interval", 0.06, 0.5, 0.01],
			["energyDrain", "Energy consumption", 0, 3, 0.1],
			["jumpTime", "Jump duration", 0.5, 6, 0.1],
		];
		this.open(
			"dev",
			"The flight lab",
			"DEVELOPER MODE / LIVE TUNING",
			"Changes take effect immediately. Your operation is held while this panel is open.",
			`<div class="dev-grid"><div>${sliders.map(([k, l, min, max, step]) => this.slider(k, l, g.cfg[k], min, max, step, "tuning")).join("")}</div><div class="dev-actions"><button class="small-button" data-cmd="invincible">Invulnerability: ${g.devInvincible ? "ON" : "OFF"}</button><button class="small-button" data-cmd="refill">Repair / refill / rearm</button><button class="small-button" data-cmd="clearSector">Clear current sector</button><button class="small-button" data-cmd="unlock">Reveal command sector</button><button class="small-button" data-cmd="spawn">Spawn interceptor</button><button class="small-button" data-cmd="home">Return to Kestrel dock</button><button class="small-button" data-cmd="autopilot">Autopilot: ${g.ai ? "ON" : "OFF"}</button><button class="small-button" data-cmd="win">Complete operation</button><button class="small-button" data-cmd="resetTuning">Reset tuning defaults</button><button class="small-button" data-cmd="resetRun">Restart operation</button><div class="dev-info mono">RENDERER ${esc(g.backend)} / THREE r${THREE.REVISION}<br>RAPIER 0.19.3 / FIXED STEP 1/60<br>SEED ${g.configSeed} / BODIES ${g.world.bodies.len()}<br>RAPIER HITS ${g.stats.rapierHits} / SHOTS ${g.stats.shots}<br>SIMULATION ${g.elapsed.toFixed(1)} s / SECTOR ${g.sector + 1}</div></div></div>`,
			"<span>Testing tools affect this patrol’s score.</span>",
		);
	}
	about(tab = this.aboutTab) {
		this.aboutTab = tab;
		this.parent = this.g.state === "playing" ? "pause" : null;
		let body;
		if (tab === "source") {
			const labels = {
				date: "Date",
				source: "Source",
				plan: "Plan",
				genre: "Genre",
				perspective: "Perspective",
				tech: "Tech",
				artDirection: "Art Direction",
				animation: "Animation",
				audio: "Audio",
				online: "Online",
				testing: "Testing",
				research: "Research",
				environment: "Environment",
				model: "Model",
				usage: "Usage",
			};
			body = `<div class="credits-grid">${Object.entries(
				metadata.sourceInformation,
			)
				.map(([k, v]) => `<b>${labels[k] || k}</b><span>${esc(v)}</span>`)
				.join("")}</div>`;
		} else {
			const values = metadata[tab + "Feedback"];
			body = `<div class="feedback">${QUESTIONS[tab].map((q, i) => `<p><strong>${q}</strong>${esc(values[i])}</p>`).join("")}</div>`;
		}
		this.open(
			"about",
			"Behind the canopy",
			"ABOUT / CREDITS / FIELD NOTES",
			"An original deep-space patrol inspired by Star Raiders (1982). All art and audio made in code.",
			`<div class="tabs">${[
				["source", "Source Information"],
				["testing", "Testing Feedback"],
				["engine", "Engine Feedback"],
				["prompt", "Prompt Feedback"],
			]
				.map(
					([key, label]) =>
						`<button class="${key === tab ? "active" : ""}" data-cmd="aboutTab" data-value="${key}">${label}</button>`,
				)
				.join("")}</div>${body}`,
			'<span class="mono">THREE.JS · MIT / RAPIER · APACHE-2.0</span>',
		);
	}
	debrief(won) {
		const g = this.g;
		this.parent = null;
		const rank = won
			? g.player.hp > 70 && g.baseHull > 80
				? "STAR COMMANDER"
				: "PATROL COMMANDER"
			: "SURVIVING RECORD";
		this.open(
			"debrief",
			won ? "The lanes are ours." : "End of the watch.",
			`PATROL DEBRIEF / ${rank}`,
			won
				? "Crown destroyed. Kestrel secured. Pilot accounted for."
				: "Your flight record has been recovered.",
			`<p class="debrief-copy">${won ? "Kestrel sends its thanks. The maintenance crew sends a bill. There will be another watch, another alarm, another very large sky. For now: stand down, commander." : g.player.hp <= 0 ? "Your ship went silent before the patrol was complete. Next time, collect wreck energy, keep your shields on and use the starbases. The void will wait for you." : "Flight control has closed the operation. Every contact you stopped bought Kestrel another moment. The next patrol starts with a fresh ship."}</p><div class="debrief-stats">${[
				["PATROL SCORE", String(g.score).padStart(5, "0")],
				["CONTACTS", g.stats.kills],
				["STARBASE", Math.ceil(g.baseHull) + "%"],
				[
					"FLIGHT TIME",
					Math.floor(g.elapsed / 60) +
						":" +
						String(Math.floor(g.elapsed % 60)).padStart(2, "0"),
				],
			]
				.map(
					([label, value]) =>
						`<div class="debrief-stat"><small>${label}</small><strong>${value}</strong></div>`,
				)
				.join(
					"",
				)}</div><div class="button-stack"><button class="menu-primary" data-cmd="launch" data-focus>Take another watch <span>↗</span></button><button class="menu-secondary" data-cmd="title">Return to title</button></div>`,
			'<span class="mono">GOOD WORK, PILOT.</span>',
		);
	}
	network() {
		this.parent = null;
		this.open(
			"network",
			"A wingmate on watch",
			"WINGMATE LINK / TWO-PILOT PATROL RACE",
			"Two independent patrols, one shared sky. Holograms never collide. Highest score wins.",
			`<div class="net-columns"><div class="net-panel"><h3>01 / Open a link</h3><p>First pilot: create an offer. Share its code, then paste your wingmate’s reply on the right and connect.</p><button class="menu-primary" data-cmd="offer">Create offer code <span>↗</span></button><textarea class="codebox" id="net-output" readonly aria-label="Your generated link code" spellcheck="false"></textarea><button class="small-button" data-cmd="copyCode">Copy generated code</button></div><div class="net-panel"><h3>02 / Answer the watch</h3><p>Second pilot: paste the offer and create a reply. Send that reply back to the first pilot. The first pilot pastes it here and connects.</p><textarea class="codebox" id="net-input" aria-label="Paste wingmate link code" spellcheck="false"></textarea><button class="small-button" data-cmd="answer">Join offer / create reply code</button><button class="small-button" data-cmd="finishLink">Connect using reply code</button></div></div><div class="net-status" id="net-status"></div><div class="button-stack"><button class="menu-primary" data-cmd="launchLinked" id="launch-linked" disabled>Launch linked patrol <span>↗</span></button><button class="text-button" data-cmd="localLink">Same browser? Use local tab link</button></div><p class="tiny">Direct WebRTC, no account or game server. Some networks block peer connections. Copy codes again if a link expires. AI Hub handles invites and networking automatically for up to four pilots.</p>`,
			'<button class="text-button" data-cmd="disconnect">Disconnect wingmate</button>',
		);
		this.refreshNetwork();
	}
	refreshNetwork() {
		if (this.page !== "network") return;
		$("net-status").textContent = this.g.net.status;
		$("launch-linked").disabled = !this.g.net.connected;
	}
	async command(cmd, value) {
		const g = this.g;
		if (g.hubEnded) return;
		switch (cmd) {
			case "launch":
				if (!g.hubActive) g.start();
				break;
			case "launchLinked":
				g.net.launch();
				break;
			case "help":
				this.help();
				break;
			case "settings":
				this.settings();
				break;
			case "about":
				this.about();
				break;
			case "aboutTab":
				this.about(value);
				break;
			case "network":
				if (!g.hubActive) this.network();
				break;
			case "back":
				this.back();
				break;
			case "pause":
				this.pause();
				break;
			case "resume":
				this.closeModal();
				break;
			case "title":
				g.toTitle();
				break;
			case "chart":
				if (this.page === "chart") this.closeModal();
				else this.chart();
				break;
			case "select":
				g.selectedSector = Number(value);
				this.selectCard();
				break;
			case "jump":
				g.jumpTo();
				break;
			case "target":
				g.cycleTarget();
				break;
			case "shield":
				g.toggleShield();
				break;
			case "nova":
				g.nova();
				break;
			case "interact":
				g.interact();
				break;
			case "camera":
				g.chase = !g.chase;
				g.audio.fx("ui");
				break;
			case "fullscreen":
				try {
					if (document.fullscreenElement) await document.exitFullscreen();
					else await document.documentElement.requestFullscreen();
				} catch {
					this.notice("Fullscreen is unavailable in this browser.", 3);
				}
				break;
			case "glyphs":
				g.settings.glyphs = g.settings.glyphs === "ps" ? "xbox" : "ps";
				g.saveSettings();
				this.settings();
				this.refreshPrompts();
				break;
			case "invert":
				g.settings.invert = !g.settings.invert;
				g.saveSettings();
				this.settings();
				break;
			case "shake":
				g.settings.shake = !g.settings.shake;
				g.saveSettings();
				this.settings();
				break;
			case "resetSettings":
				Object.assign(g.settings, {
					master: 0.65,
					music: 0.1,
					sfx: 0.65,
					sensitivity: 1,
					glyphs: "ps",
					invert: false,
					shake: true,
				});
				g.saveSettings();
				this.settings();
				break;
			case "dev":
				this.dev();
				break;
			case "invincible":
				g.devInvincible = !g.devInvincible;
				this.dev();
				break;
			case "refill":
				g.player.hp = g.player.shield = g.player.energy = 100;
				g.player.nova = 3;
				this.notice("Ship restored.", 2);
				break;
			case "clearSector":
				for (const e of g.enemies.filter((x) => x.kind === "relay"))
					g.damageEnemy(e, 100000);
				for (const e of g.enemies) if (e.alive) g.damageEnemy(e, 100000);
				this.notice("Current sector cleared.", 2);
				break;
			case "unlock":
				for (const s of g.campaign.slice(0, 3)) s.cleared = true;
				this.notice("Command sector revealed.", 2);
				break;
			case "spawn": {
				const s = g.campaign[g.sector];
				s.enemies.push({
					id: g.sector * 100 + 60 + s.enemies.length,
					kind: "fighter",
					hp: 64,
					maxHp: 64,
					dead: false,
				});
				s.cleared = false;
				g.loadSector(g.sector);
				this.notice("Interceptor added. Flight position reset.", 3);
				break;
			}
			case "home":
				g.loadSector(0);
				g.player.pos.copy(g.dockPos);
				g.playerBody.setTranslation(g.dockPos, true);
				g.player.throttle = 0;
				this.notice("Returned to Kestrel approach.", 2);
				break;
			case "autopilot":
				g.ai = !g.ai;
				this.dev();
				break;
			case "win":
				for (const s of g.campaign) {
					s.cleared = true;
					for (const e of s.enemies) e.dead = true;
				}
				g.bossDefeated = true;
				this.closeModal();
				g.loadSector(0);
				g.player.pos.copy(g.dockPos);
				g.playerBody.setTranslation(g.dockPos, true);
				g.playerBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
				g.player.throttle = 0;
				g.interact();
				break;
			case "resetTuning":
				Object.assign(g.cfg, this.defaults);
				this.dev();
				break;
			case "resetRun":
				g.start();
				break;
			case "offer":
			case "answer":
			case "finishLink":
				try {
					let code;
					if (cmd === "offer") code = await g.net.offer();
					if (cmd === "answer") code = await g.net.answer($("net-input").value);
					if (cmd === "finishLink") await g.net.finish($("net-input").value);
					if (code && $("net-output")) $("net-output").value = code;
				} catch (e) {
					g.net.changed(e.message);
				}
				break;
			case "copyCode": {
				const output = $("net-output");
				if (!output?.value) {
					this.notice("Create an offer or reply first.", 2);
					break;
				}
				try {
					await navigator.clipboard.writeText(output.value);
					this.notice("Code copied.", 2);
				} catch {
					output.focus();
					output.select();
					document.execCommand("copy");
					this.notice("Code selected. Use your device’s copy command.", 3);
				}
				break;
			}
			case "localLink":
				g.net.local();
				break;
			case "disconnect":
				g.net.close();
				g.net.changed("Wingmate disconnected.");
				break;
		}
	}
	focusables() {
		const root = this.page ? $("modal") : $("title-screen");
		return [
			...root.querySelectorAll(
				"button:not(:disabled),input:not(:disabled),textarea",
			),
		].filter((el) => el.getClientRects().length > 0);
	}
	navigate(dx, dy) {
		const list = this.focusables();
		if (!list.length) return;
		const current = document.activeElement;
		let index = list.indexOf(current);
		if (current?.type === "range" && dx) {
			const step = Number(current.step);
			current.value = Number(current.value) + step * dx;
			current.dispatchEvent(new Event("input", { bubbles: true }));
			return;
		}
		if (this.page === "chart" && current?.dataset.sector && dy) {
			const sector = (Number(current.dataset.sector) + dy * 3 + 6) % 6;
			const next = document.querySelector(`[data-sector="${sector}"]`);
			next?.focus();
			return;
		}
		const move = dy || dx || 1;
		index = (index + move + list.length) % list.length;
		list[index].focus();
		list[index].scrollIntoView({ block: "nearest" });
	}
	activate() {
		const a = document.activeElement;
		if (a?.tagName === "BUTTON") a.click();
		else this.focusables()[0]?.focus();
	}
	key(code) {
		if (code === "Enter" || code === "Space") this.activate();
		if (code === "ArrowUp") this.navigate(0, -1);
		if (code === "ArrowDown") this.navigate(0, 1);
		if (code === "ArrowLeft") this.navigate(-1, 0);
		if (code === "ArrowRight") this.navigate(1, 0);
	}
	comms(text, duration = 6) {
		$("comms-text").textContent = text;
		$("comms").classList.remove("hide");
		this.commTime = duration;
		this.radioLine = (this.radioLine || 0) + 1;
		this.g.audio.say(this.radioLine % 6);
	}
	notice(text, duration = 3) {
		$("notice").textContent = text;
		$("notice").classList.remove("hide");
		this.noticeTime = duration;
	}
	tick(dt) {
		this.commTime -= dt;
		if (this.commTime <= 0) $("comms").classList.add("hide");
		this.noticeTime -= dt;
		if (this.noticeTime <= 0) $("notice").classList.add("hide");
		this.damage = Math.max(0, this.damage - dt * 1.8);
		$("damage-flash").style.opacity = this.damage * 0.7;
		const j = this.g.jump;
		$("jump-overlay").style.opacity = j
			? Math.sin((1 - j.time / j.max) * Math.PI) * 0.75
			: 0;
		$("jump-text").classList.toggle("hide", !j);
		if (j) {
			$("jump-name").textContent = this.g.campaign[j.to].name;
			$("jump-count").textContent =
				"SPOOLING " +
				Math.max(0, j.time).toFixed(1) +
				" / KEEP YOUR HANDS INSIDE THE UNIVERSE";
		}
		if (this.g.docking) {
			$("context-action").textContent =
				"DOCKING / REPAIR " +
				Math.round((1 - this.g.docking.time / 2.5) * 100) +
				"%";
		}
	}
	update() {
		const g = this.g;
		if (!g.player) return;
		const p = g.player,
			s = g.campaign[g.sector];
		$("sector-name").textContent =
			String(g.sector + 1).padStart(2, "0") + " / " + s.name.toUpperCase();
		$("sector-type").textContent = s.type;
		$("hud-score").textContent = String(g.score).padStart(5, "0");
		const alive = g.enemies.filter((e) => e.alive);
		$("contacts").textContent = alive.length
			? alive.length + " HOSTILE CONTACT" + (alive.length === 1 ? "" : "S")
			: "SECTOR SECURED";
		for (const [key, val] of [
			["hull", p.hp],
			["shield", p.shield],
			["energy", p.energy],
		]) {
			$(key + "-value").textContent = Math.ceil(val);
			$(key + "-meter").style.width = Math.max(0, val) + "%";
		}
		$("shield-state").textContent = p.shields ? "ON" : "OFF";
		$("shield-meter").style.opacity = p.shields ? 1 : 0.25;
		$("speed").textContent = g.playerBody
			? Math.round(
					new THREE.Vector3(...Object.values(g.playerBody.linvel())).length(),
				)
					.toString()
					.padStart(2, "0")
			: "00";
		$("throttle").textContent = "THRUST " + Math.round(p.throttle * 100) + "%";
		const heading = ((Math.round((-p.yaw * 180) / Math.PI) % 360) + 360) % 360;
		$("heading-tape").textContent =
			"PORT · " + String(heading).padStart(3, "0") + " · STARBOARD";
		let objective;
		if (g.bossDefeated)
			objective =
				"Return to Kestrel (01). Approach the cyan ring and dock to finish your patrol.";
		else if (s.boss)
			objective = alive.some((e) => e.kind === "relay")
				? "Destroy both cyan shield relays. The command core is protected."
				: "The shield is down. Destroy the Crown command core.";
		else if (alive.length && s.required)
			objective = `Eliminate ${alive.length} raider${alive.length === 1 ? "" : "s"}. Starbase integrity ${Math.ceil(g.baseHull)}%.`;
		else if (g.campaign.slice(0, 3).every((s) => s.cleared))
			objective = "Crown signal located. Chart a jump to Broken Crown (05).";
		else if (s.id === 5)
			objective = "Recover cyan energy caches. Mines detonate at close range.";
		else if (s.station)
			objective =
				"Dock for repairs, or chart a jump to the next hostile sector.";
		else
			objective =
				"Sector secured. Recover wreck energy, then chart your next jump.";
		$("objective-text").textContent = objective;
		const t = g.target?.alive ? g.target : null;
		const names = {
			fighter: "RAVEL INTERCEPTOR",
			bomber: "BRIGAND BOMBER",
			boss: "CROWN / COMMAND CORE",
			relay: "CROWN / SHIELD RELAY",
			mine: "DRIFT MINE",
		};
		$("target-name").textContent = t
			? names[t.kind]
			: s.station
				? "FRIENDLY STARBASE"
				: "NO HOSTILE LOCK";
		$("target-category").textContent =
			p.hp < 35
				? "WEAPONS DAMAGED / REFIT ADVISED"
				: p.heat > 0.82
					? "CANNON HEAT / RELEASE TO COOL"
					: "TARGET COMPUTER / " + (t ? "LOCKED" : "SCANNING");
		$("target-range").textContent = t
			? Math.round(t.pos.distanceTo(p.pos)) + " m"
			: g.stationPos
				? Math.round(g.stationPos.distanceTo(p.pos)) + " m"
				: "CLEAR SKY";
		$("target-hp").textContent = t
			? Math.ceil((t.hp / t.maxHp) * 100) + "% HULL"
			: p.nova + " NOVAS";
		$("target-meter").style.width = t
			? Math.max(0, (t.hp / t.maxHp) * 100) + "%"
			: "0%";
		const action = g.interaction();
		$("context-action").classList.toggle("hide", !action || g.attract);
		if (action && !g.docking)
			$("context-action").innerHTML =
				this.glyph("interact") + esc(action.label);
		$("touch-nova").textContent = "Nova × " + p.nova;
		$("touch-nova").classList.toggle(
			"hide",
			g.state !== "playing" || alive.length === 0 || p.nova === 0,
		);
		const blips = [];
		const inv = p.q.clone().invert();
		for (const e of alive) {
			const v = e.pos.clone().sub(p.pos).applyQuaternion(inv);
			let x = (v.x / 1000) * 46,
				y = (v.z / 1000) * 46;
			const r = Math.hypot(x, y);
			if (r > 45) {
				x *= 45 / r;
				y *= 45 / r;
			}
			blips.push(
				`<i class="radar-dot ${e === t ? "selected" : ""}" style="left:${50 + x}%;top:${50 + y}%"></i>`,
			);
		}
		if (g.stationPos) {
			const v = g.stationPos.clone().sub(p.pos).applyQuaternion(inv);
			blips.push(
				`<i class="radar-dot friend" style="left:${50 + THREE.MathUtils.clamp((v.x / 1000) * 46, -44, 44)}%;top:${50 + THREE.MathUtils.clamp((v.z / 1000) * 46, -44, 44)}%"></i>`,
			);
		}
		$("blips").innerHTML = blips.join("");
		const wing = $("wingmate-hud");
		wing.classList.toggle("hide", !g.ghosts.size);
		wing.replaceChildren();
		for (const pilot of g.ghosts.values()) {
			const row = document.createElement("div"),
				name = document.createElement("strong");
			name.textContent = pilot.name;
			name.style.color = pilot.color;
			row.append(
				name,
				document.createTextNode(
					String(pilot.score).padStart(5, "0") +
						" / " +
						(pilot.sector === g.sector
							? "IN YOUR SECTOR"
							: "SECTOR " + (pilot.sector + 1)),
				),
			);
			wing.append(row);
		}
		this.drawHud();
	}
	resize() {
		const c = $("hud-canvas"),
			d = Math.min(devicePixelRatio, 2);
		c.width = innerWidth * d;
		c.height = innerHeight * d;
		this.hudCtx.setTransform(d, 0, 0, d, 0, 0);
	}
	drawHud() {
		const ctx = this.hudCtx,
			g = this.g,
			w = innerWidth,
			h = innerHeight;
		ctx.clearRect(0, 0, w, h);
		if (g.state !== "playing" || this.page) return;
		const project = (v) => {
			const relative = v.clone().sub(g.camera.position),
				front =
					relative.dot(
						new THREE.Vector3(0, 0, -1).applyQuaternion(g.camera.quaternion),
					) > 0;
			const p = v.clone().project(g.camera);
			return {
				x: (p.x * 0.5 + 0.5) * w,
				y: (-p.y * 0.5 + 0.5) * h,
				front,
				z: p.z,
			};
		};
		for (const e of g.enemies) {
			if (!e.alive) continue;
			const p = project(e.pos);
			const selected = e === g.target,
				color = selected ? "#ffdf78" : "#e18d7b";
			ctx.strokeStyle = color;
			ctx.fillStyle = color;
			ctx.lineWidth = selected ? 2 : 1;
			if (
				p.front &&
				p.x > w * 0.09 &&
				p.x < w * 0.91 &&
				p.y > h * 0.12 &&
				p.y < h * 0.78
			) {
				const dist = e.pos.distanceTo(g.player.pos),
					size = THREE.MathUtils.clamp(
						(e.radius / dist) * h * 0.9,
						selected ? 22 : 14,
						e.kind === "boss" ? 100 : 55,
					);
				ctx.beginPath();
				for (const [sx, sy] of [
					[-1, -1],
					[1, -1],
					[-1, 1],
					[1, 1],
				]) {
					ctx.moveTo(p.x + sx * size, p.y + sy * (size - 8));
					ctx.lineTo(p.x + sx * size, p.y + sy * size);
					ctx.lineTo(p.x + sx * (size - 8), p.y + sy * size);
				}
				ctx.stroke();
				if (selected) {
					ctx.font = `bold ${Math.max(11, w * 0.008)}px Courier New`;
					ctx.fillText(Math.round(dist) + " m", p.x + size + 8, p.y - 4);
					const lead = project(
						e.pos.clone().addScaledVector(e.vel, dist / 680),
					);
					if (lead.front) {
						ctx.strokeStyle = "#8bdaca";
						ctx.beginPath();
						ctx.arc(lead.x, lead.y, 5, 0, Math.PI * 2);
						ctx.stroke();
						ctx.setLineDash([3, 5]);
						ctx.beginPath();
						ctx.moveTo(p.x, p.y);
						ctx.lineTo(lead.x, lead.y);
						ctx.stroke();
						ctx.setLineDash([]);
					}
				}
			} else if (selected) {
				const dir = e.pos
					.clone()
					.sub(g.camera.position)
					.applyQuaternion(g.camera.quaternion.clone().invert());
				let x = dir.x,
					y = -dir.y;
				if (dir.z > 0) {
					x = Math.abs(x) < 1 ? 0.1 : x;
					y += h * 0.05;
				}
				const angle = Math.atan2(y, x),
					cx = w * 0.5 + Math.cos(angle) * w * 0.37,
					cy = h * 0.5 + Math.sin(angle) * h * 0.28;
				ctx.save();
				ctx.translate(cx, cy);
				ctx.rotate(angle);
				ctx.beginPath();
				ctx.moveTo(12, 0);
				ctx.lineTo(-5, -7);
				ctx.lineTo(-5, 7);
				ctx.closePath();
				ctx.fill();
				ctx.restore();
				ctx.font = "bold 12px Courier New";
				ctx.fillText("TARGET", cx + 16, cy + 4);
			}
		}
		if (g.dockPos) {
			const p = project(g.dockPos);
			if (p.front && p.x > 30 && p.x < w - 30 && p.y > 80 && p.y < h - 120) {
				ctx.strokeStyle = "#8bdaca";
				ctx.fillStyle = "#8bdaca";
				ctx.lineWidth = 1;
				ctx.beginPath();
				ctx.moveTo(p.x, p.y - 18);
				ctx.lineTo(p.x + 18, p.y);
				ctx.lineTo(p.x, p.y + 18);
				ctx.lineTo(p.x - 18, p.y);
				ctx.closePath();
				ctx.stroke();
				ctx.font = "bold 11px Courier New";
				ctx.fillText(
					"DOCK / " + Math.round(g.dockPos.distanceTo(g.player.pos)) + " m",
					p.x + 25,
					p.y + 3,
				);
			}
		}
		for (const item of g.pickups) {
			if (item.taken) continue;
			const p = project(item.pos);
			if (!p.front) continue;
			ctx.strokeStyle = "#8bdaca88";
			ctx.beginPath();
			ctx.moveTo(p.x - 5, p.y);
			ctx.lineTo(p.x + 5, p.y);
			ctx.moveTo(p.x, p.y - 5);
			ctx.lineTo(p.x, p.y + 5);
			ctx.stroke();
		}
		if (g.mouse.active && g.inputMode === "keyboard") {
			const x = w * (0.5 + g.mouse.x * 0.22),
				y = h * (0.5 + g.mouse.y * 0.22);
			ctx.strokeStyle = "#d8dfcd44";
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.arc(x, y, 8, 0, Math.PI * 2);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(w * 0.5, h * 0.5);
			ctx.lineTo(x, y);
			ctx.stroke();
		}
	}
}
