(() => {
	const N = globalThis.NM,
		E = globalThis.My3D2dge;
	class App {
		constructor({ headless = false, loop = true } = {}) {
			this.playing = false;
			this.attract = false;
			this.pairing = false;
			this.ended = false;
			this.lastSaved = 0;
			this.lastUi = 0;
			this.idleAt = 0;
			this.suppressedUntil = 0;
			this.mode = "solo";
			this.save = new N.Save();
			this.game = new E.Game({
				canvas: "screen",
				headless,
				loop,
				res: "ps1",
				expand: true,
				view: "threequarter",
				input: N.BINDINGS,
				bg: "#111d24",
				autoPause: false,
				fullscreen: "button",
				live: false,
				menu: {
					quit: false,
					settings: [
						{ key: "glyphs", value: "playstation" },
						{
							key: "aimAssist",
							label: "Gentle visible-target aim",
							type: "toggle",
							value: true,
							group: "Game",
						},
						{
							key: "dodgeAssist",
							label: "Quickstep assistance",
							type: "toggle",
							value: false,
							group: "Game",
						},
					],
					controls: {
						fire: "Loose arrow",
						focus: "Focus / listen",
						interact: "Interact / revive",
						dodge: "Quickstep",
						fieldMap: "Field map",
						quiver: "Count arrows",
						sprint: "Run",
						attack: false,
						dash: false,
						skill: false,
						jump: false,
					},
				},
			});
			this.game.fadeTime = 0;
			this.sim = new N.Sim();
			this.renderer = new N.Renderer(this.game);
			this.net = new N.Network({
				getState: () => this.sim.snapshot(),
				applyState: (s) => {
					this.sim.applySnapshot(s);
				},
				command: (seat, cmd) => this.sim.command(seat, cmd),
				addPlayer: (seat) => this.sim.addPlayer(seat),
				removePlayer: (seat) => this.sim.removePlayer(seat),
				start: (info) => this.networkStart(info),
				ended: (reason) => this.networkEnd(reason),
				status: (text) => {
					this.status = text;
				},
			});
			this.controls = new N.Controls(this);
			this.ui = new N.UI(this);
			this.sound = new N.Sound(this.game);
			this.game.debug = {
				snapshot: () => ({
					marker: "near-misses-20261106-035445",
					mode: this.sim.state.mode,
					scene: this.game.sceneName,
					playing: this.playing,
					attract: this.attract,
					authority: this.net.role || "local",
					state: this.sim.snapshot(),
					errors: this.game.errors,
				}),
				teleport: (x, y) => {
					this.sim.assist();
					this.sim.state.players[0].x = x;
					this.sim.state.players[0].y = y;
				},
			};
			this.game.hook("input", (dt) => this.inputTick(dt));
			this.game.start({
				scene: "expedition",
				scenes: {
					expedition: {
						pausable: true,
						view: "threequarter",
						res: "ps1",
						expand: true,
						propSize: 1,
						input: N.BINDINGS,
						update: (dt) => this.update(dt),
						draw: () => this.draw(),
					},
				},
			});
			if (!headless) {
				document.body.dataset.game = "near-misses-20261106-035445";
				addEventListener("beforeunload", () => {
					this.saveNow();
					this.net.close();
					this.sound.stop();
				});
				document.addEventListener("visibilitychange", () => {
					if (
						document.hidden &&
						this.playing &&
						!this.net.connected &&
						!this.net.isHub
					)
						this.game.pause("hidden");
				});
			}
			N.app = this;
			globalThis.__NM = this;
		}
		async boot() {
			const hub = await this.net.connectHub();
			if (!hub) this.ui.title();
			this.ready = true;
			return this;
		}
		start({ resume = false, local = false, twoPads = false } = {}) {
			if (this.net.isHub) return;
			this.net.close();
			this.ended = false;
			this.attract = false;
			this.pairing = false;
			this.game.live = false;
			this.game.o.autoPause = true;
			this.mode = local ? "local" : "solo";
			while (this.game.players.length > 1) this.game.removePlayer(2);
			this.game.input.pad = "any";
			this.sim = new N.Sim({
				players: local ? [1, 2] : [1],
				save: (value) => this.canSave() && this.save.write(value),
			});
			if (resume) {
				const value = this.save.read();
				if (value) {
					this.sim.applySnapshot(value.state);
					this.sim.restartSnapshot = value.restart;
					while (this.sim.state.players.length > 1)
						this.sim.removePlayer(this.sim.state.players[1].seat);
					if (local) this.sim.addPlayer(2);
				}
			}
			if (local) {
				let pads = [];
				try {
					pads = Array.from(navigator.getGamepads()).filter(
						(p) => p?.connected,
					);
				} catch {}
				const second = twoPads ? (pads[1]?.index ?? 1) : (pads[0]?.index ?? 0);
				this.game.addPlayer({ pad: second });
				if (twoPads) this.game.input.pad = pads[0]?.index ?? 0;
			}
			this.game.allowJoin({
				max: 2,
				keys: false,
				onJoin: (input, seat) => {
					this.sim.addPlayer(seat);
					input.use(N.BINDINGS);
					input.names = this.game.input.names;
					this.mode = "local";
				},
			});
			this.playing = true;
			this.ui.lastMode = null;
			this.ui.shell.hide();
			this.game.resume();
			this.controls.clear();
			this.sound.resume();
			this.idleAt = this.game.real;
			this.saveNow();
			if (!this.save.available)
				this.ui.shell.toast(
					"For this visit only",
					"Browser storage is unavailable. Your expedition remains in memory.",
				);
			if (local)
				this.ui.shell.toast(
					"Two rangers on the trail",
					twoPads
						? "Ranger1: controller1 · Ranger2: controller2"
						: "Ranger1: keyboard & mouse · Ranger2: controller1",
				);
		}
		canSave() {
			return (
				this.playing &&
				!this.attract &&
				!this.net.isHub &&
				(!this.net.connected || this.net.authority) &&
				!this.sim.state.stats.assisted
			);
		}
		saveNow() {
			if (this.canSave())
				this.save.write({
					state: this.sim.snapshot(),
					restart: N.clone(this.sim.restartSnapshot),
				});
		}
		travel(id) {
			if (this.net.connected || this.net.isHub) {
				if (!this.net.authority) {
					this.ui.shell.toast(
						"The lead ranger chooses the trail",
						"Your companion is consulting the map.",
					);
					return;
				}
				this.sim.travel(id);
			} else this.sim.travel(id);
			this.ui.lastMode = null;
			this.ui.shell.hide();
			this.controls.clear();
			this.game.resume();
		}
		networkStart({ role, seats, hub, seed }) {
			const existing =
				!hub &&
				role === "host" &&
				this.playing &&
				!["victory", "defeat"].includes(this.sim.state.mode)
					? this.sim
					: null;
			this.mode = hub ? "hub" : role;
			this.ended = false;
			this.pairing = false;
			this.attract = false;
			this.playing = true;
			this.game.live = true;
			this.game.o.autoPause = false;
			this.game.allowJoin(false);
			this.game.o.menu.quit = false;
			while (this.game.players.length > 1) this.game.removePlayer(2);
			this.sim =
				existing ||
				new N.Sim({
					seed: Number(seed) || 182,
					players: seats,
					mode: this.mode,
					save:
						hub || role === "guest"
							? null
							: (value) => this.canSave() && this.save.write(value),
				});
			if (existing) {
				for (const seat of seats) this.sim.addPlayer(seat);
				this.sim.networkMode = "host";
				this.sim.saveCallback = (value) =>
					this.canSave() && this.save.write(value);
			}
			this.ui?.shell.hide();
			if (this.ui) this.ui.lastMode = null;
			this.game.resume();
			this.controls.clear();
			this.sound?.resume();
			if (hub && role !== "guest") this.sim.travel("chalk");
		}
		networkEnd(reason) {
			this.controls.clear();
			this.sound.stop();
			if (this.net.isHub) {
				this.ended = true;
				this.game.live = false;
				this.ui.show("sessionend", {
					kicker: "AI HUB EXPEDITION",
					title: "The trail is quiet.",
					text: reason,
					actions: [["Expedition notes", () => this.ui.about()]],
				});
				return;
			}
			if (this.net.authority && this.playing) {
				this.mode = "solo";
				this.game.live = false;
				this.ui.shell.toast(
					"Your companion has left",
					"The expedition continues with its shared quiver.",
				);
				this.sound.resume();
			} else {
				this.playing = false;
				this.ui.show("connectionend", {
					title: "Connection ended",
					text: reason,
					actions: [["Return to menu", () => this.ui.title()]],
				});
			}
		}
		realInput(event) {
			this.idleAt = this.game.real;
			if (this.attract) {
				event?.preventDefault?.();
				event?.stopImmediatePropagation?.();
				this.exitAttract();
				return;
			}
			if (event?.type !== "pointermove") this.sound?.unlock();
		}
		inputTick(dt) {
			this.net.update(dt);
			const input = this.game.input,
				pad =
					!!input.padAim ||
					Math.hypot(...input.padMove) > 0.2 ||
					input.anyPressed();
			if (input.lastDevice === "gamepad" && pad) {
				this.sound?.unlock();
				this.idleAt = this.game.real;
				if (this.attract) {
					this.exitAttract();
					input.consumeAll();
				}
			}
			if (this.game.real < this.suppressedUntil) {
				for (const I of this.game.players) I.consumeAll();
				return;
			}
			const screen = this.ui?.shell.screen;
			if (screen !== this.lastScreen) {
				if (screen) this.controls.clear();
				this.lastScreen = screen;
			}
			if (this.game.real - this.lastUi > 0.1) {
				this.lastUi = this.game.real;
				this.ui?.update();
			}
			if (
				!this.playing &&
				!this.pairing &&
				!this.net.isHub &&
				!this.attract &&
				this.ready &&
				this.game.real - this.idleAt >= 10
			)
				this.startAttract();
		}
		update(dt) {
			if (this.ended) return;
			if (this.attract) {
				this.attractUpdate(dt);
				this.renderer.update(this.demo, dt);
				this.sound.update(this.demo, dt);
				return;
			}
			if (this.playing) {
				if (!this.net.isHub || this.net.running) {
					this.controls.update();
					const online = this.net.connected || this.net.isHub;
					if (!online || this.net.authority) this.sim.step(dt);
				}
				this.renderer.update(this.sim, dt);
				this.sound.update(this.sim, dt);
				this.ui.update();
				if (this.sim.state.time - this.lastSaved > 8) {
					this.lastSaved = this.sim.state.time;
					this.saveNow();
				}
				if (
					this.net.connected &&
					(this.sim.state.mode === "victory" ||
						this.sim.state.mode === "defeat")
				)
					this.net.finish(
						this.sim.state.mode === "victory",
						this.sim.state.stats,
					);
			} else {
				this.sim.state.time += dt;
				this.renderer.update(this.sim, dt, { title: true });
				this.sound.update(this.sim, dt);
			}
		}
		draw() {
			this.renderer.draw(this.attract ? this.demo : this.sim, {
				title: !this.playing && !this.attract,
				attract: this.attract,
			});
		}
		startAttract() {
			if (this.net.isHub || this.pairing || this.playing) return;
			this.attract = true;
			this.attractTime = 0;
			this.attractStage = -1;
			this.demoFireId = 100;
			this.demo = new N.Sim({ seed: 1234 });
			this.demo.dev = {
				isolated: true,
				infiniteHealth: true,
				infiniteAmmo: true,
			};
			this.ui.shell.hide();
			this.ui.shell.tutorial(null);
			this.game.resume();
			if (typeof document !== "undefined") {
				const el = document.createElement("div");
				el.id = "nm-attract";
				el.innerHTML =
					"<span>FROM THE RANGER’S JOURNAL</span><strong>A trail worth taking.</strong><p>Demonstration · press any input to play</p>";
				document.body.appendChild(el);
			}
		}
		attractUpdate(dt) {
			this.attractTime += dt;
			const sim = this.demo,
				t = this.attractTime % 45,
				stage = Math.floor(t / 9);
			if (stage !== this.attractStage) {
				this.attractStage = stage;
				if (stage === 0) {
					sim.loadCave(0);
					const p = sim.state.players[0];
					p.x = 38 * 16;
					p.y = 8.5 * 16;
					sim.say(
						"Small prints. A scratch in the dark. Listen before the shot.",
						8,
					);
				}
				if (stage === 1) {
					sim.loadCave(1);
					sim.say("A pale bank turns an arrow around the corner.", 8);
					sim.command(1, { ax: 1, ay: 0, fireId: 10, epoch: 1 });
				}
				if (stage === 2) {
					sim.state.mode = "map";
					sim.state.party.tools = ["axe", "boat", "key"];
					sim.state.mapNode = "river";
					sim.state.notice = "A folding boat makes a river into a road.";
				}
				if (stage === 3 || stage === 4) {
					sim.loadCave(stage === 3 ? 3 : 4);
					const p = sim.state.players[0],
						boss = sim.state.enemies.find((e) => e.type.startsWith("guardian"));
					p.x = boss.x - 70;
					p.y = boss.y + 40;
					boss.state = "windup";
					boss.stateTime = 0;
					boss.angle = Math.atan2(p.y - boss.y, p.x - boss.x);
					sim.say(
						stage === 3
							? "The armored breast turns a shaft. Find the listening flank."
							: "Leave the breath lane. Loose your shaft into the hush.",
						8,
					);
				}
			}
			const p = sim.state.players[0];
			if (stage === 0) {
				const e = sim.state.enemies.find((e) => e.hp > 0),
					ax = e ? e.x - p.x : 1,
					ay = e ? e.y - p.y : 0,
					len = Math.hypot(ax, ay) || 1;
				sim.command(1, {
					mx: Math.sin(t) * 0.1,
					my: Math.cos(t) * 0.1,
					ax: ax / len,
					ay: ay / len,
					focus: true,
					...(Math.abs(t - 5) < dt ? { fireId: 1, epoch: 1 } : {}),
				});
			}
			if (stage === 3 || stage === 4) {
				const boss = sim.state.enemies.find((e) =>
						e.type.startsWith("guardian"),
					),
					dx = boss.x - p.x,
					dy = boss.y - p.y,
					len = Math.hypot(dx, dy) || 1;
				sim.command(1, {
					mx: 0,
					my: 0,
					ax: dx / len,
					ay: dy / len,
					focus: true,
					...(boss.state === "recovering" && !p.recovery && !p.draw
						? { fireId: ++this.demoFireId, epoch: 1 }
						: {}),
				});
			}
			sim.step(dt);
			sim.updateVisibility();
		}
		exitAttract() {
			this.attract = false;
			this.demo = null;
			this.suppressedUntil = this.game.real + 0.3;
			this.idleAt = this.game.real;
			this.controls.clear();
			if (typeof document !== "undefined")
				document.getElementById("nm-attract")?.remove();
			this.ui.title();
		}
		dispose() {
			this.saveNow();
			this.net.close();
			this.sound.stop();
			this.game.dispose();
		}
	}
	N.App = App;
	if (typeof document !== "undefined") {
		const app = new App();
		app.boot().catch((error) => app.game.fail("boot", error));
	}
})();
