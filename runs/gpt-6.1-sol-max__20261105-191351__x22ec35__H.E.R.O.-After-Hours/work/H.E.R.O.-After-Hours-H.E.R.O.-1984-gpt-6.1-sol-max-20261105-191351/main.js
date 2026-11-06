import RAPIER from "@dimforge/rapier3d-compat";
import * as THREE from "three/webgpu";
import { Art } from "./art.js";
import { Sound } from "./audio.js";
import { DEFAULTS, LEVELS } from "./levels.js";
import { $, credits, UI } from "./ui.js";

const clamp = (n, a, b) => Math.max(a, Math.min(b, n)),
	lerp = (a, b, t) => a + (b - a) * t;
const colors = [0xf1bb59, 0x7edbd8, 0xb1cf77, 0xcfa1d4];
const emptyInput = () => ({
	x: 0,
	fly: false,
	fire: false,
	bomb: false,
	aimX: 1,
	aimY: 0,
	down: false,
});
function dist(a, b) {
	return Math.hypot(a.x - b.x, a.y - b.y);
}
function segmentCircle(x, y, dx, dy, len, cx, cy, r) {
	const t = clamp((cx - x) * dx + (cy - y) * dy, 0, len);
	return Math.hypot(x + dx * t - cx, y + dy * t - cy) < r ? t : null;
}
class Game {
	constructor() {
		this.levels = LEVELS;
		this.defaults = DEFAULTS;
		this.tuning = { ...DEFAULTS };
		this.settings = {
			master: 0.7,
			music: 0.1,
			effects: 0.8,
			glyphs: "ps",
			shake: 0.7,
		};
		try {
			Object.assign(
				this.settings,
				JSON.parse(localStorage.getItem("hero-hours-settings") || "{}"),
			);
			this.best = +localStorage.getItem("hero-hours-best") || 0;
		} catch {
			this.best = 0;
		}
		this.sound = new Sound(this.settings);
		this.art = new Art($("game"));
		this.ui = new UI(this);
		this.state = "loading";
		this.players = [];
		this.localPlayers = 1;
		this.totalRescued = 0;
		this.elapsed = 0;
		this.lives = 4;
		this.practice = false;
		this.levelIndex = 0;
		this.keys = new Set();
		this.inputKind = "keyboard";
		this.mouse = { x: 0, y: 0, down: false, aim: false };
		this.padsPrevious = {};
		this.idleAt = performance.now();
		this.attractMode = false;
		this.authority = true;
		this.hubActive = !!window.AIHub?.active;
		this.hubEnded = false;
		this.hubInfo = null;
		this.remoteInputs = new Map();
		this.lastNet = 0;
		this.netTick = 0;
		this.snapshotTick = 0;
		this.networkMessages = { sent: 0, received: 0 };
		this.lastReceived = -1;
		this.effectLog = [];
		this.effectSerial = 0;
		this.lastEffect = 0;
		this.fixed = 1 / 60;
		this.acc = 0;
		this.time = 0;
		this.lastFrame = 0;
		this.radioUntil = 0;
		this.toastUntil = 0;
		this.shake = 0;
		this.flash = 0;
		this.debris = [];
		this.testMode = new URLSearchParams(location.search).has("test");
		this.manual = false;
		this.touch = {
			active: false,
			points: new Map(),
			x: 0,
			fly: false,
			bomb: false,
		};
		if (
			navigator.maxTouchPoints > 0 &&
			matchMedia("(pointer:coarse)").matches
		) {
			this.enableTouch();
			this.inputKind = "touch";
		}
		this.bindInput();
		this.ui.prompts();
	}
	saveSettings() {
		try {
			localStorage.setItem(
				"hero-hours-settings",
				JSON.stringify(this.settings),
			);
		} catch {}
	}
	async init() {
		$("load-status").textContent = "Assembling the prop-pack · Three.js r180";
		await Promise.all([RAPIER.init(), this.art.init()]);
		$("load-status").textContent = "Checking the mineshafts · Rapier 0.19.3";
		this.ui.prompts();
		if (this.hubActive) {
			await this.connectHub();
		} else this.title();
		$("loading").classList.add("hidden");
		this.lastFrame = performance.now();
		requestAnimationFrame((t) => this.frame(t));
		this.ready = true;
		document.body.dataset.ready = "true";
	}
	title() {
		this.attractMode = false;
		this.hubEnded = false;
		this.state = "title";
		this.localPlayers = 1;
		this.totalRescued = 0;
		this.elapsed = 0;
		this.lives = 4;
		this.practice = false;
		this.tuning = { ...DEFAULTS };
		this.loadLevel(0, true);
		const p = this.players[0];
		p.x = 18;
		p.y = 3.9;
		p.body.setTranslation({ x: p.x, y: p.y, z: 0 }, true);
		p.art.g.position.set(p.x, p.y + 0.12, 0);
		p.fly = true;
		p.invuln = 0;
		p.art.g.scale.setScalar(1.65);
		this.titleMiner = this.art.miner(25, -0.6, "Night shift");
		this.idleAt = performance.now();
		$("hud").classList.add("hidden");
		$("attract").classList.add("hidden");
		$("coop-note").classList.add("hidden");
		$("darkness").style.opacity = 0;
		this.ui.show("title");
		this.art.cameraAt(13.2, 1.6, 1, true);
	}
	start(count = 1, attract = false) {
		if (this.hubActive && !attract) return;
		this.attractMode = attract;
		this.localPlayers = count;
		this.elapsed = 0;
		this.totalRescued = 0;
		this.lives = 4;
		this.practice = attract;
		this.tuning = { ...DEFAULTS };
		for (const p of this.players) p.score = 0;
		this.loadLevel(0);
		this.state = "playing";
		this.ui.hide();
		$("hud").classList.remove("hidden");
		$("attract").classList.toggle("hidden", !attract);
		$("coop-note").classList.toggle("hidden", count < 2);
		this.sound.unlock();
		this.radio("A miner is missing. My propeller isn’t. Splendid.");
		if (this.touch.active) {
			$("touch-hint").classList.remove("hidden");
			this.touchHintUntil = performance.now() + 6500;
		}
	}
	createSolid(x, y, w, h, body = null) {
		const d = RAPIER.ColliderDesc.cuboid(w / 2, h / 2, 1.4);
		if (!body) d.setTranslation(x, y, 0);
		const c = this.world.createCollider(d, body || undefined);
		return c;
	}
	loadLevel(index, preview = false) {
		const carry = this.players.map((p) => ({
			id: p.id,
			name: p.name,
			score: p.score,
			health: p.health,
		}));
		if (this.world) this.world.free();
		this.world = new RAPIER.World({ x: 0, y: -this.tuning.gravity, z: 0 });
		this.world.timestep = this.fixed;
		this.levelIndex = index;
		this.level = LEVELS[index];
		this.art.build(this.level, index);
		this.players = [];
		this.walls = [];
		this.enemies = [];
		this.miners = [];
		this.lamps = [];
		this.pickups = [];
		this.bombs = [];
		this.gates = [];
		this.rafts = [];
		this.tentacles = [];
		this.debris = [];
		this.solids = [];
		this.levelTime = 0;
		this.levelRescued = 0;
		this.intermission = 0;
		this.aiStage = 0;
		this.aiHold = 0;
		this.lastDark = false;
		this.lastWallHint = -1;
		const L = this.level;
		this.solids.push(
			this.createSolid(L.width / 2, L.bottom - 1, L.width + 3, 2),
			this.createSolid(-1, (L.bottom + 10) / 2, 2, 10 - L.bottom),
			this.createSolid(L.width + 1, (L.bottom + 10) / 2, 2, 10 - L.bottom),
			this.createSolid(L.width / 2, 11, L.width + 4, 2),
		);
		for (const s of L.platforms) this.solids.push(this.createSolid(...s));
		L.walls.forEach((s, id) =>
			this.walls.push({
				id,
				x: s[0],
				y: s[1],
				w: s[2],
				h: s[3],
				health: 14,
				alive: true,
				c: this.createSolid(...s),
				m: this.art.wall(...s),
			}),
		);
		L.miners.forEach(([x, y, name], id) =>
			this.miners.push({
				id,
				x,
				y,
				name,
				rescued: false,
				progress: 0,
				by: -1,
				balloon: 0,
				art: this.art.miner(x, y, name),
			}),
		);
		L.enemies.forEach(([kind, x, y, range], id) => {
			const art = this.art.enemy(kind, x, y);
			this.enemies.push({
				id,
				kind,
				x,
				y,
				bx: x,
				by: y,
				range,
				alive: true,
				phase: id * 1.7,
				art,
			});
			if (kind === "spider")
				this.art.line(
					[
						[x, y + 2.2, -0.1],
						[x, y, -0.1],
					],
					0x8b9d9e,
					art.g,
				);
		});
		L.lamps.forEach(([x, y], id) =>
			this.lamps.push({ id, x, y, alive: true, art: this.art.lamp(x, y) }),
		);
		L.pickups.forEach(([x, y, type], id) =>
			this.pickups.push({
				id,
				x,
				y,
				type,
				taken: false,
				m: this.art.pickup(x, y, type),
			}),
		);
		for (const r of L.lava) this.art.lava(...r);
		for (const r of L.hot) {
			this.art.lava(...r, true);
			this.solids.push(this.createSolid(...r));
		}
		L.gates.forEach(([x, y, w, h, range], id) => {
			const body = this.world.createRigidBody(
				RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x, y, 0),
			);
			const c = this.createSolid(0, 0, w, h, body),
				g = new THREE.Group();
			this.art.root.add(g);
			this.art.box(0, 0, 0, w, h, 2.4, 0x737b79, g);
			for (let j = -h / 2 + 0.3; j < h / 2; j += 0.6) {
				const stripe = this.art.box(0, j, 1.25, w, 0.2, 0.1, 0xe8ae5a, g);
				stripe.rotation.z = 0.12;
			}
			this.art.box(x, y + range + 2, -1.1, w + 0.5, 0.65, 0.9, 0x3d535b);
			this.art.text(
				"CAUTION",
				x,
				y + range + 2.8,
				0.2,
				0.4,
				"#e4ae68",
				this.art.root,
				3,
			);
			this.gates.push({ id, x, y, baseY: y, w, h, range, body, c, g, oldY: y });
		});
		L.rafts.forEach(([x, y, w, h, range], id) => {
			const body = this.world.createRigidBody(
					RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x, y, 0),
				),
				c = this.createSolid(0, 0, w, h * 0.38, body),
				g = new THREE.Group();
			this.art.root.add(g);
			this.art.box(0, 0, 0, w, h * 0.38, 2, 0x5e9290, g);
			for (let i = -w / 2 + 0.35; i < w / 2; i += 0.5)
				this.art.box(i, 0.28, 0.1, 0.42, 0.13, 2.1, 0xc7a46f, g);
			this.art.text("HEAT PROOF", 0, -0.01, 1.07, 0.32, "#ffe4a3", g, w - 0.3);
			this.rafts.push({ id, x, y, bx: x, w, h, range, body, c, g, dx: 0 });
		});
		L.tentacles.forEach(([x, y, h], id) => {
			const g = new THREE.Group();
			this.art.root.add(g);
			const segments = [];
			for (let j = 0; j < 8; j++)
				segments.push(
					this.art.sphere(0, (j * h) / 8, 0, 0.32 - j * 0.022, 0xae6487, g, 0),
				);
			this.art.text("!", 0, h + 0.4, 0, 0.7, "#ffc77b", g, 0.6);
			this.tentacles.push({ id, x, y, bx: x, h, g, segments });
		});
		let seats =
			this.hubInfo?.players ||
			Array.from({ length: this.localPlayers }, (_, id) => ({
				id,
				name: id === 0 ? "Pip" : "Colleague",
			}));
		for (const seat of seats) {
			if (this.departed?.has(seat.id)) continue;
			const old = carry.find((p) => p.id === seat.id);
			this.createPlayer(seat.id, seat.name, old && !preview ? old.score : 0);
		}
		this.state = preview ? "title" : "playing";
		this.ui.hide();
		$("hud").classList.toggle("hidden", preview);
		$("touch-pop").classList.add("hidden");
		this.world.step();
		this.updateHUD();
		if (!preview) this.radio(L.sub);
	}
	createPlayer(id, name, score = 0) {
		const x = this.level.spawn[0] + id * 1.25,
			y = this.level.spawn[1];
		const body = this.world.createRigidBody(
			RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x, y, 0),
		);
		const collider = this.world.createCollider(
				RAPIER.ColliderDesc.capsule(0.55, 0.32).setFriction(0.2),
				body,
			),
			controller = this.world.createCharacterController(0.02);
		controller.setUp({ x: 0, y: 1, z: 0 });
		controller.setSlideEnabled(true);
		controller.enableSnapToGround(0.12);
		controller.setApplyImpulsesToDynamicBodies(true);
		const p = {
			id,
			name,
			body,
			collider,
			controller,
			x,
			y,
			vx: 0,
			vy: 0,
			face: 1,
			fly: false,
			grounded: false,
			health: 3,
			energy: 100,
			bombs: 6,
			score,
			invuln: 1.5,
			fireCD: 0,
			bombCD: 0,
			rescue: 0,
			checkpoint: [x, y],
			art: this.art.hero(colors[id % 4], id),
			input: emptyInput(),
			out: false,
		};
		this.players.push(p);
		return p;
	}
	nextLevel() {
		if (this.hubActive && !this.authority) return;
		if (this.levelIndex === LEVELS.length - 1) {
			this.finish(true);
			return;
		}
		this.loadLevel(this.levelIndex + 1);
		this.state = "playing";
		this.ui.hide();
	}
	totalScore() {
		return this.players.reduce((s, p) => s + p.score, 0);
	}
	myPlayer() {
		if (this.hubInfo?.server) return null;
		return (
			this.players.find(
				(p) => p.id === (this.hubActive ? this.hubInfo?.me : 0),
			) || this.players[0]
		);
	}
	radio(text) {
		this.radioUntil = performance.now() + 6500;
		$("radio-line").textContent = text;
		$("radio").classList.add("shown");
		if (!this.attractMode) this.sound.voice(this.levelIndex);
	}
	toast(text) {
		$("toast").textContent = text;
		$("toast").classList.remove("hidden");
		this.toastUntil = performance.now() + 2100;
	}
	pause() {
		if (this.hubEnded) return;
		if (this.attractMode) {
			this.title();
			return;
		}
		if (
			this.ui.page === "game" &&
			(this.state === "playing" || this.state === "intermission")
		) {
			if (!this.hubActive) {
				this.beforePause = this.state;
				this.state = "paused";
			}
			this.ui.origin = "pause";
			this.ui.show("pause");
			this.keys.clear();
			this.mouse.down = false;
		} else if (this.ui.page === "pause") this.resume();
	}
	resume() {
		if (this.state === "paused") this.state = this.beforePause || "playing";
		this.ui.hide();
	}
	refill() {
		for (const p of this.players) {
			p.energy = 100;
			p.health = 3;
			p.bombs = 6;
			p.invuln = 2;
		}
	}
	forceRescue() {
		for (const m of this.miners)
			if (!m.rescued) this.rescue(m, this.myPlayer());
	}
	damage(p, amount = 1, reason = "Careful. The equipment is rented.") {
		if (this.tuning.invincible || this.attractMode || p.invuln > 0 || p.out)
			return false;
		p.health -= amount;
		p.invuln = 1.8;
		this.shake = 0.35;
		this.sound.play("hit");
		this.flash = 0.35;
		this.radio(reason);
		if (p.health <= 0) {
			this.lives--;
			p.health = 3;
			p.energy = 100;
			p.bombs = Math.max(p.bombs, 3);
			p.x = p.checkpoint[0];
			p.y = p.checkpoint[1] + 0.2;
			p.vx = 0;
			p.vy = 0;
			p.body.setTranslation({ x: p.x, y: p.y, z: 0 }, true);
			p.invuln = 3;
			if (this.lives <= 0) this.finish(false);
		}
		return true;
	}
	plant(p) {
		if (p.bombCD > 0) return;
		if (p.bombs <= 0) {
			this.toast("No dynamite. Hold the laser to melt a wall.");
			p.bombCD = 0.5;
			return;
		}
		p.bombs--;
		p.bombCD = 0.5;
		const x = p.x + p.face * 0.45,
			y = p.y - 0.55;
		const m = this.art.bomb(x, y);
		this.bombs.push({
			id: this.netTick++,
			x,
			y,
			vy: 0,
			t: this.tuning.fuse,
			owner: p.id,
			m,
			lastTick: Math.ceil(this.tuning.fuse * 4),
			ring: null,
		});
		const ring = new THREE.Mesh(
			new THREE.RingGeometry(this.tuning.blast - 0.06, this.tuning.blast, 64),
			new THREE.MeshBasicMaterial({
				color: 0xffbe63,
				transparent: true,
				opacity: 0.32,
				depthWrite: false,
			}),
		);
		ring.position.set(x, y, 0.2);
		this.art.fx.add(ring);
		this.bombs[this.bombs.length - 1].ring = ring;
		this.sound.play("bomb");
	}
	breakWall(w, owner, explosive = false) {
		if (!w.alive) return;
		w.alive = false;
		w.m.visible = false;
		this.world.removeCollider(w.c, true);
		this.art.burst(w.x, w.y, 0xc29a6c, 30, 1.4);
		this.players.find((p) => p.id === owner) &&
			(this.players.find((p) => p.id === owner).score += explosive ? 150 : 75);
		this.sound.play("blast");
		this.shake = 0.22;
		for (let i = 0; i < 5; i++) {
			const b = this.world.createRigidBody(
				RAPIER.RigidBodyDesc.dynamic()
					.setTranslation(w.x, w.y + (i - 2) * 0.4, 0.3)
					.setLinvel((Math.random() - 0.5) * 5, Math.random() * 6, 0)
					.setLinearDamping(0.5)
					.lockTranslations(),
			);
			b.setEnabledTranslations(true, true, false, true);
			const c = this.world.createCollider(
				RAPIER.ColliderDesc.cuboid(0.12, 0.12, 0.12).setRestitution(0.3),
				b,
			);
			const m = this.art.box(
				w.x,
				w.y,
				0,
				0.24,
				0.24,
				0.24,
				0xb6916d,
				this.art.fx,
			);
			this.debris.push({ b, c, m, t: 3 });
		}
	}
	explode(b) {
		const r = this.tuning.blast;
		this.art.burst(b.x, b.y, 0xffb557, 46, 1.6);
		this.art.popup("KRA-KOOM!", b.x, b.y + 1.3, "#ffda8b");
		this.shake = 0.7;
		this.flash = 0.17;
		this.sound.play("blast");
		this.emitEffect(["blast", b.x, b.y]);
		for (const w of this.walls)
			if (
				w.alive &&
				Math.hypot(
					Math.max(0, Math.abs(w.x - b.x) - w.w / 2),
					Math.max(0, Math.abs(w.y - b.y) - w.h / 2),
				) < r
			)
				this.breakWall(w, b.owner, true);
		for (const e of this.enemies)
			if (e.alive && Math.hypot(e.x - b.x, e.y - b.y) < r)
				this.kill(e, b.owner);
		for (const p of this.players)
			if (Math.hypot(p.x - b.x, p.y - b.y) < r)
				this.damage(
					p,
					2,
					"One must admire dynamite from a respectful distance.",
				);
		for (const l of this.lamps)
			if (l.alive && Math.hypot(l.x - b.x, l.y - b.y) < r * 0.7)
				this.breakLamp(l);
		b.m.removeFromParent();
		b.ring?.removeFromParent();
		b.ring?.geometry.dispose();
		b.ring?.material.dispose();
	}
	kill(e, owner) {
		if (!e.alive) return;
		e.alive = false;
		e.art.g.visible = false;
		this.art.burst(e.x, e.y, 0xd7b8c9, 12);
		const p = this.players.find((p) => p.id === owner);
		if (p) p.score += 75;
		this.art.popup("+75", e.x, e.y + 0.5, "#b5e5c9");
	}
	breakLamp(l) {
		l.alive = false;
		l.art.light.intensity = 0;
		l.art.bulb.material = this.art.mat(0x4e514e);
		this.art.burst(l.x, l.y, 0xffd88b, 10);
		this.sound.play("lamp");
		this.radio("Ah. The lamp was on our side.");
	}
	laser(p, input) {
		if (p.fireCD > 0 || p.energy <= 0) return;
		p.fireCD = 0.14;
		if (!this.tuning.invincible && !this.attractMode)
			p.energy = Math.max(0, p.energy - 0.13);
		let dx = input.aimX || p.face,
			dy = input.aimY || 0;
		const mag = Math.hypot(dx, dy);
		dx /= mag;
		dy /= mag;
		p.face = dx < -0.1 ? -1 : dx > 0.1 ? 1 : p.face;
		const x = p.x + dx * 0.48,
			y = p.y + 0.72,
			range = 14;
		const ray = new RAPIER.Ray({ x, y, z: 0 }, { x: dx, y: dy, z: 0 });
		const hit = this.world.castRay(
			ray,
			range,
			true,
			RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
			undefined,
			p.collider,
			p.body,
			(c) => !this.players.some((pp) => pp.collider.handle === c.handle),
		);
		let len = hit ? hit.timeOfImpact : range,
			kind = null,
			target = null;
		for (const e of this.enemies) {
			if (!e.alive) continue;
			const t = segmentCircle(x, y, dx, dy, len, e.x, e.y, 0.65);
			if (t !== null && t < len) {
				len = t;
				kind = "enemy";
				target = e;
			}
		}
		for (const l of this.lamps) {
			if (!l.alive) continue;
			const t = segmentCircle(x, y, dx, dy, len, l.x, l.y, 0.42);
			if (t !== null && t < len) {
				len = t;
				kind = "lamp";
				target = l;
			}
		}
		if (kind === "enemy") this.kill(target, p.id);
		else if (kind === "lamp") this.breakLamp(target);
		else if (hit) {
			const w = this.walls.find(
				(w) => w.alive && w.c.handle === hit.collider.handle,
			);
			if (w) {
				w.health -= 1 + (3 - clamp(len, 0, 3)) * 0.35;
				this.art.burst(x + dx * len, y + dy * len, 0xffd77b, 3);
				w.m.scale.x = 1 + Math.sin(this.time * 70) * 0.035;
				if (w.health <= 0) this.breakWall(w, p.id);
			}
		}
		this.art.beam(x, y, dx, dy, Math.max(0.15, len), colors[p.id % 4]);
		this.sound.play("laser");
		this.emitEffect(["laser", x, y, dx, dy, Math.max(0.15, len), p.id]);
	}
	rescue(m, p) {
		if (m.rescued || !p) return;
		m.rescued = true;
		m.art.help.visible = false;
		m.progress = 1;
		m.by = p.id;
		m.balloon = 0.01;
		this.levelRescued++;
		this.totalRescued++;
		const bonus = 1000 + Math.floor(p.energy) * 5 + p.bombs * 50;
		p.score += bonus;
		p.energy = Math.min(100, p.energy + 28);
		p.bombs = Math.min(6, p.bombs + 1);
		for (const pilot of this.players) pilot.checkpoint = [m.x, m.y + 0.2];
		this.art.popup("RESCUED! +" + bonus, m.x, m.y + 2, "#a6efc6");
		this.art.burst(m.x, m.y + 1, 0x8be3b7, 28);
		this.sound.play("rescue");
		this.radio(m.name + " secured. An excellent choice of rescuer.");
		const balloon = this.art.sphere(0, 3, -0.1, 0.9, 0xe8bb61, m.art.g, 1);
		balloon.scale.y = 1.2;
		this.art.line(
			[
				[-0.3, 0.8, 0],
				[-0.5, 2.5, 0],
			],
			0xe7d3a4,
			m.art.g,
		);
		this.art.line(
			[
				[0.3, 0.8, 0],
				[0.5, 2.5, 0],
			],
			0xe7d3a4,
			m.art.g,
		);
		if (this.levelRescued === this.miners.length) {
			this.state = "intermission";
			this.intermission = 0;
			for (const pp of this.players) pp.score += Math.floor(pp.energy) * 2;
			this.ui.show("debrief");
		}
	}
	finish(win) {
		if (this.hubEnded || this.state === "victory" || this.state === "gameover")
			return;
		this.state = win ? "victory" : "gameover";
		if (!this.practice && !this.hubActive) {
			this.best = Math.max(this.best, this.totalScore());
			try {
				localStorage.setItem("hero-hours-best", String(this.best));
			} catch {}
		}
		this.sound.play(win ? "win" : "hit");
		this.ui.show(this.state);
		this.finishClock = 0;
		if (this.hubActive && this.authority) this.reportHub(win);
	}
	getInput(p) {
		if (this.attractMode) return this.aiInput(p);
		if (this.hubActive && p.id !== this.hubInfo.me)
			return this.remoteInputs.get(p.id) || emptyInput();
		if (this.ui.page !== "game" || this.hubEnded) return emptyInput();
		const i = emptyInput(),
			pad = this.padStates?.[this.hubActive ? 0 : p.id];
		if (pad) Object.assign(i, pad);
		if (!this.hubActive && p.id === 1) {
			i.x = Number(this.keys.has("KeyL")) - Number(this.keys.has("KeyJ"));
			i.fly = this.keys.has("KeyI");
			i.fire = this.keys.has("KeyN");
			i.bomb = this.p2Bomb;
			i.down = this.keys.has("KeyK");
			this.p2Bomb = false;
			if (pad) {
				i.x = pad.x || i.x;
				i.fly = pad.fly || i.fly;
				i.fire = pad.fire || i.fire;
				i.bomb = pad.bomb || i.bomb;
				i.aimX = pad.aimX;
				i.aimY = pad.aimY;
			}
		} else {
			const kx =
				Number(this.keys.has("KeyD") || this.keys.has("ArrowRight")) -
				Number(this.keys.has("KeyA") || this.keys.has("ArrowLeft"));
			i.x = kx || i.x;
			i.fly =
				i.fly ||
				this.keys.has("Space") ||
				this.keys.has("KeyW") ||
				this.keys.has("ArrowUp");
			i.down = this.keys.has("KeyS") || this.keys.has("ArrowDown");
			i.fire =
				i.fire ||
				(this.localPlayers === 1 && this.keys.has("KeyJ")) ||
				this.keys.has("KeyF") ||
				this.mouse.down;
			i.bomb = i.bomb || this.keyBomb;
			this.keyBomb = false;
			if (this.mouse.aim) {
				const point = this.art.unproject(this.mouse.x, this.mouse.y);
				const dx = point.x - p.x,
					dy = point.y - (p.y + 0.72),
					len = Math.hypot(dx, dy);
				if (len > 0.3) {
					i.aimX = dx / len;
					i.aimY = dy / len;
				}
			} else if (!pad || !pad.aiming) {
				i.aimX = kx || p.face;
				i.aimY = 0;
			}
			if (this.touch.active) {
				i.x = this.touch.x;
				i.fly = this.touch.fly;
				i.bomb = i.bomb || this.touch.bomb;
				this.touch.bomb = false;
				const e = this.enemies
					.filter((e) => e.alive && Math.abs(e.x - p.x) < 12)
					.sort((a, b) => dist(a, p) - dist(b, p))[0];
				if (e) {
					const d = Math.hypot(e.x - p.x, e.y - p.y - 0.72);
					i.aimX = (e.x - p.x) / d;
					i.aimY = (e.y - p.y - 0.72) / d;
					i.fire = true;
				} else {
					const w = this.walls.find(
						(w) =>
							w.alive &&
							Math.abs(w.x - p.x) < 4 &&
							Math.abs(w.y - p.y) < w.h / 2,
					);
					if (w) {
						i.aimX = Math.sign(w.x - p.x);
						i.aimY = 0;
						i.fire = true;
					}
				}
			}
		}
		if (Math.abs(i.aimX) + Math.abs(i.aimY) < 0.1) i.aimX = p.face;
		return i;
	}
	movePlayer(p, i, dt) {
		p.input = i;
		p.invuln = Math.max(0, p.invuln - dt);
		p.fireCD = Math.max(0, p.fireCD - dt);
		p.bombCD = Math.max(0, p.bombCD - dt);
		p.fly = !!i.fly && p.energy > 0;
		const target = clamp(i.x, -1, 1) * this.tuning.speed;
		p.vx = lerp(p.vx, target, Math.min(1, dt * (p.grounded ? 15 : 8)));
		if (Math.abs(i.x) > 0.12) p.face = i.x < 0 ? -1 : 1;
		p.vy -= this.tuning.gravity * dt;
		if (p.fly) p.vy += this.tuning.lift * dt * 2.05;
		p.vy = clamp(p.vy, -12, 7.2);
		if (i.down) p.vy = Math.max(-12, p.vy - 15 * dt);
		const noclip = this.tuning.noclip || this.attractMode;
		let dx = p.vx * dt,
			dy = p.vy * dt;
		if (noclip && this.attractMode) {
			dx = i.directX * dt;
			dy = i.directY * dt;
			p.vx = i.directX;
			p.vy = i.directY;
		} else if (noclip) {
			dy = (Number(i.fly) - Number(i.down)) * this.tuning.speed * dt;
		}
		if (!noclip) {
			for (const raft of this.rafts) {
				if (
					Math.abs(p.x - raft.x) < raft.w / 2 + 0.2 &&
					Math.abs(p.y - 0.87 - (raft.y + raft.h * 0.19)) < 0.25 &&
					!p.fly
				)
					dx += raft.dx;
			}
			p.controller.computeColliderMovement(
				p.collider,
				{ x: dx, y: dy, z: 0 },
				RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
				undefined,
				(c) => !this.players.some((q) => q.collider.handle === c.handle),
			);
			const mov = p.controller.computedMovement();
			dx = mov.x;
			dy = mov.y;
			p.grounded = p.controller.computedGrounded();
			if (p.grounded && p.vy < 0) p.vy = 0;
			if (dy <= 0.00001 && p.vy > 0 && !p.grounded) p.vy = 0;
		}
		p.x = clamp(p.x + dx, 0.38, this.level.width - 0.38);
		p.y = clamp(p.y + dy, this.level.bottom + 0.9, 8.85);
		p.body.setNextKinematicTranslation({ x: p.x, y: p.y, z: 0 });
		if (!this.attractMode && !this.tuning.invincible) {
			p.energy = Math.max(
				0,
				p.energy - dt * this.tuning.drain * (p.fly ? 1.75 : 1),
			);
			if (p.energy === 0) {
				this.damage(
					p,
					3,
					"Out of power. A strategic return to the last rescue.",
				);
				p.energy = 100;
			}
		}
		if (this.attractMode) {
			p.energy = 100;
			p.bombs = 6;
			p.health = 3;
		}
		if (i.fire) this.laser(p, i);
		if (i.bomb) this.plant(p);
		if (!noclip) {
			for (const e of this.enemies)
				if (e.alive && Math.hypot(p.x - e.x, p.y - e.y) < 1)
					this.damage(p, 1, "Vermin. Quite unreasonable working conditions.");
			for (const r of [...this.level.lava, ...this.level.hot]) {
				const [x, y, w, h] = r;
				const feet = p.y - 0.8;
				const raftSafe = this.rafts.some(
					(f) =>
						Math.abs(p.x - f.x) < f.w / 2 + 0.12 &&
						feet > f.y + f.h * 0.16 - 0.18,
				);
				if (
					!raftSafe &&
					p.x > x - w / 2 - 0.15 &&
					p.x < x + w / 2 + 0.15 &&
					p.y + 0.65 > y - h / 2 &&
					feet < y + h / 2
				)
					this.damage(p, 3, "Hot rock. The name rather gives it away.");
			}
			for (const t of this.tentacles) {
				const top =
					t.y + t.h * (0.65 + 0.35 * Math.sin(this.levelTime * 1.4 + t.id));
				if (Math.abs(p.x - t.x) < 0.7 && p.y - 0.8 < top && p.y > t.y)
					this.damage(
						p,
						2,
						"The tentacle has declined my invitation to leave.",
					);
			}
			for (const g of this.gates)
				if (
					Math.abs(p.x - g.x) < g.w / 2 + 0.22 &&
					Math.abs(p.y - g.y) < g.h / 2 + 0.55 &&
					g.y < g.oldY - 0.005
				)
					this.damage(
						p,
						3,
						"Do not stand beneath the enormous crushing machine.",
					);
		}
		for (const l of this.lamps)
			if (l.alive && Math.hypot(p.x - l.x, p.y - l.y) < 0.7) this.breakLamp(l);
		for (const item of this.pickups)
			if (!item.taken && Math.hypot(p.x - item.x, p.y - item.y) < 1.1) {
				item.taken = true;
				item.m.visible = false;
				if (item.type === "cell") p.energy = Math.min(100, p.energy + 40);
				if (item.type === "med") p.health = 3;
				p.score += item.type === "gem" ? 250 : 100;
				this.art.burst(item.x, item.y, 0xb5e5c9, 12);
				this.art.popup(
					item.type === "cell"
						? "+40 POWER"
						: item.type === "med"
							? "PATCHED UP"
							: "+250",
					item.x,
					item.y + 1,
					"#b7edc6",
				);
				this.sound.play("pickup");
			}
		for (const m of this.miners) {
			if (m.rescued) continue;
			if (Math.hypot(p.x - m.x, p.y - m.y) < 1.55) {
				m.progress += dt * 1.55;
				p.rescue = m.progress;
				if (m.progress >= 1) this.rescue(m, p);
			} else if (
				!this.players.some(
					(q) => q.id !== p.id && Math.hypot(q.x - m.x, q.y - m.y) < 1.55,
				)
			) {
				m.progress = Math.max(0, m.progress - dt * 2);
			}
		}
	}
	tick(dt) {
		if (this.hubEnded) return;
		this.time += dt;
		if (this.state === "victory" || this.state === "gameover") {
			if (this.attractMode && (this.finishClock += dt) > 5) this.start(1, true);
			return;
		}
		if (this.state === "intermission") {
			this.intermission += dt;
			if (
				(this.attractMode || this.hubActive) &&
				this.authority &&
				this.intermission > 3.6
			)
				this.nextLevel();
			return;
		}
		if (this.state !== "playing" || (this.hubActive && window.AIHub.time() < 0))
			return;
		if (!this.authority) return;
		this.elapsed += dt;
		this.levelTime += dt;
		this.world.gravity = { x: 0, y: -this.tuning.gravity, z: 0 };
		for (const g of this.gates) {
			g.oldY = g.y;
			g.y = g.baseY + Math.sin(this.levelTime * 1.15 + g.id) * g.range;
			g.body.setNextKinematicTranslation({ x: g.x, y: g.y, z: 0 });
			g.g.position.set(g.x, g.y, 0);
		}
		for (const f of this.rafts) {
			const old = f.x;
			f.x = f.bx + (0.5 - 0.5 * Math.cos(this.levelTime * 0.32)) * f.range;
			f.dx = f.x - old;
			f.body.setNextKinematicTranslation({ x: f.x, y: f.y, z: 0 });
			f.g.position.set(f.x, f.y, 0);
		}
		for (const t of this.tentacles) {
			const nearest = this.players.reduce(
				(a, b) => (Math.abs(a.x - t.x) < Math.abs(b.x - t.x) ? a : b),
				this.players[0],
			);
			if (nearest)
				t.x = lerp(t.x, clamp(nearest.x, t.bx - 2.4, t.bx + 2.4), dt * 0.45);
			t.g.position.set(t.x, t.y, 0);
			for (let j = 0; j < t.segments.length; j++) {
				t.segments[j].position.y =
					((j * t.h) / 8) * (0.7 + 0.3 * Math.sin(this.levelTime * 1.4 + t.id));
				t.segments[j].position.x =
					Math.sin(this.levelTime * 2 + j * 0.5) * 0.17;
			}
		}
		for (const e of this.enemies) {
			if (!e.alive) continue;
			const t = this.levelTime * this.tuning.enemy;
			if (e.kind === "bat") {
				e.x = e.bx + Math.sin(t * 1.1 + e.phase) * e.range;
				e.y = e.by + Math.sin(t * 1.7 + e.phase) * 0.75;
			}
			if (e.kind === "moth") {
				e.x = e.bx + Math.sin(t * 0.8 + e.phase) * e.range;
				e.y = e.by + Math.cos(t * 1.6 + e.phase) * 1.2;
			}
			if (e.kind === "spider") {
				e.x = e.bx + Math.sin(t * 0.7) * 0.25;
				e.y = e.by - Math.max(0, Math.sin(t * 1.35 + e.phase)) * e.range;
			}
			if (e.kind === "snake") {
				e.x = e.bx + Math.sin(t * 0.8 + e.phase) * e.range;
				e.y = e.by + Math.abs(Math.sin(t * 2.5)) * 0.18;
			}
			e.art.g.position.set(e.x, e.y, 0);
		}
		for (const p of this.players) {
			if (p.out) continue;
			const i = this.getInput(p);
			this.movePlayer(p, i, dt);
		}
		for (let j = this.bombs.length - 1; j >= 0; j--) {
			const b = this.bombs[j];
			b.t -= dt;
			b.vy -= this.tuning.gravity * dt;
			const ray = new RAPIER.Ray(
				{ x: b.x, y: b.y, z: 0.1 },
				{ x: 0, y: -1, z: 0 },
			);
			const hit = this.world.castRay(
				ray,
				0.36 + Math.abs(b.vy) * dt,
				true,
				RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
				undefined,
				undefined,
				undefined,
				(c) => !this.players.some((p) => p.collider.handle === c.handle),
			);
			if (hit && b.vy < 0) {
				b.y -= Math.max(0, hit.timeOfImpact - 0.25);
				b.vy = 0;
			} else b.y += b.vy * dt;
			b.m.position.set(b.x, b.y, 0.5);
			b.ring.position.y = b.y;
			b.ring.material.opacity =
				0.15 + Math.abs(Math.sin(this.time * 15)) * 0.25;
			const q = Math.ceil(b.t * 4);
			if (q !== b.lastTick) {
				b.lastTick = q;
				this.sound.play("tick");
			}
			if (b.t <= 0) {
				this.explode(b);
				this.bombs.splice(j, 1);
			}
		}
		this.world.step();
		for (let j = this.debris.length - 1; j >= 0; j--) {
			const d = this.debris[j];
			d.t -= dt;
			if (d.t <= 0) {
				this.world.removeRigidBody(d.b);
				d.m.removeFromParent();
				this.debris.splice(j, 1);
			} else {
				const t = d.b.translation(),
					q = d.b.rotation();
				d.m.position.set(t.x, t.y, t.z);
				d.m.quaternion.set(q.x, q.y, q.z, q.w);
			}
		}
	}
	aiInput(p) {
		const route = this.level.script,
			s = route[Math.min(this.aiStage, route.length - 1)],
			i = emptyInput();
		i.fire = true;
		i.fly = true;
		let tx = s[0],
			ty = s[1];
		const dx = tx - p.x,
			dy = ty - p.y,
			d = Math.hypot(dx, dy);
		i.x = Math.sign(dx);
		i.aimX = p.face;
		i.aimY = 0;
		if (d < 0.35) {
			this.aiHold += this.fixed;
			if (s[2] === "bomb" && this.aiHold < this.fixed * 2) {
				i.bomb = true;
			}
			const hold = s[2] === "wait" ? 1.9 : s[2] === "raft" ? 3 : 1.1;
			if (this.aiHold > hold) {
				this.aiStage++;
				this.aiHold = 0;
			}
		} else this.aiHold = 0;
		const speed = s[2] === "raft" ? 2 : 5;
		i.directX = d > 0.12 ? (dx / d) * Math.min(speed, d * 4) : 0;
		i.directY = d > 0.12 ? (dy / d) * Math.min(speed, d * 4) : 0;
		const enemy = this.enemies
			.filter((e) => e.alive && Math.hypot(e.x - p.x, e.y - p.y) < 10)
			.sort((a, b) => dist(a, p) - dist(b, p))[0];
		if (enemy) {
			const len = Math.hypot(enemy.x - p.x, enemy.y - p.y - 0.72);
			i.aimX = (enemy.x - p.x) / len;
			i.aimY = (enemy.y - p.y - 0.72) / len;
		}
		if (this.aiStage >= route.length && !this.miners.every((m) => m.rescued)) {
			const m = this.miners.find((m) => !m.rescued),
				a = m.x - p.x,
				b = m.y - p.y,
				l = Math.hypot(a, b);
			i.directX = l > 0.05 ? (a / l) * 4 : 0;
			i.directY = l > 0.05 ? (b / l) * 4 : 0;
		}
		return i;
	}
	updateVisual(dt) {
		for (const p of this.players) {
			const g = p.art.g;
			if (p.out) {
				g.visible = false;
				continue;
			}
			if (!this.authority && this.hubActive) {
				g.position.lerp(
					new THREE.Vector3(p.x, p.y + 0.12, 0),
					Math.min(1, dt * 16),
				);
			} else g.position.set(p.x, p.y + 0.12, 0);
			p.art.suit.rotation.z = lerp(p.art.suit.rotation.z, -p.vx * 0.018, 0.12);
			p.art.spinAction.timeScale = p.fly ? 6 : 1.7;
			p.art.walkAction.timeScale = p.grounded
				? Math.max(0.2, Math.abs(p.vx) * 0.4)
				: 0.65;
			p.art.walkAction.weight = p.grounded ? 0.8 : 0.2;
			g.visible = p.invuln > 0 ? Math.floor(this.time * 14) % 3 !== 0 : true;
		}
		for (const e of this.enemies)
			if (e.alive) e.art.g.rotation.z = Math.sin(this.time * 2 + e.id) * 0.08;
		for (const m of this.miners) {
			if (m.rescued && m.balloon > 0) {
				m.balloon += dt;
				m.art.g.position.y = m.y + Math.pow(m.balloon, 1.6) * 1.6;
				m.art.g.scale.setScalar(Math.max(0.02, 1 - m.balloon * 0.09));
				if (m.balloon > 7) m.art.g.visible = false;
			} else m.art.ring.rotation.z += dt;
		}
		for (const item of this.pickups)
			if (!item.taken) {
				item.m.position.y = item.y + Math.sin(this.time * 2.5 + item.id) * 0.13;
				item.m.rotation.y = this.time * 0.7;
			}
		for (const l of this.lamps)
			if (l.alive)
				l.art.light.intensity = 26 + Math.sin(this.time * 3 + l.id * 9) * 2;
		this.art.update(dt, this.time);
		const p = this.myPlayer();
		if (this.state === "title") {
			p.art.g.position.y = p.y + 0.12 + Math.sin(this.time * 1.8) * 0.15;
			p.fly = true;
			p.art.spinAction.timeScale = 6;
			this.art.cameraAt(13.2, 1.6, dt);
		} else if (p) {
			let x = p.x + p.face * 3,
				y = p.y - 1.5;
			if (!this.hubActive && this.players.length > 1) {
				x = this.players.reduce((s, p) => s + p.x, 0) / this.players.length + 2;
				y = this.players.reduce((s, p) => s + p.y, 0) / this.players.length - 1;
				const xs = this.players.map((p) => p.x),
					ys = this.players.map((p) => p.y);
				const needed = Math.max(
					this.art.halfH,
					(Math.max(...xs) - Math.min(...xs) + 10) / (this.art.aspect * 2),
					(Math.max(...ys) - Math.min(...ys) + 9) / 2,
				);
				const targetZoom = clamp(this.art.halfH / needed, 0.48, 1);
				this.art.camera.zoom = lerp(
					this.art.camera.zoom,
					targetZoom,
					Math.min(1, dt * 3),
				);
				this.art.camera.updateProjectionMatrix();
			} else if (this.art.camera.zoom !== 1) {
				this.art.camera.zoom = lerp(
					this.art.camera.zoom,
					1,
					Math.min(1, dt * 5),
				);
				this.art.camera.updateProjectionMatrix();
			}
			const half = this.art.camera.right;
			x = clamp(
				x,
				Math.min(this.level.width / 2, half - 1),
				Math.max(this.level.width / 2, this.level.width - half + 1),
			);
			y = clamp(
				y,
				this.level.bottom + this.art.halfH - 2,
				10 - this.art.halfH + 2,
			);
			this.art.cameraAt(x, y, dt);
			if (this.shake > 0.01) {
				const shake = this.shake * this.settings.shake;
				this.art.camera.position.x += (Math.random() - 0.5) * shake;
				this.art.camera.position.y += (Math.random() - 0.5) * shake;
			}
			this.shake *= Math.pow(0.03, dt);
			this.flash *= Math.pow(0.002, dt);
			$("flash").style.opacity = Math.min(0.35, this.flash);
			const near = this.lamps.reduce(
				(a, l) =>
					Math.hypot(l.x - p.x, l.y - p.y) < Math.hypot(a.x - p.x, a.y - p.y)
						? l
						: a,
				this.lamps[0],
			);
			const dark =
				near && !near.alive && Math.hypot(near.x - p.x, near.y - p.y) < 9;
			$("darkness").style.opacity = dark ? 0.85 : 0;
			if (dark) {
				const lit = this.art.project(p.x, p.y + 0.6);
				$("darkness").style.background =
					"radial-gradient(ellipse 32vh 30vh at " +
					lit.x +
					"px " +
					lit.y +
					"px, transparent 5%, #050d19b8 60%, #020710ef 100%)";
			}
			if (dark && !this.lastDark) this.toast("LAMP OUT · follow your headlamp");
			this.lastDark = dark;
		}
		this.sound.update(
			this.players.some((p) => p.fly),
			this.state === "playing" || this.state === "title",
		);
		if (performance.now() > this.radioUntil)
			$("radio").classList.remove("shown");
		if (performance.now() > this.toastUntil) $("toast").classList.add("hidden");
		if (this.touchHintUntil && performance.now() > this.touchHintUntil)
			$("touch-hint").classList.add("hidden");
		if (!this.hubEnded) this.updateHUD();
	}
	updateHUD() {
		const p = this.myPlayer();
		if (!p) return;
		$("mission-number").textContent =
			"DESCENT 0" +
			(this.levelIndex + 1) +
			" / 04" +
			(this.practice ? " · PRACTICE" : "");
		$("mission-name").textContent = this.level.name;
		$("rescue-count").textContent =
			this.levelRescued +
			" / " +
			this.miners.length +
			" MINER" +
			(this.miners.length > 1 ? "S" : "") +
			" SECURED";
		$("power-text").textContent = Math.ceil(p.energy) + "%";
		$("power-fill").style.width = p.energy + "%";
		$("power-fill").style.background = p.energy < 25 ? "#e47b59" : "";
		$("health").textContent =
			"♥ ".repeat(Math.max(0, p.health)) +
			"♡ ".repeat(Math.max(0, 3 - p.health));
		$("bombs").textContent = "▰ × " + p.bombs;
		$("lives").textContent = this.lives + " RESERVES";
		$("score").textContent = String(this.totalScore()).padStart(6, "0");
		const list =
			this.players.length > 1
				? this.players
						.map(
							(p) =>
								'<span style="border-color:#' +
								colors[p.id % 4].toString(16) +
								'">P' +
								(p.id + 1) +
								" · " +
								p.health +
								"♥ · " +
								Math.ceil(p.energy) +
								"%</span>",
						)
						.join("")
				: "";
		if ($("pilot-list").innerHTML !== list) $("pilot-list").innerHTML = list;
		const target = this.miners
			.filter((m) => !m.rescued)
			.sort((a, b) => dist(a, p) - dist(b, p))[0];
		const rescue = target && target.progress > 0;
		$("rescue-progress").classList.toggle("hidden", !rescue);
		if (rescue)
			$("rescue-progress").querySelector("i").style.width =
				target.progress * 100 + "%";
		if (target) {
			$("distance").textContent = Math.ceil(dist(target, p) * 2) + "m";
			const pos = this.art.project(target.x, target.y + 2.5);
			const off =
				pos.x < 50 ||
				pos.x > innerWidth - 50 ||
				pos.y < innerHeight * 0.2 ||
				pos.y > innerHeight * 0.8;
			const a = $("target-arrow");
			a.classList.toggle("hidden", !off);
			a.style.left = clamp(pos.x, innerWidth * 0.06, innerWidth * 0.93) + "px";
			a.style.top = clamp(pos.y, innerHeight * 0.23, innerHeight * 0.77) + "px";
			a.firstChild.textContent =
				pos.y < innerHeight * 0.2
					? "▲ "
					: pos.x < 50
						? "◀ "
						: pos.x > innerWidth - 50
							? "▶ "
							: "▼ ";
		} else $("target-arrow").classList.add("hidden");
		const nearbyWall = this.walls.find(
			(w) =>
				w.alive && Math.abs(w.x - p.x) < 4 && Math.abs(w.y - p.y) < w.h / 2 + 1,
		);
		$("objective").querySelector("span").textContent = nearbyWall
			? "BARRICADE · PLANT, THEN RETREAT"
			: "FIND THE STRANDED MINER";
		if (
			nearbyWall &&
			this.lastWallHint !== nearbyWall.id &&
			this.state === "playing" &&
			!this.attractMode
		) {
			this.lastWallHint = nearbyWall.id;
			this.radio(
				"A barricade. Plant dynamite, then make yourself scarce. The laser works too.",
			);
		}
		if (this.touch.active) {
			const wall = this.walls.some(
				(w) =>
					w.alive &&
					Math.abs(w.x - p.x) < 4 &&
					Math.abs(w.y - p.y) < w.h / 2 + 1,
			);
			$("touch-pop").classList.toggle(
				"hidden",
				!wall || this.ui.page !== "game",
			);
		}
	}
	frame(now) {
		const dt = Math.min(0.1, (now - this.lastFrame) / 1000 || 0.016);
		this.lastFrame = now;
		this.pollPads(now);
		if (!this.manual) {
			if (
				this.ui.page === "title" &&
				!this.hubActive &&
				now - this.idleAt >= 10000
			)
				this.start(1, true);
			this.acc += dt;
			let n = 0;
			while (this.acc >= this.fixed && n++ < 8) {
				this.tick(this.fixed);
				this.acc -= this.fixed;
			}
			this.network(now);
			if (!this.hubInfo?.server) {
				this.updateVisual(dt);
				this.art.render();
			}
		}
		requestAnimationFrame((t) => this.frame(t));
	}
	activity(kind) {
		this.idleAt = performance.now();
		if (this.attractMode) {
			this.title();
			this.inputKind = kind;
			this.ui.prompts();
			return true;
		}
		if (this.inputKind !== kind) {
			this.inputKind = kind;
			this.mouse.aim = kind === "mouse";
			this.ui.prompts();
		}
		return false;
	}
	bindInput() {
		addEventListener("resize", () => this.art.resize());
		addEventListener("keydown", (e) => {
			if (
				[
					"ArrowUp",
					"ArrowDown",
					"ArrowLeft",
					"ArrowRight",
					"Space",
					"Tab",
				].includes(e.code)
			)
				e.preventDefault();
			if (this.activity("keyboard")) return;
			this.sound.unlock();
			if (this.hubEnded) return;
			if (this.ui.page !== "game") {
				if (e.code === "PageDown" || e.code === "PageUp") {
					const area =
						this.ui.page === "credits"
							? document.querySelector(".credits-content")
							: $("panel");
					if (area)
						area.scrollTop +=
							(e.code === "PageDown" ? 1 : -1) * area.clientHeight * 0.7;
					return;
				}
				if (e.code === "Escape") {
					this.ui.back();
					return;
				}
				if (e.code === "ArrowUp" || e.code === "KeyW") this.ui.navigate(-1);
				if (e.code === "ArrowDown" || e.code === "KeyS" || e.code === "Tab")
					this.ui.navigate(1);
				if (e.code === "ArrowLeft" || e.code === "KeyA") this.ui.horizontal(-1);
				if (e.code === "ArrowRight" || e.code === "KeyD") this.ui.horizontal(1);
				if (e.code === "Enter" || e.code === "Space") this.ui.select();
				return;
			}
			if (e.code === "Escape" || e.code === "KeyP") {
				this.pause();
				return;
			}
			if (e.code === "KeyE" && !e.repeat) this.keyBomb = true;
			if (e.code === "KeyM" && !e.repeat) this.p2Bomb = true;
			this.keys.add(e.code);
		});
		addEventListener("keyup", (e) => this.keys.delete(e.code));
		addEventListener("blur", () => {
			this.keys.clear();
			this.mouse.down = false;
			this.touch.x = 0;
			this.touch.fly = false;
		});
		document.addEventListener(
			"pointerdown",
			(e) => {
				if (e.pointerType === "touch") {
					this.enableTouch();
					if (this.activity("touch")) return;
					if (this.ui.page !== "game" || e.target.closest("button,input"))
						return;
					const left = e.clientX < innerWidth * 0.5;
					this.touch.points.set(e.pointerId, {
						x: e.clientX,
						y: e.clientY,
						left,
					});
					if (!left) this.touch.fly = true;
					e.preventDefault();
					return;
				}
				if (this.activity("mouse")) {
					e.stopPropagation();
					return;
				}
				this.sound.unlock();
				if (e.target === $("game") && this.ui.page === "game") {
					this.mouse.x = e.clientX;
					this.mouse.y = e.clientY;
					this.mouse.aim = true;
					if (e.button === 0) this.mouse.down = true;
					if (e.button === 2) this.keyBomb = true;
				}
			},
			{ passive: false },
		);
		document.addEventListener("pointermove", (e) => {
			if (e.pointerType === "touch") {
				const t = this.touch.points.get(e.pointerId);
				if (t && t.left) this.touch.x = clamp((e.clientX - t.x) / 65, -1, 1);
				return;
			}
			if (Math.abs(e.movementX) + Math.abs(e.movementY) > 0.5) {
				this.activity("mouse");
				this.mouse.x = e.clientX;
				this.mouse.y = e.clientY;
				if (this.ui.page === "game") this.mouse.aim = true;
			}
		});
		const up = (e) => {
			if (e.pointerType === "touch") {
				const t = this.touch.points.get(e.pointerId);
				this.touch.points.delete(e.pointerId);
				if (t?.left) this.touch.x = 0;
				else this.touch.fly = false;
			} else this.mouse.down = false;
		};
		document.addEventListener("pointerup", up);
		document.addEventListener("pointercancel", up);
		document.addEventListener("contextmenu", (e) => e.preventDefault());
		$("touch-bomb").addEventListener("pointerdown", (e) => {
			this.touch.bomb = true;
			e.stopPropagation();
		});
		document.addEventListener("visibilitychange", () => {
			if (document.hidden) {
				this.keys.clear();
				this.mouse.down = false;
				if (!this.hubActive && this.state === "playing" && !this.attractMode)
					this.pause();
			}
		});
	}
	enableTouch() {
		if (this.touch.active) return;
		this.touch.active = true;
		document.body.classList.add("touch");
		$("touch-menu").classList.remove("hidden");
	}
	pollPads(now) {
		if (this.hubInfo?.server) return;
		const pads = [...(navigator.getGamepads?.() || [])].filter(
			(p) => p?.connected,
		);
		this.padStates = [];
		pads.forEach((p, index) => {
			const buttons = p.buttons.map((b) => !!b.pressed || b.value > 0.6),
				old = this.padsPrevious[p.index] || [],
				edge = (n) => buttons[n] && !old[n];
			const ax = Math.abs(p.axes[0] || 0) > 0.18 ? p.axes[0] : 0,
				ay = Math.abs(p.axes[1] || 0) > 0.25 ? p.axes[1] : 0;
			const rx = p.axes[2] || 0,
				ry = -(p.axes[3] || 0),
				aiming = Math.hypot(rx, ry) > 0.25;
			if (
				(buttons.some((b, n) => b && !old[n]) ||
					Math.abs(ax) > 0.3 ||
					Math.abs(ay) > 0.3) &&
				this.activity("pad")
			) {
				this.padsPrevious[p.index] = buttons;
				return;
			}
			const input = {
				...emptyInput(),
				x: ax || (buttons[14] ? -1 : buttons[15] ? 1 : 0),
				fly: buttons[0] || ay < -0.35 || buttons[12],
				fire: buttons[7] || buttons[5],
				bomb: edge(2),
				down: ay > 0.5 || buttons[13],
				aimX: aiming ? rx : ax || this.players[index]?.face || 1,
				aimY: aiming ? ry : 0,
				aiming,
			};
			this.padStates[index] = input;
			if (this.hubActive && !this.authority && edge(2)) this.keyBomb = true;
			if (edge(9) && !buttons[8]) this.pause();
			if (this.ui.page !== "game") {
				if (Math.abs(p.axes[3] || 0) > 0.2) {
					const area =
						this.ui.page === "credits"
							? document.querySelector(".credits-content")
							: $("panel");
					if (area) area.scrollTop += p.axes[3] * 18;
				}
				if (edge(0)) this.ui.select();
				if (edge(1)) this.ui.back();
				if (now > (this.padNavAt || 0)) {
					if (buttons[12] || ay < -0.5) {
						this.ui.navigate(-1);
						this.padNavAt = now + 190;
					} else if (buttons[13] || ay > 0.5) {
						this.ui.navigate(1);
						this.padNavAt = now + 190;
					} else if (buttons[14] || ax < -0.5) {
						this.ui.horizontal(-1);
						this.padNavAt = now + 160;
					} else if (buttons[15] || ax > 0.5) {
						this.ui.horizontal(1);
						this.padNavAt = now + 160;
					}
				}
			}
			this.padsPrevious[p.index] = buttons;
		});
	}
	async connectHub() {
		const info = await window.AIHub.connect({
			mode: "shared-world",
			seats: [1, 4],
		});
		if (!info) {
			this.hubActive = false;
			this.title();
			return;
		}
		this.hubInfo = info;
		this.authority = info.isHost;
		this.departed = new Set();
		this.totalRescued = 0;
		this.elapsed = 0;
		this.lives = 4;
		this.loadLevel(0);
		this.state = "waiting";
		this.ui.hide();
		$("hud").classList.toggle("hidden", !!info.server);
		window.AIHub.on("start", () => {
			if (!this.hubEnded) {
				this.state = "playing";
				this.ui.hide();
				this.radio("Colleagues present. Let’s bring everybody home.");
			}
		});
		window.AIHub.on("message", (data, from) => {
			if (this.hubEnded || !data || typeof data !== "object") return;
			this.networkMessages.received++;
			if (
				data.type === "input" &&
				this.authority &&
				this.players.some((p) => p.id === from)
			) {
				const i = data.input;
				if (!i) return;
				this.remoteInputs.set(from, {
					x: clamp(+i.x || 0, -1, 1),
					fly: !!i.fly,
					fire: !!i.fire,
					bomb: !!i.bomb || this.remoteInputs.get(from)?.bomb,
					aimX: clamp(+i.aimX || 1, -1, 1),
					aimY: clamp(+i.aimY || 0, -1, 1),
					down: !!i.down,
				});
			}
			if (data.type === "world" && !this.authority && from === info.host)
				this.applySnapshot(data);
		});
		window.AIHub.on("leave", ({ id }) => {
			this.departed.add(id);
			this.remoteInputs.delete(id);
			const p = this.players.find((p) => p.id === id);
			if (p) {
				p.out = true;
				p.art.g.visible = false;
				if (this.authority) this.world.removeRigidBody(p.body);
			}
			this.toast("A colleague has clocked out. Rescue continues.");
		});
		window.AIHub.on("time-up", () => {
			if (this.authority && !this.hubEnded)
				this.reportHub(this.totalRescued === 8);
		});
		window.AIHub.on("end", () => {
			this.hubEnded = true;
			this.state = "ended";
			this.keys.clear();
			this.mouse.down = false;
			this.ui.hide();
			this.sound.silence();
			$("radio").classList.remove("shown");
		});
		window.AIHub.ready();
	}
	reportHub(won) {
		if (this.reported || !this.authority) return;
		this.reported = true;
		const ids = this.hubInfo.players
			.filter((p) => !this.departed?.has(p.id))
			.map((p) => p.id);
		const scores = {},
			stats = {};
		for (const id of ids) {
			const p = this.players.find((p) => p.id === id);
			scores[id] = p?.score || 0;
			stats[id] = {
				"Miners home": this.totalRescued,
				Descents: this.levelIndex + 1,
				"Shift seconds": Math.floor(this.elapsed),
			};
		}
		window.AIHub.finish({ standings: [ids], scores, won, stats });
	}
	emitEffect(effect) {
		if (this.hubActive && this.authority) {
			this.effectLog.push([++this.effectSerial, ...effect]);
			if (this.effectLog.length > 20) this.effectLog.shift();
		}
	}
	snapshot() {
		return {
			fx: this.effectLog.slice(-16),
			type: "world",
			tick: ++this.snapshotTick,
			level: this.levelIndex,
			state: this.state,
			elapsed: this.elapsed,
			lt: this.levelTime,
			lives: this.lives,
			total: this.totalRescued,
			rescued: this.levelRescued,
			players: this.players
				.filter((p) => !p.out)
				.map((p) => [
					p.id,
					p.x,
					p.y,
					p.vx,
					p.vy,
					p.health,
					p.energy,
					p.bombs,
					p.score,
					p.face,
					Number(p.fly),
					p.invuln,
				]),
			walls: this.walls.map((w) => Number(w.alive)),
			enemies: this.enemies.map((e) => [Number(e.alive), e.x, e.y]),
			miners: this.miners.map((m) => [Number(m.rescued), m.progress, m.by]),
			lamps: this.lamps.map((l) => Number(l.alive)),
			items: this.pickups.map((i) => Number(i.taken)),
			gates: this.gates.map((g) => g.y),
			rafts: this.rafts.map((f) => f.x),
			tentacles: this.tentacles.map((t) => t.x),
			bombs: this.bombs.map((b) => [b.id, b.x, b.y, b.t, b.owner]),
		};
	}
	applySnapshot(s) {
		if (s.tick <= this.lastReceived) return;
		this.lastReceived = s.tick;
		if (s.level !== this.levelIndex) this.loadLevel(s.level);
		for (const [id, kind, ...v] of s.fx || []) {
			if (id <= this.lastEffect) continue;
			this.lastEffect = id;
			if (kind === "laser") {
				this.art.beam(v[0], v[1], v[2], v[3], v[4], colors[v[5] % 4]);
				this.sound.play("laser");
			}
			if (kind === "blast") {
				this.art.burst(v[0], v[1], 0xffbb66, 30);
				this.sound.play("blast");
				this.shake = 0.6;
			}
		}
		const prev = this.state;
		this.state = s.state;
		this.elapsed = s.elapsed;
		this.levelTime = s.lt;
		this.lives = s.lives;
		this.totalRescued = s.total;
		this.levelRescued = s.rescued;
		for (const row of s.players) {
			const p = this.players.find((p) => p.id === row[0]);
			if (!p) continue;
			[
				p.id,
				p.x,
				p.y,
				p.vx,
				p.vy,
				p.health,
				p.energy,
				p.bombs,
				p.score,
				p.face,
			] = row.slice(0, 10);
			p.fly = !!row[10];
			p.invuln = row[11];
			p.body.setTranslation({ x: p.x, y: p.y, z: 0 }, true);
		}
		s.walls.forEach((v, i) => {
			const w = this.walls[i];
			if (w.alive && !v) {
				w.alive = false;
				w.m.visible = false;
				this.world.removeCollider(w.c, true);
				this.art.burst(w.x, w.y, 0xd0a77b, 15);
				this.sound.play("blast");
			}
		});
		s.enemies.forEach(([alive, x, y], i) => {
			const e = this.enemies[i];
			if (e.alive && !alive) this.art.burst(x, y, 0xc8a5bd, 10);
			e.alive = !!alive;
			e.x = x;
			e.y = y;
			e.art.g.visible = !!alive;
			e.art.g.position.set(x, y, 0);
		});
		s.miners.forEach(([r, progress, by], i) => {
			const m = this.miners[i];
			if (r && !m.rescued) {
				m.balloon = 0.01;
				this.sound.play("rescue");
				this.art.burst(m.x, m.y, 0x92dbb3, 20);
				const balloon = this.art.sphere(0, 3, 0, 0.85, 0xe8bb61, m.art.g, 1);
				balloon.scale.y = 1.2;
			}
			m.rescued = !!r;
			m.art.help.visible = !r;
			m.progress = progress;
			m.by = by;
		});
		s.lamps.forEach((v, i) => {
			this.lamps[i].alive = !!v;
			this.lamps[i].art.light.intensity = v ? 26 : 0;
		});
		s.items.forEach((v, i) => {
			this.pickups[i].taken = !!v;
			this.pickups[i].m.visible = !v;
		});
		s.gates.forEach((y, i) => {
			this.gates[i].y = y;
			this.gates[i].g.position.set(this.gates[i].x, y, 0);
		});
		s.rafts.forEach((x, i) => {
			this.rafts[i].x = x;
			this.rafts[i].g.position.set(x, this.rafts[i].y, 0);
		});
		s.tentacles.forEach((x, i) => {
			this.tentacles[i].x = x;
			this.tentacles[i].g.position.set(x, this.tentacles[i].y, 0);
		});
		const ids = new Set(s.bombs.map((b) => b[0]));
		for (const b of this.bombs)
			if (!ids.has(b.id)) {
				b.m.removeFromParent();
				if (b.t < 0.4) {
					this.art.burst(b.x, b.y, 0xffbf66, 24);
					this.sound.play("blast");
				}
			}
		this.bombs = this.bombs.filter((b) => ids.has(b.id));
		for (const [id, x, y, t, owner] of s.bombs) {
			let b = this.bombs.find((b) => b.id === id);
			if (!b) {
				b = { id, x, y, t, owner, m: this.art.bomb(x, y) };
				this.bombs.push(b);
			}
			Object.assign(b, { x, y, t });
			b.m.position.set(x, y, 0.5);
		}
		if (prev !== s.state) {
			if (s.state === "intermission") this.ui.show("debrief");
			else if (["victory", "gameover"].includes(s.state)) this.ui.show(s.state);
			else if (s.state === "playing" && this.ui.page === "debrief")
				this.ui.hide();
		}
	}
	network(now) {
		if (
			!this.hubActive ||
			!this.hubInfo ||
			this.hubEnded ||
			now - this.lastNet < 100
		)
			return;
		this.lastNet = now;
		if (this.authority) {
			window.AIHub.send(this.snapshot(), { reliable: true });
			this.networkMessages.sent++;
			for (const i of this.remoteInputs.values()) i.bomb = false;
		} else if (!this.hubInfo.server) {
			const p = this.myPlayer();
			if (p) {
				const input = this.getInput(p);
				window.AIHub.send(
					{ type: "input", input },
					{ to: this.hubInfo.host, reliable: true },
				);
				this.networkMessages.sent++;
			}
		}
	}
	inspect() {
		return {
			ready: this.ready,
			state: this.state,
			ui: this.ui.page,
			renderer: this.art.backend,
			deviceLost: !!this.art.renderer._isDeviceLost,
			recoveries: this.art.recoveries || 0,
			level: this.levelIndex,
			rescued: this.totalRescued,
			levelRescued: this.levelRescued,
			lives: this.lives,
			elapsed: this.elapsed,
			score: this.totalScore(),
			attract: this.attractMode,
			players: this.players.map((p) => ({
				id: p.id,
				x: p.x,
				y: p.y,
				health: p.health,
				energy: p.energy,
				bombs: p.bombs,
				score: p.score,
				grounded: p.grounded,
			})),
			walls: this.walls.map((w) => ({ alive: w.alive, health: w.health })),
			lamps: this.lamps.map((l) => l.alive),
			enemies: this.enemies.map((e) => e.alive),
			audio: {
				state: this.sound.ctx?.state,
				peak: this.sound.peak,
				notes: this.sound.notes,
				music: this.settings.music,
			},
			network: this.networkMessages,
			animations: this.art.mixers.length,
			practice: this.practice,
		};
	}
}
const game = new Game();
window.__GAME__ = game;
window.__HERO_INFO__ = credits;
game.init().catch((e) => {
	console.error(e);
	$("load-status").textContent =
		"The prop-pack could not start: " +
		e.message +
		" · Try a current Chrome, Edge or Safari browser.";
	document.body.dataset.error = e.message;
	window.AIHub?.active && window.AIHub.fail(e.message);
});
