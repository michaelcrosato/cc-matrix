((G) => {
	const EPS = 1e-7,
		TILE = 16,
		clamp = (v, a, b) => Math.max(a, Math.min(b, v));
	function segmentCircle(x, y, dx, dy, cx, cy, r) {
		const ox = x - cx,
			oy = y - cy,
			a = dx * dx + dy * dy,
			c = ox * ox + oy * oy - r * r;
		if (c <= 0) return 0;
		if (a < EPS) return null;
		const b = 2 * (ox * dx + oy * dy),
			d = b * b - 4 * a * c;
		if (d < 0) return null;
		const t = (-b - Math.sqrt(d)) / (2 * a);
		return t >= -EPS && t <= 1 + EPS ? clamp(t, 0, 1) : null;
	}
	function segmentBox(x, y, dx, dy, x0, y0, x1, y1) {
		let lo = 0,
			hi = 1,
			nx = 0,
			ny = 0;
		for (const [p, d, mn, mx, ax] of [
			[x, dx, x0, x1, 0],
			[y, dy, y0, y1, 1],
		]) {
			if (Math.abs(d) < EPS) {
				if (p < mn || p > mx) return null;
				continue;
			}
			let a = (mn - p) / d,
				b = (mx - p) / d,
				sign = -Math.sign(d);
			if (a > b) [a, b] = [b, a];
			if (a > lo) {
				lo = a;
				nx = ax === 0 ? sign : 0;
				ny = ax === 1 ? sign : 0;
			}
			hi = Math.min(hi, b);
			if (lo - hi > EPS) return null;
		}
		if (hi < 0 || lo > 1) return null;
		if (nx === 0 && ny === 0) {
			if (Math.abs(dx) > Math.abs(dy)) nx = -Math.sign(dx);
			else ny = -Math.sign(dy);
		}
		return { t: clamp(lo, 0, 1), nx, ny };
	}
	function segmentBank(x, y, dx, dy, bank, r = 1) {
		const [ax, ay] = bank.a,
			[bx, by] = bank.b,
			sx = bx - ax,
			sy = by - ay,
			len = Math.hypot(sx, sy),
			nx = -sy / len,
			ny = sx / len;
		const d = (x - ax) * nx + (y - ay) * ny,
			v = dx * nx + dy * ny;
		let best = null;
		if (Math.abs(v) > EPS) {
			const side = d >= 0 ? 1 : -1,
				t = (side * r - d) / v;
			if (t >= -EPS && t <= 1 + EPS) {
				const qx = x + dx * t,
					qy = y + dy * t,
					u = ((qx - ax) * sx + (qy - ay) * sy) / (len * len);
				if (u >= 0 && u <= 1 && side * v < 0)
					best = {
						t: clamp(t, 0, 1),
						nx: nx * side,
						ny: ny * side,
						bank: bank.id,
					};
			}
		}
		for (const [cx, cy] of [
			[ax, ay],
			[bx, by],
		]) {
			const t = segmentCircle(x, y, dx, dy, cx, cy, r);
			if (t !== null && (!best || t < best.t)) {
				const hx = x + dx * t - cx,
					hy = y + dy * t - cy,
					l = Math.hypot(hx, hy) || 1;
				best = { t, nx: hx / l, ny: hy / l, bank: bank.id };
			}
		}
		return best;
	}
	function reflect(vx, vy, nx, ny) {
		const dot = vx * nx + vy * ny;
		return [vx - 2 * dot * nx, vy - 2 * dot * ny];
	}
	function cellKey(x, y, width) {
		return Math.floor(y / TILE) * width + Math.floor(x / TILE);
	}
	G.DTGeometry = {
		TILE,
		EPS,
		clamp,
		segmentCircle,
		segmentBox,
		segmentBank,
		reflect,
		cellKey,
	};
})(globalThis);
