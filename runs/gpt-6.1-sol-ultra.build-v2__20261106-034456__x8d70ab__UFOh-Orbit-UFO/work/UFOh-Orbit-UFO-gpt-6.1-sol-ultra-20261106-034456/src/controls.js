const E = globalThis.My3D2dge;
export const NEUTRAL = Object.freeze({
	mx: 0,
	my: 0,
	ax: 0,
	ay: 0,
	aim: false,
	fire: false,
});
export const INPUT = {
	...E.Input.SHMUP,
	fire: ["Space", "KeyZ", "KeyJ", "Mouse0", "Pad7", "Pad0"],
	pause: ["Escape", "KeyP", "Pad9"],
	confirm: ["Enter", "Space", "KeyJ", "Pad0"],
	cancel: ["Escape", "Backspace", "KeyX", "Pad1"],
};
export class Controls {
	constructor(
		game,
		{ activity, cancelAttract, isPlaying, isAttract, onUnlock },
	) {
		this.game = game;
		this.onUnlock = onUnlock;
		this.activity = activity;
		this.isPlaying = isPlaying;
		this.isAttract = isAttract;
		this.cancelAttract = cancelAttract;
		this.contacts = new Map();
		this.touchMove = null;
		this.touchAim = null;
		this.blockUntil = 0;
		this.lastTouch = false;
		const signal = game._abort?.signal;
		const raw = (e) => {
			if (
				e.type === "pointermove" &&
				e.pointerType === "mouse" &&
				Math.hypot(e.movementX || 0, e.movementY || 0) < 3
			)
				return;
			this.activity();
			if (e.type === "keydown" || e.type === "pointerdown") onUnlock();
			if (isAttract()) {
				e.preventDefault();
				e.stopImmediatePropagation();
				this.cancelAttract();
				this.clear();
				this.blockUntil = game.real + 0.18;
			}
		};
		for (const t of ["keydown", "pointerdown", "pointermove", "wheel"])
			window.addEventListener(t, raw, {
				capture: true,
				passive: false,
				signal,
			});
		const canvas = game.screen.canvas;
		const touch = (e) => {
			if (e.pointerType === "mouse" || !isPlaying() || game.shell?.screen)
				return;
			if (isAttract()) return;
			e.preventDefault();
			e.stopImmediatePropagation();
			this.activity();
			onUnlock();
			game.input.lastDevice = "touch";
			this.lastTouch = true;
			const rc = canvas.getBoundingClientRect(),
				x = e.clientX - rc.left,
				y = e.clientY - rc.top;
			if (e.type === "pointerdown") {
				const side = x < rc.width * 0.5 ? "move" : "aim";
				if ([...this.contacts.values()].some((p) => p.side === side)) return;
				this.contacts.set(e.pointerId, { side, x0: x, y0: y, x, y });
				canvas.setPointerCapture?.(e.pointerId);
			} else if (e.type === "pointermove") {
				const p = this.contacts.get(e.pointerId);
				if (p) {
					p.x = x;
					p.y = y;
				}
			} else this.contacts.delete(e.pointerId);
			this.touchMove =
				[...this.contacts.values()].find((p) => p.side === "move") || null;
			this.touchAim =
				[...this.contacts.values()].find((p) => p.side === "aim") || null;
		};
		for (const t of [
			"pointerdown",
			"pointermove",
			"pointerup",
			"pointercancel",
			"lostpointercapture",
		])
			canvas.addEventListener(t, touch, {
				capture: true,
				passive: false,
				signal,
			});
		window.addEventListener("blur", () => this.clear(), { signal });
		document.addEventListener(
			"visibilitychange",
			() => {
				if (document.hidden) this.clear();
			},
			{ signal },
		);
		// Native touch gestures are replaced with two invisible, independently owned sticks.
		game.input.touchEnabled = false;
	}
	clear() {
		this.releaseTouch();
		for (const I of this.game.players || [this.game.input]) I.clear();
	}
	releaseTouch() {
		this.contacts.clear();
		this.touchMove = this.touchAim = null;
		this.rescueUntil = 0;
	}
	padActivity() {
		const pads = [...(navigator.getGamepads?.() || [])].filter(Boolean);
		const meaningful = pads.some(
			(p) =>
				p.buttons.some((b, i) => b.pressed && i !== 16) ||
				p.axes.some((a) => Math.abs(a) > 0.25),
		);
		if (meaningful) {
			this.onUnlock();
			this.activity();
			if (this.isAttract()) {
				this.cancelAttract();
				this.clear();
				this.blockUntil = this.game.real + 0.25;
				return true;
			}
		}
		return false;
	}
	intent(world, index = 0, pilotIndex = index) {
		const I =
			(this.game.players || [this.game.input])[index] || this.game.input;
		if (
			this.game.real < this.blockUntil ||
			this.game.shell?.screen ||
			this.game.paused
		)
			return { ...NEUTRAL };
		let [mx, my] = I.move();
		let ax = 0,
			ay = 0,
			aim = false,
			fire = I.down("fire") || I.pressed("fire");
		const p = world?.players?.[pilotIndex];
		if (I.padAim && Math.hypot(...I.padAim) > 0.08) {
			[ax, ay] = I.padAim;
			aim = true;
		} else if (index === 0 && I.aimSource === "mouse" && I.mouse.active && p) {
			const pos = this.game.mouseGround();
			if (pos) {
				ax = pos[0] - p.x;
				ay = pos[1] - p.y;
				aim = Math.hypot(ax, ay) > 4;
			}
		}
		if (
			index === 0 &&
			(this.touchMove || this.touchAim || I.lastDevice === "touch")
		) {
			const vec = (p) => {
				if (!p) return [0, 0];
				const x = (p.x - p.x0) / 48,
					y = (p.y - p.y0) / 48,
					n = Math.max(1, Math.hypot(x, y));
				return [x / n, y / n];
			};
			[mx, my] = vec(this.touchMove);
			const v = vec(this.touchAim);
			if (Math.hypot(...v) > 0.13) {
				[ax, ay] = v;
				aim = true;
				fire = world.time % 2.35 < 0.4;
			} else if (p) {
				let best = null,
					d = Infinity;
				for (const e of world.enemies || []) {
					if (e.dead) continue;
					const dd = Math.hypot(e.x - p.x, e.y - p.y);
					if (dd < d) {
						d = dd;
						best = e;
					}
				}
				if (best) {
					ax = best.x - p.x;
					ay = best.y - p.y;
					aim = true;
					fire = d < 420 && p.shield <= 0 && world.time % 2.35 < 0.25;
				}
			}
		}
		if (this.rescueUntil > this.game.real && p && p.shield <= 0) {
			const q = world.players.find((q) => q.down && q.active !== false);
			if (q) {
				const d = Math.hypot(q.x - p.x, q.y - p.y) || 1;
				mx = (q.x - p.x) / d;
				my = (q.y - p.y) / d;
				fire = false;
			}
		}
		return { mx, my, ax, ay, aim, fire };
	}
	pairing(kind) {
		const g = this.game;
		for (const I of [...g.players].slice(1)) g.removePlayer(I.player);
		const pads = [...(navigator.getGamepads?.() || [])].filter(
			(p) => p && p.connected,
		);
		if (kind === "two-pad") {
			if (pads.length < 2)
				return "Two controllers are needed. Connect both and press a face button.";
			g.input.pad = pads[0].index;
			g.addPlayer({ pad: pads[1].index });
		} else if (kind === "keyboard-pad") {
			if (!pads.length)
				return "Connect a controller and press a face button. Pilot 1 uses keyboard and mouse.";
			g.input.pad = null;
			g.addPlayer({ pad: pads[0].index });
		} else if (kind === "keyboard") {
			g.input.pad = null;
			g.addPlayer({ keys: "right" });
		} else g.input.pad = "any";
		for (const I of g.players) {
			I.touchEnabled = false;
			I.clear();
		}
		return null;
	}
	prompt() {
		const I = this.game.input;
		return I.lastDevice === "touch"
			? "LEFT THUMB MOVE / RIGHT THUMB AIM"
			: I.lastDevice === "gamepad"
				? `L MOVE / R AIM / ${I.label("fire")} FIRE / OPTIONS MENU`
				: "WASD MOVE / MOUSE AIM / CLICK OR SPACE FIRE / ESC MENU";
	}
}
