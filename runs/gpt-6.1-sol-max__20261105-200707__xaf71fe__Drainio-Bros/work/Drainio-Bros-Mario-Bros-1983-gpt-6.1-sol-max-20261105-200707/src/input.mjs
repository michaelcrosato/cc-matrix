export class Controls {
	constructor(onActivity, onMenu) {
		this.keys = new Set();
		this.mouse = { jump: false, action: false };
		this.jumpPressUntil = [0, 0];
		this.actionPressUntil = [0, 0];
		this.touchJumpUntil = 0;
		this.touchActionUntil = 0;
		this.padJumpUntil = new Map();
		this.padActionUntil = new Map();
		this.padPrevious = new Map();
		this.last = "keyboard";
		this.onActivity = onActivity;
		this.onMenu = onMenu;
		this.touch = { x: 0, jump: false, action: false, down: false };
		this.touches = new Map();
		this.menu = true;
		this.players = 1;
		this.menuRepeat = 0;
		this.lastActivity = performance.now();
		window.addEventListener("keydown", (e) => {
			if (e.repeat) return;
			this.activity("keyboard");
			this.keys.add(e.code);
			if (!this.menu) {
				if (
					["Space", "KeyW"].includes(e.code) ||
					(this.players === 1 && e.code === "ArrowUp")
				)
					this.jumpPressUntil[0] = Infinity;
				if (["KeyE", "KeyX"].includes(e.code))
					this.actionPressUntil[0] = Infinity;
				if (["ArrowUp", "ShiftRight", "Numpad0"].includes(e.code))
					this.jumpPressUntil[1] = Infinity;
				if (["ControlRight", "Enter"].includes(e.code))
					this.actionPressUntil[1] = Infinity;
			}
			if (e.target.matches("input[type=text], textarea")) {
				if (e.code === "Escape") e.target.blur();
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
			if (this.menu) {
				const actions = {
					ArrowUp: "up",
					KeyW: "up",
					ArrowDown: "down",
					KeyS: "down",
					ArrowLeft: "left",
					KeyA: "left",
					ArrowRight: "right",
					KeyD: "right",
					Enter: "accept",
					Space: "accept",
					Escape: "back",
					Backspace: "back",
					Tab: e.shiftKey ? "up" : "down",
				};
				if (actions[e.code]) this.onMenu(actions[e.code]);
			} else if (e.code === "Escape" || e.code === "KeyP") this.onMenu("pause");
		});
		window.addEventListener("keyup", (e) => this.keys.delete(e.code));
		window.addEventListener("blur", () => {
			this.keys.clear();
			this.clearTransient();
			this.touch = { x: 0, jump: false, action: false, down: false };
			this.touches.clear();
		});
		window.addEventListener("pointermove", (e) => {
			if (
				e.pointerType !== "touch" &&
				Math.abs(e.movementX) + Math.abs(e.movementY) > 2
			)
				this.activity("keyboard", false);
		});
		window.addEventListener("pointerdown", (e) => {
			this.activity(e.pointerType === "touch" ? "touch" : "keyboard");
			if (
				e.pointerType === "touch" &&
				!this.menu &&
				!e.target.closest("button,input")
			)
				this.touchStart(e);
			else if (!this.menu && e.target.matches("canvas")) {
				if (e.button === 0) {
					this.mouse.jump = true;
					this.jumpPressUntil[0] = Infinity;
				}
				if (e.button === 2) {
					this.mouse.action = true;
					this.actionPressUntil[0] = Infinity;
				}
			}
		});
		window.addEventListener("pointermove", (e) => this.touchMove(e), {
			passive: false,
		});
		window.addEventListener("contextmenu", (e) => {
			if (!this.menu) e.preventDefault();
		});
		window.addEventListener("pointerup", (e) => {
			this.mouse.jump = this.mouse.action = false;
			this.touchEnd(e);
		});
		window.addEventListener("pointercancel", (e) => this.touchEnd(e));
	}
	activity(kind, significant = true) {
		this.last = kind;
		if (significant) {
			this.lastActivity = performance.now();
			this.onActivity(kind);
		}
	}
	touchStart(e) {
		e.preventDefault();
		const side = e.clientX < innerWidth * 0.58 ? "move" : "jump";
		this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY, side });
		if (side === "jump") {
			this.touch.jump = true;
			this.touchJumpUntil = Infinity;
		}
	}
	touchMove(e) {
		const t = this.touches.get(e.pointerId);
		if (!t) return;
		e.preventDefault();
		if (t.side === "move") {
			this.touch.x = Math.max(-1, Math.min(1, (e.clientX - t.x) / 55));
			this.touch.down = e.clientY - t.y > 65;
		}
	}
	touchEnd(e) {
		const t = this.touches.get(e.pointerId);
		if (!t) return;
		if (t.side === "move") {
			this.touch.x = 0;
			this.touch.down = false;
		} else this.touch.jump = false;
		this.touches.delete(e.pointerId);
	}
	poll(dt) {
		this.frames = (this.frames || 0) + 1;
		this.menuRepeat = Math.max(0, this.menuRepeat - dt);
		const pads = Array.from(navigator.getGamepads?.() || []).filter(
			(p) => p && p.connected !== false,
		);
		this.pads = pads;
		for (const pad of pads) {
			const current = pad.buttons.map((b) => !!b.pressed),
				prev = this.padPrevious.get(pad.index) || [];
			const axisX = Math.abs(pad.axes[0] || 0) > 0.2 ? pad.axes[0] : 0,
				axisY = Math.abs(pad.axes[1] || 0) > 0.5 ? pad.axes[1] : 0;
			if (current[0] && !prev[0]) this.padJumpUntil.set(pad.index, Infinity);
			if (current[2] && !prev[2]) this.padActionUntil.set(pad.index, Infinity);
			const anyEdge = current.some((b, i) => b && !prev[i]);
			if (anyEdge || (!this.menu && Math.abs(axisX) > 0.25))
				this.activity("pad");
			if (this.menu) {
				const vertical =
					current[12] || axisY < -0.5
						? "up"
						: current[13] || axisY > 0.5
							? "down"
							: null;
				const horizontal =
					current[14] || axisX < -0.5
						? "left"
						: current[15] || axisX > 0.5
							? "right"
							: null;
				const edgeDir = [12, 13, 14, 15].some((i) => current[i] && !prev[i]);
				if ((vertical || horizontal) && (this.menuRepeat <= 0 || edgeDir)) {
					this.activity("pad");
					this.onMenu(vertical || horizontal);
					this.menuRepeat = 0.2;
				}
				if (current[0] && !prev[0]) this.onMenu("accept");
				if ((current[1] && !prev[1]) || (current[9] && !prev[9] && !current[8]))
					this.onMenu("back");
			} else if (current[9] && !prev[9] && !current[8]) this.onMenu("pause");
			this.padPrevious.set(pad.index, current);
		}
	}
	consume(index = 0) {
		if (index < 2) {
			this.jumpPressUntil[index] = 0;
			this.actionPressUntil[index] = 0;
		}
		if (index === 0) {
			this.touchJumpUntil = 0;
			this.touchActionUntil = 0;
		}
		const pad = this.pads?.[index];
		if (pad) {
			this.padJumpUntil.set(pad.index, 0);
			this.padActionUntil.set(pad.index, 0);
		}
	}
	clearTransient() {
		for (let i = 0; i < 4; i++) this.consume(i);
	}
	read(index = 0) {
		const k = this.keys,
			pad = this.pads?.[index];
		const solo = this.players === 1;
		let x = 0,
			jump = false,
			action = false,
			down = false;
		if (index === 0) {
			x =
				(k.has("KeyD") || (solo && k.has("ArrowRight")) ? 1 : 0) -
				(k.has("KeyA") || (solo && k.has("ArrowLeft")) ? 1 : 0);
			jump =
				this.mouse.jump ||
				k.has("Space") ||
				k.has("KeyW") ||
				(solo && k.has("ArrowUp"));
			action = this.mouse.action || k.has("KeyE") || k.has("KeyX");
			down = k.has("KeyS") || (solo && k.has("ArrowDown"));
			if (this.last === "touch") {
				x = this.touch.x;
				jump ||= this.touch.jump || performance.now() < this.touchJumpUntil;
				action ||=
					this.touch.action || performance.now() < this.touchActionUntil;
				down ||= this.touch.down;
			}
		}
		if (index === 1) {
			x = (k.has("ArrowRight") ? 1 : 0) - (k.has("ArrowLeft") ? 1 : 0);
			jump = k.has("ArrowUp") || k.has("ShiftRight") || k.has("Numpad0");
			action = k.has("ControlRight") || k.has("Enter");
			down = k.has("ArrowDown");
		}
		if (pad) {
			const px = pad.axes[0] || 0;
			if (Math.abs(px) > 0.18) x = px;
			if (pad.buttons[14]?.pressed) x = -1;
			if (pad.buttons[15]?.pressed) x = 1;
			jump ||= !!pad.buttons[0]?.pressed;
			action ||= !!pad.buttons[2]?.pressed;
			down ||= !!pad.buttons[13]?.pressed || (pad.axes[1] || 0) > 0.65;
		}
		if (index < 2) {
			jump ||= performance.now() < this.jumpPressUntil[index];
			action ||= performance.now() < this.actionPressUntil[index];
		}
		if (pad) {
			jump ||= performance.now() < (this.padJumpUntil.get(pad.index) || 0);
			action ||= performance.now() < (this.padActionUntil.get(pad.index) || 0);
		}
		return { x, jump, action, down };
	}
}
