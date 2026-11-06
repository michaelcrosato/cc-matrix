/* Yars of Ruin: authored mathematical insect rigs and siege-station bodies.
   All art uses my-3D2dge's shaded pixel primitives, actor queue and lights. */
(() => {
	"use strict";
	const root = typeof window !== "undefined" ? window : globalThis;
	const E = root.My3D2dge,
		px = E.px,
		TAU = Math.PI * 2;
	const clamp = (v, a, b) => Math.max(a, Math.min(b, v)),
		mix = (a, b, t) => a + (b - a) * t;
	const PAL = [
		{
			bg: "#080f1c",
			nebula: "#152e3b",
			back: "#172a36",
			deep: "#141c28",
			metal: "#334954",
			trim: "#80b7b6",
			shield: "#c38850",
			hot: "#ffd899",
			core: "#ff7860",
			static: "#72d7d5",
			enemy: "#fb676f",
		},
		{
			bg: "#110e21",
			nebula: "#322146",
			back: "#2d253c",
			deep: "#211728",
			metal: "#51416a",
			trim: "#c8a1d2",
			shield: "#c66392",
			hot: "#ffc1dc",
			core: "#ffb862",
			static: "#b4caff",
			enemy: "#ff896c",
		},
		{
			bg: "#0c101b",
			nebula: "#23312e",
			back: "#263b36",
			deep: "#131e24",
			metal: "#4f6258",
			trim: "#b8c7a2",
			shield: "#a6ad59",
			hot: "#f1ffc0",
			core: "#ee698f",
			static: "#8fedc8",
			enemy: "#ff7386",
		},
	];
	const PLAYER = ["#80f2db", "#f8bf73"];
	function hash(n) {
		n = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
		n = Math.imul(n ^ (n >>> 13), 0xc2b2ae35);
		return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
	}
	function ring(
		g,
		x,
		y,
		rad,
		width,
		color,
		segments = 48,
		offset = 0,
		portion = 1,
	) {
		let last = null;
		for (let i = 0; i <= segments * portion; i++) {
			const a = offset + (i / segments) * TAU,
				p = [x + Math.cos(a) * rad, y + Math.sin(a) * rad];
			if (last) px.line(g, ...last, ...p, color, width);
			last = p;
		}
	}
	function dashedRing(g, x, y, rad, color, rotation = 0) {
		for (let i = 0; i < 12; i++)
			ring(g, x, y, rad, 1, color, 60, rotation + (i / 12) * TAU, 0.045);
	}
	function transform(x, y, a, s = 1) {
		const c = Math.cos(a),
			d = Math.sin(a);
		return (u, v) => [x + (u * c - v * d) * s, y + (u * d + v * c) * s];
	}
	function plate(g, x, y, w, h, T, bevel = 3) {
		px.rect(g, x - w / 2, y - h / 2, w, h, T.deep);
		px.poly(
			g,
			[
				[x - w / 2, y - h / 2],
				[x + w / 2, y - h / 2],
				[x + w / 2 - bevel, y - h / 2 + bevel],
				[x - w / 2 + bevel, y - h / 2 + bevel],
			],
			T.lt,
		);
		px.poly(
			g,
			[
				[x - w / 2, y - h / 2],
				[x - w / 2 + bevel, y - h / 2 + bevel],
				[x - w / 2 + bevel, y + h / 2 - bevel],
				[x - w / 2, y + h / 2],
			],
			T.base,
		);
		px.rect(
			g,
			x - w / 2 + bevel,
			y - h / 2 + bevel,
			w - 2 * bevel,
			h - 2 * bevel,
			T.sh,
		);
		px.rect(g, x + w / 2 - bevel, y - h / 2 + bevel, bevel, h - bevel, T.deep);
	}
	function insect(g, x, y, t, p, scale = 1, ghost = false) {
		const idx = p.index || 0,
			C = E.tones(p.color || PLAYER[idx % 2]),
			iv = E.tones(idx ? "#eed0a0" : "#c9e7d8");
		const a = Math.atan2(p.ay || 0, p.ax === undefined ? 1 : p.ax),
			P = transform(x, y, a, scale),
			speed = Math.hypot(p.vx || 0, p.vy || 0),
			bank = clamp((p.vy || 0) / 280, -0.5, 0.5);
		const flap = 0.55 + Math.sin(t * 48 + idx * 2) * 0.4,
			flap2 = 0.62 + Math.sin(t * 48 + 1.4 + idx * 2) * 0.32;
		const wing = (side, rear) => {
			const f = rear ? flap2 : flap,
				span = (rear ? 18 : 27) * f * (1 + side * bank * 0.25),
				u = rear ? -10 : -1;
			const pts = [
				P(u, side * 3),
				P(u - 15, side * (span * 0.7)),
				P(u - 13, side * (span + 4)),
				P(u + 6, side * (span * 0.8)),
				P(u + 9, side * 5),
			];
			px.poly(g, pts, C.deep);
			px.poly(
				g,
				[
					P(u + 1, side * 4),
					P(u - 12, side * (span * 0.7)),
					P(u - 11, side * (span + 1)),
					P(u + 4, side * (span * 0.7)),
					P(u + 7, side * 5),
				],
				rear ? "#526e7c" : "#81aaa9",
			);
			px.line(
				g,
				...P(u + 1, side * 4),
				...P(u - 9, side * (span * 0.85)),
				C.lt,
				1,
			);
			px.line(
				g,
				...P(u - 7, side * (span * 0.7)),
				...P(u + 5, side * (span * 0.65)),
				C.sh,
				1,
			);
			if (!rear)
				px.line(
					g,
					...P(u - 10, side * (span * 0.92)),
					...P(u + 2, side * (span * 0.72)),
					iv.lt,
					1,
				);
		};
		// Three articulated leg pairs, tucked in flight; two pairs of veined living wings.
		for (let s = -1; s <= 1; s += 2)
			for (let i = 0; i < 3; i++) {
				const u = 2 - i * 6,
					kick = Math.sin(t * 11 + i + s) * 1.2,
					tip = P(u - 6, s * (11 + i * 0.4 + kick));
				px.line(g, ...P(u, s * 4), ...P(u - 2, s * 9), C.deep, 3);
				px.line(g, ...P(u - 2, s * 9), ...tip, C.sh, 2);
				px.dot(g, ...tip, C.lt);
			}
		wing(-1, true);
		wing(1, true);
		wing(-1, false);
		wing(1, false);
		// Abdomen segments carry a continuous chitin ramp and engraved bands.
		for (let i = 3; i >= 0; i--) {
			const q = P(-6 - i * 4, 0),
				rr = 6 - i * 0.7;
			px.disc(g, ...q, rr + 1, C.deep);
			px.disc(g, q[0] - 0.5, q[1] - 1, rr, C.sh);
			px.disc(g, q[0] - 1, q[1] - 2, rr * 0.65, C.base);
			px.line(
				g,
				...P(-8 - i * 4, -rr * 0.55),
				...P(-8 - i * 4, rr * 0.55),
				C.lt,
				1,
			);
		}
		const chest = P(1, 0);
		px.disc(g, ...chest, 8, C.deep);
		px.disc(g, chest[0] - 0.8, chest[1] - 1, 6.5, iv.sh);
		px.disc(g, chest[0] - 2, chest[1] - 2, 4.6, iv.lt);
		const ready = !!p.ready;
		px.poly(
			g,
			[P(-1, -3), P(4, -3), P(6, 0), P(4, 3), P(-1, 3), P(-3, 0)],
			ready ? "#f3fff0" : C.base,
		);
		px.line(g, ...P(0, -2), ...P(3, -2), ready ? "#ffffff" : C.hi, 1);
		if (idx) {
			px.poly(g, [P(-4, -3), P(-2, 0), P(-4, 3), P(-6, 0)], "#eeab57");
			px.line(g, ...P(-14, -3), ...P(-12, 3), "#fbedd0", 1);
		} else px.dot(g, ...P(-9, 0), C.hi);
		const head = P(10, 0);
		px.disc(g, ...head, 6.7, C.deep);
		px.disc(g, head[0] - 1, head[1] - 1, 5.2, C.base);
		px.line(g, ...P(10, -3), ...P(13, -2), C.hi, 2);
		px.line(g, ...P(10, 3), ...P(13, 2), C.hi, 2);
		const bite = Math.max(0, p.biteFlash || 0) * 22,
			open = 2 + Math.sin(t * 57) * bite;
		for (const s of [-1, 1]) {
			px.line(g, ...P(14, s * 3), ...P(19, s * (open + 1)), iv.sh, 2);
			px.line(g, ...P(19, s * (open + 1)), ...P(21, s * open), iv.hi, 1);
			px.line(g, ...P(10, s * 4), ...P(14, s * 11), C.sh, 1);
			px.line(
				g,
				...P(14, s * 11),
				...P(20, s * (12 + Math.sin(t * 5) * 2)),
				iv.base,
				1,
			);
			px.dot(g, ...P(20, s * (12 + Math.sin(t * 5) * 2)), C.hi);
		}
		if (speed > 20 && !ghost)
			px.line(g, ...P(-24, 0), ...P(-28 - speed * 0.02, 0), C.sh, 2);
	}
	function create(game) {
		let fx = [],
			seen = new Set(),
			lastSector = -1,
			lastOpts = {},
			disposed = false;
		game.lights.enabled = true;
		game.lights.ambient = 0.71;
		const now = () => (Number.isFinite(game.time) ? game.time : 0);
		function event(ev, w) {
			if (disposed) return;
			const key = ev.id ?? `${w.tick}:${ev.type}:${ev.player ?? ""}`;
			if (seen.has(key)) return;
			seen.add(key);
			if (seen.size > 2048) seen.delete(seen.values().next().value);
			let seed = 2166136261;
			for (const ch of String(key))
				seed = Math.imul(seed ^ ch.charCodeAt(0), 16777619);
			const T = PAL[w.sector] || PAL[0],
				x = ev.x ?? w.core.x,
				y = ev.y ?? w.core.y;
			const colors =
				ev.type === "bite"
					? [PLAYER[ev.player || 0], T.hot]
					: ev.material === "reflective"
						? ["#ffe9bb", "#ffc885"]
						: [T.hot, T.core, T.trim];
			let n = 0,
				life = 0.6,
				power = 45,
				kind = "debris";
			if (ev.type === "bite") {
				n = 12;
				power = 48;
				kind = "in";
				life = 0.35;
			} else if (ev.type === "chip") {
				n = 12;
				power = 75;
			} else if (ev.type === "charge" || ev.type === "refill") {
				n = 32;
				power = 90;
				kind = "rise";
				life = 0.7;
			} else if (ev.type === "core-hit") {
				n = 165;
				power = 270;
				life = 1.7;
			} else if (ev.type === "death") {
				n = 40;
				power = 120;
				life = 0.9;
			} else if (ev.type === "cannon-fire") {
				n = 32;
				power = 130;
				life = 0.5;
			} else if (ev.type === "reflection") {
				n = 26;
				power = 100;
				life = 0.65;
			} else if (ev.type === "respawn") {
				n = 30;
				power = 70;
				kind = "in";
				life = 0.6;
			} else if (ev.type === "sector-clear" || ev.type === "victory") {
				n = 220;
				power = 370;
				life = 2.4;
			} else if (ev.type === "immune") {
				n = 6;
				power = 55;
				life = 0.23;
			}
			for (let i = 0; i < n; i++) {
				const a = hash(i * 117 + seed * 3) * TAU,
					v = (0.25 + hash(i * 19 + 17)) * power;
				fx.push({
					x,
					y,
					a,
					v,
					born: now(),
					life: life * (0.6 + hash(i * 33 + 11) * 0.5),
					kind,
					color: colors[i % colors.length],
					size: 1 + hash(i * 7) * 3,
					spin: hash(i * 31) * TAU,
				});
			}
			if (
				[
					"core-hit",
					"sector-clear",
					"victory",
					"cannon-fire",
					"reflection",
					"charge",
					"refill",
					"death",
					"swirl-launch",
				].includes(ev.type)
			)
				fx.push({
					x,
					y,
					born: now(),
					life:
						ev.type === "victory" ? 2.8 : ev.type === "core-hit" ? 1.4 : 0.65,
					kind: "ring",
					size:
						ev.type === "victory"
							? 440
							: ev.type === "core-hit"
								? 190
								: ev.type === "cannon-fire"
									? 80
									: 60,
					color: ev.type === "reflection" ? "#ffd28d" : T.hot,
				});
			if (
				["core-hit", "sector-clear", "victory"].includes(ev.type) &&
				!lastOpts.reducedShake
			)
				game.shake(ev.type === "core-hit" ? 5 : 9);
		}
		function backdrop(r, w, T, t) {
			const g = r.ctx,
				[ox, oy] = r.w(0, 0);
			px.rect(g, 0, 0, r.W + 2, r.H + 2, T.bg);
			// Wide stepped nebula clouds stay behind the machinery, never read as hitboxes.
			for (let i = 0; i < 8; i++)
				px.blend(g, 0.1, "normal", () =>
					px.ell(
						g,
						ox + 690 + Math.sin(i * 1.7) * 180,
						oy + 270 + Math.cos(i * 1.3) * 180,
						270 - i * 16,
						110,
						T.nebula,
					),
				);
			for (let i = 0; i < 185; i++) {
				const sx = hash(i * 37 + 4) * 960,
					sy = hash(i * 93 + 18) * 540,
					v = 0.25 + hash(i * 21) * 0.6;
				px.blend(g, v, "normal", () => {
					px.rect(
						g,
						ox + sx,
						oy + sy,
						i % 19 === 0 ? 2 : 1,
						i % 19 === 0 ? 2 : 1,
						i % 7 ? "#6b8a93" : "#bdd4d2",
					);
					if (i % 43 === 0)
						px.line(g, ox + sx - 2, oy + sy, ox + sx + 2, oy + sy, T.trim);
				});
			}
			// Ruined orbital ribs and etched signal routes, all deliberately dark and peripheral.
			for (const side of [-1, 1]) {
				const y = side === -1 ? 45 : 495;
				for (let i = 0; i < 13; i++) {
					const x = 64 + i * 70,
						h = 12 + hash(i * 19 + w.sector) * 25;
					px.poly(
						g,
						[
							[ox + x - 16, oy + y],
							[ox + x + 12, oy + y],
							[ox + x + 25, oy + y + side * h],
							[ox + x - 8, oy + y + side * (h + 8)],
						],
						T.back,
					);
					px.line(g, ox + x - 13, oy + y, ox + x + 10, oy + y, T.metal, 1);
					px.line(
						g,
						ox + x + 10,
						oy + y,
						ox + x + 22,
						oy + y + side * h,
						T.deep,
						3,
					);
					for (let q = 0; q < 3; q++)
						px.rect(
							g,
							ox + x - 5 + q * 5,
							oy + y + side * (6 + q * 2),
							2,
							2,
							T.trim,
						);
				}
				px.line(
					g,
					ox + 55,
					oy + y + side * 9,
					ox + 940,
					oy + y + side * 9,
					T.back,
					1,
				);
			}
			for (let i = 0; i < 14; i++) {
				const x = 90 + hash(i * 27) * 820,
					y = 80 + hash(i * 47) * 380;
				px.blend(g, 0.12, "normal", () => {
					const a = hash(i * 11) * TAU;
					px.line(
						g,
						ox + x,
						oy + y,
						ox + x + Math.cos(a) * 40,
						oy + y + Math.sin(a) * 40,
						T.trim,
					);
					px.rect(g, ox + x - 2, oy + y - 2, 4, 4, T.trim);
				});
			}
			// Tiny faraway survivors have winged silhouettes rather than generic stars.
			for (let i = 0; i < 12; i++) {
				const x = 85 + ((i * 71 + t * 4) % 820),
					y = 90 + hash(i * 49) * 360;
				px.blend(g, 0.2, "normal", () => {
					px.line(g, ox + x - 3, oy + y - 2, ox + x, oy + y, T.trim);
					px.line(g, ox + x, oy + y, ox + x + 3, oy + y - 2, T.trim);
					px.dot(g, ox + x, oy + y + 1, T.trim);
				});
			}
			// Paired edge markings express vertical wrap in the live arena.
			for (let x = 115; x < 930; x += 110)
				for (const y of [5, 535]) {
					const k = y < 20 ? 1 : -1;
					px.poly(
						g,
						[
							[ox + x - 5, oy + y + k * 4],
							[ox + x, oy + y],
							[ox + x + 5, oy + y + k * 4],
						],
						T.metal,
					);
					px.line(
						g,
						ox + x - 4,
						oy + y + k * 8,
						ox + x + 4,
						oy + y + k * 8,
						T.back,
					);
				}
		}
		function refuge(r, w, T, t) {
			const ref = w.refuge || { x: 355, w: 100, active: true },
				g = r.ctx,
				[x, y] = r.w(ref.x, 0),
				width = ref.w || 100,
				on = ref.active !== false;
			px.blend(g, on ? 0.22 : 0.09, "normal", () =>
				px.rect(g, x, y, width, 540, on ? T.static : T.enemy),
			);
			for (let i = 0; i < 135; i++) {
				const xx = x + 3 + hash(i * 13 + 8) * (width - 6),
					yy =
						y +
						((((i * 137 + Math.floor(t * 22) * (i % 2 ? 1 : -1)) % 540) + 540) %
							540),
					col = i % 5 === 0 ? "#e4fdf3" : i % 3 ? T.static : T.trim;
				px.blend(g, on ? (i % 5 ? 0.25 : 0.5) : 0.12, "add", () =>
					px.rect(g, xx, yy, 3 + hash(i * 23) * 17, 1 + hash(i * 3) * 3, col),
				);
			}
			const warning = !!ref.warning;
			for (const dx of [0, width]) {
				px.line(g, x + dx, y, x + dx, y + 540, on ? T.static : "#7c3a4d", 2);
				px.line(
					g,
					x + dx + (dx ? 3 : -3),
					y,
					x + dx + (dx ? 3 : -3),
					y + 540,
					on ? T.back : T.deep,
					1,
				);
				for (let i = 0; i < 16; i++) {
					const yy = y + ((i * 37 + t * 12) % 540);
					px.rect(
						g,
						x + dx - 2,
						yy,
						5,
						7,
						warning && Math.sin(t * 8) > 0 ? T.hot : on ? T.static : T.enemy,
					);
				}
			}
			if (warning || !on) {
				const label = warning ? "REFUGE FRACTURING" : "STATIC OFFLINE";
				const [cx, cy] = r.w(ref.x + width / 2, 100);
				E.font.text(g, label, cx, cy, T.hot, {
					align: "center",
					scale: 1,
					shadow: "#080f1c",
					outline: false,
				});
			}
			game.lights.add(
				ref.x + width * 0.5,
				270,
				1,
				width * 1.4,
				on ? 0.2 : 0.04,
				{ color: T.static },
			);
		}
		function station(r, w, T, t) {
			const g = r.ctx,
				c = w.core || { x: 810, y: 270, dockX: 810, dockY: 270 },
				[cx, cy] = r.w(c.dockX || 810, c.dockY || 270),
				phase = c.phase || 0,
				collapsed = w.mode === "victory" || w.mode === "transition";
			const M = E.tones(T.metal),
				R = E.tones(T.trim),
				radius = 138 - phase * 17;
			// Colossal fixed installation: concentric sockets and cable-borne armor petals.
			for (let i = 0; i < 8 - phase; i++) {
				const a =
						(i / (8 - phase)) * TAU +
						(w.sector === 1 ? Math.sin(t * 0.3) * 0.07 : 0),
					P = transform(cx, cy, a),
					inset = 92 + Math.sin(t * 0.5 + i) * 3;
				px.line(g, ...P(24, 0), ...P(inset + 28, 0), T.deep, 18);
				px.line(g, ...P(28, -2), ...P(inset + 24, -2), T.back, 9);
				px.line(g, ...P(40, -4), ...P(inset + 20, -4), T.metal, 2);
				for (let k = 0; k < 4; k++) {
					px.line(g, ...P(51 + k * 14, -6), ...P(49 + k * 14, 6), T.deep, 2);
					px.line(g, ...P(52 + k * 14, -6), ...P(50 + k * 14, 6), M.base, 1);
				}
				const q = P(inset + 22, 0),
					Q = transform(q[0], q[1], a);
				px.poly(
					g,
					[Q(-15, -12), Q(18, -8), Q(25, 0), Q(18, 8), Q(-15, 12), Q(-23, 0)],
					T.deep,
				);
				px.poly(
					g,
					[Q(-12, -9), Q(17, -6), Q(21, 0), Q(17, 6), Q(-12, 9), Q(-19, 0)],
					M.sh,
				);
				px.line(g, ...Q(-12, -9), ...Q(17, -6), M.lt, 1);
				px.line(g, ...Q(17, -6), ...Q(21, 0), M.base, 1);
				if (!collapsed)
					px.line(g, ...Q(-8, -1), ...Q(11, -1), i % 2 ? T.core : T.hot, 1);
			}
			ring(g, cx, cy, radius, 1, T.back, 72);
			ring(g, cx, cy, radius + 10, 1, T.deep, 72);
			for (let i = 0; i < 32; i++) {
				const a = (i / 32) * TAU,
					x = cx + Math.cos(a) * radius,
					y = cy + Math.sin(a) * radius;
				px.line(g, x, y, x + Math.cos(a) * 4, y + Math.sin(a) * 4, T.metal, 1);
			}
			// A dark cruciform docking altar remains distinct from the actual moving heart.
			px.poly(
				g,
				[
					[cx - 52, cy - 45],
					[cx + 52, cy - 45],
					[cx + 60, cy + 45],
					[cx - 60, cy + 45],
				],
				T.deep,
			);
			for (const s of [-1, 1]) {
				plate(g, cx + s * 41, cy, 16, 74, M, 3);
				px.line(
					g,
					cx + s * 41,
					cy - 20,
					cx + s * 41,
					cy + 20,
					collapsed ? T.deep : R.base,
					1,
				);
			}
			if (
				c.state === "flight" ||
				c.state === "windup" ||
				c.state === "return"
			) {
				dashedRing(g, cx, cy, 34, T.static, t * 0.3);
				px.disc(g, cx, cy, 5, T.back);
			}
			if (!collapsed)
				game.lights.add(c.dockX || 810, c.dockY || 270, 1, 190, 0.25, {
					color: T.core,
				});
		}
		function shield(r, w, T, t) {
			const M = E.tones(T.shield),
				Rf = E.tones("#a6b4d8");
			for (const cell of w.cells || []) {
				if (!cell.alive) continue;
				const size = cell.size || 20,
					reflective = cell.material === "reflective",
					C = reflective ? Rf : M;
				r.actor(
					cell.x,
					cell.y,
					2,
					(g, x, y) => {
						const h = size / 2;
						px.poly(
							g,
							[
								[x - h + 2, y - h],
								[x + h - 2, y - h],
								[x + h, y - h + 2],
								[x + h, y + h - 2],
								[x + h - 2, y + h],
								[x - h + 2, y + h],
								[x - h, y + h - 2],
								[x - h, y - h + 2],
							],
							C.deep,
						);
						px.rect(g, x - h + 2, y - h + 2, size - 4, size - 4, C.base);
						px.line(g, x - h + 3, y - h + 2, x + h - 3, y - h + 2, C.lt, 2);
						px.line(g, x - h + 2, y - h + 3, x - h + 2, y + h - 3, C.lt, 1);
						px.line(g, x - h + 3, y + h - 3, x + h - 3, y + h - 3, C.sh, 2);
						px.line(g, x + h - 3, y - h + 3, x + h - 3, y + h - 3, C.deep, 2);
						if (reflective) {
							px.poly(
								g,
								[
									[x - 4, y - 5],
									[x + 5, y - 5],
									[x + 2, y + 5],
									[x - 6, y + 5],
								],
								"#566084",
							);
							px.line(g, x - 3, y + 3, x + 3, y - 3, "#f3eaff", 2);
							px.dot(g, x + 5, y + 5, "#f3eaff");
						} else {
							px.rect(g, x - 4, y - 4, 8, 7, C.sh);
							px.rect(g, x - 3, y - 3, 6, 2, C.lt);
							px.rect(g, x - 2, y + 1, 4, 2, C.base);
							px.dot(g, x - 6, y + 6, C.hi);
						}
					},
					{ outline: false, rim: false },
				);
			}
		}
		function core(r, w, T, t) {
			const c = w.core;
			if (!c || c.state === "defeated") return;
			const flight = c.state === "flight",
				wind = c.state === "windup",
				returning = c.state === "return",
				dock = c.state === "dock",
				refillWindow =
					dock &&
					((w.sector === 2 && c.hp === 1) ||
						(w.cells || []).every((q) => !q.alive)),
				coreColor = refillWindow ? T.static : T.core,
				radius = c.r || 28,
				P = E.tones(coreColor),
				M = E.tones(T.metal),
				pulse = 1 + Math.sin(t * (wind ? 30 : 3)) * 0.035;
			if (flight || returning) {
				const a = Math.atan2(c.vy || 0, c.vx || -1);
				for (let i = 6; i > 0; i--) {
					const d = i * 12,
						[x, y] = r.w(c.x - Math.cos(a) * d, c.y - Math.sin(a) * d);
					px.blend(r.ctx, (7 - i) * 0.025, "add", () => {
						ring(
							r.ctx,
							x,
							y,
							radius * (1 - i * 0.08),
							2,
							T.core,
							24,
							t * 7 - i * 0.3,
						);
					});
				}
			}
			if (wind) {
				const [x, y] = r.w(c.x, c.y);
				dashedRing(r.ctx, x, y, 60 + Math.sin(t * 11) * 6, T.hot, -t * 2);
				for (let i = 0; i < 8; i++) {
					const a = t * 1.1 + (i / 8) * TAU;
					px.line(
						r.ctx,
						x + Math.cos(a) * 68,
						y + Math.sin(a) * 68,
						x + Math.cos(a) * 79,
						y + Math.sin(a) * 79,
						T.hot,
						2,
					);
				}
				const target = (w.players || []).find((p) => p.alive);
				if (target) {
					const dy = E.wrapDiff
						? E.wrapDiff(c.y, target.y, 540)
						: target.y - c.y;
					const tx = target.x,
						ty = c.y + dy;
					for (let i = 0; i < 1; i++)
						r.queue(c.x, c.y, 0, (g) => {
							const a = r.w(c.x, c.y),
								b = r.w(tx, ty);
							px.blend(g, 0.18, "normal", () =>
								px.line(g, ...a, ...b, T.hot, 4),
							);
						});
				}
			}
			if (refillWindow) {
				const [x, y] = r.w(c.x, c.y);
				dashedRing(r.ctx, x, y, 48, T.static, t * 0.3);
				E.font.text(r.ctx, "CONTACT TO REFILL", x, y + 59, T.static, {
					scale: 1,
					align: "center",
					outline: false,
					shadow: T.deep,
				});
			}
			r.shadow(c.x, c.y, 35, 0.7, T.deep);
			r.actor(
				c.x,
				c.y,
				9,
				(g, x, y) => {
					if (flight || wind || returning) {
						const twist = t * (flight ? 9 : wind ? 4.5 : 2);
						for (let i = 0; i < 4; i++) {
							const a = twist + (i / 4) * TAU,
								Q = transform(x, y, a),
								length = flight ? 44 : 33 + Math.sin(t * 12) * 6;
							px.poly(
								g,
								[
									Q(-3, -6),
									Q(14, -17),
									Q(length, -12),
									Q(length + 8, 0),
									Q(15, 7),
									Q(4, 4),
								],
								P.deep,
							);
							px.poly(
								g,
								[
									Q(-1, -4),
									Q(14, -13),
									Q(length - 2, -9),
									Q(length + 3, -1),
									Q(14, 4),
									Q(4, 2),
								],
								P.sh,
							);
							px.poly(
								g,
								[Q(6, -5), Q(17, -11), Q(length - 4, -8), Q(20, -3)],
								P.lt,
							);
							px.line(g, ...Q(length - 6, -8), ...Q(length, -2), P.hi, 2);
						}
					} else {
						for (let i = 0; i < 6; i++) {
							const a = (i / 6) * TAU + t * 0.04,
								Q = transform(x, y, a),
								k = phasePetal(w, c);
							px.poly(
								g,
								[
									Q(19, -12),
									Q(37 + k, -13),
									Q(45 + k, 0),
									Q(34 + k, 12),
									Q(19, 11),
								],
								M.deep,
							);
							px.poly(
								g,
								[
									Q(21, -9),
									Q(35 + k, -10),
									Q(41 + k, 0),
									Q(33 + k, 8),
									Q(21, 8),
								],
								M.base,
							);
							px.line(g, ...Q(23, -9), ...Q(35 + k, -10), M.lt, 2);
							px.line(g, ...Q(34 + k, -5), ...Q(37 + k, 0), T.hot, 1);
						}
					}
					const rr = radius * pulse;
					px.disc(g, x, y, rr + 3, P.deep);
					px.disc(g, x - 1, y - 2, rr, P.sh);
					px.disc(g, x - 3, y - 4, rr * 0.77, P.base);
					px.disc(g, x - 6, y - 7, rr * 0.55, P.lt);
					ring(g, x, y, rr * 0.83, 2, P.deep, 36);
					// Deep black mechanical iris with a faceted living signal suspended inside.
					const eye = transform(x, y, t * 0.2);
					px.poly(
						g,
						[
							eye(-16, -7),
							eye(-5, -16),
							eye(12, -11),
							eye(17, 5),
							eye(4, 15),
							eye(-13, 10),
						],
						"#121725",
					);
					const iris = (wind ? 12 : 9) + Math.sin(t * 6) * 1.2;
					px.disc(g, x, y, iris, P.lt);
					px.disc(g, x + 1, y + 1, iris * 0.66, P.deep);
					px.rect(g, x - 2, y - 8, 4, 16, wind ? T.hot : "#fff0cf");
					px.rect(g, x - 6, y - 2, 12, 4, wind ? T.hot : "#fff0cf");
					px.dot(g, x - 4, y - 5, "#ffffff");
					if (c.state === "phase-break")
						px.blend(g, 0.5, "add", () => px.disc(g, x, y, rr + 8, T.hot));
				},
				{ outline: true, rim: true, emissive: true },
			);
			game.lights.add(c.x, c.y, 12, 110, wind ? 0.9 : 0.65, {
				color: coreColor,
			});
		}
		function phasePetal(w, c) {
			return (
				(w.sector === 2 ? Math.max(0, 3 - c.hp) : Math.max(0, c.maxHp - c.hp)) *
				-3
			);
		}
		function rail(r, w, T, t) {
			const g = r.ctx,
				M = E.tones("#49616e"),
				[x, y] = r.w(30, 0);
			px.rect(g, x - 12, y, 22, 540, M.deep);
			px.rect(g, x - 11, y, 4, 540, M.sh);
			px.rect(g, x + 6, y, 3, 540, M.base);
			px.line(g, x - 8, y, x - 8, y + 540, M.lt, 1);
			px.line(g, x + 10, y, x + 10, y + 540, T.deep, 3);
			for (let i = 0; i < 33; i++) {
				const yy = i * 17;
				px.rect(g, x - 5, y + yy, 10, 7, T.deep);
				px.line(g, x - 4, y + yy, x + 3, y + yy, M.base, 1);
			}
			for (const p of w.players || []) {
				if (!p.alive) continue;
				const ready = p.ready || p.charge >= (w.tuning?.chargeThreshold || 5),
					C = E.tones(p.color || PLAYER[(p.index || 0) % 2]);
				r.actor(
					30,
					p.y,
					3,
					(g, xx, yy) => {
						plate(g, xx, yy, 33, 40, M, 4);
						px.rect(g, xx + 11, yy - 8, 22, 16, M.deep);
						px.rect(g, xx + 12, yy - 7, 18, 5, C.sh);
						px.rect(g, xx + 12, yy + 3, 18, 4, M.deep);
						px.line(g, xx + 12, yy - 8, xx + 31, yy - 8, M.lt, 1);
						px.disc(g, xx, yy, 10, C.deep);
						px.disc(g, xx - 1, yy - 1, 7, ready ? C.lt : C.sh);
						px.disc(g, xx - 2, yy - 2, 3, ready ? "#f4fff3" : C.base);
						for (let i = 0; i < 5; i++)
							px.rect(
								g,
								xx - 10 + i * 5,
								yy + 15,
								3,
								2,
								i < p.charge ? C.lt : M.sh,
							);
						if (ready) {
							ring(g, xx, yy, 13 + Math.sin(t * 7), 1, C.lt);
							px.rect(g, xx + 30, yy - 5, 3, 10, "#f1fff3");
						}
					},
					{ outline: false, rim: true },
				);
				if (ready) {
					const start = r.w(64, p.y),
						end = r.w(946, p.y);
					px.blend(g, 0.28, "normal", () =>
						px.line(g, ...start, ...end, C.base, 1),
					);
					for (let xx = 70; xx < 946; xx += 45) {
						const q = r.w(xx, p.y);
						px.rect(g, q[0], q[1] - 1, p.index || 0 ? 8 : 3, 2, C.lt);
					}
				}
			}
		}
		function bullets(r, w, T, t) {
			for (const b of w.shots || []) {
				const [x, y] = r.w(b.x, b.y),
					speed = Math.hypot(b.vx, b.vy) || 1,
					dx = b.vx / speed,
					dy = b.vy / speed;
				px.line(
					r.ctx,
					x - dx * 12,
					y - dy * 12,
					x + dx * 2,
					y + dy * 2,
					w.players[b.owner || 0]?.color || PLAYER[(b.owner || 0) % 2],
					2,
				);
				px.line(
					r.ctx,
					x - dx * 4,
					y - dy * 4,
					x + dx * 2,
					y + dy * 2,
					"#e9fff7",
					2,
				);
			}
			for (const b of w.cannons || []) {
				const C = b.reflected
						? "#ffd28d"
						: w.players[b.owner || 0]?.color || PLAYER[(b.owner || 0) % 2],
					g = r.ctx,
					[x, y] = r.w(b.x, b.y);
				if (b.warn > 0 || b.returnWarn > 0) {
					const reflected = b.returnWarn > 0,
						[sx, sy] = r.w(reflected ? b.x : 30, b.y),
						[ex, ey] = r.w(reflected ? 30 : 950, b.y);
					px.blend(g, 0.17 + 0.07 * Math.sin(t * 38), "normal", () =>
						px.line(g, sx, sy, ex, ey, C, 20),
					);
					px.line(g, sx, sy, ex, ey, C, 2);
					for (let xx = 70; xx < 940; xx += 48) {
						const q = r.w(xx, b.y),
							d = reflected ? -1 : 1;
						px.line(g, q[0] - d * 5, q[1] - 5, q[0], q[1], C, 2);
						px.line(g, q[0] - d * 5, q[1] + 5, q[0], q[1], C, 2);
					}
					E.font.text(
						g,
						reflected ? "RETURN SHOT" : "LANE LOCKED",
						Math.min(sx + 100, 780),
						sy - 21,
						C,
						{ scale: 1, outline: false, shadow: T.deep },
					);
				} else {
					const direction = b.vx < 0 ? -1 : 1;
					for (let i = 0; i < 5; i++)
						px.blend(g, (5 - i) * 0.045, "add", () =>
							px.ell(
								g,
								x - direction * (12 + i * 10),
								y,
								18 + i * 4,
								7 - i * 0.5,
								C,
							),
						);
					px.poly(
						g,
						[
							[x - direction * 21, y - 7],
							[x + direction * 8, y - 7],
							[x + direction * 16, y],
							[x + direction * 8, y + 7],
							[x - direction * 21, y + 7],
						],
						C,
					);
					px.line(g, x - direction * 17, y, x + direction * 9, y, "#ffffff", 5);
					px.line(
						g,
						x - direction * 7,
						y - 3,
						x + direction * 5,
						y - 3,
						"#fbfff2",
						2,
					);
					game.lights.add(b.x, b.y, 8, 90, 0.9, { color: C });
				}
			}
		}
		function threats(r, w, T, t) {
			for (const h of w.hazards || []) {
				if (h.alive === false) continue;
				const a = h.angle ?? Math.atan2(h.vy || 0, h.vx || -1),
					[x, y] = r.w(h.x, h.y),
					Q = transform(x, y, a);
				if (h.kind === "needle") {
					px.line(r.ctx, ...Q(-17, 0), ...Q(9, 0), T.enemy, 3);
					px.line(r.ctx, ...Q(-4, 0), ...Q(10, 0), "#fff0d6", 1);
					continue;
				}
				for (let i = 4; i > 0; i--)
					px.blend(r.ctx, (5 - i) * 0.055, "add", () =>
						px.disc(
							r.ctx,
							x - Math.cos(a) * i * 6,
							y - Math.sin(a) * i * 6,
							Math.max(1, 6 - i),
							T.enemy,
						),
					);
				r.actor(
					h.x,
					h.y,
					4,
					(g, xx, yy) => {
						const P = transform(xx, yy, a);
						px.poly(
							g,
							[
								P(13, 0),
								P(4, -7),
								P(-7, -9),
								P(-4, -2),
								P(-10, 0),
								P(-4, 2),
								P(-7, 9),
								P(4, 7),
							],
							"#3e202d",
						);
						px.poly(
							g,
							[P(10, 0), P(3, -5), P(-5, -6), P(-2, 0), P(-5, 6), P(3, 5)],
							T.enemy,
						);
						px.line(g, ...P(-2, 0), ...P(8, 0), "#ffe0ba", 2);
						px.dot(g, ...P(3, -3), "#ffffff");
					},
					{ outline: true, emissive: true },
				);
			}
		}
		function scouts(r, w, T, t, opts) {
			for (const p of w.players || []) {
				if (!p.alive) {
					if (p.respawn > 0) {
						const [x, y] = r.w(p.x, p.y);
						dashedRing(
							r.ctx,
							x,
							y,
							24 + Math.sin(t * 8) * 4,
							p.color || PLAYER[(p.index || 0) % 2],
							t,
						);
						E.font.text(
							r.ctx,
							"REASSEMBLING",
							x,
							y + 35,
							p.color || PLAYER[(p.index || 0) % 2],
							{ align: "center", outline: false, scale: 1 },
						);
					}
					continue;
				}
				r.shadow(p.x, p.y, 13, 0.55, T.deep);
				if (p.invuln > 0) {
					const [x, y] = r.w(p.x, p.y);
					dashedRing(
						r.ctx,
						x,
						y,
						32,
						p.color || PLAYER[(p.index || 0) % 2],
						t * 2,
					);
				}
				if (p.ready) {
					const [x, y] = r.w(p.x, p.y);
					px.blend(r.ctx, 0.17, "add", () =>
						px.disc(
							r.ctx,
							x,
							y,
							26 + Math.sin(t * 7) * 3,
							p.color || PLAYER[(p.index || 0) % 2],
						),
					);
				}
				r.actor(p.x, p.y, 10, (g, x, y) => insect(g, x, y, t, p), {
					outline: true,
					rim: true,
					emissive: true,
					wrap: [960, 540],
				});
				if (p.y < 35 || p.y > 505) {
					const ghostY = p.y < 35 ? p.y + 540 : p.y - 540;
					const [x, y] = r.w(p.x, ghostY);
					px.blend(r.ctx, 0.3, "normal", () =>
						insect(r.ctx, x, y, t, p, 1, true),
					);
				}
				game.lights.add(p.x, p.y, 10, 64, p.ready ? 0.5 : 0.3, {
					color: p.color || PLAYER[(p.index || 0) % 2],
				});
				if (opts.debug) {
					const [x, y] = r.w(p.x, p.y);
					ring(r.ctx, x, y, 9, 1, "#ffffff", 24);
					px.line(r.ctx, x - 3, y, x + 3, y, "#ffffff");
					px.line(r.ctx, x, y - 3, x, y + 3, "#ffffff");
				}
			}
		}
		function effects(r, w, T, t, opts) {
			const at = now();
			fx = fx.filter((f) => at - f.born < f.life && at >= f.born);
			r.overlay((g) => {
				for (const f of fx) {
					const age = at - f.born,
						u = age / f.life,
						fade = 1 - u;
					let wx = f.x,
						wy = f.y;
					if (f.kind === "ring") {
						const [x, y] = r.w(wx, wy);
						px.blend(g, fade * (opts.reducedFlash ? 0.3 : 0.7), "add", () =>
							ring(
								g,
								x,
								y,
								5 + f.size * (1 - (1 - u) * (1 - u)),
								Math.max(1, 5 * fade),
								f.color,
								72,
							),
						);
						if (u < 0.12 && !opts.reducedFlash)
							px.blend(g, (0.12 - u) * 2, "add", () =>
								px.disc(g, x, y, 35 + f.size * u, f.color),
							);
						continue;
					}
					const d = f.kind === "in" ? f.v * (1 - u) * 0.4 : f.v * age;
					wx += Math.cos(f.a) * d;
					wy +=
						Math.sin(f.a) * d +
						(f.kind === "rise" ? -age * 45 : age * age * 12);
					const [x, y] = r.w(wx, wy);
					px.blend(g, fade * 0.9, "normal", () => {
						if (f.kind === "debris") {
							const Q = transform(x, y, f.spin + age * 5),
								s = f.size;
							px.poly(g, [Q(-s, -s), Q(s + 2, -s), Q(s, s), Q(-s, s)], f.color);
							px.line(g, ...Q(-s, -s), ...Q(s + 2, -s), "#fff0c8", 1);
						} else {
							px.rect(
								g,
								x,
								y,
								Math.max(1, f.size * fade),
								Math.max(1, f.size * fade),
								f.color,
							);
							if (f.kind === "rise")
								px.line(g, x, y, x, y + 4 * fade, f.color, 1);
						}
					});
				}
			});
		}
		function survivors(r, w, T, t) {
			if (w.mode !== "victory") return;
			r.overlay((g) => {
				for (let i = 0; i < 38; i++) {
					const x = 480 + Math.sin(i * 3.31 + t * 0.15) * 410,
						y = 270 + Math.cos(i * 1.73 + t * 0.21) * 210,
						s = 0.18 + hash(i) * 0.24;
					px.blend(g, 0.25 + hash(i * 47) * 0.55, "normal", () =>
						insect(
							g,
							x,
							y,
							t + i,
							{
								index: i % 2,
								ax: -1,
								ay: 0.3 * Math.sin(t + i),
								vx: -70,
								vy: 0,
								ready: true,
							},
							s,
						),
					);
				}
			});
		}
		function draw(r, w, opts = {}) {
			if (disposed || !w) return;
			lastOpts = opts;
			const T = PAL[w.sector] || PAL[0],
				t = Number.isFinite(w.time) ? w.time : now();
			if (lastSector !== w.sector) {
				lastSector = w.sector;
				fx = fx.filter((f) => now() - f.born < f.life);
			}
			backdrop(r, w, T, t);
			refuge(r, w, T, t);
			station(r, w, T, t);
			rail(r, w, T, t);
			shield(r, w, T, t);
			core(r, w, T, t);
			bullets(r, w, T, t);
			threats(r, w, T, t);
			scouts(r, w, T, t, opts);
			effects(r, w, T, t, opts);
			survivors(r, w, T, t);
			if (opts.debug)
				r.overlay((g) => {
					for (const c of w.cells || [])
						if (c.alive) {
							const [x, y] = r.w(c.x, c.y);
							px.line(g, x - 10, y - 10, x + 10, y - 10, "#ffffff", 1);
						}
					for (const b of w.cannons || []) {
						const [x, y] = r.w(b.x, b.y);
						ring(g, x, y, b.r || 7, 1, "#ffffff", 24);
					}
				});
		}
		return {
			draw,
			event,
			dispose() {
				disposed = true;
				fx = [];
				seen.clear();
			},
			debug: () => ({ effects: fx.length, seen: seen.size, disposed }),
		};
	}
	root.RuinRender = { create, palettes: PAL, insect };
})();
