const DEFAULT_TUNING = {
	speed: 6.2,
	jump: 10.8,
	gravity: 25,
	hazardSpeed: 1,
	timeLimit: 360,
	timeScale: 1,
};
const DEFAULT_SETTINGS = {
	music: 0.1,
	effects: 0.75,
	glyphs: "playstation",
	vibration: true,
	shake: true,
};
const PLAYER_COLORS = [0xe8a04d, 0x6eb7ce, 0xa1c66c, 0xc496ce];
class PitRun {
	constructor() {
		this.state = "loading";
		this.players = [];
		this.localCount = 1;
		this.lastInput = performance.now();
		this.ignoreInputUntil = 0;
		this.found = Array(6).fill(false);
		this.score = 0;
		this.simTime = 0;
		this.timeLeft = 360;
		this.teamCamp = 0;
		this.stats = { jumps: 0, swings: 0, hits: 0, rescues: 0, caches: 0 };
		this.events = [];
		this.eventId = 0;
		this.tuning = { ...DEFAULT_TUNING };
		this.settings = { ...DEFAULT_SETTINGS };
		this.dev = { god: false, fly: false, collisions: false, telemetry: false };
		this.roundId = 0;
		this.remoteRound = null;
		this.testInput = null;
		this.manual = false;
		this.hubStarted = false;
		this.cameraX = 22;
		this.cameraY = 3.5;
		this.shake = 0;
		this.toastUntil = 0;
		this.audio = new JungleAudio();
		this.net = new ExpeditionNet(this);
		this.controls = new Controls(this);
		try {
			this.settings = {
				...DEFAULT_SETTINGS,
				...JSON.parse(localStorage.getItem("pitrun-settings") || "{}"),
			};
			this.saved = JSON.parse(localStorage.getItem("pitrun-save") || "null");
			this.best = Number(localStorage.getItem("pitrun-best") || 0);
		} catch {
			this.best = 0;
		}
		this.audio.music = this.settings.music;
		this.audio.effects = this.settings.effects;
	}
	async init() {
		await RAPIER.init();
		this.physics = new RAPIER.World({ x: 0, y: -this.tuning.gravity, z: 0 });
		this.physics.timestep = 1 / 60;
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(0x9abf9b);
		this.scene.fog = new THREE.Fog(0x96b99c, 48, 95);
		this.camera = new THREE.OrthographicCamera(-15, 15, 8.5, -8.5, 0.1, 180);
		this.renderer = new THREE.WebGPURenderer({
			canvas: $("game"),
			antialias: true,
			powerPreference: "high-performance",
			forceWebGL:
				new URLSearchParams(location.search).get("renderer") === "webgl",
		});
		try {
			await this.renderer.init();
		} catch (error) {
			console.warn(
				"WebGPU unavailable. Trying the Three.js WebGL compatibility backend.",
				error.message,
			);
			try {
				this.renderer.dispose();
			} catch {}
			const fresh = $("game").cloneNode(false);
			$("game").replaceWith(fresh);
			this.renderer = new THREE.WebGPURenderer({
				canvas: $("game"),
				antialias: true,
				forceWebGL: true,
			});
			await this.renderer.init();
		}
		this.backend = this.renderer.backend.isWebGPUBackend
			? "WebGPU"
			: "WebGL 2 compatibility";
		this.renderer.outputColorSpace = THREE.SRGBColorSpace;
		this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
		this.world = new JungleWorld(this.scene, this.physics);
		this.demoRig = createExplorer();
		this.scene.add(this.demoRig.root);
		this.demoRig.animate("swing");
		this.ui = new Menus(this);
		this.resize();
		window.addEventListener("resize", () => this.resize());
		$("pauseButton").onclick = () => this.ui.pause();
		this.lastTick = performance.now();
		this.accumulator = 0;
		this.frames = 0;
		this.fps = 0;
		this.fpsTime = 0;
		this.title();
		$("loading").hidden = true;
	}
	resize() {
		const a = innerWidth / innerHeight;
		this.aspect = a;
		const h = Math.max(17, 20 / a);
		this.viewH = h;
		this.cameraH = h;
		this.camera.left = (-h * a) / 2;
		this.camera.right = (h * a) / 2;
		this.camera.top = h / 2;
		this.camera.bottom = -h / 2;
		this.camera.updateProjectionMatrix();
		this.renderer?.setSize(innerWidth, innerHeight);
	}
	primary() {
		return this.players.find((p) => p.id === this.net.me) || this.players[0];
	}
	addPlayer(desc, index) {
		const rig = createExplorer(
			desc.color
				? new THREE.Color(desc.color).getHex()
				: PLAYER_COLORS[index % 4],
		);
		this.scene.add(rig.root);
		const body = this.physics.createRigidBody(
			RAPIER.RigidBodyDesc.dynamic()
				.setTranslation(1 + index * 0.9, 0.74, 0)
				.lockRotations()
				.setCanSleep(false)
				.setCcdEnabled(true),
		);
		const collider = this.physics.createCollider(
			RAPIER.ColliderDesc.capsule(0.45, 0.26)
				.setFriction(0)
				.setRestitution(0)
				.setCollisionGroups(0x00020001),
			body,
		);
		const debugMat = new THREE.MeshBasicMaterial({
			color: 0xff6bd6,
			wireframe: true,
			depthTest: false,
			transparent: true,
			opacity: 0.7,
		});
		const debugCollider = shape(
			rig.root,
			new THREE.CapsuleGeometry(0.26, 0.9, 4, 8),
			debugMat,
			0,
			0.71,
			0,
			1,
			1,
			1,
			false,
		);
		debugCollider.visible = this.dev.collisions;
		const p = {
			debugCollider,
			id: desc.id,
			name: desc.name || ["Scout", "Pal", "Buddy", "Chum"][index],
			rig,
			body,
			collider,
			x: 1 + index * 0.9,
			y: 0.03,
			vx: 0,
			vy: 0,
			health: 3,
			camp: 0,
			layer: 0,
			facing: 1,
			grounded: false,
			coyote: 0,
			jumpBuffer: 0,
			invuln: 0,
			grabCooldown: 0,
			climb: null,
			swing: null,
			jumpPrev: false,
			jumpSerial: 0,
			actionPrev: false,
			stepTime: 0,
			respawn: 0,
			ladderCooldown: 0,
			anim: "idle",
		};
		this.players.push(p);
		return p;
	}
	removePlayer(id) {
		const p = this.players.find((p) => p.id === id);
		if (!p) return;
		this.scene.remove(p.rig.root);
		this.physics.removeRigidBody(p.body);
		this.players = this.players.filter((other) => other !== p);
	}
	clearPlayers() {
		for (const p of [...this.players]) this.removePlayer(p.id);
	}
	start(roster = 1, resume = false) {
		this.clearPlayers();
		this.roundId++;
		this.controls.jumpSerial = 0;
		this.world.reset();
		this.events = [];
		this.eventId = 0;
		this.net.lastEvent = 0;
		this.net.finished = false;
		this.found = Array(6).fill(false);
		this.score = 0;
		this.simTime = 0;
		this.timeLeft = this.tuning.timeLimit;
		this.teamCamp = 0;
		this.stats = { jumps: 0, swings: 0, hits: 0, rescues: 0, caches: 0 };
		const list = Array.isArray(roster)
			? roster
			: Array.from({ length: roster }, (_, i) => ({
					id: i,
					name: ["Scout", "Pal", "Buddy", "Chum"][i],
					color: "#" + PLAYER_COLORS[i].toString(16),
				}));
		this.localCount = list.length;
		list.forEach((d, i) => this.addPlayer(d, i));
		this.state = "playing";
		this.demoRig.root.visible = false;
		this.ui.close();
		$("hud").hidden = false;
		$("attractBadge").hidden = true;
		$("letterbox").hidden = true;
		this.ignoreInputUntil = performance.now() + 180;
		if (resume && this.saved) {
			this.found = [...this.saved.found];
			this.score = this.saved.score;
			this.timeLeft = this.saved.timeLeft;
			this.teamCamp = this.saved.camp;
			for (const p of this.players) {
				p.camp = this.teamCamp;
				this.teleport(p, CAMPS[this.teamCamp] + 0.4, 0.05);
			}
		}
		const p = this.primary();
		this.cameraX = (p?.x || 1) + 6;
		this.cameraY = 3;
		this.updateHud();
		if (!this.net.active)
			this.notify("A JUNGLE JAUNT", "Find six treasures. Keep your hat.");
		this.audio.unlock();
		this.audio.speak();
	}
	title() {
		if (this.net?.mode === "hub" && this.net.active) return;
		this.state = "title";
		this.clearPlayers();
		this.found = Array(6).fill(false);
		this.world?.reset();
		this.demoRig && (this.demoRig.root.visible = true);
		this.cameraX = 22;
		this.cameraY = 3.5;
		this.lastInput = performance.now();
		$("hud").hidden = true;
		$("attractBadge").hidden = true;
		$("letterbox").hidden = true;
		$("contextPrompt").hidden = true;
		$("touchAction").hidden = true;
		$("touchHint").hidden = true;
		if (this.ui) this.ui.title();
	}
	attract() {
		this.start(1);
		this.state = "attract";
		this.ui.close();
		this.attractTime = 0;
		$("hud").hidden = true;
		$("attractBadge").hidden = false;
		$("letterbox").hidden = false;
		$("cinematicText").textContent = "PIT & RUN  /  A JUNGLE JAUNT";
		this.found.fill(false);
		this.audio.muted = false;
		this.audio.levels();
		this.players[0].collider.setSensor(true);
	}
	attractStep(dt) {
		const route = [
			[0, 6, 0, "run"],
			[4, 19, 0, "run"],
			[6, 22, 2, "jump"],
			[9, 28, 1.8, "swing"],
			[12, 36, 0, "run"],
			[15, 48, 0, "run"],
			[18, 48, -7, "climb"],
			[23, 65, -7, "run"],
			[27, 80, -7, "run"],
			[30, 90, -7, "run"],
			[33, 90, 0, "climb"],
			[36, 98, 0, "run"],
			[39, 106, 2, "swing"],
			[42, 120, 0, "run"],
			[45, 132, 0, "run"],
			[48, 132, -7, "climb"],
			[52, 149, -7, "run"],
			[57, 176, -7, "run"],
			[60, 176, 0, "climb"],
			[63, 191, 0, "run"],
			[67, 201, 2, "swing"],
			[71, 219, 0, "run"],
			[75, 234, 0, "cheer"],
			[79, 234, 0, "cheer"],
		];
		this.attractTime = (this.attractTime + dt) % 79;
		if (this.attractTime < dt) this.found.fill(false);
		let a = route[0],
			b = route[1];
		for (let i = 0; i < route.length - 1; i++)
			if (this.attractTime >= route[i][0]) {
				a = route[i];
				b = route[i + 1];
			}
		const u = clamp((this.attractTime - a[0]) / (b[0] - a[0]), 0, 1),
			p = this.players[0];
		p.x = lerp(a[1], b[1], u);
		p.y =
			lerp(a[2], b[2], u) + (a[3] === "jump" ? Math.sin(u * Math.PI) * 1.2 : 0);
		p.anim = a[3];
		p.layer = p.y < -3 ? 1 : 0;
		p.rig.animate(p.anim);
		p.rig.root.position.set(p.x, p.y, 0);
		p.rig.root.rotation.z =
			p.anim === "swing" ? Math.sin(this.attractTime * 2) * 0.2 : 0;
		TREASURES.forEach((t, i) => {
			if (Math.abs(t.x - p.x) < 1.4 && Math.abs(t.y - (p.y + 0.9)) < 1.6)
				this.found[i] = true;
		});
	}
	teleport(p, x, y) {
		p.body.setTranslation({ x, y: y + 0.71, z: 0 }, true);
		p.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
		p.x = x;
		p.y = y;
		p.vx = 0;
		p.vy = 0;
		p.layer = y < -3 ? 1 : 0;
		p.swing = null;
		p.climb = null;
		p.grounded = false;
		p.body.setGravityScale(1, true);
		p.collider.setSensor(false);
		p.grabCooldown = 0.6;
		p.rig.root.position.set(x, y, 0);
	}
	inputFor(p, index) {
		if (this.testInput)
			return this.testInput[p.id] || { x: 0, y: 0, jump: false, action: false };
		if (this.ui.current && (!this.net.active || p.id === this.net.me))
			return { x: 0, y: 0, jump: false, action: false };
		if (this.net.active) {
			if (this.net.server) return this.net.input(p.id);
			return p.id === this.net.me
				? this.controls.frame(0)
				: this.net.input(p.id);
		}
		return this.controls.frame(index);
	}
	grounded(p) {
		const a = p.body.translation(),
			ray = new RAPIER.Ray({ x: a.x, y: a.y, z: 0 }, { x: 0, y: -1, z: 0 });
		const hit = this.physics.castRay(
			ray,
			0.81,
			true,
			undefined,
			undefined,
			p.collider,
			p.body,
		);
		return (
			!!hit && (hit.timeOfImpact ?? hit.toi) < 0.78 && p.body.linvel().y < 0.5
		);
	}
	release(p, dir = 1) {
		p.swing = null;
		p.climb = null;
		p.collider.setSensor(false);
		p.body.setGravityScale(1, true);
		p.body.setLinvel(
			{ x: dir * this.tuning.speed * 1.2, y: this.tuning.jump * 0.82, z: 0 },
			true,
		);
		p.grabCooldown = 0.65;
		p.ladderCooldown = 0.4;
		this.audio.sfx("jump");
	}
	move(p, f, dt) {
		p.invuln = Math.max(0, p.invuln - dt);
		p.grabCooldown = Math.max(0, p.grabCooldown - dt);
		p.ladderCooldown = Math.max(0, p.ladderCooldown - dt);
		const token = Number.isSafeInteger(f.jumpSerial)
			? f.jumpSerial
			: p.jumpSerial;
		const jump = (f.jump && !p.jumpPrev) || token !== p.jumpSerial,
			action = f.action && !p.actionPrev;
		p.jumpSerial = token;
		p.jumpPrev = f.jump;
		p.actionPrev = f.action;
		if (jump) p.jumpBuffer = 0.15;
		else p.jumpBuffer = Math.max(0, p.jumpBuffer - dt);
		if (p.health <= 0) {
			p.respawn -= dt;
			if (p.respawn <= 0) {
				p.health = 3;
				this.teleport(p, CAMPS[this.teamCamp] + 1, 0.05);
				p.invuln = 2;
				this.stats.rescues++;
			}
			return;
		}
		if (Math.abs(f.x) > 0.15) p.facing = Math.sign(f.x);
		if (this.dev.fly) {
			p.collider.setSensor(true);
			p.body.setGravityScale(0, true);
			p.body.setLinvel(
				{
					x: f.x * this.tuning.speed,
					y: -f.y * this.tuning.speed + (f.jump ? this.tuning.speed : 0),
					z: 0,
				},
				true,
			);
			p.anim = "jump";
			return;
		}
		if (p.climb !== null) {
			const x = LADDERS[p.climb],
				a = p.body.translation();
			let dy = -f.y * 3.8;
			if (Math.abs(f.y) < 0.2 && p.climbAuto) dy = p.climbDir * 3.8;
			if (jump) {
				this.release(p, p.facing);
				return;
			}
			const feet = clamp(a.y - 0.71 + dy * dt, -7.02, 0.06);
			p.body.setTranslation({ x, y: feet + 0.71, z: 0 }, true);
			p.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
			p.anim = "climb";
			p.layer = feet < -3 ? 1 : 0;
			if (feet >= 0.045 || feet <= -7.01) {
				const top = feet >= 0.045;
				this.teleport(p, x + (top ? 1.3 : 0.05), top ? 0.05 : -6.98);
				p.ladderCooldown = 0.45;
				p.layer = top ? 0 : 1;
			}
			return;
		}
		if (p.swing !== null) {
			const v = this.world.vines[p.swing],
				e = v.end;
			p.body.setTranslation({ x: e.x, y: e.y - 1.1, z: 0 }, true);
			p.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
			p.anim = "swing";
			v.pump = clamp(v.pump + Math.abs(f.x) * dt * 0.16, 0, 0.18);
			if (jump || action) {
				const dir =
					Math.abs(f.x) > 0.2
						? Math.sign(f.x)
						: Math.sign(
								Math.cos(
									this.simTime * this.tuning.hazardSpeed * 0.82 + v.phase,
								),
							);
				this.release(p, dir || 1);
			}
			return;
		}
		p.collider.setSensor(false);
		p.body.setGravityScale(p.body.linvel().y > 1 && !f.jump ? 1.7 : 1, true);
		p.grounded = this.grounded(p);
		p.coyote = p.grounded ? 0.12 : Math.max(0, p.coyote - dt);
		const a = p.body.translation(),
			feet = a.y - 0.71;
		if (p.ladderCooldown === 0) {
			const ladder = LADDERS.findIndex((x) => Math.abs(x - a.x) < 1.15);
			const top = feet > -0.7 && feet < 0.7,
				bottom = feet < -5.7 && feet > -7.4;
			if (
				ladder >= 0 &&
				((top && (f.y > 0.4 || action)) || (bottom && (f.y < -0.4 || action)))
			) {
				p.climb = ladder;
				p.climbDir = top ? -1 : 1;
				p.climbAuto = action || f.touch;
				p.collider.setSensor(true);
				p.body.setGravityScale(0, true);
				p.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
				p.jumpBuffer = 0;
				p.anim = "climb";
				return;
			}
		}
		// Buffered jump and a short coyote window keep the single-button rhythm forgiving.
		if (f.touch && p.grounded && p.grabCooldown === 0 && Math.abs(f.x) > 0.2) {
			const dir = Math.sign(f.x),
				ahead = p.x + dir * 1.7;
			const danger =
				PITS.some((q) => ahead > q.a && ahead < q.b) ||
				this.world.logs.some((l) => Math.abs(l.x - ahead) < 0.7) ||
				this.world.snakes.some((s) => Math.abs(s.x - ahead) < 0.6);
			if (danger) {
				p.jumpBuffer = 0.15;
				p.grabCooldown = 0.2;
			}
		}
		let vy = p.body.linvel().y;
		if (p.jumpBuffer > 0 && p.coyote > 0) {
			vy = this.tuning.jump;
			p.jumpBuffer = 0;
			p.coyote = 0;
			p.grounded = false;
			this.stats.jumps++;
			this.audio.sfx("jump");
		}
		const accel = p.grounded ? 42 : 16,
			target = f.x * this.tuning.speed;
		const vx = lerp(p.body.linvel().x, target, 1 - Math.exp(-accel * dt));
		p.body.setLinvel({ x: vx, y: vy, z: 0 }, true);
		if (
			p.grabCooldown === 0 &&
			!p.grounded &&
			p.layer === 0 &&
			feet > -0.9 &&
			feet < 4.8
		) {
			const vi = this.world.vines.findIndex(
				(v) =>
					Math.hypot(v.end.x - a.x, v.end.y - (feet + 1.8)) <
					(action ? 2.1 : 1.15),
			);
			if (vi >= 0) {
				p.swing = vi;
				p.collider.setSensor(true);
				p.body.setGravityScale(0, true);
				p.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
				p.jumpBuffer = 0;
				this.stats.swings++;
				this.audio.sfx("grab");
				this.notify(
					"VINE TIME",
					this.controls.glyph("jump") + " to leap off · move to pump",
				);
				p.anim = "swing";
				return;
			}
		}
		p.anim = p.grounded ? (Math.abs(vx) > 0.3 ? "run" : "idle") : "jump";
	}
	hurt(p, fall = false, hazardX = p.x + 1) {
		if (p.invuln > 0 || this.state !== "playing") return;
		if (this.dev.god) {
			if (fall) {
				this.teleport(p, CAMPS[this.teamCamp] + 1, 0.05);
				p.invuln = 0.5;
			}
			return;
		}
		p.health--;
		this.stats.hits++;
		this.score = Math.max(0, this.score - 100);
		this.shake = this.settings.shake ? 0.2 : 0;
		this.emit(
			"hurt",
			"OOP. STILL GOT THE HAT.",
			fall ? "Back to the last camp." : "A little space, please.",
			p.x,
			p.y + 1,
		);
		this.controls.vibrate();
		p.invuln = 1.8;
		if (fall) {
			this.stats.rescues++;
			this.timeLeft = Math.max(0, this.timeLeft - 5);
			this.teleport(p, CAMPS[this.teamCamp] + 1, 0.05);
			p.invuln = 2;
		} else {
			p.body.setLinvel({ x: Math.sign(p.x - hazardX) * 4, y: 5, z: 0 }, true);
		}
		if (p.health <= 0) {
			if (this.players.length > 1 || this.net.active) {
				p.respawn = 2.5;
				this.timeLeft = Math.max(0, this.timeLeft - 8);
				this.notify("A QUICK BREATHER", p.name + " returns at the camp.");
			} else this.lose("The jungle got the last laugh.");
		}
	}
	encounter(p) {
		if (p.climb !== null || p.swing !== null || this.dev.fly || p.health <= 0)
			return;
		const y = p.y,
			x = p.x;
		if (y < -10) {
			this.hurt(p, true);
			return;
		}
		if (
			p.layer === 0 &&
			y < -1.2 &&
			PITS.some((q) => x > q.a - 0.2 && x < q.b + 0.2)
		) {
			this.hurt(p, true);
			return;
		}
		if (y > -0.6 && y < 0.85) {
			for (const l of this.world.logs)
				if (Math.abs(l.x - x) < 0.68) this.hurt(p, false, l.x);
			for (const s of this.world.snakes)
				if (Math.abs(s.x - x) < 0.48) this.hurt(p, false, s.x);
			for (const c of this.world.crocs)
				if (c.open && Math.abs(c.x + 0.3 - x) < 0.95 && y < 0.4)
					this.hurt(p, false, c.x);
		}
		for (const f of this.world.fires)
			if (!f.decor && f.on && Math.abs(f.x - x) < 0.48 && y > -0.3 && y < 1.4)
				this.hurt(p, false, f.x);
		if (y < -5.6 && y > -7.5)
			for (const s of this.world.scorpions)
				if (Math.abs(s.x - x) < 0.5 && y < -6.2) this.hurt(p, false, s.x);
	}
	collect(p) {
		for (let i = 0; i < TREASURES.length; i++) {
			const t = TREASURES[i];
			if (
				!this.found[i] &&
				Math.abs(p.x - t.x) < 0.95 &&
				Math.abs(p.y + 0.9 - t.y) < 1.1
			) {
				this.found[i] = true;
				this.score += 1000;
				this.emit(
					"treasure",
					"TREASURE " + this.found.filter(Boolean).length + " / 6",
					t.name,
					p.x,
					p.y + 1.3,
				);
				this.save();
				if (this.found.every(Boolean))
					this.notify(
						"THE WAY IS OPEN",
						"All six! Head east to the sunset gate.",
					);
			}
		}
		for (const c of this.world.decor)
			if (
				c.kind === "cache" &&
				!c.taken &&
				Math.abs(p.x - c.x) < 0.85 &&
				Math.abs(p.y + 0.9 - c.y) < 1.1
			) {
				c.taken = true;
				this.score += 250;
				this.stats.caches++;
				this.audio.sfx("treasure");
				this.world.burst(c.x, c.y, PALETTE.gold, 10);
			}
		CAMPS.forEach((x, i) => {
			if (
				i > this.teamCamp &&
				Math.abs(p.x - x) < 1.5 &&
				p.y > -0.4 &&
				p.y < 1.8
			) {
				this.teamCamp = i;
				for (const other of this.players) {
					other.camp = i;
					other.health = 3;
				}
				this.world.flags[i].material = cel(PALETTE.gold);
				this.emit(
					"checkpoint",
					"CAMP " + (i + 1),
					"Hat straight. Pockets full. On we go.",
					x,
					1,
				);
				this.save();
			}
		});
		if (p.x > 232 && p.y > -0.4) {
			if (this.found.every(Boolean)) this.win();
			else {
				p.body.setTranslation(
					{ x: 231.7, y: p.body.translation().y, z: 0 },
					true,
				);
				if (this.simTime - (this.lastGateHint || -20) > 5) {
					this.lastGateHint = this.simTime;
					this.notify(
						"SOMETHING IS MISSING",
						this.found.filter(Boolean).length +
							" of 6 treasures. Check the low roads.",
					);
				}
			}
		}
	}
	step(dt) {
		if (this.state !== "playing" || !this.net.isHost) return;
		this.simTime += dt;
		this.timeLeft = Math.max(0, this.timeLeft - dt);
		this.world.update(this.simTime, dt, this.found, this.tuning.hazardSpeed);
		this.players.forEach((p, i) => this.move(p, this.inputFor(p, i), dt));
		this.physics.step();
		for (const p of this.players) {
			const a = p.body.translation(),
				v = p.body.linvel();
			p.x = a.x;
			p.y = a.y - 0.71;
			p.vx = v.x;
			p.vy = v.y;
			if (p.x < -3 || p.x > 243)
				p.body.setTranslation({ x: clamp(p.x, -3, 243), y: a.y, z: 0 }, true);
			if (Math.abs(a.z) > 0.001)
				p.body.setTranslation({ x: a.x, y: a.y, z: 0 }, true);
			this.encounter(p);
			if (p.y < -4) p.layer = 1;
			if (this.state === "playing") this.collect(p);
			if (p.grounded && Math.abs(p.vx) > 1) {
				p.stepTime += dt;
				if (p.stepTime > 0.32) {
					p.stepTime = 0;
					if (p === this.primary()) this.audio.sfx("step");
				}
			}
		}
		if (this.players.length > 1 && !this.net.active) {
			const lead = this.players.reduce((a, b) => (a.x > b.x ? a : b));
			for (const p of this.players)
				if (lead.x - p.x > 27) {
					this.teleport(p, lead.x - 2, lead.y);
					this.notify("STICK TOGETHER", "The expedition catches up.");
				}
		}
		if (this.timeLeft <= 0 && this.state === "playing")
			this.lose("The sun beat you to it.");
	}
	frame(now) {
		let dt = Math.min(0.06, Math.max(0, (now - this.lastTick) / 1000));
		this.lastTick = now;
		this.controls.poll();
		this.ui.prompts();
		if (this.state === "hubwaiting" && this.hubStarted) {
			const time = AIHub.time();
			$("hubCountdown").hidden = false;
			if (time >= 0) {
				this.state = "playing";
				$("hubCountdown").hidden = true;
			} else
				$("hubCountdown").textContent = String(
					Math.max(1, Math.ceil(-time / 1000)),
				);
		}
		if (
			this.state === "title" &&
			performance.now() - this.lastInput > 10000 &&
			!this.net.active
		)
			this.attract();
		if (this.state === "playing" && !this.manual && this.net.isHost) {
			this.accumulator += dt * this.tuning.timeScale;
			let steps = 0;
			while (this.accumulator >= 1 / 60 && steps < 8) {
				this.step(1 / 60);
				this.accumulator -= 1 / 60;
				steps++;
			}
		}
		if (this.state === "attract") {
			this.simTime += dt;
			this.attractStep(dt);
			this.world.update(this.simTime, dt, this.found, this.tuning.hazardSpeed);
		}
		if (
			this.state === "title" ||
			(this.ui.current && this.players.length === 0)
		) {
			this.simTime += dt;
			this.world.update(this.simTime, dt, [], 1);
			const v = this.world.vines[0];
			this.demoRig.root.position.set(v.end.x, v.end.y - 1.8, 0.2);
			this.demoRig.root.rotation.z = v.theta * 0.25;
			this.demoRig.animate("swing");
			this.demoRig.mixer.update(dt);
		}
		if (
			(this.state === "playing" && !this.net.isHost) ||
			this.state === "won" ||
			this.state === "lost"
		)
			this.world.update(this.simTime, dt, this.found, this.tuning.hazardSpeed);
		if (this.state === "playing" && !this.net.isHost) this.simTime += dt;
		for (const p of this.players) {
			if (this.state !== "attract") {
				const alpha =
					this.net.active && !this.net.isHost ? 1 - Math.exp(-dt * 18) : 1;
				p.rig.root.position.lerp(
					new THREE.Vector3(p.x, p.y, p.id * 0.012),
					alpha,
				);
				p.rig.root.scale.x = p.facing;
				p.rig.root.rotation.z =
					p.swing !== null ? this.world.vines[p.swing]?.theta * 0.25 || 0 : 0;
				p.rig.root.visible =
					p.health > 0 &&
					(p.invuln <= 0 || Math.floor(this.simTime * 12) % 2 === 0);
				p.rig.animate(
					this.state === "won" ? "cheer" : p.anim,
					Math.abs(p.vx) > 1 && p.anim === "run" ? Math.abs(p.vx) / 6.2 : 1,
				);
			}
			p.debugCollider.visible = this.dev.collisions;
			p.rig.mixer.update(dt);
		}
		this.net.tick(dt);
		this.updateCamera(dt);
		this.updateHud();
		this.audio.tick(
			this.primary()?.layer === 1,
			!["ended", "loading"].includes(this.state),
		);
		if (this.toastUntil && performance.now() > this.toastUntil) {
			$("toast").classList.remove("show");
			this.toastUntil = 0;
		}
		this.frames++;
		this.fpsTime += dt;
		if (this.fpsTime >= 1) {
			this.fps = this.frames / this.fpsTime;
			this.frames = 0;
			this.fpsTime = 0;
		}
		if (this.dev.telemetry) {
			$("debug").hidden = false;
			$("debug").textContent =
				this.backend +
				" · THREE r" +
				THREE.REVISION +
				"\n" +
				this.fps.toFixed(0) +
				" frames/s · " +
				this.renderer.info.render.calls +
				" draws\nx " +
				(this.primary()?.x || 0).toFixed(2) +
				"  y " +
				(this.primary()?.y || 0).toFixed(2) +
				"\nstate " +
				this.state +
				"  t " +
				this.simTime.toFixed(1) +
				"\n" +
				(this.net.active
					? this.net.mode + " · " + (this.net.isHost ? "host" : "guest")
					: "solo / couch");
		} else $("debug").hidden = true;
		this.renderer.render(this.scene, this.camera);
	}
	updateCamera(dt) {
		let tx = 22,
			ty = 3.7;
		const p = this.primary();
		if (p && this.state !== "title") {
			tx = clamp(p.x + 3.8, 10, 234);
			ty = p.y < -2 ? p.y + 2.5 : 3.1;
			if (this.localCount > 1 && !this.net.active) {
				const xs = this.players.map((a) => a.x),
					ys = this.players.map((a) => a.y);
				ty = (Math.min(...ys) + Math.max(...ys)) / 2 + 2;
				this.targetCameraH = Math.max(
					this.viewH,
					(Math.max(...xs) - Math.min(...xs) + 12) / this.aspect,
					Math.max(...ys) - Math.min(...ys) + 9,
				);
				tx = clamp((Math.min(...xs) + Math.max(...xs)) / 2 + 2, 10, 234);
			}
		}
		const a = 1 - Math.exp(-dt * 4);
		const height =
			this.localCount > 1 && !this.net.active && this.players.length > 1
				? this.targetCameraH || this.viewH
				: this.viewH;
		this.cameraH = lerp(this.cameraH || this.viewH, height, a);
		this.camera.left = (-this.cameraH * this.aspect) / 2;
		this.camera.right = (this.cameraH * this.aspect) / 2;
		this.camera.top = this.cameraH / 2;
		this.camera.bottom = -this.cameraH / 2;
		this.camera.updateProjectionMatrix();
		this.cameraX = lerp(this.cameraX, tx, a);
		this.cameraY = lerp(this.cameraY, ty, a);
		this.shake = Math.max(0, this.shake - dt);
		const sx =
			this.shake > 0
				? Math.sin(performance.now() * 0.13) * this.shake * 0.35
				: 0;
		this.camera.position.set(this.cameraX + sx, this.cameraY + 2, 30);
		this.camera.lookAt(this.cameraX, this.cameraY, -1);
	}
	updateHud() {
		const p = this.primary(),
			count = this.found.filter(Boolean).length;
		$("clock").textContent =
			Math.floor(this.timeLeft / 60)
				.toString()
				.padStart(2, "0") +
			":" +
			Math.floor(this.timeLeft % 60)
				.toString()
				.padStart(2, "0");
		$("clock").style.color = this.timeLeft < 45 ? "#ff9d70" : "";
		$("treasureCount").textContent = count + " / 6";
		const pipKey = this.found.map(Number).join("");
		if (this.lastPips !== pipKey) {
			$("treasurePips").innerHTML = this.found
				.map((f) => '<i class="' + (f ? "found" : "") + '">◆</i>')
				.join("");
			this.lastPips = pipKey;
		}
		if (p) {
			const r = REGIONS.reduce((a, b) => (p.x >= b.x ? b : a), REGIONS[0]),
				idx = REGIONS.indexOf(r);
			$("regionLabel").textContent =
				String(idx + 1).padStart(2, "0") +
				" / " +
				(p.layer ? "THE LOW ROAD" : r.name);
			$("hearts").textContent =
				"♥ ".repeat(Math.max(0, p.health)) +
				"♡ ".repeat(Math.max(0, 3 - p.health));
			const progress = clamp((p.x / 234) * 100, 0, 100);
			$("routeFill").style.width = progress + "%";
			$("routeMarker").style.left = progress + "%";
			if (idx !== this.lastRegion && this.state === "playing") {
				this.lastRegion = idx;
				if (idx > 0) this.notify(r.name, r.subtitle);
			}
			this.context(p);
		}
	}
	context(p) {
		let text = "",
			action = "";
		if (this.state === "playing" && !this.ui.current) {
			if (p.swing !== null) {
				text = this.controls.glyph("jump") + "  LEAP · MOVE TO PUMP";
				action = "LEAP";
			} else if (p.climb !== null) {
				text = "MOVE UP / DOWN · " + this.controls.glyph("jump") + "  LET GO";
				action = "CLIMB";
			} else if (
				LADDERS.some((x) => Math.abs(x - p.x) < 1.9) &&
				((p.y > -0.5 && p.y < 1) || p.y < -5.5)
			) {
				text =
					this.controls.glyph("action") +
					"  " +
					(p.layer ? "CLIMB TO DAYLIGHT" : "TAKE THE LOW ROAD");
				action = p.layer ? "UP" : "DOWN";
			} else if (
				this.world.vines.some(
					(v) => Math.hypot(v.end.x - p.x, v.end.y - p.y - 1.8) < 2.3,
				)
			) {
				text = "LEAP AT THE VINE TO CATCH IT";
				action = "GRAB";
			} else if (p.x < 7)
				text =
					this.controls.glyph("move") +
					"  MOVE · " +
					this.controls.glyph("jump") +
					"  JUMP";
			let mission = "Find the six lost treasures. The gate is east. Probably.";
			if (countFound(this) === 6)
				mission = "All six! The sunset gate is at the far east.";
			else if (p.x > 41 && p.x < 82 && !this.found[2])
				mission = "A green glow waits below. Look for a ladder.";
			else if (p.x > 126 && p.x < 178 && !this.found[4])
				mission = "The Moon Idol is down in the scorpion hall.";
			$("mission").textContent = mission;
		}
		$("contextPrompt").hidden = !text;
		$("contextPrompt").textContent = text;
		const touch =
			this.controls.device === "touch" &&
			this.state === "playing" &&
			!this.ui.current;
		$("touchAction").hidden = !(touch && action);
		$("touchAction").textContent = action;
		$("touchHint").hidden = !(touch && p.x < 6 && !this.ui.current);
		if (touch && p.swing !== null)
			$("touchAction").onpointerdown = () => {
				this.controls.touch.jump = true;
				this.controls.touchJumpUntil = performance.now() + 150;
			};
		else $("touchAction").onpointerdown = null;
	}
	notify(kicker, text) {
		$("toastKicker").textContent = kicker;
		$("toastText").textContent = text;
		$("toast").classList.add("show");
		this.toastUntil = performance.now() + 3400;
	}
	emit(type, kicker, text, x, y) {
		const e = { id: ++this.eventId, type, kicker, text, x, y };
		this.events.push(e);
		if (this.events.length > 8) this.events.shift();
		this.eventEffect(e);
	}
	eventEffect(e) {
		this.notify(e.kicker, e.text);
		this.audio.sfx(e.type);
		if (e.x !== undefined)
			this.world.burst(
				e.x,
				e.y,
				e.type === "hurt" ? 0xf09465 : PALETTE.gold,
				e.type === "treasure" ? 28 : 12,
			);
	}
	win() {
		if (this.state !== "playing") return;
		this.state = "won";
		this.score += Math.floor(this.timeLeft) * 10;
		this.audio.sfx("win");
		if (this.net.active) {
			this.net.finish(true);
			if (this.net.mode === "hub") return;
		}
		this.best = Math.max(this.best, this.score);
		try {
			localStorage.setItem("pitrun-best", this.best);
			localStorage.removeItem("pitrun-save");
		} catch {}
		this.saved = null;
		this.ui.results(true);
	}
	lose(reason) {
		if (this.state !== "playing") return;
		this.state = "lost";
		this.lossReason = reason;
		if (this.net.active) {
			this.net.finish(false);
			if (this.net.mode === "hub") return;
		}
		this.ui.results(false);
	}
	retry() {
		if (this.net.active) return;
		if (this.timeLeft < 1) {
			this.start(this.localCount);
			return;
		}
		this.players.forEach((p) => {
			p.health = 3;
			p.invuln = 2;
			this.teleport(p, CAMPS[this.teamCamp] + 1, 0.05);
		});
		this.timeLeft = Math.max(60, this.timeLeft - 15);
		this.state = "playing";
		this.ui.close();
	}
	save() {
		if (this.net.active || this.state !== "playing") return;
		this.saved = {
			camp: this.teamCamp,
			found: [...this.found],
			score: this.score,
			timeLeft: this.timeLeft,
		};
		try {
			localStorage.setItem("pitrun-save", JSON.stringify(this.saved));
		} catch {}
	}
	saveSettings() {
		try {
			localStorage.setItem("pitrun-settings", JSON.stringify(this.settings));
		} catch {}
	}
	snapshot() {
		return {
			type: "snapshot",
			round: this.roundId,
			t: this.simTime,
			left: this.timeLeft,
			score: this.score,
			found: this.found,
			camp: this.teamCamp,
			state: this.state,
			stats: this.stats,
			players: this.players.map((p) => ({
				id: p.id,
				x: p.x,
				y: p.y,
				vx: p.vx,
				vy: p.vy,
				health: p.health,
				facing: p.facing,
				layer: p.layer,
				swing: p.swing,
				climb: p.climb,
				anim: p.anim,
				invuln: p.invuln,
			})),
			tuning: this.tuning,
			events: this.events,
			caches: this.world.decor.map((d) => d.taken),
		};
	}
	applySnapshot(s) {
		if (!Array.isArray(s.players) || !Array.isArray(s.found)) return;
		if (s.round !== this.remoteRound) {
			this.remoteRound = s.round;
			this.net.lastEvent = 0;
			this.ui.close();
		}
		this.simTime = s.t;
		this.timeLeft = s.left;
		this.score = s.score;
		this.found = [...s.found];
		this.teamCamp = s.camp;
		this.stats = s.stats || this.stats;
		if (s.tuning) Object.assign(this.tuning, s.tuning);
		if (this.state !== "ended") this.state = s.state;
		for (const data of s.players) {
			let p = this.players.find((p) => p.id === data.id);
			if (!p) p = this.addPlayer({ id: data.id }, data.id);
			Object.assign(p, data);
			p.body.setTranslation({ x: p.x, y: p.y + 0.71, z: 0 }, true);
		}
		for (const p of [...this.players])
			if (!s.players.some((d) => d.id === p.id)) this.removePlayer(p.id);
		(s.caches || []).forEach((v, i) => {
			if (this.world.decor[i]) this.world.decor[i].taken = v;
		});
		if (
			this.net.mode !== "hub" &&
			(s.state === "won" || s.state === "lost") &&
			this.ui.current !== "results"
		)
			this.ui.results(s.state === "won");
	}
	tune(key, value) {
		const old = this.tuning[key];
		this.tuning[key] = value;
		if (key === "gravity") this.physics.gravity.y = -value;
		if (key === "timeLimit")
			this.timeLeft = Math.max(0, this.timeLeft + value - old);
	}
	collisionView(on) {
		this.dev.collisions = on;
		if (!this.colliderView) {
			this.colliderView = new THREE.Group();
			this.scene.add(this.colliderView);
			const mat = new THREE.MeshBasicMaterial({
				color: 0xff6bd6,
				wireframe: true,
				depthTest: false,
				transparent: true,
				opacity: 0.65,
			});
			for (const c of this.world.colliders)
				shape(this.colliderView, "box", mat, c.x, c.y, 0, c.w, c.h, 1, false);
		}
		this.colliderView.visible = on;
	}
}
function countFound(app) {
	return app.found.filter(Boolean).length;
}
