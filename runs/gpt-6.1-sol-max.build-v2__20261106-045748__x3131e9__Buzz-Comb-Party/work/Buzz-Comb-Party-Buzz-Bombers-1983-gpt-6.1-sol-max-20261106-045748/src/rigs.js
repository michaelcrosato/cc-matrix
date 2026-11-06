(function (B) {
	"use strict";
	const E = My3D2dge,
		{ px } = E,
		C = {
			ink: "#101e29",
			cream: "#fff1c3",
			gold: "#f6bd57",
			amber: "#d98239",
			teal: "#4bd5bc",
			pale: "#e8ecdf",
			rose: "#ef787c",
		};
	B.COLORS = C;
	const dot = (g, x, y, c) => px.rect(g, x, y, 1, 1, c);
	B.hex = function (g, x, y, r, c) {
		px.poly(
			g,
			[
				[x - r, y],
				[x - r * 0.5, y - r * 0.86],
				[x + r * 0.5, y - r * 0.86],
				[x + r, y],
				[x + r * 0.5, y + r * 0.86],
				[x - r * 0.5, y + r * 0.86],
			],
			c,
		);
	};
	B.flowerDraw = function (g, x, y, size, t, color = C.rose, warn = false) {
		const sway = Math.sin(t * 2 + x) * 1.2;
		px.line(
			g,
			x,
			y,
			x + sway,
			y - size * 1.1,
			"#2d624d",
			Math.max(1, size * 0.13),
		);
		px.ell(
			g,
			x - size * 0.28,
			y - size * 0.35,
			size * 0.34,
			size * 0.13,
			"#4c8861",
		);
		px.ell(
			g,
			x + size * 0.25,
			y - size * 0.61,
			size * 0.3,
			size * 0.12,
			"#568b67",
		);
		const cy = y - size * 1.2,
			rr = size * 0.27,
			tt = E.tones(color);
		for (let i = 0; i < 5; i++) {
			const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
			px.disc(g, x + sway + Math.cos(a) * rr, cy + Math.sin(a) * rr, rr, tt.sh);
			px.disc(
				g,
				x + sway + Math.cos(a) * rr - 0.6,
				cy + Math.sin(a) * rr - 1,
				rr * 0.78,
				tt.lt,
			);
		}
		px.disc(g, x + sway, cy, size * 0.17, C.ink);
		px.disc(g, x + sway, cy - 1, size * 0.12, warn ? "#fff4d7" : C.gold);
	};
	class BeeRig extends E.Blob {
		constructor(kind = "worker") {
			super({
				R: 8,
				face: "front",
				colors: {
					dk: C.ink,
					base: kind === "fast" ? "#e5e8d7" : "#edb84f",
					lt: kind === "fast" ? "#ffffff" : "#ffe48b",
					spec: "#fff8d8",
				},
			});
			this.kind = kind;
			this.state = {};
			this.visualY = null;
		}
		update(dt, s = {}) {
			super.update(dt, {
				look: [s.dir || 1, 0],
				squash:
					s.state === "build"
						? Math.sin(this.t * 22) * 0.13
						: -(s.bank || 0) * 0.3,
				flap: 1,
			});
			this.state = s;
			this.visualY =
				this.visualY === null
					? s.y
					: this.visualY + (s.y - this.visualY) * Math.min(1, dt * 16);
		}
		draw(g, x, y, view, scale = 1) {
			const fast = this.kind === "fast",
				s = this.state,
				flap = Math.sin(this.t * (fast ? 56 : 39)),
				bob = Math.sin(this.t * 8) * 1.1,
				dir = s.dir || 1;
			g.save();
			g.translate(x, y + bob);
			g.scale(scale, scale);
			const wing = "#aecfd3";
			if (fast) {
				px.poly(
					g,
					[
						[-3, -4],
						[-12, -20],
						[-1, -15],
						[5, -4],
					],
					C.ink,
				);
				px.poly(
					g,
					[
						[-2, -5],
						[-10, -18],
						[0, -13],
						[4, -5],
					],
					"#e8f8ef",
				);
				px.poly(
					g,
					[
						[3, -4],
						[12, -17],
						[13, -8],
						[7, 0],
					],
					wing,
				);
			} else {
				px.ell(
					g,
					-5,
					-8 - Math.abs(flap) * 3,
					5,
					3 + Math.abs(flap) * 4,
					C.ink,
				);
				px.ell(
					g,
					-5,
					-9 - Math.abs(flap) * 3,
					4,
					2 + Math.abs(flap) * 4,
					"#d9ebe0",
				);
				px.ell(g, 5, -8 + flap * 2, 5, 4, wing);
			}
			px.ell(g, 0, 0, 11 - this.sq * 6, 8 + this.sq * 5, C.ink);
			const tt = E.tones(fast ? "#dce5d7" : "#edb74e");
			px.ell(g, 0, -1, 9, 6, tt.base);
			px.ell(g, -2, -3, 6, 3, tt.lt);
			px.ell(g, 1, 4, 7, 2, tt.sh);
			for (const xx of [-4, 2]) px.rect(g, xx, -5, 3, 10, C.ink);
			px.ell(g, dir * 8, -1, 4, 5, fast ? "#f8f8e6" : "#f9d47d");
			const ey = fast ? -3 : -2;
			px.rect(g, dir * 9 - 1, ey, 2, 3, C.ink);
			dot(g, dir * 9 - 1, ey, "#fff");
			px.line(g, dir * 7, -6, dir * 10, -10, C.ink);
			px.disc(g, dir * 10, -10, 1, C.gold);
			px.poly(
				g,
				[
					[-dir * 10, 0],
					[-dir * 15, 2],
					[-dir * 10, 4],
				],
				C.ink,
			);
			if (fast) {
				px.line(g, -dir * 17, 2, -dir * 24, 2, "#9ac2c2");
				dot(g, -dir * 29, 2, "#547b81");
			}
			if (s.state === "build") {
				B.hex(g, -2, 9, 5, C.gold);
				px.rect(g, -7, 9, 10, 2, "#9d562d");
			}
			g.restore();
			px.reset(g);
		}
	}
	class CanRig {
		constructor(seat = 1) {
			this.seat = seat;
			this.t = 0;
			this.s = {};
		}
		update(dt, state) {
			this.t += dt;
			this.s = state;
		}
		draw(g, x, y, view, scale = 1) {
			const s = this.s,
				tt = E.tones(this.seat === 1 ? "#5fcdc1" : "#ee916f"),
				rec = (s.recoil || 0) * 2,
				hop =
					(s.hop || 0) > 0 ? Math.sin((1 - s.hop / 0.75) * Math.PI) * 21 : 0;
			const lean =
					(s.vx || 0) / 140 + (s.ammo < 9 ? Math.sin(this.t * 18) * 0.7 : 0),
				bob = Math.sin(this.t * 3) * 0.35;
			g.save();
			g.translate(x + lean, y - hop + bob + rec);
			g.scale(scale, scale);
			// Shoes, rounded pressure vessel, raised crimp and top-mounted nozzle.
			px.ell(g, -7, 0, 6, 2, C.ink);
			px.ell(g, 7, 0, 6, 2, C.ink);
			px.rect(g, -10, -28, 20, 26, C.ink);
			px.ell(g, 0, -26, 10, 4, C.ink);
			px.ell(g, 0, -3, 10, 4, C.ink);
			px.rect(g, -8, -26, 16, 23, tt.sh);
			px.rect(g, -7, -26, 11, 23, tt.base);
			px.rect(g, -5, -25, 3, 21, tt.lt);
			px.rect(g, 6, -24, 1, 18, tt.deep);
			px.ell(g, 0, -26, 8, 3, "#b7ccbc");
			px.ell(g, 0, -28, 7, 2, "#e9e6d4");
			px.rect(g, -3, -34, 8, 5, C.ink);
			px.rect(g, -2, -34, 5, 3, this.seat === 1 ? "#f6d17d" : "#f7f1d2");
			px.rect(g, 0, -37, this.seat === 1 ? 3 : 5, 4, C.ink);
			dot(g, 1, -37, C.cream);
			px.rect(g, -8, -18, 16, 12, C.cream);
			px.rect(g, -8, -18, 16, 2, tt.lt);
			if (this.seat === 1) {
				px.rect(g, -7, -15, 3, 7, tt.deep);
			} else {
				for (let yy = -17; yy < -6; yy += 4)
					px.line(g, -8, yy, 7, yy + 4, tt.deep);
			}
			px.rect(g, -2, -15, 3, 3, C.ink);
			px.rect(g, 4, -15, 3, 3, C.ink);
			dot(g, -1, -15, "#fff");
			dot(g, 5, -15, "#fff");
			px.line(g, 0, -9, 3, -8, C.ink);
			px.line(g, 3, -8, 5, -10, C.ink);
			px.rect(g, -8, -4, 16, 2, tt.lt);
			if (s.swap > 0) {
				for (let i = 0; i < 3; i++)
					px.line(g, -14 + i * 10, -38, -11 + i * 10, -43, C.gold);
			}
			E.font.text(g, String(this.seat), -2, -23, C.ink, { outline: false });
			g.restore();
			px.reset(g);
		}
	}
	class BirdRig extends E.Blob {
		constructor() {
			super({
				R: 7,
				face: "front",
				colors: { dk: C.ink, base: "#36b9b2", lt: "#8fe8c4", spec: "#ffffff" },
			});
			this.s = {};
		}
		update(dt, state) {
			super.update(dt, {
				squash: state.state === "feed" ? -0.1 : 0,
				look: [-1, 0],
				flap: 1,
			});
			this.s = state;
		}
		draw(g, x, y, view, scale = 1) {
			const feed = this.s.state === "feed",
				ang = Math.sin(this.t * 53),
				ir = this.s.irritation || 0;
			g.save();
			g.translate(x, y + Math.sin(this.t * 9) * 1.3);
			g.scale(scale, scale);
			px.poly(
				g,
				[
					[5, 1],
					[15, 6],
					[11, 9],
					[2, 7],
				],
				C.ink,
			);
			px.poly(
				g,
				[
					[5, 2],
					[13, 6],
					[6, 7],
				],
				"#308a9b",
			);
			px.poly(
				g,
				[
					[-1, 0],
					[2, -18],
					[8, -22],
					[8, -5],
					[5, 4],
				],
				C.ink,
			);
			px.poly(
				g,
				[
					[0, 0],
					[3, -15],
					[6, -17],
					[5, -4],
				],
				ang > 0 ? "#c7efdd" : "#7ec9cc",
			);
			px.ell(g, 1, 2, 10, 7, C.ink);
			px.ell(g, 1, 1, 8, 5, ir > 1 ? "#94ba63" : "#38bcb1");
			px.ell(g, -1, 4, 5, 2, "#a4e3b6");
			px.disc(g, -6, -4, 6, C.ink);
			px.disc(g, -6, -5, 5, ir > 1 ? "#b9d473" : "#6ae2bd");
			px.rect(g, -10, -5, 2, 2, C.ink);
			dot(g, -10, -5, "#fff");
			px.line(g, -11, -3, -25, -2 + (feed ? 3 : 0), C.ink, 2);
			px.line(g, -11, -3, -23, -2 + (feed ? 3 : 0), "#d6ac77");
			if (ir > 0) {
				px.line(g, -9, -10, -5, -8, C.ink);
			}
			g.restore();
			px.reset(g);
		}
	}
	B.BeeRig = BeeRig;
	B.CanRig = CanRig;
	B.BirdRig = BirdRig;
	B.combDraw = function (g, x, y, o, t, scale = 1) {
		const red = o.red,
			tt = E.tones(red ? "#e77b66" : "#efa846");
		g.save();
		g.translate(x, y);
		g.scale(scale, scale);
		if (o.kind === "hive") {
			for (let k = 0; k < 5; k++) {
				const yy = 7 - k * 4,
					rr = 14 - k * 2;
				px.ell(g, 0, yy, rr, 4, C.ink);
				px.ell(g, -0.5, yy - 1, rr - 1, 2, k % 2 ? tt.base : tt.lt);
			}
			px.ell(g, 0, 8, 4, 4, C.ink);
			dot(g, -1, 7, tt.sh);
		} else {
			B.hex(g, 0, 0, 12, C.ink);
			B.hex(g, 0, -1, 10, tt.sh);
			B.hex(g, -1, -2, 8, tt.base);
			const cells = red
				? [
						[-3, -4],
						[3, -1],
						[-2, 4],
					]
				: [
						[-4, -3],
						[3, -3],
						[-1, 3],
					];
			for (const [xx, yy] of cells) {
				B.hex(g, xx, yy, 3.4, C.ink);
				B.hex(g, xx, yy, 2, tt.sh);
				px.line(g, xx - 1, yy - 2, xx + 1, yy - 2, tt.lt);
			}
			if (red) {
				px.rect(g, 7, -8, 3, 4, "#fff0ba");
				px.rect(g, 6, -7, 5, 2, "#fff0ba");
			}
			if (Math.sin(t * 3 + o.x) > 0.94) dot(g, -5, -8, "#fff4cf");
		}
		g.restore();
		px.reset(g);
	};
	B.bossDraw = function (g, x, y, b, t, view) {
		const open = b.open > 0,
			phase = b.phase || 0,
			tt = E.tones(["#dca754", "#e28a77", "#bca0db"][Math.min(phase, 2)]),
			f = Math.sin(t * 2);
		// Pageant float: wings, crown, ceremonial ruff and one enormous shield bud.
		px.poly(
			g,
			[
				[x - 25, y],
				[x - 58, y - 18 + f * 3],
				[x - 67, y - 5],
				[x - 48, y + 15],
				[x - 24, y + 14],
			],
			"#1a2832",
		);
		px.poly(
			g,
			[
				[x + 25, y],
				[x + 58, y - 18 - f * 3],
				[x + 67, y - 5],
				[x + 48, y + 15],
				[x + 24, y + 14],
			],
			"#1a2832",
		);
		for (const sd of [-1, 1]) {
			px.poly(
				g,
				[
					[x + sd * 25, y + 1],
					[x + sd * 57, y - 14 + sd * f * 3],
					[x + sd * 61, y - 5],
					[x + sd * 45, y + 11],
				],
				"#c5c7bb",
			);
			px.line(g, x + sd * 30, y + 3, x + sd * 55, y - 5, "#e5e4c9");
		}
		px.ell(g, x, y + 2, 30, 23, C.ink);
		px.ell(g, x, y, 27, 20, tt.sh);
		px.ell(g, x - 4, y - 5, 21, 14, tt.base);
		px.ell(g, x - 6, y - 10, 13, 6, tt.lt);
		px.poly(
			g,
			[
				[x - 18, y - 18],
				[x - 23, y - 32],
				[x - 10, y - 25],
				[x, y - 38],
				[x + 10, y - 25],
				[x + 23, y - 32],
				[x + 18, y - 18],
			],
			C.ink,
		);
		px.poly(
			g,
			[
				[x - 16, y - 21],
				[x - 19, y - 29],
				[x - 9, y - 23],
				[x, y - 34],
				[x + 9, y - 23],
				[x + 19, y - 29],
				[x + 16, y - 21],
			],
			"#f3ce78",
		);
		px.disc(g, x, y - 28, 2, "#f58e82");
		px.rect(g, x - 15, y - 11, 6, 5, C.ink);
		px.rect(g, x + 9, y - 11, 6, 5, C.ink);
		px.rect(g, x - 14, y - 11, 2, 2, "#fff8df");
		px.rect(g, x + 10, y - 11, 2, 2, "#fff8df");
		px.line(g, x - 5, y - 1, x, y + 2, C.ink, 2);
		px.line(g, x, y + 2, x + 5, y - 1, C.ink, 2);
		const sy = y + 19;
		for (let i = 0; i < 5; i++) {
			const a = (i * Math.PI * 2) / 5 + t * 0.15;
			px.ell(
				g,
				x + Math.cos(a) * 15,
				sy + Math.sin(a) * 7,
				8,
				5,
				open ? "#e9c79d" : "#a37589",
			);
		}
		B.hex(g, x, sy, 13, C.ink);
		B.hex(g, x, sy, 11, open ? "#ffe1a0" : "#644a73");
		B.hex(g, x, sy, 7, open ? "#f49f66" : "#af8b9b");
		if (!open) {
			px.rect(g, x - 4, sy - 2, 8, 6, C.ink);
			px.line(g, x - 3, sy - 2, x - 3, sy - 6, C.ink, 2);
			px.line(g, x - 3, sy - 6, x + 3, sy - 6, C.ink, 2);
			px.line(g, x + 3, sy - 6, x + 3, sy - 2, C.ink, 2);
		} else {
			px.line(g, x - 5, sy, x + 4, sy, C.ink);
			px.line(g, x, sy - 5, x, sy + 5, C.ink);
		}
		for (let i = 0; i < b.phases; i++) {
			B.hex(g, x - 12 + i * 12, y + 40, 4, i < phase ? "#67dbb3" : C.ink);
			if (i >= phase) B.hex(g, x - 12 + i * 12, y + 40, 2, tt.base);
		}
		px.line(g, x + 31, y + 8, x + 48, y - 6 + f * 5, C.ink, 3);
		px.line(g, x + 48, y - 6 + f * 5, x + 59, y - 23 + f * 5, C.gold, 2);
	};
	B.pressureAnim = E.anim(
		[
			E.sprite(["...w...", "..www..", ".w.w.w.", "w..w..w"], { w: "#c6f1db" }),
			E.sprite([".w...w.", "..w.w..", "...w...", "..w.w.."], { w: "#f0ffe8" }),
		],
		14,
		{ pingpong: true },
	);
})((globalThis.BCP = globalThis.BCP || {}));
