import * as T from "three/webgpu";
import { uniform, normalWorld, vec3 } from "three/tsl";

export const FLOOR = 5.4,
	Z = 2.1,
	INK = 0x173541;
const mats = new Map(),
	geo = new Map();
export function mat(c) {
	if (!mats.has(c)) {
		const m = new T.MeshBasicNodeMaterial({
			color: 0xffffff,
			toneMapped: false,
		});
		const shade = normalWorld
			.dot(vec3(0.35, 0.8, 0.6).normalize())
			.max(0)
			.mul(3)
			.floor()
			.div(3)
			.mul(0.32)
			.add(0.68);
		m.colorNode = uniform(new T.Color(c)).mul(shade);
		mats.set(c, m);
	}
	return mats.get(c);
}
const ink = new T.MeshBasicMaterial({ color: INK, side: T.BackSide });
export function box(w, h, d) {
	const k = `b${w},${h},${d}`;
	if (!geo.has(k)) geo.set(k, new T.BoxGeometry(w, h, d));
	return geo.get(k);
}
export function mesh(g, c, parent, x = 0, y = 0, z = 0, outline = true) {
	const m = new T.Mesh(g, mat(c));
	m.position.set(x, y, z);
	m.castShadow = true;
	m.receiveShadow = true;
	parent.add(m);
	if (outline) {
		const o = new T.Mesh(g, ink);
		o.scale.set(1.035, 1.035, 1.035);
		o.castShadow = false;
		m.add(o);
	}
	return m;
}
export function block(p, c, x, y, z, w, h, d, o = true) {
	return mesh(box(w, h, d), c, p, x, y, z, o);
}
export function ball(p, c, x, y, z, r = 0.3, o = true) {
	return mesh(new T.SphereGeometry(r, 12, 8), c, p, x, y, z, o);
}
export function cylinder(p, c, x, y, z, r, h, rt = r, segments = 12) {
	return mesh(new T.CylinderGeometry(rt, r, h, segments), c, p, x, y, z);
}
export function label(text, w, h, bg = "#173541", fg = "#f4eedc", font = 56) {
	const cv = document.createElement("canvas");
	cv.width = 1024;
	cv.height = Math.max(64, Math.round((1024 * h) / w));
	const ctx = cv.getContext("2d");
	ctx.fillStyle = bg;
	ctx.fillRect(0, 0, cv.width, cv.height);
	ctx.fillStyle = fg;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.font = `900 ${Math.min(font, cv.height * 0.9)}px Arial`;
	const lines = text.split("\n");
	lines.forEach((s, i) =>
		ctx.fillText(
			s,
			512,
			cv.height / 2 + (i - (lines.length - 1) / 2) * (font * 1.1),
			970,
		),
	);
	const tx = new T.CanvasTexture(cv);
	tx.colorSpace = T.SRGBColorSpace;
	tx.anisotropy = 4;
	const m = new T.Mesh(
		new T.PlaneGeometry(w, h),
		new T.MeshBasicMaterial({ map: tx, transparent: false }),
	);
	return m;
}
function sign(p, text, x, y, z, w, h, bg, fg, font) {
	const m = label(text, w, h, bg, fg, font);
	m.position.set(x, y, z);
	p.add(m);
	return m;
}
function rail(p, x, y, z, len, c = INK) {
	block(p, c, x, y, z, len, 0.1, 0.1, false);
}
function plant(p, x, y, z, large = false) {
	const s = large ? 1.5 : 1;
	const g = new T.Group();
	g.position.set(x, y, z);
	p.add(g);
	cylinder(g, 0xe9a27c, 0, 0.32 * s, 0, 0.31 * s, 0.62 * s, 0.43 * s);
	block(g, 0xf2d8a3, 0, 0.63 * s, 0, 0.87 * s, 0.12 * s, 0.87 * s);
	for (let i = 0; i < 7; i++) {
		let a = i * 2.4;
		const leaf = mesh(
			new T.SphereGeometry(0.31 * s, 7, 5),
			[0x648e6e, 0x88a76a, 0xb5c777][i % 3],
			g,
			Math.cos(a) * 0.28 * s,
			(1 + Math.sin(i) * 0.18) * s,
			Math.sin(a) * 0.24 * s,
		);
		leaf.scale.set(0.7, 1.8, 0.55);
		leaf.rotation.z = Math.cos(a) * 0.6;
	}
}
function fixture(p, x, y, z) {
	block(p, 0x294957, x, y, z, 0.1, 1.0, 0.1, false);
	cylinder(p, 0xf5cc70, x, y - 0.6, z, 0.4, 0.18, 0.2);
	ball(p, 0xffecc0, x, y - 0.71, z, 0.12, false);
}
function mannequin(p, x, y, z, color) {
	const g = new T.Group();
	g.position.set(x, y, z);
	p.add(g);
	cylinder(g, 0xf6dfac, 0, 1.3, 0, 0.16, 0.36);
	block(g, color, 0, 0.87, 0, 0.57, 0.66, 0.28);
	block(g, 0xf6dfac, -0.17, 0.34, 0, 0.14, 0.65, 0.14);
	block(g, 0xf6dfac, 0.17, 0.34, 0, 0.14, 0.65, 0.14);
	block(g, 0x173541, 0, 0.04, 0, 0.85, 0.08, 0.6);
}
function store(p, name, x, y, w, color, kind) {
	block(p, color, x, y + 2.13, -2.5, w - 0.18, 4.15, 0.3);
	block(p, 0xd7e8dc, x, y + 1.7, -2.27, w - 0.55, 2.7, 0.07, false);
	block(p, 0x5b8279, x, y + 0.13, -1.95, w - 0.6, 0.24, 1.0);
	for (const k of [-1, 1])
		block(p, INK, x + k * (w / 2 - 0.18), y + 1.9, -1.9, 0.16, 3.65, 0.15);
	rail(p, x, y + 3.25, -1.8, w);
	block(p, INK, x, y + 3.7, -1.95, w - 0.3, 0.82, 0.45);
	sign(p, name, x, y + 3.72, -1.69, w - 0.55, 0.62, "#173541", "#f4eedc", 72);
	const aw = new T.Group();
	aw.position.set(x, y + 3.15, -1.15);
	aw.rotation.x = 0.16;
	p.add(aw);
	for (let i = 0; i < Math.floor(w / 0.46); i++) {
		block(
			aw,
			i % 2 ? color : 0xf5e8cb,
			-w / 2 + 0.23 + i * 0.46,
			0,
			0,
			0.46,
			0.1,
			1.25,
			false,
		);
		block(
			aw,
			i % 2 ? color : 0xf5e8cb,
			-w / 2 + 0.23 + i * 0.46,
			-0.18,
			0.62,
			0.46,
			0.4,
			0.08,
			false,
		);
	}
	rail(p, x, y + 2.96, -0.5, w);
	if (kind === 0) {
		mannequin(p, x - 1.8, y + 0.3, -1.55, 0xe8855c);
		mannequin(p, x + 1.4, y + 0.3, -1.55, 0x7fa796);
		sign(p, "SALE", x, y + 1.85, -1.65, 1.7, 0.8, "#fbd264", "#173541", 210);
	}
	if (kind === 1) {
		for (let i = 0; i < 4; i++) {
			const r = cylinder(p, INK, x - 2.4 + i * 1.5, y + 1.7, -2, 0.49, 0.08);
			r.rotation.x = Math.PI / 2;
			const d = cylinder(
				p,
				i % 2 ? 0xf5cb6f : 0xe78666,
				x - 2.4 + i * 1.5,
				y + 1.7,
				-1.92,
				0.16,
				0.1,
			);
			d.rotation.x = Math.PI / 2;
		}
		block(p, 0xc58d63, x, y + 0.6, -1.3, w - 1, 0.6, 0.65);
	}
	if (kind === 2) {
		for (let i = 0; i < 5; i++) {
			const xx = x - 2.5 + i * 1.25;
			block(
				p,
				[0xf2c660, 0xe7886d, 0x89ab9e][i % 3],
				xx,
				y + 0.7,
				-1.4,
				0.7,
				0.7,
				0.65,
			);
			ball(p, 0xefd18c, xx, y + 1.4, -1.5, 0.26);
		}
	}
	if (kind === 3) {
		block(p, 0xc18e66, x, y + 0.9, -1.2, w - 1, 1, 0.6);
		for (let i = 0; i < 4; i++) {
			cylinder(p, 0xf5e8c7, x - 1.8 + i * 1.25, y + 1.5, -1, 0.22, 0.35);
			block(p, 0x8ba58a, x - 1.8 + i * 1.25, y + 1.8, -1, 0.32, 0.15, 0.25);
		}
		sign(
			p,
			"FRESH DAILY",
			x,
			y + 2.25,
			-1.62,
			w - 1,
			0.42,
			"#f2d68c",
			"#173541",
			62,
		);
	}
}
export function createMall(scene) {
	const mall = new T.Group();
	scene.add(mall);
	const animated = [];
	const floor = new T.Group();
	mall.add(floor);
	block(floor, 0xd5caae, 0, -0.76, 0, 51, 1.05, 9.4);
	block(floor, INK, 0, -1.3, 0, 51.3, 0.15, 9.7);
	block(floor, 0xeee0c1, 0, -0.18, 0, 49, 0.18, 8.3);
	block(floor, 0xe2c497, 0, -0.1, 3.8, 49, 0.1, 0.3);
	for (let f = 0; f < 3; f++) {
		const y = f * FLOOR;
		block(mall, 0xeee2c3, 0, y - 0.24, 0, 47.7, 0.4, 6.4);
		block(mall, INK, 0, y - 0.44, 0, 48, 0.12, 6.5);
		block(
			mall,
			[0xe9b78b, 0xa8c0ae, 0xe3bd85][f],
			0,
			y - 0.2,
			3.3,
			47.8,
			0.44,
			0.12,
		);
		rail(mall, 0, y + 0.1, 3.32, 48, 0x173541);
		for (let x = -22; x <= 22; x += 2) {
			block(
				mall,
				(x / 2 + f) % 2 === 0 ? 0xe3d8bb : 0xf4e7cb,
				x,
				y + 0.005,
				1.1,
				1.98,
				0.025,
				3.9,
				false,
			);
		}
		const names = [
			["SHOE BUSINESS", "RECORD BREAKERS", "BAG TO BASICS", "CUPPA TROUBLE"],
			["THE TOY DEPT.", "VINYL FRONTIER", "COAT ENCOUNTER", "BAKE ESCAPE"],
			["SUNDAY BEST", "TOP OF THE POPS", "CLOCK & DAGGER", "THE LAST CRUMB"],
		][f];
		const palette = [0xd29f83, 0x82aaa3, 0xc5be86, 0xc1b4c0];
		for (let i = 0; i < 4; i++) {
			let x = [-18.4, -7.2, 7.2, 18.4][i];
			store(
				mall,
				names[i],
				x,
				y,
				i === 0 || i === 3 ? 9 : 10,
				palette[(f + i) % 4],
				(i + f) % 4,
			);
		}
		for (const x of [-23.6, -12.9, 12.9, 23.6]) {
			block(mall, 0xe7d9b8, x, y + 2.35, -1.4, 0.42, 4.9, 1.2);
			block(mall, INK, x, y + 2.35, -0.73, 0.1, 4.9, 0.09);
			block(mall, 0xb19471, x, y + 0.22, -1.4, 0.68, 0.4, 1.5);
			fixture(mall, x, y + 4.35, 0.9);
		}
		for (const x of [-11.3, 11.2]) plant(mall, x, y + 0.03, -0.1);
		for (const x of [-5.2, 5.2]) {
			block(mall, 0xaf8667, x, y + 0.47, 0.15, 1.8, 0.12, 0.58);
			for (let j = -1; j < 2; j += 2)
				block(mall, INK, x + j * 0.65, y + 0.24, 0.15, 0.1, 0.47, 0.45);
			block(mall, 0xcca278, x, y + 0.85, -0.04, 1.8, 0.45, 0.1);
		}
		for (let i = 0; i < 16; i++) {
			const x = -22 + i * 3;
			const tri = new T.Mesh(
				new T.ConeGeometry(0.23, 0.46, 3),
				mat([0xe57f5e, 0xf1c363, 0x83a8a2][i % 3]),
			);
			tri.rotation.z = Math.PI;
			tri.position.set(x, y + 4.46, 2.0);
			mall.add(tri);
		}
		rail(mall, 0, y + 4.72, 2, 46, 0x8c9e96);
		sign(
			mall,
			`0${f + 1}`,
			-24.3,
			y + 2.3,
			1.4,
			1.2,
			1.5,
			"#173541",
			"#fbd264",
			660,
		);
	}
	// Exposed express lift: the fastest way to cut off a fleeing crook.
	for (const x of [-1.6, 1.6]) {
		block(mall, INK, x, 7.7, -0.6, 0.16, 16, 0.3);
		block(mall, 0x78958c, x, 7.7, 1.6, 0.12, 16, 0.2);
	}
	for (let f = 0; f < 3; f++) {
		const y = f * FLOOR;
		block(mall, 0xd9b671, 0, y + 1.9, -2.12, 2.9, 3.7, 0.3);
		for (let i = 0; i < 6; i++)
			block(
				mall,
				0xb8965d,
				-1.1 + i * 0.44,
				y + 1.9,
				-1.92,
				0.045,
				3.65,
				0.05,
				false,
			);
		sign(
			mall,
			"↑  EXPRESS  ↓",
			0,
			y + 3.9,
			-1.8,
			3,
			0.47,
			"#fbd264",
			"#173541",
			95,
		);
		block(mall, 0xf3d17c, 2.05, y + 1.15, -0.15, 0.48, 0.62, 0.3);
		ball(mall, 0xe4805d, 2.05, y + 1.2, 0.05, 0.12);
	}
	const lift = new T.Group();
	mall.add(lift);
	block(lift, 0xe2b353, 0, 0.08, 0.4, 2.85, 0.22, 3);
	block(lift, INK, 0, 3.0, 0.4, 2.85, 0.18, 3);
	block(lift, 0xf3d68b, 0, 2.88, 0.4, 2.85, 0.12, 3);
	for (const x of [-1.35, 1.35])
		for (const z of [-0.98, 1.8]) block(lift, INK, x, 1.5, z, 0.08, 3, 0.08);
	for (const x of [-1.34, 1.34])
		block(lift, 0xc78f53, x, 0.77, 0.4, 0.1, 0.6, 2.8);
	sign(lift, "LIFT", 0, 2.55, 1.92, 1.4, 0.44, "#173541", "#fbd264", 220);
	const escalators = [];
	for (let f = 0; f < 2; f++)
		for (const side of [-1, 1]) {
			const x0 = side === -1 ? -21 : 14,
				x1 = side === -1 ? -14 : 21;
			const y0 = f * FLOOR;
			const group = new T.Group();
			mall.add(group);
			const a = new T.Vector3(x0, y0, 1.5),
				b = new T.Vector3(x1, y0 + FLOOR, 1.5);
			const mid = a.clone().add(b).multiplyScalar(0.5),
				len = a.distanceTo(b),
				angle = Math.atan2(FLOOR, x1 - x0);
			for (const z of [0.75, 2.75]) {
				const r = block(
					group,
					0x284c52,
					mid.x,
					mid.y + 0.44,
					z,
					len,
					0.18,
					0.12,
				);
				r.rotation.z = angle;
				const body = block(
					group,
					0x9db7ac,
					mid.x,
					mid.y - 0.1,
					z,
					len,
					0.65,
					0.13,
				);
				body.rotation.z = angle;
			}
			for (let i = 0; i < 18; i++) {
				const step = block(
					group,
					0xb4bca6,
					a.x + ((b.x - a.x) * i) / 18,
					a.y + (FLOOR * i) / 18 - 0.05,
					1.75,
					0.48,
					0.17,
					1.85,
				);
				escalators.push({ step, a, b, i });
			}
			for (const v of [a, b]) {
				const s = sign(
					group,
					"↗",
					v.x,
					v.y + 0.3,
					3.2,
					0.7,
					0.5,
					"#fbd264",
					"#173541",
					450,
				);
				s.rotation.z = 0.05;
			}
			animated.push(group);
		}
	// Roof, clock and little copper cupolas.
	block(mall, 0xeee0bc, 0, 16.0, -0.1, 49, 0.42, 7);
	block(mall, INK, 0, 15.76, 3.45, 49, 0.13, 0.15);
	block(mall, 0x7f9d91, 0, 16.37, -1.1, 48, 0.34, 4.6);
	block(mall, 0xf2d383, 0, 16.8, 1.0, 21, 1.85, 0.55);
	block(mall, INK, 0, 16.8, 1.31, 21, 0.09, 0.05, false);
	sign(
		mall,
		"TINSEL GALLERIA",
		0,
		17.08,
		1.31,
		19.8,
		0.96,
		"#173541",
		"#f3dfac",
		64,
	);
	sign(
		mall,
		"GOOD SHOPS.  QUESTIONABLE COMPANY.",
		0,
		16.39,
		1.32,
		19.8,
		0.34,
		"#e9c775",
		"#173541",
		22,
	);
	for (const x of [-22.5, 22.5]) {
		block(mall, 0xd89d77, x, 16.8, -0.3, 2, 1.25, 2.4);
		const cap = mesh(
			new T.ConeGeometry(1.6, 1.3, 4),
			0x426e6b,
			mall,
			x,
			18.0,
			-0.3,
		);
		cap.rotation.y = Math.PI / 4;
		cylinder(mall, 0xddb465, x, 18.85, -0.3, 0.07, 0.65);
		ball(mall, 0xf1d17b, x, 19.25, -0.3, 0.15);
	}
	const clock = new T.Group();
	clock.position.set(0, 18.63, -0.1);
	mall.add(clock);
	const face = cylinder(clock, 0xf4dfab, 0, 0, 0, 1, 0.3);
	face.rotation.x = Math.PI / 2;
	for (let i = 0; i < 12; i++) {
		let a = (i * Math.PI) / 6;
		block(
			clock,
			INK,
			Math.sin(a) * 0.8,
			Math.cos(a) * 0.8,
			0.18,
			0.06,
			0.13,
			0.02,
			false,
		);
	}
	const hand = block(clock, INK, 0, 0.25, 0.22, 0.07, 0.65, 0.03, false);
	const minute = block(clock, 0xcd7755, 0.25, 0, 0.24, 0.64, 0.06, 0.03, false);
	ball(clock, INK, 0, 0, 0.25, 0.08, false);
	for (const x of [-27.5, 27.5]) {
		plant(mall, x, -0.08, 0, true);
		plant(mall, x - 1.4, -0.08, -1.3);
		block(mall, INK, x, -0.2, 0, 3.9, 0.12, 4.7);
		const pole = block(mall, INK, x, 3.0, -1, 0.12, 6, 0.12);
		fixture(mall, x, 6.3, -1);
	}
	// Paper city behind the miniature set.
	const city = new T.Group();
	scene.add(city);
	for (let i = 0; i < 14; i++) {
		const x = -38 + i * 5.8,
			h = 5 + Math.sin(i * 6.3) * 3;
		block(
			city,
			i % 2 ? 0xc4cfc0 : 0xdad8c0,
			x,
			h / 2 - 1,
			-11,
			4.9,
			h,
			3,
			false,
		);
		for (let a = 0; a < 2; a++)
			for (let b = 0; b < 3; b++)
				block(
					city,
					0xb7c7b8,
					x - 1.1 + a * 2.1,
					1 + b * 1.5,
					-9.46,
					0.8,
					0.75,
					0.03,
					false,
				);
	}
	block(scene, 0xe8dfc8, 0, -1.45, -1, 400, 0.1, 160, false);
	return {
		mall,
		lift,
		escalators,
		clock,
		hand,
		minute,
		city,
		animate(t) {
			minute.rotation.z = -t * 0.2;
			hand.rotation.z = -t * 0.012;
			for (const e of escalators) {
				const k = (e.i / 18 + ((t * 0.12) % 1)) % 1;
				e.step.position.x = e.a.x + (e.b.x - e.a.x) * k;
				e.step.position.y = e.a.y + FLOOR * k - 0.05;
			}
		},
	};
}

export function createCharacter(scene, type = "cop", variant = 0) {
	const root = new T.Group();
	scene.add(root);
	const model = new T.Group();
	root.add(model);
	const parts = {};
	const uniform =
		type === "cop"
			? [0x397582, 0x6e8d63, 0xc27b50, 0x8b729c][variant % 4]
			: [0xcb7155, 0x767a9e, 0xd3a448][variant % 3];
	const skin = [0xe4b78d, 0xbe8a66, 0xf1caa2, 0x966a50][variant % 4];
	const body = new T.Group();
	body.name = "torso";
	body.position.y = 0.91;
	model.add(body);
	block(body, uniform, 0, 0.2, 0, 0.62, 0.7, 0.44);
	block(body, INK, 0, -0.1, 0, 0.65, 0.1, 0.46);
	block(body, 0xf2c95f, 0.2, -0.1, 0.26, 0.11, 0.12, 0.04);
	if (type === "cop") {
		block(body, 0xe9ce8b, 0.18, 0.3, 0.26, 0.14, 0.18, 0.04);
		block(body, 0x173541, -0.18, 0.15, 0.25, 0.2, 0.08, 0.03);
		block(body, 0xf5dfaf, 0, 0.45, 0.26, 0.14, 0.12, 0.06);
	} else {
		for (let i = 0; i < 3; i++)
			block(
				body,
				0xf2e1be,
				0,
				0.03 + i * 0.19,
				0.235,
				0.61,
				0.075,
				0.03,
				false,
			);
	}
	const head = new T.Group();
	head.position.set(0, 1.64, 0);
	head.name = "head";
	model.add(head);
	const skull = ball(head, skin, 0, 0, 0, 0.32);
	skull.scale.set(0.91, 1.04, 0.88);
	ball(head, skin, 0.04, -0.01, 0.29, 0.1);
	for (const x of [-0.115, 0.12]) {
		block(head, INK, x, 0.045, 0.27, 0.055, 0.06, 0.05, false);
		block(head, INK, x, 0.145, 0.26, 0.11, 0.035, 0.03, false);
	}
	block(head, INK, 0.04, -0.125, 0.267, 0.16, 0.035, 0.035, false);
	if (type === "cop") {
		cylinder(head, uniform, 0, 0.27, 0, 0.35, 0.18, 0.3);
		block(head, INK, 0, 0.22, 0.23, 0.64, 0.07, 0.35);
		block(head, 0xf5cb63, 0, 0.32, 0.33, 0.12, 0.13, 0.04);
	} else {
		block(head, INK, 0, 0.04, 0.26, 0.49, 0.11, 0.065);
		for (const x of [-0.115, 0.12])
			block(head, 0xf4e1bd, x, 0.04, 0.3, 0.03, 0.03, 0.02, false);
		cylinder(head, INK, 0, 0.28, 0, 0.34, 0.18, 0.26);
		ball(head, INK, 0.15, 0.37, 0, 0.1);
	}
	const limbs = [];
	for (const s of [-1, 1]) {
		const arm = new T.Group();
		arm.position.set(s * 0.43, 1.25, 0);
		arm.name = s < 0 ? "armL" : "armR";
		model.add(arm);
		block(arm, uniform, 0, -0.2, 0, 0.22, 0.46, 0.29);
		ball(arm, skin, 0, -0.46, 0, 0.125);
		limbs.push(arm);
		const leg = new T.Group();
		leg.position.set(s * 0.19, 0.73, 0);
		leg.name = s < 0 ? "legL" : "legR";
		model.add(leg);
		block(
			leg,
			type === "cop" ? 0x24454f : 0x334957,
			0,
			-0.25,
			0,
			0.24,
			0.57,
			0.26,
		);
		block(leg, INK, 0, -0.57, 0.08, 0.29, 0.15, 0.44);
		limbs.push(leg);
	}
	if (type !== "cop") {
		const bag = new T.Group();
		bag.position.set(0.5, 0.85, -0.12);
		bag.name = "bag";
		model.add(bag);
		const sack = ball(bag, 0xe8c78c, 0, 0, 0, 0.36);
		sack.scale.set(0.8, 1.25, 0.8);
		cylinder(bag, 0xbf985a, 0, 0.36, 0, 0.1, 0.16);
		const dollar = label("$", 0.32, 0.35, "#e8c78c", "#173541", 700);
		dollar.position.set(0, 0, 0.33);
		bag.add(dollar);
	}
	const times = [0, 0.15, 0.3, 0.45, 0.6],
		swing = [0, 0.75, 0, -0.75, 0],
		tracks = [];
	for (const [n, m] of [
		["legL", 1],
		["legR", -1],
		["armL", -1],
		["armR", 1],
	])
		tracks.push(
			new T.NumberKeyframeTrack(
				n + ".rotation[x]",
				times,
				swing.map((v) => v * m),
			),
		);
	tracks.push(
		new T.NumberKeyframeTrack(
			"torso.position[y]",
			times,
			[0.91, 0.97, 0.91, 0.97, 0.91],
		),
	);
	tracks.push(
		new T.NumberKeyframeTrack(
			"head.rotation[z]",
			times,
			[0, -0.04, 0, 0.04, 0],
		),
	);
	const clip = new T.AnimationClip("beat-run", 0.6, tracks);
	const mixer = new T.AnimationMixer(model);
	const run = mixer.clipAction(clip);
	run.play();
	const idle = mixer.clipAction(
		new T.AnimationClip("radio-idle", 2, [
			new T.NumberKeyframeTrack(
				"torso.position[y]",
				[0, 1, 2],
				[0.91, 0.94, 0.91],
			),
			new T.NumberKeyframeTrack(
				"head.rotation[z]",
				[0, 1, 2],
				[-0.04, 0.04, -0.04],
			),
		]),
	);
	idle.play();
	run.weight = 0;
	idle.weight = 1;
	const cuff = mixer.clipAction(
		new T.AnimationClip("cuff-flourish", 0.7, [
			new T.NumberKeyframeTrack(
				"armR.rotation[x]",
				[0, 0.2, 0.5, 0.7],
				[0, -1.6, -1.6, 0],
			),
			new T.NumberKeyframeTrack(
				"head.rotation[z]",
				[0, 0.2, 0.5, 0.7],
				[0, -0.2, 0.15, 0],
			),
		]),
	);
	cuff.setLoop(T.LoopOnce);
	cuff.clampWhenFinished = false;
	const shadow = new T.Mesh(
		new T.CircleGeometry(0.52, 20),
		new T.MeshBasicMaterial({
			color: 0x4a6659,
			transparent: true,
			opacity: 0.2,
			depthWrite: false,
		}),
	);
	shadow.rotation.x = -Math.PI / 2;
	scene.add(shadow);
	return {
		root,
		model,
		mixer,
		run,
		idle,
		cuff,
		parts,
		shadow,
		animate(dt, speed, duck = false, dir = 1, time = 0) {
			run.weight = Math.min(1, Math.abs(speed) / 3);
			idle.weight = 1 - run.weight;
			mixer.timeScale = Math.max(0.8, Math.abs(speed) / 5);
			mixer.update(dt);
			model.scale.y = T.MathUtils.lerp(
				model.scale.y,
				duck ? 0.52 : 1,
				Math.min(1, dt * 14),
			);
			const yaw = dir < 0 ? -0.64 : 0.64;
			model.rotation.y = T.MathUtils.lerp(
				model.rotation.y,
				yaw,
				Math.min(1, dt * 12),
			);
			shadow.position.set(
				root.position.x,
				Math.round(root.position.y / FLOOR) * FLOOR + 0.045,
				Z + 0.05,
			);
			shadow.scale.setScalar(
				Math.max(0.5, 1 - (root.position.y % FLOOR) * 0.12),
			);
		},
		dispose() {
			root.removeFromParent();
			shadow.removeFromParent();
			mixer.stopAllAction();
		},
	};
}

export function hazardModel(scene, type) {
	const g = new T.Group();
	scene.add(g);
	if (type === "ball") {
		ball(g, 0xe88a66, 0, 0, 0, 0.39);
		for (let i = 0; i < 3; i++) {
			const stripe = new T.Mesh(
				new T.TorusGeometry(0.395, 0.03, 5, 24),
				mat(i === 0 ? 0xf4d578 : 0x173541),
			);
			stripe.rotation.set(
				i === 0 ? Math.PI / 2 : 0,
				i === 2 ? Math.PI / 2 : 0,
				0,
			);
			g.add(stripe);
		}
	}
	if (type === "cart") {
		block(g, 0x83a5a2, 0, 0.1, 0, 1.0, 0.65, 0.65);
		for (let i = -1; i <= 1; i++)
			block(g, INK, i * 0.3, 0.13, 0.36, 0.035, 0.62, 0.035, false);
		block(g, INK, 0.6, 0.5, 0, 0.1, 0.1, 0.9);
		block(g, INK, 0.52, 0.25, 0, 0.08, 0.55, 0.08);
		for (const x of [-0.4, 0.4])
			for (const z of [-0.3, 0.3]) {
				const wheel = cylinder(g, INK, x, -0.38, z, 0.13, 0.1);
				wheel.rotation.x = Math.PI / 2;
			}
		block(g, 0xf2cb6b, -0.18, 0.61, 0, 0.45, 0.4, 0.48);
		block(g, 0xe88765, 0.26, 0.46, 0, 0.3, 0.2, 0.5);
	}
	if (type === "plane") {
		const body = ball(g, 0xf4d064, 0, 0, 0, 0.27);
		body.scale.set(2.3, 0.6, 0.8);
		block(g, 0xe88662, 0, 0.06, 0, 0.37, 0.09, 1.8);
		block(g, 0x9bb6a0, 0.48, 0.2, 0, 0.25, 0.4, 0.07);
		const prop = block(g, INK, -0.61, 0, 0, 0.05, 0.58, 0.08);
		prop.name = "prop";
	}
	return g;
}
export function pickupModel(scene, type) {
	const g = new T.Group();
	scene.add(g);
	if (type === "coffee") {
		cylinder(g, 0xf6d481, 0, 0, 0, 0.22, 0.45, 0.26);
		cylinder(g, INK, 0, 0.24, 0, 0.28, 0.07);
		block(g, 0xe28b66, 0, 0.02, 0.23, 0.24, 0.15, 0.03);
	} else {
		block(g, 0xeac989, 0, 0, 0, 0.45, 0.54, 0.18);
		block(g, 0xf4e5bf, 0, 0, 0.11, 0.35, 0.43, 0.035);
		const l = label("$", 0.26, 0.34, "#f4e5bf", "#173541", 700);
		l.position.z = 0.14;
		g.add(l);
	}
	return g;
}

export class Effects {
	constructor(scene) {
		this.scene = scene;
		this.items = [];
		this.words = [];
	}
	burst(x, y, z, color = 0xfbd264, count = 16) {
		for (let i = 0; i < count; i++) {
			const m = block(
				this.scene,
				[color, 0xf4e7be, 0xe78965][i % 3],
				x,
				y,
				z,
				0.09 + Math.random() * 0.13,
				0.1 + Math.random() * 0.15,
				0.05,
				false,
			);
			this.items.push({
				m,
				v: new T.Vector3(
					(Math.random() - 0.5) * 7,
					2 + Math.random() * 5,
					(Math.random() - 0.5) * 3,
				),
				life: 0.7 + Math.random() * 0.7,
			});
		}
	}
	word(text, x, y, color = "#fbd264") {
		const m = label(text, 3.3, 0.85, color, "#173541", 220);
		m.position.set(x, y, Z + 1.5);
		m.rotation.z = (Math.random() - 0.5) * 0.2;
		this.scene.add(m);
		this.words.push({ m, life: 1.1 });
	}
	update(dt) {
		for (const p of this.items) {
			p.life -= dt;
			p.v.y -= 9 * dt;
			p.m.position.addScaledVector(p.v, dt);
			p.m.rotation.z += dt * 5;
			p.m.scale.setScalar(Math.max(0.01, Math.min(1, p.life * 2)));
		}
		this.items = this.items.filter((p) => {
			if (p.life > 0) return true;
			p.m.removeFromParent();
			return false;
		});
		for (const p of this.words) {
			p.life -= dt;
			p.m.position.y += dt * 0.8;
			p.m.scale.setScalar(Math.max(0.01, Math.min(1, p.life * 4)));
		}
		this.words = this.words.filter((p) => {
			if (p.life > 0) return true;
			p.m.removeFromParent();
			p.m.geometry.dispose();
			p.m.material.map.dispose();
			p.m.material.dispose();
			return false;
		});
	}
}
