/* Native shaded-pixel countryside, original vehicles and procedural animation. */
(() => {
	"use strict";
	const E = My3D2dge,
		px = E.px,
		TAU = Math.PI * 2;
	const COLORS = ["#f4eed6", "#62b978", "#ed634e", "#d5b17c", "#639cd3"];
	const plain = (c) => ({ color: c, pattern: "none" });
	E.MATERIALS.happyAsphalt = {
		color: "#666d6d",
		pattern: "speck",
		amount: 0.13,
		scale: 3,
	};
	E.SHAPES.happyWheel = {
		about: "small racing tyre with silver hub",
		mats: { t: plain("#252d36"), h: plain("#aaaeb0") },
		parts: [
			["box", "t", [0, 0, 0], [3.8, 6.2, 4.5]],
			["box", "h", [0, 0, 4.5], [2, 2.8, 0.5]],
		],
	};
	const bodies = [
		[
			["box", "paint", [0, -1, 3], [9, 21, 3]],
			["wedge", "paint", [0, 8, 3], [8, 6, 3]],
			["box", "stripe", [0, 6, 6], [2.1, 8, 0.4]],
			["box", "dark", [0, -2, 6], [6.2, 8, 2]],
			["box", "glass", [0, 1.5, 7.7], [5.8, 2.7, 0.5]],
			["box", "paint", [0, -7.5, 6], [8, 5, 1.5]],
			["box", "stripe", [0, -7.5, 7.6], [2, 5, 0.4]],
		],
		[
			["box", "paint", [0, 0, 3], [10.5, 20, 3.7]],
			["wedge", "paint", [0, 9, 3], [8, 5, 3.7]],
			["box", "glass", [0, 0, 6.8], [7.7, 7.5, 2.6]],
			["box", "paint", [0, -1, 9.5], [8, 4, 1]],
			["box", "stripe", [-3.6, 6, 7], [1, 7, 0.5]],
			["box", "stripe", [3.6, 6, 7], [1, 7, 0.5]],
			["box", "dark", [0, -9, 3], [11, 2, 2]],
		],
		[
			["box", "paint", [0, 0, 3], [8.8, 22, 3.5]],
			["wedge", "paint", [0, 10, 3], [7, 5, 3]],
			["box", "dark", [0, -1, 6.5], [6.6, 8, 2.4]],
			["box", "stripe", [0, 7, 6.7], [2, 7, 0.5]],
			["box", "paint", [0, -7, 6.5], [8.7, 5, 2]],
			["box", "stripe", [0, -7, 8.6], [2, 5, 0.4]],
			["box", "paint", [0, -10, 6], [14, 2, 1.2]],
		],
		[
			["box", "paint", [0, 0, 3], [8.5, 22, 3]],
			["wedge", "paint", [0, 9, 3], [6.5, 6, 3]],
			["box", "dark", [0, -1, 6], [6.5, 8, 2]],
			["box", "paint", [0, -7, 6], [9, 5, 1.5]],
			["box", "stripe", [0, 7, 6.5], [1.6, 8, 0.5]],
			["box", "paint", [0, -10, 6], [14.5, 2, 1.5]],
		],
		[
			["box", "paint", [0, 0, 3], [9.5, 21, 3.3]],
			["wedge", "paint", [0, 9, 3], [7, 6, 3]],
			["box", "glass", [0, -0.5, 6.5], [7, 8, 2.7]],
			["box", "paint", [0, -1, 9.3], [6, 4, 1]],
			["box", "stripe", [-2.8, 7, 6.7], [1.5, 7, 0.5]],
			["box", "stripe", [2.8, 7, 6.7], [1.5, 7, 0.5]],
			["box", "paint", [0, -10, 6], [14, 2, 1.5]],
		],
	];
	for (let i = 0; i < 5; i++)
		E.SHAPES["happyCar" + i] = {
			about: [
				"Mallow club racer",
				"Clover sprint coupe",
				"Poppy Grand Prix car",
				"Sandpiper fastback",
				"Bluebird touring coupe",
			][i],
			mats: {
				paint: plain(COLORS[i]),
				stripe: plain(i === 0 ? "#cc5949" : "#f8efd8"),
				dark: plain("#263640"),
				glass: plain("#75bbc4"),
			},
			parts: [
				...bodies[i],
				["ball", "helmet", [0, -1, 9], 2.2, { sz: 0.8 }],
				["box", "black", [0, 0.4, 9], [3.5, 1, 0.6]],
				["mirror", "x", ["box", "lamp", [3, 10, 4], [1.8, 1.5, 1]]],
			],
		};
	// Register material slots explicitly, preserving upstream native shading.
	for (let i = 0; i < 5; i++)
		Object.assign(E.SHAPES["happyCar" + i].mats, {
			helmet: plain("#fff0cf"),
			black: plain("#29303a"),
			lamp: plain("#fff3ab"),
		});
	E.SHAPES.happyBarn = {
		about: "red apple barn with cream doors and slate roof",
		mats: {
			w: { color: "#b95744", pattern: "planks", dir: "v" },
			r: { color: "#56616c", pattern: "shingles" },
			d: plain("#f4dfb0"),
			g: plain("#5ba9b4"),
		},
		parts: [
			["box", "w", [0, 0, 0], [65, 46, 34]],
			[
				"prism",
				"r",
				[0, 0, 34],
				[
					[-34, 0],
					[34, 0],
					[0, 21],
				],
				50,
				{ axis: "y" },
			],
			["box", "d", [0, 23, 0], [22, 1, 26]],
			["box", "w", [0, 24, 0], [2, 1, 26]],
			["box", "g", [-22, 24, 17], [9, 1, 9]],
			["box", "g", [22, 24, 17], [9, 1, 9]],
		],
	};
	E.SHAPES.happyPaddock = {
		about: "cream race club hut with striped awning",
		mats: {
			w: { color: "#ecddbd", pattern: "planks" },
			r: { color: "#6b8791", pattern: "shingles" },
			d: plain("#465967"),
			t: plain("#ef715a"),
		},
		parts: [
			["box", "w", [0, 0, 0], [52, 33, 25]],
			[
				"prism",
				"r",
				[0, 0, 25],
				[
					[-29, 0],
					[29, 0],
					[0, 14],
				],
				39,
				{ axis: "y" },
			],
			["box", "d", [0, 17, 0], [10, 1, 20]],
			["box", "d", [-17, 17, 10], [11, 1, 9]],
			["box", "d", [17, 17, 10], [11, 1, 9]],
			["box", "t", [0, 22, 22], [54, 15, 2]],
			["mirror", "x", ["box", "w", [24, 28, 0], [2, 2, 22]]],
		],
	};
	E.SHAPES.happyBoathouse = {
		about: "blue lakeside boathouse",
		mats: {
			w: { color: "#638f9a", pattern: "planks" },
			r: { color: "#baa77d", pattern: "shingles" },
			d: plain("#314f5c"),
		},
		parts: [
			["box", "w", [0, 0, 0], [46, 37, 25]],
			[
				"prism",
				"r",
				[0, 0, 25],
				[
					[-25, 0],
					[25, 0],
					[0, 15],
				],
				41,
				{ axis: "y" },
			],
			["box", "d", [0, 19, 0], [25, 1, 21]],
			["box", "wood", [0, 28, 0], [50, 18, 2]],
		],
	};
	E.SHAPES.happyTower = {
		about: "timber fire lookout tower",
		mats: {
			w: { color: "#9b845e", pattern: "planks" },
			r: plain("#596d72"),
			d: plain("#29434c"),
		},
		parts: [
			["mirror", "xy", ["box", "w", [10, 10, 0], [3, 3, 59]]],
			["box", "w", [0, 0, 47], [28, 28, 3]],
			["box", "w", [0, 0, 50], [23, 23, 16]],
			["box", "d", [0, 12, 56], [17, 1, 7]],
			["box", "r", [0, 0, 66], [32, 32, 4]],
			["row", 7, [0, 0, 7], ["box", "w", [0, 13, 3], [20, 2, 1.3]]],
		],
	};
	E.SHAPES.happyWindmill = {
		about: "round plaster windmill with timber cap",
		mats: {
			w: { color: "#e1d6b0", pattern: "speck" },
			r: { color: "#9d6248", pattern: "shingles" },
			d: plain("#5e655d"),
		},
		parts: [
			["cyl", "w", [0, 0, 0], 16, 54, { r2: 11 }],
			["cyl", "r", [0, 0, 54], 17, 20, { r2: 0, seg: 8 }],
			["box", "d", [0, 16, 0], [9, 1, 17]],
			["box", "d", [0, 13, 33], [7, 1, 9]],
		],
	};
	E.SHAPES.happyHangar = {
		about: "old airfield maintenance shed",
		mats: {
			w: { color: "#a6a398", pattern: "metal" },
			r: { color: "#6d817d", pattern: "planks" },
			d: plain("#3f5658"),
		},
		parts: [
			["box", "w", [0, 0, 0], [68, 45, 24]],
			[
				"prism",
				"r",
				[0, 0, 24],
				[
					[-36, 0],
					[36, 0],
					[29, 14],
					[-29, 14],
				],
				49,
				{ axis: "y" },
			],
			["box", "d", [0, 23, 0], [48, 1, 21]],
		],
	};
	E.SHAPES.happySign = {
		about: "cream route sign on timber post",
		mats: { w: "oak", s: plain("#f1e4bd"), d: plain("#566e69") },
		parts: [
			["box", "w", [0, 0, 0], [2, 2, 29]],
			["box", "s", [0, 0, 20], [29, 3, 15]],
			["box", "d", [0, 1.7, 23], [24, 0.6, 1.5]],
			["box", "d", [0, 1.7, 28], [24, 0.6, 1.5]],
		],
	};
	E.SHAPES.happyApple = {
		about: "round apple tree with bright fruit",
		mats: {
			t: "bark",
			l: { color: "#77a662", pattern: "foliage" },
			a: plain("#dc6951"),
		},
		parts: [
			["cyl", "t", [0, 0, 0], 2.3, 22, { r2: 1.4 }],
			["ball", "l", [0, 0, 24], 15, { sz: 0.85 }],
			["ball", "a", [7, 4, 30], 2],
			["ball", "a", [-6, 7, 25], 2],
			["ball", "a", [-5, -5, 33], 1.9],
		],
	};
	const shapeKinds = {
		apple: "happyApple",
		barn: "happyBarn",
		paddock: "happyPaddock",
		boathouse: "happyBoathouse",
		tower: "happyTower",
		windmill: "happyWindmill",
		hangar: "happyHangar",
		routeSign: "happySign",
	};
	const hash = (x, y) =>
		(Math.imul(x | 0, 73856093) ^ Math.imul(y | 0, 19349663)) >>> 0;
	function quad(r, a, b, wa, wb, color) {
		const ax = -Math.sin(a.angle) * wa,
			ay = Math.cos(a.angle) * wa,
			bx = -Math.sin(b.angle) * wb,
			by = Math.cos(b.angle) * wb;
		px.poly(
			r.ctx,
			[
				r.w(a.x + ax, a.y + ay),
				r.w(b.x + bx, b.y + by),
				r.w(b.x - bx, b.y - by),
				r.w(a.x - ax, a.y - ay),
			],
			color,
		);
	}
	function band(r, a, b, w0, w1, side, color) {
		const ax = -Math.sin(a.angle) * side,
			ay = Math.cos(a.angle) * side,
			bx = -Math.sin(b.angle) * side,
			by = Math.cos(b.angle) * side;
		px.poly(
			r.ctx,
			[
				r.w(a.x + ax * w0, a.y + ay * w0),
				r.w(b.x + bx * w0, b.y + by * w0),
				r.w(b.x + bx * w1, b.y + by * w1),
				r.w(a.x + ax * w1, a.y + ay * w1),
			],
			color,
		);
	}
	class HappyRenderer {
		constructor(game, world) {
			this.game = game;
			this.world = world;
			this.time = 0;
			this.dust = [];
			this.skids = [];
			this.previous = [];
			this.emit = 0;
			this.rng = E.rng(2026);
			this.carMotion = new WeakMap();
		}
		update(dt, sim) {
			this.time += dt;
			for (const c of sim.cars || []) {
				const old = this.carMotion.get(c) || {
					angle: c.angle,
					steer: 0,
					crashed: false,
				};
				const turn = Math.atan2(
					Math.sin(c.angle - old.angle),
					Math.cos(c.angle - old.angle),
				);
				const steer =
					old.steer * 0.7 +
					Math.max(-1, Math.min(1, turn / (Math.max(0.001, dt) * 2.3))) * 0.3;
				if (c.crashed && !old.crashed) {
					const water = c.surface === "water";
					for (let i = 0; i < 18; i++) {
						const a = (i / 18) * TAU,
							v = 15 + this.rng() * 22;
						this.dust.push({
							x: c.x,
							y: c.y,
							vx: Math.cos(a) * v,
							vy: Math.sin(a) * v,
							t: water ? 1.1 : 0.7,
							max: water ? 1.1 : 0.7,
							r: water ? 2.5 : 1.4,
							color: water ? "#d7ede0" : "#e4d5a4",
						});
					}
				}
				this.carMotion.set(c, { angle: c.angle, steer, crashed: !!c.crashed });
			}
			this.emit += dt;
			if (this.emit > 0.045) {
				this.emit = 0;
				for (let i = 0; i < (sim.cars || []).length; i++) {
					const c = sim.cars[i],
						speed = Math.hypot(c.vx || 0, c.vy || 0),
						surface = c.surface || this.world.surface(c.x, c.y);
					if (
						speed > 35 &&
						(surface !== "road" || Math.abs(c.slide || 0) > 12)
					) {
						const a = c.angle || 0,
							back = { x: c.x - Math.cos(a) * 10, y: c.y - Math.sin(a) * 10 };
						this.dust.push({
							...back,
							vx: -Math.cos(a) * 10 + (this.rng() - 0.5) * 12,
							vy: -Math.sin(a) * 10 + (this.rng() - 0.5) * 12,
							t: 0.65,
							max: 0.65,
							r: 1.5 + this.rng() * 2,
							color:
								surface === "water"
									? "#c2e6e0"
									: surface === "grass"
										? "#becb87"
										: "#d5c3a1",
						});
						if (surface === "road" && this.previous[i])
							this.skids.push({
								a: this.previous[i],
								b: { x: c.x, y: c.y },
								t: 6,
							});
					}
					this.previous[i] = { x: c.x, y: c.y };
				}
			}
			for (const p of this.dust) {
				p.x += p.vx * dt;
				p.y += p.vy * dt;
				p.t -= dt;
				p.r += dt * 3;
			}
			this.dust = this.dust.filter((p) => p.t > 0).slice(-90);
			for (const p of this.skids) p.t -= dt;
			this.skids = this.skids.filter((p) => p.t > 0).slice(-240);
		}
		ground(r) {
			const world = this.world,
				g = r.ctx;
			px.rect(g, 0, 0, r.W + 2, r.H + 2, "#89a872");
			const focus = this.game.cam;
			const cx = focus.tx ?? world.courses[0].gates[0].x,
				cy = focus.ty ?? world.courses[0].gates[0].y;
			const spanX = r.W / r.ppu + 130,
				spanY = r.H / r.ppu + 160;
			// Mown stripes, quiet field details and tiny daisies establish scale without cluttering the road.
			const x0 = Math.floor((cx - spanX) / 64) * 64,
				y0 = Math.floor((cy - spanY) / 64) * 64;
			for (let y = y0; y < cy + spanY; y += 64)
				for (let x = x0; x < cx + spanX; x += 64) {
					const h = hash(x / 64, y / 64),
						col =
							(Math.floor(y / 128) + Math.floor(x / 512)) & 1
								? "#8fae77"
								: "#87a46f";
					px.poly(
						g,
						[r.w(x, y), r.w(x + 64, y), r.w(x + 64, y + 64), r.w(x, y + 64)],
						col,
					);
					for (let j = 0; j < 3; j++) {
						const xx = x + ((h >> (j * 5)) & 31) * 2,
							yy = y + ((h >> (j * 3 + 7)) & 31) * 2,
							p = r.w(xx, yy);
						px.rect(
							g,
							p[0],
							p[1],
							1,
							1,
							j === 0 && h % 11 === 0 ? "#e8dfb1" : "#a0b582",
						);
					}
				}
			for (const w of world.water) {
				if (
					!r.visible(
						w.x,
						w.y,
						0,
						w.rx * r.ppu + 30,
						w.ry * r.ppu + 30,
						w.ry * r.ppu + 30,
					)
				)
					continue;
				for (let ring = 0; ring < 3; ring++) {
					const rr = 1 - ring * 0.026,
						pts = [];
					for (let i = 0; i < 72; i++) {
						const angle = (i / 72) * TAU;
						pts.push(
							r.w(
								w.x + Math.cos(angle) * (w.rx + 17) * rr,
								w.y + Math.sin(angle) * (w.ry + 17) * rr,
							),
						);
					}
					px.poly(g, pts, ["#b9c9a0", "#668f91", "#5a9da4"][ring]);
				}
				for (let y = w.y - w.ry; y < w.y + w.ry; y += 27)
					for (let x = w.x - w.rx; x < w.x + w.rx; x += 37) {
						if (((x - w.x) / w.rx) ** 2 + ((y - w.y) / w.ry) ** 2 > 0.93)
							continue;
						const p = r.w(x + Math.sin(this.time * 0.9 + y) * 3, y);
						px.line(g, p[0], p[1], p[0] + 5, p[1], "#76b2b5");
					}
			}
			for (const w of world.gravel) {
				const pts = [];
				for (let i = 0; i < 40; i++) {
					const a = (i / 40) * TAU;
					pts.push(r.w(w.x + Math.cos(a) * w.rx, w.y + Math.sin(a) * w.ry));
				}
				px.poly(g, pts, "#b7ad8b");
			}
			const visible = [];
			for (const road of world.roads)
				for (let i = 0; i < road.samples.length - 1; i++) {
					const a = road.samples[i],
						b = road.samples[i + 1];
					if (
						r.visible(
							(a.x + b.x) / 2,
							(a.y + b.y) / 2,
							0,
							(road.width + 25) * r.ppu,
							(road.width + 25) * r.ppu,
							(road.width + 25) * r.ppu,
						)
					)
						visible.push({ road, a, b, i });
				}
			for (const { road, a, b } of visible)
				quad(r, a, b, road.width + 11, road.width + 11, "#b7b697");
			for (const { road, a, b } of visible)
				quad(
					r,
					a,
					b,
					road.width + 2,
					road.width + 2,
					road.connector ? "#b7b3a0" : "#dddcc8",
				);
			for (const { road, a, b } of visible)
				quad(
					r,
					a,
					b,
					road.width,
					road.width,
					road.connector ? "#7a7e77" : "#687578",
				);
			for (const { road, a, b, i } of visible) {
				if (!road.connector && i % 2 === 0) {
					for (const side of [-1, 1]) {
						const mx =
								(a.x + b.x) / 2 - Math.sin(a.angle) * (road.width + 4) * side,
							my =
								(a.y + b.y) / 2 + Math.cos(a.angle) * (road.width + 4) * side;
						const other = world.nearestRoad(mx, my);
						if (other.distance < other.road?.width - 2) continue;
						band(
							r,
							a,
							b,
							road.width + 2,
							road.width + 7,
							side,
							((i / 2) | 0) % 2 ? "#e3dfc6" : "#c9715b",
						);
					}
				}
				if (i % 5 === 0 && !road.drag) {
					const p = r.w(a.x, a.y),
						q = r.w(b.x, b.y);
					px.line(
						g,
						p[0],
						p[1],
						q[0],
						q[1],
						road.connector ? "#babdaa" : "#b3bdaf",
						1,
					);
				}
				if (i % 3 === 0) {
					const h = hash(a.x | 0, a.y | 0),
						off = (((h % 45) - 22) / 24) * road.width,
						xx = a.x - Math.sin(a.angle) * off,
						yy = a.y + Math.cos(a.angle) * off,
						p = r.w(xx, yy);
					px.rect(g, p[0], p[1], 1, 1, "#748184");
				}
			}
			// The original racing line has an unmistakable checked start, visible from every heading.
			for (const c of world.courses) {
				const p = c.gates[0];
				if (!r.visible(p.x, p.y, 0, 100, 100, 100)) continue;
				for (let col = 0; col < 2; col++)
					for (let row = 0; row < Math.floor((c.width * 2) / 7); row++) {
						const f = (col - 0.5) * 7,
							s = -c.width + (row + 0.5) * 7,
							x = p.x + Math.cos(p.angle) * f - Math.sin(p.angle) * s,
							y = p.y + Math.sin(p.angle) * f + Math.cos(p.angle) * s;
						const aa = {
								x: x - Math.cos(p.angle) * 3.5,
								y: y - Math.sin(p.angle) * 3.5,
								angle: p.angle,
							},
							bb = {
								x: x + Math.cos(p.angle) * 3.5,
								y: y + Math.sin(p.angle) * 3.5,
								angle: p.angle,
							};
						quad(r, aa, bb, 3.5, 3.5, (row + col) & 1 ? "#e8e3c7" : "#35434b");
					}
			}
			const d = world.drag;
			for (const [i, p] of [d.start, d.finish].entries()) {
				if (!r.visible(p.x, p.y, 0, 80, 80, 80)) continue;
				px.poly(
					g,
					[
						r.w(p.x - 3, p.y - d.width),
						r.w(p.x + 3, p.y - d.width),
						r.w(p.x + 3, p.y + d.width),
						r.w(p.x - 3, p.y + d.width),
					],
					i ? "#d6c45a" : "#e5dfc5",
				);
			}
		}
		drawCar(r, c, index = 0, ghost = false) {
			if (!Number.isFinite(c.x + c.y)) return;
			const angle = c.angle || 0,
				profile = Math.max(0, Math.min(4, c.profile ?? index)),
				crashed = !!c.crashed;
			const bob = this.game.reduceMotion
				? 0
				: crashed
					? Math.abs(Math.sin(this.time * 14)) * 2
					: Math.sin(this.time * 8 + index) *
						Math.min(1, Math.abs(c.speed || 0) / 130) *
						0.25;
			const alpha = ghost
				? 0.32
				: !this.game.reduceMotion &&
						c.immunity > 0 &&
						Math.floor(this.time * 9) % 2
					? 0.62
					: 1;
			const lean = Math.max(-1.3, Math.min(1.3, (c.slide || 0) / 25));
			r.shadow(c.x, c.y, 9, 0.35);
			for (const side of [-1, 1])
				for (const front of [-1, 1]) {
					const localx = front * 7,
						localy = side * 7,
						x = c.x + Math.cos(angle) * localx - Math.sin(angle) * localy,
						y = c.y + Math.sin(angle) * localx + Math.cos(angle) * localy;
					const steering =
						front > 0
							? Math.max(
									-0.45,
									Math.min(0.45, c.steer ?? this.carMotion.get(c)?.steer ?? 0),
								) * 0.5
							: 0;
					r.shape("happyWheel", x, y, 0, {
						facing: angle + steering,
						charView: false,
						alpha,
						shadow: false,
					});
					if (
						Math.abs(c.speed || 0) > 40 &&
						Math.floor(this.time * Math.abs(c.speed) * 0.05) % 2
					) {
						const a = r.w(x, y, 4.7),
							b = r.w(
								x + Math.cos(angle) * 1.2,
								y + Math.sin(angle) * 1.2,
								4.7,
							);
						px.line(r.ctx, a[0], a[1], b[0], b[1], "#66757c");
					}
				}
			r.shape(
				"happyCar" + profile,
				c.x - Math.sin(angle) * lean,
				c.y + Math.cos(angle) * lean,
				1 + bob,
				{
					facing: angle,
					charView: false,
					alpha,
					shadow: false,
					xray: true,
					flash: crashed && !this.game.reduceMotion,
				},
			);
			if (crashed) {
				for (let j = 0; j < 4; j++) {
					const a = this.time * 3 + (j * TAU) / 4,
						p = r.w(c.x + Math.cos(a) * 13, c.y + Math.sin(a) * 10, 15);
					px.line(r.ctx, p[0] - 2, p[1], p[0] + 2, p[1], "#ffe49c");
					px.line(r.ctx, p[0], p[1] - 2, p[0], p[1] + 2, "#ffe49c");
				}
			}
			if (!ghost && (this.game.__happyMode === "duel" || index > 0))
				r.textAt(
					c.x,
					c.y,
					21,
					index === 0 ? "1" : "2",
					index === 0 ? "#fff2c4" : "#a3dcf4",
					{ outline: "#253d48", scale: 1 },
				);
		}
		draw(r, sim, o = {}) {
			this.ground(r);
			for (const s of this.skids) {
				const a = r.w(s.a.x, s.a.y),
					b = r.w(s.b.x, s.b.y);
				px.line(r.ctx, a[0], a[1], b[0], b[1], "#53605e", 2);
			}
			for (const p of this.dust)
				if (r.visible(p.x, p.y))
					r.groundDisc(p.x, p.y, p.r, p.color, (p.t / p.max) * 0.6);
			const course = this.world.courses[sim.courseIndex || 0];
			// Direction arrows combine shape and colour; they survive colour-vision differences.
			if (sim.mode !== "free" && !o.menu) {
				for (let d = 32; d < course.length; d += 105) {
					const p = course.path.at(d);
					if (!r.visible(p.x, p.y, 0, 15, 15, 15)) continue;
					const a = p.angle,
						pts = [
							[6, 0],
							[-4, -4],
							[-1, 0],
							[-4, 4],
						].map(([x, y]) =>
							r.w(
								p.x + Math.cos(a) * x - Math.sin(a) * y,
								p.y + Math.sin(a) * x + Math.cos(a) * y,
							),
						);
					px.poly(r.ctx, pts, "#ddc77e");
				}
			}
			const navigation = o.navigation || sim.navigation;
			if (sim.mode === "free" && navigation?.samples) {
				for (let i = 0; i < navigation.samples.length; i += 4) {
					const p = navigation.samples[i];
					if (!r.visible(p.x, p.y, 0, 8, 8, 8)) continue;
					r.groundDisc(p.x, p.y, 2.3, "#f5dda1", 0.9);
				}
				const goal = navigation.destination || navigation.samples.at(-1);
				if (goal)
					r.marker(goal.x, goal.y, 13, {
						label: "NEXT PADDOCK",
						color: "#f3d77c",
						offscreen: "arrow",
					});
			}
			for (const p of this.world.props) {
				if (!r.visible(p.x, p.y, 0, 80, 120, 80)) continue;
				const id = shapeKinds[p.kind] || p.kind;
				r.shape(id, p.x, p.y, 0, {
					facing: p.facing ?? Math.PI / 2,
					scale: p.scale || 1,
					params: { h: p.h || 36, seed: p.seed || 1 },
					shadow: true,
				});
				if (p.kind === "routeSign") {
					const col = this.world.courses[p.courseIndex].color;
					r.textAt(p.x, p.y, 34, "" + (p.courseIndex + 1), col, {
						scale: 1,
						outline: "#30494b",
					});
				}
				if (p.kind === "windmill") {
					const z = 47 * (p.scale || 1),
						center = r.w(p.x, p.y + 17, z);
					for (let j = 0; j < 4; j++) {
						const a = this.time * 0.5 + (j * TAU) / 4,
							rr = 30 * r.ppu;
						px.line(
							r.ctx,
							center[0],
							center[1],
							center[0] + Math.cos(a) * rr,
							center[1] + Math.sin(a) * rr,
							"#e7d9aa",
							3,
						);
					}
				}
			}
			if (o.ghost) this.drawCar(r, o.ghost, 0, true);
			(sim.cars || []).forEach((c, i) => this.drawCar(r, c, i));
			if (!o.menu) {
				const next =
						sim.cars?.[0]?.route?.gate ??
						sim.cars?.[0]?.route?.next ??
						sim.gateIndex ??
						1,
					g = course.gates[next % course.gates.length];
				if (g && sim.mode !== "free") {
					r.marker(g.x, g.y, 8, {
						label: "GATE " + (next || 12),
						color: "#f7d77b",
						offscreen: "arrow",
					});
					if (r.visible(g.x, g.y, 0, 100, 100, 100)) {
						for (const side of [-1, 1]) {
							const x = g.x - Math.sin(g.angle) * course.width * side,
								y = g.y + Math.cos(g.angle) * course.width * side;
							r.shape("happySign", x, y, 0, {
								scale: 0.42,
								facing: g.angle,
								shadow: true,
							});
						}
					}
				}
			}
			// Paddock pennants: the native world supplies the title vignette and the finish celebration.
			for (const c of this.world.courses) {
				const p = c.gates[0],
					nx = -Math.sin(p.angle),
					ny = Math.cos(p.angle);
				for (const side of [-1, 1]) {
					const x = p.x + nx * (c.width + 12) * side,
						y = p.y + ny * (c.width + 12) * side;
					if (!r.visible(x, y, 0, 30, 60, 30)) continue;
					r.queue(x, y, 0, (g) => {
						const a = r.w(x, y, 0),
							b = r.w(x, y, 34);
						px.line(g, a[0], a[1], b[0], b[1], "#e9dfbc", 1);
						const wave = Math.sin(this.time * 4 + c.index) * 2;
						px.poly(
							g,
							[
								b,
								[b[0] + 13, b[1] + wave],
								[b[0] + 12, b[1] + 8 + wave],
								[b[0], b[1] + 7],
							],
							c.color,
						);
					});
				}
			}
			if (o.dev) {
				for (const g of course.gates) {
					const a = r.w(
							g.x - Math.sin(g.angle) * course.width,
							g.y + Math.cos(g.angle) * course.width,
						),
						b = r.w(
							g.x + Math.sin(g.angle) * course.width,
							g.y - Math.cos(g.angle) * course.width,
						);
					px.line(r.ctx, ...a, ...b, "#ffe98d", 1);
				}
				for (const s of this.world.solids)
					if (r.visible(s.x, s.y)) r.groundRing(s.x, s.y, s.r, "#ff8e7e", 0.7);
			}
		}
	}
	HappyRenderer.COLORS = COLORS;
	globalThis.HappyRenderer = HappyRenderer;
})();
