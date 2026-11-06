export class HockeyInput {
	constructor(canvas, callbacks) {
		this.canvas = canvas;
		this.cb = callbacks;
		this.keys = new Set();
		this.latched = new Set();
		this.type = navigator.maxTouchPoints > 0 ? "touch" : "keyboard";
		this.mouse = { x: 0, y: 0, active: false, down: false, pass: false };
		this.mouseLatch = { shoot: false, pass: false };
		this.touchLatch = { shoot: false, check: false };
		this.touch = { x: 0, z: 0, shoot: false, check: false };
		this.pads = [];
		this.oldPads = [];
		this.menuNext = 0;
		document.body.classList.toggle("touch", this.type === "touch");
		this.activity = (type) => {
			this.type = type;
			document.body.classList.toggle("touch", type === "touch");
			return this.cb.activity(type);
		};
		window.addEventListener("keydown", (e) => {
			const typing = /INPUT|TEXTAREA/.test(e.target.tagName);
			if (typing && e.code !== "Escape") return;
			if (this.activity("keyboard")) {
				e.preventDefault();
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
				].includes(e.code) &&
				!typing &&
				e.code !== "Tab"
			)
				e.preventDefault();
			this.keys.add(e.code);
			if (
				[
					"Space",
					"KeyE",
					"ShiftLeft",
					"ShiftRight",
					"KeyQ",
					"KeyJ",
					"KeyK",
					"KeyL",
					"KeyU",
				].includes(e.code)
			)
				this.latched.add(e.code);
			if (e.repeat) return;
			if (e.code === "Escape") {
				this.cb.pause();
				return;
			}
			if (this.cb.isMenu()) {
				if (e.code === "ArrowDown" || e.code === "KeyS") this.cb.navigate(1);
				else if (e.code === "ArrowUp" || e.code === "KeyW")
					this.cb.navigate(-1);
				else if (e.code === "ArrowLeft") this.cb.adjust(-1);
				else if (e.code === "ArrowRight") this.cb.adjust(1);
				else if (e.code === "Enter" || e.code === "Space") this.cb.activate();
			}
		});
		window.addEventListener("keyup", (e) => this.keys.delete(e.code));
		window.addEventListener("blur", () => {
			this.clear();
			this.cb.blur();
		});
		window.addEventListener("pointermove", (e) => {
			if (e.pointerType === "touch") return;
			this.activity("keyboard");
			const r = canvas.getBoundingClientRect();
			this.mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
			this.mouse.y = (-(e.clientY - r.top) / r.height) * 2 + 1;
			this.mouse.active = e.target === canvas && !this.cb.isMenu();
		});
		canvas.addEventListener("contextmenu", (e) => e.preventDefault());
		canvas.addEventListener("pointerdown", (e) => {
			if (e.pointerType === "touch") return;
			if (this.activity("keyboard")) return;
			this.mouse.down = e.button === 0;
			this.mouse.pass = e.button === 2;
			if (e.button === 0) this.mouseLatch.shoot = true;
			if (e.button === 2) this.mouseLatch.pass = true;
		});
		window.addEventListener("pointerup", (e) => {
			if (e.pointerType !== "touch") {
				if (e.button === 0) this.mouse.down = false;
				if (e.button === 2) this.mouse.pass = false;
			}
		});
		window.addEventListener("pointerdown", (e) => {
			if (e.pointerType !== "touch" && e.target !== canvas)
				this.activity("keyboard");
		});
		this.touchOrigin = null;
		this.touchId = null;
		canvas.addEventListener(
			"touchstart",
			(e) => {
				e.preventDefault();
				if (this.activity("touch")) return;
				for (const t of e.changedTouches) {
					if (t.clientX < innerWidth * 0.67 && this.touchId === null) {
						this.touchId = t.identifier;
						this.touchOrigin = { x: t.clientX, y: t.clientY };
						this.drawStick(t.clientX, t.clientY, 0, 0);
					} else {
						this.touch.shoot = true;
						this.touchLatch.shoot = true;
					}
				}
			},
			{ passive: false },
		);
		canvas.addEventListener(
			"touchmove",
			(e) => {
				e.preventDefault();
				this.activity("touch");
				for (const t of e.changedTouches)
					if (t.identifier === this.touchId) {
						const dx = t.clientX - this.touchOrigin.x,
							dz = t.clientY - this.touchOrigin.y;
						this.touch.x = Math.max(-1, Math.min(1, dx / 48));
						this.touch.z = Math.max(-1, Math.min(1, dz / 48));
						this.drawStick(this.touchOrigin.x, this.touchOrigin.y, dx, dz);
					}
			},
			{ passive: false },
		);
		const touchEnd = (e) => {
			for (const t of e.changedTouches)
				if (t.identifier === this.touchId) {
					this.touchId = null;
					this.touch.x = this.touch.z = 0;
					document.querySelector("#touchStick").style.display = "none";
				} else this.touch.shoot = false;
		};
		canvas.addEventListener("touchend", touchEnd);
		canvas.addEventListener("touchcancel", touchEnd);
		const action = document.querySelector("#touchAction");
		action.addEventListener("pointerdown", (e) => {
			e.preventDefault();
			if (this.activity("touch")) return;
			action.setPointerCapture(e.pointerId);
			if (action.textContent === "CHECK") {
				this.touch.check = true;
				this.touchLatch.check = true;
			} else {
				this.touch.shoot = true;
				this.touchLatch.shoot = true;
			}
		});
		action.addEventListener("pointerup", () => {
			this.touch.shoot = this.touch.check = false;
		});
		action.addEventListener("pointercancel", () => {
			this.touch.shoot = this.touch.check = false;
		});
	}
	drawStick(x, y, dx, dz) {
		const e = document.querySelector("#touchStick");
		e.style.display = "block";
		e.style.left = `${x - 43}px`;
		e.style.top = `${y - 43}px`;
		e.firstElementChild.style.transform = `translate(${Math.max(-26, Math.min(26, dx))}px,${Math.max(-26, Math.min(26, dz))}px)`;
	}
	clear() {
		this.keys.clear();
		this.flush();
		this.mouse.active = false;
		this.mouse.down = this.mouse.pass = false;
		this.touch.x = this.touch.z = 0;
		this.touch.shoot = this.touch.check = false;
	}
	flush() {
		this.latched.clear();
		this.mouseLatch.shoot = this.mouseLatch.pass = false;
		this.touchLatch.shoot = this.touchLatch.check = false;
	}
	poll() {
		this.pads = Array.from(navigator.getGamepads?.() || []).filter(
			(x) => x?.connected,
		);
		this.pads.forEach((pad, i) => {
			const old = this.oldPads[i] || [],
				pressed = (n) => !!pad.buttons[n]?.pressed,
				rise = (n) => pressed(n) && !old[n];
			const moved = pad.axes.some((x) => Math.abs(x) > 0.24);
			if (moved || pad.buttons.some((x) => x.pressed)) {
				if (this.activity("gamepad")) {
					this.oldPads[i] = pad.buttons.map((x) => x.pressed);
					return;
				}
			}
			if (rise(9) && !pressed(8)) {
				this.cb.pause();
			} else if (this.cb.isMenu()) {
				const now = performance.now();
				if (now > this.menuNext) {
					if (pressed(13) || pad.axes[1] > 0.55) {
						this.cb.navigate(1);
						this.menuNext = now + 190;
					} else if (pressed(12) || pad.axes[1] < -0.55) {
						this.cb.navigate(-1);
						this.menuNext = now + 190;
					} else if (pressed(14) || pad.axes[0] < -0.55) {
						this.cb.adjust(-1);
						this.menuNext = now + 150;
					} else if (pressed(15) || pad.axes[0] > 0.55) {
						this.cb.adjust(1);
						this.menuNext = now + 150;
					}
				}
				if (rise(0)) this.cb.activate();
				if (rise(1)) this.cb.back();
			}
			this.oldPads[i] = pad.buttons.map((x) => x.pressed);
		});
	}
	get(team = 0) {
		const k = (c) => this.keys.has(c),
			actionKey = (c) => this.keys.has(c) || this.latched.has(c),
			is0 = team === 0;
		let x = is0 ? +k("KeyD") - +k("KeyA") : +k("ArrowRight") - +k("ArrowLeft");
		let z = is0 ? +k("KeyS") - +k("KeyW") : +k("ArrowDown") - +k("ArrowUp");
		const pad = this.pads[team],
			axis = (i) => {
				const v = pad?.axes[i] || 0;
				return Math.abs(v) > 0.18 ? v : 0;
			},
			btn = (i) => !!pad?.buttons[i]?.pressed;
		if (pad && this.type === "gamepad") {
			x = axis(0);
			z = axis(1);
		}
		const touch = is0 && this.type === "touch";
		if (touch) {
			x = this.touch.x;
			z = this.touch.z;
		}
		return {
			x,
			z,
			aimX: axis(2),
			aimZ: axis(3),
			shoot:
				(is0
					? actionKey("Space") || this.mouse.down || this.mouseLatch.shoot
					: actionKey("KeyJ")) ||
				btn(0) ||
				btn(7) ||
				(touch && (this.touch.shoot || this.touchLatch.shoot)),
			pass:
				(is0
					? actionKey("KeyE") || this.mouse.pass || this.mouseLatch.pass
					: actionKey("KeyK")) || btn(2),
			check:
				(is0
					? actionKey("ShiftLeft") || actionKey("ShiftRight")
					: actionKey("KeyL")) ||
				btn(1) ||
				(touch && (this.touch.check || this.touchLatch.check)),
			switch: (is0 ? actionKey("KeyQ") : actionKey("KeyU")) || btn(3),
		};
	}
}
