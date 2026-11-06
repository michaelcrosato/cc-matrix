import "../vendor/engine-repo/engine/my-3d2dge-3d.js";
import { Simulation } from "./sim/simulation.js";
import { FlightView } from "./view/world.js";
import { HUD, text, panel, mapPick } from "./ui/hud.js";
import { Screens } from "./ui/screens.js";
import { Sound } from "./audio/sound.js";
import { Session } from "./online/session.js";
import { sortieBot } from "./sim/bot.js";
import {
	U,
	HOME,
	OPERATION,
	STATIONS,
	LOADOUTS,
} from "../content/operation.js";
import { clamp, wrap, dist } from "./core/math.js";
const E = globalThis.My3D2dge;
const KEYS = {
	up: ["KeyW", "ArrowUp", "Pad12"],
	down: ["KeyS", "ArrowDown", "Pad13"],
	left: ["KeyA", "ArrowLeft", "Pad14"],
	right: ["KeyD", "ArrowRight", "Pad15"],
	confirm: ["Enter", "Pad0"],
	cancel: ["Escape", "Backspace", "Pad1"],
	start: ["Enter", "Pad9"],
	pause: ["Escape", "KeyP", "Pad9"],
	fire: ["Space", "Mouse0", "Pad7"],
	fine: ["Mouse2", "Pad6"],
	throttleDown: ["KeyQ", "Pad4"],
	throttleUp: ["KeyE", "Pad5"],
	stations: ["Tab", "Pad3"],
	pilot: ["Digit1"],
	gun: ["Digit2"],
	bombsight: ["Digit3"],
	nose: ["Digit4"],
	starboard: ["Digit5"],
	tail: ["Digit6"],
	port: ["Digit7"],
	map: ["KeyM", "Pad2"],
	hold: ["KeyH", "Pad10"],
	doors: ["KeyB", "Pad0"],
	salvo: ["KeyX", "Pad1"],
	extinguish: ["KeyF", "Pad11"],
	jettison: ["KeyJ"],
	accept: ["KeyT", "Pad0"],
	exterior: ["KeyV"],
};
class BomberGame {
	constructor() {
		this.mode = "loading";
		this.sim = new Simulation();
		this.session = new Session(
			() => this.sim,
			(s) => {
				this.sim = s;
			},
			() => this.sessionEnd(),
		);
		this.game = new E.Game({
			id: "bomber-buddy-1",
			canvas: "screen",
			res: [640, 360],
			expand: true,
			bg: null,
			input: KEYS,
			autoPause: !AIHub.active,
			live: AIHub.active,
			fullscreen: "button",
			menu: {
				quit: AIHub.active ? false : "title",
				controls: {
					fire: "Fire / release",
					fine: "Fine aim / sight zoom",
					hold: "Course hold",
					doors: "Bomb doors",
					salvo: "Salvo size",
					stations: "Station wheel",
					throttleUp: "Increase power",
					throttleDown: "Decrease power",
				},
				settings: [
					{ key: "music", value: 0.1 },
					{ key: "glyphs", value: "playstation" },
				],
			},
			loop: !AIHub.active,
		});
		this.game.fadeTime = 0;
		this.game.input.steer = "drag";
		this.sound = new Sound(this.game);
		this.screens = new Screens(this);
		this.ui = this.screens.ui;
		this.coop = false;
		this.setup = { route: "direct", loadout: 1, difficulty: 1 };
		this.nextSeed = 1701;
		this.contexts = [this.makeContext(), this.makeContext()];
		this.idle = performance.now();
		this.lastPaused = false;
		this.devBearing = -1;
		this.titleTime = 0;
		this.touchPoints = new Map();
		this.touchMove = [0, 0];
		this.touchAim = [0, 0];
		this.game.hook("input", (dt) => this.inputHook(dt));
		this.bindEvents();
		globalThis.__game = this.game;
		globalThis.Bomber = this;
		this.game.debug = { snapshot: () => this.inspect() };
	}
	makeContext() {
		return {
			map: false,
			mapIndex: 1,
			wheel: false,
			wheelIndex: 0,
			exterior: false,
			exteriorUntil: 0,
		};
	}
	inspect() {
		return {
			mode: this.mode,
			state: this.sim.snapshot(),
			native: {
				version: E.version,
				scene: this.game.sceneName,
				paused: this.game.paused,
				views: this.game.viewports?.length || 1,
				errors: this.game.errors.map((e) => String(e.message || e)),
			},
			audio: this.sound.inspect(),
			network: {
				active: this.session.active,
				host: this.session.host,
				me: this.session.me,
				done: this.session.done,
				...this.session.stats,
			},
			ui: {
				screen: this.ui.screen,
				contexts: this.contexts.map((c) => ({
					map: c.map,
					wheel: c.wheel,
					mapIndex: c.mapIndex,
				})),
			},
			render: {
				cameras: this.view?.world.cameras.map((c) => c.pose),
				stats: this.view?.world.stats,
			},
		};
	}
	async boot() {
		const info = await this.session.connect(),
			server = info && AIHub.server;
		document.getElementById("load-status").textContent = "Opening the Channel…";
		if (!server) {
			const probe = document.createElement("canvas");
			const gl = probe.getContext("webgl2");
			if (!gl && !navigator.gpu)
				throw new Error("WebGL 2 and WebGPU are unavailable.");
			if (gl) gl.getExtension("WEBGL_lose_context")?.loseContext();
		}
		let rendererTimeout;
		try {
			await Promise.race([
				E.World3D.init(this.game, { render: !server }),
				new Promise((_, reject) => {
					rendererTimeout = setTimeout(
						() => reject(new Error("3D renderer initialization timed out.")),
						12000,
					);
				}),
			]);
		} finally {
			clearTimeout(rendererTimeout);
		}
		this.view = new FlightView(
			this.game,
			() => this.sim,
			(i) => this.context(i),
		);
		this.hud = new HUD(this.game, this.view);
		const scenes = {
			title: {
				camera: { zoom: false },
				input: KEYS,
				enter: () => {
					if (["play", "attract"].includes(this.mode)) this.toTitle();
				},
				update: (dt) => this.titleUpdate(dt),
				draw: (r) => this.draw(r),
			},
			play: {
				pausable: true,
				camera: { zoom: false },
				input: KEYS,
				enter: () => {
					this.game.splitScreen(
						this.coop && this.sim.players.length > 1 ? 2 : 0,
						{ layout: "rows", gap: 2 },
					);
				},
				update: (dt) => this.playUpdate(dt),
				draw: (r) => this.draw(r),
				back: () => false,
			},
			attract: {
				camera: { zoom: false },
				input: KEYS,
				update: (dt) => this.attractUpdate(dt),
				draw: (r) => this.draw(r),
			},
		};
		this.game.start({ scenes, scene: info ? "play" : "title" });
		if (info) {
			this.mode = "play";
			this.coop = false;
			this.sim.aircraft.throttle = 0.87;
			this.ui.hide();
			AIHub.ready();
			this.startHubClock(server);
		} else this.toTitle();
		document.getElementById("loading").remove();
		this.ready = true;
	}
	startHubClock(server) {
		let last = performance.now();
		this.hubTimer = setInterval(() => {
			if (this.session.done) return;
			const now = performance.now(),
				dt = Math.min(1, (now - last) / 1000);
			last = now;
			this.game.advance(dt, { draw: false });
		}, 16);
		if (!server) {
			const render = () => {
				if (!this.session.done) {
					this.game.advance(0, { draw: true });
					this.hubRAF = requestAnimationFrame(render);
				}
			};
			this.hubRAF = requestAnimationFrame(render);
		}
	}
	context(i = 0) {
		const id = this.session.active ? this.session.me : i;
		return {
			...this.contexts[i],
			name: this.session.active
				? AIHub.players.find((p) => p.id === id)?.name || "Crew"
				: "CREW " + (i + 1),
			touch: this.isTouch(),
			title: ["title", "menu", "brief"].includes(this.mode),
			player: this.sim.player(id) || this.sim.players[0],
			input: this.game.players[i] || this.game.input,
			exterior:
				this.contexts[i].exterior ||
				this.sim.time < this.contexts[i].exteriorUntil,
		};
	}
	resetIdle() {
		this.idle = performance.now();
	}
	forecast() {
		const load = LOADOUTS[this.setup.loadout];
		let last = HOME,
			length = 0;
		for (const [x, y] of OPERATION.routes[this.setup.route].points) {
			const next = { x, y };
			length += dist(last, next);
			last = next;
		}
		length += dist(last, HOME);
		const duration = length / U / 74 + 60,
			fuelRate =
				(0.033 + 0.87 * 0.048) *
				(this.setup.difficulty === 0
					? 0.8
					: this.setup.difficulty === 2
						? 1.1
						: 1);
		return Math.round(load.fuel - duration * fuelRate);
	}
	toTitle() {
		if (this.session.active) return;
		this.sound.stop();
		this.game.resume();
		this.game.splitScreen(0);
		while (this.game.players.length > 1) this.game.removePlayer(2);
		this.game.input.pad = "any";
		this.coop = false;
		this.contexts = [this.makeContext(), this.makeContext()];
		this.sim = new Simulation({ seed: 1701 });
		Object.assign(this.sim.aircraft, {
			x: 10500 * U,
			y: 12000 * U,
			z: 1300 * U,
			airborne: true,
			speed: 70 * U,
			throttle: 0.82,
			bank: -0.05,
			gear: 0,
		});
		this.game.go("title", null, { fade: 0 });
		this.mode = "title";
		this.screens.title();
		this.resetIdle();
		this.updateTouch();
	}
	startSortie(practice = null) {
		if (this.session.active) return;
		this.sound.stop();
		this.game.resume();
		this.ui.hide();
		this.game.input.clear();
		while (this.game.players.length > 1) this.game.removePlayer(2);
		this.game.input.pad = "any";
		const players = [0];
		if (this.coop && !practice) {
			let pads = [];
			try {
				pads = Array.from(navigator.getGamepads()).filter(
					(p) => p && p.connected,
				);
			} catch {}
			const two = pads.length > 1,
				second = two
					? (pads.find((p) => p.index !== this.game.input.padIndex)?.index ?? 1)
					: (pads[0]?.index ?? 0);
			if (!two) this.game.input.pad = null;
			const inp = this.game.addPlayer({ pad: second });
			inp.use(KEYS);
			players.push(1);
		}
		this.game.input.tick(0);
		this.game.input.padLost = false;
		this.game.input.clear();
		this.game.splitScreen(players.length > 1 ? 2 : 0, {
			layout: "rows",
			gap: 2,
		});
		this.sim = new Simulation({
			...this.setup,
			seed: this.nextSeed++,
			players,
			practice,
		});
		this.contexts = [this.makeContext(), this.makeContext()];
		this.contexts[0].exteriorUntil = practice ? 0 : 5;
		this.mode = "play";
		this.game.go("play", null, { fade: 0 });
		this.resultShown = false;
		this.sound.lastEvent = 0;
		this.updateTouch();
		if (this.isTouch()) {
			this.sim.aircraft.throttle = 0.87;
			this.sim.say(
				"PILOT",
				"Touch: left thumb flies, right thumb aims. Tap station; choose your release.",
				2,
				"touch",
				0,
			);
		}
	}
	isTouch() {
		return (
			this.game.input.lastDevice === "touch" ||
			matchMedia("(pointer:coarse)").matches
		);
	}
	titleUpdate(dt) {
		this.titleTime += dt;
		this.sim.time += dt;
		this.sim.aircraft.bank = Math.sin(this.titleTime * 0.2) * 0.05;
		this.view.step(dt);
		if (
			["title", "menu"].includes(this.mode) &&
			this.ui.screen === "title" &&
			performance.now() - this.idle >= 10000
		)
			this.startAttract();
		this.sound.menu();
	}
	startAttract() {
		this.ui.hide();
		this.mode = "attract";
		this.sim = new Simulation({ seed: 1717, attract: true });
		this.sim.aircraft.throttle = 0.9;
		this.contexts = [this.makeContext(), this.makeContext()];
		this.contexts[0].exteriorUntil = 40;
		this.game.go("attract", null, { fade: 0 });
		this.attractElapsed = 0;
		this.attractBeats = new Set();
	}
	attractUpdate(dt) {
		this.attractElapsed += dt;
		for (let i = 0; i < 14; i++) {
			sortieBot(this.sim);
			this.sim.step(dt);
		}
		for (const e of this.sim.events)
			if (
				[
					"takeoff",
					"wave",
					"flak-warning",
					"release",
					"impact",
					"finish",
				].includes(e.type)
			)
				this.attractBeats.add(e.type);
		if (this.sim.primaryComplete() && !this.attractDamaged) {
			this.sim.applyDamage("engine");
			this.attractDamaged = true;
		}
		if (this.sim.ended || this.attractElapsed > 65) {
			this.attractLastBeats = [...this.attractBeats];
			this.sim = new Simulation({ seed: 1717, attract: true });
			this.sim.aircraft.throttle = 0.9;
			this.attractElapsed = 0;
			this.attractDamaged = false;
		}
		this.view.step(dt);
		this.sound.update(this.sim, true);
	}
	inputHook(dt) {
		if (!this.ready) return;
		const inputs = this.game.players;
		for (let i = 1; i < inputs.length; i++)
			if (inputs[i].padLost) {
				this.sim.removePlayer(i);
				this.game.removePlayer(inputs[i]);
				this.game.splitScreen(0);
				this.coop = false;
			}
		if (
			inputs.some(
				(i) => i.anyPressed() || i.padMove.some((v) => Math.abs(v) > 0.4),
			)
		) {
			this.resetIdle();
			if (this.mode === "attract") {
				inputs.forEach((i) => i.clear());
				this.toTitle();
				return;
			}
		}
		if (this.game.paused !== this.lastPaused) {
			this.lastPaused = this.game.paused;
			for (const i of inputs) i.clear();
			for (const p of this.sim.players) p.input = {};
			this.touchMove = [0, 0];
			this.touchAim = [0, 0];
			this.touchPoints.clear();
			if (this.game.paused) {
				this.sound.stop();
				document.exitPointerLock?.();
			}
			this.updateTouch();
		}
		if (this.session.done) return;
		if (this.game.paused) {
			if (this.session.active) this.sound.update(this.sim, true);
			return;
		}
		if (this.mode !== "play") return;
		for (let i = 1; i < inputs.length; i++)
			if (inputs[i].pressed("pause")) {
				this.game.pausedBy = i + 1;
				this.game.pause();
				this.ui._pl = i;
				inputs[i].suppress("pause");
				return;
			}
		if (this.ui.screen) return;
		for (let i = 0; i < inputs.length; i++) this.controls(i, inputs[i], dt);
	}
	controls(i, input, dt) {
		const id = this.session.active ? this.session.me : i,
			p = this.sim.player(id),
			c = this.contexts[i];
		if (!p || (this.session.active && AIHub.server)) return;
		const send = (type, data = {}) => this.session.command(id, type, data);
		if (p.transition > 0 && input.pressed("cancel")) {
			send("cancelStation");
			input.suppress("pause");
			return;
		}
		if (c.wheelCanceled) {
			if (input.down("stations")) return;
			c.wheelCanceled = false;
			return;
		}
		if (c.wheel && input.pressed("cancel")) {
			c.wheel = false;
			c.wheelCanceled = true;
			input.suppress("pause");
			send("cancelStation");
			return;
		}
		if (this.sim.cheats.freeCamera && !this.session.active) {
			const move = input.move(),
				axes = input.padAxes;
			const pointer = input.pointer(),
				previous = this.freePointer || pointer;
			this.freePointer = pointer;
			const yawMouse =
					input.lastDevice === "mouse" && pointer && previous
						? ((pointer[0] - previous[0]) * 0.004) / Math.max(dt, 0.001)
						: 0,
				pitchMouse =
					input.lastDevice === "mouse" && pointer && previous
						? (-(pointer[1] - previous[1]) * 0.004) / Math.max(dt, 0.001)
						: 0;
			this.view.freeMove(
				move[0],
				move[1],
				(axes[2] || 0) + yawMouse,
				-(axes[3] || 0) + pitchMouse,
				(input.down("throttleUp") ? 1 : 0) -
					(input.down("throttleDown") ? 1 : 0),
				dt,
			);
			send("input", {});
			if (input.pressed("exterior")) {
				this.sim.cheats.freeCamera = false;
				this.view.freePose = null;
			}
			return;
		}
		if (input.padLost) {
			if (!this.session.active) this.sim.removePlayer(id);
			if (i > 0) {
				this.game.removePlayer(input);
				this.game.splitScreen(0);
				this.coop = false;
			}
			return;
		}
		if (input.pressed("map")) {
			c.map = !c.map;
			c.mapPoint = null;
			c.wheel = false;
			if (c.map && this.sim.commander === id && !this.sim.aircraft.hold)
				send("hold");
			input.suppress("fire");
			this.updateTouch();
		}
		if (c.map) {
			if (input.repeat("up")) {
				c.mapIndex = (c.mapIndex + 3) % 4;
				c.mapPoint = null;
			}
			if (input.repeat("down")) {
				c.mapIndex = (c.mapIndex + 1) % 4;
				c.mapPoint = null;
			}
			const click = input.clicked();
			if (click) {
				const vp = this.game.viewports?.[i] || {
						x: 0,
						y: 0,
						w: this.game.W,
						h: this.game.H,
					},
					pick = mapPick(vp, ...click);
				if (pick.inside) {
					const choices = [HOME, ...this.sim.targets];
					let closest = -1,
						best = 18;
					choices.forEach((t, j) => {
						const p = pick.project(t.x, t.y),
							d = Math.hypot(p[0] - click[0], p[1] - click[1]);
						if (d < best) {
							best = d;
							closest = j;
						}
					});
					if (closest >= 0) {
						c.mapIndex = closest;
						c.mapPoint = null;
					} else c.mapPoint = pick.point;
				}
			}
			if (input.pressed("confirm")) {
				const choice = [HOME, ...this.sim.targets][c.mapIndex];
				if (this.sim.commander === id) {
					send(
						"route",
						c.mapPoint
							? { route: "point", point: c.mapPoint }
							: { route: choice.id },
					);
					c.map = false;
				} else
					this.sim.say(
						"NAVIGATOR",
						"Flight command belongs to the pilot. Request that station to change course.",
						1,
						"permission",
						3,
					);
			}
			if (input.pressed("cancel")) {
				c.map = false;
				input.suppress("pause");
			}
			send("input", {
				bank: 0,
				pitch: 0,
				throttle: 0,
				fire: false,
				aimYaw: p.aimYaw,
				aimPitch: p.aimPitch,
			});
			return;
		}
		if (input.down("stations")) {
			if (!c.wheel) {
				c.wheel = true;
				c.wheelIndex = Math.max(
					0,
					STATIONS.findIndex((s) => s.id === p.station),
				);
			}
			if (input.repeat("right") || input.repeat("down"))
				c.wheelIndex = (c.wheelIndex + 1) % 6;
			if (input.repeat("left") || input.repeat("up"))
				c.wheelIndex = (c.wheelIndex + 5) % 6;
			send("input", {});
			return;
		}
		if (c.wheel) {
			c.wheel = false;
			send("station", { station: STATIONS[c.wheelIndex].id });
			input.suppress("fire");
			return;
		}
		for (const [action, station] of [
			["pilot", "pilot"],
			["bombsight", "bombs"],
			["nose", "nose"],
			["starboard", "starboard"],
			["tail", "tail"],
			["port", "port"],
		])
			if (input.pressed(action)) {
				c.exteriorUntil = 0;
				send("station", { station });
				input.suppress("fire");
			}
		if (input.pressed("gun")) {
			const e = this.sim.enemies.find((e) => e.alive && e.age >= 0);
			send("station", {
				station: e ? ["nose", "starboard", "tail", "port"][e.bearing] : "nose",
			});
			input.suppress("fire");
		}
		if (this.sim.guns[p.station] && input.lastDevice === "gamepad")
			for (const [action, station] of [
				["up", "nose"],
				["right", "starboard"],
				["down", "tail"],
				["left", "port"],
			])
				if (input.pressed(action)) send("station", { station });
		if (input.pressed("hold")) send("hold");
		if (input.pressed("extinguish")) send("extinguish");
		if (input.pressed("exterior")) c.exterior = !c.exterior;
		if (input.pressed("confirm") && this.sim.time < c.exteriorUntil) {
			c.exteriorUntil = 0;
			input.suppress("fire");
		}
		const request = this.sim.requests.find((r) => r.to === id);
		if (input.pressed("accept") && request) {
			send("accept");
			input.suppress("doors");
		}
		if (p.station === "bombs") {
			if (input.pressed("doors") && !request) send("doors");
			if (input.pressed("salvo")) send("salvo");
			if (input.pressed("fire") && !p.transition) send("release");
		}
		let [mx, my] = input.move();
		if (this.touchPoints.size) {
			mx = this.touchMove[0];
			my = this.touchMove[1];
		}
		let aimYaw = p.aimYaw,
			aimPitch = p.aimPitch;
		const sensitivity = this.game.settings.aimSensitivity,
			axes = input.padAxes || [],
			dead = input.deadzone,
			ax = Math.abs(axes[2] || 0) > dead ? axes[2] : 0,
			ay = Math.abs(axes[3] || 0) > dead ? axes[3] : 0;
		aimYaw += (ax + this.touchAim[0]) * dt * sensitivity * 1.1;
		aimPitch -=
			(ay + this.touchAim[1]) *
			dt *
			sensitivity *
			0.85 *
			(this.game.settings.invertY ? -1 : 1);
		const mouse = input.pointer();
		if (input.lastDevice === "mouse" && mouse && this.mouseMoved) {
			const v = this.game.viewports?.[i],
				cx = v ? v.x + v.w / 2 : this.game.W / 2,
				cy = v ? v.y + v.h / 2 : this.game.H / 2;
			aimYaw = ((mouse[0] - cx) / (this.game.W * 0.5)) * 0.8 * sensitivity;
			aimPitch = (-(mouse[1] - cy) / (this.game.H * 0.5)) * 0.6 * sensitivity;
		}
		send("input", {
			bank: p.station === "pilot" ? mx : 0,
			pitch:
				p.station === "pilot"
					? -my * (this.game.settings.invertFlight ? -1 : 1)
					: 0,
			throttle:
				(input.down("throttleUp") ? 1 : 0) -
				(input.down("throttleDown") ? 1 : 0),
			aimYaw,
			aimPitch,
			fire: p.station !== "bombs" && input.down("fire") && !p.transition,
			fine: input.down("fine"),
			jettison:
				input.down("jettison") ||
				(input.down("throttleUp") && input.down("throttleDown")) ||
				!!this.touchJettison,
		});
		if (this.isTouch()) this.touchAssist(id, dt);
	}
	touchAssist(id, dt) {
		const a = this.sim.aircraft,
			p = this.sim.player(id);
		if (!p) return;
		if (a.throttle < 0.82) a.throttle = Math.min(0.82, a.throttle + dt * 0.35);
		if (this.sim.guns[p.station] && this.touchPoints.size > 0) {
			const e = this.sim.enemies.find(
				(e) =>
					e.alive &&
					e.age > 3 &&
					["nose", "starboard", "tail", "port"][e.bearing] === p.station,
			);
			if (e) {
				const st = STATIONS.find((s) => s.id === p.station),
					yaw = wrap(Math.atan2(e.y - a.y, e.x - a.x) - a.heading - st.angle),
					pitch = Math.atan2(e.z - a.z, dist(e, a));
				this.session.command(id, "input", {
					aimYaw: p.aimYaw + (yaw - p.aimYaw) * 0.08,
					aimPitch: p.aimPitch + (pitch - p.aimPitch) * 0.08,
					fire: true,
				});
			}
		}
	}
	playUpdate(dt) {
		if (this.session.done) return;
		if (this.session.active && AIHub.time() < 0) {
			this.view.step(dt);
			return;
		}
		if (this.session.host) this.sim.step(dt);
		this.session.step(dt);
		this.view.step(dt);
		this.sound.update(this.sim, true);
		if (this.sim.ended && !this.session.active && !this.resultShown) {
			this.resultShown = true;
			this.sound.stop();
			this.screens.results();
			this.updateTouch();
		}
		const station = this.sim.player(this.session.me)?.station;
		if (
			this.isTouch() &&
			(station !== this.lastTouchStation ||
				Math.floor(this.game.real * 4) !== this.lastTouchDraw)
		) {
			this.lastTouchStation = station;
			this.lastTouchDraw = Math.floor(this.game.real * 4);
			this.updateTouch();
		}
	}
	draw(r) {
		if (!this.view) return;
		this.view.draw(r);
		if (this.mode === "brief")
			r.overlay((g) => {
				this.hud.map(
					g,
					{ x: 0, y: 0, w: r.W, h: r.H },
					this.sim,
					this.previewTarget ?? 1,
					true,
				);
				text(g, "MISSION ROUTE", 24, 25, "#eed49b", 2);
			});
		if (this.mode === "play" || this.mode === "attract")
			this.hud.draw(r, this.sim, this.context(r.viewport?.i || 0));
		if (this.mode === "attract")
			r.overlay((g) => {
				panel(g, r.W / 2 - 95, r.H - 25, 190, 19);
				text(
					g,
					"DEMO • ANY INPUT TO RETURN",
					r.W / 2,
					r.H - 19,
					"#e9c481",
					1,
					"center",
				);
			});
		if (this.mode === "title")
			r.overlay((g) => {
				text(
					g,
					"LARKSPUR SQUADRON / Nº 17",
					r.W - 20,
					r.H - 31,
					"#e6d5ad",
					1,
					"right",
				);
				text(
					g,
					"06:40  •  CHANNEL COAST",
					r.W - 20,
					r.H - 17,
					"#b9cfbc",
					1,
					"right",
				);
			});
	}
	bindEvents() {
		const activity = (e) => {
			this.resetIdle();
			if (this.mode === "attract") {
				e.preventDefault();
				e.stopImmediatePropagation();
				this.game.input.clear();
				this.toTitle();
				return false;
			}
			if (e.type === "pointerdown" || e.type === "keydown") this.sound.unlock();
			return true;
		};
		addEventListener(
			"keydown",
			(e) => {
				activity(e);
				if (e.code === "Tab") e.preventDefault();
			},
			{ capture: true },
		);
		addEventListener("pointerdown", activity, { capture: true });
		addEventListener("pointermove", (e) => {
			if (e.pointerType === "mouse") {
				this.mouseMoved = true;
				if (Math.abs(e.movementX) + Math.abs(e.movementY) > 2) {
					this.lastPointerMotion = performance.now();
					if (this.mode === "attract") activity(e);
					else this.resetIdle();
				}
			}
		});
		const cv = document.getElementById("screen");
		cv.addEventListener("contextmenu", (e) => e.preventDefault());
		cv.tabIndex = 0;
		this.ui.root?.addEventListener("pointerdown", (e) => {
			if (this.mode !== "brief") return;
			const b = cv.getBoundingClientRect(),
				sx = ((e.clientX - b.left) * this.game.W) / b.width,
				sy = ((e.clientY - b.top) * this.game.H) / b.height,
				pick = mapPick(
					{ x: 0, y: 0, w: this.game.W, h: this.game.H },
					sx,
					sy,
					true,
				);
			if (pick.inside) {
				const choices = [HOME, ...this.sim.targets];
				let closest = -1,
					best = 22;
				choices.forEach((t, j) => {
					const p = pick.project(t.x, t.y),
						d = Math.hypot(p[0] - sx, p[1] - sy);
					if (d < best) {
						best = d;
						closest = j;
					}
				});
				if (closest >= 0) this.previewTarget = closest;
			}
		});
		cv.addEventListener("pointerdown", (e) => {
			if (e.pointerType === "mouse" || this.mode !== "play" || this.game.paused)
				return;
			this.touchPoints.set(e.pointerId, {
				side: e.clientX < innerWidth * 0.5 ? "move" : "aim",
				x: e.clientX,
				y: e.clientY,
			});
			cv.setPointerCapture(e.pointerId);
			this.game.input.lastDevice = "touch";
			e.preventDefault();
		});
		cv.addEventListener("pointermove", (e) => {
			const p = this.touchPoints.get(e.pointerId);
			if (!p) return;
			const v = [
				clamp((e.clientX - p.x) / 70, -1, 1),
				clamp((e.clientY - p.y) / 70, -1, 1),
			];
			if (p.side === "move") this.touchMove = v;
			else this.touchAim = v;
			e.preventDefault();
		});
		const lift = (e) => {
			const p = this.touchPoints.get(e.pointerId);
			if (!p) return;
			this.touchPoints.delete(e.pointerId);
			if (p.side === "move") this.touchMove = [0, 0];
			else this.touchAim = [0, 0];
		};
		cv.addEventListener("pointerup", lift);
		cv.addEventListener("pointercancel", lift);
		addEventListener("blur", () => {
			for (const p of this.sim.players) p.input = {};
			this.touchPoints.clear();
			this.touchMove = [0, 0];
			this.touchAim = [0, 0];
		});
		addEventListener("pagehide", () => this.sound.stop());
		addEventListener(
			"pointerup",
			() => {
				this.touchJettison = false;
			},
			{ capture: true },
		);
		addEventListener(
			"pointercancel",
			() => {
				this.touchJettison = false;
			},
			{ capture: true },
		);
		addEventListener("gamepaddisconnected", () => {
			for (const p of this.sim.players) p.input = {};
		});
	}
	updateTouch() {
		const root = document.getElementById("html-hud");
		root.replaceChildren();
		if (
			!this.isTouch() ||
			this.mode !== "play" ||
			this.ui.screen ||
			this.game.paused ||
			this.sim.ended
		)
			return;
		const id = this.session.me,
			p = this.sim.player(id);
		if (!p) return;
		const status = document.createElement("div");
		status.className = "mobile-status";
		status.textContent =
			this.sim.objective() +
			"\n" +
			Math.ceil(this.sim.aircraft.fuel) +
			"% fuel · " +
			Math.ceil(this.sim.aircraft.hull) +
			"% hull · " +
			(p.station === "bombs"
				? this.sim.aircraft.bombs + " bombs"
				: this.sim.guns[p.station]
					? this.sim.guns[p.station].ammo + " rounds"
					: Math.round(this.sim.aircraft.z / U) + " m");
		if (this.sim.aircraft.jettisonHold > 0 && this.sim.aircraft.bombs > 0)
			status.textContent +=
				"\nHOLD TO JETTISON · " +
				Math.round((this.sim.aircraft.jettisonHold / 1.6) * 100) +
				"%";
		root.appendChild(status);
		if (this.sim.radio.until > this.sim.time && this.game.settings.subtitles) {
			const caption = document.createElement("div");
			caption.className = "mobile-caption";
			caption.textContent = this.sim.radio.role + ": " + this.sim.radio.text;
			root.appendChild(caption);
		}
		const button = (label, cls, fn) => {
			const b = document.createElement("button");
			b.textContent = label;
			b.className = "touch-action " + cls;
			b.addEventListener("pointerdown", (e) => {
				e.stopPropagation();
				e.preventDefault();
				this.sound.unlock();
				fn();
				this.updateTouch();
			});
			root.appendChild(b);
		};
		button("Station", "station", () =>
			this.ui.show("stations", {
				title: "Crew stations",
				actions: STATIONS.map((st) => [
					st.name,
					() => {
						this.contexts[0].exteriorUntil = 0;
						this.session.command(id, "station", { station: st.id });
						this.ui.hide();
						this.updateTouch();
					},
				]).concat([
					[
						"Map",
						() => {
							this.ui.hide();
							this.touchMap();
						},
					],
					["Emergency actions", () => this.emergencyMenu(id)],
				]),
			}),
		);
		if (p.station === "bombs") {
			button(
				this.sim.aircraft.doorsOpen
					? this.sim.aircraft.doors > 0.9
						? "Release"
						: "Opening doors…"
					: "Open doors",
				"release",
				() =>
					this.session.command(
						id,
						this.sim.aircraft.doorsOpen ? "release" : "doors",
					),
			);
			if (this.sim.aircraft.doorsOpen && this.sim.aircraft.doors <= 0.9)
				root.querySelector(".release").disabled = true;
			button("Salvo " + this.sim.aircraft.salvo, "aux", () =>
				this.session.command(id, "salvo"),
			);
		} else if (this.sim.aircraft.fire >= 0)
			button("Extinguish", "release", () =>
				this.session.command(id, "extinguish"),
			);
	}
	touchMap() {
		this.ui.show("touchmap", {
			title: "Commit a course",
			text: "The aircraft continues on its present heading while you choose.",
			actions: [HOME, ...this.sim.targets]
				.map((t) => [
					t.name,
					() => {
						this.session.command(this.session.me, "route", { route: t.id });
						this.ui.hide();
					},
				])
				.concat([["Back", () => this.ui.hide()]]),
		});
	}
	emergencyMenu(id) {
		const a = this.sim.aircraft;
		this.ui.show("emergency", {
			title: "Emergency actions",
			text: "One extinguisher. Hold the jettison action for 1.6 seconds; releasing early cancels.",
			actions: [
				{
					label: "Extinguish engine fire",
					disabled: this.sim.commander !== id || a.fire < 0 || !a.extinguisher,
					fn: () => {
						this.session.command(id, "extinguish");
						this.ui.hide();
					},
				},
				{
					label: "Hold to jettison payload",
					disabled: this.sim.commander !== id || !a.bombs,
					down: () => {
						this.touchJettison = true;
						this.ui.hide();
						this.updateTouch();
					},
				},
				["Back", () => this.ui.back()],
			],
		});
	}
	devJump(beat) {
		if (this.session.active) return;
		const s = this.sim,
			a = s.aircraft;
		s.cheated = true;
		this.contexts.forEach((c) => (c.exteriorUntil = 0));
		Object.assign(a, {
			airborne: true,
			speed: 70 * U,
			throttle: 0.87,
			z: 850 * U,
			gear: 0,
		});
		if (beat === "coast") {
			Object.assign(a, { x: 14300 * U, y: 12000 * U, heading: 0 });
			s.phaseTo("crossing");
			s.selectRoute("harbor", false);
		}
		if (beat === "bombs") {
			Object.assign(a, {
				x: s.targets[0].x - 1700 * U,
				y: s.targets[0].y,
				heading: 0,
			});
			s.phaseTo("bomb-run");
			s.selectRoute("harbor", false);
		}
		if (beat === "home") {
			Object.assign(a, { x: HOME.x + 1500 * U, y: HOME.y, heading: Math.PI });
			s.time = Math.max(100, s.time);
			s.selectRoute("home", false);
		}
		this.ui.hide();
		this.game.resume();
	}
	download(name, value) {
		const blob = new Blob([JSON.stringify(value, null, 2)], {
				type: "application/json",
			}),
			a = document.createElement("a");
		a.href = URL.createObjectURL(blob);
		a.download = name;
		a.click();
		setTimeout(() => URL.revokeObjectURL(a.href), 1000);
	}
	importOperation() {
		const el = document.createElement("input");
		el.type = "file";
		el.accept = ".json,application/json";
		el.onchange = async () => {
			try {
				const d = JSON.parse(await el.files[0].text());
				if (
					!d?.id ||
					!Array.isArray(d.targets) ||
					d.targets.length !== 3 ||
					!d.targets.every(
						(t) =>
							Number.isFinite(t.x) &&
							Number.isFinite(t.y) &&
							t.parts?.every(
								(p) =>
									Number.isFinite(p.dx) && Number.isFinite(p.dy) && p.hp > 0,
							),
					) ||
					!d.routes?.direct ||
					!Array.isArray(d.waves) ||
					!d.wind?.every(Number.isFinite)
				)
					throw Error("Use a complete exported operation definition.");
				this.sim.operation = d;
				this.sim.targets = d.targets.map((t) => ({
					...t,
					parts: t.parts.map((p) => ({
						...p,
						x: t.x + p.dx,
						y: t.y + p.dy,
						z: 8 * U,
						maxHp: p.hp,
						dead: false,
					})),
				}));
				this.ui.toast("Operation imported", d.name);
				this.screens.editor();
			} catch (e) {
				this.ui.toast("Import failed", e.message);
			}
		};
		el.click();
	}
	sessionEnd() {
		this.sound.stop();
		for (const p of this.sim.players) p.input = {};
		if (this.hubTimer) clearInterval(this.hubTimer);
		cancelAnimationFrame(this.hubRAF);
		this.game.input.clear();
		this.ui.hide();
		document.getElementById("html-hud").replaceChildren();
	}
}
const app = new BomberGame();
app.boot().catch((error) => {
	console.error(error);
	const loading = document.getElementById("loading");
	if (loading) {
		document.getElementById("load-status").textContent =
			"This browser could not open the 3D renderer. Use a browser with WebGL 2 or WebGPU. " +
			error.message;
		loading.querySelector("h1").textContent = "AIRFIELD CLOSED";
	}
	if (AIHub.active) AIHub.fail("3D renderer unavailable: " + error.message);
});
