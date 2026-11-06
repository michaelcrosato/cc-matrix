import * as THREE from "three/webgpu";
import { RAPIER, random, river, SECTORS } from "./simulation.mjs";

export { THREE };

const INK = 0x172d36,
	CREAM = 0xffe8ad;
const lineMat = new THREE.LineBasicMaterial({ color: INK });
const ramp = new THREE.DataTexture(
	new Uint8Array([80, 80, 80, 255, 160, 160, 160, 255, 255, 255, 255, 255]),
	3,
	1,
	THREE.RGBAFormat,
);
ramp.minFilter = THREE.NearestFilter;
ramp.magFilter = THREE.NearestFilter;
ramp.needsUpdate = true;
const mats = new Map();
function toon(color) {
	if (!mats.has(color))
		mats.set(color, new THREE.MeshToonMaterial({ color, gradientMap: ramp }));
	return mats.get(color);
}
function mesh(parent, geo, color, pos = [0, 0, 0], outline = true) {
	const m = new THREE.Mesh(geo, toon(color));
	m.position.set(...pos);
	m.castShadow = true;
	m.receiveShadow = true;
	if (outline) {
		const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 35), lineMat);
		e.renderOrder = 1;
		m.add(e);
	}
	parent.add(m);
	return m;
}
function box(p, w, h, d, c, pos = [0, 0, 0], outline = true) {
	return mesh(p, new THREE.BoxGeometry(w, h, d), c, pos, outline);
}
function cylinder(
	p,
	r1,
	r2,
	h,
	c,
	pos = [0, 0, 0],
	segments = 8,
	outline = true,
) {
	return mesh(
		p,
		new THREE.CylinderGeometry(r1, r2, h, segments),
		c,
		pos,
		outline,
	);
}
function sphere(p, r, c, pos = [0, 0, 0], detail = 0) {
	return mesh(p, new THREE.IcosahedronGeometry(r, detail), c, pos, true);
}
function wing(p, points, color, y = 0.7) {
	const s = new THREE.Shape();
	points.forEach(([x, z], i) => {
		if (i) s.lineTo(x, z);
		else s.moveTo(x, z);
	});
	s.closePath();
	const g = new THREE.ExtrudeGeometry(s, { depth: 0.16, bevelEnabled: false });
	g.rotateX(Math.PI / 2);
	return mesh(p, g, color, [0, y, 0]);
}
function animate(root, tracks, duration = 1, once = false) {
	const mixer = new THREE.AnimationMixer(root),
		clip = new THREE.AnimationClip("flight", duration, tracks),
		a = mixer.clipAction(clip);
	if (once) {
		a.setLoop(THREE.LoopOnce, 1);
		a.clampWhenFinished = true;
	}
	a.play();
	return mixer;
}
function shadow(p, x = 0, z = 0, sx = 2, sz = 1) {
	const m = new THREE.Mesh(
		new THREE.CircleGeometry(1, 16),
		new THREE.MeshBasicMaterial({
			color: INK,
			transparent: true,
			opacity: 0.17,
			depthWrite: false,
		}),
	);
	m.rotation.x = -Math.PI / 2;
	m.position.set(x, 0.025, z);
	m.scale.set(sx, sz, 1);
	p.add(m);
	return m;
}
function label(
	text,
	bg = "#175d58",
	fg = "#fff2bf",
	width = 256,
	height = 128,
) {
	const c = document.createElement("canvas");
	c.width = width;
	c.height = height;
	const x = c.getContext("2d");
	x.fillStyle = bg;
	x.fillRect(0, 0, width, height);
	x.fillStyle = fg;
	x.textAlign = "center";
	x.textBaseline = "middle";
	x.font = `900 ${Math.floor(height * 0.65)}px sans-serif`;
	x.fillText(text, width / 2, height / 2);
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.SRGBColorSpace;
	return t;
}
const fuelLabel = () =>
	new THREE.MeshBasicMaterial({ map: label("FUEL"), side: THREE.DoubleSide });
export function plane(color = 0xf6bb43) {
	const g = new THREE.Group(),
		air = new THREE.Group();
	air.name = "airframe";
	g.add(air);
	shadow(g, 1, 1, 2.7, 1.5);
	const body = mesh(
		air,
		new THREE.CapsuleGeometry(0.4, 2.3, 3, 6),
		color,
		[0, 1.7, 0],
	);
	body.rotation.x = Math.PI / 2;
	const nose = mesh(
		air,
		new THREE.ConeGeometry(0.4, 1.2, 6),
		CREAM,
		[0, 1.7, -1.75],
	);
	nose.rotation.x = -Math.PI / 2;
	wing(
		air,
		[
			[-0.27, -0.9],
			[-2.65, 0.8],
			[-2.65, 1.2],
			[-0.3, 0.55],
			[0.3, 0.55],
			[2.65, 1.2],
			[2.65, 0.8],
			[0.27, -0.9],
		],
		color,
		1.7,
	);
	wing(
		air,
		[
			[-0.22, 1],
			[-1.25, 1.7],
			[-1.25, 2],
			[-0.2, 1.7],
			[0.2, 1.7],
			[1.25, 2],
			[1.25, 1.7],
			[0.22, 1],
		],
		color,
		1.75,
	);
	box(air, 0.13, 0.95, 0.9, 0xe76e43, [0, 2.05, 1.35]);
	const glass = mesh(
		air,
		new THREE.SphereGeometry(0.39, 8, 6),
		0x183e49,
		[0, 2.02, -0.55],
	);
	glass.scale.set(0.7, 0.75, 1.8);
	box(air, 0.08, 0.025, 0.95, 0x86d1c3, [0, 2.31, -0.55], false);
	for (const s of [-1, 1]) {
		box(air, 0.16, 0.15, 1.1, INK, [s * 1.6, 1.7, 0.5]);
		box(air, 0.3, 0.04, 0.55, CREAM, [s * 1.8, 1.8, 0.6]);
	}
	const plume = new THREE.Group();
	plume.name = "plume";
	plume.position.set(0, 1.7, 1.65);
	air.add(plume);
	const flame = mesh(
		plume,
		new THREE.ConeGeometry(0.28, 1.6, 6),
		0xff8145,
		[0, 0, 0.6],
		false,
	);
	flame.rotation.x = Math.PI / 2;
	const inner = mesh(
		plume,
		new THREE.ConeGeometry(0.15, 1.1, 6),
		0xffe8ad,
		[0, 0, 0.5],
		false,
	);
	inner.rotation.x = Math.PI / 2;
	g.userData.mixer = animate(
		g,
		[
			new THREE.VectorKeyframeTrack(
				"plume.scale",
				[0, 0.08, 0.16],
				[1, 1, 0.8, 1.1, 1.1, 1.4, 1, 1, 0.8],
			),
			new THREE.NumberKeyframeTrack(
				"airframe.position[y]",
				[0, 0.6, 1.2],
				[0, 0.09, 0],
			),
		],
		1.2,
	);
	g.userData.air = air;
	return g;
}
function boat(type) {
	const g = new THREE.Group();
	shadow(g, 1, 0, 1.6, 3);
	const _hull = wing(
		g,
		[
			[-1.25, 1.8],
			[-1.25, -1],
			[0, -2.5],
			[1.25, -1],
			[1.25, 1.8],
		],
		type === "boss" ? 0x865765 : 0xde6d52,
		0.65,
	);
	box(g, 2.2, 0.65, 3.2, 0x394f53, [0, 0.85, -0.05]);
	box(g, 1.4, 1.2, 1.2, 0xe4c58b, [0, 1.5, 0.5]);
	box(g, 1.45, 0.12, 1.3, INK, [0, 2.17, 0.5]);
	box(g, 0.85, 0.5, 0.25, 0x89cbc3, [0, 1.6, -0.15]);
	cylinder(g, 0.2, 0.25, 1.1, 0xc75e4c, [0.5, 1.8, 1.1]);
	for (const s of [-1, 1])
		box(g, 0.16, 0.15, 2.5, CREAM, [s * 0.95, 1.22, -0.2]);
	return g;
}
function heli() {
	const g = new THREE.Group();
	shadow(g, 0.8, 0.5, 1.8, 1.3);
	const body = sphere(g, 1.05, 0xd76b53, [0, 2.5, 0], 1);
	body.scale.set(0.8, 0.65, 1.4);
	const glass = sphere(g, 0.69, 0x29565a, [0, 2.58, -0.6], 1);
	glass.scale.set(0.95, 0.75, 0.9);
	box(g, 0.25, 0.25, 2.9, 0xe7c27e, [0, 2.5, 1.4]);
	box(g, 1.25, 0.15, 0.45, 0xd76b53, [0, 2.6, 2.65]);
	for (const s of [-1, 1]) {
		box(g, 0.14, 0.14, 2.2, INK, [s * 0.9, 1.7, 0]);
		box(g, 0.1, 0.6, 0.1, INK, [s * 0.7, 2, 0]);
	}
	const rotor = new THREE.Group();
	rotor.name = "rotor";
	rotor.position.y = 3.2;
	g.add(rotor);
	box(rotor, 4.4, 0.075, 0.18, INK);
	box(rotor, 0.18, 0.075, 4.4, INK);
	cylinder(rotor, 0.18, 0.18, 0.2, CREAM);
	g.userData.mixer = animate(
		g,
		[
			new THREE.NumberKeyframeTrack(
				"rotor.rotation[y]",
				[0, 0.24],
				[0, Math.PI * 2],
			),
		],
		0.24,
	);
	return g;
}
function turret(color = 0xe4b268) {
	const g = new THREE.Group();
	cylinder(g, 1.1, 1.4, 0.6, 0x4a6767, [0, 0.4, 0]);
	const head = new THREE.Group();
	head.name = "head";
	g.add(head);
	cylinder(head, 0.78, 0.9, 0.6, color, [0, 1, 0]);
	box(head, 0.28, 0.28, 2.1, INK, [0, 1.2, -1]);
	box(head, 0.36, 0.1, 0.2, CREAM, [0, 1.25, -2]);
	g.userData.mixer = animate(
		g,
		[
			new THREE.NumberKeyframeTrack(
				"head.rotation[y]",
				[0, 1.5, 3],
				[-0.4, 0.4, -0.4],
			),
		],
		3,
	);
	return g;
}
function fuel() {
	const g = new THREE.Group();
	box(g, 3.1, 0.45, 15, 0x1d645a, [0, 0.45, 0]);
	for (const s of [-1, 1]) {
		box(g, 0.16, 0.15, 15, 0xffd969, [s * 1.52, 0.75, 0]);
		for (let z = -6; z <= 6; z += 3)
			cylinder(g, 0.37, 0.45, 0.9, 0xf4c252, [s * 1.6, 0.6, z], 6);
	}
	const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 1.25), fuelLabel());
	sign.rotation.x = -Math.PI / 2;
	sign.position.set(0, 0.73, 0);
	g.add(sign);
	const glow = new THREE.Group();
	glow.name = "beacon";
	glow.position.set(0, 1, -6);
	g.add(glow);
	sphere(glow, 0.3, 0xffef98);
	g.userData.mixer = animate(
		g,
		[
			new THREE.VectorKeyframeTrack(
				"beacon.scale",
				[0, 0.6, 1.2],
				[1, 1, 1, 1.6, 1.6, 1.6, 1, 1, 1],
			),
		],
		1.2,
	);
	return g;
}
function bridge(e) {
	const g = new THREE.Group(),
		w = e.rx || river(e.d).width + 1;
	box(g, w * 2, 0.55, 2.4, 0x8d9b91, [0, 0.9, 0]);
	box(g, w * 2, 0.06, 0.35, 0xe7c47d, [0, 1.22, 0], false);
	for (const s of [-1, 1]) {
		box(g, w * 2, 0.18, 0.15, 0xbf604b, [0, 2.15, s * 1.1]);
		box(g, w * 2, 0.14, 0.15, INK, [0, 1.3, s * 1.1]);
		for (let x = -w; x < w; x += 3) {
			box(g, 0.14, 0.9, 0.14, 0xbf604b, [x, 1.7, s * 1.1]);
			const b = box(g, 3.1, 0.12, 0.12, 0xe0b78b, [x + 1.5, 1.7, s * 1.1]);
			b.rotation.z = 0.25;
		}
	}
	for (const x of [-w * 0.8, 0, w * 0.8])
		box(g, 0.7, 1.4, 2.8, 0x54665f, [x, 0.4, 0]);
	return g;
}
function boss() {
	const g = new THREE.Group();
	shadow(g, 1, 1, 5.6, 6.2);
	wing(
		g,
		[
			[-5, 4],
			[-5, -3],
			[-3.6, -6],
			[3.6, -6],
			[5, -3],
			[5, 4],
		],
		0x3f535e,
		0.7,
	);
	box(g, 8.7, 0.8, 8.2, 0x785966, [0, 0.95, -0.2]);
	for (const x of [-3, 0, 3]) {
		box(g, 1.8, 0.2, 5.5, 0xc2936b, [x, 1.45, -1]);
	}
	box(g, 3.3, 2.3, 2.7, 0xc6b78c, [0, 2.4, 1.5]);
	box(g, 3.5, 0.2, 2.9, INK, [0, 3.6, 1.5]);
	for (const x of [-1, 0, 1]) box(g, 0.7, 0.5, 0.12, 0x7dc8bd, [x, 2.75, 0]);
	for (const s of [-1, 1])
		cylinder(g, 0.45, 0.6, 3.8, 0x293e4c, [s * 2.2, 3, 2.2]);
	const core = new THREE.Group();
	core.name = "core";
	core.position.set(0, 1.6, -3);
	g.add(core);
	cylinder(core, 0.75, 1.1, 0.5, 0xff7d55);
	g.userData.mixer = animate(
		g,
		[
			new THREE.VectorKeyframeTrack(
				"core.scale",
				[0, 0.5, 1],
				[1, 1, 1, 1.15, 1.5, 1.15, 1, 1, 1],
			),
		],
		1,
	);
	for (const s of [-1, 1]) {
		const paddle = cylinder(g, 1.25, 1.25, 1, 0xab795f, [s * 5, 0.9, 1]);
		paddle.rotation.z = Math.PI / 2;
	}
	return g;
}
function pickup(type) {
	const g = new THREE.Group(),
		q = new THREE.Group();
	q.name = "pickup";
	q.position.y = 1.5;
	g.add(q);
	box(q, 1.5, 0.8, 1.5, type === "repair" ? 0x80c7a0 : 0xf5c953);
	if (type === "repair") {
		box(q, 0.32, 0.08, 1.05, CREAM, [0, 0.45, 0]);
		box(q, 1.05, 0.08, 0.32, CREAM, [0, 0.45, 0]);
	} else {
		box(q, 0.2, 0.15, 1.2, INK, [-0.35, 0.5, 0]);
		box(q, 0.2, 0.15, 1.2, INK, [0.35, 0.5, 0]);
	}
	g.userData.mixer = animate(
		g,
		[
			new THREE.NumberKeyframeTrack(
				"pickup.rotation[y]",
				[0, 4],
				[0, Math.PI * 2],
			),
			new THREE.NumberKeyframeTrack(
				"pickup.position[y]",
				[0, 1, 2],
				[1.5, 2, 1.5],
			),
		],
		4,
	);
	return g;
}
function enemyModel(e) {
	if (e.type === "island") {
		const g = new THREE.Group();
		wing(
			g,
			[
				[-1.2, -6],
				[-2.5, -2],
				[-2, 4],
				[0, 6],
				[2, 3],
				[2.4, -2],
				[1, -6],
			],
			0xc4ad78,
			0.7,
		);
		wing(
			g,
			[
				[-0.8, -5],
				[-1.9, -2],
				[-1.5, 3],
				[0, 5],
				[1.5, 2],
				[1.8, -2],
				[0.7, -5],
			],
			0x81a372,
			0.85,
		);
		tree(g, 0, 0, e.id, 0);
		return g;
	}
	if (e.type === "boat") return boat();
	if (e.type === "heli") return heli();
	if (e.type === "fuel") return fuel();
	if (e.type === "bridge") return bridge(e);
	if (e.type === "jet") {
		const p = plane(0xd76b64);
		p.scale.setScalar(0.72);
		p.rotation.y = Math.PI * 0.22;
		return p;
	}
	if (e.type === "turret" || e.type === "bossTurret")
		return turret(e.type === "bossTurret" ? 0xd66b52 : 0xe4b268);
	if (e.type === "boss") return boss();
	if (e.type === "mine") {
		const g = new THREE.Group();
		sphere(g, 0.75, 0x364655, [0, 0.8, 0]);
		for (let a = 0; a < 6; a++) {
			const q = box(g, 0.18, 0.18, 1.8, 0xd46c58, [0, 0.8, 0]);
			q.rotation.y = (a * Math.PI) / 3;
		}
		cylinder(g, 0.2, 0.2, 0.25, 0xf9d177, [0, 1.5, 0]);
		return g;
	}
	return pickup(e.type);
}
function tree(g, x, z, seed, stage) {
	const r = random(seed),
		p = new THREE.Group();
	p.position.set(x, 0.8, z);
	const size = 0.7 + r() * 0.9;
	p.scale.setScalar(size);
	g.add(p);
	shadow(p, 1, 0, 1.5, 1);
	cylinder(p, 0.15, 0.28, 2, 0x765c41, [0, 1, 0], 5);
	if (stage === 1) {
		for (let i = 0; i < 2; i++) {
			const _m = cylinder(
				p,
				0.7 - i * 0.2,
				1.2 - i * 0.2,
				2.6 - i * 0.5,
				0x758a5d,
				[0, 2.3 + i * 1.3, 0],
				5,
			);
		}
	} else {
		sphere(p, 1.25, stage === 2 ? 0x547a7b : 0x497d62, [0, 2.8, 0], 0);
		sphere(p, 0.9, stage === 2 ? 0x739d94 : 0x84a96a, [-0.6, 2.9, 0.15], 0);
	}
}
function terrainTile(start) {
	const g = new THREE.Group(),
		rand = random(start * 17 + 471);
	const stage = start >= 1740 ? 2 : start >= 840 ? 1 : 0;
	const base = SECTORS[stage].color;
	const positions = [[], []],
		sides = [[], []],
		edges = [[], []];
	for (let d = start; d < start + 80; d += 4) {
		const a = river(d),
			b = river(d + 4);
		for (const [si, sign] of [-1, 1].entries()) {
			const x0 = a.center + sign * a.width,
				x1 = b.center + sign * b.width,
				far = sign * 65;
			if (sign > 0)
				positions[si].push(
					x0,
					0.75,
					-d,
					far,
					0.75,
					-d,
					x1,
					0.75,
					-d - 4,
					far,
					0.75,
					-d,
					far,
					0.75,
					-d - 4,
					x1,
					0.75,
					-d - 4,
				);
			else
				positions[si].push(
					x0,
					0.75,
					-d,
					x1,
					0.75,
					-d - 4,
					far,
					0.75,
					-d,
					far,
					0.75,
					-d,
					x1,
					0.75,
					-d - 4,
					far,
					0.75,
					-d - 4,
				);
			sides[si].push(
				x0,
				0.75,
				-d,
				x0,
				-0.3,
				-d,
				x1,
				0.75,
				-d - 4,
				x0,
				-0.3,
				-d,
				x1,
				-0.3,
				-d - 4,
				x1,
				0.75,
				-d - 4,
			);
			edges[si].push(
				new THREE.Vector3(x0, 0.78, -d),
				new THREE.Vector3(x1, 0.78, -d - 4),
			);
		}
	}
	for (let i = 0; i < 2; i++) {
		for (const [data, color] of [
			[positions[i], base],
			[sides[i], stage === 1 ? 0x8a6450 : 0x607e65],
		]) {
			const geo = new THREE.BufferGeometry();
			geo.setAttribute("position", new THREE.Float32BufferAttribute(data, 3));
			geo.computeVertexNormals();
			if (data === positions[i]) {
				const n = geo.attributes.normal;
				for (let k = 0; k < n.count; k++) n.setXYZ(k, 0, 1, 0);
			}
			const m = new THREE.Mesh(geo, toon(color));
			m.material.side = THREE.DoubleSide;
			m.receiveShadow = true;
			g.add(m);
		}
		g.add(
			new THREE.LineSegments(
				new THREE.BufferGeometry().setFromPoints(edges[i]),
				lineMat,
			),
		);
	}
	for (let i = 0; i < 45; i++) {
		const d = start + rand() * 80,
			v = river(d),
			s = rand() > 0.5 ? 1 : -1,
			x = v.center + s * (v.width + 1.6 + rand() * 20);
		if (i % 5 === 0) {
			const rock = sphere(
				g,
				0.7 + rand() * 1.2,
				stage === 1 ? 0xc7a080 : 0x77927a,
				[x, 1.1, -d],
			);
			rock.scale.y = 0.6;
		} else tree(g, x, -d, start + i * 13, stage);
	}
	for (let i = 0; i < 14; i++) {
		const d = start + rand() * 80,
			v = river(d),
			s = i % 2 ? 1 : -1,
			x = v.center + s * (v.width + 2 + rand() * 23);
		const patch = new THREE.Mesh(
			new THREE.CircleGeometry(2 + rand() * 3, 5),
			new THREE.MeshBasicMaterial({
				color: stage === 1 ? 0xb3825f : stage === 2 ? 0x68898c : 0x789c75,
			}),
		);
		patch.rotation.x = -Math.PI / 2;
		patch.position.set(x, 0.77, -d);
		g.add(patch);
		for (let k = 0; k < 3; k++) {
			const blade = new THREE.Mesh(
				new THREE.PlaneGeometry(0.035, 0.65),
				new THREE.MeshBasicMaterial({
					color: stage === 1 ? 0x8a7156 : 0x507462,
					side: THREE.DoubleSide,
				}),
			);
			blade.rotation.x = -Math.PI / 2;
			blade.rotation.z = 0.2 * k;
			blade.position.set(x + k * 0.24, 0.79, -d);
			g.add(blade);
		}
	}
	if (stage === 1) {
		for (const sign of [-1, 1]) {
			const d = start + 40,
				v = river(d);
			const rock = sphere(
				g,
				6,
				0xb78360,
				[v.center + sign * (v.width + 17), 3, -d],
				0,
			);
			rock.scale.set(1.3, 0.7, 1.8);
		}
	}
	if (stage === 2) {
		for (const sign of [-1, 1]) {
			const d = start + 35,
				v = river(d),
				p = new THREE.Group();
			p.position.set(v.center + sign * (v.width + 7), 0.8, -d);
			g.add(p);
			box(p, 4, 2.2, 5, 0x73858c, [0, 1, 0]);
			box(p, 4.4, 0.3, 5.4, 0x344b58, [0, 2.3, 0]);
			cylinder(p, 0.65, 0.8, 4.5, 0xa17764, [1, 3, 1]);
			box(p, 1.2, 0.5, 0.1, 0xafd4bd, [0, 1.5, -2.55]);
		}
	}
	return g;
}
function clean(node) {
	node.traverse((o) => {
		if (o.geometry) o.geometry.dispose();
		if (
			o.material &&
			!mats.has(o.material.color?.getHex()) &&
			o.material !== lineMat
		) {
			const arr = Array.isArray(o.material) ? o.material : [o.material];
			for (const m of arr) {
				if (m.map && m.map !== ramp) m.map.dispose();
				m.dispose();
			}
		}
	});
}
export class View {
	async init(canvas, settings) {
		this.canvas = canvas;
		this.settings = settings;
		this.renderer = new THREE.WebGPURenderer({
			canvas,
			antialias: true,
			alpha: false,
			powerPreference: "high-performance",
			forceWebGL: new URLSearchParams(location.search).has("webgl"),
		});
		this.renderer.onDeviceLost = (info) => this.recover(info);
		await this.renderer.init();
		this.backend = this.renderer.backend.isWebGPUBackend
			? "WebGPU"
			: "WebGL 2 fallback";
		this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFShadowMap;
		this.renderer.outputColorSpace = THREE.SRGBColorSpace;
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(0x8bbab0);
		this.scene.fog = new THREE.Fog(0xadc3ac, 145, 260);
		this.camera = new THREE.OrthographicCamera(-40, 40, 22, -22, 0.1, 400);
		this.camera.position.set(0, 73, 42);
		this.camera.lookAt(0, 0, -23);
		this.root = new THREE.Group();
		this.scene.add(this.root);
		this.scene.add(new THREE.HemisphereLight(0xfff1cd, 0x4e8990, 2));
		this.sun = new THREE.DirectionalLight(0xffe6bb, 2.2);
		this.sun.position.set(-35, 60, 15);
		this.sun.castShadow = true;
		this.sun.shadow.mapSize.set(1024, 1024);
		Object.assign(this.sun.shadow.camera, {
			left: -55,
			right: 55,
			top: 60,
			bottom: -45,
			near: 1,
			far: 160,
		});
		this.sun.shadow.bias = -0.001;
		this.sun.shadow.normalBias = 0.05;
		this.scene.add(this.sun);
		this.scene.add(this.sun.target);
		const water = new THREE.Mesh(
			new THREE.PlaneGeometry(160, 400),
			toon(0x247e86),
		);
		water.rotation.x = -Math.PI / 2;
		water.position.set(0, -0.06, -80);
		water.receiveShadow = true;
		this.scene.add(water);
		this.water = water;
		this.tiles = new Map();
		this.models = new Map();
		this.pilots = new Map();
		this.shots = new Map();
		this.effects = [];
		this.debris = [];
		this.fxworld = new RAPIER.World({ x: 0, y: -12, z: 0 });
		this.fxworld.createCollider(
			RAPIER.ColliderDesc.cuboid(100, 0.1, 2100).setTranslation(0, -0.3, -1400),
		);
		this.shake = 0;
		this.rng = random(45);
		this.glints = new THREE.Group();
		this.scene.add(this.glints);
		for (let i = 0; i < 110; i++) {
			const line = new THREE.Mesh(
				new THREE.PlaneGeometry(
					0.3 + this.rng() * 1.3,
					0.035 + this.rng() * 0.035,
				),
				new THREE.MeshBasicMaterial({
					color: i % 3 ? 0x88c8bd : 0xe2e5ba,
					transparent: true,
					opacity: i % 3 ? 0.5 : 0.8,
					depthWrite: false,
				}),
			);
			line.rotation.x = -Math.PI / 2;
			this.glints.add(line);
			line.userData = {
				x: this.rng() * 30 - 15,
				z: this.rng() * 160 - 120,
				phase: this.rng() * 10,
			};
		}
		this.resize();
		return this;
	}
	async recover(_info) {
		if (this.recovering || !this.renderer.backend.isWebGPUBackend) return;
		this.recovering = true;
		this.recovered = true;
		console.warn(
			"WebGPU device unavailable; restoring the flight with WebGL 2.",
		);
		const old = this.renderer;
		old.onDeviceLost = () => {};
		const canvas = this.canvas.cloneNode(false);
		this.canvas.replaceWith(canvas);
		this.canvas = canvas;
		try {
			const next = new THREE.WebGPURenderer({
				canvas,
				antialias: true,
				forceWebGL: true,
			});
			await next.init();
			this.renderer = next;
			next.setPixelRatio(Math.min(devicePixelRatio, 1.6));
			next.shadowMap.enabled = true;
			next.shadowMap.type = THREE.PCFShadowMap;
			next.outputColorSpace = THREE.SRGBColorSpace;
			this.backend = "WebGL 2 recovery";
			this.resize();
			try {
				old.dispose();
			} catch {}
		} catch (e) {
			console.error("Graphics recovery failed", e);
		} finally {
			this.recovering = false;
		}
	}
	resize() {
		const w = innerWidth,
			h = innerHeight;
		this.renderer.setSize(w, h, false);
		const a = w / h,
			halfWidth = Math.max(15.8, 20 * a),
			halfHeight = halfWidth / a;
		this.camera.left = -halfWidth;
		this.camera.right = halfWidth;
		this.camera.top = halfHeight;
		this.camera.bottom = -halfHeight;
		this.camera.updateProjectionMatrix();
	}
	point(x, y) {
		const v = new THREE.Vector3(
			(x / innerWidth) * 2 - 1,
			(-y / innerHeight) * 2 + 1,
			0,
		);
		const ray = new THREE.Raycaster();
		ray.setFromCamera(v, this.camera);
		const p = new THREE.Vector3();
		ray.ray.intersectPlane(
			new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.5),
			p,
		);
		return p;
	}
	effect(type, x, d) {
		const group = new THREE.Group();
		group.position.set(x, 0, -d);
		this.root.add(group);
		let mixer,
			life = 0.65;
		if (type === "pulse") {
			const geo = new THREE.TorusGeometry(1, 0.09, 5, 48),
				ring = new THREE.Mesh(
					geo,
					new THREE.MeshBasicMaterial({
						color: 0xffe6a0,
						transparent: true,
						opacity: 0.95,
					}),
				);
			ring.rotation.x = -Math.PI / 2;
			ring.position.y = 1.5;
			ring.name = "ring";
			group.add(ring);
			mixer = animate(
				group,
				[
					new THREE.VectorKeyframeTrack(
						"ring.scale",
						[0, 0.65],
						[1, 1, 1, 30, 30, 30],
					),
					new THREE.NumberKeyframeTrack(
						"ring.material.opacity",
						[0, 0.3, 0.65],
						[0.95, 0.8, 0],
					),
				],
				0.65,
				true,
			);
			this.shake = 0.25;
		} else if (type === "spark") {
			const q = mesh(
				group,
				new THREE.IcosahedronGeometry(0.6),
				CREAM,
				[0, 1.6, 0],
				false,
			);
			q.name = "flash";
			q.material = new THREE.MeshBasicMaterial({
				color: CREAM,
				transparent: true,
			});
			mixer = animate(
				group,
				[
					new THREE.VectorKeyframeTrack(
						"flash.scale",
						[0, 0.14],
						[1, 1, 1, 0.05, 0.05, 0.05],
					),
					new THREE.NumberKeyframeTrack(
						"flash.material.opacity",
						[0, 0.14],
						[1, 0],
					),
				],
				0.14,
				true,
			);
			life = 0.16;
		} else {
			life = 1;
			const f = mesh(
				group,
				new THREE.IcosahedronGeometry(1.6),
				0xffb94e,
				[0, 1.5, 0],
			);
			f.name = "flash";
			f.material = new THREE.MeshBasicMaterial({
				color: 0xffb94e,
				transparent: true,
			});
			const _inner = mesh(
				f,
				new THREE.IcosahedronGeometry(0.8),
				CREAM,
				[0, 0.1, 0],
				false,
			);
			const ring = new THREE.Mesh(
				new THREE.TorusGeometry(1, 0.08, 4, 32),
				new THREE.MeshBasicMaterial({
					color: CREAM,
					transparent: true,
					opacity: 0.9,
				}),
			);
			ring.name = "ring";
			ring.rotation.x = -Math.PI / 2;
			ring.position.y = 0.25;
			group.add(ring);
			mixer = animate(
				group,
				[
					new THREE.VectorKeyframeTrack(
						"flash.scale",
						[0, 0.08, 0.7],
						[0.3, 0.3, 0.3, 1.5, 1.5, 1.5, 0.05, 0.05, 0.05],
					),
					new THREE.NumberKeyframeTrack(
						"flash.material.opacity",
						[0, 0.4, 0.7],
						[1, 1, 0],
					),
					new THREE.VectorKeyframeTrack(
						"ring.scale",
						[0, 0.7],
						[1, 1, 1, 6, 6, 6],
					),
					new THREE.NumberKeyframeTrack(
						"ring.material.opacity",
						[0, 0.7],
						[0.9, 0],
					),
				],
				0.7,
				true,
			);
			this.shake = 0.4;
			for (let i = 0; i < 7; i++) {
				const m = box(
					this.root,
					0.25 + this.rng() * 0.5,
					0.25 + this.rng() * 0.4,
					0.3 + this.rng() * 0.4,
					i % 2 ? 0x344a51 : 0xc8925e,
					[x, 2, -d],
				);
				const body = this.fxworld.createRigidBody(
					RAPIER.RigidBodyDesc.dynamic().setTranslation(x, 2, -d),
				);
				this.fxworld.createCollider(
					RAPIER.ColliderDesc.cuboid(0.2, 0.2, 0.2).setRestitution(0.5),
					body,
				);
				body.applyImpulse(
					{
						x: (this.rng() - 0.5) * 9,
						y: 3 + this.rng() * 7,
						z: (this.rng() - 0.5) * 9,
					},
					true,
				);
				body.setAngvel(
					{ x: this.rng() * 5, y: this.rng() * 6, z: this.rng() * 7 },
					true,
				);
				this.debris.push({ m, body, life: 2.5 });
			}
		}
		this.effects.push({ group, mixer, life });
	}
	handle(events) {
		for (const e of events) {
			if (e.type === "kill" || e.type === "crash")
				this.effect("explosion", e.x, e.d);
			if (e.type === "spark") this.effect("spark", e.x, e.d);
			if (e.type === "pulse") this.effect("pulse", e.x, e.d);
			if (e.type === "hurt") this.shake = 0.5;
		}
	}
	render(s, dt, menu = false) {
		if (this.recovering) return;
		this.root.position.z = s.progress;
		const tile = Math.floor(s.progress / 80);
		for (let i = tile - 1; i <= tile + 2; i++)
			if (!this.tiles.has(i)) {
				const t = terrainTile(i * 80);
				this.tiles.set(i, t);
				this.root.add(t);
			}
		for (const [i, t] of this.tiles)
			if (i < tile - 1 || i > tile + 2) {
				this.root.remove(t);
				clean(t);
				this.tiles.delete(i);
			}
		const ec = new Set();
		for (const e of s.entities) {
			ec.add(e.id);
			let m = this.models.get(e.id);
			if (!m) {
				m = enemyModel(e);
				m.userData.kind = e.type;
				this.models.set(e.id, m);
				this.root.add(m);
			}
			m.position.set(e.x, 0, -e.d);
			m.userData.mixer?.update(dt);
			if (e.type === "jet") m.rotation.z = Math.sin(s.time * 2 + e.id) * 0.3;
		}
		for (const [id, m] of this.models)
			if (!ec.has(id)) {
				this.root.remove(m);
				m.userData.mixer?.stopAllAction();
				clean(m);
				this.models.delete(id);
			}
		const pc = new Set();
		for (const p of s.players) {
			pc.add(p.id);
			let m = this.pilots.get(p.id);
			if (!m) {
				m = plane([0xf6bd4e, 0x77d7c0, 0xc0b0db, 0xe99b78][p.id % 4]);
				this.pilots.set(p.id, m);
				this.root.add(m);
			}
			m.visible =
				!p.removed &&
				p.lives > 0 &&
				p.respawn <= 0 &&
				(p.invuln <= 0 || Math.sin(s.time * 25) > -0.45);
			m.position.set(p.x, 0, -p.d);
			m.rotation.z = -(p.vx || 0) * 0.025;
			m.userData.mixer.update(dt);
			m.userData.air.rotation.y = -(p.vx || 0) * 0.006;
		}
		for (const [id, m] of this.pilots)
			if (!pc.has(id)) {
				this.root.remove(m);
				clean(m);
				this.pilots.delete(id);
			}
		const bc = new Set();
		for (const b of s.bullets) {
			bc.add(b.id);
			let m = this.shots.get(b.id);
			if (!m) {
				m = new THREE.Group();
				if (b.enemy) {
					sphere(m, 0.26, 0xff8458);
					const glow = new THREE.Mesh(
						new THREE.SphereGeometry(0.45, 6, 4),
						new THREE.MeshBasicMaterial({
							color: 0xff8b59,
							transparent: true,
							opacity: 0.24,
						}),
					);
					m.add(glow);
				} else {
					box(m, 0.13, 0.12, 1.2, CREAM);
					box(m, 0.24, 0.2, 0.7, 0xf6ba4e);
				}
				this.shots.set(b.id, m);
				this.root.add(m);
			}
			m.position.set(b.x, 1.5, -b.d);
			m.rotation.y = -Math.atan2(b.vx, b.vd);
		}
		for (const [id, m] of this.shots)
			if (!bc.has(id)) {
				this.root.remove(m);
				clean(m);
				this.shots.delete(id);
			}
		for (const e of this.effects) {
			e.life -= dt;
			e.mixer.update(dt);
		}
		for (let i = this.effects.length - 1; i >= 0; i--)
			if (this.effects[i].life <= 0) {
				const e = this.effects[i];
				this.root.remove(e.group);
				e.mixer.stopAllAction();
				clean(e.group);
				this.effects.splice(i, 1);
			}
		this.fxworld.timestep = Math.min(1 / 30, Math.max(1 / 240, dt));
		this.fxworld.step();
		for (let i = this.debris.length - 1; i >= 0; i--) {
			const e = this.debris[i];
			e.life -= dt;
			const t = e.body.translation(),
				r = e.body.rotation();
			e.m.position.copy(t);
			e.m.quaternion.copy(r);
			if (e.life < 0.5) e.m.scale.setScalar(Math.max(0.01, e.life * 2));
			if (e.life <= 0) {
				this.fxworld.removeRigidBody(e.body);
				this.root.remove(e.m);
				clean(e.m);
				this.debris.splice(i, 1);
			}
		}
		for (const m of this.glints.children) {
			const v = m.userData;
			const z = ((v.z + s.progress * 0.7) % 160) - 120;
			const d = s.progress - z,
				rv = river(d);
			m.visible = Math.abs(v.x - rv.center) < rv.width - 0.4;
			m.position.set(v.x, 0.01, z);
			m.scale.x = 0.7 + Math.sin(s.time * 1.5 + v.phase) * 0.3;
		}
		const tx = menu ? -13 : 0;
		this.camera.position.x +=
			(tx - this.camera.position.x) * Math.min(1, dt * 3);
		this.camera.position.y = 73;
		this.camera.position.z = 42;
		const target = new THREE.Vector3(this.camera.position.x, 0, -23);
		if (this.settings.shake && this.shake > 0) {
			this.camera.position.x += (this.rng() - 0.5) * this.shake;
			this.camera.position.z += (this.rng() - 0.5) * this.shake;
			this.shake = Math.max(0, this.shake - dt * 2);
		}
		this.camera.lookAt(target);
		this.renderer.render(this.scene, this.camera);
		this.lastFrame = {
			drawCalls: this.renderer.info.render.drawCalls,
			triangles: this.renderer.info.render.triangles,
		};
	}
	stats() {
		return {
			backend: this.backend,
			recovered: !!this.recovered,
			recovering: !!this.recovering,
			models: this.models.size,
			pilots: this.pilots.size,
			bullets: this.shots.size,
			tiles: this.tiles.size,
			effects: this.effects.length,
			debris: this.debris.length,
			animations: [...this.models.values(), ...this.pilots.values()].filter(
				(m) => m.userData.mixer,
			).length,
			lost: this.renderer._isDeviceLost,
			drawCalls: this.lastFrame?.drawCalls || 0,
			calls: this.renderer.info.render.calls,
			triangles: this.lastFrame?.triangles || 0,
		};
	}
}
