(() => {
	const N = globalThis.NM,
		T = N.TILE;
	const cell = (x, y) => [Math.floor(x / T), Math.floor(y / T)];
	const key = (x, y) => `${x},${y}`;
	function compile(data) {
		const { width: w, height: h } = data;
		const grid = Array(w * h).fill(0);
		const carve = (x, y) => {
			if (x > 0 && y > 0 && x < w - 1 && y < h - 1) grid[y * w + x] = 1;
		};
		for (const r of data.rooms)
			for (let y = r.y; y < r.y + r.h; y++)
				for (let x = r.x; x < r.x + r.w; x++) carve(x, y);
		for (const p of data.passages) {
			const a = data.rooms.find((r) => r.id === p.from),
				b = data.rooms.find((r) => r.id === p.to);
			if (!a || !b) throw Error("Unknown passage room");
			const points = [
				[a.x + a.w / 2, a.y + a.h / 2],
				...(p.via || []),
				[b.x + b.w / 2, b.y + b.h / 2],
			];
			for (let i = 1; i < points.length; i++) {
				let [x, y] = points[i - 1].map(Math.floor);
				const [tx, ty] = points[i].map(Math.floor);
				const stamp = () => {
					for (let dy = -1; dy <= 1; dy++)
						for (let dx = -1; dx <= 1; dx++) carve(x + dx, y + dy);
				};
				stamp();
				while (x !== tx) {
					x += Math.sign(tx - x);
					stamp();
				}
				while (y !== ty) {
					y += Math.sign(ty - y);
					stamp();
				}
			}
		}
		const walkCell = (x, y) =>
			x >= 0 && y >= 0 && x < w && y < h && grid[y * w + x] === 1;
		const edges = [];
		for (let y = 0; y < h; y++)
			for (let x = 0; x < w; x++)
				if (walkCell(x, y)) {
					if (!walkCell(x - 1, y))
						edges.push({ ax: x * T, ay: y * T, bx: x * T, by: (y + 1) * T });
					if (!walkCell(x + 1, y))
						edges.push({
							ax: (x + 1) * T,
							ay: y * T,
							bx: (x + 1) * T,
							by: (y + 1) * T,
						});
					if (!walkCell(x, y - 1))
						edges.push({ ax: x * T, ay: y * T, bx: (x + 1) * T, by: y * T });
					if (!walkCell(x, y + 1))
						edges.push({
							ax: x * T,
							ay: (y + 1) * T,
							bx: (x + 1) * T,
							by: (y + 1) * T,
						});
				}
		const banks = (data.banks || []).map((b) => ({
			...b,
			ax: b.ax * T,
			ay: b.ay * T,
			bx: b.bx * T,
			by: b.by * T,
			bank: true,
		}));
		return {
			data,
			w,
			h,
			grid,
			edges,
			banks,
			colliders: [...edges, ...banks],
			walkCell,
			walk: (x, y) => walkCell(...cell(x, y)),
			rows: Array.from({ length: h }, (_, y) =>
				grid
					.slice(y * w, (y + 1) * w)
					.map((v) => (v ? "." : "#"))
					.join(""),
			),
		};
	}
	function intersection(x, y, dx, dy, e) {
		const ex = e.bx - e.ax,
			ey = e.by - e.ay,
			det = dx * ey - dy * ex;
		if (Math.abs(det) < 1e-8) return null;
		const ax = e.ax - x,
			ay = e.ay - y,
			t = (ax * ey - ay * ex) / det,
			u = (ax * dy - ay * dx) / det;
		if (t < -1e-8 || t > 1 + 1e-8 || u < -1e-8 || u > 1 + 1e-8) return null;
		const length = Math.hypot(ex, ey);
		let nx = -ey / length,
			ny = ex / length;
		if (nx * dx + ny * dy > 0) {
			nx = -nx;
			ny = -ny;
		}
		return { t: Math.max(0, t), nx, ny, x: x + dx * t, y: y + dy * t, edge: e };
	}
	function sweep(level, x, y, dx, dy) {
		let first = null;
		for (const e of level.colliders) {
			const hit = intersection(x, y, dx, dy, e);
			if (hit && (!first || hit.t < first.t)) first = hit;
		}
		return first;
	}
	function los(level, x, y, tx, ty) {
		const n = Math.ceil(Math.hypot(tx - x, ty - y) / 4);
		for (let i = 1; i <= n; i++)
			if (!level.walk(x + ((tx - x) * i) / n, y + ((ty - y) * i) / n))
				return false;
		return true;
	}
	function field(level, x, y, max = 1e5) {
		const [cx, cy] = cell(x, y),
			{ w, h } = level,
			distances = Array(w * h).fill(-1),
			q = [];
		if (!level.walkCell(cx, cy)) return distances;
		q.push([cx, cy]);
		distances[cy * w + cx] = 0;
		for (let i = 0; i < q.length; i++) {
			const [a, b] = q[i],
				d = distances[b * w + a];
			if (d >= max) continue;
			for (const [nx, ny] of [
				[a + 1, b],
				[a - 1, b],
				[a, b + 1],
				[a, b - 1],
			])
				if (level.walkCell(nx, ny) && distances[ny * w + nx] < 0) {
					distances[ny * w + nx] = d + 1;
					q.push([nx, ny]);
				}
		}
		return distances;
	}
	function path(level, x, y, tx, ty) {
		const d = field(level, tx, ty),
			[cx, cy] = cell(x, y);
		let a = cx,
			b = cy;
		const result = [];
		if (d[b * level.w + a] < 0) return result;
		for (let i = 0; i < level.w * level.h; i++) {
			if (d[b * level.w + a] === 0) break;
			let next = null;
			for (const [nx, ny] of [
				[a + 1, b],
				[a - 1, b],
				[a, b + 1],
				[a, b - 1],
			])
				if (
					level.walkCell(nx, ny) &&
					d[ny * level.w + nx] >= 0 &&
					d[ny * level.w + nx] < d[b * level.w + a]
				) {
					next = [nx, ny];
					break;
				}
			if (!next) break;
			[a, b] = next;
			result.push([(a + 0.5) * T, (b + 0.5) * T]);
		}
		return result;
	}
	function validCircle(level, x, y, r = 4.5) {
		return [
			[0, 0],
			[r, 0],
			[-r, 0],
			[0, r],
			[0, -r],
			[r * 0.7, r * 0.7],
			[-r * 0.7, r * 0.7],
			[r * 0.7, -r * 0.7],
			[-r * 0.7, -r * 0.7],
		].every(([dx, dy]) => level.walk(x + dx, y + dy));
	}
	function move(level, a, dx, dy, noclip = false) {
		if (noclip) {
			a.x += dx;
			a.y += dy;
			return;
		}
		if (validCircle(level, a.x + dx, a.y, a.r || 4.5)) a.x += dx;
		if (validCircle(level, a.x, a.y + dy, a.r || 4.5)) a.y += dy;
	}
	function nearest(level, x, y) {
		if (validCircle(level, x, y)) return [x, y];
		let best = null,
			dist = Infinity;
		for (let cy = 0; cy < level.h; cy++)
			for (let cx = 0; cx < level.w; cx++)
				if (level.walkCell(cx, cy)) {
					const px = (cx + 0.5) * T,
						py = (cy + 0.5) * T,
						d = (px - x) ** 2 + (py - y) ** 2;
					if (d < dist) {
						best = [px, py];
						dist = d;
					}
				}
		return best;
	}
	function segmentCircle(x, y, dx, dy, cx, cy, r) {
		const ox = x - cx,
			oy = y - cy,
			a = dx * dx + dy * dy;
		if (a < 1e-10) return null;
		const b = 2 * (ox * dx + oy * dy),
			c = ox * ox + oy * oy - r * r,
			disc = b * b - 4 * a * c;
		if (disc < 0) return null;
		const t = (-b - Math.sqrt(disc)) / (2 * a);
		if (c <= 0) return 0;
		return t >= 0 && t <= 1 ? t : null;
	}
	N.Geometry = {
		compile,
		cell,
		key,
		intersection,
		sweep,
		los,
		field,
		path,
		validCircle,
		move,
		nearest,
		segmentCircle,
	};
})();
