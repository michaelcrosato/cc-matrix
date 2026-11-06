/* Bomb Union — native Game/Shell foundation adapted from the handoff pointclick/adventure kits. */
(() => {
	const E = My3D2dge,
		B = globalThis.BU,
		$ = (s) => document.querySelector(s);
	const INPUT = {
		...E.Input.DEFAULT,
		confirm: ["Enter", "Space", "Pad0"],
		cancel: ["Escape", "Backspace", "Pad1"],
		apply: ["Space", "Enter", "Mouse0", "Pad0"],
		drop: ["Mouse2", "Backspace", "Pad1"],
		inspect: ["KeyE", "Mouse1", "Pad2"],
		repeatOrder: ["KeyR", "Pad3"],
		previousTool: ["KeyQ", "WheelUp", "Pad4"],
		nextTool: ["KeyF", "WheelDown", "Pad5"],
		precision: ["ShiftLeft", "ShiftRight", "Pad6"],
		evidence: ["Tab", "Pad7", "Pad17"],
		toolCut: ["Digit1"],
		toolGrip: ["Digit2"],
		toolSolder: ["Digit3"],
		toolExtinguish: ["Digit4"],
	};
	const app = {
		state: null,
		screen: "title",
		boardId: null,
		focusTarget: null,
		tool: "cut",
		lastEvent: 0,
		caption: "Pip is checking the kettle. You can check the circuits.",
		speaker: "DISPATCH",
		attract: false,
		seed: 1,
		codeDraft: [],
		editing: false,
	};
	B.app = app;
	const tools = ["cut", "grip", "solder", "extinguish"],
		toolNames = ["Cutters", "Pliers", "Iron", "Foam"];
	const game = new E.Game({
		id: "bomb-union-v1",
		canvas: "screen",
		res: [640, 360],
		expand: true,
		view: "topdown",
		views: ["topdown"],
		input: INPUT,
		draw: true,
		fullscreen: "button",
		autoPause: true,
		bg: "#081b22",
		menu: {
			quit: false,
			items: [
				["Developer workbench", () => openDev()],
				["Case evidence", () => openEvidence()],
				["About & credits", () => credits(0)],
			],
			settings: [
				{ key: "music", value: 0.1 },
				{ key: "glyphs", value: "playstation" },
				{
					key: "voice",
					label: "Radio voices",
					type: "slider",
					value: 0.75,
					min: 0,
					max: 1,
					step: 0.05,
					group: "Sound",
					apply: (g, v) => {
						g.audio.voiceVolume = v;
						g.audio.applyVolume();
					},
				},
				{
					key: "textScale",
					label: "Text size",
					type: "slider",
					value: 1,
					min: 0.85,
					max: 1.25,
					step: 0.05,
					group: "Comfort",
					apply: (g, v) => {
						document.documentElement.style.setProperty("--bu-text", v);
						if (g.shell?.root) window.dispatchEvent(new Event("resize"));
					},
				},
				{
					key: "candidates",
					label: "Show possible digits",
					type: "toggle",
					value: false,
					help: "Adds automatic stencil elimination. Assisted results are labeled.",
					group: "Game",
				},
				{
					key: "touchAssist",
					label: "Touch solder assistance",
					type: "toggle",
					value: true,
					help: "Releases a legal joint inside the safe band.",
					group: "Game",
				},
				{
					key: "hintDelay",
					label: "Guidance delay",
					type: "slider",
					value: 8,
					min: 0,
					max: 30,
					step: 1,
					group: "Game",
				},
			],
			controls: {
				apply: "Apply selected tool",
				drop: "Drop / back",
				inspect: "Test / inspect",
				repeatOrder: "Repeat work order",
				previousTool: "Previous tool",
				nextTool: "Next tool",
				precision: "Precision snap",
				evidence: "Evidence / board",
				toolCut: "Cutters",
				toolGrip: "Pliers",
				toolSolder: "Soldering iron",
				toolExtinguish: "Extinguisher",
				attack: false,
				dash: false,
				jump: false,
				skill: false,
			},
		},
	});
	app.game = game;
	const ui = new E.Shell(game, {
		tv: true,
		theme: {
			ink: "#f4efd9",
			paper: "rgba(12,34,41,.95)",
			accent: "#a5ffca",
			muted: "#b2c5bd",
			danger: "#ff9d77",
			line: "#54756c88",
			font: "Trebuchet MS, system-ui, sans-serif",
			titleFont: "Trebuchet MS, sans-serif",
			scale: () =>
				Math.max(0.82, Math.min(2.12, innerWidth / 930)) *
				(game.settings.textScale || 1),
		},
		screens: {
			pause: {
				kicker: () =>
					app.net?.online ? "Online · fuse continues" : "Union break",
				text: () =>
					app.net?.online
						? "This is a local menu. Your crew and the fuse keep going."
						: "The fuse is paused. Your tea, unfortunately, is not.",
			},
			help: {
				title: "Field manual",
				sections: [
					[
						"One careful repair",
						"Cut BOTH leads of the ordered part. Grip it out. Grip a spare from the tray, place it in the empty socket, then hold the iron on each lead. Release inside the green band.",
					],
					[
						"A useful mistake",
						"A wrong cut marks a recovery joint. Resolder it within eight seconds. Wrong replacements fail continuity and can be gripped out. An established fire needs foam.",
					],
					[
						"Read the code",
						"Each completed sector publishes lit AND dark cells. Unknown cells mean nothing yet. Compare the exact stencil alphabet, then deliberately confirm your chosen code.",
					],
				],
			},
		},
	});
	app.ui = ui;
	const nativeUiBack = ui.back.bind(ui);
	let restoringPanel = false;
	ui.back = () => {
		if (restoringPanel) return nativeUiBack();
		restoringPanel = true;
		try {
			nativeUiBack();
			const page = ui.screen;
			if (page === "evidence") openEvidence();
			else if (page === "code") codeEntry();
			else if (page === "alphabet") glyphReference();
			else if (page === "join") joinMenu();
			else if (page === "editor") editorPage();
			else if (page === "editor-json") editorJSON();
			else
				app.screen =
					page || (app.boardId ? "work" : app.state ? "evidence" : "title");
			return ui;
		} finally {
			restoringPanel = false;
		}
	};
	const ownStyle = document.querySelector("#bu-style");
	if (ownStyle) document.head.appendChild(ownStyle);
	app.art = new B.Art(game);
	app.audio = new B.Audio(game);
	let progress = {
		v: 1,
		unlocks: ["training", "waterfront"],
		best: {},
		seeds: {},
		completed: [],
	};
	try {
		const p = E.store.get("bomb-union-progress-v1", null);
		if (p?.v === 1 && Array.isArray(p.completed) && p.best && p.seeds)
			progress = { ...progress, ...p };
	} catch {}
	app.progress = progress;
	const hud = document.createElement("div");
	hud.id = "bu-hud";
	hud.hidden = true;
	hud.innerHTML =
		'<div class="bu-top"><div class="bu-case"><small>MUNICIPAL RESPONSE · BOMB UNION</small><strong></strong></div><div class="bu-fuse"><small>FUSE<br>REMAINING</small><strong>00:00</strong></div></div><div class="bu-online"></div><div class="bu-side"><div class="bu-order"><small>CURRENT WORK ORDER</small><p></p><div class="bu-next"></div></div><button class="bu-mini-evidence" aria-label="Open evidence"></button><div class="bu-heat">IRON HEAT <span></span><div><i></i></div></div><div class="bu-alert" hidden></div></div><div class="bu-context"></div><div class="bu-holdbar" hidden><div class="safe"></div><div class="fill"></div><div class="bu-holdlabel"></div></div><div class="bu-bottom"><div class="bu-caption"><b>PIP · TECHNICAL PARTNER</b><span></span></div><div class="bu-tools"></div></div><button class="bu-touch-action" hidden></button>';
	document.body.appendChild(hud);
	const globalFuse = document.createElement("div");
	globalFuse.id = "bu-global-fuse";
	globalFuse.className = "bu-fuse";
	globalFuse.hidden = true;
	globalFuse.innerHTML =
		"<small>FUSE<br>REMAINING</small><strong>00:00</strong>";
	document.body.appendChild(globalFuse);
	function updateGlobalFuse() {
		const s = app.state;
		globalFuse.hidden = s?.status !== "active";
		if (globalFuse.hidden) return;
		globalFuse.querySelector("strong").textContent = formatTime(s.remaining);
		globalFuse.querySelector("small").textContent = app.net?.online
			? "FUSE · LIVE"
			: game.paused
				? "FUSE · PAUSED"
				: "FUSE REMAINING";
		globalFuse.classList.toggle("urgent", s.remaining < 60);
	}

	ui.root.addEventListener("pointerover", (e) => {
		if (
			e.target.tagName === "BUTTON" &&
			!e.target.disabled &&
			e.pointerType !== "touch"
		)
			e.target.focus({ preventScroll: true });
	});
	const H = {
		case: hud.querySelector(".bu-case strong"),
		fuse: hud.querySelector(".bu-fuse strong"),
		fuseBox: hud.querySelector(".bu-fuse"),
		order: hud.querySelector(".bu-order p"),
		next: hud.querySelector(".bu-next"),
		evidence: hud.querySelector(".bu-mini-evidence"),
		heat: hud.querySelector(".bu-heat"),
		heatText: hud.querySelector(".bu-heat span"),
		heatFill: hud.querySelector(".bu-heat i"),
		alert: hud.querySelector(".bu-alert"),
		context: hud.querySelector(".bu-context"),
		hold: hud.querySelector(".bu-holdbar"),
		safe: hud.querySelector(".safe"),
		fill: hud.querySelector(".fill"),
		holdText: hud.querySelector(".bu-holdlabel"),
		caption: hud.querySelector(".bu-caption span"),
		speaker: hud.querySelector(".bu-caption b"),
		online: hud.querySelector(".bu-online"),
		touch: hud.querySelector(".bu-touch-action"),
	};
	H.evidence.onclick = () => openEvidence();
	const toolButtons = tools.map((t, i) => {
		const b = document.createElement("button");
		b.innerHTML = `<kbd>${i + 1}</kbd>${toolNames[i]}`;
		b.onclick = () => setTool(t);
		hud.querySelector(".bu-tools").appendChild(b);
		return b;
	});
	let actionHeld = false,
		touchAuto = false,
		idleAt = performance.now(),
		lastHUD = 0,
		lastPointer = null,
		lastPad = [],
		attractClock = 0,
		_attractStage = 0,
		attractCase = 0,
		attractWait = 0,
		lastTaunt = 0,
		justStarted = 0,
		revisionShown = -1,
		resultShown = false,
		stickyCaption = 0;
	const randomSeed = () => crypto.getRandomValues(new Uint32Array(1))[0];
	const save = () => {
		if (!app.attract && !app.net?.online)
			try {
				E.store.set("bomb-union-progress-v1", progress);
			} catch {}
	};
	const now = () => performance.now();
	const nativePause = game.pause.bind(game),
		nativeResume = game.resume.bind(game);
	game.pause = (reason) => {
		cancelHold();
		if (!app.net?.online) app.audio.suspend?.();
		return nativePause(reason);
	};
	game.resume = () => {
		nativeResume();
		if (!(app.net?.mode === "hub" && app.net?.ended))
			app.audio.suspend?.(false);
	};
	function signalInput(e) {
		if (e.type === "pointermove" && e.movementX === 0 && e.movementY === 0)
			return;
		idleAt = now();
		if (app.attract) {
			e.preventDefault?.();
			e.stopImmediatePropagation?.();
			wake();
			return;
		}
		if (
			e.type !== "pointermove" &&
			!(app.net?.mode === "hub" && app.net?.ended)
		)
			app.audio.unlock?.();
	}
	for (const type of [
		"keydown",
		"pointerdown",
		"pointermove",
		"touchstart",
		"wheel",
	])
		addEventListener(type, signalInput, { capture: true, passive: false });
	addEventListener("contextmenu", (e) => e.preventDefault());
	addEventListener("blur", () => cancelHold());
	addEventListener(
		"pointerup",
		() => {
			if (actionHeld && !touchAuto) endHold();
		},
		{ capture: true },
	);
	addEventListener("pointercancel", () => cancelHold());
	let observedPause = false;
	function restoreCustomShellPanels() {
		const page = ui.screen;
		if (restoringPanel || !ui.root) return;
		if (page === "evidence" && !ui.root.querySelector(".bu-sectors"))
			openEvidence();
		else if (page === "code" && !ui.root.querySelector(".bu-dials"))
			codeEntry();
		else if (page === "alphabet" && !ui.root.querySelector(".bu-help-glyphs"))
			glyphReference();
		else if (page === "join" && !ui.root.querySelector(".bu-code-entry"))
			joinMenu();
		else if (page === "editor" && !ui.root.querySelector(".bu-editor-grid"))
			editorPage();
		else if (
			page === "editor-json" &&
			!ui.root.querySelector("#bu-editor-json")
		)
			editorJSON();
	}
	game.hook("input", () => {
		restoreCustomShellPanels();
		if (game.paused !== observedPause) {
			observedPause = game.paused;
			if (game.paused) {
				cancelHold();
				if (!app.net?.online) app.audio.suspend(true);
			} else if (!(app.net?.mode === "hub" && app.net?.ended))
				app.audio.suspend(false);
		}
	});
	const view = () => ({
		screen: app.screen,
		boardId: app.boardId,
		focusTarget: app.focusTarget,
		tool: app.tool,
		attract: app.attract,
		success: app.state?.status === "won",
		reducedMotion: game.reduceMotion,
		precision: game.input.down("precision"),
	});
	const board = () => app.state?.boards.find((b) => b.id === app.boardId);
	const seat = () => (app.net?.online ? app.net.seat : 0);
	const canAct = () =>
		app.state?.status === "active" &&
		(!app.net?.online || app.net.canPlay) &&
		!app.attract;
	function command(cmd) {
		if (!app.state) return { ok: false, reason: "No active case." };
		const result = app.net?.online
			? app.net.command(cmd)
			: B.Sim.command(app.state, 0, {
					...cmd,
					id: cmd.id || `local-${++app.commandId}`,
					caseId: app.state.caseId,
				});
		if (result?.ok === false) ui.toast("Check the target", result.reason, 2.5);
		return result;
	}
	app.commandId = 0;
	app.command = command;
	function message(text, speaker = "PIP", priority = false) {
		if (!priority && now() < stickyCaption) return;
		app.caption = String(text).replace(/^(PIP|DR\. TICK):\s*/, "");
		app.speaker = speaker;
		if (priority) stickyCaption = now() + 3500;
		app.audio.voice?.(
			speaker.toLowerCase().includes("tick") ? "saboteur" : "partner",
			app.caption,
			priority ? 2 : 1,
		);
	}
	function events() {
		if (!app.state) return;
		for (const e of app.state.events || []) {
			if (e.id <= app.lastEvent) continue;
			app.lastEvent = e.id;
			app.art.event?.(e);
			const type = e.type || "";
			app.audio.effect?.(
				type === "test"
					? e.pass
						? "test-pass"
						: "test-fail"
					: type === "wrong-part"
						? "test-fail"
						: type,
			);
			if (e.text)
				message(
					e.text,
					type.includes("taunt") ? "DR. TICK" : "PIP",
					/recover|fire|wrong|fail|fault|penalty|test/.test(type),
				);
		}
	}
	function setTool(t) {
		if (!tools.includes(t)) return;
		cancelHold();
		app.tool = t;
		app.audio.effect?.("select");
	}
	function cancelHold() {
		if (!actionHeld && !board()?.hold) return;
		actionHeld = false;
		touchAuto = false;
		if (app.state?.status === "active" && board()?.hold)
			command({ type: "cancel", board: app.boardId });
	}
	function endHold() {
		if (!actionHeld) return;
		actionHeld = false;
		touchAuto = false;
		command({ type: "end", board: app.boardId });
	}
	function target() {
		return app.art
			.targets(app.state, view())
			.find((t) => t.id === app.focusTarget);
	}
	function apply(t = target(), assisted = false) {
		if (!canAct() || !t) return;
		app.focusTarget = t.id;
		const b = board();
		if (!b || b.claim !== seat()) return;
		const c = t.componentId || t.component;
		if (assisted) {
			if (!app.state.assisted) command({ type: "assist", enabled: true });
			if (t.kind === "fire") setTool("extinguish");
			else if (t.kind === "spare") setTool("grip");
			else if (t.kind === "terminal")
				setTool(
					b.recovery || b.components.find((q) => q.id === c)?.part
						? "solder"
						: "cut",
				);
			else if (t.kind === "component") setTool("grip");
		}
		if (t.kind === "test") {
			inspect();
			return;
		}
		let cmd;
		if (app.tool === "cut" && t.kind === "terminal")
			cmd = { type: "cut", component: c, terminal: t.terminal };
		else if (app.tool === "grip" && t.kind === "spare")
			cmd = { type: "pick", spare: t.spare };
		else if (app.tool === "grip" && t.kind === "component")
			cmd = { type: b.held ? "place" : "grip", component: c };
		else if (app.tool === "solder" && t.kind === "terminal")
			cmd = {
				type: "begin",
				tool: "solder",
				component: c,
				terminal: t.terminal,
			};
		else if (app.tool === "extinguish" && (t.kind === "fire" || b.fire))
			cmd = { type: "begin", tool: "extinguish" };
		else {
			ui.toast(
				"Tool ready",
				app.tool === "grip"
					? "Aim at a component body or a spare in the tray."
					: app.tool === "extinguish"
						? "Aim at the marked fire."
						: "Aim at one of the two round terminals.",
			);
			return;
		}
		const r = command({ ...cmd, board: app.boardId });
		if (cmd.type === "begin" && r?.ok !== false) {
			actionHeld = true;
			touchAuto = assisted && game.settings.touchAssist;
		}
	}
	function inspect() {
		const b = board(),
			t = target();
		if (!b || !canAct()) return;
		if (b.rule === "jumper") {
			message("A straight jumper completes this loop. No diagnosis needed.");
			return;
		}
		const spare =
			t?.kind === "spare"
				? t.spare
				: b.held || b.spares.find((s) => s.available)?.id;
		if (!spare) return;
		command({ type: "test", board: b.id, spare, component: b.order[b.step] });
	}
	H.touch.onpointerdown = (e) => {
		e.stopPropagation();
		e.preventDefault();
		apply(target(), true);
	};
	function setPage(page, spec = {}) {
		cancelHold();
		app.screen = page;
		ui.show(page, spec);
		const sh = ui.root?.querySelector(".esh-sh");
		if (sh) sh.dataset.page = page;
		hud.hidden = true;
	}
	function addPanel(node, where = "before") {
		const box = ui.root?.querySelector(".esh-sh>div");
		if (!box) return;
		const acts = box.querySelector(".esh-btns");
		if (where === "before" && acts) box.insertBefore(node, acts);
		else box.appendChild(node);
	}
	function el(tag, cls, text) {
		const n = document.createElement(tag);
		n.className = cls || "";
		if (text !== undefined) n.textContent = text;
		return n;
	}
	function stencil(cells, extra = "") {
		const n = el("div", `bu-stencil ${extra}`);
		for (const v of cells)
			n.appendChild(
				el("i", `bu-cell ${v === 1 ? "lit" : v === 0 ? "dark" : "unknown"}`),
			);
		return n;
	}
	function evidenceRow(data = app.state?.evidence) {
		const row = el("div", "bu-stencils");
		(data || []).forEach((cells, d) => {
			const block = el("div", "bu-digit-block");
			block.append(stencil(cells), el("small", "", `DIGIT ${d + 1}`));
			if (game.settings.candidates)
				block.append(
					el("small", "", `Possible: ${B.Sim.candidates(cells).join(" ")}`),
				);
			row.append(block);
		});
		return row;
	}
	function title() {
		if (globalThis.AIHub?.active) {
			cancelHold();
			ui.hide();
			app.boardId = null;
			app.screen = "standby";
			setPage("standby", {
				kicker: "AI HUB · SHARED DISPATCH",
				title: app.net?.ended ? "Dispatch complete" : "Crew assembling",
				text: app.net?.ended
					? "The Hub will take the crew to its next round."
					: "Ready automatically. Waiting for the Hub clock.",
				actions: [],
			});
			return;
		}
		app.editing = false;
		app.editorApplying = false;
		app.devApplying = false;
		cancelHold();
		if (app.net?.online && app.net.mode !== "hub") app.net.leave();
		app.state = null;
		app.boardId = null;
		app.attract = false;
		app.screen = "title";
		resultShown = false;
		hud.hidden = true;
		idleAt = now();
		game.live = false;
		game.o.autoPause = true;
		if (game.scene) game.scene.pausable = false;
		ui.hide();
		nativeResume();
		app.audio.suspend?.(false);
		setPage("title", {
			kicker: "CITY EMERGENCY SERVICE · LOCAL 1982",
			name: "Bomb Union",
			subtitle: "Small repairs. Enormous consequences.",
			text: "Clock in. Cut carefully. Save the city.",
			actions: [
				["Start your shift", () => caseSelect(true)],
				["Case files & replay", () => caseSelect(false)],
				["Cooperative dispatch", () => onlineMenu()],
				["Settings", () => game.menu("settings")],
				["Field manual", () => help()],
				["About & credits", () => credits(0)],
			],
			meta: ["1–4 TECHNICIANS", "REAL-TIME DEDUCTION", "ALL NATIVE PIXELS"],
			footer: "A loose connection is a team-building exercise.",
		});
		app.audio.music?.("title");
	}
	app.title = title;
	function caseSelect(campaign = false) {
		const defs = Object.values(B.CONTENT);
		setPage("cases", {
			kicker: "DISPATCH BOARD",
			title: campaign ? "A city-sized first shift" : "Choose a case",
			text: campaign
				? "Start with the safe workbench, then take three calls across the city. Training can be skipped."
				: "Every case is available. Retry a saved seed or make a fresh dispatch.",
			actions: defs
				.map((c, i) => ({
					label: `${i === 0 ? "TRAINING" : `CASE 0${i}`} · ${c.title}`,
					fn: () => brief(c.id),
					primary: i === (campaign ? 0 : 1),
				}))
				.concat([["Back to title", title]]),
			back: title,
		});
	}
	function brief(caseId, seed = randomSeed()) {
		const c = B.CONTENT[caseId];
		app.pendingCase = caseId;
		app.seed = seed;
		setPage("brief", {
			kicker: c.subtitle,
			title: c.title,
			text: c.brief,
			sections: [
				["Dispatch", c.intro],
				[
					"Your shift",
					caseId === "training"
						? "Safe practice · one board · one digit"
						: `${Math.floor(c.duration / 60)} minute fuse · ${c.boardCount} sectors · ${c.digits} digit${c.digits > 1 ? "s" : ""}`,
				],
			],
			actions: [
				["Open the device", () => startCase(caseId, seed)],
				...(caseId === "training"
					? [["Skip training · waterfront", () => brief("waterfront")]]
					: []),
				["Case select", () => caseSelect(false)],
			],
			back: () => caseSelect(false),
		});
	}
	function startCase(caseId, seed = randomSeed(), snapshot = null) {
		cancelHold();
		app.state = snapshot || B.Sim.create(caseId, seed, [0]);
		app.seed = app.state.seed;
		app.lastEvent = snapshot?.eventId || 0;
		proposalSeen = null;
		app.boardId = null;
		app.focusTarget = null;
		app.tool = "cut";
		resultShown = false;
		lastTaunt = 0;
		revisionShown = -1;
		justStarted = now();
		app.screen = "evidence";
		ui.hide();
		nativeResume();
		app.audio.suspend?.(false);
		if (game.sceneName !== "play") game.go("play", null, { fade: 0 });
		game.live = !!app.net?.online;
		game.o.autoPause = !app.net?.online;
		if (game.scene) game.scene.pausable = true;
		if (!app.net?.online && game.settings.candidates)
			command({ type: "assist", enabled: true });
		progress.seeds[caseId] = seed;
		save();
		message(B.CONTENT[caseId].intro, "PIP", true);
		app.audio.music?.("investigation");
		openEvidence();
	}
	app.startCase = startCase;
	function openEvidence() {
		if (!app.state) {
			help();
			return;
		}
		if (app.attract) return;
		cancelHold();
		app.boardId = null;
		app.focusTarget = null;
		const s = app.state,
			count = s.boards.filter((b) => b.complete).length,
			gate = s.caseId === "training" ? 1 : 2;
		setPage("evidence", {
			kicker: `${B.CONTENT[s.caseId].subtitle} · SHARED EVIDENCE`,
			title: "Read the gaps. Pick a sector.",
			text: "Bright = lit. A dash = confirmed dark. ? = unknown. Every repaired sector publishes a truthful patch.",
			actions: [
				{
					label:
						count >= gate
							? "Enter disarm code"
							: `Code locked · complete ${gate} sectors`,
					disabled: count < gate,
					fn: () => codeEntry(),
				},
				["Stencil alphabet", () => glyphReference()],
				["Field manual", () => help()],
				[
					"Pause / settings",
					() => {
						ui.hide();
						game.menu();
					},
				],
				...(app.net?.online
					? []
					: [["Return to dispatch", () => confirmQuit()]]),
			],
			back: () => {
				const claimed = s.boards.find((b) => b.claim === seat() && !b.complete);
				if (claimed) openBoard(claimed.id);
				else game.menu();
			},
		});
		addPanel(evidenceRow());
		const grid = el("div", "bu-sectors");
		for (const b of s.boards) {
			const owner =
				b.claim !== null
					? app.net?.roster?.find((p) => p.id === b.claim)?.name ||
						`Technician ${Number(b.claim) + 1}`
					: null;
			const btn = el(
				"button",
				(b.complete ? "done " : "") + (b.fire || b.recovery ? "hazard" : ""),
			);
			btn.dataset.board = b.id;
			btn.append(
				el(
					"strong",
					"",
					`${b.complete ? "✓ " : b.fire ? "FIRE · " : ""}${b.id} · ${b.name}`,
				),
				el(
					"small",
					"",
					`Digit ${b.digit + 1} · ${b.complete ? "evidence published" : b.recovery ? `RESTORE · ${Math.ceil(b.recovery.remaining)}s` : owner ? `${owner} · observe` : b.rule === "jumper" ? "jumper repair" : "diagnose replacement"}`,
				),
			);
			btn.disabled = b.complete;
			btn.onclick = () => openBoard(b.id);
			grid.appendChild(btn);
		}
		addPanel(grid);
		const first = grid.querySelector("button:not(:disabled)");
		if (first) first.focus({ preventScroll: true });
		revisionShown = s.revision;
	}
	app.openEvidence = openEvidence;
	function openBoard(id) {
		const b = app.state?.boards.find((q) => q.id === id);
		if (!b || b.complete) return;
		if (b.claim === null || b.claim === seat())
			command({ type: "claim", board: id });
		ui.hide();
		nativeResume();
		app.audio.suspend?.(false);
		app.screen = "work";
		app.boardId = id;
		app.tool = "cut";
		app.focusTarget = null;
		app.observing = b.claim !== seat();
		message(
			app.observing
				? "Quiet observation. This board belongs to another technician."
				: B.Sim.instruction(app.state, id),
			"PIP",
			true,
		);
		const next = app.art
			.targets(app.state, view())
			.find((t) => t.componentId === b.order[b.step] && t.kind === "terminal");
		app.focusTarget = next?.id || app.art.targets(app.state, view())[0]?.id;
		hud.hidden = false;
	}
	app.openBoard = openBoard;
	function help() {
		setPage("help", {
			kicker: "UNION FIELD MANUAL",
			title: "Little things, in the right order",
			sections: [
				[
					"1 · Follow Pip’s order",
					"Choose a sector. Cut the ordered component’s two round leads. Grip the body to remove it. Grip a spare in the tray and place it into the empty socket.",
				],
				[
					"2 · Diagnose and join",
					"Jumpers are straight wire. Other boards match SHAPE or COLOR/PATTERN. Select a spare and test it with Inspect. Hold the iron on each terminal and release in the green safe band.",
				],
				[
					"3 · Recover",
					"Wrong cut: solder the marked joint before its deadline. Wrong part: grip it back out and reuse the tray. Fire: hold foam on the fire marker. Leaving a board preserves every hazard.",
				],
				[
					"4 · Deduce and dare",
					"Repair evidence sectors, compare their 4×5 stencils, then choose digits. The next confirmation submits. An incorrect code ends the case. Dark cells count as evidence.",
				],
			],
			keys: [
				[game.input.label("apply"), "Apply / hold; release in the safe band"],
				[game.input.label("inspect"), "Test spare / inspect"],
				[game.input.label("repeatOrder"), "Repeat current instruction"],
				[game.input.label("evidence"), "Evidence and board selection"],
				["1–4 / L1–R1", "Choose physical tool"],
				["WASD / D-pad", "Snap between targets"],
			],
			actions: [
				["Stencil alphabet", glyphReference],
				["Back", () => ui.back()],
			],
		});
	}
	function glyphReference() {
		setPage("alphabet", {
			kicker: "THE EXACT CODE ALPHABET",
			title: "Ten digits. Twenty cells each.",
			text: "These are the same cells the device uses. A confirmed dark cell rules out a digit just as surely as a lit cell.",
			actions: [["Back", () => ui.back()]],
		});
		const grid = el("div", "bu-help-glyphs");
		B.GLYPHS.forEach((g, i) => {
			const d = el("div", "bu-digit-block");
			d.append(stencil(g), el("small", "", String(i)));
			grid.appendChild(d);
		});
		addPanel(grid);
	}
	function codeEntry() {
		if (app.state?.status !== "active") return;
		const s = app.state;
		if (app.codeDraft.length !== s.evidence.length)
			app.codeDraft = s.evidence.map(() => 0);
		setPage("code", {
			kicker: "DISARM CONSOLE · SELECT DIGITS",
			title: "A small act of courage.",
			text: "Choose the exact stencil. This screen only selects; the next screen submits.",
			actions: [
				["Review this code", () => confirmCode()],
				["Back to evidence", openEvidence],
			],
			back: openEvidence,
		});
		addPanel(evidenceRow());
		const dials = el("div", "bu-dials");
		app.codeDraft.forEach((value, i) => {
			const d = el("div", "bu-dial"),
				b = el("button", "", String(value)),
				preview = stencil(B.GLYPHS[value]);
			b.setAttribute("aria-label", `Digit ${i + 1}: ${value}`);
			b.dataset.digit = i;
			b._cycle = (delta) => {
				app.codeDraft[i] = (app.codeDraft[i] + delta + 10) % 10;
				b.textContent = String(app.codeDraft[i]);
				b.setAttribute("aria-label", `Digit ${i + 1}: ${app.codeDraft[i]}`);
				preview.replaceWith(stencil(B.GLYPHS[app.codeDraft[i]]));
				codeEntry();
				ui.root.querySelector(`[data-digit="${i}"]`)?.focus();
			};
			b.onclick = () => b._cycle(1);
			d.append(el("small", "bu-note", `DIGIT ${i + 1} · ◂ ▸`), b, preview);
			dials.appendChild(d);
		});
		addPanel(dials);
		dials.querySelector("button")?.focus();
	}
	function confirmCode() {
		setPage("confirm-code", {
			kicker: "FINAL CONFIRMATION",
			title: `Submit ${app.codeDraft.join("")}?`,
			text: app.net?.online
				? "Your confirmation proposes this code to the crew. Others have five seconds to accept or veto. The fuse continues."
				: "A wrong code triggers the device. You can return to the evidence and keep working.",
			actions: [
				["Keep checking", openEvidence],
				{
					label: `CONFIRM · SUBMIT ${app.codeDraft.join("")}`,
					fn: () => {
						ui.hide();
						command({ type: "propose", code: app.codeDraft.slice() });
						if (app.state.status === "active") openEvidence();
					},
					primary: false,
				},
			],
			back: codeEntry,
		});
	}
	function votePanel() {
		const p = app.state?.proposal;
		if (!p) return;
		setPage("vote", {
			kicker: "CREW DECISION · FUSE CONTINUES",
			title: `Submit ${p.code?.join("") || "the proposed code"}?`,
			text: "Any veto cancels. Unanimous acceptance submits now; a strict majority may submit at the five-second deadline.",
			actions: [
				[
					"Accept code",
					() => {
						command({ type: "vote", accept: true });
						ui.hide();
						openEvidence();
					},
				],
				[
					"Veto · keep working",
					() => {
						command({ type: "vote", accept: false });
						ui.hide();
						openEvidence();
					},
				],
			],
			back: () => {
				command({ type: "vote", accept: false });
				openEvidence();
			},
		});
	}
	function confirmQuit() {
		setPage("quit", {
			kicker: "CLOCKING OUT?",
			title: "Leave this device?",
			text: "The current repair will be lost. Your completed case records are safe.",
			actions: [
				["Keep working", () => ui.back()],
				["Return to dispatch", title],
			],
			back: undefined,
		});
	}
	function results() {
		if (resultShown || !app.state) return;
		resultShown = true;
		cancelHold();
		app.boardId = null;
		const s = app.state,
			c = B.CONTENT[s.caseId],
			won = s.status === "won";
		app.screen = "results";
		app.audio.music?.(won ? "success" : "failure");
		message(won ? c.success : c.failure, "PIP", true);
		if (won && !app.attract && !app.net?.online && !s.modified) {
			if (!progress.completed.includes(s.caseId))
				progress.completed.push(s.caseId);
			progress.best[s.caseId] = Math.max(
				progress.best[s.caseId] || 0,
				s.result?.score || 0,
			);
			save();
		}
		const order = ["training", "waterfront", "relay", "central"],
			next = order[order.indexOf(s.caseId) + 1];
		setPage("results", {
			kicker: won
				? s.caseId === "central"
					? "THE CITY GETS ANOTHER MORNING"
					: "DISPOSAL COMPLETE"
				: "INCIDENT REPORT",
			title: won
				? "Clock stopped. City saved."
				: s.cause === "time-expired"
					? "The fuse ran out."
					: "That was the wrong code.",
			emblem: won ? "✓" : "×",
			text: won
				? c.ending
				: `${c.failure}\nCause: ${s.cause || "unknown"}. The same seed lets you learn from this device.`,
			stats: [
				[String(s.result?.score || 0), "TOTAL SCORE"],
				[formatTime(s.remaining), "FUSE SAVED"],
				[
					`${s.boards.filter((b) => b.complete).length}/${s.boards.length}`,
					"SECTORS",
				],
				[String(s.metrics?.mistakes || s.metrics?.errors || 0), "MISTAKES"],
			],
			sections: [
				[
					"Score breakdown",
					`Disposal ${s.result?.cards?.disposal || 0} + fuse time ${s.result?.cards?.time || 0} + clean work ${s.result?.cards?.clean || 0} + early inference ${s.result?.cards?.inference || 0}. Assistance and developer changes are labeled below.`,
				],
			],
			medals: [
				["Clean work", !(s.metrics?.mistakes || s.metrics?.errors)],
				["Assisted", !!s.assisted],
				["Developer modified", !!s.modified],
			],
			actions: [
				...(won && next && !app.net?.online
					? [
							[
								next === "waterfront"
									? "Begin first dispatch"
									: "Next dispatch",
								() => brief(next),
							],
						]
					: []),
				...(!app.net?.online
					? [
							["Retry same device", () => brief(s.caseId, s.seed)],
							["Fresh device", () => brief(s.caseId)],
							["Case select", () => caseSelect(false)],
						]
					: []),
				["About & acknowledgments", () => credits(0)],
				...(app.net.mode === "hub" ? [] : [["Return to title", title]]),
			],
			back: app.net.mode === "hub" ? () => {} : title,
		});
	}
	function formatTime(t) {
		t = Math.max(0, Math.ceil(t || 0));
		return `${Math.floor(t / 60)
			.toString()
			.padStart(2, "0")}:${(t % 60).toString().padStart(2, "0")}`;
	}
	function onlineMenu() {
		setPage("online", {
			kicker: "ONE DEVICE · UP TO FOUR TECHNICIANS",
			title: "Cooperative dispatch",
			text: "Claim different sectors. Share truthful evidence. Decide the final code together. Cloud signaling connects standalone crews; some networks may require a TURN relay.",
			actions: [
				[
					"Host a dispatch",
					async () => {
						setPage("connecting", {
							title: "Calling the crew…",
							text: "Opening secure PeerJS Cloud signaling.",
							actions: [
								[
									"Cancel",
									() => {
										app.net.leave();
										onlineMenu();
									},
								],
							],
						});
						try {
							await app.net.host();
							lobby();
						} catch (e) {
							networkError(e);
						}
					},
				],
				["Join a crew", () => joinMenu()],
				["Back", title],
			],
			back: title,
		});
	}
	const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
	let roomDraft = "AAAAAA";
	function joinMenu() {
		setPage("join", {
			kicker: "ENTER SIX-CHARACTER ROOM CODE",
			title: "Find your crew",
			text: "Turn each character with left/right, then connect. Keyboard users may paste a room code below.",
			actions: [
				[
					"Connect to room",
					async () => {
						try {
							setPage("connecting", {
								title: "Connecting…",
								text: `Looking for ${roomDraft}.`,
								actions: [
									[
										"Cancel",
										() => {
											app.net.leave();
											joinMenu();
										},
									],
								],
							});
							await app.net.join(roomDraft);
							lobby();
						} catch (e) {
							networkError(e);
						}
					},
				],
				["Back", onlineMenu],
			],
			back: onlineMenu,
		});
		const row = el("div", "bu-code-entry");
		roomDraft.split("").forEach((ch, i) => {
			const b = el("button", "", ch);
			b._cycle = (d) => {
				roomDraft =
					roomDraft.slice(0, i) +
					alphabet[
						(alphabet.indexOf(roomDraft[i]) + d + alphabet.length) %
							alphabet.length
					] +
					roomDraft.slice(i + 1);
				b.textContent = roomDraft[i];
			};
			b.onclick = () => b._cycle(1);
			row.appendChild(b);
		});
		addPanel(row);
		const input = el("input", "bu-json");
		input.type = "text";
		input.value = roomDraft;
		input.maxLength = 6;
		input.style.height = "40px";
		input.setAttribute("aria-label", "Paste room code");
		input.oninput = () => {
			roomDraft = input.value
				.toUpperCase()
				.replace(/[^A-Z2-9]/g, "")
				.slice(0, 6);
		};
		addPanel(input);
	}
	function lobby() {
		setPage("lobby", {
			kicker: "COOPERATIVE DISPATCH",
			title: app.net.code ? `Room ${app.net.code}` : "Crew connected",
			text: () =>
				`${app.net.status}\n${app.net.roster.map((p) => p.name).join(" · ")}\nWorkload and fuse lock when dispatch begins.`,
			actions: app.net.authority
				? [
						[
							"Dispatch · waterfront",
							() => app.net.start("waterfront", randomSeed()),
						],
						[
							"Dispatch · power relay",
							() => app.net.start("relay", randomSeed()),
						],
						[
							"Dispatch · central",
							() => app.net.start("central", randomSeed()),
						],
						[
							"Close room",
							() => {
								app.net.leave();
								onlineMenu();
							},
						],
					]
				: [
						["Waiting for host · refresh", lobby],
						[
							"Leave crew",
							() => {
								app.net.leave();
								onlineMenu();
							},
						],
					],
			back: () => {
				app.net.leave();
				onlineMenu();
			},
		});
	}
	function networkError(e) {
		setPage("connection-error", {
			kicker: "RADIO CONTACT LOST",
			title: "The crew could not connect.",
			text: `${String(e?.message || e)}\nCheck the room code and network connection. Try hosting from the other device; restrictive networks may need a TURN relay.`,
			actions: [
				["Try again", onlineMenu],
				["Back to title", title],
			],
			back: title,
		});
	}
	app.net = new B.Network({
		onState: (s) => {
			app.state = s;
		},
		onStart: (s) => {
			ui.hide();
			startCase(s.caseId, s.seed, s);
		},
		onStatus: (text) => {
			if (app.screen === "lobby") lobby();
			else if (app.state?.status === "active") ui.toast("Crew radio", text, 3);
		},
		onRoster: () => {
			if (app.screen === "lobby") lobby();
		},
		onEnd: (reason) => {
			cancelHold();
			app.audio.suspend?.();
			if (app.state && app.state.status !== "active") return;
			setPage("network-ended", {
				kicker: "DISPATCH CLOSED",
				title: "The radio has gone quiet.",
				text: String(reason || "The host ended the dispatch."),
				actions: [
					...(app.net.mode === "guest"
						? [
								[
									"Reconnect to crew",
									async () => {
										try {
											await app.net.reconnect();
											if (app.net.running && app.net.state)
												startCase(
													app.net.state.caseId,
													app.net.state.seed,
													app.net.state,
												);
											else lobby();
										} catch (e) {
											networkError(e);
										}
									},
								],
							]
						: []),
					["Return to title", title],
				],
				back: title,
			});
		},
	});
	function credits(page = 0) {
		const report = B.REPORT;
		const groups = [
			[
				"Source Information",
				Object.entries(
					report?.sourceInformation || {
						source: "Bomb Squad (1982)",
						plan: "PLAN.md",
					},
				).map(([k, v]) => [k, v]),
			],
			[
				"Testing Feedback",
				(report?.testingFeedback || ["unknown"]).map((v, i) => [
					String(i + 1),
					v,
				]),
			],
			[
				"Engine Feedback",
				(report?.engineFeedback || ["unknown"]).map((v, i) => [
					String(i + 1),
					v,
				]),
			],
			[
				"Prompt Feedback",
				(report?.promptFeedback || ["unknown"]).map((v, i) => [
					String(i + 1),
					v,
				]),
			],
			[
				"Credits & licenses",
				[
					[
						"Original game",
						"Bomb Squad (1982), Mattel Electronics. Source manual and creator history: Blue Sky Rangers. This is an original homage, not an official sequel.",
					],
					[
						"Bomb Union",
						"Original design, code, content, native pixel art, animations and procedural sound produced with Codex. Partner: Pip. Saboteur: Dr. Tick. Response crew: municipal union Local 1982.",
					],
					[
						"Engine",
						"my-3D2dge v0.89.1, Michael Crosato, MIT. Unmodified engine; game-owned native extensions.",
					],
					[
						"Networking",
						"AI Hub session protocol 1 / client 1.4.0. PeerJS 1.5.5, MIT.",
					],
					[
						"Acknowledgments",
						"The Blue Sky Rangers preserve the manuals and design history that made this repair-and-deduction homage possible.",
					],
					["Usage", "added on import"],
				],
			],
		];
		const pages = groups.flatMap(([name, items]) => {
			const size = name === "Credits & licenses" ? 3 : 2;
			return Array.from({ length: Math.ceil(items.length / size) }, (_, i) => [
				name + (items.length > size ? ` · ${i + 1}` : ""),
				items.slice(i * size, i * size + size),
			]);
		});
		page = (page + pages.length) % pages.length;
		const [name, items] = pages[page];
		setPage("credits", {
			kicker: `ABOUT BOMB UNION · ${page + 1} / ${pages.length}`,
			title: name,
			sections: items.map(([k, v]) => [k, String(v)]),
			actions: [
				["Next page", () => credits(page + 1)],
				["Previous page", () => credits(page - 1)],
				["Back", () => ui.back()],
			],
			back: undefined,
		});
	}
	app.credits = credits;
	const tuningLabels = {
		timeScale: "Simulation speed",
		fuseScale: "Authored fuse scale",
		solderMin: "Safe band begins",
		solderMax: "Safe band ends",
		heatGain: "Iron heat gain",
		cooling: "Board cooling",
		recoveryWindow: "Recovery window",
		penalty: "Mistake time penalty",
		fireIntensity: "Fire intensity",
		extinguishTime: "Foam hold time",
		hintDelay: "Guidance delay",
		precision: "Snap precision",
		toolTravel: "Tool travel speed",
		maxHold: "Maximum hold",
		testCost: "Diagnosis time cost",
	};
	for (const [key, range] of Object.entries(B.TUNING_RANGES)) {
		game.settings.define({
			key: `dev_${key}`,
			label: tuningLabels[key] || key,
			type: "slider",
			value: B.DEFAULTS[key],
			min: range[0],
			max: range[1],
			step: range[1] <= 5 ? 0.05 : 1,
			group: "Workbench",
			apply: (_, value) => {
				if (
					app.state &&
					app.net?.mode !== "hub" &&
					(!app.net?.online || app.net.authority)
				)
					command({ type: "tune", values: { [key]: value } });
			},
		});
	}
	function openDev() {
		const allowed =
			app.net.mode !== "hub" && (!app.net.online || app.net.authority);
		setPage("dev", {
			kicker: allowed
				? "DEVELOPER WORKBENCH · MODIFIED RUNS LABELED"
				: "LIVE HUB · INSPECTION ONLY",
			title: "Make the invisible inspectable.",
			text: app.state
				? `Case ${app.state.caseId} · seed ${app.state.seed} · revision ${app.state.revision}\nSeat ${seat()} · ${app.net.status}\n${board() ? B.Sim.instruction(app.state, app.boardId) : "Choose a board to inspect its physical state."}`
				: "Start a case to inspect, tune, or author a scratch board.",
			actions: [
				{
					label: "Live balance sliders",
					disabled: !allowed || !app.state,
					fn: () => tuningPage(0),
				},
				{
					label: "Board / case authoring",
					disabled: !allowed || app.net.online,
					fn: () => openEditor(),
				},
				{
					label: "Inspect physical state",
					disabled: !app.state,
					fn: () => inspectState(),
				},
				{
					label: "Checkpoint current device",
					disabled: !allowed || !app.state || app.net.online,
					fn: () => {
						app.checkpoint = B.Sim.snapshot(app.state);
						ui.toast(
							"Checkpoint stored",
							"Only this developer visit; ordinary records stay separate.",
						);
					},
				},
				{
					label: "Restore checkpoint",
					disabled: !allowed || !app.checkpoint || app.net.online,
					fn: () => {
						app.state = B.Sim.restore(app.checkpoint);
						app.state.modified = true;
						if (app.net.online) app.net.state = app.state;
						ui.hide();
						openEvidence();
					},
				},
				{
					label: "Step one second",
					disabled: !allowed || !app.state || app.net.online,
					fn: () => {
						B.Sim.advance(app.state, 1);
						app.state.modified = true;
						openDev();
					},
				},
				{
					label: "Add 60 fuse seconds",
					disabled: !allowed || !app.state,
					fn: () => {
						command({
							type: "dev",
							operation: "fuse",
							value: app.state.remaining + 60,
						});
						openDev();
					},
				},
				{
					label: "Inject fire on first board",
					disabled: !allowed || !app.state,
					fn: () => {
						command({
							type: "dev",
							operation: "fire",
							board:
								app.boardId || app.state.boards.find((b) => !b.complete)?.id,
						});
						ui.hide();
						openEvidence();
					},
				},
				{
					label: "Inject recoverable joint",
					disabled: !allowed || !app.state,
					fn: () => {
						command({
							type: "dev",
							operation: "fault",
							board:
								app.boardId || app.state.boards.find((b) => !b.complete)?.id,
						});
						ui.hide();
						openEvidence();
					},
				},
				{
					label: "Reveal evidence",
					disabled: !allowed || !app.state,
					fn: () => {
						command({ type: "dev", operation: "reveal" });
						ui.hide();
						openEvidence();
					},
				},
				{
					label: "Solve device",
					disabled: !allowed || !app.state,
					fn: () => {
						command({ type: "dev", operation: "solve" });
						ui.hide();
					},
				},
				{
					label: "Case and seed selector",
					disabled: !allowed || app.net.online,
					fn: () => devCaseSeed(),
				},
				["Return", () => ui.back()],
			],
			back: undefined,
		});
	}
	function tuningPage(page) {
		app.devApplying = true;
		const keys = Object.keys(B.TUNING_RANGES),
			part = keys.slice(page * 5, page * 5 + 5);
		setPage("tuning", {
			kicker: "LIVE BALANCE · CURRENT HOLD CANCELS ON CHANGE",
			title: `Balance ${page + 1} / ${Math.ceil(keys.length / 5)}`,
			text: "Changes apply immediately and mark this run. Fuse scale changes duration and preserves the fraction remaining. Changing a setting cancels the current hold.",
			rows: part.map((k) => `dev_${k}`),
			actions: [
				[
					"Next settings",
					() => tuningPage((page + 1) % Math.ceil(keys.length / 5)),
				],
				[
					"Reset all balance defaults",
					() => {
						game.settings.reset("Workbench");
						command({ type: "tune", values: { ...B.DEFAULTS } });
						tuningPage(page);
					},
				],
				[
					"Back to workbench",
					() => {
						app.devApplying = false;
						openDev();
					},
				],
			],
			back: () => {
				app.devApplying = false;
				openDev();
			},
		});
	}
	function inspectState() {
		const s = app.state;
		setPage("inspection", {
			kicker: "READ-ONLY SIMULATION INSPECTION",
			title: `${s.caseId} · revision ${s.revision}`,
			sections: [
				[
					"Authority",
					`${app.net.mode} · local seat ${seat()} · host ${app.net.authority} · ${app.net.status}`,
				],
				[
					"Code and candidates",
					`Hidden code ${s.code.join("")}\nRevealed candidates: ${s.evidence.map((x) => B.Sim.candidates(x).join("/")).join(" · ")}`,
				],
				...s.boards.map((b) => [
					`${b.id} · ${b.name}`,
					`owner ${b.claim} · step ${b.step}/${b.order.length} · heat ${b.heat.toFixed(1)} · fire ${b.fire}\n${b.components.map((c) => `${c.id}: cuts ${c.cuts.map(Number)}; removed ${c.removed}; part ${c.part}; joints ${c.joints.map(Number)}`).join("\n")}`,
				]),
				[
					"Input",
					`${game.input.lastDevice} · held ${[...game.input.held].join(", ")}`,
				],
			],
			actions: [["Back to workbench", openDev]],
			back: openDev,
		});
	}
	function devCaseSeed() {
		let seed = app.state?.seed || 1;
		setPage("dev-case", {
			kicker: "SCRATCH DISPATCH",
			title: "Case and seed",
			text: "Choose a case below. Edit the seed using left/right or the keyboard. Developer dispatches are labeled modified.",
			actions: Object.values(B.CONTENT)
				.map((c) => [
					c.title,
					() => {
						startCase(c.id, seed);
						app.state.modified = true;
					},
				])
				.concat([["Back", openDev]]),
			back: openDev,
		});
		const input = el("input", "bu-json");
		input.type = "number";
		input.value = seed;
		input.min = 0;
		input.max = 4294967295;
		input.style.height = "40px";
		input.setAttribute("aria-label", "Case seed");
		input.oninput = () => (seed = Number(input.value) >>> 0);
		addPanel(input);
	}
	let edit = null,
		editComponent = 0,
		editSeed = 1;
	function openEditor() {
		if (!edit) {
			const scratch = B.Sim.create("relay", 1, [0]);
			edit = B.Sim.exportTemplate(scratch.boards[0]);
		}
		app.editing = true;
		editorPage();
	}
	function editorPage() {
		const c = edit.components[editComponent];
		for (const [key, label, min, max, value] of [
			["ex", "Component X", -90, 90, c.x],
			["ey", "Component Y", -50, 50, c.y],
			["el", "Left terminal offset", -35, -6, c.terminals?.[0]?.[0] ?? -18],
			["er", "Right terminal offset", 6, 35, c.terminals?.[1]?.[0] ?? 18],
			["ed", "Scratch fuse seconds", 60, 900, edit.duration || 300],
		])
			game.settings.define({
				key,
				label,
				type: "slider",
				min,
				max,
				value,
				step: 1,
				group: "Controls",
				apply: (_, v) => {
					if (!app.editorApplying) return;
					if (key === "ex") c.x = v;
					if (key === "ey") c.y = v;
					if (key === "el") {
						c.terminals ||= [
							[-18, 0],
							[18, 0],
						];
						c.terminals[0][0] = v;
					}
					if (key === "er") {
						c.terminals ||= [
							[-18, 0],
							[18, 0],
						];
						c.terminals[1][0] = v;
					}
					if (key === "ed") edit.duration = v;
				},
			});
		app.editorApplying = true;
		setPage("editor", {
			kicker: "VERSIONED SCRATCH CONTENT · ORIGINALS ARE SAFE",
			title: `Author: ${edit.name}`,
			text: `Selected ${c.id} · ${c.shape} · ${c.color}/${c.pattern}\nOrder: ${edit.order.join(" → ")} · Rule: ${edit.rule}\nPaint the reward cells below. A scratch board must identify its digit.`,
			rows: ["ex", "ey", "el", "er", "ed"],
			actions: [
				[
					"Select next component",
					() => {
						editComponent = (editComponent + 1) % edit.components.length;
						editorPage();
					},
				],
				[
					"Cycle source shape",
					() => {
						const types = ["resistor", "capacitor", "chip"];
						c.shape = types[(types.indexOf(c.shape) + 1) % 3];
						editorPage();
					},
				],
				[
					"Cycle source color/pattern",
					() => {
						const colors = Object.keys(B.COLORS);
						c.color = colors[(colors.indexOf(c.color) + 1) % colors.length];
						c.pattern = B.COLORS[c.color].pattern;
						editorPage();
					},
				],
				[
					"Cycle matching rule",
					() => {
						edit.rule =
							edit.rule === "shape"
								? "color"
								: edit.rule === "color"
									? "jumper"
									: "shape";
						for (const q of edit.components)
							q.kind = edit.rule === "jumper" ? "jumper" : "replace";
						rebuildEditorStock();
						editorPage();
					},
				],
				[
					"Reveal full stencil mask",
					() => {
						edit.mask = Array.from({ length: 20 }, (_, i) => i);
						editorPage();
					},
				],
				[
					"Rotate required order",
					() => {
						edit.order.push(edit.order.shift());
						editorPage();
					},
				],
				[
					"Rebuild compatible spare tray",
					() => {
						rebuildEditorStock();
						editorPage();
					},
				],
				[
					"Load next authored template",
					() => {
						editSeed++;
						const s = B.Sim.create(
							editSeed % 2 ? "relay" : "central",
							editSeed,
							[0],
						);
						edit = B.Sim.exportTemplate(s.boards[editSeed % s.boards.length]);
						editComponent = 0;
						editorPage();
					},
				],
				[
					"Validate scratch content",
					() => {
						const errors = B.Sim.validateScratch(edit, editSeed);
						ui.toast(
							errors.length ? "Content rejected" : "Content valid",
							errors.join("\n") ||
								"Sockets, order, stock and evidence route verified.",
						);
					},
				],
				[
					"Playtest scratch copy",
					() => {
						const errors = B.Sim.validateScratch(edit, editSeed);
						if (errors.length) {
							ui.toast("Content rejected", errors.join("\n"));
							return;
						}
						try {
							app.state = B.Sim.createScratch(edit, editSeed);
							app.state.seats = [0];
							app.state.modified = true;
							app.net.state = null;
							app.lastEvent = 0;
							resultShown = false;
							app.editing = false;
							app.editorApplying = false;
							ui.hide();
							nativeResume();
							app.audio.suspend?.(false);
							openEvidence();
						} catch (e) {
							ui.toast("Content rejected", e.message);
						}
					},
				],
				["JSON import / export", editorJSON],
				[
					"Back to workbench",
					() => {
						app.editorApplying = false;
						app.editing = false;
						openDev();
					},
				],
			],
			back: () => {
				app.editorApplying = false;
				app.editing = false;
				openDev();
			},
		});
		const paint = el("div", "bu-editor-grid");
		for (let i = 0; i < 20; i++) {
			const b = el(
				"button",
				edit.mask.includes(i) ? "painted" : "",
				String(i + 1),
			);
			b.setAttribute("aria-label", `Evidence cell ${i + 1}`);
			b.onclick = () => {
				edit.mask = edit.mask.includes(i)
					? edit.mask.filter((x) => x !== i)
					: edit.mask.concat(i);
				editorPage();
			};
			paint.appendChild(b);
		}
		addPanel(paint);
	}
	function rebuildEditorStock() {
		edit.spares = edit.components.map((q, i) => ({
			id: `S${i + 1}`,
			shape:
				edit.rule === "jumper"
					? "jumper"
					: edit.rule === "shape"
						? q.shape
						: ["resistor", "capacitor", "chip"][(i + 1) % 3],
			color:
				edit.rule === "color"
					? q.color
					: ["amber", "coral", "cyan"][(i + 1) % 3],
			pattern:
				B.COLORS[
					edit.rule === "color"
						? q.color
						: ["amber", "coral", "cyan"][(i + 1) % 3]
				].pattern,
			jumper: edit.rule === "jumper",
		}));
	}
	function editorJSON() {
		setPage("editor-json", {
			kicker: "BOMB-UNION-1 · SCRATCH SAVE",
			title: "Import or export a board",
			text: "Export downloads a versioned JSON file. Import validates before replacing the scratch copy.",
			actions: [
				[
					"Export JSON",
					() => {
						const text = JSON.stringify(edit, null, 2),
							blob = new Blob([text], { type: "application/json" }),
							url = URL.createObjectURL(blob),
							a = document.createElement("a");
						a.href = url;
						a.download = "bomb-union-board.json";
						a.click();
						URL.revokeObjectURL(url);
						ui.toast(
							"Scratch exported",
							"bomb-union-board.json saved. Original cases are unchanged.",
						);
					},
				],
				[
					"Import text",
					() => {
						try {
							const value = JSON.parse($("#bu-editor-json").value),
								errors = B.Sim.validateTemplate(value);
							if (errors.length) throw new Error(errors.join("\n"));
							edit = value;
							editComponent = 0;
							ui.toast("Scratch imported", "Validated and ready to playtest.");
							editorPage();
						} catch (e) {
							ui.toast("Import rejected", e.message);
						}
					},
				],
				["Back to editor", editorPage],
			],
			back: editorPage,
		});
		const area = el("textarea", "bu-json");
		area.id = "bu-editor-json";
		area.value = JSON.stringify(edit, null, 2);
		area.setAttribute("aria-label", "Board JSON");
		addPanel(area);
	}
	function updateHUD() {
		const s = app.state,
			b = board();
		app.observing = !!b && b.claim !== seat();
		if (!s || app.screen !== "work" || (ui.screen && !app.attract)) {
			hud.hidden = true;
			return;
		}
		hud.hidden = false;
		const touch = game.input.lastDevice === "touch";
		hud.classList.toggle("bu-touch", touch);
		H.case.textContent = `${b?.id || ""} · ${b?.name || B.CONTENT[s.caseId].title}`;
		H.fuse.textContent = formatTime(s.remaining);
		H.fuseBox.classList.toggle("urgent", s.remaining < 60);
		H.order.textContent = b
			? B.Sim.instruction(s, b.id)
			: "Choose an evidence sector.";
		H.next.textContent = b
			? `ORDER ${b.order.join(" → ")} · ${b.ruleKnown ? `${b.rule.toUpperCase()} MATCH` : "TEST TO DISCOVER RULE"}`
			: "";
		H.caption.textContent = app.caption;
		H.speaker.textContent =
			app.speaker === "DR. TICK"
				? "DR. TICK · UNINVITED CONSULTANT"
				: "PIP · TECHNICAL PARTNER";
		H.online.textContent = app.net.online
			? `${app.net.mode.toUpperCase()} · ${s.party} CREW · FUSE CONTINUES IN MENUS`
			: app.attract
				? "DEMONSTRATION · SEPARATE DEVICE"
				: "";
		const signature = JSON.stringify(s.evidence);
		if (H.evidence.dataset.sig !== signature) {
			H.evidence.dataset.sig = signature;
			H.evidence.replaceChildren(
				...s.evidence.map((x) => stencil(x)),
				el(
					"span",
					"",
					`${game.input.label("evidence")} EVIDENCE\n${s.boards.filter((x) => x.complete).length} SECTORS SECURE`,
				),
			);
		}
		H.heat.hidden = !b;
		H.heatText.textContent = b ? `${Math.round(b.heat)}%` : "";
		H.heatFill.style.width = `${Math.min(100, b?.heat || 0)}%`;
		const hazards = s.boards.filter((x) => x.fire || x.recovery);
		H.alert.hidden = !hazards.length;
		H.alert.textContent = hazards
			.map(
				(x) =>
					`${x.id} ${x.fire ? "FIRE · FOAM REQUIRED" : `RECOVER ${Math.ceil(x.recovery.remaining)}s · RESOLDER`}`,
			)
			.join(" · ");
		const t = target();
		H.context.textContent = app.observing
			? "OBSERVING · this technician owns the board"
			: t
				? `${game.input.label("apply")} ${t.label || t.kind}  ·  ${game.input.label("inspect")} test  ·  ${game.input.label("repeatOrder")} repeat`
				: "Aim at a round lead, component body, or spare.";
		toolButtons.forEach((button, i) => {
			button.classList.toggle("active", app.tool === tools[i]);
			const act = ["toolCut", "toolGrip", "toolSolder", "toolExtinguish"][i];
			button.querySelector("kbd").textContent =
				game.input.lastDevice === "gamepad"
					? i === 0
						? "L1"
						: i === 3
							? "R1"
							: i + 1
					: game.input.label(act);
		});
		H.hold.hidden = !b?.hold;
		if (b?.hold) {
			const max =
				b.hold.tool === "solder"
					? Math.max(1.5, s.tuning.solderMax * 1.4)
					: s.tuning.extinguishTime * 1.3;
			H.fill.style.width = `${(b.hold.duration / max) * 100}%`;
			H.safe.style.left = `${((b.hold.tool === "solder" ? s.tuning.solderMin : s.tuning.extinguishTime) / max) * 100}%`;
			H.safe.style.width = `${((b.hold.tool === "solder" ? s.tuning.solderMax - s.tuning.solderMin : max - s.tuning.extinguishTime) / max) * 100}%`;
			H.holdText.textContent =
				b.hold.tool === "solder"
					? "HOLD · RELEASE INSIDE GREEN BAND"
					: "HOLD FOAM · COVER THE FIRE";
		}
		H.touch.hidden = !touch || !t || app.observing || app.attract;
		if (!H.touch.hidden) {
			const portrait = innerHeight > innerWidth;
			H.touch.style.left = `${portrait ? innerWidth / 2 - 24 : innerWidth * 0.87 - 24}px`;
			H.touch.style.top = `${portrait ? innerHeight * 0.57 : innerHeight * 0.68}px`;
			H.touch.textContent =
				t.kind === "terminal"
					? b.recovery || b.components.find((q) => q.id === t.componentId)?.part
						? "SOLDER"
						: "CUT"
					: t.kind === "spare"
						? "PICK"
						: t.kind === "fire"
							? "FOAM"
							: b.held
								? "PLACE"
								: "GRIP";
		}
	}
	function focusDirection(dx, dy) {
		const targets = app.art.targets(app.state, view()),
			t = target();
		if (!t) {
			app.focusTarget = targets[0]?.id;
			return;
		}
		let best = null,
			score = Infinity;
		for (const q of targets) {
			const x = q.x - t.x,
				y = q.y - t.y,
				dot = x * dx + y * dy;
			if (dot < 3) continue;
			const cross = Math.abs(x * dy - y * dx),
				v = Math.hypot(x, y) + cross * 1.8;
			if (v < score) {
				score = v;
				best = q;
			}
		}
		if (best) {
			cancelHold();
			app.focusTarget = best.id;
			app.audio.effect?.("select");
		}
	}
	function workspaceInput() {
		const I = game.input;
		if (!canAct() || ui.screen) return;
		if (I.pressed("evidence")) {
			openEvidence();
			return;
		}
		if (I.pressed("repeatOrder"))
			message(B.Sim.instruction(app.state, app.boardId), "PIP", true);
		if (I.pressed("inspect")) inspect();
		if (I.pressed("previousTool"))
			setTool(tools[(tools.indexOf(app.tool) + 3) % 4]);
		if (I.pressed("nextTool"))
			setTool(tools[(tools.indexOf(app.tool) + 1) % 4]);
		["toolCut", "toolGrip", "toolSolder", "toolExtinguish"].forEach((a, i) => {
			if (I.pressed(a)) setTool(tools[i]);
		});
		if (I.pressed("drop")) {
			cancelHold();
			if (board()?.held) command({ type: "drop", board: app.boardId });
			else openEvidence();
			return;
		}
		for (const [act, dx, dy] of [
			["left", -1, 0],
			["right", 1, 0],
			["up", 0, -1],
			["down", 0, 1],
		])
			if (I.repeat(act, 0.32, 0.12)) focusDirection(dx, dy);
		const pointer = I.pointer(),
			click = I.clicked(),
			targets = app.art.targets(app.state, view());
		const aim = (p) => {
			if (!p) return null;
			let best = null,
				d = Infinity;
			for (const t of targets) {
				const distance = Math.hypot(t.x - p[0], t.y - p[1]);
				if (
					distance <
						Math.max(
							(t.radius || 12) *
								(app.state.tuning.precision || 1) *
								(I.down("precision") ? 1.5 : 1),
							I.lastDevice === "touch" ? 20 : 12,
						) &&
					distance < d
				) {
					d = distance;
					best = t;
				}
			}
			return best;
		};
		if (
			pointer &&
			(I.lastDevice === "mouse" || I.lastDevice === "touch") &&
			(!lastPointer ||
				Math.hypot(pointer[0] - lastPointer[0], pointer[1] - lastPointer[1]) >
					0.4)
		) {
			const hovered = aim(pointer);
			if (hovered && !actionHeld) app.focusTarget = hovered.id;
			lastPointer = pointer;
		}
		if (click) {
			const selected = aim(click);
			if (selected) {
				app.focusTarget = selected.id;
				if (I.lastDevice === "touch") {
					apply(selected, true);
				} else if (!I.pressed("apply") && !actionHeld) apply(selected);
			}
		}
		if (I.pressed("apply")) {
			if (I.lastDevice === "mouse") {
				const selected = aim(pointer);
				if (selected) {
					app.focusTarget = selected.id;
					apply(selected);
				}
			} else apply();
		}
		if (actionHeld && !touchAuto && I.released("apply")) endHold();
		if (touchAuto && board()?.hold) {
			const hold = board().hold,
				limit =
					hold.tool === "solder"
						? app.state.tuning.solderMin + 0.09
						: app.state.tuning.extinguishTime + 0.04;
			if (hold.duration >= limit) endHold();
		}
	}
	function attractStart() {
		if (
			app.net.online ||
			app.net.mode === "hub" ||
			app.editing ||
			document.activeElement?.tagName === "INPUT" ||
			document.activeElement?.tagName === "TEXTAREA"
		)
			return;
		app.attract = true;
		ui.hide();
		app.state = B.Sim.create(
			["training", "relay", "central"][attractCase % 3],
			7331 + attractCase,
			[0],
		);
		app.lastEvent = 0;
		app.boardId = app.state.boards[0].id;
		app.focusTarget = null;
		app.screen = "work";
		app.tool = "cut";
		attractClock = 0;
		_attractStage = 0;
		attractWait = 0;
		app.demo = document.createElement("div");
		app.demo.className = "bu-demo";
		app.demo.innerHTML =
			"BOMB UNION · NIGHT SHIFT DEMONSTRATION<small>Any input to clock in · repairs, diagnosis, hazards, evidence, disposal</small>";
		document.body.appendChild(app.demo);
		message(
			"Two cuts, one careful repair. Every little circuit tells part of the story.",
			"PIP",
			true,
		);
	}
	function wake() {
		app.demo?.remove();
		app.demo = null;
		app.attract = false;
		app.state = null;
		app.audio.suspend?.();
		game.input.clear();
		title();
	}
	function attractUpdate(dt) {
		const s = app.state;
		if (!s) return;
		attractClock += dt;
		B.Sim.advance(s, dt);
		if (s.status !== "active") {
			app.screen = "results";
			app.boardId = null;
			app.focusTarget = null;
			attractWait += dt;
			if (attractWait > 5) {
				attractCase++;
				app.demo?.remove();
				app.attract = false;
				attractStart();
			}
			return;
		}
		if (attractClock < 0.7) return;
		attractClock = 0;
		const b = s.boards.find((x) => !x.complete);
		if (!b) {
			B.Sim.command(s, 0, { type: "propose", code: s.code.slice() });
			return;
		}
		app.boardId = b.id;
		app.screen = "work";
		if (b.claim !== 0) B.Sim.command(s, 0, { type: "claim", board: b.id });
		if (b.hold) {
			const min =
				b.hold.tool === "solder" ? s.tuning.solderMin : s.tuning.extinguishTime;
			if (b.hold.duration >= min)
				B.Sim.command(s, 0, { type: "end", board: b.id });
			return;
		}
		if (b.rule !== "jumper" && !b.ruleKnown) {
			const spare = b.spares.find((p) => p.available);
			app.focusTarget = `spare:${spare.id}`;
			app.tool = "grip";
			B.Sim.command(s, 0, { type: "test", board: b.id, spare: spare.id });
			return;
		}
		const a = B.Sim.nextAction(s, b.id);
		if (a) {
			app.tool =
				a.type === "cut"
					? "cut"
					: a.type === "begin"
						? a.tool === "extinguish"
							? "extinguish"
							: "solder"
						: "grip";
			app.focusTarget =
				a.type === "pick"
					? `spare:${a.spare}`
					: a.type === "begin" && a.tool === "extinguish"
						? "fire"
						: a.component
							? `${a.component}:${a.terminal ?? "body"}`
							: app.focusTarget;
			B.Sim.command(s, 0, a);
		}
	}
	let proposalSeen = null;
	function update(dt) {
		if (!ui.screen && !app.attract) {
			if (app.state?.status === "active") {
				if (app.boardId) app.screen = "work";
				else openEvidence();
			} else if (app.state) {
				resultShown = false;
				results();
			} else if (!app.net.online && app.screen !== "title") title();
		}
		if (
			app.state?.status === "active" &&
			game.settings.candidates &&
			!app.state.assisted
		)
			command({ type: "assist", enabled: true });
		if (
			ui.screen === "settings" &&
			(app.net.mode === "hub" || (app.net.online && !app.net.authority))
		) {
			for (const label of Object.values(tuningLabels)) {
				const input = ui.root.querySelector(`input[aria-label="${label}"]`);
				if (input) {
					input.disabled = true;
					input.title = "Gameplay tuning requires standalone host authority.";
				}
			}
		}
		if (ui.screen === "evidence")
			for (const b of app.state?.boards || []) {
				if (b.recovery) {
					const note = ui.root.querySelector(`[data-board="${b.id}"] small`);
					if (note)
						note.textContent = `RESTORE · ${Math.ceil(b.recovery.remaining)}s · solder highlighted joint`;
				}
			}
		const I = game.input;
		const pad = I.padPrev || [];
		const padEdge = pad.some((on, i) => on && !lastPad[i]);
		lastPad = pad.slice();
		if (padEdge) {
			idleAt = now();
			if (app.attract) {
				wake();
				return;
			}
			app.audio.unlock?.();
		}
		app.net.tick(dt);
		if (
			["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName) &&
			document.activeElement.type !== "range"
		)
			for (const act of Object.keys(game.input.map)) game.input.suppress(act);
		if (app.attract) {
			attractUpdate(dt);
			events();
			app.art.update(dt, app.state, view());
			updateHUD();
			return;
		}
		if (
			app.screen === "title" &&
			ui.screen === "title" &&
			!app.net.online &&
			now() - idleAt >= 10000
		)
			attractStart();
		if (app.state) {
			if (!app.net.online && app.state.status === "active")
				B.Sim.advance(app.state, dt);
			events();
			if (app.state.status !== "active") {
				if (now() - justStarted > 500) results();
			} else {
				if (app.screen === "work") {
					workspaceInput();
					const b = board();
					if (b?.complete) {
						message(
							"Sector secure. Its clue cells are now on the evidence display.",
							"PIP",
							true,
						);
						openEvidence();
					} else if (
						b &&
						now() >
							stickyCaption +
								(app.state.tuning.hintDelay ?? game.settings.hintDelay) *
									1000 &&
						app.state.elapsed - lastTaunt > 45
					) {
						const c = B.CONTENT[app.state.caseId];
						message(
							c.taunts[Math.floor(app.state.elapsed / 45) % c.taunts.length],
							"DR. TICK",
						);
						lastTaunt = app.state.elapsed;
					}
				}
				const p = app.state.proposal;
				if (p && p.proposer !== seat() && proposalSeen !== p.id) {
					proposalSeen = p.id;
					votePanel();
				}
				if (!p && ui.screen === "vote") openEvidence();
				if (
					ui.screen === "evidence" &&
					app.state.revision !== revisionShown &&
					now() - lastHUD > 650
				) {
					lastHUD = now();
					openEvidence();
				}
			}
			app.audio.update?.(dt, app.state);
		}
		app.art.update(dt, app.state, view());
		updateHUD();
	}
	const draw = (r) => {
		app.art.draw(r, app.state, view());
		updateGlobalFuse();
	};
	game.debug = {
		snapshot: () => ({
			title: "Bomb Union",
			screen: app.screen,
			boardId: app.boardId,
			focusTarget: app.focusTarget,
			tool: app.tool,
			attract: app.attract,
			state: app.state ? B.Sim.snapshot(app.state) : null,
			network: {
				mode: app.net.mode,
				seat: app.net.seat,
				authority: app.net.authority,
				status: app.net.status,
			},
			audio: app.audio.snapshot?.(),
			errors: game.errors,
		}),
		targets: () => app.art.targets(app.state, view()),
	};
	app.debug = game.debug;
	const scene = {
		pausable: true,
		update,
		draw,
		enter() {
			game.lights.enabled = true;
			game.lights.ambient = 0.7;
		},
	};
	game.start({
		scenes: {
			title: {
				...scene,
				pausable: false,
				enter() {
					title();
				},
			},
			play: scene,
		},
		scene: "title",
	});
	globalThis.__game = game;
	(async () => {
		if (AIHub.active) {
			ui.hide();
			app.screen = "standby";
			setPage("standby", {
				kicker: "AI HUB · SHARED DISPATCH",
				title: "Crew assembling",
				text: "Ready automatically. The round begins on the Hub clock.",
				actions: [],
			});
			await app.net.detectHub();
		} else await app.net.detectHub();
		$("#bu-loading").hidden = true;
	})().catch((e) => {
		ui.toast("Startup error", e.message);
		$("#bu-loading").hidden = true;
	});
	// The gameplay scene is always pausable; native title is only the arrival scene.
	const originalStart = app.startCase;
	app.startCase = (...args) => {
		originalStart(...args);
	};
	addEventListener("pagehide", () => {
		app.audio.suspend?.();
		cancelHold();
	});
})();
