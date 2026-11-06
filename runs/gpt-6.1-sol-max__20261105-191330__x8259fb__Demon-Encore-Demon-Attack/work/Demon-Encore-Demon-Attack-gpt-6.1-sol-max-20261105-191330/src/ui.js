import report from "../feedback.json";
import { DEFAULTS, WAVES } from "./game.js";

const $ = (id) => document.getElementById(id);
const QUESTIONS = {
	testingFeedback: [
		"How many issues did testing catch?",
		"How many were critical / game breaking?",
		"Most helpful test",
		"Least helpful test",
	],
	engineFeedback: [
		"What did you like most?",
		"Did you get stuck or guess wrong?",
		"Most important thing built yourself",
		"Hardest part of the engine",
		"Engine changes and why",
		"One desired engine change",
	],
	promptFeedback: [
		"What did you like most?",
		"What was confusing?",
		"What was hardest?",
		"What would you change?",
	],
};
const escapeHTML = (s) =>
	String(s).replace(
		/[&<>"']/g,
		(c) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				c
			],
	);
const btn = (label, action, detail = "", extra = "") =>
	'<button type="button" class="menu-button ' +
	extra +
	'" data-action="' +
	action +
	'"><span>' +
	label +
	"</span><span>" +
	detail +
	"</span></button>";
const panel = (eyebrow, title, lead, body, wide = false) =>
	'<section class="panel ' +
	(wide ? "wide" : "") +
	'"><div class="eyebrow">' +
	eyebrow +
	"</div><h2>" +
	title +
	"</h2>" +
	(lead ? '<p class="lead">' + lead + "</p>" : "") +
	body +
	"</section>";

export class UI {
	constructor(app) {
		this.app = app;
		this.overlay = $("overlay");
		this.focus = 0;
		this.previous = null;
		this.creditTab = "sourceInformation";
		this.lastHUD = 0;
		this.bannerUntil = 0;
		this.toastUntil = 0;
		document.addEventListener("click", (e) => {
			const b = e.target.closest("[data-action]");
			if (b && !b.disabled) {
				this.app.audio.unlock();
				this.app.action(b.dataset.action);
			}
		});
		document.addEventListener("pointerover", (e) => {
			const el = e.target.closest("button,input,select,textarea,.scroll-area");
			if (el && this.app.menu) {
				this.app.input.activity(
					e.pointerType === "touch" ? "touch" : "keyboard",
				);
				this.setFocus(el, false);
			}
		});
		document.addEventListener("input", (e) => this.change(e.target));
		document.addEventListener("change", (e) => this.change(e.target));
		this.overlay.addEventListener("focusin", (e) => {
			if (e.target.matches("button,input,select,textarea,.scroll-area"))
				this.setFocus(e.target, false);
		});
	}
	buttons() {
		return [
			...this.overlay.querySelectorAll(
				"button:not(:disabled),input,select,textarea,.scroll-area",
			),
		];
	}
	setFocus(el, dom = true) {
		this.overlay.querySelectorAll(".focused").forEach((e) => {
			e.classList.remove("focused");
		});
		const list = this.buttons(),
			i = list.indexOf(el);
		if (i < 0) return;
		this.focus = i;
		(el.closest(".row") || el).classList.add("focused");
		if (dom) {
			el.focus({ preventScroll: true });
			el.scrollIntoView({ block: "nearest", behavior: "instant" });
		}
	}
	navigate(dir) {
		const list = this.buttons();
		if (!list.length) return;
		const current = list[this.focus];
		if (current?.classList.contains("scroll-area")) {
			if (
				(dir > 0 &&
					current.scrollTop + current.clientHeight <
						current.scrollHeight - 2) ||
				(dir < 0 && current.scrollTop > 0)
			) {
				current.scrollBy(0, dir * 120);
				return;
			}
		}
		this.focus = (this.focus + dir + list.length) % list.length;
		this.setFocus(list[this.focus]);
		this.app.audio.play("menu");
	}
	adjust(dir) {
		const el = this.buttons()[this.focus];
		if (!el) return;
		if (el.type === "range") {
			el.value = String(
				Math.max(+el.min, Math.min(+el.max, +el.value + dir * (+el.step || 1))),
			);
			this.change(el);
		} else if (el.tagName === "SELECT") {
			el.selectedIndex =
				(el.selectedIndex + dir + el.options.length) % el.options.length;
			this.change(el);
		} else if (el.type === "checkbox") {
			el.checked = !el.checked;
			this.change(el);
		} else if (el.classList.contains("scroll-area")) el.scrollBy(0, dir * 150);
	}
	activate() {
		const el = this.buttons()[this.focus];
		if (!el) return;
		if (el.type === "range" || el.tagName === "SELECT") this.adjust(1);
		else if (el.type === "checkbox") {
			el.checked = !el.checked;
			this.change(el);
		} else if (el.tagName === "TEXTAREA") {
			el.focus();
		} else el.click();
	}
	change(el) {
		const setting = el.dataset.setting,
			tune = el.dataset.tune;
		this.app.input.activity(this.app.input.mode);
		if (setting) {
			this.app.settings[setting] =
				el.type === "checkbox"
					? el.checked
					: el.type === "range"
						? Number(el.value)
						: el.value;
			this.app.save();
			this.app.audio.apply();
			this.prompts();
		}
		if (tune && this.app.game?.tuning)
			this.app.game.tuning[tune] =
				el.type === "checkbox" ? el.checked : Number(el.value);
		const out = el.closest(".row")?.querySelector("output");
		if (out)
			out.textContent = setting
				? el.value + "%"
				: Number(el.value).toFixed(2) + "×";
	}
	show(name, back = null) {
		const a = this.app;
		this.previous = back || this.previous;
		a.menu = name;
		this.focus = 0;
		this.overlay.className = name === "title" ? "" : name ? "modal" : "empty";
		$("masthead").hidden = a.started || a.attract;
		$("hud").hidden = !a.started;
		$("attract").hidden = !a.attract;
		if (!name) {
			this.overlay.innerHTML = "";
			this.prompts();
			return;
		}
		let body = "";
		if (name === "title") {
			body =
				'<section class="title-layout"><div class="eyebrow">A ONE-MORE-RUN SHOOTER</div><h1>DEMON<span>ENCORE<span style="font-size:.3em;vertical-align:top;letter-spacing:0">✦</span></span></h1><p class="title-tagline"><strong>Bad company. Good aim.</strong><br>The sky is crawling. Clear it. Then clear it again.</p><div class="menu-list">' +
				btn("SOLO SORTIE", "solo", "01 PILOT", "primary") +
				btn("CO-OP FORMATION", "coop", "02–04 PILOTS") +
				btn("FLIGHT SCHOOL", "controls", "LEARN THE ROPES") +
				btn("SETTINGS", "settings", "MAKE IT YOURS") +
				btn("ABOUT / CREDITS", "about", "THE FINE PRINT") +
				'</div><p class="title-small"><b>7 ENCOUNTERS</b> &nbsp; / &nbsp; SPLITTING DEMONS &nbsp; / &nbsp; ONE LOUD FINALE</p></section><div class="title-stamp"><b>07</b><span>ENCOUNTERS.<br><strong>NO PEACE AND QUIET.</strong></span></div>';
		} else if (name === "difficulty") {
			body = panel(
				"SOLO SORTIE",
				"PICK YOUR TROUBLE.",
				"Seven encounters. One life bar. Every near miss has its rewards.",
				'<div class="difficulty">' +
					btn(
						"CHILL",
						"diff:chill",
						"5 HULL · EASIER CROSSFIRE",
						a.difficulty === "chill" ? "selected" : "",
					) +
					btn(
						"ARCADE",
						"diff:arcade",
						"4 HULL · THE ORIGINAL HEAT",
						a.difficulty === "arcade" ? "selected" : "",
					) +
					btn(
						"WILD",
						"diff:wild",
						"3 HULL · 1.5× SCORE",
						a.difficulty === "wild" ? "selected" : "",
					) +
					'</div><div class="how-footer"><strong>HOLD FIRE.</strong> Demons split when you pop them. Dash through danger. Graze their bolts to charge your Encore.</div><div class="menu-list">' +
					btn("LAUNCH SORTIE", "launch", "LET THEM HEAR YOU", "primary") +
					btn("BACK", "title", "", "back-button") +
					"</div>",
			);
		} else if (name === "coop") {
			body = panel(
				"BETTER WITH BAD COMPANY",
				"FLY TOGETHER.",
				"Share the sky, the score and the trouble. A downed pilot returns at the next encounter if a teammate survives.",
				'<div class="menu-list">' +
					btn("COUCH FORMATION", "couch", "2 PILOTS · ONE SCREEN", "primary") +
					btn("DIRECT LINK", "link", "2 DEVICES · WEBRTC") +
					'</div><div class="how-footer"><strong>COUCH:</strong> Two controllers, or Pilot 1: A/D + Space, Shift, E. Pilot 2: J/L + I, U, O.<br><strong>AI HUB:</strong> Launch a session in AI Hub for 1–4 pilots on separate devices. The host runs one shared battlefield.</div>' +
					btn("BACK", "title", "", "back-button"),
			);
		} else if (name === "pause") {
			const live = a.net.active
				? "THE FORMATION KEEPS FLYING."
				: "TAKE A BREATHER.";
			body = panel(
				"SORTIE PAUSED",
				live,
				a.net.active
					? "Online play continues while your menu is open."
					: "The sky can wait a moment.",
				'<div class="menu-list">' +
					btn("RESUME SORTIE", "resume", a.input.prompt("back"), "primary") +
					(!a.net.active
						? btn("FLIGHT LAB", "dev", "LIVE TUNING & TEST TOOLS")
						: "") +
					btn("FLIGHT SCHOOL", "controls", "CONTROLS & TACTICS") +
					btn("SETTINGS", "settings", "AUDIO & ACCESSIBILITY") +
					(!a.net.hub.active
						? btn("RETURN TO HANGAR", "abandon", "END THIS SORTIE")
						: "") +
					"</div>",
			);
		} else if (name === "settings") {
			body = panel(
				"MAKE IT YOURS",
				"SETTINGS.",
				"Changes save on this device.",
				this.slider(
					"Music",
					"music",
					0,
					100,
					1,
					a.settings.music,
					"The score starts at 10%.",
				) +
					this.slider("Sound effects", "sfx", 0, 100, 1, a.settings.sfx) +
					this.slider(
						"Gibberish voices",
						"voice",
						0,
						100,
						1,
						a.settings.voice,
					) +
					this.select(
						"Controller glyphs",
						"glyphs",
						[
							["ps", "PlayStation · ✕ ○ □ △"],
							["xbox", "Xbox · A B X Y"],
						],
						a.settings.glyphs,
					) +
					this.select(
						"Effects",
						"effects",
						[
							["full", "Full ink & sparks"],
							["low", "Reduced motion"],
						],
						a.settings.effects,
					) +
					this.toggle("Camera shake", "shake", a.settings.shake) +
					btn("RESTORE SETTINGS", "resetSettings", "DEFAULTS") +
					btn("BACK", "back", "", "back-button"),
			);
		} else if (name === "controls") {
			const p = (x) => a.input.prompt(x);
			body = panel(
				"FLIGHT SCHOOL",
				"MAKE A LITTLE SPACE.",
				"You are the last good idea between the demons and the ground.",
				'<div class="how-grid"><div class="how-card"><b>' +
					escapeHTML(p("move")) +
					" &nbsp; / &nbsp; " +
					escapeHTML(p("fire")) +
					'</b><h3>SLIDE & SHOOT</h3><p>Move along the bottom. Hold fire. Aim upward by lining up under a demon. Mouse movement positions your ship.</p></div><div class="how-card"><b>' +
					escapeHTML(p("dash")) +
					'</b><h3>PHASE DASH</h3><p>Burst in your last direction. You are untouchable during the dash. Recharges in 2.2 seconds.</p></div><div class="how-card"><b>' +
					escapeHTML(p("nova")) +
					'</b><h3>ENCORE</h3><p>Kills and near misses charge the meter. At 100%, clear the bolts and blast every demon. Bosses take a heavy hit.</p></div><div class="how-card"><b>✦ &nbsp; PICKUPS & MULTIPLIERS</b><h3>STAY GREEDY</h3><p>Repair restores hull. Rapid fires faster. Prism fires a three-way fan for 14 seconds. Chain kills to reach a 5× multiplier.</p></div></div><div class="how-footer"><strong>WATCH THE WINGS.</strong> Coral fiends split into two quick hatchlings. Purple sentries fire aimed fans. Lime divers come down to meet you.<br><strong>TOUCH:</strong> Drag anywhere to steer; firing is automatic. Two fingers dash. Double tap, or tap the Encore pop-up when charged.</div>' +
					btn("GOT IT", "back", p("back"), "primary"),
				true,
			);
		} else if (name === "dev") {
			const t = a.game.tuning;
			body = panel(
				"DEVELOPER MODE",
				"FLIGHT LAB.",
				"All changes are live. Close this menu to feel the difference.",
				'<div class="lab-grid">' +
					this.slider(
						"Demon speed",
						"enemySpeed",
						0.3,
						2.5,
						0.1,
						t.enemySpeed,
						"Swoop & dive movement",
						true,
					) +
					this.slider(
						"Hostile bolt speed",
						"bulletSpeed",
						0.4,
						2.5,
						0.1,
						t.bulletSpeed,
						"Crossfire travel",
						true,
					) +
					this.slider(
						"Player fire rate",
						"fireRate",
						0.4,
						3,
						0.1,
						t.fireRate,
						"Shots per second",
						true,
					) +
					this.slider(
						"Ship speed",
						"shipSpeed",
						0.5,
						2,
						0.1,
						t.shipSpeed,
						"Horizontal movement",
						true,
					) +
					this.slider(
						"Shot damage",
						"damage",
						0.5,
						4,
						0.5,
						t.damage,
						"Damage per hit",
						true,
					) +
					this.slider(
						"Simulation speed",
						"timeScale",
						0.2,
						3,
						0.1,
						t.timeScale,
						"Whole-world time",
						true,
					) +
					this.toggle("Invulnerable pilots", "god", t.god, true) +
					this.toggle("AI pilot", "auto", t.auto, true) +
					this.toggle("Collision outlines", "hitboxes", t.hitboxes, true) +
					'</div><div class="lab-actions">' +
					btn("NEXT ENCOUNTER", "nextWave") +
					btn("CHARGE ENCORE", "charge") +
					btn("DROP PICKUPS", "drops") +
					'</div><div class="lab-readout" id="lab-readout"></div>' +
					btn("RESET ALL TUNING", "resetTuning", "DEFAULTS") +
					btn("BACK TO PAUSE", "pause", "", "back-button"),
				true,
			);
		} else if (name === "about") {
			const tabs = [
				["sourceInformation", "SOURCE INFORMATION"],
				["testingFeedback", "TESTING FEEDBACK"],
				["engineFeedback", "ENGINE FEEDBACK"],
				["promptFeedback", "PROMPT FEEDBACK"],
			];
			let content = "";
			if (this.creditTab === "sourceInformation") {
				content =
					'<div class="feedback-item"><b>DEMON ENCORE · AN ORIGINAL ARCADE GAME</b>Original code, art, animation and sound. Inspired by Demon Attack (1982). Three.js: MIT; Rapier: Apache-2.0; AI Hub: supplied session client. No original game assets.</div>';
				for (const [key, value] of Object.entries(report.sourceInformation))
					content +=
						'<div class="credit-item"><b>' +
						escapeHTML(key.replace(/[A-Z]/g, (c) => " " + c).toUpperCase()) +
						"</b><span>" +
						escapeHTML(value) +
						"</span></div>";
			} else
				report[this.creditTab].forEach((v, i) => {
					content +=
						'<div class="feedback-item"><b>' +
						escapeHTML(QUESTIONS[this.creditTab][i]) +
						"</b>" +
						escapeHTML(v) +
						"</div>";
				});
			body = panel(
				"THE FINE PRINT",
				"ABOUT / CREDITS.",
				"An encore for a 1982 arcade idea. All new trouble.",
				'<div class="credits-tabs">' +
					tabs
						.map(([id, label]) =>
							btn(
								label,
								"tab:" + id,
								"",
								id === this.creditTab ? "selected" : "",
							),
						)
						.join("") +
					'</div><div class="credits-body scroll-area" tabindex="0" aria-label="Credits details; arrow keys scroll">' +
					content +
					"</div>" +
					btn("BACK", "back", "", "back-button"),
				true,
			);
		} else if (name === "link") {
			body = panel(
				"CO-OP · DIRECT PEER LINK",
				"PASS THE CAPSULE.",
				"Two devices. One battlefield. Exchange the invitation and reply through a channel of your choice.",
				'<div class="menu-list">' +
					btn("CREATE INVITATION", "offer", "HOST THIS SORTIE", "primary") +
					btn("JOIN AN INVITATION", "joinLink", "PASTE A CAPSULE") +
					'</div><div class="how-footer">The host creates an invitation. The guest pastes it and creates a reply. The host pastes that reply. Play begins when the direct connection opens.<br>Uses WebRTC and STUN; reachability depends on the two networks. AI Hub handles pairing when launched in a session.</div>' +
					btn("BACK", "coop", "", "back-button"),
			);
		} else if (name === "linkHost" || name === "linkJoin") {
			const host = name === "linkHost";
			body = panel(
				"CO-OP · " + (host ? "HOST" : "GUEST"),
				"LINK THE FORMATION.",
				host
					? "1. Copy the invitation. 2. Send it to the other pilot. 3. Paste their reply below."
					: "1. Paste the host’s invitation. 2. Create a reply. 3. Send that reply to the host.",
				(host
					? '<p class="link-step"><strong>YOUR INVITATION</strong></p><textarea id="link-out" class="capsule" readonly aria-label="Invitation capsule"></textarea>' +
						btn("COPY INVITATION", "copyCode", "COPY")
					: "") +
					'<p class="link-step"><strong>' +
					(host ? "PASTE THEIR REPLY" : "PASTE THE INVITATION") +
					'</strong></p><textarea id="link-in" class="capsule" spellcheck="false" aria-label="' +
					(host ? "Reply capsule" : "Invitation capsule") +
					'"></textarea>' +
					btn(
						host ? "CONNECT & LAUNCH" : "CREATE REPLY",
						host ? "acceptLink" : "answerLink",
						"",
						"primary",
					) +
					(!host
						? '<p class="link-step"><strong>YOUR REPLY</strong></p><textarea id="link-out" class="capsule" readonly aria-label="Reply capsule"></textarea>' +
							btn("COPY REPLY", "copyCode", "COPY")
						: "") +
					'<div class="link-status" id="link-status">' +
					(host ? "Building invitation…" : "Waiting for an invitation.") +
					"</div>" +
					btn("BACK", "cancelLink", "", "back-button"),
			);
		} else if (name === "waiting") {
			body =
				'<section class="session-wait"><div class="eyebrow">AI HUB · SHARED FORMATION</div><h2>DEMON ENCORE</h2><p>Hold the sky together.<br>Move. Hold fire. Dash through danger.<br>Charge an Encore with kills and near misses.</p><p>Waiting for the formation…</p></section>';
		} else if (name === "hubEnd") {
			body =
				'<section class="session-wait"><div class="eyebrow">AI HUB · ROUND COMPLETE</div><h2>FORMATION DISMISSED.</h2><p>The Hub has the final word.<br>Your results will appear here.</p></section>';
		}
		this.overlay.innerHTML = body;
		const list = this.buttons();
		if (list.length) this.setFocus(list[0], false);
		this.prompts();
	}
	slider(label, key, min, max, step, value, detail = "", tune = false) {
		return (
			'<label class="row"><span class="label">' +
			label +
			(detail ? "<small>" + detail + "</small>" : "") +
			'</span><input aria-label="' +
			label +
			'" type="range" min="' +
			min +
			'" max="' +
			max +
			'" step="' +
			step +
			'" value="' +
			value +
			'" data-' +
			(tune ? "tune" : "setting") +
			'="' +
			key +
			'"><output>' +
			(tune ? Number(value).toFixed(2) + "×" : value + "%") +
			"</output></label>"
		);
	}
	toggle(label, key, value, tune = false) {
		return (
			'<label class="row"><span class="label">' +
			label +
			'</span><input aria-label="' +
			label +
			'" type="checkbox" ' +
			(value ? "checked" : "") +
			" data-" +
			(tune ? "tune" : "setting") +
			'="' +
			key +
			'"></label>'
		);
	}
	select(label, key, options, value) {
		return (
			'<label class="row"><span class="label">' +
			label +
			'</span><select aria-label="' +
			label +
			'" data-setting="' +
			key +
			'">' +
			options
				.map(
					([id, text]) =>
						'<option value="' +
						id +
						'" ' +
						(value === id ? "selected" : "") +
						">" +
						text +
						"</option>",
				)
				.join("") +
			"</select></label>"
		);
	}
	prompts() {
		const a = this.app;
		if (!a.input) return;
		document.body.classList.toggle("touch", a.input.mode === "touch");
		const items = a.menu
			? [
					["accept", "SELECT"],
					["back", "BACK"],
				]
			: [
					["move", "MOVE"],
					["fire", "FIRE"],
					["dash", "DASH"],
					["nova", "ENCORE"],
				];
		$("footer-controls").innerHTML = items
			.map(
				([id, label]) =>
					"<span><b>" +
					escapeHTML(a.input.prompt(id)) +
					"</b>" +
					label +
					"</span>",
			)
			.join("");
		$("footer-left").textContent = a.started
			? a.attract
				? "DEMON ENCORE / BAD COMPANY. GOOD AIM."
				: "HOLD THE LINE. KEEP THE CHANGE."
			: "INSPIRED BY THE ARCADE. BUILT FOR ONE MORE RUN.";
	}
	banner(kicker, title, detail = "", boss = false, duration = 3.3) {
		$("banner-kicker").textContent = kicker;
		$("banner-title").textContent = title;
		$("banner-detail").textContent = detail;
		$("banner").className = "show" + (boss ? " boss" : "");
		this.bannerUntil = performance.now() + duration * 1000;
	}
	toast(text) {
		$("toast").textContent = text;
		$("toast").classList.add("show");
		this.toastUntil = performance.now() + 3000;
	}
	float(event) {
		const e = document.createElement("div");
		e.className = "float" + (event.combo > 1 ? " combo" : "");
		e.textContent = "+" + event.points;
		e.style.left = (event.x / this.app.view.camera.right + 1) * 50 + "%";
		e.style.top = (1 - event.y / 7) * 50 + "%";
		$("floating").append(e);
		setTimeout(() => e.remove(), 950);
	}
	tick(now) {
		if (now > this.bannerUntil) $("banner").classList.remove("show");
		if (now > this.toastUntil) $("toast").classList.remove("show");
		if (now - this.lastHUD < 80) return;
		this.lastHUD = now;
		const a = this.app,
			g = a.game;
		if (!g) return;
		$("score").textContent = String(g.score).padStart(6, "0");
		$("best").textContent = String(Math.max(a.best, g.score)).padStart(6, "0");
		$("combo").textContent = g.combo > 1 ? "×" + g.combo : "";
		$("wave-number").textContent =
			"ENCOUNTER " + String(Math.max(1, g.wave + 1)).padStart(2, "0") + " / 07";
		$("wave-name").textContent =
			WAVES[Math.max(0, g.wave)]?.name || "FIRST CONTACT";
		const colors = ["#64e5df", "#ff715c", "#d7f975", "#c692f5"];
		$("pilots").innerHTML = g.players
			.map(
				(p) =>
					'<div class="pilot" style="--pilot:' +
					colors[p.seat % 4] +
					'"><div class="pilot-name" style="color:' +
					colors[p.seat % 4] +
					'">' +
					escapeHTML(
						a.net.active
							? a.net.players.find((q) => q.id === p.seat)?.name ||
									"PILOT " + (p.seat + 1)
							: "PILOT " + (p.seat + 1),
					) +
					"<span>" +
					(p.alive
						? "HULL"
						: p.left
							? "LEFT FORMATION"
							: "BACK NEXT ENCOUNTER") +
					'</span></div><div class="hulls">' +
					Array.from(
						{ length: p.maxHp },
						(_, i) => "<i" + (i >= p.hp ? ' class="empty"' : "") + "></i>",
					).join("") +
					"</div>" +
					(p.weapon !== "pulse"
						? '<div class="weapon-chip">' +
							escapeHTML(p.weapon.toUpperCase()) +
							" · " +
							Math.ceil(p.weaponTime) +
							"s</div>"
						: "") +
					"</div>",
			)
			.join("");
		const p = a.localPlayer() || g.players[0];
		if (p) {
			const ready = p.charge >= 100;
			$("charge-num").textContent = Math.floor(p.charge) + "%";
			$("charge-fill").style.width = p.charge + "%";
			$("encore-box").classList.toggle("charged", ready);
			$("charge-hint").textContent = ready
				? a.input.prompt("nova") + " · BRING THE HOUSE DOWN"
				: "KILLS & NEAR MISSES · CHARGE UP";
			$("dash-state").textContent =
				p.dashCD > 0 ? p.dashCD.toFixed(1) + "s" : "READY";
			$("dash-fill").style.width = (1 - p.dashCD / 2.2) * 100 + "%";
			$("touch-encore").hidden = !(
				a.input.mode === "touch" &&
				ready &&
				!a.menu &&
				!a.attract
			);
		}
		const boss = [...g.entities.values()].find((e) => e.kind === "boss");
		$("boss-hud").hidden = !boss;
		if (boss) {
			$("boss-health").style.width =
				Math.max(0, (boss.hp / boss.maxHp) * 100) + "%";
			$("boss-phase").textContent =
				["", "VERSE I", "VERSE II", "FINAL VERSE"][boss.phase] || "VERSE I";
		}
		if (a.menu === "dev") {
			$("lab-readout").textContent =
				"TIME " +
				g.time.toFixed(1) +
				"s · ENTITIES " +
				g.entities.size +
				" · KILLS " +
				g.kills +
				" · GRAZES " +
				g.grazes +
				" · " +
				a.view.backend +
				" · RAPIER " +
				g.world.bodies.len() +
				" BODIES";
		}
	}
	result(result) {
		const a = this.app;
		a.menu = "result";
		this.overlay.className = "modal";
		$("banner").classList.remove("show");
		$("hud").hidden = true;
		const stats = result.stats || a.game?.stats || {};
		this.overlay.innerHTML =
			'<section class="result-panel ' +
			(result.won ? "" : "loss") +
			'"><div class="eyebrow" style="justify-content:center">' +
			(result.won
				? "SEVEN ENCOUNTERS. ZERO NEIGHBOURS."
				: "THE SKY GETS THIS ONE.") +
			"</div><h2>" +
			(result.won ? "HOUSE. DOWN." : "ONE MORE RUN?") +
			'</h2><div class="result-label">FINAL TEAM SCORE</div><div class="result-score">' +
			String(result.score || 0).padStart(6, "0") +
			"</div>" +
			(a.newBest ? '<div class="newbest">✦ NEW PERSONAL BEST ✦</div>' : "") +
			'<div class="result-stats"><div><strong>' +
			(stats.kills || 0) +
			"</strong><span>DEMONS</span></div><div><strong>" +
			(stats.grazes || 0) +
			"</strong><span>NEAR MISSES</span></div><div><strong>" +
			(stats.encores || 0) +
			'</strong><span>ENCORES</span></div></div><div class="menu-list">' +
			(!a.net.active
				? btn("FLY AGAIN", "retry", "ONE MORE ENCORE", "primary") +
					btn("RETURN TO HANGAR", "abandon")
				: '<p class="fineprint">Formation complete. The host has reported the result.</p>') +
			"</div></section>";
		this.focus = 0;
		if (this.buttons()[0]) this.setFocus(this.buttons()[0], false);
		this.prompts();
	}
}
export { report };
