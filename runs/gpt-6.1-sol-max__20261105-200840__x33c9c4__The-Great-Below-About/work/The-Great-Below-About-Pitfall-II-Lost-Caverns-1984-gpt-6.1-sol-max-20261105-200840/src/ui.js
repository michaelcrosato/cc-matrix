import FEEDBACK from "../feedback.json";
import {
	CHECKPOINTS,
	DEFAULTS,
	LADDERS,
	PLATFORMS,
	TITLE,
	ZONES,
} from "./game.js";

const $ = (id) => document.getElementById(id);
const comma = (n) => Math.floor(n).toLocaleString("en-US");
const testQuestions = [
	"How many issues did testing catch?",
	"How many were critical or game breaking?",
	"Most helpful test?",
	"Least helpful test?",
];
const engineQuestions = [
	"What did you like most about the engine?",
	"Did you get stuck or guess wrong?",
	"Most important thing you built yourself?",
	"Hardest part of using the engine?",
	"What changed in the engine, and why?",
	"One thing you would change?",
];
const promptQuestions = [
	"What did you like most about the prompt?",
	"What was confusing?",
	"What was hardest?",
	"What would you change?",
];
const esc = (s) =>
	String(s).replace(
		/[&<>"']/g,
		(c) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				c
			],
	);
const button = (action, text, primary = false, n = "") =>
	`<button class="menu-btn menuable ${primary ? "primary" : ""}" data-action="${action}">${n ? `<span class="number">${n}</span>` : ""}<span>${text}</span><span class="arrow">↗</span></button>`;
export class UI {
	constructor(game, audio, network, callbacks) {
		this.game = game;
		this.audio = audio;
		this.network = network;
		this.cb = callbacks;
		this.screen = "title";
		this.stack = [];
		this.input = "keyboard";
		this.tab = 0;
		this.code = "AAAAAA";
		this.settings = {
			glyphs: "ps",
			music: 0.1,
			effects: 0.7,
			assist: false,
			reduced: false,
		};
		this.focused = null;
		this.toastTimer = 0;
		this.zoneTimer = 0;
		this.devUsed = false;
		try {
			Object.assign(
				this.settings,
				JSON.parse(localStorage.getItem("below-about-settings") || "{}"),
			);
		} catch {}
		this.audio.setVolumes(this.settings.music, this.settings.effects);
		$("overlay").addEventListener("click", (e) => {
			const b = e.target.closest("[data-action]");
			if (b) {
				this.cb.activity();
				this.act(b.dataset.action, b);
			}
		});
		$("overlay").addEventListener("pointerover", (e) => {
			const el = e.target.closest(".menuable");
			if (el) this.focus(el, false);
		});
		$("overlay").addEventListener("input", (e) => this.changed(e.target));
		$("overlay").addEventListener("change", (e) => this.changed(e.target));
		$("hud-pause").onclick = () => {
			this.cb.activity();
			this.open("pause");
		};
		$("hud-map").onclick = () => {
			this.cb.activity();
			this.open("map");
		};
		this.render();
	}
	glyph(action) {
		if (this.input === "gamepad") {
			const ps = {
					jump: "×",
					action: "□",
					map: "△",
					back: "○",
					pause: "OPTIONS",
					move: "L",
					confirm: "×",
				},
				xbox = {
					jump: "A",
					action: "X",
					map: "Y",
					back: "B",
					pause: "MENU",
					move: "L",
					confirm: "A",
				};
			return `<span class="key ${this.settings.glyphs === "ps" && action !== "pause" ? "ps" : ""}">${(this.settings.glyphs === "ps" ? ps : xbox)[action]}</span>`;
		}
		return `<span class="key">${{ jump: "Space", action: "E", map: "M", back: "Esc", pause: "Esc", move: "WASD", confirm: "Enter" }[action]}</span>`;
	}
	setInput(input) {
		if (input === this.input) return;
		this.input = input;
		document.body.classList.toggle("touch", input === "touch");
		this.hints();
		if (this.screen === "guide") this.render();
	}
	hints() {
		const el = $("control-hints");
		el.innerHTML = `${this.glyph("jump")} Jump <span>·</span> ${this.glyph("action")} Balloon <span>·</span> ${this.glyph("map")} Map`;
	}
	save() {
		try {
			localStorage.setItem(
				"below-about-settings",
				JSON.stringify(this.settings),
			);
		} catch {}
		this.audio.setVolumes(this.settings.music, this.settings.effects);
		this.hints();
	}
	open(screen) {
		this.stack.push(this.screen);
		this.screen = screen;
		this.render();
		this.cb.screen?.(screen);
	}
	back() {
		this.screen = this.stack.pop() ?? "title";
		this.render();
		this.cb.screen?.(this.screen);
	}
	playing() {
		this.stack = [];
		this.screen = "";
		this.render();
		this.cb.screen?.("");
	}
	title() {
		if (AIHub.active) return;
		this.stack = [];
		this.screen = "title";
		this.render();
		this.cb.screen?.("title");
	}
	panel(title, body, kicker = "EXPEDITION NOTEBOOK", extra = "") {
		return `<div class="scrim"><section class="panel ${extra}" aria-label="${title}"><header class="panel-header"><div><div class="eyebrow">${kicker}</div><h2>${title}</h2></div><button class="back-btn menuable" data-action="back">${this.glyph("back")} Back</button></header><div class="panel-body">${body}</div>${["guide", "credits"].includes(this.screen) ? `<div class="reading-hint">${this.input === "touch" ? "Swipe to read" : this.input === "gamepad" ? "D-pad or right stick to read" : "Arrow keys or PgUp / PgDn to read"}</div>` : ""}</section></div>`;
	}
	render() {
		let html = "";
		if (this.screen === "title")
			html = `<main class="title-screen"><div class="title-content"><div class="brand"><span class="seal">✧</span><span class="eyebrow">THE BRAMBLE EXPEDITION<br>FIELD NOTES · NO. 02</span></div><h1><span>The Great</span><em>Below-About</em></h1><p class="tagline">A little lost. A long way down.</p><nav class="title-menu" aria-label="Main menu">${button("start", "Enter the caverns", true, "01")}${button("online", "Trail race <small>· 1–4 explorers</small>", false, "02")}${button("guide", "Field guide", false, "03")}${button("settings", "Settings", false, "04")}</nav></div><div class="title-stamp">AN UNDERGROUND<br><b>misadventure</b><br>IN FOUR DELIGHTFUL DEPTHS</div><div class="title-note">Probably the way out.<span>↗</span></div><footer class="title-footer"><button class="text-button menuable" data-action="credits">About this expedition ↗</button><span>TAKE YOUR TIME. MIND THE WILDLIFE.</span></footer></main>`;
		if (this.screen === "pause")
			html = this.panel(
				"A breather, below.",
				`<div class="pause-layout"><div>${button("resume", "Back to the adventure", true)}${button("map", "Field map")}${button("guide", "Field guide")}${button("settings", "Settings")}${button("dev", "Developer camp")}${button("rewind", "Return to last lantern")}${AIHub.active ? "" : button("title", "Return to title")}</div><aside class="field-note"><div class="eyebrow">FROM MILO’S NOTEBOOK</div><p>“Pip went to draw a map. Marmalade went after Pip. I went after both of them.<br><br>So far, an excellent system.”</p><div class="note-sign">— Milo Bramble</div></aside></div>`,
				"LANTERN LIT · ADVENTURE PAUSED",
			);
		if (this.screen === "settings")
			html = this.panel(
				"Make yourself at home.",
				`${this.slider("music", "Music", this.settings.music, 0, 1, 0.01, "An original expedition score. Quietly adventurous.")}${this.slider("effects", "Effects & little voices", this.settings.effects, 0, 1, 0.01, "Footsteps, wildlife, discoveries, and cheerful nonsense.")}<div class="setting-row"><label for="glyphs">Controller symbols</label><select id="glyphs" class="menuable" data-setting="glyphs"><option value="ps" ${this.settings.glyphs === "ps" ? "selected" : ""}>PlayStation · × ○ □ △</option><option value="xbox" ${this.settings.glyphs === "xbox" ? "selected" : ""}>Xbox · A B X Y</option></select></div><div class="setting-row"><label>Gentle expedition<small>Safer wildlife, generous jumps, and smaller score penalties.</small></label><button class="toggle menuable" data-action="assist">${this.settings.assist ? "On" : "Off"}</button></div><div class="setting-row"><label>Reduced motion<small>Softens camera movement and removes impact shake.</small></label><button class="toggle menuable" data-action="reduced">${this.settings.reduced ? "On" : "Off"}</button></div><div class="panel-actions"><button class="small-btn menuable" data-action="fullscreen">Toggle fullscreen</button><button class="small-btn menuable" data-action="reset-settings">Reset settings</button></div>`,
				"GEAR & COMFORT",
			);
		if (this.screen === "guide")
			html = this.panel(
				"A few things to pack.",
				`<p class="lead">Find Pip, Marmalade the fox, and the Sunseed Prism. Gold is a bonus. Coming back with everyone is the point.</p><div class="guide-grid"><article class="guide-card"><h3>01 · A running start</h3><p>${this.glyph("move")} Move, climb ladders, swim, and steer balloons. ${this.glyph("jump")} Jump. Hold for a little more height. Six paces of gap? Take a proper run at it.</p></article><article class="guide-card"><h3>02 · No explorer left behind</h3><p>Touch your friends to rescue them. Touch gold to pocket it. Touch a lantern to set your return point. A stumble costs points, but discoveries stay found. There are no lives to run out of.</p></article><article class="guide-card"><h3>03 · Mind the wildlife</h3><p>Leap over scorpions and frogs. Pass under high-flying condors. Swim around electric eels. The cave rat only tolerates a greeting from behind. There’s no fighting—just good timing.</p></article><article class="guide-card"><h3>04 · An inflated sense of direction</h3><p>At the bottom, jump into a balloon’s hanging cord. Steer toward the light. Up rises faster; down rises slower. ${this.glyph("action")} or ${this.glyph("jump")} lets go. Bats can pop the bag. You can always try again.</p></article><article class="guide-card"><h3>05 · Consult the map</h3><p>${this.glyph("map")} opens your field map. The three discoveries and your lantern are marked. ${this.glyph("pause")} takes a breather. Exploration has no time limit in solo play.</p></article><article class="guide-card"><h3>06 · Bring a few shadows</h3><p>Trail races welcome up to four explorers. Each has their own treasure and wildlife. Highest score wins. Open a room and share its six-letter code, or play a session through AI Hub.</p></article><article class="guide-card"><h3>Touch travel</h3><p>Drag anywhere on the left half to move, climb and paddle. Tap the right half or the round action button to jump or drop. The expedition helps with ledge jumps and flotation.</p></article><article class="guide-card"><h3>A modest contract</h3><p>4,000 points to begin. Gold: 5,000 each. Friends: 10,000 each. Prism: 20,000. A very politely approached cave rat: 15,000. Creature contact returns you to a lantern and deducts points by distance.</p></article></div>`,
				"READ THIS BEFORE THE FROGS DO",
			);
		if (this.screen === "map")
			html = this.panel(
				"So far, so below.",
				`${this.map()}<div class="map-key"><span>● You are here</span><span>✧ Lantern</span><span>♙ Pip</span><span>♧ Marmalade</span><span>◇ Sunseed Prism</span></div><p class="map-copy">Down the ladders, across the river, then up the balloon belfry. The caves are connected; you can revisit every ledge.</p>`,
				"THE FIELD MAP · NOT ENTIRELY TO SCALE",
			);
		if (this.screen === "dev") {
			const body = AIHub.active
				? "<p>Expedition tuning is locked during a scored AI Hub session.</p>"
				: `<p>Live expedition tuning. Changes take effect when you return to play. Using these tools marks the local expedition as practice.</p>${Object.entries(
						{
							speed: ["Run speed", 3, 14, 0.1],
							jump: ["Jump strength", 7, 18, 0.1],
							gravity: ["Gravity", 10, 35, 0.5],
							swimSpeed: ["Swim speed", 2, 12, 0.1],
							climbSpeed: ["Climb speed", 2, 12, 0.1],
							balloonSpeed: ["Balloon rise & steering", 1, 9, 0.1],
							enemySpeed: ["Wildlife speed", 0, 2.5, 0.05],
							penalty: ["Score penalty multiplier", 0, 3, 0.1],
						},
					)
						.map(([key, [title, min, max, step]]) =>
							this.slider(
								"dev-" + key,
								title,
								this.game.params[key],
								min,
								max,
								step,
							),
						)
						.join(
							"",
						)}<div class="setting-row"><label>Invincibility</label><button class="toggle menuable" data-action="god">${this.game.invincible ? "On" : "Off"}</button></div><div class="setting-row"><label>Free flight<small>Move through the cavern with the stick or WASD.</small></label><button class="toggle menuable" data-action="noclip">${this.game.noclip ? "On" : "Off"}</button></div>${this.slider("zoom", "Camera zoom", this.cb.getZoom(), 0.65, 1.5, 0.05)}<div class="setting-row"><label for="warp">Warp to lantern</label><select class="menuable" id="warp" data-setting="warp">${CHECKPOINTS.map((c, i) => `<option value="${i}" ${i === this.game.checkpoint ? "selected" : ""}>${i + 1}. ${c.name}</option>`).join("")}</select></div><div class="panel-actions"><button class="small-btn menuable" data-action="warp">Warp & return</button><button class="small-btn menuable" data-action="next-discovery">Next discovery</button><button class="small-btn menuable" data-action="reset-balance">Reset balance</button><button class="small-btn menuable" data-action="restart">Restart expedition</button><button class="small-btn menuable" data-action="single-step">Step 1/60 second</button></div>`;
			html = this.panel(
				"Developer camp.",
				body,
				"PRACTICE TOOLS · LIVE BALANCE",
			);
		}
		if (this.screen === "online") {
			const n = this.network;
			const content = n.active
				? `<p class="lead">${n.host ? "Share this code with your fellow explorers." : "You’re on the expedition."}</p><div class="room-code">${esc(n.code)}</div><div class="room-members" id="room-members"></div><div class="online-status" id="online-status"></div><div class="panel-actions">${n.host ? '<button class="small-btn menuable" data-action="race-start">Start trail race ↗</button>' : ""}<button class="small-btn menuable" data-action="room-leave">Leave room</button></div>`
				: `<p class="lead">Same caves. Separate treasure. Excellent company.</p><p>Race up to three other explorers. Friends appear as shadows on the trail. Your discoveries are your own; the best expedition score wins.</p><div class="panel-actions"><button class="small-btn menuable" data-action="room-create">Create an expedition</button><button class="small-btn menuable" data-action="room-code">Join with a code</button></div><p class="map-copy">Internet rooms use a public PeerJS signaling relay. Two tabs on the same device can also meet locally. Keep this screen open until everyone joins.</p>`;
			html = this.panel(
				"A little company, below.",
				content,
				"TRAIL RACE · 1–4 EXPLORERS",
			);
		}
		if (this.screen === "code")
			html = this.panel(
				"Which expedition?",
				`<p>Enter the six-letter code your trail leader shared.</p><input class="code-input menuable" id="room-code" value="${this.code}" maxlength="6" aria-label="Expedition code" autocomplete="off" spellcheck="false"><div class="code-letters">${[...this.code].map((c, i) => `<button class="code-letter menuable" data-action="code-letter" data-index="${i}" aria-label="Code letter ${i + 1}, ${c}">${c}</button>`).join("")}</div><p class="map-copy">With a controller: choose a letter, then use left/right to change it.</p><div class="panel-actions"><button class="small-btn menuable" data-action="room-join">Join expedition ↗</button></div>`,
				"SIX LETTERS · MANY WRONG TURNS",
			);
		if (this.screen === "credits") {
			const tabs = [
				"Source Information",
				"Testing Feedback",
				"Engine Feedback",
				"Prompt Feedback",
			];
			let content = "";
			if (this.tab === 0)
				content = `<dl class="credit-list">${Object.entries(
					FEEDBACK.sourceInformation,
				)
					.map(
						([k, v]) =>
							`<dt>${esc(k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()))}</dt><dd>${esc(v)}</dd>`,
					)
					.join(
						"",
					)}</dl><p class="map-copy">Original characters, cave layout, models and music. An affectionate response to David Crane’s expedition, not an official Pitfall game. Three.js (MIT), Rapier (Apache-2.0), PeerJS (MIT), and AI Hub client licenses are included in this file’s source.</p>${AIHub.active ? "" : `<div class="research-links"><a href="https://atariage.com/manual_html_page.php?SoftwareLabelID=359" target="_blank" rel="noreferrer">1984 manual ↗</a><a href="https://atariage.com/screenshot_page.php?SoftwareLabelID=359" target="_blank" rel="noreferrer">Source screenshots ↗</a><a href="https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub" target="_blank" rel="noreferrer">AI Hub protocol ↗</a></div>`}`;
			else {
				const questions = [[], testQuestions, engineQuestions, promptQuestions][
						this.tab
					],
					answers = [
						[],
						FEEDBACK.testingFeedback,
						FEEDBACK.engineFeedback,
						FEEDBACK.promptFeedback,
					][this.tab];
				content = `<ol class="feedback-list">${questions.map((q, i) => `<li><strong>${q}</strong>${esc(answers[i])}</li>`).join("")}</ol>`;
			}
			html = this.panel(
				"About this expedition.",
				`<nav class="credits-tabs">${tabs.map((t, i) => `<button class="tab menuable ${this.tab === i ? "active" : ""}" data-action="credit-tab" data-index="${i}">${t}</button>`).join("")}</nav>${content}`,
				"A NOTE FROM BELOW",
			);
		}
		if (this.screen === "win") {
			const s = this.game.snapshot(),
				minutes = Math.floor(s.finishTime / 60),
				secs = Math.floor(s.finishTime % 60)
					.toString()
					.padStart(2, "0");
			const rank =
				s.gold === s.goldTotal && s.deaths === 0
					? "THE IMPECCABLY PREPARED"
					: s.deaths === 0
						? "THE SURE-FOOTED SOCIETY"
						: s.gold >= 14
							? "THE GOLDEN BOOT CLUB"
							: "THE SLIGHTLY LOST SOCIETY";
			html = `<div class="scrim"><section class="panel win-panel"><div class="panel-body"><div class="win-seal">✧</div><div class="eyebrow">EXPEDITION COMPLETE</div><h2>Found, all around.</h2><p class="lead">Two friends. One very shiny rock.<br>A perfectly good reason to have gone below.</p><div class="win-score">${comma(s.score)}</div><div class="eyebrow">${this.devUsed ? "PRACTICE EXPEDITION" : rank}</div><div class="win-stats"><span><b>${s.gold} / ${s.goldTotal}</b>GOLD FOUND</span><span><b>${s.deaths}</b>STUMBLES</span><span><b>${minutes}:${secs}</b>TIME BELOW</span></div>${this.network.active && !AIHub.active ? '<div id="race-results" class="race-results" aria-label="Live race standings"></div>' : ""}<div class="panel-actions">${AIHub.active ? '<span class="lead">Waiting for the other explorers…</span>' : `<button class="small-btn menuable" data-action="continue">Keep exploring</button>${!this.network.active || this.network.host ? '<button class="small-btn menuable" data-action="restart">Another expedition</button>' : ""}<button class="small-btn menuable" data-action="title">Return to camp</button>`}</div></div></section></div>`;
		}
		if (this.screen === "hub-wait")
			html =
				'<div class="hub-wait"><strong>The Great Below-About</strong><p>Packing the expedition. The trail opens together.</p></div>';
		if (this.screen === "hub-end")
			html =
				'<div class="hub-wait"><strong>Lanterns out.</strong><p>The expedition has returned to camp.</p></div>';
		$("overlay").innerHTML = html;
		this.focused = null;
		this.hints();
		const first =
			$("overlay").querySelector(
				".panel-body .menuable,.title-menu .menuable",
			) || $("overlay").querySelector(".menuable");
		if (first) this.focus(first, false);
		this.updateRoom();
		this.updateMap();
	}
	slider(key, title, value, min, max, step, note = "") {
		const percent = key === "music" || key === "effects";
		return `<div class="setting-row"><label for="${key}">${title}${note ? `<small>${note}</small>` : ""}</label><div class="setting-control"><input id="${key}" class="menuable" type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-setting="${key}"><output for="${key}">${percent ? Math.round(value * 100) + "%" : Number(value).toFixed(value % 1 ? 2 : 0)}</output></div></div>`;
	}
	changed(el) {
		const key = el.dataset.setting;
		if (el.id === "room-code") {
			this.code = el.value
				.toUpperCase()
				.replace(/[^A-Z2-9]/g, "")
				.slice(0, 6)
				.padEnd(6, "A");
			$("overlay")
				.querySelectorAll(".code-letter")
				.forEach((b, i) => {
					b.textContent = this.code[i];
				});
			return;
		}
		if (!key) return;
		const value = Number(el.value);
		if (key.startsWith("dev-")) {
			this.game.params[key.slice(4)] = value;
			this.devUsed = true;
		} else if (key === "zoom") this.cb.zoom(value);
		else if (key === "music" || key === "effects") {
			this.settings[key] = value;
			this.save();
		} else if (key === "glyphs") {
			this.settings.glyphs = el.value;
			this.save();
		}
		const o = el.parentElement.querySelector("output");
		if (o)
			o.textContent =
				key === "music" || key === "effects"
					? Math.round(value * 100) + "%"
					: Number(value).toFixed(value % 1 ? 2 : 0);
	}
	focus(el, scroll = true) {
		if (!el) return;
		this.focused?.classList.remove("focused");
		this.focused = el;
		el.classList.add("focused");
		if (scroll) el.scrollIntoView({ block: "nearest", behavior: "instant" });
	}
	scroll(amount) {
		const body = $("overlay").querySelector(".panel-body");
		if (body) body.scrollBy({ top: amount, behavior: "instant" });
	}
	navigate(dir) {
		const elements = [...$("overlay").querySelectorAll(".menuable")].filter(
			(el) => !el.disabled,
		);
		if (!elements.length) return;
		const index = elements.indexOf(this.focused);
		const body = $("overlay").querySelector(".panel-body");
		if (body && ["guide", "credits"].includes(this.screen)) {
			const remaining = body.scrollHeight - body.clientHeight - body.scrollTop;
			if (
				(dir > 0 && remaining > 3 && index === elements.length - 1) ||
				(dir < 0 && body.scrollTop > 3)
			) {
				this.scroll(dir * body.clientHeight * 0.7);
				return;
			}
		}
		this.focus(elements[(index + dir + elements.length) % elements.length]);
		this.audio.event("menu");
	}
	adjust(dir) {
		const el = this.focused;
		if (!el) return;
		if (el.type === "range") {
			if (dir > 0) el.stepUp();
			else el.stepDown();
			this.changed(el);
		} else if (el.tagName === "SELECT") {
			el.selectedIndex =
				(el.selectedIndex + dir + el.options.length) % el.options.length;
			this.changed(el);
		} else if (el.dataset.action === "code-letter") {
			this.changeLetter(Number(el.dataset.index), dir);
		} else this.navigate(dir);
	}
	changeLetter(i, dir) {
		const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789",
			a = [...this.code];
		a[i] = chars[(chars.indexOf(a[i]) + dir + chars.length) % chars.length];
		this.code = a.join("");
		const input = $("room-code");
		if (input) input.value = this.code;
		$("overlay")
			.querySelectorAll(".code-letter")
			.forEach((b, j) => {
				b.textContent = this.code[j];
			});
	}
	confirm() {
		if (this.focused?.tagName === "INPUT" && this.focused.type !== "range") {
			if (this.screen === "code") this.act("room-join");
			else this.focused.focus();
		} else this.focused?.click();
	}
	act(action, el) {
		this.audio.event("menu");
		if (
			["guide", "settings", "credits", "map", "dev", "online"].includes(action)
		) {
			this.open(action);
			return;
		}
		if (action === "back") {
			this.back();
			return;
		}
		if (action === "resume") {
			this.playing();
			return;
		}
		if (action === "start") {
			this.cb.start();
			return;
		}
		if (action === "title") {
			this.network.close();
			this.cb.title();
			return;
		}
		if (action === "assist" || action === "reduced") {
			if (AIHub.active && action === "assist") {
				this.toast("Gentle expedition is locked in scored sessions.");
				return;
			}
			this.settings[action] = !this.settings[action];
			this.save();
			this.render();
			return;
		}
		if (action === "reset-settings") {
			this.settings = {
				glyphs: "ps",
				music: 0.1,
				effects: 0.7,
				assist: false,
				reduced: false,
			};
			this.save();
			this.render();
			return;
		}
		if (action === "fullscreen") {
			const promise = document.fullscreenElement
				? document.exitFullscreen()
				: document.documentElement.requestFullscreen();
			promise?.catch(() =>
				this.toast("Fullscreen is unavailable in this browser."),
			);
			return;
		}
		if (action === "credit-tab") {
			this.tab = Number(el.dataset.index);
			this.render();
			return;
		}
		if (action === "room-create") {
			this.network.create();
			this.render();
			return;
		}
		if (action === "room-code") {
			this.open("code");
			return;
		}
		if (action === "code-letter") {
			this.changeLetter(Number(el.dataset.index), 1);
			return;
		}
		if (action === "room-join") {
			this.network.join(this.code);
			this.screen = "online";
			this.stack = this.stack.filter((s) => s !== "online");
			this.render();
			return;
		}
		if (action === "room-leave") {
			this.network.close();
			this.render();
			return;
		}
		if (action === "race-start") {
			this.network.begin();
			return;
		}
		if (action === "continue") {
			this.playing();
			return;
		}
		if (action === "rewind") {
			this.game.checkpointWarp(this.game.checkpoint);
			this.cb.snap();
			this.playing();
			return;
		}
		if (AIHub.active) return;
		if (action === "god") {
			this.game.invincible = !this.game.invincible;
			this.devUsed = true;
			this.render();
		}
		if (action === "noclip") {
			this.game.noclip = !this.game.noclip;
			this.devUsed = true;
			this.render();
		}
		if (action === "reset-balance") {
			Object.assign(this.game.params, DEFAULTS);
			this.game.invincible = false;
			this.game.noclip = false;
			this.cb.zoom(1);
			this.render();
		}
		if (action === "warp") {
			this.devUsed = true;
			this.game.checkpointWarp(Number($("warp").value));
			this.cb.snap();
			this.playing();
		}
		if (action === "next-discovery") {
			this.devUsed = true;
			const r = this.game.rescued;
			const [x, y] = !r.pip ? [9, -11.1] : !r.fox ? [1, -25.1] : [87, 4.9];
			this.game.teleport(x, y);
			this.cb.snap();
			this.playing();
		}
		if (action === "restart") {
			if (this.network.active && this.network.host) this.network.begin();
			else this.cb.start();
		}
		if (action === "single-step") {
			this.devUsed = true;
			this.game.tick(1 / 60, {});
			this.toast("Advanced one physics step.");
		}
	}
	map() {
		const xx = (x) => (x + 14) * 8,
			yy = (y) => (12 - y) * 7;
		const s = this.game.snapshot();
		return `<div class="map-shell"><svg viewBox="0 0 900 430" role="img" aria-label="Cavern map showing connected platforms, ladders, river, balloon shaft, and three discoveries"><defs><pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 8L8 0" stroke="#607c6c" stroke-opacity=".2"/></pattern></defs><rect width="900" height="430" fill="#cdd3ac"/><rect width="900" height="430" fill="url(#hatch)"/><path d="M${xx(3)} ${yy(1)} L${xx(34)} ${yy(1)} V${yy(-11)} H${xx(8)} H${xx(54)} V${yy(-25)} H${xx(0)} L${xx(-4)} ${yy(-25)} V${yy(-39)} H${xx(74)} V${yy(5)} H${xx(88)}" fill="none" stroke="#84967a" stroke-width="2" stroke-dasharray="4 5"/><rect x="${xx(5)}" y="${yy(-26)}" width="${37 * 8}" height="${6 * 7}" fill="#7caeaa" opacity=".9"/>${PLATFORMS.map(([a, b, y, h, k]) => `<rect x="${xx(a)}" y="${yy(y)}" width="${(b - a) * 8}" height="${h * 7}" rx="2" fill="${k === "gold" ? "#8b8c65" : k === "loft" ? "#b39559" : "#527f70"}" stroke="#2e5552" stroke-width="1.5"/>`).join("")}${LADDERS.map((l) => `<path d="M${xx(l.x) - 3} ${yy(l.hi)} V${yy(l.lo)} M${xx(l.x) + 3} ${yy(l.hi)} V${yy(l.lo)}" stroke="#ad7d43" stroke-width="2"/>`).join("")}${CHECKPOINTS.map((c, i) => `<text x="${xx(c.x)}" y="${yy(c.y) - 4}" fill="${s.checkpoint === i ? "#bb7529" : "#f4e7b4"}" font-size="17" text-anchor="middle">✧</text>`).join("")}<g fill="#345c58" font-family="Georgia" font-size="16"><text x="${xx(0)}" y="${yy(6)}">FERNFALL PORCH</text><text x="${xx(4)}" y="${yy(-7)}">FROGSTEP GALLERIES</text><text x="${xx(9)}" y="${yy(-23)}">INKFIN RIVER</text><text x="${xx(22)}" y="${yy(-36)}">BALLOON BELFRY</text><text x="${xx(69)}" y="${yy(10)}">SUNSEED LOFT</text></g><path d="M${xx(75)} ${yy(-35)} V${yy(-5)} l-4 8 m4-8 4 8" fill="none" stroke="#ba8845" stroke-width="2"/><g font-family="Georgia" font-size="25" text-anchor="middle" fill="#a36929"><text x="${xx(8)}" y="${yy(-10)}">${s.rescued.pip ? "✓" : "♙"}</text><text x="${xx(0.4)}" y="${yy(-24)}">${s.rescued.fox ? "✓" : "♧"}</text><text x="${xx(88)}" y="${yy(6)}">${s.rescued.prism ? "✓" : "◇"}</text></g><circle id="map-player" cx="${xx(s.x)}" cy="${yy(s.y)}" r="5.5" fill="#da684a" stroke="#fff2cb" stroke-width="2"/><text x="860" y="410" text-anchor="end" font-family="Georgia" font-size="13" fill="#6f886f">Bramble Expedition · Field sketch 02</text></svg></div>`;
	}
	updateMap() {
		const p = this.game.position,
			m = $("map-player");
		if (m) {
			m.setAttribute("cx", (p.x + 14) * 8);
			m.setAttribute("cy", (12 - p.y) * 7);
		}
	}
	updateRoom() {
		if (this.screen !== "online") return;
		const members = $("room-members"),
			status = $("online-status");
		if (members) {
			members.replaceChildren();
			for (const p of this.network.roster.values()) {
				const d = document.createElement("div");
				d.className = "room-member";
				d.style.borderColor = p.color;
				d.textContent =
					p.name + (String(p.id) === String(this.network.me) ? " · you" : "");
				members.append(d);
			}
		}
		if (status) status.textContent = this.network.error || this.network.status;
	}
	toast(text, duration = 3.5) {
		clearTimeout(this.toastTimer);
		$("toast").hidden = false;
		$("toast").innerHTML = text;
		$("toast").classList.add("show");
		this.toastTimer = setTimeout(
			() => $("toast").classList.remove("show"),
			duration * 1000,
		);
	}
	zone(z) {
		if (!z) return;
		$("zone-banner").hidden = false;
		clearTimeout(this.zoneTimer);
		$("zone-index").textContent =
			"FIELD NOTE " +
			String(ZONES.findIndex((a) => a.id === z.id) + 1).padStart(2, "0");
		$("zone-title").textContent = z.title;
		$("zone-sub").textContent = z.sub;
		$("zone-banner").classList.add("show");
		this.zoneTimer = setTimeout(
			() => $("zone-banner").classList.remove("show"),
			3800,
		);
	}
	update(s, attract = false) {
		$("hud").hidden =
			this.screen === "title" ||
			this.screen === "hub-wait" ||
			this.screen === "hub-end" ||
			attract;
		$("demo-banner").hidden = !attract;
		$("touch-ui").hidden =
			this.input !== "touch" || this.screen !== "" || attract;
		for (const kind of ["pip", "fox", "prism"])
			$("obj-" + kind).classList.toggle("done", s.rescued[kind]);
		$("score").textContent = comma(s.score);
		$("gold").textContent = s.gold + " / " + s.goldTotal;
		$("zone-name").textContent =
			ZONES.find((z) => z.id === s.zone)?.title || "The caverns";
		$("objective-hint").textContent = !s.rescued.pip
			? "Find Pip in the galleries below."
			: !s.rescued.fox
				? "Marmalade is across the Inkfin River."
				: !s.rescued.prism
					? "Ride the balloon to the Sunseed Prism."
					: "Everyone found. Every ledge still awaits.";
		let hint = "";
		if (s.carry)
			hint = this.glyph("action") + " Let go · steer toward the ledge";
		else if (s.mode === "climb")
			hint = this.glyph("move") + " Climb · move sideways to leave";
		else if (s.mode === "swim")
			hint =
				this.glyph("move") +
				" Swim · " +
				this.glyph("jump") +
				" leap from the water";
		else if (Math.abs(s.x - 74) < 4 && s.y < -35)
			hint = this.glyph("jump") + " Catch the balloon’s cord";
		else if (s.time < 9)
			hint =
				this.glyph("move") +
				" Explore · " +
				this.glyph("jump") +
				" jump the gap";
		const h = $("context-hint");
		h.innerHTML = hint;
		h.classList.toggle("show", !!hint && this.screen === "" && !attract);
		$("touch-action").textContent = s.carry ? "↓" : "↑";
		$("touch-action").setAttribute(
			"aria-label",
			s.carry ? "Release balloon" : "Jump",
		);
		$("trail-standings").replaceChildren();
		if (this.network.active) {
			for (const g of this.network.getGhosts()) {
				const d = document.createElement("div");
				d.style.borderColor = g.color;
				d.textContent =
					g.name + " · " + comma(g.score) + " · " + g.found + "/3";
				$("trail-standings").append(d);
			}
		}
		const race = $("race-results");
		if (race) {
			const me = this.network.roster.get(this.network.me);
			const rows = [
				{
					name: me?.name || "You",
					color: me?.color || "#f5bf63",
					score: s.score,
					found: Object.values(s.rescued).filter(Boolean).length,
					finished: s.finished,
				},
				...this.network.getGhosts(),
			].sort((a, b) => b.score - a.score);
			race.replaceChildren();
			rows.forEach((row, i) => {
				const d = document.createElement("div");
				d.style.borderColor = row.color;
				d.textContent =
					i +
					1 +
					". " +
					row.name +
					" · " +
					comma(row.score) +
					" · " +
					(row.finished ? "Home" : row.found + "/3 found");
				race.append(d);
			});
		}
		this.updateMap();
	}
}
