(function (S) {
	"use strict";
	function botIntent(world, id, seq) {
		const s = world.s,
			p = s.players.find((p) => p.id === id),
			out = S.neutral(seq);
		if (!p || p.hp <= 0) return out;
		const targets = s.enemies.filter((e) => e.hp > 0 && e.tele <= 0);
		if (s.boss) targets.push(...s.boss.parts.filter((c) => c.hp > 0 && c.open));
		let target = null,
			score = Infinity;
		for (const e of targets) {
			const urgency =
				e.kind === "rammer"
					? -0.55
					: e.kind === "anchor"
						? -0.35
						: e.kind === "tractor"
							? -0.3
							: e.component
								? -0.9
								: e.kind === "dive" && e.y > 300
									? -0.8
									: 0;
			const val = S.dist(p, e) * (1 + urgency) + (e.kind === "relay" ? -80 : 0);
			if (val < score) {
				score = val;
				target = e;
			}
		}
		let mx = 0,
			my = 0;
		if (target) {
			const travel = S.dist(p, target) / 730;
			const tx = target.x + (target.vx || 0) * travel,
				ty = target.y + (target.vy || 0) * travel;
			const a = Math.atan2(ty - p.y, tx - p.x);
			out.ax = Math.cos(a);
			out.ay = Math.sin(a);
			out.fire = true;
			if (s.act === 2) mx = S.clamp((target.x - p.x) / 100, -1, 1) * 0.65;
			else {
				const desired = target.kind === "anchor" ? 245 : 240;
				const d = S.dist(p, target);
				mx =
					((target.x - p.x) / (d || 1)) *
					S.clamp((d - desired) / 130, -0.5, 0.8);
				my =
					((target.y - p.y) / (d || 1)) *
					S.clamp((d - desired) / 130, -0.5, 0.8);
				mx += (480 - p.x) / 850;
				my += (345 - p.y) / 750;
			}
		}
		let danger = 0,
			closest = Infinity;
		for (const b of s.shots)
			if (b.foe) {
				const dx = p.x - b.x,
					dy = p.y - b.y,
					den = b.vx * b.vx + b.vy * b.vy;
				const t = den ? S.clamp((dx * b.vx + dy * b.vy) / den, 0, 0.85) : 0;
				const fx = b.x + b.vx * t,
					fy = b.y + b.vy * t,
					d = Math.hypot(p.x - fx, p.y - fy);
				const now = S.dist(p, b);
				closest = Math.min(closest, now);
				if (d < 52 && now < 220) {
					danger++;
					const force = (1 - d / 65) * 1.6;
					const sign = p.x > fx ? 1 : -1;
					mx += sign * force;
					my += s.act === 2 ? 0 : (p.y > fy ? 1 : -1) * force * 0.6;
				}
			}
		for (const e of s.enemies)
			if (e.tele <= 0) {
				const d = S.dist(p, e);
				if (d < 110) {
					const force = (110 - d) / 80;
					mx += ((p.x - e.x) / (d || 1)) * force;
					my += ((p.y - e.y) / (d || 1)) * force;
				}
			}
		const drop = s.drops
			.filter((d) => S.dist(d, p) < 230)
			.sort((a, b) => S.dist(a, p) - S.dist(b, p))[0];
		if (drop && (p.hp < p.maxHp || p.energy < 35) && danger < 2) {
			mx += (drop.x - p.x) / 100;
			my += (drop.y - p.y) / 100;
		}
		if (s.act === 1) {
			const d = Math.hypot(p.x - 480, p.y - 277);
			if (d < 130) {
				mx += (p.x - 480) / (d || 1);
				my += (p.y - 277) / (d || 1);
			}
		}
		if (p.x < 75) mx += 1.3;
		if (p.x > 885) mx -= 1.3;
		if (p.y < 125) my += 1;
		if (p.y > 435 && s.act !== 2) my -= 1;
		[out.mx, out.my] = S.norm(mx, my);
		if (s.act === 2) out.my = 0;
		out.pulse = p.pulse <= 0 && (closest < 100 || danger > 1);
		out.boost = p.energy >= 28 && closest < 36 && p.pulse > 0;
		return out;
	}
	Object.assign(S, { botIntent });
})(globalThis.Fortnight);
