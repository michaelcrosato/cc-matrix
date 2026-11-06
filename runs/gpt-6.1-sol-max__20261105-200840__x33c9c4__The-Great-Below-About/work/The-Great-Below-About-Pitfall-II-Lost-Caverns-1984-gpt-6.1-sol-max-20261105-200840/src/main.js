import { Art, THREE } from "./art.js";
import { AudioSystem } from "./audio.js";
import { DEFAULTS, Game, PLATFORMS, ZONES } from "./game.js";
import { TrailNetwork } from "./network.js";
import { UI } from "./ui.js";

const $ = (id) => document.getElementById(id);
const diagnostics = {
	stage: "script",
	ready: false,
	frames: 0,
	backend: "unknown",
	errors: [],
	lastInput: "keyboard",
	jumpInputs: 0,
	gamepadInputs: 0,
	touchInputs: 0,
};
window.__belowBoot = diagnostics;
let game,
	art,
	ui,
	renderer,
	network,
	audio,
	hubInfo = null,
	hubStarted = false,
	hubEnded = false,
	hubReported = false,
	attract = false,
	demoTime = 0,
	manual = false,
	lastActivity = performance.now(),
	acc = 0,
	netAcc = 0,
	lastAssist = false,
	mutedStartup = false;
const keys = new Set();
let mouseJump = false,
	mouseAction = false,
	touchJump = false,
	touchAction = false,
	touchStick = { x: 0, y: 0, id: null, ox: 0, oy: 0 };
let pads = [],
	menuRepeat = 0,
	padBlock = 0,
	assistCooldown = 0;
function activity(type) {
	if (hubEnded) return false;
	lastActivity = performance.now();
	if (type) {
		diagnostics.lastInput = type;
		ui?.setInput(type);
	}
	audio?.unlock().catch(() => {});
	if (attract) {
		exitAttract();
		return true;
	}
	return false;
}
function startExpedition(options = {}) {
	if (hubEnded) return;
	attract = !!options.attract;
	demoTime = 0;
	acc = 0;
	game.params = { ...DEFAULTS };
	game.invincible = attract;
	game.noclip = false;
	game.speedScale = 1;
	game.reset();
	art.bindGame(game);
	art.snapCamera();
	ui.devUsed = false;
	ui.playing();
	lastAssist = false;
	applyAssist();
	padBlock = 0.25;
	keys.clear();
	if (!attract && !AIHub.active)
		ui.toast("Pip’s below. Marmalade followed. Best bring them home.", 4.8);
	$("zone-banner").classList.remove("show");
	$("demo-banner").hidden = !attract;
}
function showTitle() {
	if (AIHub.active) return;
	attract = false;
	game.reset();
	art.bindGame(game);
	ui.title();
	lastActivity = performance.now();
	$("demo-banner").hidden = true;
	$("zone-banner").classList.remove("show");
	$("toast").classList.remove("show");
	$("toast").hidden = true;
	$("zone-banner").hidden = true;
}
function exitAttract() {
	attract = false;
	game.invincible = false;
	showTitle();
}
function applyAssist() {
	const enabled = ui.settings.assist && !AIHub.active;
	if (enabled !== lastAssist) {
		game.params.enemySpeed = enabled ? 0.65 : DEFAULTS.enemySpeed;
		game.params.penalty = enabled ? 0.35 : DEFAULTS.penalty;
		game.params.jump = enabled ? 12.6 : DEFAULTS.jump;
		lastAssist = enabled;
	}
}
function reportResult(time = false) {
	if (!AIHub.active || hubReported || hubEnded) return;
	hubReported = true;
	const s = game.snapshot();
	AIHub.result({
		score: s.score,
		stats: {
			Discoveries: Object.values(s.rescued).filter(Boolean).length,
			Gold: s.gold,
			Stumbles: s.deaths,
		},
		awards:
			s.deaths === 0
				? [
						{
							title: "Sure-footed",
							detail: "No creature sent this explorer home.",
						},
					]
				: [],
	});
}
function onEvent(type, data) {
	if (!ui || !art) return;
	const s = game.snapshot();
	audio.event(type, data);
	if (type === "zone") {
		if (!attract) ui.zone(data);
	}
	if (type === "collect") {
		art.burst(s.x, s.y, 0xffd16b, 15);
		if (!attract)
			ui.toast(
				data.kind === "rat"
					? "A very polite introduction. <b>+15,000</b>"
					: "Gold found. <b>+5,000</b>",
				1.8,
			);
	}
	if (type === "rescue") {
		art.burst(s.x, s.y, 0xffd16b, 35);
		if (!attract) {
			const lines = {
				pip: "<b>Pip found!</b> “The map was upside down. Naturally.”",
				fox: "<b>Marmalade found!</b> A dignified fox. An undignified detour.",
				prism: "<b>The Sunseed Prism!</b> That explains the glow.",
			};
			ui.toast(lines[data.kind], 5);
		}
	}
	if (type === "checkpoint") {
		art.burst(s.x, s.y, 0xc8e6b1, 12);
		if (!attract) ui.toast("<b>Lantern lit.</b> You’ll return here.", 2.3);
	}
	if (type === "hit") {
		if (!ui.settings.reduced) art.shake = 0.8;
		art.burst(data.from.x, data.from.y, 0x9cd0c5, 24);
		if (!attract)
			ui.toast("A small setback. <b>Your discoveries are safe.</b>", 3.5);
	}
	if (type === "step") art.burst(s.x, s.y - 0.7, 0xc1bb8e, 2);
	if (type === "fall" && !attract)
		ui.toast("A rather long way down. <b>−" + data.cost + "</b>", 2);
	if (type === "water") art.burst(data.x, data.y, 0xa6e2d1, 20);
	if (type === "balloon") {
		if (data.kind === "pop") art.burst(data.x, data.y, 0xf6c46b, 28);
		if (!attract && data.kind === "board")
			ui.toast(
				"An inflated sense of direction. <b>Steer up to the light.</b>",
				4,
			);
		if (!attract && data.kind === "pop")
			ui.toast("Mind the bats! Another balloon is already on its way.", 3);
	}
	if (type === "finish" && !attract) {
		reportResult();
		setTimeout(() => {
			if (!hubEnded && game.finished) {
				ui.screen = "win";
				ui.stack = [];
				ui.render();
			}
		}, 900);
	}
}
function pauseOrBack() {
	if (hubEnded || !ui) return;
	if (ui.screen === "") ui.open("pause");
	else if (!["title", "hub-wait", "hub-end", "win"].includes(ui.screen))
		ui.back();
}
function mapToggle() {
	if (hubEnded) return;
	if (ui.screen === "") ui.open("map");
	else if (ui.screen === "map") ui.back();
}
function getInput() {
	let x =
			(keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) -
			(keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0),
		y =
			(keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) -
			(keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0);
	const pad = pads.find((p) => p?.connected);
	let jump = keys.has("Space") || keys.has("KeyZ") || mouseJump || touchJump,
		action = keys.has("KeyE") || mouseAction || touchAction;
	if (pad) {
		const ax = Math.abs(pad.axes[0] || 0) > 0.2 ? pad.axes[0] : 0,
			ay = Math.abs(pad.axes[1] || 0) > 0.2 ? -pad.axes[1] : 0;
		x +=
			ax +
			(pad.buttons[15]?.pressed ? 1 : 0) -
			(pad.buttons[14]?.pressed ? 1 : 0);
		y +=
			ay +
			(pad.buttons[12]?.pressed ? 1 : 0) -
			(pad.buttons[13]?.pressed ? 1 : 0);
		if (padBlock <= 0) {
			jump ||= !!pad.buttons[0]?.pressed;
			action ||= !!pad.buttons[2]?.pressed;
		}
	}
	x += touchStick.x;
	y += touchStick.y;
	return {
		x: Math.max(-1, Math.min(1, x)),
		y: Math.max(-1, Math.min(1, y)),
		jump,
		action,
	};
}
let prevPadButtons = [],
	prevPadAxes = [0, 0];
function pollPad(dt) {
	try {
		pads = Array.from(navigator.getGamepads?.() || []);
	} catch {
		pads = [];
	}
	const pad = pads.find((p) => p?.connected);
	padBlock = Math.max(0, padBlock - dt);
	if (!pad) {
		prevPadButtons = [];
		return;
	}
	const b = pad.buttons.map((x) => !!x.pressed),
		x =
			(Math.abs(pad.axes[0] || 0) > 0.45 ? Math.sign(pad.axes[0]) : 0) +
			(b[15] ? 1 : 0) -
			(b[14] ? 1 : 0),
		y =
			(Math.abs(pad.axes[1] || 0) > 0.45 ? Math.sign(pad.axes[1]) : 0) +
			(b[13] ? 1 : 0) -
			(b[12] ? 1 : 0),
		fresh = (i) => b[i] && !prevPadButtons[i];
	const hasInput =
		b.some(Boolean) || x || y || Math.abs(pad.axes[3] || 0) > 0.2;
	if (ui.screen && Math.abs(pad.axes[3] || 0) > 0.2)
		ui.scroll(pad.axes[3] * dt * 700);
	if (hasInput) {
		const exited = activity("gamepad");
		diagnostics.gamepadInputs++;
		if (exited) {
			prevPadButtons = b;
			prevPadAxes = [x, y];
			return;
		}
	}
	if (!hubEnded) {
		if (fresh(9) && !b[8]) pauseOrBack();
		else if (ui.screen === "") {
			if (fresh(3)) mapToggle();
			if (fresh(0)) diagnostics.jumpInputs++;
		} else if (!["hub-wait", "hub-end"].includes(ui.screen)) {
			if (fresh(1)) pauseOrBack();
			if (fresh(0)) ui.confirm();
			if (fresh(3) && ui.screen === "map") ui.back();
			menuRepeat -= dt;
			if (
				(x || y) &&
				(menuRepeat <= 0 || x !== prevPadAxes[0] || y !== prevPadAxes[1])
			) {
				if (y) ui.navigate(y > 0 ? 1 : -1);
				else ui.adjust(x > 0 ? 1 : -1);
				menuRepeat = 0.19;
			}
			if (!x && !y) menuRepeat = 0;
		}
	}
	prevPadButtons = b;
	prevPadAxes = [x, y];
}
function setupInput() {
	window.addEventListener("keydown", (e) => {
		if (hubEnded) return;
		const typing = e.target.matches("input:not([type=range]),textarea");
		if (activity("keyboard")) {
			e.preventDefault();
			return;
		}
		if (typing) {
			if (e.code === "Escape") {
				e.preventDefault();
				e.target.blur();
				ui.back();
			} else if (e.code === "Enter") {
				e.preventDefault();
				ui.act("room-join");
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
				"Escape",
				"Tab",
				"Enter",
			].includes(e.code)
		)
			e.preventDefault();
		if (e.code === "Escape" || e.code === "KeyP") {
			if (!e.repeat) pauseOrBack();
			return;
		}
		if (e.code === "KeyM") {
			if (!e.repeat) mapToggle();
			return;
		}
		if (ui.screen) {
			if (e.code === "PageDown" || e.code === "PageUp") {
				e.preventDefault();
				ui.scroll((e.code === "PageDown" ? 1 : -1) * innerHeight * 0.65);
				return;
			}
			if (e.code === "ArrowDown" || e.code === "KeyS" || e.code === "Tab") {
				ui.navigate(e.shiftKey ? -1 : 1);
			} else if (e.code === "ArrowUp" || e.code === "KeyW") {
				ui.navigate(-1);
			} else if (e.code === "ArrowLeft" || e.code === "KeyA") {
				ui.adjust(-1);
			} else if (e.code === "ArrowRight" || e.code === "KeyD") {
				ui.adjust(1);
			} else if ((e.code === "Enter" || e.code === "Space") && !e.repeat)
				ui.confirm();
			return;
		}
		keys.add(e.code);
		if (e.code === "Space") diagnostics.jumpInputs++;
	});
	window.addEventListener("keyup", (e) => keys.delete(e.code));
	window.addEventListener("blur", () => {
		keys.clear();
		mouseJump = false;
		mouseAction = false;
		touchJump = false;
		touchAction = false;
		touchStick.x = 0;
		touchStick.y = 0;
	});
	document.addEventListener(
		"pointerdown",
		(e) => {
			if (hubEnded) return;
			if (e.pointerType === "touch") {
				activity("touch");
				diagnostics.touchInputs++;
			} else activity("keyboard");
		},
		true,
	);
	$("scene").addEventListener("pointerdown", (e) => {
		if (hubEnded || attract || ui.screen) return;
		if (e.pointerType === "touch") {
			e.preventDefault();
			$("scene").setPointerCapture(e.pointerId);
			if (e.clientX < innerWidth * 0.55 && touchStick.id === null) {
				touchStick = {
					x: 0,
					y: 0,
					id: e.pointerId,
					ox: e.clientX,
					oy: e.clientY,
				};
				const stick = $("touch-stick");
				stick.style.left = e.clientX + "px";
				stick.style.top = e.clientY + "px";
				stick.style.display = "block";
			} else {
				touchJump = true;
				diagnostics.jumpInputs++;
			}
		} else if (e.button === 0) {
			if (game.carry) mouseAction = true;
			else mouseJump = true;
		}
	});
	$("scene").addEventListener("pointermove", (e) => {
		if (e.pointerType !== "touch") {
			if (ui.screen === "title") lastActivity = performance.now();
			return;
		}
		if (touchStick.id === e.pointerId) {
			touchStick.x = Math.max(
				-1,
				Math.min(1, (e.clientX - touchStick.ox) / 48),
			);
			touchStick.y = Math.max(
				-1,
				Math.min(1, (touchStick.oy - e.clientY) / 48),
			);
			$("touch-stick").firstElementChild.style.transform =
				`translate(${touchStick.x * 26}px,${-touchStick.y * 26}px)`;
		}
	});
	const end = (e) => {
		if (e.pointerId === touchStick.id) {
			touchStick.x = 0;
			touchStick.y = 0;
			touchStick.id = null;
			$("touch-stick").style.display = "none";
		}
		touchJump = false;
		touchAction = false;
		mouseJump = false;
		mouseAction = false;
	};
	window.addEventListener("pointerup", end);
	window.addEventListener("pointercancel", end);
	$("touch-action").addEventListener("pointerdown", (e) => {
		e.preventDefault();
		e.stopPropagation();
		if (game.carry) touchAction = true;
		else touchJump = true;
		diagnostics.jumpInputs++;
	});
	$("touch-menu").onclick = () => pauseOrBack();
	document.addEventListener("pointermove", (e) => {
		if (
			e.pointerType !== "touch" &&
			Math.abs(e.movementX) + Math.abs(e.movementY) > 0
		)
			activity("keyboard");
	});
	document.addEventListener("contextmenu", (e) => e.preventDefault());
	document.addEventListener("visibilitychange", () => {
		if (document.hidden) {
			keys.clear();
			if (!AIHub.active && ui.screen === "" && !attract) ui.open("pause");
		}
	});
}
const replay = [
	[0, 3, 0.84, "idle"],
	[2, 8, 0.84, "run"],
	[4, 15, 0.84, "run"],
	[5, 18.5, 3.3, "jump"],
	[6.5, 25, 0.84, "run"],
	[8, 34, 0.84, "climb"],
	[11, 34, -11.1, "climb"],
	[13, 26, -11.1, "run"],
	[17, 8, -11.1, "run"],
	[18.5, 8, -11.1, "wave"],
	[23, 34, -11.1, "run"],
	[25, 39, -11.1, "jump"],
	[28, 54, -11.1, "climb"],
	[31, 54, -25.1, "climb"],
	[33, 47, -25.1, "run"],
	[35, 39, -27, "swim"],
	[40, 22, -29.3, "swim"],
	[44, 8, -28, "swim"],
	[46, 1, -25.1, "jump"],
	[48, 0.4, -25.1, "idle"],
	[50, -4, -25.1, "climb"],
	[53, -4, -39.1, "climb"],
	[57, 15, -39.1, "run"],
	[58, 20, -36.5, "jump"],
	[61, 39, -39.1, "run"],
	[62, 50, -36.5, "jump"],
	[65, 64, -39.1, "run"],
	[68, 74, -38.2, "float"],
	[74, 75, -18, "float"],
	[80, 77, 4.9, "float"],
	[82, 84, 7, "jump"],
	[84, 88, 4.9, "idle"],
	[88, 88, 4.9, "wave"],
];
function updateAttract(dt) {
	demoTime += dt;
	if (demoTime > 90) {
		startExpedition({ attract: true });
		return;
	}
	let a = replay[0],
		b = replay[1];
	for (let i = 0; i < replay.length - 1; i++)
		if (demoTime >= replay[i][0]) {
			a = replay[i];
			b = replay[i + 1];
		}
	const f = Math.max(0, Math.min(1, (demoTime - a[0]) / (b[0] - a[0])));
	game.body.setTranslation(
		{ x: a[1] + (b[1] - a[1]) * f, y: a[2] + (b[2] - a[2]) * f },
		true,
	);
	game.body.setLinvel({ x: (b[1] - a[1]) / (b[0] - a[0]), y: 0 }, true);
	game.time = demoTime;
	game.face = b[1] >= a[1] ? 1 : -1;
	game.mode = b[3];
	game.carry = b[3] === "float";
	game.updateEnemies(dt);
	game.interactions();
	const p = game.position;
	game.zone = game.zoneAt(p.x, p.y);
}
function assistedInput(input, dt) {
	assistCooldown = Math.max(0, assistCooldown - dt);
	if (
		ui.input !== "touch" ||
		assistCooldown > 0 ||
		!game.grounded ||
		Math.abs(input.x) < 0.25
	)
		return input;
	const p = game.position,
		dir = Math.sign(input.x);
	const floor = PLATFORMS.find(
		([a, b, y]) => p.x > a && p.x < b && Math.abs(p.y - 0.75 - y) < 0.3,
	);
	let should = false;
	if (floor) {
		const edge = dir > 0 ? floor[1] : floor[0];
		if (Math.abs(p.x - edge) < 1.2) {
			const next = PLATFORMS.some(
				([a, b, y]) =>
					(dir > 0 ? a > edge && a - edge < 8 : b < edge && edge - b < 8) &&
					Math.abs(y - floor[2]) < 1,
			);
			should = next;
		}
	}
	if (
		game.enemies.some(
			(e) =>
				e.active &&
				e.type !== "eel" &&
				e.type !== "bat" &&
				Math.abs(e.y - p.y) < 1.5 &&
				(e.x - p.x) * dir > 0 &&
				Math.abs(e.x - p.x) < 2.3,
		)
	)
		should = true;
	if (should) {
		assistCooldown = 0.65;
		return { ...input, jump: true };
	}
	return input;
}
function resize() {
	if (!renderer) return;
	renderer.setSize(innerWidth, innerHeight);
	art?.resize(innerWidth, innerHeight);
}
function expose() {
	const api = {
		get ready() {
			return diagnostics.ready;
		},
		snapshot() {
			return {
				...game.snapshot(),
				screen: ui.screen,
				attract,
				hub: {
					active: AIHub.active,
					started: hubStarted,
					ended: hubEnded,
					reported: hubReported,
				},
				diagnostics: { ...diagnostics },
				input: ui.input,
				network: {
					active: network.active,
					code: network.code,
					host: network.host,
					sent: network.sent,
					received: network.received,
					roster: [...network.roster.values()],
					ghosts: network.getGhosts(),
				},
			};
		},
		audio,
		game,
		ui,
		network,
		art,
	};
	if (new URLSearchParams(location.search).has("test"))
		api.test = {
			manual(value = true) {
				manual = value;
				acc = 0;
			},
			start() {
				startExpedition();
			},
			step(n, input = {}) {
				for (let i = 0; i < n; i++) game.tick(1 / 60, input);
				ui.update(game.snapshot());
				return api.snapshot();
			},
			idle() {
				lastActivity = performance.now() - 10100;
			},
			attract() {
				startExpedition({ attract: true });
			},
			replay(seconds) {
				updateAttract(seconds);
			},
			title: showTitle,
			report: reportResult,
		};
	window.__below = api;
	AIHub.probe(() => ({
		scene: attract ? "attract" : ui.screen || "caverns",
		menu: ui.screen,
		world: {
			x: game.position.x,
			y: game.position.y,
			score: game.score,
			discoveries: game.rescued,
		},
		input: ui.input,
	}));
}
async function prepareGraphics() {
	const scene = hubInfo ? art.scene : art.titleScene,
		camera = hubInfo ? art.camera : art.titleCamera;
	const prime = async () => {
		diagnostics.stage = "compiling";
		await renderer.compileAsync(scene, camera);
		diagnostics.stage = "first draw";
		await renderer.renderAsync(scene, camera);
	};
	let timer;
	try {
		await Promise.race([
			prime(),
			new Promise((_, reject) => {
				timer = setTimeout(
					() => reject(new Error("Graphics pipeline preparation timed out")),
					10000,
				);
			}),
		]);
	} catch (error) {
		if (!renderer.backend.isWebGPUBackend) throw error;
		diagnostics.recovery =
			"WebGPU pipeline preparation failed; recovered with WebGL 2.";
		try {
			renderer.dispose();
		} catch {}
		const original = $("scene"),
			canvas = original.cloneNode(false);
		original.replaceWith(canvas);
		renderer = new THREE.WebGPURenderer({
			canvas,
			antialias: true,
			alpha: false,
			forceWebGL: true,
		});
		await renderer.init();
		renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1.12;
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFShadowMap;
		diagnostics.backend = "WebGL 2";
		art.renderer = renderer;
		resize();
		await prime();
	} finally {
		clearTimeout(timer);
	}
}
async function boot() {
	const connecting = AIHub.connect({ mode: "ghost", seats: [1, 4] });
	audio = new AudioSystem();
	game = new Game(onEvent);
	diagnostics.stage = "physics";
	await game.init();
	$("load-note").textContent = "Lighting the lanterns. Mind the frogs.";
	renderer = new THREE.WebGPURenderer({
		canvas: $("scene"),
		antialias: true,
		alpha: false,
		powerPreference: "high-performance",
		forceWebGL:
			new URLSearchParams(location.search).get("renderer") === "webgl",
	});
	renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
	diagnostics.stage = "graphics device";
	await renderer.init();
	diagnostics.backend = renderer.backend.isWebGPUBackend ? "WebGPU" : "WebGL 2";
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.12;
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFShadowMap;
	diagnostics.stage = "building scene";
	art = new Art(renderer);
	art.bindGame(game);
	art.snapCamera();
	art.update(0, game.snapshot());
	network = new TrailNetwork(
		() => ui?.updateRoom(),
		() => startExpedition(),
	);
	ui = new UI(game, audio, network, {
		activity: () => activity(),
		start: startExpedition,
		title: showTitle,
		screen: () => {
			keys.clear();
			touchJump = false;
			touchAction = false;
		},
		snap: () => art.snapCamera(),
		zoom: (z) => {
			art.zoom = z;
			resize();
		},
		getZoom: () => art.zoom,
	});
	diagnostics.stage = "joining";
	hubInfo = await connecting;
	if (hubInfo) {
		network.attachHub(hubInfo);
		ui.screen = "hub-wait";
		ui.render();
	}
	if (matchMedia("(pointer:coarse)").matches) ui.setInput("touch");
	resize();
	window.addEventListener("resize", resize);
	AIHub.on("start", () => {
		hubStarted = true;
		startExpedition({ hub: true });
		ui.toast("The trail is open. <b>Good luck down there.</b>", 3);
	});
	AIHub.on("time-up", () => reportResult());
	AIHub.on("end", () => {
		hubEnded = true;
		attract = false;
		keys.clear();
		audio.stop();
		ui.screen = "hub-end";
		ui.render();
	});
	$("load-note").textContent = "The expedition is almost ready.";
	await prepareGraphics();
	setupInput();
	diagnostics.stage = "ready";
	diagnostics.ready = true;
	$("loading").hidden = true;
	lastActivity = performance.now();
	expose();
	if (hubInfo) AIHub.ready();
	let previous = performance.now(),
		hudAcc = 0;
	renderer.setAnimationLoop((now) => {
		const dt = Math.min(0.08, Math.max(0.001, (now - previous) / 1000));
		previous = now;
		diagnostics.frames++;
		pollPad(dt);
		applyAssist();
		const canRun =
			!hubEnded && (!AIHub.active || (hubStarted && AIHub.time() >= 0));
		if (!manual && canRun && ui.screen === "") {
			if (attract) updateAttract(dt);
			else {
				acc += dt;
				const input = assistedInput(getInput(), dt);
				let ticks = 0;
				while (acc >= 1 / 60 && ticks++ < 7) {
					game.tick(1 / 60, input);
					acc -= 1 / 60;
				}
				audio.mode = game.mode;
			}
		}
		if (
			!AIHub.active &&
			ui.screen === "title" &&
			performance.now() - lastActivity >= 10000
		)
			startExpedition({ attract: true });
		const state = game.snapshot();
		netAcc += dt;
		if (
			network.active &&
			!hubEnded &&
			((network.hub && hubStarted) || (!network.hub && network.racing))
		) {
			if (netAcc > 0.1) {
				network.broadcast(state);
				if (AIHub.active && !hubReported)
					AIHub.progress({
						score: state.score,
						label:
							Object.values(state.rescued).filter(Boolean).length +
							"/3 found · " +
							state.gold +
							" gold",
					});
				netAcc = 0;
			}
		}
		art.update(dt, state, ui.screen === "title", network.getGhosts());
		hudAcc += dt;
		if (hudAcc > 0.08) {
			ui.update(state, attract);
			hudAcc = 0;
		}
		art.render(
			ui.screen === "title" || (!hubStarted && ui.screen === "hub-wait"),
		);
	});
}
window.addEventListener("error", (e) => {
	diagnostics.errors.push(e.message);
});
window.addEventListener("unhandledrejection", (e) => {
	diagnostics.errors.push(String(e.reason));
});
boot().catch((error) => {
	diagnostics.errors.push(String(error.stack || error));
	console.error(error);
	AIHub.fail(error.message);
	$("loading").hidden = false;
	$("loading").innerHTML =
		'<div class="loader-compass">✧</div><h2>The lantern needs a little help.</h2><p>This expedition needs WebGPU or WebGL 2 enabled in a modern browser.</p><pre class="fatal-detail"></pre>';
	$("loading").querySelector("pre").textContent = error.message;
});
