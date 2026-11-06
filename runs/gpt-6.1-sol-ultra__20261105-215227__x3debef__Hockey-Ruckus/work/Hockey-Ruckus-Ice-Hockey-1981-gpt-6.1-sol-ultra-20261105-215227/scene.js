import * as THREE from "three/webgpu";
import { color, normalWorld, vec3, step, float } from "three/tsl";

const INK = 0x102d3a;
const TEAMS = [0x159cac, 0xf36c4a];
const TEAM_LIGHT = [0xa9eeea, 0xffcb82];
const TAU = Math.PI * 2;
const materials = new Map();
const geometry = {
	box: new THREE.BoxGeometry(1, 1, 1),
	sphere: new THREE.SphereGeometry(1, 12, 8),
	cylinder: new THREE.CylinderGeometry(1, 1, 1, 12),
	cone: new THREE.ConeGeometry(1, 1, 8),
};
function toon(hex) {
	const key = `t${hex}`;
	if (materials.has(key)) return materials.get(key);
	const m = new THREE.MeshBasicNodeMaterial();
	const light = normalWorld.dot(vec3(-0.35, 0.82, 0.45));
	m.colorNode = color(hex).mul(
		float(0.51)
			.add(step(0.08, light).mul(0.25))
			.add(step(0.65, light).mul(0.24)),
	);
	materials.set(key, m);
	return m;
}
function flat(hex, opacity = 1) {
	const key = `f${hex}:${opacity}`;
	if (materials.has(key)) return materials.get(key);
	const m = new THREE.MeshBasicMaterial({
		color: hex,
		transparent: opacity < 1,
		opacity,
		depthWrite: opacity >= 1,
		side: THREE.DoubleSide,
	});
	materials.set(key, m);
	return m;
}
const inkMaterial = new THREE.MeshBasicMaterial({
	color: INK,
	side: THREE.BackSide,
});
function mesh(
	parent,
	geo,
	material,
	pos = [0, 0, 0],
	scale = [1, 1, 1],
	outline = false,
) {
	const m = new THREE.Mesh(geo, material);
	m.position.set(...pos);
	m.scale.set(...scale);
	parent.add(m);
	if (outline) {
		const o = new THREE.Mesh(geo, inkMaterial);
		o.scale.set(1.035, 1.035, 1.035);
		m.add(o);
	}
	return m;
}
function box(p, c, x, y, z, sx, sy, sz, outline = true) {
	return mesh(p, geometry.box, toon(c), [x, y, z], [sx, sy, sz], outline);
}
function ball(p, c, x, y, z, sx, sy = sx, sz = sx, outline = true) {
	return mesh(p, geometry.sphere, toon(c), [x, y, z], [sx, sy, sz], outline);
}
function cyl(p, c, x, y, z, r, h, outline = true) {
	return mesh(p, geometry.cylinder, toon(c), [x, y, z], [r, h, r], outline);
}
function rod(p, a, b, r, c = INK) {
	const av = new THREE.Vector3(...a),
		bv = new THREE.Vector3(...b),
		dv = bv.clone().sub(av);
	const m = cyl(
		p,
		c,
		...av.clone().add(bv).multiplyScalar(0.5).toArray(),
		r,
		dv.length(),
		false,
	);
	m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dv.normalize());
	return m;
}
function line(p, points, c, opacity = 1) {
	const g = new THREE.BufferGeometry().setFromPoints(
		points.map((v) => new THREE.Vector3(...v)),
	);
	const m = new THREE.Line(
		g,
		new THREE.LineBasicMaterial({
			color: c,
			transparent: opacity < 1,
			opacity,
		}),
	);
	p.add(m);
	return m;
}
function disk(p, c, x, z, r, y = 0.037, opacity = 1) {
	const m = mesh(p, new THREE.CircleGeometry(r, 64), flat(c, opacity), [
		x,
		y,
		z,
	]);
	m.rotation.x = -Math.PI / 2;
	return m;
}
function ring(p, c, x, z, r, width = 0.08, y = 0.041, opacity = 1) {
	const m = mesh(
		p,
		new THREE.RingGeometry(r - width / 2, r + width / 2, 80),
		flat(c, opacity),
		[x, y, z],
	);
	m.rotation.x = -Math.PI / 2;
	return m;
}
function decalLine(p, c, x, z, sx, sz, y = 0.04, opacity = 1) {
	return mesh(p, geometry.box, flat(c, opacity), [x, y, z], [sx, 0.008, sz]);
}
function canvasTexture(draw, w = 1024, h = 512) {
	const cv = document.createElement("canvas");
	cv.width = w;
	cv.height = h;
	draw(cv.getContext("2d"), w, h);
	const t = new THREE.CanvasTexture(cv);
	t.colorSpace = THREE.SRGBColorSpace;
	t.anisotropy = 4;
	return t;
}
function label(p, text, x, y, z, w, h, c = "#102d3a", bg = null, rotation = 0) {
	const t = canvasTexture(
		(ctx, cw, ch) => {
			if (bg) {
				ctx.fillStyle = bg;
				ctx.fillRect(0, 0, cw, ch);
			}
			ctx.fillStyle = c;
			ctx.font = '900 130px "Arial Black", sans-serif';
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText(text, cw / 2, ch / 2, cw * 0.92);
		},
		1024,
		256,
	);
	const m = mesh(
		p,
		new THREE.PlaneGeometry(w, h),
		new THREE.MeshBasicMaterial({
			map: t,
			transparent: true,
			side: THREE.DoubleSide,
			depthWrite: false,
		}),
		[x, y, z],
	);
	m.rotation.y = rotation;
	return m;
}
function roundedShape(w, h, r) {
	const s = new THREE.Shape();
	s.moveTo(-w / 2 + r, -h / 2);
	s.lineTo(w / 2 - r, -h / 2);
	s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
	s.lineTo(w / 2, h / 2 - r);
	s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
	s.lineTo(-w / 2 + r, h / 2);
	s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
	s.lineTo(-w / 2, -h / 2 + r);
	s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
	return s;
}
function slab(p, w, h, r, depth, c, y) {
	const g = new THREE.ExtrudeGeometry(roundedShape(w, h, r), {
		depth,
		bevelEnabled: false,
		curveSegments: 12,
	});
	g.rotateX(-Math.PI / 2);
	g.translate(0, y - depth, 0);
	return mesh(p, g, toon(c));
}
function seeded(seed) {
	return () => {
		seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
		return seed / 4294967296;
	};
}

function buildSkater(team, index) {
	const root = new THREE.Group(),
		pivot = new THREE.Group();
	root.add(pivot);
	pivot.name = "body";
	const jersey = TEAMS[team],
		cream = 0xfff3d7;
	// Comically chunky sweater and padded shoulders.
	const chest = box(pivot, jersey, 0, 1.18, 0, 0.95, 0.88, 0.68);
	chest.rotation.z = -0.07;
	box(pivot, cream, 0.005, 0.91, 0, 0.98, 0.14, 0.71, false);
	box(pivot, INK, -0.01, 0.67, 0, 0.78, 0.34, 0.62);
	ball(pivot, jersey, -0.02, 1.56, 0, 0.38, 0.25, 0.32);
	const head = new THREE.Group();
	head.position.set(0.08, 1.75, 0);
	pivot.add(head);
	ball(head, 0xf1bc8c, 0.1, 0.12, 0, 0.34, 0.36, 0.34);
	ball(head, team === 0 ? 0x147c90 : 0xe65539, 0, 0.29, 0, 0.45, 0.36, 0.43);
	box(head, cream, 0.32, 0.16, 0, 0.19, 0.12, 0.75, false);
	box(head, INK, 0.398, 0.12, 0, 0.035, 0.18, 0.64, false);
	box(head, 0xa8eff3, 0.42, 0.17, -0.13, 0.03, 0.09, 0.18, false);
	box(head, 0xa8eff3, 0.42, 0.17, 0.13, 0.03, 0.09, 0.18, false);
	// Helmet stripe.
	box(head, cream, -0.03, 0.61, 0, 0.49, 0.035, 0.13, false);
	// Side/back jersey number is readable from the broadcast camera.
	const number = label(
		pivot,
		String(index === 0 ? 9 : 31),
		-0.05,
		1.23,
		0.355,
		0.58,
		0.55,
		"#fff3d7",
	);
	number.material.depthWrite = true;
	const legLeft = new THREE.Group();
	legLeft.name = "legL";
	legLeft.position.set(-0.02, 0.69, -0.28);
	pivot.add(legLeft);
	const legRight = new THREE.Group();
	legRight.name = "legR";
	legRight.position.set(-0.02, 0.69, 0.28);
	pivot.add(legRight);
	for (const leg of [legLeft, legRight]) {
		box(leg, cream, 0, -0.2, 0, 0.33, 0.5, 0.34);
		box(leg, jersey, 0.01, -0.25, 0, 0.35, 0.14, 0.36, false);
		box(leg, INK, 0.09, -0.48, 0, 0.57, 0.23, 0.32);
		box(leg, 0xc8dbd9, 0.1, -0.64, 0, 0.59, 0.065, 0.12, false);
		box(leg, INK, 0.2, -0.58, 0, 0.06, 0.13, 0.08, false);
		box(leg, INK, -0.08, -0.58, 0, 0.06, 0.13, 0.08, false);
	}
	const armLeft = new THREE.Group();
	armLeft.name = "armL";
	armLeft.position.set(0.1, 1.4, -0.47);
	pivot.add(armLeft);
	const armRight = new THREE.Group();
	armRight.name = "armR";
	armRight.position.set(0.1, 1.4, 0.47);
	pivot.add(armRight);
	for (const [arm, sgn] of [
		[armLeft, -1],
		[armRight, 1],
	]) {
		box(arm, jersey, 0.19, -0.18, 0, 0.48, 0.39, 0.35).rotation.z = 0.25;
		box(arm, cream, 0.31, -0.31, 0, 0.17, 0.11, 0.36, false);
		ball(arm, INK, 0.41, -0.37, 0, 0.23, 0.21, 0.22);
	}
	const stick = new THREE.Group();
	stick.name = "stick";
	stick.position.set(0.52, 1.02, 0.46);
	pivot.add(stick);
	rod(stick, [0, 0, 0], [0.54, -0.88, 0.14], 0.065, 0xe8b676);
	rod(stick, [0.54, -0.88, 0.14], [1.11, -0.88, 0.12], 0.11, INK);
	for (let n = 0; n < 4; n++)
		box(stick, cream, 0.64 + n * 0.12, -0.88, 0.12, 0.055, 0.14, 0.2, false);
	const shadow = disk(root, 0x254a5b, 0, 0, 0.85, 0.017, 0.14);
	shadow.scale.set(1, 0.6, 1);
	const selectedRing = ring(root, TEAM_LIGHT[team], 0, 0, 1.06, 0.13, 0.03);
	selectedRing.visible = false;
	const selectedRingInk = ring(root, INK, 0, 0, 1.2, 0.055, 0.031);
	selectedRingInk.visible = false;
	const puckRing = ring(root, 0xffdf78, 0, 0, 0.85, 0.05, 0.032);
	puckRing.visible = false;
	const arrow = mesh(
		root,
		geometry.cone,
		flat(TEAM_LIGHT[team]),
		[0, 3.01, 0],
		[0.2, 0.37, 0.2],
	);
	arrow.rotation.z = Math.PI;
	arrow.visible = false;
	const mixer = new THREE.AnimationMixer(pivot);
	const skate = new THREE.AnimationClip("skate", 0.62, [
		new THREE.NumberKeyframeTrack(
			"legL.rotation[z]",
			[0, 0.155, 0.31, 0.465, 0.62],
			[0.4, 0, -0.4, 0, 0.4],
		),
		new THREE.NumberKeyframeTrack(
			"legR.rotation[z]",
			[0, 0.155, 0.31, 0.465, 0.62],
			[-0.4, 0, 0.4, 0, -0.4],
		),
		new THREE.NumberKeyframeTrack(
			".position[y]",
			[0, 0.155, 0.31, 0.465, 0.62],
			[0, 0.045, 0, 0.045, 0],
		),
		new THREE.NumberKeyframeTrack(
			"armL.rotation[z]",
			[0, 0.31, 0.62],
			[-0.05, 0.16, -0.05],
		),
		new THREE.NumberKeyframeTrack(
			"armR.rotation[z]",
			[0, 0.31, 0.62],
			[0.16, -0.05, 0.16],
		),
	]);
	const skateAction = mixer.clipAction(skate);
	skateAction.play();
	const swing = new THREE.AnimationClip("shoot", 0.34, [
		new THREE.NumberKeyframeTrack(
			"stick.rotation[y]",
			[0, 0.1, 0.22, 0.34],
			[-0.68, -1.0, 0.65, 0],
		),
		new THREE.NumberKeyframeTrack(
			"armR.rotation[y]",
			[0, 0.1, 0.22, 0.34],
			[-0.3, -0.6, 0.5, 0],
		),
	]);
	const check = new THREE.AnimationClip("check", 0.4, [
		new THREE.NumberKeyframeTrack(
			".rotation[z]",
			[0, 0.1, 0.25, 0.4],
			[0, -0.35, -0.2, 0],
		),
		new THREE.NumberKeyframeTrack(
			"armL.rotation[y]",
			[0, 0.1, 0.25, 0.4],
			[0, -0.6, -0.6, 0],
		),
	]);
	const celebrate = new THREE.AnimationClip("celebrate", 0.75, [
		new THREE.NumberKeyframeTrack(
			"armL.rotation[z]",
			[0, 0.2, 0.4, 0.6, 0.75],
			[0, 2.2, 2.0, 2.2, 0],
		),
		new THREE.NumberKeyframeTrack(
			"armR.rotation[z]",
			[0, 0.2, 0.4, 0.6, 0.75],
			[0, 2.2, 2.0, 2.2, 0],
		),
		new THREE.NumberKeyframeTrack(
			".position[y]",
			[0, 0.2, 0.4, 0.6, 0.75],
			[0, 0.45, 0.1, 0.35, 0],
		),
	]);
	const actions = {
		shot: mixer.clipAction(swing),
		shoot: mixer.clipAction(swing),
		pass: mixer.clipAction(swing),
		check: mixer.clipAction(check),
		celebrate: mixer.clipAction(celebrate),
	};
	for (const a of Object.values(actions)) {
		a.setLoop(THREE.LoopOnce, 1);
		a.clampWhenFinished = false;
	}
	return {
		root,
		pivot,
		mixer,
		skateAction,
		actions,
		selectedRing,
		selectedRingInk,
		puckRing,
		arrow,
		lastAction: null,
		team,
		index,
	};
}

export class HockeyScene {
	constructor(renderer) {
		this.renderer = renderer;
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(0x102e3b);
		this.camera = new THREE.OrthographicCamera(-25, 25, 14, -14, 0.1, 180);
		this.camera.position.set(0, 34, 31);
		this.camera.lookAt(0, 0, 0);
		this.clock = 0;
		this.theme = 0;
		this.lastPhase = null;
		this.goalFlash = false;
		this.goalOnMaterial = toon(0xff4d32);
		this.goalOffMaterial = toon(0xffe6ac);
		this.particles = [];
		this.trail = [];
		this.trailTimer = 0;
		this.shake = 0;
		this.goalLights = [];
		this.rink = new THREE.Group();
		this.scene.add(this.rink);
		this.buildRink();
		this.buildArena();
		this.players = [];
		for (let t = 0; t < 2; t++)
			for (let i = 0; i < 2; i++) {
				const s = buildSkater(t, i);
				this.players.push(s);
				this.scene.add(s.root);
			}
		this.puck = new THREE.Group();
		this.scene.add(this.puck);
		cyl(this.puck, INK, 0, 0.13, 0, 0.29, 0.17, true);
		cyl(this.puck, 0xffedc1, 0, 0.224, 0, 0.17, 0.012, false);
		const puckShadow = disk(this.puck, INK, 0, 0, 0.48, 0.014, 0.17);
		this.puckHalo = ring(this.puck, 0xffb936, 0, 0, 0.58, 0.06, 0.025, 0.85);
		this.aim = new THREE.Group();
		this.scene.add(this.aim);
		this.aim.visible = false;
		for (let i = 0; i < 9; i++) {
			const d = disk(
				this.aim,
				0xffce5c,
				1.3 + i * 0.58,
				0,
				0.065 + i * 0.008,
				0.06,
				0.9 - i * 0.07,
			);
		}
		const tri = mesh(
			this.aim,
			new THREE.ConeGeometry(0.18, 0.42, 3),
			flat(0xffce5c),
			[6.7, 0.06, 0],
		);
		tri.rotation.z = -Math.PI / 2;
	}
	buildRink() {
		const p = this.rink;
		slab(p, 43, 27, 4, 1.35, INK, -0.37);
		slab(p, 41.9, 25.9, 3.7, 0.45, 0xe9b869, -0.35);
		slab(p, 40.8, 24.8, 3.3, 0.34, 0x1b5963, -0.23);
		slab(p, 36.8, 20.8, 2.3, 0.29, 0xb6d7d7, -0.02);
		slab(p, 36, 20, 2, 0.16, 0xebf3e7, 0.0);
		const iceTexture = canvasTexture(
			(ctx, w, h) => {
				ctx.fillStyle = "#eef5e9";
				ctx.fillRect(0, 0, w, h);
				const rand = seeded(81);
				for (let i = 0; i < 1300; i++) {
					let x = rand() * w,
						y = rand() * h;
					ctx.strokeStyle =
						i % 3 ? "rgba(37,102,125,.035)" : "rgba(255,255,255,.45)";
					ctx.lineWidth = 1 + rand() * 2;
					ctx.beginPath();
					ctx.moveTo(x, y);
					ctx.lineTo(x + rand() * 90 + 10, y + rand() * 9 - 4);
					ctx.stroke();
				}
				ctx.fillStyle = "rgba(25,101,120,.035)";
				for (let i = 0; i < 240; i++)
					ctx.fillRect(rand() * w, rand() * h, rand() * 20 + 1, 1);
			},
			2048,
			1024,
		);
		const iceMat = new THREE.MeshBasicMaterial({ map: iceTexture });
		const ice = mesh(
			p,
			new THREE.ShapeGeometry(roundedShape(36, 20, 2), 24),
			iceMat,
			[0, 0.021, 0],
		);
		ice.rotation.x = -Math.PI / 2;
		// Hockey markings with generous negative space.
		decalLine(p, 0xd85a53, 0, 0, 0.13, 19.7);
		decalLine(p, 0x6c9fae, -6.5, 0, 0.23, 19.7);
		decalLine(p, 0x6c9fae, 6.5, 0, 0.23, 19.7);
		ring(p, 0x6c9fae, 0, 0, 3.2, 0.09);
		disk(p, 0xa2bfc1, 0, 0, 0.18);
		for (const x of [-12, 12])
			for (const z of [-5, 5]) {
				ring(p, 0xd47466, x, z, 2.2, 0.075);
				disk(p, 0xd47466, x, z, 0.14);
				for (const sz of [-1, 1])
					decalLine(p, 0xd47466, x, z + sz * 2.2, 0.45, 0.07);
				for (const sx of [-1, 1])
					decalLine(p, 0xd47466, x + sx * 0.55, z, 0.07, 0.75);
			}
		for (const x of [-3.4, 3.4])
			for (const z of [-5, 5]) disk(p, 0xd47466, x, z, 0.13);
		for (const x of [-16.6, 16.6]) {
			decalLine(p, 0xd47466, x, 0, 0.08, 18.4);
			const crease = disk(p, 0x93cfd7, x, 0, 2.3, 0.038, 0.45);
			crease.scale.x = 0.62;
			const cr = ring(p, 0xb4615d, x, 0, 2.3, 0.07, 0.04, 0.8);
			cr.scale.x = 0.62;
		}
		const logoTex = canvasTexture((ctx, w, h) => {
			ctx.translate(w / 2, h / 2);
			ctx.rotate(-0.08);
			ctx.fillStyle = "rgba(19,72,86,.10)";
			ctx.font = '900 115px "Arial Black",sans-serif';
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText("HOCKEY", 0, -54);
			ctx.font = '900 144px "Arial Black",sans-serif';
			ctx.fillText("RUCKUS", 0, 68);
			ctx.lineWidth = 10;
			ctx.strokeStyle = "rgba(19,72,86,.09)";
			ctx.beginPath();
			ctx.moveTo(-300, 160);
			ctx.lineTo(300, 160);
			ctx.stroke();
		});
		const logo = mesh(
			p,
			new THREE.PlaneGeometry(8.6, 4.3),
			new THREE.MeshBasicMaterial({
				map: logoTex,
				transparent: true,
				depthWrite: false,
			}),
			[0, 0.049, 0],
		);
		logo.rotation.x = -Math.PI / 2;
		// White boards, gold kickplates, and deliberately inky rails.
		for (const z of [-10.25, 10.25]) {
			box(p, 0xfff3d7, 0, 0.6, z, 32.0, 1.2, 0.4);
			box(
				p,
				0xf7bb52,
				0,
				0.15,
				z - (z > 0 ? 0.23 : -0.23),
				32.0,
				0.22,
				0.055,
				false,
			);
			box(p, INK, 0, 1.23, z, 32.1, 0.13, 0.47, false);
			box(p, 0xf46548, 0, 1.32, z, 32.1, 0.08, 0.48, false);
			for (let x = -14; x <= 14; x += 4)
				box(
					p,
					0xc9ddd5,
					x,
					0.62,
					z + (z > 0 ? 0.22 : -0.22),
					0.035,
					1.02,
					0.025,
					false,
				);
		}
		for (const x of [-18.25, 18.25])
			for (const z of [-6.35, 6.35]) {
				box(p, 0xfff3d7, x, 0.6, z, 0.4, 1.2, 5.4);
				box(
					p,
					0xf7bb52,
					x + (x > 0 ? -0.23 : 0.23),
					0.15,
					z,
					0.055,
					0.22,
					5.4,
					false,
				);
				box(p, INK, x, 1.23, z, 0.47, 0.13, 5.5, false);
				box(p, 0xf46548, x, 1.32, z, 0.48, 0.08, 5.5, false);
			}
		for (const sx of [-1, 1])
			for (const sz of [-1, 1]) {
				const corner = new THREE.Group();
				p.add(corner);
				const pts = [];
				for (let i = 0; i <= 10; i++) {
					const a = ((i / 10) * Math.PI) / 2;
					pts.push([
						sx * (16 + 2.25 * Math.sin(a)),
						0.6,
						sz * (8 + 2.25 * Math.cos(a)),
					]);
				}
				for (let i = 0; i < pts.length - 1; i++) {
					const a = pts[i],
						b = pts[i + 1],
						dx = b[0] - a[0],
						dz = b[2] - a[2];
					const panel = box(
						corner,
						0xfff3d7,
						(a[0] + b[0]) / 2,
						0.6,
						(a[2] + b[2]) / 2,
						Math.hypot(dx, dz) + 0.03,
						1.2,
						0.4,
						false,
					);
					panel.rotation.y = -Math.atan2(dz, dx);
					rod(corner, [a[0], 1.28, a[2]], [b[0], 1.28, b[2]], 0.095, 0xf46548);
				}
			}
		for (const s of [-1, 1]) this.buildNet(s);
		for (const [text, x, w] of [
			["SLAM • BANK • SCORE", -10, 8],
			["PUCK LUCK", 0, 7],
			["NICE ON ICE", 10, 8],
		]) {
			label(p, text, x, 0.69, -9.99, w, 0.52, "#1d5361");
			const l = label(p, text, x, 0.65, 10.49, w, 0.47, "#1d5361");
			l.rotation.y = Math.PI;
		}
		// Tall back glass with fine posts, front glass stays low for a clear play view.
		for (const z of [-10.35, 10.35]) {
			const far = z < 0;
			mesh(
				p,
				geometry.box,
				flat(0xa8e2db, far ? 0.065 : 0.025),
				[0, far ? 2.17 : 1.6, z],
				[31.8, far ? 1.6 : 0.5, 0.025],
			);
			for (let x = -16; x <= 16; x += 4) {
				rod(p, [x, 1.34, z], [x, far ? 3.05 : 1.9, z], 0.035, 0x68979a);
			}
			rod(
				p,
				[-16, far ? 3.05 : 1.9, z],
				[16, far ? 3.05 : 1.9, z],
				0.025,
				0x82aaa9,
			);
		}
	}
	buildNet(sign) {
		const n = new THREE.Group();
		this.rink.add(n);
		n.position.x = sign * 18;
		// Goal opening is six rink units, matching the simulation.
		for (const z of [-3, 3]) rod(n, [0, 0.1, z], [0, 1.8, z], 0.1, 0xe84c3e);
		rod(n, [0, 1.8, -3], [0, 1.8, 3], 0.1, 0xe84c3e);
		rod(n, [0, 0.12, -3], [sign * 1.9, 0.12, -2.6], 0.075, 0xe84c3e);
		rod(n, [0, 0.12, 3], [sign * 1.9, 0.12, 2.6], 0.075, 0xe84c3e);
		rod(n, [sign * 1.9, 0.12, -2.6], [sign * 1.9, 0.12, 2.6], 0.075, 0xe84c3e);
		rod(n, [sign * 1.9, 0.12, -2.6], [sign * 1.4, 1.6, -2.6], 0.065, 0xcfdcd4);
		rod(n, [sign * 1.9, 0.12, 2.6], [sign * 1.4, 1.6, 2.6], 0.065, 0xcfdcd4);
		rod(n, [sign * 1.4, 1.6, -2.6], [sign * 1.4, 1.6, 2.6], 0.065, 0xcfdcd4);
		rod(n, [0, 1.8, -3], [sign * 1.4, 1.6, -2.6], 0.065, 0xcfdcd4);
		rod(n, [0, 1.8, 3], [sign * 1.4, 1.6, 2.6], 0.065, 0xcfdcd4);
		// Actual modeled net weave, not a texture plane.
		for (let z = -2.6; z < 2.65; z += 0.29) {
			line(
				n,
				[
					[sign * 1.9, 0.15, z],
					[sign * 1.4, 1.6, z],
					[0, 1.8, (z * 3) / 2.6],
				],
				0xc3d3ce,
				0.8,
			);
		}
		for (let y = 0.2; y < 1.7; y += 0.23) {
			const u = (y - 0.12) / 1.48;
			line(
				n,
				[
					[sign * (1.9 - 0.5 * u), y, -2.6],
					[sign * (1.9 - 0.5 * u), y, 2.6],
				],
				0xc3d3ce,
				0.8,
			);
		}
		for (const z of [-1, 1])
			for (let y = 0.3; y < 1.8; y += 0.25)
				line(
					n,
					[
						[0, y, z * 3],
						[sign * (1.9 - 0.5 * (y / 1.6)), y, z * 2.6],
					],
					0xc3d3ce,
					0.8,
				);
		const lamp = cyl(n, 0xfff0ce, sign * 1.1, 2.3, 0, 0.28, 0.48);
		this.goalLights.push(lamp);
		cyl(n, INK, sign * 1.1, 2.02, 0, 0.36, 0.08, false);
	}
	buildArena() {
		const s = this.scene,
			rand = seeded(1981);
		const arena = new THREE.Group();
		s.add(arena);
		this.arena = arena;
		// Tiered navy bleachers wrap a jewel-box rink.
		for (let row = 0; row < 4; row++) {
			const z = -13.4 - row * 1.55,
				y = -0.5 + row * 0.69;
			box(
				arena,
				row % 2 ? 0x184652 : 0x1d515b,
				0,
				y,
				z,
				46 + row * 2,
				0.7,
				1.6,
				false,
			);
			for (let col = 0; col < 27; col++) {
				const x = (col - 13) * 1.65;
				if (Math.abs(x) < 2.1 && row > 0) continue;
				const outfit = [0xf8c26a, 0x78b9bd, 0xef7b62, 0xebead7, 0x255d69][
					Math.floor(rand() * 5)
				];
				const spectator = new THREE.Group();
				spectator.position.set(x, y + 0.6, z);
				arena.add(spectator);
				box(spectator, outfit, 0, 0.2, 0, 0.62, 0.62, 0.48, false);
				ball(
					spectator,
					[0xdfac7d, 0xc88866, 0xf0c89b][col % 3],
					0,
					0.77,
					0,
					0.24,
					0.27,
					0.24,
					false,
				);
				const hat = ball(
					spectator,
					col % 3 ? 0x1b424f : 0xef7655,
					0,
					0.91,
					0,
					0.28,
					0.19,
					0.28,
					false,
				);
				if (col % 4 === 0) {
					box(spectator, 0xf3c26a, 0, 1.2, 0.02, 0.76, 0.11, 0.1, false);
					rod(spectator, [-0.35, 0.4, 0], [-0.36, 1.18, 0], 0.08, outfit);
					rod(spectator, [0.35, 0.4, 0], [0.36, 1.18, 0], 0.08, outfit);
				}
				spectator.userData.wave = rand() * TAU;
				if (col % 3 === 0) (this.spectators ??= []).push(spectator);
			}
		}
		for (const sign of [-1, 1])
			for (let r = 0; r < 3; r++) {
				box(
					arena,
					0x174450,
					sign * (22 + r * 1.2),
					-0.1 + r * 0.6,
					0,
					1.2,
					0.7,
					24 + r * 2,
					false,
				);
				for (let z = -11; z < 12; z += 1.8) {
					const x = sign * (22 + r * 1.2),
						y = 0.7 + r * 0.6;
					const c = [0xef805e, 0x5c9fa8, 0xf4c570][Math.floor(rand() * 3)];
					box(arena, c, x, y, z, 0.57, 0.69, 0.62, false);
					ball(arena, 0xe4b184, x, y + 0.59, z, 0.23, 0.26, 0.23, false);
				}
			}
		// Rear fascia, club pennants and hanging lamps.
		box(arena, INK, 0, 3.15, -19.8, 54, 1.25, 0.8, false);
		box(arena, 0xf4bf5d, 0, 3.84, -19.8, 54, 0.08, 0.83, false);
		label(arena, "THE SLAM-BANK CLUB", 0, 3.18, -19.34, 15, 0.8, "#fff0cc");
		label(arena, "EST. 1981", -19, 3.15, -19.33, 7, 0.55, "#68bac4");
		label(arena, "NO ICE. NO DICE.", 19, 3.15, -19.33, 8, 0.52, "#f18c68");
		for (const x of [-17, -12, 12, 17]) {
			const pennant = mesh(
				arena,
				new THREE.PlaneGeometry(2.1, 3.1),
				flat(x < 0 ? 0x128ea1 : 0xe95c43),
				[x, 5.22, -19.2],
			);
			label(arena, x < 0 ? "N" : "R", x, 5.44, -19.14, 1.35, 1.5, "#fff0cc");
			rod(
				arena,
				[x - 1.25, 6.8, -19.2],
				[x + 1.25, 6.8, -19.2],
				0.06,
				0xf0c26f,
			);
		}
		for (const x of [-16, 16]) {
			rod(arena, [x, 1, -17.3], [x, 9, -17.3], 0.15, 0x18404c);
			box(arena, INK, x, 8.7, -15.2, 7, 0.44, 1.1);
			for (let i = 0; i < 5; i++) {
				const light = box(
					arena,
					0xfff2be,
					x - 2.7 + i * 1.35,
					8.43,
					-14.94,
					0.94,
					0.1,
					0.8,
					false,
				);
			}
		}
		// Foreground concourse stripe keeps the arena from floating in empty space.
		slab(arena, 50, 34, 6, 0.35, 0x123744, -2.05);
		for (const x of [-22, 22]) {
			box(arena, INK, x, -0.45, 11.8, 2.6, 1.8, 2.5);
			label(
				arena,
				x < 0 ? "HOME" : "AWAY",
				x,
				0.52,
				13.09,
				2.4,
				0.4,
				"#f5c76f",
			);
		}
		const badge = label(
			arena,
			"2 ON 2   /   ALL HEART",
			0,
			-0.15,
			13.0,
			13,
			0.55,
			"#8bb7b4",
		);
		badge.rotation.x = -Math.PI / 2;
	}
	setTheme(index) {
		this.theme = index || 0;
		this.scene.background.setHex(
			[0x102e3b, 0x252940, 0x183c3d][this.theme % 3],
		);
	}
	resize(w, h) {
		const aspect = w / h;
		// Preserve the entire rink on both widescreen TV and portrait touch screens.
		const halfW = Math.max(23.5, 13.5 * aspect),
			halfH = halfW / aspect;
		this.camera.left = -halfW;
		this.camera.right = halfW;
		this.camera.top = halfH;
		this.camera.bottom = -halfH;
		this.camera.updateProjectionMatrix();
	}
	burst(x, z, type = "check", team = 0) {
		const count =
			type === "goal" ? 95 : type === "check" ? 19 : type === "shot" ? 9 : 7;
		const rand = seeded(
			Math.floor((x + 30) * 535 + (z + 20) * 192 + this.clock * 10000),
		);
		for (let i = 0; i < count; i++) {
			const confetti = type === "goal",
				col = confetti
					? [TEAMS[team], 0xffcf6a, 0xfff1d1, 0x7bcbd0][i % 4]
					: type === "check"
						? 0xffce65
						: 0xc9f9f4;
			const m = mesh(
				this.scene,
				confetti ? geometry.box : geometry.sphere,
				flat(col),
				[x, 0.25, z],
				confetti ? [0.1, 0.025, 0.21] : [0.065, 0.065, 0.065],
			);
			const a = rand() * TAU,
				v = (confetti ? 5 : 2) + rand() * (confetti ? 11 : 6);
			this.particles.push({
				m,
				vx: Math.cos(a) * v,
				vz: Math.sin(a) * v,
				vy: (confetti ? 6 : 2) + rand() * 5,
				life: confetti ? 2.7 : 0.6,
				max: confetti ? 2.7 : 0.6,
				confetti,
			});
		}
		if (type === "goal") this.shake = 0.22;
		else if (type === "check") this.shake = 0.07;
	}
	update(state, dt) {
		dt = Math.min(dt || 0, 1 / 20);
		this.clock += dt;
		const players = state.players || [];
		for (let i = 0; i < this.players.length; i++) {
			const v = this.players[i],
				p = players[i];
			if (!p) {
				v.root.visible = false;
				continue;
			}
			v.root.visible = true;
			v.root.position.set(p.x || 0, 0.04, p.z || 0);
			v.root.rotation.y = -(p.angle || 0);
			const speed = Number.isFinite(p.speed)
				? p.speed
				: Math.hypot(p.vx || 0, p.vz || 0);
			v.skateAction.enabled = true;
			v.skateAction.setEffectiveWeight(
				p.stun > 0 || state.phase === "goal" ? 0 : Math.min(1, speed / 2),
			);
			v.skateAction.timeScale = Math.max(0.25, speed / 7);
			if (
				state.phase === "goal" &&
				state.goalTeam === v.team &&
				this.lastPhase !== "goal"
			)
				v.actions.celebrate.reset().setLoop(THREE.LoopRepeat, 3).play();
			v.mixer.update(dt);
			if (p.stun > 0) {
				v.pivot.rotation.z = -1.28;
				v.pivot.position.y = -0.12;
			} else if (p.action !== "check") {
				v.pivot.rotation.z = 0;
			}
			const active =
				p.active ||
				(state.selected && state.selected[v.team] === i) ||
				(state.selected && state.selected[v.team] === v.index);
			v.selectedRing.visible = !!active;
			v.selectedRingInk.visible = !!active;
			v.arrow.visible = !!active;
			v.arrow.position.y = 3.04 + Math.sin(this.clock * 4 + i) * 0.08;
			v.puckRing.visible = !!p.hasPuck;
			const actionKey = p.actionId ?? p.action;
			if (p.action && v.actions[p.action] && actionKey !== v.lastAction) {
				v.actions[p.action].reset().play();
				v.lastAction = actionKey;
			}
			if (!p.action) v.lastAction = null;
		}
		const puck = state.puck || { x: 0, z: 0 };
		this.puck.position.set(puck.x || 0, 0, puck.z || 0);
		this.puckHalo.rotation.z = this.clock * 2;
		if (state.theme !== undefined && state.theme !== this.theme)
			this.setTheme(state.theme);
		this.trailTimer += dt;
		if (this.trailTimer > 0.035 && state.phase !== "menu") {
			this.trailTimer = 0;
			const last = this.trail[this.trail.length - 1];
			if (!last || Math.hypot(puck.x - last.x, puck.z - last.z) > 0.1) {
				const d = disk(
					this.scene,
					0x729fac,
					puck.x || 0,
					puck.z || 0,
					0.18,
					0.024,
					0.22,
				);
				this.trail.push({ m: d, life: 0.4, x: puck.x, z: puck.z });
			}
		}
		for (let i = this.trail.length - 1; i >= 0; i--) {
			const p = this.trail[i];
			p.life -= dt;
			p.m.scale.setScalar(Math.max(0.001, p.life / 0.4));
			if (p.life <= 0) {
				this.scene.remove(p.m);
				p.m.geometry.dispose();
				this.trail.splice(i, 1);
			}
		}
		for (let i = this.particles.length - 1; i >= 0; i--) {
			const p = this.particles[i];
			p.life -= dt;
			p.vy -= dt * 15;
			p.m.position.x += p.vx * dt;
			p.m.position.y += p.vy * dt;
			p.m.position.z += p.vz * dt;
			if (p.m.position.y < 0.06) {
				p.m.position.y = 0.06;
				p.vy = Math.abs(p.vy) * 0.27;
				p.vx *= 0.89;
				p.vz *= 0.89;
			}
			if (p.confetti) {
				p.m.rotation.x += dt * 5;
				p.m.rotation.z += dt * 3;
			}
			p.m.scale.multiplyScalar(1 - dt * 0.8);
			if (p.life <= 0) {
				this.scene.remove(p.m);
				this.particles.splice(i, 1);
			}
		}
		if (this.spectators)
			for (let i = 0; i < this.spectators.length; i++) {
				const p = this.spectators[i];
				p.rotation.z = Math.sin(this.clock * 2 + p.userData.wave) * 0.035;
			}
		const goalFlash = state.phase === "goal" && Math.sin(this.clock * 18) > 0;
		if (goalFlash !== this.goalFlash || state.phase !== this.lastPhase) {
			for (let i = 0; i < this.goalLights.length; i++)
				this.goalLights[i].material =
					goalFlash && i === 1 - (state.goalTeam || 0)
						? this.goalOnMaterial
						: this.goalOffMaterial;
			this.goalFlash = goalFlash;
		}
		this.aim.visible = false;
		if (state.aim && state.aim.active) {
			this.aim.visible = true;
			this.aim.position.set(state.aim.x, 0, state.aim.z);
			this.aim.rotation.y = -(state.aim.angle || 0);
			this.aim.scale.x = 0.6 + (state.charge || 0) * 0.8;
		}
		const menu = state.phase === "menu";
		const targetX = menu ? -7 : 0;
		this.camera.position.x +=
			(targetX - this.camera.position.x) * Math.min(1, dt * 3);
		this.shake = Math.max(0, this.shake - dt);
		this.camera.position.y =
			34 + (this.shake ? Math.sin(this.clock * 150) * this.shake * 0.8 : 0);
		this.camera.lookAt(this.camera.position.x, 0, 0);
		this.lastPhase = state.phase;
	}
}
