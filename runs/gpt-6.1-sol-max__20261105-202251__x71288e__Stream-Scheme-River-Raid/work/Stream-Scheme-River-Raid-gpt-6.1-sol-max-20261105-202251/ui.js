import feedback from "./feedback.json";

export const $ = (id) => document.getElementById(id);
export const SECTORS = ["Inkwood Reach", "Splitwater", "Iron Estuary"];
const escapeHtml = (text) =>
	String(text).replace(
		/[&<>"']/g,
		(c) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				c
			],
	);
const button = (action, label, secondary = false, extra = "") =>
	`<button class="wide-button${secondary ? " secondary" : ""}" data-action="${action}" ${extra}><span>${label}</span><span class="arrow">↗</span></button>`;
const back = () =>
	'<button class="back-button" data-action="back"><span data-prompt="back"></span> Back</button>';
const range = (key, label, value, min, max, step, unit = "", dev = false) =>
	`<label class="range-row"><span class="range-head"><span>${label}</span><output>${value}${unit}</output></span><input aria-label="${label}" type="range" data-setting="${key}" data-dev="${dev}" min="${min}" max="${max}" step="${step}" value="${value}" data-unit="${unit}"></label>`;
const questions = {
	testingFeedback: [
		"How many issues did testing catch?",
		"How many were critical / game breaking?",
		"Most helpful test?",
		"Least helpful test?",
	],
	engineFeedback: [
		"What did you like most about the engine?",
		"Did you get stuck or guess wrong?",
		"Most important thing built yourself?",
		"Hardest part of the engine?",
		"What changed in the engine, and why?",
		"One thing to change about the engine?",
	],
	promptFeedback: [
		"What did you like most?",
		"What was confusing?",
		"Hardest thing to do?",
		"What would you change?",
	],
};
export class Interface {
	constructor({ action, settings, game, audio, net }) {
		Object.assign(this, { action, settings, game, audio, net });
		this.screen = null;
		this.returnScreen = "title";
		this.focus = 0;
		this.inputType = "keyboard";
		this.aboutTab = "sourceInformation";
		this.radioUntil = 0;
		this.bannerUntil = 0;
		this.toastUntil = 0;
		this.endReason = "";
		this.menu = $("menu");
		this.menu.addEventListener("click", (e) => {
			const target = e.target.closest("button");
			if (!target || target.disabled) return;
			this.audio.unlock();
			this.audio.sfx("menu");
			if (target.dataset.action === "tab") {
				this.aboutTab = target.dataset.value;
				this.open("about");
				return;
			}
			this.action(target.dataset.action, target.dataset.value);
		});
		this.menu.addEventListener("pointerover", (e) => {
			const target = e.target.closest("button,input,textarea");
			if (target) {
				const i = this.items().indexOf(target);
				if (i >= 0 && i !== this.focus) {
					this.focus = i;
					this.markFocus(false);
				}
			}
		});
		this.menu.addEventListener("input", (e) => {
			if (!e.target.matches("input[type=range]")) return;
			const input = e.target;
			input.closest("label").querySelector("output").textContent =
				input.value + input.dataset.unit;
			this.action(input.dataset.dev === "true" ? "devValue" : "setting", {
				key: input.dataset.setting,
				value: +input.value,
			});
		});
		$("pause-button").addEventListener("click", () => {
			this.audio.unlock();
			this.action("pause");
		});
		$("touch-burst").addEventListener("pointerdown", (e) => {
			e.stopPropagation();
			this.action("touchBurst");
		});
	}
	items() {
		return [
			...this.menu.querySelectorAll("button:not(:disabled),input,textarea"),
		].filter((el) => el.offsetParent !== null);
	}
	markFocus(scroll = true) {
		const items = this.items();
		this.focus = (this.focus + items.length) % Math.max(1, items.length);
		for (const el of this.menu.querySelectorAll(".focused"))
			el.classList.remove("focused");
		const el = items[this.focus];
		if (el) {
			el.classList.add("focused");
			if (scroll) el.scrollIntoView({ block: "nearest" });
		}
	}
	navigate(direction) {
		if (!this.screen) return;
		const items = this.items(),
			el = items[this.focus];
		if (direction === "up" || direction === "down") {
			this.focus += direction === "up" ? -1 : 1;
			this.markFocus();
			this.audio.sfx("menu");
		}
		if (direction === "accept" && el) {
			this.audio.unlock();
			if (el.matches("input[type=range]")) this.navigate("right");
			else {
				el.focus({ preventScroll: true });
				el.click();
			}
		}
		if (direction === "back") this.action("back");
		if (
			(direction === "left" || direction === "right") &&
			el?.matches("input[type=range]")
		) {
			const step = +el.step || 1;
			el.value = Math.max(
				+el.min,
				Math.min(+el.max, +el.value + (direction === "left" ? -step : step)),
			);
			el.dispatchEvent(new Event("input", { bubbles: true }));
			this.audio.sfx("menu");
		}
	}
	glyph(action) {
		if (this.inputType === "touch") {
			const touch = {
				accept: "TAP",
				back: "BACK",
				fire: "AUTO",
				roll: "TAP",
				burst: "2×",
				pause: "Ⅱ",
				move: "DRAG",
				aim: "AUTO",
			};
			return `<span class="key">${touch[action] || "TAP"}</span>`;
		}
		const pad = this.inputType === "pad",
			xbox = this.settings.glyphs === "xbox";
		const table = pad
			? {
					accept: [xbox ? "A" : "×", "cross"],
					back: [xbox ? "B" : "○", "circle"],
					fire: [xbox ? "A" : "×", "cross"],
					roll: [xbox ? "B" : "○", "circle"],
					burst: [xbox ? "X" : "□", "square"],
					pause: ["☰", ""],
					move: ["L", ""],
					aim: ["R", ""],
				}
			: {
					accept: ["↵", ""],
					back: ["Esc", ""],
					fire: ["Space", ""],
					roll: ["Shift", ""],
					burst: ["E", ""],
					pause: ["Esc", ""],
					move: ["WASD", ""],
					aim: ["Mouse", ""],
				};
		const [text, style] = table[action] || ["↵", ""];
		return `<span class="key${pad ? ` pad ${style}` : ""}">${text}</span>`;
	}
	prompts() {
		for (const node of document.querySelectorAll("[data-prompt]"))
			node.innerHTML = this.glyph(node.dataset.prompt);
	}
	type(type) {
		if (type === this.inputType) return;
		this.inputType = type;
		document.body.classList.toggle("touch-mode", type === "touch");
		this.prompts();
	}
	open(screen) {
		this.screen = screen;
		this.focus = 0;
		if (!screen) {
			this.menu.classList.add("hidden");
			return;
		}
		this.menu.classList.remove("hidden");
		this.menu.dataset.screen = screen;
		let content = "";
		if (screen === "title") {
			content = `<div class="title-content"><div class="masthead"><svg class="wing-logo" viewBox="0 0 100 54" fill="currentColor" aria-hidden="true"><path d="M48 1h5l4 20 38 13v5l-38-5-2 12 13 4v4l-18-3-18 3v-4l13-4-2-12-38 5v-5l38-13z"/></svg><span>RIVER PATROL DIVISION<br>FLIGHT PLAN NO. 1982</span></div><div class="eyebrow">A VERY QUESTIONABLE FLIGHT PLAN</div><h1 class="wordmark">Stream<span>Scheme</span></h1><p class="tagline">THE RIVER HAS OTHER PLANS.</p><p class="title-desc">Skim the water. Steal the fuel.<br>Make a few structural adjustments.</p><nav class="title-nav button-list" aria-label="Main menu">${button("solo", "FLY SOLO")}${button("wing", "WING TOGETHER", true)}${button("manual", "FLIGHT MANUAL", true)}</nav><div class="title-bottom"><button class="text-button" data-action="settings">OPTIONS ↗</button><button class="text-button" data-action="about">ABOUT / CREDITS ↗</button></div></div><div class="title-stamp"><span>UPRIVER OR BUST<br>1—4 PILOTS</span><div class="roundel">↟</div></div><aside class="route-card"><div class="eyebrow">YOUR ROUTE / NO REFUNDS</div><h3>THE LONG WAY UPRIVER</h3><div class="route-leg"><span>01</span> INKWOOD REACH</div><div class="route-leg"><span>02</span> SPLITWATER</div><div class="route-leg"><span>03</span> IRON ESTUARY</div><p class="small">Two bridges. One very large boat.<br>Enough fuel? That's your department.</p></aside><footer class="title-footer"><span class="prompt"><span data-prompt="accept"></span> TAKE FLIGHT</span><span>BEST ${String(this.settings.best || 0).padStart(6, "0")} &nbsp; / &nbsp; ORIGINAL ARCADE SORTIE</span><span>CEL INK / VOL. 01</span></footer>`;
		} else {
			let body = "",
				title = "",
				kicker = "",
				large = false;
			if (screen === "pause") {
				title = "Holding pattern";
				kicker = "MAPS OUT. ENGINES IDLING.";
				body = `<div class="button-list">${button("resume", "RESUME FLIGHT")}${button("settings", "OPTIONS", true)}${button("manual", "FLIGHT MANUAL", true)}${button("dev", "FLIGHT TEST / DEV MODE", true)}${!this.net.hub && this.net.authority ? button("retry", "RETRY CHECKPOINT", true) : ""}${!this.net.hub ? button("abort", "RETURN TO HANGAR", true) : ""}</div>`;
			}
			if (screen === "settings") {
				title = "Tune the radio";
				kicker = "OPTIONS";
				body =
					range(
						"music",
						"Music",
						Math.round(this.settings.music * 100),
						0,
						100,
						5,
						"%",
					) +
					range(
						"effects",
						"Sound & radio",
						Math.round(this.settings.effects * 100),
						0,
						100,
						5,
						"%",
					) +
					`<div class="button-list compact">${button("glyphs", `CONTROLLER GLYPHS <b>${this.settings.glyphs === "xbox" ? "A B X Y" : "PLAYSTATION"}</b>`, true)}${button("autoFire", `AUTO FIRE <b>${this.settings.autoFire ? "ON" : "OFF"}</b>`, true)}${button("assist", `AIM ASSIST <b>${this.settings.assist ? "ON" : "OFF"}</b>`, true)}${button("reducedFlash", `REDUCED FLASH <b>${this.settings.reducedFlash ? "ON" : "OFF"}</b>`, true)}${button("fullscreen", "FULLSCREEN", true)}</div><p class="option-note">Touch always assists aim and fire. Music starts at 10%.<br>Options save on this device; Hub rounds use their own settings.</p>`;
			}
			if (screen === "manual") {
				title = "Water under your wings";
				kicker = "FLIGHT MANUAL";
				large = true;
				const pad = this.inputType === "pad";
				body = `<p class="subtitle">Clear two bridges. Sink the Tax Collector. Come home in one piece.</p><div class="controls-grid"><div><div class="eyebrow">FLIGHT CONTROLS</div><div class="control-row"><span>Steer & throttle</span><span>${this.glyph("move")}</span></div><div class="control-row"><span>Fire / aim</span><span>${this.glyph("fire")} ${pad ? this.glyph("aim") : this.inputType === "touch" ? this.glyph("aim") : '<span class="key">Click</span>'}</span></div><div class="control-row"><span>Invulnerable roll</span><span>${this.glyph("roll")}</span></div><div class="control-row"><span>Clear the river / burst</span><span>${this.glyph("burst")}</span></div><div class="control-row"><span>Pause / developer tools</span><span>${this.glyph("pause")}</span></div></div><div><div class="eyebrow">KNOW YOUR RIVER</div><p><strong style="color:var(--yellow)">YELLOW DOCKS = FUEL.</strong> Fly over them to fill up. Throttle down to stay longer. Your gun holds fire while refueling.</p><p><strong style="color:var(--coral)">RED = TROUBLE.</strong> Boats, helicopters and bullets hurt. Banks and islands hurt too. A roll buys 0.8 seconds of safety.</p></div></div><div class="manual-callout"><p><strong>BRIDGES ARE CHECKPOINTS.</strong> Shoot the striped center. The river waits while you line up. Each breach repairs your hull, refills two bursts and adds fuel. Chain targets for up to ×8 score.</p></div><p class="small muted">Couch wing: up to four standard gamepads, or P1 WASD / Space / Left Shift / E and P2 arrows / Enter / Right Shift / slash. Share fuel, score and rescue airframes. Touch: drag the left side; tap right to roll, double-tap or tap BURST for burst. Aim and fire are assisted.</p>`;
			}
			if (screen === "wing") {
				title = "Better in formation";
				kicker = "WING TOGETHER";
				body = `<p class="subtitle">One river. One fuel tank. Up to four questionable pilots.</p><div class="button-list">${button("couch", "LAUNCH COUCH WING")}${button("radio", "DIRECT RADIO LINK", true)}${button("hubInfo", "AI HUB SESSION PLAY", true)}</div><div class="manual-callout"><p>For couch play, connect gamepads before launch. Two pilots can share a keyboard. Online, AI Hub handles invites; a direct radio link works through invitation and reply codes.</p></div>`;
			}
			if (screen === "radio") {
				title = "Open a radio link";
				kicker = "DIRECT CO-OP / 1—4 PILOTS";
				large = true;
				body = `<p class="subtitle">Exchange codes by your own messenger. The flight leader starts the sortie.</p><div class="radio-grid"><div><div class="eyebrow">FLIGHT LEADER</div><p class="radio-step">1. Make an invitation. Send it to one wingmate.</p>${button("makeOffer", "MAKE INVITATION")}<p class="radio-step">3. Paste their reply below, then link the radio.</p>${button("acceptAnswer", "ACCEPT REPLY", true)}</div><div><div class="eyebrow">WINGMATE</div><p class="radio-step">2. Paste the invitation below. Make a reply and send it back.</p>${button("makeAnswer", "JOIN / MAKE REPLY", true)}<p class="radio-step">No account or game server. Direct peer connection; some restrictive networks cannot connect.</p></div></div><p class="radio-step">Incoming invitation or reply</p><textarea id="radio-input" class="radio-code" aria-label="Incoming radio code" spellcheck="false"></textarea><p class="radio-step">Outgoing code <button class="text-button" data-action="copyCode">COPY ↗</button></p><textarea id="radio-output" class="radio-code" aria-label="Outgoing radio code" readonly></textarea><p id="radio-status" role="status">Ready to tune in. Each invitation links one wingmate.</p><div class="inline-buttons">${button("radioLaunch", "TAKE FLIGHT")}${button("disconnect", "CLOSE RADIO", true)}</div>`;
			}
			if (screen === "dev") {
				title = "Flight test";
				kicker = "LIVE DEVELOPER TOOLS";
				large = true;
				const host = this.net.authority;
				body = host
					? `<p class="subtitle">Changes apply live. Resume to fly. Scores earned in flight test stay unranked.</p><div class="dev-sliders">` +
						range(
							"scrollSpeed",
							"River speed",
							this.game.params.scrollSpeed,
							15,
							70,
							1,
							"",
							true,
						) +
						range(
							"steerSpeed",
							"Steering speed",
							this.game.params.steerSpeed,
							10,
							45,
							1,
							"",
							true,
						) +
						range(
							"fuelBurn",
							"Fuel burn / second",
							this.game.params.fuelBurn,
							0,
							4,
							0.05,
							"",
							true,
						) +
						range(
							"enemyFire",
							"Enemy fire rate",
							this.game.params.enemyFire,
							0,
							3,
							0.1,
							"×",
							true,
						) +
						range(
							"bulletDamage",
							"Shot damage",
							this.game.params.bulletDamage,
							1,
							8,
							1,
							"",
							true,
						) +
						`</div><div class="inline-buttons toggle-row">${button("god", `INVINCIBLE: ${this.game.god ? "ON" : "OFF"}`, true)}${button("autopilot", `AI PILOT: ${this.game.autopilot ? "ON" : "OFF"}`, true)}</div><div class="sector-buttons">${[...SECTORS, "Flagship"].map((s, i) => button("jump", `${String(i + 1).padStart(2, "0")} / ${s.toUpperCase()}`, true, `data-value="${i}"`)).join("")}</div><div class="inline-buttons" style="margin-top:.6em">${button("refill", "REFILL SUPPLIES", true)}${button("defaults", "RESET DEFAULTS", true)}${button("resume", "RESUME FLIGHT")}</div>`
					: "<p>The flight leader owns the simulation. Live sliders are available on their pause menu.</p>";
			}
			if (screen === "debrief") {
				const won = this.game.phase === "won";
				title = won ? "That went swimmingly." : "A slight course correction.";
				kicker = won
					? "SORTIE COMPLETE / RIVER CLEAR"
					: this.endReason || "SORTIE LOST";
				const stats = this.game.stats,
					accuracy = Math.round((stats.hits / Math.max(1, stats.shots)) * 100);
				body = `<div class="debrief-score">${String(this.game.score).padStart(6, "0")}</div><div class="eyebrow">${this.game.god || this.game.autopilot ? "FLIGHT TEST / UNRANKED" : "FINAL PATROL SCORE"}</div><div class="debrief-stats"><div><b>${stats.kills}</b><span>Targets cleared</span></div><div><b>${stats.bridges} / 2</b><span>Bridges breached</span></div><div><b>${stats.fuelStops}</b><span>Fuel stops</span></div><div><b>${Math.floor(this.game.elapsed / 60)}:${String(Math.floor(this.game.elapsed % 60)).padStart(2, "0")}</b><span>Flight time</span></div><div><b>${Math.min(100, accuracy)}%</b><span>Accuracy</span></div><div><b>${stats.rolls}</b><span>Barrel rolls</span></div></div>${!this.net.hub && this.net.authority ? `<div class="button-list">${!won ? button("retry", "RETRY CHECKPOINT") : ""}${button("again", "FLY AGAIN", !won)}${button("abort", "RETURN TO HANGAR", true)}</div>` : `<p class="muted">Waiting for the flight leader.</p>${!this.net.hub ? button("abort", "RETURN TO HANGAR", true) : ""}`}`;
			}
			if (screen === "about") {
				title = "The flight record";
				kicker = "ABOUT / CREDITS";
				large = true;
				const tabs = [
					["sourceInformation", "Source Information"],
					["testingFeedback", "Testing Feedback"],
					["engineFeedback", "Engine Feedback"],
					["promptFeedback", "Prompt Feedback"],
				];
				body = `<div class="tabs">${tabs.map(([id, label]) => `<button class="${id === this.aboutTab ? "active" : ""}" data-action="tab" data-value="${id}">${label}</button>`).join("")}</div>`;
				if (this.aboutTab === "sourceInformation")
					body += `<div class="source-grid">${Object.entries(
						feedback.sourceInformation,
					)
						.map(
							([key, value]) =>
								`<div class="source-pair"><strong>${escapeHtml(key.replace(/([A-Z])/g, " $1"))}</strong><span>${escapeHtml(value)}</span></div>`,
						)
						.join("")}</div>`;
				else
					body += `<div class="feedback-list">${feedback[this.aboutTab].map((answer, i) => `<div class="feedback-item"><b>${questions[this.aboutTab][i]}</b><p>${escapeHtml(answer)}</p></div>`).join("")}</div>`;
				body +=
					'<p class="option-note">An original homage. All geometry, graphics, music and voices are generated by code. River Raid is the inspiration; no original game assets are included.</p>';
			}
			content = `<section class="panel${large ? " large" : ""}"><div class="eyebrow">${kicker}</div><h2>${title}</h2>${body}<div class="panel-footer">${back()}<span class="prompt"><span data-prompt="accept"></span> SELECT &nbsp; / &nbsp; ↑↓ NAVIGATE</span></div></section>`;
		}
		this.menu.innerHTML = content;
		this.prompts();
		this.markFocus(false);
	}
	refresh() {
		const f = this.focus;
		this.open(this.screen);
		this.focus = f;
		this.markFocus(false);
	}
	radio(text) {
		this.radioUntil = performance.now() + 4400;
		$("radio-speaker").textContent = text.speaker;
		$("radio-text").textContent = text.text;
		$("radio-message").classList.add("show");
	}
	banner(index, text = SECTORS[index]) {
		this.bannerUntil = performance.now() + 2400;
		$("stage-kicker").textContent =
			`SECTOR ${String(index + 1).padStart(2, "0")}`;
		$("stage-text").textContent = text;
		$("stage-banner").classList.add("show");
	}
	toast(text) {
		$("toast").textContent = text;
		$("toast").classList.remove("hidden");
		this.toastUntil = performance.now() + 5000;
	}
	update(now, localId) {
		const game = this.game,
			playing = ["playing", "attract"].includes(game.phase),
			attract = game.phase === "attract";
		$("hud").classList.toggle("hidden", !playing || this.screen === "title");
		$("pause-button").classList.toggle(
			"hidden",
			!playing || attract || !!this.screen,
		);
		$("attract").classList.toggle("hidden", !attract || !!this.screen);
		if (now > this.radioUntil) $("radio-message").classList.remove("show");
		if (now > this.bannerUntil) $("stage-banner").classList.remove("show");
		if (now > this.toastUntil) $("toast").classList.add("hidden");
		$("dev-badge").classList.toggle(
			"hidden",
			!playing || !!this.screen || attract || !this.game.devUsed,
		);
		if (!playing || this.screen === "title") return;
		$("score").textContent = String(Math.floor(game.score)).padStart(6, "0");
		$("combo").textContent = game.combo > 1 ? `×${game.combo}` : "";
		$("sector-name").textContent = SECTORS[game.stage].toUpperCase();
		const bridge = game.entities.find(
			(e) =>
				e.type === "bridge" &&
				!e.dead &&
				e.s - game.progress > 0 &&
				e.s - game.progress < 180,
		);
		$("objective").textContent = bridge
			? "BLAST THE STRIPED BRIDGE CENTER"
			: game.bossStarted
				? "SINK THE TAX COLLECTOR"
				: game.stage === 1
					? "PICK A CHANNEL · KEEP THE CHAIN"
					: "FOLLOW THE RIVER · WATCH YOUR FUEL";
		$("fuel-number").textContent = `${Math.ceil(game.fuel)}%`;
		$("fuel-fill").style.width = `${Math.max(0, game.fuel)}%`;
		$("fuel-panel").classList.toggle("low", game.fuel <= 20);
		$("fuel-note").textContent =
			game.fuel <= 20 ? "FUEL LOW · FIND YELLOW" : "OVERFLY YELLOW TO REFUEL";
		const p = game.players.find((p) => p.id === localId) || game.players[0];
		if (p) {
			$("pilot-name").textContent = p.name.toUpperCase();
			$("hulls").innerHTML = [0, 1, 2]
				.map((i) => `<span class="${i >= p.hp ? "lost" : ""}">◆</span>`)
				.join(" ");
			$("roll-status").textContent =
				p.rollCooldown > 0 ? `${p.rollCooldown.toFixed(1)}s` : "READY";
			$("roll-fill").style.width = `${(1 - p.rollCooldown / 4.8) * 100}%`;
			$("burst-count").textContent =
				p.bursts + (p.bursts === 1 ? " CHARGE" : " CHARGES");
			const danger = game.entities.some(
				(e) =>
					!e.dead &&
					!["cache", "fuel"].includes(e.type) &&
					e.s > game.progress &&
					e.s < game.progress + 80,
			);
			$("touch-burst").classList.toggle(
				"hidden",
				this.inputType !== "touch" ||
					!!this.screen ||
					!danger ||
					p.bursts <= 0 ||
					attract,
			);
		}
		$("reserves").textContent =
			Math.max(0, game.reserves) +
			" RESCUE AIRFRAMES · " +
			game.players.filter((p) => !p.left).length +
			(game.players.length === 1 ? " PILOT" : " PILOTS");
		const ratio = Math.min(100, (game.progress / 5400) * 100);
		$("mission-fill").style.width = `${ratio}%`;
		$("route-distance").textContent = `${Math.floor(ratio)}%`;
		$("route-label").textContent =
			`${String(game.stage + 1).padStart(2, "0")} / 03`;
		const boss = game.entities.find((e) => e.type === "boss");
		const showBoss = game.bossStarted && !boss?.dead && !this.screen;
		document.body.classList.toggle("boss-mode", showBoss);
		$("boss-hud").classList.toggle("hidden", !showBoss);
		if (showBoss) {
			$("boss-fill").style.width =
				`${Math.max(0, (boss.hp / boss.maxHp) * 100)}%`;
			$("boss-pattern").textContent = [
				"FAN FIRE · FIND A GAP",
				"AIMED VOLLEY · KEEP MOVING",
				"CROSSFIRE · ROLL THROUGH",
			][Math.floor(game.bossTime / 6) % 3];
		}
	}
}
