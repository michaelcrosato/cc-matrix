import { Kitchen, DEFAULTS, BAYS, autopilot } from "./core.js";
import { KitchenScene } from "./scene.js";
import { KitchenAudio } from "./audio.js";
import { UI, $, escapeText } from "./ui.js";

class PressureGriller {
	constructor() {
		this.audio = new KitchenAudio();
		this.screen = "loading";
		this.history = [];
		this.attract = false;
		this.attractEnd = 0;
		this.inputMethod = navigator.maxTouchPoints ? "touch" : "keyboard";
		this.lastInput = performance.now();
		this.keys = new Set();
		this.taps = new Set();
		this.padPrevious = new Map();
		this.padMenuAt = 0;
		this.mouseTarget = null;
		this.stick = null;
		this.touchVector = { x: 0, z: 0 };
		this.devUsed = false;
		this.best = 0;
		this.settings = {
			music: 0.1,
			sfx: 0.65,
			glyphs: "ps",
			assist: false,
			shake: !matchMedia("(prefers-reduced-motion: reduce)").matches,
		};
		try {
			const saved = JSON.parse(
				localStorage.getItem("pressure-griller-settings") || "{}",
			);
			Object.assign(this.settings, saved);
			this.best = Number(localStorage.getItem("pressure-griller-best")) || 0;
		} catch {}
		this.game = new Kitchen((name, d) => this.event(name, d));
		this.ui = new UI(this);
		this.frame = this.frame.bind(this);
		this.ended = false;
		this.lastFrame = 0;
		this.accumulator = 0;
		this.uiTick = 0;
	}
	async init() {
		this.hubPromise = AIHub.connect({ mode: "parallel", seats: [1, 4] });
		AIHub.on("start", () => {
			this.hubStarted = true;
			if (this.scene) this.hubStart();
		});
		AIHub.on("time-up", () => {
			if (this.game.phase !== "result")
				this.game.finish(this.game.stats.served >= 6);
			this.reportResult();
		});
		AIHub.on("end", () => {
			this.ended = true;
			this.keys.clear();
			this.taps.clear();
			this.audio.stop();
			if (this.scene && this.game.phase !== "result") {
				this.game.won = false;
				this.ui.results();
				this.show("result");
			}
		});
		AIHub.on("leave", ({ id }) => {
			if (this.ui && this.hubInfo)
				this.ui.toast(`Kitchen ${id + 1} clocked out. Keep cooking.`, 2);
		});
		try {
			this.scene = await new KitchenScene().init($("world"));
			this.game.move = (p, next) => this.scene.movePlayer(p, next);
			this.bindInput();
			this.applySettings();
			this.hubInfo = await this.hubPromise;
			this.game.start("solo");
			this.game.phase = "title";
			if (AIHub.active && this.hubInfo) {
				this.show("hub-wait");
				const container = $("hub-players");
				for (const p of this.hubInfo.players) {
					const e = document.createElement("span");
					e.className = "hub-player";
					e.style.color = p.color;
					e.textContent = `${p.id + 1}. ${p.name}${p.id === this.hubInfo.me ? " · YOU" : ""}`;
					container.append(e);
				}
				$("dev-entry").hidden = true;
				$("quit-button").hidden = true;
				$("pause-note").textContent =
					"AI HUB ROUND: THE KITCHEN KEEPS RUNNING WHILE THIS MENU IS OPEN.";
				AIHub.ready();
				if (this.hubStarted) this.hubStart();
			} else this.goTitle();
			this.ready = true;
			AIHub.probe(() => ({
				scene: this.game.phase,
				menu: this.screen,
				world: this.game.snapshot(),
				input: this.inputMethod,
			}));
			window.__game = {
				ready: true,
				snapshot: () => ({
					...this.game.snapshot(),
					screen: this.screen,
					inputMethod: this.inputMethod,
					backend: this.scene.backend,
					deviceLost: this.scene.renderer._isDeviceLost,
					recoveries: this.scene.recoveries || 0,
					recoveryError: this.scene.recoveryError || null,
					attract: this.attract,
					ended: this.ended,
					music: this.settings.music,
					devUsed: this.devUsed,
					physicsBodies: this.scene.world.bodies.len(),
					physicsPositions: this.scene.chefs.map((c) =>
						c.bodyPhysics.translation(),
					),
					frames: this.frames || 0,
				}),
				action: (name, value) => this.action(name, value),
				advance: (seconds) => {
					for (let t = 0; t < seconds; t += 1 / 60)
						this.tick(Math.min(1 / 60, seconds - t));
					this.ui.update();
				},
				setPlayer: (id, x, z) => {
					const p = this.game.players[id];
					p.x = x;
					p.z = z;
					this.scene.chefs[id].bodyPhysics.setTranslation(
						{ x, y: 0.68, z },
						true,
					);
				},
				spawn: (lane, x) => this.game.spawn(lane, x),
				project: (x, z) => this.scene.project(x, z),
				set: (key, value) => {
					if (
						["bell", "pressure", "remaining", "clock", "god", "auto"].includes(
							key,
						)
					)
						this.game[key] = value;
				},
				setIdle: (seconds) => {
					this.lastInput = performance.now() - seconds * 1000;
				},
				audio: () => this.audio.levels(),
				inputTick: () => {
					const inputs = this.readInputs();
					this.tick(1 / 60, inputs);
				},
				loseDevice: () => this.scene.renderer.backend.device?.destroy(),
				render: () => {
					this.scene.update(this.game, 0.016, this.screen === "title", false);
					this.scene.render();
				},
			};
			requestAnimationFrame(this.frame);
		} catch (e) {
			console.error(e);
			$("load-status").textContent =
				`The griddle could not start: ${e.message}. A browser with WebGPU or WebGL 2 is needed.`;
			AIHub.fail(e.message);
			window.__game = { ready: false, error: e.message };
		}
	}
	show(name, remember = false) {
		if (remember) this.history.push(this.screen);
		this.screen = name;
		this.keys.clear();
		this.taps.clear();
		this.mouseTarget = null;
		this.ui.screen(name);
		if (name === "dev") this.ui.syncDev();
		if (name === "about") this.ui.about();
	}
	goTitle() {
		if (AIHub.active || this.ended) return;
		this.attract = false;
		this.attractEnd = 0;
		this.game.god = false;
		this.game.auto = false;
		this.game.config = { ...DEFAULTS };
		this.game.start("solo");
		this.game.phase = "title";
		this.history = [];
		this.show("title");
		this.lastInput = performance.now();
		$("toast").classList.remove("show");
	}
	start(mode, tutorial = true) {
		if (AIHub.active || this.ended) return;
		this.attract = mode === "attract";
		this.devUsed = false;
		this.game.config = { ...DEFAULTS };
		this.game.god = false;
		this.game.auto = false;
		this.game.start(mode, 1983 + (mode === "attract" ? 7 : 0));
		this.history = [];
		this.show(tutorial && mode !== "attract" ? "howto" : "game");
		$("coop-note").hidden = mode !== "coop";
		this.ui.prompts();
		this.ui.update();
		if (mode === "practice")
			this.ui.toast("Practice kitchen · pressure is safe, no closing time.", 4);
		else if (!tutorial && mode !== "attract")
			this.ui.toast(
				"Catch the toppings. Feed the regulars. Keep your cool.",
				4,
			);
	}
	hubStart() {
		if (!this.hubInfo || this.ended || this.hubRoundStarted) return;
		this.hubRoundStarted = true;
		this.game.start("solo", this.hubInfo.seed);
		this.show("game");
	}
	reportResult() {
		if (!AIHub.active || this.resultReported || this.ended) return;
		this.resultReported = true;
		AIHub.result({
			score: this.game.score,
			stats: {
				Orders: this.game.stats.served,
				"Best streak": this.game.bestCombo,
				Mistakes: this.game.stats.wrong,
			},
			awards: this.game.won
				? [
						{
							title: "Lunch legend",
							detail: "All three rushes, hot off the griddle.",
						},
					]
				: [],
		});
	}
	applySettings() {
		this.audio.volumes(this.settings.music, this.settings.sfx);
		try {
			localStorage.setItem(
				"pressure-griller-settings",
				JSON.stringify(this.settings),
			);
		} catch {}
		this.ui?.prompts();
	}
	method(name) {
		if (this.inputMethod === name) return;
		this.inputMethod = name;
		this.ui.prompts();
	}
	activity(method) {
		if (this.ended) return true;
		this.lastInput = performance.now();
		if (method) this.method(method);
		if (this.attract) {
			this.goTitle();
			return true;
		}
		return false;
	}
	action(name, el) {
		if (this.ended) return;
		if (this.attract) {
			this.goTitle();
			return;
		}
		this.lastInput = performance.now();
		const g = this.game,
			p = g.players[0];
		if (
			AIHub.active &&
			[
				"play",
				"coop",
				"practice",
				"replay",
				"quit",
				"restart",
				"dev",
				"next",
				"complete",
			].includes(name)
		)
			return;
		switch (name) {
			case "play":
				this.start("solo");
				break;
			case "coop":
				this.start("coop");
				break;
			case "practice":
				this.start("practice");
				break;
			case "begin":
			case "resume":
				this.history = [];
				this.show("game");
				break;
			case "replay":
				this.start(g.mode === "attract" ? "solo" : g.mode, false);
				break;
			case "pause":
				if (this.screen === "game") this.show("pause");
				break;
			case "settings":
			case "about":
			case "dev":
				this.show(name, true);
				break;
			case "help":
				this.show("howto", true);
				break;
			case "back": {
				if (this.screen === "pause") this.show("game");
				else
					this.show(
						this.history.pop() || (g.phase === "playing" ? "pause" : "title"),
					);
				break;
			}
			case "quit":
				this.goTitle();
				break;
			case "glyphs":
				this.settings.glyphs = this.settings.glyphs === "ps" ? "xbox" : "ps";
				this.applySettings();
				this.ui.syncSettings();
				break;
			case "assist":
				this.settings.assist = !this.settings.assist;
				this.applySettings();
				this.ui.syncSettings();
				break;
			case "shake":
				this.settings.shake = !this.settings.shake;
				this.applySettings();
				this.ui.syncSettings();
				break;
			case "fullscreen":
				if (document.fullscreenElement)
					document.exitFullscreen().catch(() => {});
				else document.documentElement.requestFullscreen().catch(() => {});
				break;
			case "bell":
				if (!g.ring())
					this.ui.toast("The bell recharges when you serve orders.");
				break;
			case "ticket":
				p.target = Number(el.dataset.bay);
				break;
			case "touchAct":
				g.action(p);
				break;
			case "nextShift":
				if (g.phase === "interlude") {
					g.nextShift();
					this.show("game");
				}
				break;
			case "god":
				g.god = !g.god;
				this.devUsed = true;
				this.ui.syncDev();
				break;
			case "auto":
				g.auto = !g.auto;
				this.devUsed = true;
				this.ui.syncDev();
				break;
			case "fillBell":
				g.bell = 100;
				this.ui.toast("Dinner bell charged.");
				this.devUsed = true;
				break;
			case "physics":
				this.scene.debugLines.visible = !this.scene.debugLines.visible;
				this.ui.syncDev();
				break;
			case "next":
				g.nextShift();
				this.devUsed = true;
				break;
			case "complete":
				g.finish(true);
				this.devUsed = true;
				break;
			case "resetDev":
				g.config = { ...DEFAULTS };
				g.god = false;
				g.auto = false;
				for (const t of g.tickets) {
					t.patience = (t.patience / t.maxPatience) * DEFAULTS.patience;
					t.maxPatience = DEFAULTS.patience;
				}
				this.scene.debugLines.visible = false;
				this.ui.syncDev();
				break;
			case "restart":
				g.start(g.mode);
				this.show("game");
				break;
			case "aboutTab":
				this.ui.about(Number(el.dataset.tab));
				break;
		}
		this.ui.update();
	}
	event(name, d) {
		if (this.scene) this.scene.event(name, d, this.game);
		if (!this.ui) return;
		if (!this.attract) this.audio.event(name);
		if (name === "serve")
			this.ui.toast(
				`Order up! +${d.points}${d.combo > 1 ? ` · ${Math.min(d.combo, 5)}× hot streak` : ""}`,
				1.8,
			);
		if (name === "wrongCatch")
			this.ui.toast("That topping doesn’t fit a ticket. Easy, chef!", 2.4);
		if (name === "wrongServe") {
			const p = this.game.players[d.player],
				matching = this.game.tickets.find(
					(t) =>
						t.recipe.length === p.plate.length &&
						[...t.recipe].sort().join("") === [...p.plate].sort().join(""),
				);
			this.ui.toast(
				matching
					? `Try counter ${matching.bay + 1} · ${BAYS[matching.bay].name}!`
					: "This burger still needs the right toppings.",
			);
		}
		if (name === "expired")
			this.ui.toast(`${BAYS[d.bay].name} needs a fresh order. +13 pressure`);
		if (name === "heat")
			this.ui.toast("Hot griddle! Dash clear of the steam.", 2);
		if (name === "empty")
			this.ui.toast("Get close to a topping to catch it.", 1.3);
		if (name === "bell")
			this.ui.toast("Ding! Seven seconds of sweet relief.", 2.6);
		if (name === "interlude") {
			this.ui.interlude();
			this.show("interlude");
		}
		if (name === "shift" && this.screen === "interlude") this.show("game");
		if (name === "win" || name === "lose") {
			if (this.attract) {
				this.attractEnd = 3;
				return;
			}
			this.ui.results();
			this.show("result");
			this.reportResult();
			if (!this.devUsed && !AIHub.active) {
				this.best = Math.max(this.best, this.game.score);
				try {
					localStorage.setItem("pressure-griller-best", String(this.best));
				} catch {}
			}
		}
	}
	bindInput() {
		window.addEventListener("resize", () => this.scene.resize());
		window.addEventListener("blur", () => {
			this.keys.clear();
			this.taps.clear();
			this.touchVector = { x: 0, z: 0 };
			if (!AIHub.active && this.screen === "game" && !this.attract)
				this.show("pause");
		});
		document.addEventListener("visibilitychange", () => {
			if (document.hidden) this.keys.clear();
		});
		document.addEventListener("keydown", (e) => {
			const key = e.key.toLowerCase();
			if (this.activity("keyboard")) {
				e.preventDefault();
				return;
			}
			this.audio.unlock();
			if (
				[
					" ",
					"tab",
					"arrowup",
					"arrowdown",
					"arrowleft",
					"arrowright",
					"escape",
				].includes(key)
			)
				e.preventDefault();
			if (key === "escape" || key === "p") {
				if (e.repeat) return;
				if (this.screen === "game") this.action("pause");
				else if (
					!["title", "hub-wait", "result", "interlude"].includes(this.screen)
				)
					this.action("back");
				return;
			}
			if (this.screen !== "game") {
				if (key === "enter" || key === " ") this.ui.menu(null, true);
				else if (["arrowup", "w"].includes(key)) this.ui.menu("up");
				else if (["arrowdown", "s", "tab"].includes(key)) this.ui.menu("down");
				else if (["arrowleft", "a"].includes(key)) this.ui.menu("left");
				else if (["arrowright", "d"].includes(key)) this.ui.menu("right");
				return;
			}
			if (!this.keys.has(key)) this.taps.add(key);
			this.keys.add(key);
			this.mouseTarget = null;
		});
		document.addEventListener("keyup", (e) =>
			this.keys.delete(e.key.toLowerCase()),
		);
		document.addEventListener(
			"pointerdown",
			(e) => {
				const method = e.pointerType === "touch" ? "touch" : "mouse";
				if (this.activity(method)) {
					e.preventDefault();
					e.stopImmediatePropagation();
					return;
				}
				this.audio.unlock();
				if (e.target !== $("world") || this.screen !== "game") return;
				if (e.pointerType === "touch") {
					if (this.stick) {
						this.taps.add("shift");
						return;
					}
					this.stick = {
						id: e.pointerId,
						x: e.clientX,
						y: e.clientY,
						lastX: e.clientX,
						lastY: e.clientY,
						moved: false,
					};
					$("touch-dot").style.cssText =
						`display:block;left:${e.clientX - 32}px;top:${e.clientY - 32}px`;
					$("world").setPointerCapture(e.pointerId);
				} else if (e.button === 2) this.taps.add("shift");
				else this.setMouseTarget(e.clientX, e.clientY);
			},
			true,
		);
		document.addEventListener("pointermove", (e) => {
			if (this.activity(e.pointerType === "touch" ? "touch" : "mouse")) return;
			if (this.stick && e.pointerId === this.stick.id) {
				const dx = e.clientX - this.stick.x,
					dy = e.clientY - this.stick.y;
				if (Math.hypot(dx, dy) > 8) this.stick.moved = true;
				this.touchVector = {
					x: Math.max(-1, Math.min(1, dx / 45)),
					z: Math.max(-1, Math.min(1, dy / 45)),
				};
			}
		});
		const touchEnd = (e) => {
			if (!this.stick || e.pointerId !== this.stick.id) return;
			if (!this.stick.moved) this.setMouseTarget(e.clientX, e.clientY);
			this.stick = null;
			this.touchVector = { x: 0, z: 0 };
			$("touch-dot").style.display = "none";
		};
		document.addEventListener("pointerup", touchEnd);
		document.addEventListener("pointercancel", touchEnd);
		document.addEventListener("contextmenu", (e) => {
			if (e.target === $("world")) e.preventDefault();
		});
		window.addEventListener("gamepadconnected", () => {
			this.method("pad");
			this.ui.toast("Controller connected. Aprons on.");
		});
	}
	setMouseTarget(x, y) {
		const p = this.scene.pick(x, y);
		if (!p) return;
		const food = this.game.food.find(
			(f) => Math.hypot(f.x - p.x, f.z - p.z) < 0.85,
		);
		const bay = BAYS.findIndex((b) => Math.hypot(b.x - p.x, 4.6 - p.z) < 1.4);
		this.mouseTarget = {
			x: Math.max(-6, Math.min(6, p.x)),
			z: Math.max(-3.4, Math.min(3.6, p.z)),
			foodId: food?.id,
			bay,
		};
		if (bay >= 0) {
			this.mouseTarget.x = BAYS[bay].x;
			this.mouseTarget.z = 3.6;
			this.game.players[0].target = bay;
		}
	}
	pollPads() {
		const pads = Array.from(navigator.getGamepads?.() || []).filter(Boolean),
			result = [];
		for (let i = 0; i < Math.min(pads.length, 2); i++) {
			const p = pads[i],
				previous = this.padPrevious.get(p.index) || [];
			const down = (n) => !!p.buttons[n]?.pressed,
				edge = (n) => down(n) && !previous[n];
			const axis = (n) => (Math.abs(p.axes[n] || 0) > 0.17 ? p.axes[n] : 0);
			const x = axis(0) || Number(down(15)) - Number(down(14)),
				z = axis(1) || Number(down(13)) - Number(down(12));
			const active =
				Math.abs(x) + Math.abs(z) > 0.1 || p.buttons.some((b) => b.pressed);
			const interrupted = active && this.activity("pad");
			if (active) this.audio.unlock();
			if (!interrupted) {
				if (edge(9) && !down(8)) {
					if (this.screen === "game") this.action("pause");
					else if (this.screen === "pause") this.action("resume");
				} else if (this.screen !== "game") {
					if (edge(0)) this.ui.menu(null, true);
					else if (
						edge(1) &&
						!["title", "hub-wait", "result", "interlude"].includes(this.screen)
					)
						this.action("back");
					const now = performance.now();
					if (Math.abs(x) + Math.abs(z) > 0.2 && now > this.padMenuAt) {
						this.ui.menu(
							Math.abs(z) >= Math.abs(x)
								? z > 0
									? "down"
									: "up"
								: x > 0
									? "right"
									: "left",
						);
						this.padMenuAt = now + 210;
					}
				} else
					result[i] = {
						x,
						z,
						action: down(0),
						dash: edge(1),
						discard: edge(2),
						bell: edge(3),
						cycle: edge(5) ? 1 : edge(4) ? -1 : 0,
					};
			}
			this.padPrevious.set(
				p.index,
				p.buttons.map((b) => b.pressed),
			);
		}
		return result;
	}
	readInputs() {
		const pads = this.pollPads(),
			g = this.game;
		if (this.attract || g.auto) return g.players.map((p) => autopilot(g, p));
		const held = (k) => Number(this.keys.has(k));
		const tap = (k) => this.taps.has(k);
		const inputs = g.players.map((p, i) => {
			let input;
			if (i === 1)
				input = {
					x: held("arrowright") - held("arrowleft"),
					z: held("arrowdown") - held("arrowup"),
					action: this.keys.has("enter"),
					dash: tap("/"),
					discard: tap("backspace"),
					cycle: tap(".") ? 1 : 0,
				};
			else
				input = {
					x:
						held("d") -
						held("a") +
						(g.players.length === 1
							? held("arrowright") - held("arrowleft")
							: 0),
					z:
						held("s") -
						held("w") +
						(g.players.length === 1 ? held("arrowdown") - held("arrowup") : 0),
					action: this.keys.has(" "),
					dash: tap("shift"),
					discard: tap("r"),
					bell: tap("q"),
					cycle: tap("tab") ? 1 : 0,
				};
			if (pads[i]) input = pads[i];
			if (i === 0 && this.inputMethod === "touch") {
				input.x = this.touchVector.x;
				input.z = this.touchVector.z;
				input.dash ||= tap("shift");
			}
			const x = input.x,
				z = input.z;
			input.x = x * 0.917 + z * 0.399;
			input.z = z * 0.917 - x * 0.399;
			input.assist = this.settings.assist || this.inputMethod === "touch";
			if (i === 0 && this.mouseTarget) {
				const t = this.mouseTarget,
					f = g.food.find((food) => food.id === t.foodId);
				if (f) {
					t.x = Math.min(6, f.x);
					t.z = f.z;
				}
				const dx = t.x - p.x,
					dz = t.z - p.z,
					dist = Math.hypot(dx, dz);
				input.x = dist > 0.15 ? dx / Math.max(1, dist) : 0;
				input.z = dist > 0.15 ? dz / Math.max(1, dist) : 0;
				if (dist < g.config.catchReach * 0.8) input.action = true;
				if (
					(dist < 0.3 && t.bay < 0 && !f) ||
					(t.foodId && !f) ||
					(t.bay >= 0 && p.plate.length === 0)
				)
					this.mouseTarget = null;
			}
			return input;
		});
		this.taps.clear();
		return inputs;
	}
	tick(dt, inputs) {
		if (this.ended) return;
		if (this.screen === "title") {
			if (performance.now() - this.lastInput >= 10000)
				this.start("attract", false);
			return;
		}
		const canRun =
			this.screen === "game" ||
			this.screen === "interlude" ||
			(AIHub.active && this.hubRoundStarted);
		if (!canRun || (AIHub.active && AIHub.time() < 0)) return;
		if (this.attractEnd > 0) {
			this.attractEnd -= dt;
			if (this.attractEnd <= 0) this.start("attract", false);
			return;
		}
		const sampled =
			inputs ||
			(this.attract || this.game.auto
				? this.game.players.map((p) => autopilot(this.game, p))
				: this.readInputs());
		this.game.update(dt, sampled);
		this.scene.stepPhysics(dt);
		if (AIHub.active && this.hubRoundStarted && this.game.phase !== "result")
			AIHub.progress({
				score: this.game.score,
				label: `${this.game.stats.served} orders · rush ${this.game.stage + 1}`,
			});
	}
	frame(now) {
		const dt = Math.min(
			0.15,
			this.lastFrame ? (now - this.lastFrame) / 1000 : 1 / 60,
		);
		this.lastFrame = now;
		const inputs = this.readInputs();
		this.accumulator += dt * this.game.config.timeScale;
		let n = 0;
		while (this.accumulator >= 1 / 60 && n++ < 36) {
			this.tick(
				1 / 60,
				this.attract || this.game.auto
					? undefined
					: n === 1
						? inputs
						: inputs.map((v) => ({
								...v,
								dash: false,
								bell: false,
								cycle: 0,
								discard: false,
							})),
			);
			this.accumulator -= 1 / 60;
		}
		this.scene.update(
			this.game,
			dt,
			this.screen === "title",
			this.settings.shake,
		);
		this.scene.render();
		this.frames = (this.frames || 0) + 1;
		this.audio.update(this.screen !== "game");
		this.uiTick += dt;
		if (this.uiTick >= 0.08) {
			this.uiTick = 0;
			this.ui.update();
			if (AIHub.active && this.hubRoundStarted && AIHub.time() < 0) {
				$("toast").classList.add("show");
				$("toast").textContent =
					`Aprons ready? ${Math.ceil(-AIHub.time() / 1000)}`;
				this.ui.toastUntil = now + 200;
			}
		}
		requestAnimationFrame(this.frame);
	}
}

new PressureGriller().init();
