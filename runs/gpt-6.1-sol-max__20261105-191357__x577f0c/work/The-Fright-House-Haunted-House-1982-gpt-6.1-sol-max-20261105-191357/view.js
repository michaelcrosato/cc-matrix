import * as THREE from "three/webgpu";
import { DOORS, propsFor, ROOMS, rng } from "./data.js";

const C = {
	ink: 0x101e25,
	wood: 0x734c3f,
	gold: 0xc5a16a,
	cream: 0xf6e6bd,
	teal: 0x427d7c,
	red: 0xa4564e,
	ghost: 0xb9e5cf,
};
const matCache = new Map();
const gradient = new THREE.DataTexture(
	new Uint8Array([55, 115, 195, 255]),
	4,
	1,
	THREE.RedFormat,
);
gradient.needsUpdate = true;
gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
const ink = new THREE.MeshBasicMaterial({ color: C.ink, side: THREE.BackSide });
const glow = (color) => new THREE.MeshBasicMaterial({ color });
function material(color) {
	if (!matCache.has(color))
		matCache.set(
			color,
			new THREE.MeshToonMaterial({ color, gradientMap: gradient }),
		);
	return matCache.get(color);
}
function shape(g, geo, color, x = 0, y = 0, z = 0, outline = true) {
	const m = new THREE.Mesh(
		geo,
		typeof color === "object" ? color : material(color),
	);
	m.position.set(x, y, z);
	m.castShadow = true;
	m.receiveShadow = true;
	g.add(m);
	if (outline) {
		const o = new THREE.Mesh(geo, ink);
		o.scale.setScalar(1.045);
		o.castShadow = false;
		m.add(o);
	}
	return m;
}
const box = (g, w, h, d, c, x = 0, y = 0, z = 0) =>
	shape(g, new THREE.BoxGeometry(w, h, d), c, x, y, z);
const ball = (g, r, c, x = 0, y = 0, z = 0, s = 1) => {
	const m = shape(g, new THREE.SphereGeometry(r, 12, 8), c, x, y, z);
	m.scale.y = s;
	return m;
};
const cylinder = (g, rt, rb, h, c, x = 0, y = 0, z = 0, n = 10) =>
	shape(g, new THREE.CylinderGeometry(rt, rb, h, n), c, x, y, z);
function rod(g, a, b, r, c) {
	const v = new THREE.Vector3(...b).sub(new THREE.Vector3(...a));
	const m = cylinder(
		g,
		r,
		r,
		v.length(),
		c,
		...new THREE.Vector3(...a).addScaledVector(v, 0.5).toArray(),
		6,
	);
	m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize());
	return m;
}
function line(g, pts, color = C.cream, opacity = 0.6) {
	const geo = new THREE.BufferGeometry().setFromPoints(
		pts.map((p) => new THREE.Vector3(...p)),
	);
	const m = new THREE.Line(
		geo,
		new THREE.LineBasicMaterial({ color, transparent: true, opacity }),
	);
	g.add(m);
	return m;
}
function textTexture(text, { size = 256, color = "#eee2bf", bg = null } = {}) {
	const c = document.createElement("canvas");
	c.width = size;
	c.height = size / 2;
	const x = c.getContext("2d");
	if (bg) {
		x.fillStyle = bg;
		x.fillRect(0, 0, c.width, c.height);
	}
	x.fillStyle = color;
	x.font = `bold ${size * 0.14}px Georgia`;
	x.textAlign = "center";
	x.textBaseline = "middle";
	x.fillText(text, size / 2, size / 4, size * 0.94);
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.SRGBColorSpace;
	return t;
}
function sign(g, text, x, y, z, w = 2.2) {
	const m = new THREE.Mesh(
		new THREE.PlaneGeometry(w, w / 2),
		new THREE.MeshBasicMaterial({
			map: textTexture(text),
			transparent: true,
			depthWrite: false,
		}),
	);
	m.position.set(x, y, z);
	g.add(m);
	return m;
}
function floorTexture(seed) {
	const c = document.createElement("canvas");
	c.width = c.height = 512;
	const ctx = c.getContext("2d"),
		random = rng(seed);
	ctx.fillStyle = "#927764";
	ctx.fillRect(0, 0, 512, 512);
	for (let y = 0; y < 8; y++) {
		const yy = y * 64;
		ctx.strokeStyle = "#322d30";
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.moveTo(0, yy);
		ctx.lineTo(512, yy);
		ctx.stroke();
		for (let j = 0; j < 5; j++) {
			const xx = (j * 150 + (y % 2) * 74) % 512;
			ctx.beginPath();
			ctx.moveTo(xx, yy);
			ctx.lineTo(xx, yy + 64);
			ctx.stroke();
		}
		for (let i = 0; i < 23; i++) {
			ctx.strokeStyle = `rgba(42,29,31,${0.04 + random() * 0.14})`;
			ctx.lineWidth = 1;
			const xx = random() * 512,
				y0 = yy + 6 + random() * 48;
			ctx.beginPath();
			ctx.moveTo(xx, y0);
			ctx.bezierCurveTo(xx + 20, y0 - 3, xx + 60, y0 + 4, xx + 100, y0);
			ctx.stroke();
		}
	}
	const t = new THREE.CanvasTexture(c);
	t.wrapS = t.wrapT = THREE.RepeatWrapping;
	t.repeat.set(2, 2);
	t.colorSpace = THREE.SRGBColorSpace;
	t.anisotropy = 4;
	return t;
}
function wallpaper(seed, color) {
	const c = document.createElement("canvas");
	c.width = c.height = 256;
	const x = c.getContext("2d");
	x.fillStyle = color;
	x.fillRect(0, 0, 256, 256);
	x.strokeStyle = "#d0c0a0";
	x.globalAlpha = 0.13;
	x.lineWidth = 1;
	for (let a = 0; a < 6; a++)
		for (let b = 0; b < 6; b++) {
			const xx = a * 48 + (b % 2) * 24,
				yy = b * 48;
			x.beginPath();
			x.moveTo(xx, yy - 17);
			x.quadraticCurveTo(xx + 17, yy, xx, yy + 17);
			x.quadraticCurveTo(xx - 17, yy, xx, yy - 17);
			x.stroke();
			x.beginPath();
			x.moveTo(xx, yy - 9);
			x.lineTo(xx, yy + 9);
			x.stroke();
		}
	x.globalAlpha = 0.08;
	for (let n = 0; n < 100; n++) {
		const xx = (n * 17 + seed * 7) % 256,
			yy = (n * 31) % 256;
		x.beginPath();
		x.moveTo(xx, yy);
		x.lineTo(xx + 18, yy - 30);
		x.stroke();
	}
	const t = new THREE.CanvasTexture(c);
	t.wrapS = t.wrapT = THREE.RepeatWrapping;
	t.repeat.set(3, 1);
	t.colorSpace = THREE.SRGBColorSpace;
	return t;
}
function candle(g, x, z, height = 1) {
	cylinder(g, 0.06, 0.1, height, C.cream, x, height / 2, z, 8);
	const f = ball(g, 0.095, glow(0xffd17d), x, height + 0.09, z, 1.7);
	return f;
}
function candelabra(g, x, y, z) {
	const a = new THREE.Group();
	a.position.set(x, y, z);
	g.add(a);
	cylinder(a, 0.1, 0.2, 0.15, C.gold, 0, 0.07, 0);
	rod(a, [0, 0, 0], [0, 0.9, 0], 0.045, C.gold);
	for (const xx of [-0.3, 0, 0.3]) {
		rod(a, [0, 0.45, 0], [xx, 0.6, 0], 0.03, C.gold);
		const h = xx === 0 ? 0.45 : 0.25;
		const q = new THREE.Group();
		q.position.set(xx, xx === 0 ? 0.85 : 0.6, 0);
		a.add(q);
		candle(q, 0, 0, h);
	}
	return a;
}
function portrait(g, x, y, z, seed = 1) {
	const a = new THREE.Group();
	a.position.set(x, y, z);
	g.add(a);
	box(a, 1.6, 1.9, 0.12, C.gold);
	box(a, 1.4, 1.7, 0.14, 0x162e37, 0, 0, 0.05);
	ball(a, 0.32, 0x8f9f8c, 0, 0.15, 0.18, 1.25);
	shape(a, new THREE.ConeGeometry(0.47, 0.7, 8), 0x36495a, 0, -0.5, 0.2);
	for (const xx of [-0.115, 0.115])
		ball(a, 0.055, glow(0xf6e4b1), xx, 0.19, 0.49);
	box(a, 0.6, 0.08, 0.05, C.ink, 0, 0.48, 0.45);
	sign(a, seed % 2 ? "GRAVES" : "A RELATIVE", 0, -1.13, 0.2, 1.15);
	return a;
}
function web(g, x, y, z, flip = 1) {
	for (let i = 0; i <= 6; i++) {
		const ang = ((i / 6) * Math.PI) / 2;
		line(
			g,
			[
				[x, y, z],
				[x + Math.cos(ang) * 2 * flip, y - Math.sin(ang) * 2, z],
			],
			0x9bb8b2,
			0.45,
		);
	}
	for (const r of [0.45, 0.9, 1.4, 1.9]) {
		const pts = [];
		for (let i = 0; i <= 10; i++) {
			const a = ((i / 10) * Math.PI) / 2;
			pts.push([x + Math.cos(a) * r * flip, y - Math.sin(a) * r, z]);
		}
		line(g, pts, 0xc8d4bd, 0.45);
	}
}
function arch(g, x, z, rotation, locked, label, exterior = false) {
	const a = new THREE.Group();
	a.position.set(x, 0, z);
	a.rotation.y = rotation;
	g.add(a);
	for (const xx of [-1.05, 1.05]) {
		box(a, 0.19, 2.3, 0.26, C.gold, xx, 1.15, 0);
		box(a, 0.3, 0.15, 0.37, C.wood, xx, 0.1, 0);
	}
	const curve = new THREE.EllipseCurve(
		0,
		2.3,
		1.06,
		1.06,
		0,
		Math.PI,
		false,
		0,
	);
	const points = curve.getPoints(20).map((p) => new THREE.Vector3(p.x, p.y, 0));
	const tube = new THREE.TubeGeometry(
		new THREE.CatmullRomCurve3(points),
		20,
		0.1,
		6,
		false,
	);
	shape(a, tube, C.gold);
	const pivot = new THREE.Group();
	pivot.position.set(-0.93, 0, 0);
	pivot.name = "hinge";
	a.add(pivot);
	const _door = box(
		pivot,
		1.85,
		2.5,
		0.13,
		locked ? 0x486466 : 0x304b4f,
		0.925,
		1.25,
		0,
	);
	for (const yy of [0.7, 1.75])
		box(pivot, 1.45, 0.7, 0.04, locked ? 0x3d5352 : 0x253f43, 0.925, yy, 0.09);
	ball(pivot, 0.075, C.gold, 1.55, 1.1, 0.13);
	if (locked) {
		box(pivot, 0.24, 0.32, 0.1, C.gold, 1.05, 1.15, 0.15);
		ball(pivot, 0.045, C.ink, 1.05, 1.19, 0.23);
	} else pivot.rotation.y = -1.35;
	const opening = box(
		a,
		1.9,
		2.9,
		0.03,
		glow(exterior ? 0x40586a : 0x0c222b),
		0,
		1.45,
		-0.1,
	);
	opening.castShadow = false;
	sign(a, label, 0, 3.75, 0.05, 2);
	return { group: a, pivot, locked, opening };
}
function stairs(g, x, z, down = false) {
	const a = new THREE.Group();
	a.position.set(x, 0, z);
	g.add(a);
	for (let i = 0; i < 6; i++)
		box(
			a,
			2.1,
			0.2 + (down ? 5 - i : i) * 0.18,
			0.5,
			C.wood,
			0,
			(0.2 + (down ? 5 - i : i) * 0.18) / 2,
			-i * 0.38,
		);
	for (const s of [-1, 1]) {
		for (let i = 0; i < 4; i++)
			rod(
				a,
				[s * 1.1, i * 0.24, -i * 0.55],
				[s * 1.1, 0.85 + i * 0.24, -i * 0.55],
				0.035,
				C.gold,
			);
		rod(a, [s * 1.1, 0.85, 0], [s * 1.1, 1.57, -1.65], 0.055, C.gold);
	}
	sign(a, down ? "DOWNSTAIRS" : "UPSTAIRS", 0, 2.15, -1.7, 2.4);
	return a;
}
function furniture(g, p, seed) {
	const a = new THREE.Group();
	a.position.set(p.x, 0, p.z);
	a.scale.setScalar(p.s);
	g.add(a);
	const random = rng(seed);
	const legs = (w, d, h) => {
		for (const x of [-w, w])
			for (const z of [-d, d]) box(a, 0.12, h, 0.12, C.wood, x, h / 2, z);
	};
	switch (p.kind) {
		case "table":
		case "desk":
		case "seance": {
			const round = p.kind === "seance";
			if (round) cylinder(a, 1.3, 1.3, 0.18, C.wood, 0, 1.1, 0, 12);
			else box(a, 2.6, 0.18, 1.3, C.wood, 0, 1.1, 0);
			legs(1.05, 0.48, 1);
			if (round) {
				cylinder(a, 1.15, 1.15, 0.025, 0x665071, 0, 1.21, 0, 12);
				for (let i = 0; i < 6; i++) {
					const q = new THREE.Group();
					q.position.set(Math.cos(i) * 0.9, 1.25, Math.sin(i) * 0.9);
					a.add(q);
					candle(q, 0, 0, 0.23);
				}
				ball(a, 0.25, glow(0x8fc6ad), 0, 1.5, 0);
			} else {
				box(a, 1.3, 0.025, 0.7, C.red, 0, 1.21, 0);
				candelabra(a, 0.65, 1.22, 0);
				const _plate = cylinder(
					a,
					0.3,
					0.32,
					0.045,
					C.cream,
					-0.65,
					1.23,
					0.05,
				);
				if (p.kind === "desk") {
					box(a, 0.55, 0.06, 0.5, C.cream, -0.45, 1.27, -0.05);
					rod(a, [-0.35, 1.3, -0.1], [-0.12, 1.8, -0.15], 0.022, C.ink);
				}
			}
			break;
		}
		case "shelf":
		case "cabinet": {
			box(a, 3.2, 2.8, 0.7, C.wood, 0, 1.4, 0);
			box(a, 2.9, 2.5, 0.74, 0x263f43, 0, 1.4, 0.02);
			for (let y = 0; y < 3; y++) {
				box(a, 3, 0.1, 0.8, C.gold, 0, 0.6 + y * 0.85, 0.04);
				for (let i = 0; i < 10; i++) {
					const col = [0x65806b, 0x9f655a, 0xb2a278, 0x626b88][
						Math.floor(random() * 4)
					];
					const h = 0.4 + random() * 0.22;
					const m = box(
						a,
						0.16 + random() * 0.06,
						h,
						0.48,
						col,
						-1.3 + i * 0.28,
						0.65 + y * 0.85 + h / 2,
						0.15,
					);
					m.rotation.z = (random() - 0.5) * 0.13;
				}
			}
			box(a, 3.4, 0.15, 0.9, C.gold, 0, 2.9, 0.02);
			break;
		}
		case "clock": {
			box(a, 0.8, 2.65, 0.55, C.wood, 0, 1.32, 0);
			cylinder(a, 0.45, 0.45, 0.18, C.gold, 0, 2.6, 0.05, 12).rotation.x =
				Math.PI / 2;
			const face = ball(a, 0.34, C.cream, 0, 2.6, 0.19);
			face.scale.z = 0.12;
			rod(a, [0, 2.6, 0.25], [0, 2.83, 0.25], 0.025, C.ink);
			rod(a, [0, 2.6, 0.25], [0.18, 2.56, 0.25], 0.02, C.ink);
			box(a, 0.48, 1.1, 0.05, 0x1f373d, 0, 1.2, 0.31);
			rod(a, [0, 1.7, 0.35], [0.1, 0.9, 0.35], 0.028, C.gold);
			ball(a, 0.14, C.gold, 0.1, 0.9, 0.35);
			box(a, 1, 0.15, 0.75, C.gold, 0, 0.08, 0);
			break;
		}
		case "chest":
		case "crates": {
			box(a, 1.9, 0.9, 1, C.wood, 0, 0.45, 0);
			for (const z of [-0.35, 0.35])
				box(a, 1.96, 0.95, 0.07, C.gold, 0, 0.5, z);
			box(a, 0.2, 0.26, 0.12, C.gold, 0, 0.55, 0.56);
			if (p.kind === "crates") {
				box(a, 1.4, 1.1, 1.2, 0x928064, 0.25, 1.5, 0);
				for (let i = 0; i < 4; i++)
					box(a, 1.45, 0.06, 1.25, C.wood, 0.25, 1.08 + i * 0.26, 0);
				box(a, 0.7, 0.65, 0.8, 0x726957, -0.8, 0.33, 1);
			}
			break;
		}
		case "chair":
		case "bench":
		case "sofa": {
			const wide = p.kind === "chair" ? 0.9 : p.kind === "bench" ? 2.2 : 2.9;
			legs(wide / 2 - 0.12, 0.35, 0.6);
			box(a, wide, 0.25, 0.95, C.wood, 0, 0.65, 0);
			box(
				a,
				wide,
				1,
				0.18,
				p.kind === "sofa" ? 0x87706e : C.wood,
				0,
				1.15,
				-0.4,
			);
			if (p.kind === "sofa") {
				box(a, wide - 0.15, 0.2, 0.8, 0x9b7c78, 0, 0.88, 0);
				for (const x of [-wide / 2, wide / 2])
					box(a, 0.25, 0.6, 1, C.wood, x, 0.95, 0);
			}
			break;
		}
		case "bed": {
			legs(0.9, 1.35, 0.5);
			box(a, 2, 0.35, 2.9, C.wood, 0, 0.55, 0);
			box(a, 1.9, 0.2, 2.8, C.cream, 0, 0.83, 0);
			box(a, 1.95, 0.13, 1.95, 0x697781, 0, 1, 0.43);
			box(a, 1.45, 0.18, 0.55, C.cream, 0, 1.02, -0.99);
			box(a, 2.2, 1.5, 0.2, C.wood, 0, 1.1, -1.5);
			for (const x of [-1, 1])
				cylinder(a, 0.06, 0.08, 2.1, C.gold, x, 1.05, -1.5);
			break;
		}
		case "piano": {
			box(a, 2.4, 1.7, 0.8, C.ink, 0, 1, -0.2);
			box(a, 2.5, 0.18, 1.6, C.wood, 0, 0.95, 0.15);
			for (let i = 0; i < 18; i++)
				box(a, 0.116, 0.08, 0.5, C.cream, -1.1 + i * 0.13, 1.08, 0.7);
			for (let i = 0; i < 14; i++)
				if (i % 7 !== 2 && i % 7 !== 6)
					box(a, 0.067, 0.09, 0.28, C.ink, -1 + i * 0.14, 1.16, 0.6);
			box(a, 1, 0.08, 0.12, C.gold, 0, 1.6, 0.25);
			break;
		}
		case "plant": {
			cylinder(a, 0.38, 0.23, 0.65, 0x97765d, 0, 0.33, 0);
			for (let i = 0; i < 5; i++) {
				const xx = Math.cos(i * 2.4) * 0.6,
					zz = Math.sin(i * 2.4) * 0.6;
				rod(a, [0, 0.5, 0], [xx, 1.6 + random(), zz], 0.04, 0x415e53);
				const leaf = ball(a, 0.3, 0x638272, xx, 1.6 + random() * 0.5, zz, 0.4);
				leaf.rotation.z = i;
			}
			break;
		}
		case "coat": {
			cylinder(a, 0.12, 0.4, 0.1, C.wood, 0, 0.06, 0);
			rod(a, [0, 0, 0], [0, 2.5, 0], 0.065, C.gold);
			for (const x of [-0.4, 0.4]) {
				rod(a, [0, 2.1, 0], [x, 2.3, 0], 0.045, C.gold);
				const c = shape(
					a,
					new THREE.ConeGeometry(0.35, 1.15, 7),
					0x4a5969,
					x,
					1.6,
					0,
				);
				c.rotation.z = x * 0.2;
			}
			ball(a, 0.15, C.gold, 0, 2.55, 0);
			break;
		}
		case "bust": {
			box(a, 0.8, 0.2, 0.8, C.gold, 0, 0.1, 0);
			cylinder(a, 0.29, 0.38, 0.95, 0x7f8d87, 0, 0.63, 0);
			box(a, 0.78, 0.15, 0.78, C.gold, 0, 1.14, 0);
			shape(a, new THREE.ConeGeometry(0.35, 0.5, 8), 0xa7b1a0, 0, 1.48, 0);
			ball(a, 0.28, 0xb9bea9, 0, 1.93, 0, 1.2);
			for (const xx of [-0.09, 0.09])
				ball(a, 0.035, glow(C.cream), xx, 1.96, 0.25);
			break;
		}
		case "telescope": {
			rod(a, [0, 0.6, 0], [0, 1.7, 0], 0.07, C.gold);
			for (let i = 0; i < 3; i++)
				rod(
					a,
					[0, 1.1, 0],
					[Math.cos(i * 2.1) * 0.75, 0.05, Math.sin(i * 2.1) * 0.75],
					0.045,
					C.gold,
				);
			const scope = cylinder(a, 0.2, 0.28, 1.5, 0x64858a, 0, 1.85, 0);
			scope.rotation.z = -0.9;
			ball(a, 0.17, glow(0x9db8c8), -0.6, 2.3, 0);
			break;
		}
		case "horse": {
			ball(a, 0.55, C.wood, 0, 1, 0, 0.6);
			rod(a, [0.3, 0.9, 0], [0.65, 1.65, 0], 0.17, C.wood);
			ball(a, 0.25, C.gold, 0.65, 1.7, 0, 0.7);
			for (const x of [-0.35, 0.35])
				for (const z of [-0.22, 0.22])
					rod(a, [x, 0.9, z], [x, 0.35, z], 0.055, C.wood);
			for (const z of [-0.35, 0.35]) {
				const pts = [];
				for (let i = 0; i <= 12; i++) {
					const x = -1.1 + i * 0.183;
					pts.push([x, 0.15 + x * x * 0.15, z]);
				}
				line(a, pts, C.gold, 1);
			}
			break;
		}
		case "blocks":
			for (let i = 0; i < 6; i++) {
				const m = box(
					a,
					0.45,
					0.45,
					0.45,
					[C.red, C.teal, C.gold][i % 3],
					((i % 3) - 0.8) * 0.55,
					0.25 + (i > 2 ? 0.45 : 0),
					Math.floor(i / 3) * 0.2,
				);
				m.rotation.y = i * 0.4;
			}
			break;
	}
	return a;
}
export function itemMesh(type, parts = 7) {
	const a = new THREE.Group();
	if (type === "key") {
		const _ring = shape(
			a,
			new THREE.TorusGeometry(0.24, 0.06, 6, 12),
			C.gold,
			0,
			0.16,
			0,
		);
		rod(a, [0, -0.04, 0], [0, -0.65, 0], 0.065, C.gold);
		box(a, 0.22, 0.09, 0.12, C.gold, 0.1, -0.55, 0);
		box(a, 0.22, 0.09, 0.12, C.gold, 0.1, -0.38, 0);
		a.rotation.z = -0.6;
	} else if (type === "scepter") {
		rod(a, [0, -0.6, 0], [0, 0.55, 0], 0.055, C.gold);
		const moon = shape(
			a,
			new THREE.TorusGeometry(0.22, 0.065, 6, 12, Math.PI * 1.5),
			glow(0xa5e4cc),
			0,
			0.65,
			0,
		);
		moon.rotation.z = 0.8;
		ball(a, 0.09, glow(C.cream), 0, 0.62, 0.03);
	} else {
		if (parts & 1) {
			cylinder(a, 0.3, 0.37, 0.42, 0xcba96b, 0, -0.2, 0, 12);
			cylinder(a, 0.37, 0.25, 0.1, C.gold, 0, -0.45, 0);
		}
		if (parts & 2) cylinder(a, 0.44, 0.3, 0.45, 0xd0ae78, 0, 0.22, 0, 12);
		if (parts & 4) {
			cylinder(a, 0.2, 0.43, 0.24, 0xcba96b, 0, 0.55, 0, 12);
			cylinder(a, 0.28, 0.2, 0.12, C.gold, 0, 0.72, 0);
			ball(a, 0.08, C.gold, 0, 0.84, 0);
		}
		for (const x of [-0.42, 0.42])
			shape(a, new THREE.TorusGeometry(0.16, 0.045, 5, 10), C.gold, x, 0.28, 0);
	}
	return a;
}
export function explorer(color = 0x467e7e, ghost = false) {
	const root = new THREE.Group(),
		body = new THREE.Group();
	body.name = "body";
	root.add(body);
	shape(body, new THREE.ConeGeometry(0.52, 0.95, 10), color, 0, 0.7, 0);
	ball(body, 0.43, color, 0, 1.32, 0, 1.12);
	const face = ball(body, 0.34, glow(0x13252d), 0, 1.28, 0.2, 0.85);
	face.scale.z = 0.65;
	const eyes = [];
	for (const x of [-0.13, 0.13]) {
		const eye = ball(body, 0.105, glow(0xfff0ce), x, 1.31, 0.427, 1.2);
		eye.scale.z = 0.3;
		const pupil = ball(body, 0.043, glow(C.ink), x + 0.012, 1.3, 0.463, 1.3);
		pupil.scale.z = 0.2;
		eyes.push(pupil);
	}
	const scarf = shape(
		body,
		new THREE.TorusGeometry(0.29, 0.085, 5, 10),
		0xc88756,
		0,
		1.02,
		0.05,
	);
	scarf.rotation.x = Math.PI / 2;
	const tail = box(body, 0.16, 0.45, 0.06, 0xc88756, 0.26, 0.74, 0.25);
	tail.rotation.z = 0.2;
	for (const side of [-1, 1]) {
		const leg = new THREE.Group();
		leg.name = side < 0 ? "legL" : "legR";
		leg.position.set(side * 0.21, 0.3, 0);
		body.add(leg);
		box(leg, 0.24, 0.24, 0.4, C.ink, 0, -0.15, 0.06);
		const arm = new THREE.Group();
		arm.name = side < 0 ? "armL" : "armR";
		arm.position.set(side * 0.44, 0.9, 0);
		body.add(arm);
		cylinder(arm, 0.1, 0.12, 0.38, color, 0, -0.17, 0);
		ball(arm, 0.105, C.cream, 0, -0.38, 0.02);
	}
	const hand = new THREE.Group();
	hand.name = "hand";
	hand.position.set(0.48, 0.65, 0.38);
	body.add(hand);
	const _stick = rod(hand, [0, 0, 0], [0, 0.3, 0], 0.018, C.wood);
	const flame = ball(hand, 0.07, glow(0xffd47e), 0, 0.38, 0, 1.6);
	const carried = new THREE.Group();
	carried.position.set(-0.5, 0.85, 0.3);
	body.add(carried);
	const mixer = new THREE.AnimationMixer(root);
	const times = [0, 0.25, 0.5, 0.75, 1];
	const idle = new THREE.AnimationClip("idle", 2, [
		new THREE.NumberKeyframeTrack("body.position[y]", [0, 1, 2], [0, 0.06, 0]),
		new THREE.NumberKeyframeTrack(
			"body.rotation[z]",
			[0, 1, 2],
			[-0.025, 0.025, -0.025],
		),
	]);
	const tracks = [
		new THREE.NumberKeyframeTrack(
			"body.position[y]",
			times,
			[0, 0.08, 0, 0.08, 0],
		),
		new THREE.NumberKeyframeTrack(
			"legL.rotation[x]",
			times,
			[0.6, 0, -0.6, 0, 0.6],
		),
		new THREE.NumberKeyframeTrack(
			"legR.rotation[x]",
			times,
			[-0.6, 0, 0.6, 0, -0.6],
		),
		new THREE.NumberKeyframeTrack(
			"armL.rotation[x]",
			times,
			[-0.4, 0, 0.4, 0, -0.4],
		),
		new THREE.NumberKeyframeTrack(
			"body.rotation[z]",
			times,
			[-0.07, 0.04, -0.04, 0.07, -0.07],
		),
	];
	const walk = new THREE.AnimationClip("walk", 1, tracks);
	const strike = new THREE.AnimationClip("strike", 0.42, [
		new THREE.NumberKeyframeTrack(
			"armR.rotation[x]",
			[0, 0.1, 0.25, 0.42],
			[0, -1.1, -0.4, 0],
		),
		new THREE.NumberKeyframeTrack(
			"hand.position[y]",
			[0, 0.1, 0.42],
			[0.65, 0.96, 0.65],
		),
	]);
	const nod = new THREE.AnimationClip("nod", 0.5, [
		new THREE.NumberKeyframeTrack(
			"body.rotation[x]",
			[0, 0.17, 0.35, 0.5],
			[0, -0.18, 0.1, 0],
		),
	]);
	const startle = new THREE.AnimationClip("startle", 0.45, [
		new THREE.NumberKeyframeTrack(
			"body.scale[y]",
			[0, 0.12, 0.3, 0.45],
			[1, 0.78, 1.12, 1],
		),
	]);
	const actions = {
		idle: mixer.clipAction(idle),
		walk: mixer.clipAction(walk),
		strike: mixer.clipAction(strike),
		nod: mixer.clipAction(nod),
		startle: mixer.clipAction(startle),
	};
	for (const k of ["strike", "nod", "startle"])
		actions[k].setLoop(THREE.LoopOnce, 1);
	actions.idle.play();
	actions.walk.play();
	actions.walk.setEffectiveWeight(0);
	const ward = shape(
		root,
		new THREE.RingGeometry(0.77, 0.82, 40),
		new THREE.MeshBasicMaterial({
			color: 0x9fd8b8,
			transparent: true,
			opacity: 0.5,
			side: THREE.DoubleSide,
		}),
		0,
		0.025,
		0,
		false,
	);
	ward.rotation.x = -Math.PI / 2;
	ward.visible = false;
	root.userData = {
		mixer,
		actions,
		flame,
		hand,
		carried,
		eyes,
		ward,
		heldId: null,
		ghost,
	};
	if (ghost)
		root.traverse((m) => {
			if (m.isMesh && m.material !== ink) {
				m.material = m.material.clone();
				m.material.transparent = true;
				m.material.opacity = 0.55;
			}
		});
	return root;
}
function creature(type) {
	const root = new THREE.Group(),
		body = new THREE.Group();
	body.name = "spiritBody";
	root.add(body);
	const tracks = [];
	if (type === "ghost") {
		const geo = new THREE.LatheGeometry(
			[
				new THREE.Vector2(0.42, 0),
				new THREE.Vector2(0.65, 0.14),
				new THREE.Vector2(0.48, 0.48),
				new THREE.Vector2(0.48, 0.9),
				new THREE.Vector2(0.3, 1.25),
				new THREE.Vector2(0.04, 1.35),
			],
			14,
		);
		shape(body, geo, 0x9ebfab, 0, 0.4, 0);
		for (const x of [-0.17, 0.17])
			ball(body, 0.11, glow(0x19343b), x, 1.35, 0.4, 1.45);
		const _mouth = ball(body, 0.08, glow(C.ink), 0, 1.04, 0.46, 1.4);
		for (const x of [-0.67, 0.67]) {
			const arm = ball(body, 0.23, 0xb4d6b9, x, 1.04, 0, 0.45);
			arm.rotation.z = x;
		}
		tracks.push(
			new THREE.NumberKeyframeTrack(
				"spiritBody.position[y]",
				[0, 1, 2],
				[0, 0.24, 0],
			),
			new THREE.NumberKeyframeTrack(
				"spiritBody.rotation[z]",
				[0, 1, 2],
				[-0.07, 0.07, -0.07],
			),
		);
	} else if (type === "bat") {
		ball(body, 0.25, 0x68718c, 0, 0.6, 0, 1.25);
		for (const x of [-0.12, 0.12]) {
			shape(body, new THREE.ConeGeometry(0.12, 0.3, 4), 0x806b88, x, 0.94, 0);
			ball(body, 0.065, glow(0xf2b99e), x, 0.72, 0.22);
		}
		for (const side of [-1, 1]) {
			const wing = new THREE.Group();
			wing.name = side < 0 ? "wingL" : "wingR";
			wing.position.set(side * 0.2, 0.62, 0);
			body.add(wing);
			const s = new THREE.Shape();
			s.moveTo(0, 0);
			s.lineTo(side * 0.7, 0.5);
			s.lineTo(side * 1.1, 0.1);
			s.quadraticCurveTo(side * 0.8, 0.18, side * 0.7, -0.27);
			s.quadraticCurveTo(side * 0.4, 0.02, side * 0.35, -0.3);
			s.lineTo(0, -0.08);
			const _m = shape(
				wing,
				new THREE.ShapeGeometry(s),
				new THREE.MeshToonMaterial({
					color: 0x7d6a89,
					side: THREE.DoubleSide,
					gradientMap: gradient,
				}),
			);
			rod(wing, [0, 0, 0.01], [side * 0.7, 0.5, 0.01], 0.025, 0xb09baf);
			tracks.push(
				new THREE.NumberKeyframeTrack(
					`${wing.name}.rotation[y]`,
					[0, 0.12, 0.24],
					[side * -0.65, side * 0.65, side * -0.65],
				),
			);
		}
		tracks.push(
			new THREE.NumberKeyframeTrack(
				"spiritBody.position[y]",
				[0, 0.5, 1],
				[0, 0.15, 0],
			),
		);
		root.position.y = 0.6;
	} else {
		ball(body, 0.32, 0x6c6e72, 0, 0.34, -0.18, 0.7);
		ball(body, 0.23, 0x92907d, 0, 0.3, 0.22, 0.7);
		for (const x of [-0.09, 0.09])
			ball(body, 0.06, glow(0xf4c29b), x, 0.34, 0.43);
		for (let i = 0; i < 4; i++)
			for (const s of [-1, 1]) {
				const leg = new THREE.Group();
				leg.name = `leg${i}${s < 0 ? "L" : "R"}`;
				body.add(leg);
				const z = -0.4 + i * 0.23;
				rod(leg, [s * 0.2, 0.35, z], [s * 0.62, 0.48, z + 0.1], 0.035, C.ink);
				rod(
					leg,
					[s * 0.62, 0.48, z + 0.1],
					[s * 0.85, 0.05, z + 0.27],
					0.03,
					C.ink,
				);
				tracks.push(
					new THREE.NumberKeyframeTrack(
						`${leg.name}.rotation[y]`,
						[0, 0.3, 0.6],
						[
							s * 0.15 * (i % 2 ? 1 : -1),
							s * -0.15 * (i % 2 ? 1 : -1),
							s * 0.15 * (i % 2 ? 1 : -1),
						],
					),
				);
			}
	}
	const mixer = new THREE.AnimationMixer(root);
	mixer
		.clipAction(
			new THREE.AnimationClip(
				type,
				type === "bat" ? 1 : type === "ghost" ? 2 : 0.6,
				tracks,
			),
		)
		.play();
	const ring = shape(
		root,
		new THREE.RingGeometry(0.7, 0.76, 40),
		new THREE.MeshBasicMaterial({
			color: 0xeaa36c,
			transparent: true,
			opacity: 0.9,
			side: THREE.DoubleSide,
		}),
		0,
		0.035,
		0,
		false,
	);
	ring.rotation.x = -Math.PI / 2;
	root.userData = { mixer, ring, type };
	return root;
}
export class HouseView {
	constructor(canvas) {
		this.canvas = canvas;
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(0x0b202a);
		this.scene.fog = new THREE.FogExp2(0x0e2931, 0.018);
		this.camera = new THREE.OrthographicCamera(-14, 14, 8, -8, 0.1, 150);
		this.camera.position.set(13, 17.5, 21);
		this.camera.lookAt(0, 1, 0);
		this.titleBlend = 1;
		this.followX = 0;
		this.roomId = -1;
		this.roomGroup = null;
		this.mixers = [];
		this.remote = new Map();
		this.items = new Map();
		this.enemyModels = [];
		this.frame = 0;
	}
	async init() {
		this.renderer = new THREE.WebGPURenderer({
			canvas: this.canvas,
			antialias: true,
			alpha: false,
			colorBufferType: THREE.UnsignedByteType,
		});
		this.renderer.setPixelRatio(devicePixelRatio);
		this.renderer.setSize(innerWidth, innerHeight);
		this.renderer.toneMapping = THREE.NeutralToneMapping;
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		await this.renderer.init();
		this.backend = this.renderer.backend.isWebGPUBackend ? "WebGPU" : "WebGL 2";
		this.gpuErrors = [];
		this.renderer.backend.device?.addEventListener("uncapturederror", (e) =>
			this.gpuErrors.push(e.error.message),
		);
		this.ambient = new THREE.HemisphereLight(0xb8d6c6, 0x4a3441, 1.6);
		this.scene.add(this.ambient);
		const moon = new THREE.DirectionalLight(0xb8d8dc, 2.5);
		moon.position.set(-7, 12, -5);
		moon.castShadow = true;
		moon.shadow.mapSize.set(1024, 1024);
		Object.assign(moon.shadow.camera, {
			left: -12,
			right: 12,
			top: 12,
			bottom: -12,
			near: 1,
			far: 35,
		});
		moon.shadow.bias = -0.001;
		this.scene.add(moon);
		const fill = new THREE.DirectionalLight(0xc99e76, 0.9);
		fill.position.set(8, 6, 10);
		this.scene.add(fill);
		this.matchLight = new THREE.PointLight(0xffbb63, 0, 17, 1.4);
		this.scene.add(this.matchLight);
		this.player = explorer();
		this.scene.add(this.player);
		const bg = new THREE.Group();
		this.scene.add(bg);
		const moonBall = ball(bg, 1.5, glow(0xd2dbb2), -6, 7, -13);
		moonBall.castShadow = false;
		for (let i = 0; i < 4; i++) {
			const cloud = ball(
				bg,
				1.6,
				glow(0x19353e),
				-7 + i * 3,
				7.5 + (i % 2) * 0.6,
				-12.2,
			);
			cloud.scale.set(1.9, 0.25, 0.5);
		}
		const random = rng(132);
		const stars = [];
		for (let i = 0; i < 120; i++)
			stars.push((random() - 0.5) * 80, random() * 25 + 3, -20 - random() * 20);
		const pg = new THREE.BufferGeometry();
		pg.setAttribute("position", new THREE.Float32BufferAttribute(stars, 3));
		bg.add(
			new THREE.Points(
				pg,
				new THREE.PointsMaterial({
					color: 0x91b0af,
					size: 0.055,
					transparent: true,
					opacity: 0.65,
				}),
			),
		);
		this.background = bg;
		const dustPos = [];
		for (let i = 0; i < 100; i++)
			dustPos.push((random() - 0.5) * 14, random() * 5, (random() - 0.5) * 10);
		const dg = new THREE.BufferGeometry();
		dg.setAttribute("position", new THREE.Float32BufferAttribute(dustPos, 3));
		this.dust = new THREE.Points(
			dg,
			new THREE.PointsMaterial({
				color: 0xf2daaa,
				size: 0.025,
				transparent: true,
				opacity: 0.5,
			}),
		);
		this.scene.add(this.dust);
		this.resize();
	}
	disposeRoom() {
		if (!this.roomGroup) return;
		this.scene.remove(this.roomGroup);
		const geometries = new Set(),
			mats = new Set(),
			textures = new Set();
		this.roomGroup.traverse((o) => {
			if (o.geometry) geometries.add(o.geometry);
			if (
				o.material &&
				!matCache.has(o.material.color?.getHex()) &&
				o.material !== ink
			) {
				const ms = Array.isArray(o.material) ? o.material : [o.material];
				for (const m of ms)
					if (![...matCache.values()].includes(m)) {
						mats.add(m);
						if (m.map) textures.add(m.map);
					}
			}
		});
		for (const g of geometries) g.dispose();
		for (const m of mats) m.dispose();
		for (const t of textures) t.dispose();
		this.mixers = [];
		this.items.clear();
		for (const m of this.enemyModels) this.scene.remove(m);
		this.enemyModels = [];
	}
	buildRoom(model) {
		this.disposeRoom();
		this.followX = (model.x * 0.85 - model.z * 0.53) * 0.6;
		const r = ROOMS[model.room],
			p = r.palette;
		this.roomId = r.id;
		const g = new THREE.Group();
		this.roomGroup = g;
		this.scene.add(g);
		const floorMat = new THREE.MeshToonMaterial({
			color: p.floor,
			map: floorTexture(r.id + 12),
			gradientMap: gradient,
		});
		const _fl = shape(
			g,
			new THREE.BoxGeometry(14.4, 0.28, 10.4),
			floorMat,
			0,
			-0.14,
			0,
		);
		box(g, 14.6, 0.45, 10.6, 0x253a3e, 0, -0.51, 0);
		box(g, 14.85, 0.12, 10.85, C.gold, 0, -0.76, 0);
		box(g, 15.1, 0.8, 11.1, 0x152b33, 0, -1.2, 0);
		const wallMat = new THREE.MeshToonMaterial({
			map: wallpaper(r.id, p.wall),
			gradientMap: gradient,
		});
		const wall = (w, h, d, x, y, z) =>
			shape(g, new THREE.BoxGeometry(w, h, d), wallMat, x, y, z);
		const north = r.neighbors.north !== undefined;
		const west = r.neighbors.west !== undefined;
		const h = 4.2;
		if (north) {
			wall(5.9, h, 0.22, -4.05, h / 2, -5.05);
			wall(5.9, h, 0.22, 4.05, h / 2, -5.05);
			wall(2.2, 0.8, 0.22, 0, 3.8, -5.05);
		} else wall(14.4, h, 0.22, 0, h / 2, -5.05);
		if (west) {
			wall(0.22, h, 3.9, -7.05, h / 2, -3.1);
			wall(0.22, h, 3.9, -7.05, h / 2, 3.1);
			wall(0.22, 0.8, 2.2, -7.05, 3.8, 0);
		} else wall(0.22, h, 10.3, -7.05, h / 2, 0);
		for (const x of [-7, 7]) {
			box(g, 0.16, 0.16, 10.5, p.trim, x, 4.25, 0);
			box(g, 0.16, 0.4, 10.3, C.wood, x, 0.2, 0);
			box(g, 0.16, 0.075, 10.4, p.trim, x, 1.2, 0);
		}
		for (const z of [-5, 5]) {
			box(g, 14.4, 0.16, 0.16, p.trim, 0, z === -5 ? 4.25 : 0.35, z);
			for (const x of [-4.2, 4.2]) {
				box(g, 5.7, 0.42, 0.14, C.wood, x, 0.2, z);
				if (z === -5) box(g, 5.7, 0.06, 0.16, p.trim, x, 1.2, z);
			}
		}
		for (const x of [-6.8, 6.8])
			for (const z of [-4.9, 4.9]) {
				cylinder(
					g,
					0.13,
					0.18,
					z > 0 ? 1.4 : 4.3,
					C.gold,
					x,
					z > 0 ? 0.7 : 2.15,
					z,
					8,
				);
				ball(g, 0.19, C.gold, x, z > 0 ? 1.5 : 4.4, z);
			}
		// A small hand-inked carpet gives the room a clear, navigable center.
		box(g, 5.25, 0.025, 4.8, p.rug, 0, 0.027, 0.3);
		for (const xx of [-2.4, 2.4])
			box(g, 0.035, 0.029, 4.45, C.gold, xx, 0.05, 0.3);
		for (const zz of [-1.9, 2.5])
			box(g, 4.8, 0.029, 0.035, C.gold, 0, 0.05, zz);
		const diamond = shape(
			g,
			new THREE.RingGeometry(0.45, 0.5, 4),
			C.gold,
			0,
			0.05,
			0.3,
			false,
		);
		diamond.rotation.x = -Math.PI / 2;
		diamond.rotation.z = Math.PI / 4;
		this.doors = {};
		for (const dir in r.neighbors) {
			const pos = DOORS[dir],
				rot =
					dir === "west"
						? Math.PI / 2
						: dir === "east"
							? -Math.PI / 2
							: dir === "south"
								? Math.PI
								: 0;
			this.doors[dir] = arch(
				g,
				pos.x,
				pos.z,
				rot,
				model.locks.has(
					[r.id, r.neighbors[dir]].sort((a, b) => a - b).join("-"),
				),
				ROOMS[r.neighbors[dir]].name.replace("The ", ""),
			);
			if (dir === "south" || dir === "east") {
				const door = this.doors[dir];
				door.near = true;
				door.opening.visible = false;
				door.pivot.visible = door.locked;
				door.pivot.scale.y = 0.45;
			}
		}
		if (r.id === 0) {
			this.doors.exit = arch(g, 0, 4.85, Math.PI, false, "THE WAY OUT", true);
			this.doors.exit.pivot.visible = false;
			this.doors.exit.opening.visible = false;
		}
		if (r.up) stairs(g, r.up.x, r.up.z);
		if (r.down) stairs(g, r.down.x, r.down.z, true);
		if (!north) {
			for (const x of [-3.4, 3.4]) {
				box(g, 1.7, 2.2, 0.12, C.gold, x, 2.65, -4.88);
				box(g, 1.48, 1.98, 0.14, glow(0x345a65), x, 2.65, -4.78);
				box(g, 0.08, 2, 0.06, C.wood, x, 2.65, -4.65);
				box(g, 1.5, 0.08, 0.06, C.wood, x, 2.65, -4.65);
				for (const side of [-1, 1]) {
					const curtain = box(
						g,
						0.38,
						2.4,
						0.22,
						p.rug,
						x + side * 0.95,
						2.65,
						-4.7,
					);
					curtain.rotation.z = side * 0.06;
				}
				line(
					g,
					[
						[x - 0.6, 3.35, -4.65],
						[x + 0.25, 2.2, -4.65],
					],
					0x81b3b6,
					0.6,
				);
			}
		} else portrait(g, -3.5, 2.65, -4.86, r.id);
		const leftPic = portrait(g, -6.87, 2.7, -2.1, r.id + 2);
		leftPic.rotation.y = Math.PI / 2;
		for (const pp of propsFor(r)) furniture(g, pp, 743 + r.id * 71);
		for (const x of [-5.8, 5.8]) {
			const q = new THREE.Group();
			q.position.set(x, 1.9, -4.5);
			g.add(q);
			candelabra(q, 0, 0, 0);
		}
		web(g, -6.87, 4.07, -4.75, 1);
		if (r.floor >= 2) web(g, 6.85, 4, -4.75, -1);
		// Chandelier, with a clear gap below it for the explorer.
		const chandelier = new THREE.Group();
		chandelier.position.set(0, 4.5, -1.5);
		g.add(chandelier);
		rod(chandelier, [0, 0, 0], [0, 1.9, 0], 0.035, C.ink);
		shape(
			chandelier,
			new THREE.TorusGeometry(1, 0.045, 6, 24),
			C.gold,
		).rotation.x = Math.PI / 2;
		for (let i = 0; i < 6; i++) {
			const a = (i * Math.PI) / 3;
			rod(
				chandelier,
				[0, 0.5, 0],
				[Math.cos(a), 0, Math.sin(a)],
				0.025,
				C.gold,
			);
			candle(chandelier, Math.cos(a), Math.sin(a), 0.3);
		}
		chandelier.rotation.z = 0.03;
		const tableLight = new THREE.PointLight(0xf8b66c, 5, 9, 1.4);
		tableLight.position.set(-4, 2.5, -2);
		g.add(tableLight);
		this.roomLight = tableLight;
		this.enemyModels = model.enemies.map((e) => {
			const m = creature(e.type);
			this.scene.add(m);
			return m;
		});
		this.mixers = this.enemyModels.map((m) => m.userData.mixer);
	}
	resize() {
		if (!this.renderer) return;
		this.renderer.setSize(innerWidth, innerHeight);
		this.setCamera();
	}
	setCamera() {
		const aspect = innerWidth / innerHeight,
			hh = innerWidth < 700 ? (innerWidth < innerHeight ? 10.2 : 7.8) : 7.6;
		const h = hh + this.titleBlend * 1;
		const shift =
			this.titleBlend * (aspect > 1.35 ? 5.9 : 0) -
			(aspect < 0.9 ? this.followX * (1 - this.titleBlend) : 0);
		this.camera.left = -h * aspect - shift;
		this.camera.right = h * aspect - shift;
		this.camera.top = h;
		this.camera.bottom = -h;
		this.camera.updateProjectionMatrix();
	}
	sync(model, dt, { title = false, reduced = false } = {}) {
		if (model.room !== this.roomId) this.buildRoom(model);
		this.frame++;
		this.titleBlend = THREE.MathUtils.lerp(
			this.titleBlend,
			title ? 1 : 0,
			Math.min(1, dt * 3),
		);
		this.followX = THREE.MathUtils.lerp(
			this.followX,
			(model.x * 0.85 - model.z * 0.53) * 0.6,
			Math.min(1, dt * 5),
		);
		this.setCamera();
		this.player.position.set(model.x, 0, model.z);
		const delta =
			THREE.MathUtils.euclideanModulo(
				model.facing - this.player.rotation.y + Math.PI,
				Math.PI * 2,
			) - Math.PI;
		this.player.rotation.y += delta * Math.min(1, dt * 12);
		const ud = this.player.userData;
		ud.actions.walk.setEffectiveWeight(model.moving ? 1 : 0);
		ud.actions.idle.setEffectiveWeight(model.moving ? 0 : 1);
		ud.actions.walk.timeScale = model.sprinting ? 2.2 : 1.35;
		ud.mixer.update(dt);
		ud.flame.visible = model.match > 0;
		ud.flame.scale.set(
			1 + Math.sin(model.time * 19) * 0.13,
			1 + Math.sin(model.time * 23) * 0.23,
			1,
		);
		const held = model.carried ? model.carried.id + model.carried.parts : null;
		if (ud.heldId !== held) {
			ud.carried.clear();
			if (model.carried) {
				const m = itemMesh(model.carried.type, model.carried.parts);
				m.scale.setScalar(0.6);
				ud.carried.add(m);
			}
			ud.heldId = held;
		}
		this.player.visible = !(
			model.scared > 0 && Math.floor(model.time * 10) % 2 === 0
		);
		this.matchLight.position.set(model.x + 0.3, 1.3, model.z + 0.3);
		this.matchLight.intensity =
			model.match > 0 ? 19 + Math.sin(model.time * 29) * 2 : 0;
		this.matchLight.distance = model.tuning.lightRadius * 2.6;
		this.ambient.intensity = model.match > 0 || title ? 1.4 : 0.75;
		this.roomLight.intensity = model.match > 0 ? 6 : 2.5;
		this.dust.rotation.y += dt * 0.008;
		this.dust.position.y = Math.sin(model.time * 0.2) * 0.2;
		const existing = new Set();
		for (const item of model.items) {
			if (item.room !== model.room) continue;
			existing.add(item.id);
			let group = this.items.get(item.id);
			if (!group) {
				group = new THREE.Group();
				const m = itemMesh(item.type, item.parts);
				group.add(m);
				const ring = shape(
					group,
					new THREE.RingGeometry(0.51, 0.55, 32),
					new THREE.MeshBasicMaterial({
						color: item.type === "urn" ? 0xf6c477 : 0xa7e2c6,
						transparent: true,
						opacity: 0.65,
						side: THREE.DoubleSide,
					}),
					0,
					-0.7,
					0,
					false,
				);
				ring.rotation.x = -Math.PI / 2;
				this.roomGroup.add(group);
				this.items.set(item.id, group);
			}
			group.position.set(
				item.x,
				0.85 + Math.sin(model.time * 2 + item.x) * 0.1,
				item.z,
			);
			group.rotation.y = model.time * 0.45;
			group.visible =
				model.cheats.reveal ||
				(model.match > 0 &&
					Math.hypot(model.x - item.x, model.z - item.z) <
						model.tuning.lightRadius + 1);
		}
		for (const [id, m] of this.items)
			if (!existing.has(id)) {
				this.roomGroup.remove(m);
				this.items.delete(id);
			}
		for (let i = 0; i < model.enemies.length; i++) {
			const e = model.enemies[i],
				m = this.enemyModels[i];
			if (!m) continue;
			m.visible = e.mode !== "dormant";
			m.position.x = e.x;
			m.position.z = e.z;
			m.rotation.y = Math.atan2(model.x - e.x, model.z - e.z);
			m.userData.mixer.update(dt);
			const ring = m.userData.ring;
			ring.visible = e.mode === "warning" || e.mode === "rush";
			const pulse = reduced ? 1 : 1 + Math.sin(model.time * 14) * 0.08;
			ring.scale.setScalar(pulse * (e.mode === "rush" ? 1.3 : 1));
			ring.material.color.setHex(e.mode === "rush" ? 0xea8c72 : 0xf4ce8c);
		}
		for (const dir in this.doors) {
			const d = this.doors[dir];
			const next = ROOMS[model.room].neighbors[dir];
			if (next === undefined) continue;
			const locked = model.locks.has(
				[model.room, next].sort((a, b) => a - b).join("-"),
			);
			if (d.locked && !locked) {
				d.locked = false;
				const mix = new THREE.AnimationMixer(d.group),
					clip = new THREE.AnimationClip("door-opening", 0.7, [
						new THREE.NumberKeyframeTrack(
							"hinge.rotation[y]",
							[0, 0.7],
							[0, -1.35],
						),
					]);
				const action = mix.clipAction(clip);
				action.setLoop(THREE.LoopOnce, 1);
				action.clampWhenFinished = true;
				action.play();
				if (d.near)
					mix.addEventListener("finished", () => {
						d.pivot.visible = false;
					});
				this.mixers.push(mix);
			}
		}
		for (const mix of this.mixers)
			if (!this.enemyModels.some((m) => m.userData.mixer === mix))
				mix.update(dt);
		ud.ward.visible = model.carried?.type === "scepter";
		ud.ward.scale.setScalar(1 + Math.sin(model.time * 3) * 0.05);
		if (!this.pauseDrawing) this.renderer.render(this.scene, this.camera);
	}
	project(x, z, y = 0.8) {
		const v = new THREE.Vector3(x, y, z).project(this.camera);
		return {
			x: (v.x * 0.5 + 0.5) * innerWidth,
			y: (-0.5 * v.y + 0.5) * innerHeight,
		};
	}
	pointAt(clientX, clientY) {
		const r = new THREE.Raycaster();
		r.setFromCamera(
			new THREE.Vector2(
				(clientX / innerWidth) * 2 - 1,
				(-clientY / innerHeight) * 2 + 1,
			),
			this.camera,
		);
		return r.ray.intersectPlane(
			new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
			new THREE.Vector3(),
		);
	}
	remotePlayer(id, data, color) {
		let m = this.remote.get(id);
		if (!m) {
			m = explorer(new THREE.Color(color || "#89b9c8").getHex(), true);
			m.scale.setScalar(0.95);
			this.scene.add(m);
			this.remote.set(id, m);
		}
		m.userData.data = data;
	}
	updateRemotes(room, dt) {
		for (const m of this.remote.values()) {
			const d = m.userData.data;
			m.visible =
				d.room === room && performance.now() - (d.received || 0) < 5000;
			if (!m.visible) continue;
			m.position.lerp(new THREE.Vector3(d.x, 0, d.z), Math.min(1, dt * 12));
			m.rotation.y = d.facing || 0;
			m.userData.mixer.update(dt);
			m.userData.flame.visible = !!d.match;
		}
	}
	clearRemotes() {
		for (const m of this.remote.values()) this.scene.remove(m);
		this.remote.clear();
	}
	react(kind) {
		const key =
			kind === "match"
				? "strike"
				: kind === "scare"
					? "startle"
					: ["pickup", "join"].includes(kind)
						? "nod"
						: null;
		if (key) this.player?.userData.actions[key].reset().play();
	}
}
