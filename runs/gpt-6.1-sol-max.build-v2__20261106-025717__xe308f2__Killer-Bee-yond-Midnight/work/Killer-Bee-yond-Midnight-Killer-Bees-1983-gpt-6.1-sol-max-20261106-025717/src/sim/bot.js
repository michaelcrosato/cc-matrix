import { blocked, clamp, distance, footprint, freePoint } from "./world.js";

const W = 48,
	H = 30;
// Short-path steering sees authoritative geometry and only emits ordinary player commands.
export function route(s, p, goal, r = 8, avoid = true) {
	if (blocked(s, p.x, p.y, r)) return freePoint(s, p.x, p.y, r + 1) || goal;
	const sx = clamp(Math.floor(p.x / 8), 0, W - 1),
		sy = clamp(Math.floor(p.y / 8), 0, H - 1),
		gx = clamp(Math.floor(goal.x / 8), 0, W - 1),
		gy = clamp(Math.floor(goal.y / 8), 0, H - 1),
		start = sy * W + sx,
		end = gy * W + gx;
	const cost = new Float64Array(W * H).fill(Infinity),
		prev = new Int16Array(W * H).fill(-1),
		closed = new Uint8Array(W * H),
		front = [start];
	cost[start] = 0;
	let best = start,
		bd = Infinity;
	for (let n = 0; front.length && n < 1440; n++) {
		let at = 0,
			value = Infinity;
		for (let i = 0; i < front.length; i++) {
			const k = front[i],
				x = k % W,
				y = (k / W) | 0,
				v = cost[k] + Math.hypot(x - gx, y - gy);
			if (v < value) {
				value = v;
				at = i;
			}
		}
		const k = front.splice(at, 1)[0];
		if (closed[k]) continue;
		closed[k] = 1;
		const x = k % W,
			y = (k / W) | 0,
			dd = Math.hypot(x - gx, y - gy);
		if (dd < bd) {
			bd = dd;
			best = k;
		}
		if (k === end || dd < 1.5) {
			best = k;
			break;
		}
		for (const [dx, dy] of [
			[1, 0],
			[-1, 0],
			[0, 1],
			[0, -1],
			[1, 1],
			[-1, 1],
			[1, -1],
			[-1, -1],
		]) {
			const xx = x + dx,
				yy = y + dy;
			if (xx < 0 || xx >= W || yy < 0 || yy >= H) continue;
			const q = yy * W + xx;
			if (
				closed[q] ||
				blocked(s, xx * 8 + 4, yy * 8 + 4, r) ||
				(dx &&
					dy &&
					(blocked(s, x * 8 + 4, yy * 8 + 4, r) ||
						blocked(s, xx * 8 + 4, y * 8 + 4, r)))
			)
				continue;
			let danger = 0;
			if (avoid)
				for (const a of s.rivals)
					if (a.warning <= 0) {
						const d = Math.hypot(xx * 8 + 4 - a.x, yy * 8 + 4 - a.y);
						if (d < 50) danger += ((50 - d) / 20) ** 2;
					}
			const v = cost[k] + Math.hypot(dx, dy) + danger;
			if (v < cost[q]) {
				cost[q] = v;
				prev[q] = k;
				front.push(q);
			}
		}
	}
	if (best === start) return goal;
	const path = [];
	let k = best;
	for (let n = 0; n < 1440 && k !== start && k >= 0; n++) {
		path.push(k);
		k = prev[k];
	}
	path.reverse();
	let point = { x: p.x, y: p.y };
	for (const q of path.slice(0, 4)) {
		const next = { x: (q % W) * 8 + 4, y: ((q / W) | 0) * 8 + 4 };
		let clear = true;
		for (let f = 0; f <= 1; f += 0.12)
			if (blocked(s, p.x + (next.x - p.x) * f, p.y + (next.y - p.y) * f, r))
				clear = false;
		if (!clear) break;
		point = next;
	}
	if (distance(point, p) < 0.1) {
		const anchor = { x: sx * 8 + 4, y: sy * 8 + 4 };
		let clear = !blocked(s, anchor.x, anchor.y, r);
		for (let f = 0.1; f <= 1; f += 0.1)
			if (blocked(s, p.x + (anchor.x - p.x) * f, p.y + (anchor.y - p.y) * f, r))
				clear = false;
		if (clear && distance(anchor, p) > 0.1) return anchor;
		for (const [dx, dy] of [
			[-8, 0],
			[8, 0],
			[0, -8],
			[0, 8],
		])
			if (!blocked(s, p.x + dx, p.y + dy, r))
				return { x: p.x + dx, y: p.y + dy };
	}
	return point;
}
export function pilot(s, p, memory = {}) {
	if (!p?.bees || s.phase !== "play")
		return { x: 0, y: 0, focus: false, ray: p?.lastRay || 0 };
	const danger = s.rivals
			.filter((a) => a.warning <= 0)
			.sort((a, b) => distance(a, p) - distance(b, p)),
		near = danger[0],
		dangerD = near ? distance(p, near) : Infinity;
	const targets = s.targets
		.filter((t) => t.warning <= 0)
		.sort((a, b) => distance(a, p) - distance(b, p));
	const wounded = targets
		.filter((t) => t.hp < t.maxHp * 0.7)
		.sort((a, b) => distance(a, p) - distance(b, p));
	const t = wounded[0] || targets[p.id % Math.max(1, targets.length)];
	let goal = t
		? { x: t.x, y: t.y }
		: {
				x: 192 + Math.cos(s.time * 0.55 + p.id * 2) * 125,
				y: 120 + Math.sin(s.time * 0.55 + p.id * 2) * 78,
			};
	let focus = !!t && distance(p, t) < 20 && (dangerD > 43 || p.charge);
	const fire =
		!!p.charge &&
		danger.some((a) => Math.abs(a.y - p.y) < s.tuning.rayWidth + a.r - 1);
	if (t?.type === "bell" && t.bossPhase !== "open") {
		const escorts = targets.filter((a) => a.type !== "bell");
		if (escorts.length) {
			goal = escorts[0];
			focus = distance(p, goal) < 18 && dangerD > 40;
		} else {
			const a = Math.atan2(p.y - t.y, p.x - t.x);
			goal = { x: t.x + Math.cos(a) * 50, y: t.y + Math.sin(a) * 50 };
			focus = false;
		}
	}
	if (near && dangerD < 40 && !fire) {
		// With a charge, slide onto the threat's row. Without one, keep enough lateral room to escape.
		if (p.charge && dangerD > 23) {
			goal = { x: p.x + (p.x > near.x ? 1 : -1) * 20, y: near.y };
			focus = false;
		} else if (dangerD < 25 && !(t && distance(p, t) < 20 && t.hp < 0.65)) {
			const ax = p.x - near.x,
				ay = p.y - near.y;
			const dd = Math.hypot(ax, ay) || 1;
			goal = {
				x: clamp(p.x + (ax / dd) * 65, 20, 364),
				y: clamp(p.y + (ay / dd) * 65, 20, 220),
			};
			focus = false;
			if (distance(p, goal) < 15) {
				const sign = p.x < 192 ? 1 : -1;
				goal = {
					x: clamp(p.x - (ay / dd) * 90 * sign, 20, 364),
					y: clamp(p.y + (ax / dd) * 90 * sign, 20, 220),
				};
			}
		}
	}
	const direct = Math.hypot(goal.x - p.x, goal.y - p.y),
		nx = (goal.x - p.x) / (direct || 1),
		ny = (goal.y - p.y) / (direct || 1);
	let point = goal;
	if (
		blocked(s, p.x + nx * 14, p.y + ny * 14, focus ? 8 : footprint(p)) ||
		direct > 24
	) {
		if (
			!memory.path ||
			s.tick > memory.until ||
			distance(goal, memory.goal || goal) > 20
		) {
			memory.path = route(s, p, goal, 8, !p.charge && dangerD < 80);
			memory.until = s.tick + 16;
			memory.goal = { x: goal.x, y: goal.y };
		}
		point = memory.path;
		if (
			blocked(s, p.x + nx * 6, p.y + ny * 6, footprint({ ...p, focus: false }))
		)
			focus = true;
	}
	const dx = point.x - p.x,
		dy = point.y - p.y,
		d = Math.hypot(dx, dy),
		speed = clamp(d / 2, 0, 1);
	if (
		blocked(
			s,
			p.x + (dx / (d || 1)) * 8,
			p.y + (dy / (d || 1)) * 8,
			footprint({ ...p, focus: false }),
		)
	)
		focus = true;
	return {
		x: (dx / (d || 1)) * speed,
		y: (dy / (d || 1)) * speed,
		focus,
		ray: p.lastRay + (fire ? 1 : 0),
	};
}
