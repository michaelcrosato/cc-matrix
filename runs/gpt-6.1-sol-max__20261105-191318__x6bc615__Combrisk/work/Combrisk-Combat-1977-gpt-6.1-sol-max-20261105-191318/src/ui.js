import { LEVELS } from "./game.js";

const credits = __CREDITS__;
export const esc = (s) =>
	String(s).replace(
		/[&<>"']/g,
		(c) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				c
			],
	);
const $ = (id) => document.getElementById(id);
const btn = (action, label, sub = "", cls = "menu-button") =>
	`<button type="button" class="${cls}" data-action="${action}"><span>${label}${sub ? ` <small>${sub}</small>` : ""}</span><span class="arrow" aria-hidden="true">↗</span></button>`;
const back = (label = "Back", action = "back") =>
	`<div class="back">${btn(action, `← ${label}`)}</div>`;
const textbtn = (a, l) =>
	`<button type="button" class="text-button" data-action="${a}">${l}</button>`;
const panel = (eye, title, sub, body, wide = false) =>
	`<section class="panel${wide ? " wide" : ""}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="eyebrow">${eye}</div><h1>${title}</h1>${sub ? `<p class="subtitle">${sub}</p>` : ""}${body}</section>`;
const range = (
	key,
	label,
	min,
	max,
	step,
	value,
	kind = "setting",
	format = null,
) =>
	`<label class="range-row"><span class="row-head"><span>${label}</span><output data-output="${key}">${format || value}</output></span><input aria-label="${label}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-${kind}="${key}"></label>`;
export class UI {
	constructor(input, settings) {
		this.input = input;
		this.settings = settings;
		this.screen = $("screen");
		this.name = "boot";
		this.onAction = () => {};
		this.onSetting = () => {};
		this.onTune = () => {};
		this.backTo = "title";
		this.selectedHeat = 0;
		this.linkRole = "host";
		this.linkOut = "";
		this.linkReply = "";
		this.toastUntil = 0;
		this.announceUntil = 0;
		this.hudTick = 0;
		this.lastDevice = "";
		this.screen.addEventListener("click", (e) => {
			const b = e.target.closest("[data-action]");
			if (b && !b.disabled) this.onAction(b.dataset.action, b);
		});
		this.screen.addEventListener("pointerover", (e) => {
			const b = e.target.closest("button,input,textarea");
			if (b && document.activeElement !== b && !b.disabled)
				b.focus({ preventScroll: true });
		});
		this.screen.addEventListener("focusin", (e) => {
			this.screen.querySelectorAll(".selected").forEach((b) => {
				b.classList.remove("selected");
			});
			e.target.classList.add("selected");
		});
		this.screen.addEventListener("input", (e) => {
			const k = e.target.dataset.setting,
				t = e.target.dataset.tune;
			if (k) this.onSetting(k, Number(e.target.value));
			if (t) this.onTune(t, Number(e.target.value));
			this.screen.querySelector(`[data-output="${k || t}"]`).textContent = k
				? `${Math.round(Number(e.target.value) * 100)}%`
				: Number(e.target.value).toFixed(e.target.step.includes(".") ? 2 : 0);
		});
		$("pause-button").addEventListener("click", () => this.onAction("pause"));
		$("touch-boost").addEventListener("pointerdown", (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.input.justBoost = true;
		});
	}
	show(name, html) {
		this.name = name;
		this.screen.className = `screen${name === "title" ? " title" : ""}`;
		this.screen.innerHTML = html;
		this.input.menu = true;
		this.input.clear();
		requestAnimationFrame(() => {
			const b = this.focusables()[0];
			b?.focus({ preventScroll: true });
		});
	}
	focusables() {
		return Array.from(
			this.screen.querySelectorAll('button,input,textarea,[tabindex="0"]'),
		).filter((e) => !e.disabled && e.getBoundingClientRect().width > 0);
	}
	navigate(x, y) {
		const a = this.focusables();
		if (!a.length) return;
		let i = a.indexOf(document.activeElement);
		if (i < 0) i = 0;
		const e = a[i];
		if (y && e?.classList.contains("about-scroll")) {
			const end = e.scrollHeight - e.clientHeight;
			if ((y > 0 && e.scrollTop < end - 4) || (y < 0 && e.scrollTop > 4)) {
				e.scrollBy({ top: y * 130, behavior: "smooth" });
				return;
			}
		}
		if (x && e?.type === "range") {
			e.value = Number(e.value) + x * Number(e.step || 1);
			e.dispatchEvent(new Event("input", { bubbles: true }));
			return;
		}
		a[(i + (y || x) + a.length) % a.length]?.focus();
	}
	confirm() {
		const e = document.activeElement;
		if (this.screen.contains(e) && e.matches("button")) e.click();
		else
			this.focusables()
				.find((e) => e.matches("button"))
				?.click();
	}
	clear() {
		this.name = "game";
		this.screen.innerHTML = "";
		this.input.menu = false;
		this.input.clear();
		$("scene").focus({ preventScroll: true });
	}
	title() {
		this.show(
			"title",
			`<div class="title-content"><div class="eyebrow">THE WEEKEND WAR DEPARTMENT</div><h1 class="logo">COM<span>BRISK</span><sup>77</sup></h1><p class="tagline">Little tanks. Big nerve.</p><p class="title-copy">A pocket-sized ricochet rivalry.<br>Four heats. Two tracks. Absolutely no brakes.</p><div class="menu-stack">${btn("solo", "Play the circuit", "1 PLAYER")}${btn("versus", "Settle a score", "VERSUS")}</div><div class="secondary-row">${textbtn("how", "How to play")}${textbtn("settings", "Settings")}${textbtn("about", "About")}</div><div class="title-foot">INSPIRED BY COMBAT · 1977<br><span id="title-prompts">${this.menuPrompts()}</span><br>STAND BY FOR A LITTLE FRIENDLY FIRE.</div></div><div class="title-sticker"><strong>4 HEATS.<br>1 GOOD<br>GRUDGE.</strong><span>TANKS · RICOCHETS · GHOSTS · BIPLANES</span></div>`,
		);
		this.hideHud();
		$("attract").hidden = true;
	}
	menuPrompts() {
		if (this.input.device === "touch") return "TAP TO CHOOSE · SWIPE TO SCROLL";
		return this.input.device === "pad"
			? `${this.glyph("move")} Choose &nbsp; ${this.glyph("confirm")} Select &nbsp; ${this.glyph("back")} Back`
			: "↑ ↓ Choose &nbsp; ENTER Select &nbsp; ESC Back";
	}
	glyph(action) {
		const pad = this.input.device === "pad",
			xbox = this.settings.glyphs === "xbox";
		const touch = this.input.device === "touch";
		const map = {
			move: pad ? "L" : this.input.device === "touch" ? "DRAG" : "WASD",
			aim: pad ? "R" : "MOUSE",
			fire: pad ? (xbox ? "RT" : "R2") : "LMB",
			boost: pad ? (xbox ? "LB" : "L1") : "SHIFT",
			pause: pad ? (xbox ? "☰" : "OPTIONS") : "ESC",
			confirm: pad ? (xbox ? "A" : "×") : "ENTER",
			back: pad ? (xbox ? "B" : "○") : "ESC",
		};
		const touchMap = {
			move: "L THUMB",
			aim: "R THUMB",
			fire: "HOLD",
			boost: "2× TAP",
			pause: "Ⅱ",
			confirm: "TAP",
			back: "←",
		};
		return `<${pad ? 'span class="glyph"' : "kbd"}>${touch ? touchMap[action] : map[action]}</${pad ? "span" : "kbd"}>`;
	}
	versus() {
		const l = LEVELS[this.selectedHeat];
		this.show(
			"versus",
			panel(
				"KEEP IT FRIENDLY",
				"SETTLE A SCORE.",
				"Same screen or across the wire. Bring a rival.",
				`<div class="arena-select"><div><small>FIELD ${this.selectedHeat + 1} / 4</small><strong>${l.name}</strong></div><button type="button" data-action="arena" aria-label="Change arena">↔</button></div><div class="button-grid"><button type="button" class="option-card" data-action="local"><span class="symbol">▰ ▰</span><strong>Couch duel</strong><small>Two pilots. One screen.<br>Two pads, or share the keyboard.</small></button><button type="button" class="option-card" data-action="link"><span class="symbol">↔</span><strong>Link duel</strong><small>Two devices. One battlefield.<br>Exchange a direct connection code.</small></button></div><p class="how-local">AI Hub sessions support up to four pilots in a shared arena. Open this game from the Hub lobby to join.</p>${back()}`,
			),
		);
	}
	pause(state, hub = false, online = hub) {
		this.show(
			"pause",
			panel(
				"A TACTICAL TEA BREAK",
				"HOLD THAT<br>THOUGHT.",
				`${LEVELS[state.heat].name} · ${online ? "Online play continues while this menu is open." : "Your grudge can wait."}`,
				`<div class="menu-stack">${btn("resume", "Back to the fray")}${btn("settings", "Settings")}${btn("how", "How to play")}${!online ? btn("dev", "Developer tools") : ""}${btn("about", "About & credits")}${!hub ? btn("quit", "Return to title") : ""}</div>`,
			),
		);
	}
	settingsMenu() {
		const s = this.settings;
		this.show(
			"settings",
			panel(
				"MAKE YOURSELF COMFORTABLE",
				"DIAL IT IN.",
				"Your music starts at a neighbourly ten percent.",
				`<div class="settings-grid">${range("master", "Master volume", 0, 1, 0.05, s.master, "setting", `${Math.round(s.master * 100)}%`)}${range("music", "Music", 0, 1, 0.01, s.music, "setting", `${Math.round(s.music * 100)}%`)}${range("sfx", "Effects & gibberish", 0, 1, 0.05, s.sfx, "setting", `${Math.round(s.sfx * 100)}%`)}<button type="button" class="toggle" data-action="glyphs">Controller glyphs <b>${s.glyphs === "xbox" ? "XBOX · A B X Y" : "PLAYSTATION · × ○ □ △"}</b></button><button type="button" class="toggle" data-action="guide">Ricochet guide <b>${s.guide ? "ON" : "OFF"}</b></button><button type="button" class="toggle" data-action="shake">Camera shake <b>${s.shake ? "ON" : "OFF"}</b></button></div><div class="settings-actions">${textbtn("fullscreen", "Fullscreen ↗")}${textbtn("resetSettings", "Restore defaults")}</div>${back()}`,
			),
		);
	}
	how() {
		this.show(
			"how",
			panel(
				"FIELD MANUAL / FOUR SIMPLE ORDERS",
				"A LITTLE ANGLE.<br>A LOT OF ATTITUDE.",
				"Win a heat with five points, or lead when the clock runs out. A knockout is worth one.",
				`<div class="how-grid"><div class="how-card"><div class="diagram">▰ →</div><h3>1. Make tracks.</h3><div class="control">${this.glyph("move")} Move &nbsp; ${this.glyph("boost")} Boost</div><p>Drive in any direction. Boost recharges in four seconds. Roll through trouble in the air.</p></div><div class="how-card"><div class="diagram">⊕ · · ↗</div><h3>2. Take your shot.</h3><div class="control">${this.glyph("aim")} Aim &nbsp; ${this.glyph("fire")} Fire</div><p>Aim independently of your tracks. In a biplane, your nose follows your aim. No input? Keep cruising.</p></div><div class="how-card"><div class="diagram">→ ┃ ↙</div><h3>3. Play the angles.</h3><p>Shells bounce off walls and break crates. In heat two, a bank-shot knockout is worth two. Your own ricochets can bite back.</p></div><div class="how-card"><div class="diagram">◌ · · ▰</div><h3>4. Mind the ghosts.</h3><p>In heat three, firing reveals hidden tanks. Watch for their dust. In heat four, aircraft and shots wrap at the edges.</p></div><div class="how-card"><div class="diagram">+ ◇ !</div><h3>A little assistance.</h3><p>Green: repair one armour. Blue: shield one hit. Yellow: eight seconds of rapid fire. Three hits knock a tank out.</p></div><div class="how-card"><div class="diagram">☝ ↔ ☝</div><h3>Touch & go.</h3><p>Left thumb moves. Right thumb aims and fires. One thumb? Aim and fire are assisted. Double-tap the right side to boost.</p></div></div><p class="how-local">Couch keyboard: P1 uses WASD + mouse, click/Space, Shift. P2 uses arrows to move, IJKL to aim, / to fire, . to boost. One connected pad controls P2; two pads control P1 and P2. In couch ghost duels, both tanks disappear between shots.</p>${back()}`,
				true,
			),
		);
	}
	dev(game) {
		const t = game.tuning,
			c = game.cheats;
		this.show(
			"dev",
			panel(
				"DEVELOPER MODE / LIVE BALANCE",
				"THE TEST RANGE.",
				"Adjust the next exchange. Changes apply immediately; the battlefield is paused.",
				`<div class="settings-grid">${range("speed", "Drive speed", 2, 10, 0.1, t.speed, "tune")}${range("shellSpeed", "Shell speed", 8, 40, 0.5, t.shellSpeed, "tune")}${range("reload", "Seconds per shot", 0.1, 1.5, 0.02, t.reload, "tune")}${range("aiSkill", "AI accuracy", 0.1, 1.2, 0.05, t.aiSkill, "tune")}${range("roundTime", "Heat seconds", 20, 180, 5, t.roundTime, "tune")}${range("target", "Points to win", 1, 15, 1, t.target, "tune")}<button type="button" class="toggle" data-action="god">Player invincibility <b>${c.invincible ? "ON" : "OFF"}</b></button><button type="button" class="toggle" data-action="freezeAI">Freeze AI <b>${c.aiPaused ? "ON" : "OFF"}</b></button><button type="button" class="toggle" data-action="colliders">Physics wireframe <b>${c.colliders ? "ON" : "OFF"}</b></button><button type="button" class="toggle" data-action="slowmo">Simulation speed <b>${c.slowmo === 1 ? "1×" : "0.35×"}</b></button></div><div class="settings-actions">${textbtn("repair", "Repair & shield")}${textbtn("pickups", "Spawn all pickups")}${textbtn("next", "Next heat")}${textbtn("restart", "Restart heat")}${textbtn("resetTune", "Reset balance")}</div><div class="back">${btn("resume", "Playtest →")}${textbtn("pause", "← Pause menu")}</div>`,
				true,
			),
		);
	}
	about() {
		const si = credits.sourceInformation;
		const qs = {
			testingFeedback: [
				"How many issues did testing catch?",
				"How many were critical or game breaking?",
				"Most helpful test?",
				"Least helpful test?",
			],
			engineFeedback: [
				"What did you like most about the engine?",
				"Did you get stuck or guess wrong?",
				"Most important thing you built yourself?",
				"Hardest part of using the engine?",
				"What did you change in the engine, and why?",
				"If you could change one thing?",
			],
			promptFeedback: [
				"What did you like most about this prompt?",
				"What was confusing?",
				"What was the hardest thing to do?",
				"What would you change?",
			],
		};
		let copy = `<h2>Source Information</h2><dl>${Object.entries(si)
			.map(
				([k, v]) =>
					`<dt>${esc(k[0].toUpperCase() + k.slice(1))}</dt><dd>${esc(v)}</dd>`,
			)
			.join("")}</dl>`;
		for (const [k, title] of [
			["testingFeedback", "Testing Feedback"],
			["engineFeedback", "Engine Feedback"],
			["promptFeedback", "Prompt Feedback"],
		])
			copy += `<h2>${title}</h2>${credits[k].map((v, i) => `<h3>${qs[k][i]}</h3><p>${esc(v)}</p>`).join("")}`;
		this.show(
			"about",
			panel(
				"THE SMALL PRINT",
				"MADE OF ANGLES.",
				"An original, affectionate riff on the tank-and-biplane rivalry of Combat (1977).",
				`<div class="about-scroll" tabindex="0">${copy}<h2>Credits & licences</h2><p>Original game, procedural art, animation, music, sound and gibberish voice created in code. Three.js r180 — MIT. Rapier 0.19.3 — Apache-2.0. AI Hub Session Protocol v1 client 1.4.0, from the supplied michaelcrosato/ai-hub repository. Standalone direct links use WebRTC with public STUN; relay service: none.</p><p>No source assets or audio recordings are used. Combat belongs to its respective rights holders. This is an independent homage.</p></div>${back()}`,
				true,
			),
		);
	}
	results(state, guest = false) {
		const final = state.finished,
			solo = state.mode === "solo",
			last = state.results[state.results.length - 1],
			wins = state.heatWins || 0;
		const title =
			solo && final
				? wins >= 3
					? "THE WEEKEND<br>IS YOURS."
					: "A GRUDGE<br>WELL PLAYED."
				: last?.win
					? "NICE<br>SHOOTING."
					: "NEXT TIME,<br>TIGER.";
		const sub =
			solo && final
				? `${wins} / 4 heats won. ${wins >= 3 ? "Your Golden Ricochet is in the post." : "The rematch is already personal."}`
				: LEVELS[state.heat].tag;
		const scores = state.tanks
			.map((t) => ({
				...t,
				shown: solo && final ? state.total[t.id] || 0 : t.score,
			}))
			.sort((a, b) => b.shown - a.shown);
		const stats = state.stats || {};
		this.show(
			"results",
			panel(
				solo && final
					? "CIRCUIT COMPLETE"
					: `HEAT ${state.heat + 1} / COMPLETE`,
				title,
				sub,
				`${solo && final ? '<div class="result-banner">✦ ✦ ✦</div>' : ""}<div class="result-scores">${scores.map((t) => `<div class="result-score" style="--player:${esc(t.color)}"><span>${esc(t.name)}</span><span class="value">${t.shown} <small>PTS</small></span></div>`).join("")}</div>${solo ? `<div class="result-stats"><span><strong>${stats.knockouts || 0}</strong>KNOCKOUTS</span><span><strong>${stats.banks || 0}</strong>RICOCHETS</span><span><strong>${stats.pickups || 0}</strong>PICKUPS</span><span><strong>${stats.boosts || 0}</strong>BOOSTS</span></div>` : ""}<div class="menu-stack">${guest ? '<p class="link-help">Waiting for the host to call a rematch.</p>' : btn(solo && !final ? "continue" : "rematch", solo && !final ? "Next heat →" : "One more round?")}${btn("quit", "Back to title")}</div>`,
			),
		);
	}
	link() {
		this.linkRole = "host";
		this.linkOut = "";
		this.linkReply = "";
		this.linkMenu();
	}
	linkMenu() {
		const host = this.linkRole === "host";
		this.show(
			"link",
			panel(
				"DIRECT LINK / TWO DEVICES",
				"CALL IN A RIVAL.",
				"No account. No lobby server. Just a good old-fashioned exchange.",
				`<div class="link-tabs">${textbtn("linkHost", "I’m hosting")}${textbtn("linkJoin", "I’m joining")}</div><p class="link-help">${host ? "1. Create an invitation and send it to your friend.<br>2. Paste their reply below. The duel starts when you connect." : "1. Paste your friend’s invitation below.<br>2. Generate a reply and send it back. Keep this screen open."}</p><label class="link-label" for="link-in">${host ? "YOUR FRIEND’S REPLY" : "HOST’S INVITATION"}</label><textarea id="link-in" class="link-code" placeholder="Paste the complete COMBRISK: code here" aria-label="${host ? "Friend reply code" : "Host invitation code"}" spellcheck="false"></textarea><div class="settings-actions">${textbtn("pasteCode", "Paste code")}${textbtn(host ? "createOffer" : "createAnswer", host ? "1. Create invitation" : "Generate reply")}${host ? textbtn("acceptAnswer", "2. Connect with reply") : ""}</div><label class="link-label" for="link-out">${host ? "YOUR INVITATION" : "YOUR REPLY"}</label><textarea id="link-out" class="link-code" readonly aria-label="Code to share" spellcheck="false">${esc(this.linkOut)}</textarea><div class="settings-actions">${textbtn("copyCode", "Copy code")}</div><p id="link-status" class="link-error" role="status"></p><p class="link-help">Direct peer-to-peer connections. Some networks require a relay; no relay is provided. AI Hub handles its own network when launched from a session.</p>${back("Versus", "versus")}`,
			),
		);
	}
	linkStatus(text, error = false) {
		const e = $("link-status");
		if (e) {
			e.textContent = text;
			e.style.color = error ? "var(--coral)" : "var(--teal)";
		}
	}
	waiting(msg = "Waiting for the other pilot…") {
		this.show(
			"waiting",
			panel(
				"LINK ESTABLISHED",
				"STAND BY.",
				msg,
				btn("quit", "Return to title"),
			),
		);
	}
	hideHud() {
		for (const id of ["hud", "bottom-hud", "pause-button", "round-intro"])
			$(id).hidden = true;
		$("announce").textContent = "";
		$("dev-badge").textContent = "";
	}
	toast(text) {
		$("toast").textContent = text;
		this.toastUntil = performance.now() + 3000;
	}
	announce(text) {
		$("announce").textContent = text;
		this.announceUntil = performance.now() + 1800;
	}
	touchSticks(touches) {
		for (const id of ["touch-left", "touch-right"])
			$(id).style.display = "none";
		$("touch-boost").style.display = "none";
		if (this.name !== "game") return;
		for (const t of touches.values()) {
			const e = $(t.right ? "touch-right" : "touch-left");
			e.style.display = "block";
			e.style.left = `${t.sx}px`;
			e.style.top = `${t.sy}px`;
			const dx = t.x - t.sx,
				dz = t.y - t.sy,
				l = Math.hypot(dx, dz),
				f = l > 55 ? 55 / l : 1;
			e.firstChild.style.transform = `translate(${dx * f}px,${dz * f}px)`;
			if (
				t.right &&
				(this.lastState?.tanks.find((v) => v.local)?.boostCd || 0) <= 0
			) {
				const b = $("touch-boost");
				b.style.display = "block";
				b.textContent = this.lastState?.vehicle === "plane" ? "ROLL" : "BOOST";
				b.style.left = `${Math.min(innerWidth - 55, t.sx + 65)}px`;
				b.style.top = `${Math.max(70, t.sy - 90)}px`;
			}
		}
	}
	update(state, dt, attract = false, game = null) {
		this.lastState = state;
		const now = performance.now();
		if (now > this.toastUntil) $("toast").textContent = "";
		if (now > this.announceUntil) $("announce").textContent = "";
		if (this.name === "title" && this.input.device !== this.lastDevice) {
			const e = $("title-prompts");
			if (e) e.innerHTML = this.menuPrompts();
		}
		this.lastDevice = this.input.device;
		if (this.name !== "game" && !attract) return;
		this.hudTick += dt;
		if (this.hudTick < 0.09) return;
		this.hudTick = 0;
		if (this.input.device === "touch") this.touchSticks(this.input.touch);
		$("hud").hidden = false;
		$("bottom-hud").hidden = false;
		$("pause-button").hidden = attract;
		const left = state.tanks.filter((t) => t.id < 2),
			right = state.tanks.filter((t) => t.id >= 2);
		const card = (t) =>
			`<div class="score-card" style="--player:${esc(t.color)}"><div class="who">${esc(t.name)}${t.local ? " ◂" : ""}</div><div class="score">${t.score}<small>/ ${state.target}</small>${!t.alive ? `<small>↺ ${Math.ceil(t.respawn)}</small>` : ""}</div><div class="armor">${[0, 1, 2].map((i) => `<i class="${i >= t.hp ? "empty" : ""}"></i>`).join("")}</div></div>`;
		const sides =
			state.tanks.length === 2
				? [[state.tanks[0]], [state.tanks[1]]]
				: [left, right];
		const sec = Math.max(0, Math.ceil(state.timer)),
			tm = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
		$("hud").innerHTML =
			`<div class="score-side">${sides[0].map(card).join("")}</div><div class="clock"><div class="time ${sec < 15 ? "hurry" : ""}">${tm}</div><small>${state.mode === "solo" ? `HEAT ${state.heat + 1} / 4` : state.vehicle === "plane" ? "AIR DUEL" : "TANK DUEL"}</small></div><div class="score-side right">${sides[1].map(card).join("")}</div>`;
		const level = LEVELS[state.heat],
			local = state.tanks.find((t) => t.local) || state.tanks[0];
		const status =
			local?.rapid > 0
				? `RAPID FIRE · ${Math.ceil(local.rapid)}s`
				: local?.shield
					? "SHIELD READY"
					: level.rule;
		$("bottom-hud").innerHTML =
			`<div class="objective"><small>${level.name}</small>${esc(status)}</div><div class="controls-bar"><span>${this.glyph("move")} ${state.vehicle === "plane" ? "Steer" : "Move"}</span><span>${this.glyph("aim")} Aim</span><span>${this.glyph("fire")} Fire</span><span>${this.glyph("boost")} Boost <span class="boost-meter"><i style="width:${100 * (1 - Math.min(1, (local?.boostCd || 0) / 3.8))}%"></i></span></span></div>`;
		const intro = $("round-intro");
		intro.hidden = state.countdown <= 0;
		if (state.countdown > 0)
			intro.innerHTML = `<span class="heat-num">${state.mode === "solo" ? `CIRCUIT / HEAT 0${state.heat + 1}` : "FIELD BRIEFING"}</span><strong>${level.name}</strong><p>${state.mode === "local" && state.ghost ? "Both tanks vanish between shots. Follow your tracks; fire to reappear." : level.tip}</p><div class="count">${Math.ceil(state.countdown)}</div>`;
		if (game) {
			const c = game.cheats;
			const marks = [
				c.invincible ? "INVINCIBLE" : "",
				c.aiPaused ? "AI FROZEN" : "",
				c.slowmo !== 1 ? "SLOW MOTION" : "",
				c.colliders ? "PHYSICS VIEW" : "",
			].filter(Boolean);
			$("dev-badge").textContent = marks.length
				? `DEV · ${marks.join(" / ")}`
				: "";
		}
	}
}
