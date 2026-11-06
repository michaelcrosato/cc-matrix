import { FLOORS } from "./content.js";

const CELL = 32,
	EYE = 25,
	TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mid = (n) => n * CELL + CELL / 2;
const angleDiff = (a, b) => ((b - a + Math.PI * 3) % TAU) - Math.PI;
const yaw = (d) => -Math.PI / 2 + (d * Math.PI) / 2;
const COLORS = {
	war: "#9bd89a",
	spirit: "#7dbfff",
	gold: "#eac77b",
	stone: "#526478",
	dark: "#182230",
};
let registered = false;

function registerArt(E) {
	if (registered) return;
	registered = true;
	// Registered native shape data: the same geometry is available to native asset tools.
	E.SHAPES.tarminUrn = {
		about: "Sealed funerary urn with a brass eye",
		tags: "dungeon urn stone eye",
		mats: { s: { color: "#546677", pattern: "stones", size: 3 }, g: "gold" },
		parts: [
			[
				"lathe",
				"s",
				[0, 0, 0],
				[
					[0, 0],
					[3.5, 0],
					[5.5, 4],
					[5, 9],
					[2.6, 12],
					[3.5, 14],
					[0, 14],
				],
				{ seg: 8 },
			],
			["cyl", "g", [0, 0, 12], 3.6, 0.8],
			["box", "g", [0, 4.7, 6], [2, 0.6, 2]],
		],
	};
	E.SHAPES.tarminPedestal = {
		about: "Tiered vault dais with gold seams",
		tags: "dungeon pedestal treasure",
		mats: { s: "slate", g: "gold" },
		parts: [
			["box", "s", [0, 0, 0], [22, 18, 2]],
			["box", "s", [0, 0, 2], [18, 14, 3]],
			["box", "g", [0, 0, 5], [18.4, 14.4, 0.6]],
			["box", "s", [0, 0, 5.6], [16, 12, 2]],
		],
	};
	const T = E.World3D.THINGS;
	T.tarminArch = (p, t) => {
		const c = t.color || "#526174";
		p.box(-14.8, 0, 21, 3, 4, 42, c)
			.box(14.8, 0, 21, 3, 4, 42, c)
			.box(-11.8, 0, 41, 4.8, 4.4, 5, c)
			.box(11.8, 0, 41, 4.8, 4.4, 5, c)
			.box(-7.5, 0, 44, 5.2, 4.4, 4, c)
			.box(7.5, 0, 44, 5.2, 4.4, 4, c)
			.box(0, 0, 45.5, 10, 4.4, 4, c);
		for (const s of [-1, 1])
			p.box(s * 14.8, -0.2, 4, 4, 5, 3, "#758391").box(
				s * 14.8,
				-0.2,
				36.5,
				3.6,
				5,
				2,
				"#7d8991",
			);
	};
	T.tarminLantern = (p, t, time) => {
		const c = t.color || "#ffc27b",
			k = 1 + Math.sin(time * 6 + t.x) * 0.09;
		p.box(0, 0, 2, 5, 5, 2, "#18232b")
			.box(0, 0, 8, 4, 4, 10, "#553f2d")
			.glow(0, 0, 8, 2.5 * k, c)
			.box(0, 0, 14, 5, 5, 1.4, "#9e7745");
		for (const s of [-1, 1])
			p.tube(s * 2, s * 2, 3, s * 2, s * 2, 14, 0.3, "#202833").tube(
				s * 2,
				-s * 2,
				3,
				s * 2,
				-s * 2,
				14,
				0.3,
				"#202833",
			);
		p.tube(-1.8, 0, 15, 0, 0, 17, 0.35, "#8f7648").tube(
			0,
			0,
			17,
			1.8,
			0,
			15,
			0.35,
			"#8f7648",
		);
	};
	T.tarminEye = (p, t, time) => {
		const c = t.color || COLORS.spirit;
		p.box(0, 0, 0, 20, 0.7, 12, "#334251");
		for (let i = 0; i < 12; i++) {
			const a = (i / 12) * Math.PI,
				b = ((i + 1) / 12) * Math.PI;
			for (const s of [-1, 1])
				p.tube(
					Math.cos(a) * 8,
					-0.7,
					Math.sin(a) * 4 * s,
					Math.cos(b) * 8,
					-0.7,
					Math.sin(b) * 4 * s,
					0.45,
					"#b0b3a2",
				);
		}
		p.ball(0, -1, 0, 2.7, 0.6, 3, c)
			.box(0, -1.7, 0, 0.7, 0.3, 4.8, "#0b1720")
			.glow(-0.7, -1.8, 1, 0.4, "#e5f1cf");
		for (const s of [-1, 1]) p.tube(s * 10, -0.6, -3, s * 12, -0.6, -5, 0.3, c);
	};
	T.tarminGate = (p, t, time) => {
		T.tarminArch(p, { color: "#57647a" });
		const c = t.color || COLORS.spirit;
		for (const s of [-1, 1]) {
			p.box(s * 12.8, -1, 20, 1, 1.4, 27, c).glow(s * 12.8, -1.6, 28, 1.2, c);
			for (let n = 0; n < 4; n++)
				p.box(s * 13, -1.8, 11 + n * 7, 2.7, 0.8, 0.7, c);
		}
		for (let n = 0; n < 8; n++) {
			const u = (time * 0.25 + n / 8) % 1;
			p.glow(
				Math.sin(n * 1.7 + time) * 9,
				-0.2,
				3 + u * 37,
				0.35 + Math.sin(u * Math.PI) * 0.5,
				c,
			);
		}
		if (!t.on) p.box(0, 0, 20, 23, 0.2, 35, "#142139");
	};
	T.tarminLadder = (p) => {
		T.tarminArch(p, { color: "#62717e" });
		p.box(0, 0, 0.1, 22, 19, 0.2, "#060b12");
		for (const s of [-1, 1])
			p.tube(s * 8, -7, 1, s * 8, 6, -14, 0.65, "#c49a60");
		for (let i = 0; i < 6; i++)
			p.tube(
				-8,
				-7 + i * 2.5,
				1 - i * 2.5,
				8,
				-7 + i * 2.5,
				1 - i * 2.5,
				0.65,
				"#b58b53",
			);
		p.box(0, 1, -13, 23, 20, 1, "#121b25");
	};
	T.tarminCamp = (p, t, time) => {
		p.box(0, 0, 1.2, 20, 17, 2.4, "#33464e").box(
			0,
			0,
			2.6,
			17,
			14,
			0.8,
			"#a28b65",
		);
		for (let i = 0; i < 6; i++) {
			let a = (i / 6) * TAU;
			p.ball(Math.cos(a) * 5, Math.sin(a) * 5, 3, 2, 1.8, 1.5, "#64737a");
		}
		for (let i = 0; i < 3; i++) {
			let a = (i / 3) * TAU;
			p.tube(
				Math.cos(a) * 3,
				Math.sin(a) * 3,
				3,
				-Math.cos(a) * 3,
				-Math.sin(a) * 3,
				3.5,
				1,
				"#63442c",
			);
		}
		p.glow(0, 0, 5 + Math.sin(time * 8) * 0.4, 2, "#ffbf70");
	};
	T.tarminTreasure = (p, t, time) => {
		p.box(0, 0, 4, 15, 11, 8, "#735535").box(0, 0, 8.6, 16, 12, 2, "#c9a257");
		for (const s of [-1, 1]) p.box(s * 5, 0, 5, 1.2, 12, 10, "#dec27c");
		p.box(0, -6, 5.8, 3, 1, 3.5, "#e2c77d").ball(
			0,
			-6.8,
			6,
			0.7,
			0.5,
			0.7,
			"#70c9df",
		);
		if (t.on) {
			p.box(0, 4, 13.6, 16, 2, 8, "#c5a05b");
			for (let i = 0; i < 9; i++)
				p.ball(
					Math.sin(i * 4) * 5,
					Math.cos(i * 2) * 3,
					9.3 + (i % 3) * 0.5,
					1.2,
					1,
					0.4,
					"#f2d98c",
				);
			p.glow(0, 0, 11, 3 + Math.sin(time * 3) * 0.3, "#ffe4a3");
			for (let i = 0; i < 5; i++)
				p.glow(
					Math.sin(time + i) * 7,
					Math.cos(time * 1.3 + i) * 4,
					14 + ((time * 6 + i * 3) % 18),
					0.25,
					"#ffe8b3",
				);
		}
	};
	T.tarminItem = (p, t, time) => {
		const kind = t.data?.item || "potion";
		p.box(0, 0, 0.3, 9, 9, 0.6, "#354450");
		if (kind === "food") {
			p.ball(0, 0, 3, 3, 2.6, 3, "#b99766")
				.tube(-2, 0, 5, 2, 0, 5, 0.4, "#e4cca1")
				.box(0, -2.6, 3, 2, 0.2, 2, "#54694c");
		} else if (kind === "arrows") {
			for (let i = 0; i < 3; i++)
				p.tube(i - 1, -3, 1, i - 1, 3, 5, 0.18, "#cba876").cone(
					i - 1,
					3,
					5,
					i - 1,
					4,
					6,
					0.6,
					"#c5d6d5",
				);
		} else if (
			kind === "rune" ||
			kind === "sightBook" ||
			kind.includes("Book")
		) {
			const c = kind === "warBook" ? "#689566" : "#5584ba";
			p.box(0, 0, 2.2, 7, 6, 3, "#ddcfaa")
				.box(0, 0, 4, 8, 6.6, 0.7, c)
				.box(-3.5, 0, 2, 1, 7, 4, c);
			p.tube(-1, 0, 4.5, 1, 1.5, 4.5, 0.23, "#f1d491").tube(
				1,
				1.5,
				4.5,
				1,
				-1.5,
				4.5,
				0.23,
				"#f1d491",
			);
			if (kind === "rune") p.glow(0, 0, 6.6, 1.4, "#7bc9ff");
		} else if (kind === "shield") {
			p.ball(0, 0, 2, 4.3, 4.3, 1.1, "#769687").ball(
				0,
				0,
				3,
				1,
				1,
				0.5,
				"#d9c893",
			);
		} else if (kind === "ring") {
			for (let i = 0; i < 12; i++) {
				let a = (i / 12) * TAU,
					b = ((i + 1) / 12) * TAU;
				p.tube(
					Math.cos(a) * 2,
					Math.sin(a) * 2,
					2,
					Math.cos(b) * 2,
					Math.sin(b) * 2,
					2,
					0.45,
					"#ddc880",
				);
			}
			p.glow(0, -2, 2.6, 0.8, "#7eb8ff");
		} else if (kind === "armor") {
			p.box(0, 0, 2.5, 7, 5, 4, "#8ba3ac").box(0, -3, 3, 3, 1, 4, "#e0cc92");
		} else if (kind === "potion") {
			p.ball(0, 0, 3, 2.3, 2.3, 3, "#599e95")
				.tube(0, 0, 5, 0, 0, 7, 1, "#a7cfb3")
				.box(0, 0, 7, 2.4, 2.4, 0.8, "#bc9969");
		} else if (kind === "key") {
			p.tube(-3, -1, 1, 3, -1, 1, 0.45, "#f4ce77")
				.tube(-2, -1, 1, -2, 1, 1, 0.6, "#f4ce77")
				.ball(3, -1, 1, 1.6, 1.6, 0.5, "#dfba63");
		} else if (kind === "scroll") {
			p.box(0, 0, 2, 5, 6, 1, "#e6d6ad")
				.tube(-3, -3, 2, 3, -3, 2, 0.8, "#f0dfb8")
				.tube(-3, 3, 2, 3, 3, 2, 0.8, "#f0dfb8")
				.box(0, 0, 2.7, 2, 2, 0.4, "#7199d0");
		} else {
			p.tube(0, -4, 1, 0, 3, 2, 0.5, "#8d6441")
				.bar(0, 0, 2, 0, 6, 2, 1.3, 0.3, "#c7d4d0")
				.box(0, 0, 2, 4, 0.6, 0.4, "#d4b878");
		}
		if (!["food", "arrows"].includes(kind)) p.glow(0, 0, 7, 0.6, "#dfca91");
	};
}

export class DungeonView {
	static async create(options) {
		const v = new DungeonView(options);
		registerArt(v.E);
		await v.E.World3D.init(
			v.game,
			options.backend ? { backend: options.backend } : {},
		);
		v.update(0);
		return v;
	}
	constructor({
		game,
		getState,
		playerId,
		getSettings = () => ({}),
		onEvent = () => {},
	}) {
		this.game = game;
		this.E = globalThis.My3D2dge;
		this.getState = getState;
		this.playerId = playerId;
		this.getSettings = getSettings;
		this.onEvent = onEvent;
		this.world = null;
		this.floor = -1;
		this.signature = "";
		this.time = 0;
		this.actors = new Map();
		this.things = new Map();
		this.seenEvents = new Set();
		this.effects = [];
		this.look = [0, 0];
		this.targetPos = null;
		this.cameraPos = null;
		this.handT = 0;
		this.hurtT = 0;
		this.castT = 0;
		this.guardT = 0;
		this.swapT = 0;
		this.lastPlayer = null;
		this.lastRun = null;
		this.ready = true;
	}
	setPlayer(id) {
		this.playerId = id;
	}
	setLook(dx, dy) {
		this.look[0] = clamp(this.look[0] + dx, -0.66, 0.66);
		this.look[1] = clamp(this.look[1] + dy, -0.65, 0.5);
	}
	player(state) {
		const players = state?.players || {};
		return players[this.playerId] || Object.values(players)[0] || null;
	}
	preview() {
		const f = FLOORS[0];
		return {
			floor: 0,
			players: {
				preview: {
					id: "preview",
					x: f.start.x,
					y: f.start.y,
					dir: f.start.dir || 0,
					right: { kind: "bow" },
					left: { kind: "blade" },
					war: 36,
					spirit: 24,
				},
			},
			enemies: f.enemies.map((e) => ({
				...e,
				alive: true,
				war: 12,
				spirit: 12,
			})),
			loot: f.loot,
			doors: f.doors,
			features: f.features,
			events: [],
		};
	}
	rebuild(state) {
		if (this.world) this.world.dispose();
		this.actors.clear();
		this.things.clear();
		this.effects.length = 0;
		const E = this.E,
			W3 = E.World3D,
			f = FLOORS[state.floor] || FLOORS[0];
		const runtimeRows = state.floors?.[state.floor]?.rows || f.rows;
		const secrets = (state.features || f.features || []).filter(
			(v) => v.kind === "secret" && !v.open,
		);
		const rows = [];
		for (let y = 0; y < runtimeRows.length; y++)
			for (let sy = 0; sy < 2; sy++) {
				let row = "";
				for (let x = 0; x < runtimeRows[y].length; x++) {
					const c = runtimeRows[y][x];
					const secret = secrets.some((v) => v.x === x && v.y === y);
					const blocked =
						(c === "#" &&
							!(state.features || []).some(
								(v) => v.kind === "secret" && v.x === x && v.y === y && v.open,
							)) ||
						secret;
					row += blocked
						? "##"
						: state.floor === 1 && x >= 7 && y >= 5
							? "uu"
							: "..";
				}
				rows.push(row);
			}
		this.floor = state.floor;
		this.content = { ...f, rows: runtimeRows };
		const blue = state.floor === 1;
		this.world = new W3(this.game, {
			level: {
				rows,
				legend: {
					"#": { wall: 56 },
					u: {
						ground: "water",
						colors: { base: "#264a64", dark: "#193748", light: "#56839d" },
					},
				},
				ground: blue ? "tiles" : "flagstone",
				colors: {
					base: blue ? "#40566b" : "#59626b",
					dark: blue ? "#273d52" : "#333e49",
					light: blue ? "#6b8492" : "#727d83",
				},
				side: "brick",
				wallSide: "brick",
				color: blue ? "#4d6579" : "#586775",
				line: "#1b2838",
				top: "#83909c",
			},
			look: "puppet",
			res: "balanced",
			gravity: 0,
			sky: "#03080f",
			ambient: [blue ? "#a3c5ee" : "#a5b9cb", "#283441", 2.7],
			sun: {
				intensity: 0.18,
				color: "#b3c6de",
				dir: [0.4, 0.2, -1],
				shadow: false,
			},
			fog: { color: blue ? "#071628" : "#060c14", near: 80, far: 300 },
			torchLights: 0,
			torchShadows: 0,
			lights: 5,
			spots: 1,
			glowLights: 3,
			shadows: true,
			outlines: true,
			camera: { mode: "fixed", fov: 74, near: 0.6, far: 420, capture: false },
			overlay: { fov: 62 },
			onDraw: (w) => this.drawDetails(w),
		});
		this.world.filter.look = "clean";
		this.lantern = this.world.light({
			color: "#ffd49a",
			reach: 155,
			power: 14,
			flicker: 0.025,
		});
		this.flashTarget = {
			x: mid(f.start.x),
			y: mid(f.start.y),
			z: 0,
			facing: yaw(f.start.dir || 0),
			visible: true,
		};
		this.beam = this.world.flashlight(this.flashTarget, {
			color: "#ffdcab",
			reach: 190,
			power: 14,
			angle: 0.95,
			soft: 0.7,
			height: 25,
			pitch: -0.035,
			flicker: 0.015,
			shadow: true,
		});
		this.roomLights = [];
		this.wallDecor = [];
		this.lampSpots = [];
		for (let y = 0; y < runtimeRows.length; y++)
			for (let x = 0; x < runtimeRows[y].length; x++) {
				if (runtimeRows[y][x] === "#") continue;
				const sides = [0, 1, 2, 3].filter((d) => {
					const dx = [0, 1, 0, -1][d],
						dy = [-1, 0, 1, 0][d];
					return (runtimeRows[y + dy] || "")[x + dx] === "#";
				});
				if (
					sides.length &&
					((x * 3 + y * 5) % 7 === 0 || (x === f.start.x && y === f.start.y))
				) {
					const d = sides[(x + y) % sides.length],
						dx = [0, 1, 0, -1][d],
						dy = [-1, 0, 1, 0][d];
					const X = mid(x) + dx * 14,
						Y = mid(y) + dy * 14;
					const t = this.world.thing("tarminLantern", X, Y, 18, {
						size: 0.68,
						color: blue ? "#8dbdff" : "#ffd096",
						shadow: false,
					});
					this.wallDecor.push({ x: X, y: Y, z: 24, dir: d, type: "lamp" });
					this.lampSpots.push({ x: X, y: Y, z: 25 });
					if (this.roomLights.length < 4) {
						const l = this.world.light({
							color: blue ? "#75a9ed" : "#ffbe75",
							reach: 96,
							power: blue ? 9 : 12,
							flicker: 0.04,
						});
						Object.assign(l, { x: X, y: Y, z: 25 });
						this.roomLights.push(l);
					}
				}
				if (sides.length && (x * 7 + y * 3) % 9 === 0) {
					const d = sides[0],
						dx = [0, 1, 0, -1][d],
						dy = [-1, 0, 1, 0][d];
					this.world.shape("tarminUrn", mid(x) + dx * 10, mid(y) + dy * 10, 0, {
						scale: 0.7,
						solid: false,
					});
				}
				// Thin buttresses break up repeating masonry without obscuring grid cells.
				if (sides.length && (x + y) % 3 === 0)
					for (const d of sides) {
						const dx = [0, 1, 0, -1][d],
							dy = [-1, 0, 1, 0][d];
						this.wallDecor.push({
							x: mid(x) + dx * 15,
							y: mid(y) + dy * 15,
							dir: d,
							type: "rib",
						});
					}
			}
		const ladder = f.ladder;
		if (ladder)
			this.world.thing("tarminLadder", mid(ladder.x), mid(ladder.y), 0, {
				yaw: 0,
				shadow: false,
			});
		this.cameraPos = null;
		this.targetPos = null;
		this.lastPlayer = null;
		this.signature = this.geometrySignature(state);
		this.syncEntities(state, 0);
	}
	geometrySignature(state) {
		return (
			state.floor +
			":" +
			(state.features || [])
				.filter((f) => f.kind === "secret")
				.map((f) => f.id + ":" + (f.open ? 1 : 0))
				.join(",") +
			":" +
			(
				state.floors?.[state.floor]?.rows ||
				FLOORS[state.floor]?.rows ||
				[]
			).join("")
		);
	}
	syncEntities(state, dt) {
		const w = this.world,
			E = this.E,
			local = this.player(state);
		const validActors = new Set((state.enemies || []).map((e) => e.id));
		for (const ally of Object.values(state.players || {}))
			if (ally.id !== local?.id && ally.connected !== false)
				validActors.add("ally-" + ally.id);
		for (const [id, actor] of this.actors)
			if (!validActors.has(id)) {
				w.remove(actor);
				this.actors.delete(id);
			}
		for (const e of state.enemies || []) {
			let a = this.actors.get(e.id);
			if (!a) {
				a = this.spawnEnemy(e);
				this.actors.set(e.id, a);
			}
			a.data.model = e;
			const alive = e.alive !== false && e.war !== 0 && e.spirit !== 0;
			if (alive && a.data.dead) {
				a.data.dead = false;
				a.data.deadT = 0;
				a.sink = 0;
				a.fade = 1;
				a.visible = true;
			}
			if (!alive && !a.data.dead) {
				a.data.dead = true;
				a.data.deadT = 0;
				a.data.combo?.cancel();
			}
			if (a.data.dead) {
				a.data.deadT += dt;
				a.anim = { pose: "die" };
				a.fade = Math.max(0, 1 - Math.max(0, a.data.deadT - 0.45));
				a.sink = Math.max(0, a.data.deadT - 0.5) * 8;
				a.visible = a.data.deadT < 1.6;
			} else {
				a.visible = true;
				a.fade = 1;
				a.sink = 0;
				const tx = mid(e.x),
					ty = mid(e.y);
				a.data.x += (tx - a.data.x) * Math.min(1, dt * 12);
				a.data.y += (ty - a.data.y) * Math.min(1, dt * 12);
				const target = state.players?.[e.intent?.target] || local;
				const face = target
					? Math.atan2(mid(target.y) - a.data.y, mid(target.x) - a.data.x)
					: Math.PI / 2;
				a.facing += angleDiff(a.facing, face) * Math.min(1, dt * 9);
				const combo = a.data.combo;
				combo?.update(dt * (state.tuning?.tempo || 1));
				const active =
					state.encounter &&
					(state.encounter.enemyIds?.includes(e.id) ||
						state.encounter.enemies?.includes(e.id) ||
						state.encounter.enemyId === e.id ||
						Math.abs(e.x - local?.x) + Math.abs(e.y - local?.y) < 4);
				a.anim = {
					attack: combo?.state,
					pose: combo?.busy
						? null
						: active
							? e.intent?.channel === "spirit"
								? "cast"
								: "guard"
							: null,
					hurt: a.flash > 0,
					expr: active ? "angry" : null,
				};
				if (e.kind === "scorpion")
					a.anim = {
						squash: Math.sin(this.time * 2 + e.x) * 0.035,
						look: [Math.cos(face), Math.sin(face)],
					};
				a.place(
					a.data.x,
					a.data.y,
					e.kind === "wraith" ? 3 + Math.sin(this.time * 2.3 + e.x) * 1.2 : 0,
				);
			}
			a.vx = a.vy = a.vz = 0;
			a.flash = Math.max(0, (a.flash || 0) - dt);
		}
		for (const p of Object.values(state.players || {})) {
			if (p.id === local?.id || p.connected === false) continue;
			const key = "ally-" + p.id;
			let a = this.actors.get(key);
			if (!a) {
				a = w.hero({
					x: mid(p.x),
					y: mid(p.y),
					z: 0,
					r: 3,
					half: 7,
					rig: new E.Humanoid({
						build: "heroic",
						size: 0.9,
						armor: true,
						eyeGlow: "#d2e7b4",
						colors: {
							cloth: "#2d6c64",
							cape: "#356a66",
							skin: "#bc9c79",
							metal: "#b5c5b9",
							pants: "#263d43",
						},
						cape: { len: 5, width: 4 },
					}),
					look: "puppet",
				});
				a.setSolid(false);
				this.actors.set(key, a);
			}
			a.place(mid(p.x), mid(p.y), 0);
			a.facing = yaw(p.dir);
			a.anim = { pose: p.down ? "kneel" : p.guard ? "guard" : null };
			a.vx = a.vy = a.vz = 0;
		}
		const existing = new Set();
		for (const loot of state.loot || []) {
			if (loot.claimed) continue;
			const id = "loot-" + loot.id;
			existing.add(id);
			let t = this.things.get(id);
			if (!t) {
				t = w.thing("tarminItem", mid(loot.x), mid(loot.y), 0, {
					data: { item: loot.item || loot.kind },
					bob: 0.5,
					shadow: true,
				});
				this.things.set(id, t);
			}
			t.visible = true;
			t.data.item = loot.item || loot.kind;
		}
		for (const [id, t] of this.things)
			if (id.startsWith("loot-") && !existing.has(id)) t.visible = false;
		for (const door of state.doors || []) {
			const id = "door-" + door.id;
			let t = this.things.get(id);
			if (!t) {
				const f = this.content.rows;
				const ew =
					f[door.y]?.[door.x - 1] === "#" && f[door.y]?.[door.x + 1] === "#";
				t = w.thing("door", mid(door.x), mid(door.y), 0, {
					w: 30,
					h: 44,
					yaw: ew ? 0 : Math.PI / 2,
					swing: true,
					color: "#536458",
					locked: door.key || null,
					shadow: false,
				});
				this.things.set(id, t);
				w.thing("tarminArch", mid(door.x), mid(door.y), 0, {
					yaw: ew ? 0 : Math.PI / 2,
					color: "#6a7878",
					shadow: false,
				});
			}
			t.open += (Number(!!door.open) - t.open) * Math.min(1, dt * 5);
			t.locked = door.open ? null : door.key || null;
		}
		for (const f of state.features || []) {
			const id = "feature-" + f.id;
			let t = this.things.get(id);
			if (!t) {
				let kind =
					f.kind === "gate"
						? "tarminGate"
						: f.kind === "eye" || f.kind === "mural"
							? "tarminEye"
							: f.kind === "camp" || f.kind === "rest" || f.kind === "safe"
								? "tarminCamp"
								: f.kind === "treasure"
									? "tarminTreasure"
									: f.kind === "trap" || f.kind === "container"
										? "chest"
										: null;
				if (!kind) continue;
				const col =
					(f.channel || f.favor) === "war"
						? COLORS.war
						: (f.channel || f.favor) === "both"
							? COLORS.gold
							: COLORS.spirit;
				let X = mid(f.x),
					Y = mid(f.y),
					Z = 0,
					rot = 0;
				if (kind === "tarminEye") {
					const d =
						typeof f.dir === "number"
							? f.dir
							: ([0, 1, 2, 3].find((d) => {
									const dx = [0, 1, 0, -1][d],
										dy = [-1, 0, 1, 0][d];
									return (this.content.rows[f.y + dy] || "")[f.x + dx] === "#";
								}) ?? 0);
					X += [0, 1, 0, -1][d] * 15;
					Y += [-1, 0, 1, 0][d] * 15;
					Z = 28;
					rot = (d * Math.PI) / 2;
				}
				t = w.thing(kind, X, Y, Z, {
					yaw: rot,
					color: col,
					data: { feature: f },
					shadow: false,
					on: !!f.open,
				});
				this.things.set(id, t);
				if (kind === "tarminTreasure")
					w.shape("tarminPedestal", X, Y, 0, { solid: false });
			}
			t.on =
				f.kind === "treasure" ? !!state.bossDefeated : !!(f.open || f.used);
			t.open +=
				(Number(!!(f.open || f.disarmed)) - t.open) * Math.min(1, dt * 4);
			if (f.kind === "treasure") t.z = 7;
		}
	}
	spawnEnemy(e) {
		const E = this.E,
			w = this.world,
			base = {
				x: mid(e.x),
				y: mid(e.y),
				z: 0,
				r: 4,
				half: 8,
				look: "puppet",
				shadow: true,
				fly: true,
			};
		let a;
		if (e.kind === "scorpion") {
			a = w.mob({
				...base,
				r: 5,
				half: 0,
				blob: new E.Blob({
					R: 4.3,
					face: "front",
					colors: {
						base: "#67889f",
						dk: "#253e57",
						lt: "#a3c3db",
						eye: "#9cdfff",
						pupil: "#091e2f",
					},
				}),
			});
		} else {
			const specs = {
				skeleton: {
					build: "skeleton",
					size: 1.05,
					bladeLen: 11,
					eyeGlow: "#b6d795",
					colors: {
						bone: "#d9cfb0",
						cloth: "#253e3d",
						metal: "#adbdba",
						hilt: "#b9995e",
						pants: "#b7b6a6",
					},
				},
				sentinel: {
					build: "heroic",
					size: 1.1,
					armor: true,
					hat: { style: "helmet", color: "#779188" },
					bladeLen: 10,
					eyeGlow: "#9adaac",
					colors: {
						cloth: "#2c544f",
						pants: "#223732",
						metal: "#a9c1af",
						plate: "#637c73",
						hilt: "#baa77d",
						skin: "#364444",
					},
				},
				brute: {
					build: "bulky",
					size: 1.17,
					armor: true,
					bladeLen: 14,
					eyeGlow: "#f4b16f",
					hair: "bald",
					colors: {
						skin: "#a58d73",
						cloth: "#6a493a",
						pants: "#4c3430",
						metal: "#ae9671",
						plate: "#75624f",
						hilt: "#ba8f5a",
					},
				},
				wraith: {
					build: "heroic",
					size: 1.08,
					weapon: null,
					hood: true,
					outfit: "robe",
					sleeves: "long",
					cape: { len: 7, width: 6, seg: 2.8 },
					eyeGlow: "#a2dfff",
					colors: {
						skin: "#293f58",
						cloth: "#293e60",
						pants: "#172a45",
						hair: "#20354f",
						cape: "#2e4571",
						capeIn: "#132942",
						boot: "#17283d",
					},
				},
				minotaur: {
					build: "bulky",
					size: 1.42,
					armor: true,
					bladeLen: 17,
					hair: "bald",
					eyeGlow: "#ffca7a",
					colors: {
						skin: "#9e7454",
						cloth: "#513b38",
						pants: "#473d3d",
						metal: "#c8b388",
						plate: "#706c63",
						hilt: "#987a4b",
						boot: "#3d3430",
					},
				},
			};
			a = w.mob({
				...base,
				r: e.kind === "minotaur" ? 8 : 4.5,
				half: e.kind === "minotaur" ? 12 : 8,
				rig: new E.Humanoid({
					...(specs[e.kind] || specs.skeleton),
					speedRef: 50,
				}),
				trail: e.kind === "wraith" ? "#8dbaff" : "#dec995",
			});
		}
		a.setSolid(false);
		a.data = {
			model: e,
			x: mid(e.x),
			y: mid(e.y),
			dead: false,
			deadT: 0,
			combo: new E.Combo(
				e.kind === "brute"
					? ["overhead", "bash"]
					: e.kind === "minotaur"
						? ["twohand", "cast", "overhead"]
						: e.kind === "wraith"
							? ["cast", "claw"]
							: ["slash", "thrust"],
			),
		};
		return a;
	}
	processEvents(state) {
		for (const e of state.events || []) {
			if (this.seenEvents.has(e.id)) continue;
			this.seenEvents.add(e.id);
			if (this.seenEvents.size > 500)
				this.seenEvents.delete(this.seenEvents.values().next().value);
			const type = e.type || "";
			if (type === "attack" || type === "damage" || type === "enemyAttack") {
				const a = this.actors.get(e.attacker);
				if (a) a.data.combo?.press();
				const target = this.actors.get(e.target);
				if (target) {
					target.flash = 0.3;
					target.rig?.kick(0.2);
				}
				if (e.attacker === this.playerId) {
					this.handT = 0.5;
					if (e.channel === "spirit") this.castT = 0.6;
				}
				if (e.target === this.playerId) this.hurtT = 0.4;
				const model = (state.enemies || []).find((v) => v.id === e.target);
				if (model)
					this.effects.push({
						x: mid(model.x),
						y: mid(model.y),
						z: 17,
						channel: e.channel,
						t: 0.6,
						duration: 0.6,
					});
			}
			if (type === "guard") this.guardT = 0.8;
			if (type === "swap" || type === "equip") this.swapT = 0.4;
			if (type === "boss-phase") {
				const a = this.actors.get(e.target);
				a?.data.combo?.press();
				this.castT = 0.9;
			}
			if (type === "gate" || type === "descend") {
				this.castT = 1;
				this.look = [0, 0];
			}
			this.onEvent(e);
		}
	}
	update(dt) {
		this.time += dt;
		const state = this.getState() || this.preview();
		if (!state) return;
		if (
			state.eventSeq < this.lastEventSeq ||
			state.expedition !== this.lastExpedition
		) {
			this.seenEvents.clear();
			this.lastExpedition = state.expedition;
		}
		this.lastEventSeq = state.eventSeq;
		if (this.geometrySignature(state) !== this.signature) this.rebuild(state);
		const w = this.world,
			settings = this.getSettings() || {},
			p = this.player(state);
		if (!p) return;
		this.handT = Math.max(0, this.handT - dt);
		this.hurtT = Math.max(0, this.hurtT - dt);
		this.castT = Math.max(0, this.castT - dt);
		this.guardT = Math.max(0, this.guardT - dt);
		this.swapT = Math.max(0, this.swapT - dt);
		this.processEvents(state);
		this.syncEntities(state, dt);
		const target = [mid(p.x), mid(p.y), yaw(p.dir || 0)];
		if (!this.cameraPos) {
			this.cameraPos = [...target];
			this.targetPos = [...target];
		}
		const teleported =
			Math.hypot(target[0] - this.cameraPos[0], target[1] - this.cameraPos[1]) >
			CELL * 2;
		const stepChanged =
			this.targetPos[0] !== target[0] || this.targetPos[1] !== target[1];
		if (stepChanged) {
			this.moveBeat = this.time;
			this.targetPos = [...target];
		}
		const k = teleported
			? 1
			: Math.min(1, dt * 14 * (state.tuning?.tempo || 1));
		this.cameraPos[0] += (target[0] - this.cameraPos[0]) * k;
		this.cameraPos[1] += (target[1] - this.cameraPos[1]) * k;
		this.cameraPos[2] +=
			angleDiff(this.cameraPos[2], target[2]) * Math.min(1, dt * 18);
		const motion = !!(settings.reducedMotion || settings.motion === true),
			bob = motion
				? 0
				: Math.sin(
						Math.min(1, (this.time - (this.moveBeat || -1)) / 0.28) * Math.PI,
					) * 0.55;
		w.camera.fixed = {
			x: this.cameraPos[0],
			y: this.cameraPos[1],
			z: EYE + bob,
			yaw: this.cameraPos[2] + this.look[0],
			pitch: -0.035 + this.look[1],
			fov: settings.fov || 75,
		};
		w.camera.target = {
			x: this.cameraPos[0],
			y: this.cameraPos[1],
			z: 0,
			r: 4,
		};
		Object.assign(this.flashTarget, {
			x: this.cameraPos[0],
			y: this.cameraPos[1],
			facing: this.cameraPos[2] + this.look[0],
		});
		this.beam.pitch = -0.035 + this.look[1];
		const nearest = [...this.lampSpots].sort(
			(a, b) =>
				Math.hypot(a.x - this.cameraPos[0], a.y - this.cameraPos[1]) -
				Math.hypot(b.x - this.cameraPos[0], b.y - this.cameraPos[1]),
		);
		this.roomLights.forEach((light, i) => {
			if (nearest[i]) Object.assign(light, nearest[i]);
			light.on = !!nearest[i];
		});
		this.lantern.x = this.cameraPos[0] + Math.cos(this.cameraPos[2]) * 5;
		this.lantern.y = this.cameraPos[1] + Math.sin(this.cameraPos[2]) * 5;
		this.lantern.z = 26;
		this.lantern.on = true;
		this.lastPlayer = p;
		this.lastState = state;
		for (const fx of this.effects) fx.t -= dt;
		this.effects = this.effects.filter((f) => f.t > 0);
		w.step(dt);
		// Reset presentation bodies to their authoritative grid poses after physics.
		for (const a of this.actors.values())
			if (a.data?.model && !a.data.dead) {
				const e = a.data.model;
				a.place(
					a.data.x,
					a.data.y,
					e.kind === "wraith" ? 3 + Math.sin(this.time * 2.3 + e.x) * 1.2 : 0,
				);
			}
	}
	drawDetails(w) {
		const p = w.pen,
			state = this.lastState || this.getState() || this.preview(),
			player = this.lastPlayer || this.player(state),
			t = this.time;
		p.at().box(w.width / 2, w.depth / 2, 57, w.width, w.depth, 2, "#202b38");
		if (this.getSettings()?.devCollision) {
			for (let y = 0; y < this.content.rows.length; y++)
				for (let x = 0; x < this.content.rows[y].length; x++) {
					const blocked =
						this.content.rows[y][x] === "#" ||
						(state.features || []).some(
							(f) => f.kind === "secret" && !f.open && f.x === x && f.y === y,
						);
					const X = x * CELL,
						Y = y * CELL,
						c = blocked ? "#e7b35e" : "#85dcae",
						Z = blocked ? 55.6 : 0.35;
					p.at()
						.tube(X + 0.2, Y + 0.2, Z, X + 31.8, Y + 0.2, Z, 0.12, c)
						.tube(X + 31.8, Y + 0.2, Z, X + 31.8, Y + 31.8, Z, 0.12, c)
						.tube(X + 31.8, Y + 31.8, Z, X + 0.2, Y + 31.8, Z, 0.12, c)
						.tube(X + 0.2, Y + 31.8, Z, X + 0.2, Y + 0.2, Z, 0.12, c);
					if (blocked)
						for (const [dx, dy] of [
							[0.2, 0.2],
							[31.8, 0.2],
							[0.2, 31.8],
							[31.8, 31.8],
						])
							p.tube(X + dx, Y + dy, 0.2, X + dx, Y + dy, 55.6, 0.12, c);
				}
			for (const e of state.enemies || [])
				if (e.alive)
					w.arc(mid(e.x), mid(e.y), 0.4, 4, 4.3, 0, TAU, "#ffbd6f", 0.8);
		}
		for (const d of this.wallDecor) {
			if (d.type === "rib") {
				p.at(d.x, d.y, 0, (d.dir * Math.PI) / 2)
					.box(0, 0, 27, 2.3, 1.5, 54, "#6c7a85")
					.box(0, -0.2, 5, 3, 2, 3, "#88919b")
					.box(0, -0.2, 48, 3, 2, 4, "#88919b");
			} else {
				p.at(d.x, d.y, 0, (d.dir * Math.PI) / 2)
					.box(0, 0, 18, 6, 2, 2, "#333c46")
					.tube(0, 0, 18, 0, 2, 19, 0.5, "#7a6951");
			}
		}
		for (const [id, a] of this.actors) {
			const e = a.data?.model;
			if (!e || !a.visible) continue;
			const dead = a.data.deadT || 0,
				alive = !a.data.dead;
			p.at(a.x, a.y, a.z - a.sink, a.facing);
			if (e.kind === "scorpion") {
				const attack = a.data.combo?.busy
					? Math.sin((a.data.combo.current.u || 0) * Math.PI)
					: 0;
				for (const s of [-1, 1]) {
					for (let i = 0; i < 4; i++) {
						const xx = -3 + i * 1.6,
							walk = Math.sin(t * 4 + i) * 0.3;
						p.tube(
							xx,
							s * 3,
							3,
							xx - 1,
							s * 6,
							1.5 + walk,
							0.55,
							"#486f8c",
						).tube(
							xx - 1,
							s * 6,
							1.5 + walk,
							xx + 1,
							s * 8,
							0.5,
							0.42,
							"#8aa7b9",
						);
					}
					p.tube(3, s * 2, 3, 7, s * 5, 4, 0.8, "#5d87a6")
						.tube(7, s * 5, 4, 10, s * 4, 4.4, 1.3, "#789bb5")
						.cone(10, s * 4, 4.4, 12, s * 3, 4.4, 0.7, "#b2c7ce");
				}
				const tail = [
					[-3, 0, 5],
					[-6, 0, 8],
					[-6, 0, 12],
					[-4 + attack * 2, 0, 16],
					[0 + attack * 4, 0, 17 - attack * 5],
				];
				for (let i = 1; i < tail.length; i++)
					p.tube(...tail[i - 1], ...tail[i], 1.1 - i * 0.12, "#5b8cba").ball(
						...tail[i],
						1.05 - i * 0.1,
						1.05 - i * 0.1,
						1.05 - i * 0.1,
						"#769fbe",
					);
				p.cone(
					...tail[4],
					tail[4][0] + 1,
					0,
					tail[4][2] - 3,
					1,
					"#bddbfa",
				).glow(tail[4][0], 0, tail[4][2] - 0.5, 0.65, "#8bcaff");
				for (let i = 0; i < 3; i++)
					p.glow(-1.5 + i * 1.5, -3.9, 5, 0.3, "#a2d6ff");
			} else if (e.kind === "minotaur") {
				const h = 38 + (alive ? Math.sin(t * 1.7) * 0.3 : 0),
					power = e.intent?.channel === "spirit";
				p.ball(1.3, 0, h - 1, 4.6, 4.2, 4.7, "#9c7351").ball(
					5,
					0,
					h - 2,
					3.4,
					3.8,
					2.2,
					"#b28c66",
				);
				for (const s of [-1, 1]) {
					p.tube(0, s * 3, h + 1, -1, s * 7, h + 4, 1.7, "#d9c79d").cone(
						-1,
						s * 7,
						h + 4,
						2,
						s * 9,
						h + 9,
						1.3,
						"#e8d8b5",
					);
					p.glow(4, s * 2.4, h + 0.1, 0.65, power ? "#95caff" : "#ffc071");
					p.box(-0.8, s * 6, 26, 6, 4, 4, "#887557").box(
						-0.8,
						s * 6,
						28.2,
						4,
						4,
						0.6,
						"#c7b77f",
					);
				}
				p.tube(5, -1, h - 4, 5, 1, h - 4, 0.5, "#d5b795");
			} else if (e.kind === "sentinel") {
				p.ball(4, -6.4, 16, 1.5, 5.2, 7, "#698e7d").ball(
					5.4,
					-6.4,
					16,
					0.7,
					1.1,
					1.1,
					"#e2d3aa",
				);
				for (const s of [-1, 1])
					p.tube(5, -6.4 + s * 3.8, 12, 5, -6.4 + s * 3.8, 20, 0.25, "#afc4af");
			} else if (e.kind === "wraith") {
				for (let i = 0; i < 7; i++) {
					let z = 3 + i * 3.1,
						rad = 6.5 - i * 0.35;
					p.ball(0, 0, z, rad, rad * 0.8, 2.3, i % 2 ? "#263b60" : "#304972");
				}
				p.ball(0.5, 0, 27, 3.4, 3.5, 4.4, "#192b48").ball(
					3,
					0,
					27,
					1.2,
					2.5,
					2.8,
					"#081726",
				);
				for (const s of [-1, 1]) p.glow(3.8, s * 1.1, 28, 0.5, "#98dfff");
				for (let i = 0; i < 6; i++) {
					let a = (i / 6) * TAU + t * 0.3;
					p.glow(
						Math.cos(a) * 7,
						Math.sin(a) * 7,
						1 + ((t * 2 + i * 3) % 9),
						0.25,
						"#83bbff",
					);
				}
			} else if (e.kind === "skeleton") {
				for (let i = 0; i < 5; i++)
					for (const s of [-1, 1])
						p.tube(
							1.5,
							s * 0.5,
							13 + i * 1.6,
							0.5,
							s * (3.6 - i * 0.2),
							14 + i * 1.6,
							0.4,
							"#d5d0b7",
						);
			}
			if (alive && e.intent && state.encounter) {
				const c = e.intent.channel === "spirit" ? COLORS.spirit : COLORS.war;
				w.arc(a.x, a.y, 0.2, 7.8, 8.3, t * 0.22, t * 0.22 + TAU * 0.8, c, 0.35);
				if (e.intent.power >= 8)
					for (let i = 0; i < 3; i++)
						w.glow(
							a.x + Math.sin(t * 1.7 + i * 2) * 6,
							a.y + Math.cos(t * 1.7 + i * 2) * 6,
							24 + i * 2,
							0.4,
							c,
						);
			}
		}
		for (const f of state.features || [])
			if (f.kind === "secret" && !f.open) {
				const c = f.revealed ? "#88c9ed" : "#465762";
				for (let d = 0; d < 4; d++) {
					const dx = [0, 1, 0, -1][d],
						dy = [-1, 0, 1, 0][d];
					p.at(
						mid(f.x) + dx * 16.15,
						mid(f.y) + dy * 16.15,
						0,
						(d * Math.PI) / 2,
					)
						.tube(-2, 0, 3, -1, 0, 17, 0.18, c)
						.tube(-1, 0, 17, 1, 0, 29, 0.18, c)
						.tube(1, 0, 29, 0.5, 0, 43, 0.18, c);
				}
			}
		for (const fx of this.effects) {
			const k = 1 - fx.t / fx.duration,
				c = fx.channel === "spirit" ? COLORS.spirit : "#d3eeaa";
			for (let i = 0; i < 7; i++) {
				let a = (i / 7) * TAU;
				p.at().glow(
					fx.x + Math.cos(a) * (1 + k * 7),
					fx.y + Math.sin(a) * (1 + k * 7),
					fx.z + Math.sin(a * 2 + k) * 4,
					(1 - k) * 0.65,
					c,
				);
			}
		}
		p.at();
		if (player) this.drawHands(w.overlay.pen, player, state);
	}
	drawHands(p, player, state) {
		const reduced = this.getSettings()?.reducedMotion,
			t = this.time;
		const attack =
			this.handT > 0 ? Math.sin((1 - this.handT / 0.5) * Math.PI) : 0;
		const use = this.castT > 0 ? Math.sin(this.castT * Math.PI) : 0;
		const swap = this.swapT > 0 ? Math.sin((this.swapT / 0.4) * Math.PI) : 0;
		const bob = reduced ? 0 : Math.sin(t * 1.4) * 0.12;
		const side = player.right?.kind || "empty";
		p.at(0, 0, 0, 0, 1);
		// Engine overlay clears depth, so hands never vanish inside corridor walls.
		const arm = (s, x, z) =>
			p
				.tube(5, s * 9, -12, x, s * 6, z, 1.35, "#443d36")
				.tube(x, s * 6, z, x + 3, s * 5, z + 2, 1.3, "#a98b6b")
				.ball(x + 3, s * 5, z + 2, 1.3, 1.2, 1.4, "#c4a181");
		arm(-1, 10 + attack * 2, -7 + bob - swap * 7);
		arm(1, 10 + attack * 5, -7 + bob - swap * 7);
		if (side === "empty") {
			p.at(14 + attack * 6, 5 - attack * 3, -3 + attack * 3)
				.ball(0, 0, 0, 1.6, 1.5, 1.7, "#c4a181")
				.box(1.2, 0, 0.2, 1.4, 2.7, 1.8, "#b49371");
		} else if (side === "bow") {
			p.at(4, 1, -3, 0, 0.8);
			const draw = attack * 3;
			p.tube(15, 5, -5, 17, 7, 2, 0.55, "#aa8052")
				.tube(17, 7, 2, 17, 8, 10, 0.5, "#c29d6c")
				.tube(17, 8, 10, 14, 7, 14, 0.4, "#a67c4c");
			p.tube(15, 5, -5, 17, 3, -10, 0.55, "#aa8052").tube(
				17,
				3,
				-10,
				14,
				1,
				-14,
				0.4,
				"#a67c4c",
			);
			p.tube(14, 7, 14, 12 - draw, 5, -3, 0.12, "#d9c7a8").tube(
				12 - draw,
				5,
				-3,
				14,
				1,
				-14,
				0.12,
				"#d9c7a8",
			);
			if (player.arrows > 0) {
				p.tube(10 - draw, 5, -3, 29, 5, -3, 0.17, "#d4b482").cone(
					29,
					5,
					-3,
					32,
					5,
					-3,
					0.55,
					"#c9d9d3",
				);
			}
		} else if (
			side === "rune" ||
			side === "sightBook" ||
			side.includes("Book") ||
			side === "scroll"
		) {
			p.at(14 + attack * 3, 5, -4 + use * 2, 0, 1, 0, -0.2)
				.box(0, 0, 0, 6, 7, 1.4, "#49759c")
				.box(0, 0, 0.9, 5.5, 6.5, 0.5, "#e8dcba")
				.box(0, 0, 1.3, 6.2, 7.2, 0.4, "#42668b");
			p.tube(-1, 0, 1.6, 1, 1.8, 1.6, 0.2, "#f2d491").tube(
				1,
				1.8,
				1.6,
				1,
				-1.8,
				1.6,
				0.2,
				"#f2d491",
			);
			p.glow(0, 0, 4.2 + use * 3, 1.05 + use, "#87caff");
			for (let i = 0; i < 3; i++)
				p.glow(
					Math.sin(t * 2 + i * 2) * 2,
					Math.cos(t * 2 + i * 2) * 2,
					5.5 + i * 0.8,
					0.2,
					"#b6e3ff",
				);
		} else if (side === "shield") {
			p.at(15, 5, -3 + attack * 3, 0)
				.ball(0, 0, 0, 1.8, 5.5, 7, "#6f9681")
				.ball(-2, 0, 0, 0.6, 1.4, 1.4, "#e2cf98");
		} else if (side === "potion") {
			p.at(14, 5, -2 + attack * 4)
				.ball(0, 0, 0, 2, 2, 2.8, "#6cbaa9")
				.tube(0, 0, 2, 0, 0, 4, 0.8, "#bbd5b0")
				.box(0, 0, 4.4, 2, 2, 0.7, "#bba06c");
		} else {
			const tilt = attack * 1.3;
			p.at(
				17 + attack * 4,
				5 - attack * 4,
				-6 + attack * 3,
				0,
				0.67,
				tilt * 0.3,
				-tilt,
			)
				.tube(0, 0, -3, 0, 0, 2, 0.6, "#755b3c")
				.box(0, 0, 2, 1.1, 5, 0.7, "#d6bf80")
				.bar(0, 0, 3, 0, 0, side === "throwing" ? 12 : 20, 2, 0.4, "#bfcfcd")
				.cone(
					0,
					0,
					side === "throwing" ? 12 : 20,
					0,
					0,
					side === "throwing" ? 15 : 23,
					0.9,
					"#e2e6d8",
				);
			p.tube(
				0.4,
				0.6,
				4,
				0.4,
				0.6,
				side === "throwing" ? 11 : 19,
				0.12,
				"#f2efc9",
			);
		}
		const left = player.left?.kind;
		if (left === "shield") {
			p.at(14, -6, -4 + (this.guardT > 0 ? 5 : 0), 0)
				.ball(0, 0, 0, 1.7, 5.8, 7.3, "#5f806f")
				.ball(-1.9, 0, 0, 0.7, 1.6, 1.6, "#bda873");
			for (const s of [-1, 1])
				p.tube(-1.7, s * 4, -4, -1.7, s * 4, 4, 0.3, "#c5bc94");
		} else if (left === "blade" || left === "throwing") {
			p.at(14, -6, -7 + bob, 0, 0.7, 0, 0.2)
				.tube(0, 0, -3, 0, 0, 1, 0.5, "#765d3f")
				.box(0, 0, 1, 1, 4, 0.5, "#cab77d")
				.bar(0, 0, 2, 0, 0, 14, 1.6, 0.35, "#bdccca")
				.cone(0, 0, 14, 0, 0, 17, 0.7, "#e4e6d6");
		} else if (left === "bow") {
			p.at(14, -6, -5 + bob)
				.tube(0, 0, -7, 2, -2, -2, 0.45, "#aa8052")
				.tube(2, -2, -2, 2, -3, 6, 0.4, "#c29d6c")
				.tube(2, -3, 6, 0, -2, 10, 0.35, "#a67c4c")
				.tube(0, 0, -7, 0, -2, 10, 0.1, "#decaac");
		} else if (left === "rune" || left === "scroll" || left?.includes("Book")) {
			p.at(14, -6, -5 + bob)
				.box(0, 0, 0, 5, 6, 2, "#4b6e94")
				.box(0, 0, 1.4, 5.4, 6.4, 0.5, "#9bc0d2")
				.glow(0, 0, 3.3, 1, "#8acbff");
		} else {
			p.at(13, -6, -5 + bob)
				.box(0, 0, -1, 4.2, 3.6, 0.6, "#253540")
				.glow(0, 0, 1, 1.3, "#ffd297")
				.box(0, 0, 3.3, 4.2, 3.6, 0.5, "#8a7049");
			for (const s of [-1, 1])
				p.tube(s * 1.8, -1.5, -1, s * 1.8, -1.5, 3.5, 0.17, "#384048").tube(
					s * 1.8,
					1.5,
					-1,
					s * 1.8,
					1.5,
					3.5,
					0.17,
					"#384048",
				);
		}
		p.at();
	}
	draw(r) {
		if (this.world) this.world.draw(r);
	}
	projectEntity(id) {
		const a = this.actors.get(id);
		return a && this.world.project(a.x, a.y, a.z + 18);
	}
	diagnostics() {
		return {
			ready: this.ready,
			floor: this.floor,
			worldHash: this.world?.hash(),
			actors: this.actors.size,
			nativePuppets: [...this.actors.values()].filter((a) => a.rig).length,
			shapes: Object.keys(this.E.SHAPES).filter((k) => k.startsWith("tarmin")),
			nativeWorld: !!this.world,
			stats: this.world?.stats || {},
		};
	}
	dispose() {
		this.world?.dispose();
		this.world = null;
		this.actors.clear();
		this.things.clear();
	}
}
