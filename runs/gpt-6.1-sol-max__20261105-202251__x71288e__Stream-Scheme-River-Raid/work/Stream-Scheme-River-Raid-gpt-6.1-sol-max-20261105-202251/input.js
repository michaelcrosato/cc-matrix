const clamp = (v) => Math.max(-1, Math.min(1, v));
const deadzone = (v) => (Math.abs(v || 0) < 0.16 ? 0 : v);
export class Controls {
	constructor({ onType, onMenu, onPause, onAny, getMenu, view, audio }) {
		Object.assign(this, {
			onType,
			onMenu,
			onPause,
			onAny,
			getMenu,
			view,
			audio,
		});
		this.keys = new Set();
		this.queuedKeys = new Set();
		this.last = "keyboard";
		this.mouse = { x: 0, y: 0, down: false, active: false };
		this.pads = [];
		this.padButtons = new Map();
		this.touch = null;
		this.touchX = 0;
		this.touchY = 0;
		this.touchRoll = false;
		this.touchBurst = false;
		this.localCount = 1;
		this.lastTouchTap = 0;
		this.repeat = 0;
		this.actionLatch = false;
		this.lastAny = performance.now();
		this.enabled = true;
		const use = (type) => {
			if (!this.enabled) return false;
			this.last = type;
			this.lastAny = performance.now();
			this.onType?.(type);
			return !!this.onAny?.();
		};
		this.use = use;
		addEventListener("keydown", (e) => {
			if (!this.enabled || e.target.matches("input,textarea,select")) return;
			this.audio.unlock();
			if (use("keyboard")) {
				e.preventDefault();
				return;
			}
			this.keys.add(e.code);
			if (
				!this.getMenu() &&
				["Space", "KeyE", "ShiftLeft", "Enter", "Slash", "ShiftRight"].includes(
					e.code,
				)
			)
				this.queuedKeys.add(e.code);
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
			if (e.repeat) return;
			if (e.code === "Escape" || e.code === "KeyP") this.onPause?.();
			else if (this.getMenu()) {
				if (["ArrowUp", "KeyW"].includes(e.code)) this.onMenu?.("up");
				if (["ArrowDown", "KeyS", "Tab"].includes(e.code))
					this.onMenu?.(e.shiftKey ? "up" : "down");
				if (["ArrowLeft", "KeyA"].includes(e.code)) this.onMenu?.("left");
				if (["ArrowRight", "KeyD"].includes(e.code)) this.onMenu?.("right");
				if (["Enter", "Space"].includes(e.code)) this.onMenu?.("accept");
				if (e.code === "Backspace") this.onMenu?.("back");
			}
		});
		addEventListener("keyup", (e) => this.keys.delete(e.code));
		addEventListener("blur", () => {
			this.clear();
			this.touch = null;
			this.touchX = this.touchY = 0;
		});
		addEventListener("pointermove", (e) => {
			if (e.pointerType === "touch") {
				if (this.touch?.id === e.pointerId) {
					this.touchX = clamp((e.clientX - this.touch.x) / 65);
					this.touchY = clamp((e.clientY - this.touch.y) / 65);
				}
				return;
			}
			if (Math.abs(e.movementX) + Math.abs(e.movementY) < 1) return;
			use("keyboard");
			this.mouse.x = e.clientX;
			this.mouse.y = e.clientY;
			this.mouse.active = true;
		});
		addEventListener(
			"pointerdown",
			(e) => {
				if (!this.enabled) return;
				if (use(e.pointerType === "touch" ? "touch" : "keyboard")) {
					e.preventDefault();
					return;
				}
				this.audio.unlock();
				if (e.target.closest("button,input,textarea,a,[role=button]")) return;
				if (e.pointerType === "touch") {
					e.preventDefault();
					if (this.getMenu()) return;
					if (e.clientX < innerWidth * 0.65 && !this.touch) {
						this.touch = { id: e.pointerId, x: e.clientX, y: e.clientY };
						this.touchX = this.touchY = 0;
					} else {
						const now = performance.now();
						if (now - this.lastTouchTap < 330) this.touchBurst = true;
						else this.touchRoll = true;
						this.lastTouchTap = now;
						const pop = document.getElementById("touch-pop");
						pop.textContent = this.touchBurst ? "BURST" : "ROLL";
						pop.style.left = `${e.clientX}px`;
						pop.style.top = `${e.clientY}px`;
						pop.classList.remove("pop");
						void pop.offsetWidth;
						pop.classList.add("pop");
					}
				} else {
					this.mouse.x = e.clientX;
					this.mouse.y = e.clientY;
					if (e.button === 0) {
						this.mouse.down = true;
						if (!this.getMenu()) this.queuedKeys.add("MouseFire");
					}
					if (e.button === 2) {
						this.keys.add("MouseRoll");
						if (!this.getMenu()) this.queuedKeys.add("MouseRoll");
					}
				}
			},
			{ passive: false },
		);
		addEventListener("pointerup", (e) => {
			if (this.touch?.id === e.pointerId) {
				this.touch = null;
				this.touchX = this.touchY = 0;
			}
			if (e.button === 0) this.mouse.down = false;
			if (e.button === 2) this.keys.delete("MouseRoll");
		});
		addEventListener("pointercancel", () => {
			this.touch = null;
			this.touchX = this.touchY = 0;
		});
		addEventListener("contextmenu", (e) => e.preventDefault());
		addEventListener("gamepadconnected", () => use("pad"));
	}
	poll(dt) {
		if (!this.enabled) return;
		this.pads = Array.from(navigator.getGamepads?.() || []).filter(Boolean);
		this.repeat -= dt;
		for (const pad of this.pads) {
			const previous = this.padButtons.get(pad.index) || [];
			const pressed = (i) => !!pad.buttons[i]?.pressed;
			const fresh = (i) => pressed(i) && !previous[i];
			if (pad.buttons.some((b, i) => b.pressed && !previous[i]))
				this.audio.unlock();
			const dirY = pressed(12) ? -1 : pressed(13) ? 1 : deadzone(pad.axes[1]);
			const dirX = pressed(14) ? -1 : pressed(15) ? 1 : deadzone(pad.axes[0]);
			if (
				Math.abs(dirY) + Math.abs(dirX) > 0.2 ||
				pad.buttons.some((b, i) => b.pressed && !previous[i])
			) {
				if (this.use("pad")) {
					this.padButtons.set(
						pad.index,
						pad.buttons.map((b) => b.pressed),
					);
					continue;
				}
			}
			if (fresh(9) && !pressed(8)) this.onPause?.();
			if (this.getMenu()) {
				if (fresh(0)) this.onMenu?.("accept");
				else if (fresh(1)) this.onMenu?.("back");
				else if (
					this.repeat <= 0 &&
					(Math.abs(dirY) > 0.5 || Math.abs(dirX) > 0.5)
				) {
					this.onMenu?.(
						Math.abs(dirY) > Math.abs(dirX)
							? dirY > 0
								? "down"
								: "up"
							: dirX > 0
								? "right"
								: "left",
					);
					this.repeat = 0.21;
				}
			}
			this.padButtons.set(
				pad.index,
				pad.buttons.map((b) => b.pressed),
			);
		}
	}
	get(index, game, assist = false) {
		const p = game.players.find((p) => p.id === index) || game.players[0];
		const input = {
			x: 0,
			y: 0,
			fire: false,
			roll: false,
			burst: false,
			aim: 0,
		};
		const localIndex = game.players.findIndex((p) => p.id === index);
		const split = this.localCount > 1;
		const keySeat = split ? localIndex : 0;
		if (keySeat === 0) {
			input.x =
				+(this.keys.has("KeyD") || (!split && this.keys.has("ArrowRight"))) -
				+(this.keys.has("KeyA") || (!split && this.keys.has("ArrowLeft")));
			input.y =
				+(this.keys.has("KeyS") || (!split && this.keys.has("ArrowDown"))) -
				+(this.keys.has("KeyW") || (!split && this.keys.has("ArrowUp")));
			input.fire =
				this.pressedActions(["Space", "MouseFire"]) || this.mouse.down;
			input.roll = this.pressedActions(["ShiftLeft", "MouseRoll"]);
			input.burst = this.pressedActions(["KeyE"]);
			if (this.mouse.active && this.mouse.down && p) {
				const target = this.view.pointerToWorld(this.mouse.x, this.mouse.y),
					s = game.progress - p.y;
				input.aim = Math.atan2(target.x - p.x, Math.max(8, target.s - s));
			}
			if (this.last === "touch") {
				input.x = this.touchX;
				input.y = this.touchY;
				input.fire = true;
				input.roll = this.touchRoll;
				input.burst = this.touchBurst;
				this.touchRoll = this.touchBurst = false;
			}
		} else if (keySeat === 1) {
			input.x = +this.keys.has("ArrowRight") - +this.keys.has("ArrowLeft");
			input.y = +this.keys.has("ArrowDown") - +this.keys.has("ArrowUp");
			input.fire = this.pressedActions(["Enter"]);
			input.roll = this.pressedActions(["ShiftRight"]);
			input.burst = this.pressedActions(["Slash"]);
		}
		const pad = this.pads[split ? localIndex : 0];
		if (pad) {
			const b = (i) => !!pad.buttons[i]?.pressed;
			const x = b(14) ? -1 : b(15) ? 1 : deadzone(pad.axes[0]);
			const y = b(12) ? -1 : b(13) ? 1 : deadzone(pad.axes[1]);
			if (Math.abs(x) > 0.1) input.x = x;
			if (Math.abs(y) > 0.1) input.y = y;
			input.fire ||= b(0) || b(7);
			input.roll ||= b(1) || b(5);
			input.burst ||= b(2) || b(6);
			input.aim = deadzone(pad.axes[2]) * 0.6;
		}
		if ((assist || this.last === "touch") && p) {
			const s = game.progress - p.y;
			const target = game.entities
				.filter(
					(e) =>
						!e.dead &&
						!["fuel", "cache"].includes(e.type) &&
						e.s > s + 8 &&
						e.s < s + 120,
				)
				.sort((a, b) => a.s - b.s)[0];
			if (target) input.aim = Math.atan2(target.x - p.x, target.s - s);
		}
		return input;
	}
	pressedActions(codes) {
		let pressed = false;
		for (const code of codes) {
			const queued = this.queuedKeys.delete(code);
			pressed = this.keys.has(code) || queued || pressed;
		}
		return pressed;
	}
	clear() {
		this.keys.clear();
		this.queuedKeys.clear();
		this.mouse.down = false;
		this.mouse.active = false;
		this.touchX = this.touchY = 0;
		this.touchRoll = this.touchBurst = false;
	}
}
