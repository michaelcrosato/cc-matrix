/* Original procedural ranger rigs and miniature worlds. Extends the native painter pipeline. */
(() => {
	const E = My3D2dge,
		{ px, clamp, lerp } = E;
	const TAU = Math.PI * 2;
	const PALETTES = {
		chalk: {
			floor: "#65594b",
			stone: "#9a8b76",
			side: "#706553",
			moss: "#8a8559",
			glow: "#ffc77c",
			deep: "#100f17",
			dust: "#d2b18a",
		},
		root: {
			floor: "#39473c",
			stone: "#64745a",
			side: "#465343",
			moss: "#5e8a50",
			glow: "#c7e4a0",
			deep: "#0a1417",
			dust: "#a6c77c",
		},
		tide: {
			floor: "#344e59",
			stone: "#6c8990",
			side: "#425b67",
			moss: "#4b8c87",
			glow: "#80d8e2",
			deep: "#0a101d",
			dust: "#9bc6d0",
		},
		ember: {
			floor: "#574243",
			stone: "#927366",
			side: "#60474a",
			moss: "#a76a45",
			glow: "#ffc17b",
			deep: "#190d16",
			dust: "#f2b887",
		},
		rime: {
			floor: "#3d465c",
			stone: "#7c8ea4",
			side: "#515b77",
			moss: "#657fa5",
			glow: "#a8dcec",
			deep: "#0c1020",
			dust: "#b9cce8",
		},
	};
	function blendJoint(J, k, p, w) {
		J[k] = J[k].map((v, i) => lerp(v, p[i], w));
	}
	E.Humanoid.pose("dt-bow", (J, w, rig) => {
		const p = rig._bowPull || 0;
		blendJoint(J, "handR", [7.5, 0.4, 18], w);
		blendJoint(J, "elbowR", [3.2, 4.4, 17], w);
		blendJoint(J, "handL", [7.1 - p * 6, -0.2 - p * 1.9, 18.1], w);
		blendJoint(J, "elbowL", [1, -5.2, 17.2], w);
		J.bladeDir = [1, 0, 0];
	});
	E.Humanoid.pose("dt-nock", (J, w, rig) => {
		const u = rig._nockU || 0,
			reach = Math.sin(u * Math.PI),
			recoil = Math.max(0, 1 - u * 4) * 0.6;
		blendJoint(J, "handR", [7.5 + recoil, 0.4, 18], w);
		blendJoint(J, "elbowR", [3.2, 4.4, 17], w);
		blendJoint(
			J,
			"handL",
			[7.1 - reach * 10, -0.2 - reach * 2.3, 18.1 + reach * 2],
			w,
		);
		blendJoint(J, "elbowL", [1 - reach * 3, -5.2, 17.2 + reach * 1.2], w);
		J.bladeDir = [1, 0, 0];
	});
	E.Humanoid.pose("dt-paddle", (J, w, rig) => {
		const stroke = Math.sin(rig.t * 6),
			lift = Math.max(0, Math.cos(rig.t * 6)) * 2;
		blendJoint(J, "handR", [4 + stroke * 3, 3, 14 + lift], w);
		blendJoint(J, "handL", [1 + stroke * 2, -1, 17 + lift], w);
		blendJoint(J, "elbowR", [1, 5, 15], w);
		blendJoint(J, "elbowL", [-2, -4, 16], w);
		J.bladeDir = [0.3, 0.25, -0.92];
	});
	E.Humanoid.weapon("dt-oar", {
		length: 17,
		rest: [0.3, 0.25, -0.92],
		blade: false,
		draw(w) {
			const a = w.at(-4),
				b = w.at(14),
				c = w.at(18),
				g = w.g,
				ww = w.u;
			w.push(w.hand[2] + 0.1, () => {
				px.line(g, a[0], a[1], b[0], b[1], "#463b2a", Math.max(1, 2 * ww));
				px.line(
					g,
					a[0] - 0.5,
					a[1] - 0.5,
					b[0] - 0.5,
					b[1] - 0.5,
					"#c3a77a",
					Math.max(1, 0.7 * ww),
				);
				const dx = c[0] - b[0],
					dy = c[1] - b[1],
					ln = Math.hypot(dx, dy) || 1,
					nx = (-dy / ln) * 1.8 * ww,
					ny = (dx / ln) * 1.8 * ww;
				px.poly(
					g,
					[
						[b[0] + nx, b[1] + ny],
						[c[0] + nx * 0.65, c[1] + ny * 0.65],
						[c[0] - nx * 0.65, c[1] - ny * 0.65],
						[b[0] - nx, b[1] - ny],
					],
					"#ba9b6b",
				);
			});
		},
	});
	E.Humanoid.pose("dt-listen", (J, w) => {
		blendJoint(J, "handL", [-0.3, -4.7, 23], w);
		blendJoint(J, "elbowL", [-1, -6, 18.6], w);
		blendJoint(J, "handR", [4.6, 1.5, 12.6], w);
		J.bladeDir = [0.4, 0, 0.9];
	});
	E.Humanoid.weapon("dt-bow", {
		length: 0,
		rest: [1, 0, 0],
		blade: false,
		draw(w) {
			const { g, Sp, J, Q, u, rig } = w;
			const h = J.handR,
				s = rig._bowPull || 0,
				tones = E.tones("#bd8650");
			const A = Sp(h, -2.5, 0, 9.5),
				B = Sp(h, 0.7, 0, 5.7),
				C = Sp(h, 0.6, 0, -5.7),
				D = Sp(h, -2.5, 0, -9.5);
			const N = Q.handL,
				H = Q.handR;
			const line = (a, b, c, ww = 1) =>
				px.line(g, a[0], a[1], b[0], b[1], c, Math.max(1, ww * u));
			w.push(H[2] + 0.06, () => {
				for (const [a, b] of [
					[A, B],
					[B, H],
					[H, C],
					[C, D],
				]) {
					line(a, b, tones.deep, 2.1);
					line(
						[a[0] - 0.5, a[1] - 0.5],
						[b[0] - 0.5, b[1] - 0.5],
						tones.lt,
						0.75,
					);
				}
				const mid = rig._bowActive ? N : Sp(h, -2.5 - s * 5, 0, 0);
				line(A, mid, "#efe6bd");
				line(mid, D, "#b6b497");
				line(Sp(h, 0, 0, -1.3), Sp(h, 0, 0, 1.4), "#402e26", 2.3);
				if (rig._bowActive) {
					const tip = Sp(h, 5.2, 0, 0.1);
					line(N, tip, "#f1d8ac", 0.85);
					const f = Sp(h, 3, 0, 0.1);
					line(tip, [f[0] - 0.5, f[1] - 1.2], "#e8f4ed");
					line(tip, [f[0] + 0.5, f[1] + 1.2], "#b5d2c9");
					const f0 = Sp(h, -4.1 - s * 2, 0, 0);
					line(N, [f0[0], f0[1] - 1.5], "#c9dfc1");
				}
			});
		},
	});
	E.Humanoid.hat("dt-ranger", (h) => {
		const { g, Sp, J, c, r } = h;
		const a = Sp(J.head, 1.4, -4.2, 1.3),
			b = Sp(J.head, 1.4, 4.2, 1.3),
			tip = Sp(J.head, -5.3, 0, 5.3),
			crown = Sp(J.head, -0.4, 0, 3.4);
		px.poly(g, [a, b, tip], E.shade(c, -0.2));
		px.poly(g, [a, crown, tip], c);
		px.line(g, a[0], a[1], b[0], b[1], E.shade(c, 0.3));
		const feather = Sp(J.head, -4.8, -0.1, 7.3);
		px.line(
			g,
			tip[0],
			tip[1],
			feather[0],
			feather[1],
			"#e3bd77",
			Math.max(1, r * 0.25),
		);
		px.line(
			g,
			feather[0],
			feather[1],
			feather[0] + 2,
			feather[1] - 1,
			"#f2ddaa",
		);
	});
	const SHAPES = {
		"dt-ladder": {
			about: "Weathered rope ladder with copper rungs",
			mats: { w: "oak", m: "copper" },
			parts: [
				[
					"mirror",
					"x",
					["box", "w", [4.8, 0, 0], [1.5, 1.6, 27], { rot: [0, -7, 0] }],
				],
				["row", 6, [0, 0, 4], ["box", "m", [0, -0.3, 14], [10, 1.2, 1.3]]],
			],
		},
		"dt-axe": {
			about: "The trail axe in a split stone",
			mats: { w: "walnut", m: "steel", g: "copper", s: "slate" },
			parts: [
				["rock", "s", [0, 0, 0], 7, { sz: 0.6, seed: 9 }],
				["box", "w", [0, 0, 3], [1.7, 1.7, 15], { rot: [0, -20, 0] }],
				[
					"prism",
					"m",
					[4, 0, 15],
					[
						[-1, -3],
						[4, -3],
						[6, 1],
						[2, 4],
						[-1, 3],
					],
					2,
					{ axis: "y" },
				],
				["box", "g", [1, 0, 13], [2.4, 2.4, 2]],
			],
		},
		"dt-boat": {
			about: "Folded birch canoe and oar",
			mats: { w: "birch", m: "copper", r: "leather" },
			parts: [
				[
					"prism",
					"w",
					[0, 0, 0],
					[
						[-13, 0],
						[-9, -4],
						[9, -4],
						[13, 0],
						[9, 4],
						[-9, 4],
					],
					4,
				],
				["box", "m", [0, 0, 2], [1.3, 8.5, 3]],
				["box", "w", [0, 0, 4], [22, 1, 1.5], { rot: 25 }],
				["box", "w", [10, 4, 4], [4, 6, 1.3], { rot: 25 }],
			],
		},
		"dt-key": {
			about: "A brass sun key on a carved plinth",
			mats: { s: "ruin", g: "gold" },
			parts: [
				["cyl", "s", [0, 0, 0], 7, 3, { seg: 6 }],
				["cyl", "s", [0, 0, 3], 4, 6, { seg: 6 }],
				["cyl", "g", [0, 0, 13], 3, 1.2, { seg: 8 }],
				["box", "g", [0, 3.5, 13], [1.6, 6, 1.3]],
				["box", "g", [2, 5.5, 13], [3.3, 1.5, 1.3]],
			],
		},
		"dt-quiver": {
			about: "Fletched shafts in an ochre trail quiver",
			mats: { q: "leather", r: "copper", a: "birch", f: "linen" },
			parts: [
				["cyl", "q", [0, 0, 0], 3.4, 10, { seg: 6 }],
				["cyl", "r", [0, 0, 8], 3.7, 1, { seg: 6 }],
				["row", 3, [2, 0, 0], ["box", "a", [0, 0, 7], [0.8, 0.8, 10]]],
				["row", 3, [2, 0, 0], ["box", "f", [0, 0, 14], [1.6, 1.5, 2.4]]],
			],
		},
		"dt-relic": {
			about: "Dawn circlet half with three bright spires",
			mats: { g: "gold", b: "bronze", s: "crystal" },
			parts: [
				["cyl", "b", [0, 0, 0], 5, 2, { seg: 6 }],
				[
					"prism",
					"g",
					[0, 0, 3],
					[
						[-7, 0],
						[-7, 6],
						[-4, 3],
						[0, 10],
						[3, 3],
						[6, 7],
						[7, 0],
					],
					2,
					{ axis: "y" },
				],
				["ball", "s", [0, 0, 10], 1.7],
			],
		},
		"dt-bank": {
			about: "Polished echo stone, carved with reflecting chevrons",
			mats: { s: "slate", i: "steel", g: "copper" },
			parts: [
				["rock", "s", [0, 0, 0], 8, { sz: 0.65, seed: 2 }],
				[
					"prism",
					"i",
					[0, 0, 5],
					[
						[-8, 0],
						[8, 0],
						[7, 2],
						[-7, 2],
					],
					2,
					{ axis: "y" },
				],
				["box", "g", [0, -1.2, 5], [4, 1, 1]],
			],
		},
		"dt-waystone": {
			about: "A copper star set in an ancient trail stone",
			mats: { s: "ruin", g: "copper" },
			parts: [
				["rock", "s", [0, 0, 0], 6.5, { sz: 1.8, seed: 3 }],
				["box", "g", [0, 4.3, 10], [5, 0.6, 1.5]],
				["box", "g", [0, 4.3, 8.4], [1.5, 0.6, 4.8]],
			],
		},
		"dt-gate": {
			about: "The sealed summit wall with a sun keyhole",
			mats: { s: "ruin", g: "bronze", b: "oak" },
			parts: [
				["mirror", "x", ["box", "s", [14, 0, 0], [8, 9, 38]]],
				["box", "s", [0, 0, 31], [36, 9, 8]],
				["row", 5, [4, 0, 0], ["box", "g", [0, 0, 0], [1.5, 2, 31]]],
				["box", "g", [0, 2, 14], [5, 2, 7]],
			],
		},
		"dt-moonwell": {
			about: "A ruined moonwell spilling pale light",
			mats: { s: "marble", w: "ice" },
			parts: [
				["cyl", "s", [0, 0, 0], 14, 5, { seg: 10 }],
				["cyl", "w", [0, 0, 5], 11, 1, { seg: 10 }],
				["ring", 6, 13, ["cyl", "s", [0, 0, 0], 2.5, 8, { seg: 5 }]],
			],
		},
		"dt-obelisk": {
			about: "Broken sun obelisk",
			mats: { s: "sandstone", g: "copper" },
			parts: [
				["box", "s", [0, 0, 0], [16, 14, 5]],
				["box", "s", [0, 0, 5], [9, 8, 33]],
				["wedge", "s", [0, 0, 38], [9, 8, 9]],
				["box", "g", [0, 4.2, 19], [3, 0.8, 12]],
			],
		},
		"dt-camp": {
			about: "A ranger canvas shelter and stocked firewood",
			mats: { w: "oak", c: "linen", r: "leather" },
			parts: [
				[
					"prism",
					"c",
					[0, 0, 0],
					[
						[-15, 0],
						[0, 20],
						[15, 0],
					],
					21,
					{ axis: "y" },
				],
				["box", "r", [0, 10.5, 0], [1, 1, 20]],
				[
					"mirror",
					"x",
					["box", "w", [12, -6, 0], [1.4, 1.4, 18], { rot: [0, -18, 0] }],
				],
			],
		},
	};
	Object.assign(SHAPES, {
		"dt-target": {
			about: "Practice bale with bright fletching target",
			mats: { w: "oak", s: "straw", c: "copper" },
			parts: [
				["mirror", "x", ["box", "w", [5, 0, 0], [1.5, 2, 16]]],
				["cyl", "s", [0, 0, 9], 7, 6, { seg: 10 }],
				["cyl", "c", [0, 0, 15], 2.7, 1, { seg: 8 }],
			],
		},
		"dt-gong": {
			about: "A brass bank-shot gong beneath its beam",
			mats: { w: "oak", g: "bronze", c: "copper" },
			parts: [
				["mirror", "x", ["box", "w", [10, 0, 0], [2, 3, 29]]],
				["box", "w", [0, 0, 26], [24, 3, 3]],
				["ball", "g", [0, 0, 15], 8, { sz: 1.2 }],
				["ball", "c", [0, 5.5, 15], 2.4],
			],
		},
		"dt-bell": {
			about: "Bronze guardian bell cracked by the storm",
			mats: { b: "bronze", g: "gold", s: "ruin" },
			parts: [
				["mirror", "x", ["box", "s", [10, 0, 0], [5, 7, 32]]],
				["box", "s", [0, 0, 28], [25, 7, 5]],
				[
					"lathe",
					"b",
					[0, 0, 8],
					[
						[8, 0],
						[8, 2],
						[5, 4],
						[4, 12],
						[1, 14],
						[0, 14],
					],
					{ seg: 10 },
				],
				["ball", "g", [0, 0, 7], 2],
			],
		},
		"dt-books": {
			about: "Waterworn folios under the mountain",
			mats: { c: "leather", p: "linen" },
			parts: [
				["box", "c", [0, 0, 0], [9, 7, 1.5], { rot: 12 }],
				["box", "p", [0, 0, 1.5], [8, 6, 1.8], { rot: 12 }],
				["box", "c", [0, 0, 3.3], [9, 7, 1]],
				["box", "c", [2, 1, 4.2], [7, 10, 2], { rot: -8 }],
			],
		},
	});
	Object.assign(E.SHAPES, SHAPES);
	function ranger(i = 0) {
		const rig = new E.Humanoid({
			size: 1.22,
			build: "chibi",
			weapon: "dt-bow",
			cheat: 0,
			outfit: "tunic",
			hair: i ? "ponytail" : "short",
			hat: { style: "dt-ranger", color: i ? "#715c87" : "#60765a" },
			sleeves: "long",
			cape: { len: 5, width: 5.6, seg: 2.8 },
			armor: true,
			seed: 710 + i,
			colors: {
				skin: i ? "#bf936f" : "#ddbc91",
				hair: i ? "#d4c6ac" : "#49342e",
				cloth: i ? "#68778e" : "#63795d",
				coat: "#747155",
				pants: "#393e44",
				boot: "#51402f",
				belt: "#c49a5b",
				trim: "#e0c78a",
				glove: "#b6a17f",
				cape: i ? "#4b536e" : "#3e635e",
				capeIn: "#243c3a",
				metal: "#b5a283",
				plate: "#8d927a",
				eye: "#1b2426",
			},
			draw: {
				under(g, Q, _ri) {
					const a = Q.shC,
						b = Q.hipC;
					const x = a[0] - 6,
						y = a[1] + 2;
					px.line(g, x, y, b[0] - 3, b[1] - 2, "#2c2525", 5);
					px.line(g, x - 1, y, b[0] - 4, b[1] - 3, "#77563a", 3);
					for (let j = 0; j < 3; j++) {
						px.line(g, x - 2 + j * 2, y + 1, x - 3 + j * 2, y - 8, "#bca77f");
						px.rect(
							g,
							x - 4 + j * 2,
							y - 9,
							2,
							3,
							j % 2 ? "#9cae8f" : "#dfd9ad",
						);
					}
				},
			},
		});
		return rig;
	}
	function canonical(k) {
		if (/rime|frost|second|guardian2|breath|gale/.test(k)) return "rime";
		if (/guardian|ember|first|wing|warden/.test(k)) return "ember";
		if (/drake/.test(k)) return "drake";
		if (/ooze|blob|slime/.test(k)) return "ooze";
		return k;
	}
	// Small articulated rigs share the engine's local-frame convention and shaded pixel grammar.
	function drawCreature(g, ox, oy, view, e, time) {
		const kind = canonical(e.kind || e.type || "rat"),
			cv = E.charView(view),
			scale = cv.scale || 1;
		const a = e.aim ?? e.facing ?? 0,
			c = Math.cos(a),
			s = Math.sin(a),
			pp = cv.p.bind(cv);
		const phase = time * 8 + (e.id?.length || 0),
			moving =
				Math.hypot(e.vx || 0, e.vy || 0) > 0.4 ||
				["investigate", "attack"].includes(e.state);
		const wind = e.state === "windup",
			dead = e.state === "defeated" || e.hp <= 0;
		const p = (f, rt, z) => {
			const q = pp(f * c - rt * s, f * s + rt * c, z);
			return [ox + q[0], oy + q[1], q[2] || 0];
		};
		const ops = [];
		const line = (v, w, r, col) => {
			const A = p(...v),
				B = p(...w);
			ops.push({
				d: (A[2] + B[2]) / 2,
				draw() {
					px.line(
						g,
						A[0],
						A[1],
						B[0],
						B[1],
						E.shade(col, -0.45),
						Math.max(1, r * 2 * scale + 1),
					);
					px.line(
						g,
						A[0] - 0.5,
						A[1] - 0.5,
						B[0] - 0.5,
						B[1] - 0.5,
						col,
						Math.max(1, r * 2 * scale),
					);
					px.line(
						g,
						A[0] - 0.5,
						A[1] - 1,
						B[0] - 0.5,
						B[1] - 1,
						E.shade(col, 0.18),
						Math.max(1, r * 0.7 * scale),
					);
				},
			});
		};
		const ball = (v, rx, ry, col) => {
			const q = p(...v),
				t = E.tones(col);
			ops.push({
				d: q[2],
				draw() {
					px.ell(g, q[0], q[1], rx * scale, ry * scale, t.deep);
					px.ell(
						g,
						q[0] - 0.4,
						q[1] - 1,
						Math.max(1, rx * scale - 1),
						Math.max(1, ry * scale - 1),
						t.sh,
					);
					px.ell(
						g,
						q[0] - rx * scale * 0.13,
						q[1] - ry * scale * 0.18,
						Math.max(1, rx * scale * 0.78),
						Math.max(1, ry * scale * 0.72),
						t.base,
					);
					px.ell(
						g,
						q[0] - rx * scale * 0.25,
						q[1] - ry * scale * 0.34,
						Math.max(0.5, rx * scale * 0.38),
						Math.max(0.5, ry * scale * 0.32),
						t.lt,
					);
				},
			});
		};
		const poly = (vs, col) => {
			const pts = vs.map((v) => p(...v));
			ops.push({
				d: pts.reduce((n, v) => n + v[2], 0) / pts.length,
				draw() {
					px.poly(g, pts, col);
				},
			});
		};
		const dot = (v, col, rad = 1) => {
			const q = p(...v);
			ops.push({
				d: q[2] + 0.5,
				draw() {
					px.disc(g, q[0], q[1], Math.max(0.5, rad * scale), col);
				},
			});
		};
		if (kind === "target") {
			const z = 13;
			line([0, -9, 0], [0, -9, 25], 1.1, "#84765e");
			line([0, 9, 0], [0, 9, 25], 1.1, "#84765e");
			line([0, -9, 25], [0, 9, 25], 1.3, "#a18b68");
			ball([0, 0, z], 7.3, 9.3, dead ? "#666055" : "#c69c5e");
			ball([1, 0, z], 4.8, 6.7, "#806344");
			ball([1.5, 0, z], 2.1, 2.8, "#dec188");
		} else if (kind === "rat") {
			const bob = moving
				? Math.sin(phase * 2) * 0.7
				: Math.sin(time * 3) * 0.15;
			const z = dead ? 2 : 5 + bob;
			for (const side of [-1, 1])
				for (const f of [-4, 3]) {
					const stride = moving ? Math.sin(phase + (side + f) * 1.7) * 2 : 0;
					line(
						[f, side * 3, z - 1],
						[f + stride, side * 4, dead ? 0 : 1],
						1.05,
						"#9a7863",
					);
				}
			const tail = [
				[-6, 0, 2],
				[-11, Math.sin(phase * 0.4) * 2, 1],
				[-16, 4 + Math.sin(phase * 0.4) * 2, 0.5],
			];
			for (let i = 0; i < 2; i++) line(tail[i], tail[i + 1], 0.65, "#a18070");
			ball([0, 0, z], 8, 4.3, "#81776b");
			ball([6, 0, z + 0.8], 4.5, 3.4, "#9d8b73");
			for (const side of [-1, 1]) {
				ball([5, side * 2.7, z + 3.1], 2, 2.4, "#ae8b80");
				dot([8, side * 2.6, z + 1.5], "#e6c07f", 0.8);
			}
			ball([10, 0, z - 0.2], 2.1, 1.2, "#534b49");
		} else if (kind === "snake") {
			const coil = wind || e.state === "dormant",
				amp = coil ? 3.4 : 5;
			for (let j = 7; j >= 0; j--) {
				const f = coil ? Math.cos(j * 0.95) * amp - j * 0.25 : 8 - j * 3.2,
					rt = coil
						? Math.sin(j * 0.95) * amp
						: Math.sin(phase * 0.7 - j * 0.8) * 3.5,
					z = dead ? 1 : 2 + (7 - j) * 0.25;
				ball(
					[f, rt, z],
					2.6 - j * 0.15,
					2.1 - j * 0.1,
					j % 2 ? "#82916a" : "#a5a575",
				);
			}
			const h = coil ? 8 + (wind ? 4 : 0) : 3;
			line([4, 0, 2], [7, 0, h], 2, "#a7ad74");
			ball([8.2, 0, h + 1], 4, 2.8, "#b4b57e");
			for (const sd of [-1, 1]) dot([10, sd * 2, h + 2.1], "#eece77", 0.8);
			if (wind) {
				line([11, 0, h], [14, 0, h - 0.6], 0.45, "#d79783");
				line([14, 0, h - 0.6], [15, 1, h - 0.9], 0.35, "#d79783");
			}
		} else if (kind === "bat") {
			const roost = e.state === "dormant",
				fl = roost ? 0.8 : Math.sin(time * 19 + (e.id?.length || 0));
			const z = dead ? 1 : roost ? 13 : 14 + Math.sin(time * 5) * 2;
			for (const sd of [-1, 1]) {
				const root = [0, sd * 3, z],
					el = [-2, sd * 10, z + fl * 6],
					tip = [-5, sd * 20, z + fl * 9];
				poly(
					[root, el, tip, [-7, sd * 12, z - 5], [-5, sd * 6, z - 3]],
					"#4a4a68",
				);
				poly([root, el, [-7, sd * 12, z - 5]], "#727389");
				line(root, el, 0.65, "#9b91aa");
				line(el, tip, 0.5, "#a39cb2");
				line(el, [-7, sd * 12, z - 5], 0.45, "#807991");
			}
			ball([1, 0, z], 4.5, 5.4, "#686178");
			ball([3, 0, z + 2], 3.7, 3.5, "#84728c");
			for (const sd of [-1, 1]) {
				poly(
					[
						[2, sd * 2, z + 4],
						[0, sd * 4, z + 8],
						[5, sd * 3, z + 5],
					],
					"#8a7d99",
				);
				dot([5, sd * 1.9, z + 2], "#f7da8b", 0.8);
				dot([5.1, sd * 1.5, z], "#f4e7c3", 0.65);
			}
		} else if (kind === "spider") {
			const z = dead ? 1 : 4;
			for (const sd of [-1, 1])
				for (let j = 0; j < 4; j++) {
					const ph = phase + j * Math.PI * 0.6 + (sd > 0 ? 0 : Math.PI),
						f = -5 + j * 3.6;
					const knee = [
							f + Math.sin(ph) * (moving ? 2 : 0),
							sd * (9 + (j % 2) * 2),
							z + 3,
						],
						foot = [
							f + 3 + Math.sin(ph) * (moving ? 3 : 0),
							sd * (14 + (j % 2) * 2),
							0.7 + Math.max(0, Math.cos(ph)) * (moving ? 2 : 0),
						];
					line([f * 0.5, sd * 2, z], knee, 0.9, "#5f6365");
					line(knee, foot, 0.7, "#9b927f");
				}
			ball([-3, 0, z + 1], 6.5, 4.8, "#776f67");
			ball([3, 0, z + 1], 4.8, 3.9, "#9c7b62");
			for (const sd of [-1, 1])
				for (let j = 0; j < 2; j++)
					dot([6, sd * (1 + j), z + 2 + j * 0.5], "#edd18a", 0.65);
			poly(
				[
					[-5, -2, z + 4],
					[-1, 0, z + 5],
					[-5, 2, z + 4],
					[-8, 0, z + 3],
				],
				"#c4ac83",
			);
		} else if (kind === "ooze") {
			const pul = 1 + Math.sin(time * 3) * 0.09;
			for (let j = 0; j < 3; j++) {
				const off = (j - 1) * 5;
				ball(
					[off, Math.sin(time * 2 + j) * 3, 3 + j * 0.4],
					(8 - j) * pul,
					(5 + j * 0.6) / pul,
					j % 2 ? "#7b9a77" : "#608673",
				);
			}
			dot([4, 3, 6], "#d4df96", 1.3);
			dot([6, -2, 7], "#c4dcac", 1);
			for (let j = 0; j < 3; j++)
				dot(
					[-3 + j * 3, Math.cos(time + j) * 3, 7 + Math.sin(time * 2 + j)],
					"#9ac298",
					0.65,
				);
			if (e.state === "stunned") {
				line([-2, -4, 6], [4, 0, 9], 0.6, "#ddc28c");
			}
		} else {
			const boss = kind !== "drake",
				cold = kind === "rime",
				body = cold ? "#667e96" : boss ? "#8b6956" : "#72845e",
				wing = cold ? "#405b7b" : "#755046",
				trim = cold ? "#a6d5dd" : "#d6aa73";
			const k = boss ? 1.65 : 1,
				breath = Math.sin(time * 2.2) * 0.5,
				load = wind ? Math.min(1, (e.timer || 0.5) * 0.9) : 0;
			const P = (x, y, z) => [x * k, y * k, z * k];
			const bball = (v, rx, ry, col) => ball(P(...v), rx * k, ry * k, col);
			const bline = (v, w, ra, col) => line(P(...v), P(...w), ra * k, col);
			const bpoly = (vs, col) =>
				poly(
					vs.map((v) => P(...v)),
					col,
				);
			const z = dead ? 3 : 8 + breath;
			const attack = e.state === "attack",
				flap = Math.sin(time * 3.7 + (e.id?.length || 0));
			if (boss && !dead)
				for (const sd of [-1, 1]) {
					const root = [-3, sd * 3, z + 5],
						el = [-9, sd * (14 + load * 4), z + 14 + flap * 3 + load * 5],
						tip = [-15, sd * (26 + load * 4), z + 13 + flap * 6 + load * 7];
					bpoly(
						[root, el, tip, [-13, sd * 20, z - 1], [-6, sd * 10, z + 1]],
						wing,
					);
					bpoly([root, el, [-13, sd * 20, z - 1]], E.shade(wing, 0.16));
					bline(root, el, 0.85, trim);
					bline(el, tip, 0.7, trim);
					bline(el, [-13, sd * 20, z - 1], 0.5, E.shade(trim, -0.1));
					bline(el, [-6, sd * 10, z + 1], 0.5, E.shade(trim, -0.12));
				}
			const tail = [
				[-9, 0, z - 2],
				[-15, Math.sin(time * 1.5) * 3, z - 4],
				[-21, Math.sin(time * 1.5 - 0.8) * 5, 2],
			];
			bline(tail[0], tail[1], 2.5, body);
			bline(tail[1], tail[2], 1.2, body);
			bpoly([tail[2], [-24, 4, 3], [-23, 0, 6]], trim);
			for (const sd of [-1, 1])
				for (const f of [-6, 5]) {
					const stride = moving
						? Math.sin(phase * 0.45 + (f + sd) * 0.7) * 2
						: 0;
					const hip = [f, sd * 4, z],
						kn = [f + stride, sd * 7, z - 4],
						ft = [f + stride + 3, sd * 7, 1];
					bline(hip, kn, 2.4, E.shade(body, -0.1));
					bline(kn, ft, 1.8, body);
					for (let j = 0; j < 3; j++)
						bline(ft, [ft[0] + 3, ft[1] + j - 1, 0.7], 0.5, trim);
				}
			bball([-1, 0, z], 12, 7, body);
			bball([3, 0, z + 1], 7, 6, E.shade(body, 0.08));
			for (let j = 0; j < 5; j++)
				bpoly(
					[
						[-8 + j * 3, -1, z + 5],
						[-8 + j * 3, 0, z + 9 - j * 0.3],
						[-6 + j * 3, 1, z + 5],
					],
					trim,
				);
			const hx = 10 + (attack ? 5 : 0) - load * 2,
				hz = z + 7 + load * 3;
			bline([5, 0, z + 1], [hx, 0, hz], 4, body);
			bball([hx + 2, 0, hz], 7.5, 5.2, E.shade(body, 0.08));
			bball([hx + 7, 0, hz - 2], 5, 2.4, E.shade(body, 0.13));
			for (const sd of [-1, 1]) {
				bpoly(
					[
						[hx - 2, sd * 3, hz + 2],
						[hx - 6, sd * 6, hz + 9],
						[hx + 1, sd * 3, hz + 4],
					],
					trim,
				);
				dot(
					P(hx + 5, sd * 4, hz + 2),
					cold ? "#e0fcff" : "#ffe0a0",
					boss ? 1.3 : 1,
				);
				if (attack || wind)
					bline(
						[hx + 5, sd * 2, hz - 2],
						[hx + 4, sd * 2, hz - 5],
						0.7,
						"#f0dfb8",
					);
			}
			if (boss) {
				// Distinct armor plates; a wounded creature visibly loses a plate at every hit.
				const wounds = Math.max(0, (e.maxHp || 3) - (e.hp || 0));
				for (let j = wounds; j < 3; j++)
					bpoly(
						[
							[hx - 2 + j * 3, -4, hz + 4],
							[hx - 1 + j * 3, 0, hz + 7],
							[hx + 2 + j * 3, 4, hz + 4],
							[hx, 0, hz + 2],
						],
						cold ? "#c0d7dd" : "#d6bd86",
					);
			}
			if (dead) {
				for (let j = 0; j < 5; j++)
					dot(P(-8 + j * 4, Math.sin(j) * 7, 2), trim, 1);
			}
		}
		ops.sort((a, b) => a.d - b.d);
		for (const op of ops) op.draw();
	}
	class WorldRenderer {
		constructor(game, sim) {
			this.game = game;
			this.sim = sim;
			this.rigs = new Map();
			this.map = null;
			this.fog = null;
			this.caveId = null;
			this.state = null;
			this.options = {};
			this.visualTime = 0;
			this.fogCells = new Set();
			this.visibleCells = new Set();
			this.titleRig = ranger(0);
			this.titlePartner = ranger(1);
			this.mapPositions = {};
			this._makeLandscape();
		}
		_makeLandscape() {
			const rows = [];
			for (let y = 0; y < 32; y++) {
				let row = "";
				for (let x = 0; x < 48; x++) {
					const river = 21 + Math.sin(y * 0.35) * 2.7;
					row +=
						Math.abs(x - river) < 1.2
							? "~"
							: Math.abs(y - (23 - x * 0.27)) < 1.35
								? "p"
								: ".";
				}
				rows.push(row);
			}
			this.landscape = new E.TileMap({
				rows,
				legend: { "~": { floor: "water" }, p: { floor: "path" } },
				types: {},
				outside: "#122d33",
				floorTex: (x, y, tag) => {
					if (tag === "water")
						return E.tex.water(x, y, {
							base: "#355c65",
							dark: "#234957",
							light: "#78908a",
						});
					if (tag === "path")
						return E.tex.dirt(x, y, {
							base: E.hex("#74634b"),
							dark: E.hex("#514f3b"),
							light: E.hex("#8c7959"),
						});
					return E.tex.grass(x, y, {
						base: E.hex("#354d40"),
						dark: E.hex("#243f39"),
						light: E.hex("#50624a"),
					});
				},
			});
			this.titleBackdrop = new E.Backdrop({
				sky: ["#091724", "#203844", "#5b6861"],
				moon: { x: 0.74, y: 0.18, r: 17, color: "#d9d3af" },
				stars: 90,
				layers: [
					{
						kind: "mountains",
						color: "#203543",
						y: 0.48,
						height: 0.29,
						parallax: 0,
					},
					{
						kind: "mountains",
						color: "#2b434a",
						y: 0.59,
						height: 0.28,
						parallax: 0.04,
					},
					{
						kind: "forest",
						color: "#243f3e",
						y: 0.75,
						height: 0.27,
						parallax: 0.07,
					},
					{
						kind: "fog",
						color: "#6d8177",
						y: 0.82,
						height: 0.12,
						parallax: 0.1,
						drift: 2,
					},
				],
			});
		}
		getMap() {
			return this.map;
		}
		_ensureMap(state) {
			const id = state.cave || state.levelId || "chalk";
			if (this.caveId === id && this.map && this.decorationSeed === state.seed)
				return;
			this.decorationSeed = state.seed;
			const def = globalThis.DTContent?.caves?.[id];
			if (!def) return;
			this.caveId = id;
			this.def = def;
			this.palette = PALETTES[id] || PALETTES.chalk;
			const pal = this.palette;
			const p = {
				stones: [
					E.hex(pal.floor),
					E.hex(E.shade(pal.floor, 0.06)),
					E.hex(E.shade(pal.floor, -0.05)),
				],
				mortar: E.hex(E.shade(pal.floor, -0.28)),
				hi: E.hex(E.shade(pal.floor, 0.19)),
				lo: E.hex(E.shade(pal.floor, -0.2)),
				speck: E.hex(E.shade(pal.floor, -0.15)),
			};
			this.map = new E.TileMap({
				rows: def.rows,
				legend: { "#": 1, "~": { floor: "water" }, ",": { floor: "dirt" } },
				types: {
					1: {
						h: 24,
						top: pal.stone,
						side: pal.side,
						face: "rock",
						roof: "slate",
						cut: true,
						cutH: 5,
					},
				},
				floorTex: (x, y, tag) =>
					tag === "water"
						? E.tex.water(x, y, {
								base: "#355c65",
								dark: "#214552",
								light: "#7f9d9f",
							})
						: E.tex.flagstone(x, y, p),
				outside: pal.deep,
				ao: 4,
			});
			this.fog = new E.Fog(E.Grid.from(this.map));
			this.game.cam.bounds = (v) => this.map.bounds(v);
			this._buildDress();
		}
		_buildDress() {
			const def = this.def,
				map = this.map;
			this.dress = [];
			const free = (x, y) => map.cell(x, y) === 0;
			for (let cy = 1; cy < map.h - 1; cy++)
				for (let cx = 1; cx < map.w - 1; cx++) {
					if (!free(cx, cy)) continue;
					const h = E.hash2(
						cx * 11 + this.caveId.length + ((this.decorationSeed || 7) % 997),
						cy * 31,
					);
					const nearWall =
						!free(cx, cy - 1) || !free(cx - 1, cy) || !free(cx + 1, cy);
					if (!nearWall || h > 0.33) continue;
					const x = cx * 16 + 8 + ((h * 17) % 4) - 2,
						y = cy * 16 + 8;
					const props =
						this.caveId === "root"
							? ["mushroom", "vines", "rock", "grass"]
							: this.caveId === "tide"
								? ["rock", "crystal", "bones", "pillar"]
								: ["rock", "bones", "pot", "crystal"];
					this.dress.push({
						kind: props[Math.floor(h * 193) % props.length],
						x,
						y,
						size: 0.45 + ((h * 7) % 1) * 0.4,
					});
				}
			for (const room of def.rooms || []) {
				const x = (room.x + room.w - 0.6) * 16,
					y = (room.y + 0.7) * 16;
				if (map.walkable(Math.floor(x / 16), Math.floor(y / 16)))
					this.dress.push({
						kind: room.purpose?.includes("guardian") ? "brazier" : "torch",
						x,
						y,
						size: 0.7,
					});
			}
		}
		update(dt, state, options = {}) {
			this.state = state;
			this.options = { ...this.options, ...options };
			this.visualTime += Math.max(0, dt);
			if (!state) return;
			if (this.options.title) {
				if (this.lastPhase !== "title") {
					this.game.setZoom(0.92);
					this.lastPhase = "title";
				}
				this.game.cam.bounds = null;
				this.game.focus(390, 325, 6);
				this.game.cam.smooth = 0.3;
				this.titleRig.o.weapon = "dt-bow";
				this.titlePartner.o.weapon = "dt-bow";
				this.titleRig._bowActive = false;
				this.titleRig.update(dt, {
					x: 445,
					y: 340,
					z: 0,
					facing: -0.7,
					pose: "dt-listen",
				});
				this.titlePartner.update(dt, {
					x: 473,
					y: 354,
					z: 0,
					facing: -0.9,
					pose: "hips",
				});
				return;
			}
			const phase = state.phase || "map";
			if (phase === "cave") {
				if (this.lastPhase !== "cave") {
					this.game.setZoom(1);
					this.lastPhase = "cave";
				}
				this._ensureMap(state);
				this.game.cam.smooth = 0.12;
				this.visibleCells = new Set(state.visible || []);
				this.fogCells = new Set(state.explored || []);
				if (this.fog) {
					this.fog.state.fill(0);
					for (const v of this.fogCells) this.fog.state[v] = 1;
					for (const v of this.visibleCells) this.fog.state[v] = 2;
					// Seeing a floor edge also reveals its facing rock. Gameplay LOS still uses the untouched visibility set.
					const m = this.map;
					for (let y = 0; y < m.h; y++)
						for (let x = 0; x < m.w; x++)
							if (m.cell(x, y) > 0) {
								let known = 0;
								for (const [dx, dy] of [
									[1, 0],
									[-1, 0],
									[0, 1],
									[0, -1],
								]) {
									const xx = x + dx,
										yy = y + dy;
									if (
										xx < 0 ||
										yy < 0 ||
										xx >= m.w ||
										yy >= m.h ||
										m.cell(xx, yy) !== 0
									)
										continue;
									known = Math.max(known, this.fog.state[yy * m.w + xx]);
								}
								this.fog.state[y * m.w + x] = known;
							}
				}
				if (this.fog)
					for (const gate of this.def.gates || []) {
						for (let yy = gate.cy; yy < gate.cy + gate.h; yy++)
							for (
								let xx = gate.cx - Math.floor(gate.w / 2);
								xx < gate.cx - Math.floor(gate.w / 2) + gate.w;
								xx++
							) {
								const i = yy * this.map.w + xx;
								if (this.fog.state[i] === 2) continue;
								const known = Math.max(
									this.fog.state[(yy - 1) * this.map.w + xx] || 0,
									this.fog.state[(yy + 1) * this.map.w + xx] || 0,
								);
								this.fog.state[i] = known;
							}
					}
				const players = state.players || [],
					alive = players.filter((p) => !p.down);
				const group = alive.length ? alive : players;
				if (group.length) {
					const lead = group[0],
						la = lead.aim || 0;
					this.game.focus(
						group.reduce((s, p) => s + p.x, 0) / group.length +
							Math.cos(la) * 18,
						group.reduce((s, p) => s + p.y, 0) / group.length +
							Math.sin(la) * 18,
						(state.enemies || []).some(
							(e) =>
								/guardian/.test(e.kind) &&
								this.visible(e.x, e.y) &&
								Math.hypot(e.x - lead.x, e.y - lead.y) < 180,
						)
							? 30
							: 15,
					);
				}
				this.game.lights.enabled = true;
				this.game.lights.ambient = 0.43;
				for (let i = 0; i < players.length; i++) {
					const p = players[i];
					let rig = this.rigs.get(p.id);
					if (!rig) {
						rig = ranger(i);
						this.rigs.set(p.id, rig);
					}
					rig._bowPull =
						p.bow === "draw"
							? clamp(1 - (p.draw || 0) / 0.18, 0, 1)
							: p.bow === "recover"
								? Math.max(0, 1 - (p.recover || 0) / 0.22)
								: 0;
					rig._bowActive = p.bow === "draw";
					rig._nockU =
						p.bow === "recover" ? clamp(1 - (p.recover || 0) / 0.22, 0, 1) : 0;
					const climbing = p.anim === "climb" && p.animTime > 0,
						hurting = p.anim === "hurt" && p.animTime > 0,
						reviving = players.some(
							(q) =>
								q.id !== p.id &&
								q.down &&
								q.revive > 0 &&
								Math.hypot(q.x - p.x, q.y - p.y) < 31,
						);
					const pose = p.down
						? "down"
						: p.anim === "pickup" || p.anim === "celebrate"
							? "cheer"
							: p.anim === "revive" || reviving
								? "kneel"
								: climbing || hurting || p.dash > 0
									? null
									: p.bow === "recover"
										? "dt-nock"
										: p.bow === "draw"
											? "dt-bow"
											: p.focus
												? "dt-listen"
												: "dt-bow";
					rig.update(dt, {
						x: p.x,
						y: p.y,
						z: p.z || 0,
						vx: p.vx || 0,
						vy: p.vy || 0,
						facing: p.aim || 0,
						pose,
						crouch: !!p.focus,
						sprint: Math.hypot(p.vx || 0, p.vy || 0) > 70,
						dash: (p.dash || 0) > 0,
						hurt: p.anim === "hurt" && p.animTime > 0,
						down: p.down ? 1 : 0,
						climb: climbing,
						vz: climbing ? 26 : 0,
						expr: p.down ? "wince" : p.bow === "draw" ? "angry" : null,
					});
				}
			} else {
				if (this.lastPhase !== "map") {
					this.game.setZoom(0.72);
					this.lastPhase = "map";
				}
				this.game.cam.bounds = null;
				this.game.cam.smooth = 0.25;
				this.game.focus(300, 235, 14);
				this.game.lights.enabled = true;
				this.game.lights.ambient = 0.65;
				this._positionNodes();
				const here = this.mapPositions[state.node] ||
					Object.values(this.mapPositions)[0] || { x: 150, y: 350 };
				let spot = here;
				const tr = state.transition;
				if (tr?.kind === "travel") {
					const dest = this.mapPositions[tr.to];
					if (dest) {
						const u = clamp((tr.time || 0) / (tr.duration || 1.3), 0, 1);
						spot = { x: lerp(here.x, dest.x, u), y: lerp(here.y, dest.y, u) };
					}
				}
				this.mapRanger = spot;
				const from = tr?.from || state.node,
					to = tr?.to,
					boat =
						tr?.kind === "travel" &&
						state.tools?.boat &&
						(tr.tool === "boat" || from === "river" || to === "river"),
					u = tr ? clamp((tr.time || 0) / (tr.duration || 1.3), 0, 1) : 0;
				this.boatTravel = boat
					? { progress: u, unfold: clamp(Math.min(u, 1 - u) / 0.16, 0.18, 1) }
					: null;
				this.titleRig.o.weapon = boat ? "dt-oar" : "dt-bow";
				this.titlePartner.o.weapon = this.titleRig.o.weapon;
				this.titlePartner.update(dt, {
					x: spot.x + 11,
					y: spot.y + 16,
					z: boat ? 3 : 0,
					facing: 0.8,
					vx: tr && !boat ? 30 : 0,
					vy: tr && !boat ? 20 : 0,
					crouch: boat,
					pose: phase === "victory" ? "cheer" : boat ? "dt-paddle" : "dt-bow",
				});
				this.titleRig.update(dt, {
					x: spot.x,
					y: spot.y + 10,
					z: boat ? 3 : 0,
					facing: 0.8,
					vx: tr && !boat ? 30 : 0,
					vy: tr && !boat ? 20 : 0,
					crouch: boat,
					pose: phase === "victory" ? "cheer" : boat ? "dt-paddle" : "dt-bow",
				});
			}
		}
		_positionNodes() {
			const nodes = globalThis.DTContent?.nodes || [];
			const list = Array.isArray(nodes) ? nodes : Object.values(nodes);
			const fall = [
				[115, 350],
				[205, 340],
				[280, 300],
				[352, 316],
				[420, 254],
				[485, 260],
				[532, 210],
				[591, 173],
				[639, 138],
				[346, 402],
			];
			list.forEach((n, i) => {
				const raw = Array.isArray(n.at) ? n.at : [n.x, n.y];
				let x = raw[0],
					y = raw[1];
				if (!(Number.isFinite(x) && Number.isFinite(y))) {
					[x, y] = fall[i % fall.length];
				} else if (x <= 1 && y <= 1) {
					x = 80 + x * 600;
					y = 80 + y * 350;
				} else if (x <= 20 && y <= 20) {
					x = 80 + x * 32;
					y = 80 + y * 26;
				} else {
					x = 70 + x * 0.5;
					y = 100 + y * 0.5;
				}
				this.mapPositions[n.id || String(i)] = { x, y, node: n };
			});
		}
		nodeScreen(id) {
			const p = this.mapPositions[id];
			return p ? this.game.r.w(p.x, p.y, 0) : null;
		}
		bowOrigin(player) {
			return WorldRenderer.bowOrigin(player);
		}
		static bowOrigin(p) {
			const a = p.aim || 0;
			return {
				x: p.x + Math.cos(a) * 9.15 - Math.sin(a) * 0.488,
				y: p.y + Math.sin(a) * 9.15 + Math.cos(a) * 0.488,
				z: (p.z || 0) + 21.96,
			};
		}
		visible(x, y) {
			if (this.options.debug?.fogReveal || this.state?.dev?.reveal) return true;
			if (!this.map) return true;
			return this.visibleCells.has(
				Math.floor(y / 16) * this.map.w + Math.floor(x / 16),
			);
		}
		seen(x, y) {
			if (this.options.debug?.fogReveal || this.state?.dev?.reveal) return true;
			if (!this.map) return true;
			const k = Math.floor(y / 16) * this.map.w + Math.floor(x / 16);
			return this.visibleCells.has(k) || this.fogCells.has(k);
		}
		draw(r, state = this.state, options = {}) {
			const opt = { ...this.options, ...options };
			if (!state) return;
			r.sky(["#08141d", "#152c33", "#263e3e"]);
			if (opt.title) return this._drawTitle(r, state);
			if (state.phase !== "cave") return this._drawMap(r, state, opt);
			this._drawCave(r, state, opt);
		}
		_drawTitle(r, _state) {
			const g = this.game,
				t = this.visualTime;
			this.titleBackdrop.draw(r);
			// A diorama floor rises into the distant mountain painting.
			this.landscape.drawFloor(r);
			const stones = [
				[535, 180, 70],
				[595, 200, 93],
				[640, 174, 106],
				[578, 150, 124],
				[618, 138, 143],
			];
			for (const [x, y, z] of stones) {
				r.shape("rock", x, y, 0, {
					params: { r: z * 0.4, sz: 1.7, seed: x },
					mats: { s: "#2c424b stones size=9" },
					shadow: true,
				});
			}
			r.shape("dt-gate", 580, 244, 0, {
				scale: 1.5,
				mats: { s: "slate", g: "copper" },
			});
			r.shape("dt-camp", 366, 339, 0, {
				scale: 0.85,
				mats: { c: "#9e9675 cloth", r: "leather", w: "oak" },
			});
			r.prop("brazier", 407, 365, 0, { size: 0.85, light: true });
			for (let i = 0; i < 42; i++) {
				const x = 170 + E.hash2(i, 82) * 500,
					y = 180 + E.hash2(i, 94) * 260;
				if (Math.abs(x - 410) < 75 && Math.abs(y - 350) < 55) continue;
				const h = 22 + E.hash2(i, 39) * 39;
				r.shape("pine", x, y, 0, {
					params: { h, tiers: 3 },
					mats: { l: i % 2 ? "#2b4840 foliage" : "#36564a foliage", b: "bark" },
					shadow: true,
				});
			}
			for (const [x, y] of [
				[442, 370],
				[486, 350],
				[318, 381],
				[531, 292],
			])
				r.shape("rock", x, y, 0, {
					params: { r: 5, seed: x },
					mats: { s: "slate" },
				});
			r.shape("dt-waystone", 452, 308, 0, { scale: 0.9 });
			r.shadow(445, 340, 6, 0.45);
			r.actor(445, 340, 0, (gg, x, y) => this.titleRig.draw(gg, x, y, r.view));
			r.shadow(473, 354, 6, 0.45);
			r.actor(473, 354, 0, (gg, x, y) =>
				this.titlePartner.draw(gg, x, y, r.view),
			);
			g.lights.enabled = true;
			g.lights.ambient = 0.56;
			g.lights.add(407, 365, 15, 115, 1.1 + Math.sin(t * 8) * 0.04, {
				color: "#efb978",
			});
			g.lights.add(585, 205, 70, 120, 0.6, { color: "#a5d8db" });
			r.overlay((gg) => {
				for (let i = 0; i < 24; i++) {
					const x = (i * 43 + t * 1.8) % r.W,
						y = r.H * 0.55 + Math.sin(i * 8.4 + t * 0.2) * r.H * 0.32;
					px.dot(gg, x, y, i % 3 ? "#839f8a" : "#d0bb80");
				}
				// Left-side vignetting makes the title card readable without a hard panel edge.
				for (let i = 0; i < 6; i++)
					px.blend(gg, 0.1, "normal", () =>
						px.rect(gg, 0, 0, r.W * (0.3 - i * 0.025), r.H, "#071116"),
					);
			});
		}
		_drawMap(r, state, _opt) {
			const t = state.time || this.visualTime;
			this.landscape.drawFloor(r);
			this._positionNodes();
			const nodes = Object.values(this.mapPositions),
				edges = globalThis.DTContent?.edges || [];
			r.decal((gg) => {
				for (const e of edges) {
					const a = this.mapPositions[e.from || e.a || e[0]],
						b = this.mapPositions[e.to || e.b || e[1]];
					if (!a || !b) continue;
					const A = r.w(a.x, a.y, 0),
						B = r.w(b.x, b.y, 0);
					px.line(gg, A[0], A[1], B[0], B[1], "#293d37", 5);
					px.line(
						gg,
						A[0],
						A[1],
						B[0],
						B[1],
						e.requires && !state.tools?.[e.requires] ? "#5c5748" : "#a38b61",
						2,
					);
				}
			});
			for (let i = 0; i < 55; i++) {
				const x = 70 + E.hash2(i, 17) * 630,
					y = 90 + E.hash2(i, 33) * 400;
				if (nodes.some((p) => Math.hypot(p.x - x, p.y - y) < 31)) continue;
				r.shape(i % 6 === 0 ? "rock" : "pine", x, y, 0, {
					params:
						i % 6 === 0
							? { r: 9, sz: 1.1, seed: i }
							: { h: 18 + E.hash2(i, 7) * 15, tiers: 3 },
					mats:
						i % 6 === 0 ? { s: "slate" } : { l: "#3e5a47 foliage", b: "bark" },
					scale: 1,
				});
			}
			for (const p of nodes) {
				const n = p.node,
					id = n.id || "",
					isCurrent = state.node === id,
					cleared =
						(state.cleared || []).includes?.(id) ||
						state.completed?.includes?.(n.cave),
					locked = n.requires && !state.tools?.[n.requires];
				const shape = /camp/.test(id)
					? "dt-camp"
					: /gate|wall/.test(id)
						? "dt-gate"
						: /river|ford/.test(id)
							? "dt-boat"
							: /summit|crown/.test(id)
								? "dt-obelisk"
								: n.cave
									? "rock"
									: "dt-waystone";
				r.shape(shape, p.x, p.y, 0, {
					scale: n.cave ? 1.4 : 0.85,
					params: { r: 19, sz: 1.5, seed: id.length },
					mats:
						shape === "rock"
							? {
									s:
										n.cave === "root"
											? "#536752 stones"
											: n.cave === "tide"
												? "#596d78 stones"
												: "#7b7869 stones",
								}
							: undefined,
				});
				if (n.kind === "forest") {
					if (state.tools?.axe) {
						for (let j = 0; j < 3; j++)
							r.shape("rock", p.x + (j - 1) * 9, p.y - 4, 0, {
								params: { r: 3, sz: 0.45, seed: j },
								mats: { s: "oak" },
							});
					} else
						for (const dx of [-9, 2, 12])
							r.shape("pine", p.x + dx, p.y - 4, 0, {
								params: { h: 21, tiers: 3 },
								mats: { l: "#4e6450 foliage", b: "bark" },
							});
				}
				r.overlay((g) => {
					const q = r.w(p.x, p.y + 15, 0),
						label = id.toUpperCase();
					const ww = E.font.width(label) + 8;
					px.blend(g, 0.7, "normal", () =>
						px.rect(g, q[0] - ww / 2, q[1] - 1, ww, 10, "#101e21"),
					);
					E.font.text(
						g,
						label,
						q[0],
						q[1],
						locked ? "#a7977c" : isCurrent ? "#f2dcaa" : "#c4cbbb",
						{ align: "center", outline: false, shadow: "#10191d" },
					);
					if (locked) {
						const k = r.w(p.x - 12, p.y, 20);
						px.rect(g, k[0] - 2, k[1], 5, 4, "#bda16c");
						px.line(g, k[0] - 1, k[1], k[0] - 1, k[1] - 3, "#bda16c");
						px.line(g, k[0] - 1, k[1] - 3, k[0] + 1, k[1] - 3, "#bda16c");
						px.line(g, k[0] + 1, k[1] - 3, k[0] + 1, k[1], "#bda16c");
					}
				});
				if (isCurrent) {
					r.groundRing(p.x, p.y, 18, "#f1d59a", 0.9);
					r.groundRing(p.x, p.y, 20 + Math.sin(t * 3), "#7a9b8a", 0.55);
				}
				if (cleared) {
					r.prop("lantern", p.x + 11, p.y + 4, 0, { size: 0.65, light: true });
				}
			}
			const p = this.mapRanger ||
				this.mapPositions[state.node] ||
				nodes[0] || { x: 150, y: 350 };
			if (this.boatTravel) {
				const unfold = this.boatTravel.unfold;
				r.shape("dt-boat", p.x, p.y + 10, 1 + Math.sin(t * 4) * 0.4, {
					scale: 1.2 * unfold,
					facing: 0.8,
				});
				r.groundRing(p.x, p.y + 10, 13 + ((t * 9) % 8), "#a5c4bd", 0.28);
			}
			r.shadow(p.x, p.y + 10, 6, 0.5);
			r.actor(p.x, p.y + 10, this.boatTravel ? 3 : 0, (g, x, y) =>
				this.titleRig.draw(g, x, y, r.view),
			);
			if ((state.players || []).length > 1) {
				r.shadow(p.x + 11, p.y + 16, 6, 0.4);
				r.actor(p.x + 11, p.y + 16, this.boatTravel ? 3 : 0, (g, x, y) =>
					this.titlePartner.draw(g, x, y, r.view),
				);
			}
			this.game.lights.add(p.x, p.y + 10, 24, 85, 0.8, { color: "#f2ca8e" });
			if (state.tools?.axe) {
				for (let j = 0; j < 3; j++)
					r.shape("rock", 300 + j * 11, 302, 0, {
						params: { r: 2, sz: 0.5, seed: j },
						mats: { s: "oak" },
					});
			}
			if (state.tools?.boat)
				r.shape("dt-boat", 384, 288, 1, { scale: 1.15, facing: 0.3 });
			if (state.phase === "victory") {
				r.shape("dt-relic", p.x + 8, p.y + 1, 31 + Math.sin(t * 2) * 2, {
					scale: 1.4,
				});
				this.game.lights.add(p.x, p.y, 34, 135, 1.35, { color: "#ffe5a6" });
				for (let j = 0; j < 25; j++) {
					const a = j * 2.4 + t * 0.2,
						rad = 20 + (j % 7) * 5;
					r.queue(
						p.x,
						p.y,
						0,
						(g) => {
							const q = r.w(
								p.x + Math.cos(a) * rad,
								p.y + Math.sin(a) * rad,
								12 + ((j * 7 + t * 13) % 70),
							);
							px.disc(g, q[0], q[1], j % 3 ? 1 : 2, "#e7d39b");
						},
						{ emissive: true, bias: 10 },
					);
				}
			}
		}
		_drawCave(r, state, opt) {
			if (!this.map) return;
			const m = this.map,
				pal = this.palette,
				t = state.time || 0,
				def = this.def;
			m.drawFloor(r);
			m.queueWalls(r);
			for (const d of this.dress) {
				if (!this.seen(d.x, d.y)) continue;
				r.prop(d.kind, d.x, d.y, 0, {
					size: d.size,
					light:
						this.visible(d.x, d.y) &&
						["torch", "brazier", "crystal"].includes(d.kind),
					color: d.kind === "crystal" ? pal.glow : undefined,
				});
			}
			for (const d of def.props || []) {
				if (!this.seen(d.x, d.y)) continue;
				this._prop(r, d);
			}
			r.decal((g) => {
				for (const track of def.tracks || []) {
					const x = track.x ?? ((track.from?.[0] ?? 0) + 0.5) * 16,
						y = track.y ?? ((track.from?.[1] ?? 0) + 0.5) * 16;
					if (!this.seen(x, y)) continue;
					const a =
						track.aim ??
						track.angle ??
						Math.atan2(
							(track.to?.[1] ?? 0) - (track.from?.[1] ?? 0),
							(track.to?.[0] ?? 0) - (track.from?.[0] ?? 0),
						);
					for (let j = 0; j < 4; j++) {
						const off = (j - 1.5) * 3.7,
							sd = j % 2 ? 1 : -1,
							X = x + Math.cos(a) * off - Math.sin(a) * sd * 1.7,
							Y = y + Math.sin(a) * off + Math.cos(a) * sd * 1.7,
							q = r.w(X, Y, 0.1);
						px.ell(g, q[0], q[1], 1.4, 0.7, "#a49a7e");
						px.dot(g, q[0] + 1, q[1] - 1, pal.deep);
					}
				}
				for (const room of def.rooms || []) {
					const x = (room.x + room.w * 0.5) * 16,
						y = (room.y + room.h * 0.5) * 16;
					if (!this.seen(x, y)) continue;
					if (room.purpose?.includes("guardian")) {
						r.groundRing(x, y, 24, pal.moss, 0.2);
					}
				}
			});
			this._drawGates(r, state);
			this._drawBankLaunch(r, state);
			for (const bank of def.banks || []) {
				const a = bank.a || [bank.x1, bank.y1],
					b = bank.b || [bank.x2, bank.y2];
				if (
					!Number.isFinite(a[0]) ||
					!this.seen((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
				)
					continue;
				const x = (a[0] + b[0]) / 2,
					y = (a[1] + b[1]) / 2;
				r.queue(
					x,
					y,
					0,
					(g) => {
						const A = r.w(a[0], a[1], 0),
							B = r.w(b[0], b[1], 0),
							C = r.w(b[0], b[1], 7),
							D = r.w(a[0], a[1], 7);
						px.poly(g, [A, B, C, D], "#565b63");
						px.line(g, D[0], D[1], C[0], C[1], "#d2cfb5", 3);
						px.line(g, D[0], D[1] - 1, C[0], C[1] - 1, "#f3dfa8");
						const mid = r.w(x, y, 9);
						px.poly(
							g,
							[
								[mid[0] - 3, mid[1]],
								[mid[0], mid[1] + 2],
								[mid[0] + 3, mid[1]],
								[mid[0], mid[1] - 2],
							],
							"#c3a465",
						);
					},
					{ bias: 0.05 },
				);
			}
			if (def.exit && this.seen(def.exit.x, def.exit.y)) {
				r.shape("dt-ladder", def.exit.x, def.exit.y, 0, { scale: 1 });
				this.game.lights.add(def.exit.x, def.exit.y, 24, 45, 0.8, {
					color: pal.glow,
				});
			}
			for (const item of state.pickups || []) {
				if (
					(item.count !== undefined && item.count <= 0) ||
					item.taken ||
					!this.seen(item.x, item.y)
				)
					continue;
				const k = item.kind || item.type,
					loose = k === "arrow",
					shape =
						k === "axe"
							? "dt-axe"
							: k === "boat"
								? "dt-boat"
								: k === "key"
									? "dt-key"
									: k?.includes("half")
										? "dt-relic"
										: k === "treasure"
											? "chest"
											: k === "arrows"
												? "dt-quiver"
												: null;
				const bob =
					shape && shape !== "chest" && shape !== "dt-quiver"
						? Math.sin(t * 2 + item.x) * 1
						: 0;
				if (shape) {
					r.shape(shape, item.x, item.y, bob, {
						scale: k === "boat" ? 0.7 : 0.8,
						shadow: true,
					});
				} else {
					r.queue(
						item.x,
						item.y,
						0,
						(g) => {
							const A = r.w(item.x - 4, item.y, 1.2),
								B = r.w(item.x + 4, item.y, 1.2);
							px.line(
								g,
								A[0],
								A[1],
								B[0],
								B[1],
								loose ? "#e3c997" : "#b8d5a1",
								1,
							);
							px.dot(g, B[0], B[1], "#f1f7da");
						},
						{ emissive: true },
					);
				}
				if (this.visible(item.x, item.y)) {
					this.game.lights.add(item.x, item.y, 8, 24, 0.35, {
						color: "#e4c38d",
					});
					r.groundRing(
						item.x,
						item.y,
						7 + Math.sin(t * 3) * 0.8,
						"#c4ba8d",
						0.32,
					);
				}
			}
			for (const e of state.enemies || []) {
				if (!this.visible(e.x, e.y)) continue;
				const dead = e.state === "defeated" || e.hp <= 0,
					kind = canonical(e.kind || "rat");
				if (dead && e.defeatedAt !== undefined && t - e.defeatedAt > 2.2)
					continue;
				r.shadow(
					e.x,
					e.y,
					kind === "ember" || kind === "rime"
						? 17
						: kind === "drake"
							? 10
							: kind === "bat"
								? 6
								: 5,
					dead ? 0.2 : 0.47,
				);
				if (e.state === "windup" || e.state === "attack")
					this._telegraph(r, e, t);
				r.actor(
					e.x,
					e.y,
					e.z || 0,
					(g, x, y) => drawCreature(g, x, y, r.view, e, t),
					{
						flash: e.state === "stunned" ? "#f8e3b4" : undefined,
						flashMix: 0.35,
						alpha: dead
							? kind === "rime"
								? Math.max(0, 1 - (t - (e.defeatedAt || t)) / 2.2)
								: 0.58
							: 1,
					},
				);
				if (dead && (kind === "ember" || kind === "rime")) {
					const age = t - (e.defeatedAt ?? t),
						cold = kind === "rime",
						color = cold ? "#c2eaf2" : "#e8b57a";
					r.groundRing(
						e.x,
						e.y,
						12 + age * 19,
						color,
						Math.max(0, 0.6 - age * 0.25),
					);
					this.game.lights.add(e.x, e.y, 20, 70, Math.max(0, 1.5 - age * 0.7), {
						color,
					});
					for (let j = 0; j < 16; j++)
						r.queue(
							e.x,
							e.y,
							0,
							(g) => {
								const a = j * 2.4,
									rad = 9 + age * (cold ? 19 : 6),
									q = r.w(
										e.x + Math.cos(a) * rad,
										e.y + Math.sin(a) * rad,
										5 + (j % 5) * 3 + age * (cold ? 18 : 25),
									);
								if (cold)
									px.poly(
										g,
										[
											[q[0], q[1] - 3],
											[q[0] + 1, q[1]],
											[q[0], q[1] + 2],
											[q[0] - 1, q[1]],
										],
										color,
									);
								else px.disc(g, q[0], q[1], j % 3 ? 1 : 2, color);
							},
							{ emissive: true, bias: 5 },
						);
				}
				if (!dead && (kind === "ember" || kind === "rime"))
					r.overlay((g) => {
						const q = r.w(e.x, e.y, (e.z || 0) + 47);
						for (let j = 0; j < 3; j++) {
							px.rect(
								g,
								q[0] - 8 + j * 6,
								q[1],
								4,
								2,
								j < (e.hp || 0) ? "#e7c88b" : "#554f54",
							);
						}
					});
			}
			for (let i = 0; i < (state.players || []).length; i++) {
				const p = state.players[i],
					rig = this.rigs.get(p.id);
				if (!rig) continue;
				this.game.lights.add(p.x, p.y, 22, p.focus ? 92 : 73, 1.05, {
					color: pal.glow,
				});
				r.shadow(p.x, p.y, 5.5, 0.5);
				if (p.dash > 0) {
					r.groundRing(p.x, p.y, 8, "#d6d6af", 0.5);
				}
				r.actor(p.x, p.y, p.z || 0, (g, x, y) => rig.draw(g, x, y, r.view), {
					xray: { color: "#e7dbaa", outline: "#e6ce98" },
					flash: p.anim === "hurt" && p.animTime > 0 ? "#f4ceaa" : undefined,
					flashMix: 0.4,
					alpha: p.invuln > 0 && Math.floor(t * 12) % 2 ? 0.75 : 1,
				});
				if (!p.down && state.phase === "cave") {
					const a = p.aim || 0,
						O = WorldRenderer.bowOrigin(p),
						dist = p.focus ? 35 : 25;
					r.queue(
						p.x,
						p.y,
						p.z || 0,
						(g) => {
							const A = r.w(O.x, O.y, O.z),
								B = r.w(
									O.x + Math.cos(a) * dist,
									O.y + Math.sin(a) * dist,
									O.z,
								),
								Q = r.w(
									O.x + Math.cos(a) * (dist + 4),
									O.y + Math.sin(a) * (dist + 4),
									O.z,
								);
							px.blend(g, p.focus ? 0.7 : 0.4, "normal", () =>
								px.line(g, A[0], A[1], B[0], B[1], "#efe5bf"),
							);
							const rad = p.bow === "draw" ? 2 : 1.4;
							px.line(g, Q[0] - rad, Q[1], Q[0] + rad, Q[1], "#f1dfaa");
							px.line(g, Q[0], Q[1] - rad, Q[0], Q[1] + rad, "#f1dfaa");
						},
						{ emissive: true, bias: 1.1 },
					);
				}
			}
			for (const arrow of state.arrows || []) {
				if (!this.seen(arrow.x, arrow.y)) continue;
				const a = Math.atan2(arrow.vy || 0, arrow.vx || 1),
					z = arrow.z ?? 21.96;
				this.game.lights.add(arrow.x, arrow.y, z, 27, 0.9, {
					color: "#ffe2a1",
				});
				r.queue(
					arrow.x,
					arrow.y,
					z,
					(g) => {
						const A = r.w(
								arrow.x - Math.cos(a) * 6,
								arrow.y - Math.sin(a) * 6,
								z,
							),
							B = r.w(arrow.x + Math.cos(a) * 3, arrow.y + Math.sin(a) * 3, z);
						px.line(g, A[0], A[1], B[0], B[1], "#f4dfa5");
						px.dot(g, B[0], B[1], "#fff9dc");
						px.dot(g, A[0] - Math.sin(a), A[1] + Math.cos(a), "#9aaf9a");
					},
					{ emissive: true, bias: 0.4 },
				);
			}
			for (const event of state.events || []) {
				const age = t - (event.time ?? t);
				if (
					age < 0 ||
					age > 0.7 ||
					!Number.isFinite(event.x) ||
					!this.visible(event.x, event.y)
				)
					continue;
				if (/hit|bank|wound|defeat|pickup/.test(event.type)) {
					r.queue(
						event.x,
						event.y,
						0,
						(g) => {
							const q = r.w(event.x, event.y, 10);
							for (let j = 0; j < 6; j++) {
								const a = (j * TAU) / 6 + age,
									rr = 3 + age * 14;
								px.line(
									g,
									q[0] + Math.cos(a) * rr * 0.6,
									q[1] + Math.sin(a) * rr * 0.6,
									q[0] + Math.cos(a) * rr,
									q[1] + Math.sin(a) * rr,
									"#f3d397",
									1,
								);
							}
						},
						{ emissive: true, bias: 5 },
					);
				}
			}
			this._ambient(r, state);
			if (!opt.debug?.fogReveal && !state.dev?.reveal && this.fog)
				this.fog.draw(r, 16, {
					height: (x, y) => m.height(x, y),
					dim: 0.74,
					color: "#080e16",
				});
			this._partyTether(r, state);
			if (opt.debug) this._debug(r, state, opt.debug);
		}
		_drawBankLaunch(r, state) {
			const mark = this.def.bankLaunch;
			if (!mark || state.flags?.bankLesson || !this.seen(mark.x, mark.y))
				return;
			r.decal((g) => {
				const P = (x, y) => r.w(x, y, 0.25),
					O = P(mark.x, mark.y),
					X = P(mark.x + mark.ax * 22, mark.y + mark.ay * 22),
					nx = -mark.ay,
					ny = mark.ax;
				px.blend(g, 0.8, "normal", () => {
					px.line(g, O[0], O[1], X[0], X[1], "#e5d5a8", 2);
					for (const side of [-1, 1]) {
						const A = P(
								mark.x + nx * side * 5 - mark.ax * 4,
								mark.y + ny * side * 5 - mark.ay * 4,
							),
							B = P(
								mark.x + nx * side * 5 + mark.ax * 4,
								mark.y + ny * side * 5 + mark.ay * 4,
							);
						px.line(g, A[0], A[1], B[0], B[1], "#f5e7c0", 2);
					}
					const A = P(
							mark.x + mark.ax * 17 + nx * 3,
							mark.y + mark.ay * 17 + ny * 3,
						),
						B = P(
							mark.x + mark.ax * 17 - nx * 3,
							mark.y + mark.ay * 17 - ny * 3,
						);
					px.line(g, X[0], X[1], A[0], A[1], "#f6e9c5");
					px.line(g, X[0], X[1], B[0], B[1], "#f6e9c5");
				});
			});
			if (
				(state.players || []).some(
					(p) =>
						!p.down && Math.hypot(p.x - mark.x, p.y - mark.y) <= mark.radius,
				)
			)
				r.overlay((g) => {
					const q = r.w(mark.x, mark.y, 0),
						text = "Bank from the pale notch",
						w = E.font.width(text) + 12;
					E.ui.box(g, q[0] - w / 2, q[1] + 17, w, 16, {
						bg: "#15251f",
						border: "#8d9674",
						alpha: 0.9,
					});
					E.font.text(g, text, q[0], q[1] + 21, "#f0e1b4", {
						align: "center",
						outline: false,
					});
				});
		}
		_drawGates(r, state) {
			for (const gate of this.def.gates || []) {
				const x0 = (gate.cx - Math.floor(gate.w / 2)) * 16,
					x1 = x0 + gate.w * 16,
					y = (gate.cy + 0.5) * 16,
					x = (x0 + x1) / 2,
					open = !!state.flags?.[gate.requires];
				if (!this.seen(x, y - 16) && !this.seen(x, y + 16) && !this.seen(x, y))
					continue;
				r.queue(
					x,
					y,
					0,
					(g) => {
						const P = (xx, yy, z) => r.w(xx, yy, z),
							line = (a, b, c, w) => px.line(g, a[0], a[1], b[0], b[1], c, w);
						if (open) {
							for (let j = 0; j < 6; j++) {
								const yy = y - 8 + j * 3;
								line(
									P(x0, yy, 1),
									P(x1, yy, 1),
									j % 2 ? "#847753" : "#a08c61",
									3,
								);
								line(P(x0, yy, 2), P(x1, yy, 2), "#b4a57a", 1);
							}
							for (const xx of [x0, x1]) {
								line(P(xx, y - 8, 1), P(xx, y + 9, 1), "#8c9b69", 3);
							}
						} else {
							for (let j = 0; j < 7; j++) {
								const z = 3 + j * 3,
									mid = P(x, y + (j % 2 ? 2 : -2), z + Math.sin(j) * 2);
								line(P(x0, y, z), mid, "#293d2f", 6);
								line(mid, P(x1, y, z), "#293d2f", 6);
								line(P(x0, y - 1, z + 1), mid, "#65764e", 3);
								line(mid, P(x1, y - 1, z + 1), "#65764e", 3);
							}
							for (let j = 0; j < 8; j++) {
								const A = P(x0 + j * 6, y, 15 + (j % 3)),
									B = P(x0 + j * 6 + 3, y, 21 + (j % 4));
								line(A, B, "#aab07e", 1);
							}
						}
					},
					{ bias: 0.1 },
				);
				if (!open)
					r.overlay((g) => {
						const q = r.w(x, y, 28);
						E.font.text(g, "RING THE GONG", q[0], q[1], "#d9dca4", {
							align: "center",
							shadow: "#10221b",
							outline: false,
						});
					});
			}
		}
		_partyTether(r, state) {
			const p = (state.players || []).filter((p) => !p.down);
			if (p.length !== 2) return;
			const [a, b] = p,
				distance = Math.hypot(a.x - b.x, a.y - b.y);
			if (distance <= 180) return;
			const pulse =
					0.45 + (distance > 230 ? 0.22 * Math.sin((state.time || 0) * 7) : 0),
				color = "#d8bc7d";
			r.decal((g) => {
				const A = r.w(a.x, a.y, 0.4),
					B = r.w(b.x, b.y, 0.4);
				px.blend(g, pulse, "normal", () =>
					px.line(g, A[0], A[1], B[0], B[1], color, 1),
				);
			});
			r.overlay((g) => {
				const q = r.w((a.x + b.x) / 2, (a.y + b.y) / 2, 20),
					text = "Stay within lantern range",
					w = E.font.width(text) + 12,
					x = clamp(q[0], w / 2 + 4, r.W - w / 2 - 4),
					y = clamp(q[1], 35, r.H - 35);
				E.ui.box(g, x - w / 2, y - 5, w, 17, {
					bg: "#101c20",
					border: "#806f4c",
					alpha: 0.9,
				});
				E.font.text(g, text, x, y, color, {
					align: "center",
					outline: false,
					shadow: "#071114",
				});
			});
		}
		_prop(r, d) {
			const kind = d.kind || d.type || "rock",
				known = {
					ladder: "dt-ladder",
					boat: "dt-boat",
					crown: "dt-relic",
					altar: "dt-moonwell",
					cairn: "dt-waystone",
					bell: "dt-bell",
					gong: "dt-gong",
					target: "dt-target",
					books: "dt-books",
				};
			if (known[kind]) {
				r.shape(known[kind], d.x, d.y, d.z || 0, {
					scale: d.size || 0.8,
					shadow: true,
				});
				return;
			}
			r.prop(kind, d.x, d.y, d.z || 0, {
				size: d.size || 0.8,
				light: this.visible(d.x, d.y),
				color: d.color,
			});
		}
		_telegraph(r, e, _t) {
			const kind = canonical(e.kind || ""),
				a = e.attackDir ?? e.aim ?? 0,
				wind = e.state === "windup",
				length =
					kind === "ember" || kind === "rime" ? 90 : kind === "drake" ? 72 : 36,
				w = kind === "ember" || kind === "rime" ? 11 : 7;
			r.decal((g) => {
				const nx = -Math.sin(a) * w,
					ny = Math.cos(a) * w,
					dx = Math.cos(a) * length,
					dy = Math.sin(a) * length;
				const pts = [
					[e.x + nx, e.y + ny],
					[e.x + dx + nx, e.y + dy + ny],
					[e.x + dx - nx, e.y + dy - ny],
					[e.x - nx, e.y - ny],
				].map((q) => r.w(q[0], q[1], 0.2));
				px.polyDither(
					g,
					pts,
					kind === "rime" ? "#b3d4e2" : "#e6ac72",
					wind ? 0.22 : 0.45,
					r.ix,
					r.iy,
				);
				const A = r.w(e.x, e.y, 0.3),
					B = r.w(e.x + dx, e.y + dy, 0.3);
				px.line(g, A[0], A[1], B[0], B[1], wind ? "#d9c99d" : "#fbe1ae", 1);
			});
		}
		_ambient(r, state) {
			const t = state.time || 0,
				pal = this.palette,
				p = (state.players || [])[0];
			if (!p) return;
			for (let j = 0; j < 10; j++) {
				const x =
						p.x + (E.hash2(j, 91) - 0.5) * 150 + Math.sin(t * 0.2 + j) * 3,
					y = p.y + (E.hash2(j, 27) - 0.5) * 140;
				if (!this.visible(x, y)) continue;
				r.queue(
					x,
					y,
					0,
					(g) => {
						const q = r.w(x, y, 5 + ((t * 2 + j * 7) % 28));
						px.dot(g, q[0], q[1], j % 3 ? E.shade(pal.dust, -0.4) : pal.dust);
					},
					{ emissive: j % 4 === 0, bias: 1 },
				);
			}
		}
		debugData(state, debug) {
			const m = this.map,
				sim = this.sim,
				def = this.def,
				data = { collision: null, navigation: null, hearing: [], los: null };
			if (!m || !def) return data;
			const wall = (x, y) => (sim?.wall ? sim.wall(x, y) : m.cell(x, y) !== 0),
				center = (x, y) => ({ x: x * 16 + 8, y: y * 16 + 8 }),
				known = (x, y) => debug.fogReveal || this.seen(x, y),
				seenCell = (x, y) => known(x * 16 + 8, y * 16 + 8),
				creatures = globalThis.DTContent.creatures;
			if (debug.collision) {
				const edges = [],
					banks = [],
					actors = [];
				for (let y = 0; y < m.h; y++)
					for (let x = 0; x < m.w; x++)
						if (wall(x, y)) {
							const x0 = x * 16,
								y0 = y * 16;
							for (const [dx, dy, a, b] of [
								[1, 0, [x0 + 16, y0], [x0 + 16, y0 + 16]],
								[-1, 0, [x0, y0 + 16], [x0, y0]],
								[0, 1, [x0 + 16, y0 + 16], [x0, y0 + 16]],
								[0, -1, [x0, y0], [x0 + 16, y0]],
							])
								if (!wall(x + dx, y + dy) && seenCell(x + dx, y + dy))
									edges.push({ a, b, kind: "wall" });
						}
				for (const bank of def.banks || [])
					if (known((bank.a[0] + bank.b[0]) / 2, (bank.a[1] + bank.b[1]) / 2))
						banks.push({ a: bank.a, b: bank.b, thickness: 3, id: bank.id });
				for (const p of state.players || [])
					actors.push({ x: p.x, y: p.y, r: 5, id: p.id, kind: "ranger" });
				for (const e of state.enemies || [])
					if (e.hp > 0 && (debug.fogReveal || this.visible(e.x, e.y)))
						actors.push({
							x: e.x,
							y: e.y,
							r: Math.min(creatures[e.kind]?.r || 5, 8),
							id: e.id,
							kind: e.kind,
						});
				data.collision = { edges, banks, actors };
			}
			if (debug.navigation) {
				const edges = [],
					pass = (x, y) =>
						!wall(x, y) &&
						(!sim?.clearAt || sim.clearAt(x * 16 + 8, y * 16 + 8, 5));
				for (let y = 0; y < m.h; y++)
					for (let x = 0; x < m.w; x++)
						if (seenCell(x, y) && pass(x, y))
							for (const [dx, dy] of [
								[1, 0],
								[0, 1],
							])
								if (x + dx < m.w && y + dy < m.h && pass(x + dx, y + dy)) {
									const a = center(x, y),
										b = center(x + dx, y + dy);
									if (!sim?.moveClear || sim.moveClear(a, b, 5))
										edges.push({ a: [a.x, a.y], b: [b.x, b.y] });
								}
				const hero = (state.players || []).find((p) => !p.down),
					path = hero && sim?.path ? sim.path(hero, def.exit) : [];
				data.navigation = {
					edges,
					path: hero && path.length ? [{ x: hero.x, y: hero.y }, ...path] : [],
					blocked: !path.length,
					goal: { x: def.exit.x, y: def.exit.y },
				};
			}
			if (debug.hearing && sim?.acoustic && sim?.path) {
				const hearing = sim.tunables?.hearing ?? 1;
				for (const e of state.enemies || []) {
					if (
						e.hp <= 0 ||
						e.kind === "target" ||
						(!debug.fogReveal && !this.visible(e.x, e.y))
					)
						continue;
					const spec = creatures[e.kind];
					const candidates = [];
					for (const n of state.noise || []) {
						const age = state.time - n.time;
						if (
							n.owner === null ||
							age < 0 ||
							age > Math.min(n.life ?? 1.6, 1.6)
						)
							continue;
						const distance = sim.acoustic(e, n, 360),
							strength = Number.isFinite(distance)
								? (n.loudness * hearing) / (1 + distance / 70)
								: 0,
							tutorialGate =
								e.tutorial &&
								!(state.flags?.firstShot && state.flags?.recovered),
							eligible =
								!tutorialGate &&
								["dormant", "investigate", "alert"].includes(e.state),
							consumed = n.id <= (e.heard || 0),
							audible = strength > spec.hearing,
							path = Number.isFinite(distance) ? sim.path(e, n) : [];
						candidates.push({
							enemy: e.id,
							kind: e.kind,
							noise: n.id,
							noiseKind: n.kind,
							origin: { x: e.x, y: e.y },
							target: { x: n.x, y: n.y },
							distance,
							strength,
							threshold: spec.hearing,
							eligible,
							consumed,
							audible,
							status: !Number.isFinite(distance)
								? "BLOCKED"
								: tutorialGate
									? "LESSON"
									: consumed
										? "ACK"
										: !eligible
											? "BUSY"
											: audible
												? "HEARD"
												: "QUIET",
							path: [{ x: e.x, y: e.y }, ...path, { x: n.x, y: n.y }],
						});
					}
					candidates.sort(
						(a, b) => b.strength - a.strength || b.noise - a.noise,
					);
					if (candidates.length) data.hearing.push(candidates[0]);
				}
			}
			if (debug.los) {
				const visible = new Set(state.visible || []),
					boundary = [],
					rays = [],
					radius =
						sim?.tunables?.vision ??
						globalThis.DTConfig?.defaults?.vision ??
						108;
				for (const i of visible) {
					const x = i % m.w,
						y = Math.floor(i / m.w),
						x0 = x * 16,
						y0 = y * 16;
					for (const [dx, dy, a, b] of [
						[1, 0, [x0 + 16, y0], [x0 + 16, y0 + 16]],
						[-1, 0, [x0, y0 + 16], [x0, y0]],
						[0, 1, [x0 + 16, y0 + 16], [x0, y0 + 16]],
						[0, -1, [x0, y0], [x0 + 16, y0]],
					])
						if (
							!visible.has((y + dy) * m.w + x + dx) ||
							x + dx < 0 ||
							x + dx >= m.w ||
							y + dy < 0 ||
							y + dy >= m.h
						)
							boundary.push({ a, b });
				}
				for (const p of state.players || [])
					if (!p.down)
						for (let j = 0; j < 24; j++) {
							const a = (j * TAU) / 24,
								dx = Math.cos(a),
								dy = Math.sin(a);
							let distance = 0;
							for (let d = 2; d <= radius; d += 2) {
								const x = p.x + dx * d,
									y = p.y + dy * d;
								if (
									sim?.lineClear
										? !sim.lineClear(p.x, p.y, x, y)
										: wall(Math.floor(x / 16), Math.floor(y / 16))
								)
									break;
								distance = d;
							}
							rays.push({
								a: [p.x, p.y],
								b: [p.x + dx * distance, p.y + dy * distance],
								radius,
								distance,
							});
						}
				data.los = { boundary, rays, radius, cells: visible.size };
			}
			return data;
		}
		_debug(r, state, debug) {
			if (!debug.collision && !debug.navigation && !debug.hearing && !debug.los)
				return;
			const data = this.debugData(state, debug),
				legends = [];
			r.overlay((g) => {
				const line = (a, b, color, width = 1) => {
						const A = r.w(a[0], a[1], 0.7),
							B = r.w(b[0], b[1], 0.7);
						px.line(g, A[0], A[1], B[0], B[1], color, width);
					},
					circle = (a, color) => {
						const pts = [];
						for (let j = 0; j <= 24; j++) {
							const v = (j * TAU) / 24;
							pts.push([a.x + Math.cos(v) * a.r, a.y + Math.sin(v) * a.r]);
						}
						for (let j = 0; j < 24; j++) line(pts[j], pts[j + 1], color);
					};
				if (data.collision) {
					const c = data.collision;
					for (const e of c.edges) line(e.a, e.b, "#f2a197", 2);
					for (const e of c.banks) {
						line(e.a, e.b, "#f2c88e", 3);
						const dx = e.b[0] - e.a[0],
							dy = e.b[1] - e.a[1],
							len = Math.hypot(dx, dy) || 1,
							nx = (-dy / len) * 1.5,
							ny = (dx / len) * 1.5;
						for (const sd of [-1, 1])
							line(
								[e.a[0] + nx * sd, e.a[1] + ny * sd],
								[e.b[0] + nx * sd, e.b[1] + ny * sd],
								"#f8e5bd",
							);
					}
					for (const a of c.actors)
						circle(a, a.kind === "ranger" ? "#a1eddf" : "#f1b8af");
					legends.push("COLLISION: wall edges / 3u banks / actor feet");
				}
				if (data.navigation) {
					const n = data.navigation;
					px.blend(g, 0.45, "normal", () => {
						for (const e of n.edges) line(e.a, e.b, "#7fbf9a");
					});
					for (let j = 1; j < n.path.length; j++)
						line(
							[n.path[j - 1].x, n.path[j - 1].y],
							[n.path[j].x, n.path[j].y],
							"#dcefb5",
							2,
						);
					const goal = r.w(n.goal.x, n.goal.y, 1);
					px.rect(g, goal[0] - 2, goal[1] - 2, 5, 5, "#e6f5b7");
					legends.push(
						"NAV: free centers + " +
							(n.blocked
								? "no current route to ladder"
								: `${n.path.length} steps to ladder`),
					);
				}
				if (debug.hearing) {
					for (const h of data.hearing) {
						const col = h.audible ? "#e5b7ef" : "#977d9c";
						if (Number.isFinite(h.distance))
							for (let j = 1; j < h.path.length; j++)
								line(
									[h.path[j - 1].x, h.path[j - 1].y],
									[h.path[j].x, h.path[j].y],
									col,
								);
						const q = r.w(h.origin.x, h.origin.y, 36),
							text =
								h.kind +
								" " +
								h.status +
								" " +
								h.strength.toFixed(2) +
								"/" +
								h.threshold.toFixed(2) +
								" " +
								(Number.isFinite(h.distance)
									? `${Math.round(h.distance)}u`
									: "blocked");
						E.font.text(g, text, q[0], q[1], col, {
							align: "center",
							outline: false,
							shadow: "#0c1420",
						});
					}
					legends.push("HEARING: passage strength / species threshold");
				}
				if (data.los) {
					const l = data.los;
					px.blend(g, 0.35, "normal", () => {
						for (const e of l.rays) line(e.a, e.b, "#84c2d3");
					});
					for (const e of l.boundary) line(e.a, e.b, "#a1e8f3", 2);
					legends.push(
						"LOS: " +
							l.cells +
							" live cells / " +
							l.radius +
							"u wall-clipped rays",
					);
				}
				for (let j = 0; j < legends.length; j++)
					E.font.text(g, legends[j], 5, r.H - 48 - j * 11, "#d8e3d3", {
						outline: false,
						shadow: "#0b1820",
					});
			});
		}
	}
	globalThis.DTRender = WorldRenderer;
	globalThis.DTArt = { ranger, drawCreature, palettes: PALETTES };
})();
