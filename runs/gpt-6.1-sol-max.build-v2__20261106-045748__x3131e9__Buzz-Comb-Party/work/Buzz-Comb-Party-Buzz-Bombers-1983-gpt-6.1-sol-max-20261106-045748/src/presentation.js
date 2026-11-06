(function (B) {
	"use strict";
	const E = My3D2dge,
		{ px } = E,
		C = B.COLORS,
		A = B.ARENA;
	const text = (g, str, x, y, c = C.cream, scale = 1, align = "left") =>
		E.font.text(g, str, x, y, c, {
			scale,
			align,
			outline: false,
			shadow: "#102029",
		});
	B.Presentation = function (game) {
		const rigs = new Map(),
			bird = new B.BirdRig(),
			cans = new Map(),
			fx = [];
		let last = 0,
			clock = 0;
		const bloom = (g, x, y, t, n = 1) => {
			for (let k = 0; k < n; k++)
				B.flowerDraw(
					g,
					x + k * 9,
					y,
					9 + (k % 3) * 3,
					t,
					["#e8837f", "#dcb95e", "#d6a3c0"][k % 3],
				);
		};
		function backdrop(r, stage = 0, title = false, encounter = null) {
			const pal =
					encounter?.palette ||
					B.CONTENT[stage]?.palette ||
					B.CONTENT[0].palette,
				[ox, oy] = r.w(0, 0);
			r.sky([pal[0], pal[1], "#728768"]);
			r.decal((g) => {
				// Fine stippled dusk, broad greenhouse arches and distant foliage.
				for (let i = 0; i < 80; i++) {
					const x = (i * 137 + 17) % 640,
						y = (i * 59 + 9) % 290;
					px.dot(g, ox + x, oy + y, i % 4 ? "#5e827e" : "#9fa68b");
				}
				for (let i = 0; i < 6; i++) {
					const x = ox + 40 + i * 112;
					px.line(g, x, oy + 64, x, oy + 280, "#355e61", 2);
					px.line(g, x, oy + 64, x + 54, oy + 29, "#456e70", 2);
					px.line(g, x + 54, oy + 29, x + 109, oy + 64, "#456e70", 2);
					px.line(g, x, oy + 145, x + 109, oy + 145, "#355c60");
					px.line(g, x, oy + 222, x + 109, oy + 222, "#355c60");
				}
				// A warm setting sun kept away from the combat silhouettes.
				px.blend(g, 0.16, "add", () =>
					px.disc(g, ox + 528, oy + 120, 52, "#ffd0a0"),
				);
				px.disc(g, ox + 528, oy + 120, 25, "#a2a384");
				px.disc(g, ox + 523, oy + 114, 20, "#babc92");
				for (let band = 0; band < 3; band++)
					for (let i = -2; i < 26; i++) {
						const x = ox + i * 31 + (band % 2) * 15,
							y = oy + 266 + band * 11,
							rad = 19 + ((i * 13) % 9);
						px.disc(g, x, y, rad, ["#244e4d", "#305b51", "#396a55"][band]);
						px.disc(
							g,
							x - 5,
							y - 6,
							rad * 0.5,
							["#315a53", "#3d6a59", "#47755f"][band],
						);
					}
				// Hanging bunting. Its triangles sit above the active tier paths.
				px.line(g, ox + 15, oy + 55, ox + 321, oy + 66, "#d0bd8b");
				px.line(g, ox + 321, oy + 66, ox + 625, oy + 55, "#d0bd8b");
				for (let i = 0; i < 18; i++) {
					const x = ox + 32 + i * 34,
						y = oy + 56 + Math.sin((i / 17) * Math.PI) * 9;
					px.poly(
						g,
						[
							[x, y],
							[x + 12, y],
							[x + 6, y + 9],
						],
						["#bd7b69", "#d9bc78", "#77a79a"][i % 3],
					);
				}
				// Soil, cut stone rail and a dotted legal-movement guide.
				px.rect(g, ox - 800, oy + 310, 2240, 350, "#152c32");
				px.rect(g, ox - 800, oy + 310, 2240, 7, "#6d8270");
				px.rect(g, ox - 800, oy + 311, 2240, 2, "#b6b28a");
				px.rect(g, ox - 800, oy + 317, 2240, 5, "#294840");
				for (let x = -50; x < 700; x += 35) {
					px.line(g, ox + x, oy + 310, ox + x - 2, oy + 317, "#374d4b");
					px.line(g, ox + x + 4, oy + 318, ox + x + 32, oy + 318, "#496455");
				}
				for (let i = 0; i < 100; i++)
					px.rect(
						g,
						ox + ((i * 71) % 640),
						oy + 323 + ((i * 43) % 220),
						2,
						1,
						["#223d37", "#29453c", "#33513e"][i % 3],
					);
				for (const side of [0, 625]) {
					px.rect(g, ox + side + 4, oy + 89, 6, 221, "#293e3c");
					px.rect(g, ox + side + 5, oy + 89, 2, 221, "#78816b");
				}
				for (let i = 0; i < 14; i++) {
					const y = 92 + i * 15;
					px.ell(g, ox + 5, oy + y, 4, 2, "#52745b");
					px.ell(g, ox + 635, oy + y, 4, 2, "#52745b");
				}
				// Frame decorations fill expanded viewports without changing the playfield.
				for (let i = -5; i <= 5; i++) {
					const x = ox + 320 + i * 103;
					if (i < -3 || i > 3) bloom(g, x, oy + 315, clock, 4);
				}
				if (title) {
					px.blend(g, 0.2, "normal", () =>
						px.rect(g, ox + 14, oy + 24, 325, 285, "#10282c"),
					);
				}
			});
			// Generic engine props are distant garden set dressing, kept outside the action lane.
			r.prop("bush", -16, 290, 0, { size: 2, color: "#3c6c55" });
			r.prop("bush", 657, 291, 0, { size: 2, color: "#3c6c55" });
			r.prop("pot", 18, 329, 0, { size: 1.2, color: "#bd7e5d" });
			r.prop("pot", 623, 329, 0, { size: 1.2, color: "#bd7e5d" });
		}
		function update(w, dt) {
			clock += dt;
			for (const f of fx) {
				f.t -= dt;
				f.x += f.vx * dt;
				f.y += f.vy * dt;
				f.vy += f.gravity * dt;
			}
			for (let i = fx.length - 1; i >= 0; i--)
				if (fx[i].t <= 0) fx.splice(i, 1);
			if (!w) return;
			const active = new Set();
			for (const b of w.bees) {
				active.add(b.id);
				let rig = rigs.get(b.id);
				if (!rig) {
					rig = new B.BeeRig(b.kind);
					rigs.set(b.id, rig);
				}
				rig.update(dt, b);
			}
			for (const id of rigs.keys()) if (!active.has(id)) rigs.delete(id);
			for (const p of w.players) {
				if (!cans.has(p.seat)) cans.set(p.seat, new B.CanRig(p.seat));
				cans.get(p.seat).update(dt, p);
			}
			bird.update(dt, w.bird);
			for (const e of w.events) {
				if (e.id <= last) continue;
				if (
					[
						"convert",
						"feed",
						"hive",
						"shatter",
						"shieldBreak",
						"stock",
						"win",
					].includes(e.kind)
				) {
					const colors =
						e.kind === "shatter"
							? ["#f4bd69", "#ac7655"]
							: e.red
								? ["#ff9e86", "#ffe0ac"]
								: ["#ffe0a0", "#7edbc0"];
					const n = e.kind === "shieldBreak" || e.kind === "win" ? 28 : 9;
					for (let i = 0; i < n; i++) {
						const angle = i * 2.39996 + e.id,
							speed = 15 + (i % 5) * 11;
						fx.push({
							kind: "bit",
							x: e.x,
							y: e.y,
							vx: Math.cos(angle) * speed,
							vy: Math.sin(angle) * speed - 20,
							gravity: 60,
							t: 0.5 + (i % 4) * 0.13,
							color: colors[i % 2],
							size: i % 3 === 0 ? 3 : 1,
						});
					}
				}
				if (e.kind === "score")
					fx.push({
						kind: "text",
						text: "+" + e.points,
						x: e.x,
						y: e.y - 12,
						vx: 0,
						vy: -15,
						gravity: 0,
						t: 1.25,
						color: C.cream,
					});
				if (
					[
						"birdHit",
						"invalidCall",
						"retreat",
						"stock",
						"hop",
						"shieldOpen",
						"retry",
					].includes(e.kind)
				) {
					const messages = {
						birdHit: "Easy on Pip!",
						invalidCall: "No parcels yet",
						retreat: "Pip needs fresh air",
						stock: "+1 RESERVE CAN",
						hop: "SPRING-HOP!",
						shieldOpen: "RED HARVEST: SHIELD OPEN!",
						retry: "Fresh can. Same guest list.",
					};
					fx.push({
						kind: "notice",
						text: messages[e.kind],
						x: 320,
						y: 259,
						vx: 0,
						vy: 0,
						gravity: 0,
						t: 2.4,
						color: e.kind === "birdHit" ? C.rose : C.cream,
					});
				}
			}
			last = w.eventId;
		}
		function drawWorld(r, w, { attract = false } = {}) {
			backdrop(r, w.stage, false, w.content?.[w.stage]);
			const [ox, oy] = r.w(0, 0),
				e = w.content ? w.content[w.stage] : B.CONTENT[w.stage];
			// Local honey lights augment the native cool ambient/shadow pass.
			for (const o of w.obstacles) {
				r.shadow(o.x, o.y + 7, 10, 0.24);
				if (o.red || o.id === w.bird.target)
					game.lights.add(o.x, o.y, 0, 26, 0.4, {
						color: o.red ? "#ff947c" : "#f6c67c",
					});
				r.actor(o.x, o.y, 0, (g, x, y) => B.combDraw(g, x, y, o, clock), {
					key: "comb" + o.id,
				});
			}
			for (const b of w.bees) {
				const rig = rigs.get(b.id);
				if (!rig) continue;
				r.shadow(b.x, b.y + 7, 9, 0.18);
				r.actor(
					b.x,
					rig.visualY ?? b.y,
					0,
					(g, x, y) => rig.draw(g, x, y, r.view),
					{ key: b.id },
				);
			}
			if (w.boss && !w.boss.done)
				r.actor(
					w.boss.x,
					w.boss.y,
					0,
					(g, x, y) => B.bossDraw(g, x, y, w.boss, clock, r.view),
					{ flash: w.boss.hit > 0 ? "#fff2cc" : undefined, key: "queen" },
				);
			if (w.bird.state !== "retreat" || w.bird.x < 640) {
				r.shadow(w.bird.x, w.bird.y + 11, 9, 0.16);
				r.actor(
					w.bird.x,
					w.bird.y,
					0,
					(g, x, y) => bird.draw(g, x, y, r.view),
					{ key: "pip" },
				);
			}
			for (const p of w.players) {
				const cr = cans.get(p.seat);
				r.shadow(p.x, p.y + 1, 13, 0.35);
				if (p.hop > 0)
					r.decal((g) => {
						const q = r.w(p.x, 306);
						px.ell(g, q[0], q[1], 17, 3, "#88dcc2");
					});
				r.actor(p.x, p.y, 0, (g, x, y) => cr?.draw(g, x, y, r.view), {
					key: "can" + p.seat,
				});
			}
			for (const p of w.pulses)
				r.sprite(p.x - 3, p.y - 3, 0, B.pressureAnim, {
					t: clock,
					anchor: "center",
					emissive: true,
				});
			r.overlay((g) => {
				// Pulses are a shaped puff with a tiny animated cap, not an opaque beam.
				for (const p of w.pulses) {
					const x = ox + p.x,
						y = oy + p.y;
					px.blend(g, 0.24, "add", () =>
						px.rect(g, x - 3, y, 7, 12, "#b7f3d3"),
					);
					px.rect(g, x - 1, y, 3, 9, "#e9ffe2");
					px.rect(g, x, y - 2, 1, 3, "#fffce0");
				}
				for (const [a, b] of B.groundIntervals(w)) {
					px.line(g, ox + a, oy + 307, ox + b, oy + 307, "#6fc8a5");
					for (let x = a + 2; x < b; x += 9)
						px.dot(g, ox + x, oy + 305, "#90d1ac");
				}
				for (const [a, b] of w.flowers) {
					for (let x = a + 4; x < b; x += 9)
						bloom(g, ox + x, oy + 311, clock, 1);
					px.rect(g, ox + a, oy + 311, b - a, 3, "#284b3c");
				}
				for (const q of w.growth) {
					const a = ox + q.x0,
						b = ox + q.x1,
						blink = Math.floor(clock * 4) % 2;
					px.blend(g, 0.18, "normal", () =>
						px.rect(g, a, oy + 270, b - a, 41, C.rose),
					);
					for (let x = a; x < b; x += 8)
						px.line(
							g,
							x,
							oy + 310,
							x + 5,
							oy + 305,
							blink ? "#efad84" : "#8e705f",
							2,
						);
					text(g, "!", (a + b) / 2, oy + 282, C.cream, 2, "center");
				}
				const target = w.obstacles.find((o) => o.id === w.bird.target);
				if (target) {
					const x = ox + target.x,
						y = oy + target.y;
					for (const sd of [-1, 1]) {
						px.line(g, x + sd * 16, y - 10, x + sd * 16, y + 6, C.teal);
						px.line(g, x + sd * 16, y - 10, x + sd * 12, y - 10, C.teal);
					}
					if (w.bird.state === "feed") {
						E.ui.bar(
							g,
							x - 12,
							y + 15,
							24,
							3,
							1 - w.bird.timer / w.tuning.birdFeed,
							C.teal,
						);
					}
				}
				for (const f of fx) {
					const x = ox + f.x,
						y = oy + f.y;
					if (f.kind === "bit") px.rect(g, x, y, f.size, f.size, f.color);
					else if (f.kind === "text")
						text(g, f.text, x, y, f.color, 1, "center");
				}
				const notice = fx.filter((f) => f.kind === "notice").at(-1);
				if (notice) {
					const ww = E.font.width(notice.text) + 18;
					E.ui.box(g, ox + 320 - ww / 2, oy + 252, ww, 19, {
						bg: "#132d32",
						border: "#68ad9a",
					});
					text(g, notice.text, ox + 320, oy + 258, notice.color, 1, "center");
				}
				if (w.dev.overlay) drawDebug(g, ox, oy, w);
			});
			hud(r, w, e, attract);
		}
		function drawDebug(g, ox, oy, w) {
			for (let i = 0; i < A.tiers.length; i++) {
				const y = oy + A.tiers[i];
				px.line(g, ox + 28, y, ox + 612, y, "#b887c5");
				text(g, "T" + i, ox + 15, y - 3, "#eac2ed");
			}
			for (const b of w.bees) {
				px.rect(g, ox + b.x - 12, oy + b.y - 9, 24, 1, C.rose);
				text(g, String(b.id), ox + b.x, oy + b.y + 10, C.cream);
				if (b.trap > 0) text(g, b.trapReason, ox + b.x + 15, oy + b.y, C.gold);
			}
			const lines = [
				"tick " + w.tick + " seed " + w.seed,
				"pending " +
					w.pending.length +
					" next " +
					(w.pending[0]?.at.toFixed(1) || "none"),
				"stock " +
					w.reserves +
					" spent " +
					w.stats.spent +
					" earned " +
					w.stats.earned,
				"bird " + w.bird.state + " target " + w.bird.target,
				"reward claims " + Object.keys(w.claimed).length,
			];
			E.ui.box(g, ox + 15, oy + 88, 225, 66, {
				bg: "#14252f",
				border: "#b887c5",
			});
			lines.forEach((s, i) => text(g, s, ox + 21, oy + 94 + i * 11, "#f3d8ee"));
		}
		function hud(r, w, e, attract) {
			r.overlay((g) => {
				const [ox, oy] = r.w(0, 0);
				E.ui.box(g, ox + 14, oy + 9, 612, 41, {
					bg: ["#1c3a3b", "#142a30"],
					border: "#6d8270",
				});
				text(
					g,
					"GARDEN " +
						(w.stage + 1) +
						" / " +
						(w.content?.length || B.CONTENT.length),
					ox + 24,
					oy + 16,
					"#91bba9",
				);
				text(g, e.name, ox + 24, oy + 29, C.cream, 2);
				text(
					g,
					String(w.score).padStart(6, "0"),
					ox + 397,
					oy + 22,
					C.cream,
					2,
					"center",
				);
				text(g, "TEAM SCORE", ox + 397, oy + 11, "#91bba9", 1, "center");
				text(g, "RESERVES", ox + 508, oy + 16, "#91bba9");
				for (let i = 0; i < Math.min(w.reserves, 7); i++) {
					px.rect(g, ox + 511 + i * 12, oy + 31, 7, 11, C.gold);
					px.rect(g, ox + 513 + i * 12, oy + 28, 3, 3, "#c7d0b9");
					px.rect(g, ox + 512 + i * 12, oy + 34, 5, 3, C.cream);
				}
				if (w.reserves > 7)
					text(g, "+" + (w.reserves - 7), ox + 595, oy + 32, C.gold);
				E.ui.box(g, ox + 14, oy + 327, 612, 24, {
					bg: "#132b31",
					border: "#536f60",
				});
				for (let i = 0; i < w.players.length; i++) {
					const p = w.players[i],
						x = ox + 24 + i * 170;
					const color = p.seat === 1 ? C.teal : "#f09a79";
					text(g, "P" + p.seat, x, oy + 336, color);
					E.ui.bar(
						g,
						x + 21,
						oy + 337,
						94,
						5,
						p.ammo / w.tuning.capacity,
						p.ammo < 9 ? C.rose : color,
					);
					text(
						g,
						p.swap > 0 ? "SWAP" : String(p.ammo),
						x + 123,
						oy + 335,
						p.ammo < 9 ? C.rose : C.cream,
					);
				}
				const b = w.bird,
					ready = b.call <= 0 && b.state !== "retreat",
					label =
						b.state === "retreat"
							? "PIP: FRESH AIR"
							: ready
								? "CALL PIP"
								: Math.ceil(b.call) + "s TO CALL";
				text(
					g,
					(game.input.lastDevice === "touch"
						? "TAP COMB"
						: game.input.label("call")) +
						"  " +
						label,
					ox + 610,
					oy + 335,
					ready ? C.teal : "#b5b596",
					1,
					"right",
				);
				if (w.assisted)
					text(g, "ASSISTED", ox + 610, oy + 316, C.gold, 1, "right");
				if (w.status === "intro" || w.status === "intermission") {
					const clear = w.status === "intermission";
					E.ui.box(g, ox + 91, oy + 128, 458, 102, {
						bg: ["#254a46", "#173139"],
						border: C.gold,
					});
					text(
						g,
						clear ? "GARDEN CLEAR!" : "GARDEN " + (w.stage + 1),
						ox + 320,
						oy + 140,
						C.gold,
						2,
						"center",
					);
					text(
						g,
						clear ? e.gag : e.name,
						ox + 320,
						oy + 168,
						C.cream,
						1,
						"center",
					);
					const desc = clear
						? "Cans refilled. Reserves stay earned."
						: e.lesson;
					const lines = E.font.wrap(desc, 420);
					lines.forEach((s, i) =>
						text(g, s, ox + 320, oy + 187 + i * 12, "#c2d6bb", 1, "center"),
					);
					if (clear)
						text(
							g,
							"Next garden in " + Math.ceil(w.phaseTime),
							ox + 320,
							oy + 214,
							"#91baa8",
							1,
							"center",
						);
				} else if (w.status === "harvest") {
					text(
						g,
						"LAST ORDERS FOR PIP!  " + Math.ceil(w.phaseTime),
						ox + 320,
						oy + 59,
						C.gold,
						1,
						"center",
					);
				}
				if (
					w.stage === 0 &&
					w.status === "live" &&
					w.stageTime < 22 &&
					!w.demo
				) {
					const next = !w.coverage.moveFire
						? game.input.label("left") +
							" / " +
							game.input.label("right") +
							" move  +  " +
							game.input.label("fire") +
							" spray"
						: !w.coverage.call
							? "Leave a comb. " +
								game.input.label("call") +
								" calls Pip to your column."
							: "Good work! Combs steer workers. Flowers take your parking.";
					E.ui.box(g, ox + 75, oy + 244, 490, 22, {
						bg: "#163438",
						border: "#5a8b78",
					});
					text(g, next, ox + 320, oy + 252, C.cream, 1, "center");
				}
				if (w.boss && !w.boss.done) {
					const b = w.boss;
					const s =
						b.open > 0
							? "SHIELD OPEN " + Math.ceil(b.open) + "s   SPRAY!"
							: "FEED A RED COMB TO OPEN THE BUD";
					E.ui.box(g, ox + 167, oy + 145, 306, 26, {
						bg: "#1d2b3b",
						border: "#86788d",
					});
					text(
						g,
						s,
						ox + 320,
						oy + 151,
						b.open > 0 ? C.gold : "#e3c6ca",
						1,
						"center",
					);
					E.ui.bar(
						g,
						ox + 273,
						oy + 164,
						94,
						3,
						b.hp / b.maxHp,
						b.open > 0 ? C.gold : "#ad7e97",
					);
				}
				if (attract) {
					E.ui.box(g, ox + 125, oy + 9, 390, 39, {
						bg: "#172e34",
						border: C.gold,
					});
					text(g, "DEMONSTRATION", ox + 320, oy + 16, C.gold, 2, "center");
					text(
						g,
						"Any input returns to the party",
						ox + 320,
						oy + 36,
						C.cream,
						1,
						"center",
					);
				}
			});
		}
		function titleDraw(r, menu, best = 0) {
			backdrop(r, 0, true);
			const [ox, oy] = r.w(0, 0),
				t = clock;
			const mascot = new B.CanRig(1);
			mascot.update(t, { vx: Math.sin(t * 0.6) * 80, ammo: 56 });
			const pip = new B.BirdRig();
			pip.update(t, { state: "idle" });
			r.shadow(470, 302, 44, 0.38);
			r.actor(470, 303, 0, (g, x, y) => mascot.draw(g, x, y, r.view, 3.1));
			r.actor(503 + Math.sin(t * 0.7) * 24, 153, 0, (g, x, y) =>
				pip.draw(g, x, y, r.view, 1.65),
			);
			for (let i = 0; i < 3; i++) {
				const o = { kind: "comb", red: i === 2 };
				r.actor(391 + i * 71, 223 + Math.sin(t * 2 + i) * 5, 0, (g, x, y) =>
					B.combDraw(g, x, y, o, t, 1.2),
				);
			}
			const bee = new B.BeeRig("worker");
			bee.update(t, { dir: -1, y: 94, state: "sweep" });
			r.actor(570, 93, 0, (g, x, y) => bee.draw(g, x, y, r.view, 1.8));
			r.overlay((g) => {
				text(g, "A GARDEN ARCADE IN SIX ACTS", ox + 40, oy + 37, "#9fceba");
				E.font.title(g, "BUZZ", ox + 38, oy + 59, {
					scale: 6,
					colors: ["#fff1bd", "#f5c16f", "#d9904e"],
					depth: 3,
					depthColor: "#31433d",
				});
				E.font.title(g, "COMB PARTY", ox + 38, oy + 112, {
					scale: 3,
					colors: ["#fff1bd", "#e9be7e"],
					depth: 2,
					depthColor: "#31433d",
				});
				text(
					g,
					"Spritz responsibly. Feed extravagantly.",
					ox + 40,
					oy + 149,
					"#a8cbb4",
				);
				text(
					g,
					"BEST " + String(best).padStart(6, "0"),
					ox + 585,
					oy + 278,
					C.gold,
					1,
					"right",
				);
				text(
					g,
					"PIP, CHIEF NIBBLING OFFICER",
					ox + 478,
					oy + 187,
					"#8fbdac",
					1,
					"center",
				);
				text(
					g,
					game.input.label("left") +
						" / " +
						game.input.label("right") +
						" MOVE     " +
						game.input.label("fire") +
						" SPRAY     " +
						game.input.label("call") +
						" CALL PIP",
					ox + 320,
					game.screen.portrait && game.input.lastDevice === "touch"
						? r.H - 22
						: oy + 336,
					C.cream,
					1,
					"center",
				);
			});
			menu.draw(r);
		}
		return {
			update,
			draw: drawWorld,
			title: titleDraw,
			backdrop,
			reset() {
				last = 0;
				rigs.clear();
				fx.length = 0;
			},
			get clock() {
				return clock;
			},
		};
	};
})((globalThis.BCP = globalThis.BCP || {}));
