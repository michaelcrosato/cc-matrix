const $ = (id) => document.getElementById(id);
const esc = (s) =>
	String(s).replace(
		/[&<>"']/g,
		(c) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				c
			],
	);
export class JungleUI {
	constructor(game) {
		this.g = game;
		this.panel = $("panel");
		this.screen = "";
		this.returnScreen = "pause";
		this.toastLeft = 0;
		$("pause-button").onclick = () => game.pause();
		this.panel.addEventListener("pointerover", (e) => {
			const b = e.target.closest("button");
			if (b) b.focus({ preventScroll: true });
		});
	}
	glyph(action) {
		const g = this.g;
		if (g.inputType === "touch")
			return {
				jump: "TAP RIGHT",
				swat: "HOLD RIGHT",
				move: "LEFT THUMB",
				duck: "SWIPE DOWN",
				pause: "Ⅱ",
				ok: "TAP",
				back: "BACK",
			}[action];
		if (g.inputType === "pad") {
			const xbox = g.settings.glyphs === "xbox";
			return {
				jump: xbox ? "Ⓐ" : "✕",
				swat: xbox ? "ⓧ" : "□",
				move: "L STICK",
				duck: xbox ? "Ⓑ" : "○",
				pause: xbox ? "☰" : "OPTIONS",
				ok: xbox ? "Ⓐ" : "✕",
				back: xbox ? "Ⓑ" : "○",
			}[action];
		}
		return {
			jump: "SPACE",
			swat: "F / CLICK",
			move: "WASD / ↑↓←→",
			duck: "S / ↓",
			pause: "ESC",
			ok: "ENTER",
			back: "ESC",
		}[action];
	}
	show(screen, html, title = false) {
		$("toast").classList.add("hidden");
		this.toastLeft = 0;
		this.screen = screen;
		this.panel.className = title ? "title" : "";
		this.panel.innerHTML = html;
		this.panel.classList.remove("hidden");
		setTimeout(
			() =>
				this.panel
					.querySelector("button,input,select")
					?.focus({ preventScroll: true }),
			30,
		);
		this.panel.querySelectorAll("[data-act]").forEach((b) => {
			b.onclick = () => {
				this.g.audio.init();
				this.g.audio.sfx("menu");
				this.act(b.dataset.act);
			};
		});
	}
	act(action) {
		const g = this.g;
		switch (action) {
			case "start":
				g.start();
				break;
			case "help":
				this.help();
				break;
			case "settings":
				this.returnScreen = this.screen;
				this.settings();
				break;
			case "about":
				this.returnScreen = this.screen;
				this.about();
				break;
			case "race":
				this.race();
				break;
			case "title":
				g.title();
				break;
			case "resume":
				g.resume();
				break;
			case "back":
				this.back();
				break;
			case "dev":
				this.dev();
				break;
			case "defaults":
				g.resetTuning();
				this.dev();
				break;
			case "next":
				g.loadStage((g.stage + 1) % 4);
				this.dev();
				break;
			case "refill":
				g.health = 5;
				g.air = 100;
				g.timer = 300;
				this.toast("Supplies restored", 2);
				break;
			case "checkpoint":
				g.respawn();
				this.toast("Back to the checkpoint", 2);
				break;
			case "start-race":
				g.net.startRace();
				break;
			case "disconnect":
				g.net.close();
				this.race();
				break;
			case "retry":
				g.start();
				break;
			case "loop":
				g.loop++;
				g.start(false, false, true);
				break;
			case "fullscreen":
				if (!document.fullscreenElement)
					document.documentElement
						.requestFullscreen()
						.catch(() => this.toast("Fullscreen is unavailable here", 3));
				else document.exitFullscreen();
				break;
		}
	}
	hide() {
		this.panel.classList.add("hidden");
		this.screen = "";
	}
	title() {
		this.show(
			"title",
			`<div class="title-content"><div class="brand-line eyebrow">FIELD NOTES № 01 <span> / </span> THE LOST TEA TRAIL</div><h1>Jungle<span>Zip<span style="display:inline;font-size:.25em;color:var(--paper);vertical-align:top;letter-spacing:0;margin-left:8px">✦</span></span></h1><p class="tagline">A very improper expedition.</p><p class="blurb">The kettle’s on. Your botanist isn’t.<br>Bring Professor Pip home before teatime.</p><div class="menu"><button data-act="start">Start expedition <span class="button-glyph" data-prompt="ok">${this.glyph("ok")} →</span></button><button data-act="race">Ghost expedition <span class="button-glyph">1–4 EXPLORERS</span></button><div class="menu-row"><button data-act="help">Field guide <span>↗</span></button><button data-act="settings">Settings <span>⚙</span></button><button data-act="about">About & credits <span>✦</span></button><button data-act="fullscreen">Fullscreen <span>⛶</span></button></div></div></div><div class="edition"><span>AN ARCADE<br>EXPEDITION</span><span class="stamp">04</span></div><div class="scene-note"><small>Somewhere beyond the river</small>Adventure is afoot. →</div><div class="title-footer"><span>${this.g.inputType === "pad" ? "CONTROLLER READY" : "KEYBOARD · CONTROLLER · TOUCH"} &nbsp; / &nbsp; DEMO IN 10 SECONDS</span><span class="acts">SWING &nbsp; / &nbsp; SWIM &nbsp; / &nbsp; SCRAMBLE &nbsp; / &nbsp; SAVE</span></div>`,
			true,
		);
	}
	modal(
		screen,
		eyebrow,
		title,
		body,
		footer = '<button class="secondary" data-act="back">← Back</button>',
		wide = false,
	) {
		this.show(
			screen,
			`<section class="modal ${wide ? "wide" : ""}" aria-label="${esc(title)}"><div class="eyebrow">${eyebrow}</div><h2>${title}</h2>${body}<footer>${footer}</footer></section>`,
		);
	}
	pause() {
		const session = this.g.net.hub;
		this.modal(
			"pause",
			"A MOMENT TO CATCH YOUR BREATH",
			"Tea break.",
			`<p>${session ? "Your ghost race clock keeps running." : "The jungle can wait a moment."}</p><div class="menu"><button data-act="resume">Continue expedition <span>${this.glyph("ok")} →</span></button><button data-act="settings">Settings <span>⚙</span></button><button data-act="dev">Expedition workshop <span>DEV</span></button><button data-act="about">About & credits <span>✦</span></button>${session ? "" : '<button data-act="title">Return to camp <span>↩</span></button>'}</div>`,
			"",
		);
	}
	back() {
		if (this.screen === "settings" || this.screen === "about") {
			if (this.returnScreen === "title") this.title();
			else this.pause();
		} else if (this.screen === "dev") this.pause();
		else if (this.screen === "pause") this.g.resume();
		else this.g.title();
	}
	settings() {
		const s = this.g.settings;
		this.modal(
			"settings",
			"MAKE YOURSELF AT HOME",
			"Camp comforts.",
			`<div class="settings-row"><label for="music">Music <small>(default 10%)</small></label><div class="range"><input id="music" type="range" min="0" max="100" step="1" value="${s.music * 100}" aria-label="Music volume"><output id="music-v">${Math.round(s.music * 100)}%</output></div></div><div class="settings-row"><label for="effects">Sound & gibberish</label><div class="range"><input id="effects" type="range" min="0" max="100" step="1" value="${s.effects * 100}" aria-label="Effects volume"><output id="effects-v">${Math.round(s.effects * 100)}%</output></div></div><div class="settings-row"><label for="glyphs">Controller symbols</label><select id="glyphs"><option value="ps" ${s.glyphs === "ps" ? "selected" : ""}>PlayStation · ✕ ○ □ △</option><option value="xbox" ${s.glyphs === "xbox" ? "selected" : ""}>Xbox · A B X Y</option></select></div><div class="settings-row"><label for="assist">Vine catch assist</label><input id="assist" type="checkbox" ${s.assist ? "checked" : ""}></div><div class="settings-row"><label for="motion">Screen shake</label><input id="motion" type="checkbox" ${s.shake ? "checked" : ""}></div><p class="tiny">Touch adds automatic vine catches, short-range swats and a helping hand when air runs low. Settings are saved on this device.</p>`,
		);
		for (const [id, key] of [
			["music", "music"],
			["effects", "effects"],
		])
			$(id).oninput = (e) => {
				s[key] = +e.target.value / 100;
				$(`${id}-v`).value = `${e.target.value}%`;
				this.g.applySettings();
			};
		$("glyphs").onchange = (e) => {
			s.glyphs = e.target.value;
			this.g.applySettings();
		};
		$("assist").onchange = (e) => {
			s.assist = e.target.checked;
			this.g.applySettings();
		};
		$("motion").onchange = (e) => {
			s.shake = e.target.checked;
			this.g.applySettings();
		};
	}
	help() {
		this.modal(
			"help",
			"EVERY GOOD EXPEDITION NEEDS A PLAN",
			"The field guide.",
			`<div class="help-grid"><div><div class="act-number">01 / SWING</div><p>Leap toward a gold vine ring to grab it. Push with ${this.glyph("move")}. Tap <b>${this.glyph("jump")}</b> at the forward peak to release. A good catch saves your checkpoint.</p></div><div><div class="act-number">02 / SWIM</div><p>Swim in all directions. Rise to the pale waterline to refill your air. Use <b>${this.glyph("swat")}</b> to stun closed-jaw crocs. Give open jaws a wide berth.</p></div><div><div class="act-number">03 / SCRAMBLE</div><p>Jump the low stones. Hold <b>${this.glyph("duck")}</b> beneath high boulders. Their landing shadows tell you where trouble’s headed.</p></div><div><div class="act-number">04 / SAVE</div><p>Vault or swat the clockwork guards. At the brass wheel, hold <b>${this.glyph("swat")}</b> to free Pip before the kettle whistles.</p></div></div><div class="controls-table"><span>${this.glyph("move")} · move</span><span>${this.glyph("jump")} · jump / release</span><span>${this.glyph("swat")} · swat / rescue</span><span>${this.glyph("pause")} · pause</span></div><p class="tiny">Five lives. 300 seconds. Each cleared act restores one life. Fireflies score 100, a fresh vine 150, a stunned croc 250, a clockwork guard 300. A rescue earns a time bonus. Touch: left thumb moves, tap the right half to jump or release; hold it at Pip’s wheel.</p>`,
			'<button class="secondary" data-act="back">← Back to camp</button><button class="primary" data-act="start">Let’s get lost →</button>',
			true,
		);
	}
	dev() {
		const g = this.g;
		const sliders = [
			["speed", "Run / swim speed", 3, 12, 0.25],
			["jump", "Jump strength", 7, 20, 0.25],
			["gravity", "Gravity", 8, 35, 0.5],
			["swing", "Swing launch boost", 1, 2.5, 0.05],
			["hazard", "Hazard speed", 0.25, 2, 0.05],
			["airDrain", "Air used / second", 1, 14, 0.5],
		];
		this.modal(
			"dev",
			"DEVELOPER MODE · LIVE BALANCE",
			"Expedition workshop.",
			`<p class="tiny">Changes apply immediately. Workshop scores do not replace the solo record.</p>${sliders.map(([key, name, min, max, step]) => `<div class="settings-row"><label for="t-${key}">${name}</label><div class="range"><input id="t-${key}" type="range" min="${min}" max="${max}" step="${step}" value="${g.tuning[key]}"><output id="v-${key}">${g.tuning[key]}</output></div></div>`).join("")}<div class="settings-row"><label for="god">Infinite lives & air</label><input id="god" type="checkbox" ${g.god ? "checked" : ""}></div><div class="settings-row"><label for="bot">Expedition autopilot</label><input id="bot" type="checkbox" ${g.autopilot ? "checked" : ""}></div><div class="settings-row"><label for="stage-select">Jump to an act</label><select id="stage-select">${g.stages.map((s, i) => `<option value="${i}" ${i === g.stage ? "selected" : ""}>${i + 1}. ${s.name}</option>`).join("")}</select></div><div class="menu-row" style="margin-top:18px"><button data-act="refill">Refill supplies</button><button data-act="checkpoint">Checkpoint</button><button data-act="defaults">Reset defaults</button><button data-act="next">Next act →</button></div>`,
			'<button class="secondary" data-act="back">← Pause menu</button><button class="primary" data-act="resume">Test changes →</button>',
		);
		g.devUsed = true;
		for (const [k] of sliders)
			$(`t-${k}`).oninput = (e) => {
				g.tuning[k] = +e.target.value;
				$(`v-${k}`).value = e.target.value;
				g.applyTuning();
			};
		$("god").onchange = (e) => (g.god = e.target.checked);
		$("bot").onchange = (e) => (g.autopilot = e.target.checked);
		$("stage-select").onchange = (e) => {
			g.loadStage(+e.target.value);
			this.dev();
		};
	}
	about() {
		const c = window.JUNGLE_CREDITS || {},
			si = c.sourceInformation || {};
		const names = {
			date: "Date",
			source: "Source",
			plan: "Plan",
			genre: "Genre",
			perspective: "Perspective",
			tech: "Tech",
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
		const feedback = (name, arr) =>
			`<h3>${name}</h3><ol>${(arr || ["unknown"]).map((x) => `<li>${esc(x)}</li>`).join("")}</ol>`;
		this.modal(
			"about",
			"A SMALL GAME WITH A LARGE HAT",
			"About the expedition.",
			`<p>Jungle Zip is an original four-act arcade adventure inspired by <b>Jungle Hunt (1983)</b>. All models, animation, sound and music are made in code. No original game assets are used.</p><div class="credits-grid"><div><h3>Source Information</h3><dl>${Object.entries(
				names,
			)
				.map(([k, n]) => `<dt>${n}:</dt><dd>${esc(si[k] || "unknown")}</dd>`)
				.join(
					"",
				)}</dl><h3>Research notes</h3><p>The Atari instruction manual informed the four-trial structure, oxygen management and timed rescue. Reference screenshots informed jungle silhouettes and clear hazard shapes; retro comparisons informed the jaunty fanfare and percussion direction.</p><p><a href="https://atarionline.org/wp-content/uploads/2021/11/jungle-hunt-1982-atari-2600-instructions-manual.pdf" target="_blank" rel="noopener">Atari instruction manual</a> · <a href="https://atariage.com/screenshot_page.php?SoftwareLabelID=256" target="_blank" rel="noopener">Reference screenshots</a> · <a href="https://frgcb.blogspot.com/2020/04/jungle-hunt-taito-1982.html" target="_blank" rel="noopener">Sound comparison</a></p><h3>Built with</h3><p>Three.js r180 (MIT), Rapier 0.19.3 (Apache 2.0), Web Audio, Gamepad API, WebRTC and AI Hub Session Protocol v1 (client 1.4.0). Barlow Condensed and DM Sans are served by Google Fonts, with local fallbacks. Renderer: <b>${esc(this.g.scene.backend)}</b>.</p></div><div>${feedback("Testing Feedback", c.testingFeedback)}${feedback("Engine Feedback", c.engineFeedback)}${feedback("Prompt Feedback", c.promptFeedback)}<h3>Network field note</h3><p>AI Hub supports up to four ghost racers. Standalone direct races support two devices and exchange an invitation and answer. No account or game server is needed. Restrictive NATs may prevent a direct connection; relay support is not included. Physical controller and real phone behavior: unknown.</p></div></div>`,
			'<button class="secondary" data-act="back">← Back</button>',
			true,
		);
		if (this.g.net.hub)
			this.panel.querySelectorAll("a").forEach((a) => {
				a.removeAttribute("target");
				a.onclick = (e) => e.preventDefault();
			});
	}
	race() {
		this.modal(
			"race",
			"ADVENTURE IS BETTER WITH COMPANY",
			"A ghost of a chance.",
			`<p>Race a friend through the same four trials. Ghosts share the trail; every explorer keeps their own lives.</p><div class="connection-status" id="conn-status">${esc(this.g.net.status)}</div><div class="menu" style="margin:18px 0"><button id="host-race">Create an invitation <span>1</span></button><button id="join-race">Join with an invitation <span>2</span></button></div><div id="signal-area" class="hidden"><label for="signal-out" class="eyebrow" id="signal-label">SEND THIS TO YOUR FRIEND</label><textarea id="signal-out" readonly aria-label="Your connection invitation"></textarea><button class="secondary" id="copy-signal" style="font-size:18px;min-height:38px;padding:6px 12px;margin:8px 0">Copy to clipboard</button><label for="signal-in" class="eyebrow" id="signal-in-label">PASTE YOUR FRIEND’S ANSWER</label><textarea id="signal-in" aria-label="Friend’s connection information" placeholder="Paste the invitation or answer here"></textarea><button class="primary" id="apply-signal" style="margin-top:10px;width:100%">Connect →</button></div><button class="primary hidden" data-act="start-race" id="race-go" style="width:100%;margin-top:14px">Begin the race →</button><p class="tiny">Exchange codes using any messenger. Keep this page open. Direct WebRTC works where your networks allow it; no relay is provided. In AI Hub, 1–4 player sessions connect automatically.</p>`,
			'<button class="secondary" data-act="title">← Camp</button><button class="secondary" data-act="disconnect">Disconnect</button>',
		);
		const run = async (fn, button) => {
			button.disabled = true;
			try {
				await fn();
			} catch (e) {
				$("conn-status").textContent = e.message;
			} finally {
				button.disabled = false;
			}
		};
		$("host-race").onclick = (e) =>
			run(async () => {
				$("conn-status").textContent = "Gathering a route through the jungle…";
				const offer = await this.g.net.offer();
				$("signal-area").classList.remove("hidden");
				$("signal-out").value = offer;
				$("signal-label").textContent = "SEND THIS INVITATION";
				$("signal-in-label").textContent = "PASTE YOUR FRIEND’S ANSWER";
				$("conn-status").textContent =
					"Invitation ready. Your friend makes an answer.";
				$("apply-signal").onclick = (e) =>
					run(async () => {
						await this.g.net.accept($("signal-in").value);
						$("conn-status").textContent = "Connecting explorers…";
					}, e.currentTarget);
			}, e.currentTarget);
		$("join-race").onclick = () => {
			$("signal-area").classList.remove("hidden");
			$("signal-out").value = "";
			$("signal-label").textContent = "YOUR ANSWER WILL APPEAR HERE";
			$("signal-in-label").textContent = "PASTE THE HOST’S INVITATION";
			$("apply-signal").onclick = (e) =>
				run(async () => {
					const answer = await this.g.net.answer($("signal-in").value);
					$("signal-out").value = answer;
					$("signal-label").textContent = "SEND THIS ANSWER TO THE HOST";
					$("conn-status").textContent =
						"Answer ready. Send it back to the host.";
				}, e.currentTarget);
		};
		$("copy-signal").onclick = () => {
			const out = $("signal-out");
			out.select();
			navigator.clipboard
				?.writeText(out.value)
				.then(() => this.toast("Copied. Send it to your friend.", 3))
				.catch(() => this.toast("Select the code and copy it.", 3));
		};
	}
	updateConnection() {
		if (this.screen !== "race") return;
		const e = $("conn-status");
		if (e) e.textContent = this.g.net.status;
		const b = $("race-go");
		if (b)
			b.classList.toggle(
				"hidden",
				!this.g.net.connected || this.g.net.role !== "host",
			);
	}
	finish(won, message) {
		const g = this.g;
		const rank = won
			? g.health >= 4
				? "GOLDEN PITH HELMET"
				: g.health >= 2
					? "TRAILBLAZER"
					: "BY THE SKIN OF YOUR TEETH"
			: "A NOBLE BUNGLE";
		this.modal(
			"result",
			won ? "PROFESSOR PIP, SAFELY UNTANGLED" : "THE JUNGLE WINS THIS ROUND",
			won ? "Just in time for tea!" : "Hat’s all, folks.",
			`<div class="badge">${rank}</div><p>${esc(message)}</p><div class="split-stats"><div><strong>${g.score}</strong>Points</div><div><strong>${g.collected}</strong>Fireflies</div><div><strong>${Math.floor(g.elapsed / 60)}:${String(Math.floor(g.elapsed % 60)).padStart(2, "0")}</strong>Trail time</div></div><p class="tiny">${g.devUsed ? "Workshop expedition · personal record unchanged." : `Camp record: ${g.best} points.`} ${g.net.connected ? "Your result has been sent. Other explorers may still be on the trail." : ""}</p>`,
			g.net.hub
				? ""
				: `${won ? '<button class="secondary" data-act="loop">Harder expedition ↗</button>' : '<button class="primary" data-act="retry">Try again →</button>'}<button class="secondary" data-act="title">Back to camp</button>`,
		);
	}
	toast(text, seconds = 2.2) {
		$("toast").textContent = text;
		$("toast").classList.remove("hidden");
		this.toastLeft = seconds;
	}
	network(_status, peers) {
		const e = $("network-status");
		if (!this.g.net.connected || !peers.length) {
			e.classList.add("hidden");
			return;
		}
		e.classList.remove("hidden");
		e.textContent =
			"GHOST EXPEDITION\n" +
			peers
				.map(
					(p) =>
						`Explorer ${Number(p.id) + 1} · ${p.done ? "FINISHED" : `Act ${p.stage + 1}`} · ${p.score} pts`,
				)
				.join("\n");
	}
	hud() {
		const g = this.g,
			s = g.stages[g.stage];
		$("hud").classList.toggle(
			"hidden",
			["title", "hub-wait", "ended"].includes(g.mode),
		);
		$("attract").classList.toggle("hidden", !g.attract);
		$("chapter").textContent =
			`ACT 0${g.stage + 1} / 04  ·  ${g.loop ? `EXPEDITION ${g.loop + 1}` : "THE LOST TEA TRAIL"}`;
		$("stage-title").textContent = s.name;
		$("objective").textContent = s.goal;
		$("score").textContent = String(g.score).padStart(5, "0");
		$("hearts").textContent =
			"♥".repeat(Math.max(0, g.health)) + "♡".repeat(Math.max(0, 5 - g.health));
		$("timer").textContent =
			Math.floor(Math.ceil(g.timer) / 60) +
			":" +
			String(Math.ceil(g.timer) % 60).padStart(2, "0");
		$("air-wrap").classList.toggle("hidden", g.stage !== 1);
		$("air-text").textContent = `${Math.ceil(g.air)}%`;
		$("air-bar").style.width = `${g.air}%`;
		$("air-bar").classList.toggle("low", g.air < 30);
		$("hint").innerHTML =
			g.stage === 0
				? `${this.glyph("move")} move &nbsp; · &nbsp; <b>${this.glyph("jump")}</b> jump / release &nbsp; · &nbsp; gold rings catch automatically`
				: g.stage === 1
					? `${this.glyph("move")} swim &nbsp; · &nbsp; <b>${this.glyph("swat")}</b> swat &nbsp; · &nbsp; surface for air`
					: g.stage === 2
						? `<b>${this.glyph("jump")}</b> jump low stones &nbsp; · &nbsp; <b>${this.glyph("duck")}</b> duck high stones`
						: `<b>${this.glyph("jump")}</b> vault &nbsp; · &nbsp; <b>${this.glyph("swat")}</b> swat / hold at the wheel`;
		$("route").innerHTML = g.stages
			.map(
				(_, i) =>
					`<span class="route-dot ${i === g.stage ? "current" : i < g.stage ? "done" : ""}">${i < g.stage ? "✓" : i + 1}</span>`,
			)
			.join("");
		const context =
			(g.stage === 3 && Math.abs(g.position().x - 52) < 3) ||
			(g.stage === 1 &&
				g.scene.enemies.some(
					(e) => Math.abs(e.root.position.x - g.position().x) < 4,
				));
		$("touch-action").classList.toggle(
			"hidden",
			g.inputType !== "touch" || !context,
		);
		$("touch-action").textContent = g.stage === 3 ? "HOLD" : "SWAT";
	}
	tick(dt) {
		if (this.toastLeft > 0) {
			this.toastLeft -= dt;
			if (this.toastLeft <= 0) $("toast").classList.add("hidden");
		}
		this.hudTimer = (this.hudTimer || 0) + dt;
		if (this.hudTimer > 0.12) {
			this.hudTimer = 0;
			this.hud();
		}
	}
	navigate(dir) {
		if (this.screen === "about") {
			const modal = this.panel.querySelector(".modal");
			modal.scrollTop += dir * 200;
			return;
		}
		const controls = [
			...this.panel.querySelectorAll(
				"button:not(:disabled),input,select,textarea",
			),
		].filter((b) => b.offsetParent !== null);
		if (!controls.length) return;
		let i = controls.indexOf(document.activeElement);
		i = (i + dir + controls.length) % controls.length;
		controls[i].focus({ preventScroll: true });
		controls[i].scrollIntoView({ block: "nearest" });
		this.g.audio.sfx("menu");
	}
	adjust(dir) {
		const e = document.activeElement;
		if (e?.type === "range") {
			e.value = Math.min(
				+e.max,
				Math.max(+e.min, +e.value + dir * (+e.step || 1)),
			);
			e.dispatchEvent(new Event("input"));
		} else if (e?.tagName === "SELECT") {
			e.selectedIndex = Math.min(
				e.options.length - 1,
				Math.max(0, e.selectedIndex + dir),
			);
			e.dispatchEvent(new Event("change"));
		} else if (e?.type === "checkbox") {
			e.checked = !e.checked;
			e.dispatchEvent(new Event("change"));
		}
	}
	refreshPrompts() {
		this.panel.querySelectorAll("[data-prompt]").forEach((e) => {
			e.textContent = `${this.glyph(e.dataset.prompt)} →`;
		});
	}
	activate() {
		const e = this.panel.contains(document.activeElement)
			? document.activeElement
			: this.panel.querySelector("button:not(:disabled)");
		if (e?.type === "checkbox") {
			e.checked = !e.checked;
			e.dispatchEvent(new Event("change"));
		} else if (e?.tagName === "BUTTON") e.click();
	}
}
