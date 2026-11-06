import * as T from "three/webgpu";

export const C = {
	ink: 0x202a33,
	paper: 0xfff1cb,
	orange: 0xf79035,
	yellow: 0xffce64,
	mint: 0x8fe5ce,
	glass: 0x25545e,
	pink: 0xe86379,
	dark: 0x694657,
	sand: 0xe6a15b,
	blue: 0x539ab3,
};
const bands = new T.DataTexture(
	new Uint8Array([85, 85, 85, 255, 170, 170, 170, 255, 255, 255, 255, 255]),
	3,
	1,
);
bands.needsUpdate = true;
bands.minFilter = T.NearestFilter;
bands.magFilter = T.NearestFilter;
const mats = new Map();
export function mat(color) {
	if (!mats.has(color))
		mats.set(color, new T.MeshToonNodeMaterial({ color, gradientMap: bands }));
	return mats.get(color);
}
const ink = new T.MeshBasicNodeMaterial({ color: C.ink, side: T.BackSide });
const plain = new Map();
export function flat(color) {
	if (!plain.has(color))
		plain.set(color, new T.MeshBasicNodeMaterial({ color }));
	return plain.get(color);
}
export function mesh(
	g,
	geo,
	color,
	pos = [0, 0, 0],
	scale = [1, 1, 1],
	outline = true,
) {
	const m = new T.Mesh(geo, mat(color));
	m.position.set(...pos);
	m.scale.set(...scale);
	m.castShadow = true;
	m.receiveShadow = true;
	if (outline) {
		const o = new T.Mesh(geo, ink);
		o.scale.setScalar(1.045);
		m.add(o);
	}
	g.add(m);
	return m;
}
export function box(g, size, color, pos, outline = true) {
	return mesh(g, new T.BoxGeometry(...size), color, pos, undefined, outline);
}
export function sphere(g, size, color, pos, outline = true) {
	return mesh(g, new T.SphereGeometry(1, 16, 10), color, pos, size, outline);
}
export function cyl(g, r1, r2, h, color, pos, outline = true) {
	return mesh(
		g,
		new T.CylinderGeometry(r1, r2, h, 12),
		color,
		pos,
		undefined,
		outline,
	);
}
function decal(g, text, w, h, pos, color = "#fff1cb", bg = null, rot = 0) {
	const c = document.createElement("canvas");
	c.width = 512;
	c.height = 192;
	const x = c.getContext("2d");
	if (bg) {
		x.fillStyle = bg;
		x.fillRect(0, 0, 512, 192);
	}
	x.fillStyle = color;
	x.font = "900 120px Barlow, sans-serif";
	x.textAlign = "center";
	x.textBaseline = "middle";
	x.fillText(text, 256, 102, 490);
	const tex = new T.CanvasTexture(c);
	tex.colorSpace = T.SRGBColorSpace;
	const m = new T.Mesh(
		new T.PlaneGeometry(w, h),
		new T.MeshBasicNodeMaterial({
			map: tex,
			transparent: true,
			depthWrite: false,
		}),
	);
	m.position.set(...pos);
	m.rotation.y = rot;
	g.add(m);
	return m;
}
function clipSpin(mixer, name, path, duration) {
	const a = mixer.clipAction(
		new T.AnimationClip(name, duration, [
			new T.NumberKeyframeTrack(path, [0, duration], [0, Math.PI * 2]),
		]),
	);
	a.play();
	return a;
}
export function helicopter(color = C.orange, number = "01") {
	const root = new T.Group(),
		g = new T.Group();
	g.name = "hull";
	root.add(g);
	sphere(g, [2.65, 1.12, 1.16], color, [0, 0, 0]);
	sphere(g, [1.55, 0.87, 1.03], C.glass, [1.25, 0.3, 0.03]);
	box(g, [0.15, 1.28, 2.05], color, [1.32, 0.29, 0]);
	box(g, [2.5, 0.15, 0.08], C.mint, [0.95, 0.57, 1.015]);
	box(g, [0.78, 0.16, 0.06], C.paper, [1.94, 0.2, 0.96]);
	box(g, [1.6, 0.75, 2.08], color, [-1.1, 0.1, 0]);
	const tail = cyl(g, 0.28, 0.55, 4.4, color, [-4.15, 0.33, 0]);
	tail.rotation.z = Math.PI / 2 + 0.12;
	const fin = box(g, [0.58, 1.9, 0.22], color, [-6.15, 1.05, 0]);
	fin.rotation.z = -0.22;
	box(g, [1.35, 0.13, 2.6], C.paper, [-5.7, 0.63, 0]);
	for (const z of [-1, 1]) {
		const leg = box(g, [0.16, 0.95, 0.14], C.ink, [-0.9, -1.35, z]);
		leg.rotation.z = -0.28;
		const leg2 = box(g, [0.16, 0.95, 0.14], C.ink, [1.2, -1.35, z]);
		leg2.rotation.z = 0.28;
		box(g, [5, 0.16, 0.18], C.ink, [-0.1, -1.78, z]);
		const gun = cyl(g, 0.18, 0.21, 1.6, C.ink, [2, -0.65, z * 0.9]);
		gun.rotation.z = Math.PI / 2;
		cyl(g, 0.3, 0.3, 0.16, C.paper, [-0.2, -0.08, z * 1.17]).rotation.x =
			Math.PI / 2;
	}
	box(g, [2.1, 0.23, 1.75], C.paper, [-0.5, 1.08, 0]);
	cyl(g, 0.16, 0.2, 0.95, C.ink, [-0.4, 1.65, 0]);
	const rotor = new T.Group();
	rotor.name = "rotor";
	rotor.position.set(-0.4, 2.15, 0);
	g.add(rotor);
	box(rotor, [10.8, 0.09, 0.32], C.ink, [0, 0, 0]);
	box(rotor, [0.32, 0.09, 10.8], C.ink, [0, 0.02, 0]);
	for (const x of [-4.85, 4.85])
		box(rotor, [0.9, 0.1, 0.34], C.paper, [x, 0.02, 0]);
	cyl(rotor, 0.28, 0.28, 0.22, color, [0, 0.12, 0]);
	const tailRotor = new T.Group();
	tailRotor.name = "tailrotor";
	tailRotor.position.set(-6.2, 0.9, 0.39);
	g.add(tailRotor);
	box(tailRotor, [1.8, 0.14, 0.09], C.ink, [0, 0, 0]);
	box(tailRotor, [0.14, 1.8, 0.09], C.ink, [0, 0, 0.02]);
	sphere(tailRotor, [0.22, 0.22, 0.12], C.paper, [0, 0, 0.08]);
	for (const z of [-1.195, 1.195])
		decal(
			g,
			number,
			0.75,
			0.42,
			[-1.24, 0.05, z],
			"#202a33",
			null,
			z < 0 ? Math.PI : 0,
		);
	const mixer = new T.AnimationMixer(root);
	clipSpin(mixer, "Rotor", "rotor.rotation[y]", 0.14);
	clipSpin(mixer, "Tail rotor", "tailrotor.rotation[z]", 0.1);
	mixer
		.clipAction(
			new T.AnimationClip("Hover", 1.8, [
				new T.NumberKeyframeTrack(
					"hull.position[y]",
					[0, 0.45, 0.9, 1.35, 1.8],
					[0, 0.1, 0, -0.1, 0],
				),
			]),
		)
		.play();
	root.userData = { mixer, type: "heli" };
	return root;
}
export function jet() {
	const g = new T.Group();
	sphere(g, [3.5, 0.55, 0.66], C.pink, [0, 0, 0]);
	const nose = mesh(g, new T.ConeGeometry(0.57, 2.1, 12), C.paper, [3.2, 0, 0]);
	nose.rotation.z = -Math.PI / 2;
	sphere(g, [1.05, 0.5, 0.57], C.glass, [0.9, 0.42, 0]);
	const wing = box(g, [1.9, 0.15, 6], C.pink, [-0.7, -0.1, 0]);
	wing.rotation.y = -0.24;
	box(g, [1.05, 0.13, 3], C.ink, [-2.7, 0.15, 0]);
	const fin = box(g, [1.2, 1.35, 0.16], C.dark, [-2.8, 0.55, 0]);
	fin.rotation.z = -0.3;
	const exhaust = cyl(g, 0.32, 0.46, 0.55, C.ink, [-3.3, 0, 0]);
	exhaust.rotation.z = Math.PI / 2;
	sphere(g, [1.1, 0.25, 0.28], C.yellow, [-4, 0, 0], false);
	return g;
}
export function truck(index = 0) {
	const root = new T.Group(),
		g = new T.Group();
	g.name = "truckHull";
	root.add(g);
	box(g, [6.3, 0.42, 2.55], C.ink, [0, 1.0, 0]);
	box(g, [4.1, 2.3, 2.5], index % 3 === 0 ? C.mint : C.paper, [-1, 2.25, 0]);
	box(g, [1.85, 1.65, 2.45], C.orange, [2.08, 1.95, 0]);
	box(g, [1.5, 0.85, 2.47], C.glass, [2.2, 2.4, 0]);
	box(g, [1.75, 0.13, 2.62], C.yellow, [2.1, 2.89, 0]);
	box(g, [0.19, 0.8, 2.53], C.orange, [2.85, 2.2, 0]);
	box(g, [0.2, 0.65, 2.5], C.ink, [3.1, 1.4, 0]);
	for (const x of [-1.85, 1.95])
		for (const z of [-1.35, 1.35]) {
			const w = cyl(g, 0.67, 0.67, 0.3, C.ink, [x, 0.72, z]);
			w.rotation.x = Math.PI / 2;
			const hub = cyl(g, 0.3, 0.3, 0.32, C.paper, [x, 0.72, z]);
			hub.rotation.x = Math.PI / 2;
		}
	for (const z of [-1.265, 1.265])
		decal(
			g,
			"FLOUR",
			2.8,
			0.7,
			[-1, 2.25, z],
			"#202a33",
			null,
			z < 0 ? Math.PI : 0,
		);
	for (let i = 0; i < 3; i++) {
		const sack = sphere(g, [0.48, 0.52, 0.78], C.yellow, [
			-2 + i * 0.95,
			3.7,
			0,
		]);
		box(g, [0.12, 0.2, 1.15], C.ink, [-2 + i * 0.95, 4.1, 0], false);
	}
	const mixer = new T.AnimationMixer(root);
	mixer
		.clipAction(
			new T.AnimationClip("Suspension", 0.8, [
				new T.NumberKeyframeTrack(
					"truckHull.position[y]",
					[0, 0.2, 0.4, 0.6, 0.8],
					[0, 0.06, 0, -0.04, 0],
				),
			]),
		)
		.play();
	root.userData = { mixer, type: "truck" };
	return root;
}
export function carrier() {
	const g = new T.Group();
	sphere(g, [10, 3.7, 2.5], C.dark, [0, 0, 0]);
	sphere(g, [7.5, 2.4, 2.6], C.pink, [0.1, 0.5, 0]);
	box(g, [16, 0.45, 3.4], C.ink, [0, -2.4, 0]);
	box(g, [5, 0.8, 3.4], C.ink, [6, -1.7, 0]);
	for (const x of [-6, -2, 2, 6]) {
		box(g, [1.6, 0.8, 4.2], C.paper, [x, -2.8, 0]);
		sphere(g, [0.65, 0.65, 0.1], C.yellow, [x, -2.7, 2.2]);
	}
	for (const z of [-1, 1]) {
		box(g, [4, 1.2, 0.1], C.glass, [5, 0.45, z * 2.49]);
		decal(
			g,
			"CRUMB",
			7,
			1.6,
			[-1, 0.3, z * 2.64],
			"#fff1cb",
			null,
			z < 0 ? Math.PI : 0,
		);
	}
	for (const x of [-7, 7]) {
		const r = new T.Group();
		r.name = "carrierRotor" + x;
		r.position.set(x, 4, 0);
		g.add(r);
		cyl(r, 0.2, 0.2, 2, C.ink, [0, -0.8, 0]);
		box(r, [8, 0.18, 0.6], C.ink, [0, 0, 0]);
		box(r, [0.6, 0.18, 8], C.ink, [0, 0.02, 0]);
	}
	const mixer = new T.AnimationMixer(g);
	clipSpin(mixer, "Port rotor", "carrierRotor-7.rotation[y]", 0.2);
	clipSpin(mixer, "Starboard rotor", "carrierRotor7.rotation[y]", 0.2);
	g.userData = { mixer, type: "boss" };
	return g;
}
export function pickup(kind) {
	const g = new T.Group();
	const b = box(
		g,
		[1.6, 1.6, 1.6],
		kind === "power" ? C.yellow : C.mint,
		[0, 0, 0],
	);
	b.rotation.z = Math.PI / 4;
	decal(g, kind === "power" ? "⚡" : "+", 1.4, 1.2, [0, 0, 1.15], "#202a33");
	const mixer = new T.AnimationMixer(g);
	mixer
		.clipAction(
			new T.AnimationClip("Supply bob", 2, [
				new T.NumberKeyframeTrack(".rotation[y]", [0, 2], [0, Math.PI * 2]),
			]),
		)
		.play();
	g.userData = { mixer };
	return g;
}
