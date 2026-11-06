/* Original native rigs for Advanced Dungeons & Near Misses.
 * Rendering owns its rigs; all pose clocks come from the authoritative actor.
 */
(() => {
	globalThis.NM = globalThis.NM || {};
	const NM = globalThis.NM;
	const E = globalThis.My3D2dge;
	const { px } = E;
	const TAU = Math.PI * 2;
	const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
	const rigs = new WeakMap();
	const size = 1;
	const BOW = Object.freeze({ forward: 7.5, right: 0, up: 15 });

	function bowOrigin(a) {
		const angle = a.angle || 0;
		return {
			x: a.x + Math.cos(angle) * BOW.forward,
			y: a.y + Math.sin(angle) * BOW.forward,
			z: (a.z || 0) + BOW.up,
		};
	}

	// The two hands and the string use actual rig-local attachments. The projectile
	// origin agrees with rig.hand('R') throughout anticipation and release.
	E.Humanoid.pose("nm-bow", (J, weight, rig) => {
		const w = clamp(weight),
			pull = rig.nmPull || 0;
		const blend = (key, target) => {
			J[key] = J[key].map((v, i) => v + (target[i] - v) * w);
		};
		blend("handR", [BOW.forward, BOW.right, BOW.up]);
		blend("handL", [BOW.forward - pull - 1.5, -0.4, BOW.up]);
		blend("elbowR", [2.5, 3.5, 15]);
		blend("elbowL", [-1.5 - pull * 0.25, -4, 17]);
		J.bladeDir = [1, 0, 0];
	});
	E.Humanoid.pose("nm-listen", (J, w) => {
		for (const [key, target] of [
			["handL", [-1, -5, 22]],
			["elbowL", [-1, -7, 17]],
		])
			J[key] = J[key].map((v, i) => v + (target[i] - v) * w);
		J.head[0] -= w;
	});
	E.Humanoid.weapon("nm-bow", {
		length: 0,
		rest: [1, 0, 0],
		blade: false,
		draw(w) {
			const pull = w.rig.nmPull || 0,
				top = w.at(1.2, 0, 0, 7.7),
				upper = w.at(-0.7, 0, 0, 4.2),
				grip = w.at(0),
				lower = w.at(-0.7, 0, 0, -4.2),
				bottom = w.at(1.2, 0, 0, -7.7),
				string = w.at(-pull);
			const points = [top, upper, grip, lower, bottom];
			w.push(w.hand[2] + 0.05, () => {
				for (let i = 1; i < points.length; i++) {
					px.line(
						w.g,
						...points[i - 1].slice(0, 2),
						...points[i].slice(0, 2),
						"#201b1c",
						3 * w.u,
					);
					px.line(
						w.g,
						...points[i - 1].slice(0, 2),
						...points[i].slice(0, 2),
						"#c79556",
						1.4 * w.u,
					);
				}
				px.line(
					w.g,
					...top.slice(0, 2),
					...string.slice(0, 2),
					"#f0e1b9",
					Math.max(0.6, w.u * 0.6),
				);
				px.line(
					w.g,
					...string.slice(0, 2),
					...bottom.slice(0, 2),
					"#f0e1b9",
					Math.max(0.6, w.u * 0.6),
				);
				if (w.rig.nmNocked) {
					const tip = w.at(6),
						feather = w.at(-pull - 0.7);
					px.line(
						w.g,
						...feather.slice(0, 2),
						...tip.slice(0, 2),
						"#eee1b7",
						Math.max(1, w.u * 0.75),
					);
					px.disc(w.g, tip[0], tip[1], 1.2 * w.u, "#fff6d5");
					px.line(
						w.g,
						feather[0] - w.u,
						feather[1] - w.u,
						feather[0] + w.u,
						feather[1] + w.u,
						"#78cbb1",
						w.u,
					);
				}
			});
		},
	});

	E.SHAPES["nm-axe"] = {
		about: "Trail axe: ash haft and a broad steel crescent",
		mats: { w: "oak", s: "steel", b: "leather" },
		parts: [
			["cyl", "w", [0, 0, 0], 0.9, 19],
			["box", "b", [0, 0, 4], [2, 2, 4]],
			[
				"prism",
				"s",
				[0, 0, 14],
				[
					[-1, -2],
					[7, -4],
					[9, 0],
					[7, 5],
					[-1, 3],
				],
				2,
				{ axis: "y" },
			],
		],
	};
	E.SHAPES["nm-key"] = {
		about: "Long gate key with a hollow square bow",
		mats: { g: "gold" },
		parts: [
			["cyl", "g", [0, 0, 0], 1, 13],
			["box", "g", [3, 0, 1], [6, 2, 2]],
			["box", "g", [5, 0, 4], [2, 2, 3]],
			["box", "g", [0, 0, 13], [9, 2, 2]],
			["mirror", "x", ["box", "g", [3.5, 0, 13], [2, 2, 7]]],
			["box", "g", [0, 0, 18], [9, 2, 2]],
		],
	};
	E.SHAPES["nm-boat"] = {
		about: "Folded cedar boat and travel oar",
		mats: { w: "oak", b: "walnut", c: "linen" },
		parts: [
			[
				"prism",
				"w",
				[0, 0, 0],
				[
					[-9, -4],
					[-5, -8],
					[7, -6],
					[11, 0],
					[7, 6],
					[-5, 8],
					[-9, 4],
				],
				5,
			],
			["box", "b", [0, 0, 5], [11, 8, 1]],
			["box", "c", [-2, 0, 6], [7, 9, 2]],
			["box", "w", [0, 0, 8], [23, 1, 1]],
			["box", "w", [10, 0, 8], [5, 4, 0.8]],
		],
	};
	E.SHAPES["nm-ladder"] = {
		about: "A guarded ash ladder to daylight",
		mats: { w: "oak", i: "iron" },
		parts: [
			["mirror", "x", ["box", "w", [6, 0, 0], [2, 3, 29]]],
			["row", 6, [0, 0, 5], ["box", "w", [0, 0, 14], [13, 2, 1.5]]],
			["mirror", "x", ["box", "i", [6, 0, 24], [3, 4, 2]]],
		],
	};
	E.SHAPES["nm-quiver"] = {
		about: "A cloth quiver of recoverable ash arrows",
		mats: { c: "leather", w: "birch", m: "steel", f: "linen" },
		parts: [
			["cyl", "c", [0, 0, 0], 3, 9],
			["row", 3, [2, 0, 0], ["cyl", "w", [0, 0, 5], 0.4, 12]],
			[
				"row",
				3,
				[2, 0, 0],
				[
					"prism",
					"f",
					[0, 0, 15],
					[
						[-1, 0],
						[1, 0],
						[1, 3],
						[0, 2],
						[-1, 3],
					],
					0.5,
					{ axis: "y" },
				],
			],
		],
	};
	E.SHAPES["nm-stone"] = {
		about: "Polished bank stone with readable steel face",
		mats: { s: "slate", m: "steel", g: "gold" },
		parts: [
			["wedge", "s", [0, 0, 0], [18, 7, 8]],
			["box", "m", [0, -3, 2], [18, 1, 6]],
			["box", "g", [0, -3.6, 5], [12, 0.5, 1]],
		],
	};
	E.SHAPES["nm-relic"] = {
		about: "Half of the Sunward Circlet, three open rays",
		mats: { g: "gold", c: "crystal" },
		parts: [
			[
				"prism",
				"g",
				[0, 0, 0],
				[
					[-9, 0],
					[9, 0],
					[9, 3],
					[5, 9],
					[2, 4],
					[0, 11],
					[-2, 4],
					[-6, 8],
					[-9, 3],
				],
				2,
				{ axis: "y" },
			],
			["ball", "c", [0, -1, 4], 2],
		],
	};
	E.SHAPES["nm-marker"] = {
		about: "Stone trail tablet beneath the rangers old mark",
		mats: { s: "slate", g: "gold" },
		parts: [
			["box", "s", [0, 0, 0], [14, 5, 14]],
			["box", "g", [0, -2.7, 6], [2, 0.6, 6]],
			["box", "g", [0, -2.7, 9], [7, 0.6, 1]],
		],
	};

	function getRig(game, a) {
		let map = rigs.get(game);
		if (!map) {
			map = new Map();
			rigs.set(game, map);
		}
		const key = a.id || a.seat || "ranger";
		if (!map.has(key))
			map.set(
				key,
				new E.Humanoid({
					size,
					build: "chibi",
					weapon: "nm-bow",
					outfit: "tunic",
					hair: "short",
					hat: { style: "band", color: a.seat === 2 ? "#e4ae6b" : "#b1cdb1" },
					cheat: 0,
					seed:
						Math.abs(
							String(key)
								.split("")
								.reduce((n, c) => n * 31 + c.charCodeAt(0), 17),
						) % 2147483647,
					colors: {
						skin: a.seat === 2 ? "#bd875f" : "#e5b98e",
						hair: "#493b32",
						cloth: a.seat === 2 ? "#b06e48" : "#568976",
						pants: "#424d4f",
						boot: "#3f3331",
						belt: "#ab8658",
						metal: "#cad3cb",
						glove: "#ad865c",
					},
					draw: {
						under(g, Q) {
							const shoulder = Q.shC || Q.head,
								hip = Q.hipC || Q.hipR;
							if (!shoulder || !hip) return;
							px.line(
								g,
								shoulder[0] - 3,
								shoulder[1] + 3,
								hip[0] - 5,
								hip[1] - 1,
								"#312c2b",
								5,
							);
							px.line(
								g,
								shoulder[0] - 3,
								shoulder[1] + 3,
								hip[0] - 5,
								hip[1] - 1,
								"#98724b",
								3,
							);
							for (let n = 0; n < 3; n++) {
								px.line(
									g,
									shoulder[0] - 5 + n * 1.8,
									shoulder[1] + 5,
									shoulder[0] - 5 + n * 1.8,
									shoulder[1] - 3 - n * 0.6,
									"#d1ba88",
									1,
								);
								px.line(
									g,
									shoulder[0] - 6 + n * 1.8,
									shoulder[1] - 2 - n * 0.6,
									shoulder[0] - 4 + n * 1.8,
									shoulder[1] - 1 - n * 0.6,
									"#a8d6c2",
									1,
								);
							}
						},
					},
				}),
			);
		return map.get(key);
	}

	function ranger(game, a) {
		const r = game.r,
			rig = getRig(game, a),
			t = a.animTime ?? a.time ?? game.time ?? 0;
		const draw = a.draw > 0 ? clamp(1 - a.draw / 0.18) : 0,
			nocked = a.draw > 0 || a.recovery > 0,
			focused = !!a.focus;
		// No draw-time integration: set every spring/pose clock directly from state.
		rig.t = t;
		rig.phase = a.walk || 0;
		rig._spW = clamp(Math.hypot(a.vx || 0, a.vy || 0) / 65);
		rig._sneakW = focused ? 1 : 0;
		rig._sprintW = a.sprint || a.state === "run" ? 1 : 0;
		rig.hurtW = a.hurt > 0 ? 1 : 0;
		rig._dashW = a.dodgeLeft > 0 || a.state === "quickstep" ? 1 : 0;
		rig._pointW = 0;
		rig._climbW = a.state === "climbing" || a.state === "climb" ? 1 : 0;
		rig._climbP = t * 9;
		rig.downW = a.downed || a.state === "downed" ? 1 : 0;
		rig.sq = 0;
		rig.nmPull =
			a.draw > 0
				? draw * 5
				: -Math.sin(clamp((a.recovery || 0) / 0.22) * Math.PI) * 0.65;
		rig.nmNocked = a.draw > 0;
		rig._ownW = {};
		for (const key in rig.poseW) rig.poseW[key] = 0;
		const pose =
			a.state === "celebrating" || a.state === "victory"
				? "cheer"
				: a.state === "pickup"
					? "cheer"
					: a.state === "reviving"
						? "kneel"
						: null;
		if (pose) rig.poseW[pose] = 1;
		rig.update(0, {
			x: a.x,
			y: a.y,
			z: a.z || 0,
			vx: a.vx || 0,
			vy: a.vy || 0,
			facing: a.angle || 0,
			expr: a.hurt > 0 ? "wince" : pose === "cheer" ? "smile" : null,
		});
		if (!rig.downW && !pose && a.state !== "climbing" && a.state !== "climb") {
			if (nocked || !focused) E.Humanoid.poses["nm-bow"](rig.J, 1, rig);
			else E.Humanoid.poses["nm-listen"](rig.J, 1, rig);
		}
		if (a.invuln > 0 && Math.floor(t * 12) % 2 === 1) return;
		r.shadow(a.x, a.y, 5.5, 0.4);
		r.actor(
			a.x,
			a.y,
			a.z || 0,
			(g, ox, oy) => rig.draw(g, ox, oy, E.charView(r.view)),
			{ xray: true, flash: a.hurt > 0 ? "#fff0c8" : null, flashMix: 0.5 },
		);
	}

	// A small native primitive grammar: rig-local positions and depth-sorted shaded
	// capsules, balls and membranes. Every species has a distinct articulated rig.
	function bodyPainter(g, ox, oy, view, a) {
		const angle = a.angle || 0,
			c = Math.cos(angle),
			s = Math.sin(angle),
			scale = view.zoom || 1;
		const project = (f, rr, z) => {
			const q = view.p(f * c - rr * s, f * s + rr * c, z);
			return [ox + q[0], oy + q[1], q[2]];
		};
		const ops = [],
			push = (d, f) => ops.push({ d, f }),
			color = (c, k) => E.shade(c, k);
		const ball = (f, rr, z, rx, rz, co) => {
			const p = project(f, rr, z),
				w = rx * scale,
				h = rz * scale;
			push(p[2], () => {
				px.ell(g, p[0], p[1], w + 0.7, h + 0.7, "#1a2028");
				px.ell(g, p[0], p[1], w, h, color(co, -0.24));
				px.ell(g, p[0] - 0.15 * w, p[1] - 0.16 * h, w * 0.86, h * 0.82, co);
				px.ell(
					g,
					p[0] - 0.31 * w,
					p[1] - 0.38 * h,
					w * 0.4,
					h * 0.3,
					color(co, 0.27),
				);
			});
			return p;
		};
		const line = (a, b, width, co) => {
			const p = project(...a),
				q = project(...b);
			push((p[2] + q[2]) * 0.5, () => {
				px.line(
					g,
					...p.slice(0, 2),
					...q.slice(0, 2),
					"#19212a",
					(width + 1.2) * scale,
				);
				px.line(g, ...p.slice(0, 2), ...q.slice(0, 2), co, width * scale);
				if (width > 2)
					px.line(
						g,
						p[0] - 0.4 * scale,
						p[1] - 0.4 * scale,
						q[0] - 0.4 * scale,
						q[1] - 0.4 * scale,
						color(co, 0.25),
						width * 0.4 * scale,
					);
			});
		};
		const poly = (pts, co) => {
			const p = pts.map((q) => project(...q));
			push(p.reduce((d, q) => d + q[2], 0) / p.length, () => {
				px.poly(
					g,
					p.map((q) => q.slice(0, 2)),
					co,
				);
				for (let i = 0; i < p.length; i++)
					px.line(
						g,
						...p[i].slice(0, 2),
						...p[(i + 1) % p.length].slice(0, 2),
						color(co, -0.42),
						scale,
					);
			});
		};
		const eye = (f, rr, z, co = "#ffdd83") => {
			const p = project(f, rr, z);
			push(p[2] + 0.05, () => {
				px.disc(g, p[0], p[1], 1.5 * scale, "#18232d");
				px.disc(g, p[0], p[1], 0.8 * scale, co);
			});
		};
		return {
			project,
			ball,
			line,
			poly,
			eye,
			finish() {
				ops.sort((a, b) => a.d - b.d);
				for (const op of ops) op.f();
			},
		};
	}

	function creature(game, a) {
		const r = game.r,
			t = a.animTime ?? a.time ?? game.time ?? 0,
			state = a.state || "dormant",
			st = a.stateTime || 0;
		const wind =
				state === "windup" || state === "anticipating" || state === "alert",
			attack = state === "attacking" || state === "attack",
			dead = state === "defeated" || a.hp <= 0;
		const fallen = dead ? clamp(st * 1.5) : 0,
			gait = a.walk || t * 6,
			move = state === "investigating" || state === "chasing" || attack;
		const type = a.type || "rat",
			guardian = type === "guardian1" || type === "guardian2",
			groundZ =
				(a.z || 0) +
				(type === "bat" && !dead
					? state === "dormant"
						? 12
						: 7 + Math.sin(t * 8) * 2
					: 0);
		if (dead && st > 2.5) return;
		r.shadow(
			a.x,
			a.y,
			guardian ? 15 : type === "drake" ? 10 : type === "ooze" ? 8 : 5,
			dead ? 0.15 : 0.35,
		);
		r.actor(
			a.x,
			a.y,
			groundZ,
			(g, ox, oy) => {
				const V = bodyPainter(g, ox, oy + fallen * 3, E.charView(r.view), a),
					{ ball, line, poly, eye } = V;
				if (type === "rat") {
					const dip = wind ? 2 : 0;
					for (const side of [-1, 1])
						for (const f of [-4, 4]) {
							const phase = gait * 3 + side * 2 + f,
								lift = move ? Math.max(0, Math.sin(phase)) * 2 : 0;
							line(
								[f, side * 3, 3],
								[f + Math.cos(phase) * 1.4, side * 5, 1 + lift],
								1.5,
								"#957a6c",
							);
						}
					for (let i = 0; i < 5; i++)
						line(
							[-5 - i * 2, Math.sin(t * 3 + i) * 1.7, 2],
							[-7 - i * 2, Math.sin(t * 3 + i + 1) * 1.7, 1.4],
							1,
							"#c18e92",
						);
					ball(-1, 0, 5 - dip, 7, 4, "#82796d");
					ball(6, 0, 5 - dip, 4, 3, "#b0a090");
					ball(9, 0, 4 - dip, 2.5, 1.8, "#a88a85");
					for (const side of [-1, 1]) {
						ball(4, side * 3, 8 - dip, 2, 2.6, "#bba294");
						eye(7.4, side * 2.2, 6 - dip);
						line(
							[8, side * 1.5, 4 - dip],
							[11, side * 5, 4.5 - dip],
							0.5,
							"#d0c4ac",
						);
					}
				} else if (type === "snake") {
					const extend = attack ? 14 : wind ? 3 : 0,
						raise = wind ? 11 : attack ? 5 : 7;
					for (let i = 0; i < 10; i++) {
						const p = (i / 10) * TAU,
							f = Math.cos(p) * (5 - i * 0.18),
							rr = Math.sin(p) * (5 - i * 0.18);
						ball(f, rr, 2 + i * 0.25, 2.8, 2, "#84975c");
					}
					line([0, 0, 4], [2 + extend * 0.5, 0, raise], 3.5, "#a9b675");
					ball(4 + extend, 0, raise + 2, 4, 2.6, "#b8c785");
					for (const side of [-1, 1])
						eye(6 + extend, side * 1.8, raise + 3, "#ffe0a7");
					if (wind || attack) {
						line(
							[7 + extend, 0, raise + 1],
							[11 + extend, 0, raise + 1],
							0.6,
							"#f0a5a2",
						);
						line(
							[10 + extend, 0, raise + 1],
							[11.7 + extend, -1, raise + 1],
							0.6,
							"#f0a5a2",
						);
					}
				} else if (type === "bat") {
					const flap =
						state === "dormant" ? -6 : Math.sin(t * 19) * (wind ? 3 : 8);
					for (const side of [-1, 1]) {
						poly(
							[
								[0, side * 2, 5],
								[1, side * 17, flap + 8],
								[-3, side * 12, 3],
								[-5, side * 8, 4],
								[-4, side * 3, 2],
							],
							"#75658a",
						);
						line([0, side * 2, 5], [1, side * 17, flap + 8], 1.1, "#ac96b8");
						line([0, side * 2, 5], [-3, side * 12, 3], 0.8, "#9883a9");
					}
					ball(0, 0, 5, 4, 5, "#6f627c");
					ball(2, 0, 8, 3.5, 2.7, "#ab99b6");
					for (const side of [-1, 1]) {
						poly(
							[
								[0, side * 2, 9],
								[1, side * 3, 14],
								[3, side * 3, 9],
							],
							"#a190ae",
						);
						eye(4, side * 1.7, 8);
						line([4, side * 1, 6], [4, side * 1, 4], 0.8, "#f9ead7");
					}
				} else if (type === "spider") {
					for (const side of [-1, 1])
						for (let i = 0; i < 4; i++) {
							const f = 3 - i * 2,
								beat = move
									? Math.sin(gait * 5 + i + side) * 2
									: Math.sin(t * 2 + i) * 0.2;
							line(
								[f, side * 2, 4],
								[f + 4 - i * 2, side * 8, 6 + beat],
								1.3,
								"#b8a681",
							);
							line(
								[f + 4 - i * 2, side * 8, 6 + beat],
								[f + 6 - i * 3, side * 12, 1],
								1.1,
								"#9a8c76",
							);
						}
					ball(-4, 0, 5, 6, 5, "#6c737e");
					ball(3, 0, 5, 3.7, 3.4, "#9c9c99");
					for (const side of [-1, 1]) {
						eye(5, side * 1.3, 6, "#f3c77d");
						eye(4.4, side * 2.6, 7, "#e6a954");
					}
					line([5, -1, 4], [7, -1, 2], 1, "#d8c6a0");
					line([5, 1, 4], [7, 1, 2], 1, "#d8c6a0");
					if (a.carrying) line([-4, -6, 7], [9, -6, 7], 0.8, "#e7d6a3");
				} else if (type === "ooze") {
					const wave = Math.sin(t * 4) * 1.1;
					for (let i = 0; i < 5; i++) {
						const p = (i / 5) * TAU + t * 0.4;
						ball(Math.cos(p) * 5, Math.sin(p) * 4, 2.6, 4.8, 2.5, "#699f85");
					}
					ball(0, 0, 5 + wave, 8 - wave * 0.4, 5 + wave, "#8ec6a0");
					ball(-2, -1, 8 + wave, 3, 2.5, "#afd4ac");
					eye(5, -2, 6 + wave, "#e1f0a4");
					eye(5, 2, 6 + wave, "#e1f0a4");
					for (let i = 0; i < 3; i++)
						ball(
							Math.cos(t + i * 2) * 4,
							Math.sin(t + i * 2) * 3,
							8 + wave + i * 0.5,
							1,
							0.8,
							"#c9e3b4",
						);
				} else if (type === "drake" || guardian) {
					const co =
							type === "guardian2"
								? "#7188ac"
								: guardian
									? "#b47f55"
									: "#797e65",
						wing = guardian ? 1 : 0,
						breath = wind ? 1 + Math.sin(t * 24) * 0.15 : 0;
					const body = guardian ? 16 : 11,
						head = guardian ? 19 : 13,
						lift = guardian ? (attack ? 8 : wind ? 3 : 0) : 0;
					for (const side of [-1, 1])
						for (const f of [-body * 0.6, body * 0.5]) {
							const stride = move ? Math.sin(gait * 2 + side + f) * 2 : 0;
							line([f, side * 5, 6 + lift], [f + stride, side * 9, 2], 4, co);
							for (let j = 0; j < 3; j++)
								line(
									[f + stride, side * 9 + j * 0.6, 2],
									[f + 3 + stride, side * 9 + j * 0.6, 1],
									0.8,
									"#e0cfab",
								);
						}
					for (let i = 0; i < 6; i++)
						line(
							[
								-body - i * 3,
								Math.sin(t * 2 + i * 0.7) * (i * 0.6),
								4 + lift - i * 0.3,
							],
							[
								-body - 3 - i * 3,
								Math.sin(t * 2 + (i + 1) * 0.7) * ((i + 1) * 0.6),
								4 + lift - (i + 1) * 0.3,
							],
							Math.max(1, 5 - i * 0.8),
							co,
						);
					ball(-2, 0, 9 + lift, body, 9, co);
					ball(body * 0.55, 0, 13 + lift, 9, 9, co);
					line([body * 0.45, 0, 13 + lift], [head, 0, 16 + lift], 7, co);
					ball(head, 0, 17 + lift, 8, 5, co);
					ball(head + 6, 0, 15 + lift, 6, 3.5, E.shade(co, 0.08));
					for (const side of [-1, 1]) {
						eye(head + 3, side * 4, 19 + lift, breath ? "#fff4bc" : "#f4d089");
						line(
							[head - 3, side * 4, 20 + lift],
							[head - 7, side * 6, 27 + lift],
							2.5,
							"#ddc8a0",
						);
						line(
							[head + 8, side * 2, 15 + lift],
							[head + 8, side * 2, 12 + lift],
							1.2,
							"#f2dec0",
						);
					}
					for (let i = 0; i < 5; i++)
						poly(
							[
								[-13 + i * 5, -1, 15 + lift],
								[-16 + i * 5, 0, 20 + lift],
								[-10 + i * 5, 1, 15 + lift],
							],
							E.shade(co, 0.28),
						);
					if (wing)
						for (const side of [-1, 1]) {
							const spread = dead
									? 14
									: wind
										? 29
										: attack
											? 39
											: 31 + Math.sin(t * 3) * 2,
								rise = dead
									? -4
									: wind
										? 27
										: attack
											? Math.sin(t * 15) * 9 + 16
											: 13;
							const shoulder = [0, side * 5, 14 + lift],
								elbow = [-7, side * 16, rise + lift],
								tip = [-4, side * spread, rise + 5 + lift],
								low = [-17, side * (spread - 5), 6 + lift],
								heel = [-12, side * 7, 5 + lift];
							poly(
								[shoulder, elbow, tip, low, heel],
								type === "guardian2" ? "#6477a6" : "#a0644c",
							);
							line(shoulder, elbow, 3, E.shade(co, 0.12));
							line(elbow, tip, 2.2, E.shade(co, 0.22));
							line(elbow, low, 1.5, E.shade(co, 0.25));
							line(elbow, heel, 1.2, E.shade(co, 0.2));
							poly(
								[
									tip,
									[tip[0] + 2, tip[1] - side * 3, tip[2] + 4],
									[tip[0] - 3, tip[1] - side * 3, tip[2] - 1],
								],
								"#d9c8aa",
							);
						}
					if (breath)
						for (let i = 0; i < 3; i++)
							ball(
								head + 8 + i * 2,
								Math.sin(t * 14 + i) * 2,
								16 + lift + i * 0.5,
								2 + i,
								1.5 + i * 0.5,
								type === "guardian2" ? "#a6d3d2" : "#e7b26f",
							);
					// Three plates are a physical wound counter, not a floating health bar.
					const hp = a.hp ?? 3;
					if (guardian)
						for (let i = 0; i < Math.max(0, hp); i++)
							ball(
								-8 + i * 6,
								-4,
								16 + lift,
								2.2,
								2.7,
								type === "guardian2" ? "#d0d8dc" : "#ebc58e",
							);
				} else if (type === "target") {
					line([0, 0, 0], [0, 0, 14], 2, "#c1a36e");
					ball(0, 0, 15, 5, 5, "#c7ad79");
					ball(0, -1, 16, 2, 2, "#75b6ae");
				}
				if (dead) {
					for (let i = 0; i < 5; i++)
						ball(
							Math.cos(i * 1.3 + t) * fallen * 11,
							Math.sin(i * 1.3 + t) * fallen * 7,
							3 + fallen * 12 + i,
							2 * (1 - fallen * 0.4),
							2 * (1 - fallen * 0.4),
							"#b6b0a6",
						);
				}
				V.finish();
			},
			{
				flash: a.hurt > 0 || a.hitFlash > 0 ? "#fff1cc" : null,
				flashMix: 0.65,
				alpha: dead ? 1 - fallen * 0.6 : 1,
			},
		);
	}

	function prop(game, kind, x, y, o = {}) {
		const r = game.r,
			z = o.z || 0,
			t = o.time ?? game.time ?? 0;
		const aliases = {
			arrows: "quiver",
			supply: "quiver",
			supplies: "quiver",
			dawn: "relic",
			dusk: "relic",
			bank: "stone",
			sign: "marker",
		};
		const id = aliases[kind] || kind;
		if (E.SHAPES[`nm-${id}`]) {
			const floating = ["axe", "boat", "key", "relic"].includes(id),
				zz = z + (floating ? 5 + Math.sin(t * 2 + x) * 1.5 : 0);
			if (floating) r.shadow(x, y, 5, 0.28);
			r.shape(`nm-${id}`, x, y, zz, {
				facing: o.angle || 0,
				scale: o.scale || 1,
				shadow: !floating,
				light: false,
			});
			return;
		}
		if (
			[
				"rock",
				"crystal",
				"pine",
				"tree",
				"bush",
				"grass",
				"chest",
				"barrel",
			].includes(id)
		) {
			r.shape(id, x, y, z, {
				scale: o.scale || 1,
				facing: o.angle || 0,
				shadow: true,
				params: { seed: Math.abs(Math.floor(x * 31 + y)) },
			});
			return;
		}
		if (id === "torch") {
			r.prop("torch", x, y, z, { light: false });
			return;
		}
		r.queue(
			x,
			y,
			z,
			(g) => {
				const [sx, sy] = r.w(x, y, z),
					k = r.view.zoom || 1;
				if (id === "heart") {
					const p = [
						[0, 2],
						[-5, -3],
						[-5, -6],
						[-2, -8],
						[0, -6],
						[2, -8],
						[5, -6],
						[5, -3],
					].map(([a, b]) => [sx + a * k, sy + b * k]);
					px.poly(g, p, "#e8b6a0");
					px.line(
						g,
						sx - 3 * k,
						sy - 5 * k,
						sx - 1 * k,
						sy - 6 * k,
						"#fff2ce",
						k,
					);
				} else if (id === "treasure") {
					px.poly(
						g,
						[
							[sx, sy - 10 * k],
							[sx + 5 * k, sy - 5 * k],
							[sx, sy + 1 * k],
							[sx - 5 * k, sy - 5 * k],
						],
						"#edc783",
					);
					px.poly(
						g,
						[
							[sx, sy - 10 * k],
							[sx, sy - 4 * k],
							[sx - 5 * k, sy - 5 * k],
						],
						"#fff1b7",
					);
				} else if (id === "arrow") {
					const a = o.angle || 0,
						p = r.w(x + Math.cos(a) * 10, y + Math.sin(a) * 10, z + 1);
					px.line(g, sx, sy, p[0], p[1], "#e7d6ad", k);
					px.disc(g, p[0], p[1], k, "#f6e9bc");
					px.line(g, sx - k, sy - 2 * k, sx + k, sy + 2 * k, "#9fc8b6", k);
				} else if (id === "target") {
					px.line(g, sx, sy, sx, sy - 18 * k, "#b79865", 2 * k);
					px.disc(g, sx, sy - 15 * k, 6 * k, "#c7ad79");
					px.disc(g, sx, sy - 15 * k, 3 * k, "#4b827c");
					px.disc(g, sx, sy - 15 * k, 1 * k, "#e5d39d");
				} else if (id === "roots") {
					for (let n = 0; n < 5; n++) {
						const p = r.w(x + (n - 2) * 5, y + Math.sin(n) * 5, z);
						px.line(g, sx, sy - 7 * k, p[0], p[1], "#6d684b", 3 * k);
						px.line(g, sx - k, sy - 7 * k, p[0] - k, p[1], "#a19a6e", k);
					}
				} else if (id === "bones" || id === "tracks") {
					for (let n = 0; n < 4; n++) {
						const p = r.w(x + (n - 1.5) * 4, y + Math.sin(n * 3) * 3, z + 0.2);
						px.ell(
							g,
							p[0],
							p[1],
							1.5 * k,
							1 * k,
							id === "bones" ? "#d6c7a3" : "#6c7367",
						);
					}
				} else {
					px.disc(g, sx, sy - 4 * k, 3 * k, "#afaa8a");
					px.disc(g, sx - k, sy - 5 * k, 1 * k, "#d9cfab");
				}
			},
			{ emissive: id === "arrow" || id === "treasure" },
		);
	}

	NM.Art = Object.freeze({
		ranger,
		creature,
		prop,
		bowOrigin,
		BOW,
		types: Object.freeze([
			"rat",
			"snake",
			"bat",
			"spider",
			"ooze",
			"drake",
			"guardian1",
			"guardian2",
			"target",
		]),
		clear(game) {
			rigs.delete(game);
		},
	});
})();
