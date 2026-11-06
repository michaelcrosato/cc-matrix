import RAPIER from "@dimforge/rapier3d-compat";
import { AudioSystem } from "./audio.js";
import { WingLink } from "./network.js";
import { UI } from "./ui.js";
import {
	asteroid,
	C,
	createCockpit,
	createSky,
	explosion,
	flagship,
	glow,
	holoShip,
	release,
	resetGpuResources,
	ship,
	station,
	THREE,
} from "./visuals.js";
export const DEFAULTS = {
	damage: 28,
	enemyDamage: 11,
	aggression: 1,
	speed: 150,
	fireInterval: 0.17,
	energyDrain: 1,
	jumpTime: 2.6,
};
export const SECTORS = [
	{
		name: "Kestrel",
		type: "STARBASE PERIMETER",
		symbol: "◇",
		brief: "Break the raid. Keep the base standing.",
		station: true,
		required: true,
		kinds: ["fighter", "fighter", "fighter"],
	},
	{
		name: "Ember Belt",
		type: "ASTEROID INTERDICTION",
		symbol: "◌",
		brief: "Sweep the belt. Watch the rocks.",
		required: true,
		kinds: ["fighter", "fighter", "fighter", "bomber"],
		rocks: 22,
	},
	{
		name: "Picket",
		type: "ENEMY RELAY",
		symbol: "⌁",
		brief: "Silence the raiders guarding the relay.",
		required: true,
		kinds: ["bomber", "fighter", "bomber"],
		rocks: 8,
	},
	{
		name: "Haven",
		type: "REPAIR ANCHORAGE",
		symbol: "◇",
		brief: "A quiet dock. Repair, rearm, breathe.",
		station: true,
		kinds: [],
		rocks: 5,
	},
	{
		name: "Broken Crown",
		type: "COMMAND SHIP",
		symbol: "♜",
		brief: "Destroy both shield relays. Then the core.",
		boss: true,
		kinds: ["boss", "relay", "relay", "fighter", "fighter"],
	},
	{
		name: "Quiet Drift",
		type: "SALVAGE FIELD",
		symbol: "✧",
		brief: "Recover energy. Mind the old mines.",
		kinds: ["mine", "mine", "mine"],
		rocks: 14,
	},
];
export function rng(seed) {
	let v = seed >>> 0;
	return () => {
		v = (1664525 * v + 1013904223) >>> 0;
		return v / 4294967296;
	};
}
const V = THREE.Vector3;
const FORWARD = new V(0, 0, -1);
const UP = new V(0, 1, 0);
function vector(p) {
	return new V(p.x, p.y, p.z);
}
export class Game {
	constructor() {
		this.state = "boot";
		this.phase = "title";
		this.hubActive = false;
		this.hubEnded = false;
		this.hubStarted = false;
		this.ready = false;
		this.cfg = { ...DEFAULTS };
		this.settings = {
			master: 0.65,
			music: 0.1,
			sfx: 0.65,
			sensitivity: 1,
			glyphs: "ps",
			invert: false,
			shake: true,
		};
		try {
			Object.assign(
				this.settings,
				JSON.parse(localStorage.getItem("reclaimers-settings") || "{}"),
			);
			this.best = Number(localStorage.getItem("reclaimers-best") || 0);
		} catch {
			this.best = 0;
		}
		this.audio = new AudioSystem(this.settings);
		this.ui = new UI(this);
		this.net = new WingLink(this);
		this.ghosts = new Map();
		this.ghostMeshes = new Map();
		this.ghostClock = 0;
		this.ghostSend = 0;
		this.lastActivity = performance.now();
		this.elapsed = 0;
		this.attract = false;
		this.ai = false;
		this.devInvincible = false;
		this.cooldowns = { fire: 0, nova: 0, bump: 0 };
		this.inputs = {
			thrust: 0,
			strafe: 0,
			lookX: 0,
			lookY: 0,
			roll: 0,
			fire: false,
			boost: false,
		};
		this.keys = new Set();
		this.mouse = { x: 0, y: 0, active: false, fire: false };
		this.touch = { left: null, right: null, x: 0, y: 0, lx: 0, ly: 0 };
		this.inputMode = "keyboard";
		this.padPrevious = [];
		this.padMenuTimer = 0;
		this.hudClock = 0;
		this.simAccumulator = 0;
		this.rng = rng(8201982);
		this.configSeed = 8201982;
		this.frameCount = 0;
		this.stats = {
			shots: 0,
			hits: 0,
			kills: 0,
			jumps: 0,
			docks: 0,
			nova: 0,
			salvage: 0,
			rapierHits: 0,
			damageTaken: 0,
			relays: 0,
		};
		this.error = null;
		this.registerInput();
	}
	async init() {
		document.getElementById("load-status").textContent =
			"Calibrating Rapier flight physics…";
		await RAPIER.init();
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(0x141d30);
		this.camera = new THREE.PerspectiveCamera(
			67,
			innerWidth / innerHeight,
			0.1,
			5000,
		);
		this.scene.add(this.camera);
		const forceWebGL =
			new URLSearchParams(location.search).get("renderer") === "webgl";
		let device;
		if (!forceWebGL && navigator.gpu) {
			try {
				const adapter = await navigator.gpu.requestAdapter({
					powerPreference: "high-performance",
				});
				if (adapter) device = await adapter.requestDevice();
			} catch {}
		}
		this.renderer = new THREE.WebGPURenderer({
			canvas: document.getElementById("world"),
			antialias: true,
			forceWebGL,
			device,
		});
		this.renderer.onDeviceLost = (info) => {
			this.gpuLost = info.message;
			if (this.ready) this.restoreGraphics();
			else this.pendingRecovery = true;
		};
		this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
		this.renderer.setSize(innerWidth, innerHeight);
		this.renderer.outputColorSpace = THREE.SRGBColorSpace;
		this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
		this.renderer.toneMappingExposure = 1.28;
		document.getElementById("load-status").textContent =
			"Opening the canopy. Initializing the renderer…";
		await this.renderer.init();
		this.backend = this.renderer.backend.isWebGPUBackend ? "WebGPU" : "WebGL2";
		const ambient = new THREE.AmbientLight(0xb7b2d1, 1.9);
		this.scene.add(ambient);
		this.sun = new THREE.DirectionalLight(0xffe3ad, 3.1);
		this.sun.position.set(-400, 500, 300);
		this.scene.add(this.sun);
		const rim = new THREE.DirectionalLight(0x74b9c7, 1.4);
		rim.position.set(300, -100, -500);
		this.scene.add(rim);
		this.sky = createSky(rng(203144));
		this.scene.add(this.sky);
		this.field = new THREE.Group();
		this.scene.add(this.field);
		this.effects = [];
		this.cockpit = createCockpit(this.camera);
		this.cockpit.visible = false;
		this.playerMesh = ship("fighter", true);
		this.scene.add(this.playerMesh);
		this.playerMesh.visible = false;
		this.titleHero = ship("fighter", true);
		this.titleHero.position.set(140, 30, -210);
		this.titleHero.rotation.set(0.1, -0.55, -0.22);
		this.titleHero.scale.setScalar(2.8);
		this.scene.add(this.titleHero);
		this.startCampaign();
		this.loadSector(0);
		this.ready = true;
		if (this.pendingRecovery) await this.restoreGraphics(false);
		window.addEventListener("resize", () => this.resize());
		this.resize();
		this.state = "title";
		this.lastActivity = performance.now();
		this.ui.title();
		const info = await AIHub.connect({ mode: "ghost", seats: [1, 4] });
		if (info) {
			this.hubActive = true;
			this.hubInfo = info;
			this.configSeed = Number(info.seed) || 8201982;
			this.rng = rng(this.configSeed);
			this.startCampaign();
			this.state = "hub-wait";
			this.titleHero.visible = false;
			this.ui.setGameplay(true);
			this.ui.closeModal();
			document.getElementById("title-screen").classList.add("hide");
			this.loadSector(0);
			this.ui.comms("Stand by, pilot. Flight control has the clock.", 10);
			AIHub.on("start", () => {
				this.hubStarted = true;
			});
			AIHub.on("message", (data, from) => {
				if (data?.kind === "patrol" && this.net.valid(data.state)) {
					const p = AIHub.players.find((x) => x.id === from);
					this.receiveGhost(
						data.state,
						from,
						p?.name || "WINGMATE",
						p?.color || "#8bdaca",
					);
				}
			});
			AIHub.on("leave", ({ id }) => {
				this.ghosts.delete(id);
				const m = this.ghostMeshes.get(id);
				if (m) m.visible = false;
			});
			AIHub.on("time-up", () => this.reportResult());
			AIHub.on("end", () => {
				this.hubEnded = true;
				this.state = "ended";
				this.audio.stop();
				this.inputs.fire = false;
				this.keys.clear();
				this.ui.closeModal();
				this.ui.comms(
					"Patrol complete. Flight control has your report.",
					99999,
				);
			});
			AIHub.ready();
		}
		this.lastFrame = performance.now();
		this.renderer.setAnimationLoop((t) => this.frame(t));
		document.getElementById("loading").classList.add("hide");
		this.ui.refreshPrompts();
		this.expose();
	}
	startCampaign() {
		this.campaign = SECTORS.map((s, i) => ({
			...s,
			id: i,
			visited: false,
			cleared: s.kinds.length === 0,
			docked: false,
			enemies: s.kinds.map((kind, j) => ({
				id: i * 100 + j + 1,
				kind,
				hp:
					kind === "boss"
						? 720
						: kind === "relay"
							? 140
							: kind === "bomber"
								? 112
								: kind === "mine"
									? 32
									: 64,
				maxHp:
					kind === "boss"
						? 720
						: kind === "relay"
							? 140
							: kind === "bomber"
								? 112
								: kind === "mine"
									? 32
									: 64,
				dead: false,
			})),
		}));
		this.player = {
			hp: 100,
			shield: 100,
			energy: 100,
			shields: true,
			nova: 3,
			heat: 0,
			throttle: 0.24,
			pos: new V(0, 0, 90),
			q: new THREE.Quaternion(),
			yaw: 0,
			pitch: 0,
			roll: 0,
			lastHit: -10,
		};
		this.score = 0;
		this.baseHull = 100;
		this.elapsed = 0;
		this.sector = 0;
		this.selectedSector = 1;
		this.target = null;
		this.jump = null;
		this.docking = null;
		this.bossDefeated = false;
		this.resultReported = false;
		this.autoStage = 0;
		this.autoWait = 0;
		this.stats = {
			shots: 0,
			hits: 0,
			kills: 0,
			jumps: 0,
			docks: 0,
			nova: 0,
			salvage: 0,
			rapierHits: 0,
			damageTaken: 0,
			relays: 0,
		};
		this.cooldowns = { fire: 0, nova: 0, bump: 0 };
		this.gameRng = rng(this.configSeed);
	}
	loadSector(index) {
		if (this.world) this.world.free();
		this.events?.free();
		for (const child of this.field.children) release(child);
		this.world = new RAPIER.World({ x: 0, y: 0, z: 0 });
		this.world.timestep = 1 / 60;
		this.events = new RAPIER.EventQueue(true);
		this.field.clear();
		for (const fx of this.effects || []) {
			this.scene.remove(fx.root);
			release(fx.root);
		}
		this.effects = [];
		this.enemies = [];
		this.projectiles = [];
		this.rocks = [];
		this.pickups = [];
		this.hitMap = new Map();
		this.stationMesh = null;
		this.sector = index;
		this.campaign[index].visited = true;
		this.player.pos.set(0, 0, 100);
		this.player.yaw = 0;
		this.player.pitch = 0;
		this.player.roll = 0;
		this.player.q.identity();
		this.playerBody = this.world.createRigidBody(
			RAPIER.RigidBodyDesc.dynamic()
				.setTranslation(0, 0, 100)
				.setLinearDamping(0.1)
				.setAngularDamping(10)
				.setCcdEnabled(true),
		);
		this.playerCol = this.world.createCollider(
			RAPIER.ColliderDesc.ball(4)
				.setRestitution(0.3)
				.setCollisionGroups((1 << 16) | 26)
				.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
			this.playerBody,
		);
		this.hitMap.set(this.playerCol.handle, { kind: "player" });
		const def = this.campaign[index];
		const random = rng(this.configSeed + index * 901);
		if (def.station) {
			this.stationMesh = station();
			this.stationPos = new V(index === 0 ? 80 : 0, -15, -370);
			this.stationMesh.position.copy(this.stationPos);
			this.field.add(this.stationMesh);
			this.dockPos = this.stationPos.clone().add(new V(0, 0, 110));
			const b = this.world.createRigidBody(
				RAPIER.RigidBodyDesc.fixed().setTranslation(
					...this.stationPos.toArray(),
				),
			);
			const col = this.world.createCollider(
				RAPIER.ColliderDesc.ball(52)
					.setCollisionGroups((16 << 16) | 13)
					.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
				b,
			);
			this.hitMap.set(col.handle, { kind: "station" });
		} else {
			this.stationPos = null;
			this.dockPos = null;
		}
		const count = def.rocks || 0;
		for (let i = 0; i < count; i++) {
			const radius = 12 + random() * 24;
			let x = (random() - 0.5) * 1050;
			const y = (random() - 0.5) * 500;
			const z = -120 - random() * 1000;
			if (Math.abs(x) < 100 && Math.abs(y) < 100) x += 200;
			const root = asteroid(radius, random);
			root.position.set(x, y, z);
			root.rotation.set(random() * 3, random() * 3, random() * 3);
			this.field.add(root);
			const body = this.world.createRigidBody(
				RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z),
			);
			const col = this.world.createCollider(
				RAPIER.ColliderDesc.ball(radius * 0.85)
					.setCollisionGroups((16 << 16) | 13)
					.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
				body,
			);
			this.hitMap.set(col.handle, { kind: "rock", root });
			this.rocks.push({ root, body, radius });
		}
		for (const [i, d] of def.enemies.entries()) {
			if (d.dead) continue;
			const pos =
				d.kind === "boss"
					? new V(0, 0, -650)
					: d.kind === "relay"
						? new V(i === 1 ? -100 : 100, 20, -610)
						: new V(
								(i % 2 === 0 ? -1 : 1) * (90 + (i % 3) * 55),
								20 + Math.sin(i * 3) * 60,
								-270 - i * 100,
							);
			const root =
				d.kind === "boss"
					? flagship()
					: d.kind === "relay"
						? glow(new THREE.IcosahedronGeometry(12, 1), C.cyan)
						: d.kind === "mine"
							? glow(new THREE.OctahedronGeometry(7), C.red)
							: ship(d.kind);
			root.position.copy(pos);
			if (d.kind === "relay") {
				root.add(glow(new THREE.TorusGeometry(20, 1.5, 5, 24), C.paper));
				root.userData.relay = true;
			}
			if (d.kind === "mine") {
				root.add(glow(new THREE.TorusGeometry(11, 0.9, 5, 16), C.yellow));
			}
			this.field.add(root);
			const body = this.world.createRigidBody(
				RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
					...pos.toArray(),
				),
			);
			const radius =
				d.kind === "boss"
					? 77
					: d.kind === "relay"
						? 18
						: d.kind === "bomber"
							? 18
							: d.kind === "mine"
								? 8
								: 14;
			const col = this.world.createCollider(
				RAPIER.ColliderDesc.ball(radius)
					.setCollisionGroups((2 << 16) | 5)
					.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
				body,
			);
			const e = {
				...d,
				data: d,
				root,
				body,
				col,
				pos: pos.clone(),
				prev: pos.clone(),
				vel: new V(),
				home: pos.clone(),
				phase: random() * Math.PI * 2,
				cd: 1.4 + i * 0.65,
				radius,
				alive: true,
			};
			this.enemies.push(e);
			this.hitMap.set(col.handle, e);
		}
		if (index === 5)
			for (let i = 0; i < 3; i++)
				this.spawnPickup(new V((i - 1) * 120, 20, -250 - i * 100), true);
		this.world.step(this.events);
		this.target =
			this.enemies.find((e) => e.kind === "relay") || this.enemies[0] || null;
		this.simAccumulator = 0;
		this.ui?.update(0);
		for (const mesh of this.ghostMeshes.values()) mesh.visible = false;
	}
	start(attract = false, linked = false) {
		if (this.hubActive && (this.hubEnded || this.state !== "hub-wait")) return;
		this.attract = attract;
		this.ai = attract;
		this.devInvincible = false;
		this.startCampaign();
		this.loadSector(0);
		this.state = "playing";
		this.phase = "patrol";
		this.titleHero.visible = false;
		this.ui.setGameplay(true);
		this.ui.closeModal();
		this.ui.comms(
			"Patrol 082, you are cleared. Three raiders on the scope. Kestrel is counting on you.",
			7,
		);
		this.lastActivity = performance.now();
		this.mouse.active = false;
		this.mouse.fire = false;
		this.keys.clear();
		if (!attract && !linked) this.audio.init();
		this.ui.refreshPrompts();
	}
	toTitle() {
		if (this.hubActive) return;
		this.attract = false;
		this.ai = false;
		this.state = "title";
		this.ui.title();
		this.titleHero.visible = true;
		this.cockpit.visible = false;
		this.playerMesh.visible = false;
		this.startCampaign();
		this.loadSector(0);
		this.lastActivity = performance.now();
		this.keys.clear();
		this.mouse.fire = false;
	}
	activity(mode) {
		if (this.hubEnded) return false;
		this.lastActivity = performance.now();
		if (mode && this.inputMode !== mode) {
			this.inputMode = mode;
			this.ui.refreshPrompts();
		}
		if (this.attract) {
			this.toTitle();
			return false;
		}
		return true;
	}
	frame(t) {
		if (!this.ready || this.recovering) return;
		try {
			const dt = Math.min(0.05, Math.max(0, (t - this.lastFrame) / 1000));
			this.lastFrame = t;
			this.frameCount++;
			this.pollPad(dt);
			if (this.state === "title" && t - this.lastActivity > 10000)
				this.start(true);
			if (this.state === "hub-wait" && this.hubStarted && AIHub.time() >= 0) {
				this.start(false, true);
				this.audio.init();
			}
			if (
				this.state === "playing" &&
				!this.ui.blocksSimulation() &&
				!this.hubEnded
			) {
				this.simAccumulator += dt;
				while (this.simAccumulator >= 1 / 60) {
					this.tick(1 / 60);
					this.simAccumulator -= 1 / 60;
				}
			}
			if (this.state === "title" || this.state === "hub-wait") {
				this.titleHero.userData.mixer.update(dt);
				if (this.stationMesh) this.stationMesh.userData.mixer.update(dt);
				for (const e of this.enemies) e.root.userData.mixer?.update(dt);
				this.camera.position.set(
					-105 + Math.sin(t * 0.00015) * 12,
					36 + Math.sin(t * 0.0002) * 6,
					190,
				);
				this.camera.lookAt(80, 10, -450);
				this.cockpit.visible = false;
				this.playerMesh.visible = false;
			} else this.updateCamera(dt);
			this.sky.position.copy(this.player.pos);
			if (this.state === "title") this.sky.position.set(0, 0, 0);
			this.renderGhosts(dt);
			this.hudClock += dt;
			if (this.hudClock > 0.055) {
				this.ui.update(this.hudClock);
				this.hudClock = 0;
			}
			this.ui.tick(dt);
			this.audio.update(this.state === "playing");
			if (this.hubActive && !this.hubEnded && this.state !== "hub-wait") {
				this.ghostSend += dt;
				if (this.ghostSend > 0.12) {
					this.ghostSend = 0;
					AIHub.send(
						{ kind: "patrol", state: this.ghostState() },
						{ reliable: false },
					);
					AIHub.progress({
						score: this.score,
						label: `${this.stats.kills} contacts · ${SECTORS[this.sector].name}`,
					});
				}
			}
			this.net.update(dt);
			this.renderer.render(this.scene, this.camera);
		} catch (e) {
			this.error = e.message;
			console.error(e);
			this.ready = false;
			this.ui.notice("Flight computer error: " + e.message, 20);
			if (this.hubActive) AIHub.fail(e.message);
		}
	}
	tick(dt) {
		this.elapsed += dt;
		const p = this.player;
		for (const k of Object.keys(this.cooldowns))
			this.cooldowns[k] = Math.max(0, this.cooldowns[k] - dt);
		if (this.ai) this.autopilot(dt);
		else this.readControls(dt);
		p.q.setFromEuler(new THREE.Euler(p.pitch, p.yaw, p.roll, "YXZ"));
		this.playerBody.setRotation(p.q, true);
		const forward = FORWARD.clone().applyQuaternion(p.q),
			right = new V(1, 0, 0).applyQuaternion(p.q);
		const boost = this.inputs.boost && p.energy > 2 && !this.jump;
		const speed = this.cfg.speed * p.throttle * (boost ? 2.2 : 1);
		const desired = forward
			.multiplyScalar(this.docking ? 0 : speed)
			.addScaledVector(right, this.inputs.strafe * this.cfg.speed * 0.48);
		const old = vector(this.playerBody.linvel());
		old.lerp(desired, 1 - Math.exp(-dt * 3.2));
		this.playerBody.setLinvel(old, true);
		p.heat = Math.max(0, p.heat - dt * 0.3);
		const drain =
			(0.13 + p.throttle * 0.2 + (p.shields ? 0.16 : 0) + (boost ? 1.6 : 0)) *
			this.cfg.energyDrain;
		p.energy = Math.max(0, p.energy - drain * dt);
		if (p.energy < 25) p.energy = Math.min(25, p.energy + dt * 1.2);
		if (p.shields && this.elapsed - p.lastHit > 3 && p.energy > 1)
			p.shield = Math.min(100, p.shield + dt * 4.2);
		if (p.energy < 3) p.shields = false;
		if (this.inputs.fire && !this.jump && !this.docking) this.fire();
		for (const e of this.enemies) {
			if (!e.alive) continue;
			e.prev.copy(e.pos);
			e.phase += dt * (e.kind === "boss" ? 0.25 : 0.65);
			if (["fighter", "bomber"].includes(e.kind)) {
				const delta = p.pos.clone().sub(e.pos),
					dist = delta.length();
				delta.normalize();
				const tangent = new V(-delta.z, 0.3 * Math.sin(e.phase), delta.x);
				const move = delta
					.multiplyScalar(dist > 420 ? 48 : dist < 190 ? -42 : 5)
					.addScaledVector(
						tangent,
						(e.kind === "bomber" ? 16 : 30) * this.cfg.aggression,
					);
				e.pos.addScaledVector(move, dt);
				e.pos.y += Math.sin(e.phase) * dt * 6;
				e.root.quaternion.setFromUnitVectors(
					FORWARD,
					p.pos.clone().sub(e.pos).normalize(),
				);
				e.body.setNextKinematicTranslation(e.pos);
				e.vel.copy(e.pos).sub(e.prev).divideScalar(dt);
			} else if (e.kind === "relay") {
				e.root.rotation.y += dt * 0.8;
				e.root.rotation.z += dt * 0.4;
			} else if (e.kind === "boss") {
				e.pos.y = Math.sin(e.phase) * 12;
				e.body.setNextKinematicTranslation(e.pos);
			} else if (e.kind === "mine") {
				e.root.rotation.y += dt;
				if (e.pos.distanceTo(p.pos) < 40) {
					this.hurt(24);
					this.kill(e, false);
				}
			}
			e.root.position.copy(e.pos);
			e.root.userData.mixer?.update(dt);
			e.cd -= dt * this.cfg.aggression;
			if (
				e.cd <= 0 &&
				e.pos.distanceTo(p.pos) < 1300 &&
				["fighter", "bomber", "boss"].includes(e.kind)
			) {
				this.enemyFire(e);
				e.cd =
					e.kind === "boss"
						? 1.8
						: e.kind === "bomber"
							? 2.7
							: 3.5 + (e.id % 3) * 0.5;
			}
		}
		this.world.timestep = dt;
		this.world.step(this.events);
		p.pos.copy(vector(this.playerBody.translation()));
		this.events.drainCollisionEvents((a, b, started) => {
			if (!started || this.cooldowns.bump > 0) return;
			const other =
				a === this.playerCol.handle
					? this.hitMap.get(b)
					: b === this.playerCol.handle
						? this.hitMap.get(a)
						: null;
			if (other && other.kind !== "player" && other.kind !== "bullet") {
				this.hurt(other.kind === "rock" ? 16 : 10);
				this.cooldowns.bump = 1.4;
				this.audio.fx("hit");
			}
		});
		this.updateBullets(dt);
		for (const fx of this.effects) {
			fx.life -= dt;
			fx.mix.update(dt);
			fx.root.traverse((o) => {
				if (o.isMesh && o.material.transparent)
					o.material.opacity = Math.max(0, fx.life / fx.max);
			});
		}
		for (let i = this.effects.length - 1; i >= 0; i--)
			if (this.effects[i].life <= 0) {
				this.scene.remove(this.effects[i].root);
				release(this.effects[i].root);
				this.effects.splice(i, 1);
			}
		for (const item of this.pickups) {
			item.root.rotation.y += dt;
			item.root.rotation.z += dt * 0.4;
			if (item.pos.distanceTo(p.pos) < 85) this.collect(item);
		}
		this.pickups = this.pickups.filter((x) => !x.taken);
		if (this.stationMesh) this.stationMesh.userData.mixer.update(dt);
		this.cockpit.userData.mixer.update(dt);
		if (this.jump) {
			this.jump.time -= dt;
			if (this.jump.time <= 0) {
				const to = this.jump.to;
				this.jump = null;
				this.loadSector(to);
				this.stats.jumps++;
				this.ui.comms(
					SECTORS[to].boss
						? "Command ship acquired. Take out the two bright shield relays before you fire on the hull."
						: SECTORS[to].brief,
					6,
				);
			}
		}
		if (this.docking) {
			this.docking.time -= dt;
			p.energy = Math.min(100, p.energy + dt * 40);
			p.hp = Math.min(100, p.hp + dt * 40);
			p.shield = Math.min(100, p.shield + dt * 50);
			if (this.docking.time <= 0) {
				this.docking = null;
				p.hp = p.energy = p.shield = 100;
				p.nova = 3;
				p.shields = true;
				p.heat = 0;
				this.stats.docks++;
				if (!this.campaign[this.sector].docked) {
					this.score += 150;
					this.campaign[this.sector].docked = true;
				}
				this.ui.comms(
					"Fuel topped. Hull patched. Three novas in the rack. Try to bring this one back in one piece.",
					6,
				);
				if (this.bossDefeated && this.sector === 0) this.finish(true);
			}
		}
		const threats = this.campaign.slice(0, 3).filter((s) => !s.cleared).length;
		this.baseHull = Math.max(0, this.baseHull - dt * 0.025 * threats);
		if (p.hp <= 0 || this.baseHull <= 0 || this.elapsed > 720)
			this.finish(false);
		if (this.attract && (this.state === "debrief" || this.elapsed > 150)) {
			this.autoWait += dt;
			if (this.autoWait > 5) this.start(true);
		}
	}
	readControls(dt) {
		const k = this.keys;
		const pad = this.padInput || {};
		const thrust =
			(k.has("KeyW") || k.has("ArrowUp") ? 1 : 0) -
			(k.has("KeyS") || k.has("ArrowDown") ? 1 : 0) +
			(pad.thrust || 0) +
			(this.touch.ly || 0);
		this.inputs.strafe =
			(k.has("KeyD") ? 1 : 0) -
			(k.has("KeyA") ? 1 : 0) +
			(pad.strafe || 0) +
			(this.touch.lx || 0);
		const mx = this.mouse.active ? this.mouse.x : 0,
			my = this.mouse.active ? this.mouse.y : 0;
		let lookX = mx + (pad.lookX || 0) + (this.touch.x || 0);
		const lookY = my + (pad.lookY || 0) + (this.touch.y || 0);
		if (k.has("ArrowLeft")) lookX -= 0.75;
		if (k.has("ArrowRight")) lookX += 0.75;
		this.player.throttle = THREE.MathUtils.clamp(
			this.player.throttle + thrust * dt * 0.5,
			0,
			1,
		);
		this.player.yaw -= lookX * dt * 1.25 * this.settings.sensitivity;
		this.player.pitch = THREE.MathUtils.clamp(
			this.player.pitch -
				lookY *
					dt *
					1.1 *
					this.settings.sensitivity *
					(this.settings.invert ? -1 : 1),
			-1.48,
			1.48,
		);
		this.player.roll +=
			((k.has("KeyQ") ? 1 : 0) - (k.has("KeyE") ? 1 : 0)) * dt * 1.8;
		this.inputs.boost =
			k.has("ShiftLeft") || k.has("ShiftRight") || !!pad.boost;
		this.inputs.fire = k.has("Space") || this.mouse.fire || !!pad.fire;
		if (this.inputMode === "touch") {
			this.inputs.fire = this.target?.alive && this.aimDot(this.target) > 0.975;
			this.player.shields = true;
			if (!this.target?.alive) this.cycleTarget();
			if (this.touch.left === null)
				this.player.throttle = THREE.MathUtils.lerp(
					this.player.throttle,
					0.16,
					dt,
				);
		}
	}
	aimDot(e) {
		return FORWARD.clone()
			.applyQuaternion(this.player.q)
			.dot(e.pos.clone().sub(this.player.pos).normalize());
	}
	intercept(e, speed = 680) {
		const distance = e.pos.distanceTo(this.player.pos);
		return e.pos
			.clone()
			.addScaledVector(e.vel, distance / speed)
			.sub(this.player.pos)
			.normalize();
	}
	fire() {
		if (
			this.cooldowns.fire > 0 ||
			this.player.energy < 0.8 ||
			this.player.heat > 0.96
		)
			return;
		this.cooldowns.fire =
			this.cfg.fireInterval * (this.player.hp < 35 ? 1.5 : 1);
		this.player.energy = Math.max(
			0,
			this.player.energy - 0.62 * this.cfg.energyDrain,
		);
		this.player.heat = Math.min(1, this.player.heat + 0.069);
		let dir = FORWARD.clone().applyQuaternion(this.player.q);
		if (this.target?.alive && this.aimDot(this.target) > 0.972)
			dir = this.intercept(this.target);
		this.makeBullet(
			this.player.pos.clone().addScaledVector(dir, 15),
			dir,
			680,
			true,
			this.cfg.damage,
		);
		this.stats.shots++;
		this.audio.fx("shot");
		this.cockpit.userData.recoil();
	}
	enemyFire(e) {
		const delta = this.player.pos
			.clone()
			.addScaledVector(
				vector(this.playerBody.linvel()),
				(e.pos.distanceTo(this.player.pos) / 230) * 0.55,
			)
			.sub(e.pos)
			.normalize();
		if (e.kind === "boss") {
			for (const s of [-1, 0, 1]) {
				const dir = delta
					.clone()
					.add(new V(s * 0.08, Math.cos(e.phase) * 0.025, 0))
					.normalize();
				this.makeBullet(
					e.pos.clone().addScaledVector(dir, 90),
					dir,
					230,
					false,
					this.cfg.enemyDamage * 1.3,
				);
			}
		} else
			this.makeBullet(
				e.pos.clone().addScaledVector(delta, 22),
				delta,
				e.kind === "bomber" ? 205 : 235,
				false,
				this.cfg.enemyDamage,
			);
		this.audio.fx("enemy");
	}
	makeBullet(pos, dir, speed, friendly, damage) {
		const body = this.world.createRigidBody(
			RAPIER.RigidBodyDesc.dynamic()
				.setTranslation(...pos.toArray())
				.setLinvel(dir.x * speed, dir.y * speed, dir.z * speed)
				.setCcdEnabled(true),
		);
		const membership = friendly ? 4 : 8,
			filter = friendly ? 18 : 17;
		const col = this.world.createCollider(
			RAPIER.ColliderDesc.ball(friendly ? 1.5 : 2.5)
				.setSensor(true)
				.setCollisionGroups((membership << 16) | filter),
			body,
		);
		this.hitMap.set(col.handle, { kind: "bullet" });
		const root = new THREE.Group();
		for (const s of [-1, 1]) {
			const mesh = glow(
				new THREE.BoxGeometry(
					friendly ? 0.65 : 1.2,
					friendly ? 0.65 : 1.2,
					friendly ? 15 : 10,
				),
				friendly ? C.yellow : C.red,
				[s * (friendly ? 3.4 : 1.6), 0, 0],
			);
			root.add(mesh);
		}
		root.position.copy(pos);
		root.quaternion.setFromUnitVectors(FORWARD, dir);
		this.field.add(root);
		this.projectiles.push({
			body,
			col,
			root,
			prev: pos.clone(),
			dir,
			speed,
			friendly,
			damage,
			life: friendly ? 2.2 : 6,
		});
	}
	updateBullets(dt) {
		for (let i = this.projectiles.length - 1; i >= 0; i--) {
			const b = this.projectiles[i];
			const pos = vector(b.body.translation()),
				delta = pos.clone().sub(b.prev),
				len = delta.length();
			let hit = null;
			if (len > 0.001)
				hit = this.world.castRay(
					new RAPIER.Ray(b.prev, delta.divideScalar(len)),
					len + 1,
					true,
					undefined,
					((b.friendly ? 4 : 8) << 16) | (b.friendly ? 18 : 17),
					b.col,
					b.body,
				);
			if (hit) {
				const obj = this.hitMap.get(hit.collider.handle);
				if (b.friendly && obj?.alive) {
					this.damageEnemy(obj, b.damage);
					this.stats.hits++;
					this.stats.rapierHits++;
				} else if (!b.friendly && obj?.kind === "player") {
					this.hurt(b.damage);
					this.stats.rapierHits++;
				}
				this.addExplosion(pos, 3);
				b.life = 0;
			}
			b.life -= dt;
			b.prev.copy(pos);
			b.root.position.copy(pos);
			if (b.life <= 0) {
				this.hitMap.delete(b.col.handle);
				this.world.removeRigidBody(b.body);
				this.field.remove(b.root);
				release(b.root);
				this.projectiles.splice(i, 1);
			}
		}
	}
	damageEnemy(e, amount) {
		if (!e.alive) return;
		if (
			e.kind === "boss" &&
			this.enemies.some((x) => x.kind === "relay" && x.alive)
		) {
			this.ui.notice("CROWN SHIELDED — destroy both cyan relays", 2);
			return;
		}
		e.hp = Math.max(0, e.hp - amount);
		e.data.hp = e.hp;
		this.audio.fx("hit");
		if (e.hp <= 0) this.kill(e, true);
	}
	kill(e, credit = true) {
		if (!e.alive) return;
		e.alive = false;
		e.data.dead = true;
		e.data.hp = 0;
		this.hitMap.delete(e.col.handle);
		this.world.removeRigidBody(e.body);
		this.field.remove(e.root);
		release(e.root);
		this.addExplosion(
			e.pos,
			e.kind === "boss" ? 90 : e.kind === "relay" ? 22 : 17,
		);
		this.audio.fx("explode");
		if (credit) {
			this.stats.kills++;
			this.score +=
				e.kind === "boss"
					? 1800
					: e.kind === "relay"
						? 350
						: e.kind === "bomber"
							? 250
							: e.kind === "mine"
								? 70
								: 150;
			this.player.energy = Math.min(100, this.player.energy + 6);
		}
		if (e.kind === "relay") {
			this.stats.relays++;
			this.ui.comms(
				this.enemies.some((x) => x.kind === "relay" && x.alive)
					? "One relay down. Find the other."
					: "Shield lattice is gone. The Crown is open. Give it everything.",
				5,
			);
		}
		if (e.kind === "boss") {
			this.bossDefeated = true;
			this.ui.comms(
				"Command ship destroyed. The lanes are ours. Return to Kestrel and dock for your report.",
				8,
			);
			this.selectedSector = 0;
		} else if (e.kind !== "mine") this.spawnPickup(e.pos.clone());
		if (this.target === e)
			this.target =
				this.enemies.find((x) => x.alive && x.kind === "relay") ||
				this.enemies.find((x) => x.alive) ||
				null;
		const survivors = this.enemies.filter((x) => x.alive);
		if (!survivors.length) {
			this.campaign[this.sector].cleared = true;
			this.score += 250;
			if (!this.bossDefeated) {
				const next = this.campaign.find((s) => s.required && !s.cleared);
				this.selectedSector = next?.id ?? 4;
				this.ui.comms(
					next
						? "Sector secured. Recover wreck energy or dock, then open your chart for the next patrol."
						: "Outer sectors secured. The command ship is exposed in Broken Crown. Chart your jump.",
					7,
				);
			}
		}
	}
	addExplosion(pos, size) {
		this.effects.push(explosion(this.scene, pos, size, this.gameRng));
	}
	hurt(amount) {
		if (this.attract || this.devInvincible) return;
		this.stats.damageTaken += amount;
		const p = this.player;
		p.lastHit = this.elapsed;
		let rest = amount;
		if (p.shields && p.shield > 0) {
			const absorb = Math.min(p.shield, amount * 0.9);
			p.shield -= absorb;
			rest -= absorb;
		}
		p.hp = Math.max(0, p.hp - rest);
		this.ui.damage = 1;
		this.audio.fx("hit");
		if (p.hp < 35 && this.cooldowns.bump <= 0)
			this.ui.comms("Hull damage. Starbase repairs are advised. Strongly.", 5);
	}
	spawnPickup(pos, cache = false) {
		const root = glow(new THREE.OctahedronGeometry(cache ? 8 : 5), C.cyan);
		root.add(
			glow(new THREE.TorusGeometry(cache ? 13 : 8, 0.5, 4, 16), C.paper),
		);
		root.position.copy(pos);
		this.field.add(root);
		this.pickups.push({ pos, root, cache, taken: false });
	}
	collect(item) {
		if (item.taken) return;
		item.taken = true;
		this.field.remove(item.root);
		release(item.root);
		this.player.energy = Math.min(
			100,
			this.player.energy + (item.cache ? 28 : 16),
		);
		this.player.shield = Math.min(100, this.player.shield + 8);
		this.stats.salvage++;
		this.score += item.cache ? 100 : 35;
		this.audio.fx("ui");
		this.ui.notice(
			"WRECK ENERGY RECOVERED +" + (item.cache ? 28 : 16) + " EU",
			2,
		);
	}
	cycleTarget() {
		const living = this.enemies.filter((e) => e.alive);
		if (!living.length) {
			this.target = null;
			return;
		}
		const i = living.indexOf(this.target);
		this.target = living[(i + 1) % living.length];
		this.audio.fx("ui");
	}
	toggleShield() {
		this.player.shields = !this.player.shields;
		this.ui.notice(
			"SHIELD " +
				(this.player.shields ? "ENABLED" : "OFFLINE — conserving energy"),
			2,
		);
		this.audio.fx("ui");
	}
	nova() {
		if (this.state !== "playing" || this.ui.blocksSimulation()) return;
		if (
			this.player.nova <= 0 ||
			this.cooldowns.nova > 0 ||
			this.player.energy < 18
		) {
			this.ui.notice(
				this.player.nova <= 0
					? "NOVA RACK EMPTY — rearm at a starbase"
					: this.player.energy < 18
						? "NOVA NEEDS 18 ENERGY"
						: "NOVA RECHARGING",
				2,
			);
			return;
		}
		this.player.nova--;
		this.player.energy -= 18;
		this.cooldowns.nova = 7;
		this.stats.nova++;
		this.addExplosion(this.player.pos.clone(), 110);
		this.audio.fx("nova");
		for (const e of this.enemies)
			if (e.alive && e.pos.distanceTo(this.player.pos) < 450)
				this.damageEnemy(e, 150);
		for (const b of this.projectiles) if (!b.friendly) b.life = 0;
		this.ui.notice("NOVA DISCHARGED / 450 m BLAST", 2);
	}
	interaction() {
		if (this.docking) return { type: "docking", label: "DOCKING / REPAIRING" };
		if (this.dockPos && this.player.pos.distanceTo(this.dockPos) < 150) {
			if (this.enemies.some((e) => e.alive))
				return { type: "blocked", label: "DOCK LOCKED / HOSTILES IN SECTOR" };
			if (vector(this.playerBody.linvel()).length() > 90)
				return { type: "brake", label: "REDUCE SPEED TO DOCK" };
			return { type: "dock", label: "DOCK / REPAIR + REFUEL" };
		}
		const item = this.pickups.find(
			(i) => !i.taken && i.pos.distanceTo(this.player.pos) < 220,
		);
		if (item) return { type: "salvage", label: "TRACTOR WRECK ENERGY", item };
		return null;
	}
	interact() {
		const act = this.interaction();
		if (act?.type === "dock") {
			this.docking = { time: 2.5 };
			this.player.throttle = 0;
			this.playerBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
			this.audio.fx("dock");
			this.ui.comms("Docking clamps engaged. Welcome home, patrol.", 4);
		} else if (act?.type === "salvage") this.collect(act.item);
		else if (act) this.ui.notice(act.label, 3);
		else if (this.stationPos)
			this.ui.notice(
				"Approach the cyan docking ring. Match speed below 90 m/s.",
				4,
			);
		else this.ui.notice("No docking or salvage contact in range.", 3);
	}
	unlocked(index) {
		return (
			index !== 4 ||
			this.campaign.slice(0, 3).every((s) => s.cleared) ||
			this.bossDefeated
		);
	}
	jumpTo(index = this.selectedSector) {
		if (this.state !== "playing" || this.jump || this.docking) return false;
		if (!this.unlocked(index)) {
			this.ui.notice(
				"Clear Kestrel, Ember Belt and Picket to locate the Crown.",
				4,
			);
			return false;
		}
		if (index === this.sector) {
			this.ui.notice("Already in this sector.", 2);
			return false;
		}
		if (this.player.energy < 12 && !this.attract) {
			this.ui.notice(
				"HYPERSPACE NEEDS 12 ENERGY. Reactor reserve is charging.",
				4,
			);
			return false;
		}
		this.ui.closeModal();
		this.player.energy = Math.max(0, this.player.energy - 12);
		this.jump = { to: index, time: this.cfg.jumpTime, max: this.cfg.jumpTime };
		this.audio.fx("jump");
		return true;
	}
	updateCamera(dt) {
		const p = this.player;
		if (!p) return;
		this.playerMesh.position.copy(p.pos);
		this.playerMesh.quaternion.copy(p.q);
		this.playerMesh.userData.mixer.update(dt);
		this.playerMesh.visible = !!this.chase;
		this.cockpit.visible = !this.chase;
		const desired = p.pos.clone();
		if (this.chase) {
			desired.add(new V(0, 18, 65).applyQuaternion(p.q));
			this.camera.position.lerp(desired, Math.min(1, dt * 8));
			this.camera.quaternion.slerp(p.q, Math.min(1, dt * 9));
		} else {
			this.camera.position.copy(desired);
			this.camera.quaternion.copy(p.q);
			if (this.settings.shake && this.ui.damage > 0.01) {
				this.camera.position.x +=
					Math.sin(this.elapsed * 97) * this.ui.damage * 0.7;
				this.camera.position.y +=
					Math.sin(this.elapsed * 73) * this.ui.damage * 0.5;
			}
			this.cockpit.rotation.z = THREE.MathUtils.lerp(
				this.cockpit.rotation.z,
				-this.inputs.strafe * 0.04,
				Math.min(1, dt * 5),
			);
		}
		this.camera.fov =
			67 +
			(this.inputs.boost ? 8 : 0) +
			(this.jump
				? Math.sin((1 - this.jump.time / this.jump.max) * Math.PI) * 30
				: 0);
		this.camera.updateProjectionMatrix();
	}
	autopilot(dt) {
		const p = this.player;
		this.inputs.strafe = 0;
		this.inputs.boost = false;
		this.inputs.fire = false;
		p.shields = true;
		if (this.attract) p.hp = p.energy = p.shield = 100;
		if (this.jump || this.docking) return;
		const target =
			this.enemies.find((e) => e.alive && e.kind === "relay") ||
			this.enemies.find((e) => e.alive);
		if (target) {
			this.target = target;
			const dir = this.intercept(target);
			const q = new THREE.Quaternion().setFromUnitVectors(FORWARD, dir);
			const eu = new THREE.Euler().setFromQuaternion(q, "YXZ");
			p.yaw = eu.y;
			p.pitch = eu.x;
			p.roll = 0;
			p.q.copy(q);
			p.throttle = target.pos.distanceTo(p.pos) > 480 ? 0.3 : 0;
			this.inputs.fire = true;
			this.autoWait = 0;
			if (
				this.attract &&
				this.elapsed > 8 &&
				p.nova > 2 &&
				target.pos.distanceTo(p.pos) < 430
			)
				this.nova();
		} else {
			this.autoWait += dt;
			if (this.autoWait < 2) return;
			if (this.bossDefeated) {
				if (this.sector !== 0) {
					this.jumpTo(0);
					return;
				}
				this.flyToDock(dt);
				return;
			}
			const next = this.campaign.find((s) => s.required && !s.cleared);
			if (next) {
				this.jumpTo(next.id);
				this.autoWait = 0;
			} else if (this.autoStage === 0 && this.attract) {
				this.autoStage = 1;
				this.jumpTo(3);
				this.autoWait = 0;
			} else if (this.sector === 3 && this.stats.docks === 0) {
				this.flyToDock(dt);
			} else if (this.autoStage === 1 && this.attract) {
				this.autoStage = 2;
				this.jumpTo(5);
				this.autoWait = 0;
			} else {
				this.jumpTo(4);
				this.autoWait = 0;
			}
		}
	}
	flyToDock(dt) {
		if (!this.dockPos) return;
		const delta = this.dockPos.clone().sub(this.player.pos),
			distance = delta.length();
		const q = new THREE.Quaternion().setFromUnitVectors(
			FORWARD,
			delta.normalize(),
		);
		const eu = new THREE.Euler().setFromQuaternion(q, "YXZ");
		this.player.yaw = eu.y;
		this.player.pitch = eu.x;
		this.player.roll = 0;
		this.player.throttle = distance > 170 ? 0.55 : distance > 110 ? 0.12 : 0;
		if (distance < 150) {
			this.playerBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
			this.interact();
		}
	}
	finish(won) {
		if (this.state !== "playing") return;
		if (this.attract) {
			this.autoWait = 0;
			this.start(true);
			return;
		}
		this.state = "debrief";
		this.inputs.fire = false;
		this.mouse.fire = false;
		this.won = won;
		if (won) {
			this.score += 1000 + Math.round(this.baseHull * 5 + this.player.hp * 2);
			this.audio.fx("victory");
		} else this.audio.fx("warn");
		if (this.score > this.best && !this.hubActive) {
			this.best = this.score;
			try {
				localStorage.setItem("reclaimers-best", String(this.best));
			} catch {}
		}
		this.reportResult();
		if (!this.hubActive) this.ui.debrief(won);
	}
	reportResult() {
		if (!this.hubActive || this.resultReported || this.hubEnded) return;
		this.resultReported = true;
		AIHub.result({
			score: this.score,
			stats: {
				Contacts: this.stats.kills,
				"Hull intact": Math.round(this.player.hp),
				"Base intact": Math.round(this.baseHull),
				Jumps: this.stats.jumps,
				"Dock visits": this.stats.docks,
				Seconds: Math.round(this.elapsed),
			},
		});
	}
	ghostState() {
		return {
			sector: this.sector,
			p: this.player.pos.toArray().map((n) => Math.round(n * 10) / 10),
			q: this.player.q.toArray().map((n) => Math.round(n * 1000) / 1000),
			score: this.score,
			status: this.state,
			shots: this.stats.shots,
		};
	}
	receiveGhost(state, id, name, color) {
		this.ghosts.set(id, {
			...state,
			id,
			name,
			color,
			received: performance.now(),
		});
		if (!this.ghostMeshes.has(id)) {
			const mesh = holoShip(new THREE.Color(color));
			this.scene.add(mesh);
			this.ghostMeshes.set(id, mesh);
		}
	}
	renderGhosts(dt) {
		for (const [id, g] of this.ghosts) {
			const m = this.ghostMeshes.get(id);
			if (!m) continue;
			m.visible =
				g.sector === this.sector &&
				this.state === "playing" &&
				performance.now() - g.received < 8000;
			if (m.visible) {
				m.position.lerp(new V(...g.p), Math.min(1, dt * 12));
				m.quaternion.slerp(new THREE.Quaternion(...g.q), Math.min(1, dt * 12));
				m.userData.mixer?.update(dt);
			}
		}
	}
	async restoreGraphics(resume = true) {
		if (this.recovering || this.backend === "WebGL2") return;
		this.recovering = true;
		try {
			const previous = this.renderer;
			previous.setAnimationLoop(null);
			const old = previous.domElement,
				canvas = old.cloneNode(false);
			old.replaceWith(canvas);
			resetGpuResources(this.scene);
			previous.dispose();
			this.renderer = new THREE.WebGPURenderer({
				canvas,
				antialias: true,
				forceWebGL: true,
			});
			this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
			this.renderer.outputColorSpace = THREE.SRGBColorSpace;
			this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
			this.renderer.toneMappingExposure = 1.28;
			await this.renderer.init();
			this.renderer.setSize(innerWidth, innerHeight);
			this.backend = "WebGL2";
			this.graphicsRecovered = true;
			this.gpuLost = null;
			this.pendingRecovery = false;
			this.lastFrame = performance.now();
			if (resume) this.renderer.setAnimationLoop((t) => this.frame(t));
		} catch (e) {
			this.error = e.message;
			this.ready = false;
			this.ui.notice("Graphics restart failed: " + e.message, 30);
			if (this.hubActive) AIHub.fail(e.message);
		} finally {
			this.recovering = false;
		}
	}
	resize() {
		if (!this.renderer) return;
		this.camera.aspect = innerWidth / innerHeight;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(innerWidth, innerHeight);
		this.ui.resize();
	}
	saveSettings() {
		this.audio.apply();
		if (!this.hubActive)
			try {
				localStorage.setItem(
					"reclaimers-settings",
					JSON.stringify(this.settings),
				);
			} catch {}
	}
	snapshot() {
		return {
			ready: this.ready,
			error: this.error,
			state: this.state,
			backend: this.backend,
			three: THREE.REVISION,
			rapier: RAPIER.version(),
			sector: this.sector,
			score: this.score,
			elapsed: this.elapsed,
			player: {
				hp: this.player.hp,
				shield: this.player.shield,
				energy: this.player.energy,
				shields: this.player.shields,
				nova: this.player.nova,
				heat: this.player.heat,
				pos: this.player.pos.toArray(),
				throttle: this.player.throttle,
			},
			enemies: this.enemies
				.filter((e) => e.alive)
				.map((e) => ({
					id: e.id,
					kind: e.kind,
					hp: e.hp,
					pos: e.pos.toArray(),
				})),
			campaign: this.campaign.map((s) => ({
				name: s.name,
				cleared: s.cleared,
				visited: s.visited,
				docked: s.docked,
			})),
			stats: { ...this.stats },
			page: this.ui.page,
			attract: this.attract,
			chase: !!this.chase,
			ghosts: [...this.ghosts.values()].map((g) => ({
				id: g.id,
				sector: g.sector,
				score: g.score,
			})),
			hubActive: this.hubActive,
			hubEnded: this.hubEnded,
			resultReported: this.resultReported,
			link: this.net.connected,
			music: this.settings.music,
			audio: {
				...this.audio.counts,
				state: this.audio.ctx?.state || "unstarted",
			},
			frameCount: this.frameCount,
			tuning: { ...this.cfg },
			recovered: !!this.graphicsRecovered,
			gpuLost: this.gpuLost || null,
			drawCalls: this.renderer.info.render.drawCalls,
		};
	}
	async renderProof() {
		const target = new THREE.RenderTarget(128, 72);
		const previous = this.renderer.getRenderTarget();
		this.renderer.setRenderTarget(target);
		this.renderer.render(this.scene, this.camera);
		this.renderer.setRenderTarget(previous);
		try {
			const data = await this.renderer.readRenderTargetPixelsAsync(
				target,
				0,
				0,
				128,
				72,
			);
			const colours = new Set();
			let dark = 0,
				bright = 0,
				sum = 0;
			for (let i = 0; i < data.length; i += 4) {
				colours.add((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]);
				const l = (data[i] + data[i + 1] + data[i + 2]) / 3;
				sum += l;
				if (l < 100) dark++;
				if (l > 180) bright++;
			}
			return {
				backend: this.backend,
				colours: colours.size,
				dark,
				bright,
				mean: sum / (data.length / 4),
				pixels: data.length / 4,
			};
		} finally {
			target.dispose();
		}
	}
	expose() {
		window.__STAR_RECLAIMERS__ = {
			snapshot: () => this.snapshot(),
			audioProof: () => this.audio.proof(),
			renderProof: () => this.renderProof(),
		};
		if (new URLSearchParams(location.search).has("test")) {
			Object.assign(window.__STAR_RECLAIMERS__, {
				start: () => this.start(),
				advance: (n) => {
					for (let i = 0; i < n; i++)
						if (this.state === "playing" && !this.ui.blocksSimulation())
							this.tick(1 / 60);
					this.updateCamera(1 / 60);
					this.ui.update(0.1);
					return this.snapshot();
				},
				ai: (value) => {
					this.ai = value;
				},
				invincible: (value) => {
					this.devInvincible = value;
				},
				aim: (id) => {
					const e = this.enemies.find((e) => e.id === id && e.alive);
					if (e) {
						this.target = e;
						const eu = new THREE.Euler().setFromQuaternion(
							new THREE.Quaternion().setFromUnitVectors(
								FORWARD,
								this.intercept(e),
							),
							"YXZ",
						);
						this.player.yaw = eu.y;
						this.player.pitch = eu.x;
					}
				},
				action: (name, value) => this.ui.command(name, value),
				idle: () => {
					this.lastActivity = performance.now() - 10001;
				},
				set: (key, value) => {
					if (key in this.cfg) this.cfg[key] = value;
				},
				position: (x, y, z) => {
					this.playerBody.setTranslation({ x, y, z }, true);
					this.player.pos.set(x, y, z);
				},
				refill: () => {
					this.player.hp = this.player.shield = this.player.energy = 100;
					this.player.nova = 3;
				},
				damage: (n) => this.hurt(n),
				clear: () => {
					for (const e of this.enemies)
						if (e.alive) this.damageEnemy(e, 100000);
				},
				connectLocal: () => this.net.local(),
				launchLinked: () => this.net.launch(),
				offer: () => this.net.offer(),
				answer: (code) => this.net.answer(code),
				link: (code) => this.net.finish(code),
				dev: () => this.ui.dev(),
				resources: (values) => {
					for (const key of ["hp", "shield", "energy", "nova"])
						if (Number.isFinite(values[key]))
							this.player[key] = THREE.MathUtils.clamp(
								values[key],
								0,
								key === "nova" ? 3 : 100,
							);
				},
				loseGraphics: () => this.renderer.backend.device?.destroy(),
			});
		}
	}
	registerInput() {
		const actions = {
			KeyC: "shield",
			KeyX: "nova",
			KeyF: "interact",
			KeyT: "target",
			KeyM: "chart",
			KeyJ: "jump",
			KeyV: "camera",
		};
		window.addEventListener("keydown", (e) => {
			if (this.hubEnded) return;
			const editing = ["TEXTAREA", "INPUT"].includes(e.target.tagName);
			if (editing && e.code !== "Escape") {
				this.activity("keyboard");
				return;
			}
			if (!this.activity("keyboard")) {
				e.preventDefault();
				return;
			}
			this.audio.init();
			if (e.repeat) {
				if (e.code.startsWith("Arrow")) this.ui.key(e.code);
				return;
			}
			if (e.code === "Escape") {
				e.preventDefault();
				this.ui.back();
				return;
			}
			if (this.ui.page || this.state === "title") {
				if (
					[
						"ArrowUp",
						"ArrowDown",
						"ArrowLeft",
						"ArrowRight",
						"Enter",
						"Space",
					].includes(e.code)
				) {
					e.preventDefault();
					this.ui.key(e.code);
				}
				return;
			}
			if (this.state !== "playing") return;
			if (actions[e.code]) {
				e.preventDefault();
				this.ui.command(actions[e.code]);
				return;
			}
			if (e.code === "Tab") {
				e.preventDefault();
				this.cycleTarget();
				return;
			}
			if (
				["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
					e.code,
				)
			)
				e.preventDefault();
			this.keys.add(e.code);
		});
		window.addEventListener("keyup", (e) => this.keys.delete(e.code));
		const canvas = document.getElementById("world");
		window.addEventListener("pointermove", (e) => {
			if (e.pointerType === "touch") return;
			if (Math.abs(e.movementX) + Math.abs(e.movementY) < 1) return;
			if (!this.activity("keyboard")) return;
			if (this.state === "playing" && !this.ui.page) {
				this.mouse.x = this.deadzone((e.clientX / innerWidth - 0.5) * 2, 0.055);
				this.mouse.y = this.deadzone(
					(e.clientY / innerHeight - 0.5) * 2,
					0.055,
				);
				this.mouse.active = true;
			}
		});
		window.addEventListener("pointerdown", (e) => {
			if (this.hubEnded) return;
			if (!this.activity(e.pointerType === "touch" ? "touch" : "keyboard")) {
				e.preventDefault();
				return;
			}
			this.audio.init();
			if (
				e.pointerType === "touch" &&
				this.state === "playing" &&
				!this.ui.page &&
				e.target === this.renderer?.domElement
			) {
				e.preventDefault();
				this.renderer.domElement.setPointerCapture(e.pointerId);
				const side = e.clientX < innerWidth / 2 ? "left" : "right";
				this.touch[side] = { id: e.pointerId, x: e.clientX, y: e.clientY };
				if (side === "right") {
					this.touch.x = 0;
					this.touch.y = 0;
				}
				return;
			}
			if (
				e.button === 0 &&
				this.state === "playing" &&
				!this.ui.page &&
				e.target === this.renderer?.domElement
			)
				this.mouse.fire = true;
		});
		canvas.style.touchAction = "none";
		window.addEventListener("pointermove", (e) => {
			if (e.pointerType !== "touch") return;
			const l = this.touch.left,
				r = this.touch.right;
			if (l?.id === e.pointerId) {
				this.touch.lx = THREE.MathUtils.clamp((e.clientX - l.x) / 65, -1, 1);
				this.touch.ly = THREE.MathUtils.clamp((l.y - e.clientY) / 65, -1, 1);
			}
			if (r?.id === e.pointerId) {
				this.touch.x = THREE.MathUtils.clamp((e.clientX - r.x) / 80, -1, 1);
				this.touch.y = THREE.MathUtils.clamp((e.clientY - r.y) / 80, -1, 1);
			}
		});
		const release = (e) => {
			if (e.pointerType === "touch") {
				if (this.touch.left?.id === e.pointerId) {
					this.touch.left = null;
					this.touch.lx = this.touch.ly = 0;
				}
				if (this.touch.right?.id === e.pointerId) {
					this.touch.right = null;
					this.touch.x = this.touch.y = 0;
				}
			} else this.mouse.fire = false;
		};
		window.addEventListener("pointerup", release);
		window.addEventListener("pointercancel", release);
		window.addEventListener(
			"wheel",
			(e) => {
				if (
					e.target === this.renderer?.domElement &&
					this.state === "playing" &&
					!this.ui.page
				) {
					e.preventDefault();
					this.activity("keyboard");
					this.player.throttle = THREE.MathUtils.clamp(
						this.player.throttle - e.deltaY * 0.0007,
						0,
						1,
					);
				}
			},
			{ passive: false },
		);
		document.addEventListener("pointerover", (e) => {
			const b = e.target.closest("button");
			if (b && !b.disabled) {
				b.focus({ preventScroll: true });
			}
		});
		window.addEventListener("blur", () => {
			this.keys.clear();
			this.mouse.fire = false;
			this.mouse.active = false;
			this.padInput = {};
			this.touch.lx = this.touch.ly = this.touch.x = this.touch.y = 0;
		});
		if (
			matchMedia("(pointer:coarse)").matches ||
			navigator.maxTouchPoints > 0
		) {
			document.body.classList.add("touch");
			this.inputMode = "touch";
		}
	}
	deadzone(x, d = 0.16) {
		return Math.abs(x) < d ? 0 : (Math.sign(x) * (Math.abs(x) - d)) / (1 - d);
	}
	pollPad(dt) {
		if (this.hubEnded) return;
		const pads = navigator.getGamepads?.() || [];
		const pad = [...pads].find((p) => p?.connected);
		if (!pad) {
			this.padInput = {};
			return;
		}
		const axes = pad.axes || [];
		const a = axes.map((x) => this.deadzone(x));
		const buttons = pad.buttons.map((b) =>
			typeof b === "number" ? b > 0.5 : b.pressed || b.value > 0.55,
		);
		const edge = (i) => buttons[i] && !this.padPrevious[i];
		const used =
			a.some((x) => Math.abs(x) > 0.2) ||
			buttons.some((x, i) => x && !this.padPrevious[i]);
		if (used && !this.activity("pad")) {
			this.padPrevious = buttons;
			this.padInput = {};
			return;
		}
		if (used) this.audio.init();
		this.padMenuTimer -= dt;
		if (this.ui.page || this.state === "title") {
			this.padInput = {};
			if (edge(0)) this.ui.activate();
			if (edge(1)) this.ui.back();
			if (edge(9) && !buttons[8]) this.ui.back();
			const dx =
				(buttons[15] ? 1 : 0) -
				(buttons[14] ? 1 : 0) +
				(a[0] > 0.55 ? 1 : a[0] < -0.55 ? -1 : 0);
			const dy =
				(buttons[13] ? 1 : 0) -
				(buttons[12] ? 1 : 0) +
				(a[1] > 0.55 ? 1 : a[1] < -0.55 ? -1 : 0);
			if ((dx || dy) && this.padMenuTimer <= 0) {
				this.ui.navigate(dx, dy);
				this.padMenuTimer = 0.19;
			}
		} else if (this.state === "playing") {
			this.padInput = {
				strafe: a[0] || 0,
				thrust: -(a[1] || 0),
				lookX: a[2] || 0,
				lookY: a[3] || 0,
				fire: buttons[7],
				boost: buttons[6],
			};
			const map = {
				0: "shield",
				1: "nova",
				2: "interact",
				3: "target",
				4: "chart",
				5: "jump",
				11: "camera",
			};
			for (const [i, cmd] of Object.entries(map))
				if (edge(Number(i))) this.ui.command(cmd);
			if (edge(9) && !buttons[8]) this.ui.pause();
		}
		this.padPrevious = buttons;
	}
}
