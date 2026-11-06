(() => {
	"use strict";
	const MAP = {
		up: ["KeyW", "ArrowUp", "PadAxisUp", "Pad12"],
		down: ["KeyS", "ArrowDown", "PadAxisDown", "Pad13"],
		left: ["KeyA", "ArrowLeft", "PadAxisLeft", "Pad14"],
		right: ["KeyD", "ArrowRight", "PadAxisRight", "Pad15"],
		fire: ["KeyJ", "KeyZ", "Mouse0", "Pad7"],
		cannon: ["Space", "KeyK", "Mouse2", "Pad6"],
		start: ["Enter", "Pad9"],
		pause: ["Escape", "KeyP", "Pad9"],
		confirm: ["Enter", "Space", "Pad0"],
		cancel: ["Escape", "Backspace", "Pad1"],
	};
	function create(game, callbacks = {}) {
		const I = game.input,
			canvas = game.screen.canvas,
			pointers = new Map();
		let touch = false,
			edge = false,
			lastPointer = null,
			coop = false,
			lastActivity = 0;
		I.touchFilter = () => false;
		I.touchButtons([]);
		I.use(MAP);
		let silenceUntil = 0;
		const now = () =>
			typeof performance !== "undefined" ? performance.now() : game.real * 1000;
		const activity = (e) => {
			if (e && now() < silenceUntil) {
				e.preventDefault();
				e.stopImmediatePropagation();
				return true;
			}
			if (e && e.type === "pointermove" && e.pointerType === "mouse") {
				if (
					lastPointer &&
					Math.hypot(e.clientX - lastPointer[0], e.clientY - lastPointer[1]) < 2
				)
					return;
				lastPointer = [e.clientX, e.clientY];
			}
			lastActivity = now();
			if (callbacks.onActivity && callbacks.onActivity(e)) {
				clear();
				silenceUntil = now() + 180;
				if (e) {
					e.preventDefault();
					e.stopImmediatePropagation();
				}
				return true;
			}
			if (e && e.type === "keydown" && !e.repeat) {
				if (I.map.fire.includes(e.code)) I.aimSource = "move";
				if (callbacks.onGesture) callbacks.onGesture();
			}
		};
		const clear = () => {
			pointers.clear();
			edge = false;
			for (const q of game.players) q.clear();
		};
		const signal = game._abort && game._abort.signal;
		if (typeof addEventListener !== "undefined") {
			for (const type of [
				"keydown",
				"keyup",
				"pointerdown",
				"pointerup",
				"click",
				"pointermove",
				"wheel",
			])
				addEventListener(type, activity, {
					capture: true,
					passive: false,
					signal,
				});
			addEventListener("blur", clear, { signal });
			addEventListener("resize", clear, { signal });
			if (typeof document !== "undefined")
				document.addEventListener(
					"visibilitychange",
					() => {
						if (document.hidden) clear();
					},
					{ signal },
				);
		}
		if (canvas) {
			canvas.addEventListener("contextmenu", (e) => e.preventDefault(), {
				signal,
			});
			canvas.addEventListener(
				"pointerdown",
				(e) => {
					if (
						e.pointerType === "mouse" ||
						!callbacks.isPlaying() ||
						callbacks.isBlocked() ||
						now() < silenceUntil
					)
						return;
					touch = true;
					I.lastDevice = "touch";
					if (callbacks.onGesture) callbacks.onGesture();
					const rc = canvas.getBoundingClientRect(),
						side = e.clientX < rc.left + rc.width / 2 ? "move" : "aim";
					if ([...pointers.values()].some((p) => p.side === side)) return;
					pointers.set(e.pointerId, {
						side,
						x0: e.clientX,
						y0: e.clientY,
						x: e.clientX,
						y: e.clientY,
					});
					canvas.setPointerCapture(e.pointerId);
					e.preventDefault();
				},
				{ signal },
			);
			canvas.addEventListener(
				"pointermove",
				(e) => {
					if (e.pointerType === "mouse") I.lastDevice = "mouse";
					const p = pointers.get(e.pointerId);
					if (p) {
						p.x = e.clientX;
						p.y = e.clientY;
						I.lastDevice = "touch";
					}
				},
				{ signal },
			);
			for (const kind of ["pointerup", "pointercancel", "lostpointercapture"])
				canvas.addEventListener(kind, (e) => pointers.delete(e.pointerId), {
					signal,
				});
		}
		const cannonButton =
			typeof document !== "undefined"
				? document.getElementById("touch-cannon")
				: null;
		if (cannonButton)
			cannonButton.addEventListener(
				"pointerdown",
				(e) => {
					if (now() < silenceUntil) return;
					e.preventDefault();
					e.stopPropagation();
					edge = true;
					touch = true;
					I.lastDevice = "touch";
					if (callbacks.onGesture) callbacks.onGesture();
				},
				{ signal },
			);
		function setCoop(on) {
			coop = on;
			while (game.players.length > 1) game.removePlayer(2);
			I.pad = "any";
			I.use(MAP);
			if (!on) return;
			const pads =
				typeof navigator !== "undefined" && navigator.getGamepads
					? [...navigator.getGamepads()].filter(Boolean)
					: [];
			if (pads.length >= 2) {
				I.pad = pads[0].index;
				game.addPlayer({ pad: pads[1].index }).use(MAP);
			} else if (pads.length === 1) {
				I.pad = null;
				game.addPlayer({ pad: pads[0].index }).use(MAP);
			} else {
				const q = game.addPlayer({ keys: "right" });
				I.use({
					...MAP,
					up: ["KeyW"],
					down: ["KeyS"],
					left: ["KeyA"],
					right: ["KeyD"],
				});
				q.use({
					...MAP,
					up: ["ArrowUp"],
					down: ["ArrowDown"],
					left: ["ArrowLeft"],
					right: ["ArrowRight"],
					fire: ["Period", "Numpad1"],
					cannon: ["Slash", "Numpad2"],
				});
			}
			clear();
		}
		function frames(world) {
			const result = world.players
				.map((p, n) => {
					const q = game.players[n] || I;
					let [mx, my] = q.move(),
						ax = p.ax || 1,
						ay = p.ay || 0,
						fire = q.down("fire"),
						cannon = q.pressed("cannon");
					if (q.padAim) {
						[ax, ay] = q.padAim;
						fire = fire || !!game.settings.stickFire;
					} else if (n === 0 && q.aimSource === "mouse" && q.pointer()) {
						const at = game.mouseGround();
						if (at) {
							ax = at[0] - p.x;
							ay = at[1] - p.y;
						}
					} else if (
						Math.hypot(mx, my) > 0.1 &&
						(q.lastDevice === "keyboard" || n > 0) &&
						game.settings.moveAim
					) {
						ax = mx;
						ay = my;
					}
					if (n === 0 && pointers.size) {
						for (const pt of pointers.values()) {
							const dx = (pt.x - pt.x0) / 54,
								dy = (pt.y - pt.y0) / 54,
								len = Math.hypot(dx, dy),
								scale = Math.max(1, len);
							if (pt.side === "move") {
								mx = len > 0.12 ? dx / scale : 0;
								my = len > 0.12 ? dy / scale : 0;
							} else if (len > 0.18) {
								ax = dx / len;
								ay = dy / len;
								fire = true;
							}
						}
						cannon = cannon || edge;
					}
					if (n === 0 && edge) cannon = true;
					if (
						q.lastDevice !== "mouse" &&
						q.lastDevice !== "keyboard" &&
						game.settings.aimAssist &&
						fire
					) {
						const targets = world.cells
							.filter((c) => c.alive)
							.map((c) => {
								const pos = globalThis.RuinSim.cellPosition
									? RuinSim.cellPosition(world, c)
									: c;
								return pos;
							});
						let best = null,
							metric = Infinity;
						for (const c of targets) {
							const dx = c.x - p.x;
							let dy = c.y - p.y;
							dy -= Math.round(dy / 540) * 540;
							const d = Math.hypot(dx, dy),
								dot =
									(dx * ax + dy * ay) / Math.max(0.01, d * Math.hypot(ax, ay));
							if (d < 350 && dot > 0.91 && d < metric) {
								best = { dx, dy, d };
								metric = d;
							}
						}
						if (best) {
							ax = best.dx / best.d;
							ay = best.dy / best.d;
						}
					}
					if (touch && cannon && n === 0 && Math.abs(my) < 0.2)
						my = p.y < 270 ? -1 : 1;
					const len = Math.hypot(ax, ay) || 1;
					return { mx, my, ax: ax / len, ay: ay / len, fire, cannon };
				})
				.map((a) =>
					callbacks.isBlocked() || now() < silenceUntil
						? { mx: 0, my: 0, ax: a.ax, ay: a.ay, fire: false, cannon: false }
						: a,
				);
			edge = false;
			return result;
		}
		function update() {
			I.touchEnabled = false;
			if (callbacks.isBlocked()) {
				pointers.clear();
				edge = false;
			}
			if (cannonButton) {
				const w = callbacks.getWorld && callbacks.getWorld(),
					p = w && w.players[callbacks.localIndex ? callbacks.localIndex() : 0];
				cannonButton.hidden = !(
					touch &&
					callbacks.isPlaying() &&
					!callbacks.isBlocked() &&
					p &&
					p.alive &&
					p.charge >= w.tuning.chargeThreshold
				);
			}
			for (const q of game.players) {
				if (
					q.lastDevice === "gamepad" &&
					(q.padAim ||
						Math.hypot(...q.padMove) > 0.08 ||
						q.padPrev.some(Boolean))
				) {
					activity();
				}
			}
		}
		function label(a, player = 0) {
			const q = game.players[player] || I;
			if (q.lastDevice === "touch")
				return a === "fire"
					? "RIGHT THUMB"
					: a === "cannon"
						? "TAP"
						: "LEFT THUMB";
			return q.label(a);
		}
		return {
			frames,
			update,
			clear,
			setCoop,
			label,
			get touched() {
				return touch;
			},
			get coop() {
				return coop;
			},
			get lastActivity() {
				return lastActivity;
			},
			MAP,
			debug: () => ({
				pointers: [...pointers.entries()],
				coop,
				touch,
				device: I.lastDevice,
			}),
		};
	}
	globalThis.RuinControls = { create, MAP };
})();
