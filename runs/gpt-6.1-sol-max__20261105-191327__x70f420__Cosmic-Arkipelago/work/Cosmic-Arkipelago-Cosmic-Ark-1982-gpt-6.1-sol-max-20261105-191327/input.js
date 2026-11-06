import { blankInput, clamp } from "./core.js";
const keyCode = (e) =>
	e.code ||
	{
		" ": "Space",
		Escape: "Escape",
		Enter: "Enter",
		ArrowUp: "ArrowUp",
		ArrowDown: "ArrowDown",
		ArrowLeft: "ArrowLeft",
		ArrowRight: "ArrowRight",
	}[e.key] ||
	(/^.$/.test(e.key) ? "Key" + e.key.toUpperCase() : e.key);
export class FlightInput {
	constructor({ activity, key, menu, isMenu, worldPoint }) {
		this.activity = activity;
		this.onKey = key;
		this.menu = menu;
		this.isMenu = isMenu;
		this.worldPoint = worldPoint;
		this.keys = new Set();
		this.last = "keyboard";
		this.mouse = { x: 0, y: 0, down: false, active: false };
		this.touches = new Map();
		this.prevPads = new Map();
		this.menuRepeat = 0;
		this.touchSpecial = false;
		document.addEventListener("keydown", (e) => {
			if (e.repeat && this.isMenu()) return;
			const k = keyCode(e);
			if (this.activity("keyboard")) {
				e.preventDefault();
				return;
			}
			if (
				e.target.matches("input[type=text],input:not([type])") &&
				k !== "Escape" &&
				k !== "Enter"
			)
				return;
			if (this.onKey(k, e)) {
				e.preventDefault();
				return;
			}
			this.keys.add(k);
			if (
				["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(k)
			)
				e.preventDefault();
		});
		document.addEventListener("keyup", (e) => this.keys.delete(keyCode(e)));
		window.addEventListener("blur", () => {
			this.keys.clear();
			this.mouse.down = false;
			this.touches.clear();
		});
		document.addEventListener("pointermove", (e) => {
			if (e.pointerType === "touch") {
				const t = this.touches.get(e.pointerId);
				if (t) {
					t.x = e.clientX;
					t.y = e.clientY;
					this.activity("touch");
				}
				return;
			}
			if (e.movementX || e.movementY) {
				this.activity("keyboard");
				this.mouse.x = e.clientX;
				this.mouse.y = e.clientY;
				this.mouse.active = true;
			}
			const b = e.target.closest("button");
			if (b && this.isMenu()) b.focus({ preventScroll: true });
		});
		document.addEventListener(
			"pointerdown",
			(e) => {
				const type = e.pointerType === "touch" ? "touch" : "keyboard";
				if (this.activity(type)) {
					e.preventDefault();
					e.stopImmediatePropagation();
					return;
				}
				if (e.target.closest("button,input,.panel")) return;
				if (e.pointerType === "touch") {
					this.touches.set(e.pointerId, {
						sx: e.clientX,
						sy: e.clientY,
						x: e.clientX,
						y: e.clientY,
					});
					e.target.setPointerCapture?.(e.pointerId);
				} else {
					this.mouse.down = e.button === 0;
					this.mouse.x = e.clientX;
					this.mouse.y = e.clientY;
					this.mouse.active = true;
				}
			},
			true,
		);
		document.addEventListener("pointerup", (e) => {
			this.touches.delete(e.pointerId);
			this.mouse.down = false;
			this.touchSpecial = false;
		});
		document.addEventListener("pointercancel", (e) => {
			this.touches.delete(e.pointerId);
			this.touchSpecial = false;
		});
	}
	use(type) {
		this.last = type;
		document.body.classList.toggle("touch-mode", type === "touch");
	}
	poll(dt) {
		this.menuRepeat -= dt;
		const pads = Array.from(navigator.getGamepads?.() || []).filter(Boolean);
		for (const p of pads) {
			const prev = this.prevPads.get(p.index) || [],
				buttons = p.buttons.map((b) => !!b.pressed),
				axes = p.axes.map((v) => (Math.abs(v) > 0.22 ? v : 0));
			const active = buttons.some(Boolean) || axes.some(Boolean);
			if (active) {
				if (this.activity("gamepad")) {
					this.prevPads.set(p.index, buttons);
					continue;
				}
				this.use("gamepad");
			}
			if (buttons[9] && !prev[9] && !buttons[8]) this.onKey("Escape", {});
			if (this.isMenu()) {
				if (buttons[0] && !prev[0]) this.menu("select");
				if (buttons[1] && !prev[1]) this.menu("back");
				if (this.menuRepeat <= 0) {
					const y = axes[1] || (buttons[13] ? 1 : 0) - (buttons[12] ? 1 : 0),
						x = axes[0] || (buttons[15] ? 1 : 0) - (buttons[14] ? 1 : 0);
					if (Math.abs(y) > 0.45) {
						this.menu(y > 0 ? "next" : "prev");
						this.menuRepeat = 0.2;
					} else if (Math.abs(x) > 0.45) {
						this.menu(x > 0 ? "right" : "left");
						this.menuRepeat = 0.16;
					}
				}
			}
			this.prevPads.set(p.index, buttons);
		}
	}
	sample(phase, coop = false) {
		const i = blankInput(),
			k = this.keys;
		const rescue = phase === "rescue";
		const second = coop && rescue;
		const left = second
			? ["ArrowLeft"]
			: coop
				? ["KeyA"]
				: ["KeyA", "ArrowLeft"];
		const right = second
			? ["ArrowRight"]
			: coop
				? ["KeyD"]
				: ["KeyD", "ArrowRight"];
		const up = second ? ["ArrowUp"] : coop ? ["KeyW"] : ["KeyW", "ArrowUp"];
		const down = second
			? ["ArrowDown"]
			: coop
				? ["KeyS"]
				: ["KeyS", "ArrowDown"];
		i.x = right.some((a) => k.has(a)) - left.some((a) => k.has(a));
		i.y = up.some((a) => k.has(a)) - down.some((a) => k.has(a));
		i.beam = k.has("Space") || this.mouse.down;
		i.dash = k.has("ShiftLeft") || k.has("ShiftRight");
		i.pulse = k.has("KeyE") || k.has("KeyQ") || (!rescue && this.touchSpecial);
		i.fire = this.mouse.down;
		if (!rescue && this.mouse.down && this.mouse.active) {
			const pos = this.worldPoint(this.mouse.x, this.mouse.y);
			i.aimX = pos.x;
			i.aimY = pos.y;
		}
		const pads = Array.from(navigator.getGamepads?.() || []).filter(Boolean),
			pad =
				pads[second ? 1 : 0] || (pads.length === 1 && !coop ? pads[0] : null);
		if (pad) {
			const a = pad.axes,
				b = pad.buttons;
			const dead = (v) => (Math.abs(v || 0) > 0.18 ? v : 0);
			const x =
					dead(a[0]) || (b[15]?.pressed ? 1 : 0) - (b[14]?.pressed ? 1 : 0),
				y = -dead(a[1]) || (b[12]?.pressed ? 1 : 0) - (b[13]?.pressed ? 1 : 0);
			if (x || y) {
				i.x = x;
				i.y = y;
			}
			if (!rescue && (dead(a[2]) || dead(a[3]))) {
				i.aimX = dead(a[2]);
				i.aimY = -dead(a[3]);
			}
			i.beam ||= b[0]?.pressed || b[7]?.pressed;
			i.dash ||= b[1]?.pressed || b[4]?.pressed;
			i.pulse ||= b[5]?.pressed || b[3]?.pressed;
		}
		const t = this.touches.values().next().value;
		if (t) {
			i.x = clamp((t.x - t.sx) / 55, -1, 1);
			i.y = clamp((t.sy - t.y) / 55, -1, 1);
			i.dash ||= this.touchSpecial;
		}
		return i;
	}
	rumble(strength = 0.4) {
		for (const p of Array.from(navigator.getGamepads?.() || []).filter(Boolean))
			p.vibrationActuator
				?.playEffect?.("dual-rumble", {
					duration: 180,
					strongMagnitude: strength,
					weakMagnitude: strength * 0.5,
				})
				?.catch?.(() => {});
	}
	clear() {
		this.keys.clear();
		this.mouse.down = false;
		this.touches.clear();
	}
}
