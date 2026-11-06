import { DEFAULT_TUNING, PALETTES, STAGES } from "../content/stages.js";
import identity from "../identity.json";
import interview from "../interview.json";
import { installDev } from "./dev/tools.js";
import { ACTIONS, prompt, readAction } from "./input/actions.js";
import { DirectPeer } from "./net/peer.js";
import { Authority, pack, unpack } from "./net/protocol.js";
import { GardenAudio, syllable } from "./presentation/audio.js";
import { Garden } from "./presentation/garden.js";
import { pilot } from "./sim/bot.js";
import {
	clamp,
	clone,
	enterStage,
	footprint,
	leave,
	moveCircle,
	newWorld,
	restartCampaign,
	retry,
	step,
	validateStages,
} from "./sim/world.js";

export async function boot(E = globalThis.My3D2dge) {
	const hub = globalThis.AIHub,
		info = hub
			? await hub.connect({ mode: "shared-world", seats: [1, 2] })
			: null;
	const app = {
		game: null,
		ui: null,
		garden: null,
		audio: null,
		world: null,
		display: null,
		mode: info ? "hub" : "solo",
		info,
		host: info ? info.isHost : true,
		local: info
			? info.server
				? -1
				: info.players.findIndex((p) => p.id === info.me)
			: 0,
		net: null,
		peer: null,
		idle: 0,
		attract: false,
		demoPart: 0,
		demoClock: 0,
		finished: false,
		ended: false,
		hubStart: false,
		rayCounters: [0, 0],
		injected: new Map(),
		pending: [],
		devOpen: false,
		inputGate: 0,
		serverTimer: null,
		names: info?.players?.map((p) => p.name) || [],
		lastPhase: null,
		lastStage: -1,
		bestSaved: false,
		peerStatus: "",
		peerInput: "",
		peerOutput: "",
		titleMenu: null,
		runMenu: null,
	};
	app.isNetwork = () => app.mode === "hub" || app.mode === "peer";
	app.readOnly = () => app.mode === "hub" || (app.mode === "peer" && !app.host);
	app.clearInput = () => {
		for (const I of app.game.players) I.clear();
		app.inputGate = 0.16;
		app.injected.clear();
	};
	const menu = {
		quit: info ? false : "title",
		settings: [
			{ key: "music", value: 0.1 },
			{ key: "glyphs", value: "playstation" },
			{ key: "scale", value: "fill" },
			{
				key: "voice",
				label: "Garden chatter",
				group: "Sound",
				type: "slider",
				value: 0.7,
				apply: (g, v) => {
					g.audio.voiceVolume = v;
					g.audio.applyVolume();
				},
			},
		],
		controls: {
			ray: "Horizontal ray",
			focus: "Hold Focus",
			steer: "Hold cursor steering",
		},
		items: () =>
			app.mode === "hub"
				? [
						["Diagnostics", () => app.openDev()],
						["About / Credits", () => openAbout()],
					]
				: [
						[
							"Retry this encounter",
							() => {
								if (app.readOnly()) return;
								retry(app.world);
								app.bestSaved = false;
								app.lastPhase = null;
								app.ui.hide();
								app.clearInput();
							},
						],
						["Developer tools", () => app.openDev()],
						["About / Credits", () => openAbout()],
					],
	};
	const game = new E.Game({
		canvas: "screen",
		headless: !!info?.server,
		loop: !info?.server,
		res: [480, 320],
		portrait: { res: [320, 540] },
		expand: true,
		view: "overhead",
		views: ["overhead"],
		input: ACTIONS,
		id: "killer-bee-yond-midnight-v1",
		bg: "#0c1922",
		fullscreen: "button",
		autoPause: !info,
		live: !!info,
		menu,
		camera: { zoom: false },
	});
	app.game = game;
	if (info?.server) game.input.pad = null;
	game.fadeTime = 0;
	game.cam.smooth = 0;
	game.lights.enabled = false;
	const ui = new E.Shell(game, {
		tv: true,
		theme: {
			ink: "#f5e9cb",
			paper: "#12232bf5",
			accent: "#eed195",
			muted: "#b9c7b8",
			line: "#68867c66",
			font: "system-ui, sans-serif",
			titleFont: "Georgia, serif",
		},
		screens: {
			pause: {
				kicker: identity.title,
				text: () =>
					app.isNetwork()
						? "The shared garden keeps moving while this menu is open."
						: `${STAGES[app.world?.stage || 0].name}\nGoal: finish every gardener. A kill recharges one ray.`,
			},
			help: {
				title: "Twelve bees. One big night.",
				sections: [
					[
						"Sting",
						"Fly over a clockwork gardener and stay with it. Break away too long and its shell recovers.",
					],
					[
						"Focus",
						"Hold Focus to squeeze through gaps and finish a sting faster. Release it to escape.",
					],
					[
						"Ray",
						"Fire left and right across your row. Only rival swarms are zapped. Every gardener kill recharges one empty ray.",
					],
					[
						"Survive",
						"Rivals grow from scouts to guards to hunters. Each contact costs individual bees. Clear a bed to return to twelve.",
					],
					[
						"Together",
						"Gold is player 1; mint is player 2. A fallen teammate watches until the next bed. Team score comes first.",
					],
				],
			},
		},
	});
	app.ui = ui;
	app.garden = info?.server ? null : new Garden(E, game);
	app.audio = new GardenAudio(game, !!info?.server);
	installDev(app);
	app.applyPending = () => {
		const changes = app.pending.splice(0);
		for (const fn of changes) fn();
	};
	const preview = newWorld({ seed: 733 });
	preview.players = [];
	preview.targets = [];
	preview.queue = [];
	const botMemory = [{}, {}];
	function cleanShell() {
		ui.hide();
		app.closeDev();
		game.timeScale = 1;
		game.live = app.isNetwork();
		game.resume();
		app.clearInput();
	}
	function title() {
		if (app.mode === "hub") return;
		app.net?.stop();
		app.net = null;
		app.peer?.close(false);
		app.peer = null;
		app.mode = "solo";
		app.host = true;
		app.local = 0;
		app.finished = false;
		app.ended = false;
		app.attract = false;
		app.idle = 0;
		app.lastPhase = null;
		game.live = false;
		game.o.autoPause = true;
		game.o.menu.quit = "title";
		game.allowJoin(false);
		while (game.players.length > 1) game.removePlayer(game.players.at(-1));
		game.input.pad = "any";
		game.input.use(ACTIONS);
		cleanShell();
		app.audio.stop();
		app.audio.start();
		game.go("title");
	}
	function makeMenu(items, onPick, y = "center") {
		return new E.Menu(game, items, {
			scale: 2,
			rows: 5,
			x: "center",
			y,
			box: false,
			bg: "#152932",
			color: "#ced8c5",
			pick: "#f4d99b",
			onPick,
			onCancel: title,
		});
	}
	function startRun(mode = "solo", players = 1, seed = 4117) {
		if (info) return;
		if (mode !== "peer") {
			app.net?.stop();
			app.net = null;
			app.peer?.close(false);
			app.peer = null;
		}
		app.mode = mode;
		app.host = true;
		app.local = 0;
		app.attract = false;
		app.finished = false;
		app.ended = false;
		app.bestSaved = false;
		app.lastPhase = null;
		app.lastStage = -1;
		app.rayCounters = [0, 0];
		app.world = newWorld({ players, seed });
		app.display = null;
		app.garden?.reset(app.world);
		app.audio.reset(app.world);
		game.live = app.isNetwork();
		game.o.autoPause = !app.isNetwork();
		cleanShell();
		game.go("run");
	}
	function couch() {
		game.allowJoin(false);
		let pads = [];
		try {
			pads = Array.from(navigator.getGamepads?.() || []).filter(
				(p) => p?.connected,
			);
		} catch {}
		while (game.players.length > 1) game.removePlayer(game.players.at(-1));
		game.input.use(ACTIONS);
		if (pads.length >= 2) {
			game.input.pad = pads[0].index;
			game.addPlayer({ pad: pads[1].index });
		} else if (pads.length === 1) {
			game.input.pad = null;
			game.addPlayer({ pad: pads[0].index });
		} else {
			game.input.pad = null;
			game.addPlayer({ keys: "right" });
		}
		game.allowJoin(false);
		startRun("couch", 2);
	}
	function coOp() {
		if (info) return;
		app.idle = 0;
		app.attract = false;
		app.titleMenu = makeMenu(
			["Couch co-op", "Direct peer co-op", "Back"],
			(i) => {
				if (i === 0) couch();
				else if (i === 1) peerMenu();
				else title();
			},
		);
		game.allowJoin({
			max: 2,
			onJoin: () => {
				if (game.sceneName === "coop") {
					game.allowJoin(false);
					startRun("couch", 2);
				}
			},
		});
		cleanShell();
		game.go("coop");
	}
	function openAbout() {
		app.idle = 0;
		const chunks = Object.entries(interview.sourceInformation),
			pages = [chunks.slice(0, 5), chunks.slice(5, 10), chunks.slice(10)];
		ui.show("about", {
			kicker: "An original garden emergency",
			title: identity.title,
			text: "Inspired by Killer Bees! (1983), by Bob Harris.\nBuilt on my-3D2dge v0.89.1 (MIT). Original game code, artwork, music and chatter generated for this build.",
			actions: [
				...pages.map((entries, i) => [
					`Source Information ${i + 1}/3`,
					() =>
						ui.show("source", {
							title: `Source Information ${i + 1}/3`,
							sections: entries.map(([k, v]) => [k, v]),
							actions: [["Back", () => ui.back()]],
						}),
				]),
				...["testingFeedback", "engineFeedback", "promptFeedback"].map(
					(key, i) => [
						["Testing Feedback", "Engine Feedback", "Prompt Feedback"][i],
						() =>
							ui.show("feedback", {
								title: [
									"Testing Feedback",
									"Engine Feedback",
									"Prompt Feedback",
								][i],
								sections: interview[key].map((answer, j) => [
									feedbackQuestions[key][j],
									answer,
								]),
								actions: [["Back", () => ui.back()]],
							}),
					],
				),
				["Back", () => ui.back()],
			],
		});
	}
	const feedbackQuestions = {
		testingFeedback: [
			"Issues found",
			"Critical / game breaking",
			"Most helpful test",
			"Least helpful test",
		],
		engineFeedback: [
			"Liked most",
			"Got stuck or guessed wrong",
			"Built ourselves",
			"Hardest engine task",
			"Engine changes",
			"One requested change",
		],
		promptFeedback: [
			"Liked most",
			"Confusing",
			"Hardest task",
			"Suggested change",
		],
	};
	function peerMenu() {
		if (app.mode === "hub") return;
		game.allowJoin(false);
		app.peer?.close(false);
		app.peer = new DirectPeer({
			onOpen: (role) => openPeerWorld(role),
			onMessage: (m) => {
				if (m.t === "end") {
					app.finished = true;
					app.net?.stop();
					if (app.world) {
						app.world.phase = m.won ? "ending" : "failed";
						app.world.score = m.score;
						app.display = clone(app.world);
						app.lastPhase = null;
					}
					return;
				}
				app.net?.receive(m, app.host ? 1 : 0, game.real, app.world);
			},
			onClose: () => {
				if (app.mode === "peer" && !app.finished) {
					app.net?.stop();
					app.net = null;
					app.audio.stop();
					app.peerStatus = "Connection lost. The round stopped safely.";
					ui.show("disconnected", {
						title: "The garden lost a swarm",
						text: app.peerStatus,
						actions: [
							[
								"Reconnect",
								() => {
									title();
									peerMenu();
								},
							],
							["Title", title],
						],
					});
				}
			},
			onStatus: (text) => {
				app.peerStatus = text;
				const el = ui.root?.querySelector(".peer-status");
				if (el) el.textContent = text;
			},
		});
		app.peerInput = "";
		app.peerOutput = "";
		app.peerStatus = "Choose host or guest.";
		showPeer("choose");
	}
	function showPeer(screen) {
		const fail = (e) => {
			app.peerStatus = e.message || String(e);
			showPeer(screen);
		};
		const copy = async () => {
			try {
				await navigator.clipboard.writeText(app.peerOutput);
				app.peerStatus = "Copied. Return the complete code to your partner.";
			} catch {
				const ta = ui.root?.querySelector("[data-peer=output]");
				ta?.focus();
				ta?.select();
				app.peerStatus =
					"Copy is restricted here. The code is selected; use your browser’s Copy command.";
			}
			const el = ui.root?.querySelector(".peer-status");
			if (el) el.textContent = app.peerStatus;
		};
		const paste = async () => {
			try {
				app.peerInput = await navigator.clipboard.readText();
				const ta = ui.root?.querySelector("[data-peer=input]");
				if (ta) ta.value = app.peerInput;
			} catch {
				const ta = ui.root?.querySelector("[data-peer=input]");
				ta?.focus();
				app.peerStatus =
					"Paste is restricted here. Paste directly into the code box.";
				const el = ui.root?.querySelector(".peer-status");
				if (el) el.textContent = app.peerStatus;
			}
		};
		const cancel = () => {
			app.peer?.close(false);
			app.peer = null;
			ui.hide();
			coOp();
		};
		const host = async () => {
			app.peerStatus = "Gathering local connection details…";
			showPeer("host");
			try {
				app.peerOutput = await app.peer.offer();
				showPeer("host");
			} catch (e) {
				fail(e);
			}
		};
		const answer = async () => {
			try {
				app.peerOutput = await app.peer.answer(app.peerInput);
				showPeer("guest-answer");
			} catch (e) {
				fail(e);
			}
		};
		const acts =
			screen === "choose"
				? [
						["Host a garden", host],
						["Join a garden", () => showPeer("guest")],
						["Cancel", cancel],
					]
				: screen === "host"
					? [
							["Copy offer", copy],
							["Paste answer", paste],
							[
								"Connect with answer",
								async () => {
									try {
										await app.peer.accept(app.peerInput);
									} catch (e) {
										fail(e);
									}
								},
							],
							["Make a new offer", host],
							["Cancel", cancel],
						]
					: screen === "guest"
						? [
								["Paste offer", paste],
								["Make answer", answer],
								["Cancel", cancel],
							]
						: [
								["Copy answer", copy],
								[
									"Start over",
									() => {
										app.peer?.close(false);
										peerMenu();
									},
								],
								["Cancel", cancel],
							];
		ui.show("peer", {
			kicker: "Standalone / two players",
			title:
				screen === "choose"
					? "A garden for two"
					: screen === "host"
						? "1. Offer → 2. Answer"
						: screen === "guest"
							? "Paste the host’s offer"
							: "Return this answer",
			text:
				screen === "choose"
					? "Exchange connection codes with someone you already know. Both players share one garden."
					: screen === "host"
						? "Send your offer to the guest. Paste their answer below, then Connect."
						: screen === "guest"
							? "Paste the complete offer, then make an answer."
							: "Send this answer back to the host. Play begins automatically when the channel opens.",
			actions: acts,
			back: cancel,
		});
		if (ui.root) {
			const box = ui.root.querySelector(".esh-mod"),
				buttons = box?.querySelector(".esh-btns");
			if (!box) return;
			const status = document.createElement("p");
			status.className = "peer-note peer-status";
			status.textContent = app.peerStatus;
			box.insertBefore(status, buttons);
			if (screen !== "choose") {
				if (app.peerOutput) {
					const ta = document.createElement("textarea");
					ta.dataset.peer = "output";
					ta.value = app.peerOutput;
					ta.readOnly = true;
					ta.setAttribute(
						"aria-label",
						screen === "host" ? "Offer code" : "Answer code",
					);
					ta.onfocus = () => ta.select();
					box.insertBefore(ta, buttons);
				}
				if (screen !== "guest-answer") {
					const ta = document.createElement("textarea");
					ta.dataset.peer = "input";
					ta.placeholder =
						screen === "host"
							? "Paste the BEE1 answer code"
							: "Paste the BEE1 offer code";
					ta.value = app.peerInput;
					ta.maxLength = 65000;
					ta.setAttribute(
						"aria-label",
						screen === "host" ? "Paste answer" : "Paste offer",
					);
					ta.oninput = () => {
						app.peerInput = ta.value;
					};
					box.insertBefore(ta, buttons);
				}
			}
			const note = document.createElement("p");
			note.className = "peer-note";
			note.textContent =
				"Direct connection is verified between browsers on this machine. LAN connectivity depends on your network. No public matchmaking or TURN relay is provided; arbitrary Internet connections are not guaranteed.";
			box.append(note);
		}
	}
	function openPeerWorld(role) {
		app.mode = "peer";
		app.host = role === "host";
		app.local = app.host ? 0 : 1;
		app.finished = false;
		app.ended = false;
		app.rayCounters = [0, 0];
		app.world = newWorld({ players: 2, seed: 4117 });
		app.display = null;
		app.lastPhase = null;
		app.lastStage = -1;
		app.net = new Authority({
			host: app.host,
			local: app.local,
			send: (m) => app.peer?.send(m),
			onSnapshot: receiveSnapshot,
		});
		game.live = true;
		game.o.autoPause = false;
		game.o.menu.quit = "title";
		app.garden?.reset(app.world);
		app.audio.reset(app.world);
		cleanShell();
		game.go("run");
	}
	function receiveSnapshot(packet) {
		const previous = app.world?.stage,
			phase = app.world?.phase;
		app.world = unpack(packet, app.world);
		if (!app.world) return;
		if (
			!app.display ||
			previous !== app.world.stage ||
			phase !== app.world.phase
		)
			app.display = clone(app.world);
		if (app.lastPhase === "failed" && app.world.phase === "play") {
			ui.hide();
			app.clearInput();
		}
	}
	function interpolate(dt, command) {
		const s = app.world;
		if (!app.display || app.display.stage !== s.stage) {
			app.display = clone(s);
			return app.display;
		}
		const display = app.display,
			oldPlayers = display.players,
			oldTargets = display.targets,
			oldRivals = display.rivals;
		Object.assign(display, clone(s));
		const smooth = (old, list, prediction = false) =>
			list.map((p) => {
				const was = old.find((a) => a.id === p.id);
				if (!was || Math.hypot(was.x - p.x, was.y - p.y) > 70) return p;
				const out = { ...p },
					rate = Math.min(1, dt * 16);
				if (prediction && p.id === app.local && p.bees && s.phase === "play") {
					const predicted = { ...was };
					moveCircle(
						s,
						predicted,
						command.x *
							s.tuning.speed *
							(command.focus ? s.tuning.focusMove : 1),
						command.y *
							s.tuning.speed *
							(command.focus ? s.tuning.focusMove : 1),
						dt,
						footprint(p),
					);
					out.x = predicted.x + (p.x - predicted.x) * Math.min(1, dt * 6);
					out.y = predicted.y + (p.y - predicted.y) * Math.min(1, dt * 6);
				} else {
					out.x = was.x + (p.x - was.x) * rate;
					out.y = was.y + (p.y - was.y) * rate;
				}
				return out;
			});
		display.players = smooth(oldPlayers, display.players, true);
		display.targets = smooth(oldTargets, display.targets);
		display.rivals = smooth(oldRivals, display.rivals);
		return display;
	}
	function finishHub(won) {
		if (!info || !app.host || app.finished || app.ended) return;
		app.finished = true;
		const ids = info.players
				.filter((p, i) => app.world.players[i]?.joined)
				.map((p) => p.id),
			scores = Object.fromEntries(ids.map((id) => [id, app.world.score]));
		hub.finish({ standings: ids.length ? [ids] : [], scores, won: !!won });
	}
	function saveBest() {
		if (app.attract || app.bestSaved || app.mode === "hub") return;
		app.bestSaved = true;
		const key = app.world.assisted ? "best:assisted" : "best:clean",
			old = E.store.get(key, 0);
		if (app.world.score > old) E.store.set(key, app.world.score);
	}
	function setPhaseUI() {
		const s = app.world;
		if (app.lastPhase === s.phase && app.lastStage === s.stage) return;
		const previous = app.lastPhase;
		app.lastPhase = s.phase;
		app.lastStage = s.stage;
		app.runMenu = null;
		app.clearInput();
		if (previous === "result" || previous === "failed") ui.hide();
		if (s.phase === "failed") {
			saveBest();
			if (app.mode === "hub") {
				finishHub(false);
				return;
			}
			if (app.mode === "peer" && !app.host) return;
			app.runMenu = makeMenu(
				["Retry encounter", "Restart campaign", "Title"],
				(i) => {
					if (i === 0) {
						retry(s);
						app.bestSaved = false;
						app.lastPhase = null;
						app.audio.reset(s);
						app.garden?.reset(s);
						app.clearInput();
					} else if (i === 1) {
						if (app.mode === "peer") {
							restartCampaign(s);
							app.bestSaved = false;
							app.lastPhase = null;
							app.garden?.reset(s);
							app.audio.reset(s);
							app.clearInput();
						} else startRun(app.mode, s.players.length);
					} else {
						if (app.mode === "peer")
							app.peer
								?.finish({ t: "end", won: false, score: s.score })
								.then(title);
						else title();
					}
				},
				Math.round(game.H / 2 + 13),
			);
		}
		if (s.phase === "ending") {
			saveBest();
			if (app.mode === "hub") {
				finishHub(true);
				return;
			}
			if (app.mode === "peer" && app.host) {
				app.finished = true;
				app.peer?.finish({ t: "end", won: true, score: s.score });
			}
			app.runMenu = makeMenu(
				["Play again", "Title"],
				(i) => {
					if (i !== 0) {
						title();
						return;
					}
					if (app.mode === "peer") {
						title();
						peerMenu();
					} else startRun(app.mode, s.players.length);
				},
				Math.round(game.H / 2 + 34),
			);
		}
	}
	function actionFor(id) {
		const p = app.world.players[id],
			I = app.mode === "couch" ? game.players[id] : game.input;
		if (!p) return { x: 0, y: 0, focus: false, ray: 0 };
		let c;
		if (app.injected.has(id))
			c = {
				...app.injected.get(id),
				ray: app.injected.get(id).ray ?? p.lastRay,
			};
		else if (!I || app.inputGate > 0 || game.paused)
			c = { x: 0, y: 0, focus: false, ray: app.rayCounters[id] || p.lastRay };
		else c = readAction(game, I, p, app.rayCounters[id] || 0);
		app.rayCounters[id] = c.ray;
		return c;
	}
	function runUpdate(dt) {
		if (app.ended || !app.world) return;
		const s = app.world;
		if (app.mode === "peer" && !app.net) {
			app.garden?.update(dt, app.display || s);
			return;
		}
		if (app.mode === "hub" && (!app.hubStart || hub.time() < 0)) {
			app.clearInput();
			app.garden?.update(dt, s);
			return;
		}
		app.inputGate = Math.max(0, app.inputGate - dt);
		app.applyPending();
		const local = app.isNetwork()
			? app.local < 0
				? { x: 0, y: 0, focus: false, ray: 0 }
				: actionFor(app.local)
			: { x: 0, y: 0, focus: false, ray: 0 };
		if (app.isNetwork()) {
			if (app.host) {
				step(s, app.net.commands(s, local, game.real), dt);
				app.net.update(s, local, game.real);
			} else app.net.update(s, local, game.real);
		} else {
			step(
				s,
				s.players.map((p) => actionFor(p.id)),
				dt,
			);
		}
		if (s.phase === "ending" && app.mode === "hub") finishHub(true);
		if (s.phase === "failed" && app.mode === "hub") finishHub(false);
		setPhaseUI();
		const shown = app.isNetwork() && !app.host ? interpolate(dt, local) : s;
		app.garden?.update(dt, shown);
		app.audio.update(s);
		const p = s.players[app.local] || s.players[0];
		game.input.touchSet(
			"ray",
			"RAY",
			!!p?.bees && !!p?.charge && s.phase === "play",
		);
		if (app.runMenu && app.inputGate <= 0 && !ui.screen) app.runMenu.update(dt);
	}
	function runDraw(r) {
		const s = app.display && !app.host ? app.display : app.world;
		if (!s) return;
		app.garden.draw(r, s, { prompt: prompt(game), names: app.names });
		if (app.mode === "hub" && (!app.hubStart || hub.time() < 0))
			message(
				r,
				"THE GARDEN IS READY",
				"Twelve tiny wings. One very big night.",
				`${hub.time() === -Infinity ? "WAITING FOR THE HUB" : Math.ceil(-hub.time() / 1000)}`,
			);
		else if (s.phase === "result")
			message(
				r,
				s.result?.perfect ? "TWELVE OUT OF TWELVE!" : "BED PUT TO BED",
				`${s.result?.survivors || 0} bees home  •  +${s.result?.bonus || 0} survival bonus`,
				`Next bed in ${Math.max(1, Math.ceil(4 - s.phaseT))}`,
			);
		else if (s.phase === "failed")
			message(
				r,
				"A BUZZ TOO FAR",
				`Team score ${s.score}  •  The last bee needs a breather.`,
				app.mode === "peer" && !app.host ? "HOST CHOOSES THE RETRY" : "",
			);
		else if (s.phase === "ending") {
			message(
				r,
				"THE NIGHT IS YOURS",
				`The Bellwether sleeps. The moonflowers bloom.`,
				`TEAM ${s.score}  •  ${s.assisted ? "ASSISTED RUN" : "CLEAN RUN"}`,
			);
			r.overlay((ctx) => {
				const portrait = app.garden.rect.portrait;
				for (const p of s.players)
					for (let i = 0; i < p.bees; i++) {
						const a = game.time * 0.6 + i * 2.399,
							rr = 8 + Math.sqrt(i) * 3,
							x = portrait ? r.W / 2 + (p.id ? 48 : -48) : p.id ? r.W - 29 : 29,
							y = portrait ? r.H / 2 - 116 : r.H / 2;
						app.garden.rigs.bee(
							ctx,
							x + Math.cos(a) * rr,
							y + Math.sin(a) * rr,
							0.8 + a,
							0.9,
							game.time + i,
							p.id
								? { body: "#b9decf", light: "#effff0", dark: "#3a6460" }
								: {},
						);
					}
			});
		}
		app.runMenu?.draw(r);
	}
	function message(r, titleText, body, footer) {
		const { px, font } = E;
		r.overlay((ctx) => {
			const w = Math.min(r.W - 28, 440),
				h =
					app.world?.phase === "ending" || app.world?.phase === "failed"
						? 180
						: 90,
				x = (r.W - w) / 2,
				y = r.H / 2 - h / 2;
			px.blend(ctx, 0.94, "normal", () => px.rect(ctx, x, y, w, h, "#10222b"));
			px.rect(ctx, x, y, w, 1, "#b4a475");
			px.rect(ctx, x, y + h, w, 1, "#52695e");
			font.title(ctx, titleText, r.W / 2, y + 14, {
				scale: r.W < 380 ? 2 : 3,
				align: "center",
				colors: ["#fff1c8", "#edc885", "#bf955e"],
				depth: 1,
			});
			const lines = font.wrap(body, w - 24, { scale: 1 });
			font.text(ctx, lines.join("\n"), r.W / 2, y + 45, "#ced9bd", {
				align: "center",
				outline: false,
			});
			font.text(ctx, footer, r.W / 2, y + 64, "#f0dca9", {
				align: "center",
				outline: false,
			});
		});
	}
	const thisBee = (ctx, x, y, size, angle, time) =>
		app.garden.rigs.bee(ctx, x, y, angle, size, time);
	function layoutTitleMenu() {
		const W = game.W,
			H = game.H,
			portrait = H > W * 1.15,
			m = app.titleMenu;
		if (m) {
			m.x = portrait ? Math.round(W / 2 - 116) : Math.round(W * 0.29 - 116);
			m.y = portrait ? Math.round(H * 0.47) : Math.round(H * 0.55);
		}
	}
	function titleDraw(r, coop = false) {
		app.garden.draw(r, preview, { hud: false });
		const { px, font } = E,
			W = r.W,
			H = r.H,
			portrait = H > W * 1.15;
		r.overlay((ctx) => {
			px.blend(ctx, 0.92, "normal", () =>
				px.rect(ctx, 0, 0, portrait ? W : W * 0.57, H, "#0c1a24"),
			);
			const x = portrait ? W / 2 : W * 0.29,
				top = portrait ? 44 : 26;
			font.text(
				ctx,
				coop ? "TWO SWARMS. SAME BIG NIGHT." : "A MOONLIT SWARM CAPER",
				x,
				top,
				"#b8c7ae",
				{ align: "center", outline: false },
			);
			font.title(ctx, "KILLER", x, top + 19, {
				scale: 3,
				align: "center",
				colors: ["#f9ebc4", "#d4b37e"],
				depth: 1,
			});
			font.title(ctx, "BEE-YOND", x, top + 48, {
				scale: portrait ? 4 : 5,
				align: "center",
				colors: ["#fff3cc", "#e8c98b", "#c1975e"],
				depth: 2,
			});
			font.title(ctx, "MIDNIGHT", x, top + 88, {
				scale: portrait ? 4 : 5,
				align: "center",
				colors: ["#d8ecdb", "#a8cabd", "#6f9b94"],
				depth: 2,
			});
			const yy = portrait ? H - 64 : H - 31;
			font.text(
				ctx,
				coop
					? "Couch: two pads, keyboard + pad, or shared keys."
					: "Tiny wings. Big night.",
				x,
				top + 135,
				"#c7d3b9",
				{ align: "center", outline: false },
			);
			font.text(
				ctx,
				`BEST ${String(E.store.get("best:clean", 0)).padStart(6, "0")}`,
				x,
				yy,
				"#c1b68d",
				{ align: "center", outline: false },
			);
			font.text(
				ctx,
				game.input.lastDevice === "gamepad"
					? `${game.input.label("confirm")} SELECT   ${game.input.label("cancel")} BACK`
					: "ARROWS + ENTER   •   CLICK TO CHOOSE",
				x,
				yy + 13,
				"#879f9d",
				{ align: "center", outline: false },
			);
			if (!portrait) {
				const cx = W * 0.78,
					cy = H * 0.43;
				px.disc(ctx, cx, cy - 17, 62, "#223b41");
				px.disc(ctx, cx - 5, cy - 23, 56, "#b9c6a4");
				px.disc(ctx, cx + 12, cy - 31, 51, "#19333c");
				for (let i = 0; i < 7; i++) {
					const a = i * 2.399 + game.time * 0.14;
					const rr = 34 + i * 3;
					thisBee(
						ctx,
						cx + Math.cos(a) * rr,
						cy + Math.sin(a) * rr * 0.63,
						1.8,
						a + 0.8,
						game.time + i,
					);
				}
				thisBee(
					ctx,
					cx,
					cy,
					-0.1 + 4.2,
					-0.45 + Math.sin(game.time * 0.6) * 0.12,
					game.time,
				);
				font.text(ctx, "THE GARDEN CAN WAIT.", cx, H - 71, "#a5bbb1", {
					align: "center",
					outline: false,
				});
				font.text(ctx, "THE GARDENERS CANNOT.", cx, H - 58, "#edcf96", {
					align: "center",
					outline: false,
				});
			}
		});
		app.titleMenu?.draw(r);
	}
	function activity() {
		if (info) return;
		app.idle = 0;
		if (app.attract) {
			app.attract = false;
			app.world = null;
			app.inputGate = 0.2;
			game.input.clear();
			title();
		}
	}
	function startAttract() {
		if (info || ui.screen || app.peer) return;
		app.attract = true;
		app.demoPart = 0;
		app.demoClock = 0;
		app.rayCounters = [0, 0];
		app.world = newWorld({ players: 2, seed: 731, stage: 0 });
		app.world.dev.invulnerable = true;
		app.world.tuning.maturation = 0.5;
		app.garden.reset(app.world);
		app.audio.reset(app.world);
		app.lastPhase = null;
		game.go("attract");
	}
	function demoUpdate(dt) {
		if (!app.attract) return;
		if (
			game.input.anyPressed() ||
			Math.hypot(...game.input.move()) > 0.23 ||
			game.input.clicked()
		) {
			activity();
			return;
		}
		app.demoClock += dt;
		const s = app.world;
		step(
			s,
			s.players.map((p, i) => pilot(s, p, botMemory[i])),
			dt,
		);
		if (app.demoClock > 22) {
			app.demoClock = 0;
			app.demoPart = (app.demoPart + 1) % 4;
			enterStage(s, [0, 2, 3, 5][app.demoPart]);
			s.dev.invulnerable = true;
		}
		app.garden.update(dt, s);
		app.audio.update(s, true);
	}
	const scenes = {
		title: {
			view: "overhead",
			pausable: false,
			camera: { zoom: false },
			touch: [],
			enter() {
				document.body.dataset.mode = "title";
				app.attract = false;
				app.idle = 0;
				app.titleMenu = makeMenu(
					["Play", "Co-op", "Settings", "About / Credits"],
					(i) => {
						if (i === 0) startRun();
						else if (i === 1) coOp();
						else if (i === 2) game.menu("settings");
						else openAbout();
					},
				);
				app.clearInput();
			},
			update(dt) {
				preview.time += dt;
				app.garden?.fit();
				layoutTitleMenu();
				if (ui.screen) {
					app.idle = 0;
					return;
				}
				if (app.inputGate > 0) {
					app.inputGate -= dt;
					game.input.consumeAll();
					return;
				}
				if (game.input.anyPressed() || Math.hypot(...game.input.move()) > 0.23)
					app.idle = 0;
				else app.idle += dt;
				if (app.idle >= 10) {
					startAttract();
					return;
				}
				app.titleMenu?.update(dt);
			},
			draw: (r) => titleDraw(r),
		},
		coop: {
			view: "overhead",
			pausable: false,
			touch: [],
			enter() {
				document.body.dataset.mode = "title";
				app.clearInput();
			},
			update(dt) {
				preview.time += dt;
				app.garden.fit();
				layoutTitleMenu();
				if (ui.screen) return;
				if (app.inputGate > 0) {
					app.inputGate -= dt;
					game.input.consumeAll();
					return;
				}
				app.titleMenu?.update(dt);
			},
			draw: (r) => titleDraw(r, true),
			back() {
				title();
				return true;
			},
		},
		run: {
			view: "overhead",
			pausable: true,
			camera: { zoom: false },
			touch: ["ray"],
			enter() {
				document.body.dataset.mode = "play";
				game.input.steer = "drag";
				game.input.zones = [
					{ x0: 0.56, y0: 0.12, x1: 1, y1: 0.84, act: "focus" },
				];
				app.garden?.fit();
				app.clearInput();
			},
			exit() {
				game.input.zones = null;
				game.input.steer = "stick";
				game.timeScale = 1;
				app.audio.stop();
			},
			update: runUpdate,
			draw: runDraw,
			back() {
				game.pause("player");
				return true;
			},
		},
		attract: {
			view: "overhead",
			pausable: false,
			camera: { zoom: false },
			touch: [],
			enter() {
				document.body.dataset.mode = "play";
				app.clearInput();
			},
			update: demoUpdate,
			draw(r) {
				app.garden.draw(r, app.world, { demo: true });
			},
		},
	};
	if (info) {
		app.world = newWorld({ players: info.players.length, seed: info.seed });
		app.net = new Authority({
			host: app.host,
			local: app.local,
			send: (m, opts) =>
				hub.send(m, app.host ? opts : { ...opts, to: info.host }),
			onSnapshot: receiveSnapshot,
		});
		hub.on("message", (m, from) => {
			if (app.ended) return;
			const index = info.players.findIndex((p) => p.id === from);
			if (app.host) {
				app.net.receive(m, index, game.real, app.world);
			} else if (from === info.host)
				app.net.receive(m, 0, game.real, app.world);
		});
		hub.on("start", () => {
			app.hubStart = true;
			app.clearInput();
		});
		hub.on("leave", ({ id }) => {
			const index = info.players.findIndex((p) => p.id === id);
			if (app.host && index >= 0) {
				leave(app.world, index);
				app.net.neutralize(index);
			}
		});
		hub.on("time-up", () => finishHub(app.world.phase === "ending"));
		hub.on("end", () => {
			app.ended = true;
			app.net.stop();
			app.clearInput();
			app.audio.stop();
			game.audio._background(true);
			const context = game.audio.ctx;
			if (context) context.close().catch(() => {});
			game.audio.ctx = null;
			game.audio.failed = "The Hub round has ended";
			game.stop();
			if (app.serverTimer) clearInterval(app.serverTimer);
			app.serverTimer = null;
		});
		game.o.menu.quit = false;
		app.garden?.reset(app.world);
	}
	game.screen.listeners.push(() => layoutTitleMenu());
	game.hook("input", () => {
		app.garden?.fit();
		layoutTitleMenu();
		if (
			app.devOpen &&
			![
				"dev",
				"tuning",
				"encounter-tools",
				"playback",
				"snapshot",
				"diagnostics",
			].includes(ui.screen)
		)
			app.closeDev();
		if (app.ended) game.input.consumeAll();
		app.applyPending();
	});
	game.start({ scenes, scene: info ? "run" : "title", boot: false });
	if (info) {
		app.audio.start();
		hub.ready();
		if (info.server) {
			let last = performance.now();
			app.serverTimer = setInterval(() => {
				const now = performance.now(),
					elapsed = Math.min(0.25, (now - last) / 1000);
				last = now;
				if (!app.ended) game.advance(elapsed, { draw: false });
			}, 16);
		}
	} else app.audio.start();
	const listen = (target, name, fn, options = {}) =>
		target.addEventListener(name, fn, {
			...options,
			signal: game._abort?.signal,
		});
	if (!info?.server) {
		for (const event of ["keydown", "pointerdown", "touchstart"])
			listen(window, event, () => activity(), { capture: true });
		listen(
			window,
			"pointermove",
			(e) => {
				if ((e.movementX || e.movementY) && e.pointerType !== "touch")
					activity();
			},
			{ capture: true },
		);
		listen(window, "blur", () => {
			app.injected.clear();
		});
		listen(document, "visibilitychange", () => {
			if (document.hidden) app.injected.clear();
		});
	}
	game.debug = {
		snapshot: () => ({
			scene: game.sceneName,
			mode: app.mode,
			host: app.host,
			local: app.local,
			attract: app.attract,
			world: app.world ? clone(app.world) : null,
			network: app.net?.metrics || null,
			fit: app.garden?.rect,
			errors: game.errors,
		}),
	};
	const debug = {
		game,
		app,
		identity,
		interview,
		offlineVoice: async () => {
			const C =
				globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
			const c = new C(1, 44100, 44100),
				gain = c.createGain();
			gain.connect(c.destination);
			syllable(c, gain, 0.02, 520, 0.12, 0.4);
			const buffer = await c.startRendering(),
				data = buffer.getChannelData(0);
			let peak = 0,
				energy = 0,
				tail = 0,
				finite = true;
			for (let i = 0; i < data.length; i++) {
				const v = data[i];
				if (!Number.isFinite(v)) finite = false;
				peak = Math.max(peak, Math.abs(v));
				energy += v * v;
				if (i > 22050) tail += v * v;
			}
			return { peak, rms: Math.sqrt(energy / data.length), tail, finite };
		},
		snapshot: game.debug.snapshot,
		command: (id, c) => {
			if (app.mode === "hub" && id !== app.local) return false;
			app.injected.set(id, c);
			return true;
		},
		release: () => {
			app.injected.clear();
			app.clearInput();
		},
		start: (players = 1) => startRun(players === 2 ? "couch" : "solo", players),
		advance: (seconds, draw = true) => game.advance(seconds, { draw }),
		loadStage: (index) => {
			if (app.readOnly()) return false;
			app.world.assisted = true;
			enterStage(app.world, index);
			app.lastPhase = null;
			app.garden?.reset(app.world);
			return true;
		},
		title,
		coOp,
		peerMenu,
		getPeer: () => app.peer,
		pack: () => pack(app.world),
		dispose: () => {
			app.ended = true;
			app.net?.stop();
			app.peer?.close(false);
			if (app.serverTimer) clearInterval(app.serverTimer);
			app.audio.stop();
			game.dispose();
		},
	};
	globalThis.__midnight = debug;
	globalThis.__game = { game, scenes };
	return debug;
}
if (typeof document !== "undefined")
	boot().catch((error) => {
		console.error(error);
		globalThis.My3D2dge?.showError?.("Starting the moonlit garden", error);
		globalThis.AIHub?.active &&
			globalThis.AIHub.fail("Unable to start the garden.");
	});
