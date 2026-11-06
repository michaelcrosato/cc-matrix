export async function createArena(THREE, canvas) {
	const C = {
		ink: 0x183b3c,
		paper: 0xf5edce,
		white: 0xfff9e6,
		coral: 0xf16b50,
		mint: 0x64bea5,
		gold: 0xf2bc44,
		muted: 0x9aab91,
		deep: 0x2f6257,
		blue: 0x6ca0b2,
	};
	const renderer = new THREE.WebGPURenderer({
		canvas,
		antialias: true,
		alpha: false,
		powerPreference: "high-performance",
	});
	renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
	renderer.setSize(innerWidth, innerHeight);
	renderer.setClearColor(C.paper, 1);
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	renderer.outputColorSpace = THREE.SRGBColorSpace;
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.05;
	await renderer.init();
	const scene = new THREE.Scene();
	scene.background = new THREE.Color(C.paper);
	scene.fog = new THREE.Fog(C.paper, 45, 100);
	const camera = new THREE.OrthographicCamera(-20, 20, 12, -12, 0.1, 150);
	camera.position.set(0, 24, 19);
	camera.lookAt(0, 0, 0);
	const hemi = new THREE.HemisphereLight(0xfffbe8, 0x86a68e, 1.75);
	scene.add(hemi);
	const sun = new THREE.DirectionalLight(0xfff0cf, 2.35);
	sun.position.set(-9, 22, 6);
	sun.castShadow = true;
	sun.shadow.mapSize.set(2048, 2048);
	sun.shadow.camera.left = -19;
	sun.shadow.camera.right = 19;
	sun.shadow.camera.top = 16;
	sun.shadow.camera.bottom = -16;
	sun.shadow.normalBias = 0.05;
	sun.shadow.bias = -0.0003;
	scene.add(sun);
	const fill = new THREE.DirectionalLight(0xc6e5d8, 0.7);
	fill.position.set(10, 5, -8);
	scene.add(fill);
	const materials = new Map();
	function mat(color, extra = {}) {
		const key = String(color) + JSON.stringify(extra);
		if (!materials.has(key))
			materials.set(
				key,
				new THREE.MeshStandardMaterial({
					color,
					roughness: 1,
					metalness: 0,
					flatShading: true,
					...extra,
				}),
			);
		return materials.get(key);
	}
	const inkMat = new THREE.MeshBasicMaterial({
		color: C.ink,
		side: THREE.BackSide,
	});
	const softInk = new THREE.MeshBasicMaterial({
		color: C.ink,
		transparent: true,
		opacity: 0.12,
		depthWrite: false,
	});
	const gBox = new THREE.BoxGeometry(1, 1, 1),
		gBall = new THREE.IcosahedronGeometry(1, 2),
		gDisc = new THREE.CylinderGeometry(1, 1, 1, 24),
		gHead = new THREE.IcosahedronGeometry(1, 1);
	function mesh(geometry, color, parent = scene, outline = 0.025) {
		const m = new THREE.Mesh(geometry, mat(color));
		m.castShadow = true;
		m.receiveShadow = true;
		parent.add(m);
		if (outline) {
			const o = new THREE.Mesh(geometry, inkMat);
			o.scale.setScalar(1 + outline);
			m.add(o);
		}
		return m;
	}
	function box(x, y, z, w, h, d, color, parent = scene, outline = 0.025) {
		const m = mesh(gBox, color, parent, outline);
		m.position.set(x, y, z);
		m.scale.set(w, h, d);
		return m;
	}
	function sphere(x, y, z, r, color, parent = scene, geometry = gBall) {
		const m = mesh(geometry, color, parent, 0.04);
		m.position.set(x, y, z);
		m.scale.setScalar(r);
		return m;
	}
	function disc(x, y, z, r, h, color, parent = scene, outline = 0.025) {
		const m = mesh(gDisc, color, parent, outline);
		m.position.set(x, y, z);
		m.scale.set(r, h, r);
		return m;
	}
	function line(x, z, w, d, color = C.ink, y = 0.091, parent = scene) {
		return box(x, y, z, w, 0.014, d, color, parent, 0);
	}
	function textTexture(
		text,
		width = 1024,
		height = 128,
		bg = null,
		fg = "#183b3c",
		size = 72,
	) {
		const c = document.createElement("canvas");
		c.width = width;
		c.height = height;
		const cx = c.getContext("2d");
		if (bg) {
			cx.fillStyle = bg;
			cx.fillRect(0, 0, width, height);
		}
		cx.fillStyle = fg;
		cx.font = `900 ${size}px "Arial Black",Arial,sans-serif`;
		cx.textAlign = "center";
		cx.textBaseline = "middle";
		cx.fillText(text, width / 2, height / 2);
		const t = new THREE.CanvasTexture(c);
		t.colorSpace = THREE.SRGBColorSpace;
		t.anisotropy = 4;
		return t;
	}
	function label(
		text,
		x,
		y,
		z,
		w,
		h,
		{ rotation = 0, color = "#183b3c", bg = null, size = 72 } = {},
	) {
		const height = 192,
			width = Math.round((height * w) / h);
		const fitSize = Math.min(height * 0.72, width / (text.length * 0.63));
		const tex = textTexture(text, width, height, bg, color, fitSize);
		const m = new THREE.Mesh(
			new THREE.PlaneGeometry(w, h),
			new THREE.MeshBasicMaterial({
				map: tex,
				transparent: !bg,
				depthWrite: !!bg,
			}),
		);
		m.position.set(x, y, z);
		m.rotation.x = rotation;
		scene.add(m);
		return m;
	}
	// A miniature arena cut from layers of painted wood and heavy ink.
	const backdrop = box(0, -1.55, 0, 300, 0.12, 300, C.paper, scene, 0);
	backdrop.receiveShadow = true;
	box(0, -0.95, 0, 27, 0.7, 19.1, C.ink, scene, 0.006);
	box(0, -0.53, 0, 26.6, 0.28, 18.7, C.gold, scene, 0.008);
	box(0, -0.27, 0, 26.15, 0.28, 18.25, C.white, scene, 0.008);
	box(0, -0.09, 0, 22.5, 0.24, 13.8, C.ink, scene, 0.006);
	const field = box(0, 0.035, 0, 20.2, 0.11, 12.1, C.paper, scene, 0);
	// Paper-print striping, borders, and scoring marks.
	const stripes = [];
	for (let i = 0; i < 10; i++) {
		const m = line(
			-9 + i * 2,
			0,
			1.98,
			11.9,
			i % 2 ? 0xefe5c1 : 0xf5edce,
			0.098,
		);
		stripes.push(m);
	}
	line(0, -6, 20.3, 0.11);
	line(0, 6, 20.3, 0.11);
	line(-10, 0, 0.11, 12);
	line(10, 0, 0.11, 12);
	for (let z = -5.6; z < 6; z += 0.7) line(0, z, 0.08, 0.33, C.ink, 0.113);
	const centerCircle = new THREE.Mesh(
		new THREE.RingGeometry(1.59, 1.63, 64),
		mat(C.ink),
	);
	centerCircle.rotation.x = -Math.PI / 2;
	centerCircle.position.y = 0.117;
	scene.add(centerCircle);
	disc(0, 0.12, 0, 0.13, 0.016, C.ink, scene, 0);
	for (const side of [-1, 1]) {
		line(side * 7.8, 0, 0.045, 11.8, side < 0 ? C.coral : C.mint, 0.116);
		for (let z = -5; z <= 5; z += 1)
			line(side * 9.6, z, 0.18, 0.035, C.ink, 0.12);
		const p = label(side < 0 ? "01" : "02", side * 7.45, 0.14, 4.7, 1.5, 0.35, {
			rotation: -Math.PI / 2,
			size: 82,
		});
		// Colored out-of-bounds aprons.
		box(
			side * 11.15,
			0.015,
			0,
			1.85,
			0.15,
			12.2,
			side < 0 ? C.coral : C.mint,
			scene,
			0.008,
		);
		for (let z = -5.5; z < 6; z += 1.1) {
			const hatch = line(side * 11.2, z, 1.2, 0.04, C.ink, 0.112);
			hatch.rotation.y = -0.32 * side;
		}
	}
	label("P A D D L E   /   R O Y A L E", 0, 0.15, 7.85, 10.6, 0.58, {
		rotation: -Math.PI / 2,
		size: 70,
	});
	label("SPORTING CLUB  •  EST. 1977", 0, 0.15, -7.5, 9, 0.38, {
		rotation: -Math.PI / 2,
		size: 62,
	});
	for (const side of [-1, 1]) {
		box(0, 0.35, side * 6.18, 20.6, 0.52, 0.24, C.ink, scene, 0.01);
		box(0, 0.64, side * 6.18, 20.6, 0.1, 0.29, C.white, scene, 0.02);
		for (let x = -9; x <= 9; x += 2.25) {
			box(
				x,
				0.36,
				side * 6.32,
				0.65,
				0.55,
				0.13,
				x < 0 ? C.coral : C.mint,
				scene,
				0.03,
			);
		}
	}
	// The two paddle athletes have little sneakers and a wrap-around sweatband.
	const paddles = [];
	for (let i = 0; i < 2; i++) {
		const side = i ? 1 : -1,
			color = i ? C.mint : C.coral,
			g = new THREE.Group();
		g.position.set(side * 9, 0, 0);
		scene.add(g);
		const shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 32), softInk);
		shadow.rotation.x = -Math.PI / 2;
		shadow.position.set(0, 0.126, 0.16);
		shadow.scale.set(0.9, 1.3, 1);
		g.add(shadow);
		const body = box(0, 0.57, 0, 0.5, 0.81, 1.86, color, g, 0.06);
		box(0, 0.9, 0, 0.54, 0.12, 1.94, C.white, g, 0.045);
		box(-side * 0.265, 0.56, 0, 0.026, 0.26, 0.58, C.white, g, 0);
		for (const z of [-0.62, 0.62]) {
			box(side * 0.06, 0.2, z, 0.61, 0.24, 0.46, C.ink, g, 0.035);
			box(-side * 0.12, 0.25, z, 0.25, 0.13, 0.36, C.white, g, 0.05);
		}
		// Bright side-facing dots read like eyes from the elevated camera.
		for (const z of [-0.2, 0.2])
			sphere(-side * 0.278, 0.66, z, 0.065, C.ink, g, gHead);
		const ring = new THREE.Mesh(
			new THREE.RingGeometry(0.68, 0.76, 36),
			new THREE.MeshBasicMaterial({
				color: C.gold,
				transparent: true,
				opacity: 0,
				side: THREE.DoubleSide,
			}),
		);
		ring.rotation.x = -Math.PI / 2;
		ring.position.y = 0.14;
		ring.scale.set(1, 1.6, 1);
		g.add(ring);
		const aim = box(-side * 0.95, 0.2, 0, 0.75, 0.025, 0.055, color, g, 0);
		aim.visible = false;
		paddles.push({ g, body, ring, aim, side });
	}
	const ballGroup = new THREE.Group();
	scene.add(ballGroup);
	const ball = sphere(0, 0.52, 0, 0.29, C.gold, ballGroup);
	const ballStripe = disc(0, 0.52, 0, 0.3, 0.07, C.white, ballGroup, 0.01);
	ballStripe.rotation.z = 0.65;
	const ballShadow = new THREE.Mesh(
		new THREE.CircleGeometry(0.35, 24),
		softInk,
	);
	ballShadow.rotation.x = -Math.PI / 2;
	ballShadow.position.y = 0.13;
	scene.add(ballShadow);
	const trail = [];
	for (let i = 0; i < 22; i++) {
		const m = sphere(0, 0.32, 0, 0.18 * (1 - i / 25), i % 3 ? C.gold : C.white);
		m.castShadow = false;
		m.visible = false;
		trail.push(m);
	}
	const sparkMeshes = [];
	for (let i = 0; i < 90; i++) {
		const m = mesh(
			gHead,
			i % 3 === 0 ? C.coral : i % 3 === 1 ? C.gold : C.mint,
			scene,
			0,
		);
		m.scale.setScalar(0.075);
		m.visible = false;
		sparkMeshes.push(m);
	}
	const bankGroup = new THREE.Group();
	scene.add(bankGroup);
	const bumpers = [];
	for (const [x, z] of [
		[-3, -2.5],
		[3, 2.5],
	]) {
		disc(x, 0.18, z, 1.05, 0.13, C.ink, bankGroup, 0.01);
		disc(x, 0.25, z, 0.95, 0.1, C.white, bankGroup, 0.015);
		const target = new THREE.Mesh(
			new THREE.RingGeometry(0.76, 0.79, 40),
			mat(C.coral),
		);
		target.rotation.x = -Math.PI / 2;
		target.position.set(x, 0.31, z);
		bankGroup.add(target);
		const b = disc(x, 0.56, z, 0.58, 0.55, C.gold, bankGroup, 0.055);
		disc(x, 0.87, z, 0.42, 0.1, C.coral, bankGroup, 0.03);
		disc(x, 0.93, z, 0.19, 0.04, C.white, bankGroup, 0.03);
		bumpers.push(b);
		for (let a = 0; a < 4; a++) {
			const angle = (a * Math.PI) / 2;
			const mark = line(
				x + Math.cos(angle) * 1.18,
				z + Math.sin(angle) * 1.18,
				0.2,
				0.04,
				C.ink,
				0.13,
				bankGroup,
			);
			mark.rotation.y = -angle;
		}
	}
	bankGroup.visible = false;
	const goalGroup = new THREE.Group();
	scene.add(goalGroup);
	for (const side of [-1, 1]) {
		const color = side < 0 ? C.coral : C.mint;
		for (const z of [-4.2, 4.2]) {
			box(side * 10.05, 0.54, z, 0.3, 0.85, 3.6, color, goalGroup, 0.035);
			for (let j = -1; j <= 1; j++)
				box(
					side * 9.87,
					0.98,
					z + j,
					0.37,
					0.08,
					0.24,
					C.white,
					goalGroup,
					0.025,
				);
		}
		// A small proper net stretches off the edge of the table.
		for (const z of [-2.4, 2.4]) {
			box(side * 10.15, 0.88, z, 0.17, 1.7, 0.17, C.white, goalGroup, 0.07);
			box(side * 11.25, 0.75, z, 0.12, 1.45, 0.12, C.ink, goalGroup, 0.04);
		}
		box(side * 10.15, 1.68, 0, 0.18, 0.18, 4.98, C.white, goalGroup, 0.035);
		box(side * 11.25, 1.44, 0, 0.1, 0.1, 4.9, C.ink, goalGroup, 0.025);
		for (let z = -2.4; z <= 2.41; z += 0.4) {
			box(side * 11.25, 0.76, z, 0.035, 1.35, 0.035, C.white, goalGroup, 0);
			box(side * 10.7, 1.55, z, 1.2, 0.03, 0.035, C.white, goalGroup, 0);
		}
		for (let y = 0.2; y < 1.5; y += 0.26)
			box(side * 11.25, y, 0, 0.035, 0.035, 4.8, C.white, goalGroup, 0);
		const arc = new THREE.Mesh(
			new THREE.RingGeometry(
				2.7,
				2.75,
				48,
				1,
				side < 0 ? -Math.PI / 2 : Math.PI / 2,
				Math.PI,
			),
			mat(C.ink),
		);
		arc.rotation.x = -Math.PI / 2;
		arc.position.set(side * 10, 0.13, 0);
		goalGroup.add(arc);
	}
	goalGroup.visible = false;
	// Bleacher stairs, with mint-and-coral supporters bouncing in animation clips.
	const mixers = [];
	const crowdGroups = [];
	const crowdColors = [C.coral, C.mint, C.gold, C.white, C.blue];
	for (let row = 0; row < 3; row++) {
		box(
			0,
			0.15 + row * 0.3,
			-8.55 - row * 0.7,
			23.4,
			0.4 + row * 0.3,
			0.66,
			row % 2 ? C.deep : C.ink,
			scene,
			0.008,
		);
		box(
			0,
			0.4 + row * 0.45,
			-8.5 - row * 0.7,
			23.5,
			0.12,
			0.64,
			C.white,
			scene,
			0.009,
		);
		for (let cluster = 0; cluster < 4; cluster++) {
			const g = new THREE.Group();
			g.position.set(
				-8.5 + cluster * 5.6,
				0.44 + row * 0.45,
				-8.55 - row * 0.7,
			);
			scene.add(g);
			crowdGroups.push(g);
			for (let j = 0; j < 6; j++) {
				const x = (j - 2.5) * 0.72,
					z = 0,
					color = crowdColors[(row * 3 + j + cluster) % crowdColors.length];
				const body = box(x, 0.24, z, 0.36, 0.44, 0.32, color, g, 0.07);
				sphere(x, 0.62, z, 0.22, C.paper, g, gHead);
				box(x, 0.77, z, 0.42, 0.1, 0.3, color, g, 0.04);
				const a = box(x - 0.24, 0.4, z, 0.1, 0.34, 0.1, color, g, 0.08);
				a.rotation.z = 0.7;
				const b = box(x + 0.24, 0.4, z, 0.1, 0.34, 0.1, color, g, 0.08);
				b.rotation.z = -0.7;
			}
			const mixer = new THREE.AnimationMixer(g),
				dur = 1.1 + (cluster % 3) * 0.13;
			const track = new THREE.NumberKeyframeTrack(
				".position[y]",
				[0, dur * 0.25, dur * 0.5, dur * 0.75, dur],
				[
					g.position.y,
					g.position.y + 0.09,
					g.position.y,
					g.position.y + 0.03,
					g.position.y,
				],
			);
			const clip = new THREE.AnimationClip("terrace-bounce", dur, [track]);
			mixer.clipAction(clip).play();
			mixer.setTime(cluster * 0.22 + row * 0.33);
			mixers.push(mixer);
		}
	}
	// Far side scoreboard, expressive advertising panels, flags, and floodlights.
	for (const x of [-5.5, 5.5])
		box(x, 1.3, -11.1, 0.22, 2.6, 0.22, C.ink, scene, 0.03);
	box(0, 3.02, -11.1, 12.7, 1.8, 0.28, C.ink, scene, 0.02);
	box(0, 3.03, -10.93, 12.3, 1.45, 0.055, C.gold, scene, 0.02);
	label("GOOD SPORT. GREAT SHOT.", 0, 3.1, -10.88, 11.3, 0.75, { size: 75 });
	for (const x of [-6, 6]) sphere(x, 3.02, -10.87, 0.15, C.coral);
	for (const [x, z] of [
		[-12.6, -7.2],
		[12.6, -7.2],
		[-12.6, 7.7],
		[12.6, 7.7],
	]) {
		box(x, 2.75, z, 0.16, 5.5, 0.16, C.ink, scene, 0.03);
		box(x, 5.5, z, 1.7, 0.65, 0.28, C.ink, scene, 0.03);
		for (let j = 0; j < 3; j++) {
			const lamp = box(
				x + (j - 1) * 0.48,
				5.5,
				z + 0.18,
				0.33,
				0.4,
				0.1,
				C.white,
				scene,
				0.04,
			);
		}
		const base = disc(x, 0.12, z, 0.38, 0.28, C.ink, scene, 0.02);
	}
	for (const side of [-1, 1]) {
		for (let j = 0; j < 3; j++) {
			const x = side * (8.5 + j * 1.45),
				z = -11.6;
			box(x, 2.15, z, 0.06, 4.3, 0.06, C.ink, scene, 0.02);
			const flag = new THREE.Group();
			flag.position.set(x, 4.13, z);
			scene.add(flag);
			const shape = new THREE.Shape();
			shape.moveTo(0, 0);
			shape.lineTo(0.95, -0.27);
			shape.lineTo(0, -0.56);
			shape.closePath();
			const m = mesh(
				new THREE.ShapeGeometry(shape),
				j % 2 ? C.gold : side < 0 ? C.coral : C.mint,
				flag,
				0,
			);
			m.material = mat(j % 2 ? C.gold : side < 0 ? C.coral : C.mint, {
				side: THREE.DoubleSide,
			});
			const mixer = new THREE.AnimationMixer(flag);
			const d = 2.4 + j * 0.25;
			const track = new THREE.NumberKeyframeTrack(
				".rotation[y]",
				[0, d * 0.25, d * 0.5, d * 0.75, d],
				[0, 0.35, 0, -0.25, 0],
			);
			mixer
				.clipAction(new THREE.AnimationClip("pennant-flutter", d, [track]))
				.play();
			mixer.setTime(j * 0.4);
			mixers.push(mixer);
		}
	}
	// Club pennants along the near apron.
	for (let j = -5; j <= 5; j++) {
		const shp = new THREE.Shape();
		shp.moveTo(-0.33, 0);
		shp.lineTo(0.33, 0);
		shp.lineTo(0, -0.58);
		shp.closePath();
		const flag = mesh(
			new THREE.ShapeGeometry(shp),
			j % 2 ? C.coral : C.mint,
			scene,
			0,
		);
		flag.material = mat(j % 2 ? C.coral : C.mint, { side: THREE.DoubleSide });
		flag.position.set(j * 1.65, 0.12, 8.35);
		flag.rotation.x = -0.18;
	}
	// Decorative clipped-corner club crests.
	for (const side of [-1, 1]) {
		const g = new THREE.Group();
		g.position.set(side * 12.35, 0.2, 4.7);
		scene.add(g);
		const d = disc(0, 0.06, 0, 0.6, 0.1, C.ink, g, 0.015);
		disc(0, 0.13, 0, 0.48, 0.07, C.gold, g, 0.01);
		for (let i = 0; i < 3; i++) {
			const b = box((i - 1) * 0.21, 0.2, 0, 0.11, 0.05, 0.49, C.white, g, 0.01);
			b.rotation.y = 0.4;
		}
	}
	let elapsed = 0,
		lastMode = "",
		cameraOffset = 0,
		frame = 0;
	function resize() {
		const w = innerWidth,
			h = innerHeight,
			aspect = w / h;
		const viewHeight = aspect < 1 ? 29 / aspect : aspect < 1.4 ? 24.5 : 23;
		camera.left = (-viewHeight * aspect) / 2;
		camera.right = (viewHeight * aspect) / 2;
		camera.top = viewHeight / 2;
		camera.bottom = -viewHeight / 2;
		camera.updateProjectionMatrix();
		renderer.setSize(w, h);
	}
	resize();
	function project(x, z) {
		const v = new THREE.Vector3(x, 0.3, z).project(camera);
		return {
			x: (v.x * 0.5 + 0.5) * canvas.clientWidth,
			y: (-v.y * 0.5 + 0.5) * canvas.clientHeight,
		};
	}
	function update(dt, state = {}) {
		elapsed += dt;
		frame++;
		const mode = state.mode || "rally";
		if (mode !== lastMode) {
			lastMode = mode;
			bankGroup.visible = mode === "bank";
			goalGroup.visible = mode === "goal";
			field.material = mat(mode === "goal" ? 0xc8ddae : C.paper);
			stripes.forEach(
				(m, i) =>
					(m.material = mat(
						mode === "goal"
							? i % 2
								? 0xc6d8a8
								: 0xd3e0b5
							: i % 2
								? 0xefe5c1
								: 0xf5edce,
					)),
			);
		}
		const title = state.phase === "title" || state.phase === "menu";
		const desired = title && innerWidth > 900 ? -5.0 : 0;
		cameraOffset += (desired - cameraOffset) * Math.min(1, dt * 3);
		camera.position.set(cameraOffset, 24, 17.5);
		camera.lookAt(cameraOffset, 0, -1.5);
		for (const mixer of mixers)
			mixer.update(dt * (state.phase === "pause" ? 0.3 : 1));
		const pds = state.paddles || [
			{ z: Math.sin(elapsed) * 2 },
			{ z: Math.sin(elapsed + 0.7) * 2 },
		];
		for (let i = 0; i < 2; i++) {
			const p = paddles[i],
				s = pds[i] || {};
			p.g.position.z = s.z || 0;
			p.g.scale.z = (state.paddleSize || 1.05) / 1.05;
			p.body.rotation.x = (s.velocity || 0) * 0.006;
			p.body.scale.y = 0.81 * (1 + Math.sin(elapsed * 8) * 0.015);
			const charge = Math.max(0, Number(s.charge) || 0);
			p.ring.material.opacity = charge * 0.85;
			p.ring.rotation.z = elapsed * 2;
			p.ring.scale.set(1 + charge * 0.5, (1 + charge * 0.5) * 1.6, 1);
			p.aim.visible = charge > 0.1;
			p.aim.rotation.y = (s.aim || 0) * 0.6;
			p.g.position.y = s.dash > 0 ? 0.06 + Math.sin(elapsed * 50) * 0.035 : 0;
		}
		const bs = state.ball || {
			x: Math.sin(elapsed * 1.5) * 7.8,
			z: Math.sin(elapsed * 2) * 4,
		};
		ballGroup.position.set(bs.x || 0, Math.sin(elapsed * 9) * 0.015, bs.z || 0);
		ball.rotation.y += dt * 4;
		ball.rotation.x += dt * 2.5;
		ballStripe.rotation.y += dt * 3;
		ballShadow.position.set(bs.x || 0, 0.13, bs.z || 0);
		const pts = state.trail || [];
		trail.forEach((m, i) => {
			const p = pts[i];
			m.visible = !!p;
			if (p) m.position.set(p.x, 0.25 + (1 - i / 25) * 0.08, p.z);
		});
		const sparks = state.particles || [];
		sparkMeshes.forEach((m, i) => {
			const p = sparks[i];
			m.visible = !!p && p.life > 0;
			if (p) {
				m.position.set(p.x, p.y ?? 0.45, p.z);
				m.scale.setScalar(0.05 + Math.max(0, p.life) * 0.1);
				m.rotation.x += dt * 8;
				m.rotation.z += dt * 5;
				if (p.color !== undefined) m.material = mat(p.color);
			}
		});
		bumpers.forEach((b, i) => {
			b.rotation.y = elapsed * 0.4 * (i ? 1 : -1);
		});
		renderer.render(scene, camera);
	}
	function dispose() {
		renderer.dispose();
		scene.traverse((o) => {
			if (o.geometry && ![gBox, gBall, gDisc, gHead].includes(o.geometry))
				o.geometry.dispose();
		});
		for (const m of materials.values()) m.dispose();
		inkMat.dispose();
		softInk.dispose();
		gBox.dispose();
		gBall.dispose();
		gDisc.dispose();
		gHead.dispose();
	}
	return {
		renderer,
		scene,
		camera,
		update,
		resize,
		project,
		dispose,
		diagnostics: () => ({
			backend: renderer.backend?.isWebGPUBackend ? "WebGPU" : "WebGL2",
			meshes: renderer.info?.render?.calls,
			frames: frame,
			animationMixers: mixers.length,
		}),
	};
}
