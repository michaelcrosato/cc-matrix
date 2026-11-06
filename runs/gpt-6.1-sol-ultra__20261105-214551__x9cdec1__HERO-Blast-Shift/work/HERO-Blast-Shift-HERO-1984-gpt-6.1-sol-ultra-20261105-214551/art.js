import * as THREE from "three/webgpu";

// All of the mine's art is geometry, ink contours, and three-band light.
const INK = 0x06141d;
const ramp = new THREE.DataTexture(
	new Uint8Array([62, 62, 62, 255, 144, 144, 144, 255, 255, 255, 255, 255]),
	3,
	1,
	THREE.RGBAFormat,
);
ramp.minFilter = THREE.NearestFilter;
ramp.magFilter = THREE.NearestFilter;
ramp.generateMipmaps = false;
ramp.needsUpdate = true;

export function makeMat(value, emissive = 0, transparent = false) {
	return new THREE.MeshToonNodeMaterial({
		color: value,
		gradientMap: ramp,
		emissive,
		emissiveIntensity: emissive ? 0.65 : 0,
		transparent,
		opacity: transparent ? 0.4 : 1,
	});
}

const ink = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
const edgeMat = new THREE.LineBasicMaterial({
	color: INK,
	transparent: true,
	opacity: 0.82,
});
const mats = {
	ink: makeMat(INK),
	rock: makeMat(0x203b45),
	rockLight: makeMat(0x335760),
	deep: makeMat(0x142c38),
	teal: makeMat(0x3b989a),
	steel: makeMat(0x586a73),
	darkSteel: makeMat(0x243741),
	amber: makeMat(0xffc457),
	orange: makeMat(0xf28b42),
	cream: makeMat(0xffedb3),
	white: makeMat(0xe9f6ec),
	red: makeMat(0xee6552),
	glow: makeMat(0x88f7d1, 0x49c6b0),
	lamp: makeMat(0xffe4a0, 0xffb44e),
	hot: makeMat(0xff6542, 0xe63f28),
	water: makeMat(0x246d8c, 0x143746, true),
};
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const ballGeo = new THREE.IcosahedronGeometry(1, 1);
const lowBallGeo = new THREE.IcosahedronGeometry(1, 0);
const cylinderGeo = new THREE.CylinderGeometry(1, 1, 1, 10);
const sharedGeometries = new Set([boxGeo, ballGeo, lowBallGeo, cylinderGeo]);
const sharedMaterials = new Set([...Object.values(mats), ink, edgeMat]);

// A sector and a transient effect own their unique meshes/maps, while all
// characters share the primitive library and the common ink/suit palette.
function disposeObject(root) {
	if (!root) return;
	const geometries = new Set(),
		materials = new Set(),
		textures = new Set();
	root.traverse((obj) => {
		if (obj.geometry && !sharedGeometries.has(obj.geometry))
			geometries.add(obj.geometry);
		for (const material of Array.isArray(obj.material)
			? obj.material
			: [obj.material]) {
			if (!material || sharedMaterials.has(material)) continue;
			materials.add(material);
			for (const value of Object.values(material)) {
				if (value?.isTexture && value !== ramp) textures.add(value);
			}
		}
	});
	for (const texture of textures) texture.dispose();
	for (const material of materials) material.dispose();
	for (const geometry of geometries) geometry.dispose();
	root.removeFromParent();
	root.clear();
}

function box(parent, x, y, z, w, h, d, material, outline = true) {
	const obj = new THREE.Mesh(boxGeo, material);
	obj.position.set(x, y, z);
	obj.scale.set(w, h, d);
	obj.castShadow = obj.receiveShadow = true;
	parent.add(obj);
	if (outline) {
		const shell = new THREE.Mesh(boxGeo, ink);
		shell.scale.set(1.035, 1.035, 1.035);
		obj.add(shell);
	}
	return obj;
}
function ball(
	parent,
	x,
	y,
	z,
	r,
	material,
	stretch = [1, 1, 1],
	outline = true,
) {
	const obj = new THREE.Mesh(ballGeo, material);
	obj.position.set(x, y, z);
	obj.scale.set(r * stretch[0], r * stretch[1], r * stretch[2]);
	obj.castShadow = obj.receiveShadow = true;
	parent.add(obj);
	if (outline) {
		const shell = new THREE.Mesh(ballGeo, ink);
		shell.scale.setScalar(1.055);
		obj.add(shell);
	}
	return obj;
}
function rod(parent, from, to, radius, material, outline = false) {
	const a = new THREE.Vector3(...from),
		b = new THREE.Vector3(...to),
		delta = b.clone().sub(a);
	const obj = new THREE.Mesh(cylinderGeo, material);
	obj.position.copy(a).add(b).multiplyScalar(0.5);
	obj.quaternion.setFromUnitVectors(
		new THREE.Vector3(0, 1, 0),
		delta.clone().normalize(),
	);
	obj.scale.set(radius, delta.length(), radius);
	parent.add(obj);
	if (outline) {
		const s = new THREE.Mesh(cylinderGeo, ink);
		s.scale.set(1.16, 1.02, 1.16);
		obj.add(s);
	}
	return obj;
}
function line(parent, pts, value = 0x4b7a80) {
	const geom = new THREE.BufferGeometry().setFromPoints(
		pts.map((p) => new THREE.Vector3(...p)),
	);
	const obj = new THREE.Line(
		geom,
		new THREE.LineBasicMaterial({ color: value }),
	);
	parent.add(obj);
	return obj;
}
function panel(parent, text, x, y, z, w, h, style = {}) {
	const canvas = document.createElement("canvas");
	canvas.width = Math.ceil(w * 100);
	canvas.height = Math.ceil(h * 100);
	const ctx = canvas.getContext("2d");
	ctx.fillStyle = style.bg || "#102630";
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.strokeStyle = style.border || "#a1beb6";
	ctx.lineWidth = 5;
	ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillStyle = style.color || "#ffe5a4";
	ctx.font = `900 ${Math.floor(canvas.height * 0.48)}px "Arial Narrow", sans-serif`;
	ctx.fillText(
		text,
		canvas.width / 2,
		canvas.height / 2 + 2,
		canvas.width * 0.92,
	);
	const texture = new THREE.CanvasTexture(canvas);
	texture.colorSpace = THREE.SRGBColorSpace;
	const obj = new THREE.Mesh(
		new THREE.PlaneGeometry(w, h),
		new THREE.MeshBasicMaterial({ map: texture, transparent: false }),
	);
	obj.position.set(x, y, z);
	parent.add(obj);
	return obj;
}
function crystal(parent, x, y, z, size, material) {
	const obj = new THREE.Mesh(new THREE.ConeGeometry(0.33, 1.3, 5), material);
	obj.position.set(x, y, z);
	obj.scale.setScalar(size);
	obj.rotation.z = ((x % 1) - 0.5) * 0.8;
	parent.add(obj);
	const shell = new THREE.Mesh(obj.geometry, ink);
	shell.scale.setScalar(1.07);
	obj.add(shell);
	return obj;
}
function seeded(seed) {
	return () => {
		seed |= 0;
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export function createArt(scene) {
	let world = new THREE.Group();
	world.name = "mine_art";
	scene.add(world);
	const particles = [],
		pulses = [],
		currents = [],
		vents = [];
	const fill = new THREE.HemisphereLight(0xb9f4e5, 0x142233, 2.15);
	scene.add(fill);
	const key = new THREE.DirectionalLight(0xffdeb0, 3.1);
	key.position.set(-10, 24, 25);
	scene.add(key);
	const cool = new THREE.DirectionalLight(0x8fded7, 1.4);
	cool.position.set(30, 4, 8);
	scene.add(cool);

	function buildLevel(level) {
		disposeObject(world);
		world = new THREE.Group();
		world.name = "mine_art";
		scene.add(world);
		clearEffects();
		pulses.length = currents.length = vents.length = 0;
		const rnd = seeded(751 + level.index * 884),
			palettes = [
				[0x0e2632, 0x173b45, 0x244c54, 0x507a78],
				[0x281d2b, 0x3b2c39, 0x51434d, 0x7b6b65],
				[0x0c2534, 0x18384c, 0x244c61, 0x567b86],
			];
		const pal = palettes[level.index % palettes.length];
		const localRock = makeMat(pal[2]),
			localLight = makeMat(pal[3]),
			localDeep = makeMat(pal[1]);
		scene.background = new THREE.Color(pal[0]);
		box(
			world,
			27,
			15,
			-8,
			70,
			45,
			0.4,
			new THREE.MeshBasicMaterial({ color: pal[0] }),
			false,
		);

		// A deep, broken rock wall: large silhouettes read first, smaller seams second.
		for (let i = 0; i < 110; i++) {
			const x = rnd() * 64 - 5,
				y = rnd() * 38 - 4;
			const obj = new THREE.Mesh(
				lowBallGeo,
				i % 4 === 0 ? localRock : localDeep,
			);
			obj.position.set(x, y, -6 - rnd() * 2);
			obj.scale.set(2 + rnd() * 4, 1 + rnd() * 3.8, 0.3 + rnd() * 1.2);
			obj.rotation.z = rnd() * 6;
			world.add(obj);
		}
		for (let x = -1; x < 57; x += 7) {
			rod(world, [x, 2, -4.4], [x + 0.3, 29, -4.4], 0.1, mats.darkSteel);
			for (let y = 5; y < 29; y += 7) {
				rod(
					world,
					[x - 1, y - 1, -4.4],
					[x + 1.2, y + 1, -4.4],
					0.055,
					mats.steel,
				);
				ball(world, x, y, -4.15, 0.13, mats.amber, [1, 1, 0.5], false);
			}
		}
		for (let y of [9, 21, 28.8]) {
			const pts = [];
			for (let x = -2; x < 58; x += 1)
				pts.push([x, y - Math.sin(((x + 2) / 8) * Math.PI) * 0.55, -3.6]);
			line(world, pts, 0x091a25);
			const wire = pts.map((p) => [p[0], p[1] + 0.08, p[2] + 0.02]);
			line(world, wire, 0x78908a);
		}
		panel(
			world,
			`DEEPWORKS / ${["LANTERN HOLLOW", "MAGMA WORKS", "THE DROWNED VAULT"][level.index % 3]}`,
			27,
			28.5,
			-3.8,
			14,
			1.3,
			{ color: "#839c96", border: "#304e53", bg: "#102731" },
		);
		panel(world, "NO ONE LEFT BELOW.", 28, 17.7, -3.4, 9, 1.15, {
			color: "#67867f",
			border: "#29474e",
			bg: "#102731",
		});

		// Mineral seams and stalactites remain behind the playable silhouettes.
		for (let i = 0; i < 42; i++) {
			const x = rnd() * 54,
				y = rnd() * 27 + 1,
				s = 0.2 + rnd() * 0.65;
			crystal(world, x, y, -4, s, level.index === 1 ? mats.orange : mats.teal);
			if (i % 3 === 0)
				crystal(world, x + 0.22, y - 0.1, -3.95, s * 0.6, mats.glow);
		}
		for (let i = 0; i < 30; i++) {
			const x = i * 1.9,
				h = 0.7 + rnd() * 2.6;
			const geo = new THREE.ConeGeometry(0.3 + rnd() * 0.7, h, 5);
			const stal = new THREE.Mesh(geo, localDeep);
			stal.position.set(x, 30 - h / 2, -2);
			stal.rotation.z = Math.PI;
			world.add(stal);
		}

		for (const s of level.solids) {
			const metallic = s.type === "metal",
				base = metallic ? mats.darkSteel : localRock;
			box(world, s.x, s.y, -0.1, s.w, s.h, 2.5, base);
			const topY = s.y + s.h / 2;
			box(
				world,
				s.x,
				topY - 0.1,
				1.24,
				s.w,
				0.2,
				0.18,
				metallic ? mats.steel : localLight,
				false,
			);
			// Individual slabs, seams and faceted debris give every wall its own surface.
			if (s.h > 1.8) {
				const count = Math.min(32, Math.floor((s.w * s.h) / 2));
				for (let i = 0; i < count; i++) {
					const tx = s.x + (rnd() - 0.5) * Math.max(0.1, s.w - 0.4),
						ty = s.y + (rnd() - 0.5) * Math.max(0.1, s.h - 0.4);
					const facet = new THREE.Mesh(
						lowBallGeo,
						i % 3 ? localDeep : localLight,
					);
					facet.position.set(tx, ty, 1.22);
					facet.scale.set(0.3 + rnd() * 1.4, 0.15 + rnd() * 0.7, 0.1);
					facet.rotation.z = rnd() * 4;
					world.add(facet);
					if (i % 3 === 0)
						line(
							world,
							[
								[tx - 0.4, ty + 0.1, 1.4],
								[tx, ty, 1.42],
								[tx + 0.4, ty + 0.3, 1.4],
							],
							pal[0],
						);
				}
			}
			if (s.w > 5 && s.h < 3) {
				for (let x = s.x - s.w / 2 + 0.55; x < s.x + s.w / 2; x += 2) {
					box(world, x, topY - 0.2, 1.36, 0.65, 0.16, 0.08, mats.amber, false);
					rod(
						world,
						[x, s.y - s.h / 2, -0.6],
						[x + 1.2, s.y - s.h / 2 - 1.2, -0.6],
						0.09,
						mats.darkSteel,
					);
				}
				rod(
					world,
					[s.x - s.w / 2, topY + 0.18, -0.9],
					[s.x + s.w / 2, topY + 0.18, -0.9],
					0.07,
					mats.steel,
				);
			}
		}

		const barriers = new Map();
		for (const wall of level.barriers) {
			const group = new THREE.Group();
			group.position.set(wall.x, wall.y, 0);
			world.add(group);
			box(group, 0, 0, 0.1, wall.w, wall.h, 2.3, mats.orange);
			for (let y = -wall.h / 2 + 0.15; y < wall.h / 2; y += 0.85) {
				const strip = box(
					group,
					0,
					y,
					1.28,
					wall.w * 0.92,
					0.2,
					0.1,
					mats.ink,
					false,
				);
				strip.rotation.z = -0.35;
			}
			box(group, -wall.w / 2, 0, 1.3, 0.16, wall.h, 0.15, mats.steel);
			box(group, wall.w / 2, 0, 1.3, 0.16, wall.h, 0.15, mats.steel);
			if (wall.h > 2)
				panel(
					group,
					"BLAST",
					0,
					0.25,
					1.45,
					Math.max(0.8, wall.w * 0.95),
					0.7,
					{ color: "#172b30", bg: "#ffe0a1", border: "#172b30" },
				);
			box(group, 0, wall.h / 2 + 0.17, 0.6, 0.35, 0.25, 0.35, mats.red);
			barriers.set(wall.id, group);
		}

		const docks = [];
		for (const d of level.docks) {
			const group = new THREE.Group();
			group.position.set(d.x, d.y, 0);
			world.add(group);
			box(group, 0, -0.75, -0.1, 2.7, 0.22, 2.2, mats.steel);
			box(group, -0.95, 0.1, -0.6, 0.32, 1.65, 0.5, mats.orange);
			box(group, 0.95, 0.1, -0.6, 0.32, 1.65, 0.5, mats.orange);
			box(group, 0, 1.03, -0.6, 2.3, 0.28, 0.55, mats.darkSteel);
			box(group, 0, -0.56, 0.99, 2.1, 0.07, 0.12, mats.glow, false);
			panel(group, "REFUEL +", 0, 0.97, -0.26, 2.1, 0.55, {
				bg: "#173c3e",
				color: "#a8f7d7",
				border: "#4eac99",
			});
			for (const x of [-0.95, 0.95]) {
				const lamp = ball(
					group,
					x,
					0.55,
					-0.25,
					0.13,
					mats.glow,
					[1, 1, 0.7],
					false,
				);
				pulses.push({ obj: lamp, base: 1, speed: 2 });
			}
			docks.push(group);
		}

		for (const h of level.hazards) {
			if (h.type === "vent") {
				const group = new THREE.Group();
				group.position.set(h.x, h.y, 0);
				world.add(group);
				// Raised steel grating and pressure pipes clearly distinguish steam
				// hazards from the orange lava pools in the excavation below.
				box(group, 0, -0.16, 0.1, h.w + 0.2, 0.35, 2.1, mats.darkSteel);
				box(group, 0, -0.01, 1.2, h.w + 0.25, 0.12, 0.16, mats.steel);
				for (let x = -h.w / 2; x <= h.w / 2; x += 0.27)
					box(group, x, 0.04, 0.1, 0.095, 0.1, 1.95, mats.steel, false);
				for (let x = -h.w / 2 + 0.2; x < h.w / 2; x += 0.55) {
					const stripe = box(
						group,
						x,
						-0.17,
						1.2,
						0.24,
						0.13,
						0.045,
						mats.amber,
						false,
					);
					stripe.rotation.z = -0.4;
				}
				const indicatorMaterial = new THREE.MeshBasicMaterial({
					color: 0xff6c50,
				});
				const steamMaterial = new THREE.MeshBasicMaterial({
					color: 0xffbd9c,
					transparent: true,
					opacity: 0.38,
					depthWrite: false,
				});
				const wisps = [],
					lamps = [];
				const nozzleCount = Math.max(2, Math.round(h.w / 1.1));
				for (let n = 0; n < nozzleCount; n++) {
					const x = ((n + 0.5) / nozzleCount - 0.5) * h.w;
					rod(group, [x, -0.1, -0.35], [x, 0.18, -0.35], 0.16, mats.steel);
					const nozzle = new THREE.Mesh(
						new THREE.TorusGeometry(0.14, 0.055, 5, 10),
						mats.darkSteel,
					);
					nozzle.rotation.x = Math.PI / 2;
					nozzle.position.set(x, 0.2, -0.35);
					group.add(nozzle);
					for (let k = 0; k < 5; k++) {
						const wisp = new THREE.Mesh(lowBallGeo, steamMaterial);
						group.add(wisp);
						wisps.push({
							mesh: wisp,
							x,
							phase: (k / 5 + n * 0.13) % 1,
							nozzle: n,
						});
					}
				}
				for (const x of [-h.w / 2 - 0.15, h.w / 2 + 0.15]) {
					box(group, x, 0.16, 0.83, 0.18, 0.5, 0.2, mats.steel);
					lamps.push(
						ball(group, x, 0.45, 0.87, 0.14, indicatorMaterial, [1, 1, 0.8]),
					);
				}
				panel(group, "STEAM", 0, -0.3, 1.31, Math.min(2, h.w * 0.7), 0.36, {
					bg: "#203540",
					color: "#ffdda0",
					border: "#526873",
				});
				vents.push({
					group,
					wisps,
					lamps,
					indicatorMaterial,
					steamMaterial,
					active: true,
				});
				continue;
			}
			const liquid = h.type === "water";
			const group = new THREE.Group();
			group.position.set(h.x, h.y, 0);
			world.add(group);
			box(
				group,
				0,
				0,
				-0.25,
				h.w,
				h.h,
				1.8,
				liquid ? mats.water : mats.hot,
				false,
			);
			const surface = box(
				group,
				0,
				h.h / 2,
				0.7,
				h.w,
				0.1,
				0.45,
				liquid ? mats.glow : mats.lamp,
				false,
			);
			pulses.push({ obj: surface, base: 1, speed: liquid ? 1 : 3, axis: "y" });
			for (let x = -h.w / 2 + 0.3; x < h.w / 2; x += 0.8) {
				if (liquid) {
					line(
						group,
						[
							[x, h.h / 2 - 0.24, 1],
							[x + 0.5, h.h / 2 - 0.24, 1],
						],
						0x84d8e2,
					);
				} else {
					const bubble = ball(
						group,
						x,
						h.h / 2,
						0.6,
						0.12 + rnd() * 0.15,
						mats.lamp,
						[1, 0.7, 1],
						false,
					);
					pulses.push({ obj: bubble, base: 1, speed: 3 + rnd() * 4 });
				}
			}
			if (liquid) currents.push({ group, y: h.y });
			if (!liquid) {
				const l = new THREE.PointLight(0xff4e26, 9, Math.max(h.w, 5), 1.5);
				l.position.set(h.x, h.y + 0.7, 3);
				world.add(l);
			}
		}

		// Small work lamps cast warm islands into the cold excavation.
		for (let i = 0; i < 9; i++) {
			const x = 3 + i * 6,
				y = i % 2 ? 19.5 : 27;
			rod(world, [x, y + 0.8, -2.3], [x, y, -2.3], 0.035, mats.steel);
			box(world, x, y, -2, 0.8, 0.16, 0.5, mats.darkSteel);
			ball(world, x, y - 0.13, -1.85, 0.18, mats.lamp, [1.4, 0.4, 1], false);
			// A translucent polygon rather than a foggy bloom keeps the printed-ink look.
			const shape = new THREE.Shape();
			shape.moveTo(-0.2, 0);
			shape.lineTo(0.2, 0);
			shape.lineTo(2, -5);
			shape.lineTo(-2, -5);
			shape.closePath();
			const beam = new THREE.Mesh(
				new THREE.ShapeGeometry(shape),
				new THREE.MeshBasicMaterial({
					color: 0xffe2a0,
					transparent: true,
					opacity: 0.035,
					depthWrite: false,
				}),
			);
			beam.position.set(x, y - 0.1, -2.7);
			world.add(beam);
		}

		// Hoses, drills, reels, supply boxes: visual evidence of the interrupted shift.
		for (const d of level.docks) {
			box(world, d.x - 2, d.y - 0.25, -0.5, 0.8, 0.9, 0.8, mats.orange);
			box(world, d.x - 2, d.y + 0.23, -0.5, 0.9, 0.12, 0.9, mats.steel);
			rod(
				world,
				[d.x - 2, d.y - 0.1, 0.08],
				[d.x - 2, d.y + 0.1, 0.08],
				0.13,
				mats.cream,
			);
			const hose = [];
			for (let t = 0; t < 31; t++) {
				const a = (t / 30) * Math.PI * 3;
				hose.push([
					d.x - 1.7 + Math.cos(a) * 0.45,
					d.y - 0.6 + Math.sin(a) * 0.2,
					0.35,
				]);
			}
			line(world, hose, 0x9fb8a4);
		}
		const exit = new THREE.Group();
		exit.position.set(level.exit.x, level.exit.y, 0);
		world.add(exit);
		box(exit, 0, -0.82, -0.4, 3.4, 0.35, 2.5, mats.darkSteel);
		for (const x of [-1.35, 1.35]) {
			box(exit, x, 0.4, -0.9, 0.3, 2.5, 0.6, mats.steel);
			box(exit, x, 0.6, -0.56, 0.08, 1.75, 0.1, mats.glow, false);
		}
		box(exit, 0, 1.7, -0.9, 3.2, 0.35, 0.65, mats.orange);
		panel(
			exit,
			level.index === 2 ? "SURFACE ↑" : "LIFT ↑",
			0,
			1.7,
			-0.5,
			2.8,
			0.6,
			{ bg: "#14352f", color: "#bcf9be", border: "#569b81" },
		);
		const gate = box(
			exit,
			0,
			0.2,
			-0.9,
			2.3,
			2.25,
			0.08,
			new THREE.MeshBasicMaterial({
				color: 0x7ce6b5,
				transparent: true,
				opacity: 0.07,
				depthWrite: false,
			}),
			false,
		);
		pulses.push({ obj: gate, base: 1, speed: 1.5 });
		return { group: world, barriers, docks, exit, vents };
	}

	function createPilot(color = 0xffc457) {
		const group = new THREE.Group(),
			suit = makeMat(color),
			body = new THREE.Group();
		body.name = "pilot_body";
		group.add(body);
		box(body, 0, -0.08, 0, 0.58, 0.73, 0.44, suit);
		box(body, 0, -0.1, 0.26, 0.36, 0.31, 0.12, mats.darkSteel);
		box(body, 0.06, -0.1, 0.335, 0.19, 0.065, 0.025, mats.glow, false);
		box(body, -0.37, -0.01, -0.05, 0.24, 0.63, 0.4, mats.steel);
		box(body, -0.39, -0.11, 0.18, 0.12, 0.22, 0.08, mats.red);
		rod(
			body,
			[-0.37, 0.27, -0.06],
			[-0.16, 0.43, -0.06],
			0.065,
			mats.darkSteel,
		);
		const helmet = ball(body, 0, 0.55, 0.02, 0.38, suit, [1, 0.92, 0.9]);
		box(body, 0.11, 0.55, 0.29, 0.55, 0.23, 0.14, mats.darkSteel);
		box(body, 0.14, 0.58, 0.375, 0.33, 0.06, 0.025, mats.glow, false);
		ball(body, 0.31, 0.75, 0.2, 0.11, mats.lamp, [0.7, 1, 0.7]);
		rod(body, [-0.14, 0.83, -0.02], [-0.14, 1.05, -0.02], 0.055, mats.steel);
		const rotor = new THREE.Group();
		rotor.name = "rotor";
		rotor.position.set(-0.14, 1.05, -0.02);
		body.add(rotor);
		box(rotor, 0, 0, 0, 1.85, 0.065, 0.15, mats.cream);
		box(rotor, 0, 0, 0, 0.14, 0.065, 1.35, mats.cream);
		ball(rotor, 0, 0.03, 0, 0.12, mats.darkSteel);
		for (const [name, x] of [
			["left_leg", -0.19],
			["right_leg", 0.18],
		]) {
			const leg = new THREE.Group();
			leg.name = name;
			leg.position.set(x, -0.43, 0);
			body.add(leg);
			box(leg, 0, -0.16, 0, 0.22, 0.37, 0.25, mats.darkSteel);
			box(leg, 0.07, -0.36, 0.06, 0.32, 0.16, 0.4, mats.cream);
		}
		const arm = new THREE.Group();
		arm.position.set(0.29, 0.1, 0.12);
		body.add(arm);
		rod(arm, [0, 0, 0], [0.3, -0.12, 0.12], 0.11, suit);
		rod(arm, [0.3, -0.12, 0.12], [0.5, -0.08, 0.16], 0.095, mats.cream);
		box(arm, 0.53, -0.02, 0.14, 0.42, 0.19, 0.21, mats.darkSteel);
		box(arm, 0.77, -0.02, 0.14, 0.11, 0.12, 0.15, mats.glow);
		const flame = new THREE.Group();
		flame.position.set(-0.35, -0.55, -0.05);
		body.add(flame);
		flame.visible = false;
		const outer = new THREE.Mesh(
			new THREE.ConeGeometry(0.16, 0.75, 5),
			mats.orange,
		);
		outer.rotation.z = Math.PI;
		outer.position.y = -0.25;
		flame.add(outer);
		const inner = new THREE.Mesh(
			new THREE.ConeGeometry(0.09, 0.48, 5),
			mats.lamp,
		);
		inner.rotation.z = Math.PI;
		inner.position.set(0, -0.13, 0.1);
		flame.add(inner);
		const mixer = new THREE.AnimationMixer(group);
		mixer
			.clipAction(
				new THREE.AnimationClip("rotor_flight", 1, [
					new THREE.NumberKeyframeTrack(
						"rotor.rotation[y]",
						[0, 1],
						[0, Math.PI * 18],
					),
					new THREE.NumberKeyframeTrack(
						"pilot_body.position[y]",
						[0, 0.5, 1],
						[0, 0.035, 0],
					),
					new THREE.NumberKeyframeTrack(
						"left_leg.rotation[z]",
						[0, 0.5, 1],
						[0.06, -0.08, 0.06],
					),
					new THREE.NumberKeyframeTrack(
						"right_leg.rotation[z]",
						[0, 0.5, 1],
						[-0.06, 0.08, -0.06],
					),
				]),
			)
			.play();
		return { group, mixer, rotor, flame, body, helmet, face: helmet };
	}

	function createMiner(index = 0) {
		const group = new THREE.Group(),
			inner = new THREE.Group();
		inner.name = "miner_body";
		group.add(inner);
		const clothing = [mats.teal, mats.red, mats.orange][index % 3];
		box(inner, 0, -0.1, 0, 0.56, 0.62, 0.42, clothing);
		for (const x of [-0.17, 0.17]) {
			box(inner, x, -0.54, 0, 0.22, 0.35, 0.3, mats.darkSteel);
			box(inner, x + 0.04, -0.75, 0.08, 0.3, 0.16, 0.4, mats.cream);
		}
		ball(inner, 0, 0.4, 0, 0.32, mats.cream, [1, 0.95, 1]);
		ball(inner, 0, 0.59, 0, 0.36, mats.amber, [1.12, 0.7, 1.1]);
		box(inner, 0, 0.47, 0.15, 0.85, 0.09, 0.55, mats.amber);
		ball(inner, 0, 0.6, 0.33, 0.12, mats.lamp, [1, 0.8, 0.45]);
		box(inner, -0.12, 0.4, 0.31, 0.045, 0.065, 0.04, mats.ink, false);
		box(inner, 0.12, 0.4, 0.31, 0.045, 0.065, 0.04, mats.ink, false);
		const arm = new THREE.Group();
		arm.position.set(0.32, 0.11, 0.03);
		arm.name = "wave";
		inner.add(arm);
		rod(arm, [0, 0, 0], [0, 0.43, 0], 0.1, clothing);
		ball(arm, 0, 0.5, 0.02, 0.13, mats.cream);
		rod(inner, [-0.32, 0.06, 0], [-0.42, -0.25, 0.05], 0.1, clothing);
		for (const x of [-0.17, 0.17])
			box(inner, x, -0.1, 0.23, 0.045, 0.6, 0.06, mats.cream, false);
		const mixer = new THREE.AnimationMixer(group);
		mixer
			.clipAction(
				new THREE.AnimationClip("rescue_wave", 1.2, [
					new THREE.NumberKeyframeTrack(
						"wave.rotation[z]",
						[0, 0.3, 0.6, 0.9, 1.2],
						[-0.5, 0.4, -0.5, 0.4, -0.5],
					),
					new THREE.NumberKeyframeTrack(
						"miner_body.position[y]",
						[0, 0.6, 1.2],
						[0, 0.08, 0],
					),
				]),
			)
			.play();
		return { group, mixer };
	}

	function createEnemy(type = "bat") {
		const group = new THREE.Group(),
			isSpider = type === "spider",
			body = new THREE.Group();
		group.add(body);
		body.name = "creature_body";
		ball(
			body,
			0,
			0,
			0,
			0.35,
			isSpider ? mats.red : mats.deep,
			isSpider ? [1.2, 0.8, 1] : [1, 1.2, 0.9],
		);
		ball(body, 0, -0.15, 0.1, 0.2, mats.rockLight, [1, 1, 0.8]);
		for (const x of [-0.12, 0.12]) {
			ball(body, x, 0.06, 0.29, 0.09, mats.lamp, [1, 0.65, 0.6]);
			ball(body, x + 0.02, 0.05, 0.34, 0.035, mats.ink, [1, 1, 0.5], false);
		}
		const tracks = [];
		if (isSpider) {
			for (const side of [-1, 1])
				for (let j = 0; j < 4; j++) {
					const leg = new THREE.Group();
					leg.name = `leg_${side}_${j}`;
					body.add(leg);
					leg.position.set(side * 0.2, -0.03 + j * 0.08, -0.08 + j * 0.1);
					rod(
						leg,
						[0, 0, 0],
						[side * 0.5, 0.15 - j * 0.09, 0],
						0.045,
						mats.darkSteel,
					);
					rod(
						leg,
						[side * 0.5, 0.15 - j * 0.09, 0],
						[side * 0.7, -0.35, 0.02],
						0.04,
						mats.darkSteel,
					);
					tracks.push(
						new THREE.NumberKeyframeTrack(
							`${leg.name}.rotation[z]`,
							[0, 0.25, 0.5],
							[side * 0.12, -side * 0.13, side * 0.12],
						),
					);
				}
		} else {
			for (const side of [-1, 1]) {
				const wing = new THREE.Group();
				wing.name = side < 0 ? "wing_left" : "wing_right";
				wing.position.x = side * 0.2;
				body.add(wing);
				const shape = new THREE.Shape();
				shape.moveTo(0, 0.1);
				shape.lineTo(side * 0.55, 0.55);
				shape.lineTo(side * 1.05, 0.22);
				shape.lineTo(side * 0.73, -0.08);
				shape.lineTo(side * 0.48, 0.02);
				shape.lineTo(side * 0.25, -0.25);
				shape.lineTo(0, -0.12);
				shape.closePath();
				const mesh = new THREE.Mesh(
					new THREE.ShapeGeometry(shape),
					new THREE.MeshBasicMaterial({
						color: type === "moth" ? 0xf3b86b : 0x80989c,
						side: THREE.DoubleSide,
					}),
				);
				wing.add(mesh);
				line(
					wing,
					[
						[0, 0.1, 0.02],
						[side * 0.55, 0.55, 0.02],
						[side * 1.05, 0.22, 0.02],
						[side * 0.73, -0.08, 0.02],
						[side * 0.48, 0.02, 0.02],
						[side * 0.25, -0.25, 0.02],
						[0, -0.12, 0.02],
					],
					INK,
				);
				rod(wing, [0, 0.05, 0.01], [side * 0.65, 0.28, 0.01], 0.025, mats.ink);
				tracks.push(
					new THREE.NumberKeyframeTrack(
						`${wing.name}.rotation[z]`,
						[0, 0.15, 0.3],
						[side * -0.35, side * 0.45, side * -0.35],
					),
				);
			}
			for (const x of [-0.18, 0.18]) {
				const ear = new THREE.Mesh(
					new THREE.ConeGeometry(0.12, 0.35, 3),
					mats.deep,
				);
				ear.position.set(x, 0.4, 0);
				body.add(ear);
			}
		}
		tracks.push(
			new THREE.NumberKeyframeTrack(
				"creature_body.position[y]",
				[0, 0.25, 0.5],
				[0, 0.06, 0],
			),
		);
		const mixer = new THREE.AnimationMixer(group);
		mixer
			.clipAction(
				new THREE.AnimationClip(
					"creature_locomotion",
					isSpider ? 0.5 : 0.3,
					tracks,
				),
			)
			.play();
		return { group, mixer };
	}

	function effect(type, x, y, value) {
		const parent = new THREE.Group();
		parent.position.set(x, y, 1.8);
		scene.add(parent);
		const rnd = seeded(
			Math.floor(x * 11231 + y * 4001 + particles.length * 71),
		);
		const count =
			type === "explosion"
				? 32
				: type === "rescue"
					? 24
					: type === "hit"
						? 10
						: 7;
		const material = new THREE.MeshBasicMaterial({
			color:
				value ||
				(type === "rescue"
					? 0xa4f7d1
					: type === "explosion"
						? 0xffb44e
						: 0xffdf9a),
			transparent: true,
		});
		for (let i = 0; i < count; i++) {
			const mesh = new THREE.Mesh(i % 3 ? boxGeo : lowBallGeo, material);
			const angle = rnd() * Math.PI * 2,
				speed = type === "explosion" ? 3 + rnd() * 7 : 1 + rnd() * 4;
			const s = type === "explosion" ? 0.12 + rnd() * 0.3 : 0.05 + rnd() * 0.12;
			mesh.scale.setScalar(s);
			parent.add(mesh);
			particles.push({
				mesh,
				parent,
				material,
				vx: Math.cos(angle) * speed,
				vy: Math.sin(angle) * speed + (type === "rescue" ? 3 : 0),
				life: 0.4 + rnd() * 0.6,
				total: 1,
				type,
			});
		}
		if (type === "explosion" || type === "rescue") {
			const ring = new THREE.Mesh(
				new THREE.RingGeometry(0.8, 0.93, 32),
				material,
			);
			parent.add(ring);
			particles.push({
				mesh: ring,
				parent,
				material,
				vx: 0,
				vy: 0,
				life: 0.4,
				total: 0.4,
				type: "ring",
			});
		}
		return parent;
	}

	function update(dt, time, stageTime = time) {
		for (const p of pulses) {
			p.originalScale ||= p.obj.scale.clone();
			const s = 1 + Math.sin(time * p.speed) * 0.08;
			p.obj.scale.copy(p.originalScale);
			if (p.axis === "y") p.obj.scale.y *= s;
			else p.obj.scale.multiplyScalar(s);
		}
		for (const c of currents)
			c.group.position.y = c.y + Math.sin(time * 1.3) * 0.035;
		const steamActive = Math.sin(stageTime * 1.15) > -0.05;
		for (const vent of vents) {
			vent.active = steamActive;
			vent.indicatorMaterial.color.setHex(steamActive ? 0xff6c50 : 0x69bfff);
			vent.steamMaterial.color.setHex(steamActive ? 0xffb394 : 0x87c8ee);
			vent.steamMaterial.opacity = steamActive ? 0.34 : 0.13;
			for (const wisp of vent.wisps) {
				const age = (time * (steamActive ? 0.85 : 0.4) + wisp.phase) % 1;
				const height = steamActive ? 0.2 + age * 1.92 : 0.13 + age * 0.38;
				wisp.mesh.position.set(
					wisp.x + Math.sin(age * 8 + wisp.nozzle) * age * 0.22,
					height,
					0.12,
				);
				const size = steamActive ? 0.1 + age * 0.28 : 0.06 + age * 0.11;
				wisp.mesh.scale.set(size, size * (steamActive ? 1.45 : 0.7), size);
				wisp.mesh.rotation.z = time * 0.35 + wisp.phase * 6;
				wisp.mesh.visible = age < 0.92;
			}
		}
		for (let i = particles.length - 1; i >= 0; i--) {
			const p = particles[i];
			p.life -= dt;
			if (p.life <= 0) {
				p.parent.remove(p.mesh);
				if (!sharedGeometries.has(p.mesh.geometry)) p.mesh.geometry.dispose();
				if (!p.parent.children.length) {
					scene.remove(p.parent);
					p.material.dispose();
				}
				particles.splice(i, 1);
				continue;
			}
			if (p.type === "ring")
				p.mesh.scale.setScalar(1 + (1 - p.life / p.total) * 5);
			else {
				p.mesh.position.x += p.vx * dt;
				p.mesh.position.y += p.vy * dt;
				p.vy -= dt * 3;
				p.mesh.rotation.z += dt * 6;
				p.mesh.scale.multiplyScalar(Math.max(0.01, 1 - dt * 1.2));
			}
			p.material.opacity = Math.max(0, p.life);
		}
	}
	function clearEffects() {
		const parents = new Set(particles.map((p) => p.parent));
		for (const parent of parents) disposeObject(parent);
		particles.length = 0;
	}
	return {
		buildLevel,
		createPilot,
		createMiner,
		createEnemy,
		effect,
		update,
		clearEffects,
		disposeObject,
		materials: mats,
		makeMat,
		panel,
		box,
	};
}
