/* Canonical actions use the native input and saved bindings. Touch adds one
   pointer-owned stick, taps, and a deliberately chosen contextual interaction. */
(() => {
	window.PP ||= {};
	const PP = window.PP;
	const E = window.My3D2dge;
	const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
	const PRESET = {
		up: ["KeyW", "ArrowUp", "Pad12"],
		down: ["KeyS", "ArrowDown", "Pad13"],
		left: ["KeyA", "ArrowLeft", "Pad14"],
		right: ["KeyD", "ArrowRight", "Pad15"],
		jump: ["Space", "Pad0"],
		chop: ["KeyJ", "Mouse0", "Pad2"],
		redirect: ["KeyQ", "Mouse2", "Pad7"],
		interact: ["KeyE", "Pad3"],
		start: ["Enter", "Pad9"],
		pause: ["Escape", "Pad9"],
		confirm: ["Enter", "Space", "Pad0"],
		cancel: ["Escape", "Backspace", "Pad1"],
	};
	const neutral = () => ({
		mx: 0,
		my: 0,
		jump: false,
		jumpHeld: false,
		chop: false,
		redirect: false,
		interact: false,
		interactHeld: false,
		aim: 0,
	});
	PP.Input = class {
		constructor(game, callbacks = {}) {
			this.game = game;
			this.callbacks = callbacks;
			this.settings = { glyphs: "playstation", deadzone: 0.22 };
			this.device = "keyboard";
			this.menu = true;
			this.sim = null;
			this.localId = null;
			this.enabled = true;
			this._clock = 0;
			this._intents = new Map();
			this._native = new Set();
			this._pads = new Map();
			this._controllerLost = new Set();
			this._lastPadIndices = new Map();
			this._axisActive = new Set();
			this._touches = new Map();
			this._touch = {
				id: null,
				x: 0,
				y: 0,
				ox: 0,
				oy: 0,
				jump: false,
				jumpHeld: false,
				action: false,
				target: null,
				heldTarget: null,
				pressTarget: null,
			};
			this._mouseAim = 0;
			this._consumeUntil = 0;
			this._abort = new AbortController();
			this._installNative(game.input);
			const signal = this._abort.signal;
			const listen = (target, name, fn, opts = {}) =>
				target?.addEventListener(name, fn, { signal, ...opts });
			listen(
				window,
				"keydown",
				(e) => {
					if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
					const typing = e.target?.matches?.(
						"input:not([type=range]):not([type=checkbox]), textarea, select, [contenteditable=true]",
					);
					if (typing) return;
					if (this._activity("keyboard", "key", { code: e.code, event: e })) {
						e.preventDefault();
						e.stopImmediatePropagation();
					}
				},
				{ capture: true },
			);
			listen(
				window,
				"pointerdown",
				(e) => {
					const device = e.pointerType === "touch" ? "touch" : "keyboard";
					if (this._activity(device, "pointer", { event: e })) {
						e.preventDefault();
						e.stopImmediatePropagation();
					}
				},
				{ capture: true },
			);
			listen(window, "blur", () => this.clear());
			listen(document, "visibilitychange", () => {
				if (document.hidden) this.clear();
			});
			this.canvas = game.screen?.canvas || document.getElementById("screen");
			if (this.canvas) {
				this.canvas.style.touchAction = "none";
				listen(this.canvas, "pointerdown", (e) => this._touchDown(e), {
					capture: true,
				});
				listen(this.canvas, "pointermove", (e) => this._touchMove(e), {
					capture: true,
				});
				listen(this.canvas, "contextmenu", (e) => e.preventDefault());
				listen(this.canvas, "pointerdown", (e) => {
					if (
						e.pointerType !== "mouse" ||
						e.button !== 0 ||
						this.menu ||
						!this.sim
					)
						return;
					const target = this._worldTargetAt(e.clientX, e.clientY);
					if (target) {
						this._worldInteract(target);
						this._worldClickHeld = true;
						this._mouseTarget = { ...target };
						this.game.input.suppressCode("Mouse0");
					}
				});
			}
			listen(window, "pointerup", (e) => {
				this._touchUp(e);
				if (e.pointerType === "mouse") {
					this._worldClickHeld = false;
					this._mouseTarget = null;
				}
			});
			listen(window, "pointercancel", (e) => this._touchUp(e));
			this.bubble = document.getElementById("context-action");
			if (!this.bubble) {
				this.bubble = document.createElement("button");
				this.bubble.id = "context-action";
				this.bubble.type = "button";
				this.bubble.hidden = true;
				this.bubble.setAttribute("aria-label", "Contextual action");
				document.body.appendChild(this.bubble);
				this._madeBubble = true;
			}
			Object.assign(this.bubble.style, { touchAction: "none" });
			listen(this.bubble, "pointerdown", (e) => {
				if (e.pointerType !== "touch" && e.pointerType !== "pen") return;
				e.preventDefault();
				e.stopPropagation();
				if (this.menu || !this.contextTarget) return;
				this._touch.action = true;
				this._touch.heldTarget = { ...this.contextTarget };
				this._touch.pressTarget = { ...this.contextTarget };
				this._touches.set(e.pointerId, "action");
				this.bubble.setPointerCapture?.(e.pointerId);
			});
			listen(this.bubble, "click", (e) => {
				e.preventDefault();
				if (this.contextTarget && !this.menu && this.device !== "touch")
					this._worldInteract(this.contextTarget);
			});
			this.hint = document.getElementById("touch-hint");
		}
		_installNative(input) {
			if (!input || this._native.has(input)) return;
			input.use(
				input.half && E?.Input?.halfKeys
					? E.Input.halfKeys(PRESET, input.half)
					: PRESET,
			);
			input.names = {
				jump: "Jump",
				chop: "Chop",
				redirect: "Redirect",
				interact: "Door / rescue",
				up: "Climb up",
				down: "Duck / climb down",
				left: "Move left",
				right: "Move right",
			};
			input.touchEnabled = false;
			input.touchFilter = () => false;
			input.glyphs = this.settings.glyphs;
			this._native.add(input);
		}
		_activity(device, type, extra = {}) {
			this.device = device;
			const input = this.game.input;
			input.lastDevice = device === "pad" ? "gamepad" : device;
			const consumed =
				this.callbacks.onActivity?.({ device, type, ...extra }) === true;
			if (consumed) {
				this.clear();
				this._consumeUntil = this._clock + 0.15;
			}
			if (device === "touch" && this.hint && !this._touchShown) {
				this._touchShown = true;
				this._hintUntil = this._clock + 7;
				this.hint.hidden = false;
			}
			return consumed;
		}
		_touchDown(e) {
			if (e.pointerType !== "touch" && e.pointerType !== "pen") return;
			if (this.menu || !this.enabled || this._clock < this._consumeUntil)
				return;
			e.preventDefault();
			e.stopImmediatePropagation();
			const rect = this.canvas.getBoundingClientRect();
			if (
				e.clientX - rect.left < rect.width * 0.47 &&
				this._touch.id === null
			) {
				Object.assign(this._touch, {
					id: e.pointerId,
					ox: e.clientX,
					oy: e.clientY,
					x: 0,
					y: 0,
				});
				this._touches.set(e.pointerId, "stick");
			} else {
				this._touch.jump = true;
				this._touch.jumpHeld = true;
				this._touches.set(e.pointerId, "jump");
			}
			this.canvas.setPointerCapture?.(e.pointerId);
		}
		_touchMove(e) {
			if (e.pointerId !== this._touch.id) return;
			e.preventDefault();
			e.stopImmediatePropagation();
			const radius = Math.max(34, Math.min(62, innerWidth * 0.095));
			let x = (e.clientX - this._touch.ox) / radius,
				y = (e.clientY - this._touch.oy) / radius;
			const len = Math.hypot(x, y);
			if (len < 0.14) x = y = 0;
			else if (len > 1) {
				x /= len;
				y /= len;
			}
			this._touch.x = x;
			this._touch.y = y;
		}
		_touchUp(e) {
			const action = this._touches.get(e.pointerId);
			if (!action) return;
			this._touches.delete(e.pointerId);
			if (action === "stick") {
				this._touch.id = null;
				this._touch.x = this._touch.y = 0;
			}
			if (action === "jump")
				this._touch.jumpHeld = [...this._touches.values()].includes("jump");
			if (action === "action") {
				this._touch.action = false;
				this._touch.heldTarget = null;
			}
		}
		setContext(sim) {
			this.sim = sim;
		}
		_miner(id = 1) {
			const ownedId = id === 1 && this.localId != null ? this.localId : id;
			return (
				this.sim?.miners?.find((m) => m.id === ownedId) || this.sim?.miners?.[0]
			);
		}
		_nearestContext() {
			const sim = this.sim,
				miner = this._miner(),
				h = miner?.hero;
			if (!sim || !h || miner.downed) return null;
			const dist = (x, z) => Math.hypot(x - h.x, z - h.z);
			const fallen = sim.miners.find(
				(m) =>
					m.downed &&
					m.id !== miner.id &&
					Math.abs(m.hero.x - h.x) < 36 &&
					Math.abs(m.hero.z - h.z) < 28,
			);
			if (fallen)
				return {
					kind: "rescue",
					id: fallen.id,
					label: "✚ HOLD TO RESCUE",
					symbol: "✚",
				};
			const door = sim.room?.doors?.find(
				(d) =>
					dist(d.x, d.z) < 36 &&
					Math.abs(d.z - h.z) < 22 &&
					(Math.abs(d.x - h.x) < 8 ||
						Math.sign(d.x - h.x) === (miner.facing || 1)),
			);
			if (door)
				return {
					kind: "door",
					id: door.id,
					label:
						sim.keyOwner != null
							? `⚿ OPEN ${door.name || "DOOR"}`
							: "⚿ NEED A KEY",
					symbol: door.symbol,
				};
			const rock = sim.rocks?.find(
				(b) =>
					miner.tool > 0 &&
					Math.abs(b.x - h.x) < 74 &&
					Math.abs(b.z - h.z - 14) < 48,
			);
			if (rock)
				return {
					kind: "redirect",
					id: rock.id,
					label: "↗ REDIRECT",
					symbol: "↗",
				};
			return null;
		}
		_worldTargetAt(cx, cy) {
			const target = this._nearestContext();
			if (!target || target.kind === "redirect") return null;
			const miner =
				target.kind === "rescue"
					? this.sim.miners.find((m) => m.id === target.id)?.hero
					: this.sim.room.doors.find((d) => d.id === target.id);
			const r = this.game.r;
			if (!miner || !r?.w || !this.canvas) return null;
			const [sx, sy] = r.w(miner.x, 0, miner.z + 16);
			const point = this.game.input.screenPoint(cx, cy);
			return point && Math.hypot(point[0] - sx, point[1] - sy) < 42
				? target
				: null;
		}
		_worldInteract(target) {
			if (!target) return;
			if (this.callbacks.onWorldInteract?.(target) === true) return;
			if (target.kind === "redirect") this.game.input.tap("redirect");
			else this.game.input.tap("interact");
		}
		update(dt) {
			this._clock += dt;
			if (this.hint && this._hintUntil && this._clock > this._hintUntil)
				this.hint.hidden = true;
			const players = this.game.players?.length
				? this.game.players
				: [this.game.input];
			for (const input of players) {
				this._installNative(input);
				input.glyphs = this.settings.glyphs === "xbox" ? "xbox" : "playstation";
				input.deadzone = clamp(
					Number(this.settings.deadzone) || 0.22,
					0.12,
					0.7,
				);
			}
			const pads = (() => {
				try {
					return [...(navigator.getGamepads?.() || [])].filter(Boolean);
				} catch {
					return [];
				}
			})();
			for (const pad of pads) {
				const previous = this._pads.get(pad.index) || {
					buttons: [],
					axis: false,
				};
				const chord = !!pad.buttons[8]?.pressed;
				const buttons = pad.buttons.map(
					(b, i) => !!b.pressed && !(chord && i === 9),
				);
				const axis = Math.hypot(pad.axes[0] || 0, pad.axes[1] || 0) > 0.45;
				if (
					buttons.some((b, i) => b && !previous.buttons[i]) ||
					(axis && !previous.axis)
				)
					this._activity("pad", "gamepad", { index: pad.index });
				this._pads.set(pad.index, { buttons, axis });
			}
			this._intents.clear();
			for (let i = 0; i < players.length; i++) {
				const input = players[i];
				const previousPad = this._lastPadIndices.get(input);
				const transferred =
					previousPad != null &&
					players.some((other) => other !== input && other.pad === previousPad);
				if (input.padLost && !transferred && !this._controllerLost.has(i)) {
					this._controllerLost.add(i);
					this.clear();
					this.callbacks.onPause?.({ reason: "disconnect", player: i + 1 });
				} else if (!input.padLost || transferred)
					this._controllerLost.delete(i);
				this._lastPadIndices.set(input, input.padIndex);
				if (this._clock < this._consumeUntil || !this.enabled) {
					this._intents.set(i + 1, neutral());
					continue;
				}
				if (this.menu) {
					for (const a of ["up", "down", "left", "right"])
						if (input.repeat(a, 0.34, 0.14))
							this.callbacks.onMenu?.({ action: a, player: i + 1 });
					if (input.pressed("confirm") || input.pressed("start")) {
						this.callbacks.onMenu?.({ action: "accept", player: i + 1 });
						input.consumeAll();
					} else if (input.pressed("cancel") || input.pressed("pause")) {
						this.callbacks.onMenu?.({ action: "back", player: i + 1 });
						input.consumeAll();
					}
					this._intents.set(i + 1, neutral());
					continue;
				}
				if (input.pressed("pause")) {
					this.callbacks.onPause?.({ reason: "player", player: i + 1 });
					input.consumeAll();
					this._intents.set(i + 1, neutral());
					continue;
				}
				const move = input.move();
				const miner = this._miner(i + 1);
				let aim = move[1] < -0.25 ? -1 : move[1] > 0.25 ? 1 : 0;
				if (
					i === 0 &&
					this.device === "keyboard" &&
					input.mouse?.active &&
					input.aimSource === "mouse"
				) {
					const pt = input.pointer?.(),
						h = miner?.hero,
						r = this.game.r;
					if (pt && h && r?.w) {
						const [, py] = r.w(h.x, 0, h.z + 18);
						aim = pt[1] < py - 16 ? -1 : pt[1] > py + 16 ? 1 : 0;
					}
				}
				const intent = {
					mx: Math.abs(move[0]) > 0.1 ? move[0] : 0,
					my:
						input.held?.has("Pad1") && !miner?.hero?.climbing
							? 1
							: Math.abs(move[1]) > 0.2
								? move[1]
								: 0,
					jump: input.pressed("jump"),
					jumpHeld: input.down("jump"),
					chop: input.down("chop") && !(i === 0 && this._worldClickHeld),
					redirect: input.pressed("redirect"),
					interact: input.pressed("interact"),
					interactHeld:
						input.down("interact") ||
						(i === 0 &&
							this._worldClickHeld &&
							this._mouseTarget?.kind === "rescue"),
					aim,
				};
				if (i === 0 && this.device === "touch") {
					intent.mx = this._touch.x;
					intent.my = this._touch.y;
					intent.jump = this._touch.jump;
					intent.jumpHeld = this._touch.jumpHeld;
					intent.chop =
						miner?.tool > 0 &&
						this._touch.y < 0.55 &&
						!!this.sim?.rocks?.some(
							(b) =>
								Math.abs(b.x - (miner.hero.x + (miner.facing || 1) * 18)) <
									60 && Math.abs(b.z - miner.hero.z - 14) < 26,
						);
					intent.aim = this._touch.y < -0.3 ? -1 : this._touch.y > 0.3 ? 1 : 0;
					const target = this._touch.heldTarget || this._touch.pressTarget;
					const edge = !!this._touch.pressTarget;
					if (target && (this._touch.action || edge)) {
						if (target.kind === "redirect") intent.redirect = edge;
						else {
							intent.interact = edge;
							intent.interactHeld = this._touch.action;
						}
					}
				}
				this._intents.set(i + 1, intent);
			}
			this._touch.jump = false;
			this._touch.pressTarget = null;
			const stable = this._touch.heldTarget;
			this.contextTarget = stable || this._nearestContext();
			if (this.bubble) {
				this.bubble.hidden =
					this.menu || this.device !== "touch" || !this.contextTarget;
				if (this.contextTarget) {
					this.bubble.textContent = this.contextTarget.label;
					this.bubble.dataset.target = String(this.contextTarget.id);
					this.bubble.dataset.kind = this.contextTarget.kind;
				}
			}
		}
		intent(id = 1) {
			return { ...(this._intents.get(id) || neutral()) };
		}
		label(action) {
			if (action === "duck") action = "down";
			if (action === "move")
				return this.device === "pad"
					? "L / D-PAD"
					: this.device === "touch"
						? "LEFT THUMB"
						: "A D / ← →";
			if (action === "climb")
				return this.device === "pad"
					? "L ↑↓"
					: this.device === "touch"
						? "LEFT THUMB ↑↓"
						: "W S / ↑ ↓";
			if (this.device === "touch")
				return (
					{
						jump: "TAP RIGHT",
						chop: "AUTO CHOP",
						redirect: "↗ ACTION",
						interact: "ACTION",
						down: "THUMB DOWN",
						pause: "Ⅱ",
					}[action] || action
				);
			return this.game.input.label(
				action,
				this.device === "pad" ? "gamepad" : "keyboard",
			);
		}
		clear() {
			for (const input of this.game.players || [this.game.input]) input.clear();
			this._intents.clear();
			this._touches.clear();
			this._worldClickHeld = false;
			this._mouseTarget = null;
			Object.assign(this._touch, {
				id: null,
				x: 0,
				y: 0,
				jump: false,
				jumpHeld: false,
				action: false,
				target: null,
				heldTarget: null,
				pressTarget: null,
				actionSpent: false,
			});
		}
		dispose() {
			this.clear();
			this._abort.abort();
			if (this._madeBubble) this.bubble?.remove();
		}
	};
	PP.Input.PRESET = PRESET;
	PP.Input.neutral = neutral;
})();
