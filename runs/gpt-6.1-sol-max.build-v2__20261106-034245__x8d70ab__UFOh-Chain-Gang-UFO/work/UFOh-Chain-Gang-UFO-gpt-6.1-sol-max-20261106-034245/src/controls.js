import { sanitizeIntent } from "./simulation.js";
export function createControls(app) {
	const { game } = app;
	const touches = new Map();
	let lastPointer = null,
		mouseAim = false,
		touchUsed = false,
		autoShot = -10,
		rescueAssist = 0;
	const meaningful = (event) => app.activity(event);
	function intent(index = 0) {
		const local = app.hub?.active || index === 0,
			input = app.hub?.active ? game.input : game.players[index] || game.input,
			p = app.world?.state.players[index];
		if (!p) return sanitizeIntent();
		let [mx, my] = input.move(),
			aim = null,
			fire = input.down("fire") || input.pressed("fire");
		if (input.padAim && Math.hypot(...input.padAim) > 0.1)
			aim = Math.atan2(input.padAim[1], input.padAim[0]);
		else if (local && mouseAim && input.lastDevice !== "gamepad") {
			const q = game.mouseGround();
			if (q) aim = Math.atan2(q[1] - p.y, q[0] - p.x);
		}
		if (local && touchUsed) {
			let right = false;
			for (const point of touches.values()) {
				const dx = point.x - point.sx,
					dy = point.y - point.sy,
					d = Math.hypot(dx, dy);
				if (point.side === "left") {
					mx = dx / 48;
					my = dy / 48;
				} else if (d > 9) {
					right = true;
					aim = Math.atan2(dy, dx);
					if (
						point.burstAt === null ||
						app.world.state.t - point.burstAt >= 3.6
					)
						point.burstAt = app.world.state.t;
					fire = app.world.state.t - point.burstAt < 0.35;
				} else point.burstAt = null;
			}
			if (!right && game.settings.touchAssist) {
				const s = app.world.state;
				let target = s.enemies
					.filter((e) => !e.dead && !e.entry && e.arm <= 0)
					.sort(
						(a, b) =>
							Math.hypot(a.x - p.x, a.y - p.y) -
							Math.hypot(b.x - p.x, b.y - p.y),
					)[0];
				if (s.boss)
					target = s.boss.components.find((c) => c.open && c.hp > 0) || target;
				if (target) {
					aim = Math.atan2(target.y - p.y, target.x - p.x);
					const delta = Math.abs(
						Math.atan2(Math.sin(aim - p.bearing), Math.cos(aim - p.bearing)),
					);
					const teachingRam =
						s.wave === 0 &&
						s.mode === "mission" &&
						s.tutorial.shots > 0 &&
						s.tutorial.rams === 0;
					const safe =
						!s.enemies.some(
							(e) => !e.entry && Math.hypot(e.x - p.x, e.y - p.y) < 105,
						) &&
						!s.shots.some(
							(b) => b.foe && Math.hypot(b.x - p.x, b.y - p.y) < 110,
						);
					if (
						!teachingRam &&
						safe &&
						p.shield <= 0 &&
						s.t - autoShot > 3.4 &&
						delta < 0.16
					) {
						fire = true;
						autoShot = s.t;
					}
				}
			}
			if (rescueAssist > 0) {
				const target = app.world.state.players.find((q) => q.active && q.down);
				if (target) {
					const d = Math.hypot(target.x - p.x, target.y - p.y) || 1;
					mx = (target.x - p.x) / d;
					my = (target.y - p.y) / d;
					fire = false;
				}
				rescueAssist -= 1 / 120;
			}
		}
		return sanitizeIntent({ mx, my, aim, fire, seq: app.world.state.tick + 1 });
	}
	function cancelTouch() {
		touches.clear();
		touchUsed = false;
		rescueAssist = 0;
	}
	function clear() {
		cancelTouch();
		mouseAim = false;
		autoShot = -10;
		for (const q of game.players) q.clear();
	}
	function raw(e) {
		if (app.hub?.ended) {
			e.preventDefault();
			e.stopImmediatePropagation();
			return;
		}
		if (e.type === "pointermove" && e.pointerType !== "touch") {
			if (
				lastPointer &&
				Math.hypot(e.clientX - lastPointer[0], e.clientY - lastPointer[1]) < 4
			)
				return;
			lastPointer = [e.clientX, e.clientY];
			mouseAim = true;
		}
		if (e.type === "pointerdown") mouseAim = e.pointerType !== "touch";
		if (
			e.type === "keydown" &&
			[
				"ShiftLeft",
				"ShiftRight",
				"ControlLeft",
				"ControlRight",
				"AltLeft",
				"AltRight",
				"MetaLeft",
				"MetaRight",
			].includes(e.code)
		)
			return;
		if (meaningful(e)) {
			e.preventDefault();
			e.stopImmediatePropagation();
			return;
		}
		if (
			e.type === "keydown" &&
			app.entryActive &&
			!e.repeat &&
			/^[a-zA-Z0-9 ]$/.test(e.key)
		) {
			app.typeName(e.key);
			e.preventDefault();
			e.stopImmediatePropagation();
		}
	}
	function touch(e) {
		if (e.pointerType !== "touch") return;
		if (app.attract) {
			if (meaningful(e)) {
				e.preventDefault();
				e.stopImmediatePropagation();
			}
			return;
		}
		if (game.sceneName !== "play" || game.shell?.screen || app.hub?.ended)
			return;
		touchUsed = true;
		mouseAim = false;
		game.input.lastDevice = "touch";
		if (e.type === "pointerdown") {
			const rc = game.screen.canvas.getBoundingClientRect(),
				side = e.clientX - rc.left < rc.width * 0.5 ? "left" : "right";
			if (![...touches.values()].some((p) => p.side === side))
				touches.set(e.pointerId, {
					side,
					sx: e.clientX,
					sy: e.clientY,
					x: e.clientX,
					y: e.clientY,
					burstAt: null,
				});
			try {
				game.screen.canvas.setPointerCapture(e.pointerId);
			} catch {}
		} else if (e.type === "pointermove") {
			const p = touches.get(e.pointerId);
			if (p) {
				p.x = e.clientX;
				p.y = e.clientY;
			}
		} else touches.delete(e.pointerId);
		e.preventDefault();
		e.stopImmediatePropagation();
		meaningful(e);
	}
	let button = null;
	if (!game.headless) {
		const signal = game._abort?.signal;
		for (const ev of [
			"keydown",
			"pointerdown",
			"pointermove",
			"wheel",
			"touchstart",
		])
			window.addEventListener(ev, raw, {
				capture: true,
				passive: false,
				signal,
			});
		for (const ev of [
			"pointerdown",
			"pointermove",
			"pointerup",
			"pointercancel",
			"lostpointercapture",
		])
			game.screen.canvas.addEventListener(ev, touch, {
				capture: true,
				passive: false,
				signal,
			});
		window.addEventListener("blur", clear, { signal });
		document.addEventListener(
			"visibilitychange",
			() => {
				if (document.hidden) clear();
			},
			{ signal },
		);
		button = document.createElement("button");
		button.id = "rescue-action";
		button.textContent = "RESCUE";
		button.hidden = true;
		button.setAttribute("aria-label", "Rescue wingmate with ready shield");
		document.body.appendChild(button);
		button.addEventListener(
			"pointerdown",
			(e) => {
				e.preventDefault();
				e.stopPropagation();
				rescueAssist = 0.9;
			},
			{ signal },
		);
	}
	function update() {
		if (!button) return;
		const s = app.world?.state,
			p = app.hub?.active
				? s?.players.find((p) => p.id === app.hub.localId)
				: s?.players[0];
		button.hidden = !(
			touchUsed &&
			game.sceneName === "play" &&
			!game.shell?.screen &&
			p &&
			!p.down &&
			p.shield <= 0 &&
			s.players.some(
				(q) => q.active && q.down && Math.hypot(q.x - p.x, q.y - p.y) < 160,
			)
		);
	}
	return {
		intent,
		clear,
		cancelTouch,
		update,
		get touches() {
			return touches.size;
		},
		get touchUsed() {
			return touchUsed;
		},
		get mouseAim() {
			return mouseAim;
		},
	};
}
