import RAPIER from "@dimforge/rapier3d-compat";
import { JungleAudio } from "./audio.js";
import { GhostNetwork } from "./network.js";
import { C, JungleScene } from "./scene.js";
import { JungleUI } from "./ui.js";

const $ = (id) => document.getElementById(id);
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const DEFAULTS = {
	speed: 6.2,
	jump: 15.5,
	gravity: 23,
	swing: 1.15,
	hazard: 1,
	airDrain: 8,
};
class JungleZip {
	constructor() {
		this.scene = new JungleScene($("game"));
		this.audio = new JungleAudio();
		this.inputType = matchMedia("(pointer:coarse)").matches
			? "touch"
			: "keyboard";
		this.settings = {
			music: 0.1,
			effects: 0.65,
			glyphs: "ps",
			assist: true,
			shake: !matchMedia("(prefers-reduced-motion:reduce)").matches,
		};
		try {
			Object.assign(
				this.settings,
				JSON.parse(localStorage.getItem("jungle-zip-settings") || "{}"),
			);
			this.best = +localStorage.getItem("jungle-zip-record") || 0;
		} catch {
			this.best = 0;
		}
		this.tuning = { ...DEFAULTS };
		this.stages = [
			{
				name: "The Canopy Caper",
				goal: "Cross the canopy. Mind the gap.",
				end: 67,
			},
			{
				name: "Crocodile Current",
				goal: "Cross the river. Remember to breathe.",
				end: 90,
			},
			{
				name: "Boulder Bluff",
				goal: "Jump the low ones. Duck the high ones.",
				end: 92,
			},
			{
				name: "The Tea Temple",
				goal: "Free Professor Pip at the brass wheel.",
				end: 64,
			},
		];
		this.ui = new JungleUI(this);
		this.net = new GhostNetwork(this);
		this.keys = new Set();
		this.padPrev = [];
		this.lastInput = performance.now();
		this.stage = 0;
		this.mode = "loading";
		this.score = 0;
		this.health = 5;
		this.timer = 300;
		this.elapsed = 0;
		this.collected = 0;
		this.air = 100;
		this.face = 1;
		this.loop = 0;
		this.attract = false;
		this.autopilot = false;
		this.god = false;
		this.devUsed = false;
		this.pausedFrom = "play";
		this.clock = 0;
		this.stageClock = 0;
		this.invincible = 0;
		this.actionCooldown = 0;
		this.jumpBuffer = 0;
		this.coyote = 0;
		this.grabCooldown = 0;
		this.lastVine = -1;
		this.vine = -1;
		this.rescue = 0;
		this.events = {
			jumps: 0,
			grabs: 0,
			swats: 0,
			stuns: 0,
			ducks: 0,
			hits: 0,
			breaths: 0,
			stages: [],
			rescued: false,
		};
		this.testOverride = null;
		this.fixedAccumulator = 0;
		this.bindInput();
		addEventListener("pagehide", (event) => {
			if (event.persisted) return;
			cancelAnimationFrame(this.raf);
			this.audio.stop();
			this.scene.dispose();
		});
	}
	async init() {
		await Promise.all([RAPIER.init(), this.scene.init()]);
		this.applySettings();
		this.loadStage(0);
		$("loader").classList.add("hidden");
		window.__jungleZip = this;
		window.__gameReady = true;
		const hub = await this.net.initHub();
		if (!hub) this.title();
		else this.ui.hud();
		let last = performance.now();
		const frame = (now) => {
			const realDt = (now - last) / 1000;
			const dt = Math.min(realDt, 0.06);
			last = now;
			if (!this.testing) {
				this.pollPad();
				this.fixedAccumulator += dt;
				while (this.fixedAccumulator >= 1 / 60) {
					this.step(1 / 60);
					this.fixedAccumulator -= 1 / 60;
				}
				this.net.tick(realDt);
				this.ui.tick(realDt);
				this.scene.render();
			}
			this.raf = requestAnimationFrame(frame);
		};
		requestAnimationFrame(frame);
	}
	applySettings() {
		this.audio.musicVolume = this.settings.music;
		this.audio.sfxVolume = this.settings.effects;
		this.audio.apply();
		try {
			localStorage.setItem(
				"jungle-zip-settings",
				JSON.stringify(this.settings),
			);
		} catch {}
	}
	applyTuning() {
		if (this.world) this.world.gravity.y = -this.tuning.gravity;
	}
	resetTuning() {
		this.tuning = { ...DEFAULTS };
		this.god = false;
		this.autopilot = false;
		this.applyTuning();
	}
	activity(type) {
		const wasAttract = this.attract;
		const changed = type && this.inputType !== type;
		this.lastInput = performance.now();
		if (type) this.inputType = type;
		if (changed) this.ui.refreshPrompts();
		document.body.classList.toggle("touch-mode", this.inputType === "touch");
		$("touch").classList.toggle("hidden", this.inputType !== "touch");
		if (wasAttract) {
			this.attract = false;
			this.autopilot = false;
			this.god = false;
			this.title();
			return true;
		}
		return false;
	}
	bindInput() {
		addEventListener("resize", () => this.scene.resize());
		addEventListener("keydown", (e) => {
			if (this.net.ended) return;
			const isText =
				["TEXTAREA", "INPUT"].includes(e.target.tagName) &&
				e.target.type !== "range" &&
				e.target.type !== "checkbox";
			if (isText && e.code !== "Escape") return;
			if (this.activity("keyboard")) {
				e.preventDefault();
				return;
			}
			if (!e.repeat) this.audio.init();
			const menu = !this.ui.panel.classList.contains("hidden");
			if (e.code === "Escape" || e.code === "KeyP") {
				e.preventDefault();
				if (this.ui.screen === "title") return;
				if (menu && this.ui.screen !== "pause") this.ui.back();
				else this.pause();
				return;
			}
			if (menu) {
				if (["ArrowDown", "KeyS", "ArrowUp", "KeyW"].includes(e.code)) {
					e.preventDefault();
					if (!e.repeat)
						this.ui.navigate(["ArrowDown", "KeyS"].includes(e.code) ? 1 : -1);
				}
				if (["ArrowLeft", "KeyA", "ArrowRight", "KeyD"].includes(e.code)) {
					e.preventDefault();
					this.ui.adjust(["ArrowLeft", "KeyA"].includes(e.code) ? -1 : 1);
				}
				if (["Enter", "Space"].includes(e.code)) {
					e.preventDefault();
					if (!e.repeat) this.ui.activate();
				}
				return;
			}
			if (
				["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
					e.code,
				)
			)
				e.preventDefault();
			this.keys.add(e.code);
			if (!e.repeat && e.code === "Space") this.jumpBuffer = 0.18;
		});
		addEventListener("keyup", (e) => this.keys.delete(e.code));
		addEventListener("blur", () => {
			this.keys.clear();
			this.pointerAttack = false;
			if (this.mode === "play" && !this.net.hub && !this.attract) this.pause();
		});
		addEventListener("pointermove", (e) => {
			if (e.pointerType === "mouse" && e.movementX + e.movementY !== 0) {
				if (this.attract) {
					this.activity("keyboard");
					return;
				}
				this.lastInput = performance.now();
				if (this.inputType !== "keyboard") {
					this.inputType = "keyboard";
					document.body.classList.remove("touch-mode");
				}
				this.aimX = e.clientX;
			}
		});
		addEventListener("pointerdown", (e) => {
			if (this.net.ended) return;
			if (this.activity(e.pointerType === "touch" ? "touch" : "keyboard")) {
				e.preventDefault();
				return;
			}
			this.audio.init();
		});
		$("game").addEventListener("pointerdown", (e) => {
			if (this.mode !== "play") return;
			if (e.pointerType === "touch") {
				if (e.clientX < innerWidth * 0.5) {
					this.touchMove = {
						id: e.pointerId,
						x: e.clientX,
						y: e.clientY,
						dx: 0,
						dy: 0,
					};
					const st = $("touch-stick");
					st.style.display = "block";
					st.style.left = `${e.clientX}px`;
					st.style.top = `${e.clientY}px`;
				} else {
					this.touchActionId = e.pointerId;
					this.jumpBuffer = 0.18;
					this.pointerAttack = true;
				}
				e.target.setPointerCapture(e.pointerId);
			} else {
				this.pointerAttack = true;
				if (this.stage === 0) this.jumpBuffer = 0.18;
				this.face =
					(e.clientX / innerWidth) * 2 - 1 <
					this.scene.player.root.position.clone().project(this.scene.camera).x
						? -1
						: 1;
			}
		});
		addEventListener("pointermove", (e) => {
			if (this.touchMove?.id === e.pointerId) {
				this.touchMove.dx = clamp((e.clientX - this.touchMove.x) / 50, -1, 1);
				this.touchMove.dy = clamp((e.clientY - this.touchMove.y) / 50, -1, 1);
				$("touch-stick").firstElementChild.style.transform =
					`translate(${this.touchMove.dx * 28}px,${this.touchMove.dy * 28}px)`;
			}
		});
		const release = (e) => {
			if (this.touchMove?.id === e.pointerId) {
				this.touchMove = null;
				$("touch-stick").style.display = "none";
			}
			if (this.touchActionId === e.pointerId || e.pointerType === "mouse") {
				this.pointerAttack = false;
				this.touchActionId = null;
			}
		};
		addEventListener("pointerup", release);
		addEventListener("pointercancel", release);
		$("touch-action").onpointerdown = (e) => {
			e.stopPropagation();
			this.audio.init();
			this.pointerAttack = true;
			this.touchActionId = e.pointerId;
			e.target.setPointerCapture(e.pointerId);
		};
		$("touch-action").onpointerup = release;
		addEventListener("contextmenu", (e) => {
			if (e.target.id === "game") e.preventDefault();
		});
	}
	pollPad() {
		if (this.net.ended) return;
		const pads = navigator.getGamepads?.() || [];
		const p = [...pads].find((p) => p?.connected);
		this.pad = null;
		if (!p) {
			this.padPrev = [];
			return;
		}
		const b = p.buttons.map((x) => x.pressed);
		const axes = p.axes.map((x) => (Math.abs(x) > 0.18 ? x : 0));
		const edge = (i) => b[i] && !this.padPrev[i];
		const active =
			b.some((x, i) => x && !this.padPrev[i]) ||
			axes.some((x) => Math.abs(x) > 0.3);
		if (active && this.activity("pad")) {
			this.padPrev = b;
			return;
		}
		if (active) this.audio.init();
		if (edge(9) && !b[8]) this.pause();
		const menu = !this.ui.panel.classList.contains("hidden");
		if (menu) {
			if (Math.abs(axes[3] || 0) > 0.25) {
				const modal = this.ui.panel.querySelector(".modal");
				if (modal) modal.scrollTop += axes[3] * 25;
			}
			const now = performance.now();
			if (now > (this.padMenuTime || 0)) {
				const dir =
					b[13] || axes[1] > 0.5 ? 1 : b[12] || axes[1] < -0.5 ? -1 : 0;
				if (dir) {
					this.ui.navigate(dir);
					this.padMenuTime = now + 190;
				}
				const horizontal =
					b[15] || axes[0] > 0.5 ? 1 : b[14] || axes[0] < -0.5 ? -1 : 0;
				if (horizontal) {
					this.ui.adjust(horizontal);
					this.padMenuTime = now + 150;
				}
			}
			if (edge(0)) this.ui.activate();
			if (edge(1) && this.ui.screen !== "title") this.ui.back();
		} else {
			this.pad = {
				x: axes[0] || (b[15] ? 1 : b[14] ? -1 : 0),
				y: -(axes[1] || (b[13] ? 1 : b[12] ? -1 : 0)),
				attack: b[2] || b[7],
				duck: b[1] || b[13],
			};
			if (edge(0)) this.jumpBuffer = 0.18;
		}
		this.padPrev = b;
	}
	controls() {
		if (this.testOverride)
			return {
				...{ x: 0, y: 0, attack: false, duck: false, jump: false },
				...this.testOverride,
			};
		if (this.autopilot || this.attract) return this.bot();
		const x =
			(this.keys.has("KeyD") || this.keys.has("ArrowRight") ? 1 : 0) -
			(this.keys.has("KeyA") || this.keys.has("ArrowLeft") ? 1 : 0);
		const y =
			(this.keys.has("KeyW") || this.keys.has("ArrowUp") ? 1 : 0) -
			(this.keys.has("KeyS") || this.keys.has("ArrowDown") ? 1 : 0);
		const m = this.touchMove;
		return {
			x: clamp(x + (this.pad?.x || 0) + (m?.dx || 0), -1, 1),
			y: clamp(y + (this.pad?.y || 0) - (m?.dy || 0), -1, 1),
			attack:
				this.keys.has("KeyF") ||
				this.keys.has("KeyE") ||
				this.keys.has("KeyJ") ||
				this.pad?.attack ||
				this.pointerAttack,
			duck:
				this.keys.has("KeyS") ||
				this.keys.has("ArrowDown") ||
				this.pad?.duck ||
				(m?.dy || 0) > 0.5,
			jump: false,
		};
	}
	title() {
		if (this.net.hub) return;
		this.mode = "title";
		this.attract = false;
		this.autopilot = false;
		this.god = false;
		this.loop = 0;
		this.keys.clear();
		this.pointerAttack = false;
		this.lastInput = performance.now();
		this.loadStage(0);
		this.ui.title();
		this.ui.hud();
		$("network-status").classList.add("hidden");
		this.scene.camera.position.set(15, 7, 30);
		this.scene.player.root.position.set(20, 3.6, 1);
		this.scene.player.play("hang");
	}
	start(attract = false, network = false, keepLoop = false) {
		if (this.net.hub && this.net.ended) return;
		if (!keepLoop) this.loop = 0;
		this.attract = attract;
		this.autopilot = attract;
		this.god = attract;
		this.devUsed = false;
		this.score = 0;
		this.health = 5;
		this.air = 100;
		this.collected = 0;
		this.timer = 300;
		this.elapsed = 0;
		this.clock = 0;
		this.mode = "play";
		this.tuning = { ...DEFAULTS };
		this.net.resultSent = false;
		this.wasSurface = false;
		this.events = {
			jumps: 0,
			grabs: 0,
			swats: 0,
			stuns: 0,
			ducks: 0,
			hits: 0,
			breaths: 0,
			stages: [],
			rescued: false,
		};
		this.keys.clear();
		this.pointerAttack = false;
		this.jumpBuffer = 0;
		this.loadStage(0);
		this.ui.hide();
		this.ui.toast(
			attract
				? "A small hat. A very large adventure."
				: "Find Pip. Save teatime.",
			2.5,
		);
		this.ui.hud();
		if (!network && !attract) {
			this.audio.init();
			this.audio.wake();
			this.audio.voice(1);
		}
	}
	loadStage(stage) {
		if (this.mode === "pause") this.pausedFrom = "play";
		if (this.world) this.world.free();
		this.stage = stage;
		this.stageClock = 0;
		this.world = new RAPIER.World({ x: 0, y: -this.tuning.gravity, z: 0 });
		this.world.timestep = 1 / 60;
		this.scene.build(stage);
		const ground = (x, width, top = 0) => {
			const b = this.world.createRigidBody(
				RAPIER.RigidBodyDesc.fixed().setTranslation(x, top - 2, 0),
			);
			this.world.createCollider(
				RAPIER.ColliderDesc.cuboid(width / 2, 2, 3)
					.setCollisionGroups(0x0001ffff)
					.setFriction(0.1),
				b,
			);
		};
		if (stage === 0) {
			ground(-1, 14);
			ground(73, 22);
		} else ground(45, 120, stage === 1 ? -7 : 0);
		this.body = this.world.createRigidBody(
			RAPIER.RigidBodyDesc.dynamic()
				.setTranslation(3, stage === 1 ? 5.9 : 0.92, 0)
				.lockRotations()
				.setCcdEnabled(true),
		);
		this.body.setEnabledTranslations(true, true, false, true);
		this.collider = this.world.createCollider(
			RAPIER.ColliderDesc.capsule(0.5, 0.35)
				.setMass(1)
				.setFriction(0)
				.setCollisionGroups(0x00080003),
			this.body,
		);
		if (stage === 1) this.body.setGravityScale(0, true);
		this.vine = -1;
		this.lastVine = -1;
		this.grabCooldown = 0;
		this.checkpoint = { x: 3, y: stage === 1 ? 5.9 : 0.92, vine: -1 };
		this.air = 100;
		this.invincible = 1.2;
		this.actionCooldown = 0;
		this.rescue = 0;
		this.stageTransition = 0;
		this.scene.tick(0.001, 0);
		if (stage === 0) this.attach(0, false);
		for (const e of this.scene.enemies) {
			if (e.kind === "boulder") {
				e.radius = e.big ? 1.1 : 0.67;
				e.body = this.world.createRigidBody(
					RAPIER.RigidBodyDesc.dynamic()
						.setTranslation(e.x, 3 + (e.phase % 3), 0)
						.setLinvel(-3.3, 0, 0)
						.setCcdEnabled(true),
				);
				e.body.setEnabledTranslations(true, true, false, true);
				this.world.createCollider(
					RAPIER.ColliderDesc.ball(e.radius)
						.setRestitution(e.big ? 0.96 : 0.71)
						.setRestitutionCombineRule(RAPIER.CoefficientCombineRule.Max)
						.setFriction(0)
						.setCollisionGroups(0x00040001),
					e.body,
				);
				e.collider = this.world.createCollider(
					RAPIER.ColliderDesc.ball(e.radius)
						.setSensor(true)
						.setCollisionGroups(0x00020008),
					e.body,
				);
			} else {
				e.body = this.world.createRigidBody(
					RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
						e.x,
						e.kind === "croc" ? e.y : 0.9,
						0,
					),
				);
				e.collider = this.world.createCollider(
					RAPIER.ColliderDesc.cuboid(
						e.kind === "croc" ? 1.5 : 0.8,
						e.kind === "croc" ? 0.3 : 0.85,
						0.7,
					)
						.setSensor(true)
						.setCollisionGroups(0x00020008),
					e.body,
				);
			}
		}
		this.events?.stages.push(stage);
		this.scene.camera.position.x = stage === 0 ? 12 : 7;
		this.scene.camera.position.y = stage === 1 ? 4.2 : 6.7;
	}
	position() {
		return this.body?.translation() || { x: 0, y: 0, z: 0 };
	}
	setBody(x, y, vx = 0, vy = 0) {
		this.jumpBuffer = 0;
		this.coyote = 0;
		this.vine = -1;
		this.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
		this.body.setTranslation({ x, y, z: 0 }, true);
		this.body.setLinvel({ x: vx, y: vy, z: 0 }, true);
		this.body.setGravityScale(this.stage === 1 ? 0 : 1, true);
	}
	attach(i, award = true) {
		const v = this.scene.vines[i];
		if (!v) return;
		this.vine = i;
		this.body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
		this.body.setTranslation({ x: v.tip.x, y: v.tip.y - 1.25, z: 0 }, true);
		this.body.setNextKinematicTranslation({
			x: v.tip.x,
			y: v.tip.y - 1.25,
			z: 0,
		});
		this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
		if (i > this.lastVine) {
			this.lastVine = i;
			this.checkpoint = { x: v.tip.x, y: v.tip.y - 1.25, vine: i };
			if (award) {
				this.score += 150;
				this.events.grabs++;
				this.audio.sfx("grab");
				this.scene.burst(v.tip.x, v.tip.y, C.lime, 8);
			}
		}
		this.grabCooldown = 0.16;
	}
	release(c) {
		const v = this.scene.vines[this.vine];
		if (!v) return;
		const direction = c.x < -0.2 ? -1 : 1;
		const vx =
			direction *
			Math.max(
				this.tuning.speed * 1.55,
				Math.abs(v.velocity.x) * this.tuning.swing + this.tuning.speed * 0.35,
			);
		const vy = 10.5 + Math.max(0, v.velocity.y) * 0.4;
		this.setBody(v.tip.x, v.tip.y - 1.25, vx, vy);
		this.airSteerLock = 0.6;
		this.grabCooldown = 0.32;
		this.events.jumps++;
		this.audio.sfx("jump");
		this.jumpBuffer = 0;
	}
	respawn() {
		if (this.stage === 0 && this.checkpoint.vine >= 0)
			this.attach(this.checkpoint.vine, false);
		else this.setBody(this.checkpoint.x, this.checkpoint.y);
		this.air = 100;
		this.invincible = 2.3;
		this.grabCooldown = 0.3;
	}
	damage(reason) {
		if (this.invincible > 0 || this.god || this.attract) {
			if (reason === "fall" && this.position().y < -6) this.respawn();
			return;
		}
		this.health--;
		this.events.hits++;
		this.audio.sfx("hit");
		this.scene.burst(this.position().x, this.position().y, C.orange, 18);
		this.shake = 0.35;
		if (this.health <= 0) {
			this.finish(
				false,
				reason === "air"
					? "All that water, and still no proper cup of tea."
					: "Pip can wait for another expedition. Your hat needs a rest.",
			);
			return;
		}
		this.ui.toast(
			reason === "air"
				? "Air, dear explorer. Air!"
				: reason === "fall"
					? "A slight miscalculation."
					: "Mind your hat!",
			1.5,
		);
		this.respawn();
	}
	bot() {
		const p = this.position(),
			c = { x: 1, y: 0, attack: true, duck: false, jump: false };
		if (this.stage === 0) {
			if (this.vine >= 0) {
				const v = this.scene.vines[this.vine];
				const n = this.scene.vines[this.vine + 1];
				c.jump =
					v.root.rotation.z > 0.08 &&
					v.velocity.x > 1.5 &&
					(!n || n.tip.x - v.tip.x < 10.5);
				if (this.stageClock > 10 + this.lastVine * 5 && this.attract)
					c.jump = true;
			} else if (p.y < 1.4 && p.x < 6) c.jump = true;
		}
		if (this.stage === 1) {
			const target =
				this.air < 42 || p.x > 78 ? 6.15 : 2.6 + Math.sin(p.x * 0.14) * 2;
			c.y = clamp((target - p.y) * 1.5, -1, 1);
		}
		if (this.stage === 2) {
			const danger = this.scene.enemies
				.filter(
					(e) => e.root.position.x - p.x > -0.5 && e.root.position.x - p.x < 7,
				)
				.sort((a, b) => a.root.position.x - b.root.position.x);
			if (danger.length) {
				const e = danger[0],
					dx = e.root.position.x - p.x;
				const predict = (duration) => {
					let y = e.body.translation().y,
						vy = e.body.linvel().y;
					for (let t = 0; t < duration; t += 1 / 60) {
						vy -= this.tuning.gravity / 60;
						y += vy / 60;
						if (y < e.radius) {
							y = e.radius;
							vy = Math.abs(vy) * (e.big ? 0.96 : 0.71);
						}
					}
					return y;
				};
				const speed = e.big ? 3.8 : 4.8;
				const eta = Math.max(
					0,
					(dx - e.radius - 0.35) / (this.tuning.speed + speed),
				);
				c.duck = e.big && predict(eta) - e.radius > 1.2;
				if (c.duck) {
					const later = Math.max(
						0,
						(dx - e.radius - 0.35) / (this.tuning.speed * 0.42 + speed),
					);
					c.duck = predict(later) - e.radius > 0.9;
				}
				c.jump = !c.duck && dx < 6;
			}
		}
		if (this.stage === 3) {
			const danger = this.scene.enemies.some(
				(e) =>
					e.stun <= 0 &&
					e.root.position.x - p.x > 0 &&
					e.root.position.x - p.x < 4,
			);
			c.jump = danger;
			if (p.x > 50) {
				c.x = p.x > 52.3 ? -0.3 : p.x < 51.6 ? 0.3 : 0;
				c.attack = true;
			}
		}
		return c;
	}
	pause() {
		if (
			["title", "loading", "hub-wait", "ended", "win", "lose"].includes(
				this.mode,
			) ||
			this.attract
		)
			return;
		if (this.mode === "pause") {
			this.resume();
			return;
		}
		this.pausedFrom = this.mode;
		this.mode = "pause";
		this.ui.pause();
		this.keys.clear();
		this.pointerAttack = false;
	}
	resume() {
		if (this.mode !== "pause") return;
		this.mode = this.pausedFrom;
		this.ui.hide();
		this.keys.clear();
		this.jumpBuffer = 0;
		this.audio.wake();
	}
	completeStage() {
		if (this.stageTransition > 0 || this.mode !== "play") return;
		this.score += 500;
		const recovered = this.health < 5;
		this.health = Math.min(5, this.health + 1);
		this.stageTransition = 2;
		this.mode = "transition";
		this.audio.sfx("stamp");
		this.ui.toast(
			["CANOPY CLEARED!", "RIVER CROSSED!", "BLUFF CONQUERED!"][this.stage] +
				(recovered ? " · +1 LIFE" : ""),
			2,
		);
	}
	finish(won, message) {
		if (["win", "lose", "ended"].includes(this.mode)) return;
		this.mode = won ? "win" : "lose";
		if (won) {
			this.events.rescued = true;
			this.score += Math.floor(this.timer) * 15 + this.health * 250;
			this.scene.player.play("cheer");
			this.scene.pal?.play("cheer");
			if (this.scene.pal) {
				this.scene.world.attach(this.scene.pal.root);
				if (this.scene.cageBars) this.scene.cageBars.visible = false;
			}
			this.audio.sfx("win");
			this.scene.burst(54, 5, C.gold, 45);
		}
		this.net.report();
		if (!this.attract && !this.devUsed && this.score > this.best) {
			this.best = this.score;
			try {
				localStorage.setItem("jungle-zip-record", String(this.best));
			} catch {}
		}
		this.resultWait = 0;
		if (!this.attract) this.ui.finish(won, message);
	}
	step(dt) {
		this.clock += dt;
		this.ui.toastLeft = Math.max(0, this.ui.toastLeft);
		if (this.mode === "title") {
			this.scene.tick(dt, this.clock);
			this.scene.follow(12, 5, dt, true);
			const v = this.scene.vines[1];
			this.scene.player.root.position.set(v.tip.x, v.tip.y - 2.1, 1);
			this.scene.player.play("hang");
			if (
				performance.now() - this.lastInput >= 10000 &&
				!this.net.connected &&
				this.ui.screen === "title"
			)
				this.start(true);
			this.audio.tick(false, 0);
			return;
		}
		if (this.mode === "ended" || this.mode === "hub-wait") return;
		if (this.mode === "pause") {
			if (this.net.hub) {
				this.timer = Math.max(0, this.timer - dt);
				this.elapsed += dt;
			}
			this.audio.tick(false, this.stage);
			return;
		}
		if (["win", "lose"].includes(this.mode)) {
			this.scene.tick(dt, this.clock);
			if (this.mode === "win" && this.scene.pal) {
				const pal = this.scene.pal.root.position;
				pal.x += (this.position().x + 1.8 - pal.x) * Math.min(1, dt * 2.2);
				pal.y += (0.03 - pal.y) * Math.min(1, dt * 2.2);
				pal.z = 0.7;
			}
			this.resultWait += dt;
			if (this.attract && this.resultWait > 4) this.start(true);
			this.audio.tick(!this.attract, this.stage);
			return;
		}
		if (this.net.hub && AIHub.time() < 0) return;
		if (this.mode === "transition") {
			this.scene.tick(dt, this.clock);
			this.stageTransition -= dt;
			if (this.stageTransition <= 0) {
				this.loadStage(this.stage + 1);
				this.mode = "play";
			}
			this.audio.tick(!this.attract, this.stage);
			return;
		}
		if (this.mode !== "play") return;
		this.stageClock += dt;
		this.elapsed += dt;
		this.timer = Math.max(0, this.timer - dt);
		if (this.timer <= 0 && !this.god) {
			this.finish(false, "Teatime waits for no explorer.");
			return;
		}
		this.scene.tick(dt, this.clock);
		this.invincible = Math.max(0, this.invincible - dt);
		this.actionCooldown = Math.max(0, this.actionCooldown - dt);
		this.grabCooldown = Math.max(0, this.grabCooldown - dt);
		this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
		this.airSteerLock = Math.max(0, (this.airSteerLock || 0) - dt);
		const c = this.controls();
		if (c.jump) this.jumpBuffer = 0.12;
		let p = this.position(),
			vel = this.body.linvel();
		if (Math.abs(c.x) > 0.1) this.face = Math.sign(c.x);
		const groundY = this.stage === 1 ? -7 : 0;
		const onGround =
			this.vine < 0 &&
			p.y < groundY + 1.03 &&
			Math.abs(vel.y) < 0.2 &&
			(this.stage !== 0 || p.x <= 6.4 || p.x >= 61.7);
		this.coyote = onGround ? 0.12 : Math.max(0, this.coyote - dt);
		if (c.duck && !this.wasDuck) this.events.ducks++;
		this.wasDuck = c.duck;
		if (this.vine >= 0) {
			const v = this.scene.vines[this.vine];
			this.body.setNextKinematicTranslation({
				x: v.tip.x,
				y: v.tip.y - 1.25,
				z: 0,
			});
			if (this.jumpBuffer > 0 && this.grabCooldown <= 0) this.release(c);
			this.scene.player.play("hang");
		} else if (this.stage === 1) {
			let vertical = c.y * this.tuning.speed * 0.8;
			if (this.inputType === "touch" && this.air < 30)
				vertical = Math.max(vertical, 4.5);
			if (p.y > 6.13) vertical = Math.min(0, vertical);
			if (p.y < -5.9) vertical = Math.max(0, vertical);
			this.body.setLinvel(
				{ x: c.x * this.tuning.speed, y: vertical, z: 0 },
				true,
			);
			if (p.y > 5.65) {
				if (this.air < 95 && !this.wasSurface) {
					this.events.breaths++;
					this.audio.sfx("bubble");
				}
				this.air = clamp(this.air + dt * 58, 0, 100);
				this.wasSurface = true;
			} else {
				this.wasSurface = false;
				this.air = clamp(
					this.air - dt * (this.god ? 0 : this.tuning.airDrain),
					0,
					100,
				);
			}
			if (this.air <= 0) this.damage("air");
			this.scene.player.play("swim");
		} else {
			let vx = c.x * this.tuning.speed * (c.duck && onGround ? 0.42 : 1);
			if (this.airSteerLock > 0) vx = vel.x;
			this.body.setLinvel({ x: vx, y: vel.y, z: 0 }, true);
			if (this.jumpBuffer > 0 && this.coyote > 0) {
				this.body.setLinvel(
					{ x: c.x * this.tuning.speed, y: this.tuning.jump, z: 0 },
					true,
				);
				this.jumpBuffer = 0;
				this.coyote = 0;
				this.events.jumps++;
				this.audio.sfx("jump");
			}
			this.scene.player.play(
				c.duck && onGround
					? "duck"
					: !onGround
						? "jump"
						: Math.abs(c.x) > 0.1
							? "run"
							: "idle",
			);
		}
		if ((c.attack || this.inputType === "touch") && this.actionCooldown <= 0)
			this.swat();
		for (const e of this.scene.enemies) {
			e.stun = Math.max(0, (e.stun || 0) - dt);
			if (e.kind === "croc") {
				e.body.setNextKinematicTranslation({
					x: e.x + Math.sin(this.stageClock * 0.55 + e.phase) * 2.7,
					y: e.y + Math.sin(this.stageClock * 0.9 + e.phase) * 0.6,
					z: 0,
				});
				e.open = (e.root.getObjectByName("jaw")?.rotation.z || 0) > 0.2;
				e.root.rotation.z =
					e.stun > 0 ? Math.PI : Math.sin(this.stageClock * 2 + e.phase) * 0.03;
			} else if (e.kind === "sentinel") {
				e.body.setNextKinematicTranslation({
					x: e.x + Math.sin(this.stageClock * 1.2 + e.phase) * 2.1,
					y: 0.9,
					z: 0,
				});
				e.root.rotation.z =
					e.stun > 0 ? -0.7 : Math.sin(this.stageClock * 4 + e.phase) * 0.07;
			} else {
				const ep = e.body.translation();
				const speed =
					(e.big ? 3.8 : 4.8) * this.tuning.hazard * (1 + this.loop * 0.18);
				e.body.setLinvel({ x: -speed, y: e.body.linvel().y, z: 0 }, true);
				if (ep.x < -8 || ep.y < -12) {
					e.body.setTranslation({ x: 110, y: 4 + (e.phase % 4), z: 0 }, true);
					e.body.setLinvel({ x: -speed, y: 0, z: 0 }, true);
					e.passed = false;
				}
			}
		}
		this.world.step();
		p = this.position();
		if (
			this.stage === 0 &&
			this.vine < 0 &&
			this.grabCooldown <= 0 &&
			p.y > 1.3
		) {
			for (const v of this.scene.vines) {
				if (v.i <= this.lastVine) continue;
				const dx = v.tip.x - p.x,
					dy = v.tip.y - 1.25 - p.y;
				const radius =
					this.settings.assist || this.inputType === "touch" ? 2.15 : 1.25;
				if (dx * dx + dy * dy < radius * radius) {
					this.attach(v.i);
					break;
				} else if (
					this.settings.assist &&
					Math.abs(dx) < 3.1 &&
					Math.abs(dy) < 2.7 &&
					vel.y < 1
				) {
					this.body.setLinvel(
						{
							x: this.body.linvel().x + dx * dt * 3,
							y: this.body.linvel().y + dy * dt * 3,
							z: 0,
						},
						true,
					);
				}
			}
		}
		for (const e of this.scene.enemies) {
			const ep = e.body.translation();
			e.root.position.set(ep.x, ep.y - (e.kind === "sentinel" ? 0.9 : 0), 0);
			if (e.kind === "boulder") {
				e.root.rotation.z -= dt * 2.7;
				e.shadow.position.x = ep.x;
				e.shadow.scale.x = e.radius * (1.2 + ep.y * 0.06);
				if (!e.passed && p.x > ep.x + e.radius) {
					e.passed = true;
					this.score += e.big ? 150 : 100;
				}
			}
			if (e.stun > 0) continue;
			if (this.world.intersectionPair(this.collider, e.collider)) {
				const duckSafe =
					e.kind === "boulder" &&
					e.big &&
					c.duck &&
					onGround &&
					ep.y - e.radius > 0.75;
				if (!duckSafe) {
					this.lastContact = {
						kind: e.kind,
						x: ep.x,
						y: ep.y,
						px: p.x,
						py: p.y,
						duck: c.duck,
						onGround,
					};
					this.damage("hazard");
				}
			}
		}
		p = this.position();
		for (const i of this.scene.items) {
			if (
				!i.got &&
				Math.hypot(i.root.position.x - p.x, i.root.position.y - p.y) < 1.25
			) {
				i.got = true;
				i.root.visible = false;
				this.score += 100;
				this.collected++;
				this.audio.sfx("coin");
				this.scene.burst(p.x, p.y, C.gold, 6);
			}
		}
		if (this.stage === 1) {
			for (const d of this.scene.decor)
				if (d.kind === "bubbles") {
					d.root.position.y = -6 + ((this.stageClock * 0.5) % 1.6);
					if (Math.abs(p.x - d.x) < 0.65 && p.y < 5.8) {
						this.body.setLinvel(
							{
								x: this.body.linvel().x,
								y: Math.max(2, this.body.linvel().y),
								z: 0,
							},
							true,
						);
					}
				}
			if (p.x > 40) this.checkpoint = { x: 43, y: 5.9, vine: -1 };
		}
		if (this.stage === 2 && p.x > 44)
			this.checkpoint = { x: 45, y: 0.92, vine: -1 };
		if (this.stage === 3 && p.x > 34)
			this.checkpoint = { x: 35, y: 0.92, vine: -1 };
		if (this.stage === 3 && Math.abs(p.x - 52) < 2.4 && c.attack) {
			this.rescue += dt / 1.5;
			if (this.scene.winch) this.scene.winch.rotation.z += dt * 6;
			if (this.scene.cage) this.scene.cage.position.y = 5.8 + this.rescue * 2.7;
			this.ui.toast(
				`UNTANGLING PIP… ${Math.min(100, Math.floor(this.rescue * 100))}%`,
				0.15,
			);
			if (this.rescue >= 1)
				this.finish(
					true,
					"“Splendid,” says Pip. “Did you remember the biscuits?”",
				);
		} else if (this.stage === 3) {
			this.rescue = Math.max(0, this.rescue - dt * 0.25);
		}
		if (p.y < -6 && this.stage !== 1) this.damage("fall");
		if (p.x < -8) this.damage("fall");
		if (this.stage < 3 && p.x > this.stages[this.stage].end)
			this.completeStage();
		this.scene.player.root.position.set(p.x, p.y - 0.85, 0.65);
		this.scene.playerShadow.visible =
			this.stage !== 1 && (this.stage !== 0 || p.x < 6 || p.x > 62);
		this.scene.playerShadow.position.x = p.x;
		this.scene.player.root.rotation.y = this.face < 0 ? Math.PI : 0;
		this.scene.player.root.visible =
			this.invincible <= 0 || Math.floor(this.invincible * 10) % 2 === 0;
		if (this.stage === 0 && this.vine >= 0)
			this.scene.player.root.rotation.z =
				this.scene.vines[this.vine].root.rotation.z * 0.3;
		else this.scene.player.root.rotation.z = 0;
		this.scene.follow(p.x, p.y, dt);
		if (this.shake > 0 && this.settings.shake) {
			this.shake -= dt;
			this.scene.camera.position.x +=
				Math.sin(this.clock * 90) * this.shake * 0.3;
		}
		this.audio.tick(!this.attract, this.stage);
	}
	swat() {
		this.actionCooldown = 0.36;
		this.events.swats++;
		const p = this.position();
		let hit = false;
		for (const e of this.scene.enemies) {
			if (e.kind === "boulder" || e.stun > 0) continue;
			const ep = e.body.translation(),
				dx = ep.x - p.x,
				dy = ep.y - p.y;
			if (
				Math.abs(dx) < 3.5 &&
				Math.abs(dy) < 1.6 &&
				this.face * dx > -0.7 &&
				!e.open
			) {
				e.stun = 3.5;
				this.score += e.kind === "croc" ? 250 : 300;
				this.events.stuns++;
				this.scene.burst(ep.x, ep.y, C.paper, 14);
				hit = true;
			}
		}
		if (hit) {
			this.audio.sfx("swat");
			this.ui.toast(
				this.stage === 1 ? "CROC-A-DOODLE-DON’T!" : "CLOCKED OUT!",
				0.7,
			);
		} else if (this.pointerAttack || this.keys.has("KeyF") || this.pad?.attack)
			this.audio.sfx("swat");
	}
	snapshot() {
		const p = this.position();
		return {
			title: "Jungle Zip",
			mode: this.mode,
			stage: this.stage,
			x: p.x,
			y: p.y,
			health: this.health,
			score: this.score,
			air: this.air,
			timer: this.timer,
			elapsed: this.elapsed,
			vine: this.vine,
			lastVine: this.lastVine,
			animation: this.scene.player?.animation,
			inputType: this.inputType,
			renderer: this.scene.backend,
			events: { ...this.events, stages: [...this.events.stages] },
			network: {
				hub: this.net.hub,
				connected: this.net.connected,
				sent: this.net.sent,
				received: this.net.received,
			},
			music: this.audio.musicVolume,
			rescue: this.rescue,
			lastContact: this.lastContact,
		};
	}
	advance(frames = 1, controls = null) {
		this.testing = true;
		this.testOverride = controls;
		for (let i = 0; i < frames; i++) {
			this.step(1 / 60);
			this.net.tick(1 / 60);
			this.ui.tick(1 / 60);
		}
		this.testOverride = null;
		return this.snapshot();
	}
}
const game = new JungleZip();
game.init().catch((err) => {
	console.error(err);
	window.__gameError = String(err);
	$("load-text").innerHTML =
		"The expedition could not start.<br>" +
		String(err.message).replace(/[<>]/g, "") +
		"<br><br>Try a current browser with WebGPU or WebGL 2 enabled.";
	window.AIHub?.active && AIHub.fail(String(err));
});
