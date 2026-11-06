(() => {
	"use strict";
	const T = (globalThis.TSS = globalThis.TSS || {});
	const E = My3D2dge;
	const base = {
		up: ["KeyW", "ArrowUp", "Pad12"],
		right: ["KeyD", "ArrowRight", "Pad15"],
		down: ["KeyS", "ArrowDown", "Pad13"],
		left: ["KeyA", "ArrowLeft", "Pad14"],
		bomb: ["Space", "Pad0", "Mouse2"],
		route: ["Mouse0"],
		confirm: ["Enter", "Space", "Pad0"],
		cancel: ["Escape", "Backspace", "Pad1"],
		pause: ["Escape", "KeyP", "Pad9"],
		start: ["Enter", "Pad9"],
	};
	const dirs = ["up", "right", "down", "left"];
	class Controls {
		constructor(game) {
			this.game = game;
			this.routes = {};
			this.last = {};
			this.style = "solo";
			this.floor = -1;
			this.configure("solo");
		}
		configure(style) {
			const g = this.game;
			while (g.players.length > 1) g.removePlayer(2);
			const I = g.input;
			I.half = null;
			I._full = null;
			I.pad = "any";
			I.use(base);
			I.clear();
			I.steer = "drag";
			I.stickRadius = 38;
			I.stickDeadzone = 0.16;
			I.touchFilter = () => !g.shell?.screen;
			I.touchButtons(["bomb"], { labels: { bomb: "POP" } });
			I.touchSet("bomb", "POP", false);
			if (style === "shared") {
				const q = g.addPlayer({ keys: "right" });
				I.use({
					...base,
					up: ["KeyW"],
					right: ["KeyD"],
					down: ["KeyS"],
					left: ["KeyA"],
					bomb: ["Space", "Mouse2"],
				});
				q.use({
					...base,
					up: ["ArrowUp"],
					right: ["ArrowRight"],
					down: ["ArrowDown"],
					left: ["ArrowLeft"],
					bomb: ["ShiftRight"],
					route: [],
				});
				I.pad = null;
				q.pad = null;
			} else if (style === "keyboard-pad") {
				const q = g.addPlayer({ pad: 0 });
				I.pad = null;
				q.pad = 0;
				q.use(
					Object.fromEntries(
						Object.entries(base).map(([k, v]) => [
							k,
							v.filter((c) => c.startsWith("Pad")),
						]),
					),
				);
			} else if (style === "pads") {
				I.pad = 0;
				const q = g.addPlayer({ pad: 1 });
				q.pad = 1;
				q.use(
					Object.fromEntries(
						Object.entries(base).map(([k, v]) => [
							k,
							v.filter((c) => c.startsWith("Pad")),
						]),
					),
				);
			}
			for (const q of g.players) {
				q.glyphs = g.settings.glyphs;
				q.names = {
					bomb: "Bug bomb",
					route: "Click to walk",
					up: "Up",
					right: "Right",
					down: "Down",
					left: "Left",
				};
				this.resetPadObservation(q);
			}
			this.style = style;
			this.routes = {};
			this.last = {};
			this.floor = -1;
			this.padSeats = {};
			this.menuPad = false;
			this.suppressedBombs = new WeakSet();
			this.refreshAssignments(true);
		}
		resetPadObservation(input) {
			input.clear();
			input.padIndex = null;
			input.padId = "";
			input.padPrev = [];
			input.padLost = false;
		}
		heldBomb(input) {
			return (input.map.bomb || []).some((code) => input.held.has(code));
		}
		suppressGameplay() {
			for (const input of this.game.players)
				if (this.heldBomb(input)) this.suppressedBombs.add(input);
		}
		refreshAssignments(initial = false) {
			const g = this.game,
				players = g.players,
				menu = !!g.shell?.screen || g.paused;
			if (menu) this.suppressGameplay();
			let connected = [];
			try {
				connected = Array.from(globalThis.navigator?.getGamepads?.() || [])
					.filter(
						(p) =>
							p &&
							p.connected !== false &&
							p.mapping === "standard" &&
							Number.isInteger(p.index) &&
							p.index >= 0,
					)
					.sort((a, b) => a.index - b.index);
			} catch (_) {
				/* Keyboard/touch remain available when gamepads are denied. */
			}
			let changed = false;
			if (this.style === "pads" || this.style === "keyboard-pad") {
				const seats = this.style === "pads" ? [1, 2] : [2],
					used = new Set();
				// Keep every connected seat. A replacement may appear at an entirely new browser index.
				for (const seat of seats) {
					const index = this.padSeats[seat];
					if (connected.some((p) => p.index === index) && !used.has(index))
						used.add(index);
					else this.padSeats[seat] = null;
				}
				for (const seat of seats)
					if (this.padSeats[seat] == null) {
						const next = connected.find((p) => !used.has(p.index));
						if (next) {
							this.padSeats[seat] = next.index;
							used.add(next.index);
						}
					}
				this.menuPad = false;
				for (let i = 0; i < players.length; i++) {
					const input = players[i],
						seat = i + 1;
					let desired = this.padSeats[seat] ?? null;
					if (i === 0 && menu && desired === null) {
						// Native menus read P1's input. Lend a remaining pad only while the overlay is open.
						const borrowed =
							connected.find((p) => p.index === this.padSeats[2]) ||
							connected[0];
						if (borrowed) {
							desired = borrowed.index;
							this.menuPad = true;
						}
					}
					if (input.pad !== desired) {
						input.pad = desired;
						this.resetPadObservation(input);
						changed = true;
						if (!initial && desired !== null && !(i === 0 && this.menuPad))
							g.shell?.toast(
								"Controller ready",
								"Rescuer " + seat + " is assigned. Continue the same shift.",
							);
					}
				}
			}
			// Match the engine's native seat claims after an assignment changes; never let P1 read P2 in play.
			players[0]._claimed = new Set(
				players
					.slice(1)
					.filter((input) => typeof input.pad === "number")
					.map((input) => input.pad),
			);
			const shared = players
				.slice(1)
				.filter((input) => input.half)
				.concat(g._lobby ? [g._lobby] : []);
			players[0].keysTo = shared.length ? shared : null;
			return changed;
		}
		clear() {
			this.routes = {};
			this.last = {};
			for (const I of this.game.players) I.clear();
		}
		read(sim, controlledSeat = null) {
			const g = this.game,
				state = sim.state,
				out = {};
			if (this.floor !== state.floor || this.run !== state.runId) {
				this.routes = {};
				this.floor = state.floor;
				this.run = state.runId;
			}
			const blocked = !!g.shell?.screen || g.paused;
			for (let k = 0; k < g.players.length; k++) {
				const I = g.players[k],
					seat = controlledSeat ?? k + 1;
				const player = state.players.find((p) => p.seat === seat && p.active);
				if (!player) continue;
				let d = -1;
				for (let n = 0; n < 4; n++) if (I.pressed(dirs[n])) this.last[seat] = n;
				const held = dirs
					.map((a, n) => (I.down(a) ? n : -1))
					.filter((n) => n >= 0);
				if (held.length)
					d = held.includes(this.last[seat])
						? this.last[seat]
						: held[held.length - 1];
				else {
					const m = I.move();
					if (Math.max(Math.abs(m[0]), Math.abs(m[1])) > 0.25)
						d =
							Math.abs(m[0]) > Math.abs(m[1])
								? m[0] > 0
									? 1
									: 3
								: m[1] > 0
									? 2
									: 0;
				}
				if (d >= 0) delete this.routes[seat];
				if (player.hurt > 0) delete this.routes[seat];
				if (k === 0 && I.lastDevice === "mouse" && !blocked) {
					const click = I.clicked();
					if (click) {
						const xy = g.view.toGround(g.cam.x + click[0], g.cam.y + click[1]);
						if (xy) {
							const cell = [Math.floor(xy[0] / 16), Math.floor(xy[1] / 16)];
							if (sim.map.walkable(...cell))
								this.routes[seat] = sim.path(
									player.mover.moving ? player.mover._to : player,
									{ x: cell[0] * 16 + 8, y: cell[1] * 16 + 8 },
								);
						}
					}
				}
				const path = this.routes[seat];
				if (d < 0 && path?.length && !blocked) {
					while (
						path.length &&
						Math.hypot(
							player.x - (path[0][0] * 16 + 8),
							player.y - (path[0][1] * 16 + 8),
						) < 0.75
					)
						path.shift();
					if (path.length) d = sim.directionTo(player, path[0]);
				}
				const heldBomb = this.heldBomb(I);
				if (!heldBomb) this.suppressedBombs.delete(I);
				else if (state.phase !== "play" || blocked) this.suppressedBombs.add(I);
				let bomb = I.down("bomb") && !this.suppressedBombs.has(I);
				const touch = I.lastDevice === "touch";
				const threat = state.enemies.some(
					(e) =>
						e.stun <= 0 &&
						e.emerge <= 0 &&
						Math.hypot(e.x - player.x, e.y - player.y) < 37,
				);
				const danger = state.enemies.some(
					(e) =>
						e.stun <= 0 &&
						e.emerge <= 0 &&
						Math.hypot(e.x - player.x, e.y - player.y) < 20 &&
						sim.map.los(e.x, e.y, player.x, player.y),
				);
				if (
					touch &&
					g.settings.touchAssist &&
					state.phase === "play" &&
					!blocked
				) {
					this.touchAssisted = true;
					if (!g.live && !state.assisted) state.assisted = true;
					if (danger && state.stock > 0 && !state.bomb && !this.autoLast)
						bomb = true;
					this.autoLast = bomb;
				} else this.autoLast = false;
				if (k === 0)
					I.touchSet(
						"bomb",
						state.stock ? "POP" : "EMPTY",
						!blocked && state.phase === "play" && touch && threat,
					);
				out[seat] =
					blocked || (k === 0 && this.menuPad)
						? { dir: -1, bomb: false, confirm: false }
						: {
								dir: d,
								bomb,
								confirm: I.pressed("confirm") || I.pressed("start"),
							};
				if (controlledSeat !== null) break;
			}
			return out;
		}
		prompt() {
			const I = this.game.input;
			if (I.lastDevice === "touch")
				return "Drag anywhere to move · POP near a beetle";
			if (this.style === "shared")
				return "P1 WASD + Space    P2 Arrows + Right Shift";
			if (I.lastDevice === "gamepad")
				return (
					"Left stick / D-pad move    " +
					I.label("bomb") +
					" bug bomb    " +
					I.label("pause") +
					" menu"
				);
			if (I.lastDevice === "mouse")
				return "Click a corridor to walk · Right-click bug bomb · Esc menu";
			return "WASD / Arrows move · Space bug bomb · Esc menu";
		}
	}
	T.Controls = Controls;
	T.INPUT = base;
})();
