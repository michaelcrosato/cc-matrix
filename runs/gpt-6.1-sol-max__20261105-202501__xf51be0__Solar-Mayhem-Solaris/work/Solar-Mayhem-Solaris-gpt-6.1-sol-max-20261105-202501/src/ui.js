import { clamp, DEFAULT_TUNING, SECTORS } from "./game.js";
import { THREE } from "./graphics.js";

const $ = (s) => document.querySelector(s);
const esc = (s) =>
	String(s).replace(
		/[&<>"']/g,
		(c) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				c
			],
	);
const btn = (action, label, primary = false, attrs = "") =>
	`<button data-action="${action}" ${attrs} class="${primary ? "primary" : ""}">${label}</button>`;
const TEST_Q = [
	"How many issues did testing catch?",
	"How many were critical or game breaking?",
	"Most helpful test",
	"Least helpful test",
];
const ENGINE_Q = [
	"What did you like most about the engine?",
	"Did you get stuck or guess wrong?",
	"Most important thing built yourself",
	"Hardest part of using the engine",
	"Engine changes",
	"One thing to change about the engine",
];
const PROMPT_Q = [
	"What did you like most about this prompt?",
	"What was confusing?",
	"What was the hardest thing to do?",
	"What would you change?",
];
export class UI {
	constructor(settings) {
		this.settings = settings;
		this.panelName = null;
		this.focused = null;
		this.returnTo = "title";
		this.bannerUntil = 0;
		this.commUntil = 0;
		this.toastUntil = 0;
		this.best = this.read("solar-mayhem-best", 0);
		this.saved = this.read("solar-mayhem-save", null);
		this.creditsTab = "source";
		this.last = "keyboard";
		this.input = null;
		document.addEventListener("click", (e) => {
			const b = e.target.closest("[data-action]");
			if (!b || b.disabled) return;
			if (this.input && performance.now() < (this.input.consumedUntil ?? 0))
				return;
			this.game.sound.start();
			this.game.sound.play("ui");
			this.action(b.dataset.action, b);
		});
		document.addEventListener("input", (e) => this.slider(e.target));
	}
	attach(game, network) {
		this.game = game;
		this.net = network;
		this.prompts("keyboard");
	}
	read(k, fallback) {
		try {
			return JSON.parse(localStorage.getItem(k)) ?? fallback;
		} catch {
			return fallback;
		}
	}
	write(k, v) {
		try {
			localStorage.setItem(k, JSON.stringify(v));
		} catch {}
	}
	inMenu() {
		return this.game?.mode === "title" || !!this.panelName;
	}
	screen(name) {
		$("#title-screen").classList.toggle("hidden", name !== "title");
		$("#hud").classList.toggle("hidden", !["flight", "waiting"].includes(name));
		$("#attract-label").classList.toggle("hidden", !this.game.attract);
		if (name === "title") {
			this.returnTo = "title";
			$("#continue-button").classList.toggle("hidden", !this.saved);
			this.hide();
			this.focusFirst();
			this.bannerHide();
		}
	}
	hide() {
		this.panelName = null;
		$("#overlay").classList.add("hidden");
		$("#panel").innerHTML = "";
		this.focused = null;
	}
	focusables() {
		const area = this.panelName ? $("#panel") : $("#title-screen");
		return [
			...area.querySelectorAll("button:not(:disabled),input[type=range]"),
		].filter((e) => e.offsetParent !== null && !e.classList.contains("hidden"));
	}
	focus(el, dom = true) {
		if (!el) return;
		if (this.focused && this.focused !== el)
			this.focused.classList.remove("focused");
		this.focused = el;
		el.classList.add("focused");
		if (dom) el.focus({ preventScroll: true });
		if (this.panelName)
			el.scrollIntoView({ block: "nearest", behavior: "instant" });
	}
	focusFirst(selector = null) {
		const b = selector
			? $("#panel").querySelector(selector)
			: this.focusables()[0];
		this.focus(b);
	}
	nav(d) {
		const list = this.focusables();
		const i = list.indexOf(this.focused);
		this.focus(list[(i + d + list.length) % list.length]);
		this.game.sound.play("ui");
	}
	adjust(d) {
		if (this.focused?.type === "range") {
			const f = this.focused;
			f.value = clamp(
				Number(f.value) + Number(f.step || 1) * d,
				Number(f.min),
				Number(f.max),
			);
			f.dispatchEvent(new Event("input", { bubbles: true }));
		} else this.nav(d);
	}
	activate() {
		if (this.focused?.tagName === "BUTTON") this.focused.click();
		else if (!this.focused) this.focusFirst();
	}
	show(name, html, wide = false) {
		this.panelName = name;
		$("#overlay").classList.remove("hidden");
		$("#panel").className = wide ? "wide" : "";
		$("#panel").innerHTML = html;
		this.prompts(this.last);
		this.focusFirst();
	}
	footer(action = "back", label = "BACK") {
		return `<div class="panel-footer">${btn(action, `<span class="key" data-bind="back">ESC</span> ${label}`)}<span>FLIGHT SYSTEMS / KESTREL-06</span></div>`;
	}
	back() {
		const p = this.panelName;
		if (!p) return;
		if (p === "pause" || p === "dev") {
			this.resume();
			return;
		}
		if (p === "map") {
			this.hide();
			if (this.mapResume === "playing") this.game.mode = "playing";
			else this.game.warp(this.game.nextSector());
			return;
		}
		if (p === "result") {
			if (!this.net.hubMode) this.game.title();
			return;
		}
		if (this.returnTo === "pause") {
			this.pause(true);
			return;
		}
		if (this.returnTo === "result") {
			this.result(this.game.completed);
			return;
		}
		this.hide();
		this.focusFirst();
	}
	pause(force = false) {
		if (this.net.ended) return;
		if (this.game.mode === "paused" && !force) {
			this.resume();
			return;
		}
		if (!force) this.resumeMode = this.game.mode;
		this.game.mode = "paused";
		this.returnTo = "pause";
		this.show(
			"pause",
			`<div class="eyebrow">ENGINES IDLING</div><h2>Catch your breath.</h2><p>Even space heroes need a pit stop.</p><div class="menu-stack">${btn("resume", "RESUME FLIGHT <span>↗</span>", true)}${btn("manual", "FLIGHT MANUAL")}${btn("settings", "SETTINGS")}${btn("dev", "DEVELOPER TOOLS")}${btn("about", "ABOUT / CREDITS")}${this.net.hubMode ? "" : btn("title", "SAVE & RETURN TO TITLE")}</div>`,
		);
	}
	resume() {
		this.hide();
		this.game.mode = this.resumeMode ?? "playing";
		this.input?.keys.clear();
	}
	map() {
		if (
			this.net.ended ||
			this.game.mode === "title" ||
			this.game.mode === "waiting"
		)
			return;
		if (this.panelName === "map") {
			this.back();
			return;
		}
		this.mapResume = this.game.mode === "playing" ? "playing" : "map";
		this.game.mode = "map";
		this.showMap();
	}
	showMap() {
		const g = this.game;
		this.show(
			"map",
			`<div class="eyebrow">GALACTIC SCANNER / THE LOST-SUN ROUTE</div><h2>Six sectors to sunrise.</h2><div class="scanner-note"><span>KESTREL FUEL <b>${Math.ceil(g.fuel)}%</b> · HYPERWARP COST <b>8</b></span><span>${g.redZone ? "● RED ZONE ACTIVE" : "● FEDERATION SIGNAL: STABLE"}</span></div><div class="scanner-grid">${SECTORS.map((s, i) => `<button class="sector-card ${i === g.unlocked ? "selected" : ""}" data-action="travel" data-sector="${i}" ${i > g.unlocked ? "disabled" : ""}><small>0${i + 1} / ${s.type.toUpperCase()}</small><span class="sector-icon">${s.icon}</span><strong>${s.name.toUpperCase()}</strong><em>${g.cleared.includes(i) ? "✓ SECURED · REVISIT" : i > g.unlocked ? "SIGNAL LOCKED" : "ENTER SECTOR ↗"}</em></button>`).join("")}</div><p class="scanner-legend">After Lantern, choose rescue or refueling first. Secure both to unlock Needle Run. You can revisit cleared sectors. Wayfarer Bay repairs your hull and fills your tanks. Low on fuel? An emergency tug costs 500 points.</p>${this.footer("back", this.mapResume === "playing" ? "RETURN TO FLIGHT" : "TAKE NEXT JUMP")}`,
			true,
		);
		this.focusFirst(`[data-sector="${g.nextSector()}"]`);
	}
	manual() {
		this.show(
			"manual",
			`<div class="eyebrow">KESTREL FLIGHT SCHOOL / 90 SECONDS, TOPS</div><h2>Small ship. Big nerve.</h2><div class="manual-grid"><div><h3>01 / FLY & FIGHT</h3><p>Steer your ship across the flight lane. Cannons have unlimited shots. Bring a target near your reticle for a gentle targeting lock.</p><div class="manual-keys"><b class="key" data-bind="move">WASD</b><span>Steer / mouse to fly</span></div><div class="manual-keys"><b class="key" data-bind="fire">SPACE / CLICK</b><span>Hold to fire</span></div><div class="manual-keys"><b class="key" data-bind="boost">SHIFT</b><span>Boost · uses extra fuel</span></div><div class="manual-keys"><b class="key" data-bind="pulse">E</b><span>Clear fire · 8s recharge</span></div><div class="manual-keys"><b class="key" data-bind="roll">Q</b><span>Dodge roll · 3s recharge</span></div></div><div><h3>02 / BRING EVERYBODY HOME</h3><p>Rescue cadets by flying LOW through their mint beacons. Dock in the green bay to repair and refuel. Don't shoot the bay!</p><h3>03 / FIND THE LOST SUN</h3><p>Take the golden key through the ion door. Catch wormhole rings for fuel. Crack all three phases of the Nightjar's reactor.</p><div class="manual-keys"><b class="key" data-bind="map">TAB</b><span>Scanner / choose sector</span></div><div class="manual-keys"><b class="key" data-bind="pause">ESC</b><span>Pause / options</span></div></div></div><p class="compact-info">Touch: drag anywhere on the left to fly. Cannons and tractor beam are automatic; release the stick for rescue assistance. A pulse button appears when danger is close. Wing race: translucent rivals cannot damage your ship.</p>${this.footer()}`,
			true,
		);
	}
	settingsPanel() {
		this.show(
			"settings",
			`<div class="eyebrow">MAKE YOURSELF AT HOME</div><h2>Your flight. Your rules.</h2><div class="setting-row"><label for="music">Music</label><input id="music" data-setting="music" type="range" min="0" max="100" step="1" value="${Math.round(this.settings.music * 100)}"><output>${Math.round(this.settings.music * 100)}%</output></div><div class="setting-row"><label for="sfx">Effects & radio</label><input id="sfx" data-setting="sfx" type="range" min="0" max="100" step="1" value="${Math.round(this.settings.sfx * 100)}"><output>${Math.round(this.settings.sfx * 100)}%</output></div><div class="setting-row"><label for="sensitivity">Steering sensitivity</label><input id="sensitivity" data-setting="sensitivity" type="range" min="50" max="150" step="5" value="${Math.round(this.settings.sensitivity * 100)}"><output>${Math.round(this.settings.sensitivity * 100)}%</output></div><div class="setting-row"><label>Controller glyphs</label>${btn("glyphs", this.settings.glyphs === "ps" ? "PLAYSTATION △ ○ × □" : "XBOX Y B A X")}</div><div class="setting-row"><label>Screen shake</label>${btn("shake", this.settings.shake ? "ON" : "OFF")}</div><div class="setting-row"><label>Gibberish radio voice</label>${btn("voices", this.settings.voices ? "ON" : "OFF")}</div>${this.footer()}`,
		);
	}
	slider(el) {
		if (el.dataset.setting) {
			const k = el.dataset.setting;
			this.settings[k] = Number(el.value) / 100;
			el.nextElementSibling.textContent = `${el.value}%`;
			this.write("solar-mayhem-settings", this.settings);
			this.game.sound.volumes();
		}
		if (el.dataset.tuning) {
			const k = el.dataset.tuning,
				value = Number(el.value);
			this.game.tuning[k] = value;
			el.nextElementSibling.textContent = value;
			if (k === "bossHealth" && this.game.boss) {
				const b = this.game.boss;
				b.hp = (b.hp / b.maxHp) * value;
				b.maxHp = value;
			}
		}
	}
	dev() {
		const g = this.game;
		const specs = [
			["enemyDamage", "Enemy damage", 0, 50, 1],
			["fireRate", "Shots / second", 1, 16, 1],
			["fuelDrain", "Fuel / second", 0, 1, 0.02],
			["flightSpeed", "Steering speed", 4, 24, 1],
			["aimAssist", "Target lock radius", 0, 12, 0.5],
			["bossHealth", "Boss hull", 30, 400, 10],
		];
		this.show(
			"dev",
			`<div class="eyebrow">DEVELOPER FLIGHT DECK / LIVE TUNING</div><h2>Twiddle responsibly.</h2><div class="dev-grid">${specs.map(([key, label, min, max, step]) => `<div class="setting-row"><label for="dev-${key}">${label}</label><input id="dev-${key}" data-tuning="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${g.tuning[key]}"><output>${g.tuning[key]}</output></div>`).join("")}</div><div class="dev-actions">${btn("god", `INVINCIBLE: ${g.god ? "ON" : "OFF"}`)}${btn("autopilot", `AUTOPILOT: ${g.autopilot ? "ON" : "OFF"}`)}${btn("supplies", "RESTORE SUPPLIES")}${btn("spawn", "SPAWN RAIDING WING")}${btn("clear-sector", "COMPLETE SECTOR")}${btn("reset-tuning", "RESET DEFAULTS")}</div><div class="eyebrow">JUMP TO ENCOUNTER</div><div class="dev-actions">${SECTORS.map((s, i) => btn("debug-travel", `0${i + 1} / ${s.name.toUpperCase()}`, false, `data-sector="${i}"`)).join("")}</div><div class="dev-stats" id="dev-stats"></div>${this.footer("resume", "RESUME FLIGHT")}`,
			true,
		);
	}
	about(tab = this.creditsTab) {
		this.creditsTab = tab;
		const data = window.GAME_CREDITS;
		const tabs = [
			["source", "SOURCE INFORMATION"],
			["testing", "TESTING FEEDBACK"],
			["engine", "ENGINE FEEDBACK"],
			["prompt", "PROMPT FEEDBACK"],
		];
		let body = "";
		if (tab === "source") {
			body =
				'<div class="credits-grid">' +
				Object.entries(data.sourceInformation)
					.map(
						([k, v]) =>
							`<div><b>${esc(k.replace(/[A-Z]/g, (c) => ` ${c}`))}</b>${esc(v)}</div>`,
					)
					.join("") +
				'</div><div class="separator"></div><p class="compact-info">Research: <a href="https://www.atariage.com/2600/manuals_old/solaris.html" target="_blank" rel="noreferrer">Original Solaris manual</a> · <a href="https://dougneubauer1.wordpress.com/atari/" target="_blank" rel="noreferrer">Doug Neubauer’s history</a>. Original art, game design, writing and synthesized audio created for this demo. Fonts: Space Grotesk (Florian Karsten) and Barlow Condensed (Jeremy Tribby), SIL Open Font License. Three.js MIT; Rapier Apache-2.0; AI Hub session client unmodified.</p>';
		} else {
			const q =
				tab === "testing" ? TEST_Q : tab === "engine" ? ENGINE_Q : PROMPT_Q;
			const a = data[`${tab}Feedback`];
			body = q
				.map(
					(v, i) =>
						`<div class="feedback-item"><b>${esc(v)}</b>${esc(a[i] ?? "unknown")}</div>`,
				)
				.join("");
		}
		this.show(
			"about",
			`<div class="eyebrow">A LOVE LETTER TO THE SPACEWAYS</div><h2>Solar Mayhem</h2><p>Inspired by <b>Solaris (1986)</b>, created by Doug Neubauer for the Atari 2600. An original fan-inspired game, with no original game assets.</p><div class="credits-tabs">${tabs.map(([k, l]) => btn("credits-tab", l, k === tab, `data-tab="${k}"`)).join("")}</div>${body}${this.footer()}`,
			true,
		);
	}
	online() {
		this.show(
			"online",
			`<div class="eyebrow">SAME STARS / FRIENDLY COMPETITION</div><h2>Bring a wing pilot.</h2><p>Race the six-sector route. See your rival's ghost when you share a sector. Highest score wins. AI Hub supports 1–4 pilots automatically.</p><h3>LOCAL WING · 1–4 TABS ON THIS BROWSER</h3><input id="room-code" aria-label="Wing channel code" type="text" maxlength="16" value="KESTREL"><div class="online-actions">${btn("local-host", "CREATE CHANNEL")}${btn("local-join", "JOIN CHANNEL")}</div><h3>DIRECT WING · TWO DEVICES</h3><p class="compact-info">Host creates an invitation. Friend pastes it below and chooses Join. Friend sends their answer back; host pastes it and chooses Accept answer. A direct WebRTC connection needs a compatible network.</p><textarea id="signal-input" aria-label="Paste invitation or answer" placeholder="Paste your friend's flight code here"></textarea><div class="online-actions">${btn("remote-host", "CREATE INVITATION")}${btn("remote-join", "JOIN INVITATION")}${btn("remote-answer", "ACCEPT ANSWER")}</div><textarea id="signal-output" readonly aria-label="Your flight code" placeholder="Your flight code appears here"></textarea><div class="online-actions">${btn("copy-signal", "COPY FLIGHT CODE")}${btn("launch-wing", "LAUNCH WING RACE", true)}</div><p id="network-status">${this.net.active ? "Wing channel is open." : "No wing link yet. Solo campaign is always available."}</p>${this.footer()}`,
			true,
		);
	}
	networkStatus(text) {
		const el = $("#network-status");
		if (el) el.textContent = text;
		else if (!this.net.hubMode) this.toast(text);
	}
	result(won) {
		this.best = Math.max(this.best, Math.round(this.game.score));
		this.write("solar-mayhem-best", this.best);
		this.net.result();
		if (this.net.hubMode) return;
		const g = this.game;
		this.show(
			"result",
			`<div class="eyebrow">${won ? "MISSION COMPLETE / THE SUN IS OURS" : "FLIGHT LOG CLOSED / YOU GAVE THEM HELL"}</div><h2>${won ? "Hello, sunshine." : "One more sunrise?"}</h2><p>${won ? "The cadets are home. The Nightjar is history. Flight Control says you can keep the ship." : "There are still good people out there. Take a fresh Kestrel and make the next run count."}</p><div class="result-stats"><div><small>FLIGHT SCORE</small><strong>${Math.round(g.score).toLocaleString()}</strong></div><div><small>CADETS SAFE</small><strong>${g.metrics.rescues}</strong></div><div><small>SECTORS</small><strong>${g.cleared.length} / 6</strong></div></div><p class="compact-info">${Math.floor(g.campaignTime / 60)}m ${Math.floor(g.campaignTime % 60)}s in the spaceways · ${g.metrics.kills} hostile craft down · Best score ${this.best.toLocaleString()}${this.net.active ? `<br>Wing standings: ${[...this.net.peers.values()].map((p) => `${esc(p.name)} ${Math.round(p.score ?? 0)}`).join(" · ")}` : ""}</p><div class="menu-stack">${btn("new", "FLY AGAIN ↗", true)}${btn("title", "RETURN TO TITLE")}${btn("about", "ABOUT / CREDITS")}</div>`,
		);
	}
	action(action, b) {
		const g = this.game;
		switch (action) {
			case "new":
				this.returnTo = "title";
				g.start();
				break;
			case "continue":
				g.start({ save: this.saved });
				break;
			case "title":
				if (this.net.hubMode) return;
				this.save();
				g.title();
				break;
			case "back":
				this.back();
				break;
			case "resume":
				this.resume();
				break;
			case "pause":
				this.pause();
				break;
			case "map":
				this.map();
				break;
			case "travel":
				g.warp(Number(b.dataset.sector));
				break;
			case "manual":
				this.manual();
				break;
			case "settings":
				this.settingsPanel();
				break;
			case "dev":
				this.dev();
				break;
			case "about":
				if (this.panelName === "result") this.returnTo = "result";
				this.about();
				break;
			case "credits-tab":
				this.about(b.dataset.tab);
				break;
			case "online":
				this.online();
				break;
			case "glyphs":
				this.settings.glyphs = this.settings.glyphs === "ps" ? "xbox" : "ps";
				this.write("solar-mayhem-settings", this.settings);
				this.settingsPanel();
				break;
			case "shake":
			case "voices":
				this.settings[action] = !this.settings[action];
				this.write("solar-mayhem-settings", this.settings);
				this.settingsPanel();
				break;
			case "god":
				g.god = !g.god;
				this.dev();
				break;
			case "autopilot":
				g.autopilot = !g.autopilot;
				this.dev();
				break;
			case "supplies":
				g.health = 100;
				g.fuel = 100;
				g.lives = 4;
				this.toast("All supplies restored.");
				break;
			case "spawn":
				for (let i = 0; i < 3; i++)
					g.enemy(
						i === 0 ? "mech" : "cobra",
						-5 + i * 5,
						2,
						-50 - i * 15,
						false,
					);
				this.toast("Three hostile craft added.");
				break;
			case "clear-sector":
				g.mode = "playing";
				g.complete();
				this.hide();
				break;
			case "reset-tuning":
				Object.assign(g.tuning, DEFAULT_TUNING);
				if (g.boss) {
					g.boss.hp = (g.boss.hp / g.boss.maxHp) * g.tuning.bossHealth;
					g.boss.maxHp = g.tuning.bossHealth;
				}
				this.dev();
				break;
			case "debug-travel":
				g.unlocked = 5;
				g.warp(Number(b.dataset.sector));
				break;
			case "pulse":
				g.pulse();
				break;
			case "local-host":
			case "local-join":
				this.net.local($("#room-code").value, action === "local-host");
				break;
			case "launch-wing":
				if (!this.net.host) {
					this.networkStatus("The host launches the wing race.");
					break;
				}
				this.net.launch();
				break;
			case "remote-host":
				this.signal(async () => this.net.rtc(true));
				break;
			case "remote-join":
				this.signal(async () => this.net.rtc(false, $("#signal-input").value));
				break;
			case "remote-answer":
				this.signal(async () => {
					await this.net.answer($("#signal-input").value);
					return null;
				});
				break;
			case "copy-signal": {
				const el = $("#signal-output");
				if (!el.value) {
					this.networkStatus("Create or join an invitation first.");
					break;
				}
				if (navigator.clipboard)
					navigator.clipboard.writeText(el.value).then(
						() => this.networkStatus("Flight code copied."),
						() => {
							el.select();
							this.networkStatus("Code selected. Copy it with your keyboard.");
						},
					);
				else {
					el.select();
					document.execCommand("copy");
					this.networkStatus("Flight code selected.");
				}
				break;
			}
		}
	}
	async signal(fn) {
		this.networkStatus("Preparing a direct wing link…");
		try {
			const code = await fn();
			const out = $("#signal-output");
			if (code && out) {
				out.value = code;
				this.networkStatus(
					this.net.host
						? "Invitation ready. Send it to your friend."
						: "Answer ready. Send it back to the host.",
				);
			}
		} catch (e) {
			this.networkStatus(e.message);
		}
	}
	save(clear = false) {
		if (this.net?.hubMode || this.game.attract) return;
		if (clear) {
			this.saved = null;
			this.write("solar-mayhem-save", null);
		} else if (
			["playing", "paused", "map", "clear", "warp"].includes(this.game.mode)
		) {
			this.saved = this.game.serial();
			if (this.game.mode === "clear" && this.game.sector < 5)
				this.saved.sector = this.game.nextSector();
			this.write("solar-mayhem-save", this.saved);
		}
	}
	banner(kicker, title, sub, seconds = 3) {
		$("#banner").classList.remove("hidden");
		$("#banner-kicker").textContent = kicker;
		$("#banner-title").textContent = title;
		$("#banner-sub").textContent = sub;
		this.bannerUntil = performance.now() + seconds * 1000;
	}
	bannerHide() {
		$("#banner").classList.add("hidden");
		this.bannerUntil = 0;
	}
	radio(text, urgent = false) {
		$("#comm-text").textContent = text;
		$("#comm-speaker").textContent = urgent
			? "FLIGHT CONTROL / URGENT"
			: "FLIGHT CONTROL / R-6";
		$("#comm").classList.add("visible");
		this.commUntil = performance.now() + 7000;
		if (this.settings.voices) this.game.sound.voice(urgent ? 2 : 0);
	}
	toast(text) {
		$("#toast").textContent = text;
		$("#toast").style.opacity = 1;
		this.toastUntil = performance.now() + 3200;
	}
	hit() {
		$("#flash").style.opacity = 0.23;
		setTimeout(() => ($("#flash").style.opacity = 0), 100);
	}
	prompts(type) {
		this.last = type;
		const pad = type === "pad";
		const ps = this.settings.glyphs === "ps";
		const glyph = pad
			? {
					confirm: ps ? "×" : "A",
					back: ps ? "○" : "B",
					move: "L",
					fire: ps ? "R2" : "RT",
					boost: ps ? "×" : "A",
					pulse: ps ? "□" : "X",
					roll: ps ? "○" : "B",
					map: ps ? "△" : "Y",
					pause: ps ? "OPTIONS" : "MENU",
				}
			: {
					confirm: "ENTER",
					back: "ESC",
					move: "WASD",
					fire: "SPACE / CLICK",
					boost: "SHIFT",
					pulse: "E",
					roll: "Q",
					map: "TAB",
					pause: "ESC",
				};
		document.querySelectorAll("[data-bind]").forEach((e) => {
			e.textContent = glyph[e.dataset.bind] ?? "?";
		});
		$("#device-hint").textContent = pad
			? `STANDARD GAMEPAD / ${ps ? "PLAYSTATION GLYPHS" : "XBOX GLYPHS"}`
			: "KEYBOARD + MOUSE / CONTROLLER READY";
	}
	update() {
		const now = performance.now();
		if (now > this.bannerUntil) this.bannerHide();
		if (now > this.commUntil) $("#comm").classList.remove("visible");
		if (now > this.toastUntil) $("#toast").style.opacity = 0;
		const g = this.game;
		if (!g) return;
		if (
			g.mode === "title" &&
			!this.panelName &&
			now - this.input.lastActivity >= 10000 &&
			!this.net.hubMode
		) {
			g.start({ attract: true });
		}
		if ($("#dev-stats"))
			$("#dev-stats").textContent =
				`${g.g.backend} / THREE r180 / RAPIER 0.19.3 · ${g.entities.length} entities · ${g.metrics.collisions} contacts · ${g.metrics.shots} shots · ${g.metrics.kills} kills · ${g.campaignTime.toFixed(1)}s`;
		if (["title", "waiting", "ended"].includes(g.mode)) return;
		const s = SECTORS[g.sector];
		$("#sector-index").textContent =
			`SECTOR 0${g.sector + 1} / ${s.name.toUpperCase()}`;
		$("#sector-name").textContent = s.subtitle.toUpperCase();
		$("#score").textContent = String(Math.floor(g.score)).padStart(6, "0");
		$("#best").textContent = `BEST ${String(this.best).padStart(6, "0")}`;
		$("#hull-number").textContent = Math.ceil(g.health);
		$("#lives").textContent = "◆ ".repeat(Math.max(0, g.lives));
		$("#shield-bar").style.width = `${g.health}%`;
		$("#fuel-bar").style.width = `${g.fuel}%`;
		$("#fuel-number").textContent = Math.ceil(g.fuel);
		$("#fuel-number").style.color = g.fuel < 20 ? "#ff8d7e" : "";
		$("#pulse-status").textContent =
			g.pulseCD > 0 ? `${g.pulseCD.toFixed(1)}s` : "READY";
		$("#roll-status").textContent =
			g.rollCD > 0 ? `${g.rollCD.toFixed(1)}s` : "READY";
		$("#objective-label").textContent = s.goal;
		let detail = "",
			progress = 0;
		if (s.type === "fleet") {
			progress = g.killed / 12;
			detail = `${g.killed} / 12 raiders · Planet ${Math.ceil(g.planet)}%`;
		}
		if (s.type === "rescue") {
			progress = g.rescued.length / 4;
			detail = `${g.rescued.length} / 4 cadets aboard · Fly LOW`;
		}
		if (s.type === "dock") {
			progress = g.repaired ? 1 : Math.min(1, g.elapsed / 9);
			detail = "Green bay dead ahead · CEASE FIRE";
		}
		if (s.type === "corridor") {
			progress = g.key ? 0.6 : 0.1;
			detail = g.key
				? "ION KEY ABOARD · Pass through the door"
				: "GOLD KEY · Left of center";
		}
		if (s.type === "wormhole") {
			progress = g.elapsed / 23;
			detail = `${g.rings} / 6 focus rings · Ride it out`;
		}
		if (s.type === "boss") {
			progress = g.boss ? 1 - g.boss.hp / g.boss.maxHp : 1;
			detail = "Roll through danger · Pulse clears fire";
		}
		$("#objective-detail").textContent = detail;
		$("#objective-bar").style.width = `${clamp(progress * 100, 0, 100)}%`;
		$("#boss-hud").classList.toggle("hidden", !g.boss);
		if (g.boss) {
			$("#boss-bar").style.width = `${(g.boss.hp / g.boss.maxHp) * 100}%`;
			$("#boss-phase").textContent = [
				"",
				"I / ARMORED",
				"II / SCATTER CANNONS",
				"III / REACTOR EXPOSED",
			][g.boss.phase];
		}
		const input = this.input.read(),
			target = g.aimTarget(input);
		const aim = target
			? new THREE.Vector3(target.x, target.y, target.z)
			: new THREE.Vector3(
					g.x + (input.aimX ?? 0) * 20,
					g.y + (input.aimY ?? 0) * 12,
					-65,
				);
		const p = g.g.project(aim);
		$("#reticle").style.left = `${p.x}px`;
		$("#reticle").style.top = `${p.y}px`;
		$("#reticle").classList.toggle("locked", !!target);
		$("#lock-label").textContent = target ? "TARGET LOCK" : "";
		const dangers = g.entities.filter(
			(e) => e.type === "bolt" && e.team === "enemy" && e.z > -50,
		).length;
		$("#touch-pulse").classList.toggle(
			"hidden",
			!(
				this.input.touch &&
				dangers >= 3 &&
				g.pulseCD <= 0 &&
				g.mode === "playing"
			),
		);
		this.drawRadar();
		const list = $("#ghost-list");
		list.replaceChildren();
		if (this.net.active)
			for (const p of this.net.peers.values()) {
				const e = document.createElement("div");
				e.textContent = `${p.name} · ${Math.round(p.score ?? 0)}${p.finished ? " ✓" : ""}`;
				list.append(e);
			}
	}
	drawRadar() {
		const g = this.game,
			c = $("#radar"),
			ctx = c.getContext("2d");
		ctx.clearRect(0, 0, 240, 100);
		ctx.strokeStyle = "#455668";
		ctx.lineWidth = 0.5;
		for (let x = 0; x <= 240; x += 40) {
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, 100);
			ctx.stroke();
		}
		for (let y = 0; y <= 100; y += 25) {
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(240, y);
			ctx.stroke();
		}
		let count = 0;
		for (const e of g.entities) {
			if (e.z > 5 || e.z < -120 || e.type === "bolt") continue;
			count++;
			const x = 120 + e.x * 8,
				y = 90 + e.z * 0.65;
			ctx.fillStyle =
				e.type === "enemy"
					? "#f9a181"
					: e.type === "key"
						? "#f7d38f"
						: "#95e2d7";
			ctx.beginPath();
			ctx.arc(x, y, e.kind === "boss" ? 5 : 2.7, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.fillStyle = "#f8e5c2";
		ctx.beginPath();
		ctx.moveTo(120 + g.x * 8, 87);
		ctx.lineTo(116 + g.x * 8, 96);
		ctx.lineTo(124 + g.x * 8, 96);
		ctx.fill();
		$("#threat-count").textContent = `${count} CONTACTS`;
	}
}
