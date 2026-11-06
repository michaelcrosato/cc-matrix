/** Native my-3D2dge World3D presentation. Simulation coordinates are never mutated. */
import { MISSION } from "../content/mission.js";

const TAU = Math.PI * 2,
	ORIGIN = { x: 131072, y: 262144 };
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const C = {
	olive: "#65765a",
	oliveLight: "#82916b",
	oliveDark: "#3e5149",
	metal: "#a9b4aa",
	ink: "#182d32",
	sea: "#23536a",
	foam: "#93b9bb",
	glass: "#a0c6c6",
	amber: "#ecc276",
	gold: "#c8a46b",
	cloud: "#d7dfd8",
	cream: "#f4edce",
	danger: "#e2774e",
	red: "#9a4436",
};
function terrainColor(x, y, _z, _nz, out) {
	x -= ORIGIN.x;
	y -= ORIGIN.y;
	const coast = 250000 + Math.sin(y / 19000) * 8200 + Math.sin(y / 6800) * 2700;
	const home = 38000 + Math.sin(y / 15000) * 5500;
	const inlet =
		x < 343700 &&
		x > 241000 &&
		Math.abs(y - 18000 - Math.sin(x / 17000) * 2000) <
			11500 + Math.max(0, 315000 - x) * 0.11;
	const land = x < home || (x > coast && !inlet);
	const h =
		(((Math.floor(x / 4300) * 31 + Math.floor(y / 3700) * 47) >>> 0) % 13) / 13;
	if (land) {
		const field = (Math.floor(x / 5100) + Math.floor(y / 4100) * 3) & 3;
		out[0] = 88 + field * 7 + h * 7;
		out[1] = 112 + field * 6 + h * 5;
		out[2] = 77 + field * 5;
		if (
			(x < home && x > home - 1900) ||
			(x > coast && x < coast + 1600 && !inlet)
		) {
			out[0] = 174;
			out[1] = 169;
			out[2] = 123;
		}
	} else {
		const wave = Math.sin((x + y * 0.21) / 2200) * 0.5 + 0.5;
		out[0] = 28 + wave * 8;
		out[1] = 77 + wave * 13;
		out[2] = 99 + wave * 16;
		if (inlet) {
			out[0] += 7;
			out[1] += 7;
		}
	}
	return out;
}
function installShapes(E) {
	if (E.SHAPES.cccHangar) return;
	const materials = {
		cccRoof: { color: "#5a6860", pattern: "metal", rivet: 0.1 },
		cccWall: { color: "#b2af90", pattern: "bricks", bw: 18, bh: 9 },
		cccSteel: { color: "#657b79", pattern: "metal" },
	};
	Object.assign(E.MATERIALS, materials);
	E.SHAPES.cccHangar = {
		about: "arched corrugated bomber hangar",
		tags: "airfield industrial military",
		mats: { r: "cccRoof", w: "cccWall", d: "#263c3d" },
		parts: [
			["box", "w", [0, 0, 0], [980, 700, 310]],
			[
				"prism",
				"r",
				[0, 0, 310],
				[
					[-490, 0],
					[-420, 150],
					[-250, 260],
					[0, 300],
					[250, 260],
					[420, 150],
					[490, 0],
				],
				740,
				{ axis: "y" },
			],
			["box", "d", [0, -352, 0], [800, 8, 290]],
			["row", 5, [180, 0, 0], ["box", "r", [0, -362, 0], [7, 12, 290]]],
		],
	};
	E.SHAPES.cccCrane = {
		about: "lattice harbor crane with suspended hook",
		tags: "harbor military industrial",
		mats: { a: "#d6b878", s: "cccSteel", b: "#354b4f" },
		parts: [
			["mirror", "xy", ["box", "s", [105, 105, 0], [35, 35, 920]]],
			["box", "s", [0, 0, 850], [310, 310, 100]],
			["box", "a", [0, 0, 960], [420, 300, 230]],
			["box", "b", [0, -157, 1010], [270, 10, 115]],
			["box", "a", [0, 460, 1180], [95, 1380, 75]],
			["box", "s", [0, -500, 1120], [250, 420, 130]],
			[
				"row",
				7,
				[0, 180, 0],
				["box", "s", [0, 450, 1260], [40, 14, 180], { rot: [0, 30, 0] }],
			],
			["cyl", "s", [0, 1060, 240], 12, 930],
			["box", "s", [0, 1060, 220], [120, 30, 50]],
		],
	};
	E.SHAPES.cccWarehouse = {
		about: "sawtooth shipyard workshop",
		tags: "industrial warehouse military",
		mats: { w: "cccWall", r: "cccRoof", g: "#729395" },
		parts: [
			["box", "w", [0, 0, 0], [1500, 850, 420]],
			[
				"prism",
				"r",
				[0, 0, 420],
				[
					[-750, 0],
					[0, 260],
					[750, 0],
				],
				900,
				{ axis: "y" },
			],
			["row", 7, [190, 0, 0], ["box", "g", [0, -429, 200], [120, 6, 110]]],
			["row", 3, [400, 0, 0], ["box", "r", [0, 432, 0], [260, 8, 290]]],
		],
	};
	E.SHAPES.cccCottage = {
		about: "low coastal farm dwelling",
		tags: "house scenery",
		mats: { w: "#c1b795", r: "#896f55" },
		parts: [
			["box", "w", [0, 0, 0], [240, 190, 140]],
			[
				"prism",
				"r",
				[0, 0, 140],
				[
					[-130, 0],
					[0, 100],
					[130, 0],
				],
				220,
				{ axis: "y" },
			],
			["box", "r", [65, -100, 0], [40, 8, 95]],
			["box", "r", [-55, -100, 50], [45, 8, 45]],
		],
	};
}
function transformLocal(a, x, y, z) {
	const cy = Math.cos(a.yaw || 0),
		sy = Math.sin(a.yaw || 0),
		cp = Math.cos(a.pitch || 0),
		sp = Math.sin(a.pitch || 0),
		cr = Math.cos(a.bank || 0),
		sr = Math.sin(a.bank || 0);
	const rx = -sy * cr + cy * sp * sr,
		ry = cy * cr + sy * sp * sr,
		rz = -cp * sr;
	const ux = -cy * sp * cr - sy * sr,
		uy = -sy * sp * cr + cy * sr,
		uz = cp * cr;
	return {
		x: a.x + cy * cp * x + rx * y + ux * z,
		y: a.y + sy * cp * x + ry * y + uy * z,
		z: a.z + sp * x + rz * y + uz * z,
	};
}
const defaults = () => ({
	x: 0,
	y: 0,
	z: 14400,
	yaw: 0,
	pitch: 0,
	bank: 0,
	speed: 1120,
	throttle: 0.76,
	hull: 100,
	engines: [1, 1, 1, 1],
	doors: 0,
	gear: 0,
});

export class BomberView {
	constructor(E, game) {
		this.E = E;
		this.game = game;
		this.world = null;
		this.state = null;
		this.players = [];
		this.options = {};
		this.views = [];
		this.freePose = null;
		this.render = true;
		this._lastTime = 0;
		this.clouds = Array.from({ length: 76 }, (_, i) => ({
			x: -40000 + ((i * 7919) % 500000),
			y: -120000 + ((i * 19067) % 270000),
			z: 21000 + ((i * 773) % 11500),
			k: 1600 + ((i * 317) % 2600),
			a: i * 2.399,
		}));
	}
	async init({ render = true } = {}) {
		this.render = render;
		const query =
			typeof location === "undefined"
				? null
				: new URLSearchParams(location.search).get("backend");
		await this.E.World3D.init(this.game, {
			render,
			backend: query === "webgpu" ? undefined : "webgl",
		});
		installShapes(this.E);
		this.world = new this.E.World3D(this.game, {
			terrain: {
				size: 1048576,
				cell: 1024,
				chunk: 16,
				height: () => 0,
				color: terrainColor,
				far: 220000,
				physics: 1,
				detail: 1.15,
				speckle: 0,
				mottle: 0,
				bottom: -2000,
			},
			look: "puppet",
			res: "pixels",
			outlines: true,
			shadows: true,
			sky: {
				top: "#487a91",
				horizon: "#e0dbc1",
				ground: "#315e6b",
				sun: "#ffe7b0",
				haze: 0.23,
			},
			fog: { color: "#b5c9c5", near: 90000, far: 215000 },
			ambient: ["#d3e3e0", "#788a71", 2.0],
			sun: {
				color: "#ffe3b0",
				intensity: 2.0,
				dir: [-0.6, 0.3, -0.7],
				area: 5000,
				shadow: 2048,
			},
			torchLights: 0,
			glowLights: 4,
			lights: 0,
			filter: { look: "clean", bands: 4, punch: 1.08, ink: 0.45 },
			camera: {
				mode: "fixed",
				near: 1,
				far: 245000,
				fov: 70,
				mouseLook: false,
			},
			onDraw: (w, r) => this.onDraw(w, r),
		});
		this.world.addCamera({
			mode: "fixed",
			near: 1,
			far: 245000,
			fov: 70,
			mouseLook: false,
		});
		this._scenery();
		this._cloudMeshes();
		this._stationOverlays();
		this.state = {
			aircraft: defaults(),
			t: 0,
			players: [{ id: 1, station: "pilot", aim: { yaw: 0, pitch: 0 } }],
			targets: [],
			enemies: [],
			bombs: [],
			flak: [],
			shots: [],
			effects: [],
		};
		this.players = this.state.players;
		this.update(0, this.state);
		return this;
	}
	_stationOverlays() {
		this.stationOverlays = [];
		for (let i = 0; i < 2; i++) {
			this.world._makeOverlay({ fov: 70, on: false });
			this.stationOverlays.push(this.world.overlay);
		}
		// The native world intentionally skips overlays in split screen. Draw each
		// native overlay explicitly in its viewport, with its own camera-space pen.
		this.world.overlay = null;
	}
	_drawStationOverlay(r, player, aircraft, state, index) {
		if (
			this.options.exterior ||
			this.options.freeCamera ||
			player.station === "exterior"
		)
			return;
		const overlay = this.stationOverlays[index] || this.stationOverlays[0];
		const renderer = this.E.World3D.renderer;
		if (!overlay || !renderer) return;
		for (const batch of Object.values(overlay.pen.B)) batch.begin();
		this.foreground(
			overlay.pen,
			{ x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0 },
			player,
			aircraft,
			state,
		);
		for (const batch of Object.values(overlay.pen.B))
			batch.end(this.world.outlines);
		const size = renderer.getDrawingBufferSize(new this.E.THREE.Vector2());
		const vp = r.viewport,
			scale = size.x / this.game.W;
		const x = vp ? Math.round(vp.x * scale) : 0;
		const y = vp ? Math.round(vp.y * scale) : 0;
		const width = vp ? Math.round(vp.w * scale) : size.x;
		const height = vp ? Math.round(vp.h * scale) : size.y;
		overlay.camera.aspect = width / height;
		overlay.camera.fov = 70;
		overlay.camera.updateProjectionMatrix();
		const previous = this.world.overlay;
		this.world.overlay = overlay;
		this.world._lightOverlay(this.world.cameras[index].cam);
		this.world.overlay = previous;
		renderer.setViewport(x, y, width, height);
		renderer.setScissor(x, y, width, height);
		renderer.setScissorTest(!!vp);
		renderer.autoClear = false;
		try {
			renderer.clearDepth();
			renderer.render(overlay.scene, overlay.camera);
		} finally {
			renderer.autoClear = true;
			renderer.setViewport(0, 0, size.x, size.y);
			renderer.setScissorTest(false);
		}
	}
	_scenery() {
		const w = this.world,
			p = (id, x, y, z = 0, o = {}) =>
				w.shape(id, x + ORIGIN.x, y + ORIGIN.y, z, { solid: false, ...o });
		// Harthaven: shelter, control hut and three pens along an east-west strip.
		p("cccHangar", -2900, -1700, 0, { facing: Math.PI });
		p("cccHangar", -4200, -1700, 0, { facing: Math.PI });
		p("cccHangar", -1600, -1700, 0, { facing: Math.PI });
		p("cccWarehouse", 1400, -1600, 0, { scale: 0.35 });
		// Saltwick harbor's cranes and warehouses frame the military targets.
		for (let i = 0; i < 5; i++)
			p("cccCrane", 339000 + i * 1150, 21200, 40, { facing: Math.PI / 2 });
		for (let i = 0; i < 5; i++)
			p("cccWarehouse", 341000 + i * 1900, 24300 + (i % 2) * 1600, 40, {
				facing: 0.05 * (i % 2),
			});
		for (let i = 0; i < 6; i++)
			p("cccWarehouse", 333000 + i * 2600, 12000, 40, {
				scale: 0.65,
				facing: Math.PI / 2,
			});
		// Distant villages are composed from the same chunky native registry.
		for (let i = 0; i < 40; i++) {
			const x =
					i < 14
						? 4000 + this.E.hash2(i, 41) * 25000
						: 281000 + this.E.hash2(i, 47) * 98000,
				y =
					i < 14
						? 12000 + this.E.hash2(i, 61) * 11000
						: -25000 - this.E.hash2(i, 71) * 42000;
			p("cccCottage", x, y, 0, { scale: 1.5, facing: (i * 0.72) % TAU });
			if (i % 2 === 0)
				p("pine", x + 800, y + 600, 0, { scale: 18, params: { h: 35 } });
		}
	}
	_cloudMeshes() {
		const T = this.E.THREE,
			geometry = new T.SphereGeometry(1, 7, 4),
			group = new T.Group();
		const mats = [
			new T.MeshLambertNodeMaterial({ color: "#d8e2db", flatShading: true }),
			new T.MeshLambertNodeMaterial({ color: "#cedbd5", flatShading: true }),
		];
		const meshes = mats.map(
			(m) => new T.InstancedMesh(geometry, m, this.clouds.length * 3),
		);
		const counts = [0, 0],
			matrix = new T.Matrix4(),
			position = new T.Vector3(),
			scale = new T.Vector3(),
			rotation = new T.Quaternion();
		this.clouds.forEach((c, i) => {
			for (let k = 0; k < 5; k++) {
				const kind = (i + k) % 2;
				position.set(
					(c.x + ORIGIN.x + Math.cos(k * 1.4 + c.a) * c.k * 0.65) / 16,
					(c.z + Math.sin(c.a + k) * 240) / 16,
					(c.y + ORIGIN.y + Math.sin(k * 1.7 + c.a) * c.k * 0.43) / 16,
				);
				scale.set(
					(c.k * (0.8 + k * 0.07)) / 16,
					(c.k * 0.23) / 16,
					(c.k * 0.48) / 16,
				);
				matrix.compose(position, rotation, scale);
				meshes[kind].setMatrixAt(counts[kind]++, matrix);
			}
		});
		meshes.forEach((m, i) => {
			m.count = counts[i];
			m.instanceMatrix.needsUpdate = true;
			m.castShadow = false;
			m.receiveShadow = false;
			m.frustumCulled = false;
			group.add(m);
		});
		this.world.scene.add(group);
		this.cloudGroup = group;
		this._cloudMaterials = mats;
	}
	update(dt, state) {
		if (!this.world) return;
		this.state = state || this.state;
		if (this.cloudGroup)
			this.cloudGroup.position.x = ((this.state.t || 0) * 12) / 16;
		this.players = this.state.players || this.players;
		const a = this.state.aircraft || defaults();
		const target = { x: a.x + ORIGIN.x, y: a.y + ORIGIN.y, z: a.z };
		for (let i = 0; i < 2; i++) {
			const p = this.players[i] || this.players[0] || { station: "pilot" };
			const cam = this.world.cameras[i];
			cam.target = target;
			cam.set("fixed");
			cam.fixed = this.cameraPose(a, p, i);
			cam.update(dt);
		}
		this.world.step(dt);
	}
	cameraPose(a, p, _i = 0) {
		const t = this.state?.t || 0,
			aim = p.aim || {},
			look = p.look || [0, 0];
		const station = p.station || "pilot";
		let pos,
			yaw,
			pitch,
			roll = a.bank || 0,
			fov = 68;
		if (this.options.freeCamera && this.freePose) return { ...this.freePose };
		if (!this.options.freeCamera) this.freePose = null;
		const exterior =
			this.options.exterior ||
			this.options.freeCamera ||
			station === "exterior";
		if (exterior) {
			const angle = (a.yaw || 0) + 2.45 + Math.sin(t * 0.055) * 0.28,
				radius = this.options.title ? 705 : 1000;
			pos = {
				x: a.x + Math.cos(angle) * radius,
				y: a.y + Math.sin(angle) * radius,
				z: a.z + 280 + Math.sin(t * 0.08) * 65,
			};
			let tx = a.x + Math.cos(a.yaw || 0) * 75,
				ty = a.y + Math.sin(a.yaw || 0) * 75;
			if (this.options.title) {
				const heading = Math.atan2(ty - pos.y, tx - pos.x);
				tx += Math.sin(heading) * 280;
				ty -= Math.cos(heading) * 280;
			}
			yaw = Math.atan2(ty - pos.y, tx - pos.x);
			pitch = Math.atan2(a.z - pos.z, Math.hypot(tx - pos.x, ty - pos.y));
			roll = 0;
			fov = 58;
		} else if (station === "bombs") {
			pos = transformLocal(a, 105, 0, -24);
			const prediction = this.state?.prediction;
			const lead = prediction
				? { x: prediction.x - pos.x, y: prediction.y - pos.y }
				: { x: Math.cos(a.yaw || 0) * 12500, y: Math.sin(a.yaw || 0) * 12500 };
			yaw = Math.atan2(lead.y, lead.x) + (aim.yaw || 0) * 0.12;
			pitch =
				Math.atan2(
					-Math.max(400, pos.z),
					Math.max(1000, Math.hypot(lead.x, lead.y)),
				) +
				(aim.pitch || 0) * 0.1;
			roll = clamp(a.bank || 0, -0.4, 0.4) * 0.45;
			fov = p.zoom ? 38 : 68;
		} else {
			const mounts = {
				pilot: [75, 0, 20, 0],
				nose: [186, 0, 2, 0],
				starboard: [-26, 28, 10, Math.PI / 2],
				tail: [-197, 0, 8, Math.PI],
				port: [-26, -28, 10, -Math.PI / 2],
			};
			const m = mounts[station] || mounts.pilot;
			pos = transformLocal(a, m[0], m[1], m[2]);
			yaw =
				(a.yaw || 0) +
				m[3] +
				(station === "pilot" ? look[0] || 0 : aim.yaw || 0);
			pitch =
				station === "pilot"
					? (a.pitch || 0) + (look[1] || 0) - 0.025
					: aim.pitch || 0;
			fov = p.zoom ? 43 : 70;
		}
		const pose = {
			...pos,
			x: pos.x + ORIGIN.x,
			y: pos.y + ORIGIN.y,
			yaw,
			pitch,
			roll,
			fov,
			ortho: false,
		};
		if (this.options.freeCamera) this.freePose = { ...pose };
		return pose;
	}
	freeControl(c = {}, dt = 1 / 120) {
		if (!this.options.freeCamera) return false;
		if (!this.freePose)
			this.cameraPose(
				this.state?.aircraft || defaults(),
				this.players[0] || { station: "pilot" },
			);
		const p = this.freePose;
		if (!p) return false;
		p.yaw += (c.yaw || 0) * dt * 1.35;
		p.pitch = clamp(p.pitch + (c.pitch || 0) * dt, -1.45, 1.45);
		const speed = (c.fast ? 12000 : 3000) * dt,
			forward = clamp(c.forward || 0, -1, 1),
			right = clamp(c.right || 0, -1, 1),
			up = clamp(c.up || 0, -1, 1);
		p.x +=
			(Math.cos(p.yaw) * Math.cos(p.pitch) * forward -
				Math.sin(p.yaw) * right) *
			speed;
		p.y +=
			(Math.sin(p.yaw) * Math.cos(p.pitch) * forward +
				Math.cos(p.yaw) * right) *
			speed;
		p.z = clamp(p.z + (Math.sin(p.pitch) * forward + up) * speed, 50, 100000);
		return true;
	}
	draw(r, state, players = state?.players, opts = {}) {
		if (!this.world) return;
		this.state = state || this.state;
		this.players = players || this.state.players || this.players;
		this.options = opts || {};
		const i = r.viewport?.i || 0;
		const p = this.players[i] || this.players[0] || { station: "pilot" };
		const cam = this.world.cameras[i];
		cam.fixed = this.cameraPose(this.state.aircraft || defaults(), p, i);
		cam.update(0);
		this.world.draw(r);
		this._drawStationOverlay(
			r,
			p,
			this.state.aircraft || defaults(),
			this.state,
			i,
		);
		this.views[i] = {
			cam: cam.cam,
			viewport: r.viewport ? { ...r.viewport } : null,
			W: r.W,
			H: r.H,
		};
		this.hints(r, p, i);
	}
	projectFor(i, x, y, z = 0) {
		const v = this.views[i];
		if (!v) return null;
		const p = this.E.World3D.toThree(x + ORIGIN.x, y + ORIGIN.y, z);
		p.project(v.cam);
		if (p.z < -1 || p.z > 1) return null;
		const vp = v.viewport,
			W = vp?.w || v.W,
			H = vp?.h || v.H;
		return [
			(vp?.x || 0) + (p.x * 0.5 + 0.5) * W,
			(vp?.y || 0) + (0.5 - p.y * 0.5) * H,
		];
	}
	onDraw(w, r) {
		const s = this.state;
		if (!s) return;
		const a = s.aircraft || defaults(),
			i = r.viewport?.i || 0,
			p = this.players[i] || this.players[0] || { station: "pilot" };
		const pen = w.pen,
			t = s.t || 0,
			exterior =
				this.options.exterior ||
				this.options.freeCamera ||
				p.station === "exterior";
		// Rebuild for each viewport: native pen batches are consumed after every draw.
		this.landmarks(pen, s);
		this.bomber(pen, a, t, { exterior, station: p.station });
		for (const e of s.enemies || [])
			if (e.alive !== false && e.hp !== 0) this.fighter(pen, e, t);
		for (const b of s.bombs || []) {
			pen.at(
				b.x + ORIGIN.x,
				b.y + ORIGIN.y,
				b.z,
				Math.atan2(b.vy || 0, b.vx || 1),
				1,
				Math.atan2(b.vz || -1, Math.hypot(b.vx || 0, b.vy || 0)),
			);
			pen
				.ball(0, 0, 0, 12, 4, 4, C.oliveDark)
				.cone(8, 0, 0, 17, 0, 0, 4, C.ink)
				.box(-10, 0, 0, 8, 14, 1.5, C.metal)
				.box(-10, 0, 0, 8, 1.5, 14, C.metal);
		}
		pen.at();
		for (const q of s.shots || []) {
			const c = q.team === "enemy" ? "#ed9762" : "#ffe7a2";
			pen.tube(
				(q.px ?? q.x) + ORIGIN.x,
				(q.py ?? q.y) + ORIGIN.y,
				q.pz ?? q.z,
				q.x + ORIGIN.x,
				q.y + ORIGIN.y,
				q.z,
				q.team === "enemy" ? 2.4 : 2.1,
				c,
			);
			pen.glow(q.x + ORIGIN.x, q.y + ORIGIN.y, q.z, 4, c);
		}
		for (const f of s.flak || []) this.flak(pen, f, t);
		for (const e of s.effects || []) this.effect(pen, e, t);
		if (this.options.debug) this.debugVolumes(pen, s);
		pen.at();
	}
	landmarks(p, s) {
		const t = s.t || 0;
		p.at(ORIGIN.x, ORIGIN.y, 0);
		// Runway centerline, threshold piano keys, approach lamps and hardstands.
		p.box(0, 0, 4, 7200, 620, 8, "#4c5b58").box(
			0,
			0,
			10,
			7200,
			12,
			1,
			"#d8d3af",
		);
		for (let i = -6; i <= 6; i++) {
			p.box(i * 490, 0, 11, 220, 18, 2, C.cream);
			if (i % 2 === 0) {
				p.glow(i * 490, -330, 18, 7, C.amber).glow(
					i * 490,
					330,
					18,
					7,
					C.amber,
				);
			}
		}
		for (const side of [-1, 1])
			for (let k = 0; k < 5; k++)
				p.box(-3100, side * (70 + k * 39), 11, 370, 19, 2, C.cream);
		p.box(-3000, -1100, 4, 5400, 550, 8, "#777c68")
			.box(1700, -1400, 215, 230, 200, 430, "#b2b397")
			.box(1700, -1400, 485, 360, 290, 120, "#3e5a60");
		p.tube(2250, -1500, 0, 2250, -1500, 600, 8, C.metal).bar(
			2250,
			-1500,
			580,
			2250,
			-1270,
			580,
			65,
			8,
			C.danger,
		);
		// Harbor breakwaters and quay blocks.
		p.at(ORIGIN.x + 340000, ORIGIN.y + 18000, 0);
		p.box(3300, 2900, 35, 12000, 1900, 70, "#8f9987").box(
			1700,
			-5600,
			35,
			16000,
			1100,
			70,
			"#8f9987",
		);
		p.box(-9000, -3100, 35, 450, 6100, 70, "#7e8d80").box(
			-9300,
			-6100,
			35,
			1000,
			430,
			70,
			"#7e8d80",
		);
		p.box(-5700, 1700, 35, 490, 2700, 70, "#7e8d80");
		for (let k = 0; k < 12; k++)
			p.box(-5000 + k * 1150, 2130, 90, 45, 80, 70, C.ink);
		// Cargo rail lines and neatly stacked equipment support the military identity.
		for (let k = 0; k < 4; k++)
			p.box(1100 + k * 65, 5900, 40, 12, 14000, 2, "#38494a");
		for (let k = 0; k < 18; k++) {
			const x = -1800 + (k % 6) * 500,
				y = 4500 + Math.floor(k / 6) * 430;
			p.box(x, y, 175, 390, 310, 270, k % 3 ? "#727c63" : "#9c8c60");
			p.box(x, y, 314, 340, 260, 8, C.oliveLight);
		}
		const targets = s.targets || [];
		for (const q of targets) {
			p.at(q.x + ORIGIN.x, q.y + ORIGIN.y, q.z || 0);
			if (q.id === "ship") this.ship(p, q, t);
			else if (q.id === "battery") this.battery(p, q, t);
			else if (q.id === "tanks" || q.id === "refinery") this.refinery(p, q, t);
			else this.works(p, q, t);
		}
		// A moored escort, lighthouse, smoke stacks and small fishing boats enrich the bay.
		p.at(ORIGIN.x + 331000, ORIGIN.y + 18500, 0, -0.12, 0.36);
		this.ship(p, { alive: true, hp: 100 }, t, false);
		p.at(ORIGIN.x + 330500, ORIGIN.y + 11900, 0);
		p.tube(0, 0, 0, 0, 0, 760, 120, "#d7ceb0")
			.tube(0, 0, 250, 0, 0, 390, 124, C.red)
			.box(0, 0, 800, 310, 300, 120, C.ink)
			.glow(0, 0, 800, 80, C.amber);
	}
	ship(p, q, t, fire = true) {
		const alive = q.alive !== false && q.hp !== 0,
			damage = alive ? clamp(1 - (q.hp || 100) / (q.maxHp || 100), 0, 1) : 1;
		const sunk = alive ? 0 : 150 + Math.sin(t * 0.1) * 4;
		p.ball(0, 0, 70 - sunk, 1600, 280, 140, alive ? "#445b59" : "#354b4e");
		p.box(0, 0, 185 - sunk, 2690, 450, 45, "#909a87").box(
			-180,
			0,
			310 - sunk,
			790,
			290,
			220,
			"#687b71",
		);
		p.box(280, 0, 480 - sunk, 410, 310, 190, "#7d8d7d").box(
			290,
			0,
			590 - sunk,
			320,
			260,
			30,
			C.metal,
		);
		for (const side of [-1, 1]) {
			p.box(290, side * 160, 500 - sunk, 260, 8, 65, C.glass);
			p.tube(
				-200,
				side * 217,
				250 - sunk,
				900,
				side * 217,
				250 - sunk,
				5,
				C.metal,
			);
		}
		p.tube(-440, 0, 360 - sunk, -440, 0, 670 - sunk, 95, C.ink).tube(
			-700,
			0,
			360 - sunk,
			-700,
			0,
			630 - sunk,
			80,
			C.ink,
		);
		p.tube(560, 0, 540 - sunk, 560, 0, 950 - sunk, 12, C.metal).tube(
			350,
			0,
			820 - sunk,
			770,
			0,
			820 - sunk,
			9,
			C.metal,
		);
		for (const x of [-1090, 1080]) {
			p.ball(x, 0, 280 - sunk, 160, 130, 65, C.oliveDark);
			p.tube(x, 0, 300 - sunk, x + 260, 0, 340 - sunk, 24, C.ink);
		}
		for (let k = 0; k < 7; k++)
			p.box(-980 + k * 290, 0, 220 - sunk, 15, 370, 15, C.ink);
		if (fire && damage > 0.25) {
			for (let k = 0; k < 7; k++) {
				const u = (t * 0.33 + k * 0.147) % 1;
				p.ball(
					-430 + Math.sin(k * 2) * 130,
					Math.cos(k * 2) * 100,
					430 + u * 1600,
					170 + u * 220,
					160 + u * 200,
					200 + u * 270,
					k % 2 ? "#33454a" : "#4e5854",
				);
			}
			p.glow(-400, 0, 390, 110, "#ffb259");
		}
	}
	refinery(p, q, t) {
		const alive = q.alive !== false && q.hp !== 0;
		p.box(0, 0, 12, 4300, 3100, 24, "#8b927d");
		for (let k = 0; k < 4; k++) {
			const x = (k % 2) * 1450 - 725,
				y = Math.floor(k / 2) * 1350 - 675;
			p.tube(
				x,
				y,
				30,
				x,
				y,
				alive ? 630 : 260,
				535,
				alive ? "#b9b79b" : "#686e60",
			);
			p.ball(
				x,
				y,
				alive ? 630 : 260,
				535,
				535,
				65,
				alive ? "#d8cfad" : "#4b5b54",
			);
			for (const side of [-1, 1])
				p.box(x + side * 350, y, 360, 25, 930, 18, "#6d8074");
			p.tube(x + 545, y, 20, x + 545, y, 660, 12, C.ink);
		}
		if (q.id === "refinery") {
			for (let k = 0; k < 3; k++) {
				p.tube(
					2400 + k * 600,
					0,
					0,
					2400 + k * 600,
					0,
					alive ? 1850 : 550,
					95,
					"#819384",
				);
				p.tube(2280 + k * 600, 100, 0, 2280 + k * 600, 100, 1450, 25, C.ink);
			}
			for (let k = 0; k < 5; k++)
				p.box(3000, 0, 250 + k * 320, 2000, 1200, 25, "#c0ad7d");
		}
		if (!alive) {
			for (let k = 0; k < 9; k++) {
				const u = (t * 0.14 + k * 0.127) % 1;
				p.ball(
					Math.sin(k * 7) * 1000 + u * 600,
					Math.cos(k * 3) * 700,
					500 + u * 3400,
					400 + u * 480,
					400 + u * 480,
					500 + u * 750,
					k % 2 ? "#32464a" : "#4a5550",
				);
			}
			p.glow(600, 200, 300, 360, "#ffa35f");
		}
	}
	works(p, q, t) {
		const alive = q.alive !== false && q.hp !== 0;
		p.box(
			0,
			0,
			alive ? 330 : 140,
			3200,
			1700,
			alive ? 660 : 280,
			alive ? "#8f9278" : "#5b675d",
		);
		for (let k = 0; k < 4; k++) {
			p.box(-1200 + k * 800, 0, alive ? 730 : 300, 780, 1850, 120, "#526a66");
			if (alive) p.box(-1200 + k * 800, -870, 480, 600, 10, 130, C.glass);
		}
		for (let k = 0; k < 2; k++)
			p.tube(
				1100 + k * 550,
				1100,
				0,
				1100 + k * 550,
				1100,
				alive ? 1700 : 400,
				115,
				"#6c6c58",
			);
		if (!alive) {
			for (let k = 0; k < 6; k++) {
				const u = (t * 0.18 + k * 0.2) % 1;
				p.ball(
					-1000 + k * 350 + u * 450,
					0,
					350 + u * 2400,
					300 + u * 350,
					300 + u * 350,
					450 + u * 500,
					"#455452",
				);
			}
			p.glow(0, 0, 200, 280, "#efad68");
		}
	}
	battery(p, q, _t) {
		const alive = q.alive !== false && q.hp !== 0;
		p.box(0, 0, 35, 2200, 1800, 70, "#777f65");
		for (const x of [-600, 600]) {
			p.ball(x, 0, 180, 330, 330, 130, "#a5a28a");
			p.box(x, 0, 230, 350, 290, 120, alive ? C.oliveDark : "#4c5951");
			p.tube(x, 0, 260, x + 430, 0, alive ? 620 : 280, 40, C.ink);
		}
		p.box(-300, -660, 190, 650, 450, 380, "#7c8870").box(
			-300,
			-670,
			390,
			720,
			480,
			45,
			"#b2ae8b",
		);
	}
	bomber(p, a, t, { exterior, station }) {
		p.at(
			a.x + ORIGIN.x,
			a.y + ORIGIN.y,
			a.z,
			a.yaw || 0,
			1,
			a.pitch || 0,
			a.bank || 0,
		);
		const healthy = a.engines || [1, 1, 1, 1],
			damaged = (a.hull ?? 100) < 45;
		// In the crew's seats the fuselage is omitted; the wings remain physical around the windows.
		if (exterior) {
			p.ball(0, 0, 0, 165, 23, 26, damaged ? "#56604e" : C.olive).cone(
				-100,
				0,
				0,
				-194,
				0,
				14,
				20,
				C.oliveDark,
			);
			p.ball(153, 0, 0, 31, 22, 20, C.glass).ball(
				80,
				0,
				25,
				43,
				21,
				17,
				C.glass,
			);
			for (const x of [133, 151, 170])
				p.tube(x, -19, -14, x, -19, 14, 1.4, C.ink).tube(
					x,
					19,
					-14,
					x,
					19,
					14,
					1.4,
					C.ink,
				);
			p.tube(175, -13, 16, 123, -18, 16, 1.3, C.ink).tube(
				175,
				13,
				16,
				123,
				18,
				16,
				1.3,
				C.ink,
			);
			p.tube(66, 0, 40, 108, 0, 34, 2, C.ink).tube(
				79,
				-20,
				25,
				79,
				20,
				25,
				2,
				C.ink,
			);
			p.box(-134, 0, 37, 66, 7, 76, C.oliveDark).bar(
				-140,
				-90,
				14,
				-140,
				90,
				14,
				40,
				5,
				C.olive,
			);
			p.slab(
				-160,
				-86,
				14,
				-160,
				86,
				14 - (a.pitch || 0) * 18,
				1,
				0,
				0,
				13,
				2,
				C.oliveLight,
			).box(-163, 0, 47, 9, 5, 43, C.oliveLight, (a.bank || 0) * 0.12);
			p.box(-145, 0, 61, 26, 8, 18, "#d5d9bc").box(
				-145,
				0,
				58,
				8,
				9,
				40,
				"#d5d9bc",
			);
			p.ball(15, 0, 31, 18, 17, 13, C.oliveDark)
				.tube(20, -5, 35, 75, -5, 37, 2.8, C.ink)
				.tube(20, 5, 35, 75, 5, 37, 2.8, C.ink);
			p.ball(-30, 0, -25, 15, 13, 14, C.oliveDark);
			const door = clamp(a.doors || 0, 0, 1);
			for (const side of [-1, 1])
				p.slab(
					-45,
					side * (7 + door * 13),
					-23,
					-5,
					side * (7 + door * 13),
					-23 - door * 15,
					0,
					side,
					0,
					18,
					2,
					C.oliveDark,
				);
			const gear = clamp(a.gear || 0, 0, 1);
			if (gear > 0.04) {
				for (const y of [-90, 90]) {
					p.tube(25, y, -8, 13, y, -8 - gear * 52, 3.2, C.metal).ball(
						10,
						y,
						-10 - gear * 50,
						12,
						7,
						12,
						C.ink,
					);
				}
				p.tube(-151, 0, -4, -158, 0, -4 - gear * 23, 2, C.metal).ball(
					-158,
					0,
					-4 - gear * 26,
					6,
					4,
					6,
					C.ink,
				);
			}
		}
		if (station !== "bombs" || exterior) {
			for (const side of [-1, 1]) {
				p.slab(28, side * 12, -3, -6, side * 252, -10, 1, 0, 0, 64, 6, C.olive);
				p.slab(
					-22,
					side * 170,
					-8,
					-28,
					side * 246,
					-10 + side * (a.bank || 0) * 9,
					1,
					0,
					0,
					14,
					2,
					C.oliveLight,
				);
				p.ball(0, side * 170, -5, 28, 28, 1.5, C.cream)
					.ball(0, side * 170, -3, 19, 19, 1.4, C.ink)
					.ball(0, side * 170, -1, 10, 10, 1.2, C.cream);
				p.tube(
					15,
					side * 246,
					-9,
					15,
					side * 251,
					-9,
					3,
					side < 0 ? "#c0745d" : "#b2ceb0",
				);
			}
			for (let k = 0; k < 4; k++) {
				const y = [-176, -88, 88, 176][k],
					hp = healthy[k] ?? 1,
					x = k === 0 || k === 3 ? 26 : 42;
				p.tube(
					x - 34,
					y,
					-6,
					x + 30,
					y,
					-6,
					13.5,
					hp < 0.4 ? "#5c5a4b" : C.oliveDark,
				)
					.tube(x + 27, y, -6, x + 38, y, -6, 14, C.metal)
					.cone(x + 38, y, -6, x + 48, y, -6, 10, C.oliveDark);
				const spin =
					t * (hp > 0.05 ? 32 * hp * (a.throttle ?? 0.8) : 0) + k * 0.7;
				for (let j = 0; j < 3; j++) {
					const an = spin + (j * TAU) / 3;
					p.tube(
						x + 43,
						y + Math.sin(an) * 8,
						-6 + Math.cos(an) * 8,
						x + 43,
						y + Math.sin(an) * 34,
						-6 + Math.cos(an) * 34,
						2.3,
						C.ink,
					);
				}
				if (hp < 0.55 || (a.fire && k === 0)) {
					for (let j = 0; j < 5; j++) {
						const u = (t * 0.95 + j * 0.21) % 1;
						p.ball(
							x - 20 - u * 140,
							y + Math.sin(j * 3) * 8,
							-5 + u * 30,
							12 + u * 22,
							10 + u * 14,
							12 + u * 18,
							j % 2 ? "#3d4b48" : "#56605a",
						);
					}
					if (a.fire && k === 0)
						p.glow(x - 28, y, -4, 18 + Math.sin(t * 30) * 4, "#f3a85a");
				}
			}
		}
	}
	fighter(p, e, t) {
		p.at(
			e.x + ORIGIN.x,
			e.y + ORIGIN.y,
			e.z,
			e.yaw || 0,
			1,
			e.pitch || 0,
			e.bank || Math.sin((e.t || t) * 1.6) * 0.2,
		);
		const col = (e.hp || 2) < 2 ? "#78634f" : "#8c8b72";
		p.ball(0, 0, 0, 72, 9, 11, col).cone(-45, 0, 0, -88, 0, 5, 9, C.ink);
		p.slab(12, -77, -2, 12, 77, -2, 1, 0, 0, 29, 3, C.ink)
			.box(-57, 0, 14, 30, 4, 27, col)
			.box(-57, 0, 2, 25, 59, 3, col);
		p.ball(13, 0, 11, 21, 8, 8, "#9fbabe").tube(
			49,
			0,
			0,
			70,
			0,
			0,
			10,
			"#d5c28e",
		);
		const spin = t * 49 + (e.id?.length || 0);
		p.tube(
			70,
			Math.sin(spin) * 27,
			Math.cos(spin) * 27,
			70,
			-Math.sin(spin) * 27,
			-Math.cos(spin) * 27,
			1.7,
			C.ink,
		);
		for (const side of [-1, 1])
			p.box(12, side * 55, 0, 14, 21, 1, C.cream).box(
				12,
				side * 55,
				1,
				24,
				6,
				1,
				C.cream,
			);
		if ((e.hp || 2) < 2) {
			p.ball(-92, 0, 3, 28, 12, 13, "#56635c").ball(
				-126,
				2,
				7,
				22,
				15,
				16,
				"#68746b",
			);
		}
	}
	foreground(p, cam, pl, a, s) {
		const st = pl.station || "pilot";
		if (!cam) return;
		p.at(cam.x, cam.y, cam.z, cam.yaw, 1, cam.pitch, cam.roll || 0);
		if (st === "bombs") {
			// Sight housing occupies the edge; the actual predicted impact stays in world space.
			for (let k = 0; k < 12; k++) {
				const an = (k * TAU) / 12,
					an2 = ((k + 1) * TAU) / 12;
				p.tube(
					72,
					Math.sin(an) * 61,
					Math.cos(an) * 52,
					72,
					Math.sin(an2) * 61,
					Math.cos(an2) * 52,
					3,
					C.ink,
				);
			}
			p.box(46, -36, -30, 15, 12, 26, C.oliveDark).tube(
				42,
				33,
				-45,
				42,
				33,
				20,
				2,
				C.gold,
			);
			return;
		}
		if (st === "pilot") {
			// Heavy warm interior, clear forward panes, amber needles and control yokes.
			p.box(76, 0, -35, 17, 170, 28, C.ink).box(
				66,
				0,
				-46,
				38,
				180,
				14,
				C.oliveDark,
			);
			p.tube(56, -75, -30, 73, -75, 60, 3.2, C.oliveDark).tube(
				56,
				75,
				-30,
				73,
				75,
				60,
				3.2,
				C.oliveDark,
			);
			p.tube(73, -75, 38, 73, 75, 38, 3.1, C.oliveDark).tube(
				79,
				0,
				39,
				100,
				0,
				85,
				2.9,
				C.oliveDark,
			);
			p.tube(75, -75, -19, 75, 75, -19, 1.8, C.gold);
			const values = [
				clamp(a.speed / 1600, 0, 1),
				clamp(a.z / 28000, 0, 1),
				clamp(a.throttle || 0, 0, 1),
				clamp((a.fuel || 0) / (a.maxFuel || 100), 0, 1),
			];
			for (let k = 0; k < 4; k++) {
				const y = -44 + k * 29,
					z = -28;
				p.ball(66, y, z, 1.2, 10, 10, "#a48f65").ball(
					64,
					y,
					z,
					1.6,
					8.5,
					8.5,
					"#172f34",
				);
				const v = -2.35 + values[k] * 4.7;
				p.tube(
					62,
					y,
					z,
					62,
					y + Math.sin(v) * 6.5,
					z + Math.cos(v) * 6.5,
					0.55,
					C.amber,
				).glow(62, y, z, 1, C.cream);
				for (let j = 0; j < 5; j++) {
					const ang = -2.35 + j * 1.17;
					p.tube(
						62,
						y + Math.sin(ang) * 6.5,
						z + Math.cos(ang) * 6.5,
						62,
						y + Math.sin(ang) * 8,
						z + Math.cos(ang) * 8,
						0.35,
						"#c0b992",
					);
				}
			}
			const bank = clamp(a.bank || 0, -1, 1);
			p.tube(23, -19, -47, 28, -19, -35, 1.5, C.metal)
				.tube(28, -19, -35, 28, -27, -32 + bank * 5, 1.7, C.ink)
				.tube(28, -19, -35, 28, -11, -32 - bank * 5, 1.7, C.ink);
			for (let k = 0; k < 4; k++)
				p.tube(
					35,
					35 + k * 6,
					-43,
					30 + (a.throttle || 0) * 7,
					35 + k * 6,
					-36,
					1.2,
					k % 2 ? C.danger : C.cream,
				);
		} else {
			const tone =
				st === "tail" ? "#70664f" : st === "nose" ? "#7d896e" : "#64796b";
			// Each station is a different structural opening, with a clear central firing cone.
			if (st === "nose") {
				p.tube(70, -52, -35, 82, -52, 45, 2.2, tone)
					.tube(70, 52, -35, 82, 52, 45, 2.2, tone)
					.tube(82, -52, 45, 82, 52, 45, 2.2, tone);
				p.tube(95, -32, 70, 95, 0, 35, 1.5, C.metal).tube(
					95,
					32,
					70,
					95,
					0,
					35,
					1.5,
					C.metal,
				);
			} else if (st === "tail") {
				p.tube(65, -55, -45, 80, -35, 40, 3, tone)
					.tube(65, 55, -45, 80, 35, 40, 3, tone)
					.tube(80, -35, 40, 80, 35, 40, 3, tone);
				p.box(53, -62, 0, 15, 25, 105, tone).box(53, 62, 0, 15, 25, 105, tone);
			} else {
				const side = st === "port" ? -1 : 1;
				p.tube(65, side * 62, -40, 65, side * 62, 55, 4, tone)
					.tube(65, -70, 48, 65, 70, 48, 4, tone)
					.tube(65, -70, -40, 65, 70, -40, 4, tone);
				p.box(36, -side * 42, -34, 40, 36, 30, C.oliveDark);
			}
			const mount = s.mounts?.[st],
				fire = !!pl.fire || !!mount?.firing || (mount?.recoil || 0) > 0.2,
				recoil = (mount?.recoil || 0) * 1.8;
			for (const side of [-1, 1]) {
				p.box(35, side * 7, -20, 30, 9, 9, C.ink)
					.tube(
						43 - recoil,
						side * 7,
						-17,
						104 - recoil,
						side * 7,
						-12,
						2.2,
						C.ink,
					)
					.tube(
						91 - recoil,
						side * 7,
						-13,
						103 - recoil,
						side * 7,
						-12,
						2.8,
						C.metal,
					);
				p.box(28, side * 23, -29, 20, 22, 20, tone).tube(
					27,
					side * 10,
					-24,
					24,
					side * 24,
					-27,
					2.2,
					C.gold,
				);
				if (fire && Math.floor((s.t || 0) * 20) % 3 === 0)
					p.glow(107 - recoil, side * 7, -12, 4, "#ffdda0");
			}
			p.tube(29, -10, -33, 29, 10, -33, 2.2, tone)
				.tube(29, -10, -33, 24, -10, -45, 1.8, C.ink)
				.tube(29, 10, -33, 24, 10, -45, 1.8, C.ink);
		}
	}
	flak(p, f, t) {
		const x = f.x + ORIGIN.x,
			y = f.y + ORIGIN.y,
			z = f.z,
			rr = f.r || 650;
		p.at(x, y, z);
		if (f.burst) {
			const age = f.age || 0;
			for (let k = 0; k < 9; k++) {
				const a = k * 2.399,
					r = rr * (0.22 + ((k * 7) % 11) / 20),
					u = Math.min(1, age * 0.4);
				p.ball(
					Math.cos(a) * r,
					Math.sin(a) * r,
					Math.sin(k * 5) * r * 0.5 + u * 180,
					rr * (0.25 + u * 0.11),
					rr * (0.27 + u * 0.12),
					rr * (0.25 + u * 0.1),
					k % 2 ? "#263d43" : "#3b4d4b",
				);
			}
			if (age < 0.35) p.glow(0, 0, 0, rr * 0.25, "#f9c179");
		} else {
			const r = rr * (1 + Math.sin(t * 8) * 0.04);
			for (let k = 0; k < 16; k++) {
				if (k % 2 && Math.floor(t * 8) % 2) continue;
				const an = (k * TAU) / 16,
					an2 = ((k + 0.65) * TAU) / 16;
				p.tube(
					Math.cos(an) * r,
					Math.sin(an) * r,
					0,
					Math.cos(an2) * r,
					Math.sin(an2) * r,
					0,
					Math.max(3, rr * 0.008),
					C.amber,
				);
			}
			p.tube(-r * 0.12, 0, 0, r * 0.12, 0, 0, 4, C.danger).tube(
				0,
				-r * 0.12,
				0,
				0,
				r * 0.12,
				0,
				4,
				C.danger,
			);
		}
	}
	effect(p, e, _t) {
		const age = e.age || 0,
			size = e.size || 200;
		p.at(e.x + ORIGIN.x, e.y + ORIGIN.y, e.z || 0);
		if (e.kind === "hit") {
			for (let k = 0; k < 6; k++) {
				const a = k * 2.399;
				p.tube(
					0,
					0,
					0,
					Math.cos(a) * size * age * 8,
					Math.sin(a) * size * age * 8,
					Math.sin(k * 3) * size * age * 5,
					2,
					C.amber,
				);
			}
			return;
		}
		if (e.kind === "explosion" && age < 1) {
			const r = size * (0.4 + Math.sin(clamp(age, 0, 1) * Math.PI) * 1.5);
			p.glow(0, 0, r * 0.3, r, age < 0.15 ? "#ffeac1" : "#eeab64");
			for (let k = 0; k < 7; k++)
				p.ball(
					Math.sin(k * 3) * r * 0.65,
					Math.cos(k * 2) * r * 0.65,
					r * 0.3 + Math.sin(k * 6) * r * 0.3,
					r * 0.7,
					r * 0.7,
					r * 0.8,
					k % 2 ? "#d89654" : "#796750",
				);
		}
		for (let k = 0; k < 7; k++) {
			const an = k * 2.399,
				rad = size * (0.6 + age * 0.25);
			p.ball(
				Math.cos(an) * rad * 0.6 + age * 90,
				Math.sin(an) * rad * 0.6,
				size * 0.4 + age * size * 0.65 + Math.sin(k * 2) * rad * 0.3,
				rad,
				rad * 0.9,
				rad * 1.15,
				k % 2 ? "#394c4c" : "#54605a",
			);
		}
	}
	wireSphere(p, x, y, z, r, color) {
		p.at(x + ORIGIN.x, y + ORIGIN.y, z);
		const width = Math.max(3, r * 0.007);
		for (let axis = 0; axis < 3; axis++)
			for (let k = 0; k < 20; k++) {
				const a = (k * TAU) / 20,
					b = ((k + 1) * TAU) / 20,
					va = [Math.cos(a) * r, Math.sin(a) * r, 0],
					vb = [Math.cos(b) * r, Math.sin(b) * r, 0];
				if (axis === 1) {
					[va[1], va[2]] = [va[2], va[1]];
					[vb[1], vb[2]] = [vb[2], vb[1]];
				}
				if (axis === 2) {
					[va[0], va[2]] = [va[2], va[0]];
					[vb[0], vb[2]] = [vb[2], vb[0]];
				}
				p.tube(...va, ...vb, width, color);
			}
	}
	debugVolumes(p, s) {
		const aircraft = s.aircraft,
			definition = this.options.definition || this.options.mission || MISSION;
		for (const q of s.targets || []) {
			p.at(q.x + ORIGIN.x, q.y + ORIGIN.y, q.z || 0);
			const r = q.r || 1500;
			for (let k = 0; k < 20; k++) {
				const a = (k * TAU) / 20,
					b = ((k + 1) * TAU) / 20;
				p.tube(
					Math.cos(a) * r,
					Math.sin(a) * r,
					10,
					Math.cos(b) * r,
					Math.sin(b) * r,
					10,
					8,
					"#cae9c0",
				);
			}
		}
		this.wireSphere(p, aircraft.x, aircraft.y, aircraft.z, 230, "#81d4ca");
		for (const e of s.enemies || []) {
			if (e.alive === false) continue;
			this.wireSphere(p, e.x, e.y, e.z, e.r || 230, "#ec9d6f");
			const bearing =
				{ nose: 0, starboard: Math.PI / 2, tail: Math.PI, port: -Math.PI / 2 }[
					e.bearing
				] || 0;
			let last = { x: e.x, y: e.y, z: e.z };
			for (let future = 0.5; future <= 8; future += 0.5) {
				const time = (e.t || 0) + future,
					range =
						time < 6
							? 20000 - time * 900
							: time < 25
								? e.pattern === "pursuit"
									? 6500
									: Math.max(4500, 14600 - (time - 6) * 550)
								: 4500 + (time - 25) * 1900;
				const yaw = aircraft.yaw + bearing + Math.sin(time * 0.45) * 0.2,
					side = Math.sin(time * 0.8) * 700;
				const point = {
					x:
						aircraft.x +
						Math.cos(aircraft.yaw) * aircraft.speed * future +
						Math.cos(yaw) * range -
						Math.sin(yaw) * side,
					y:
						aircraft.y +
						Math.sin(aircraft.yaw) * aircraft.speed * future +
						Math.sin(yaw) * range +
						Math.cos(yaw) * side,
					z: aircraft.z + Math.sin(time * 0.7) * 700 + 400,
				};
				p.at();
				p.tube(
					last.x + ORIGIN.x,
					last.y + ORIGIN.y,
					last.z,
					point.x + ORIGIN.x,
					point.y + ORIGIN.y,
					point.z,
					9,
					"#dbb87b",
				);
				last = point;
			}
		}
		for (const f of s.flak || [])
			if (!f.burst) this.wireSphere(p, f.x, f.y, f.z, f.r || 2400, "#e6ad70");
		// Actual previous→current swept collision segments, plus the next quarter-second ray.
		p.at();
		for (const q of s.shots || []) {
			p.tube(
				(q.px ?? q.x) + ORIGIN.x,
				(q.py ?? q.y) + ORIGIN.y,
				q.pz ?? q.z,
				q.x + ORIGIN.x,
				q.y + ORIGIN.y,
				q.z,
				8,
				"#a1e3e1",
			);
			p.tube(
				q.x + ORIGIN.x,
				q.y + ORIGIN.y,
				q.z,
				q.x + ORIGIN.x + (q.vx || 0) * 0.25,
				q.y + ORIGIN.y + (q.vy || 0) * 0.25,
				q.z + (q.vz || 0) * 0.25,
				5,
				"#80b7c4",
			);
		}
		// Authored location gates remain visible while designers move targets or waypoints.
		for (const gate of definition.encounters || []) {
			const x = gate.x + ORIGIN.x,
				y0 = ORIGIN.y - 100000,
				y1 = ORIGIN.y + 120000,
				z1 = (definition.cruise || 14400) * 1.8;
			p.tube(x, y0, 40, x, y1, 40, 12, "#d4c28c")
				.tube(x, y0, 40, x, y0, z1, 12, "#d4c28c")
				.tube(x, y1, 40, x, y1, z1, 12, "#d4c28c")
				.tube(x, y0, z1, x, y1, z1, 12, "#d4c28c");
		}
		if (s.route) {
			p.at();
			p.tube(
				aircraft.x + ORIGIN.x,
				aircraft.y + ORIGIN.y,
				aircraft.z,
				s.route.x + ORIGIN.x,
				s.route.y + ORIGIN.y,
				150,
				6,
				"#d8de91",
			);
		}
	}
	hints(r, p, i) {
		const E = this.E,
			s = this.state,
			a = s.aircraft;
		if (!a || this.options.exterior) return;
		const vp = r.viewport || { x: 0, y: 0, w: r.W, h: r.H },
			inPane = (q) =>
				q &&
				q[0] > vp.x + 8 &&
				q[0] < vp.x + vp.w - 8 &&
				q[1] > vp.y + 8 &&
				q[1] < vp.y + vp.h - 8;
		const rect = (g, x, y, w, h, c) => {
			E.px.rect(g, x, y, w, 1, c);
			E.px.rect(g, x, y + h - 1, w, 1, c);
			E.px.rect(g, x, y, 1, h, c);
			E.px.rect(g, x + w - 1, y, 1, h, c);
		};
		r.overlay((g) => {
			if (p.station === "bombs") {
				const impact = s.prediction,
					coarse = s.sightDamaged,
					q = impact
						? this.projectFor(
								i,
								coarse ? Math.round(impact.x / 1024) * 1024 : impact.x,
								coarse ? Math.round(impact.y / 1024) * 1024 : impact.y,
								impact.z || 0,
							)
						: [vp.x + vp.w / 2, vp.y + vp.h / 2];
				if (inPane(q)) {
					const x = Math.round(q[0]),
						y = Math.round(q[1]),
						c = (a.hull || 100) > 25 ? C.cream : C.amber;
					if (coarse) {
						rect(g, x - 15, y - 14, 31, 29, C.amber);
						E.px.rect(g, x - 17, y - 16, 6, 2, C.ink);
						E.px.rect(g, x + 12, y + 13, 6, 2, C.ink);
					} else {
						E.px.rect(g, x - 19, y, 13, 1, c);
						E.px.rect(g, x + 7, y, 13, 1, c);
						E.px.rect(g, x, y - 19, 1, 13, c);
						E.px.rect(g, x, y + 7, 1, 13, c);
						rect(g, x - 5, y - 5, 11, 11, c);
					}
				}
				for (const target of s.targets || []) {
					if (
						s.sightDamaged ||
						target.alive === false ||
						Math.hypot(target.x - a.x, target.y - a.y) > 70000
					)
						continue;
					const q = this.projectFor(
						i,
						target.x,
						target.y,
						(target.z || 0) + 200,
					);
					if (!inPane(q)) continue;
					const x = Math.round(q[0]),
						y = Math.round(q[1]);
					rect(g, x - 10, y - 9, 21, 19, C.amber);
				}
			} else if (p.station && p.station !== "pilot") {
				const x = Math.round(vp.x + vp.w / 2),
					y = Math.round(vp.y + vp.h / 2);
				E.px.rect(g, x - 15, y, 10, 1, C.cream);
				E.px.rect(g, x + 6, y, 10, 1, C.cream);
				E.px.rect(g, x, y - 15, 1, 10, C.cream);
				E.px.rect(g, x, y + 6, 1, 10, C.cream);
				E.px.rect(g, x, y, 1, 1, C.amber);
				for (const enemy of s.enemies || []) {
					if (enemy.alive === false || enemy.hp === 0) continue;
					const q = this.projectFor(i, enemy.x, enemy.y, enemy.z);
					if (!inPane(q)) continue;
					const x = Math.round(q[0]),
						y = Math.round(q[1]);
					E.px.rect(g, x - 12, y - 10, 5, 1, C.danger);
					E.px.rect(g, x - 12, y - 10, 1, 5, C.danger);
					E.px.rect(g, x + 8, y + 10, 5, 1, C.danger);
					E.px.rect(g, x + 12, y + 6, 1, 5, C.danger);
				}
			} else if (s.route) {
				const q = this.projectFor(
					i,
					s.route.x,
					s.route.y,
					Math.max(1200, a.z * 0.65),
				);
				if (inPane(q)) {
					const x = Math.round(q[0]),
						y = Math.round(q[1]);
					E.px.poly(
						g,
						[
							[x, y - 7],
							[x + 7, y],
							[x, y + 7],
							[x - 7, y],
						],
						C.amber,
					);
					E.px.poly(
						g,
						[
							[x, y - 4],
							[x + 4, y],
							[x, y + 4],
							[x - 4, y],
						],
						C.ink,
					);
				}
			}
		});
	}
	dispose() {
		const geometries = new Set(),
			materials = new Set();
		for (const overlay of this.stationOverlays || []) {
			overlay.scene.traverse((object) => {
				if (object.geometry) geometries.add(object.geometry);
				if (object.material)
					for (const material of Array.isArray(object.material)
						? object.material
						: [object.material])
						materials.add(material);
			});
			overlay.scene.clear();
		}
		for (const geometry of geometries) geometry.dispose();
		for (const material of materials) material.dispose();
		this.stationOverlays = [];
		if (this.world) {
			this.world.dispose();
			this.world = null;
		}
		for (const m of this._cloudMaterials || []) m.dispose();
	}
}
export const VIEW_PALETTE = C;
export const VIEW_ORIGIN = ORIGIN;
