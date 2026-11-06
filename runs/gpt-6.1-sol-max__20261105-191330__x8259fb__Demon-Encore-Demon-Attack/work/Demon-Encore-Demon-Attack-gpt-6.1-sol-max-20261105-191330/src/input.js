const held = new Set();
export class Input {
	constructor(app) {
		this.app = app;
		this.mode = matchMedia("(pointer:coarse)").matches ? "touch" : "keyboard";
		this.lastActivity = performance.now();
		this.padPrevious = new Map();
		this.padTaps = new Map();
		this.menuNext = 0;
		this.pointers = new Map();
		this.taps = new Set();
		this.target = null;
		this.mouseFire = false;
		this.touchDash = false;
		this.touchNova = false;
		this.lastTap = 0;
		this.lastPadTime = 0;
		window.addEventListener("keydown", (e) => {
			this.activity("keyboard");
			held.add(e.code);
			if (
				["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName) &&
				e.code !== "Escape"
			) {
				held.delete(e.code);
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
			if (e.repeat) return;
			this.taps.add(e.code);
			if (this.app.attract) {
				this.app.exitAttract();
				return;
			}
			if (e.code === "Escape" || e.code === "KeyP") {
				this.app.back();
				return;
			}
			if (this.app.menu) {
				if (["ArrowDown", "KeyS", "Tab"].includes(e.code))
					this.app.ui.navigate(1);
				else if (["ArrowUp", "KeyW"].includes(e.code)) this.app.ui.navigate(-1);
				else if (["ArrowLeft", "KeyA"].includes(e.code)) this.app.ui.adjust(-1);
				else if (["ArrowRight", "KeyD"].includes(e.code)) this.app.ui.adjust(1);
				else if (e.code === "Enter" || e.code === "Space") {
					e.preventDefault();
					this.app.ui.activate();
				}
			} else if (e.code === "Enter" && this.app.game?.result)
				this.app.action("retry");
		});
		window.addEventListener("keyup", (e) => {
			held.delete(e.code);
		});
		window.addEventListener("blur", () => {
			held.clear();
			this.mouseFire = false;
			this.target = null;
			if (
				this.app.started &&
				!this.app.net.active &&
				!this.app.attract &&
				!this.app.menu
			)
				this.app.pause();
		});
		document.addEventListener("visibilitychange", () => {
			if (document.hidden) {
				held.clear();
				this.mouseFire = false;
				if (
					this.app.started &&
					!this.app.net.active &&
					!this.app.attract &&
					!this.app.menu
				)
					this.app.pause();
			}
		});
		window.addEventListener("pointerdown", (e) => {
			if (e.target.closest("button,input,textarea,select,a")) return;
			this.activity(e.pointerType === "touch" ? "touch" : "keyboard");
			if (this.app.attract) {
				this.app.exitAttract();
				return;
			}
			if (this.app.menu) return;
			if (e.pointerType === "touch") {
				this.pointers.set(e.pointerId, {
					x: e.clientX,
					startX: e.clientX,
					base: this.app.localPlayer()?.x || 0,
				});
				this.target = this.app.localPlayer()?.x || 0;
				if (this.pointers.size >= 2) this.touchDash = true;
				const now = performance.now();
				if (now - this.lastTap < 280) this.touchNova = true;
				this.lastTap = now;
			} else if (e.button === 0) {
				this.mouseFire = true;
				this.target = this.app.view.worldX(e.clientX);
			} else if (e.button === 2) this.touchDash = true;
			this.app.audio.unlock();
		});
		window.addEventListener("pointermove", (e) => {
			if (e.pointerType === "touch") {
				const p = this.pointers.get(e.pointerId);
				if (p) {
					p.x = e.clientX;
					this.target =
						p.base +
						((e.clientX - p.startX) / innerWidth) * this.app.view.width * 2.5;
					this.activity("touch");
				}
			} else if (!this.app.menu && e.target === this.app.view.canvas) {
				this.activity("keyboard");
				this.target = this.app.view.worldX(e.clientX);
			}
		});
		const up = (e) => {
			this.pointers.delete(e.pointerId);
			if (!this.pointers.size && e.pointerType === "touch") this.target = null;
			if (e.button === 0) this.mouseFire = false;
		};
		window.addEventListener("pointerup", up);
		window.addEventListener("pointercancel", up);
		window.addEventListener("contextmenu", (e) => e.preventDefault());
		window.addEventListener("gamepadconnected", () => {
			this.activity("gamepad");
			this.app.toast("CONTROLLER CONNECTED");
		});
		window.addEventListener("gamepaddisconnected", () => {
			if (this.mode === "gamepad") {
				this.mode = "keyboard";
				this.app.ui.prompts();
			}
			if (!this.app.net.active) this.app.pause();
		});
	}
	activity(mode) {
		this.lastActivity = performance.now();
		if (this.mode !== mode) {
			this.mode = mode;
			this.app.ui?.prompts();
		}
	}
	pads() {
		try {
			return [...navigator.getGamepads()].filter(
				(p) => p && p.connected !== false,
			);
		} catch {
			return [];
		}
	}
	update(now) {
		const pads = this.pads();
		for (let i = 0; i < pads.length; i++) {
			const p = pads[i],
				buttons = p.buttons.map((b) =>
					typeof b === "number" ? b > 0.5 : b.pressed || b.value > 0.5,
				),
				prev = this.padPrevious.get(p.index) || [];
			const down = (n) => buttons[n] && !prev[n];
			if (!this.app.menu) {
				const taps = this.padTaps.get(p.index) || {};
				taps.fire ||= down(0) || down(7);
				taps.dash ||= down(1) || down(5);
				taps.nova ||= down(2) || down(4);
				this.padTaps.set(p.index, taps);
			}
			const axis = Math.abs(p.axes[0] || 0) > 0.2 ? p.axes[0] : 0,
				vert = Math.abs(p.axes[1] || 0) > 0.5 ? p.axes[1] : 0;
			if (
				buttons.some((b, j) => b && !prev[j]) ||
				Math.abs(axis) > 0.25 ||
				vert
			)
				this.activity("gamepad");
			if (
				this.app.attract &&
				(buttons.some((b, j) => b && !prev[j]) || Math.abs(axis) > 0.3 || vert)
			) {
				this.app.exitAttract();
				this.padPrevious.set(p.index, buttons);
				return;
			}
			if (down(9) && !buttons[8]) this.app.back();
			if (this.app.menu) {
				if (down(1)) this.app.back();
				if (down(0)) this.app.ui.activate();
				if (now >= this.menuNext) {
					if (buttons[13] || vert > 0.5) {
						this.app.ui.navigate(1);
						this.menuNext = now + 180;
					} else if (buttons[12] || vert < -0.5) {
						this.app.ui.navigate(-1);
						this.menuNext = now + 180;
					} else if (buttons[14] || axis < -0.5) {
						this.app.ui.adjust(-1);
						this.menuNext = now + 180;
					} else if (buttons[15] || axis > 0.5) {
						this.app.ui.adjust(1);
						this.menuNext = now + 180;
					}
				}
			}
			this.padPrevious.set(p.index, buttons);
		}
	}
	read(localIndex = 0) {
		if (this.app.menu || this.app.net.ended)
			return { move: 0, fire: false, dash: false, nova: false };
		const pad = this.pads()[localIndex];
		if (pad) {
			const b = (n) =>
				typeof pad.buttons[n] === "number"
					? pad.buttons[n] > 0.5
					: !!pad.buttons[n]?.pressed || pad.buttons[n]?.value > 0.5;
			const move =
				Math.abs(pad.axes[0] || 0) > 0.15
					? pad.axes[0]
					: b(14)
						? -1
						: b(15)
							? 1
							: 0;
			const active =
				Math.abs(move) > 0.05 || b(0) || b(7) || b(1) || b(5) || b(2) || b(4);
			if (active) this.activity("gamepad");
			if (this.mode === "gamepad" || localIndex > 0)
				return {
					move,
					fire: b(0) || b(7) || this.padTaps.get(pad.index)?.fire,
					dash: b(1) || b(5) || this.padTaps.get(pad.index)?.dash,
					nova: b(2) || b(4) || this.padTaps.get(pad.index)?.nova,
				};
		}
		if (localIndex === 1) {
			const out = {
				move: (held.has("KeyL") ? 1 : 0) - (held.has("KeyJ") ? 1 : 0),
				fire: held.has("KeyI") || this.taps.has("KeyI"),
				dash: held.has("KeyU") || this.taps.has("KeyU"),
				nova: held.has("KeyO") || this.taps.has("KeyO"),
			};
			return out;
		}
		const move =
			(held.has("ArrowRight") || held.has("KeyD") ? 1 : 0) -
			(held.has("ArrowLeft") || held.has("KeyA") ? 1 : 0);
		const out = {
			move,
			fire:
				held.has("Space") ||
				this.taps.has("Space") ||
				this.mouseFire ||
				this.mode === "touch",
			dash:
				held.has("ShiftLeft") ||
				held.has("ShiftRight") ||
				this.taps.has("ShiftLeft") ||
				this.taps.has("ShiftRight") ||
				this.touchDash,
			nova:
				held.has("KeyE") ||
				held.has("KeyX") ||
				this.taps.has("KeyE") ||
				this.taps.has("KeyX") ||
				this.touchNova,
		};
		if (this.target != null && !move) out.target = this.target;
		return out;
	}
	consume(localIndex = 0) {
		const keys =
			localIndex === 1
				? ["KeyI", "KeyU", "KeyO"]
				: ["Space", "ShiftLeft", "ShiftRight", "KeyE", "KeyX"];
		for (const key of keys) this.taps.delete(key);
		const pad = this.pads()[localIndex];
		if (pad) this.padTaps.delete(pad.index);
		if (localIndex === 0) {
			this.touchDash = false;
			this.touchNova = false;
		}
	}
	clear() {
		held.clear();
		this.taps.clear();
		this.padTaps.clear();
		this.mouseFire = false;
		this.target = null;
		this.pointers.clear();
		this.touchDash = false;
		this.touchNova = false;
	}
	prompt(action) {
		if (this.mode === "touch")
			return {
				move: "DRAG",
				fire: "AUTO",
				dash: "TWO FINGERS",
				nova: "DOUBLE TAP",
				pause: "MENU",
				accept: "TAP",
				back: "BACK",
			}[action];
		if (this.mode !== "gamepad")
			return {
				move: "A D / ← →",
				fire: "SPACE / CLICK",
				dash: "SHIFT / RMB",
				nova: "E",
				pause: "ESC",
				accept: "ENTER",
				back: "ESC",
			}[action];
		const xbox = this.app.settings.glyphs === "xbox";
		return (
			xbox
				? {
						move: "L",
						fire: "RT / A",
						dash: "RB / B",
						nova: "LB / X",
						pause: "MENU",
						accept: "A",
						back: "B",
					}
				: {
						move: "L",
						fire: "R2 / ✕",
						dash: "R1 / ○",
						nova: "L1 / □",
						pause: "OPTIONS",
						accept: "✕",
						back: "○",
					}
		)[action];
	}
}
