((M, E) => {
	const S = E.SHAPES,
		px = E.px;
	const mat = (color, pattern = "none") => ({ color, pattern });
	const bodyParts = (color, stripe, variant) => [
		[
			"prism",
			"body",
			[0, 0, 1],
			[
				[-4.8, -10],
				[-6, -5],
				[-5, 5],
				[-3.2, 11],
				[3.2, 11],
				[5, 5],
				[6, -5],
				[4.8, -10],
			],
			3.4,
		],
		["box", "stripe", [0, 6, 4.4], [2.1, 10, 0.6]],
		["box", "dark", [0, -2, 4], [5.8, 7, 2]],
		["box", "body", [0, -7.7, 4], [6.6, 3, 2.3]],
		["box", "body", [0, 9, 2.2], [15, 2.2, 1.6]],
		["box", "dark", [0, -10, 3], [16, 2, 1.1]],
		["box", "stripe", [0, -10, 4.1], [14, 1, 0.5]],
		["box", "metal", [-3, -2, 4.5], [0.6, 6, 1]],
		["box", "metal", [3, -2, 4.5], [0.6, 6, 1]],
		["box", "body", [variant ? 4.5 : -4.5, -4.5, 4], [1, 5, 1]],
	];
	for (let i = 0; i < M.CARS.length; i++) {
		const c = M.CARS[i];
		S["amm-car-" + c.id] = {
			about: c.name + " open wheel county racer",
			tags: "original vehicle",
			foot: [-8, -11, 8, 11],
			mats: {
				body: mat(c.color, "metal"),
				stripe: mat(c.stripe),
				dark: mat("#253538"),
				metal: mat("#e2d5ae"),
				helmet: mat(i % 2 ? "#fff1cc" : "#f5d867"),
				visor: mat("#263d45"),
			},
			parts: bodyParts(c.color, c.stripe, i % 2),
		};
	}
	S["amm-wheel"] = {
		about: "steerable tyre and hub",
		tags: "original vehicle",
		mats: {
			rubber: mat("#263235"),
			tread: mat("#4b5756"),
			hub: mat("#b9c5b6"),
		},
		parts: [
			["box", "rubber", [0, 0, 0], [3.5, 5.5, 3.5]],
			["box", "tread", [0, 0, 3.5], [2.5, 4.2, 0.4]],
			["box", "hub", [0, 0, 3.9], [1.2, 2.2, 0.3]],
		],
	};
	S["amm-driver"] = {
		about: "leaning helmet and visor group",
		mats: { h: mat("#f6dfa0"), v: mat("#263f48") },
		parts: [
			["ball", "h", [0, 0, 1], 2.25, { sz: 0.85 }],
			["box", "v", [0, 1.6, 1], [3.6, 1, 1]],
		],
	};
	S["amm-cone"] = {
		about: "striped road marker",
		mats: { o: mat("#e67748"), w: mat("#fff1c8"), b: mat("#4b5147") },
		parts: [
			["box", "b", [0, 0, 0], [5, 5, 1]],
			["cyl", "o", [0, 0, 1], 2.2, 5, { r2: 0.5, seg: 4 }],
			["cyl", "w", [0, 0, 3.4], 1.3, 1.3, { r2: 0.9, seg: 4 }],
		],
	};
	S["amm-sign"] = {
		about: "county chevron on two posts",
		mats: { p: mat("#e6dec0"), d: mat("#29454a"), m: "oak" },
		parts: [
			["box", "m", [-5, 0, 0], [1.5, 1.5, 14]],
			["box", "m", [5, 0, 0], [1.5, 1.5, 14]],
			["box", "p", [0, 0, 10], [18, 2, 9]],
			[
				"prism",
				"d",
				[0, 1.1, 10],
				[
					[-4, 1],
					[0, 4],
					[-4, 7],
					[0, 7],
					[4, 4],
					[0, 1],
				],
				0.5,
				{ axis: "y" },
			],
		],
	};
	S["amm-flagpost"] = {
		about: "checkpoint flag pole",
		mats: { m: "birch", c: mat("#fff0be"), d: mat("#38535a") },
		parts: [
			["cyl", "m", [0, 0, 0], 0.7, 20],
			["box", "c", [4, 0, 15], [8, 0.6, 5]],
			["box", "d", [2, 0, 15], [3, 0.8, 2]],
			["box", "d", [6, 0, 18], [3, 0.8, 2]],
		],
	};
	const building = (wall, roof, w, d, h) => ({
		mats: {
			wall: mat(wall, "planks"),
			roof: mat(roof, "shingles"),
			trim: mat("#f6e2b4"),
			glass: mat("#416d76"),
			door: mat("#374748"),
		},
		parts: [
			["box", "wall", [0, 0, 0], [w, d, h]],
			[
				"prism",
				"roof",
				[0, 0, h],
				[
					[-w / 2 - 3, 0],
					[0, h * 0.55],
					[w / 2 + 3, 0],
				],
				d + 5,
				{ axis: "y" },
			],
			["box", "trim", [0, d / 2 + 0.2, 2], [w * 0.75, 1, 2]],
			["box", "door", [0, d / 2 + 0.5, 0], [w * 0.22, 1, h * 0.65]],
			[
				"box",
				"glass",
				[-w * 0.29, d / 2 + 0.6, h * 0.45],
				[w * 0.18, 1, h * 0.3],
			],
			[
				"box",
				"glass",
				[w * 0.29, d / 2 + 0.6, h * 0.45],
				[w * 0.18, 1, h * 0.3],
			],
		],
	});
	S["amm-paddock"] = {
		about: "red county clubhouse and pit veranda",
		...building("#cf6448", "#574d46", 56, 38, 23),
	};
	S["amm-barn"] = {
		about: "apple barn with cream bracing",
		...building("#b65c45", "#626963", 74, 58, 38),
	};
	S["amm-lodge"] = {
		about: "woodland lodge with moss roof",
		...building("#a28a59", "#637961", 72, 56, 32),
	};
	S["amm-boathouse"] = {
		about: "lakeside boathouse",
		...building("#c8ab72", "#75989b", 50, 36, 25),
	};
	S["amm-hangar"] = {
		about: "old airfield hangar",
		...building("#b6b8a1", "#718587", 86, 54, 30),
	};
	S["amm-mill"] = {
		about: "cream windmill tower with copper cap",
		mats: {
			w: mat("#e7d2a3", "plaster"),
			r: mat("#947454", "shingles"),
			d: mat("#4c6061"),
		},
		parts: [
			["cyl", "w", [0, 0, 0], 15, 45, { r2: 8, seg: 8 }],
			["cyl", "r", [0, 0, 45], 12, 15, { r2: 0, seg: 8 }],
			["box", "d", [0, 14, 0], [7, 2, 14]],
		],
	};
	S["amm-observatory"] = {
		about: "county observatory",
		mats: {
			w: mat("#d1c6ab", "stones"),
			d: mat("#73969a", "metal"),
			g: mat("#233c46"),
		},
		parts: [
			["cyl", "w", [0, 0, 0], 32, 29, { seg: 12 }],
			["ball", "d", [0, 0, 28], 33, { sz: 0.7 }],
			["box", "g", [0, 0, 46], [7, 48, 2]],
			["box", "w", [0, 28, 0], [14, 12, 18]],
		],
	};

	class Presentation {
		constructor(game, world) {
			this.game = game;
			this.world = world;
			this.skids = [];
			this.lastFxTick = 0;
			this.pulse = { k: 0 };
			this.lastEvent = 0;
			this.cam = { x: 780, y: 1690 };
			this.mode = "title";
			this.ghost = null;
			this.crew = [0, 1, 2].map((i) => ({
				x: 1080 + i * 22,
				y: 1565,
				rig: new E.Humanoid({
					size: 0.45,
					weapon: null,
					hat: "cap",
					hair: "short",
					colors: {
						cloth: ["#f3db9f", "#659a7d", "#c96d52"][i],
						pants: "#334d50",
						hair: "#513b2c",
						trim: "#fff0c8",
					},
				}),
			}));
		}
		event(e, sim) {
			if (e.id <= this.lastEvent) return;
			this.lastEvent = e.id;
			const P = this.game.particles;
			if (e.type === "crash") {
				if (e.reason === "Deep water") {
					P.bits(e.x, e.y, 0, 25, ["#a9e1da", "#eff7d5", "#65adb9"]);
					P.ring(e.x, e.y, 4, 45, "#d2f0db", 1);
				} else {
					P.impact(e.x, e.y, 4, 16, "#ffe39a");
					P.sparks(e.x, e.y, 3, 15, sim.drivers[e.driver].car.angle);
				}
			}
			if (e.type === "point" || e.type === "finish") {
				this.pulse.k = 1;
				this.game.tween(this.pulse, { k: 0 }, 0.7, { ease: "outQuad" });
			}
		}
		update(
			sim,
			dt,
			{
				title = false,
				attract = false,
				freeCamera = false,
				reduced = false,
				remote = false,
			} = {},
		) {
			if (remote)
				for (const D of sim.drivers) {
					const c = D.car;
					if (!D.visual)
						D.visual = {
							x: c.x,
							y: c.y,
							angle: c.angle,
							speed: c.speed,
							slide: c.slide,
						};
					const v = D.visual;
					const k = 1 - Math.exp(-dt * 18);
					if (Math.hypot(v.x - c.x, v.y - c.y) > 70) {
						v.x = c.x;
						v.y = c.y;
						v.angle = c.angle;
					} else {
						v.x += (c.x - v.x) * k;
						v.y += (c.y - v.y) * k;
						v.angle += E.angDiff(v.angle, c.angle) * k;
					}
					v.speed = c.speed;
					v.slide = c.slide;
				}
			for (const c of this.crew)
				c.rig.update(dt, {
					x: c.x,
					y: c.y,
					z: 0,
					facing: Math.PI / 2,
					pose: sim.phase === "finished" ? "cheer" : "wave",
					expr: sim.phase === "finished" ? "smile" : "shout",
				});
			const cars = sim.drivers.map((D) => D.visual || D.car),
				a = cars[0],
				b = cars[1];
			let x = a.x,
				y = a.y;
			if (b) {
				x = (a.x + b.x) / 2;
				y = (a.y + b.y) / 2;
			}
			if (title) {
				x = a.x - 105;
				y = a.y - 35;
			} else if (!b) {
				x += Math.cos(a.angle) * 28;
				y += Math.sin(a.angle) * 28;
			}
			if (!freeCamera) {
				const k = 1 - Math.exp(-dt * (reduced ? 12 : 7));
				this.cam.x += (x - this.cam.x) * k;
				this.cam.y += (y - this.cam.y) * k;
				this.game.focus(this.cam.x, this.cam.y, 0);
			}
			let zoom = title
				? 0.86
				: b
					? E.clamp(355 / (Math.hypot(a.x - b.x, a.y - b.y) + 200), 0.68, 1.05)
					: 1.05;
			if (this.game.W < this.game.H) zoom = b ? 0.68 : 0.9;
			if (Math.abs(this.game.zoom - zoom) > 0.01) this.game.setZoom(zoom);
			if (sim.tick !== this.lastFxTick) {
				this.lastFxTick = sim.tick;
				if (sim.phase === "running")
					for (const D of sim.drivers) {
						const c = D.car;
						if (
							sim.tick % 8 === 0 &&
							Math.abs(c.speed) > 25 &&
							(c.offroad || Math.abs(c.slide) > 10)
						) {
							this.game.particles.smoke(
								c.x - Math.cos(c.angle) * 10,
								c.y - Math.sin(c.angle) * 10,
								0,
								1,
								{
									size: c.surface === "gravel" ? 1 : 0.6,
									color:
										c.surface === "grass"
											? "#a9b67e"
											: c.surface === "gravel"
												? "#d4c7a4"
												: "#ded7be",
								},
							);
						}
						if (
							sim.tick % 5 === 0 &&
							Math.abs(c.slide) > 10 &&
							c.surface === "road"
						)
							this.skids.push({ x: c.x, y: c.y, a: c.angle, t: sim.time });
					}
				this.skids = this.skids.filter((s) => sim.time - s.t < 18).slice(-700);
			}
			for (const e of sim.events) this.event(e, sim);
		}
		groundPolygon(r, pts, color) {
			px.poly(
				r.tgt,
				pts.map((p) => r.w(p[0], p[1], 0)),
				color,
			);
		}
		groundLine(r, a, b, color, width = 1) {
			const x = r.w(a.x, a.y, 0),
				y = r.w(b.x, b.y, 0);
			px.line(r.tgt, x[0], x[1], y[0], y[1], color, width * r.ppu);
		}
		visibleSegment(r, a, b, pad = 90) {
			const p = r.w(a.x, a.y, 0),
				q = r.w(b.x, b.y, 0);
			return !(
				Math.max(p[0], q[0]) < -pad ||
				Math.min(p[0], q[0]) > r.W + pad ||
				Math.max(p[1], q[1]) < -pad ||
				Math.min(p[1], q[1]) > r.H + pad
			);
		}
		draw(r, sim, opts = {}) {
			const W = this.world,
				g = r.tgt,
				t = this.game.time,
				unit = r.ppu || Math.abs(r.view.ax),
				C = sim.course;
			px.rect(g, 0, 0, r.W, r.H, "#789862");
			const q0 = r.view.toGround(this.game.cam.x, this.game.cam.y),
				q1 = r.view.toGround(this.game.cam.x + r.W, this.game.cam.y + r.H),
				x0 = Math.floor(q0[0] / 32) * 32,
				y0 = Math.floor(q0[1] / 32) * 32;
			for (let y = y0 - 32; y < q1[1] + 64; y += 32)
				for (let x = x0 - 32; x < q1[0] + 64; x += 32) {
					const h = ((x * 73) ^ (y * 193)) >>> 0,
						col = ["#7d9d65", "#819f67", "#799962", "#7b9c64"][h % 4];
					this.groundPolygon(
						r,
						[
							[x, y],
							[x + 33, y],
							[x + 33, y + 33],
							[x, y + 33],
						],
						col,
					);
					const p = r.w(x + 8 + (h % 18), y + 10 + ((h >> 5) % 15), 0);
					px.line(g, p[0], p[1], p[0] + 2, p[1] - 1, "#a2b97a");
					if (h % 13 === 0) {
						px.dot(g, p[0] + 5, p[1] + 4, "#e5d99c");
						px.dot(g, p[0] + 6, p[1] + 4, "#e5d99c");
					}
				}
			// Wheat patchwork and mown meadow stripes stay on the ground, under the roads.
			for (const f of [
				[1050, 1000, 330, 360, "#9ba66a"],
				[2910, 1500, 420, 280, "#baad6d"],
				[3590, 1630, 330, 210, "#c1ab70"],
				[4740, 1620, 250, 300, "#9aab78"],
			]) {
				if (
					!this.visibleSegment(
						r,
						{ x: f[0], y: f[1] },
						{ x: f[0] + f[2], y: f[1] + f[3] },
					)
				)
					continue;
				this.groundPolygon(
					r,
					[
						[f[0], f[1]],
						[f[0] + f[2], f[1]],
						[f[0] + f[2], f[1] + f[3]],
						[f[0], f[1] + f[3]],
					],
					f[4],
				);
				for (let y = f[1] + 9; y < f[1] + f[3]; y += 12)
					this.groundLine(
						r,
						{ x: f[0] + 3, y },
						{ x: f[0] + f[2] - 3, y },
						"#a49659",
						1,
					);
			}
			for (const w of W.water) {
				if (
					!this.visibleSegment(
						r,
						{ x: w.x - w.rx, y: w.y - w.ry },
						{ x: w.x + w.rx, y: w.y + w.ry },
					)
				)
					continue;
				const pts = Array.from({ length: 44 }, (_, i) => [
					w.x + Math.cos((i / 44) * Math.PI * 2) * w.rx,
					w.y + Math.sin((i / 44) * Math.PI * 2) * w.ry,
				]);
				this.groundPolygon(
					r,
					pts.map(([x, y]) => [
						w.x + (x - w.x) * 1.045,
						w.y + (y - w.y) * 1.045,
					]),
					"#c6bb83",
				);
				this.groundPolygon(r, pts, "#5d9ba6");
				this.groundPolygon(
					r,
					pts.map(([x, y]) => [w.x + (x - w.x) * 0.85, w.y + (y - w.y) * 0.86]),
					"#548e9c",
				);
				for (let i = 0; i < 30; i++) {
					const a = i * 2.4,
						rad = ((i * 37) % 100) / 120,
						x = w.x + Math.cos(a) * w.rx * rad,
						y = w.y + Math.sin(a) * w.ry * rad;
					const p = r.w(x, y, 0);
					px.line(
						g,
						p[0],
						p[1],
						p[0] + 4 + Math.sin(t + i) * 2,
						p[1],
						"#83b9bd",
					);
				}
			}
			const visible = [];
			for (const road of W.roads)
				for (let i = 0; i < road.count; i++) {
					const a = road.samples[i],
						b = road.samples[i + 1];
					if (this.visibleSegment(r, a, b, 80)) visible.push({ road, a, b, i });
				}
			for (const v of visible)
				this.groundLine(r, v.a, v.b, "#aaa88a", v.road.width + 16);
			for (const v of visible)
				this.groundLine(r, v.a, v.b, "#dfd5b3", v.road.width + 4);
			for (const v of visible)
				this.groundLine(r, v.a, v.b, "#7e8884", v.road.width);
			for (const { road, a, b, i } of visible) {
				const nx = -Math.sin(a.angle),
					ny = Math.cos(a.angle),
					half = road.width / 2;
				for (const side of [-1, 1]) {
					const off = half * side;
					this.groundLine(
						r,
						{ x: a.x + nx * off, y: a.y + ny * off },
						{
							x: b.x - Math.sin(b.angle) * off,
							y: b.y + Math.cos(b.angle) * off,
						},
						i % 3 === 0 && road === C ? "#c7795e" : "#d6cfad",
						2,
					);
				}
				if (i % 5 === 0 && road.closed) this.groundLine(r, a, b, "#b7b9a3", 1);
				// Small aggregate flecks use deterministic cosmetic hashes.
				const h = (i * 17431 + road.count * 61) >>> 0,
					off = (((h % 41) - 20) / 26) * half,
					p = r.w(a.x + nx * off, a.y + ny * off, 0);
				px.rect(g, p[0], p[1], 2, 1, h % 2 ? "#919a91" : "#707e79");
			}
			for (const s of this.skids) {
				if (!r.visible(s.x, s.y, 0)) continue;
				for (const side of [-5, 5]) {
					const x = s.x - Math.sin(s.a) * side,
						y = s.y + Math.cos(s.a) * side;
					this.groundLine(
						r,
						{ x, y },
						{ x: x - Math.cos(s.a) * 6, y: y - Math.sin(s.a) * 6 },
						"#586a62",
						1,
					);
				}
			}
			// Chevrons, not color alone, mark the active racing line.
			if (!["free", "explore"].includes(sim.config.mode) || opts.attract)
				for (let s = 0; s < C.length; s += 100) {
					const p = C.at(s);
					if (!r.visible(p.x, p.y, 0)) continue;
					const fx = Math.cos(p.angle),
						fy = Math.sin(p.angle),
						nx = -fy,
						ny = fx;
					this.groundPolygon(
						r,
						[
							[p.x + fx * 5, p.y + fy * 5],
							[p.x - fx * 3 + nx * 3, p.y - fy * 3 + ny * 3],
							[p.x - fx + nx * 0.7, p.y - fy + ny * 0.7],
							[p.x - fx * 3 - nx * 3, p.y - fy * 3 - ny * 3],
						],
						"#e6d8a1",
					);
				}
			for (const road of W.courses) {
				const start = road.at(0),
					next = road.at(8),
					nx = -Math.sin(start.angle),
					ny = Math.cos(start.angle);
				if (r.visible(start.x, start.y, 0)) {
					for (let side = -road.width / 2; side < road.width / 2; side += 6)
						for (let k = 0; k < 2; k++) {
							const ox = start.x + nx * side + Math.cos(start.angle) * k * 6,
								oy = start.y + ny * side + Math.sin(start.angle) * k * 6;
							this.groundPolygon(
								r,
								[
									[ox, oy],
									[ox + nx * 6, oy + ny * 6],
									[
										ox + nx * 6 + Math.cos(start.angle) * 6,
										oy + ny * 6 + Math.sin(start.angle) * 6,
									],
									[
										ox + Math.cos(start.angle) * 6,
										oy + Math.sin(start.angle) * 6,
									],
								],
								(Math.floor(side / 6) + k) % 2 ? "#2b4146" : "#f5ebc6",
							);
						}
					for (const side of [-1, 1])
						r.shape(
							"amm-flagpost",
							start.x + nx * (road.width / 2 + 9) * side,
							start.y + ny * (road.width / 2 + 9) * side,
							0,
							{ facing: start.angle },
						);
				}
			}
			// The airfield is a useful discovery: a visible westbound timing line and finish.
			for (const x of [4800, 2500])
				if (r.visible(x, 4480, 0)) {
					for (let j = 0; j < 8; j++)
						for (let k = 0; k < 2; k++)
							this.groundPolygon(
								r,
								[
									[x + k * 6, 4456 + j * 6],
									[x + (k + 1) * 6, 4456 + j * 6],
									[x + (k + 1) * 6, 4462 + j * 6],
									[x + k * 6, 4462 + j * 6],
								],
								(j + k) % 2 ? "#254249" : "#f4e8c1",
							);
					r.shape("amm-flagpost", x, 4448, 0);
					r.shape("amm-flagpost", x, 4512, 0);
					r.textAt(
						x,
						4442,
						16,
						x === 4800 ? "START · GO WEST ←" : "FINISH",
						"#fff0bc",
						{ shadow: "#203e3d" },
					);
				}
			if (r.visible(4430, 4250, 12)) {
				r.shape("amm-sign", 4430, 4250, 0, { facing: Math.PI / 2 });
				r.textAt(4430, 4250, 24, "OLD AIRFIELD ↘", "#fff0bc", {
					font: "tiny",
					shadow: "#203e3d",
				});
			}
			for (const tree of W.trees)
				if (r.visible(tree.x, tree.y, 25)) {
					r.shadow(tree.x + 7, tree.y + 9, tree.r * 1.8, 0.14, "#314c3e");
					r.shape(tree.pine ? "pine" : "tree", tree.x, tree.y, 0, {
						scale: tree.size,
						params: tree.pine
							? { h: 35, tiers: 4 }
							: { h: 29, seed: tree.seed },
						mats: tree.apple ? { leaves: mat("#6d914f") } : undefined,
					});
					if (tree.apple) {
						const p = r.w(tree.x + 2, tree.y, 19);
						r.queue(tree.x, tree.y, 20, (gg) => {
							px.rect(gg, p[0], p[1], 2, 2, "#e9a266");
						});
					}
				}
			for (const b of W.buildings)
				if (r.visible(b.x, b.y, 30)) {
					r.shadow(b.x + 11, b.y + 10, b.r * 0.9, 0.2, "#2e4b3c");
					r.shape("amm-" + b.shape, b.x, b.y, 0, { facing: Math.PI / 2 });
					if (b.shape === "mill") {
						const p = r.w(b.x, b.y - 1, 44),
							a = opts.reduced ? 0 : t * 0.55;
						r.queue(b.x, b.y, 45, (gg) => {
							for (let i = 0; i < 4; i++) {
								const u = a + (i * Math.PI) / 2,
									dx = Math.cos(u) * 25,
									dy = Math.sin(u) * 25;
								px.line(gg, p[0], p[1], p[0] + dx, p[1] + dy, "#e8dec0", 3);
								px.line(
									gg,
									p[0] + dx * 0.4,
									p[1] + dy * 0.4,
									p[0] + dx - 3,
									p[1] + dy + 2,
									"#c7b98e",
									2,
								);
							}
						});
					}
					if (!opts.title)
						r.textAt(b.x, b.y, 48, b.label, "#f6ebc9", {
							font: "tiny",
							shadow: "#354d46",
						});
				}
			for (const gate of C.gates)
				if (r.visible(gate.x, gate.y, 0))
					for (const side of [-1, 1])
						r.shape(
							"amm-cone",
							gate.x - Math.sin(gate.angle) * (C.width / 2 + 5) * side,
							gate.y + Math.cos(gate.angle) * (C.width / 2 + 5) * side,
							0,
						);
			for (const c of this.crew)
				if (r.visible(c.x, c.y, 15)) {
					r.shadow(c.x, c.y, 3, 0.2);
					r.actor(c.x, c.y, 0, (gg, x, y) => c.rig.draw(gg, x, y, r.view));
				}
			// Side-of-road route signs point to the next sector.
			for (let s = 150; s < C.length; s += 300) {
				const p = C.at(s);
				if (r.visible(p.x, p.y, 12))
					r.shape(
						"amm-sign",
						p.x - Math.sin(p.angle) * (C.width / 2 + 17),
						p.y + Math.cos(p.angle) * (C.width / 2 + 17),
						0,
						{ facing: p.angle + Math.PI / 2, scale: 0.7 },
					);
			}
			if (this.ghost && opts.ghost) {
				const at = sim.time * 1000,
					G = this.ghost;
				let i = Math.min(G.length - 1, Math.floor(sim.time * 10));
				while (i > 0 && G[i][0] > at) i--;
				const p = G[i];
				if (p && at <= G.at(-1)[0])
					this.car(
						r,
						{
							spec: sim.drivers[0].spec,
							car: { x: p[1], y: p[2], angle: p[3], speed: 80, slide: 0 },
							lastIntent: { steer: 0 },
							crashT: 0,
						},
						true,
					);
			}
			for (const D of sim.drivers) this.car(r, D, false);
			const car = sim.drivers[0].car;
			if (opts.gateOverlay)
				for (const gate of C.gates) {
					const nx = -Math.sin(gate.angle),
						ny = Math.cos(gate.angle);
					this.groundLine(
						r,
						{ x: gate.x - nx * gate.half, y: gate.y - ny * gate.half },
						{ x: gate.x + nx * gate.half, y: gate.y + ny * gate.half },
						"#fff09b",
						1,
					);
					r.textAt(gate.x, gate.y, 10, String(gate.index), "#fff09b");
				}
			if (opts.collisionOverlay)
				for (const s of W.solids)
					if (r.visible(s.x, s.y, 0))
						r.decal(() => r.groundRing(s.x, s.y, s.r, "#e7b07c", 0.8));
			if (opts.navigation) {
				const p = opts.navigation,
					angle = Math.atan2(p.y - car.y, p.x - car.x),
					at = {
						x: car.x + Math.cos(angle) * 42,
						y: car.y + Math.sin(angle) * 42,
					};
				if (Math.hypot(p.x - car.x, p.y - car.y) > 50) {
					const nx = -Math.sin(angle),
						ny = Math.cos(angle);
					this.groundPolygon(
						r,
						[
							[at.x + Math.cos(angle) * 8, at.y + Math.sin(angle) * 8],
							[at.x + nx * 6, at.y + ny * 6],
							[at.x - Math.cos(angle) * 4, at.y - Math.sin(angle) * 4],
							[at.x - nx * 6, at.y - ny * 6],
						],
						"#fff0a5",
					);
				}
			}
			if (opts.dev)
				r.text("UNRANKED · LIVE TOOLS", r.W / 2, r.H - 18, "#ffe091", {
					align: "center",
					shadow: "#1f353b",
				});
		}
		car(r, D, ghost = false) {
			const c = D.visual || D.car;
			if (!r.visible(c.x, c.y, 6)) return;
			const opts = { facing: c.angle, alpha: ghost ? 0.4 : 1 };
			r.shadow(c.x + 3, c.y + 4, 11, ghost ? 0.1 : 0.28, "#243f3c");
			const bounce = D.crashT
				? Math.sin(D.crashT * 12) * 1.4
				: Math.min(1, Math.abs(c.speed || 0) / 150) *
					Math.sin(this.game.time * 20) *
					0.15;
			// Wheels are separate native shape groups, so steering and suspension are continuous.
			for (const forward of [-7.3, 7.2])
				for (const side of [-6.8, 6.8]) {
					const x =
							c.x + Math.cos(c.angle) * forward - Math.sin(c.angle) * side,
						y = c.y + Math.sin(c.angle) * forward + Math.cos(c.angle) * side;
					r.shape("amm-wheel", x, y, Math.max(0, bounce), {
						...opts,
						facing:
							c.angle + (forward > 0 ? (D.lastIntent?.steer || 0) * 0.35 : 0),
						mats: ghost ? { rubber: mat("#bce9db") } : undefined,
					});
				}
			r.shape("amm-car-" + D.spec.id, c.x, c.y, Math.max(0, bounce), {
				...opts,
				mats: ghost
					? { body: mat("#a5dfd1"), stripe: mat("#e9f0c6") }
					: undefined,
			});
			const lean =
				E.clamp((c.slide || 0) * 0.025, -1.4, 1.4) +
				(D.lastIntent?.steer || 0) * 0.4;
			r.shape(
				"amm-driver",
				c.x - Math.cos(c.angle) * 0.9 - Math.sin(c.angle) * lean,
				c.y - Math.sin(c.angle) * 0.9 + Math.cos(c.angle) * lean,
				6 + Math.max(0, bounce),
				opts,
			);
			if (D.crashT) {
				r.textAt(c.x, c.y, 29, "CRASH!", "#fff3b8", { shadow: "#29454b" });
			}
			if (D.lastIntent?.brake > 0.12 && !ghost) {
				const nx = -Math.sin(c.angle),
					ny = Math.cos(c.angle);
				for (const side of [-3, 3]) {
					const p = r.w(
						c.x - Math.cos(c.angle) * 9 + nx * side,
						c.y - Math.sin(c.angle) * 9 + ny * side,
						4,
					);
					r.queue(c.x, c.y, 5, (g) => px.rect(g, p[0], p[1], 2, 2, "#ffae73"));
				}
			}
			if (!ghost && D.i === 0)
				r.textAt(c.x, c.y, -5, "▼", "#fff4c4", {
					font: "tiny",
					shadow: "#243e3c",
				});
		}
		minimap(canvas, sim, whole = false) {
			if (!canvas) return;
			const g = canvas.getContext("2d"),
				w = canvas.width,
				h = canvas.height,
				pad = 16;
			const course = sim.course,
				points = whole
					? this.world.roads.flatMap((r) => r.samples)
					: course.samples;
			const minX = Math.min(...points.map((p) => p.x)),
				maxX = Math.max(...points.map((p) => p.x)),
				minY = Math.min(...points.map((p) => p.y)),
				maxY = Math.max(...points.map((p) => p.y));
			const k = Math.min(
					(w - pad * 2) / (maxX - minX),
					(h - pad * 2) / (maxY - minY),
				),
				ox = (w - (maxX - minX) * k) / 2,
				oy = (h - (maxY - minY) * k) / 2,
				P = (p) => [ox + (p.x - minX) * k, oy + (p.y - minY) * k];
			g.clearRect(0, 0, w, h);
			g.fillStyle = "#203c3d";
			g.fillRect(0, 0, w, h);
			g.lineJoin = "round";
			g.lineCap = "round";
			for (const road of whole ? this.world.roads : [course]) {
				g.beginPath();
				road.samples.forEach((p, i) => {
					if (i) g.lineTo(...P(p));
					else g.moveTo(...P(p));
				});
				g.strokeStyle = road === course ? "#e8d8a5" : "#71948c";
				g.lineWidth = whole ? 3 : 4;
				g.stroke();
			}
			if (whole)
				for (let i = 0; i < this.world.courses.length; i++) {
					const p = P(this.world.courses[i].at(0));
					g.fillStyle = "#ffe3a3";
					g.fillRect(p[0] - 6, p[1] - 6, 12, 12);
					g.fillStyle = "#213d3c";
					g.font = "bold 10px sans-serif";
					g.textAlign = "center";
					g.fillText(String(i + 1), p[0], p[1] + 3);
				}
			else {
				const gate = course.gates[sim.drivers[0].progress.next],
					p = P(gate);
				g.strokeStyle = "#91d7d5";
				g.lineWidth = 2;
				g.strokeRect(p[0] - 5, p[1] - 5, 10, 10);
			}
			for (const D of sim.drivers) {
				const c = D.car,
					p = P(c);
				g.save();
				g.translate(p[0], p[1]);
				g.rotate(c.angle);
				g.fillStyle = D.i === 0 ? "#fff2ca" : D.spec.color;
				g.beginPath();
				g.moveTo(7, 0);
				g.lineTo(-4, -4);
				g.lineTo(-3, 0);
				g.lineTo(-4, 4);
				g.closePath();
				g.fill();
				g.restore();
			}
			canvas._mapInfo = { k, ox, oy, minX, minY };
		}
	}
	M.Presentation = Presentation;
})(MM, My3D2dge);
