import RAPIER from "@dimforge/rapier3d-compat";
import * as T from "three/webgpu";
import { CaveAudio } from "./audio.js";
import { Controls } from "./input.js";
import { ExpeditionNetwork } from "./network.js";
import { UI } from "./ui.js";
import { Cavern, CRUMBS, FLAGS, HAZARDS, LADDERS, ZONES } from "./world.js";

const DEFAULTS = {
	speed: 6.2,
	jump: 11,
	gravity: 25,
	swim: 4.6,
	lift: 2.8,
	hazard: 1,
};
const SAVE = "lost-lunch-expedition-v1",
	SETTINGS = "lost-lunch-settings-v1";
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const readStore = (key) => {
	try {
		return JSON.parse(localStorage.getItem(key));
	} catch {
		return null;
	}
};

class LostLunch {
	constructor() {
		this.mode = "loading";
		this.settings = {
			music: 0.1,
			effects: 0.65,
			xbox: 0,
			steady: 0,
			...readStore(SETTINGS),
		};
		this.balance = { ...DEFAULTS };
		this.dev = { safe: false, fly: false, reveal: false };
		this.saved = readStore(SAVE);
		if (this.saved?.version !== 1) this.saved = null;
		this.audio = new CaveAudio();
		this.controls = new Controls(
			(a, i) => this.action(a, i),
			() => this.activity(),
		);
		this.ui = new UI(this);
		this.net = new ExpeditionNetwork(this);
		this.state = this.freshState();
		this.players = [];
		this.effects = [];
		this.lastActivity = performance.now();
		this.accumulator = 0;
		this.cameraPos = { x: 111, y: 12 };
		this.shake = 0;
		this.visualTime = 0;
		this.hubStarted = false;
		this.testMode = new URLSearchParams(location.search).has("test");
		this.testAuto = !this.testMode;
	}
	freshState() {
		return {
			time: 0,
			score: 0,
			found: [false, false, false],
			crumbs: CRUMBS.map(() => false),
			flags: FLAGS.map((_, i) => i === 0),
			visited: [true, false, false, false, false],
			balloon: { x: 118, y: 1.05, rider: null },
			hazards: [],
			returned: false,
			transit: null,
			won: false,
		};
	}
	async init() {
		this.applySettings();
		await this.net.init();
		document.querySelector("#load-status").textContent =
			"Unfolding the caverns · Three.js r180 / Rapier 0.19.3";
		await RAPIER.init();
		this.scene = new T.Scene();
		this.scene.background = new T.Color(0x153b43);
		this.scene.fog = new T.Fog(0x153b43, 48, 105);
		this.world = new Cavern(RAPIER, this.scene);
		if (!this.net.server) {
			this.camera = new T.OrthographicCamera(-20, 20, 11.5, -11.5, 0.1, 160);
			this.renderer = new T.WebGPURenderer({
				canvas: document.querySelector("#game"),
				antialias: true,
				alpha: false,
				forceWebGL:
					new URLSearchParams(location.search).get("renderer") === "webgl",
			});
			this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
			this.renderer.setSize(innerWidth, innerHeight);
			this.renderer.outputColorSpace = T.SRGBColorSpace;
			this.renderer.toneMapping = T.ACESFilmicToneMapping;
			this.renderer.toneMappingExposure = 1.25;
			this.renderer.shadowMap.enabled = true;
			this.renderer.shadowMap.type = T.PCFSoftShadowMap;
			await this.renderer.init();
			this.backend = this.renderer.backend.isWebGPUBackend
				? "WebGPU"
				: "WebGL2 fallback";
			const ambient = new T.AmbientLight(0xc2e5d4, 1.75);
			this.scene.add(ambient);
			this.sun = new T.DirectionalLight(0xffe3af, 2.8);
			this.sun.position.set(100, 34, 25);
			this.sun.target.position.set(118, 10, 0);
			this.sun.castShadow = true;
			this.sun.shadow.mapSize.set(1024, 1024);
			this.sun.shadow.camera.left = -28;
			this.sun.shadow.camera.right = 28;
			this.sun.shadow.camera.top = 30;
			this.sun.shadow.camera.bottom = -26;
			this.sun.shadow.camera.near = 1;
			this.sun.shadow.camera.far = 85;
			this.sun.shadow.bias = -0.0006;
			this.sun.shadow.normalBias = 0.045;
			this.scene.add(this.sun, this.sun.target);
			const rim = new T.DirectionalLight(0x7ed7ca, 1);
			rim.position.set(15, 5, -4);
			this.scene.add(rim);
			addEventListener("resize", () => this.resize());
			this.resize();
			this.installWorldPointer();
		} else this.backend = "server simulation";
		this.setupExplorers(this.net.roster);
		this.updateHazards();
		if (this.net.hub) {
			this.mode = "waiting";
			this.ui.show("waiting");
		} else this.toTitle();
		this.installDebug();
		document.querySelector("#loading").classList.add("hidden");
		this.ready = true;
		this.net.ready();
		let previous = performance.now();
		this.frame = (now) => {
			const dt = Math.min((now - previous) / 1000, 0.06);
			previous = now;
			this.controls.poll();
			if (this.testAuto || this.net.hub) this.tick(dt);
			this.draw(Math.min(dt, 1 / 30));
			this.raf = requestAnimationFrame(this.frame);
		};
		this.raf = requestAnimationFrame(this.frame);
		addEventListener("pagehide", (event) => {
			if (event.persisted) return;
			cancelAnimationFrame(this.raf);
			this.audio.mute(true);
			this.audio.ctx?.close().catch(() => {});
			this.renderer?.dispose();
			this.world.physics.free();
		});
	}
	setupExplorers(roster) {
		for (const p of this.players) this.world.removePlayer(p);
		this.players = [];
		for (const seat of roster) {
			const p = this.world.createPlayer(
				seat.id,
				new T.Color(seat.color || "#e9bd78").getHex(),
			);
			this.players.push(p);
			if (roster.length > 1)
				this.world.label(seat.name, 0, 1.65, 0.3, "#f2dfaa", p.model.root);
		}
	}
	removeExplorer(id) {
		const p = this.players.find((p) => p.id === id);
		if (p) {
			this.world.removePlayer(p);
			this.players = this.players.filter((p) => p.id !== id);
		}
		this.net.inputs.delete(id);
		this.net.commands.delete(id);
	}
	localPlayer() {
		return this.net.server
			? null
			: this.players.find((p) => p.id === this.net.me) || this.players[0];
	}
	start(count = 1, restore = null) {
		if (this.net.hub && this.net.ended) return;
		if (!this.net.hub && !this.net.channel) {
			this.net.host = true;
			this.net.me = 0;
			this.net.connected = count > 1;
			this.net.roster = Array.from({ length: count }, (_, i) => ({
				id: i,
				name: i ? "Pal" : "Pip",
				color: i ? "#89c9c7" : "#e9bd78",
			}));
		}
		this.state = this.freshState();
		this.dev = { safe: false, fly: false, reveal: false };
		this.balance = { ...DEFAULTS };
		this.setupExplorers(this.net.roster);
		this.mode = "playing";
		this.accumulator = 0;
		this.swallowUntil = 0;
		this.ui.close();
		if (restore) {
			this.applySnapshot(restore);
			this.state.won = false;
			for (const p of this.players) p.invuln = 2;
		}
		this.updateHazards();
		const p = this.localPlayer();
		if (p) this.cameraPos = { x: p.x + 4, y: p.y + 4.8 };
		if (!this.net.server) this.audio.init();
		this.audio.mute(false);
		if (!restore)
			this.ui.toast(
				"The picnic has taken a detour.",
				"Find Mox, Dr. Crumb and the golden lunchbox.",
				5,
			);
	}
	toTitle() {
		if (this.net.hub) return;
		if (this.net.peer) this.net.close();
		this.net.connected = false;
		this.net.me = 0;
		this.net.roster = [{ id: 0, name: "Pip", color: "#e9bd78" }];
		this.state = this.freshState();
		this.setupExplorers(this.net.roster);
		this.mode = "title";
		this.lastActivity = performance.now();
		this.cameraPos = { x: 111, y: 12 };
		this.ui.show("title", "title");
		this.updateHazards();
		document.querySelector("#hud").classList.add("hidden");
	}
	pause() {
		if (this.mode !== "playing") return;
		this.ui.show("pause", "pause");
		this.controls.keys.clear();
	}
	resume() {
		if (this.mode === "playing") this.ui.close();
		else if (this.mode === "title") this.ui.show("title");
	}
	activity() {
		this.lastActivity = performance.now();
		if (this.mode === "playing" && !this.net.server) this.audio.init();
		if (this.mode === "attract") {
			this.toTitle();
			this.swallowUntil = performance.now() + 250;
		}
	}
	action(a, i = 0) {
		if (
			this.mode === "loading" ||
			this.mode === "ended" ||
			this.mode === "waiting"
		)
			return;
		if (performance.now() < (this.swallowUntil || 0)) return;
		if (a === "fullscreen") {
			this.fullscreen();
			return;
		}
		if (this.ui.current) {
			this.ui.navigate(a);
			return;
		}
		if (this.mode === "attract") {
			this.toTitle();
			return;
		}
		if (this.mode !== "playing") return;
		if (a === "pause" || a === "back") {
			this.pause();
			return;
		}
		if (a === "map") {
			this.ui.show("map", "pause");
			return;
		}
		const p =
			i === 1 || a === "interact2"
				? this.players.find((p) => p.id === 1)
				: this.localPlayer();
		if (a === "interact" || a === "interact2") {
			if (!this.net.host) this.net.interact = true;
			else if (p) p.pendingInteract = true;
		}
		if (a === "jump" && p) p.jumpBuffer = 0.14;
	}
	menuAction(a) {
		if (a === "solo") {
			if (this.net.hub) return;
			if (this.net.peer) this.net.close();
			this.start(1);
		} else if (a === "continue") this.start(1, this.saved?.snapshot);
		else if (a === "couch") this.start(2);
		else if (a === "resume") this.resume();
		else if (a === "title") {
			if (this.net.hub) return;
			if (!this.state.won && this.mode === "playing") this.save();
			this.toTitle();
		} else if (a === "glyphs") {
			this.settings.xbox = +!this.settings.xbox;
			this.persistSettings();
			this.ui.show("settings");
		} else if (a === "motion") {
			this.settings.steady = +!this.settings.steady;
			this.persistSettings();
			this.ui.show("settings");
		} else if (a === "fullscreen") this.fullscreen();
		else if (a === "safe" || a === "fly") {
			this.dev[a] = !this.dev[a];
			this.ui.show("dev");
		} else if (a === "reveal") {
			this.dev.reveal = true;
			this.state.visited.fill(true);
			this.ui.toast("Every field note unfolded.");
		} else if (a === "warp") {
			this.warpIndex = ((this.warpIndex || 0) + 1) % 6;
			this.warp(this.warpIndex);
			this.ui.toast("Landmark reached.", "Close the kit to explore.");
		} else if (a === "find-all") {
			this.state.found.fill(true);
			this.state.score += 3000;
			this.ui.toast(
				"The picnic party is accounted for.",
				"Ride the Picnic Express to camp.",
			);
		} else if (a === "crumb-all") {
			this.state.crumbs.fill(true);
			this.state.score += 1200;
			this.ui.toast("Every golden crumb collected.");
		} else if (a === "defaults") {
			this.balance = { ...DEFAULTS };
			this.dev = { safe: false, fly: false, reveal: false };
			this.ui.show("dev");
		} else if (a === "offer") this.net.offer();
		else if (a === "accept")
			this.net.accept(document.querySelector("#signal-in").value);
		else if (a === "copy") {
			const el = document.querySelector("#signal-out");
			el.select();
			if (navigator.clipboard?.writeText)
				navigator.clipboard
					.writeText(el.value)
					.then(() => this.net.status("Code copied."))
					.catch(() =>
						this.net.status("Select the code and copy it with your keyboard."),
					);
			else {
				document.execCommand("copy");
				this.net.status("Code selected for copying.");
			}
		} else if (a === "cancel-link") {
			this.net.close();
			this.net.status("Connection cancelled.");
			const out = document.querySelector("#signal-out");
			if (out) out.value = "";
		}
	}
	fullscreen() {
		const promise = document.fullscreenElement
			? document.exitFullscreen()
			: document.documentElement.requestFullscreen?.();
		promise?.catch(() => this.ui.toast("Fullscreen is unavailable here."));
	}
	applySettings() {
		this.audio.music = this.settings.music;
		this.audio.effects = this.settings.effects;
	}
	persistSettings() {
		this.applySettings();
		try {
			localStorage.setItem(SETTINGS, JSON.stringify(this.settings));
		} catch {}
	}
	glyph(a) {
		const pad = this.controls.last === "gamepad",
			touch = this.controls.last === "touch";
		if (touch)
			return (
				{
					jump: "↑",
					interact: "✦",
					map: "Map",
					pause: "Ⅱ",
					confirm: "Tap",
					back: "‹",
					move: "Drag",
					vertical: "Swipe ↑↓",
				}[a] || a
			);
		if (pad)
			return (
				(this.settings.xbox
					? {
							jump: "A",
							interact: "X",
							map: "Y",
							pause: "☰",
							confirm: "A",
							back: "B",
							move: "L",
							vertical: "L ↑↓",
						}
					: {
							jump: "×",
							interact: "□",
							map: "△",
							pause: "Options",
							confirm: "×",
							back: "○",
							move: "L",
							vertical: "L ↑↓",
						})[a] || a
			);
		return (
			{
				jump: "Space",
				interact: "E",
				map: "M",
				pause: "Esc",
				confirm: "Enter",
				back: "Esc",
				move: "A D / ← →",
				vertical: "W S / ↑ ↓",
			}[a] || a
		);
	}
	zoneName(p) {
		return ZONES[this.zone(p)];
	}
	zone(p) {
		return p.y > 22 && p.x > 130
			? 4
			: p.x > 108
				? 3
				: p.x > 82
					? 2
					: p.x > 42
						? 1
						: 0;
	}
	objectiveText() {
		const f = this.state.found;
		if (!f[0]) return "Find Mox in the Moss Gallery →";
		if (!f[1]) return "Find Dr. Crumb beneath the river →";
		if (!f[2]) return "Ride the updraft to the golden lunchbox ↑";
		return this.state.returned
			? "Ring the bell at camp. Time for lunch."
			: "All together! Board the Picnic Express →";
	}
	context(p) {
		if (!p || this.state.transit !== null) return null;
		const near = (x, y, r = 2) => Math.hypot(p.x - x, p.y - y) < r;
		if (p.balloon)
			return {
				kind: "release",
				label: "Jump off · steer toward the high ledge",
				x: p.x,
				y: p.y,
			};
		if (
			near(6.5, 1, 2.5) &&
			this.state.found.every(Boolean) &&
			this.state.returned
		)
			return { kind: "bell", label: "Ring the camp bell", x: 6.5, y: 1 };
		if (!this.state.found[0] && near(35.8, 0.9, 2))
			return { kind: "mox", label: "Rescue Mox", x: 35.8, y: 0.9 };
		if (!this.state.found[1] && near(76.5, -8.1, 2.1))
			return { kind: "doc", label: "Rescue Dr. Crumb", x: 76.5, y: -8.1 };
		if (!this.state.found[2] && near(150, 25.1, 2))
			return {
				kind: "lunch",
				label: "Recover the golden lunchbox",
				x: 150,
				y: 25.1,
			};
		if (near(160, 24.9, 2.3))
			return {
				kind: "trolley",
				label: this.state.found.every(Boolean)
					? "Picnic Express · return to camp"
					: "Picnic Express · find the whole party first",
				x: 160,
				y: 24.9,
			};
		const b = this.state.balloon;
		if (b.rider === null && near(b.x, b.y + 0.5, 2.4) && b.y < 3.2)
			return {
				kind: "balloon",
				label: "Board balloon · rise, steer, then jump",
				x: b.x,
				y: b.y + 0.5,
			};
		return null;
	}
	interact(p) {
		const c = this.context(p);
		if (!c) return;
		if (["mox", "doc", "lunch"].includes(c.kind)) {
			const i = ["mox", "doc", "lunch"].indexOf(c.kind);
			this.state.found[i] = true;
			this.state.score += i === 2 ? 2000 : 500;
			this.audio.sfx("rescue");
			this.audio.voice(i + 1);
			this.burst(c.x, c.y, 0xf3cc77);
			this.ui.toast(
				[
					"Mox is on the trail home!",
					"Dr. Crumb has made a discovery!",
					"The golden lunchbox! Still warm.",
				][i],
				[
					"“Bibble-bap! I knew that shortcut was fishy.”",
					"“Brrm-wah! A remarkable place to misplace a picnic.”",
					"Bring the whole picnic party to the return trolley.",
				][i],
				5,
			);
			this.save();
		} else if (c.kind === "balloon") {
			p.balloon = true;
			p.climbing = false;
			p.balloonTime = 0;
			p.invuln = Math.max(p.invuln, 2);
			this.state.balloon.rider = p.id;
			p.body.setTranslation(
				{ x: this.state.balloon.x, y: this.state.balloon.y + 0.85, z: 0 },
				true,
			);
			p.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
			this.audio.sfx("balloon");
			this.ui.toast(
				"Up is a perfectly good direction.",
				"Rise above the ledge, steer right, then jump off.",
				4.5,
			);
		} else if (c.kind === "release") {
			this.releaseBalloon(p);
		} else if (c.kind === "trolley") {
			if (this.state.found.every(Boolean)) {
				this.state.transit = 0;
				this.ui.toast(
					"All aboard the Picnic Express!",
					"Next stop: a well-earned lunch.",
					4,
				);
				this.audio.sfx("balloon");
			} else
				this.ui.toast(
					"Nobody gets left below.",
					"Find Mox, Dr. Crumb and the golden lunchbox first.",
				);
		} else if (c.kind === "bell") this.win();
	}
	releaseBalloon(p) {
		p.balloon = false;
		p.balloonTime = 0;
		this.state.balloon.rider = null;
		p.body.setGravityScale(1, true);
		p.body.setLinvel(
			{ x: p.facing * this.balance.speed, y: this.balance.jump * 0.8, z: 0 },
			true,
		);
		p.jumpWas = true;
		p.jumpBuffer = 0;
		this.audio.sfx("jump");
	}
	burst(x, y, color) {
		if (this.net.server) return;
		const m = new T.Mesh(
			new T.TorusGeometry(0.45, 0.035, 4, 20),
			new T.MeshBasicMaterial({ color, transparent: true }),
		);
		m.position.set(x, y, 2);
		this.scene.add(m);
		this.effects.push({ mesh: m, life: 0.8, max: 0.8 });
	}
	updateHazards() {
		this.state.hazards = HAZARDS.map((h, i) => {
			const t = this.state.time * h.speed * this.balance.hazard + i;
			return {
				x: h.x + Math.sin(t) * h.range,
				y: h.y + (h.type === "scorpion" ? 0 : Math.sin(t * 1.6) * 0.65),
				facing: Math.cos(t) > 0 ? 1 : -1,
			};
		});
	}
	tick(dt) {
		this.visualTime += dt;
		if (this.mode === "waiting" && this.hubStarted && AIHub.time() >= 0) {
			this.start(this.net.roster.length);
		}
		if (this.mode === "title") {
			const p = this.localPlayer();
			if (p) {
				p.x = 120;
				p.y = 12.7 + Math.sin(this.visualTime) * 0.15;
				p.balloon = true;
				p.invuln = 0;
				p.mode = "balloon";
				this.state.balloon = { x: p.x, y: p.y - 0.85, rider: p.id };
			}
			if (
				this.ui.current === "title" &&
				performance.now() - this.lastActivity > 10000
			)
				this.beginAttract();
		} else if (this.mode === "attract") this.attract(dt);
		else if (this.mode === "playing") {
			const paused = !!this.ui.current && !this.net.hub && !this.net.channel;
			if (!paused && this.net.host) {
				this.accumulator += dt;
				while (this.accumulator >= 1 / 60) {
					this.simulate(1 / 60);
					this.accumulator -= 1 / 60;
				}
			}
			if (!paused) this.net.tick(dt);
			if (!paused && this.net.connected && !this.net.host) this.updateHazards();
			if (!paused && this.controls.last === "touch") this.touchAssist(dt);
		}
		this.audio.zone = this.localPlayer() ? this.zone(this.localPlayer()) : 0;
		this.audio.tick();
		this.ui.update();
	}
	inputFor(p) {
		if (p.id === this.net.me && !this.net.server)
			return this.ui.current
				? { x: 0, y: 0, jump: false }
				: this.controls.read(0);
		if (!this.net.hub && !this.net.channel)
			return this.controls.read(p.id === this.net.me ? 0 : 1);
		const input = this.net.inputs.get(p.id);
		const command = this.net.commands.get(p.id);
		if (command) {
			p.pendingInteract ||= !!command.interact;
			if (command.jump) p.jumpBuffer = Math.max(p.jumpBuffer, 0.14);
			this.net.commands.delete(p.id);
		}
		return input && performance.now() - input.at < 700
			? input
			: { x: 0, y: 0, jump: false };
	}
	simulate(dt) {
		const s = this.state;
		if (s.won) return;
		s.time += dt;
		this.world.physics.gravity.y = -this.balance.gravity;
		this.updateHazards();
		if (s.transit !== null) {
			s.transit += dt / 8;
			const t = clamp(s.transit, 0, 1),
				e = t * t * (3 - 2 * t);
			const x = 160 - 153 * e,
				y = 25 - 24 * e + Math.sin(t * Math.PI) * 13;
			for (let index = 0; index < this.players.length; index++) {
				const p = this.players[index],
					offset = (index - (this.players.length - 1) / 2) * 0.6;
				p.body.setGravityScale(0, true);
				p.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
				p.body.setTranslation({ x: x + offset, y: y + 0.9, z: 0 }, true);
				p.x = x + offset;
				p.y = y + 0.9;
				p.mode = "balloon";
				p.balloon = false;
				p.invuln = 3;
			}
			this.world.trolley.position.set(x, y, 0.2);
			if (t >= 1) {
				s.transit = null;
				s.returned = true;
				for (const p of this.players) {
					p.checkpoint = 0;
					p.body.setGravityScale(1, true);
				}
				this.world.trolley.position.set(160, 25, 0.2);
				this.ui.toast(
					"Back where the kettle is.",
					"Ring the camp bell to finish the expedition.",
				);
				this.save();
			}
			return;
		}
		for (const p of this.players) {
			const i = this.inputFor(p),
				pos = p.body.translation();
			p.x = pos.x;
			p.y = pos.y;
			p.invuln = Math.max(0, p.invuln - dt);
			p.jumpBuffer = Math.max(0, p.jumpBuffer - dt);
			const jumpEdge = i.jump && !p.jumpWas;
			if (jumpEdge) p.jumpBuffer = 0.14;
			p.jumpWas = !!i.jump;
			const ray = new RAPIER.Ray(
				{ x: p.x, y: p.y - 0.06, z: 0 },
				{ x: 0, y: -1, z: 0 },
			);
			const hit = this.world.physics.castRay(
				ray,
				0.76,
				true,
				RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC,
				undefined,
				p.collider,
				p.body,
			);
			p.grounded = !!hit && hit.timeOfImpact < 0.71;
			p.coyote = p.grounded ? 0.12 : Math.max(0, p.coyote - dt);
			const wasWater = p.water;
			p.water = p.x > 41.8 && p.x < 84 && p.y < 0.22 && p.y > -10.5;
			if (p.water && !wasWater) this.audio.sfx("splash");
			let vx = i.x * this.balance.speed,
				vy = p.body.linvel().y;
			if (Math.abs(i.x) > 0.12) p.facing = i.x > 0 ? 1 : -1;
			const ladder = LADDERS.find(
				(l) =>
					Math.abs(p.x - l.x) < 0.64 &&
					p.y > l.bottom - 0.1 &&
					p.y < l.top + 1.1,
			);
			if (!ladder || p.water || p.balloon) p.climbing = false;
			if (ladder && Math.abs(i.y) > 0.2 && !p.balloon) p.climbing = true;
			if (this.dev.fly) {
				p.body.setGravityScale(0, true);
				vx = i.x * this.balance.speed;
				vy = i.y * this.balance.speed;
				p.mode = "float";
			} else if (p.balloon) {
				p.balloonTime += dt;
				p.body.setGravityScale(0, true);
				vx = i.x * 3.4;
				vy = this.balance.lift + i.y * 1.5;
				if ((p.x < 109 && vx < 0) || (p.x > 155 && vx > 0)) vx = 0;
				if (p.y > 32 && vy > 0) vy = 0;
				p.mode = "balloon";
				if ((jumpEdge || p.jumpBuffer > 0) && p.balloonTime > 0.35) {
					this.releaseBalloon(p);
					vx = i.x * this.balance.speed;
					vy = this.balance.jump * 0.8;
				}
			} else if (p.water) {
				p.body.setGravityScale(0, true);
				vx = i.x * this.balance.swim + 0.3;
				vy = (i.jump ? 1 : i.y) * this.balance.swim;
				if (p.y > -0.1 && vy > 0) vy = this.balance.jump * 0.65;
				p.mode = "swim";
				p.jumpBuffer = 0;
			} else if (p.climbing) {
				p.body.setGravityScale(0, true);
				vx = i.x * this.balance.speed * 0.6;
				vy = i.y * 3.5;
				if (!i.x) vx = (ladder.x - p.x) * 6;
				if (p.y > ladder.top + 0.9 && vy > 0) vy = 0;
				if (p.y < ladder.bottom + 0.7 && vy < 0) {
					p.climbing = false;
					vy = 0;
				}
				p.mode = "climb";
				if (jumpEdge) {
					p.climbing = false;
					vy = this.balance.jump * 0.8;
				}
			} else {
				p.body.setGravityScale(1, true);
				p.mode = p.grounded ? "run" : "jump";
				if (p.jumpBuffer > 0 && p.coyote > 0) {
					vy = this.balance.jump;
					p.jumpBuffer = 0;
					p.coyote = 0;
					p.grounded = false;
					this.audio.sfx("jump");
				}
				if (!i.jump && vy > 5) vy -= this.balance.gravity * dt * 0.45;
			}
			p.body.setLinvel({ x: vx, y: clamp(vy, -22, 16), z: 0 }, true);
			if (p.pendingInteract || (i.interact && i.seq !== p.lastActionSeq)) {
				p.pendingInteract = false;
				p.lastActionSeq = i.seq;
				this.interact(p);
			}
		}
		this.world.physics.step();
		for (const p of this.players) {
			const pos = p.body.translation(),
				v = p.body.linvel();
			p.x = pos.x;
			p.y = pos.y;
			p.vx = v.x;
			p.vy = v.y;
			if (p.balloon) {
				s.balloon.x = p.x;
				s.balloon.y = p.y - 0.85;
			}
			const zone = this.zone(p);
			s.visited[zone] = true;
			for (let f = 0; f < FLAGS.length; f++)
				if (
					Math.abs(p.x - FLAGS[f].x) < 1.2 &&
					Math.abs(p.y - FLAGS[f].y - 0.75) < 1.1
				) {
					if (!s.flags[f]) {
						s.flags[f] = true;
						this.audio.sfx("checkpoint");
						this.ui.toast(
							"Pennant reached.",
							`Checkpoint: ${FLAGS[f].name}`,
							2.5,
						);
						this.burst(p.x, p.y, 0x98dfc3);
					}
					if (p.checkpoint < f) {
						for (const other of this.players) other.checkpoint = f;
						this.save();
					}
				}
			for (let c = 0; c < CRUMBS.length; c++)
				if (
					!s.crumbs[c] &&
					distance(p, { x: CRUMBS[c][0], y: CRUMBS[c][1] }) < 0.9
				) {
					s.crumbs[c] = true;
					s.score += 100;
					this.audio.sfx("coin");
					this.burst(CRUMBS[c][0], CRUMBS[c][1], 0xffde87);
					this.save();
				}
			if (p.invuln <= 0 && !this.dev.safe && !this.dev.fly && !p.climbing) {
				for (let h = 0; h < s.hazards.length; h++)
					if (
						distance(p, s.hazards[h]) < (HAZARDS[h].type === "eel" ? 0.8 : 0.75)
					) {
						this.hurt(p);
						break;
					}
			}
			if (p.y < -12 || p.x < -10 || p.x > 173) this.hurt(p, true);
		}
		if (s.balloon.rider === null) {
			s.balloon.x += (118 - s.balloon.x) * Math.min(1, dt * 1.2);
			s.balloon.y += (1.05 - s.balloon.y) * Math.min(1, dt * 1.5);
		}
		if (!this.net.hub && !this.net.channel && this.players.length > 1) {
			const a = this.players[0],
				b = this.players[1];
			if (distance(a, b) > 32) {
				this.teleport(b, a.x - 1, a.y + 1);
				this.ui.toast(
					"Stay within lantern light.",
					"Your friend caught up.",
					2,
				);
			}
		}
	}
	touchAssist(dt) {
		const p = this.localPlayer();
		if (!p || !this.net.host) return;
		const c = this.context(p);
		if (c && ["mox", "doc", "lunch"].includes(c.kind)) {
			this.assistTime = (this.assistTime || 0) + dt;
			if (this.assistTime > 0.65) {
				this.interact(p);
				this.assistTime = 0;
			}
		} else this.assistTime = 0;
	}
	hurt(p, force = false) {
		if (!force && (p.invuln > 0 || this.dev.safe)) return;
		this.burst(p.x, p.y, 0xf38b70);
		p.hits++;
		this.state.score = Math.max(0, this.state.score - 100);
		p.balloon = false;
		p.climbing = false;
		if (this.state.balloon.rider === p.id) this.state.balloon.rider = null;
		const cp = FLAGS[p.checkpoint] || FLAGS[0];
		this.teleport(p, cp.x, cp.y + 0.9);
		p.invuln = 3;
		this.shake = 0.35;
		this.audio.sfx("hit");
		this.ui.toast(
			"A minor setback. A familiar pennant.",
			"−100 points · discoveries kept",
			2.8,
		);
	}
	teleport(p, x, y) {
		p.body.setTranslation({ x, y, z: 0 }, true);
		p.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
		p.body.setGravityScale(1, true);
		p.x = x;
		p.y = y;
		p.vx = p.vy = 0;
		p.climbing = false;
		p.balloon = false;
	}
	warp(index) {
		const spots = [
			[6, 1],
			[36, 1],
			[76, -7.9],
			[94, 10.9],
			[118, 1],
			[139, 25],
		];
		for (const p of this.players) {
			this.teleport(p, spots[index][0] + p.id * 0.6, spots[index][1]);
			p.invuln = 3;
		}
		this.state.balloon.rider = null;
		const p = this.localPlayer();
		this.cameraPos = { x: p.x + 3, y: p.y + 4 };
	}
	win() {
		if (this.state.won) return;
		this.state.won = true;
		this.state.score += 500 + (this.state.crumbs.every(Boolean) ? 1000 : 0);
		this.audio.sfx("win");
		this.audio.voice(9);
		this.burst(6, 2, 0xffdd88);
		try {
			localStorage.removeItem(SAVE);
		} catch {}
		this.saved = null;
		this.ui.show("victory", "victory");
		this.net.finish(true);
	}
	save() {
		if (this.net.hub || this.mode !== "playing" || this.state.won) return;
		const snapshot = this.snapshot();
		const explorer =
			snapshot.players.find((p) => p.id === this.net.me) || snapshot.players[0];
		if (!explorer) return;
		snapshot.players = [{ ...explorer, id: 0 }];
		snapshot.balloon = explorer.balloon
			? { ...snapshot.balloon, rider: 0 }
			: { x: 118, y: 1.05, rider: null };
		const record = { version: 1, snapshot };
		try {
			localStorage.setItem(SAVE, JSON.stringify(record));
			this.saved = record;
		} catch {}
	}
	snapshot() {
		const s = this.state;
		return {
			time: s.time,
			score: s.score,
			found: [...s.found],
			crumbs: [...s.crumbs],
			flags: [...s.flags],
			visited: [...s.visited],
			balloon: { ...s.balloon },
			returned: s.returned,
			transit: s.transit,
			won: s.won,
			players: this.players.map((p) => ({
				id: p.id,
				x: p.x,
				y: p.y,
				vx: p.vx,
				vy: p.vy,
				facing: p.facing,
				grounded: p.grounded,
				water: p.water,
				climbing: p.climbing,
				balloon: p.balloon,
				invuln: p.invuln,
				checkpoint: p.checkpoint,
				mode: p.mode,
				hits: p.hits,
			})),
		};
	}
	applySnapshot(s) {
		if (
			!s ||
			!Array.isArray(s.players) ||
			!Array.isArray(s.found) ||
			!this.world
		)
			return;
		for (const key of [
			"time",
			"score",
			"found",
			"crumbs",
			"flags",
			"visited",
			"balloon",
			"returned",
			"transit",
			"won",
		])
			if (s[key] !== undefined)
				this.state[key] =
					typeof s[key] === "object" && s[key] !== null
						? structuredClone(s[key])
						: s[key];
		for (const q of s.players) {
			const p = this.players.find((p) => p.id === q.id);
			if (!p) continue;
			for (const k of Object.keys(q)) if (k !== "id" && k in p) p[k] = q[k];
			p.body.setTranslation({ x: p.x, y: p.y, z: 0 }, true);
			p.body.setLinvel({ x: p.vx, y: p.vy, z: 0 }, true);
		}
		if (this.state.won && !this.ui.current) this.ui.show("victory", "victory");
		this.updateHazards();
	}
	beginAttract() {
		this.state = this.freshState();
		this.mode = "attract";
		this.attractTime = 0;
		this.ui.close();
		this.localPlayer().invuln = 0;
	}
	attract(dt) {
		this.attractTime += dt;
		const points = [
			[6, 0.8],
			[15, 0.8],
			[21, 2.5],
			[26, 3.2],
			[36, 0.8],
			[45, -2],
			[55, -4],
			[65, -7],
			[77, -7.5],
			[86, 0.8],
			[93, 4],
			[93, 10.8],
			[101, 14],
			[110, 17.8],
			[118, 1],
			[118, 10],
			[121, 23],
			[136, 25],
			[150, 25],
			[160, 25],
			[95, 31],
			[7, 0.8],
		];
		const t = this.attractTime / 3,
			idx = Math.floor(t) % points.length,
			f = t % 1,
			a = points[idx],
			b = points[(idx + 1) % points.length],
			p = this.localPlayer();
		p.x = a[0] + (b[0] - a[0]) * f;
		p.y = a[1] + (b[1] - a[1]) * f;
		p.vx = (b[0] - a[0]) / 3;
		p.facing = b[0] >= a[0] ? 1 : -1;
		p.grounded = idx < 4 || idx === 9 || idx >= 17;
		p.water = idx >= 5 && idx <= 8;
		p.climbing = idx >= 10 && idx <= 12;
		p.balloon = idx >= 14 && idx <= 16;
		p.mode = p.water
			? "swim"
			: p.climbing
				? "climb"
				: p.balloon
					? "balloon"
					: "run";
		p.invuln = 0;
		this.state.time += dt;
		this.state.found = [idx >= 4, idx >= 8, idx >= 18];
		this.state.balloon = p.balloon
			? { x: p.x, y: p.y - 0.85, rider: p.id }
			: { x: 118, y: 1.05, rider: null };
		this.updateHazards();
	}
	resize() {
		if (!this.renderer) return;
		this.renderer.setSize(innerWidth, innerHeight);
		this.aspect = innerWidth / innerHeight;
	}
	draw(dt) {
		this.world.updateVisuals(dt, this.visualTime, this.state, this.players);
		if (!this.renderer) return;
		const p = this.localPlayer();
		let x = 111,
			y = 12,
			height = 23;
		if (this.mode !== "title" && p) {
			x = p.x + 3.3;
			y = p.y + (p.water ? 3.4 : 4.7);
			if (p.balloon) y = p.y + 3.2;
			if (!this.net.hub && !this.net.channel && this.players.length > 1) {
				const q = this.players[1];
				x = (p.x + q.x) / 2 + 2;
				y = (p.y + q.y) / 2 + 4;
				height = Math.max(
					23,
					Math.abs(p.y - q.y) + 12,
					(Math.abs(p.x - q.x) + 16) / this.aspect,
				);
			}
		}
		x = clamp(x, 3, 160);
		y = clamp(y, 1, 30);
		const blend = this.settings.steady ? 1 : 1 - Math.exp(-dt * 4.8);
		this.cameraPos.x += (x - this.cameraPos.x) * blend;
		this.cameraPos.y += (y - this.cameraPos.y) * blend;
		this.shake = Math.max(0, this.shake - dt);
		const shake = this.settings.steady
			? 0
			: this.shake * 0.16 * Math.sin(this.visualTime * 85);
		const h = height / 2,
			w = h * this.aspect;
		this.camera.left = -w;
		this.camera.right = w;
		this.camera.top = h;
		this.camera.bottom = -h;
		this.camera.updateProjectionMatrix();
		this.camera.position.set(
			this.cameraPos.x + 1.5 + shake,
			this.cameraPos.y + 1.2,
			34,
		);
		this.camera.lookAt(this.cameraPos.x, this.cameraPos.y, 0);
		this.sun.position.set(this.cameraPos.x - 16, this.cameraPos.y + 24, 25);
		this.sun.target.position.set(this.cameraPos.x, this.cameraPos.y - 5, 0);
		for (let i = this.effects.length - 1; i >= 0; i--) {
			const e = this.effects[i];
			e.life -= dt;
			e.mesh.scale.setScalar(1 + (1 - e.life / e.max) * 3);
			e.mesh.material.opacity = Math.max(0, e.life / e.max);
			if (e.life <= 0) {
				this.scene.remove(e.mesh);
				e.mesh.geometry.dispose();
				e.mesh.material.dispose();
				this.effects.splice(i, 1);
			}
		}
		this.renderer.render(this.scene, this.camera);
	}
	installWorldPointer() {
		const c = document.querySelector("#game"),
			ray = new T.Raycaster(),
			plane = new T.Plane(new T.Vector3(0, 0, 1), 0),
			target = new T.Vector3();
		const pick = (e) => {
			ray.setFromCamera(
				new T.Vector2(
					(e.clientX / innerWidth) * 2 - 1,
					1 - (e.clientY / innerHeight) * 2,
				),
				this.camera,
			);
			ray.ray.intersectPlane(plane, target);
			const context = this.context(this.localPlayer());
			return (
				context && Math.hypot(target.x - context.x, target.y - context.y) < 2.4
			);
		};
		c.addEventListener("pointermove", (e) => {
			if (e.pointerType !== "touch" && !this.ui.current)
				c.style.cursor = pick(e) ? "pointer" : "default";
		});
		c.addEventListener("pointerup", (e) => {
			if (e.pointerType !== "touch" && !this.ui.current && pick(e))
				this.action("interact");
		});
	}
	installDebug() {
		const g = this;
		window.__game = {
			ready: true,
			title: "Pitfall: The Lost Lunch",
			engine: "Three.js r180",
			physics: "Rapier 0.19.3",
			get backend() {
				return g.backend;
			},
			get mode() {
				return g.mode;
			},
			get menu() {
				return g.ui.current;
			},
			get state() {
				return g.snapshot();
			},
			get settings() {
				return { ...g.settings };
			},
			get balance() {
				return { ...g.balance };
			},
			get network() {
				return {
					hub: g.net.hub,
					host: g.net.host,
					me: g.net.me,
					server: g.net.server,
					connected: g.net.connected,
					sent: g.net.sent,
					received: g.net.received,
					ended: g.net.ended,
				};
			},
			get inputDevice() {
				return g.controls.last;
			},
			get audio() {
				return {
					...g.audio.events,
					music: g.audio.music,
					enabled: g.audio.enabled,
				};
			},
			verifyAudio: () => g.audio.verify(),
			pause: () => g.pause(),
		};
		if (this.testMode) {
			Object.assign(window.__game, {
				start: (count = 1) => g.start(count),
				step: (frames = 1) => {
					for (let i = 0; i < frames; i++) g.tick(1 / 60);
					g.draw(1 / 60);
					return g.snapshot();
				},
				input: (i, data) => {
					g.controls.test[i] = { x: 0, y: 0, jump: false, ...data };
				},
				action: (a) => g.action(a),
				teleport: (x, y, id = g.net.me) =>
					g.teleport(
						g.players.find((p) => p.id === id),
						x,
						y,
					),
				safe: (value) => (g.dev.safe = value),
				autoplay: (value) => (g.testAuto = value),
				attract: () => {
					g.lastActivity = performance.now() - 10001;
					g.tick(1 / 60);
				},
				save: () => g.save(),
				render: () => g.draw(1 / 60),
				setClock: (t) => {
					g.state.time = t;
					g.updateHazards();
				},
				hurt: () => g.hurt(g.localPlayer(), true),
				raw: g,
			});
			Object.defineProperty(window.__game, "animations", {
				get: () =>
					g.players.map((p) => ({
						mode: p.mode,
						clip: p.model.animation,
						mixerTime: p.model.mixer.time,
					})),
			});
		}
	}
}

const game = new LostLunch();
game.init().catch((e) => {
	console.error(e);
	document.querySelector("#load-status").textContent =
		"The lantern could not be lit: " +
		e.message +
		". Try a current WebGPU browser, or the WebGL2 fallback.";
	document.querySelector("#loading h1").textContent = "A snag in the rope.";
	window.__bootError = String(e.stack || e);
	if (window.AIHub?.active)
		AIHub.fail(`Engine could not initialize: ${e.message}`);
});
