/* One input layer for the same TV-first game screens on every device. */
const EMPTY_INPUT = () => ({
	x: 0,
	jump: false,
	kick: false,
	drop: false,
	pulse: false,
});
const INPUT_KEYS = new Set([
	"KeyA",
	"KeyD",
	"ArrowLeft",
	"ArrowRight",
	"Space",
	"KeyW",
	"ArrowUp",
	"KeyX",
	"KeyJ",
	"ShiftLeft",
	"ShiftRight",
	"KeyK",
	"KeyS",
	"ArrowDown",
	"KeyF",
	"KeyH",
	"KeyT",
	"KeyG",
	"KeyR",
	"KeyY",
	"Escape",
	"Enter",
]);
const MENU_KEYS = {
	ArrowUp: "up",
	KeyW: "up",
	ArrowDown: "down",
	KeyS: "down",
	ArrowLeft: "left",
	KeyA: "left",
	ArrowRight: "right",
	KeyD: "right",
	Enter: "confirm",
	Space: "confirm",
};
const KEY_ACTIONS = {
	Space: [0, "jump"],
	KeyW: [0, "jump"],
	ArrowUp: [0, "jump"],
	KeyX: [0, "kick"],
	KeyJ: [0, "kick"],
	ShiftLeft: [0, "pulse"],
	ShiftRight: [0, "pulse"],
	KeyK: [0, "pulse"],
	KeyS: [0, "drop"],
	ArrowDown: [0, "drop"],
	KeyT: [1, "jump"],
	KeyR: [1, "kick"],
	KeyY: [1, "pulse"],
	KeyG: [1, "drop"],
};

export class InputManager {
	constructor(options = {}) {
		this.options = options;
		this.mode = "keyboard";
		this.glyphs = "ps";
		this.menu = true;
		this.keys = new Set();
		this.pointers = new Set();
		this.active = false;
		this.keyLatch = [EMPTY_INPUT(), EMPTY_INPUT()];
		this.suppressedActionKeys = new Set();
		this.padStates = new Map();
		this.menuDirection = null;
		this.menuRepeatAt = 0;
		this.time = 0;
		this.leftTouch = null;
		this.rightTouches = new Map();
		this.touchX = 0;
		this.touchUntil = { jump: 0, kick: 0, drop: 0, pulse: 0 };
		this.listeners = [];
		this.disposed = false;
		this._listen(window, "keydown", (event) => this._keyDown(event));
		this._listen(window, "keyup", (event) => this._keyUp(event));
		this._listen(window, "blur", () => this.clear());
		this._listen(document, "visibilitychange", () => {
			if (document.hidden) this.clear();
		});
		this._listen(document, "pointerdown", (event) => this._pointerDown(event), {
			passive: false,
		});
		this._listen(document, "pointermove", (event) => this._pointerMove(event), {
			passive: false,
		});
		this._listen(document, "pointerup", (event) => this._pointerUp(event), {
			passive: false,
		});
		this._listen(
			document,
			"pointercancel",
			(event) => this._pointerUp(event, true),
			{ passive: false },
		);
		this._listen(window, "gamepaddisconnected", (event) =>
			this.padStates.delete(event.gamepad.index),
		);
		this._listen(document, "contextmenu", (event) => {
			if (this._isCanvas(event.target)) event.preventDefault();
		});
		this._makeTouchMarker();
	}

	_listen(target, name, handler, options) {
		target.addEventListener(name, handler, options);
		this.listeners.push(() =>
			target.removeEventListener(name, handler, options),
		);
	}

	_activity(type) {
		this.mode = type;
		this.options.onActivity?.(type);
	}

	_editing(target) {
		return Boolean(
			target?.closest?.('input, textarea, select, [contenteditable="true"]'),
		);
	}

	_ui(target) {
		return Boolean(
			target?.closest?.(
				'[data-ui], button, input, textarea, select, a, [role="button"], [contenteditable="true"]',
			),
		);
	}

	_isCanvas(target) {
		if (this.options.element)
			return (
				target === this.options.element ||
				this.options.element.contains?.(target)
			);
		return target?.tagName === "CANVAS";
	}

	_keyDown(event) {
		const code = event.code;
		if (!this.keys.has(code)) this._activity("keyboard");
		if (code === "Escape") {
			if (!event.repeat) {
				if (this.menu) this.options.onMenu?.("back");
				else this.options.onPause?.();
			}
			event.preventDefault();
			return;
		}
		// Let native form fields retain selection, editing and range-key behavior.
		if (this._editing(event.target)) return;
		this.keys.add(code);
		const binding = KEY_ACTIONS[code];
		if (binding) {
			if (this.menu) this.suppressedActionKeys.add(code);
			else if (!event.repeat) {
				this.suppressedActionKeys.delete(code);
				this.keyLatch[binding[0]][binding[1]] = true;
			}
		}
		if (INPUT_KEYS.has(code)) event.preventDefault();
		if (this.menu && MENU_KEYS[code]) {
			const action = MENU_KEYS[code];
			if (!event.repeat || !["confirm", "back"].includes(action))
				this.options.onMenu?.(action);
		}
	}

	_keyUp(event) {
		this.suppressedActionKeys.delete(event.code);
		if (this.keys.has(event.code)) {
			this.keys.delete(event.code);
			this._activity("keyboard");
		}
	}

	_makeTouchMarker() {
		this.marker = document.createElement("div");
		this.marker.setAttribute("aria-hidden", "true");
		this.marker.style.cssText =
			"display:none;position:fixed;z-index:30;width:90px;height:90px;border:2px solid #f6e5be55;border-radius:50%;pointer-events:none;transform:translate(-50%,-50%);background:#10292b18;";
		this.markerThumb = document.createElement("div");
		this.markerThumb.style.cssText =
			"position:absolute;width:25px;height:25px;left:50%;top:50%;border:2px solid #ffe3a077;border-radius:50%;background:#ffe3a022;transform:translate(-50%,-50%);";
		this.marker.append(this.markerThumb);
		document.body.append(this.marker);
	}

	_pointerReport(event, phase) {
		this.options.onPointer?.({
			phase,
			x: event.clientX,
			y: event.clientY,
			pointerType: event.pointerType,
			event,
		});
	}

	_pointerDown(event) {
		this.pointers.add(event.pointerId);
		if (event.pointerType !== "touch") {
			this._activity("mouse");
			this._pointerReport(event, "down");
			return;
		}
		this._activity("touch");
		if (this._ui(event.target) || !this._isCanvas(event.target) || this.menu)
			return;
		event.preventDefault();
		const rect =
			this.options.element?.getBoundingClientRect?.() ||
			event.target.getBoundingClientRect();
		const isLeft = event.clientX < rect.left + rect.width * 0.5;
		if (isLeft && !this.leftTouch) {
			this.leftTouch = {
				id: event.pointerId,
				x: event.clientX,
				y: event.clientY,
				jumpSent: false,
			};
			this.marker.style.display = "block";
			this.marker.style.left = `${event.clientX}px`;
			this.marker.style.top = `${event.clientY}px`;
			this.touchX = 0;
		} else if (!isLeft) {
			const touch = {
				x: event.clientX,
				y: event.clientY,
				at: this.time,
				action: false,
				multi: false,
			};
			this.rightTouches.set(event.pointerId, touch);
			if (this.rightTouches.size > 1) {
				for (const right of this.rightTouches.values()) right.multi = true;
				this._touchAction("pulse");
			}
		}
		try {
			event.target.setPointerCapture(event.pointerId);
		} catch {
			/* Detached canvas. */
		}
	}

	_pointerMove(event) {
		if (event.pointerType !== "touch") {
			if (Math.abs(event.movementX || 0) + Math.abs(event.movementY || 0) > 0)
				this._activity("mouse");
			this._pointerReport(event, "move");
			return;
		}
		if (this.leftTouch?.id === event.pointerId) {
			event.preventDefault();
			this._activity("touch");
			const dx = event.clientX - this.leftTouch.x;
			const dy = event.clientY - this.leftTouch.y;
			const horizontal = Math.max(-1, Math.min(1, dx / 62));
			this.touchX = Math.abs(horizontal) < 0.12 ? 0 : horizontal;
			this.markerThumb.style.transform = `translate(calc(-50% + ${Math.max(-35, Math.min(35, dx))}px), calc(-50% + ${Math.max(-25, Math.min(25, dy))}px))`;
			if (
				!this.leftTouch.jumpSent &&
				dy < -42 &&
				Math.abs(dy) > Math.abs(dx) * 0.8
			) {
				this._touchAction("jump");
				this.leftTouch.jumpSent = true;
			}
			if (dy > 48 && Math.abs(dy) > Math.abs(dx) * 1.4)
				this._touchAction("drop");
			return;
		}
		const right = this.rightTouches.get(event.pointerId);
		if (!right) return;
		event.preventDefault();
		this._activity("touch");
		if (right.action || right.multi) return;
		const dx = event.clientX - right.x;
		const dy = event.clientY - right.y;
		if (Math.abs(dx) > 34 && Math.abs(dx) > Math.abs(dy)) {
			this._touchAction("kick");
			right.action = true;
		} else if (Math.abs(dy) > 34) {
			this._touchAction(dy > 0 ? "drop" : "jump");
			right.action = true;
		}
	}

	_pointerUp(event, cancel = false) {
		this.pointers.delete(event.pointerId);
		this._activity(event.pointerType === "touch" ? "touch" : "mouse");
		if (event.pointerType !== "touch") {
			this._pointerReport(event, "up");
			return;
		}
		if (this.leftTouch?.id === event.pointerId) {
			this.leftTouch = null;
			this.touchX = 0;
			this.marker.style.display = "none";
			event.preventDefault();
		}
		const right = this.rightTouches.get(event.pointerId);
		if (right) {
			if (
				!cancel &&
				!right.action &&
				!right.multi &&
				this.time - right.at < 0.7
			)
				this._touchAction("jump");
			this.rightTouches.delete(event.pointerId);
			event.preventDefault();
		}
	}

	_touchAction(action) {
		this.touchUntil[action] = this.time + 0.18;
		this._activity("touch");
	}

	// For a contextual on-screen action; the standard touch gestures use the same path.
	trigger(action) {
		if (action in this.touchUntil) this._touchAction(action);
	}

	_axis(value) {
		const number = Number.isFinite(value) ? value : 0;
		if (Math.abs(number) < 0.22) return 0;
		return (
			Math.max(-1, Math.min(1, (Math.abs(number) - 0.22) / 0.78)) *
			Math.sign(number)
		);
	}

	_readPads() {
		let pads;
		try {
			pads = navigator.getGamepads?.() || [];
		} catch {
			pads = [];
		}
		const connected = Array.from(pads)
			.filter((pad) => pad && pad.connected !== false)
			.slice(0, 2);
		const result = [];
		for (const pad of connected) {
			const down = (index) =>
				Boolean(
					pad.buttons?.[index]?.pressed ||
						Number(pad.buttons?.[index]?.value) > 0.5,
				);
			const buttons = Array.from({ length: 17 }, (_, index) => down(index));
			const axes = Array.from(
				{ length: Math.max(4, pad.axes?.length || 0) },
				(_, index) => this._axis(pad.axes?.[index]),
			);
			const prior = this.padStates.get(pad.index) || {
				buttons: Array(17).fill(false),
				axes: [0, 0, 0, 0],
			};
			const changed =
				buttons.some((value, index) => value !== prior.buttons[index]) ||
				axes.some(
					(value, index) => Math.abs(value - (prior.axes[index] || 0)) > 0.07,
				);
			if (changed) this._activity("gamepad");
			const rising = (index) => buttons[index] && !prior.buttons[index];
			if (rising(9)) {
				if (this.menu) this.options.onMenu?.("back");
				else this.options.onPause?.();
			}
			if (this.menu) {
				if (rising(0)) this.options.onMenu?.("confirm");
				if (rising(1)) this.options.onMenu?.("back");
			}
			result.push({
				x: buttons[14] ? -1 : buttons[15] ? 1 : axes[0],
				y: buttons[12] ? -1 : buttons[13] ? 1 : axes[1],
				jump: buttons[0],
				kick: buttons[2],
				pulse: buttons[3],
				drop: buttons[1],
			});
			// Keep the activity baseline steady until movement is large enough to count.
			this.padStates.set(pad.index, {
				buttons,
				axes: changed ? axes : prior.axes,
			});
		}
		const liveIndices = new Set(connected.map((pad) => pad.index));
		for (const index of this.padStates.keys())
			if (!liveIndices.has(index)) this.padStates.delete(index);
		return result;
	}

	_gamepadMenu(pads) {
		const pad = pads.find(
			(item) => Math.abs(item.x) > 0.45 || Math.abs(item.y) > 0.45,
		);
		let direction = null;
		if (pad)
			direction =
				Math.abs(pad.y) >= Math.abs(pad.x)
					? pad.y < 0
						? "up"
						: "down"
					: pad.x < 0
						? "left"
						: "right";
		if (!direction) {
			this.menuDirection = null;
			return;
		}
		if (direction !== this.menuDirection) {
			this.menuDirection = direction;
			this.menuRepeatAt = this.time + 0.38;
			this.options.onMenu?.(direction);
		} else if (this.time >= this.menuRepeatAt) {
			this.menuRepeatAt = this.time + 0.135;
			this.options.onMenu?.(direction);
		}
	}

	poll(dt = 1 / 60, isMenu = false) {
		if (this.disposed) return [EMPTY_INPUT(), EMPTY_INPUT()];
		this.time += Math.max(0, Math.min(0.1, Number(dt) || 0));
		this.menu = Boolean(isMenu);
		const pads = this._readPads();
		this.active =
			this.keys.size > 0 ||
			this.pointers.size > 0 ||
			[...this.padStates.values()].some(
				(pad) =>
					pad.buttons.some(Boolean) ||
					pad.axes.some((value) => Math.abs(value) > 0),
			);
		if (this.menu) {
			this.keyLatch = [EMPTY_INPUT(), EMPTY_INPUT()];
			this._gamepadMenu(pads);
			return [EMPTY_INPUT(), EMPTY_INPUT()];
		}
		this.menuDirection = null;
		const any = (...codes) => codes.some((code) => this.keys.has(code));
		const action = (seat, name, ...codes) =>
			this.keyLatch[seat][name] ||
			codes.some(
				(code) => this.keys.has(code) && !this.suppressedActionKeys.has(code),
			);
		const first = {
			x: Number(any("KeyD", "ArrowRight")) - Number(any("KeyA", "ArrowLeft")),
			jump: action(0, "jump", "Space", "KeyW", "ArrowUp"),
			kick: action(0, "kick", "KeyX", "KeyJ"),
			drop: action(0, "drop", "KeyS", "ArrowDown"),
			pulse: action(0, "pulse", "ShiftLeft", "ShiftRight", "KeyK"),
		};
		const second = {
			x: Number(any("KeyH")) - Number(any("KeyF")),
			jump: action(1, "jump", "KeyT"),
			kick: action(1, "kick", "KeyR"),
			drop: action(1, "drop", "KeyG"),
			pulse: action(1, "pulse", "KeyY"),
		};
		this.keyLatch = [EMPTY_INPUT(), EMPTY_INPUT()];
		if (this.touchX !== 0) first.x = this.touchX;
		for (const action of ["jump", "kick", "drop", "pulse"])
			first[action] ||= this.touchUntil[action] > this.time;
		for (let i = 0; i < pads.length; i++) {
			const target = i === 0 ? first : second;
			if (Math.abs(pads[i].x) > Math.abs(target.x)) target.x = pads[i].x;
			for (const action of ["jump", "kick", "drop", "pulse"])
				target[action] ||= pads[i][action];
		}
		return [first, second];
	}

	clear() {
		for (const code of this.keys)
			if (KEY_ACTIONS[code]) this.suppressedActionKeys.add(code);
		this.keys.clear();
		this.pointers.clear();
		this.active = false;
		this.keyLatch = [EMPTY_INPUT(), EMPTY_INPUT()];
		this.leftTouch = null;
		this.rightTouches.clear();
		this.touchX = 0;
		this.touchUntil = { jump: 0, kick: 0, drop: 0, pulse: 0 };
		this.menuDirection = null;
		if (this.marker) this.marker.style.display = "none";
	}

	dispose() {
		this.disposed = true;
		this.clear();
		for (const remove of this.listeners) remove();
		this.listeners.length = 0;
		this.marker?.remove();
	}
}
