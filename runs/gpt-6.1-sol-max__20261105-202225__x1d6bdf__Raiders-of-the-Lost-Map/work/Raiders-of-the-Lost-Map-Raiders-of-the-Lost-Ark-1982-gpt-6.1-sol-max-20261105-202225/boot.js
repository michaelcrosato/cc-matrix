function resize() {
	if (!renderer || !camera) return;
	renderer.setSize(innerWidth, innerHeight);
	const aspect = innerWidth / innerHeight;
	let size =
		S.mode === "title" ? 36 : S.stage === 6 ? 31 : S.stage === 4 ? 38 : 39;
	if (aspect < 1.2) size = Math.max(size, 43 / aspect);
	camera.left = (-size * aspect) / 2;
	camera.right = (size * aspect) / 2;
	camera.top = size / 2;
	camera.bottom = -size / 2;
	camera.updateProjectionMatrix();
}
function updateCamera(dt) {
	const p = localPlayer();
	let desired = vec(0, 0, 0);
	if (S.mode === "title") desired.set(-10, 0, 7.5);
	else if (S.stage === 4) desired.set(0, clamp((p?.pos.y || 0) - 3, 0, 17), 0);
	else if (S.stage === 6) desired.set(0, 0, clamp((p?.pos.z || 0) - 5, -24, 5));
	cameraLook.lerp(desired, Math.min(1, dt * 3.8));
	const offset = vec(25, 31, 36);
	camera.position.copy(cameraLook).add(offset);
	if (settings.shake && shake > 0) {
		camera.position.x += (Math.random() - 0.5) * shake;
		camera.position.y += (Math.random() - 0.5) * shake;
	}
	shake = Math.max(0, shake - dt);
	camera.lookAt(cameraLook);
	resize();
}
function frame(now) {
	if (!ready) return;
	const raw = lastFrame ? Math.min((now - lastFrame) / 1000, 0.12) : 1 / 60;
	lastFrame = now;
	renderTime += raw;
	pollInput(raw);
	if (
		S.mode === "title" &&
		performance.now() - lastActivity > 10000 &&
		!netActive
	)
		startAttract();
	if (hostAuthority()) {
		accumulator += raw * tune.timeScale;
		let count = 0;
		while (accumulator >= 1 / 60 && count < 8) {
			if (!AIHub.active || (hubStarted && AIHub.time() >= 0)) stepWorld(1 / 60);
			accumulator -= 1 / 60;
			count++;
		}
	} else S.time += raw;
	networkTick(raw);
	visuals(raw);
	updateCamera(raw);
	refreshHUD(raw);
	audio.update();
	if (!hubInfo?.server) renderer.render(scene, camera);
	metrics.frames++;
}
function addMenuScenery() {
	for (const o of level.children) if (o.isSprite) o.visible = false;
	for (const i of S.interacts) if (i.marker) i.marker.visible = false;
	// A little temple above an implausibly deep canyon.
	const g = new THREE.Group();
	g.position.set(13, 0, 3);
	level.add(g);
	box(0, 0.3, -1.3, 7, 0.6, 6, "sandLight", g);
	for (let i = 0; i < 3; i++)
		box(
			0,
			0.15 + i * 0.15,
			2.2 - i * 0.45,
			5.6 - i * 0.4,
			0.25,
			1.7,
			"sandLight",
			g,
		);
	for (const x of [-2.6, -0.9, 0.9, 2.6]) {
		cylinder(x, 2.3, -0.2, 0.3, 4, "sand", g, 8);
		box(x, 4.3, -0.2, 0.9, 0.35, 0.9, "cream", g);
	}
	box(0, 4.75, -1.2, 7.4, 0.7, 5, "sandLight", g);
	const roof = mesh(
		new THREE.ConeGeometry(4.4, 1.1, 4),
		"rock",
		0,
		5.6,
		-1.1,
		g,
	);
	roof.rotation.y = PI / 4;
	roof.scale.z = 0.7;
	box(0, 2.4, -2.8, 5.7, 4.3, 0.5, "rock", g);
	box(0, 1.7, -2.5, 1.8, 3.2, 0.12, "deep", g);
	cylinder(0, 5.2, -1, 0.2, 0.7, "gold", g);
	palm(15, 7, 0.7);
	pot(10, 5, 0.6);
	const v = makeExplorer(COLORS[0]);
	v.mesh.position.set(11, 0, 7.6);
	v.mesh.rotation.y = -0.8;
	v.mesh.scale.setScalar(1.35);
	level.add(v.mesh);
	S.dynamic.push({ kind: "npc", visual: v, mesh: v.mesh });
}
async function boot() {
	try {
		$("load-status").textContent = "Preparing the expedition…";
		const hubPromise = initializeHub();
		await RAPIER.init();
		scene = new THREE.Scene();
		gradient = new THREE.DataTexture(
			new Uint8Array([75, 160, 255]),
			3,
			1,
			THREE.RedFormat,
		);
		gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
		gradient.needsUpdate = true;
		inkMaterial = new THREE.MeshBasicMaterial({
			color: 0x20332e,
			side: THREE.BackSide,
		});
		lineMaterial = new THREE.LineBasicMaterial({
			color: 0x394334,
			transparent: true,
			opacity: 0.65,
		});
		shadowMaterial = new THREE.MeshBasicMaterial({
			color: 0x132e2a,
			transparent: true,
			opacity: 0.22,
			depthWrite: false,
		});
		const ambient = new THREE.HemisphereLight(0xffe9b5, 0x56736c, 1.4);
		ambient.name = "ambient";
		scene.add(ambient);
		const sun = new THREE.DirectionalLight(0xffe1ac, 2.7);
		sun.name = "sunlight";
		sun.position.set(-12, 28, 8);
		sun.castShadow = true;
		sun.shadow.mapSize.set(2048, 2048);
		sun.shadow.camera.left = -35;
		sun.shadow.camera.right = 35;
		sun.shadow.camera.top = 30;
		sun.shadow.camera.bottom = -30;
		sun.shadow.camera.far = 100;
		sun.shadow.bias = -0.0008;
		sun.shadow.normalBias = 0.04;
		scene.add(sun);
		const fill = new THREE.DirectionalLight(0x8fb8ab, 0.45);
		fill.position.set(15, 10, -15);
		scene.add(fill);
		camera = new THREE.OrthographicCamera(-32, 32, 18, -18, 0.1, 220);
		raycaster = new THREE.Raycaster();
		plane = new THREE.Plane(vec(0, 1, 0), 0);
		renderer = new THREE.WebGPURenderer({
			canvas: $("world"),
			antialias: true,
			forceWebGL: params.get("renderer") === "webgl",
		});
		await renderer.init();
		renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFShadowMap;
		renderer.outputColorSpace = THREE.SRGBColorSpace;
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1.05;
		await hubPromise;
		if (AIHub.active && hubInfo) {
			newRun();
			S.mode = "waiting";
			menu = null;
			$("title-screen").classList.add("hidden");
			$("hud").classList.remove("hidden");
		} else {
			returnTitle();
		}
		resize();
		updateCamera(1);
		visuals(0);
		// Compile the first world before reporting readiness.
		if (!hubInfo?.server) await renderer.compileAsync(scene, camera);
		ready = true;
		lastActivity = performance.now();
		document.body.dataset.ready = "true";
		document.body.dataset.renderer = renderer.backend.isWebGPUBackend
			? "webgpu"
			: "webgl2";
		$("loading").classList.add("hidden");
		window.addEventListener("resize", resize);
		renderer.setAnimationLoop(frame);
		if (AIHub.active) AIHub.ready();
		else if (params.has("room")) {
			openMenu("join");
			const code = params.get("room").replace(/\D/g, "").slice(0, 6);
			if (code.length === 6) {
				$("room-input").value = code;
				await joinRoom(code);
			}
		}
	} catch (err) {
		loadingError = String(err.stack || err);
		console.error(err);
		$("load-status").textContent =
			"The expedition could not load: " +
			err.message +
			". Check your internet connection, then reload.";
		if (AIHub.active) AIHub.fail(err.message);
	}
}
window.__game = {
	get ready() {
		return ready;
	},
	get backend() {
		return renderer?.backend.isWebGPUBackend ? "webgpu" : "webgl2";
	},
	get credits() {
		return CREDITS;
	},
	get state() {
		return {
			mode: S.mode,
			menu,
			stage: S.stage,
			stageName: stageData[S.stage].name,
			time: S.time,
			elapsed: S.elapsed,
			coins: S.coins,
			kills: S.kills,
			secrets: S.secrets,
			flags: { ...S.flags },
			target: S.target,
			mirrors: [...S.mirrors],
			seals: [...S.seals],
			selectedMesa: S.selectedMesa,
			won: S.won,
			attract: S.attract,
			deathCount: S.deathCount,
			localId,
			netActive,
			isHost,
			hubStarted,
			hubEnded,
			players: S.players.map((p) => ({
				id: p.id,
				hp: p.hp,
				pos: { ...p.pos },
				face: p.face,
				down: p.down,
				gliding: p.gliding,
				swing: !!p.swing,
				flute: p.flute,
				toolCd: p.toolCd,
			})),
			enemies: S.enemies
				.filter((e) => !e.dead)
				.map((e) => ({
					id: e.id,
					kind: e.kind,
					pos: { ...e.pos },
					hp: e.hp,
					state: e.state,
					timer: e.timer,
				})),
			interacts: S.interacts
				.filter((i) => i.enabled && (!i.can || i.can()))
				.map((i) => ({
					id: i.id,
					x: i.x,
					z: i.z,
					radius: i.radius,
					label: typeof i.label === "function" ? i.label() : i.label,
				})),
			metrics: { ...metrics },
			tune: { ...tune },
			settings: { ...settings },
			error: loadingError,
		};
	},
	start: () => {
		S.attract = false;
		$("attract-banner").classList.add("hidden");
		newRun();
	},
	input: (input) => Object.assign(latestInput, input),
	step: (seconds, input = {}) => {
		for (let i = 0; i < Math.round(seconds * 60); i++) {
			Object.assign(latestInput, input);
			stepWorld(1 / 60);
		}
		visuals(0);
		refreshHUD(0);
		return window.__game.state;
	},
	drive: (x, z, maxSeconds = 20, tolerance = 0.55, autoCombat = false) => {
		const startStage = S.stage;
		let i = 0;
		for (; i < maxSeconds * 60; i++) {
			const p = localPlayer(),
				dx = x - p.pos.x,
				dz = z - p.pos.z,
				n = Math.hypot(dx, dz);
			if (n < tolerance && (p.roll || 0) <= 0) break;
			latestInput = {
				x: (dx * 0.821 - dz * 0.571) / n,
				z: (dx * 0.571 + dz * 0.821) / n,
				attack: autoCombat,
				interact: false,
				dodge:
					autoCombat &&
					(S.enemies.some(
						(e) =>
							!e.dead &&
							e.state === "windup" &&
							e.timer < 0.3 &&
							dist(e.pos, p.pos) < 4.4,
					) ||
						S.projectiles.some((a) => dist(a, p.pos) < 1.8)),
				tool:
					autoCombat &&
					S.flags.flute &&
					p.toolCd <= 0 &&
					S.enemies.some(
						(e) => !e.dead && e.kind === "snake" && dist(e.pos, p.pos) < 6,
					),
			};
			stepWorld(1 / 60);
			if (S.stage !== startStage) break;
		}
		latestInput.x = 0;
		latestInput.z = 0;
		visuals(0);
		return {
			reached: dist(localPlayer().pos, { x, z }) < tolerance,
			steps: i,
			stage: S.stage,
			pos: { ...localPlayer().pos },
		};
	},
	action: (name) => {
		const p = localPlayer();
		if (name === "interact") return interact(p);
		if (name === "attack") return attack(p);
		if (name === "tool") return useTool(p);
		if (name === "dodge") return dodge(p, latestInput);
	},
	menu: (kind) => openMenu(kind),
	resume: () => {
		menu = null;
		menuTrail.length = 0;
		$("modal").classList.add("hidden");
	},
	attract: startAttract,
	exitAttract: stopAttract,
	idle: () => {
		lastActivity = performance.now() - 10001;
	},
	audio: () => audio.offlineTest(),
	unlockAudio: () => audio.unlock(),
	debug: {
		teleport: (x, y, z) => {
			const p = localPlayer();
			p.pos = { x, y, z };
			p.vy = 0;
			p.body.setTranslation({ x, y: y + 0.92, z }, true);
			p.body.setNextKinematicTranslation({ x, y: y + 0.92, z });
			world.step();
			visuals(0);
		},
		setStage: setDevStage,
		tune: (values) => Object.assign(tune, values),
		flags: (values) => Object.assign(S.flags, values),
		god: (value) => (debug.god = value),
		freeze: (value) => (debug.freeze = value),
		hurt: (amount = 1) => {
			const p = localPlayer();
			p.invuln = 0;
			return damagePlayer(p, amount);
		},
		spawn: (kind, x, z) => spawnEnemy(kind, x, z).id,
		snapshot: makeSnapshot,
		events: () => [...debugLog],
		colliderCount: () => world?.colliders.len(),
		dispose: () => {
			renderer.setAnimationLoop(null);
			standalone?.close();
			audio.stop();
		},
	},
	room: {
		create: createRoom,
		join: joinRoom,
		close: () => returnTitle(),
		get code() {
			return standalone?.code;
		},
	},
	render: () => {
		renderer.render(scene, camera);
		return { frames: metrics.frames, backend: window.__game.backend };
	},
};
boot();
