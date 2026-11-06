import {
	bitCount,
	DEFAULTS,
	FLOOR_NAMES,
	GUIDE,
	itemName,
	ROOMS,
} from "./data.js";
import credits from "./metadata.js";
export const esc = (x) =>
	String(x).replace(
		/[&<>"']/g,
		(c) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				c
			],
	);
const btn = (text, action, arg = "", primary = false) =>
	`<button class="menu-button nav${primary ? " primary" : ""}" data-action="${action}" data-arg="${esc(arg)}">${text}<small aria-hidden="true">›</small></button>`;
export class HouseUI {
	constructor(app) {
		this.app = app;
		this.root = document.querySelector("#screen");
		this.page = null;
		this.index = 0;
		this.guidePage = 0;
		this.aboutPage = 0;
		this.mapFloor = 0;
		this.backTo = "title";
		this.root.addEventListener("click", (e) => {
			const b = e.target.closest("[data-action]");
			if (b) {
				app.activity();
				app.audio.unlock();
				this.handle(b.dataset.action, b.dataset.arg);
			}
		});
		this.root.addEventListener("pointerover", (e) => {
			const b = e.target.closest(".nav");
			if (b) {
				const i = this.navs().indexOf(b);
				if (i >= 0) this.focus(i);
			}
		});
		this.root.addEventListener("input", (e) => {
			const el = e.target;
			if (el.dataset.setting) {
				app.settings[el.dataset.setting] = +el.value;
				app.saveSettings();
				app.audio.volumes();
				el.parentElement.querySelector("output").textContent =
					`${Math.round(el.value * 100)}%`;
			}
			if (el.dataset.tune) {
				app.model.tuning[el.dataset.tune] = +el.value;
				el.parentElement.querySelector("output").textContent = (+el.value)
					.toFixed(el.step === ".1" ? 1 : 2)
					.replace(/\.00$/, "");
			}
			if (el.id === "join-code")
				el.value = el.value.replace(/\D/g, "").slice(0, 4);
		});
	}
	glyph(action) {
		const a = this.app;
		const map = {
			move: ["WASD", "L", "L", ""],
			interact: ["E", "×", "A", "cross"],
			match: ["Space", "□", "X", "square"],
			drop: ["Q", "○", "B", "circle"],
			map: ["Tab", "△", "Y", "triangle"],
			pause: ["Esc", "≡", "≡", ""],
			sprint: ["Shift", "R2", "RT", ""],
			confirm: ["Enter", "×", "A", "cross"],
			back: ["Esc", "○", "B", "circle"],
		};
		const v = map[action] || map.interact;
		const attr = `data-glyph="${action}"`;
		if (a.inputType === "touch")
			return `<span class="glyph" ${attr}>${action === "move" ? "Drag" : "Tap"}</span>`;
		if (a.inputType === "pad")
			return `<span class="glyph pad ${v[3]}" ${attr}>${a.settings.glyphs === "xbox" ? v[2] : v[1]}</span>`;
		const label =
			a.inputType === "mouse" && ["interact", "confirm"].includes(action)
				? "LMB"
				: a.inputType === "mouse" && action === "match"
					? "RMB"
					: v[0];
		return `<span class="glyph" ${attr}>${label}</span>`;
	}
	refreshPrompts() {
		for (const el of document.querySelectorAll("[data-glyph]"))
			el.outerHTML = this.glyph(el.dataset.glyph);
		const footer = this.root.querySelector(".title-footer>span");
		if (footer)
			footer.innerHTML =
				this.prompt("confirm", "Enter") +
				" &nbsp; · &nbsp; " +
				(this.app.inputType === "pad"
					? "D-pad to choose"
					: "Arrows to choose · click to enter");
	}
	prompt(action, text) {
		return `<span class="prompt">${this.glyph(action)}<span>${text}</span></span>`;
	}
	navs() {
		return [...this.root.querySelectorAll(".nav:not([disabled])")];
	}
	focus(i) {
		const ns = this.navs();
		if (!ns.length) return;
		this.index = (i + ns.length) % ns.length;
		ns.forEach((n, j) => {
			n.classList.toggle("focused", j === this.index);
			if (n.tagName === "INPUT")
				n.parentElement.classList.toggle("focused", j === this.index);
		});
		ns[this.index].scrollIntoView({ block: "nearest", behavior: "instant" });
	}
	navigate(dx, dy) {
		const ns = this.navs(),
			n = ns[this.index];
		if (n?.type === "range" && dx) {
			n.value = +n.value + dx * (+n.step || 0.01);
			n.dispatchEvent(new Event("input", { bubbles: true }));
			return;
		}
		if (n?.id === "join-code" && dy) {
			const v = (parseInt(n.value || "0", 10) + dy + 10000) % 10000;
			n.value = String(v).padStart(4, "0");
			return;
		}
		this.focus(this.index + (dy || dx));
	}
	confirm() {
		const n = this.navs()[this.index];
		if (n?.tagName === "BUTTON") n.click();
		else if (n?.id === "join-code") this.handle("join");
	}
	render(html, page) {
		this.page = page;
		this.app.screen = page;
		this.root.innerHTML = html;
		this.index = 0;
		this.focus(0);
	}
	panel(title, body, { eyebrow = "", className = "", actions = "" } = {}) {
		return `<section class="panel ${className}">${eyebrow ? `<div class="eyebrow">${eyebrow}</div>` : ""}<h2>${title}</h2>${body}${actions ? `<div class="actions">${actions}</div>` : ""}</section>`;
	}
	title() {
		this.app.screen = "title";
		this.render(
			`<section class="title-screen"><div class="eyebrow">A matchlight mystery</div><h1 class="title-lockup" aria-label="The Fright House"><span class="the">The</span><span class="big">Fright</span><span class="big house">House</span></h1><p class="tagline">Some houses have good bones.<br>This one keeps them.</p><div class="menu-stack">${btn("Enter the house", "play", "", true)}${btn("A word of warning", "guide")}${btn("Race with ghosts", "online")}${btn("Settings", "settings")}${btn("About & credits", "about")}</div><div class="edition">EST. 1982 · RE-IMAGINED 2026</div><div class="tour-label"><b>THE RESIDENTS ARE EXPECTING YOU</b>Four floors. Three pieces.<br>One free hand.</div><div class="title-footer"><span>${this.prompt("confirm", "Enter")} &nbsp; · &nbsp; ${this.app.inputType === "pad" ? "D-pad to choose" : "Arrows to choose · click to enter"}</span><span>ILLUSTRATED IN THE DARK</span></div></section>`,
			"title",
		);
	}
	clear() {
		this.page = null;
		this.app.screen = null;
		this.root.innerHTML = "";
	}
	pause() {
		const hub = this.app.net.viaHub;
		this.render(
			this.panel(
				"Take a breath.",
				`<div class="menu-stack">${btn("Back to the house", "resume", "", true)}${btn("The house map", "map")}${btn("A word of warning", "guide")}${btn("Settings", "settings")}${btn("Developer tools", "dev")}${hub ? "" : btn("Start a fresh search", "restart") + btn("Return to the door", "title")}</div>`,
				{ eyebrow: "The house can wait", className: "compact" },
			),
			"pause",
		);
	}
	guide() {
		const p = GUIDE[this.guidePage];
		const controls =
			this.guidePage === 0
				? `<div class="control-grid"><div>${this.glyph("move")} Move through the house</div><div>${this.prompt("interact", "Take / swap / stairs")}</div><div>${this.prompt("match", "Strike a match")}</div><div>${this.prompt("map", "Open the map")}</div><div>${this.prompt("drop", "Put it down")}</div><div>${this.prompt("sprint", "Hurry, noisily")}</div></div>`
				: "";
		this.render(
			this.panel(
				p.title,
				`<span class="guide-number">0${this.guidePage + 1}</span><p>${p.text}</p>${controls}<div class="guide-tip">${p.tip}</div><p class="fine">Mouse: click the floor or an object to walk there; right-click for a match.<br>Touch: drag to move. Matches and nearby objects are assisted; tap the right side for a fresh match.</p>`,
				{
					eyebrow: "A word of warning",
					actions:
						btn("Back", "guideback") +
						btn(
							this.guidePage < 3 ? "Next warning" : "I dare enter",
							"guidenext",
							"",
							true,
						),
				},
			),
			"guide",
		);
	}
	settings() {
		const s = this.app.settings;
		const slider = (label, key) =>
			`<div class="settings-row"><label for="set-${key}">${label}</label><input class="nav" id="set-${key}" aria-label="${label}" type="range" min="0" max="1" step=".01" value="${s[key]}" data-setting="${key}"><output>${Math.round(s[key] * 100)}%</output></div>`;
		this.render(
			this.panel(
				"Set the mood.",
				slider("Master volume", "master") +
					slider("Music", "music") +
					slider("Sound & voices", "effects") +
					`<div class="settings-row wide"><label>Controller symbols</label><button class="choice nav" data-action="glyphs">${s.glyphs === "ps" ? "PlayStation · × ○ □ △" : "Xbox · A B X Y"}</button></div><div class="settings-row wide"><label>House mood <small>(next search)</small></label><button class="choice nav" data-action="difficulty">${{ candlelit: "Candlelit · gentler", midnight: "Midnight · original", nightmare: "Nightmare · restless" }[s.difficulty]}</button></div><div class="settings-row wide"><label>Reduced flashes</label><button class="choice nav" data-action="flashes">${s.reduced ? "On" : "Off"}</button></div><div class="settings-row wide"><label>Fill the screen</label><button class="choice nav" data-action="fullscreen">${document.fullscreenElement ? "Leave fullscreen" : "Fullscreen"}</button></div><p class="fine">Nightmare: faster residents; the ghost ignores the scepter. All moods start with nine chances.</p>`,
				{
					eyebrow: "Make yourself uncomfortable",
					actions: btn("Back", "back", "", true),
				},
			),
			"settings",
		);
	}
	map() {
		const m = this.app.model,
			f = this.mapFloor;
		const order = [2, 3, 4, 1, 0, 5];
		const cards = order
			.map((n) => {
				const r = ROOMS[f * 6 + n],
					known = m.visited.has(r.id) || m.cheats.reveal;
				const items = m.items.filter(
					(i) => i.room === r.id && (m.seen.has(i.id) || m.cheats.reveal),
				);
				const labels = items
					.map((i) =>
						i.type === "key"
							? "⚿ Key"
							: i.type === "scepter"
								? "☾ Scepter"
								: `♜ Urn piece${bitCount(i.parts) > 1 ? "s" : ""}`,
					)
					.join(" · ");
				const locked = Object.entries(r.neighbors)
					.filter(([_d, id]) =>
						m.locks.has([r.id, id].sort((a, b) => a - b).join("-")),
					)
					.map(([d]) => d[0].toUpperCase())
					.join(" / ");
				return `<div class="map-room${known ? "" : " unknown"}${m.room === r.id ? " current" : ""}"><b>${known ? r.name : "Unvisited room"}</b><span>${known ? labels : "?"}</span><span class="map-connect">${known ? (r.up ? "↑ Upstairs " : r.down ? "↓ Downstairs " : "") + (locked ? `⚿ ${locked} locked` : "") : ""}</span>${m.room === r.id ? '<span class="you">You are here</span>' : ""}</div>`;
			})
			.join("");
		this.render(
			this.panel(
				"The house remembers.",
				`<div class="map-floor">Floor ${f + 1} / 4 · ${FLOOR_NAMES[f]}</div><div class="map-rooms">${cards}</div><div class="map-legend">${m.visited.size} / 24 rooms visited · Objects appear after you see them by matchlight.<br>The completed urn belongs at the front door on Floor 1.</div><div class="actions map-controls">${btn("← Lower floor", "mapfloor", -1)}${btn("Close map", "mapclose", "", true)}${btn("Upper floor →", "mapfloor", 1)}</div>`,
				{ eyebrow: "A useful thing to know", className: "map-panel" },
			),
			"map",
		);
	}
	dev() {
		const m = this.app.model;
		if (this.app.net.viaHub) {
			this.render(
				this.panel(
					"A fair fright.",
					`<p>Live developer tools are available in solo play. This race is governed by AI Hub.</p>`,
					{
						eyebrow: "Developer tools",
						actions: btn("Back", "pause", "", true),
					},
				),
				"dev",
			);
			return;
		}
		const sliders = [
			["Walking speed", "speed", 2, 8, 0.1],
			["Resident speed", "enemySpeed", 0.2, 2, 0.1],
			["Match seconds", "matchDuration", 3, 30, 1],
			["Matchlight radius", "lightRadius", 2, 10, 0.1],
			["Time scale", "timeScale", 0.25, 3, 0.05],
		]
			.map(
				([name, k, min, max, step]) =>
					`<div class="settings-row"><label for="tune-${k}">${name}</label><input class="nav" id="tune-${k}" aria-label="${name}" type="range" min="${min}" max="${max}" step="${step}" value="${m.tuning[k]}" data-tune="${k}"><output>${m.tuning[k]}</output></div>`,
			)
			.join("");
		this.render(
			this.panel(
				"Pull the strings.",
				`<div class="dev-title"><span>Changes take effect immediately · ${this.app.view.backend}</span></div><div class="dev-sliders">${sliders}</div><div class="dev-grid">${["invincible", "noclip", "reveal", "freeze", "pilot"].map((k) => btn(`${{ invincible: "Infinite nerve", noclip: "Walk through walls", reveal: "Reveal objects", freeze: "Freeze residents", pilot: "House tour AI" }[k]}: ${m.cheats[k] ? "ON" : "off"}`, "cheat", k)).join("")}${btn("Restore nine chances", "restore")}${btn("Restore full urn", "urn")}${btn("Reset tuning", "resetdev")}</div><p class="fine" style="margin:14px 0 5px">Jump to a floor, then a room. Unlocks and objects persist.</p><div class="dev-rooms">${[0, 1, 2, 3].map((f) => btn(`Floor ${f + 1}`, "jumpfloor", f)).join("")}</div><div class="dev-rooms">${ROOMS.slice(
					Math.floor(m.room / 6) * 6,
					Math.floor(m.room / 6) * 6 + 6,
				)
					.map((r) => btn(r.name.replace("The ", ""), "jumproom", r.id))
					.join("")}</div>`,
				{
					eyebrow: "Developer tools",
					actions:
						btn("Back to pause", "pause") + btn("Resume", "resume", "", true),
				},
			),
			"dev",
		);
	}
	online() {
		this.render(
			this.panel(
				"Race with ghosts.",
				`<p>Search the same house on separate devices. You can see the other explorers, but their ghosts cannot touch your world.</p><p class="fine">Fastest escape wins. If time runs out, urn pieces and rooms explored decide the race. Up to four explorers. Share a four-digit room code with friends.</p><div class="menu-stack">${btn("Create a room", "host", "", true)}${btn("Join a room", "joinform")}${btn("Back", "title")}</div>`,
				{ eyebrow: "A little bad company", className: "" },
			),
			"online",
		);
	}
	joinForm() {
		this.render(
			this.panel(
				"Which house?",
				`<p>Enter your host’s four-digit room code.</p><input class="code-entry nav" id="join-code" inputmode="numeric" maxlength="4" aria-label="Four digit room code" value="0000"><p class="fine">Keyboard: type the code. Controller: up/down changes the number; left/right changes it by a hundred.</p>`,
				{
					eyebrow: "Join a ghost race",
					className: "compact",
					actions: btn("Back", "online") + btn("Join house", "join", "", true),
				},
			),
			"join",
		);
	}
	lobby() {
		const n = this.app.net;
		const seats = n.roster
			.map(
				(p) =>
					`<div class="race-seat" style="border-color:${esc(p.color)}"><span>${esc(p.name)}${p.id === n.me ? " · you" : ""}</span><small>At the door</small></div>`,
			)
			.join("");
		this.render(
			this.panel(
				n.host ? "The door is open." : "Waiting at the door.",
				`<div class="room-code">${esc(n.code)}</div><div class="race-standings">${seats || '<div class="race-seat">Finding the house…</div>'}</div><p class="fine" id="network-status">${n.internet ? "Internet room ready." : "Opening the internet room. Same-browser players may join now."} ${n.host ? "Share the code, then begin." : "Your host will begin the race."}</p>`,
				{
					eyebrow: "Ghost race · up to four explorers",
					className: "compact",
					actions:
						(n.host ? btn("Begin the race", "racestart", "", true) : "") +
						btn("Leave room", "leaveroom"),
				},
			),
			"lobby",
		);
	}
	results() {
		const m = this.app.model,
			win = m.result === "win";
		let record = "";
		try {
			const best = +localStorage.getItem("fright-best") || 0;
			if (win && m.score() > best) {
				localStorage.setItem("fright-best", m.score());
				record = "A new house record.";
			} else if (win && best) record = `House record: ${best.toLocaleString()}`;
		} catch {}
		const standings = this.app.net.active ? this.standings() : "";
		this.render(
			this.panel(
				win ? "You kept your nerve." : "The house keeps you.",
				`<div class="result-sigil">${win ? "♜" : "◉ ◉"}</div><p>${win ? "The urn is whole. The front door opens.<br>Behind you, someone begins to count again." : "Nine chances. Twenty-four rooms.<br>The residents have found room for one more."}</p><div class="result-stats"><div><strong>${m.score().toLocaleString()}</strong><span>Score</span></div><div><strong>${Math.floor(m.time / 60)}:${String(Math.floor(m.time % 60)).padStart(2, "0")}</strong><span>Time</span></div><div><strong>${m.matches}</strong><span>Matches</span></div></div>${standings}<p class="fine">${record}</p>`,
				{
					eyebrow: win ? "An excellent time to leave" : "An unfortunate end",
					className: "result-panel",
					actions: this.app.net.viaHub
						? ""
						: btn("Another visit", "restart", "", true) +
							btn("Back to the door", "title"),
				},
			),
			"result",
		);
	}
	standings() {
		const n = this.app.net;
		const ordered = [...n.roster].sort((a, b) => {
			const ra = n.results.get(a.id),
				rb = n.results.get(b.id);
			const fa = ra?.time != null,
				fb = rb?.time != null;
			if (fa && fb) return ra.time - rb.time;
			if (fa !== fb) return fa ? -1 : 1;
			return (
				(rb?.score || n.latest.get(b.id)?.score || 0) -
				(ra?.score || n.latest.get(a.id)?.score || 0)
			);
		});
		return `<div class="race-standings">${ordered
			.map((p, i) => {
				const r = n.results.get(p.id);
				return `<div class="race-seat" style="border-color:${esc(p.color)}"><span>${i + 1}. ${esc(p.name)}${p.id === n.me ? " · you" : ""}</span><small>${r ? (r.time !== null ? `${(r.time / 1000).toFixed(1)}s · escaped` : `${r.score} points`) : "Still searching"}</small></div>`;
			})
			.join("")}</div>`;
	}
	about() {
		const s = credits.sourceInformation;
		const groups = [
			[
				"Source Information",
				["date", "source", "plan", "genre", "perspective", "research"],
			],
			[
				"Source Information · craft",
				["tech", "artDirection", "animation", "audio", "online", "testing"],
			],
			["Source Information · credits", ["environment", "model", "usage"]],
		];
		let heading, body;
		if (this.aboutPage < 3) {
			[heading] = groups[this.aboutPage];
			body =
				'<div class="about-metadata">' +
				groups[this.aboutPage][1]
					.map(
						(k) =>
							`<p><strong>${k.replace(/([A-Z])/g, " $1")}</strong>${esc(s[k])}</p>`,
					)
					.join("") +
				"</div>";
			if (this.aboutPage === 2)
				body += `<p>Original game by Atari. This is an original, unofficial re-imagining. All artwork, room dressing, animations, music, sound effects and gibberish voices were made in code for this game.</p><p class="fine">Research: Atari’s Haunted House publisher page, the original Atari game manual, official Three.js / Rapier documentation, and the AI Hub session protocol. Title selected by a system-random draw from fifty candidates.</p>`;
		} else {
			const keys = ["testingFeedback", "engineFeedback", "promptFeedback"],
				heads = ["Testing Feedback", "Engine Feedback", "Prompt Feedback"];
			const questions = [
				[
					"How many issues did testing catch?",
					"How many were critical or game breaking?",
					"Most helpful test",
					"Least helpful test",
				],
				[
					"What did you like most about the engine?",
					"Did you get stuck or guess wrong?",
					"Most important thing you built yourself",
					"Hardest part of using the engine",
					"What did you change in the engine?",
					"One thing you would change",
				],
				[
					"What did you like most about the prompt?",
					"What was confusing?",
					"What was hardest?",
					"What would you change?",
				],
			];
			const k = this.aboutPage - 3;
			heading = heads[k];
			body = credits[keys[k]]
				.map(
					(answer, i) =>
						`<p><span class="about-question">${questions[k][i]}</span>${esc(answer)}</p>`,
				)
				.join("");
		}
		this.render(
			this.panel(
				heading,
				`<div class="about-content">${body}</div><div class="about-nav">${btn("← Previous", "aboutprev")}<span>${this.aboutPage + 1} / 6 · Right stick / wheel to read</span>${btn("Next →", "aboutnext")}${btn("Back", "back")}</div>`,
				{ eyebrow: "The Fright House · made in the dark" },
			),
			"about",
		);
	}
	handle(action, arg) {
		const a = this.app,
			m = a.model;
		if (action === "play" || action === "restart") {
			a.startGame();
			return;
		}
		if (action === "resume") {
			a.resume();
			return;
		}
		if (action === "title") {
			a.toTitle();
			return;
		}
		if (action === "pause") {
			this.pause();
			return;
		}
		if (action === "guide") {
			this.backTo = this.page || "title";
			this.guidePage = 0;
			this.guide();
			return;
		}
		if (action === "guidenext") {
			if (++this.guidePage > 3) {
				if (a.mode === "title") a.startGame();
				else a.resume();
			} else this.guide();
			return;
		}
		if (action === "guideback") {
			if (this.guidePage > 0) {
				this.guidePage--;
				this.guide();
			} else this.goBack();
			return;
		}
		if (action === "settings") {
			this.backTo = this.page || "title";
			this.settings();
			return;
		}
		if (action === "about") {
			this.backTo = this.page || "title";
			this.aboutPage = 0;
			this.about();
			return;
		}
		if (action === "aboutprev" || action === "aboutnext") {
			this.aboutPage =
				(this.aboutPage + (action === "aboutnext" ? 1 : -1) + 6) % 6;
			this.about();
			return;
		}
		if (action === "back") {
			this.goBack();
			return;
		}
		if (action === "map") {
			this.mapFloor = ROOMS[m.room].floor;
			this.mapBack = this.page;
			this.map();
			return;
		}
		if (action === "mapfloor") {
			this.mapFloor = Math.max(0, Math.min(3, this.mapFloor + +arg));
			this.map();
			return;
		}
		if (action === "mapclose") {
			if (this.mapBack === "pause") this.pause();
			else a.resume();
			return;
		}
		if (action === "dev") {
			this.dev();
			return;
		}
		if (action === "cheat") {
			m.cheats[arg] = !m.cheats[arg];
			if (arg === "pilot") {
				m.cheats.invincible = m.cheats.pilot;
				m.cheats.noclip = m.cheats.pilot;
				a.resetPilot();
			}
			this.dev();
			return;
		}
		if (action === "restore") {
			m.lives = 9;
			m.scared = 0;
			a.toast("Nine chances. Use them well.");
			return;
		}
		if (action === "urn") {
			m.items = m.items.filter((i) => i.type !== "urn");
			m.drop();
			m.carried = {
				id: "dev-urn",
				type: "urn",
				parts: 7,
				room: m.room,
				x: m.x,
				z: m.z,
			};
			m.finalChase = true;
			a.toast("The urn is whole. The front door awaits.");
			return;
		}
		if (action === "resetdev") {
			m.tuning = { ...DEFAULTS };
			m.cheats = {
				invincible: false,
				noclip: false,
				reveal: false,
				freeze: false,
				pilot: false,
			};
			this.dev();
			return;
		}
		if (action === "jumpfloor" || action === "jumproom") {
			m.enter(action === "jumpfloor" ? +arg * 6 : +arg);
			this.dev();
			return;
		}
		if (action === "glyphs") {
			a.settings.glyphs = a.settings.glyphs === "ps" ? "xbox" : "ps";
			a.saveSettings();
			const idx = this.index;
			this.settings();
			this.focus(idx);
			return;
		}
		if (action === "difficulty") {
			const ds = ["candlelit", "midnight", "nightmare"];
			a.settings.difficulty = ds[(ds.indexOf(a.settings.difficulty) + 1) % 3];
			a.saveSettings();
			const idx = this.index;
			this.settings();
			this.focus(idx);
			return;
		}
		if (action === "flashes") {
			a.settings.reduced = !a.settings.reduced;
			a.saveSettings();
			const idx = this.index;
			this.settings();
			this.focus(idx);
			return;
		}
		if (action === "fullscreen") {
			if (document.fullscreenElement) document.exitFullscreen?.();
			else
				document.documentElement
					.requestFullscreen?.()
					.catch(() => a.toast("Fullscreen is unavailable in this browser."));
			return;
		}
		if (action === "online") {
			this.online();
			return;
		}
		if (action === "host") {
			a.net.hostRoom();
			this.lobby();
			return;
		}
		if (action === "joinform") {
			this.joinForm();
			return;
		}
		if (action === "join") {
			const code = this.root.querySelector("#join-code")?.value;
			if (code?.length !== 4) {
				a.toast("Four digits open the door.");
				return;
			}
			a.net.joinRoom(code);
			this.lobby();
			return;
		}
		if (action === "racestart") {
			a.net.start();
			return;
		}
		if (action === "leaveroom") {
			a.net.close();
			a.view.clearRemotes();
			this.online();
			return;
		}
	}
	goBack() {
		if (this.page === "pause") {
			this.app.resume();
			return;
		}
		if (this.page === "map") {
			this.handle("mapclose");
			return;
		}
		if (this.page === "dev") {
			this.pause();
			return;
		}
		if (this.page === "lobby") {
			this.handle("leaveroom");
			return;
		}
		if (this.page === "join") {
			this.online();
			return;
		}
		if (this.page === "online") {
			this.app.toTitle();
			return;
		}
		if (this.page === "guide" && this.guidePage > 0) {
			this.guidePage--;
			this.guide();
			return;
		}
		if (this.backTo === "pause" || this.app.mode === "play") this.pause();
		else this.title();
	}
	hud() {
		const a = this.app,
			m = a.model,
			r = ROOMS[m.room];
		document.querySelector("#floor-label").textContent =
			`Floor ${r.floor + 1} / 4 · ${FLOOR_NAMES[r.floor]}`;
		document.querySelector("#room-label").textContent = r.name;
		const parts = m.carried?.parts || 0;
		for (let i = 0; i < 3; i++)
			document
				.querySelector(`#urn${i}`)
				.classList.toggle("filled", !!(parts & (1 << i)));
		const nerve = document.querySelector("#nerve-dots");
		if (nerve.dataset.lives !== String(m.lives)) {
			nerve.dataset.lives = m.lives;
			nerve.innerHTML = Array.from(
				{ length: 9 },
				(_, i) => `<i class="${i < m.lives ? "" : "lost"}"></i>`,
			).join("");
		}
		document.querySelector("#hand-label").textContent = itemName(m.carried);
		document.querySelector("#hand-symbol").textContent = !m.carried
			? "∅"
			: m.carried.type === "key"
				? "⚿"
				: m.carried.type === "scepter"
					? "☾"
					: "♜";
		document.querySelector("#hand-hint").innerHTML = m.carried
			? this.prompt("drop", "Put it down")
			: "A little room for trouble";
		document.querySelector("#match-prompt").innerHTML = this.prompt(
			"match",
			m.match > 0 ? "Strike again" : "Strike a match",
		);
		document.querySelector("#match-bar").style.width =
			`${Math.min(100, (m.match / m.tuning.matchDuration) * 100)}%`;
		document.querySelector("#match-count").textContent =
			`${String(m.matches).padStart(2, "0")} MATCHES`;
		document.querySelector("#match-status").textContent =
			m.match > 0 ? `${Math.ceil(m.match)}s` : "UNLIT";
		document.querySelector("#hud-help").innerHTML =
			this.prompt("map", "House map") +
			this.prompt("sprint", "Hurry") +
			this.prompt("pause", "Pause");
		const c = m.context(),
			el = document.querySelector("#context-action");
		el.hidden = !c || !!a.screen || a.mode === "attract";
		if (c) el.innerHTML = this.prompt("interact", c.label);
		const objective =
			m.carried?.parts === 7
				? "The urn is whole. Return to the Foyer on Floor 1."
				: m.carried?.type === "key"
					? "Unlock the house. A key opens doors for good."
					: m.carried?.type === "scepter"
						? "The residents keep their distance. You need a free hand for the urn."
						: m.visited.size < 3
							? "Find the master key in the Cloakroom, through the left-hand door."
							: m.carried?.type === "urn"
								? "Join all three urn pieces, then return to the front door."
								: "Three urn pieces wait above. Your map remembers what you find.";
		document.querySelector("#objective").textContent = objective;
	}
}
