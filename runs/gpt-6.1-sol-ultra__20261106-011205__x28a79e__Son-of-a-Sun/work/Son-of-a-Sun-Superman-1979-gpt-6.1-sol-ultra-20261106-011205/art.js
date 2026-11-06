import * as THREE from "three/webgpu";

const ink = new THREE.LineBasicMaterial({
	color: 0x203338,
	transparent: true,
	opacity: 0.67,
});
const palette = {
	cream: 0xe8d2a4,
	light: 0xffe9bb,
	teal: 0x65a7a0,
	blue: 0x5c8390,
	dark: 0x284f62,
	red: 0xcb5847,
	gold: 0xf7b558,
	white: 0xf6e6c6,
};
const mat = (color, extra = {}) =>
	new THREE.MeshStandardMaterial({
		color,
		roughness: 0.94,
		metalness: 0,
		flatShading: true,
		...extra,
	});
const mats = Object.fromEntries(
	Object.entries(palette).map(([n, c]) => [n, mat(c)]),
);
function box(parent, x, y, z, w, h, d, material = mats.cream, outline = true) {
	const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
	mesh.position.set(x, y, z);
	mesh.castShadow = true;
	mesh.receiveShadow = true;
	parent.add(mesh);
	if (outline) {
		const e = new THREE.LineSegments(
			new THREE.EdgesGeometry(mesh.geometry),
			ink,
		);
		mesh.add(e);
	}
	return mesh;
}
function sphere(parent, x, y, z, r, material, segments = 10) {
	const m = new THREE.Mesh(new THREE.SphereGeometry(r, segments, 7), material);
	m.position.set(x, y, z);
	m.castShadow = true;
	parent.add(m);
	return m;
}
function cylinder(parent, x, y, z, rt, rb, h, material, sides = 10) {
	const m = new THREE.Mesh(
		new THREE.CylinderGeometry(rt, rb, h, sides),
		material,
	);
	m.position.set(x, y, z);
	m.castShadow = true;
	parent.add(m);
	return m;
}
function label(
	parent,
	text,
	x,
	y,
	z,
	width = 18,
	color = "#244751",
	bg = "#f7dfad",
) {
	const canvas = document.createElement("canvas");
	canvas.width = 768;
	canvas.height = 160;
	const c = canvas.getContext("2d");
	c.fillStyle = bg;
	c.fillRect(0, 0, 768, 160);
	c.strokeStyle = color;
	c.lineWidth = 12;
	c.strokeRect(7, 7, 754, 146);
	c.fillStyle = color;
	c.font = "bold 80px Georgia";
	c.textAlign = "center";
	c.textBaseline = "middle";
	c.fillText(text, 384, 86, 720);
	const tex = new THREE.CanvasTexture(canvas);
	tex.colorSpace = THREE.SRGBColorSpace;
	const m = new THREE.Mesh(
		new THREE.PlaneGeometry(width, (width * 160) / 768),
		new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }),
	);
	m.position.set(x, y, z);
	parent.add(m);
	return m;
}
let seed = 71979;
function rand() {
	seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
	return seed / 4294967296;
}
export function createCity(scene) {
	const city = new THREE.Group();
	city.name = "The city of Halcyon";
	scene.add(city);
	const colliders = [];
	const clouds = [],
		cars = [],
		banners = [];
	const addCollider = (x, y, z, hx, hy, hz) =>
		colliders.push({ x, y, z, hx, hy, hz });
	box(city, 20, -1.2, 0, 420, 2, 440, mat(0xbab9a0), false);
	addCollider(20, -1.2, 0, 210, 1, 220);
	// A broad estuary catches the evening light, crossed by a monumental suspension bridge.
	box(
		city,
		-190,
		-0.3,
		0,
		96,
		0.35,
		560,
		mat(0x488e9a, { roughness: 0.3, metalness: 0.12 }),
		false,
	);
	const waterLines = new THREE.Group();
	city.add(waterLines);
	for (let i = 0; i < 75; i++) {
		const w = 3 + rand() * 21;
		box(
			waterLines,
			-226 + rand() * 70,
			0.01,
			-260 + rand() * 520,
			w,
			0.025,
			0.13,
			mat(i % 3 === 0 ? 0xe1c98a : 0x72b4b4),
			false,
		);
	}
	box(city, -142, 0.25, 0, 4, 1.2, 440, mats.cream);
	for (let z = -215; z < 220; z += 10) {
		box(city, -142, 1, z, 1, 2, 1, mats.dark, false);
		box(city, -142, 1.8, z + 4, 0.6, 0.25, 8, mats.dark, false);
	}
	box(city, -192, 4, 68, 105, 1.5, 15, mats.dark);
	addCollider(-192, 4, 68, 52.5, 0.75, 7.5);
	box(city, -192, 4.9, 68, 105, 0.25, 11, mat(0x829b94), false);
	for (const x of [-222, -164]) {
		box(city, x, 22, 61, 2.5, 37, 2.5, mats.red);
		box(city, x, 22, 75, 2.5, 37, 2.5, mats.red);
		box(city, x, 39, 68, 4, 3, 19, mats.red);
		for (let j = 0; j < 7; j++) {
			const xx = x - 25 + j * 8.3;
			const yy = 13 + 25 * Math.abs((xx - x) / 25) ** 1.6;
			const line = new THREE.Line(
				new THREE.BufferGeometry().setFromPoints([
					new THREE.Vector3(xx, 5, 61),
					new THREE.Vector3(xx, yy, 61),
				]),
				ink,
			);
			city.add(line);
		}
	}
	// Street plan: generous flight canyons, tram corridor, and a civic plaza.
	const road = mat(0x52676b),
		sidewalk = mat(0xd7c8a4),
		mark = mat(0xefdab2);
	for (const x of [-110, -55, 0, 55, 110, 165]) {
		box(city, x, 0.02, 0, 14, 0.13, 440, road, false);
		for (const dx of [-9, 9])
			box(city, x + dx, 0.15, 0, 3, 0.4, 440, sidewalk, false);
		for (let z = -210; z < 220; z += 14)
			box(city, x, 0.11, z, 0.22, 0.03, 6, mark, false);
	}
	for (const z of [-170, -110, -55, 0, 35, 90, 145, 200]) {
		box(city, 31, 0.05, z, 360, 0.16, 14, road, false);
		for (const dz of [-9, 9])
			box(city, 31, 0.19, z + dz, 360, 0.4, 3, sidewalk, false);
		for (let x = -135; x < 207; x += 14)
			box(city, x, 0.15, z, 6, 0.025, 0.22, mark, false);
	}
	for (const zz of [32.1, 37.9])
		box(city, 0, 0.2, zz, 280, 0.13, 0.12, mats.dark, false);
	function building(x, z, w, d, h, style = 0) {
		const material = [mats.cream, mats.teal, mats.blue, mats.light][style % 4];
		box(city, x, h / 2 + 0.4, z, w, h, d, material);
		addCollider(x, h / 2 + 0.4, z, w / 2, h / 2, d / 2);
		box(city, x, 1, z, w + 1.8, 1.6, d + 1.8, mats.dark);
		box(city, x, h + 0.5, z, w + 1.4, 1, d + 1.4, mats.light);
		box(city, x, h + 1.4, z, w * 0.8, 1, d * 0.8, material);
		if (h > 38) {
			box(city, x, h + 4, z, w * 0.65, 6, d * 0.65, material);
			box(city, x, h + 7.3, z, w * 0.72, 0.7, d * 0.72, mats.light);
			if (style % 2 === 0) {
				box(city, x, h + 10, z, w * 0.35, 5, d * 0.35, material);
				cylinder(city, x, h + 16, z, 0.16, 0.35, 8, mats.gold, 5);
			}
		}
		const win = mats.dark;
		for (let y = 4; y < h - 1; y += 4.6) {
			for (let xx = -w / 2 + 2; xx < w / 2 - 1; xx += 3.8) {
				box(city, x + xx, y, z + d / 2 + 0.035, 1.2, 2.1, 0.07, win, false);
				box(city, x + xx, y, z - d / 2 - 0.035, 1.2, 2.1, 0.07, win, false);
			}
			for (let zz = -d / 2 + 2; zz < d / 2 - 1; zz += 4.5) {
				box(city, x + w / 2 + 0.035, y, z + zz, 0.07, 2.1, 1.25, win, false);
				box(city, x - w / 2 - 0.035, y, z + zz, 0.07, 2.1, 1.25, win, false);
			}
		}
		for (const dx of [-w / 2 + 0.5, w / 2 - 0.5])
			box(
				city,
				x + dx,
				h / 2,
				z + d / 2 + 0.16,
				0.45,
				h,
				0.25,
				mats.light,
				false,
			);
		if (rand() > 0.45) {
			cylinder(city, x + w * 0.2, h + 3, z - d * 0.2, 2, 2.2, 4, mats.dark);
			cylinder(city, x + w * 0.2, h + 5.3, z - d * 0.2, 0.2, 2.7, 1, mats.red);
		}
	}
	const lotsX = [-126, -83, -28, 28, 83, 138, 190],
		lotsZ = [-196, -141, -82, -28, 65, 118, 172];
	for (const x of lotsX)
		for (const z of lotsZ) {
			if (
				(Math.abs(x) < 40 && z === 65) ||
				(Math.abs(x + 65) < 25 && Math.abs(z + 40) < 25) ||
				(Math.abs(x - 42) < 22 && Math.abs(z + 58) < 23) ||
				(Math.abs(x) < 34 && z < -120)
			)
				continue;
			const h = 14 + rand() * 34 + (z < -100 ? rand() * 23 : 0);
			building(
				x,
				z,
				19 + rand() * 8,
				18 + rand() * 10,
				h,
				Math.floor(rand() * 4),
			);
		}
	// Rooftop emergency building and Daily Planet-like editorial tower, entirely original signage.
	building(-65, -40, 28, 25, 30, 0);
	label(city, "THE EVENING SUN", -65, 23, -27.4, 25);
	box(city, -65, 31, -40, 23, 0.4, 20, mats.dark);
	addCollider(-65, 31, -40, 11.5, 0.2, 10);
	building(93, -76, 28, 28, 62, 0);
	box(city, 93, 69, -76, 19, 12, 19, mats.light);
	sphere(city, 93, 80, -76, 6, mat(0xd7ae60), 16);
	const globe = new THREE.Mesh(
		new THREE.TorusGeometry(7, 0.18, 5, 48),
		mats.dark,
	);
	globe.position.set(93, 80, -76);
	globe.rotation.x = 0.6;
	globe.rotation.y = 0.3;
	city.add(globe);
	label(city, "THE DAILY DAWN", 93, 60, -61.7, 27);
	// Civic square: fountain, striped awnings, trees and citizens at a very human scale.
	box(city, 0, 0.3, 65, 63, 0.7, 39, mat(0xe6d7b2), false);
	cylinder(city, 0, 0.8, 67, 7, 7, 1, mats.dark, 24);
	cylinder(city, 0, 1.4, 67, 6.3, 6.3, 0.3, mat(0x6aaead), 24);
	cylinder(city, 0, 3, 67, 1, 1.6, 3.3, mats.cream);
	sphere(city, 0, 5, 67, 1.3, mats.gold, 8);
	for (const x of [-23, 23])
		for (const z of [54, 76]) {
			cylinder(city, x, 2, z, 0.3, 0.45, 3.5, mats.dark, 6);
			sphere(city, x, 5, z, 3.4, mat(0x4f8666), 8);
			sphere(city, x + 1.5, 6, z, 2.4, mat(0x77a774), 7);
		}
	for (const x of [-18, 18]) {
		box(city, x, 1.1, 82, 7, 0.5, 1.8, mats.red);
		box(city, x, 1.8, 82.6, 7, 1, 0.3, mats.dark);
		for (const dx of [-2.5, 2.5])
			box(city, x + dx, 0.65, 82, 0.4, 0.8, 1.7, mats.dark, false);
	}
	label(city, "HALCYON", 0, 3.3, 46, 18);
	label(city, "A BRIGHTER TOMORROW", 0, 1.3, 46, 17);
	for (let i = 0; i < 28; i++) {
		const x = lotsX[Math.floor(rand() * lotsX.length)] + 14,
			z = -190 + rand() * 390;
		cylinder(city, x, 3.5, z, 0.12, 0.16, 7, mats.dark, 6);
		sphere(
			city,
			x,
			7,
			z,
			0.65,
			mat(0xffd984, { emissive: 0xffb34b, emissiveIntensity: 0.5 }),
			7,
		);
	}
	// Static street life, animated traffic and hanging aerial pennants.
	for (let i = 0; i < 24; i++) {
		const g = new THREE.Group(),
			c = mat([0xc5553e, 0xf1c969, 0x588d99, 0xdcd2b9][i % 4]);
		box(g, 0, 0.7, 0, 2.2, 1.1, 4, c);
		box(g, 0, 1.5, -0.25, 1.8, 0.8, 2, mats.dark);
		for (const x of [-1.1, 1.1])
			for (const z of [-1.2, 1.2]) {
				const wheel = cylinder(g, x, 0.45, z, 0.46, 0.46, 0.28, mats.dark, 8);
				wheel.rotation.z = Math.PI / 2;
			}
		g.position.set([-108, -53, 57, 112][i % 4], 0.3, -210 + rand() * 420);
		g.userData.startZ = g.position.z + 210;
		city.add(g);
		cars.push({ g, speed: 3 + rand() * 4, dir: i % 2 ? 1 : -1 });
	}
	for (let i = 0; i < 28; i++) {
		const c = createCitizen();
		c.scale.setScalar(0.65);
		c.position.set(
			(i % 2 ? 1 : -1) * (13 + rand() * 12),
			0.7,
			45 + rand() * 40,
		);
		c.rotation.y = rand() * Math.PI * 2;
		city.add(c);
	}
	for (let i = 0; i < 18; i++) {
		const g = new THREE.Group();
		const x = -270 + rand() * 570,
			y = 102 + rand() * 50,
			z = -260 + rand() * 450;
		for (let j = 0; j < 4; j++) {
			const c = sphere(
				g,
				j * 7,
				Math.sin(j) * 2,
				0,
				7 + rand() * 4,
				mat(0xf6dbb1, { roughness: 1 }),
				8,
			);
			c.scale.y = 0.45;
			c.scale.z = 0.65;
		}
		g.position.set(x, y, z);
		city.add(g);
		clouds.push(g);
	}
	const sun = sphere(
		city,
		-165,
		116,
		-280,
		27,
		new THREE.MeshBasicMaterial({ color: 0xffe3a1 }),
		32,
	);
	sun.castShadow = false;
	const landmarks = {
		fire: new THREE.Vector3(-65, 32, -40),
		citizen: new THREE.Vector3(42, 55, -58),
		tram: new THREE.Vector3(0, 3, 35),
		boss: new THREE.Vector3(0, 55, -145),
		plaza: new THREE.Vector3(0, 1, 65),
	};
	return {
		group: city,
		colliders,
		sun,
		landmarks,
		tick(t) {
			for (const c of cars) {
				c.g.position.z =
					((((t * c.speed * c.dir + c.g.userData.startZ) % 420) + 420) % 420) -
					210;
			}
			clouds.forEach((c, i) => {
				c.position.x += Math.sin(t * 0.02 + i) * 0.002;
			});
		},
	};
}
export function createHero(color = 0x176bb5, capeColor = 0xd94d40) {
	const group = new THREE.Group();
	group.name = "Solar guardian";
	const rig = new THREE.Group();
	rig.name = "heroRig";
	rig.position.y = 1.2;
	group.add(rig);
	const blue = mat(color),
		red = mat(capeColor),
		skin = mat(0xeab88b),
		hair = mat(0x233443),
		gold = mat(0xffce60),
		black = mat(0x193342);
	const torso = box(rig, 0, 0.5, 0, 1.05, 1.1, 0.53, blue);
	torso.scale.y = 1.05;
	box(rig, 0, -0.07, 0, 0.89, 0.35, 0.52, red);
	box(rig, 0, 0.08, 0.01, 0.95, 0.14, 0.57, gold);
	box(rig, 0, 0.1, 0.31, 0.2, 0.2, 0.06, red);
	cylinder(rig, 0, 1.2, 0, 0.22, 0.25, 0.27, skin, 8);
	const head = sphere(rig, 0, 1.58, 0.02, 0.4, skin, 10);
	head.scale.y = 1.2;
	sphere(rig, 0, 1.85, -0.05, 0.39, hair, 10).scale.y = 0.5;
	box(rig, 0, 1.7, -0.29, 0.62, 0.4, 0.19, hair, false);
	box(rig, -0.14, 1.63, 0.379, 0.095, 0.045, 0.025, black, false);
	box(rig, 0.14, 1.63, 0.379, 0.095, 0.045, 0.025, black, false);
	box(rig, 0, 1.43, 0.4, 0.19, 0.035, 0.02, red, false);
	const shieldShape = new THREE.Shape();
	shieldShape.moveTo(-0.36, 0.28);
	shieldShape.lineTo(0.36, 0.28);
	shieldShape.lineTo(0.29, -0.02);
	shieldShape.lineTo(0, -0.32);
	shieldShape.lineTo(-0.29, -0.02);
	shieldShape.closePath();
	const shield = new THREE.Mesh(new THREE.ShapeGeometry(shieldShape), gold);
	shield.position.set(0, 0.65, 0.278);
	rig.add(shield);
	const sun = sphere(rig, 0, 0.68, 0.303, 0.115, red, 8);
	sun.scale.z = 0.2;
	for (let i = 0; i < 8; i++) {
		const angle = (i * Math.PI) / 4;
		const ray = box(
			rig,
			Math.sin(angle) * 0.2,
			0.68 + Math.cos(angle) * 0.2,
			0.303,
			0.035,
			0.1,
			0.015,
			red,
			false,
		);
		ray.rotation.z = -angle;
	}
	const armL = new THREE.Group();
	armL.name = "armL";
	armL.position.set(-0.63, 0.96, 0);
	rig.add(armL);
	const armR = new THREE.Group();
	armR.name = "armR";
	armR.position.set(0.63, 0.96, 0);
	rig.add(armR);
	for (const arm of [armL, armR]) {
		sphere(arm, 0, -0.1, 0, 0.24, blue, 8);
		box(arm, 0, -0.42, 0, 0.36, 0.64, 0.36, blue);
		box(arm, 0, -0.91, 0, 0.3, 0.44, 0.3, blue);
		sphere(arm, 0, -1.21, 0.02, 0.19, skin, 8);
	}
	const legL = new THREE.Group();
	legL.name = "legL";
	legL.position.set(-0.25, -0.19, 0);
	rig.add(legL);
	const legR = new THREE.Group();
	legR.name = "legR";
	legR.position.set(0.25, -0.19, 0);
	rig.add(legR);
	for (const leg of [legL, legR]) {
		box(leg, 0, -0.4, 0, 0.38, 0.75, 0.4, blue);
		box(leg, 0, -0.91, 0, 0.4, 0.53, 0.44, red);
		box(leg, 0, -1.18, 0.13, 0.42, 0.2, 0.7, red);
	}
	const capePivot = new THREE.Group();
	capePivot.name = "cape";
	capePivot.position.set(0, 1.03, -0.3);
	rig.add(capePivot);
	const capeGeo = new THREE.BufferGeometry();
	const cp = [
		-0.58, 0, 0, 0.58, 0, 0, -0.9, -1.1, -0.22, 0.9, -1.1, -0.22, -0.95, -2.02,
		-0.5, 0, -1.87, -0.55, 0.95, -2.02, -0.5,
	];
	capeGeo.setAttribute("position", new THREE.Float32BufferAttribute(cp, 3));
	capeGeo.setIndex([0, 2, 1, 1, 2, 3, 2, 4, 5, 2, 5, 3, 3, 5, 6]);
	capeGeo.computeVertexNormals();
	const cape = new THREE.Mesh(
		capeGeo,
		mat(capeColor, { side: THREE.DoubleSide }),
	);
	cape.castShadow = true;
	capePivot.add(cape);
	cape.add(new THREE.LineSegments(new THREE.EdgesGeometry(capeGeo), ink));
	const mixer = new THREE.AnimationMixer(group),
		actions = {};
	function clip(name, tracks) {
		const action = mixer.clipAction(new THREE.AnimationClip(name, -1, tracks));
		actions[name] = action;
		return action;
	}
	const track = (name, t, v) => new THREE.NumberKeyframeTrack(name, t, v);
	clip("idle", [
		track("heroRig.rotation[x]", [0, 1.5, 3], [0, 0.018, 0]),
		track("heroRig.position[y]", [0, 1.5, 3], [1.2, 1.26, 1.2]),
		track("armL.rotation[z]", [0, 1.5, 3], [-0.13, -0.18, -0.13]),
		track("armR.rotation[z]", [0, 1.5, 3], [0.13, 0.18, 0.13]),
		track("cape.rotation[x]", [0, 1.5, 3], [0.05, 0.16, 0.05]),
		track("legL.rotation[x]", [0, 3], [0, 0]),
		track("legR.rotation[x]", [0, 3], [0, 0]),
	]);
	clip("fly", [
		track("heroRig.rotation[x]", [0, 1, 2], [1.16, 1.22, 1.16]),
		track("heroRig.position[y]", [0, 1, 2], [1.5, 1.6, 1.5]),
		track("armL.rotation[z]", [0, 1, 2], [2.95, 2.88, 2.95]),
		track("armR.rotation[z]", [0, 1, 2], [-2.95, -2.88, -2.95]),
		track("cape.rotation[x]", [0, 0.3, 0.6, 0.9], [0.3, 0.44, 0.32, 0.3]),
		track("legL.rotation[x]", [0, 1, 2], [-0.08, -0.12, -0.08]),
		track("legR.rotation[x]", [0, 1, 2], [0.08, 0.14, 0.08]),
	]);
	clip("boost", [
		track("heroRig.rotation[x]", [0, 0.5, 1], [1.45, 1.49, 1.45]),
		track("heroRig.position[y]", [0, 0.5, 1], [1.55, 1.6, 1.55]),
		track("armL.rotation[z]", [0, 1], [3.04, 3.04]),
		track("armR.rotation[z]", [0, 1], [-3.04, -3.04]),
		track("cape.rotation[x]", [0, 0.15, 0.3, 0.45], [0.55, 0.72, 0.48, 0.55]),
		track("legL.rotation[x]", [0, 1], [0, 0]),
		track("legR.rotation[x]", [0, 1], [0, 0]),
	]);
	let pose = "idle";
	actions.idle.play();
	return {
		group,
		mixer,
		actions,
		setPose(mode) {
			if (!actions[mode] || mode === pose) return;
			const next = actions[mode];
			next.reset().play();
			actions[pose].crossFadeTo(next, 0.3, true);
			pose = mode;
		},
		tick(dt, speed = 0) {
			mixer.update(dt);
			if (pose === "boost")
				capePivot.rotation.z = Math.sin(mixer.time * 14) * 0.05;
		},
	};
}
export function createCitizen() {
	const g = new THREE.Group(),
		coat = mat([0xb15443, 0x5c8d89, 0xccab64][Math.floor(rand() * 3)]),
		skin = mat(0xe0ac82),
		dark = mats.dark;
	box(g, 0, 1.02, 0, 0.55, 0.8, 0.36, coat);
	sphere(g, 0, 1.7, 0, 0.25, skin, 8);
	sphere(g, 0, 1.86, -0.02, 0.24, dark, 8).scale.y = 0.5;
	for (const x of [-0.16, 0.16]) {
		box(g, x, 0.38, 0, 0.2, 0.65, 0.24, dark);
		box(g, x, 0.06, 0.07, 0.22, 0.14, 0.4, dark);
		box(g, x * 2.1, 1, 0, 0.16, 0.65, 0.2, coat);
	}
	return g;
}
