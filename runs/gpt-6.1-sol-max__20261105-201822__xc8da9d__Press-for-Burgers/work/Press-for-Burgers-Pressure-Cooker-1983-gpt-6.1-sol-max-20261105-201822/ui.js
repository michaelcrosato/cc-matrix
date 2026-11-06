import metadata from "./metadata.json";
import { COLORS, DEFAULTS, FOOD, SHIFTS } from "./model.js";
export const $ = (id) => document.getElementById(id);
export const esc = (s) =>
	String(s).replace(
		/[&<>"']/g,
		(c) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				c
			],
	);
const button = (text, action, classes = "", suffix = "→") =>
	`<button class="button focusable ${classes}" data-action="${action}"><span>${text}</span><span class="arrow">${suffix}</span></button>`;
const back = () =>
	'<button class="back focusable" data-action="back">← Back</button>';
export function foodIcon(type, done = false) {
	const colors = ["#f2674c", "#ffcb4b", "#80b955", "#b295d3"];
	const shapes = [
		`<ellipse cx="22" cy="21" rx="17" ry="12" fill="${colors[0]}"/><ellipse cx="22" cy="20" rx="12" ry="8" fill="#ffab7a"/><path d="M22 13v14m-8-11 16 8m0-8-16 8" stroke="#ffe8a6" stroke-width="2.3"/>`,
		`<path d="m5 12 28-4 7 21-29 5Z" fill="${colors[1]}"/><circle cx="17" cy="19" r="3" fill="#e9a53e"/><circle cx="29" cy="25" r="2" fill="#e9a53e"/>`,
		`<path d="M7 26C0 17 8 7 16 11 20 2 33 7 33 13 45 12 45 26 35 29 31 38 18 34 16 30 9 34 3 31 7 26Z" fill="${colors[2]}"/><path d="m15 28 15-12m-10 7-1-8m6 4 7 1" fill="none" stroke="#c9db80" stroke-width="2"/>`,
		`<ellipse cx="22" cy="21" rx="17" ry="12" fill="${colors[3]}"/><ellipse cx="22" cy="21" rx="11" ry="7" fill="#f3e1e9"/><ellipse cx="22" cy="21" rx="5" ry="3" fill="${colors[3]}"/>`,
	];
	return `<div class="food-icon ${done ? "done" : ""}" aria-label="${FOOD[type].name}${done ? " added" : ""}"><svg viewBox="0 0 44 40" fill="none" stroke="#332b35" stroke-width="1.6">${shapes[type]}</svg><span>${FOOD[type].name.slice(0, 3).toUpperCase()}</span></div>`;
}

export class KitchenUI {
	constructor(app) {
		this.app = app;
		this.screen = null;
		this.focus = 0;
		this.aboutTab = "source";
		this.toastUntil = 0;
		this.ticketKey = "";
		this.lastHUD = 0;
		this.input = "keyboard";
		this.glyphs = "ps";
		this.returnTo = "title";
		this.focusReturn = null;
		$("pause-btn").onclick = () => app.pause();
		$("screens").addEventListener("click", (e) => {
			const el = e.target.closest("[data-action]");
			if (el && !el.disabled) {
				app.audio.play("menu");
				app.action(el.dataset.action);
			}
		});
		$("screens").addEventListener("pointerover", (e) => {
			const el = e.target.closest(".focusable");
			if (el) {
				const i = this.items().indexOf(el);
				if (i >= 0) this.setFocus(i, false);
			}
		});
		$("screens").addEventListener("input", (e) => {
			const el = e.target;
			if (el.dataset.setting) app.setting(el.dataset.setting, el.value);
			if (el.dataset.tuning) {
				app.sim.tuning[el.dataset.tuning] = Number(el.value);
				el.nextElementSibling.value = Number(el.value).toFixed(
					el.step < 1 ? 2 : 0,
				);
			}
		});
		$("screens").addEventListener("change", (e) => {
			if (e.target.dataset.setting)
				app.setting(e.target.dataset.setting, e.target.value);
		});
	}
	key(action) {
		if (this.input === "touch")
			return `<span class="key">${action === "move" ? "Drag" : action === "pause" ? "Ⅱ" : action === "reject" ? "Auto" : "Tap"}</span>`;
		const pad = this.input === "gamepad";
		const xbox = this.glyphs === "xbox";
		const keys = {
			move: pad ? "L" : "W A S D",
			action: pad ? (xbox ? "A" : "×") : "E",
			reject: pad ? (xbox ? "B" : "○") : "R",
			dash: pad ? (xbox ? "X" : "□") : "Shift",
			brake: pad ? (xbox ? "RB" : "R1") : "Q",
			pause: pad ? "☰" : "Esc",
			accept: pad ? (xbox ? "A" : "×") : "Enter",
			back: pad ? (xbox ? "B" : "○") : "Esc",
		};
		return `<span class="key ${pad && ["action", "reject", "dash", "accept", "back"].includes(action) ? "glyph" : ""}">${keys[action]}</span>`;
	}
	panel(content, wide = false) {
		return `<div class="shade"><section class="panel ${wide ? "wide" : ""}">${content}</section></div>`;
	}
	show(screen) {
		this.screen = screen;
		this.codeEditing = false;
		this.focus = 0;
		this.ticketKey = "";
		const a = this.app,
			s = a.state;
		let content = "";
		if (screen === "title")
			content = `<div class="title-layout"><div class="title-paper"></div><div class="title-content"><div class="eyebrow"><span class="brand-star">✦</span> THE SQUEEZE · OPEN SINCE ’83</div><h1 class="title-wordmark"><span>Press for</span><strong>Burgers</strong></h1><p class="title-tagline">Good food. Fast hands.</p><p class="muted small" style="margin-top:10px">Catch it. Stack it. Send it smiling.</p><div class="menu title-menu">${button("Clock in · Solo service", "solo", "primary")}${button("Bring a second apron", "friends", "teal")}<div class="title-mini">${button("How to cook", "help")}${button("Settings", "settings")}</div>${button("About this kitchen", "about", "", "✦")}</div></div><div class="scene-caption">A SMALL KITCHEN.<br><span style="color:#f1bd5e">A VERY BIG LUNCH.</span></div><div class="stamp">HOT OFF<br><strong>THE GRILL</strong>1–4 CHEFS</div><div class="title-bottom">ORIGINAL ARCADE COOKERY · INSPIRED BY PRESSURE COOKER (1983)</div></div>`;
		if (screen === "brief")
			content = this.panel(
				`<div class="shift-number">01</div><div class="eyebrow">APRON ON. CHIN UP.</div><h2>The early bird.</h2><p>Welcome to The Squeeze, chef. Four good burgers and we’ll call that a fine morning.</p><div class="rule"></div><div class="control-line"><strong>1.</strong> Catch a flying topping with your chef.</div><div class="control-line"><strong>2.</strong> At the belt, ${this.key("action")} adds it. Same button picks up a finished burger.</div><div class="control-line"><strong>3.</strong> Carry it to its numbered window. ${this.key("action")} serves.</div><p class="small muted" style="margin-top:16px">A bad topping costs 2 rating. A wrong window costs 5. A burger off the belt costs 10. Keep the rating above zero.</p><div class="menu">${button("Let’s get cooking", "begin", "primary")}${button("Show me the ropes", "help")}</div>`,
			);
		if (screen === "pause")
			content = this.panel(
				`<div class="eyebrow">TAKE A BREATHER</div><h2>Hold the onions.</h2><p class="muted">${a.net.active ? "Your crew keeps the kitchen running while this menu is open." : "The griddle can wait a minute."}</p><div class="menu">${button("Back to the kitchen", "resume", "primary")}${button("Settings", "settings")}${button("How to cook", "help")}${!AIHub.active ? button("Chef’s toolbox · Dev mode", "dev") : ""}${button("About & credits", "about")}${!AIHub.active ? button(a.net.active ? "Leave the kitchen" : "Clock out", "title") : ""}</div>`,
			);
		if (screen === "help")
			content = this.panel(
				`<div class="eyebrow">THE SHORT-ORDER HANDBOOK</div><h2>Many happy returns.</h2><p>Read the ticket. Catch the topping. Mind the bun.</p><div class="feature-cards"><div class="feature-card"><div class="big-icon">↙</div><h3>Catch & return</h3><p>Walk into toppings to catch them. Hold ${this.key("reject")} to bounce away extras, or return what you’re holding. No waste, no penalty.</p></div><div class="feature-card"><div class="big-icon">≋</div><h3>Stack & carry</h3><p>Match the topping pictures on a ticket. ${this.key("action")} places at the belt. A top bun appears when the recipe is complete. Press again to carry.</p></div><div class="feature-card"><div class="big-icon">①</div><h3>Wrap & repeat</h3><p>Match both the number and color at the front windows. ${this.key("action")} serves. Three in a row starts a 12-second rush!</p></div></div><div class="controls-grid"><div class="control-line">${this.key("move")} Move chef</div><div class="control-line">${this.key("action")} Place / carry / serve</div><div class="control-line">${this.key("reject")} Return topping</div><div class="control-line">${this.key("dash")} Dash · 2s cooldown</div><div class="control-line">${this.key("brake")} Stop belt · 5s</div><div class="control-line">${this.key("pause")} Pause / menu</div></div><p class="small muted">The second shift brings onions and a steam grate. Stay off the grate while it hisses. The belt brake recharges in 18 seconds. In touch mode, drag anywhere; catching, stacking and serving are assisted. Tap a burger or window for a quick action.</p>${back()}`,
				true,
			);
		if (screen === "settings")
			content = this.panel(
				`<div class="eyebrow">SEASON TO TASTE</div><h2>Your kind of kitchen.</h2><div class="setting"><label for="music">Music <small>The house jingle</small></label><input class="focusable" id="music" type="range" min="0" max="100" value="${Math.round(a.audio.musicVolume * 100)}" data-setting="music"><output>${Math.round(a.audio.musicVolume * 100)}%</output></div><div class="setting"><label for="effects">Sound effects <small>Sizzles, pops and good news</small></label><input class="focusable" id="effects" type="range" min="0" max="100" value="${Math.round(a.audio.sfxVolume * 100)}" data-setting="effects"><output>${Math.round(a.audio.sfxVolume * 100)}%</output></div><div class="setting"><label for="voices">Chef chatter</label><select class="focusable" id="voices" data-setting="voices"><option value="on" ${a.audio.voices ? "selected" : ""}>Gibberish on</option><option value="off" ${!a.audio.voices ? "selected" : ""}>Quiet chefs</option></select></div><div class="setting"><label for="glyphs">Controller prompts</label><select class="focusable" id="glyphs" data-setting="glyphs"><option value="ps" ${this.glyphs === "ps" ? "selected" : ""}>PlayStation · × ○ □ △</option><option value="xbox" ${this.glyphs === "xbox" ? "selected" : ""}>Xbox · A B X Y</option></select></div><div class="setting"><label for="assist">Helping hands <small>Auto place / pick up / serve nearby</small></label><select class="focusable" id="assist" data-setting="assist"><option value="off" ${!a.assist ? "selected" : ""}>Manual handling</option><option value="on" ${a.assist ? "selected" : ""}>Assisted handling</option></select></div><div class="menu">${button("Back to it", "back", "primary")}${button("Fullscreen", "fullscreen")}</div>`,
			);
		if (screen === "friends")
			content = this.panel(
				`<div class="eyebrow">MANY HANDS, LIGHT LUNCH</div><h2>Share the squeeze.</h2><p>Work one belt together. Everyone shares the rating and the glory.</p><div class="menu">${button("Two chefs · One screen", "local", "primary")}${button("Host an online kitchen", "host", "teal")}${button("Join with a room code", "online")}</div><div class="rule"></div><p class="small muted">Local: chef 1 uses WASD + E/R/Shift/Q; chef 2 uses arrows + Enter/Backspace/Right Shift, or a second controller. Online: up to four chefs. AI Hub connects the crew automatically.</p>${back()}`,
			);
		if (screen === "online")
			content = this.panel(
				`<div class="eyebrow">PULL UP AN APRON</div><h2>Find your kitchen.</h2><p>Your host has a six-letter room code.</p><div class="menu"><input id="room-input" class="focusable" type="text" maxlength="6" placeholder="ABCDEF" aria-label="Six-letter room code" autocomplete="off" spellcheck="false" style="font:900 1.6rem monospace;letter-spacing:.2em;text-align:center;text-transform:uppercase" value="${esc(a.net.room || "")}">${button("Join the crew", "join", "primary")}</div><p class="room-status" role="status">${esc(a.roomStatus || "")}</p><p class="small muted">Internet play uses an encrypted peer connection. Same-device tabs connect directly. Every player opens this game and enters the code.</p>${back()}`,
			);
		if (screen === "room")
			content = this.panel(
				`<div class="eyebrow">${a.net.host ? "YOUR KITCHEN IS OPEN" : "FINDING A PLACE AT THE COUNTER"}</div><h2>Aprons at the ready.</h2><div class="room-code">${esc(a.net.room)}</div><div class="room-seats">${[0, 1, 2, 3].map((id) => `<div class="seat" style="border-color:${COLORS[id]}">${a.net.players.some((p) => p.id === id) ? `Chef ${id + 1} ✓` : "Open"}</div>`).join("")}</div><p class="room-status" role="status">${esc(a.roomStatus || "")}</p><div class="menu">${a.net.host ? button("Open for service", "startRoom", "primary") : '<p class="small muted">The host will start service for everyone.</p>'}${button("Leave room", "leaveRoom")}</div>`,
			);
		if (screen === "intermission") {
			const cfg = SHIFTS[s.shift + 1];
			content = this.panel(
				`<div class="eyebrow">SHIFT ${s.shift + 1} · NICELY DONE</div><h2>That’s a wrap!</h2><p>${s.shift === 0 ? "The early birds flew home happy. Now for the lunch bunch." : "The lunch crowd loved it. Supper is where legends get their aprons."}</p><div class="statistics"><div class="stat"><strong>${s.shiftServed}</strong><small>Burgers served</small></div><div class="stat"><strong>${Math.round(s.rating)}</strong><small>Kitchen rating</small></div><div class="stat"><strong>${s.score.toLocaleString()}</strong><small>Points</small></div></div><p><strong>Next: ${cfg.name.toLowerCase()}.</strong></p><p class="small muted" style="margin-top:9px">${s.shift === 0 ? "Onions join the line-up. The center grate vents hot steam. Watch your feet!" : "All four toppings, faster service, and six hungry customers."} Your rating gets a 16-point breather.</p><div class="menu">${a.net.host ? button("Next shift · Let ’em in", "next", "primary") : "<p>Waiting for your host to open the next shift.</p>"}</div>`,
			);
		}
		if (screen === "won" || screen === "lost")
			content = this.panel(
				`<div class="eyebrow">${screen === "won" ? "THREE SHIFTS · ONE FINE KITCHEN" : "THE GRIDDLE GETS THE LAST WORD"}</div><h2>${screen === "won" ? "Well done, chef." : "A little overdone."}</h2><p>${screen === "won" ? "Fifteen happy customers. Not a bun left behind. The Squeeze has a new short-order legend." : "The rating ran out, but your apron still fits. There’s always another service."}</p><div class="statistics"><div class="stat"><strong>${s.totalServed}/15</strong><small>Orders served</small></div><div class="stat"><strong>${s.score.toLocaleString()}</strong><small>Points</small></div><div class="stat"><strong>${s.bestCombo}</strong><small>Best streak</small></div></div><p class="small muted">House best: ${a.highScore.toLocaleString()} · ${Math.floor(s.time / 60)}m ${Math.floor(s.time % 60)}s on the clock.</p><div class="menu">${!AIHub.active && a.net.host ? button("Another service", "retry", "primary") : ""}${!AIHub.active ? button("Back to the counter", "title") : ""}</div>`,
			);
		if (screen === "hubWaiting")
			content = this.panel(
				'<div class="eyebrow">THE CREW IS COMING</div><h2>Good food. Fast hands.</h2><p>Catch flying toppings, build the tickets, and serve all fifteen burgers together. The kitchen opens on the Hub’s signal.</p>',
			);
		if (screen === "hubEnd")
			content = this.panel(
				'<div class="eyebrow">SERVICE COMPLETE</div><h2>Thanks, chefs.</h2><p>The Hub has your results. Your aprons will be waiting.</p>',
			);
		if (screen === "dev") {
			const sliders = [
				["moveSpeed", "Chef speed", 2, 10, 0.1],
				["beltSpeed", "Belt speed", 0.05, 0.6, 0.01],
				["foodSpeed", "Flying topping speed", 1, 7, 0.1],
				["spawnInterval", "Topping interval", 0.4, 5, 0.1],
				["penaltyScale", "Mistake penalty", 0, 3, 0.1],
				["catchRadius", "Catch reach", 0.4, 1.5, 0.05],
				["steamInterval", "Steam cycle (seconds)", 5, 30, 1],
			];
			content = this.panel(
				`<div class="eyebrow">CHEF’S TOOLBOX · LIVE TUNING</div><h2>A pinch of science.</h2><p class="small muted">Changes apply immediately. ${a.net.active ? "The crew shares the host’s tuning." : "The kitchen is paused until you resume."}</p>${sliders.map(([key, name, min, max, step]) => `<div class="setting"><label for="tune-${key}">${name}<small>Default: ${DEFAULTS[key]}</small></label><input class="focusable" id="tune-${key}" type="range" min="${min}" max="${max}" step="${step}" value="${a.sim.tuning[key]}" data-tuning="${key}"><output>${a.sim.tuning[key].toFixed(step < 1 ? 2 : 0)}</output></div>`).join("")}<div class="row" style="margin-top:18px">${button(a.sim.invincible ? "Invincible: on" : "Invincible: off", "god")}${button(a.sim.autoChef ? "Auto chef: on" : "Auto chef: off", "auto")}</div><div class="row" style="margin-top:13px">${button("Restore rating", "heal")}${button("Complete this shift", "skip")}</div><div class="row" style="margin-top:13px">${button("Reset tuning", "resetTuning")}${button("Resume service", "resume", "primary")}</div>${back()}`,
				true,
			);
		}
		if (screen === "about") {
			const tabs = [
				["source", "Source Information"],
				["testing", "Testing Feedback"],
				["engine", "Engine Feedback"],
				["prompt", "Prompt Feedback"],
			];
			const questions = {
				testing: [
					"Issues found",
					"Critical / game breaking",
					"Most helpful test",
					"Least helpful test",
				],
				engine: [
					"What worked well",
					"Stuck or guessed wrong",
					"Built ourselves",
					"Hardest engine task",
					"Engine changes",
					"One desired change",
				],
				prompt: [
					"What worked well",
					"What was confusing",
					"Hardest task",
					"Suggested change",
				],
			};
			let info = "";
			if (this.aboutTab === "source")
				info = `<dl>${Object.entries(metadata.sourceInformation)
					.map(
						([k, v]) =>
							`<dt>${esc(k.replace(/([A-Z])/g, " $1"))}</dt><dd>${esc(v)}</dd>`,
					)
					.join(
						"",
					)}</dl><h3>Research & acknowledgments</h3><p class="small">An original, unofficial tribute. No original game assets or music are used. Pressure Cooker and its characters belong to their respective owners.</p><p class="small" style="margin-top:12px"><a class="focusable" href="https://atariage.com/manual_html_page.php?SoftwareID=1222" target="_blank" rel="noopener">Activision manual · AtariAge</a> · <a class="focusable" href="https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub" target="_blank" rel="noopener">AI Hub protocol</a> · Three.js (MIT), Rapier (Apache-2.0), PeerJS (MIT). Procedural art, animation and composition created for this game.</p>`;
			else
				info = `<dl>${metadata[`${this.aboutTab}Feedback`].map((answer, i) => `<dt>${questions[this.aboutTab][i]}</dt><dd>${esc(answer)}</dd>`).join("")}</dl>`;
			content = this.panel(
				`<div class="eyebrow">A SMALL KITCHEN. A LOT OF HEART.</div><h2>About & credits.</h2><div class="about-tabs">${tabs.map(([id, name]) => `<button class="focusable ${id === this.aboutTab ? "selected" : ""}" data-action="about-${id}">${name}</button>`).join("")}</div><div class="credits focusable" tabindex="0" aria-label="Credits; use right stick or Page Down to scroll">${info}</div>${back()}`,
				true,
			);
		}
		$("screens").innerHTML = content;
		if (AIHub.active)
			for (const a of $("screens").querySelectorAll("a")) {
				a.removeAttribute("href");
				a.removeAttribute("target");
				a.classList.remove("focusable");
			}
		this.setFocus(0, false);
		$("screens").classList.toggle("hidden", !screen);
		$("hud").classList.toggle(
			"hidden",
			screen === "title" ||
				screen === "friends" ||
				screen === "online" ||
				screen === "room" ||
				screen === "hubWaiting" ||
				screen === "hubEnd" ||
				screen === "brief",
		);
		document.body.dataset.screen = screen || "playing";
	}
	items() {
		return [...$("screens").querySelectorAll(".focusable")].filter(
			(e) => !e.disabled,
		);
	}
	setFocus(i, actual = true) {
		const els = this.items();
		if (!els.length) return;
		this.focus = (i + els.length) % els.length;
		els.forEach((el, j) => {
			el.classList.toggle("focused", j === this.focus);
		});
		if (actual) els[this.focus].focus({ preventScroll: true });
		els[this.focus].scrollIntoView({ block: "nearest" });
	}
	navigate(dx, dy) {
		const items = this.items(),
			el = items[this.focus];
		if (!el) return;
		if (this.codeEditing && el.id === "room-input") {
			const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
			if (dx) this.codeCursor = (this.codeCursor + dx + 6) % 6;
			if (dy) {
				const letters = el.value.padEnd(6, "A").split("");
				const index = alphabet.indexOf(letters[this.codeCursor]);
				letters[this.codeCursor] =
					alphabet[(Math.max(0, index) - dy + 32) % 32];
				el.value = letters.join("");
			}
			el.setSelectionRange(this.codeCursor, this.codeCursor + 1);
			this.app.audio.play("menu");
			return;
		}
		if (el.classList.contains("credits")) {
			if (
				dy &&
				((dy > 0 && el.scrollTop < el.scrollHeight - el.clientHeight - 3) ||
					(dy < 0 && el.scrollTop > 0))
			) {
				el.scrollTop += dy * 120;
				return;
			}
		}
		if (dx && el.matches("input[type=range]")) {
			el.value = String(
				Math.max(
					Number(el.min),
					Math.min(
						Number(el.max),
						Number(el.value) + dx * Number(el.step || 1),
					),
				),
			);
			el.dispatchEvent(new Event("input", { bubbles: true }));
			return;
		}
		if (dx && el.tagName === "SELECT") {
			el.selectedIndex = Math.max(
				0,
				Math.min(el.options.length - 1, el.selectedIndex + dx),
			);
			el.dispatchEvent(new Event("change", { bubbles: true }));
			return;
		}
		this.setFocus(this.focus + (dy || dx));
		this.app.audio.play("menu");
	}
	activate() {
		const el = this.items()[this.focus];
		if (el?.id === "room-input" && this.input === "gamepad") {
			if (this.codeEditing) {
				this.codeEditing = false;
				this.setFocus(this.focus + 1);
				return;
			}
			this.codeEditing = true;
			this.codeCursor = 0;
			el.value = el.value.toUpperCase().padEnd(6, "A").slice(0, 6);
			el.focus();
			el.setSelectionRange(0, 1);
			const help = $("screens").querySelector(".room-status");
			if (help)
				help.innerHTML = `D-pad ↑↓ chooses a letter · ←→ changes position · ${this.key("accept")} Done`;
			return;
		}
		if (el?.matches("input,select")) {
			el.focus();
			return;
		}
		el?.click();
	}
	scroll(amount) {
		const e =
			$("screens").querySelector(".credits") ||
			$("screens").querySelector(".panel");
		if (e) e.scrollTop += amount;
	}
	toast(text, seconds = 2.6) {
		$("toast").textContent = text;
		$("toast").classList.remove("hidden");
		this.toastUntil = performance.now() + seconds * 1000;
	}
	hud(s, time) {
		if (performance.now() > this.toastUntil) $("toast").classList.add("hidden");
		if (time - this.lastHUD < 0.08) return;
		this.lastHUD = time;
		const a = this.app,
			me = a.net.me < 0 ? 0 : a.net.me,
			p = s.players.find((p) => p.id === me) || s.players[0];
		$("shift-label").textContent =
			`SHIFT ${s.shift + 1} OF 3 · ${s.shiftServed}/${SHIFTS[s.shift].goal} SERVED`;
		$("score").textContent = String(s.score).padStart(5, "0");
		$("rating-label").textContent = `RATING ${Math.round(s.rating)}/99`;
		$("rating-meter").className = `rating-meter ${s.rating < 20 ? "low" : ""}`;
		$("rating-meter").innerHTML = Array.from(
			{ length: 10 },
			(_, i) => `<i class="${s.rating >= i * 10 ? "on" : ""}"></i>`,
		).join("");
		const all = s.burgers
			.concat(
				s.players
					.filter((p) => p.held?.kind === "burger")
					.map((p) => ({ ...p.held.burger, carried: true })),
			)
			.sort((a, b) => a.chute - b.chute);
		const key = JSON.stringify(
			all.map((b) => [b.id, b.toppings, b.ready, b.carried, b.z > 3]),
		);
		if (key !== this.ticketKey) {
			this.ticketKey = key;
			$("tickets").innerHTML = all
				.map(
					(b) =>
						`<div class="ticket ${b.ready ? "ready" : ""} ${b.z > 3 && !b.carried ? "urgent" : ""}" style="--ticket:${COLORS[b.chute]}"><div class="ticket-head"><span>Window ${b.chute + 1}</span><b class="number">${b.chute + 1}</b></div><div class="food-list">${b.recipe.map((t) => foodIcon(t, b.toppings.includes(t))).join("")}</div><div class="ticket-status">${b.carried ? "TAKE IT TO THE WINDOW" : b.ready ? "TOP BUN ON · READY TO CARRY" : "PATTY + BUN INCLUDED"}</div></div>`,
				)
				.join("");
		}
		if (p) {
			let text = "Hands free · Catch a topping";
			if (p.held?.kind === "topping")
				text = `${FOOD[p.held.type].name} · Take it to the belt`;
			if (p.held?.kind === "burger")
				text = `Burger for window ${p.held.burger.chute + 1} · Ready to serve`;
			$("held").innerHTML =
				`<small>CHEF ${p.id + 1}${s.combo > 1 ? ` · ${s.combo} ORDER STREAK` : ""}</small>${text}`;
		}
		$("prompts").innerHTML =
			`<span>${this.key("action")} Handle</span><span>${this.key("reject")} Return</span><span>${this.key("dash")} Dash</span>`;
		const ready = s.brakeCooldown <= 0;
		$("brake").innerHTML =
			`${this.key("brake")} ${s.brake > 0 ? "BELT STOPPED" : ready ? "BELT BRAKE READY" : `BRAKE IN ${Math.ceil(s.brakeCooldown)}s`}<div class="brake-meter"><i style="width:${100 * (1 - s.brakeCooldown / 18)}%"></i></div>`;
		let hint = "Catch the toppings pictured on your tickets.";
		if (p?.held?.kind === "topping")
			hint = `At the belt, ${this.key("action")} places ${FOOD[p.held.type].name}. ${this.key("reject")} returns it.`;
		else if (p?.held?.kind === "burger")
			hint = `Carry to window ${p.held.burger.chute + 1}. ${this.key("action")} serves.`;
		else if (s.burgers.some((b) => b.ready))
			hint = `A top bun is on! ${this.key("action")} at the belt to carry it.`;
		if (s.steam) hint = "Steam is up! Give the center grate some room.";
		$("context").innerHTML = hint;
		$("context").classList.toggle(
			"hidden",
			!!a.screen || a.attract || (s.shiftTime > 50 && !p?.held && !s.steam),
		);
	}
}
