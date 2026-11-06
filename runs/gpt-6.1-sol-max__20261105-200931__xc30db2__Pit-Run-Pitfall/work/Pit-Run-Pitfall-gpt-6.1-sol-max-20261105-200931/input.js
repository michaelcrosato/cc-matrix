class Controls {
	constructor(app) {
		this.app = app;
		this.keys = new Set();
		this.device = "keyboard";
		this.pads = [];
		this.padPrevious = [];
		this.lastMenu = 0;
		this.touch = {
			x: 0,
			y: 0,
			jump: false,
			action: false,
			id: null,
			startX: 0,
			startY: 0,
		};
		this.touchJumpUntil = 0;
		this.jumpSerial = 0;
		window.addEventListener("keydown", (e) => {
			if (
				e.target.matches(
					"textarea,input:not([type=range]):not([type=checkbox])",
				)
			)
				return;
			this.activity("keyboard");
			this.app.audio.unlock();
			if (
				["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
					e.code,
				) &&
				!e.target.matches("input,select")
			)
				e.preventDefault();
			this.keys.add(e.code);
			if (e.code === "Space" && !e.repeat && this.app.state === "playing")
				this.jumpSerial++;
			if (!e.repeat) {
				if (this.app.ui?.current && ["Enter", "Space"].includes(e.code))
					e.preventDefault();
				this.menuKey(e.code);
			}
		});
		window.addEventListener("keyup", (e) => this.keys.delete(e.code));
		window.addEventListener("blur", () => {
			this.keys.clear();
			this.touch.x = 0;
			this.touch.y = 0;
			this.touch.jump = false;
			if (this.app.state === "playing" && !this.app.net.active)
				this.app.ui.pause();
		});
		document.addEventListener("pointerdown", (e) => {
			if (e.pointerType !== "touch") this.activity("keyboard");
			else this.activity("touch");
			this.app.audio.unlock();
		});
		document.addEventListener("pointermove", (e) => {
			if (e.pointerType === "mouse" && (e.movementX || e.movementY)) {
				this.activity("keyboard");
				const el = e.target.closest("button,input,select,textarea");
				if (this.app.ui?.current && el && el !== document.activeElement)
					el.focus({ preventScroll: true });
			}
		});
		document.addEventListener("pointerover", (e) => {
			const el = e.target.closest("button,input,select,textarea");
			if (
				el &&
				this.device !== "gamepad" &&
				e.pointerType !== "touch" &&
				el !== document.activeElement
			)
				el.focus({ preventScroll: true });
		});
		document.addEventListener("pointerdown", (e) => {
			if (e.target !== $("game")) return;
			const canvas = $("game");
			if (e.pointerType !== "touch" || this.app.state !== "playing") return;
			canvas.setPointerCapture(e.pointerId);
			if (e.clientX < innerWidth * 0.52 && this.touch.id === null) {
				this.touch.id = e.pointerId;
				this.touch.startX = e.clientX;
				this.touch.startY = e.clientY;
			} else {
				this.touch.jump = true;
				this.jumpSerial++;
				this.touchJumpUntil = performance.now() + 160;
			}
		});
		document.addEventListener("pointermove", (e) => {
			if (e.pointerId === this.touch.id) {
				this.touch.x = clamp((e.clientX - this.touch.startX) / 55, -1, 1);
				this.touch.y = clamp((e.clientY - this.touch.startY) / 55, -1, 1);
			}
		});
		const end = (e) => {
			if (e.pointerId === this.touch.id) {
				this.touch.id = null;
				this.touch.x = 0;
				this.touch.y = 0;
			}
		};
		document.addEventListener("pointerup", end);
		document.addEventListener("pointercancel", end);
		$("touchAction").addEventListener("pointerdown", (e) => {
			e.stopPropagation();
			this.touch.action = true;
			this.touch.y = this.app.primary()?.layer ? -1 : 1;
		});
		$("touchAction").addEventListener("pointerup", () => {
			this.touch.action = false;
			this.touch.y = 0;
		});
		window.addEventListener("gamepadconnected", () => {
			this.activity("gamepad");
		});
	}
	activity(device) {
		const wasAttract = this.app.state === "attract";
		this.device = device;
		this.app.lastInput = performance.now();
		if (wasAttract) {
			this.keys.clear();
			this.app.title();
			this.app.ignoreInputUntil = performance.now() + 300;
		}
	}
	menuKey(code) {
		const ui = this.app.ui;
		if (!ui) return;
		if (this.app.state === "attract") return;
		if (code === "Escape") {
			if (this.app.state === "playing") ui.pause();
			else if (ui.current) ui.back();
			return;
		}
		if (!ui.current) return;
		if (code === "ArrowDown" || code === "KeyS") ui.moveFocus(1);
		if (code === "ArrowUp" || code === "KeyW") ui.moveFocus(-1);
		if (code === "ArrowLeft" || code === "KeyA") ui.adjust(-1);
		if (code === "ArrowRight" || code === "KeyD") ui.adjust(1);
		if (code === "Space" || code === "Enter") {
			const el = document.activeElement;
			if (el?.matches("button") && !el.disabled) {
				el.click();
			}
		}
	}
	poll() {
		this.pads = Array.from(navigator.getGamepads?.() || []);
		this.pads.forEach((pad, i) => {
			if (!pad) return;
			const prev = this.padPrevious[i] || [],
				down = (n) => !!pad.buttons[n]?.pressed,
				edge = (n) => down(n) && !prev[n];
			const active =
				pad.axes.some((x) => Math.abs(x) > 0.2) ||
				pad.buttons.some((b) => b.pressed);
			if (active) {
				this.activity("gamepad");
				this.app.audio.unlock();
			}
			if (edge(0) && this.app.state === "playing" && !this.app.ui?.current)
				this.jumpSerial++;
			if (edge(9) && !down(8)) {
				if (this.app.ui.current) this.app.ui.back();
				else if (this.app.state === "playing") this.app.ui.pause();
			}
			if (this.app.ui.current) {
				if (edge(1)) this.app.ui.back();
				if (edge(0) && performance.now() > this.app.ignoreInputUntil)
					document.activeElement?.click?.();
				const now = performance.now(),
					dy = down(13)
						? 1
						: down(12)
							? -1
							: Math.abs(pad.axes[1] || 0) > 0.55
								? Math.sign(pad.axes[1])
								: 0,
					dx = down(15)
						? 1
						: down(14)
							? -1
							: Math.abs(pad.axes[0] || 0) > 0.55
								? Math.sign(pad.axes[0])
								: 0;
				if ((dy || dx) && now > this.lastMenu + 210) {
					if (dy) this.app.ui.moveFocus(dy);
					else this.app.ui.adjust(dx);
					this.lastMenu = now;
				}
			}
			this.padPrevious[i] = pad.buttons.map((b) => b.pressed);
		});
		if (performance.now() > this.touchJumpUntil) this.touch.jump = false;
	}
	frame(index = 0) {
		const zero = { x: 0, y: 0, jump: false, action: false };
		if (performance.now() < this.app.ignoreInputUntil) return zero;
		const pad = this.pads[index],
			k = this.keys;
		const couch = this.app.localCount > 1 && !this.app.net.active;
		let x = 0,
			y = 0,
			jump = false,
			action = false;
		if (index === 0) {
			x = (k.has("KeyD") ? 1 : 0) - (k.has("KeyA") ? 1 : 0);
			y = (k.has("KeyS") ? 1 : 0) - (k.has("KeyW") ? 1 : 0);
			if (!couch) {
				x += (k.has("ArrowRight") ? 1 : 0) - (k.has("ArrowLeft") ? 1 : 0);
				y += (k.has("ArrowDown") ? 1 : 0) - (k.has("ArrowUp") ? 1 : 0);
			}
			jump = k.has("Space");
			action = k.has("KeyE");
			if (this.device === "touch") {
				x = this.touch.x;
				y = this.touch.y;
				jump = this.touch.jump;
				action = this.touch.action;
			}
		}
		if (index === 1 && couch) {
			x = (k.has("ArrowRight") ? 1 : 0) - (k.has("ArrowLeft") ? 1 : 0);
			y = (k.has("ArrowDown") ? 1 : 0) - (k.has("ArrowUp") ? 1 : 0);
			jump = k.has("ShiftRight") || k.has("Numpad0");
			action = k.has("ControlRight") || k.has("Numpad1");
		}
		if (pad) {
			if (Math.abs(pad.axes[0] || 0) > 0.18) x = pad.axes[0];
			if (Math.abs(pad.axes[1] || 0) > 0.18) y = pad.axes[1];
			if (pad.buttons[14]?.pressed) x = -1;
			if (pad.buttons[15]?.pressed) x = 1;
			if (pad.buttons[12]?.pressed) y = -1;
			if (pad.buttons[13]?.pressed) y = 1;
			jump ||= !!pad.buttons[0]?.pressed;
			action ||= !!pad.buttons[2]?.pressed;
		}
		return {
			x: clamp(x, -1, 1),
			y: clamp(y, -1, 1),
			jump,
			action,
			touch: this.device === "touch",
		};
	}
	glyph(action) {
		if (this.device === "touch")
			return {
				jump: "TAP RIGHT",
				action: "TOUCH",
				move: "DRAG LEFT",
				pause: "Ⅱ",
			}[action];
		if (this.device === "gamepad") {
			const xbox = this.app.settings.glyphs === "xbox";
			return {
				jump: xbox ? "Ⓐ" : "✕",
				action: xbox ? "Ⓧ" : "□",
				move: "L",
				pause: xbox ? "☰" : "OPTIONS",
			}[action];
		}
		return { jump: "SPACE", action: "E", move: "A D", pause: "ESC" }[action];
	}
	vibrate() {
		if (!this.app.settings.vibration) return;
		for (const p of this.pads)
			try {
				p?.vibrationActuator?.playEffect("dual-rumble", {
					duration: 140,
					weakMagnitude: 0.25,
					strongMagnitude: 0.5,
				});
			} catch {}
	}
}
