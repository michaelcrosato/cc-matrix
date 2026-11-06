import { HouseAudio } from "./audio.js";
import { ROOM_FLAVOR, ROOMS } from "./data.js";
import credits from "./metadata.js";
import { Mansion, readyPhysics } from "./model.js";
import { GhostRace } from "./network.js";
import { HouseUI } from "./ui.js";
import { HouseView } from "./view.js";

const $ = (s) => document.querySelector(s);
const DEFAULT_SETTINGS = {
	master: 0.75,
	music: 0.1,
	effects: 0.7,
	glyphs: "ps",
	difficulty: "midnight",
	reduced: false,
};
class FrightHouse {
	constructor() {
		let saved = {};
		try {
			saved = JSON.parse(localStorage.getItem("fright-settings") || "{}");
		} catch {}
		this.settings = { ...DEFAULT_SETTINGS, ...saved };
		this.keys = new Set();
		this.queued = {};
		this.inputType = navigator.maxTouchPoints > 0 ? "touch" : "keyboard";
		document.body.classList.toggle("touch", this.inputType === "touch");
		this.audio = new HouseAudio(this.settings);
		this.view = new HouseView($("#world"));
		this.net = new GhostRace((k, d) => this.networkEvent(k, d));
		this.ui = new HouseUI(this);
		this.mode = "loading";
		this.screen = null;
		this.lastActivity = performance.now();
		this.last = performance.now();
		this.lastHud = 0;
		this.lastSend = 0;
		this.padPrevious = [];
		this.padNavAt = 0;
		this.manualMode = false;
		this.pointerTarget = null;
		this.touch = null;
		this.touchBlock = null;
		this.tourIndex = -1;
		this.tourElapsed = 0;
		this.tourPhase = 0;
		this.hiddenPause = false;
		this.testMode = new URLSearchParams(location.search).has("test");
		this.bindInput();
	}
	async init() {
		const networkReady = this.net.init();
		await Promise.all([readyPhysics, this.view.init()]);
		this.model = new Mansion((k, d) => this.gameEvent(k, d));
		this.model.difficulty = this.settings.difficulty;
		await networkReady;
		if (this.net.viaHub) {
			this.mode = "hubwait";
			this.ui.clear();
			$("#hud").hidden = false;
		} else this.toTitle();
		this.view.sync(this.model, 1 / 60, { title: !this.net.viaHub });
		this.ready = true;
		$("#loading").hidden = true;
		this.net.ready();
		window.__fright = {
			getState: () => this.snapshot(),
			credits,
			rooms: ROOMS,
			audio: this.audio,
		};
		if (this.testMode) {
			Object.assign(window.__fright, {
				model: this.model,
				app: this,
				manual: (v) => {
					this.manualMode = v;
				},
				step: (seconds, input = {}) => {
					for (let left = seconds; left > 1e-6; left -= 1 / 60)
						this.model.step(Math.min(left, 1 / 60), input);
					this.ui.hud();
					return this.model.snapshot();
				},
				start: () => this.startGame(),
				attract: () => this.startAttract(),
			});
		}
		this.last = performance.now();
		requestAnimationFrame((t) => this.frame(t));
	}
	saveSettings() {
		try {
			localStorage.setItem("fright-settings", JSON.stringify(this.settings));
		} catch {}
	}
	setInput(type) {
		if (this.inputType === type) return;
		this.inputType = type;
		document.body.classList.toggle("touch", type === "touch");
		this.ui.refreshPrompts();
	}
	activity() {
		this.lastActivity = performance.now();
		if (this.mode === "attract") {
			this.toTitle();
			return true;
		}
		return false;
	}
	toast(text, duration = 3.6) {
		$("#toast").textContent = text;
		$("#toast").classList.add("visible");
		clearTimeout(this.toastTimer);
		this.toastTimer = setTimeout(
			() => $("#toast").classList.remove("visible"),
			duration * 1000,
		);
	}
	startGame(kind = "solo") {
		if (this.net.viaHub && kind === "solo") return;
		if (kind === "solo" && this.net.active) this.net.close();
		this.model.difficulty = this.net.active
			? "midnight"
			: this.settings.difficulty;
		this.model.reset();
		this.model.cheats = {
			invincible: false,
			noclip: false,
			reveal: false,
			freeze: false,
			pilot: false,
		};
		this.mode = "play";
		this.ui.clear();
		this.keys.clear();
		this.queued = {};
		this.pointerTarget = null;
		this.touchBlock = null;
		this.view.roomId = -1;
		$("#hud").hidden = false;
		$("#attract-banner").hidden = true;
		$("#countdown").hidden = true;
		this.audio.setPlaying(true);
		this.audio.unlock();
		this.lastActivity = performance.now();
		this.toast("The key is in the Cloakroom. Keep a match handy.", 5);
		this.ui.hud();
	}
	resume() {
		if (this.mode !== "play") return;
		this.ui.clear();
		this.keys.clear();
		this.pointerTarget = null;
		this.last = performance.now();
	}
	toTitle() {
		if (this.net.viaHub) return;
		if (this.net.active) this.net.close();
		if (!this.model) return;
		this.model.reset();
		this.model.cheats = {
			invincible: false,
			noclip: false,
			reveal: false,
			freeze: false,
			pilot: false,
		};
		this.model.x = -0.3;
		this.model.z = 1.7;
		this.model.facing = 0.3;
		this.model.match = 999;
		this.model.enemies = [
			{
				id: 0,
				type: "ghost",
				x: 3.4,
				z: -1.6,
				mode: "prowl",
				phase: 0,
				timer: 2,
			},
			{ id: 1, type: "bat", x: 4.6, z: 1.5, mode: "prowl", phase: 1, timer: 2 },
		];
		this.model.makePhysics();
		this.view.roomId = -1;
		this.view.clearRemotes();
		this.mode = "title";
		this.ui.title();
		this.keys.clear();
		this.pointerTarget = null;
		this.lastActivity = performance.now();
		$("#hud").hidden = true;
		$("#attract-banner").hidden = true;
		$("#countdown").hidden = true;
		$("#toast").classList.remove("visible");
		this.audio.setPlaying(true);
	}
	resetPilot() {
		this.tourIndex = -1;
		this.tourElapsed = 0;
		this.tourPhase = 0;
	}
	startAttract() {
		if (this.net.active || this.net.viaHub) return;
		this.model.reset();
		this.model.cheats.invincible = true;
		this.model.cheats.noclip = true;
		this.view.roomId = -1;
		this.mode = "attract";
		this.ui.clear();
		this.resetPilot();
		$("#hud").hidden = false;
		$("#attract-banner").hidden = false;
		$("#toast").classList.remove("visible");
		this.pointerTarget = null;
	}
	pilot(dt) {
		const m = this.model;
		this.tourElapsed += dt;
		const tour = [
			{ room: 0, x: 0, z: 1.4 },
			{ room: 1, item: "key" },
			{ room: 2, item: "scepter" },
			{ room: 3, key: true, x: 5.8, z: 0 },
			{ room: 5, x: 2, z: 1 },
			{ room: 7, x: -2, z: 1.5 },
			{ room: 10, item: "urn-a" },
			{ room: 9, x: -3.8, z: -2.65 },
			{ room: 14, item: "urn-b" },
			{ room: 16, x: -1.5, z: 1.7 },
			{ room: 20, x: 1, z: 1.8 },
			{ room: 22, x: -2.2, z: 1.8 },
			{ room: 23, item: "urn-c" },
			{ room: 0, x: 0, z: 4.3 },
		];
		const index = Math.floor(this.tourElapsed / 7.5);
		if (index >= tour.length) {
			if (this.tourElapsed > tour.length * 7.5 + 5) {
				m.reset();
				m.cheats.invincible = true;
				m.cheats.noclip = true;
				this.view.roomId = -1;
				this.resetPilot();
			}
			return {};
		}
		const stop = tour[index];
		if (index !== this.tourIndex) {
			this.tourIndex = index;
			this.tourPhase = 0;
			m.result = null;
			m.enter(stop.room);
			m.cooldown = 0;
			m.strike();
			if (stop.key) {
				m.drop();
				const key = m.items.find((i) => i.id === "key");
				if (key) {
					m.items.splice(m.items.indexOf(key), 1);
					m.carried = key;
				}
			}
			if (stop.item?.startsWith("urn") && m.carried?.type !== "urn") {
				m.drop();
				m.cooldown = 0;
			}
			if (stop.item === "urn-b" && !m.carried) {
				m.carried = { id: "tour-urn", type: "urn", parts: 1, room: 14 };
				m.items = m.items.filter((i) => i.id !== "urn-a");
			}
			this.toast(ROOM_FLAVOR[stop.room], 4.4);
		}
		const item = stop.item ? m.items.find((i) => i.id === stop.item) : null;
		const target = item || { x: stop.x ?? 0, z: stop.z ?? 1.5 };
		const d = Math.hypot(target.x - m.x, target.z - m.z);
		const input = { x: 0, z: 0 };
		if (d > 0.8) {
			input.x = ((target.x - m.x) / d) * 0.7;
			input.z = ((target.z - m.z) / d) * 0.7;
		} else if (item && this.tourPhase === 0 && m.cooldown <= 0) {
			m.interact();
			this.tourPhase++;
		}
		if (m.match < 3 && this.tourElapsed % 7.5 < 5) m.strike();
		if (stop.key && m.carried?.type === "key") m.unlock("east");
		if (index === tour.length - 1 && m.carried?.parts === 7 && d < 1) m.win();
		return input;
	}
	gameEvent(kind, data) {
		if (!this.model) return;
		this.view.react(kind);
		if (kind === "step") {
			if (this.mode === "play" || this.mode === "attract")
				this.audio.sfx("step", this.model.x / 9);
			return;
		}
		if (
			[
				"match",
				"wind",
				"door",
				"unlock",
				"pickup",
				"join",
				"scare",
				"bat",
				"ghost",
				"spider",
				"up",
				"down",
				"win",
				"lose",
			].includes(kind)
		)
			this.audio.sfx(kind, this.model.x / 9);
		if (kind === "room") {
			this.pointerTarget = null;
			if (this.mode === "play")
				this.toast(
					(this.inputType === "touch" ? `${ROOMS[data.room].name}. ` : "") +
						ROOM_FLAVOR[data.room],
				);
		}
		if (kind === "locked")
			this.toast("A locked door. The master key might improve matters.", 2.4);
		if (kind === "pickup") {
			if (this.inputType === "touch")
				this.touchBlock = {
					room: this.model.room,
					x: this.model.x,
					z: this.model.z,
				};
			const item = data.item;
			this.audio.voice("happy");
			this.toast(
				item.type === "key"
					? "The master key. Doors stay unlocked once opened."
					: item.type === "scepter"
						? "The moon scepter. Bad company keeps its distance."
						: "An urn piece. Find its two companions.",
			);
		}
		if (kind === "drop") this.toast("Put down. Your map will remember it.", 2);
		if (kind === "join") {
			this.audio.voice("happy");
			this.touchBlock = {
				room: this.model.room,
				x: this.model.x,
				z: this.model.z,
			};
			this.toast("The pieces fit. The house does not approve.");
		}
		if (kind === "final") {
			this.toast("The urn is whole. Get back to the front door!", 6);
			this.audio.voice("boo");
		}
		if (kind === "haunted")
			this.toast("The ghost heard that. Walls will not keep it out.", 5);
		if (kind === "scare") {
			this.audio.voice("boo");
			this.toast(`${this.model.lives} chances remain. Keep moving.`, 2.5);
			if (!this.settings.reduced) {
				$("#scare-flash").classList.add("on");
				setTimeout(() => $("#scare-flash").classList.remove("on"), 400);
			}
			try {
				const pad = [...navigator.getGamepads()].find(Boolean);
				pad?.vibrationActuator?.playEffect("dual-rumble", {
					duration: 200,
					strongMagnitude: 0.6,
					weakMagnitude: 0.3,
				});
			} catch {}
		}
		if (kind === "theft")
			this.toast("The bat took your object! It is still in this room.", 5);
		if (kind === "repel" && this.model.stats.repels === 1)
			this.toast("The scepter makes an excellent argument.", 3);
		if (kind === "wind" && this.mode === "play")
			this.toast("A cold breath. Your match has gone out.", 2.6);
		if (kind === "win" || kind === "lose") {
			if (this.mode === "attract") return;
			this.mode = "result";
			this.net.result(this.model);
			this.ui.results();
		}
	}
	networkEvent(kind, data) {
		if (kind === "ghost") {
			this.view.remotePlayer(data.id, data.state, data.color);
			return;
		}
		if (kind === "lobby") {
			if (!this.net.viaHub && this.ready && this.mode === "title")
				this.ui.lobby();
			return;
		}
		if (kind === "status") {
			const el = $("#network-status");
			if (el) el.textContent = data.message;
			return;
		}
		if (kind === "start") {
			this.mode = "countdown";
			this.ui.clear();
			if (this.model) {
				this.model.reset();
				this.model.match = 12;
				this.view.roomId = -1;
			}
			this.raceStartAt = data.at;
			$("#hud").hidden = false;
			$("#countdown").hidden = false;
			this.audio.setPlaying(true);
			return;
		}
		if (kind === "timeup") {
			this.net.result(this.model);
			this.toast("The house has called time.");
			return;
		}
		if (kind === "end") {
			this.mode = "ended";
			this.ui.clear();
			this.keys.clear();
			this.queued = {};
			this.pointerTarget = null;
			this.audio.setPlaying(false);
			$("#countdown").hidden = true;
			$("#toast").classList.remove("visible");
			return;
		}
		if (kind === "leave") {
			const obj = this.view.remote.get(data.id);
			if (obj) {
				this.view.scene.remove(obj);
				this.view.remote.delete(data.id);
			}
			if (this.ui.page === "lobby") this.ui.lobby();
			return;
		}
		if (kind === "results" && this.mode === "result") this.ui.results();
	}
	bindInput() {
		window.addEventListener(
			"keydown",
			(e) => {
				if (!this.ready) return;
				if (this.activity()) {
					e.preventDefault();
					return;
				}
				this.setInput("keyboard");
				this.audio.unlock();
				if (this.net.ended) return;
				const k = e.key.toLowerCase();
				if (e.target?.id === "join-code" && /^[0-9]$/.test(e.key)) return;
				this.keys.add(k);
				if (this.screen) {
					if (
						[
							"arrowup",
							"arrowdown",
							"arrowleft",
							"arrowright",
							"enter",
							" ",
							"escape",
							"tab",
						].includes(k)
					)
						e.preventDefault();
					if (e.repeat) return;
					if (k === "arrowup") this.ui.navigate(0, -1);
					if (k === "arrowdown") this.ui.navigate(0, 1);
					if (k === "arrowleft") this.ui.navigate(-1, 0);
					if (k === "arrowright") this.ui.navigate(1, 0);
					if (k === "enter" || k === " ") this.ui.confirm();
					if (k === "escape") this.ui.goBack();
					if (k === "tab" && this.ui.page === "map") this.ui.handle("mapclose");
					return;
				}
				if (
					[
						"arrowup",
						"arrowdown",
						"arrowleft",
						"arrowright",
						" ",
						"tab",
					].includes(k)
				)
					e.preventDefault();
				if (e.repeat) return;
				if (this.mode === "play") {
					if (k === "e") this.queued.interact = true;
					if (k === " ") this.queued.match = true;
					if (k === "q") this.queued.drop = true;
					if (k === "tab") {
						this.ui.mapBack = null;
						this.ui.mapFloor = ROOMS[this.model.room].floor;
						this.ui.map();
					}
					if (k === "escape") this.ui.pause();
				}
			},
			true,
		);
		window.addEventListener("keyup", (e) =>
			this.keys.delete(e.key.toLowerCase()),
		);
		window.addEventListener("blur", () => {
			this.keys.clear();
			this.touch = null;
			$("#touch-glimmer").hidden = true;
		});
		document.addEventListener(
			"pointerdown",
			(e) => {
				if (!this.ready) return;
				const consumed = this.activity();
				this.setInput(e.pointerType === "touch" ? "touch" : "mouse");
				this.audio.unlock();
				if (consumed) {
					e.preventDefault();
					e.stopImmediatePropagation();
					return;
				}
				if (this.net.ended) return;
				if (e.target !== $("#world") || this.mode !== "play" || this.screen)
					return;
				e.preventDefault();
				if (e.pointerType === "touch") {
					if (e.clientX < innerWidth * 0.58) {
						this.touch = {
							id: e.pointerId,
							startX: e.clientX,
							startY: e.clientY,
							x: e.clientX,
							y: e.clientY,
						};
						$("#touch-glimmer").style.left = `${e.clientX}px`;
						$("#touch-glimmer").style.top = `${e.clientY}px`;
						$("#touch-glimmer").hidden = false;
					} else if (this.model.context()) this.queued.interact = true;
					else this.queued.match = true;
					return;
				}
				if (e.button === 2) {
					this.queued.match = true;
					return;
				}
				const p = this.view.pointAt(e.clientX, e.clientY);
				if (p) {
					this.pointerTarget = {
						x: Math.max(-7.2, Math.min(7.2, p.x)),
						z: Math.max(-5.1, Math.min(5.1, p.z)),
						interact: true,
					};
				}
			},
			true,
		);
		document.addEventListener("pointermove", (e) => {
			if (!this.ready) return;
			if (e.movementX || e.movementY || this.touch) {
				if (this.activity()) return;
			}
			if (this.touch?.id === e.pointerId) {
				this.touch.x = e.clientX;
				this.touch.y = e.clientY;
			} else if (
				e.pointerType !== "touch" &&
				e.target === $("#world") &&
				!this.screen
			) {
				const p = this.view.pointAt(e.clientX, e.clientY);
				const item =
					p &&
					this.model.items.find(
						(i) =>
							i.room === this.model.room &&
							Math.hypot(p.x - i.x, p.z - i.z) < 1,
					);
				$("#world").style.cursor =
					item && this.model.match > 0 ? "pointer" : "default";
			}
		});
		const endTouch = (e) => {
			if (this.touch?.id === e.pointerId) {
				const distance = Math.hypot(
					this.touch.x - this.touch.startX,
					this.touch.y - this.touch.startY,
				);
				if (distance < 9) {
					if (this.model.context()) this.queued.interact = true;
					else this.queued.match = true;
				}
				this.touch = null;
				$("#touch-glimmer").hidden = true;
			}
		};
		document.addEventListener("pointerup", endTouch);
		document.addEventListener("pointercancel", endTouch);
		window.addEventListener("contextmenu", (e) => e.preventDefault());
		window.addEventListener("resize", () => this.view.resize());
		document.addEventListener("visibilitychange", () => {
			this.keys.clear();
			if (document.hidden) {
				this.audio.setPlaying(false);
				if (this.mode === "play" && !this.net.active && !this.screen) {
					this.ui.pause();
					this.hiddenPause = true;
				}
			} else {
				if (!this.net.ended) this.audio.setPlaying(true);
				this.last = performance.now();
			}
		});
		$("#pause-button").onclick = () => {
			if (this.activity()) return;
			this.audio.unlock();
			if (this.mode === "play") this.ui.pause();
		};
		$("#context-action").onclick = () => {
			this.activity();
			this.audio.unlock();
			this.queued.interact = true;
		};
	}
	pollPad(now) {
		const pad = [...(navigator.getGamepads?.() || [])].find(
			(p) => p && p.mapping === "standard",
		);
		if (!pad) return null;
		const buttons = pad.buttons.map((b) => b.pressed || b.value > 0.5),
			edges = buttons.map((v, i) => v && !this.padPrevious[i]);
		const x = Math.abs(pad.axes[0] || 0) > 0.18 ? pad.axes[0] : 0,
			y = Math.abs(pad.axes[1] || 0) > 0.18 ? pad.axes[1] : 0;
		const used = x || y || buttons.some(Boolean);
		if (used) {
			this.setInput("pad");
			if (this.activity()) {
				this.padPrevious = buttons;
				return null;
			}
			this.audio.unlock();
		}
		if (this.net.ended) {
			this.padPrevious = buttons;
			return null;
		}
		const navX = buttons[14]
				? -1
				: buttons[15]
					? 1
					: Math.abs(x) > 0.6
						? Math.sign(x)
						: 0,
			navY = buttons[12]
				? -1
				: buttons[13]
					? 1
					: Math.abs(y) > 0.6
						? Math.sign(y)
						: 0;
		if (this.screen) {
			const scroll =
				this.ui.root.querySelector(".about-content") ||
				this.ui.root.querySelector(".panel");
			if (scroll && Math.abs(pad.axes[3] || 0) > 0.18)
				scroll.scrollTop += (pad.axes[3] || 0) * 18;
			if (this.ui.page === "about" && (edges[4] || edges[5]))
				this.ui.handle(edges[5] ? "aboutnext" : "aboutprev");
			if ((navX || navY) && now > this.padNavAt) {
				const n = this.ui.navs()[this.ui.index];
				if (n?.id === "join-code" && navX) {
					n.value = String((+n.value + navX * 100 + 10000) % 10000).padStart(
						4,
						"0",
					);
				} else this.ui.navigate(navX, navY);
				this.padNavAt = now + 170;
			}
			if (edges[0]) this.ui.confirm();
			if (edges[1] || (edges[9] && !buttons[8])) this.ui.goBack();
			if (this.ui.page === "map" && (edges[4] || edges[5]))
				this.ui.handle("mapfloor", edges[5] ? 1 : -1);
		} else if (this.mode === "play") {
			if (edges[0]) this.queued.interact = true;
			if (edges[2]) this.queued.match = true;
			if (edges[1]) this.queued.drop = true;
			if (edges[3]) {
				this.ui.mapBack = null;
				this.ui.mapFloor = ROOMS[this.model.room].floor;
				this.ui.map();
			}
			if (edges[9] && !buttons[8]) this.ui.pause();
		}
		this.padPrevious = buttons;
		return { x, y, sprint: !!buttons[7] };
	}
	movement(pad) {
		let sx = 0,
			sy = 0,
			sprint = false;
		if (this.keys.has("w") || this.keys.has("arrowup")) sy--;
		if (this.keys.has("s") || this.keys.has("arrowdown")) sy++;
		if (this.keys.has("a") || this.keys.has("arrowleft")) sx--;
		if (this.keys.has("d") || this.keys.has("arrowright")) sx++;
		sprint = this.keys.has("shift");
		if (pad && (pad.x || pad.y)) {
			sx = pad.x;
			sy = pad.y;
			sprint = pad.sprint;
		}
		if (this.touch) {
			sx = Math.max(-1, Math.min(1, (this.touch.x - this.touch.startX) / 60));
			sy = Math.max(-1, Math.min(1, (this.touch.y - this.touch.startY) / 60));
		}
		let x = sx * 0.85 + sy * 0.53,
			z = -sx * 0.53 + sy * 0.85;
		if (sx || sy) this.pointerTarget = null;
		if (this.pointerTarget && !sx && !sy) {
			const p = this.pointerTarget,
				d = Math.hypot(p.x - this.model.x, p.z - this.model.z);
			if (d > 0.3) {
				x = (p.x - this.model.x) / d;
				z = (p.z - this.model.z) / d;
				if (d < 1.2 && this.model.context() && this.model.cooldown <= 0) {
					this.queued.interact = true;
					this.pointerTarget = null;
				}
			} else {
				this.queued.interact = true;
				this.pointerTarget = null;
			}
		}
		if (this.inputType === "touch") {
			if (
				(Math.hypot(x, z) > 0.1 || this.model.context()) &&
				this.model.match < 1
			)
				this.queued.match = true;
			const c = this.model.context();
			if (
				this.touchBlock &&
				(this.touchBlock.room !== this.model.room ||
					Math.hypot(
						this.model.x - this.touchBlock.x,
						this.model.z - this.touchBlock.z,
					) > 2)
			)
				this.touchBlock = null;
			if (
				c &&
				["item", "stair", "exit"].includes(c.kind) &&
				!this.touchBlock &&
				this.model.cooldown <= 0
			)
				this.queued.interact = true;
		}
		const input = { x, z, sprint, ...this.queued };
		this.queued = {};
		return input;
	}
	frame(now) {
		const elapsed = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
		this.last = now;
		const pad = this.pollPad(now);
		if (
			this.mode === "title" &&
			!this.net.active &&
			now - this.lastActivity >= 10000
		)
			this.startAttract();
		if (this.mode === "countdown") {
			const left = this.net.viaHub
				? -this.net.hub.time()
				: this.raceStartAt - Date.now();
			$("#countdown").textContent = Number.isFinite(left)
				? Math.max(1, Math.ceil(left / 1000))
				: "At the door…";
			if (left <= 0) {
				this.startGame("race");
				this.toast("The house is open. Find the urn.");
			}
		}
		if (!this.manualMode) {
			if (this.mode === "title") {
				this.model.time += elapsed;
				this.model.enemies.forEach((e, i) => {
					e.x =
						(i === 0 ? 3.4 : 4.8) + Math.sin(this.model.time * 0.5 + i) * 0.5;
					e.z =
						(i === 0 ? -1.6 : 1.5) + Math.cos(this.model.time * 0.6 + i) * 0.5;
				});
			} else if (
				this.mode === "attract" ||
				(this.mode === "play" && !this.screen)
			) {
				let input;
				if (this.mode === "attract" || this.model.cheats.pilot)
					input = this.pilot(elapsed);
				else input = this.movement(pad);
				this.model.step(elapsed, input);
			}
		}
		if (
			this.mode === "play" &&
			this.net.active &&
			!this.net.viaHub &&
			Date.now() - this.net.startAt >= 600000 &&
			!this.net.reported
		) {
			this.net.result(this.model);
			this.mode = "result";
			this.ui.results();
		}
		if (
			this.net.active &&
			!this.net.ended &&
			(this.mode === "play" || this.mode === "result") &&
			now - this.lastSend > 100
		) {
			this.net.update(this.model);
			this.lastSend = now;
		}
		this.view.updateRemotes(this.model.room, elapsed);
		this.view.sync(this.model, elapsed, {
			title: this.mode === "title",
			reduced: this.settings.reduced,
		});
		if (now - this.lastHud > 100) {
			if (this.mode !== "title") this.ui.hud();
			this.lastHud = now;
		}
		if (this.mode !== "ended") this.audio.tick(this.model.threat);
		this.frames = (this.frames || 0) + 1;
		requestAnimationFrame((t) => this.frame(t));
	}
	snapshot() {
		return {
			...this.model.snapshot(),
			mode: this.mode,
			screen: this.screen,
			backend: this.view.backend,
			ready: this.ready,
			frames: this.frames || 0,
			inputType: this.inputType,
			settings: { ...this.settings },
			network: {
				active: this.net.active,
				hub: !!this.net.viaHub,
				me: this.net.me,
				roster: this.net.roster,
				remotes: [...this.net.latest.keys()],
				results: [...this.net.results],
				ended: this.net.ended,
			},
			animations: {
				player: this.view.player?.userData.mixer.time,
				creatures: this.view.enemyModels.length,
			},
			camera: "isometric",
		};
	}
}
const app = new FrightHouse();
app.init().catch((error) => {
	console.error(error);
	$("#loading-message").textContent =
		`The house could not open: ${error.message}`;
	const retry = document.createElement("button");
	retry.textContent = "Try the door again";
	retry.className = "menu-button primary";
	retry.onclick = () => location.reload();
	$("#loading").append(retry);
	if (window.AIHub?.active) AIHub.fail(error.message);
});
