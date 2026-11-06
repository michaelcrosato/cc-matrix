import {
	ENGINE_FEEDBACK,
	PROMPT_FEEDBACK,
	SOURCE_INFO,
	TESTING_FEEDBACK,
} from "./credits.js";
import { CRUMBS } from "./world.js";

const $ = (s) => document.querySelector(s);
const esc = (s) =>
	String(s).replace(
		/[&<>"']/g,
		(c) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				c
			],
	);
const button = (text, action, cls = "") =>
	`<button class="menu-btn ${cls}" aria-label="${esc(text)}" data-act="${action}">${text}</button>`;
export class UI {
	constructor(game) {
		this.g = game;
		this.screen = $("#screen");
		this.current = "";
		this.parent = "title";
		this.focus = 0;
		this.creditsPage = 0;
		this.toastUntil = 0;
		this.screen.addEventListener("click", (e) => {
			const b = e.target.closest("[data-act]");
			if (b) this.activate(b.dataset.act);
		});
		this.screen.addEventListener("pointerover", (e) => {
			const b = e.target.closest("button,input,textarea");
			if (b) this.setFocus(this.items().indexOf(b), false);
		});
		this.screen.addEventListener("input", (e) => {
			if (e.target.dataset.setting) this.setSetting(e.target);
		});
		this.screen.addEventListener("focusin", (e) => {
			if (e.target.matches("button,input,textarea"))
				this.setFocus(this.items().indexOf(e.target), false);
		});
		$("#touch-menu").onclick = () => this.g.action("pause");
		$("#touch-interact").onpointerdown = (e) => {
			e.preventDefault();
			this.g.action("interact");
		};
		$("#touch-jump").onpointerdown = (e) => {
			e.preventDefault();
			this.g.controls.touch.jump = true;
			this.g.action("jump");
		};
		$("#touch-jump").onpointerup = () => {
			this.g.controls.touch.jump = false;
		};
		$("#touch-jump").onpointercancel = () => {
			this.g.controls.touch.jump = false;
		};
	}
	items() {
		return [
			...this.screen.querySelectorAll("button:not([disabled]),input,textarea"),
		];
	}
	setFocus(index, move = true) {
		const items = this.items();
		this.focus = Math.max(0, Math.min(items.length - 1, index));
		for (let i = 0; i < items.length; i++)
			items[i].classList.toggle("focused", i === this.focus);
		if (move) {
			items[this.focus]?.focus({ preventScroll: true });
			items[this.focus]?.scrollIntoView({ block: "nearest" });
		}
	}
	navigate(action) {
		const items = this.items(),
			b = items[this.focus];
		if (this.current === "about") {
			if (action === "left" || action === "right") {
				this.creditsPage =
					(this.creditsPage + (action === "right" ? 1 : 4)) % 5;
				this.show("about");
				this.setFocus(this.creditsPage + 1);
				return;
			}
			const panel = this.screen.querySelector(".panel");
			if (
				panel &&
				panel.scrollHeight > panel.clientHeight + 2 &&
				(action === "down" || (action === "up" && panel.scrollTop > 0))
			) {
				panel.scrollBy({
					top: (action === "down" ? 1 : -1) * panel.clientHeight * 0.45,
					behavior: "instant",
				});
				return;
			}
		}
		if (action === "up" || action === "down") {
			this.setFocus(
				(this.focus + (action === "down" ? 1 : -1) + items.length) %
					items.length,
			);
			this.g.audio.sfx("click");
			return;
		}
		if ((action === "left" || action === "right") && b?.type === "range") {
			b.value = Math.max(
				+b.min,
				Math.min(+b.max, +b.value + (action === "right" ? 1 : -1) * +b.step),
			);
			this.setSetting(b);
			return;
		}
		if (action === "confirm" || action === "jump" || action === "interact") {
			if (b?.tagName === "BUTTON") b.click();
			return;
		}
		if (action === "back" || action === "pause" || action === "map")
			this.back();
	}
	setSetting(input) {
		const key = input.dataset.setting,
			value = +input.value;
		const out = input.closest(".setting-row").querySelector("output");
		if (key in this.g.settings) {
			this.g.settings[key] = value;
			this.g.applySettings();
			if (out) out.textContent = `${Math.round(value * 100)}%`;
		} else {
			this.g.balance[key] = value;
			if (out) out.textContent = value.toFixed(1);
		}
		this.g.persistSettings();
	}
	slider(label, key, value, min, max, step = 0.1, percent = false) {
		return `<div class="setting-row"><label for="s-${key}">${label}</label><input id="s-${key}" type="range" data-setting="${key}" min="${min}" max="${max}" step="${step}" value="${value}" aria-label="${label}"><output>${percent ? `${Math.round(value * 100)}%` : value.toFixed(1)}</output></div>`;
	}
	shell(eyebrow, title, body, wide = false) {
		return `<section class="panel ${wide ? "wide" : ""}" data-panel="true" role="dialog" aria-label="${title}"><div class="panel-top"><span class="eyebrow">${eyebrow}</span><button class="back-btn" data-act="back">${this.g.glyph("back")} Back</button></div><h2>${title}</h2>${body}</section>`;
	}
	show(name, parent) {
		if (parent) this.parent = parent;
		this.current = name;
		this.screen.className = name === "title" ? "title" : "";
		this.screen.innerHTML = this.render(name);
		this.setFocus(name === "title" ? 0 : 1);
		this.updateTouch();
		$("#context").classList.add("hidden");
	}
	close() {
		this.current = "";
		this.screen.className = "hidden";
		this.screen.innerHTML = "";
		this.g.controls.keys.clear();
		this.updateTouch();
		$("#game").focus({ preventScroll: true });
	}
	render(name) {
		const g = this.g;
		if (name === "title")
			return `<section class="title-wrap" data-panel="true"><div class="edition">A small expedition · A very large hole</div><h1 class="game-title">Pitfall<span>The Lost Lunch</span></h1><p class="title-desc">Two friends. One golden lunchbox.<br><strong>All inconveniently underground.</strong></p><div class="title-actions">${g.saved ? button("Continue expedition", "continue", "primary") : ""}${button("Begin expedition", "solo", "primary")}${button("Bring a friend", "together")}${button("Field guide", "guide")}${button("Settings", "settings")}${button("About the expedition", "about")}</div><div class="title-foot"><span>✥ ${g.glyph("confirm")} Select</span><span>1–4 EXPLORERS</span><span>1984 SPIRIT · FRESH BOOTS</span></div></section><div class="title-mark">Fortune favours the well-fed.<span>An original cavern caper</span></div>`;
		if (name === "pause")
			return this.shell(
				"A moment to catch your hat",
				"Taking a breather",
				`${button("Back to the caverns", "resume", "primary")}${button("Field map", "map")}${button("Field guide", "guide")}${button("Settings", "settings")}${g.net.hub ? '<p class="fine">The expedition keeps moving while this menu is open.</p>' : button("Developer field kit", "dev")}${button("About the expedition", "about")}${!g.net.hub ? button("Save & return to title", "title") : ""}`,
			);
		if (name === "settings")
			return this.shell(
				"Make yourself comfortable",
				"Trail settings",
				`${this.slider("Music", "music", g.settings.music, 0, 1, 0.01, true)}${this.slider("Sound & gibberish", "effects", g.settings.effects, 0, 1, 0.01, true)}<div class="divider"></div>${button(`Controller glyphs: ${g.settings.xbox ? "Xbox · A B X Y" : "PlayStation · × ○ □ △"}`, "glyphs")}${button(`Camera motion: ${g.settings.steady ? "Steady" : "Cinematic"}`, "motion")}${button(document.fullscreenElement ? "Leave fullscreen" : "Enter fullscreen", "fullscreen")}<p class="fine">Audio is synthesized live. Music begins at 10%. Settings save on this device.</p>`,
			);
		if (name === "guide")
			return this.shell(
				"Notes from a previous, hungry explorer",
				"The field guide",
				`<div class="two-col"><div class="control-card"><h3>Find the picnic party</h3><p>Follow the chalk arrows. Rescue Mox in the Moss Gallery and Dr. Crumb beneath the river. The golden lunchbox waits high in Suncrumb Shrine.</p><p>Bring all three to the Picnic Express, then ring the bell at camp.</p></div><div class="control-card"><h3>Mind your boots</h3><p>${g.glyph("move")} Move · ${g.glyph("jump")} Jump</p><p>${g.glyph("vertical")} Climb & swim</p><p>${g.glyph("interact")} Talk, board & ring</p><p>${g.glyph("map")} Map · ${g.glyph("pause")} Pause</p></div><div class="control-card"><h3>The cavern is forgiving</h3><p>Touch a pennant to set your checkpoint. A bump from wildlife costs 100 points and sends you back. Every discovery stays found. No lives. No breath timer.</p></div><div class="control-card"><h3>Take the scenic route</h3><p>Climb the belfry for golden crumbs. Swim up to leave the river. At the well, board the balloon, steer toward the high ledge, then jump off. The updraft never runs out.</p></div></div><p class="fine">Couch explorer two: I J K L, Right Shift to jump, O to interact. A second controller works too. On touch, drag the left half to move; swipe up/down to climb or swim. The right half jumps; ✦ appears beside things you can use.</p>`,
				true,
			);
		if (name === "map")
			return this.shell(
				"A reasonably accurate expedition map",
				"Where the crumbs lead",
				`${this.map()}<div class="map-legend"><span style="color:var(--gold)">◆ You</span><span>⚑ Checkpoint</span><span style="color:var(--mint)">○ Companion</span></div><p class="fine">${g.objectiveText()} Golden crumbs are optional. The return trolley needs the whole picnic party.</p>`,
				true,
			);
		if (name === "together")
			return this.shell(
				"Good company. Questionable directions.",
				"Bring a friend",
				`<p>Share one expedition. Discoveries and checkpoints belong to everybody.</p>${button("Two explorers · same screen", "couch", "primary")}${button("Link two devices · direct co-op", "link")}<p class="fine">Couch: two controllers, or A D / Space / E and I J K L / Right Shift / O. Stay together; the camera follows both explorers. In AI Hub, 1–4 explorers each get their own view.</p>`,
			);
		if (name === "link")
			return this.shell(
				"A direct connection between two explorers",
				"Link two devices",
				`<p class="fine">Host: create an invitation and send it to your friend. Friend: paste it, join, and send the reply back. Host: paste the reply and connect. Uses WebRTC; a reachable peer connection is required.</p><textarea class="signal-text" id="signal-in" aria-label="Paste invitation or reply" placeholder="Paste invitation or reply here…"></textarea><div class="signal-actions">${button("Create invitation", "offer")}${button("Join / connect", "accept")}</div><textarea class="signal-text" id="signal-out" aria-label="Connection code to copy" readonly placeholder="Your connection code appears here"></textarea><div class="signal-actions">${button("Copy code", "copy")}${button("Cancel connection", "cancel-link")}</div><div class="status-line" id="link-status">No peer connected.</div><p class="fine">No account or game server. Signaling is exchanged manually. For managed online sessions, launch the game through AI Hub.</p>`,
				true,
			);
		if (name === "dev")
			return this.shell(
				"Developer mode · changes apply immediately",
				"The field kit",
				`<div class="dev-tools">${button(`Invincible: ${g.dev.safe ? "ON" : "OFF"}`, "safe")}${button(`Free flight: ${g.dev.fly ? "ON" : "OFF"}`, "fly")}${button("Warp: next landmark", "warp")}${button("Reveal all field notes", "reveal")}${button("Find the picnic party", "find-all")}${button("Collect all golden crumbs", "crumb-all")}</div><div class="divider"></div><div class="dev-sliders">${this.slider("Run speed", "speed", g.balance.speed, 3, 12)}${this.slider("Jump velocity", "jump", g.balance.jump, 7, 16)}${this.slider("Gravity", "gravity", g.balance.gravity, 12, 40, 0.5)}${this.slider("Swim speed", "swim", g.balance.swim, 2, 10)}${this.slider("Balloon lift", "lift", g.balance.lift, 1, 7)}${this.slider("Wildlife speed", "hazard", g.balance.hazard, 0.25, 2, 0.05)}</div>${button("Reset balance & assists", "defaults")}<p class="fine">Free flight uses movement + up/down. Pause then resume to test a change. Finding objectives preserves the final return trip.</p>`,
				true,
			);
		if (name === "about") return this.about();
		if (name === "victory")
			return this.shell(
				"All present. All peckish.",
				"A picnic, at last.",
				`<p>One very lost lunch. Two very relieved friends.<br>And a perfectly ordinary tale for the next campfire.</p><div class="result-score">${g.state.score.toLocaleString()}<span style="font-size:.7rem;font-family:Arial"> POINTS</span></div><div class="result-stats"><span>${g.state.crumbs.filter(Boolean).length} / 12 golden crumbs</span><span>${Math.floor(g.state.time / 60)}m ${Math.floor(g.state.time % 60)}s</span><span>${g.players.reduce((s, p) => s + p.hits, 0)} mishaps</span></div>${g.state.crumbs.every(Boolean) ? '<p style="color:var(--gold)">✥ Clean plate club · Every golden crumb recovered.</p>' : '<p class="fine">The belfry and river bed still hold a few golden crumbs for another expedition.</p>'}${!g.net.hub ? button("Another expedition", "solo", "primary") + button("Back to title", "title") : ""}${button("About the expedition", "about")}`,
			);
		if (name === "waiting")
			return this.shell(
				"AI Hub expedition",
				"The party is assembling",
				`<p>The expedition begins on the shared clock.</p><p class="fine">Rescue both friends, fetch the lunchbox, then ride home and ring the camp bell.</p>`,
			);
		if (name === "ended")
			return this.shell(
				"The expedition has ended",
				"Pencils down, explorers.",
				`<p>${g.state.won ? "The picnic party made it home." : "Every good expedition leaves a little to discover."}</p><p class="fine">The hub is preparing the next round.</p>`,
			);
		return "";
	}
	map() {
		const g = this.g,
			p = g.localPlayer(),
			px = 55 + (p?.x || 6) * 5,
			py = 350 - (p?.y || 0) * 7.2;
		const labels = [
			["Moss Gallery", 140, 285, 0],
			["Below River", 303, 320, 1],
			["Bat Belfry", 510, 193, 2],
			["Balloon Well", 600, 80, 3],
			["Suncrumb Shrine", 735, 115, 4],
		]
			.map(
				([name, x, y, i]) =>
					`<text x="${x}" y="${y}" opacity="${g.state.visited[i] ? 1 : 0.3}">${name}</text>`,
			)
			.join("");
		const crumbs = g.dev.reveal
			? CRUMBS.map(
					([x, y], i) =>
						`<circle class="map-crumb" cx="${55 + x * 5}" cy="${350 - y * 7.2}" r="4" fill="${g.state.crumbs[i] ? "#516f60" : "#efc66f"}"/>`,
				).join("")
			: "";
		return `<svg class="map-svg" viewBox="0 0 960 440" role="img" aria-label="Expedition map from camp through the river and balloon well to Suncrumb Shrine"><defs><pattern id="hatch" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M0 12L12 0" stroke="#37635c" stroke-width="1"/></pattern></defs><rect x="20" y="22" width="920" height="390" fill="url(#hatch)" opacity=".5"/><path d="M60 350H260L285 408H465L490 350H670V175H860" fill="none" stroke="#a4b48a" stroke-width="12" stroke-linejoin="round"/><path d="M280 355Q370 330 460 355V403H280Z" fill="#58b4aa" opacity=".6"/><path d="M520 350V278H575V227H620" fill="none" stroke="#7b9d83" stroke-width="6"/><path d="M855 170Q580 30 90 315" fill="none" stroke="#bda96c" stroke-width="2" stroke-dasharray="7 7"/><path d="M640 345V115" stroke="#eac477" stroke-width="2" stroke-dasharray="5 5"/><ellipse cx="640" cy="172" rx="22" ry="30" fill="#e7ad64" stroke="#16393b" stroke-width="3"/><path d="M628 194L631 211H648L652 194" fill="none" stroke="#ecd6a2" stroke-width="2"/><g fill="#e7d9ac" font-family="Georgia" font-size="22" font-style="italic"><text x="50" y="315">Camp</text>${labels}</g><g fill="#efc66f" font-family="Arial" font-size="22"><text x="91" y="350">⚑</text><text x="241" y="350">⚑</text><text x="480" y="350">⚑</text><text x="719" y="175">⚑</text></g>${crumbs}${[
			[234, 342],
			[438, 405],
			[805, 167],
		]
			.map(
				([x, y], i) =>
					`<circle cx="${x}" cy="${y}" r="9" fill="${g.state.found[i] ? "#efc66f" : "#8cddd0"}" stroke="#173b40" stroke-width="3"/>`,
			)
			.join(
				"",
			)}<path id="map-player" d="M${px} ${py - 12}l10 12-10 12-10-12Z" fill="#ffdc7d" stroke="#14383c" stroke-width="3"/><text x="42" y="60" fill="#8fbaa4" font-family="Arial" font-size="13" letter-spacing="3">NOT TO SCALE. MOSTLY.</text></svg>`;
	}
	about() {
		const tabs = ["Source", "Systems", "Testing", "Engine", "Prompt"];
		let body = "";
		if (this.creditsPage < 2) {
			const entries = Object.entries(SOURCE_INFO),
				part = this.creditsPage === 0 ? entries.slice(0, 8) : entries.slice(8);
			body = `<dl class="credits-list">${part.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>`;
		} else {
			const questions = [
					[
						"How many issues did testing catch?",
						"How many were critical / game breaking?",
						"Most helpful test?",
						"Least helpful test?",
					],
					[
						"What did you like most about the engine?",
						"Did you get stuck or guess wrong?",
						"Most important thing built yourself?",
						"Hardest part of using the engine?",
						"What did you change in the engine?",
						"One thing you would change?",
					],
					[
						"What did you like most about this prompt?",
						"What was confusing?",
						"What was hardest?",
						"What would you change?",
					],
				][this.creditsPage - 2],
				answers = [TESTING_FEEDBACK, ENGINE_FEEDBACK, PROMPT_FEEDBACK][
					this.creditsPage - 2
				];
			body = `<div class="feedback">${questions.map((q, i) => `<p><b>${esc(q)}</b>${esc(answers[i])}</p>`).join("")}</div>`;
		}
		return this.shell(
			"Original game · Familiar spirit",
			"About the expedition",
			`<div class="tabs">${tabs.map((n, i) => `<button data-act="credits-${i}" class="${i === this.creditsPage ? "active" : ""}">${n}</button>`).join("")}</div>${body}<p class="fine">Design, geometry, animation and synthesis created for this demo. Three.js (MIT), Rapier (Apache 2.0), AI Hub session client (repository license: unknown). No source-game assets or audio are used.</p>`,
			true,
		);
	}
	activate(a) {
		this.g.audio.init();
		this.g.audio.sfx("click");
		if (a === "back") {
			this.back();
			return;
		}
		if (a.startsWith("credits-")) {
			this.creditsPage = +a.split("-")[1];
			this.show("about");
			return;
		}
		if (
			["settings", "guide", "about", "together", "link", "dev", "map"].includes(
				a,
			)
		) {
			if (a === "map") this.g.save();
			this.show(a, this.current);
			return;
		}
		this.g.menuAction(a);
	}
	back() {
		if (this.current === "title") return;
		if (["pause", "map"].includes(this.current)) {
			this.g.resume();
			return;
		}
		if (this.current === "victory") {
			if (!this.g.net.hub) this.g.toTitle();
			return;
		}
		const p = this.parent || "title";
		this.show(
			p,
			p === "title" || p === "together"
				? "title"
				: p === "victory"
					? "victory"
					: "pause",
		);
	}
	toast(title, sub = "", duration = 3.5) {
		$("#toast").innerHTML =
			esc(title) + (sub ? `<small>${esc(sub)}</small>` : "");
		$("#toast").classList.add("show");
		this.toastUntil = performance.now() + duration * 1000;
	}
	updateTouch() {
		const touch = this.g.controls?.last === "touch",
			play = !this.current && this.g.mode === "playing";
		$("#touch-menu").classList.toggle("hidden", !touch || !play);
		$("#touch-jump").classList.toggle("hidden", !touch || !play);
		$("#touch-hint").classList.toggle("hidden", !touch || !play);
		if (!play) $("#touch-interact").classList.add("hidden");
	}
	update() {
		const g = this.g,
			s = g.state,
			p = g.localPlayer();
		if (!s || !p) return;
		if (performance.now() > this.toastUntil)
			$("#toast").classList.remove("show");
		const playing = g.mode === "playing";
		$("#hud").classList.toggle("hidden", !playing);
		$("#attract").classList.toggle("hidden", g.mode !== "attract");
		if (!playing) return;
		$("#zone-name").textContent = g.zoneName(p);
		$("#score-line").textContent =
			`${s.score.toLocaleString()} points · ${s.crumbs.filter(Boolean).length} / 12 golden crumbs`;
		for (let i = 0; i < 3; i++)
			$(`#obj${i}`).classList.toggle("done", s.found[i]);
		$("#prompts").innerHTML =
			`<span><b class="key">${g.glyph("jump")}</b>${p.water ? "Swim" : "Jump"}</span><span><b class="key">${g.glyph("interact")}</b>Use</span><span><b class="key">${g.glyph("map")}</b>Map</span><span><b class="key">${g.glyph("pause")}</b>Pause</span>`;
		$("#goal-note").textContent = g.objectiveText();
		const context = !this.current ? g.context(p) : null;
		$("#context").classList.toggle(
			"hidden",
			!context || g.controls.last === "touch",
		);
		if (context)
			$("#context").innerHTML =
				`<span class="key">${g.glyph("interact")}</span>${esc(context.label)}`;
		this.updateTouch();
		$("#touch-interact").classList.toggle(
			"hidden",
			g.controls.last !== "touch" || !context || !!this.current,
		);
		if (g.net.connected) {
			$("#network").classList.remove("hidden");
			$("#network").textContent = g.net.label();
		} else $("#network").classList.add("hidden");
	}
}
