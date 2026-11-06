import { clamp } from "./game.js";
export class Input {
	constructor(game, ui) {
		this.game = game;
		this.ui = ui;
		this.keys = new Set();
		this.last = "keyboard";
		this.mouse = { x: 0, y: 0, down: false, active: false };
		this.touches = new Map();
		this.padButtons = [];
		this.padAxes = [0, 0, 0, 0];
		this.menuAxis = 0;
		this.nextNav = 0;
		this.lastActivity = performance.now();
		this.touch = false;
		addEventListener("keydown", (e) => this.key(e, true));
		addEventListener("keyup", (e) => this.key(e, false));
		addEventListener("blur", () => {
			this.keys.clear();
			this.mouse.down = false;
			this.touches.clear();
		});
		document.addEventListener("pointermove", (e) => {
			if (e.pointerType === "touch") {
				this.moveTouch(e);
				return;
			}
			if (e.movementX || e.movementY) {
				if (this.activity("keyboard")) return;
				this.mouse.x = (e.clientX / innerWidth) * 2 - 1;
				this.mouse.y = 1 - (e.clientY / innerHeight) * 2;
				if (e.target.id === "universe") this.mouse.active = true;
			}
			const b = e.target.closest("button");
			if (b) this.ui.focus(b, false);
		});
		document.addEventListener(
			"pointerdown",
			(e) => {
				if (this.activity(e.pointerType === "touch" ? "touch" : "keyboard")) {
					e.preventDefault();
					e.stopPropagation();
					return;
				}
				if (e.pointerType === "touch") {
					this.touch = true;
					document.body.classList.add("touch");
					if (e.target.id === "universe") {
						this.touches.set(e.pointerId, {
							x: e.clientX,
							y: e.clientY,
							startX: e.clientX,
							startY: e.clientY,
						});
						try {
							e.target.setPointerCapture(e.pointerId);
						} catch {}
						this.game.sound.start();
					}
					return;
				}
				if (e.target.id === "universe") {
					this.mouse.down = true;
					this.mouse.active = true;
					this.game.sound.start();
				}
			},
			true,
		);
		document.addEventListener("pointerup", (e) => {
			this.mouse.down = false;
			this.touches.delete(e.pointerId);
		});
		document.addEventListener("pointercancel", (e) =>
			this.touches.delete(e.pointerId),
		);
		document.addEventListener("contextmenu", (e) => e.preventDefault());
	}
	activity(type) {
		this.lastActivity = performance.now();
		if (type !== this.last) {
			this.last = type;
			this.ui.prompts(type);
		}
		if (this.game.attract) {
			this.game.title();
			this.ui.bannerHide();
			this.consumedUntil = performance.now() + 300;
			return true;
		}
		return false;
	}
	key(e, down) {
		const typing =
			/INPUT|TEXTAREA/.test(e.target.tagName) && e.target.type !== "range";
		if (typing && e.code !== "Escape") return;
		if (
			[
				"Space",
				"Tab",
				"Escape",
				"ArrowLeft",
				"ArrowRight",
				"ArrowUp",
				"ArrowDown",
			].includes(e.code)
		)
			e.preventDefault();
		if (!down) {
			this.keys.delete(e.code);
			return;
		}
		if (e.repeat) return;
		if (this.activity("keyboard")) return;
		this.game.sound.start();
		this.keys.add(e.code);
		if (
			[
				"KeyW",
				"KeyA",
				"KeyS",
				"KeyD",
				"ArrowUp",
				"ArrowDown",
				"ArrowLeft",
				"ArrowRight",
			].includes(e.code)
		)
			this.mouse.active = false;
		if (this.ui.inMenu()) {
			if (e.code === "Escape") {
				this.ui.back();
				return;
			}
			if (e.code === "ArrowDown" || e.code === "KeyS" || e.code === "Tab")
				this.ui.nav(1);
			if (e.code === "ArrowUp" || e.code === "KeyW") this.ui.nav(-1);
			if (e.code === "ArrowLeft" || e.code === "KeyA") this.ui.adjust(-1);
			if (e.code === "ArrowRight" || e.code === "KeyD") this.ui.adjust(1);
			if (e.code === "Enter" || e.code === "Space") this.ui.activate();
			return;
		}
		if (e.code === "Escape" || e.code === "KeyP") this.ui.pause();
		if (e.code === "Tab" || e.code === "KeyM") this.ui.map();
		if (e.code === "KeyE") this.game.pulse();
		if (e.code === "KeyQ") this.game.roll();
	}
	moveTouch(e) {
		const t = this.touches.get(e.pointerId);
		if (t) {
			t.x = e.clientX;
			t.y = e.clientY;
			this.lastActivity = performance.now();
		}
	}
	poll() {
		let pad;
		try {
			pad = Array.from(navigator.getGamepads?.() ?? []).find(
				(p) => p?.connected,
			);
		} catch {}
		if (!pad) {
			this.padAxes = [0, 0, 0, 0];
			return;
		}
		const pressed = pad.buttons.map((b) => b.pressed || b.value > 0.5),
			edges = pressed.map((v, i) => v && !this.padButtons[i]);
		const axes = pad.axes.map((v) => (Math.abs(v) > 0.15 ? v : 0));
		if (edges.some(Boolean) || axes.some((v) => Math.abs(v) > 0.25)) {
			if (this.activity("pad")) {
				this.padButtons = pressed;
				return;
			}
			this.mouse.active = false;
		}
		this.padAxes = axes;
		this.padButtons = pressed;
		const now = performance.now();
		if (this.ui.inMenu()) {
			if (edges[0]) {
				this.game.sound.start();
				this.ui.activate();
			}
			if (edges[1]) this.ui.back();
			const direction =
				pressed[13] || axes[1] > 0.55
					? 1
					: pressed[12] || axes[1] < -0.55
						? -1
						: 0;
			if (direction && now > this.nextNav) {
				this.ui.nav(direction);
				this.nextNav = now + 210;
			}
			if ((edges[14] || axes[0] < -0.65) && now > this.nextNav) {
				this.ui.adjust(-1);
				this.nextNav = now + 170;
			}
			if ((edges[15] || axes[0] > 0.65) && now > this.nextNav) {
				this.ui.adjust(1);
				this.nextNav = now + 170;
			}
			if (edges[9] && !pressed[8]) this.ui.back();
		} else {
			if (edges[9] && !pressed[8]) this.ui.pause();
			if (edges[3]) this.ui.map();
			if (edges[2]) this.game.pulse();
			if (edges[1] || edges[4]) this.game.roll();
		}
	}
	read() {
		const k = this.keys;
		let x =
				(k.has("KeyD") || k.has("ArrowRight") ? 1 : 0) -
				(k.has("KeyA") || k.has("ArrowLeft") ? 1 : 0),
			y =
				(k.has("KeyW") || k.has("ArrowUp") ? 1 : 0) -
				(k.has("KeyS") || k.has("ArrowDown") ? 1 : 0),
			fire = k.has("Space") || this.mouse.down,
			boost = k.has("ShiftLeft") || k.has("ShiftRight");
		let aimX = 0,
			aimY = 0;
		if (this.last === "pad") {
			x = this.padAxes[0] ?? 0;
			y = -(this.padAxes[1] ?? 0);
			aimX = (this.padAxes[2] ?? 0) * 0.6;
			aimY = -(this.padAxes[3] ?? 0) * 0.6;
			fire = !!(this.padButtons[7] || this.padButtons[5]);
			boost = !!this.padButtons[0];
		}
		if (this.mouse.active && this.last === "keyboard") {
			x = clamp((this.mouse.x * 13 - this.game.x) * 0.5, -1, 1);
			y = clamp((this.mouse.y * 9 + 1 - this.game.y) * 0.5, -1, 1);
		}
		if (this.touch) {
			fire = true;
			const t = [...this.touches.values()].find(
				(p) => p.startX < innerWidth * 0.75,
			);
			if (t) {
				x = clamp((t.x - t.startX) / 65, -1, 1);
				y = clamp((t.startY - t.y) / 65, -1, 1);
				boost = Math.hypot(t.x - t.startX, t.y - t.startY) > 140;
			} else {
				x = 0;
				y = 0;
			}
			const pickup = this.game.entities
				.filter(
					(e) => ["cadet", "key"].includes(e.type) && e.z > -60 && e.z < 5,
				)
				.sort((a, b) => b.z - a.z)[0];
			if (pickup && !t) {
				x = clamp((pickup.x - this.game.x) * 0.7, -1, 1);
				y = clamp((pickup.y - this.game.y) * 0.7, -1, 1);
			}
			if (this.game.sector === 2) {
				fire = false;
				if (!t) {
					x = clamp(-this.game.x * 0.7, -1, 1);
					y = clamp(-this.game.y * 0.7, -1, 1);
				}
			}
		}
		return { x, y, fire, boost, aimX, aimY, touch: this.touch };
	}
}
