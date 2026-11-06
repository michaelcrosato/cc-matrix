/* Original Auto Lap Happy countryside. Native engine paths; no source-game map tracing. */
(() => {
	"use strict";
	const E = My3D2dge;
	const COURSE_DATA = [
		{
			id: "meadow",
			name: "Meadow Mile",
			subtitle: "Wide roads. Big smiles.",
			color: "#f3c85a",
			width: 53,
			landmark: "The Little Paddock",
			points: [
				[600, 1750],
				[600, 1000],
				[850, 650],
				[1500, 580],
				[2050, 850],
				[2200, 1400],
				[2050, 1900],
				[1550, 2100],
				[950, 2050],
			],
		},
		{
			id: "orchard",
			name: "Orchard Weave",
			subtitle: "Find a rhythm between the trees.",
			color: "#f19165",
			width: 47,
			landmark: "Apple Barn",
			points: [
				[3400, 1600],
				[3300, 1050],
				[3550, 650],
				[4100, 580],
				[4550, 800],
				[4850, 650],
				[5350, 850],
				[5480, 1400],
				[5200, 1850],
				[4650, 1950],
				[4250, 1750],
				[3850, 2050],
				[3450, 1950],
			],
		},
		{
			id: "lake",
			name: "Kingfisher Lake",
			subtitle: "Keep a cool head on the causeway.",
			color: "#68d4de",
			width: 40,
			landmark: "Kingfisher Boathouse",
			points: [
				[3500, 4450],
				[3450, 3800],
				[3700, 3350],
				[4250, 3200],
				[4800, 3300],
				[5350, 3650],
				[5480, 4200],
				[5300, 4700],
				[4800, 5050],
				[4200, 5120],
				[3750, 4900],
			],
		},
		{
			id: "wood",
			name: "Whispering Pines",
			subtitle: "Sweep, settle, and sprint.",
			color: "#a2c584",
			width: 43,
			landmark: "Old Fire Tower",
			points: [
				[500, 4500],
				[520, 3850],
				[850, 3400],
				[1350, 3300],
				[1900, 3500],
				[2200, 3900],
				[2050, 4300],
				[1720, 4200],
				[1550, 3900],
				[1300, 4000],
				[1250, 4500],
				[1650, 4820],
				[2080, 5100],
				[1900, 5500],
				[1200, 5530],
				[700, 5200],
			],
		},
		{
			id: "grand",
			name: "Happy Valley Grand",
			subtitle: "Every road has led to this.",
			color: "#c8a8ec",
			width: 44,
			landmark: "The Valley Windmill",
			points: [
				[2200, 1400],
				[2650, 1650],
				[3100, 1700],
				[3450, 1950],
				[3850, 2050],
				[4250, 1750],
				[4650, 1950],
				[5200, 1850],
				[5450, 2250],
				[5300, 2700],
				[4800, 3300],
				[4250, 3200],
				[3700, 3350],
				[3250, 3700],
				[2700, 3800],
				[2200, 3900],
				[1900, 3500],
				[1350, 3300],
				[1100, 2950],
				[1150, 2500],
				[1550, 2100],
				[2050, 1900],
			],
		},
	];
	const CONNECTOR_DATA = [
		{
			points: [
				[2200, 1400],
				[2600, 1420],
				[3020, 1500],
				[3400, 1600],
			],
			width: 37,
			name: "Orchard Lane",
		},
		{
			points: [
				[5200, 1850],
				[5500, 2200],
				[5570, 2800],
				[5350, 3650],
			],
			width: 36,
			name: "Lake Road",
		},
		{
			points: [
				[3700, 3350],
				[3200, 3100],
				[2700, 3200],
				[2200, 3900],
			],
			width: 36,
			name: "Pine Lane",
		},
		{
			points: [
				[850, 3400],
				[750, 3000],
				[800, 2500],
				[950, 2050],
			],
			width: 38,
			name: "Meadow Lane",
		},
		{
			points: [
				[2650, 1650],
				[2700, 2150],
				[2750, 2600],
				[2850, 2700],
			],
			width: 27,
			name: "Old Airfield Lane",
		},
		{
			points: [
				[3450, 3800],
				[3950, 3930],
				[4450, 4000],
				[5000, 3970],
				[5480, 4200],
			],
			width: 24,
			name: "Kingfisher Causeway",
		},
		{
			points: [
				[3450, 1950],
				[3250, 2400],
				[3200, 3100],
				[3700, 3350],
			],
			width: 34,
			name: "Valley Link",
		},
	];
	function samplesFor(path, closed) {
		const n = Math.ceil(path.length / 14),
			out = [];
		for (let i = 0; i <= n; i++) {
			const d = (i / n) * path.length,
				p = path.at(d);
			out.push({ x: p.x, y: p.y, angle: p.angle, d });
		}
		if (closed) {
			const a = out[0];
			Object.assign(out[n], { x: a.x, y: a.y, angle: a.angle });
		}
		return out;
	}
	function closestOn(a, b, x, y) {
		const dx = b.x - a.x,
			dy = b.y - a.y,
			l = dx * dx + dy * dy,
			t = l
				? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / l))
				: 0;
		return { x: a.x + t * dx, y: a.y + t * dy, t };
	}
	class HappyWorld {
		constructor() {
			this.version = 1;
			this.bounds = [180, 180, 5850, 5850];
			this.courses = COURSE_DATA.map((data, i) => {
				const path = new E.Path(data.points, {
						closed: true,
						smooth: "catmull",
					}),
					samples = samplesFor(path, true),
					length = path.length;
				return {
					...data,
					index: i,
					path,
					length,
					samples,
					gates: Array.from({ length: 12 }, (_, g) => ({
						...path.at((g * length) / 12),
						d: (g * length) / 12,
						index: g,
					})),
					restartAnchors: Array.from({ length: 12 }, (_, g) => ({
						...path.at((g * length) / 12),
						d: (g * length) / 12,
					})),
					medals: [length / 110, length / 90, length / 72],
					version: 1,
				};
			});
			this.roads = this.courses.map((c) => ({
				...c,
				courseIndex: c.index,
				closed: true,
			}));
			for (const c of CONNECTOR_DATA) {
				const path = new E.Path(c.points, { smooth: "catmull" });
				this.roads.push({
					...c,
					path,
					length: path.length,
					samples: samplesFor(path, false),
					connector: true,
					closed: false,
					color: "#d8c6a4",
				});
			}
			const dragPath = new E.Path([
				[2850, 2700],
				[4250, 2700],
			]);
			this.drag = {
				path: dragPath,
				start: { x: 2900, y: 2700, angle: 0 },
				finish: { x: 4200, y: 2700, angle: 0 },
				width: 35,
				length: 1300,
			};
			this.roads.push({
				name: "Old Airfield",
				path: dragPath,
				length: dragPath.length,
				samples: samplesFor(dragPath, false),
				width: 35,
				connector: true,
				drag: true,
				closed: false,
				color: "#c6bfae",
			});
			this.water = [{ x: 4390, y: 4150, rx: 850, ry: 690 }];
			this.gravel = [
				{ x: 1880, y: 4300, rx: 350, ry: 220 },
				{ x: 2780, y: 2660, rx: 170, ry: 180 },
			];
			this.segments = [];
			this.segmentGrid = new Map();
			for (const road of this.roads)
				for (let i = 0; i < road.samples.length - 1; i++) {
					const a = road.samples[i],
						b = road.samples[i + 1],
						seg = { a, b, width: road.width, road, index: i },
						k = this.segments.push(seg) - 1;
					const pad = road.width + 30;
					for (
						let cy = Math.floor((Math.min(a.y, b.y) - pad) / 128);
						cy <= Math.floor((Math.max(a.y, b.y) + pad) / 128);
						cy++
					)
						for (
							let cx = Math.floor((Math.min(a.x, b.x) - pad) / 128);
							cx <= Math.floor((Math.max(a.x, b.x) + pad) / 128);
							cx++
						) {
							const key = cx + "," + cy;
							if (!this.segmentGrid.has(key)) this.segmentGrid.set(key, []);
							this.segmentGrid.get(key).push(k);
						}
				}
			this.props = [];
			this.solids = [];
			this.buildScenery();
			this.discoveries = this.courses.map((c) => ({
				id: c.id,
				name: c.name,
				x: c.gates[0].x,
				y: c.gates[0].y,
				r: 150,
				courseIndex: c.index,
			}));
			this.discoveries.push({
				id: "airfield",
				name: "The Secret Straight",
				x: 2900,
				y: 2700,
				r: 150,
				secret: true,
			});
		}
		buildNavigation() {
			if (this.navigation) return this.navigation;
			const nodes = [],
				grid = new Map(),
				edge = (a, b) => {
					const cost = Math.hypot(
						nodes[a].x - nodes[b].x,
						nodes[a].y - nodes[b].y,
					);
					nodes[a].edges.push([b, cost]);
					nodes[b].edges.push([a, cost]);
				};
			this.roads.forEach((road, ri) => {
				const indices = [],
					count = Math.ceil(road.length / 62);
				for (let k = 0; k <= (road.closed ? count - 1 : count); k++) {
					const p = road.path.at((k / count) * road.length),
						i = nodes.length,
						n = { x: p.x, y: p.y, road: ri, edges: [] };
					nodes.push(n);
					indices.push(i);
					const key = Math.floor(p.x / 100) + "," + Math.floor(p.y / 100);
					if (!grid.has(key)) grid.set(key, []);
					grid.get(key).push(i);
					if (k) edge(indices[k - 1], i);
				}
				if (road.closed) edge(indices.at(-1), indices[0]);
			});
			for (let i = 0; i < nodes.length; i++) {
				const a = nodes[i],
					cx = Math.floor(a.x / 100),
					cy = Math.floor(a.y / 100);
				for (let dy = -1; dy <= 1; dy++)
					for (let dx = -1; dx <= 1; dx++)
						for (const j of grid.get(cx + dx + "," + (cy + dy)) || []) {
							if (j <= i || nodes[j].road === a.road) continue;
							const b = nodes[j],
								d = Math.hypot(a.x - b.x, a.y - b.y);
							if (
								d < 74 &&
								this.surface((a.x + b.x) / 2, (a.y + b.y) / 2) === "road"
							)
								edge(i, j);
						}
			}
			this.navigation = { nodes, grid };
			return this.navigation;
		}
		routeBetween(from, to) {
			if (Array.isArray(from)) from = { x: from[0], y: from[1] };
			if (Array.isArray(to)) to = { x: to[0], y: to[1] };
			const { nodes } = this.buildNavigation();
			let start = 0,
				end = 0,
				sd = Infinity,
				ed = Infinity;
			nodes.forEach((n, i) => {
				const a = Math.hypot(n.x - from.x, n.y - from.y),
					b = Math.hypot(n.x - to.x, n.y - to.y);
				if (a < sd) {
					sd = a;
					start = i;
				}
				if (b < ed) {
					ed = b;
					end = i;
				}
			});
			const distances = new Float64Array(nodes.length).fill(Infinity),
				previous = new Int32Array(nodes.length).fill(-1),
				done = new Uint8Array(nodes.length);
			distances[start] = 0;
			for (let k = 0; k < nodes.length; k++) {
				let cur = -1,
					best = Infinity;
				for (let i = 0; i < nodes.length; i++)
					if (!done[i] && distances[i] < best) {
						best = distances[i];
						cur = i;
					}
				if (cur < 0 || cur === end) break;
				done[cur] = 1;
				for (const [i, cost] of nodes[cur].edges)
					if (distances[i] > best + cost) {
						distances[i] = best + cost;
						previous[i] = cur;
					}
			}
			if (!Number.isFinite(distances[end])) return null;
			const route = [];
			for (let i = end; i >= 0; i = previous[i]) {
				route.push([nodes[i].x, nodes[i].y]);
				if (i === start) break;
			}
			route.reverse();
			route.unshift([from.x, from.y]);
			route.push([to.x, to.y]);
			const points = route.filter(
				(p, i) =>
					i === 0 ||
					Math.hypot(p[0] - route[i - 1][0], p[1] - route[i - 1][1]) > 5,
			);
			const path = new E.Path(points, { smooth: "catmull" });
			return {
				path,
				points,
				samples: samplesFor(path, false),
				length: path.length,
				destination: { x: to.x, y: to.y },
			};
		}
		nearestRoad(x, y) {
			const list =
				this.segmentGrid.get(Math.floor(x / 128) + "," + Math.floor(y / 128)) ||
				[];
			let best = { distance: Infinity, road: null, d: 0 };
			for (const i of list) {
				const s = this.segments[i],
					p = closestOn(s.a, s.b, x, y),
					distance = Math.hypot(x - p.x, y - p.y);
				if (distance - s.width < best.distance - (best.road?.width || 0))
					best = {
						distance,
						road: s.road,
						d: s.a.d + (s.b.d - s.a.d) * p.t,
						x: p.x,
						y: p.y,
						angle: Math.atan2(s.b.y - s.a.y, s.b.x - s.a.x),
					};
			}
			return best;
		}
		surface(x, y) {
			const n = this.nearestRoad(x, y);
			if (n.road && n.distance < n.road.width) return "road";
			if (n.road && n.distance < n.road.width + 13) return "gravel";
			if (
				this.water.some(
					(w) => ((x - w.x) / w.rx) ** 2 + ((y - w.y) / w.ry) ** 2 < 1,
				)
			)
				return "water";
			if (
				this.gravel.some(
					(w) => ((x - w.x) / w.rx) ** 2 + ((y - w.y) / w.ry) ** 2 < 1,
				)
			)
				return "gravel";
			return "grass";
		}
		addProp(kind, x, y, options = {}) {
			if (this.surface(x, y) === "water") return;
			const nearest = this.nearestRoad(x, y);
			if (nearest.road && nearest.distance < nearest.road.width + 30) return;
			const p = { kind, x, y, seed: Math.floor(x * 11 + y * 7), ...options };
			this.props.push(p);
			if (options.solid !== false) {
				const r =
					options.r ||
					(["tree", "pine"].includes(kind)
						? 8
						: kind === "rock"
							? 8
							: kind === "bush"
								? 5
								: 24);
				this.solids.push({ kind, x, y, r, ...(options.collision || {}) });
			}
		}
		buildScenery() {
			const rng = E.rng(19801113);
			// Native trees and brush follow the road's outside, keeping the racing ribbon readable.
			for (let k = 0; k < 4; k++) {
				const c = this.courses[k];
				for (let d = 85; d < c.length; d += 77 + rng() * 40) {
					const p = c.path.at(d);
					for (const side of [-1, 1]) {
						if (rng() < 0.16) continue;
						const off = c.width + 55 + rng() * 95,
							x = p.x - Math.sin(p.angle) * off * side,
							y = p.y + Math.cos(p.angle) * off * side;
						const kind =
							k === 3
								? "pine"
								: rng() < 0.68
									? "tree"
									: rng() < 0.5
										? "bush"
										: "rock";
						this.addProp(kind, x, y, {
							h: k === 3 ? 32 + rng() * 20 : 27 + rng() * 15,
							scale: 0.8 + rng() * 0.4,
							r: kind === "tree" || kind === "pine" ? 8 : 6,
						});
					}
				}
			}
			// Background groves, hedges, orchard rows and gentle field textures.
			for (let i = 0; i < 600; i++) {
				const x = 260 + rng() * 5400,
					y = 260 + rng() * 5400,
					wood = x < 2400 && y > 3100;
				this.addProp(wood ? "pine" : rng() < 0.66 ? "tree" : "bush", x, y, {
					h: 28 + rng() * 20,
					scale: 0.8 + rng() * 0.4,
					r: wood ? 8 : 7,
				});
			}
			for (let row = 0; row < 9; row++)
				for (let col = 0; col < 12; col++)
					this.addProp("apple", 3650 + col * 100, 930 + row * 85, {
						h: 29,
						scale: 0.95,
						r: 8,
					});
			this.addProp("paddock", 830, 1600, { r: 38, scale: 1 });
			this.addProp("barn", 3780, 1440, { r: 47, scale: 1.5 });
			this.addProp("boathouse", 4580, 5280, { r: 30, scale: 1.2 });
			this.addProp("tower", 990, 4380, { r: 18, scale: 1.2 });
			this.addProp("windmill", 3050, 2940, { r: 28, scale: 1.4 });
			this.addProp("hangar", 3670, 2820, { r: 43, scale: 1.35 });
			for (const c of this.courses) {
				const p = c.gates[0],
					nx = -Math.sin(p.angle),
					ny = Math.cos(p.angle);
				this.props.push({
					kind: "routeSign",
					x: p.x + nx * (c.width + 25),
					y: p.y + ny * (c.width + 25),
					courseIndex: c.index,
					facing: p.angle,
				});
				for (let j = 0; j < 5; j++)
					this.addProp(
						"fence",
						p.x + nx * (c.width + 58) + Math.cos(p.angle) * (j - 2) * 27,
						p.y + ny * (c.width + 58) + Math.sin(p.angle) * (j - 2) * 27,
						{ solid: false, facing: p.angle + Math.PI / 2 },
					);
			}
		}
		validate() {
			const errors = [];
			for (const c of this.courses) {
				if (c.width < 25 || c.length < 1000 || c.gates.length < 4)
					errors.push("Invalid course " + c.id);
				if (c.samples.some((p) => !Number.isFinite(p.x + p.y + p.d)))
					errors.push("Non-finite samples " + c.id);
				for (const g of c.gates) {
					if (this.surface(g.x, g.y) !== "road")
						errors.push("Unsafe gate " + c.id);
					if (
						this.solids.some(
							(s) =>
								Math.hypot(s.x - g.x, s.y - g.y) < s.r + c.width * 0.4 + 12,
						)
					)
						errors.push("Obstructed gate " + c.id);
				}
			}
			return errors;
		}
	}
	HappyWorld.COURSE_DATA = COURSE_DATA;
	HappyWorld.CONNECTOR_DATA = CONNECTOR_DATA;
	globalThis.HappyWorld = HappyWorld;
})();
