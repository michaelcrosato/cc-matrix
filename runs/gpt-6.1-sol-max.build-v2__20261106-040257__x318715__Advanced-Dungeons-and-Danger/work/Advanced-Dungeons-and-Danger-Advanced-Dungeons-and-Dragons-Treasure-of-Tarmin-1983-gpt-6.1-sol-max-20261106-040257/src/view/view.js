import { CONTENT } from "../content/campaign.js";
import { appendCreature, COLORS, installArt } from "./art.js";

const C = 32,
	EYE = 25,
	PI = Math.PI,
	DX = [0, 1, 0, -1],
	DY = [-1, 0, 1, 0],
	mid = (n) => n * C + C / 2;
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const angleDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
const showcase = {
	id: "showcase",
	name: "The watching vault",
	start: { x: 2, y: 5, dir: 0 },
	rows: [
		"#########",
		"#.......#",
		"#.......#",
		"#.......#",
		"#.......#",
		"#.......#",
		"#.......#",
		"#########",
	],
	entities: [],
};
const palettes = [
	{
		base: "#454e53",
		dark: "#303b40",
		light: "#626a68",
		wall: "#4e5a5e",
		fog: "#111b20",
		accent: "#d2a568",
		sky: "#17232a",
		ground: "#161d20",
	},
	{
		base: "#3f5862",
		dark: "#2a3f4a",
		light: "#607b82",
		wall: "#405e6c",
		fog: "#0c2029",
		accent: "#76cbea",
		sky: "#294d63",
		ground: "#142c35",
	},
	{
		base: "#554b40",
		dark: "#3c3931",
		light: "#7a6c54",
		wall: "#5b5a51",
		fog: "#171b20",
		accent: "#e4bb6e",
		sky: "#404553",
		ground: "#211b17",
	},
];
const entityList = (s) => Object.values(s?.entities || {});

export class DungeonView {
	constructor(game, options = {}) {
		this.game = game;
		this.options = options;
		this.world = null;
		this.ready = false;
		this.time = 0;
		this.floorKey = "";
		this.actors = new Map();
		this.things = new Map();
		this.lanterns = [];
		this.fx = [];
		this.seenEvents = new Set();
		this.yawOffset = 0;
		this.pitch = -0.035;
		this.combatPitch = 0;
		this.handAction = null;
		this.handSwap = 0;
		this.camera = { x: 0, y: 0, yaw: -PI / 2 };
		this.rendererName = "loading";
		this.lastRun = "";
		this.lastEventSeq = 0;
		this.lastClock = 0;
		this.moveTween = null;
		this.lastLogical = null;
	}
	async init() {
		const E = globalThis.My3D2dge;
		if (!E?.World3D)
			throw new Error("The bundled World3D engine did not initialize.");
		this.E = E;
		installArt(E);
		try {
			const page = await E.World3D.init(this.game);
			this.rendererName = page.backend || "WebGL 2";
			this.ready = true;
			this._sync(true);
			this.options.onReady?.(this);
			return this;
		} catch (e) {
			this.ready = false;
			this.rendererName = "unsupported";
			this.options.onError?.(e);
			throw e;
		}
	}
	_state() {
		return this.options.getState?.() || null;
	}
	_settings() {
		return this.options.getSettings?.() || {};
	}
	_player() {
		const s = this._state();
		return (
			this.options.getPlayer?.() ||
			Object.values(s?.players || {}).find((p) => p.connected && !p.down) ||
			Object.values(s?.players || {})[0] ||
			null
		);
	}
	look(dx = 0, dy = 0) {
		const sensitivity = (this._settings().lookSensitivity ?? 1) * 0.0026;
		this.yawOffset = clamp(this.yawOffset + dx * sensitivity, -0.72, 0.72);
		this.pitch = clamp(this.pitch - dy * sensitivity, -0.6, 0.45);
	}
	resetLook() {
		this.yawOffset = 0;
		this.pitch = -0.035;
		this.combatPitch = 0;
	}
	_sync(force = false) {
		if (!this.ready) return;
		const s = this._state(),
			p = this._player(),
			content = this.options.getContent?.() || s?.content || CONTENT,
			floor = s ? content.floors[s.floor] || content.floors[0] : showcase;
		const secrets = entityList(s)
			.filter((e) => e.type === "secret" && e.floor === s.floor)
			.map((e) => e.id + ":" + e.open)
			.join("|");
		const rewind =
			!!s &&
			s.runId === this.lastRun &&
			(s.eventSeq < this.lastEventSeq || s.clock < this.lastClock);
		const key =
			(s?.runId || "title") +
			"|" +
			(s?.floor ?? -1) +
			"|" +
			floor.rows.join("") +
			"|" +
			secrets;
		if (force || rewind || key !== this.floorKey) {
			this.floorKey = key;
			this._build(floor, s, p);
		}
		const events = s?.events || [];
		if (s?.runId !== this.lastRun || rewind) {
			this.lastRun = s?.runId;
			this.seenEvents = new Set(events.map((e) => e.id));
			this.fx.length = 0;
		}
		this.lastEventSeq = s?.eventSeq || 0;
		this.lastClock = s?.clock || 0;
		for (const ev of events) {
			if (this.seenEvents.has(ev.id)) continue;
			this.seenEvents.add(ev.id);
			this._event(ev);
		}
		if (this.seenEvents.size > 512)
			this.seenEvents = new Set(events.map((e) => e.id));
		this._syncEntities(s);
	}
	_build(floor, s, p) {
		if (this.world) this.world.dispose();
		this.actors.clear();
		this.things.clear();
		this.fx.length = 0;
		this.lanterns = [];
		this.lastLogical = null;
		this.moveTween = null;
		const E = this.E,
			index = s?.floor ?? 0,
			pal = palettes[index] || palettes[0],
			rows = floor.rows.map((row) => row.split(""));
		for (const e of entityList(s))
			if (e.type === "secret" && e.floor === index && e.open && rows[e.y])
				rows[e.y][e.x] = ".";
		const doubled = [];
		for (const row of rows) {
			const r = row.map((ch) => (ch === "#" ? "##" : "..")).join("");
			doubled.push(r, r);
		}
		this.floor = floor;
		this.rows = rows;
		this.palette = pal;
		const world = new E.World3D(this.game, {
			level: {
				rows: doubled,
				ground: "flagstone",
				colors: { base: pal.base, dark: pal.dark, light: pal.light },
				wallSide: "brick",
				side: "brick",
				color: pal.wall,
				legend: {
					"#": {
						wall: 48,
						cut: false,
						color: pal.wall,
						top: pal.wall,
						line: "#1d2a32",
					},
				},
			},
			look: "puppet",
			res: "full",
			camera: {
				mode: "fixed",
				fov: 72,
				near: 0.25,
				mouseLook: false,
				cut: false,
			},
			overlay: { fov: 62, light: 1.1 },
			ambient: [pal.sky, pal.ground, 1.85],
			sun: {
				color: "#aab9c7",
				intensity: 0.32,
				dir: [0.3, 0.5, -1],
				shadow: false,
			},
			lights: 9,
			torchLights: 0,
			glowLights: 4,
			shadows: true,
			outlines: true,
			fog: { color: pal.fog, near: 62, far: 240 },
			sky: pal.fog,
			filter: { look: "clean", bloom: 0.12, fxaa: true, punch: 1.05 },
			onDraw: () => this._drawWorld(),
		});
		this.world = world;
		world.camera.mouseLook = false;
		const st = p || floor.start;
		this.hero = world.hero({
			x: mid(st.x),
			y: mid(st.y),
			z: 0,
			r: 1,
			half: 0,
			visible: false,
			fly: true,
		});
		this.hero.visible = false;
		this.hero.setSolid(false);
		world.camera.follow(this.hero);
		this.camera = {
			x: mid(st.x),
			y: mid(st.y),
			yaw: -PI / 2 + ((st.dir || 0) * PI) / 2,
		};
		this.resetLook();
		this.lamp = world.light({
			color: "#ffe0aa",
			reach: 160,
			power: 4.5,
			flicker: 0.025,
		});
		this.floorLamps = Array.from({ length: 8 }, () =>
			world.light({
				color: index === 1 ? "#85cce8" : "#ffc579",
				reach: 100,
				power: 5,
				flicker: 0.04,
			}),
		);
		this._dress(rows, index);
		if (!s) {
			const fake = {
				id: "title.warden",
				type: "enemy",
				kind: "minotaur",
				x: 5.8,
				y: 2.5,
				war: 90,
				maxWar: 90,
				spirit: 90,
				maxSpirit: 90,
				phase: 1,
			};
			this._createActor(fake);
			const a = this.actors.get(fake.id);
			a.showcase = true;
			world.thing("dangerEye", mid(3), 32.1, 0, { color: "#eac983", yaw: 0 });
			world.thing("dangerCamp", mid(6), mid(4), 0, {});
			world.shape("dangerPedestal", mid(6), mid(1), 0, {});
			world.thing("dangerTreasure", mid(6), mid(1), 12, { open: 0 });
		} else this._syncEntities(s);
		world.camera.fixed = {
			x: this.camera.x,
			y: this.camera.y,
			z: EYE,
			yaw: this.camera.yaw,
			pitch: this.pitch,
			fov: 72,
		};
		world.step(1 / 120);
	}
	_dress(rows, index) {
		const w = this.world;
		this.arches = [];
		this.seams = [];
		for (let y = 0; y < rows.length; y++)
			for (let x = 0; x < rows[y].length; x++) {
				if (rows[y][x] === "#") continue;
				const walls = [];
				for (let d = 0; d < 4; d++)
					if (rows[y + DY[d]]?.[x + DX[d]] === "#") walls.push(d);
				if (
					walls.length &&
					((x * 7 + y * 3) % 5 === 0 ||
						(!this._state() && x === 1 && y % 2 === 0))
				) {
					const d = walls[(x + y) % walls.length],
						lx = mid(x) + DX[d] * 14,
						ly = mid(y) + DY[d] * 14;
					w.thing("dangerLantern", lx, ly, 22, {
						color: index === 1 ? "#a3d6e4" : "#ffd397",
					});
					this.lanterns.push({ x: lx, y: ly, z: 28 });
				}
				if (
					walls.length === 2 &&
					walls[1] === walls[0] + 2 &&
					(x + y) % 3 === 0
				)
					this.arches.push({
						x: mid(x),
						y: mid(y),
						yaw: walls[0] % 2 ? 0 : PI / 2,
					});
				if (walls.length >= 2 && (x * 13 + y * 7) % 11 === 0) {
					const d = walls[0],
						px = mid(x) + DX[d] * 11 + DY[d] * 8,
						py = mid(y) + DY[d] * 11 - DX[d] * 8;
					w.shape((x + y) % 2 ? "dangerUrn" : "barrel", px, py, 0, {
						scale: 0.63,
					});
				}
				if (index === 1 && (x + y) % 3 === 0)
					this.seams.push({ x: mid(x), y: mid(y) });
			}
		if (this.lanterns.length < 5) {
			for (let y = 1; y < rows.length - 1; y += 2)
				for (let x = 1; x < rows[y].length - 1; x += 3)
					if (rows[y][x] !== "#" && this.lanterns.length < 8) {
						const d = [0, 1, 2, 3].find(
							(d) => rows[y + DY[d]]?.[x + DX[d]] === "#",
						);
						if (d === undefined) continue;
						const lx = mid(x) + DX[d] * 14,
							ly = mid(y) + DY[d] * 14;
						w.thing("dangerLantern", lx, ly, 22, {
							color: index === 1 ? "#9dd8ee" : "#ffd397",
						});
						this.lanterns.push({ x: lx, y: ly, z: 28 });
					}
		}
	}
	_createActor(e) {
		const E = this.E,
			w = this.world,
			k = e.kind,
			boss = k === "minotaur",
			scorpion = k === "scorpion",
			wraith = k === "wraith",
			brute = k === "brute";
		let rig = null,
			blob = null;
		if (scorpion) {
			blob = new E.Blob({
				R: 4.5,
				mouth: true,
				colors: {
					base: "#527d84",
					dk: "#294d58",
					lt: "#83b3b6",
					eye: "#c1e9ec",
					pupil: "#17343e",
				},
				face: "front",
			});
		} else {
			const bone = k === "skeleton";
			rig = new E.Humanoid({
				size: boss ? 1.45 : brute ? 1.25 : wraith ? 1.1 : 1.06,
				build: bone ? "skeleton" : boss || brute ? "bulky" : "heroic",
				hair: "bald",
				outfit: wraith ? "robe" : "tunic",
				armor: k === "sentinel" || boss,
				hood: wraith,
				sleeves: bone ? "none" : "long",
				weapon: boss ? "dangerAxe" : wraith ? null : "sword",
				bladeLen: boss ? 15 : brute ? 12 : 10,
				hat: boss
					? "dangerHorns"
					: k === "sentinel"
						? { style: "helmet", color: "#72898a" }
						: null,
				eyeGlow: boss
					? "#e4b469"
					: wraith
						? "#99ddf4"
						: bone
							? "#c5d9a0"
							: null,
				colors: bone
					? {
							skin: "#e0d4b2",
							bone: "#e0d4b2",
							pants: "#b6ad94",
							cloth: "#70644e",
							hair: "#a79b79",
							boot: "#746f60",
							belt: "#685b48",
							metal: "#a0aba2",
							hilt: "#aa884c",
						}
					: boss
						? {
								skin: "#835f43",
								cloth: "#57483c",
								pants: "#40392f",
								boot: "#2c2d2b",
								glove: "#765a43",
								plate: "#74766b",
								metal: "#b6b5a0",
								belt: "#c29a56",
								hair: "#392d23",
							}
						: wraith
							? {
									skin: "#466c7a",
									cloth: "#2f455c",
									pants: "#284052",
									boot: "#284052",
									belt: "#294257",
									hair: "#203341",
									metal: "#7da5b0",
								}
							: brute
								? {
										skin: "#918770",
										cloth: "#4a5143",
										pants: "#524a3c",
										boot: "#2e3530",
										metal: "#b4b39a",
										hair: "#63543a",
									}
								: {
										skin: "#87908c",
										cloth: "#344d4e",
										pants: "#2a3a3c",
										boot: "#242c2d",
										plate: "#63797a",
										metal: "#c7c4a2",
										hilt: "#c3a56b",
									},
			});
		}
		if (wraith && rig) {
			const solve = rig.solvePose.bind(rig);
			rig.solvePose = () => {
				solve();
				const J = rig.J;
				for (const [joint, side] of [
					["kneeL", -1],
					["kneeR", 1],
					["footL", -1],
					["footR", 1],
				]) {
					J[joint][0] = J.hipC[0];
					J[joint][1] = side * 0.6;
					J[joint][2] = J.hipC[2] - (joint.startsWith("foot") ? 4 : 2);
				}
			};
		}
		const actor = w.mob({
			x: mid(e.x),
			y: mid(e.y),
			z: wraith ? 2 : 0,
			r: 2,
			half: scorpion ? 0 : 3,
			fly: true,
			mass: 1,
			rig,
			blob,
			look: "puppet",
			shadow: true,
		});
		actor.setSolid(false);
		actor.vx = 0;
		actor.vy = 0;
		actor.vz = 0;
		const atk = new E.Attack(
			boss
				? "overhead"
				: wraith
					? "cast"
					: brute
						? "twohand"
						: scorpion
							? "claw"
							: "slash",
			{ wind: 0.22, active: 0.16, recover: 0.4 },
		);
		const combo = boss
			? new E.Combo(["overhead", "cast", "twohand"], { window: 0.3 })
			: null;
		this.actors.set(e.id, {
			actor,
			kind: k,
			model: e,
			atk,
			combo,
			hurt: 0,
			dead: 0,
			deadWas: !!e.dead,
			age: 0,
			attackDelay: 0,
			renderX: mid(e.x),
			renderY: mid(e.y),
			baseSize: rig?.o.size || 1,
		});
	}
	_syncEntities(s) {
		if (!s) return;
		const entities = entityList(s).filter((e) => e.floor === s.floor);
		for (const e of entities) {
			if (e.type === "enemy") {
				if (!this.actors.has(e.id) && !e.dead) this._createActor(e);
				const a = this.actors.get(e.id);
				if (a) {
					a.model = e;
					if (e.dead && !a.deadWas) {
						a.dead = 0.001;
						a.deadWas = true;
					}
				}
				continue;
			}
			const hidden =
				e.taken ||
				e.claimed ||
				e.removed ||
				(e.type === "loot" && e.active === false);
			if (hidden) {
				const t = this.things.get(e.id);
				if (t) {
					this.world.remove(t);
					this.things.delete(e.id);
				}
				continue;
			}
			let t = this.things.get(e.id);
			if (!t) {
				let kind = "",
					o = {},
					x = mid(e.x),
					y = mid(e.y),
					yaw = 0;
				if (e.type === "loot") {
					const item = s.items?.[e.itemId],
						itemKind =
							item?.kind ||
							e.kind ||
							(e.key ? "key" : e.arrows ? "arrows" : "food");
					kind = "dangerLoot";
					const def = (this.options.getContent?.() || s.content || CONTENT)
						.items[itemKind];
					o = {
						itemKind,
						color: def?.channel === "spirit" ? COLORS.spirit : COLORS.gold,
						bob: 0.3,
						spin: 0.035,
					};
				} else if (e.type === "door") {
					kind = "dangerDoor";
					yaw = this._doorYaw(e);
					o = { open: 0, locked: !e.open };
				} else if (e.type === "gate") {
					kind = "dangerGate";
					yaw = this._doorYaw(e);
					o = { color: COLORS.spirit };
				} else if (e.type === "ladder") {
					kind = "dangerLadder";
					yaw = this._doorYaw(e);
				} else if (e.type === "mural") {
					kind = "dangerEye";
					const d = this._wallDirection(e);
					x += DX[d] * 15.85;
					y += DY[d] * 15.85;
					yaw = (d * PI) / 2;
					o = {
						color:
							s.floor === 0
								? COLORS.war
								: s.floor === 1
									? COLORS.spirit
									: COLORS.gold,
					};
				} else if (e.type === "chest") {
					kind = "chest";
					o = { open: e.open ? 1 : 0, color: "#826a42" };
				} else if (e.type === "treasure") {
					kind = "dangerTreasure";
					o = { open: s.shared?.bossDefeated ? 1 : 0 };
				} else if (e.type === "camp") {
					kind = "dangerCamp";
				} else if (e.type === "secret") {
					kind = "dangerEye";
					const d = this._wallDirection(e);
					x += DX[d] * 15.7;
					y += DY[d] * 15.7;
					yaw = (d * PI) / 2;
					o = { size: 0.14, color: "#4c8797" };
				}
				if (kind) {
					t = this.world.thing(kind, x, y, 0, { ...o, yaw });
					t.model = e;
					t.currentOpen = e.open ? 1 : 0;
					this.things.set(e.id, t);
				}
			}
			if (t) {
				t.model = e;
				t.locked = e.type === "door" && !e.open;
				t.targetOpen = e.open ? 1 : 0;
				if (e.type === "treasure") t.open = s.shared?.bossDefeated ? 1 : 0;
				if (e.type === "chest") t.open = e.open ? 1 : 0;
			}
		}
		const ids = new Set(
			entities
				.filter((e) => !e.taken && !e.removed && !e.claimed)
				.map((e) => e.id),
		);
		for (const [id, t] of this.things)
			if (!ids.has(id)) {
				this.world.remove(t);
				this.things.delete(id);
			}
		for (const p of Object.values(s.players || {})) {
			if (p.id === this._player()?.id || !p.connected) continue;
			const id = "ally:" + p.id;
			if (!this.actors.has(id)) {
				this._createActor({ id, kind: "ally", x: p.x, y: p.y, phase: 1 });
				const a = this.actors.get(id);
				a.ally = true;
				a.actor.rig.C.cloth = "#497e68";
			}
			const a = this.actors.get(id);
			a.model = { ...p, dead: p.down };
		}
	}
	_doorYaw(e) {
		const walls =
			this.rows[e.y]?.[e.x - 1] === "#" && this.rows[e.y]?.[e.x + 1] === "#";
		return walls ? 0 : PI / 2;
	}
	_wallDirection(e) {
		return (
			[0, 1, 2, 3].find((d) => this.rows[e.y + DY[d]]?.[e.x + DX[d]] === "#") ??
			0
		);
	}
	_event(e) {
		const s = this._state(),
			me = this._player(),
			eid =
				e.type === "enemyAttack"
					? e.target
					: e.enemy || e.source || e.attacker || e.player,
			source = this.actors.get(eid) || this.actors.get("ally:" + eid),
			target = this.actors.get(e.target);
		if (e.type === "attack") {
			if (e.player === me?.id)
				this.handAction = {
					type: "attack",
					channel: e.channel || "war",
					t: 0,
					item: e.weapon,
				};
			if (source) {
				source.attackDelay = 0.001;
				source.atk.cancel();
				source.atk.start();
			}
			if (target) {
				target.hurt = 0.65;
				target.actor.flash = 0.18;
				target.actor.rig?.kick(0.1);
				target.actor.blob?.kick(0.15);
			}
			const foe = target?.model || s?.entities?.[e.target];
			if (foe)
				this.fx.push({
					type: "bolt",
					from: source
						? { x: source.actor.x, y: source.actor.y, z: source.actor.z + 20 }
						: { x: this.camera.x, y: this.camera.y, z: EYE - 5 },
					to: {
						x: mid(foe.x),
						y: mid(foe.y),
						z: foe.kind === "scorpion" ? 8 : 20,
					},
					channel: e.channel || "war",
					t: 0,
					life: 0.5,
				});
		}
		if (e.type === "enemyAttack") {
			if (source) {
				source.attackDelay = 0.12;
				source.atk.cancel();
				if (source.kind === "minotaur") {
					if (source.model.phase === 3) source.combo.press();
					else
						source.atk = new this.E.Attack(
							e.channel === "spirit" ? "cast" : "overhead",
							{ wind: 0.2, active: 0.17, recover: 0.42 },
						);
				}
			}
			if (e.player === me?.id && e.amount > 0)
				this.fx.push({
					type: "hit",
					channel: e.channel || "war",
					t: 0,
					life: 0.55,
				});
		}
		if (e.type === "damage" && target) {
			target.hurt = 0.65;
			target.actor.flash = 0.22;
			target.actor.rig?.kick(0.1);
			target.actor.blob?.kick(0.2);
		}
		if (e.type === "defeatEnemy") {
			const a = this.actors.get(e.target || e.enemy || e.id);
			if (a && !a.dead) {
				a.dead = 0.001;
				a.deadWas = true;
			}
			const en = a?.model;
			if (en)
				this.fx.push({
					type: "burst",
					to: { x: mid(en.x), y: mid(en.y), z: 12 },
					channel: e.channel || "spirit",
					t: 0,
					life: 1,
				});
		}
		if (
			["swap", "equip"].includes(e.type) &&
			(!e.player || e.player === me?.id)
		)
			this.handSwap = 0.6;
		if (e.type === "guard" && (!e.player || e.player === me?.id))
			this.handAction = { type: "guard", t: 0, channel: e.channel || "war" };
		if (
			[
				"use",
				"rest",
				"pickup",
				"revive",
				"gate",
				"descend",
				"victory",
			].includes(e.type) &&
			(!e.player || e.player === me?.id)
		) {
			this.handAction = { type: e.type, t: 0, channel: e.channel || "spirit" };
			if (["gate", "descend", "victory"].includes(e.type))
				this.fx.push({
					type: "transition",
					channel: e.type === "victory" ? "war" : "spirit",
					t: 0,
					life: 1.1,
				});
		}
	}
	update(dt) {
		if (!this.ready) return;
		dt = Math.min(dt, 0.1);
		const settings = this._settings(),
			tempo = this._state()?.tuning?.tempo ?? 1;
		this.time += dt * tempo;
		this._sync();
		const s = this._state(),
			player = this._player();
		if (!s) {
			const x = mid(2.4) + Math.sin(this.time * 0.12) * 1.4,
				y = mid(5.8),
				yaw = -PI / 2 + 0.12 + Math.sin(this.time * 0.08) * 0.035;
			this.camera = { x, y, yaw };
			this.world.camera.fixed = { x, y, z: 25, yaw, pitch: -0.025, fov: 65 };
			this.hero.place(x, y, 0);
		} else if (player) {
			const logical = [player.x, player.y, player.dir],
				last = this.lastLogical;
			if (!last || logical.some((n, i) => n !== last[i])) {
				const moved = !last || logical[0] !== last[0] || logical[1] !== last[1];
				const distance = Math.hypot(
					mid(player.x) - this.camera.x,
					mid(player.y) - this.camera.y,
				);
				this.moveTween = {
					from: { ...this.camera },
					to: {
						x: mid(player.x),
						y: mid(player.y),
						yaw: -PI / 2 + (player.dir * PI) / 2,
					},
					t: 0,
					dur: distance > C * 2 ? 0 : (moved ? 0.28 : 0.2) / tempo,
					moved,
				};
				if (last && player.dir !== last[2]) this.yawOffset = 0;
				this.lastLogical = logical;
			}
			let bob = 0;
			if (this.moveTween) {
				const t = this.moveTween;
				t.t += dt;
				let u = t.dur ? clamp(t.t / t.dur, 0, 1) : 1;
				u = u * u * (3 - 2 * u);
				this.camera.x = t.from.x + (t.to.x - t.from.x) * u;
				this.camera.y = t.from.y + (t.to.y - t.from.y) * u;
				this.camera.yaw = t.from.yaw + angleDiff(t.from.yaw, t.to.yaw) * u;
				if (!settings.reducedMotion && t.moved) bob = Math.sin(u * PI) * 0.5;
				if (u >= 1) this.moveTween = null;
			}
			this.hero.place(this.camera.x, this.camera.y, 0);
			this.hero.facing = this.camera.yaw;
			const nearest = s.combat?.enemies
				.map((id) => s.entities[id])
				.filter((e) => e && !e.dead)
				.sort(
					(a, b) =>
						Math.hypot(a.x - player.x, a.y - player.y) -
						Math.hypot(b.x - player.x, b.y - player.y),
				)[0];
			const lowPitch = nearest?.kind === "scorpion" ? -0.25 : 0;
			this.combatPitch += (lowPitch - this.combatPitch) * Math.min(1, dt * 7);
			this.world.camera.fixed = {
				x: this.camera.x - Math.cos(this.camera.yaw) * 3,
				y: this.camera.y - Math.sin(this.camera.yaw) * 3,
				z: EYE + bob - (player.down ? 9 : 0),
				yaw: this.camera.yaw + this.yawOffset,
				pitch: this.pitch + this.combatPitch,
				fov: settings.fov || 72,
			};
		}
		const me = player || { x: 2, y: 5 };
		for (const [id, a] of this.actors) {
			const actor = a.actor,
				e = a.model;
			a.age += dt;
			a.hurt = Math.max(0, a.hurt - dt);
			actor.flash = Math.max(0, (actor.flash || 0) - dt);
			if (a.attackDelay > 0) {
				a.attackDelay -= dt;
				if (a.attackDelay <= 0) a.atk.start();
			}
			a.atk.update(dt * tempo);
			a.combo?.update(dt * tempo);
			if (a.dead) {
				a.dead += dt * tempo;
				actor.fade = clamp(1 - (a.dead - 0.3) / 0.8, 0, 1);
				actor.sink = Math.min(12, a.dead * 8);
				if (actor.rig)
					actor.rig.o.size = a.baseSize * Math.max(0.08, 1 - a.dead * 0.65);
				if (a.dead > 1.3) {
					this.world.remove(actor);
					this.actors.delete(id);
					continue;
				}
			}
			if (Math.hypot(mid(e.x) - a.renderX, mid(e.y) - a.renderY) > C * 2) {
				a.renderX = mid(e.x);
				a.renderY = mid(e.y);
			}
			const ease = Math.min(1, dt * 12 * tempo);
			a.renderX += (mid(e.x) - a.renderX) * ease;
			a.renderY += (mid(e.y) - a.renderY) * ease;
			actor.place(
				a.renderX,
				a.renderY,
				a.kind === "wraith" && !a.dead
					? 2 + Math.sin(this.time * 1.7) * 1.2
					: 0,
			);
			const target = s?.players?.[s?.combat?.intents?.[id]?.target] || me;
			actor.facing = Math.atan2(
				mid(target.y) - actor.y,
				mid(target.x) - actor.x,
			);
			if (a.showcase) actor.facing = PI / 2 + 0.2;
			const intent = s?.combat?.intents?.[id],
				kind = intent?.kind || "";
			const anticipation = intent && !a.atk.busy;
			actor.anim = {
				attack: a.combo?.state || a.atk.state,
				hurt: a.hurt,
				pose: a.dead
					? "die"
					: s?.phase === "preparation" && a.kind === "minotaur"
						? "kneel"
						: anticipation
							? intent.channel === "spirit"
								? "dangerCast"
								: /charge|wind|heavy/.test(kind)
									? "dangerCharge"
									: "dangerWatch"
							: a.kind === "wraith"
								? "dangerCast"
								: "dangerWatch",
				expr: a.dead ? "wince" : intent ? "angry" : null,
				down: a.ally && e.down ? 1 : undefined,
			};
			if (a.kind === "scorpion")
				actor.anim = {
					squash: a.dead ? 0.6 : Math.sin(this.time * 1.7) * 0.04,
					look: [Math.cos(actor.facing), Math.sin(actor.facing)],
				};
			actor.vx = actor.vy = actor.vz = 0;
		}
		for (const t of this.things.values())
			if (t.kind === "dangerDoor" || t.model?.type === "door") {
				t.currentOpen +=
					(t.targetOpen - t.currentOpen) * Math.min(1, dt * 4 * tempo);
				t.open = t.currentOpen;
			}
		this.lamp.x = this.camera.x;
		this.lamp.y = this.camera.y;
		this.lamp.z = EYE - 2;
		const near = [...this.lanterns].sort(
			(a, b) =>
				Math.hypot(a.x - this.camera.x, a.y - this.camera.y) -
				Math.hypot(b.x - this.camera.x, b.y - this.camera.y),
		);
		this.floorLamps.forEach((light, i) => {
			const l = near[i];
			light.on = !!l;
			if (l) Object.assign(light, l);
		});
		for (const f of this.fx) f.t += dt * tempo;
		this.fx = this.fx.filter((f) => f.t < f.life);
		if (this.handAction) {
			this.handAction.t += dt * tempo;
			if (this.handAction.t > 0.8) this.handAction = null;
		}
		this.handSwap = Math.max(0, this.handSwap - dt * tempo);
		this.world.step(dt);
	}
	_drawWorld() {
		const w = this.world,
			p = w.pen,
			t = this.time,
			pal = this.palette,
			s = this._state(),
			settings = this._settings();
		// Native pens share the engine's instanced shaded shape pipeline and outline ink.
		p.at().box(w.width / 2, w.depth / 2, 49, w.width, w.depth, 2, "#18232b");
		for (const a of this.arches) {
			p.at(a.x, a.y, 0, a.yaw)
				.box(-14, 0, 22, 2, 3, 44, "#71808a")
				.box(14, 0, 22, 2, 3, 44, "#71808a")
				.box(0, 0, 44, 30, 3, 3, "#637782");
		}
		if (s?.floor === 1)
			for (const a of this.seams) {
				p.at(a.x, a.y, 0.18)
					.box(0, 0, 0, 25, 22, 0.1, "#243f4b")
					.tube(-10, -9, 0.1, 10, 9, 0.1, 0.08, "#5e8c98");
			}
		if (s?.floor === 2) {
			// Horned machinery: the shape of the guardian repeats in architecture.
			for (const side of [-1, 1]) {
				p.at(mid(5) + side * 25, mid(3), 1)
					.tube(0, 0, 0, 0, 0, 30, 2.2, "#41484b")
					.cone(0, 0, 30, -side * 8, 0, 42, 2.2, "#a78f60");
			}
			p.at(mid(5), mid(1), 0).box(0, 0, 2, 25, 25, 4, "#82734e");
		}
		for (const a of this.actors.values()) {
			appendCreature(
				p,
				a.actor,
				a.kind,
				t,
				a.combo?.state || a.atk.state,
				a.model.phase || 1,
				Math.min(1, a.dead),
			);
			const intent = s?.combat?.intents?.[a.model.id];
			if (intent && !a.dead) {
				const c = intent.channel === "spirit" ? COLORS.spirit : COLORS.war,
					zz = a.kind === "scorpion" ? 25 : a.kind === "minotaur" ? 49 : 34;
				p.at(a.actor.x, a.actor.y, zz).ball(0, 0, 0, 0.65, 0.65, 0.65, c);
				w.arc(a.actor.x, a.actor.y, 0.2, 8, 9, 0, PI * 2, c, 0.4);
				if (/charge|wind|heavy/.test(intent.kind || ""))
					w.arc(a.actor.x, a.actor.y, 0.25, 10, 11, 0, PI * 2, "#ecc86d", 0.5);
			}
		}
		for (const f of this.fx) {
			const u = f.t / f.life,
				c = f.channel === "spirit" ? COLORS.spirit : COLORS.war;
			if (f.type === "bolt") {
				const v = clamp(u * 2.8, 0, 1),
					a = f.from,
					b = f.to,
					xx = a.x + (b.x - a.x) * v,
					yy = a.y + (b.y - a.y) * v,
					zz = a.z + (b.z - a.z) * v;
				if (v < 1)
					w.glow(xx, yy, zz, f.channel === "spirit" ? 1.3 : 0.35, c, {
						light: f.channel === "spirit",
					});
				else
					for (let i = 0; i < 7; i++) {
						const ang = (i / 7) * PI * 2,
							r = (u - 0.35) * 10;
						p.at().ball(
							b.x + Math.cos(ang) * r,
							b.y + Math.sin(ang) * r,
							b.z + Math.sin(ang * 3) * (u - 0.35) * 8,
							Math.max(0.1, 1 - u),
							Math.max(0.1, 1 - u),
							Math.max(0.1, 1 - u),
							c,
						);
					}
			} else if (f.type === "transition" && !settings.reducedMotion) {
				const fade = Math.sin(u * PI);
				for (let i = 0; i < 10; i++) {
					const a = (i / 10) * PI * 2;
					p.at(this.camera.x, this.camera.y, EYE, this.camera.yaw).glow(
						12 + u * 18,
						Math.cos(a) * (9 + u * 10),
						Math.sin(a) * (6 + u * 7),
						fade * 0.7,
						c,
					);
				}
			} else if (f.type === "hit") {
				for (const sd of [-1, 1])
					w.overlay.pen.at().glow(16, sd * 13, -2, Math.max(0.1, 1 - u), c);
			} else if (f.type === "burst") {
				for (let i = 0; i < 12; i++) {
					const a = i * 2.399;
					w.glow(
						f.to.x + Math.cos(a) * u * 12,
						f.to.y + Math.sin(a) * u * 12,
						f.to.z + u * 10 * Math.sin(a * 2),
						Math.max(0.1, (1 - u) * 1.3),
						c,
					);
				}
			}
		}
		if (s) {
			const me = this._player();
			if (me)
				for (const e of entityList(s).filter(
					(e) => e.floor === s.floor && e.type === "secret" && !e.open,
				)) {
					if (Math.abs(e.x - me.x) + Math.abs(e.y - me.y) > 3) continue;
					const dx = me.x - e.x,
						dy = me.y - e.y,
						d = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy > 0 ? 2 : 0;
					const sight = me.sightMoves > 0 || settings.debugGeometry,
						c = sight ? "#99dff1" : "#507581";
					p.at(
						mid(e.x) + DX[d] * 16.05,
						mid(e.y) + DY[d] * 16.05,
						0,
						(d * PI) / 2,
					)
						.tube(-2, 0.1, 12, 1, 0.1, 21, sight ? 0.24 : 0.12, c)
						.tube(1, 0.1, 21, -1, 0.1, 29, sight ? 0.24 : 0.12, c);
					if (sight)
						p.tube(-11, 0.15, 4, -11, 0.15, 38, 0.3, c)
							.tube(11, 0.15, 4, 11, 0.15, 38, 0.3, c)
							.tube(-11, 0.15, 38, 11, 0.15, 38, 0.3, c);
				}
		}
		if (settings.debugGeometry && s) {
			for (const e of entityList(s).filter((e) => e.floor === s.floor))
				w.arc(
					mid(e.x),
					mid(e.y),
					0.4,
					13,
					13.4,
					0,
					PI * 2,
					e.type === "secret" ? "#f1b4f5" : "#b3debd",
					0.5,
				);
		}
		if (s) this._drawHands(w.overlay.pen, s, this._player(), settings);
	}
	_drawHands(p, s, player, settings) {
		if (!player || player.down) return;
		const t = this.time,
			A = this.handAction,
			u = A ? clamp(A.t / 0.8, 0, 1) : 0;
		const recoil = A?.type === "attack" ? Math.sin(u * PI * 2) * 1.4 : 0,
			guard = A?.type === "guard" ? Math.sin(u * PI) * 4 : 0;
		const swap = this.handSwap ? Math.sin((this.handSwap / 0.6) * PI) * 5 : 0,
			bob =
				!settings.reducedMotion && this.moveTween ? Math.sin(t * 12) * 0.22 : 0;
		const actionChannel = A?.channel || "war";
		const defs = (this.options.getContent?.() || s.content || CONTENT).items;
		for (const hand of [0, 1]) {
			const sign = hand ? 1 : -1,
				itemId = player.hands?.[hand],
				instance = s.items?.[itemId],
				kind = instance?.kind || "",
				def = defs[kind] || {};
			const raise = guard + (hand === 1 ? recoil : 0),
				y = sign * (10.5 + swap * 0.3),
				z = -10 + bob + raise * 0.4 - swap;
			p.at(
				17 + (hand === 1 ? recoil : 0),
				y,
				z,
				0,
				0.82,
				0,
				hand === 1 ? -recoil * 0.05 : 0,
			);
			p.tube(-5, sign * 2, -5, 0, 0, 0, 1.35, "#405349")
				.ball(0, 0, 0, 1.55, 1.3, 1.1, "#a88a63")
				.box(-2.7, sign * 0.8, -2.7, 2.5, 3, 2, "#5d6c60");
			if (/shield/i.test(kind)) {
				p.at(18, y, -8.5 + guard * 0.7 - swap, 0, 0.8, 0, sign * -0.12)
					.box(0, 0, 0, 1.1, 8, 11, "#4d6860")
					.box(-0.7, 0, 0, 0.3, 6, 9, "#869a7c")
					.tube(-1, -3, 0, -1, 3, 0, 0.32, "#cbb579")
					.tube(-1, 0, -4, -1, 0, 4, 0.35, "#cbb579")
					.ball(-1.1, 0, 0, 0.6, 1.1, 1.1, "#c9b477");
			} else if (def.ammo || kind === "bow") {
				p.at(18, y, -7.7 - swap, 0, 0.74, 0, recoil * 0.06);
				const draw = A?.type === "attack" ? Math.sin(u * PI) * 2.5 : 0;
				p.tube(0, 0, -9, 3, 0, -5, 0.55, "#a38148")
					.tube(3, 0, -5, 4, 0, 1, 0.6, "#b99456")
					.tube(4, 0, 1, 2, 0, 7, 0.55, "#b99456")
					.tube(2, 0, 7, -1, 0, 10, 0.45, "#96723d")
					.tube(0, 0, -9, -draw, 0, 0, 0.08, "#dacda5")
					.tube(-draw, 0, 0, -1, 0, 10, 0.08, "#dacda5");
				if (player.arrows > 0)
					p.tube(-3 - draw, 0, 0, 11, 0, 0, 0.12, "#d0b47f").cone(
						11,
						0,
						0,
						13,
						0,
						0,
						0.45,
						"#a1acaa",
					);
			} else if (def.channel === "spirit" || /rune/i.test(kind)) {
				p.tube(0, 0, -2, 2, 0, 6, 0.55, "#91794c")
					.ball(2, 0, 8, 1.6, 1.3, 2.4, "#66afc1")
					.tube(2, -1.3, 8, 2, 1.3, 8, 0.25, "#e1c890")
					.glow(2, 0, 8, 0.35 + Math.sin(t * 2) * 0.08, "#8ed9ed");
				if (A?.type === "attack" && actionChannel === "spirit" && u < 0.7)
					p.glow(4 + u * 8, 0, 9, Math.sin((u / 0.7) * PI) * 1.2, "#91e5ed");
			} else if (def.channel === "war" || /blade|throwing/i.test(kind)) {
				p.at(18, y, -7 + recoil - swap, 0, 0.8, 0, -0.18 - recoil * 0.1)
					.tube(-1, 0, -3, 1, 0, 2, 0.6, "#645741")
					.tube(1, -2.2, 2, 1, 2.2, 2, 0.4, "#c4a46c")
					.bar(1, 0, 3, 6, 0, 15, 2, 0.4, "#bcc6b8")
					.cone(6, 0, 15, 7, 0, 17, 1, "#d5ddcd");
			} else if (def.family === "book" || kind === "scroll") {
				p.box(2, 0, 2, 6, 5, 1, "#dfd2a6").box(
					2,
					0,
					1.2,
					6.6,
					5.5,
					0.5,
					"#4f7a8b",
				);
			} else if (kind) {
				p.ball(
					2,
					0,
					3,
					1.5,
					1.5,
					2,
					def.family === "potion" ? "#9cc3bd" : "#c5ab70",
				).tube(2, 0, 4, 2, 0, 6, 0.65, "#ddd0b3");
			} else if (
				hand === 1 &&
				player.basicSpirit &&
				A?.type === "attack" &&
				actionChannel === "spirit"
			)
				p.glow(3, 0, 3, Math.sin(u * PI) * 1.3, "#9ae5f2");
		}
	}
	draw(r) {
		if (this.ready && this.world) this.world.draw(r);
	}
	dispose() {
		if (this.world) this.world.dispose();
		this.world = null;
		this.ready = false;
		this.actors.clear();
		this.things.clear();
	}
	snapshot() {
		return {
			ready: this.ready,
			renderer: this.rendererName,
			floor: this.floor?.name,
			actors: this.actors.size,
			things: this.things.size,
			camera: { ...this.camera },
			effects: this.fx.length,
			native: true,
		};
	}
}
