import { CASES } from "./core.js";

const esc = (s) =>
	String(s ?? "").replace(
		/[&<>"']/g,
		(c) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				c
			],
	);
const fmt = (n) => Math.max(0, Math.round(n || 0)).toLocaleString("en-US");
const btn = (action, text, primary = false, extra = "") =>
	`<button class="btn ${primary ? "primary" : ""} ${extra.includes('class="small"') ? "small" : ""}" data-action="${action}" ${extra.replace('class="small"', "")}><span>${text}</span><span class="arrow" aria-hidden="true">↗</span></button>`;
const feedbackQuestions = {
	testingFeedback: [
		"Issues caught by testing",
		"Critical or game-breaking issues",
		"Most helpful test",
		"Least helpful test",
	],
	engineFeedback: [
		"What worked best",
		"Where I got stuck or guessed wrong",
		"Most important custom system",
		"Hardest engine task",
		"Engine modifications",
		"One engine improvement",
	],
	promptFeedback: [
		"What worked best in the prompt",
		"What was confusing",
		"Hardest requirement",
		"Suggested prompt change",
	],
};
export class UI {
	constructor(onAction, getState) {
		this.onAction = onAction;
		this.getState = getState;
		this.root = document.querySelector("#ui");
		this.screen = "";
		this.returnTo = "title";
		this.kind = "keyboard";
		this.glyphStyle = "playstation";
		this.guidePage = 0;
		this.aboutPage = 0;
		this.root.addEventListener("click", (e) => {
			const b = e.target.closest("[data-action]");
			if (!b || b.disabled) return;
			this.act(b.dataset.action);
		});
		this.root.addEventListener("pointerover", (e) => {
			const b = e.target.closest("button,input");
			if (b && !b.disabled) this.focus(b);
		});
		this.root.addEventListener("focusin", (e) => {
			if (e.target.matches("button,input")) this.focus(e.target);
		});
		this.root.addEventListener("input", (e) => {
			const input = e.target;
			if (input.dataset.setting) {
				this.onAction("setting", {
					key: input.dataset.setting,
					value: Number(input.value),
				});
				this.updateOutput(input);
			}
			if (input.dataset.tune) {
				this.onAction("tune", {
					key: input.dataset.tune,
					value: Number(input.value),
				});
				this.updateOutput(input);
			}
			if (input.id === "join-code")
				input.value = input.value.replace(/\D/g, "").slice(0, 5);
		});
		document
			.querySelector("#pause-button")
			.addEventListener("click", () => this.onAction("pause"));
		document.querySelector("#context-action").addEventListener("click", (e) => {
			if (e.target.closest("button")) this.onAction(this.contextKind);
		});
		this.map = document.querySelector("#minimap").getContext("2d");
	}
	act(action) {
		if (action === "guide-next" || action === "guide-prev") {
			this.guidePage = (this.guidePage + (action.endsWith("next") ? 1 : 3)) % 4;
			this.show("guide");
			return;
		}
		if (action === "about-next" || action === "about-prev") {
			this.aboutPage =
				(this.aboutPage +
					(action.endsWith("next") ? 1 : this.aboutPages().length - 1)) %
				this.aboutPages().length;
			this.show("about");
			return;
		}
		const payload =
			action === "join"
				? document.querySelector("#join-code")?.value
				: undefined;
		this.onAction(action, payload);
	}
	glyph(action) {
		const isPad = this.kind === "pad";
		if (isPad) {
			const xbox = this.glyphStyle === "xbox";
			const map = {
				jump: [xbox ? "A" : "×", "blue"],
				duck: [xbox ? "B" : "○", "red"],
				whistle: [xbox ? "X" : "□", "pink"],
				lift: [xbox ? "Y" : "△", "green"],
				accept: [xbox ? "A" : "×", "blue"],
				back: [xbox ? "B" : "○", "red"],
				view: [xbox ? "LB" : "L1", ""],
				pause: ["☰", ""],
				move: ["L", ""],
			};
			const [label, color] = map[action] || ["•", ""];
			return `<span class="key pad ${color}">${label}</span>`;
		}
		if (this.kind === "touch")
			return `<span class="key">${({ jump: "TAP", duck: "↓", lift: "TAP", whistle: "TAP", accept: "TAP", move: "DRAG", view: "MAP", pause: "Ⅱ", back: "←" })[action] || "TAP"}</span>`;
		const map = {
			move: "A D",
			jump: "SPACE",
			duck: "S / ↓",
			lift: "W / E",
			whistle: "F",
			accept: this.kind === "mouse" ? "CLICK" : "ENTER",
			back: "ESC",
			view: "TAB",
			pause: "ESC",
		};
		return `<span class="key">${map[action] || action}</span>`;
	}
	refreshPrompts(kind, glyphStyle) {
		this.kind = kind;
		this.glyphStyle = glyphStyle;
		document.body.classList.toggle("touch", kind === "touch");
		for (const e of document.querySelectorAll("[data-glyph]"))
			e.innerHTML = this.glyph(e.dataset.glyph);
		document.querySelector("#play-prompts").innerHTML =
			`${this.glyph("move")} Move <span>${this.glyph("jump")} Leap</span><span>${this.glyph("duck")} Duck</span><span>${this.glyph("whistle")} Whistle</span><span class="optional">${this.glyph("view")} Mall view</span>`;
	}
	show(screen, opts = {}) {
		if (opts.returnTo) this.returnTo = opts.returnTo;
		this.screen = screen;
		this.root.innerHTML =
			screen === "title"
				? this.title()
				: screen === "none"
					? ""
					: this.modal(screen);
		this.refreshPrompts(this.kind, this.glyphStyle);
		const first = this.root.querySelector("button:not(:disabled),input");
		if (first) this.focus(first);
		this.onAction("screen", screen);
	}
	title() {
		const state = this.getState();
		return `<section class="title-screen"><div class="title-copy"><p class="eyebrow">A HALFWICK’S SUNDAY SPECIAL</p><h1 class="title-logo" aria-label="Keystone Kapers"><span>KEYSTONE</span><strong>KAPERS</strong></h1><div class="title-ribbon">LIFT, LAUGH, LOOT</div><p class="title-desc">One crook. Four floors.<br>A whole store full of trouble.</p><nav class="menu-stack" aria-label="Main menu">${btn("start", '<span data-glyph="accept"></span> Start a shift', true)}${btn("partners", "Partner up <small>1–4</small>")}${btn("guide", "Field guide")}<div class="btn-row">${btn("settings", "Settings", false, 'class="small"')}${btn("about", "About", false, 'class="small"')}</div></nav></div><div class="title-stamp" aria-hidden="true"><small>WANTED</small>STOP THE<br>SHOPLIFTER!<small>REWARD: A GOOD LAUGH</small></div><div class="title-edition">AN ARCADE PURSUIT IN THREE ACTS</div><footer class="title-footer"><span>${state.best ? `PERSONAL BEST ${fmt(state.best)}  ·  ` : ""}LEAP THE CARTS. DUCK THE PLANES. BAG THE BANDIT.</span><span class="demo-time">NEXT SHOW IN <b id="idle-count">10</b></span></footer></section>`;
	}
	modal(screen) {
		const state = this.getState();
		let eyebrow = "THE DEPARTMENT OF MISCHIEF",
			title = "",
			lead = "",
			body = "",
			footer = "",
			wide = false;
		const back = btn(
			"back",
			`${this.glyph("back")} Back`,
			false,
			'aria-label="Back"',
		);
		if (screen === "pause") {
			eyebrow = "THE CHASE CAN WAIT A TICK";
			title = "TAKE A BREATHER.";
			lead = state.net.hubActive
				? "Your squad is still on duty. Rejoin when you’re ready."
				: "A good copper knows when to put the kettle on.";
			body = `<div class="menu-stack">${btn("resume", "Back on the beat", true)}${btn("guide", "Field guide")}${btn("settings", "Settings")}${btn("dev", "Workshop · Dev mode")}<div class="btn-row">${btn("about", "About this caper")}${!state.net.hubActive ? btn("title", "End shift") : ""}</div></div>`;
			footer = `${this.glyph("accept")} Select <span>${this.glyph("back")} Resume</span>`;
		} else if (screen === "partners") {
			eyebrow = "DOUBLE THE COPPERS, DOUBLE THE COMEDY";
			title = "PARTNER UP.";
			lead = "Share the chase. Share the score. Keep each other’s hats on.";
			body = `<div class="menu-stack">${btn("couch", "Two officers · One screen", true)}${btn("host", "Open an online room")}${btn("join-screen", "Join a room")}</div><p class="note">Couch co-op: two pads, or share a keyboard.<br>Online co-op: 2–4 officers, each with their own view.</p>`;
			footer = `${back}<span>No sign-up. Just a five-digit room code.</span>`;
		} else if (screen === "room") {
			eyebrow = "THE SQUAD ROOM";
			title =
				state.net.role === "host" ? "CALL IN THE COPPERS." : "PARTNER FOUND.";
			body = `<div class="room-code" aria-label="Room code">${esc(state.net.code)}</div><div class="roster" id="roster">${this.rosterHTML(state.net.roster)}</div><p class="room-status" id="room-status">${esc(this.roomStatus || "Waiting for a partner…")}</p><div class="menu-stack">${state.net.role === "host" ? btn("begin-room", "Start the shift", true) : btn("leave-room", "Leave room")}</div><p class="note">Share this code with up to three friends. Keep the room open until everybody joins.</p>`;
			footer = `${btn("leave-room", "Close room")}<span>WebRTC · Same-browser tabs connect directly.</span>`;
		} else if (screen === "join") {
			eyebrow = "THE SQUAD ROOM";
			title = "WHAT’S THE CODE?";
			lead = "Ask the host for the five digits. Your badge is waiting.";
			body = `<input id="join-code" class="room-code" aria-label="Five digit room code" inputmode="numeric" autocomplete="off" maxlength="5" placeholder="00000"><div class="menu-stack">${btn("join", "Join the squad", true)}</div><p class="room-status" id="room-status">${esc(this.roomStatus || "Type a code, or use the D-pad to set each digit.")}</p>`;
			footer = `${back}<span>D-pad ↑↓ digit · ←→ place · ${this.glyph("accept")} Join</span>`;
		} else if (screen === "settings") {
			eyebrow = "MAKE YOURSELF AT HOME";
			title = "THE FINER THINGS.";
			const s = state.settings;
			body = `<div class="settings-list">${this.slider("music", "Music", s.music * 100, 0, 100, 1, "%", "setting")}${this.slider("effects", "Sound & voices", s.effects * 100, 0, 100, 1, "%", "setting")}${this.toggle("mute", "Sound", !s.mute ? "ON" : "OFF")}${this.toggle("glyphs", "Controller glyphs", s.glyphs === "xbox" ? "XBOX" : "PLAYSTATION")}${this.toggle("assist", "Touch assistance", s.assist ? "ON" : "OFF")}${this.toggle("motion", "Reduced motion", s.motion ? "ON" : "OFF")}${btn("fullscreen", document.fullscreenElement ? "Leave fullscreen" : "Fill the screen")}</div>`;
			footer = `${back}<span>Music starts at 10%. Settings save on this device.</span>`;
		} else if (screen === "guide") {
			eyebrow = `CRIME-BUSTER’S HANDBOOK · ${this.guidePage + 1} / 4`;
			title = [
				"BAG THAT BANDIT.",
				"TAKE THE HIGH ROAD.",
				"MIND THE MERCHANDISE.",
				"BRING A PARTNER.",
			][this.guidePage];
			wide = true;
			const guides = [
				[
					[
						"01",
						"THE JOB",
						"Catch Bertie Baggs before he slips out of the rooftop exit. Touch him on the same floor to make the arrest.",
					],
					[
						"02",
						"THE PAYDAY",
						"Recovered bags and cases earn 150 points. An arrest pays 100 points for every second left. Finish all three cases.",
					],
				],
				[
					[
						"↟",
						"THE ESCALATORS",
						"Run onto the striped steps at the ends of each floor. They only go up. The last one is the only way to the roof.",
					],
					[
						"↕",
						"THE LIFT",
						"Go to the middle. Press Up when the doors open; ride as far as you like. Press Down at an open floor to step out.",
					],
				],
				[
					[
						"↗",
						"LEAP & DUCK",
						"Leap over carts and radios. Watch the bounce of beach balls. Duck under the toy planes: they cost a badge!",
					],
					[
						"♪",
						"A SHARP WHISTLE",
						"Whistle to stop nearby merchandise for two seconds and stun a crook within nine paces. Recharges in eight seconds.",
					],
				],
				[
					[
						"✦",
						"FOUR BADGE BRIGADE",
						"Online squads and AI Hub teams share the crook, timer, loot, and three badges. One arrest advances the whole squad.",
					],
					[
						"☷",
						"THE SECURITY FEED",
						"You are the mint dot. Bertie is orange. The lift is gold. Hold Mall View to inspect the whole building and plan a shortcut.",
					],
				],
			];
			body = `<div class="two-col">${guides[this.guidePage].map(([icon, h, text]) => `<article class="guide-card"><div class="icon">${icon}</div><h3>${h}</h3><p>${text}</p></article>`).join("")}</div><div class="guide-controls"><span>${this.glyph("move")} Move</span><span>${this.glyph("jump")} Leap</span><span>${this.glyph("duck")} Duck / exit</span><span>${this.glyph("lift")} Lift</span><span>${this.glyph("whistle")} Whistle</span><span>${this.glyph("view")} Mall view</span></div>${this.guidePage === 3 ? '<p class="note">Keyboard partner: J / L move · I leap · K duck · U lift · O whistle.<br>Touch: invisible left thumbstick; tap right to leap, swipe down to duck. Assistance times nearby jumps and ducks.</p>' : ""}`;
			footer = `${back}<div class="btn-row">${btn("guide-prev", "← Previous")}${btn("guide-next", "Next →", true)}</div>`;
		} else if (screen === "about") {
			const pages = this.aboutPages();
			const page = pages[this.aboutPage];
			eyebrow = `ABOUT THIS CAPER · ${this.aboutPage + 1} / ${pages.length}`;
			title = page.title;
			body = page.body;
			wide = true;
			footer = `${back}<div class="btn-row">${btn("about-prev", "← Previous")}${btn("about-next", "Next →", true)}</div>`;
		} else if (screen === "dev") {
			eyebrow = "WORKSHOP · LIVE BALANCE & TEST TOOLS";
			title = "BEHIND THE COUNTER.";
			wide = true;
			const t = state.tune;
			body = `<p class="dev-note"><span class="dev-badge">DEV MODE</span>Changes apply immediately. Resume to try them; reopen to adjust.${state.net.role === "client" ? " The host controls the shared world." : ""}</p><div class="settings-list">${this.slider("speed", "Officer speed", t.speed, 4, 16, 0.2, "", "tune")}${this.slider("jump", "Jump strength", t.jump, 7, 15, 0.2, "", "tune")}${this.slider("crookSpeed", "Crook speed", t.crookSpeed, 0.2, 1.8, 0.05, "×", "tune")}${this.slider("hazardRate", "Hazard frequency", t.hazardRate, 0.2, 2.5, 0.1, "×", "tune")}${this.slider("hitPenalty", "Hit time penalty", t.hitPenalty, 0, 15, 1, "s", "tune")}${this.slider("liftSpeed", "Lift speed", t.liftSpeed, 1, 7, 0.2, "", "tune")}${this.slider("timeScale", "Simulation speed", t.timeScale, 0.25, 2, 0.05, "×", "tune")}${this.toggle("invincible", "Invincible", t.invincible ? "ON" : "OFF", true)}${this.toggle("infiniteTime", "Freeze timer", t.infiniteTime ? "ON" : "OFF", true)}${this.toggle("colliders", "Physics geometry", t.colliders ? "ON" : "OFF", true)}${this.toggle("overview", "Full mall view", t.overview ? "ON" : "OFF", true)}</div><p class="dev-note">QUICK TRAVEL</p><div class="dev-buttons">${[0, 1, 2, 3].map((n) => btn(`floor-${n}`, ["Ground", "Floor 1", "Floor 2", "Roof"][n])).join("")}</div><div class="dev-bottom">${btn("dev-catch", "Catch crook")}${btn("dev-restart", "Restart case")}${btn("dev-refill", "Refill badges & time")}</div><div class="dev-bottom">${btn("dev-spawn-cart", "+ Cart")}${btn("dev-spawn-ball", "+ Ball")}${btn("dev-spawn-plane", "+ Plane")}${btn("dev-spawn-radio", "+ Radio")}</div><p class="dev-note">Case ${state.sim.caseIndex + 1} · ${fmt(state.sim.time)} s simulated · ${state.sim.metrics.hits} hits · ${state.sim.metrics.pickups} pickups · ${state.net.active ? state.net.role.toUpperCase() : "OFFLINE"}</p>`;
			footer = `${btn("back", "← Pause menu")} ${btn("dev-reset", "Reset defaults")} ${btn("resume", "Test changes", true)}`;
		} else if (screen === "caught") {
			const s = state.snapshot,
				c = CASES[s.caseIndex];
			const last = s.caseScores?.at(-1);
			eyebrow = `CASE ${s.caseIndex + 1} CLOSED · ${c.department.toUpperCase()}`;
			title = [
				"CAUGHT RED-HANDED!",
				"THAT’S A WRAP, BERTIE!",
				"BAGGED THE BANDIT!",
			][s.caseIndex];
			lead = [
				"“Just browsing, were we? A likely story!”",
				"“The toys can go home. You’re coming with us!”",
				"“Store’s closed, old bean. The cell is open!”",
			][s.caseIndex];
			body = `<div class="result-seal">✦ ${s.caseIndex === 2 ? "A CLEAN SWEEP" : "ARRESTING WORK"}</div><div class="result-stats"><div><small>TIME BONUS</small><b>+${fmt(last?.bonus)}</b></div><div><small>LOOT RECOVERED</small><b>${last?.loot || 0}</b></div><div><small>TOTAL SCORE</small><b>${fmt(s.score)}</b></div></div><div class="menu-stack">${state.net.role !== "client" ? btn("next-case", s.caseIndex === 2 ? "Clock out in style" : "On to the next caper", true) : '<p class="note">Waiting for the host to call the next case…</p>'}</div>`;
			footer = `<span>One badge restored for a job well done.</span><span>HALFWICK’S LOSS PREVENTION</span>`;
		} else if (screen === "victory") {
			const s = state.snapshot;
			eyebrow = "ALL THREE CASES CLOSED";
			title = "A GRAND DAY’S WORK.";
			lead =
				"Three crooks collared. One department store saved. Put the kettle on, copper. You’ve earned it.";
			body = `<div class="result-seal">✦ ${s.score >= 22000 ? "GOLDEN WHISTLE BRIGADE" : s.score >= 16000 ? "SILVER BADGE BRIGADE" : "THE MALL’S FINEST"}</div><div class="result-stats"><div><small>FINAL SCORE</small><b>${fmt(s.score)}</b></div><div><small>RECOVERED LOOT</small><b>${s.recovered}</b></div><div><small>BADGES INTACT</small><b>${s.badges} / 3</b></div></div><div class="menu-stack">${!state.net.hubActive && state.net.role !== "client" ? btn("play-again", "Another Sunday?", true) : ""}${!state.net.hubActive ? btn("title", "Back to the front door") : '<p class="note">Shift complete. Your squad’s score is with the Hub.</p>'}</div>`;
			footer = `<span>${s.score >= (state.best || 0) ? "A NEW PERSONAL BEST!" : `PERSONAL BEST ${fmt(state.best)}`}</span><span>THANK YOU FOR PLAYING</span>`;
		} else if (screen === "gameover") {
			eyebrow = "THE ONE THAT GOT AWAY";
			title = "OH, CRUMBS.";
			lead =
				"Bertie’s made a meal of this shift. Dust off that helmet and give it another go.";
			body = `<div class="result-stats"><div><small>SCORE</small><b>${fmt(state.snapshot.score)}</b></div><div><small>CASES CLOSED</small><b>${state.snapshot.captures} / 3</b></div></div><div class="menu-stack">${!state.net.hubActive && state.net.role !== "client" ? btn("retry", "Retry this case", true) : ""}${!state.net.hubActive ? btn("title", "Back to the front door") : '<p class="note">The Hub has your result. Better luck next shift!</p>'}</div>`;
			footer = `<span>Hint: take the lift to get ahead. Whistle to close the gap.</span>`;
		} else if (screen === "ended") {
			eyebrow = "AI HUB SESSION";
			title = "SHIFT FINISHED.";
			lead =
				this.endReason === "host-left"
					? "The host left the squad. The Hub will take it from here."
					: "Your squad is off the clock. The Hub has the results.";
			body = '<p class="note">Thanks for keeping the mall in one piece.</p>';
		}
		return `<section class="overlay"><div class="panel ${wide ? "wide" : ""}" role="dialog" aria-label="${esc(title)}"><span class="panel-decor" aria-hidden="true">✦</span><p class="eyebrow">${eyebrow}</p><h2>${title}</h2>${lead ? `<p class="lead">${lead}</p>` : ""}<div class="panel-body">${body}</div>${footer ? `<div class="panel-footer">${footer}</div>` : ""}</div></section>`;
	}
	slider(key, label, value, min, max, step, unit, type) {
		return `<div class="setting"><label for="${type}-${key}">${label}</label><input id="${type}-${key}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-${type}="${key}" data-unit="${unit}" aria-label="${label}"><output>${Number(value.toFixed(2))}${unit}</output></div>`;
	}
	toggle(key, label, value, tune = false) {
		return `<div class="setting"><label>${label}</label>${btn(`${tune ? "tune-toggle" : "setting-toggle"}-${key}`, value)}</div>`;
	}
	updateOutput(input) {
		const output = input.parentElement.querySelector("output");
		if (output)
			output.textContent = `${Number(Number(input.value).toFixed(2))}${input.dataset.unit || ""}`;
	}
	rosterHTML(roster) {
		return roster
			.map(
				(p) =>
					`<span><i style="background:${esc(p.color)}"></i>${esc(p.name)}</span>`,
			)
			.join("");
	}
	updateRoom(message, roster) {
		if (message) this.roomStatus = message;
		const status = document.querySelector("#room-status"),
			list = document.querySelector("#roster");
		if (status) status.textContent = this.roomStatus;
		if (list && roster) list.innerHTML = this.rosterHTML(roster);
	}
	aboutPages() {
		const credits = window.__CREDITS__,
			pages = [];
		const labels = {
			date: "Date",
			source: "Source",
			plan: "Plan supplied",
			genre: "Genre",
			perspective: "Perspective",
			tech: "Technology",
			artDirection: "Art direction",
			animation: "Animation",
			audio: "Audio",
			online: "Online",
			testing: "Testing",
			research: "Research",
			environment: "Environment",
			model: "Model",
			usage: "Usage",
		};
		const entries = Object.entries(credits.sourceInformation);
		for (let i = 0; i < entries.length; i += 6)
			pages.push({
				title: "SOURCE INFORMATION",
				body: `<div class="credits-grid">${entries
					.slice(i, i + 6)
					.map(
						([k, v]) =>
							`<div class="credit"><b>${labels[k] || k}</b><p>${esc(v)}</p></div>`,
					)
					.join(
						"",
					)}</div>${i === 12 ? '<p class="note">An original tribute to Garry Kitchen’s 1983 Activision game. All characters, models, animation, music and effects in this demo were made in code. Three.js (MIT), Rapier (Apache-2.0), PeerJS (MIT), Barlow Condensed and DM Sans (SIL Open Font License). AI Hub session client by michaelcrosato.</p>' : ""}`,
			});
		for (const [key, title] of [
			["testingFeedback", "TESTING FEEDBACK"],
			["engineFeedback", "ENGINE FEEDBACK"],
			["promptFeedback", "PROMPT FEEDBACK"],
		]) {
			const values = credits[key];
			for (let i = 0; i < values.length; i += 3)
				pages.push({
					title,
					body: `<div class="feedback-list">${values
						.slice(i, i + 3)
						.map(
							(text, j) =>
								`<p><b>${feedbackQuestions[key][i + j]}</b>${esc(text)}</p>`,
						)
						.join("")}</div>`,
				});
		}
		return pages;
	}
	focus(element) {
		if (!element || element.disabled) return;
		this.root.querySelectorAll(".focused").forEach((e) => {
			e.classList.remove("focused");
		});
		element.classList.add("focused");
		this.focused = element;
		if (document.activeElement !== element)
			element.focus({ preventScroll: true });
		element.scrollIntoView({ block: "nearest", inline: "nearest" });
	}
	navigate(dir) {
		if (dir === "back") {
			this.onAction("back");
			return;
		}
		const choices = [
			...this.root.querySelectorAll("button:not(:disabled),input"),
		].filter((el) => el.getBoundingClientRect().width);
		if (!choices.length) return;
		const current = choices.includes(this.focused) ? this.focused : choices[0];
		if (dir === "accept") {
			if (current.id === "join-code") this.act("join");
			else current.click();
			return;
		}
		if (
			current.id === "join-code" &&
			["left", "right", "up", "down"].includes(dir)
		) {
			let text = current.value.padEnd(5, "0"),
				cursor = Math.min(4, current.selectionStart || 0);
			if (dir === "left") cursor = Math.max(0, cursor - 1);
			else if (dir === "right") cursor = Math.min(4, cursor + 1);
			else {
				const v = (Number(text[cursor]) + (dir === "up" ? 1 : 9)) % 10;
				text = text.slice(0, cursor) + v + text.slice(cursor + 1);
				current.value = text;
			}
			current.setSelectionRange(cursor, cursor + 1);
			return;
		}
		if (current.type === "range" && ["left", "right"].includes(dir)) {
			dir === "left" ? current.stepDown() : current.stepUp();
			current.dispatchEvent(new Event("input", { bubbles: true }));
			return;
		}
		if (dir === "next") {
			this.focus(choices[(choices.indexOf(current) + 1) % choices.length]);
			return;
		}
		const r = current.getBoundingClientRect(),
			x = r.x + r.width / 2,
			y = r.y + r.height / 2;
		let best = null,
			cost = Infinity;
		for (const el of choices) {
			if (el === current) continue;
			const q = el.getBoundingClientRect(),
				dx = q.x + q.width / 2 - x,
				dy = q.y + q.height / 2 - y;
			const forward =
				dir === "up" ? -dy : dir === "down" ? dy : dir === "left" ? -dx : dx;
			if (forward <= 7) continue;
			const side = dir === "up" || dir === "down" ? Math.abs(dx) : Math.abs(dy);
			const score = forward + side * 2.8;
			if (score < cost) {
				cost = score;
				best = el;
			}
		}
		if (best) this.focus(best);
	}
	toast(message, seconds = 2.4) {
		const e = document.querySelector("#toast");
		e.textContent = message;
		e.hidden = false;
		this.toastUntil = performance.now() + seconds * 1000;
	}
	speech(message) {
		const e = document.querySelector("#speech");
		e.textContent = message;
		e.hidden = false;
		this.speechUntil = performance.now() + 2100;
	}
	update(s, localId, attract = false, paused = false) {
		const now = performance.now();
		const hud = document.querySelector("#hud");
		hud.hidden =
			["title", "room", "partners", "join", "ended"].includes(this.screen) ||
			!s;
		if (!s) return;
		document.querySelector("#case-label").textContent =
			`CASE ${String(s.caseIndex + 1).padStart(2, "0")} / 03`;
		document.querySelector("#case-name").textContent = CASES[s.caseIndex].name;
		document.querySelector("#clock").textContent = Math.ceil(
			Math.max(0, s.clock),
		);
		document
			.querySelector(".hud-clock")
			.classList.toggle("urgent", s.clock < 15);
		document.querySelector("#score").textContent = String(
			Math.round(s.score),
		).padStart(6, "0");
		document.querySelector("#badges").innerHTML = Array.from(
			{ length: 3 },
			(_, i) => `<span style="opacity:${i < s.badges ? 1 : 0.2}">✦</span>`,
		).join(" ");
		const intro = document.querySelector("#case-intro");
		intro.hidden = !(
			s.intro > 0 &&
			s.state === "playing" &&
			!attract &&
			!paused
		);
		if (!intro.hidden && this.introCase !== s.caseIndex) {
			this.introCase = s.caseIndex;
			intro.innerHTML = `<small>CASE ${s.caseIndex + 1} · OFFICER, YOU’RE UP!</small><b>${CASES[s.caseIndex].name}</b><span>${CASES[s.caseIndex].note}</span>`;
		}
		if (now > (this.toastUntil || 0) || paused)
			document.querySelector("#toast").hidden = true;
		if (now > (this.speechUntil || 0) || paused)
			document.querySelector("#speech").hidden = true;
		document.querySelector("#attract-label").hidden = !attract;
		const p = s.players.find((p) => p.id === localId) || s.players[0];
		if (p) {
			const w = document.querySelector("#whistle-meter");
			w.querySelector("i").style.width = `${(1 - p.whistle / 8) * 100}%`;
			w.querySelector("b").textContent =
				p.whistle > 0 ? `${Math.ceil(p.whistle)}s` : "READY";
			document.querySelector("#floor-name").textContent = [
				"GROUND",
				"FLOOR 1",
				"FLOOR 2",
				"ROOF",
			][p.floor];
			let context = "",
				text = "";
			if (!paused && !attract && s.state === "playing") {
				if (p.ride?.type === "lift" && s.lift.phase === "dwell") {
					context = "context-exit";
					text = `${this.glyph("duck")} Step out · ${s.lift.floor === 0 ? "Ground" : `Floor ${s.lift.floor}`}`;
				} else if (
					!p.ride &&
					p.floor < 3 &&
					Math.abs(p.x) < 1.65 &&
					s.lift.floor === p.floor &&
					s.lift.open > 0.7
				) {
					context = "context-lift";
					text = `${this.glyph("lift")} Ride the lift`;
				} else if (
					this.kind === "touch" &&
					!p.ride &&
					p.floor === s.crook.floor &&
					Math.abs(p.x - s.crook.x) <= 9 &&
					p.whistle <= 0
				) {
					context = "context-whistle";
					text = "♪ Whistle!";
				}
			}
			const action = document.querySelector("#context-action");
			action.hidden = !context;
			if (context !== this.contextKind || text !== this.contextText) {
				this.contextKind = context;
				this.contextText = text;
				action.innerHTML = text ? `<button class="btn">${text}</button>` : "";
			}
		}
		this.drawMap(s, localId);
	}
	drawMap(s, localId) {
		const c = this.map,
			w = 660,
			h = 250,
			left = 35,
			right = w - 32,
			px = (x) => left + ((x + 27) / 54) * (right - left),
			py = (floor) => 214 - floor * 60;
		c.clearRect(0, 0, w, h);
		c.lineWidth = 3;
		c.font = "bold 18px sans-serif";
		c.textAlign = "left";
		for (let f = 0; f < 4; f++) {
			const y = py(f);
			c.strokeStyle = "#76948e";
			c.beginPath();
			c.moveTo(left, y);
			c.lineTo(right, y);
			c.stroke();
			c.fillStyle = "#a2b1ab";
			c.fillText(f === 0 ? "G" : String(f), 3, y + 7);
			if (f < 3) {
				const dir = f % 2 ? -1 : 1;
				c.strokeStyle = "#cbb58b";
				c.beginPath();
				c.moveTo(px(dir * 20), y);
				c.lineTo(px(dir * 24), py(f + 1));
				c.stroke();
			}
		}
		c.strokeStyle = "#a8a598";
		c.lineWidth = 1;
		c.setLineDash([4, 7]);
		c.beginPath();
		c.moveTo(px(0), py(0));
		c.lineTo(px(0), py(2));
		c.stroke();
		c.setLineDash([]);
		c.fillStyle = "#facb63";
		c.fillRect(px(0) - 9, py(s.lift.y / 6) - 17, 18, 17);
		for (const l of s.loot)
			if (!l.taken) {
				c.fillStyle = "#d4b76a";
				c.fillRect(px(l.x) - 2, py(l.floor) - 6, 4, 4);
			}
		c.fillStyle = "#ee7952";
		c.beginPath();
		c.arc(px(s.crook.x), py(s.crook.y / 6) - 9, 8, 0, Math.PI * 2);
		c.fill();
		for (const p of s.players) {
			c.fillStyle =
				p.id === localId
					? "#9fd9ca"
					: ["#6aabc2", "#80b8aa", "#ee956d", "#c696b2"][p.id % 4];
			c.beginPath();
			c.arc(px(p.x), py(p.y / 6) - 8, p.id === localId ? 7 : 5, 0, Math.PI * 2);
			c.fill();
			if (p.id === localId) {
				c.strokeStyle = "#fff0cd";
				c.lineWidth = 2;
				c.stroke();
			}
		}
	}
}
