async function boot() {
	try {
		await RAPIER.init();
		world = new RAPIER.World({ x: 0, y: -14, z: 0 });
		gradient = new THREE.DataTexture(
			new Uint8Array([90, 154, 215, 255]),
			4,
			1,
			THREE.RedFormat,
		);
		gradient.minFilter = THREE.NearestFilter;
		gradient.magFilter = THREE.NearestFilter;
		gradient.needsUpdate = true;
		glowMap = glowTexture();
		$("#loadStatus").textContent = "Turning on the porch lights…";
		renderer = new THREE.WebGPURenderer({
			canvas: $("#world"),
			antialias: true,
			forceWebGL: query.get("renderer") === "webgl",
			powerPreference: "high-performance",
		});
		renderer.setPixelRatio(window.devicePixelRatio || 1);
		renderer.setSize(innerWidth, innerHeight);
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		renderer.outputColorSpace = THREE.SRGBColorSpace;
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1.15;
		await renderer.init();
		camera = new THREE.PerspectiveCamera(
			48,
			innerWidth / innerHeight,
			0.1,
			400,
		);
		camera.position.set(23, 13.5, 30);
		lookTarget.set(1, 3, -7);
		camera.lookAt(lookTarget);
		buildWorld();
		window.addEventListener("resize", () => {
			camera.aspect = innerWidth / innerHeight;
			camera.updateProjectionMatrix();
			renderer.setSize(innerWidth, innerHeight);
		});
		await renderer.compileAsync(scene, camera);
		$("#loading").classList.add("hidden");
		if (await initializeHub()) AIHub.ready();
		else showTitle();
		if (!AIHub.active && query.has("room")) {
			roomDigits = String(query.get("room"))
				.padStart(4, "0")
				.slice(0, 4)
				.split("")
				.map(Number);
			openMenu("online");
			club = new MoonClub(roomDigits.join(""), false);
			renderOnline();
		}
		lastFrame = performance.now();
		renderer.setAnimationLoop(frame);
		installDebug();
		document.body.dataset.ready = "true";
	} catch (error) {
		console.error(error);
		$("#loadStatus").textContent =
			"The porch light didn’t come on. " + error.message;
		const b = document.createElement("button");
		b.textContent = "Try the WebGL compatibility path";
		b.onclick = () => {
			if (AIHub.active) {
				AIHub.fail(error.message);
				return;
			}
			const u = new URL(location.href);
			u.searchParams.set("renderer", "webgl");
			location.href = u.href;
		};
		$("#loading").append(b);
		if (AIHub.active) AIHub.fail(error.message);
		window.__bootError = error.message;
	}
}
function frame(now) {
	const dt = Math.min(0.08, (now - lastFrame) / 1000 || 0.016);
	lastFrame = now;
	pollInput(dt);
	if (hubPending && !hubEnded && AIHub.time() >= 0) {
		hubPending = false;
		hubStarted = true;
		startGame();
	}
	if (state.screen === "title" && now - input.last >= 10000 && !AIHub.active)
		startGame(true);
	if (!window.__manualStep) {
		accumulator += dt;
		let count = 0;
		while (accumulator >= 1 / 60 && count < 5) {
			tick(1 / 60);
			accumulator -= 1 / 60;
			count++;
		}
	}
	updateGhosts(dt);
	updateCamera(dt);
	renderer.render(scene, camera);
}
function snapshot() {
	const p = body.translation();
	return {
		screen: state.screen,
		phase: state.phase,
		position: { x: p.x, y: p.y, z: p.z },
		parts: [...state.parts],
		bond: state.bond,
		alert: state.alert,
		candy: state.candy,
		healed: state.healed,
		rings: state.rings,
		catches: state.catches,
		friend: state.friend,
		crateMoved: state.crateMoved,
		gateOpen: state.gateOpen,
		signal: state.signal,
		mounted: state.mounted,
		won: state.won,
		time: state.time,
		auto: state.auto,
		attract: state.attract,
		renderer: renderer.backend.isWebGPUBackend ? "WebGPU" : "WebGL2",
		rapier: RAPIER.version(),
		three: THREE.REVISION,
		ghosts: [...ghosts.keys()],
		hub: { active: AIHub.active, started: hubStarted, ended: hubEnded },
		audio: {
			events: audio.events,
			voices: audio.voiceCount,
			music: audio.musicCount,
			musicVolume: audio.musicVolume,
			...audio.levels(),
		},
		settings: { ...settings },
		tuning: { ...tuning },
		context: nearestContext()?.type || null,
		lastMenuAction: state.lastMenuAction || null,
		guards: guards.map((g) => ({
			x: g.x,
			z: g.z,
			angle: g.angle,
			stun: g.stun,
			distracted: !!g.distraction,
		})),
		frames: renderer.info.render.frame,
		drawCalls: renderer.info.render.calls,
		room: club
			? {
					code: club.code,
					host: club.host,
					started: club.started,
					members: club.members.size,
					status: club.status,
				}
			: null,
		autoRoute: autoRouteName,
		autoStep,
	};
}
function installDebug() {
	window.__game = { snapshot, ready: true };
	if (testMode)
		Object.assign(window.__game, {
			start: () => startGame(),
			title: showTitle,
			step: (seconds) => {
				window.__manualStep = true;
				for (let i = 0; i < Math.round(seconds * 60); i++) tick(1 / 60);
				updateCamera(1);
				return snapshot();
			},
			manual: (on) => (window.__manualStep = on),
			auto: (on) => {
				state.auto = on;
				autoRouteName = "";
				autoStep = 0;
			},
			teleport: (x, z, y = 0.85) => putPlayer(x, z, y),
			action: interact,
			pulse,
			candy: throwCandy,
			tune: submitNote,
			playPattern,
			devJump,
			pause,
			openMenu,
			context: nearestContext,
			input: (x, y) => {
				input.x = x;
				input.y = y;
			},
			set: (values) => Object.assign(tuning, values),
			setState: (values) => Object.assign(state, values),
			idle: (seconds) => (input.last = performance.now() - seconds * 1000),
			unlock: () => audio.unlock(),
			offlineAudio: async () => {
				const context = new OfflineAudioContext(1, 72000, 48000),
					synth = new window.NightAudio();
				await synth.unlock(context);
				synth.sfx("pulse");
				synth.voice();
				synth.update("flight");
				const rendered = await context.startRendering(),
					samples = rendered.getChannelData(0);
				let peak = 0,
					sum = 0;
				for (const v of samples) {
					peak = Math.max(peak, Math.abs(v));
					sum += v * v;
				}
				return {
					peak,
					rms: Math.sqrt(sum / samples.length),
					events: synth.events,
					voices: synth.voiceCount,
					music: synth.musicCount,
					musicVolume: synth.musicVolume,
				};
			},
			sound: (kind) => audio.sfx(kind),
			voice: () => audio.voice(),
			createRoom: (code) => {
				club?.leave();
				club = new MoonClub(code, true);
			},
			joinRoom: (code) => {
				club?.leave();
				club = new MoonClub(code, false);
			},
			startRoom: () => club.start(),
			leaveRoom: () => club?.leave(),
			ghosts: () =>
				[...ghosts.values()].map((g) => ({
					name: g.name,
					visible: g.root.visible,
					data: g.data,
				})),
			getTune: () => ({
				playing: state.tunePlaying,
				round: state.tuneRound,
				index: state.tuneIndex,
				clock: state.tuneClock,
			}),
			render: () => {
				updateCamera(1);
				renderer.render(scene, camera);
			},
			capture: () => renderer.domElement.toDataURL("image/png"),
		});
}
boot();
