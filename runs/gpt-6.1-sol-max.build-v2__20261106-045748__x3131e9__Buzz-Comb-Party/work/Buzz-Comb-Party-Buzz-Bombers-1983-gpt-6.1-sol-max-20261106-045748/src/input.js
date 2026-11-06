(function (B) {
	"use strict";
	const E = My3D2dge;
	B.KEYS = {
		...E.Input.SHMUP,
		fire: ["Space", "KeyJ", "Mouse0", "Pad0", "Pad7"],
		call: ["KeyE", "Mouse2", "Pad2"],
		pause: ["Escape", "KeyP", "Pad9"],
	};
	B.InputAdapter = function (game) {
		let pointer = false,
			lastPointer = null,
			context = 0,
			clearId = 0,
			callCounter = 0,
			callAim = null,
			touchAim = null,
			activityAt = 0,
			consumeUntil = 0,
			hadDemo = false;
		const I = game.input;
		I.steer = "drag";
		I.touchButtons([]);
		function activity() {
			activityAt = game.real;
			if (B.app?.attract) {
				B.app.wake();
				consumeUntil = game.real + 0.25;
				hadDemo = true;
			}
			return game.real >= consumeUntil;
		}
		const signal = game._abort?.signal;
		if (!game.headless && game.screen.canvas) {
			const canvas = game.screen.canvas;
			addEventListener(
				"keydown",
				(e) => {
					const ok = activity();
					if (!ok) {
						e.preventDefault();
						e.stopImmediatePropagation();
						I.clear();
					} else if (!e.repeat) {
						pointer = false;
						clearId = 0;
					}
				},
				{ capture: true, signal },
			);
			addEventListener(
				"pointermove",
				(e) => {
					if (
						Math.hypot(e.movementX || 0, e.movementY || 0) > 0.3 ||
						!lastPointer ||
						Math.hypot(e.clientX - lastPointer[0], e.clientY - lastPointer[1]) >
							1
					) {
						activity();
						if (e.pointerType === "mouse" && e.target === canvas) {
							pointer = true;
							clearId = 0;
						}
						lastPointer = [e.clientX, e.clientY];
					}
				},
				{ capture: true, signal },
			);
			addEventListener(
				"pointerdown",
				(e) => {
					const ok = activity();
					if (!ok) {
						e.preventDefault();
						e.stopImmediatePropagation();
						I.clear();
						return;
					}
					if (e.pointerType === "mouse") return;
					const w = B.app?.world;
					if (!w || B.app.attract || game.shell.screen) return;
					const [sx, sy] = I.screenPoint(e.clientX, e.clientY),
						ox = (game.W - 640) / 2,
						oy = (game.H - 360) / 2;
					const x = sx - ox,
						y = sy - oy;
					if (y < 274) {
						const nearest = w.obstacles
							.filter((o) => o.kind === "comb" || o.kind === "hive")
							.map((o) => ({ o, d: Math.hypot(o.x - x, o.y - y) }))
							.sort((a, b) => a.d - b.d)[0];
						if (nearest && nearest.d < 42) {
							context = nearest.o.id;
							clearId = 0;
						}
					} else {
						context = 0;
						clearId = 0;
						const seat = B.app?.localSeat || 1;
						touchAim =
							w.players.find((p) => p.seat === seat)?.x ??
							w.players[0]?.x ??
							320;
					}
				},
				{ capture: true, signal },
			);
			addEventListener(
				"contextmenu",
				(e) => {
					if (e.target === canvas) e.preventDefault();
				},
				{ signal },
			);
			addEventListener("blur", () => reset(), { signal });
			I.touchFilter = (e) => {
				const p = I.screenPoint(e.clientX, e.clientY);
				return p && p[1] - (game.H - 360) / 2 > 270;
			};
		}
		function reset() {
			pointer = false;
			context = 0;
			clearId = 0;
			callCounter = 0;
			callAim = null;
			touchAim = null;
			for (const q of game.players) q.clear();
		}
		function padActivity() {
			let any = false;
			for (const q of game.players) {
				const axes = q.padAxes || [],
					old = q._bcpAxes || [];
				const padChanged =
					axes.some(
						(v, i) =>
							Math.abs(v) > 0.065 && Math.abs(v - (old[i] || 0)) > 0.045,
					) || q.padPrev.some((on, i) => on && !q._bcpButtons?.[i]);
				if (padChanged) {
					any = true;
					pointer = false;
					clearId = 0;
				} else if (q.anyPressed()) any = true;
				q._bcpAxes = axes.slice();
				q._bcpButtons = q.padPrev.slice();
			}
			if (any) activity();
		}
		function useful(w, p) {
			const x = p.x,
				objects = [];
			if (w.bird.state !== "retreat")
				objects.push({ kind: "bird", x: w.bird.x, y: w.bird.y, w: 20 });
			for (const o of w.obstacles)
				objects.push({ kind: o.kind, x: o.x, y: o.y, w: 15 });
			for (const b of w.bees)
				if (b.state !== "landing" && b.state !== "build")
					objects.push({ kind: "bee", x: b.x, y: b.y, w: 11 });
			if (w.boss && !w.boss.done)
				objects.push({
					kind: w.boss.open > 0 ? "bee" : "shield",
					x: w.boss.x,
					y: w.boss.y,
					w: 20,
				});
			const first = objects
				.filter((o) => Math.abs(o.x - x) < o.w)
				.sort((a, b) => b.y - a.y)[0];
			return first?.kind === "bee";
		}
		function read(w, seat = 1, input = I) {
			const p = w.players.find((p) => p.seat === seat);
			if (!p) return { move: 0, fire: false, call: 0 };
			if (game.real < consumeUntil || game.shell.screen || B.app?.ended)
				return { move: 0, fire: false, call: p.callSeen };
			let move = input.move()[0],
				aim = null,
				fire = input.down("fire"),
				call = p.callSeen;
			if (input.lastDevice === "gamepad" && Math.abs(move) > 0.02)
				pointer = false;
			if (input === I && pointer && input.lastDevice === "mouse") {
				const pt = input.pointer();
				if (pt) aim = pt[0] - (game.W - 640) / 2;
			}
			if (input.pressed("call")) call++;
			if (input.lastDevice === "touch" && input === I) {
				const drag = input.drag();
				if (drag && Math.abs(drag[0]) > 0.12) {
					touchAim = Math.max(
						28,
						Math.min(612, (touchAim ?? p.x) + drag[0] * 1.55),
					);
					clearId = 0;
					context = 0;
				}
				move = 0;
				if (touchAim !== null) aim = touchAim;
				if (game.settings.touchAssist) fire = useful(w, p);
				if (clearId) {
					const o = w.obstacles.find((o) => o.id === clearId);
					if (o) {
						aim = o.x;
						fire =
							Math.abs(p.x - o.x) < 5 &&
							(w.bird.state === "retreat" || Math.abs(w.bird.x - p.x) > 20);
					} else {
						clearId = 0;
						context = 0;
					}
				}
				if (callCounter > 0) {
					call++;
					aim = callAim;
					callCounter = 0;
					callAim = null;
				}
			}
			return { move, aim, fire, call };
		}
		function contextButtons(w) {
			const o = w?.obstacles.find((o) => o.id === context);
			if (!o || I.lastDevice !== "touch") return [];
			return [
				[
					o.kind === "hive" ? "Keep hive" : "Harvest parcel",
					() => {
						if (o.kind === "hive") {
							context = 0;
							return;
						}
						callCounter++;
						callAim = o.x;
						context = 0;
					},
				],
				[
					"Clear with spray",
					() => {
						clearId = o.id;
						touchAim = null;
						context = 0;
					},
				],
				[
					"Cancel",
					() => {
						clearId = 0;
						context = 0;
					},
				],
			];
		}
		return {
			read,
			reset,
			padActivity,
			activity,
			contextButtons,
			get activityAt() {
				return activityAt;
			},
			set activityAt(v) {
				activityAt = v;
			},
			get context() {
				return context;
			},
			get pointer() {
				return pointer;
			},
			get consumed() {
				return game.real < consumeUntil;
			},
			resetForRun() {
				reset();
				consumeUntil = game.real + 0.16;
				hadDemo = false;
			},
			get woke() {
				return hadDemo;
			},
		};
	};
})((globalThis.BCP = globalThis.BCP || {}));
