((root) => {
	root.BU = root.BU || {};
	const B = root.BU;
	const E = root.My3D2dge;
	const { px } = E;
	const COLORS = { amber: "#f4bd55", coral: "#ff786d", cyan: "#6de3e2" };
	const TAU = Math.PI * 2;
	const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
	const hash = (a, b = 0) => {
		let n = Math.imul(a + 193, b + 4537) ^ 0x9e3779b9;
		n = Math.imul(n ^ (n >>> 16), 0x85ebca6b);
		return ((n ^ (n >>> 13)) >>> 0) / 4294967296;
	};
	const TOOL_NAMES = ["cut", "grip", "solder", "extinguish"];
	const worldLine = (r, g, a, b, c, w = 1) => {
		const p = r.w(...a),
			q = r.w(...b);
		px.line(g, p[0], p[1], q[0], q[1], c, w);
	};
	const worldPoly = (r, g, points, c) =>
		px.poly(
			g,
			points.map((p) => r.w(...p)),
			c,
		);
	const label = (
		_r,
		g,
		text,
		x,
		y,
		color = "#d9e9d5",
		scale = 1,
		align = "center",
	) =>
		E.font.text(g, String(text), x, y, color, {
			scale,
			align,
			outline: false,
			shadow: "#051b19",
		});
	function register() {
		if (E.SHAPES["BU:resistor"]) return;
		E.addAssets({
			set: "BU",
			format: 1,
			materials: {
				pcb: { color: "#155f4b", pattern: "noise", amount: 0.025, scale: 3 },
				green: { color: "#2c7956", pattern: "metal", rivet: 0 },
				case: { color: "#263a46", pattern: "metal", rivet: 0 },
				rubber: { color: "#142229", pattern: "none" },
				steel: { color: "#b5ced0", pattern: "metal", rivet: 0 },
				brass: { color: "#cba965", pattern: "metal", rivet: 0 },
				amber: { color: COLORS.amber, pattern: "none" },
				coral: { color: COLORS.coral, pattern: "none" },
				cyan: { color: COLORS.cyan, pattern: "none" },
				white: { color: "#d9e8df", pattern: "none" },
				blue: { color: "#397e9a", pattern: "none" },
				red: { color: "#cf5c50", pattern: "none" },
				glowing: { color: "#9cf3c4", pattern: "none", glow: 1 },
				warm: { color: "#f7c47b", pattern: "none", glow: 1 },
				window: { color: "#294750", pattern: "none" },
				roof: { color: "#4e7272", pattern: "metal", rivet: 0 },
				concrete: { color: "#8a978d", pattern: "speck", amount: 0.035 },
				stone: { color: "#587276", pattern: "tiles", size: 8 },
			},
			shapes: {
				resistor: {
					about: "Original barrel resistor with two separated metal leads",
					tags: "bomb electronics resistor",
					mats: { body: "amber", lead: "steel" },
					foot: [-18, -6, 18, 6],
					parts: [
						["box", "lead", [-14, 0, 4], [8, 1.5, 1.5]],
						["box", "lead", [14, 0, 4], [8, 1.5, 1.5]],
						["cyl", "body", [-9, 0, 6], 5, 18, { rot: [0, 90, 0], seg: 10 }],
						["box", "rubber", [-5, 0, 10.5], [2, 5, 0.6]],
						["box", "rubber", [2, 0, 10.5], [2, 5, 0.6]],
					],
				},
				capacitor: {
					about:
						"Original cylindrical capacitor, broad cap and two terminal lugs",
					tags: "bomb electronics capacitor",
					mats: { body: "coral", lead: "steel" },
					foot: [-18, -7, 18, 7],
					parts: [
						["box", "lead", [-12, 0, 4], [12, 1.5, 1.5]],
						["box", "lead", [12, 0, 4], [12, 1.5, 1.5]],
						["cyl", "body", [0, 0, 3], 7, 11, { seg: 12 }],
						["cyl", "steel", [0, 0, 14], 6.5, 1, { seg: 12 }],
						["box", "rubber", [0, 0, 15], [7, 1, 0.4]],
						["box", "rubber", [0, 0, 15], [1, 7, 0.4]],
					],
				},
				chip: {
					about:
						"Original chunky square integrated circuit with a corner notch and readable pin banks",
					tags: "bomb electronics chip",
					mats: { body: "cyan", lead: "steel" },
					foot: [-18, -7, 18, 7],
					parts: [
						["box", "lead", [-14, 0, 3], [8, 1.5, 1.5]],
						["box", "lead", [14, 0, 3], [8, 1.5, 1.5]],
						["box", "body", [0, 0, 3], [21, 13, 7]],
						["row", 4, [5, 0, 0], ["box", "lead", [0, -7, 3], [2, 3, 2]]],
						["row", 4, [5, 0, 0], ["box", "lead", [0, 7, 3], [2, 3, 2]]],
						["cyl", "rubber", [-6, -3, 10], 1.4, 0.4, { seg: 8 }],
					],
				},
				jumper: {
					about: "Bent wire jumper with striped insulating sleeve",
					tags: "bomb electronics jumper",
					mats: { lead: "steel" },
					parts: [
						["box", "lead", [0, 0, 5], [34, 1.5, 1.5]],
						["box", "cyan", [0, 0, 5], [12, 3, 2]],
						["box", "rubber", [-3, 0, 7], [1, 3, 0.5]],
						["box", "rubber", [3, 0, 7], [1, 3, 0.5]],
					],
				},
				socket: {
					about: "Two-level solder terminal with central contact aperture",
					tags: "electronics terminal socket",
					parts: [
						["cyl", "brass", [0, 0, 0], 4.3, 1.2, { seg: 12 }],
						["cyl", "steel", [0, 0, 1.2], 3.2, 1.3, { seg: 12 }],
						["cyl", "rubber", [0, 0, 2.5], 1.5, 0.3, { seg: 8 }],
					],
				},
				van: {
					about:
						"Original municipal bomb-response service van with roof beacons, chunky wheels, service stripe and rear equipment locker",
					tags: "response van vehicle municipal",
					parts: [
						["box", "rubber", [0, 0, 3], [24, 40, 4]],
						["box", "white", [0, 2, 7], [25, 34, 15]],
						["box", "blue", [0, -15, 7], [24, 12, 10]],
						["box", "white", [0, -9, 17], [24, 10, 5]],
						["box", "window", [0, -14, 18], [21, 1, 7]],
						["box", "window", [-12.8, -9, 17], [0.5, 9, 7]],
						["box", "window", [12.8, -9, 17], [0.5, 9, 7]],
						["box", "cyan", [0, 5, 12], [26, 27, 3]],
						["box", "rubber", [0, 20, 7], [17, 1, 13]],
						["box", "steel", [0, -22, 5], [27, 2, 3]],
						["box", "warm", [-8, -21, 10], [5, 1, 3]],
						["box", "warm", [8, -21, 10], [5, 1, 3]],
						[
							"mirror",
							"xy",
							[
								"cyl",
								"rubber",
								[13, 12, 3],
								4.4,
								3,
								{ rot: [0, 90, 0], seg: 10 },
							],
						],
						["box", "case", [0, 0, 22], [16, 5, 1]],
						["cyl", "cyan", [-5, 0, 23], 2, 3, { seg: 8 }],
						["cyl", "coral", [5, 0, 23], 2, 3, { seg: 8 }],
						["box", "brass", [0, 9, 23], [9, 12, 2]],
					],
				},
				bomb: {
					about:
						"Original angular bomb housing with green access lid, orange clasps and prominent fuse cage",
					tags: "bomb device housing",
					parts: [
						["box", "case", [0, 0, 0], [38, 28, 12]],
						["box", "rubber", [0, 0, 12], [40, 30, 2]],
						["box", "green", [0, 0, 14], [32, 23, 2]],
						["mirror", "x", ["box", "amber", [19, 0, 5], [3, 8, 4]]],
						[
							"row",
							3,
							[7, 0, 0],
							["cyl", "coral", [0, -4, 16], 2.5, 8, { seg: 8 }],
						],
						["box", "steel", [0, 12, 15], [18, 3, 2]],
						["box", "rubber", [0, 7, 16], [20, 5, 1]],
						["box", "glowing", [0, 7, 17], [16, 2, 0.5]],
					],
				},
				worklamp: {
					about: "Original portable copper work lamp with tripod",
					tags: "work light lamp",
					parts: [
						["cyl", "case", [0, 0, 0], 4, 2, { seg: 6 }],
						["cyl", "steel", [0, 0, 2], 0.8, 25],
						["box", "case", [0, 0, 25], [10, 5, 7]],
						["box", "warm", [0, 3, 26], [8, 0.5, 5]],
						[
							"mirror",
							"x",
							["box", "steel", [3, 0, 0], [1, 1, 7], { rot: [0, 28, 0] }],
						],
					],
					lights: [[0, 5, 25, "#f5b86a", 85]],
				},
				bollard: {
					about: "Harbour mooring bollard",
					tags: "harbor prop",
					parts: [
						["cyl", "case", [0, 0, 0], 4, 2],
						["cyl", "steel", [0, 0, 2], 2, 8],
						["box", "steel", [0, 0, 8], [10, 3, 3]],
					],
				},
				cone: {
					about: "Municipal caution cone",
					tags: "street response safety",
					parts: [
						["box", "rubber", [0, 0, 0], [8, 8, 1]],
						["cyl", "coral", [0, 0, 1], 3.5, 8, { r2: 0.7, seg: 6 }],
						["cyl", "white", [0, 0, 4.5], 2.2, 1.5, { r2: 1.8, seg: 6 }],
					],
				},
				lighthouse: {
					about:
						"Original striped waterfront lighthouse with illuminated lantern room",
					tags: "landmark harbor lighthouse",
					parts: [
						["cyl", "concrete", [0, 0, 0], 10, 3, { seg: 12 }],
						["cyl", "white", [0, 0, 3], 7, 36, { r2: 5.3, seg: 12 }],
						["cyl", "red", [0, 0, 12], 6.6, 5, { r2: 6.3, seg: 12 }],
						["cyl", "red", [0, 0, 27], 5.9, 4, { r2: 5.7, seg: 12 }],
						["cyl", "case", [0, 0, 39], 8, 2, { seg: 12 }],
						["cyl", "warm", [0, 0, 41], 5.8, 7, { seg: 8 }],
						["row", 4, [3, 0, 0], ["box", "case", [0, 5, 41], [0.6, 0.7, 7]]],
						["cyl", "roof", [0, 0, 48], 8, 7, { r2: 0, seg: 8 }],
					],
					lights: [[0, 0, 44, "#ffd38a", 85]],
				},
				transformer: {
					about:
						"Original finned transformer with ceramic terminals and heavy copper busbars",
					tags: "power relay transformer",
					parts: [
						["box", "concrete", [0, 0, 0], [28, 25, 3]],
						["box", "blue", [0, 0, 3], [22, 20, 22]],
						["row", 6, [0, 3, 0], ["box", "steel", [-12, 0, 6], [2, 1, 17]]],
						["row", 6, [0, 3, 0], ["box", "steel", [12, 0, 6], [2, 1, 17]]],
						[
							"row",
							3,
							[7, 0, 0],
							["cyl", "white", [0, 0, 25], 2.7, 9, { seg: 8 }],
						],
						[
							"row",
							3,
							[7, 0, 0],
							["cyl", "brass", [0, 0, 34], 1.8, 3, { seg: 8 }],
						],
						["box", "amber", [0, 10.3, 13], [9, 0.4, 7]],
					],
				},
				exchange: {
					about:
						"Original civic clock tower, bevel crown and tall illuminated clock",
					tags: "central exchange landmark clock tower",
					parts: [
						["box", "concrete", [0, 0, 0], [39, 31, 4]],
						["box", "white", [0, 0, 4], [30, 23, 36]],
						["box", "blue", [0, 0, 40], [32, 25, 3]],
						["box", "white", [0, 0, 43], [21, 21, 26]],
						["box", "case", [0, 10.7, 51], [13, 0.5, 13]],
						["box", "warm", [0, 11, 52], [11, 0.3, 11]],
						["box", "case", [0, 11.3, 55], [1, 0.3, 5]],
						["box", "case", [2, 11.3, 55], [5, 0.3, 1]],
						["cyl", "roof", [0, 0, 69], 18, 11, { r2: 0, seg: 4, rot: 45 }],
						["cyl", "brass", [0, 0, 80], 0.7, 7],
						[
							"row",
							3,
							[8, 0, 0],
							["box", "window", [0, 11.8, 20], [4, 0.5, 11]],
						],
					],
					lights: [[0, 14, 59, "#ffe2a0", 70]],
				},
				ferry: {
					about:
						"Original municipal ferry with angular hull and broad passenger windows",
					tags: "harbor ferry boat",
					parts: [
						[
							"prism",
							"white",
							[0, 0, 0],
							[
								[-18, -34],
								[18, -34],
								[22, 22],
								[0, 37],
								[-22, 22],
							],
							9,
						],
						[
							"prism",
							"blue",
							[0, 0, -4],
							[
								[-17, -32],
								[17, -32],
								[21, 22],
								[0, 37],
								[-21, 22],
							],
							5,
						],
						["box", "concrete", [0, -3, 9], [31, 45, 3]],
						["box", "white", [0, -4, 12], [27, 29, 12]],
						["box", "window", [0, 11, 15], [24, 1, 7]],
						["box", "window", [-14, -4, 15], [0.5, 23, 7]],
						["box", "window", [14, -4, 15], [0.5, 23, 7]],
						["box", "white", [0, -4, 24], [29, 32, 2]],
						["cyl", "red", [0, -13, 26], 3, 8, { seg: 8 }],
					],
				},
			},
		});
		E.Humanoid.pose("bu-radio", (J, w) => {
			if (!J.handR) return;
			const p = [2.8, -4.8, 22];
			for (let k = 0; k < 3; k++) J.handR[k] += (p[k] - J.handR[k]) * w;
		});
	}
	class Art {
		constructor(game) {
			register();
			this.game = game;
			this.t = 0;
			this.seen = 0;
			this.sceneKey = "";
			this.lastState = null;
			this.anim = { jaw: 0, lift: 0, glow: 0, foam: 0, shake: 0, arrival: 1 };
			this.cursor = { x: 0, y: 0, z: 27 };
			this.effects = [];
			this.nativeTweens = [];
			this.cityView = new E.View(
				"bu-city",
				"Municipal diorama",
				-22,
				37,
				1.65,
				1,
			);
			this.boardView = new E.View(
				"bu-circuit",
				"Circuit workbench",
				0,
				70,
				1.45,
				1,
			);
			this.rigs = {
				partner: new E.Humanoid({
					size: 1.05,
					weapon: null,
					hair: "ponytail",
					hat: { style: "cap", color: "#d8ab57" },
					outfit: "coat",
					sleeves: "long",
					colors: {
						skin: "#dfaa84",
						hair: "#513c34",
						cloth: "#e1b660",
						coat: "#d9a24f",
						pants: "#263e4c",
						boot: "#192c39",
						trim: "#a6e9df",
						glove: "#d6ede5",
						belt: "#1d3037",
					},
				}),
				crew: new E.Humanoid({
					size: 0.98,
					weapon: null,
					hat: { style: "helmet", color: "#6accc1" },
					hair: "short",
					outfit: "coat",
					sleeves: "long",
					colors: {
						skin: "#9a6c51",
						hair: "#262f35",
						cloth: "#4ea69a",
						coat: "#438f83",
						pants: "#263d4b",
						boot: "#1b2a32",
						trim: "#d8debd",
						glove: "#d6e8dd",
					},
				}),
				saboteur: new E.Humanoid({
					size: 1.1,
					weapon: null,
					hair: "spiky",
					outfit: "coat",
					sleeves: "long",
					colors: {
						skin: "#c6b1ad",
						hair: "#d5d8d1",
						cloth: "#8a69ab",
						coat: "#65518c",
						pants: "#302b48",
						boot: "#211f35",
						trim: "#eab66d",
						glove: "#324153",
					},
				}),
			};
			this.palette = {};
		}
		frame(state, v = {}) {
			const W = this.game.W || this.game.screen.W || 640,
				H = this.game.H || this.game.screen.H || 360;
			const work =
				!!v.boardId &&
				["work", "board", "play", "workspace", "repair", "editor"].includes(
					v.screen,
				);
			const tall = H > W * 1.1;
			return {
				W,
				H,
				work,
				tall,
				cx: work
					? tall
						? W * 0.5
						: W * 0.38
					: v.screen === "title"
						? W * 0.66
						: W * 0.49,
				cy: work ? H * (tall ? 0.4 : 0.5) : H * 0.64,
				scale: work
					? tall
						? Math.min((W * 0.9) / 298, (H * 0.5) / 178)
						: Math.min(1.45, (W * 0.7) / 285, (H * 0.65) / 160)
					: Math.min(1.65, W / 370, H / 215),
				theme:
					state?.caseId === "training"
						? "workshop"
						: state?.caseId ||
							["waterfront", "relay", "central"][Math.floor(this.t / 18) % 3],
			};
		}
		board(state, v) {
			return state?.boards?.find((b) => b.id === v.boardId);
		}
		project(x, y, z = 0) {
			const p = this.game.view.p(x, y, z),
				cam = this.game.cam;
			return [p[0] - Math.floor(cam.x), p[1] - Math.floor(cam.y)];
		}
		targets(state, v = {}) {
			const b = this.board(state, v);
			if (!b) return [];
			const out = [];
			const target = (id, kind, wx, wy, wz, extra = {}) => {
				const [x, y] = this.project(wx, wy, wz);
				out.push({
					id,
					kind,
					x,
					y,
					wx,
					wy,
					wz,
					worldX: wx,
					worldY: wy,
					radius:
						(kind === "component" ? 14 : 12) *
						Math.max(1, this.game.view.scale / 1.45),
					...extra,
				});
			};
			for (const c of b.components) {
				for (let k = 0; k < 2; k++) {
					const a = c.terminals?.[k] || [k ? 18 : -18, 0];
					target(`${c.id}:${k}`, "terminal", c.x + a[0], c.y + a[1], 8, {
						componentId: c.id,
						component: c.id,
						terminal: k,
						label: `${c.id} · ${k ? "right" : "left"} joint`,
					});
				}
				target(`${c.id}:body`, "component", c.x, c.y, 11, {
					componentId: c.id,
					component: c.id,
					label: `${c.id} · ${c.removed && !c.part ? "empty socket" : c.shape}`,
				});
			}
			const n = b.spares.length;
			b.spares.forEach((s, i) => {
				target(`spare:${s.id}`, "spare", (i - (n - 1) / 2) * 66, -79, 8, {
					spare: s.id,
					label: `${s.id} · ${s.jumper ? "jumper" : s.shape} · ${s.color}`,
				});
			});
			target("test", "test", 111, -11, 8, {
				label: "Test socket · inspect spare",
			});
			if (b.fire)
				target("fire", "fire", 0, 0, 18, {
					label: "Active fire · hold extinguisher",
					radius: 36,
				});
			return out;
		}
		update(dt, state, v = {}) {
			this.t += Math.max(0, dt);
			this.lastState = state;
			const f = this.frame(state, v),
				key = `${f.work ? "work" : "city"}:${v.boardId || ""}:${f.theme}`;
			if (key !== this.sceneKey) {
				for (const tw of this.nativeTweens) tw.cancel?.();
				this.nativeTweens = [];
				this.anim = { jaw: 0, lift: 0, glow: 0, foam: 0, shake: 0, arrival: 1 };
				this.sceneKey = key;
				this.game.setView(f.work ? this.boardView : this.cityView);
				this.game.cam.snap = true;
				this.anim.arrival = v.reducedMotion ? 0 : 1;
				this.nativeTweens.push(
					this.game.tween(this.anim, { arrival: 0 }, 0.65, {
						ease: "outCubic",
					}),
				);
			}
			const view = f.work ? this.boardView : this.cityView;
			const yaw = f.work ? 0 : -22,
				pitch = f.work ? 70 : 37;
			if (view.scale !== f.scale) {
				view.set(yaw, pitch, f.scale, 1);
				this.game.setView(view);
				this.game.cam.snap = true;
			}
			this.game.cam.offset = [f.cx - f.W / 2, f.cy - f.H / 2];
			this.game.cam.smooth = 0.15;
			this.game.cam.bounds = null;
			this.game.focus(0, 0, 0);
			this.game.lights.enabled = true;
			this.game.lights.ambient = f.work ? 0.71 : 0.56;
			const b = this.board(state, v);
			const focusId =
				typeof v.focusTarget === "string" ? v.focusTarget : v.focusTarget?.id;
			const target = this.targets(state, v).find((t) => t.id === focusId);
			if (target) {
				const k = v.reducedMotion
					? 1
					: 1 - Math.exp((-dt * 14) / (state?.tuning?.toolTravel || 1));
				this.cursor.x += (target.wx - this.cursor.x) * k;
				this.cursor.y += (target.wy - this.cursor.y) * k;
			}
			this.cursor.z = b?.hold
				? 15
				: 26 + (!v.reducedMotion ? Math.sin(this.t * 3) * 0.7 : 0);
			const events = state?.events || [];
			for (const ev of events)
				if (ev.id > this.seen) {
					this.seen = ev.id;
					if (ev.board && ev.board !== v.boardId) continue;
					this.pulse(ev, v);
				}
			if (
				state?.events?.length &&
				this.seen > state.events[state.events.length - 1].id
			)
				this.seen = 0;
			for (const effect of this.effects) effect.life -= dt;
			this.effects = this.effects.filter((e) => e.life > 0);
			const celebrate = state?.status === "won";
			this.rigs.partner.update(dt, {
				x: 27,
				y: 56,
				z: 2,
				facing: -0.9,
				pose: celebrate ? "cheer" : "bu-radio",
				expr: celebrate ? "smile" : "wince",
			});
			this.rigs.crew.update(dt, {
				x: 65,
				y: 49,
				z: 2,
				facing: -2.1,
				pose: celebrate ? "wave" : "hips",
				expr: celebrate ? "smile" : null,
			});
			this.rigs.saboteur.update(dt, {
				x: 0,
				y: 0,
				z: 0,
				facing: 1.2,
				pose: "hips",
				expr: "angry",
			});
		}
		pulse(ev, v) {
			const duration = v.reducedMotion ? 0.12 : 0.32;
			const type = ev.type || "";
			if (/cut/.test(type)) {
				this.anim.jaw = 1;
				this.nativeTweens.push(
					this.game.tween(this.anim, { jaw: 0 }, duration, { ease: "outBack" }),
				);
			}
			if (/grip|remove|pick/.test(type)) {
				this.anim.lift = 1;
				this.nativeTweens.push(
					this.game.tween(this.anim, { lift: 0 }, 0.48, { ease: "outCubic" }),
				);
			}
			if (/place|solder|test|complete|reveal/.test(type)) {
				this.anim.glow = 1;
				this.nativeTweens.push(
					this.game.tween(this.anim, { glow: 0 }, 0.65, { ease: "outQuad" }),
				);
			}
			if (/foam|extinguish/.test(type)) {
				this.anim.foam = 1;
				this.nativeTweens.push(
					this.game.tween(this.anim, { foam: 0 }, 1.4, { ease: "outQuad" }),
				);
			}
			if (/recovery|wrong|fire/.test(type)) {
				this.anim.shake = 1;
				this.nativeTweens.push(
					this.game.tween(this.anim, { shake: 0 }, 0.5, { ease: "outQuad" }),
				);
			}
			if (/cut|solder|place|complete/.test(type))
				this.effects.push({
					type,
					component: ev.component,
					terminal: ev.terminal,
					life: 0.65,
					total: 0.65,
				});
		}
		draw(r, state, v = {}) {
			const f = this.frame(state, v);
			if (f.work && this.board(state, v)) this.drawBoard(r, state, v, f);
			else this.drawCity(r, state, v, f);
		}
		drawBoard(r, state, v, f) {
			const b = this.board(state, v),
				g = r.ctx;
			r.sky(["#081b21", "#0d2229", "#172e32"]);
			// Layered field workbench, not a floating UI panel.
			for (let y = 0; y < f.H; y += 14) {
				px.rect(g, 0, y, f.W, 1, "#142a30");
				for (let x = y % 28 ? 7 : 0; x < f.W; x += 35)
					px.rect(g, x, y, 1, 14, "#10262c");
			}
			r.queue(
				0,
				0,
				0,
				(q) => {
					r.box(q, -149, -96, -5, 149, 80, 0, "#243b42", "#14262d");
					r.box(q, -144, -92, 0, 144, 76, 4, "#162d34", "#0a1b24");
					r.box(
						q,
						-135,
						-65,
						4,
						135,
						68,
						7,
						b.complete ? "#21664b" : "#1d674e",
						"#104a3b",
					);
					// Bright bevels give the green PCB its substantial thickness.
					worldLine(r, q, [-134, -65, 7], [134, -65, 7], "#6baf85", 1);
					worldLine(r, q, [-135, -64, 7], [-135, 67, 7], "#438a65", 1);
					worldLine(r, q, [-135, 68, 7], [135, 68, 7], "#082c26", 2);
					// A silkscreen edge and separated etched trace lanes.
					worldPoly(
						r,
						q,
						[
							[-129, -59, 7],
							[129, -59, 7],
							[129, 61, 7],
							[-129, 61, 7],
						],
						"#1a5e49",
					);
					for (let i = 0; i < 22; i++) {
						const y = -55 + (i % 11) * 10,
							x = -123 + Math.floor(i / 11) * 138;
						worldLine(
							r,
							q,
							[x, y, 7.1],
							[x + 18 + (i % 3) * 9, y, 7.1],
							i % 2 ? "#226d57" : "#287a60",
							1,
						);
						worldLine(
							r,
							q,
							[x + 18 + (i % 3) * 9, y, 7.1],
							[x + 18 + (i % 3) * 9, y + 5, 7.1],
							"#287a60",
							1,
						);
					}
					for (const c of b.components)
						for (let k = 0; k < 2; k++) {
							const a = c.terminals?.[k] || [k ? 18 : -18, 0],
								x = c.x + a[0],
								y = c.y + a[1];
							const dir = k ? 1 : -1,
								lane = c.y < 0 ? -48 : 53;
							const color = c.done ? "#80cfa0" : "#67c9bf";
							worldLine(r, q, [x, y, 7.4], [x + dir * 14, y, 7.4], color, 2);
							worldLine(
								r,
								q,
								[x + dir * 14, y, 7.4],
								[x + dir * 14, lane, 7.4],
								color,
								2,
							);
							worldLine(
								r,
								q,
								[x + dir * 14, lane, 7.4],
								[dir * 121, lane, 7.4],
								color,
								2,
							);
							const p = r.w(dir * 121, lane, 7.5);
							px.disc(q, p[0], p[1], 2, "#8cdcd0");
							px.disc(q, p[0], p[1], 1, "#1b5b48");
						}
					for (const x of [-128, 128])
						for (const y of [-59, 61]) {
							const p = r.w(x, y, 8);
							px.disc(q, p[0], p[1], 4, "#b3c4ae");
							px.disc(q, p[0], p[1], 2, "#2b4840");
							px.line(q, p[0] - 1, p[1] + 1, p[0] + 1, p[1] - 1, "#8b9f92");
						}
					// Orange housing latches and hazard striping.
					for (const x of [-143, 143]) {
						r.box(q, x - 3, -8, 2, x + 3, 11, 10, "#e2aa4a", "#8d5d30");
						for (let y = -5; y < 11; y += 5)
							worldLine(
								r,
								q,
								[x - 2, y, 10.2],
								[x + 2, y + 3, 10.2],
								"#27343a",
								2,
							);
					}
					const name = r.w(-122, 57, 8);
					label(
						r,
						q,
						`BU / ${b.id}   ${b.complete ? "CONTINUITY SECURED" : "LIVE CIRCUIT"}`,
						name[0],
						name[1],
						"#b5cf9f",
						1,
						"left",
					);
					const off = r.w(91, 55, 8);
					label(r, q, "12V", off[0], off[1], "#7ca98b");
				},
				{ bias: -10000 },
			);
			this.drawTray(r, b, state, v);
			const current = b.order[b.step];
			for (const c of b.components) this.drawComponent(r, b, c, current, v);
			this.drawTestSocket(r, b, state, v);
			const targets = this.targets(state, v),
				focus = targets.find(
					(t) =>
						t.id ===
						(typeof v.focusTarget === "string"
							? v.focusTarget
							: v.focusTarget?.id),
				);
			this.drawFocus(r, b, focus, state, v);
			this.drawTool(r, b, v);
			if (b.fire) this.drawFire(r, b, v);
			if (this.anim.foam > 0 || b.hold?.tool === "extinguish")
				this.drawFoam(r, b, v);
			r.overlay((q) => {
				// An unobtrusive etched workbench legend locates the different states.
				const p = r.w(-124, 75, 4);
				label(
					r,
					q,
					b.complete
						? "BOARD QUIET  /  EVIDENCE PUBLISHED"
						: "CUT  >  GRIP  >  FIT  >  SOLDER",
					p[0],
					p[1],
					b.complete ? "#a4e6ae" : "#73958b",
					1,
					"left",
				);
				if (b.recovery) {
					const c = b.components.find((x) => x.id === b.recovery.component);
					if (c) {
						const a = c.terminals?.[b.recovery.terminal] || [
								b.recovery.terminal ? 18 : -18,
								0,
							],
							p = r.w(c.x + a[0], c.y + a[1], 18);
						label(
							r,
							q,
							`RESTORE ${b.recovery.remaining.toFixed(1)}s`,
							p[0],
							p[1] - 19,
							"#ffd393",
						);
					}
				}
				if (b.hold) this.drawHoldMeter(r, q, b, state);
				if (f.tall) {
					const x = f.W * 0.5,
						y = f.H * 0.8;
					label(r, q, "TAP A JOINT  /  HOLD TO WORK", x, y, "#b5d4c7");
				}
			});
			r.game.lights.add(-130, -95, 60, 185, 0.52, { color: "#ffcf8c" });
			r.game.lights.add(130, 15, 40, 150, 0.35, { color: "#67d9e0" });
			if (b.fire) r.game.lights.add(0, 0, 28, 145, 0.8, { color: "#ff7944" });
		}
		drawTray(r, b, _state, _v) {
			r.queue(
				0,
				-79,
				3,
				(g) => {
					r.box(g, -121, -92, 2, 121, -66, 6, "#233c43", "#12292f");
					worldLine(r, g, [-120, -92, 6], [120, -92, 6], "#58787a");
					const n = b.spares.length;
					b.spares.forEach((s, i) => {
						const x = (i - (n - 1) / 2) * 66;
						r.box(g, x - 25, -89, 6, x + 25, -68, 7, "#142b31", "#10262c");
						const p = r.w(x, -68, 7);
						label(
							r,
							g,
							`${s.id}  ${s.jumper ? "WIRE" : s.color.toUpperCase()}`,
							p[0],
							p[1],
							"#a8c1ba",
						);
						if (!s.available) {
							const q = r.w(x, -80, 7);
							label(
								r,
								g,
								b.held === s.id ? "HELD" : "IN USE",
								q[0],
								q[1] - 3,
								"#49645e",
							);
						}
					});
				},
				{ bias: -9000 },
			);
			b.spares.forEach((s, i) => {
				if (!s.available) return;
				const x = (i - (b.spares.length - 1) / 2) * 66;
				r.shape(`BU:${s.jumper ? "jumper" : s.shape}`, x, -80, 8, {
					charView: false,
					scale: 0.75,
					shadow: true,
					mats: { body: `BU:${s.color}` },
				});
				r.queue(
					x,
					-80,
					17,
					(g) => this.drawPattern(r, g, x, -80, 17, s.color, 0.7),
					{ bias: 7 },
				);
			});
		}
		drawComponent(r, b, c, current, _v) {
			const isCurrent = c.id === current && !c.done;
			const part = c.part ? b.spares.find((s) => s.id === c.part) : null;
			const body = part || c,
				shape = part?.jumper ? "jumper" : body.shape;
			const present = !c.removed || !!part;
			// Both terminals remain tangible targets throughout the repair state machine.
			for (let k = 0; k < 2; k++) {
				const a = c.terminals?.[k] || [k ? 18 : -18, 0],
					x = c.x + a[0],
					y = c.y + a[1];
				r.shape("BU:socket", x, y, 7.4, { charView: false, shadow: false });
				r.queue(x, y, 12, (g) => {
					const p = r.w(x, y, 10),
						joint = c.joints[k],
						cut = c.cuts[k];
					if (joint) {
						px.disc(g, p[0], p[1], 3.2, c.done ? "#d0f1df" : "#dbe6df");
						px.dot(g, p[0] - 1, p[1] - 1, "#ffffff");
					} else if (cut) {
						px.line(g, p[0] - 2, p[1] - 2, p[0] + 2, p[1] + 2, "#102a27", 2);
						px.dot(g, p[0] + 3, p[1] - 3, "#e9b565");
					}
					if (b.recovery?.component === c.id && b.recovery?.terminal === k) {
						const pulse = 0.65 + 0.35 * Math.sin(this.t * 8);
						r.glowDisc(g, p[0], p[1], 13, "#ffb65d", pulse * 0.6);
						px.rect(g, p[0] - 6, p[1] - 6, 12, 1, "#ffcf85");
						px.rect(g, p[0] - 6, p[1] + 6, 12, 1, "#ffcf85");
					}
				});
			}
			r.queue(
				c.x,
				c.y,
				8,
				(g) => {
					// Printed silhouette and component ID are readable even without the original part.
					const p = r.w(c.x, c.y - 12, 8),
						target = c.done ? "#8cdbac" : isCurrent ? "#f1dca4" : "#86aa91";
					label(r, g, `${c.done ? "✓ " : ""}${c.id}`, p[0], p[1] - 7, target);
					const q = r.w(c.x, c.y + 12, 8);
					label(
						r,
						g,
						c.done
							? "TESTED"
							: !present
								? "EMPTY"
								: `${body.color.toUpperCase()} / ${body.jumper ? "WIRE" : body.shape.toUpperCase()}`,
						q[0],
						q[1] + 3,
						c.done ? "#b3e5bc" : "#93b899",
					);
					if (!present) {
						const a = r.w(c.x - 11, c.y - 6, 8),
							d = r.w(c.x + 11, c.y + 6, 8);
						for (let x = a[0]; x < d[0]; x += 4) {
							px.rect(g, x, a[1], 2, 1, "#6a9a7d");
							px.rect(g, x, d[1], 2, 1, "#6a9a7d");
						}
						for (let y = a[1]; y < d[1]; y += 4) {
							px.rect(g, a[0], y, 1, 2, "#6a9a7d");
							px.rect(g, d[0], y, 1, 2, "#6a9a7d");
						}
					}
				},
				{ bias: -30 },
			);
			if (present) {
				let z = 8;
				if (c.part && this.anim.glow > 0) z += this.anim.glow * 2;
				r.shape(`BU:${shape}`, c.x, c.y, z, {
					charView: false,
					shadow: true,
					mats: { body: `BU:${body.color}` },
				});
				r.queue(
					c.x,
					c.y,
					z + 15,
					(g) => {
						this.drawPattern(r, g, c.x, c.y, z + 13, body.color, 1);
						if (c.done) {
							const p = r.w(c.x, c.y, z + 15);
							px.disc(g, p[0] + 13, p[1] - 1, 2, "#9bf0ae");
						}
						if (isCurrent && !c.done) {
							const p = r.w(c.x - 26, c.y, z + 3);
							px.poly(
								g,
								[
									[p[0] - 4, p[1] - 3],
									[p[0], p[1]],
									[p[0] - 4, p[1] + 3],
								],
								"#f9d895",
							);
						}
					},
					{ bias: 30 },
				);
			}
			for (const e of this.effects)
				if (e.component === c.id)
					r.queue(
						c.x,
						c.y,
						25,
						(g) => {
							const k = 1 - e.life / e.total,
								p = r.w(c.x, c.y, 16);
							if (/solder|cut/.test(e.type))
								for (let j = 0; j < 6; j++) {
									const a = (j * TAU) / 6 + 0.2,
										rr = 3 + k * 17;
									px.rect(
										g,
										p[0] + Math.cos(a) * rr,
										p[1] + Math.sin(a) * rr,
										2,
										1,
										j % 2 ? "#ffe4a5" : "#b2f4e9",
									);
								}
							else {
								const rr = 4 + k * 25;
								for (let j = 0; j < 16; j++) {
									const a = (j * TAU) / 16;
									px.dot(
										g,
										p[0] + Math.cos(a) * rr,
										p[1] + Math.sin(a) * rr * 0.6,
										"#adf0c7",
									);
								}
							}
						},
						{ bias: 100 },
					);
		}
		drawPattern(r, g, x, y, z, color, s = 1) {
			const p = r.w(x, y, z),
				c = "#213a3b";
			if (color === "amber") {
				for (let k = -1; k <= 1; k++)
					px.rect(g, p[0] + k * 4 * s - 1, p[1] - 3 * s, 1.5 * s, 5 * s, c);
			} else if (color === "coral") {
				for (const [dx, dy] of [
					[-3, -2],
					[3, -2],
					[0, 2],
				])
					px.disc(g, p[0] + dx * s, p[1] + dy * s, 1.1 * s, c);
			} else {
				px.line(
					g,
					p[0] - 3 * s,
					p[1] - 3 * s,
					p[0] + 3 * s,
					p[1] + 3 * s,
					c,
					1,
				);
				px.line(
					g,
					p[0] - 3 * s,
					p[1] + 3 * s,
					p[0] + 3 * s,
					p[1] - 3 * s,
					c,
					1,
				);
			}
		}
		drawTestSocket(r, b, state, _v) {
			r.queue(
				111,
				-11,
				8,
				(g) => {
					r.box(g, 99, -31, 7, 125, 10, 10, "#253f3e", "#102c2c");
					r.box(g, 102, -28, 10, 122, 0, 12, "#142727", "#0b1e23");
					const p = r.w(111, -10, 13);
					px.disc(g, p[0], p[1], 5, "#889c8a");
					px.disc(g, p[0], p[1], 2, "#172b2c");
					const title = r.w(111, -26, 14);
					label(r, g, "TEST", title[0], title[1], "#f0cb8b");
					const rule = r.w(111, 5, 13);
					label(
						r,
						g,
						b.ruleKnown ? b.rule.toUpperCase() : "? RULE",
						rule[0],
						rule[1],
						b.ruleKnown ? "#a5dfb3" : "#dfc58c",
					);
					const cost = r.w(111, 13, 10);
					label(r, g, `${state.tuning.testCost}s`, cost[0], cost[1], "#9bb39a");
					const ex = r.w(110, 36, 9);
					label(r, g, "EXAMPLE", ex[0], ex[1] - 2, "#8caa92");
					const from = b.example?.source || b.example?.from,
						to = b.example?.replacement || b.example?.to;
					if (from && to) {
						label(
							r,
							g,
							`${from.shape.slice(0, 3).toUpperCase()} > ${to.shape.slice(0, 3).toUpperCase()}`,
							ex[0],
							ex[1] + 7,
							"#c1cfa5",
						);
						label(
							r,
							g,
							`${from.color.slice(0, 3).toUpperCase()} > ${to.color.slice(0, 3).toUpperCase()}`,
							ex[0],
							ex[1] + 16,
							"#b0c4a2",
						);
					}
				},
				{ bias: 30 },
			);
			const p = r.w(111, -11, 20);
			if (this.anim.glow > 0.1)
				r.overlay((g) =>
					r.glowDisc(g, p[0], p[1], 21, "#97e8bb", this.anim.glow * 0.35),
				);
		}
		drawFocus(r, b, focus, _state, v) {
			if (!focus) return;
			const current = b.components.find((c) => c.id === b.order[b.step]),
				selected =
					focus.componentId &&
					b.components.find((c) => c.id === focus.componentId);
			const tool =
				typeof v.tool === "number" ? TOOL_NAMES[v.tool] : v.tool || "cut";
			let legal = false;
			if (focus.kind === "terminal" && selected) {
				const k = focus.terminal;
				legal =
					(tool === "cut" &&
						selected.id === current?.id &&
						!selected.cuts[k]) ||
					(tool === "solder" &&
						(!!selected.part || !!b.recovery) &&
						!selected.joints[k]);
			}
			if (focus.kind === "component")
				legal = tool === "grip" && selected?.id === current?.id;
			if (focus.kind === "spare") legal = tool === "grip";
			if (focus.kind === "test") legal = true;
			if (focus.kind === "fire") legal = tool === "extinguish";
			const color = legal ? "#f9df9e" : "#dcece1",
				rr = (focus.kind === "component" ? 16 : 11) * Math.max(1, r.ppu / 1.45);
			r.overlay((g) => {
				const [x, y] = r.w(focus.wx, focus.wy, focus.wz);
				// Open corner brackets keep the actual terminal visible under the tool.
				for (const sx of [-1, 1])
					for (const sy of [-1, 1]) {
						const xx = x + sx * rr,
							yy = y + sy * rr;
						px.line(g, xx, yy, xx - sx * 5, yy, color, 2);
						px.line(g, xx, yy, xx, yy - sy * 4, color, 2);
					}
				if (legal) r.glowDisc(g, x, y, rr + 4, "#e9ca7e", 0.12);
			});
		}
		drawTool(r, b, v) {
			if (!v.focusTarget && !b.held && !b.hold) return;
			const tool =
					typeof v.tool === "number" ? TOOL_NAMES[v.tool] : v.tool || "cut",
				x = this.cursor.x,
				y = this.cursor.y,
				z = this.cursor.z;
			r.queue(
				x,
				y,
				z,
				(g) => {
					const p = r.w(x, y, z),
						s = r.ppu * 0.85,
						ox = p[0],
						oy = p[1] - 4;
					const line = (a, b, c, w = 2) =>
						px.line(
							g,
							ox + a[0] * s,
							oy + a[1] * s,
							ox + b[0] * s,
							oy + b[1] * s,
							c,
							w * s,
						);
					const dot = (dx, dy, rr, c) =>
						px.disc(g, ox + dx * s, oy + dy * s, rr * s, c);
					// Each tool uses the same authoritative contact point. Anticipation and
					// settle are native game tweens, independently cancellable on transition.
					const jaw = 4 * (1 - this.anim.jaw);
					if (tool === "cut") {
						line([-10, -25], [-3, -8], "#10232d", 5);
						line([10, -25], [3, -8], "#10232d", 5);
						line([-10, -25], [-3, -8], "#dc925d", 3);
						line([10, -25], [3, -8], "#e6b176", 3);
						line([-3, -9], [jaw, 2], "#d4e0d8", 3);
						line([3, -9], [-jaw, 2], "#90a7a8", 3);
						dot(0, -8, 2, "#445e67");
						dot(-0.5, -9, 0.8, "#f5f0d7");
					} else if (tool === "grip") {
						line([-8, -27], [-3, -12], "#14313b", 5);
						line([8, -27], [3, -12], "#14313b", 5);
						line([-8, -27], [-3, -12], "#7bc8c9", 3);
						line([8, -27], [3, -12], "#3e8d99", 3);
						line([-3, -12], [-4, 0], "#b8cfce", 3);
						line([3, -12], [4, 0], "#b8cfce", 3);
						dot(0, -12, 2.5, "#476574");
						line([-4, 0], [-1, 0], "#eff2df", 2);
						line([4, 0], [1, 0], "#eff2df", 2);
						if (b.held) {
							const spare = b.spares.find((a) => a.id === b.held);
							const c = COLORS[spare?.color] || "#add8cb";
							px.rect(
								g,
								ox - 9 * s,
								oy + (4 - this.anim.lift * 10) * s,
								18 * s,
								6 * s,
								c,
							);
							px.line(
								g,
								ox - 16 * s,
								oy + 7 * s,
								ox + 16 * s,
								oy + 7 * s,
								"#c1d3d0",
								1,
							);
						}
					} else if (tool === "solder") {
						line([18, -29], [10, -15], "#152b35", 9);
						line([18, -29], [10, -15], "#e4b465", 6);
						line([10, -15], [5, -8], "#667c83", 4);
						line([5, -8], [0, 1], "#d7e2db", 2);
						line([21, -29], [29, -39], "#1d3844", 3);
						if (b.hold?.tool === "solder") {
							dot(0, 1, 3, "#fff3ba");
							r.glowDisc(g, ox, oy + 1, 12, "#ffd075", 0.4);
							for (let i = 0; i < 4; i++)
								px.ddisc(
									g,
									ox + Math.sin(this.t * 4 + i) * 4,
									oy - 7 - i * 6,
									3 + i,
									"#bcddd1",
									0.16,
								);
						}
					} else {
						px.rect(g, ox + 10 * s, oy - 31 * s, 15 * s, 25 * s, "#e8dfc7");
						px.rect(g, ox + 10 * s, oy - 26 * s, 15 * s, 5 * s, "#e17160");
						px.rect(g, ox + 12 * s, oy - 33 * s, 10 * s, 3 * s, "#536c74");
						line([16, -30], [5, -22], "#223d48", 4);
						line([5, -22], [-1, 1], "#41606a", 3);
						line([-1, 1], [-4, 2], "#d3dfd4", 3);
					}
					const contact = r.w(x, y, 8);
					px.line(
						g,
						contact[0] - 3,
						contact[1],
						contact[0] + 3,
						contact[1],
						"#f6e0a6",
						1,
					);
					px.line(
						g,
						contact[0],
						contact[1] - 3,
						contact[0],
						contact[1] + 3,
						"#f6e0a6",
						1,
					);
				},
				{ bias: 2000, emissive: 0.2 },
			);
		}
		drawFire(r, _b, _v) {
			r.queue(
				0,
				0,
				23,
				(g) => {
					for (let k = 0; k < 8; k++) {
						const x = Math.sin(k * 2.3) * 30,
							y = Math.cos(k * 3.1) * 15,
							p = r.w(x, y, 18),
							h = 14 + Math.sin(this.t * (8 + k * 0.3) + k) * 5;
						px.poly(
							g,
							[
								[p[0] - 7, p[1] + 5],
								[p[0] - 5, p[1] - h * 0.4],
								[p[0] - 2, p[1] - h],
								[p[0] + 1, p[1] - h * 0.5],
								[p[0] + 5, p[1] - h * 0.85],
								[p[0] + 7, p[1] + 4],
							],
							"#dc6940",
						);
						px.poly(
							g,
							[
								[p[0] - 4, p[1] + 5],
								[p[0] - 1, p[1] - h * 0.55],
								[p[0] + 2, p[1] - h * 0.2],
								[p[0] + 4, p[1] + 4],
							],
							"#ffd286",
						);
						for (let j = 0; j < 3; j++) {
							const u = (this.t * 0.45 + j * 0.31 + k * 0.13) % 1;
							px.ddisc(
								g,
								p[0] + Math.sin(k + u * 4) * 12,
								p[1] - u * 45,
								5 + u * 8,
								"#283a3b",
								(1 - u) * 0.4,
							);
						}
					}
					const p = r.w(0, 0, 40);
					label(r, g, "FIRE  /  EXTINGUISH", p[0], p[1] - 21, "#ffe2b0");
				},
				{ bias: 500 },
			);
		}
		drawFoam(r, b, _v) {
			r.queue(
				0,
				0,
				31,
				(g) => {
					const strength = b.hold?.tool === "extinguish" ? 1 : this.anim.foam;
					for (let i = 0; i < 30; i++) {
						const a = i * 2.3999,
							rr = 10 + hash(i, 12) * 30,
							dx = Math.cos(a) * rr,
							dy = Math.sin(a) * rr * 0.6,
							p = r.w(dx, dy, 21);
						px.disc(
							g,
							p[0],
							p[1],
							(2 + hash(i, 8) * 4) * strength,
							i % 3 ? "#d6e9dc" : "#eff8e8",
						);
						if (i % 3 === 0) px.disc(g, p[0] - 1, p[1] - 1, 1, "#ffffff");
					}
					if (b.fire) {
						const p = r.w(0, 0, 45);
						label(r, g, "HOLD  /  FOAM ON FIRE", p[0], p[1] - 26, "#eef5df");
					}
				},
				{ bias: 700, emissive: 0.2 },
			);
		}
		drawHoldMeter(r, g, b, state) {
			const hold = b.hold,
				current = hold.duration || 0,
				solder = hold.tool === "solder";
			const max = solder
				? Math.max(state.tuning.solderMax * 1.4, 1.6)
				: state.tuning.extinguishTime * 1.3;
			const W = 98,
				H = 8,
				x = this.frame(state, { screen: "work", boardId: b.id }).cx - W / 2,
				y = this.frame(state, { screen: "work", boardId: b.id }).H * 0.79;
			px.rect(g, x - 3, y - 3, W + 6, H + 6, "#0a1c24");
			px.rect(g, x, y, W, H, "#34464a");
			const lo = solder ? state.tuning.solderMin : state.tuning.extinguishTime,
				hi = solder ? state.tuning.solderMax : max;
			px.rect(g, x + (W * lo) / max, y, (W * (hi - lo)) / max, H, "#78b98b");
			px.rect(
				g,
				x,
				y,
				W * clamp(current / max, 0, 1),
				2,
				solder ? "#ffe4a5" : "#e6f5e6",
			);
			const xx = x + W * clamp(current / max, 0, 1);
			px.rect(g, xx - 1, y - 3, 2, H + 6, "#f8f1cf");
			label(
				r,
				g,
				solder ? "RELEASE IN THE GREEN BAND" : "HOLD UNTIL THE GREEN BAND",
				x + W / 2,
				y - 13,
				"#e4ead1",
			);
		}
		drawCity(r, state, v, f) {
			const theme = f.theme,
				won = state?.status === "won" || v.success,
				lost = state?.status === "lost";
			const sky =
				theme === "relay"
					? ["#0b192f", "#1a334b", "#555762"]
					: theme === "central"
						? ["#13182d", "#34314d", "#79515f"]
						: ["#0b2435", "#294d62", "#b98b77"];
			r.sky(sky);
			const g = r.ctx;
			// Distant skyline and water are native pixel primitives behind the world.
			const horizon = f.H * 0.47;
			for (let i = 0; i < 90; i++) {
				const x = hash(i, 1) * f.W,
					y = hash(i, 4) * f.H * 0.38;
				px.dot(g, x, y, i % 5 ? "#7795a8" : "#d8d5bf");
			}
			px.disc(
				g,
				f.W * 0.76,
				f.H * 0.17,
				13,
				theme === "waterfront" ? "#f7d6aa" : "#c6c8ba",
			);
			px.disc(
				g,
				f.W * 0.76 + 5,
				f.H * 0.17 - 3,
				12,
				theme === "waterfront" ? "#e0ae8f" : "#30364b",
			);
			for (let i = 0; i < 45; i++) {
				const x = (i * f.W) / 43 - 14,
					w = 8 + hash(i, 2) * 16,
					h = 12 + hash(i, 3) * 40;
				px.rect(g, x, horizon - h, w, h, "#223c4c");
				px.rect(g, x + 1, horizon - h, w - 2, 1, "#547080");
				for (let yy = horizon - h + 6; yy < horizon - 2; yy += 6)
					for (let xx = x + 3; xx < x + w - 2; xx += 5)
						if (hash(xx | 0, yy | 0) > 0.68)
							px.rect(g, xx, yy, 1, 2, won ? "#f3c884" : "#5d7786");
			}
			for (let y = horizon; y < f.H; y += 3) {
				const c =
					y < horizon + 20 ? "#284857" : y < f.H * 0.73 ? "#1d3d4d" : "#132e3b";
				px.rect(g, 0, y, f.W, 3, c);
				for (let i = 0; i < 12; i++) {
					const x = hash(i, y | 0) * f.W;
					px.rect(
						g,
						x,
						y,
						4 + hash(y | 0, i) * 12,
						1,
						won ? "#547b72" : "#31566a",
					);
				}
			}
			this.drawCityBase(r, theme, won);
			if (theme === "waterfront" || theme === "workshop")
				this.drawHarbor(r, won);
			else if (theme === "relay") this.drawRelay(r, won);
			else this.drawCentral(r, won);
			// Tiny physical response team gives the precision workspace emotional scale.
			r.shape("BU:van", -38, 56, 3, {
				facing: -0.35,
				charView: false,
				shadow: true,
			});
			r.shape("BU:bomb", 10, 37, 3, {
				facing: 0.2,
				charView: false,
				shadow: true,
			});
			r.shape("BU:worklamp", -8, 65, 3, {
				facing: -0.8,
				light: true,
				charView: false,
			});
			for (const [x, y] of [
				[-59, 35],
				[-15, 78],
				[55, 72],
			])
				r.shape("BU:cone", x, y, 3, { charView: false });
			for (const [who, x, y] of [
				["partner", 27, 56],
				["crew", 65, 49],
			])
				r.actor(x, y, 3, (q, ox, oy) => this.rigs[who].draw(q, ox, oy, r.view));
			r.game.lights.add(-40, 55, 35, 95, 0.65, {
				color: won ? "#a1f2bf" : "#72d7e6",
			});
			r.game.lights.add(5, 30, 20, 100, 0.7, { color: "#e9b579" });
			// Roof beacons alternate without screen flashes, including reduced motion.
			for (const [dx, col] of [
				[-5, "#83e9e0"],
				[5, "#ee947f"],
			]) {
				const p = r.w(-38 + dx, 56, 31);
				if (v.reducedMotion || Math.sin(this.t * 5 + dx) > 0)
					r.overlay((q) => r.glowDisc(q, p[0], p[1], 13, col, 0.3));
			}
			if (won) this.drawRelease(r, v, f);
			if (lost) this.drawConsequence(r, v, f, theme);
			r.overlay((q) => {
				const p = r.w(0, 90, 0);
				label(
					r,
					q,
					theme === "waterfront"
						? "GULL QUAY"
						: theme === "relay"
							? "NORTH RELAY"
							: theme === "central"
								? "CENTRAL EXCHANGE"
								: "UNION FIELD WORKSHOP",
					p[0],
					p[1] + 8,
					"#94aca7",
					1,
				);
				// Thin frame lines keep the diorama readable under translucent shell pages.
				px.rect(q, 0, f.H - 1, f.W, 1, "#1d3d44");
			});
		}
		drawCityBase(r, _theme, won) {
			r.queue(
				0,
				0,
				0,
				(g) => {
					r.box(g, -109, -63, -12, 111, 94, -3, "#344f55", "#192e39");
					r.box(g, -109, -63, -3, 111, 94, 0, "#5c7372", "#344f54");
					// Pavement detail follows world coordinates and native orthographic projection.
					for (let y = -60; y < 92; y += 12)
						for (let x = -106; x < 109; x += 16) {
							worldPoly(
								r,
								g,
								[
									[x, y, 0.1],
									[x + 15, y, 0.1],
									[x + 15, y + 11, 0.1],
									[x, y + 11, 0.1],
								],
								hash(x, y) > 0.6 ? "#566e6e" : "#52696a",
							);
							worldLine(r, g, [x, y, 0.2], [x + 14, y, 0.2], "#6c8180", 1);
						}
					worldPoly(
						r,
						g,
						[
							[-109, 20, 0.3],
							[111, 20, 0.3],
							[111, 75, 0.3],
							[-109, 75, 0.3],
						],
						"#293f47",
					);
					worldLine(r, g, [-109, 23, 0.4], [111, 23, 0.4], "#8e9b8b", 1);
					worldLine(r, g, [-109, 72, 0.4], [111, 72, 0.4], "#7e9287", 1);
					for (let x = -100; x < 100; x += 22)
						worldLine(r, g, [x, 47, 0.4], [x + 10, 47, 0.4], "#9aaf9a", 1);
					for (const x of [-104, 105])
						for (let y = -60; y < 95; y += 11)
							r.box(g, x - 2, y, -2, x + 2, y + 9, 2, "#9faaa0", "#607779");
					// Service cable from opened housing to the response van.
					const pts = [
						[-34, 61, 2],
						[-12, 60, 2],
						[-3, 55, 2],
						[-3, 42, 2],
						[0, 37, 2],
					];
					for (let i = 1; i < pts.length; i++)
						worldLine(r, g, pts[i - 1], pts[i], "#152a2d", 3);
				},
				{ bias: -10000 },
			);
			r.shape("lamppost", 98, 74, 1, {
				scale: 0.75,
				light: true,
				charView: false,
				mats: { m: "BU:case", g: won ? "BU:warm" : "BU:window" },
			});
			r.shape("lamppost", -97, 5, 1, {
				scale: 0.75,
				light: true,
				charView: false,
				mats: { m: "BU:case", g: "BU:warm" },
			});
			r.shape("bench", 92, 6, 1, { scale: 0.75, charView: false });
			r.shape("bush", -100, -22, 1, { scale: 0.8, charView: false });
		}
		drawHarbor(r, won) {
			r.queue(
				0,
				-45,
				0,
				(g) => {
					r.box(g, -112, -68, -7, 109, -44, 0, "#466467", "#243b48");
					for (let x = -108; x < 110; x += 12)
						r.box(g, x, -72, -17, x + 5, -44, 1, "#9f9378", "#5b615e");
					for (let x = -90; x < 100; x += 35) {
						const p = r.w(x, -78, -7);
						px.ell(g, p[0], p[1], 18, 3, "#467282");
					}
				},
				{ bias: -9000 },
			);
			r.shape("BU:lighthouse", -74, -27, 1, { charView: false, light: won });
			r.shape("BU:ferry", 60, -100, -5, {
				facing: 0.1,
				charView: false,
				scale: 0.68,
			});
			for (const x of [-38, 0, 38, 90])
				r.shape("BU:bollard", x, -50, 1, { charView: false });
			this.drawBuilding(r, 30, -26, 53, 31, 28, "#839b96", won, 5);
			r.queue(30, -26, 32, (g) => {
				const p = r.w(30, -10, 29);
				label(r, g, "FERRY", p[0], p[1] - 5, "#f1d5a0");
			});
			r.shape("crate", -14, -23, 1, { charView: false, scale: 0.65 });
			r.shape("barrel", -36, -25, 1, { charView: false, scale: 0.6 });
			if (won)
				r.queue(
					-74,
					-27,
					47,
					(g) => {
						const p = r.w(-74, -27, 47),
							q = r.w(110, -140, 47);
						px.polyDither(
							g,
							[
								[p[0], p[1]],
								[q[0], q[1] - 15],
								[q[0], q[1] + 15],
							],
							"#f4e3ae",
							0.24,
						);
					},
					{ bias: 500 },
				);
		}
		drawRelay(r, won) {
			this.drawBuilding(r, -62, -29, 39, 40, 25, "#698e8c", won, 12);
			for (const [x, y] of [
				[2, -23],
				[47, -23],
				[84, -23],
			])
				r.shape("BU:transformer", x, y, 1, { charView: false, scale: 0.88 });
			for (const x of [-28, 29, 87]) this.drawPylon(r, x, -54, 62);
			r.queue(
				0,
				-15,
				35,
				(g) => {
					for (const x of [-28, 29]) {
						const points = [];
						for (let k = 0; k <= 18; k++)
							points.push([
								x + (k * 57) / 18,
								-54,
								58 - Math.sin((k / 18) * Math.PI) * 9,
							]);
						for (let k = 1; k < points.length; k++)
							worldLine(
								r,
								g,
								points[k - 1],
								points[k],
								won ? "#c3d6c2" : "#73899b",
								1,
							);
					}
					for (let x = -16; x < 103; x += 10) {
						worldLine(r, g, [x, -7, 2], [x, -7, 16], "#91a8a0", 1);
						worldLine(r, g, [x, -7, 16], [x + 10, -7, 2], "#557b7e", 1);
					}
					worldLine(r, g, [-17, -7, 16], [103, -7, 16], "#a2b5a5", 1);
				},
				{ bias: 10 },
			);
			r.queue(0, -20, 40, (g) => {
				const p = r.w(-62, -8, 24);
				label(r, g, "NORTH", p[0], p[1] - 5, "#e4cc8d");
			});
			for (const [x, y] of [
				[60, 13],
				[82, 13],
			])
				r.shape("crate", x, y, 1, {
					charView: false,
					scale: 0.5,
					mats: { c: "BU:case" },
				});
		}
		drawCentral(r, won) {
			r.shape("BU:exchange", 16, -32, 1, { charView: false, light: true });
			this.drawBuilding(r, -70, -33, 36, 33, 37, "#8f968f", won, 37);
			this.drawBuilding(r, 76, -35, 38, 36, 26, "#6c8f92", won, 13);
			r.queue(14, -32, 8, (g) => {
				r.box(g, -10, -4, 0.3, 42, 11, 2, "#7e9690", "#435f66");
				for (let i = 0; i < 4; i++)
					r.box(
						g,
						-10 + i * 3,
						-4 - i * 3,
						0.3 + i * 0.4,
						42 - i * 3,
						-1 - i * 3,
						2 + i * 0.4,
						"#a1ada0",
						"#587176",
					);
				const p = r.w(16, -18, 42);
				label(r, g, "EXCHANGE", p[0], p[1] + 2, "#e7c38f");
			});
			for (const x of [-93, 95])
				r.shape("tree", x, -40, 1, {
					params: { h: 31, seed: x + 101 },
					charView: false,
					scale: 0.8,
				});
			r.queue(-37, 7, 8, (g) => {
				r.box(g, -47, -3, 0, -29, 13, 3, "#9daca0", "#45656b");
				worldPoly(
					r,
					g,
					[
						[-44, 0, 3],
						[-32, 0, 3],
						[-32, 10, 3],
						[-44, 10, 3],
					],
					won ? "#75b6b7" : "#375f74",
				);
				if (won) {
					const p = r.w(-38, 5, 12);
					px.line(g, p[0], p[1] + 7, p[0], p[1] - 4, "#a9dfd0", 2);
					px.disc(g, p[0], p[1] - 4, 2, "#d0ecda");
				}
			});
		}
		drawBuilding(r, x, y, w, d, h, color, won, seed) {
			r.queue(x, y, 0, (g) => {
				const T = E.tones(color);
				r.box(
					g,
					x - w / 2,
					y - d / 2,
					0,
					x + w / 2,
					y + d / 2,
					h,
					T.lt,
					T.base,
				);
				r.box(
					g,
					x - w / 2 - 1,
					y - d / 2 - 1,
					h,
					x + w / 2 + 1,
					y + d / 2 + 1,
					h + 2,
					T.sh,
					T.deep,
				);
				for (let z = 6; z < h - 4; z += 10)
					for (let dx = -w / 2 + 6; dx < w / 2 - 3; dx += 9) {
						const live = won || hash((dx * 7) | 0, z + seed) > 0.63;
						const a = r.w(x + dx, y + d / 2 + 0.15, z),
							b = r.w(x + dx + 4, y + d / 2 + 0.15, z + 5);
						px.rect(
							g,
							a[0],
							b[1],
							Math.max(2, b[0] - a[0]),
							Math.max(2, a[1] - b[1]),
							live ? "#e4bf7a" : "#304d59",
						);
					}
				const p = r.w(x, y + d / 2 + 0.5, 2),
					q = r.w(x + 5, y + d / 2 + 0.5, 13);
				px.rect(g, p[0] - 3, q[1], 8, p[1] - q[1], "#263f48");
				worldLine(
					r,
					g,
					[x - w / 2, y + d / 2, h + 2],
					[x + w / 2, y + d / 2, h + 2],
					T.hi,
					1,
				);
			});
		}
		drawPylon(r, x, y, h) {
			r.queue(x, y, 0, (g) => {
				for (const s of [-1, 1])
					worldLine(r, g, [x + s * 8, y, 0], [x + s * 2, y, h], "#91a8ad", 2);
				for (let z = 8; z < h; z += 11) {
					const w = 8 - (z / h) * 6;
					worldLine(r, g, [x - w, y, z], [x + w - 1, y, z + 9], "#6d8b98", 1);
					worldLine(r, g, [x + w, y, z], [x - w + 1, y, z + 9], "#718d99", 1);
				}
				worldLine(r, g, [x - 13, y, h - 8], [x + 13, y, h - 8], "#a6bbba", 2);
				worldLine(r, g, [x - 8, y, h], [x + 8, y, h], "#a6bbba", 2);
				for (const dx of [-11, 11]) {
					worldLine(
						r,
						g,
						[x + dx, y, h - 8],
						[x + dx, y, h - 14],
						"#d6d8c7",
						2,
					);
				}
			});
		}
		drawRelease(r, v, _f) {
			r.overlay((g) => {
				if (v.reducedMotion) return;
				const phase = this.t % 3.4;
				for (let i = 0; i < 32; i++) {
					const t = (phase + i * 0.023) % 3.4,
						a = i * 2.399,
						r0 = 20 + t * 27,
						p = r.w(6, 33, 18);
					const x = p[0] + Math.cos(a) * r0,
						y = p[1] - t * 33 + Math.sin(a) * r0 * 0.45;
					px.rect(
						g,
						x,
						y,
						2,
						2,
						i % 3 === 0 ? "#ffd58c" : i % 3 === 1 ? "#b3e7c2" : "#a6dcdf",
					);
				}
			});
		}
		drawConsequence(r, _v, _f, theme) {
			r.queue(
				8,
				35,
				28,
				(g) => {
					const p = r.w(8, 35, 14),
						t = this.t % 4,
						rr = 15 + t * 28;
					for (let i = 0; i < 22; i++) {
						const a = (i * TAU) / 22;
						px.ddisc(
							g,
							p[0] + Math.cos(a) * rr,
							p[1] + Math.sin(a) * rr * 0.3,
							5 + t * 2,
							theme === "waterfront" ? "#81bccc" : "#d7ad88",
							0.22 * (1 - t / 4),
						);
					}
					for (let i = 0; i < 10; i++) {
						const u = (this.t * 0.15 + i * 0.14) % 1;
						px.ddisc(
							g,
							p[0] + Math.sin(i * 3 + u) * 21,
							p[1] - u * 55,
							8 + u * 9,
							"#48505b",
							0.34,
						);
					}
				},
				{ bias: 1000 },
			);
		}
		portrait(r, who, x, y, size = 40) {
			const rig = this.rigs[who] || this.rigs.partner;
			r.overlay((g) =>
				rig.drawPortrait(g, x, y, size, {
					zoom: 2.7,
					turn: 0.5,
					bg: "#18343e",
					frame: false,
				}),
			);
		}
		dispose() {
			for (const t of this.nativeTweens) t.cancel?.();
			this.nativeTweens = [];
			this.effects = [];
		}
	}
	B.Art = Art;
})(globalThis);
