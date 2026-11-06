export function installInput(game, app) {
	const I = game.input,
		canvas = document.getElementById("screen");
	I.steer = "drag";
	I.touchButtons([]);
	let pointerTarget = null,
		lastPointer = null,
		touchId = null,
		touchX = 0,
		wasTouchX = 0,
		touchTarget = 0,
		brake = false,
		lastPad = "",
		wakePointer = null,
		wakeClickUntil = 0;
	const activity = (kind, e) => {
		const waking = app.mode === "attract";
		app.activity(kind);
		if (waking) {
			if (e?.type === "pointerdown") {
				wakePointer = e.pointerId;
				wakeClickUntil = performance.now() + 900;
			}
			I.clear();
			e?.preventDefault();
			e?.stopImmediatePropagation();
			return true;
		}
		return false;
	};
	const listen = (type, fn, opt = {}) =>
		addEventListener(type, fn, { ...opt, signal: game._abort?.signal });
	listen(
		"pointerup",
		(e) => {
			if (e.pointerId === wakePointer) {
				e.preventDefault();
				e.stopImmediatePropagation();
				wakeClickUntil = performance.now() + 600;
			}
		},
		{ capture: true },
	);
	listen(
		"click",
		(e) => {
			if (
				performance.now() < wakeClickUntil &&
				(e.pointerId === undefined || e.pointerId === wakePointer)
			) {
				e.preventDefault();
				e.stopImmediatePropagation();
				wakePointer = null;
				wakeClickUntil = 0;
			}
		},
		{ capture: true },
	);
	const pointerX = (e) => {
		const p = game.screen.clientToScreen(e.clientX, e.clientY);
		return game.view.toGround(p[0], p[1])[0];
	};
	listen(
		"keydown",
		(e) => {
			if (activity("keyboard", e)) return;
			if (["ArrowLeft", "ArrowRight", "KeyA", "KeyD"].includes(e.code))
				pointerTarget = null;
		},
		{ capture: true },
	);
	listen(
		"pointerdown",
		(e) => {
			const touch = e.pointerType === "touch";
			if (activity(touch ? "touch" : "mouse", e)) return;
			if (e.target !== canvas) return;
			if (!app.audio.unlocked) app.audio.unlock();
			if (touch) {
				if (touchId === null) {
					touchId = e.pointerId;
					touchX = e.clientX;
					wasTouchX = touchX;
					touchTarget =
						app.world?.players.find((p) => String(p.id) === String(app.localId))
							?.x || 0;
				}
			} else if (e.button === 0) pointerTarget = pointerX(e);
		},
		{ capture: true },
	);
	listen(
		"pointermove",
		(e) => {
			if (e.pointerType === "touch") {
				if (e.pointerId === touchId) touchX = e.clientX;
				return;
			}
			const changed =
				!lastPointer ||
				Math.hypot(e.clientX - lastPointer[0], e.clientY - lastPointer[1]) > 5;
			if (changed) {
				if (activity("mouse", e)) return;
				if (e.target === canvas) pointerTarget = pointerX(e);
				lastPointer = [e.clientX, e.clientY];
			}
			if (!lastPointer) lastPointer = [e.clientX, e.clientY];
		},
		{ capture: true },
	);
	const release = (e) => {
		if (e.pointerId === touchId) {
			touchId = null;
			touchX = wasTouchX = 0;
		}
	};
	listen("pointerup", release);
	listen("pointercancel", release);
	canvas.addEventListener("contextmenu", (e) => e.preventDefault());
	const clear = () => {
		I.clear();
		app.latestAction = { move: 0, fire: false, brake: false };
		app.pendingNetworkBrake = false;
		pointerTarget = null;
		touchId = null;
		touchX = wasTouchX = 0;
	};
	listen("blur", () => {
		clear();
		if (!app.net?.started && app.mode === "run") {
			game.pause("focus");
		} else app.net?.sendAction({ move: 0, fire: false, brake: false });
	});
	listen("gamepaddisconnected", () => {
		clear();
		if (!app.net?.started && app.mode === "run") game.pause("controller");
	});
	return {
		clear,
		pressBrake() {
			brake = true;
		},
		update() {
			const pads = Array.from(navigator.getGamepads?.() || []).filter(Boolean);
			if (
				pads.some(
					(p) =>
						p.axes.some((a) => Math.abs(a) > 0.2) ||
						p.buttons.some((b) => b.pressed),
				)
			)
				app.lastActivity = game.real;
			const data = pads
				.flatMap((p) => [
					p.index,
					...p.axes.map((x) => (Math.abs(x) > 0.2 ? Math.round(x * 10) : 0)),
					...p.buttons.map((b) => (b.pressed ? 1 : 0)),
				])
				.join(",");
			if (data !== lastPad) {
				if (
					pads.some(
						(p) =>
							p.axes.some((a) => Math.abs(a) > 0.2) ||
							p.buttons.some((b) => b.pressed),
					)
				)
					activity("gamepad");
				lastPad = data;
			}
		},
		action() {
			const m = I.move()[0];
			if (Math.abs(m) > 0.06) pointerTarget = null;
			const me = app.world?.players.find((p) => p.id === app.localId);
			const touch = touchId !== null;
			let target = pointerTarget;
			if (touch && me) {
				const rect = canvas.getBoundingClientRect();
				touchTarget = Math.max(
					-445,
					Math.min(
						445,
						touchTarget + ((touchX - wasTouchX) * game.W) / rect.width,
					),
				);
				target = touchTarget;
				wasTouchX = touchX;
			}
			const frame = {
				move: touch ? 0 : m,
				fire: I.down("fire") || app.settings.autoFire || touch,
				brake: brake || I.pressed("brake"),
			};
			if (target !== null) frame.targetX = target;
			brake = false;
			return frame;
		},
		prompts() {
			const d = app.device;
			if (d === "touch") return "DRAG TO SLIDE · AUTO FIRE";
			if (d === "gamepad")
				return `L / D-PAD  SLIDE     ${I.label("fire")}  FIRE     ${I.label("brake")}  BRAKE`;
			return `${I.label("left")} / ${I.label("right")}  SLIDE     ${I.label("fire")}  FIRE     ${I.label("brake")}  BRAKE`;
		},
	};
}
