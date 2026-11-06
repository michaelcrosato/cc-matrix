export class GameInput {
	constructor({ onActivity, onMenu, onMode, canvas }) {
		this.onActivity = onActivity;
		this.onMenu = onMenu;
		this.onMode = onMode;
		this.keys = new Set();
		this.edges = new Set();
		this.mode = "keyboard";
		this.padPrevious = new Map();
		this.padEdges = new Map();
		this.pads = [];
		this.touch = { id: null, x: 0, y: 0, dx: 0, dy: 0 };
		this.pointer = { x: 0.5, y: 0.5 };
		this.drag = null;
		this.cameraX = 0;
		this.cameraY = 0;
		this.zoom = 0;
		this.injected = null;
		this.menuRepeat = 0;
		this.lastPadActivity = 0;
		this.listeners = [];
		const listen = (target, event, fn, opts) => {
			target.addEventListener(event, fn, opts);
			this.listeners.push(() => target.removeEventListener(event, fn, opts));
		};
		listen(window, "keydown", (e) => {
			if (/INPUT|TEXTAREA/.test(e.target.tagName)) return;
			if (
				[
					"Enter",
					"Space",
					"ArrowUp",
					"ArrowDown",
					"ArrowLeft",
					"ArrowRight",
					"Tab",
					"PageUp",
					"PageDown",
					"Home",
					"End",
				].includes(e.code)
			)
				e.preventDefault();
			if (!this.keys.has(e.code)) this.edges.add(e.code);
			this.keys.add(e.code);
			this.activity("keyboard");
		});
		listen(window, "keyup", (e) => this.keys.delete(e.code));
		listen(window, "blur", () => {
			this.keys.clear();
			this.touch.dx = this.touch.dy = 0;
		});
		listen(window, "pointerdown", (e) => {
			this.activity(e.pointerType === "touch" ? "touch" : "keyboard");
			if (e.pointerType === "touch") return;
			this.pointer = { x: e.clientX / innerWidth, y: e.clientY / innerHeight };
			if (e.target === canvas && (e.button === 2 || e.button === 0))
				this.drag = { x: e.clientX, y: e.clientY, button: e.button, moved: 0 };
		});
		listen(window, "pointermove", (e) => {
			if (e.pointerType === "touch") return;
			if (Math.abs(e.movementX) + Math.abs(e.movementY) > 1)
				this.activity("keyboard");
			this.pointer = { x: e.clientX / innerWidth, y: e.clientY / innerHeight };
			if (this.drag) {
				const dx = e.clientX - this.drag.x,
					dy = e.clientY - this.drag.y;
				this.cameraX += dx * 0.007;
				this.cameraY += dy * 0.004;
				this.drag.moved += Math.abs(dx) + Math.abs(dy);
				this.drag.x = e.clientX;
				this.drag.y = e.clientY;
				this.activity("keyboard");
			}
		});
		listen(window, "pointerup", () => {
			if (this.drag?.button === 0 && this.drag.moved < 5)
				this.edges.add("Mouse0");
			this.drag = null;
		});
		listen(canvas, "contextmenu", (e) => e.preventDefault());
		listen(
			canvas,
			"wheel",
			(e) => {
				this.zoom += Math.sign(e.deltaY) * 1.5;
				this.activity("keyboard");
				e.preventDefault();
			},
			{ passive: false },
		);
		listen(
			canvas,
			"touchstart",
			(e) => {
				this.activity("touch");
				for (const t of e.changedTouches) {
					if (this.touch.id === null && t.clientX < innerWidth * 0.65) {
						Object.assign(this.touch, {
							id: t.identifier,
							x: t.clientX,
							y: t.clientY,
							dx: 0,
							dy: 0,
						});
						this.showRing(t.clientX, t.clientY);
					} else this.edges.add("TouchAction");
				}
				e.preventDefault();
			},
			{ passive: false },
		);
		listen(
			canvas,
			"touchmove",
			(e) => {
				for (const t of e.changedTouches)
					if (t.identifier === this.touch.id) {
						this.touch.dx = Math.max(
							-1,
							Math.min(1, (t.clientX - this.touch.x) / 55),
						);
						this.touch.dy = Math.max(
							-1,
							Math.min(1, (t.clientY - this.touch.y) / 55),
						);
					}
				e.preventDefault();
			},
			{ passive: false },
		);
		const touchEnd = (e) => {
			for (const t of e.changedTouches)
				if (t.identifier === this.touch.id) {
					this.touch.id = null;
					this.touch.dx = this.touch.dy = 0;
					document.getElementById("touchRing").classList.add("hidden");
				}
			e.preventDefault();
		};
		listen(canvas, "touchend", touchEnd, { passive: false });
		listen(canvas, "touchcancel", touchEnd, { passive: false });
		listen(document.getElementById("touchAction"), "pointerdown", (e) => {
			e.stopPropagation();
			this.activity("touch");
			this.edges.add("TouchAction");
		});
		listen(window, "gamepadconnected", () => this.activity("pad"));
	}
	activity(mode) {
		if (mode !== this.mode) {
			this.mode = mode;
			this.onMode?.(mode);
		}
		this.onActivity?.();
	}
	showRing(x, y) {
		const r = document.getElementById("touchRing");
		r.style.left = `${x}px`;
		r.style.top = `${y}px`;
		r.classList.remove("hidden");
	}
	poll(dt, menu = false) {
		this.menuRepeat = Math.max(0, this.menuRepeat - dt);
		this.pads = Array.from(navigator.getGamepads?.() || []).filter(
			(p) => p?.connected,
		);
		this.padEdges.clear();
		for (const p of this.pads) {
			const prev = this.padPrevious.get(p.index) || [];
			const edge = p.buttons.map((b, i) => b.pressed && !prev[i]);
			this.padEdges.set(p.index, edge);
			this.padPrevious.set(
				p.index,
				p.buttons.map((b) => b.pressed),
			);
			const active =
				edge.some(Boolean) || p.axes.some((a) => Math.abs(a) > 0.25);
			if (active) this.activity("pad");
		}
		if (menu) {
			if (this.edges.has("Tab"))
				this.onMenu?.(
					this.keys.has("ShiftLeft") || this.keys.has("ShiftRight")
						? "up"
						: "down",
				);
			const p = this.pads[0],
				e = p ? this.padEdges.get(p.index) : [];
			const card = document.querySelector(".screen:not(.hidden) .menu-card");
			const canScroll = card && card.scrollHeight > card.clientHeight + 1;
			if (canScroll) {
				const scrollY = p?.axes[3] || 0;
				if (Math.abs(scrollY) > 0.18) card.scrollTop += scrollY * 600 * dt;
				if (this.edges.has("PageDown"))
					card.scrollTop += card.clientHeight * 0.8;
				if (this.edges.has("PageUp")) card.scrollTop -= card.clientHeight * 0.8;
				if (this.edges.has("Home")) card.scrollTop = 0;
				if (this.edges.has("End")) card.scrollTop = card.scrollHeight;
			}
			const reading =
				canScroll &&
				[...card.querySelectorAll("button,input,textarea,select")].filter(
					(b) =>
						!b.disabled && !b.closest(".hidden") && b.offsetParent !== null,
				).length <= 1;
			const up =
				this.edges.has("ArrowUp") ||
				this.edges.has("KeyW") ||
				e?.[12] ||
				(p?.axes[1] < -0.55 && this.menuRepeat === 0);
			const down =
				this.edges.has("ArrowDown") ||
				this.edges.has("KeyS") ||
				e?.[13] ||
				(p?.axes[1] > 0.55 && this.menuRepeat === 0);
			const left =
				this.edges.has("ArrowLeft") ||
				this.edges.has("KeyA") ||
				e?.[14] ||
				(p?.axes[0] < -0.55 && this.menuRepeat === 0);
			const right =
				this.edges.has("ArrowRight") ||
				this.edges.has("KeyD") ||
				e?.[15] ||
				(p?.axes[0] > 0.55 && this.menuRepeat === 0);
			if (up || down || left || right) {
				if (reading && (up || down))
					card.scrollTop +=
						(up ? -1 : 1) * Math.max(60, card.clientHeight * 0.18);
				else this.onMenu?.(up ? "up" : down ? "down" : left ? "left" : "right");
				this.menuRepeat = 0.2;
			}
			if (
				this.edges.has("Enter") ||
				this.edges.has("Space") ||
				this.edges.has("KeyE") ||
				e?.[0]
			)
				this.onMenu?.("confirm");
			if (
				this.edges.has("Escape") ||
				e?.[1] ||
				(e?.[9] && !(globalThis.AIHub?.active && p?.buttons[8]?.pressed))
			)
				this.onMenu?.("back");
		} else {
			const p = this.pads[0],
				e = p ? this.padEdges.get(p.index) : [];
			if (
				this.edges.has("Escape") ||
				(e?.[9] && !(globalThis.AIHub?.active && p?.buttons[8]?.pressed))
			)
				this.onMenu?.("pause");
			if (
				this.edges.has("Tab") ||
				(e?.[8] && !(globalThis.AIHub?.active && p?.buttons[9]?.pressed))
			)
				this.onMenu?.("map");
			if (p) {
				this.cameraX +=
					(Math.abs(p.axes[2] || 0) > 0.18 ? p.axes[2] : 0) * dt * 2;
				this.cameraY += (Math.abs(p.axes[3] || 0) > 0.18 ? p.axes[3] : 0) * dt;
			}
			if (this.keys.has("KeyQ")) this.cameraX -= dt * 1.7;
			if (this.keys.has("KeyR")) this.cameraX += dt * 1.7;
		}
	}
	get(index = 0, localCoop = false) {
		if (this.injected?.[index]) return { ...this.injected[index] };
		const blank = {
			x: 0,
			z: 0,
			interact: false,
			candy: false,
			pulse: false,
			hide: false,
			boost: false,
			bike: false,
		};
		// In keyboard + pad co-op, the keyboard is kid one and the pad is kid two.
		const keyboard = index === 0;
		const padIndex =
			localCoop && this.pads.length === 1 ? (index === 1 ? 0 : -1) : index;
		const p = this.pads[padIndex],
			e = p ? this.padEdges.get(p.index) || [] : [];
		if (p) {
			const dead = (a) => (Math.abs(a) > 0.17 ? a : 0);
			blank.x = dead(p.axes[0] || 0);
			blank.z = dead(p.axes[1] || 0);
			blank.interact = !!e[0];
			blank.candy = !!e[2];
			blank.pulse = !!e[3];
			blank.hide = !!p.buttons[1]?.pressed;
			blank.boost = !!p.buttons[7]?.pressed;
		}
		if (keyboard) {
			blank.x +=
				(this.keys.has("KeyD") || this.keys.has("ArrowRight") ? 1 : 0) -
				(this.keys.has("KeyA") || this.keys.has("ArrowLeft") ? 1 : 0);
			blank.z +=
				(this.keys.has("KeyS") || this.keys.has("ArrowDown") ? 1 : 0) -
				(this.keys.has("KeyW") || this.keys.has("ArrowUp") ? 1 : 0);
			blank.interact ||=
				this.edges.has("KeyE") ||
				this.edges.has("Mouse0") ||
				this.edges.has("TouchAction");
			blank.candy ||= this.edges.has("KeyC");
			blank.pulse ||= this.edges.has("KeyF");
			blank.hide ||= this.keys.has("ShiftLeft") || this.keys.has("ShiftRight");
			blank.boost ||= this.keys.has("Space");
			blank.x += this.touch.dx;
			blank.z += this.touch.dy;
		}
		const len = Math.hypot(blank.x, blank.z);
		if (len > 1) {
			blank.x /= len;
			blank.z /= len;
		}
		return blank;
	}
	finish() {
		this.edges.clear();
		this.padEdges.clear();
		this.cameraX = 0;
		this.cameraY = 0;
		this.zoom = 0;
	}
	clear() {
		this.keys.clear();
		this.edges.clear();
		this.injected = null;
		this.touch.dx = this.touch.dy = 0;
	}
	dispose() {
		for (const listener of this.listeners) listener();
	}
}
