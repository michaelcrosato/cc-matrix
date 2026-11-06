const E = globalThis.My3D2dge;
const { px, TAU } = E;
export const COLORS = ["#5ee8dc", "#ffa55c", "#dd92ff", "#a9ef7f"];
const RAINBOW = [
	"#ff7066",
	"#ffb85c",
	"#f5e89b",
	"#65dfad",
	"#6ac9ec",
	"#9087ef",
	"#e78ad7",
];
const HULLS = [
	[
		"........hh........",
		".......hHHh.......",
		"......hHwwHh......",
		".....hhHwwHhh.....",
		"....hbHHHHHHbh....",
		"..hhbBBHHHHBBbhh..",
		".hHbBBbHHHHbBBbHh.",
		"hHHbBBbbHHbbBBbHHh",
		"hHhhbbHHHHHHbbhhHh",
		".h...hHbbbbHh...h.",
		".....hr....rh.....",
	],
	[
		"........hh........",
		".......hHHh.......",
		"....h.hHwwHh.h....",
		"...hHhHHwwHHhHh...",
		"..hHHbHHHHHHbHHh..",
		"..hHbbHHHHHHbbHh..",
		".hHbbBBHHHHBBbbHh.",
		"hHHbBBBHHHHBBBbHHh",
		".hhbbbbHHHHbbbbhh.",
		"...hHHbbbbbbHHh...",
		"....rr......rr....",
	],
	[
		".......hhhh.......",
		".......hHHh.......",
		"......hHwwHh......",
		"..hh..hHwwHh..hh..",
		".hHHhhHHHHHHhhHHh.",
		"hHHHbbHHHHHHbbHHHh",
		"hHbbBBbHHHHbBBbbHh",
		".hbBBBbHHHHbBBBbh.",
		"..hbbbHHHHHHbbbh..",
		"...hhHbbbbbbHhh...",
		"....rr......rr....",
	],
	[
		"........hh........",
		".......hHHh.......",
		"......hHwwHh......",
		"....hhhHwwHhhh....",
		"...hHHbHHHHbHHh...",
		"..hHHbbHHHHbbHHh..",
		".hHHbBBHHHHBBbHHh.",
		"hHHbBBBHHHHBBBbHHh",
		".hHbbbbHHHHbbbbHh.",
		"..hh..hbbbbh..hh..",
		"......r....r......",
	],
];
function hull(rows, color, scale = 2) {
	const t = E.tones(color);
	return E.sprite(
		rows,
		{ h: t.deep, H: t.base, b: t.sh, B: t.lt, w: "#edffff", r: "#fe9675" },
		scale,
	);
}
const PLAYERS = HULLS.map((r, i) => hull(r, COLORS[i]));
const ENEMIES = ["#c393ed", "#ea9e73", "#87bce9"].map((c, i) =>
	hull(
		[
			".....hhhhhh.....",
			"....hHHwwHHh....",
			"...hHwwwwwwHh...",
			"..hHHHHHHHHHHh..",
			"hhbbbbbbbbbbbbhh",
			"hHBBBBBBBBBBBBHh",
			".hHHHHbbbbHHHHh.",
			"..hh..rrrr..hh..",
			i === 1 ? "...r........r..." : "....r......r....",
		],
		c,
	),
);
const EXHAUST = E.anim(
	[0, 1, 2, 1].map((v) =>
		E.sprite(
			[
				".h..h.",
				v === 1 ? "hHhhHh" : ".HhhH.",
				"..hh..",
				v === 2 ? "..h..." : "......",
			],
			{ h: "#3a8fca", H: "#c2fcff" },
			2,
		),
	),
	10,
	{ loop: true },
);
const stars = Array.from({ length: 180 }, (_, i) => ({
	x: (i * 179 + 29) % 1066,
	y: (i * 113 + 37) % 600,
	size: i % 17 === 0 ? 2 : 1,
	depth: 1 + (i % 3),
}));
const ring = (g, x, y, rx, ry, start, end, color, width = 1, n = 70) => {
	let last;
	for (let i = 0; i <= n; i++) {
		const a = start + ((end - start) * i) / n,
			q = [x + Math.cos(a) * rx, y + Math.sin(a) * ry];
		if (last) px.line(g, ...last, ...q, color, width);
		last = q;
	}
};
const diamond = (g, x, y, r, c) =>
	px.poly(
		g,
		[
			[x, y - r],
			[x + r, y],
			[x, y + r],
			[x - r, y],
		],
		c,
	);
function face(g, x, y, s, t, phase = 0, emotion = "gloat") {
	const P = ([[a, b], ...rest]) => [
		[x + a * s, y + b * s],
		...rest.map(([u, v]) => [x + u * s, y + v * s]),
	];
	const c =
			emotion === "defeat" ? "#4a577b" : phase === 2 ? "#e29288" : "#b472b4",
		T = E.tones(c);
	px.poly(
		g,
		P([
			[-34, -30],
			[-25, -49],
			[-9, -39],
			[0, -57],
			[9, -39],
			[25, -49],
			[34, -30],
			[31, 17],
			[15, 40],
			[0, 48],
			[-15, 40],
			[-31, 17],
		]),
		T.deep,
	);
	px.poly(
		g,
		P([
			[-29, -27],
			[-23, -39],
			[-9, -29],
			[0, -44],
			[9, -29],
			[23, -39],
			[29, -27],
			[25, 14],
			[12, 33],
			[0, 39],
			[-12, 33],
			[-25, 14],
		]),
		T.sh,
	);
	px.poly(
		g,
		P([
			[-24, -22],
			[-9, -27],
			[0, -36],
			[10, -26],
			[24, -22],
			[21, 12],
			[10, 27],
			[0, 33],
			[-10, 27],
			[-21, 12],
		]),
		T.base,
	);
	px.poly(
		g,
		P([
			[-24, -22],
			[-9, -27],
			[0, -36],
			[0, 4],
			[-9, 9],
			[-18, 4],
		]),
		T.lt,
	);
	px.poly(
		g,
		P([
			[0, 5],
			[10, -3],
			[21, -18],
			[20, 11],
			[10, 27],
			[0, 33],
		]),
		T.sh,
	);
	px.poly(
		g,
		P([
			[-28, -10],
			[-8, -3],
			[-5, 6],
			[-21, 1],
		]),
		"#171529",
	);
	px.poly(
		g,
		P([
			[28, -10],
			[8, -3],
			[5, 6],
			[21, 1],
		]),
		"#171529",
	);
	const blink = Math.sin(t * 0.7) > 0.998;
	if (!blink) {
		px.poly(
			g,
			P([
				[-24, -8],
				[-10, -3],
				[-8, 0],
				[-21, -1],
			]),
			"#ffe9a7",
		);
		px.poly(
			g,
			P([
				[24, -8],
				[10, -3],
				[8, 0],
				[21, -1],
			]),
			"#ffe9a7",
		);
	}
	px.poly(
		g,
		P([
			[0, -5],
			[-5, 12],
			[5, 12],
		]),
		T.deep,
	);
	px.line(g, x, y - 3 * s, x + 2 * s, y + 9 * s, T.hi, Math.max(1, s));
	const mouth =
		emotion === "speak"
			? 4 + Math.sin(t * 22) * 3
			: emotion === "defeat"
				? 1
				: 3;
	px.poly(
		g,
		P([
			[-12, 18],
			[-2, 22 + mouth],
			[10, 16],
			[8, 24 + mouth],
			[-5, 28 + mouth],
		]),
		"#211529",
	);
	px.line(g, x - 11 * s, y + 18 * s, x - 1 * s, y + 22 * s, "#fbd6d0", s);
	for (const k of [-1, 1]) {
		px.poly(
			g,
			P([
				[k * 30, -11],
				[k * 39, -23],
				[k * 42, 4],
				[k * 31, 18],
			]),
			T.deep,
		);
		px.line(g, x + k * 35 * s, y - 12 * s, x + k * 35 * s, y + 7 * s, T.lt, s);
	}
}
export class Renderer {
	constructor(game) {
		this.game = game;
		this.effects = [];
		this.time = 0;
		this.lastEvent = 0;
		this.speechUntil = 0;
		this.subtitle = "";
		this.emotion = "gloat";
	}
	reset() {
		this.effects = [];
		this.lastEvent = 0;
		this.subtitle = "";
	}
	speak(text, seconds = 4) {
		this.subtitle = text;
		this.speechUntil = this.time + seconds;
		this.emotion = "speak";
	}
	events(events = []) {
		for (const e of events) {
			if (e.id <= this.lastEvent) continue;
			this.lastEvent = e.id;
			if (
				[
					"intercept",
					"kill",
					"hit",
					"boss-hit",
					"phase",
					"brake",
					"clear",
					"recover",
					"victory",
					"land",
					"dissolve",
				].includes(e.type)
			) {
				this.effects.push({
					...e,
					t: 0,
					life: e.type === "brake" ? 1.5 : 0.75,
				});
				if (e.type === "hit" && !this.game.reduceMotion) this.game.shake(3);
			}
		}
	}
	update(dt) {
		this.time += dt;
		for (const e of this.effects) e.t += dt;
		this.effects = this.effects.filter((e) => e.t < e.life);
		if (this.time > this.speechUntil) this.emotion = "gloat";
	}
	draw(
		r,
		w,
		{
			title = false,
			attract = false,
			hitboxes = false,
			trajectories = false,
		} = {},
	) {
		const t = this.game.reduceMotion ? 0 : this.time,
			g = r.ctx;
		r.sky(["#050a16", "#081021", "#0b1223"]);
		const sx = r.W / 2,
			sy = r.H / 2;
		// Purely cosmetic parallax, independent of the authoritative random stream.
		for (const st of stars) {
			const yy = (st.y + t * st.depth * 2) % 600;
			px.rect(
				g,
				st.x,
				yy,
				st.size,
				st.size,
				st.depth === 3 ? "#8194b8" : "#273957",
			);
			if (st.size === 2) {
				px.line(g, st.x - 2, yy, st.x + 3, yy, "#344867");
				px.line(g, st.x, yy - 2, st.x, yy + 3, "#344867");
			}
		}
		// Broken chronometer rings frame the firing plane.
		for (let j = 0; j < 4; j++) {
			const a = t * (j % 2 ? -0.025 : 0.018) + j * 0.9;
			for (let k = 0; k < 5; k++)
				ring(
					g,
					sx,
					sy - 25,
					405 + j * 32,
					280 + j * 25,
					a + (k * TAU) / 5,
					a + (k * TAU) / 5 + 0.83,
					j % 2 ? "#13223a" : "#1c2742",
					j === 0 ? 2 : 1,
				);
		}
		for (let i = 0; i < 32; i++) {
			const a = (i * TAU) / 32 + t * 0.012,
				x = sx + Math.cos(a) * 490,
				y = sy - 20 + Math.sin(a) * 337;
			px.line(g, x, y, x + Math.cos(a) * 8, y + Math.sin(a) * 8, "#2a3750", 2);
		}
		const portalX = title ? sx + 205 : sx,
			portalY = title ? sy - 35 : sy - 175;
		const large = title ? 1.8 : w?.wave === 8 ? 1.45 : 0.88;
		for (let i = 13; i >= 0; i--) {
			const rr = (25 + i * 6) * large,
				alpha = i % 2 === 0;
			ring(
				g,
				portalX,
				portalY,
				rr,
				rr * 0.54,
				t * 0.21 + i * 0.13,
				t * 0.21 + i * 0.13 + TAU - 0.22,
				alpha ? "#1b1838" : "#161d3a",
				3,
			);
		}
		for (let j = 0; j < 7; j++) {
			const a = t * (j % 2 ? -0.23 : 0.17) + j * 0.9;
			ring(
				g,
				portalX,
				portalY,
				(74 + j * 4) * large,
				(40 + j * 2.5) * large,
				a,
				a + 1.5,
				RAINBOW[j],
				j % 2 ? 2 : 3,
			);
		}
		for (let j = 0; j < 18; j++) {
			const a = (j * TAU) / 18 + t * 0.1,
				x = portalX + Math.cos(a) * 108 * large,
				y = portalY + Math.sin(a) * 58 * large;
			diamond(g, x, y, 2, j % 3 === 0 ? "#6d639a" : "#25375b");
		}
		if (title || w?.wave === 8)
			face(
				g,
				portalX,
				portalY - 5,
				large * 0.92,
				t,
				w?.bossPhase || 0,
				w?.outcome === "victory" ? "defeat" : this.emotion,
			);
		else {
			face(g, sx + 462, sy - 217, 0.43, t, w?.bossPhase || 0, this.emotion);
		}
		// Ground rail and side pylons remain outside the machine hitboxes.
		px.rect(g, sx - 475, sy + 260, 950, 2, "#29425b");
		px.rect(g, sx - 475, sy + 263, 950, 12, "#0d1b2d");
		for (let i = -7; i <= 7; i++) {
			px.rect(g, sx + i * 64 - 10, sy + 267, 20, 2, "#30435c");
		}
		for (const side of [-1, 1]) {
			const x = sx + side * 484;
			px.poly(
				g,
				[
					[x - 8, sy + 240],
					[x + 8, sy + 240],
					[x + 13, sy + 282],
					[x - 13, sy + 282],
				],
				"#1c2b45",
			);
			px.rect(g, x - 5, sy + 243, 10, 5, "#789fc1");
			px.rect(g, x - 3, sy + 253, 6, 19, "#132038");
		}
		if (!w || title) {
			for (let i = 0; i < 7; i++) {
				const x = portalX + Math.sin(t * 0.35 + i * 0.7) * 200,
					y = sy + 75 + (i % 3) * 31;
				r.sprite(x - sx, y - sy, 0, ENEMIES[i % 3], {
					anchor: "center",
					rot: Math.sin(t + i) * 0.15,
				});
			}
			r.sprite(title ? -205 : 0, 225, 0, PLAYERS[0], { anchor: "center" });
			return;
		}
		for (const h of w.threats || []) {
			const x = sx + h.x,
				y = sy + h.y,
				type = h.type || h.kind;
			if (type === "roller" && Number.isFinite(h.safeX)) {
				E.font.text(g, "EXIT", sx + h.safeX, sy + 211, "#a9d9af", {
					align: "center",
					outline: false,
				});
				for (const q of [-1, 1])
					px.line(
						g,
						sx + h.safeX + q * 25,
						sy + 223,
						sx + h.safeX + q * 18,
						sy + 228,
						"#a9d9af",
						2,
					);
			}
			if (type === "roller" && (h.state === "ground" || h.grounded)) {
				const a = h.left ?? h.x - 90,
					b = h.right ?? h.x + 90;
				px.rect(g, sx + a, sy + 234, b - a, 13, "#263c29");
				px.line(g, sx + a, sy + 251, sx + b, sy + 251, "#87d595", 2);
				for (const q of [a, b])
					px.line(g, sx + q, sy + 228, sx + q, sy + 254, "#a6ec9b", 2);
			}
			if (type === "roller" && !(h.state === "ground" || h.grounded)) {
				const a = h.left ?? h.x - 90,
					b = h.right ?? h.x + 90;
				for (let i = a; i < b; i += 17)
					px.line(g, sx + i, sy + 249, sx + i + 8, sy + 249, "#42714c", 2);
				px.line(g, x, sy + 235, x, sy + 253, "#a0e388", 2);
			}
			if (
				type === "hunter" &&
				(h.state === "warning" || h.warning > 0 || h.tell > 0)
			) {
				const q = h.targetX ?? h.aimX ?? h.x;
				diamond(g, sx + q, sy + 240, 15, "#6d4528");
				diamond(g, sx + q, sy + 240, 11, "#0a1021");
				px.line(g, sx + q - 22, sy + 240, sx + q + 22, sy + 240, "#ffcb73");
				if (trajectories) px.line(g, x, y, sx + q, sy + 240, "#66533c");
			}
			if (trajectories && type === "mine")
				px.line(g, x, y, x + (h.vx || 0), y + (h.vy || 0), "#6b374e");
			r.actor(h.x, h.y, 0, (c, ox, oy) => this.weapon(c, ox, oy, type, h, t), {
				emissive: true,
			});
		}
		for (const e of w.enemies || [])
			r.sprite(
				e.x,
				e.y,
				0,
				ENEMIES[(e.variant ?? e.kind ?? e.id) % 3] || ENEMIES[0],
				{
					anchor: "center",
					rot: Math.max(
						-0.5,
						Math.min(0.5, (e.angle ?? Math.PI / 2) - Math.PI / 2),
					),
					flash: e.hit > 0 ? "#fff5d5" : undefined,
					glow: 0.1,
				},
			);
		if (w.wave === 8 && w.boss) {
			const b = w.boss,
				x = b.x || 0,
				y = b.y ?? -130,
				open = b.vulnerable ?? b.open ?? true;
			r.actor(
				x,
				y,
				0,
				(c, ox, oy) => {
					if (w.bossPhase > 0) {
						for (const side of [-1, 1]) {
							const gx = ox + side * 86;
							ring(
								c,
								gx,
								oy,
								17,
								17,
								0,
								TAU,
								w.bossPhase === 2 ? "#d99c77" : "#8c9f96",
								3,
							);
							for (let j = 0; j < 6; j++) {
								const a = t * (w.bossPhase === 2 ? 2 : 1) + (j * TAU) / 6;
								px.line(
									c,
									gx + Math.cos(a) * 8,
									oy + Math.sin(a) * 8,
									gx + Math.cos(a) * 22,
									oy + Math.sin(a) * 22,
									w.bossPhase === 2 ? "#e3b57d" : "#6d8d89",
									3,
								);
							}
							px.line(c, gx, oy, ox + side * 50, oy, "#414f66", 3);
						}
					}
					for (const side of [-1, 1]) {
						px.poly(
							c,
							[
								[ox + side * 44, oy - 16],
								[ox + side * 63, oy - 4],
								[ox + side * 47, oy + 14],
								[ox + side * 30, oy + 5],
							],
							"#70638e",
						);
						px.line(
							c,
							ox + side * 37,
							oy - 2,
							ox + side * 52,
							oy - 2,
							open ? "#fff2bf" : "#be6489",
							3,
						);
					}
					diamond(c, ox, oy, open ? 18 : 23, open ? "#d0ffeb" : "#5f456c");
					diamond(c, ox, oy, open ? 12 : 17, open ? "#62c6b6" : "#18253d");
					if (open) diamond(c, ox, oy, 5, "#fff9d6");
				},
				{ emissive: true },
			);
		}
		for (const s of w.shots || []) {
			const i = (w.players || []).findIndex((p) => p.id === s.owner),
				c = COLORS[Math.max(0, i) % 4];
			r.actor(
				s.x,
				s.y,
				0,
				(g, x, y) => {
					px.rect(g, x - 2, y - 12, 4, 24, "#244558");
					px.rect(g, x - 1, y - 10, 2, 20, c);
					px.rect(g, x, y - 9, 1, 15, "#f0ffff");
				},
				{ emissive: true },
			);
		}
		for (let i = 0; i < (w.players || []).length; i++) {
			const p = w.players[i];
			if (p.connected === false) continue;
			const c = COLORS[i % 4];
			if (p.hp > 0) {
				r.sprite(p.x, p.y + 13, 0, EXHAUST, { anchor: "center", t: t });
				r.sprite(
					p.x + (p.vx || 0) * 0.006,
					p.y + Math.min(1, (p.recoil || 0) / 0.11) * 3,
					0,
					PLAYERS[i % 4],
					{
						anchor: "center",
						rot: (p.vx || 0) * 0.00025,
						alpha: p.invuln > 0 && Math.floor(t * 12) % 2 ? 0.45 : 1,
					},
				);
				if (p.invuln > 0)
					r.actor(
						p.x,
						p.y,
						0,
						(g, x, y) => ring(g, x, y, 28, 20, 0, TAU, "#6dacb5", 1),
						{ emissive: true },
					);
			} else
				r.actor(p.x, p.y, 0, (g, x, y) => {
					px.poly(
						g,
						[
							[x - 17, y + 6],
							[x - 8, y - 4],
							[x + 5, y + 1],
							[x + 15, y - 6],
							[x + 20, y + 10],
							[x - 18, y + 10],
						],
						"#344053",
					);
					px.line(g, x - 12, y + 1, x + 10, y + 7, "#758098", 2);
				});
			r.actor(
				p.x,
				p.y + 28,
				0,
				(g, x, y) => {
					for (let j = 0; j < 3; j++)
						px.rect(g, x - 13 + j * 10, y, 7, 3, j < p.hp ? c : "#2e3447");
				},
				{ emissive: true },
			);
			if (hitboxes)
				r.actor(p.x, p.y, 0, (g, x, y) =>
					ring(g, x, y, p.r || 10, p.r || 10, 0, TAU, "#ffffff", 1),
				);
		}
		for (const e of this.effects) {
			const x = sx + (e.x || 0),
				y = sy + (e.y || 0),
				u = e.t / e.life;
			if (e.type === "brake") {
				ring(g, sx, sy + 220, u * 950, u * 670, 0, TAU, "#89ebf0", 3);
				continue;
			}
			if (e.type === "dissolve") {
				for (let k = 0; k < 7; k++) {
					const a = (k * TAU) / 7;
					px.rect(
						g,
						x + Math.cos(a) * (5 + u * 18),
						y + Math.sin(a) * (5 + u * 18),
						2,
						2,
						u < 0.5 ? "#82b8aa" : "#34564f",
					);
				}
				continue;
			}
			if (e.type === "recover") {
				ring(g, x, y, 18 + u * 24, 13 + u * 18, 0, TAU, "#7dc6b2", 2);
				continue;
			}
			const color =
				e.type === "hit"
					? "#ff846e"
					: e.type === "land"
						? "#a9ef7f"
						: "#f5dcb5";
			for (let k = 0; k < 12; k++) {
				const a = (k * TAU) / 12 + e.id,
					n = 8 + u * 43;
				px.line(
					g,
					x + Math.cos(a) * n * 0.7,
					y + Math.sin(a) * n * 0.7,
					x + Math.cos(a) * n,
					y + Math.sin(a) * n,
					color,
					u < 0.4 ? 2 : 1,
				);
			}
			if (u < 0.2 && this.game.settings.flashes > 0)
				diamond(
					g,
					x,
					y,
					14 * (1 - u * 5) * this.game.settings.flashes,
					"#f3ffef",
				);
		}
		if (w.brake > 0) {
			ring(g, sx, sy, 512, 280, 0, TAU, "#2c6877", 3);
		}
		if (hitboxes) {
			for (const h of [...w.enemies, ...w.threats]) {
				const [x, y] = r.w(h.x, h.y, 0);
				ring(g, x, y, h.r || 12, h.r || 12, 0, TAU, "#d7cfe2", 1);
			}
		}
	}
	weapon(g, x, y, type, h, t) {
		if (type === "missile") {
			px.poly(
				g,
				[
					[x, y + 11],
					[x - 6, y - 1],
					[x - 3, y - 8],
					[x + 3, y - 8],
					[x + 6, y - 1],
				],
				"#60768e",
			);
			px.poly(
				g,
				[
					[x, y + 9],
					[x - 3, y - 2],
					[x, y - 6],
					[x + 3, y - 2],
				],
				"#e2eff5",
			);
			px.line(g, x, y - 10, x, y - 15, "#eab17c", 2);
		} else if (type === "mine") {
			px.disc(g, x, y, 11, "#632b51");
			px.disc(g, x - 1, y - 1, 8, "#c65c78");
			px.disc(g, x - 3, y - 3, 4, "#ffd4cd");
			px.disc(g, x + 3, y + 2, 4, "#952e52");
			for (let i = 0; i < 3; i++) {
				const a = t * 3 + (i * TAU) / 3;
				diamond(g, x + Math.cos(a) * 15, y + Math.sin(a) * 15, 2, "#eaa2a3");
			}
		} else if (type === "roller") {
			const a = t * 3;
			for (let i = 0; i < 4; i++) {
				const aa = a + (i * Math.PI) / 2;
				px.line(
					g,
					x + Math.cos(aa) * 3,
					y + Math.sin(aa) * 3,
					x + Math.cos(aa) * 13,
					y + Math.sin(aa) * 13,
					"#a9e986",
					5,
				);
			}
			px.disc(g, x, y, 6, "#345a4f");
			px.disc(g, x - 1, y - 1, 3, "#e1ffd7");
		} else {
			diamond(g, x, y, 14, "#a96943");
			diamond(g, x, y, 10, "#ffd98a");
			diamond(g, x, y, 6, "#392a4b");
			px.line(g, x - 4, y - 6, x, y - 10, "#ffffdf", 2);
			for (const v of [-1, 1])
				px.line(g, x + v * 16, y - 3, x + v * 20, y + 3, "#edb869");
		}
	}
}
