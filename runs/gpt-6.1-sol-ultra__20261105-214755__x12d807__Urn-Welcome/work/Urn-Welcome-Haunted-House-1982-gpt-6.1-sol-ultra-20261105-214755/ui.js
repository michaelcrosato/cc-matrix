const esc = (value) =>
	String(value ?? "").replace(
		/[&<>"']/g,
		(c) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				c
			],
	);
const DEFAULTS = {
	music: 0.1,
	sfx: 0.55,
	brightness: 1,
	glyph: "ps",
	reducedMotion: false,
};
const TUNING = { speed: 4, enemy: 1, lantern: 35, lives: 3 };
const URN = `<svg viewBox="0 0 32 36" aria-hidden="true"><path d="M9 3h14l-2 6c9 4 8 16 1 20l2 4H8l2-4C3 25 2 13 11 9Z"/><path d="m16 9-3 7 6 4-5 9M9 3h14"/></svg>`;
export class UI {
	constructor({ onAction = () => {}, onInput = () => {} } = {}) {
		this.onAction = onAction;
		this.onInput = onInput;
		this.screen = "title";
		this.device = "keyboard";
		this.glyph = "ps";
		this.settings = { ...DEFAULTS };
		this.tuning = { ...TUNING };
		this.focusIndex = 0;
		this.lastHUD = "";
		this.toastTimer = 0;
		this.aboutData = null;
		this.aboutTab = "sourceInformation";
		this.previous = "title";
	}
	mount() {
		this.root = document.createElement("div");
		this.root.id = "game-ui";
		this.root.innerHTML = `<div id="vignette"></div><section id="hud" aria-label="Game status"><div class="location"><span id="floor-label" class="eyebrow">GROUND FLOOR</span><strong id="room-label">The foyer</strong></div><div class="relics" aria-label="Urn fragments"><span id="fragment-count" class="eyebrow">THE FAMILY URN</span><div id="fragment-icons">${[0, 1, 2].map((i) => `<span class="fragment" data-fragment="${i}">${URN}</span>`).join("")}</div></div><div class="courage"><span class="eyebrow">KEEP YOUR NERVE</span><div id="courage-icons"></div></div><div class="equipment"><span id="tool-icon">✧</span><div><span class="eyebrow">IN YOUR HAND</span><strong id="tool-label">Empty handed</strong><span id="light-label">MATCHLIGHT</span><span class="light-track"><i id="light-meter"></i></span></div></div><div class="objective"><span class="eyebrow">A MOST UNSETTLING ERRAND</span><span id="objective-label">Find the three pieces. Get out.</span></div><button id="pause-touch" class="touch-menu" aria-label="Pause">Ⅱ</button><button id="context-touch" class="touch-context">Interact</button><div id="context-prompt"></div><div id="control-strip"></div></section><main id="menu-screen"></main><div id="toast" role="status" aria-live="polite"><span class="toast-mark">✦</span><div><strong></strong><p></p></div></div><div id="attract-banner"><span class="attract-dot"></span> THE HOUSE IS SHOWING OFF <small>Any button to return</small></div><div id="loading-card"><span class="eyebrow">JUST ONE MOMENT</span><strong>Waking the house…</strong><p>Fetching the engine & lighting the candles.</p></div>`;
		document.body.append(this.root);
		this.menu = this.root.querySelector("#menu-screen");
		this.hud = this.root.querySelector("#hud");
		this.root.addEventListener("pointerover", (e) => {
			if (this.device === "gamepad") return;
			const el = e.target.closest("button,input,textarea,summary");
			if (el && this.menu.contains(el)) {
				const n = this.focusables().indexOf(el);
				if (n >= 0) this.setFocus(n, false);
			}
		});
		this.root.addEventListener("click", (e) => {
			const b = e.target.closest("[data-action]");
			if (b) {
				this.onInput();
				const action = b.dataset.action;
				if (action === "about-tab") {
					this.aboutTab = b.dataset.value;
					this.renderAbout();
					return;
				}
				if (action === "cycle") {
					this.cycle(b.dataset.key);
					return;
				}
				if (action === "join") {
					const code = this.root
						.querySelector("#room-code")
						?.value.trim()
						.toUpperCase();
					if (!code) {
						this.toast(
							"A room needs a name.",
							"Ask your friend for their room code.",
						);
						this.root.querySelector("#room-code")?.focus();
						return;
					}
					this.onAction("join", code);
					return;
				}
				if (action === "accept-offer" || action === "accept-answer") {
					const code = this.root
						.querySelector(
							action === "accept-offer" ? "#remote-offer" : "#remote-answer",
						)
						?.value.trim();
					if (!code) {
						this.toast(
							"There’s no invitation here yet.",
							"Paste the code your friend sent you.",
						);
						return;
					}
					this.onAction(action, code);
					return;
				}
				if (action === "copy-signal") {
					const code = this.data?.signalCode || "";
					if (code && navigator.clipboard) {
						navigator.clipboard
							.writeText(code)
							.then(() =>
								this.toast("Copied.", "Send this code to your friend."),
							)
							.catch(() => this.toast("Select the code to copy it."));
					} else this.root.querySelector("#signal-output")?.select();
					return;
				}
				this.onAction(action, b.dataset.value);
			}
		});
		this.root.addEventListener("input", (e) => {
			this.onInput();
			if (e.target.matches("[data-setting]")) {
				const key = e.target.dataset.setting,
					value = Number(e.target.value);
				this.settings[key] = value;
				this.refreshValue(e.target);
				this.onAction("setting", { key, value });
			}
			if (e.target.matches("[data-tune]")) {
				const key = e.target.dataset.tune,
					value = Number(e.target.value);
				this.tuning[key] = value;
				this.refreshValue(e.target);
				this.onAction("tune", { key, value });
			}
		});
		this.root.querySelector("#pause-touch").onclick = () =>
			this.onAction("pause");
		this.root.querySelector("#context-touch").onclick = () =>
			this.onAction("interact");
		this.setScreen("title");
		return this;
	}
	setLoading(value, text) {
		const c = this.root.querySelector("#loading-card");
		c.hidden = !value;
		if (text) c.querySelector("p").textContent = text;
	}
	button(label, action, sub = "", extra = "") {
		return `<button class="menu-button" data-action="${action}" ${extra}><span>${label}</span>${sub ? `<small>${sub}</small>` : ""}<i>↗</i></button>`;
	}
	shell(kicker, title, body, foot = "") {
		return `<section class="panel"><div class="panel-top"><span class="eyebrow">${kicker}</span><button class="back-button" data-action="back" aria-label="Back">← <span>Back</span></button></div><h2>${title}</h2>${body}${foot ? `<p class="panel-foot">${foot}</p>` : ""}</section>`;
	}
	slider(label, key, min, max, step, value, dev = false, description = "") {
		return `<label class="slider-row"><span><strong>${label}</strong>${description ? `<small>${description}</small>` : ""}</span><div><input aria-label="${label}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" ${dev ? "data-tune" : "data-setting"}="${key}"><output>${this.formatValue(key, value)}</output></div></label>`;
	}
	formatValue(key, value) {
		return ["music", "sfx", "brightness"].includes(key)
			? `${Math.round(value * 100)}%`
			: key === "lantern"
				? `${value}s`
				: key === "enemy"
					? `${Number(value).toFixed(1)}×`
					: key === "speed"
						? `${Number(value).toFixed(1)} m/s`
						: String(value);
	}
	refreshValue(input) {
		input.parentElement.querySelector("output").textContent = this.formatValue(
			input.dataset.setting || input.dataset.tune,
			Number(input.value),
		);
	}
	setScreen(name, data = {}) {
		if (!this.root) return;
		const old = this.screen;
		this.screen = name;
		this.data = data;
		if (data.settings) Object.assign(this.settings, data.settings);
		if (data.tuning) Object.assign(this.tuning, data.tuning);
		if (name !== "none" && name !== old && old !== "none") this.previous = old;
		this.root.dataset.screen = name;
		this.menu.className =
			name === "title"
				? "title-screen"
				: name === "none"
					? "hidden"
					: "modal-screen";
		this.hud.classList.toggle("visible", name === "none");
		this.root
			.querySelector("#attract-banner")
			.classList.toggle("visible", !!data.attract);
		if (name === "none") {
			this.menu.innerHTML = "";
			return;
		}
		if (name === "title")
			this.menu.innerHTML = `<div class="title-content"><div class="title-kicker"><span class="ink-star">✦</span> A MIDNIGHT MISADVENTURE</div><h1>URN<span>WELCOME<span class="title-period">.</span></span></h1><p class="tagline">Make yourself unwelcome.</p><nav class="title-actions">${this.button("Enter the house", "start", "One very long night")}${this.button("Play together", "online", "Two nerves are better than one")}${this.button("How to play", "help")}${this.button("Settings", "settings")}${this.button("About the house", "about")}</nav><div class="title-footer"><span>INSPIRED BY HAUNTED HOUSE · 1982</span><span class="tiny-diamond">◆</span><span>1–2 PLAYERS</span></div></div><div class="title-scene-note"><span class="mini-line"></span><p>Three missing pieces.<br>One restless resident.<br><em>Do come in.</em></p></div><div class="title-chapter"><span>EST.</span><strong>1892</strong><span>NO VACANCY</span></div>`;
		else if (name === "pause")
			this.menu.innerHTML = this.shell(
				"THE HOUSE CAN WAIT",
				"A little breather.",
				`<div class="menu-list">${this.button("Back to the house", "resume")}${this.button("Settings", "settings")}${this.button("How to play", "help")}${this.button("Developer tools", "dev")}${this.button("Leave for the title", "title")}</div>`,
				"Your nerves are safe while this menu is open.",
			);
		else if (name === "settings")
			this.menu.innerHTML = this.shell(
				"MAKE YOURSELF AT HOME",
				"Set the mood.",
				`<div class="settings-list">${this.slider("Music", "music", 0, 1, 0.01, this.settings.music)}${this.slider("Sound & voices", "sfx", 0, 1, 0.01, this.settings.sfx)}${this.slider("Brightness", "brightness", 0.6, 1.6, 0.05, this.settings.brightness)}<button class="choice-row" data-action="cycle" data-key="glyph"><span>Controller symbols</span><strong>${this.settings.glyph === "xbox" ? "Xbox · A B X Y" : "PlayStation · × ○ □ △"}</strong><i>↔</i></button><button class="choice-row" data-action="cycle" data-key="reducedMotion"><span>Reduced motion</span><strong>${this.settings.reducedMotion ? "On" : "Off"}</strong><i>↔</i></button></div>`,
				"Move up/down to choose. Left/right to adjust.",
			);
		else if (name === "help") this.renderHelp();
		else if (name === "about") {
			if (Object.keys(data).length) this.aboutData = data;
			this.renderAbout();
			return;
		} else if (name === "dev")
			this.menu.innerHTML = this.shell(
				"THE HOUSEKEEPER’S CUPBOARD",
				"Developer tools.",
				`<div class="settings-list dev-settings">${this.slider("Walking speed", "speed", 2, 8, 0.2, this.tuning.speed, true)}${this.slider("Specter speed", "enemy", 0.2, 2, 0.1, this.tuning.enemy, true)}${this.slider("Match duration", "lantern", 10, 90, 5, this.tuning.lantern, true)}${this.slider("Starting courage", "lives", 1, 8, 1, this.tuning.lives, true)}</div><div class="dev-actions">${this.button("Refill light & courage", "refill")}${this.button("Reveal the house", "reveal")}${this.button("Collect urn fragments", "grant-fragments")}${this.button("Go to the front door", "teleport-exit")}${this.button("Reset defaults", "reset-defaults")}</div>`,
				"Changes apply immediately. Starting courage also sets your next game.",
			);
		else if (name === "online") this.renderOnline(data);
		else if (name === "win")
			this.menu.innerHTML = `<section class="ending-panel"><span class="eyebrow">THE FRONT DOOR FINALLY OPENS</span><div class="ending-urn">${URN}</div><h2>Urn your freedom.</h2><p>The family is together again.<br>The house would prefer you weren’t.</p><div class="ending-stats"><span><strong>${esc(data.time || "A long night")}</strong>time in the house</span><span><strong>${esc(data.matches ?? "—")}</strong>matches struck</span></div><div class="ending-buttons">${this.button("One more night", "restart")}${this.button("Back to the title", "title")}</div><span class="ending-signoff">PLEASE DO NOT LEAVE A FORWARDING ADDRESS.</span></section>`;
		else if (name === "lose")
			this.menu.innerHTML = `<section class="ending-panel"><span class="eyebrow">YOU HAVE OVERSTAYED YOUR WELCOME</span><div class="ending-eyes">◉ &nbsp; ◉</div><h2>House wins.</h2><p>Something cold catches your sleeve.<br>Perhaps another match. Perhaps another night.</p><div class="ending-buttons">${this.button("Try the door again", "restart")}${this.button("Back to the title", "title")}</div></section>`;
		else this.menu.innerHTML = "";
		this.focusIndex = 0;
		this.setFocus(0, false);
		this.renderPrompts();
	}
	renderHelp() {
		const pad = this.device === "gamepad",
			xbox = this.glyph === "xbox";
		this.menu.innerHTML = this.shell(
			"A QUICK WORD BEFORE YOU ENTER",
			"Mind the dark.",
			`<div class="help-grid"><div class="help-story"><span class="help-number">01 / THE ERRAND</span><p>Find <em>three pieces of the family urn</em> across three floors. Bring them to the front door.</p><span class="help-number">02 / THE CATCH</span><p>You carry <em>one tool</em>. A brass key opens locked passages. A ward keeps specters at bay. Swap tools where you find them.</p><span class="help-number">03 / THE HOUSE</span><p>Matchlight reveals what darkness hides. Ghosts blow it out. Strike a fresh match, or pulse your light to make them retreat. Urn pieces stay with you.</p></div><div class="controls-table">${[
				["Move", pad ? "Left stick" : "W A S D / arrows"],
				["Interact", pad ? (xbox ? "A" : "×") : "E / click"],
				["Relight / pulse", pad ? (xbox ? "X" : "□") : "Space"],
				["Drop tool", pad ? (xbox ? "Y" : "△") : "Q"],
				["House map", pad ? "Touchpad / View" : "M"],
				["Pause", pad ? "Options / Menu" : "Esc"],
			]
				.map(([a, b]) => `<div><span>${a}</span><kbd>${b}</kbd></div>`)
				.join(
					"",
				)}<p class="touch-help">On touch: drag anywhere to move. Nearby objects are collected with the context button; light is assisted.</p></div></div>`,
		);
		this.focusIndex = 0;
		this.setFocus(0, false);
	}
	renderOnline(data = {}) {
		this.menu.innerHTML = this.shell(
			"MISERY LOVES COMPANY",
			"Bring a brave friend.",
			`<p class="panel-intro">Explore together. Share the urn, keep your own light.<br>Host a room, then give your friend the code.</p><div class="online-options"><div>${this.button("Host a room", "host", "Create a co-op game")}${data.code || data.roomCode ? `<div class="room-ticket"><span class="eyebrow">YOUR ROOM CODE</span><strong>${esc(data.code || data.roomCode)}</strong><small>Waiting for a second pair of eyes.</small></div>` : ""}</div><div class="join-room"><label for="room-code">HAVE A CODE?</label><input id="room-code" type="text" autocomplete="off" spellcheck="false" maxlength="20" placeholder="ROOM CODE" aria-label="Room code" value="${esc(data.joinCode || "")}">${this.button("Join your friend", "join")}</div></div><details class="remote-details" ${data.signalCode ? "open" : ""}><summary tabindex="0">Play across browsers <span>Direct invitation · no server needed</span></summary><div class="remote-grid"><div>${this.button("Create invitation", "create-offer")}<label for="remote-answer">HOST: PASTE YOUR FRIEND’S ANSWER</label><textarea id="remote-answer" rows="2" placeholder="Paste answer code" aria-label="Answer code">${esc(data.answerInput || "")}</textarea>${this.button("Connect", "accept-answer")}</div><div><label for="remote-offer">GUEST: PASTE AN INVITATION</label><textarea id="remote-offer" rows="2" placeholder="Paste invitation code" aria-label="Invitation code">${esc(data.offerInput || "")}</textarea>${this.button("Answer invitation", "accept-offer")}</div></div>${data.signalCode ? `<div class="signal-result"><span class="eyebrow">${esc(data.signalLabel || "SEND THIS CODE TO YOUR FRIEND")}</span><textarea id="signal-output" readonly rows="2" aria-label="Generated connection code">${esc(data.signalCode)}</textarea><button class="copy-button" data-action="copy-signal">Copy code</button></div>` : ""}</details><p id="online-status" role="status">${esc(data.status || "Room codes connect two tabs in this browser. Use an invitation for another browser, or launch together through AI Hub.")}</p>`,
		);
		this.focusIndex = 0;
		this.setFocus(0, false);
	}
	updateOnline(update = {}) {
		if (this.screen !== "online") return;
		const d = { ...this.data, ...update };
		const id = document.activeElement?.id;
		d.joinCode = this.root.querySelector("#room-code")?.value || "";
		d.offerInput = this.root.querySelector("#remote-offer")?.value || "";
		d.answerInput = this.root.querySelector("#remote-answer")?.value || "";
		const open = this.root.querySelector(".remote-details")?.open;
		this.data = d;
		this.renderOnline(d);
		if (open) this.root.querySelector(".remote-details").open = true;
		if (id) this.root.querySelector("#" + id)?.focus();
	}
	setOnlineStatus(status, code) {
		if (this.screen === "online") {
			const d = { ...this.data, status, code: code || this.data.code };
			const active = document.activeElement?.id === "room-code";
			d.joinCode = this.root.querySelector("#room-code")?.value || "";
			this.data = d;
			this.renderOnline(d);
			if (active) this.root.querySelector("#room-code")?.focus();
		}
	}
	renderAbout() {
		const d = this.aboutData || {},
			s = d.sourceInformation || d;
		const tabs = [
			["sourceInformation", "The game"],
			["testingFeedback", "Testing"],
			["engineFeedback", "Engine"],
			["promptFeedback", "Prompt"],
		];
		const sectionNames = {
			sourceInformation: "Source Information",
			testingFeedback: "Testing Feedback",
			engineFeedback: "Engine Feedback",
			promptFeedback: "Prompt Feedback",
		};
		let body = "";
		if (this.aboutTab === "sourceInformation") {
			const labels = {
				date: "Created",
				source: "Inspired by",
				plan: "Build plan",
				genre: "Genre",
				perspective: "Perspective",
				tech: "Technology",
				artDirection: "Art direction",
				animation: "Animation",
				audio: "Sound",
				online: "Multiplayer",
				testing: "Testing",
				research: "Research",
				environment: "Environment",
				model: "Model",
				usage: "Usage",
			};
			body = `<div class="credits-list">${Object.entries(labels)
				.map(
					([key, label]) =>
						`<div><span>${label}</span><p>${esc(s[key] || "unknown")}</p></div>`,
				)
				.join("")}</div>`;
		} else {
			const questions = {
				testingFeedback: [
					"Issues caught",
					"Critical issues",
					"Most helpful test",
					"Least helpful test",
				],
				engineFeedback: [
					"What worked well",
					"Where we got stuck",
					"Built for this game",
					"Hardest engine task",
					"Engine changes",
					"One engine wish",
				],
				promptFeedback: [
					"What worked well",
					"What was confusing",
					"Hardest requirement",
					"One prompt change",
				],
			};
			body = `<div class="feedback-list">${(questions[this.aboutTab] || []).map((q, i) => `<div><span class="eyebrow">${q}</span><p>${esc(d[this.aboutTab]?.[i] || "unknown")}</p></div>`).join("")}</div>`;
		}
		this.menu.innerHTML = this.shell(
			"THE PEOPLE IN THE WALLS",
			"About the house.",
			`<div class="about-tabs">${tabs.map(([key, label]) => `<button data-action="about-tab" data-value="${key}" class="${this.aboutTab === key ? "selected" : ""}">${label}</button>`).join("")}</div><div class="credits-scroll" tabindex="0"><h3 class="eyebrow">${sectionNames[this.aboutTab]}</h3>${body}</div>`,
		);
		this.focusIndex = 0;
		this.setFocus(0, false);
	}
	cycle(key) {
		this.onInput();
		if (key === "glyph")
			this.settings.glyph = this.settings.glyph === "ps" ? "xbox" : "ps";
		else this.settings[key] = !this.settings[key];
		this.onAction("setting", { key, value: this.settings[key] });
		const at = this.focusIndex;
		this.setScreen("settings");
		this.setFocus(at);
	}
	setDevice(device, glyph = this.settings.glyph) {
		const changed = this.device !== device;
		this.device = device;
		this.glyph = glyph;
		this.root.dataset.device = device;
		this.renderPrompts();
		if (changed && this.screen === "help") this.renderHelp();
	}
	renderPrompts() {
		if (!this.root) return;
		const pad = this.device === "gamepad",
			x = this.glyph === "xbox";
		this.root.querySelector("#control-strip").innerHTML =
			this.device === "touch"
				? ""
				: `<span><kbd>${pad ? (x ? "X" : "□") : "SPACE"}</kbd> Light</span><span><kbd>${pad ? (x ? "Y" : "△") : "Q"}</kbd> Drop</span><span><kbd>${pad ? "VIEW" : "M"}</kbd> Map</span><span><kbd>${pad ? "OPTIONS" : "ESC"}</kbd> Pause</span>`;
		if (this.hudState) this.updateHUD(this.hudState);
	}
	updateHUD(state) {
		if (!this.root) return;
		this.hudState = state;
		const get = (id) => this.root.querySelector("#" + id);
		get("floor-label").textContent =
			state.floorName ||
			state.floorLabel ||
			`FLOOR ${Number(state.floor ?? 0) + 1}`;
		get("room-label").textContent = state.roomName || state.room || "The foyer";
		const count = Array.isArray(state.fragments)
			? state.fragments.filter(Boolean).length
			: Number(state.fragments ?? 0);
		get("fragment-count").textContent = `THE FAMILY URN · ${count}/3`;
		this.root.querySelectorAll(".fragment").forEach((el, i) => {
			el.classList.toggle("found", i < count);
		});
		const lives = state.lives ?? state.health ?? 3,
			max = state.maxLives ?? 3;
		get("courage-icons").innerHTML = Array.from(
			{ length: Math.max(lives, max) },
			(_, i) =>
				`<span class="courage-heart ${i < lives ? "full" : ""}">♥</span>`,
		).join("");
		const tool =
			typeof state.tool === "object"
				? state.tool?.name || "Empty handed"
				: state.tool || "Empty handed";
		get("tool-label").textContent =
			tool === "key" ? "Brass key" : tool === "ward" ? "Spirit ward" : tool;
		get("tool-icon").textContent = tool.toLowerCase().includes("key")
			? "⚿"
			: tool.toLowerCase().includes("ward")
				? "✥"
				: "✧";
		let light = Number(state.lantern ?? state.light ?? 1);
		if (light > 1) light /= state.lanternMax || 35;
		get("light-meter").style.width =
			`${Math.max(0, Math.min(1, light)) * 100}%`;
		get("light-label").textContent =
			light <= 0.01
				? "LIGHT EXTINGUISHED"
				: state.cooldown > 0
					? `FLASH IN ${Math.ceil(state.cooldown)}s`
					: "MATCHLIGHT";
		get("objective-label").textContent =
			state.objective ||
			(count >= 3
				? "The urn is whole. Find the front door."
				: "Find the three pieces. Get out.");
		const context = state.context || state.prompt || "";
		get("context-prompt").innerHTML = context
			? `<kbd>${this.device === "gamepad" ? (this.glyph === "xbox" ? "A" : "×") : "E"}</kbd><span>${esc(context)}</span>`
			: "";
		get("context-touch").hidden = !context;
		get("context-touch").textContent = context || "Interact";
		this.root.classList.toggle("low-light", light < 0.12);
	}
	toast(text, sub = "") {
		if (!this.root) return;
		const el = this.root.querySelector("#toast");
		el.querySelector("strong").textContent = text;
		el.querySelector("p").textContent = sub;
		el.classList.add("visible");
		clearTimeout(this.toastTimer);
		this.toastTimer = setTimeout(() => el.classList.remove("visible"), 4000);
	}
	setAttract(value) {
		this.root
			.querySelector("#attract-banner")
			.classList.toggle("visible", value);
	}
	focusables() {
		return [
			...this.menu.querySelectorAll(
				'button:not([disabled]),input:not([disabled]),textarea:not([disabled]),[tabindex="0"]',
			),
		].filter((el) => el.offsetParent !== null);
	}
	setFocus(index, focus = true) {
		const list = this.focusables();
		if (!list.length) return;
		this.focusIndex = (index + list.length) % list.length;
		list.forEach((el, i) => {
			el.classList.toggle("focused", i === this.focusIndex);
		});
		if (focus) {
			list[this.focusIndex].focus({ preventScroll: true });
			list[this.focusIndex].scrollIntoView({
				block: "nearest",
				behavior: "instant",
			});
		}
	}
	navigate(dx, dy) {
		const list = this.focusables();
		if (!list.length) return;
		this.onInput();
		if (dy) this.setFocus(this.focusIndex + Math.sign(dy));
		if (dx) {
			const el = list[this.focusIndex];
			if (el?.matches('input[type="range"]')) {
				const step = Number(el.step) || 1;
				el.value = String(
					Math.min(
						Number(el.max),
						Math.max(Number(el.min), Number(el.value) + Math.sign(dx) * step),
					),
				);
				el.dispatchEvent(new Event("input", { bubbles: true }));
			} else if (el?.dataset.action === "cycle") this.cycle(el.dataset.key);
			else if (el?.classList.contains("credits-scroll"))
				el.scrollTop += Math.sign(dx) * 140;
		}
	}
	confirm() {
		const el = this.focusables()[this.focusIndex];
		if (
			(el?.tagName === "INPUT" && el.type === "text") ||
			el?.tagName === "TEXTAREA"
		)
			el.focus();
		else el?.click();
	}
	back() {
		this.onInput();
		this.onAction("back");
	}
}
