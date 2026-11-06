import * as THREE from "three/webgpu";

const ink = new THREE.LineBasicMaterial({
	color: 0x223c45,
	transparent: true,
	opacity: 0.8,
});
const red = new THREE.MeshStandardMaterial({
	color: 0xb44738,
	roughness: 0.85,
	flatShading: true,
});
const gold = new THREE.MeshStandardMaterial({
	color: 0xf2c66c,
	roughness: 0.8,
	flatShading: true,
});
const dark = new THREE.MeshStandardMaterial({
	color: 0x274b58,
	roughness: 0.85,
	flatShading: true,
});
const cream = new THREE.MeshStandardMaterial({
	color: 0xffe6b0,
	roughness: 0.8,
	flatShading: true,
});
function block(parent, x, y, z, w, h, d, material = red, outline = true) {
	const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
	mesh.position.set(x, y, z);
	mesh.castShadow = true;
	mesh.receiveShadow = true;
	parent.add(mesh);
	if (outline)
		mesh.add(
			new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), ink),
		);
	return mesh;
}
function sign(parent, text, x, y, z, w = 2.7, h = 0.65) {
	const canvas = document.createElement("canvas");
	canvas.width = 512;
	canvas.height = 128;
	const ctx = canvas.getContext("2d");
	ctx.fillStyle = "#f8d98d";
	ctx.fillRect(0, 0, 512, 128);
	ctx.fillStyle = "#254552";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.font = "bold 83px Georgia";
	ctx.fillText(text, 256, 70, 480);
	const tex = new THREE.CanvasTexture(canvas);
	tex.colorSpace = THREE.SRGBColorSpace;
	const mesh = new THREE.Mesh(
		new THREE.PlaneGeometry(w, h),
		new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }),
	);
	mesh.position.set(x, y, z);
	parent.add(mesh);
	return mesh;
}
function beam(parent, a, b, thickness, material = gold) {
	const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5),
		delta = new THREE.Vector3().subVectors(b, a);
	const mesh = block(
		parent,
		mid.x,
		mid.y,
		mid.z,
		thickness,
		delta.length(),
		thickness,
		material,
	);
	mesh.quaternion.setFromUnitVectors(
		new THREE.Vector3(0, 1, 0),
		delta.normalize(),
	);
	return mesh;
}

export function createExtras(scene) {
	const booth = new THREE.Group();
	booth.name = "A very discreet telephone booth";
	booth.position.set(18, 1, 92);
	scene.add(booth);
	block(booth, 0, 0.1, 0, 3.4, 0.25, 3.3, dark);
	block(booth, 0, 4.8, 0, 3.5, 0.4, 3.35, red);
	block(booth, 0, 5.1, 0, 2.8, 0.2, 2.7, gold);
	block(booth, 0, 5.32, 0, 1.8, 0.25, 1.8, red);
	for (const x of [-1.4, 1.4])
		for (const z of [-1.4, 1.4]) {
			block(booth, x, 2.4, z, 0.22, 4.7, 0.22, red);
			block(booth, x, 4.7, z, 0.35, 0.2, 0.35, gold);
		}
	const glass = new THREE.MeshPhysicalMaterial({
		color: 0x9ed9d9,
		transparent: true,
		opacity: 0.23,
		roughness: 0.15,
		metalness: 0,
		depthWrite: false,
		side: THREE.DoubleSide,
	});
	for (const x of [-1.4, 1.4]) {
		block(booth, x, 2.25, 0, 0.06, 3.6, 2.65, glass, false);
		for (const z of [-0.7, 0.7]) block(booth, x, 2.25, z, 0.11, 3.6, 0.1, red);
		for (const y of [1.1, 2.3, 3.5])
			block(booth, x, y, 0, 0.11, 0.11, 2.7, red);
	}
	block(booth, 0, 2.25, -1.4, 2.65, 3.6, 0.06, glass, false);
	block(booth, 0, 0.55, 1.4, 2.7, 0.8, 0.15, red);
	for (const x of [-0.7, 0.7]) block(booth, x, 2.5, 1.4, 0.1, 3.2, 0.12, red);
	for (const y of [1.1, 2.3, 3.5]) block(booth, 0, y, 1.4, 2.7, 0.1, 0.12, red);
	block(booth, 0, 2.4, 1.405, 2.6, 3.5, 0.035, glass, false);
	block(booth, 0.95, 2.2, 1.52, 0.1, 0.5, 0.1, gold);
	for (const z of [-1.425, 1.425]) sign(booth, "PHONE", 0, 4.35, z, 2.65, 0.6);
	block(booth, 0, 2.75, -1.17, 0.95, 1.3, 0.3, dark);
	block(booth, 0, 2.8, -0.99, 0.68, 0.7, 0.07, gold);
	const dial = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.05, 5, 12), dark);
	dial.position.set(0, 2.8, -0.94);
	booth.add(dial);
	block(booth, 0, 3.42, -0.91, 0.85, 0.14, 0.15, dark);
	for (const x of [-0.37, 0.37])
		block(booth, x, 3.28, -0.9, 0.18, 0.3, 0.2, dark);
	for (let i = 0; i < 7; i++) {
		const coil = new THREE.Mesh(
			new THREE.TorusGeometry(0.065, 0.018, 4, 8),
			dark,
		);
		coil.position.set(-0.44, 3.16 - i * 0.11, -0.9);
		coil.rotation.y = Math.PI / 2;
		booth.add(coil);
	}
	const bridgePieces = [];
	const piecePositions = [
		[-115, 3, 115],
		[-85, 7, 95],
		[-120, 4, 5],
	];
	for (let i = 0; i < 3; i++) {
		const piece = new THREE.Group();
		piece.name = `Bridge reinforcement ${i + 1}`;
		piece.position.set(...piecePositions[i]);
		scene.add(piece);
		bridgePieces.push(piece);
		block(piece, 0, 0.15, 0, 8, 0.3, 5, dark);
		for (const z of [-2.35, 2.35]) {
			block(piece, 0, 1.75, z, 8, 0.24, 0.3, red);
			block(piece, 0, 0.4, z, 8, 0.24, 0.3, red);
			for (const x of [-3.8, 0, 3.8])
				block(piece, x, 1.05, z, 0.23, 1.65, 0.3, gold);
			for (let j = 0; j < 4; j++) {
				const x = -3.8 + j * 1.9;
				beam(
					piece,
					new THREE.Vector3(x, 0.5, z),
					new THREE.Vector3(x + 1.9, 1.7, z),
					0.16,
					gold,
				);
			}
		}
		for (const x of [-3.5, 3.5])
			for (const z of [-2.1, 2.1]) {
				const bolt = new THREE.Mesh(
					new THREE.CylinderGeometry(0.18, 0.18, 0.14, 6),
					gold,
				);
				bolt.position.set(x, 0.37, z);
				piece.add(bolt);
			}
		sign(piece, String(i + 1).padStart(2, "0"), 0, 1.1, 2.52, 1.1, 0.7);
	}
	const repairSockets = [
		new THREE.Vector3(-215, 6, 68),
		new THREE.Vector3(-192, 6, 68),
		new THREE.Vector3(-170, 6, 68),
	];
	const markers = [];
	const ghostMat = new THREE.LineBasicMaterial({
		color: 0xffce71,
		transparent: true,
		opacity: 0.65,
	});
	repairSockets.forEach((p, i) => {
		const group = new THREE.Group();
		group.name = `Reinforcement socket ${i + 1}`;
		group.position.copy(p);
		scene.add(group);
		const mesh = new THREE.LineSegments(
			new THREE.EdgesGeometry(new THREE.BoxGeometry(8.8, 2.8, 5.8)),
			ghostMat,
		);
		mesh.position.y = 1;
		group.add(mesh);
		const ring = new THREE.Mesh(
			new THREE.TorusGeometry(4.4, 0.065, 5, 40),
			new THREE.MeshBasicMaterial({
				color: 0xffcf78,
				transparent: true,
				opacity: 0.7,
			}),
		);
		ring.rotation.x = Math.PI / 2;
		ring.position.y = 0.12;
		group.add(ring);
		sign(group, `REINFORCE ${i + 1}`, 0, 4.5, 0, 10, 1.25);
		markers.push({ group, ring });
	});
	return {
		booth,
		bridgePieces,
		repairSockets,
		tick(t) {
			markers.forEach((m, i) => {
				m.ring.scale.setScalar(1 + 0.035 * Math.sin(t * 2 + i));
			});
		},
	};
}
