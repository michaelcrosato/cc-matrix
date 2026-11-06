(function (S) {
	"use strict";
	class SiegeShell extends My3D2dge.Shell {
		back() {
			if (this.screen === "title") return this;
			return super.back();
		}
		_step() {
			const root = this.screen === "title",
				game = this._game,
				original = game.input;
			const world = this.app?.world;
			if (
				this.screen === "upgrade" &&
				world?.s.phase === "upgrade" &&
				!this.app.online
			) {
				const index = world.s.players.findIndex(
					(p) => !p.gone && p.choice === null,
				);
				if (index >= 0 && game.players[index]) game.input = game.players[index];
				game.input.suppress("pause");
			}
			try {
				super._step();
			} finally {
				game.input = original;
			}
			if (root && !this.screen && this.app?.mode === "title")
				this.app.ui.title();
		}

		_settingsRows(add) {
			for (const group of [
				["#SOUND", "sound", "music", "effects", "voice"],
				[
					"#FLIGHT & ACCESSIBILITY",
					"glyphs",
					"assistAim",
					"assistMove",
					"shake",
					"reducedFlashes",
				],
			])
				for (const key of group)
					add(
						key[0] === "#"
							? this._el("div", "esh-k esh-sec", key.slice(1))
							: this._row(key),
					);
		}
		_pauseActs(acts) {
			acts.push(
				["Settings", () => this.show("settings")],
				["Controls", () => this.show("controls")],
			);
			if (this.app) {
				acts.push(["Dev mode", () => this.app.ui.dev()]);
				if (!this.app.online)
					acts.push(["Return to command", () => this.app.title()]);
			}
		}
	}
	class Interface {
		constructor(app) {
			this.app = app;
			this.game = app.game;
			this.lastPhase = "";
			this.lastRadio = "";
			this.lastLabels = "";
			const game = this.game;
			this.shell = new SiegeShell(game, {
				tv: true,
				theme: {
					scale: () => Math.max(1, Math.min(2.15, innerWidth / 900)),
					font: '"Courier New", monospace',
					titleFont: 'Impact, "Arial Narrow", sans-serif',
					ink: "#f0dfb4",
					paper: "#0a1b29",
					accent: "#9ae5d7",
					muted: "#93adba",
					line: "#3b5663",
				},
				screens: {
					pause: { kicker: "FORTRESS COMMAND", title: "Tactical pause" },
				},
				settings: { onChange: (settings, key) => this.setting(key) },
			});
			this.shell.app = app;
			const custom = [
				{
					key: "voice",
					label: "Radio voice",
					type: "slider",
					value: 0.65,
					min: 0,
					max: 1,
					step: 0.05,
					apply: (g, v) => {
						g.audio.voiceVolume = v;
						g.audio.applyVolume();
					},
				},
				{
					key: "assistAim",
					label: "Aim assistance",
					type: "toggle",
					value: true,
					help: "Keyboard without a mouse and touch select a visible threat.",
				},
				{
					key: "assistMove",
					label: "Gentle thrust",
					type: "toggle",
					value: false,
				},
				{
					key: "reducedFlashes",
					label: "Reduced flashes",
					type: "toggle",
					value: false,
				},
				{
					key: "devGod",
					label: "Invulnerable pilots",
					type: "toggle",
					value: false,
				},
				{
					key: "devOverlays",
					label: "Collision & telegraphs",
					type: "toggle",
					value: false,
				},
				{
					key: "devRate",
					label: "Simulation rate",
					type: "slider",
					value: 1,
					min: 0.25,
					max: 4,
					step: 0.25,
					unit: " ×",
				},
				{
					key: "devAct",
					label: "Defensive line",
					type: "select",
					value: 0,
					options: [
						[0, "I / Perimeter"],
						[1, "II / Fortress"],
						[2, "III / Ground"],
					],
				},
				{
					key: "devWave",
					label: "Encounter",
					type: "select",
					value: 0,
					options: [
						[0, "First beat"],
						[1, "Second beat"],
						[2, "Third beat"],
					],
				},
				{
					key: "devBoss",
					label: "Boss phase",
					type: "select",
					value: 0,
					options: [
						[0, "Side batteries"],
						[1, "Tractor emitters"],
						[2, "Core"],
					],
				},
				{
					key: "devEnemy",
					label: "Spawn threat",
					type: "select",
					value: "hunter",
					options: Object.entries(S.ENEMIES).map(([k, v]) => [k, v.label]),
				},
			];
			for (const [key, label, value, min, max, step, unit] of S.BALANCE_SPEC)
				custom.push({
					key: "dev_" + key,
					label,
					type: "slider",
					value,
					min,
					max,
					step,
					unit,
					group: "Development",
				});
			for (const spec of custom) game.settings.define(spec);
			this.radio = document.getElementById("radio");
			this.prompt = document.getElementById("flight-help");
			this.pulse = document.getElementById("touch-pulse");
			this.boost = document.getElementById("touch-boost");
			this.pulse.onclick = () => {
				app.touchPulse = true;
			};
			this.boost.onclick = () => {
				app.touchBoost = true;
			};
			this.menuButton = document.getElementById("menu-toggle");
			this.menuButton.onclick = () => game.menu();
		}
		setting(key) {
			const app = this.app,
				w = app.world;
			if (!w) return;
			if (key === "devOverlays")
				w.s.options.overlays = !!this.game.settings.devOverlays;
			if (app.online && !app.online.info.isHost) return;
			if (key === "devGod" && w.s.options.god !== this.game.settings.devGod) {
				w.s.options.god = this.game.settings.devGod;
				w.s.modified = true;
			}
			if (key === "devRate" && !app.online) {
				app.simRate = this.game.settings.devRate;
				w.s.modified = true;
			}
			if (key.startsWith("dev_")) {
				const name = key.slice(4),
					value = this.game.settings[key];
				if (w.s.balance[name] !== value) w.balance(name, value);
			}
		}
		title() {
			this.lastPhase = "";
			this.shell.hide();
			this.shell.show("title", {
				name: "Space Fortnight",
				subtitle: "Three lines. One last stand.",
				actions: [
					["Play solo", () => this.app.startSolo()],
					["Couch co-op", () => this.join()],
					["Settings", () => this.shell.show("settings")],
					["About / Credits", () => this.about()],
				],
				footer: () =>
					`BEST ${String(this.app.best).padStart(7, "0")}  /  1–4 PILOTS`,
			});
			document.body.dataset.screen = "title";
			this.radio.hidden = true;
			this.prompt.hidden = true;
		}
		join() {
			this.app.mode = "join";
			this.app.enableJoin(true);
			this.shell.show("join", {
				kicker: "SHARED SCREEN / 2–4 PILOTS",
				title: "Assemble Viper wing",
				text: "Press Options on each extra controller to join. Keyboard pilot 2 can press 2. All pilots fly together.",
				sections: [["WING ROSTER", () => this.roster()]],
				actions: [
					["Launch wing", () => this.app.startCouch()],
					["Play solo", () => this.app.startSolo()],
					[
						"Back",
						() => {
							this.app.mode = "title";
							this.shell.back();
						},
					],
				],
				back: () => {
					this.app.mode = "title";
					this.app.title();
				},
			});
			// Readable roster is refreshed only after a join, preserving focused action.
			this.joinCount = this.game.players.length;
			this.refreshJoin();
			document.body.dataset.screen = "join";
		}
		roster() {
			return this.game.players
				.map(
					(I, i) =>
						`0${i + 1}  ${i === 0 ? "COMMAND PILOT" : I.half ? "KEYBOARD WING" : "CONTROLLER WING"}`,
				)
				.join("\n");
		}
		refreshJoin() {
			if (this.shell.screen !== "join") return;
			this.shell.show("join", {
				sections: [["WING ROSTER", this.roster()]],
				footer: `${this.game.players.length} of 4 seats ready. Solo is always available.`,
			});
		}
		about() {
			this.shell.show("about", {
				kicker: "FLIGHT RECORDER",
				title: "About / Credits",
				text: "An original siege inspired by Space Fortress (Century Electronics / CVS, 1981). Standalone co-op shares one screen; online co-op runs through AI Hub. Ranks and scoring are original to this sortie.",
				actions: [
					["Source Information", () => this.aboutPage("source", 0)],
					["Testing Feedback", () => this.aboutPage("testing", 0)],
					["Engine Feedback", () => this.aboutPage("engine", 0)],
					["Prompt Feedback", () => this.aboutPage("prompt", 0)],
					["Back", () => this.shell.back()],
				],
			});
		}
		aboutPage(kind, page) {
			const data = S.ABOUT;
			let sections, title;
			if (kind === "source") {
				const labels = {
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
				sections = Object.entries(data.sourceInformation).map(([k, v]) => [
					labels[k],
					v,
				]);
				title = "Source Information";
			} else {
				const questions = {
					testing: [
						"Issues caught",
						"Critical / game breaking",
						"Most helpful test",
						"Least helpful test",
					],
					engine: [
						"Liked most",
						"Stuck or guessed wrong",
						"Built ourselves",
						"Hardest engine task",
						"Engine changes",
						"One engine improvement",
					],
					prompt: [
						"Liked most",
						"Confusing",
						"Hardest task",
						"Suggested change",
					],
				};
				sections = data[kind + "Feedback"].map((value, i) => [
					questions[kind][i],
					value,
				]);
				title = kind[0].toUpperCase() + kind.slice(1) + " Feedback";
			}
			const size = 2,
				pages = Math.ceil(sections.length / size),
				slice = sections.slice(page * size, (page + 1) * size);
			const acts = [];
			if (page + 1 < pages)
				acts.push(["Next page", () => this.aboutPage(kind, page + 1)]);
			if (page > 0)
				acts.push(["Previous page", () => this.aboutPage(kind, page - 1)]);
			acts.push([
				"Credits index",
				() => {
					this.shell.back();
				},
			]);
			this.shell.show("credits", {
				kicker: `FLIGHT RECORDER / ${page + 1} OF ${pages}`,
				title,
				sections: slice,
				actions: acts,
			});
		}
		dev(page = 0) {
			const app = this.app,
				w = app.world;
			if (!w) return;
			const remote = app.online && !app.online.info.isHost;
			if (remote) {
				this.shell.show("dev", {
					kicker: "REMOTE TELEMETRY",
					title: "Flight diagnostics",
					text: `Host authority • seed ${w.s.seed} • tick ${w.s.tick}`,
					actions: [["Back", () => this.shell.back()]],
				});
				return;
			}
			if (page === 1 || page === 2) {
				const specs =
					page === 1 ? S.BALANCE_SPEC.slice(0, 6) : S.BALANCE_SPEC.slice(6);
				for (const [key] of specs)
					this.game.settings.set("dev_" + key, w.s.balance[key]);
				this.shell.show("tuning", {
					kicker: "LIVE BALANCE / MODIFIED RUN",
					title: page === 1 ? "Viper systems" : "Siege systems",
					rows: specs.map((s) => "dev_" + s[0]),
					actions: [
						[
							"Reset to defaults",
							() => {
								w.resetBalance();
								this.dev(page);
							},
						],
						["Back", () => this.shell.back()],
					],
				});
				return;
			}
			this.shell.show("dev", {
				kicker: "FLIGHT LAB / MODIFIED SCORES ARE NOT SAVED",
				title: "Developer command",
				text: () =>
					`Seed ${w.s.seed} • tick ${w.s.tick} • ${w.s.enemies.length} threats • ${w.s.shots.length} projectiles`,
				rows: ["devGod", "devOverlays", ...(!app.online ? ["devRate"] : [])],
				actions: [
					["Tune Viper systems", () => this.dev(1)],
					["Tune siege systems", () => this.dev(2)],
					["Encounter preview", () => this.encounter()],
					[
						"Refill / revive wing",
						() => {
							w.s.modified = true;
							for (const p of w.s.players)
								if (!p.gone) {
									p.hp = p.maxHp;
									p.energy = p.maxEnergy;
									p.pulse = 0;
									p.dead = 0;
									p.inv = 3;
								}
							this.shell.toast("WING REFILLED", "Modified run");
						},
					],
					...(!app.online
						? [
								[
									"Single simulation step",
									() => {
										for (const p of w.s.players)
											w.setIntent(p.id, S.neutral(++app.input.seq));
										w.step();
										this.dev();
									},
								],
							]
						: []),
					[
						"Reset to defaults",
						() => {
							w.resetBalance();
							app.simRate = 1;
							this.game.settings.set("devRate", 1);
							this.game.settings.set("devGod", false);
							w.s.options.god = false;
							this.dev();
						},
					],
					["Back", () => this.shell.back()],
				],
			});
			document.body.dataset.screen = "dev";
		}
		encounter() {
			const app = this.app,
				w = app.world;
			this.shell.show("encounter", {
				kicker: "AUTHORING PREVIEW",
				title: "Deploy a test encounter",
				rows: ["devAct", "devWave", "devBoss", "devEnemy"],
				actions: [
					[
						"Jump to act / wave",
						() => {
							w.jump(this.game.settings.devAct, this.game.settings.devWave);
							app.afterJump();
						},
					],
					[
						"Jump to boss phase",
						() => {
							w.jump(2, 2, this.game.settings.devBoss);
							app.afterJump();
						},
					],
					[
						"Spawn selected threat",
						() => {
							w.s.modified = true;
							w.spawn(this.game.settings.devEnemy, 480, 140);
							this.shell.toast(
								"THREAT DEPLOYED",
								S.ENEMIES[this.game.settings.devEnemy].label,
							);
						},
					],
					["Back", () => this.shell.back()],
				],
			});
		}
		upgrade() {
			const app = this.app,
				w = app.world,
				s = w.s;
			const players = app.online
				? s.players.filter((p) => p.id === app.online.info.me && !p.gone)
				: s.players.filter((p) => !p.gone);
			const p = players.find((p) => p.choice === null);
			if (!p) {
				this.shell.show("upgrade", {
					kicker: "WING SYSTEMS",
					title: "Loadout confirmed",
					text: "Waiting for the rest of the wing. Unanswered choices receive Lance Array when the countdown ends.",
					actions: [],
					back: () => {},
				});
				return;
			}
			const actions = S.UPGRADES.map((u, i) => [
				`${u.title}  /  ${u.stat}`,
				() => {
					if (app.online) app.online.choose(i);
					else w.upgrade(p.id, i);
					this.upgrade();
				},
			]);
			this.shell.show("upgrade", {
				kicker: `INTERMISSION ${s.upgrades} / PILOT ${s.players.indexOf(p) + 1}`,
				title: "Take one advantage.",
				text: "Each pilot chooses independently. Your tools keep their controls.",
				sections: S.UPGRADES.map((u) => [u.title, u.text]),
				actions,
				back: () => {},
				footer: `Automatic Lance Array in ${Math.ceil(s.phaseTime)} seconds.`,
			});
			document.body.dataset.screen = "upgrade";
		}
		results() {
			const app = this.app,
				s = app.world.s,
				r = s.result;
			if (!r) return;
			const medals = [
				["Outer perimeter held", !!s.outcomes[0]?.held],
				["Fortress evacuated", !!s.outcomes[1]?.held],
				["Siege ship defeated", r.won],
			];
			this.shell.hide();
			this.shell.show("results", {
				kicker: r.won
					? "FORTRESS COMMAND / TRANSMISSION ENDS"
					: "FORTRESS COMMAND / WING LOST",
				title: r.won ? "The sky is ours." : "The line is silent.",
				text: r.won
					? "Viper wing, return to Fortress 13. You have earned your stars."
					: r.reason + ". Your next sortie begins at the perimeter.",
				stats: [
					[String(r.score).padStart(7, "0"), "TEAM SCORE"],
					[r.rank, "FIELD PROMOTION"],
					[
						`${Math.floor(r.time / 60)}:${String(r.time % 60).padStart(2, "0")}`,
						"ACTIVE TIME",
					],
				],
				medals,
				footer: r.modified
					? "MODIFIED RUN / BEST SCORE NOT RECORDED"
					: `BEST ${String(app.best).padStart(7, "0")}`,
				actions: app.online
					? []
					: [
							["Fly again", () => app.retry()],
							["Return to command", () => app.title()],
						],
				back: () => {
					if (!app.online) app.title();
				},
			});
			document.body.dataset.screen = "results";
		}
		tick() {
			const app = this.app,
				s = app.world?.s,
				screen = this.shell.screen;
			document.body.classList.toggle(
				"touch-input",
				this.game.input.lastDevice === "touch",
			);
			this.menuButton.hidden =
				!!this.shell.screen ||
				app.mode === "title" ||
				app.mode === "join" ||
				app.attract ||
				app.online?.ended ||
				!s;
			if (app.mode === "join" && this.game.players.length !== this.joinCount) {
				this.joinCount = this.game.players.length;
				this.refreshJoin();
			}
			if (!s) return;
			if (s.result) app.presentResult();
			if (!app.online && this.game.scenes?.play)
				this.game.scenes.play.pausable = s.phase === "play";
			if (s.phase !== this.lastPhase) {
				const was = this.lastPhase;
				this.lastPhase = s.phase;
				if (s.phase === "upgrade" && !app.attract) this.upgrade();
				else if (was === "upgrade") this.shell.hide();
				if (s.phase === "result" && !app.attract) {
					if (app.celebration && app.celebration.age < 1)
						this.resultPending = true;
					else this.results();
				}
			}
			if (
				this.resultPending &&
				s.phase === "result" &&
				(!app.celebration || app.celebration.age >= 1)
			) {
				this.resultPending = false;
				this.results();
			}
			if (s.phase !== "result") this.resultPending = false;
			if (screen === "upgrade" && s.phase === "upgrade") {
				const footer = this.shell.root?.querySelector(
					".esh-mod > .esh-m:last-child",
				);
				if (footer)
					footer.textContent = `Automatic Lance Array in ${Math.ceil(s.phaseTime)} seconds.`;
			}
			const visible = !this.shell.screen && !app.attract && !app.online?.ended;
			this.radio.hidden = !visible || s.t > s.radioUntil;
			if (s.radio !== this.lastRadio) {
				this.lastRadio = s.radio;
				this.radio.querySelector("p").textContent = s.radio;
			}
			const lesson = app.world.s.boss
				? "Read the wind-up. Shoot the bright exposed components."
				: S.WAVES[s.wave]?.lesson || "";
			const labels = app.input.labels(),
				key = JSON.stringify([labels, lesson]);
			if (key !== this.lastLabels) {
				this.lastLabels = key;
				this.prompt.replaceChildren();
				const p = document.createElement("p");
				p.textContent = lesson;
				this.prompt.append(p);
				const row = document.createElement("div");
				for (const [k, v] of labels) {
					const span = document.createElement("span"),
						kbd = document.createElement("kbd");
					kbd.textContent = k;
					span.append(kbd, document.createTextNode(" " + v));
					row.append(span);
				}
				this.prompt.append(row);
			}
			this.prompt.hidden = !visible || s.waveTime > 7 || s.phase !== "play";
			const me = s.players.find(
					(p) => p.id === (app.online ? app.online.info.me : 0),
				),
				touch = this.game.input.lastDevice === "touch";
			const portrait = innerHeight > innerWidth;
			if (portrait && visible) {
				const dangerLabel =
					s.act === 1
						? `HEAT ${Math.round(s.heat)}%`
						: s.act === 2
							? `BASE ${Math.ceil(s.base)}%`
							: `BEAT ${s.wave + 1} / 3`;
				this.shell.hud({
					objective: {
						step: `DEFENSIVE LINE ${S.ACTS[s.act].code}`,
						title: S.ACTS[s.act].name,
					},
					status: {
						text: dangerLabel,
						color: s.act === 1 && s.heat > 65 ? "#ec8b79" : "#9ae5d7",
					},
					counts: [
						["SCORE", s.score],
						["HULL", me ? `${me.hp}/${me.maxHp}` : "WING"],
					],
				});
			} else this.shell.hud({});
			const choices = JSON.stringify(s.players.map((p) => p.choice));
			if (
				s.phase === "upgrade" &&
				!app.attract &&
				choices !== this.lastChoices
			) {
				this.lastChoices = choices;
				this.upgrade();
			}
			const danger =
				me &&
				(s.shots.some((b) => b.foe && S.dist(b, me) < 145) ||
					s.enemies.some(
						(e) =>
							e.kind === "tractor" &&
							e.target === me.id &&
							e.wind > 0 &&
							e.wind < 3.1 &&
							S.dist(e, me) < 270,
					));
			this.pulse.hidden = !(
				visible &&
				touch &&
				me &&
				me.hp > 0 &&
				me.pulse <= 0 &&
				danger
			);
			this.boost.hidden = !(
				visible &&
				touch &&
				me &&
				me.energy >= 28 &&
				s.enemies.some(
					(e) => e.kind === "anchor" && e.charge <= 0 && S.dist(e, me) < 160,
				)
			);
		}
	}
	Object.assign(S, { Interface, SiegeShell });
})(globalThis.Fortnight);
