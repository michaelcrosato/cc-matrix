(() => {
	const preset = {
		up: ["KeyW", "ArrowUp", "Pad12"],
		down: ["KeyS", "ArrowDown", "Pad13"],
		left: ["KeyA", "ArrowLeft", "Pad14"],
		right: ["KeyD", "ArrowRight", "Pad15"],
		confirm: ["Enter", "Pad0"],
		cancel: ["Escape", "Backspace", "Pad1"],
		start: ["Enter", "Pad9"],
		pause: ["Escape", "KeyP", "Pad9"],
		fire: ["Mouse0", "KeyJ", "Pad7"],
		focus: ["Mouse2", "KeyQ", "Pad6"],
		interact: ["KeyE", "Pad0"],
		dash: ["Space", "Pad1"],
		sprint: ["ShiftLeft", "ShiftRight", "Pad10"],
		map: ["Tab", "Pad3"],
		quiver: ["KeyR", "Pad2"],
	};
	class ExpeditionInput {
		constructor(game, getSim, isBlocked, onActivity) {
			this.game = game;
			this.getSim = getSim;
			this.isBlocked = isBlocked;
			this.onActivity = onActivity;
			this.sequence = 0;
			this.touch = {
				pointers: new Map(),
				move: [0, 0],
				aim: null,
				focus: false,
				events: [],
				lastTap: 0,
			};
			game.input.touchEnabled = false;
			game.input.touchButtons([]);
			const canvas = game.screen.canvas;
			if (!canvas) return;
			for (const type of [
				"pointerdown",
				"pointermove",
				"pointerup",
				"pointercancel",
			])
				canvas.addEventListener(type, (e) => this.pointer(e), {
					capture: true,
					passive: false,
					signal: game._abort?.signal,
				});
			addEventListener("blur", () => this.clear(), {
				signal: game._abort?.signal,
			});
			document.addEventListener(
				"visibilitychange",
				() => {
					if (document.hidden) this.clear();
				},
				{ signal: game._abort?.signal },
			);
			canvas.addEventListener("contextmenu", (e) => e.preventDefault(), {
				signal: game._abort?.signal,
			});
		}
		pointer(e) {
			if (e.pointerType !== "touch" || this.isBlocked()) return;
			e.preventDefault();
			e.stopImmediatePropagation();
			this.onActivity?.("touch");
			this.game.input.lastDevice = "touch";
			const t = this.touch,
				now = performance.now();
			if (e.type === "pointerdown") {
				const rect = e.currentTarget.getBoundingClientRect(),
					side = e.clientX < rect.left + rect.width * 0.48 ? "left" : "right";
				if ([...t.pointers.values()].some((p) => p.side === side)) return;
				t.pointers.set(e.pointerId, {
					side,
					x: e.clientX,
					y: e.clientY,
					cx: e.clientX,
					cy: e.clientY,
					time: now,
				});
				e.currentTarget.setPointerCapture(e.pointerId);
				if (side === "left" && now - t.lastTap < 300) t.events.push("dash");
				if (side === "left") t.lastTap = now;
			}
			const p = t.pointers.get(e.pointerId);
			if (!p) return;
			p.cx = e.clientX;
			p.cy = e.clientY;
			const dx = p.cx - p.x,
				dy = p.cy - p.y,
				length = Math.hypot(dx, dy),
				scale = Math.min(1, length / 58) / (length || 1);
			if (e.type === "pointermove") {
				if (p.side === "left") t.move = [dx * scale, dy * scale];
				else if (length > 10) t.aim = [dx / (length || 1), dy / (length || 1)];
			}
			if (e.type === "pointerup" || e.type === "pointercancel") {
				if (p.side === "left") t.move = [0, 0];
				else {
					if (e.type === "pointerup") t.events.push("fire");
					t.focus = false;
				}
				t.pointers.delete(e.pointerId);
			}
		}
		clear() {
			this.touch.pointers.clear();
			this.touch.move = [0, 0];
			this.touch.aim = null;
			this.touch.focus = false;
			this.touch.events = [];
			for (const input of this.game.players) input.clear();
		}
		sample(input, playerId) {
			const game = this.game,
				sim = this.getSim(),
				state = sim.state,
				p = state.players.find((p) => p.id === playerId);
			if (!p) return null;
			if (this.isBlocked() || input.padLost)
				return { mx: 0, my: 0, actions: [] };
			const isTouch = input === game.input && input.lastDevice === "touch",
				touch = this.touch;
			const m = isTouch ? touch.move : input.move(),
				ground = game.view.screenDirToGround(m[0], m[1]);
			let aim = null,
				focus = input.down("focus");
			if (isTouch) {
				if (touch.aim) aim = game.view.screenDirToGround(...touch.aim);
				const right = [...touch.pointers.values()].find(
					(x) => x.side === "right",
				);
				focus = !!right && performance.now() - right.time > 240;
			} else if (input.padAim)
				aim = game.view.screenDirToGround(...input.padAim);
			else if (input.lastDevice === "mouse") {
				const at = game.mouseGround();
				if (at) aim = [at[0] - p.x, at[1] - p.y];
			}
			if (!aim && (isTouch || game.settings.aimAssist)) {
				const cave = sim.getCave(),
					launch = cave?.bankLaunch;
				if (
					launch &&
					!state.flags.bankLesson &&
					Math.hypot(p.x - launch.x, p.y - launch.y) < (launch.radius || 32)
				) {
					const bank = cave.banks.find((b) => b.lesson),
						gong = state.enemies.find(
							(e) => e.kind === "target" && e.requiresBank,
						);
					if (bank && gong) {
						const [a, b] = [bank.a, bank.b],
							dx = b[0] - a[0],
							dy = b[1] - a[1],
							u =
								((gong.x - a[0]) * dx + (gong.y - a[1]) * dy) /
								(dx * dx + dy * dy),
							mirror = [
								2 * (a[0] + u * dx) - gong.x,
								2 * (a[1] + u * dy) - gong.y,
							],
							ray = [mirror[0] - p.x, mirror[1] - p.y];
						if (DTGeometry.segmentBank(p.x, p.y, ray[0], ray[1], bank, 0))
							aim = ray;
					}
				}
			}
			if (!aim && (isTouch || game.settings.aimAssist)) {
				const enemies = state.enemies.filter(
					(e) =>
						e.hp > 0 &&
						e.kind !== "ooze" &&
						e.kind !== "target" &&
						sim.isVisible(e.x, e.y),
				);
				enemies.sort(
					(a, b) =>
						Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y),
				);
				const nearest = enemies[0];
				if (nearest && Math.hypot(nearest.x - p.x, nearest.y - p.y) < 120)
					aim = [nearest.x - p.x, nearest.y - p.y];
			}
			if (aim) {
				const length = Math.hypot(...aim) || 1;
				aim = aim.map((v) => v / length);
			}
			const actions = [];
			for (const action of ["fire", "interact", "dash", "quiver"])
				if (input.pressed(action))
					actions.push({ id: ++this.sequence, type: action });
			if (isTouch)
				for (const type of touch.events.splice(0))
					actions.push({ id: ++this.sequence, type });
			if (
				input.lastDevice === "mouse" &&
				actions.some((a) => a.type === "fire")
			) {
				const at = game.mouseGround(),
					near = state.pickups.find(
						(item) =>
							!item.taken &&
							at &&
							Math.hypot(item.x - at[0], item.y - at[1]) < 13 &&
							Math.hypot(item.x - p.x, item.y - p.y) < 26,
					);
				if (near) actions.find((a) => a.type === "fire").type = "interact";
			}
			if (isTouch && game.settings.dodgeAssist && p.dashCooldown <= 0) {
				const threat = state.enemies.find(
					(e) =>
						e.hp > 0 &&
						(e.state === "attack" ||
							(e.state === "windup" && e.timer < 0.25)) &&
						Math.hypot(e.x - p.x, e.y - p.y) < 75 &&
						sim.isVisible(e.x, e.y),
				);
				if (threat) {
					const side =
						(p.x - threat.x) * -Math.sin(threat.attackDir) +
							(p.y - threat.y) * Math.cos(threat.attackDir) >=
						0
							? 1
							: -1;
					ground[0] = -Math.sin(threat.attackDir) * side;
					ground[1] = Math.cos(threat.attackDir) * side;
					actions.push({ id: ++this.sequence, type: "dash" });
				}
			}
			return {
				mx: ground[0],
				my: ground[1],
				...(aim ? { ax: aim[0], ay: aim[1] } : {}),
				focus,
				sprint: input.down("sprint"),
				heldInteract: input.down("interact"),
				actions,
			};
		}
	}
	globalThis.DTInput = { preset, ExpeditionInput };
})();
