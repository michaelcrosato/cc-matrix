import INFO from "../metadata.json";
import { Sound } from "./audio.js";
import { DEFAULTS, Game, WAVES } from "./game.js";
import { Input } from "./input.js";
import { Network } from "./network.js";
import { Stage } from "./scene.js";

const $ = (id) => document.getElementById(id);
const esc = (s) =>
	String(s).replace(
		/[&<>"']/g,
		(c) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				c
			],
	);
const button = (text, action, primary = false, extra = "") =>
	`<button class="action${primary ? " primary" : ""}" data-action="${action}" ${extra}>${text}<span class="menu-arrow">↗</span></button>`;
const glyph = (text, pad = false) =>
	`<span class="glyph${pad ? " pad" : ""}">${text}</span>`;
const QUESTIONS = {
	testing: [
		"How many issues did testing catch?",
		"How many were critical or game breaking?",
		"Most helpful test?",
		"Least helpful test?",
	],
	engine: [
		"What did you like most about the engine?",
		"Did you get stuck or guess wrong?",
		"Most important thing you built yourself?",
		"Hardest part of using the engine?",
		"What did you change in the engine, and why?",
		"One thing you would change?",
	],
	prompt: [
		"What did you like most about this prompt?",
		"What was confusing?",
		"What was hardest?",
		"What would you change?",
	],
};

class App {
	constructor() {
		this.sound = new Sound();
		this.screen = null;
		this.previousScreen = "title";
		this.aboutTab = "source";
		this.devTab = "tools";
		this.attract = false;
		this.lastActivity = performance.now();
		this.lastFrame = 0;
		this.nextHud = 0;
		this.announceTimer = 0;
		this.toastTimer = 0;
		this.ready = false;
		this.settingsParent = "title";
		this.settings = {
			music: 0.1,
			effects: 0.65,
			voice: 0.55,
			glyphs: "playstation",
			difficulty: "arcade",
			reduceMotion: false,
			aimAssist: false,
			lowFlash: false,
		};
		this.records = [];
		try {
			const s = JSON.parse(
				localStorage.getItem("ka-whoosh-settings") || "null",
			);
			if (s) Object.assign(this.settings, s);
			this.records = JSON.parse(
				localStorage.getItem("ka-whoosh-records") || "[]",
			);
			if (!Array.isArray(this.records)) this.records = [];
		} catch {}
		this.net = new Network({
			waiting: () => this.waiting(),
			countdown: (t) => this.hubCountdown(t),
			start: (seed) => this.networkStart(seed),
			timeUp: () => {
				if (this.game && !this.net.reported) this.game.finish(false, "time-up");
			},
			end: () => {
				if (this.game) this.game.phase = "ended";
				this.sound.stop();
				this.hideAnnounce();
				this.showHubEnd();
			},
			ghost: (id, p) => {
				if (this.stage && this.game)
					this.stage.updateGhost(
						id,
						{ ...p, visible: p.stage === this.game.wave },
						p.color,
					);
				this.renderRivals();
			},
			removeGhost: (id) => {
				this.stage?.removeGhost(id);
				this.renderRivals();
			},
			status: (t) => {
				if ($("online-status")) $("online-status").textContent = t;
			},
			connected: (host) => {
				if ($("start-race")) $("start-race").hidden = !host;
			},
			rivalResult: () => {
				if (this.screen === "results") this.showResults(this.lastResult);
			},
			disconnect: () => this.toast("Rival disconnected. Your shift continues."),
		});
	}
	async init() {
		window.__bootPhase = "fonts";
		await document.fonts.ready;
		await Promise.all([
			document.fonts.load("900 32px Display"),
			document.fonts.load("400 20px Body"),
		]);
		window.__bootPhase = "graphics";
		this.stage = new Stage($("world"));
		await this.stage.init();
		this.game = new Game(this.stage, this.sound, (event, data) =>
			this.gameEvent(event, data),
		);
		window.__bootPhase = "physics";
		await this.game.init();
		this.game.assist = this.settings.aimAssist;
		this.input = new Input(this);
		this.applySettings();
		this.bind();
		this.stage.playerState([{ x: 0, buckets: 3 }], 1.85);
		window.__bootPhase = "prewarm";
		await this.stage.screenshotReady();
		this.ready = true;
		this.lastActivity = performance.now();
		$("loading").hidden = true;
		if (this.net.kind === "hub") this.waiting();
		else this.showTitle();
		this.stage.setLoop((t) => this.frame(t));
		await this.net.ready();
		addEventListener(
			"pagehide",
			() => {
				this.stage.dispose();
				this.net.disconnect(false);
				this.sound.stop();
			},
			{ once: true },
		);
		window.__KA_WHOOSH__ = {
			app: this,
			game: this.game,
			stage: this.stage,
			sound: this.sound,
			network: this.net,
			info: INFO,
			ready: true,
			snapshot: () => this.game.snapshot(),
			advance: (seconds, { auto = false, effects = false } = {}) => {
				const oldAuto = this.game.auto,
					oldEffects = this.game.effects;
				this.game.auto = auto;
				this.game.effects = effects;
				for (let i = 0; i < Math.ceil(seconds * 120); i++) {
					if (["won", "lost", "ended"].includes(this.game.phase)) break;
					this.game.step(1 / 120, []);
				}
				this.game.auto = oldAuto;
				this.game.effects = oldEffects;
				this.updateHud();
				return this.game.snapshot();
			},
		};
		window.__bootPhase = "ready";
		window.__gameReady = true;
	}
	bind() {
		$("screen").addEventListener("click", (e) => {
			const b = e.target.closest("[data-action]");
			if (b && !b.disabled) {
				this.activity();
				this.sound.unlock();
				this.sound.play("click");
				this.action(b.dataset.action, b);
			}
		});
		$("screen").addEventListener("input", (e) => this.slider(e.target));
		$("pause-button").onclick = () => this.pause();
		$("douse-button").onclick = () => this.douse();
		document.addEventListener("visibilitychange", () => {
			if (
				document.hidden &&
				this.game &&
				this.game.phase !== "idle" &&
				!this.net.roundActive &&
				!this.attract &&
				!this.screen
			)
				this.pause();
		});
	}
	activity() {
		this.lastActivity = performance.now();
		if (!this.net.ended) {
			this.sound.resume();
			this.sound.unlock();
		}
		if (this.attract) {
			this.exitAttract();
			return true;
		}
		return false;
	}
	applySettings() {
		this.sound.musicVolume = Math.max(
			0,
			Math.min(1, Number(this.settings.music)),
		);
		this.sound.effectsVolume = Number(this.settings.effects);
		this.sound.voiceVolume = Number(this.settings.voice);
		this.sound.volumes();
		document.body.classList.toggle("reduce-motion", this.settings.reduceMotion);
		document.body.classList.toggle("low-flash", this.settings.lowFlash);
		if (this.game) {
			this.game.assist =
				this.settings.aimAssist || this.input?.last === "touch";
			this.game.difficulty = this.net.roundActive
				? "arcade"
				: this.settings.difficulty;
			this.game.applyTune();
		}
		try {
			localStorage.setItem("ka-whoosh-settings", JSON.stringify(this.settings));
		} catch {}
		this.prompts();
	}
	panel(content, wide = false) {
		return `<div class="shade"><section class="panel${wide ? " wide" : ""}" role="dialog" aria-modal="true">${content}</section></div>`;
	}
	setScreen(name, html) {
		this.screen = name;
		$("screen").innerHTML = html;
		this.input?.clear();
		this.prompts();
		queueMicrotask(() => {
			const first = this.input?.elements()[0];
			first?.focus({ preventScroll: true });
		});
	}
	clearScreen() {
		this.screen = null;
		$("screen").innerHTML = "";
		this.input?.clear();
	}
	showTitle() {
		if (this.net.kind === "hub") return;
		this.game.phase = "idle";
		this.game.clear();
		this.attract = false;
		$("attract-label").hidden = true;
		$("hud").hidden = true;
		$("pause-button").hidden = false;
		this.hideAnnounce();
		this.stage.targetOffset = -4.3;
		this.stage.setPlayers(1);
		this.stage.playerState([{ x: 0, buckets: 3 }], 1.85);
		this.sound.resume();
		this.lastActivity = performance.now();
		const best = this.records.length
			? Math.max(...this.records.map((r) => r.score))
			: 0;
		this.setScreen(
			"title",
			`<section class="title-screen"><div class="eyebrow">Rooftop water brigade · Est. 1981</div><h1 class="title-logo" aria-label="Ka-Whoosh!"><span>KA–</span><span class="whoosh">WHOOSH!</span></h1><p class="title-description"><b>A little panic. A lot of splash.</b><br>Catch trouble before it hits the roof.</p><nav class="title-nav" aria-label="Main menu">${button("Start a solo shift", "solo", true)}${button("Two at the tubs <small>couch co-op</small>", "coop")}${button("Race a friend <small>online</small>", "online")}</nav><nav class="minor-nav"> <button class="text-button" data-action="howto">How to play</button><button class="text-button" data-action="settings">Settings</button><button class="text-button" data-action="about">About</button></nav><div class="edition"><span class="stamp">SIX SHIFTS. THREE TUBS. NO EXCUSES.</span><button class="text-button" data-action="records" style="font-size:inherit">BEST ${best.toLocaleString()} ↗</button></div><div class="hero-label">THE ROOFTOP IS<br>COUNTING ON YOU.<span>Water beats dynamite. Usually.</span></div></section>`,
		);
	}
	start(mode = "solo", attract = false) {
		this.clearScreen();
		this.attract = attract;
		this.game.assist = this.settings.aimAssist || this.input?.last === "touch";
		this.game.difficulty = this.net.roundActive
			? "arcade"
			: this.settings.difficulty;
		const a = new Uint32Array(1);
		crypto.getRandomValues(a);
		this.game.start({ mode, seed: attract ? 1981 : a[0], attract });
		$("hud").hidden = false;
		$("pause-button").hidden = attract;
		$("attract-label").hidden = !attract;
		this.sound.resume();
		this.updateHud();
	}
	startAttract() {
		this.attractReturn = this.screen || "title";
		this.start("solo", true);
		this.toastTimer = 0;
		$("toast").hidden = true;
	}
	exitAttract() {
		this.game.clear();
		this.game.phase = "idle";
		this.attract = false;
		$("attract-label").hidden = true;
		$("hud").hidden = true;
		this.hideAnnounce();
		this.stage.targetOffset = -4.3;
		this.stage.setPlayers(1);
		this.stage.playerState([{ x: 0, buckets: 3 }], 1.85);
		const where = this.attractReturn || "title";
		if (where === "settings") this.showSettings();
		else if (where === "about") this.showAbout();
		else if (where === "howto") this.showHowto();
		else if (where === "records") this.showRecords();
		else this.showTitle();
		this.lastActivity = performance.now();
	}
	pause() {
		if (this.attract) {
			this.exitAttract();
			return;
		}
		if (this.net.ended || this.game.phase === "idle" || this.screen) return;
		this.hideAnnounce(false);
		this.setScreen(
			"pause",
			this.panel(
				`<div class="eyebrow">${this.net.roundActive ? "THE RACE KEEPS RUNNING" : "WATER BREAK"}</div><h1>Catch your breath.</h1><p class="intro">${this.net.roundActive ? "Your rivals are still catching. Jump back in when you’re ready." : "Even dynamite can wait a moment."}</p><nav class="panel-nav">${button("Back to the roof", "resume", true)}${button("Settings", "settings")}${!this.net.active ? button("Dev workshop", "dev") : ""}${!this.net.active ? button("End this shift", "title") : ""}</nav>`,
			),
		);
	}
	resume() {
		this.clearScreen();
		this.sound.resume();
		if (this.announceTimer > 0) $("announcement").hidden = false;
	}
	back() {
		if (this.net.ended) return;
		if (this.screen === "pause") this.resume();
		else if (this.screen === "dev") this.pauseFromChild();
		else if (this.screen === "settings") {
			if (this.settingsParent === "pause") this.pauseFromChild();
			else this.showTitle();
		} else if (
			this.screen === "about" ||
			this.screen === "howto" ||
			this.screen === "records" ||
			this.screen === "online"
		) {
			if (this.screen === "online" && !this.net.roundActive)
				this.net.disconnect();
			this.showTitle();
		} else if (this.screen === "results") {
			if (this.net.kind === "hub") return;
			if (this.net.kind === "rtc" && this.net.connected) this.showOnline();
			else this.showTitle();
		}
	}
	pauseFromChild() {
		this.clearScreen();
		this.pause();
	}
	douse() {
		if (this.screen || this.attract || this.net.ended) return;
		this.game.douse();
		this.updateHud();
	}
	gameEvent(event, data = {}) {
		if (event === "wave") {
			this.announce(
				`SHIFT ${String(data.index + 1).padStart(2, "0")} / 06`,
				data.name,
				data.tip,
				3,
			);
		}
		if (event === "go") this.hideAnnounce();
		if (event === "clear") {
			this.announce(
				data.perfect ? "NOT A DROP WASTED" : "ROOFTOP STILL STANDING",
				"Shift complete!",
				"One tub restored · Douse topped up",
				2.8,
			);
			if (this.game.effects) this.stage.burst(0, 6, "gold", 50);
		}
		if (event === "finish") {
			if (data.attract) {
				this.attractRestart = performance.now() + 2500;
				this.announce(
					"ON THE HOUSE",
					"Rooftop saved!",
					"Another round of trouble in a moment…",
					2.5,
				);
				return;
			}
			if (this.net.roundActive) this.net.result(data.score, data.stats);
			if (!this.net.active && !data.unranked) {
				this.records.push({
					score: data.score,
					won: data.won,
					caught: data.stats.caught,
					date: new Date().toISOString().slice(0, 10),
					difficulty: this.game.difficulty,
				});
				this.records.sort((a, b) => b.score - a.score);
				this.records = this.records.slice(0, 5);
				try {
					localStorage.setItem(
						"ka-whoosh-records",
						JSON.stringify(this.records),
					);
				} catch {}
			}
			this.hideAnnounce();
			this.lastResult = data;
			this.showResults(data);
		}
	}
	showResults(data) {
		if (!data) return;
		const s = data.stats,
			accuracy =
				s.caught + s.misses
					? Math.round((s.caught / (s.caught + s.misses)) * 100)
					: 0;
		const rival = this.net.rivalResult;
		let networkLine = "";
		if (this.net.kind === "rtc")
			networkLine = `<p class="online-status">${rival ? `Rival: ${rival.score.toLocaleString()} · ${data.score > rival.score ? "You take the rooftop crown!" : data.score === rival.score ? "A perfectly soggy tie." : "Your rival takes this one."}` : "Waiting for your rival to finish…"}</p>`;
		const actions =
			this.net.kind === "hub"
				? '<p class="small">Result sent. The Hub will take it from here.</p>'
				: this.net.kind === "rtc" && this.net.connected
					? `${this.net.host ? button("Race again", "race-start", true) : '<p class="small">Your friend can start another race.</p>'}${button("Leave race", "leave-online")}`
					: `${button("Another shift", "replay", true)}${button("Back to the rooftop", "title")}`;
		this.setScreen(
			"results",
			this.panel(
				`<div class="eyebrow">${data.won ? "THE ALL-CLEAR" : "SHIFT ENDED"}${data.unranked ? " · DEV SHIFT" : ""}</div><h1>${data.won ? "Well, that was close." : "A spectacular splash."}</h1><p class="intro">${data.won ? "Six shifts. One very soggy bandit. Nice work." : data.reason === "time-up" ? "Time’s up! Every splash still counts." : "The tubs are gone. The nerve is still there."}</p><div class="hud-caption">FINAL SCORE</div><div class="final-score">${data.score.toLocaleString()}</div><div class="rating">${data.won ? "CERTIFIED ROOFTOP HERO" : s.caught > 40 ? "WATER BRIGADE MATERIAL" : "EVERY GREAT CATCH STARTS WITH A MISS"}</div><div class="stats-grid"><div class="stat"><b>${s.caught}</b><span>bombs caught</span></div><div class="stat"><b>${s.bestCombo}</b><span>best streak</span></div><div class="stat"><b>${accuracy}%</b><span>catch rate</span></div><div class="stat"><b>${s.perfect}</b><span>perfect catches</span></div><div class="stat"><b>${s.gold}</b><span>golden catches</span></div><div class="stat"><b>${s.stages}/6</b><span>shifts cleared</span></div></div>${networkLine}<nav class="panel-nav">${actions}</nav>`,
			),
		);
	}
	showHowto() {
		this.setScreen(
			"howto",
			this.panel(
				`<div class="eyebrow">A QUICK BRIEFING</div><h1>Keep your cool.<br>And your water.</h1><div class="instructions"><div class="instruction"><span class="number">01</span><div><h3>Catch the trouble</h3><p>Slide the tubs under every bomb. A miss costs one tub. Lose all three and your shift is over.</p></div></div><div class="instruction"><span class="number">02</span><div><h3>Make it perfect</h3><p>Center catches score double. Every ten catches builds your multiplier, all the way to ×5.</p></div></div><div class="instruction"><span class="number">03</span><div><h3>When in doubt, douse</h3><p>A full meter floods every bomb away. Catches recharge it. Gold bombs add bonus points and extra water.</p></div></div><div class="instruction"><span class="number">04</span><div><h3>Six shifts of mischief</h3><p>Wind, paired deliveries and fast red bombs. Every cleared shift restores one tub. In co-op, share the lane and the score.</p></div></div></div><div id="howto-controls" class="control-table"></div><p class="small">Couch co-op: P1 uses A/D + Space or controller 1. P2 uses ←/→ + Enter or controller 2. On touch, drag anywhere to move; a second finger douses. Touch adds a little catch assistance.</p><div class="back-row">${button("Got it", "back", true)}<span class="small">Gold is a bonus. Missing it won’t cost a tub.</span></div>`,
				true,
			),
		);
		this.prompts();
	}
	settingsRows() {
		const range = (key, label, val) =>
			`<div class="setting-row"><label for="setting-${key}">${label}</label><div class="range-group"><input id="setting-${key}" data-setting="${key}" aria-label="${label}" type="range" min="0" max="100" step="5" value="${Math.round(val * 100)}"><output class="range-value">${Math.round(val * 100)}%</output></div></div>`;
		const toggle = (key, label, val, on = "On", off = "Off") =>
			`<div class="setting-row"><label>${label}</label><button data-action="setting:${key}" data-cycle="1">${val ? on : off}</button></div>`;
		return (
			range("music", "Music", this.settings.music) +
			range("effects", "Sound effects", this.settings.effects) +
			range("voice", "Gibberish voices", this.settings.voice) +
			`<div class="setting-row"><label>Controller glyphs</label><button data-action="glyphs" data-cycle="1">${this.settings.glyphs === "playstation" ? "PlayStation" : "Xbox"}</button></div><div class="setting-row"><label>Shift difficulty<small>Applies to local shifts. Online uses Arcade.</small></label><button data-action="difficulty" data-cycle="1">${this.settings.difficulty[0].toUpperCase() + this.settings.difficulty.slice(1)}</button></div>` +
			toggle("aimAssist", "Wider catch assist", this.settings.aimAssist) +
			toggle("reduceMotion", "Reduce motion", this.settings.reduceMotion) +
			toggle("lowFlash", "Quieter effects", this.settings.lowFlash)
		);
	}
	showSettings() {
		this.setScreen(
			"settings",
			this.panel(
				`<div class="eyebrow">MAKE YOURSELF AT HOME</div><h1>Fine-tune the splash.</h1>${this.settingsRows()}<div class="back-row">${button("All set", "back", true)}<button class="text-button" data-action="fullscreen">${document.fullscreenElement ? "Exit fullscreen" : "Fullscreen ↗"}</button></div>`,
			),
		);
	}
	showRecords() {
		this.setScreen(
			"records",
			this.panel(
				`<div class="eyebrow">THE BRIGADE NOTICEBOARD</div><h1>Local legends.</h1>${this.records.length ? `<ol class="record-list">${this.records.map((r, i) => `<li><span>${String(i + 1).padStart(2, "0")} · ${r.won ? "Rooftop hero" : "Water brigade"}<small>${esc(r.date)} · ${esc(r.difficulty)} · ${r.caught} caught</small></span><strong>${r.score.toLocaleString()}</strong></li>`).join("")}</ol>` : '<p class="intro">The noticeboard is dry. Your first shift will fix that.</p>'}<p class="small">Your five best local shifts live on this device. Developer shifts stay off the board.</p><div class="back-row">${button("Back", "back", true)}</div>`,
			),
		);
	}
	showAbout() {
		const tabs = [
			["source", "Source info"],
			["testing", "Testing"],
			["engine", "Engine"],
			["prompt", "Prompt"],
			["credits", "Credits"],
		];
		let content = "";
		if (this.aboutTab === "source") {
			content =
				"<dl>" +
				Object.entries(INFO.sourceInformation)
					.map(
						([k, v]) =>
							`<dt>${esc(k[0].toUpperCase() + k.slice(1))}</dt><dd>${esc(v)}</dd>`,
					)
					.join("") +
				"</dl>";
		} else if (this.aboutTab === "credits") {
			content =
				"<p><b>Ka-Whoosh!</b><br>An original game inspired by the mischievous, quick-reflex spirit of Kaboom! (1981).</p><p>Design, procedural art, programming, animation and synthesized audio: OpenAI gpt-6.1-sol through Codex CLI.</p><p>Three.js r180 — MIT license.<br>Rapier 0.19.3 — Apache 2.0 license.<br>AI Hub session client 1.4.0 — Michael Crosato.<br>Lato fonts — Łukasz Dziedzic, SIL Open Font License 1.1.</p><p>Every sound is generated in code. No recorded music, samples or speech. Kaboom! and Activision belong to their respective owners. This is an independent homage.</p>";
		} else {
			const values = INFO[`${this.aboutTab}Feedback`];
			content =
				'<ol class="feedback">' +
				QUESTIONS[this.aboutTab]
					.map((q, i) => `<li><b>${esc(q)}</b><p>${esc(values[i])}</p></li>`)
					.join("") +
				"</ol>";
		}
		this.setScreen(
			"about",
			this.panel(
				`<div class="eyebrow">THE SMALL PRINT, BUT BIGGER</div><h1>Behind the splash.</h1><nav class="tabs">${tabs.map(([k, v]) => `<button class="${this.aboutTab === k ? "active" : ""}" data-action="about:${k}">${v}</button>`).join("")}</nav><div class="about-body" tabindex="0">${content}</div><div class="back-row">${button("Back", "back", true)}<span class="small">A little panic. A lot of code.</span></div>`,
				true,
			),
		);
	}
	showOnline() {
		this.game.phase = "idle";
		this.game.clear();
		$("hud").hidden = true;
		this.stage.targetOffset = -4.3;
		this.setScreen(
			"online",
			this.panel(
				`<div class="eyebrow">A FRIENDLY SPLASH-OFF</div><h1>Two roofs. One rivalry.</h1><p class="network-intro">Both players catch the same deliveries. See your rival’s tubs; chase the higher score. On AI Hub, races connect automatically for up to four players.</p><div id="online-status" class="online-status">${esc(this.net.connectionStatus)}</div><div class="inline-actions">${button("Create an invite", "create-invite", true)}${button("Use pasted code", "accept-code")}</div><label class="code-label" for="incoming-code">Paste an invite or reply here</label><textarea id="incoming-code" class="code-area" spellcheck="false" placeholder="WHOOSH1.…" aria-label="Connection code to use">${esc(this.incomingCode || "")}</textarea><div class="code-label"><label for="outgoing-code">Your invite / reply</label><button data-action="copy-code">Copy</button></div><textarea id="outgoing-code" class="code-area" readonly aria-label="Your connection code">${esc(this.outgoingCode || "")}</textarea><button id="start-race" class="action primary" data-action="race-start" style="width:100%;margin-top:18px" ${this.net.connected && this.net.host ? "" : "hidden"}>Start the race<span>↗</span></button><p class="small">Host sends an invite → friend pastes it and sends a reply → host pastes the reply. Both games must stay open. Direct connections use STUN; restrictive networks may need AI Hub.</p><div class="back-row">${button("Back", "back")}<span class="small">No account. No game server.</span></div>`,
				true,
			),
		);
	}
	showDev() {
		if (this.net.active) return;
		this.game.unranked = true;
		this.devTab ??= "tools";
		let content = "";
		if (this.devTab === "tools")
			content = `<div class="tool-grid">${button(`Invulnerable: ${this.game.invulnerable ? "ON" : "OFF"}`, "dev:invulnerable", false, `class="action${this.game.invulnerable ? " on" : ""}"`)}${button(`Auto-catch: ${this.game.auto ? "ON" : "OFF"}`, "dev:auto")}${button(`Physics overlay: ${this.game.hitboxes ? "ON" : "OFF"}`, "dev:hitboxes")}${button("Restore all tubs", "dev:heal")}${button("Fill douse meter", "dev:charge")}${button("Spawn a bomb", "dev:bomb")}${button("Spawn gold", "dev:gold")}${button("Finish this shift", "dev:win")}</div><div class="eyebrow">JUMP TO A SHIFT</div><div class="wave-picker">${WAVES.map((_, i) => `<button data-action="wave:${i}">${i + 1}</button>`).join("")}</div><p class="small">Developer changes mark the shift unranked. Resume to see changes. Physics overlay shows sensor bounds and live simulation counts.</p>`;
		else {
			const sliders = [
				["fall", "Fall speed", 0.4, 2, 0.05],
				["rate", "Drop frequency", 0.4, 2, 0.05],
				["width", "Tub width", 1, 3, 0.05],
				["speed", "Move speed", 8, 30, 1],
				["gravity", "Gravity", 1, 12, 0.25],
				["recharge", "Douse / catch", 1, 20, 1],
				["timeScale", "Simulation speed", 0.25, 2, 0.05],
			];
			content = `<div class="tune-grid">${sliders.map(([k, l, min, max, step]) => `<div class="setting-row"><label for="tune-${k}">${l}</label><div class="range-group"><input id="tune-${k}" data-tune="${k}" aria-label="${l}" type="range" min="${min}" max="${max}" step="${step}" value="${this.game.tune[k]}"><output class="range-value">${this.game.tune[k].toFixed(2)}</output></div></div>`).join("")}</div><p class="small">Changes are live and apply to every new delivery. Restore defaults to return to the original balance.</p>`;
		}
		this.setScreen(
			"dev",
			this.panel(
				`<div class="eyebrow">THE DEV WORKSHOP · UNRANKED</div><h1>Turn the taps.</h1><nav class="tabs"><button data-action="dev-tab:tools" class="${this.devTab === "tools" ? "active" : ""}">Testing tools</button><button data-action="dev-tab:tuning" class="${this.devTab === "tuning" ? "active" : ""}">Balance sliders</button></nav>${content}<div class="back-row">${button("Back to pause", "back", true)}<button class="text-button" data-action="dev:reset">Reset defaults</button></div>`,
				true,
			),
		);
	}
	slider(el) {
		this.activity();
		if (el.dataset.setting) {
			const k = el.dataset.setting;
			this.settings[k] = Number(el.value) / 100;
			el.nextElementSibling.textContent = `${el.value}%`;
			this.applySettings();
		}
		if (el.dataset.tune) {
			const k = el.dataset.tune;
			this.game.tune[k] = Number(el.value);
			el.nextElementSibling.textContent = Number(el.value).toFixed(2);
			this.game.unranked = true;
			this.game.applyTune();
		}
	}
	async action(action, el) {
		if (this.net.ended) return;
		if (action === "solo") this.start("solo");
		else if (action === "coop") this.start("coop");
		else if (action === "replay") this.start(this.game.mode);
		else if (action === "title") {
			this.net.disconnect();
			this.showTitle();
		} else if (action === "resume") this.resume();
		else if (action === "back") this.back();
		else if (action === "howto") this.showHowto();
		else if (action === "settings") {
			this.settingsParent = this.screen === "pause" ? "pause" : "title";
			this.showSettings();
		} else if (action === "about") {
			this.aboutTab = "source";
			this.showAbout();
		} else if (action.startsWith("about:")) {
			this.aboutTab = action.slice(6);
			this.showAbout();
		} else if (action === "records") this.showRecords();
		else if (action === "online") this.showOnline();
		else if (action === "fullscreen") this.fullscreen();
		else if (action === "glyphs") {
			this.settings.glyphs =
				this.settings.glyphs === "playstation" ? "xbox" : "playstation";
			this.applySettings();
			el.textContent =
				this.settings.glyphs === "playstation" ? "PlayStation" : "Xbox";
		} else if (action === "difficulty") {
			const ds = ["chill", "arcade", "wild"];
			this.settings.difficulty =
				ds[(ds.indexOf(this.settings.difficulty) + 1) % 3];
			this.applySettings();
			el.textContent =
				this.settings.difficulty[0].toUpperCase() +
				this.settings.difficulty.slice(1);
		} else if (action.startsWith("setting:")) {
			const k = action.slice(8);
			this.settings[k] = !this.settings[k];
			this.applySettings();
			el.textContent = this.settings[k] ? "On" : "Off";
		} else if (action === "dev") this.showDev();
		else if (action.startsWith("dev-tab:")) {
			this.devTab = action.slice(8);
			this.showDev();
		} else if (action.startsWith("wave:")) {
			this.game.jumpWave(Number(action.slice(5)));
			this.resume();
		} else if (action.startsWith("dev:")) this.devAction(action.slice(4));
		else if (action === "create-invite" || action === "accept-code") {
			el.disabled = true;
			try {
				let code;
				if (action === "create-invite") code = await this.net.createOffer();
				else {
					this.incomingCode = $("incoming-code").value;
					code = await this.net.accept(this.incomingCode);
				}
				if (code) {
					this.outgoingCode = code;
					if ($("outgoing-code")) $("outgoing-code").value = code;
				}
			} catch (e) {
				this.net.setStatus(e.message);
			} finally {
				el.disabled = false;
			}
		} else if (action === "copy-code") {
			const code = $("outgoing-code").value;
			if (!code) {
				this.net.setStatus("Create an invite or accept a code first.");
				return;
			}
			try {
				await navigator.clipboard.writeText(code);
				this.toast("Connection code copied.");
			} catch {
				$("outgoing-code").focus();
				$("outgoing-code").select();
				this.net.setStatus(
					"Code selected. Copy it with your device’s copy command.",
				);
			}
		} else if (action === "race-start") this.net.beginRace();
		else if (action === "leave-online") {
			this.net.disconnect();
			this.showTitle();
		}
	}
	devAction(k) {
		this.game.unranked = true;
		if (["invulnerable", "auto", "hitboxes"].includes(k))
			this.game[k] = !this.game[k];
		if (k === "heal") {
			for (const p of this.game.players) {
				p.buckets = 3;
				this.game.syncSensors(p);
			}
		}
		if (k === "charge") this.game.charge = 100;
		if (k === "bomb" || k === "gold")
			this.game.spawn(
				k === "gold" ? "gold" : "normal",
				this.game.players[0].x,
				6,
			);
		if (k === "win") {
			this.game.finish(true);
			return;
		}
		if (k === "reset") {
			Object.assign(this.game.tune, DEFAULTS);
			this.game.invulnerable = false;
			this.game.auto = false;
			this.game.hitboxes = false;
			this.game.applyTune();
			this.toast("Original balance restored.");
		}
		this.showDev();
	}
	async fullscreen() {
		try {
			if (document.fullscreenElement) await document.exitFullscreen();
			else await document.documentElement.requestFullscreen();
		} catch {
			this.toast("Fullscreen is unavailable in this browser.");
		}
	}
	waiting() {
		this.hideAnnounce();
		this.setScreen(
			"waiting",
			this.panel(
				'<div class="eyebrow">THE BRIGADE IS LINING UP</div><h1>Ready on the roof.</h1><p id="waiting-copy" class="intro">The next shift starts together.</p><p class="small">Move with left stick, A/D, mouse or a drag. Douse with Cross / A, Space, click or a second touch.</p>',
			),
		);
		if ($("hud")) $("hud").hidden = true;
	}
	hubCountdown(t) {
		if (this.screen !== "waiting") return;
		const e = $("waiting-copy");
		if (e)
			e.textContent = Number.isFinite(t)
				? `First delivery in ${Math.max(1, Math.ceil(-t / 1000))}…`
				: "Waiting for the brigade…";
	}
	networkStart(seed) {
		this.clearScreen();
		this.game.invulnerable = false;
		this.game.auto = false;
		this.game.hitboxes = false;
		Object.assign(this.game.tune, DEFAULTS);
		this.game.assist = this.settings.aimAssist || this.input?.last === "touch";
		this.game.start({ mode: "race", seed, difficulty: "arcade" });
		this.attract = false;
		$("attract-label").hidden = true;
		$("hud").hidden = false;
		$("pause-button").hidden = false;
		this.sound.resume();
		this.updateHud();
	}
	showHubEnd() {
		this.setScreen(
			"hub-ended",
			this.panel(
				'<div class="eyebrow">SHIFT COMPLETE</div><h1>That’s a wrap.</h1><p class="intro">Your rooftop report is with the Hub.</p>',
			),
		);
	}
	renderRivals() {
		const parent = $("net-scores");
		if (!parent) return;
		parent.replaceChildren();
		for (const [id, p] of this.net.peers) {
			const row = document.createElement("div");
			row.className = "rival";
			row.style.borderLeft = `6px solid ${p.color}`;
			const name = document.createElement("span");
			name.textContent = p.name;
			const score = document.createElement("b");
			score.textContent = p.score.toLocaleString();
			row.append(name, score);
			parent.append(row);
			if (this.stage && this.game)
				this.stage.updateGhost(
					id,
					{ ...p, visible: p.stage === this.game.wave },
					p.color,
				);
		}
	}
	prompts() {
		const type = this.input?.last || "keyboard",
			pad = type === "pad",
			xbox = this.settings.glyphs === "xbox";
		const move = pad
			? glyph("L", true)
			: type === "touch"
				? "DRAG"
				: `${glyph("A")} ${glyph("D")}`;
		const douse = pad
			? glyph(xbox ? "A" : "×", true)
			: type === "touch"
				? "2ND TOUCH"
				: type === "mouse"
					? glyph("CLICK")
					: glyph("SPACE");
		if ($("control-hint"))
			$("control-hint").innerHTML =
				`<span class="hint-group">${move} MOVE</span><span class="hint-group">${douse} DOUSE</span><span class="hint-group">${pad ? glyph("☰") : glyph("ESC")} MENU</span>`;
		if ($("douse-label")) $("douse-label").innerHTML = `DOUSE ${douse}`;
		if ($("howto-controls"))
			$("howto-controls").innerHTML =
				`<span><b>MOVE</b> ${move}${type === "mouse" ? " / mouse" : ""}</span><span><b>DOUSE</b> ${douse}</span><span><b>MENU</b> ${pad ? glyph("☰") : glyph("ESC")}</span>`;
	}
	announce(over, title, sub, seconds) {
		$("announce-over").textContent = over;
		$("announce-title").textContent = title;
		$("announce-sub").textContent = sub;
		$("announcement").hidden = false;
		this.announceTimer = seconds;
	}
	hideAnnounce(reset = true) {
		$("announcement").hidden = true;
		if (reset) this.announceTimer = 0;
	}
	toast(message) {
		$("toast").textContent = message;
		$("toast").hidden = false;
		this.toastTimer = 3;
	}
	updateHud() {
		const g = this.game;
		if (!g) return;
		$("score").textContent = String(Math.round(g.score)).padStart(6, "0");
		$("best").textContent = Math.max(
			0,
			...this.records.map((r) => r.score),
		).toLocaleString();
		$("wave-number").textContent =
			`SHIFT ${String((g.wave || 0) + 1).padStart(2, "0")} / 06`;
		$("wave-name").textContent = WAVES[g.wave || 0].name;
		$("wave-pips").innerHTML = WAVES.map(
			(_, i) => `<i class="${i <= (g.wave || 0) ? "on" : ""}"></i>`,
		).join("");
		$("douse-fill").style.width = `${g.charge}%`;
		$("douse-button").classList.toggle("ready", g.charge >= 99.9);
		$("douse-tip").textContent =
			g.charge >= 99.9
				? "A little rain, right when you need it."
				: `${Math.round(g.charge)}% · Catches refill the meter.`;
		$("combo").innerHTML =
			`<b>×${g.multiplier || 1}</b> MULTIPLIER<small>${g.combo ? `${g.combo} in a row · Keep it flowing.` : "Center the catch. Stack the score."}</small>`;
		$("dev-indicator").hidden = !g.unranked;
		$("debug-state").hidden = !g.hitboxes;
		if (g.hitboxes)
			$("debug-state").textContent =
				`RAPIER ${g.version}\n${this.stage.backend}\nBodies: ${g.world.bodies.len()}  Bombs: ${g.bombs.length}\nSensors: ${g.players.reduce((s, p) => s + p.buckets, 0)}  Step: 1/120 s\nSeed: ${g.seed}  Time: ${g.elapsed.toFixed(1)} s`;
	}
	updateHitboxes() {
		if (!this.hitboxGroup) {
			this.hitboxGroup = document.createElement("canvas");
			this.hitboxGroup.style =
				"position:fixed;inset:0;pointer-events:none;z-index:3";
			document.body.append(this.hitboxGroup);
		}
		this.hitboxGroup.hidden = !this.game.hitboxes || $("hud").hidden;
		if (this.hitboxGroup.hidden) return;
		const can = this.hitboxGroup;
		can.width = innerWidth;
		can.height = innerHeight;
		const c = can.getContext("2d");
		c.strokeStyle = "#f07848";
		c.lineWidth = 3;
		c.setLineDash([7, 4]);
		const project = (x, y) => {
			const v = this.stage.camera.position.clone();
			v.set(x, y, 0.45).project(this.stage.camera);
			return [((v.x + 1) * innerWidth) / 2, ((1 - v.y) * innerHeight) / 2];
		};
		for (const p of this.game.players)
			for (let j = 0; j < p.buckets; j++) {
				const a = project(
						p.x - this.game.effectiveWidth() / 2,
						1.36 + j * 0.82 + 0.11,
					),
					b = project(
						p.x + this.game.effectiveWidth() / 2,
						1.36 + j * 0.82 - 0.11,
					);
				c.strokeRect(a[0], a[1], b[0] - a[0], b[1] - a[1]);
			}
		for (const b of this.game.bombs) {
			const p = project(b.x, b.y),
				q = project(b.x + 0.29, b.y);
			c.beginPath();
			c.arc(p[0], p[1], Math.abs(q[0] - p[0]), 0, Math.PI * 2);
			c.stroke();
		}
	}
	frame(t) {
		if (!this.ready) return;
		const dt = Math.min(
			0.25,
			this.lastFrame ? (t - this.lastFrame) / 1000 : 1 / 60,
		);
		this.lastFrame = t;
		this.input.poll(t);
		this.net.update(t, this.game.snapshot());
		const runs = !this.screen || this.attract || this.net.roundActive;
		if (runs) {
			this.game.update(dt, this.screen ? [{}, {}] : this.input.controls());
			if (this.announceTimer > 0) {
				this.announceTimer -= dt;
				if (this.announceTimer <= 0) this.hideAnnounce();
			}
		}
		if (this.game.players.length && this.game.phase !== "idle") {
			this.stage.playerState(this.game.players, this.game.effectiveWidth());
			this.stage.updateBombs(this.game.bombs);
		}
		this.stage.render(dt, {
			bomberX:
				this.game.phase === "idle"
					? Math.sin(t * 0.0005) * 0.3
					: this.game.bomberX,
			running: this.game.phase === "playing",
			reduceMotion: this.settings.reduceMotion,
			held: this.game.grace === 0,
		});
		if (t >= this.nextHud) {
			this.nextHud = t + 100;
			this.updateHud();
			this.updateHitboxes();
		}
		this.sound.update();
		if (this.toastTimer > 0) {
			this.toastTimer -= dt;
			if (this.toastTimer <= 0) $("toast").hidden = true;
		}
		if (this.attractRestart && t >= this.attractRestart) {
			this.attractRestart = 0;
			if (this.attract) this.start("solo", true);
		}
		if (
			!this.attract &&
			!this.net.active &&
			!this.net.pc &&
			["title", "howto", "settings", "about", "records", "online"].includes(
				this.screen,
			) &&
			t - this.lastActivity >= 10000
		)
			this.startAttract();
		if (this.net.kind === "rtc" && this.net.startAt && $("waiting-copy"))
			$("waiting-copy").textContent =
				`First delivery in ${Math.max(1, Math.ceil((this.net.startAt - Date.now()) / 1000))}…`;
	}
}
const app = new App();
app.init().catch((e) => {
	console.error(e);
	window.__gameError = String(e.stack || e);
	if (window.AIHub?.active)
		window.AIHub.fail(`Ka-Whoosh could not initialize: ${e.message}`);
	$("loading").innerHTML =
		'<div class="error-panel"><h1>The tubs hit a snag.</h1><p>Use a browser with WebGPU or WebGL 2 enabled, then reload this file.</p><p id="error-detail"></p></div>';
	$("error-detail").textContent = e.message;
});
