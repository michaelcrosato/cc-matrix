/* GAME START — native shell, fixed cadence, input and presentation integration. */
(async () => {
	const E = My3D2dge,
		S = NightSim,
		paint = NightPaint,
		C = paint.colors;
	let game,
		world = null,
		painter,
		audio,
		session = null,
		peer = null,
		peerPanel = null,
		menu = null,
		idle = 0,
		attract = false,
		phaseShown = "",
		resultWait = 0,
		pendingJoin = false,
		inspect = false,
		labels = false,
		_devPage = 0,
		devScale = 1,
		_manualStep = false,
		frameAction = null,
		injected = {},
		startedAt = 0,
		ended = false,
		_peerMode = false,
		wasDev = false;
	let rayCounters = [0, 0];
	const ownSeed = () => crypto.getRandomValues(new Uint32Array(1))[0] || 1;
	const actionMap = {
		up: ["KeyW", "ArrowUp", "Pad12"],
		down: ["KeyS", "ArrowDown", "Pad13"],
		left: ["KeyA", "ArrowLeft", "Pad14"],
		right: ["KeyD", "ArrowRight", "Pad15"],
		ray: ["Space", "Mouse0", "Pad0"],
		focus: ["ShiftLeft", "ShiftRight", "Pad7"],
		pointerSteer: ["Mouse2"],
		start: ["Enter", "Pad9"],
		pause: ["Escape", "KeyP", "Pad9"],
		confirm: ["Enter", "Space", "Pad0"],
		cancel: ["Escape", "Backspace", "Pad1"],
		halves: {
			left: {
				pointerSteer: ["Mouse2"],
				ray: ["Space", "KeyF", "Mouse0"],
				focus: ["ShiftLeft", "KeyG"],
				confirm: ["Enter", "Space"],
				cancel: ["Escape"],
				pause: ["Escape", "KeyP"],
			},
			right: {
				pointerSteer: [],
				ray: ["Period", "Numpad1"],
				focus: ["Slash", "Numpad2"],
				confirm: ["Enter", "NumpadEnter"],
				cancel: ["Backspace"],
			},
		},
	};
	const cb = {
		onConnect(info, n) {
			session = n;
			_peerMode = n.kind !== "hub";
			world = S.create({
				seed: info.seed || 4813,
				players: Math.max(1, Math.min(2, info.players.length)),
			});
			ended = false;
			attract = false;
			phaseShown = "";
			rayCounters = [0, 0];
			if (game) {
				game.live = true;
				game.o.autoPause = false;
				game.allowJoin(false);
				closePeerPanel();
				game.resume();
				game.shell.hide();
				painter.reset();
				game.o.menu.quit = n.kind === "hub" ? false : "title";
				game.go("play", null, { fade: 0 });
			}
		},
		onSnapshot(w) {
			world = w;
		},
		onInput() {},
		onLeave(i) {
			if (world && session?.host) S.leave(world, i);
		},
		onTimeUp() {
			if (session?.host && world) session.finish(world, false);
		},
		onEnd({ reason }) {
			ended = true;
			audio?.stop();
			if (world && world.phase === "playing") world.phase = "failed";
			phaseShown = "";
			if (game && !game.headless)
				game.note(
					reason === "host-left"
						? "The host left. This round is void."
						: "The garden session has ended.",
					4,
				);
		},
		onResult(w) {
			world = w;
			phaseShown = "";
		},
		onStatus(s) {
			if (peerPanel) {
				const o = peerPanel.querySelector("output");
				o.textContent = s;
			}
		},
	};
	session = await NightNet.connectHub(cb);
	const server = !!session?.server;
	game = new E.Game({
		canvas: "screen",
		id: "killer-bee-night",
		headless: server,
		loop: !server,
		view: "overhead",
		views: ["overhead"],
		minW: 512,
		minH: 360,
		maxW: 1000,
		maxH: 1600,
		portrait: { maxH: 1600 },
		input: actionMap,
		autoPause: !session,
		live: !!session,
		fullscreen: "button",
		camera: { zoom: false },
		menu: {
			quit: session?.kind === "hub" ? false : "title",
			controls: {
				ray: "Horizontal ray",
				focus: "Hold Focus",
				pointerSteer: "Mouse steering",
				start: false,
			},
			settings: [
				...NightAudio.settings,
				{ key: "glyphs", value: "playstation" },
			],
			items: [
				["How to play", () => help()],
				["Developer tools", () => developer()],
				["About this garden", () => about()],
			],
		},
	});
	game.fadeTime = 0.13;
	game.cam.smooth = 0;
	painter = new paint.Painter(game);
	audio = NightAudio.create(game, { silent: server });
	if (game.shell?.root) {
		game.shell._o.tv = true;
		const fitUI = () => {
			const k = Math.max(1, Math.min(2.1, innerWidth / 900));
			Object.assign(game.shell.root.style, {
				transform: `scale(${k})`,
				transformOrigin: "0 0",
				inset: "auto",
				left: 0,
				top: 0,
				width: `${100 / k}vw`,
				height: `${100 / k}vh`,
			});
		};
		fitUI();
		addEventListener("resize", fitUI);
	}
	game.input.steer = "drag";
	game.input.zones = [{ x0: 0.62, y0: 0.3, x1: 1, y1: 1, act: "focus" }];
	game.input.touchButtons([]);
	const best = (assisted = false) =>
		Number(E.store.get(`night-best-${assisted ? "assisted" : "clean"}`, 0)) ||
		0;
	function saveBest() {
		if (!world || attract || server) return;
		const key = `night-best-${world.assisted ? "assisted" : "clean"}`;
		if (world.score > best(world.assisted)) E.store.set(key, world.score);
	}
	function consume() {
		game.players.forEach((p) => {
			p.clear();
		});
		injected = {};
		frameAction = null;
	}
	function stageReset() {
		painter.reset();
		phaseShown = "";
		resultWait = 0;
		rayCounters = world.players.map((p) => p.raySeen || 0);
		consume();
		game.timeScale = 1;
		devScale = 1;
		_manualStep = false;
		audio.stop();
		if (!server) audio.unlock();
		painter.update(world, 0);
		audio.events(world.events, world);
	}
	function start(n = 1) {
		if (session?.active) return;
		attract = false;
		ended = false;
		_peerMode = false;
		game.live = false;
		game.o.autoPause = true;
		audio.unlock();
		audio.stop();
		game.shell.hide();
		game.resume();
		world = S.create({ seed: ownSeed(), players: n });
		stageReset();
		while (game.players.length > 1) game.removePlayer(2);
		if (n === 2) {
			const pads =
				typeof navigator !== "undefined"
					? Array.from(navigator.getGamepads?.() || []).filter(Boolean)
					: [];
			game.addPlayer(
				pads.length
					? { pad: pads[pads.length > 1 ? 1 : 0].index }
					: { keys: "right" },
			);
		}
		game.allowJoin({
			max: 2,
			onJoin: () => {
				if (world?.players.length === 1) {
					if (world.stageTime < 0.1) S.addPlayer(world);
					else {
						pendingJoin = true;
						game.note("P2 will join at the next garden bed.", 3);
					}
				}
			},
		});
		startedAt = game.real;
		game.go("play", null, { fade: 0 });
	}
	function toTitle() {
		if (session?.active && session.kind === "hub") return;
		if (peer) {
			peer.cancel();
			peer = null;
		}
		session = null;
		_peerMode = false;
		closePeerPanel();
		audio.stop();
		game.shell.hide();
		game.resume();
		game.live = false;
		game.o.autoPause = true;
		game.timeScale = 1;
		devScale = 1;
		_manualStep = false;
		world = null;
		attract = false;
		ended = false;
		pendingJoin = false;
		phaseShown = "";
		painter.reset();
		game.allowJoin(false);
		while (game.players.length > 1) game.removePlayer(2);
		consume();
		idle = game.real;
		game.go("title", null, { fade: 0 });
	}
	function menuMake(items, fn, o = {}) {
		return new E.Menu(game, items, {
			scale: 2,
			box: false,
			pick: C.gold,
			color: C.ink,
			bg: "#14352e",
			onPick: fn,
			onCancel: () => toTitle(),
			...o,
		});
	}
	function titleMenu() {
		menu = menuMake(
			[
				"Enter the garden",
				"Play together",
				"Settings & controls",
				"About this garden",
			],
			(i) => {
				if (i === 0) start(1);
				else if (i === 1) game.go("choice", null, { fade: 0 });
				else if (i === 2) game.menu("settings");
				else about();
			},
		);
	}
	function help() {
		game.shell.show("help", {
			kicker: "Twelve little bees. One big night.",
			title: "A little swarm school",
			text: "Steer over a clockwork gardener. Stay in contact until it folds. Leaving early lets it mend.\n\nPink runners turn left; teal runners turn right. Their shells become solid obstacles.\n\nHold Focus to squeeze together and sting faster. Release to chase or escape.\n\nYour horizontal ray destroys rival swarms on your row. Finish a gardener to recharge one ray. Scouts become guards, then hunters.\n\nIn co-op, each swarm gets its own charge. A fallen friend returns at the next bed. Clear six beds and silence the Bellkeeper.",
			keys: [
				[game.input.label("ray"), "Horizontal ray"],
				[game.input.label("focus"), "Focus (hold)"],
				["WASD / arrows", "Steer"],
				["Hold right mouse", "Steer toward pointer"],
				["P2 keyboard", "Arrows, period ray, slash Focus"],
			],
			actions: [["Back", () => game.shell.back()]],
		});
	}
	function about(page = 0) {
		const d = globalThis.NightCredits || {
			sourceInformation: { source: "Killer Bees! (1983)", plan: "PLAN.md" },
			testingFeedback: [],
			engineFeedback: [],
			promptFeedback: [],
		};
		const groups = [
			[
				"Source Information",
				Object.entries(d.sourceInformation)
					.map(([k, v]) => `${k}: ${v}`)
					.join("\n\n"),
			],
			[
				"Testing Feedback",
				d.testingFeedback.map((s, i) => `${i + 1}. ${s}`).join("\n\n"),
			],
			[
				"Engine Feedback",
				d.engineFeedback.map((s, i) => `${i + 1}. ${s}`).join("\n\n"),
			],
			[
				"Prompt Feedback",
				d.promptFeedback.map((s, i) => `${i + 1}. ${s}`).join("\n\n"),
			],
			[
				"Credits & source notes",
				"Original game, garden, rigs, synth music and code: OpenAI gpt-6.1-sol, ultra reasoning.\n\nInspired by Killer Bees! (1983), Bob Harris / North American Philips. An original game, unaffiliated with the source.\n\nFoundation: my-3D2dge v0.89.1, Michael Crosato. AI Hub Session SDK 1.4.0, pristine client. Bundled source notices retained.\n\nResearch: original U.S. manual, Classic Gamer issue 5 page 40, and the Experiência Odyssey Bob Harris interview. Original recordings were not listened to; exact original sound remains unknown.\n\nDirect co-op uses manual WebRTC codes. Local machine connectivity is tested; arbitrary internet/NAT reachability is unknown without TURN.",
			],
		];
		const [title, text] = groups[page];
		game.shell.show("about", {
			kicker: `FIELD NOTES  ${page + 1} / ${groups.length}`,
			title,
			text,
			actions: [
				["Next page", () => about((page + 1) % groups.length)],
				["Back", () => game.shell.back()],
			],
		});
	}
	function devAllowed() {
		return (
			!!world &&
			!attract &&
			(!session?.active || (session.kind !== "hub" && session.host))
		);
	}
	function mark() {
		if (world) world.assisted = true;
	}
	function developer(page = 0) {
		if (!world) return;
		wasDev = true;
		_devPage = page;
		if (!devAllowed()) {
			game.shell.show("dev", {
				title: "Garden diagnostics",
				text: `Encounter ${world.stage + 1} / 6\nTick ${world.tick}\nTeam ${world.score}\nThe shared garden keeps moving while this menu is open.\n${session ? JSON.stringify(session.diagnostics || {}) : ""}`,
				actions: [
					[
						"Collision outlines",
						() => {
							inspect = !inspect;
						},
					],
					["Back", () => game.shell.back()],
				],
			});
			return;
		}
		const definitions = S.tuningDefs.slice(page * 4, page * 4 + 4);
		for (const d of definitions) {
			const key = `dev_${d.key}`;
			if (!game.settings.spec(key))
				game.settings.define({
					key,
					group: "Garden tuning",
					label: d.label,
					type: "slider",
					value: S.defaults[d.key],
					min: d.min,
					max: d.max,
					step: d.step,
					apply: (_g, v) => {
						if (world && world.tuning[d.key] !== v && devAllowed())
							S.setTuning(world, d.key, v);
					},
				});
			game.settings[key] = world.tuning[d.key];
		}
		const pages = Math.ceil(S.tuningDefs.length / 4);
		game.shell.show("dev", {
			kicker: `DEVELOPER  ${page + 1} / ${pages}`,
			title: "Tend the rules",
			text:
				"Gameplay changes mark this run assisted. Values apply at the next fixed step.\nSeed " +
				world.seed +
				"  |  Bed " +
				(world.stage + 1) +
				" / 6",
			rows: definitions.map((d) => `dev_${d.key}`),
			actions: [
				["Next tuning page", () => developer((page + 1) % pages)],
				["Encounter & tools", () => devStage()],
				[
					"Reset tuning to defaults",
					() => {
						S.resetTuning(world);
						mark();
						developer(page);
					},
				],
				[
					"Back",
					() => {
						devScale = 1;
						_manualStep = false;
						game.shell.back();
					},
				],
			],
		});
	}
	function devStage() {
		const actions = [
			[
				"Next encounter",
				() => {
					S.loadStage(world, (world.stage + 1) % 6);
					stageReset();
					game.shell.hide();
					game.resume();
					mark();
				},
			],
			[
				"Restart this encounter",
				() => {
					S.loadStage(world, world.stage);
					stageReset();
					game.shell.hide();
					game.resume();
					mark();
				},
			],
			[
				"Regenerate seed & restart",
				() => {
					world.seed = ownSeed();
					world.rng = world.seed;
					S.loadStage(world, world.stage);
					stageReset();
					mark();
					game.shell.hide();
					game.resume();
				},
			],
			["Enter seed", () => seedPanel()],
			[
				"Slow motion / normal",
				() => {
					devScale = devScale === 1 ? 0.35 : 1;
					game.live = true;
					mark();
					game.shell.toast("Time scale", `${devScale}x while playing`);
				},
			],
			[
				"Invulnerability",
				() => {
					world.invulnerable = !world.invulnerable;
					mark();
					game.shell.toast(
						"Invulnerability",
						world.invulnerable ? "On" : "Off",
					);
				},
			],
			[
				"Refill both rays",
				() => {
					world.players.forEach((p) => {
						p.charge = true;
					});
					mark();
				},
			],
			[
				"Spawn a rival",
				() => {
					S.spawnRival(world);
					mark();
				},
			],
			[
				"Single fixed step",
				() => {
					if (!session?.active) game.live = false;
					devScale = 1;
					S.step(
						world,
						world.players.map(() => ({ x: 0, y: 0, focus: false, ray: 0 })),
						1 / 120,
					);
					painter.update(world, 1 / 120);
					mark();
				},
			],
			[
				"Collision & state labels",
				() => {
					inspect = !inspect;
					labels = inspect;
				},
			],
			["Export state", () => exportState()],
			["Back", () => game.shell.back()],
		];
		game.shell.show("devStage", {
			title: "Encounter tools",
			text:
				"Read-only collision inspection does not alter score eligibility.\nSlow motion previews live behind these tools; closing them restores normal time.\nCurrent encounter: " +
				NightContent.stages[world.stage].title,
			actions,
		});
	}
	function seedPanel() {
		const d = document.createElement("div");
		d.className = "night-peer";
		const a = document.createElement("article"),
			h = document.createElement("h1");
		h.textContent = "Plant a seed";
		const p = document.createElement("p");
		p.textContent =
			"Enter a whole number. Applying it restarts this encounter and marks the run assisted.";
		const input = document.createElement("input");
		input.type = "number";
		input.min = "1";
		input.max = "4294967295";
		input.value = String(world.seed);
		input.style.cssText =
			"font-size:26px;width:100%;padding:12px;box-sizing:border-box";
		const ok = document.createElement("button");
		ok.textContent = "Apply & restart";
		ok.onclick = () => {
			world.seed = Number(input.value) >>> 0 || 1;
			world.rng = world.seed;
			S.loadStage(world, world.stage);
			stageReset();
			mark();
			d.remove();
			game.shell.hide();
			game.resume();
		};
		const back = document.createElement("button");
		back.textContent = "Cancel";
		back.onclick = () => d.remove();
		a.append(h, p, input, ok, back);
		d.append(a);
		document.body.append(d);
		input.focus();
	}
	function exportState() {
		game.shell.show("snapshot", {
			title: "Authoritative snapshot",
			text: "This serializable state includes the seed, collision geometry and encounter checkpoint.",
			actions: [
				[
					"Copy snapshot",
					async () => {
						try {
							await navigator.clipboard.writeText(
								JSON.stringify(S.snapshot(world)),
							);
							game.shell.toast("Copied", "Snapshot copied.");
						} catch {
							game.shell.toast(
								"Clipboard unavailable",
								"Use the selectable text below.",
							);
						}
					},
				],
				["Back", () => game.shell.back()],
			],
		});
		const area = document.createElement("textarea");
		area.className = "night-export";
		area.value = JSON.stringify(S.snapshot(world), null, 2);
		game.shell.root.querySelector(".esh-mod")?.append(area);
	}
	function makePeer() {
		if (session?.active && session.kind === "hub") return null;
		if (peer) peer.cancel();
		peer = new NightNet.DirectPeer(cb);
		return peer;
	}
	function peerNavigation() {
		const panel = document.querySelector(".night-peer");
		if (!panel) return;
		const I = game.input,
			active = document.activeElement,
			editing = active?.matches("textarea,input"),
			pad = I.lastDevice === "gamepad";
		if (editing && !pad) return;
		const all = [
			...panel.querySelectorAll("button:not(:disabled),textarea,input"),
		];
		if (!all.length) return;
		const at = all.indexOf(active);
		if (I.repeat("up") || I.repeat("left")) {
			all[(at - 1 + all.length) % all.length].focus();
			I.consumeAll();
		} else if (I.repeat("down") || I.repeat("right")) {
			all[(at + 1) % all.length].focus();
			I.consumeAll();
		} else if (I.pressed("confirm") && (pad || active?.tagName === "BUTTON")) {
			if (active?.tagName === "BUTTON") active.click();
			else active?.focus();
			I.consumeAll();
		} else if (I.pressed("cancel")) {
			const cancel = all.find((e) => e.textContent === "Cancel");
			cancel?.click();
			I.consumeAll();
		}
	}
	function closePeerPanel() {
		peerPanel?.remove();
		peerPanel = null;
	}
	function directPanel() {
		if (session?.active && session.kind === "hub") return;
		makePeer();
		game.shell.hide();
		const box = document.createElement("div");
		peerPanel = box;
		box.className = "night-peer";
		box.innerHTML =
			'<article><h1>Two swarms. One garden.</h1><p>Direct co-op uses an invitation and a reply. Works on a local network; internet connections may need network support that this game cannot provide.</p><div class="night-steps"></div><output>Choose a role to begin.</output></article>';
		const a = box.querySelector("article"),
			steps = box.querySelector(".night-steps");
		const button = (label, fn, secondary = false) => {
			const b = document.createElement("button");
			b.textContent = label;
			if (secondary) b.className = "secondary";
			b.onclick = fn;
			return b;
		};
		const status = (s) => (box.querySelector("output").textContent = s);
		const codeArea = (label, value = "", readOnly = false) => {
			const l = document.createElement("label");
			l.textContent = label;
			const ta = document.createElement("textarea");
			ta.value = value;
			ta.readOnly = readOnly;
			ta.maxLength = 32768;
			ta.spellcheck = false;
			l.append(ta);
			steps.append(l);
			return ta;
		};
		const copyButton = (ta) =>
			button("Copy", async () => {
				ta.select();
				try {
					await navigator.clipboard.writeText(ta.value);
					status("Copied. Send this code to your friend.");
				} catch {
					status("Select the code and copy it using your keyboard.");
				}
			});
		const pasteButton = (ta) =>
			button(
				"Paste",
				async () => {
					try {
						ta.value = await navigator.clipboard.readText();
						status("Pasted.");
					} catch {
						ta.focus();
						status("Paste with your keyboard or touch menu.");
					}
				},
				true,
			);
		const roles = () => {
			steps.replaceChildren();
			steps.append(
				button("Create invitation", async () => {
					try {
						status("Gathering a local invitation...");
						const code = await peer.createOffer();
						steps.replaceChildren();
						const out = codeArea(
							"1. Send this invitation to your friend",
							code,
							true,
						);
						steps.append(copyButton(out));
						const answer = codeArea("2. Paste their reply here");
						steps.append(
							pasteButton(answer),
							button("Connect", async () => {
								try {
									await peer.applyAnswer(answer.value);
									status("Connecting...");
								} catch (e) {
									status(e.message);
								}
							}),
						);
					} catch (e) {
						status(e.message);
					}
				}),
				button("Accept invitation", () => {
					steps.replaceChildren();
					const offer = codeArea("1. Paste the invitation");
					steps.append(
						pasteButton(offer),
						button("Make reply", async () => {
							try {
								status("Making a reply...");
								const code = await peer.acceptOffer(offer.value);
								steps.replaceChildren();
								const answer = codeArea(
									"2. Send this reply to the host",
									code,
									true,
								);
								steps.append(copyButton(answer));
								status("Waiting for the host to connect.");
							} catch (e) {
								status(e.message);
							}
						}),
					);
				}),
			);
		};
		roles();
		a.append(
			button(
				"Retry setup",
				() => {
					makePeer();
					roles();
					status("Choose a role to begin.");
				},
				true,
			),
			button(
				"Cancel",
				() => {
					peer?.cancel();
					peer = null;
					closePeerPanel();
					game.go("choice", null, { fade: 0 });
				},
				true,
			),
		);
		document.body.append(box);
		box.querySelector("button")?.focus();
	}
	function readAction(i, idx = i) {
		const I = game.players[i] || game.input;
		let [x, y] = I.move();
		if (I.down("pointerSteer") && world?.players[idx]) {
			const m = game.mouseGround(),
				p = world.players[idx];
			if (m) {
				const dx = m[0] - p.x,
					dy = m[1] - p.y,
					l = Math.hypot(dx, dy);
				if (l > 3) {
					x = dx / l;
					y = dy / l;
				}
			}
		}
		if (I.pressed("ray")) rayCounters[idx] = (rayCounters[idx] || 0) + 1;
		return (
			injected[idx] || {
				x,
				y,
				focus: I.down("focus"),
				ray: rayCounters[idx] || 0,
			}
		);
	}
	function activeAction() {
		const idx = session?.localIndex ?? 0;
		return readAction(0, idx < 0 ? 0 : idx);
	}
	function controlsTick() {
		if (!world) return;
		if (!rayButton || server) return;
		const touch =
			game.input.lastDevice === "touch" ||
			matchMedia("(pointer:coarse)").matches;
		const p = world.players[session?.localIndex ?? 0];
		rayButton.hidden = !(
			touch &&
			game.sceneName === "play" &&
			world.phase === "playing" &&
			p?.bees > 0 &&
			p?.charge &&
			!game.paused &&
			!game.shell.screen
		);
		touchHint.hidden = !(
			touch &&
			game.sceneName === "play" &&
			world.stageTime < 12 &&
			!game.paused
		);
	}
	function playUpdate(dt) {
		if (!world) return;
		painter.fit();
		const local = activeAction();
		frameAction = local;
		if (session?.active) {
			if (session.host && session.canStep() && !ended) {
				const a = session.inputs.map((a, i) =>
					i === session.localIndex ? local : a,
				);
				S.step(world, a, dt * (session.kind === "direct" ? devScale : 1));
				if (world.phase === "result") {
					resultWait += dt;
					if (resultWait > 3.5) {
						S.next(world);
						stageReset();
					}
				} else resultWait = 0;
				if (world.phase === "won" || world.phase === "failed")
					session.finish(world, world.phase === "won");
			}
			session.tick(dt, local, world);
		} else if (world.phase === "playing") {
			const a = world.players.map((_p, i) => readAction(i));
			S.step(world, a, dt * devScale);
		}
		painter.update(world, dt);
		audio.events(world.events, world);
		audio.update(world, dt);
		controlsTick();
		if (world.phase !== "playing" && world.phase !== phaseShown) {
			saveBest();
			phaseShown = world.phase;
			resultWait = 0;
			consume();
			resultMenu();
		}
		if (world.phase !== "playing" && menu && !session?.active) menu.update(dt);
	}
	function resultMenu() {
		const p = world.phase;
		if (session?.active) {
			menu = null;
			return;
		}
		menu = menuMake(
			p === "result"
				? ["Next garden bed", "Title"]
				: p === "failed"
					? ["Retry encounter", "Restart campaign", "Title"]
					: ["Play again", "Title"],
			(i) => {
				if (p === "result" && i === 0) {
					if (pendingJoin) {
						S.addPlayer(world);
						pendingJoin = false;
					}
					S.next(world);
					stageReset();
				} else if (p === "failed" && i === 0) {
					S.retry(world);
					stageReset();
				} else if ((p === "failed" && i === 1) || (p === "won" && i === 0)) {
					S.restart(world);
					stageReset();
				} else toTitle();
			},
			{ y: Math.round(game.H / 2 + 24) },
		);
	}
	function resultDraw(r) {
		if (!world || world.phase === "playing") return;
		const won = world.phase === "won",
			fail = world.phase === "failed",
			title = won
				? "THE GARDEN IS OURS!"
				: fail
					? "A LITTLE LESS BUZZ."
					: "BED WELL TENDED!",
			sub = won
				? "Moonflowers safe. Tiny heroes home."
				: fail
					? "Shake off the dew. Try that bed again."
					: `${world.players.reduce((a, p) => a + p.bees, 0)} bees coming home. Next bed, fresh wings.`;
		r.overlay((g) => {
			PANEL(g, r.W / 2 - 205, r.H / 2 - 88, 410, 188);
			E.font.title(g, title, r.W / 2, r.H / 2 - 65, {
				scale: 3,
				align: "center",
				colors: ["#fcf1cf", "#e9c26a", "#c58d42"],
				depth: 1,
			});
			paint.text(g, sub, r.W / 2, r.H / 2 - 30, C.dim, {
				align: "center",
				wrap: 380,
			});
			paint.text(
				g,
				`TEAM ${world.score}  /  ${world.assisted ? "ASSISTED" : "CLEAN"} BEST ${best(world.assisted)}`,
				r.W / 2,
				r.H / 2 - 5,
				C.gold,
				{ align: "center" },
			);
			if (session?.active)
				paint.text(
					g,
					world.phase === "result"
						? "FRESH WINGS IN A MOMENT..."
						: "TEAM RESULT SENT",
					r.W / 2,
					r.H / 2 + 42,
					C.ink,
					{ align: "center", scale: 2 },
				);
		});
		if (menu && !session?.active) menu.draw(r);
	}
	function PANEL(g, x, y, w, h) {
		E.px.rect(g, x - 2, y - 2, w + 4, h + 4, "#5a7c64");
		E.px.rect(g, x, y, w, h, "#0a242a");
	}
	const scenes = {
		title: {
			view: "overhead",
			camera: { zoom: false },
			enter() {
				if (peer) {
					peer.cancel();
					peer = null;
				}
				session = null;
				_peerMode = false;
				audio.stop();
				closePeerPanel();
				game.shell.hide();
				game.live = false;
				game.o.autoPause = true;
				game.o.menu.quit = "title";
				idle = game.real;
				attract = false;
				world = null;
				pendingJoin = false;
				painter.reset();
				game.timeScale = 1;
				devScale = 1;
				game.allowJoin(false);
				while (game.players.length > 1) game.removePlayer(2);
				consume();
				titleMenu();
			},
			update(dt) {
				painter.fit();
				painter.update(null, dt);
				if (game.input.anyPressed() || Math.hypot(...game.input.move()) > 0.25)
					idle = game.real;
				if (!game.shell.screen) {
					menu.y =
						painter.titleLayout?.y || Math.max(18, (game.H - 350) / 2) + 171;
					menu.update(dt);
					if (game.real - idle >= 10) game.go("attract", null, { fade: 0 });
				}
			},
			draw(r) {
				painter.titleLayout = painter.title(r);
				menu.y = painter.titleLayout.y;
				menu.draw(r);
				r.text(
					`CLEAN BEST  ${String(best()).padStart(6, "0")}     1-2 SWARMS`,
					r.W / 2,
					Math.max(18, (r.H - 350) / 2) + 309,
					C.dim,
					{ align: "center" },
				);
			},
		},
		choice: {
			view: "overhead",
			camera: { zoom: false },
			enter() {
				idle = game.real;
				consume();
				menu = menuMake(
					["Two on this screen", "Direct co-op", "How to play", "Back"],
					(i) => {
						if (i === 0) start(2);
						else if (i === 1) directPanel();
						else if (i === 2) help();
						else toTitle();
					},
					{ y: Math.round(game.H / 2 - 10) },
				);
			},
			update(dt) {
				painter.fit();
				painter.update(null, dt);
				if (game.input.anyPressed() || Math.hypot(...game.input.move()) > 0.25)
					idle = game.real;
				if (!peerPanel && !game.shell.screen) {
					menu.update(dt);
					if (game.real - idle >= 10) game.go("attract", null, { fade: 0 });
				}
			},
			back() {
				toTitle();
				return true;
			},
			draw(r) {
				painter.floor(r, null);
				r.overlay((g) => {
					PANEL(g, r.W / 2 - 224, r.H / 2 - 100, 448, 235);
					E.font.title(g, "BETTER TOGETHER", r.W / 2, r.H / 2 - 76, {
						scale: 3,
						align: "center",
						colors: ["#f7edcf", "#edc66f"],
					});
					paint.text(
						g,
						"Two pads, or WASD + arrows on one keyboard.",
						r.W / 2,
						r.H / 2 - 40,
						C.dim,
						{ align: "center" },
					);
					paint.text(
						g,
						"P1: Space / Shift   P2: period / slash",
						r.W / 2,
						r.H / 2 + 108,
						C.dim,
						{ align: "center" },
					);
				});
				menu.draw(r);
			},
		},
		play: {
			view: "overhead",
			pausable: true,
			camera: { zoom: false },
			enter() {
				phaseShown = "";
				consume();
			},
			update: playUpdate,
			draw(r) {
				if (!world) return;
				const visible =
					session?.active && !session.host
						? session.view(
								world,
								1 / 60,
								frameAction || { x: 0, y: 0, focus: false, ray: 0 },
							)
						: world;
				painter.world(r, visible, { inspect, labels });
				painter.hud(r, world);
				resultDraw(r);
			},
		},
		attract: {
			view: "overhead",
			camera: { zoom: false },
			enter() {
				attract = true;
				world = S.create({ seed: 8347, players: 2 });
				painter.reset();
				consume();
				startedAt = game.real;
			},
			update(dt) {
				if (!attract) return;
				if (
					game.input.anyPressed() ||
					Math.hypot(...game.input.move()) > 0.25
				) {
					toTitle();
					return;
				}
				painter.fit();
				world.invulnerable = true;
				world.players.forEach((p) => {
					p.bees = 12;
				});
				S.step(
					world,
					world.players.map((p) => S.bot(world, p.id)),
					dt,
				);
				if (world.phase === "result") S.next(world);
				if (world.stageTime > 25) {
					const next = world.stage === 0 ? 3 : world.stage === 3 ? 5 : 0;
					S.loadStage(world, next, false);
					painter.reset();
				}
				if (world.phase === "failed" || world.phase === "won") {
					S.loadStage(world, 0, false);
					painter.reset();
				}
				painter.update(world, dt);
				audio.events(world.events, world);
				audio.update(world, dt);
			},
			draw(r) {
				painter.world(r, world);
				painter.hud(r, world, true);
			},
		},
	};
	let rayButton = null,
		touchHint = null;
	if (!server) {
		rayButton = document.createElement("button");
		rayButton.className = "night-touch-ray";
		rayButton.textContent = "RAY";
		rayButton.hidden = true;
		rayButton.setAttribute("aria-label", "Fire horizontal ray");
		rayButton.addEventListener("pointerdown", (e) => {
			e.preventDefault();
			e.stopPropagation();
			const i = session?.localIndex ?? 0;
			rayCounters[i] = (rayCounters[i] || 0) + 1;
			audio.unlock();
			game.input.lastDevice = "touch";
		});
		document.body.append(rayButton);
		touchHint = document.createElement("div");
		touchHint.className = "night-touch-hint";
		touchHint.textContent = "Left: steer  /  hold right: Focus";
		touchHint.hidden = true;
		document.body.append(touchHint);
		const meaningful = (e) => {
			if (
				e.type === "pointermove" &&
				Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0) < 2
			)
				return;
			audio.unlock();
			idle = game.real;
			if (attract) {
				toTitle();
				game.input.clear();
				e.preventDefault?.();
				e.stopImmediatePropagation?.();
			}
		};
		for (const type of ["keydown", "pointerdown", "pointermove"])
			addEventListener(type, meaningful, { capture: true });
		addEventListener("blur", () => {
			consume();
			if (!session?.active) audio.pause(true);
		});
		addEventListener("focus", () => {
			if (!game.paused) audio.pause(false);
		});
		game.hook("input", () => {
			peerNavigation();
			const inDev = ["dev", "devStage", "snapshot"].includes(game.shell.screen);
			if (wasDev && !inDev) {
				devScale = 1;
				game.timeScale = 1;
				game.live = !!session?.active;
				wasDev = false;
			}
			audio.pause(game.paused && !game.live);
			controlsTick();
		});
	}
	game.start({ scene: session?.active ? "play" : "title", scenes });
	if (session?.active) {
		game.live = true;
		game.o.autoPause = false;
		game.allowJoin(false);
	}
	if (server) {
		let prior = performance.now();
		const timer = setInterval(() => {
			const now = performance.now(),
				dt = Math.min(0.1, (now - prior) / 1000);
			prior = now;
			if (session?.active && !session.ended) game.advance(dt, { draw: false });
			else clearInterval(timer);
		}, 1000 / 60);
	}
	function stepForTest(seconds, bot = false) {
		const loop = game.o.loop;
		game.stop();
		for (let i = 0; i < Math.round(seconds * 120); i++) {
			if (bot && world) {
				if (world.phase === "result") {
					S.next(world);
					stageReset();
				}
				for (const p of world.players) injected[p.id] = S.bot(world, p.id);
			}
			game.advance(1 / 120, { draw: false });
		}
		game.advance(0, { draw: true });
		if (loop && !game.headless) game.start();
		return world;
	}
	const debug = {
		game,
		get world() {
			return world;
		},
		get session() {
			return session;
		},
		get peer() {
			return peer;
		},
		get audio() {
			return audio;
		},
		get menu() {
			return menu;
		},
		start,
		makePeer,
		step: stepForTest,
		inject(i, a) {
			if (a === null) delete injected[i];
			else injected[i] = { ...a };
		},
		snapshot: () => (world ? S.snapshot(world) : { scene: game.sceneName }),
		loadStage(i) {
			if (!devAllowed()) return;
			S.loadStage(world, i);
			stageReset();
			mark();
		},
		toTitle,
		get attract() {
			return attract;
		},
		openAbout: about,
		openHelp: help,
		openDev: developer,
		get startedAt() {
			return startedAt;
		},
		rayCounters,
	};
	game.debug = {
		snapshot: () => ({
			scene: game.sceneName,
			phase: world?.phase,
			stage: world?.stage,
			bees: world?.players.map((p) => p.bees),
			score: world?.score,
			seed: world?.seed,
			attract,
			network: session?.diagnostics,
		}),
	};
	globalThis.__night = debug;
	globalThis.__game = game;
})();
/* GAME END */
