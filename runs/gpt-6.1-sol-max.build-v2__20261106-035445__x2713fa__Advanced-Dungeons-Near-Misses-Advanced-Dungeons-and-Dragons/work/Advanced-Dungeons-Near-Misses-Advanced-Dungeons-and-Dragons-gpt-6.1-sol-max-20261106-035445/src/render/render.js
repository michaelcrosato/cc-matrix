(() => {
	const N = globalThis.NM,
		E = globalThis.My3D2dge,
		{ px } = E,
		T = N.TILE;
	const hash = (x, y) => {
		const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
		return n - Math.floor(n);
	};
	class Renderer {
		constructor(game) {
			this.game = game;
			this.levelId = null;
			this.titleClock = 0;
			this.world = this.makeWorld();
			this.mapFocus = null;
			this.debug = {};
		}
		makeWorld() {
			const rows = Array.from({ length: 26 }, (_, y) =>
				Array.from({ length: 39 }, (_, x) => {
					const river = 22 + Math.sin(y * 0.27) * 2.8;
					return Math.abs(x - river) < 1.3
						? "~"
						: hash(x, y) > 0.89
							? "d"
							: ".";
				}).join(""),
			);
			return new E.TileMap({
				rows,
				legend: {
					".": { floor: "grass" },
					"~": { floor: "water" },
					d: { floor: "dirt" },
				},
				types: {},
				outside: "#152b2d",
				floorTex: (x, y, tag) => {
					if (tag === "water")
						return E.tex.water(x, y, {
							base: "#326b7a",
							dark: "#1b485b",
							light: "#9cbeab",
						});
					if (tag === "dirt")
						return E.tex.dirt(x, y, {
							base: "#8d8061",
							dark: "#6a634d",
							light: "#a99d76",
						});
					return E.tex.grass(x, y, {
						base: "#49644f",
						dark: "#314e3d",
						light: "#617b50",
						flower: "#c6bb7b",
						flower2: "#aabca1",
					});
				},
			});
		}
		ensure(sim) {
			const data = sim.level.data;
			if (this.levelId === data.id && this.compiled === sim.level) return;
			this.levelId = data.id;
			this.compiled = sim.level;
			const p = data.palette;
			const tones = E.ramp(p.floor, 5, 0.5).map(E.hex);
			this.map = new E.TileMap({
				rows: sim.level.rows,
				legend: { "#": 1 },
				types: {
					1: {
						h: 23,
						cut: true,
						cutH: 5,
						top: E.shade(p.wall, -0.2),
						side: p.wall,
						face: data.id === "root" ? "rock" : "stone",
						roof: "slab",
						course: 8,
					},
				},
				outside: p.ambient,
				ao: 3,
				floorTex: (x, y) =>
					E.tex.flagstone(x, y, {
						stones: tones.slice(1, 4),
						mortar: tones[0],
						hi: tones[4],
						lo: tones[0],
						speck: tones[1],
					}),
			});
			this.grid = E.Grid.from(this.map);
			this.fog = new E.Fog(this.grid);
			this.dressing = [];
			for (const room of data.rooms) {
				const variants =
					data.id === "root"
						? ["mushroom", "vines", "cobweb", "grass"]
						: data.id === "cistern"
							? ["crystal", "bones", "pillar", "pot"]
							: data.id === "chalk"
								? ["rock", "bones", "mushroom", "pot"]
								: ["pillar", "crystal", "brazier", "bones"];
				for (let i = 0; i < 7; i++) {
					const u = hash(i + room.x, room.y),
						v = hash(room.x, i + room.y),
						edge = i % 4;
					let x = room.x + 1.2 + u * (room.w - 2.4),
						y = room.y + 1.2 + v * (room.h - 2.4);
					if (edge === 0) y = room.y + 0.7;
					if (edge === 1) x = room.x + 0.65;
					if (edge === 2) x = room.x + room.w - 0.7;
					if (edge === 3) y = room.y + room.h - 0.7;
					this.dressing.push({
						x: x * T,
						y: y * T,
						kind: variants[i % variants.length],
						size: 0.55 + u * 0.35,
						color: i % 2 ? p.accent : undefined,
					});
				}
				this.dressing.push({
					x: (room.x + 1) * T,
					y: (room.y + 1) * T,
					kind: sim.state.caveIndex < 2 ? "torch" : "crystal",
					size: 0.8,
					light: true,
					color: p.accent,
				});
			}
		}
		update(sim, dt, { title = false } = {}) {
			const g = this.game,
				s = sim.state;
			this.titleClock += dt;
			if (title || s.mode === "map" || s.mode === "victory") {
				g.setZoom(title ? 0.65 : 0.62);
				g.cam.bounds = null;
				g.focus(title ? 372 : 312, title ? 196 : 209, 16);
				g.lights.enabled = true;
				g.lights.ambient = s.mode === "victory" ? 0.9 : 0.73;
				return;
			}
			this.ensure(sim);
			g.setZoom(0.83);
			g.cam.bounds = null;
			const living = s.players.filter((p) => !p.downed),
				party = living.length ? living : s.players;
			if (party.length) {
				const x = party.reduce((a, p) => a + p.x, 0) / party.length,
					y = party.reduce((a, p) => a + p.y, 0) / party.length;
				g.focus(x, y, 10);
			}
			g.cam.smooth = 0.075;
			g.lights.enabled = true;
			g.lights.ambient = 0.58;
			this.fog.state.fill(0);
			for (const i of s.explored) this.fog.state[i] = 1;
			for (const i of s.visible) this.fog.state[i] = 2;
			if (sim.dev.reveal) this.fog.state.fill(2);
		}
		mountain(r, x, y, size, col, snow = false) {
			r.shadow(x, y, size * 0.75, 0.3);
			r.queue(x, y, 0, (g) => {
				const P = (dx, dy, z) => r.w(x + dx, y + dy, z),
					a = P(-size, size * 0.3, 0),
					b = P(size, size * 0.3, 0),
					c = P(size * 0.45, -size * 0.5, 0),
					d = P(-size * 0.4, -size * 0.5, 0),
					peak = P(-size * 0.1, 0, size * 1.7);
				px.poly(g, [a, b, peak], E.shade(col, -0.25));
				px.poly(g, [b, c, peak], E.shade(col, -0.45));
				px.poly(g, [d, a, peak], E.shade(col, 0.2));
				px.poly(
					g,
					[
						P(-size * 0.22, size * 0.03, size * 1.3),
						P(size * 0.17, size * 0.02, size * 1.2),
						peak,
					],
					snow ? "#c6d1c2" : E.shade(col, 0.38),
				);
				px.line(g, ...a, ...peak, E.shade(col, 0.3));
			});
		}
		worldDraw(sim, { title = false } = {}) {
			const g = this.game,
				r = g.r,
				s = sim.state;
			r.sky(["#101f29", "#344b4c", "#b6b69a"]);
			this.world.drawFloor(r);
			const tool = s.party.tools,
				win = s.mode === "victory";
			// Trails lie in the miniature itself; opening a route changes its material.
			r.decal((ctx) => {
				for (const route of N.Content.routes) {
					const a = N.Content.landmarks.find((n) => n.id === route.from),
						b = N.Content.landmarks.find((n) => n.id === route.to);
					const open = !route.requires || tool.includes(route.requires),
						pa = this.worldPoint(a),
						pb = this.worldPoint(b);
					const aa = r.w(...pa, 0),
						bb = r.w(...pb, 0);
					px.line(
						ctx,
						...aa,
						...bb,
						open ? "#af9d6c" : "#34453e",
						open ? 3 : 2,
					);
				}
			});
			for (let y = 1; y < 25; y += 2)
				for (let x = 1; x < 38; x += 2) {
					const h = hash(x, y);
					if (h < 0.58 && Math.abs(x - (22 + Math.sin(y * 0.27) * 2.8)) > 2) {
						const cleared =
							tool.includes("axe") && x > 11 && x < 19 && y > 12 && y < 18;
						if (!cleared)
							r.shape("pine", x * T, y * T, 0, {
								scale: 0.35 + h * 0.4,
								params: { h: 32 + hash(y, x) * 20 },
								mats: { n: "#324f3e" },
							});
						else r.prop("grass", x * T, y * T, 0, { size: 0.5 });
					}
				}
			for (const [x, y, size, col, snow] of [
				[165, 110, 32, "#727d6b", false],
				[278, 100, 42, "#657675", false],
				[405, 85, 41, "#718581", true],
				[468, 80, 56, "#93a39a", true],
				[515, 103, 34, "#7c918d", true],
				[550, 155, 33, "#6f8980", true],
				[99, 194, 23, "#637666", false],
			])
				this.mountain(r, x, y, size, col, snow);
			for (const node of N.Content.landmarks) {
				const [x, y] = this.worldPoint(node),
					blocked = node.requires && !tool.includes(node.requires),
					current = node.id === s.mapNode;
				if (node.kind === "cave" || node.cave !== undefined) {
					r.prop("rock", x, y, 0, { size: 1.5, color: "#65746a" });
					r.actor(x, y, 2, (ctx, ox, oy) => {
						px.ell(ctx, ox, oy - 5, 7, 8, "#101d23");
						px.line(ctx, ox - 6, oy + 1, ox + 6, oy + 1, "#b8a67b", 2);
					});
				} else if (node.kind === "camp") {
					r.prop("brazier", x, y, 0, { size: 0.65, light: true });
					r.prop("banner", x + 12, y - 8, 0, { size: 0.6, color: "#d3ad70" });
				} else if (node.requires === "key") {
					r.prop("pillar", x - 9, y, 0, { size: 0.9 });
					r.prop("pillar", x + 9, y, 0, { size: 0.9 });
					if (!tool.includes("key")) r.prop("door", x, y, 0, { size: 1 });
				}
				if (!title) {
					const pt = r.w(x, y, 8);
					r.overlay((ctx) => {
						px.disc(
							ctx,
							pt[0],
							pt[1],
							current ? 4 : 2,
							blocked ? "#777f6d" : current ? "#ffdf94" : "#e8cf8a",
						);
						if (this.mapFocus === node.id)
							px.ell(ctx, pt[0], pt[1], 9, 7, "#d9b77c", false);
					});
				}
			}
			const node =
				N.Content.landmarks.find((n) => n.id === s.mapNode) ||
				N.Content.landmarks[0];
			let [x, y] = this.worldPoint(node);
			const travel = [...s.events]
				.reverse()
				.find((e) => e.kind === "travel" && e.to === s.mapNode);
			if (travel && s.time - travel.time < 1) {
				const before = N.Content.landmarks.find((n) => n.id === travel.from);
				if (before) {
					const [ox, oy] = this.worldPoint(before),
						u = Math.min(1, s.time - travel.time);
					x = ox + (x - ox) * u;
					y = oy + (y - oy) * u;
				}
			}
			if (node.kind === "river" && tool.includes("boat"))
				N.Art.prop(g, "boat", x, y, { time: s.time });
			if (node.kind === "forest" && tool.includes("axe"))
				N.Art.prop(g, "axe", x + 17, y, { time: s.time });
			if (node.kind === "wall" && tool.includes("key"))
				N.Art.prop(g, "key", x + 16, y, { time: s.time });
			N.Art.ranger(g, {
				id: "map-ranger",
				seat: 1,
				x,
				y,
				z: 0,
				angle: -0.4,
				state: win ? "celebrating" : s.time % 5 < 1 ? "listen" : "idle",
				walk: s.time,
				animTime: s.time,
				hp: 3,
			});
			if (win) {
				N.Art.prop(g, "relic", x + 20, y, { time: s.time });
				g.lights.add(x, y, 20, 160, 1, { color: "#ffdda0" });
			}
			r.overlay((ctx) => {
				for (let i = 0; i < 26; i++) {
					const a = hash(i, 4),
						b = hash(9, i),
						pxx = (a * r.W + Math.sin(this.titleClock * 0.13 + i) * 14) % r.W,
						pyy = (b * r.H + this.titleClock * 0.8) % r.H;
					px.dot(ctx, pxx, pyy, i % 3 ? "#9baf97" : "#dfcf9e");
				}
				if (!title) {
					E.font.text(ctx, "H U S H V A L E", r.W / 2, 22, "#d9d1b4", {
						align: "center",
						shadow: "#1a2528",
					});
					E.font.text(
						ctx,
						win ? "THE SKY REMEMBERS" : "THE HIGH COUNTRY",
						r.W / 2,
						33,
						"#9eafa3",
						{ align: "center", font: "tiny" },
					);
				}
			});
		}
		worldPoint(node) {
			return [45 + node.x * 530, 45 + node.y * 310];
		}
		caveDraw(sim) {
			const g = this.game,
				r = g.r,
				s = sim.state;
			this.ensure(sim);
			const data = sim.level.data,
				pal = data.palette;
			r.sky([pal.ambient, pal.ambient]);
			this.map.drawFloor(r);
			this.map.queueWalls(r);
			const seen = (a) =>
				sim.dev.reveal ||
				s.explored.includes(
					Math.floor(a.y / T) * sim.level.w + Math.floor(a.x / T),
				);
			for (const a of this.dressing)
				if (seen(a)) {
					r.prop(a.kind, a.x, a.y, 0, {
						size: a.size,
						color: a.color,
						light: a.light,
					});
				}
			for (const b of sim.level.banks)
				if (seen({ x: (b.ax + b.bx) / 2, y: (b.ay + b.by) / 2 })) {
					const x = (b.ax + b.bx) / 2,
						y = (b.ay + b.by) / 2;
					r.queue(x, y, 0, (ctx) => {
						const a = r.w(b.ax, b.ay, 1),
							bb = r.w(b.bx, b.by, 1),
							c = r.w(b.bx, b.by, 9),
							d = r.w(b.ax, b.ay, 9);
						px.poly(ctx, [a, bb, c, d], "#b2bfb7");
						px.line(ctx, ...d, ...c, "#f1e6be", 2);
						px.line(ctx, ...a, ...bb, "#5f776e", 2);
					});
				}
			for (const track of data.tracks)
				if (seen({ x: track.x * T, y: track.y * T }))
					r.decal((ctx) => {
						const x = track.x * T,
							y = track.y * T,
							angle = track.angle || 0;
						if (track.type === "bank") {
							const a = r.w(x - 9, y, 1),
								b = r.w(x + 12, y, 1);
							px.line(ctx, ...a, ...b, "#d2c57e", 2);
							const tip = r.w(x + 8, y - 4, 1);
							px.line(ctx, ...tip, ...b, "#d2c57e", 2);
						} else
							for (let i = 0; i < 5; i++) {
								const [sx, sy] = r.w(
									x + Math.cos(angle) * i * 5,
									y + Math.sin(angle) * i * 5 + (i % 2 ? 2 : -2),
									0.5,
								);
								px.ell(
									ctx,
									sx,
									sy,
									track.type.includes("guardian") ? 2 : 1,
									track.type === "spider" ? 1 : 2,
									"#b3a88c",
								);
							}
					});
			const [ex, ey] = data.exit.map((v) => v * T);
			if (seen({ x: ex, y: ey })) {
				N.Art.prop(g, "ladder", ex, ey);
				g.lights.add(ex, ey, 15, 70, 0.9, { color: pal.accent });
			}
			for (const a of s.pickups)
				if (seen(a)) {
					const kind =
						a.kind === "arrows"
							? "quiver"
							: a.kind === "shaft"
								? "arrow"
								: a.kind === "dawn" || a.kind === "dusk"
									? "relic"
									: a.kind;
					N.Art.prop(g, kind, a.x, a.y, { time: s.time, amount: a.amount });
					if (a.tool || a.kind === "shaft")
						g.lights.add(a.x, a.y, 5, 35, 0.65, { color: pal.accent });
				}
			// Every threat, including its shadow and tell, is omitted unless currently visible.
			for (const e of s.enemies)
				if (sim.visible(e) && (e.hp > 0 || e.stateTime < 1.5)) {
					if (e.state === "windup" || e.state === "attacking") {
						r.decal((ctx) => {
							const length = e.type.startsWith("guardian")
									? 125
									: e.type === "drake"
										? 85
										: e.type === "snake"
											? 50
											: 25,
								width = e.type.startsWith("guardian") ? 14 : 7;
							const normal = [
									-Math.sin(e.angle) * width,
									Math.cos(e.angle) * width,
								],
								v = [Math.cos(e.angle) * length, Math.sin(e.angle) * length],
								points = [
									[e.x + normal[0], e.y + normal[1]],
									[e.x - normal[0], e.y - normal[1]],
									[e.x + v[0] - normal[0], e.y + v[1] - normal[1]],
									[e.x + v[0] + normal[0], e.y + v[1] + normal[1]],
								].map((a) => r.w(...a, 0.7));
							px.polyDither(
								ctx,
								points,
								e.state === "attacking" ? "#f4ac78" : "#e4c18b",
								e.state === "attacking" ? 0.65 : 0.32,
								r.ix,
								r.iy,
							);
							px.line(ctx, ...points[0], ...points[3], "#f2d99e");
						});
					}
					N.Art.creature(g, { ...e, animTime: s.time });
					if (e.type.startsWith("guardian") && e.hp > 0) {
						const point = r.w(e.x, e.y, 50);
						r.overlay((ctx) => {
							for (let i = 0; i < 3; i++)
								px.rect(
									ctx,
									point[0] - 12 + i * 9,
									point[1],
									6,
									2,
									i < e.hp ? "#efd79d" : "#5b5759",
								);
							if (e.state === "recovering")
								E.font.text(
									ctx,
									"EXPOSED",
									point[0],
									point[1] - 10,
									"#d6f1cf",
									{ align: "center", font: "tiny" },
								);
						});
					}
				}
			for (const a of s.arrows) {
				const end = r.w(a.x, a.y, 15),
					len = Math.hypot(a.vx, a.vy),
					start = r.w(a.x - (a.vx / len) * 9, a.y - (a.vy / len) * 9, 15);
				r.queue(
					a.x,
					a.y,
					15,
					(ctx) => {
						px.line(ctx, ...start, ...end, "#fff3c6", 1);
						px.disc(ctx, ...end, 1, "#fff9db");
					},
					{ emissive: true },
				);
				g.lights.add(a.x, a.y, 15, 40, 0.9, { color: "#f3c781" });
			}
			for (const p of s.players) {
				g.lights.add(p.x, p.y, 16, 90, 0.8, {
					color: p.seat === 1 ? "#ebd4a2" : "#b5dbe1",
				});
				N.Art.ranger(g, { ...p, animTime: s.time });
				if (!p.downed) {
					const a = r.w(
							p.x + Math.cos(p.angle) * 15,
							p.y + Math.sin(p.angle) * 15,
							15,
						),
						b = r.w(
							p.x + Math.cos(p.angle) * 34,
							p.y + Math.sin(p.angle) * 34,
							15,
						);
					r.decal((ctx) => {
						px.line(ctx, ...a, ...b, p.focus ? "#f0dfae" : "#b5bda4");
						px.disc(ctx, ...b, 1, "#f8e8bc");
					});
				}
			}
			this.fog.draw(r, T, {
				height: (x, y) => this.map.height(x, y),
				color: pal.ambient,
				dim: 0.69,
			});
			if (
				sim.dev.collision ||
				sim.dev.navigation ||
				sim.dev.hearing ||
				sim.dev.los
			)
				r.overlay((ctx) => {
					for (const e of sim.level.edges)
						if (sim.dev.collision) {
							const a = r.w(e.ax, e.ay, 0),
								b = r.w(e.bx, e.by, 0);
							px.line(ctx, ...a, ...b, "#ed8479");
						}
					if (sim.dev.navigation)
						for (const e of s.enemies)
							for (const p of e.path || []) {
								const a = r.w(...p, 1);
								px.dot(ctx, ...a, "#c2e4a1");
							}
					if (sim.dev.hearing)
						for (const n of s.noise) {
							const a = r.w(n.x, n.y, 2);
							px.disc(ctx, ...a, 3, "#e0c368");
						}
					if (sim.dev.los)
						for (const e of s.enemies)
							if (sim.visible(e))
								for (const p of s.players) {
									const a = r.w(e.x, e.y, 16),
										b = r.w(p.x, p.y, 16);
									px.line(
										ctx,
										...a,
										...b,
										N.Geometry.los(sim.level, e.x, e.y, p.x, p.y)
											? "#b6e0ac"
											: "#b97777",
									);
								}
				});
		}
		draw(sim, options = {}) {
			if (
				options.title ||
				sim.state.mode === "map" ||
				sim.state.mode === "victory"
			)
				this.worldDraw(sim, options);
			else this.caveDraw(sim);
		}
	}
	N.Renderer = Renderer;
})();
