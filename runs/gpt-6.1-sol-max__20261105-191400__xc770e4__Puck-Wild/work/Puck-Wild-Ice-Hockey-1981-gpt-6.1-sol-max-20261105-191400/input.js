const DEAD = 0.18;
export class Controls {
	constructor(onActivity, onMenu) {
		this.keys = new Set();
		this.pressed = new Set();
		this.released = new Set();
		this.mouse = {
			x: 0,
			y: 0,
			active: false,
			held: false,
			shot: false,
			pass: false,
		};
		this.last = "keyboard";
		this.padOld = [];
		this.menuRepeat = 0;
		this.touches = new Map();
		this.touch = {
			x: 0,
			z: 0,
			boost: false,
			held: false,
			shot: false,
			check: false,
			pass: false,
		};
		this.onActivity = onActivity;
		this.onMenu = onMenu;
		addEventListener("keydown", (e) => {
			if (
				[
					"ArrowUp",
					"ArrowDown",
					"ArrowLeft",
					"ArrowRight",
					"Space",
					"Tab",
				].includes(e.code)
			)
				e.preventDefault();
			if (!e.repeat) {
				this.keys.add(e.code);
				this.pressed.add(e.code);
				this.activity("keyboard");
			}
		});
		addEventListener("keyup", (e) => {
			this.keys.delete(e.code);
			this.released.add(e.code);
		});
		addEventListener("blur", () => this.clear());
		addEventListener("wheel", () => this.activity("mouse"), { passive: true });
		addEventListener("pointermove", (e) => {
			if (e.pointerType !== "mouse") return;
			this.mouse.x = e.clientX;
			this.mouse.y = e.clientY;
			this.mouse.active = true;
			if (Math.abs(e.movementX) + Math.abs(e.movementY) > 1)
				this.activity("mouse");
		});
		document.getElementById("game").addEventListener("pointerdown", (e) => {
			if (e.pointerType === "touch") {
				this.touchStart(e);
				return;
			}
			this.activity("mouse");
			this.mouse.x = e.clientX;
			this.mouse.y = e.clientY;
			this.mouse.active = true;
			if (e.button === 0) this.mouse.held = true;
			if (e.button === 2) this.mouse.pass = true;
		});
		addEventListener("pointerup", (e) => {
			if (e.pointerType === "touch") {
				this.touchEnd(e);
				return;
			}
			if (e.button === 0 && this.mouse.held) {
				this.mouse.shot = true;
				this.mouse.held = false;
			}
		});
		addEventListener("pointermove", (e) => {
			if (e.pointerType !== "touch") return;
			const t = this.touches.get(e.pointerId);
			if (t && t.side === "move") {
				const dx = e.clientX - t.x,
					dz = e.clientY - t.y,
					d = Math.hypot(dx, dz) || 1;
				this.touch.x = dx / Math.max(d, 55);
				this.touch.z = dz / Math.max(d, 55);
				this.touch.boost = d > 80;
			}
		});
		addEventListener("pointercancel", (e) => this.touchEnd(e));
		addEventListener("contextmenu", (e) => e.preventDefault());
	}
	activity(kind) {
		const changed = this.last !== kind;
		this.last = kind;
		this.onActivity?.(kind, changed);
	}
	touchStart(e) {
		this.activity("touch");
		e.preventDefault();
		const side = e.clientX < innerWidth * 0.55 ? "move" : "action";
		this.touches.set(e.pointerId, {
			x: e.clientX,
			y: e.clientY,
			side,
			time: performance.now(),
		});
		if (side === "action") this.touch.held = true;
	}
	touchEnd(e) {
		const t = this.touches.get(e.pointerId);
		if (!t) return;
		if (t.side === "move") {
			this.touch.x = 0;
			this.touch.z = 0;
			this.touch.boost = false;
		} else {
			this.touch.held = false;
			this.touch.shot = true;
			this.touch.check = true;
		}
		this.touches.delete(e.pointerId);
	}
	readPads() {
		const pads = Array.from(navigator.getGamepads?.() || []).filter(
			(p) => p?.connected,
		);
		this.pads = pads;
		return pads;
	}
	padControl(pad, i) {
		if (!pad) return {};
		const old = this.padOld[i] || [],
			buttons = pad.buttons.map((b) => b.pressed),
			edge = (n) => buttons[n] && !old[n],
			release = (n) => !buttons[n] && old[n];
		const dead = (v) =>
			Math.abs(v) > DEAD
				? ((Math.abs(v) - DEAD) / (1 - DEAD)) * Math.sign(v)
				: 0;
		const x =
				dead(pad.axes[0] || 0) + (buttons[15] ? 1 : 0) - (buttons[14] ? 1 : 0),
			z =
				dead(pad.axes[1] || 0) + (buttons[13] ? 1 : 0) - (buttons[12] ? 1 : 0);
		if (
			buttons.some((b, j) => b && !old[j]) ||
			Math.abs(x) + Math.abs(z) > 0.1 ||
			Math.abs(pad.axes[2] || 0) > 0.2 ||
			Math.abs(pad.axes[3] || 0) > 0.2
		)
			this.activity("pad");
		if (Math.abs(pad.axes[3] || 0) > 0.35)
			this.onMenu?.(pad.axes[3] > 0 ? "scroll-down" : "scroll-up");
		if (edge(9) && !buttons[8]) this.onMenu?.("pause");
		if (edge(1)) this.onMenu?.("back");
		if (edge(0)) this.onMenu?.("confirm");
		const menuAxis =
			Math.abs(z) > 0.5 ? Math.sign(z) : buttons[12] ? -1 : buttons[13] ? 1 : 0;
		if (
			menuAxis &&
			(edge(12) || edge(13) || performance.now() > this.menuRepeat)
		) {
			this.onMenu?.(menuAxis > 0 ? "down" : "up");
			this.menuRepeat = performance.now() + 180;
		}
		const horiz = Math.abs(x) > 0.5 ? Math.sign(x) : 0;
		if (
			horiz &&
			(edge(14) || edge(15) || performance.now() > this.menuRepeat)
		) {
			this.onMenu?.(horiz > 0 ? "right" : "left");
			this.menuRepeat = performance.now() + 180;
		}
		this.padOld[i] = buttons;
		return {
			x,
			z,
			pass: edge(0),
			check: edge(2),
			boost: buttons[5] || buttons[10],
			switch: edge(4),
			shootHeld: buttons[7],
			shoot: release(7),
			aimStickX: dead(pad.axes[2] || 0),
			aimStickZ: dead(pad.axes[3] || 0),
		};
	}
	sample(count = 1, aim = null) {
		const pads = this.readPads(),
			out = {};
		for (let i = 0; i < Math.max(count, pads.length); i++)
			out[i] = this.padControl(pads[i], i);
		const k = this.keys,
			p = this.pressed,
			r = this.released,
			main = out[0] || {};
		const keyboard = {
			x:
				(k.has("KeyD") || k.has("ArrowRight") ? 1 : 0) -
				(k.has("KeyA") || k.has("ArrowLeft") ? 1 : 0),
			z:
				(k.has("KeyS") || k.has("ArrowDown") ? 1 : 0) -
				(k.has("KeyW") || k.has("ArrowUp") ? 1 : 0),
			pass: p.has("KeyE") || this.mouse.pass,
			check: p.has("KeyQ"),
			boost: k.has("ShiftLeft"),
			switch: p.has("Tab"),
			shootHeld: k.has("Space") || this.mouse.held,
			shoot: r.has("Space") || this.mouse.shot,
		};
		if (!pads[0] || keyboard.x || keyboard.z) {
			main.x = keyboard.x;
			main.z = keyboard.z;
		}
		for (const key of [
			"pass",
			"check",
			"boost",
			"switch",
			"shootHeld",
			"shoot",
		])
			main[key] = !!main[key] || keyboard[key];
		if (this.last === "mouse" && this.mouse.active && aim) {
			const a = aim(this.mouse.x, this.mouse.y);
			main.aimX = a.x;
			main.aimZ = a.z;
		}
		if (this.last === "touch")
			Object.assign(main, {
				x: this.touch.x,
				z: this.touch.z,
				boost: this.touch.boost,
				shootHeld: this.touch.held,
				shoot: this.touch.shot,
				check: this.touch.check,
				pass: this.touch.pass,
			});
		out[0] = main;
		if (count > 1) {
			const second = out[1] || {},
				keys = {
					x: (k.has("KeyL") ? 1 : 0) - (k.has("KeyJ") ? 1 : 0),
					z: (k.has("KeyK") ? 1 : 0) - (k.has("KeyI") ? 1 : 0),
					shootHeld: k.has("KeyN"),
					shoot: r.has("KeyN"),
					pass: p.has("KeyO"),
					check: p.has("KeyU"),
					boost: k.has("ShiftRight"),
					switch: p.has("KeyM"),
				};
			if (!pads[1] || keys.x || keys.z) {
				second.x = keys.x;
				second.z = keys.z;
			}
			for (const key of [
				"shootHeld",
				"shoot",
				"pass",
				"check",
				"boost",
				"switch",
			])
				second[key] = !!second[key] || keys[key];
			out[1] = second;
		}
		for (let i = 2; i < count; i++) if (!pads[i]) delete out[i];
		if (p.has("Escape") || p.has("KeyP")) this.onMenu?.("pause");
		if (p.has("Enter")) this.onMenu?.("confirm");
		for (const [key, action] of [
			["ArrowUp", "up"],
			["ArrowDown", "down"],
			["ArrowLeft", "left"],
			["ArrowRight", "right"],
		])
			if (p.has(key)) this.onMenu?.(action);
		this.pressed.clear();
		this.released.clear();
		this.mouse.shot = false;
		this.mouse.pass = false;
		this.touch.shot = false;
		this.touch.pass = false;
		this.touch.check = false;
		return out;
	}
	clear() {
		this.keys.clear();
		this.pressed.clear();
		this.released.clear();
		this.mouse.held = false;
		this.mouse.shot = false;
		this.touches.clear();
		this.touch = {
			x: 0,
			z: 0,
			boost: false,
			held: false,
			shot: false,
			check: false,
			pass: false,
		};
	}
}
