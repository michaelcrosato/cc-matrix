/* Whole-room native mine presentation. Nothing in this file changes game state. */
(() => {
	globalThis.PP ||= {};
	const E = My3D2dge,
		{ px } = E,
		PP = globalThis.PP,
		A = PP.Assets;
	const clamp = (v, a, b) => Math.max(a, Math.min(b, v)),
		hash = (x, y) => {
			const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
			return v - Math.floor(v);
		};
	const seedOf = (s) => {
		let n = 0;
		for (const c of String(s)) n = (Math.imul(n, 31) + c.charCodeAt(0)) | 0;
		return n;
	};
	const color = (i) => [A.GOLD, A.TEAL, A.CORAL][i % 3];
	const reduced = (s) => !!(s?.reducedMotion || s?.reduceMotion),
		flashes = (s) => !!(s?.reducedFlashes || s?.reduceFlashes);
	class MineView {
		constructor(game) {
			this.game = game;
			this.rigs = new Map();
			this.seen = new Set();
			this.fx = [];
			this.t = 0;
			this.chamber = -1;
			this.lastEpoch = null;
			this.lastCamera = "";
			this._sim = null;
			this.localId = null;
			this.cameraX = 288;
			this.portrait = false;
			if (game.lights) {
				game.lights.enabled = true;
				game.lights.ambient = 0.62;
				game.lights.darkness = 0.5;
				game.lights.tint = 0.1;
			}
		}
		reset() {
			this.rigs.clear();
			this.fx = [];
			this.seen.clear();
			this.lastEpoch = null;
			this.lastCamera = "";
			this.cameraX = 288;
			this.t = 0;
			this._sim = null;
		}
		rigFor(m) {
			if (this.rigs.has(m.id)) return this.rigs.get(m.id);
			const index = this.rigs.size,
				second = index % 2 === 1,
				seatColor = /^#[0-9a-f]{3,8}$/i.test(m.color || "")
					? m.color
					: second
						? A.TEAL
						: A.GOLD;
			const rig = new E.Humanoid({
				size: 0.96,
				build: second ? "heroic" : "bulky",
				weapon: "ppPick",
				outfit: "tunic",
				hair: second ? "ponytail" : "short",
				hat: { style: second ? "ppTwinLamp" : "ppLamp", color: seatColor },
				sleeves: "short",
				seed: 37 + index * 83,
				colors: {
					skin: second ? "#deb58d" : "#f1c194",
					hair: second ? "#a9503e" : "#743f2b",
					cloth: second ? "#5aa9a0" : "#c38a43",
					pants: second ? "#364c67" : "#456571",
					boot: "#3e362d",
					belt: "#543b2a",
					glove: "#d6b080",
					metal: "#bed8d4",
					hilt: "#b4834b",
					eye: "#172f36",
					trim: second ? "#c0f5df" : "#f4db9a",
				},
				draw: {
					over: (g, Q, rr) => {
						if (second || !Q.head) return;
						const p = Q.head,
							u = (rr.lastView?.scale || 1.5) * rr.o.size,
							face = rr.facing === Math.PI ? -1 : 1;
						px.poly(
							g,
							[
								[p[0] + face * 1.5 * u, p[1] + 0.8 * u],
								[p[0] + face * 4 * u, p[1] + 2 * u],
								[p[0] + face * 0.8 * u, p[1] + 5.1 * u],
								[p[0] - face * 2 * u, p[1] + 2.6 * u],
							],
							"#7b442c",
						);
						px.line(
							g,
							p[0] + face * 0.4 * u,
							p[1] + 2 * u,
							p[0] + face * 2.8 * u,
							p[1] + 2.4 * u,
							"#e5b287",
							Math.max(1, u * 0.65),
						);
					},
				},
			});
			const entry = {
				rig,
				wasGround: true,
				hurt: 0,
				breakT: 0,
				pickT: 0,
				keyT: 0,
				wear: 6,
			};
			this.rigs.set(m.id, entry);
			return entry;
		}
		update(dt, sim, settings = {}) {
			if (!sim) return;
			this._sim = sim;
			this.t += dt;
			const epoch = sim.epoch ?? sim.runEpoch ?? 0;
			if (this.lastEpoch !== null && this.lastEpoch !== epoch) {
				this.fx = [];
			}
			this.lastEpoch = epoch;
			const room = sim.room || {},
				tiers = room.tiers || room.floors?.length || 5,
				top = 16 + (tiers - 1) * 64;
			const W = this.game.W || 960,
				H = this.game.H || 720;
			this.portrait = !!this.game.screen?.portrait;
			const zoom = this.portrait
				? clamp(
						Math.min(
							1.75,
							(H - Math.max(260, 190 / (this.game.screen?.S || 1))) /
								((top + 76) * 1.5),
						),
						0.65,
						1.75,
					)
				: clamp(
						Math.min((W - 104) / (632 * 1.5), (H - 195) / ((top + 76) * 1.5)),
						0.5,
						1.15,
					);
			const camera = `${W}:${H}:${tiers}:${this.portrait}`;
			const miner =
				(sim.miners || []).find((m) => m.id === this.localId) ||
				(sim.miners || []).find((m) => !m.downed) ||
				(sim.miners || [])[0];
			const half = W / (zoom * 1.5) / 2,
				lo = Math.min(288, half),
				hi = Math.max(288, 576 - half);
			const targetX = this.portrait
				? clamp(
						(miner?.hero?.x ?? 288) +
							clamp((miner?.hero?.vx || 0) * 0.18, -24, 24),
						lo,
						hi,
					)
				: 288;
			if (this.lastCamera !== camera) {
				this.game.setZoom(zoom);
				this.lastCamera = camera;
				this.cameraX = targetX;
			} else
				this.cameraX = reduced(settings)
					? targetX
					: this.cameraX + (targetX - this.cameraX) * (1 - Math.exp(-dt * 8));
			this.game.focus(this.cameraX, 0, (top + 34) / 2);
			this.game.cam.snap = true;
			for (const e of sim.events || []) {
				if (this.seen.has(e.id)) continue;
				this.seen.add(e.id);
				const seed = seedOf(e.id),
					type = (e.type || "").toLowerCase(),
					x = Number.isFinite(e.x) ? e.x : 288,
					z = Number.isFinite(e.z) ? e.z : 120;
				const entry = this.rigs.get(e.miner ?? e.player ?? e.minerId);
				if (/hurt|damage/.test(type) && entry) entry.hurt = 0.45;
				if (/break/.test(type) && entry) entry.breakT = 0.75;
				if (
					/pick.*collect|renew|toolPickup|pick-up|pickup-pick/.test(type) &&
					entry
				)
					entry.pickT = 0.6;
				if (/key.*collect|key-catch|pickup-key/.test(type) && entry)
					entry.keyT = 0.8;
				if (
					/chop|shatter|collision|clang|redirect|tool-break|pickup|key-catch|hurt|damage|rescue|unlock|gold|pick-break/.test(
						type,
					)
				) {
					if (
						!reduced(settings) &&
						settings.shake !== 0 &&
						/collision|shatter|chophit|hurt|redirect$/.test(type)
					)
						this.game.shake?.(/collision|hurt/.test(type) ? 2.5 : 1.1);
					const c = /hurt|damage|break/.test(type)
						? A.CORAL
						: /key|gold|chop|shatter/.test(type)
							? A.GOLD
							: A.TEAL;
					const n = reduced(settings)
						? 5
						: /collision|shatter/.test(type)
							? 24
							: 12;
					for (let i = 0; i < n; i++) {
						const a = hash(seed, i) * Math.PI * 2,
							s = 18 + hash(seed + 4, i) * 62;
						this.fx.push({
							x,
							z,
							vx: Math.cos(a) * s,
							vz: Math.sin(a) * s + 35,
							life: 0.5 + hash(seed + 2, i) * 0.65,
							max: 1.2,
							color: i % 4 === 0 ? "#fff4cf" : c,
							size: i % 5 === 0 ? 3 : 1.5,
							kind: "spark",
						});
					}
					if (
						!reduced(settings) &&
						!flashes(settings) &&
						/collision|shatter/.test(type)
					)
						this.fx.push({
							x,
							z,
							life: 0.22,
							max: 0.22,
							color: c,
							kind: "ring",
						});
				}
				if (
					e.text &&
					(Number.isFinite(e.points) ||
						type === "collision" ||
						type === "evade")
				)
					this.fx.push({
						x,
						z: z + 18,
						life: 1.2,
						max: 1.2,
						color: A.GOLD,
						kind: "text",
						text: Number.isFinite(e.points) ? `+${e.points}` : String(e.text),
					});
			}
			if (this.seen.size > 1600) {
				const keep = new Set((sim.events || []).map((e) => e.id));
				this.seen = keep;
			}
			for (const p of this.fx) {
				p.life -= dt;
				if (p.kind === "spark") {
					p.x += p.vx * dt;
					p.z += p.vz * dt;
					p.vz -= 120 * dt;
				} else if (p.kind === "text") p.z += 12 * dt;
			}
			this.fx = this.fx.filter((p) => p.life > 0);
			for (const m of sim.miners || []) {
				const a = this.rigFor(m),
					h = m.hero || m;
				a.hurt = Math.max(0, a.hurt - dt);
				a.breakT = Math.max(0, a.breakT - dt);
				a.pickT = Math.max(0, a.pickT - dt);
				a.keyT = Math.max(0, a.keyT - dt);
				const armed =
					typeof m.tool === "object"
						? m.tool.durability > 0
						: Number(m.tool) > 0;
				a.rig.o.weapon = armed ? "ppPick" : null;
				a.rig._ppWear = Number(m.tool);
				let attack = m.attack?.state || null;
				if (!attack && m.action && m.actionT >= 0) {
					const cycle = m.action === "redirect" ? 0.31 : 0.32,
						t = m.actionT;
					const phase = t < 0.065 ? "wind" : t < 0.19 ? "active" : "recover",
						u =
							phase === "wind"
								? t / 0.065
								: phase === "active"
									? (t - 0.065) / 0.125
									: (t - 0.19) / (cycle - 0.19);
					attack = E.move(
						m.action === "redirect" ? "rising" : "overhead",
						clamp(u, 0, 1),
						phase,
					);
				}
				let pose = null;
				if (m.downed) pose = "down";
				else if (
					sim.completed?.won ||
					sim.complete === "win" ||
					sim.won ||
					sim.extracted
				)
					pose = "cheer";
				else if (m.rescue > 0) pose = "ppRescue";
				else if (m.jam > 0) pose = "ppJam";
				else if (a.breakT > 0) pose = "ppBreak";
				else if (a.keyT > 0 || a.pickT > 0) pose = "cheer";
				else if (m.action === "redirect" && !attack) pose = "ppRedirect";
				else if (
					!h.climbing &&
					Math.abs(h.vx || 0) < 2 &&
					!h.air &&
					this.t % 9 < 2
				)
					pose = "ppBoast";
				const extra = {
					attack,
					pose,
					hurt: a.hurt > 0,
					expr: m.downed
						? "wince"
						: m.jam > 0
							? "shout"
							: m.action
								? "angry"
								: "smile",
					aim: (m.aim || 0) * -0.6,
				};
				const state =
					typeof h.rigState === "function"
						? h.rigState(extra)
						: {
								x: h.x || 0,
								y: 0,
								z: h.z || 16,
								vx: h.vx || 0,
								vz: h.vz || 0,
								air: h.air,
								climb: h.climbing,
								crouch: h.crouching,
								facing: (h.facing ?? m.facing ?? 1) < 0 ? Math.PI : 0,
								...extra,
							};
				if (h.landed && !a.wasGround) a.rig.land(0.6);
				a.wasGround = !!h.onGround;
				a.rig.update(dt, state);
			}
		}
		draw(r, sim, settings = {}, options = {}) {
			if (!sim?.room) {
				r.sky(["#07181b", "#102e31", "#183b3c"]);
				return;
			}
			const room = sim.room,
				idx = room.index ?? sim.chamber ?? 0,
				t = sim.time || this.t,
				tiers = room.tiers || room.floors?.length || 5,
				top = 16 + (tiers - 1) * 64,
				ppu = r.ppu;
			const g = r.ctx,
				P = (x, z) => r.w(x, 0, z);
			r.sky(
				PP.PALETTES?.[room.palette] ||
					(idx === 0
						? ["#091d22", "#163539", "#1f3c3b"]
						: idx === 1
							? ["#061c25", "#102e3b", "#173b40"]
							: ["#1a1926", "#26313c", "#303c3c"]),
			);
			this.drawCave(r, room, t, settings);
			// Back row of the mine: pillars, rails and supply machinery are scenery, never collision.
			for (let i = 0; i < 5; i++) {
				const x = -16 + i * 152,
					p = P(x, -12),
					q = P(x, top + 63),
					w = 9 * ppu;
				px.rect(g, p[0] - w / 2, q[1], w, p[1] - q[1], "#263d3c");
				px.rect(
					g,
					p[0] - w / 2 + 1,
					q[1],
					Math.max(1, ppu * 1.8),
					p[1] - q[1],
					"#3a5150",
				);
				for (let z = 34; z < top + 64; z += 64) {
					const a = P(x - 24, z + 25),
						b = P(x, z);
					px.line(g, a[0], a[1], b[0], b[1], "#2c4644", Math.max(2, ppu * 4));
				}
			}
			// Fine vertical shaft cables make the opposed supply paths easy to read.
			for (const x of [105, 455]) {
				const a = P(x, -12),
					b = P(x, top + 47);
				px.line(g, a[0] - 8 * ppu, a[1], b[0] - 8 * ppu, b[1], "#274b4d");
			}
			for (const l of room.ladders || []) this.drawLadder(r, l, t, settings);
			for (const f of room.floors || []) this.drawFloor(r, f, idx, t);
			const floors = room.floors || [];
			for (let i = 0; i < floors.length; i++) {
				const z = floors[i].z;
				for (const x of [30, 546]) {
					r.prop("lantern", x, -9, z + 43, {
						size: 0.7,
						light: false,
						halo: false,
						bias: -2,
						hides: false,
					});
					this.game.lights?.add(x, 0, z + 25, 45, 0.24, {
						color: room.routeColor || (idx === 1 ? "#7cd6d2" : "#ffbc6d"),
					});
				}
				if (i % 2 === 0) {
					r.shape(
						i % 4 === 0 ? "barrel" : "crate",
						i % 4 === 0 ? 210 : 372,
						-9,
						z,
						{ scale: 0.58, shadow: false, hides: false, bias: -4 },
					);
				}
			}
			if (room.finale) {
				r.shape("ppExtraction", 416, -20, top + 4, {
					scale: 1.03,
					shadow: false,
					hides: false,
					bias: -4,
				});
				this.drawExtraction(r, sim, t, settings);
			} else {
				const z = floors[0]?.z || 16;
				r.shape("cart", 392, -15, z, {
					scale: 0.74,
					shadow: false,
					hides: false,
					bias: -5,
				});
				r.shape("ppPickStand", 48, -15, z, {
					scale: 0.64,
					shadow: false,
					hides: false,
					bias: -5,
				});
			}
			for (const d of room.doors || []) this.drawDoor(r, d, sim, t, settings);
			for (const p of sim.pickups || []) this.drawPickup(r, p, t, settings);
			for (const rock of sim.rocks || []) this.drawRock(r, rock, t, settings);
			for (const m of sim.miners || [])
				this.drawMiner(r, m, sim, t, settings, options);
			for (const p of this.fx) this.drawFX(r, p, settings);
			this.drawShaftBorder(r, top, t);
			if (this.portrait) this.drawOffscreen(r, sim, settings);
			if (options.debug) this.drawDebug(r, sim);
			if (sim.transition > 0 && !reduced(settings))
				r.overlay((gg) => {
					const a = clamp(sim.transition, 0, 1),
						w = r.W * 0.5 * a;
					px.rect(gg, 0, 0, w, r.H, "#071b20");
					px.rect(gg, r.W - w, 0, w, r.H, "#071b20");
				});
		}
		drawCave(r, room, t, settings) {
			const g = r.ctx,
				idx = room.index || 0,
				tiers = room.tiers || room.floors?.length || 5,
				top = 16 + (tiers - 1) * 64,
				P = (x, z) => r.w(x, 0, z),
				ppu = r.ppu;
			for (let layer = 0; layer < 3; layer++) {
				const col = ["#163438", "#1b3b3d", "#204143"][layer];
				for (let i = -2; i < 14; i++) {
					const x = i * 64 + hash(i, layer) * 35 - 20,
						z = top + 64 - hash(i + 8, layer) * 54,
						p = P(x, z),
						q = P(x + 30, -35);
					px.poly(
						g,
						[
							[p[0] - 36 * ppu, p[1]],
							[p[0] + 7 * ppu, p[1] + 18 * ppu],
							[p[0] + 21 * ppu, p[1] + (40 + hash(i, 5) * 85) * ppu],
							[p[0] + 43 * ppu, p[1] + 12 * ppu],
							[p[0] + 58 * ppu, p[1]],
							[q[0] + 58 * ppu, q[1]],
							[q[0] - 36 * ppu, q[1]],
						],
						col,
					);
				}
			}
			// Angular seams and quartz facets provide detail without competing with traversable silhouettes.
			for (let i = 0; i < 106; i++) {
				const x = hash(i, 8) * 850 - 140,
					z = hash(i, 9) * (top + 90) - 12,
					p = P(x, z),
					s = (2 + hash(i, 4) * 9) * ppu,
					c = i % 5 === 0 ? (idx === 2 ? "#727f6e" : "#376465") : "#28494a";
				if (i % 3 === 0)
					px.poly(
						g,
						[
							[p[0], p[1]],
							[p[0] + s * 2, p[1] - s],
							[p[0] + s * 0.5, p[1] + s * 0.6],
						],
						c,
					);
				else
					px.line(g, p[0], p[1], p[0] + s, p[1] - s * 0.4, c, Math.max(1, ppu));
			}
			for (let i = 0; i < 11; i++) {
				const x = hash(i, 52) * 720 - 72,
					z = hash(i, 44) * top + 18,
					p = P(x, z),
					c = idx === 2 ? "#ac8e55" : i % 2 ? "#4b9d98" : "#597b75";
				px.line(g, p[0], p[1], p[0] + 15 * ppu, p[1] - 6 * ppu, c);
				px.line(
					g,
					p[0] + 15 * ppu,
					p[1] - 6 * ppu,
					p[0] + 20 * ppu,
					p[1] - 18 * ppu,
					c,
				);
				for (let j = 0; j < 3; j++)
					A.diamond(
						g,
						p[0] + (j * 7 + 1) * ppu,
						p[1] - j * 3 * ppu,
						Math.max(1.3, ppu * 2.1),
						c,
					);
			}
			// Quiet dust moves only decoratively; reduced motion keeps its static grain.
			for (let i = 0; i < 45; i++) {
				const x = hash(i, 87) * r.W,
					y =
						(hash(i, 93) * r.H +
							(reduced(settings) ? 0 : t * (1 + hash(i, 91) * 3))) %
						r.H;
				px.dot(g, x, y, i % 6 === 0 ? "#63817a" : "#355653");
			}
			// Foreground cave mouth frames the playfield on ultrawide and portrait screens.
			const left = P(-38, top + 80)[0],
				right = P(614, top + 80)[0];
			if (left > 0) {
				px.poly(
					g,
					[
						[0, 0],
						[left - 24, 0],
						[left + 9, r.H * 0.2],
						[left - 15, r.H * 0.45],
						[left + 12, r.H * 0.75],
						[left - 8, r.H],
						[0, r.H],
					],
					"#0a242a",
				);
			}
			if (right < r.W) {
				px.poly(
					g,
					[
						[r.W, 0],
						[right + 24, 0],
						[right - 9, r.H * 0.25],
						[right + 12, r.H * 0.5],
						[right - 8, r.H * 0.8],
						[right + 12, r.H],
						[r.W, r.H],
					],
					"#0a242a",
				);
			}
		}
		drawFloor(r, f, index, t) {
			const g = r.ctx,
				ppu = r.ppu,
				P = (x, z) => r.w(x, 0, z),
				gaps = [...(f.gaps || [])].sort((a, b) => a[0] - b[0]);
			let x = 0;
			const segments = [];
			for (const gap of gaps) {
				if (gap[0] > x) segments.push([x, gap[0]]);
				x = gap[1];
			}
			if (x < 576) segments.push([x, 576]);
			for (const [x0, x1] of segments) {
				const a = P(x0, f.z),
					b = P(x1, f.z),
					h = Math.max(7, 8 * ppu),
					w = b[0] - a[0];
				px.rect(g, a[0], a[1] + 2, w, h, "#17292c");
				px.rect(g, a[0], a[1] + 1, w, 4 * ppu, "#a18b60");
				px.rect(g, a[0], a[1] + 4 * ppu, w, 4 * ppu, "#5c5741");
				px.line(
					g,
					a[0],
					a[1],
					b[0] - 1,
					a[1],
					index === 2 ? "#e2bc7e" : "#d0bf89",
					Math.max(1, ppu),
				);
				for (let k = Math.ceil(x0 / 24) * 24; k < x1; k += 24) {
					const p = P(k, f.z);
					px.line(
						g,
						p[0],
						p[1] + 2 * ppu,
						p[0] + 6 * ppu,
						p[1] + 7 * ppu,
						"#3c4037",
					);
					px.dot(g, p[0] + 2 * ppu, p[1] + 3 * ppu, "#c4a76b");
				}
				// A shallow underside and occasional supports show precisely where the feet land.
				for (let k = x0 + 20; k < x1 - 10; k += 98) {
					const p = P(k, f.z);
					px.rect(
						g,
						p[0] - 2 * ppu,
						p[1] + 8 * ppu,
						4 * ppu,
						5 * ppu,
						"#514f3b",
					);
					px.line(
						g,
						p[0] - 7 * ppu,
						p[1] + 6 * ppu,
						p[0],
						p[1] + 13 * ppu,
						"#6b6749",
						2 * ppu,
					);
				}
				for (const edge of [x0, x1]) {
					if (edge > 0 && edge < 576) {
						const p = P(edge, f.z);
						px.rect(
							g,
							p[0] - 2 * ppu,
							p[1] - 2 * ppu,
							4 * ppu,
							10 * ppu,
							"#b9965c",
						);
						px.line(
							g,
							p[0] - 2 * ppu,
							p[1] + 7 * ppu,
							p[0] + 2 * ppu,
							p[1] + 3 * ppu,
							"#20363a",
							Math.max(1, ppu),
						);
					}
				}
			}
			for (const [a, b] of gaps) {
				const p = P((a + b) / 2, f.z - 9);
				px.line(g, p[0] - 4 * ppu, p[1], p[0], p[1] + 4 * ppu, "#657d70");
				px.line(g, p[0], p[1] + 4 * ppu, p[0] + 4 * ppu, p[1], "#657d70");
			}
		}
		drawLadder(r, l, t, settings) {
			const state = l.state || "usable",
				active = !["inactive", "expired"].includes(state),
				form = state === "forming",
				warn = state === "warning",
				ppu = r.ppu,
				g = r.ctx;
			const p = r.w(l.x, 0, l.z0),
				q = r.w(l.x, 0, l.z1);
			if (!active) {
				if (l.temporary) {
					px.line(
						g,
						p[0] - 5 * ppu,
						p[1],
						p[0] - 5 * ppu,
						p[1] - 6 * ppu,
						"#386068",
					);
					px.line(
						g,
						p[0] + 5 * ppu,
						p[1],
						p[0] + 5 * ppu,
						p[1] - 6 * ppu,
						"#386068",
					);
				}
				return;
			}
			const c = l.temporary ? (warn ? A.CORAL : A.TEAL) : "#79918a",
				lit = l.temporary ? (warn ? "#ffc092" : "#b6eee0") : "#c0c6a3";
			const fade = form ? 0.4 : 1;
			px.blend(g, fade, "normal", () => {
				px.line(
					g,
					p[0] - 5 * ppu,
					p[1],
					q[0] - 5 * ppu,
					q[1],
					"#233d40",
					Math.max(3, ppu * 3),
				);
				px.line(
					g,
					p[0] + 5 * ppu,
					p[1],
					q[0] + 5 * ppu,
					q[1],
					"#233d40",
					Math.max(3, ppu * 3),
				);
				px.line(
					g,
					p[0] - 5 * ppu,
					p[1],
					q[0] - 5 * ppu,
					q[1],
					c,
					Math.max(1, ppu * 1.4),
				);
				px.line(
					g,
					p[0] + 5 * ppu,
					p[1],
					q[0] + 5 * ppu,
					q[1],
					c,
					Math.max(1, ppu * 1.4),
				);
				for (let z = l.z0 + 5; z < l.z1; z += 8) {
					const a = r.w(l.x - 5, 0, z),
						b = r.w(l.x + 5, 0, z),
						show = !warn || flashes(settings) || Math.floor(t * 5) % 2 === 0;
					px.line(
						g,
						a[0],
						a[1],
						b[0],
						b[1],
						show ? lit : c,
						Math.max(1, ppu * 1.5),
					);
				}
			});
			if (l.temporary) {
				const a = r.w(l.x, 0, l.z1 + 7);
				px.poly(
					g,
					[
						[a[0] - 3 * ppu, a[1]],
						[a[0], a[1] - 4 * ppu],
						[a[0] + 3 * ppu, a[1]],
						[a[0], a[1] + 3 * ppu],
					],
					c,
				);
				if (warn)
					r.textAt(l.x, 0, l.z1 + 15, "!", A.CORAL, {
						align: "center",
						scale: 1,
						outline: false,
					});
			}
		}
		drawDoor(r, d, sim, t, settings) {
			const c = d.color || color(Number(d.id) || 0),
				ppu = r.ppu,
				warning = Number(d.warning) > 0 || d.state === "warning";
			const local =
					sim.miners.find((m) => m.id === this.localId) || sim.miners[0],
				near =
					local &&
					!local.downed &&
					Math.abs(local.hero.x - d.x) < 38 &&
					Math.abs(local.hero.z - d.z) < 23;
			r.shape("ppMechanism", d.x, -6, d.z, {
				scale: 0.9,
				mats: { g: c },
				shadow: false,
				hides: false,
				bias: -2,
			});
			r.queue(
				d.x,
				-4,
				d.z,
				(g) => {
					const p = r.w(d.x, 0, d.z),
						w = 20 * ppu,
						h = 35 * ppu,
						tones = E.tones(c),
						hot = warning && !flashes(settings) && Math.floor(t * 5) % 2 === 0;
					r.glowDisc(
						g,
						p[0],
						p[1] - h * 0.42,
						38 * ppu,
						c,
						warning ? 0.08 : 0.025,
					);
					px.rect(
						g,
						p[0] - w * 0.51,
						p[1] - h * 0.93,
						w * 1.02,
						h * 0.92,
						"#071b22",
					);
					for (let i = 0; i < 4; i++)
						px.rect(
							g,
							p[0] - w * 0.45 + i * w * 0.25,
							p[1] - h * 0.88,
							Math.max(1, ppu * 1.2),
							h * 0.82,
							warning ? tones.base : "#2f494a",
						);
					// Colored jambs and a carved emblem: shape carries the meaning even in grayscale.
					px.rect(g, p[0] - w * 0.68, p[1] - h, w * 0.17, h, tones.sh);
					px.rect(g, p[0] + w * 0.51, p[1] - h, w * 0.17, h, tones.sh);
					px.rect(
						g,
						p[0] - w * 0.68,
						p[1] - h,
						w * 1.36,
						3.3 * ppu,
						hot ? "#fff2bc" : tones.lt,
					);
					const x = p[0],
						y = p[1] - h - 10 * ppu,
						s = 6 * ppu,
						symbol = String(d.symbol || d.id);
					px.disc(g, x, y, 9 * ppu, "#142e35");
					if (/triangle|▲|△|1|sun|flare/i.test(symbol)) {
						px.poly(
							g,
							[
								[x, y - s],
								[x + s, y + s * 0.65],
								[x - s, y + s * 0.65],
							],
							tones.lt,
						);
						px.poly(
							g,
							[
								[x, y - s * 0.4],
								[x + s * 0.4, y + s * 0.35],
								[x - s * 0.4, y + s * 0.35],
							],
							tones.sh,
						);
					} else if (/moon|crescent/i.test(symbol)) {
						px.disc(g, x, y, s, tones.lt);
						px.disc(g, x + s * 0.42, y - s * 0.3, s * 0.82, "#142e35");
					} else if (/star/i.test(symbol)) {
						const points = [];
						for (let i = 0; i < 10; i++) {
							const a = -Math.PI / 2 + (i * Math.PI) / 5,
								rr = s * (i % 2 ? 0.43 : 1);
							points.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
						}
						px.poly(g, points, tones.lt);
					} else if (/diamond|◆|◇|2|crystal/i.test(symbol)) {
						A.diamond(g, x, y, s, tones.lt);
					} else {
						px.rect(g, x - s * 0.7, y - s * 0.7, s * 1.4, s * 1.4, tones.lt);
						px.rect(
							g,
							x - s * 0.36,
							y - s * 0.36,
							s * 0.72,
							s * 0.72,
							tones.sh,
						);
					}
					// Door bolts and pressure gauge.
					for (const x of [-1, 1])
						for (const yy of [4, 26]) {
							px.disc(
								g,
								p[0] + x * 16 * ppu,
								p[1] - yy * ppu,
								1.4 * ppu,
								"#adc5b2",
							);
						}
					if (warning) {
						const a = p[1] - 13 * ppu;
						px.poly(
							g,
							[
								[p[0] - 6 * ppu, a],
								[p[0], a - 11 * ppu],
								[p[0] + 6 * ppu, a],
							],
							A.CORAL,
						);
						px.rect(g, p[0] - ppu, a - 8 * ppu, 2 * ppu, 4 * ppu, "#1b3033");
						px.dot(g, p[0], a - 2 * ppu, "#1b3033");
					} else if (sim.keyOwner !== null && sim.keyOwner !== undefined) {
						A.key(g, p[0] - ppu, p[1] - h * 0.48, 0.65 * ppu, c);
					}
				},
				{ bias: -1, hides: false, emissive: true },
			);
			r.textAt(d.x, 0, d.z + 58, d.name || "SHAFT", c, {
				align: "center",
				outline: false,
				scale: 0.95,
				shadow: "#071b20",
			});
			if (warning)
				r.textAt(d.x, 0, d.z + 71, "INCOMING", A.CORAL, {
					align: "center",
					outline: false,
					scale: 1,
					shadow: "#071b20",
				});
			if (near) {
				r.textAt(
					d.x,
					0,
					d.z - 12,
					`${this.game.input.label("interact")} ${sim.keyOwner !== null ? "OPEN" : "NEED KEY"}`,
					sim.keyOwner !== null ? A.TEAL : A.GOLD,
					{ align: "center", outline: false, shadow: "#071b20" },
				);
				const p = r.w(d.x, 0, d.z + 18);
				r.glowDisc(r.ctx, p[0], p[1], 33 * ppu, c, 0.05);
			}
		}
		drawRock(r, b, t, settings) {
			const ppu = r.ppu,
				radius = b.r || 9,
				kind = b.kind || "normal",
				c =
					kind === "heavy"
						? "#8c9a9a"
						: kind === "bounce"
							? "#5faaa6"
							: "#a29478",
				T = E.tones(c),
				seed = seedOf(b.id),
				angle = (b.x || 0) / radius;
			r.actor(
				b.x,
				0,
				b.z,
				(g, ox, oy) => {
					const p = [ox, oy],
						rad = radius * ppu,
						verts = [];
					for (let i = 0; i < 9; i++) {
						const a = (i * Math.PI * 2) / 9 + angle,
							rr = rad * (0.88 + hash(seed, i) * 0.17);
						verts.push([p[0] + Math.cos(a) * rr, p[1] + Math.sin(a) * rr]);
					}
					px.poly(g, verts, T.sh);
					px.poly(
						g,
						[
							verts[0],
							verts[1],
							verts[2],
							[p[0] - rad * 0.1, p[1] - rad * 0.18],
							verts[8],
						],
						T.lt,
					);
					px.poly(
						g,
						[
							verts[2],
							verts[3],
							verts[4],
							[p[0] - rad * 0.1, p[1] - rad * 0.18],
						],
						T.base,
					);
					px.poly(
						g,
						[
							verts[5],
							verts[6],
							verts[7],
							[p[0] + rad * 0.17, p[1] + rad * 0.13],
						],
						T.deep,
					);
					for (let i = 0; i < 4; i++) {
						const a = angle + hash(seed + 4, i) * 6.28,
							x = p[0] + Math.cos(a) * rad * 0.6,
							y = p[1] + Math.sin(a) * rad * 0.6;
						px.line(
							g,
							x,
							y,
							x + rad * 0.2,
							y - rad * 0.08,
							kind === "bounce" ? "#b8eee1" : "#e5c16d",
							Math.max(1, ppu * 1.5),
						);
					}
					if (kind === "heavy") {
						px.line(
							g,
							p[0] - rad * 0.76,
							p[1] - rad * 0.43,
							p[0] + rad * 0.75,
							p[1] - rad * 0.08,
							A.CORAL,
							Math.max(2, ppu * 2.8),
						);
						px.line(
							g,
							p[0] - rad * 0.72,
							p[1] + rad * 0.13,
							p[0] + rad * 0.64,
							p[1] + rad * 0.49,
							A.CORAL,
							Math.max(2, ppu * 2.8),
						);
						for (let i = 0; i < Math.max(0, b.hp || 0); i++)
							px.rect(
								g,
								p[0] + (i - 1) * 4 * ppu,
								p[1] - rad - 5 * ppu,
								2 * ppu,
								2 * ppu,
								"#ffc0a0",
							);
					} else if (kind === "bounce")
						for (let i = 0; i < 4; i++) {
							const a = i * Math.PI * 0.5 + angle,
								q = [p[0] + Math.cos(a) * rad, p[1] + Math.sin(a) * rad];
							px.poly(
								g,
								[
									[
										q[0] + Math.cos(a + 0.9) * 2.5 * ppu,
										q[1] + Math.sin(a + 0.9) * 2.5 * ppu,
									],
									[
										p[0] + Math.cos(a) * rad * 1.3,
										p[1] + Math.sin(a) * rad * 1.3,
									],
									[
										q[0] + Math.cos(a - 0.9) * 2.5 * ppu,
										q[1] + Math.sin(a - 0.9) * 2.5 * ppu,
									],
								],
								A.TEAL,
							);
						}
					if (b.redirected !== null && b.redirected !== undefined) {
						const cc =
							this._sim?.miners.find((m) => m.id === b.redirected)?.color ||
							(b.redirected === 2 ? A.TEAL : A.GOLD);
						px.line(
							g,
							p[0] - Math.sign(b.vx || 1) * rad * 1.2,
							p[1],
							p[0] - Math.sign(b.vx || 1) * rad * 2.3,
							p[1] + rad * 0.2,
							cc,
							Math.max(1, ppu * 2),
						);
						px.line(
							g,
							p[0] - rad * 0.75,
							p[1] - rad * 0.8,
							p[0] + rad * 0.55,
							p[1] - rad * 0.8,
							b.grace > 0 ? "#fff4c2" : A.CORAL,
							Math.max(1, ppu),
						);
					}
				},
				{ outline: true, rim: true, emissive: true },
			);
		}
		drawPickup(r, p, t, settings) {
			const kind = p.kind || p.type,
				ppu = r.ppu,
				urgent = p.ttl < 4,
				shown = !urgent || flashes(settings) || Math.floor(t * 5) % 2 === 0;
			if (!shown) return;
			r.actor(
				p.x,
				0,
				p.z,
				(g, x, y) => {
					const bob = reduced(settings)
						? 0
						: Math.sin(t * 4 + seedOf(p.id)) * 0.7 * ppu;
					if (kind === "key") {
						r.glowDisc(g, x, y, 24 * ppu, A.GOLD, 0.08);
						A.key(g, x, y + bob, 0.9 * ppu);
						px.line(
							g,
							x - 3 * ppu,
							y + 12 * ppu,
							x + 2 * ppu,
							y + 17 * ppu,
							"#8b9060",
						);
						px.line(
							g,
							x + 2 * ppu,
							y + 17 * ppu,
							x + 5 * ppu,
							y + 13 * ppu,
							"#8b9060",
						);
					} else if (kind === "pick") {
						r.glowDisc(g, x, y, 19 * ppu, A.TEAL, 0.06);
						A.pick(g, x, y + bob, 0.75 * ppu);
						px.line(
							g,
							x - 2 * ppu,
							y - 19 * ppu,
							x + 2 * ppu,
							y - 14 * ppu,
							A.TEAL,
						);
						px.line(
							g,
							x + 2 * ppu,
							y - 14 * ppu,
							x + 5 * ppu,
							y - 19 * ppu,
							A.TEAL,
						);
					} else {
						A.diamond(g, x, y + bob, 5 * ppu, A.GOLD);
					}
				},
				{ emissive: true, outline: false, rim: false },
			);
			if (kind === "key")
				r.textAt(
					p.x,
					0,
					p.z + 19,
					urgent ? "KEY FADING" : "KEY RISING",
					A.GOLD,
					{ align: "center", outline: false, shadow: "#0a2328" },
				);
			if (kind === "pick")
				r.textAt(
					p.x,
					0,
					p.z + 18,
					urgent ? "LAST CHANCE" : "FRESH PICK",
					A.TEAL,
					{ align: "center", outline: false, shadow: "#0a2328" },
				);
		}
		drawMiner(r, m, sim, t, settings, options) {
			const h = m.hero || m,
				entry = this.rigFor(m),
				rig = entry.rig,
				ppu = r.ppu,
				id = m.id,
				c = /^#[0-9a-f]{3,8}$/i.test(m.color || "")
					? m.color
					: (sim.miners || []).indexOf(m) % 2
						? A.TEAL
						: A.GOLD,
				tool = Number(m.tool) || 0;
			r.shadow(h.x, 0, 7, 0.4, "#07191f", h.z);
			if (m.downed) {
				r.marker(h.x, 0, h.z + 13, {
					label: "HOLD INTERACT • RESCUE",
					color: A.CORAL,
					offscreen: false,
				});
				r.actor(
					h.x,
					0,
					h.z,
					(g, x, y) => {
						px.rect(g, x - 8 * ppu, y - 5 * ppu, 16 * ppu, 3 * ppu, "#20373c");
						px.rect(
							g,
							x - 8 * ppu,
							y - 5 * ppu,
							((m.rescue || 0) / 2) * 16 * ppu,
							3 * ppu,
							A.TEAL,
						);
					},
					{ outline: false, rim: false, emissive: true },
				);
			}
			r.actor(h.x, 0, h.z, (g, x, y) => rig.draw(g, x, y, r.view), {
				flash: entry.hurt > 0 && !flashes(settings),
				alpha:
					m.invuln > 0 && !flashes(settings) && Math.floor(t * 12) % 2 === 0
						? 0.72
						: 1,
				xray: { color: c, outline: "#e9f5d5" },
				rim: true,
				outline: true,
				pick: m,
			});
			if (m.action && !reduced(settings))
				rig.drawSmear(
					r,
					m.action === "redirect"
						? ["#efffe9", "#baffdb", "#64cdb2", "#2c817c"]
						: ["#fff2cd", "#f4da8a", "#e8a950", "#8b653d"],
				);
			if (sim.keyOwner === id) {
				const z = h.z + 43 + (reduced(settings) ? 0 : Math.sin(t * 4) * 1.5);
				r.actor(
					h.x,
					0,
					z,
					(g, x, y) => {
						r.glowDisc(g, x, y, 16 * ppu, A.GOLD, 0.15);
						A.key(g, x - 3 * ppu, y, 0.6 * ppu);
					},
					{ outline: false, rim: false, emissive: true },
				);
				r.queue(
					h.x,
					0,
					h.z,
					(g) => {
						for (let i = 0; i < 5; i++) {
							const a = r.w(
								h.x - (h.facing || 1) * (i * 3),
								0,
								h.z + 20 + Math.sin(t * 5 + i) * 3,
							);
							px.dot(g, a[0], a[1], i % 2 ? A.GOLD : "#fff1b1");
						}
					},
					{ emissive: true, bias: 2 },
				);
			}
			// Distinct seat markers and final-wear red tooth stay visible over the rig.
			const head = r.w(h.x, 0, h.z + 37);
			if ((sim.miners || []).length > 1)
				r.text(String((sim.miners || []).indexOf(m) + 1), head[0], head[1], c, {
					align: "center",
					outline: false,
					shadow: "#071b20",
				});
			if (tool === 1 && (flashes(settings) || Math.floor(t * 3) % 2 === 0))
				r.text("!", head[0] + 10 * ppu, head[1] + 8 * ppu, A.CORAL, {
					outline: false,
					shadow: "#071b20",
				});
			if (!tool && !m.downed)
				r.textAt(h.x, 0, h.z - 7, "UNARMED", A.CORAL, {
					align: "center",
					scale: 1,
					outline: false,
					shadow: "#071b20",
				});
			if (m.action === "redirect")
				r.queue(
					h.x,
					0,
					h.z,
					(g) => {
						const dir = h.facing || m.facing || 1,
							aim = m.aim || 0,
							x = h.x + dir * 30,
							z = h.z + 17 - aim * 15,
							a = r.w(h.x + dir * 13, 0, h.z + 23),
							b = r.w(x, 0, z);
						px.line(g, a[0], a[1], b[0], b[1], A.TEAL, Math.max(1, ppu));
						px.line(
							g,
							b[0],
							b[1],
							b[0] - dir * 5 * ppu,
							b[1] - 3 * ppu,
							A.TEAL,
						);
						px.line(
							g,
							b[0],
							b[1],
							b[0] - dir * 5 * ppu,
							b[1] + 3 * ppu,
							A.TEAL,
						);
					},
					{ emissive: true, bias: 5 },
				);
			this.game.lights?.add(h.x, 0, h.z + 25, 36, 0.3, { color: "#f5dd9f" });
			if (options.debug) rig.debug(r);
		}
		drawFX(r, p, settings) {
			const ppu = r.ppu;
			if (p.kind === "text") {
				r.textAt(p.x, 0, p.z, p.text, p.color, {
					align: "center",
					outline: false,
					shadow: "#071b20",
				});
				return;
			}
			r.queue(
				p.x,
				0,
				p.z,
				(g) => {
					const q = r.w(p.x, 0, p.z),
						u = 1 - p.life / p.max;
					if (p.kind === "ring") {
						const rad = (5 + u * 20) * ppu;
						for (let i = 0; i < 12; i++) {
							const a = (i * Math.PI) / 6;
							px.line(
								g,
								q[0] + Math.cos(a) * rad,
								q[1] + Math.sin(a) * rad,
								q[0] + Math.cos(a + 0.16) * rad,
								q[1] + Math.sin(a + 0.16) * rad,
								p.color,
								Math.max(1, ppu),
							);
						}
					} else
						px.rect(
							g,
							q[0],
							q[1],
							Math.max(1, p.size * ppu * (1 - u * 0.6)),
							Math.max(1, p.size * ppu * (1 - u * 0.6)),
							p.color,
						);
				},
				{ emissive: true, bias: 5 },
			);
		}
		drawExtraction(r, sim, t, settings) {
			const top = 16 + ((sim.room.tiers || 7) - 1) * 64,
				ppu = r.ppu;
			r.queue(
				416,
				-10,
				top,
				(g) => {
					const p = r.w(416, 0, top + 31),
						rad = 14 * ppu,
						a = reduced(settings) ? 0 : t * 0.65;
					px.disc(g, p[0], p[1], rad, "#162a33");
					px.disc(g, p[0], p[1], rad - 2 * ppu, "#4e645b");
					for (let i = 0; i < 6; i++) {
						const aa = a + (i * Math.PI) / 3;
						px.line(
							g,
							p[0],
							p[1],
							p[0] + Math.cos(aa) * (rad - 2 * ppu),
							p[1] + Math.sin(aa) * (rad - 2 * ppu),
							"#b39a64",
							Math.max(2, ppu * 2),
						);
					}
					px.disc(g, p[0], p[1], 4 * ppu, "#d4b66d");
					for (const x of [-12, 12]) {
						px.line(
							g,
							p[0] + x * ppu,
							p[1],
							p[0] + x * ppu,
							p[1] + 43 * ppu,
							"#4e645b",
							Math.max(1, ppu * 1.5),
						);
					}
				},
				{ bias: -1, hides: false },
			);
			r.textAt(416, 0, top + 58, "EXTRACTION ENGINE", A.GOLD, {
				align: "center",
				outline: false,
				shadow: "#071b20",
				scale: 1,
			});
		}
		drawShaftBorder(r, top, t) {
			const g = r.ctx,
				ppu = r.ppu;
			for (const x of [-15, 591]) {
				const a = r.w(x, 0, -3),
					b = r.w(x, 0, top + 62);
				px.rect(g, a[0] - 4 * ppu, b[1], 8 * ppu, a[1] - b[1], "#233c3c");
				px.rect(g, a[0] - 4 * ppu, b[1], 1.4 * ppu, a[1] - b[1], "#647161");
				for (let z = 0; z < top + 62; z += 32) {
					const p = r.w(x, 0, z);
					px.rect(
						g,
						p[0] - 5 * ppu,
						p[1] - 2 * ppu,
						10 * ppu,
						4 * ppu,
						"#536254",
					);
					px.dot(g, p[0] - 2 * ppu, p[1] - ppu, "#b3ac7d");
				}
			}
			const a = r.w(-15, 0, -4),
				b = r.w(591, 0, -4);
			px.rect(g, a[0], a[1], b[0] - a[0], 8 * ppu, "#142c30");
			px.line(g, a[0], a[1], b[0], a[1], "#4a6254", Math.max(1, ppu));
		}
		drawOffscreen(r, sim, settings) {
			const items = [],
				W = r.W,
				H = r.H,
				scale = 3,
				pad = 20,
				screenScale = this.game.screen?.S || 1,
				topSafe = 112 / screenScale,
				bottomSafe = H - 110 / screenScale;
			const add = (x, z, label, c, priority) => {
				const p = r.w(x, 0, z);
				if (p[0] < 0 || p[0] > W)
					items.push({
						x: p[0] < 0 ? pad : W - pad,
						y: clamp(p[1], topSafe, bottomSafe),
						side: p[0] < 0 ? -1 : 1,
						label,
						c,
						priority,
					});
			};
			const miner =
				sim.miners.find((m) => m.id === this.localId) || sim.miners[0];
			for (const m of sim.miners)
				if (m.downed && m !== miner)
					add(m.hero.x, m.hero.z + 18, "RESCUE", A.CORAL, 0);
			for (const p of sim.pickups) {
				if (p.kind === "key") add(p.x, p.z, "KEY RISING", A.GOLD, 1);
				else if (p.kind === "pick" && (!miner?.tool || miner.tool < 2))
					add(p.x, p.z, "PICK FALLING", A.TEAL, 2);
			}
			for (const d of sim.room.doors) {
				if (d.warning > 0) add(d.x, d.z + 18, `${d.name} INCOMING`, A.CORAL, 3);
				else if (sim.keyOwner !== null)
					add(d.x, d.z + 18, `${d.name} GATE`, d.color, 4);
			}
			for (const rock of sim.rocks) {
				const p = r.w(rock.x, 0, rock.z);
				if ((p[0] < 0 && rock.vx > 0) || (p[0] > W && rock.vx < 0))
					add(
						rock.x,
						rock.z,
						rock.kind === "heavy"
							? "HEAVY ORE"
							: rock.kind === "bounce"
								? "BOUNCING ORE"
								: "ORE INCOMING",
						A.CORAL,
						5,
					);
			}
			items.sort((a, b) => a.priority - b.priority);
			const chosen = [];
			for (const p of items) {
				if (chosen.some((q) => q.side === p.side && Math.abs(q.y - p.y) < 68))
					continue;
				chosen.push(p);
				if (chosen.length >= 6) break;
			}
			r.overlay((g) => {
				for (const p of chosen) {
					const width = Math.min(W * 0.42, p.label.length * 5 * scale + 23),
						x = p.side < 0 ? p.x - 5 : p.x - width + 5;
					px.rect(g, x, p.y - 13, width, 30, "#0b252b");
					px.line(g, x, p.y - 13, x + width, p.y - 13, p.c, 2);
					const arrow = p.side < 0 ? p.x + 3 : p.x - 3;
					px.poly(
						g,
						[
							[arrow, p.y - 6],
							[arrow + p.side * 9, p.y + 2],
							[arrow, p.y + 10],
						],
						p.c,
					);
					E.font.text(
						g,
						p.label,
						p.side < 0 ? p.x + 20 : p.x - 20,
						p.y - 7,
						p.c,
						{
							align: p.side < 0 ? "left" : "right",
							scale,
							outline: false,
							shadow: "#071b20",
						},
					);
				}
			});
		}
		drawDebug(r, sim) {
			r.overlay((g) => {
				const ppu = r.ppu;
				for (const m of sim.miners || []) {
					const h = m.hero,
						p = r.w(h.x - h.w / 2, 0, h.z + h.h),
						q = r.w(h.x + h.w / 2, 0, h.z);
					px.line(g, p[0], p[1], q[0], p[1], A.TEAL);
					px.line(g, q[0], p[1], q[0], q[1], A.TEAL);
					px.line(g, q[0], q[1], p[0], q[1], A.TEAL);
					px.line(g, p[0], q[1], p[0], p[1], A.TEAL);
				}
				for (const b of sim.rocks || []) {
					const p = r.w(b.x, 0, b.z),
						rr = (b.r || 9) * ppu;
					px.line(g, p[0] - rr, p[1], p[0] + rr, p[1], A.CORAL);
					px.line(g, p[0], p[1] - rr, p[0], p[1] + rr, A.CORAL);
				}
			});
		}
		dispose() {
			this.reset();
			this._sim = null;
		}
	}
	PP.View = MineView;
})();
