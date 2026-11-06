(function (S) {
	"use strict";
	const MAP = {
		...My3D2dge.Input.DEFAULT,
		fire: ["Mouse0", "KeyJ", "Pad7"],
		boost: ["Space", "ShiftLeft", "Pad6"],
		pulse: ["Mouse2", "KeyE", "Pad2"],
	};
	delete MAP.attack;
	delete MAP.dash;
	delete MAP.skill;
	delete MAP.jump;
	MAP.halves = {
		left: {
			fire: ["KeyF", "Mouse0", "Pad7"],
			boost: ["KeyG", "Pad6"],
			pulse: ["KeyH", "Pad2"],
		},
		right: {
			fire: ["Period", "Numpad1", "Pad7"],
			boost: ["Slash", "Numpad2", "Pad6"],
			pulse: ["Comma", "Numpad3", "Pad2"],
		},
	};
	class IntentInput {
		constructor(app) {
			this.app = app;
			this.game = app.game;
			this.touch = new Map();
			this.seq = 0;
			this.lastActivity = performance.now();
			this.pointerLast = null;
			this.consumed = false;
			const canvas = this.game.screen.canvas,
				signal = this.game._abort?.signal;
			const activity = (event) => {
				if (event?.type === "pointerdown")
					this.game.input.lastDevice =
						event.pointerType === "mouse" ? "mouse" : "touch";
				if (event?.type === "pointermove" && event.pointerType === "mouse") {
					if (
						this.pointerLast &&
						Math.hypot(
							this.pointerLast[0] - event.clientX,
							this.pointerLast[1] - event.clientY,
						) < 4
					)
						return;
					this.pointerLast = [event.clientX, event.clientY];
				}
				const wasAttract = this.app.attract;
				this.mark();
				if (wasAttract) {
					if (event.cancelable) event.preventDefault();
					event.stopImmediatePropagation();
				}
			};
			addEventListener("keydown", activity, { capture: true, signal });
			addEventListener("pointerdown", activity, { capture: true, signal });
			addEventListener("pointermove", activity, { capture: true, signal });
			addEventListener("wheel", activity, { passive: true, signal });
			// Native pointer transforms, native rebinding and last-device tracking remain the source of prompts.
			this.game.input.touchFilter = () => false;
			this.game.input.touchButtons([]);
			this.game.input.touchEnabled = false;
			canvas.addEventListener("pointerdown", (e) => this.startTouch(e), {
				signal,
			});
			canvas.addEventListener("pointermove", (e) => this.moveTouch(e), {
				signal,
			});
			for (const ev of ["pointerup", "pointercancel", "lostpointercapture"])
				canvas.addEventListener(ev, (e) => this.endTouch(e), { signal });
			addEventListener("blur", () => this.clear(), { signal });
			document.addEventListener(
				"visibilitychange",
				() => {
					if (document.hidden) this.clear();
				},
				{ signal },
			);
			document.addEventListener(
				"click",
				(event) => {
					if (performance.now() < (this.app.blockInputUntil || 0)) {
						event.preventDefault();
						event.stopImmediatePropagation();
					}
				},
				{ capture: true, signal },
			);
			// Shell menus deliberately stay native. Hover visibly transfers the controller focus.
			document.addEventListener(
				"pointerover",
				(e) => {
					const b = e.target.closest?.(".esh button,.esh input");
					if (b && e.pointerType === "mouse" && document.activeElement !== b)
						b.focus({ preventScroll: true });
				},
				{ signal },
			);
		}
		mark() {
			this.lastActivity = performance.now();
			this.app.sound?.unlock();
			if (this.app.attract) {
				this.consumed = true;
				this.app.blockInputUntil = performance.now() + 300;
				this.app.title();
				this.clear();
			}
		}
		clear() {
			this.touch.clear();
			for (const I of this.game.players) I.clear();
			this.app.world?.clearInput();
			this.seq++;
		}
		screenPoint(e) {
			const rect = this.game.screen.canvas.getBoundingClientRect();
			const scale = Math.min(rect.width / S.W, rect.height / S.H);
			return [
				(e.clientX - rect.left - (rect.width - S.W * scale) / 2) / scale,
				(e.clientY - rect.top - (rect.height - S.H * scale) / 2) / scale,
			];
		}
		startTouch(e) {
			if (
				e.pointerType === "mouse" ||
				this.game.shell?.screen ||
				this.app.attract ||
				!this.app.world
			)
				return;
			const [x, y] = this.screenPoint(e);
			if (x < 0 || x > S.W) return;
			e.preventDefault();
			this.game.screen.canvas.setPointerCapture(e.pointerId);
			this.game.input.lastDevice = "touch";
			this.touch.set(e.pointerId, {
				x,
				y,
				sx: x,
				sy: y,
				side: x < S.W * 0.5 ? "move" : "aim",
			});
		}
		moveTouch(e) {
			const t = this.touch.get(e.pointerId);
			if (!t) return;
			const [x, y] = this.screenPoint(e);
			t.x = x;
			t.y = y;
			this.game.input.lastDevice = "touch";
		}
		endTouch(e) {
			this.touch.delete(e.pointerId);
		}
		pollActivity() {
			const pads = navigator.getGamepads?.() || [];
			const states = this.padStates || (this.padStates = new Map());
			for (const pad of pads)
				if (pad?.connected) {
					const meaningful =
						pad.axes.some((a) => Math.abs(a) > 0.25) ||
						pad.buttons.some((b) => b.pressed);
					const signature = meaningful
						? JSON.stringify([
								pad.axes.map((a) =>
									Math.abs(a) > 0.25 ? Math.round(a * 8) : 0,
								),
								pad.buttons.map((b) => b.pressed),
							])
						: "";
					if (meaningful) {
						this.lastActivity = performance.now();
						if (signature !== states.get(pad.index) || this.app.attract)
							this.mark();
					}
					states.set(pad.index, signature);
				}
			for (const index of states.keys())
				if (!Array.from(pads).some((p) => p?.connected && p.index === index))
					states.delete(index);
		}

		intent(p, index = 0) {
			const I = this.game.players[index] || this.game.input,
				out = S.neutral(++this.seq);
			if (this.consumed) {
				this.consumed = false;
				return out;
			}
			if (this.game.shell?.screen || this.app.online?.ended) return out;
			[out.mx, out.my] = I.move();
			let aim = null;
			if (I.padAim && Math.hypot(...I.padAim) > 0.22) aim = I.padAim;
			else if (
				I.aimSource === "mouse" &&
				I.mouse.active &&
				I.pointer() &&
				index === 0
			) {
				const q = I.pointer();
				aim = [q[0] - p.x, q[1] - p.y];
			}
			const isTouch = I.lastDevice === "touch" && index === 0;
			if (isTouch) {
				out.mx = out.my = 0;
				for (const touch of this.touch.values()) {
					if (touch.side === "move") {
						[out.mx, out.my] = S.norm(
							(touch.x - touch.sx) / 58,
							(touch.y - touch.sy) / 58,
						);
					} else {
						if (Math.hypot(touch.x - touch.sx, touch.y - touch.sy) > 5)
							aim = [touch.x - touch.sx, touch.y - touch.sy];
						out.fire = true;
					}
				}
			}
			if (
				!aim &&
				((isTouch && this.game.settings.assistAim) ||
					(this.game.settings.assistAim && I.lastDevice === "keyboard"))
			) {
				const target = this.target(p);
				if (target) aim = [target.x - p.x, target.y - p.y];
			}
			if (aim && Math.hypot(...aim) > 0.1) {
				const len = Math.hypot(...aim);
				out.ax = aim[0] / len;
				out.ay = aim[1] / len;
			} else {
				out.ax = Math.cos(p.a);
				out.ay = Math.sin(p.a);
			}
			out.fire =
				out.fire ||
				I.down("fire") ||
				I.pressed("fire") ||
				(isTouch && this.game.settings.assistAim && !!this.target(p));
			out.boost = I.down("boost") || I.pressed("boost");
			out.pulse = I.down("pulse") || I.pressed("pulse");
			if (isTouch) {
				out.pulse = out.pulse || this.app.touchPulse;
				out.boost = out.boost || this.app.touchBoost;
				this.app.touchPulse = false;
				this.app.touchBoost = false;
			}
			if (this.game.settings.assistMove) {
				out.mx *= 0.87;
				out.my *= 0.87;
			}
			return out;
		}
		target(p) {
			const s = this.app.world?.s;
			if (!s) return null;
			const targets = s.enemies.filter(
				(e) => e.hp > 0 && e.tele <= 0 && (s.act !== 2 || e.y < p.y - 15),
			);
			if (s.boss)
				targets.push(...s.boss.parts.filter((c) => c.open && c.hp > 0));
			return targets.sort((a, b) => S.dist(p, a) - S.dist(p, b))[0];
		}
		labels() {
			const I = this.game.input;
			return I.lastDevice === "touch"
				? [
						["LEFT THUMB", "Thrust"],
						["RIGHT DRAG", "Aim & fire"],
						["AUTO", "Aim assistance"],
					]
				: [
						[I.lastDevice === "gamepad" ? "L" : "WASD / ARROWS", "Thrust"],
						[I.lastDevice === "gamepad" ? "R" : "MOUSE", "Aim"],
						[I.label("fire"), "Fire"],
						[I.label("boost"), "Boost"],
						[I.label("pulse"), "Pulse"],
					];
		}
	}
	Object.assign(S, { MAP, IntentInput });
})(globalThis.Fortnight);
