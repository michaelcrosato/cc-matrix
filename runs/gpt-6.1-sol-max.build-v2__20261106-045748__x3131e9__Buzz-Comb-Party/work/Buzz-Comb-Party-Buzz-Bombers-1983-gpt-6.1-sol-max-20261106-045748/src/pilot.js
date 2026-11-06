(function (B) {
	"use strict";
	// Ordinary pilot: observes at 10 Hz and uses the same bounded action adapter as a player.
	// It receives no resource exemptions. The attract director opts into demo resources separately.
	B.pilot = function (w, seat = 1) {
		const p = w.players.find((p) => p.seat === seat);
		if (!p) return {};
		const legal = B.groundIntervals(w).find(
				([a, b]) => p.x >= a - 0.1 && p.x <= b + 0.1,
			) || [28, 612],
			clamp = (x) => Math.max(legal[0], Math.min(legal[1], x));
		let aim = p.x,
			fire = false,
			call = p.callSeen;
		const combs = w.obstacles.filter((o) => o.kind === "comb");
		const preferred =
			combs
				.filter((o) => o.red)
				.sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0] ||
			combs[0];
		if (preferred && w.bird.call <= 0 && w.bird.state !== "retreat") {
			call++;
			aim = preferred.x;
			return { aim, fire: false, call };
		}
		const speed = w.tuning.beeSpeed * w.content[w.stage].speed;
		const targets = w.bees
			.filter((b) => b.state !== "landing" && b.state !== "build")
			.map((b) => {
				const t = (282 - b.y) / w.tuning.pulseSpeed,
					v = speed * (b.kind === "fast" ? w.tuning.fastMultiplier : 1) * b.dir;
				let x = b.x + v * t;
				if (x > 612) x = 1224 - x;
				if (x < 28) x = 56 - x;
				return { b, x, t };
			})
			.filter((q) => q.x >= legal[0] - 8 && q.x <= legal[1] + 8);
		targets.sort((a, b) => {
			const redBias = w.boss && !w.boss.done && w.boss.open <= 0 ? 100 : 0;
			return (
				Math.abs(a.x - p.x) * 0.5 -
					a.b.tier * 28 -
					(a.b.kind === "fast" ? redBias : 0) -
					(Math.abs(b.x - p.x) * 0.5 -
						b.b.tier * 28 -
						(b.b.kind === "fast" ? redBias : 0)) || a.b.id - b.b.id
			);
		});
		const boss = w.boss;
		if (boss && !boss.done && boss.open > 1) {
			const t = (282 - boss.y) / w.tuning.pulseSpeed;
			aim = clamp(320 + Math.sin((w.stageTime + t) * 0.36 + boss.phase) * 145);
			fire = Math.abs(aim - p.x) < 15;
		} else if (targets.length) {
			const q = targets[(seat - 1) % Math.min(targets.length, 2)];
			aim = clamp(q.x);
			fire = Math.abs(q.x - p.x) < 7;
			// Let Pip eat a useful parcel. Clear one deliberately if it really blocks a low bee.
			const obstacle = w.obstacles.find(
				(o) => o.y > q.b.y && Math.abs(o.x - p.x) < 13,
			);
			if (
				obstacle &&
				(q.b.tier < 4 || obstacle.kind === "hive" || w.bird.state === "feed")
			)
				fire = false;
		}
		// A purposeful economy: never knowingly spray the bird.
		if (w.bird.state !== "retreat" && Math.abs(w.bird.x - p.x) < 20)
			fire = false;
		return { aim, move: 0, fire, call };
	};
})((globalThis.BCP = globalThis.BCP || {}));
