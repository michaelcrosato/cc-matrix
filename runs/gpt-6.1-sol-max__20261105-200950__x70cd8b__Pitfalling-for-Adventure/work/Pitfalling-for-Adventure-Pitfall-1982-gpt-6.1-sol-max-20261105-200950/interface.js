let modalName = null,
	modalOrigin = "title",
	focusIndex = 0,
	focusItems = [];
const report = JSON.parse($("reportData").textContent);
const esc = (s) =>
	String(s).replace(
		/[&<>"']/g,
		(c) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				c
			],
	);
function glyph(action) {
	const ps = {
			jump: "✕",
			map: "△",
			pause: "☰",
			back: "○",
			move: "L",
			climb: "L ↕",
			accept: "✕",
		},
		xb = {
			jump: "A",
			map: "Y",
			pause: "☰",
			back: "B",
			move: "L",
			climb: "L ↕",
			accept: "A",
		},
		kb = {
			jump: "Space",
			map: "M",
			pause: "Esc",
			back: "Esc",
			move: "A / D",
			climb: "W / S",
			accept: "Enter",
		};
	const pad = input.last === "gamepad";
	const text = (pad ? (settings.glyphs === "xbox" ? xb : ps) : kb)[action];
	return '<span class="glyph ' + (pad ? "pad" : "") + '">' + text + "</span>";
}
function updatePrompts() {
	$("titlePrompt").innerHTML =
		input.last === "touch"
			? "Left thumb to move · Right thumb to leap"
			: glyph("move") + " Move &nbsp; " + glyph("jump") + " Leap";
	if (game.mode === "play") updateHud(true);
}
function toast(text, duration = 2.5) {
	$("toast").textContent = text;
	$("toast").classList.remove("hidden");
	game.toast = duration;
	game.toastUntil = performance.now() + duration * 1000;
}
function updateTouch() {
	document.body.classList.toggle("touch-mode", input.last === "touch");
	const active = input.last === "touch" && game.mode === "play" && !modalName;
	const p = game.players[0];
	const near =
		p &&
		(p.vine ||
			!p.grounded ||
			gaps.some((g) => Math.abs(p.x - g.a) < 3 || Math.abs(p.x - g.b) < 3) ||
			hazards.some((h) => Math.abs(h.x - p.x) < 4));
	$("touchJump").classList.toggle("hidden", !active || !near);
	$("touchJump").textContent = p?.vine ? "↗" : "↑";
	if (!active) $("touchRing").classList.add("hidden");
}
function updateHud(force = false) {
	const now = performance.now();
	if (!force && now - game.hudStamp < 100) return;
	game.hudStamp = now;
	const p = game.players[0];
	if (!p) return;
	const zi = zones.reduce((n, z, i) => (p.x >= z.x ? i : n), 0);
	game.zone = zi;
	$("zoneIndex").textContent =
		String(zi + 1).padStart(2, "0") + " / THE LOST TRAIL";
	$("zoneName").textContent =
		(p.y < -1 ? "BENEATH · " : "") + zones[zi].name.toUpperCase();
	$("relicCount").textContent = game.collected.length + " / 8";
	$("score").textContent = String(game.score).padStart(5, "0");
	const seconds = Math.max(0, Math.ceil(settings.daylight - game.elapsed));
	$("timer").textContent =
		String(Math.floor(seconds / 60)).padStart(2, "0") +
		":" +
		String(seconds % 60).padStart(2, "0");
	$("timer").style.color = seconds < 60 ? "#ef9868" : "";
	$("hearts").textContent =
		"♥ ".repeat(Math.max(0, game.lives)) +
		"♡ ".repeat(Math.max(0, 3 - game.lives));
	let hint = zones[zi].note;
	if (p.vine)
		hint = glyph("jump") + " Let go when the far bank is beneath your boots.";
	else if (p.climbing) hint = "Keep your boots on the rungs.";
	else if (ladders.some((l) => Math.abs(l.x - p.x) < 2))
		hint = glyph("climb") + " Climb the ladder · Treasure lies below.";
	else if (zi === 0)
		hint =
			glyph("move") +
			" Move &nbsp; " +
			glyph("jump") +
			" Jump &nbsp; " +
			glyph("map") +
			" Map";
	else if (zi === 1 || zi === 4 || zi === 7)
		hint = glyph("jump") + " Jump to catch a vine. Press again to release.";
	$("hint").innerHTML = hint;
	if (game.collected.length === 8) {
		$("objectiveLine").textContent = "A full pack. A fine adventure.";
		$("objectiveTarget").textContent = "☀ Reach the Sun Gate →";
	} else {
		let target = treasures
			.filter((t) => !t.collected)
			.sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
		$("objectiveLine").textContent =
			target?.y < 0
				? "Some fortunes are under your feet."
				: "Follow the fireflies. Mind the teeth.";
		$("objectiveTarget").textContent = target
			? (target.x < p.x ? "← " : "") +
				"◇ " +
				(8 - game.collected.length) +
				" treasure" +
				(game.collected.length === 7 ? "" : "s") +
				" to find" +
				(target.x >= p.x ? " →" : "")
			: "◇ Eight treasures to find";
	}
	const badge = AIHub.active
		? "LIVE TRAIL RACE · " + (hubInfo?.players.length ?? 1) + " EXPLORERS"
		: game.coop
			? "TWO EXPLORERS · SHARED FORTUNE"
			: dev.god || dev.fly
				? "FIELD LAB · ASSISTS ACTIVE"
				: "";
	$("modeBadge").textContent = badge;
	$("modeBadge").classList.toggle("hidden", !badge);
	updateTouch();
}
function refreshFocus() {
	const parent = modalName ? $("panel") : $("title");
	focusItems = Array.from(
		parent.querySelectorAll("button,input,select"),
	).filter((e) => !e.disabled && e.offsetParent !== null);
	focusIndex = clamp(focusIndex, 0, Math.max(0, focusItems.length - 1));
}
function setMenuFocus(index, focus = false) {
	refreshFocus();
	focusIndex = (index + focusItems.length) % Math.max(1, focusItems.length);
	for (const e of focusItems) e.classList.remove("focused");
	const e = focusItems[focusIndex];
	if (e) {
		e.classList.add("focused");
		if (focus) {
			e.focus({ preventScroll: true });
			e.scrollIntoView({ block: "nearest" });
		}
	}
}
function navigateMenu(n) {
	refreshFocus();
	setMenuFocus(focusIndex + n, true);
	sound("ui");
}
function changeFocused(n) {
	refreshFocus();
	const e = focusItems[focusIndex];
	if (!e) return;
	if (e.type === "range") {
		e.value = String(
			clamp(
				Number(e.value) + Number(e.step || 1) * n,
				Number(e.min),
				Number(e.max),
			),
		);
		e.dispatchEvent(new Event("input", { bubbles: true }));
	} else if (e.tagName === "SELECT") {
		e.selectedIndex = clamp(e.selectedIndex + n, 0, e.options.length - 1);
		e.dispatchEvent(new Event("change", { bubbles: true }));
	} else navigateMenu(n);
}
function menuHeader(title, sub = "") {
	return (
		'<div class="panel-head"><div><h2>' +
		title +
		"</h2>" +
		(sub ? '<p class="sub">' + sub + "</p>" : "") +
		'</div><button class="close" data-act="back" aria-label="Back">×</button></div>'
	);
}
function openModal(name) {
	if (game.mode === "attract") returnTitle();
	if (!modalName) modalOrigin = game.mode === "title" ? "title" : "pause";
	modalName = name;
	$("modal").classList.remove("hidden");
	$("touchJump").classList.add("hidden");
	$("panel").className = "panel" + (name === "pause" ? " small" : "");
	input.keys.clear();
	input.jump = false;
	input.touchX = 0;
	input.touchY = 0;
	input.touchId = null;
	input.touchStart = null;
	$("touchRing").classList.add("hidden");
	let html = "";
	if (name === "pause") {
		html =
			menuHeader(
				AIHub.active ? "Trail kit" : "Take a breather",
				AIHub.active
					? "The race continues while you check your kit."
					: "A good explorer knows when to stop.",
			) +
			'<div class="rows">' +
			[
				["resume", "Back to the trail"],
				["map", "Field map"],
				["howto", "Field guide"],
				["settings", "Options"],
				["dev", "Developer field lab"],
				["about", "About & credits"],
				...(!AIHub.active ? [["quit", "Save & return to camp"]] : []),
			]
				.map(
					([a, b], i) =>
						'<button class="btn ' +
						(i === 0 ? "primary" : "") +
						'" data-act="' +
						a +
						'">' +
						b +
						"<span>" +
						(i === 0 ? "↗" : "→") +
						"</span></button>",
				)
				.join("") +
			"</div>";
	}
	if (name === "howto") {
		html =
			menuHeader(
				"A field guide",
				"Recover all eight treasures. Reach the Sun Gate before your eight minutes of daylight run out.",
			) +
			'<div class="control-grid"><div class="control-card"><h3>01 · Good boots</h3><p>' +
			glyph("move") +
			" Move left / right<br>" +
			glyph("jump") +
			" Jump; hold for a higher leap<br>" +
			glyph("climb") +
			' Climb a nearby ladder</p><p>Closed crocodile mouths can be crossed. Open ones are a poor idea. Jump logs, cobras, fire and scorpions.</p></div><div class="control-card"><h3>02 · A little courage</h3><p>Jump near a vine to grab it automatically. ' +
			glyph("jump") +
			' Press again to let go.</p><p>Watch the quicksand breathe. The tunnels hold two treasures. Camp flags save your progress, even if you lose a life.</p></div><div class="control-card"><h3>03 · Keep your bearings</h3><p>' +
			glyph("map") +
			" Open the treasure map<br>" +
			glyph("pause") +
			' Pause & options</p><p>Gold fireflies add to your score. You have three lives. Lost treasures stay in your pack when you respawn.</p></div><div class="control-card"><h3>04 · Bring a friend</h3><p>Local co-op: share three lives and eight treasures. Two pads, or P1 A/D + Space, P2 arrows + Right Shift. Up/down climbs.</p><p>AI Hub: 1–4 explorers race with visible ghosts. Touch: drag the left side; tap the right to jump. Climbing and vine release are assisted.</p></div></div><div class="panel-footer"><button class="btn primary" data-act="back">Boots on. Got it. <span>↗</span></button></div>';
	}
	if (name === "settings") {
		html =
			menuHeader(
				"Pack light. Play your way.",
				"Changes are saved on this device.",
			) +
			'<div class="rows">' +
			slider(
				"music",
				"Music",
				0,
				100,
				1,
				"%",
				"A little marimba goes a long way. Default: 10%.",
			) +
			slider("sfx", "Sound & gibberish", 0, 100, 1, "%") +
			'<label class="setting"><span>Controller symbols</span><select id="glyphSetting"><option value="ps" ' +
			(settings.glyphs === "ps" ? "selected" : "") +
			'>PlayStation · ✕ ○ □ △</option><option value="xbox" ' +
			(settings.glyphs === "xbox" ? "selected" : "") +
			">Xbox · A B X Y</option></select></label>" +
			toggle(
				"vineAssist",
				"Touch trail assist",
				"Auto-jump hazards and release vines on touch.",
			) +
			toggle("shake", "A little camera rumble") +
			'</div><div class="panel-footer"><button class="btn" data-act="fullscreen">Full screen <span>⛶</span></button><button class="btn primary" data-act="back">Back to it <span>↗</span></button></div>';
	}
	if (name === "map") {
		html =
			menuHeader(
				"The lost trail",
				"Eight treasures. Two underground detours. Camp flags save the expedition.",
			) +
			'<div class="route">' +
			zones
				.map((z, i) => {
					const t = treasures[z.treasure];
					return (
						'<div class="route-card ' +
						(game.zone === i ? "active" : "") +
						'"><span class="num">' +
						String(i + 1).padStart(2, "0") +
						" " +
						(game.zone === i ? "· YOU ARE HERE" : "") +
						"</span><h3>" +
						z.name +
						'</h3><p class="treasure-dot">' +
						(t.collected ? "◆ Treasure recovered" : "◇ Treasure waiting") +
						"</p><p>" +
						(t.y < 0
							? "↓ Below ground · use the ladders"
							: i === 1 || i === 4 || i === 7
								? "⌁ Vine crossing"
								: i === 2
									? "⌁ Watch the jaws"
									: "⚑ Keep to the trail") +
						"</p></div>"
					);
				})
				.join("") +
			'</div><p class="sub">The Sun Gate is at the eastern end →<br>The caves connect 73 ↔ 109 and 165 ↔ 179. ' +
			(game.coop
				? "Both explorers share the pack."
				: "You can always go back for a missed treasure.") +
			'</p><button class="btn primary" data-act="back">Return to the trail <span>↗</span></button>';
	}
	if (name === "dev") {
		html =
			menuHeader(
				"Developer field lab",
				"Live balance controls. Cheats disable saving; your regular trail stays safe.",
			) +
			'<div class="dev-grid">' +
			slider("speed", "Run speed", 3, 11, 0.1, "") +
			slider("jump", "Jump impulse", 6, 17, 0.1, "") +
			slider("gravity", "Gravity", 12, 40, 1, "") +
			slider("hazard", "Hazard tempo", 0.3, 2, 0.05, "×") +
			slider("daylight", "Daylight budget", 120, 1200, 30, "s") +
			slider("timeScale", "Simulation speed", 0.25, 2, 0.05, "×") +
			devToggle("god", "Invulnerable") +
			devToggle("fly", "Free flight · move / up / down") +
			devToggle("wire", "Physics colliders") +
			devToggle("reveal", "Reveal treasure bearings") +
			'</div><div class="dev-tools">' +
			[
				["warpBack", "Previous camp"],
				["warpNext", "Next camp"],
				["respawn", "Respawn at camp"],
				["allRelics", "Recover all treasures"],
				["step", "Single physics step"],
				["resetDev", "Reset all defaults"],
			]
				.map(
					([a, b]) =>
						'<button class="btn" data-act="' + a + '">' + b + "</button>",
				)
				.join("") +
			'</div><p class="focus-hint">' +
			backend +
			' · Three.js r180 · Rapier 0.19.3 · fixed 60 Hz simulation</p><div class="panel-footer"><button class="btn primary" data-act="resume">Back to the trail <span>↗</span></button></div>';
	}
	if (name === "about") {
		html =
			menuHeader(
				"A little jungle history",
				"An original pocket expedition, inspired by a very big adventure in 4 KB.",
			) +
			'<div class="credits-tabs">' +
			[
				["sourceInformation", "Source Information"],
				["testingFeedback", "Testing Feedback"],
				["engineFeedback", "Engine Feedback"],
				["promptFeedback", "Prompt Feedback"],
			]
				.map(
					([id, label], i) =>
						'<button data-credit="' +
						id +
						'" class="' +
						(i === 0 ? "selected" : "") +
						'">' +
						label +
						"</button>",
				)
				.join("") +
			'</div><div id="creditCopy" class="credits-copy"></div><p class="focus-hint">Original game, characters, geometry, score and synth voices created for this demo. Pitfall! (1982): David Crane / Activision. Three.js: MIT. Rapier: Apache-2.0. DM Sans & Barlow Condensed: SIL OFL. AI Hub client 1.4.0: used unmodified.</p>';
	}
	$("panel").innerHTML = html;
	bindPanelControls();
	if (name === "about") showCredit("sourceInformation");
	focusIndex = name === "pause" ? 1 : 0;
	setMenuFocus(focusIndex);
}
function slider(key, label, min, max, step, suffix, sub = "") {
	return (
		'<label class="setting"><span>' +
		label +
		(sub ? "<small>" + sub + "</small>" : "") +
		'</span><span><input type="range" data-setting="' +
		key +
		'" aria-label="' +
		label +
		'" min="' +
		min +
		'" max="' +
		max +
		'" step="' +
		step +
		'" value="' +
		settings[key] +
		'"><output class="value" id="val-' +
		key +
		'">' +
		settings[key] +
		suffix +
		"</output></span></label>"
	);
}
function toggle(key, label, sub = "") {
	return (
		'<label class="setting"><span>' +
		label +
		(sub ? "<small>" + sub + "</small>" : "") +
		'</span><input type="checkbox" data-setting="' +
		key +
		'" aria-label="' +
		label +
		'" ' +
		(settings[key] ? "checked" : "") +
		"></label>"
	);
}
function devToggle(key, label) {
	return (
		'<label class="setting"><span>' +
		label +
		'</span><input type="checkbox" data-dev="' +
		key +
		'" aria-label="' +
		label +
		'" ' +
		(dev[key] ? "checked" : "") +
		"></label>"
	);
}
function bindPanelControls() {
	for (const el of $("panel").querySelectorAll("[data-setting]"))
		el.addEventListener("input", () => {
			const key = el.dataset.setting;
			settings[key] = el.type === "checkbox" ? el.checked : Number(el.value);
			const out = $("val-" + key);
			if (out)
				out.textContent =
					Number(el.value).toFixed(Number(el.step) < 1 ? 1 : 0) +
					(key === "music" || key === "sfx"
						? "%"
						: key === "hazard" || key === "timeScale"
							? "×"
							: key === "daylight"
								? "s"
								: "");
			if (physics) physics.gravity = { x: 0, y: -settings.gravity, z: 0 };
			saveOptions();
		});
	for (const el of $("panel").querySelectorAll("[data-dev]"))
		el.addEventListener("input", () => {
			dev[el.dataset.dev] = el.checked;
		});
	$("glyphSetting")?.addEventListener("change", (e) => {
		settings.glyphs = e.target.value;
		saveOptions();
		updatePrompts();
	});
}
const testQuestions = [
	"How many issues did testing catch?",
	"How many were critical / game breaking?",
	"Most helpful test",
	"Least helpful test",
];
const engineQuestions = [
	"What worked best",
	"Where I got stuck or guessed wrong",
	"Most important system built here",
	"Hardest part of the engine",
	"Engine changes",
	"One desired engine improvement",
];
const promptQuestions = [
	"What worked best in the prompt",
	"What was confusing",
	"Hardest part of the request",
	"Suggested prompt change",
];
function showCredit(id) {
	const data = report[id];
	const title = (k) =>
		k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
	if (Array.isArray(data)) {
		const labels =
			id === "testingFeedback"
				? testQuestions
				: id === "engineFeedback"
					? engineQuestions
					: promptQuestions;
		$("creditCopy").innerHTML = data
			.map((v, i) => "<p><b>" + labels[i] + "</b><br>" + esc(v) + "</p>")
			.join("");
	} else
		$("creditCopy").innerHTML =
			Object.entries(data)
				.map(([k, v]) => "<p><b>" + title(k) + "</b> · " + esc(v) + "</p>")
				.join("") +
			"<p><b>Research sources</b><br>Activision’s original Pitfall! manual; David Crane’s retrospective interview; Video Game Music Preservation Foundation’s sound reference. " +
			(!AIHub.active
				? '<a href="https://www.ataricompendium.com/archives/manuals/vcs/pitfall.pdf" target="_blank" rel="noopener">Read the original manual ↗</a>'
				: "") +
			"</p>";
	for (const b of $("panel").querySelectorAll("[data-credit]"))
		b.classList.toggle("selected", b.dataset.credit === id);
}
function closeModal() {
	modalName = null;
	$("modal").classList.add("hidden");
	$("panel").innerHTML = "";
	input.keys.clear();
	input.jump = false;
	updateTouch();
}
function backMenu() {
	if (
		modalName === "pause" ||
		modalOrigin === "title" ||
		game.mode === "result"
	) {
		closeModal();
		setMenuFocus(0);
	} else openModal("pause");
}
function showResults(won, reason) {
	closeModal();
	modalName = "results";
	$("modal").classList.remove("hidden");
	$("panel").className = "panel results";
	$("panel").innerHTML =
		'<div class="eyebrow">' +
		(won ? "A fine day’s exploring" : "A tale for another campfire") +
		"</div><h2>" +
		(won ? "FORTUNE FAVOURS<br>THE MUDDY." : "THE JUNGLE<br>HAS OTHER PLANS.") +
		'</h2><p class="sub">' +
		(won
			? "Eight treasures, a pair of tired boots, and a very good story."
			: esc(reason)) +
		'</p><div class="result-number">' +
		String(game.score).padStart(5, "0") +
		'</div><div class="result-stats"><span><b>' +
		game.collected.length +
		" / 8</b>Treasures</span><span><b>" +
		Math.floor(game.elapsed / 60) +
		":" +
		String(Math.floor(game.elapsed % 60)).padStart(2, "0") +
		"</b>Trail time</span><span><b>" +
		game.metrics.swings +
		"</b>Vine swings</span></div>" +
		(!AIHub.active
			? '<div class="rows"><button class="btn primary" data-act="retry">Another adventure <span>↗</span></button><button class="btn" data-act="title">Back to camp <span>→</span></button></div>'
			: '<p class="sub">Waiting for the expedition results.</p>');
	focusIndex = 0;
	setMenuFocus(0);
}
function act(action) {
	sound("ui");
	switch (action) {
		case "start":
			startGame(false);
			break;
		case "continue":
			startGame(false, true);
			break;
		case "coop":
			startGame(true);
			break;
		case "pause":
			if (game.mode === "play") openModal("pause");
			break;
		case "resume":
			closeModal();
			break;
		case "howto":
		case "settings":
		case "about":
		case "dev":
		case "map":
			openModal(action);
			break;
		case "back":
			backMenu();
			break;
		case "quit":
			if (!AIHub.active) {
				saveGame();
				returnTitle();
			}
			break;
		case "title":
			if (!AIHub.active) returnTitle();
			break;
		case "retry":
			if (!AIHub.active) startGame(game.coop);
			break;
		case "fullscreen":
			if (document.fullscreenElement)
				document.exitFullscreen?.().catch(() => {});
			else document.documentElement.requestFullscreen?.().catch(() => {});
			break;
		case "warpBack":
		case "warpNext":
			game.camp = clamp(
				game.camp + (action === "warpNext" ? 1 : -1),
				0,
				camps.length - 1,
			);
			for (const p of game.players)
				positionPlayer(p, camps[game.camp].x + p.id, 0.8);
			dev.god = true;
			toast("Camp " + (game.camp + 1) + " · " + camps[game.camp].x + "m");
			updateHud(true);
			openModal("dev");
			break;
		case "respawn":
			for (const p of game.players) {
				positionPlayer(p, camps[game.camp].x + p.id, 0.8);
				p.invuln = 2;
			}
			game.lives = 3;
			break;
		case "allRelics":
			for (const t of treasures) t.collected = true;
			game.collected = treasures.map((t) => t.index);
			game.metrics.treasures = 8;
			dev.god = true;
			updateHud(true);
			toast("Eight treasures packed. The Sun Gate awaits.");
			break;
		case "step": {
			const old = modalName;
			modalName = null;
			fixedTick(1 / 60, [{ x: 0, y: 0, jump: false }]);
			modalName = old;
			break;
		}
		case "resetDev":
			Object.assign(settings, DEFAULTS);
			Object.assign(dev, {
				god: false,
				fly: false,
				wire: false,
				reveal: false,
			});
			physics.gravity = { x: 0, y: -settings.gravity, z: 0 };
			saveOptions();
			openModal("dev");
			toast("Field lab reset to expedition defaults");
			break;
	}
}
document.addEventListener("click", (e) => {
	if (hubEnded) return;
	const btn = e.target.closest("[data-act]");
	if (btn) {
		if (
			activity(
				input.last === "gamepad" && !e.isTrusted
					? "gamepad"
					: e.pointerType === "touch"
						? "touch"
						: "keyboard",
			)
		)
			return;
		unlockAudio();
		act(btn.dataset.act);
	}
	const credit = e.target.closest("[data-credit]");
	if (credit) showCredit(credit.dataset.credit);
});
document.addEventListener("pointerover", (e) => {
	const el = e.target.closest("button,input,select");
	if (el) {
		refreshFocus();
		const n = focusItems.indexOf(el);
		if (n >= 0) setMenuFocus(n);
	}
});
document.addEventListener("pointerdown", (e) => {
	if (hubEnded) return;
	activity(e.pointerType === "touch" ? "touch" : "keyboard");
	unlockAudio();
});
document.addEventListener("keydown", (e) => {
	if (hubEnded) return;
	if (
		[
			"ArrowLeft",
			"ArrowRight",
			"ArrowUp",
			"ArrowDown",
			"Space",
			"Escape",
			"Tab",
		].includes(e.code)
	)
		e.preventDefault();
	if (e.repeat && ["Escape", "KeyM"].includes(e.code)) return;
	if (activity("keyboard")) return;
	unlockAudio();
	if (modalName === "map" && e.code === "KeyM") {
		closeModal();
		return;
	}
	if (modalName || game.mode === "title") {
		if (e.code === "ArrowDown" || e.code === "Tab") navigateMenu(1);
		else if (e.code === "ArrowUp") navigateMenu(-1);
		else if (e.code === "ArrowLeft") changeFocused(-1);
		else if (e.code === "ArrowRight") changeFocused(1);
		else if (e.code === "Enter" || e.code === "Space") {
			refreshFocus();
			focusItems[focusIndex]?.click();
		} else if (e.code === "Escape") backMenu();
		return;
	}
	if (e.code === "Escape" || e.code === "KeyP") {
		if (game.mode === "play") openModal("pause");
		return;
	}
	if (e.code === "KeyM" && game.mode === "play") {
		openModal("map");
		return;
	}
	input.keys.add(e.code);
});
document.addEventListener("keyup", (e) => input.keys.delete(e.code));
addEventListener("blur", () => {
	input.keys.clear();
	input.jump = false;
	input.touchX = 0;
	input.touchY = 0;
});
document.addEventListener("visibilitychange", () => {
	if (document.hidden && !AIHub.active && game.mode === "play" && !modalName) {
		saveGame();
		openModal("pause");
	}
});
function pollPads() {
	if (hubEnded) return;
	const pads = Array.from(navigator.getGamepads?.() ?? []).filter(Boolean);
	const now = performance.now();
	for (const pad of pads) {
		const prev = input.padsPrev.get(pad.index) ?? [];
		const buttons = pad.buttons.map((b) => b.pressed);
		const pressed = (n) => buttons[n] && !prev[n];
		const active =
			buttons.some(Boolean) || pad.axes.some((a) => Math.abs(a) > 0.25);
		const exited = active && activity("gamepad");
		if (active) unlockAudio();
		if (!exited) {
			if (modalName === "map" && pressed(3)) {
				closeModal();
				input.padsPrev.set(pad.index, buttons);
				continue;
			}
			if (modalName || game.mode === "title") {
				let nav = pressed(13) ? 1 : pressed(12) ? -1 : 0;
				const axis = pad.axes[1] ?? 0;
				if (Math.abs(axis) > 0.6 && now - input.navAt > 210) {
					nav = axis > 0 ? 1 : -1;
					input.navAt = now;
				}
				if (nav) navigateMenu(nav);
				if (pressed(14)) changeFocused(-1);
				if (pressed(15)) changeFocused(1);
				if (pressed(0)) {
					refreshFocus();
					const e = focusItems[focusIndex];
					if (e?.type === "checkbox") {
						e.checked = !e.checked;
						e.dispatchEvent(new Event("input", { bubbles: true }));
					} else e?.click();
				}
				if (pressed(1) || (pressed(9) && !buttons[8])) backMenu();
			} else if (game.mode === "play") {
				if (pressed(9) && !buttons[8]) openModal("pause");
				if (pressed(3)) openModal("map");
			}
		}
		input.padsPrev.set(pad.index, buttons);
	}
}
function touchStart(e) {
	if (hubEnded) return;
	if (activity("touch")) return;
	if (game.mode !== "play" || modalName) return;
	unlockAudio();
	e.preventDefault();
	const onLeft = e.clientX < innerWidth * 0.53;
	if (onLeft && input.touchId === null) {
		input.touchId = e.pointerId;
		input.touchStart = { x: e.clientX, y: e.clientY };
		$("touchRing").style.left = e.clientX - 50 + "px";
		$("touchRing").style.top = e.clientY - 50 + "px";
		$("touchRing").classList.remove("hidden");
		try {
			e.target.setPointerCapture?.(e.pointerId);
		} catch {}
	} else {
		input.jump = true;
		try {
			e.target.setPointerCapture?.(e.pointerId);
		} catch {}
	}
}
function touchMove(e) {
	if (
		e.pointerType !== "touch" ||
		e.pointerId !== input.touchId ||
		!input.touchStart
	)
		return;
	const dx = e.clientX - input.touchStart.x,
		dy = e.clientY - input.touchStart.y;
	input.touchX = clamp(dx / 45, -1, 1);
	input.touchY = Math.abs(dy) > 25 ? clamp(dy / 45, -1, 1) : 0;
	$("touchDot").style.transform =
		"translate(" + clamp(dx, -35, 35) + "px," + clamp(dy, -35, 35) + "px)";
	input.lastActivity = performance.now();
}
function touchEnd(e) {
	if (e.pointerId === input.touchId) {
		input.touchId = null;
		input.touchStart = null;
		input.touchX = 0;
		input.touchY = 0;
		$("touchRing").classList.add("hidden");
	} else input.jump = false;
}
for (const el of [$("world"), $("touchJump")]) {
	el.addEventListener("pointerdown", (e) => {
		if (e.pointerType === "touch") touchStart(e);
	});
	el.addEventListener("pointermove", touchMove);
	el.addEventListener("pointerup", touchEnd);
	el.addEventListener("pointercancel", touchEnd);
}
let debugLines = null;
const revealTags = [];
function renderReveal() {
	if (dev.reveal && revealTags.length === 0) {
		for (const t of treasures) {
			const tag = document.createElement("span");
			tag.className = "name-tag";
			tag.style.color = "#f6c75d";
			tag.textContent = "◇ " + t.name;
			$("peerNames").append(tag);
			revealTags.push({ t, tag });
		}
	}
	for (const { t, tag } of revealTags) {
		const visible =
			dev.reveal && !t.collected && Math.abs(t.x - game.players[0].x) < 28;
		tag.style.display = visible ? "block" : "none";
		if (visible) {
			const v = new THREE.Vector3(t.x, t.y + 1, 0).project(camera);
			tag.style.left = ((v.x + 1) * innerWidth) / 2 + "px";
			tag.style.top = ((-v.y + 1) * innerHeight) / 2 + "px";
		}
	}
}
function renderDebug() {
	if (!dev.wire) {
		if (debugLines) debugLines.visible = false;
		return;
	}
	const data = physics.debugRender();
	if (!debugLines) {
		const geo = new THREE.BufferGeometry();
		debugLines = new THREE.LineSegments(
			geo,
			new THREE.LineBasicMaterial({
				vertexColors: true,
				depthTest: false,
				transparent: true,
				opacity: 0.8,
			}),
		);
		debugLines.frustumCulled = false;
		scene.add(debugLines);
	}
	debugLines.visible = true;
	debugLines.geometry.setAttribute(
		"position",
		new THREE.BufferAttribute(data.vertices, 3),
	);
	debugLines.geometry.setAttribute(
		"color",
		new THREE.BufferAttribute(data.colors, 4),
	);
}
let previousFrame = 0,
	accumulator = 0;
function frame(now) {
	requestAnimationFrame(frame);
	if (!renderer || game.mode === "loading") return;
	const dt = Math.min(0.1, (now - (previousFrame || now)) / 1000);
	previousFrame = now;
	pollPads();
	if (game.mode === "title" && !modalName && now - input.lastActivity > 10000)
		startAttract();
	if (!game.manual) {
		accumulator += dt * settings.timeScale;
		let loops = 0;
		while (accumulator >= 1 / 60 && loops++ < 12) {
			fixedTick(1 / 60);
			accumulator -= 1 / 60;
		}
	}
	if (game.mode === "title") {
		moveCamera(28, 0.8, dt);
		game.players[0].avatar.model.rotation.y = -0.6;
	}
	updateGhosts(dt);
	sendHub();
	if (game.toastUntil < now) $("toast").classList.add("hidden");
	if (camera.userData.shake > 0 && settings.shake) {
		camera.userData.shake -= dt;
		camera.position.x += Math.sin(now * 0.13) * 0.06;
	}
	renderDebug();
	renderReveal();
	renderer.render(scene, camera);
	musicTick();
}
function stateSnapshot() {
	return {
		title: document.title,
		mode: game.mode,
		modal: modalName,
		backend,
		three: THREE.REVISION,
		rapier: RAPIER.version(),
		lives: game.lives,
		score: game.score,
		elapsed: game.elapsed,
		collected: [...game.collected],
		camp: game.camp,
		coop: game.coop,
		won: game.won,
		worldTime: game.worldTime,
		metrics: { ...game.metrics },
		settings: { ...settings },
		dev: { ...dev },
		players: game.players.map((p) => ({
			x: p.x,
			y: p.y,
			vx: p.vx,
			vy: p.vy,
			grounded: p.grounded,
			vine: p.vine?.x ?? null,
			climbing: !!p.climbing,
			anim: p.avatar.anim,
		})),
		ghosts: [...ghosts].map(([id, g]) => ({ id, x: g.x, y: g.y })),
		audio: {
			state: audio.ctx?.state ?? "locked",
			events: audio.events,
			voices: audio.voices,
			music: settings.music,
		},
		save: !!saved,
		hub: {
			active: AIHub.active,
			started: hubStarted,
			ended: hubEnded,
			reported: hubReported,
		},
		focus: focusItems[focusIndex]?.textContent?.trim() ?? "",
	};
}
async function boot() {
	try {
		await makeScene();
		game.players = [createPlayer(0, C.red), createPlayer(1, 0x659cb3)];
		$("loading").classList.add("hidden");
		returnTitle();
		updatePrompts();
		window.__game = {
			state: stateSnapshot,
			start: startGame,
			act,
			advance: (frames, controls = null) => {
				for (let n = 0; n < frames; n++) fixedTick(1 / 60, controls);
				updateHud(true);
				return stateSnapshot();
			},
			manual: (value) => (game.manual = value),
			warp: (x, y = 0.8, id = 0) => {
				positionPlayer(game.players[id], x, y);
				moveCamera(x, y, 0, true);
			},
			set: (key, value) => {
				if (key in settings) settings[key] = value;
				if (key in dev) dev[key] = value;
			},
			damage: (reason = "Test hazard") => damage(game.players[0], reason),
			audioProof,
			audioMeter: () => {
				if (!audio.analyser) return 0;
				const d = new Uint8Array(audio.analyser.frequencyBinCount);
				audio.analyser.getByteFrequencyData(d);
				return Math.max(...d);
			},
			save: saveGame,
			attract: startAttract,
			title: returnTitle,
			sceneInfo: () => ({
				objects: scene.children.length,
				treasures: treasures.map((t) => ({
					x: t.x,
					y: t.y,
					collected: t.collected,
				})),
				vines: vines.map((v) => ({
					x: v.x,
					endX: v.end.x,
					endY: v.end.y,
					vel: v.vel,
				})),
				crocs: crocs.map((c) => ({ x: c.x, closed: c.closed })),
				gaps: gaps.map((g) => ({ a: g.a, b: g.b, type: g.type, open: g.open })),
				hazards: hazards.map((h) => ({ x: h.x, y: h.y, type: h.type })),
				logs: logs.map((l) => ({ ...l.rb.translation() })),
			}),
		};
		await initHub();
		requestAnimationFrame(frame);
	} catch (error) {
		console.error(error);
		$("loading").classList.remove("hidden");
		$("loadMessage").innerHTML =
			'<span class="error-detail">The trail could not open. Check your connection and use a current browser with WebGPU or WebGL 2.<br>' +
			esc(error.message) +
			"</span>";
		document.querySelector(".loader").style.display = "none";
		if (AIHub.active) AIHub.fail(error.message);
		window.__bootError = error.message;
	}
}
addEventListener("resize", resizeScene);
boot();
