import * as THREE from "three/webgpu";
import RAPIER from "@dimforge/rapier3d-compat";
import { TOPPINGS, BAYS } from "./core.js";

const INK = "#263733";
const palette = {
	ink: INK,
	cream: "#fff0d8",
	white: "#fff9ed",
	peach: "#e9c3a1",
	teal: "#478982",
	dark: "#325c57",
	orange: "#d95734",
};
const geom = {
	box: new THREE.BoxGeometry(1, 1, 1),
	ball: new THREE.SphereGeometry(1, 20, 12),
	cylinder: new THREE.CylinderGeometry(1, 1, 1, 24),
	cone: new THREE.ConeGeometry(1, 1, 24),
};
const materials = new Map();
const gradient = new THREE.DataTexture(
	new Uint8Array([100, 165, 218, 255]),
	4,
	1,
	THREE.RedFormat,
);
gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
gradient.needsUpdate = true;
const inkMaterial = new THREE.MeshBasicMaterial({
	color: INK,
	side: THREE.BackSide,
});
function mat(c) {
	if (!materials.has(c))
		materials.set(
			c,
			new THREE.MeshToonMaterial({ color: c, gradientMap: gradient }),
		);
	return materials.get(c);
}
function shape(parent, type, color, pos, size, outline = true) {
	const m = new THREE.Mesh(geom[type], mat(color));
	m.position.set(...pos);
	m.scale.set(...size);
	m.castShadow = true;
	m.receiveShadow = true;
	if (outline) {
		const o = new THREE.Mesh(geom[type], inkMaterial);
		o.scale.set(1.035, 1.04, 1.035);
		m.add(o);
	}
	parent.add(m);
	return m;
}
function group(parent, pos = [0, 0, 0]) {
	const g = new THREE.Group();
	g.position.set(...pos);
	parent.add(g);
	return g;
}
function text(
	parent,
	content,
	pos,
	width,
	height,
	bg = palette.cream,
	fg = INK,
	font = "bold 70px sans-serif",
) {
	const c = document.createElement("canvas");
	c.width = 1024;
	c.height = Math.round((1024 * height) / width);
	const x = c.getContext("2d");
	x.fillStyle = bg;
	x.fillRect(0, 0, c.width, c.height);
	x.strokeStyle = fg;
	x.lineWidth = 8;
	x.strokeRect(8, 8, c.width - 16, c.height - 16);
	x.fillStyle = fg;
	x.font = font;
	x.textAlign = "center";
	x.textBaseline = "middle";
	const lines = content.split("\n");
	lines.forEach((line, i) =>
		x.fillText(
			line,
			c.width / 2,
			c.height / 2 + (i - (lines.length - 1) / 2) * 85,
			c.width - 50,
		),
	);
	const texture = new THREE.CanvasTexture(c);
	texture.colorSpace = THREE.SRGBColorSpace;
	const m = new THREE.Mesh(
		new THREE.PlaneGeometry(width, height),
		new THREE.MeshBasicMaterial({ map: texture }),
	);
	m.position.set(...pos);
	parent.add(m);
	return m;
}

export class KitchenScene {
	async init(canvas) {
		await RAPIER.init();
		this.world = new RAPIER.World({ x: 0, y: -14, z: 0 });
		this.controller = this.world.createCharacterController(0.02);
		this.controller.setSlideEnabled(true);
		const floor = this.world.createRigidBody(
			RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.25, 0),
		);
		this.world.createCollider(
			RAPIER.ColliderDesc.cuboid(9, 0.2, 7).setFriction(0.8),
			floor,
		);
		for (const [x, z, sx, sz] of [
			[-6.6, 0, 0.2, 5],
			[6.6, 0, 0.2, 5],
			[0, -4, 7, 0.2],
			[0, 4.4, 7, 0.2],
		]) {
			const b = this.world.createRigidBody(
				RAPIER.RigidBodyDesc.fixed().setTranslation(x, 0.7, z),
			);
			this.world.createCollider(RAPIER.ColliderDesc.cuboid(sx, 1, sz), b);
		}
		this.renderer = new THREE.WebGPURenderer({
			canvas,
			antialias: true,
			alpha: false,
			forceWebGL:
				new URLSearchParams(location.search).get("renderer") === "webgl",
		});
		this.renderer.onDeviceLost = (info) => {
			this.deviceLostInfo = info;
			this.renderer._isDeviceLost = true;
			if (this.scene && !this.shuttingDown) this.recoverRenderer();
		};
		window.addEventListener("pagehide", () => {
			this.shuttingDown = true;
		});
		this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
		this.renderer.setClearColor("#f1e7d4");
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
		this.renderer.toneMappingExposure = 1.15;
		await this.renderer.init();
		this.backend = this.renderer.backend.isWebGPUBackend
			? "WebGPU"
			: "WebGL 2 fallback";
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color("#f1e7d4");
		this.scene.fog = new THREE.Fog("#f1e7d4", 38, 80);
		this.camera = new THREE.OrthographicCamera(-16, 16, 9, -9, 0.1, 100);
		this.scene.add(new THREE.HemisphereLight("#fff3d6", "#7b9d91", 2.2));
		const sun = new THREE.DirectionalLight("#fff2d0", 3.8);
		sun.position.set(-7, 18, 9);
		sun.castShadow = true;
		sun.shadow.mapSize.set(2048, 2048);
		sun.shadow.camera.left = sun.shadow.camera.bottom = -14;
		sun.shadow.camera.right = sun.shadow.camera.top = 14;
		sun.shadow.normalBias = 0.045;
		sun.shadow.bias = -0.0001;
		this.scene.add(sun);
		const fill = new THREE.DirectionalLight("#b4e3d7", 1.2);
		fill.position.set(9, 8, -5);
		this.scene.add(fill);
		this.rig = group(this.scene);
		this.foodMeshes = new Map();
		this.chefs = [];
		this.debris = [];
		this.fx = [];
		this.customers = [];
		this.beltMarks = [];
		this.debugLines = new THREE.LineSegments(
			new THREE.BufferGeometry(),
			new THREE.LineBasicMaterial({ color: "#ff3444", depthTest: false }),
		);
		this.scene.add(this.debugLines);
		this.debugLines.visible = false;
		this.cameraOffset = innerWidth < innerHeight ? 0 : -4.8;
		this.cameraPanY = 0;
		this.shake = 0;
		this.totalTime = 0;
		this.buildKitchen();
		this.resize();
		if (this.deviceLostInfo) await this.recoverRenderer();
		return this;
	}
	async recoverRenderer() {
		if (
			this.recovering ||
			this.shuttingDown ||
			!this.renderer.backend.isWebGPUBackend
		)
			return;
		this.recovering = true;
		const previous = this.renderer,
			canvas = previous.domElement.cloneNode(false);
		previous.domElement.replaceWith(canvas);
		const renderer = new THREE.WebGPURenderer({
			canvas,
			antialias: true,
			forceWebGL: true,
		});
		renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
		renderer.setClearColor("#f1e7d4");
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1.15;
		try {
			await renderer.init();
			this.renderer = renderer;
			this.backend = "WebGL 2 fallback";
			previous.onDeviceLost = () => {};
			previous.dispose();
			this.recoveries = (this.recoveries || 0) + 1;
			this.resize();
		} catch (error) {
			this.recoveryError = error.message;
			document.getElementById("load-status").textContent =
				`Graphics recovery failed: ${error.message}`;
			document.getElementById("loading").classList.add("active");
			AIHub.fail(error.message);
		} finally {
			this.recovering = false;
		}
	}
	buildKitchen() {
		const s = this.rig;
		const floor = shape(s, "box", "#5c8c7c", [0, -0.65, 0], [17, 0.9, 13]);
		shape(s, "box", INK, [0, -1.13, 0], [17.15, 0.12, 13.15], false);
		for (let x = -8; x <= 8; x++)
			for (let z = -6; z <= 6; z++) {
				shape(
					s,
					"box",
					(x + z) % 2 ? "#e8d6b9" : "#f7ebd4",
					[x, -0.15, z],
					[0.98, 0.12, 0.98],
					false,
				);
			}
		// The tiled backsplash makes the diorama feel like a little illustrated diner.
		shape(s, "box", "#689f92", [0, 1.4, -5.5], [17, 3.1, 0.25]);
		for (let x = -8; x <= 8; x++)
			for (let y = 0; y < 3; y++) {
				shape(
					s,
					"box",
					y % 2 ? "#82b0a0" : "#91b8a5",
					[x + (y % 2 ? 0.18 : 0), y * 0.75 + 0.3, -5.34],
					[0.94, 0.69, 0.04],
					false,
				);
			}
		shape(s, "box", "#e8ad6e", [0, 3.1, -5.48], [17.3, 0.24, 0.5]);
		shape(s, "box", palette.orange, [-1.4, 3.6, -5.2], [7.3, 1.6, 0.3]);
		text(
			s,
			"P R E S S U R E   G R I L L E R",
			[-1.4, 3.62, -5.02],
			7,
			1.3,
			palette.orange,
			palette.cream,
			"bold 66px sans-serif",
		);
		text(
			s,
			"GOOD FOOD.  QUESTIONABLE CALM.",
			[-1.4, 2.63, -5.16],
			5.8,
			0.45,
			"#f4d9a8",
			INK,
			"bold 60px monospace",
		);
		// Clock, ticket rail, crooked menu and a copper extraction hood.
		const clock = shape(
			s,
			"cylinder",
			palette.cream,
			[-6.5, 2.3, -5.1],
			[0.57, 0.14, 0.57],
		);
		clock.rotation.x = Math.PI / 2;
		const hand = shape(
			s,
			"box",
			INK,
			[-6.5, 2.45, -4.99],
			[0.045, 0.32, 0.025],
			false,
		);
		hand.rotation.z = -0.45;
		shape(s, "box", INK, [-6.36, 2.29, -4.99], [0.3, 0.045, 0.025], false);
		const menu = text(
			s,
			"TODAY’S SPECIAL\nA LITTLE PANIC",
			[5.9, 1.8, -5.08],
			2.4,
			1.5,
			palette.cream,
			INK,
			"bold 70px monospace",
		);
		menu.rotation.z = -0.08;
		shape(s, "box", "#b47d59", [3.55, 3.1, -4.8], [2.1, 0.6, 1.25]);
		shape(s, "box", "#dca679", [3.55, 3.55, -5], [0.9, 0.7, 0.65]);
		for (let i = 0; i < 7; i++)
			shape(
				s,
				"box",
				"#5a6759",
				[2.75 + i * 0.26, 2.78, -4.55],
				[0.1, 0.05, 0.7],
				false,
			);
		// Three conveyor lanes, their dispensers and their little hungry waste bins.
		TOPPINGS.forEach((t, lane) => {
			const z = t.lane;
			shape(s, "box", "#365d55", [0, 0.05, z], [12.8, 0.23, 0.94]);
			shape(s, "box", "#a9bbb0", [0, 0.18, z - 0.44], [12.9, 0.08, 0.08]);
			shape(s, "box", "#a9bbb0", [0, 0.18, z + 0.44], [12.9, 0.08, 0.08]);
			for (let i = 0; i < 17; i++) {
				const m = shape(
					s,
					"box",
					"#568578",
					[-6 + i * 0.75, 0.19, z],
					[0.045, 0.025, 0.76],
					false,
				);
				m.userData.start = m.position.x;
				this.beltMarks.push(m);
			}
			for (const x of [-6.35, 6.35]) {
				const roller = shape(
					s,
					"cylinder",
					"#d6b982",
					[x, 0.1, z],
					[0.17, 1, 0.17],
				);
				roller.rotation.x = Math.PI / 2;
			}
			shape(s, "box", t.color, [-7.15, 0.85, z], [1.25, 1.75, 1.3]);
			shape(s, "box", "#233f38", [-6.5, 0.9, z], [0.04, 0.55, 0.9]);
			text(
				s,
				t.name.toUpperCase(),
				[-7.15, 1.2, z + 0.66],
				1.12,
				0.42,
				t.color,
				INK,
				"bold 105px sans-serif",
			);
			const lid = shape(
				s,
				"cylinder",
				"#e4dbba",
				[-7.15, 1.83, z],
				[0.55, 0.18, 0.55],
			);
			shape(s, "ball", t.color, [-7.15, 2.08, z], [0.35, 0.27, 0.35]);
			shape(s, "box", "#45625a", [7.1, 0.35, z], [1, 0.9, 1.2]);
			shape(s, "box", INK, [7.1, 0.83, z], [0.9, 0.06, 1.08]);
			text(
				s,
				"oops",
				[7.1, 0.45, z + 0.61],
				0.85,
				0.4,
				"#45625a",
				"#f5dfb2",
				"italic 130px serif",
			);
			const label = text(
				s,
				`0${lane + 1}  →`,
				[0, 0.24, z - 0.05],
				1.1,
				0.4,
				"#365d55",
				"#86b69e",
				"bold 110px monospace",
			);
			label.rotation.x = -Math.PI / 2;
		});
		// The three customers have their own colored pass, stool and order marker.
		BAYS.forEach((b, i) => {
			shape(s, "box", b.color, [b.x, 0.52, 4.65], [3.6, 1.2, 1.2]);
			shape(s, "box", palette.cream, [b.x, 1.17, 4.65], [3.8, 0.18, 1.45]);
			for (let l = 0; l < 6; l++)
				shape(
					s,
					"box",
					"#ffffff",
					[b.x - 1.4 + l * 0.57, 0.46, 5.27],
					[0.025, 0.8, 0.02],
					false,
				);
			text(
				s,
				`${i + 1}   ${b.name}`,
				[b.x, 0.65, 5.29],
				2.6,
				0.55,
				b.color,
				INK,
				"bold 105px sans-serif",
			);
			const plate = shape(
				s,
				"cylinder",
				"#fffbdf",
				[b.x, 1.33, 4.5],
				[0.67, 0.045, 0.67],
			);
			const g = group(s, [b.x, 0, 5.75]);
			shape(g, "cylinder", "#42534b", [0, 0.2, 0], [0.13, 0.8, 0.13]);
			shape(g, "cylinder", b.color, [0, 0.64, 0], [0.48, 0.12, 0.48]);
			const customer = group(g, [0, 0.65, 0]);
			customer.name = `customer${i}`;
			shape(
				customer,
				"ball",
				["#cb7055", "#d3aa55", "#789da2"][i],
				[0, 0.45, 0],
				[0.5, 0.62, 0.4],
			);
			shape(customer, "ball", "#f2c39a", [0, 1.16, 0], [0.46, 0.48, 0.4]);
			shape(customer, "ball", "#eca47a", [0.05, 1.12, 0.4], [0.13, 0.13, 0.12]);
			for (const x of [-0.16, 0.17])
				shape(
					customer,
					"ball",
					INK,
					[x, 1.23, 0.35],
					[0.035, 0.05, 0.04],
					false,
				);
			if (i === 0) {
				shape(customer, "ball", "#665548", [0, 1.55, 0], [0.49, 0.19, 0.43]);
			}
			if (i === 1) {
				shape(
					customer,
					"cylinder",
					"#496d60",
					[0, 1.55, 0],
					[0.59, 0.09, 0.49],
				);
				shape(customer, "cylinder", "#496d60", [0, 1.75, 0], [0.34, 0.4, 0.33]);
			}
			if (i === 2)
				for (const x of [-0.32, 0.32])
					shape(customer, "ball", "#f0d7a0", [x, 1.49, 0], [0.26, 0.26, 0.24]);
			const mixer = new THREE.AnimationMixer(customer);
			const idle = new THREE.AnimationClip("customerIdle", 2.3, [
				new THREE.NumberKeyframeTrack(
					".rotation[z]",
					[0, 1.15, 2.3],
					[-0.035, 0.035, -0.035],
				),
			]);
			mixer.clipAction(idle).play();
			this.customers.push({ group: customer, mixer, plate, happy: 0 });
		});
		// Herb pots, condiment bottles, striped awning and dangling warm lamps.
		for (let i = 0; i < 3; i++) {
			const x = [-6.7, -2.1, 6.7][i];
			shape(s, "cylinder", "#cf7854", [x, 0.27, -4.6], [0.28, 0.6, 0.28]);
			for (let j = 0; j < 5; j++)
				shape(
					s,
					"ball",
					"#619365",
					[
						x + Math.sin(j * 3) * 0.18,
						0.65 + j * 0.07,
						-4.6 + Math.cos(j * 3) * 0.15,
					],
					[0.19, 0.25, 0.17],
				);
		}
		for (let i = 0; i < 3; i++) {
			const x = -4.3 + i * 4.3;
			shape(s, "cylinder", INK, [x, 5.5, -3.9], [0.025, 2.5, 0.025], false);
			shape(s, "cone", "#e9b66c", [x, 4.25, -3.9], [0.6, 0.4, 0.6]);
			shape(s, "ball", "#fff0be", [x, 4.11, -3.9], [0.22, 0.13, 0.22]);
		}
		this.heatPanels = TOPPINGS.map((t) => {
			const m = shape(
				s,
				"box",
				"#f0ad40",
				[0, 0.22, t.lane],
				[7.8, 0.02, 0.85],
				false,
			);
			m.material = new THREE.MeshBasicMaterial({
				color: "#f3a64a",
				transparent: true,
				opacity: 0,
			});
			return m;
		});
		this.bellObject = group(s, [6, 1.2, 3.9]);
		shape(this.bellObject, "cylinder", "#dcb759", [0, 0, 0], [0.4, 0.13, 0.4]);
		shape(this.bellObject, "ball", "#efc968", [0, 0.15, 0], [0.32, 0.26, 0.32]);
		shape(this.bellObject, "cylinder", INK, [0, 0.37, 0], [0.07, 0.13, 0.07]);
	}
	makeChef(id) {
		const root = group(this.scene),
			rig = group(root);
		const color = id ? "#4c9a9b" : "#da5f3d";
		const body = group(rig);
		body.name = "body";
		shape(body, "ball", palette.white, [0, 0.68, 0], [0.38, 0.47, 0.28]);
		shape(body, "box", color, [0, 0.63, 0.25], [0.56, 0.6, 0.08]);
		shape(body, "box", "#f1c982", [0, 0.48, 0.3], [0.27, 0.18, 0.025]);
		shape(body, "ball", "#f3be8d", [0, 1.25, 0], [0.36, 0.38, 0.32]);
		shape(body, "ball", "#ee9f72", [0, 1.23, 0.33], [0.13, 0.12, 0.13]);
		for (const x of [-0.13, 0.13])
			shape(body, "ball", INK, [x, 1.36, 0.28], [0.035, 0.05, 0.025], false);
		for (const x of [-0.08, 0.08]) {
			const m = shape(
				body,
				"ball",
				"#60473b",
				[x, 1.13, 0.3],
				[0.1, 0.045, 0.035],
			);
			m.rotation.z = x * 3;
		}
		shape(body, "cylinder", palette.white, [0, 1.66, 0], [0.32, 0.3, 0.32]);
		for (const [x, y, z] of [
			[-0.19, 1.91, 0],
			[0.19, 1.92, 0],
			[0, 2.02, 0.03],
			[0, 1.91, -0.19],
		])
			shape(body, "ball", palette.white, [x, y, z], [0.27, 0.27, 0.25]);
		for (const [name, x] of [
			["armL", -0.4],
			["armR", 0.4],
		]) {
			const arm = group(body, [x, 0.95, 0]);
			arm.name = name;
			shape(arm, "ball", palette.white, [0, -0.16, 0.1], [0.14, 0.25, 0.14]);
			shape(arm, "ball", "#f3be8d", [0, -0.27, 0.24], [0.13, 0.13, 0.13]);
		}
		for (const [name, x] of [
			["legL", -0.19],
			["legR", 0.19],
		]) {
			const leg = group(rig, [x, 0.4, 0]);
			leg.name = name;
			shape(leg, "box", "#364d46", [0, -0.19, 0], [0.19, 0.35, 0.2]);
			shape(leg, "ball", "#2b3b36", [0, -0.32, 0.09], [0.16, 0.12, 0.25]);
		}
		const tray = group(body, [0, 0.82, 0.7]);
		shape(tray, "cylinder", palette.cream, [0, 0, 0], [0.5, 0.055, 0.5]);
		const burger = group(tray, [0, 0.07, 0]);
		const ring = new THREE.Mesh(
			new THREE.RingGeometry(0.46, 0.54, 48),
			new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }),
		);
		ring.rotation.x = -Math.PI / 2;
		ring.position.y = 0.015;
		root.add(ring);
		const marker = shape(root, "cone", color, [0, 2.6, 0], [0.14, 0.28, 0.14]);
		marker.rotation.z = Math.PI;
		const mixer = new THREE.AnimationMixer(rig);
		const idleClip = new THREE.AnimationClip("breathing", 1.7, [
			new THREE.NumberKeyframeTrack(
				"body.position[y]",
				[0, 0.85, 1.7],
				[0, 0.035, 0],
			),
		]);
		const walkClip = new THREE.AnimationClip("chefScamper", 0.42, [
			new THREE.NumberKeyframeTrack(
				"legL.rotation[x]",
				[0, 0.21, 0.42],
				[-0.7, 0.7, -0.7],
			),
			new THREE.NumberKeyframeTrack(
				"legR.rotation[x]",
				[0, 0.21, 0.42],
				[0.7, -0.7, 0.7],
			),
			new THREE.NumberKeyframeTrack(
				"body.rotation[z]",
				[0, 0.21, 0.42],
				[-0.065, 0.065, -0.065],
			),
		]);
		const catchClip = new THREE.AnimationClip("spatulaFlick", 0.28, [
			new THREE.NumberKeyframeTrack(
				"armR.rotation[x]",
				[0, 0.1, 0.28],
				[0, -1.4, 0],
			),
			new THREE.NumberKeyframeTrack(
				"armL.rotation[x]",
				[0, 0.1, 0.28],
				[0, -0.9, 0],
			),
		]);
		const serveClip = new THREE.AnimationClip("orderUp", 0.6, [
			new THREE.NumberKeyframeTrack(
				".position[y]",
				[0, 0.23, 0.6],
				[0, 0.48, 0],
			),
			new THREE.NumberKeyframeTrack(
				"armR.rotation[z]",
				[0, 0.23, 0.6],
				[0, -1.4, 0],
			),
			new THREE.NumberKeyframeTrack(
				"armL.rotation[z]",
				[0, 0.23, 0.6],
				[0, 1.4, 0],
			),
		]);
		const idle = mixer.clipAction(idleClip).play(),
			walk = mixer.clipAction(walkClip).play();
		walk.weight = 0;
		const catchAction = mixer.clipAction(catchClip),
			serve = mixer.clipAction(serveClip);
		for (const a of [catchAction, serve]) {
			a.setLoop(THREE.LoopOnce);
			a.clampWhenFinished = false;
		}
		const bodyPhysics = this.world.createRigidBody(
			RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 0.7, 2.7),
		);
		const collider = this.world.createCollider(
			RAPIER.ColliderDesc.capsule(0.32, 0.27).setFriction(0),
			bodyPhysics,
		);
		const chef = {
			root,
			rig,
			burger,
			mixer,
			idle,
			walk,
			catchAction,
			serve,
			bodyPhysics,
			collider,
			plateKey: null,
			marker,
			ring,
		};
		this.chefs.push(chef);
		return chef;
	}
	movePlayer(p, next) {
		const c = this.chefs[p.id];
		if (!c) return next;
		c.bodyPhysics.setTranslation({ x: p.x, y: 0.68, z: p.z }, true);
		this.controller.computeColliderMovement(c.collider, {
			x: next.x - p.x,
			y: 0,
			z: next.z - p.z,
		});
		const m = this.controller.computedMovement();
		const pos = { x: p.x + m.x, y: 0.68, z: p.z + m.z };
		c.bodyPhysics.setNextKinematicTranslation(pos);
		return { x: pos.x, z: pos.z };
	}
	food(type, parent, scale = 1) {
		const g = group(parent);
		g.scale.setScalar(scale);
		if (type === "C") {
			const m = shape(g, "box", "#ffc447", [0, 0, 0], [0.7, 0.1, 0.68]);
			m.rotation.y = 0.15;
			shape(
				g,
				"ball",
				"#da9c31",
				[0.13, 0.054, 0.1],
				[0.08, 0.015, 0.08],
				false,
			);
		}
		if (type === "L") {
			for (let i = 0; i < 5; i++)
				shape(
					g,
					"ball",
					i % 2 ? "#76ad5f" : "#a1c975",
					[Math.cos(i * 1.25) * 0.18, 0, Math.sin(i * 1.25) * 0.18],
					[0.27, 0.07, 0.27],
				);
		}
		if (type === "T") {
			shape(g, "cylinder", "#ec684c", [0, 0, 0], [0.34, 0.12, 0.34]);
			shape(g, "cylinder", "#f79a64", [0, 0.07, 0], [0.25, 0.012, 0.25], false);
			for (let i = 0; i < 4; i++)
				shape(
					g,
					"ball",
					"#f8d791",
					[Math.cos(i * 1.57) * 0.16, 0.085, Math.sin(i * 1.57) * 0.16],
					[0.045, 0.012, 0.035],
					false,
				);
		}
		return g;
	}
	buildBurger(g, types, capped = false) {
		g.clear();
		shape(g, "cylinder", "#e6a655", [0, 0.05, 0], [0.33, 0.13, 0.33]);
		shape(g, "cylinder", "#795040", [0, 0.15, 0], [0.34, 0.12, 0.34]);
		types.forEach((t, i) => {
			const f = this.food(t, g, 0.9);
			f.position.y = 0.26 + i * 0.12;
		});
		if (capped) {
			const y = 0.3 + types.length * 0.12;
			shape(g, "ball", "#eab26a", [0, y, 0], [0.36, 0.2, 0.36]);
			for (let i = 0; i < 6; i++)
				shape(
					g,
					"ball",
					"#fff0be",
					[Math.sin(i * 3) * 0.23, y + 0.16, Math.cos(i * 3) * 0.21],
					[0.025, 0.015, 0.05],
					false,
				);
		}
	}
	burst(x, z, colors, count = 12, y = 1.3) {
		for (let i = 0; i < count; i++) {
			const c = colors[i % colors.length];
			const mesh = shape(
				this.scene,
				i % 3 ? "box" : "ball",
				c,
				[x, y, z],
				[0.09 + (i % 3) * 0.03, 0.05, 0.12],
				i % 2 === 0,
			);
			const body = this.world.createRigidBody(
				RAPIER.RigidBodyDesc.dynamic()
					.setTranslation(x, y, z)
					.setLinvel(
						Math.sin(i * 2.4) * 2.3,
						2 + (i % 4) * 0.7,
						Math.cos(i * 2.4) * 2.3,
					)
					.setAngvel({ x: i, y: 2.3, z: i * 0.4 }),
			);
			this.world.createCollider(
				RAPIER.ColliderDesc.cuboid(0.09, 0.04, 0.09)
					.setRestitution(0.52)
					.setMass(0.025),
				body,
			);
			this.debris.push({ mesh, body, life: 2.2 + (i % 3) * 0.3 });
		}
	}
	event(name, d, game) {
		const c = this.chefs[d.player || 0];
		if (name === "start") {
			for (const chef of this.chefs) {
				this.scene.remove(chef.root);
				this.world.removeRigidBody(chef.bodyPhysics);
			}
			this.chefs = [];
			game.players.forEach((p) => {
				const chef = this.makeChef(p.id);
				chef.bodyPhysics.setTranslation({ x: p.x, y: 0.68, z: p.z }, true);
			});
			for (const f of this.foodMeshes.values()) this.scene.remove(f);
			this.foodMeshes.clear();
			this.clearDebris();
		}
		if (name === "catch") {
			c?.catchAction.reset().play();
			this.burst(
				d.x,
				d.z,
				["#fff0be", TOPPINGS.find((t) => t.id === d.type).color],
				5,
			);
		}
		if (name === "serve") {
			c?.serve.reset().play();
			const b = BAYS[d.bay];
			this.burst(b.x, 4, [b.color, "#fff0be", "#eab960"], 22, 1.6);
			const burger = group(this.scene, [b.x, 1.43, 4.5]);
			this.buildBurger(burger, d.types, true);
			this.fx.push({ mesh: burger, life: 1.2, kind: "burger" });
			this.customers[d.bay].happy = 1.6;
		}
		if (["waste", "wrongCatch", "discard"].includes(name))
			this.burst(d.x, d.z, ["#d4a056", "#9cbd6e"], 5);
		if (name === "heat") {
			this.shake = 0.3;
			this.burst(d.x, d.z, ["#fff0d8", "#f2b949"], 12);
		}
		if (name === "bell") {
			this.bellObject.rotation.z = 0.25;
			this.burst(6, 3.9, ["#ffd45d", "#fff8de"], 18);
		}
		if (name === "dash") this.burst(d.x, d.z, ["#e7dcbe"], 4, 0.2);
	}
	clearDebris() {
		for (const p of this.debris) {
			this.scene.remove(p.mesh);
			this.world.removeRigidBody(p.body);
		}
		this.debris = [];
		for (const f of this.fx) this.scene.remove(f.mesh);
		this.fx = [];
	}
	stepPhysics(dt) {
		this.world.timestep = Math.min(dt, 0.035);
		this.world.step();
		for (const p of [...this.debris]) {
			p.life -= dt;
			const t = p.body.translation(),
				q = p.body.rotation();
			p.mesh.position.set(t.x, t.y, t.z);
			p.mesh.quaternion.set(q.x, q.y, q.z, q.w);
			if (p.life < 0.45) p.mesh.scale.multiplyScalar(0.94);
			if (p.life <= 0) {
				this.scene.remove(p.mesh);
				this.world.removeRigidBody(p.body);
				this.debris.splice(this.debris.indexOf(p), 1);
			}
		}
	}
	update(game, dt, title, shakeEnabled = true) {
		this.totalTime += dt;
		while (this.chefs.length < game.players.length)
			this.makeChef(this.chefs.length);
		const alive = new Set(game.food.map((f) => f.id));
		for (const [id, m] of this.foodMeshes)
			if (!alive.has(id)) {
				this.scene.remove(m);
				this.foodMeshes.delete(id);
			}
		for (const f of game.food) {
			let m = this.foodMeshes.get(f.id);
			if (!m) {
				m = this.food(f.type, this.scene);
				this.foodMeshes.set(f.id, m);
			}
			m.position.set(
				f.x,
				1.05 + Math.sin(this.totalTime * 3 + f.id) * 0.035,
				f.z,
			);
			m.rotation.y = Math.sin(this.totalTime * 2 + f.id) * 0.12;
		}
		game.players.forEach((p, i) => {
			const c = this.chefs[i];
			c.root.position.set(p.x, 0.02, p.z);
			c.rig.rotation.y +=
				Math.atan2(
					Math.sin(p.face - c.rig.rotation.y),
					Math.cos(p.face - c.rig.rotation.y),
				) * Math.min(1, dt * 16);
			c.walk.setEffectiveWeight(p.moving ? 1 : 0);
			c.mixer.update(dt * (p.dashTime > 0 ? 1.8 : 1));
			c.marker.position.y = 2.6 + Math.sin(this.totalTime * 3) * 0.07;
			c.root.visible = !(
				p.invincible > 0 && Math.sin(this.totalTime * 30) < -0.2
			);
			const key = p.plate.join("");
			if (c.plateKey !== key) {
				this.buildBurger(
					c.burger,
					p.plate,
					game.tickets.some(
						(t) =>
							t.cooldown <= 0 &&
							t.recipe.length === p.plate.length &&
							[...t.recipe].sort().join("") === [...p.plate].sort().join(""),
					),
				);
				c.plateKey = key;
			}
		});
		for (const c of this.customers) {
			c.mixer.update(dt);
			c.happy = Math.max(0, c.happy - dt);
			c.group.position.y =
				c.happy > 0 ? Math.abs(Math.sin(this.totalTime * 13)) * 0.14 : 0;
		}
		for (const m of this.beltMarks)
			m.position.x =
				((m.userData.start + game.clock * game.config.beltSpeed + 6.4) % 12.8) -
				6.4;
		const heat = game.heat();
		this.heatPanels.forEach((m, i) => {
			m.material.opacity =
				i === heat.lane && (heat.active || heat.warning)
					? heat.active
						? 0.72
						: 0.18 + Math.sin(this.totalTime * 10) * 0.15
					: 0;
		});
		if (heat.active && Math.sin(this.totalTime * 22) > 0.92) {
			const puff = shape(
				this.scene,
				"ball",
				"#fff1d9",
				[Math.sin(this.totalTime * 5) * 3.6, 0.5, TOPPINGS[heat.lane].lane],
				[0.2, 0.2, 0.2],
				false,
			);
			puff.material = new THREE.MeshBasicMaterial({
				color: "#fff1d9",
				transparent: true,
				opacity: 0.7,
			});
			this.fx.push({ mesh: puff, life: 0.9, kind: "steam" });
		}
		for (const f of [...this.fx]) {
			f.life -= dt;
			if (f.kind === "steam") {
				f.mesh.position.y += dt * 1.8;
				f.mesh.scale.multiplyScalar(1 + dt * 1.1);
				f.mesh.material.opacity = Math.max(0, f.life * 0.6);
			}
			if (f.life <= 0) {
				this.scene.remove(f.mesh);
				this.fx.splice(this.fx.indexOf(f), 1);
			}
		}
		this.bellObject.rotation.z *= Math.exp(-dt * 5);
		const portrait = innerWidth < 650 && innerHeight > innerWidth;
		this.cameraOffset +=
			((title && !portrait ? -5.2 : 0) - this.cameraOffset) *
			Math.min(1, dt * 5);
		this.cameraPanY +=
			((title && portrait ? 10 : 0) - this.cameraPanY) * Math.min(1, dt * 5);
		this.shake = Math.max(0, this.shake - dt);
		const j =
			this.shake > 0 && shakeEnabled
				? Math.sin(this.totalTime * 90) * this.shake * 0.2
				: 0;
		this.camera.position.set(
			10 + this.cameraOffset + j,
			17.5 + this.cameraPanY,
			23,
		);
		this.camera.lookAt(this.cameraOffset, 0.6 + this.cameraPanY, 0);
		if (this.debugLines.visible) {
			const debug = this.world.debugRender();
			this.debugLines.geometry.setAttribute(
				"position",
				new THREE.BufferAttribute(debug.vertices, 3),
			);
		}
	}
	resize() {
		const w = innerWidth,
			h = innerHeight,
			aspect = w / h;
		this.renderer.setSize(w, h);
		const height = aspect < 1.1 ? 24 / aspect : 18.4;
		this.camera.left = (-height * aspect) / 2;
		this.camera.right = (height * aspect) / 2;
		this.camera.top = height / 2;
		this.camera.bottom = -height / 2;
		this.camera.updateProjectionMatrix();
	}
	pick(clientX, clientY) {
		const ray = new THREE.Raycaster();
		ray.setFromCamera(
			new THREE.Vector2(
				(clientX / innerWidth) * 2 - 1,
				(-clientY / innerHeight) * 2 + 1,
			),
			this.camera,
		);
		const pos = new THREE.Vector3();
		if (
			ray.ray.intersectPlane(
				new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.8),
				pos,
			)
		)
			return { x: pos.x, z: pos.z };
		return null;
	}
	project(x, z) {
		const p = new THREE.Vector3(x, 0.8, z).project(this.camera);
		return {
			x: ((p.x + 1) * innerWidth) / 2,
			y: ((1 - p.y) * innerHeight) / 2,
		};
	}
	render() {
		if (!this.recovering) this.renderer.render(this.scene, this.camera);
	}
}
