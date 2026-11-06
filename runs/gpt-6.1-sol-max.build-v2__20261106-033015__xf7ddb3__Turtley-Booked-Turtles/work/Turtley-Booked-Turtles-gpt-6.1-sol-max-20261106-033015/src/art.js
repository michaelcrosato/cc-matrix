((T) => {
	const E = My3D2dge,
		{ px } = E,
		INK = "#101e2a",
		CREAM = "#fff0c4";
	T.seatColor = (i) => (i === 0 ? "#9ed878" : "#f3b579");
	T.symbol = (g, x, y, n, c, s = 1) => {
		if (n === 0) {
			px.poly(
				g,
				[
					[x, y - 3 * s],
					[x + 3 * s, y],
					[x, y + 3 * s],
					[x - 3 * s, y],
				],
				c,
			);
			px.dot(g, x, y, CREAM);
		}
		if (n === 1) {
			px.rect(g, x - 2 * s, y - 2 * s, 4 * s, 4 * s, c);
			px.rect(g, x - s, y - s, 2 * s, 2 * s, CREAM);
		}
		if (n === 2) {
			px.line(g, x - 3 * s, y, x + 3 * s, y, c, s);
			px.line(g, x, y - 3 * s, x, y + 3 * s, c, s);
			px.dot(g, x, y, CREAM);
		}
		if (n === 3) {
			px.ell(g, x, y, 3 * s, 3 * s, c);
			px.ell(g, x, y, 1 * s, 1 * s, CREAM);
		}
	};
	class TurtleRig extends E.Blob {
		constructor(seat = 0, baby = false) {
			super({ R: baby ? 3 : 6, feet: true });
			this.seat = seat;
			this.baby = baby;
			this.actor = {};
			this.angle = -Math.PI / 2;
		}
		update(dt, a = {}) {
			this.actor = a;
			super.update(dt, {
				walk: (a.walk || 0) / 3.5,
				look: [Math.cos(a.facing ?? 0), Math.sin(a.facing ?? 0)],
				squash: a.emote > 0 ? Math.sin(a.emote * 14) * 0.08 : 0,
			});
			const f = a.facing ?? this.angle;
			const d = ((f - this.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
			this.angle += d * Math.min(1, dt * 16);
		}
		draw(g, x, y, view, scale = 1) {
			const s = scale * (view.zoom || 1) * (this.baby ? 0.56 : 1),
				a = this.actor,
				t = this.t,
				skin = E.tones(this.seat === 0 ? "#94be77" : "#b1cc89"),
				shell = E.tones(this.seat === 0 ? "#477e58" : "#467b89"),
				col = T.seatColor(this.seat);
			const hurt = a.hurt > 0,
				breath = Math.sin(t * 3) * 0.25,
				bob = (a.walk > 0.1 ? Math.sin(t * 17) * 0.3 : breath) * s;
			y -= bob;
			const dir = [Math.cos(this.angle), Math.sin(this.angle)];
			const point = (ac, fw) => [
				x + (ac * dir[1] + fw * dir[0]) * s,
				y + (-ac * dir[0] + fw * dir[1]) * s,
			];
			const ell = (ac, fw, rx, ry, c) => {
				const p = point(ac, fw);
				px.ell(g, p[0], p[1], rx * s, ry * s, c);
			};
			if (!hurt) {
				for (const side of [-1, 1])
					for (const fw of [-1, 1]) {
						const gait =
							Math.sin(t * 16 + side * fw * 1.5) * (a.walk > 0.1 ? 1 : 0);
						ell(side * 5, fw * 3 + gait, 2, 1.8, skin.deep);
						ell(side * 5 - 0.3, fw * 3 + gait - 0.4, 1.5, 1.1, skin.base);
					}
				ell(0, 6.5, 3.2, 3, skin.deep);
				ell(0, 6.5, 2.7, 2.6, skin.base);
				ell(-0.7, 5.8, 1.6, 1.4, skin.lt);
			}
			px.ell(g, x, y, 6.3 * s, (6 + breath) * s, shell.deep);
			px.ell(
				g,
				x - 0.3 * s,
				y - 0.7 * s,
				5.5 * s,
				(5.1 + breath) * s,
				shell.base,
			);
			px.ell(g, x - 1.5 * s, y - 2.3 * s, 3.6 * s, 2.6 * s, shell.lt);
			px.ell(g, x + 1.5 * s, y + 2 * s, 3.3 * s, 2 * s, shell.sh);
			// Different scutes and a bellhop cap / neckerchief identify the two rescuers beyond hue.
			if (this.seat === 0) {
				px.poly(
					g,
					[
						[x, y - 3 * s],
						[x + 3 * s, y],
						[x, y + 3 * s],
						[x - 3 * s, y],
					],
					shell.deep,
				);
				px.poly(
					g,
					[
						[x, y - 2 * s],
						[x + 2 * s, y],
						[x, y + 2 * s],
						[x - 2 * s, y],
					],
					col,
				);
			} else {
				px.line(g, x - 4 * s, y, x + 4 * s, y, shell.deep, s);
				px.line(g, x, y - 4 * s, x, y + 4 * s, shell.deep, s);
				px.rect(g, x - 1 * s, y - 1 * s, 2 * s, 2 * s, col);
			}
			px.rect(g, x - 3 * s, y - 4 * s, 2 * s, s, shell.hi);
			if (!hurt) {
				const head = point(0, 7);
				const blink = t % 4.1 > 3.95;
				for (const side of [-1, 1]) {
					const eye = point(side * 1.5, 7.8);
					px.ell(g, eye[0], eye[1], 1.3 * s, blink ? 0.4 * s : 1.5 * s, CREAM);
					if (!blink)
						px.ell(
							g,
							eye[0] + dir[0] * 0.5 * s,
							eye[1] + dir[1] * 0.5 * s,
							0.65 * s,
							0.85 * s,
							INK,
						);
				}
				const cap = point(0, 4.9);
				if (this.seat === 0) {
					px.rect(
						g,
						cap[0] - 2.4 * s,
						cap[1] - 1.2 * s,
						4.8 * s,
						1.8 * s,
						"#e4b36c",
					);
					px.rect(g, cap[0] - 0.7 * s, cap[1] - 1.8 * s, 1.4 * s, s, CREAM);
				} else {
					px.poly(
						g,
						[
							[cap[0] - 2 * s, cap[1]],
							[cap[0] + 2 * s, cap[1]],
							[cap[0] + 3 * s, cap[1] + 3 * s],
						],
						"#efac8e",
					);
				}
			} else {
				px.line(g, x - 2 * s, y, x - s, y + s, CREAM, s);
				px.line(g, x + s, y + s, x + 2 * s, y, CREAM, s);
			}
			if (a.carried) {
				const hop =
					a.emote > 0.15
						? Math.sin(Math.min(1, (0.7 - a.emote) / 0.55) * Math.PI) * 3
						: 0;
				const by = y - 4 * s - hop * s;
				px.ell(g, x, by, 3.4 * s, 3.1 * s, "#173b37");
				px.ell(g, x - 0.4 * s, by - 0.5 * s, 2.7 * s, 2.5 * s, "#b8d97c");
				px.ell(g, x + 2.6 * s, by + 1.1 * s, 1.7 * s, 1.7 * s, "#dbe9a0");
				px.dot(g, x + 3 * s, by + 1 * s, INK);
				T.symbol(g, x - s, by - s, a.symbol ?? 0, "#fff1b0", 0.48 * s);
			}
		}
	}
	class BeetleRig extends E.Blob {
		constructor() {
			super({ R: 5, feet: true });
			this.actor = {};
		}
		update(dt, a) {
			this.actor = a;
			super.update(dt, {
				walk: (a.walk || 0) / 2.5,
				look: [Math.cos(a.facing), Math.sin(a.facing)],
				squash: a.stun > 0 ? Math.sin(this.t * 12) * 0.09 : 0,
			});
		}
		draw(g, x, y, view) {
			const a = this.actor,
				s = view.zoom || 1,
				t = this.t,
				stun = a.stun > 0,
				col = E.tones(
					stun
						? "#798b9c"
						: a.state === "red"
							? "#e66b70"
							: a.state === "yellow"
								? "#e6c85b"
								: "#6ca9d1",
				);
			const wiggle = stun ? Math.sin(t * 8) * s : 0;
			y -= a.emerge > 0 ? Math.max(0, Math.sin(a.emerge * 10)) * 2 * s : 0;
			for (const side of [-1, 1])
				for (let i = -1; i <= 1; i++) {
					const w = stun ? 0 : Math.sin(t * 23 + i + side) * 1.3;
					px.line(
						g,
						x + side * 3 * s,
						y + i * 2 * s,
						x + side * (6 + w) * s,
						y + (i * 2 + 1) * s,
						INK,
						s,
					);
					px.dot(g, x + side * (6 + w) * s, y + (i * 2 + 1) * s, col.sh);
				}
			px.ell(g, x + wiggle, y, 5.2 * s, 5.8 * s, col.deep);
			px.ell(g, x - 0.3 * s + wiggle, y - 0.7 * s, 4.5 * s, 4.7 * s, col.base);
			px.ell(g, x - 1.4 * s + wiggle, y - 2 * s, 2.5 * s, 2.4 * s, col.lt);
			px.line(g, x + wiggle, y - 4 * s, x + wiggle, y + 4 * s, col.deep, s);
			if (a.state === "red") {
				px.line(g, x - 3 * s, y - 1 * s, x, y + 2 * s, CREAM, s);
				px.line(g, x, y + 2 * s, x + 3 * s, y - 1 * s, CREAM, s);
			}
			if (a.state === "yellow") {
				px.poly(
					g,
					[
						[x, y - 3 * s],
						[x + 2 * s, y],
						[x - 2 * s, y],
					],
					CREAM,
				);
			}
			const alert = a.state !== "blue";
			for (const side of [-1, 1]) {
				px.line(
					g,
					x + side * 2 * s,
					y - 4 * s,
					x + side * (alert ? 5 : 4) * s,
					y - (alert ? 9 : 6) * s,
					col.deep,
					s,
				);
				px.disc(
					g,
					x + side * (alert ? 5 : 4) * s,
					y - (alert ? 9 : 6) * s,
					s,
					col.lt,
				);
			}
			if (!stun) {
				for (const side of [-1, 1]) {
					px.ell(g, x + side * 1.7 * s, y - 3 * s, 1.2 * s, 1.2 * s, CREAM);
					px.dot(g, x + side * 1.7 * s, y - 3 * s, INK);
				}
			} else
				for (let i = 0; i < 3; i++) {
					const ang = t * 2 + i * 2.1;
					T.symbol(
						g,
						x + Math.cos(ang) * 7 * s,
						y - 6 * s + Math.sin(ang) * 2 * s,
						2,
						"#ffe9a0",
						0.45 * s,
					);
				}
			if (a.emerge > 0) px.ell(g, x, y + 4 * s, 6 * s, 1.5 * s, "#eac585");
			if (a.stun > 0 && a.stun < 0.7)
				px.line(g, x - 2 * s, y + 1 * s, x + 2 * s, y + 1 * s, CREAM, s);
		}
	}
	T.TurtleRig = TurtleRig;
	T.BeetleRig = BeetleRig;
	class Art {
		constructor(game) {
			this.game = game;
			this.rigs = new Map();
			this.effects = [];
			this.lastEvent = 0;
			this.map = null;
			this.floor = -1;
			this.state = null;
		}
		update(dt, state) {
			this.state = state;
			if (!state) return;
			if (this.floor !== state.floor) {
				this.floor = state.floor;
				this.map = T.makeMap(T.FLOORS[state.floor]);
				this.rigs.clear();
				this.effects = [];
			}
			for (const a of [...state.players, ...state.enemies]) {
				let rig = this.rigs.get(a.id);
				if (!rig) {
					rig = a.seat !== undefined ? new TurtleRig(a.seat) : new BeetleRig();
					this.rigs.set(a.id, rig);
				}
				const room = state.rooms.find((r) => r.id === a.carried);
				const near =
					!!a.carried &&
					state.enemies.some((b) => Math.hypot(a.x - b.x, a.y - b.y) < 1.4);
				rig.update(this.game.reduceMotion ? dt * 0.3 : dt, {
					...a,
					emote: this.game.reduceMotion
						? 0
						: near
							? Math.max(a.emote || 0, 0.22)
							: a.emote,
					symbol: room?.symbol,
				});
			}
			for (const e of state.events || [])
				if (e.id > this.lastEvent) {
					this.lastEvent = e.id;
					if (e.x !== undefined) {
						this.effects.push({ ...e, t: 0 });
						if (
							!this.game.reduceMotion &&
							["pickup", "delivery", "trigger", "refill"].includes(e.type)
						)
							this.game.particles.glints(
								(e.x + 0.5) * 16,
								(e.y + 0.5) * 16,
								2,
								5,
								e.type === "trigger" ? "#a8d6f5" : "#ffe0a0",
							);
					}
				}
			for (const e of this.effects) e.t += dt;
			this.effects = this.effects.filter((e) => e.t < 1.3);
			this.game.cam.smooth = 0;
			this.game.focus(168, 104, 0);
			this.game.cam.offset = [0, this.game.H > 400 ? -25 : 8];
		}
		draw(r, debug = {}) {
			const st = this.state;
			if (!st) return;
			const f = T.FLOORS[st.floor],
				game = this.game;
			r.sky(["#101e2c", "#152634", "#192e38"]);
			r.decal((g) => {
				const [x, y] = r.w(0, 0);
				px.rect(g, x - 9, y - 9, 354, 226, "#091823");
				px.rect(g, x - 6, y - 6, 348, 220, "#b09a6a");
				px.rect(g, x - 4, y - 4, 344, 216, "#2d454c");
			});
			this.map.drawFloor(r);
			this.map.queueWalls(r);
			// Shaded native props sit on wall blocks, outside navigable corridors.
			for (const [x, y, id] of f.props)
				r.shape(id, (x + 0.5) * 16, (y + 0.5) * 16, 0, {
					scale: 0.55,
					mats: { c: "porcelain" },
					hides: false,
				});
			r.actor(56, 40, 0, (g, x, y) => {
				if (st.floor === 0) {
					px.rect(g, x - 8, y - 3, 16, 6, "#805e48");
					px.rect(g, x - 7, y - 4, 14, 2, "#d8bd87");
					px.ell(g, x, y - 6, 3, 3, "#e7c77e");
					px.rect(g, x - 1, y - 10, 2, 2, "#fff0bb");
				} else if (st.floor === 1) {
					px.rect(g, x - 7, y - 7, 14, 14, "#869fa1");
					px.rect(g, x - 6, y - 6, 12, 12, "#b3c6ba");
					px.ell(g, x, y, 5, 5, "#264454");
					px.ell(g, x, y, 3.5, 3.5, "#83aaa6");
					px.line(g, x - 2, y, x + 2, y, "#e5dba7");
				} else if (st.floor === 2) {
					px.rect(g, x - 5, y + 2, 10, 6, "#ab8061");
					for (let i = 0; i < 5; i++) {
						const a = i * 1.3;
						px.line(
							g,
							x,
							y + 2,
							x + Math.cos(a) * 8,
							y - 5 + Math.sin(a) * 5,
							"#92af73",
							2,
						);
					}
				} else if (st.floor === 3) {
					px.rect(g, x - 8, y - 5, 16, 12, "#b49677");
					px.rect(g, x - 7, y - 4, 14, 7, "#b9848d");
					px.rect(g, x - 6, y - 5, 5, 3, "#edd8bc");
				} else {
					px.ell(g, x, y, 7, 7, "#987b5d");
					px.ell(g, x, y - 1, 5, 5, "#d8c18b");
					px.ell(g, x, y - 2, 3, 3, "#ffedb7");
				}
			});
			for (const room of st.rooms) {
				const x = (room.cell[0] + 0.5) * 16,
					y = (room.cell[1] + 0.5) * 16;
				r.actor(x, y, 0, (g, ox, oy) => {
					px.rect(g, ox - 6, oy - 7, 12, 14, "#101c29");
					px.rect(g, ox - 5, oy - 7, 10, 12, "#99744e");
					px.rect(
						g,
						ox - 4,
						oy - 6,
						8,
						10,
						room.status === "hidden" ? "#3a5863" : "#293f46",
					);
					px.rect(g, ox - 4, oy - 6, 1, 10, "#b9a078");
					if (room.status === "hidden")
						E.font.text(g, "?", ox, oy - 4, CREAM, {
							align: "center",
							outline: false,
						});
					else if (room.status === "revealed") {
						px.ell(g, ox, oy, 3.2, 3, "#b3d77d");
						px.ell(g, ox + 2.5, oy + 1, 1.6, 1.6, "#e2e7a1");
						px.dot(g, ox + 3, oy, INK);
					} else {
						px.rect(g, ox - 2, oy - 3, 4, 6, "#102d34");
						if (room.status === "delivered")
							T.symbol(g, ox, oy, 2, "#b1cf9b", 0.5);
					}
					if (debug.reveal)
						E.font.text(
							g,
							room.kind === "baby" ? "B" : "!",
							ox,
							oy + 7,
							"#ffd58a",
							{ align: "center", font: "tiny", outline: false },
						);
				});
			}
			for (const h of st.homes) {
				const x = (h.cell[0] + 0.5) * 16,
					y = (h.cell[1] + 0.5) * 16,
					room = st.rooms.find((q) => q.id === h.reserved),
					active = !!room || h.glow > 0,
					col = room ? T.seatColor(h.seat) : f.accent;
				r.actor(x, y, 0, (g, ox, oy) => {
					if (active) px.ell(g, ox, oy + 3, 8, 7, E.shade(col, -0.5));
					px.poly(
						g,
						[
							[ox - 8, oy - 3],
							[ox, oy - 10],
							[ox + 8, oy - 3],
						],
						active ? col : "#697674",
					);
					px.rect(g, ox - 6, oy - 3, 12, 11, active ? "#dfcf9f" : "#6f7c78");
					px.rect(g, ox - 4, oy, 8, 8, active ? "#fce9a5" : "#243b41");
					if (room)
						T.symbol(g, ox, oy + 3, room.symbol, T.seatColor(h.seat), 0.85);
					else if (h.glow > 0)
						E.font.text(g, "♥", ox, oy, "#ed9d91", {
							align: "center",
							outline: false,
						});
					else px.rect(g, ox - 2, oy + 3, 4, 5, "#183139");
				});
				if (active) game.lights.add(x, y, 0, 27, 0.5, { color: col });
			}
			const s = st.supply,
				[sx, sy] = f.supply.map((c) => (c + 0.5) * 16);
			r.actor(sx, sy, 0, (g, x, y) => {
				px.ell(g, x, y + 2, 8, 7, "#0b1f2b");
				px.ell(g, x, y, 7, 6, "#a2a998");
				px.ell(g, x, y - 1, 6, 5, s.ready ? "#7cc9bf" : "#405e65");
				px.rect(g, x - 3, y - 4, 6, 6, s.ready ? "#c8f0ce" : "#6c9090");
				px.rect(g, x - 1, y - 6, 2, 10, s.ready ? "#fff3c5" : "#273e47");
				px.rect(g, x - 5, y - 2, 10, 2, s.ready ? "#fff3c5" : "#273e47");
				if (!s.ready)
					E.font.text(g, String(Math.ceil(s.timer)), x, y - 3, CREAM, {
						align: "center",
						outline: false,
					});
			});
			if (s.ready) game.lights.add(sx, sy, 0, 25, 0.5, { color: "#aee8c4" });
			if (st.bomb) {
				const b = st.bomb,
					x = (b.x + 0.5) * 16,
					y = (b.y + 0.5) * 16;
				r.actor(x, y, 0, (g, ox, oy) => {
					px.ell(g, ox, oy + 1, 5, 4, "#192637");
					px.ell(g, ox, oy, 4, 4, "#d2a77a");
					px.ell(g, ox - 1, oy - 1, 2, 2, "#fce4b4");
					px.line(g, ox + 1, oy - 4, ox + 3, oy - 6, "#d6e0ab");
					px.disc(
						g,
						ox + 3,
						oy - 6,
						1 + (Math.sin(game.time * 12) > 0 ? 1 : 0),
						"#ffe7ab",
					);
				});
			}
			for (const a of [...st.enemies, ...st.players]) {
				if (a.active === false) continue;
				const x = (a.x + 0.5) * 16,
					y = (a.y + 0.5) * 16;
				r.shadow(x, y, 5, 0.28);
				const rig = this.rigs.get(a.id);
				r.actor(x, y, 0, (g, ox, oy) => {
					if (
						a.invuln > 0 &&
						!game.reduceMotion &&
						game.settings.flashes > 0 &&
						Math.floor(game.time * 8) % 2 === 0
					)
						px.ell(g, ox, oy, 8, 8, "#e1e6ba");
					rig?.draw(g, ox, oy, r.view);
					if (
						a.seat !== undefined &&
						st.players.filter((p) => p.active).length > 1
					) {
						E.font.text(
							g,
							String(a.seat + 1),
							ox,
							oy + 10,
							T.seatColor(a.seat),
							{ align: "center", font: "tiny", outline: false },
						);
					}
				});
			}
			r.overlay((g) => {
				for (const e of this.effects) {
					const [x, y] = r.w((e.x + 0.5) * 16, (e.y + 0.5) * 16, 0),
						t = e.t;
					if (e.type === "delivery") {
						px.ell(
							g,
							x + Math.sin(t * 3) * 5,
							y - 8 - Math.sin(Math.min(t, 1) * Math.PI) * 8,
							2.5,
							2,
							"#cfdea0",
						);
						E.font.text(g, "+400", x, y - 17 - t * 8, "#ffdd9e", {
							align: "center",
							outline: false,
						});
					}
					if (e.type === "sight" && t < 0.55) {
						E.font.text(g, "!", x, y - 17, "#ffe2a0", {
							align: "center",
							outline: false,
							scale: 2,
						});
						const p = st.players.find((p) => p.seat === e.seat);
						if (p && t < 0.25 && !game.reduceMotion) {
							const [tx, ty] = r.w((p.x + 0.5) * 16, (p.y + 0.5) * 16);
							for (let i = 0; i < 5; i++)
								px.dot(
									g,
									x + ((tx - x) * i) / 5,
									y + ((ty - y) * i) / 5,
									"#efce79",
								);
						}
					}
					if (e.type === "empty")
						E.font.text(g, "SUPPLY +", x, y - 14, "#f2b291", {
							align: "center",
							outline: false,
						});
					if (e.type === "pickup")
						E.font.text(
							g,
							e.points ? "+100 hello!" : "hello again!",
							x,
							y - 16 - t * 6,
							"#e3efb0",
							{ align: "center", outline: false },
						);
					if (e.type === "trigger") {
						if (e.points)
							E.font.text(g, "+" + e.points, x, y - 17 - t * 5, "#c2e4df", {
								align: "center",
								outline: false,
							});
						const rr = Math.min(26, t * 65);
						for (let i = 0; i < 12; i++) {
							const a = (i * Math.PI) / 6;
							px.disc(
								g,
								x + Math.cos(a) * rr,
								y + Math.sin(a) * rr,
								1,
								"#afdfef",
							);
						}
					}
				}
				if (debug.graph) {
					for (let y = 1; y < 12; y++)
						for (let x = 1; x < 20; x++)
							if (f.rows[y][x] !== "#") {
								const p = r.w((x + 0.5) * 16, (y + 0.5) * 16);
								px.dot(g, ...p, "#70e5e0");
							}
				}
				if (debug.collision) {
					for (const a of [...st.players, ...st.enemies]) {
						const [x, y] = r.w((a.x + 0.5) * 16, (a.y + 0.5) * 16);
						px.rect(g, x - 4, y - 4, 8, 1, "#ff83d5");
						px.rect(g, x - 4, y + 4, 8, 1, "#ff83d5");
					}
				}
				if (debug.los) {
					for (const b of st.enemies.filter(
						(b) => b.state === "yellow" && b.sighted,
					)) {
						const p =
							st.players.find((p) => p.seat === b.target) || st.players[0];
						px.line(
							g,
							...r.w((b.x + 0.5) * 16, (b.y + 0.5) * 16),
							...r.w((p.x + 0.5) * 16, (p.y + 0.5) * 16),
							"#ffe083",
						);
					}
				}
				this.hud(r, g, st);
			});
		}
		hud(r, g, st) {
			const f = T.FLOORS[st.floor],
				left = (r.W - 336) / 2,
				top = (r.H - 208) / 2 + (this.game.H > 400 ? -25 : 8),
				portrait = r.H > 400;
			const tx = (s, x, y, c = CREAM, o = {}) =>
				E.font.text(g, s, x, y, c, {
					outline: false,
					shadow: INK,
					scale: portrait ? 2 : 1,
					...o,
				});
			const headerY = top - (portrait ? 47 : 27),
				countsY = top - (portrait ? 27 : 16);
			tx(
				String(st.floor + 1).padStart(2, "0") + " / 05",
				left,
				headerY,
				f.accent,
			);
			tx(f.name, left + (portrait ? 85 : 57), headerY, CREAM);
			tx("HOME " + st.delivered + "/" + f.quota, left, countsY, "#cfe3ac");
			E.ui.hearts(g, left + 99, countsY, st.lives, 3);
			tx(
				st.bomb ? (portrait ? "BOMB SET" : "BOMB ACTIVE") : "BOMBS " + st.stock,
				left + 163,
				countsY,
				st.stock ? "#e2c895" : "#f0a3a0",
			);
			tx(String(st.score).padStart(6, "0"), left + 336, countsY, CREAM, {
				align: "right",
			});
			const p =
				st.players.find(
					(p) =>
						p.active &&
						(p.seat === this.game.localSeat || this.game.localSeat == null),
				) || st.players[0];
			const message = p?.carried
				? "Take your passenger to the matching lit home."
				: st.floorTime < 16
					? "Visit a ? room. A tiny guest may need a lift."
					: "Blue wanders. Yellow sees. Red follows.";
			const yy = top + 220;
			tx(
				st.demo ? "DEMO  •  Any input to check in" : message,
				r.W / 2,
				yy,
				f.accent,
				{ align: "center", wrap: portrait ? 336 : undefined },
			);
			if (p?.carried) {
				const room = st.rooms.find((q) => q.id === p.carried);
				T.symbol(
					g,
					portrait ? r.W / 2 : r.W / 2 - 145,
					yy + (portrait ? -10 : 3),
					room?.symbol || 0,
					T.seatColor(p.seat),
					0.8,
				);
			}
			const input = this.game.input,
				device = input.lastDevice;
			if (!st.demo && device !== "touch")
				tx(
					this.game.players.length > 1 && input.half === "left"
						? "P1 WASD + Space     P2 Arrows + Right Shift"
						: (device === "gamepad" ? "Stick / D-pad" : "WASD / Arrows") +
								"  Move     " +
								input.label("bomb") +
								"  Bug bomb     " +
								input.label("pause") +
								"  Pause",
					r.W / 2,
					yy + 13,
					"#a8bfbd",
					{ align: "center", font: "tiny" },
				);
			if (st.practice || st.assisted)
				tx(
					st.practice
						? "PRACTICE • UNRANKED"
						: "TOUCH ASSIST • SEPARATE RECORD",
					r.W / 2,
					yy + (portrait ? 46 : 25),
					"#acccca",
					{ align: "center", scale: 1 },
				);
			if (portrait) {
				tx(
					"SMALL SHELLS. BIG ROOM SERVICE.",
					r.W / 2,
					Math.min(r.H - 135, yy + 66),
					"#96adb0",
					{ align: "center", scale: 1 },
				);
			}
			if (st.phase === "intro" || st.phase === "clear") {
				E.ui.box(
					g,
					r.W / 2 - 151,
					r.H / 2 - (portrait ? 50 : 28),
					302,
					portrait ? 100 : 56,
					{
						bg: "#102632",
						border: f.accent,
					},
				);
				tx(
					st.phase === "clear" ? "FLOOR SAFE! +250" : f.name,
					r.W / 2,
					r.H / 2 - (portrait ? 40 : 18),
					CREAM,
					{ align: "center", scale: 2 },
				);
				tx(
					st.phase === "clear" ? "Next stop: a little higher." : f.subtitle,
					r.W / 2,
					r.H / 2 + (portrait ? -17 : 1),
					f.accent,
					{ align: "center", wrap: 285 },
				);
				px.rect(g, r.W / 2 + 130, r.H / 2 - 22, 12, 24, "#6c8883");
				px.rect(g, r.W / 2 + 132, r.H / 2 - 20, 8, 20, "#254650");
				const lift = Math.max(0, Math.min(1, st.phaseTime / 2.6));
				px.rect(g, r.W / 2 + 132, r.H / 2 - 20 + lift * 13, 8, 6, "#e3c78f");
				tx(
					"Confirm to skip",
					r.W / 2,
					r.H / 2 + (portrait ? 37 : 17),
					"#a7bbb5",
					{
						align: "center",
						font: "tiny",
						scale: 1,
					},
				);
			}
		}
		ending(r, time, phaseTime = 0) {
			r.sky(["#2d4c60", "#748c89", "#dfc698"]);
			r.overlay((g) => {
				const y = r.H * 0.68,
					x = r.W * 0.67,
					u = Math.max(0, Math.min(1, (5 - phaseTime) / 5));
				for (let i = 0; i < 6; i++) {
					const cx = (i * 99 + time * 2) % r.W;
					px.ell(g, cx, 40 + i * 9, 35, 5, "#8da4a0");
				}
				px.rect(g, 0, y + 20, r.W, r.H, "#344e53");
				px.rect(g, 0, y + 16, r.W, 5, "#d0b883");
				for (let i = 0; i < r.W; i += 18) {
					px.rect(g, i, y - 5, 2, 22, "#a6aa8f");
					px.rect(g, i, y - 5, 18, 2, "#d5c797");
				}
				const ay = y - 22 - u * 26;
				px.ell(g, x, ay - 52, 67, 34, "#a56958");
				px.ell(g, x - 5, ay - 57, 60, 27, "#e8c38a");
				px.ell(g, x - 13, ay - 61, 39, 21, "#f8e0ad");
				for (const side of [-1, 1])
					px.line(g, x + side * 49, ay - 33, x + side * 33, ay + 2, "#485356");
				px.poly(
					g,
					[
						[x - 46, ay],
						[x + 44, ay],
						[x + 34, ay + 15],
						[x - 32, ay + 15],
					],
					"#724e42",
				);
				px.rect(g, x - 35, ay + 1, 70, 3, "#d5aa76");
				E.font.text(g, "SHELLTON SKY LIFT", x, ay - 60, "#3c5755", {
					align: "center",
					outline: false,
				});
				for (let i = 0; i < 26; i++) {
					const progress = Math.max(0, Math.min(1, (u - i * 0.012) / 0.6));
					const startX = 20 + (i % 13) * 9,
						startY = y + 9 + Math.floor(i / 13) * 8;
					const bx = startX + (x - 30 + (i % 9) * 7 - startX) * progress,
						by =
							startY +
							(ay + 4 + Math.floor(i / 9) * 4 - startY) * progress -
							Math.sin(progress * Math.PI) * 5;
					px.ell(g, bx, by, 3, 3, i % 2 ? "#a9cd88" : "#c3d793");
					px.ell(g, bx + 2.5, by + 0.5, 1.5, 1.5, "#e1e8b1");
					px.dot(g, bx + 3, by, INK);
				}
				const a = new TurtleRig(0),
					b = new TurtleRig(1);
				a.update(time, { walk: 1, facing: 0 });
				b.update(time + 0.5, { walk: 1, facing: 0 });
				a.draw(g, 60 + u * 30, y + 10, { zoom: 1 }, 1.5);
				b.draw(g, 83 + u * 30, y + 10, { zoom: 1 }, 1.5);
				E.font.title(g, "EVERY GUEST, HOME.", r.W / 2, 22, {
					scale: 2,
					align: "center",
					colors: ["#fff0c0", "#dfae7f"],
				});
				E.font.text(
					g,
					"26 little lodgers. One enormous reunion.",
					r.W / 2,
					44,
					"#fff1cc",
					{ align: "center", outline: false },
				);
			});
		}
		title(r, time = 0, celebrate = false) {
			r.sky(["#102132", "#1a3543", "#345258"]);
			r.overlay((g) => {
				for (let i = 0; i < 58; i++) {
					const x = (i * 97 + 13) % r.W,
						y = (i * 31 + 7) % Math.max(1, r.H - 50);
					px.dot(g, x, y, i % 4 ? "#607b7b" : "#cbbf8d");
				}
				const x = r.W * 0.73,
					y = r.H * 0.51,
					w = Math.min(172, r.W * 0.41),
					h = 174;
				px.ell(g, x, y + h * 0.55, w * 0.9, 17, "#142b36");
				px.poly(
					g,
					[
						[x - w * 0.5, y - h * 0.5],
						[x + w * 0.5, y - h * 0.5],
						[x + w * 0.5 + 20, y - h * 0.5 + 18],
						[x + w * 0.5 + 20, y + h * 0.5],
						[x - w * 0.5, y + h * 0.5],
					],
					"#1d3440",
				);
				px.rect(g, x - w * 0.5, y - h * 0.5, w, h, "#a99070");
				px.rect(g, x - w * 0.5 + 4, y - h * 0.5 + 5, w - 8, h - 9, "#5b7670");
				for (let row = 0; row < 5; row++) {
					const yy = y + h * 0.5 - 26 - row * 28;
					px.rect(g, x - w * 0.5, yy + 20, w, 3, "#d6bf90");
					for (let col = 0; col < 4; col++) {
						const xx = x - w * 0.5 + 15 + (col * (w - 28)) / 4;
						px.rect(g, xx, yy, 17, 17, "#263d46");
						px.rect(
							g,
							xx + 2,
							yy + 2,
							13,
							13,
							row <= Math.floor(time / 4) % 5 ? "#e7c98c" : "#6d9991",
						);
						px.rect(g, xx + 8, yy + 2, 1, 13, "#40616a");
						px.rect(g, xx + 2, yy + 8, 13, 1, "#40616a");
					}
				}
				px.poly(
					g,
					[
						[x - w * 0.5 - 7, y - h * 0.5],
						[x, y - h * 0.5 - 24],
						[x + w * 0.5 + 8, y - h * 0.5],
					],
					"#d5b781",
				);
				px.rect(g, x - w * 0.5 + 22, y - h * 0.5 - 8, w - 44, 16, "#163a42");
				E.font.text(g, "THE SHELLTON", x, y - h * 0.5 - 4, "#f5dea8", {
					align: "center",
					outline: false,
				});
				px.rect(g, x - 12, y + h * 0.5 - 20, 24, 21, "#132d38");
				px.rect(g, x - 10, y + h * 0.5 - 17, 20, 17, "#dfb46e");
				const rig = new TurtleRig(0);
				rig.update(time, { walk: 0.3, facing: -0.4, carried: true, emote: 0 });
				rig.draw(g, x - 31, y + h * 0.5 + 8, { zoom: 1 }, 3.2);
				const second = new TurtleRig(1);
				second.update(time + 0.8, { walk: 0.4, facing: -2.7 });
				second.draw(g, x + 31, y + h * 0.5 + 6, { zoom: 1 }, 2.6);
				if (celebrate) {
					for (let i = 0; i < 26; i++) {
						const a = i * 2.4,
							xx = x + Math.sin(a + time) * Math.min(100, w * 0.6),
							yy = y + h * 0.5 + 25 + Math.cos(a + time * 0.4) * 12;
						px.ell(g, xx, yy, 3, 3, "#bbd482");
						px.ell(g, xx + 2.7, yy + 1, 1.5, 1.5, "#e1e5a4");
					}
					E.font.title(
						g,
						"EVERY GUEST, HOME.",
						r.W / 2,
						Math.max(14, r.H * 0.12),
						{ scale: 2, align: "center", colors: ["#fff2c6", "#e9b778"] },
					);
				}
			});
		}
	}
	T.Art = Art;
})(globalThis.TB);
