const INK = 0x061b24,
	COLORS = [0xffc168, 0x82d7df, 0xd3a1ed, 0x9ae2c7];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const round = (n) => Math.round(n * 100) / 100;
const seeded = (s) => () => {
	s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
	return s / 4294967296;
};
const rnd = seeded(198411);
const MAT = new Map();
function cel(hex) {
	if (MAT.has(hex)) return MAT.get(hex);
	const { color, normalWorld, vec3 } = THREE.TSL;
	const m = new THREE.MeshBasicNodeMaterial();
	const n = normalWorld
		.dot(vec3(0.35, 0.68, 1).normalize())
		.mul(0.5)
		.add(0.5)
		.mul(3)
		.floor()
		.div(3)
		.mul(0.5)
		.add(0.5);
	m.colorNode = color(hex).mul(n);
	MAT.set(hex, m);
	return m;
}
const inkMat = new THREE.MeshBasicMaterial({
	color: INK,
	side: THREE.BackSide,
});
const glowMat = (color, opacity = 0.2) =>
	new THREE.MeshBasicMaterial({
		color,
		transparent: true,
		opacity,
		depthWrite: false,
		side: THREE.DoubleSide,
		blending: THREE.AdditiveBlending,
	});
function mesh(geo, color, parent, x = 0, y = 0, z = 0, outline = true) {
	const m = new THREE.Mesh(geo, cel(color));
	m.position.set(x, y, z);
	if (parent) parent.add(m);
	if (outline) {
		const o = new THREE.Mesh(geo, inkMat);
		o.scale.setScalar(1.055);
		m.add(o);
	}
	return m;
}
const BOX = new THREE.BoxGeometry(1, 1, 1),
	SPHERE = new THREE.SphereGeometry(1, 12, 8),
	ROCK = new THREE.DodecahedronGeometry(1, 0);
function box(parent, x, y, z, w, h, d, color, outline = true) {
	const m = mesh(BOX, color, parent, x, y, z, outline);
	m.scale.set(w, h, d);
	return m;
}
function orb(parent, x, y, z, w, h, d, color, outline = true) {
	const m = mesh(SPHERE, color, parent, x, y, z, outline);
	m.scale.set(w, h, d);
	return m;
}
function line(parent, points, color = INK, width = 1, opacity = 1) {
	const geo = new THREE.BufferGeometry().setFromPoints(
		points.map((p) => new THREE.Vector3(...p)),
	);
	const l = new THREE.Line(
		geo,
		new THREE.LineBasicMaterial({
			color,
			linewidth: width,
			transparent: opacity < 1,
			opacity,
		}),
	);
	parent.add(l);
	return l;
}
function cylinder(parent, x, y, z, r, h, color, segments = 8) {
	return mesh(
		new THREE.CylinderGeometry(r, r, h, segments),
		color,
		parent,
		x,
		y,
		z,
	);
}
function sign(
	parent,
	text,
	x,
	y,
	w = 3.6,
	h = 0.8,
	color = "#9ae2c7",
	sub = "",
) {
	const c = document.createElement("canvas");
	c.width = 768;
	c.height = Math.round((768 * h) / w);
	const ctx = c.getContext("2d");
	ctx.fillStyle = "#092832";
	ctx.fillRect(0, 0, c.width, c.height);
	ctx.strokeStyle = color;
	ctx.lineWidth = 10;
	ctx.strokeRect(6, 6, c.width - 12, c.height - 12);
	ctx.fillStyle = color;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.font = "900 " + Math.round(c.height * (sub ? 0.39 : 0.53)) + "px Arial";
	ctx.fillText(text, c.width / 2, c.height * (sub ? 0.39 : 0.52));
	if (sub) {
		ctx.font = "bold " + Math.round(c.height * 0.17) + "px Arial";
		ctx.fillText(sub, c.width / 2, c.height * 0.77);
	}
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.SRGBColorSpace;
	const m = new THREE.Mesh(
		new THREE.PlaneGeometry(w, h),
		new THREE.MeshBasicMaterial({ map: t, transparent: true }),
	);
	m.position.set(x, y, 1.85);
	parent.add(m);
	return m;
}
function makePerson(color = COLORS[0], miner = false) {
	const root = new THREE.Group();
	const body = new THREE.Group();
	body.name = "Suit";
	root.add(body);
	const suit = miner ? 0xc08053 : 0x4c9d92;
	box(body, 0, 0.02, 0, 0.66, 0.72, 0.44, suit);
	box(body, 0, -0.21, 0.25, 0.52, 0.12, 0.08, 0x183f4b);
	box(body, 0.03, 0.24, 0.265, 0.14, 0.15, 0.04, 0xf6e6bc);
	const head = new THREE.Group();
	head.name = "Head";
	head.position.y = 0.6;
	body.add(head);
	orb(head, 0, 0.11, 0, 0.46, 0.4, 0.37, color);
	box(head, 0, -0.01, 0.3, 0.72, 0.25, 0.22, 0x102c39);
	box(head, 0.12, 0.02, 0.425, 0.37, 0.055, 0.02, 0xb1f2df, false);
	box(head, 0, -0.2, 0.2, 0.29, 0.13, 0.21, 0x193943);
	box(head, 0, 0.31, 0.1, 0.45, 0.07, 0.35, 0xedd19a);
	cylinder(head, 0, 0.25, 0.38, 0.14, 0.2, 0xede9cf).rotation.x = Math.PI / 2;
	orb(head, 0, 0.25, 0.5, 0.105, 0.1, 0.04, 0xd8ffe9, false);
	for (const [name, x] of [
		["LegL", -0.2],
		["LegR", 0.2],
	]) {
		const g = new THREE.Group();
		g.name = name;
		g.position.set(x, -0.3, 0);
		body.add(g);
		box(g, 0, -0.18, 0, 0.24, 0.4, 0.29, suit);
		box(g, 0.025, -0.43, 0.07, 0.29, 0.22, 0.43, 0x173b46);
		box(g, 0.025, -0.51, 0.08, 0.31, 0.065, 0.45, color);
	}
	for (const [name, x] of [
		["ArmL", -0.43],
		["ArmR", 0.43],
	]) {
		const g = new THREE.Group();
		g.name = name;
		g.position.set(x, 0.22, 0);
		body.add(g);
		box(g, 0, -0.16, 0, 0.21, 0.4, 0.25, suit);
		orb(g, 0, -0.39, 0.025, 0.15, 0.14, 0.15, color);
	}
	const gun = new THREE.Group();
	gun.name = "Gun";
	gun.position.set(0.4, 0.14, 0.25);
	body.add(gun);
	box(gun, 0.27, 0, 0, 0.54, 0.17, 0.21, 0x263f4b);
	box(gun, 0.53, 0, 0, 0.12, 0.23, 0.26, color);
	orb(gun, 0.61, 0, 0, 0.07, 0.08, 0.1, 0xa8f5e4, false);
	const pack = new THREE.Group();
	pack.position.set(0, 0.12, -0.32);
	body.add(pack);
	box(pack, 0, 0, -0.1, 0.61, 0.67, 0.32, 0x1b3e4a);
	for (const x of [-0.29, 0.29]) {
		cylinder(pack, x, -0.03, -0.12, 0.16, 0.65, color);
		cylinder(pack, x, -0.41, -0.12, 0.1, 0.14, 0x203641);
	}
	const rotor = new THREE.Group();
	rotor.name = "Rotor";
	rotor.position.set(0, 0.94, -0.35);
	body.add(rotor);
	cylinder(rotor, 0, -0.14, 0, 0.065, 0.3, 0x102c38);
	for (let i = 0; i < 3; i++) {
		const blade = box(rotor, 0, 0, 0, 1.3, 0.035, 0.12, 0x466267);
		blade.rotation.y = (i * Math.PI * 2) / 3;
	}
	cylinder(rotor, 0, 0.05, 0, 0.12, 0.1, color);
	const scarf = new THREE.Group();
	scarf.name = "Scarf";
	scarf.position.set(-0.28, 0.4, -0.18);
	body.add(scarf);
	const s = box(scarf, -0.24, 0, 0, 0.55, 0.16, 0.06, 0xff8059);
	s.rotation.z = -0.2;
	const flames = new THREE.Group();
	flames.name = "Flames";
	root.add(flames);
	for (const x of [-0.29, 0.29]) {
		const f = mesh(
			new THREE.ConeGeometry(0.13, 0.7, 5),
			0x9ae2c7,
			flames,
			x,
			-0.65,
			-0.5,
			false,
		);
		f.rotation.z = Math.PI;
		f.name = "Flame";
	}
	flames.visible = false;
	const halo = new THREE.Mesh(
		new THREE.CircleGeometry(0.22, 16),
		glowMat(0xc3ffe1, 0.45),
	);
	halo.position.set(0, 0.85, 0.56);
	root.add(halo);
	const mixer = new THREE.AnimationMixer(root);
	const tracks = (name, values, duration = 1) =>
		new THREE.NumberKeyframeTrack(
			name,
			[0, duration / 4, duration / 2, (duration * 3) / 4, duration],
			values,
		);
	const idle = new THREE.AnimationClip("breathe", 2.4, [
		tracks("Head.position[y]", [0.6, 0.625, 0.63, 0.625, 0.6], 2.4),
		tracks("Scarf.rotation[z]", [-0.1, 0.1, -0.05, 0.08, -0.1], 2.4),
	]);
	const walk = new THREE.AnimationClip("walk", 0.6, [
		tracks("LegL.rotation[z]", [-0.5, 0, 0.5, 0, -0.5], 0.6),
		tracks("LegR.rotation[z]", [0.5, 0, -0.5, 0, 0.5], 0.6),
		tracks("ArmL.rotation[z]", [0.35, 0, -0.35, 0, 0.35], 0.6),
	]);
	const fly = new THREE.AnimationClip("jetpack", 0.8, [
		tracks("LegL.rotation[z]", [-0.2, -0.3, -0.22, -0.1, -0.2], 0.8),
		tracks("LegR.rotation[z]", [0.25, 0.1, 0.2, 0.35, 0.25], 0.8),
		tracks("Scarf.rotation[z]", [-0.8, -0.5, -0.9, -0.6, -0.8], 0.8),
	]);
	const wave = new THREE.AnimationClip("signal", 1.2, [
		tracks("ArmL.rotation[z]", [-2.1, -2.7, -2.1, -2.7, -2.1], 1.2),
		tracks("ArmR.rotation[z]", [0.2, 0.1, 0.2, 0.3, 0.2], 1.2),
	]);
	const spin = new THREE.AnimationClip("rotor", 0.18, [
		new THREE.NumberKeyframeTrack(
			"Rotor.rotation[y]",
			[0, 0.18],
			[0, Math.PI * 2],
		),
	]);
	const actions = {
		idle: mixer.clipAction(idle),
		walk: mixer.clipAction(walk),
		fly: mixer.clipAction(fly),
		wave: mixer.clipAction(wave),
	};
	for (const [key, a] of Object.entries(actions)) {
		a.play();
		a.setEffectiveWeight(key === (miner ? "wave" : "idle") ? 1 : 0);
	}
	mixer.clipAction(spin).play();
	return {
		root,
		body,
		head,
		gun,
		flames,
		mixer,
		actions,
		halo,
		animate(dt, state = "idle", face = 1, aim = 0) {
			mixer.update(dt);
			for (const [key, a] of Object.entries(actions))
				a.setEffectiveWeight(
					lerp(
						a.getEffectiveWeight(),
						key === state ? 1 : 0,
						Math.min(1, dt * 12),
					),
				);
			root.scale.x = Math.abs(root.scale.x) * face;
			gun.rotation.z = aim;
			flames.visible = state === "fly";
			if (flames.visible)
				flames.scale.y = 0.8 + Math.sin(performance.now() * 0.04) * 0.25;
			body.rotation.z = lerp(
				body.rotation.z,
				state === "fly" ? -face * 0.08 : 0,
				Math.min(1, dt * 7),
			);
		},
	};
}
function makeEnemy(kind) {
	const g = new THREE.Group();
	const mixer = new THREE.AnimationMixer(g);
	let clip;
	if (kind === "bat") {
		orb(g, 0, 0, 0, 0.35, 0.28, 0.2, 0xb784ac);
		for (const x of [-0.13, 0.13])
			orb(g, x, 0.06, 0.19, 0.055, 0.07, 0.045, 0xffc168, false);
		for (let s of [-1, 1]) {
			const wing = new THREE.Group();
			wing.name = s === -1 ? "WingL" : "WingR";
			g.add(wing);
			const shape = new THREE.Shape();
			shape.moveTo(0, 0.1);
			shape.lineTo(s * 0.9, 0.45);
			shape.lineTo(s * 0.7, -0.25);
			shape.lineTo(s * 0.4, -0.05);
			shape.lineTo(0, -0.15);
			const geo = new THREE.ExtrudeGeometry(shape, {
				depth: 0.08,
				bevelEnabled: false,
			});
			mesh(geo, 0x685b87, wing);
			mesh(
				new THREE.ConeGeometry(0.1, 0.27, 4),
				0xc187b6,
				g,
				s * 0.18,
				0.31,
				0,
			);
		}
		clip = new THREE.AnimationClip("wingbeat", 0.4, [
			new THREE.NumberKeyframeTrack(
				"WingL.rotation[z]",
				[0, 0.2, 0.4],
				[0.4, -0.65, 0.4],
			),
			new THREE.NumberKeyframeTrack(
				"WingR.rotation[z]",
				[0, 0.2, 0.4],
				[-0.4, 0.65, -0.4],
			),
		]);
	} else if (kind === "spider") {
		orb(g, 0, 0, 0, 0.4, 0.28, 0.25, 0xd59467);
		orb(g, 0.31, 0.02, 0.15, 0.17, 0.17, 0.16, 0x3d6870);
		for (let i = 0; i < 6; i++) {
			const side = i < 3 ? -1 : 1;
			const leg = new THREE.Group();
			leg.name = "L" + i;
			g.add(leg);
			const x = ((i % 3) - 1) * 0.25;
			line(
				leg,
				[
					[x, 0, 0.08],
					[x + side * 0.3, -0.03, 0.1],
					[x + side * 0.5, -0.28, 0.1],
				],
				0x152c37,
			);
			box(
				leg,
				x + side * 0.28,
				-0.04,
				0.05,
				0.5,
				0.07,
				0.08,
				0x243f48,
			).rotation.z = side * 0.2;
		}
		clip = new THREE.AnimationClip(
			"skitter",
			0.35,
			Array.from(
				{ length: 6 },
				(_, i) =>
					new THREE.NumberKeyframeTrack(
						"L" + i + ".rotation[z]",
						[0, 0.175, 0.35],
						[i % 2 ? 0.18 : -0.18, i % 2 ? -0.18 : 0.18, i % 2 ? 0.18 : -0.18],
					),
			),
		);
	} else {
		orb(g, 0, 0, 0, 0.46, 0.48, 0.32, 0x6eb3a0);
		for (let i = 0; i < 6; i++) {
			const a = (i * Math.PI) / 3;
			const p = mesh(
				new THREE.ConeGeometry(0.14, 0.5, 4),
				0xf4b17d,
				g,
				Math.cos(a) * 0.45,
				Math.sin(a) * 0.45,
				0,
			);
			p.rotation.z = a - Math.PI / 2;
		}
		orb(g, 0, 0, 0.29, 0.22, 0.22, 0.11, 0x132f3a);
		orb(g, 0, 0, 0.41, 0.1, 0.1, 0.03, 0xff8061, false);
		clip = new THREE.AnimationClip("spore", 2, [
			new THREE.NumberKeyframeTrack(
				".rotation[z]",
				[0, 1, 2],
				[-0.08, 0.08, -0.08],
			),
		]);
	}
	mixer.clipAction(clip).play();
	return { root: g, mixer };
}
const worldPlayerLives = (count, lives) =>
	count > 1 ? Math.max(1, lives - 1) : lives - 1;
const DEFAULT_TUNING = {
	moveSpeed: 6.2,
	jetThrust: 38,
	fuelDrain: 18,
	airDrain: 1,
	damage: 1,
	blastRadius: 4.2,
	enemySpeed: 1,
	god: false,
	noclip: false,
};
const CREW_DATA = [
	{
		name: "PIP",
		x: 16,
		y: -9.64,
		sector: 0,
		color: 0xffc168,
		quip: "THOUGHT YOU’D NEVER CLOCK IN.",
	},
	{
		name: "DOT",
		x: -16,
		y: -25.64,
		sector: 1,
		color: 0x90d6da,
		quip: "MY SOCKS HAVE CLOCKED OUT.",
	},
	{
		name: "GUS",
		x: 16,
		y: -48.14,
		sector: 2,
		color: 0xc0a1df,
		quip: "LET’S CALL THAT A WARM-UP.",
	},
];
class RescueWorld {
	constructor(scene, onEvent) {
		this.scene = scene;
		this.events = onEvent;
		this.tuning = { ...DEFAULT_TUNING };
		this.group = new THREE.Group();
		scene.add(this.group);
		this.fxGroup = new THREE.Group();
		scene.add(this.fxGroup);
		this.physics = new RAPIER.World({ x: 0, y: -18, z: 0 });
		this.physics.timestep = 1 / 60;
		this.statics = [];
		this.gates = [];
		this.players = [];
		this.enemies = [];
		this.crew = [];
		this.shots = [];
		this.bombs = [];
		this.particles = [];
		this.stations = [];
		this.time = 0;
		this.rescued = 0;
		this.score = 0;
		this.kills = 0;
		this.charges = 0;
		this.shotsFired = 0;
		this.status = "idle";
		this.nextId = 1;
		this.demo = false;
		this.seq = 0;
		this.fxEvents = [];
		this.build();
		this.reset([0]);
	}
	emit(type, data = {}) {
		this.events?.(type, data);
		if (
			["blast", "rescue", "deliver", "kill", "shot", "hurt", "refill"].includes(
				type,
			)
		) {
			this.fxEvents.push({ seq: ++this.seq, type, ...data });
			if (this.fxEvents.length > 8) this.fxEvents.shift();
		}
	}
	fixedBox(x, y, w, h, visual = true, color = 0x28525a) {
		const body = this.physics.createRigidBody(
			RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, 0),
		);
		const c = this.physics.createCollider(
			RAPIER.ColliderDesc.cuboid(w / 2, h / 2, 1.5)
				.setFriction(0.8)
				.setCollisionGroups(0x0001ffff),
			body,
		);
		this.statics.push({ body, collider: c, x, y, w, h });
		if (visual) box(this.group, x, y, -0.45, w, h, 2.6, color);
		return { body, collider: c };
	}
	rockWall(x, y, w, h, color) {
		this.fixedBox(x, y, w, h, true, color);
		const count = Math.max(8, Math.round((w * h) / 7));
		for (let i = 0; i < count; i++) {
			const px = x + (rnd() - 0.5) * (w - 0.5),
				py = y + (rnd() - 0.5) * (h - 0.4);
			const m = mesh(
				ROCK,
				i % 3 === 0 ? color + 0x050807 : color,
				this.group,
				px,
				py,
				1.1,
				false,
			);
			m.scale.set(0.6 + rnd() * 1.3, 0.35 + rnd() * 0.6, 0.08 + rnd() * 0.16);
			m.rotation.z = rnd() * 6;
		}
		for (let j = 0; j < Math.max(6, h / 1.6); j++) {
			const px = x + (rnd() - 0.5) * w,
				py = y + (rnd() - 0.5) * h;
			line(
				this.group,
				[
					[px - 0.2, py, 1.34],
					[px + 0.3, py + 0.1, 1.34],
					[px + 0.55, py - 0.13, 1.34],
				],
				0x102e39,
				1,
				0.65,
			);
		}
		const edge = x < 0 ? x + w / 2 : x - w / 2;
		for (let j = 0; j < h; j += 0.9) {
			const m = mesh(
				ROCK,
				color,
				this.group,
				edge + (x < 0 ? -0.2 : 0.2),
				y - h / 2 + j + 0.3,
				0,
			);
			m.scale.set(0.35 + rnd() * 0.3, 0.65, 1.4);
			m.rotation.z = rnd();
		}
	}
	build() {
		box(this.group, 0, -27, -5.6, 48, 82, 0.4, 0x061e2a, false);
		const zones = [
			{ y: -7.3, h: 15, col: 0x143b48 },
			{ y: -23, h: 17, col: 0x163c4b },
			{ y: -44, h: 20, col: 0x2e3544 },
		];
		for (const z of zones) {
			box(this.group, 0, z.y, -4.9, 38, z.h, 0.2, z.col, false);
			for (let i = 0; i < 30; i++) {
				const m = mesh(
					ROCK,
					z.col + 0x030504,
					this.group,
					(rnd() - 0.5) * 37,
					z.y + (rnd() - 0.5) * z.h,
					-4.5,
					false,
				);
				m.scale.set(1 + rnd() * 2, 0.5 + rnd(), 0.13);
				m.rotation.z = rnd() * 6;
			}
		}
		this.rockWall(-12.25, -8.35, 15.5, 19.3, 0x2b5960);
		this.rockWall(12.25, -0.35, 15.5, 3.3, 0x2b5960);
		this.rockWall(12.25, -24.25, 15.5, 27.5, 0x26505d);
		this.rockWall(-12.25, -42.75, 15.5, 32.5, 0x263f4e);
		this.rockWall(12.25, -54, 15.5, 10, 0x4b414d);
		this.fixedBox(-20.5, -26, 0.8, 70, false);
		this.fixedBox(20.5, -26, 0.8, 70, false);
		this.fixedBox(0, -59.5, 42, 1.2, true, 0x344851);
		this.fixedBox(0, 12, 42, 1, false);
		for (let i = 0; i < 3; i++) {
			const c = CREW_DATA[i];
			const gateX = i === 1 ? -5.05 : 5.05;
			const top = [-2, -18, -38][i],
				bottom = [-10.5, -26.5, -49][i];
			const y = (top + bottom) / 2;
			const o = this.fixedBox(gateX, y, 0.85, top - bottom, false);
			const group = new THREE.Group();
			this.group.add(group);
			box(group, gateX, y, 0.1, 1, top - bottom, 2, 0x98744f);
			for (let j = bottom + 0.3; j < top; j += 0.75) {
				const rock = mesh(
					ROCK,
					j % 2 ? 0xd9a16a : 0xbc895e,
					group,
					gateX,
					j,
					1.2,
				);
				rock.scale.set(0.6, 0.55, 0.4);
				rock.rotation.z = rnd() * 4;
			}
			for (let j = 0; j < 4; j++) {
				const b = box(
					group,
					gateX,
					y - 2 + j * 1.3,
					1.7,
					0.82,
					0.16,
					0.07,
					0xffc168,
				);
				b.rotation.z = -0.4;
			}
			sign(group, "BLAST", gateX, y + 1.25, 1.5, 0.55, "#ffc168");
			this.gates.push({
				id: i,
				...o,
				group,
				x: gateX,
				y,
				h: top - bottom,
				open: false,
			});
			const side = i === 1 ? -1 : 1;
			for (let x = 7; x < 19; x += 4) {
				const xx = x * side;
				box(this.group, xx, bottom + 3, -2.2, 0.2, 6.1, 0.3, 0x3a6165);
				box(this.group, xx, top - 0.3, -2.2, 0.5, 0.25, 0.5, 0x48777a);
			}
			box(this.group, side * 11.7, top - 0.8, -2.7, 13, 0.16, 0.3, 0x345c62);
			sign(
				this.group,
				["01 / CHALK", "02 / THE SUMP", "03 / EMBER"][i],
				side * 12,
				top - 1.6,
				4.4,
				0.95,
				["#9ae2c7", "#91d7df", "#ffc168"][i],
			);
		}
		const ledges = [
			[-2.8, -14.8],
			[2.8, -31],
			[-2.8, -39.2],
			[2.8, -53.2],
		];
		for (let i = 0; i < ledges.length; i++) {
			const [x, y] = ledges[i];
			this.fixedBox(x, y, 3.4, 0.55, true, 0x507273);
			box(this.group, x, y + 0.34, 0.2, 3.5, 0.16, 2.8, 0x8ba99c);
			for (let j = 0; j < 7; j++) {
				const b = box(
					this.group,
					x - 1.45 + j * 0.45,
					y + 0.45,
					1.5,
					0.18,
					0.07,
					0.08,
					j % 2 ? 0x223b45 : 0xe9b579,
					false,
				);
				b.rotation.z = -0.3;
			}
			if (i !== 2) {
				const s = { x, y: y + 0.85, id: i };
				this.stations.push(s);
				this.makeStation(x, y + 0.85);
			}
		}
		this.lift = { x: -11.8, y: 2.8 };
		this.fixedBox(-11.8, 1.7, 5.8, 0.45, false);
		box(this.group, -11.8, 1.7, -0.05, 5.8, 0.45, 2.9, 0xc6b68e);
		box(this.group, -11.8, 1.96, 1.4, 5.8, 0.12, 0.12, 0xffc168);
		for (const x of [-14.7, -8.9]) {
			box(this.group, x, 4.2, -0.7, 0.3, 5.1, 0.4, 0x548881);
			box(this.group, x, 2.6, 1, 0.18, 1.4, 0.2, 0x7b9c90);
		}
		box(this.group, -11.8, 6.7, -0.6, 6.3, 0.5, 1, 0x3e6c6b);
		sign(
			this.group,
			"LAST LIFT",
			-11.8,
			5.72,
			4.8,
			1.05,
			"#ffc168",
			"EVERYBODY GETS HOME",
		);
		this.makeStation(-8, 2.3);
		this.stations.push({ id: 99, x: -8, y: 2.3 });
		for (const x of [-16.7, 16.7]) {
			box(this.group, x, 4.6, -3, 0.22, 6, 0.2, 0x46666a);
			const lamp = mesh(
				new THREE.ConeGeometry(0.7, 0.35, 8),
				0x83b4a5,
				this.group,
				x,
				7.4,
				-3,
			);
			lamp.rotation.z = Math.PI;
			const cone = new THREE.Mesh(
				new THREE.ConeGeometry(3.4, 11, 18, 1, true),
				glowMat(0x9ae2c7, 0.055),
			);
			cone.position.set(x, 1.7, -2.4);
			this.group.add(cone);
		}
		for (let y = 0; y > -58; y -= 4.4) {
			box(this.group, -3.95, y, -2.4, 0.12, 3.9, 0.16, 0x69958e);
			for (let j = 0; j < 5; j++)
				box(
					this.group,
					-3.95,
					y - 1.5 + j * 0.65,
					-2.25,
					0.6,
					0.07,
					0.1,
					0x638980,
					false,
				);
			box(this.group, 4.04, y, -2.4, 0.13, 4.5, 0.18, 0x5e6367);
			const lamp = orb(
				this.group,
				3.8,
				y + 0.2,
				-1,
				0.1,
				0.19,
				0.1,
				0xffbd72,
				false,
			);
			const halo = new THREE.Mesh(
				new THREE.CircleGeometry(0.8, 20),
				glowMat(0xffa15a, 0.12),
			);
			halo.position.set(3.8, y + 0.2, -1.15);
			this.group.add(halo);
		}
		line(
			this.group,
			[
				[-3, 6, -3.8],
				[-2.8, 0, -3.8],
				[-3.1, -13, -3.8],
				[-2.9, -29, -3.8],
				[-3.3, -57, -3.8],
			],
			0x9c805b,
		);
		line(
			this.group,
			[
				[3.3, 6, -3.8],
				[3.4, -10, -3.8],
				[3.1, -29, -3.8],
				[3.5, -57, -3.8],
			],
			0x456e79,
		);
		for (let i = 0; i < 46; i++) {
			const sector = i % 3;
			const x = (rnd() > 0.5 ? 1 : -1) * (5 + rnd() * 13);
			const y = [-8, -24, -46][sector] + (rnd() - 0.5) * 4;
			const g = new THREE.Group();
			this.group.add(g);
			g.position.set(x, y, -3.4);
			for (let j = 0; j < 3; j++) {
				const c = mesh(
					new THREE.ConeGeometry(0.12 + rnd() * 0.2, 0.6 + rnd() * 1.2, 5),
					[0x72bfae, 0x778bb5, 0xd58a60][sector],
					g,
					(j - 1) * 0.25,
					0,
					0,
				);
				c.rotation.z = (j - 1) * 0.3;
			}
		}
		for (let y = -1; y > -56; y -= 2.5) {
			for (const side of [-1, 1]) {
				const p = mesh(
					new THREE.ConeGeometry(0.22, 0.8 + rnd() * 0.5, 5),
					0x254952,
					this.group,
					side * (4.4 - rnd() * 0.25),
					y,
					0.4,
				);
				p.rotation.z = (side * Math.PI) / 2;
			}
		}
		this.water = new THREE.Mesh(
			new THREE.BoxGeometry(7.4, 1.8, 2.8),
			new THREE.MeshBasicMaterial({
				color: 0x3dabb5,
				transparent: true,
				opacity: 0.29,
				depthWrite: false,
			}),
		);
		this.water.position.set(-13, -25.55, 0.45);
		this.group.add(this.water);
		line(
			this.group,
			[
				[-16.7, -24.65, 2],
				[-9.3, -24.65, 2],
			],
			0x7ee6e0,
		);
		for (let i = 0; i < 12; i++)
			line(
				this.group,
				[
					[-16.6 + i * 0.6, -24.7 + (i % 2) * 0.1, 1.9],
					[-16.2 + i * 0.6, -24.7 + (i % 2) * 0.1, 1.9],
				],
				0x9ae2c7,
				1,
				0.7,
			);
		this.lava = new THREE.Group();
		this.group.add(this.lava);
		box(this.lava, 10.7, -48.86, 0.3, 6.7, 0.42, 2.8, 0xf7854f, false);
		for (let i = 0; i < 13; i++) {
			const m = orb(
				this.lava,
				7.7 + i * 0.5,
				-48.57,
				0.9,
				0.35,
				0.09,
				0.4,
				0xffc168,
				false,
			);
			m.name = "Lava";
		}
		this.vent = { x: 11, y: -48.2 };
		cylinder(this.group, 11, -48.25, 0.1, 0.38, 0.7, 0x6b655d);
		sign(this.group, "HOT WORK", 13.7, -45.8, 2.6, 0.7, "#ffac75");
		this.steam = new THREE.Group();
		this.group.add(this.steam);
		for (let i = 0; i < 8; i++) {
			const m = orb(
				this.steam,
				11,
				-47 + i * 0.45,
				0.1,
				0.35 + i * 0.08,
				0.45,
				0.3,
				0xffc7a0,
				false,
			);
			m.material = glowMat(0xffb488, 0.13);
		}
		sign(this.group, "↓ THE SHIFT CONTINUES", 0, -17, 4, 0.62, "#759ba0");
		sign(this.group, "↑ HOME IS UP", 0, -35.7, 3.2, 0.6, "#83bdb1");
		this.crew = CREW_DATA.map((c, i) => {
			const model = makePerson(c.color, true);
			model.root.position.set(c.x, c.y, 0.1);
			this.group.add(model.root);
			return { ...c, id: i, model, state: "waiting", carrier: null };
		});
		this.enemyDefinitions = [
			["bat", 0.7, -6.2],
			["spider", 11, -9.98],
			["bat", 12, -4.4],
			["bat", -1, -20],
			["spider", -11, -26],
			["bat", -13, -20.5],
			["spore", 2, -27.5],
			["bat", 1.3, -35.2],
			["spore", 9.5, -41],
			["bat", 15, -41.8],
			["spider", 15.7, -48.5],
			["spore", -1.7, -50],
		];
		this.enemyDefinitions.forEach(([kind, x, y], i) => {
			const model = makeEnemy(kind);
			this.group.add(model.root);
			this.enemies.push({
				id: i,
				kind,
				x,
				y,
				homeX: x,
				homeY: y,
				health: kind === "spore" ? 3 : 2,
				alive: true,
				phase: i * 0.77,
				cool: 1 + i * 0.25,
				model,
			});
		});
		this.titleGroup = new THREE.Group();
		this.scene.add(this.titleGroup);
		this.titleHero = makePerson();
		this.titleHero.root.position.set(9.2, -5.8, 4);
		this.titleHero.root.scale.setScalar(3.6);
		this.titleGroup.add(this.titleHero.root);
		this.titleHero.flames.visible = true;
		const rock = mesh(ROCK, 0x1d4b55, this.titleGroup, 10, -10, 2);
		rock.scale.set(6, 0.8, 2);
		const buddy = makePerson(0xffaa75, true);
		buddy.root.position.set(14.7, -8.45, 2);
		buddy.root.scale.setScalar(1.6);
		this.titleGroup.add(buddy.root);
		this.titleBuddy = buddy;
		sign(
			this.titleGroup,
			"ANOTHER DAY. ANOTHER RESCUE.",
			10.9,
			-11.6,
			9.1,
			0.8,
			"#a3cdb7",
		);
		this.tetherGeo = new THREE.BufferGeometry().setFromPoints([
			new THREE.Vector3(),
			new THREE.Vector3(),
		]);
	}
	makeStation(x, y) {
		box(this.group, x, y, 0.1, 0.85, 1.2, 0.6, 0x406f70);
		box(this.group, x, y + 0.1, 0.46, 0.6, 0.66, 0.12, 0x163d46);
		box(this.group, x, y + 0.1, 0.54, 0.42, 0.14, 0.03, 0x9ae2c7, false);
		box(this.group, x, y + 0.1, 0.55, 0.14, 0.42, 0.03, 0x9ae2c7, false);
		cylinder(this.group, x + 0.63, y - 0.15, 0, 0.19, 0.9, 0xe4b778);
		const h = new THREE.Mesh(
			new THREE.CircleGeometry(1.5, 20),
			glowMat(0x9ae2c7, 0.07),
		);
		h.position.set(x, y, -1);
		this.group.add(h);
	}
	addPlayer(id, color = COLORS[id % 4]) {
		const model = makePerson(color);
		this.group.add(model.root);
		const body = this.physics.createRigidBody(
			RAPIER.RigidBodyDesc.dynamic()
				.setTranslation(-11.8 + id, 2.8, 0)
				.lockRotations()
				.setLinearDamping(0.15)
				.setCcdEnabled(true),
		);
		body.setEnabledTranslations(true, true, false, true);
		const collider = this.physics.createCollider(
			RAPIER.ColliderDesc.capsule(0.43, 0.32)
				.setFriction(0)
				.setRestitution(0)
				.setCollisionGroups(0x00020001),
			body,
		);
		const rope = line(
			this.group,
			[
				[0, 0, 0.6],
				[0, 0, 0.6],
			],
			0xf4d39a,
		);
		rope.visible = false;
		const beamShape = new THREE.Shape();
		beamShape.moveTo(0, 0);
		beamShape.lineTo(8, 1.7);
		beamShape.lineTo(8, -1.7);
		beamShape.closePath();
		const beam = new THREE.Mesh(
			new THREE.ShapeGeometry(beamShape),
			glowMat(0xbdffe0, 0.035),
		);
		this.group.add(beam);
		const p = {
			id,
			model,
			body,
			collider,
			rope,
			beam,
			x: -11.8 + id,
			y: 2.8,
			vx: 0,
			vy: 0,
			face: 1,
			aimX: 1,
			aimY: 0,
			health: 5,
			lives: 3,
			fuel: 100,
			air: 180,
			bombs: 5,
			carrying: null,
			invuln: 0,
			shootCool: 0,
			bombCool: 0,
			interactCool: 0,
			grounded: false,
			thrusting: false,
			water: false,
			refillCool: 0,
			contribution: 0,
			downs: 0,
		};
		this.players.push(p);
		return p;
	}
	reset(ids = [0]) {
		for (const p of this.players) {
			this.physics.removeRigidBody(p.body);
			p.model.root.removeFromParent();
			p.rope.removeFromParent();
			p.beam.removeFromParent();
		}
		this.players = [];
		ids.forEach((i) => this.addPlayer(i));
		for (const gate of this.gates) {
			gate.open = false;
			gate.group.visible = true;
			gate.collider.setEnabled(true);
		}
		for (const c of this.crew) {
			c.state = "waiting";
			c.carrier = null;
			c.model.root.visible = true;
			c.model.root.position.set(c.x, c.y, 0);
			c.model.root.scale.setScalar(1);
		}
		for (const e of this.enemies) {
			e.alive = true;
			e.health = e.kind === "spore" ? 3 : 2;
			e.x = e.homeX;
			e.y = e.homeY;
			e.phase = e.id * 0.77;
			e.cool = 1 + e.id * 0.17;
			e.model.root.visible = true;
		}
		for (const s of this.shots) s.mesh?.removeFromParent();
		for (const b of this.bombs) {
			b.mesh.removeFromParent();
			if (!b.remote) this.physics.removeRigidBody(b.body);
		}
		for (const p of this.particles) p.mesh.removeFromParent();
		this.particles = [];
		this.shots = [];
		this.bombs = [];
		this.time = 0;
		this.rescued = 0;
		this.score = 0;
		this.kills = 0;
		this.charges = 0;
		this.shotsFired = 0;
		this.status = "playing";
		this.fxEvents = [];
		this.seq = 0;
		this.titleGroup.visible = false;
	}
	removePlayer(id) {
		const p = this.players.find((x) => x.id === id);
		if (!p) return;
		if (p.carrying !== null) {
			const c = this.crew[p.carrying];
			c.state = "waiting";
			c.carrier = null;
			p.carrying = null;
		}
		this.physics.removeRigidBody(p.body);
		p.model.root.removeFromParent();
		p.rope.removeFromParent();
		p.beam.removeFromParent();
		this.players = this.players.filter((p) => p.id !== id);
	}
	setPosition(p, x, y) {
		p.body.setTranslation({ x, y, z: 0 }, true);
		p.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
		p.x = x;
		p.y = y;
		p.vx = 0;
		p.vy = 0;
	}
	openGate(gate) {
		if (gate.open) return;
		gate.open = true;
		gate.group.visible = false;
		gate.collider.setEnabled(false);
		this.burst(gate.x, gate.y, 0xd3a16b, 34, 5);
		this.score += 100;
		this.emit("gate", { id: gate.id });
	}
	burst(x, y, color, count = 12, speed = 3) {
		for (let i = 0; i < count; i++) {
			const m = mesh(
				i % 3 === 0 ? ROCK : BOX,
				color,
				this.fxGroup,
				x,
				y,
				0.6 + rnd(),
				false,
			);
			const s = 0.04 + rnd() * 0.18;
			m.scale.set(s, s, s);
			const a = rnd() * Math.PI * 2,
				v = speed * (0.3 + rnd());
			this.particles.push({
				mesh: m,
				x,
				y,
				vx: Math.cos(a) * v,
				vy: Math.sin(a) * v,
				life: 0.5 + rnd() * 0.8,
				max: 1.3,
			});
		}
	}
	shoot(p, hostile = false) {
		if (p.shootCool > 0) return;
		p.shootCool = 0.155;
		this.shotsFired++;
		const dx = p.aimX,
			dy = p.aimY;
		const x = p.x + dx * 0.68,
			y = p.y + 0.23 + dy * 0.55;
		this.makeShot(x, y, dx, dy, false, p.id);
		this.emit("shot", { x, y });
	}
	makeShot(x, y, dx, dy, hostile = false, owner = -1) {
		const m = orb(
			this.fxGroup,
			x,
			y,
			0.7,
			hostile ? 0.17 : 0.21,
			hostile ? 0.17 : 0.065,
			0.065,
			hostile ? 0xff795f : 0xb8ffe1,
			false,
		);
		m.rotation.z = Math.atan2(dy, dx);
		this.shots.push({
			id: this.nextId++,
			x,
			y,
			dx,
			dy,
			hostile,
			owner,
			life: hostile ? 4 : 0.67,
			mesh: m,
		});
	}
	plantBomb(p) {
		if (p.bombCool > 0 || p.bombs <= 0) return false;
		p.bombs--;
		p.bombCool = 0.65;
		this.charges++;
		const anchor = this.gates.find(
			(g) =>
				!g.open &&
				Math.abs(g.x - p.x) < 3.2 &&
				Math.abs(g.y - p.y) < g.h / 2 + 0.4,
		);
		const x = anchor
				? anchor.x - Math.sign(anchor.x - p.x) * 0.65
				: p.x + p.face * 0.65,
			y = anchor
				? clamp(
						p.y,
						anchor.y - anchor.h / 2 + 0.4,
						anchor.y + anchor.h / 2 - 0.4,
					)
				: p.y - 0.3;
		const desc = anchor
			? RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, 0)
			: RAPIER.RigidBodyDesc.dynamic()
					.setTranslation(x, y, 0)
					.setLinvel(p.face * 2.1, 2.2, 0)
					.setCcdEnabled(true);
		const body = this.physics.createRigidBody(desc);
		body.setEnabledTranslations(true, true, false, true);
		this.physics.createCollider(
			RAPIER.ColliderDesc.ball(0.17)
				.setRestitution(0.35)
				.setFriction(0.7)
				.setCollisionGroups(0x00040001),
			body,
		);
		const group = new THREE.Group();
		this.fxGroup.add(group);
		box(group, 0, 0, 0, 0.29, 0.4, 0.28, 0xff8d65);
		box(group, 0, 0.1, 0.16, 0.31, 0.09, 0.03, 0xffdf9d);
		const fuse = cylinder(group, 0, 0.28, 0, 0.025, 0.2, 0xffe6a3);
		const b = {
			id: this.nextId++,
			body,
			mesh: group,
			fuse: 1.7,
			owner: p.id,
			x,
			y,
		};
		this.bombs.push(b);
		this.emit("bomb", { x, y });
		return true;
	}
	explode(b) {
		const r = this.tuning.blastRadius;
		this.burst(b.x, b.y, 0xffc168, 35, 7);
		this.burst(b.x, b.y, 0xff8461, 18, 5);
		this.emit("blast", { x: b.x, y: b.y, r });
		for (const g of this.gates) {
			const dx = Math.abs(b.x - g.x),
				dy = Math.max(0, Math.abs(b.y - g.y) - g.h / 2);
			if (Math.hypot(dx, dy) < r) this.openGate(g);
		}
		for (const e of this.enemies)
			if (e.alive && distance(e, b) < r) this.hitEnemy(e, 5, b.owner);
		for (const p of this.players)
			if (distance(p, b) < r * 0.8) this.hurt(p, 1, "charge");
		b.mesh.removeFromParent();
		if (!b.remote) this.physics.removeRigidBody(b.body);
	}
	hitEnemy(e, amount, owner) {
		e.health -= amount;
		this.burst(e.x, e.y, e.kind === "bat" ? 0xc79bbd : 0xc4ce9a, 5, 2);
		if (e.health <= 0) {
			e.alive = false;
			e.model.root.visible = false;
			this.kills++;
			this.score += 75;
			const p = this.players.find((p) => p.id === owner);
			if (p) p.contribution += 75;
			this.burst(e.x, e.y, 0xe1ba84, 11, 3);
			this.emit("kill", { x: e.x, y: e.y });
		}
	}
	hurt(p, amount = 1, reason = "creature") {
		if (p.invuln > 0 || this.tuning.god || this.demo) return;
		p.health -= Math.max(0, amount * this.tuning.damage);
		if (this.tuning.damage === 0) return;
		p.invuln = 1.7;
		this.burst(p.x, p.y, 0xff8c68, 9, 3);
		this.emit("hurt", { id: p.id, reason });
		if (p.health <= 0) {
			p.downs++;
			p.lives = worldPlayerLives(this.players.length, p.lives);
			if (p.carrying !== null) {
				const c = this.crew[p.carrying];
				c.state = "waiting";
				c.carrier = null;
				p.carrying = null;
			}
			if (p.lives <= 0 && this.players.length === 1) {
				this.status = "lost";
				this.emit("lost");
				return;
			}
			p.health = 5;
			p.air = 180;
			p.fuel = 100;
			p.bombs = 5;
			p.invuln = 3;
			this.setPosition(p, -11.8, 3);
			this.score = Math.max(0, this.score - 200);
			this.emit("respawn", { id: p.id });
		}
	}
	interaction(p) {
		if (distance(p, this.lift) < 3.4) {
			if (p.carrying !== null)
				return { type: "deliver", text: "Bring crew into the lift" };
			return { type: "refill", text: "Top up your kit" };
		}
		if (p.carrying === null) {
			const c = this.crew.find(
				(c) => c.state === "waiting" && distance(p, c) < 2.15,
			);
			if (c) return { type: "rescue", id: c.id, text: "Rescue " + c.name };
		}
		const g = this.gates.find(
			(g) =>
				!g.open &&
				Math.abs(p.x - g.x) < 2.9 &&
				Math.abs(p.y - g.y) < g.h / 2 + 0.5,
		);
		if (g && p.bombs > 0)
			return { type: "bomb", id: g.id, text: "Plant charge · move clear" };
		const s = this.stations.find((s) => distance(s, p) < 1.8);
		if (s) return { type: "refill", text: "Refill fuel, air & charges" };
		return null;
	}
	interact(p) {
		if (p.interactCool > 0) return false;
		p.interactCool = 0.35;
		const action = this.interaction(p);
		if (!action) return false;
		if (action.type === "rescue") {
			const c = this.crew[action.id];
			c.state = "carried";
			c.carrier = p.id;
			p.carrying = c.id;
			this.score += 150;
			p.contribution += 150;
			this.emit("rescue", {
				id: c.id,
				player: p.id,
				quip: c.quip,
				x: c.x,
				y: c.y,
			});
			return true;
		}
		if (action.type === "deliver") {
			this.deliver(p);
			return true;
		}
		if (action.type === "refill") {
			this.refill(p, true);
			return true;
		}
		if (action.type === "bomb") return this.plantBomb(p);
		return false;
	}
	refill(p, force = false) {
		if (p.refillCool > 0 && !force) return;
		if (p.fuel < 90 || p.air < 165 || p.bombs < 5 || p.health < 5) {
			p.fuel = 100;
			p.air = 180;
			p.bombs = 5;
			p.health = 5;
			p.refillCool = 4;
			this.emit("refill", { id: p.id });
		}
	}
	deliver(p) {
		if (p.carrying === null) return;
		const c = this.crew[p.carrying];
		c.state = "safe";
		c.carrier = null;
		c.model.root.position.set(-14 + this.rescued * 1.3, 2.68, 0.4);
		p.carrying = null;
		p.rope.visible = false;
		this.rescued++;
		this.score += 1000;
		p.contribution += 1000;
		this.refill(p, true);
		this.emit("deliver", { id: c.id, rescued: this.rescued });
		if (this.rescued === 3) {
			this.status = "won";
			this.score += Math.max(0, Math.round(1800 - this.time * 2));
			this.emit("win", { score: this.score, time: this.time });
		}
	}
	step(dt, inputs = {}) {
		if (this.status !== "playing") return;
		this.time += dt;
		for (const p of this.players) {
			const input = inputs[p.id] || {};
			p.invuln = Math.max(0, p.invuln - dt);
			p.shootCool = Math.max(0, p.shootCool - dt);
			p.bombCool = Math.max(0, p.bombCool - dt);
			p.interactCool = Math.max(0, p.interactCool - dt);
			p.refillCool = Math.max(0, p.refillCool - dt);
			p.water = p.x < -9.2 && p.x > -16.9 && p.y < -24.5 && p.y > -26.8;
			const pos = p.body.translation();
			p.x = pos.x;
			p.y = pos.y;
			const ray = new RAPIER.Ray(
				{ x: p.x, y: p.y, z: 0 },
				{ x: 0, y: -1, z: 0 },
			);
			p.grounded = !!this.physics.castRay(
				ray,
				0.83,
				true,
				undefined,
				0x00010001,
				p.collider,
				p.body,
			);
			const vel = p.body.linvel();
			p.vx = vel.x;
			p.vy = vel.y;
			if (
				input.aimX !== undefined &&
				Math.hypot(input.aimX, input.aimY || 0) > 0.15
			) {
				const len = Math.hypot(input.aimX, input.aimY || 0);
				p.aimX = input.aimX / len;
				p.aimY = (input.aimY || 0) / len;
				p.face = p.aimX < -0.12 ? -1 : p.aimX > 0.12 ? 1 : p.face;
			} else if (Math.abs(input.move || 0) > 0.15) {
				p.face = input.move < 0 ? -1 : 1;
				p.aimX = p.face;
				p.aimY = 0;
			}
			const noclip = this.tuning.noclip || this.demo;
			if (noclip) {
				p.collider.setEnabled(false);
				p.body.setGravityScale(0, true);
				p.body.setLinvel(
					{
						x: (input.move || 0) * this.tuning.moveSpeed,
						y: (input.vertical ?? (input.jet ? 1 : input.down ? -1 : 0)) * 7,
						z: 0,
					},
					true,
				);
				p.thrusting = !!input.jet;
			} else {
				p.collider.setEnabled(true);
				p.body.setGravityScale(p.water ? 0.4 : 1, true);
				const max =
					this.tuning.moveSpeed *
					(p.carrying !== null ? 0.9 : 1) *
					(p.water ? 0.68 : 1);
				const vx = lerp(
					vel.x,
					(input.move || 0) * max,
					Math.min(1, dt * (p.grounded ? 18 : 9)),
				);
				p.thrusting = !!input.jet && p.fuel > 0;
				let vy = vel.y;
				if (p.thrusting) {
					vy = Math.min(p.water ? 5.6 : 7.4, vy + this.tuning.jetThrust * dt);
					p.fuel = Math.max(
						0,
						p.fuel -
							dt * this.tuning.fuelDrain * (p.carrying !== null ? 1.08 : 1),
					);
				} else {
					p.fuel = Math.min(100, p.fuel + dt * (p.grounded ? 34 : 5));
					if (input.down) vy -= 15 * dt;
				}
				if (p.water) vy = Math.max(vy, -3.5);
				p.body.setLinvel({ x: vx, y: Math.max(-9, vy), z: 0 }, true);
			}
			if (input.fire) this.shoot(p);
			if (input.bomb) this.plantBomb(p);
			if (input.interact) this.interact(p);
			p.air = Math.max(
				0,
				p.air - dt * this.tuning.airDrain * (p.water ? 2.4 : 1),
			);
			if (p.air === 0) this.hurt(p, 1, "air");
		}
		this.physics.timestep = dt;
		this.physics.step();
		for (const p of this.players) {
			const pos = p.body.translation();
			p.x = clamp(pos.x, -19, 19);
			p.y = clamp(pos.y, -58.4, 9);
			if (pos.x !== p.x || pos.y !== p.y)
				p.body.setTranslation({ x: p.x, y: p.y, z: 0 }, true);
			const vel = p.body.linvel();
			p.vx = vel.x;
			p.vy = vel.y;
			if (p.y < -48.1 && p.y > -49.5 && p.x > 7.3 && p.x < 14.2)
				this.hurt(p, 1, "lava");
			const ventOn = Math.sin(this.time * 1.5) > 0.35;
			if (ventOn && Math.abs(p.x - 11) < 0.8 && p.y > -48.2 && p.y < -44.5)
				this.hurt(p, 1, "steam");
			if (distance(p, this.lift) < 2.6) {
				if (p.carrying !== null) this.deliver(p);
				this.refill(p);
			}
			for (const s of this.stations) if (distance(p, s) < 1.2) this.refill(p);
		}
		for (const e of this.enemies) {
			if (!e.alive) continue;
			const target = this.players.reduce(
				(a, p) => (!a || distance(p, e) < distance(a, e) ? p : a),
				null,
			);
			e.phase += dt;
			const speed = this.tuning.enemySpeed;
			if (e.kind === "bat") {
				let tx = e.homeX + Math.sin(e.phase * 1.2) * 1.8,
					ty = e.homeY + Math.sin(e.phase * 1.8) * 0.65;
				if (target && distance(e, target) < 6.5) {
					tx = target.x;
					ty = target.y + 0.3;
				}
				const a = Math.atan2(ty - e.y, tx - e.x);
				e.x += Math.cos(a) * dt * 1.65 * speed;
				e.y += Math.sin(a) * dt * 1.65 * speed;
			} else if (e.kind === "spider") {
				e.x = e.homeX + Math.sin(e.phase * 0.8 * speed) * 2.1;
			} else {
				e.x = e.homeX + Math.sin(e.phase * 0.65 * speed) * 0.7;
				e.y = e.homeY + Math.sin(e.phase * speed) * 0.5;
				e.cool -= dt * speed;
				if (target && distance(e, target) < 10 && e.cool <= 0) {
					const d = distance(e, target);
					this.makeShot(
						e.x,
						e.y,
						(target.x - e.x) / d,
						(target.y - e.y) / d,
						true,
					);
					e.cool = 2.3;
				}
			}
			if (target && distance(e, target) < 0.85)
				this.hurt(target, 1, "creature");
		}
		for (let i = this.shots.length - 1; i >= 0; i--) {
			const s = this.shots[i];
			s.life -= dt;
			const speed = s.hostile ? 5 : 29;
			const len = speed * dt;
			const ray = new RAPIER.Ray(
				{ x: s.x, y: s.y, z: 0 },
				{ x: s.dx, y: s.dy, z: 0 },
			);
			const hit = this.physics.castRay(ray, len, true, undefined, 0x00010001);
			s.x += s.dx * len;
			s.y += s.dy * len;
			let dead = !!hit || s.life <= 0;
			if (!dead) {
				if (s.hostile) {
					const p = this.players.find((p) => distance(p, s) < 0.7);
					if (p) {
						this.hurt(p, 1, "spore");
						dead = true;
					}
				} else {
					const e = this.enemies.find((e) => e.alive && distance(e, s) < 0.62);
					if (e) {
						this.hitEnemy(e, 1, s.owner);
						dead = true;
					}
				}
			}
			if (dead) {
				s.mesh.removeFromParent();
				this.shots.splice(i, 1);
			}
		}
		for (let i = this.bombs.length - 1; i >= 0; i--) {
			const b = this.bombs[i];
			const pos = b.body.translation();
			b.x = pos.x;
			b.y = pos.y;
			b.fuse -= dt;
			if (b.fuse <= 0) {
				this.explode(b);
				this.bombs.splice(i, 1);
			}
		}
		for (const c of this.crew)
			if (c.state === "carried") {
				const p = this.players.find((p) => p.id === c.carrier);
				if (p) {
					c.model.root.position.set(
						lerp(
							c.model.root.position.x,
							p.x - p.face * 0.8,
							Math.min(1, dt * 9),
						),
						lerp(c.model.root.position.y, p.y - 1, Math.min(1, dt * 9)),
						0.15,
					);
				}
			}
	}
	animate(dt) {
		for (const p of this.players) {
			p.model.root.position.set(p.x, p.y, 0.3);
			const state = p.thrusting
				? "fly"
				: p.grounded && Math.abs(p.vx) > 0.5
					? "walk"
					: "idle";
			const aim = Math.atan2(p.aimY, p.aimX * p.face);
			p.model.animate(dt, state, p.face, aim);
			p.model.root.visible = p.invuln <= 0 || Math.sin(this.time * 30) > -0.3;
			p.beam.visible = p.y < -15;
			p.beam.position.set(p.x, p.y + 0.5, -0.8);
			p.beam.rotation.z = Math.atan2(p.aimY, p.aimX);
			const c = p.carrying !== null ? this.crew[p.carrying] : null;
			p.rope.visible = !!c;
			if (c) {
				const a = p.rope.geometry.attributes.position;
				a.setXYZ(0, p.x, p.y - 0.2, 0.6);
				a.setXYZ(
					1,
					c.model.root.position.x,
					c.model.root.position.y + 0.5,
					0.5,
				);
				a.needsUpdate = true;
				p.rope.geometry.computeBoundingSphere();
			}
		}
		for (const c of this.crew) {
			c.model.animate(
				dt,
				c.state === "carried" ? "fly" : c.state === "safe" ? "wave" : "wave",
				c.x < 0 ? -1 : 1,
			);
			c.model.root.scale.setScalar(c.state === "carried" ? 0.74 : 1);
			if (c.state === "waiting") c.model.root.position.set(c.x, c.y, 0.2);
		}
		for (const e of this.enemies) {
			e.model.root.position.set(e.x, e.y, 0.35);
			e.model.mixer.update(dt);
		}
		for (const s of this.shots) s.mesh.position.set(s.x, s.y, 0.7);
		for (const b of this.bombs) {
			b.mesh.position.set(b.x, b.y, 0.8);
			b.mesh.rotation.z = b.body.rotation().z;
			b.mesh.scale.setScalar(
				b.fuse < 0.5 ? 1 + Math.sin(b.fuse * 65) * 0.14 : 1,
			);
		}
		for (let i = this.particles.length - 1; i >= 0; i--) {
			const p = this.particles[i];
			p.life -= dt;
			p.vy -= 8 * dt;
			p.x += p.vx * dt;
			p.y += p.vy * dt;
			p.mesh.position.x = p.x;
			p.mesh.position.y = p.y;
			p.mesh.rotation.z += dt * 3;
			if (p.life < 0.25) p.mesh.scale.multiplyScalar(Math.max(0.1, 1 - dt * 5));
			if (p.life <= 0) {
				p.mesh.removeFromParent();
				this.particles.splice(i, 1);
			}
		}
		this.steam.visible = Math.sin(this.time * 1.5) > 0.35;
		this.steam.children.forEach((m, i) => {
			m.position.y = -48 + ((this.time * 3 + i * 0.6) % 4.3);
			m.scale.x = 0.7 + ((this.time + i * 0.5) % 1) * 0.5;
		});
		this.lava.children.forEach((m, i) => {
			if (i) m.position.y = -48.58 + Math.sin(this.time * 3 + i) * 0.045;
		});
		if (this.titleGroup.visible) {
			this.titleHero.animate(dt, "fly", 1, 0.04);
			this.titleHero.root.position.y =
				-5.5 + Math.sin(performance.now() * 0.0013) * 0.18;
			this.titleBuddy.animate(dt, "wave", -1);
		}
	}
	snapshot() {
		return {
			t: round(this.time),
			status: this.status,
			rescued: this.rescued,
			score: this.score,
			kills: this.kills,
			charges: this.charges,
			shotsFired: this.shotsFired,
			gates: this.gates.map((g) => g.open),
			crew: this.crew.map((c) => ({
				s: c.state,
				c: c.carrier,
				x: round(c.model.root.position.x),
				y: round(c.model.root.position.y),
			})),
			players: this.players.map((p) => ({
				id: p.id,
				x: round(p.x),
				y: round(p.y),
				vx: round(p.vx),
				vy: round(p.vy),
				face: p.face,
				ax: round(p.aimX),
				ay: round(p.aimY),
				health: p.health,
				lives: p.lives,
				fuel: round(p.fuel),
				air: round(p.air),
				bombs: p.bombs,
				carrying: p.carrying,
				invuln: round(p.invuln),
				grounded: p.grounded,
				thrusting: p.thrusting,
				contribution: p.contribution,
				downs: p.downs,
			})),
			enemies: this.enemies.map((e) => ({
				id: e.id,
				x: round(e.x),
				y: round(e.y),
				alive: e.alive,
				health: e.health,
			})),
			shots: this.shots.map((s) => ({
				id: s.id,
				x: round(s.x),
				y: round(s.y),
				dx: s.dx,
				dy: s.dy,
				hostile: s.hostile,
				owner: s.owner,
				life: round(s.life),
			})),
			bombs: this.bombs.map((b) => ({
				id: b.id,
				x: round(b.x),
				y: round(b.y),
				fuse: round(b.fuse),
			})),
			fx: this.fxEvents,
		};
	}
	applySnapshot(s) {
		this.time = s.t;
		this.status = s.status;
		this.rescued = s.rescued;
		this.score = s.score;
		this.kills = s.kills;
		this.charges = s.charges;
		this.shotsFired = s.shotsFired;
		for (const p of [...this.players])
			if (!s.players.some((n) => n.id === p.id)) this.removePlayer(p.id);
		for (const n of s.players) {
			let p = this.players.find((p) => p.id === n.id) || this.addPlayer(n.id);
			Object.assign(p, n, { aimX: n.ax, aimY: n.ay });
			p.body.setTranslation({ x: p.x, y: p.y, z: 0 }, true);
		}
		s.gates.forEach((o, i) => {
			this.gates[i].open = o;
			this.gates[i].group.visible = !o;
			this.gates[i].collider.setEnabled(!o);
		});
		s.crew.forEach((n, i) => {
			const c = this.crew[i];
			c.state = n.s;
			c.carrier = n.c;
			c.model.root.position.set(n.x, n.y, 0.2);
		});
		s.enemies.forEach((n, i) => {
			Object.assign(this.enemies[i], n);
			this.enemies[i].model.root.visible = n.alive;
		});
		for (const shot of this.shots) shot.mesh.removeFromParent();
		this.shots = s.shots.map((n) => {
			const m = orb(
				this.fxGroup,
				n.x,
				n.y,
				0.7,
				n.hostile ? 0.17 : 0.21,
				n.hostile ? 0.17 : 0.065,
				0.065,
				n.hostile ? 0xff795f : 0xb8ffe1,
				false,
			);
			m.rotation.z = Math.atan2(n.dy, n.dx);
			return { ...n, mesh: m };
		});
		for (const b of this.bombs) {
			b.mesh.removeFromParent();
			if (b.body && !b.remote) this.physics.removeRigidBody(b.body);
		}
		this.bombs = s.bombs.map((n) => {
			const m = box(this.fxGroup, n.x, n.y, 0.8, 0.3, 0.4, 0.3, 0xff8d65);
			return {
				...n,
				mesh: m,
				remote: true,
				body: { rotation: () => ({ z: 0 }) },
			};
		});
		for (const e of s.fx || [])
			if (e.seq > this.seq) {
				if (e.type === "blast") this.burst(e.x, e.y, 0xffb875, 25, 6);
				if (e.type === "kill") this.burst(e.x, e.y, 0xc9b28a, 10, 3);
				this.events?.(e.type, e);
				this.seq = e.seq;
			}
	}
}
