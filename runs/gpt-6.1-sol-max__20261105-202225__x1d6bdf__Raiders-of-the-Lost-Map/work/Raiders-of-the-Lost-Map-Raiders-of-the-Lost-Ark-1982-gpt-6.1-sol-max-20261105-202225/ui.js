const menuTrail = [];
let creditsTab = "source",
	roomDigits = [0, 0, 0, 0, 0, 0],
	roomNotice = "",
	pendingRoom = null;
function glyph(action) {
	const pad = {
		interact: ["△", "Y"],
		attack: ["□", "X"],
		dodge: ["✕", "A"],
		tool: ["○", "B"],
		notes: ["L1", "LB"],
		pause: ["☰", "☰"],
		move: ["L", "L"],
	};
	const key = {
		interact: "E",
		attack: "LMB",
		dodge: "SPACE",
		tool: "F",
		notes: "Q",
		pause: "ESC",
		move: "WASD",
	};
	if (inputType === "controller")
		return (
			'<span class="glyph pad">' +
			(pad[action] || ["✕", "A"])[settings.glyphs === "Xbox" ? 1 : 0] +
			"</span>"
		);
	return '<span class="glyph">' + (key[action] || "ENTER") + "</span>";
}
function toast(text) {
	$("toast").textContent = text;
	$("toast").classList.remove("hidden");
	toastTimer = 3.3;
}
function say(name, text) {
	if (settings.subtitles) {
		$("speech").innerHTML = "<b>" + safeText(name) + "</b>" + safeText(text);
		$("speech").classList.remove("hidden");
		speechTimer = 5.5;
	}
	audio.say(text);
}
function showStageCard(i) {
	const c = $("stage-card");
	c.querySelector(".stage-number").textContent =
		"CHAPTER 0" + (i + 1) + " / THE SAFFRON EXPEDITION";
	c.querySelector("h2").textContent = stageData[i].name;
	c.querySelector("p").textContent = stageData[i].subtitle;
	c.style.opacity = 1;
	c.classList.remove("hidden");
	cardTimer = 3.5;
	if (S.attract) {
		S.attractClock = 0;
		S.attractStep = 0;
	}
}
function objectiveText() {
	switch (S.stage) {
		case 0:
			return S.flags.flute
				? "Enter the snake temple beyond the north gate."
				: S.coins >= 3
					? "Trade with Nadia for a flute and shovel."
					: "Find 3 coins. Watch the pickpockets.";
		case 1:
			return !S.flags.chute
				? "Recover the parachute from the eastern satchel."
				: !S.flags.templeSolved
					? "Wake the seals: " +
						["COIL", "SUN", "WING"].slice(S.seals.length).join(" → ")
					: !S.flags.staff
						? "Take the sun staff beside the north gate."
						: "Carry the staff into the Sun Atlas.";
		case 2:
			return !S.flags.staffPlaced
				? "Place the sun staff on the central atlas."
				: !S.flags.mapped
					? "Align the mirrors: I NORTH · II EAST · III SOUTH."
					: "The " + glyphNames[S.target] + " mesa. Invoke the ankh gateway.";
		case 3:
			return (
				"Swing to the " +
				glyphNames[S.target] +
				" mesa. Parachute into its tomb."
			);
		case 4:
			return (
				"Steer to the gold circle. " +
				Math.max(0, Math.round(localPlayer()?.pos.y || 0)) +
				" m to landing."
			);
		case 5:
			return S.flags.bossDefeated
				? "Recover the golden reliquary."
				: S.flags.bossAwake
					? "Dodge Voss’s slam. Whip while his guard is down."
					: "Excavate the " + glyphNames[S.target] + " seal with your shovel.";
		case 6:
			return "Run toward daylight. Get aboard the biplane.";
	}
}
function refreshHUD(dt) {
	const p = localPlayer();
	if (S.mode === "title" || S.mode === "loading") return;
	$("chapter-tag").textContent = "CHAPTER 0" + (S.stage + 1) + " / 07";
	$("chapter-title").textContent = stageData[S.stage].name;
	$("objective").textContent = objectiveText();
	$("coins").textContent = S.coins;
	const hp = p ? Math.ceil(p.hp) : 6;
	$("health").textContent = "♥".repeat(hp) + "♡".repeat(6 - hp);
	const kit = [
		["⌁", "WHIP", true],
		["♫", "FLUTE", S.flags.flute],
		["⚒", "SHOVEL", S.flags.shovel],
		["☀", "STAFF", S.flags.staff],
		["♧", "CHUTE", S.flags.chute],
		["✥", "RELIC", S.flags.relic],
	];
	const gearHTML = kit
		.map(
			([symbol, name, has]) =>
				'<div class="gear-slot ' +
				(has ? "" : "empty") +
				'" title="' +
				name +
				'">' +
				symbol +
				"<small>" +
				name +
				"</small></div>",
		)
		.join("");
	if ($("gear").innerHTML !== gearHTML) $("gear").innerHTML = gearHTML;
	$("hud-hints").innerHTML =
		'<span class="hint">' +
		glyph("attack") +
		'Whip</span><span class="hint">' +
		glyph("dodge") +
		'Evade</span><span class="hint">' +
		glyph("tool") +
		(S.stage === 4 ? "Chute" : "Flute") +
		'</span><span class="hint">' +
		glyph("notes") +
		'Notes</span><span class="hint">' +
		glyph("pause") +
		"Pause</span>";
	nearest = null;
	if (p && !p.down && !p.swing) {
		const valid = S.interacts.filter(
			(i) =>
				i.enabled &&
				(!i.can || i.can()) &&
				Math.abs((i.y || 0) - p.pos.y) < 2.5 &&
				dist(i, p.pos) < i.radius,
		);
		nearest = valid.sort((a, b) => dist(a, p.pos) - dist(b, p.pos))[0] || null;
		const fallen = S.players.find(
			(o) => o.id !== p.id && o.down > 0 && dist(o.pos, p.pos) < 3,
		);
		if (fallen) nearest = { label: "Help " + fallen.name + " back up" };
	}
	const contextVisible =
		nearest && menu === null && !S.attract && S.stage !== 4;
	$("context").classList.toggle("hidden", !contextVisible);
	if (contextVisible)
		$("context").innerHTML =
			(inputType === "touch" ? "" : glyph("interact")) +
			safeText(
				typeof nearest.label === "function" ? nearest.label() : nearest.label,
			);
	if (p && p.down > 0) {
		$("context").classList.remove("hidden");
		$("context").textContent = "HAT RECOVERY IN " + Math.ceil(p.down) + "…";
	}
	const boss = S.enemies.find((e) => e.kind === "boss" && !e.dead);
	$("boss-hud").classList.toggle("hidden", !boss || S.stage !== 5);
	if (boss) {
		$("boss-fill").style.width = clamp((boss.hp / 8) * 100, 0, 100) + "%";
		$("boss-state").textContent =
			boss.state === "exposed"
				? "GUARD DOWN · WHIP!"
				: boss.state === "windup"
					? "SLAM INCOMING · EVADE"
					: "CAPTAIN VOSS";
	}
	$("touch-menu").classList.toggle(
		"hidden",
		inputType !== "touch" || menu !== null,
	);
	if (netActive) {
		$("network-tag").classList.remove("hidden");
		$("network-tag").textContent =
			(AIHub.active ? "AI HUB CO-OP" : "ROOM " + (standalone?.code || "")) +
			" · " +
			S.players.length +
			" EXPLORER" +
			(S.players.length === 1 ? "" : "S");
	} else $("network-tag").classList.add("hidden");
	if (speechTimer > 0) {
		speechTimer -= dt;
		if (speechTimer <= 0) $("speech").classList.add("hidden");
	}
	if (toastTimer > 0) {
		toastTimer -= dt;
		if (toastTimer <= 0) $("toast").classList.add("hidden");
	}
	if (cardTimer > 0) {
		cardTimer -= dt;
		$("stage-card").style.opacity = Math.min(1, cardTimer);
		if (cardTimer <= 0) $("stage-card").classList.add("hidden");
	}
	flash = Math.max(0, flash - dt * 2);
	$("damage-flash").style.opacity = flash;
}
function menuButton(label, action, extra = "") {
	return (
		'<button class="menu-button" data-action="' +
		action +
		'" ' +
		extra +
		">" +
		label +
		"<span>→</span></button>"
	);
}
function paperButton(label, action, secondary = false, extra = "") {
	return (
		'<button class="paper-button ' +
		(secondary ? "secondary" : "") +
		'" data-action="' +
		action +
		'" ' +
		extra +
		">" +
		label +
		"</button>"
	);
}
function slider(label, key, min, max, step, value, dev = false) {
	return (
		'<label class="row"><span class="setting-label">' +
		label +
		'</span><input aria-label="' +
		label +
		'" type="range" min="' +
		min +
		'" max="' +
		max +
		'" step="' +
		step +
		'" value="' +
		value +
		'" data-slider="' +
		key +
		'" data-dev="' +
		dev +
		'"><span class="value" id="value-' +
		key +
		'">' +
		(max === 1 ? Math.round(value * 100) + "%" : value.toFixed(1)) +
		"</span></label>"
	);
}
function toggleRow(label, key, value, scope = "settings") {
	return (
		'<div class="row"><span class="setting-label">' +
		label +
		'</span><button data-action="toggle" data-scope="' +
		scope +
		'" data-key="' +
		key +
		'">' +
		(value ? "ON" : "OFF") +
		"</button></div>"
	);
}
function openMenu(kind) {
	if (hubEnded) return;
	if (AIHub.active && ["title", "coop"].includes(kind)) return;
	if (S.attract) {
		stopAttract();
		return;
	}
	if (menu !== kind) menuTrail.push(menu);
	menu = kind;
	renderMenu();
}
function closeMenu() {
	const target = menuTrail.length
		? menuTrail.pop()
		: S.mode === "title"
			? "title"
			: null;
	menu = target;
	if (menu === null) {
		$("modal").classList.add("hidden");
		lastActivity = performance.now();
	} else if (menu === "title") {
		$("modal").classList.add("hidden");
		$("title-screen").classList.remove("hidden");
	} else renderMenu();
}
function returnTitle() {
	if (AIHub.active) return;
	standalone?.close();
	standalone = null;
	netActive = false;
	isHost = true;
	localId = 0;
	remoteInputs.clear();
	menuTrail.length = 0;
	menu = "title";
	S.mode = "title";
	S.won = false;
	S.attract = false;
	S.flags = {
		flute: true,
		shovel: true,
		chute: true,
		mapped: true,
		staff: true,
	};
	S.target = 1;
	S.players = [preparePlayer(0, "PROFESSOR FINCH", COLORS[0])];
	buildStage(3, false);
	addMenuScenery();
	S.players[0].pos = { x: 6, y: 0, z: -7 };
	S.players[0].visual.mesh.position.set(6, 0, -7);
	$("modal").classList.add("hidden");
	$("title-screen").classList.remove("hidden");
	$("hud").classList.add("hidden");
	$("stage-card").classList.add("hidden");
	$("attract-banner").classList.add("hidden");
	$("speech").classList.add("hidden");
	$("toast").classList.add("hidden");
	$("touch-menu").classList.add("hidden");
	$("network-tag").classList.add("hidden");
	$("continue-button").classList.toggle("hidden", !loadCheckpoint());
	lastActivity = performance.now();
	resetFocus();
}
function renderMenu(keepFocus = false) {
	const previousFocus = menuFocus;
	$("modal").classList.remove("hidden");
	let title = "",
		html = "";
	if (menu === "pause") {
		title = "The expedition can wait.";
		html =
			"<p>The hat stays on. Take a breath.</p>" +
			menuButton("RESUME EXPEDITION", "back") +
			menuButton("FIELD NOTES", "notes") +
			menuButton("OPTIONS", "settings");
		if (!AIHub.active)
			html +=
				menuButton("DEVELOPER FIELD KIT", "dev") +
				menuButton("ABOUT & CREDITS", "about") +
				menuButton("RETURN TO TITLE", "title");
		else
			html +=
				'<p class="note">Your expedition continues while this menu is open. The Hub controls the round.</p>';
	} else if (menu === "settings") {
		title = "A few adjustments.";
		html =
			slider("Music", "music", 0, 1, 0.01, settings.music) +
			slider("Sound effects", "sfx", 0, 1, 0.01, settings.sfx) +
			slider("Gibberish voices", "voice", 0, 1, 0.01, settings.voice) +
			slider("Master volume", "master", 0, 1, 0.01, settings.master);
		html +=
			'<div class="row"><span class="setting-label">Controller symbols</span><button data-action="glyphs">' +
			settings.glyphs +
			"</button></div>";
		html +=
			toggleRow("Screen shake", "shake", settings.shake) +
			toggleRow("Dialogue captions", "subtitles", settings.subtitles) +
			toggleRow("Aim & parachute assist", "assist", settings.assist);
		html +=
			'<div class="coop-actions">' +
			paperButton("FULLSCREEN", "fullscreen", true) +
			paperButton("RESET OPTIONS", "reset-options", true) +
			"</div>";
	} else if (menu === "manual") {
		title = "Keep this page dry.";
		html =
			"<p>You are Professor Finch, an archaeologist with excellent instincts and a spectacularly unreliable map. Reach the Well of Whispers before Captain Voss does. Getting out is also recommended.</p>";
		html += '<div class="manual-grid">';
		for (const [a, titleText, body] of [
			[
				"move",
				"MOVE",
				"WASD or the left stick. Move relative to the screen. Aim with the mouse or right stick.",
			],
			[
				"attack",
				"CRACK THE WHIP",
				"Strike snakes and thieves, break crates, and punish Voss while his guard is down.",
			],
			[
				"interact",
				"READ THE ROOM",
				"Trade, press seals, rotate mirrors, dig, or swing at a nearby hook. One contextual action.",
			],
			[
				"dodge",
				"KEEP YOUR HAT",
				"Roll through attacks and dart volleys. You are protected during the roll.",
			],
			[
				"tool",
				"A LITTLE MUSIC",
				"The flute calms every snake for seven seconds. In freefall, this opens the parachute.",
			],
			[
				"notes",
				"FIELD NOTES",
				"Your notebook keeps puzzle clues and the next step. Tools belong to the whole expedition.",
			],
		])
			html +=
				'<div class="manual-item">' +
				glyph(a) +
				"<strong>" +
				titleText +
				"</strong><p>" +
				body +
				"</p></div>";
		html +=
			'</div><p class="note">Touch: move with an invisible left thumbstick. Tap the right half to evade. Nearby actions appear when useful. Whip, flute, and parachute assist are automatic. Co-op: 1–4 explorers, shared tools and progress; help a fallen partner before the checkpoint rescue.</p>';
	} else if (menu === "notes") {
		title = "Finch’s field notebook";
		html =
			'<div class="chapter-tag" style="color:#a0452e">CHAPTER 0' +
			(S.stage + 1) +
			"</div><h3>" +
			stageData[S.stage].name +
			"</h3><p>" +
			objectiveText() +
			"</p>";
		const notes = [
			[
				"The price of progress",
				"Three coins buy Nadia’s flute and shovel. Crates and pickpockets are both surprisingly good sources of pocket money.",
			],
			[
				"A language even I can read",
				"The temple inscription reads COIL → SUN → WING. The eastern satchel holds a parachute. Collect it and the sun staff before leaving.",
			],
			[
				"The Sun Atlas",
				"Place the staff, then turn plinth I NORTH, II EAST, III SOUTH. The glowing miniature names the correct mesa.",
			],
			[
				"The valley route",
				"The trailhead leads to IBIS, then COBRA, then SCARAB. Interact beside gold hooks to swing. The marked mesa is " +
					glyphNames[S.target] +
					".",
			],
			[
				"Canvas before courage",
				"Open the parachute with " +
					(inputType === "controller" ? "Circle / B" : "F or Space") +
					". Steer toward the gold circle. Airborne rings are optional.",
			],
			[
				"An unwelcome colleague",
				"Excavate the " +
					glyphNames[S.target] +
					" seal. Voss drops his guard after a slam. Dodge the red circle, then whip him.",
			],
			[
				"The exit strategy",
				"Run toward the far end of the corridor. Weave around rubble, dodge the darts, board the plane.",
			],
		];
		for (let i = 0; i <= S.stage; i++)
			html +=
				"<h3>0" +
				(i + 1) +
				" / " +
				notes[i][0] +
				"</h3><p>" +
				notes[i][1] +
				"</p>";
	} else if (menu === "dev") {
		title = "Developer field kit";
		html =
			'<p class="note">Live tuning. Changes apply immediately. Reset restores the expedition’s balance.</p>';
		html +=
			toggleRow("Invulnerability", "god", debug.god, "debug") +
			toggleRow("No collision / safe flight", "noclip", debug.noclip, "debug") +
			toggleRow("Freeze enemies & traps", "freeze", debug.freeze, "debug") +
			toggleRow("Physics wireframes", "colliders", debug.colliders, "debug") +
			toggleRow("World markers", "waypoints", debug.waypoints, "debug");
		for (const [label, key, min, max, step] of [
			["Explorer speed", "speed", 2, 10, 0.1],
			["Enemy speed", "enemySpeed", 0, 2.5, 0.1],
			["Incoming damage", "damage", 0, 3, 0.1],
			["Whip reach", "reach", 2, 8, 0.1],
			["Gravity", "gravity", 5, 30, 0.5],
			["Time scale", "timeScale", 0.25, 2, 0.05],
		])
			html += slider(label, key, min, max, step, tune[key], true);
		html +=
			'<h3>JUMP TO CHAPTER</h3><div class="dev-grid">' +
			stageData
				.map(
					(s, i) =>
						'<button data-action="stage" data-stage="' +
						i +
						'">0' +
						(i + 1) +
						" " +
						safeText(s.name) +
						"</button>",
				)
				.join("") +
			"</div>";
		html +=
			'<div class="coop-actions">' +
			paperButton("HEAL PARTY", "heal", true) +
			paperButton("GRANT FIELD KIT", "grant", true) +
			paperButton("RESTORE CHECKPOINT", "checkpoint", true) +
			paperButton("RESET TUNING", "reset-dev", true) +
			paperButton("WATCH ATTRACT REEL", "reel", true) +
			"</div>";
		html +=
			'<p class="note">' +
			safeText(
				renderer?.backend?.isWebGPUBackend ? "WebGPU" : "WebGL 2 fallback",
			) +
			" · Three.js r180 · Rapier 0.19.3 · " +
			metrics.physicsSteps +
			" physics steps</p>";
	} else if (menu === "about") {
		title = "Behind the expedition";
		html =
			'<div class="tabs">' +
			[
				["source", "SOURCE INFORMATION"],
				["testing", "TESTING FEEDBACK"],
				["engine", "ENGINE FEEDBACK"],
				["prompt", "PROMPT FEEDBACK"],
			]
				.map(
					([id, text]) =>
						'<button class="' +
						(creditsTab === id ? "active" : "") +
						'" data-action="credits-tab" data-tab="' +
						id +
						'">' +
						text +
						"</button>",
				)
				.join("") +
			"</div>";
		if (creditsTab === "source") {
			html +=
				'<dl class="credits-data">' +
				Object.entries(CREDITS.sourceInformation)
					.map(
						([key, value]) =>
							"<dt>" +
							safeText(
								key
									.replace(/([A-Z])/g, " $1")
									.replace(/^./, (s) => s.toUpperCase()),
							) +
							"</dt><dd>" +
							safeText(value) +
							"</dd>",
					)
					.join("") +
				"</dl>";
			html +=
				'<h3>RESEARCH & ACKNOWLEDGMENTS</h3><p class="note">An original homage to Howard Scott Warshaw’s 1982 Atari adventure. Original characters, music, geometry and writing. No original game assets or recordings.</p><p class="note"><a href="https://www.atariage.com/2600/manuals_old/raiders_of_the_lost_ark.html" target="_blank" rel="noreferrer">Atari instruction manual</a> · <a href="https://github.com/halkuncode/Raiders2600" target="_blank" rel="noreferrer">Reverse-engineered game analysis</a> · <a href="https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub" target="_blank" rel="noreferrer">AI Hub Session Protocol v1</a></p>';
		} else {
			const qs = {
				testing: [
					"How many issues did testing catch?",
					"How many were critical / game breaking?",
					"Most helpful test?",
					"Least helpful test?",
				],
				engine: [
					"What did you like most?",
					"Did you get stuck or guess wrong?",
					"Most important thing built yourself?",
					"Hardest part of using the engine?",
					"Engine changes?",
					"One thing you would change?",
				],
				prompt: [
					"What did you like most?",
					"What was confusing?",
					"Hardest thing to do?",
					"What would you change?",
				],
			};
			const list = CREDITS[creditsTab + "Feedback"];
			html +=
				'<ol class="feedback-list">' +
				list
					.map(
						(answer, i) =>
							"<li><strong>" +
							qs[creditsTab][i] +
							"</strong><br>" +
							safeText(answer) +
							"</li>",
					)
					.join("") +
				"</ol>";
		}
	} else if (menu === "coop") {
		title = "Better trouble, together.";
		html =
			'<p>One expedition. Up to four questionable experts. Share tools, solve the atlas together, and haul each other out of trouble.</p><div class="coop-actions">' +
			paperButton("HOST AN EXPEDITION", "host-room") +
			paperButton("JOIN A ROOM", "join-menu", true) +
			'</div><h3>HOW IT WORKS</h3><p>Share the six-digit room code or invite link. Open this game on each device and enter the same code. Keep the host’s game open until everyone is safely home.</p><p class="note">AI Hub sessions connect automatically. Partners on different devices need an internet connection.</p>';
	} else if (menu === "join") {
		title = "Find your expedition.";
		html =
			'<p>Enter the six-digit room code.</p><input aria-label="Room code" class="room-entry" id="room-input" type="text" inputmode="numeric" maxlength="6" pattern="[0-9]*" value="' +
			roomDigits.join("") +
			'"><div class="coop-actions">' +
			roomDigits
				.map(
					(d, i) =>
						'<button aria-label="Room digit ' +
						(i + 1) +
						'" class="paper-button secondary" data-action="digit" data-index="' +
						i +
						'">' +
						d +
						"</button>",
				)
				.join("") +
			'</div><p class="note">Controller: select a digit, then use left / right to change it.</p>' +
			paperButton("JOIN EXPEDITION", "join-room") +
			'<p id="room-notice" class="note" style="margin-top:15px">' +
			safeText(roomNotice) +
			"</p>";
	} else if (menu === "lobby") {
		title = "The expedition assembles.";
		html =
			'<p>Share this code with your partners.</p><div class="room-code">' +
			safeText(standalone?.code || "------") +
			'</div><div id="roster">' +
			(standalone?.members || [])
				.map(
					(p) =>
						'<div class="player-row"><span class="player-dot" style="background:' +
						p.color +
						'"></span>' +
						safeText(p.name) +
						(p.id === 0 ? " / HOST" : "") +
						"</div>",
				)
				.join("") +
			"</div>";
		html +=
			'<div class="coop-actions">' +
			(isHost
				? paperButton("SET OUT TOGETHER", "launch-room")
				: "<p>Waiting for the host to set out.</p>") +
			paperButton(
				location.protocol === "file:" ||
					["localhost", "127.0.0.1"].includes(location.hostname)
					? "COPY ROOM CODE"
					: "COPY INVITE LINK",
				"copy-invite",
				true,
			) +
			'</div><p id="room-notice" class="note">' +
			safeText(
				roomNotice ||
					"The room is ready. Partners may join before or during the expedition.",
			) +
			"</p>";
	} else if (menu === "victory") {
		title = "It belongs in a museum.";
		const rank =
			S.deathCount === 0 && S.secrets >= 2
				? "LEGENDARY FIELDWORK"
				: S.deathCount < 3
					? "A RESPECTABLE DISASTER"
					: "THE HAT SURVIVED";
		const score = Math.max(
			0,
			1000 + S.coins * 20 + S.kills * 35 + S.secrets * 100 - S.deathCount * 75,
		);
		html =
			'<p>One reliquary recovered. One map still missing. Professor Finch considers this an unqualified success.</p><div class="victory-score">' +
			score.toLocaleString() +
			'</div><div class="eyebrow" style="text-align:center;color:#a34a30">' +
			rank +
			'</div><div class="stat-grid"><div><strong>' +
			Math.floor(S.elapsed / 60) +
			":" +
			String(Math.floor(S.elapsed % 60)).padStart(2, "0") +
			"</strong><span>Expedition time</span></div><div><strong>" +
			S.coins +
			"</strong><span>Coins rescued</span></div><div><strong>" +
			S.kills +
			"</strong><span>Close calls settled</span></div></div>";
		if (!AIHub.active)
			html +=
				'<div class="coop-actions">' +
				paperButton("ANOTHER EXPEDITION", "again") +
				paperButton("RETURN TO TITLE", "title", true) +
				paperButton("CREDITS", "about", true) +
				"</div>";
	}
	$("modal-title").textContent = title;
	$("modal-body").innerHTML = html;
	$("modal-hint").innerHTML =
		inputType === "controller"
			? "D-PAD SELECT · " +
				glyph("dodge") +
				"CONFIRM · " +
				glyph("tool") +
				"BACK · R SCROLL"
			: "↑ ↓ SELECT · ENTER CONFIRM · ESC BACK · PGDN SCROLL";
	if (keepFocus) focusElement(previousFocus);
	else resetFocus();
}
function showVictory() {
	if (S.attract) {
		S.attractClock = 16;
		S.mode = "playing";
		return;
	}
	menuTrail.length = 0;
	menu = "victory";
	renderMenu();
}
function focusList() {
	const root = menu === "title" ? $("title-screen") : $("modal-body");
	const nodes = [...root.querySelectorAll("button:not(:disabled),input")];
	if (menu !== "title")
		nodes.push($("modal").querySelector(".panel-footer button"));
	return nodes.filter((e) => e.getClientRects().length > 0);
}
function focusElement(index) {
	const list = focusList();
	if (!list.length) return;
	list.forEach((e) => e.classList.remove("focused"));
	menuFocus = (index + list.length) % list.length;
	const el = list[menuFocus];
	el.classList.add("focused");
	el.focus({ preventScroll: true });
	if (menu !== "title") el.scrollIntoView({ block: "nearest" });
	return el;
}
function resetFocus() {
	menuFocus = 0;
	focusElement(0);
}
function menuMove(d) {
	focusElement(menuFocus + d);
	audio.fx("click");
}
function menuAdjust(d) {
	const e = focusList()[menuFocus];
	if (!e) return;
	if (e.type === "range") {
		e.value = clamp(
			Number(e.value) + Number(e.step) * d,
			Number(e.min),
			Number(e.max),
		);
		e.dispatchEvent(new Event("input", { bubbles: true }));
	} else if (e.dataset.action === "digit") {
		const i = +e.dataset.index;
		roomDigits[i] = (roomDigits[i] + d + 10) % 10;
		e.textContent = roomDigits[i];
		$("room-input").value = roomDigits.join("");
	}
}
function setDevStage(i) {
	if (!hostAuthority()) return;
	S.flags = {
		flute: true,
		shovel: true,
		chute: true,
		staff: true,
		templeSolved: true,
		staffPlaced: i > 2,
		mapped: i > 2,
	};
	if (i === 5) S.flags.mapped = true;
	if (i === 6) {
		S.flags.relic = true;
		S.flags.bossDefeated = true;
	}
	S.seals = [0, 1, 2];
	S.mirrors = i > 2 ? [0, 1, 2] : [2, 3, 0];
	S.selectedMesa = S.target;
	S.mode = "playing";
	S.won = false;
	menu = null;
	menuTrail.length = 0;
	$("modal").classList.add("hidden");
	buildStage(i);
}
async function doAction(action, el) {
	if (hubEnded) return;
	audio.unlock();
	audio.fx("click");
	lastActivity = performance.now();
	switch (action) {
		case "begin":
			newRun();
			break;
		case "continue":
			newRun(loadCheckpoint());
			break;
		case "back":
			if (menu === "victory") {
				returnTitle();
			} else closeMenu();
			break;
		case "settings":
		case "manual":
		case "notes":
		case "dev":
		case "about":
		case "coop":
			openMenu(action);
			break;
		case "title":
			returnTitle();
			break;
		case "fullscreen":
			try {
				if (document.fullscreenElement) await document.exitFullscreen();
				else await document.documentElement.requestFullscreen();
			} catch {
				toast("Fullscreen is unavailable in this browser.");
			}
			break;
		case "toggle": {
			const obj = el.dataset.scope === "debug" ? debug : settings;
			obj[el.dataset.key] = !obj[el.dataset.key];
			saveOptions();
			renderMenu(true);
			break;
		}
		case "glyphs":
			settings.glyphs =
				settings.glyphs === "PlayStation" ? "Xbox" : "PlayStation";
			saveOptions();
			renderMenu(true);
			break;
		case "reset-options":
			Object.assign(settings, {
				music: 0.1,
				sfx: 0.7,
				voice: 0.5,
				master: 0.75,
				glyphs: "PlayStation",
				shake: true,
				subtitles: true,
				assist: true,
			});
			saveOptions();
			renderMenu(true);
			break;
		case "credits-tab":
			creditsTab = el.dataset.tab;
			renderMenu(true);
			break;
		case "stage":
			setDevStage(Number(el.dataset.stage));
			break;
		case "heal":
			for (const p of S.players) {
				p.hp = 6;
				p.down = 0;
				p.invuln = 3;
			}
			toast("PARTY HEALED");
			break;
		case "grant":
			Object.assign(S.flags, {
				flute: true,
				shovel: true,
				chute: true,
				staff: true,
			});
			S.coins += 20;
			toast("FIELD KIT GRANTED");
			break;
		case "checkpoint":
			for (const p of S.players) respawn(p);
			closeMenu();
			break;
		case "reset-dev":
			Object.assign(tune, defaults);
			Object.assign(debug, {
				god: false,
				noclip: false,
				freeze: false,
				colliders: false,
				waypoints: true,
			});
			world.gravity = { x: 0, y: -tune.gravity, z: 0 };
			renderMenu();
			break;
		case "reel":
			if (!netActive) {
				returnTitle();
				startAttract();
			}
			break;
		case "host-room":
			await createRoom();
			break;
		case "join-menu":
			roomNotice = "";
			openMenu("join");
			break;
		case "digit": {
			const i = +el.dataset.index;
			roomDigits[i] = (roomDigits[i] + 1) % 10;
			el.textContent = roomDigits[i];
			$("room-input").value = roomDigits.join("");
			break;
		}
		case "join-room": {
			const code = ($("room-input")?.value || roomDigits.join(""))
				.replace(/\D/g, "")
				.padStart(6, "0");
			await joinRoom(code);
			break;
		}
		case "launch-room":
			if (isHost) {
				newRun();
				standalone.send({ kind: "begin" });
			}
			break;
		case "copy-invite": {
			const u = new URL(location.href);
			u.search = "";
			u.searchParams.set("room", standalone.code);
			const local =
					location.protocol === "file:" ||
					["localhost", "127.0.0.1"].includes(location.hostname),
				invite = local ? standalone.code : u.href;
			try {
				await navigator.clipboard.writeText(invite);
				toast(local ? "ROOM CODE COPIED" : "INVITE LINK COPIED");
			} catch {
				roomNotice = invite;
				renderMenu();
			}
			break;
		}
		case "again":
			if (isHost) newRun();
			break;
	}
}
document.addEventListener("click", (e) => {
	const el = e.target.closest("[data-action]");
	if (!el) return;
	doAction(el.dataset.action, el).catch((err) => {
		roomNotice = err.message;
		if (menu === "join" || menu === "lobby") renderMenu();
		else toast(err.message);
	});
});
document.addEventListener("input", (e) => {
	const key = e.target.dataset.slider;
	if (!key) return;
	const value = Number(e.target.value),
		dev = e.target.dataset.dev === "true";
	(dev ? tune : settings)[key] = value;
	const label = $("value-" + key);
	if (label)
		label.textContent =
			Number(e.target.max) === 1
				? Math.round(value * 100) + "%"
				: value.toFixed(1);
	if (key === "gravity" && world) world.gravity = { x: 0, y: -value, z: 0 };
	if (!dev) saveOptions();
	lastActivity = performance.now();
});
document.addEventListener("pointerover", (e) => {
	if (!menu) return;
	const el = e.target.closest("button,input");
	if (!el) return;
	const i = focusList().indexOf(el);
	if (i >= 0) {
		focusList().forEach((n) => n.classList.remove("focused"));
		menuFocus = i;
		el.classList.add("focused");
	}
});
$("context").onclick = (e) => {
	e.stopPropagation();
	activity(e.pointerType === "touch" ? "touch" : "mouse");
	latestInput.interact = true;
};
$("touch-menu").onclick = () => {
	activity("touch");
	openMenu("pause");
};
