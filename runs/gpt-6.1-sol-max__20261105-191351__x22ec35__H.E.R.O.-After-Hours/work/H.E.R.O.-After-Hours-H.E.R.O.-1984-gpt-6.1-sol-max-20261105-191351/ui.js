import credits from "./credits.json";
export const $ = (id) => document.getElementById(id);
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
		"How many were critical or game breaking?",
		"Most helpful test",
		"Least helpful test",
	],
	engineFeedback: [
		"What did you like most about the engine?",
		"Did you get stuck or guess wrong?",
		"Most important system built yourself",
		"Hardest part of the engine",
		"Engine changes",
		"One thing to change",
	],
	promptFeedback: [
		"What did you like most?",
		"What was confusing?",
		"Hardest thing to do",
		"What would you change?",
	],
};
export class UI {
	constructor(game) {
		this.g = game;
		this.page = "title";
		this.origin = "title";
		this.focus = 0;
		this.creditTab = "sourceInformation";
		this.onAction = null;
		document.addEventListener("click", (e) => {
			const b = e.target.closest("button[data-action]");
			if (b && !b.disabled) this.action(b.dataset.action, b.dataset.value);
		});
		document.addEventListener("pointerover", (e) => {
			const b = e.target.closest("button,input");
			if (b) {
				this.focusTo(b, false);
			}
		});
		document.addEventListener("input", (e) => {
			const t = e.target;
			if (t.dataset.setting) {
				game.settings[t.dataset.setting] = +t.value;
				game.sound.apply();
				this.updateOutputs();
				game.saveSettings();
			}
			if (t.dataset.variable) {
				game.tuning[t.dataset.variable] = +t.value;
				this.updateOutputs();
			}
		});
	}
	glyph(key) {
		if (this.g.inputKind === "touch")
			return (
				'<b class="glyph">' +
				{
					fly: "RIGHT THUMB",
					fire: "AUTO",
					bomb: "✹",
					move: "LEFT THUMB",
					pause: "Ⅱ",
					aim: "AUTO",
					ok: "TAP",
					back: "‹",
				}[key] +
				"</b>"
			);
		const pad = this.g.inputKind === "pad",
			x = this.g.settings.glyphs === "xbox";
		const m = pad
			? x
				? {
						fly: "A",
						fire: "RT",
						bomb: "X",
						move: "LS",
						pause: "☰",
						aim: "RS",
						ok: "A",
						back: "B",
					}
				: {
						fly: "✕",
						fire: "R2",
						bomb: "□",
						move: "L",
						pause: "OPTIONS",
						aim: "R",
						ok: "✕",
						back: "○",
					}
			: {
					fly: "SPACE",
					fire: "F / LMB",
					bomb: "E",
					move: "WASD",
					pause: "ESC",
					aim: "MOUSE",
					ok: "ENTER",
					back: "ESC",
				};
		return '<b class="glyph">' + m[key] + "</b>";
	}
	prompts() {
		$("controls-strip").innerHTML =
			"<span>" +
			this.glyph("move") +
			" Move</span><span>" +
			this.glyph("fly") +
			" Fly / hover</span><span>" +
			this.glyph("fire") +
			" Helmet laser</span><span>" +
			this.glyph("bomb") +
			" Dynamite</span><span>" +
			this.glyph("pause") +
			" Pause</span>";
		$("title-prompt").innerHTML =
			this.glyph("ok") +
			' Select <span style="margin-left:1.4em">' +
			this.glyph("move") +
			" Navigate</span>";
	}
	buttons() {
		const root = this.page === "title" ? $("title") : $("panel");
		return [...root.querySelectorAll("button:not(:disabled),input")].filter(
			(b) => b.offsetParent !== null,
		);
	}
	focusTo(b, scroll = true) {
		for (const el of document.querySelectorAll(".focused"))
			el.classList.remove("focused");
		const list = this.buttons();
		this.focus = Math.max(0, list.indexOf(b));
		if (b?.tagName === "BUTTON") b.classList.add("focused");
		if (scroll) b?.scrollIntoView({ block: "nearest" });
	}
	first() {
		this.focus = 0;
		const b = this.buttons()[0];
		this.focusTo(b, false);
	}
	navigate(d) {
		const bs = this.buttons();
		if (!bs.length) return;
		this.focus = (this.focus + d + bs.length) % bs.length;
		this.focusTo(bs[this.focus]);
		this.g.sound.play("menu");
	}
	horizontal(d) {
		const b = this.buttons()[this.focus];
		if (b?.tagName === "INPUT") {
			b.value = String(
				Math.min(+b.max, Math.max(+b.min, +b.value + d * (+b.step || 1))),
			);
			b.dispatchEvent(new Event("input", { bubbles: true }));
			b.focus({ preventScroll: true });
		} else this.navigate(d);
	}
	select() {
		const b = this.buttons()[this.focus];
		if (b?.tagName === "BUTTON") b.click();
	}
	action(a, v) {
		this.g.sound.unlock();
		this.g.sound.play("menu");
		if (a === "solo" || a === "coop") {
			this.g.start(a === "coop" ? 2 : 1);
			return;
		}
		if (a === "pause") {
			this.g.pause();
			return;
		}
		if (a === "resume") {
			this.g.resume();
			return;
		}
		if (a === "title") {
			if (!this.g.hubActive) this.g.title();
			return;
		}
		if (a === "next") {
			this.g.nextLevel();
			return;
		}
		if (a === "retry") {
			if (!this.g.hubActive) this.g.start(this.g.localPlayers);
			return;
		}
		if (a === "back") {
			this.back();
			return;
		}
		if (a === "tab") {
			this.creditTab = v;
			this.show("credits", false);
			this.focusTo($("panel").querySelector(`[data-value="${v}"]`));
			return;
		}
		if (a === "toggle") {
			if (v === "glyphs") {
				this.g.settings.glyphs =
					this.g.settings.glyphs === "ps" ? "xbox" : "ps";
				this.g.saveSettings();
				this.prompts();
				this.show("settings", false);
			} else {
				this.g.tuning[v] = !this.g.tuning[v];
				this.show("dev", false);
			}
			return;
		}
		if (a === "refill") {
			this.g.refill();
			this.g.toast("Equipment restored. Splendid.");
			return;
		}
		if (a === "skip") {
			this.g.forceRescue();
			return;
		}
		if (a === "warp") {
			this.g.loadLevel(+v);
			this.g.resume();
			return;
		}
		if (a === "reset-dev") {
			Object.assign(this.g.tuning, this.g.defaults);
			this.show("dev", false);
			return;
		}
		if (a === "reset-settings") {
			Object.assign(this.g.settings, {
				master: 0.7,
				music: 0.1,
				effects: 0.8,
				glyphs: "ps",
				shake: 0.7,
			});
			this.g.sound.apply();
			this.g.saveSettings();
			this.show("settings", false);
			return;
		}
		if (a === "fullscreen") {
			document.fullscreenElement
				? document.exitFullscreen?.()
				: document.documentElement.requestFullscreen?.().catch(() => {});
			return;
		}
		this.show(a);
	}
	hide() {
		this.page = "game";
		$("overlay").classList.add("hidden");
		$("title").classList.add("hidden");
	}
	show(page, remember = true) {
		if (remember && ["title", "pause"].includes(this.page))
			this.origin = this.page;
		this.page = page;
		$("overlay").classList.toggle(
			"hidden",
			page === "title" || page === "game",
		);
		$("title").classList.toggle("hidden", page !== "title");
		if (page === "title") {
			this.first();
			this.prompts();
			return;
		}
		const p = $("panel");
		p.className =
			"panel" +
			(page === "pause"
				? " narrow"
				: ["dev", "credits"].includes(page)
					? " wide"
					: "");
		const top = (tiny, title, body = "") =>
			'<div class="tiny">' + tiny + "</div><h2>" + title + "</h2>" + body;
		const button = (a, text, extra = "", cls = "") =>
			'<button class="' +
			cls +
			'" data-action="' +
			a +
			'" ' +
			extra +
			">" +
			text +
			"</button>";
		const back = () => button("back", this.glyph("back") + " Back", "", "back");
		if (page === "pause")
			p.innerHTML =
				top(
					"TAKE A BREATHER",
					"SHIFT PAUSED",
					this.g.hubActive
						? "<p>Your colleagues are still working.</p>"
						: "<p>The mountain can wait. Briefly.</p>",
				) +
				'<div class="menu">' +
				button("resume", "Resume shift", "", "primary") +
				button("guide", "Field guide") +
				button("settings", "Settings") +
				button(
					"dev",
					"Dev bench",
					this.g.hubActive && !this.g.authority ? "disabled" : "",
				) +
				button("credits", "About & credits") +
				(this.g.hubActive ? "" : button("title", "Clock out")) +
				"</div>";
		if (page === "guide")
			p.innerHTML =
				top("THE RESCUER’S POCKET HANDBOOK", "A LITTLE LIFT GOES A LONG WAY") +
				'<div class="guide-grid">' +
				[
					[
						"PROP-PACK",
						this.glyph("move") +
							" Move · " +
							this.glyph("fly") +
							" hold to rise, release to fall. Feather the thrust to hover. Up on the stick also flies.",
					],
					[
						"MICROLASER",
						this.glyph("fire") +
							" Hold to fire (J also works in solo). Mouse or right stick aims. Lasers melt barricades slowly; power is precious.",
					],
					[
						"DYNAMITE",
						this.glyph("bomb") +
							" Plant a charge near a wall, then retreat beyond the warning circle. Your own blast hurts. Six sticks per descent.",
					],
					[
						"RESCUES & RESERVES",
						"Stay close to a miner for a moment. Rescue balloons do the rest. Rescues refill power and set a checkpoint. All miners unlock the next descent.",
					],
					[
						"MOUNTAIN ETIQUETTE",
						"Avoid critters, glowing hot rock, lava and crushing gates. Ride the moving raft. Tentacles cannot be shot. Don’t shoot the lamps; your headlamp is a poor substitute.",
					],
					[
						"COLLEAGUES WELCOME",
						"Standalone: two pilots share a screen. P1 uses WASD, Space, F and E; P2 uses IJKL, N and M. Two pads also work. AI Hub: 1–4 pilots share the same rescue. Touch: left thumb moves, right thumb flies; laser assists.",
					],
				]
					.map(
						([h, b]) =>
							'<div class="guide-card"><b>' + h + "</b><p>" + b + "</p></div>",
					)
					.join("") +
				"</div>" +
				back();
		if (page === "settings") {
			const row = (key, label) =>
				'<div class="settings-row"><label for="s-' +
				key +
				'">' +
				label +
				'</label><div class="slider-wrap"><input id="s-' +
				key +
				'" aria-label="' +
				label +
				'" data-setting="' +
				key +
				'" type="range" min="0" max="1" step=".05" value="' +
				this.g.settings[key] +
				'"><output data-output-setting="' +
				key +
				'"></output></div></div>';
			p.innerHTML =
				top("MAKE YOURSELF COMFORTABLE", "SETTINGS") +
				row("master", "Master volume") +
				row("music", "Music volume") +
				row("effects", "Effects & voices") +
				row("shake", "Screen shake") +
				'<div class="settings-row"><span>Controller prompts</span>' +
				button(
					"toggle",
					this.g.settings.glyphs === "ps"
						? "PlayStation  ✕ ○ □ △"
						: "Xbox  A B X Y",
					'data-value="glyphs"',
				) +
				'</div><div class="settings-row"><span>Display</span>' +
				button("fullscreen", "Toggle fullscreen") +
				'</div><div class="dev-buttons">' +
				button("reset-settings", "Reset defaults") +
				"</div>" +
				back();
			this.updateOutputs();
		}
		if (page === "dev") {
			const vars = [
				["speed", "Run speed", 3, 12, 0.2],
				["lift", "Rotor lift", 7, 28, 0.5],
				["gravity", "Gravity", 6, 28, 0.5],
				["drain", "Power drain", 0, 2, 0.05],
				["fuse", "Fuse seconds", 0.4, 3, 0.1],
				["blast", "Blast radius", 1, 7, 0.1],
				["enemy", "Enemy tempo", 0, 2.5, 0.1],
			];
			p.innerHTML =
				top(
					"LIVE TUNING / CHANGES APPLY IMMEDIATELY",
					"THE DEV BENCH",
					"<p>Resume to try changes. Dev tools mark this shift as a practice run.</p>",
				) +
				'<div class="dev-grid">' +
				vars
					.map(
						([k, n, min, max, step]) =>
							'<div class="dev-row"><label for="v-' +
							k +
							'">' +
							n +
							'</label><div class="slider-wrap"><input id="v-' +
							k +
							'" type="range" min="' +
							min +
							'" max="' +
							max +
							'" step="' +
							step +
							'" value="' +
							this.g.tuning[k] +
							'" data-variable="' +
							k +
							'" aria-label="' +
							n +
							'"><output data-output-variable="' +
							k +
							'"></output></div></div>',
					)
					.join("") +
				'<div class="dev-row"><span>Invulnerable</span>' +
				button(
					"toggle",
					this.g.tuning.invincible ? "ON" : "OFF",
					'data-value="invincible"',
				) +
				'</div><div class="dev-row"><span>No clip</span>' +
				button(
					"toggle",
					this.g.tuning.noclip ? "ON" : "OFF",
					'data-value="noclip"',
				) +
				'</div></div><div class="dev-buttons">' +
				button("refill", "Refill equipment") +
				button("skip", "Secure remaining miners") +
				button("reset-dev", "Reset balance") +
				'</div><div class="dev-buttons">' +
				this.g.levels
					.map((l, i) =>
						button(
							"warp",
							"0" + (i + 1) + " · " + esc(l.name),
							'data-value="' + i + '"',
						),
					)
					.join("") +
				'</div><p style="font-size:.7em;margin-top:2vh">' +
				esc(this.g.art.backend || "unknown") +
				" · Three.js r180 · Rapier 0.19.3 · " +
				this.g.art.mixers.length +
				" native animation mixers</p>" +
				back();
			this.g.practice = true;
			this.updateOutputs();
		}
		if (page === "credits") {
			const tab = this.creditTab;
			let content = "";
			if (tab === "sourceInformation")
				content =
					"<dl>" +
					Object.entries(credits.sourceInformation)
						.map(
							([k, v]) =>
								"<dt>" +
								esc(k.replace(/([A-Z])/g, " $1")) +
								"</dt><dd>" +
								esc(v) +
								"</dd>",
						)
						.join("") +
					'</dl><p>Research: <a href="https://static.atariage.com/manual_html_page.php?SoftwareLabelID=228" ' +
					(this.g.hubActive ? "" : 'target="_blank" rel="noopener"') +
					'>original Activision manual</a> · <a href="https://www.atarimania.com/games/atari-2600-games-h-e-r-o-19482" ' +
					(this.g.hubActive ? "" : 'target="_blank" rel="noopener"') +
					">Atarimania</a></p><p>Original procedural game, models, writing, animation and sound. H.E.R.O. belongs to its respective rights holders. Three.js: MIT. Rapier: Apache-2.0. Unmodified AI Hub session client 1.4.0 embedded.</p>";
			else
				content = credits[tab]
					.map(
						(a, i) =>
							'<div class="feedback-item"><b>' +
							esc(questions[tab][i]) +
							"</b>" +
							esc(a) +
							"</div>",
					)
					.join("");
			p.innerHTML =
				top("THE NIGHT SHIFT ROLL CALL", "ABOUT & CREDITS") +
				'<div class="tabs">' +
				[
					["sourceInformation", "Source information"],
					["testingFeedback", "Testing feedback"],
					["engineFeedback", "Engine feedback"],
					["promptFeedback", "Prompt feedback"],
				]
					.map(([k, n]) =>
						button(
							"tab",
							n,
							'data-value="' + k + '"',
							tab === k ? "active" : "",
						),
					)
					.join("") +
				'</div><div class="credits-content">' +
				content +
				"</div>" +
				back();
		}
		if (page === "debrief") {
			const n = this.g.levels[this.g.levelIndex].miners.length;
			p.innerHTML =
				top(
					"DESCENT " + (this.g.levelIndex + 1) + " COMPLETE",
					"EVERYBODY ACCOUNTED FOR.",
					"<p>" +
						esc(
							[
								"A textbook rescue. If the textbook were slightly singed.",
								"Lights optional. Heroism compulsory.",
								"One river crossed. Not a single boat licence.",
								"The mountain may now close for the evening.",
							][this.g.levelIndex],
						) +
						"</p>",
				) +
				'<div class="results"><div><strong>' +
				n +
				"</strong><span>MINERS SECURED</span></div><div><strong>" +
				this.g.totalScore().toLocaleString() +
				"</strong><span>SHIFT SCORE</span></div><div><strong>" +
				Math.floor(this.g.elapsed) +
				'</strong><span>SECONDS ON SHIFT</span></div></div><div class="menu">' +
				button(
					"next",
					this.g.levelIndex === 3
						? "Clock out in style"
						: "Next descent  " + this.glyph("ok"),
					"",
					"primary",
				) +
				"</div>";
		}
		if (page === "victory" || page === "gameover") {
			const win = page === "victory";
			p.innerHTML =
				top(
					win
						? "MOUNT EMBER RESCUE COMPANY / SHIFT REPORT"
						: "SHIFT REPORT / EQUIPMENT CLAIM",
					win ? "NIGHT SAVED. OVERTIME EARNED." : "A BRIEF CAREER SETBACK.",
					"<p>" +
						esc(
							win
								? "Eight miners home. One propeller still attached. I call that professional."
								: "The mountain has made its point. Shall we make ours?",
						) +
						"</p>",
				) +
				'<div class="badge">' +
				(win ? "CERTIFIED AFTER-HOURS H.E.R.O." : "NEXT SHIFT, SAME COURAGE") +
				'</div><div class="results"><div><strong>' +
				this.g.totalRescued +
				"/8</strong><span>MINERS HOME</span></div><div><strong>" +
				this.g.totalScore().toLocaleString() +
				"</strong><span>" +
				(this.g.practice ? "PRACTICE SCORE" : "SHIFT SCORE") +
				"</span></div><div><strong>" +
				this.g.best.toLocaleString() +
				'</strong><span>PERSONAL BEST</span></div></div><div class="menu">' +
				(this.g.hubActive
					? "<p>The Hub has your shift report.</p>"
					: button("retry", "Take another shift", "", "primary") +
						button("title", "Back to title")) +
				"</div>";
		}
		if (this.g.hubActive)
			for (const a of p.querySelectorAll("a"))
				a.addEventListener("click", (e) => e.preventDefault());
		this.first();
	}
	updateOutputs() {
		for (const e of document.querySelectorAll("[data-output-setting]"))
			e.textContent =
				Math.round(this.g.settings[e.dataset.outputSetting] * 100) + "%";
		for (const e of document.querySelectorAll("[data-output-variable]"))
			e.textContent = Number(this.g.tuning[e.dataset.outputVariable])
				.toFixed(2)
				.replace(/0$/, "");
	}
	back() {
		if (this.page === "debrief") return;
		if (this.page === "victory" || this.page === "gameover") {
			if (!this.g.hubActive) this.g.title();
			return;
		}
		if (this.page === "pause") this.g.resume();
		else if (this.page === "title") return;
		else if (this.origin === "title") {
			this.g.state = "title";
			this.show("title");
			this.g.idleAt = performance.now();
		} else this.show("pause");
	}
}
export { credits };
