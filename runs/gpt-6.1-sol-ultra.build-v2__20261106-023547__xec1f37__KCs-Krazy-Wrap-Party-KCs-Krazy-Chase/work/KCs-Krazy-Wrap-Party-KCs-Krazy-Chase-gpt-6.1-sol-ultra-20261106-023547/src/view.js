/* Bespoke garden dioramas. Native my-3D2dge pixels, shading, projected actors and Blob rigs. */
(() => {
	"use strict";
	const E = globalThis.My3D2dge,
		P = E.px;
	const THEMES = [
		{
			ground: "#173438",
			tile: "#1d4041",
			wall: "#28665c",
			edge: "#66b89b",
			leaf: "#64b580",
			petal: "#fba6bc",
			accent: "#efd07c",
			sky: "#101b2a",
		},
		{
			ground: "#192d46",
			tile: "#213a53",
			wall: "#35567b",
			edge: "#8bb9d2",
			leaf: "#64bfc8",
			petal: "#dcb5ff",
			accent: "#8cead0",
			sky: "#101b30",
		},
		{
			ground: "#292d37",
			tile: "#343b40",
			wall: "#665354",
			edge: "#c2977b",
			leaf: "#9fc46b",
			petal: "#ffd27a",
			accent: "#ffc186",
			sky: "#241e30",
		},
		{
			ground: "#28253d",
			tile: "#343047",
			wall: "#685182",
			edge: "#b49ccc",
			leaf: "#a3a9cf",
			petal: "#f69bd5",
			accent: "#f6c888",
			sky: "#211a34",
		},
		{
			ground: "#18333c",
			tile: "#22404a",
			wall: "#356c74",
			edge: "#83c3bd",
			leaf: "#8bc9a8",
			petal: "#ffba88",
			accent: "#f4d67e",
			sky: "#101d30",
		},
	];
	const key = (x, y) => x + "," + y,
		seeded = (x, y, n = 0) => {
			let z =
				Math.imul(x + 7127 + n * 29, 374761393) ^ Math.imul(y + 31, 668265263);
			z = Math.imul(z ^ (z >>> 13), 1274126177);
			return ((z ^ (z >>> 16)) >>> 0) / 4294967296;
		};
	const font = (g, s, x, y, c, o = {}) =>
		E.font.text(g, String(s), x, y, c, {
			outline: false,
			shadow: "#081222",
			...o,
		});
	function leaf(g, x, y, w, h, c, flip = false) {
		P.poly(
			g,
			flip
				? [
						[x - w, y],
						[x, y - h],
						[x + 1, y],
						[x, y + 1],
					]
				: [
						[x, y],
						[x + w, y - h],
						[x + w, y + 1],
						[x + 1, y + 1],
					],
			c,
		);
	}
	function diamond(g, x, y, R, c) {
		P.poly(
			g,
			[
				[x, y - R],
				[x + R, y],
				[x, y + R],
				[x - R, y],
			],
			c,
		);
	}
	function ring(g, x, y, R, c, width = 1) {
		const pts = [];
		for (let i = 0; i < 16; i++) {
			const a = (i * Math.PI) / 8;
			pts.push([x + Math.cos(a) * R, y + Math.sin(a) * R]);
		}
		for (let i = 0; i < 16; i++)
			P.line(g, ...pts[i], ...pts[(i + 1) % 16], c, width);
	}
	function fruit(g, x, y, z, t = 0) {
		const q = Math.sin(t * 7) * 0.3;
		const T = E.tones("#f6b958");
		P.ell(g, x, y, 4.7 * z, (4 + q) * z, T.deep);
		P.ell(g, x + 0.4 * z, y - 0.6 * z, 4 * z, 3.6 * z, T.base);
		P.ell(g, x + 1.2 * z, y - 1.5 * z, 2 * z, 1.6 * z, T.lt);
		P.rect(g, x + 2 * z, y - 2.5 * z, z, z, T.hi);
		P.line(
			g,
			x,
			y - 3.5 * z,
			x + 0.7 * z,
			y - 6 * z,
			"#886d48",
			Math.max(1, z),
		);
		leaf(g, x, y - 5 * z, 4 * z, 2 * z, "#b8e9a1");
		leaf(g, x, y - 5 * z, 3 * z, 3 * z, "#63ba82", true);
	}
	function flower(g, x, y, z, col, t = 0) {
		const sway = Math.sin(t * 1.6 + x) * 0.5;
		P.line(g, x, y, x + sway, y - 4 * z, "#4d8e79", Math.max(1, z));
		for (let i = 0; i < 5; i++) {
			const a = (i * Math.PI * 2) / 5;
			P.disc(
				g,
				x + sway + Math.cos(a) * 2 * z,
				y - 4 * z + Math.sin(a) * 2 * z,
				1.5 * z,
				col,
			);
		}
		P.disc(g, x + sway, y - 4 * z, z, "#f4d683");
	}
	function create(game) {
		game.lights.enabled = true;
		game.lights.ambient = 0.87;
		const rigs = new Map(),
			sparks = [],
			chainMotion = new Map(),
			brushMotion = new Map();
		let clock = 0,
			lastState = null,
			lastLayout = null,
			toast = null,
			entered = 0,
			lastGarden = null;
		function layout(
			s,
			W = game.r ? game.r.W : 512,
			H = game.r ? game.r.H : 288,
		) {
			const l = s.level || s,
				portrait = H > W;
			const top = portrait ? 66 : 43,
				bottom = portrait ? 70 : 27;
			const cell = Math.max(
				7,
				Math.floor(
					Math.min(
						(W - 30) / l.w,
						(H - top - bottom) / l.h,
						portrait ? 20 : 23,
					),
				),
			);
			const w = l.w * cell,
				h = l.h * cell;
			return {
				x: Math.floor((W - w) / 2),
				y: Math.floor(top + (H - top - bottom - h) / 2),
				cell,
				w,
				h,
				W,
				H,
				portrait,
			};
		}
		function prepare(s) {
			if (!s || !s.level) return;
			lastState = s;
			const b = (lastLayout = layout(s)),
				z = b.cell / 16;
			if (Math.abs((game.zoom || 1) - z) > 0.001) game.setZoom(z);
			game.cam.smooth = 0;
			game.cam.offset = [b.x + b.w / 2 - b.W / 2, b.y + b.h / 2 - b.H / 2];
			game.cam.snap = true;
			game.focus(s.level.w * 8, s.level.h * 8, 0);
		}
		function getRig(id, kind) {
			const k = kind + id;
			if (rigs.has(k)) return rigs.get(k);
			let opt;
			if (kind === "hero")
				opt = {
					R: 5.35,
					feet: true,
					face: "front",
					mouth: true,
					colors:
						id === 2
							? {
									base: "#ec896f",
									dk: "#9c454f",
									lt: "#ffd5a5",
									spec: "#fff1c6",
									eye: "#fff7d9",
									pupil: "#202638",
									ext: "#774c69",
								}
							: {
									base: "#72c3e6",
									dk: "#3a6899",
									lt: "#b7ecf0",
									spec: "#fff7d1",
									eye: "#fffbe1",
									pupil: "#203046",
									ext: "#405585",
								},
				};
			else if (kind === "head")
				opt = {
					R: 6.5,
					horns: true,
					face: "front",
					feet: true,
					mouth: "fangs",
					colors: {
						base: "#a273be",
						dk: "#533c76",
						lt: "#d4a5da",
						spec: "#fff5d9",
						eye: "#ffe8a8",
						pupil: "#2c213e",
						horn: "#ffcf87",
						ext: "#5b3d70",
					},
				};
			else
				opt = {
					R: 4.8,
					face: "front",
					feet: kind === "trail",
					wings: kind === "junction",
					ears: kind === "trail" ? "cat" : undefined,
					mouth: true,
					colors: {
						base: kind === "trail" ? "#e78ca6" : "#c38cce",
						dk: "#7d4c86",
						lt: "#ffd0cf",
						spec: "#fff0d0",
						eye: "#fff1d1",
						pupil: "#352444",
						wing: "#9a679d",
					},
				};
			const rig = new E.Blob(opt);
			rigs.set(k, rig);
			return rig;
		}
		function update(dt, s) {
			clock += dt;
			lastState = s;
			if (!s) return;
			const gardenKey = s.garden + ":" + s.level.id;
			if (lastGarden !== gardenKey) {
				lastGarden = gardenKey;
				entered = clock;
				toast = null;
			}
			for (const p of s.players || [])
				getRig(p.id, "hero").update(dt, {
					look: p.dir || [1, 0],
					walk: p.m?.edge ? 1 : 0.15,
					squash: p.respawn > 0 ? -0.15 : Math.sin(clock * 7 + p.id) * 0.025,
				});
			for (const c of s.crawlers || []) {
				const cm = chainMotion.get(c.id);
				if (!cm) chainMotion.set(c.id, { length: c.segments, at: -10 });
				else if (cm.length !== c.segments) {
					cm.length = c.segments;
					cm.at = clock;
				}
				for (let i = 0; i < (c.body || []).length; i++)
					if (
						(s.players || []).some(
							(p) =>
								p.respawn <= 0 &&
								Math.hypot(p.x - c.body[i].x, p.y - c.body[i].y) < 0.6,
						)
					)
						brushMotion.set(c.id + ":" + i, clock);
				getRig(c.id, "head").update(dt, {
					look: c.dir || [1, 0],
					walk: c.mode === "chew" ? 0 : 0.7,
					squash:
						c.mode === "chew"
							? Math.sin(clock * 17) * 0.13
							: Math.sin(clock * 8 + c.id) * 0.04,
					squint: c.mode === "pursue",
				});
			}
			for (const c of s.sentries || [])
				getRig(
					c.id,
					c.id === 0 || c.id === 1 || c.id === "trail" ? "trail" : "junction",
				).update(dt, {
					look: c.dir || [1, 0],
					walk: 0.8,
					flap: c.spin > 0 ? 1 : 0.6,
					squash:
						c.spin > 0
							? Math.sin(clock * 26) * 0.2
							: c.fright > 0
								? Math.sin(clock * 22) * 0.07
								: 0,
				});
			for (let i = sparks.length - 1; i >= 0; i--) {
				sparks[i].age += dt;
				if (sparks[i].age > sparks[i].life) sparks.splice(i, 1);
			}
			if (toast) {
				toast.life -= dt;
				if (toast.life <= 0) toast = null;
			}
		}
		function event(events, s) {
			for (const ev of events || []) {
				if (ev.type === "bite" || ev.type === "plant" || ev.type === "hit") {
					const p = (s.players || []).find(
						(p) => Math.hypot(p.x - (ev.x || 0), p.y - (ev.y || 0)) < 0.9,
					);
					if (p) getRig(p.id, "hero").kick(ev.type === "plant" ? 1.5 : -2.4);
				}
				if (ev.type === "clear" || ev.type === "victory")
					for (const p of s.players || []) getRig(p.id, "hero").kick(2.5);
				if (
					[
						"bite",
						"catch",
						"clear",
						"plant",
						"hit",
						"wrap",
						"tree",
						"pickup",
						"victory",
					].includes(ev.type)
				) {
					const x = Number.isFinite(ev.x) ? ev.x : (s.players[0] || {}).x,
						y = Number.isFinite(ev.y) ? ev.y : (s.players[0] || {}).y;
					if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
					const count =
						ev.type === "clear" || ev.type === "victory"
							? 40
							: ev.type === "bite"
								? 15
								: 7;
					for (let n = 0; n < count; n++) {
						const a = (n / count) * Math.PI * 2 + seeded(n, s.tick || 0),
							v = 0.5 + seeded(n, 2) * 1.7;
						sparks.push({
							x,
							y,
							vx: Math.cos(a) * v,
							vy: Math.sin(a) * v,
							age: 0,
							life: 0.45 + seeded(n, 3) * 0.6,
							color:
								ev.type === "hit"
									? "#f6a9bb"
									: ev.type === "plant"
										? "#9addaf"
										: n % 2
											? "#ffe4aa"
											: "#f7ac7d",
							size: 1 + (n % 2),
						});
					}
				}
				if (ev.type === "bite")
					toast = { text: "CHOMP!  Sentries are scared!", life: 1.8 };
				if (ev.type === "pursue" || ev.type === "warning")
					toast = { text: "Heads up!  The head is hunting.", life: 2 };
				if (ev.type === "catch")
					toast = { text: "A dizzy Drat!  +10", life: 1.4 };
				if (ev.type === "hit")
					toast = { text: "Oof!  Back to the nursery.", life: 1.8 };
			}
		}
		function point(r, x, y) {
			return r.w((x + 0.5) * 16, (y + 0.5) * 16, 0);
		}
		function worldActor(r, a, fn, o = {}) {
			if (!Number.isFinite(a.x) || !Number.isFinite(a.y)) return;
			const wx = (a.x + 0.5) * 16,
				wy = (a.y + 0.5) * 16;
			r.shadow(wx, wy, 5, 0.43, "#0a1425");
			r.actor(wx, wy, 0, fn, { outlineColor: "#142435", ...o });
		}
		function drawMascot(r, x, y, size = 2, kind = "hero", t = clock) {
			const rig = getRig(
				kind === "partner" ? 2 : 0,
				kind === "head" ? "head" : "hero",
			);
			const v = Object.assign(Object.create(r.view), {
				scale: size,
				zoom: size,
			});
			r.overlay((g) => {
				if (kind === "tail") fruit(g, x, y, size, t);
				else {
					rig.draw(g, x, y, v);
					if (kind !== "head") crown(g, x, y, size, t);
				}
			});
		}
		function crown(g, x, y, z, t) {
			const cy = y - 5 * z;
			P.line(g, x, cy, x + 0.4 * z, cy - 4 * z, "#427d69", Math.max(1, z));
			leaf(g, x, cy - 2.5 * z, 4 * z, 2.5 * z, "#8ed4a0");
			leaf(g, x, cy - 2.5 * z, 3.3 * z, 3 * z, "#d3e8a1", true);
			P.rect(g, x - 4.1 * z, y + 2.7 * z, 8.2 * z, 1.2 * z, "#f5dca0");
			P.rect(g, x - 1.2 * z, y + 2.4 * z, 2.4 * z, 2 * z, "#ae7e5d");
		}
		function draw(r, s, opt = {}) {
			if (!s || !s.level) return;
			const b = layout(s, r.W, r.H),
				l = s.level,
				T = {
					...THEMES[(s.garden || 0) % 5],
					...(l.palette || {}),
					edge: l.palette?.top || THEMES[(s.garden || 0) % 5].edge,
					tile: E.mix(
						l.palette?.ground || THEMES[(s.garden || 0) % 5].ground,
						"#7bacb0",
						0.075,
					),
				},
				tm = s.time || clock,
				z = b.cell / 16,
				ground = r.ctx;
			lastLayout = b;
			// A quiet, layered garden bed surrounds the playable board; every passage stays clear.
			P.rect(ground, 0, 0, r.W + 2, r.H + 2, T.sky);
			for (let yy = 0; yy < r.H; yy += 4) {
				const f = yy / r.H;
				P.rect(ground, 0, yy, r.W + 2, 4, E.mix(T.sky, "#142c3d", f * 0.25));
			}
			for (let n = 0; n < 45; n++) {
				const x = seeded(n, 5) * r.W,
					y = seeded(n, 6) * r.H;
				if (
					x > b.x - 6 &&
					x < b.x + b.w + 6 &&
					y > b.y - 5 &&
					y < b.y + b.h + 5
				)
					continue;
				const drift = game.reduceMotion ? 0 : Math.sin(tm * 0.3 + n) * 2;
				P.dot(ground, x, y + drift, n % 4 === 0 ? "#869ba1" : "#334957");
			}
			P.rect(ground, b.x - 7, b.y - 7, b.w + 14, b.h + 17, "#091624");
			P.rect(ground, b.x - 5, b.y - 5, b.w + 10, b.h + 11, "#283a45");
			P.rect(ground, b.x - 4, b.y - 4, b.w + 8, b.h + 7, "#1a2934");
			P.rect(ground, b.x - 3, b.y - 3, b.w + 6, b.h + 6, T.edge);
			P.rect(ground, b.x - 2, b.y - 2, b.w + 4, b.h + 4, T.ground);
			for (let y = 0; y < l.h; y++)
				for (let x = 0; x < l.w; x++) {
					const xx = b.x + x * b.cell,
						yy = b.y + y * b.cell,
						n = seeded(x, y),
						wall = (l.rows[y] || "")[x] === "#";
					if (wall) {
						const tone = E.tones(T.wall);
						P.rect(ground, xx, yy, b.cell, b.cell, tone.deep);
						P.rect(ground, xx + 1, yy + 1, b.cell - 2, b.cell - 3, tone.base);
						P.rect(ground, xx + 1, yy + 1, b.cell - 2, 2, tone.lt);
						P.rect(ground, xx + 2, yy + 3, b.cell - 4, 1, T.edge);
						P.rect(ground, xx + 2, yy + b.cell - 4, b.cell - 4, 2, tone.sh);
						const topOpen = y > 0 && (l.rows[y - 1] || "")[x] !== "#";
						if (n > 0.55) {
							P.ell(
								ground,
								xx + b.cell * 0.4,
								yy + b.cell * 0.48,
								b.cell * 0.23,
								b.cell * 0.18,
								T.leaf,
							);
							P.ell(
								ground,
								xx + b.cell * 0.65,
								yy + b.cell * 0.61,
								b.cell * 0.21,
								b.cell * 0.17,
								tone.lt,
							);
						}
						if (n > 0.77)
							flower(
								ground,
								xx + b.cell * 0.6,
								yy + b.cell * 0.8,
								Math.max(0.55, z * 0.65),
								T.petal,
								tm,
							);
						if (topOpen && n > 0.4)
							P.rect(ground, xx + 3, yy + 1, b.cell - 6, 1, "#b6cda1");
					} else {
						P.rect(
							ground,
							xx,
							yy,
							b.cell,
							b.cell,
							(x + y) % 2 ? T.ground : T.tile,
						);
						if (n > 0.5)
							P.dot(
								ground,
								xx + Math.floor(n * (b.cell - 4)) + 2,
								yy + b.cell * 0.7,
								"#426366",
							);
						if (n > 0.86) {
							P.line(
								ground,
								xx + 3,
								yy + b.cell - 5,
								xx + 6,
								yy + b.cell - 5,
								"#48686c",
							);
							P.dot(ground, xx + 4, yy + b.cell - 6, "#5a8183");
						}
					}
				}
			// Small foliage, mushrooms and spectators inhabit only the outside rim.
			for (let n = 0; n < Math.floor(b.w / 13); n++) {
				const xx = b.x + n * 13 + 5,
					col = n % 3 ? T.leaf : T.edge;
				const side = n % 2 ? b.y + b.h + 8 : b.y - 6;
				if (n % 3 === 0)
					flower(ground, xx, side, Math.max(0.6, z * 0.7), T.petal, tm);
				else {
					leaf(ground, xx, side, 5, 4, col);
					leaf(ground, xx, side, 5, 5, E.shade(col, -0.2), true);
				}
			}
			for (let side of [-1, 1]) {
				const sx = side < 0 ? b.x - 35 : b.x + b.w + 35;
				if (sx < 18 || sx > r.W - 18) continue;
				for (let n = 0; n < 3; n++) {
					const sy = b.y + 24 + (n * (b.h - 38)) / 3,
						tc = E.tones(T.leaf);
					P.ell(ground, sx, sy + 12, 13, 4, "#091a28");
					P.poly(
						ground,
						[
							[sx - 9, sy + 2],
							[sx + 9, sy + 2],
							[sx + 6, sy + 12],
							[sx - 6, sy + 12],
						],
						"#5a5367",
					);
					P.rect(ground, sx - 10, sy + 1, 20, 3, "#8b7c87");
					P.line(ground, sx, sy + 1, sx - 2, sy - 16, T.leaf, 2);
					for (let a = 0; a < 5; a++) {
						const ax = (a - 2) * 7,
							ay = -7 - Math.abs(a - 2) * 2;
						P.poly(
							ground,
							[
								[sx, sy],
								[sx + ax, sy + ay - 8],
								[sx + ax + 4, sy + ay],
								[sx + 2, sy],
							],
							a % 2 ? tc.base : tc.sh,
						);
						P.line(ground, sx, sy, sx + ax + 1, sy + ay - 4, tc.lt);
					}
					if (n % 2 === 0) {
						flower(ground, sx - 2, sy - 12, 1.1, T.petal, tm);
					} else {
						P.ell(ground, sx - 2, sy - 17, 6, 5, "#b1c4ab");
						P.ell(ground, sx - 2, sy - 18, 5, 3.5, "#dbe2bc");
						P.dot(ground, sx - 4, sy - 18, "#31485b");
						P.dot(ground, sx, sy - 18, "#31485b");
						P.line(ground, sx - 3, sy - 15, sx - 1, sy - 15, "#6d8885");
					}
				}
			}
			for (let i = 0; i < l.wraps.length; i++) {
				const w = l.wraps[i],
					col = ["#99e5db", "#f2b0de", "#f8d28c"][i % 3];
				for (const a of [w.a, w.b]) {
					const q = point(r, a[0], a[1]),
						edgeX = a[0] === 0 ? -1 : a[0] === l.w - 1 ? 1 : 0,
						edgeY = a[1] === 0 ? -1 : a[1] === l.h - 1 ? 1 : 0;
					const cx = q[0] + edgeX * b.cell * 0.38,
						cy = q[1] + edgeY * b.cell * 0.38;
					for (let k = 0; k < 3; k++) {
						const ph = (tm * 2 + k / 3) % 1,
							R = b.cell * (0.21 + 0.13 * ph);
						if (edgeX) {
							P.line(
								ground,
								cx,
								cy - R,
								cx,
								cy + R,
								k === 0 ? col : E.shade(col, -0.25),
							);
							P.line(
								ground,
								cx - edgeX * (3 + k * 2),
								cy - 3,
								cx - edgeX * k * 2,
								cy,
								col,
							);
							P.line(
								ground,
								cx - edgeX * (3 + k * 2),
								cy + 3,
								cx - edgeX * k * 2,
								cy,
								col,
							);
						} else {
							P.line(
								ground,
								cx - R,
								cy,
								cx + R,
								cy,
								k === 0 ? col : E.shade(col, -0.25),
							);
							P.line(
								ground,
								cx - 3,
								cy - edgeY * (3 + k * 2),
								cx,
								cy - edgeY * k * 2,
								col,
							);
							P.line(
								ground,
								cx + 3,
								cy - edgeY * (3 + k * 2),
								cx,
								cy - edgeY * k * 2,
								col,
							);
						}
					}
					for (let mark = 0; mark <= i; mark++)
						P.rect(
							ground,
							cx + (edgeX ? 0 : mark * 3),
							cy + (edgeX ? mark * 3 : 0),
							2,
							2,
							"#fff3ca",
						);
				}
			}
			if (l.nursery) {
				const q = point(r, ...l.nursery),
					rr = b.cell * 0.4;
				P.rect(ground, q[0] - rr, q[1] - rr, rr * 2, rr * 2, "#355b65");
				ring(ground, q[0], q[1], rr, "#83a9a2");
				P.line(ground, q[0] - 3, q[1], q[0] + 3, q[1], "#a6d2b3");
				P.line(ground, q[0], q[1] - 3, q[0], q[1] + 3, "#a6d2b3");
			}
			for (const tr of s.trees || []) {
				const a = Array.isArray(tr) ? { x: tr[0], y: tr[1] } : tr;
				worldActor(
					r,
					a,
					(g, x, y) => {
						const tt = E.tones("#8fc6a1");
						P.line(
							g,
							x,
							y + 3 * z,
							x,
							y - 3 * z,
							"#a18870",
							Math.max(1, 2 * z),
						);
						leaf(g, x, y + z, 4 * z, 2 * z, "#658f76");
						P.ell(g, x, y - 3 * z, 4.1 * z, 3.6 * z, tt.deep);
						P.ell(g, x + 0.3 * z, y - 3.8 * z, 3.6 * z, 3 * z, tt.base);
						P.ell(g, x + 1.1 * z, y - 5 * z, 1.7 * z, 1.3 * z, tt.lt);
						P.disc(g, x - 1.7 * z, y - 3.8 * z, z, "#efd59b");
					},
					{ outline: false },
				);
			}
			for (const bt of s.bait || [])
				worldActor(
					r,
					bt,
					(g, x, y) => {
						const bounce = game.reduceMotion ? 0 : Math.sin(tm * 6) * z;
						P.ell(g, x, y + 2 * z, 4 * z, 1.5 * z, "#7e6f6b");
						P.line(g, x, y + 2 * z, x, y - 3 * z, "#5d9c78", Math.max(1, z));
						leaf(g, x, y - 1 * z, 4 * z, 3 * z, "#b1dc9b");
						leaf(g, x, y, 4 * z, 3 * z, "#73bb8d", true);
						P.disc(g, x, y - 3 * z + bounce, 2.7 * z, "#f4d78e");
						P.dot(g, x + 0.8 * z, y - 4 * z + bounce, "#fff8c8");
						diamond(g, x, y - 9 * z, 1.6 * z, "#bfe3a9");
					},
					{ emissive: true },
				);
			for (const c of s.crawlers || []) {
				const body = c.body || [];
				for (let i = body.length - 1; i >= 0; i--) {
					const a = body[i],
						tail = i === body.length - 1 && c.segments > 0;
					if (!Number.isFinite(a.x)) continue;
					worldActor(
						r,
						a,
						(g, x, y) => {
							const cm = chainMotion.get(c.id),
								since = clock - (cm?.at ?? -10) - i * 0.027,
								recoil =
									since > 0 && since < 0.45
										? Math.sin((since / 0.45) * Math.PI) * 0.18
										: 0,
								brushed =
									clock - (brushMotion.get(c.id + ":" + i) ?? -10) < 0.15;
							const bump = Math.sin(tm * 7 - i * 0.8) * 0.35 * z;
							if (tail) {
								const pulse = game.reduceMotion
									? 0
									: Math.sin(tm * 6) * 0.7 * z;
								ring(g, x, y, 6.7 * z + pulse, "#e8d69b");
								fruit(g, x, y + bump, z * (1 + recoil * 0.6), tm);
								diamond(g, x, y - 10 * z, 2.1 * z, "#fff2b9");
							} else {
								const base = i % 2 ? "#98bc82" : "#aec58b",
									tt = E.tones(base);
								const squash = brushed ? 0.22 : recoil;
								P.ell(
									g,
									x,
									y + bump,
									4.7 * z * (1 + squash),
									4.3 * z * (1 - squash),
									tt.deep,
								);
								P.ell(
									g,
									x + 0.3 * z,
									y - 0.5 * z + bump,
									4 * z * (1 + squash),
									3.6 * z * (1 - squash),
									tt.base,
								);
								P.ell(g, x + z, y - 1.7 * z + bump, 2.5 * z, 1.5 * z, tt.lt);
								P.line(
									g,
									x - 2 * z,
									y + 2 * z,
									x - 3.5 * z,
									y + 3 * z,
									"#62745d",
									Math.max(1, z),
								);
								P.line(
									g,
									x + 2 * z,
									y + 2 * z,
									x + 3.5 * z,
									y + 3 * z,
									"#62745d",
									Math.max(1, z),
								);
								P.dot(g, x + 1.4 * z, y - 2.5 * z, "#e3e7bc");
							}
						},
						{ emissive: tail, outlineColor: "#263b3e" },
					);
				}
				worldActor(
					r,
					c,
					(g, x, y) => {
						const rig = getRig(c.id, "head");
						rig.draw(g, x, y, r.view);
						const chasing =
							c.mode === "pursue" ||
							c.mode === "hunt" ||
							c.mode === "urgent" ||
							c.segments <= 2;
						P.line(
							g,
							x - 4 * z,
							y - 2.8 * z,
							x - 1 * z,
							y - 1.8 * z,
							"#473351",
							Math.max(1, z),
						);
						P.line(
							g,
							x + 4 * z,
							y - 2.8 * z,
							x + 1 * z,
							y - 1.8 * z,
							"#473351",
							Math.max(1, z),
						);
						P.rect(g, x - 3 * z, y + 2 * z, 6 * z, 2.5 * z, "#422f4d");
						for (const dx of [-2, 0, 2])
							P.poly(
								g,
								[
									[x + (dx - 0.5) * z, y + 2 * z],
									[x + (dx + 0.7) * z, y + 2 * z],
									[x + dx * z, y + 4 * z],
								],
								"#fff2d4",
							);
						if (chasing) {
							P.line(
								g,
								x + 7 * z,
								y - 7 * z,
								x + 7 * z,
								y - 11 * z,
								"#ffd58b",
								Math.max(1, z),
							);
							P.dot(g, x + 7 * z, y - 5 * z, "#ffe4b4");
						}
						if (c.mode === "chew")
							for (let i = 0; i < 3; i++)
								P.dot(
									g,
									x + (i - 1) * 4 * z,
									y + 6 * z + Math.sin(tm * 13 + i) * z,
									"#ddcd91",
								);
					},
					{ outlineColor: "#30213d" },
				);
			}
			for (const a of s.sentries || []) {
				const k =
						a.id === 0 || a.id === 1 || a.id === "trail" ? "trail" : "junction",
					fright = a.fright > 0 || a.mode === "frightened" || a.mode === "flee",
					spin = a.spin > 0 || a.mode === "spin";
				worldActor(
					r,
					a,
					(g, x, y) => {
						const rig = getRig(a.id, k),
							old = rig.C;
						rig.C =
							fright || spin
								? {
										...old,
										base: "#dce5cc",
										dk: "#8ba9ae",
										lt: "#fff4d4",
										eye: "#ffffff",
										pupil: "#617b8a",
										wing: "#adbfbb",
									}
								: old;
						const jitter =
							fright && !game.reduceMotion
								? Math.sin(tm * 28 + a.id) * z * 0.4
								: 0;
						rig.draw(g, x + jitter, y, r.view);
						rig.C = old;
						if (spin) {
							for (let i = 0; i < 3; i++) {
								const an = tm * 9 + (i * Math.PI * 2) / 3;
								diamond(
									g,
									x + Math.cos(an) * 7 * z,
									y + Math.sin(an) * 4 * z - 4 * z,
									z,
									"#ffe4a9",
								);
							}
						} else if (fright) {
							P.line(g, x - 3 * z, y + 2 * z, x - 2 * z, y + z, "#69899a");
							P.line(g, x - 2 * z, y + z, x, y + 2 * z, "#69899a");
							P.line(g, x, y + 2 * z, x + 2 * z, y + z, "#69899a");
							P.line(g, x + 2 * z, y + z, x + 3 * z, y + 2 * z, "#69899a");
							if ((a.fright || 5) < 1.6 && Math.floor(tm * 5) % 2 === 0)
								ring(g, x, y, 6 * z, "#fff6d8");
						} else if (k === "trail") {
							P.rect(g, x - 5 * z, y + z, 2 * z, 1.3 * z, "#efc7a8");
							P.rect(g, x + 3 * z, y + z, 2 * z, 1.3 * z, "#efc7a8");
						} else diamond(g, x, y - 7 * z, 1.5 * z, "#f6d5a5");
					},
					{ outlineColor: "#372d4f" },
				);
			}
			for (const p of s.players || [])
				worldActor(
					r,
					p,
					(g, x, y) => {
						const rig = getRig(p.id, "hero");
						rig.draw(g, x, y, r.view);
						crown(g, x, y, z, tm);
						if (s.players.length > 1)
							font(
								g,
								String(p.id),
								x,
								y - 13 * z,
								p.id === 2 ? "#ffd3b0" : "#b8edfb",
								{ font: "tiny", align: "center" },
							);
						if (p.invuln > 0)
							ring(g, x, y, 7.5 * z + Math.sin(tm * 9) * 0.5 * z, "#d0eaff");
					},
					{
						alpha: p.respawn > 0 ? 0.35 : 1,
						flash:
							p.invuln > 0 && Math.floor(tm * 10) % 2 === 0
								? "#d4f2ff"
								: undefined,
						flashMix: 0.22,
						outlineColor: "#132b44",
					},
				);
			const pv = opt.preview;
			if (pv) {
				const cell = Array.isArray(pv) ? pv : pv.cell || [pv.x, pv.y];
				if (cell && Number.isFinite(cell[0])) {
					const q = point(r, ...cell),
						col = pv.valid === false ? "#eb9c9f" : "#bbe2aa";
					r.overlay((g) => {
						ring(g, q[0], q[1], b.cell * 0.38, col);
						P.line(g, q[0] - 3, q[1], q[0] + 3, q[1], col);
						P.line(g, q[0], q[1] - 3, q[0], q[1] + 3, col);
					});
				}
			}
			for (const c of s.crawlers || []) {
				const tail = (c.body || []).at(-1);
				if (tail && c.segments > 0)
					game.lights.add(
						(tail.x + 0.5) * 16,
						(tail.y + 0.5) * 16,
						5,
						35,
						0.12,
						{ color: "#f6d78b" },
					);
			}
			if (l.nursery)
				game.lights.add(
					(l.nursery[0] + 0.5) * 16,
					(l.nursery[1] + 0.5) * 16,
					3,
					43,
					0.08,
					{ color: "#85c9d9" },
				);
			const dbg = opt.debug || {};
			if (dbg.grid || dbg.wraps || dbg.graph)
				r.overlay((g) => {
					for (let x = 0; x <= l.w; x++)
						P.line(
							g,
							b.x + x * b.cell,
							b.y,
							b.x + x * b.cell,
							b.y + b.h,
							"#729da0",
						);
					for (let y = 0; y <= l.h; y++)
						P.line(
							g,
							b.x,
							b.y + y * b.cell,
							b.x + b.w,
							b.y + y * b.cell,
							"#729da0",
						);
					if (dbg.wraps || dbg.graph)
						for (const w of l.wraps) {
							const a = point(r, ...w.a),
								c = point(r, ...w.b);
							P.line(g, ...a, ...c, "#ffd6a3");
						}
				});
			if (dbg.hitboxes)
				r.overlay((g) => {
					for (const a of [...s.players, ...s.crawlers, ...s.sentries]) {
						const q = point(r, a.x, a.y);
						ring(g, ...q, b.cell * 0.35, "#ffe4ae");
					}
				});
			if (dbg.history)
				r.overlay((g) => {
					for (const c of s.crawlers) {
						const hist = c.history || [];
						for (const a of hist) {
							if (Number.isFinite(a.x)) {
								const q = point(r, a.x, a.y);
								P.dot(g, ...q, "#eaa3cc");
							} else if (Array.isArray(a)) {
								const q = point(r, a[0], a[1]);
								P.dot(g, ...q, "#eaa3cc");
							}
						}
					}
				});
			if (dbg.targets || dbg.ai)
				r.overlay((g) => {
					for (const a of [...s.crawlers, ...s.sentries]) {
						const ta = a.target;
						if (ta) {
							const target = Array.isArray(ta) ? ta : [ta.x, ta.y];
							if (Number.isFinite(target[0])) {
								const q = point(r, ...target);
								diamond(g, ...q, 4, "#f1c4da");
							}
						}
					}
				});
			r.overlay((g) => {
				for (const a of sparks) {
					const q = point(r, a.x + a.vx * a.age, a.y + a.vy * a.age);
					const lift = Math.sin((a.age / a.life) * Math.PI) * 7;
					P.rect(g, q[0], q[1] - lift, a.size, a.size, a.color);
				}
				if (opt.hud !== false) {
					const tail = (s.crawlers || []).reduce((n, c) => n + c.segments, 0);
					P.rect(g, 0, 0, r.W, 31, "#111f30");
					P.rect(g, 0, 30, r.W, 1, "#324652");
					if (b.portrait) {
						font(
							g,
							"GARDEN " + ((s.garden || 0) + 1) + " / 5",
							12,
							7,
							"#acc9c8",
						);
						font(
							g,
							"SCORE " + String(s.score || 0).padStart(4, "0"),
							r.W / 2,
							7,
							"#f7dba0",
							{ align: "center" },
						);
						font(g, "LIVES " + (s.lives || 0), 12, 20, "#efb7b8");
						font(g, "SEEDS " + (s.seeds || 0), r.W / 2, 20, "#b8d6a8", {
							align: "center",
						});
						font(g, "TAIL " + tail, r.W - 12, 20, "#f2d499", {
							align: "right",
						});
						font(g, l.name || "VENUS GARDEN", r.W / 2, 43, "#d7daca", {
							align: "center",
						});
					} else {
						font(g, "LIVES " + (s.lives || 0), 14, 7, "#efb7b8");
						for (let i = 0; i < Math.min(3, s.lives); i++)
							font(g, "♥", 68 + i * 10, 6, "#efa5ad", { scale: 1 });
						font(
							g,
							String(s.score || 0).padStart(5, "0"),
							r.W / 2,
							6,
							"#f8dfac",
							{ align: "center", scale: 2 },
						);
						font(g, "SEEDS " + (s.seeds || 0), r.W - 143, 7, "#bdd8a8");
						font(g, "TAIL " + tail, r.W - 14, 7, "#f0d9ab", { align: "right" });
						font(
							g,
							(s.garden || 0) + 1 + " / 5  " + (l.name || "VENUS GARDEN"),
							r.W / 2,
							32,
							"#aac8c4",
							{ font: "tiny", align: "center" },
						);
					}
					const plantPrompt =
						(game.input.map.plant ? game.input.label("plant") : "Space") +
						": plant bait.";
					let hint = toast
						? toast.text
						: clock - entered < 3
							? l.quip || "Chase the glowing tail.  Dodge the toothy head."
							: clock - entered < 10
								? "Bite the glowing LAST segment. Dodge the horned head. " +
									plantPrompt
								: "Trees refill seeds. Catch pale sentries after a bite. " +
									plantPrompt;
					const max = b.portrait ? 42 : 82;
					const lines = E.font.wrap(hint, max * 5, { font: "tiny" });
					for (let i = 0; i < Math.min(b.portrait ? 3 : 2, lines.length); i++)
						font(g, lines[i], r.W / 2, b.y + b.h + 18 + i * 8, "#b5c8c4", {
							font: "tiny",
							align: "center",
						});
					const mult =
						typeof s.combo === "object" ? s.combo.mult || 1 : s.combo || 1;
					if (mult > 1) {
						font(
							g,
							"CHAIN x" + mult + "  " + Math.ceil(s.combo.timer || 0) + "s",
							r.W - 12,
							b.portrait ? 43 : 20,
							"#f0bd8e",
							{
								align: "right",
								font: "tiny",
							},
						);
						E.ui.bar(
							g,
							r.W - 68,
							b.portrait ? 52 : 28,
							56,
							2,
							Math.min(1, (s.combo.timer || 0) / 6),
							"#f0bd8e",
						);
					}
				}
				if (opt.attract) {
					E.ui.box(g, r.W / 2 - 89, Math.max(34, b.y - 18), 178, 17, {
						bg: "#15263a",
						border: "#d5bf89",
					});
					font(
						g,
						"GARDEN TOUR  •  INPUT TO RETURN",
						r.W / 2,
						Math.max(39, b.y - 13),
						"#f0dda5",
						{ font: "tiny", align: "center" },
					);
				}
			});
		}
		function pointerToCell(s, sx, sy) {
			const b = layout(s);
			if (sx < b.x || sy < b.y || sx >= b.x + b.w || sy >= b.y + b.h)
				return null;
			return [Math.floor((sx - b.x) / b.cell), Math.floor((sy - b.y) / b.cell)];
		}
		return {
			prepare,
			layout,
			update,
			event,
			draw,
			drawMascot,
			pointerToCell,
			themes: THEMES,
			debug: () => ({
				rigs: rigs.size,
				sparks: sparks.length,
				layout: lastLayout,
			}),
		};
	}
	globalThis.GardenView = { create, themes: THEMES };
})();
