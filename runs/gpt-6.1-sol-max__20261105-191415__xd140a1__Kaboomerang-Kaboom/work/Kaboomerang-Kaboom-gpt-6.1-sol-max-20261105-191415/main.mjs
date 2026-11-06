import RAPIER from "@dimforge/rapier3d-compat";
import interview from "../exit-interview.json";
import { Soundtrack, sound } from "./audio.mjs";
import { DEFAULTS, Shift, WAVES } from "./core.mjs";
import { BrigadeLink } from "./network.mjs";
import { Rooftop } from "./scene.mjs";

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const htmlEscape = (s) =>
	String(s)
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
const stored = (key, fallback) => {
	try {
		return JSON.parse(localStorage.getItem(key)) ?? fallback;
	} catch {
		return fallback;
	}
};
const persist = (key, value) => {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {}
};
const settings = {
	master: 0.65,
	music: 0.1,
	sfx: 0.7,
	voice: 0.5,
	shake: 0.7,
	glyphs: "ps",
	reduced: false,
	...stored("kaboomerang-settings", {}),
};
const audio = new Soundtrack(settings);
let best = stored("kaboomerang-best", 0),
	view,
	game,
	remoteSnapshot = null,
	screen = "title",
	returnScreen = "title",
	attract = false,
	loaded = false,
	bootError = null;
let lastInput = "keyboard",
	idleAt = performance.now(),
	lastFrame = 0,
	accumulator = 0,
	hudAt = 0,
	netAt = 0,
	hubStarted = false,
	hubEnded = false,
	_hubInfo = null;
let callUntil = 0,
	callTitle = "",
	callTip = "",
	toastTimer = 0,
	practice = false,
	lastTick = -1,
	finishDelay = 0,
	eventSeq = 0,
	seenSeq = 0,
	eventBuffer = [],
	networkStatus = "";
let localCount = 1,
	pointerTarget = null,
	burstPressed = false,
	p2Burst = false,
	menuRepeat = 0,
	frameCount = 0;
let lastRender = 0,
	networkPump;
const keys = new Set(),
	touches = new Map(),
	remoteInputs = {};
const padButtons = new Map();

const link = new BrigadeLink(receiveNetwork, (text) => {
	networkStatus = text;
	const s = $("network-status");
	if (s) s.textContent = text;
	const start = $("room-start");
	if (start) start.disabled = link.members.length < 2;
	if (game && link.active && link.authority) {
		game.players = game.players.filter((p) => link.members.includes(p.id));
		if (game.state === "playing")
			for (const id of link.members)
				if (!game.players.some((p) => p.id === id))
					game.players.push({
						id,
						x: 0,
						charge: 1,
						caught: 0,
						score: 0,
						burst: 0,
					});
	}
});
const btn = (text, action, primary = false, extra = "") =>
	`<button class="btn ${primary ? "primary" : ""}" data-action="${action}" ${extra}><span>${text}</span><span class="arrow" aria-hidden="true">↗</span></button>`;
const close = () =>
	'<button class="icon-btn close" data-action="back" aria-label="Back">×</button>';
const panel = (eyebrow, title, content, wide = false) =>
	`<div class="scrim"><section class="panel ${wide ? "wide" : ""}">${close()}<div class="eyebrow">${eyebrow}</div><h2>${title}</h2>${content}</section></div>`;
function glyph(key = "action") {
	if (lastInput === "gamepad") {
		const xbox = settings.glyphs === "xbox";
		return (
			{
				action: xbox ? "A" : "×",
				back: xbox ? "B" : "○",
				move: "L",
				pause: "☰",
				splash: xbox ? "A" : "×",
			}[key] ?? "×"
		);
	}
	if (lastInput === "touch")
		return key === "move" ? "DRAG" : key === "pause" ? "Ⅱ" : "TAP";
	return (
		{ action: "↵", back: "Esc", move: "A D", pause: "Esc", splash: "Space" }[
			key
		] ?? "↵"
	);
}
function notify(text) {
	$("toast").textContent = text;
	$("toast").style.display = "block";
	clearTimeout(toastTimer);
	toastTimer = setTimeout(() => ($("toast").style.display = "none"), 2800);
}
function call(title, tip = "", seconds = 2.6) {
	callTitle = title;
	callTip = tip;
	callUntil = performance.now() + seconds * 1000;
}
function pop(text, x, y, color) {
	if (attract && Math.random() > 0.5) return;
	const p = document.createElement("div");
	p.className = "pop";
	const xy = view.project(x, y, 0.5);
	p.style.left = `${xy.x}px`;
	p.style.top = `${xy.y}px`;
	p.style.color = color ?? "#fff8e9";
	p.textContent = text;
	$("popups").appendChild(p);
	setTimeout(() => p.remove(), 950);
}
function activity(type) {
	idleAt = performance.now();
	const wasAttract = attract;
	if (attract) {
		attract = false;
		$("attract").classList.remove("active");
		game.config = { ...DEFAULTS };
		game.reset(1);
		game.state = "idle";
		show("title");
	}
	if (type && lastInput !== type) {
		lastInput = type;
		document.body.classList.toggle("touch", type === "touch");
		updatePrompts();
	}
	return wasAttract;
}
function updatePrompts() {
	if (!$("ability-glyph")) return;
	$("ability-glyph").textContent =
		lastInput === "keyboard" ? "␣" : glyph("splash");
	$("control-hint").innerHTML =
		lastInput === "gamepad"
			? `<span class="glyph round">L</span> MOVE &nbsp; <span class="glyph round">${glyph()}</span> SPLASHBACK &nbsp; <span class="glyph">☰</span> PAUSE`
			: "<kbd>A</kbd><kbd>D</kbd> / MOUSE · MOVE &nbsp; <kbd>SPACE</kbd> SPLASHBACK";
	const hint = $("focus-hint");
	if (hint)
		hint.textContent =
			lastInput === "gamepad"
				? `${glyph()} SELECT · ${glyph("back")} BACK · D-PAD NAVIGATE`
				: "↑ ↓ SELECT · ENTER CONFIRM · ESC BACK";
}
function range(
	label,
	key,
	value,
	min,
	max,
	step,
	group = "settings",
	suffix = "%",
) {
	const shown =
		suffix === "%"
			? `${Math.round(value * 100)}%`
			: Number(value).toFixed(step < 0.1 ? 2 : 1) + suffix;
	return `<div class="row"><label for="${group}-${key}">${label}</label><div class="range-wrap"><input id="${group}-${key}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-group="${group}" data-key="${key}"><output>${shown}</output></div></div>`;
}
function show(next) {
	screen = next;
	document.body.classList.toggle("playing", screen === "" && !attract);
	$("hud").classList.toggle(
		"active",
		screen === "" || ["pause", "dev"].includes(screen) || attract,
	);
	let html = "";
	if (next === "title")
		html = `<main class="title-screen"><div class="brandline"><span class="brand-dot"></span>A BUCKET-BASED EMERGENCY</div><h1>KABOO<br><span class="orange">MERANG</span><span style="color:var(--orange)">!</span></h1><div class="tagline">A little splash.<br>A lot of nerve.</div><div class="menu-stack">${btn("START THE SHIFT", "start", true)}${btn("BUCKET BUDDIES", "coop")}${btn("HOW TO PLAY", "help")}${btn("SETTINGS", "settings")}${btn("ABOUT & CREDITS", "about")}</div><div class="menu-meta"><span>1–4 BUCKETEERS</span><span>8 ROUNDS · ONE BIG GRIN</span></div><div class="title-best">NEIGHBOURHOOD BEST<strong>${String(best).padStart(6, "0")}</strong></div><div class="title-seal">CATCH.<br>SPLASH.<br>REPEAT.</div><div class="version">AN ORIGINAL RIFF ON KABOOM! · 1981 → 2026</div></main>`;
	if (next === "help")
		html = panel(
			"THE BUCKET BRIGADE HANDBOOK",
			"Keep him frowning.",
			`<div class="columns"><div class="rule"><div class="number">1</div><strong>Catch. Don’t crack.</strong><p>Slide your three water buckets under the bombs. Catches are automatic. Miss the whole stack and a chain explosion costs a bucket.</p></div><div class="rule"><div class="number">2</div><strong>Make a splashback.</strong><p>Press <b>${glyph("splash")}</b> to clear nearby low bombs and slow the rain. Catches refill your meter. A gold bomb gives it a big boost.</p></div><div class="rule"><div class="number">3</div><strong>Read the mischief.</strong><p>Orange bombs curve back. Later rounds bring wind and denser patterns. Build a streak for up to ×5 points. Every 1,000 points restores a lost bucket.</p></div><div class="rule"><div class="number">4</div><strong>Bring a bucket buddy.</strong><p>Share three lives and the score. Catch for each other! Local player two uses J / L and I, or another controller. Online supports four.</p></div></div><p class="fine">MOVE: left stick / D-pad, A & D / arrows, or mouse. TOUCH: drag anywhere, tap or use SPLASHBACK. PAUSE: Options / Escape. Finish eight rounds to save the district, then try endless Overtime.</p><div class="actions">${btn(returnScreen === "pause" ? "BACK TO SHIFT" : "GOT IT", "back", true)}</div>`,
			true,
		);
	if (next === "settings")
		html = panel(
			"MAKE YOURSELF COMFORTABLE",
			"Settings",
			`${range("Master volume", "master", settings.master, 0, 1, 0.05)}${range("Music", "music", settings.music, 0, 1, 0.05)}${range("Sound effects", "sfx", settings.sfx, 0, 1, 0.05)}${range("Gibberish voices", "voice", settings.voice, 0, 1, 0.05)}${range("Screen shake", "shake", settings.shake, 0, 1, 0.05)}<div class="row"><label>Controller glyphs</label><button class="btn small" data-action="glyphs">${settings.glyphs === "ps" ? "PLAYSTATION × ○ □ △" : "XBOX A B X Y"}</button></div><div class="row"><label>Reduced motion</label><button class="btn small" data-action="reduced">${settings.reduced ? "ON" : "OFF"}</button></div><div class="actions">${btn("FULLSCREEN", "fullscreen")}${btn("DONE", "back", true)}</div>`,
		);
	if (next === "pause")
		html = panel(
			"TAKE A BREATHER",
			"Shift paused.",
			`<div class="menu-stack">${btn("BACK TO THE BUCKETS", "resume", true)}${btn("HOW TO PLAY", "help")}${btn("SETTINGS", "settings")}${btn("DEVELOPER TOOLS", "dev")}${btn("ABOUT & CREDITS", "about")}${AIHub.active ? "" : btn("RESTART SHIFT", "restart")}${AIHub.active ? "" : btn("END SHIFT", "quit")}</div><div class="focus-hint" id="focus-hint"></div>${AIHub.active || (link.active && !link.authority) ? '<p class="fine">Your brigade’s shared world keeps running while this menu is open.</p>' : ""}`,
		);
	if (next === "dev") {
		const cfg = game.config;
		html = panel(
			"LIVE BALANCE BENCH · PRACTICE RUN",
			"Developer tools",
			`${range("Fall gravity", "fallSpeed", cfg.fallSpeed, 0.25, 2.5, 0.05, "dev", "×")}${range("Drop tempo", "dropRate", cfg.dropRate, 0.3, 2.5, 0.05, "dev", "×")}${range("Bucket width", "bucketWidth", cfg.bucketWidth, 0.7, 3.2, 0.05, "dev", " m")}${range("Move speed", "moveSpeed", cfg.moveSpeed, 8, 45, 1, "dev", " m/s")}${range("Catch assist", "assist", cfg.assist, 0, 0.8, 0.05, "dev", " m")}<div class="row"><label>Infinite buckets</label><button class="btn small" data-action="god">${cfg.invincible ? "ON" : "OFF"}</button></div><div class="row"><label>Autopilot</label><button class="btn small" data-action="bot">${cfg.autoPlay ? "ON" : "OFF"}</button></div><div class="row"><label>Round</label><div style="display:flex;align-items:center;gap:16px"><button class="btn small" data-action="wave-prev">−</button><b>${game.wave + 1} / 8</b><button class="btn small" data-action="wave-next">+</button></div></div><div class="actions">${btn("REFILL BUCKETS", "refill")}${btn("STEP 1 SECOND", "step")}</div><div class="actions">${btn("RESET DEFAULTS", "reset-dev")}${btn("RESUME", "resume", true)}</div><p class="fine">Changes apply live. This menu freezes solo play. Step advances exactly one second. Practice scores do not replace your best.</p>`,
			true,
		);
	}
	if (next === "coop")
		html = panel(
			"MANY HANDS. MORE BUCKETS.",
			"Bucket buddies",
			`<p>One neighbourhood. Three shared lives. Save it together.</p><div class="menu-stack">${btn("LOCAL · TWO BUCKETEERS", "local", true)}${btn("ONLINE · CREATE ROOM", "host")}${btn("ONLINE · JOIN ROOM", "join-screen")}</div><p class="fine">Local: Player 1 uses mouse, A/D or the first controller. Player 2 uses J/L + I or the second controller. Online: one device per player, up to four. AI Hub sessions connect automatically.</p>`,
		);
	if (next === "online-host")
		html = panel(
			"ASSEMBLE THE BRIGADE",
			"Your room.",
			`<div class="room-code" id="room-code">${link.code ?? "••••••"}</div><div class="network-status" id="network-status">${htmlEscape(networkStatus)}</div><p class="fine">Send this code to your buddies. They choose Bucket Buddies → Join Room. Same-browser tabs connect directly; separate devices use the PeerJS internet relay for setup.</p><div class="actions">${btn("COPY ROOM CODE", "copy")}${btn("START TOGETHER", "room-start", true, `id="room-start" ${link.members.length < 2 ? "disabled" : ""}`)}</div>`,
		);
	if (next === "online-join")
		html = panel(
			"BUCKETS UP, BUDDY",
			"Join a room.",
			`<p>Enter the six-letter code from your host.</p><input type="text" id="join-code" maxlength="6" autocomplete="off" spellcheck="false" aria-label="Six-letter room code" placeholder="ABCDEF"><div class="network-status" id="network-status">${htmlEscape(networkStatus)}</div><div class="actions">${btn("JOIN THE BRIGADE", "join", true)}</div>`,
		);
	if (next === "online-wait")
		html = panel(
			"BRIGADE ASSEMBLED",
			"Buckets at the ready.",
			`<p>Your buddy will start the shift. You share three buckets, so cover each other!</p><div class="network-status" id="network-status">${htmlEscape(networkStatus)}</div><p class="fine">MOVE: left stick / D-pad / A D / mouse / touch drag.<br>SPLASHBACK: Cross / A / Space / tap.</p>`,
		);
	if (next === "results") {
		const s = snapshot();
		const won = s.state === "won";
		const accuracy =
			s.caught + s.misses
				? Math.round((s.caught / (s.caught + s.misses)) * 100)
				: 0;
		html = panel(
			won
				? "THE DISTRICT IS STILL IN ONE PIECE"
				: "THE BOMBER GOT THE LAST LAUGH",
			won ? "Well bucketed!" : "A cracking effort.",
			`<p>${won ? "Eight rounds. A very soggy bomber. The neighbourhood owes you one." : "Shake it off, fill ’em up, and give that grin another go."}${practice ? " <b>Practice run.</b>" : ""}</p><div class="result-grid"><div><strong>${s.score.toLocaleString()}</strong><span>POINTS</span></div><div><strong>${s.bestCombo}</strong><span>BEST STREAK</span></div><div><strong>${accuracy}%</strong><span>CAUGHT</span></div></div><p class="fine">${s.caught} catches · ${s.splashes} splashbacks · ${Math.floor(s.time / 60)}:${String(Math.floor(s.time % 60)).padStart(2, "0")} on the job${!practice && s.score >= best && s.score > 0 ? " · NEIGHBOURHOOD BEST!" : ""}</p><div class="actions">${link.active && !link.authority ? '<button class="btn" disabled>YOUR HOST CHOOSES WHAT’S NEXT</button>' : won ? btn("OVERTIME · ENDLESS", "overtime", true) : btn("TRY ANOTHER SHIFT", "restart", true)}${btn("TITLE SCREEN", "quit")}</div>`,
		);
	}
	if (next === "about") {
		const info = interview.sourceInformation;
		const labels = {
			date: "Date",
			source: "Source",
			plan: "Plan",
			genre: "Genre",
			perspective: "Perspective",
			tech: "Tech",
			artDirection: "Art Direction",
			animation: "Animation",
			audio: "Audio",
			online: "Online",
			testing: "Testing",
			research: "Research",
			environment: "Environment",
			model: "Model",
			usage: "Usage",
		};
		html = panel(
			"AN INDEPENDENT ARCADE LOVE LETTER",
			"About & credits",
			`<div class="credits scroll"><p><b>Kaboomerang</b> · A little splash. A lot of nerve.<br>Inspired by <i>Kaboom!</i>, designed by Larry Kaplan and published by Activision in 1981. This is an original fan-inspired game; all visuals and sound are generated in code.</p><h3>Source Information</h3><dl>${Object.entries(
				info,
			)
				.map(([k, v]) => `<dt>${labels[k] ?? k}</dt><dd>${htmlEscape(v)}</dd>`)
				.join(
					"",
				)}<dt>Renderer in use</dt><dd>${view?.backend ?? "unknown"}</dd></dl>${[
				["Testing Feedback", "testingFeedback"],
				["Engine Feedback", "engineFeedback"],
				["Prompt Feedback", "promptFeedback"],
			]
				.map(
					([label, key]) =>
						`<h3 class="feedback-title">${label}</h3><ol>${interview[key].map((v) => `<li>${htmlEscape(v)}</li>`).join("")}</ol>`,
				)
				.join(
					"",
				)}<h3>Research & libraries</h3><p class="fine"><a href="https://www.ataricompendium.com/archives/manuals/vcs/kaboom.pdf" ${AIHub.active ? 'onclick="return false"' : ""}>Original Kaboom! manual</a> · <a href="https://atariage.com/manual_html_page.php?SoftwareLabelID=257" ${AIHub.active ? 'onclick="return false"' : ""}>Manual transcript</a> · Three.js MIT · Rapier Apache-2.0 · PeerJS MIT · AI Hub client 1.4.0. Library license notices are included in this file.</p><div class="actions">${btn("BACK", "back", true)}</div></div>`,
			true,
		);
	}
	if (next === "hub-wait")
		html =
			'<div class="scrim"><section class="panel"><div class="eyebrow">AI HUB · BUCKET BRIGADE</div><h2>Kaboomerang</h2><p>Filling everyone’s buckets…</p></section></div>';
	if (next === "hub-ended") html = "";
	$("ui").innerHTML = html;
	updatePrompts();
	if (next !== "")
		requestAnimationFrame(() => {
			const focus = $("ui").querySelector(
				"button:not(.close):not(:disabled),input",
			);
			focus?.focus({ preventScroll: true });
		});
}
function back() {
	if (AIHub.active && hubEnded) return;
	if (screen === "pause") {
		resume();
		return;
	}
	if (screen === "dev") {
		show("pause");
		return;
	}
	if (screen.startsWith("online")) {
		if (AIHub.active) return;
		link.close();
		networkStatus = "";
		show("coop");
		return;
	}
	if (screen === "coop") {
		show("title");
		return;
	}
	if (screen === "results") {
		action("quit");
		return;
	}
	show(returnScreen);
}
function pause() {
	if (attract) {
		activity(lastInput);
		return;
	}
	if (game && snapshot().state === "playing" && screen === "") {
		show("pause");
		keys.clear();
		burstPressed = false;
		if (link.kind === "host") link.send({ type: "host-pause", paused: true });
		else if (link.active && !link.authority)
			link.send(
				{ type: "input", axis: 0, burst: false },
				AIHub.active ? AIHub.host : 0,
			);
	}
}
function resume() {
	show("");
	keys.clear();
	if (link.kind === "host") link.send({ type: "host-pause", paused: false });
}
function begin(count = 1) {
	if (AIHub.active && hubEnded) return;
	practice = false;
	localCount = count;
	pointerTarget = null;
	remoteSnapshot = null;
	eventSeq = 0;
	seenSeq = 0;
	eventBuffer = [];
	finishDelay = 0;
	game.config = { ...DEFAULTS };
	if (lastInput === "touch") {
		game.config.assist = 0.42;
		game.config.moveSpeed = 32;
	}
	game.reset(count);
	if (link.kind.startsWith("hub")) {
		game.players = game.players.filter((p) => link.members.includes(p.id));
		game.countdown = 0;
	}
	call("BUCKETS AT THE READY", WAVES[0].tip, 2.6);
	show("");
	audio.unlock().catch(() => {});
	if (link.active && link.authority) link.send({ type: "begin", count });
}
function finishHub(won) {
	if (!AIHub.active || !AIHub.isHost || hubEnded) return;
	const scores = Object.fromEntries(link.members.map((id) => [id, game.score]));
	const stats = Object.fromEntries(
		link.members.map((id) => [
			id,
			{
				Catches: game.players.find((p) => p.id === id)?.caught ?? 0,
				"Team streak": game.bestCombo,
			},
		]),
	);
	AIHub.finish({ standings: [link.members], scores, won, stats });
}
function onEvent(e) {
	if (!view) return;
	view.event(e);
	if (!link.authority) return;
	eventBuffer.push({ ...e, seq: ++eventSeq });
	if (eventBuffer.length > 12) eventBuffer.shift();
	handleEvent(e);
}
function handleEvent(e) {
	if (e.type === "catch") {
		audio.play("catch", 1 + Math.min(e.combo, 60) * 0.012);
		if (e.kind === "gold") pop(`GOLDEN! +${e.points}`, e.x, e.y, "#ffd165");
		else if (e.combo % 12 === 0)
			pop(
				`×${Math.min(5, 1 + Math.floor(e.combo / 12))} · KEEP IT UP!`,
				e.x,
				e.y,
				"#ffd165",
			);
		else if (e.combo % 3 === 0) pop(`+${e.points}`, e.x, e.y);
	}
	if (e.type === "splash") {
		audio.play("splash");
		pop("SPLASHBACK!", e.x, -1.6, "#8be3d8");
	}
	if (e.type === "miss") {
		audio.play("boom");
		audio.play("voice", 0.8);
		call(
			e.lives > 0 ? "OH, BUCKETS." : "KABOOMERANG!",
			e.lives > 0
				? `${e.lives} ${e.lives === 1 ? "BUCKET" : "BUCKETS"} LEFT · KEEP HIM FROWNING`
				: "THAT GRIN AGAIN.",
			1.8,
		);
	}
	if (e.type === "restore") {
		audio.play("restore");
		notify("BUCKET RESTORED · every 1,000 points");
	}
	if (e.type === "wave") {
		call(`ROUND ${e.wave + 1} · ${e.name}`, e.tip, 2.7);
		if (e.wave > 0) audio.play("voice", 1 + e.wave * 0.03);
	}
	if (e.type === "finish") {
		audio.play(e.won ? "win" : "voice");
		if (attract) {
			finishDelay = performance.now() + 3500;
			return;
		}
		if (AIHub.active) {
			finishHub(e.won);
			return;
		}
		if (e.won && !practice && game.score > best) {
			best = game.score;
			persist("kaboomerang-best", best);
		} else if (!practice && game.score > best) {
			best = game.score;
			persist("kaboomerang-best", best);
		}
		finishDelay = performance.now() + 1300;
	}
}
function snapshot() {
	return !link.authority && remoteSnapshot ? remoteSnapshot : game.snapshot();
}
function receiveNetwork(data, from) {
	if (hubEnded || !data || typeof data !== "object") return;
	if (data.type === "input" && link.authority && link.members.includes(from)) {
		remoteInputs[from] = {
			axis: clamp(Number(data.axis) || 0, -1, 1),
			target: Number.isFinite(data.target)
				? clamp(data.target, -8, 8)
				: undefined,
			burst: !!data.burst,
		};
	}
	if (data.type === "begin" && !link.authority) {
		remoteSnapshot = null;
		seenSeq = 0;
		finishDelay = 0;
		show("");
		call("BUCKETS AT THE READY", "Cover each other. Share the splash.", 2.7);
		audio.unlock().catch(() => {});
	}
	if (
		data.type === "world" &&
		!link.authority &&
		(from === 0 || from === AIHub.host)
	) {
		remoteSnapshot = data.state;
		if (screen === "hub-wait" || screen === "online-wait") show("");
		for (const e of data.events ?? []) {
			if (e.seq > seenSeq) {
				seenSeq = e.seq;
				view.event(e);
				handleEvent(e);
			}
		}
		if (
			remoteSnapshot.state !== "playing" &&
			!AIHub.active &&
			screen === "" &&
			!finishDelay
		)
			finishDelay = performance.now() + 1300;
	}
	if (data.type === "welcome") {
		link.me = data.id;
		link.members = data.members;
		show("online-wait");
	}
	if (data.type === "roster") {
		link.members = data.members;
	}
	if (data.type === "host-pause" && !link.authority) {
		if (data.paused)
			call("A QUICK BREATHER", "YOUR HOST PAUSED THE SHIFT", 86400);
		else call("BACK TO THE BUCKETS", "YOUR BRIGADE IS READY", 1.5);
	}
	if (data.type === "disconnected") {
		if (screen === "") show("pause");
		notify("Buddy disconnected. Reconnect from Bucket Buddies.");
	}
}
function action(name) {
	if (!loaded || (AIHub.active && hubEnded)) return;
	activity();
	if (name !== "fullscreen") audio.play("select");
	if (name === "start") {
		link.close();
		begin(1);
	} else if (name === "local") {
		link.close();
		begin(2);
	} else if (["help", "settings", "about"].includes(name)) {
		returnScreen = screen === "pause" || screen === "dev" ? "pause" : "title";
		show(name);
	} else if (name === "coop") show("coop");
	else if (name === "back") back();
	else if (name === "pause") pause();
	else if (name === "resume") resume();
	else if (name === "dev") {
		if (link.active && !link.authority) {
			notify("Balance tools are available to the host.");
			return;
		}
		practice = true;
		show("dev");
	} else if (name === "restart") {
		if (AIHub.active) return;
		if (link.active && !link.authority) {
			notify("The host starts the next shift.");
			return;
		}
		begin(localCount);
	} else if (name === "quit") {
		if (AIHub.active) return;
		link.close();
		attract = false;
		game.state = "idle";
		callUntil = 0;
		finishDelay = 0;
		show("title");
	} else if (name === "overtime") {
		if (AIHub.active || !link.authority) return;
		eventSeq = 0;
		eventBuffer = [];
		game.state = "playing";
		game.overtime = true;
		game.lives = 3;
		game.setWave(7);
		if (link.active) link.send({ type: "begin", count: localCount });
		show("");
		call("OVERTIME!", "The bomber never learns. How long can you last?", 3);
	} else if (name === "glyphs") {
		settings.glyphs = settings.glyphs === "ps" ? "xbox" : "ps";
		persist("kaboomerang-settings", settings);
		show("settings");
	} else if (name === "reduced") {
		settings.reduced = !settings.reduced;
		view.reducedMotion = settings.reduced;
		persist("kaboomerang-settings", settings);
		show("settings");
	} else if (name === "fullscreen") {
		if (document.fullscreenElement) document.exitFullscreen?.();
		else
			document.documentElement
				.requestFullscreen?.()
				.catch(() => notify("Fullscreen is unavailable in this browser."));
	} else if (name === "god") {
		game.config.invincible = !game.config.invincible;
		show("dev");
	} else if (name === "bot") {
		game.config.autoPlay = !game.config.autoPlay;
		show("dev");
	} else if (name === "refill") {
		game.lives = 3;
		game.players.forEach((p) => {
			p.charge = 1;
		});
		notify("Three buckets. Full splashback.");
	} else if (name === "step") {
		for (let i = 0; i < 60; i++) game.update(1 / 60, readInputs());
		notify("Advanced one second.");
	} else if (name === "wave-prev" || name === "wave-next") {
		game.setWave(clamp(game.wave + (name === "wave-next" ? 1 : -1), 0, 7));
		show("dev");
	} else if (name === "reset-dev") {
		game.config = { ...DEFAULTS };
		show("dev");
		notify("Balance restored to defaults.");
	} else if (name === "host") {
		const code = link.host();
		show("online-host");
		$("room-code").textContent = code;
	} else if (name === "join-screen") {
		networkStatus = "";
		show("online-join");
		requestAnimationFrame(() => $("join-code")?.focus());
	} else if (name === "join") {
		const code = $("join-code")?.value.trim().toUpperCase();
		if (!code || !/^[A-Z2-9]{6}$/.test(code)) {
			notify("Enter all six letters of the room code.");
			return;
		}
		link.join(code);
	} else if (name === "room-start") {
		if (link.members.length > 1) begin(Math.max(...link.members) + 1);
	} else if (name === "copy") {
		navigator.clipboard
			?.writeText(link.code)
			.then(() => notify("Room code copied."))
			.catch(() => notify(`Room code: ${link.code}`));
	}
}

function visibleFocus() {
	return [...$("ui").querySelectorAll("button:not(:disabled),input")].filter(
		(e) => e.offsetParent !== null,
	);
}
function nav(direction) {
	if (
		["about", "help"].includes(screen) &&
		["up", "down"].includes(direction)
	) {
		$("ui")
			.querySelector(".panel")
			?.scrollBy({
				top: (direction === "up" ? -1 : 1) * Math.max(160, innerHeight * 0.3),
				behavior: "instant",
			});
		return;
	}
	const list = visibleFocus();
	if (!list.length) return;
	const current = document.activeElement;
	let i = list.indexOf(current);
	if (
		current?.type === "range" &&
		(direction === "left" || direction === "right")
	) {
		current.value = clamp(
			Number(current.value) +
				(direction === "right" ? 1 : -1) * Number(current.step),
			Number(current.min),
			Number(current.max),
		);
		current.dispatchEvent(new Event("input", { bubbles: true }));
		return;
	}
	i =
		(i + (direction === "up" || direction === "left" ? -1 : 1) + list.length) %
		list.length;
	list[i].focus({ preventScroll: true });
	list[i].scrollIntoView({ block: "nearest" });
	audio.play("tick");
}
document.addEventListener("click", (e) => {
	const b = e.target.closest("[data-action]");
	if (b && !b.disabled) {
		if (e.detail) activity(e.pointerType === "touch" ? "touch" : "keyboard");
		audio.unlock().catch(() => {});
		action(b.dataset.action);
	}
});
document.addEventListener("pointerover", (e) => {
	const b = e.target.closest("button,input");
	if (b && e.pointerType !== "touch") b.focus({ preventScroll: true });
});
document.addEventListener("input", (e) => {
	const input = e.target;
	if (!input.dataset.group) return;
	activity();
	const key = input.dataset.key,
		v = Number(input.value);
	if (input.dataset.group === "settings") {
		settings[key] = v;
		audio.apply();
		persist("kaboomerang-settings", settings);
	} else {
		game.config[key] = v;
		practice = true;
	}
	const out = input.parentElement.querySelector("output");
	out.textContent =
		input.dataset.group === "settings"
			? `${Math.round(v * 100)}%`
			: key === "moveSpeed"
				? `${v.toFixed(1)} m/s`
				: key === "bucketWidth" || key === "assist"
					? `${v.toFixed(2)} m`
					: `${v.toFixed(2)}×`;
});
window.addEventListener("keydown", (e) => {
	if (!loaded) return;
	const was = activity("keyboard");
	if (was) {
		e.preventDefault();
		return;
	}
	if (e.target?.type === "text") {
		if (e.key === "Escape") {
			e.preventDefault();
			back();
		} else if (e.key === "Enter") {
			e.preventDefault();
			action("join");
		}
		return;
	}
	keys.add(e.code);
	if (
		[
			"Space",
			"ArrowLeft",
			"ArrowRight",
			"ArrowUp",
			"ArrowDown",
			"Escape",
			"Enter",
		].includes(e.code)
	)
		e.preventDefault();
	if (e.repeat) return;
	audio.unlock().catch(() => {});
	if (e.code === "Escape") {
		if (screen === "") pause();
		else back();
	} else if (screen !== "") {
		if (e.code === "ArrowUp") nav("up");
		if (e.code === "ArrowDown") nav("down");
		if (e.code === "ArrowLeft") nav("left");
		if (e.code === "ArrowRight") nav("right");
		if (e.code === "Enter" || e.code === "Space") {
			const f = document.activeElement;
			if (f?.tagName === "BUTTON") f.click();
		}
	} else if (e.code === "Space") burstPressed = true;
	else if (e.code === "KeyI") p2Burst = true;
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("blur", () => {
	keys.clear();
	pointerTarget = null;
	if (screen === "" && !attract && !AIHub.active && link.kind === "none")
		pause();
});
window.addEventListener("resize", () => view?.resize());
window.addEventListener("pagehide", (e) => {
	if (!e.persisted) {
		loaded = false;
		clearInterval(networkPump);
		audio.stop();
		link.close();
		view?.renderer?.dispose();
		game?.dispose();
	}
});
window.addEventListener("pointermove", (e) => {
	if (!loaded) return;
	if (e.pointerType === "touch") {
		const t = touches.get(e.pointerId);
		if (t && screen === "") {
			t.moved = Math.max(t.moved, Math.abs(e.clientX - t.x));
			pointerTarget = clamp(
				t.world +
					(((e.clientX - t.x) / innerWidth) *
						(view.camera.right - view.camera.left)) /
						view.horizontalScale,
				-8,
				8,
			);
		}
		return;
	}
	const was = activity("keyboard");
	if (!was && screen === "" && !e.target.closest("button,input"))
		pointerTarget = view.pointerX(e.clientX, e.clientY);
});
window.addEventListener("pointerdown", (e) => {
	if (!loaded) return;
	const type = e.pointerType === "touch" ? "touch" : "keyboard";
	const was = activity(type);
	audio.unlock().catch(() => {});
	if (was) {
		e.preventDefault();
		return;
	}
	if (e.target.closest("button,input,a,.panel")) return;
	if (screen === "") {
		if (e.pointerType === "touch") {
			const p = snapshot().players.find(
				(p) => p.id === (link.active ? link.me : 0),
			);
			touches.set(e.pointerId, {
				x: e.clientX,
				y: e.clientY,
				world: p?.x ?? 0,
				time: performance.now(),
				moved: 0,
			});
			if (touches.size > 1) burstPressed = true;
		} else {
			pointerTarget = view.pointerX(e.clientX, e.clientY);
			if (e.button === 0) burstPressed = true;
		}
	}
});
window.addEventListener("pointerup", (e) => {
	const t = touches.get(e.pointerId);
	if (t && screen === "" && t.moved < 14 && performance.now() - t.time < 250)
		burstPressed = true;
	touches.delete(e.pointerId);
});
window.addEventListener("pointercancel", (e) => touches.delete(e.pointerId));
$("touch-pop").addEventListener("pointerdown", (e) => {
	e.preventDefault();
	e.stopPropagation();
	activity("touch");
	burstPressed = true;
	audio.unlock().catch(() => {});
});

function pollPads(now) {
	const pads = Array.from(navigator.getGamepads?.() ?? []).filter(Boolean);
	for (let i = 0; i < pads.length; i++) {
		const p = pads[i],
			old = padButtons.get(p.index) ?? [],
			buttons = p.buttons.map((b) => b.pressed),
			pressed = (n) => buttons[n] && !old[n];
		const ax = Math.abs(p.axes[0] ?? 0) > 0.19 ? p.axes[0] : 0,
			ay = Math.abs(p.axes[1] ?? 0) > 0.5 ? p.axes[1] : 0;
		if (ax || ay || buttons.some((b, n) => b && !old[n])) {
			const exited = activity("gamepad");
			if (exited) {
				padButtons.set(p.index, buttons);
				continue;
			}
			audio.unlock().catch(() => {});
		}
		if (pressed(9) && !buttons[8]) {
			if (screen === "") pause();
			else if (screen === "pause") resume();
		}
		if (screen !== "") {
			if (pressed(0)) {
				const f = document.activeElement;
				if (f?.tagName === "BUTTON") f.click();
			}
			if (pressed(1)) back();
			if (now > menuRepeat) {
				if (buttons[12] || ay < 0) {
					nav("up");
					menuRepeat = now + 210;
				} else if (buttons[13] || ay > 0) {
					nav("down");
					menuRepeat = now + 210;
				} else if (buttons[14] || ax < -0.5) {
					nav("left");
					menuRepeat = now + 130;
				} else if (buttons[15] || ax > 0.5) {
					nav("right");
					menuRepeat = now + 130;
				}
			}
		} else {
			if (i === 0 && pressed(0)) burstPressed = true;
			else if (i === 1 && pressed(0)) p2Burst = true;
			if (ax || buttons[14] || buttons[15]) pointerTarget = null;
		}
		padButtons.set(p.index, buttons);
	}
	return pads;
}
function readInputs(
	pads = Array.from(navigator.getGamepads?.() ?? []).filter(Boolean),
) {
	const primary = link.active ? link.me : 0;
	const inputs = Array.from({ length: Math.max(4, localCount) }, () => ({
		axis: 0,
	}));
	if (!AIHub.server) {
		const pad = pads[0];
		let axis =
			(keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) -
			(keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
		if (pad) {
			const ax = pad.axes[0] ?? 0;
			if (Math.abs(ax) > 0.19) axis = ax;
			axis +=
				(pad.buttons[15]?.pressed ? 1 : 0) - (pad.buttons[14]?.pressed ? 1 : 0);
		}
		if (axis) pointerTarget = null;
		inputs[primary] = { axis, target: pointerTarget, burst: burstPressed };
	}
	if (localCount > 1 && !link.active) {
		const pad = pads[1];
		let axis = (keys.has("KeyL") ? 1 : 0) - (keys.has("KeyJ") ? 1 : 0);
		if (pad) {
			const ax = pad.axes[0] ?? 0;
			if (Math.abs(ax) > 0.19) axis = ax;
			axis +=
				(pad.buttons[15]?.pressed ? 1 : 0) - (pad.buttons[14]?.pressed ? 1 : 0);
		}
		inputs[1] = { axis, burst: p2Burst };
	}
	if (link.authority && link.active)
		for (const [id, input] of Object.entries(remoteInputs))
			if (Number(id) !== primary) inputs[id] = { ...input };
	return inputs;
}
function renderHUD(now) {
	const s = snapshot();
	$("score").textContent = String(s.score).padStart(6, "0");
	$("round-label").textContent =
		(s.overtime
			? "OVERTIME"
			: `ROUND ${String(s.wave + 1).padStart(2, "0")} / 08`) +
		(s.wave === 4 ? " · WIND" : "");
	$("wave-progress").style.width =
		`${Math.min(100, ((s.resolved ?? s.spawned) / s.waveGoal) * 100)}%`;
	$("combo").textContent = `×${Math.min(5, 1 + Math.floor(s.combo / 12))}`;
	$("chain").textContent = s.combo
		? `${s.combo} CATCH STREAK`
		: "CATCH A LITTLE COURAGE";
	$("lives").innerHTML = [0, 1, 2]
		.map(
			(i) => `<span class="life-icon ${i >= s.lives ? "empty" : ""}"></span>`,
		)
		.join("");
	const player =
		s.players.find((p) => p.id === (link.active ? link.me : 0)) ?? s.players[0];
	const charge = player?.charge ?? 0;
	$("charge").style.width = `${charge * 100}%`;
	$("ability-glyph").style.background = charge >= 0.999 ? "#42bfc5" : "#bdc9bb";
	$("charge-label").textContent =
		charge >= 0.999
			? "READY TO MAKE WAVES"
			: `${Math.round(charge * 100)}% · CATCH TO RECHARGE`;
	if (s.countdown > 0 && screen === "") {
		const n = Math.ceil(s.countdown);
		if (n !== lastTick) {
			lastTick = n;
			audio.play("tick", 1 + (3 - n) * 0.2);
		}
		$("center-call").innerHTML =
			`<strong>${n}</strong><span>${attract ? "WATCH THE BUCKET BRIGADE" : "BUCKETS AT THE READY"}</span>`;
	} else if (now < callUntil) {
		const parts = callTitle.split(" · ");
		$("center-call").innerHTML =
			`${parts.length > 1 ? `<em class="call-kicker">${htmlEscape(parts.shift())}</em>` : ""}<strong>${htmlEscape(parts.join(" · "))}</strong>${callTip ? `<span>${htmlEscape(callTip)}</span>` : ""}`;
	} else $("center-call").innerHTML = "";
}
function startAttract() {
	attract = true;
	game.config = {
		...DEFAULTS,
		autoPlay: true,
		invincible: true,
		moveSpeed: 45,
		assist: 0.5,
		dropRate: 1.3,
	};
	game.reset(1);
	practice = false;
	show("");
	$("attract").classList.add("active");
	document.body.classList.remove("playing");
	call("THE BUCKET BRIGADE", "NO BUCKET LEFT BEHIND · ANY INPUT TO PLAY", 3);
}
function frame(now, networkOnly = false) {
	if (!loaded) return;
	const dt = Math.min(0.08, (now - (lastFrame || now)) / 1000);
	lastFrame = now;
	frameCount++;
	const pads = pollPads(now);
	if (AIHub.active && !hubStarted && AIHub.time() >= 0 && !hubEnded) {
		hubStarted = true;
		if (link.authority) begin(Math.max(...link.members) + 1);
		else show("");
	}
	if (!AIHub.active && screen === "title" && !attract && now - idleAt >= 10000)
		startAttract();
	if (finishDelay && now > finishDelay) {
		finishDelay = 0;
		if (attract) {
			game.config.autoPlay = true;
			game.reset(1);
		} else if (!AIHub.active) show("results");
	}
	const canSim =
		(screen === "" || attract || (AIHub.active && hubStarted)) && !hubEnded;
	if (canSim && link.authority) {
		accumulator += dt;
		let steps = 0;
		const inputs = readInputs(pads);
		while (accumulator >= 1 / 60 && steps++ < 8) {
			game.update(1 / 60, inputs);
			for (const p of inputs) p.burst = false;
			accumulator -= 1 / 60;
		}
		if (steps > 0) {
			if (link.kind === "none" || link.authority) {
				burstPressed = false;
				p2Burst = false;
				for (const i of Object.values(remoteInputs)) i.burst = false;
			}
		}
	} else accumulator = 0;
	if (canSim && link.active && now - netAt > 85) {
		netAt = now;
		if (link.authority) {
			link.send({ type: "world", state: game.snapshot(), events: eventBuffer });
		} else {
			const input = readInputs(pads)[link.me] ?? {};
			link.send({ type: "input", ...input }, AIHub.active ? AIHub.host : 0);
			burstPressed = false;
		}
	}
	if (!hubEnded && !networkOnly) {
		const s = snapshot();
		const renderDelta = Math.min(0.08, (now - (lastRender || now)) / 1000);
		lastRender = now;
		view.draw(renderDelta, s, {
			title:
				!attract &&
				(screen === "title" ||
					([
						"help",
						"settings",
						"about",
						"coop",
						"online-host",
						"online-join",
						"online-wait",
					].includes(screen) &&
						returnScreen !== "pause" &&
						game.state !== "playing")),
			shake: settings.shake,
		});
		if (now - hudAt > 65) {
			hudAt = now;
			renderHUD(now);
		}
	}
	if (!networkOnly) requestAnimationFrame(frame);
}

async function audioAudit() {
	const results = {};
	for (const kind of ["catch", "splash", "boom", "voice", "restore"]) {
		const c = new OfflineAudioContext(1, 24000, 24000);
		const g = c.createGain();
		g.gain.value = 0.6;
		g.connect(c.destination);
		sound(c, g, kind, 0.02);
		const b = await c.startRendering(),
			a = b.getChannelData(0);
		const rms = Math.sqrt(a.reduce((n, v) => n + v * v, 0) / a.length);
		results[kind] = {
			rms,
			peak: Math.max(...a.map(Math.abs)),
			finite: a.every(Number.isFinite),
		};
	}
	return results;
}
function exposeDebug() {
	window.__kaboom = {
		get ready() {
			return loaded;
		},
		get error() {
			return bootError;
		},
		get state() {
			return {
				...snapshot(),
				screen,
				attract,
				backend: view.backend,
				lastInput,
				practice,
				frameCount,
				render: {
					drawCalls: view.renderer?.info.render.drawCalls ?? 0,
					triangles: view.renderer?.info.render.triangles ?? 0,
				},
				network: {
					kind: link.kind,
					me: link.me,
					members: link.members,
					sent: link.sent,
					received: link.received,
				},
				audio: {
					state: audio.ctx?.state ?? "locked",
					level: audio.level(),
					music: settings.music,
					scheduled: audio.scheduled,
					effects: audio.effects,
				},
			};
		},
		start: (count = 1) => begin(count),
		pause,
		action,
		step: (seconds = 1) => {
			practice = true;
			for (let i = 0; i < Math.round(seconds * 60); i++)
				game.update(1 / 60, readInputs());
			return snapshot();
		},
		advance: (seconds = 1) => {
			practice = true;
			for (let i = 0; i < Math.round(seconds * 60); i++)
				game.update(1 / 60, []);
			return snapshot();
		},
		config: (patch) => {
			practice = true;
			Object.assign(game.config, patch);
		},
		wave: (n) => game.setWave(n),
		spawn: (p) => {
			practice = true;
			return game.spawn(p).id;
		},
		setPlayer: (id, patch) =>
			Object.assign(
				game.players.find((p) => p.id === id),
				patch,
			),
		setLives: (n) => (game.lives = n),
		setScore: (n) => (game.score = n),
		resetIdle: (elapsed = 10001) => {
			idleAt = performance.now() - elapsed;
		},
		audioAudit,
		settings,
		link,
	};
	AIHub.probe(() => ({
		scene: attract ? "attract" : game.state,
		menu: screen,
		world: {
			score: snapshot().score,
			wave: snapshot().wave,
			lives: snapshot().lives,
			players: snapshot().players,
			bombs: snapshot().bombs,
		},
		input: { last: lastInput },
	}));
}
async function boot() {
	try {
		const hubPromise = link.hub();
		await RAPIER.init();
		view = new Rooftop($("stage"));
		await view.init();
		view.reducedMotion = settings.reduced;
		game = new Shift(RAPIER, { emit: onEvent });
		game.state = "idle";
		_hubInfo = await hubPromise;
		if (AIHub.active) {
			show("hub-wait");
			AIHub.on("time-up", () => {
				if (link.authority) finishHub(game.lives > 0);
			});
			AIHub.on("end", () => {
				hubEnded = true;
				keys.clear();
				burstPressed = false;
				audio.stop();
				game.state = "ended";
				show("hub-ended");
			});
			AIHub.on("start", () => {
				call("BUCKETS AT THE READY", "Your brigade. One neighbourhood.", 3);
			});
		}
		loaded = true;
		exposeDebug();
		$("loading").style.display = "none";
		if (AIHub.active) AIHub.ready();
		else show("title");
		idleAt = performance.now();
		networkPump = setInterval(() => {
			if (loaded && link.active && !hubEnded) frame(performance.now(), true);
		}, 50);
		requestAnimationFrame(frame);
	} catch (e) {
		bootError = String(e?.stack ?? e);
		console.error(e);
		$("loading-text").textContent =
			`The buckets could not be filled. ${e.message}`;
		const retry = document.createElement("button");
		retry.className = "btn primary";
		retry.textContent = "RELOAD GAME";
		retry.onclick = () => location.reload();
		$("loading").appendChild(retry);
		AIHub.fail(e.message);
		window.__kaboom = { ready: false, error: bootError };
	}
}
boot();
