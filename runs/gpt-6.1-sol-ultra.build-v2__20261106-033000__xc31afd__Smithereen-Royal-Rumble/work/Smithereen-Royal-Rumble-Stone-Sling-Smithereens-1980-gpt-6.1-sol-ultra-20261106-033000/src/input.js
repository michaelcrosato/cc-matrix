const DEAD_ZONE = 0.55;
const MENU_REPEAT_DELAY = 0.32;
const MENU_REPEAT_RATE = 0.12;
const keyDefaults = {
	fire1: "Space",
	fire2: "ShiftRight",
	prev1: "KeyQ",
	next1: "KeyE",
	prev2: "KeyU",
	next2: "KeyO",
};
const formTarget = (target) => target?.closest?.("input,textarea,select");

export function createInput(E, game, app, ui, view) {
	const abort = new AbortController();
	const signal = abort.signal;
	const held = [null, null];
	const keyboard = new Set();
	const pointers = new Map();
	const pads = new Map();
	const blockedPadButtons = new Set();
	let lastScreen = app.screen,
		lastPointer = null,
		meaningfulPad = null;
	const canvas =
		game.screen?.canvas ||
		(typeof document !== "undefined" ? document.querySelector("canvas") : null);
	const now = () => game.real || performance.now() / 1000;
	const ended = () => !!(app.hubEnded || app.online?.ended);
	const menu = () => app.screen !== "play";
	const settings = () => Object.assign({}, keyDefaults, app.settings);
	const living = () => !ended() && app.world?.phase === "play";
	const play = () => !menu() && living() && app.mode !== "attract";
	const feedback = (device) => {
		app.device = device;
		app.idle = 0;
		if (game.input)
			game.input.lastDevice = device === "pad" ? "gamepad" : device;
	};
	const absorbAttract = (device, e) => {
		if (app.mode !== "attract") return false;
		feedback(device);
		clear();
		app.title();
		e?.preventDefault?.();
		e?.stopImmediatePropagation?.();
		return true;
	};
	const keySeat = (seat) =>
		app.mode !== "local"
			? seat === 0
			: app.settings[`seat${seat + 1}`] === "keyboard";
	const localSeat = (seat) => (app.mode === "hub" ? app.hubSeat : seat);
	const eligible = (seat) =>
		seat != null &&
		seat >= 0 &&
		seat < 2 &&
		living() &&
		!app.world.players[seat]?.ai;
	const command = (seat, cmd) => {
		const target = localSeat(seat);
		if (!eligible(target)) return false;
		return app.command(target, cmd);
	};
	function begin(seat, source) {
		if (!play() || !eligible(localSeat(seat)) || held[seat]) return;
		held[seat] = source;
		command(seat, { type: "begin" });
	}
	function release(seat, source) {
		if (held[seat] !== source) return;
		held[seat] = null;
		if (play()) command(seat, { type: "release" });
		else command(seat, { type: "cancel" });
	}
	function cancel(seat) {
		held[seat] = null;
		command(seat, { type: "cancel" });
	}
	function stone(seat, delta) {
		if (!play()) return;
		const p = app.world.players[localSeat(seat)];
		if (!p) return;
		const available = app.world.available || [0, 1, 2];
		const index = available.indexOf(p.stone);
		command(seat, {
			type: "stone",
			stone: available[(index + delta + available.length) % available.length],
		});
	}
	function clear() {
		// A lost input cancels; it must never count as a release.
		for (let seat = 0; seat < (app.mode === "hub" ? 1 : 2); seat++) {
			if (
				held[seat] ||
				app.world?.players?.[localSeat(seat)]?.charge ||
				app.world?.players?.[localSeat(seat)]?.buffer
			)
				cancel(seat);
			held[seat] = null;
		}
		for (const id of pointers.keys()) {
			try {
				canvas?.releasePointerCapture(id);
			} catch {}
		}
		pointers.clear();
		keyboard.clear();
		for (const [id, p] of pads)
			p.buttons.forEach((down, button) => {
				if (down) blockedPadButtons.add(`${id}:${button}`);
			});
	}
	function keydown(e) {
		if (ended()) {
			e.preventDefault();
			e.stopImmediatePropagation();
			return;
		}
		if (formTarget(e.target) && !app.rebinding) return;
		if (absorbAttract("keyboard", e)) return;
		feedback("keyboard");
		app.audio?.unlock?.();
		if (app.rebinding) {
			if (!e.repeat) ui.rebind(e.code);
			e.preventDefault();
			e.stopImmediatePropagation();
			return;
		}
		if (
			e.repeat &&
			![
				"ArrowUp",
				"ArrowDown",
				"ArrowLeft",
				"ArrowRight",
				"KeyW",
				"KeyA",
				"KeyS",
				"KeyD",
			].includes(e.code)
		) {
			e.preventDefault();
			e.stopImmediatePropagation();
			return;
		}
		const already = keyboard.has(e.code);
		keyboard.add(e.code);
		const s = settings();
		const consumed = new Set([
			"Space",
			"Escape",
			"Enter",
			"ArrowUp",
			"ArrowDown",
			"ArrowLeft",
			"ArrowRight",
			"KeyW",
			"KeyA",
			"KeyS",
			"KeyD",
			"KeyC",
			...Object.values(s).filter(
				(v) => typeof v === "string" && /^(Key|Shift|Space)/.test(v),
			),
		]);
		if (consumed.has(e.code)) {
			e.preventDefault();
			e.stopImmediatePropagation();
		}
		if (menu()) {
			if (
				already &&
				![
					"ArrowUp",
					"ArrowDown",
					"ArrowLeft",
					"ArrowRight",
					"KeyW",
					"KeyA",
					"KeyS",
					"KeyD",
				].includes(e.code)
			)
				return;
			if (e.code === "Escape" || e.code === "KeyC") ui.back();
			else if (e.code === "Enter" || e.code === "Space") ui.confirm();
			else if (e.code === "ArrowUp" || e.code === "KeyW") ui.navigate(-1);
			else if (e.code === "ArrowDown" || e.code === "KeyS") ui.navigate(1);
			else if (e.code === "ArrowLeft" || e.code === "KeyA") ui.adjust(-1);
			else if (e.code === "ArrowRight" || e.code === "KeyD") ui.adjust(1);
			return;
		}
		if (e.code === "Escape") {
			clear();
			app.pause();
			return;
		}
		if (e.code === "KeyC") {
			cancel(0);
			return;
		}
		if (!play() || already) return;
		if (e.code === s.fire1 && keySeat(0)) begin(0, "key:" + e.code);
		else if (e.code === s.fire2 && app.mode === "local" && keySeat(1))
			begin(1, "key:" + e.code);
		else if (e.code === s.prev1 && keySeat(0)) stone(0, -1);
		else if (e.code === s.next1 && keySeat(0)) stone(0, 1);
		else if (e.code === s.prev2 && app.mode === "local" && keySeat(1))
			stone(1, -1);
		else if (e.code === s.next2 && app.mode === "local" && keySeat(1))
			stone(1, 1);
		else if (e.code === "ArrowLeft" || e.code === "ArrowRight") {
			app.pointerWorld ||= {
				x: app.mode === "hub" && app.hubSeat === 1 ? 95 : 545,
				z: 85,
			};
			app.pointerWorld.x = Math.max(
				0,
				Math.min(640, app.pointerWorld.x + (e.code === "ArrowLeft" ? -8 : 8)),
			);
		}
	}
	function keyup(e) {
		const s = settings();
		keyboard.delete(e.code);
		if (ended()) return;
		if (e.code === s.fire1) release(0, "key:" + e.code);
		if (e.code === s.fire2) release(1, "key:" + e.code);
	}
	const worldPoint = (e) => {
		const p = view.worldPoint?.(e.clientX, e.clientY);
		if (Array.isArray(p)) return { x: p[0], z: p[1] };
		return p || { x: (e.clientX / Math.max(1, innerWidth)) * 640, z: 80 };
	};
	function pointerdown(e) {
		if (ended()) {
			e.preventDefault();
			return;
		}
		const device = e.pointerType === "touch" ? "touch" : "mouse";
		if (absorbAttract(device, e)) return;
		feedback(device);
		app.audio?.unlock?.();
		if (formTarget(e.target)) return;
		if (menu()) {
			if (app.screen === "author" && !e.target?.closest?.(".esh-mod"))
				ui.selectWorldBlock?.(worldPoint(e));
			return;
		} // native Shell buttons own pointer picks
		if (!canvas || e.target !== canvas) return;
		e.preventDefault();
		const point = worldPoint(e);
		app.pointerWorld = point;
		if (e.button === 2) {
			cancel(0);
			return;
		}
		if (e.button !== 0 && device === "mouse") return;
		let seat = 0;
		if (device === "touch") {
			const target = localSeat(0);
			if (app.mode === "local") seat = point.x < 320 ? 0 : 1;
			else if (
				target === 1
					? point.x < 320 && e.clientY < innerHeight * 0.75
					: point.x > 320 && e.clientY < innerHeight * 0.75
			)
				return;
			// Context stone chips are drawn at the lower left / right of the battlefield.
			const chip = touchChip(e.clientX, e.clientY);
			if (chip) {
				stone(chip.seat, chip.delta);
				return;
			}
			if (app.mode === "local" && !keySeat(seat)) return;
		} else if (!keySeat(0)) return;
		const source = "pointer:" + e.pointerId;
		pointers.set(e.pointerId, { seat, source });
		try {
			canvas.setPointerCapture(e.pointerId);
		} catch {}
		begin(seat, source);
		app.touchPoint =
			device === "touch" ? { x: e.clientX, y: e.clientY, seat } : null;
	}
	function touchChip(x, y) {
		const chips = app.touchChips || [];
		return (
			chips.find(
				(chip) =>
					x >= chip.x &&
					x <= chip.x + chip.w &&
					y >= chip.y &&
					y <= chip.y + chip.h,
			) || null
		);
	}
	function pointerup(e) {
		const info = pointers.get(e.pointerId);
		pointers.delete(e.pointerId);
		if (info) release(info.seat, info.source);
		try {
			canvas?.releasePointerCapture(e.pointerId);
		} catch {}
		if (!pointers.size) app.touchPoint = null;
	}
	function pointercancel(e) {
		const info = pointers.get(e.pointerId);
		pointers.delete(e.pointerId);
		if (info) cancel(info.seat);
		app.touchPoint = null;
	}
	function pointermove(e) {
		if (ended()) return;
		if (
			!lastPointer ||
			Math.hypot(e.clientX - lastPointer.x, e.clientY - lastPointer.y) >= 3
		) {
			if (absorbAttract(e.pointerType === "touch" ? "touch" : "mouse", e)) {
				lastPointer = { x: e.clientX, y: e.clientY };
				return;
			}
			feedback(e.pointerType === "touch" ? "touch" : "mouse");
			lastPointer = { x: e.clientX, y: e.clientY };
		}
		if (e.target === canvas) app.pointerWorld = worldPoint(e);
	}
	function wheel(e) {
		if (ended()) return;
		if (absorbAttract("mouse", e)) return;
		feedback("mouse");
		if (e.target !== canvas || !play() || !keySeat(0)) return;
		e.preventDefault();
		stone(0, e.deltaY > 0 ? 1 : -1);
	}
	function focusLoss() {
		if (ended()) return;
		clear();
		if (
			app.screen === "play" &&
			app.mode !== "attract" &&
			(app.mode !== "hub" || (globalThis.AIHub?.time?.() ?? -1) >= 0)
		)
			app.pause();
	}
	const listen = (target, name, fn, opts = {}) =>
		target?.addEventListener(name, fn, { signal, ...opts });
	if (typeof window !== "undefined") {
		listen(window, "keydown", keydown, { capture: true });
		listen(window, "keyup", keyup, { capture: true });
		listen(window, "pointerdown", pointerdown, { capture: true });
		listen(window, "pointerup", pointerup, { capture: true });
		listen(window, "pointercancel", pointercancel, { capture: true });
		listen(window, "pointermove", pointermove, { capture: true });
		listen(window, "wheel", wheel, { passive: false, capture: true });
		listen(window, "contextmenu", (e) => {
			if (e.target === canvas) e.preventDefault();
		});
		listen(window, "blur", focusLoss);
		listen(document, "visibilitychange", () => {
			if (document.hidden) focusLoss();
		});
		listen(window, "gamepaddisconnected", (e) => disconnect(e.gamepad.index));
	}
	function padSeat(index) {
		if (app.mode !== "local") return 0;
		if (app.settings.seat1 === "pad" + index) return 0;
		if (app.settings.seat2 === "pad" + index) return 1;
		return null;
	}
	function disconnect(index) {
		const seat = padSeat(index);
		if (seat !== null) {
			cancel(seat);
			app.disconnectMessage = `Controller ${index + 1} disconnected. Reconnect it or change the seat in Settings.`;
			if (app.screen === "play" && app.mode !== "attract") app.pause();
		}
		pads.delete(index);
	}
	function padAction(index, button, down, previous, createHeld) {
		if (down === previous) return;
		const token = index + ":" + button;
		if (blockedPadButtons.has(token)) {
			if (!down) blockedPadButtons.delete(token);
			return;
		}
		if (down) {
			feedback("pad");
			meaningfulPad = index;
			app.audio?.unlock?.();
			if (absorbAttract("pad")) {
				blockedPadButtons.add(token);
				return;
			}
			if (menu()) {
				if (button === 0) ui.confirm();
				else if (button === 1) ui.back();
				else if (button === 12) ui.navigate(-1);
				else if (button === 13) ui.navigate(1);
				else if (button === 14) ui.adjust(-1);
				else if (button === 15) ui.adjust(1);
				else if (button === 9 && !createHeld) ui.back();
			} else {
				const seat = padSeat(index);
				if (seat === null) return;
				if (button === 0) begin(seat, "pad:" + index);
				else if (button === 1) cancel(seat);
				else if (button === 4) stone(seat, -1);
				else if (button === 5) stone(seat, 1);
				else if (button === 9 && !createHeld) {
					clear();
					app.pause();
				}
			}
		} else if (button === 0) {
			const seat = padSeat(index);
			if (seat !== null) release(seat, "pad:" + index);
		}
	}
	function update(dt) {
		if (lastScreen !== app.screen) {
			clear();
			lastScreen = app.screen;
		}
		if (ended()) return;
		const list =
			typeof navigator !== "undefined" && navigator.getGamepads
				? navigator.getGamepads()
				: [];
		const seen = new Set();
		for (const pad of list) {
			if (!pad?.connected) continue;
			seen.add(pad.index);
			const buttons = Array.from(
				pad.buttons,
				(b) => !!(b?.pressed || b?.value > 0.55),
			);
			const axes = Array.from(pad.axes || []);
			const previous = pads.get(pad.index) || {
				buttons: buttons.map(() => false),
				dir: null,
				repeatAt: 0,
			};
			for (let b = 0; b < buttons.length; b++)
				padAction(
					pad.index,
					b,
					buttons[b],
					previous.buttons[b] || false,
					buttons[8],
				);
			let dir =
				Math.abs(axes[1] || 0) > DEAD_ZONE
					? axes[1] < 0
						? "up"
						: "down"
					: Math.abs(axes[0] || 0) > DEAD_ZONE
						? axes[0] < 0
							? "left"
							: "right"
						: null;
			const changedDirection = dir !== previous.dir;
			if (dir && (changedDirection || now() >= previous.repeatAt)) {
				feedback("pad");
				if (absorbAttract("pad")) {
					dir = null;
				} else if (menu()) {
					if (dir === "up") ui.navigate(-1);
					else if (dir === "down") ui.navigate(1);
					else ui.adjust(dir === "left" ? -1 : 1);
				} else if (play() && (dir === "left" || dir === "right")) {
					const seat = localSeat(padSeat(pad.index));
					if (seat !== null) {
						app.pointerWorld ||= { x: seat === 0 ? 545 : 95, z: 85 };
						app.pointerWorld.x = Math.max(
							0,
							Math.min(640, app.pointerWorld.x + (dir === "left" ? -8 : 8)),
						);
					}
				}
				previous.repeatAt =
					now() + (changedDirection ? MENU_REPEAT_DELAY : MENU_REPEAT_RATE);
			}
			pads.set(pad.index, { buttons, dir, repeatAt: previous.repeatAt });
		}
		for (const index of pads.keys()) if (!seen.has(index)) disconnect(index);
		// Arrow holds move only the guidance reference; they never set shot power.
		if (play() && (keyboard.has("ArrowLeft") || keyboard.has("ArrowRight"))) {
			app.pointerWorld ||= { x: 545, z: 85 };
			app.pointerWorld.x = Math.max(
				0,
				Math.min(
					640,
					app.pointerWorld.x + (keyboard.has("ArrowLeft") ? -1 : 1) * 60 * dt,
				),
			);
		}
		if (app.disconnectMessage && seen.size) {
			const missing = [app.settings.seat1, app.settings.seat2]
				.filter((s) => s?.startsWith?.("pad"))
				.some((s) => !seen.has(Number(s.slice(3))));
			if (!missing) app.disconnectMessage = "";
		}
	}
	const api = {
		update,
		clear,
		dispose: () => {
			clear();
			abort.abort();
		},
		held,
		begin,
		release,
		cancel,
		stone,
		diagnostics: () => ({
			held: [...held],
			pointerCount: pointers.size,
			pads: [...pads.keys()],
			lastPad: meaningfulPad,
		}),
	};
	return api;
}
