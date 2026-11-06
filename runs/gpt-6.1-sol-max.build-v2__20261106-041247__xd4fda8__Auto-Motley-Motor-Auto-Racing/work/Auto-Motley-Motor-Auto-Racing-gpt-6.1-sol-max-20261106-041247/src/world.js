((M, E) => {
	const clamp = E.clamp,
		wrap = (v, n) => ((v % n) + n) % n;
	M.wrap = wrap;
	M.namedRng = (seed, name) => {
		let h = seed >>> 0;
		for (const c of name) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
		return E.rng(h >>> 0);
	};
	M.segment = (x, y, a, b) => {
		const dx = b.x - a.x,
			dy = b.y - a.y,
			t = clamp(
				((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1),
				0,
				1,
			);
		const qx = a.x + dx * t,
			qy = a.y + dy * t;
		return { x: qx, y: qy, t, d: Math.hypot(x - qx, y - qy) };
	};
	class Road {
		constructor(data, closed) {
			Object.assign(this, data);
			this.closed = closed;
			this.path = new E.Path(data.points, {
				closed,
				smooth: data.linear ? false : "catmull",
			});
			this.length = this.path.length;
			this.samples = [];
			this.count = Math.ceil(this.length / 16);
			this.step = this.length / this.count;
			for (let i = 0; i <= this.count; i++)
				this.samples.push({ ...this.path.at(i * this.step), s: i * this.step });
			this.gates = closed
				? Array.from({ length: data.gates }, (_, i) => ({
						...this.path.at((i * this.length) / data.gates),
						s: (i * this.length) / data.gates,
						index: i,
						half: this.width / 2 + 5,
					}))
				: [];
			this.anchors = this.gates.map((g) => ({
				...this.path.at(g.s + 18),
				s: g.s + 18,
				gate: g.index,
			}));
		}
		at(d) {
			return this.path.at(
				this.closed ? wrap(d, this.length) : clamp(d, 0, this.length),
			);
		}
		project(x, y, hint, reach = 10) {
			let best = null;
			const full = hint === undefined || hint === null;
			const center = full ? 0 : Math.floor(hint / this.step);
			const n = full ? this.count : reach * 2 + 1;
			for (let k = 0; k < n; k++) {
				let i = full ? k : center + k - reach;
				if (this.closed) i = wrap(i, this.count);
				else if (i < 0 || i >= this.count) continue;
				const a = this.samples[i],
					b = this.samples[i + 1],
					q = M.segment(x, y, a, b);
				if (!best || q.d < best.d)
					best = {
						...q,
						s: (i + q.t) * this.step,
						index: i,
						angle: Math.atan2(b.y - a.y, b.x - a.x),
					};
			}
			return best;
		}
	}
	class World {
		constructor(seed = 1980) {
			this.seed = seed;
			this.courses = [];
			const basic = M.COURSE_DATA.filter((d) => !d.pieces).map(
				(d) => new Road(d, true),
			);
			this.connectors = M.CONNECTORS.map((d) => new Road(d, false));
			for (const grand of M.COURSE_DATA) {
				if (!grand.pieces) {
					this.courses.push(basic.find((r) => r.id === grand.id));
					continue;
				}
				const all = [...basic, ...this.connectors],
					points = [];
				for (const piece of grand.pieces) {
					const road = piece.via
						? new Road(
								{ id: "grand-link", points: piece.via, width: grand.width },
								false,
							)
						: all.find((r) => r.id === piece.road);
					let from = piece.from ? road.path.nearest(...piece.from) : 0,
						to = piece.to ? road.path.nearest(...piece.to) : road.length;
					if (to <= from + 0.01) to += road.length;
					const n = Math.ceil((to - from) / 12);
					for (let i = 0; i < n; i++) {
						const p = road.at(from + ((to - from) * i) / n);
						if (
							!points.length ||
							Math.hypot(p.x - points.at(-1)[0], p.y - points.at(-1)[1]) > 1
						)
							points.push([p.x, p.y]);
					}
				}
				let start = 0;
				for (let i = 0; i < points.length; i++)
					if (
						Math.hypot(
							points[i][0] - grand.start[0],
							points[i][1] - grand.start[1],
						) <
						Math.hypot(
							points[start][0] - grand.start[0],
							points[start][1] - grand.start[1],
						)
					)
						start = i;
				this.courses.push(
					new Road(
						{
							...grand,
							points: points.slice(start).concat(points.slice(0, start)),
							linear: true,
						},
						true,
					),
				);
			}
			this.roads = [...this.courses, ...this.connectors];
			this.bounds = [160, 160, 5900, 4740];
			this.props = [];
			this.water = M.WATER;
			this.buildings = M.BUILDINGS;
			this.hash = new E.SpatialHash(160);
			for (const road of this.roads)
				for (let i = 0; i < road.count; i++) {
					const a = road.samples[i],
						b = road.samples[i + 1];
					this.props.push({
						road,
						i,
						x: (a.x + b.x) / 2,
						y: (a.y + b.y) / 2,
						r: 60,
					});
				}
			this.hash.build(this.props);
			this.trees = [];
			const rnd = M.namedRng(seed, "trees");
			for (let i = 0; i < 1900; i++) {
				const x = 230 + rnd() * 5450,
					y = 300 + rnd() * 4260,
					near = this.nearest(x, y);
				if (
					near.d < near.road.width / 2 + 43 ||
					this.inWater(x, y) ||
					this.buildings.some((b) => Math.hypot(x - b.x, y - b.y) < b.r + 50)
				)
					continue;
				this.trees.push({
					x,
					y,
					r: 7 + rnd() * 3,
					size: 0.8 + rnd() * 0.6,
					seed: Math.floor(rnd() * 10000),
					pine: x > 3000 && y > 2400,
				});
			}
			// Ordered apple rows make the orchard recognizable from any heading.
			for (let x = 2750; x <= 3200; x += 75)
				for (let y = 1420; y <= 1700; y += 80)
					if (this.nearest(x, y).d > 65)
						this.trees.push({
							x,
							y,
							r: 9,
							size: 0.85,
							seed: x + y,
							apple: true,
						});
			this.solids = [
				...this.buildings.map((b) => ({ ...b, type: "building" })),
				...this.trees.map((t) => ({ ...t, type: "tree" })),
			];
			this.solidHash = new E.SpatialHash(100);
			this.solidHash.build(this.solids);
		}
		nearest(x, y) {
			let best = { d: Infinity, road: this.roads[0] };
			this.hash.near(x, y, 140, (q) => {
				const road = q.road,
					a = road.samples[q.i],
					b = road.samples[q.i + 1],
					p = M.segment(x, y, a, b);
				if (p.d < best.d)
					best = {
						...p,
						road,
						s: (q.i + p.t) * road.step,
						angle: Math.atan2(b.y - a.y, b.x - a.x),
					};
			});
			if (!Number.isFinite(best.d))
				for (const road of this.roads) {
					const p = road.project(x, y);
					if (p.d < best.d) best = { ...p, road };
				}
			return best;
		}
		inWater(x, y) {
			return this.water.some(
				(w) => ((x - w.x) / w.rx) ** 2 + ((y - w.y) / w.ry) ** 2 < 1,
			);
		}
		surface(x, y) {
			const p = this.nearest(x, y),
				half = p.road.width / 2;
			if (p.d < half) return "road";
			if (p.d < half + 12) return "gravel";
			return this.inWater(x, y) ? "water" : "grass";
		}
		safe(x, y, r = 8) {
			return (
				this.surface(x, y) !== "water" &&
				!this.solids.some((b) => Math.hypot(x - b.x, y - b.y) < r + b.r)
			);
		}
		collisions(car, before) {
			let impact = 0,
				reason = "";
			this.solidHash.near(car.x, car.y, 100, (p) => {
				const dx = car.x - p.x,
					dy = car.y - p.y,
					d = Math.hypot(dx, dy),
					R = car.r + p.r;
				if (d >= R) return;
				const nx = d > 0.00001 ? dx / d : -Math.cos(car.angle),
					ny = d > 0.00001 ? dy / d : -Math.sin(car.angle);
				const vn = car.vx * nx + car.vy * ny;
				car.x = p.x + nx * (R + 0.1);
				car.y = p.y + ny * (R + 0.1);
				if (vn < 0) {
					impact = Math.max(impact, -vn);
					car.vx -= nx * vn * 1.2;
					car.vy -= ny * vn * 1.2;
					reason = p.type === "tree" ? "Tree impact" : "Solid impact";
				}
			});
			const B = this.bounds;
			if (car.x < B[0] || car.y < B[1] || car.x > B[2] || car.y > B[3]) {
				impact = Math.max(impact, Math.hypot(before.vx, before.vy));
				reason = "County boundary";
				car.x = clamp(car.x, B[0], B[2]);
				car.y = clamp(car.y, B[1], B[3]);
				car.vx *= -0.2;
				car.vy *= -0.2;
			}
			return { impact, reason };
		}
		graphPath(from, target) {
			// A real connected lane graph: road samples form edges; junctions join within 44 units.
			if (!this.graph) {
				const nodes = [],
					byRoad = [];
				for (const road of this.roads) {
					const row = [];
					const n = Math.ceil(road.length / 80);
					for (let i = 0; i <= n; i++) {
						const p = road.at((i * road.length) / n);
						row.push(nodes.length);
						nodes.push({ ...p, edges: [] });
					}
					byRoad.push(row);
				}
				const link = (a, b) => {
					const d = Math.hypot(
						nodes[a].x - nodes[b].x,
						nodes[a].y - nodes[b].y,
					);
					nodes[a].edges.push([b, d]);
					nodes[b].edges.push([a, d]);
				};
				byRoad.forEach((row, i) => {
					for (let j = 1; j < row.length; j++) link(row[j - 1], row[j]);
					if (this.roads[i].closed) link(row[0], row.at(-1));
				});
				for (let a = 0; a < nodes.length; a++)
					for (let b = a + 1; b < nodes.length; b++)
						if (
							Math.hypot(nodes[a].x - nodes[b].x, nodes[a].y - nodes[b].y) < 80
						)
							link(a, b);
				this.graph = nodes;
			}
			const N = this.graph,
				nearest = (p) =>
					N.reduce(
						(best, q, i) =>
							Math.hypot(q.x - p.x, q.y - p.y) <
							Math.hypot(N[best].x - p.x, N[best].y - p.y)
								? i
								: best,
						0,
					);
			const start = nearest(from),
				end = nearest(target),
				dist = N.map(() => Infinity),
				prev = N.map(() => -1),
				open = new Set([start]);
			dist[start] = 0;
			while (open.size) {
				let u = -1;
				for (const i of open) if (u < 0 || dist[i] < dist[u]) u = i;
				open.delete(u);
				if (u === end) break;
				for (const [v, w] of N[u].edges)
					if (dist[u] + w < dist[v]) {
						dist[v] = dist[u] + w;
						prev[v] = u;
						open.add(v);
					}
			}
			if (!Number.isFinite(dist[end]))
				throw new Error("Disconnected county graph");
			const path = [];
			for (let i = end; i !== -1; i = prev[i]) path.push([N[i].x, N[i].y]);
			path.reverse();
			return path;
		}
	}
	M.Road = Road;
	M.World = World;
})(MM, My3D2dge);
