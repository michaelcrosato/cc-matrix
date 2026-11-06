import { U, HOME, STATIONS } from "../../content/operation.js";
import { PALETTE as C, BOMBER, CREW } from "../../content/art.js";
import { clamp, random, local, dist } from "../core/math.js";
const E = globalThis.My3D2dge;

export class FlightView {
	constructor(game, getState, getContext) {
		this.game = game;
		this.getState = getState;
		this.getContext = getContext;
		this.world = new E.World3D(game, {
			terrain: {
				size: 524288,
				cell: 1536,
				chunk: 16,
				height: terrainHeight,
				color: terrainColor,
				far: 120000,
				physics: 0,
				detail: 1.3,
				speckle: 0.025,
			},
			sky: {
				top: "#6a9ca8",
				horizon: "#e8d7b0",
				ground: "#448694",
				sun: "#fff0ba",
				haze: 0.24,
			},
			fog: { color: "#acc2b9", near: 75000, far: 190000 },
			ambient: ["#d7dfcd", "#6c8784", 2.2],
			sun: {
				color: "#ffe5a8",
				intensity: 2.6,
				dir: [-0.45, 0.3, -0.6],
				area: 20000,
				shadow: true,
			},
			camera: {
				mode: "fixed",
				near: 1.5,
				far: 260000,
				fov: 67,
				mouseLook: false,
			},
			overlay: { fov: 67 },
			torchLights: 0,
			glowLights: 8,
			shadows: true,
			outlines: true,
			res: "balanced",
			filter: { look: "clean", bloom: 0, fxaa: false },
			onDraw: (w, r) => this.drawGeometry(w, r),
		});
		this.world.addCamera({
			mode: "fixed",
			near: 1.5,
			far: 260000,
			fov: 67,
			mouseLook: false,
		});
		this.rigs = CREW.map(
			(c) =>
				new E.Humanoid({
					hat: { style: "helmet", color: "#777553" },
					hair: "short",
					weapon: null,
					outfit: "coat",
					sleeves: "long",
					colors: {
						cloth: c.cloth,
						coat: c.cloth,
						skin: c.skin,
						hair: c.hair,
						trim: C.brass,
						pants: "#434838",
						glove: "#a8865b",
					},
				}),
		);
		const rng = random(1939);
		this.clouds = Array.from({ length: 65 }, (_, i) => ({
			x: (1000 + rng() * 26000) * U,
			y: (2500 + rng() * 20000) * U,
			z: (1500 + rng() * 1400) * U,
			k: (300 + rng() * 600) * U,
			n: i,
		}));
		const cloudGeometry = new E.THREE.SphereGeometry(1, 7, 4),
			cloudMaterial = new E.THREE.MeshLambertNodeMaterial({
				color: "#d8dfce",
				flatShading: true,
			});
		for (const cloud of this.clouds) {
			cloud.meshes = [];
			for (let j = 0; j < 4; j++) {
				const mesh = new E.THREE.Mesh(cloudGeometry, cloudMaterial);
				mesh.position.copy(
					E.World3D.toThree(
						cloud.x + j * cloud.k * 0.65,
						cloud.y + (j % 2) * cloud.k * 0.3,
						cloud.z + (j % 2) * cloud.k * 0.08,
					),
				);
				mesh.scale.set(
					cloud.k / U,
					(cloud.k * (0.13 + j * 0.02)) / U,
					(cloud.k * 0.65) / U,
				);
				this.world.scene.add(mesh);
				cloud.meshes.push(mesh);
			}
		}
		this.props = Array.from({ length: 130 }, () => ({
			x: (17000 + rng() * 10000) * U,
			y: (3000 + rng() * 18000) * U,
			k: 20 + rng() * 60,
			c: rng() > 0.6 ? "#707b55" : "#8e9367",
		}));
		this.light = this.world.light({ color: "#ffae53", reach: 6000, power: 10 });
	}
	step(dt) {
		for (let i = 0; i < this.rigs.length; i++)
			this.rigs[i].update(dt, {
				x: 0,
				y: 0,
				facing: -0.4,
				expr: this.getState().aircraft.hurt ? "wince" : "smile",
				pose: null,
			});
		this.world.step(dt);
	}
	cameraPose(p, context) {
		const s = this.getState(),
			a = s.aircraft,
			t = this.game.real;
		if (s.cheats.freeCamera) {
			if (!this.freePose)
				this.freePose = {
					...local(a, -80 * U, -35 * U, 30 * U),
					yaw: a.heading + 0.35,
					pitch: -0.2,
					roll: 0,
					fov: 65,
				};
			return this.freePose;
		}
		if (
			context.exterior ||
			context.title ||
			s.phase === "recovery" ||
			s.cheats.freeCamera
		) {
			const ang = context.title ? -0.8 + Math.sin(t * 0.1) * 0.15 : -2.45;
			const range = context.title ? 60 : 65;
			const v = local(
				a,
				Math.cos(ang) * range * U,
				Math.sin(ang) * range * U,
				(context.title ? 20 : 22) * U,
			);
			const yaw = Math.atan2(a.y - v.y, a.x - v.x),
				pitch = Math.atan2(a.z - v.z, Math.hypot(a.x - v.x, a.y - v.y));
			return {
				...v,
				yaw: yaw - (context.title ? 0.25 : 0),
				pitch,
				roll: 0,
				fov: context.title ? 46 : 58,
			};
		}
		const station = STATIONS.find((st) => st.id === p?.station) || STATIONS[0];
		const pos = local(a, ...station.offset.map((x) => x * U));
		const shake = this.game.settings.motion
			? 0
			: (this.game.settings.shake || 0) * a.hurt * 0.018;
		return {
			...pos,
			yaw: a.heading + station.angle + (p.aimYaw || 0),
			pitch: station.id === "bombs" ? -1.12 + p.aimPitch : a.pitch + p.aimPitch,
			roll: a.bank + Math.sin(t * 40) * shake,
			fov: p.input?.fine ? (station.id === "bombs" ? 43 : 46) : 67,
		};
	}
	drawGeometry(w, r) {
		const s = this.getState(),
			a = s.aircraft,
			context = this.getContext(r.viewport?.i || 0),
			p = context.player || s.players[0];
		const pose = this.cameraPose(p, context);
		w.camera.pose = pose;
		w.camera.fixed = pose;
		w.camera.target = a;
		const pen = w.pen,
			t = s.time;
		this.drawHarbor(pen, s);
		this.drawAirfield(pen, t);
		for (const pr of this.props) {
			if (dist(pr, a) > 8500 * U) continue;
			const z = terrainHeight(pr.x, pr.y);
			pen
				.at(pr.x, pr.y, z, 0, U)
				.box(0, 0, 5, pr.k, pr.k * 0.65, 10, pr.c)
				.box(0, 0, 12, pr.k + 3, pr.k * 0.7, 5, "#596a56");
			for (let j = 0; j < 4; j++)
				pen.ball((j - 2) * 40, pr.k + 35, 12, 12, 12, 20, "#536c4b");
		}
		// Narrow pale swells catch the light across the Channel.
		pen.at();
		for (let i = 0; i < 95; i++) {
			const x = (5500 + ((i * 941) % 8800)) * U,
				y = (2500 + ((i * 2309) % 18000)) * U;
			pen.box(
				x,
				y + Math.sin(t * 0.13 + i) * 10 * U,
				1,
				(70 + (i % 4) * 40) * U,
				2.2 * U,
				1,
				"#5a9398",
			);
		}
		const exterior =
			context.title ||
			context.exterior ||
			s.phase === "recovery" ||
			s.cheats.freeCamera;
		this.bomber(pen, a, t, exterior, p?.station);
		for (const e of s.enemies)
			if (e.alive && e.age >= 0) this.fighter(pen, e, t);
		pen.at();
		for (const b of s.bombs)
			pen
				.at(b.x, b.y, b.z, a.heading, U, -Math.atan2(-b.vz, a.speed))
				.ball(0, 0, 0, 1.5, 0.35, 0.35, "#393e36")
				.box(-1.2, 0, 0, 0.7, 0.9, 0.15, "#676c51");
		pen.at();
		for (const shot of s.shots) {
			const k = 0.022;
			pen.tube(
				shot.x,
				shot.y,
				shot.z,
				shot.x - shot.vx * k,
				shot.y - shot.vy * k,
				shot.z - shot.vz * k,
				0.25 * U,
				"#ffce72",
			);
		}
		for (const f of s.flak)
			if (!f.burst) {
				const k = 1 - f.time / f.total,
					color = k > 0.65 ? "#d79255" : "#aabf9f";
				for (let j = 0; j < 12; j++) {
					const v = (j * Math.PI) / 6,
						v2 = v + 0.23,
						rr = f.r * (1 - 0.2 * k);
					pen.tube(
						f.x + Math.cos(v) * rr,
						f.y + Math.sin(v) * rr,
						f.z,
						f.x + Math.cos(v2) * rr,
						f.y + Math.sin(v2) * rr,
						f.z,
						1.6 * U,
						color,
					);
				}
			}
		for (const fx of s.effects) {
			const age = fx.total - fx.life,
				k = fx.size;
			if (fx.kind === "flak") {
				for (let i = 0; i < 9; i++)
					pen.ball(
						fx.x + Math.sin(i * 8) * k * 0.7,
						fx.y + Math.cos(i * 6) * k * 0.7,
						fx.z + Math.sin(i * 4) * k * 0.45,
						k * (0.3 + age * 0.035),
						k * 0.4,
						k * 0.4,
						i % 3 ? "#414a49" : "#676a60",
					);
			} else {
				const persistent = fx.kind === "fire",
					life = persistent ? 0.8 : clamp(fx.life / fx.total, 0, 1);
				for (let i = 0; i < 7; i++) {
					const bob = (t * 0.12 + i * 0.15) % 1,
						radius = k * (0.3 + bob * 0.7);
					pen.ball(
						fx.x + Math.sin(i * 5) * k * 0.3,
						fx.y + Math.cos(i * 7) * k * 0.3,
						fx.z + k * bob * 4,
						radius,
						radius,
						radius * 1.3,
						bob < 0.25 ? "#d68345" : bob < 0.45 ? "#a3986e" : "#535b52",
					);
				}
				if (life > 0.5)
					pen.glow(fx.x, fx.y, fx.z + 15 * U, k * 0.5 * life, "#ffb34f");
			}
		}
		if (s.cheats.debug) this.debugDraw(w, s);
		this.light.x = a.x;
		this.light.y = a.y;
		this.light.z = a.z;
		this.light.on = a.hurt > 0.1;
		w.overlay.on = !exterior;
		if (w.overlay.on) this.interior(w.overlay.pen, p, a, s, r);
		pen.at();
	}
	bomber(pen, a, t, full = true, station = "pilot") {
		pen.at(a.x, a.y, a.z, a.heading, U, a.pitch, a.bank);
		if (full) {
			pen
				.ball(0, 0, 0, 12.5, 1.8, 1.9, C.olive)
				.ball(10.3, 0, 0.3, 3, 1.6, 1.65, C.glass);
			pen
				.box(5.7, 0, 1.55, 4.6, 2.9, 1.4, C.glass)
				.box(5, 0, 2.35, 0.2, 3.2, 0.22, C.oliveDark);
			pen
				.tube(7.8, 0, 1.5, 5.5, 0, 2.4, 0.12, C.frame)
				.tube(5.5, -1.5, 2.3, 5.5, 1.5, 2.3, 0.12, C.frame);
			pen
				.box(-10.5, 0, 2.5, 4, 0.3, 5, C.oliveLight)
				.slab(-9, -6.2, 0.2, -9, 6.2, 0.2, 1, 0, 0, 4, 0.25, C.oliveLight);
			pen
				.ball(-2.5, 0, 2, 1.1, 1.1, 0.9, C.glass)
				.tube(-2, 0, 2.4, 1, 0, 2.4, 0.12, "#373b34");
			pen.box(-1.7, 0, -1.65, 6, 1.4, 0.15, "#252e2b");
			for (const side of [-1, 1])
				pen
					.at(a.x, a.y, a.z, a.heading, U, a.pitch, a.bank)
					.slab(
						-4,
						side * (1 + a.doors * 1.2),
						-1.5 - a.doors * 0.5,
						2,
						side * (1 + a.doors * 1.2),
						-1.5 - a.doors * 0.5,
						0,
						side * Math.cos(a.doors),
						-Math.sin(a.doors),
						1.3,
						0.1,
						C.oliveDark,
					);
		}
		pen.at(a.x, a.y, a.z, a.heading, U, a.pitch, a.bank);
		if (full || station !== "tail") {
			pen
				.slab(-0.5, -18, 0, -0.5, 18, 0, 1, 0, 0, 5.7, 0.3, C.olive)
				.slab(
					-2.7,
					-16,
					0.05,
					-2.7,
					16,
					0.05,
					1,
					0,
					0,
					0.7,
					0.15,
					C.oliveLight,
				);
			for (const side of [-1, 1]) {
				const at = local(a, -3 * U, side * 13 * U, 0.12 * U);
				pen
					.at(
						at.x,
						at.y,
						at.z,
						a.heading,
						U,
						a.pitch + side * a.bank * 0.25,
						a.bank,
					)
					.box(0, 0, 0, 1.1, 6, 0.12, C.oliveDark);
			}
			pen.at(a.x, a.y, a.z, a.heading, U, a.pitch, a.bank);
			for (let i = 0; i < 4; i++) {
				const y = BOMBER.engineY[i],
					h = a.engines[i];
				pen
					.ball(
						1.4,
						y,
						-0.15,
						3.1,
						1.03,
						1.02,
						h < 0.5 ? "#464a3a" : C.oliveDark,
					)
					.ball(4.1, y, -0.1, 0.5, 0.9, 0.9, "#89866b");
				const r = t * (20 + a.throttle * 44) * h + i;
				for (let j = 0; j < 3; j++) {
					const v = r + (j * Math.PI * 2) / 3;
					pen.tube(
						4.55,
						y,
						-0.1,
						4.55,
						y + Math.sin(v) * 2.2,
						-0.1 + Math.cos(v) * 2.2,
						0.13,
						h < 0.2 ? "#3c433a" : "#aaa28a",
					);
				}
				if (h < 0.65)
					for (let j = 0; j < 4; j++)
						pen.ball(
							-j * 4 - 1,
							y,
							0.2 + j * 0.7,
							1.2 + j * 0.7,
							0.8 + j * 0.5,
							0.8 + j * 0.5,
							a.fire === i && j < 2 ? "#d78446" : "#51574d",
						);
			}
			for (const side of [-1, 1]) {
				pen
					.ball(-0.4, side * 14, 0.2, 1.5, 1.5, 0.02, "#c9c9ab")
					.box(-0.4, side * 14, 0.25, 1.8, 0.3, 0.02, C.oliveDark);
			}
		}
		if (full && a.gear > 0)
			for (const y of [-5.5, 5.5])
				pen
					.tube(0.4, y, -1, 0.4, y, -1 - a.gear * 3.1, 0.15, "#686757")
					.ball(0.4, y, -1 - a.gear * 3.1, 0.75, 0.4, 0.75, "#292f2b");
		pen.at();
	}
	fighter(pen, e, t) {
		pen.at(e.x, e.y, e.z, e.heading, U, 0, e.bank);
		pen
			.ball(0, 0, 0, 5.5, 0.8, 0.8, "#655e50")
			.slab(-0.3, -6, -0.1, -0.3, 6, -0.1, 1, 0, 0, 2, 0.18, "#9b8c6d");
		pen
			.box(-4.4, 0, 1, 1.9, 0.15, 2, "#725f4a")
			.box(-4, 0, 0.1, 2, 4.5, 0.15, "#776a51")
			.ball(1, 0, 0.8, 1.6, 0.6, 0.65, "#8bada4");
		const v = t * 47;
		pen.tube(
			5.3,
			Math.cos(v) * 1.5,
			Math.sin(v) * 1.5,
			5.3,
			-Math.cos(v) * 1.5,
			-Math.sin(v) * 1.5,
			0.12,
			"#d4b995",
		);
		if (e.state === "firing" && Math.floor(t * 12) % 3)
			pen.glow(2, -0.8, 0, 0.5, "#ffb45c").glow(2, 0.8, 0, 0.5, "#ffb45c");
		pen.at();
	}
	interior(pen, p, a, s) {
		pen.at(0, 0, 0, 0, U);
		if (!p || p.station === "pilot") {
			pen
				.box(3.3, 0, -1.8, 1.8, 7, 1.3, "#3c493d")
				.box(3.5, 0, -1.05, 1.6, 7, 0.12, "#77785a");
			for (const y of [-3.3, 0, 3.3])
				pen.bar(5.5, y, -1.3, 5.5, y * 0.75, 2.2, 0.13, 0.18, "#35463c");
			pen
				.tube(5.5, -2.5, 2.1, 5.5, 2.5, 2.1, 0.13, "#778068")
				.tube(5.5, -3.3, -1.3, 5.5, 3.3, -1.3, 0.12, "#848463");
			for (const y of [-2.7, 2.7])
				for (let z = -0.8; z < 1.8; z += 0.5)
					pen.ball(5.45, y, z, 0.1, 0.06, 0.06, "#b4a578");
			pen
				.tube(1.5, -0.6, -1.5, 2.6, -0.6, -0.8, 0.08, "#232f2a")
				.bar(2.6, -1.1, -0.8, 2.6, -0.1, -0.8, 0.12, 0.12, "#a98d5e");
		} else if (p.station === "bombs") {
			pen
				.box(3.5, -3.4, 0, 3.5, 0.2, 6.5, "#3a4940")
				.box(3.5, 3.4, 0, 3.5, 0.2, 6.5, "#3a4940");
			pen
				.bar(4, -3.4, 2.7, 4, 3.4, 2.7, 0.2, 0.2, "#65735d")
				.bar(4, -3.4, -2.7, 4, 3.4, -2.7, 0.2, 0.2, "#65735d");
		} else {
			const recoil = s.guns[p.station]?.recoil || 0;
			for (const side of [-1, 1]) {
				pen
					.tube(
						1.2 + recoil * 0.12,
						side * 0.36,
						-0.65,
						5.3,
						side * 0.36,
						-0.4,
						0.1,
						"#2a3431",
					)
					.tube(
						2.9,
						side * 0.36,
						-0.55,
						4.6,
						side * 0.36,
						-0.45,
						0.14,
						"#72735c",
					);
				pen.box(1.1, side * 0.36, -0.8, 1.3, 0.32, 0.5, "#3a443b");
				for (let x = 3.4; x < 4.6; x += 0.25)
					pen.ball(x, side * 0.36 - 0.07, -0.54, 0.05, 0.06, 0.05, "#29332e");
				if (recoil > 0.4)
					pen.glow(5.3, side * 0.36, -0.4, 0.15 + recoil * 0.12, "#ffcc6a");
			}
			if (p.station === "nose" || p.station === "tail")
				for (const y of [-3.4, 3.4])
					pen.bar(5, y, -2.2, 5, y * 0.65, 2.5, 0.12, 0.16, "#52634f");
			else {
				const side = p.station === "port" ? 1 : -1;
				pen
					.box(2, side * 3.3, 0, 5, 0.3, 6, "#435441")
					.box(2, 0, -2, 4, 8, 0.3, "#435441");
			}
		}
		pen.at();
	}
	drawHarbor(pen, s) {
		for (const target of s.targets) {
			pen.at(target.x, target.y, 2 * U, 0, U);
			if (target.kind === "harbor") {
				pen
					.box(120, 0, 4, 500, 720, 8, "#99917a")
					.box(-90, -280, 3, 500, 80, 6, "#8d8b76")
					.box(-90, 280, 3, 500, 80, 6, "#8d8b76");
				for (let i = 0; i < 5; i++) {
					const y = -230 + i * 115;
					pen
						.box(-8, y, 45, 8, 8, 90, "#777a61")
						.tube(-8, y, 85, -90, y, 100, 2, "#b7a570")
						.tube(-8, y, 85, 40, y, 85, 2, "#b7a570")
						.tube(-90, y, 100, -90, y, 30, 0.5, "#414f47");
					pen
						.box(270, y, 14, 70, 55, 28, "#737d68")
						.box(270, y, 30, 78, 62, 5, "#b1a27c");
					pen
						.box(65, y + 35, 7, 18, 15, 14, "#a58250")
						.box(90, y + 35, 7, 18, 15, 14, "#637b73");
				}
				for (let i = 0; i < 12; i++)
					pen.box(160 + i * 15, -340, 7, 7, 3, 5, "#dbc7a2");
			}
			pen.at();
			for (const part of target.parts) {
				pen.at(part.x, part.y, part.z, 0, U);
				if (part.dead) {
					pen.box(0, 0, 3, 95, 65, 6, "#454f42");
					for (let i = 0; i < 6; i++)
						pen.box(
							i * 13 - 35,
							(i % 2) * 15,
							8,
							14,
							17,
							16 - i * 1.5,
							"#666958",
						);
					continue;
				}
				if (part.kind === "ship") {
					pen
						.ball(0, 0, 4, 100, 15, 14, "#596c69")
						.box(-10, 0, 16, 142, 22, 8, "#818875")
						.box(10, 0, 25, 38, 17, 18, "#aaa18b")
						.box(-15, 0, 36, 14, 9, 24, "#545b50");
					pen
						.tube(30, 0, 24, 30, 0, 67, 1, "#646d5b")
						.tube(30, -15, 54, 30, 15, 54, 0.6, "#8d9679");
					for (const x of [-65, 62])
						pen
							.ball(x, 0, 23, 10, 9, 5, "#727c69")
							.tube(x, 0, 26, x + 18, 0, 27, 1, "#454f44");
				} else if (part.kind === "warehouse") {
					pen
						.box(0, 0, 17, 115, 85, 34, "#a69473")
						.box(0, 0, 37, 125, 90, 8, "#667565");
					for (let i = 0; i < 5; i++)
						pen.box(-45 + i * 22, -43, 20, 10, 2, 12, "#365257");
					pen.box(30, 0, 55, 8, 9, 38, "#7e7460");
				} else if (part.kind === "tanks") {
					for (let i = 0; i < 4; i++)
						pen
							.ball(
								((i % 2) - 0.5) * 48,
								(Math.floor(i / 2) - 0.5) * 48,
								18,
								22,
								22,
								24,
								"#adb098",
							)
							.box(
								((i % 2) - 0.5) * 48,
								(Math.floor(i / 2) - 0.5) * 48,
								2,
								49,
								49,
								4,
								"#7a846d",
							);
					pen.tube(-45, 0, 5, 60, 0, 5, 2, "#6a7e6a");
				} else {
					pen.box(0, 0, 3, 150, 150, 6, "#8c9477");
					for (let i = 0; i < 3; i++)
						pen
							.box(i * 48 - 48, (i % 2) * 30, 10, 28, 28, 16, "#586750")
							.tube(
								i * 48 - 48,
								(i % 2) * 30,
								18,
								i * 48 - 25,
								(i % 2) * 30,
								38,
								2,
								"#3e5145",
							);
				}
			}
		}
		pen.at();
	}
	drawAirfield(pen, t) {
		pen.at(HOME.x, HOME.y, HOME.z + 0.35 * U, 0, U);
		pen.box(500, 0, -1, 2100, 66, 2, "#818779");
		for (let i = -3; i < 13; i++)
			pen.box(i * 110, 0, 0.2, 42, 2, 0.2, "#ddcfac");
		for (const y of [-37, 37])
			for (let i = -3; i < 14; i++)
				pen.ball(i * 110, y, 0.5, 1, 1, 1, "#e1b974");
		for (let i = 0; i < 4; i++)
			pen
				.ball(i * 180 + 50, -180, 12, 60, 50, 38, "#64755d")
				.box(i * 180 + 50, -130, 15, 65, 3, 30, "#394f43");
		pen
			.box(-150, -140, 26, 28, 30, 52, "#8e9174")
			.box(-150, -140, 58, 36, 36, 12, "#6f9185")
			.tube(-150, -140, 64, -150, -140, 98, 0.6, "#656c54");
		pen
			.tube(100, 100, 0, 100, 100, 30, 0.6, "#c4ae78")
			.box(110, 100, 29, 20, 4, 3, "#cf986b");
		pen.at();
	}
	debugDraw(w, s) {
		for (const e of s.enemies)
			if (e.alive) {
				w.glow(e.x, e.y, e.z, e.r, "#bb5544");
				w.pen
					.at()
					.tube(
						e.x,
						e.y,
						e.z,
						s.aircraft.x,
						s.aircraft.y,
						s.aircraft.z,
						1.3 * U,
						"#db9a6f",
					);
			}
		for (const q of s.route)
			w.arc(q.x, q.y, 10, 200 * U, 210 * U, 0, Math.PI * 2, "#f1da91", 0.4);
		for (const wave of s.operation.waves)
			if (wave.minX)
				w.arc(
					wave.minX,
					12000 * U,
					9 * U,
					680 * U,
					700 * U,
					0,
					Math.PI * 2,
					"#8fc6b0",
					0.3,
				);
	}
	freeMove(mx, my, yaw, pitch, vertical, dt) {
		const p = this.freePose;
		if (!p) return;
		p.yaw += yaw * dt;
		p.pitch = clamp(p.pitch + pitch * dt, -1.4, 1.4);
		const speed = 220 * U * dt;
		p.x += (Math.cos(p.yaw) * -my - Math.sin(p.yaw) * mx) * speed;
		p.y += (Math.sin(p.yaw) * -my + Math.cos(p.yaw) * mx) * speed;
		p.z = Math.max(20 * U, p.z + vertical * speed);
	}
	draw(r) {
		this.world.draw(r);
	}
}

function coastX(y, east) {
	return (
		(east ? 15300 : 5400) * U +
		Math.sin(y / (1300 * U)) * 250 * U +
		Math.sin(y / (3500 * U)) * 450 * U
	);
}
export function terrainHeight(x, y) {
	const west = coastX(y, false),
		east = coastX(y, true);
	const home = Math.hypot(x - HOME.x, y - HOME.y);
	if (home < 2500 * U) return 8 * U;
	if (
		x > 14800 * U &&
		x < 23520 * U &&
		Math.abs(y - 12000 * U) < (850 - ((x / U - 15000) / 8500) * 450) * U
	)
		return 0;
	if (x > west && x < east) return 0;
	const edge = x < west ? west - x : x - east;
	const height =
		Math.min(1, edge / (400 * U)) *
		(12 + Math.sin(x / (1800 * U)) * 5 + Math.sin(y / (2100 * U)) * 4) *
		U;
	return Math.max(0, height);
}
function terrainColor(x, y, z, nz, out) {
	if (z < 1) {
		const v = Math.sin(x / 4000) * 3 + Math.sin(y / 3000) * 2;
		out[0] = 45 + v;
		out[1] = 109 + v;
		out[2] = 125 + v;
	} else if (z < 5 * U) {
		out[0] = 186;
		out[1] = 175;
		out[2] = 134;
	} else {
		const n =
			Math.sin(Math.floor(x / 3500) * 3.2 + Math.floor(y / 2700) * 2.3) * 15;
		out[0] = 125 + n;
		out[1] = 143 + n;
		out[2] = 98 + n * 0.7;
	}
	return out;
}
