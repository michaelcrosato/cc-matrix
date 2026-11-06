import report from "../report.json";
import { DISPATCHES } from "./game.js";

const $ = (id) => document.getElementById(id);
const esc = (s) =>
	String(s).replace(
		/[&<>"']/g,
		(c) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				c
			],
	);
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
		"Hardest part of using the engine?",
		"What did you change in the engine, and why?",
		"One thing you would change?",
	],
	promptFeedback: [
		"What did you like most about this prompt?",
		"What was confusing?",
		"What was hardest?",
		"What would you change?",
	],
};
const settingsDefinitions = [
	["music", "Music volume", 0, 100, 1, "%"],
	["sfx", "Effects & radio", 0, 100, 1, "%"],
];
const balanceDefinitions = [
	["speed", "Flight speed", 12, 50, 1],
	["enemySpeed", "Raider speed", 0.3, 2.5, 0.1],
	["enemyDamage", "Incoming damage", 0.1, 3, 0.1],
	["fireRate", "Cannon interval", 0.06, 0.4, 0.01],
	["flareCooldown", "Flare recharge", 2, 18, 0.5],
	["truckArmor", "Truck armour", 1, 8, 1],
	["aimAssist", "Aim assist cone", 0, 1.2, 0.05],
	["difficulty", "Missile pressure", 0.3, 2.5, 0.1],
];
function btn(text, action, primary = false, extra = "") {
	return `<button class="${primary ? "primary" : "secondary"} focusable" data-action="${action}" ${extra}>${text}</button>`;
}
function panel(
	title,
	body,
	wide = false,
	eyebrow = "ROTOR EXPRESS · FLIGHT DECK",
) {
	return `<div class="shade"><section class="panel ${wide ? "wide" : ""}" role="dialog" aria-modal="true" aria-label="${title}"><span class="eyebrow">${eyebrow}</span><h2>${title}</h2>${body}</section></div>`;
}
function back(action = "back") {
	return `<div class="panel-bottom"><button class="back focusable" data-action="${action}">← BACK</button><span class="tiny" data-menu-hint>ESC / BACK</span></div>`;
}
export class UI {
	constructor(hooks) {
		this.hooks = hooks;
		this.current = "";
		this.creditTab = "sourceInformation";
		this.bannerTimer = 0;
		this.toastTimer = 0;
		this.lastHUD = 0;
		this.radar = $("radar").getContext("2d");
		this.status = "";
		this.roomCode = "";
		this.generatedCode = "";
		this.settings = hooks.settings;
		this.radioTimer = 0;
		$("pause-button").onclick = () => hooks.action("pause");
		$("touch-flare").onpointerdown = (e) => {
			e.preventDefault();
			hooks.flare(true);
		};
		$("touch-flare").onpointerup = () => hooks.flare(false);
		$("touch-flare").onpointercancel = () => hooks.flare(false);
	}
	show(name) {
		this.current = name;
		this.hooks.screen(name);
		const keyboard = this.hooks.inputType() !== "gamepad";
		let html = "";
		if (name === "title") {
			html = `<div class="title-screen"><header class="masthead"><div class="brand"><span class="brand-icon">↗</span><div><strong>ROTOR EXPRESS</strong><small>DESERT DELIVERY DIVISION</small></div></div><div class="masthead-right"><span class="eyebrow">HOT CARGO. COLD NERVES.</span><span class="stamp">1–4 PILOTS</span></div></header><main class="title-copy"><div class="edition">A CONVOY DEFENCE ARCADE &nbsp; / &nbsp; VOL. 01</div><h1>CHOPPER<span>COMMAN-<em>DOUGH</em></span></h1><p>Twelve trucks. A sky full of trouble.<br>Get the goods through, hotshot.</p><div class="title-actions">${btn(`TAKE FLIGHT <span class="glyph" id="launch-glyph">${keyboard ? "↵" : "×"}</span>`, "start", true)}${btn("WINGMEN <span>↗</span>", "coop")}</div><nav class="title-links"><button class="text-button focusable" data-action="manual">FLIGHT MANUAL</button><button class="text-button focusable" data-action="settings">SETTINGS</button><button class="text-button focusable" data-action="credits">ABOUT / CREDITS</button></nav></main><div class="flight-label"><strong>01</strong><span>CALLSIGN<br>BUTTERCUP</span></div><div class="hero-note"><b>THE ROLLS MUST ROLL.</b><span>NO PRESSURE, PILOT. JUST THE WHOLE CONVOY.</span></div><div class="title-controls" id="title-controls">WASD / ARROWS &nbsp; FLY &nbsp; · &nbsp; MOUSE / SPACE &nbsp; FIRE &nbsp; · &nbsp; SHIFT &nbsp; BOOST &nbsp; · &nbsp; E &nbsp; FLARE</div><footer class="title-footer"><div class="footer-feature"><b>12</b><span>TRUCKS<br>TO PROTECT</span></div><div class="footer-feature"><b>04</b><span>DISPATCHES<br>TO SURVIVE</span></div><div class="footer-feature"><b>∞</b><span>AMMO<br>ZERO EXCUSES</span></div><div class="footer-note">ORIGINAL FLIGHT INSPIRED BY CHOPPER COMMAND, 1982<br><span id="attract-count">AUTO FLIGHT IN 10s</span> &nbsp; / &nbsp; BUILT FOR THE BIG SCREEN</div></footer></div>`;
		} else if (name === "pause")
			html = panel(
				"HOLD YOUR HOVER.",
				`<p>The dough can wait a minute.</p><div class="panel-menu">${btn("RESUME FLIGHT <span>↗</span>", "resume", true)}${btn("FLIGHT MANUAL", "manual")}${btn("SETTINGS", "settings")}${btn("DEVELOPER FLIGHT DECK", "dev")}${!this.hooks.inHub() ? btn("RETURN TO HANGAR", "quit") : ""}</div><div class="panel-bottom"><span class="tiny">PAUSED${this.hooks.networked() ? " · OTHER PILOTS KEEP FLYING" : ""}</span><span class="tiny">OPTIONS / ESC</span></div>`,
			);
		else if (name === "manual") {
			const g = this.hooks.inputType() === "gamepad",
				x = this.settings.glyphs === "xbox";
			html = panel(
				"EYES UP. CARGO DOWN.",
				`<div class="manual-grid"><div class="manual-item"><b>01 &nbsp; FLY & FACE</b><span class="control">${g ? "LEFT STICK · RIGHT STICK TO AIM" : "WASD / ARROWS · MOUSE TO AIM"}</span><p>Patrol both directions. Your scanner sees the whole desert. Red marks are trouble; cream marks are cargo.</p></div><div class="manual-item"><b>02 &nbsp; BLANKET THE SKY</b><span class="control">${g ? `${x ? "RT / A" : "R2 / ×"} · HOLD TO FIRE` : "MOUSE / SPACE · HOLD TO FIRE"}</span><p>Unlimited cannon. Clear every raider to finish a dispatch. Gold crates give nine seconds of double-cannon overdrive.</p></div><div class="manual-item"><b>03 &nbsp; DON'T GET TOASTED</b><span class="control">${g ? `${x ? "LT" : "L2"} BOOST · ${x ? "B" : "○"} FLARE` : "SHIFT BOOST · E / RIGHT CLICK FLARE"}</span><p>Red diamonds split into two missiles. Dodge them or pop a flare to clear nearby warheads. Recharge before the next burst.</p></div><div class="manual-item"><b>04 &nbsp; CARE FOR CARGO</b><span class="control">LOW + SLOW · REPAIR HOVER</span><p>Hover steadily above a truck to patch it and your hull. Mint crates repair damage. Keep at least one truck and one pilot flying.</p></div></div><div class="callout">Three choppers per pilot. Extra wings at 10,000 points. Bring down the carrier in Dispatch 04. In co-op, share the work: friendly fire is off.</div><p class="tiny">TOUCH: Drag anywhere on the left to fly. Cannon and aim are assisted. Hold the right side to boost; tap POP when a flare is needed. Portrait works; landscape gives a wider patrol view.</p>${back()}`,
				true,
			);
		} else if (name === "settings") {
			html = panel(
				"TUNE YOUR FLIGHT.",
				`${settingsDefinitions.map(([id, label, min, max, step, unit]) => `<label class="settings-row"><span>${label}</span><span><b class="value" id="value-${id}">${this.settings[id]}${unit}</b><input class="focusable" type="range" min="${min}" max="${max}" step="${step}" value="${this.settings[id]}" data-setting="${id}" aria-label="${label}"></span></label>`).join("")}<div class="settings-row"><span>Controller prompts</span><button class="focusable" data-action="glyphs">${this.settings.glyphs === "xbox" ? "XBOX · A B X Y" : "PLAYSTATION · × ○"}</button></div><div class="settings-row"><span>Automatic cannon<small>Touch always gets an assist.</small></span><button class="focusable" data-action="autofire">${this.settings.autofire ? "ON" : "OFF"}</button></div><div class="settings-row"><span>Camera shake</span><button class="focusable" data-action="shake">${this.settings.shake ? "ON" : "OFF"}</button></div><div class="settings-row"><span>Big screen</span><button class="focusable" data-action="fullscreen">${document.fullscreenElement ? "LEAVE FULLSCREEN" : "GO FULLSCREEN"}</button></div>${back()}`,
			);
		} else if (name === "dev") {
			const cfg = this.hooks.config();
			html = panel(
				"DEVELOPER FLIGHT DECK.",
				`<div class="dev-grid">${balanceDefinitions.map(([id, label, min, max, step]) => `<label class="settings-row"><span>${label}</span><span><b class="value" id="value-${id}">${cfg[id]}</b><input class="focusable" type="range" min="${min}" max="${max}" step="${step}" value="${cfg[id]}" data-balance="${id}" aria-label="${label}" ${this.hooks.isClient() ? "disabled" : ""}></span></label>`).join("")}</div><div class="dev-actions">${btn(`INVULNERABLE: ${this.hooks.god() ? "ON" : "OFF"}`, "god")}${btn("RESTORE HULL & CARGO", "heal")}${btn("NEXT DISPATCH", "skip")}${btn("SPAWN SUPPLY", "supply")}${btn("RESET BALANCE", "resetbalance")}${btn("RESTART CAMPAIGN", "restart")}</div><p class="tiny">BALANCE CHANGES APPLY LIVE. ARMOUR ALSO UPDATES SURVIVING TRUCKS.${this.hooks.isClient() ? " THE FLIGHT LEADER CONTROLS THE SIMULATION." : ""}</p>${back()}`,
				true,
			);
		} else if (name === "credits") {
			const names = {
				sourceInformation: "SOURCE INFORMATION",
				testingFeedback: "TESTING FEEDBACK",
				engineFeedback: "ENGINE FEEDBACK",
				promptFeedback: "PROMPT FEEDBACK",
			};
			const tabs = Object.entries(names)
				.map(
					([id, label]) =>
						`<button class="focusable ${this.creditTab === id ? "selected" : ""}" data-credit="${id}">${label}</button>`,
				)
				.join("");
			const body =
				this.creditTab === "sourceInformation"
					? Object.entries(report.sourceInformation)
							.map(
								([k, v]) =>
									`<div class="credits-row"><b>${esc(k.charAt(0).toUpperCase() + k.slice(1))}</b><span>${esc(v)}</span></div>`,
							)
							.join("") +
						`<div class="credits-row"><b>References</b><span><a href="https://atarionline.org/wp-content/uploads/2021/11/chopper-command-1982-activision-atari-2600-manual.pdf" target="_blank" rel="noopener">Original Activision manual</a> · <a href="https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub" target="_blank" rel="noopener">AI Hub protocol</a><br>Typeface: Barlow Condensed by Jeremy Tribby (SIL Open Font License). Original code and procedural models made for this demo. This is an unofficial tribute.</span></div>`
					: report[this.creditTab]
							.map(
								(a, i) =>
									`<div class="feedback-item"><h3>${questions[this.creditTab][i]}</h3><p>${esc(a)}</p></div>`,
							)
							.join("");
			html = panel(
				"THE FLIGHT LOG.",
				`<div class="credits-tabs">${tabs}</div><div class="credits-body focusable" tabindex="0">${body}</div>${back()}`,
				true,
			);
		} else if (name === "coop")
			html = panel(
				"BRING A WINGMAN.",
				`<p>Same convoy. More firepower. Up to four pilots share one sky.</p><div class="panel-menu">${btn("ON THIS SCREEN <span>02</span>", "local", true)}${btn("BROWSER RADIO <span>01–04</span>", "radio")}${btn("TWO DEVICES <span>01–02</span>", "rtc")}</div><p class="tiny">AI HUB ALSO SUPPORTS 1–4 PILOTS IN SHARED-WORLD SESSIONS.</p>${back()}`,
			);
		else if (name === "local")
			html = panel(
				"TWO PAIRS OF WINGS.",
				`<div class="manual-item"><b>PILOT 01 · BUTTERCUP</b><p>First gamepad or WASD / arrows. Mouse / Space fire, Shift boost, E flare.</p></div><div class="manual-item" style="margin-top:25px"><b>PILOT 02 · MINT CONDITION</b><p>Second gamepad or I J K L to fly. Enter fires, right Shift boosts, U pops a flare.</p></div><p>Stay within scanner range. You share cargo and score, but have separate hulls and reserves.</p>${btn("LAUNCH TOGETHER <span>↗</span>", "localstart", true)}${back("coop")}`,
			);
		else if (name === "radio")
			html = panel(
				"BROWSER RADIO.",
				`<p>Open this game in other tabs on this browser and use the same four-letter channel. The flight leader launches everyone.</p><div class="network-actions">${btn("CREATE CHANNEL", "roomhost", true)}</div><label class="eyebrow" for="room-code">OR JOIN A CHANNEL</label><input class="code-input large focusable" id="room-code" maxlength="4" placeholder="ABCD" aria-label="Radio channel code"><div class="network-actions">${btn("JOIN CHANNEL", "roomjoin")}</div><p class="network-status" id="network-status">${esc(this.status || "Waiting for a radio channel.")}</p>${back("coop")}`,
			);
		else if (name === "room")
			html = panel(
				"RADIO CHECK.",
				`<span class="eyebrow">CHANNEL</span><div class="network-code">${esc(this.roomCode)}</div><p>Give this channel to the other tabs. Each pilot needs their own copy of this game on the same origin.</p><p class="network-status" id="network-status">${esc(this.status || "Flight leader ready. Waiting for wingmen.")}</p><div class="network-actions">${this.hooks.isClient() ? "" : btn("LAUNCH CONVOY <span>↗</span>", "networkstart", true)}${btn("COPY CHANNEL", "copyroom")}</div>${back("disconnect")}`,
			);
		else if (name === "rtc")
			html = panel(
				"TWO DEVICES. ONE CONVOY.",
				`<p>Pair directly with WebRTC. Exchange codes using your own messenger. No account or game server needed.</p><div class="network-steps"><div><h3>01 · FLIGHT LEADER</h3><p>Create an offer. Send it to your wingman, then paste their reply.</p>${btn("CREATE OFFER", "rtcoffer", true)}<div class="network-actions">${btn("COPY OFFER", "copycode")}${btn("PASTE REPLY", "pasteanswer")}</div></div><div><h3>02 · WINGMAN</h3><p>Paste the leader’s offer. Create a reply and send it back.</p><div class="network-actions">${btn("PASTE OFFER", "pasteoffer")}${btn("MAKE REPLY", "rtcanswer")}</div>${btn("COPY REPLY", "copycode")}</div></div><label class="eyebrow" for="rtc-code">RADIO CODE · PASTE OR COPY BELOW</label><textarea class="code-input focusable" id="rtc-code" rows="2" spellcheck="false" aria-label="WebRTC radio code">${esc(this.generatedCode)}</textarea><div class="network-actions">${btn("ACCEPT REPLY", "rtcaccept")}${this.hooks.isClient() ? "" : btn("LAUNCH CONVOY", "networkstart", true)}</div><p class="network-status" id="network-status">${esc(this.status || "Choose the flight leader or wingman steps. Some networks may block direct links.")}</p>${back("disconnect")}`,
				true,
			);
		else if (name === "result") {
			const s = this.hooks.state(),
				won = s.phase === "won";
			html = panel(
				won ? "DELIVERY COMPLETE!" : "THE CONVOY NEEDS YOU.",
				`<div class="medal">${won ? (s.trucks >= 10 ? "FLOUR POWER" : "DOUGH DELIVERED") : "GIVE IT ANOTHER WHIRL"}</div><p>${won ? "The ovens are hot, the flour is safe, and the sky belongs to you. Nice flying, hotshot." : "The desert got the better of us. Read the scanner, pop those flares, and keep the trucks covered."}</p><div class="result-stats"><div><b>${String(s.score).padStart(6, "0")}</b><span>FINAL SCORE</span></div><div><b>${s.trucks}/12</b><span>CARGO SAFE</span></div><div><b>${s.stats.kills}</b><span>RAIDERS DOWN</span></div></div><div class="panel-menu">${this.hooks.inHub() ? "<p>The flight log is sent. Awaiting the next dispatch.</p>" : btn("FLY AGAIN <span>↗</span>", "restart", true) + btn("RETURN TO HANGAR", "quit")}${btn("THE FLIGHT LOG", "credits")}</div>`,
				true,
			);
		} else if (name === "hubwait")
			html = panel(
				"RADIO CHECK.",
				`<p>Flight deck ready. Your convoy launches on the Hub’s clock.</p><div class="loading-line"></div>`,
			);
		else if (name === "error")
			html = panel(
				"ROTORS GROUNDED.",
				`<p>${esc(this.status)}</p><p>Use a current browser with WebGPU or WebGL 2 support, and allow this page to run WebAssembly.</p>${btn("TRY AGAIN", "reload", true)}`,
			);
		$("overlay").innerHTML = html;
		this.bind();
		if (name) this.focusFirst();
		this.updatePrompts();
	}
	bind() {
		if (this.hooks.inHub())
			for (const link of $("overlay").querySelectorAll("a"))
				link.onclick = (e) => e.preventDefault();
		for (const b of $("overlay").querySelectorAll("[data-action]"))
			b.onclick = () => {
				this.hooks.unlock();
				this.hooks.action(b.dataset.action);
			};
		for (const b of $("overlay").querySelectorAll("[data-credit]"))
			b.onclick = () => {
				this.creditTab = b.dataset.credit;
				this.show("credits");
			};
		for (const e of $("overlay").querySelectorAll("[data-setting]"))
			e.oninput = () => {
				this.hooks.setting(e.dataset.setting, +e.value);
				$("value-" + e.dataset.setting).textContent = e.value + "%";
			};
		for (const e of $("overlay").querySelectorAll("[data-balance]"))
			e.oninput = () => {
				this.hooks.balance(e.dataset.balance, +e.value);
				$("value-" + e.dataset.balance).textContent = e.value;
			};
		for (const e of $("overlay").querySelectorAll(".focusable"))
			e.onpointerenter = () => e.focus({ preventScroll: true });
	}
	focusFirst() {
		$("overlay")
			.querySelector(".focusable:not(:disabled)")
			?.focus({ preventScroll: true });
	}
	navigate(x, y) {
		const elements = [
			...$("overlay").querySelectorAll(".focusable:not(:disabled)"),
		].filter((e) => e.offsetParent !== null);
		if (!elements.length) return;
		const current = document.activeElement;
		let index = elements.indexOf(current);
		if (x && current?.type === "range") {
			x > 0 ? current.stepUp() : current.stepDown();
			current.dispatchEvent(new Event("input"));
			return;
		}
		index = (index + (y || x || 1) + elements.length) % elements.length;
		elements[index].focus();
	}
	confirm() {
		if (document.activeElement?.matches("button"))
			document.activeElement.click();
	}
	scroll(n) {
		$("overlay")
			.querySelector(".credits-body")
			?.scrollBy(0, n * 18);
	}
	updatePrompts() {
		const g = this.hooks.inputType() === "gamepad",
			touch = this.hooks.inputType() === "touch",
			x = this.settings.glyphs === "xbox";
		document.body.classList.toggle("touch", touch);
		$("boost-prompt").textContent = g ? (x ? "LT" : "L2") : "SHIFT";
		$("flare-prompt").textContent = g ? (x ? "B" : "○") : "E";
		$("fire-prompt").textContent = g
			? `${x ? "RT / A" : "R2 / ×"}  CANNON`
			: "LMB / SPACE  CANNON";
		if ($("launch-glyph"))
			$("launch-glyph").textContent = g ? (x ? "A" : "×") : "↵";
		if ($("title-controls"))
			$("title-controls").textContent = touch
				? "DRAG LEFT TO FLY · AUTOMATIC CANNON · HOLD RIGHT TO BOOST"
				: g
					? `LEFT STICK  FLY  ·  RIGHT STICK  AIM  ·  ${x ? "RT" : "R2"}  FIRE  ·  ${x ? "LT" : "L2"}  BOOST  ·  ${x ? "B" : "○"}  FLARE`
					: "WASD / ARROWS  FLY  ·  MOUSE / SPACE  FIRE  ·  SHIFT  BOOST  ·  E  FLARE";
		for (const e of document.querySelectorAll("[data-menu-hint]"))
			e.textContent = g ? `${x ? "B" : "○"}  BACK` : "ESC / BACK";
	}
	hud(game, view, seat = 0) {
		const p = game.getPilot(seat) || game.pilots.find((p) => !p.dead),
			health = Math.max(0, p?.hp || 0);
		$("score").textContent = String(game.score).padStart(6, "0");
		$("combo").textContent =
			game.combo >= 4
				? `×${Math.min(5, 1 + Math.floor(game.combo / 4))}  HOT STREAK`
				: "KEEP THE DOUGH ROLLING";
		const w = Math.max(1, game.wave);
		$("wave-number").textContent =
			`DISPATCH ${String(w).padStart(2, "0")} / 04`;
		$("wave-name").textContent = DISPATCHES[w - 1]?.name || "";
		$("dispatch-dots").innerHTML = [1, 2, 3, 4]
			.map((n) => `<i class="${n <= w ? "done" : ""}"></i>`)
			.join("");
		$("hull-fill").style.width = health + "%";
		$("hull-fill").style.background =
			health < 30 ? "var(--pink)" : "var(--ink)";
		$("hull-number").textContent = Math.ceil(health);
		$("lives").textContent = "✚ ".repeat(Math.max(0, p?.lives || 0));
		$("pilot-label").textContent =
			p?.respawn > 0
				? "RESERVE INBOUND"
				: [
						"BUTTERCUP 01",
						"MINT CONDITION 02",
						"BLUE BAKER 03",
						"GOLDEN ROLL 04",
					][seat] || "CONVOY OVERWATCH";
		$("cargo-count").textContent = game.liveTrucks().length + " TRUCKS";
		$("scanner-cargo").textContent = game.liveTrucks().length + " / 12";
		$("boss-meter").hidden = !game.boss || game.boss.dead || game.boss.hp <= 0;
		if (game.boss)
			$("boss-fill").style.width =
				Math.max(0, (game.boss.hp / game.boss.maxHp) * 100) + "%";
		$("boost-fill").style.width = (p?.boost || 0) + "%";
		$("flare-fill").style.width =
			Math.max(0, 1 - (p?.flare || 0) / game.config.flareCooldown) * 100 + "%";
		$("flare-status").textContent =
			p?.flare > 0 ? `FLARE ${p.flare.toFixed(1)}s` : "FLARE READY";
		if (p?.power > 0)
			$("combo").textContent = `DOUBLE CANNON  ${p.power.toFixed(1)}s`;
		$("repair-hint").hidden = !p?.repairing;
		const threats = game.enemies();
		const half = view.visibleWidth / 2;
		const left = threats.filter((e) => e.x < view.cx - half + 3),
			right = threats.filter((e) => e.x > view.cx + half - 3);
		$("edge-left").hidden = !left.length;
		$("edge-left").textContent =
			`‹ ${left.length} RAIDER${left.length > 1 ? "S" : ""}`;
		$("edge-right").hidden = !right.length;
		$("edge-right").textContent =
			`${right.length} RAIDER${right.length > 1 ? "S" : ""} ›`;
		const close =
			p &&
			[...game.entities.values()].some(
				(e) =>
					["split", "missile"].includes(e.type) &&
					Math.hypot(e.x - p.x, e.y - p.y) < 24,
			);
		$("touch-flare").hidden = !(
			this.hooks.inputType() === "touch" &&
			p?.flare <= 0 &&
			close
		);
		this.drawRadar(game, view, p);
	}
	drawRadar(game, view, p) {
		const ctx = this.radar,
			w = 600,
			h = 92;
		ctx.clearRect(0, 0, w, h);
		ctx.strokeStyle = "#3e5756";
		ctx.lineWidth = 1;
		for (let i = 0; i <= 12; i++) {
			ctx.beginPath();
			ctx.moveTo((i * w) / 12, 0);
			ctx.lineTo((i * w) / 12, h);
			ctx.stroke();
		}
		for (let i = 1; i < 4; i++) {
			ctx.beginPath();
			ctx.moveTo(0, (i * h) / 4);
			ctx.lineTo(w, (i * h) / 4);
			ctx.stroke();
		}
		const xx = (x) => ((x + 160) / 320) * w,
			yy = (y) => h - 10 - (y / 42) * (h - 16);
		ctx.fillStyle = "#8fe5ce18";
		ctx.fillRect(
			xx(view.cx - view.visibleWidth / 2),
			0,
			(view.visibleWidth / 320) * w,
			h,
		);
		ctx.strokeStyle = "#8fe5ce55";
		ctx.strokeRect(
			xx(view.cx - view.visibleWidth / 2),
			1,
			(view.visibleWidth / 320) * w,
			h - 2,
		);
		const sweep = ((game.time * 0.14) % 1) * w;
		ctx.fillStyle = "#8fe5ce22";
		ctx.fillRect(sweep, 0, 3, h);
		for (const e of game.entities.values()) {
			if (e.type === "truck") {
				ctx.fillStyle = "#fff1cb";
				ctx.fillRect(xx(e.x) - 3, h - 10, 6, 5);
			} else if (["heli", "jet", "boss"].includes(e.type)) {
				ctx.fillStyle = "#e86379";
				const size = e.type === "boss" ? 9 : 5;
				ctx.fillRect(xx(e.x) - size / 2, yy(e.y) - 3, size, 6);
			} else if (e.type === "pilot" && e.respawn <= 0) {
				ctx.fillStyle = e.seat === p?.seat ? "#ffce64" : "#8fe5ce";
				ctx.beginPath();
				ctx.moveTo(xx(e.x) + e.dir * 6, yy(e.y));
				ctx.lineTo(xx(e.x) - e.dir * 3, yy(e.y) - 4);
				ctx.lineTo(xx(e.x) - e.dir * 3, yy(e.y) + 4);
				ctx.closePath();
				ctx.fill();
			} else if (e.type === "split" || e.type === "missile") {
				ctx.fillStyle = "#f7903580";
				ctx.fillRect(xx(e.x), yy(e.y), 2, 2);
			}
		}
	}
	banner(wave, title, subtitle = "") {
		clearTimeout(this.bannerTimer);
		$("wave-banner").innerHTML =
			`<span>${typeof wave === "number" ? "DISPATCH " + String(wave).padStart(2, "0") : esc(wave)}</span><strong>${esc(title)}</strong><small>${esc(subtitle)}</small>`;
		$("wave-banner").hidden = false;
		this.bannerTimer = setTimeout(() => ($("wave-banner").hidden = true), 3200);
	}
	hideBanner() {
		clearTimeout(this.bannerTimer);
		$("wave-banner").hidden = true;
	}
	toast(text) {
		clearTimeout(this.toastTimer);
		$("toast").textContent = text;
		$("toast").hidden = false;
		this.toastTimer = setTimeout(() => ($("toast").hidden = true), 3200);
	}
	radio(text) {
		$("radio-text").textContent = text;
	}
	networkStatus(text) {
		this.status = text;
		if ($("network-status")) $("network-status").textContent = text;
	}
	touchStick(p) {
		$("touch-stick").hidden = !p;
		if (p) {
			$("touch-stick").style.left = p.x + "px";
			$("touch-stick").style.top = p.y + "px";
		}
	}
	worldPoint(x, y, text, view) {
		const v = view.camera.position.clone();
		v.set(x, y, 4);
		v.project(view.camera);
		const e = document.createElement("div");
		e.className = "floater";
		e.textContent = text;
		e.style.left = (v.x * 0.5 + 0.5) * innerWidth + "px";
		e.style.top = (0.5 - v.y * 0.5) * innerHeight + "px";
		$("floaters").append(e);
		setTimeout(() => e.remove(), 900);
	}
}
