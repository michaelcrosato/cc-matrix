import * as THREE from "three";

export function createArt() {
	const C = {
		ink: 0x183a46,
		cream: 0xffefc3,
		sand: 0xf1c887,
		coral: 0xf57966,
		pink: 0xffad91,
		teal: 0x2c9e9d,
		aqua: 0x70cbbb,
		blue: 0x27788e,
		navy: 0x264755,
		yellow: 0xffca58,
		white: 0xfff7dd,
		purple: 0x79628c,
	};
	const scene = new THREE.Scene();
	scene.background = new THREE.Color(0xf7b595);
	scene.fog = new THREE.Fog(0xf7b595, 65, 185);
	const camera = new THREE.PerspectiveCamera(
		43,
		innerWidth / innerHeight,
		0.1,
		240,
	);
	camera.position.set(23, 17, 31);
	camera.lookAt(0, 2, 0);
	const hemi = new THREE.HemisphereLight(0xffeac6, 0x3f686c, 1.65);
	scene.add(hemi);
	const sunLight = new THREE.DirectionalLight(0xffd1a3, 2.1);
	sunLight.position.set(-25, 40, 25);
	sunLight.castShadow = true;
	sunLight.shadow.mapSize.set(2048, 2048);
	Object.assign(sunLight.shadow.camera, {
		left: -38,
		right: 38,
		top: 32,
		bottom: -32,
		near: 1,
		far: 120,
	});
	sunLight.shadow.bias = -0.001;
	scene.add(sunLight);
	const mats = new Map();
	function mat(color, roughness = 1) {
		const k = color + ":" + roughness;
		if (!mats.has(k))
			mats.set(
				k,
				new THREE.MeshStandardMaterial({
					color,
					roughness,
					metalness: 0,
					flatShading: true,
				}),
			);
		return mats.get(k);
	}
	const ink = new THREE.MeshBasicMaterial({
		color: C.ink,
		side: THREE.BackSide,
	});
	function mesh(g, color, parent, x = 0, y = 0, z = 0, outline = true) {
		const m = new THREE.Mesh(g, typeof color === "number" ? mat(color) : color);
		m.position.set(x, y, z);
		m.castShadow = true;
		m.receiveShadow = true;
		if (outline) {
			const o = new THREE.Mesh(g, ink);
			o.scale.setScalar(1.025);
			m.add(o);
		}
		parent.add(m);
		return m;
	}
	function box(p, x, y, z, w, h, d, c, o = true) {
		return mesh(new THREE.BoxGeometry(w, h, d), c, p, x, y, z, o);
	}
	function cyl(p, x, y, z, r, h, c, seg = 8, rt = r) {
		return mesh(new THREE.CylinderGeometry(rt, r, h, seg), c, p, x, y, z);
	}
	function ball(p, x, y, z, r, c, seg = 8) {
		return mesh(
			new THREE.IcosahedronGeometry(r, seg > 8 ? 1 : 0),
			c,
			p,
			x,
			y,
			z,
		);
	}
	function rod(p, a, b, r, c) {
		const aa = new THREE.Vector3(...a),
			bb = new THREE.Vector3(...b);
		const v = bb.clone().sub(aa);
		const m = cyl(
			p,
			...aa.clone().add(bb).multiplyScalar(0.5).toArray(),
			r,
			v.length(),
			c,
			7,
		);
		m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize());
		return m;
	}
	function textPanel(p, text, x, y, z, w, h, bg = C.cream, fg = C.ink) {
		const cv = document.createElement("canvas");
		cv.width = 1024;
		cv.height = 256;
		const ct = cv.getContext("2d");
		ct.fillStyle = "#" + bg.toString(16).padStart(6, "0");
		ct.fillRect(0, 0, 1024, 256);
		ct.fillStyle = "#" + fg.toString(16).padStart(6, "0");
		ct.font = "900 108px Arial";
		ct.textAlign = "center";
		ct.textBaseline = "middle";
		ct.fillText(text, 512, 137, 960);
		const m = mesh(
			new THREE.PlaneGeometry(w, h),
			new THREE.MeshBasicMaterial({
				map: new THREE.CanvasTexture(cv),
				side: THREE.DoubleSide,
			}),
			p,
			x,
			y,
			z,
			false,
		);
		return m;
	}
	function palm(p, x, z, s = 1, lean = 0) {
		const g = new THREE.Group();
		g.position.set(x, 0, z);
		g.scale.setScalar(s);
		p.add(g);
		const top = [lean, 7, 0];
		rod(g, [0, 0, 0], top, 0.24, 0xa77856);
		for (let j = 0; j < 7; j++) {
			const a = (j * Math.PI * 2) / 7;
			const end = [
				lean + Math.cos(a) * 3.7,
				6.4 + (j % 2) * 0.55,
				Math.sin(a) * 3.7,
			];
			const middle = [lean + Math.cos(a) * 1.8, 8.2, Math.sin(a) * 1.8];
			rod(g, top, middle, 0.1, 0x2c7261);
			const sh = new THREE.Shape();
			sh.moveTo(0, 0);
			sh.quadraticCurveTo(1, 1.2, 4, 0);
			sh.quadraticCurveTo(1, -0.65, 0, 0);
			const leaf = mesh(
				new THREE.ShapeGeometry(sh, 6),
				0x3c8666,
				g,
				...top,
				false,
			);
			leaf.rotation.set(-Math.PI * 0.35, a, 0);
			leaf.scale.set(1, 0.8, 1);
			rod(g, middle, end, 0.1, 0x3c8666);
		}
		for (let j = 0; j < 3; j++)
			ball(g, lean + (j - 1) * 0.3, 6.8, 0.1, 0.22, 0x745244);
		return g;
	}
	function umbrella(p, x, z, color) {
		cyl(p, x, 1.4, z, 0.055, 2.8, C.cream);
		const con = mesh(new THREE.ConeGeometry(1.65, 0.6, 8), color, p, x, 2.9, z);
		for (let j = 0; j < 8; j++) {
			let a = (j * Math.PI) / 4;
			rod(
				p,
				[x, 3.2, z],
				[x + Math.cos(a) * 1.65, 2.6, z + Math.sin(a) * 1.65],
				0.025,
				C.ink,
			);
		}
		return con;
	}
	function person(p, x, y, z, c, scale = 1) {
		const g = new THREE.Group();
		p.add(g);
		g.position.set(x, y, z);
		g.scale.setScalar(scale);
		cyl(g, 0, 0.9, 0, 0.21, 0.65, c);
		ball(g, 0, 1.45, 0, 0.22, 0xb47c56);
		rod(g, [-0.12, 0.6, 0], [-0.18, 0, 0.04], 0.075, C.ink);
		rod(g, [0.12, 0.6, 0], [0.2, 0, -0.04], 0.075, C.ink);
		rod(g, [-0.17, 1.1, 0], [-0.4, 0.65, 0], 0.065, 0xb47c56);
		rod(g, [0.17, 1.1, 0], [0.45, 1.5, 0], 0.065, 0xb47c56);
		return g;
	}
	function pennant(p, x, y, z, color) {
		rod(p, [x, y - 3, z], [x, y + 0.9, z], 0.045, C.ink);
		const sh = new THREE.Shape();
		sh.moveTo(0, 0);
		sh.lineTo(1.65, -0.35);
		sh.lineTo(0, -0.85);
		sh.closePath();
		const m = mesh(
			new THREE.ShapeGeometry(sh),
			new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }),
			p,
			x,
			y + 0.8,
			z,
			false,
		);
		return m;
	}
	const coast = new THREE.Group();
	scene.add(coast);
	box(coast, 0, -0.65, 5, 180, 1, 105, C.sand, false);
	box(coast, 0, -0.8, -74, 230, 0.8, 93, C.teal, false);
	for (let j = 0; j < 12; j++)
		box(
			coast,
			0,
			-0.31,
			-29 - j * 4.9,
			190,
			0.035,
			0.3 + j * 0.04,
			j % 2 ? C.aqua : 0x50b5ab,
			false,
		);
	// Graphic sunset and headland silhouettes.
	const sun = mesh(
		new THREE.CircleGeometry(10, 64),
		new THREE.MeshBasicMaterial({ color: 0xffd37f }),
		coast,
		-31,
		27,
		-95,
		false,
	);
	for (let i = 0; i < 5; i++)
		box(
			coast,
			-31,
			21.5 + i * 1.6,
			-94.95,
			21,
			0.25 + i * 0.04,
			0.01,
			0xf7b595,
			false,
		);
	const mountainMat = new THREE.MeshBasicMaterial({ color: 0x8d8f86 });
	for (let i = 0; i < 13; i++) {
		const m = mesh(
			new THREE.ConeGeometry(11 + 3 * (i % 3), 14 + (i % 4) * 4, 4),
			mountainMat,
			coast,
			45 + i * 9,
			3,
			-89,
			false,
		);
		m.rotation.y = Math.PI / 4;
	}
	// Water's edge, promenade, and distant pier.
	for (let j = 0; j < 4; j++)
		box(coast, 0, -0.18, -24 - j * 0.9, 170, 0.025, 0.35, 0xffe8bc, false);
	box(coast, -27, 0.4, -22, 5, 0.6, 34, 0xb98362);
	for (let j = 0; j < 9; j++)
		box(coast, -27, 0.73, -7 - j * 3.6, 5, 0.035, 0.08, C.cream, false);
	for (let i = 0; i < 12; i++) {
		let z = -6 - i * 2.8;
		rod(coast, [-29.4, -1.3, z], [-29.4, 1.9, z], 0.09, C.ink);
		rod(coast, [-24.6, -1.3, z], [-24.6, 1.9, z], 0.09, C.ink);
	}
	rod(coast, [-29.4, 1.6, -6], [-29.4, 1.6, -37], 0.07, C.cream);
	rod(coast, [-24.6, 1.6, -6], [-24.6, 1.6, -37], 0.07, C.cream);
	for (let i = 0; i < 7; i++) {
		let x = -40 + i * 12;
		umbrella(coast, x, -17 - (i % 2) * 2, [C.coral, C.yellow, C.aqua][i % 3]);
		box(
			coast,
			x + 0.6,
			0.05,
			-15.5 - (i % 2) * 2,
			1.7,
			0.08,
			3,
			[C.coral, C.teal][i % 2],
		);
	}
	for (let i = 0; i < 15; i++)
		palm(
			coast,
			-52 + i * 8,
			-11 - (i % 3) * 1.6,
			0.75 + (i % 3) * 0.12,
			Math.sin(i) * 1.2,
		);
	const shops = new THREE.Group();
	coast.add(shops);
	const labels = [
		"RAD RADIO",
		"SALT & VINE",
		"COAST CLUB",
		"SUNDAZE",
		"BOARD MEETING",
	];
	for (let i = 0; i < 5; i++) {
		let x = -31 + i * 14;
		const co = [C.coral, C.teal, C.yellow, C.purple, C.blue][i];
		box(shops, x, 2.2, -12, 9, 4.4, 5, co);
		box(shops, x, 4.6, -12, 9.6, 0.45, 5.6, C.cream);
		box(shops, x, 1.9, -9.45, 7.5, 2.2, 0.08, C.ink);
		for (let j = 0; j < 5; j++)
			box(
				shops,
				x - 3.2 + j * 1.6,
				3.25,
				-8.65,
				1.6,
				0.2,
				1.6,
				j % 2 ? C.cream : co,
			);
		textPanel(shops, labels[i], x, 4.02, -9.41, 8, 0.65, C.cream, C.ink);
	}
	// Beach festival bunting.
	rod(coast, [-22, 5.9, -5], [22, 5.9, -5], 0.025, C.ink);
	for (let i = 0; i < 24; i++) {
		let x = -22 + i * 1.9,
			y = 5.9 - Math.sin((i / 23) * Math.PI) * 0.7;
		const sh = new THREE.Shape();
		sh.moveTo(0, 0);
		sh.lineTo(0.9, 0);
		sh.lineTo(0.45, -0.85);
		const m = mesh(
			new THREE.ShapeGeometry(sh),
			new THREE.MeshBasicMaterial({
				color: [C.coral, C.yellow, C.teal][i % 3],
				side: THREE.DoubleSide,
			}),
			coast,
			x,
			y,
			-5,
			false,
		);
	}
	const gulls = [];
	for (let i = 0; i < 9; i++) {
		const g = new THREE.Group();
		coast.add(g);
		g.position.set(-35 + i * 9, 14 + (i % 3) * 3, -47 - i * 2);
		rod(g, [-0.65, 0.1, 0], [0, 0, 0], 0.035, C.cream);
		rod(g, [0, 0, 0], [0.65, 0.1, 0], 0.035, C.cream);
		gulls.push(g);
	}
	// Decorative festival posters along the forecourt.
	for (const [x, c, t] of [
		[-19, C.teal, "CALI / 88"],
		[19, C.coral, "STAY RAD"],
	]) {
		box(coast, x, 1.7, 3, 0.18, 3.4, 0.18, C.ink);
		box(coast, x + 2.4, 1.7, 3, 0.18, 3.4, 0.18, C.ink);
		textPanel(coast, t, x + 1.2, 2.7, 3.1, 3, 1.05, c, C.cream);
	}
	const arenas = {
		skate: new THREE.Group(),
		surf: new THREE.Group(),
		bmx: new THREE.Group(),
	};
	Object.values(arenas).forEach((g) => scene.add(g));
	const half = arenas.skate;
	const pipeHeight = (x) => 4 * Math.pow(Math.max(0, Math.abs(x) - 4) / 8, 2);
	function stripSurface(parent, fn, x0, x1, z0, z1, color, n = 72) {
		const pos = [],
			norm = [],
			uv = [],
			idx = [];
		for (let i = 0; i <= n; i++) {
			const x = x0 + ((x1 - x0) * i) / n,
				y = fn(x);
			for (let j = 0; j < 2; j++) {
				pos.push(x, y, j ? z1 : z0);
				uv.push(i / n, j);
			}
		}
		for (let i = 0; i < n; i++) {
			const a = i * 2;
			idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
		}
		const g = new THREE.BufferGeometry();
		g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
		g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
		g.setIndex(idx);
		g.computeVertexNormals();
		return mesh(g, color, parent, 0, 0, 0, false);
	}
	stripSurface(half, pipeHeight, -12, 12, -4.5, 4.5, 0xe8b37b);
	for (let i = 0; i < 6; i++)
		stripSurface(
			half,
			(x) => pipeHeight(x) + 0.016,
			-12,
			12,
			-4.5 + i * 1.8,
			-4.47 + i * 1.8,
			0xa87858,
		);
	for (let i = 0; i < 25; i++) {
		let x = -12 + i;
		const y = pipeHeight(x);
		rod(half, [x, y + 0.02, -4.5], [x, y + 0.02, 4.5], 0.015, 0xc18f67);
	}
	// Pipe fascia and structural ribs.
	for (let z of [-4.53, 4.53]) {
		const sh = new THREE.Shape();
		sh.moveTo(-12, -0.4);
		for (let i = 0; i <= 48; i++) {
			let x = -12 + i * 0.5;
			sh.lineTo(x, pipeHeight(x));
		}
		sh.lineTo(12, -0.4);
		sh.closePath();
		const f = mesh(new THREE.ShapeGeometry(sh), C.teal, half, 0, 0, z, false);
		f.material = new THREE.MeshStandardMaterial({
			color: C.teal,
			side: THREE.DoubleSide,
			roughness: 1,
		});
		for (let x of [-11, -9, -7, 7, 9, 11])
			box(
				half,
				x,
				pipeHeight(x) / 2 - 0.2,
				z,
				0.12,
				pipeHeight(x) + 0.4,
				0.12,
				C.ink,
			);
	}
	for (let side of [-1, 1]) {
		rod(half, [side * 12, 4.07, -4.7], [side * 12, 4.07, 4.7], 0.1, C.ink);
		box(half, side * 13, 3.87, 0, 2, 0.3, 9.7, C.teal);
		for (let j = 0; j < 4; j++)
			rod(
				half,
				[side * 13.9, 4, j * 2.9 - 4.3],
				[side * 13.9, 5.1, j * 2.9 - 4.3],
				0.065,
				C.cream,
			);
		rod(
			half,
			[side * 13.9, 5.1, -4.3],
			[side * 13.9, 5.1, 4.4],
			0.065,
			C.cream,
		);
		pennant(half, side * 14, 7, -4, C.coral);
	}
	textPanel(
		half,
		"DROP IN. FREAK OUT.",
		0,
		-0.08,
		4.6,
		9,
		0.75,
		C.teal,
		C.cream,
	);
	// Spectators on low bleachers.
	for (let row = 0; row < 2; row++) {
		box(half, 0, 0.35 + row * 0.7, -6.4 - row * 0.9, 22, 0.3, 0.8, C.cream);
		for (let i = 0; i < 14; i++)
			person(
				half,
				-10 + i * 1.5,
				0.55 + row * 0.7,
				-6.4 - row * 0.9,
				[C.coral, C.teal, C.yellow, C.purple][(i + row) % 4],
				0.8,
			);
	}
	// Surf water bowl: concentric face strips make a graphic wave.
	const surf = arenas.surf;
	box(surf, 0, -0.18, 0, 48, 0.3, 32, C.teal, false);
	const waveHeight = (z) => Math.max(0, -z) * 0.45;
	for (let j = 0; j < 26; j++) {
		const z = -12 + j * 0.75;
		const h = waveHeight(z);
		box(
			surf,
			0,
			h * 0.4 - 0.2,
			z,
			48,
			0.17,
			0.85,
			[0x237c89, 0x29989d, 0x38aba8, 0x61c3b4][Math.floor(j / 7) % 4],
			false,
		);
	}
	for (let j = 0; j < 9; j++) {
		let z = -6 + j * 1.1;
		box(surf, 0, 0.06, z, 47, 0.035, 0.07, 0x9fddc6, false);
	}
	const crest = new THREE.Group();
	surf.add(crest);
	for (let i = 0; i < 35; i++) {
		let x = -23 + i * 1.4;
		ball(crest, x, 2.3 + Math.sin(i * 0.6) * 0.18, -9, 0.7, 0xe3eed2);
		ball(crest, x + 0.3, 1.8, -8.6, 0.55, C.aqua);
	}
	for (let x of [-17, 17]) {
		cyl(surf, x, 0.4, 1, 0.28, 0.8, C.coral);
		ball(surf, x, 0.85, 1, 0.35, C.yellow);
		pennant(surf, x, 3.3, 1, C.cream);
	}
	// Far-side surf judges' hut.
	box(surf, -21, 1.1, 10, 5, 2.2, 3, C.cream);
	box(surf, -21, 2.5, 10, 6, 0.5, 4, C.coral);
	textPanel(surf, "WAVE GOODBYE", -21, 1.8, 11.53, 4.5, 0.65, C.cream, C.ink);
	// BMX dirt course and sculpted launch rollers.
	const bmx = arenas.bmx;
	box(bmx, 0, -0.1, 0, 49, 0.2, 9, 0xcd9b6d, false);
	const rampSpecs = [
		[-9, 3, 3],
		[3, 3, 3],
		[15, 3, 3],
	];
	function rampHeight(x) {
		let h = 0;
		for (const [cx, w, hh] of rampSpecs) {
			if (x >= cx - w && x <= cx) h = Math.max(h, ((x - (cx - w)) / w) * hh);
		}
		return h;
	}
	stripSurface(bmx, rampHeight, -22, 22, -3.5, 3.5, 0xe4b078, 176);
	for (let z of [-3.52, 3.52]) {
		for (const [cx, w, hh] of rampSpecs) {
			const sh = new THREE.Shape();
			sh.moveTo(cx - w, 0);
			sh.lineTo(cx, hh);
			sh.lineTo(cx, 0);
			const s = mesh(new THREE.ShapeGeometry(sh), C.coral, bmx, 0, 0, z, false);
			s.material = new THREE.MeshStandardMaterial({
				color: C.coral,
				roughness: 1,
				side: THREE.DoubleSide,
			});
		}
	}
	for (let x = -21; x < 23; x += 3) {
		box(bmx, x, 0.025, 0, 1.3, 0.03, 0.13, C.cream, false);
		for (let z of [-4.4, 4.4]) {
			cyl(bmx, x, 0.35, z, 0.1, 0.7, C.cream);
			rod(bmx, [x, 0.65, z], [x + 3, 0.65, z], 0.04, C.teal);
		}
	}
	for (let x of [-18, 18]) {
		rod(bmx, [x, 0, -4.3], [x, 5, -4.3], 0.1, C.ink);
		rod(bmx, [x, 0, 4.3], [x, 5, 4.3], 0.1, C.ink);
		box(bmx, x, 4.8, 0, 0.25, 0.8, 9, C.teal);
		const sign = textPanel(
			bmx,
			x < 0 ? "PEDAL TO THE METAL" : "RAD TO THE BONE",
			x,
			4.8,
			0,
			8,
			0.65,
			C.teal,
			C.cream,
		);
		sign.rotation.y = Math.PI / 2;
	}
	for (let i = 0; i < 18; i++)
		person(
			bmx,
			-19 + i * 2.2,
			0,
			-5.7,
			[C.yellow, C.coral, C.teal][i % 3],
			0.85,
		);
	// Cones coincide with the gameplay collision windows: read the jump before the crunch.
	for (const x of [-4.6, 7.4]) {
		box(bmx, x, 0.065, 0, 0.95, 0.13, 0.95, C.ink);
		mesh(new THREE.ConeGeometry(0.43, 1.06, 10), 0xff762f, bmx, x, 0.64, 0);
		cyl(bmx, x, 0.71, 0, 0.235, 0.15, C.cream, 10, 0.175);
		box(bmx, x - 1.6, 0.012, 0, 0.12, 0.025, 2, C.yellow, false);
	}
	textPanel(
		bmx,
		"DIRT / STYLE / GLORY",
		0,
		0.62,
		4.6,
		10,
		1.1,
		C.coral,
		C.cream,
	);
	// Articulated athlete; animation tracks target named joints.
	const athlete = new THREE.Group();
	scene.add(athlete);
	const rig = new THREE.Group();
	rig.name = "rider";
	athlete.add(rig);
	const torso = new THREE.Group();
	torso.name = "torso";
	torso.position.y = 1.15;
	rig.add(torso);
	box(torso, 0, 0.23, 0, 0.65, 0.7, 0.38, C.cream);
	box(torso, 0, 0.22, 0.202, 0.66, 0.14, 0.025, C.coral);
	box(torso, 0, -0.18, 0, 0.62, 0.26, 0.4, C.teal);
	cyl(torso, 0, 0.66, 0, 0.13, 0.18, 0xc5835a);
	ball(torso, 0, 0.94, 0, 0.29, 0xc5835a);
	const cap = mesh(
		new THREE.SphereGeometry(0.3, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.55),
		C.coral,
		torso,
		0,
		1.02,
		0,
	);
	box(torso, 0.1, 1.07, 0.26, 0.48, 0.06, 0.32, C.coral);
	box(torso, 0, 0.99, 0.263, 0.37, 0.1, 0.04, C.ink);
	box(torso, 0.11, 0.99, 0.288, 0.1, 0.07, 0.03, C.cream);
	const joints = {};
	for (let side of [-1, 1]) {
		let label = side < 0 ? "L" : "R";
		const arm = new THREE.Group();
		arm.name = "arm" + label;
		arm.position.set(side * 0.4, 0.43, 0);
		torso.add(arm);
		rod(arm, [0, 0, 0], [side * 0.42, -0.35, 0], 0.1, C.cream);
		rod(
			arm,
			[side * 0.42, -0.35, 0],
			[side * 0.65, -0.65, 0.12],
			0.075,
			0xc5835a,
		);
		ball(arm, side * 0.65, -0.65, 0.12, 0.105, 0xc5835a);
		joints["arm" + label] = arm;
		const leg = new THREE.Group();
		leg.name = "leg" + label;
		leg.position.set(side * 0.2, 0.9, 0);
		rig.add(leg);
		rod(leg, [0, 0, 0], [side * 0.12, -0.4, 0], 0.13, C.teal);
		rod(
			leg,
			[side * 0.12, -0.4, 0],
			[side * 0.24, -0.74, 0.02],
			0.09,
			0xc5835a,
		);
		cyl(leg, side * 0.24, -0.66, 0.02, 0.095, 0.2, C.cream);
		box(leg, side * 0.25, -0.79, 0.09, 0.38, 0.17, 0.31, C.coral);
		joints["leg" + label] = leg;
	}
	const equipment = new THREE.Group();
	equipment.name = "equipment";
	athlete.add(equipment);
	function boardShape(l, w) {
		const s = new THREE.Shape();
		s.moveTo(-l / 2 + w / 2, -w / 2);
		s.lineTo(l / 2 - w / 2, -w / 2);
		s.quadraticCurveTo(l / 2, -w / 2, l / 2, 0);
		s.quadraticCurveTo(l / 2, w / 2, l / 2 - w / 2, w / 2);
		s.lineTo(-l / 2 + w / 2, w / 2);
		s.quadraticCurveTo(-l / 2, w / 2, -l / 2, 0);
		s.quadraticCurveTo(-l / 2, -w / 2, -l / 2 + w / 2, -w / 2);
		return new THREE.ExtrudeGeometry(s, {
			depth: 0.08,
			bevelEnabled: true,
			bevelSegments: 1,
			steps: 1,
			bevelSize: 0.03,
			bevelThickness: 0.03,
		});
	}
	const skateBoard = new THREE.Group();
	equipment.add(skateBoard);
	const deck = mesh(boardShape(1.65, 0.48), C.coral, skateBoard, 0, 0.15, 0);
	deck.rotation.x = -Math.PI / 2;
	box(skateBoard, 0, 0.205, 0, 1, 0.02, 0.25, C.ink);
	for (let x of [-0.53, 0.53]) {
		rod(skateBoard, [x, 0.08, -0.32], [x, 0.08, 0.32], 0.045, C.cream);
		for (let z of [-0.3, 0.3]) {
			const w = cyl(skateBoard, x, 0.08, z, 0.115, 0.12, C.yellow, 10);
			w.rotation.x = Math.PI / 2;
		}
	}
	const surfBoard = new THREE.Group();
	equipment.add(surfBoard);
	const sd = mesh(boardShape(3.1, 0.75), C.yellow, surfBoard, 0, 0.05, 0);
	sd.rotation.x = -Math.PI / 2;
	box(surfBoard, 0, 0.12, 0, 2.5, 0.018, 0.1, C.coral);
	box(surfBoard, -0.9, -0.15, 0, 0.3, 0.4, 0.08, C.teal);
	const bike = new THREE.Group();
	equipment.add(bike);
	bike.position.y = 0.05;
	const wheels = [];
	for (let x of [-0.85, 0.85]) {
		const wheel = new THREE.Group();
		wheel.position.set(x, 0.4, 0);
		bike.add(wheel);
		const tire = mesh(
			new THREE.TorusGeometry(0.43, 0.075, 7, 16),
			C.ink,
			wheel,
			0,
			0,
			0,
			false,
		);
		const rim = mesh(
			new THREE.TorusGeometry(0.35, 0.025, 4, 16),
			C.cream,
			wheel,
			0,
			0,
			0,
			false,
		);
		for (let a = 0; a < Math.PI * 2; a += Math.PI / 4)
			rod(
				wheel,
				[0, 0, 0],
				[Math.cos(a) * 0.35, Math.sin(a) * 0.35, 0],
				0.013,
				C.cream,
			);
		wheels.push(wheel);
	}
	for (const [a, b] of [
		[
			[-0.85, 0.4, 0],
			[-0.27, 1, 0],
		],
		[
			[-0.85, 0.4, 0],
			[0, 0.42, 0],
		],
		[
			[-0.27, 1, 0],
			[0, 0.42, 0],
		],
		[
			[-0.27, 1, 0],
			[0.55, 1, 0],
		],
		[
			[0.55, 1, 0],
			[0, 0.42, 0],
		],
		[
			[0.55, 1, 0],
			[0.85, 0.4, 0],
		],
	])
		rod(bike, a, b, 0.048, C.coral);
	rod(bike, [-0.27, 1, 0], [-0.35, 1.22, 0], 0.04, C.ink);
	box(bike, -0.35, 1.24, 0, 0.42, 0.1, 0.24, C.ink);
	rod(bike, [0.55, 1, 0], [0.6, 1.47, 0], 0.045, C.cream);
	rod(bike, [0.6, 1.47, -0.33], [0.6, 1.47, 0.33], 0.04, C.ink);
	rod(bike, [0, 0.42, -0.2], [0, 0.42, 0.2], 0.035, C.cream);
	box(bike, 0.13, 0.42, 0.25, 0.25, 0.08, 0.17, C.ink);
	box(bike, -0.13, 0.42, -0.25, 0.25, 0.08, 0.17, C.ink);
	// Native mixer cycles are the base; root movement and trick rotation remain gameplay-owned.
	const mixer = new THREE.AnimationMixer(rig);
	function clip(name, span, tracks) {
		return new THREE.AnimationClip(
			name,
			span,
			tracks.map(
				([path, v]) =>
					new THREE.NumberKeyframeTrack(
						path,
						[0, span * 0.25, span * 0.5, span * 0.75, span],
						v,
					),
			),
		);
	}
	const rideClip = clip("coast-pump", 1.1, [
		["torso.position[y]", [1.15, 1.08, 1.02, 1.08, 1.15]],
		["armL.rotation[z]", [0.1, 0.3, 0.15, -0.1, 0.1]],
		["armR.rotation[z]", [-0.1, -0.3, -0.15, 0.1, -0.1]],
		["legL.rotation[z]", [-0.2, -0.27, -0.3, -0.27, -0.2]],
		["legR.rotation[z]", [0.2, 0.27, 0.3, 0.27, 0.2]],
	]);
	const airClip = clip("grab-and-tweak", 0.7, [
		["torso.position[y]", [0.96, 0.9, 0.94, 0.9, 0.96]],
		["armL.rotation[z]", [0.65, 0.8, 0.9, 0.8, 0.65]],
		["armR.rotation[z]", [-0.4, -0.6, -0.7, -0.6, -0.4]],
		["legL.rotation[z]", [-0.4, -0.5, -0.4, -0.3, -0.4]],
		["legR.rotation[z]", [0.35, 0.5, 0.4, 0.3, 0.35]],
	]);
	const bikeClip = clip("pedal-power", 0.65, [
		["torso.position[y]", [1.4, 1.43, 1.4, 1.43, 1.4]],
		["torso.rotation[z]", [-0.22, -0.25, -0.22, -0.25, -0.22]],
		["legL.position[y]", [1.2, 1.2, 1.2, 1.2, 1.2]],
		["legR.position[y]", [1.2, 1.2, 1.2, 1.2, 1.2]],
		["legL.rotation[z]", [0.45, 0, -0.45, 0, 0.45]],
		["legR.rotation[z]", [-0.45, 0, 0.45, 0, -0.45]],
		["armL.rotation[z]", [0.95, 0.98, 0.95, 0.92, 0.95]],
		["armR.rotation[z]", [-0.4, -0.43, -0.4, -0.37, -0.4]],
	]);
	const actions = {
		ride: mixer.clipAction(rideClip),
		air: mixer.clipAction(airClip),
		bike: mixer.clipAction(bikeClip),
	};
	actions.ride.play();
	actions.air.play();
	actions.bike.play();
	actions.air.setEffectiveWeight(0);
	actions.bike.setEffectiveWeight(0);
	const spray = new THREE.Group();
	scene.add(spray);
	const sprayBits = [];
	for (let i = 0; i < 28; i++) {
		const m = ball(spray, 0, -10, 0, 0.035 + (i % 3) * 0.023, C.cream);
		sprayBits.push(m);
	}
	const shadow = mesh(
		new THREE.CircleGeometry(0.8, 24),
		new THREE.MeshBasicMaterial({
			color: C.ink,
			transparent: true,
			opacity: 0.16,
			depthWrite: false,
		}),
		scene,
		0,
		0.023,
		0,
		false,
	);
	shadow.rotation.x = -Math.PI / 2;
	let active = "skate",
		elapsed = 0;
	function setEvent(id) {
		active = id;
		for (const [k, g] of Object.entries(arenas)) g.visible = k === id;
		skateBoard.visible = id === "skate";
		surfBoard.visible = id === "surf";
		bike.visible = id === "bmx";
	}
	function update(dt, state = {}) {
		elapsed += dt;
		const airborne = !!state.airborne;
		actions.ride.setEffectiveWeight(active !== "bmx" && !airborne ? 1 : 0);
		actions.air.setEffectiveWeight(airborne ? 1 : 0);
		actions.bike.setEffectiveWeight(active === "bmx" && !airborne ? 1 : 0);
		mixer.timeScale = Math.max(
			0.35,
			Math.min(2, Math.abs(state.speed || 5) / 9),
		);
		mixer.update(dt);
		for (let i = 0; i < gulls.length; i++) {
			gulls[i].position.x = -39 + i * 9 + Math.sin(elapsed * 0.13 + i) * 5;
			gulls[i].position.y =
				15 + (i % 3) * 3 + Math.sin(elapsed * 0.7 + i) * 0.45;
			gulls[i].rotation.z = Math.sin(elapsed * 1.1 + i) * 0.12;
		}
		for (let i = 0; i < wheels.length; i++)
			wheels[i].rotation.z -= dt * (state.speed || 0) * 1.8;
		shadow.position.set(athlete.position.x, 0.035, athlete.position.z);
		shadow.scale.setScalar(
			Math.max(0.3, 1 - (athlete.position.y || 0) * 0.055),
		);
		shadow.visible = active !== "surf";
		spray.visible = active === "surf" || airborne;
		for (let i = 0; i < sprayBits.length; i++) {
			const q = (elapsed * 1.8 + i / 28) % 1;
			const p = sprayBits[i];
			p.position.set(
				athlete.position.x -
					(state.speed < 0 ? -1 : 1) * q * (active === "surf" ? 3 : 1.8),
				athlete.position.y + 0.12 + Math.sin(q * Math.PI) * 0.65,
				athlete.position.z + Math.sin(i * 7.2) * q * 0.9,
			);
			p.scale.setScalar((1 - q) * (active === "surf" ? 1.3 : 0.7));
		}
		crest.position.x = Math.sin(elapsed * 0.7) * 0.25;
	}
	setEvent("skate");
	return {
		scene,
		camera,
		athlete,
		rig,
		mixer,
		update,
		setEvent,
		pipeHeight,
		rampHeight,
		arenas,
		palette: C,
	};
}
