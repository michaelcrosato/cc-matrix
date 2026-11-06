(function (S) {
	"use strict";
	const E = My3D2dge;
	class App {
		constructor(info) {
			this.online = null;
			this.mode = info ? "hub" : "title";
			this.attract = false;
			this.simRate = 1;
			this.acc = 0;
			this.epoch = 0;
			this.best = Number(E.store.get("space-fortnight-best", 0)) || 0;
			this.best = Number.isFinite(this.best) ? Math.max(0, this.best) : 0;
			const server = !!info?.server;
			this.game = new E.Game({
				id: "space-fortnight-v1",
				canvas: "screen",
				res: [S.W, S.H],
				expand: false,
				view: "overhead",
				views: ["overhead"],
				input: S.MAP,
				headless: server,
				draw: false,
				loop: !info,
				live: !!info,
				autoPause: !info,
				corner: false,
				fullscreen: "button",
				backGesture: false,
				bg: "#07141f",
				menu: {
					quit: false,
					controls: { fire: "Laser", boost: "Boost", pulse: "Defensive pulse" },
					settings: [
						{ key: "music", value: 0.1 },
						{
							key: "glyphs",
							value: "playstation",
							options: [
								["playstation", "PlayStation"],
								["xbox", "Xbox"],
							],
						},
					],
				},
			});
			const game = this.game;
			game.fadeTime = 0;
			game.cam.smooth = 0;
			game.cam.bounds = null;
			game.focus(480, 270, 0);
			game.lights.enabled = true;
			game.lights.ambient = 0.84;
			this.sound = new S.Sound(game);
			if (!server) {
				this.painter = new S.Painter(game);
				this.input = new S.IntentInput(this);
				this.ui = new S.Interface(this);
				game.settings.set("scale", "fill");
				const style = document.createElement("style");
				style.textContent = S.CSS;
				document.head.append(style);
				game.hook("input", () => {
					this.input.pollActivity();
					if (performance.now() < (this.blockInputUntil || 0))
						for (const I of game.players) for (const a in I.map) I.suppress(a);
					this.ui.tick();
					this.checkIdle();
					if (game.paused && !this.online) this.sound.mode(null, true);
				});
			}
			const scenes = {
				title: {
					pausable: false,
					view: "overhead",
					res: [S.W, S.H],
					expand: false,
					camera: { zoom: false },
					enter: () => {
						game.focus(480, 270, 0);
					},
					update: () => {
						this.sound.mode("title");
					},
					draw: (r) => this.painter?.title(r, game.time),
				},
				play: {
					pausable: true,
					view: "overhead",
					res: [S.W, S.H],
					expand: false,
					camera: { zoom: false },
					update: (dt) => this.update(dt),
					draw: (r) => this.draw(r),
				},
			};
			game.start({ scenes, scene: info ? "play" : "title" });
			if (info) {
				this.online = new S.Online(this, info);
				if (!server) this.ui.shell.hide();
				let last = performance.now();
				this.timer = setInterval(() => {
					const now = performance.now(),
						elapsed = (now - last) / 1000;
					last = now;
					if (this.online.ended) return;
					try {
						game.advance(elapsed, { draw: false });
					} catch (e) {
						game.fail("session clock", e);
					}
				}, 16);
				if (!server) {
					const render = () => {
						if (game.disposed) return;
						try {
							game.advance(0, { draw: true });
						} catch (e) {
							game.fail("session draw", e);
						}
						this.raf = requestAnimationFrame(render);
					};
					this.raf = requestAnimationFrame(render);
				}
			} else this.title();
			this.installDebug();
			globalThis.__game = game;
			globalThis.__fortnight = this;
			document.documentElement.dataset.game = "space-fortnight";
		}
		enableJoin(on) {
			this.game.allowJoin(
				on
					? {
							max: 4,
							onJoin: (I) => {
								I.use(I.half ? E.Input.halfKeys(S.MAP, "right") : S.MAP);
								this.ui?.refreshJoin();
							},
						}
					: false,
			);
		}
		title() {
			if (this.online) return;
			this.attract = false;
			this.mode = "title";
			this.world = null;
			this.simRate = 1;
			this.acc = 0;
			this.sound.reset();
			this.input?.clear();
			this.game.paused = false;
			this.game.timeScale = 1;
			this.enableJoin(false);
			while (this.game.players.length > 1)
				this.game.removePlayer(this.game.players.length);
			this.game.input.use(S.MAP);
			this.game.go("title", null, { fade: 0 });
			this.input.lastActivity = performance.now();
			this.ui?.title();
			this.sound.mode("title");
		}
		startSolo() {
			if (this.online) return;
			this.enableJoin(false);
			while (this.game.players.length > 1)
				this.game.removePlayer(this.game.players.length);
			this.game.input.use(S.MAP);
			this.start([
				{ id: 0, name: "VIPER 01", color: S.ASSETS.playerColors[0] },
			]);
		}
		startCouch() {
			if (this.online) return;
			this.enableJoin(false);
			this.start(
				this.game.players.map((I, i) => ({
					id: i,
					name: `VIPER 0${i + 1}`,
					color: S.ASSETS.playerColors[i],
				})),
			);
		}
		start(players, attract = false) {
			this.sound.reset();
			this.ui.shell.hide();
			this.game.paused = false;
			this.simRate = 1;
			this.acc = 0;
			this.attract = attract;
			this.attractAge = 0;
			this.attractStage = 0;
			this.world = new S.World({
				players,
				seed: 198113,
				epoch: ++this.epoch,
				demo: attract,
			});
			this.mode = "play";
			this.lastResult = null;
			this.celebrationTween?.cancel();
			this.celebration = null;
			this.input.clear();
			this.ui.lastPhase = "";
			this.ui.lastRadio = "";
			this.game.go("play", null, { fade: 0 });
			this.game.lights.enabled = true;
			this.painter.lastEvent = 0;
			this.painter.shake = 0;
			document.body.dataset.screen = attract ? "attract" : "play";
		}
		retry() {
			const players = this.world.s.players
				.filter((p) => !p.gone)
				.map(({ id, name, color }) => ({ id, name, color }));
			this.start(players);
		}
		checkIdle() {
			if (this.online || this.attract || !["title", "join"].includes(this.mode))
				return;
			if (performance.now() - this.input.lastActivity >= 10000)
				this.start(
					[{ id: 0, name: "DEMO VIPER", color: S.ASSETS.playerColors[0] }],
					true,
				);
		}
		update(dt) {
			if (this.online) {
				this.online.update();
			} else if (this.world) {
				const w = this.world;
				if (this.attract) {
					this.attractAge += dt;
					const marks = [18, 35, 54, 73, 96, 119, 146];
					if (this.attractAge >= marks[this.attractStage]) {
						const stage = this.attractStage++;
						if (stage === 0) w.jump(0, 2);
						if (stage === 1) w.jump(1, 1);
						if (stage === 2) w.jump(2, 1);
						if (stage === 3) w.jump(2, 2, 0);
						if (stage === 4) w.jump(2, 2, 1);
						if (stage === 5) w.jump(2, 2, 2);
						if (stage === 6) {
							this.start(
								[
									{
										id: 0,
										name: "DEMO VIPER",
										color: S.ASSETS.playerColors[0],
									},
								],
								true,
							);
							return;
						}
						w.s.options.god = true;
					}
				}
				this.acc += dt * this.simRate;
				while (this.acc >= S.DT - 1e-9) {
					this.acc -= S.DT;
					for (const [i, p] of w.s.players.entries()) {
						const intent =
							this.attract || this.testBot
								? S.botIntent(w, p.id, ++this.input.seq)
								: this.input.intent(p, i);
						w.setIntent(p.id, intent);
						if (this.attract && w.s.phase === "upgrade") w.upgrade(p.id, 0);
					}
					w.step();
				}
			}
			const s = this.world?.s;
			if (!s) return;
			const song = s.result
				? s.result.won
					? "victory"
					: "defeat"
				: s.boss
					? "boss"
					: "act" + s.act;
			this.sound.mode(
				song,
				(this.game.paused && !this.online) || this.online?.ended,
			);
			this.sound.events(s);
			this.presentResult();
			this.ui?.tick();
		}
		presentResult() {
			const s = this.world?.s;
			if (!s?.result || this.lastResult) return;
			this.lastResult = s.result;
			if (s.result.won && !this.attract && !this.online) {
				this.celebration = { age: 0 };
				this.celebrationTween = this.game.tween(
					this.celebration,
					{ age: 1 },
					this.game.reduceMotion ? 0.7 : 2,
					{ ease: "outCubic" },
				);
			}
			if (!this.attract && !this.online && !s.modified) {
				this.best = Math.max(this.best, s.score);
				E.store.set("space-fortnight-best", this.best);
			}
		}
		draw(r) {
			if (!this.painter || !this.world) return;
			const s = this.online ? this.online.renderState() : this.world.s;
			this.painter.draw(r, s, this.game.time, {
				demo: this.attract,
				celebration: this.celebration?.age ?? 0,
			});
			const q = this.game.settings.shake;
			if (q > 0 && !this.game.settings.motion) {
				this.painter.shake *= 0.88;
				if (this.painter.shake > 0.2)
					this.game.shake(this.painter.shake * q * 0.35);
			}
			if (s.act === 1)
				this.game.lights.add(480, 277, 0, 190, 0.5, { color: "#a7e4cc" });
			for (const p of s.players)
				if (p.hp > 0)
					this.game.lights.add(p.x, p.y, 0, 44, 0.3, { color: p.color });
		}
		showCountdown(time) {
			const e = document.getElementById("hub-state");
			if (!e || this.online?.info.server) return;
			if (time === null) {
				if (!this.online.ended) e.hidden = true;
				return;
			}
			e.hidden = false;
			e.textContent = Number.isFinite(time)
				? String(Math.ceil(-time / 1000))
				: "VIPER WING / STANDING BY";
			const small = document.createElement("small");
			small.textContent = "Protect Fortress 13. Break the siege ship.";
			e.append(small);
		}
		afterJump() {
			this.lastResult = null;
			this.celebrationTween?.cancel();
			this.celebration = null;
			this.input?.clear();
			this.painter.lastEvent = this.world.s.eventSeq;
			this.sound.reset();
			this.ui.lastPhase = "";
			this.ui.shell.hide();
			this.game.resume();
			document.body.dataset.screen = "play";
		}
		installDebug() {
			const app = this;
			this.game.debug = {
				snapshot: () => this.world?.snapshot() || { phase: "title" },
				advance(seconds, { bot = false, draw = true } = {}) {
					const w = app.world;
					if (!w) return;
					for (let i = 0; i < Math.floor(seconds / S.DT); i++) {
						if (bot)
							for (const p of w.s.players) {
								w.setIntent(p.id, S.botIntent(w, p.id, ++app.input.seq));
								if (w.s.phase === "upgrade") w.upgrade(p.id, p.id % 3);
							}
						w.step();
					}
					app.ui?.tick();
					if (draw) app.game.advance(0, { draw: true });
					return w.snapshot();
				},
				jump: (act, wave = 0, phase) => {
					this.world.jump(act, wave, phase);
					this.afterJump();
				},
				start: () => this.startSolo(),
				title: () => this.title(),
				network: () => this.online?.stats() || null,
			};
		}
	}
	S.App = App;
	if (typeof document !== "undefined") {
		AIHub.connect({ mode: "shared-world", seats: [1, 4] })
			.then((info) => new App(info))
			.catch((err) => {
				console.error(err);
				const e = document.getElementById("boot-error");
				e.hidden = false;
				e.textContent = "Flight systems could not start: " + err.message;
			});
	}
})(globalThis.Fortnight);
