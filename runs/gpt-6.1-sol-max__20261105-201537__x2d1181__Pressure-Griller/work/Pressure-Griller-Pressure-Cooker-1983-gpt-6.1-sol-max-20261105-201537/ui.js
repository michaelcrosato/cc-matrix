import { TOPPINGS, BAYS, SHIFTS, DEFAULTS, fits, missing } from "./core.js";
export const $ = (id) => document.getElementById(id);
export const escapeText = (text) =>
	String(text).replace(
		/[&<>"']/g,
		(c) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				c
			],
	);
const questions = [
	[],
	[
		"How many issues did testing catch?",
		"How many would be considered critical issues / game breaking?",
		"What was the most helpful test you ran?",
		"What was the least helpful test you ran?",
	],
	[
		"What did you like most about the engine?",
		"Did you get stuck or guess wrong?",
		"What was the most important thing you had to build yourself?",
		"What was the hardest part about using the engine?",
		"What did you change in the engine, and why?",
		"If you could change one thing about the engine, what would it be?",
	],
	[
		"What did you like most about this prompt?",
		"What was confusing?",
		"What was the hardest thing to do?",
		"What would you change in this prompt?",
	],
];
export class UI {
	constructor(app) {
		this.app = app;
		this.lastTicketKey = "";
		this.plateKeys = [];
		this.focusIndex = 0;
		this.aboutTab = 0;
		this.credits = JSON.parse($("credits-data").textContent);
		document.addEventListener("click", (e) => {
			const b = e.target.closest("[data-action]");
			if (!b || b.disabled) return;
			this.app.audio.unlock();
			this.app.audio.event("click");
			this.app.action(b.dataset.action, b);
		});
		document.addEventListener("pointerover", (e) => {
			const b = e.target.closest("button,input");
			if (!b) return;
			this.setFocus(b, false);
			if (b.dataset.action === "ticket" && this.app.game.players[0])
				this.app.game.players[0].target = Number(b.dataset.bay);
		});
		document.addEventListener("input", (e) => {
			const el = e.target;
			if (el.dataset.setting) {
				this.app.settings[el.dataset.setting] = Number(el.value) / 100;
				this.app.applySettings();
				this.syncSettings();
			}
			if (el.dataset.variable) {
				const variable = el.dataset.variable,
					value = Number(el.value);
				this.app.game.config[variable] = value;
				if (variable === "patience")
					for (const t of this.app.game.tickets) {
						t.patience = (t.patience / t.maxPatience) * value;
						t.maxPatience = value;
					}
				el.nextElementSibling.value = this.format(variable, el.value);
				this.app.devUsed = true;
			}
		});
		const variables = [
			["moveSpeed", "Chef speed", 2, 10, 0.1],
			["beltSpeed", "Belt speed", 0.3, 3.5, 0.05],
			["patience", "Ticket patience", 20, 140, 1],
			["pressureGain", "Pressure gain", 0, 3, 0.05],
			["catchReach", "Catch reach", 0.5, 2.5, 0.05],
			["timeScale", "Simulation speed", 0.25, 4, 0.25],
		];
		$("dev-sliders").innerHTML = variables
			.map(
				([id, label, min, max, step]) =>
					`<div class="slider-row"><label for="dev-${id}">${label}</label><input type="range" id="dev-${id}" data-variable="${id}" min="${min}" max="${max}" step="${step}" value="${DEFAULTS[id]}"><output>${this.format(id, DEFAULTS[id])}</output></div>`,
			)
			.join("");
		this.syncSettings();
		this.prompts();
	}
	format(id, value) {
		return id === "patience"
			? `${Math.round(value)}s`
			: `${Number(value).toFixed(id === "moveSpeed" ? 1 : 2)}×`;
	}
	screen(name) {
		for (const s of document.querySelectorAll(".screen"))
			s.classList.remove("active");
		if (name === "game" || name === "interlude")
			$("hud").classList.add("active");
		if (name !== "game") $(name)?.classList.add("active");
		this.focusIndex = 0;
		document
			.querySelectorAll(".focused")
			.forEach((e) => e.classList.remove("focused"));
		if (this.app.inputMethod === "pad") this.focus(0);
		$("attract-label").style.display = this.app.attract ? "block" : "none";
		$("dev-badge").style.display =
			this.app.devUsed && name === "game" ? "block" : "none";
		$("touch-action").style.display = "none";
	}
	focusables() {
		return Array.from(
			document.querySelectorAll(
				`#${this.app.screen} button:not(:disabled),#${this.app.screen} input,#${this.app.screen} [tabindex="0"]`,
			),
		).filter((e) => e.offsetParent !== null);
	}
	setFocus(el, scroll = true) {
		const list = this.focusables(),
			i = list.indexOf(el);
		if (i < 0) return;
		document
			.querySelectorAll(".focused")
			.forEach((e) => e.classList.remove("focused"));
		this.focusIndex = i;
		if (this.app.inputMethod === "pad" || this.app.inputMethod === "keyboard")
			el.classList.add("focused");
		if (scroll) el.scrollIntoView({ block: "nearest", behavior: "instant" });
	}
	focus(delta) {
		const list = this.focusables();
		if (!list.length) return;
		this.focusIndex = (this.focusIndex + delta + list.length) % list.length;
		this.setFocus(list[this.focusIndex]);
	}
	menu(direction, activate = false) {
		const list = this.focusables();
		if (!list.length) return;
		const el = list[this.focusIndex] || list[0];
		if (activate) {
			if (el.tagName === "BUTTON") el.click();
			return;
		}
		if (el.id === "about-content") {
			if (direction === "down" || direction === "up") {
				el.scrollTop += direction === "down" ? 130 : -130;
				return;
			}
		}
		if (
			(direction === "left" || direction === "right") &&
			el.tagName === "INPUT"
		) {
			el.value = Math.max(
				Number(el.min),
				Math.min(
					Number(el.max),
					Number(el.value) +
						Number(el.step || 1) * (direction === "right" ? 1 : -1),
				),
			);
			el.dispatchEvent(new Event("input", { bubbles: true }));
			return;
		}
		this.focus(direction === "up" || direction === "left" ? -1 : 1);
	}
	glyph(action) {
		const pad = this.app.inputMethod === "pad",
			xbox = this.app.settings.glyphs === "xbox";
		const maps = pad
			? xbox
				? {
						action: "A",
						dash: "B",
						discard: "X",
						bell: "Y",
						cycle: "RB",
						pause: "☰",
						move: "LS",
					}
				: {
						action: "×",
						dash: "○",
						discard: "□",
						bell: "△",
						cycle: "R1",
						pause: "☰",
						move: "L",
					}
			: {
					action: "SPACE",
					dash: "SHIFT",
					discard: "R",
					bell: "Q",
					cycle: "TAB",
					pause: "ESC",
					move: "WASD",
				};
		return maps[action];
	}
	key(action) {
		return `<span class="key">${this.glyph(action)}</span>`;
	}
	prompts() {
		const pad = this.app.inputMethod === "pad";
		document.body.classList.toggle("pad", pad);
		document.body.classList.toggle("touch", this.app.inputMethod === "touch");
		$("controls").innerHTML = [
			["move", "Move"],
			["action", "Catch / serve"],
			["dash", "Dash"],
			["bell", "Dinner bell"],
			["cycle", "Ticket"],
			["discard", "Clear tray"],
		]
			.map(([a, b]) => `<span>${this.key(a)} ${b}</span>`)
			.join("");
		$("bell-key").textContent = this.glyph("bell");
		$("title-input").textContent = pad
			? `${this.app.settings.glyphs === "xbox" ? "A" : "×"} SELECT · LEFT STICK TO MOVE · COUCH CO-OP: 2 CONTROLLERS`
			: this.app.inputMethod === "touch"
				? "DRAG TO MOVE · CATCH & SERVE ASSISTED"
				: "WASD TO MOVE · SPACE TO CATCH & SERVE";
		$("tutorial-controls").innerHTML =
			this.app.inputMethod === "touch"
				? "Drag anywhere to move. Catching and serving are assisted. Tap the bell when it’s charged. A second finger gives you a dash."
				: `${this.key("move")} Move &nbsp; ${this.key("action")} Catch / serve &nbsp; ${this.key("dash")} Dash &nbsp; ${this.key("bell")} Bell<br>${this.key("cycle")} Switch ticket &nbsp; ${this.key("discard")} Clear burger &nbsp; ${this.key("pause")} Pause${!pad ? "<br>Or click the kitchen to move, catch a topping, or serve a counter. Right-click to dash." : ""}`;
	}
	syncSettings() {
		for (const key of ["music", "sfx"]) {
			const el = $(key === "music" ? "music-volume" : "sfx-volume");
			el.value = Math.round(this.app.settings[key] * 100);
			el.nextElementSibling.value = `${el.value}%`;
		}
		$("glyph-setting").textContent =
			this.app.settings.glyphs === "xbox" ? "Xbox" : "PlayStation";
		$("assist-setting").textContent = this.app.settings.assist ? "On" : "Off";
		$("shake-setting").textContent = this.app.settings.shake ? "On" : "Off";
	}
	syncDev() {
		for (const el of document.querySelectorAll("[data-variable]")) {
			el.value = this.app.game.config[el.dataset.variable];
			el.nextElementSibling.value = this.format(el.dataset.variable, el.value);
		}
		$("god-setting").textContent =
			`Pressure guard: ${this.app.game.god ? "On" : "Off"}`;
		$("auto-setting").textContent =
			`Chef AI: ${this.app.game.auto ? "On" : "Off"}`;
		$("physics-setting").textContent =
			`Physics view: ${this.app.scene.debugLines.visible ? "On" : "Off"}`;
		$("dev-info").textContent =
			`THREE.JS R180 · ${this.app.scene.backend.toUpperCase()} · RAPIER 0.19.3`;
	}
	toast(message, seconds = 2.5) {
		$("toast").textContent = message;
		$("toast").classList.add("show");
		this.toastUntil = performance.now() + seconds * 1000;
	}
	update() {
		const g = this.app.game;
		if (this.toastUntil && performance.now() > this.toastUntil) {
			$("toast").classList.remove("show");
			this.toastUntil = 0;
		}
		if (!g.players.length) return;
		$("score").textContent = String(g.score).padStart(5, "0");
		$("pressure-fill").style.width = `${g.pressure}%`;
		$("pressure-number").textContent = `${Math.round(g.pressure)}%`;
		$("pressure-label").textContent =
			g.pressure > 75
				? "TOO MANY COOKS!"
				: g.pressure > 45
					? "FEELING THE HEAT"
					: "KEEP YOUR COOL";
		$("pressure-fill").style.background =
			g.pressure > 75 ? "#b93c2d" : g.pressure > 45 ? "#d88732" : "#539282";
		$("shift-track").innerHTML =
			`${g.mode === "practice" ? "PRACTICE" : g.mode === "coop" ? "TWO-COOK RUSH" : "LUNCH RUSH"} <i>0${g.stage + 1}</i> / 03`;
		$("shift-goal").textContent =
			g.mode === "practice"
				? `${g.stats.served} ORDERS · NO CLOSING TIME`
				: `${g.servedThisShift} / ${g.goal()} ORDERS`;
		const secs = Math.max(0, Math.ceil(g.remaining));
		$("time").textContent =
			g.mode === "practice"
				? "∞"
				: `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
		$("time").style.color = secs < 20 ? "#bc482f" : "";
		$("combo").textContent =
			g.combo > 1 ? `${Math.min(g.combo, 5)}× hot-streak tips!` : "";
		$("bell").classList.toggle("ready", g.bell >= 99.9);
		$("bell").querySelector("strong").textContent =
			g.slow > 0
				? `${g.slow.toFixed(0)}s`
				: g.bell >= 99.9
					? "ding!"
					: `${Math.round(g.bell)}%`;
		$("bell-status").textContent =
			g.slow > 0
				? "NICE AND EASY"
				: g.bell >= 99.9
					? "SLOW THE BELTS"
					: "SERVE TO CHARGE";
		const p = g.players[0];
		const ticketKey =
			g.tickets
				.map((t) => `${t.id}:${t.cooldown > 0}:${t.patience < 15}`)
				.join("|") + `:${p.target}:${p.plate.join("")}`;
		if (ticketKey !== this.lastTicketKey) {
			this.lastTicketKey = ticketKey;
			$("tickets").innerHTML = g.tickets
				.map((t, i) => {
					const need = missing(p.plate, t.recipe),
						done = [...p.plate];
					return `<button class="ticket${p.target === i ? " selected" : ""}${t.cooldown > 0 ? " waiting" : ""}" data-action="ticket" data-bay="${i}" aria-label="Target ${BAYS[i].name}, ${t.recipe.map((r) => TOPPINGS.find((a) => a.id === r).name).join(", ")}" style="border-top:5px solid ${BAYS[i].color}"><div class="ticket-top"><b style="background:${BAYS[i].color}">${i + 1}</b><span>${BAYS[i].name}</span><span>${t.cooldown > 0 ? "✓" : ""}</span></div><div class="recipe">${t.recipe
						.map((r) => {
							const j = done.indexOf(r);
							if (j >= 0) done.splice(j, 1);
							return `<span class="ingredient ${r}${j >= 0 ? " done" : ""}" title="${TOPPINGS.find((a) => a.id === r).name}">${r}</span>`;
						})
						.join(
							"",
						)}<span class="recipe-label">${t.cooldown > 0 ? "THANK YOU!" : need.length === 0 ? "SERVE IT!" : "TOPPINGS"}</span></div><div class="patience"><i id="patience-${i}"></i></div></button>`;
				})
				.join("");
		}
		g.tickets.forEach((t, i) => {
			const bar = $(`patience-${i}`);
			if (bar) {
				bar.style.width = `${Math.max(0, t.patience / t.maxPatience) * 100}%`;
				bar.style.background = t.patience < 15 ? "#d95534" : "#4e8f7f";
			}
		});
		g.players.forEach((player, i) => {
			const card = $(`plate-${i}`);
			card.style.display = "block";
			const matching = g.tickets.find(
				(t) => t.cooldown <= 0 && fits(player.plate, t.recipe, true),
			);
			const target = g.tickets[player.target];
			const need = missing(player.plate, target.recipe);
			const key = `${player.plate.join("")}:${player.target}:${matching?.bay}:${Math.round(player.dash * 10)}`;
			if (key !== this.plateKeys[i]) {
				this.plateKeys[i] = key;
				card.innerHTML = `<small>${g.players.length > 1 ? `CHEF ${i + 1}` : "YOUR BURGER"}</small><div class="burger-icon"><i class="bun"></i><i class="patty"></i>${player.plate.map((r) => `<i class="ingredient ${r}"></i>`).join("")}${matching ? '<i class="cap"></i>' : ""}</div><div class="plate-title">${matching ? `Order up! → ${matching.bay + 1}` : player.plate.length ? "Keep stacking." : "Bun, meet destiny."}</div><div class="plate-help">${matching ? `Serve at ${BAYS[matching.bay].name}.` : `Catch ${need.length ? TOPPINGS.find((t) => t.id === need[0])?.name.toLowerCase() : "toppings"} for ${BAYS[player.target].name}.`}</div><div class="dash-meter"><span>DASH</span><div class="meter"><i style="width:${100 * (1 - player.dash / 2.7)}%"></i></div></div>`;
			}
		});
		if (g.players.length < 2) $("plate-1").style.display = "none";
		const nearbyFood = g.food.some(
			(f) => Math.hypot(f.x - p.x, f.z - p.z) < g.config.catchReach + 0.25,
		);
		const nearBay =
			BAYS.some((b) => Math.hypot(p.x - b.x, p.z - 3.8) < 1.5) &&
			p.plate.length > 0;
		const touchButton = $("touch-action");
		touchButton.style.display =
			this.app.inputMethod === "touch" &&
			this.app.screen === "game" &&
			(nearbyFood || nearBay)
				? "block"
				: "none";
		touchButton.textContent = nearBay ? "Serve!" : "Catch!";
	}
	interlude() {
		const i = this.app.game.stage + 1;
		$("shift-number").textContent = `0${i + 1}`;
		$("shift-name").textContent = SHIFTS[i].name;
		$("shift-hint").textContent = SHIFTS[i].hint;
	}
	results() {
		const g = this.app.game,
			won = g.won;
		$("result-eyebrow").textContent = won
			? "THE LAST PLATE IS OUT."
			: "SOME LIKE IT A LITTLE LESS HOT.";
		$("result-title").textContent = won
			? "Well done, chef."
			: g.pressure >= 100
				? "A little overcooked."
				: "Closing time.";
		const stars = won ? (g.stats.wrong <= 2 && g.stats.hits < 3 ? 3 : 2) : 1;
		$("result-stars").textContent = "★".repeat(stars) + "☆".repeat(3 - stars);
		$("result-score").textContent = g.score.toLocaleString();
		$("result-copy").textContent = won
			? `${g.stats.served} hungry orders. ${g.stage + 1} wild rush${g.stage ? "es" : ""}. One very happy neighborhood.`
			: `You fed ${g.stats.served} regular${g.stats.served === 1 ? "" : "s"}. A fresh apron and another try?`;
		$("result-stats").innerHTML = [
			["Orders served", g.stats.served],
			["Toppings caught", g.stats.caught],
			["Best hot streak", `${g.bestCombo}×`],
			["Personal best", Math.max(g.score, this.app.best).toLocaleString()],
		]
			.map(
				([k, v]) =>
					`<div class="result-stat"><span>${k}</span><strong>${v}</strong></div>`,
			)
			.join("");
		$("result-buttons").hidden = AIHub.active;
		$("result-buttons").style.display = AIHub.active ? "none" : "flex";
		$("hub-result-note").hidden = !AIHub.active;
	}
	about(tab = this.aboutTab) {
		this.aboutTab = tab;
		const c = this.credits;
		document
			.querySelectorAll(".about-tabs button")
			.forEach((b, i) => b.classList.toggle("selected", i === tab));
		if (tab === 0) {
			$("about-content").innerHTML =
				"<p>An original arcade kitchen inspired by <b>Pressure Cooker (1983)</b>: catch conveyor toppings, match the orders, and hustle to the right counter. Procedural art, animation, music, and gibberish voices made for this game.</p><dl>" +
				Object.entries(c.sourceInformation)
					.map(
						([k, v]) =>
							`<dt>${escapeText(k[0].toUpperCase() + k.slice(1))}</dt><dd>${escapeText(v)}</dd>`,
					)
					.join("") +
				"</dl>";
		} else {
			const values =
				c[["", "testingFeedback", "engineFeedback", "promptFeedback"][tab]];
			$("about-content").innerHTML = questions[tab]
				.map(
					(q, i) =>
						`<div class="qa"><b>${escapeText(q)}</b><p>${escapeText(values[i] || "unknown")}</p></div>`,
				)
				.join("");
		}
		$("about-content").scrollTop = 0;
	}
}
