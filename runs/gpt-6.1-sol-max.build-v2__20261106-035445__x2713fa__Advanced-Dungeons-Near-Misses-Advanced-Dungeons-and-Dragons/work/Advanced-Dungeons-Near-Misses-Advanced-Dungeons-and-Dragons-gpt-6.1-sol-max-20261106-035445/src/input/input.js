(() => {
	const N = globalThis.NM,
		E = globalThis.My3D2dge;
	N.BINDINGS = {
		...E.Input.DEFAULT,
		fire: ["Mouse0", "KeyJ", "Pad7"],
		focus: ["Mouse2", "KeyL", "Pad6"],
		interact: ["KeyE", "Pad0"],
		dodge: ["Space", "Pad1"],
		sprint: ["ShiftLeft", "ShiftRight"],
		fieldMap: ["Tab", "Pad3"],
		quiver: ["KeyR", "Pad2"],
		attack: [],
		dash: [],
		skill: [],
		jump: [],
	};
	class Controls {
		constructor(app) {
			this.app = app;
			this.game = app.game;
			this.seq = 0;
			this.ids = {};
			this.fingers = new Map();
			this.touchMove = [0, 0];
			this.touchAim = null;
			this.touchFire = false;
			this.touchDodge = false;
			this.rightSince = 0;
			this.lastLeft = -1;
			this.lastReal = 0;
			const g = this.game,
				I = g.input;
			I.use(N.BINDINGS);
			I.names = {
				fire: "Loose one arrow",
				focus: "Focus / listen",
				interact: "Interact / hold revive",
				dodge: "Quickstep",
				sprint: "Run",
				fieldMap: "Field map",
				quiver: "Count arrows",
			};
			I.touchFilter = () => false;
			I.touchButtons(["interact"]);
			I.touchSet("interact", "USE", false);
			if (g.headless) return;
			const canvas = g.screen.canvas,
				signal = g._abort?.signal;
			const activity = (event) => {
				if (
					event.type === "pointermove" &&
					event.movementX === 0 &&
					event.movementY === 0
				)
					return;
				if (event.type === "keydown" && event.repeat) return;
				if (event.pointerType === "mouse") I.lastDevice = "mouse";
				this.lastReal = g.real;
				app.realInput?.(event);
			};
			for (const type of ["keydown", "pointerdown", "pointermove"])
				addEventListener(type, activity, { capture: true, signal });
			canvas.addEventListener(
				"pointerdown",
				(e) => {
					if (e.pointerType !== "touch" || g.shell?.screen || app.attract)
						return;
					e.preventDefault();
					const rc = canvas.getBoundingClientRect(),
						side = e.clientX < rc.left + rc.width * 0.5 ? "left" : "right";
					if ([...this.fingers.values()].some((v) => v.side === side)) return;
					this.fingers.set(e.pointerId, {
						side,
						x: e.clientX,
						y: e.clientY,
						cx: e.clientX,
						cy: e.clientY,
						time: g.real,
					});
					canvas.setPointerCapture(e.pointerId);
					if (side === "left") {
						if (g.real - this.lastLeft < 0.28) this.touchDodge = true;
						this.lastLeft = g.real;
					} else this.rightSince = g.real;
					I.lastDevice = "touch";
				},
				{ signal },
			);
			canvas.addEventListener(
				"pointermove",
				(e) => {
					const finger = this.fingers.get(e.pointerId);
					if (!finger) return;
					e.preventDefault();
					finger.cx = e.clientX;
					finger.cy = e.clientY;
					const dx = e.clientX - finger.x,
						dy = e.clientY - finger.y;
					if (finger.side === "left")
						this.touchMove = [N.clamp(dx / 52, -1, 1), N.clamp(dy / 52, -1, 1)];
					else if (Math.hypot(dx, dy) > 12) this.touchAim = [dx, dy];
				},
				{ signal },
			);
			const up = (e) => {
				const f = this.fingers.get(e.pointerId);
				if (!f) return;
				this.fingers.delete(e.pointerId);
				if (f.side === "left") this.touchMove = [0, 0];
				else {
					if (e.type !== "pointercancel") this.touchFire = true;
					this.touchAim = null;
					this.rightSince = 0;
				}
			};
			addEventListener("pointerup", up, { signal });
			addEventListener("pointercancel", up, { signal });
			addEventListener("blur", () => this.clear(), { signal });
			document.addEventListener("visibilitychange", () => this.clear(), {
				signal,
			});
			addEventListener("resize", () => this.clear(), { signal });
		}
		clear() {
			this.fingers.clear();
			this.touchMove = [0, 0];
			this.touchAim = null;
			this.rightSince = 0;
			this.touchFire = false;
			this.touchDodge = false;
			for (const input of this.game.players) input.clear();
			this.app.sim?.clearInputs();
		}
		next(seat, kind) {
			const k = `${seat}-${kind}`;
			this.ids[k] = (this.ids[k] || 0) + 1;
			return this.ids[k];
		}
		command(seat, input) {
			const app = this.app,
				g = this.game,
				s = app.sim.state,
				p = s.players.find((a) => a.seat === seat);
			if (!p) return null;
			let m = input.move();
			if (input === g.input && input.lastDevice === "touch") m = this.touchMove;
			const ground = g.view.screenDirToGround(...m);
			let aim = [Math.cos(p.angle), Math.sin(p.angle)],
				deliberate = false;
			if (input.padAim) {
				aim = g.view.screenDirToGround(...input.padAim);
				deliberate = true;
			} else if (
				input === g.input &&
				input.aimSource === "mouse" &&
				input.lastDevice !== "touch"
			) {
				const point = g.mouseGround();
				if (point) {
					aim = [point[0] - p.x, point[1] - p.y];
					deliberate = true;
				}
			} else if (input === g.input && this.touchAim) {
				aim = g.view.screenDirToGround(...this.touchAim);
				deliberate = true;
			} else if (Math.hypot(...m) > 0.2 && !p.draw) aim = ground;
			const fire =
					input.pressed("fire") || (input === g.input && this.touchFire),
				touch = input.lastDevice === "touch";
			if (g.settings.aimAssist && (!deliberate || touch)) {
				const candidates = s.enemies
					.filter(
						(e) =>
							e.hp > 0 &&
							app.sim.visible(e) &&
							N.Geometry.los(app.sim.level, p.x, p.y, e.x, e.y) &&
							Math.hypot(e.x - p.x, e.y - p.y) < N.TILE * 8,
					)
					.sort(
						(a, b) =>
							Math.hypot(a.x - p.x, a.y - p.y) -
							Math.hypot(b.x - p.x, b.y - p.y),
					);
				const enemy = candidates.find((e) => {
					const dot =
						((e.x - p.x) * aim[0] + (e.y - p.y) * aim[1]) /
						(Math.hypot(e.x - p.x, e.y - p.y) * Math.hypot(...aim));
					return touch || dot > 0.91;
				});
				if (enemy && enemy.type !== "target")
					aim = [enemy.x - p.x, enemy.y - p.y];
			}
			const length = Math.hypot(...aim) || 1,
				ids = {};
			if (fire) ids.fireId = this.next(seat, "fire");
			if (input.pressed("interact"))
				ids.interactId = this.next(seat, "interact");
			if (input.pressed("quiver")) ids.quiverId = this.next(seat, "quiver");
			let dodge =
				input.pressed("dodge") || (input === g.input && this.touchDodge);
			if (
				g.settings.dodgeAssist &&
				p.dodge <= 0 &&
				s.enemies.some(
					(e) =>
						app.sim.visible(e) &&
						e.state === "windup" &&
						e.stateTime > 0.8 &&
						Math.hypot(e.x - p.x, e.y - p.y) < 80,
				)
			)
				dodge = true;
			if (dodge) ids.dodgeId = this.next(seat, "dodge");
			const cmd = {
				mx: ground[0],
				my: ground[1],
				ax: aim[0] / length,
				ay: aim[1] / length,
				focus:
					input.down("focus") ||
					(touch && this.rightSince > 0 && g.real - this.rightSince > 0.25),
				sprint:
					input.down("sprint") ||
					(input.lastDevice === "gamepad" && Math.hypot(...m) > 0.82),
				interactHeld: input.down("interact"),
				seq: ++this.seq,
				epoch: 1,
				...ids,
			};
			if (input === g.input) {
				this.touchFire = false;
				this.touchDodge = false;
			}
			return cmd;
		}
		update() {
			const app = this.app,
				g = this.game;
			if (!app.sim || app.attract || g.shell?.screen) return;
			const seats =
				app.net.connected || app.net.isHub
					? [app.net.localSeat]
					: app.sim.state.players.map((p) => p.seat);
			for (const seat of seats) {
				if (seat === null) continue;
				const input =
					seat === 1 || app.net.connected || app.net.isHub
						? g.input
						: g.players[1];
				if (!input) continue;
				const cmd = this.command(seat, input);
				if (cmd) {
					if (app.net.connected || app.net.isHub) app.net.sendInput(cmd);
					else app.sim.command(seat, cmd);
				}
			}
			if (g.input.pressed("fieldMap")) app.ui.fieldMap();
		}
	}
	N.Controls = Controls;
})();
