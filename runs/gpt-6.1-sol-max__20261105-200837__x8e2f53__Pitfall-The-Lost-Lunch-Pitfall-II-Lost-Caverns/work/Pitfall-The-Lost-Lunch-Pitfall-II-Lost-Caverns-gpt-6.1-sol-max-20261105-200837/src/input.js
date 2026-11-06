export class Controls {
	constructor(onAction, onActivity) {
		this.onAction = onAction;
		this.onActivity = onActivity;
		this.keys = new Set();
		this.last = matchMedia("(pointer: coarse)").matches ? "touch" : "keyboard";
		this.padPrev = {};
		this.keyJump = [false, false];
		this.touch = { x: 0, y: 0, jump: false, action: false };
		this.test = {};
		this.pointer = null;
		addEventListener("keydown", (e) => {
			if (e.target.matches("input,textarea,select")) {
				if (e.code === "Escape") this.onAction("back");
				return;
			}
			if (
				[
					"Space",
					"ArrowUp",
					"ArrowDown",
					"ArrowLeft",
					"ArrowRight",
					"Tab",
				].includes(e.code)
			)
				e.preventDefault();
			this.activity("keyboard");
			this.keys.add(e.code);
			if (e.repeat) return;
			const a = {
				Escape: "pause",
				KeyP: "pause",
				KeyM: "map",
				Enter: "confirm",
				Space: "jump",
				KeyE: "interact",
				KeyO: "interact2",
				ArrowUp: "up",
				ArrowDown: "down",
				ArrowLeft: "left",
				ArrowRight: "right",
				Tab: "map",
				KeyF: "fullscreen",
				Backspace: "back",
			}[e.code];
			if (a) this.onAction(a);
		});
		addEventListener("keyup", (e) => {
			this.keys.delete(e.code);
		});
		addEventListener("blur", () => {
			this.keys.clear();
			this.touch.x = this.touch.y = 0;
			this.touch.jump = false;
		});
		addEventListener("pointerdown", (e) => {
			this.activity(e.pointerType === "touch" ? "touch" : "keyboard");
			if (
				e.pointerType !== "touch" ||
				e.target.closest("button,input,textarea,[data-panel]")
			)
				return;
			if (e.clientX < innerWidth * 0.52 && !this.pointer) {
				this.pointer = { id: e.pointerId, x: e.clientX, y: e.clientY };
			} else {
				this.touch.jump = true;
				this.onAction("jump");
			}
		});
		addEventListener("pointermove", (e) => {
			if (
				e.pointerType !== "touch" &&
				Math.abs(e.movementX) + Math.abs(e.movementY) > 0
			)
				this.activity("keyboard");
			if (this.pointer?.id !== e.pointerId) return;
			this.touch.x = Math.max(
				-1,
				Math.min(1, (e.clientX - this.pointer.x) / 62),
			);
			this.touch.y = Math.max(
				-1,
				Math.min(1, (this.pointer.y - e.clientY) / 62),
			);
		});
		const end = (e) => {
			if (this.pointer?.id === e.pointerId) {
				this.pointer = null;
				this.touch.x = this.touch.y = 0;
			} else this.touch.jump = false;
		};
		addEventListener("pointerup", end);
		addEventListener("pointercancel", end);
	}
	activity(type) {
		this.last = type;
		this.onActivity(type);
	}
	pads() {
		return [...(navigator.getGamepads?.() || [])].filter(Boolean);
	}
	poll() {
		const pads = this.pads();
		for (let i = 0; i < pads.length; i++) {
			const p = pads[i],
				old = this.padPrev[p.index] || [],
				b = p.buttons.map((x) => x.pressed);
			const moved =
				Math.abs(p.axes[0] || 0) > 0.24 || Math.abs(p.axes[1] || 0) > 0.24;
			if (moved || b.some((v, j) => v && !old[j])) this.activity("gamepad");
			const actions = {
				0: "jump",
				1: "back",
				2: i ? "interact2" : "interact",
				3: "map",
				9: "pause",
				12: "up",
				13: "down",
				14: "left",
				15: "right",
			};
			for (const [j, action] of Object.entries(actions))
				if (b[j] && !old[j] && !(j === "9" && b[8])) this.onAction(action, i);
			if (moved) {
				const now = performance.now();
				if (now > (this.axisNext || 0)) {
					if (Math.abs(p.axes[1]) > 0.6)
						this.onAction(p.axes[1] < 0 ? "up" : "down", i);
					else if (Math.abs(p.axes[0]) > 0.6)
						this.onAction(p.axes[0] < 0 ? "left" : "right", i);
					this.axisNext = now + 170;
				}
			}
			this.padPrev[p.index] = b;
		}
	}
	read(i = 0) {
		if (this.test[i]) return { ...this.test[i] };
		const k = this.keys,
			pads = this.pads(),
			p = pads[i];
		const dead = (v) => (Math.abs(v || 0) > 0.2 ? v : 0);
		let x = 0,
			y = 0,
			jump = false;
		if (!i) {
			x =
				+k.has("KeyD") +
				+k.has("ArrowRight") -
				+k.has("KeyA") -
				+k.has("ArrowLeft");
			y =
				+k.has("KeyW") +
				+k.has("ArrowUp") -
				+k.has("KeyS") -
				+k.has("ArrowDown");
			jump = k.has("Space");
		} else {
			x = +k.has("KeyL") - +k.has("KeyJ");
			y = +k.has("KeyI") - +k.has("KeyK");
			jump = k.has("ShiftRight");
		}
		if (p) {
			x +=
				dead(p.axes[0]) +
				+(p.buttons[15]?.pressed || false) -
				+(p.buttons[14]?.pressed || false);
			y +=
				-dead(p.axes[1]) +
				+(p.buttons[12]?.pressed || false) -
				+(p.buttons[13]?.pressed || false);
			jump ||= !!p.buttons[0]?.pressed;
		}
		if (!i && this.last === "touch") {
			x += this.touch.x;
			y += this.touch.y;
			jump ||= this.touch.jump;
		}
		return {
			x: Math.max(-1, Math.min(1, x)),
			y: Math.max(-1, Math.min(1, y)),
			jump,
			interact: false,
		};
	}
}
