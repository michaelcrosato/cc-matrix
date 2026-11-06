const deadzone = (n) =>
	Math.abs(n) < 0.17 ? 0 : (Math.sign(n) * (Math.abs(n) - 0.17)) / 0.83;
export class Input {
	constructor(hooks) {
		this.hooks = hooks;
		this.keys = new Set();
		this.last = "keyboard";
		this.mouse = {
			x: innerWidth * 0.7,
			y: innerHeight * 0.4,
			active: false,
			fire: false,
		};
		this.touches = new Map();
		this.stick = { x: 0, y: 0 };
		this.flareTouch = false;
		this.padPrevious = new Map();
		this.navTime = 0;
		this.lastActivity = performance.now();
		const activity = (type) => {
			this.lastActivity = performance.now();
			if (this.last !== type) {
				this.last = type;
				this.hooks.type?.(type);
			}
			this.hooks.activity?.();
		};
		this.activity = activity;
		addEventListener("keydown", (e) => {
			if (
				e.target instanceof HTMLInputElement ||
				e.target instanceof HTMLTextAreaElement
			) {
				if (e.code === "Escape") this.hooks.back?.();
				return;
			}
			activity("keyboard");
			this.keys.add(e.code);
			if (
				[
					"Enter",
					"Space",
					"ArrowUp",
					"ArrowDown",
					"ArrowLeft",
					"ArrowRight",
					"Tab",
				].includes(e.code)
			)
				e.preventDefault();
			if (!e.repeat) this.hooks.key?.(e.code);
		});
		addEventListener("keyup", (e) => this.keys.delete(e.code));
		addEventListener("blur", () => {
			this.keys.clear();
			this.mouse.fire = false;
			this.hooks.blur?.();
		});
		addEventListener("pointermove", (e) => {
			if (e.pointerType === "touch") return;
			activity("keyboard");
			this.mouse.x = e.clientX;
			this.mouse.y = e.clientY;
			this.mouse.active = true;
		});
		addEventListener("pointerdown", (e) => {
			if (e.pointerType === "touch") {
				activity("touch");
				return;
			}
			activity("keyboard");
			if (e.target.closest("button,input,textarea,a,label")) return;
			if (e.button === 0) this.mouse.fire = true;
			if (e.button === 2) this.mouse.flare = true;
			this.hooks.unlock?.();
		});
		addEventListener("pointerup", (e) => {
			if (e.button === 0) this.mouse.fire = false;
			if (e.button === 2) this.mouse.flare = false;
		});
		addEventListener("contextmenu", (e) => e.preventDefault());
		const canvas = document.getElementById("game");
		canvas.addEventListener(
			"touchstart",
			(e) => {
				activity("touch");
				this.hooks.unlock?.();
				if (!this.hooks.playing()) return;
				e.preventDefault();
				for (const t of e.changedTouches) {
					this.touches.set(t.identifier, {
						x: t.clientX,
						y: t.clientY,
						left: t.clientX < innerWidth * 0.6,
						nowX: t.clientX,
						nowY: t.clientY,
					});
				}
				this.updateStick();
			},
			{ passive: false },
		);
		canvas.addEventListener(
			"touchmove",
			(e) => {
				if (!this.hooks.playing()) return;
				e.preventDefault();
				for (const t of e.changedTouches) {
					const p = this.touches.get(t.identifier);
					if (p) {
						p.nowX = t.clientX;
						p.nowY = t.clientY;
					}
				}
				this.updateStick();
			},
			{ passive: false },
		);
		const end = (e) => {
			for (const t of e.changedTouches) this.touches.delete(t.identifier);
			this.updateStick();
		};
		canvas.addEventListener("touchend", end);
		canvas.addEventListener("touchcancel", end);
		addEventListener("gamepadconnected", () => {
			activity("gamepad");
		});
	}
	updateStick() {
		const left = [...this.touches.values()].find((t) => t.left);
		if (left) {
			this.stick.x = Math.max(-1, Math.min(1, (left.nowX - left.x) / 65));
			this.stick.y = Math.max(-1, Math.min(1, -(left.nowY - left.y) / 65));
			this.hooks.touchStick?.(left);
		} else {
			this.stick.x = 0;
			this.stick.y = 0;
			this.hooks.touchStick?.(null);
		}
	}
	poll(dt) {
		this.navTime = Math.max(0, this.navTime - dt);
		const pads = [...(navigator.getGamepads?.() || [])].filter(Boolean);
		this.pads = pads;
		for (const pad of pads) {
			const old = this.padPrevious.get(pad.index) || [],
				now = pad.buttons.map((b) => b.pressed || b.value > 0.5),
				axes = pad.axes;
			if (now.some(Boolean) || axes.some((v) => Math.abs(v) > 0.25))
				this.activity("gamepad");
			const edge = (n) => now[n] && !old[n];
			if (edge(9) && !now[8]) this.hooks.pause?.();
			if (!this.hooks.playing()) {
				if (Math.abs(axes[3] || 0) > 0.25)
					this.hooks.scroll?.(axes[3] * dt * 30);
				if (edge(0)) this.hooks.confirm?.();
				if (edge(1)) this.hooks.back?.();
				if (this.navTime === 0) {
					const y =
							(now[13] ? 1 : 0) -
							(now[12] ? 1 : 0) +
							(Math.abs(axes[1]) > 0.5 ? Math.sign(axes[1]) : 0),
						x =
							(now[15] ? 1 : 0) -
							(now[14] ? 1 : 0) +
							(Math.abs(axes[0]) > 0.5 ? Math.sign(axes[0]) : 0);
					if (y || x) {
						this.hooks.navigate?.(Math.sign(x), Math.sign(y));
						this.navTime = 0.19;
					}
				}
			}
			this.padPrevious.set(pad.index, now);
		}
	}
	command(seat = 0, view, pilot) {
		if (seat === 0 && this.last === "touch") {
			const right = [...this.touches.values()].some((t) => !t.left);
			return {
				x: this.stick.x,
				y: this.stick.y,
				fire: true,
				boost: right,
				flare: this.flareTouch,
			};
		}
		const pad = this.pads?.[seat];
		if (pad) {
			const rx = deadzone(pad.axes[2] || 0),
				ry = -deadzone(pad.axes[3] || 0),
				b = pad.buttons;
			return {
				x:
					deadzone(pad.axes[0] || 0) +
					(b[15]?.pressed ? 1 : 0) -
					(b[14]?.pressed ? 1 : 0),
				y:
					-deadzone(pad.axes[1] || 0) +
					(b[12]?.pressed ? 1 : 0) -
					(b[13]?.pressed ? 1 : 0),
				angle: Math.hypot(rx, ry) > 0.25 ? Math.atan2(ry, rx) : undefined,
				fire: !!(b[7]?.pressed || b[0]?.pressed || Math.hypot(rx, ry) > 0.4),
				boost: !!b[6]?.pressed,
				flare: !!(b[1]?.pressed || b[5]?.pressed),
			};
		}
		const k = this.keys;
		if (seat === 1)
			return {
				x: (k.has("KeyL") ? 1 : 0) - (k.has("KeyJ") ? 1 : 0),
				y: (k.has("KeyI") ? 1 : 0) - (k.has("KeyK") ? 1 : 0),
				fire: k.has("Enter") || k.has("Numpad0"),
				boost: k.has("ShiftRight"),
				flare: k.has("KeyU"),
			};
		let angle;
		const fire = this.mouse.fire || k.has("Space");
		if (this.mouse.active && this.mouse.fire && pilot) {
			const target = view.screenToWorld(this.mouse.x, this.mouse.y);
			angle = Math.atan2(target.y - pilot.y, target.x - pilot.x);
		}
		return {
			x:
				(k.has("KeyD") || k.has("ArrowRight") ? 1 : 0) -
				(k.has("KeyA") || k.has("ArrowLeft") ? 1 : 0),
			y:
				(k.has("KeyW") || k.has("ArrowUp") ? 1 : 0) -
				(k.has("KeyS") || k.has("ArrowDown") ? 1 : 0),
			angle,
			fire,
			boost: k.has("ShiftLeft"),
			flare: k.has("KeyE") || !!this.mouse.flare,
		};
	}
	clear() {
		this.keys.clear();
		this.mouse.fire = false;
		this.mouse.flare = false;
		this.touches.clear();
		this.updateStick();
	}
	rumble(weak, strong, duration) {
		const pad = this.pads?.[0];
		if (this.last === "gamepad" && pad?.vibrationActuator?.playEffect)
			Promise.resolve(
				pad.vibrationActuator.playEffect("dual-rumble", {
					duration,
					weakMagnitude: weak,
					strongMagnitude: strong,
				}),
			).catch(() => {});
	}
}
