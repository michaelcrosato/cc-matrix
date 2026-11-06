import * as T from "three/webgpu";
import { RIMS } from "./core.mjs";

const C = {
	ink: 0x182a37,
	cream: 0xf5edda,
	coral: 0xf06539,
	blue: 0x42bfc5,
	teal: 0x218e99,
	yellow: 0xffd165,
	peach: 0xe9ab83,
	brick: 0xce7d60,
	pale: 0xc1d8c6,
	white: 0xfff8e9,
};
const palette = new Map();
const gradient = new T.DataTexture(
	new Uint8Array([
		82, 82, 82, 255, 165, 165, 165, 255, 230, 230, 230, 255, 255, 255, 255, 255,
	]),
	4,
	1,
);
gradient.minFilter = gradient.magFilter = T.NearestFilter;
gradient.needsUpdate = true;
const stroke = new T.MeshBasicNodeMaterial({ color: C.ink, side: T.BackSide });
function mat(color) {
	if (!palette.has(color))
		palette.set(
			color,
			new T.MeshToonNodeMaterial({ color, gradientMap: gradient }),
		);
	return palette.get(color);
}
function basic(color) {
	return new T.MeshBasicNodeMaterial({ color });
}
function mesh(geo, color, parent, x = 0, y = 0, z = 0, outline = true) {
	const o = new T.Mesh(geo, mat(color));
	o.position.set(x, y, z);
	o.castShadow = true;
	o.receiveShadow = true;
	if (outline) {
		const edge = new T.Mesh(geo, stroke);
		edge.scale.setScalar(1.045);
		edge.castShadow = false;
		o.add(edge);
	}
	parent.add(o);
	return o;
}
function box(w, h, d, c, p, x = 0, y = 0, z = 0, out = true) {
	return mesh(new T.BoxGeometry(w, h, d), c, p, x, y, z, out);
}
function ball(r, c, p, x = 0, y = 0, z = 0, s = 16) {
	return mesh(new T.SphereGeometry(r, s, 10), c, p, x, y, z);
}
function cyl(rt, rb, h, c, p, x = 0, y = 0, z = 0, n = 12) {
	return mesh(new T.CylinderGeometry(rt, rb, h, n), c, p, x, y, z);
}
function ring(r, t, c, p, x, y, z, rx = Math.PI / 2) {
	const m = mesh(new T.TorusGeometry(r, t, 6, 28), c, p, x, y, z);
	m.rotation.x = rx;
	return m;
}
function tube(points, r, color, parent) {
	const curve = new T.CatmullRomCurve3(points.map((v) => new T.Vector3(...v)));
	return mesh(new T.TubeGeometry(curve, 24, r, 6, false), color, parent);
}
function textPlane(
	text,
	w,
	h,
	color = "#182a37",
	background = null,
	size = 96,
) {
	const canvas = document.createElement("canvas");
	canvas.width = 1024;
	canvas.height = Math.round((1024 * h) / w);
	const c = canvas.getContext("2d");
	if (background) {
		c.fillStyle = background;
		c.fillRect(0, 0, canvas.width, canvas.height);
	}
	c.fillStyle = color;
	c.textAlign = "center";
	c.textBaseline = "middle";
	c.font = `900 ${size}px Impact, Arial Narrow, sans-serif`;
	const lines = text.split("\n");
	lines.forEach((line, i) => {
		c.fillText(
			line,
			512,
			canvas.height / 2 + (i - (lines.length - 1) / 2) * size * 1.05,
			950,
		);
	});
	const tex = new T.CanvasTexture(canvas);
	tex.colorSpace = T.SRGBColorSpace;
	const material = new T.MeshBasicNodeMaterial({ map: tex, transparent: true });
	return new T.Mesh(new T.PlaneGeometry(w, h), material);
}
function sign(text, w, h, p, x, y, z, bg = C.yellow) {
	const b = box(w + 0.12, h + 0.12, 0.13, C.ink, p, x, y, z, false);
	box(w, h, 0.15, bg, p, x, y, z + 0.05, false);
	const t = textPlane(
		text,
		w,
		h,
		"#182a37",
		null,
		Math.min(190, 820 / text.split("\n")[0].length),
	);
	t.position.set(x, y, z + 0.14);
	p.add(t);
	return b;
}

export class Rooftop {
	constructor(container) {
		this.scene = new T.Scene();
		this.scene.background = new T.Color(C.cream);
		this.camera = new T.OrthographicCamera(-14, 14, 9, -9, 0.1, 120);
		this.camera.position.set(0, 6.3, 34);
		this.camera.lookAt(0, 1, 0);
		this.container = container;
		this.bombMeshes = new Map();
		this.bucketGroups = [];
		this.fx = [];
		this.animators = [];
		this.title = true;
		this.clock = 0;
		this.shake = 0;
		this.reducedMotion = false;
		this.backend = "unknown";
		this.scene.add(new T.HemisphereLight(0xfff4dd, 0x8d9da3, 2.1));
		const sun = new T.DirectionalLight(0xfff2cf, 3.1);
		sun.position.set(-8, 16, 15);
		sun.castShadow = true;
		sun.shadow.mapSize.set(2048, 2048);
		sun.shadow.camera.left = -15;
		sun.shadow.camera.right = 15;
		sun.shadow.camera.top = 13;
		sun.shadow.camera.bottom = -10;
		sun.shadow.bias = -0.001;
		sun.shadow.normalBias = 0.05;
		this.scene.add(sun);
		this.buildTown();
		this.bomber = this.makeBomber();
		this.scene.add(this.bomber);
		this.bomber.position.set(4.7, 6.04, 0.25);
		this.heroBomb = this.makeBomb("normal", 2.8);
		this.heroBomb.position.set(5.3, 0.4, 1);
		this.scene.add(this.heroBomb);
		for (let i = 0; i < 4; i++) {
			const g = this.makeBucketStack(i);
			this.bucketGroups.push(g);
			this.scene.add(g);
			g.visible = i === 0;
			g.position.x = 4.5;
		}
	}
	async init() {
		if (
			globalThis.AIHub?.server ||
			new URLSearchParams(location.search).get("headless") === "1"
		) {
			this.backend = "Headless Three.js scene";
			globalThis.__rendererProbe = { phase: "ready", headless: true };
			this.resize();
			return;
		}
		globalThis.__rendererProbe = { phase: "adapter" };
		let forceGL = new URLSearchParams(location.search).get("webgl") === "1";
		if (!forceGL && globalThis.AIHub?.active && navigator.gpu) {
			try {
				const adapter = await navigator.gpu.requestAdapter();
				const info = adapter?.info;
				const description = [
					info?.vendor,
					info?.architecture,
					info?.device,
					info?.description,
				].join(" ");
				forceGL = !!(
					adapter?.isFallbackAdapter ||
					info?.isFallbackAdapter ||
					/swiftshader|software|llvmpipe/i.test(description)
				);
			} catch {
				forceGL = true;
			}
		}
		const attempts = [];
		globalThis.__rendererProbe.forceGL = forceGL;
		this.resize();
		const prepare = async (forceWebGL) => {
			const renderer = new T.WebGPURenderer({
				antialias: true,
				alpha: false,
				forceWebGL,
			});
			attempts.push(renderer);
			renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
			renderer.shadowMap.enabled = true;
			renderer.shadowMap.type = T.PCFSoftShadowMap;
			renderer.outputColorSpace = T.SRGBColorSpace;
			renderer.toneMapping = T.ACESFilmicToneMapping;
			renderer.toneMappingExposure = 1.08;
			await renderer.init();
			globalThis.__rendererProbe.phase = "materials";
			renderer.setSize(innerWidth, innerHeight);
			if (renderer.backend.isWebGPUBackend)
				await renderer.compileAsync(this.scene, this.camera);
			renderer.render(this.scene, this.camera);
			return renderer;
		};
		let timer;
		try {
			this.renderer = await Promise.race([
				prepare(forceGL),
				new Promise((_, reject) => {
					timer = setTimeout(
						() => reject(new Error("Renderer initialization timed out")),
						9000,
					);
				}),
			]);
		} catch (error) {
			if (forceGL) throw error;
			for (const renderer of attempts)
				try {
					renderer.dispose();
				} catch {}
			this.renderer = await prepare(true);
		} finally {
			clearTimeout(timer);
		}
		this.backend = this.renderer.backend.isWebGPUBackend
			? "WebGPU"
			: "WebGL 2 fallback";
		globalThis.__rendererProbe.phase = "ready";
		this.container.appendChild(this.renderer.domElement);
	}
	resize() {
		const w = innerWidth,
			h = innerHeight;
		this.renderer?.setSize(w, h);
		const aspect = w / h;
		const portrait = aspect < 0.85;
		const height = portrait ? 19.2 : Math.max(16.6, 20.2 / aspect);
		this.horizontalScale = portrait ? (height * aspect) / 22.8 : 1;
		this.scene.scale.x = this.horizontalScale;
		this.bomber.scale.x = 1 / this.horizontalScale;
		this.heroBomb.scale.x = 2.8 / this.horizontalScale;
		this.camera.left = (-height * aspect) / 2;
		this.camera.right = (height * aspect) / 2;
		this.camera.top = height / 2;
		this.camera.bottom = -height / 2;
		this.camera.updateProjectionMatrix();
	}
	buildTown() {
		const p = new T.Group();
		this.scene.add(p);
		const sun = mesh(
			new T.CircleGeometry(4.3, 64),
			C.yellow,
			p,
			5.5,
			6,
			-10,
			false,
		);
		sun.material = basic(C.yellow);
		for (const [x, y, s] of [
			[-8, 8, 1],
			[12, 4, 0.9],
			[-1, 9, 1.1],
		]) {
			const cloud = new T.Group();
			for (let i = 0; i < 4; i++) {
				const b = ball(
					0.7 + (i % 2) * 0.35,
					C.white,
					cloud,
					i * 0.75,
					Math.sin(i) * 0.25,
					0,
				);
				b.scale.z = 0.2;
				b.castShadow = false;
			}
			cloud.position.set(x, y, -9);
			cloud.scale.setScalar(s);
			p.add(cloud);
		}
		// Distant roof silhouettes, then the stage's quiet mint wall.
		for (let i = 0; i < 14; i++) {
			const x = -23 + i * 3.5;
			const h = 3.5 + ((i * 7) % 6);
			box(3.2, h, 1, i % 2 ? 0xb4c8ba : 0xc6d2c0, p, x, h / 2 - 2, -9, false);
			box(3.5, 0.2, 1.2, C.ink, p, x, h - 2, -9, false);
		}
		box(19, 10.4, 1, C.pale, p, 0, 0.1, -3.8);
		for (let j = 0; j < 14; j++) {
			const y = -4.7 + j * 0.73;
			for (let i = 0; i < 12; i++) {
				if ((i * 3 + j * 7) % 5 !== 0) continue;
				const x = -8.6 + i * 1.55 + (j % 2) * 0.7;
				const crack = box(0.7, 0.015, 0.02, 0x92b5aa, p, x, y, -3.285, false);
				crack.rotation.z = (((i + j) % 3) - 1) * 0.04;
			}
		}
		// Painted arch leaves the falling objects against a calm, readable surface.
		const arch = new T.Shape();
		arch.moveTo(-6.5, -4.9);
		arch.lineTo(-6.5, 1.5);
		arch.bezierCurveTo(-6.5, 6, 6.5, 6, 6.5, 1.5);
		arch.lineTo(6.5, -4.9);
		arch.closePath();
		const wall = mesh(
			new T.ShapeGeometry(arch),
			0xd4dfc6,
			p,
			0,
			0,
			-3.24,
			false,
		);
		wall.material = basic(0xd4dfc6);
		const archLine = tube(
			[
				[-6.55, -4.9, -3.2],
				[-6.55, 1.6, -3.2],
				[-4.6, 4.3, -3.2],
				[0, 4.9, -3.2],
				[4.6, 4.3, -3.2],
				[6.55, 1.6, -3.2],
				[6.55, -4.9, -3.2],
			],
			0.035,
			0x9dbcb0,
			p,
		);
		archLine.castShadow = false;
		for (const side of [-1, 1]) {
			const x = side * 11.2;
			box(4.5, 18, 3, side < 0 ? C.peach : 0xf0c087, p, x, 2, -2.5);
			box(4.8, 0.35, 3.6, C.ink, p, x, 8.35, -2.3);
			box(4.9, 0.28, 3.7, C.cream, p, x, 8.57, -2.3);
			for (let row = 0; row < 4; row++) {
				const y = 6 - row * 3;
				box(1.35, 1.9, 0.15, C.ink, p, x, y, -0.91);
				box(1.12, 1.65, 0.18, 0x83adb1, p, x, y, -0.79);
				box(1.26, 0.09, 0.21, C.cream, p, x, y, -0.65);
				box(0.09, 1.8, 0.21, C.cream, p, x, y, -0.65);
				box(1.8, 0.22, 0.7, C.cream, p, x, y - 1.03, -0.6);
				for (let k = 0; k < 3; k++)
					box(
						0.13,
						2.05,
						0.2,
						side < 0 ? C.coral : C.teal,
						p,
						x + side * (0.85 + k * 0.17),
						y,
						-0.7,
					);
			}
			tube(
				[
					[side * 9.2, 8, -0.6],
					[side * 9.2, 2, -0.6],
					[side * 9, 1.8, -0.6],
					[side * 9, -4.8, -0.6],
				],
				0.1,
				C.teal,
				p,
			);
			for (let i = 0; i < 9; i++)
				box(4.4, 0.04, 0.04, C.brick, p, x, -4 + i * 1.5, -0.96, false);
		}
		sign("BUCKET\nDISTRICT", 3.1, 1.5, p, -10.8, 1.6, -0.1, C.yellow);
		const noBoom = sign(
			"NO BOOM\nZONE",
			2.8,
			1.5,
			p,
			10.9,
			-2.7,
			-0.1,
			C.cream,
		);
		noBoom.rotation.z = -0.06;
		// Roof ledge and its alternating hazard stripes.
		box(18.7, 0.42, 2.4, C.ink, p, 0, 5.4, -0.7);
		box(18.9, 0.2, 2.5, C.cream, p, 0, 5.64, -0.7);
		box(18.5, 0.45, 0.12, C.coral, p, 0, 5.22, 0.57, false);
		for (let i = 0; i < 30; i++) {
			const b = box(
				0.32,
				0.45,
				0.04,
				C.yellow,
				p,
				-9 + i * 0.63,
				5.23,
				0.66,
				false,
			);
			b.rotation.z = -0.32;
		}
		box(19.6, 0.18, 3.8, C.ink, p, 0, -5.15, 0);
		box(19.6, 0.4, 3.8, C.peach, p, 0, -5.4, 0);
		box(19.9, 0.14, 4.1, C.cream, p, 0, -4.98, 0);
		for (let i = 0; i < 22; i++) {
			box(0.025, 0.03, 3.8, 0xba9d79, p, -9.5 + i * 0.9, -4.895, 0, false);
		}
		box(19.8, 0.18, 0.12, C.ink, p, 0, -5.62, 2.06);
		box(20, 0.75, 3.1, C.teal, p, 0, -6.05, 1.9);
		for (let i = 0; i < 16; i++)
			box(0.65, 0.025, 0.1, C.blue, p, -9 + i * 1.25, -5.78, 3.46, false);
		// Bunting and warm bulbs, all behind the play plane.
		const points = [];
		for (let i = 0; i < 25; i++) {
			const x = -9 + i * 0.75;
			points.push([x, 4.8 - Math.sin((i / 24) * Math.PI) * 1.1, -2.2]);
		}
		tube(points, 0.025, C.ink, p);
		for (let i = 0; i < 18; i++) {
			const x = -8.5 + i;
			const y = 4.8 - Math.sin(((x + 9) / 18) * Math.PI) * 1.1;
			const shape = new T.Shape();
			shape.moveTo(-0.22, 0);
			shape.lineTo(0.22, 0);
			shape.lineTo(0, -0.5);
			shape.closePath();
			const f = mesh(
				new T.ShapeGeometry(shape),
				[C.coral, C.yellow, C.teal, C.cream][i % 4],
				p,
				x,
				y,
				-2.15,
				false,
			);
			f.material.side = T.DoubleSide;
			ball(0.055, C.yellow, p, x + 0.45, y, -2.1, 8);
		}
		for (const [x, y, z] of [
			[-8.2, -4.4, 0.7],
			[8.3, -4.4, -0.4],
		]) {
			cyl(0.42, 0.35, 0.7, C.coral, p, x, y, z);
			cyl(0.46, 0.45, 0.12, C.yellow, p, x, y + 0.35, z);
			tube(
				[
					[x, y + 0.5, z],
					[x - 0.35, y + 0.9, z],
					[x - 0.65, y + 0.9, z],
				],
				0.06,
				C.teal,
				p,
			);
		}
		// Wall lettering is intentionally quiet so it never competes with a bomb.
		const label = textPlane("KEEP IT TOGETHER.", 8, 0.65, "#91ada0", null, 100);
		label.position.set(0, -0.6, -3.15);
		p.add(label);
		for (const side of [-1, 1]) {
			for (let i = 0; i < 4; i++) {
				const leaf = mesh(
					new T.ConeGeometry(0.22, 0.75, 5),
					C.teal,
					p,
					side * (8.5 + 0.12 * i),
					-4.45 + 0.1 * i,
					-1.5,
				);
				leaf.rotation.z = (i - 2) * 0.25;
			}
			cyl(0.44, 0.28, 0.5, C.coral, p, side * 8.6, -4.6, -1.5);
		}
	}
	makeBomber() {
		const root = new T.Group();
		const body = new T.Group();
		body.name = "banditBody";
		root.add(body);
		const torso = mesh(
			new T.CapsuleGeometry(0.48, 0.55, 6, 12),
			C.cream,
			body,
			0,
			0.65,
			0,
		);
		torso.scale.z = 0.65;
		for (let i = 0; i < 4; i++) {
			const stripe = cyl(
				0.475,
				0.475,
				0.13,
				C.ink,
				body,
				0,
				0.32 + i * 0.24,
				0,
			);
			stripe.scale.z = 0.67;
		}
		const belt = cyl(0.49, 0.49, 0.1, C.coral, body, 0, 0.24, 0);
		belt.scale.z = 0.7;
		box(0.18, 0.16, 0.08, C.yellow, body, 0, 0.24, 0.37);
		for (const side of [-1, 1]) {
			box(0.28, 0.38, 0.36, C.ink, body, side * 0.24, -0.06, 0.02);
			const boot = ball(0.24, C.ink, body, side * 0.25, -0.26, 0.13);
			boot.scale.set(1, 0.6, 1.7);
		}
		const head = new T.Group();
		head.name = "banditHead";
		head.position.y = 1.48;
		body.add(head);
		const face = ball(0.47, C.peach, head, 0, 0, 0.01, 20);
		face.scale.set(1, 0.94, 0.86);
		for (const side of [-1, 1])
			ball(0.13, C.peach, head, side * 0.44, -0.03, 0.01, 10);
		const mask = ball(0.43, C.ink, head, 0, 0.08, 0.27);
		mask.scale.set(1, 0.36, 0.5);
		for (const side of [-1, 1]) {
			const eye = ball(0.103, C.white, head, side * 0.17, 0.08, 0.445);
			eye.scale.set(0.85, 1, 0.35);
			ball(0.045, C.ink, head, side * 0.17 - 0.015, 0.07, 0.48, 8);
			const brow = box(0.23, 0.06, 0.07, C.ink, head, side * 0.18, 0.26, 0.43);
			brow.rotation.z = side * -0.2;
		}
		const nose = ball(0.16, C.peach, head, 0, -0.05, 0.49);
		nose.scale.set(0.85, 1, 1);
		tube(
			[
				[-0.28, -0.17, 0.4],
				[-0.18, -0.12, 0.48],
				[0, -0.19, 0.49],
				[0.18, -0.12, 0.48],
				[0.28, -0.17, 0.4],
			],
			0.06,
			C.ink,
			head,
		);
		const grin = ball(0.22, C.white, head, 0, -0.25, 0.36);
		grin.scale.set(1, 0.38, 0.35);
		box(0.018, 0.12, 0.03, C.ink, head, 0, -0.25, 0.445, false);
		const cap = ball(0.49, C.ink, head, 0, 0.36, 0);
		cap.scale.set(1, 0.5, 0.85);
		box(0.82, 0.09, 0.7, C.ink, head, 0.11, 0.32, 0.2);
		ball(0.085, C.coral, head, -0.02, 0.6, 0.02);
		const scarf = mesh(
			new T.ConeGeometry(0.23, 0.6, 3),
			C.coral,
			body,
			0.52,
			1.1,
			0.1,
		);
		scarf.rotation.z = -1.2;
		ring(0.27, 0.09, C.coral, body, 0, 1.12, 0);
		for (const side of [-1, 1]) {
			const arm = new T.Group();
			arm.name = side === 1 ? "throwArm" : "otherArm";
			arm.position.set(side * 0.43, 0.95, 0);
			body.add(arm);
			const upper = box(0.22, 0.5, 0.24, C.cream, arm, side * 0.12, -0.18, 0);
			upper.rotation.z = side * 0.4;
			box(0.235, 0.1, 0.26, C.ink, arm, side * 0.16, -0.2, 0);
			ball(0.17, C.ink, arm, side * 0.24, -0.43, 0.07);
			if (side === 1) {
				const b = this.makeBomb("normal", 0.5);
				b.position.set(0.35, -0.38, 0.14);
				arm.add(b);
			}
		}
		const mixer = new T.AnimationMixer(root);
		const idle = new T.AnimationClip("taunting idle", 1, [
			new T.NumberKeyframeTrack(
				"banditBody.position[y]",
				[0, 0.25, 0.5, 0.75, 1],
				[0, 0.05, 0, 0.05, 0],
			),
			new T.NumberKeyframeTrack(
				"banditHead.rotation[z]",
				[0, 0.5, 1],
				[-0.05, 0.05, -0.05],
			),
		]);
		mixer.clipAction(idle).play();
		const toss = new T.AnimationClip("bomb toss", 0.35, [
			new T.NumberKeyframeTrack(
				"throwArm.rotation[z]",
				[0, 0.12, 0.2, 0.35],
				[0, -1.4, -0.7, 0],
			),
		]);
		const laugh = new T.AnimationClip("last laugh", 0.8, [
			new T.NumberKeyframeTrack(
				"banditBody.rotation[z]",
				[0, 0.2, 0.4, 0.6, 0.8],
				[0, -0.12, 0.1, -0.1, 0],
			),
		]);
		root.userData.mixer = mixer;
		root.userData.toss = mixer.clipAction(toss).setLoop(T.LoopOnce, 1);
		root.userData.laugh = mixer.clipAction(laugh).setLoop(T.LoopOnce, 1);
		this.animators.push(mixer);
		return root;
	}
	makeBomb(kind = "normal", size = 1) {
		const p = new T.Group();
		const color =
			kind === "return" ? C.coral : kind === "gold" ? C.yellow : C.ink;
		const b = ball(0.28, color, p);
		b.scale.set(1, 1.03, 1);
		const highlight = ball(
			0.075,
			kind === "normal" ? 0x73828b : C.cream,
			p,
			-0.09,
			0.105,
			0.226,
			8,
		);
		highlight.scale.set(1, 0.7, 0.35);
		cyl(0.095, 0.1, 0.12, C.ink, p, 0, 0.3, 0);
		tube(
			[
				[0, 0.35, 0],
				[0.03, 0.46, 0],
				[0.13, 0.5, 0.01],
			],
			0.028,
			C.cream,
			p,
		);
		const spark = mesh(
			new T.OctahedronGeometry(0.09),
			C.yellow,
			p,
			0.14,
			0.51,
			0.01,
		);
		p.userData.spark = spark;
		if (kind === "return") {
			const ringM = ring(0.294, 0.025, C.yellow, p, 0, 0, 0, 0);
			ringM.rotation.y = 0.25;
			const mark = textPlane("↶", 0.36, 0.3, "#fff8e9", null, 650);
			mark.position.set(0, 0, 0.29);
			p.add(mark);
		}
		if (kind === "gold") {
			const mark = textPlane("+", 0.3, 0.3, "#182a37", null, 750);
			mark.position.set(0, 0, 0.29);
			p.add(mark);
		}
		p.scale.setScalar(size);
		return p;
	}
	makeBucketStack(id) {
		const root = new T.Group();
		root.userData.buckets = [];
		const color = [C.blue, C.coral, 0x88aa62, C.yellow][id];
		for (let i = 0; i < 3; i++) {
			const p = new T.Group();
			p.position.y = RIMS[i] - 0.29;
			p.name = `bucket${id}_${i}`;
			root.add(p);
			root.userData.buckets.push(p);
			const shell = cyl(0.83, 0.66, 0.55, color, p, 0, 0, 0, 14);
			shell.scale.z = 0.62;
			const rim = ring(0.81, 0.06, C.ink, p, 0, 0.275, 0);
			rim.scale.y = 0.63;
			const water = cyl(0.74, 0.74, 0.04, C.blue, p, 0, 0.25, 0, 20);
			water.scale.z = 0.62;
			water.material = mat(0x8be3d8);
			const shine = box(0.65, 0.025, 0.1, C.white, p, -0.15, 0.28, 0.03, false);
			shine.rotation.y = 0.15;
			for (const side of [-1, 1]) {
				const rivet = ball(0.055, C.cream, p, side * 0.64, -0.03, 0.39, 8);
				rivet.scale.z = 0.4;
			}
			const label = textPlane(
				i === 0 ? `0${id + 1}` : "≈",
				0.55,
				0.3,
				"#182a37",
				null,
				500,
			);
			label.position.set(0, -0.03, 0.52);
			p.add(label);
			const handle = ring(0.52, 0.035, C.ink, p, 0, 0.05, 0.27, 0);
			handle.scale.y = 0.6;
			handle.rotation.z = Math.PI;
		}
		box(1.65, 0.11, 0.9, C.ink, root, 0, -4.68, 0);
		for (const side of [-1, 1]) {
			const wheel = cyl(
				0.16,
				0.16,
				0.14,
				C.ink,
				root,
				side * 0.58,
				-4.82,
				0.25,
			);
			wheel.rotation.x = Math.PI / 2;
			ball(0.065, C.yellow, root, side * 0.58, -4.82, 0.34, 8);
		}
		const mixer = new T.AnimationMixer(root);
		const tracks = [];
		for (let i = 0; i < 3; i++)
			tracks.push(
				new T.NumberKeyframeTrack(
					`bucket${id}_${i}.rotation[z]`,
					[0, 0.12, 0.25, 0.38],
					[0, i % 2 ? -0.07 : 0.07, -0.03, 0],
				),
			);
		const action = mixer
			.clipAction(new T.AnimationClip("water catch", 0.38, tracks))
			.setLoop(T.LoopOnce, 1);
		root.userData.catchAction = action;
		this.animators.push(mixer);
		return root;
	}
	event(e) {
		if (e.type === "drop") this.bomber.userData.toss.reset().play();
		if (e.type === "catch") {
			this.bucketGroups[e.player]?.userData.catchAction.reset().play();
			this.spray(e.x, e.y, 18, e.kind === "gold" ? C.yellow : C.blue, 1);
			this.ripple(e.x, e.y);
		}
		if (e.type === "splash") {
			this.spray(e.x, -2.7, 55, C.blue, 2.4);
			this.ripple(e.x, -2.3, 4);
			this.shake = 0.09;
		}
		if (e.type === "restore") {
			for (let i = 0; i < 2; i++)
				this.spray(i ? 5 : -5, -2.8, 28, C.yellow, 1.7);
		}
		if (e.type === "miss") {
			this.bomber.userData.laugh.reset().play();
			this.shake = 0.5;
			this.explosion(e.x, -4.6);
			for (const b of e.chain.slice(0, 14)) this.explosion(b.x, b.y, 0.65);
		}
		if (e.type === "finish" && e.won) {
			for (let i = 0; i < 12; i++)
				this.spray(
					-8 + i * 1.5,
					6,
					22,
					[C.coral, C.yellow, C.blue][i % 3],
					2.6,
				);
		}
	}
	spray(x, y, count, color, power = 1) {
		for (let i = 0; i < count; i++) {
			const o = mesh(
				new T.OctahedronGeometry(0.04 + Math.random() * 0.065),
				i % 5 === 0 ? C.white : color,
				this.scene,
				x,
				y,
				0.3,
				false,
			);
			const angle = Math.PI * (0.12 + Math.random() * 0.76);
			const speed = (1 + Math.random() * 3) * power;
			this.fx.push({
				o,
				vx: Math.cos(angle) * speed * (i % 2 ? 1 : -1),
				vy: Math.sin(angle) * speed,
				vz: (Math.random() - 0.5) * 2,
				life: 0.5 + Math.random() * 0.45,
				max: 1,
				gravity: 8,
			});
		}
	}
	ripple(x, y, size = 1) {
		const o = ring(0.45, 0.035, C.white, this.scene, x, y, 0.25, 0);
		this.fx.push({
			o,
			life: 0.4,
			max: 0.4,
			expand: size * 5,
			gravity: 0,
			vx: 0,
			vy: 0,
			vz: 0,
		});
	}
	explosion(x, y, size = 1) {
		const shape = new T.Shape();
		for (let i = 0; i < 24; i++) {
			const a = (i / 24) * Math.PI * 2;
			const r = i % 2 ? 0.55 : 1;
			const xx = Math.cos(a) * r,
				yy = Math.sin(a) * r;
			if (i === 0) shape.moveTo(xx, yy);
			else shape.lineTo(xx, yy);
		}
		shape.closePath();
		const o = mesh(new T.ShapeGeometry(shape), C.yellow, this.scene, x, y, 0.6);
		o.scale.setScalar(size);
		this.fx.push({
			o,
			life: 0.5,
			max: 0.5,
			expand: 2.8,
			gravity: 0,
			vx: 0,
			vy: 0.8,
			vz: 0,
		});
		this.spray(x, y, 30, C.coral, 1.8 * size);
	}
	project(x, y, z = 0) {
		const v = new T.Vector3(x * (this.horizontalScale ?? 1), y, z).project(
			this.camera,
		);
		return {
			x: ((v.x + 1) * innerWidth) / 2,
			y: ((1 - v.y) * innerHeight) / 2,
		};
	}
	pointerX(clientX, clientY = innerHeight / 2) {
		const v = new T.Vector3(
			(clientX / innerWidth) * 2 - 1,
			(-clientY / innerHeight) * 2 + 1,
			0,
		);
		const ray = new T.Raycaster();
		ray.setFromCamera(v, this.camera);
		const hit = ray.ray.intersectPlane(
			new T.Plane(new T.Vector3(0, 0, 1), 0),
			new T.Vector3(),
		);
		return (hit?.x ?? 0) / (this.horizontalScale ?? 1);
	}
	draw(dt, snapshot, { title = false, shake = 1 } = {}) {
		this.clock += dt;
		this.title = title;
		for (const m of this.animators) m.update(dt);
		this.heroBomb.visible = title;
		if (title) {
			this.heroBomb.position.y = 0.3 + Math.sin(this.clock * 1.5) * 0.3;
			this.heroBomb.rotation.z = Math.sin(this.clock * 0.6) * 0.14;
			this.bomber.position.x = 4.7 + Math.sin(this.clock * 0.7) * 0.3;
			this.bucketGroups[0].position.x = 4.7 + Math.sin(this.clock) * 0.8;
			this.bucketGroups[0].visible = true;
			for (let i = 1; i < 4; i++) this.bucketGroups[i].visible = false;
		} else if (snapshot) {
			this.bomber.position.x = T.MathUtils.damp(
				this.bomber.position.x,
				snapshot.bomberX ?? 0,
				9,
				dt,
			);
			for (let i = 0; i < 4; i++) {
				const p = snapshot.players.find((player) => player.id === i);
				const g = this.bucketGroups[i];
				g.visible = !!p;
				if (!p) continue;
				g.position.x = p.x;
				g.scale.x = (snapshot.config?.bucketWidth ?? 1.85) / 1.85;
				g.userData.buckets.forEach((b, j) => {
					b.visible = j < snapshot.lives;
				});
			}
		}
		const bombs = title ? [] : (snapshot?.bombs ?? []);
		const ids = new Set(bombs.map((b) => b.id));
		for (const [id, g] of this.bombMeshes)
			if (!ids.has(id)) {
				this.scene.remove(g);
				this.bombMeshes.delete(id);
			}
		for (const b of bombs) {
			let g = this.bombMeshes.get(b.id);
			if (!g) {
				g = this.makeBomb(b.kind);
				this.bombMeshes.set(b.id, g);
				this.scene.add(g);
			}
			g.position.set(b.x, b.y, 0);
			g.scale.x = 1 / (this.horizontalScale ?? 1);
			g.rotation.z = Math.sin((b.age ?? this.clock) * 3) * 0.2;
			g.userData.spark.scale.setScalar(
				0.8 + Math.sin(this.clock * 45 + b.id) * 0.4,
			);
			if (b.kind === "return" && Math.random() < dt * 35) {
				const dot = ball(0.035, C.coral, this.scene, b.x, b.y, 0.05, 6);
				this.fx.push({
					o: dot,
					life: 0.35,
					max: 0.35,
					vx: 0,
					vy: 0.2,
					vz: 0,
					gravity: 0,
				});
			}
		}
		for (let i = this.fx.length - 1; i >= 0; i--) {
			const f = this.fx[i];
			f.life -= dt;
			if (f.life <= 0) {
				this.scene.remove(f.o);
				f.o.geometry.dispose();
				this.fx.splice(i, 1);
				continue;
			}
			f.vy -= (f.gravity ?? 0) * dt;
			f.o.position.x += f.vx * dt;
			f.o.position.y += f.vy * dt;
			f.o.position.z += f.vz * dt;
			f.o.rotation.z += dt * 2;
			if (f.expand) f.o.scale.addScalar(f.expand * dt);
			else f.o.scale.setScalar(Math.min(1, f.life * 4));
		}
		this.shake = Math.max(0, this.shake - dt);
		const magnitude = this.reducedMotion ? 0 : this.shake * shake;
		this.camera.position.x = Math.sin(this.clock * 83) * magnitude * 0.3;
		this.camera.position.y = 6.3 + Math.cos(this.clock * 67) * magnitude * 0.2;
		this.camera.lookAt(0, 1, 0);
		this.renderer?.render(this.scene, this.camera);
	}
}
