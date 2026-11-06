// Keyboard, standard gamepads, and invisible multitouch controls share one state.
const gameplayMode = (mode) =>
	mode === "play" ||
	mode === "playing" ||
	mode === "game" ||
	mode === "attract";
const emptyPlayer = () => ({
	x: 0,
	jump: false,
	action: false,
	jumpPressed: false,
	actionPressed: false,
});
const deadzone = (value) =>
	Math.abs(value || 0) < 0.18
		? 0
		: Math.sign(value) * Math.min(1, (Math.abs(value) - 0.18) / 0.82);
// Sliders use the same menu navigation as buttons: up/down changes focus,
// left/right changes their value through the menu callback.
const editable = (target) =>
	target?.matches?.(
		'input:not([type="range"]),textarea,select,[contenteditable="true"]',
	);

export class Input {
	constructor({
		onActivity = () => {},
		onPause = () => {},
		onMenu = () => {},
		onJoin = () => {},
	} = {}) {
		this.onActivity = onActivity;
		this.onPause = onPause;
		this.onMenu = onMenu;
		this.onJoin = onJoin;
		this.mode = "menu";
		this.lastType = "keyboard";
		this.glyphStyle = "ps";
		this.localCoop = false;
		this.isTouch = Boolean(
			globalThis.matchMedia?.("(pointer: coarse)").matches ||
				navigator.maxTouchPoints > 0,
		);
		this.keys = new Set();
		this.pads = [emptyPlayer(), emptyPlayer()];
		this.players = [emptyPlayer(), emptyPlayer()];
		this.previousPlayers = [emptyPlayer(), emptyPlayer()];
		this.pending = [
			{ jump: false, action: false },
			{ jump: false, action: false },
		];
		this.padPrevious = new Map();
		this.touchPoints = new Map();
		this.touchAction = false;
		this.menuRepeat = { direction: "", next: 0 };
		this.keyboardRepeat = new Map();
		this.listeners = [];
		this._listen(window, "keydown", (event) => this._keyDown(event));
		this._listen(window, "keyup", (event) => {
			this.keys.delete(event.code);
			this.keyboardRepeat.delete(event.code);
		});
		this._listen(window, "blur", () => this.clear());
		this._listen(document, "visibilitychange", () => {
			if (document.hidden) this.clear();
		});
		this._listen(window, "pointerdown", (event) => this._pointerDown(event), {
			passive: false,
		});
		this._listen(window, "pointermove", (event) => this._pointerMove(event), {
			passive: false,
		});
		this._listen(window, "pointerup", (event) => this._pointerUp(event), {
			passive: false,
		});
		this._listen(window, "pointercancel", (event) => this._pointerUp(event), {
			passive: false,
		});
		this._listen(window, "gamepadconnected", () => {
			this._activity("gamepad");
		});
		this._syncTouchUI();
	}

	_listen(target, type, handler, options) {
		target.addEventListener(type, handler, options);
		this.listeners.push(() =>
			target.removeEventListener(type, handler, options),
		);
	}

	_activity(type) {
		this.lastType = type;
		if (type === "touch") this.isTouch = true;
		this._syncTouchUI();
		this.onActivity(type);
	}

	_syncTouchUI() {
		const controls = document.getElementById("touch-controls");
		if (controls) {
			controls.classList.toggle(
				"active",
				this.isTouch && gameplayMode(this.mode),
			);
			controls.dataset.input = this.lastType;
		}
		document.documentElement.dataset.input = this.lastType;
	}

	_keyDown(event) {
		if (editable(event.target)) {
			if (event.code === "Escape") {
				event.target.blur?.();
				this._activity("keyboard");
				this.onMenu("back");
			}
			return;
		}
		const controlled = [
			"ArrowLeft",
			"ArrowRight",
			"ArrowUp",
			"ArrowDown",
			"Space",
			"KeyW",
			"KeyA",
			"KeyS",
			"KeyD",
			"KeyE",
			"KeyX",
			"KeyJ",
			"KeyL",
			"KeyI",
			"KeyO",
			"Enter",
			"Escape",
			"KeyP",
		];
		if (!controlled.includes(event.code)) {
			if (!event.repeat) this._activity("keyboard");
			return;
		}
		event.preventDefault();
		this.keys.add(event.code);
		if (!event.repeat) this._activity("keyboard");
		if (event.code === "Escape" || event.code === "KeyP") {
			if (!event.repeat) {
				if (gameplayMode(this.mode)) this.onPause();
				else this.onMenu("back");
			}
			return;
		}
		if (gameplayMode(this.mode)) {
			if (!event.repeat) {
				if (["Space", "KeyW", "ArrowUp"].includes(event.code))
					this.pending[0].jump = true;
				if (["KeyE", "KeyX"].includes(event.code))
					this.pending[0].action = true;
				if (this.localCoop && event.code === "KeyI")
					this.pending[1].jump = true;
				if (this.localCoop && event.code === "KeyO")
					this.pending[1].action = true;
			}
			if (event.code === "Enter" && !event.repeat && !this.localCoop)
				this.onJoin();
			return;
		}
		const actions = {
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
		const action = actions[event.code];
		if (!action) return;
		if (action === "confirm" && event.repeat) return;
		const now = performance.now();
		const previous = this.keyboardRepeat.get(event.code) || -1000;
		if (!event.repeat || now - previous >= 150) {
			this.keyboardRepeat.set(event.code, now);
			this.onMenu(action);
		}
	}

	_pointerDown(event) {
		if (event.pointerType !== "touch") {
			this._activity("mouse");
			return;
		}
		this._activity("touch");
		const target = event.target;
		const menu = target.closest?.("#touch-menu");
		const thump = target.closest?.("#touch-thump");
		if (menu) {
			event.preventDefault();
			this.onPause();
			return;
		}
		if (!gameplayMode(this.mode)) return;
		// Let menu buttons, developer sliders, and dialogs retain their normal behavior.
		if (
			!thump &&
			target.closest?.('button,input,select,textarea,[role="dialog"]')
		)
			return;
		event.preventDefault();
		const role = thump
			? "action"
			: event.clientX < window.innerWidth * 0.5
				? "move"
				: "jump";
		this.touchPoints.set(event.pointerId, {
			role,
			startX: event.clientX,
			x: event.clientX,
			y: event.clientY,
		});
		// A quick tap can start and end between animation frames. Keep its action
		// until the next input sample, while holds continue through touchPoints.
		if (role === "jump") this.pending[0].jump = true;
		if (role === "action") this.pending[0].action = true;
		try {
			target.setPointerCapture?.(event.pointerId);
		} catch {}
		if (thump) this.touchAction = true;
	}

	_pointerMove(event) {
		if (event.pointerType !== "touch") {
			// Browser-generated touch mouse events do not steal touch prompts.
			if (
				event.pointerType === "mouse" &&
				Math.abs(event.movementX) + Math.abs(event.movementY) > 1
			)
				this._activity("mouse");
			return;
		}
		const point = this.touchPoints.get(event.pointerId);
		if (!point) return;
		event.preventDefault();
		point.x = event.clientX;
		point.y = event.clientY;
	}

	_pointerUp(event) {
		const point = this.touchPoints.get(event.pointerId);
		if (!point) return;
		event.preventDefault();
		this.touchPoints.delete(event.pointerId);
		this.touchAction = [...this.touchPoints.values()].some(
			(p) => p.role === "action",
		);
	}

	setMode(mode) {
		if (this.mode !== mode) {
			this.menuRepeat = { direction: "", next: 0 };
			this.touchPoints.clear();
			this.touchAction = false;
		}
		this.mode = mode;
		this._syncTouchUI();
	}
	setLocalCoop(value) {
		this.localCoop = Boolean(value);
	}
	setGlyphStyle(style) {
		this.glyphStyle = style === "xbox" ? "xbox" : "ps";
	}
	get glyphs() {
		return this.glyphStyle;
	}
	set glyphs(value) {
		this.setGlyphStyle(value);
	}

	update() {
		this.pads = [emptyPlayer(), emptyPlayer()];
		let gamepads = [];
		try {
			gamepads = Array.from(navigator.getGamepads?.() || [])
				.filter((p) => p && p.connected !== false)
				.slice(0, 2);
		} catch {}
		const now = performance.now();
		let menuDirection = "";
		gamepads.forEach((pad, slot) => {
			const buttons = Array.from(pad.buttons || [], (b) =>
				Boolean(typeof b === "number" ? b > 0.5 : b?.pressed || b?.value > 0.5),
			);
			const axes = Array.from(pad.axes || []);
			const old = this.padPrevious.get(pad.index ?? slot) || {
				buttons: [],
				axes: [],
			};
			const pressed = (i) => buttons[i] && !old.buttons[i];
			const changedButton = buttons.some((b, i) => b && !old.buttons[i]);
			const changedAxis = axes.some(
				(a, i) => Math.abs(a) > 0.25 && Math.abs(a - (old.axes[i] || 0)) > 0.08,
			);
			if (changedButton || changedAxis) this._activity("gamepad");
			let x = deadzone(axes[0] || 0);
			if (buttons[14]) x = -1;
			if (buttons[15]) x = 1;
			this.pads[slot] = {
				x,
				jump: Boolean(buttons[0]),
				action: Boolean(buttons[2]),
				jumpPressed: pressed(0),
				actionPressed: pressed(2),
			};
			if (pressed(9)) {
				if (gameplayMode(this.mode)) this.onPause();
				else this.onMenu("back");
			}
			if (slot === 1 && !this.localCoop && pressed(0)) this.onJoin();
			if (!gameplayMode(this.mode) && slot === 0) {
				if (pressed(0)) this.onMenu("confirm");
				if (pressed(1)) this.onMenu("back");
				const y = deadzone(axes[1] || 0);
				menuDirection =
					buttons[12] || y < -0.5
						? "up"
						: buttons[13] || y > 0.5
							? "down"
							: x < -0.5
								? "left"
								: x > 0.5
									? "right"
									: "";
			}
			this.padPrevious.set(pad.index ?? slot, { buttons, axes });
		});
		if (!gameplayMode(this.mode) && menuDirection) {
			if (this.menuRepeat.direction !== menuDirection) {
				this.onMenu(menuDirection);
				this.menuRepeat = { direction: menuDirection, next: now + 340 };
			} else if (now >= this.menuRepeat.next) {
				this.onMenu(menuDirection);
				this.menuRepeat.next = now + 155;
			}
		} else this.menuRepeat = { direction: "", next: 0 };
		const key = (code) => this.keys.has(code);
		const kx1 =
			Number(key("KeyD") || key("ArrowRight")) -
			Number(key("KeyA") || key("ArrowLeft"));
		const kx2 = Number(key("KeyL")) - Number(key("KeyJ"));
		let touchX = 0,
			touchJump = false;
		for (const point of this.touchPoints.values()) {
			if (point.role === "move")
				touchX = Math.max(
					-1,
					Math.min(
						1,
						(point.x - point.startX) /
							Math.max(32, Math.min(70, window.innerWidth * 0.09)),
					),
				);
			if (point.role === "jump") touchJump = true;
		}
		const p1 = {
			x: touchX || kx1 || this.pads[0].x,
			jump:
				key("Space") ||
				key("KeyW") ||
				key("ArrowUp") ||
				this.pads[0].jump ||
				touchJump ||
				this.pending[0].jump,
			action:
				key("KeyE") ||
				key("KeyX") ||
				this.pads[0].action ||
				this.touchAction ||
				this.pending[0].action,
		};
		const p2 = this.localCoop
			? {
					x: kx2 || this.pads[1].x,
					jump: key("KeyI") || this.pads[1].jump || this.pending[1].jump,
					action: key("KeyO") || this.pads[1].action || this.pending[1].action,
				}
			: emptyPlayer();
		this.players = [p1, p2].map((p, i) => ({
			...p,
			jumpPressed: p.jump && !this.previousPlayers[i].jump,
			actionPressed: p.action && !this.previousPlayers[i].action,
		}));
		this.previousPlayers = this.players.map((p) => ({ ...p }));
		this.pending = [
			{ jump: false, action: false },
			{ jump: false, action: false },
		];
		return this.players;
	}

	getPlayers() {
		return this.players.map((p) => ({ ...p }));
	}

	getPrompt(action) {
		if (this.lastType === "gamepad") {
			const map =
				this.glyphStyle === "xbox"
					? {
							jump: "A",
							action: "X",
							confirm: "A",
							back: "B",
							pause: "☰",
							move: "L",
							join: "A",
						}
					: {
							jump: "✕",
							action: "□",
							confirm: "✕",
							back: "○",
							pause: "OPTIONS",
							move: "L",
							join: "✕",
						};
			return map[action] || action;
		}
		if (this.lastType === "touch")
			return (
				{
					jump: "TAP / HOLD RIGHT",
					action: "THUMP",
					confirm: "TAP",
					back: "BACK",
					pause: "MENU",
					move: "DRAG LEFT",
					join: "JOIN",
				}[action] || action
			);
		return (
			{
				jump: "SPACE",
				action: "E",
				confirm: "ENTER",
				back: "ESC",
				pause: "ESC",
				move: "A / D",
				join: "ENTER",
			}[action] || action
		);
	}

	clear() {
		this.keys.clear();
		this.touchPoints.clear();
		this.touchAction = false;
		this.players = [emptyPlayer(), emptyPlayer()];
		this.previousPlayers = [emptyPlayer(), emptyPlayer()];
		this.pending = [
			{ jump: false, action: false },
			{ jump: false, action: false },
		];
		this.pads = [emptyPlayer(), emptyPlayer()];
		this.menuRepeat = { direction: "", next: 0 };
	}
	dispose() {
		this.clear();
		this.listeners.forEach((remove) => remove());
		this.listeners = [];
	}
}
