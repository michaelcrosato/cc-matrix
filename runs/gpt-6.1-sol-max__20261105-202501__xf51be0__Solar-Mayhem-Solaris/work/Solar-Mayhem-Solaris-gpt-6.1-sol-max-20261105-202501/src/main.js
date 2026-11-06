import { Sound } from "./audio.js";
import { Game, SECTORS } from "./game.js";
import { Graphics } from "./graphics.js";
import { Input } from "./input.js";
import { Network } from "./network.js";
import { UI } from "./ui.js";

async function boot() {
	let stored = {};
	try {
		stored = JSON.parse(localStorage.getItem("solar-mayhem-settings")) ?? {};
	} catch {}
	const settings = {
		music: 0.1,
		sfx: 0.65,
		sensitivity: 1,
		glyphs: "ps",
		shake: true,
		voices: true,
		...stored,
	};
	const ui = new UI(settings),
		sound = new Sound(settings),
		graphics = new Graphics(document.querySelector("#universe"));
	const game = new Game(graphics, sound, {
		screen: (n) => ui.screen(n),
		overlay: (n) => n === null && ui.hide(),
		banner: (...args) => ui.banner(...args),
		radio: (...args) => ui.radio(...args),
		toast: (t) => ui.toast(t),
		hit: () => ui.hit(),
		save: (clear) => ui.save(clear),
		map: () => ui.map(),
		finish: (won) => ui.result(won),
	});
	const network = new Network(game, sound, (t) => ui.networkStatus(t));
	ui.attach(game, network);
	const input = new Input(game, ui);
	ui.input = input;
	window.__solarBoot = () => ({
		graphics: graphics.stage,
		physics: !!game.world,
		hub: network.hubMode,
		error: window.__solarError,
	});
	if (navigator.maxTouchPoints > 0) {
		input.touch = true;
		document.body.classList.add("touch");
	}
	await network.init();
	document.querySelector("#load-detail").textContent = "Inking the spaceways";
	await Promise.all([graphics.init(), game.init()]);
	if (network.hubMode) {
		game.mode = "waiting";
		graphics.mode("fleet");
		ui.screen("waiting");
	} else {
		graphics.mode("title");
		ui.screen("title");
	}
	document.querySelector("#loading").classList.add("hidden");
	input.lastActivity = performance.now();
	network.ready();
	let last = performance.now(),
		accum = 0,
		uiClock = 0,
		manual = false,
		frameCount = 0,
		errors = [];
	function frame(now) {
		requestAnimationFrame(frame);
		const dt = Math.min((now - last) / 1000, 0.15);
		last = now;
		try {
			input.poll();
			network.update(dt);
			sound.update();
			if (!manual) {
				accum += dt;
				const controls = input.read();
				controls.x *= settings.sensitivity;
				controls.y *= settings.sensitivity;
				let steps = 0;
				while (accum >= 1 / 60 && steps++ < 12) {
					game.step(1 / 60, controls);
					accum -= 1 / 60;
				}
				if (steps >= 12) accum = 0;
			}
			graphics.update(dt, {
				speed:
					game.mode === "playing"
						? input.read().boost
							? 24
							: 14
						: game.mode === "warp"
							? 90
							: 10,
				x: game.x,
				y: game.y,
				boost: input.read().boost,
				warp: game.mode === "warp",
				shake: settings.shake,
			});
			graphics.render();
			frameCount++;
			uiClock += dt;
			if (uiClock > 0.05) {
				uiClock = 0;
				ui.update();
			}
		} catch (e) {
			if (!errors.includes(e.message)) {
				errors.push(e.message);
				console.error(e);
			}
			if (network.hubMode && !network.ended) {
				network.hub.fail(e.message);
				network.ended = true;
			}
		}
	}
	requestAnimationFrame(frame);
	addEventListener("pagehide", () => {
		ui.save();
		if (!network.hubMode) network.disconnect();
	});
	document.addEventListener("click", (e) => {
		if (network.hubMode && e.target.closest("a")) e.preventDefault();
	});
	window.__solar = {
		ready: true,
		version: "1.0.0",
		name: "Solar Mayhem",
		state: () => ({
			...game.snapshot(),
			backend: graphics.backend,
			frames: frameCount,
			errors: [...errors],
			input: input.last,
			settings: { ...settings },
			panel: ui.panelName,
			audio: {
				ready: !!sound.ctx,
				state: sound.ctx?.state ?? "unstarted",
				events: sound.events,
				notes: sound.notes,
				voices: sound.voiceCount,
				level: sound.level(),
			},
			network: {
				active: network.active,
				hub: !!network.hubMode,
				sent: network.sent,
				received: network.received,
				peers: network.peers.size,
				ended: network.ended,
				reported: network.reported,
			},
		}),
		manual: (v) => {
			manual = v;
			accum = 0;
		},
		advance: (seconds, controls = null) => {
			const c = {
				x: 0,
				y: 0,
				fire: false,
				boost: false,
				aimX: 0,
				aimY: 0,
				...controls,
			};
			for (let i = 0; i < Math.round(seconds * 60); i++) game.step(1 / 60, c);
			ui.update();
			return game.snapshot();
		},
		start: (options) => game.start(options),
		title: () => game.title(),
		autopilot: (v) => {
			game.autopilot = v;
		},
		god: (v) => {
			game.god = v;
		},
		encounter: (i) => {
			game.unlocked = 5;
			game.enter(i);
			ui.hide();
			ui.screen("flight");
		},
		damage: (n) => {
			game.invincible = 0;
			game.damage(n);
		},
		pulse: () => game.pulse(),
		roll: () => game.roll(),
		spawn: (kind, x, y, z) => game.enemy(kind, x, y, z, false).id,
		supplies: () => {
			game.health = 100;
			game.fuel = 100;
			game.lives = 4;
		},
		set: (key, value) => {
			if (
				["x", "y", "health", "fuel", "lives", "invincible", "key"].includes(key)
			)
				game[key] = value;
		},
		tune: (key, value) => {
			if (Object.hasOwn(game.tuning, key)) game.tuning[key] = value;
		},
		idle: () => {
			input.lastActivity = performance.now() - 10001;
			ui.update();
		},
		audio: () => sound.start(),
		local: (room, host) => network.local(room, host),
		launch: () => network.launch(),
		rtc: async (host, code) => network.rtc(host, code),
		answer: async (code) => network.answer(code),
		disconnect: () => network.disconnect(),
		save: () => ui.save(),
		about: (tab) => ui.about(tab),
		snapshot: () => game.serial(),
		render: () => graphics.render(),
		sectors: SECTORS.map((s) => s.name),
	};
}
boot().catch((e) => {
	console.error(e);
	const detail = document.querySelector("#load-detail");
	detail.textContent = `Flight systems could not start: ${e.message}`;
	window.__solarError = e.message;
	if (window.AIHub?.active) window.AIHub.fail(e.message);
});
