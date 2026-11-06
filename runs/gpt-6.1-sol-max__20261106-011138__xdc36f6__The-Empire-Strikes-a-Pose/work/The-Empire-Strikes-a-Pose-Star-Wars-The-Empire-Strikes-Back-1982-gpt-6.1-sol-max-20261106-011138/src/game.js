import * as T from "three/webgpu";
import RAPIER from "@dimforge/rapier3d-compat";
import {
	landscape,
	snow,
	skimmer,
	raider,
	walker,
	shuttle,
	repairBuoy,
	shadow,
	piece,
	toppleAnimation,
	comicBurst,
} from "./art.js";
import { Sound } from "./audio.js";
import { WingLink } from "./network.js";
import { Interface } from "./ui.js";
import { DEFAULTS, settingsDefault, MISSION } from "./mission.js";
const $ = (id) => document.getElementById(id);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const angle = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const v3 = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
const feedback = document.querySelector("#loadStatus");
class Game {
	constructor() {
		this.ready = false;
		this.mode = "loading";
		this.screen = "title";
		this.backScreen = "title";
		this.time = 0;
		this.stage = 0;
		this.score = 0;
		this.kills = 0;
		this.topples = 0;
		this.shots = 0;
		this.hits = 0;
		this.rescues = 0;
		this.runTime = 0;
		this.lastInput = "keyboard";
		this.idle = 0;
		this.lastInteraction = performance.now();
		this.keys = new Set();
		this.mouse = { x: 0, y: 0, down: false, active: false };
		this.touch = {
			pointers: new Map(),
			turn: 0,
			throttle: 0,
			aimX: 0,
			aimY: 0,
			fire: false,
		};
		this.controls = {
			turn: 0,
			throttle: 0,
			boost: false,
			fire: false,
			cable: false,
			brake: false,
		};
		this.padPrev = [];
		this.padMenuRepeat = 0;
		this.entities = [];
		this.projectiles = [];
		this.particles = [];
		this.bursts = [];
		this.debris = [];
		this.mixers = [];
		this.cache = [];
		this.ghosts = new Map();
		this.colliders = new Map();
		this.radioUntil = 0;
		this.flashUntil = 0;
		this.damageFlash = 0;
		this.uiClock = 0;
		this.fireCooldown = 0;
		this.overheated = false;
		this.heat = 0;
		this.tether = null;
		this.cableCooldown = 0;
		this.selected = null;
		this.autopilot = false;
		this.invincible = false;
		this.debugPhysics = false;
		this.testMode = new URLSearchParams(location.search).has("test");
		this.manual = new URLSearchParams(location.search).has("manual");
		this.completed = false;
		this.ended = false;
		this.settings = { ...settingsDefault };
		this.balance = { ...DEFAULTS };
		this.best = 0;
		try {
			const s = JSON.parse(localStorage.getItem("pose.settings"));
			if (s) Object.assign(this.settings, s);
			this.best = Number(localStorage.getItem("pose.best")) || 0;
		} catch {}
		this.sound = new Sound(this.settings);
		this.net = new WingLink();
		this.ui = new Interface(this);
		this.stats = {
			cableSnaps: 0,
			boostSeconds: 0,
			repairs: 0,
			damageTaken: 0,
			physicsHits: 0,
		};
		this.lastFrame = performance.now();
		this.cameraTarget = v3();
		this.currentSpeed = 0;
		this.tactical = false;
	}
	async init() {
		await this.net.init();
		feedback.textContent = "Building the ice and ink…";
		await RAPIER.init();
		this.physicsVersion = RAPIER.version();
		this.scene = new T.Scene();
		this.scene.background = new T.Color(0xa9c7cc);
		this.scene.fog = new T.Fog(0xb8cfd0, 230, 850);
		this.camera = new T.PerspectiveCamera(
			56,
			innerWidth / innerHeight,
			0.2,
			1800,
		);
		this.renderer = new T.WebGPURenderer({
			canvas: $("scene"),
			antialias: true,
			alpha: false,
			powerPreference: "high-performance",
			forceWebGL:
				new URLSearchParams(location.search).get("renderer") === "webgl",
		});
		this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
		this.renderer.setSize(innerWidth, innerHeight);
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = T.PCFSoftShadowMap;
		this.renderer.toneMapping = T.ACESFilmicToneMapping;
		this.renderer.toneMappingExposure = 1.23;
		await this.renderer.init();
		this.backend = this.renderer.backend.isWebGPUBackend
			? "WebGPU"
			: "WebGL 2 fallback";
		const hemi = new T.HemisphereLight(0xe9eed5, 0x52768b, 2.1);
		this.scene.add(hemi);
		const sun = new T.DirectionalLight(0xffdfad, 3.1);
		sun.position.set(-150, 250, 120);
		sun.castShadow = true;
		sun.shadow.mapSize.set(2048, 2048);
		Object.assign(sun.shadow.camera, {
			left: -260,
			right: 260,
			top: 300,
			bottom: -300,
			near: 1,
			far: 800,
		});
		sun.shadow.bias = -0.001;
		sun.shadow.normalBias = 0.3;
		this.scene.add(sun);
		const fill = new T.DirectionalLight(0x7bbed5, 1.1);
		fill.position.set(150, 75, -100);
		this.scene.add(fill);
		this.land = landscape(this.scene);
		this.snow = snow(this.scene);
		this.dynamicGroup = new T.Group();
		this.scene.add(this.dynamicGroup);
		this.physicsDebug = new T.LineSegments(
			new T.BufferGeometry(),
			new T.LineBasicMaterial({ vertexColors: true, depthTest: false }),
		);
		this.physicsDebug.frustumCulled = false;
		this.physicsDebug.visible = false;
		this.scene.add(this.physicsDebug);
		this.setupInput();
		this.resetWorld(false);
		this.net.handlers = {
			start: () => {
				this.begin(false, true);
			},
			timeup: () => {
				this.endRun(false, "The flight window has closed.", true);
			},
			end: () => {
				this.ended = true;
				this.mode = "ended";
				this.ui.hide();
				$("hud").hidden = true;
				this.sound.update(0, false, true);
			},
			leave: (id) => this.toast("A wing echo has left the sector."),
			status: () => this.ui.updateNetStatus(),
		};
		this.ready = true;
		if (this.net.active) {
			this.mode = "hubwait";
			this.ui.hide();
			$("hud").hidden = false;
			this.setRadio(
				"CONTROL / FLIGHT OPS",
				"Stand by. Your flight window opens on the shared clock.",
				100,
			);
			this.net.ready();
		} else {
			this.mode = "title";
			this.lastInteraction = performance.now();
			this.ui.show("title");
		}
		this.renderer.setAnimationLoop((t) => this.frame(t));
		this.publishAPI();
		window.addEventListener("resize", () => this.resize());
		this.resize();
	}
	resetWorld(active = true) {
		if (this.world) this.world.free();
		this.world = new RAPIER.World({ x: 0, y: -24, z: 0 });
		this.world.timestep = 1 / 60;
		this.colliders.clear();
		this.dynamicGroup.clear();
		this.mixers.length = 0;
		this.entities = [];
		this.projectiles = [];
		this.particles = [];
		this.bursts = [];
		this.debris = [];
		this.cache = [];
		for (const g of this.ghosts.values()) this.scene.remove(g.mesh);
		this.ghosts.clear();
		this.world.createCollider(
			RAPIER.ColliderDesc.cuboid(950, 1, 950).setTranslation(0, -1, 0),
		);
		this.time = 0;
		this.stage = 0;
		this.score = 0;
		this.kills = 0;
		this.topples = 0;
		this.shots = 0;
		this.hits = 0;
		this.runTime = 0;
		this.heat = 0;
		this.fireCooldown = 0;
		this.overheated = false;
		this.tether = null;
		this.selected = null;
		this.cableCooldown = 0;
		this.completed = false;
		this.won = false;
		this.aiCooling = false;
		this.ended = false;
		this.escortStarted = false;
		this.aceSpawned = false;
		this.escortProgress = 0;
		this.stats = {
			cableSnaps: 0,
			boostSeconds: 0,
			repairs: 0,
			damageTaken: 0,
			physicsHits: 0,
		};
		this.rescues = 0;
		this.boundaryWarn = -100;
		this.escortWarn = -100;
		this.net.newRun();
		const ship = skimmer(this.mixers);
		this.dynamicGroup.add(ship);
		const sh = shadow(this.dynamicGroup);
		this.player = {
			mesh: ship,
			shadow: sh,
			pos: v3(0, 9, 100),
			yaw: Math.PI,
			hp: 100,
			speed: 0,
			bank: 0,
			invuln: 0,
		};
		ship.position.copy(this.player.pos);
		this.player.body = this.world.createRigidBody(
			RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 9, 100),
		);
		this.player.collider = this.world.createCollider(
			RAPIER.ColliderDesc.ball(2.2),
			this.player.body,
		);
		this.colliders.set(this.player.collider.handle, {
			type: "player",
			entity: this.player,
		});
		this.ark = {
			mesh: shuttle(this.mixers),
			pos: v3(0, 8, 160),
			hp: 180,
			body: null,
		};
		this.dynamicGroup.add(this.ark.mesh);
		this.ark.mesh.position.copy(this.ark.pos);
		this.ark.mesh.rotation.y = Math.PI;
		this.ark.body = this.world.createRigidBody(
			RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 8, 160),
		);
		this.ark.collider = this.world.createCollider(
			RAPIER.ColliderDesc.cuboid(9, 4, 14),
			this.ark.body,
		);
		this.colliders.set(this.ark.collider.handle, {
			type: "ark",
			entity: this.ark,
		});
		this.ark.shadow = shadow(this.dynamicGroup, 2);
		for (const [i, p] of MISSION.walkers.entries())
			this.spawnWalker(p[0], p[1], i);
		if (!active) {
			const ws = this.entities.filter((e) => e.type === "walker");
			ws[0].pos.set(70, 0, 20);
			ws[1].pos.set(110, 0, -90);
			for (const w of ws) {
				w.mesh.position.copy(w.pos);
				w.body.setTranslation(w.pos, true);
			}
		}
		for (const [i, p] of MISSION.scouts.entries())
			this.spawnRaider(p[0], p[1], i);
		for (const [x, z] of MISSION.repairs) this.spawnCache(x, z);
		this.cableLine = new T.Line(
			new T.BufferGeometry().setFromPoints([v3(), v3()]),
			new T.LineBasicMaterial({ color: 0x18384c }),
		);
		this.cableLine.frustumCulled = false;
		this.dynamicGroup.add(this.cableLine);
		this.cableLine.visible = false;
		this.camera.position.set(-100, 50, 170);
		this.cameraTarget.set(0, 15, -20);
		this.camera.lookAt(this.cameraTarget);
		this.radioUntil = 0;
		this.flashUntil = 0;
		this.damageFlash = 0;
		this.keys.clear();
		this.mouse.down = false;
		this.controls.cable = false;
		this.currentSpeed = 0;
	}
	spawnWalker(x, z, i) {
		const w = walker(this.mixers, i);
		Object.assign(w, {
			type: "walker",
			id: "walker" + i,
			pos: v3(x, 0, z),
			yaw: 0,
			hp: 40,
			maxHp: 40,
			dead: false,
			cooldown: 6 + i * 2,
			age: 0,
		});
		w.mesh.position.copy(w.pos);
		this.dynamicGroup.add(w.mesh);
		w.body = this.world.createRigidBody(
			RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x, 0, z),
		);
		w.collider = this.world.createCollider(
			RAPIER.ColliderDesc.cuboid(7, 11, 13).setTranslation(0, 16, 0),
			w.body,
		);
		this.colliders.set(w.collider.handle, { type: "enemy", entity: w });
		this.entities.push(w);
		return w;
	}
	spawnRaider(x, z, index = 0, ace = false) {
		const mesh = raider(this.mixers, ace),
			e = {
				type: ace ? "ace" : "raider",
				id: "raider" + this.entities.length,
				pos: v3(x, ace ? 14 : 10, z),
				mesh,
				hp: ace ? 18 : 4,
				maxHp: ace ? 18 : 4,
				velocity: v3(),
				yaw: 0,
				dead: false,
				cooldown: 3 + index * 0.7,
				age: 0,
				seed: index * 2.1,
				origin: v3(x, 10, z),
				index,
			};
		this.dynamicGroup.add(mesh);
		mesh.position.copy(e.pos);
		e.body = this.world.createRigidBody(
			RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
				x,
				e.pos.y,
				z,
			),
		);
		e.collider = this.world.createCollider(
			RAPIER.ColliderDesc.ball(3.5),
			e.body,
		);
		this.colliders.set(e.collider.handle, { type: "enemy", entity: e });
		this.entities.push(e);
		return e;
	}
	spawnCache(x, z) {
		const mesh = repairBuoy(this.mixers);
		mesh.position.set(x, 7, z);
		this.dynamicGroup.add(mesh);
		this.cache.push({ mesh, pos: v3(x, 7, z), taken: false });
	}
	begin(attract = false, hub = false) {
		if (this.net.active && !hub) return;
		this.resetWorld();
		this.mode = attract ? "attract" : "playing";
		this.screen = "none";
		this.autopilot = false;
		this.invincible = false;
		this.ui.hide();
		$("hud").hidden = false;
		$("attractBadge").hidden = !attract;
		this.player.mesh.visible = true;
		this.flash("01", MISSION.chapters[0].title);
		this.setRadio(MISSION.chapters[0].voice, MISSION.chapters[0].briefing, 7);
		this.net.started = true;
		this.updateHUD();
	}
	endRun(won, reason = "", timeup = false) {
		if (this.completed || this.ended) return;
		this.completed = true;
		this.won = won;
		if (won) {
			this.rescues = 38;
			this.score +=
				2000 +
				Math.round((this.ark.hp / 180) * 800) +
				Math.round(this.player.hp * 3);
			this.sound.ping();
		}
		if (this.mode === "attract") {
			this.attractEnd = this.time + 4;
			return;
		}
		this.net.finish(this.score, this.getStats());
		this.keys.clear();
		this.mouse.down = false;
		if (!this.net.active) {
			if (this.score > this.best) {
				this.best = this.score;
				try {
					localStorage.setItem("pose.best", String(this.best));
				} catch {}
			}
			this.mode = "result";
			this.resultReason =
				reason ||
				(won
					? "Thirty-eight people will see another sunrise."
					: "The cold front held the last word.");
			this.ui.show("result");
		} else {
			this.mode = "hubresult";
			this.setRadio(
				"CONTROL / FLIGHT OPS",
				won
					? "Transport away. Your sortie is on the board."
					: "Flight window closed. Your sortie is on the board.",
				100,
			);
		}
	}
	getStats() {
		return {
			Scouts: this.kills,
			Walkers: this.topples,
			"Hull left": Math.round(this.player.hp),
			"Ark left": Math.round(this.ark.hp / 1.8),
			"Flight seconds": Math.round(this.runTime),
			"Accuracy %": this.shots ? Math.round((this.hits / this.shots) * 100) : 0,
		};
	}
	saveSettings() {
		try {
			localStorage.setItem("pose.settings", JSON.stringify(this.settings));
		} catch {}
		this.sound.volumes();
	}
	noteInput(kind) {
		if (this.ended) return;
		this.idle = 0;
		this.lastInteraction = performance.now();
		if (this.mode === "attract") {
			this.mode = "title";
			$("attractBadge").hidden = true;
			$("hud").hidden = true;
			this.resetWorld(false);
			this.ui.show("title");
			this.lastInput = kind;
			this.ignoreInputUntil = performance.now() + 220;
			return true;
		}
		if (this.lastInput !== kind) {
			this.lastInput = kind;
			document.body.classList.toggle("touch", kind === "touch");
			if (this.ui.visible) this.ui.show(this.screen, true);
			else this.ui.refreshHints();
		}
		return false;
	}
	setupInput() {
		window.addEventListener("keydown", (e) => {
			if (
				[
					"Space",
					"ArrowUp",
					"ArrowDown",
					"ArrowLeft",
					"ArrowRight",
					"Tab",
				].includes(e.code) &&
				!["TEXTAREA", "INPUT"].includes(e.target.tagName)
			)
				e.preventDefault();
			if (this.noteInput("keyboard")) {
				e.preventDefault();
				e.stopPropagation();
				return;
			}
			this.sound.unlock();
			if (this.ignoreInputUntil > performance.now()) return;
			if (
				["INPUT", "TEXTAREA"].includes(e.target.tagName) &&
				e.code !== "Escape"
			)
				return;
			this.keys.add(e.code);
			if (e.repeat) return;
			if (e.code === "Escape") {
				this.pause();
				return;
			}
			if (this.ui.visible) {
				if (["Enter", "Space"].includes(e.code)) e.preventDefault();
				if (e.code === "Tab") this.ui.move(e.shiftKey ? -1 : 1);
				else if (e.code === "ArrowDown" || e.code === "KeyS") this.ui.move(1);
				else if (e.code === "ArrowUp" || e.code === "KeyW") this.ui.move(-1);
				else if (e.code === "ArrowLeft" || e.code === "KeyA")
					this.ui.adjust(-1);
				else if (e.code === "ArrowRight" || e.code === "KeyD")
					this.ui.adjust(1);
				else if (e.code === "Enter" || e.code === "Space") this.ui.activate();
				return;
			}
			if (e.code === "Space") this.controls.cable = true;
			if (e.code === "KeyQ") this.cycleTarget();
			if (e.code === "KeyC") this.toggleCamera();
			if (e.code === "KeyP") this.pause();
		});
		window.addEventListener("keyup", (e) => this.keys.delete(e.code));
		window.addEventListener("blur", () => {
			this.keys.clear();
			this.mouse.down = false;
			this.touch.pointers.clear();
			this.touch.turn = 0;
			this.touch.fire = false;
			if (this.mode === "playing" && !this.net.active) this.pause();
		});
		window.addEventListener("pointermove", (e) => {
			if (e.pointerType === "touch") {
				this.moveTouch(e);
				return;
			}
			if (Math.abs(e.movementX) + Math.abs(e.movementY) > 0)
				this.noteInput("keyboard");
			this.mouse.x = (e.clientX / innerWidth) * 2 - 1;
			this.mouse.y = -((e.clientY / innerHeight) * 2 - 1);
			this.mouse.active = true;
		});
		$("scene").addEventListener("pointerdown", (e) => {
			if (e.pointerType === "touch") {
				this.startTouch(e);
				return;
			}
			if (this.noteInput("keyboard")) return;
			this.sound.unlock();
			if (e.button === 0) this.mouse.down = true;
			if (e.button === 2) this.cycleTarget();
		});
		window.addEventListener("pointerup", (e) => {
			if (e.pointerType === "touch") this.endTouch(e);
			else if (e.button === 0) this.mouse.down = false;
		});
		window.addEventListener("pointercancel", (e) => this.endTouch(e));
		window.addEventListener("contextmenu", (e) => e.preventDefault());
		$("pauseButton").onclick = () => {
			this.noteInput(this.lastInput);
			this.pause();
		};
		$("touchAction").onpointerdown = (e) => {
			e.stopPropagation();
			this.noteInput("touch");
			this.sound.unlock();
			this.controls.cable = true;
		};
		document.addEventListener("visibilitychange", () => {
			if (document.hidden && this.mode === "playing" && !this.net.active)
				this.pause();
		});
	}
	startTouch(e) {
		if (this.noteInput("touch")) return;
		this.sound.unlock();
		if (this.mode !== "playing" && this.mode !== "attract") return;
		e.preventDefault();
		$("scene").setPointerCapture(e.pointerId);
		const side = e.clientX < innerWidth * 0.5 ? "left" : "right";
		const p = { side, x: e.clientX, y: e.clientY };
		this.touch.pointers.set(e.pointerId, p);
		const ring = $(side === "left" ? "touchLeft" : "touchRight");
		ring.hidden = false;
		ring.style.left = e.clientX + "px";
		ring.style.top = e.clientY + "px";
		if (side === "right") {
			this.touch.fire = true;
			this.mouse.active = false;
		}
	}
	moveTouch(e) {
		const p = this.touch.pointers.get(e.pointerId);
		if (!p) return;
		const dx = (e.clientX - p.x) / 70,
			dy = (e.clientY - p.y) / 70;
		if (p.side === "left") {
			this.touch.turn = clamp(dx, -1, 1);
			this.touch.throttle = clamp(-dy, -1, 1);
		} else {
			this.touch.aimX = clamp(dx, -1, 1);
			this.touch.aimY = clamp(-dy, -1, 1);
		}
	}
	endTouch(e) {
		const p = this.touch.pointers.get(e.pointerId);
		if (!p) return;
		this.touch.pointers.delete(e.pointerId);
		if (p.side === "left") {
			this.touch.turn = 0;
			this.touch.throttle = 0;
			$("touchLeft").hidden = true;
		} else {
			this.touch.fire = false;
			this.touch.aimX = 0;
			this.touch.aimY = 0;
			$("touchRight").hidden = true;
		}
	}
	pollPad(dt) {
		const pads = navigator.getGamepads?.() || [];
		const pad = Array.from(pads).find((p) => p?.connected);
		this.padState = null;
		if (!pad) {
			this.padPrev = [];
			return;
		}
		const buttons = pad.buttons.map((b) => b.pressed || b.value > 0.3);
		const axes = pad.axes.map((a) => (Math.abs(a) > 0.16 ? a : 0));
		const changed = buttons.some((v, i) => v && !this.padPrev[i]);
		const significant = axes.some((a) => Math.abs(a) > 0.23) || changed;
		if (significant && this.noteInput("pad")) {
			this.padPrev = buttons;
			return;
		}
		if (significant) this.sound.unlock();
		const press = (i) => buttons[i] && !this.padPrev[i];
		if (this.ignoreInputUntil > performance.now()) {
			this.padPrev = buttons;
			return;
		}
		if (press(9) && !buttons[8]) this.pause();
		if (this.ui.visible) {
			this.padMenuRepeat -= dt;
			const direction =
				buttons[13] || axes[1] > 0.55
					? 1
					: buttons[12] || axes[1] < -0.55
						? -1
						: 0;
			if (direction && (this.padMenuRepeat <= 0 || press(12) || press(13))) {
				this.ui.move(direction);
				this.padMenuRepeat = 0.22;
			}
			const hor =
				buttons[15] || axes[0] > 0.55
					? 1
					: buttons[14] || axes[0] < -0.55
						? -1
						: 0;
			if (hor && this.padMenuRepeat <= 0) {
				this.ui.adjust(hor);
				this.padMenuRepeat = 0.14;
			}
			if (press(0)) this.ui.activate();
			if (press(1)) this.ui.back();
		} else {
			if (press(0)) this.controls.cable = true;
			if (press(2)) this.cycleTarget();
			if (press(3)) this.toggleCamera();
			this.padState = {
				turn: axes[0] || 0,
				throttle: -(axes[1] || 0),
				aimX: axes[2] || 0,
				aimY: -(axes[3] || 0),
				fire: buttons[7],
				boost: buttons[6],
				brake: buttons[4] || buttons[5],
			};
		}
		this.padPrev = buttons;
	}
	input() {
		const c = {
			turn: 0,
			throttle: 0,
			fire: false,
			boost: false,
			brake: false,
			cable: this.controls.cable,
		};
		this.controls.cable = false;
		if (this.mode === "attract" || this.autopilot) {
			return this.pilot(c);
		}
		if (this.lastInput === "pad" && this.padState) {
			Object.assign(c, this.padState);
			this.mouse.active = false;
			this.mouse.x = lerp(this.mouse.x, c.aimX * 0.7, 0.18);
			this.mouse.y = lerp(this.mouse.y, c.aimY * 0.6, 0.18);
		} else if (this.lastInput === "touch") {
			c.turn = this.touch.turn;
			c.throttle = this.touch.throttle;
			c.fire =
				this.touch.fire ||
				(this.settings.aimAssist && this.heat < 75 && !this.overheated);
			c.boost = this.touch.throttle > 0.85;
			c.brake = this.touch.throttle < -0.65;
			this.mouse.x = this.touch.aimX * 0.6;
			this.mouse.y = this.touch.aimY * 0.5;
			this.mouse.active = false;
		} else {
			c.turn =
				(this.keys.has("KeyD") || this.keys.has("ArrowRight") ? 1 : 0) -
				(this.keys.has("KeyA") || this.keys.has("ArrowLeft") ? 1 : 0);
			c.throttle =
				(this.keys.has("KeyW") || this.keys.has("ArrowUp") ? 1 : 0) -
				(this.keys.has("KeyS") || this.keys.has("ArrowDown") ? 1 : 0);
			c.fire = this.mouse.down || this.keys.has("KeyJ");
			c.boost = this.keys.has("ShiftLeft") || this.keys.has("ShiftRight");
			c.brake = this.keys.has("KeyS") || this.keys.has("ControlLeft");
		}
		return c;
	}
	pilot(c) {
		if (this.completed) return c;
		if (this.heat > 84) this.aiCooling = true;
		if (this.heat < 28) this.aiCooling = false;
		const target =
			this.entities.find((e) => !e.dead && e.type !== "walker") ||
			this.entities.find((e) => !e.dead && e.type === "walker");
		this.mouse.active = false;
		if (this.tether) {
			c.fire = false;
			c.turn = 0;
			c.boost =
				this.tether.tension < 0.55 && this.tether.angleDone < Math.PI * 1.6;
			return c;
		}
		if (target) {
			this.selected = target;
			const dest = target.pos,
				dx = dest.x - this.player.pos.x,
				dz = dest.z - this.player.pos.z,
				dist = Math.hypot(dx, dz);
			const desired = Math.atan2(dx, dz);
			const diff = angle(desired, this.player.yaw);
			c.turn = clamp(-diff * 2.2, -1, 1);
			c.throttle = dist > 70 ? 0.8 : -0.5;
			c.brake = dist < 50 && target.type !== "walker";
			c.fire =
				target.type !== "walker" && Math.abs(diff) < 0.75 && !this.aiCooling;
			c.boost = dist > 130 && Math.abs(diff) < 0.4;
			if (target.type === "walker" && dist < 55 && this.cableCooldown <= 0)
				c.cable = true;
		} else if (this.stage === 2) {
			const dx = this.ark.pos.x - this.player.pos.x,
				dz = this.ark.pos.z - 25 - this.player.pos.z;
			const dist = Math.hypot(dx, dz);
			const desired = Math.atan2(dx, dz);
			c.turn = clamp(-angle(desired, this.player.yaw) * 2, -1, 1);
			c.throttle = dist > 50 ? 0.5 : -1;
			c.brake = dist < 50;
		}
		return c;
	}
	pause() {
		if (this.ended || this.mode === "loading" || this.mode === "hubwait")
			return;
		if (this.mode === "attract") {
			this.noteInput(this.lastInput);
			return;
		}
		if (this.ui.visible) {
			this.ui.back();
			return;
		}
		if (this.mode === "playing") {
			this.keys.clear();
			this.mouse.down = false;
			this.mode = this.net.active ? "sessionmenu" : "paused";
			this.ui.show("pause");
		} else if (this.mode === "paused" || this.mode === "sessionmenu")
			this.resume();
	}
	resume() {
		if (this.completed) return;
		this.mode = "playing";
		this.keys.clear();
		this.mouse.down = false;
		this.ui.hide();
	}
	toggleCamera() {
		this.settings.camera =
			this.settings.camera === "chase" ? "tactical" : "chase";
		this.saveSettings();
		this.toast(
			this.settings.camera === "chase" ? "Chase camera" : "Tactical camera",
		);
	}
	cycleTarget() {
		const targets = this.entities.filter(
			(e) => !e.dead && (this.stage !== 0 || e.type !== "walker"),
		);
		if (!targets.length) return;
		const i = targets.indexOf(this.selected);
		this.selected = targets[(i + 1) % targets.length];
		this.sound.tone(560, 0.04, "sine", 0.04);
	}
	closestTarget() {
		const p = this.player;
		let best = null,
			bestScore = Infinity;
		for (const e of this.entities) {
			if (e.dead || (e.type === "walker" && this.stage === 0)) continue;
			const dx = e.pos.x - p.pos.x,
				dz = e.pos.z - p.pos.z,
				dist = Math.hypot(dx, dz);
			const diff = Math.abs(angle(Math.atan2(dx, dz), p.yaw));
			const cost = dist + diff * 85 - (e === this.selected ? 90 : 0);
			if (cost < bestScore) {
				bestScore = cost;
				best = e;
			}
		}
		return best;
	}
	tryCable() {
		if (this.tether) {
			this.snapCable(false);
			return;
		}
		if (this.cableCooldown > 0) return;
		let best = null,
			dist = 58;
		for (const e of this.entities) {
			if (e.type !== "walker" || e.dead) continue;
			const d = e.pos.distanceTo(v3(this.player.pos.x, 0, this.player.pos.z));
			if (d < dist) {
				dist = d;
				best = e;
			}
		}
		if (!best) {
			this.toast("Move within 58 m of a walker to launch the tow line.");
			return;
		}
		if (this.stage === 0) {
			this.toast("Clear the scouts first. The refuge needs a clean sky.");
			return;
		}
		const dx = this.player.pos.x - best.pos.x,
			dz = this.player.pos.z - best.pos.z,
			a = Math.atan2(dx, dz);
		const forward = v3(Math.sin(this.player.yaw), 0, Math.cos(this.player.yaw)),
			tangent = v3(Math.cos(a), 0, -Math.sin(a));
		const direction = forward.dot(tangent) >= 0 ? 1 : -1;
		this.tether = {
			target: best,
			radius: clamp(dist, 27, 46),
			angle: a,
			angleDone: 0,
			direction,
			tension: 0.08,
		};
		this.selected = best;
		this.cableLine.visible = true;
		this.sound.cable();
		this.setRadio(
			"FINCH / REAR SEAT",
			"Line is on. Two turns around the legs. Try to look casual.",
			5,
		);
	}
	snapCable(broken = true) {
		if (!this.tether) return;
		this.tether = null;
		this.cableLine.visible = false;
		this.cableCooldown = broken ? 3 : 1;
		if (broken) {
			this.stats.cableSnaps++;
			this.toast("Tow line snapped — cool it, then try again.");
			this.sound.cable();
		} else this.toast("Tow line released.");
	}
	shoot(from, direction, enemy = false, source = null) {
		const d = direction.clone().normalize(),
			mesh = new T.Mesh(
				new T.CylinderGeometry(
					enemy ? 0.16 : 0.13,
					enemy ? 0.16 : 0.13,
					enemy ? 4.6 : 7,
					4,
				),
				new T.MeshBasicMaterial({ color: enemy ? 0xff4f61 : 0xffd17b }),
			);
		mesh.quaternion.setFromUnitVectors(v3(0, 1, 0), d);
		mesh.position.copy(from);
		this.dynamicGroup.add(mesh);
		this.projectiles.push({
			mesh,
			pos: from.clone(),
			dir: d,
			enemy,
			source,
			life: enemy ? 4 : 2.8,
			speed: enemy ? 105 : 240,
		});
		if (!enemy) this.shots++;
		this.sound.laser(enemy);
	}
	shootPlayer() {
		if (this.fireCooldown > 0 || this.overheated) return;
		const p = this.player,
			target =
				this.selected && !this.selected.dead
					? this.selected
					: this.closestTarget();
		let aim = v3(Math.sin(p.yaw), 0.02, Math.cos(p.yaw)),
			aimPoint = null;
		const aiming =
			this.mouse.active ||
			Math.abs(this.mouse.x) + Math.abs(this.mouse.y) > 0.08;
		if (target) {
			const targetPoint = target.pos.clone();
			targetPoint.y = target.type === "walker" ? 17 : target.pos.y;
			const toward = targetPoint.clone().sub(p.pos),
				diff = Math.abs(angle(Math.atan2(toward.x, toward.z), p.yaw));
			const assist =
				this.settings.aimAssist ||
				this.lastInput === "touch" ||
				this.mode === "attract" ||
				this.autopilot;
			const projected = targetPoint.clone().project(this.camera),
				nearReticle =
					Math.hypot(projected.x - this.mouse.x, projected.y - this.mouse.y) <
					0.25;
			if (
				assist &&
				diff < 0.9 &&
				(!aiming || nearReticle || this.mode === "attract" || this.autopilot)
			) {
				aimPoint = targetPoint.addScaledVector(
					target.velocity || v3(),
					toward.length() / 240,
				);
				aim = aimPoint.clone().sub(p.pos).normalize();
			}
		}
		if (!aimPoint && aiming) {
			const ray = new T.Raycaster();
			ray.setFromCamera(new T.Vector2(this.mouse.x, this.mouse.y), this.camera);
			aimPoint = ray.ray.at(300, v3());
			aim = aimPoint.clone().sub(p.pos).normalize();
		}
		if (!aimPoint) aimPoint = p.pos.clone().addScaledVector(aim, 250);
		const right = v3(Math.cos(p.yaw), 0, -Math.sin(p.yaw));
		for (const sign of [-1, 1]) {
			const muzzle = p.pos
				.clone()
				.addScaledVector(right, sign * 3.8)
				.addScaledVector(aim, 4);
			this.shoot(muzzle, aimPoint.clone().sub(muzzle), false, p);
		}
		this.fireCooldown = 0.19;
		this.heat += 7.5;
		if (this.heat >= 100) {
			this.overheated = true;
			this.toast("Cannons hot. Ease off to cool.");
		}
	}
	hitEnemy(e, damage, point) {
		if (e.dead) return;
		this.hits++;
		this.stats.physicsHits++;
		if (e.type === "walker") {
			damage *= 0.15;
			if (this.tether?.target === e && this.tether.angleDone > Math.PI * 2)
				damage *= 4;
			this.spark(point, 0xffd38b, 4);
			if (this.time - (e.lastArmor || -100) > 9) {
				e.lastArmor = this.time;
				this.setRadio(
					"FINCH / REAR SEAT",
					"That armour is winning the argument. Use the tow line.",
					4,
				);
			}
		} else this.spark(point, 0xffb36b, 6);
		e.hp -= damage;
		this.addScore(e.type === "walker" ? 3 : 12);
		if (e.hp <= 0) this.killEnemy(e, e.type === "walker");
	}
	killEnemy(e, topple = false) {
		if (e.dead) return;
		e.dead = true;
		this.colliders.delete(e.collider.handle);
		this.world.removeRigidBody(e.body);
		e.body = null;
		if (topple) {
			this.topples++;
			this.addScore(900);
			toppleAnimation(e);
			this.blast(e.pos.clone().add(v3(0, 15, 0)), true);
			if (this.tether?.target === e) {
				this.tether = null;
				this.cableLine.visible = false;
			}
			this.setRadio(
				"FINCH / REAR SEAT",
				this.topples === 1
					? "Beautiful. It has discovered the horizontal position."
					: "Both giants down. Someone should tell them to take a bow.",
				5,
			);
		} else {
			this.kills++;
			this.addScore(e.type === "ace" ? 1100 : 260);
			this.blast(e.pos, true);
			e.mesh.visible = false;
			this.spawnDebris(e.pos, e.type === "ace" ? 10 : 5);
			if (e.type === "ace")
				this.setRadio(
					"ROOK / FLIGHT LEAD",
					"The ace is out. Bring our people home.",
					4,
				);
		}
		if (this.selected === e) this.selected = null;
	}
	addScore(s) {
		if (this.mode !== "attract") this.score += Math.round(s);
	}
	damagePlayer(amount) {
		if (
			this.mode === "attract" ||
			this.invincible ||
			this.autopilot ||
			this.player.invuln > 0
		)
			return;
		amount *= this.balance.enemyDamage;
		this.player.hp = clamp(this.player.hp - amount, 0, 100);
		this.stats.damageTaken += amount;
		this.player.invuln = 0.3;
		this.damageFlash = 0.8;
		this.sound.blast();
		if (this.player.hp <= 0) {
			this.blast(this.player.pos, true);
			this.endRun(false, "Your skimmer went quiet before the sky did.");
		}
	}
	damageArk(amount) {
		if (this.mode === "attract" || this.invincible || this.autopilot) return;
		this.ark.hp = clamp(
			this.ark.hp - amount * this.balance.enemyDamage,
			0,
			180,
		);
		if (this.ark.hp <= 0) {
			this.blast(this.ark.pos, true);
			this.endRun(false, "The last transport never left the ice.");
		}
	}
	spark(pos, color = 0xffb379, n = 12) {
		for (let i = 0; i < n; i++) {
			const mesh = new T.Mesh(
				new T.TetrahedronGeometry(0.25 + Math.random() * 0.55),
				new T.MeshBasicMaterial({ color }),
			);
			mesh.position.copy(pos);
			this.dynamicGroup.add(mesh);
			this.particles.push({
				mesh,
				vel: v3(
					(Math.random() - 0.5) * 24,
					Math.random() * 16,
					(Math.random() - 0.5) * 24,
				),
				life: 0.3 + Math.random() * 0.5,
				max: 0.8,
			});
		}
	}
	blast(pos, big = false) {
		this.spark(pos, 0xffb665, big ? 36 : 12);
		const burst = comicBurst(this.dynamicGroup, pos, 0xffbd74);
		this.bursts.push({ mesh: burst, life: 0.55 });
		this.sound.blast(big);
	}
	spawnDebris(pos, n = 6) {
		for (let i = 0; i < n; i++) {
			const size = 0.4 + Math.random() * 0.8,
				mesh = piece(
					this.dynamicGroup,
					"box",
					[size * 2, size, size * 2],
					[pos.x, pos.y, pos.z],
					i % 2 ? 0x315268 : 0xe6e9da,
				);
			const body = this.world.createRigidBody(
				RAPIER.RigidBodyDesc.dynamic()
					.setTranslation(
						pos.x + (Math.random() - 0.5) * 4,
						pos.y,
						pos.z + (Math.random() - 0.5) * 4,
					)
					.setLinvel(
						(Math.random() - 0.5) * 18,
						Math.random() * 15,
						(Math.random() - 0.5) * 18,
					)
					.setAngvel({
						x: Math.random() * 5,
						y: Math.random() * 5,
						z: Math.random() * 5,
					}),
			);
			this.world.createCollider(
				RAPIER.ColliderDesc.cuboid(size, 0.5 * size, size)
					.setRestitution(0.3)
					.setFriction(0.7),
				body,
			);
			this.debris.push({ mesh, body, life: 9 });
		}
	}
	setStage(stage) {
		this.stage = stage;
		this.selected = null;
		const chapter = MISSION.chapters[stage];
		this.flash("0" + (stage + 1), chapter.title);
		this.setRadio(chapter.voice, chapter.briefing, 8);
		if (stage === 2) {
			this.escortStarted = true;
			for (const [i, p] of MISSION.escortRaiders.entries())
				this.spawnRaider(p[0], p[1], i + 4);
		}
		this.updateHUD();
	}
	tick(dt, override = null) {
		if (this.ended) return;
		const active =
			["playing", "attract", "sessionmenu"].includes(this.mode) &&
			!this.completed;
		if (!active) {
			if (
				this.mode === "attract" &&
				this.completed &&
				this.time >= this.attractEnd
			)
				this.begin(true);
			if (this.mode === "attract" && this.completed) this.time += dt;
			return;
		}
		if (this.net.active && this.net.hub.time() < 0) return;
		dt *= this.balance.timeScale;
		this.time += dt;
		this.runTime += dt;
		this.uiClock += dt;
		this.player.invuln = Math.max(0, this.player.invuln - dt);
		this.cableCooldown -= dt;
		this.fireCooldown -= dt;
		this.damageFlash = Math.max(0, this.damageFlash - dt * 2);
		const c = override || this.input();
		if (this.mode === "sessionmenu")
			Object.assign(c, {
				turn: 0,
				throttle: 0,
				fire: false,
				boost: false,
				cable: false,
			});
		if (c.cable) this.tryCable();
		const p = this.player;
		let speed =
			this.balance.speed *
			(c.brake ? 0.4 : 1 + Math.max(-0.45, c.throttle * 0.45));
		if (c.boost) {
			speed *= 1.75;
			this.stats.boostSeconds += dt;
		}
		p.speed = lerp(p.speed, speed, Math.min(1, dt * 3));
		this.currentSpeed = p.speed;
		if (this.tether) {
			const t = this.tether,
				w = t.target;
			t.radius = clamp(t.radius + c.turn * dt * 9, 22, 54);
			const rate = p.speed / t.radius;
			t.angle += rate * dt * t.direction;
			t.angleDone += rate * dt;
			t.tension = clamp(
				t.tension +
					dt *
						((c.boost ? 0.18 : -0.2) +
							(Math.abs(t.radius - 36) > 12 ? 0.3 : 0)),
				0,
				1,
			);
			p.pos.x = w.pos.x + Math.sin(t.angle) * t.radius;
			p.pos.z = w.pos.z + Math.cos(t.angle) * t.radius;
			p.yaw = t.angle + (t.direction * Math.PI) / 2;
			if (t.tension >= 1) this.snapCable();
			else if (t.angleDone >= Math.PI * 2 * this.balance.wraps)
				this.killEnemy(w, true);
			if (this.tether) this.updateCable();
		} else {
			p.yaw -=
				c.turn *
				this.balance.turn *
				dt *
				(c.brake ? 1.3 : 1) *
				this.settings.sensitivity;
			p.pos.x += Math.sin(p.yaw) * p.speed * dt;
			p.pos.z += Math.cos(p.yaw) * p.speed * dt;
		}
		p.pos.y = lerp(
			p.pos.y,
			(c.boost ? 12 : 9) + Math.sin(this.time * 2.2) * 0.3,
			dt * 3,
		);
		p.bank = lerp(p.bank, -c.turn * 0.5, dt * 4);
		if (this.tether)
			p.bank = lerp(p.bank, -this.tether.direction * 0.35, dt * 4);
		if (Math.abs(p.pos.x) > 240 || p.pos.z > 290 || p.pos.z < -345) {
			p.pos.x = clamp(p.pos.x, -245, 245);
			p.pos.z = clamp(p.pos.z, -350, 295);
			const desired = Math.atan2(-p.pos.x, -p.pos.z);
			p.yaw += angle(desired, p.yaw) * dt * 1.8;
			if (this.time - (this.boundaryWarn || -100) > 8) {
				this.boundaryWarn = this.time;
				this.setRadio(
					"ROOK / FLIGHT LEAD",
					"The blizzard is worse out there. Turn back into the valley.",
					3,
				);
			}
		}
		p.mesh.position.copy(p.pos);
		p.mesh.rotation.set(0, p.yaw, p.bank);
		p.body.setNextKinematicTranslation(p.pos);
		p.shadow.position.set(p.pos.x, 0.09, p.pos.z);
		p.shadow.rotation.z = -p.yaw;
		p.mesh.visible = !(p.invuln > 0 && Math.floor(this.time * 18) % 2 === 0);
		this.heat = clamp(this.heat - dt * (c.fire ? 8 : 29), 0, 100);
		if (this.overheated && this.heat < 25) this.overheated = false;
		if (c.fire) this.shootPlayer();
		for (const e of this.entities) this.updateEnemy(e, dt);
		this.updateArk(dt);
		for (const cache of this.cache) {
			if (cache.taken) continue;
			if (cache.pos.distanceTo(p.pos) < 8) {
				cache.taken = true;
				cache.mesh.visible = false;
				p.hp = clamp(p.hp + 32, 0, 100);
				this.heat = 0;
				this.overheated = false;
				this.stats.repairs++;
				this.addScore(80);
				this.sound.ping();
				this.toast("Field repair +32 hull · cannons cooled");
			}
		}
		this.world.timestep = dt;
		this.world.step();
		this.checkCollisions();
		this.updateProjectiles(dt);
		this.updateEffects(dt);
		for (const mix of this.mixers) mix.update(dt);
		if (
			this.stage === 0 &&
			this.entities.filter((e) => e.type === "raider").every((e) => e.dead)
		)
			this.setStage(1);
		if (
			this.stage === 1 &&
			this.entities.filter((e) => e.type === "walker").every((e) => e.dead)
		)
			this.setStage(2);
		if (
			this.stage === 2 &&
			this.escortProgress >= 1 &&
			this.entities.every((e) => e.dead)
		) {
			this.endRun(true);
		}
		if (this.uiClock > 0.05) {
			this.uiClock = 0;
			this.updateHUD();
		}
		this.net.tick(
			{
				x: p.pos.x,
				y: p.pos.y,
				z: p.pos.z,
				yaw: p.yaw,
				score: this.score,
				stage: this.stage,
				fire: c.fire,
				live: this.mode !== "attract",
			},
			dt,
		);
	}
	updateEnemy(e, dt) {
		e.age += dt;
		if (e.dead) return;
		if (e.type === "walker") {
			if (this.stage < 1) return;
			e.pos.z += dt * 0.95 * this.balance.pressure;
			e.mesh.position.copy(e.pos);
			e.body.setNextKinematicTranslation({ x: e.pos.x, y: 0, z: e.pos.z });
			e.cooldown -= dt;
			if (e.pos.z > 95) {
				this.damageArk(dt * 2.6);
				if (e.pos.z > 150) e.pos.z = 150;
			}
			if (e.cooldown <= 0) {
				e.cooldown = 6 / this.balance.pressure;
				const muzzle = e.pos.clone().add(v3(0, 18, 23));
				const target =
					this.player.pos.distanceTo(muzzle) < 110
						? this.player.pos
						: this.ark.pos;
				this.shoot(muzzle, target.clone().sub(muzzle), true, e);
			}
			return;
		}
		let dest;
		if (this.stage === 2) {
			dest = this.player.pos.clone().lerp(this.ark.pos, 0.3);
			const a = e.age * 0.29 + e.seed;
			dest.x += Math.sin(a) * 50;
			dest.z += Math.cos(a) * 55;
		} else {
			dest = e.origin.clone();
			dest.x += Math.sin(e.age * 0.26 + e.seed) * 30;
			dest.z += Math.cos(e.age * 0.23 + e.seed) * 24;
		}
		const dx = dest.x - e.pos.x,
			dz = dest.z - e.pos.z,
			dist = Math.hypot(dx, dz);
		const desired = Math.atan2(dx, dz);
		e.yaw += angle(desired, e.yaw) * Math.min(1, dt * 1.5);
		const speed = e.type === "ace" ? 23 : 17;
		if (dist > 5) {
			e.velocity.set(Math.sin(e.yaw) * speed, 0, Math.cos(e.yaw) * speed);
			e.pos.addScaledVector(e.velocity, dt);
		} else e.velocity.set(0, 0, 0);
		e.pos.y = (e.type === "ace" ? 13 : 10) + Math.sin(e.age * 1.6 + e.seed) * 2;
		e.mesh.position.copy(e.pos);
		e.mesh.rotation.y = e.yaw;
		e.body.setNextKinematicTranslation(e.pos);
		e.cooldown -= dt;
		if (e.cooldown <= 0 && e.pos.distanceTo(this.player.pos) < 180) {
			e.cooldown = (e.type === "ace" ? 1.25 : 3.5) / this.balance.pressure;
			const target =
				this.stage === 2 && e.index % 2 === 0 ? this.ark.pos : this.player.pos;
			const lead = target.clone();
			lead.x += Math.sin(this.player.yaw) * this.player.speed * 0.35;
			lead.z += Math.cos(this.player.yaw) * this.player.speed * 0.35;
			this.shoot(
				e.pos.clone().addScaledVector(lead.clone().sub(e.pos).normalize(), 5),
				lead.sub(e.pos),
				true,
				e,
			);
		}
	}
	updateArk(dt) {
		const a = this.ark;
		if (this.stage === 2) {
			const dist = a.pos.distanceTo(this.player.pos);
			if (dist < 145 || this.mode === "attract" || this.autopilot) {
				a.pos.z -= dt * 7;
				this.escortProgress = clamp((160 - a.pos.z) / 440, 0, 1);
			} else if (this.time - (this.escortWarn || -100) > 12) {
				this.escortWarn = this.time;
				this.setRadio(
					"ARK / TRANSPORT",
					"Our escorts are getting rather small. Stay within one-forty metres.",
					4,
				);
			}
			if (!this.aceSpawned && this.escortProgress > 0.36) {
				this.aceSpawned = true;
				this.spawnRaider(36, -150, 7, true);
				this.setRadio(
					"FINCH / REAR SEAT",
					"New contact. Black fins, very bad manners. Keep him off the transport.",
					6,
				);
			}
			if (this.escortProgress >= 1) a.pos.y += dt * 8;
		}
		a.mesh.position.copy(a.pos);
		a.body.setNextKinematicTranslation(a.pos);
		a.shadow.position.set(a.pos.x, 0.08, a.pos.z);
	}
	checkCollisions() {
		if (this.tether) return;
		const p = this.player;
		for (const e of this.entities) {
			if (e.dead) continue;
			const d = Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z);
			const collision =
				e.type === "walker" ? d < 14 : d < 5 && Math.abs(e.pos.y - p.pos.y) < 5;
			if (collision) {
				const dx = p.pos.x - e.pos.x,
					dz = p.pos.z - e.pos.z,
					len = Math.max(0.1, Math.hypot(dx, dz));
				p.pos.x = e.pos.x + (dx / len) * (e.type === "walker" ? 16 : 6);
				p.pos.z = e.pos.z + (dz / len) * (e.type === "walker" ? 16 : 6);
				this.damagePlayer(e.type === "walker" ? 15 : 10);
				p.speed *= 0.7;
			}
		}
	}
	updateCable() {
		const t = this.tether;
		if (!t) return;
		const points = [];
		const wraps = Math.max(0, t.angleDone / (Math.PI * 2));
		for (let i = 0; i < 72; i++) {
			const a = t.angle - t.direction * t.angleDone + (i / 71) * t.angleDone;
			points.push(
				v3(
					t.target.pos.x + Math.sin(a) * 9,
					4 + (i / 71) * 1.5,
					t.target.pos.z + Math.cos(a) * 12,
				),
			);
		}
		points.push(this.player.pos.clone().add(v3(0, -1, -1)));
		this.cableLine.geometry.dispose();
		this.cableLine.geometry = new T.BufferGeometry().setFromPoints(points);
		this.cableLine.visible = true;
	}
	updateProjectiles(dt) {
		for (let i = this.projectiles.length - 1; i >= 0; i--) {
			const p = this.projectiles[i];
			p.life -= dt;
			const distance = p.speed * dt;
			let hit = null;
			const ray = new RAPIER.Ray(p.pos, p.dir);
			hit = this.world.castRay(
				ray,
				distance,
				true,
				undefined,
				undefined,
				undefined,
				p.source?.body,
				(collider) => {
					const c = this.colliders.get(collider.handle);
					if (!c) return false;
					return p.enemy
						? c.type === "player" || c.type === "ark"
						: c.type === "enemy";
				},
			);
			if (hit) {
				const mapped = this.colliders.get(hit.collider.handle),
					point = p.pos.clone().addScaledVector(p.dir, hit.timeOfImpact);
				if (mapped?.type === "enemy")
					this.hitEnemy(mapped.entity, this.balance.laserDamage, point);
				else if (mapped?.type === "player") {
					this.damagePlayer(8);
					this.spark(point, 0xff7d67, 5);
				} else if (mapped?.type === "ark") {
					this.damageArk(6);
					this.spark(point, 0xff7d67, 5);
				}
				p.life = 0;
			}
			p.pos.addScaledVector(p.dir, distance);
			p.mesh.position.copy(p.pos);
			if (p.life <= 0) {
				this.dynamicGroup.remove(p.mesh);
				p.mesh.geometry.dispose();
				p.mesh.material.dispose();
				this.projectiles.splice(i, 1);
			}
		}
	}
	updateEffects(dt) {
		for (let i = this.particles.length - 1; i >= 0; i--) {
			const p = this.particles[i];
			p.life -= dt;
			p.vel.y -= dt * 22;
			p.mesh.position.addScaledVector(p.vel, dt);
			p.mesh.rotation.x += dt * 4;
			p.mesh.scale.setScalar(Math.max(0.01, p.life / p.max));
			if (p.life <= 0) {
				this.dynamicGroup.remove(p.mesh);
				p.mesh.geometry.dispose();
				p.mesh.material.dispose();
				this.particles.splice(i, 1);
			}
		}
		for (let i = this.bursts.length - 1; i >= 0; i--) {
			const b = this.bursts[i];
			b.life -= dt;
			b.mesh.quaternion.copy(this.camera.quaternion);
			b.mesh.scale.setScalar((0.6 - b.life) * 11);
			b.mesh.children[0].material.transparent = true;
			b.mesh.children[0].material.opacity = Math.max(0, b.life * 2);
			if (b.life <= 0) {
				this.dynamicGroup.remove(b.mesh);
				b.mesh.children[0].geometry.dispose();
				b.mesh.children[0].material.dispose();
				this.bursts.splice(i, 1);
			}
		}
		for (let i = this.debris.length - 1; i >= 0; i--) {
			const d = this.debris[i];
			d.life -= dt;
			const p = d.body.translation(),
				q = d.body.rotation();
			d.mesh.position.set(p.x, p.y, p.z);
			d.mesh.quaternion.set(q.x, q.y, q.z, q.w);
			if (d.life <= 0) {
				this.world.removeRigidBody(d.body);
				this.dynamicGroup.remove(d.mesh);
				this.debris.splice(i, 1);
			}
		}
	}
	cameraUpdate(dt) {
		const title =
			["title", "loading"].includes(this.mode) ||
			(this.ui.visible &&
				["title", "help", "network", "about", "settings"].includes(
					this.screen,
				) &&
				!["paused", "sessionmenu"].includes(this.mode));
		if (title) {
			const t = performance.now() * 0.00004;
			const desired = v3(-108 + Math.sin(t) * 16, 48, 150 + Math.cos(t) * 12);
			this.camera.position.lerp(desired, Math.min(1, dt * 2));
			this.cameraTarget.lerp(v3(-4, 17, -25), Math.min(1, dt * 2));
		} else {
			const p = this.player;
			let desired, look;
			if (this.settings.camera === "tactical") {
				desired = p.pos.clone().add(v3(0, 140, 85));
				look = p.pos.clone().add(v3(0, 0, -12));
			} else {
				const f = v3(Math.sin(p.yaw), 0, Math.cos(p.yaw));
				if (this.tether) {
					const radial = p.pos.clone().sub(this.tether.target.pos);
					radial.y = 0;
					radial.normalize();
					desired = p.pos
						.clone()
						.addScaledVector(f, -48)
						.addScaledVector(radial, 28)
						.add(v3(0, 42, 0));
					look = p.pos.clone().lerp(this.tether.target.pos, 0.55);
					look.y = 10;
				} else {
					desired = p.pos
						.clone()
						.addScaledVector(f, -48)
						.add(v3(0, 27, 0));
					look = p.pos.clone().addScaledVector(f, 35);
				}
			}
			this.camera.position.lerp(desired, Math.min(1, dt * 3.4));
			this.cameraTarget.lerp(look, Math.min(1, dt * 4));
			if (this.settings.shake && this.damageFlash > 0) {
				this.camera.position.x +=
					Math.sin(this.time * 80) * this.damageFlash * 0.4;
				this.camera.position.y +=
					Math.cos(this.time * 63) * this.damageFlash * 0.3;
			}
		}
		this.camera.lookAt(this.cameraTarget);
		this.camera.updateMatrixWorld();
	}
	updateGhosts(dt) {
		const visible = new Set();
		for (const [id, p] of this.net.peers) {
			if (!p.live || p.stage !== this.stage) continue;
			visible.add(id);
			let g = this.ghosts.get(id);
			if (!g) {
				const color = new T.Color(p.color || "#86e6e3").getHex(),
					mesh = skimmer(this.mixers, color, true);
				this.scene.add(mesh);
				g = { mesh, name: p.name };
				this.ghosts.set(id, g);
				mesh.position.set(p.x, p.y, p.z);
			}
			g.mesh.visible = true;
			g.mesh.position.lerp(v3(p.x, p.y, p.z), Math.min(1, dt * 10));
			g.mesh.rotation.y = p.yaw;
		}
		for (const [id, g] of this.ghosts)
			if (!visible.has(id)) g.mesh.visible = false;
		const n = this.net.peers.size;
		$("wingStatus").hidden = !this.net.active && n === 0;
		$("wingStatus").textContent = this.net.active
			? this.net.status + " · ECHOES " + n
			: n +
				" WING ECHO" +
				(n === 1 ? "" : "ES") +
				" · BEST " +
				Math.max(
					this.score,
					...[...this.net.peers.values()].map((p) => p.score || 0),
				);
	}
	frame(now) {
		if (!this.ready) return;
		let dt = Math.min(0.06, Math.max(0.001, (now - this.lastFrame) / 1000));
		this.lastFrame = now;
		if (this.manual) return;
		this.pollPad(dt);
		if (
			this.mode === "title" &&
			this.ui.visible &&
			this.screen === "title" &&
			!this.net.active
		) {
			this.idle = Math.max(0, (now - this.lastInteraction) / 1000);
			if (this.idle >= 10) this.begin(true);
		}
		if (
			this.net.active &&
			this.mode === "hubwait" &&
			this.net.started &&
			this.net.hub.time() >= 0
		)
			this.begin(false, true);
		if (["playing", "attract", "sessionmenu"].includes(this.mode))
			this.tick(dt);
		else if (
			this.mode === "title" ||
			(this.ui.visible && this.mode === "title")
		) {
			for (const m of this.mixers) m.update(dt);
			this.time += dt * 0.1;
		}
		this.cameraUpdate(dt);
		this.snow.position.x = Math.sin(now * 0.00003) * 30;
		this.snow.position.z = Math.sin(now * 0.00002) * 25;
		this.updateGhosts(dt);
		if (this.debugPhysics) {
			const buffers = this.world.debugRender();
			this.physicsDebug.geometry.dispose();
			this.physicsDebug.geometry = new T.BufferGeometry();
			this.physicsDebug.geometry.setAttribute(
				"position",
				new T.BufferAttribute(buffers.vertices, 3),
			);
			this.physicsDebug.geometry.setAttribute(
				"color",
				new T.BufferAttribute(buffers.colors, 4),
			);
		}
		this.physicsDebug.visible = this.debugPhysics;
		this.sound.update(
			this.player.speed,
			["playing", "attract", "sessionmenu"].includes(this.mode),
			this.ended,
		);
		this.renderer.render(this.scene, this.camera);
		if (!["playing", "attract", "sessionmenu"].includes(this.mode))
			this.updateHUD();
	}
	updateHUD() {
		if (!this.player) return;
		const p = this.player;
		$("score").textContent = String(this.score).padStart(6, "0");
		$("clock").textContent =
			String(Math.floor(this.runTime / 60)).padStart(2, "0") +
			":" +
			String(Math.floor(this.runTime % 60)).padStart(2, "0");
		$("chapterNo").textContent = "0" + (this.stage + 1) + " / 03";
		const scouts = this.entities.filter(
				(e) => e.type === "raider" && !e.dead,
			).length,
			walkers = this.entities.filter(
				(e) => e.type === "walker" && !e.dead,
			).length;
		$("objective").textContent = MISSION.chapters[this.stage].objective;
		$("objectiveSub").textContent =
			this.stage === 0
				? scouts + " scouts remaining · cannons free"
				: this.stage === 1
					? walkers + " walkers standing · get close to tow"
					: "Ark to jump corridor · " +
						Math.round(this.escortProgress * 100) +
						"%";
		$("hullValue").textContent = Math.ceil(p.hp);
		$("hullFill").style.width = p.hp + "%";
		$("hullFill").style.background = p.hp < 30 ? "#ff5e63" : "#86e6e3";
		$("heatValue").textContent = this.overheated
			? "HOT"
			: Math.round(this.heat);
		$("heatFill").style.width = this.heat + "%";
		$("arkValue").textContent = Math.ceil(this.ark.hp / 1.8);
		$("arkFill").style.width = this.ark.hp / 1.8 + "%";
		$("speedLine").innerHTML =
			Math.round(p.speed * 3)
				.toString()
				.padStart(3, "0") + " KNOTS <span>SKIMMER 07</span>";
		$("hitFlash").style.opacity = this.damageFlash * 0.55;
		$("radio").classList.toggle("visible", this.time < this.radioUntil);
		$("chapterFlash").style.opacity = this.time < this.flashUntil ? "1" : "0";
		$("cableMeter").hidden = !this.tether;
		if (this.tether) {
			$("wrapCount").textContent =
				(this.tether.angleDone / (Math.PI * 2)).toFixed(1) +
				" / " +
				this.balance.wraps;
			$("wrapFill").style.width =
				clamp(
					(this.tether.angleDone / (Math.PI * 2 * this.balance.wraps)) * 100,
					0,
					100,
				) + "%";
			$("tensionFill").style.width = this.tether.tension * 100 + "%";
			$("cableHelp").textContent =
				this.tether.tension > 0.7
					? "LINE STRAIN — RELEASE BOOST"
					: "SMOOTH ORBIT · BOOST ADDS TENSION";
		}
		let near = this.entities.some(
			(e) =>
				e.type === "walker" &&
				!e.dead &&
				e.pos.distanceTo(v3(p.pos.x, 0, p.pos.z)) < 58,
		);
		$("touchAction").hidden =
			this.lastInput !== "touch" || !near || this.stage !== 1;
		$("touchAction").textContent = this.tether ? "CUT" : "TOW";
		this.updateMarkers();
		this.drawScope();
		if (this.ui.visible && this.screen === "dev") this.ui.updateDev();
	}
	updateMarkers() {
		if (!this.camera) return;
		const targets = this.entities.filter(
			(e) => !e.dead && (this.stage !== 0 || e.type !== "walker"),
		);
		if (this.stage === 2)
			targets.push({ type: "ark", pos: this.ark.pos, dead: false });
		const cache = this.cache.find(
			(c) => !c.taken && c.pos.distanceTo(this.player.pos) < 70,
		);
		if (cache) targets.push({ ...cache, type: "repair" });
		const container = $("markers");
		const active = new Set();
		for (const e of targets) {
			const id = e.id || e.type;
			active.add(id);
			let node = container.querySelector('[data-marker="' + id + '"]');
			if (!node) {
				node = document.createElement("div");
				node.dataset.marker = id;
				node.className = "world-marker";
				node.innerHTML =
					'<div class="diamond"></div><strong></strong><em></em>';
				container.append(node);
			}
			let world = e.pos.clone();
			world.y += e.type === "walker" ? 32 : 6;
			const projection = world.clone().project(this.camera);
			const to = world.sub(this.camera.position);
			const behind = to.dot(this.camera.getWorldDirection(v3())) < 0;
			let x = (projection.x * 0.5 + 0.5) * innerWidth,
				y = (-projection.y * 0.5 + 0.5) * innerHeight;
			const off =
				behind ||
				x < 45 ||
				x > innerWidth - 45 ||
				y < 100 ||
				y > innerHeight - 150;
			if (behind) {
				x = innerWidth / 2 + (x - innerWidth / 2) * -1;
				y = innerHeight / 2 + (y - innerHeight / 2) * -1;
			}
			x = clamp(
				x,
				Math.min(100, innerWidth * 0.14),
				innerWidth - Math.min(100, innerWidth * 0.14),
			);
			y = clamp(y, Math.min(120, innerHeight * 0.25), innerHeight * 0.74);
			node.style.left = x + "px";
			node.style.top = y + "px";
			node.className =
				"world-marker" +
				(e === this.selected ? " selected" : "") +
				(["ark", "repair"].includes(e.type) ? " friendly" : "") +
				(off ? " offscreen" : "");
			node.querySelector("strong").textContent =
				e.type === "walker"
					? "ARMOURED WALKER"
					: e.type === "ace"
						? "BLACKFIN ACE"
						: e.type === "ark"
							? "ARK / 38 ABOARD"
							: e.type === "repair"
								? "FIELD REPAIR"
								: "SCOUT";
			node.querySelector("em").textContent =
				Math.round(e.pos.distanceTo(this.player.pos)) + " m";
		}
		for (const n of container.children)
			if (!active.has(n.dataset.marker)) n.remove();
		let mx = 50,
			my = 50;
		if (this.mouse.active && !this.tether) {
			mx = (this.mouse.x * 0.5 + 0.5) * 100;
			my = (-this.mouse.y * 0.5 + 0.5) * 100;
		}
		$("reticle").style.left = mx + "%";
		$("reticle").style.top = my + "%";
		$("reticle").classList.toggle(
			"locked",
			!!this.selected && !this.selected.dead,
		);
	}
	drawScope() {
		const ctx = $("scope").getContext("2d");
		ctx.clearRect(0, 0, 180, 180);
		ctx.save();
		ctx.translate(90, 90);
		ctx.fillStyle = "rgba(11,32,45,.88)";
		ctx.strokeStyle = "rgba(190,226,221,.55)";
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.arc(0, 0, 86, 0, Math.PI * 2);
		ctx.fill();
		ctx.stroke();
		for (const r of [29, 58]) {
			ctx.beginPath();
			ctx.arc(0, 0, r, 0, Math.PI * 2);
			ctx.strokeStyle = "rgba(148,196,203,.2)";
			ctx.stroke();
		}
		ctx.beginPath();
		ctx.moveTo(-86, 0);
		ctx.lineTo(86, 0);
		ctx.moveTo(0, -86);
		ctx.lineTo(0, 86);
		ctx.stroke();
		const dot = (x, z, col, size = 3, square = false) => {
			const dx = (x - this.player.pos.x) * 0.3,
				dz = (z - this.player.pos.z) * 0.3;
			if (Math.hypot(dx, dz) > 82) return;
			ctx.fillStyle = col;
			ctx.beginPath();
			if (square) ctx.rect(dx - size, dz - size, size * 2, size * 2);
			else ctx.arc(dx, dz, size, 0, Math.PI * 2);
			ctx.fill();
		};
		for (const e of this.entities)
			if (!e.dead)
				dot(
					e.pos.x,
					e.pos.z,
					e.type === "walker" ? "#ff9c5a" : "#ff6470",
					e.type === "walker" ? 4 : 2.8,
					e.type === "walker",
				);
		for (const c of this.cache)
			if (!c.taken) dot(c.pos.x, c.pos.z, "#85dfcf", 2);
		dot(this.ark.pos.x, this.ark.pos.z, "#e7d6a0", 4, true);
		for (const p of this.net.peers.values())
			if (p.stage === this.stage) dot(p.x, p.z, p.color || "#86e6e3", 3);
		ctx.rotate(-this.player.yaw);
		ctx.fillStyle = "#f4efdc";
		ctx.beginPath();
		ctx.moveTo(0, 8);
		ctx.lineTo(-4, -5);
		ctx.lineTo(0, -3);
		ctx.lineTo(4, -5);
		ctx.closePath();
		ctx.fill();
		ctx.restore();
	}
	flash(no, text) {
		$("chapterFlash").innerHTML =
			"<small>FLIGHT COMIC / CHAPTER " + no + "</small>" + text;
		this.flashUntil = this.time + 4;
	}
	setRadio(name, text, duration = 5) {
		$("radioName").textContent = name;
		$("radioText").textContent = text;
		this.radioUntil = this.time + duration;
		this.sound.voice(text);
	}
	toast(text) {
		$("toast").textContent = text;
		$("toast").classList.add("visible");
		clearTimeout(this.toastTimer);
		this.toastTimer = setTimeout(
			() => $("toast").classList.remove("visible"),
			2800,
		);
	}
	resize() {
		if (!this.renderer) return;
		this.camera.aspect = innerWidth / innerHeight;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(innerWidth, innerHeight);
	}
	snapshot() {
		return {
			ready: this.ready,
			title: GAME_META.aiHub.name,
			mode: this.mode,
			screen: this.screen,
			stage: this.stage,
			score: this.score,
			time: this.time,
			hp: this.player?.hp,
			arkHp: this.ark?.hp,
			heat: this.heat,
			overheated: this.overheated,
			pos: this.player
				? { x: this.player.pos.x, y: this.player.pos.y, z: this.player.pos.z }
				: null,
			yaw: this.player?.yaw,
			kills: this.kills,
			topples: this.topples,
			remaining: this.entities
				.filter((e) => !e.dead)
				.map((e) => ({ type: e.type, hp: e.hp, x: e.pos.x, z: e.pos.z })),
			tether: this.tether
				? {
						wraps: this.tether.angleDone / (Math.PI * 2),
						tension: this.tether.tension,
					}
				: null,
			escort: this.escortProgress,
			won: this.won,
			completed: this.completed,
			backend: this.backend,
			physics: this.physicsVersion,
			animations: this.mixers.length,
			stats: this.stats,
			lastInput: this.lastInput,
			net: {
				active: this.net.active,
				sent: this.net.sent,
				received: this.net.received,
				peers: this.net.peers.size,
				ended: this.net.ended,
			},
			music: this.settings.music,
		};
	}
	publishAPI() {
		const api = {
			snapshot: () => this.snapshot(),
			audioProbe: () => this.sound.offlineProbe(),
			audioLevel: () => this.sound.level(),
		};
		if (this.testMode)
			Object.assign(api, {
				game: this,
				pauseClock: () => {
					this.manual = true;
				},
				run: (seconds, ai = false, controls = null) => {
					this.manual = true;
					this.autopilot = ai;
					let n = Math.round(seconds * 60);
					while (n-- > 0) this.tick(1 / 60, controls);
					this.cameraUpdate(0.2);
					this.updateHUD();
					return this.snapshot();
				},
				render: async () => {
					this.cameraUpdate(1);
					this.updateHUD();
					await this.renderer.renderAsync(this.scene, this.camera);
				},
				resumeClock: () => {
					this.manual = false;
					this.lastFrame = performance.now();
				},
			});
		window.__POSE__ = api;
	}
}
const game = new Game();
game.init().catch((error) => {
	console.error(error);
	feedback.textContent = "The flight systems could not start: " + error.message;
	const p = document.createElement("p");
	p.textContent =
		"Open this file in a current Chrome, Edge, or Safari browser. WebGPU is preferred; WebGL 2 is supported.";
	feedback.after(p);
	window.__POSE__ = {
		snapshot: () => ({ ready: false, error: String(error) }),
	};
	if (window.AIHub.active) window.AIHub.fail(String(error));
});
