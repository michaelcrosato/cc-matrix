(() => {
	const E = My3D2dge,
		{ px } = E,
		T = 24,
		W = 19,
		H = 15,
		D = [
			[0, -1],
			[1, 0],
			[0, 1],
			[-1, 0],
		];
	class ChompView {
		constructor(game) {
			this.game = game;
			this.rigs = new Map();
			this.pops = [];
			this.lastEvent = 0;
			this.overlays = false;
			this.reveal = false;
			this.prevRevision = -1;
			this.frame = null;
			this.state = null;
			this.reactions = new Map();
			this.visualPos = new Map();
			this.seatNumbers = new Map();
		}
		fit(title = false) {
			const g = this.game;
			const z = Math.max(
				0.5,
				Math.min((g.W - 48) / (W * T), (g.H - 108) / (H * T), 1.65),
			);
			if (Math.abs(g.zoom - z) > 0.005) g.setZoom(z);
			g.cam.smooth = 0;
			g.focus(
				(W * T) / 2 - (title && g.W / g.H > 1.3 ? 110 : 0),
				(H * T) / 2 + 3,
				0,
			);
		}
		rig(a, kind, index = 0) {
			const id = `${kind}:${a.id}`;
			if (!this.rigs.has(id)) {
				const c =
					kind === "hero"
						? index
							? "#91bdf4"
							: "#5ee4c4"
						: kind === "food"
							? a.power
								? "#ffd16e"
								: "#efab8e"
							: ["#ee718f", "#b19cfa", "#f0a164"][index % 3];
				const t = E.tones(c);
				this.rigs.set(
					id,
					new E.Blob({
						R:
							kind === "food"
								? 3.9
								: kind === "hero"
									? 6.9
									: index === 2
										? 7.5
										: 6.7,
						feet: true,
						mouth: kind === "enemy" ? "fangs" : true,
						face: "front",
						horns: kind === "enemy" && index === 0,
						ears: kind === "enemy" && index === 1 ? "cat" : undefined,
						tail: kind === "enemy" && index === 2,
						colors: {
							dk: t.deep,
							base: c,
							lt: t.lt,
							spec: "#fff5d9",
							eye: "#fff9eb",
							pupil: "#241d35",
							horn: "#fff0d0",
						},
					}),
				);
			}
			return this.rigs.get(id);
		}
		update(s, dt) {
			if (!s) return;
			if (this.prevRevision !== s.revision) {
				this.visualPos.clear();
				this.prevRevision = s.revision;
			}
			this.state = s;
			for (const [id, v] of this.reactions) {
				v.time -= dt;
				if (v.time <= 0) this.reactions.delete(id);
			}
			for (const [kind, list] of [
				["hero", s.actors || s.players || []],
				["food", s.foods || []],
				["enemy", s.enemies || []],
			])
				list.forEach((a, i) => {
					if (kind === "hero" && !this.seatNumbers.has(a.id))
						this.seatNumbers.set(a.id, i);
					if (globalThis.ChompApp?.net && !globalThis.ChompApp.net.isHost) {
						const p = this.visualPos.get(a.id);
						if (!p || Math.hypot(p.x - a.x, p.y - a.y) > 2)
							this.visualPos.set(a.id, { x: a.x, y: a.y });
						else {
							const k = 1 - Math.exp(-dt / 0.065);
							p.x += (a.x - p.x) * k;
							p.y += (a.y - p.y) * k;
						}
					}
					const rig = this.rig(a, kind, i),
						d = D[
							a.turn > 0 && a.nextDir !== undefined ? a.nextDir : a.dir
						] || [0, 1],
						reaction = this.reactions.get(a.id);
					rig.update(dt, {
						look: d,
						walk: a.moving === false ? 0 : 1,
						squash: this.game.reduceMotion
							? 0
							: (reaction?.type === "hit"
									? -0.24
									: reaction?.type === "chirp"
										? 0.18
										: Math.sin((s.elapsed || 0) * 12 + i) * 0.035) +
								(a.turn > 0 ? -0.07 : 0),
						squint:
							(kind === "enemy" && a.state === "hunting") ||
							reaction?.type === "hit",
					});
				});
			for (const p of this.pops) p.age += dt;
			this.pops = this.pops.filter((p) => p.age < 0.8);
		}
		event(e) {
			const hero = (this.state?.actors || []).find((a) => a.seat === e.seat),
				target = e.enemy || hero?.id;
			if (target) {
				this.reactions.set(target, { type: e.type, time: 0.6 });
				const kind = e.enemy ? "enemy" : "hero",
					rig = this.rigs.get(`${kind}:${target}`);
				rig?.kick(["hit", "enemy-eaten"].includes(e.type) ? -5 : 3);
			}
			if (e.type === "clear" || e.type === "victory")
				for (const [key, rig] of this.rigs)
					if (key.startsWith("hero:")) rig.kick(5);
			if (e.x === undefined) return;
			this.pops.push({
				x: e.x,
				y: e.y,
				text:
					e.reward || e.points
						? `+${e.reward || e.points}`
						: e.type === "chirp"
							? "♪"
							: e.type === "bite"
								? "+1"
								: e.type === "power"
									? "+3"
									: "✦",
				age: 0,
				color: e.type === "hit" ? "#ff7791" : "#ffdc87",
			});
		}
		draw(
			r,
			s,
			{ title = false, attract = false, editor = null, dev = false } = {},
		) {
			if (!s?.board) return;
			const g = this.game,
				b = editor?.board || s.board,
				z = g.zoom,
				t = s.elapsed || g.time,
				ww = W * T,
				hh = H * T;
			r.sky(["#080914", "#111023", "#1b1630"]);
			const [ox, oy] = r.w(0, 0),
				sc = g.view.scale || z,
				ts = T * sc;
			this.frame = { x: ox, y: oy, tile: ts };
			r.decal((c) => {
				const rect = (x, y, w, h, col) =>
					px.rect(c, ox + x * sc, oy + y * sc, w * sc, h * sc, col);
				// A little circuit-board theatre, floating inside a heavy enamel cabinet.
				rect(-15, -15, ww + 30, hh + 35, "#070811");
				rect(-12, -12, ww + 24, hh + 24, "#3c314e");
				rect(-10, -10, ww + 20, hh + 20, "#776187");
				rect(-8, -8, ww + 16, hh + 16, "#1c1a32");
				rect(-3, -3, ww + 6, hh + 6, "#080a16");
				for (const [sx, sy] of [
					[-8, -8],
					[ww + 7, -8],
					[-8, hh + 7],
					[ww + 7, hh + 7],
				]) {
					px.disc(c, ox + sx * sc, oy + sy * sc, 2 * sc, "#a49bac");
					px.line(
						c,
						ox + (sx - 1) * sc,
						oy + (sy - 1) * sc,
						ox + (sx + 1) * sc,
						oy + (sy + 1) * sc,
						"#353141",
					);
				}
				const show =
					!b.invisible ||
					this.reveal ||
					editor ||
					s.reveal > 0 ||
					s.revealTimer > 0 ||
					(s.stageElapsed ?? t) < 3 ||
					(s.stageElapsed ?? t) % (b.revealPeriod || 12) < 1.4 ||
					s.echo > 0;
				const wall = (x, y) => b.rows[y]?.[x] === "#";
				for (let y = 0; y < H; y++)
					for (let x = 0; x < W; x++) {
						const X = x * T,
							Y = y * T;
						rect(X, Y, T, T, "#17182a");
						if (!wall(x, y)) {
							rect(
								X + 2,
								Y + 2,
								T - 4,
								T - 4,
								(x + y) % 2 ? "#191b30" : "#1b1b30",
							);
							if ((x + y) % 3 === 0) rect(X + 11, Y + 11, 2, 2, "#34304b");
							if (x % 4 === 1 && y % 4 === 1) {
								rect(X + 6, Y + T - 5, 9, 1, "#363149");
								rect(X + 6, Y + T - 9, 1, 4, "#363149");
							}
						} else if (show) {
							const pal =
									typeof b.palette === "string"
										? b.palette
										: b.palette?.wall || "#9260c3",
								tone = E.tones(typeof pal === "string" ? pal : "#9260c3");
							rect(X + 1, Y + 4, T - 2, T - 3, "#100d20");
							rect(X + 2, Y + 1, T - 4, T - 5, tone.sh);
							rect(X + 3, Y + 2, T - 6, T - 7, "#564071");
							if (!wall(x, y - 1)) rect(X + 3, Y + 2, T - 6, 2, "#c39be8");
							if (!wall(x - 1, y)) rect(X + 2, Y + 3, 2, T - 7, "#9b6ac5");
							if (!wall(x, y + 1)) rect(X + 3, Y + T - 6, T - 6, 2, "#352643");
							if ((x + y) % 4 === 0) rect(X + 8, Y + 6, 5, 1, "#7b5b97");
						} else {
							rect(X + 2, Y + 3, T - 4, 1, "#312b43");
							rect(X + 2, Y + 3, 1, 3, "#312b43");
						}
					}
				if (b.tunnels) {
					const Y = (b.tunnelRow ?? 7) * T;
					for (const X of [0, ww - T]) {
						rect(X, Y + 2, T, T - 4, "#123c4c");
						for (let i = 0; i < 3; i++) {
							const k = (t * 22 + i * 7) % T;
							rect(X + k, Y + 4, 1, T - 8, "#54b9c6");
						}
					}
				}
				if (b.gate) {
					const cx = 9.5 * T,
						cy = 7.5 * T,
						dir =
							typeof s.gate === "number"
								? s.gate
								: (s.gate?.orientation ?? s.gate?.dir ?? 0);
					rect(cx - T / 2, cy - T / 2, T, T, "#494052");
					px.disc(c, ox + cx * sc, oy + cy * sc, 8 * sc, "#282538");
					px.disc(c, ox + cx * sc, oy + cy * sc, 5 * sc, "#79707a");
					for (let d = 0; d < 4; d++) {
						const [dx, dy] = D[d];
						if (d === dir) {
							rect(cx + dx * 10 - 3, cy + dy * 10 - 3, 6, 6, "#9bf3cf");
							continue;
						}
						if (dx) rect(cx + dx * 11 - 2, cy - 11, 4, 22, "#e8ba76");
						else rect(cx - 11, cy + dy * 11 - 2, 22, 4, "#e8ba76");
					}
					const turn = s.gate?.turn || 0,
						ang =
							((dir - 1) * Math.PI) / 2 -
							(turn > 0 ? ((turn / 0.3) * Math.PI) / 2 : 0);
					px.line(
						c,
						ox + cx * sc,
						oy + cy * sc,
						ox + (cx + Math.cos(ang) * 7) * sc,
						oy + (cy + Math.sin(ang) * 7) * sc,
						"#ffe4a8",
						Math.max(1, sc),
					);
					if (s.gate?.warning || s.gate?.remaining < 0.5)
						px.disc(c, ox + cx * sc, oy + cy * sc, 2 * sc, "#ffe7a7");
				}
			});
			const alive = (s.foods || []).filter((f) => f.alive !== false);
			const actors = editor ? [] : s.actors || s.players || [];
			if (editor) {
				for (const [i, a] of b.foods.entries())
					this.drawActor(r, { ...a, alive: true }, "food", i, b, t, 12);
				for (const [i, a] of b.spawn.entries())
					this.drawActor(r, { ...a, id: `edit${i}` }, "hero", i, b, t, 12);
			} else {
				alive.forEach((a, i) => {
					this.drawActor(r, a, "food", i, b, t, alive.length);
				});
				(s.enemies || []).forEach((a, i) => {
					this.drawActor(r, a, "enemy", i, b, t, alive.length, s.power);
				});
				actors.forEach((a, i) => {
					this.drawActor(r, a, "hero", i, b, t, alive.length, s.power);
				});
			}
			for (const p of this.pops) {
				const [x, y] = r.w(
					(p.x + 0.5) * T,
					(p.y + 0.5) * T - 12 - p.age * 18,
					0,
				);
				r.text(p.text, x, y, p.color, {
					align: "center",
					shadow: "#0a0811",
					outline: false,
				});
			}
			if (editor) {
				const [x, y] = r.w(editor.x * T, editor.y * T, 0);
				r.overlay((c) => {
					const co = editor.error ? "#ff7c9c" : "#fff0a5";
					px.line(c, x, y, x + ts, y, co, 2);
					px.line(c, x, y, x, y + ts, co, 2);
					px.line(c, x + ts, y, x + ts, y + ts, co, 2);
					px.line(c, x, y + ts, x + ts, y + ts, co, 2);
				});
			}
			if (this.overlays && !editor) {
				for (const a of [...actors, ...(s.enemies || []), ...alive]) {
					const [x, y] = r.w((a.x + 0.5) * T, (a.y + 0.5) * T, 0);
					r.overlay((c) => {
						const radius = 7 * sc,
							color =
								a.kind === "hero" ? "#9ee7d7" : a.power ? "#ffe5a0" : "#ff8eac",
							dir = D[a.nextDir ?? a.dir] || [0, 0];
						px.line(c, x - radius, y - radius, x + radius, y - radius, color);
						px.line(c, x - radius, y + radius, x + radius, y + radius, color);
						px.line(c, x - radius, y - radius, x - radius, y + radius, color);
						px.line(c, x + radius, y - radius, x + radius, y + radius, color);
						px.line(
							c,
							x,
							y,
							x + dir[0] * 12 * sc,
							y + dir[1] * 12 * sc,
							color,
							2,
						);
						E.font.text(c, a.state || a.id, x, y - 15 * sc, color, {
							align: "center",
							outline: false,
							shadow: "#080914",
						});
						if (a.target && globalThis.ChompApp?.sim) {
							const path = globalThis.ChompApp.sim.path(
								{ x: Math.round(a.x), y: Math.round(a.y) },
								a.target,
							);
							for (let i = 1; i < path.length; i++) {
								if (Math.abs(path[i].x - path[i - 1].x) > 1) continue;
								const p = r.w(
										(path[i - 1].x + 0.5) * T,
										(path[i - 1].y + 0.5) * T,
										0,
									),
									q = r.w((path[i].x + 0.5) * T, (path[i].y + 0.5) * T, 0);
								px.line(c, p[0], p[1], q[0], q[1], color);
							}
						}
					});
				}
				if (b.gate)
					r.text(
						`GATE ${s.gate.orientation} / ${s.gate.remaining.toFixed(2)}s`,
						...r.w(9.5 * T, 6.5 * T, 0),
						"#ffe2a0",
						{ align: "center", outline: false },
					);
			}
			r.overlay((c) => {
				const text = (str, x, y, col = "#eee3cf", opts = {}) =>
					E.font.text(c, str, x, y, col, {
						outline: false,
						shadow: "#080914",
						...opts,
					});
				if (!title) {
					const bx = ox,
						by = oy;
					const head = editor
						? "MAZE WORKSHOP"
						: `${attract ? "DEMO  /  " : ""}${String((s.stageIndex || 0) + 1).padStart(2, "0")}  ${b.name.toUpperCase()}`;
					text(head, bx, Math.max(9, by - 35), "#ffe3a0", { scale: 1 });
					text(
						editor
							? `TOOL: ${editor.tool.toUpperCase()}    ${editor.message}`
							: `${alive.length === 1 ? "LAST SNACK! CUT IT OFF." : `${alive.length} RUNAWAY SNACKS`}${s.power > 0 ? `   •   CHOMP POWER ${s.power.toFixed(1)}` : ""}`,
						bx,
						Math.max(21, by - 20),
						s.power > 0 ? "#a8f5d7" : "#aba7c4",
					);
					const yy = by + hh * sc + 22;
					text(
						editor
							? "D-PAD Move  •  SOUTH Apply  •  SHOULDERS Tool  •  OPTIONS Save / Play"
							: `TEAM ${String(s.score || 0).padStart(3, "0")}    LIVES ${"♥".repeat(Math.max(0, s.lives || 0))}`,
						bx,
						yy,
						"#f4c987",
					);
					if (!editor) {
						text(
							g.input.lastDevice === "gamepad"
								? `${g.input.label("chirp")} Reveal    OPTIONS Menu`
								: g.input.lastDevice === "touch"
									? "DRAG TO STEER  •  TAP ♪ TO REVEAL"
									: "WASD / ARROWS Steer    SPACE Reveal    ESC Menu",
							bx,
							yy + 15,
							"#9997b0",
						);
						const best = globalThis.ChompSave?.best || 0;
						if (g.W > ww * sc + 300) {
							text("THE SNACKS", 30, g.H / 2 - 25, "#ffd578", { scale: 2 });
							text("HAVE LEGS.", 30, g.H / 2 - 7, "#ffd578", { scale: 2 });
							text("Find a shortcut.", 30, g.H / 2 + 20, "#a9a5c1");
							text(`BEST  ${best}`, g.W - 115, g.H / 2 + 20, "#a9a5c1");
						}
					}
					if (s.phase === "clear") {
						const y = g.H / 2 - 25;
						E.ui.box(c, g.W / 2 - 125, y - 12, 250, 58, {
							bg: "#171329",
							border: "#f6cf88",
							alpha: 0.95,
						});
						text("A TIDY LITTLE FEAST!", g.W / 2, y, "#ffe9af", {
							align: "center",
							scale: 2,
						});
						text(
							"One life restored. Next maze coming up…",
							g.W / 2,
							y + 25,
							"#beb8d5",
							{ align: "center" },
						);
					}
				}
				if (attract) {
					E.ui.box(c, g.W / 2 - 119, g.H - 34, 238, 23, {
						bg: "#151126",
						border: "#9d7cbc",
						alpha: 0.95,
					});
					text(
						"ARCADE DEMO  •  ANY INPUT TO PLAY",
						g.W / 2,
						g.H - 27,
						"#ffe2a2",
						{ align: "center" },
					);
				}
				if (dev)
					text("ASSISTED RUN • DEVELOPER TOOLS", g.W / 2, 6, "#ff9ea8", {
						align: "center",
					});
			});
		}
		drawActor(r, a, kind, index, _b, t, remaining, power = 0) {
			if (kind === "hero") index = this.seatNumbers.get(a.id) ?? index;
			const g = this.game,
				rig = this.rig(a, kind, index),
				sc = g.view.scale || g.zoom;
			const color =
				kind === "enemy"
					? a.state === "returning" || a.state === "recharging"
						? "#8b9fb5"
						: power > 0
							? "#a5c7ff"
							: ["#ee718f", "#b19cfa", "#f0a164"][index % 3]
					: null;
			if (color) {
				const c = E.tones(color);
				rig.C.base = color;
				rig.C.dk = c.deep;
				rig.C.lt = c.lt;
			}
			rig.scale = sc * 0.7;
			const rendered = this.visualPos.get(a.id) || a;
			// Wrap the centre at the actual paired mouths. A renderer-wide wrap would
			// duplicate every creature into the cabinet's decorative sidebars.
			const x = ((((rendered.x + 0.5) % W) + W) % W) * T,
				y = (rendered.y + 0.5) * T;
			const bob = g.reduceMotion
				? 0
				: Math.sin(t * (kind === "food" ? 12 : 9) + index) * 0.7;
			r.shadow(x, y, kind === "food" ? 3.3 : 6.5);
			r.actor(
				x,
				y + bob + 3,
				0,
				(c, X, Y) => {
					if (kind === "hero") {
						const col = index ? "#a9cfff" : "#8effdf";
						px.ell(c, X, Y + 2 * sc, 8 * sc, 3 * sc, "#243a47");
						px.line(c, X - 7 * sc, Y + 3 * sc, X + 7 * sc, Y + 3 * sc, col);
					}
					if (kind === "food" && a.power) {
						px.blend(c, 0.24, "add", () =>
							px.disc(
								c,
								X,
								Y - 3 * sc,
								(7 + Math.sin(t * 4) * 1) * sc,
								"#ffc76d",
							),
						);
						for (let k = 0; k < 3; k++) {
							const ang = t * 2 + (k * Math.PI * 2) / 3;
							px.dot(
								c,
								X + Math.cos(ang) * 7 * sc,
								Y - 4 * sc + Math.sin(ang) * 5 * sc,
								"#ffeab6",
							);
						}
					}
					if (kind === "food" && remaining <= 3) {
						px.line(
							c,
							X - 9 * sc,
							Y + 3 * sc,
							X - 5 * sc,
							Y + 3 * sc,
							"#f9ba8c",
						);
						px.line(c, X - 12 * sc, Y + sc, X - 8 * sc, Y + sc, "#775b6b");
					}
					rig.draw(c, X, Y, E.VIEWS.threequarter);
					if (kind === "hero") {
						const R = 5 * sc,
							cy = Y - 5 * sc;
						for (const sd of [-1, 1]) {
							px.line(
								c,
								X + sd * R * 0.5,
								cy - R * 0.8,
								X + sd * R * 0.85,
								cy - R * 1.5,
								"#338e99",
								Math.max(1, sc),
							);
							px.disc(
								c,
								X + sd * R * 0.85,
								cy - R * 1.5,
								1.2 * sc,
								index ? "#d5e5ff" : "#c2ffe9",
							);
							if (index)
								px.dot(c, X + sd * R * 0.85 + sc, cy - R * 1.5 - sc, "#fff0c2");
						}
						const reaction = this.reactions.get(a.id);
						const mouth =
							reaction?.type === "hit"
								? 2.5
								: reaction?.type === "chirp"
									? 2.2
									: !a.moving && !a.anim
										? 0.6
										: 1.1 + Math.max(0, Math.sin(t * 18)) * 1.1;
						px.ell(c, X, cy + 2.3 * sc, 2.4 * sc, mouth * sc, "#1b253b");
						px.rect(
							c,
							X - 1.7 * sc,
							cy + 1.5 * sc,
							3.4 * sc,
							0.8 * sc,
							"#effff1",
						);
						if ((a.invulnerable || a.invuln || 0) > 0)
							px.ell(c, X, Y - 2 * sc, 9 * sc, 9 * sc, "#ffffff22");
						E.font.text(
							c,
							String(index + 1),
							X,
							Y + 6 * sc,
							index ? "#bfdbff" : "#a6fce2",
							{ align: "center", outline: false, shadow: "#101020" },
						);
					}
					if (kind === "enemy" && power > 0) {
						E.font.text(
							c,
							power < 1.5 ? "!!" : "~",
							X,
							Y - 15 * sc,
							"#fff3c7",
							{ align: "center", outline: false },
						);
					}
				},
				{ outline: true, rim: false },
			);
		}
	}
	globalThis.ChompView = ChompView;
})();
