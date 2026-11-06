/* Beauty and the Tall Tale — original procedural art and native rig animation. */
((root) => {
	const T = (root.TallTale = root.TallTale || {});
	class Presentation {
		constructor(E, game) {
			this.E = E;
			this.game = game;
			this.time = 0;
			this.lastEvent = 0;
			this.rigs = new Map();
			this.creatures = new Map();
			this.effects = [];
			this.windowTargets = [];
			this.lastSection = -1;
			this.palettes = [
				{
					brick: "#bc7059",
					stone: "#e3c2a0",
					shade: "#704d51",
					shutter: "#428d88",
					sky: ["#477f91", "#91b7aa", "#f4d3a2"],
					far: "#789b98",
					city: "#5e8585",
				},
				{
					brick: "#a5756c",
					stone: "#d4bba6",
					shade: "#665a69",
					shutter: "#427d85",
					sky: ["#3e6583", "#9cabb0", "#efc09d"],
					far: "#738b9d",
					city: "#566f86",
				},
				{
					brick: "#787587",
					stone: "#c2bcba",
					shade: "#48465f",
					shutter: "#4d9398",
					sky: ["#293c67", "#817e9d", "#e3b2a1"],
					far: "#6d718e",
					city: "#474e76",
				},
				{
					brick: "#646b84",
					stone: "#c6bcaa",
					shade: "#3c4059",
					shutter: "#56a0a0",
					sky: ["#253353", "#77738d", "#d4ac9d"],
					far: "#5e637d",
					city: "#3f4561",
				},
			];
			this.backgrounds = this.palettes.map(
				(p, i) =>
					new E.Backdrop({
						sky: p.sky,
						sun:
							i < 2 ? { x: 0.14, y: 0.28, r: 23, color: "#ffe1aa" } : undefined,
						moon:
							i >= 2 ? { x: 0.15, y: 0.2, r: 18, color: "#f5e4c7" } : undefined,
						stars: i > 1 ? 55 : 0,
						layers: [
							{
								kind: "clouds",
								color: i < 2 ? "#ded9bd" : "#a4a2b2",
								y: 0.29,
								height: 0.14,
								parallax: 0.03,
								seed: 72,
							},
							{
								kind: "city",
								color: p.far,
								y: 0.8,
								height: 0.24,
								parallax: 0.13,
								seed: 12,
								windows: "#e6cf9f",
							},
							{
								kind: "city",
								color: p.city,
								y: 0.97,
								height: 0.3,
								parallax: 0.25,
								seed: 32,
								windows: "#f3c985",
							},
						],
					}),
			);
			this.hank = new E.Humanoid({
				seed: 41,
				size: 1.58,
				build: "bulky",
				weapon: null,
				hat: null,
				hair: "bald",
				outfit: "shirt",
				sleeves: "none",
				hunch: 0.14,
				face: { eyes: "big" },
				colors: {
					skin: "#d49c70",
					hair: "#563e40",
					cloth: "#773e4c",
					pants: "#3b4661",
					boot: "#253242",
					belt: "#d1ad73",
					trim: "#efb866",
					eye: "#281f32",
					glove: "#c3916a",
				},
			});
			this.mabel = new E.Humanoid({
				seed: 42,
				size: 0.79,
				weapon: null,
				hair: { style: "ponytail", len: 5 },
				outfit: "robe",
				sleeves: "short",
				hat: "band",
				colors: {
					skin: "#f3c298",
					hair: "#59383b",
					cloth: "#e67f8c",
					pants: "#ffe5be",
					boot: "#5d4350",
					belt: "#fff1cd",
					trim: "#ffd09d",
					eye: "#332840",
				},
			});
			this.makePoses();
			if (game.lights) {
				game.lights.enabled = true;
				game.lights.ambient = 0.87;
				game.lights.darkness = 0.18;
				game.lights.tint = 0.22;
				game.lights.dark = [24, 39, 57];
				game.lights.refresh();
			}
			if (game.r) {
				game.r.outline = "#243044";
				game.r.rim = "#ffedc6";
				game.r.rimAlpha = 0.2;
			}
		}
		makePoses() {
			const E = this.E;
			if (E.Humanoid.poses.taleReach) return;
			E.Humanoid.pose("taleReach", (J, w, rig) => {
				const u = rig._taleGrip || 0;
				const s = Math.sin(u * Math.PI * 8);
				for (const [name, p] of Object.entries({
					handL: [1, -3, 25 + s * 2],
					handR: [2, 3, 25 - s * 2],
					elbowL: [-1, -4, 19 + s],
					elbowR: [0, 4, 19 - s],
				})) {
					const q = J[name];
					if (q) J[name] = q.map((v, i) => v + (p[i] - v) * w);
				}
			});
			E.Humanoid.pose("taleBrace", (J, w) => {
				for (const n of ["handL", "handR"])
					if (J[n])
						J[n] = J[n].map(
							(v, i) => v + ([5, n === "handL" ? -4 : 4, 14][i] - v) * w,
						);
			});
		}
		actorRig(actor) {
			const key = actor.id === undefined ? actor.seat : actor.id;
			if (!this.rigs.has(key)) {
				const second = actor.seat === 2 || this.rigs.size === 1;
				this.rigs.set(
					key,
					new this.E.Humanoid({
						seed: second ? 54 : 53,
						size: 0.78,
						weapon: null,
						build: "chibi",
						hair: second ? { style: "ponytail", len: 4 } : "short",
						hat: second ? "band" : { style: "cap", color: "#61c2ac" },
						outfit: second ? "coat" : "shirt",
						sleeves: "long",
						cape: second ? { len: 4, width: 3, seg: 1.8 } : null,
						colors: {
							skin: second ? "#be8868" : "#f1bd8f",
							hair: second ? "#3f3344" : "#5a3940",
							cloth: second ? "#e7ae60" : "#61c8b3",
							coat: second ? "#d48d4c" : "#55af9b",
							pants: second ? "#66526a" : "#334e6b",
							boot: "#29384b",
							belt: "#f4da9d",
							glove: "#f2c99b",
							trim: "#fff0c7",
							cape: "#e49859",
							capeIn: "#86554f",
							eye: "#222b3c",
						},
					}),
				);
			}
			return this.rigs.get(key);
		}
		update(dt, sim) {
			if (!sim) return;
			this.time += this.game.reduceMotion ? 0 : dt;
			if (this._sim !== sim) {
				this._sim = sim;
				this._seen = new Set();
				this.effects = [];
			}
			const E = this.E;
			for (const a of sim.actors || []) {
				const b = a.body || a,
					rig = this.actorRig(a),
					tr = a.traversal;
				rig._taleGrip = tr ? tr.progress || 0 : 0;
				const facing = b.facing < 0 ? Math.PI : 0;
				const hurt = (a.hurt || 0) > 0;
				rig.update(dt, {
					x: b.x,
					y: 0,
					z: b.z,
					vx: b.vx || 0,
					vy: 0,
					vz: b.vz || 0,
					facing,
					air: !b.onGround && !tr,
					climb: !!tr,
					hurt,
					pose: tr
						? "taleReach"
						: hurt
							? "die"
							: a.finished || sim.rescued
								? "wave"
								: null,
					down: hurt ? Math.min(0.85, (a.hurt || 0) * 0.9) : 0,
					run: Math.min(1, Math.abs(b.vx || 0) / 95),
					sprint: a.power > 0,
					land: b.landed ? 1 : 0,
					expr: hurt ? "wince" : a.power > 0 ? "shout" : "smile",
				});
			}
			const section = sim.section || 0,
				top = section === 3 ? 160 : 208,
				inset = sim.currentSection ? sim.currentSection().inset || 0 : 0;
			this.hankX =
				section === 3
					? 176 + Math.min(3, sim.roofBeat || 0) * (56 / 3)
					: (sim.currentSection?.().exitX ?? 248);
			this.hankZ = top;
			let pose = "hips",
				attack = null,
				vx = 0,
				tilt = 0,
				down = 0;
			const throws = (sim.hazards || []).filter(
				(h) =>
					h.state === "telegraph" &&
					(h.type === "boulder" || h.type === "split" || h.type === "bumper"),
			);
			this.heldStone = throws.length > 0;
			if (throws.length) {
				const u = Math.min(1, (throws[0].age || 0) / 0.9);
				attack = E.move("throw", u);
			}
			if (sim.phase === "transition") {
				pose = "guard";
				vx = 55;
				this.hankX += Math.min(80, (sim.transitionTime || 0) * 25);
			}
			if (sim.rescued) {
				pose = "die";
				down = Math.min(1, (sim.departureTime || 0) * 1.2);
				tilt = -Math.min(1.3, (sim.departureTime || 0) * 0.7);
				this.hankZ -= Math.min(
					250,
					Math.max(0, (sim.departureTime || 0) - 1) * 75,
				);
			}
			this.hank.update(dt, {
				x: this.hankX,
				y: 0,
				z: this.hankZ,
				vx,
				vy: 0,
				facing: Math.PI,
				pose,
				attack,
				down,
				tilt,
				expr: sim.rescued ? "wince" : "angry",
			});
			const recentHeart = (sim.hearts || []).some(
				(h) => (h.age || 0) < 1.25 && !h.collected,
			);
			this.mabelX = 207 - inset * 0.5;
			this.mabelZ = top;
			this.mabel.update(dt, {
				x: this.mabelX,
				y: 0,
				z: top,
				vx: 0,
				vy: 0,
				facing: Math.PI,
				pose: sim.rescued ? "cheer" : recentHeart ? "cast" : "wave",
				expr: "smile",
			});
			for (const h of sim.hazards || []) {
				if (!["rat", "bird", "bat"].includes(h.type)) continue;
				let rig = this.creatures.get(h.id);
				if (!rig) {
					const rat = h.type === "rat",
						bat = h.type === "bat";
					rig = new E.Blob({
						R: rat ? 3.2 : bat ? 4.8 : 4.2,
						ears: rat ? "cat" : undefined,
						wings: !rat,
						feet: rat,
						tail: rat,
						mouth: bat ? "fangs" : true,
						colors: rat
							? {
									dk: "#504851",
									base: "#82717a",
									lt: "#b69b91",
									spec: "#ddc5aa",
									eye: "#302836",
									pupil: "#130f20",
								}
							: bat
								? {
										dk: "#342e4c",
										base: "#685476",
										lt: "#a88eaf",
										spec: "#cebad3",
										eye: "#ffe5a0",
										pupil: "#30283e",
									}
								: {
										dk: "#6d7988",
										base: "#c7d4cd",
										lt: "#e9e9cd",
										spec: "#fff8d5",
										eye: "#273548",
										pupil: "#131e2d",
									},
					});
					this.creatures.set(h.id, rig);
				}
				rig.update(dt, {
					walk: h.type === "rat" ? 1 : 0,
					flap: h.type === "bird" ? 0.6 : h.type === "bat" ? 1 : 0,
					look: [Math.sign(h.vx || 1), 0],
					squash: h.state === "telegraph" ? -0.15 : 0,
				});
			}
			for (const ev of sim.events || []) {
				const id = typeof ev.id === "number" ? ev.id : ev.id;
				if (this._seen?.has(id)) continue;
				if (!this._seen) this._seen = new Set();
				this._seen.add(id);
				if (this._seen.size > 500)
					this._seen.delete(this._seen.values().next().value);
				if (
					[
						"smash",
						"hit",
						"heart",
						"split",
						"bumper",
						"land",
						"rescue",
						"checkpoint",
					].includes(ev.type)
				) {
					const actor = (sim.actors || []).find(
							(a) =>
								a.id === ev.actorId || a.id === ev.actor || a.seat === ev.seat,
						),
						b = actor?.body || actor;
					this.effects.push({
						type: ev.type,
						x: ev.x ?? b?.x ?? 160,
						z: ev.z ?? b?.z ?? 64,
						age: 0,
						life: ev.type === "rescue" ? 2.4 : 0.75,
						seed: this.effects.length * 17 + 5,
					});
				}
			}
			for (const e of this.effects) e.age += dt;
			this.effects = this.effects.filter((e) => e.age < e.life);
		}
		draw(r, sim, opts = {}) {
			if (!sim) return;
			const section = Math.min(3, sim.section || 0),
				p = this.palettes[section],
				t = this.time;
			this.backgrounds[section].draw(r);
			this.drawTown(r, section, t);
			if (sim.phase === "transition" && !opts.title) {
				this.drawOverview(r, sim);
				return;
			}
			const sec = sim.currentSection
				? sim.currentSection()
				: { inset: section * 16, name: "Mutton Building" };
			const inset = sec.inset || 0,
				top = section === 3 ? 160 : 208;
			this.drawFacade(r, sim, p, inset, top);
			this.drawDressing(r, sim, p, inset, top);
			this.drawWindows(r, sim, p);
			this.drawBumpers(r, sim, p);
			for (const h of sim.hazards || []) this.drawHazard(r, h, opts);
			for (const h of sim.hearts || [])
				if (!h.collected) this.drawHeart(r, h.x, h.z, t, 1);
			if (sim.phase !== "departure" || (sim.departureTime || 0) < 4) {
				r.actor(
					this.hankX || 270,
					0,
					this.hankZ ?? top,
					(g, x, y) => this.hank.draw(g, x, y, r.view),
					{ outline: true, bias: 10 },
				);
				r.actor(
					this.mabelX || 207,
					0,
					top,
					(g, x, y) => this.mabel.draw(g, x, y, r.view),
					{ outline: true, bias: 12 },
				);
			}
			if (this.heldStone && !sim.rescued) {
				const hand = this.hank.hand();
				this.drawHazard(
					r,
					{
						id: "hank-held",
						type: "boulder",
						x: hand[0],
						z: hand[2] - 5.2,
						state: "held",
						r: 5.2,
					},
					opts,
				);
			}
			if (sim.phase !== "departure" || (sim.departureTime || 0) < 4)
				for (const a of sim.actors || []) this.drawActor(r, a, sim, opts);
			this.drawEffects(r);
			if (sim.phase === "departure" || sim.rescued) this.drawEnding(r, sim);
			else if (opts.title)
				this.drawPlane(
					r,
					170 + Math.sin(t * 0.08) * 110,
					263,
					1,
					"A LITTLE HEART. A LOT OF HEIGHT.",
				);
			if (opts.debug) this.drawDebug(r, sim);
		}
		drawTown(r, section, t) {
			const { px } = this.E,
				g = r.ctx,
				W = r.W,
				H = r.H;
			const ground = r.w(0, 0, 0)[1];
			const stripe = (x, y, w, h, c) => px.rect(g, x, y, w, h, c);
			for (let i = 0; i < 8; i++) {
				const x = ((i * 139 + 41 - t * (section ? 0.4 : 1)) % (W + 180)) - 90;
				const y = 42 + ((i * 47) % Math.max(50, H * 0.3));
				const c = section > 1 ? "#a9a2af" : "#e3dfc8";
				px.ell(g, x, y, 27, 4, c);
				px.ell(g, x + 18, y - 4, 15, 6, c);
				stripe(x - 22, y, 68, 4, c);
			}
			const horizon = Math.max(H * 0.82, ground - 24);
			for (let i = -1; i < W / 68 + 1; i++) {
				const x = i * 68 + 17,
					ht = 24 + ((i * 31 + 211) % 41),
					c = section > 1 ? "#454d65" : "#557d7c";
				stripe(x, horizon - ht, 58, ht + 100, c);
				stripe(
					x - 3,
					horizon - ht - 3,
					64,
					3,
					section > 1 ? "#68738a" : "#7e9f96",
				);
				for (let y = horizon - ht + 8; y < horizon; y += 12)
					for (let k = 0; k < 4; k++) {
						const lit = (i + k + Math.floor(y / 10)) % 3 === 0;
						stripe(
							x + 7 + k * 12,
							y,
							5,
							7,
							lit ? "#dcc697" : section > 1 ? "#39455c" : "#4a6b6a",
						);
					}
				if (i % 3 === 0) {
					stripe(x + 40, horizon - ht - 15, 6, 15, c);
					stripe(x + 37, horizon - ht - 17, 12, 3, c);
				}
			}
			if (section === 0) {
				stripe(0, ground + 2, W, Math.max(0, H - ground), "#405e67");
				stripe(0, ground + 2, W, 5, "#728e8c");
				stripe(0, ground + 9, W, 2, "#2b4654");
				for (let x = 0; x < W; x += 57)
					stripe(x, ground + 22, 30, 2, "#80928b");
			}
			for (let i = 0; i < 4; i++) {
				const x = ((t * (2 + i * 0.4) + i * 117) % (W + 30)) - 15,
					y = 60 + i * 15;
				const s = Math.sin(t * 5 + i) > 0 ? 2 : -1;
				px.line(g, x - 3, y + s, x, y, "#567780");
				px.line(g, x, y, x + 3, y + s, "#567780");
			}
		}
		drawFacade(r, sim, p, inset, top) {
			const E = this.E,
				px = E.px,
				s = r.view.scale || 1,
				t = E.tones(p.brick),
				stone = E.tones(p.stone),
				lo = inset,
				hi = 320 - inset;
			const pt = (x, z) => r.w(x, 0, z);
			const rect = (g, x, z, w, h, c) => {
				const a = pt(x, z + h);
				px.rect(g, a[0], a[1], w * s, h * s, c);
			};
			r.queue(
				160,
				-8,
				0,
				(g) => {
					// Dimensional right return, bottom contact shade, individual running-bond masonry.
					const [left, bottom] = pt(lo, 0),
						[right, roof] = pt(hi, top + 17);
					px.poly(
						g,
						[
							[right, roof],
							[right + 14 * s, roof - 7 * s],
							[right + 14 * s, bottom - 7 * s],
							[right, bottom],
						],
						p.shade,
					);
					for (let z = 5; z < top + 17; z += 8)
						px.line(
							g,
							right,
							pt(hi, z)[1],
							right + 14 * s,
							pt(hi, z)[1] - 7 * s,
							E.shade(p.shade, 0.1),
						);
					rect(g, lo, 0, hi - lo, top + 17, t.sh);
					for (let z = 2; z < top + 17; z += 7) {
						const row = Math.floor(z / 7);
						for (let x = lo - 14 + (row % 2) * 11; x < hi; x += 22) {
							const x0 = Math.max(lo, x),
								w = Math.min(hi, x + 20) - x0;
							if (w <= 0) continue;
							const v = (((row * 17 + Math.floor(x) * 7) % 11) + 11) % 11;
							rect(
								g,
								x0,
								z,
								w,
								5.8,
								v < 3 ? t.base : v > 8 ? t.lt : E.mix(t.base, t.sh, 0.22),
							);
							rect(g, x0, z + 5, w, 0.55, t.lt);
						}
					}
					// Alternating dressed corner quoins, recess pilasters and copper downpipe.
					for (let z = 0; z < top + 16; z += 12) {
						rect(g, lo - 1, z, z % 24 ? 7 : 10, 10.5, stone.base);
						rect(g, hi - 8, z, z % 24 ? 9 : 7, 10.5, stone.sh);
						rect(g, lo - 1, z + 10, 9, 1, stone.hi);
					}
					for (const x of [lo + 14, hi - 17]) {
						rect(g, x, 0, 3.5, top + 14, "#8c7065");
						rect(g, x, 0, 1, top + 14, "#c3a080");
						for (let z = 13; z < top; z += 34)
							rect(g, x - 1, z, 5, 2, "#675964");
					}
					// Ledges are exactly at the physics feet; top lit lip, deep underside, repeating corbels.
					const floors =
						top === 160 ? [16, 64, 112, 160] : [16, 64, 112, 160, 208];
					for (const z of floors) {
						rect(g, lo - 6, z - 8, hi - lo + 12, 5, stone.sh);
						rect(g, lo - 8, z - 3, hi - lo + 16, 2.2, stone.base);
						rect(g, lo - 8, z - 1, hi - lo + 16, 1.5, stone.hi);
						rect(g, lo - 5, z - 9, hi - lo + 10, 1.3, stone.deep);
						for (let x = lo + 8; x < hi; x += 24) {
							rect(g, x, z - 12, 5, 4, stone.sh);
							rect(g, x, z - 8, 8, 1, stone.base);
						}
						rect(g, hi + 8, z - 3, 8, 2, stone.sh);
					}
					// Crown: high cornice, stepped parapet, little inset panels.
					rect(g, lo - 9, top + 13, hi - lo + 18, 4, stone.base);
					rect(g, lo - 11, top + 17, hi - lo + 22, 2, stone.hi);
					rect(g, lo - 7, top + 9, hi - lo + 14, 3, stone.sh);
					for (let x = lo + 6; x < hi - 5; x += 24) {
						rect(g, x, top + 10, 12, 2, "#a18e84");
						rect(g, x + 1, top + 10, 1, 2, stone.hi);
					}
					// Floor numbers and golden art-deco crest.
					for (let f = 0; f < (top === 160 ? 3 : 4); f++) {
						const [x, y] = pt(lo + 7, 16 + 48 * f + 27);
						E.font.text(
							g,
							String((sim.section || 0) * 4 + f + 1).padStart(2, "0"),
							x,
							y,
							"#e8d1ad",
							{ outline: false, font: "tiny" },
						);
					}
					const [cx, cy] = pt(160, top + 28);
					px.poly(
						g,
						[
							[cx - 12 * s, cy + 5 * s],
							[cx - 8 * s, cy - 2 * s],
							[cx + 8 * s, cy - 2 * s],
							[cx + 12 * s, cy + 5 * s],
							[cx + 9 * s, cy + 12 * s],
							[cx - 9 * s, cy + 12 * s],
						],
						stone.sh,
					);
					px.line(
						g,
						cx - 10 * s,
						cy + 5 * s,
						cx + 10 * s,
						cy + 5 * s,
						stone.lt,
					);
					E.font.text(g, "M", cx, cy + 1 * s, "#ffe0a3", {
						align: "center",
						outline: false,
						scale: 1,
					});
				},
				{ bias: -10000 },
			);
		}
		drawWindows(r, sim, p) {
			const E = this.E,
				px = E.px,
				s = r.view.scale || 1;
			this.windowTargets = [];
			for (const win of sim.windows || []) {
				const z = win.z ?? 16 + 48 * win.floor,
					x = win.x,
					ap = E.clamp(win.aperture ?? (win.usable ? 1 : 0), 0, 1),
					warm =
						win.usable || win.phase === "opening" || win.phase === "warning";
				this.windowTargets.push({
					id: win.id,
					x,
					z,
					screen: r.w(x, 0, z + 22),
					usable: win.usable,
				});
				const a = r.w(x, 0, z + 41),
					b = r.w(x, 0, z + 3);
				const box = [a[0] - 17 * s, a[1], a[0] + 17 * s, b[1]];
				r.queue(
					x,
					-5,
					z,
					(g) => {
						const [ox, oy] = r.w(x, 0, z),
							t = E.tones(p.shutter),
							stone = E.tones(p.stone);
						const q = (dx, dz, w, h, c) =>
							px.rect(g, ox + dx * s, oy - (dz + h) * s, w * s, h * s, c);
						q(-16, 2, 32, 38, "#52494f");
						q(-15, 3, 30, 37, stone.base);
						q(-13, 4, 26, 33, stone.deep);
						q(-11, 5, 22, 31, warm ? "#f1bb72" : "#554e5b");
						if (warm) {
							q(-9, 7, 18, 27, "#e7a863");
							q(-7, 9, 7, 25, "#f9d69b");
							q(1, 9, 7, 25, "#f5cf8c");
							q(-0.7, 6, 1.5, 30, "#b47958");
							q(-10, 21, 20, 1.2, "#b47958");
							q(-10, 6, 2, 29, "#90575b");
							q(8, 6, 2, 29, "#90575b");
						} else {
							q(-10, 8, 8, 25, "#6e6670");
							q(1, 8, 8, 25, "#6e6670");
							q(-10, 20, 20, 1, "#544e61");
						}
						// Each shutter slides outward; louver lines remain coherent through the full cycle.
						const sh = 10 * (1 - ap);
						q(-11, 5, sh, 31, t.base);
						q(11 - sh, 5, sh, 31, t.sh);
						for (let zz = 8; zz < 35; zz += 4) {
							q(-11, zz, sh, 1, t.lt);
							q(11 - sh, zz, sh, 1, t.base);
						}
						q(-12 - sh * 0.1, 5, 1.4, 31, t.deep);
						q(10 - sh, 5, 1.4, 31, t.deep);
						q(-18, 0, 36, 3.5, stone.sh);
						q(-19, 3, 38, 1.5, stone.hi);
						q(-15, 39, 30, 2, stone.lt);
						q(-13, 41, 26, 1, stone.base);
						if (warm) {
							const c = win.phase === "warning" ? "#ff9c6d" : "#a3f0cf";
							q(-3, 42, 6, 2, c);
							q(-1, 44, 2, 2, c);
						}
						if (win.usable) {
							const c = win.phase === "warning" ? "#ffbe75" : "#caffda";
							px.line(
								g,
								ox - 3 * s,
								oy - 15 * s,
								ox,
								oy - 18 * s,
								c,
								Math.max(1, s),
							);
							px.line(
								g,
								ox,
								oy - 18 * s,
								ox + 3 * s,
								oy - 15 * s,
								c,
								Math.max(1, s),
							);
							q(-0.65, 8, 1.3, 9, c);
						}
						if (win.phase === "warning") {
							const pulse = (Math.sin(this.time * 16) + 1) / 2;
							q(
								-17,
								5,
								2,
								Math.max(2, (31 * (win.remaining ?? 0.7)) / 1.2),
								"#ffb478",
							);
							if (pulse > 0.5) {
								q(15, 28, 2, 5, "#ffce8e");
								q(15, 25, 2, 1, "#ffce8e");
							}
						}
					},
					{ bias: -500, pick: { windowId: win.id }, box },
				);
				if (warm && this.game.lights)
					this.game.lights.add(x, 0, z + 23, 27, 0.25, {
						color: win.phase === "warning" ? "#ffb177" : "#ffd59a",
					});
			}
		}
		drawDressing(r, sim, p, inset, top) {
			const E = this.E,
				px = E.px,
				s = r.view.scale || 1;
			const back = (x, z, fn) =>
				r.queue(
					x,
					-3,
					z,
					(g) => {
						const [a, b] = r.w(x, 0, z);
						fn(g, a, b);
					},
					{ bias: -300 },
				);
			// Signs, washing and pennants fit in masonry pockets, never over an aperture.
			const signX = sim.section === 0 ? 165 : 160;
			back(signX, sim.section === 0 ? 5 : 37, (g, x, y) => {
				const text =
					sim.section === 0
						? "MUTTON & SONS"
						: sim.section === 1
							? "NO LIFT. BIG SPIRIT."
							: sim.section === 2
								? "HEAD IN THE CLOUDS"
								: "HANK: TOP OF THE WORLD";
				const w = text.length * 4 + 12;
				px.rect(g, x - w / 2, y - 8, w, 13, "#304f59");
				px.rect(g, x - w / 2, y - 9, w, 1, "#d3b782");
				px.rect(g, x - w / 2, y + 4, w, 1, "#1f3745");
				E.font.text(g, text, x, y - 5, "#e9d5aa", {
					align: "center",
					outline: false,
					font: "tiny",
				});
			});
			for (const x of [inset + 34, 286 - inset]) {
				const z = sim.section === 0 ? 16 : 64;
				r.prop("pot", x, -1, z, { size: 0.65, color: "#b36555" });
				back(x, z + 6, (g, ox, oy) => {
					for (let i = 0; i < 6; i++) {
						const dx = Math.sin(i * 2.1) * 5 * s,
							dy = (2 + (i % 3) * 2) * s;
						px.line(g, ox, oy, ox + dx, oy - dy, "#4d7561");
						px.disc(g, ox + dx, oy - dy, 2 * s, i % 2 ? "#df927b" : "#eab591");
					}
				});
			}
			if (sim.section < 2) {
				back(160, 151, (g, x, y) => {
					px.line(g, x - 44 * s, y, x + 42 * s, y + 2 * s, "#544e59");
					for (let i = 0; i < 5; i++) {
						const dx = (-35 + i * 17) * s,
							dy = Math.sin(this.time * 1.8 + i) * 1.1 * s,
							c = ["#eee1bc", "#cf9b8e", "#608e8a", "#ead3a5", "#d49282"][i];
						px.poly(
							g,
							[
								[x + dx, y + dy],
								[x + dx + 11 * s, y + dy + 1 * s],
								[x + dx + 10 * s, y + dy + 12 * s],
								[x + dx + 2 * s, y + dy + 11 * s],
							],
							c,
						);
						px.rect(g, x + dx + 1 * s, y - 1 * s, 1 * s, 3 * s, "#765c54");
					}
				});
			}
			// Rooftop copper chimney and animated pennant.
			back(inset + 29, top, (g, x, y) => {
				px.rect(g, x - 4 * s, y - 19 * s, 8 * s, 19 * s, "#715a59");
				px.rect(g, x - 6 * s, y - 21 * s, 12 * s, 4 * s, "#b39078");
				px.rect(g, x - 4 * s, y - 18 * s, 2 * s, 17 * s, "#a17b68");
				for (let i = 0; i < 3; i++) {
					const u = (this.time * 0.35 + i * 0.32) % 1;
					px.blend(g, (1 - u) * 0.28, "normal", () =>
						px.ell(
							g,
							x + u * 8 * s,
							y - (24 + u * 24) * s,
							(3 + u * 5) * s,
							(2 + u * 3) * s,
							"#d4d2c1",
						),
					);
				}
			});
			back(160, top + 15, (g, x, y) => {
				px.line(g, x, y, x, y - 27 * s, "#4b5660", 1);
				const wave = Math.sin(this.time * 3) * 2 * s;
				px.poly(
					g,
					[
						[x + 1, y - 27 * s],
						[x + 22 * s, y - 25 * s + wave],
						[x + 16 * s, y - 19 * s + wave],
						[x + 1, y - 20 * s],
					],
					"#e8b77a",
				);
				px.line(g, x + 2, y - 26 * s, x + 17 * s, y - 24 * s + wave, "#ffe2a5");
			});
			// Awning mounted on a side bay, not on a traversable shutter.
			if (sim.section === 1)
				back(inset + 35, 110, (g, x, y) => {
					for (let i = 0; i < 5; i++)
						px.poly(
							g,
							[
								[x + (-18 + i * 7) * s, y],
								[x + (-11 + i * 7) * s, y],
								[x + (-8 + i * 7) * s, y + 8 * s],
								[x + (-15 + i * 7) * s, y + 8 * s],
							],
							i % 2 ? "#e9c9a2" : "#8c5660",
						);
					px.rect(g, x - 15 * s, y + 8 * s, 34 * s, 3 * s, "#c18978");
				});
			// A few engine library props establish scale.
			r.prop("lamp", inset - 14, 0, 16, {
				size: 0.7,
				color: "#648b89",
				light: true,
			});
			r.prop("lamp", 334 - inset, 0, 16, {
				size: 0.7,
				color: "#648b89",
				light: true,
			});
			if (sim.section === 3) {
				r.shape("crate", inset + 17, -2, 16, { scale: 0.5 });
				r.shape("barrel", 300 - inset, -2, 64, { scale: 0.5 });
			}
		}
		drawBumpers(r, sim) {
			const E = this.E,
				px = E.px,
				s = r.view.scale || 1,
				sec = sim.currentSection ? sim.currentSection() : {};
			for (const b of sec.bumpers || []) {
				const x = b.x,
					z = b.z ?? 16 + 48 * (b.floor || 0);
				r.actor(
					x,
					-1,
					z,
					(g, ox, oy) => {
						const active = (sim.hazards || []).some(
								(h) => Math.abs(h.x - x) < 14 && Math.abs(h.z - z) < 15,
							),
							k = active ? Math.sin(this.time * 16) * 1.5 : 0;
						px.rect(g, ox - 5 * s, oy - 13 * s, 10 * s, 13 * s, "#2e4052");
						px.rect(g, ox - 6 * s, oy - 14 * s, 12 * s, 3 * s, "#edc77e");
						px.rect(g, ox - 4 * s + k, oy - 10 * s, 8 * s, 8 * s, "#ae7863");
						for (let i = 0; i < 3; i++)
							px.line(
								g,
								ox - 3 * s,
								oy - (3 + i * 3) * s,
								ox + 3 * s,
								oy - (6 + i * 3) * s,
								"#f3d299",
								1,
							);
					},
					{ outline: false, rim: false, bias: 1 },
				);
			}
		}
		drawHazard(r, h, opts) {
			const E = this.E,
				px = E.px,
				s = r.view.scale || 1,
				t = this.time;
			if (h.state === "spent") return;
			const tele = h.state === "telegraph" || h.state === "approach";
			const outlineColor = this.game.settings?.hazardContrast
				? "#ffeaa2"
				: undefined;
			const x = h.x,
				z = h.z;
			if (tele) {
				r.actor(
					x,
					0,
					z,
					(g, ox, oy) => {
						px.line(
							g,
							ox - 9 * s,
							oy + 2 * s,
							ox + 9 * s,
							oy + 2 * s,
							"#ffb47d",
							2,
						);
						for (let i = 0; i < 3; i++) {
							px.line(
								g,
								ox + (i * 5 - 6) * s,
								oy - 4 * s,
								ox + (i * 5 - 3) * s,
								oy - 1 * s,
								"#ffe3a1",
							);
						}
						E.font.text(g, "!", ox, oy - 22 * s, "#ffe6a8", {
							align: "center",
							outline: true,
							outlineColor,
							scale: 1,
						});
					},
					{ outline: false, rim: false, emissive: true },
				);
			}
			if (["rat", "bird", "bat"].includes(h.type)) {
				const rig = this.creatures.get(h.id);
				if (!rig) return;
				r.actor(
					x,
					0,
					z,
					(g, ox, oy) => {
						rig.draw(g, ox, oy, r.view);
						if (h.type === "rat") {
							const d = Math.sign(h.vx || 1);
							px.line(
								g,
								ox - d * 5 * s,
								oy - 2 * s,
								ox - d * 11 * s,
								oy - 5 * s,
								"#b99087",
								1,
							);
							px.line(
								g,
								ox - d * 11 * s,
								oy - 5 * s,
								ox - d * 15 * s,
								oy - 2 * s,
								"#b99087",
								1,
							);
							px.dot(g, ox + d * 4 * s, oy - 3 * s, "#e8b6a2");
						}
						if (h.type === "bird") {
							const d = Math.sign(h.vx || 1);
							px.poly(
								g,
								[
									[ox + d * 4 * s, oy - 6 * s],
									[ox + d * 9 * s, oy - 5 * s],
									[ox + d * 4 * s, oy - 3 * s],
								],
								"#efbc72",
							);
						}
					},
					{ alpha: tele ? 0.5 : 1, outline: true },
				);
			} else {
				r.actor(
					x,
					0,
					z,
					(g, ox, oy) => {
						const rad = (h.r || 7) * s,
							rot = (h.x / (h.r || 7)) * 0.3,
							tt = E.tones(h.type === "split" ? "#88819a" : "#7b8892");
						const pts = [];
						for (let i = 0; i < 9; i++) {
							const a = (i / 9) * Math.PI * 2 + rot,
								rr = rad * (0.88 + 0.1 * Math.sin(i * 7.3 + 3));
							pts.push([ox + Math.cos(a) * rr, oy - rad + Math.sin(a) * rr]);
						}
						px.poly(g, pts, tt.sh);
						px.poly(
							g,
							[pts[0], pts[1], pts[2], [ox, oy - rad], pts[7], pts[8]],
							tt.base,
						);
						px.poly(g, [pts[3], pts[4], pts[5], [ox - 2 * s, oy - rad]], tt.lt);
						px.line(g, pts[3][0], pts[3][1], pts[4][0], pts[4][1], tt.hi, 1);
						px.line(
							g,
							ox - 3 * s,
							oy - rad - 3 * s,
							ox + 1 * s,
							oy - rad - 5 * s,
							tt.deep,
							1,
						);
						px.dot(g, ox + 2 * s, oy - rad + 3 * s, tt.deep);
						if (h.type === "split") {
							px.line(
								g,
								ox - 2 * s,
								oy - rad * 1.8,
								ox + 2 * s,
								oy - rad * 1.25,
								"#e7bd91",
								1,
							);
							px.line(
								g,
								ox + 2 * s,
								oy - rad * 1.25,
								ox - 2 * s,
								oy - rad * 0.8,
								"#e7bd91",
								1,
							);
							px.line(
								g,
								ox - 2 * s,
								oy - rad * 0.8,
								ox + 1 * s,
								oy - rad * 0.2,
								"#e7bd91",
								1,
							);
						}
						if (h.state === "drop") {
							for (let i = 0; i < 3; i++)
								px.line(
									g,
									ox + (i - 1) * 5 * s,
									oy - rad * 2 - 5 * s,
									ox + (i - 1) * 5 * s,
									oy - rad * 2 - 11 * s,
									"#efd3a0",
									1,
								);
						}
						if (tele)
							px.poly(
								g,
								[
									[ox - 4 * s, oy - rad * 2 - 8 * s],
									[ox, oy - rad * 2 - 3 * s],
									[ox + 4 * s, oy - rad * 2 - 8 * s],
								],
								"#ffc58b",
							);
					},
					{ outline: true, outlineColor, alpha: tele ? 0.65 : 1 },
				);
			}
			if (h.state === "drop")
				r.actor(
					x,
					-1,
					16 + 48 * Math.max(0, (h.floor || 0) - 1),
					(g, ox, oy) => {
						const rr = (8 + Math.sin(t * 18) * 2) * s;
						px.ell(g, ox, oy, rr, 2 * s, "#ffc17e");
					},
					{ outline: false, rim: false, bias: 1, emissive: true },
				);
		}
		drawHeart(r, x, z, t, scale = 1) {
			const E = this.E,
				px = E.px,
				s = (r.view.scale || 1) * scale;
			r.actor(
				x,
				0,
				z,
				(g, ox, oy) => {
					const pulse = 1 + Math.sin(t * 7) * 0.05,
						S = s * pulse;
					px.blend(g, 0.13, "add", () =>
						px.disc(g, ox, oy - 5 * S, 15 * S, "#ffc3af"),
					);
					px.poly(
						g,
						[
							[ox, oy + 3 * S],
							[ox - 8 * S, oy - 5 * S],
							[ox - 8 * S, oy - 9 * S],
							[ox - 4 * S, oy - 12 * S],
							[ox, oy - 8 * S],
							[ox + 4 * S, oy - 12 * S],
							[ox + 8 * S, oy - 9 * S],
							[ox + 8 * S, oy - 5 * S],
						],
						"#f6829b",
					);
					px.poly(
						g,
						[
							[ox, oy + 1 * S],
							[ox - 6 * S, oy - 5 * S],
							[ox - 6 * S, oy - 8 * S],
							[ox - 3 * S, oy - 9 * S],
							[ox, oy - 6 * S],
						],
						"#ffc1b7",
					);
					px.rect(g, ox - 5 * S, oy - 8 * S, 2 * S, 2 * S, "#fff0cf");
					for (let i = 0; i < 3; i++) {
						const a = t * 2 + i * 2.09;
						const xx = ox + Math.cos(a) * 12 * S,
							yy = oy - 5 * S + Math.sin(a) * 10 * S;
						px.line(g, xx - 1, yy, xx + 1, yy, "#ffe3bd");
						px.line(g, xx, yy - 1, xx, yy + 1, "#ffe3bd");
					}
				},
				{ outline: "#944c6b", rim: false, emissive: true, bias: 20 },
			);
			if (this.game.lights)
				this.game.lights.add(x, 0, z, 36, 0.45, { color: "#ffaab6" });
		}
		drawActor(r, a, sim, opts) {
			const E = this.E,
				px = E.px,
				body = a.body || a,
				replica = this.networkPlayers?.find((p) => p.id === a.id),
				b = replica ? { ...body, x: replica.x, z: replica.z } : body,
				rig = this.actorRig(a),
				s = r.view.scale || 1,
				power = a.power || 0;
			const recoveryBlink =
				a.recovery > 0 && Math.floor(this.time * 10) % 2 === 0 && a.hurt <= 0;
			if (power > 0) {
				r.actor(
					b.x,
					-0.1,
					b.z,
					(g, x, y) => {
						px.blend(g, 0.2, "add", () =>
							px.ell(g, x, y - 13 * s, 10 * s, 17 * s, "#ffe4aa"),
						);
						const blink = power < 1.5 && Math.sin(this.time * 18) < 0;
						if (!blink)
							for (let i = 0; i < 7; i++) {
								const ang = this.time * 3 + (i * Math.PI * 2) / 7;
								px.disc(
									g,
									x + Math.cos(ang) * 10 * s,
									y - 14 * s + Math.sin(ang) * 15 * s,
									1.1 * s,
									"#fff2b4",
								);
							}
					},
					{ outline: false, rim: false, emissive: true, bias: 1 },
				);
			}
			r.actor(b.x, 0, b.z, (g, x, y) => rig.draw(g, x, y, r.view), {
				outline: true,
				alpha: recoveryBlink ? 0.62 : 1,
				ghost:
					power > 0 && !this.game.reduceMotion
						? { color: "#ffc9aa", life: 0.16, alpha: 0.24, owner: b }
						: undefined,
				flash:
					(a.hurt || 0) > 0.4 && this.game.settings?.flashes !== 0
						? "#ffe7bb"
						: undefined,
				flashMix: 0.4,
				bias: 3,
			});
			const seat = a.seat || a.id || 1;
			const player = this.playerInfo?.find(
				(p) => String(p.id) === String(a.id),
			);
			const playerColor =
				typeof player?.color === "string" &&
				/^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(player.color)
					? player.color
					: null;
			const playerName = player
				? String(player.name || `Climber ${seat}`)
						.replace(/[\x00-\x1f]/g, "")
						.slice(0, 12)
				: "";
			r.actor(
				b.x,
				0,
				b.z,
				(g, x, y) => {
					const yy = y - 31 * s,
						c = playerColor || (seat === 2 ? "#f2be76" : "#a6efcf");
					px.poly(
						g,
						[
							[x - 4 * s, yy - 1 * s],
							[x + 4 * s, yy - 1 * s],
							[x + 4 * s, yy + 5 * s],
							[x, yy + 8 * s],
							[x - 4 * s, yy + 5 * s],
						],
						"#263d4e",
					);
					E.font.text(g, String(seat), x, yy, c, {
						align: "center",
						outline: false,
						font: "tiny",
					});
					if (playerName) {
						const width = E.font.width(playerName, { font: "tiny" }) + 8;
						px.rect(g, x - width / 2, yy - 10, width, 8, "#203846");
						E.font.text(g, playerName, x, yy - 9, c, {
							align: "center",
							outline: false,
							font: "tiny",
						});
					}
				},
				{ outline: false, rim: false, emissive: true, bias: 7 },
			);
		}
		drawEffects(r) {
			const E = this.E,
				px = E.px,
				s = r.view.scale || 1;
			for (const e of this.effects) {
				const u = e.age / e.life,
					n = e.type === "rescue" ? 22 : e.type === "land" ? 5 : 9,
					c =
						e.type === "heart" || e.type === "rescue"
							? "#ffd0ab"
							: e.type === "hit"
								? "#f6b081"
								: "#d2c9ae";
				r.actor(
					e.x,
					0,
					e.z,
					(g, x, y) => {
						px.blend(g, 1 - u, "normal", () => {
							for (let i = 0; i < n; i++) {
								const a = (i / n) * Math.PI * 2 + e.seed,
									rr = (5 + u * 19) * s,
									xx = x + Math.cos(a) * rr,
									yy = y - 9 * s + Math.sin(a) * rr + u * u * 15 * s;
								px.rect(
									g,
									xx,
									yy,
									Math.max(1, (2 - u) * s),
									Math.max(1, (2 - u) * s),
									i % 3 ? c : "#fff1c1",
								);
							}
							if (["smash", "heart", "checkpoint", "rescue"].includes(e.type)) {
								const txt =
									e.type === "heart"
										? "HEART RUSH!"
										: e.type === "rescue"
											? "LOVE WINS!"
											: e.type === "checkpoint"
												? "ONWARD!"
												: "BONK!";
								E.font.text(g, txt, x, y - (23 + u * 15) * s, c, {
									align: "center",
									outline: true,
								});
							}
						});
					},
					{ outline: false, rim: false, emissive: true, bias: 40 },
				);
			}
		}
		drawPlane(r, x, z, scale = 1, banner = "") {
			const E = this.E,
				px = E.px,
				s = (r.view.scale || 1) * scale,
				t = this.time;
			if (banner) {
				const font = {
					font: "tiny",
					scale: Math.max(1, Math.round(s * 0.7)),
					align: "center",
					outline: false,
				};
				const width = E.font.width(banner, font) + 12 * s,
					height = 13 * s;
				// Banners can exceed the native actor scratch image. Queue them directly
				// in world space so the entire fabric and line remain visible.
				r.queue(
					x - 32 * scale,
					0,
					z,
					(g) => {
						const [ox, oy] = r.w(x, 0, z),
							right = ox - 32 * s,
							left = right - width,
							top = oy - 5 * s;
						px.line(g, ox - 20 * s, oy, right, oy + 2 * s, "#c2b698");
						px.rect(g, left, top, width, height, "#e9d6ae");
						px.rect(g, left, top, width, Math.max(1, s), "#fff0c9");
						px.rect(
							g,
							left,
							top + height - Math.max(1, s),
							width,
							Math.max(1, s),
							"#b5a387",
						);
						E.font.text(
							g,
							banner,
							left + width / 2,
							top + (height - E.font.height(1, font)) / 2,
							"#485662",
							font,
						);
					},
					{ bias: 99, hides: false },
				);
			}
			r.actor(
				x,
				0,
				z,
				(g, ox, oy) => {
					const q = (x, y, w, h, c) =>
						px.rect(g, ox + x * s, oy + y * s, w * s, h * s, c);

					px.poly(
						g,
						[
							[ox - 28 * s, oy - 5 * s],
							[ox + 18 * s, oy - 5 * s],
							[ox + 25 * s, oy + 1 * s],
							[ox + 19 * s, oy + 6 * s],
							[ox - 20 * s, oy + 4 * s],
						],
						"#df8b61",
					);
					q(-20, -4, 37, 2, "#ffd19c");
					q(-28, -12, 9, 9, "#b76d59");
					q(-25, -11, 2, 8, "#efbd8d");
					q(-12, -10, 25, 4, "#f5c581");
					q(-15, 6, 29, 4, "#ae5a50");
					q(-9, -7, 2, 13, "#564f56");
					q(9, -7, 2, 13, "#564f56");
					q(20, -7, 3, 14, "#605762");
					const flap = Math.sin(t * 45);
					px.line(
						g,
						ox + 24 * s,
						oy - 11 * s * flap,
						ox + 24 * s,
						oy + 11 * s * flap,
						"#e7d8b4",
						Math.max(1, s),
					);
					px.disc(g, ox - 8 * s, oy + 12 * s, 3 * s, "#303e4d");
					px.disc(g, ox + 10 * s, oy + 12 * s, 3 * s, "#303e4d");
					px.disc(g, ox - 8 * s, oy + 12 * s, 1 * s, "#9b9e92");
					q(-6, -9, 10, 5, "#334e60");
					q(-5, -11, 3, 3, "#f1c59a");
				},
				{ outline: true, bias: 100 },
			);
		}
		drawEnding(r, sim) {
			const d = sim.departureTime || 0,
				E = this.E;
			let x, z;
			if (d < 3.8) {
				x = -60 + d * 50;
				z = 225 - Math.sin(((d / 3.8) * Math.PI) / 2) * 18;
			} else {
				x = 130 + Math.max(0, d - 4) ** 1.4 * 30;
				z = 207 + Math.max(0, d - 4) ** 1.25 * 12;
			}
			this.drawPlane(
				r,
				x,
				z,
				1.5,
				d > 4 ? "NEXT STOP: SOMEWHERE SHORTER." : "YOUR CHARIOT, DARLINGS!",
			);
			if (d > 4) {
				r.actor(
					x - 5,
					0,
					z + 5,
					(g, ox, oy) => this.mabel.draw(g, ox, oy, r.view),
					{ outline: true, bias: 110 },
				);
				for (const a of sim.actors || []) {
					const rig = this.actorRig(a);
					r.actor(
						x - 20 - (a.seat || 1) * 8,
						0,
						z + 5,
						(g, ox, oy) => rig.draw(g, ox, oy, r.view),
						{ outline: true, bias: 110 },
					);
				}
			}
		}
		drawOverview(r, sim) {
			const E = this.E,
				px = E.px,
				g = r.ctx,
				W = r.W,
				H = r.H,
				cx = W * 0.5,
				base = H * 0.88,
				s = Math.min(H / 320, W / 360),
				n = 13,
				cleared = (sim.section || 0) * 4 + 4;
			for (let f = 0; f < n; f++) {
				const y = base - f * 17 * s,
					w = (180 - f * 6) * s;
				px.rect(
					g,
					cx - w / 2,
					y - 17 * s,
					w,
					17 * s,
					f < cleared ? "#d88c71" : "#646d83",
				);
				px.rect(g, cx - w / 2 - 3 * s, y - 2 * s, w + 6 * s, 2 * s, "#e4c7a5");
				for (let i = -1; i <= 1; i++) {
					px.rect(
						g,
						cx + i * 25 * s - 5 * s,
						y - 13 * s,
						10 * s,
						9 * s,
						f < cleared ? "#ffd29a" : "#a6bac0",
					);
					px.rect(g, cx + i * 25 * s, y - 12 * s, 1 * s, 8 * s, "#8e7778");
				}
			}
			px.rect(
				g,
				cx - 49 * s,
				base - 13 * 17 * s - 7 * s,
				98 * s,
				7 * s,
				"#d6c3a7",
			);
			E.font.title(g, "UP YOU GO!", W / 2, 38, {
				scale: 2,
				align: "center",
				colors: ["#fff2d2", "#ffd396", "#e89b73"],
			});
			E.font.text(g, "Hank is running out of building.", W / 2, 64, "#f5debb", {
				align: "center",
				outline: false,
			});
			const lines = [
				"THAT LUG IS ALL HAT, NO HEIGHT!",
				"LOOKING SMALLER DOWN THERE!",
				"THE SKY HAS A FRONT DOOR.",
			];
			const u = (sim.transitionTime || 0) / 4;
			this.drawPlane(
				r,
				u * 420 - 60,
				248,
				1,
				lines[Math.min(2, sim.section || 0)],
			);
			E.font.text(
				g,
				`${Math.min(12, cleared)} / 12 FLOORS`,
				W / 2,
				H - 24,
				"#ffe6b6",
				{ align: "center", scale: 2, outline: false },
			);
		}
		drawDebug(r, sim) {
			const E = this.E,
				px = E.px,
				s = r.view.scale || 1;
			r.overlay((g) => {
				for (const a of sim.actors || []) {
					const b = a.body || a,
						p = r.w(b.x - (b.w || 8) / 2, 0, b.z + (b.h || 22));
					const w = (b.w || 8) * s,
						h = (b.h || 22) * s;
					px.line(g, p[0], p[1], p[0] + w, p[1], "#aaffaa");
					px.line(g, p[0], p[1] + h, p[0] + w, p[1] + h, "#aaffaa");
					px.line(g, p[0], p[1], p[0], p[1] + h, "#aaffaa");
					px.line(g, p[0] + w, p[1], p[0] + w, p[1] + h, "#aaffaa");
				}
				for (const w of sim.windows || []) {
					const a = r.w(w.x, 0, w.z),
						b = r.w(w.x, 0, w.toZ);
					px.line(g, a[0], a[1], b[0], b[1], "#8dfff1");
					px.disc(g, a[0], a[1], 2, "#fff");
				}
			});
		}
		dispose() {
			this.rigs.clear();
			this.creatures.clear();
			this.effects = [];
		}
	}
	T.Presentation = Presentation;
})(typeof globalThis !== "undefined" ? globalThis : this);
