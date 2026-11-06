(() => {
	"use strict";
	const SF = (globalThis.SF = globalThis.SF || {});
	const E = globalThis.My3D2dge;
	const P = E.px;
	const TAU = Math.PI * 2;
	const C = {
		navy: "#070f20",
		void: "#030812",
		metal: "#41566f",
		dark: "#142638",
		cyan: "#7de6e4",
		amber: "#ffbf69",
		red: "#ff6b6b",
		pale: "#d8f7ed",
		purple: "#b1a0ee",
	};
	const palettes = ["#6ce6ff", "#ffca71", "#b6ff88", "#d29aff"];
	const hash = (n) => {
		n = Math.imul(n ^ 61 ^ (n >>> 16), 9);
		n ^= n >>> 4;
		n = Math.imul(n, 0x27d4eb2d);
		return ((n ^ (n >>> 15)) >>> 0) / 4294967296;
	};
	const point = (x, y, a, d) => [x + Math.cos(a) * d, y + Math.sin(a) * d];
	function ring(
		g,
		x,
		y,
		radius,
		color,
		width = 1,
		start = 0,
		span = TAU,
		n = 64,
	) {
		for (let i = 0; i < n; i++) {
			const a = start + (i / n) * span,
				b = start + ((i + 1) / n) * span;
			P.line(
				g,
				...point(x, y, a, radius),
				...point(x, y, b, radius),
				color,
				width,
			);
		}
	}
	function plate(g, x, y, w, h, color = C.metal, edging = "#7993a6") {
		const t = E.tones(color);
		P.rect(g, x + 2, y + 3, w, h, t.deep);
		P.rect(g, x, y, w, h, t.sh);
		P.rect(g, x, y, w - 2, h - 3, t.base);
		P.rect(g, x, y, w - 2, 1, edging);
		P.rect(g, x, y, 1, h - 3, t.lt);
		P.rect(g, x + 3, y + 4, Math.max(1, w - 8), 1, t.sh);
		for (const [dx, dy] of [
			[2, 2],
			[w - 5, 2],
			[2, h - 6],
			[w - 5, h - 6],
		])
			P.rect(g, x + dx, y + dy, 2, 2, t.hi);
	}
	function pixelSprite(rows, hue, core = C.cyan) {
		const t = E.tones(hue);
		return E.sprite(rows, {
			o: "#081320",
			d: t.deep,
			s: t.sh,
			m: t.base,
			l: t.lt,
			h: t.hi,
			c: core,
			w: "#effff4",
			f: "#ffa75c",
			a: "#e7c68a",
		});
	}
	const playerRows = [
		"...........o...........",
		"..........odo..........",
		"..........oso..........",
		".........osms o.........".replace(" ", ""),
		".........omlmo.........",
		"........omhlmo.........",
		"...o....omwcmo....o....",
		"..oso..osmwcmso..oso...",
		"..omsoosmmwcmmsoosmo...",
		"..olmmssmmccmmssmmlo...",
		".olhmmmmsmccmsmmmhlmo..",
		".ommmssmsmccmsmssmmmo..",
		"omlmssssmmccmmsssslmmo.",
		"olmmsoosmmllmmsoosmmlo.",
		"ommo...ommaammo...ommo.",
		"oss o..ommmmmmo..o sso.".replaceAll(" ", "."),
		"oo.....ossoosso.....oo.",
		"........of..fo........",
		"........ff..ff........",
		".........f..f.........",
	];
	const enemyRows = {
		hunter: [
			"........o........",
			".......odo.......",
			"......osaso......",
			"......omcmo......",
			".....omwcmo......",
			"....ossmc sso....".replace(" ", ""),
			"...osmmmcmmso....",
			"..oslmmmcmmllso..",
			".ohmmsssssssmmho.",
			"ommssooosooossmmo",
			"oso....ofo....oso",
			"oo......f......oo",
		],
		bomber: [
			".......ooooooo.......",
			".....oossmmmmsoo.....",
			"..ooosmmllmmllmmsooo..",
			".ommlmhlmmccmmlhlmmo.",
			"ohmmmmssmwwmssmmmmho",
			"omssmmssmccmssmmssmo",
			"os..omssmmmssmo..so",
			"oo..omsoo oosmo..oo".replace(" ", "."),
			"....ocoo...ooco....",
			".....oo.....oo.....",
		],
		scout: [
			".......oo.......",
			"......ocmo......",
			".....ommhmo.....",
			"....osmmllso....",
			"...osmss ssmso...".replace(" ", ""),
			"..olmmaaaamml o..".replace(" ", ""),
			".ohmmmssssmmmho.",
			"..ossmo..omsso..",
			"....oco..oco....",
			".....oo..oo.....",
		],
		rammer: [
			"........o........",
			".......odo.......",
			"......osaso......",
			".....osmamso.....",
			"....osmhahmso....",
			"...osmma a mmso...".replaceAll(" ", ""),
			"..osmmmaaammmso..",
			".olmmmssassmmmlo.",
			"ohmmmss sss sssmmho".replaceAll(" ", ""),
			"omsssooosooosssmo",
			"oooo....o....oooo",
		],
		tractor: [
			"..ooo.......ooo..",
			".oshmo.....omhso.",
			".omcmo.....omcmo.",
			".omwmso...osmwmo.",
			".omwmmo...ommwmo.",
			".omccmso.osmccmo.",
			"..ommmmsosmmmmo..",
			"..olmmmmlmmmmlo..",
			"...osmmmammms o...".replace(" ", ""),
			"....osssassso....",
			".....ooofoo.....",
			"........f........",
		],
		dive: [
			"o...............o",
			"om o...........o mo".replaceAll(" ", ""),
			"olmso.........osmlo",
			".olmmso.....osmmlo.",
			"..ommhlso.oslhmmo..",
			"...osmmmcmmms o...".replace(" ", ""),
			"....osmmwmms o....".replace(" ", ""),
			".....omwcmo.....",
			"......osso......",
			".......oo.......",
		],
		relay: [
			".......ooo.......",
			"......omlmo......",
			"..o..omcc cmo..o..".replace(" ", ""),
			".omooomwc wmooomo.".replace(" ", ""),
			"omhlmmscccsmmlhmo",
			"olmmssssmssssmmlo",
			"ommmssmmcmmssmmmo",
			".oso..omcmo..oso.",
			"..o....ooo....o..",
		],
	};
	class SiegeRenderer {
		constructor(game) {
			this.game = game;
			this.effects = [];
			this.eventIds = new Set();
			this.lastTime = 0;
			this.lastEpoch = null;
			this.assets = { players: [], enemies: {} };
			for (let i = 0; i < 4; i++) {
				const frames = [0, 1, 2].map((f) =>
					playerRows.map((line, y) =>
						y >= 18 && f === 1
							? line.replaceAll("f", ".")
							: y === 19 && f === 2
								? line.replaceAll("f", "w")
								: line,
					),
				);
				this.assets.players.push(
					E.anim(
						frames.map((rows) =>
							pixelSprite(
								rows,
								i === 0
									? "#718ea1"
									: i === 1
										? "#9d8867"
										: i === 2
											? "#7f79a2"
											: "#9c6e82",
								palettes[i],
							),
						),
						13,
						{ pingpong: true },
					),
				);
			}
			const colors = {
				hunter: "#bf6769",
				bomber: "#ac8462",
				scout: "#8075a9",
				rammer: "#aa6d55",
				tractor: "#858c65",
				dive: "#a77b9e",
				relay: "#657c92",
			};
			for (const [type, rows] of Object.entries(enemyRows))
				this.assets.enemies[type] = E.anim(
					[
						pixelSprite(
							rows,
							colors[type],
							type === "tractor"
								? "#d4ef94"
								: type === "scout"
									? "#c3a5ff"
									: "#ffb785",
						),
						pixelSprite(
							rows.map((row) => row.replaceAll("w", "c")),
							colors[type],
							"#ff876b",
						),
					],
					5,
					{ pingpong: true },
				);
		}
		reset() {
			this.effects.length = 0;
			this.eventIds.clear();
			this.lastEpoch = null;
			this.lastTime = 0;
		}
		event(ev) {
			if (!ev || this.eventIds.has(ev.id)) return;
			this.eventIds.add(ev.id);
			if (this.eventIds.size > 1024)
				this.eventIds.delete(this.eventIds.values().next().value);
			if (
				[
					"kill",
					"hit",
					"damage",
					"pulse",
					"pickup",
					"win",
					"gravity",
					"shield",
					"boss",
				].includes(ev.kind)
			)
				this.effects.push({ ...ev, birth: this.lastTime });
		}
		draw(r, state, opts = {}) {
			const s = state || {};
			const time = Number.isFinite(s.time) ? s.time : this.game.time;
			if (s.epoch !== this.lastEpoch || time < this.lastTime) {
				this.effects.length = 0;
				this.eventIds.clear();
				this.lastEpoch = s.epoch;
			}
			this.lastTime = time;
			for (const ev of s.events || []) this.event(ev);
			this.effects = this.effects.filter(
				(e) => time - e.birth < (e.kind === "pulse" ? 0.6 : 1.1),
			);
			const title = !!opts.title;
			this.background(r, s, time, title);
			if (title) {
				this.station(
					r,
					660,
					291,
					time,
					0,
					[true, true, true, true],
					1.3,
					false,
				);
				this.siegeShip(
					r,
					{ x: 750, y: 100, phase: 0, cycle: time, components: [] },
					time,
					0.57,
					true,
				);
				for (let i = 0; i < 5; i++) {
					const a = time * 0.13 + i * 1.256,
						x = 660 + Math.cos(a) * 192,
						y = 291 + Math.sin(a) * 108;
					r.sprite(x, y, 0, this.assets.players[i % 4], {
						anchor: "center",
						rot: a + Math.PI,
						t: time + i,
						scale: 0.65,
						steps: 32,
						bias: 700,
					});
				}
				return;
			}
			if ((s.act || 0) === 0) {
				this.station(
					r,
					480,
					272,
					time,
					0,
					[true, true, true, true],
					0.45,
					true,
				);
				this.siegeShip(
					r,
					{ x: 810, y: 120, phase: 0, cycle: time, components: [] },
					time,
					0.45,
					true,
				);
			} else if (s.act === 1) {
				this.station(
					r,
					480,
					270,
					time,
					s.objective?.heat || 0,
					s.objective?.radiators || [true, true, true, true],
					1,
					false,
				);
				this.siegeShip(
					r,
					{ x: 800, y: 105, phase: 0, cycle: time, components: [] },
					time,
					0.45,
					true,
				);
			} else this.ground(r, s, time);
			for (const enemy of s.enemies || []) this.enemy(r, enemy, s, time, opts);
			for (const pickup of s.pickups || []) this.pickup(r, pickup, time);
			if (s.boss && s.act === 2) this.siegeShip(r, s.boss, time, 1, false);
			for (const player of s.players || [])
				this.player(r, player, s, time, opts);
			this.projectiles(r, s.shots || [], time);
			this.drawEffects(r, time, opts);
			if (s.state === "transition") this.retreat(r, s, time);
			if (opts.debug) this.debug(r, s);
			if (s.state === "result" && s.result?.won) this.victory(r, time);
		}
		background(r, s, time, title) {
			const g = r.ctx;
			r.sky(
				s.act === 2 && !title
					? ["#040915", "#132239", "#273647"]
					: ["#030811", "#071426", "#112238"],
			);
			// Nebula sheets are stepped, muted native pixel dithering; the active plane stays dark.
			for (let i = 0; i < 11; i++) {
				const x = 490 + Math.cos(i * 0.9) * 330,
					y = 145 + i * 19;
				P.ddisc(
					g,
					x,
					y,
					100 + (i % 3) * 35,
					i % 2 ? "#19344c" : "#262948",
					0.095,
				);
			}
			for (let i = 0; i < 255; i++) {
				const x = hash(i * 7 + 19) * 960,
					y = (hash(i * 9 + 103) * 540 + time * (0.1 + (i % 4) * 0.035)) % 540;
				const bright = hash(i + 400);
				P.rect(
					g,
					x,
					y,
					bright > 0.96 ? 2 : 1,
					1,
					bright > 0.93 ? "#a5c7d5" : bright > 0.65 ? "#55718e" : "#263d53",
				);
				if (bright > 0.985) P.rect(g, x, y - 1, 1, 3, "#a5c7d5");
			}
			// The same moon and atmospheric limb connect all three defensive layers.
			const moonX = title ? 890 : 845,
				moonY = title ? 340 : 355;
			P.disc(g, moonX, moonY, title ? 67 : 56, "#213a4c");
			P.disc(g, moonX + 9, moonY - 5, title ? 62 : 52, "#304b5b");
			for (let j = 0; j < 22; j++) {
				const a = j * 2.399,
					rad = Math.sqrt(hash(j + 211)) * 42;
				P.disc(
					g,
					moonX + Math.cos(a) * rad,
					moonY + Math.sin(a) * rad,
					2 + hash(j + 721) * 5,
					"#273f50",
				);
			}
			P.ddisc(g, moonX - 16, moonY + 1, 70, "#4a7182", 0.1);
			// Broken perimeter segments and pale flight rails are environmental, never hazard colors.
			if (s.act !== 2 || title) {
				const cx = title ? 660 : 480,
					cy = title ? 291 : 270;
				ring(g, cx, cy, title ? 245 : 223, "#193245", 1, 0.15, 1.5, 30);
				ring(g, cx, cy, title ? 245 : 223, "#12293c", 1, 2.0, 2.7, 45);
				for (let j = 0; j < 9; j++) {
					const a = j * 0.72 + 0.18,
						rr = title ? 235 : 230,
						[x, y] = point(cx, cy, a, rr);
					if (x > 25 && x < 935 && y > 50 && y < 485) {
						P.poly(
							g,
							[
								[x - 6, y - 3],
								[x + 4, y - 5],
								[x + 8, y],
								[x + 3, y + 4],
								[x - 5, y + 2],
							],
							"#344454",
						);
						P.line(g, x - 4, y - 3, x + 4, y - 4, "#65717c");
					}
				}
			}
			P.rect(g, 28, 59, 904, 1, "#244054");
			for (const x of [28, 932]) {
				P.rect(g, x, 59, 1, 18, "#4c6879");
				P.rect(g, x, 472, 1, 18, "#4c6879");
			}
			if (title) {
				// A quiet vignette gives the title/menu its own clean left column.
				for (let x = 0; x < 465; x += 12)
					P.rect(g, x, 0, 12, 540, E.mix("#040b16", "#0b1726", x / 1000));
				P.rect(g, 443, 56, 1, 426, "#284452");
				E.font.text(g, "F O R T R E S S  / /  1 3", 660, 470, "#7b9ca9", {
					align: "center",
					outline: false,
				});
			}
		}
		station(r, x, y, t, heat, radiators, scale = 1, distant = false) {
			r.queue(
				x,
				-1000,
				0,
				(g) => {
					const [sx, sy] = r.w(x, y, 0);
					const q = (a, b) => [sx + a * scale, sy + b * scale];
					const rect = (a, b, w, h, c) =>
						P.rect(g, ...q(a, b), w * scale, h * scale, c);
					const poly = (pts, c) =>
						P.poly(
							g,
							pts.map((p) => q(...p)),
							c,
						);
					const line = (a, b, c, d, color, w = 1) =>
						P.line(g, ...q(a, b), ...q(c, d), color, w * scale);
					const over = Math.min(1, heat / 100),
						hot = over > 0.7;
					P.ddisc(
						g,
						sx,
						sy,
						120 * scale,
						distant ? "#2e6580" : "#2e8e9d",
						distant ? 0.06 : 0.12,
					);
					ring(g, sx, sy, 103 * scale, "#142b3c", 9 * scale);
					ring(g, sx, sy, 105 * scale, "#4a6675", 2 * scale);
					ring(g, sx, sy, 98 * scale, "#2b4457", 3 * scale);
					for (let i = 0; i < 24; i++) {
						const a = (i / 24) * TAU;
						const [a1, b1] = point(0, 0, a, 92),
							[a2, b2] = point(0, 0, a, 109);
						line(a1, b1, a2, b2, i % 3 ? "#243b4d" : "#8a9b9e", i % 3 ? 2 : 3);
					}
					for (const [a, b] of [
						[-80, -50],
						[80, -50],
						[-80, 50],
						[80, 50],
					]) {
						line(0, 0, a, b, "#07131f", 15);
						line(-2, -3, a - 2, b - 3, "#5b7181", 9);
						line(-2, -4, a - 2, b - 4, "#a1b2b6", 1);
					}
					poly(
						[
							[-52, -46],
							[-26, -62],
							[28, -62],
							[51, -46],
							[62, -22],
							[62, 28],
							[43, 48],
							[17, 62],
							[-28, 62],
							[-51, 44],
							[-63, 21],
							[-63, -20],
						],
						"#0c1b28",
					);
					poly(
						[
							[-52, -49],
							[-26, -65],
							[28, -65],
							[51, -49],
							[62, -25],
							[62, 24],
							[43, 44],
							[17, 58],
							[-28, 58],
							[-51, 40],
							[-63, 17],
							[-63, -24],
						],
						distant ? "#36566a" : "#647d8c",
					);
					poly(
						[
							[-49, -45],
							[-25, -61],
							[25, -61],
							[48, -45],
							[58, -23],
							[58, 21],
							[41, 40],
							[16, 54],
							[-26, 54],
							[-48, 37],
							[-59, 15],
							[-59, -22],
						],
						distant ? "#243e54" : "#354e64",
					);
					// Individual beveled armor slabs break up the central industrial mass.
					for (const [a, b, w, h] of [
						[-40, -45, 22, 21],
						[18, -45, 22, 21],
						[-49, -13, 24, 27],
						[26, -13, 23, 27],
						[-39, 27, 24, 19],
						[14, 27, 25, 19],
					]) {
						plate(
							g,
							...q(a, b),
							w * scale,
							h * scale,
							distant ? "#355367" : "#4b6378",
						);
						rect(a + 5, b + 7, w - 10, 2, "#253748");
						rect(a + 5, b + 11, w - 10, 2, "#253748");
					}
					rect(-23, -26, 46, 58, "#162a3a");
					rect(-21, -27, 42, 54, "#6f8e9b");
					rect(-17, -23, 34, 47, "#213f53");
					rect(-13, -19, 26, 23, hot ? "#5f3037" : "#2d6474");
					for (let k = 0; k < 4; k++)
						rect(-10 + k * 6, -16, 3, 17, hot ? "#ee825d" : "#83ddcf");
					rect(-12, 10, 24, 2, "#b2d1c9");
					rect(-12, 15, 24, 2, "#4b7485");
					if (!distant)
						E.font.text(g, "13", sx, sy + 31 * scale, "#b9d3d3", {
							align: "center",
							scale: scale >= 1.25 ? 2 : 1,
							outline: false,
						});
					for (let i = 0; i < 4; i++) {
						const ax = i % 2 ? 80 : -80,
							ay = i < 2 ? -50 : 50,
							cooling = radiators[i] !== false;
						plate(
							g,
							...q(ax - 20, ay - 15),
							40 * scale,
							29 * scale,
							cooling ? "#506c78" : "#7f5554",
							"#b5c7c2",
						);
						for (let k = 0; k < 6; k++) {
							rect(
								ax - 15 + k * 5,
								ay - 10,
								2,
								17,
								cooling
									? (k + Math.floor(t * 6)) % 3
										? "#4a9d9e"
										: "#a7f9da"
									: "#a64e47",
							);
							if (cooling && !distant) {
								const off = (t * 17 + k * 7) % 18;
								rect(
									ax - 14 + k * 5,
									ay + (ay < 0 ? -18 - off : 18 + off),
									1,
									3,
									"#244f60",
								);
							}
						}
						if (!cooling && !distant) {
							line(ax - 9, ay - 9, ax + 9, ay + 9, "#ffd391", 2);
							line(ax + 9, ay - 9, ax - 9, ay + 9, "#ffd391", 2);
						}
					}
					// Antenna, hangar hatch, and orbit traffic are visibly alive on the title.
					line(-9, -64, -9, -85, "#829ba5", 2);
					line(-20, -80, 2, -80, "#647e89", 1);
					rect(-11, -87, 4, 3, Math.floor(t * 2) % 2 ? "#a1e6d2" : "#365369");
					rect(-27, 53, 54, 16, "#172b3d");
					for (let k = 0; k < 5; k++)
						rect(-23 + k * 10, 57, 6, 4, hot && k % 2 ? "#d97f61" : "#d9bf81");
					for (const side of [-1, 1])
						for (let k = 0; k < 5; k++)
							rect(
								side * 54 - 1,
								-27 + k * 11,
								2,
								3,
								(k + Math.floor(t * 2)) % 3 ? "#6dadb3" : "#e8d79b",
							);
					if (hot && !distant) {
						ring(g, sx, sy, (112 + Math.sin(t * 5) * 2) * scale, "#8c5549", 1);
						for (let j = 0; j < 7; j++) {
							const dx = hash(j + 81) * 90 - 45,
								dy = -30 - ((t * 14 + j * 17) % 60);
							P.ddisc(g, ...q(dx, dy), (3 + (j % 3)) * scale, "#87715c", 0.3);
						}
					}
				},
				{ bias: -1000 },
			);
		}
		enemy(r, e, s, t, opts) {
			if (e.hp <= 0) return;
			const [sx, sy] = r.w(e.x, e.y, 0),
				radius = e.r || 16;
			if (e.type === "anchor") {
				r.queue(
					e.x,
					e.y,
					0,
					(g) => {
						const active = (e.telegraph || 0) <= 0 && (e.t || 0) >= 3.6;
						for (let k = 0; k < 3; k++) {
							const rad = 32 + (((2 - k) * 41 - ((t * 35) % 41) + 41) % 123);
							ring(g, sx, sy, rad, active ? "#6f679f" : "#4b4471", 1);
						}
						P.poly(
							g,
							[
								[sx - 19, sy],
								[sx - 7, sy - 14],
								[sx + 7, sy - 14],
								[sx + 19, sy],
								[sx + 7, sy + 14],
								[sx - 7, sy + 14],
							],
							"#152032",
						);
						P.poly(
							g,
							[
								[sx - 17, sy - 2],
								[sx - 6, sy - 13],
								[sx + 6, sy - 13],
								[sx + 17, sy - 2],
								[sx + 6, sy + 11],
								[sx - 6, sy + 11],
							],
							"#9c8bc0",
						);
						P.disc(g, sx, sy, 11, "#2b274a");
						P.disc(g, sx, sy, 5 + Math.sin(t * 9) * 1.5, "#cbb7ff");
						P.rect(g, sx - 2, sy - 3, 3, 4, "#f2e4ff");
						for (let j = 0; j < 6; j++) {
							const a = t * 0.8 + (j / 6) * TAU;
							P.rect(g, ...point(sx, sy, a, 22), 2, 2, "#bba0ef");
						}
						E.font.text(
							g,
							active ? "PULL" : "CHARGING",
							sx,
							sy + 31,
							"#c6b8ef",
							{ align: "center", outline: false },
						);
					},
					{ bias: 80, emissive: true },
				);
				return;
			}
			const sprite = this.assets.enemies[e.type] || this.assets.enemies.hunter;
			const angle =
				e.type === "dive"
					? Math.atan2(e.vy || 1, e.vx || 0) - Math.PI / 2
					: e.type === "rammer"
						? Math.atan2((e.ty || 270) - e.y, (e.tx || 480) - e.x) + Math.PI / 2
						: 0;
			r.sprite(e.x, e.y, 0, sprite, {
				t: t + (e.id || 0) * 0.1,
				anchor: "center",
				scale: e.type === "bomber" ? 2 : 1.7,
				rot: angle,
				steps: 32,
				bias: 100,
			});
			if (e.telegraph > 0)
				r.overlay((g) => {
					ring(
						g,
						sx,
						sy,
						radius + 12 + Math.sin(t * 7) * 2,
						"#dfb177",
						1,
						t,
						TAU * 0.75,
						32,
					);
					P.line(g, sx - 4, sy - 30, sx + 4, sy - 30, "#f2cb90", 2);
				});
			const cycle = e.cycle || e.t || 0;
			if (e.type === "hunter" && cycle > 2.1)
				r.overlay((g) => {
					const player = (s.players || [])
						.filter((p) => p.hp > 0)
						.sort(
							(a, b) =>
								Math.hypot(a.x - e.x, a.y - e.y) -
								Math.hypot(b.x - e.x, b.y - e.y),
						)[0];
					if (player) {
						const [px, py] = r.w(player.x, player.y, 0);
						for (let j = 0; j < 10; j++)
							if (j % 2 === 0)
								P.line(
									g,
									sx + ((px - sx) * j) / 10,
									sy + ((py - sy) * j) / 10,
									sx + ((px - sx) * (j + 1)) / 10,
									sy + ((py - sy) * (j + 1)) / 10,
									"#ad695c",
									1,
								);
					}
				});
			if (e.type === "bomber" && cycle > 3.5)
				r.overlay((g) => {
					const target = r.w(
						s.act === 2 ? e.x : 480,
						s.act === 2 ? 455 : 270,
						0,
					);
					const dx = target[0] - sx,
						dy = target[1] - sy,
						length = Math.hypot(dx, dy) || 1;
					const nx = (-dy / length) * 20,
						ny = (dx / length) * 20;
					for (let d = 22; d < length; d += 18) {
						const a = d / length,
							b = Math.min(d + 8, length) / length;
						for (const side of [-1, 1])
							P.line(
								g,
								sx + dx * a + nx * side,
								sy + dy * a + ny * side,
								sx + dx * b + nx * side,
								sy + dy * b + ny * side,
								"#e99b6c",
							);
					}
					E.font.text(
						g,
						"!",
						sx + (dx / length) * 38,
						sy + (dy / length) * 38,
						"#ffdb9f",
						{ scale: 2, align: "center", outline: false },
					);
				});
			if (e.type === "rammer")
				r.overlay((g) => {
					const tx = s.act === 2 ? e.x : 480,
						ty = s.act === 2 ? 458 : 270;
					const a = Math.atan2(ty - e.y, tx - e.x);
					for (let j = 1; j <= 3; j++) {
						const [cx, cy] = point(sx, sy, a, radius + 8 + j * 10);
						P.line(g, ...point(cx, cy, a - 2.4, 5), cx, cy, "#eec89b");
						P.line(g, ...point(cx, cy, a + 2.4, 5), cx, cy, "#eec89b");
					}
				});
			if (e.type === "tractor")
				r.overlay((g) => {
					let target;
					if (s.act === 1) {
						const i = e.lock >= 0 && e.lock < 4 ? e.lock : (e.id || 0) % 4;
						target = [i % 2 ? 560 : 400, i < 2 ? 220 : 320];
					} else {
						const pl =
							(s.players || []).find((p) => p.lock === e.id) ||
							(s.players || []).find((p) => p.hp > 0);
						if (pl) target = [pl.x, pl.y];
					}
					if (target) {
						const [tx, ty] = r.w(...target, 0),
							on = cycle > 2 && cycle < 5;
						const col = on ? "#d1e99a" : "#576944";
						P.line(g, sx - 7, sy, tx, ty, col, on ? 2 : 1);
						if (on) {
							P.line(g, sx + 7, sy, tx, ty, "#849b62", 1);
							ring(g, tx, ty, 20 + Math.sin(t * 9) * 3, "#c4dd93", 1);
						}
					}
				});
			if (e.hp < e.maxHp)
				r.overlay((g) => {
					P.rect(g, sx - 15, sy - radius - 8, 30, 3, "#192333");
					P.rect(
						g,
						sx - 15,
						sy - radius - 8,
						Math.max(0, (e.hp / e.maxHp) * 30),
						2,
						"#f2b478",
					);
				});
		}
		player(r, p, s, t, opts) {
			if (p.active === false) return;
			if (p.hp <= 0) {
				if (p.respawn > 0)
					r.overlay((g) => {
						const [x, y] = r.w(p.x, p.y, 0);
						ring(g, x, y, 16, "#6c8396");
						E.font.text(
							g,
							"P" + (p.seat + 1) + " " + Math.ceil(p.respawn),
							x,
							y - 5,
							"#bdd1db",
							{ align: "center", outline: false },
						);
					});
				return;
			}
			const idx = Math.max(0, Math.min(3, p.seat || 0)),
				color = p.color || palettes[idx];
			const ground = s.act === 2;
			const angle = Number.isFinite(p.angle) ? p.angle : -Math.PI / 2;
			const speed = Math.hypot(p.vx || 0, p.vy || 0);
			const [sx, sy] = r.w(p.x, p.y, 0);
			if (ground) {
				r.queue(
					p.x,
					p.y,
					0,
					(g) => {
						plate(g, sx - 19, sy + 3, 38, 14, "#576b78");
						P.rect(g, sx - 17, sy + 15, 34, 3, "#0c1928");
						for (let k = -12; k <= 12; k += 8) {
							P.rect(g, sx + k - 2, sy + 12, 5, 6, "#223b4e");
							P.rect(g, sx + k - 1, sy + 12, 3, 2, "#acc1c2");
						}
						P.rect(g, sx - 16, sy + 5, 30, 2, color);
						const [tx, ty] = point(sx, sy, angle, 23);
						P.line(g, sx, sy, tx, ty, "#1a2f3d", 9);
						P.line(g, sx - 1, sy - 1, tx - 1, ty - 1, "#a4b4ba", 4);
						P.disc(g, sx, sy, 9, "#234154");
						P.disc(g, sx - 1, sy - 2, 6, color);
						if (p.fireCd > 0.08)
							P.line(g, tx, ty, ...point(sx, sy, angle, 27), "#e4fff1", 4);
					},
					{ bias: 200 },
				);
			} else {
				if (p.boostT > 0)
					r.queue(
						p.x,
						p.y,
						0,
						(g) => {
							for (let j = 1; j < 6; j++) {
								const [x, y] = point(sx, sy, angle + Math.PI, j * 11);
								P.ddisc(g, x, y, 10 - j, color, 0.4 - j * 0.05);
							}
						},
						{ bias: 90, emissive: true },
					);
				const blink = p.invuln > 0 && Math.floor(t * 14) % 2;
				r.sprite(p.x, p.y, 0, this.assets.players[idx], {
					t: speed > 8 ? t : 0,
					anchor: "center",
					rot: angle + Math.PI / 2,
					scale: 1.45,
					steps: 32,
					flash: p.flash > 0 && !opts.reducedFlashes ? "#ecfff3" : undefined,
					flashMix: 0.8,
					alpha: blink ? 0.45 : 1,
					bias: 200,
				});
				if (speed > 12 || p.boostT > 0)
					r.queue(
						p.x,
						p.y,
						0,
						(g) => {
							const tip = p.boostT > 0 ? 35 : 20 + Math.sin(t * 40) * 4;
							const [x1, y1] = point(sx, sy, angle + Math.PI, 12),
								[x2, y2] = point(sx, sy, angle + Math.PI, tip);
							P.line(
								g,
								x1,
								y1,
								x2,
								y2,
								p.boostT > 0 ? "#83eee3" : "#ff9a63",
								p.boostT > 0 ? 7 : 3,
							);
							P.line(g, x1, y1, x2, y2, "#f4f7c1", 2);
						},
						{ bias: 100, emissive: true },
					);
			}
			r.overlay((g) => {
				if (p.invuln > 0)
					ring(
						g,
						sx,
						sy,
						ground ? 29 : 25,
						"#73a9b6",
						1,
						t * 2,
						TAU * 0.85,
						32,
					);
				if (p.lock) {
					ring(g, sx, sy, 30, "#cfdb91", 1);
					E.font.text(g, "LOCK - PULSE", sx, sy - 43, "#e0e9b5", {
						align: "center",
						outline: false,
					});
				}
				P.rect(g, sx - 6, sy + (ground ? 23 : 24), 13, 11, "#08121d");
				E.font.text(
					g,
					String(idx + 1),
					sx + 0.5,
					sy + (ground ? 25 : 26),
					color,
					{ align: "center", outline: false },
				);
				// Three different striping patterns supplement color and number.
				for (let j = 0; j <= idx; j++)
					P.rect(g, sx - 12 + j * 3, sy + (ground ? 27 : 28), 1, 4, color);
				if (p.pulse <= 0)
					ring(
						g,
						sx,
						sy,
						ground ? 24 : 21,
						"#375a64",
						1,
						-Math.PI * 0.8,
						Math.PI * 0.6,
						20,
					);
			});
		}
		projectiles(r, shots, time) {
			r.overlay((g) => {
				for (const b of shots) {
					const [x, y] = r.w(b.x, b.y, 0),
						v = Math.hypot(b.vx || 0, b.vy || 0) || 1;
					const length = b.owner === -1 ? 9 : 16;
					const px = x - ((b.vx || 0) / v) * length,
						py = y - ((b.vy || 0) / v) * length;
					if (b.owner === -1) {
						P.line(g, px, py, x, y, "#6d3f40", 5);
						P.line(g, px, py, x, y, "#ff9c78", 3);
						P.rect(g, x - 1, y - 1, 2, 2, "#fff0bd");
					} else {
						P.line(g, px, py, x, y, "#39727e", 4);
						P.line(g, px, py, x, y, "#b4fff0", Math.max(1, b.r || 2));
						P.rect(g, x, y, 2, 2, "#ffffff");
					}
				}
			});
		}
		pickup(r, p, t) {
			r.queue(
				p.x,
				p.y,
				0,
				(g) => {
					const [x, y] = r.w(p.x, p.y, 0),
						yy = y + Math.sin(t * 4 + p.id) * 2;
					P.ddisc(g, x, yy, 16, "#73dfbf", 0.16);
					P.poly(
						g,
						[
							[x, yy - 8],
							[x + 8, yy],
							[x, yy + 8],
							[x - 8, yy],
						],
						"#264d50",
					);
					P.poly(
						g,
						[
							[x, yy - 6],
							[x + 5, yy],
							[x, yy + 6],
							[x - 5, yy],
						],
						"#b0f7c9",
					);
					P.line(g, x - 2, yy, x + 2, yy, "#ffffff", 2);
					ring(g, x, yy, 11, "#478b82", 1, t, Math.PI * 1.4, 24);
				},
				{ bias: 150, emissive: true },
			);
		}
		ground(r, s, t) {
			r.queue(
				480,
				-900,
				0,
				(g) => {
					// Planetary defense site: the station's architecture is retained after orbital retreat.
					for (let i = 0; i < 34; i++) {
						const x = i * 31,
							h = 12 + hash(i + 3) * 32;
						P.rect(g, x, 423 - h, 27, h, "#1b2c3b");
						P.rect(g, x + 4, 423 - h, 1, h, "#304251");
						if (i % 3 === 0) {
							P.rect(g, x + 8, 415 - h, 10, 3, "#425568");
							P.rect(g, x + 12, 404 - h, 2, 14, "#2a4352");
						}
					}
					P.rect(g, 0, 423, 960, 117, "#112333");
					P.rect(g, 0, 425, 960, 2, "#55727f");
					P.rect(g, 0, 430, 960, 13, "#233b4b");
					for (let i = 0; i < 15; i++) {
						const x = i * 69 - 20;
						plate(g, x, 435, 62, 49, i % 2 ? "#415967" : "#394e61");
						P.rect(g, x + 9, 443, 44, 20, "#1d3345");
						for (let j = 0; j < 6; j++)
							P.rect(g, x + 12 + j * 7, 446, 3, 13, "#334c5c");
						if (i % 3 === 1) {
							P.rect(g, x + 10, 468, 40, 3, "#8c805e");
							for (let j = 0; j < 5; j++)
								P.rect(g, x + 13 + j * 7, 468, 3, 3, "#d2bd86");
						}
					}
					P.rect(g, 0, 483, 960, 6, "#0c1826");
					for (let j = 0; j < 2; j++) {
						P.rect(g, 16, 456 + j * 24, 928, 1, "#7e9298");
						P.rect(g, 16, 458 + j * 24, 928, 1, "#0b1827");
					}
					// Defeat leaves scorched vents, smoke, and emergency lamps.
					const damaged =
						(s.objective?.integrity || 100) < 70 ||
						(s.outcomes || []).some((o) => o && o.success === false);
					if (damaged)
						for (let j = 0; j < 8; j++) {
							const x = 110 + j * 101;
							P.poly(
								g,
								[
									[x - 11, 433],
									[x - 6, 426],
									[x + 2, 436],
									[x + 11, 431],
									[x + 9, 447],
									[x - 8, 448],
								],
								"#1a2530",
							);
							P.rect(
								g,
								x - 4,
								433,
								3,
								4,
								Math.floor(t * 7 + j) % 3 ? "#d39a5c" : "#e5bc78",
							);
							P.ddisc(
								g,
								x + Math.sin(j + t) * 4,
								413 - ((t * 13 + j * 12) % 32),
								4 + (j % 3),
								"#5b5b5d",
								0.28,
							);
						}
					E.font.text(
						g,
						"FORTRESS 13  /  SURFACE BATTERY",
						480,
						405,
						"#708a97",
						{ align: "center", outline: false },
					);
				},
				{ bias: -900 },
			);
		}
		siegeShip(r, b, t, scale = 1, distant = false) {
			const x = Number.isFinite(b.x) ? b.x : 480,
				y = Number.isFinite(b.y) ? b.y : 125;
			r.queue(
				x,
				-500,
				0,
				(g) => {
					const [sx, sy] = r.w(x, y, 0),
						q = (a, c) => [sx + a * scale, sy + c * scale];
					const poly = (pts, c) =>
						P.poly(
							g,
							pts.map((v) => q(...v)),
							c,
						);
					const rect = (a, c, w, h, color) =>
						P.rect(g, ...q(a, c), w * scale, h * scale, color);
					const phase = b.phase || 0;
					P.ddisc(
						g,
						sx,
						sy + 10 * scale,
						130 * scale,
						distant ? "#6d4661" : "#9b5571",
						distant ? 0.06 : 0.11,
					);
					// Layered dreadnought with two forked wings and a keel; dark hull, warm component cores.
					poly(
						[
							[-145, -12],
							[-128, -32],
							[-93, -30],
							[-81, -16],
							[-40, -16],
							[-27, -38],
							[27, -38],
							[40, -16],
							[81, -16],
							[93, -30],
							[128, -32],
							[145, -12],
							[134, 13],
							[110, 24],
							[88, 18],
							[68, 31],
							[37, 27],
							[22, 42],
							[-22, 42],
							[-37, 27],
							[-68, 31],
							[-88, 18],
							[-110, 24],
							[-134, 13],
						],
						"#09121d",
					);
					poly(
						[
							[-141, -15],
							[-127, -31],
							[-95, -29],
							[-81, -13],
							[-38, -13],
							[-25, -36],
							[25, -36],
							[38, -13],
							[81, -13],
							[95, -29],
							[127, -31],
							[141, -15],
							[131, 9],
							[110, 19],
							[86, 13],
							[67, 26],
							[34, 22],
							[20, 36],
							[-20, 36],
							[-34, 22],
							[-67, 26],
							[-86, 13],
							[-110, 19],
							[-131, 9],
						],
						distant ? "#344052" : "#7d7481",
					);
					poly(
						[
							[-136, -13],
							[-125, -27],
							[-98, -25],
							[-83, -8],
							[-36, -8],
							[-22, -31],
							[22, -31],
							[36, -8],
							[83, -8],
							[98, -25],
							[125, -27],
							[136, -13],
							[126, 5],
							[109, 14],
							[84, 8],
							[66, 21],
							[31, 17],
							[17, 30],
							[-17, 30],
							[-31, 17],
							[-66, 21],
							[-84, 8],
							[-109, 14],
							[-126, 5],
						],
						distant ? "#202b3c" : "#3e3c52",
					);
					for (const side of [-1, 1]) {
						plate(
							g,
							...q(side * 109 - 20, -17),
							40 * scale,
							27 * scale,
							distant ? "#354055" : "#665c70",
							"#ab9b9f",
						);
						for (let j = 0; j < 5; j++)
							rect(side * 109 - 12 + j * 5, -12, 2, 13, "#242b3b");
						rect(side * 91 - 5, 9, 10, 12, "#282d3e");
						rect(side * 91 - 3, 13, 6, 10, phase === 0 ? "#f0ad76" : "#766375");
						rect(side * 58 - 14, -4, 28, 20, "#252d40");
						rect(side * 58 - 10, -2, 20, 2, "#9c8a93");
						for (let j = 0; j < 3; j++)
							rect(side * 58 - 8 + j * 7, 6, 3, 5, "#a9867e");
						P.line(
							g,
							...q(side * 95, -25),
							...q(side * 100, -40),
							"#8d8696",
							scale,
						);
						P.rect(
							g,
							...q(side * 100 - 1, -41),
							3 * scale,
							2 * scale,
							Math.floor(t * 2) % 2 ? "#f3b88e" : "#634d60",
						);
					}
					plate(
						g,
						...q(-19, -29),
						38 * scale,
						56 * scale,
						distant ? "#444459" : "#8d7a87",
						"#d4b2ad",
					);
					rect(-13, -23, 26, 39, "#322d43");
					rect(-9, -19, 18, 26, phase >= 2 ? "#b0636a" : "#685d7b");
					rect(-5, -15, 10, 17, phase >= 2 ? "#ffca92" : "#be91ac");
					rect(-2, -12, 3, 10, "#fce5b5");
					for (let i = 0; i < 6; i++) rect(-68 + i * 27, -20, 5, 2, "#ac919a");
					// Match wind-ups to the simulation: batteries at cycle 2, emitter volleys at 4.5, core fan at 1.3.
					if (!distant) {
						const cycle = b.cycle || 0,
							phaseTime = cycle % (phase === 2 ? 5 : 6);
						if (phase === 0 && phaseTime > 0.55 && phaseTime < 2.0)
							for (const c of b.components || []) {
								if (c.hp <= 0) continue;
								const [laneX, laneY] = r.w(c.x, c.y, 0);
								for (let yy = laneY + 27; yy < 428; yy += 19)
									for (const dx of [-35, 35])
										P.line(g, laneX + dx, yy, laneX + dx, yy + 9, "#cc8b6c");
							}
						if (phase === 1 && phaseTime < 4.5)
							for (const side of [-1, 1]) {
								const tx = sx + side * 115,
									ty = 457;
								P.line(
									g,
									sx + side * 70 * scale,
									sy + 30,
									tx,
									ty,
									phaseTime > 1.5 ? "#8aa56d" : "#4f644d",
									1,
								);
							}
						if (phase === 2 && phaseTime > 0.3 && phaseTime < 1.3)
							for (let k = -3; k <= 3; k++) {
								const norm = Math.hypot(k * 0.24, 1),
									dx = (k * 0.24) / norm,
									dy = 1 / norm;
								for (let d = 30; d < 260; d += 19)
									P.line(
										g,
										sx + dx * d,
										sy + 30 + dy * d,
										sx + dx * (d + 8),
										sy + 30 + dy * (d + 8),
										"#a76a63",
									);
							}
						if (b.hp > 0 && b.maxHp > 0) {
							P.rect(
								g,
								sx - 102 * scale,
								sy - 52 * scale,
								204 * scale,
								6,
								"#162334",
							);
							P.rect(
								g,
								sx - 102 * scale,
								sy - 52 * scale,
								204 * scale * Math.max(0, b.hp / b.maxHp),
								4,
								"#e0a47d",
							);
						}
					}
				},
				{ bias: -500 },
			);
			if (!distant)
				for (let i = 0; i < (b.components || []).length; i++) {
					const c = b.components[i];
					const cx = Number.isFinite(c.x) ? c.x : x + (i - 0.5) * 115,
						cy = Number.isFinite(c.y) ? c.y : y + 16;
					r.queue(
						cx,
						cy,
						0,
						(g) => {
							const [sx, sy] = r.w(cx, cy, 0),
								dead = c.hp <= 0,
								open = c.open !== false;
							P.disc(g, sx + 2, sy + 3, 20, "#101c2a");
							P.poly(
								g,
								[
									[sx - 17, sy - 11],
									[sx - 9, sy - 18],
									[sx + 9, sy - 18],
									[sx + 17, sy - 11],
									[sx + 17, sy + 10],
									[sx + 8, sy + 17],
									[sx - 8, sy + 17],
									[sx - 17, sy + 10],
								],
								dead ? "#36404b" : "#9a8490",
							);
							P.disc(
								g,
								sx,
								sy - 1,
								13,
								dead ? "#182938" : open ? "#7a495f" : "#4b465b",
							);
							if (!dead && open) {
								P.disc(
									g,
									sx,
									sy - 1,
									8,
									c.type === "emitter" ? "#bfda98" : "#f5b983",
								);
								P.rect(g, sx - 2, sy - 6, 3, 9, "#ffedc1");
								ring(
									g,
									sx,
									sy,
									24 + Math.sin(t * 4) * 2,
									"#f0bf8b",
									1,
									t + i,
									TAU * 0.75,
									30,
								);
							} else if (!dead) {
								P.rect(g, sx - 13, sy - 7, 26, 12, "#607080");
								P.rect(g, sx - 12, sy - 8, 24, 1, "#d5b7b1");
							}
							if (dead) {
								P.line(g, sx - 10, sy - 10, sx + 7, sy + 9, "#101b2a", 4);
								P.rect(g, sx + 7, sy - 2, 4, 3, "#bf855f");
							}
							if (!dead && c.maxHp > 0) {
								P.rect(g, sx - 18, sy + 26, 36, 3, "#162334");
								P.rect(
									g,
									sx - 18,
									sy + 26,
									(c.hp / c.maxHp) * 36,
									2,
									"#f2bc89",
								);
							}
						},
						{ bias: 140 },
					);
				}
		}
		drawEffects(r, t, opts) {
			r.overlay((g) => {
				for (const e of this.effects) {
					const age = Math.max(0, t - e.birth),
						[x, y] = r.w(e.x || 480, e.y || 270, 0),
						strength = 1 - Math.min(1, age);
					if (e.kind === "pulse") {
						ring(g, x, y, 10 + age * 210, "#8ce5dc", age < 0.15 ? 3 : 1);
						ring(g, x, y, 6 + age * 185, "#3f9b9c", 1);
					} else if (e.kind === "pickup") {
						ring(g, x, y, 8 + age * 27, "#94dcad", 1);
						E.font.text(g, "+ CHARGE", x, y - 16 - age * 20, "#c2f5cd", {
							align: "center",
							outline: false,
						});
					} else {
						const big =
							e.kind === "kill" || e.kind === "win" || e.kind === "boss";
						if (big && age < 0.25) {
							P.disc(
								g,
								x,
								y,
								(1 - age * 3) * 14,
								opts.reducedFlashes ? "#d9ab78" : "#f7dfaa",
							);
							ring(g, x, y, 6 + age * 100, "#b08064", 2);
						}
						for (let k = 0; k < (big ? 13 : 6); k++) {
							const a = hash(k * 13 + (Number(e.id) || 1)) * TAU,
								dist = age * (25 + hash(k + 9) * (big ? 95 : 45));
							const [sx, sy] = point(x, y, a, dist),
								len = (big ? 5 : 3) * strength;
							P.line(
								g,
								sx,
								sy,
								...point(sx, sy, a, len),
								age < 0.2 ? "#fff0b9" : age < 0.5 ? "#ffb176" : "#8e695a",
								age < 0.35 ? 2 : 1,
							);
						}
						if (big && age > 0.15)
							P.ddisc(
								g,
								x,
								y - age * 12,
								7 + age * 10,
								"#6e6969",
								strength * 0.25,
							);
					}
				}
			});
		}
		retreat(r, s, t) {
			r.overlay((g) => {
				const progress = 1 - Math.min(1, Math.max(0, (s.timer || 0) / 4));
				for (let i = 0; i < 3; i++) {
					const x = 390 + i * 80,
						y = 300 + progress * 160;
					P.line(g, x, y - 21, x, y + 25, "#7edbd5", 3);
					P.line(g, x, y - 20, x, y, "#f6f2cf", 1);
				}
				P.rect(g, 0, 85, 960, 1, "#6b8c9a");
				P.rect(g, 0, 455, 960, 1, "#6b8c9a");
			});
		}
		victory(r, t) {
			r.overlay((g) => {
				for (let k = 0; k < 24; k++) {
					const x = hash(k + 491) * 900 + 30,
						y = (hash(k + 71) * 400 + t * (8 + (k % 3))) % 430;
					P.rect(g, x, y, 2, 2 + (k % 3), k % 2 ? "#d6d7b1" : "#80c9c2");
				}
			});
		}
		debug(r, s) {
			r.overlay((g) => {
				for (const e of [...(s.enemies || []), ...(s.players || [])]) {
					const [x, y] = r.w(e.x, e.y, 0);
					ring(g, x, y, e.r || 10, "#8bd686", 1, 0, TAU, 24);
					E.font.text(g, String(e.id), x + 15, y - 3, "#b0d9a9", {
						outline: false,
					});
				}
				for (const b of s.shots || []) {
					const a = r.w(b.px, b.py, 0),
						c = r.w(b.x, b.y, 0);
					P.line(g, ...a, ...c, "#b4a6f8", 1);
				}
			});
		}
	}
	SF.Renderer = SiegeRenderer;
})();
