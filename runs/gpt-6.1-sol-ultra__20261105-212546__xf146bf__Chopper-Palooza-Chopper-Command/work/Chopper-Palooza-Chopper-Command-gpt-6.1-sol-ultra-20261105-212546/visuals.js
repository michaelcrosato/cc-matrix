import * as THREE from "three";

export const palette = Object.freeze({
	ink: 0x233c43,
	sky: 0xf6e5be,
	cream: 0xfff0c9,
	sand: 0xdca35f,
	coral: 0xe67555,
	teal: 0x24b4a4,
	tealDark: 0x237b7c,
	yellow: 0xf5ca57,
	white: 0xfff8df,
	night: 0x29505b,
});
const inkMaterial = new THREE.MeshBasicMaterial({
	color: palette.ink,
	side: THREE.BackSide,
});
const materials = new Map();
function material(color, emissive = false) {
	const key = `${color}-${emissive}`;
	if (!materials.has(key))
		materials.set(
			key,
			emissive
				? new THREE.MeshBasicMaterial({ color })
				: new THREE.MeshStandardMaterial({
						color,
						flatShading: true,
						roughness: 1,
						metalness: 0,
					}),
		);
	return materials.get(key);
}
function mesh(geometry, color, outline = true, emissive = false) {
	const object = new THREE.Mesh(geometry, material(color, emissive));
	if (outline) {
		const ink = new THREE.Mesh(geometry, inkMaterial);
		ink.scale.setScalar(1.045);
		object.add(ink);
	}
	object.castShadow = true;
	object.receiveShadow = true;
	return object;
}
function box(parent, x, y, z, w, h, d, color, outline = true) {
	const m = mesh(new THREE.BoxGeometry(w, h, d), color, outline);
	m.position.set(x, y, z);
	parent.add(m);
	return m;
}
function ellipsoid(parent, x, y, z, rx, ry, rz, color, detail = 1) {
	const m = mesh(new THREE.IcosahedronGeometry(1, detail), color);
	m.scale.set(rx, ry, rz);
	m.position.set(x, y, z);
	parent.add(m);
	return m;
}
function rod(parent, a, b, r, color, outline = true) {
	const start = new THREE.Vector3(...a),
		end = new THREE.Vector3(...b);
	const m = mesh(
		new THREE.CylinderGeometry(r, r, end.distanceTo(start), 6),
		color,
		outline,
	);
	m.position.copy(start).add(end).multiplyScalar(0.5);
	m.quaternion.setFromUnitVectors(
		new THREE.Vector3(0, 1, 0),
		end.sub(start).normalize(),
	);
	parent.add(m);
	return m;
}
function profile(parent, points, depth, color, z = 0) {
	const s = new THREE.Shape();
	points.forEach(([x, y], i) => {
		if (i) s.lineTo(x, y);
		else s.moveTo(x, y);
	});
	s.closePath();
	const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
	geo.translate(0, 0, -depth / 2);
	const m = mesh(geo, color);
	m.position.z = z;
	parent.add(m);
	return m;
}
function rotor(parent, name, x, y, z, size, color = palette.ink) {
	const g = new THREE.Group();
	g.name = name;
	g.position.set(x, y, z);
	parent.add(g);
	box(g, 0, 0, 0, size, 0.065, 0.19, color, false);
	box(g, 0, 0, 0, 0.19, 0.065, size * 0.76, color, false);
	ellipsoid(g, 0, 0.08, 0, 0.22, 0.15, 0.22, palette.cream, 0);
	return g;
}
function animated(group, tracks, duration) {
	const mixer = new THREE.AnimationMixer(group);
	const clip = new THREE.AnimationClip("mechanical-motion", duration, tracks);
	mixer.clipAction(clip).play();
	group.userData.mixer = mixer;
	group.userData.clip = clip;
	return group;
}

export function createHelicopter(color = palette.teal, isEnemy = false) {
	const g = new THREE.Group();
	g.name = isEnemy ? "Raider" : "Palooza One";
	profile(
		g,
		[
			[-1.9, -0.35],
			[-1.65, 0.65],
			[-0.6, 1.03],
			[1.1, 0.92],
			[2.02, 0.2],
			[1.76, -0.57],
			[0.1, -0.85],
			[-1.2, -0.69],
		],
		1.15,
		color,
	);
	profile(
		g,
		[
			[0.12, 0.77],
			[1.03, 0.7],
			[1.66, 0.16],
			[0.3, 0.05],
		],
		0.025,
		isEnemy ? 0x522f44 : 0x183f50,
		0.61,
	);
	profile(
		g,
		[
			[-0.78, 0.73],
			[-0.1, 0.77],
			[0.05, 0.08],
			[-0.85, 0.1],
		],
		0.025,
		isEnemy ? 0x733b50 : 0x4fc3cc,
		0.62,
	);
	rod(g, [0.23, 0.74, 0.65], [0.34, 0.04, 0.65], 0.045, palette.cream, false);
	profile(
		g,
		[
			[-1.65, 0.2],
			[-3.85, 0.74],
			[-4.2, 0.48],
			[-1.75, -0.32],
		],
		0.35,
		color,
	);
	profile(
		g,
		[
			[-3.78, 0.57],
			[-3.94, 1.45],
			[-4.4, 1.55],
			[-4.18, 0.37],
			[-3.7, 0.18],
		],
		0.24,
		isEnemy ? palette.yellow : palette.coral,
	);
	box(g, -1.1, 1.04, 0, 1.15, 0.27, 0.83, palette.cream);
	rod(g, [-0.38, 1.03, 0], [-0.38, 1.65, 0], 0.09, palette.ink);
	rotor(g, "mainRotor", -0.38, 1.67, 0, 7.8);
	const tail = new THREE.Group();
	tail.name = "tailRotor";
	tail.position.set(-3.96, 0.71, 0.32);
	g.add(tail);
	box(tail, 0, 0, 0, 1.25, 0.105, 0.075, palette.cream);
	box(tail, 0, 0, 0, 0.105, 1.25, 0.075, palette.cream);
	ellipsoid(tail, 0, 0, 0.06, 0.14, 0.14, 0.1, palette.ink, 0);
	for (const z of [-0.64, 0.64]) {
		rod(g, [-1, -0.6, z], [-1.3, -1.22, z], 0.055, palette.ink);
		rod(g, [0.85, -0.61, z], [0.63, -1.22, z], 0.055, palette.ink);
		rod(g, [-1.7, -1.22, z], [1.43, -1.22, z], 0.07, palette.cream);
		rod(g, [1.43, -1.22, z], [1.67, -1.04, z], 0.07, palette.cream);
	}
	box(g, -0.8, -0.28, 0.6, 0.55, 0.12, 0.06, palette.cream, false);
	box(g, 0.64, -0.83, 0.04, 1.23, 0.16, 0.49, palette.coral);
	rod(g, [1.27, -0.57, 0.2], [2.36, -0.57, 0.2], 0.115, palette.ink);
	ellipsoid(
		g,
		-2.7,
		0.53,
		0.22,
		0.13,
		0.13,
		0.13,
		isEnemy ? palette.yellow : palette.coral,
		0,
	);
	return animated(
		g,
		[
			new THREE.NumberKeyframeTrack(
				"mainRotor.rotation[y]",
				[0, 0.18],
				[0, Math.PI * 2],
			),
			new THREE.NumberKeyframeTrack(
				"tailRotor.rotation[z]",
				[0, 0.18],
				[0, -Math.PI * 6],
			),
		],
		0.18,
	);
}

export function createTruck() {
	const g = new THREE.Group();
	g.name = "Convoy";
	box(g, -0.8, 1.27, 0, 3.13, 1.64, 1.72, palette.cream);
	box(g, -0.8, 1.27, 0.885, 2.9, 0.22, 0.05, palette.coral, false);
	box(g, 1.4, 0.94, 0, 1.55, 1.33, 1.66, palette.coral);
	profile(
		g,
		[
			[0.7, 1.5],
			[0.99, 2.13],
			[1.76, 2.13],
			[2.15, 1.48],
		],
		1.63,
		palette.coral,
	);
	profile(
		g,
		[
			[1.06, 1.93],
			[1.67, 1.93],
			[1.94, 1.53],
			[0.87, 1.53],
		],
		0.025,
		0x345663,
		0.84,
	);
	box(g, 0, 0.49, 0, 4.6, 0.35, 1.75, palette.ink);
	for (const x of [-1.66, 1.38])
		for (const z of [-0.9, 0.9]) {
			const tire = mesh(
				new THREE.CylinderGeometry(0.48, 0.48, 0.24, 10),
				palette.ink,
			);
			tire.rotation.x = Math.PI / 2;
			tire.position.set(x, 0.5, z);
			g.add(tire);
			const hub = mesh(
				new THREE.CylinderGeometry(0.2, 0.2, 0.27, 8),
				palette.sand,
				false,
			);
			hub.rotation.x = Math.PI / 2;
			hub.position.copy(tire.position);
			g.add(hub);
		}
	box(g, 2.19, 1.04, 0.65, 0.12, 0.3, 0.31, palette.yellow, false);
	box(g, -0.82, 1.61, 0.91, 0.56, 0.57, 0.035, palette.teal, false);
	box(g, -0.82, 1.61, 0.94, 0.13, 0.38, 0.02, palette.cream, false);
	box(g, -0.82, 1.61, 0.94, 0.38, 0.13, 0.02, palette.cream, false);
	return g;
}

export function createJet() {
	const g = new THREE.Group();
	g.name = "Sunlance";
	profile(
		g,
		[
			[-3, -0.18],
			[-2.1, 0.38],
			[1.55, 0.48],
			[3.15, -0.13],
			[1.6, -0.49],
			[-1.83, -0.49],
		],
		0.78,
		palette.yellow,
	);
	profile(
		g,
		[
			[-1.35, 0.25],
			[-1.73, 1.41],
			[-2.29, 1.49],
			[-2.12, 0.12],
		],
		0.21,
		palette.coral,
	);
	profile(
		g,
		[
			[0.34, 0.43],
			[0.96, 0.88],
			[1.69, 0.67],
			[2.12, 0.39],
		],
		0.61,
		palette.night,
	);
	profile(
		g,
		[
			[-1, -0.1],
			[0.34, -1.24],
			[1.22, -1.24],
			[0.7, -0.12],
		],
		0.18,
		palette.coral,
		0.65,
	);
	box(g, -2.73, -0.19, 0, 0.4, 0.41, 0.57, palette.ink);
	const fire = ellipsoid(g, -3.15, -0.17, 0, 0.63, 0.2, 0.22, palette.coral, 0);
	fire.name = "jetFlame";
	return animated(
		g,
		[
			new THREE.NumberKeyframeTrack(
				"jetFlame.scale[x]",
				[0, 0.11, 0.22],
				[0.5, 0.8, 0.5],
			),
		],
		0.22,
	);
}

export function createBoss() {
	const g = new THREE.Group();
	g.name = "The Big Chop";
	profile(
		g,
		[
			[-7, -0.1],
			[-6, 2.1],
			[-3, 2.8],
			[3.8, 2.55],
			[7, 1.3],
			[7.8, -0.1],
			[5.8, -2],
			[-4.5, -2],
		],
		3.2,
		palette.night,
	);
	profile(
		g,
		[
			[-5.8, 1.55],
			[-3, 2.2],
			[3.5, 2.05],
			[6, 1.2],
			[5.7, 0.45],
			[-5.5, 0.52],
		],
		0.06,
		palette.coral,
		1.67,
	);
	for (let i = 0; i < 6; i++)
		box(
			g,
			-4.15 + i * 1.65,
			1.25,
			1.75,
			1.03,
			0.6,
			0.12,
			i % 2 ? palette.yellow : palette.cream,
		);
	box(g, 0, -0.3, 1.7, 6.2, 0.6, 0.16, palette.cream);
	box(g, 0, -0.3, 1.81, 1.2, 0.87, 0.06, palette.coral);
	for (const x of [-5.1, 5.1]) {
		box(g, x, -2.1, 0.1, 2.2, 1.23, 2.2, palette.coral);
		for (const z of [-0.8, 0.8])
			rod(g, [x, -2.3, z], [x, -3, z], 0.32, palette.ink);
		box(g, x, 2.4, 0, 2.7, 0.4, 2.3, palette.cream);
		rod(g, [x, 2.5, 0], [x, 3.27, 0], 0.17, palette.ink);
		rotor(g, x < 0 ? "bossRotorL" : "bossRotorR", x, 3.3, 0, 8.5);
	}
	for (let i = 0; i < 5; i++)
		box(g, -3.5 + i * 1.75, -1.2, 1.72, 0.7, 0.28, 0.06, palette.yellow, false);
	profile(
		g,
		[
			[-6.5, 0.7],
			[-7.4, 3.55],
			[-8.6, 3.72],
			[-8.1, 0.11],
		],
		0.5,
		palette.coral,
	);
	return animated(
		g,
		[
			new THREE.NumberKeyframeTrack(
				"bossRotorL.rotation[y]",
				[0, 0.24],
				[0, Math.PI * 2],
			),
			new THREE.NumberKeyframeTrack(
				"bossRotorR.rotation[y]",
				[0, 0.24],
				[0, -Math.PI * 2],
			),
		],
		0.24,
	);
}

export function createPilot() {
	const g = new THREE.Group();
	g.name = "Stranded pilot";
	box(g, 0, 0.75, 0, 0.48, 0.65, 0.34, palette.teal);
	ellipsoid(g, 0, 1.34, 0, 0.34, 0.34, 0.3, palette.cream, 1);
	box(g, 0.06, 1.39, 0.28, 0.35, 0.17, 0.08, palette.night, false);
	rod(g, [-0.13, 0.49, 0], [-0.19, 0.08, 0], 0.105, palette.ink);
	rod(g, [0.13, 0.49, 0], [0.22, 0.08, 0], 0.105, palette.ink);
	rod(g, [-0.25, 0.94, 0], [-0.52, 0.62, 0], 0.09, palette.cream);
	const arm = new THREE.Group();
	arm.name = "wavingArm";
	arm.position.set(0.25, 1, 0);
	g.add(arm);
	rod(arm, [0, 0, 0], [0.16, 0.49, 0], 0.09, palette.cream);
	const flag = new THREE.Group();
	flag.name = "rescueFlag";
	flag.position.set(-0.8, 0, 0);
	g.add(flag);
	rod(flag, [0, 0, 0], [0, 2.7, 0], 0.035, palette.ink, false);
	profile(
		flag,
		[
			[0, 2.6],
			[1.1, 2.43],
			[0, 2.1],
		],
		0.025,
		palette.coral,
		0.08,
	);
	return animated(
		g,
		[
			new THREE.NumberKeyframeTrack(
				"wavingArm.rotation[z]",
				[0, 0.4, 0.8],
				[-0.6, 0.45, -0.6],
			),
		],
		0.8,
	);
}

function mesa(parent, x, y, z, w, h, color) {
	const pts = [
		[-0.55 * w, 0],
		[-0.5 * w, 0.16 * h],
		[-0.34 * w, 0.21 * h],
		[-0.28 * w, 0.76 * h],
		[-0.13 * w, h],
		[0.22 * w, h],
		[0.34 * w, 0.84 * h],
		[0.36 * w, 0.36 * h],
		[0.5 * w, 0.25 * h],
		[0.61 * w, 0],
	];
	const m = profile(parent, pts, 3, color);
	m.position.set(x, y, z);
	// Horizontal strata and ochre facets read as hand-painted canyon walls.
	const strata = profile(
		parent,
		[
			[-0.3 * w, 0.64 * h],
			[0.32 * w, 0.64 * h],
			[0.33 * w, 0.58 * h],
			[-0.31 * w, 0.58 * h],
		],
		0.05,
		0xcf895f,
		2.05,
	);
	strata.position.set(x, y, z);
	const top = profile(
		parent,
		[
			[-0.13 * w, h],
			[0.22 * w, h],
			[0.26 * w, 0.91 * h],
			[-0.19 * w, 0.91 * h],
		],
		0.08,
		0xf2b978,
		2.06,
	);
	top.position.set(x, y, z);
}
function cactus(parent, x, z, height = 2) {
	const g = new THREE.Group();
	g.position.set(x, 0, z);
	parent.add(g);
	const c = 0x527c6a;
	rod(g, [0, 0, 0], [0, height, 0], 0.15, c);
	rod(g, [-0.03, height * 0.5, 0], [-0.62, height * 0.5, 0], 0.12, c);
	rod(g, [-0.62, height * 0.5, 0], [-0.62, height * 0.78, 0], 0.12, c);
	rod(g, [0.03, height * 0.33, 0], [0.54, height * 0.33, 0], 0.11, c);
	rod(g, [0.54, height * 0.33, 0], [0.54, height * 0.66, 0], 0.11, c);
	return g;
}
export function createWorld(scene) {
	const group = new THREE.Group();
	group.name = "Desert ink diorama";
	scene.add(group);
	const clouds = [];
	const sun = mesh(
		new THREE.CircleGeometry(6.8, 64),
		palette.yellow,
		false,
		true,
	);
	sun.position.set(35, 28, -45);
	group.add(sun);
	const ring = new THREE.Mesh(
		new THREE.RingGeometry(7.4, 7.52, 64),
		material(palette.coral, true),
	);
	ring.position.copy(sun.position);
	ring.position.z -= 0.1;
	group.add(ring);
	for (let i = 0; i < 14; i++) {
		const x = -210 + i * 33;
		mesa(
			group,
			x,
			-1,
			-32,
			26 + 9 * Math.sin(i * 3.7),
			8 + 8 * (0.5 + 0.5 * Math.sin(i * 2.3)),
			i % 2 ? 0xdb9e79 : 0xd5a985,
		);
	}
	for (let i = 0; i < 12; i++)
		mesa(
			group,
			-205 + i * 39,
			-0.8,
			-19,
			15 + 7 * Math.sin(i * 2.7),
			5 + 7 * (0.5 + 0.5 * Math.sin(i * 4.1)),
			i % 2 ? 0xbf7555 : 0xca825a,
		);
	// Ground and the convoy's ink-edged road.
	box(group, 0, -3, -5, 540, 6, 60, palette.sand, false);
	box(group, 0, -0.02, 0, 540, 0.15, 5.1, 0x835b4b, false);
	box(group, 0, 0.07, 2.69, 540, 0.08, 0.13, palette.cream, false);
	box(group, 0, 0.07, -2.69, 540, 0.08, 0.13, palette.cream, false);
	for (let i = -44; i < 45; i++)
		box(group, i * 6, 0.085, 0, 2.2, 0.06, 0.12, 0xe1b47c, false);
	for (let i = 0; i < 58; i++) {
		const x = -230 + i * 8.3;
		if (i % 3 !== 0) cactus(group, x, -5 - (i % 5) * 1.6, 1.2 + (i % 4) * 0.47);
		const rock = ellipsoid(
			group,
			x + 3,
			0.25,
			-3.6 - (i % 4) * 2.2,
			0.7 + (i % 3) * 0.36,
			0.4 + (i % 2) * 0.3,
			0.5,
			i % 2 ? 0xd08a56 : 0xe6b36f,
			0,
		);
		rock.rotation.y = i;
	}
	for (let i = 0; i < 13; i++) {
		const cloud = new THREE.Group();
		cloud.position.set(-200 + i * 35, 24 + (i % 3) * 4.8, -36);
		group.add(cloud);
		const width = 3 + (i % 3) * 1.2;
		ellipsoid(cloud, 0, 0, 0, width, 1, 1, palette.white, 1);
		ellipsoid(
			cloud,
			-width * 0.4,
			0.5,
			0,
			width * 0.6,
			1.3,
			1.1,
			palette.white,
			1,
		);
		ellipsoid(
			cloud,
			width * 0.3,
			0.45,
			0,
			width * 0.48,
			1.1,
			1,
			palette.white,
			1,
		);
		clouds.push(cloud);
	}
	// Telegraph poles and broken roadside equipment establish the convoy route.
	for (let i = -6; i <= 6; i++) {
		const x = i * 35 + 8;
		rod(group, [x, 0, -8], [x, 5.6, -8], 0.12, 0x805846);
		box(group, x, 5.3, -8, 3.1, 0.15, 0.14, 0x805846, false);
		for (const dx of [-1, 1])
			box(group, x + dx, 5.5, -8, 0.16, 0.4, 0.16, palette.cream, false);
	}
	const ambient = new THREE.HemisphereLight(0xfff4d5, 0xc48550, 2.25);
	scene.add(ambient);
	const key = new THREE.DirectionalLight(0xfff1cd, 3.0);
	key.position.set(-30, 55, 36);
	scene.add(key);
	const fill = new THREE.DirectionalLight(0x8ed6cc, 0.75);
	fill.position.set(20, 12, -20);
	scene.add(fill);
	return {
		group,
		sun,
		clouds,
		update(dt, cameraX, time) {
			sun.position.x = 35 + cameraX * 0.53;
			ring.position.x = sun.position.x;
			for (let i = 0; i < clouds.length; i++) {
				clouds[i].position.x = -200 + i * 35 + Math.sin(time * 0.014 + i) * 3;
			}
		},
	};
}
