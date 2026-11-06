export class Input {
	constructor(callbacks) {
		this.cb = callbacks;
		this.keys = new Set();
		this.mode = matchMedia("(pointer:coarse)").matches ? "touch" : "keyboard";
		this.pointer = {
			x: innerWidth / 2,
			y: innerHeight / 3,
			down: false,
			active: false,
		};
		this.touch = null;
		this.pads = [];
		this.oldButtons = [];
		this.lastInput = performance.now();
		this.navAt = 0;
		this.touchPulse = false;
		const notify = (mode) => {
			const changed = this.mode !== mode;
			this.mode = mode;
			this.lastInput = performance.now();
			if (changed) this.cb.mode?.(mode);
			return this.cb.activity?.();
		};
		this.notify = notify;
		addEventListener("keydown", (e) => {
			if (e.repeat) return;
			const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(
				document.activeElement?.tagName,
			);
			if (typing) {
				if (e.code === "Escape") {
					document.activeElement.blur();
					this.cb.back?.();
				}
				return;
			}
			if (notify("keyboard")) return;
			this.keys.add(e.code);
			if (
				[
					"Space",
					"ArrowLeft",
					"ArrowRight",
					"ArrowUp",
					"ArrowDown",
					"Tab",
				].includes(e.code)
			)
				e.preventDefault();
			if (e.code === "Escape" || e.code === "KeyP") this.cb.back?.();
			else if (this.cb.menu?.()) {
				if (e.code === "PageDown" || e.code === "PageUp") {
					e.preventDefault();
					document
						.querySelector("#overlay .panel")
						?.scrollBy({
							top: (e.code === "PageDown" ? 1 : -1) * innerHeight * 0.55,
						});
				}
				if (["ArrowUp", "KeyW"].includes(e.code)) this.navigate(0, -1);
				if (["ArrowDown", "KeyS", "Tab"].includes(e.code)) this.navigate(0, 1);
				if (["ArrowLeft", "KeyA"].includes(e.code)) this.navigate(-1, 0);
				if (["ArrowRight", "KeyD"].includes(e.code)) this.navigate(1, 0);
				if (e.code === "Enter" || e.code === "Space") this.activate();
			}
		});
		addEventListener("keyup", (e) => this.keys.delete(e.code));
		addEventListener("blur", () => {
			this.keys.clear();
			this.pointer.down = false;
			this.touch = null;
			this.cb.blur?.();
		});
		addEventListener("pointermove", (e) => {
			if (e.pointerType === "touch") {
				if (this.touch?.id === e.pointerId) {
					const elapsed = Math.max(1, e.timeStamp - this.touch.lastAt);
					const speed = ((e.clientX - this.touch.lastX) * 1000) / elapsed;
					this.touch.x = e.clientX;
					this.touch.y = e.clientY;
					if (
						Math.abs(speed) > 700 &&
						Math.abs(e.clientX - this.touch.startX) > 45
					)
						this.touch.dashRequested = true;
					this.touch.lastX = e.clientX;
					this.touch.lastAt = e.timeStamp;
				}
			} else {
				if (
					Math.hypot(e.clientX - this.pointer.x, e.clientY - this.pointer.y) > 1
				)
					notify("keyboard");
				this.pointer = {
					...this.pointer,
					x: e.clientX,
					y: e.clientY,
					active: true,
				};
			}
		});
		addEventListener("pointerdown", (e) => {
			if (notify(e.pointerType === "touch" ? "touch" : "keyboard")) return;
			if (e.target.closest?.('button,input,textarea,a,[role="button"]')) return;
			if (e.pointerType === "touch") {
				if (this.touch) {
					this.touchPulse = true;
				} else
					this.touch = {
						id: e.pointerId,
						startX: e.clientX,
						startY: e.clientY,
						x: e.clientX,
						y: e.clientY,
						lastX: e.clientX,
						lastAt: e.timeStamp,
						dashRequested: false,
					};
			} else {
				this.pointer.down = e.button === 0;
				this.pointer.active = true;
				this.pointer.x = e.clientX;
				this.pointer.y = e.clientY;
				if (e.button === 2) this.keys.add("MousePulse");
			}
		});
		addEventListener("pointerup", (e) => {
			if (e.pointerType === "touch") {
				if (this.touch?.id === e.pointerId) this.touch = null;
			} else {
				this.pointer.down = false;
				this.keys.delete("MousePulse");
			}
		});
		addEventListener("pointercancel", () => {
			this.touch = null;
			this.pointer.down = false;
		});
		addEventListener("contextmenu", (e) => e.preventDefault());
		document.addEventListener("pointerover", (e) => {
			const button = e.target.closest?.('button,input[type="range"]');
			if (button && !button.disabled && !button.closest("[hidden]")) {
				document.querySelector(".focused")?.classList.remove("focused");
				button.classList.add("focused");
			}
		});
		this.cb.mode?.(this.mode);
	}
	focusFirst() {
		const elements = this.elements();
		document
			.querySelectorAll(".focused")
			.forEach((e) => e.classList.remove("focused"));
		if (elements[0]) elements[0].classList.add("focused");
	}
	elements() {
		return [
			...document.querySelectorAll(
				"#overlay button:not(:disabled),#overlay input,#overlay textarea",
			),
		].filter((e) => e.getClientRects().length > 0 && !e.closest("[hidden]"));
	}
	navigate(dx, dy) {
		const list = this.elements();
		if (!list.length) return;
		let active = list.find((e) => e.classList.contains("focused")) || list[0];
		if (active.type === "range" && dx) {
			const step = Number(active.step) || 1;
			active.value = Math.max(
				Number(active.min),
				Math.min(Number(active.max), Number(active.value) + step * dx),
			);
			active.dispatchEvent(new Event("input", { bubbles: true }));
			return;
		}
		const r = active.getBoundingClientRect(),
			cx = r.x + r.width / 2,
			cy = r.y + r.height / 2;
		const candidates = list
			.filter((e) => e !== active)
			.map((e) => {
				const t = e.getBoundingClientRect(),
					x = t.x + t.width / 2 - cx,
					y = t.y + t.height / 2 - cy;
				return {
					e,
					x,
					y,
					d: Math.hypot(x, y) + (dx ? Math.abs(y) : Math.abs(x)) * 2,
				};
			})
			.filter((p) => (dx ? p.x * dx > 5 : p.y * dy > 5))
			.sort((a, b) => a.d - b.d);
		const next =
			candidates[0]?.e ||
			list[
				(list.indexOf(active) + (dx + dy > 0 ? 1 : -1) + list.length) %
					list.length
			];
		active.classList.remove("focused");
		next.classList.add("focused");
		next.scrollIntoView({ block: "nearest", behavior: "instant" });
		this.cb.ui?.();
	}
	activate() {
		const e =
			this.elements().find((e) => e.classList.contains("focused")) ||
			this.elements()[0];
		if (e) {
			if (e.tagName === "INPUT" || e.tagName === "TEXTAREA") e.focus();
			else e.click();
		}
	}
	poll(now) {
		this.pads = [...(navigator.getGamepads?.() || [])].filter(Boolean);
		for (const pad of this.pads) {
			const old = this.oldButtons[pad.index] || [];
			const pressed = pad.buttons.map((b) => b.pressed || b.value > 0.55);
			const active =
				pressed.some(Boolean) || pad.axes.some((v) => Math.abs(v) > 0.22);
			if (active && this.notify("gamepad")) {
				this.oldButtons[pad.index] = pressed;
				continue;
			}
			if (pressed[9] && !old[9] && !pressed[8]) this.cb.back?.();
			if (this.cb.menu?.()) {
				const panel = document.querySelector("#overlay .panel");
				if (panel && Math.abs(pad.axes[3] || 0) > 0.2)
					panel.scrollTop += pad.axes[3] * 22;
				if (pressed[0] && !old[0]) this.activate();
				if (pressed[1] && !old[1]) this.cb.back?.();
				let dx = (pressed[15] ? 1 : 0) - (pressed[14] ? 1 : 0),
					dy = (pressed[13] ? 1 : 0) - (pressed[12] ? 1 : 0);
				if (Math.abs(pad.axes[0] || 0) > 0.6) dx = Math.sign(pad.axes[0]);
				if (Math.abs(pad.axes[1] || 0) > 0.6) dy = Math.sign(pad.axes[1]);
				if ((dx || dy) && now > this.navAt) {
					this.navigate(dx, dy);
					this.navAt = now + 190;
				}
			}
			this.oldButtons[pad.index] = pressed;
		}
	}
	get(seat, player, graphics, { touchAssist = true, game = null } = {}) {
		const down = (k) => this.keys.has(k);
		const second = seat === 1;
		const pad = this.pads[seat];
		const dead = (v) => (Math.abs(v || 0) > 0.16 ? v : 0);
		let move = second
			? Number(down("KeyL")) - Number(down("KeyJ"))
			: Number(down("KeyD") || down("ArrowRight")) -
				Number(down("KeyA") || down("ArrowLeft"));
		let aim = 0,
			fire = second ? down("KeyK") : down("Space") || this.pointer.down,
			pulse = second ? down("KeyI") : down("KeyE") || down("MousePulse"),
			dash = second ? down("KeyU") : down("ShiftLeft") || down("ShiftRight");
		if (pad) {
			move =
				dead(pad.axes[0]) ||
				(pad.buttons[15]?.pressed ? 1 : 0) -
					(pad.buttons[14]?.pressed ? 1 : 0) ||
				move;
			aim = dead(pad.axes[2]) * 0.38;
			fire = fire || pad.buttons[0]?.pressed || pad.buttons[7]?.value > 0.2;
			pulse = pulse || pad.buttons[2]?.pressed;
			dash = dash || pad.buttons[1]?.pressed || pad.buttons[5]?.pressed;
		}
		if (!second && this.mode === "keyboard" && this.pointer.active && player) {
			const point = graphics.screenToWorld(this.pointer.x, this.pointer.y);
			aim = Math.max(
				-0.38,
				Math.min(
					0.38,
					Math.atan2(point.x - player.x, Math.max(1, point.y - player.y)),
				),
			);
		}
		if (!second && this.mode === "touch") {
			fire = true;
			if (this.touch) {
				move = Math.max(
					-1,
					Math.min(1, (this.touch.x - this.touch.startX) / 65),
				);
				dash = !!this.touch.dashRequested;
				this.touch.dashRequested = false;
			}
			pulse = this.touchPulse;
			this.touchPulse = false;
			const list =
				game?.entities instanceof Map
					? [...game.entities.values()]
					: game?.entities || [];
			const target = list
				.filter((e) => e.kind === "enemy" && !(e.type === "boss" && e.shield))
				.sort(
					(a, b) =>
						Math.abs(a.x - (player?.x || 0)) - Math.abs(b.x - (player?.x || 0)),
				)[0];
			if (target && player && touchAssist)
				aim = Math.max(
					-0.38,
					Math.min(0.38, Math.atan2(target.x - player.x, target.y - player.y)),
				);
			if (
				touchAssist &&
				player &&
				list.some(
					(e) =>
						e.kind === "bomb" && e.y < -3.5 && Math.abs(e.x - player.x) < 2,
				)
			)
				pulse = true;
		}
		return { move, aim, fire, pulse, dash };
	}
	rumble(strength = 0.3) {
		for (const pad of this.pads)
			pad.vibrationActuator
				?.playEffect("dual-rumble", {
					duration: 120,
					strongMagnitude: strength,
					weakMagnitude: strength * 0.5,
				})
				.catch(() => {});
	}
}
