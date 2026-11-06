const esc = (s) =>
	String(s ?? "").replace(
		/[&<>"']/g,
		(c) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				c
			],
	);
const QUESTIONS = {
	testingFeedback: [
		"How many issues did testing catch?",
		"How many were critical or game breaking?",
		"What was the most helpful test?",
		"What was the least helpful test?",
	],
	engineFeedback: [
		"What did you like most about the engine?",
		"Did you get stuck or guess wrong?",
		"What was the most important thing you built yourself?",
		"What was the hardest part about the engine?",
		"What did you change in the engine, and why?",
		"If you could change one thing about the engine?",
	],
	promptFeedback: [
		"What did you like most about this prompt?",
		"What was confusing?",
		"What was the hardest thing to do?",
		"What would you change in this prompt?",
	],
};
const DEFAULTS = {
	music: 0.1,
	sfx: 0.6,
	glyphs: "playstation",
	assist: false,
	reducedMotion: false,
	speed: 6.2,
	gravity: 22,
	jump: 10.5,
	swim: 4.5,
	hazard: 1,
	camera: 22,
	god: false,
};

export class GameUI {
	constructor(callbacks = {}, metadata = {}) {
		this.callbacks =
			typeof callbacks === "function" ? { onAction: callbacks } : callbacks;
		this.metadata = metadata;
		this.settings = { ...DEFAULTS };
		this._screen = "loading";
		this.input = "keyboard";
		this.focusIndex = 0;
		this.padCooldown = 0;
		this.padButtons = [];
		this.aboutPage = "guide";
		this.payload = {};
		this.hud = {};
		this.root = document.createElement("div");
		this.root.id = "game-ui";
		this.root.innerHTML = `<div class="ui-vignette" aria-hidden="true"></div><div id="hud" hidden></div><button class="corner-menu" aria-label="Pause game" hidden>Ⅱ</button><main id="menu-screen"></main><div id="toast" role="status" aria-live="polite"></div><div id="network-status" role="status"></div><div id="input-hint"></div><div id="loader"><div class="loader-mark">P<span>↓</span></div><p>UNFOLDING THE UNDERSTORY</p><div class="loader-track"><i></i></div><small>Lighting the lanterns…</small></div>`;
		document.body.appendChild(this.root);
		this.menu = this.root.querySelector("#menu-screen");
		this.hudElement = this.root.querySelector("#hud");
		this.pauseButton = this.root.querySelector(".corner-menu");
		this.pauseButton.onclick = () => this.action("pause");
		this.hudElement.addEventListener("pointerdown", (e) => {
			if (
				e.pointerType === "touch" &&
				e.target.closest("[data-touch-action]")
			) {
				e.preventDefault();
				this.suppressTouchContextClickUntil = performance.now() + 800;
				this.action("interact");
			}
		});
		this.hudElement.addEventListener("click", (e) => {
			if (!e.target.closest("[data-touch-action]")) return;
			if (
				e.pointerType === "touch" ||
				(!e.pointerType &&
					e.detail > 0 &&
					performance.now() < (this.suppressTouchContextClickUntil || 0))
			)
				return;
			this.action("interact");
		});
		this.menu.addEventListener("click", (e) => {
			const button = e.target.closest("[data-action]");
			if (button && !button.disabled) this.activate(button);
		});
		this.menu.addEventListener("input", (e) => {
			const el = e.target;
			if (!el.dataset.setting) return;
			const value =
				el.type === "checkbox"
					? el.checked
					: el.type === "range"
						? Number(el.value)
						: el.value;
			this.settings[el.dataset.setting] = value;
			const out = el.closest(".setting-row")?.querySelector("output");
			if (out) out.textContent = this.formatValue(el.dataset.setting, value);
			this.action(el.dataset.callback || el.dataset.setting, value);
		});
		this.menu.addEventListener("change", (e) => {
			if (e.target.tagName === "SELECT")
				e.target.dispatchEvent(new Event("input", { bubbles: true }));
		});
		this.menu.addEventListener("pointermove", (e) => {
			const el = e.target.closest("button,input,select,textarea");
			if (el && document.activeElement !== el) {
				el.focus({ preventScroll: true });
				this.focusIndex = this.focusables().indexOf(el);
			}
		});
		document.addEventListener("keydown", (e) => this.key(e));
		this.show("loading");
	}
	get screen() {
		return this._screen;
	}
	action(name, value) {
		this.callbacks.onAction?.(name, value);
	}
	activate(el) {
		const a = el.dataset.action;
		if (a?.startsWith("about:")) {
			this.aboutPage = a.slice(6);
			this.render();
			return;
		}
		if (a === "coop:connect")
			this.action(a, this.menu.querySelector("#networkCode")?.value || "");
		else if (a === "coop:join")
			this.action(a, this.menu.querySelector("#roomCode")?.value || "");
		else this.action(a, el.dataset.value);
	}
	show(screen, payload = {}) {
		if (
			screen === "game" ||
			screen === "playing" ||
			screen === "play" ||
			screen === "none"
		)
			screen = "game";
		this._screen = screen;
		this.payload = payload;
		if (payload.settings) Object.assign(this.settings, payload.settings);
		if (payload.dev) Object.assign(this.settings, payload.dev);
		this.root.dataset.screen = screen;
		this.root.classList.toggle(
			"in-game",
			screen === "game" || screen === "attract",
		);
		this.render();
	}
	setMetadata(metadata) {
		this.metadata = metadata;
		if (this._screen === "about") this.render();
	}
	setInput(mode, glyphStyle) {
		this.input = mode;
		if (glyphStyle) this.settings.glyphs = glyphStyle;
		this.root.dataset.input = mode;
		this.updateHints();
	}
	setStatus(text) {
		this.root.querySelector("#network-status").textContent = text || "";
	}
	setNetwork(data = {}) {
		Object.assign(this.payload, data);
		const code = this.menu.querySelector("#networkCode");
		if (code && data.code !== undefined) code.value = data.code;
		const stat = this.menu.querySelector(".coop-status");
		if (stat && data.status) stat.textContent = data.status;
		this.setStatus(data.status || "");
	}
	setLoading(progress, message) {
		const loader = this.root.querySelector("#loader");
		loader.hidden = progress >= 1;
		loader.querySelector("i").style.width = `${Math.max(2, progress * 100)}%`;
		if (message) loader.querySelector("small").textContent = message;
	}
	focusables() {
		return [
			...this.menu.querySelectorAll(
				'button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]',
			),
		].filter((el) => el.offsetParent !== null);
	}
	focus(index) {
		const f = this.focusables();
		if (!f.length) return;
		this.focusIndex = (index + f.length) % f.length;
		f[this.focusIndex].focus({ preventScroll: true });
		f[this.focusIndex].scrollIntoView({
			block: "nearest",
			behavior: "instant",
		});
	}
	key(e) {
		if (
			this._screen === "game" ||
			this._screen === "attract" ||
			this._screen === "loading"
		)
			return;
		const typing =
			["TEXTAREA", "INPUT"].includes(e.target?.tagName) &&
			e.target.type !== "range" &&
			e.target.type !== "checkbox";
		if (typing && e.key !== "Escape") return;
		if (e.key === "Escape" || e.key === "Backspace") {
			e.preventDefault();
			this.action("back");
			return;
		}
		if (
			(e.key === "PageDown" || e.key === "PageUp") &&
			this.menu.querySelector(".about-content")
		) {
			e.preventDefault();
			this.menu
				.querySelector(".about-content")
				.scrollBy(0, (e.key === "PageDown" ? 1 : -1) * 250);
			return;
		}
		if (e.key === "ArrowDown" || e.key === "ArrowUp") {
			e.preventDefault();
			this.focus(this.focusIndex + (e.key === "ArrowDown" ? 1 : -1));
		} else if (
			(e.key === "ArrowLeft" || e.key === "ArrowRight") &&
			e.target?.type !== "range" &&
			e.target?.tagName !== "SELECT"
		) {
			e.preventDefault();
			this.focus(this.focusIndex + (e.key === "ArrowRight" ? 1 : -1));
		} else if (e.key === "Enter" && e.target?.tagName === "MAIN") {
			e.preventDefault();
			this.focus(0);
		}
	}
	handlePad(pad, dt = 0.016) {
		if (!pad) return;
		this.padCooldown = Math.max(0, this.padCooldown - dt);
		const b = (i) => !!pad.buttons?.[i]?.pressed;
		const pressed = (i) => b(i) && !this.padButtons[i];
		const menu =
			this._screen !== "game" &&
			this._screen !== "attract" &&
			this._screen !== "loading";
		if (menu) {
			const scroll = this.menu.querySelector(".about-content");
			if (scroll) {
				const scrollAxis = pad.axes?.[3] || 0;
				const trigger =
					(pad.buttons?.[7]?.value || 0) - (pad.buttons?.[6]?.value || 0);
				if (Math.abs(scrollAxis) > 0.2 || Math.abs(trigger) > 0.15)
					scroll.scrollTop +=
						(Math.abs(scrollAxis) > 0.2 ? scrollAxis : trigger) * dt * 650;
			}
			let v = (b(13) ? 1 : 0) - (b(12) ? 1 : 0);
			if (Math.abs(pad.axes?.[1] || 0) > 0.55) v = Math.sign(pad.axes[1]);
			let h = (b(15) ? 1 : 0) - (b(14) ? 1 : 0);
			if (Math.abs(pad.axes?.[0] || 0) > 0.55) h = Math.sign(pad.axes[0]);
			if ((v || h) && !this.padCooldown) {
				const el = document.activeElement;
				if (h && el?.type === "range") {
					el.value = Number(el.value) + h * Number(el.step || 1);
					el.dispatchEvent(new Event("input", { bubbles: true }));
				} else if (h && el?.tagName === "SELECT") {
					el.selectedIndex = Math.max(
						0,
						Math.min(el.options.length - 1, el.selectedIndex + h),
					);
					el.dispatchEvent(new Event("input", { bubbles: true }));
				} else this.focus(this.focusIndex + (v || h));
				this.padCooldown = 0.18;
			}
			if (pressed(0)) {
				const el = document.activeElement;
				if (el?.type === "checkbox") {
					el.checked = !el.checked;
					el.dispatchEvent(new Event("input", { bubbles: true }));
				} else if (el?.dataset.action) this.activate(el);
				else if (!el || !this.menu.contains(el)) {
					this.focus(0);
					const first = document.activeElement;
					if (first?.dataset.action) this.activate(first);
				}
			}
			if (pressed(1)) this.action("back");
		}
		this.padButtons = Array.from({ length: 17 }, (_, i) => b(i));
	}
	button(label, action, extra = "", primary = false) {
		return `<button class="menu-button ${primary ? "primary" : ""}" data-action="${action}" ${extra}><span>${label}</span><i aria-hidden="true">↗</i></button>`;
	}
	header(kicker, title, description = "") {
		return `<header class="panel-header"><span class="eyebrow">${kicker}</span><h1>${title}</h1>${description ? `<p>${description}</p>` : ""}</header>`;
	}
	shell(body, cls = "") {
		return `<section class="menu-panel ${cls}">${body}</section>`;
	}
	render() {
		const s = this._screen;
		this.menu.hidden = ["game", "attract", "loading"].includes(s);
		this.hudElement.hidden = !["game", "attract"].includes(s);
		this.pauseButton.hidden = s !== "game";
		this.root.querySelector("#loader").hidden = s !== "loading";
		this.menu.className = s === "title" ? "title-menu" : "overlay-menu";
		if (s === "title")
			this.menu.innerHTML = `<section class="title-content"><div class="expedition-seal"><span>↓</span><div>THE LOST CAVERNS SOCIETY<small>EXPEDITION NO. 02 &nbsp; / &nbsp; 1984 → NOW</small></div></div><div class="title-lockup"><span class="title-riff">Pitfall<span class="title-hyphen">-ish</span></span><h1>THE<br><em>UNDERSTORY</em></h1></div><p class="title-tagline">Some treasures have legs.<br>Best bring them home.</p><nav class="title-actions">${this.button("Begin expedition", "start", "", true)}${this.button("Co-op camp", "coop")}${this.button("Settings", "settings")}${this.button("Field guide & credits", "about")}</nav><div class="title-bottom"><span class="small-diamond">◆</span> A CAVERN ADVENTURE FOR 1–2 EXPLORERS</div></section><aside class="title-side-note"><span>FIELD NOTE 01</span><p>Mind the frogs.<br>Trust the balloons.</p><i>↘</i></aside>`;
		else if (s === "pause")
			this.menu.innerHTML = this.shell(
				this.header(
					"TAKE A BREATHER",
					"Lantern still lit.",
					"The caverns can wait a moment.",
				) +
					`<nav>${this.button("Keep exploring", "resume", "", true)}${this.button("Field map", "map")}${this.button("Settings", "settings")}${this.button("Developer tools", "dev")}${this.button("Field guide & credits", "about")}${this.button("Return to title", "title")}</nav>`,
				"compact-panel",
			);
		else if (s === "settings") this.menu.innerHTML = this.settingsScreen();
		else if (s === "dev") this.menu.innerHTML = this.devScreen();
		else if (s === "about") this.menu.innerHTML = this.aboutScreen();
		else if (s === "map") this.menu.innerHTML = this.mapScreen();
		else if (s === "coop") this.menu.innerHTML = this.coopScreen();
		else if (s === "victory") this.menu.innerHTML = this.victoryScreen();
		else if (s === "error")
			this.menu.innerHTML = this.shell(
				this.header(
					"A SNAG IN THE ROPE",
					"Couldn’t light the lantern.",
					esc(this.payload.message || "The graphics engine could not start."),
				) +
					`<p class="muted">Use a browser with WebGPU or WebGL 2 support. Reload the file with browser graphics enabled.</p>${this.button("Try again", "reload", "", true)}`,
			);
		else this.menu.innerHTML = "";
		this.focusIndex = 0;
		if (!this.menu.hidden) this.focus(0);
		this.updateHints();
	}
	formatValue(key, value) {
		return key === "music" || key === "sfx"
			? `${Math.round(value * 100)}%`
			: key === "hazard"
				? `${Number(value).toFixed(1)}×`
				: Number(value).toFixed(key === "gravity" || key === "camera" ? 0 : 1);
	}
	range(label, key, min, max, step, detail = "", dev = false) {
		const v = this.settings[key];
		return `<label class="setting-row"><span class="setting-copy"><strong>${label}</strong>${detail ? `<small>${detail}</small>` : ""}</span><span class="range-control"><input aria-label="${label}" type="range" min="${min}" max="${max}" step="${step}" value="${v}" data-setting="${key}" data-callback="${dev ? "dev:" : ""}${key}"><output>${this.formatValue(key, v)}</output></span></label>`;
	}
	toggle(label, key, detail = "", dev = false) {
		return `<label class="setting-row"><span class="setting-copy"><strong>${label}</strong><small>${detail}</small></span><input aria-label="${label}" type="checkbox" ${this.settings[key] ? "checked" : ""} data-setting="${key}" data-callback="${dev ? "dev:" : ""}${key}"></label>`;
	}
	settingsScreen() {
		return this.shell(
			this.header("MAKE YOURSELF AT HOME", "Camp settings.") +
				`<div class="settings-list">${this.range("Music", "music", 0, 1, 0.01, "A little expedition accompaniment.")}${this.range("Sound & voices", "sfx", 0, 1, 0.01)}<label class="setting-row"><span class="setting-copy"><strong>Controller prompts</strong><small>Standard mapping works with any pad.</small></span><select aria-label="Controller prompts" data-setting="glyphs"><option value="playstation" ${this.settings.glyphs === "playstation" ? "selected" : ""}>PlayStation · ✕ ○ □ △</option><option value="xbox" ${this.settings.glyphs === "xbox" ? "selected" : ""}>Xbox · A B X Y</option></select></label>${this.toggle("Explorer assist", "assist", "Gentler hazards and automatic swimming help.")}${this.toggle("Reduced motion", "reducedMotion", "Calmer camera and celebratory effects.")}</div><div class="panel-footer">${this.button("Back to camp", "back", "", true)}</div>`,
			"wide-panel",
		);
	}
	devScreen() {
		const teleports = this.payload.teleports || [
			{ id: "camp", label: "Camp" },
			{ id: "water", label: "Flooded gallery" },
			{ id: "balloon", label: "Balloon shaft" },
			{ id: "deep", label: "Deep vault" },
		];
		return this.shell(
			this.header(
				"THE WORKING NOTEBOOK",
				"Developer tools.",
				"Changes apply live. Expedition progress stays intact.",
			) +
				`<div class="dev-columns"><div class="settings-list">${this.range("Run speed", "speed", 2, 14, 0.2, "", true)}${this.range("Gravity", "gravity", 5, 45, 1, "", true)}${this.range("Jump impulse", "jump", 5, 18, 0.5, "", true)}${this.range("Swim speed", "swim", 2, 12, 0.2, "", true)}${this.range("Hazard pace", "hazard", 0, 2, 0.1, "", true)}${this.range("Camera span", "camera", 16, 42, 1, "", true)}${this.toggle("Invincible explorer", "god", "Walk through trouble without a setback.", true)}</div><div class="dev-actions"><span class="eyebrow">QUICK TRAVEL</span>${teleports.map((t) => this.button(esc(t.label || t.id), "dev:teleport", `data-value="${esc(t.id)}"`)).join("")}${this.button("Return to checkpoint", "dev:checkpoint")}${this.button("Refill courage", "dev:heal")}${this.button("Reset tuning defaults", "dev:reset")}</div></div><div class="panel-footer">${this.button("Back to the expedition", "back", "", true)}</div>`,
			"wide-panel dev-panel",
		);
	}
	aboutScreen() {
		const tabs = `<nav class="about-tabs">${[
			["guide", "Field guide"],
			["credits", "Source information"],
			["feedback", "Development notes"],
		]
			.map(
				([id, label]) =>
					`<button class="tab ${this.aboutPage === id ? "selected" : ""}" data-action="about:${id}">${label}</button>`,
			)
			.join("")}</nav>`;
		let content = "";
		if (this.aboutPage === "guide")
			content = `<div class="guide-grid"><article><span class="guide-number">01</span><h2>Leave no friend below.</h2><p>Find the three lost members of your expedition. Bring them safely back to the camp lantern. Gold is a lovely bonus.</p></article><article><span class="guide-number">02</span><h2>A cavern has its ways.</h2><p>Jump the gaps. Climb ladders. Swim through the flooded galleries. Catch a balloon to ride the great shaft, then let go when the landing looks good.</p></article><article><span class="guide-number">03</span><h2>A little courage goes far.</h2><p>Frogs, bats and river creatures guard these quiet halls. A knock costs a little courage. Three knocks send you back to your latest lantern. Treasures and rescued friends stay found.</p></article><article><span class="guide-number">04</span><h2>Better with company.</h2><p>Two explorers share a rescue list, treasure and checkpoints. Join through AI Hub, open a second camp tab, or exchange a direct connection code.</p></article></div><div class="control-guide">${this.controlsText()}</div>`;
		else if (this.aboutPage === "credits") {
			const info = this.metadata.sourceInformation || {};
			const keys = [
				"date",
				"source",
				"plan",
				"genre",
				"perspective",
				"tech",
				"artDirection",
				"animation",
				"audio",
				"online",
				"testing",
				"research",
				"environment",
				"model",
				"usage",
			];
			const labels = { artDirection: "Art Direction" };
			content = `<div class="credits-intro"><h2>Pitfall-ish — The Understory</h2><p>An original affectionate cavern caper, inspired by Pitfall II: Lost Caverns (1984). All geometry, animation, music and voices are made in code.</p></div><dl class="credits-grid">${keys.map((k) => `<div><dt>${labels[k] || k[0].toUpperCase() + k.slice(1)}</dt><dd>${esc(info[k] ?? (k === "usage" ? "added on import" : "unknown"))}</dd></div>`).join("")}</dl>`;
		} else
			content = Object.entries(QUESTIONS)
				.map(
					([key, questions]) =>
						`<section class="feedback-block"><h2>${key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}</h2>${questions.map((q, i) => `<article><h3>${q}</h3><p>${esc(this.metadata[key]?.[i] || "unknown")}</p></article>`).join("")}</section>`,
				)
				.join("");
		return this.shell(
			this.header("THE LOST CAVERNS SOCIETY", "Notes from below.") +
				tabs +
				`<div class="about-content">${content}</div><div class="panel-footer">${this.button("Close notebook", "back", "", true)}</div>`,
			"wide-panel about-panel",
		);
	}
	controlsText() {
		if (this.input === "touch")
			return "<b>LEFT THUMB</b> drag to move, climb and swim &nbsp; <b>RIGHT THUMB</b> tap or hold to jump / rise &nbsp; <b>CATCH</b> ride nearby balloons &nbsp; <b>Ⅱ</b> pause";
		const p = this.input === "gamepad";
		const xbox = this.settings.glyphs === "xbox";
		return p
			? `<b>LEFT STICK</b> move / swim &nbsp; <b>${xbox ? "A" : "✕"}</b> jump / let go &nbsp; <b>${xbox ? "X" : "□"}</b> interact &nbsp; <b>${xbox ? "Y" : "△"}</b> map &nbsp; <b>OPTIONS</b> pause`
			: `<b>A D / ← →</b> move &nbsp; <b>W S / ↑ ↓</b> climb / swim &nbsp; <b>SPACE</b> jump / let go &nbsp; <b>E</b> interact &nbsp; <b>M</b> map &nbsp; <b>ESC</b> pause`;
	}
	mapScreen() {
		return this.shell(
			this.header(
				"A VERY RESPECTABLE SCRIBBLE",
				"The field map.",
				"Follow the lanterns. There is always another way up.",
			) +
				`<div class="field-map">${this.payload.svg || this.defaultMap()}</div><div class="map-legend"><span><i class="legend-dot gold"></i> Lost expedition</span><span><i class="legend-dot mint"></i> Lantern checkpoint</span><span>≈ Flooded gallery</span><span>↑ Balloon current</span></div><div class="panel-footer">${this.button("Fold the map", "back", "", true)}</div>`,
			"wide-panel",
		);
	}
	defaultMap() {
		return `<svg viewBox="0 0 760 320" role="img" aria-label="Cavern map showing camp, flooded gallery, balloon shaft and deep vault"><g fill="none" stroke="#67d7bf" stroke-width="24" stroke-linejoin="round" opacity=".22"><path d="M60 65H680V260H80V160H570V65"/><path d="M230 65V160M430 160V260"/></g><g fill="none" stroke="#f4e6bf" stroke-width="2" stroke-dasharray="6 6"><path d="M60 65H680V260H80V160H570V65"/><path d="M230 65V160M430 160V260"/></g><g fill="#f6cc68"><circle cx="100" cy="65" r="8"/><circle cx="570" cy="160" r="8"/><circle cx="100" cy="260" r="8"/></g><g fill="#f4e6bf" font-family="sans-serif" font-size="15"><text x="55" y="36">CAMP</text><text x="280" y="135">FLOODED GALLERY ≈</text><text x="580" y="230">↑ BALLOON SHAFT</text><text x="280" y="296">DEEP VAULT</text></g><circle cx="62" cy="65" r="10" fill="#ee7444" stroke="#f4e6bf" stroke-width="3"/></svg>`;
	}
	coopScreen() {
		return this.shell(
			this.header(
				"THERE’S ROOM BY THE LANTERN",
				"Co-op camp.",
				"Two explorers. One shared expedition.",
			) +
				`<p class="coop-status">${esc(this.payload.status || "Play through AI Hub, a second browser tab, or a direct peer connection.")}</p><div class="coop-grid"><div><span class="eyebrow">THIS BROWSER / AI HUB</span>${this.button("Host a camp", "coop:host", "", true)}<label class="code-label">Camp code<input id="roomCode" aria-label="Camp code" value="${esc(this.payload.room || "")}" placeholder="Enter the host’s camp code" autocomplete="off"></label>${this.button("Join a camp", "coop:join")}<p class="muted small">In AI Hub, the lobby links your expedition automatically. A local camp works between tabs of the same address.</p></div><div><span class="eyebrow">DIRECT CONNECTION</span><p class="muted small">Host creates an invitation. A friend pastes it and creates an answer. Host pastes the answer to connect.</p><textarea id="networkCode" aria-label="Direct connection code" rows="3" placeholder="Paste invitation or answer here">${esc(this.payload.code || "")}</textarea><div class="compact-buttons">${this.button("Create invitation", "coop:offer")}${this.button("Use connection code", "coop:connect")}${this.button("Copy code", "coop:copy")}</div></div></div><div class="panel-footer">${this.button("Back to camp", "back")}</div>`,
			"wide-panel coop-panel",
		);
	}
	victoryScreen() {
		const p = this.payload;
		const complete = (p.rescued ?? 3) === 3;
		const seconds = Number(p.time) || 0;
		const clock =
			Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");
		return this.shell(
			`<div class="victory-stamp">${complete ? "EXPEDITION COMPLETE" : "EXPEDITION ENDED"} <span>◆</span></div><span class="eyebrow">${complete ? "EVERYBODY ACCOUNTED FOR" : "THE CAVERNS WILL KEEP"}</span><h1 class="victory-title">${complete ? "Home.<br><em>With stories.</em>" : "Lanterns out.<br><em>Stories kept.</em>"}</h1><p class="victory-copy">${complete ? "Three friends, a hatful of gold, and only a few<br>entirely reasonable screams." : "A fine beginning. Another expedition awaits."}${p.gold !== undefined ? "<br>" + esc(p.gold) + " / " + esc(p.totalGold ?? 25) + " gold discoveries." : ""}</p><div class="victory-stats"><div><strong>${esc(p.rescued ?? 3)} / 3</strong><span>FRIENDS FOUND</span></div><div><strong>${esc(p.score ?? p.gold ?? 0)}</strong><span>EXPEDITION SCORE</span></div><div><strong>${clock}</strong><span>TIME BELOW</span></div></div><nav>${this.button("Another expedition", "restart", "", true)}${this.button("Back to the title", "title")}</nav>`,
			"victory-panel",
		);
	}
	updateHUD(data = {}) {
		this.hud = { ...this.hud, ...data };
		const signature = JSON.stringify(this.hud) + this.input;
		if (signature === this._hudSignature) return;
		this._hudSignature = signature;
		const d = this.hud;
		const rescued =
			typeof d.rescued === "number"
				? d.rescued
				: Array.isArray(d.rescued)
					? d.rescued.length
					: (d.friends ?? 0);
		const hearts = Math.max(
			0,
			Math.min(5, Math.ceil(d.health ?? d.hearts ?? 3)),
		);
		const max = d.maxHealth ?? 3;
		this.hudElement.innerHTML = `<div class="hud-top"><div class="hud-identity"><span class="tiny-label">THE UNDERSTORY</span><strong>${esc(d.area || d.zone || "Lantern Camp")}</strong></div><div class="hud-goals"><span class="rescue-icon">♟</span><strong>${rescued}<small> / 3</small></strong><span class="hud-divider"></span><span class="gold-glyph">◆</span><strong>${esc(d.gold ?? d.score ?? 0)}</strong></div></div><div class="courage" aria-label="${hearts} of ${max} courage">${Array.from({ length: max }, (_, i) => `<span class="${i < hearts ? "filled" : ""}">♥</span>`).join("")}<small>COURAGE</small></div>${typeof d.oxygen === "number" && d.oxygen < 1 ? `<div class="oxygen-meter"><span>AIR</span><i style="width:${Math.max(0, Math.min(100, d.oxygen * 100))}%"></i></div>` : ""}${d.objective ? `<div class="hud-objective"><span class="small-diamond">◆</span> ${esc(d.objective)}</div>` : ""}${d.prompt ? `<div class="context-prompt">${esc(d.prompt)}</div>` : ""}${d.touchAction && this.input === "touch" ? `<button class="touch-context-action" data-touch-action aria-label="${esc(typeof d.touchAction === "string" ? d.touchAction : "Interact")}">${esc(typeof d.touchAction === "string" ? d.touchAction : "Interact")} <span>↗</span></button>` : ""}${d.attract ? '<div class="attract-banner"><strong>EXPEDITION IN PROGRESS</strong><span>Press anything to take the lantern.</span></div>' : ""}`;
	}
	updateHints() {
		const hint = this.root.querySelector("#input-hint");
		if (this._screen === "title")
			hint.innerHTML =
				this.input === "gamepad"
					? `${this.settings.glyphs === "xbox" ? "A" : "✕"} SELECT &nbsp; · &nbsp; LEFT STICK NAVIGATE`
					: "↑ ↓ SELECT &nbsp; · &nbsp; ENTER BEGIN";
		else if (["game", "loading"].includes(this._screen)) hint.innerHTML = "";
		else if (this._screen === "attract")
			hint.innerHTML = "PRESS ANYTHING TO EXPLORE";
		else
			hint.innerHTML =
				this.input === "gamepad"
					? `${this.settings.glyphs === "xbox" ? "A" : "✕"} SELECT &nbsp; ${this.settings.glyphs === "xbox" ? "B" : "○"} BACK${this._screen === "about" ? " &nbsp; · &nbsp; R STICK SCROLL" : ""}`
					: `↑ ↓ NAVIGATE &nbsp; · &nbsp; ENTER SELECT &nbsp; · &nbsp; ESC BACK${this._screen === "about" ? " &nbsp; · &nbsp; PGDN SCROLL" : ""}`;
		const guide = this.menu.querySelector(".control-guide");
		if (guide) guide.innerHTML = this.controlsText();
	}
	toast(title, detail = "") {
		const el = this.root.querySelector("#toast");
		el.innerHTML = `<span class="toast-mark">◆</span><div><strong>${esc(title)}</strong>${detail ? `<p>${esc(detail)}</p>` : ""}</div>`;
		el.classList.add("visible");
		clearTimeout(this.toastTimer);
		this.toastTimer = setTimeout(() => el.classList.remove("visible"), 4000);
	}
}
