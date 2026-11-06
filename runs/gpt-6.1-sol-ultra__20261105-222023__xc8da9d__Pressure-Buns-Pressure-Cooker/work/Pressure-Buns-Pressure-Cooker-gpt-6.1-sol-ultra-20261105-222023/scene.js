import * as THREE from "three/webgpu";

const C = {
	ink: "#202a36",
	cream: "#fff2cf",
	tile: "#f4dfb9",
	coral: "#ed665a",
	teal: "#51c5b4",
	mustard: "#f2ba48",
	peach: "#e9ac86",
	navy: "#263b4b",
	steel: "#b7d7d0",
	bun: "#e99b45",
	lettuce: "#79bb53",
	tomato: "#e95947",
	cheese: "#f8c844",
	onion: "#dbbce5",
	brown: "#694130",
	white: "#fff8e8",
};
const COLORS = [C.coral, C.teal, C.mustard];
const materialCache = new Map();
function mat(color, opts = {}) {
	const key = color + JSON.stringify(opts);
	if (!materialCache.has(key))
		materialCache.set(key, new THREE.MeshToonNodeMaterial({ color, ...opts }));
	return materialCache.get(key);
}
const ink = new THREE.MeshBasicNodeMaterial({
	color: C.ink,
	side: THREE.BackSide,
});
const geo = {
	box: new THREE.BoxGeometry(1, 1, 1),
	sphere: new THREE.SphereGeometry(1, 20, 14),
	cyl: new THREE.CylinderGeometry(1, 1, 1, 24),
	coin: new THREE.CylinderGeometry(1, 1, 1, 32),
};
function mesh(
	parent,
	geometry,
	color,
	pos = [0, 0, 0],
	scale = [1, 1, 1],
	outline = 0.035,
) {
	const obj = new THREE.Mesh(
		geometry,
		typeof color === "string" ? mat(color) : color,
	);
	obj.position.set(...pos);
	obj.scale.set(...scale);
	obj.castShadow = true;
	obj.receiveShadow = true;
	if (outline) {
		const edge = new THREE.Mesh(geometry, ink);
		edge.scale.setScalar(1 + outline);
		edge.castShadow = false;
		edge.receiveShadow = false;
		obj.add(edge);
	}
	parent.add(obj);
	return obj;
}
function box(parent, color, pos, scale, outline = 0.025) {
	return mesh(parent, geo.box, color, pos, scale, outline);
}
function sphere(parent, color, pos, scale, outline = 0.035) {
	return mesh(parent, geo.sphere, color, pos, scale, outline);
}
function cyl(parent, color, pos, scale, outline = 0.035) {
	return mesh(parent, geo.cyl, color, pos, scale, outline);
}
function group(parent, pos = [0, 0, 0]) {
	const o = new THREE.Group();
	o.position.set(...pos);
	parent.add(o);
	return o;
}
function label(
	parent,
	text,
	width,
	height,
	pos,
	{ bg = C.cream, fg = C.ink, size = 64, border = true, rotation = 0 } = {},
) {
	const cv = document.createElement("canvas");
	cv.width = 1024;
	cv.height = Math.round((1024 * height) / width);
	const ctx = cv.getContext("2d");
	ctx.fillStyle = bg;
	ctx.fillRect(0, 0, cv.width, cv.height);
	if (border) {
		ctx.strokeStyle = fg;
		ctx.lineWidth = 12;
		ctx.strokeRect(7, 7, cv.width - 14, cv.height - 14);
	}
	ctx.fillStyle = fg;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.font = `900 ${size * (cv.width / 1024)}px "Arial Black",Arial,sans-serif`;
	ctx.fillText(text, cv.width / 2, cv.height / 2 + 3, cv.width - 35);
	const tex = new THREE.CanvasTexture(cv);
	tex.colorSpace = THREE.SRGBColorSpace;
	const p = new THREE.Mesh(
		new THREE.PlaneGeometry(width, height),
		new THREE.MeshBasicNodeMaterial({ map: tex, transparent: false }),
	);
	p.position.set(...pos);
	p.rotation.y = rotation;
	parent.add(p);
	return p;
}
function pipe(parent, a, b, r = 0.09, color = C.ink) {
	const v1 = new THREE.Vector3(...a),
		v2 = new THREE.Vector3(...b),
		d = v2.clone().sub(v1);
	const p = cyl(
		parent,
		color,
		v1.clone().add(v2).multiplyScalar(0.5).toArray(),
		[r, d.length(), r],
		0.06,
	);
	p.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
	return p;
}
function food(type, bottom = false) {
	const g = new THREE.Group();
	if (type === "bun") {
		sphere(g, C.bun, [0, 0.08, 0], [0.59, 0.22, 0.59]);
		cyl(g, "#f6c071", [0, -0.025, 0], [0.59, 0.13, 0.59]);
		if (!bottom)
			for (let i = 0; i < 11; i++) {
				const a = i * 2.39996,
					r = 0.13 + 0.29 * ((i % 4) / 3),
					seed = sphere(
						g,
						C.cream,
						[Math.cos(a) * r, 0.22 - 0.08 * r, Math.sin(a) * r],
						[0.038, 0.013, 0.067],
						0,
					);
				seed.rotation.y = a;
			}
	} else if (type === "patty") {
		cyl(g, C.brown, [0, 0, 0], [0.56, 0.15, 0.56]);
		for (let i = 0; i < 4; i++)
			box(g, "#3e2b27", [-0.3 + i * 0.2, 0.081, 0], [0.045, 0.012, 0.72], 0);
	} else if (type === "cheese") {
		const p = box(g, C.cheese, [0, 0, 0], [1.03, 0.065, 1.03]);
		p.rotation.y = 0.22;
		const drip = box(g, C.cheese, [0.47, -0.07, 0.2], [0.11, 0.18, 0.25]);
		drip.rotation.z = -0.16;
	} else if (type === "tomato") {
		cyl(g, C.tomato, [0, 0, 0], [0.53, 0.12, 0.53]);
		for (let i = 0; i < 6; i++) {
			const a = (i * Math.PI) / 3;
			cyl(
				g,
				"#ffd194",
				[Math.cos(a) * 0.27, 0.065, Math.sin(a) * 0.27],
				[0.065, 0.012, 0.11],
				0,
			).rotation.y = -a;
		}
		cyl(g, "#f68b62", [0, 0.066, 0], [0.1, 0.012, 0.1], 0);
	} else if (type === "lettuce") {
		for (let i = 0; i < 8; i++) {
			const a = (i * Math.PI) / 4;
			sphere(
				g,
				i % 2 ? C.lettuce : "#a4d56b",
				[Math.cos(a) * 0.28, Math.sin(a * 2) * 0.026, Math.sin(a) * 0.28],
				[0.35, 0.065, 0.32],
			);
		}
		cyl(g, C.lettuce, [0, 0, 0], [0.52, 0.06, 0.52]);
	} else if (type === "onion") {
		const ring = new THREE.Mesh(
			new THREE.TorusGeometry(0.35, 0.09, 8, 24),
			mat(C.onion),
		);
		ring.rotation.x = -Math.PI / 2;
		g.add(ring);
		const outline = new THREE.Mesh(ring.geometry, ink);
		outline.scale.setScalar(1.06);
		ring.add(outline);
		const inner = new THREE.Mesh(
			new THREE.TorusGeometry(0.19, 0.055, 8, 24),
			mat("#f6e7f8"),
		);
		inner.rotation.x = -Math.PI / 2;
		inner.position.y = 0.025;
		g.add(inner);
	}
	return g;
}
function burgerModel(ingredients = [], ready = false, color = 0) {
	const g = new THREE.Group();
	const plate = cyl(g, C.cream, [0, -0.1, 0], [0.78, 0.07, 0.78]);
	const rim = new THREE.Mesh(
		new THREE.TorusGeometry(0.7, 0.026, 6, 30),
		mat(typeof color === "number" ? COLORS[color % 3] : color),
	);
	rim.rotation.x = Math.PI / 2;
	rim.position.y = -0.045;
	g.add(rim);
	const bun = food("bun", true);
	bun.position.y = 0.02;
	g.add(bun);
	const patty = food("patty");
	patty.position.y = 0.21;
	g.add(patty);
	ingredients.forEach((type, i) => {
		const f = food(type);
		f.position.y = 0.34 + i * 0.14;
		g.add(f);
	});
	if (ready) {
		const cap = food("bun");
		cap.position.y = 0.4 + ingredients.length * 0.14;
		g.add(cap);
	}
	const colorValue = typeof color === "number" ? COLORS[color % 3] : color;
	const slot = Math.max(
		0,
		COLORS.findIndex(
			(c) => c.toLowerCase() === String(colorValue).toLowerCase(),
		),
	);
	const tag = label(g, String(slot + 1), 0.72, 0.65, [0.9, 0.48, 0], {
		bg: colorValue,
		fg: C.ink,
		size: 690,
	});
	tag.material.depthTest = false;
	tag.material.depthWrite = false;
	tag.renderOrder = 30;
	g.userData.orderTag = tag;
	return g;
}
function chefModel(id) {
	const root = new THREE.Group(),
		body = group(root);
	body.name = "ChefBody";
	const skin = id === 1 ? "#ba7854" : "#efb58b",
		apron = id === 1 ? C.teal : C.coral;
	// Black shoes and little independently animated legs.
	const legs = [];
	for (let i = 0; i < 2; i++) {
		const leg = group(body, [i === 0 ? -0.23 : 0.23, 0.34, 0]);
		leg.name = i ? "RightLeg" : "LeftLeg";
		legs.push(leg);
		box(leg, C.navy, [0, -0.04, 0], [0.3, 0.5, 0.33]);
		sphere(leg, C.ink, [0, -0.23, 0.1], [0.22, 0.13, 0.31]);
	}
	const torso = group(body, [0, 0.88, 0]);
	torso.name = "ChefTorso";
	sphere(torso, C.white, [0, 0, 0], [0.6, 0.61, 0.42]);
	sphere(torso, apron, [0, -0.05, 0.29], [0.44, 0.49, 0.18]);
	box(torso, apron, [0, 0.38, 0.325], [0.4, 0.42, 0.1]);
	box(torso, C.cream, [0, -0.14, 0.466], [0.29, 0.2, 0.018], 0.02);
	for (let i = 0; i < 2; i++)
		sphere(
			torso,
			C.ink,
			[0.31, -0.01 + i * 0.2, 0.335],
			[0.035, 0.035, 0.02],
			0,
		);
	const arms = [];
	for (let i = 0; i < 2; i++) {
		const sign = i === 0 ? -1 : 1,
			arm = group(torso, [sign * 0.48, 0.18, 0.03]);
		arm.name = i ? "RightArm" : "LeftArm";
		arms.push(arm);
		sphere(arm, C.white, [sign * 0.08, -0.16, 0], [0.22, 0.32, 0.22]);
		sphere(arm, skin, [sign * 0.13, -0.39, 0.06], [0.19, 0.19, 0.18]);
	}
	const head = group(body, [0, 1.63, 0.04]);
	head.name = "ChefHead";
	sphere(head, skin, [0, 0, 0], [0.43, 0.43, 0.37]);
	sphere(head, skin, [0, -0.02, 0.37], [0.14, 0.11, 0.15]);
	for (let i = 0; i < 2; i++) {
		const x = i ? 0.15 : -0.15;
		sphere(head, C.ink, [x, 0.08, 0.335], [0.042, 0.061, 0.025], 0);
		box(head, C.ink, [x, 0.19, 0.32], [0.16, 0.035, 0.035], 0).rotation.z = i
			? -0.12
			: 0.12;
		sphere(
			head,
			"#d66d5b",
			[i ? 0.29 : -0.29, -0.09, 0.28],
			[0.075, 0.046, 0.026],
			0,
		);
	}
	sphere(head, C.ink, [0, -0.13, 0.335], [0.2, 0.067, 0.035], 0);
	sphere(head, skin, [0, -0.095, 0.37], [0.11, 0.047, 0.032], 0);
	// Soft five-lobed toque with ink band.
	cyl(head, C.white, [0, 0.37, 0], [0.39, 0.22, 0.34]);
	for (let i = 0; i < 5; i++)
		sphere(
			head,
			C.white,
			[
				Math.cos((i * Math.PI * 2) / 5) * 0.22,
				0.6 + (i % 2) * 0.05,
				Math.sin((i * Math.PI * 2) / 5) * 0.18,
			],
			[0.25, 0.25, 0.23],
		);
	const kerchief = box(body, apron, [0, 1.3, 0.39], [0.27, 0.16, 0.14]);
	kerchief.rotation.z = 0.4;
	const held = group(root, [0, 0.95, 0.66]);
	held.name = "HeldFood";
	const marker = new THREE.Mesh(
		new THREE.RingGeometry(0.57, 0.66, 32),
		new THREE.MeshBasicNodeMaterial({ color: apron, side: THREE.DoubleSide }),
	);
	marker.rotation.x = -Math.PI / 2;
	marker.position.y = 0.025;
	root.add(marker);
	const idLabel = label(
		root,
		id === 1 ? "02" : "01",
		0.46,
		0.25,
		[0, 2.62, 0],
		{ bg: apron, size: 230 },
	);
	const shadow = new THREE.Mesh(
		new THREE.CircleGeometry(0.58, 32),
		new THREE.MeshBasicNodeMaterial({
			color: C.ink,
			transparent: true,
			opacity: 0.19,
			depthWrite: false,
		}),
	);
	shadow.rotation.x = -Math.PI / 2;
	shadow.scale.y = 0.8;
	shadow.position.y = 0.014;
	root.add(shadow);
	const mixer = new THREE.AnimationMixer(root);
	const track = (path, times, values) =>
		new THREE.NumberKeyframeTrack(path, times, values);
	const clips = {
		idle: new THREE.AnimationClip("idle", 1.8, [
			track("ChefBody.position[y]", [0, 0.9, 1.8], [0, 0.045, 0]),
			track("ChefHead.rotation[z]", [0, 0.9, 1.8], [-0.025, 0.025, -0.025]),
		]),
		walk: new THREE.AnimationClip("walk", 0.5, [
			track(
				"LeftLeg.rotation[x]",
				[0, 0.125, 0.25, 0.375, 0.5],
				[0, 0.7, 0, -0.7, 0],
			),
			track(
				"RightLeg.rotation[x]",
				[0, 0.125, 0.25, 0.375, 0.5],
				[0, -0.7, 0, 0.7, 0],
			),
			track("LeftArm.rotation[x]", [0, 0.25, 0.5], [-0.25, 0.25, -0.25]),
			track("RightArm.rotation[x]", [0, 0.25, 0.5], [0.25, -0.25, 0.25]),
			track(
				"ChefBody.position[y]",
				[0, 0.125, 0.25, 0.375, 0.5],
				[0, 0.08, 0, 0.08, 0],
			),
		]),
		catch: new THREE.AnimationClip("catch", 0.34, [
			track("LeftArm.rotation[x]", [0, 0.12, 0.34], [0, -1.15, 0]),
			track("RightArm.rotation[x]", [0, 0.12, 0.34], [0, -1.15, 0]),
			track("ChefTorso.rotation[x]", [0, 0.12, 0.34], [0, -0.12, 0]),
		]),
		dash: new THREE.AnimationClip("dash", 0.3, [
			track("ChefTorso.rotation[x]", [0, 0.1, 0.3], [0, 0.3, 0]),
			track("LeftArm.rotation[x]", [0, 0.1, 0.3], [0, 1.2, 0]),
			track("RightArm.rotation[x]", [0, 0.1, 0.3], [0, 1.2, 0]),
			track("ChefBody.position[y]", [0, 0.1, 0.3], [0, 0.17, 0]),
		]),
	};
	const actions = Object.fromEntries(
		Object.entries(clips).map(([k, c]) => [k, mixer.clipAction(c)]),
	);
	actions.idle.play();
	return {
		root,
		body,
		head,
		held,
		mixer,
		actions,
		action: "idle",
		prevX: 0,
		prevZ: 0,
		heldKey: "",
		catchTimer: 0,
		idLabel,
		marker,
	};
}

export async function createScene(canvas, options = {}) {
	const renderer = new THREE.WebGPURenderer({
		canvas,
		antialias: true,
		alpha: false,
		powerPreference: "high-performance",
		forceWebGL:
			options.forceWebGL ||
			new URLSearchParams(location.search).get("renderer") === "webgl" ||
			!navigator.gpu,
	});
	renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.2;
	await renderer.init();
	const scene = new THREE.Scene();
	scene.background = new THREE.Color("#edcba4");
	const camera = new THREE.OrthographicCamera(-13, 13, 8, -8, 0.1, 100);
	camera.position.set(0, 20, 25);
	camera.lookAt(0, 0.2, -0.25);
	const hemi = new THREE.HemisphereLight("#fff6db", "#886a68", 2.6);
	scene.add(hemi);
	const key = new THREE.DirectionalLight("#fff4ce", 3.5);
	key.position.set(-7, 15, 6);
	key.castShadow = true;
	key.shadow.mapSize.set(2048, 2048);
	key.shadow.camera.left = -12;
	key.shadow.camera.right = 12;
	key.shadow.camera.top = 12;
	key.shadow.camera.bottom = -12;
	key.shadow.normalBias = 0.04;
	key.shadow.bias = -0.0002;
	scene.add(key);
	const fill = new THREE.DirectionalLight("#a5e5de", 1.1);
	fill.position.set(9, 6, -5);
	scene.add(fill);
	const set = group(scene);
	// Thick toy-theatre foundation, checkerboard inlaid with brass seams.
	box(set, C.ink, [0, -0.36, 0.1], [18.5, 0.65, 13.6], 0.01);
	box(set, C.peach, [0, -0.1, 0.1], [18.2, 0.25, 13.3], 0.01);
	const tiles = group(set);
	for (let x = -8; x <= 8; x++)
		for (let z = -5; z <= 5; z++) {
			box(
				tiles,
				(x + z) & 1 ? "#315452" : "#fff0cf",
				[x, 0.022, z],
				[0.98, 0.06, 0.98],
				0,
			);
		}
	// Decorative perimeter strips make the playing field read immediately.
	box(set, C.mustard, [0, 0.064, -5.6], [17.6, 0.045, 0.13], 0);
	box(set, C.mustard, [0, 0.064, 5.65], [17.6, 0.045, 0.13], 0);
	box(set, C.mustard, [-8.55, 0.064, 0.1], [0.13, 0.045, 11.2], 0);
	box(set, C.mustard, [8.55, 0.064, 0.1], [0.13, 0.045, 11.2], 0);
	// Back wall is a hand-inked biscuit tile backsplash.
	box(set, C.cream, [0, 1.8, -6.05], [18.3, 3.7, 0.32]);
	box(set, C.coral, [0, 3.43, -5.85], [18.1, 0.44, 0.12], 0);
	for (let i = -9; i <= 9; i++)
		pipe(set, [i, 0, -5.85], [i, 3.2, -5.85], 0.012, "#c29c81");
	for (let y = 0.3; y <= 3.2; y += 0.55)
		pipe(set, [-9, y, -5.84], [9, y, -5.84], 0.012, "#c29c81");
	box(set, C.teal, [0, 0.3, -5.79], [18, 0.43, 0.22]);
	// Restaurant name in an enamel plaque; round bolts and corner trims.
	box(set, C.ink, [0, 3.95, -5.9], [7.15, 1.48, 0.35]);
	box(set, C.coral, [0, 3.96, -5.68], [6.97, 1.28, 0.15]);
	label(set, "PRESSURE BUNS", 6.5, 1.0, [0, 3.98, -5.58], {
		bg: C.coral,
		fg: C.cream,
		size: 123,
		border: false,
	});
	for (const x of [-3.25, 3.25])
		sphere(set, C.mustard, [x, 3.97, -5.48], [0.08, 0.08, 0.035], 0);
	// Pass-through windows: happy diners look in from the sunny counter.
	const customers = [];
	for (const x of [-5.9, 5.8]) {
		box(set, C.ink, [x, 2.2, -5.72], [3.15, 1.9, 0.18]);
		box(set, "#89b9b1", [x, 2.22, -5.59], [2.95, 1.69, 0.12], 0);
		for (let j = 0; j < 2; j++) {
			const g = group(set, [x - 0.7 + j * 1.4, 1.65, -5.3]);
			sphere(g, j ? "#d79c68" : "#edb38b", [0, 0.36, 0], [0.34, 0.39, 0.2]);
			sphere(g, j ? C.mustard : C.teal, [0, -0.05, -0.03], [0.47, 0.43, 0.18]);
			for (const sx of [-0.12, 0.12])
				sphere(g, C.ink, [sx, 0.41, 0.19], [0.027, 0.04, 0.02], 0);
			sphere(g, C.ink, [0, 0.25, 0.19], [0.085, 0.037, 0.02], 0);
			if (j) box(g, C.navy, [0, 0.64, 0], [0.62, 0.14, 0.35]);
			else sphere(g, C.brown, [0, 0.62, -0.03], [0.36, 0.19, 0.2]);
			customers.push(g);
		}
		box(set, C.bun, [x, 1.41, -5.3], [3.4, 0.19, 0.75]);
		label(set, "ORDER UP!", 2.05, 0.33, [x, 1.41, -4.9], {
			bg: C.bun,
			size: 125,
			border: false,
		});
	}
	// Chrome grill oven feeding the left-side belt.
	const oven = group(set, [-6, 0, -4.45]);
	box(oven, C.navy, [0, 0.85, 0], [2.35, 1.7, 1.8]);
	box(oven, C.steel, [0, 1.62, 0], [2.5, 0.2, 1.95]);
	box(oven, C.ink, [0, 1.0, 0.92], [1.92, 0.9, 0.1]);
	box(oven, "#b55235", [0, 0.96, 0.99], [1.68, 0.68, 0.035], 0);
	const flames = [];
	for (let i = 0; i < 7; i++) {
		const f = mesh(
			oven,
			new THREE.ConeGeometry(0.11, 0.45, 7),
			i % 2 ? C.mustard : "#ff8650",
			[-0.7 + i * 0.23, 0.93, 1.02],
			[1, 1, 1],
			0.03,
		);
		flames.push(f);
	}
	label(oven, "THE GRILLE", 2.1, 0.4, [0, 1.78, 1.02], {
		bg: C.coral,
		fg: C.cream,
		size: 160,
	});
	for (let i = 0; i < 3; i++)
		cyl(oven, C.ink, [-0.65 + i * 0.65, 1.62, 0.58], [0.11, 0.05, 0.11]);
	// Exhaust hood and copper flue rise behind the oven.
	mesh(
		oven,
		new THREE.CylinderGeometry(0.65, 1.1, 0.6, 4),
		C.steel,
		[0, 2.55, -0.23],
		[1, 1, 1],
	);
	box(oven, C.steel, [0, 3.15, -0.3], [0.7, 0.7, 0.7]);
	for (let i = 0; i < 4; i++)
		box(oven, C.ink, [-0.65 + i * 0.43, 2.3, 0.41], [0.19, 0.05, 0.08], 0);
	// Four steel legs, cream side rails, and the charcoal segmented belt.
	const belt = group(set, [-6, 0, 0]);
	box(belt, C.ink, [0, 0.75, 0], [2.35, 0.5, 8.5]);
	box(belt, C.steel, [0, 0.84, 0], [2.16, 0.32, 8.45]);
	box(belt, C.navy, [0, 1.04, 0], [1.76, 0.1, 8.4], 0);
	for (const x of [-0.9, 0.9])
		for (const z of [-3.5, 3.5])
			cyl(belt, C.steel, [x, 0.4, z], [0.09, 0.8, 0.09]);
	for (const x of [-1, 1]) box(belt, C.cream, [x, 1.13, 0], [0.14, 0.2, 8.5]);
	const slats = [];
	for (let i = 0; i < 25; i++) {
		const s = box(
			belt,
			i % 2 ? "#45615e" : "#344e4b",
			[0, 1.105, -4.1 + i * 0.34],
			[1.75, 0.025, 0.27],
			0,
		);
		slats.push(s);
	}
	for (const z of [-2.9, -0.3, 2.3]) {
		const ar = label(belt, "▼", 0.6, 0.6, [0, 1.129, z], {
			bg: "#344e4b",
			fg: "#8ca49a",
			size: 700,
			border: false,
		});
		ar.rotation.x = -Math.PI / 2;
	}
	label(belt, "ASSEMBLY", 1.7, 0.33, [0, 0.73, 4.3], {
		bg: C.steel,
		size: 160,
		border: false,
	});
	// A striped catch basket waits under the very end of the conveyor.
	box(belt, C.coral, [0, 0.4, 4.65], [2, 0.8, 0.68]);
	box(belt, C.ink, [0, 0.82, 4.65], [1.83, 0.035, 0.55]);
	// The temperamental, gloriously over-engineered food launcher.
	const dispenser = group(set, [7, 0, 0]);
	box(dispenser, C.ink, [0.23, 1.05, 0], [2.3, 2.1, 7.75]);
	box(dispenser, C.teal, [0.2, 1.15, 0], [2.12, 2.1, 7.5]);
	box(dispenser, "#87dbbe", [0.18, 2.18, 0], [2.25, 0.16, 7.7]);
	for (const z of [-2.5, 0, 2.5]) {
		const barrel = cyl(dispenser, C.cream, [-1.01, 1.33, z], [0.38, 0.9, 0.38]);
		barrel.rotation.z = Math.PI / 2;
		const hole = cyl(
			dispenser,
			C.ink,
			[-1.49, 1.33, z],
			[0.29, 0.035, 0.29],
			0,
		);
		hole.rotation.z = Math.PI / 2;
		const ring = new THREE.Mesh(
			new THREE.TorusGeometry(0.34, 0.055, 8, 24),
			mat(C.coral),
		);
		ring.rotation.y = Math.PI / 2;
		ring.position.set(-1.51, 1.33, z);
		dispenser.add(ring);
		box(dispenser, C.navy, [0, 2.31, z], [1.5, 0.12, 1.5]);
		for (let i = 0; i < 3; i++)
			sphere(
				dispenser,
				i === 0 ? C.coral : i === 1 ? C.mustard : C.cream,
				[-0.5 + i * 0.48, 2.43, z],
				[0.09, 0.05, 0.09],
				0.02,
			);
		for (let i = 0; i < 3; i++)
			box(dispenser, C.ink, [1.28, 0.7 + i * 0.19, z], [0.028, 0.045, 1.4], 0);
	}
	label(dispenser, "FOOD-O-MATIC", 6.0, 0.62, [0.2, 2.84, 0], {
		bg: C.teal,
		size: 119,
		rotation: Math.PI / 2,
	});
	// Tall rear header reads directly from the camera, unlike the side plate.
	box(dispenser, C.ink, [0, 3.12, -3.5], [2.45, 0.9, 0.25]);
	label(dispenser, "FOOD-O-MATIC", 2.2, 0.62, [0, 3.14, -3.33], {
		bg: C.teal,
		size: 120,
		border: false,
	});
	label(dispenser, "100% UNPREDICTABLE", 2.2, 0.23, [0, 2.76, -3.32], {
		bg: C.cream,
		size: 65,
		border: false,
	});
	const gauge = cyl(dispenser, C.cream, [0.1, 3.9, -3.4], [0.48, 0.12, 0.48]);
	gauge.rotation.x = Math.PI / 2;
	const dial = pipe(
		dispenser,
		[0.1, 3.9, -3.31],
		[0.35, 4.12, -3.31],
		0.035,
		C.coral,
	);
	pipe(dispenser, [0.8, 2.5, -2.6], [0.8, 4.3, -2.6], 0.09, C.mustard);
	pipe(dispenser, [0.8, 4.3, -2.6], [-0.2, 4.3, -2.6], 0.09, C.mustard);
	// Color-and-number coded wrapping chutes. Recessed dark lips keep targets clear.
	const chuteGroups = [];
	COLORS.forEach((color, i) => {
		const x = (i - 1) * 3,
			g = group(set, [x, 0, 5.25]);
		chuteGroups.push(g);
		box(g, C.ink, [0, 0.51, 0], [2.55, 1.02, 1.4]);
		box(g, color, [0, 0.58, 0.03], [2.36, 1.02, 1.28]);
		box(g, C.cream, [0, 1.08, 0], [2.55, 0.15, 1.48]);
		box(g, C.ink, [0, 1.17, -0.11], [1.85, 0.07, 0.86]);
		box(g, "#122b30", [0, 1.2, -0.12], [1.6, 0.02, 0.63], 0);
		label(
			g,
			String(i + 1).padStart(2, "0") + "  ↓",
			1.7,
			0.43,
			[0, 0.66, 0.69],
			{ bg: color, fg: C.ink, size: 250, border: false },
		);
		const flag = label(
			g,
			["1 · CORAL", "2 · MINT", "3 · GOLD"][i],
			2.15,
			0.48,
			[0, 1.7, 0.2],
			{ bg: color, size: 154 },
		);
		pipe(g, [-1, 1.08, 0.26], [-1, 1.88, 0.26], 0.027);
		pipe(g, [1, 1.08, 0.26], [1, 1.88, 0.26], 0.027);
		for (const sx of [-0.8, 0.8])
			cyl(g, C.ink, [sx, 0.08, 0.36], [0.09, 0.2, 0.09]);
		// A little takeaway bag on the front shelf.
		box(g, "#d4a775", [0.8, 0.42, 0.8], [0.35, 0.5, 0.27]);
		box(g, color, [0.8, 0.47, 0.945], [0.21, 0.12, 0.012], 0);
	});
	// Two planters, spice tins, hanging lamps and recipe rail build the diner frame.
	for (const x of [-8.05, 8.1]) {
		const p = group(set, [x, 0, 4.55]);
		cyl(p, C.coral, [0, 0.35, 0], [0.37, 0.7, 0.29]);
		for (let i = 0; i < 7; i++) {
			const a = i * 2.4;
			const leaf = sphere(
				p,
				i % 2 ? C.lettuce : "#a3ca6c",
				[Math.cos(a) * 0.27, 0.95 + (i % 3) * 0.1, Math.sin(a) * 0.22],
				[0.17, 0.5, 0.11],
			);
			leaf.rotation.z = Math.cos(a) * 0.5;
			leaf.rotation.x = Math.sin(a) * 0.5;
		}
	}
	const lamps = [];
	for (const x of [-3.4, 3.4]) {
		pipe(set, [x, 5.4, -2.8], [x, 6.0, -2.8], 0.035);
		const shade = mesh(
			set,
			new THREE.ConeGeometry(0.72, 0.42, 24, 1, true),
			C.coral,
			[x, 5.2, -2.8],
			[1, 1, 1],
		);
		const glow = cyl(
			set,
			new THREE.MeshBasicNodeMaterial({ color: "#fff6c7" }),
			[x, 5.01, -2.8],
			[0.61, 0.035, 0.61],
			0,
		);
		const light = new THREE.PointLight("#ffdd93", 9, 8, 2);
		light.position.set(x, 4.7, -2.8);
		scene.add(light);
		lamps.push(shade);
	}
	const recipeRail = group(set, [0, 0.28, -5.0]);
	for (let i = 0; i < 5; i++) {
		const jar = cyl(
			recipeRail,
			[C.tomato, C.mustard, C.teal, C.onion, C.cream][i],
			[-1.15 + i * 0.57, 0, 0],
			[0.16, 0.45, 0.16],
		);
		cyl(recipeRail, C.navy, [-1.15 + i * 0.57, 0.25, 0], [0.18, 0.07, 0.18]);
	}
	// Gentle steam uses hand-drawn ring silhouettes, all geometry and code.
	const steam = [];
	for (let i = 0; i < 9; i++) {
		const s = sphere(
			set,
			new THREE.MeshBasicNodeMaterial({
				color: "#fff5d9",
				transparent: true,
				opacity: 0.35,
				depthWrite: false,
			}),
			[-6 + Math.sin(i) * 0.35, 2.7 + i * 0.15, -4.7],
			[0.08, 0.11, 0.08],
			0,
		);
		steam.push(s);
	}
	const players = new Map(),
		burgers = new Map(),
		ingredients = new Map(),
		particles = [];
	const tempV = new THREE.Vector3(),
		tempQ = new THREE.Quaternion(),
		raycaster = new THREE.Raycaster(),
		plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
	function billboard(tag) {
		tag.parent.getWorldQuaternion(tempQ).invert();
		tag.quaternion.copy(tempQ.multiply(camera.quaternion));
	}
	let lastState = null;
	function sync(map, items, make, update) {
		const alive = new Set();
		for (const item of items) {
			alive.add(item.id);
			let obj = map.get(item.id);
			if (!obj) {
				obj = make(item);
				map.set(item.id, obj);
				scene.add(obj.root || obj);
			}
			update(obj, item);
		}
		for (const [id, obj] of map) {
			if (!alive.has(id)) {
				scene.remove(obj.root || obj);
				map.delete(id);
			}
		}
	}
	function resize() {
		const w = canvas.clientWidth || innerWidth,
			h = canvas.clientHeight || innerHeight,
			aspect = w / h;
		renderer.setSize(w, h, false);
		// At portrait ratios keep the whole cooking floor visible.
		const halfH = Math.max(8.05, 10.3 / aspect);
		camera.left = -halfH * aspect;
		camera.right = halfH * aspect;
		camera.top = halfH;
		camera.bottom = -halfH;
		camera.updateProjectionMatrix();
	}
	resize();
	function burst(x, z, color = C.mustard, count = 14) {
		for (let i = 0; i < count; i++) {
			const p = mesh(
				scene,
				geo.box,
				Array.isArray(color) ? color[i % color.length] : color,
				[x, 1.5, z],
				[0.09, 0.09, 0.09],
				0,
			);
			const a = i * 2.39996;
			particles.push({
				mesh: p,
				vx: Math.cos(a) * (1 + Math.random() * 2),
				vz: Math.sin(a) * (1 + Math.random() * 2),
				vy: 2 + Math.random() * 3,
				life: 0.6 + Math.random() * 0.5,
				max: 1.1,
			});
		}
	}
	function render(state, dt) {
		lastState = state;
		const t = state.time || performance.now() / 1000;
		slats.forEach((o, i) => {
			o.position.z = -4.2 + ((i * 0.34 + t * 0.4) % 8.5);
		});
		flames.forEach((f, i) => {
			f.scale.y = 0.8 + Math.sin(t * 12 + i * 1.8) * 0.22;
		});
		customers.forEach((c, i) => {
			c.rotation.z = Math.sin(t * 1.6 + i) * 0.045;
		});
		steam.forEach((s, i) => {
			s.position.y = 2.8 + ((t * 0.46 + i * 0.2) % 1.75);
			s.position.x = -6 + Math.sin(t + i * 1.5) * 0.3;
			s.scale.setScalar(0.08 + ((t * 0.46 + i * 0.2) % 1.75) * 0.07);
			s.material.opacity = 0.27 * (1 - ((t * 0.46 + i * 0.2) % 1.75) / 1.75);
		});
		sync(
			players,
			state.players || [],
			(p) => chefModel(p.id),
			(o, p) => {
				const dx = p.x - o.prevX,
					dz = p.z - o.prevZ,
					speed = Math.hypot(dx, dz) / Math.max(dt, 0.001);
				o.root.position.set(p.x, 0, p.z);
				o.prevX = p.x;
				o.prevZ = p.z;
				if (speed > 0.1 && speed < 40) {
					const target = Math.atan2(dx, dz);
					let d = target - o.root.rotation.y;
					d = Math.atan2(Math.sin(d), Math.cos(d));
					o.root.rotation.y += d * Math.min(1, dt * 16);
				}
				const key = p.carrying ? JSON.stringify(p.carrying) : p.held || "";
				o.catchTimer = Math.max(0, o.catchTimer - dt);
				if ((key && key !== o.heldKey) || p.anim === "catch")
					o.catchTimer = 0.3;
				let desired = speed > 0.15 ? "walk" : "idle";
				if (o.catchTimer > 0) desired = "catch";
				if (p.anim === "dash" || (p.dash > 0 && p.dash < 0.32))
					desired = "dash";
				if (desired !== o.action) {
					o.actions[o.action].fadeOut(0.12);
					o.actions[desired].reset().fadeIn(0.12).play();
					o.action = desired;
				}
				if (desired === "walk")
					o.actions.walk.timeScale = Math.max(0.65, Math.min(2, speed / 4));
				o.mixer.update(Math.min(dt, 0.1));
				if (key !== o.heldKey) {
					o.held.clear();
					if (p.carrying) {
						const m = burgerModel(
							p.carrying.ingredients || [],
							true,
							p.carrying.color ?? 0,
						);
						m.scale.setScalar(0.8);
						o.held.add(m);
					} else if (p.held) {
						const m = food(p.held);
						m.scale.setScalar(0.85);
						o.held.add(m);
					}
					o.heldKey = key;
				}
				o.held.traverse((child) => {
					if (child.userData.orderTag) {
						billboard(child.userData.orderTag);
					}
				});
				billboard(o.idLabel);
				o.marker.material.opacity = p.dash > 0 ? 0.8 : 1;
			},
		);
		sync(
			burgers,
			state.burgers || [],
			(b) => {
				const root = new THREE.Group();
				root.userData.key = "";
				return root;
			},
			(o, b) => {
				const k = JSON.stringify([b.ingredients, b.ready, b.color]);
				if (o.userData.key !== k) {
					o.clear();
					o.add(burgerModel(b.ingredients || [], b.ready, b.color ?? 0));
					o.userData.key = k;
				}
				o.position.set(b.x ?? -6, 1.22, b.z);
				o.rotation.y = Math.sin(t * 2 + b.id) * 0.035;
				o.children.forEach((child) => {
					if (child.userData.orderTag) {
						billboard(child.userData.orderTag);
					}
				});
				if (b.ready) o.position.y += Math.sin(t * 4) * 0.045;
			},
		);
		sync(
			ingredients,
			state.ingredients || [],
			(i) => {
				const f = food(i.type);
				f.userData.type = i.type;
				return f;
			},
			(o, i) => {
				if (o.userData.type !== i.type) {
					o.clear();
					const f = food(i.type);
					o.add(f);
					o.userData.type = i.type;
				}
				o.position.set(
					i.x,
					1.3 + Math.sin(t * 5 + (Number(i.id) || 0)) * 0.12,
					i.z,
				);
				o.rotation.y = t * 1.7;
				o.rotation.z = Math.sin(t * 3 + (Number(i.id) || 0)) * 0.18;
				o.scale.setScalar(i.type === "bun" ? 1 : 0.96);
			},
		);
		for (let i = particles.length - 1; i >= 0; i--) {
			const p = particles[i];
			p.life -= dt;
			if (p.life <= 0) {
				scene.remove(p.mesh);
				particles.splice(i, 1);
				continue;
			}
			p.vy -= 8 * dt;
			p.mesh.position.x += p.vx * dt;
			p.mesh.position.z += p.vz * dt;
			p.mesh.position.y += p.vy * dt;
			p.mesh.rotation.x += dt * 8;
			p.mesh.rotation.z += dt * 6;
			p.mesh.scale.setScalar(0.1 * Math.min(1, p.life * 4));
		}
		// The gauge needle grows more nervous as orders get harder.
		dial.rotation.z = Math.sin(t * 3) * 0.08 + (state.shift || 0) * 0.12;
		renderer.render(scene, camera);
	}
	function project(x, z, y = 0.1) {
		tempV.set(x, y, z).project(camera);
		return {
			x: (tempV.x * 0.5 + 0.5) * canvas.clientWidth,
			y: (-0.5 * tempV.y + 0.5) * canvas.clientHeight,
		};
	}
	function screenToWorld(clientX, clientY) {
		const r = canvas.getBoundingClientRect();
		raycaster.setFromCamera(
			new THREE.Vector2(
				((clientX - r.left) / r.width) * 2 - 1,
				(-(clientY - r.top) / r.height) * 2 + 1,
			),
			camera,
		);
		const out = new THREE.Vector3();
		raycaster.ray.intersectPlane(plane, out);
		return { x: out.x, z: out.z };
	}
	return {
		render,
		resize,
		project,
		screenToWorld,
		burst,
		renderer,
		scene,
		camera,
		stats: {
			engine: "Three.js r180",
			backend: renderer.backend?.isWebGPUBackend ? "WebGPU" : "WebGL fallback",
			get meshes() {
				let n = 0;
				scene.traverse((o) => {
					if (o.isMesh) n++;
				});
				return n;
			},
			get animations() {
				return players.size * 4;
			},
		},
	};
}
