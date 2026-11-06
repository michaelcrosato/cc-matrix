import * as T from "three/webgpu";
import { color, normalWorld, vec3 } from "three/tsl";
import {
	LANES,
	LEVELS,
	trackPoint,
	lengthOf,
	actorPoint,
	wrap,
} from "./core.js";

const C = {
	ink: 0x111b2c,
	road: 0x283347,
	cream: 0xffefd1,
	mint: 0x92f1c7,
	coral: 0xff796c,
	gold: 0xffce70,
	lilac: 0xb2a0ed,
	blue: 0x617fa4,
};
const mats = new Map();
function toon(hex) {
	if (mats.has(hex)) return mats.get(hex);
	const m = new T.MeshBasicNodeMaterial();
	m.colorNode = color(hex).mul(
		normalWorld
			.dot(vec3(-0.35, 0.86, 0.4))
			.max(0)
			.mul(3)
			.floor()
			.div(3)
			.mul(0.44)
			.add(0.56),
	);
	mats.set(hex, m);
	return m;
}
const flat = (hex, opacity = 1) =>
	new T.MeshBasicMaterial({
		color: hex,
		transparent: opacity < 1,
		opacity,
		depthWrite: opacity === 1,
	});
const black = new T.MeshBasicMaterial({ color: C.ink, side: T.BackSide });
function box(w, h, d) {
	return new T.BoxGeometry(w, h, d);
}
function bevel(w, h, d, r = 0.06) {
	const s = new T.Shape();
	s.moveTo(-w / 2 + r, -h / 2);
	s.lineTo(w / 2 - r, -h / 2);
	s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
	s.lineTo(w / 2, h / 2 - r);
	s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
	s.lineTo(-w / 2 + r, h / 2);
	s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
	s.lineTo(-w / 2, -h / 2 + r);
	s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
	const g = new T.ExtrudeGeometry(s, {
		depth: d,
		bevelEnabled: true,
		steps: 1,
		bevelSize: r,
		bevelThickness: r,
		bevelSegments: 1,
		curveSegments: 3,
	});
	g.translate(0, 0, -d / 2);
	return g;
}
function mesh(parent, geo, mat, x = 0, y = 0, z = 0, ink = false) {
	const m = new T.Mesh(geo, mat);
	m.position.set(x, y, z);
	parent.add(m);
	if (ink) {
		const outline = new T.Mesh(geo, black);
		outline.scale.set(1.045, 1.045, 1.045);
		m.add(outline);
	}
	return m;
}
function rr(hx, hz, r) {
	const s = new T.Shape();
	s.moveTo(-hx + r, -hz);
	s.lineTo(hx - r, -hz);
	s.quadraticCurveTo(hx, -hz, hx, -hz + r);
	s.lineTo(hx, hz - r);
	s.quadraticCurveTo(hx, hz, hx - r, hz);
	s.lineTo(-hx + r, hz);
	s.quadraticCurveTo(-hx, hz, -hx, hz - r);
	s.lineTo(-hx, -hz + r);
	s.quadraticCurveTo(-hx, -hz, -hx + r, -hz);
	return s;
}
function ground(parent, hx, hz, r, y, hex, hole) {
	const s = rr(hx, hz, r);
	if (hole) s.holes.push(rr(...hole));
	const m = mesh(parent, new T.ShapeGeometry(s, 12), flat(hex), 0, y, 0);
	m.rotation.x = -Math.PI / 2;
	return m;
}
function canvasTexture(
	text,
	{
		bg = "#ffefd1",
		fg = "#111b2c",
		w = 768,
		h = 256,
		size = 100,
		border = true,
	} = {},
) {
	const cv = document.createElement("canvas");
	cv.width = w;
	cv.height = h;
	const ctx = cv.getContext("2d");
	ctx.fillStyle = bg;
	ctx.fillRect(0, 0, w, h);
	if (border) {
		ctx.strokeStyle = fg;
		ctx.lineWidth = 14;
		ctx.strokeRect(8, 8, w - 16, h - 16);
	}
	ctx.fillStyle = fg;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.font = `900 ${size}px Arial, sans-serif`;
	const lines = text.split("\n");
	lines.forEach((line, i) =>
		ctx.fillText(
			line,
			w / 2,
			h / 2 + (i - (lines.length - 1) / 2) * size * 1.05,
			w * 0.9,
		),
	);
	const texture = new T.CanvasTexture(cv);
	texture.colorSpace = T.SRGBColorSpace;
	return texture;
}
function sign(parent, text, w, h, x, y, z, options = {}) {
	const tex = canvasTexture(text, options);
	const m = mesh(
		parent,
		new T.PlaneGeometry(w, h),
		new T.MeshBasicMaterial({ map: tex, side: T.DoubleSide }),
		x,
		y,
		z,
	);
	return m;
}
function cylinder(parent, r, h, hex, x, y, z, ink = false, sides = 8) {
	return mesh(
		parent,
		new T.CylinderGeometry(r, r, h, sides),
		toon(hex),
		x,
		y,
		z,
		ink,
	);
}
function palm(parent, x, z, scale = 1) {
	const g = new T.Group();
	parent.add(g);
	g.position.set(x, 0, z);
	g.scale.setScalar(scale);
	const trunk = cylinder(g, 0.16, 2.9, 0x9b735b, 0.12, 1.45, 0, true, 7);
	trunk.rotation.z = -0.08;
	for (let j = 0; j < 7; j++) {
		const angle = (j * Math.PI * 2) / 7;
		const leaf = new T.Shape();
		leaf.moveTo(0, 0);
		leaf.quadraticCurveTo(0.5, 0.7, 0.34, 1.6);
		leaf.lineTo(0, 2.5);
		leaf.lineTo(-0.34, 1.4);
		leaf.quadraticCurveTo(-0.45, 0.5, 0, 0);
		const m = mesh(
			g,
			new T.ShapeGeometry(leaf),
			new T.MeshBasicMaterial({
				color: j % 2 ? 0x51a58d : 0x92d2a6,
				side: T.DoubleSide,
			}),
			0.22,
			2.8,
			0,
		);
		m.rotation.set(-1.2, 0, angle);
		m.rotateY(angle);
		m.rotation.y = angle;
	}
	const shadow = mesh(
		g,
		new T.CircleGeometry(1.5, 16),
		flat(C.ink, 0.16),
		0,
		0.02,
		0,
	);
	shadow.rotation.x = -Math.PI / 2;
}
function building(parent, x, z, w, d, h, hex, seed = 0) {
	const g = new T.Group();
	parent.add(g);
	g.position.set(x, 0, z);
	mesh(g, box(w, h, d), toon(hex), 0, h / 2 - 0.4, 0, true);
	mesh(g, box(w + 0.2, 0.2, d + 0.2), toon(C.ink), 0, h - 0.35, 0);
	mesh(g, box(w - 0.3, 0.2, d - 0.3), toon(0x8391a0), 0, h - 0.2, 0);
	for (let a = 0; a < Math.floor(w / 0.85); a++)
		for (let b = 0; b < Math.floor(h / 1.2); b++) {
			if ((a * 7 + b * 3 + seed) % 4 === 0) continue;
			mesh(
				g,
				box(0.38, 0.48, 0.04),
				flat((a + b + seed) % 3 === 0 ? 0xf6c47a : 0x9bc9cf),
				-w / 2 + 0.6 + a * 0.86,
				0.7 + b * 1.12,
				d / 2 + 0.04,
			);
		}
	for (let a = 0; a < Math.floor(d / 1.1); a++)
		for (let b = 0; b < Math.floor(h / 1.3); b++)
			mesh(
				g,
				box(0.04, 0.42, 0.38),
				flat((a + b) % 3 === 0 ? C.gold : 0x82a1bc),
				w / 2 + 0.02,
				0.7 + b * 1.12,
				-d / 2 + 0.6 + a * 1.1,
			);
	mesh(
		g,
		box(w * 0.3, 0.7, d * 0.32),
		toon(0x47566e),
		w * 0.16,
		h + 0.15,
		0,
		true,
	);
	return g;
}
function carVisual(hex, num, enemy = false) {
	const root = new T.Group(),
		body = new T.Group();
	root.add(body);
	body.name = "shell";
	const shadow = mesh(
		root,
		new T.CircleGeometry(0.93, 16),
		flat(C.ink, 0.35),
		0,
		-0.38,
		0.05,
	);
	shadow.rotation.x = -Math.PI / 2;
	shadow.scale.y = 1.28;
	mesh(body, bevel(1, 0.26, 1.72, 0.05), toon(C.ink), 0, -0.05, 0, true);
	mesh(body, bevel(1.06, 0.28, 1.65, 0.08), toon(hex), 0, 0.13, 0, true);
	mesh(body, bevel(0.77, 0.34, 0.7, 0.055), toon(C.ink), 0, 0.4, -0.15, true);
	mesh(body, box(0.69, 0.16, 0.25), toon(0x99c9d4), 0, 0.52, 0.17);
	mesh(body, box(0.7, 0.1, 0.22), toon(0x617b9b), 0, 0.5, -0.46);
	mesh(body, bevel(0.77, 0.1, 0.55, 0.03), toon(hex), 0, 0.65, -0.17, true);
	mesh(body, box(0.15, 0.018, 0.52), toon(C.cream), 0, 0.3, 0.57);
	mesh(body, box(0.15, 0.02, 0.34), toon(C.cream), 0, 0.3, -0.65);
	mesh(body, box(1.1, 0.1, 0.14), toon(C.cream), 0, 0.03, 0.89, true);
	mesh(body, box(1.1, 0.1, 0.14), toon(C.ink), 0, 0.03, -0.9);
	[-1, 1].forEach((s) => {
		mesh(body, box(0.23, 0.13, 0.08), flat(0xffe4a0), s * 0.36, 0.19, 0.87);
		mesh(body, box(0.2, 0.11, 0.08), flat(C.coral), s * 0.38, 0.16, -0.87);
		mesh(body, box(0.14, 0.1, 0.18), toon(hex), s * 0.59, 0.4, 0.02, true);
	});
	const wheelTracks = [];
	for (let i = 0; i < 4; i++) {
		const w = mesh(
			root,
			new T.CylinderGeometry(0.26, 0.26, 0.2, 10),
			toon(C.ink),
			i % 2 ? -0.57 : 0.57,
			-0.1,
			i < 2 ? 0.52 : -0.57,
		);
		w.rotation.z = Math.PI / 2;
		const pivot = new T.Group();
		pivot.position.copy(w.position);
		root.add(pivot);
		w.position.set(0, 0, 0);
		root.remove(w);
		pivot.add(w);
		pivot.name = "wheel" + i;
		mesh(w, new T.CylinderGeometry(0.12, 0.12, 0.205, 8), toon(0x99a4ac));
		wheelTracks.push(
			new T.NumberKeyframeTrack(
				"wheel" + i + ".rotation[x]",
				[0, 0.5, 1],
				[0, -Math.PI, -Math.PI * 2],
			),
		);
	}
	if (enemy) {
		mesh(body, box(0.67, 0.08, 0.22), toon(C.cream), 0, 0.78, -0.15, true);
		const a = mesh(
			body,
			box(0.23, 0.16, 0.2),
			flat(C.coral),
			-0.21,
			0.87,
			-0.15,
		);
		const b = mesh(
			body,
			box(0.23, 0.16, 0.2),
			flat(0x84c7e6),
			0.21,
			0.87,
			-0.15,
		);
		a.name = "sirenA";
		b.name = "sirenB";
	} else {
		const badge = sign(body, String(num), 0.4, 0.36, 0, 0.716, -0.16, {
			size: 170,
			w: 256,
			h: 256,
			border: false,
			bg: "#fff0d1",
		});
		badge.rotation.x = -Math.PI / 2;
		const antenna = cylinder(
			body,
			0.035,
			0.4,
			C.ink,
			0.38,
			0.73,
			-0.53,
			false,
			5,
		);
		mesh(body, new T.SphereGeometry(0.085, 6, 4), toon(hex), 0.38, 0.97, -0.53);
	}
	const mixer = new T.AnimationMixer(root);
	mixer
		.clipAction(
			new T.AnimationClip("drive", 1, [
				...wheelTracks,
				new T.NumberKeyframeTrack(
					"shell.position[y]",
					[0, 0.25, 0.5, 0.75, 1],
					[0, 0.026, 0, 0.02, 0],
				),
			]),
		)
		.play();
	const shield = mesh(
		root,
		new T.SphereGeometry(1.25, 16, 10),
		new T.MeshBasicMaterial({
			color: C.mint,
			transparent: true,
			opacity: 0.16,
			wireframe: true,
		}),
		0,
		0.16,
		0,
	);
	shield.visible = false;
	const trail = mesh(
		root,
		new T.ConeGeometry(0.35, 1.6, 5),
		flat(C.gold, 0.85),
		0,
		-0.08,
		-1.55,
	);
	trail.rotation.x = -Math.PI / 2;
	trail.visible = false;
	const marker = mesh(
		root,
		new T.ConeGeometry(0.22, 0.4, 3),
		flat(hex),
		0,
		1.35,
		0,
	);
	marker.rotation.z = Math.PI;
	marker.visible = !enemy;
	return { root, body, mixer, shield, trail, marker };
}
export class View {
	constructor(canvas) {
		this.canvas = canvas;
		this.scene = new T.Scene();
		this.scene.background = new T.Color(0x111c2e);
		this.scene.fog = new T.Fog(0x111c2e, 72, 115);
		this.camera = new T.OrthographicCamera(-30, 30, 20, -20, 0.1, 180);
		this.renderer = new T.WebGPURenderer({
			canvas,
			antialias: true,
			alpha: false,
			powerPreference: "high-performance",
			forceWebGL: new URLSearchParams(location.search).has("webgl"),
		});
		this.renderer.setPixelRatio(window.devicePixelRatio || 1);
		this.renderer.outputColorSpace = T.SRGBColorSpace;
		this.renderer.toneMapping = T.NoToneMapping;
		this.city = new T.Group();
		this.scene.add(this.city);
		this.dynamic = new T.Group();
		this.scene.add(this.dynamic);
		this.effects = new T.Group();
		this.scene.add(this.effects);
		this.cars = new Map();
		this.ghosts = new Map();
		this.particles = [];
		this.popups = [];
		this.debrisMeshes = new Map();
		this.stageKey = -1;
		this.shake = 0;
		this.time = 0;
		this.mode = "title";
		this.cameraStyle = "arcade";
		this.reduced = false;
		this.renderCount = 0;
		this.cameraX = -10;
		this.makeCity();
		window.addEventListener("resize", () => this.resize());
		this.resize();
	}
	async init() {
		await this.renderer.init();
		this.backend = this.renderer.backend.isWebGPUBackend
			? "WebGPU"
			: "WebGL2 fallback";
		await this.renderer.compileAsync(this.scene, this.camera);
	}
	makeCity() {
		const g = this.city;
		const floor = mesh(
			g,
			new T.PlaneGeometry(240, 240),
			flat(0x162235),
			0,
			-0.72,
			0,
		);
		floor.rotation.x = -Math.PI / 2;
		const base = new T.ExtrudeGeometry(rr(21.6, 16.1, 5), {
			depth: 0.5,
			bevelEnabled: false,
			curveSegments: 12,
			steps: 1,
		});
		const bm = mesh(g, base, toon(0x7d7d86), 0, -0.6, 0, true);
		bm.rotation.x = -Math.PI / 2;
		ground(g, 21.4, 15.9, 4.9, -0.075, 0xf1c6a0);
		ground(g, 20.6, 15.1, 4.8, -0.06, C.ink);
		ground(g, 20.38, 14.88, 4.6, -0.05, 0x556273);
		ground(g, 19.35, 13.95, 4.65, -0.025, C.ink);
		ground(g, 19.1, 13.7, 4.45, 0, C.road, [9.58, 4.18, 2.3]);
		ground(g, 19.25, 13.85, 4.5, 0.012, C.cream, [19.1, 13.7, 4.45]);
		ground(g, 9.65, 4.25, 2.4, 0.018, C.cream, [9.5, 4.1, 2.3]);
		for (let i = 0; i < 3; i++) {
			const a = LANES[i],
				b = LANES[i + 1],
				middle = {
					hx: (a.hx + b.hx) / 2,
					hz: (a.hz + b.hz) / 2,
					r: (a.r + b.r) / 2,
				},
				len = lengthOf(middle),
				n = Math.floor(len / 0.85);
			for (let j = 0; j < n; j++) {
				const u = (j + 0.5) / n;
				if ((Math.abs(u * 4 - Math.round(u * 4)) * len) / 4 < 2.1) continue;
				const p = trackPoint(u, middle),
					ink = mesh(
						g,
						box(0.34, 0.24, len / n + 0.025),
						toon(C.ink),
						p.x,
						0.1,
						p.z,
					);
				ink.rotation.y = p.yaw;
				const curb = mesh(
					g,
					box(0.23, 0.06, (len / n) * 0.8),
					toon(j % 3 === 0 ? C.coral : C.cream),
					p.x,
					0.25,
					p.z,
				);
				curb.rotation.y = p.yaw;
			}
		}
		// Four clean, unmistakable breaks through all three lane dividers.
		for (let gate = 0; gate < 4; gate++) {
			const vertical = gate % 2 === 0;
			const x = vertical ? 0 : gate === 1 ? 14.4 : -14.4,
				z = vertical ? (gate === 0 ? -9 : 9) : 0;
			const pad = mesh(
				g,
				box(vertical ? 3.7 : 9.4, 0.012, vertical ? 9.4 : 3.7),
				flat(C.mint, 0.1),
				x,
				0.035,
				z,
			);
			for (let j = 0; j < 4; j++) {
				const p = trackPoint(gate / 4, j);
				const arrow = new T.Shape();
				arrow.moveTo(-0.43, -0.26);
				arrow.lineTo(0, 0.17);
				arrow.lineTo(0.43, -0.26);
				arrow.lineTo(0.43, -0.02);
				arrow.lineTo(0, 0.43);
				arrow.lineTo(-0.43, -0.02);
				arrow.closePath();
				const am = mesh(
					g,
					new T.ShapeGeometry(arrow),
					flat(C.mint, 0.67),
					p.x,
					0.047,
					p.z,
				);
				am.rotation.x = -Math.PI / 2;
				am.rotation.z = (gate * Math.PI) / 2;
			}
			const p = trackPoint(gate / 4, 0);
			const label = sign(
				g,
				"GAP",
				1.7,
				0.65,
				p.x + (vertical ? 2.5 : 1.5),
				0.035,
				p.z + (vertical ? 0 : 2.4),
				{
					bg: "#283347",
					fg: "#92f1c7",
					w: 512,
					h: 192,
					size: 132,
					border: false,
				},
			);
			label.rotation.x = -Math.PI / 2;
			label.rotation.z = (gate * Math.PI) / 2;
		}
		// The little all-night diner in the middle of the circuit.
		ground(g, 9.42, 4.02, 2.25, 0.07, 0xb1b5b2);
		ground(g, 9.1, 3.7, 2.1, 0.09, 0xdbd4b4);
		mesh(g, box(9.3, 1.4, 3.1), toon(C.coral), -2.8, 0.82, -0.3, true);
		mesh(g, box(9.6, 0.22, 3.5), toon(C.cream), -2.8, 1.65, -0.3, true);
		mesh(g, box(9.25, 0.2, 3.1), toon(0x7d939a), -2.8, 1.87, -0.3);
		for (let i = 0; i < 6; i++) {
			mesh(
				g,
				box(1.15, 0.72, 0.05),
				toon(0x99ccd1),
				-6.65 + i * 1.5,
				0.93,
				1.28,
				true,
			);
			mesh(g, box(0.08, 0.85, 0.1), toon(C.ink), -7.28 + i * 1.5, 0.9, 1.34);
		}
		for (let i = 0; i < 12; i++)
			mesh(
				g,
				box(0.78, 0.12, 0.8),
				toon(i % 2 ? C.cream : C.coral),
				-7.1 + i * 0.78,
				1.5,
				1.6,
				true,
			);
		sign(g, "THE PIT · OPEN ALL NIGHT", 8.2, 0.58, -2.8, 1.88, 1.49, {
			size: 62,
			w: 1024,
			h: 128,
		});
		mesh(g, box(1.2, 0.25, 1.3), toon(C.ink), -5.8, 2.1, -0.4, true);
		mesh(g, box(1, 0.45, 0.9), toon(0x95abb0), -5.8, 2.28, -0.4, true);
		for (let i = 0; i < 4; i++)
			mesh(g, box(0.1, 0.02, 0.8), toon(C.ink), -6.13 + i * 0.22, 2.52, -0.4);
		[-1, 1].forEach((s) => {
			cylinder(g, 0.1, 3.8, C.ink, -2.6 + s * 2.6, 2.9, -0.45);
		});
		const billboard = sign(g, "DODGE ALLEY", 7.6, 1.7, -2.6, 4.25, -0.38, {
			bg: "#ffce70",
			size: 83,
			w: 1024,
			h: 256,
		});
		billboard.rotation.x = -0.12;
		mesh(g, box(7.85, 1.9, 0.18), toon(C.ink), -2.6, 4.25, -0.55, true);
		const small = sign(g, "NO BRAKES?\nNO PROBLEM.", 2.3, 1.25, 5.8, 2.6, 0.4, {
			bg: "#92f1c7",
			size: 76,
			w: 512,
			h: 256,
		});
		cylinder(g, 0.08, 2, C.ink, 5.8, 1.2, 0.3);
		for (let i = 0; i < 2; i++) {
			const x = 4.5 + i * 2.2;
			mesh(g, bevel(0.85, 1.1, 0.55, 0.04), toon(C.cream), x, 0.7, 1.8, true);
			mesh(g, box(0.64, 0.3, 0.04), toon(C.ink), x, 0.97, 2.12);
			sign(g, i ? "GO" : "98", 0.5, 0.24, x, 1.02, 2.15, {
				bg: "#111b2c",
				fg: "#92f1c7",
				w: 256,
				h: 128,
				size: 88,
				border: false,
			});
			const hose = new T.Mesh(
				new T.TorusGeometry(0.36, 0.035, 5, 12, Math.PI * 1.5),
				toon(C.ink),
			);
			hose.position.set(x + 0.5, 0.7, 1.85);
			g.add(hose);
		}
		palm(g, 8, -1.7, 0.8);
		palm(g, -8.1, -2.4, 0.75);
		for (let i = 0; i < 2; i++) {
			const x = 1.5 + i * 2.2;
			cylinder(g, 0.57, 0.13, C.coral, x, 0.72, -2.2, true, 12);
			cylinder(g, 0.06, 0.65, C.ink, x, 0.36, -2.2);
			[-1, 1].forEach((s) => {
				cylinder(g, 0.25, 0.12, C.mint, x + s * 0.8, 0.4, -2.2, false, 10);
				cylinder(g, 0.06, 0.4, C.ink, x + s * 0.8, 0.2, -2.2);
			});
		}
		// Sidewalk details, street lamps, and a low-rise paper city.
		for (let j = 0; j < 12; j++) {
			const u = j / 12 + 0.018,
				p = trackPoint(u, { hx: 20.3, hz: 14.9, r: 4.7 });
			if (j % 3 === 0) palm(g, p.x, p.z, 1.05);
			else {
				const pole = cylinder(g, 0.08, 3.7, C.ink, p.x, 1.8, p.z, false);
				mesh(g, box(0.8, 0.11, 0.45), toon(C.ink), p.x, 3.7, p.z);
				mesh(g, box(0.65, 0.06, 0.36), flat(C.gold), p.x, 3.62, p.z);
				const pool = mesh(
					g,
					new T.CircleGeometry(1.5, 16),
					flat(C.gold, 0.08),
					p.x,
					0.02,
					p.z,
				);
				pool.rotation.x = -Math.PI / 2;
			}
		}
		for (let j = 0; j < 8; j++) {
			const x = -25 + j * 7.2;
			building(
				g,
				x,
				-21.5,
				5.7,
				5.8,
				3.7 + ((j * 3) % 5),
				[0x3c506c, 0x6e6987, 0x586e83, 0x687e8b][j % 4],
				j,
			);
		}
		for (let side of [-1, 1])
			for (let j = 0; j < 4; j++)
				building(
					g,
					side * (26.6 + (j % 2) * 1.7),
					-10 + j * 8,
					5.2,
					5.3,
					3.3 + j * 0.8,
					side === 1 ? 0x4f657d : 0x6b647c,
					j,
				);
		building(g, -13.5, 21.1, 7, 5.5, 3.4, 0x7a6a7a, 4);
		building(g, 13.7, 21.1, 7, 5.5, 4.1, 0x556c85, 5);
		sign(g, "TAKE THE LONG WAY HOME", 10, 1.05, 0, 0.45, 16.05, {
			bg: "#111b2c",
			fg: "#f1c6a0",
			w: 1024,
			h: 128,
			size: 61,
			border: false,
		}).rotation.x = -Math.PI / 2;
		const stars = new T.BufferGeometry(),
			positions = [];
		for (let i = 0; i < 150; i++) {
			const a = i * 2.399;
			positions.push(
				Math.sin(a) * 70,
				10 + (i % 11) * 2,
				-35 - Math.cos(a) * 18,
			);
		}
		stars.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
		this.scene.add(
			new T.Points(
				stars,
				new T.PointsMaterial({
					color: C.cream,
					size: 0.09,
					transparent: true,
					opacity: 0.5,
				}),
			),
		);
	}
	resize() {
		const w = innerWidth,
			h = innerHeight;
		this.renderer.setSize(w, h);
		this.aspect = w / h;
		this.updateCamera(1);
	}
	updateCamera(dt) {
		const title = this.mode === "title";
		const tx = title && this.aspect > 1.35 ? -10 : 0;
		this.cameraX += (tx - this.cameraX) * Math.min(1, dt * 4);
		const half = this.aspect < 1.35 ? 23 / this.aspect : title ? 18.8 : 17.5;
		this.camera.left = -half * this.aspect;
		this.camera.right = half * this.aspect;
		this.camera.top = half;
		this.camera.bottom = -half;
		this.camera.updateProjectionMatrix();
		const angle = this.cameraStyle === "overhead" ? 0.08 : 0.55;
		const shake = this.reduced ? 0 : this.shake;
		this.camera.position.set(
			this.cameraX + Math.sin(this.time * 53) * shake,
			48,
			48 * angle,
		);
		this.camera.lookAt(this.cameraX, 0, 0);
		this.shake = Math.max(0, this.shake - dt * 1.8);
	}
	syncStage(game) {
		if (this.stageKey === game.world) return;
		this.stageKey = game.world;
		this.dynamic.clear();
		this.cars.clear();
		this.debrisMeshes.clear();
		for (const a of [...game.players, ...game.rivals]) {
			const key = a.enemy ? "r" + a.id : "p" + a.id;
			const v = carVisual(
				a.enemy
					? a.id === 12
						? C.lilac
						: C.coral
					: a.id === 0
						? (this.playerColor ?? C.mint)
						: C.gold,
				a.enemy ? a.id + 1 : a.id === 0 ? (this.playerNumber ?? 1) : 2,
				a.enemy,
			);
			this.dynamic.add(v.root);
			this.cars.set(key, v);
		}
		const count = game.tokens.length;
		this.tokenMesh = new T.InstancedMesh(
			new T.CylinderGeometry(0.245, 0.245, 0.12, 8),
			toon(C.gold),
			count,
		);
		this.tokenInk = new T.InstancedMesh(
			new T.CylinderGeometry(0.31, 0.31, 0.11, 8),
			toon(C.ink),
			count,
		);
		this.dynamic.add(this.tokenMesh, this.tokenInk);
		this.dummy = new T.Object3D();
		this.cellMeshes = [];
		game.tokens.forEach((t) => {
			if (t.type === "cell") {
				const group = new T.Group();
				group.name = "cell" + t.id;
				group.position.set(t.x, 0.75, t.z);
				mesh(
					group,
					new T.OctahedronGeometry(0.48),
					toon(C.mint),
					0,
					0,
					0,
					true,
				);
				const ring = mesh(
					group,
					new T.TorusGeometry(0.7, 0.025, 5, 24),
					flat(C.mint),
					0,
					-0.35,
					0,
				);
				ring.rotation.x = Math.PI / 2;
				this.dynamic.add(group);
				const mixer = new T.AnimationMixer(group);
				mixer
					.clipAction(
						new T.AnimationClip("power-cell", 2, [
							new T.NumberKeyframeTrack(
								".rotation[y]",
								[0, 2],
								[0, Math.PI * 2],
							),
							new T.NumberKeyframeTrack(
								".position[y]",
								[0, 1, 2],
								[0.75, 0.9, 0.75],
							),
						]),
					)
					.play();
				this.cellMeshes.push({ t, group, mixer });
			}
		});
	}
	setGhost(id, data) {
		if (!this.ghosts.has(id)) {
			const v = carVisual(
				Number.parseInt((data.color || "#b2a0ed").slice(1), 16),
				(data.seat ?? 0) + 1,
				false,
			);
			v.root.traverse((o) => {
				if (o.isMesh) {
					o.material = o.material.clone();
					o.material.transparent = true;
					o.material.opacity = 0.35;
					o.material.depthWrite = false;
				}
			});
			v.marker.visible = false;
			const label = sign(
				v.root,
				(data.name || "RIVAL").slice(0, 18),
				2,
				0.42,
				0,
				1.5,
				0,
				{
					bg: "#263349",
					fg: data.color || "#b2a0ed",
					w: 512,
					h: 128,
					size: 64,
					border: false,
				},
			);
			label.rotation.x = -0.7;
			this.scene.add(v.root);
			this.ghosts.set(id, { ...v, data });
		}
		this.ghosts.get(id).data = data;
	}
	clearGhosts() {
		for (const v of this.ghosts.values()) this.scene.remove(v.root);
		this.ghosts.clear();
	}
	burst(x, z, hex = C.gold, count = 13) {
		for (let i = 0; i < count; i++) {
			const geo =
				i % 3 === 0 ? new T.OctahedronGeometry(0.12) : box(0.08, 0.08, 0.24);
			const m = mesh(this.effects, geo, flat(hex), x, 0.6, z);
			const angle = i * 2.399;
			this.particles.push({
				m,
				vx: Math.cos(angle) * (1 + (i % 3)),
				vy: 2 + (i % 4),
				vz: Math.sin(angle) * (1 + (i % 3)),
				life: 0.5 + (i % 3) * 0.08,
				max: 0.8,
			});
		}
	}
	event(ev) {
		if (ev.type === "token") {
			if (ev.token.id % 3 === 0) this.burst(ev.token.x, ev.token.z, C.gold, 5);
		}
		if (ev.type === "cell") this.burst(ev.token.x, ev.token.z, C.mint, 24);
		if (["crash", "deflect"].includes(ev.type)) {
			this.shake = 0.42;
			this.burst(
				ev.actor.x,
				ev.actor.z,
				ev.type === "crash" ? C.coral : C.mint,
				32,
			);
		}
		if (ev.type === "switch") this.burst(ev.actor.x, ev.actor.z, C.mint, 5);
		if (ev.type === "near") this.burst(ev.actor.x, ev.actor.z, C.cream, 12);
		if (ev.type === "clear") {
			for (let i = 0; i < 8; i++)
				this.burst(-15 + i * 4, 0, LEVELS[ev.stage % 3].color, 12);
		}
	}
	update(game, dt, paused = false) {
		this.time += dt;
		this.updateCamera(dt);
		if (game.world) {
			this.syncStage(game);
			const t = this.time;
			game.tokens.forEach((tok, i) => {
				const d = this.dummy;
				d.position.set(tok.x, 0.3 + Math.sin(t * 3 + i * 0.5) * 0.035, tok.z);
				d.rotation.set(0, t * 0.5, 0);
				d.scale.setScalar(tok.taken || tok.type === "cell" ? 0 : 1);
				d.updateMatrix();
				this.tokenMesh.setMatrixAt(i, d.matrix);
				d.position.y -= 0.08;
				d.updateMatrix();
				this.tokenInk.setMatrixAt(i, d.matrix);
			});
			this.tokenMesh.instanceMatrix.needsUpdate = true;
			this.tokenInk.instanceMatrix.needsUpdate = true;
			for (const c of this.cellMeshes) {
				c.group.visible = !c.t.taken;
				c.mixer.update(dt);
			}
			for (const a of [...game.players, ...game.rivals]) {
				const v = this.cars.get(a.enemy ? "r" + a.id : "p" + a.id);
				if (!v) continue;
				v.root.position.set(a.x, 0.43, a.z);
				v.root.rotation.y =
					a.yaw + (a.spin > 0 && !this.reduced ? a.spin * 14 : 0);
				v.body.rotation.z +=
					((a.switchLeft > 0 ? (a.fromLane - a.lane) * 0.14 : 0) -
						v.body.rotation.z) *
					0.15;
				v.root.visible =
					a.invuln <= 0 ||
					Math.floor(this.time * 12) % 3 !== 0 ||
					game.phase !== "playing";
				v.mixer.timeScale = a.speed / 11;
				v.mixer.update(paused ? 0 : dt);
				v.shield.visible = a.shield > 0;
				v.shield.rotation.y = t * 0.6;
				v.trail.visible = !!a.boosting && !paused;
				v.trail.scale.setScalar(0.8 + Math.sin(t * 56) * 0.2);
				v.marker.position.y = 1.35 + Math.sin(t * 3) * 0.09;
				if (a.enemy) {
					const sa = v.root.getObjectByName("sirenA"),
						sb = v.root.getObjectByName("sirenB");
					if (sa) sa.scale.y = Math.sin(t * 12) > 0 ? 1 : 0.35;
					if (sb) sb.scale.y = Math.sin(t * 12) > 0 ? 0.35 : 1;
				}
			}
			const live = new Set();
			for (const d of game.debris) {
				live.add(d.id);
				let m = this.debrisMeshes.get(d.id);
				if (!m) {
					m = mesh(
						this.dynamic,
						box(0.24, 0.24, 0.44),
						toon([C.coral, C.cream, C.gold][d.color]),
						0,
						0,
						0,
						true,
					);
					this.debrisMeshes.set(d.id, m);
				}
				const p = d.body.translation(),
					q = d.body.rotation();
				m.position.set(p.x, p.y, p.z);
				m.quaternion.set(q.x, q.y, q.z, q.w);
				m.scale.setScalar(Math.min(1, d.life * 2));
			}
			for (const [id, m] of this.debrisMeshes) {
				if (!live.has(id)) {
					this.dynamic.remove(m);
					this.debrisMeshes.delete(id);
				}
			}
		}
		for (const ghost of this.ghosts.values()) {
			const d = ghost.data;
			ghost.root.visible = d.stage === game.stage && this.mode !== "title";
			const p = trackPoint(d.u, d.lane);
			ghost.root.position.lerp(new T.Vector3(p.x, 0.46, p.z), 0.3);
			ghost.root.rotation.y = p.yaw;
			ghost.mixer.update(dt);
		}
		for (let i = this.particles.length - 1; i >= 0; i--) {
			const p = this.particles[i];
			p.life -= dt;
			p.vy -= dt * 7;
			p.m.position.x += p.vx * dt;
			p.m.position.y += p.vy * dt;
			p.m.position.z += p.vz * dt;
			p.m.rotation.x += dt * 7;
			p.m.rotation.z += dt * 4;
			p.m.scale.setScalar(Math.max(0, p.life / p.max));
			if (p.life <= 0) {
				this.effects.remove(p.m);
				p.m.geometry.dispose();
				p.m.material.dispose();
				this.particles.splice(i, 1);
			}
		}
	}
	pickLane(x, y) {
		const ray = new T.Raycaster();
		ray.setFromCamera(
			new T.Vector2((x / innerWidth) * 2 - 1, 1 - (y / innerHeight) * 2),
			this.camera,
		);
		const p = ray.ray.intersectPlane(
			new T.Plane(new T.Vector3(0, 1, 0), 0),
			new T.Vector3(),
		);
		if (!p) return 0;
		let best = Infinity,
			lane = 0;
		for (let l = 0; l < 4; l++)
			for (let j = 0; j < 160; j++) {
				const q = trackPoint(j / 160, l),
					d = (q.x - p.x) ** 2 + (q.z - p.z) ** 2;
				if (d < best) {
					best = d;
					lane = l;
				}
			}
		this.burst(p.x, p.z, C.mint, 6);
		return lane;
	}
	render() {
		this.renderer.render(this.scene, this.camera);
		this.renderCount++;
	}
}
