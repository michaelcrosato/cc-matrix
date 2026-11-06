import { chatter, KitchenAudio, tone } from "./audio.js";
import { CHUTES, clamp, DEFAULTS, dist, Kitchen, SHIFTS } from "./model.js";
import { KitchenNetwork } from "./net.js";
import { $, esc, KitchenUI } from "./ui.js";
import { DinerView } from "./view.js";

class Game {
	constructor() {
		this.audio = new KitchenAudio();
		this.ui = new KitchenUI(this);
		this.net = new KitchenNetwork(this);
		this.screen = "title";
		this.keys = new Set();
		this.lastInput = performance.now();
		this.lastFrame = performance.now();
		this.elapsed = 0;
		this.acc = 0;
		this.attract = false;
		this.assist = false;
		this.localCoop = false;
		this.highScore = 0;
		this.roomStatus = "";
		this.remoteState = null;
		this.pauseFrom = "title";
		this.returnStack = [];
		this.pads = {};
		this.padInputs = {};
		this.touch = null;
		this.touchMode = false;
		this.clickTarget = null;
		this.hubCountdown = false;
		this.hubEnded = false;
		this.assistTimers = {};
		this.lastMode = "brief";
		this.intermissionAt = 0;
		this.hubEndReason = "unknown";
		this.errors = [];
		this.keyEdges = {};
		this.testingPauseRender = !!window.__PRESS_TEST__;
		try {
			const prefs = JSON.parse(
				localStorage.getItem("press-for-burgers-settings") || "{}",
			);
			this.audio.musicVolume = prefs.music ?? 0.1;
			this.audio.sfxVolume = prefs.sfx ?? 0.7;
			this.audio.voices = prefs.voices ?? true;
			this.ui.glyphs = prefs.glyphs || "ps";
			this.assist = prefs.assist || false;
			this.highScore = Number(
				localStorage.getItem("press-for-burgers-best") || 0,
			);
		} catch {}
	}
	get state() {
		return this.remoteState && !this.net.host
			? this.remoteState
			: this.sim.state;
	}
	async init() {
		await Kitchen.init();
		this.sim = new Kitchen(1983, 1);
		this.preview();
		this.view = await new DinerView().init($("view"));
		this.bindInput();
		$("loading").classList.add("hidden");
		if (navigator.maxTouchPoints > 0) {
			this.touchMode = true;
			this.ui.input = "touch";
			document.body.classList.add("touch");
		}
		if (!(await this.net.hub())) this.open("title");
		document.body.dataset.ready = "true";
		this.lastFrame = performance.now();
		const animate = (t) => {
			this.frame(t);
			requestAnimationFrame(animate);
		};
		requestAnimationFrame(animate);
		window.__game = {
			ready: true,
			app: this,
			state: () => this.state,
			snapshot: () => this.sim.snapshot(),
			input: (id, v) => {
				this.testInputs ??= {};
				this.testInputs[id] = v;
			},
			step: (seconds, bot = false) => this.testStep(seconds, bot),
			newService: (count = 1) => {
				this.start(count);
				this.sim.beginShift();
				this.open(null);
			},
			setMode: (m) => {
				this.sim.state.mode = m;
			},
			startAttract: () => this.startAttract(),
			stopAttract: () => this.stopAttract(),
			render: () => this.view.render(this.state, 1 / 60, false, this.elapsed),
			engine: () => ({
				three: "180",
				rapier: "0.19.3",
				backend: this.view.backend,
			}),
			audioOffline: () => this.testAudio(),
			net: () => ({
				kind: this.net.kind,
				host: this.net.host,
				me: this.net.me,
				players: this.net.players,
				sent: this.net.sent,
				received: this.net.received,
			}),
		};
	}
	preview() {
		this.sim.beginShift();
		this.sim.spawnFood(0);
		this.sim.state.foods[0].x = 3.5;
		this.sim.foodBodies
			.get(this.sim.state.foods[0].id)
			.setTranslation({ x: 3.5, y: 1.2, z: -4 }, true);
		const b = this.sim.state.burgers[0];
		b.toppings = [...b.recipe];
		b.ready = true;
		b.z = -0.8;
		this.sim.state.players[0].x = 0.6;
		this.sim.state.players[0].z = 1.7;
		this.sim.state.players[0].face = -0.45;
		this.sim.drainEvents();
		this.sim.state.mode = "brief";
	}
	open(screen) {
		this.screen = screen;
		this.keys.clear();
		this.keyEdges = {};
		this.clickTarget = null;
		this.ui.show(screen);
		$("touch-hint").classList.toggle(
			"hidden",
			!this.touchMode || !!screen || this.attract,
		);
		if (screen !== "title") this.lastInput = performance.now();
	}
	go(screen) {
		this.returnStack.push(this.screen || "pause");
		this.open(screen);
	}
	back() {
		const current = this.screen;
		if (AIHub.active && ["hubWaiting", "hubEnd"].includes(current)) return;
		if (current === "brief") {
			this.title();
			return;
		}
		if (current === "title") return;
		if (current === "room") {
			this.action("leaveRoom");
			return;
		}
		this.open(
			this.returnStack.pop() ||
				(this.state.mode === "playing" ? "pause" : "title"),
		);
	}
	start(count = 1) {
		this.net.disconnect();
		this.localCoop = count === 2;
		this.remoteState = null;
		this.sim.reset(crypto.getRandomValues(new Uint32Array(1))[0], count);
		this.sim.invincible = false;
		this.sim.autoChef = false;
		this.lastMode = "brief";
		this.returnStack = [];
		this.open("brief");
	}
	title() {
		if (AIHub.active) return;
		this.attract = false;
		$("attract").classList.add("hidden");
		this.net.disconnect();
		this.localCoop = false;
		this.sim.reset(1983, 1);
		this.preview();
		this.lastMode = "brief";
		this.returnStack = [];
		this.open("title");
		this.lastInput = performance.now();
	}
	configureNetwork(seed, players, _me) {
		this.remoteState = null;
		this.sim.reset(seed, 0);
		this.localCoop = false;
		for (const p of players) this.sim.addPlayer(p.id);
		this.lastMode = "brief";
	}
	pause() {
		if (this.hubEnded) return;
		if (this.attract) {
			if (
				this.state.mode === "playing" &&
				this.state.time > 8 &&
				this.state.stats.brakes === 0
			)
				this.sim.useBrake();
			if (
				this.state.mode === "playing" &&
				this.state.time > 16 &&
				this.state.stats.rejected === 0 &&
				this.state.players[0].held?.kind === "topping"
			)
				this.sim.reject(this.state.players[0]);
			this.stopAttract();
			return;
		}
		if (this.screen) {
			if (this.screen === "pause") this.open(null);
			return;
		}
		if (this.state.mode === "playing") {
			this.returnStack = [];
			this.open("pause");
		}
	}
	action(action) {
		this.audio.unlock();
		this.lastInput = performance.now();
		if (action.startsWith("about-")) {
			this.ui.aboutTab = action.slice(6);
			this.open("about");
			return;
		}
		if (action === "solo") {
			this.start(1);
			return;
		}
		if (action === "local") {
			this.start(2);
			return;
		}
		if (action === "begin") {
			this.sim.beginShift();
			this.open(null);
			return;
		}
		if (
			action === "friends" ||
			action === "settings" ||
			action === "help" ||
			action === "about" ||
			action === "dev" ||
			action === "online"
		) {
			if (action === "online") this.roomStatus = "";
			this.go(action);
			return;
		}
		if (action === "back") {
			this.back();
			return;
		}
		if (action === "resume") {
			this.returnStack = [];
			this.open(null);
			return;
		}
		if (action === "title") {
			this.title();
			return;
		}
		if (action === "retry") {
			if (this.net.active) {
				if (this.net.host) {
					this.sim.reset(this.net.seed || 1983, 0);
					for (const p of this.net.players) this.sim.addPlayer(p.id);
					this.net.finished = false;
					this.net.start();
				}
				return;
			}
			this.start(this.localCoop ? 2 : 1);
			return;
		}
		if (action === "next") {
			if (this.net.host) {
				this.sim.nextShift();
				this.open(null);
			}
			return;
		}
		if (action === "host") {
			this.net.hostRoom();
			return;
		}
		if (action === "join") {
			this.net.joinRoom($("room-input")?.value || "");
			return;
		}
		if (action === "startRoom") {
			this.net.start();
			return;
		}
		if (action === "leaveRoom") {
			this.net.disconnect();
			this.open("friends");
			return;
		}
		if (action === "fullscreen") {
			if (document.fullscreenElement) document.exitFullscreen?.();
			else document.documentElement.requestFullscreen?.().catch(() => {});
			return;
		}
		if (action === "god") {
			this.sim.invincible = !this.sim.invincible;
			this.open("dev");
			return;
		}
		if (action === "auto") {
			this.sim.autoChef = !this.sim.autoChef;
			this.open("dev");
			return;
		}
		if (action === "heal") {
			this.sim.state.rating = 99;
			this.ui.toast("Rating restored. Fresh apron, fresh start.");
			return;
		}
		if (action === "resetTuning") {
			this.sim.tuning = { ...DEFAULTS };
			this.sim.invincible = false;
			this.sim.autoChef = false;
			this.open("dev");
			return;
		}
		if (action === "skip") {
			if (!this.net.host) return;
			this.sim.state.shiftServed = SHIFTS[this.sim.state.shift].goal;
			this.sim.state.totalServed = SHIFTS.slice(
				0,
				this.sim.state.shift + 1,
			).reduce((sum, x) => sum + x.goal, 0);
			this.sim.state.burgers = [];
			for (const f of [...this.sim.state.foods]) this.sim.removeFood(f);
			for (const p of this.sim.state.players) p.held = null;
			this.sim.state.mode = this.sim.state.shift === 2 ? "won" : "intermission";
			this.sim.state.result = this.sim.state.shift === 2 ? true : null;
			this.open(this.sim.state.mode);
			return;
		}
	}
	setting(key, value) {
		if (key === "music") {
			this.audio.musicVolume = Number(value) / 100;
			$("music").nextElementSibling.value = `${value}%`;
		}
		if (key === "effects") {
			this.audio.sfxVolume = Number(value) / 100;
			$("effects").nextElementSibling.value = `${value}%`;
		}
		if (key === "voices") this.audio.voices = value === "on";
		if (key === "glyphs") this.ui.glyphs = value;
		if (key === "assist") this.assist = value === "on";
		this.audio.updateGains();
		try {
			localStorage.setItem(
				"press-for-burgers-settings",
				JSON.stringify({
					music: this.audio.musicVolume,
					sfx: this.audio.sfxVolume,
					voices: this.audio.voices,
					glyphs: this.ui.glyphs,
					assist: this.assist,
				}),
			);
		} catch {}
	}
	device(type) {
		this.lastInput = performance.now();
		if (this.attract) {
			this.stopAttract();
			return true;
		}
		if (type === "touch") {
			this.touchMode = true;
			document.body.classList.add("touch");
		} else if (this.touchMode && type !== "touch") {
			this.touchMode = false;
			document.body.classList.remove("touch");
		}
		if (this.ui.input !== type) {
			this.ui.input = type;
			if (this.screen) {
				const f = this.ui.focus;
				this.ui.show(this.screen);
				this.ui.setFocus(f, false);
			}
		}
		return false;
	}
	bindInput() {
		addEventListener("keydown", (e) => {
			if (this.hubEnded) return;
			const wasAttract = this.device("keyboard");
			if (wasAttract) {
				e.preventDefault();
				return;
			}
			this.audio.unlock();
			const text = e.target.matches("input[type=text]");
			if (text) {
				if (e.code === "Enter") {
					e.preventDefault();
					this.action("join");
				}
				if (e.code === "Escape") {
					e.preventDefault();
					this.back();
				}
				return;
			}
			const control = [
				"ArrowUp",
				"ArrowDown",
				"ArrowLeft",
				"ArrowRight",
				"Space",
				"Enter",
				"Escape",
				"Backspace",
				"Tab",
			];
			if (control.includes(e.code)) e.preventDefault();
			if (e.repeat && this.screen) return;
			this.keys.add(e.code);
			if (this.screen) {
				if (e.code === "Escape" || e.code === "Backspace") {
					this.screen === "pause" ? this.open(null) : this.back();
					return;
				}
				if (e.code === "Enter" || e.code === "Space") {
					this.ui.activate();
					return;
				}
				if (e.code === "Tab") {
					this.ui.navigate(0, e.shiftKey ? -1 : 1);
					return;
				}
				const directions = {
					ArrowUp: [0, -1],
					ArrowDown: [0, 1],
					ArrowLeft: [-1, 0],
					ArrowRight: [1, 0],
					KeyW: [0, -1],
					KeyS: [0, 1],
					KeyA: [-1, 0],
					KeyD: [1, 0],
				};
				if (directions[e.code]) this.ui.navigate(...directions[e.code]);
				if (e.code === "PageDown") this.ui.scroll(250);
				if (e.code === "PageUp") this.ui.scroll(-250);
				return;
			}
			if (e.code === "Escape" || e.code === "KeyP") this.pause();
			if (!e.repeat && !this.screen) {
				const id =
					this.localCoop &&
					["Enter", "Backspace", "ShiftRight"].includes(e.code)
						? 1
						: this.net.active
							? this.net.me
							: 0;
				const action = ["KeyE", "Space", "Enter"].includes(e.code)
					? "action"
					: e.code === "KeyQ"
						? "brake"
						: ["ShiftLeft", "ShiftRight"].includes(e.code)
							? "dash"
							: null;
				if (action) {
					this.keyEdges[id] ??= {};
					this.keyEdges[id][action] = true;
				}
			}
		});
		addEventListener("keyup", (e) => this.keys.delete(e.code));
		addEventListener("blur", () => {
			this.keys.clear();
			if (
				!this.net.active &&
				!this.attract &&
				!this.screen &&
				this.state.mode === "playing"
			)
				this.pause();
		});
		addEventListener("pointermove", (e) => {
			if (e.pointerType === "touch") return;
			if (e.movementX || e.movementY) this.device("keyboard");
		});
		$("view").addEventListener("pointerdown", (e) => {
			if (this.hubEnded) return;
			if (this.device(e.pointerType === "touch" ? "touch" : "keyboard")) return;
			this.audio.unlock();
			if (this.screen) return;
			if (e.pointerType === "touch") {
				if (!this.touch) {
					this.touch = {
						id: e.pointerId,
						x: e.clientX,
						y: e.clientY,
						dx: 0,
						dy: 0,
						start: performance.now(),
					};
					$("view").setPointerCapture(e.pointerId);
					this.touchVisual();
				} else this.touchAction = true;
			} else if (e.button === 2) {
				this.mouseReject = true;
			} else {
				this.clickTarget = this.view.destination(
					e.clientX,
					e.clientY,
					this.state,
				);
				this.mouseAction = true;
			}
		});
		$("view").addEventListener("pointermove", (e) => {
			if (this.touch?.id === e.pointerId) {
				$("touch-hint").classList.add("hidden");
				this.touch.dx = clamp((e.clientX - this.touch.x) / 65, -1, 1);
				this.touch.dy = clamp((e.clientY - this.touch.y) / 65, -1, 1);
				this.lastInput = performance.now();
				this.touchVisual();
			}
		});
		const up = (e) => {
			if (this.touch?.id === e.pointerId) {
				if (
					performance.now() - this.touch.start < 250 &&
					Math.hypot(this.touch.dx, this.touch.dy) < 0.15
				) {
					this.clickTarget = this.view.destination(
						e.clientX,
						e.clientY,
						this.state,
					);
					this.touchAction = true;
				}
				this.touch = null;
				$("touch-ring").classList.add("hidden");
				$("touch-dot").classList.add("hidden");
			}
			this.mouseReject = false;
		};
		addEventListener("pointerup", up);
		addEventListener("pointercancel", up);
		$("view").addEventListener("contextmenu", (e) => e.preventDefault());
		addEventListener("gamepadconnected", () =>
			this.ui.toast("Apron detected. Controller ready."),
		);
	}
	touchVisual() {
		const t = this.touch;
		if (!t) return;
		$("touch-ring").classList.remove("hidden");
		$("touch-dot").classList.remove("hidden");
		$("touch-ring").style.left = `${t.x}px`;
		$("touch-ring").style.top = `${t.y}px`;
		$("touch-dot").style.left = `${t.x + t.dx * 40}px`;
		$("touch-dot").style.top = `${t.y + t.dy * 40}px`;
	}
	pollPads(dt) {
		this.padInputs = {};
		const pads = navigator.getGamepads?.() || [];
		for (const pad of pads) {
			if (!pad) continue;
			const prev = this.pads[pad.index] || { buttons: [], axisTime: 0 },
				pressed = (i) => !!pad.buttons[i]?.pressed,
				edge = (i) => pressed(i) && !prev.buttons[i];
			const x = Math.abs(pad.axes[0] || 0) > 0.18 ? pad.axes[0] : 0,
				z = Math.abs(pad.axes[1] || 0) > 0.18 ? pad.axes[1] : 0;
			const activity =
				Math.hypot(x, z) > 0.25 ||
				pad.buttons.some((b, i) => b.pressed && !prev.buttons[i]);
			if (activity) {
				if (this.device("gamepad")) {
					prev.buttons = pad.buttons.map((b) => b.pressed);
					this.pads[pad.index] = prev;
					continue;
				}
				this.audio.unlock();
			}
			if (this.hubEnded) continue;
			if (edge(9) && !pressed(8)) this.pause();
			if (this.screen) {
				const dx = pressed(14)
						? -1
						: pressed(15)
							? 1
							: x < -0.5
								? -1
								: x > 0.5
									? 1
									: 0,
					dy = pressed(12)
						? -1
						: pressed(13)
							? 1
							: z < -0.5
								? -1
								: z > 0.5
									? 1
									: 0;
				prev.axisTime -= dt;
				if ((dx || dy) && prev.axisTime <= 0) {
					this.ui.navigate(dx, dy);
					prev.axisTime = 0.19;
				}
				if (!dx && !dy) prev.axisTime = 0;
				if (edge(0)) this.ui.activate();
				if (edge(1)) this.screen === "pause" ? this.open(null) : this.back();
				const scroll = pad.axes[3] || 0;
				if (Math.abs(scroll) > 0.15) this.ui.scroll(scroll * dt * 650);
			} else {
				const id = this.net.active
					? this.net.me
					: this.localCoop
						? Math.min(pad.index, 1)
						: 0;
				this.padInputs[id] = {
					x,
					z,
					action: pressed(0),
					reject: pressed(1),
					dash: edge(2),
					brake: edge(5),
				};
			}
			prev.buttons = pad.buttons.map((b) => b.pressed);
			this.pads[pad.index] = prev;
		}
	}
	input(id) {
		const primary = this.net.active ? this.net.me : 0;
		const p = this.state.players.find((p) => p.id === id);
		if (!p) return {};
		if (this.testInputs?.[id]) return this.testInputs[id];
		const i = { ...(this.padInputs[id] || {}), ...(this.keyEdges[id] || {}) };
		if (this.keyEdges[id]?.action) {
			i.actionPress = true;
			delete this.keyEdges[id].action;
		}
		if (this.screen) return {};
		const has = (k) => this.keys.has(k);
		if (id === primary) {
			const arrows = !this.localCoop;
			const x =
				Number(has("KeyD") || (arrows && has("ArrowRight"))) -
				Number(has("KeyA") || (arrows && has("ArrowLeft")));
			const z =
				Number(has("KeyS") || (arrows && has("ArrowDown"))) -
				Number(has("KeyW") || (arrows && has("ArrowUp")));
			if (x || z) {
				i.x = x;
				i.z = z;
				this.clickTarget = null;
			}
			i.action ||=
				has("KeyE") || has("Space") || this.mouseAction || this.touchAction;
			i.reject ||= has("KeyR") || this.mouseReject;
			i.dash ||= has("ShiftLeft") || (!this.localCoop && has("ShiftRight"));
			i.brake ||= has("KeyQ");
			if (this.touch) {
				i.x = this.touch.dx;
				i.z = this.touch.dy;
				this.clickTarget = null;
			}
			if (this.clickTarget) {
				const t = this.clickTarget;
				i.x = clamp((t.x - p.x) * 2, -1, 1);
				i.z = clamp((t.z - p.z) * 2, -1, 1);
				i.action ||= dist(t, p) < 1.4;
				if (dist(t, p) < 0.35) this.clickTarget = null;
			}
			if (this.assist || this.touchMode) {
				if (
					this.touchMode &&
					this.state.burgers.some((b) => b.z > 2.8) &&
					this.state.brakeCooldown <= 0
				)
					i.brake = true;
				if (
					this.touchMode &&
					this.touch &&
					Math.hypot(this.touch.dx, this.touch.dy) > 1.2 &&
					p.cooldown <= 0
				)
					i.dash = true;
				const now = this.elapsed;
				let near = false;
				if (p.held?.kind === "burger")
					near = CHUTES.some((x) => Math.hypot(p.x - x, p.z - 5.7) < 1.4);
				else
					near =
						this.state.burgers.some(
							(b) => Math.hypot(p.x + 3.9, p.z - b.z) < 1.5,
						) &&
						(!!p.held ||
							this.state.burgers.some(
								(b) => b.ready && Math.abs(b.z - p.z) < 1.4,
							));
				if (near && now - (this.assistTimers[id] || 0) > 0.42) {
					i.action = true;
					this.assistTimers[id] = now;
				}
				if (
					p.held?.kind === "topping" &&
					!this.state.burgers.some(
						(b) =>
							b.recipe.includes(p.held.type) &&
							!b.toppings.includes(p.held.type),
					)
				)
					i.reject = true;
			}
		}
		if (this.localCoop && id === 1) {
			i.x ||= Number(has("ArrowRight")) - Number(has("ArrowLeft"));
			i.z ||= Number(has("ArrowDown")) - Number(has("ArrowUp"));
			i.action ||= has("Enter");
			i.reject ||= has("Backspace");
			i.dash ||= has("ShiftRight");
		}
		return i;
	}
	effect(e) {
		this.view.event(e);
		this.audio.play(e.type);
		const messages = {
			brake: "BELT ON A BREATHER · 5 SECONDS",
			rush: "THREE IN A ROW! LUNCH RUSH!",
			bun: "TOP BUN ON · READY TO CARRY",
			shift: `SHIFT ${this.state.shift + 1} · ${SHIFTS[this.state.shift].name}`,
		};
		if (messages[e.type])
			this.ui.toast(messages[e.type], e.type === "shift" ? 3 : 2);
		if (e.type === "mistake" && e.amount >= 5) this.ui.toast(e.message, 2.5);
		if (e.type === "served" || e.type === "mistake") {
			const pads = navigator.getGamepads?.() || [];
			for (const p of pads)
				try {
					p?.vibrationActuator
						?.playEffect("dual-rumble", {
							duration: e.type === "served" ? 90 : 170,
							strongMagnitude: 0.15,
							weakMagnitude: 0.35,
						})
						?.catch(() => {});
				} catch {}
		}
	}
	startAttract() {
		if (this.net.active) return;
		this.attract = true;
		this.attractStart = this.elapsed;
		this.sim.reset(1983, 1);
		this.sim.invincible = true;
		this.sim.tuning = {
			...DEFAULTS,
			beltSpeed: 0.1,
			spawnInterval: 1.2,
			catchRadius: 1.1,
		};
		this.sim.beginShift();
		this.open(null);
		$("attract").classList.remove("hidden");
	}
	stopAttract() {
		this.attract = false;
		this.sim.tuning = { ...DEFAULTS };
		this.title();
	}
	checkMode() {
		const s = this.state;
		if (s.mode === this.lastMode) return;
		this.lastMode = s.mode;
		if (s.mode === "intermission" || s.mode === "won" || s.mode === "lost") {
			this.intermissionAt = this.elapsed;
			if (!this.attract) this.open(s.mode);
			if (s.mode === "won" || s.mode === "lost") {
				if (!this.attract) {
					this.highScore = Math.max(this.highScore, s.score);
					try {
						localStorage.setItem(
							"press-for-burgers-best",
							String(this.highScore),
						);
					} catch {}
					if (this.net.kind === "hub" && this.net.host)
						this.net.finish(s.mode === "won");
				}
			}
		} else if (
			s.mode === "playing" &&
			["intermission", "brief", "room"].includes(this.screen)
		)
			this.open(null);
	}
	frame(now) {
		const dt = Math.min(0.05, Math.max(0.001, (now - this.lastFrame) / 1000));
		this.lastFrame = now;
		this.elapsed += dt;
		this.pollPads(dt);
		if (
			this.screen === "title" &&
			!this.attract &&
			!this.net.active &&
			performance.now() - this.lastInput >= 10000
		)
			this.startAttract();
		if (this.hubCountdown) {
			const t = AIHub.time();
			$("countdown").classList.toggle("hidden", t >= 0);
			$("countdown").textContent = String(Math.max(1, Math.ceil(-t / 1000)));
			if (t >= 0) {
				this.hubCountdown = false;
				if (this.net.host) this.sim.beginShift();
			}
		}
		const canSim =
			!this.hubEnded &&
			!this.hubCountdown &&
			this.net.host &&
			(!this.screen || this.net.active || this.attract) &&
			this.sim.state.mode === "playing";
		let didSim = false;
		if (canSim) {
			this.acc += dt;
			let steps = 0;
			while (this.acc >= 1 / 60 && steps++ < 4) {
				const inputs = {};
				for (const p of this.sim.state.players) {
					if (this.attract || this.sim.autoChef)
						inputs[p.id] = this.sim.bot(p.id, true);
					else if (this.net.active && p.id !== this.net.me) {
						const i = this.net.remoteInputs[p.id];
						inputs[p.id] = i && performance.now() - i.at < 600 ? i : {};
					} else inputs[p.id] = this.input(p.id);
				}
				this.sim.tick(1 / 60, inputs);
				didSim = true;
				this.acc -= 1 / 60;
			}
		} else this.acc = 0;
		if (this.net.active && !this.net.host && !this.hubEnded)
			this.net.input(this.input(this.net.me));
		if (didSim || (this.net.active && !this.net.host)) {
			this.mouseAction = false;
			this.touchAction = false;
			this.keyEdges = {};
		}
		if (this.net.host) {
			for (const e of this.sim.drainEvents()) {
				this.effect(e);
				if (this.net.active) this.net.pendingEvents.push(e);
			}
		}
		this.net.tick(dt);
		this.checkMode();
		if (this.attract) {
			if (
				this.state.mode === "intermission" &&
				this.elapsed - this.intermissionAt > 2
			)
				this.sim.nextShift();
			if (
				(this.state.mode === "won" || this.elapsed - this.attractStart > 160) &&
				this.elapsed - this.intermissionAt > 3
			)
				this.startAttract();
		}
		if (
			this.net.kind === "hub" &&
			this.net.host &&
			this.sim.state.mode === "intermission" &&
			this.elapsed - this.intermissionAt > 4
		)
			this.sim.nextShift();
		this.audio.tick();
		this.ui.hud(this.state, this.elapsed);
		if (!this.testingPauseRender)
			this.view.render(this.state, dt, this.screen === "title", this.elapsed);
	}
	testStep(seconds, bot = false) {
		for (let i = 0; i < Math.ceil(seconds * 60); i++) {
			const inputs = {};
			for (const p of this.sim.state.players)
				inputs[p.id] = bot
					? this.sim.bot(p.id, true)
					: this.testInputs?.[p.id] || {};
			this.sim.tick(1 / 60, inputs);
			for (const e of this.sim.drainEvents()) {
				this.view.event(e);
			}
			if (bot && this.sim.state.mode === "intermission") this.sim.nextShift();
		}
		this.remoteState = null;
		this.checkMode();
		return this.sim.snapshot();
	}
	async testAudio() {
		const ctx = new OfflineAudioContext(1, 48000, 48000);
		tone(ctx, ctx.destination, 523, 0, 0.2, 0.2);
		chatter(ctx, ctx.destination, 0.3, 2);
		const buffer = await ctx.startRendering();
		const a = buffer.getChannelData(0);
		return {
			rms: Math.sqrt(a.reduce((v, x) => v + x * x, 0) / a.length),
			peak: a.reduce((v, x) => Math.max(v, Math.abs(x)), 0),
			samples: a.length,
		};
	}
}

const game = new Game();
game.init().catch((error) => {
	console.error(error);
	$("load-status").innerHTML =
		`The kitchen could not open: ${esc(error.message)}<br>Use a browser with WebGPU or WebGL2. This file includes all game libraries.`;
	document.body.dataset.error = error.message;
	if (window.AIHub?.active) AIHub.fail(error.message);
	window.__gameError = error.message;
});
