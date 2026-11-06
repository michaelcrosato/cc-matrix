import { DEFAULTS, settingsDefault } from "./mission.js";
const $ = (id) => document.getElementById(id);
const escape = (s) =>
	String(s)
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
const testingQ = [
	"How many issues did testing catch?",
	"How many were critical or game breaking?",
	"Most helpful test?",
	"Least helpful test?",
];
const engineQ = [
	"What did you like most about the engine?",
	"Did you get stuck or guess wrong?",
	"Most important system built yourself?",
	"Hardest part of using the engine?",
	"Engine changes and why?",
	"One engine change you would like?",
];
const promptQ = [
	"What did you like most about this prompt?",
	"What was confusing?",
	"What was the hardest thing to do?",
	"What would you change?",
];
export class Interface {
	constructor(game) {
		this.g = game;
		this.visible = true;
		this.focusIndex = 0;
		this.origin = "title";
		this.netOutput = "";
		this.netInput = "";
		this.netBusy = false;
		this.menu = $("menu");
	}
	glyph(action) {
		const g = this.g,
			pad = g.lastInput === "pad",
			xbox = g.settings.glyphs === "xbox";
		const ps = {
				accept: "×",
				back: "○",
				fire: "R2",
				boost: "L2",
				cable: "×",
				target: "□",
				camera: "△",
				pause: "OPTIONS",
				steer: "L",
			},
			xb = {
				accept: "A",
				back: "B",
				fire: "RT",
				boost: "LT",
				cable: "A",
				target: "X",
				camera: "Y",
				pause: "MENU",
				steer: "L",
			},
			kb = {
				accept: "ENTER",
				back: "ESC",
				fire: "LMB",
				boost: "SHIFT",
				cable: "SPACE",
				target: "Q",
				camera: "C",
				pause: "ESC",
				steer: "WASD",
			};
		return (
			'<span class="glyph ' +
			(pad ? "pad" : "") +
			'">' +
			(pad ? (xbox ? xb : ps)[action] : kb[action]) +
			"</span>"
		);
	}
	button(action, label, detail = "", cls = "") {
		return (
			'<button class="' +
			cls +
			'" data-action="' +
			action +
			'">' +
			label +
			(detail ? '<span class="button-detail">' + detail + "</span>" : "") +
			"</button>"
		);
	}
	title() {
		return (
			'<div class="issue-stamp">A FROZEN-FRONT FLIGHT COMIC<b>ISSUE 01 / FROSTLINE</b></div><main class="menu-content"><span class="eyebrow">ONE LAST SORTIE. THIRTY-EIGHT REASONS.</span><h1 class="title-wordmark">THE EMPIRE<br>STRIKES A<br><span class="pose">POSE.</span></h1><p class="lede">They brought walking fortresses.<br>You brought a very long cable. Keep the sky clear.<br>Get the last transport off the ice.</p><nav class="menu-buttons">' +
			this.button("start", "Launch sortie", "3 CHAPTERS · ~6 MIN") +
			this.button("help", "Flight briefing", "LEARN THE ROPES") +
			this.button("network", "Wing link", "1–4 PILOT ECHOES") +
			'<div class="small-row">' +
			this.button("settings", "Settings") +
			this.button("about", "About & credits") +
			'</div></nav><div class="menu-controls">' +
			this.glyph("accept") +
			" Launch <span>" +
			this.glyph("steer") +
			" Steer · " +
			this.glyph("fire") +
			' Fire</span></div><div class="footer-line">' +
			(this.g.best
				? "BEST SORTIE " + String(this.g.best).padStart(6, "0") + " · "
				: "") +
			"INSPIRED BY THE 1982 SNOW-BATTLE CLASSIC<br>WAIT 10 SECONDS FOR THE FLIGHT RECORDER</div></main>"
		);
	}
	wrap(label, title, body) {
		return (
			'<main class="panel"><span class="eyebrow">' +
			label +
			"</span><h2>" +
			title +
			"</h2>" +
			body +
			"</main>"
		);
	}
	help() {
		const g = this.g;
		if (g.lastInput === "touch")
			return this.wrap(
				"TOUCH FLIGHT MANUAL / ASSISTED CONTROLS",
				"Two thumbs.<br>One cold sky.",
				'<div class="cards"><div class="card"><b>01 / Clear</b><p>Defeat three scouts with your twin cannons.</p></div><div class="card"><b>02 / Tangle</b><p>Approach within 58 metres, tap TOW and fly two guided wraps.</p></div><div class="card"><b>03 / Escape</b><p>Stay within 145 metres of Ark. Defeat its attackers and reach the jump corridor.</p></div></div><h3>Drag anywhere to fly</h3><p><b>Left thumb:</b> drag sideways to steer, up to accelerate and boost, down to brake. The thumb stick appears only while you touch.</p><p><b>Right thumb:</b> drag to aim and fire. Cannons assist automatically when you release your aim; let go to let them cool.</p><p><b>Tow line:</b> tap the TOW circle near a walker. The stabilizer guides your orbit. Steer to change radius, and ease off boost if the orange tension bar rises. Tap CUT to release.</p><p><b>Stay alive:</b> cyan buoys repair 32 hull and cool your cannons. The menu button pauses and opens Settings, the flight briefing and Developer tools. Landscape orientation gives you the widest view.</p><p><b>Wing echoes:</b> other pilots fly independent sorties and compete on score. Their craft cannot collide with yours.</p>' +
					this.button("back", "Back to flight", "", "primary"),
			);
		return this.wrap(
			"FLIGHT MANUAL / READ BEFORE FREEZING",
			"A little nerve.<br>A lot of cable.",
			'<div class="cards"><div class="card"><b>01 / Clear</b><p>Down three scouts. Lead them into your forward firing arc. Gold brackets mark your lock.</p></div><div class="card"><b>02 / Tangle</b><p>Close within 58 m of a walker and launch a tow line. Fly two guided wraps to bring it down.</p></div><div class="card"><b>03 / Escape</b><p>Stay within 145 m of Ark. Defeat the raiders and Blackfin ace, then reach the jump corridor.</p></div></div><h3>Your flight controls</h3><div class="control-row"><span>Steer / throttle</span><span>' +
				this.glyph("steer") +
				(g.lastInput === "pad" ? "LEFT STICK" : "W / S SPEED · A / D TURN") +
				'</span></div><div class="control-row"><span>Fire twin cannons / aim</span><span>' +
				this.glyph("fire") +
				(g.lastInput === "pad" ? "RIGHT STICK AIMS" : "MOUSE AIMS") +
				'</span></div><div class="control-row"><span>Boost / brake</span><span>' +
				this.glyph("boost") +
				(g.lastInput === "pad" ? "R1 BRAKES" : "S BRAKES") +
				'</span></div><div class="control-row"><span>Launch or release tow line</span><span>' +
				this.glyph("cable") +
				'</span></div><div class="control-row"><span>Cycle target / change camera</span><span>' +
				this.glyph("target") +
				this.glyph("camera") +
				"</span></div><p><b>Tow craft:</b> the stabilizer guides your orbit. Steer to change its radius. Boost wraps faster, but strains the line. Release boost when the orange tension bar rises. Cannons can chip armour; cables do the heavy work.</p><p><b>Keep cool:</b> continuous fire overheats the cannons. Stop firing until heat drops below 25. Cyan repair buoys restore 32 hull and clear heat. The radar marks enemies red, walkers square, and Ark gold.</p><p><b>Touch:</b> drag anywhere on the left to steer and throttle; drag on the right to aim. Cannons assist automatically. The TOW button appears near a walker. For the widest view, turn your device sideways.</p><p><b>Wing echoes:</b> friends fly their own identical sortie. You see their craft in the same chapter and compete on score. Echoes cannot collide or damage your world.</p>" +
				this.button("back", "Back to flight", "", "primary"),
		);
	}
	settings() {
		const g = this.g;
		return this.wrap(
			"FLIGHT DECK / PREFERENCES",
			"Make yourself<br>comfortable.",
			this.range("music", "Music", 0, 1, 0.01, g.settings.music, true) +
				this.range("sfx", "Sound effects", 0, 1, 0.01, g.settings.sfx, true) +
				this.range(
					"voice",
					"Gibberish radio voices",
					0,
					1,
					0.01,
					g.settings.voice,
					true,
				) +
				this.row(
					"glyphs",
					"Controller prompts",
					g.settings.glyphs === "ps"
						? "PlayStation · × ○ □ △"
						: "Xbox · A B X Y",
				) +
				this.row(
					"camera",
					"Camera",
					g.settings.camera === "chase" ? "Chase" : "Tactical",
				) +
				this.row(
					"aimAssist",
					"Cannon aim assist",
					g.settings.aimAssist ? "On" : "Off",
				) +
				this.row(
					"shake",
					"Impact camera shake",
					g.settings.shake ? "On" : "Off",
				) +
				this.range(
					"sensitivity",
					"Steering sensitivity",
					0.5,
					1.8,
					0.1,
					g.settings.sensitivity,
				) +
				this.button(
					"fullscreen",
					document.fullscreenElement ? "Leave fullscreen" : "Enter fullscreen",
				) +
				this.button("settingsReset", "Reset preferences") +
				this.button("back", "Back", "", "primary"),
		);
	}
	row(key, label, value) {
		return (
			'<button class="row-button" data-action="setting:' +
			key +
			'"><span>' +
			label +
			"</span><span>" +
			value +
			"</span></button>"
		);
	}
	range(key, label, min, max, step, value, percent = false, balance = false) {
		return (
			'<label class="setting"><span class="label">' +
			label +
			'<output id="out-' +
			key +
			'">' +
			(percent
				? Math.round(value * 100) + "%"
				: Number(value).toFixed(step < 1 ? 1 : 0)) +
			'</output></span><input aria-label="' +
			label +
			'" type="range" data-' +
			(balance ? "balance" : "setting") +
			'="' +
			key +
			'" min="' +
			min +
			'" max="' +
			max +
			'" step="' +
			step +
			'" value="' +
			value +
			'" data-percent="' +
			percent +
			'"></label>'
		);
	}
	pause() {
		const g = this.g;
		return this.wrap(
			"SKIMMER 07 / FLIGHT DECK",
			g.net.active ? "The sortie<br>continues." : "Hold that<br>thought.",
			(g.net.active
				? "<p>Other pilots are still flying. Your world keeps moving while this menu is open.</p>"
				: "<p>Even a rebellion needs a moment to breathe.</p>") +
				'<nav class="menu-buttons" style="width:100%">' +
				this.button("resume", "Resume flight") +
				this.button("help", "Flight briefing") +
				this.button("settings", "Settings") +
				this.button("dev", "Developer tools") +
				(!g.net.active ? this.button("title", "Return to title") : "") +
				"</nav>",
		);
	}
	dev() {
		const g = this.g,
			b = g.balance;
		return this.wrap(
			"DEVELOPER FLIGHT DECK / LIVE TUNING",
			"Pull a few strings.",
			'<div class="dev-readout" id="devReadout"></div>' +
				this.range("speed", "Cruise speed", 12, 65, 1, b.speed, false, true) +
				this.range("turn", "Turn rate", 0.6, 3.5, 0.1, b.turn, false, true) +
				this.range(
					"laserDamage",
					"Cannon damage",
					1,
					12,
					1,
					b.laserDamage,
					false,
					true,
				) +
				this.range(
					"enemyDamage",
					"Incoming damage multiplier",
					0,
					3,
					0.1,
					b.enemyDamage,
					false,
					true,
				) +
				this.range(
					"pressure",
					"Enemy pressure",
					0.25,
					2.5,
					0.05,
					b.pressure,
					false,
					true,
				) +
				this.range(
					"wraps",
					"Wraps to topple",
					1,
					3,
					0.5,
					b.wraps,
					false,
					true,
				) +
				this.range(
					"timeScale",
					"Simulation speed",
					0.2,
					2,
					0.1,
					b.timeScale,
					false,
					true,
				) +
				this.button(
					"invincible",
					"Invulnerability",
					g.invincible ? "ON" : "OFF",
				) +
				this.button(
					"autopilot",
					"AI flight assist",
					g.autopilot ? "ON" : "OFF",
				) +
				this.button(
					"hitboxes",
					"Rapier collision shapes",
					g.debugPhysics ? "ON" : "OFF",
				) +
				this.button("repair", "Repair skimmer & transport") +
				this.button("step", "Step one simulation frame") +
				this.button("nextStage", "Next chapter") +
				this.button("spawn", "Spawn a scout") +
				this.button("balanceReset", "Reset balance to defaults") +
				this.button("resume", "Resume flight", "", "primary") +
				this.button("back", "Back to pause"),
		);
	}
	result() {
		const g = this.g;
		return this.wrap(
			g.won ? "SORTIE COMPLETE / 38 ABOARD" : "SORTIE ENDED / FLIGHT RECORDER",
			g.won
				? "Hope leaves<br>on a blue flame."
				: "The ice<br>keeps its secrets.",
			'<p class="result-quote">' +
				(g.won
					? "“Not bad. For a plan involving string.” — Finch"
					: "“We will come back. Preferably with a better heater.” — Rook") +
				"</p><p>" +
				escape(g.resultReason) +
				'</p><div class="stats"><div>SORTIE SCORE<strong>' +
				String(g.score).padStart(6, "0") +
				"</strong></div><div>WALKERS TOPPLED<strong>" +
				g.topples +
				" / 2</strong></div><div>CONTACTS DOWN<strong>" +
				g.kills +
				"</strong></div><div>FLIGHT TIME<strong>" +
				Math.floor(g.runTime / 60) +
				":" +
				String(Math.floor(g.runTime % 60)).padStart(2, "0") +
				'</strong></div></div><p>Your next sortie: save hull, spare the transport, and take the cyan repair buoys for a higher score.</p><nav class="menu-buttons" style="width:100%">' +
				this.button("start", "Fly another sortie") +
				this.button("title", "Return to title") +
				this.button("about", "About & credits") +
				"</nav>",
		);
	}
	about() {
		const m = window.GAME_META;
		const grid = Object.entries(m.sourceInformation)
			.map(
				([k, v]) =>
					"<dt>" +
					k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()) +
					"</dt><dd>" +
					escape(v) +
					"</dd>",
			)
			.join("");
		const feedback = (title, questions, answers) =>
			"<h3>" +
			title +
			"</h3>" +
			questions
				.map(
					(q, i) =>
						'<div class="feedback-item"><strong>' +
						q +
						"</strong>" +
						escape(answers[i] || "unknown") +
						"</div>",
				)
				.join("");
		return this.wrap(
			"THE PEOPLE BEHIND THE STRING",
			"About & credits",
			'<p>An original, unofficial flight comic inspired by <i>Star Wars: The Empire Strikes Back</i> and the 1982 arcade flight game. Original craft, mission, writing, geometry and score created for this demo. Star Wars belongs to its respective owners.</p><h3>Source Information</h3><dl class="info-grid">' +
				grid +
				"</dl>" +
				feedback("Testing Feedback", testingQ, m.testingFeedback) +
				feedback("Engine Feedback", engineQ, m.engineFeedback) +
				feedback("Prompt Feedback", promptQ, m.promptFeedback) +
				"<h3>Libraries & acknowledgements</h3><p>Three.js r180 — MIT. Rapier 0.19.3 — Apache-2.0. AI Hub Session Protocol client 1.4.0, included unmodified. Three.js WebGPURenderer uses WebGPU when available and its WebGL 2 backend otherwise. Procedural assets and audio are embedded; no runtime downloads.</p><p>Real controller, physical touch device, television, and audible listening review: unknown. Usage: added on import.</p>" +
				this.button("licenses", "Library licenses") +
				this.button("back", "Back", "", "primary"),
		);
	}
	network() {
		return this.wrap(
			"WING LINK / PARALLEL SORTIES",
			"Cold sky.<br>Good company.",
			'<p>Fly beside up to three wing echoes and compare scores. Each pilot has their own enemies, tow lines and transport. In AI Hub, the lobby handles connection and the shared start.</p><h3>Same-device wing · 1–4 players</h3><p>Open this same HTML in another tab or window. Use the same room code on each copy, then launch a sortie. Tabs must use the same origin or file location.</p><label for="roomName" class="eyebrow">ROOM CODE</label><input class="net-name" id="roomName" maxlength="30" value="' +
				escape(this.g.net.room) +
				'" aria-label="Local wing room code">' +
				this.button("joinRoom", "Tune to room") +
				"<h3>Direct wing · 2 players</h3><p>1. One pilot creates an invite and sends its code.<br>2. The other pastes it below, accepts it, and returns the answer.<br>3. The first pilot pastes that answer and accepts it. Launch when linked.</p><p>Serverless WebRTC. Works on the same network or a directly reachable network; firewalls may prevent a link. AI Hub provides internet matchmaking and relay.</p>" +
				this.button(
					"invite",
					this.netBusy ? "Preparing connection…" : "Create invite",
				) +
				'<label for="netOutput" class="eyebrow">YOUR OUTGOING CODE</label><textarea id="netOutput" class="net-code" readonly aria-label="Outgoing connection code">' +
				escape(this.netOutput) +
				"</textarea>" +
				this.button("copyCode", "Copy outgoing code") +
				'<label for="netInput" class="eyebrow">PASTE THEIR CODE</label><textarea id="netInput" class="net-code" placeholder="Invite or answer code" aria-label="Incoming connection code">' +
				escape(this.netInput) +
				"</textarea>" +
				this.button("accept", "Accept code") +
				'<div class="net-status" id="netStatus">' +
				escape(this.g.net.status) +
				"</div>" +
				this.button("back", "Back to title", "", "primary"),
		);
	}
	show(screen, preserve = false) {
		const g = this.g;
		if (!preserve) {
			if (
				["help", "settings", "about", "network"].includes(screen) &&
				["title", "pause", "result", "none"].includes(g.screen)
			)
				this.origin = g.screen === "none" ? "pause" : g.screen;
			this.focusIndex = 0;
		}
		g.screen = screen;
		this.visible = true;
		this.menu.hidden = false;
		this.menu.innerHTML =
			screen === "title"
				? this.title()
				: screen === "help"
					? this.help()
					: screen === "settings"
						? this.settings()
						: screen === "pause"
							? this.pause()
							: screen === "dev"
								? this.dev()
								: screen === "result"
									? this.result()
									: screen === "about"
										? this.about()
										: screen === "licenses"
											? this.wrap(
													"THIRD-PARTY SOFTWARE",
													"Library licenses",
													'<pre class=\"licenses\">' +
														escape(window.GAME_LICENSES) +
														"</pre>" +
														this.button(
															"about",
															"Back to credits",
															"",
															"primary",
														),
												)
											: this.network();
		this.bind();
		this.refreshHints();
		this.focus(this.focusIndex, false);
		if (screen === "dev") this.updateDev();
	}
	hide() {
		this.visible = false;
		this.menu.hidden = true;
		this.g.screen = "none";
		document.activeElement?.blur();
		this.refreshHints();
	}
	elements() {
		return [
			...this.menu.querySelectorAll("button:not(:disabled),input[type=range]"),
		];
	}
	focus(index, scroll = true) {
		const elements = this.elements();
		if (!elements.length) return;
		this.focusIndex = (index + elements.length) % elements.length;
		for (const e of elements) e.classList.remove("focused");
		const element = elements[this.focusIndex];
		element.classList.add("focused");
		element.focus({ preventScroll: true });
		if (scroll)
			element.scrollIntoView({ block: "nearest", behavior: "instant" });
	}
	move(delta) {
		this.focus(this.focusIndex + delta);
		this.g.sound.tone(340, 0.025, "sine", 0.03);
	}
	adjust(delta) {
		const el = this.elements()[this.focusIndex];
		if (el?.type === "range") {
			el.value = Math.min(
				+el.max,
				Math.max(+el.min, +el.value + delta * +el.step),
			);
			el.dispatchEvent(new Event("input"));
		} else if (el?.dataset.action?.startsWith("setting:"))
			this.action(el.dataset.action);
	}
	activate() {
		const el = this.elements()[this.focusIndex];
		if (el?.tagName === "BUTTON") el.click();
	}
	back() {
		const s = this.g.screen;
		if (s === "title") return;
		if (s === "pause") {
			this.g.resume();
			return;
		}
		if (s === "dev") {
			this.show("pause");
			return;
		}
		if (s === "result") {
			if (!this.g.net.active) this.action("title");
			return;
		}
		this.show(this.origin || "title");
	}
	bind() {
		const elements = this.elements();
		elements.forEach((el, i) => {
			el.addEventListener("focus", () => {
				this.focusIndex = i;
				for (const other of elements)
					other.classList.toggle("focused", other === el);
			});
			el.addEventListener("pointerenter", (e) => {
				if (e.pointerType === "mouse") this.focus(i, false);
			});
			if (el.tagName === "BUTTON")
				el.addEventListener("pointerdown", (e) => {
					this.g.lastInput = e.pointerType === "touch" ? "touch" : "keyboard";
					document.body.classList.toggle("touch", e.pointerType === "touch");
				});
			if (el.tagName === "BUTTON")
				el.addEventListener("click", () => {
					this.g.sound.unlock();
					this.g.idle = 0;
					this.g.lastInteraction = performance.now();
					this.g.sound.tone(620, 0.05, "triangle", 0.05);
					this.action(el.dataset.action);
				});
			else
				el.addEventListener("input", () => {
					const key = el.dataset.balance || el.dataset.setting;
					const obj = el.dataset.balance ? this.g.balance : this.g.settings;
					obj[key] = +el.value;
					$("out-" + key).textContent =
						el.dataset.percent === "true"
							? Math.round(+el.value * 100) + "%"
							: Number(el.value).toFixed(+el.step < 1 ? 1 : 0);
					if (!el.dataset.balance) this.g.saveSettings();
				});
		});
		$("netInput")?.addEventListener("input", (e) => {
			this.netInput = e.target.value;
		});
	}
	refreshHints() {
		const g = this.g;
		const titleHints = this.menu.querySelector(".menu-controls");
		if (titleHints && g.lastInput === "touch")
			titleHints.innerHTML =
				"<span>Tap to launch · Drag to fly · Cannons assist</span>";
		else if (titleHints)
			titleHints.innerHTML =
				this.glyph("accept") +
				" Launch <span>" +
				this.glyph("steer") +
				" Steer · " +
				this.glyph("fire") +
				" Fire</span>";
		$("actionHints").innerHTML =
			"<span>" +
			this.glyph("fire") +
			" FIRE</span><span>" +
			this.glyph("boost") +
			" BOOST</span><span>" +
			this.glyph("cable") +
			" TOW</span><span>" +
			this.glyph("target") +
			" LOCK</span>";
	}
	updateDev() {
		if (!$("devReadout")) return;
		const g = this.g;
		$("devReadout").textContent =
			g.backend +
			" · RAPIER " +
			g.physicsVersion +
			"\nCHAPTER " +
			(g.stage + 1) +
			" · " +
			g.runTime.toFixed(2) +
			" s · " +
			g.entities.filter((e) => !e.dead).length +
			" CONTACTS\nX " +
			g.player.pos.x.toFixed(1) +
			" / Z " +
			g.player.pos.z.toFixed(1) +
			" · " +
			g.projectiles.length +
			" BOLTS · " +
			g.debris.length +
			" DEBRIS";
		$("devReadout").style.whiteSpace = "pre-line";
	}
	updateNetStatus() {
		if ($("netStatus")) $("netStatus").textContent = this.g.net.status;
	}
	async action(a) {
		const g = this.g;
		if (!a) return;
		if (a.startsWith("setting:")) {
			const key = a.slice(8);
			if (key === "glyphs")
				g.settings.glyphs = g.settings.glyphs === "ps" ? "xbox" : "ps";
			else if (key === "camera")
				g.settings.camera =
					g.settings.camera === "chase" ? "tactical" : "chase";
			else g.settings[key] = !g.settings[key];
			g.saveSettings();
			this.show("settings", true);
			return;
		}
		switch (a) {
			case "start":
				g.sound.unlock();
				g.begin();
				break;
			case "resume":
				g.resume();
				break;
			case "back":
				this.back();
				break;
			case "help":
			case "about":
			case "settings":
			case "network":
			case "dev":
			case "licenses":
				this.show(a);
				break;
			case "title":
				if (g.net.active) return;
				g.mode = "title";
				g.resetWorld(false);
				g.idle = 0;
				g.lastInteraction = performance.now();
				$("hud").hidden = true;
				$("attractBadge").hidden = true;
				this.show("title");
				break;
			case "fullscreen":
				try {
					if (document.fullscreenElement) await document.exitFullscreen();
					else await document.documentElement.requestFullscreen();
				} catch {
					g.toast("Fullscreen is unavailable in this window.");
				}
				if (this.visible) this.show("settings", true);
				break;
			case "settingsReset":
				Object.assign(g.settings, settingsDefault);
				g.saveSettings();
				this.show("settings", true);
				break;
			case "balanceReset":
				Object.assign(g.balance, DEFAULTS);
				g.invincible = false;
				g.autopilot = false;
				this.show("dev", true);
				g.toast("Default flight balance restored.");
				break;
			case "invincible":
				g.invincible = !g.invincible;
				this.show("dev", true);
				break;
			case "autopilot":
				g.autopilot = !g.autopilot;
				this.show("dev", true);
				break;
			case "hitboxes":
				g.debugPhysics = !g.debugPhysics;
				this.show("dev", true);
				break;
			case "repair":
				g.player.hp = 100;
				g.ark.hp = 180;
				g.heat = 0;
				g.overheated = false;
				g.toast("Skimmer and Ark restored.");
				g.updateHUD();
				break;
			case "step": {
				const old = g.mode;
				g.mode = "playing";
				g.tick(1 / 60, {
					turn: 0,
					throttle: 0,
					fire: false,
					boost: false,
					cable: false,
				});
				g.mode = old;
				this.updateDev();
				break;
			}
			case "nextStage":
				if (g.stage < 2) {
					for (const e of g.entities)
						if (
							!e.dead &&
							(g.stage === 0 ? e.type === "raider" : e.type === "walker")
						)
							g.killEnemy(e, e.type === "walker");
					g.setStage(g.stage + 1);
					g.toast("Chapter advanced.");
				} else {
					g.escortProgress = 1;
					g.ark.pos.z = -280;
					for (const e of g.entities)
						if (!e.dead) g.killEnemy(e, e.type === "walker");
					g.endRun(true);
				}
				break;
			case "spawn":
				g.spawnRaider(g.player.pos.x + 30, g.player.pos.z - 45, 8);
				g.toast("Scout contact spawned.");
				break;
			case "joinRoom":
				g.net.joinLocal($("roomName").value);
				this.updateNetStatus();
				g.toast("Tuned to " + g.net.room);
				break;
			case "invite":
				if (this.netBusy) return;
				this.netBusy = true;
				this.updateNetStatus();
				try {
					this.netOutput = await g.net.invite();
					if ($("netOutput")) $("netOutput").value = this.netOutput;
					g.toast("Invite ready. Send the outgoing code to your wing.");
				} catch (e) {
					g.toast(e.message);
				}
				this.netBusy = false;
				break;
			case "accept":
				try {
					this.netInput = $("netInput").value;
					const answer = await g.net.accept(this.netInput);
					if (answer) {
						this.netOutput = answer;
						$("netOutput").value = answer;
						g.toast("Answer ready. Send it back to the inviting pilot.");
					} else g.toast("Answer accepted. Opening direct wing…");
					this.updateNetStatus();
				} catch (e) {
					g.toast(e.message);
				}
				break;
			case "copyCode":
				if (!this.netOutput) {
					g.toast("Create or accept an invite first.");
					break;
				}
				try {
					await navigator.clipboard.writeText(this.netOutput);
					g.toast("Connection code copied.");
				} catch {
					$("netOutput").focus();
					$("netOutput").select();
					g.toast("Code selected. Copy with your keyboard.");
				}
				break;
		}
	}
}
