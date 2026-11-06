/* Read-only ordinary-action campaign controller, sampled at network input cadence. */
(() => {
	"use strict";
	const H = 540;
	const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
	const wrap = (y) => ((y % H) + H) % H;
	const dy = (a, b) => wrap(a - b + H / 2) - H / 2;
	const distance = (a, b) => Math.hypot(a.x - b.x, dy(a.y, b.y));
	const zero = () => ({
		mx: 0,
		my: 0,
		ax: 1,
		ay: 0,
		fire: false,
		cannon: false,
	});
	function create(index = 0) {
		const memory = {
			sector: -1,
			fireAt: -10,
			lane: 270,
			evadeSign: 1,
			avoidSide: index ? -1 : 1,
			previousCharge: 0,
		};
		function action(w) {
			const p = w.players[index],
				core = w.core;
			if (!p || !p.alive || p.departed || w.mode !== "play") return zero();
			if (memory.sector !== w.sector) {
				memory.sector = w.sector;
				memory.fireAt = -10;
				memory.previousCharge = 0;
			}
			const speed = w.tuning.scoutSpeed,
				ready = p.charge >= w.tuning.chargeThreshold;
			const final = w.sector === 2 && core.hp === 1;
			let tx = p.x,
				ty = p.y,
				fire = true,
				cannon = false;
			let aimX = core.x,
				aimY = core.y;
			const own = w.cannons.find((c) => c.owner === index && c.life > 0);
			const evade = own || w.time - memory.fireAt < 1.5;
			const go = (x, y) => {
				tx = x;
				ty = wrap(y);
			};
			const shotTime = () =>
				w.tuning.cannonWindup +
				Math.max(
					0,
					(core.x - 30 + core.vx * w.tuning.cannonWindup) /
						(w.tuning.cannonSpeed - core.vx),
				);
			if (evade) {
				const lane = own ? own.y : memory.lane;
				go(p.x > 760 ? 875 : 570, lane + memory.evadeSign * 115);
			} else if (core.state === "phase-break") {
				go(index ? 570 : 610, index ? 405 : 135);
			} else if (!ready) {
				if (core.state === "dock") {
					go(core.x - 12, core.y);
					const cells = w.cells
						.filter(
							(c) =>
								c.alive && Math.abs(dy(c.y, core.y)) < 32 && c.x > p.x - 20,
						)
						.sort((a, b) => a.x - b.x);
					const cell = cells[0];
					if (cell && p.x < core.x - 45) {
						go(cell.x, cell.y);
						aimX = cell.x;
						aimY = cell.y;
						fire = false;
					}
				} else go(570, index ? 110 : 430);
			} else if (core.state === "dock" && !final) {
				const travel =
					w.tuning.cannonWindup + (core.x - 30) / w.tuning.cannonSpeed;
				const targetY =
					w.sector === 2 && core.hp === 2
						? wrap(core.dockY + Math.sin((w.sectorTime + travel) * 0.65) * 55)
						: core.y;
				const obstruction = w.cells
					.filter(
						(c) =>
							c.alive && c.x < core.x - 30 && Math.abs(dy(c.y, targetY)) < 19,
					)
					.sort((a, b) => a.x - b.x)[0];
				if (obstruction) {
					go(obstruction.x - 20, obstruction.y);
					aimX = obstruction.x;
					aimY = obstruction.y;
				} else {
					go(570, targetY);
					if (
						Math.abs(dy(p.y, targetY)) < 15 &&
						p.x > w.refuge.x + w.refuge.w + 15 &&
						core.timer > travel + 0.15
					)
						cannon = true;
				}
			} else if (core.state === "dock") {
				go(570, core.y + (index ? -90 : 90));
			} else if (
				core.state === "windup" ||
				core.state === "flight" ||
				core.state === "return"
			) {
				let time = shotTime();
				if (core.state === "windup") time = Math.max(0, time - core.timer);
				const targetY = wrap(core.y + core.vy * time);
				go(570, targetY);
				const clear = !w.cells.some(
					(c) =>
						c.alive && c.x < core.x - 30 && Math.abs(dy(c.y, targetY)) < 18,
				);
				if (
					Math.abs(dy(p.y, targetY)) < 16 &&
					p.x > w.refuge.x + w.refuge.w + 15 &&
					clear &&
					core.x > 200 &&
					(core.state !== "windup" || core.timer < 0.25)
				)
					cannon = true;
			}
			// Avoid every active gun lane, including the other scout's locked warning.
			for (const c of w.cannons) {
				const crossing = c.vx > 0 ? c.x < p.x + 35 : c.x > p.x - 35;
				if (crossing && Math.abs(dy(p.y, c.y)) < 65 && c.life > 0) {
					const side = dy(p.y, c.y) || memory.evadeSign;
					ty = wrap(c.y + Math.sign(side) * 115);
				}
			}
			// Steer away from a pursuer before contact. Keep full flight speed far from a goal.
			const danger = w.hazards
				.filter(
					(h) =>
						h.life > 0 &&
						!(
							w.refuge.active &&
							p.x >= w.refuge.x &&
							p.x <= w.refuge.x + w.refuge.w
						),
				)
				.map((h) => ({ h, d: distance(p, h) }))
				.sort((a, b) => a.d - b.d)[0];
			let avoidX = 0,
				avoidY = 0;
			if (danger && danger.d < 135) {
				const h = danger.h,
					rx = p.x - h.x,
					ry = dy(p.y, h.y),
					len = Math.hypot(rx, ry) || 1;
				const push = clamp((135 - len) / 60, 0, 2.3);
				avoidX += (rx / len) * push;
				avoidY += (ry / len) * push;
				// A tangent carries a scout around, rather than repeatedly approaching the same pursuer.
				const goalX = tx - p.x,
					goalY = dy(ty, p.y);
				const tangent = goalX * -ry + goalY * rx >= 0 ? 1 : -1;
				avoidX += (-ry / len) * 0.5 * tangent;
				avoidY += (rx / len) * 0.5 * tangent;
			}
			if (core.state === "flight" || core.state === "return") {
				const rx = p.x - core.x,
					ry = dy(p.y, core.y),
					d = Math.hypot(rx, ry);
				const future = {
					x: core.x + core.vx * 0.4,
					y: wrap(core.y + core.vy * 0.4),
				};
				if (d < 200 || distance(p, future) < 180) {
					const sign = ry ? Math.sign(ry) : memory.avoidSide;
					ty = wrap(p.y + sign * 180);
					tx = clamp(p.x + (p.x >= core.x ? 80 : -80), 85, 900);
					// Commit to an interception when its locked rail shot can arrive before contact.
					if (cannon && core.x > 250) {
						tx = p.x;
						ty = wrap(p.y + sign * 160);
					}
				}
			}
			// A critically damped target approach remains stable with 100–150ms held input.
			let mx = clamp((tx - p.x - p.vx * 0.1) / (speed * 0.3), -1, 1) + avoidX;
			let my =
				clamp((dy(ty, p.y) - p.vy * 0.1) / (speed * 0.3), -1, 1) + avoidY;
			const m = Math.hypot(mx, my);
			if (m > 1) {
				mx /= m;
				my /= m;
			}
			if (cannon && w.time - memory.fireAt > 1.8) {
				memory.fireAt = w.time;
				memory.lane = p.y;
				const sign = dy(p.y, core.y);
				memory.evadeSign =
					Math.abs(sign) > 10 ? Math.sign(sign) : index ? -1 : 1;
				mx = 0;
				my = memory.evadeSign;
			} else cannon = false;
			const dx = aimX - p.x,
				ddy = dy(aimY, p.y),
				len = Math.hypot(dx, ddy) || 1;
			return { mx, my, ax: dx / len, ay: ddy / len, fire, cannon };
		}
		return { action, memory };
	}
	globalThis.RuinServerPilot = { create };
})();
