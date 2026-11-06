const $ = (s) => document.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const escapeHTML = (s) =>
	String(s).replace(
		/[&<>"']/g,
		(c) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				c
			],
	);
class SolarInput {
	constructor(app) {
		this.app = app;
		this.keys = new Set();
		this.mouse = { x: 0, y: 0, fire: false };
		this.stick = { x: 0, y: 0 };
		this.aim = { x: 0, y: 0 };
		this.last = "keyboard";
		this.prevButtons = [];
		this.navTime = 0;
		this.touches = new Map();
		this.touchOrigin = null;
		this.pulseTap = false;
		this.activePad = null;
		this.touch = matchMedia("(pointer: coarse)").matches;
		document.body.classList.toggle("touch", this.touch);
		this.bind();
	}
	activity(type) {
		if (this.app.net?.ended) return;
		this.last = type;
		this.app.refreshPrompts();
		this.app.lastActivity = performance.now();
		if (this.app.attract) {
			this.app.endAttract();
			return true;
		}
		return false;
	}
	bind() {
		addEventListener("keydown", (e) => {
			if (e.target.matches("textarea,input")) {
				if (e.code === "Escape") {
					e.target.blur();
					this.app.back();
				}
				return;
			}
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
			this.keys.add(e.code);
			if (e.code === "KeyQ") this.queuedPulse = true;
			this.app.audio?.unlock();
			if (e.repeat) return;
			if (e.code === "Escape" || e.code === "KeyP") this.app.back();
			else if (
				e.code === "Enter" ||
				(e.code === "Space" && this.app.page !== "flight")
			)
				this.app.activateFocus();
			else if (e.code === "ArrowDown" || (e.code === "Tab" && !e.shiftKey))
				this.app.moveFocus(1);
			else if (e.code === "ArrowUp" || (e.code === "Tab" && e.shiftKey))
				this.app.moveFocus(-1);
			else if (e.code === "ArrowLeft") this.app.horizontal(-1);
			else if (e.code === "ArrowRight") this.app.horizontal(1);
			else if (e.code === "PageDown" || e.code === "PageUp") {
				const scroll =
					document.querySelector(".credits-scroll") ||
					document.querySelector(".panel");
				if (scroll)
					scroll.scrollTop +=
						(e.code === "PageDown" ? 1 : -1) * scroll.clientHeight * 0.8;
			} else if (e.code === "KeyM" && this.app.page === "flight")
				this.app.back();
			this.app.refreshPrompts();
		});
		addEventListener("keyup", (e) => this.keys.delete(e.code));
		addEventListener("blur", () => {
			this.keys.clear();
			this.mouse.fire = false;
			if (!this.app.net?.hub && this.app.page === "flight" && !this.app.attract)
				this.app.pause();
		});
		addEventListener("pointermove", (e) => {
			if (e.pointerType === "touch") return;
			this.lastPointerMove = performance.now();
			this.activity("keyboard");
			this.mouse.x = (e.clientX / innerWidth) * 2 - 1;
			this.mouse.y = 1 - (e.clientY / innerHeight) * 2;
			const btn = e.target.closest("button");
			if (btn && !btn.disabled) this.app.focus(btn, false);
		});
		addEventListener("pointerdown", (e) => {
			if (e.pointerType === "touch") return;
			if (this.activity("keyboard")) {
				e.preventDefault();
				return;
			}
			this.app.audio?.unlock();
			if (
				this.app.page === "flight" &&
				e.button === 0 &&
				!e.target.closest("button")
			) {
				this.mouse.fire = true;
				this.queuedFire = true;
			}
		});
		addEventListener("pointerup", () => (this.mouse.fire = false));
		addEventListener("contextmenu", (e) => e.preventDefault());
		addEventListener("gamepadconnected", () => {
			this.last = "pad";
			this.app.toast("Controller connected · all systems ready");
			this.app.refreshPrompts();
		});
		addEventListener(
			"touchstart",
			(e) => {
				this.touch = true;
				document.body.classList.add("touch");
				if (this.activity("touch")) {
					e.preventDefault();
					return;
				}
				this.app.audio?.unlock();
				if (this.app.page !== "flight" || e.target.closest("button")) return;
				e.preventDefault();
				for (const t of e.changedTouches) {
					this.touches.set(t.identifier, {
						x: t.clientX,
						y: t.clientY,
						ox: t.clientX,
						oy: t.clientY,
						side: t.clientX < innerWidth * 0.55 ? "left" : "right",
					});
				}
			},
			{ passive: false },
		);
		addEventListener(
			"touchmove",
			(e) => {
				if (this.app.page !== "flight") return;
				e.preventDefault();
				for (const t of e.changedTouches) {
					const p = this.touches.get(t.identifier);
					if (p) {
						p.x = t.clientX;
						p.y = t.clientY;
					}
				}
			},
			{ passive: false },
		);
		const end = (e) => {
			for (const t of e.changedTouches) this.touches.delete(t.identifier);
		};
		addEventListener("touchend", end);
		addEventListener("touchcancel", end);
	}
	glyph(action) {
		if (this.last === "touch")
			return (
				{
					fire: "AUTO",
					boost: "SWIPE",
					pulse: "PULSE",
					map: "MENU",
					accept: "TAP",
					back: "BACK",
					move: "DRAG",
					aim: "ASSIST",
				}[action] || action
			);
		if (this.last === "pad") {
			const xbox = this.app.settings.glyphs === "xbox";
			return (
				(xbox
					? {
							fire: "RT",
							boost: "LT",
							pulse: "X",
							map: "Y",
							accept: "A",
							back: "B",
							move: "L",
							aim: "R",
							pause: "☰",
						}
					: {
							fire: "R2",
							boost: "L2",
							pulse: "□",
							map: "△",
							accept: "×",
							back: "○",
							move: "L",
							aim: "R",
							pause: "☰",
						})[action] || action
			);
		}
		return (
			{
				fire: "LMB / SPACE",
				boost: "SHIFT",
				pulse: "Q",
				map: "E",
				accept: "ENTER",
				back: "ESC",
				move: "WASD",
				aim: "MOUSE",
				pause: "ESC",
			}[action] || action
		);
	}
	chip(action) {
		return `<span class="key ${this.last === "pad" && ["accept", "back", "pulse", "map"].includes(action) ? "glyph" : ""}">${this.glyph(action)}</span>`;
	}
	poll(dt) {
		let pad;
		try {
			pad = Array.from(navigator.getGamepads?.() || []).find(
				(p) => p?.connected,
			);
		} catch {}
		this.activePad = pad || null;
		if (!pad) this.prevButtons = [];
		const result = {
			x: 0,
			y: 0,
			fire: false,
			boost: false,
			pulse: false,
			interact: false,
		};
		if (this.app.net?.ended) return result;
		if (pad) {
			const b = pad.buttons.map((x) => !!(x?.pressed || x?.value > 0.4));
			const axis = (v) => (Math.abs(v || 0) > 0.16 ? v || 0 : 0);
			const lx = axis(pad.axes[0]),
				ly = axis(pad.axes[1]),
				rx = axis(pad.axes[2]),
				ry = axis(pad.axes[3]);
			const newButton = b.some((v, i) => v && !this.prevButtons[i]);
			if (lx || ly || rx || ry || newButton) {
				if (this.activity("pad")) {
					this.prevButtons = b;
					return result;
				}
				this.app.audio?.unlock();
				this.app.refreshPrompts();
			}
			const pressed = (i) => b[i] && !this.prevButtons[i];
			if (pressed(9) && !b[8]) this.app.back();
			if (this.app.page !== "flight") {
				if (Math.abs(ry) > 0.2) {
					const scroll =
						document.querySelector(".credits-scroll") ||
						document.querySelector(".panel");
					if (scroll) scroll.scrollTop += ry * dt * 600;
				}
				if (pressed(0)) this.app.activateFocus();
				if (pressed(1)) this.app.back();
				this.navTime -= dt;
				if (
					this.navTime <= 0 &&
					(ly || b[12] || b[13] || lx || b[14] || b[15])
				) {
					if (b[12] || ly < -0.5) this.app.moveFocus(-1);
					else if (b[13] || ly > 0.5) this.app.moveFocus(1);
					else this.app.horizontal(b[14] || lx < 0 ? -1 : 1);
					this.navTime = 0.2;
				}
			} else {
				result.x = lx;
				result.y = -ly;
				this.aim.x = clamp(this.aim.x + rx * dt * 1.4, -0.9, 0.9);
				this.aim.y = clamp(this.aim.y - ry * dt * 1.4, -0.8, 0.85);
				result.fire = b[7] || b[0];
				result.boost = b[6];
				result.pulse = b[2];
				result.interact = b[3];
			}
			this.prevButtons = b;
		}
		if (this.last === "keyboard") {
			result.x =
				(this.keys.has("KeyD") ? 1 : 0) - (this.keys.has("KeyA") ? 1 : 0);
			result.y =
				(this.keys.has("KeyW") ? 1 : 0) - (this.keys.has("KeyS") ? 1 : 0);
			result.fire =
				this.mouse.fire || this.queuedFire || this.keys.has("Space");
			this.queuedFire = false;
			result.boost = this.keys.has("ShiftLeft") || this.keys.has("ShiftRight");
			result.pulse = this.keys.has("KeyQ") || this.queuedPulse;
			this.queuedPulse = false;
			result.interact = this.keys.has("KeyE");
			this.aim.x = this.mouse.x;
			this.aim.y = this.mouse.y;
		}
		if (this.last === "touch") {
			result.fire = true;
			result.interact = true;
			for (const p of this.touches.values()) {
				if (p.side === "left") {
					result.x = clamp((p.x - p.ox) / 65, -1, 1);
					result.y = clamp(-(p.y - p.oy) / 65, -1, 1);
					result.boost = Math.hypot(p.x - p.ox, p.y - p.oy) > 120;
				} else {
					this.aim.x = clamp((p.x / innerWidth) * 2 - 1, -1, 1);
					this.aim.y = clamp(1 - (p.y / innerHeight) * 2, -1, 1);
				}
			}
			result.pulse = this.pulseTap;
			this.pulseTap = false;
			const s = this.app.snapshot();
			const target = s?.entities
				?.filter((e) => ["enemy", "boss"].includes(e.type))
				.sort((a, b) => b.z - a.z)[0];
			if (target) {
				const pos = this.app.scene.project(target.x, target.y, target.z);
				this.aim.x = (pos.x / innerWidth) * 2 - 1;
				this.aim.y = 1 - (pos.y / innerHeight) * 2;
			}
		}
		Object.assign(
			result,
			this.app.scene?.aim(this.aim.x, this.aim.y) || { aimX: 0, aimY: 0 },
		);
		return result;
	}
}
class SolarApp {
	constructor() {
		this.page = "loading";
		this.previous = "title";
		this.lastActivity = performance.now();
		this.attract = false;
		this.attractIndex = 0;
		this.focusIndex = 0;
		this.paused = false;
		this.audio = new SolarAudio();
		this.scene = new SolarScene($("#world"));
		this.remote = null;
		this.message = "";
		this.messageTimer = 0;
		this.toastTimer = 0;
		this.hudTimer = 0;
		this.autoPilot = false;
		this.eventLog = [];
		this.settings = {
			music: 0.1,
			sfx: 0.65,
			glyphs: "playstation",
			shake: true,
		};
		try {
			const stored = JSON.parse(
				localStorage.getItem("solar-flair-settings") || "null",
			);
			if (stored) Object.assign(this.settings, stored);
		} catch {}
		this.audio.setMusic(this.settings.music);
		this.audio.setSfx(this.settings.sfx);
		this.input = new SolarInput(this);
		this.ui = $("#screens");
		this.sim = new SolarSim(RAPIER, (e) => this.onEvent(e));
		this.net = new SolarNetwork({
			onRole: (role, info) => {
				this.remote = null;
				if (info?.server) this.autoPilot = true;
			},
			onState: (s) => {
				this.remote = s;
				this.onRemote(s);
			},
			onInput: (input) => this.sim?.setPeerInput(input, true),
			onPeer: (active) => {
				this.sim?.setPeerInput({}, active);
				this.toast(
					active ? "Wingmate linked · shared mission" : "Wingmate signal ended",
				);
			},
			onStart: () => {
				this.started = true;
				this.paused = false;
				this.sim.start();
				this.sim.setPeerInput(
					{},
					this.net.connected && this.net.role === "host",
				);
				this.page = "";
				if (this.net.role === "guest") {
					this.show("flight");
					this.toast("You are the wingmate. Flight lead chooses the route.");
				} else {
					this.selectBest();
					this.show("map");
				}
			},
			onStatus: (text) => {
				this.networkStatus = text;
				const el = $("#network-status");
				if (el) el.textContent = text;
			},
			onFinish: (won, score) => {
				if (this.net.role === "guest" && this.remote) {
					this.remote.state = won ? "victory" : "defeat";
					this.remote.player.score = score;
					this.show("end");
				}
			},
			onTimeUp: () => {
				this.net.finish(false, this.snapshot()?.player.score || 0);
			},
			onEnd: (reason) => {
				this.paused = true;
				this.audio.suspend();
				this.show("hubend", reason);
			},
		});
		this.bindUI();
	}
	async init() {
		await this.scene.init();
		await this.net.init();
		this.net.ready();
		$("#load").classList.add("hidden");
		this.ready = true;
		if (this.net.hub) {
			this.show("hubwait");
		} else this.show("title");
		this.lastActivity = performance.now();
		this.last = performance.now();
		this.loop = this.loop.bind(this);
		requestAnimationFrame(this.loop);
		window.__solar = {
			ready: true,
			app: this,
			sim: this.sim,
			scene: this.scene,
			audio: this.audio,
			network: this.net,
			input: this.input,
			snapshot: () => this.snapshot(),
			step: (dt, input) => {
				this.sim.update(dt, input);
				return this.sim.snapshot();
			},
			command: (name, value) => this.command(name, value),
			events: this.eventLog,
		};
	}
	snapshot() {
		return this.net?.role === "guest" && this.remote
			? this.remote
			: this.sim.snapshot();
	}
	save() {
		try {
			localStorage.setItem(
				"solar-flair-settings",
				JSON.stringify(this.settings),
			);
		} catch {}
	}
	onEvent(e) {
		this.eventLog?.push({ ...e, t: this.sim?.time || 0 });
		if (this.eventLog?.length > 400) this.eventLog.shift();
		if (!this.scene || !this.audio) return;
		this.scene.event(e);
		if (e.type === "fire" && e.owner === "player") this.audio.sfx("laser");
		if (e.type === "hit") {
			this.audio.sfx("hit");
			if (e.owner === "player") this.scene.shield.material.opacity = 0.3;
		}
		if (e.type === "explode") this.audio.sfx("explode");
		if (e.type === "rescue") {
			this.audio.sfx("rescue");
			this.toast(`SURVIVOR ABOARD · ${e.rescued} SAFE`);
		}
		if (e.type === "warp") this.audio.sfx("warp");
		if (e.type === "pulse") this.audio.sfx("shield");
		if (e.type === "shield") this.audio.sfx("shield");
		if (e.type === "complete") this.audio.sfx("rescue");
		if (e.type === "message") {
			this.message = e.text;
			this.messageTimer = 5.5;
			this.audio.voice(e.kind);
		}
		if (e.type === "victory") {
			this.audio.sfx("win");
			this.scene.burst(0, 3, -40, "#ffb85f", 70);
			if (this.net?.role === "host" && !this.attract)
				this.net.finish(true, e.score);
		}
		if (e.type === "defeat") {
			this.audio.sfx("lose");
			if (this.net?.role === "host" && !this.attract)
				this.net.finish(false, e.score);
		}
	}
	onRemote(s) {
		if (this.remoteState !== s.state) {
			this.remoteState = s.state;
			if (s.state === "map") this.show("map");
			else if (["victory", "defeat"].includes(s.state)) this.show("end");
			else if (this.page !== "pause" && this.page !== "settings")
				this.show("flight");
		}
		if (s.lastMessage !== this.remoteMessage) {
			this.remoteMessage = s.lastMessage;
			this.message = s.lastMessage;
			this.messageTimer = 5;
			this.audio.voice("radio");
		}
		const ids = new Set(s.entities.map((e) => e.id));
		const newWingShots = s.bullets.filter(
			(b) => b.owner === "wing" && !this.remoteBulletIds?.has(b.id),
		);
		if (newWingShots.length) this.audio.sfx("laser");
		this.remoteBulletIds = new Set(s.bullets.map((b) => b.id));
		if (this.remoteEntityIds)
			for (const id of this.remoteEntityIds)
				if (!ids.has(id)) {
					const e = this.remoteEntityCache?.get(id);
					if (e && ["enemy", "asteroid"].includes(e.type)) {
						this.scene.burst(e.x, e.y, e.z, "#ffb85f", 15);
						this.audio.sfx("explode");
					}
				}
		this.remoteEntityIds = ids;
		this.remoteEntityCache = new Map(s.entities.map((e) => [e.id, e]));
	}
	bindUI() {
		this.ui.addEventListener("click", (e) => {
			const btn = e.target.closest("button");
			if (!btn || btn.disabled) return;
			this.input.activity(
				this.input.touch && e.pointerType === "touch"
					? "touch"
					: this.input.last,
			);
			this.audio.unlock();
			this.audio.sfx("ui");
			this.action(btn.dataset.action, btn.dataset.value);
		});
		this.ui.addEventListener("pointerover", (e) => {
			const btn = e.target.closest("button");
			if (
				btn &&
				!btn.disabled &&
				performance.now() - (this.input.lastPointerMove || 0) < 150
			) {
				this.focus(btn, false);
				if (btn.dataset.action === "select")
					this.select(btn.dataset.value, false);
			}
		});
		this.ui.addEventListener("input", (e) => {
			const setting = e.target.dataset.setting,
				tuning = e.target.dataset.tuning;
			if (setting) {
				const value =
					e.target.type === "checkbox"
						? e.target.checked
						: Number(e.target.value);
				this.settings[setting] = value;
				if (setting === "music") this.audio.setMusic(value);
				if (setting === "sfx") this.audio.setSfx(value);
				this.save();
				const out = e.target.parentElement.querySelector("output");
				if (out)
					out.textContent =
						setting === "music" || setting === "sfx"
							? Math.round(value * 100) + "%"
							: value;
			}
			if (tuning) {
				this.sim.tuning[tuning] =
					e.target.type === "checkbox"
						? e.target.checked
						: Number(e.target.value);
				const out = e.target.parentElement.querySelector("output");
				if (out) out.textContent = Number(e.target.value).toFixed(2) + "×";
			}
		});
		$("#pause-button").onclick = () => {
			this.input.activity(this.input.last);
			this.pause();
		};
		$("#touch-pulse").onclick = (e) => {
			e.stopPropagation();
			this.input.pulseTap = true;
			this.audio.unlock();
		};
		$("#touch-context").onclick = () => {
			if (this.snapshot().sectorDone) this.sim.finishSector();
			else this.input.pulseTap = true;
		};
		addEventListener("resize", () => this.scene.resize());
	}
	command(name, value) {
		if (name === "start") this.start();
		else if (name === "sector") {
			this.sim.dev.warp(value);
			this.syncPage();
		} else if (name === "pause") this.pause();
		else if (name === "attract") this.startAttract();
		else if (name === "complete") this.sim.dev.complete();
		else if (name === "refill") this.sim.dev.refill();
		else if (name === "bot") this.autoPilot = !!value;
		else if (name === "resume") {
			this.paused = false;
			this.syncPage();
		}
		return this.snapshot();
	}
	focus(el, scroll = true) {
		if (!el) return;
		this.ui
			.querySelectorAll(".focused")
			.forEach((n) => n.classList.remove("focused"));
		el.classList.add("focused");
		this.focused = el;
		if (scroll) el.scrollIntoView({ block: "nearest" });
		if (el.dataset.action === "select" && this.selected !== el.dataset.value)
			this.select(el.dataset.value, false);
	}
	focusables() {
		return [...this.ui.querySelectorAll("button:not(:disabled),input")].filter(
			(e) => e.offsetParent !== null,
		);
	}
	moveFocus(d) {
		const f = this.focusables();
		if (!f.length) return;
		let i = f.indexOf(this.focused);
		i = (i + d + f.length) % f.length;
		this.focus(f[i]);
		this.audio.sfx("ui");
	}
	horizontal(d) {
		if (this.page === "map") {
			this.moveFocus(d);
			return;
		}
		const el = this.focused;
		if (el?.matches("input[type=range]")) {
			el.value = String(
				clamp(
					Number(el.value) + d * Number(el.step || 0.01),
					Number(el.min),
					Number(el.max),
				),
			);
			el.dispatchEvent(new Event("input", { bubbles: true }));
		} else if (el?.type === "checkbox") {
			el.checked = !el.checked;
			el.dispatchEvent(new Event("input", { bubbles: true }));
		} else this.moveFocus(d);
	}
	activateFocus() {
		if (this.focused?.matches("button")) {
			if (this.page === "map" && this.focused.dataset.action === "select") {
				this.jump(this.selected);
				return;
			}
			this.focused.click();
		} else if (this.focused?.type === "checkbox") {
			this.horizontal(1);
		}
	}
	refreshPrompts() {
		const stamp = this.input.last + this.settings.glyphs;
		if (this.promptStamp === stamp) return;
		this.promptStamp = stamp;
		document
			.querySelectorAll("[data-prompt]")
			.forEach((el) => (el.innerHTML = this.input.chip(el.dataset.prompt)));
		if (this.page === "flight") this.hudTimer = 0;
	}
	toast(text) {
		this.toastTimer = 3.5;
		$("#toast").textContent = text;
		$("#toast").classList.remove("hidden");
	}
	start() {
		this.attract = false;
		this.training = false;
		this.paused = false;
		this.autoPilot = false;
		this.remote = null;
		this.sim.tuning = { ...this.sim.defaults };
		this.sim.start();
		if (this.net.connected) this.sim.setPeerInput({}, true);
		this.messageTimer = 0;
		this.selectBest();
		this.show("map");
		this.audio.unlock();
	}
	selectBest() {
		const s = this.snapshot();
		this.selected = !s.completed.includes("shard")
			? "shard"
			: !s.completed.includes("echo")
				? "echo"
				: s.player.fuel < 35
					? "haven"
					: !s.completed.includes("chorus")
						? "chorus"
						: !s.completed.includes("rift")
							? "rift"
							: "solaris";
	}
	select(id, rebuild = true) {
		this.selected = id;
		if (this.page === "map") {
			this.ui
				.querySelectorAll(".sector")
				.forEach((el) =>
					el.classList.toggle("selected", el.dataset.value === id),
				);
			const details = $("#sector-details");
			if (details) details.innerHTML = this.sectorDetails();
			if (rebuild)
				this.focus(this.ui.querySelector(`.sector[data-value="${id}"]`), false);
		}
	}
	jump(id) {
		if (this.net.role === "guest") {
			this.toast("Flight lead is plotting the route. You fly the wingmate.");
			return;
		}
		if (this.sim.selectSector(id)) {
			this.paused = false;
			this.show("flight");
		} else this.toast(this.sim.lastMessage);
	}
	pause() {
		if (this.net.ended || (this.net.hub && !this.started)) return;
		if (this.attract) {
			this.endAttract();
			return;
		}
		if (["flight", "map"].includes(this.page)) {
			this.previous = this.page;
			this.paused = !this.net.connected;
			this.show("pause");
		}
	}
	back() {
		if (this.net?.ended) return;
		if (this.attract) {
			this.endAttract();
			return;
		}
		if (this.page === "flight" || this.page === "map") this.pause();
		else if (this.page === "pause") {
			this.paused = false;
			this.show(this.previous);
		} else if (["settings", "dev", "about"].includes(this.page)) {
			const p = this.returnTo || "title";
			this.show(p);
		} else if (["controls", "coop"].includes(this.page)) {
			this.show("title");
		} else if (this.page === "end" && !this.net.hub) this.show("title");
	}
	action(action, value) {
		if (this.net.ended) return;
		switch (action) {
			case "start":
				this.start();
				break;
			case "controls":
				this.show("controls");
				break;
			case "training":
				this.start();
				this.sim.tuning.god = true;
				this.training = true;
				this.jump("shard");
				this.toast("TRAINING · shields protected · follow the green pods");
				break;
			case "coop":
				this.show("coop");
				break;
			case "settings":
				this.returnTo = this.page;
				this.show("settings");
				break;
			case "about":
				this.returnTo = this.page;
				this.show("about");
				break;
			case "dev":
				this.returnTo = "pause";
				this.show("dev");
				break;
			case "back":
				this.back();
				break;
			case "resume":
				this.paused = false;
				this.show(this.previous);
				break;
			case "title":
				if (!this.net.hub) {
					this.net.leave();
					this.started = false;
					this.training = false;
					this.sim.tuning = { ...this.sim.defaults };
					this.show("title");
				}
				break;
			case "select":
				this.select(value);
				break;
			case "jump":
				this.jump(this.selected);
				break;
			case "tow":
				this.sim.emergencyTow();
				this.paused = false;
				this.selectBest();
				this.show("map");
				break;
			case "retreat":
				this.sim.finishSector(true);
				this.paused = false;
				this.show("map");
				break;
			case "glyphs":
				this.settings.glyphs =
					this.settings.glyphs === "xbox" ? "playstation" : "xbox";
				this.save();
				this.show("settings");
				break;
			case "fullscreen":
				document.fullscreenElement
					? document.exitFullscreen()
					: document.documentElement
							.requestFullscreen?.()
							.catch(() =>
								this.toast("Fullscreen is unavailable in this browser"),
							);
				break;
			case "defaults":
				this.settings = {
					music: 0.1,
					sfx: 0.65,
					glyphs: "playstation",
					shake: true,
				};
				this.audio.setMusic(0.1);
				this.audio.setSfx(0.65);
				this.save();
				this.show("settings");
				break;
			case "dev-reset":
				this.sim.tuning = { ...this.sim.defaults };
				this.autoPilot = false;
				this.show("dev");
				break;
			case "dev-refill":
				this.sim.refill();
				this.toast("Flight systems restored");
				break;
			case "dev-complete":
				this.sim.dev.complete();
				this.toast("Objective advanced");
				break;
			case "dev-spawn":
				this.sim.dev.spawn("jammer");
				this.toast("Jammer spawned");
				break;
			case "dev-warp":
				this.sim.dev.warp(value);
				this.paused = false;
				this.show("flight");
				break;
			case "dev-bot":
				this.autoPilot = !this.autoPilot;
				this.show("dev");
				break;
			case "dev-victory":
				this.sim.dev.victory();
				this.paused = false;
				this.show("end");
				break;
			case "host":
				this.host();
				break;
			case "join":
				this.join();
				break;
			case "accept":
				this.accept();
				break;
			case "copy":
				this.copy(value);
				break;
			case "leave":
				this.net.leave();
				this.show("coop");
				break;
			case "practice-again":
				this.start();
				break;
			case "watch":
				this.startAttract();
				break;
		}
	}
	btn(label, action, value = "", cls = "") {
		return `<button class="btn ${cls}" data-action="${action}" data-value="${value}">${label}</button>`;
	}
	show(page, reason = "") {
		this.page = page;
		this.ui.innerHTML = this.pageHTML(page, reason);
		this.ui.className = "";
		$("#hud").classList.toggle("hidden", page !== "flight");
		$("#reticle").classList.toggle("hidden", page !== "flight");
		if (page !== "flight") $("#warp-ui").classList.add("hidden");
		this.focused = null;
		this.promptStamp = "";
		if (page === "title") {
			this.paused = false;
			this.lastActivity = performance.now();
		}
		if (page === "map") {
			this.select(this.selected || "shard", false);
			if (this.net.role === "guest")
				this.toast("Flight lead chooses the destination");
		}
		requestAnimationFrame(() => {
			const el = this.ui.querySelector(
				page === "map"
					? `.sector[data-value="${this.selected}"]`
					: "button:not(:disabled)",
			);
			this.focus(el, false);
			this.refreshPrompts();
		});
	}
	pageHTML(page, reason) {
		const b = (...a) => this.btn(...a),
			chip = (a) => `<span data-prompt="${a}">${this.input.chip(a)}</span>`,
			s = this.snapshot();
		switch (page) {
			case "title":
				return `<section class="screen title-shade"><div class="topline"><div class="eyebrow"><span class="brandmark">✦</span>Frontier rescue division</div><div class="badge"><i class="dot"></i>Last beacon / online</div></div><div class="hero"><div class="eyebrow">A long way from home.</div><h1>SOLAR<br><em>FLAIR</em></h1><p class="tagline">The stars went quiet.<br>Go make some noise.</p><div class="actions">${b("Launch mission <span>↗</span>", "start", "", "primary")}${b("How to fly", "controls")}</div><p class="small">Rescue the lost. Outfly the Zylons.<br>Find the light at the edge of the map.</p></div><div class="annotation"><div>F-86 / SUNSKIPPER<br><strong>YOUR RIDE HOME</strong><br>Twin ion / three pulse cells</div></div><div class="planet-label">The Saffron Expanse<br>09h 41m / −26° 30′</div><div class="bottomline"><div class="actions">${b("Wingmate co-op", "coop", "", "subtle")}${b("Settings", "settings", "", "subtle")}${b("About", "about", "", "subtle")}</div><span class="hint">${chip("accept")} Select &nbsp; · &nbsp; Idle to watch</span></div></section>`;
			case "map":
				return `<section class="screen chart-screen"><div class="topline"><div class="eyebrow">Frontier navigation / 07 sectors</div>${b("Pause ☰", "back", "", "subtle")}</div><div class="chart-top"><div><h2>Follow the last light.</h2><div class="small">${s.rescued >= 5 ? "✓" : "◇"} 5 survivors &nbsp; · &nbsp; ${s.completed.includes("echo") ? "✓" : "◇"} Red Echo signal &nbsp; · &nbsp; ${s.completed.includes("rift") ? "✓" : "◇"} Rift Gate signal</div></div><div class="chart-info small"><p>${s.bossUnlocked ? "Solaris located. Break the siege and bring everyone home." : "Choose a signal. Rescue five survivors and recover both route signals to locate Solaris."}</p></div></div><div class="chart-layout"><div class="chart"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><g stroke="#8fe8d04a" stroke-width=".2" fill="none" stroke-dasharray="1 1"><path d="M11 67L29 32L54 53L36 77L11 67 M54 53L67 21L91 40L76 73L54 53 M29 32L67 21 M36 77L76 73 M67 21L76 73"/></g></svg>${s.sectors.map((e, i) => `<button class="sector ${e.locked ? "locked" : ""} ${e.complete ? "complete" : ""} ${e.current ? "current" : ""}" data-action="select" data-value="${e.id}" style="left:${e.x}%;top:${e.y}%" aria-label="${e.name}${e.locked ? " locked" : ""}"><span class="orb"><span>${e.complete ? "✓" : e.type === "base" ? "⊕" : e.type === "rescue" ? "◇" : e.type === "boss" ? "✦" : "⌁"}</span></span><span class="name">${e.name}</span></button>`).join("")}</div><aside id="sector-details" class="sector-details">${this.sectorDetails()}</aside></div><div class="bottomline"><div class="resource-strip"><div><strong>${Math.round(s.player.hp)}<small>%</small></strong><span>Hull</span></div><div><strong>${Math.floor(s.player.fuel)}</strong><span>Jump fuel</span></div><div><strong>${s.rescued}<small> / 7</small></strong><span>Survivors</span></div><div><strong>${String(s.player.score).padStart(5, "0")}</strong><span>Score</span></div></div><div class="hint">${chip("accept")} Warp &nbsp;${chip("back")} Pause</div></div></section>`;
			case "flight":
				return "";
			case "pause":
				return `<section class="screen overlay"><div class="panel"><div class="eyebrow">${this.net.connected ? "Squadron still in flight" : "Flight suspended"}</div><h2>A moment in the dark.</h2><div class="menu-stack">${b("Resume flight <span>↗</span>", "resume", "", "primary")}${b("Settings", "settings")}${b("Developer flight deck", "dev")}${b("About / credits", "about")}${this.net.role === "guest" ? "" : this.sim.state === "flight" ? b(this.sim.sectorDone ? "Return to sector chart" : "Retreat to sector chart", "retreat") : ""}${this.net.role === "guest" ? "" : b("Emergency tow · −1000 points", "tow")}${this.net.hub ? "" : b("Return to title", "title", "", "subtle")}</div><p class="small">${this.net.connected ? "Co-op continues while this menu is open." : "Your ship and sector are paused."}</p></div></section>`;
			case "settings":
				return `<section class="screen overlay"><div class="panel"><div class="eyebrow">Ship preferences</div><h2>Set your frequency.</h2>${this.slider("Music", "music", this.settings.music, 0, 1, 0.01)}${this.slider("Effects & radio", "sfx", this.settings.sfx, 0, 1, 0.01)}<div class="row"><span>Controller prompts</span>${b(this.settings.glyphs === "xbox" ? "Xbox · A B X Y" : "PlayStation · × ○ □ △", "glyphs")}</div><div class="row"><label for="shake-toggle">Camera shake</label><input id="shake-toggle" type="checkbox" data-setting="shake" ${this.settings.shake ? "checked" : ""}></div><div class="rule"></div><div class="actions">${b("Back", "back", "", "primary")}${b("Fullscreen", "fullscreen")}${b("Reset settings", "defaults", "", "subtle")}</div><p class="small">Prompts follow your last input. Music starts at 10%.</p></div></section>`;
			case "controls":
				return `<section class="screen overlay"><div class="panel wide"><div class="eyebrow">Flight school / F-86 Sunskipper</div><h2>Small ship. Big sky.</h2><p class="small">Your ship cruises forward. Move across the flight lane, aim your cannons, and keep an eye on the heat. Fly through green rings to rescue survivors. Shields regenerate; starbases repair and refuel.</p><div class="control-grid"><div>Move <b>${chip("move")}</b></div><div>Aim <b>${chip("aim")}</b></div><div>Twin cannons <b>${chip("fire")}</b></div><div>Afterburner <b>${chip("boost")}</b></div><div>Shield pulse <b>${chip("pulse")}</b></div><div>Tractor assist / return <b>${chip("map")}</b></div></div><p class="small">Pulse clears enemy fire and damages every hostile. You carry three cells; one regenerates every 50 seconds. Release the trigger when your cannons overheat. Sector chart: select a beacon, then launch.</p><p class="small touch-hint">Touch: drag anywhere on the left to fly. Cannons and aim are assisted. Drag far to boost. Tap PULSE when you need breathing room.</p><div class="actions">${b("Launch mission ↗", "start", "", "primary")}${b("Protected training", "training")}${b("Back", "back", "", "subtle")}</div></div></section>`;
			case "dev":
				return this.devHTML();
			case "about":
				return this.aboutHTML();
			case "coop":
				return `<section class="screen overlay"><div class="panel wide"><div class="eyebrow">Wingmate link / 2 pilots · 1 mission</div><h2>Bring a friend home.</h2><p class="small">Flight lead chooses sectors. The wingmate flies a second ship and shares shields, pulse cells, rescues, and score. In AI Hub, the squadron connects automatically.</p><div class="coop-grid"><div><h3>1. Flight lead</h3><p class="small">Create an invitation and send it to your wingmate. Paste their reply below to connect.</p>${b("Create invitation", "host", "", "primary")}<textarea id="offer-out" aria-label="Invitation code" readonly placeholder="Your invitation appears here"></textarea>${b("Copy invitation", "copy", "offer-out", "subtle")}<textarea id="answer-in" aria-label="Wingmate reply" placeholder="Paste wingmate reply here"></textarea>${b("Connect reply", "accept")}</div><div><h3>2. Wingmate</h3><p class="small">Paste the invitation, generate a reply, then send the reply back to flight lead.</p><textarea id="offer-in" aria-label="Flight lead invitation" placeholder="Paste invitation here"></textarea>${b("Generate reply", "join", "", "primary")}<textarea id="answer-out" aria-label="Reply code" readonly placeholder="Your reply appears here"></textarea>${b("Copy reply", "copy", "answer-out", "subtle")}<p class="small">No account or game server. Direct WebRTC connection; restrictive networks may need AI Hub.</p></div></div><p id="network-status" class="stamp">${escapeHTML(this.networkStatus || "Ready to link")}</p><div class="actions">${b("Back", "back")}${b("Disconnect", "leave", "", "subtle")}</div></div></section>`;
			case "end": {
				const won = s.state === "victory";
				return `<section class="screen overlay"><div class="panel wide"><div class="eyebrow">${won ? "Transmission received / Solaris" : "Transmission lost / frontier rescue"}</div><h2>${won ? "The stars answer back." : "A light worth another try."}</h2><p style="font-size:20px;color:var(--muted)">${won ? "A world below. Voices beside you.<br>You took the long way home. They all did." : "The signal fades, but Anchor is still listening.<br>Your survivors and route signals can still be saved."}</p><div class="end-stats"><div><strong>${s.player.score.toLocaleString()}</strong><span>Score</span></div><div><strong>${s.rescued} / 7</strong><span>Survivors</span></div><div><strong>${s.kills}</strong><span>Zylons down</span></div><div><strong>${Math.floor(s.stats.elapsed / 60)}:${String(Math.floor(s.stats.elapsed % 60)).padStart(2, "0")}</strong><span>Flight time</span></div></div><div class="actions">${this.net.hub ? '<span class="stamp">Squadron result sent to AI Hub</span>' : !won ? b("Call Anchor tow", "tow", "", "primary") + b("New mission", "start") : b("Fly again ↗", "start", "", "primary")}${this.net.hub ? "" : b("Return to title", "title")}${b("Credits", "about", "", "subtle")}</div><p class="small">${won ? "End of the demo. Seven sectors, one rescued frontier." : "Emergency tow costs 1000 points and keeps your campaign progress."}</p></div></section>`;
			}
			case "hubwait":
				return `<section class="screen overlay"><div class="panel"><div class="eyebrow">AI Hub / squadron synchronized</div><h2>Solar Flair</h2><p class="small">Rescue five survivors. Recover the Red Echo and Rift Gate route signals. Destroy the carrier at Solaris.</p><p class="stamp">Flight computers ready · awaiting launch</p><p class="small">WASD / left stick to fly · mouse / right stick to aim · Space / R2 to fire · Q / □ pulse · Shift / L2 boost</p></div></section>`;
			case "hubend":
				return `<section class="screen overlay"><div class="panel"><div class="eyebrow">AI Hub / flight ended</div><h2>Signal closed.</h2><p class="small">${escapeHTML(reason || "The hub has ended this round.")}.</p></div></section>`;
			default:
				return "";
		}
	}
	sectorDetails() {
		const s = this.snapshot();
		const e = s.sectors.find((e) => e.id === this.selected) || s.sectors[1];
		return `<div class="number">0${s.sectors.indexOf(e) + 1}</div><div class="stamp">${e.complete ? "✓ SECTOR SECURE" : e.locked ? "SIGNAL ENCRYPTED" : e.type === "rescue" ? "RESCUE SIGNAL" : e.type === "base" ? "SERVICE BEACON" : e.type === "boss" ? "FINAL APPROACH" : "HOSTILE CONTACTS"}</div><h3>${e.name}</h3><p class="desc">${e.locked ? "Rescue 5 survivors. Clear Red Echo and Rift Gate to decode this signal." : e.desc}</p><div class="actions"><button class="btn primary" data-action="jump" ${e.locked || this.net.role === "guest" ? "disabled" : ""}>${this.net.role === "guest" ? "Lead plotting" : e.locked ? "Locked" : `Warp · ${e.cost} fuel`} <span>↗</span></button></div><p class="small">${e.type === "base" ? "Automatic docking · full service" : e.complete ? "You may revisit this sector." : "Choose your route. Keep enough fuel to return."}</p>`;
	}
	slider(label, key, value, min, max, step, tuning = false) {
		return `<div class="row"><label for="slider-${key}">${label}</label><input id="slider-${key}" type="range" ${tuning ? "data-tuning" : "data-setting"}="${key}" min="${min}" max="${max}" step="${step}" value="${value}"><output>${tuning ? value.toFixed(2) + "×" : Math.round(value * 100) + "%"}</output></div>`;
	}
	devHTML() {
		const t = this.sim.tuning,
			b = (...args) => this.btn(...args);
		return `<section class="screen overlay"><div class="panel wide"><div class="eyebrow">Developer flight deck / live systems</div><h2>Tune the frontier.</h2><p class="dev-note">Changes apply immediately. Developer settings reset on a new title-screen mission. ${this.net.role === "guest" ? "Flight lead owns simulation tuning." : ""}</p>${this.net.role === "guest" ? b("Back", "back") : `${this.slider("Cannon damage", "damage", t.damage, 0.25, 4, 0.05, true)}${this.slider("Hostile speed", "enemySpeed", t.enemySpeed, 0.25, 2, 0.05, true)}${this.slider("Spawn pressure", "spawnRate", t.spawnRate, 0.25, 3, 0.05, true)}${this.slider("Ship response", "shipSpeed", t.shipSpeed, 0.5, 2, 0.05, true)}${this.slider("Aim assistance", "assist", t.assist, 0, 3, 0.05, true)}<div class="row"><label for="god-toggle">Invincible hull</label><input id="god-toggle" type="checkbox" data-tuning="god" ${t.god ? "checked" : ""}></div><div class="actions" style="margin-top:20px">${b("Refill ship", "dev-refill")}${b("Complete objective", "dev-complete")}${b("Spawn jammer", "dev-spawn")}${b(`Autopilot: ${this.autoPilot ? "ON" : "OFF"}`, "dev-bot")}${b("Show ending", "dev-victory")}</div><h3>Jump to sector</h3><div class="actions">${this.sim.sectors.map((e) => b(e.name, "dev-warp", e.id)).join("")}</div><div class="rule"></div><div class="actions">${b("Back", "back", "", "primary")}${b("Reset tuning", "dev-reset")}</div>`}<p class="dev-note">Renderer: ${this.scene.engine} · Three.js r180 · Rapier ${RAPIER.version()} · ${this.sim.entities.size} entities · ${this.sim.bullets.size} shots · ${this.sim.stats.collisions} physics contacts<br>Network: ${this.net.transport} / ${this.net.role} · ${this.net.sent} sent / ${this.net.received} received</p></div></section>`;
	}
	aboutHTML() {
		const c = CREDITS,
			labels = {
				date: "Date",
				source: "Source",
				plan: "Plan",
				genre: "Genre",
				perspective: "Perspective",
				tech: "Tech",
				artDirection: "Art direction",
				animation: "Animation",
				audio: "Audio",
				online: "Online",
				testing: "Testing",
				research: "Research",
				environment: "Environment",
				model: "Model",
				usage: "Usage",
			};
		return `<section class="screen overlay"><div class="panel wide"><div class="eyebrow">Solar Flair / field notes</div><h2>Signals & signatures.</h2><div class="credits-scroll"><p class="small">An original tribute to the galactic charts and frontier rescues of Solaris (Atari, 1986). Game design, procedural geometry, music, radio voices, and code generated for this demo. Three.js: MIT. Rapier: Apache-2.0. AI Hub session client: see its source attribution. Original source created by Doug Neubauer.</p><h3>Source Information</h3><div class="info-grid">${Object.entries(
			c.sourceInformation,
		)
			.map(
				([k, v]) =>
					`<div><strong>${labels[k] || k}</strong>${escapeHTML(v)}</div>`,
			)
			.join(
				"",
			)}</div><div class="feedback"><h3>Testing Feedback</h3>${c.testingFeedback.map((v, i) => `<p><b>${["Issues caught", "Critical / game breaking", "Most helpful test", "Least helpful test"][i]}.</b> ${escapeHTML(v)}</p>`).join("")}<h3>Engine Feedback</h3>${c.engineFeedback.map((v, i) => `<p><b>${["Liked most", "Got stuck or guessed wrong", "Built myself", "Hardest part", "Engine changes", "One desired change"][i]}.</b> ${escapeHTML(v)}</p>`).join("")}<h3>Prompt Feedback</h3>${c.promptFeedback.map((v, i) => `<p><b>${["Liked most", "Confusing", "Hardest task", "Suggested change"][i]}.</b> ${escapeHTML(v)}</p>`).join("")}</div></div><p class="scroll-hint">Scroll to read all field notes</p>${this.btn("Back", "back", "", "primary")}</div></section>`;
	}
	async host() {
		this.toast("Generating invitation…");
		try {
			const code = await this.net.host();
			if ($("#offer-out")) $("#offer-out").value = code;
			this.toast("Invitation ready. Send it to your wingmate.");
		} catch (e) {
			this.toast(e.message);
		}
	}
	async join() {
		try {
			const code = await this.net.join($("#offer-in").value.trim());
			if ($("#answer-out")) $("#answer-out").value = code;
			this.toast("Reply ready. Send it back to flight lead.");
		} catch (e) {
			this.toast(e.message);
		}
	}
	async accept() {
		try {
			await this.net.accept($("#answer-in").value.trim());
			this.toast("Reply accepted. Linking ships…");
		} catch (e) {
			this.toast(e.message);
		}
	}
	async copy(id) {
		const el = $("#" + id);
		try {
			await navigator.clipboard.writeText(el.value);
			this.toast("Code copied");
		} catch {
			el.select();
			document.execCommand("copy");
			this.toast("Code selected for copying");
		}
	}
	startAttract() {
		if (this.net.hub || this.net.connected) return;
		this.attract = true;
		this.paused = false;
		this.autoPilot = true;
		this.sim.start();
		this.sim.tuning.god = true;
		this.attractIndex = 0;
		this.attractTimer = 0;
		this.jump("shard");
		$("#attract").classList.remove("hidden");
		this.messageTimer = 0;
	}
	endAttract() {
		this.attract = false;
		this.autoPilot = false;
		this.sim.tuning = { ...this.sim.defaults };
		this.sim.start();
		$("#attract").classList.add("hidden");
		this.input.keys.clear();
		this.input.mouse.fire = false;
		this.show("title");
	}
	syncPage() {
		if (this.net.ended || (this.attract && this.page === "title")) return;
		const s = this.snapshot();
		if (this.net.hub && !this.started) return;
		if (
			[
				"pause",
				"settings",
				"dev",
				"about",
				"controls",
				"coop",
				"title",
				"hubend",
			].includes(this.page)
		)
			return;
		const expected = ["map"].includes(s.state)
			? "map"
			: ["victory", "defeat"].includes(s.state)
				? "end"
				: "flight";
		if (expected !== this.page) {
			if (expected === "map") this.selectBest();
			this.show(expected);
		}
	}
	hud(s) {
		const sector = s.sectors.find(
			(e) => e.id === (s.pendingSector || s.sector),
		);
		document.querySelector(".sector-heading .eyebrow").textContent =
			this.net.role === "guest"
				? "F-86 Sunskipper / wingmate"
				: "F-86 Sunskipper / flight lead";
		$("#hud-sector").textContent = sector?.name || "FRONTIER";
		$("#hud-objective").textContent = s.sectorDone
			? "SECTOR SECURE · returning to chart"
			: s.objective.label;
		$("#hud-progress").style.width =
			clamp((s.objective.current / s.objective.target) * 100, 0, 100) + "%";
		$("#hud-count").textContent = s.sectorDone
			? "✓"
			: s.objective.target < 100
				? `${Math.floor(s.objective.current)} / ${s.objective.target}`
				: "";
		$("#hud-score").textContent = String(s.player.score).padStart(6, "0");
		for (const key of ["shield", "hp", "fuel", "heat"]) {
			$("#bar-" + key).style.width = clamp(s.player[key], 0, 100) + "%";
			$("#num-" + key).textContent =
				Math.round(s.player[key]) +
				(key === "heat" && s.player.overheated ? " · COOLING" : "");
		}
		$("#hud-pulse").innerHTML =
			"◆".repeat(s.player.pulses) +
			'<span style="opacity:.25">' +
			"◇".repeat(3 - s.player.pulses) +
			"</span> &nbsp; PULSE";
		$("#hud-prompts").innerHTML =
			`<span>${this.input.chip("fire")} Cannons</span><span>${this.input.chip("boost")} Boost</span><span>${this.input.chip("pulse")} Pulse</span><span>${this.input.chip("map")} Tractor</span>`;
		$("#hud-radio").innerHTML =
			this.messageTimer > 0
				? `<span class="sender">${this.training ? "FLIGHT SCHOOL" : "ANCHOR / OPEN CHANNEL"}</span>${escapeHTML(this.message)}`
				: "";
		const warp = s.state === "warp";
		$("#warp-ui").classList.toggle("hidden", !warp);
		if (warp) {
			$("#warp-name").textContent = sector?.name;
			$("#warp-progress").style.width = s.warpProgress * 100 + "%";
		}
		$("#reticle").classList.toggle("hidden", warp);
		const pos = this.input.aim;
		$("#reticle").style.left = (pos.x * 0.5 + 0.5) * 100 + "%";
		$("#reticle").style.top = (-pos.y * 0.5 + 0.5) * 100 + "%";
		$("#radar-dots").innerHTML = s.entities
			.map(
				(e) =>
					`<i class="blip ${e.type}" style="left:${clamp(e.x / 50 + 0.5, 0.05, 0.95) * 100}%;top:${clamp(1 + e.z / 130, 0.05, 0.93) * 100}%"></i>`,
			)
			.join("");
		let labels = "";
		for (const e of s.entities.filter((e) =>
			["pod", "boss", "base"].includes(e.type),
		)) {
			const p = this.scene.project(e.x, e.y, e.z);
			if (
				p.visible &&
				p.x > 0 &&
				p.x < innerWidth &&
				p.y > 0 &&
				p.y < innerHeight
			) {
				labels += `<div class="target-label ${e.type}" style="left:${p.x}px;top:${p.y - (e.type === "boss" ? 85 : 40)}px">${e.type === "pod" ? "SURVIVOR · " + Math.round(-e.z) + "m" : e.type === "base" ? "DOCKING BEACON" : "SIEGE CARRIER / PHASE " + e.phase}${e.type === "boss" ? `<div class="bossbar"><i style="width:${Math.max(0, (e.hp / e.maxHp) * 100)}%"></i></div>` : ""}</div>`;
			}
		}
		$("#target-labels").innerHTML = labels;
		$("#touch-context").classList.toggle("hidden", !s.sectorDone);
		$("#touch-pulse").classList.toggle("hidden", s.sectorDone);
		$("#touch-pulse").textContent = "PULSE " + s.player.pulses;
	}
	loop(now) {
		const dt = Math.min(0.05, (now - this.last) / 1000 || 0.016);
		this.last = now;
		const input = this.input.poll(dt);
		if (this.net.ended) {
			this.scene.update(this.snapshot(), dt, "hubend");
			requestAnimationFrame(this.loop);
			return;
		}
		if (
			this.page === "title" &&
			!this.net.hub &&
			now - this.lastActivity >= 10000
		)
			this.startAttract();
		let actual = input;
		if (this.autoPilot && this.net.role !== "guest")
			actual = this.sim.botInput();
		if (this.net.info?.server) actual = this.sim.botInput();
		const active =
			!this.paused &&
			(["flight", "map"].includes(this.page) ||
				this.attract ||
				(this.net.connected && this.started));
		if (active && this.net.role !== "guest") {
			const p = this.sim.player,
				oldX = p.x,
				oldY = p.y;
			this.sim.update(dt, actual);
			p.vx = (p.x - oldX) / dt;
			p.vy = (p.y - oldY) / dt;
			if (this.autoPilot) {
				const aim = this.scene.project(actual.aimX, actual.aimY, -65);
				this.input.aim.x = (aim.x / innerWidth) * 2 - 1;
				this.input.aim.y = 1 - (aim.y / innerHeight) * 2;
			}
			if (this.net.hub && this.sim.state === "map" && this.autoPilot) {
				this.selectBest();
				this.sim.selectSector(this.selected);
			}
			if (this.attract) {
				this.attractTimer += dt;
				const order = ["shard", "echo", "haven", "chorus", "rift", "solaris"];
				if (this.sim.state === "map") {
					this.attractIndex++;
					this.sim.selectSector(order[this.attractIndex % order.length], true);
				}
				if (this.sim.state === "victory" || this.attractTimer > 200) {
					this.startAttract();
				}
			}
		}
		const s = this.snapshot();
		this.net.update(dt, s, input);
		this.syncPage();
		this.audio.update(
			dt,
			s.state === "flight" ? (s.sector === "solaris" ? 0.9 : 0.5) : 0.1,
		);
		if (!this.settings.shake) this.scene.shake = 0;
		this.scene.update(
			s,
			dt,
			this.page === "title" ||
				(this.page === "about" && this.returnTo === "title")
				? "title"
				: this.page,
			actual.boost,
		);
		this.messageTimer = Math.max(0, this.messageTimer - dt);
		this.toastTimer = Math.max(0, this.toastTimer - dt);
		if (!this.toastTimer) $("#toast").classList.add("hidden");
		this.hudTimer -= dt;
		if (this.page === "flight" && this.hudTimer <= 0) {
			this.hud(s);
			this.hudTimer = 0.08;
		}
		requestAnimationFrame(this.loop);
	}
}
async function boot() {
	try {
		await RAPIER.init();
		const app = new SolarApp();
		window.solarApp = app;
		await app.init();
	} catch (e) {
		console.error(e);
		$("#load").innerHTML =
			`<div><div class="load-title">Signal interrupted.</div><p class="small">${escapeHTML(e.message)}</p><p class="small">Use a current WebGPU browser and allow the pinned CDN libraries.<br>Reload to reconnect.</p><button class="btn primary" onclick="location.reload()">Reconnect ↗</button></div>`;
		window.__solarError = e.message;
	}
}
boot();
