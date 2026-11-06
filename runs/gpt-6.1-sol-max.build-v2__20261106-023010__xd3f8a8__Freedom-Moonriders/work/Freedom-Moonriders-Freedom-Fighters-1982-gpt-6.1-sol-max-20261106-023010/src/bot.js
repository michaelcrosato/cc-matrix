/* Observation-driven pilot. Used by isolated attract and the action-driven regression run. */
(function (root) {
	"use strict";
	const F = root.Moonriders;
	F.pilot = (sim) => {
		const s = sim.s,
			p = s.ship,
			target = sim.target() || { x: p.x + 300, y: 135 },
			b = sim.balance;
		if (s.outcome) return { ...F.NEUTRAL };
		let goal = { ...target },
			aim = [p.aimX, p.aimY],
			fire = false;
		const enemies = s.entities.filter(
			(q) =>
				!q.dead &&
				q.warning <= 0 &&
				!["crystal", "mine"].includes(q.kind) &&
				Math.abs(q.x - p.x) < 330,
		);
		const enemy = enemies.sort(
			(a, b) =>
				Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y),
		)[0];
		const crystalClose = s.entities.some(
			(q) =>
				q.kind === "crystal" &&
				!q.dead &&
				Math.hypot(q.x - p.x, q.y - p.y) < 65,
		);
		if (enemy && !s.weaponsOff && !crystalClose) {
			aim = F.direction(enemy.x - p.x, enemy.y - p.y);
			const safe = F.safeAim(s, aim, 0.22);
			fire = safe.fire;
			if (fire && Math.hypot(enemy.x - p.x, enemy.y - p.y) < 250) {
				const side = p.x < enemy.x ? -1 : 1;
				goal = {
					x: enemy.x + side * 175,
					y: F.clamp(enemy.y + (Math.sin(s.t * 0.8) > 0 ? 48 : -48), 49, 221),
				};
			}
		}
		if (
			!enemy &&
			target.kind !== "crystal" &&
			s.sector === 0 &&
			s.entities.some((q) => q.id === "drill")
		) {
			const q = s.entities.find((q) => q.id === "drill");
			aim = F.direction(q.x - p.x, q.y - p.y);
			fire = true;
		}
		const base = F.direction(goal.x - p.x, goal.y - p.y, [0, 0]),
			distance = Math.hypot(goal.x - p.x, goal.y - p.y);
		const options = [
			[0, 0],
			base,
			...Array.from({ length: 16 }, (_, i) => [
				Math.cos((i * Math.PI) / 8),
				Math.sin((i * Math.PI) / 8),
			]),
		];
		let move = base,
			best = -Infinity;
		for (const v of options) {
			const nx = {
				x: p.x + v[0] * b.speed * 0.65,
				y: p.y + v[1] * b.speed * 0.65,
			};
			let score = distance - Math.hypot(goal.x - nx.x, goal.y - nx.y);
			if (nx.y < 35 || nx.y > 235) score -= 200;
			for (const q of s.entities) {
				if (q.kind === "mine" && q.state === "active") {
					const d = F.segmentDistance(p, nx, q);
					if (d < 28) score -= (28 - d) * 35;
				} else if (
					!["crystal", "drone", "mine", "core"].includes(q.kind) &&
					q.warning <= 0
				) {
					const d = F.segmentDistance(p, nx, q);
					if (d < q.r + 22) score -= (q.r + 22 - d) * 25;
				}
			}
			for (const q of s.bullets) {
				if (q.team !== "hostile") continue;
				for (const tt of [0.2, 0.5, 0.8]) {
					const d = Math.hypot(
						p.x + v[0] * b.speed * tt - q.x - q.vx * tt,
						p.y + v[1] * b.speed * tt - q.y - q.vy * tt,
					);
					if (d < 27) score -= (27 - d) * 18;
				}
			}
			if (
				s.boss &&
				s.boss.phase !== "destroyed" &&
				nx.x > s.boss.hull.x - s.boss.hull.w / 2 - 16 &&
				Math.abs(nx.y - 135) < 79
			)
				score -= 1000;
			if (distance < 12 && v[0] === 0 && v[1] === 0) score += 12;
			if (score > best) {
				best = score;
				move = v;
			}
		}
		let warp = false;
		const end = { x: p.x + base[0] * 155, y: p.y + base[1] * 155 };
		if (
			p.drive === "ready" &&
			p.energy >= b.burstCost &&
			distance > 260 &&
			!enemy &&
			end.y > 38 &&
			end.y < 232 &&
			s.tick % 7 === 0
		) {
			const blocked = s.entities.some(
				(q) =>
					q.kind !== "crystal" &&
					q.warning <= 0 &&
					q.state !== "disarmed" &&
					F.segmentDistance(p, end, q) < q.r + 28,
			);
			const boss =
				s.boss &&
				s.boss.phase !== "destroyed" &&
				end.x > s.boss.hull.x - s.boss.hull.w / 2 - 25;
			warp = !blocked && !boss;
		}
		// The opening and extraction explicitly teach a fresh committed drive press.
		if (
			s.mode === "operation" &&
			s.sector === 0 &&
			s.sectorRescued &&
			!s.entities.some((q) => q.id === "drill") &&
			s.warpCount === 0 &&
			p.drive === "ready" &&
			p.energy >= b.burstCost
		)
			warp = true;
		return F.intent({
			mx: warp ? base[0] : move[0],
			my: warp ? base[1] : move[1],
			ax: aim[0],
			ay: aim[1],
			fire,
			warp,
		});
	};
})(typeof globalThis === "object" ? globalThis : window);
