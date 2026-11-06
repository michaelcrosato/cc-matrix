export class Input {
	constructor(canvas) {
		this.canvas = canvas;
		this.keys = new Set();
		this.mouse = { x: 0, y: 0, down: false, active: false };
		this.device = "keyboard";
		this.pads = [];
		this.edges = {};
		this.oldPads = new Map();
		this.touch = new Map();
		this.lastInput = performance.now();
		this.onActivity = () => {};
		this.onPause = () => {};
		this.onConfirm = () => {};
		this.onMenu = () => {};
		this.onBack = () => {};
		this.onTouch = () => {};
		this.menu = true;
		this.blocked = false;
		this.justBoost = false;
		this.lastTap = 0;
		const activity = (d) => this.activity(d);
		window.addEventListener("keydown", (e) => {
			if (e.target.matches("textarea,input:not([type=range])")) {
				if (e.code === "Escape") {
					e.preventDefault();
					this.onPause();
				}
				return;
			}
			activity("keyboard");
			this.keys.add(e.code);
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
			if (!e.repeat) {
				if (e.code === "Escape") this.onPause();
				if (this.menu) {
					if (e.code === "Enter" || e.code === "Space") {
						e.preventDefault();
						this.onConfirm();
					}
					if (e.code === "ArrowUp" || e.code === "KeyW") this.onMenu(0, -1);
					if (e.code === "ArrowDown" || e.code === "KeyS" || e.code === "Tab")
						this.onMenu(0, 1);
					if (e.code === "ArrowLeft" || e.code === "KeyA") this.onMenu(-1, 0);
					if (e.code === "ArrowRight" || e.code === "KeyD") this.onMenu(1, 0);
				}
				if (e.code === "ShiftLeft" || e.code === "ShiftRight")
					this.justBoost = true;
			}
		});
		window.addEventListener("keyup", (e) => this.keys.delete(e.code));
		window.addEventListener("blur", () => {
			this.keys.clear();
			this.mouse.down = false;
			this.touch.clear();
		});
		window.addEventListener("pointermove", (e) => {
			if (e.pointerType === "touch") return;
			this.mouse.x = e.clientX;
			this.mouse.y = e.clientY;
			if (e.movementX || e.movementY) {
				activity("keyboard");
				this.mouse.active = true;
			}
		});
		canvas.addEventListener("pointerdown", (e) => {
			if (e.pointerType === "touch") return;
			activity("keyboard");
			this.mouse.x = e.clientX;
			this.mouse.y = e.clientY;
			this.mouse.active = true;
			this.mouse.down = true;
		});
		window.addEventListener("pointerup", (e) => {
			if (e.pointerType !== "touch") this.mouse.down = false;
		});
		window.addEventListener("contextmenu", (e) => e.preventDefault());
		canvas.addEventListener(
			"touchstart",
			(e) => {
				e.preventDefault();
				activity("touch");
				for (const t of e.changedTouches) {
					const right = t.clientX > innerWidth * 0.5;
					this.touch.set(t.identifier, {
						x: t.clientX,
						y: t.clientY,
						sx: t.clientX,
						sy: t.clientY,
						right,
					});
					if (right) {
						if (performance.now() - this.lastTap < 320) this.justBoost = true;
						this.lastTap = performance.now();
					}
				}
				this.onTouch(this.touch);
			},
			{ passive: false },
		);
		canvas.addEventListener(
			"touchmove",
			(e) => {
				e.preventDefault();
				for (const t of e.changedTouches) {
					const p = this.touch.get(t.identifier);
					if (p) {
						p.x = t.clientX;
						p.y = t.clientY;
					}
				}
				this.onTouch(this.touch);
			},
			{ passive: false },
		);
		for (const event of ["touchend", "touchcancel"])
			canvas.addEventListener(
				event,
				(e) => {
					e.preventDefault();
					for (const t of e.changedTouches) this.touch.delete(t.identifier);
					this.onTouch(this.touch);
				},
				{ passive: false },
			);
		window.addEventListener("gamepadconnected", () => this.activity("pad"));
		window.addEventListener("pointerdown", (e) => {
			if (e.target !== canvas)
				this.activity(e.pointerType === "touch" ? "touch" : "keyboard");
		});
	}
	activity(d) {
		this.lastInput = performance.now();
		if (d !== this.device) {
			this.device = d;
			document.body.dataset.input = d;
		}
		this.onActivity(d);
	}
	poll() {
		this.pads = Array.from(navigator.getGamepads?.() || []).filter(Boolean);
		const now = performance.now();
		for (const p of this.pads) {
			const old = this.oldPads.get(p.index) || { b: [], nav: 0 };
			const b = p.buttons.map((v) => v.pressed || v.value > 0.5);
			const axes = p.axes.map((v) => (Math.abs(v) > 0.18 ? v : 0));
			if (b.some(Boolean) || axes.some((v) => Math.abs(v) > 0.25))
				this.activity("pad");
			if (!b[8] && b[9] && !old.b[9]) this.onPause();
			if (this.menu) {
				if (b[0] && !old.b[0]) this.onConfirm();
				if (b[1] && !old.b[1]) this.onBack();
				const x = b[14]
					? -1
					: b[15]
						? 1
						: Math.abs(axes[0] || 0) > 0.6
							? Math.sign(axes[0])
							: 0;
				const y = b[12]
					? -1
					: b[13]
						? 1
						: Math.abs(axes[1] || 0) > 0.6
							? Math.sign(axes[1])
							: 0;
				if ((x || y) && now > old.nav) {
					this.onMenu(x, y);
					old.nav = now + 210;
				}
				if (!x && !y) old.nav = 0;
			}
			this.edges[p.index] = {
				boost: (b[4] && !old.b[4]) || (b[0] && !old.b[0]),
				fire: b[7] || b[5],
				axes,
				b,
			};
			old.b = b;
			this.oldPads.set(p.index, old);
		}
	}
	read(index = 0, local = false) {
		const out = {
			x: 0,
			z: 0,
			ax: 0,
			az: 0,
			aim: false,
			fire: false,
			boost: false,
			mouse: false,
		};
		if (this.menu || this.blocked) return out;
		const k = this.keys;
		if (index === 0) {
			out.x = (k.has("KeyD") ? 1 : 0) - (k.has("KeyA") ? 1 : 0);
			out.z = (k.has("KeyS") ? 1 : 0) - (k.has("KeyW") ? 1 : 0);
			out.fire = k.has("Space") || this.mouse.down;
			out.boost = this.justBoost;
			this.justBoost = false;
			out.mouse = this.mouse.active && this.device === "keyboard";
		} else if (local && index === 1) {
			out.x = (k.has("ArrowRight") ? 1 : 0) - (k.has("ArrowLeft") ? 1 : 0);
			out.z = (k.has("ArrowDown") ? 1 : 0) - (k.has("ArrowUp") ? 1 : 0);
			out.ax = (k.has("KeyL") ? 1 : 0) - (k.has("KeyJ") ? 1 : 0);
			out.az = (k.has("KeyK") ? 1 : 0) - (k.has("KeyI") ? 1 : 0);
			out.aim = !!(out.ax || out.az);
			out.fire = k.has("Slash") || k.has("ControlRight");
			out.boost = k.has("Period");
		}
		let pad;
		if (local)
			pad =
				this.pads.length === 1
					? index === 1
						? this.pads[0]
						: null
					: this.pads[index];
		else pad = this.pads[0];
		if (pad) {
			const e = this.edges[pad.index];
			if (e) {
				out.x += e.axes[0] || 0;
				out.z += e.axes[1] || 0;
				if (Math.hypot(e.axes[2] || 0, e.axes[3] || 0) > 0.25) {
					out.ax = e.axes[2];
					out.az = e.axes[3];
					out.aim = true;
				}
				out.fire = out.fire || e.fire;
				out.boost = out.boost || e.boost;
			}
		}
		if (index === 0 && this.touch.size) {
			let right = false;
			for (const t of this.touch.values()) {
				let x = (t.x - t.sx) / 55,
					z = (t.y - t.sy) / 55,
					len = Math.hypot(x, z);
				if (len > 1) {
					x /= len;
					z /= len;
				}
				if (t.right) {
					out.ax = x;
					out.az = z;
					out.aim = len > 0.15;
					out.fire = true;
					right = true;
				} else {
					out.x = x;
					out.z = z;
				}
			}
			out.touch = true;
			out.assist = !right;
		}
		const l = Math.hypot(out.x, out.z);
		if (l > 1) {
			out.x /= l;
			out.z /= l;
		}
		return out;
	}
	clear() {
		this.keys.clear();
		this.mouse.down = false;
		this.justBoost = false;
		this.touch.clear();
		this.onTouch(this.touch);
	}
}
