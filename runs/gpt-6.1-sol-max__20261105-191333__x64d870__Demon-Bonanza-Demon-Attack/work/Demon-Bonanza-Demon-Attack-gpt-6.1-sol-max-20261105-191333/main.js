import RAPIER from "rapier";
import { Game, WAVES, DEFAULTS, COLORS, decodeSnapshot } from "./core.js";
import { Graphics } from "./graphics.js";
import { Synth } from "./audio.js";
import { Input } from "./input.js";
import { Network } from "./network.js";
import { CREDITS } from "./credits.js";
const $ = (id) => document.getElementById(id),
	escapeText = (s) =>
		String(s).replace(
			/[&<>"']/g,
			(c) =>
				({
					"&": "&amp;",
					"<": "&lt;",
					">": "&gt;",
					'"': "&quot;",
					"'": "&#39;",
				})[c],
		);
let prefs = {
		music: 0.1,
		sfx: 0.7,
		voices: 0.45,
		glyphs: "ps",
		assist: true,
		shake: true,
	},
	best = 0;
try {
	prefs = {
		...prefs,
		...JSON.parse(localStorage.getItem("bonanza.settings") || "{}"),
	};
	best = Number(localStorage.getItem("bonanza.best") || 0);
} catch {}
const audio = new Synth(prefs),
	graphics = new Graphics($("world"));
let game,
	input,
	net,
	screen = "loading",
	returnTo = "title",
	attract = false,
	localCount = 1,
	remoteState = null,
	accumulator = 0,
	last = performance.now(),
	lastHud = 0,
	netEvents = [],
	bannerUntil = 0,
	calloutUntil = 0,
	toastUntil = 0,
	resultAt = 0,
	aboutTab = 0,
	guideTab = 0,
	peerCode = "",
	peerAnswer = "",
	hubWait = false;
let titleBackground = true,
	sessionStarted = false,
	upgradeShown = false,
	seenPhase = "",
	isManualPause = false;
const store = () => {
	try {
		localStorage.setItem("bonanza.settings", JSON.stringify(prefs));
		localStorage.setItem("bonanza.best", String(best));
	} catch {}
};
function prompt(label, key, ps, xbox = ps) {
	const pad = input?.mode === "gamepad",
		glyph = pad ? (prefs.glyphs === "xbox" ? xbox : ps) : key;
	return `<span class="prompt"><span class="glyph ${pad ? "pad" : ""} ${glyph.length > 2 ? "trigger" : ""}">${escapeText(glyph)}</span>${label}</span>`;
}
function action(label, id, primary = false) {
	return `<button class="action ${primary ? "primary" : ""}" data-action="${id}"><span>${label}</span><span class="arrow" aria-hidden="true">↗</span></button>`;
}
function backdrop() {
	return '<div class="backdrop"></div>';
}
function panel(kicker, title, body, wide = false) {
	return `${backdrop()}<section class="panel ${wide ? "wide" : ""}"><span class="eyebrow">${kicker}</span><h2>${title}</h2>${body}</section>`;
}
function backButton() {
	return `<div class="back-row">${action("Back", "back")}</div>`;
}
function toast(message) {
	$("toast").textContent = message;
	$("toast").classList.add("visible");
	toastUntil = performance.now() + 3500;
}
function updatePrompts() {
	document.body.dataset.input = input?.mode || "keyboard";
	$("input-footer").innerHTML =
		screen === "title"
			? prompt("Select", "Enter", "×", "A") +
				prompt("Navigate", "↑ ↓", "L", "L")
			: screen === "play"
				? ""
				: prompt("Select", "Enter", "×", "A") + prompt("Back", "Esc", "○", "B");
	if (["about", "guide", "dev", "settings"].includes(screen))
		$("input-footer").innerHTML += prompt("Scroll", "PgUp/Dn", "R", "R");
	$("combat-help").innerHTML =
		prompt("Slide", "A D", "L", "L") +
		prompt("Fire", "Space", "R2", "RT") +
		prompt("Pulse", "E", "□", "X") +
		prompt("Dash", "Shift", "○", "B");
}
function setScreen(next) {
	screen = next;
	renderMenu();
	updatePrompts();
	input?.focusFirst();
}
function setTitle() {
	if (net?.kind === "hub") return;
	net?.closePeer();
	attract = false;
	isManualPause = false;
	remoteState = null;
	localCount = 1;
	game.clear();
	game.phase = "idle";
	game.bot = false;
	game.god = false;
	game.tuning = { ...DEFAULTS };
	graphics.setTitle(true);
	titleBackground = true;
	netEvents = [];
	upgradeShown = false;
	$("hud").hidden = true;
	$("attract-banner").hidden = true;
	$("boss-hud").hidden = true;
	setScreen("title");
	input.lastInput = performance.now();
}
function begin(count = 1, demo = false) {
	if (net?.kind === "hub" && sessionStarted) return;
	localCount = count;
	attract = demo;
	isManualPause = false;
	remoteState = null;
	titleBackground = false;
	graphics.setTitle(false);
	game.tuning = { ...DEFAULTS };
	game.start(count, {
		attract: demo,
		seed: Math.floor(Math.random() * 2147483647),
	});
	if (demo) {
		game.tuning.damage = 2.5;
		game.tuning.fireRate = 8;
	}
	$("hud").hidden = false;
	$("attract-banner").hidden = !demo;
	seenPhase = "";
	upgradeShown = false;
	setScreen("play");
}
function restartExpedition(mode) {
	if (net.kind === "hub") return;
	if (net.active && !net.authority) {
		net.send({ t: "restart", mode });
		return;
	}
	if (mode === "retry" && game.phase === "gameover") {
		if (net.active) {
			game.start(localCount);
			setScreen("play");
		} else begin(localCount);
	} else if (mode === "encore" && game.phase === "victory") {
		game.encore();
		setScreen("play");
	}
}
function pause() {
	if (attract) {
		setTitle();
		return;
	}
	if (
		(screen === "play" && game.phase !== "idle") ||
		(screen === "play" && remoteState)
	) {
		isManualPause = true;
		returnTo = "pause";
		setScreen("pause");
	} else if (screen === "pause") {
		isManualPause = false;
		setScreen("play");
	} else goBack();
}
function goBack() {
	audio.ui();
	if (
		screen === "title" ||
		screen === "loading" ||
		screen === "hubwait" ||
		screen === "hubend"
	)
		return;
	if (screen === "play") {
		pause();
		return;
	}
	if (screen === "pause") {
		isManualPause = false;
		setScreen("play");
		return;
	}
	if (["settings", "guide", "about", "dev"].includes(screen)) {
		setScreen(returnTo);
		return;
	}
	if (["coop", "offer", "join", "answer", "lost"].includes(screen)) {
		net.closePeer();
		setTitle();
		return;
	}
	if (["victory", "gameover"].includes(screen)) {
		if (!net.active) setTitle();
	}
}
function renderMenu() {
	const el = $("overlay");
	el.innerHTML = "";
	if (screen === "play" || screen === "loading") return;
	if (screen === "title") {
		el.innerHTML = `<section class="title-screen"><div class="brand-line"><svg viewBox="0 0 100 60" aria-hidden="true"><path d="M2 10 25 24 35 10 50 32 65 10 75 24 98 10 85 48 65 40 50 58 35 40 15 48Z" fill="currentColor"/><path d="M39 31H46V37H39ZM54 31H61V37H54Z" fill="#151a2e"/></svg><span class="eyebrow">AN ICE-COLD ARCADE EXPEDITION</span></div><h1>DEMON<br><span>BONANZA</span></h1><p class="tagline">Cold moon. Hot cannon. Bad company.</p><div class="menu-stack">${action("Start expedition", "start", true)}${action("Bring a partner", "coop")}${action("Field guide", "guide")}</div><div class="title-secondary"><button class="text-button" data-action="settings">Settings</button><button class="text-button" data-action="about">About &amp; credits</button></div><div class="title-stamp"><span>6 WAVES</span><strong>NO MERCY</strong><span>PLENTY OF WINGS</span></div><div class="edition"><strong>GIVE THEM A WARM WELCOME.</strong><span>INSPIRED BY DEMON ATTACK · 1982</span><span id="demo-count">DEMONSTRATION IN 10</span></div></section>`;
	} else if (screen === "pause") {
		el.innerHTML = panel(
			"TAKE A BREATHER",
			"Expedition paused",
			`<div class="pause-meta"><span>WAVE ${String((view().wave || 0) + 1).padStart(2, "0")}</span><span>BOUNTY ${String(view().score || 0).padStart(6, "0")}</span></div><div class="menu-stack">${action("Back to the bonanza", "resume", true)}${action("Settings", "settings")}${action("Field guide", "guide")}${action("Development lab", "dev")}${action("About & credits", "about")}${net?.kind === "hub" ? "" : action("Return to title", "quit")}</div>${net?.active ? `<p class="settings-note">${net.kind === "hub" || !net.authority ? "The shared expedition continues while this menu is open." : "Your partner waits while you pause the expedition."}</p>` : ""}`,
		);
	} else if (screen === "settings") {
		el.innerHTML = panel(
			"MAKE YOURSELF AT HOME",
			"Settings",
			`
      <label class="setting"><span>Music</span><input id="music" aria-label="Music volume" type="range" min="0" max="1" step=".05" value="${prefs.music}" data-pref="music"><output>${Math.round(prefs.music * 100)}%</output></label>
      <label class="setting"><span>Sound effects</span><input aria-label="Sound effects volume" type="range" min="0" max="1" step=".05" value="${prefs.sfx}" data-pref="sfx"><output>${Math.round(prefs.sfx * 100)}%</output></label>
      <label class="setting"><span>Demon voices</span><input aria-label="Voice volume" type="range" min="0" max="1" step=".05" value="${prefs.voices}" data-pref="voices"><output>${Math.round(prefs.voices * 100)}%</output></label>
      <div class="setting"><span>Controller glyphs</span><button class="action" data-action="glyphs">${prefs.glyphs === "ps" ? "PlayStation × ○ □ △" : "Xbox A B X Y"}</button><output></output></div>
      <div class="setting"><span>Touch aim & pulse assist</span><button class="action" data-action="assist">${prefs.assist ? "On" : "Off"}</button><output></output></div>
      <div class="setting"><span>Screen shake</span><button class="action" data-action="shake">${prefs.shake ? "On" : "Off"}</button><output></output></div>
      <div class="back-row">${action("Back", "back")}${action("Fullscreen", "fullscreen")}</div><p class="settings-note">Music starts at 10%. All sounds and demon chatter are synthesized live.</p>`,
		);
	} else if (screen === "guide") {
		const tabs = `<div class="tabs">${["Your cannon", "The flock"].map((t, i) => `<button class="action ${guideTab === i ? "selected" : ""}" data-guide="${i}">${t}</button>`).join("")}</div>`;
		const cards =
			guideTab === 0
				? [
						[
							"01",
							"Slide. Fire. Survive.",
							"Move along the glacier and hold fire. Aim a little left or right. Moving your cannon bends shots in flight.",
						],
						[
							"02",
							"Send it back.",
							"Pulse reflects nearby fire and shatters close demons. It recharges in seven seconds. Dash through a tight gap.",
						],
						[
							"03",
							"Make a killing.",
							"Chain banishments for a bigger bounty. Catch gold for nine seconds of triple-fire overdrive. Clean waves earn a reserve bunker.",
						],
					]
				: [
						[
							"✦",
							"A very bad flock",
							"Mint moths fire single bombs. Coral firebirds fan them out. Lavender demons split into two diving imps. Finish both.",
						],
						[
							"╱╲",
							"Read the warning",
							"Gold armor takes four hits. A flashing red lane means a beam is coming. Slide out, dash through, or reflect it.",
						],
						[
							"♛",
							"Dethrone the Big Flap",
							"Break three orbiting seals to expose the boss. More seals return at each phase. Beat wave six, then try the endless encore.",
						],
					];
		const controls =
			input.mode === "touch"
				? "<span>Drag anywhere to slide. Swipe quickly to dash. Fire is automatic. Two-finger tap: pulse.</span><span>Aim and emergency pulse are assisted by default.</span>"
				: `${prompt("Slide", "A D / ← →", "L", "L")}${prompt("Aim", "Mouse", "R", "R")}${prompt("Fire", "Space / LMB", "R2", "RT")}${prompt("Pulse", "E / RMB", "□", "X")}${prompt("Dash", "Shift", "○", "B")}${prompt("Pause", "Esc", "Options", "Menu")}`;
		el.innerHTML = panel(
			"THE SHORT SURVIVAL MANUAL",
			"Field guide",
			`${tabs}<div class="guide-grid">${cards.map((c) => `<article class="guide-card"><span class="number">${c[0]}</span><h3>${c[1]}</h3><p>${c[2]}</p></article>`).join("")}</div><div class="guide-controls">${controls}</div><p class="settings-note">Couch partner: J / L to slide · K fire · I pulse · U dash, or a second controller.<br>Six waves. Two blessings. One shared stock of reserve bunkers. The next hit after your final bunker ends the expedition.</p>${backButton()}`,
			true,
		);
	} else if (screen === "upgrade") {
		el.innerHTML = panel(
			"A MOMENT OF QUESTIONABLE GOOD FORTUNE",
			"Choose a blessing",
			`<p class="intro">Something in the ice likes your work. Keep the cannon warm.</p><div class="card-row"><button class="blessing" data-upgrade="twin"><span class="symbol">⋔</span><h3>${view().upgrades?.twin ? "Flock together" : "Three’s company"}</h3><p>${view().upgrades?.twin ? "Widen your tracer fan to five shots." : "Turn every shot into a three-shot tracer fan."}</p><span>MORE SKY. LESS DEMON.</span></button><button class="blessing" data-upgrade="cool"><span class="symbol">◎</span><h3>Cold snap</h3><p>Recharge your reflective pulse 1.8 seconds faster.</p><span>RETURN TO SENDER.</span></button><button class="blessing" data-upgrade="repair"><span class="symbol">⌂</span><h3>Ice insurance</h3><p>Restore two bunkers and increase shot damage.</p><span>READ THE SMALL PRINT.</span></button></div>${net.active ? '<p class="settings-note">The first blessing chosen applies to the whole team.</p>' : ""}`,
			true,
		);
	} else if (screen === "victory" || screen === "gameover") {
		const v = view(),
			won = screen === "victory";
		el.innerHTML = `${backdrop()}<section class="result"><span class="eyebrow">${won ? "EXPEDITION COMPLETE" : "EXPEDITION TERMINATED"}</span><h2>${won ? "THE CROWN<br>IS YOURS." : "COLD.<br>VERY COLD."}</h2><p>${won ? "The moon is quiet. Suspiciously quiet." : "The flock got the last word. Make it a short victory."}</p><div class="big-score">${String(v.score || 0).padStart(6, "0")}</div><div class="result-stats"><span><b>${v.stats?.kills || 0}</b>DEMONS BANISHED</span><span><b>${v.stats?.reflected || 0}</b>SHOTS RETURNED</span><span><b>${v.stats?.cleanWaves || 0}</b>CLEAN WAVES</span></div><div class="back-row">${net.kind === "hub" ? "" : (won ? action("Endless encore", "encore", true) : action("Try again", "retry", true)) + action("Return to title", "quit")}</div></section>`;
	} else if (screen === "dev") {
		const slider = (key, label, min, max, step) =>
			`<label class="setting"><span>${label}</span><input aria-label="${label}" type="range" min="${min}" max="${max}" step="${step}" value="${game.tuning[key]}" data-tune="${key}"><output>${Number(game.tuning[key]).toFixed(step < 1 ? 1 : 0)}</output></label>`;
		el.innerHTML = panel(
			"DEVELOPMENT LAB / LIVE CONTROLS",
			"Bend the rules",
			`${net.active && !net.authority ? '<p class="intro">The host controls simulation tuning. These controls affect your local test world only.</p>' : ""}${slider("playerSpeed", "Cannon speed", 5, 24, 0.5)}${slider("fireRate", "Shots per second", 2, 16, 0.5)}${slider("enemySpeed", "Flock speed", 0.25, 2.5, 0.05)}${slider("enemyFire", "Enemy fire rate", 0, 2.5, 0.1)}${slider("pulseCooldown", "Pulse cooldown", 1, 14, 0.5)}${slider("damage", "Shot damage", 0.5, 6, 0.5)}${slider("gameSpeed", "Simulation speed", 0.25, 4, 0.25)}<div class="dev-actions">${action(game.god ? "Invulnerable: ON" : "Invulnerable: OFF", "god")}${action(game.bot ? "Autopilot: ON" : "Autopilot: OFF", "bot")}${action("Refill bunkers", "heal")}${action("Previous wave", "prevwave")}${action("Next wave", "nextwave")}${action("Restart wave", "restartwave")}${action("Clear enemy fire", "clearfire")}${action("Step one second", "step")}${action("Reset defaults", "resetdev")}</div><div class="dev-stats" id="dev-stats"></div><div class="back-row">${action("Back to pause", "back")}${action("Resume expedition", "resume", true)}</div>`,
			true,
		);
	} else if (screen === "about") renderAbout();
	else if (screen === "coop") {
		el.innerHTML = panel(
			"GOOD COMPANY. BAD ODDS.",
			"Bring a partner",
			`<p class="intro">Two cannons. One bounty. Shared bunkers.<br>Everybody gets to make the sky somebody else’s problem.</p><div class="menu-stack">${action("Couch co-op · 2 players", "couch", true)}${action("Create a peer invitation", "offer")}${action("Join a peer expedition", "join")}</div><p class="settings-note">Couch: two controllers, or A / D + Space and J / L + K.<br>Peer play: exchange an invitation and reply code. Direct WebRTC connections use STUN; networks that require a relay may block them. AI Hub handles 1–4 players through its own session lobby.</p>${backButton()}`,
		);
	} else if (["offer", "join", "answer"].includes(screen)) renderPeer();
	else if (screen === "hubwait")
		el.innerHTML = panel(
			"AI HUB / COOPERATIVE EXPEDITION",
			"Ready to rumble",
			`<p class="intro">Slide. Fire. Survive.<br>Six waves stand between your team and a very bad monarch.</p><p class="small-muted">Waiting for the Hub’s synchronized start…</p>`,
		);
	else if (screen === "hubend")
		el.innerHTML = panel(
			"AI HUB / ROUND ENDED",
			"Expedition complete",
			`<p class="intro">The Hub has your results. Keep your cannon warm.</p>`,
		);
	else if (screen === "lost")
		el.innerHTML = panel(
			"THE SIGNAL WENT COLD",
			"Partner disconnected",
			`<p class="intro">The peer connection closed. Create a fresh invitation to fly together again.</p>${action("Return to title", "quit", true)}`,
		);
}
function renderAbout() {
	const titles = [
		"Source Information",
		"Testing Feedback",
		"Engine Feedback",
		"Prompt Feedback",
	];
	let content = "";
	if (aboutTab === 0) {
		content = `<div class="credit-grid">${Object.entries(
			CREDITS.sourceInformation,
		)
			.map(
				([k, v]) =>
					`<p><b>${escapeText(k.replace(/([A-Z])/g, " $1").toUpperCase())}</b>${escapeText(v)}</p>`,
			)
			.join(
				"",
			)}</div><p class="settings-note">Research: <a href="https://atariage.com/manual_html_page.php?SoftwareLabelID=135" target="_blank" rel="noopener">Original Imagic manual</a> · <a href="https://www.atarimania.com/games/atari-2600-games-demon-attack-7282" target="_blank" rel="noopener">Archived footage &amp; screenshots</a> · <a href="https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub" target="_blank" rel="noopener">AI Hub</a><br>Original game by Imagic / Rob Fulop. This is an original, unofficial tribute. Three.js: MIT · Rapier: Apache-2.0. All geometry, animation and sounds in this game are generated in code.</p>`;
	} else {
		const questions = [
			[],
			[
				"How many issues did testing catch?",
				"How many were critical / game breaking?",
				"Most helpful test?",
				"Least helpful test?",
			],
			[
				"What did you like most about the engine?",
				"Did you get stuck or guess wrong?",
				"Most important thing built yourself?",
				"Hardest part about using the engine?",
				"What changed in the engine, and why?",
				"If you could change one thing?",
			],
			[
				"What did you like most about the prompt?",
				"What was confusing?",
				"What was hardest?",
				"What would you change?",
			],
		];
		const values = [
			null,
			CREDITS.testingFeedback,
			CREDITS.engineFeedback,
			CREDITS.promptFeedback,
		][aboutTab];
		content = `<div class="feedback-list">${values.map((v, i) => `<p><b>${questions[aboutTab][i]}</b>${escapeText(v)}</p>`).join("")}</div>`;
	}
	$("overlay").innerHTML = panel(
		"THE PEOPLE, THE MACHINES & THE PAPERWORK",
		"About the bonanza",
		`<div class="tabs">${titles.map((t, i) => `<button class="action ${i === aboutTab ? "selected" : ""}" data-about="${i}">${t}</button>`).join("")}</div><div class="credits-page">${content}</div>${backButton()}`,
		true,
	);
}
function renderPeer() {
	const offer = screen === "offer";
	const body =
		screen === "join"
			? `<p class="intro">Paste the host’s invitation. We’ll make your reply.</p><textarea class="connection-code" id="peer-in" placeholder="Host’s invitation code" aria-label="Host invitation code" spellcheck="false"></textarea>${action("Make reply code", "makeanswer", true)}`
			: `<p class="intro">${offer ? "Send your invitation to a partner, then paste their reply." : "Send this reply back to your host. The expedition starts when the connection opens."}</p><textarea readonly class="connection-code" id="peer-out" aria-label="Your connection code">${escapeText(offer ? peerCode : peerAnswer)}</textarea><div class="connection-buttons">${action("Copy code", "copycode")}${action("Select code", "selectcode")}</div>${offer ? '<textarea class="connection-code" id="peer-in" placeholder="Paste your partner’s reply code" aria-label="Partner reply code" spellcheck="false"></textarea>' + action("Connect & start", "connectpeer", true) : ""}`;
	$("overlay").innerHTML = panel(
		"DIRECT CO-OP / TWO DEVICES",
		offer
			? "Your invitation"
			: screen === "join"
				? "Join the expedition"
				: "Your reply",
		`${body}<p class="connection-status" id="peer-status">${offer && !peerCode ? "Gathering a route through the ice…" : "Keep both pages open. Connection codes contain temporary network addresses."}</p>${backButton()}`,
	);
}
function view() {
	return remoteState || game;
}
function showBanner(kicker, title, text, duration = 3000) {
	$("banner-kicker").textContent = kicker;
	$("banner-title").textContent = title;
	$("banner-text").textContent = text;
	$("wave-banner").classList.add("visible");
	bannerUntil = performance.now() + duration;
}
function callout(text, duration = 2200) {
	$("combat-callout").textContent = text;
	calloutUntil = performance.now() + duration;
}
function handleEvent(e) {
	graphics.event(e);
	audio.event(e);
	if (
		net?.authority &&
		net.active &&
		!["spawn", "remove", "hit", "fire", "block"].includes(e.type)
	) {
		const copy = { ...e };
		delete copy.entity;
		netEvents.push(copy);
	}
	if (e.type === "wave") {
		showBanner(
			`WAVE ${String(e.wave + 1).padStart(2, "0")} / 06`,
			e.name,
			e.hint,
			3600,
		);
	}
	if (e.type === "clear")
		showBanner(
			e.clean ? "CLEAN WAVE · RESERVE EARNED" : "WAVE COMPLETE",
			"SKY CLEARED.",
			"Keep the cannon warm.",
			2300,
		);
	if (e.type === "pulse") {
		callout(
			e.reflected ? `${e.reflected} SHOTS · RETURN TO SENDER` : "COLD SNAP",
		);
		input?.rumble(0.25);
	}
	if (e.type === "hurt") {
		callout(
			e.lives > 0 ? "BUNKER LOST · KEEP MOVING" : "LAST CANNON · NO RESERVES",
		);
		input?.rumble(0.6);
	}
	if (e.type === "pickup") callout("OVERDRIVE · NINE SECONDS OF BAD NEWS");
	if (e.type === "bossPhase")
		callout(`PHASE ${e.phase} · BREAK THE SEALS`, 3000);
	if (e.type === "kill") {
		const point = graphics.worldToScreen(e.x, e.y);
		const span = document.createElement("span");
		span.className = "score-pop";
		span.textContent = "+" + e.points;
		span.style.left = point.x + "px";
		span.style.top = point.y + "px";
		$("floating-text").append(span);
		setTimeout(() => span.remove(), 850);
	}
	if (e.type === "victory" || e.type === "gameover") {
		best = Math.max(best, view().score || 0);
		store();
		resultAt = performance.now();
		if (net.kind === "hub" && net.authority)
			net.finish(game, e.type === "victory");
	}
}
$("overlay").addEventListener("click", async (e) => {
	if (e.target.closest("a") && net.kind === "hub") {
		e.preventDefault();
		return;
	}
	const target = e.target.closest("button");
	if (!target || target.disabled) return;
	input.lastInput = performance.now();
	audio.unlock();
	audio.ui();
	if (target.dataset.guide !== undefined) {
		guideTab = Number(target.dataset.guide);
		setScreen("guide");
		return;
	}
	if (target.dataset.about !== undefined) {
		aboutTab = Number(target.dataset.about);
		setScreen("about");
		return;
	}
	if (target.dataset.upgrade) {
		if (net.active) net.chooseUpgrade(target.dataset.upgrade);
		else game.chooseUpgrade(target.dataset.upgrade);
		return;
	}
	const a = target.dataset.action;
	if (a === "start") begin(1);
	if (a === "couch") begin(2);
	if (a === "resume") {
		isManualPause = false;
		setScreen("play");
	}
	if (a === "back") goBack();
	if (a === "quit") {
		if (net.kind !== "hub") setTitle();
	}
	if (["settings", "guide", "about"].includes(a)) {
		returnTo = screen === "pause" ? "pause" : "title";
		setScreen(a);
	}
	if (a === "dev") {
		returnTo = "pause";
		setScreen("dev");
	}
	if (a === "coop") setScreen("coop");
	if (a === "retry" || a === "encore") restartExpedition(a);
	if (["glyphs", "assist", "shake"].includes(a)) {
		if (a === "glyphs") prefs.glyphs = prefs.glyphs === "ps" ? "xbox" : "ps";
		else prefs[a] = !prefs[a];
		store();
		setScreen("settings");
	}
	if (a === "fullscreen") {
		try {
			if (document.fullscreenElement) await document.exitFullscreen();
			else await document.documentElement.requestFullscreen();
		} catch {
			toast("Fullscreen is unavailable in this browser.");
		}
	}
	if (a === "god") {
		game.god = !game.god;
		setScreen("dev");
	}
	if (a === "bot") {
		game.bot = !game.bot;
		setScreen("dev");
	}
	if (a === "heal") {
		game.lives = 6;
		toast("Reserve bunkers restored.");
	}
	if (a === "prevwave" || a === "nextwave" || a === "restartwave") {
		game.beginWave(
			Math.max(
				0,
				Math.min(
					5,
					game.wave + (a === "nextwave" ? 1 : a === "prevwave" ? -1 : 0),
				),
			),
		);
		toast(WAVES[game.wave].name);
	}
	if (a === "clearfire") {
		for (const entity of [...game.entities.values()])
			if (entity.kind === "bomb") game.remove(entity);
		toast("Enemy fire cleared.");
	}
	if (a === "step") {
		for (let i = 0; i < 60; i++) game.update(1 / 60);
		toast("Advanced one simulation second.");
	}
	if (a === "resetdev") {
		game.tuning = { ...DEFAULTS };
		game.god = false;
		game.bot = false;
		setScreen("dev");
	}
	if (a === "join") {
		peerAnswer = "";
		setScreen("join");
	}
	if (a === "offer") {
		peerCode = "";
		setScreen("offer");
		target.disabled = true;
		try {
			peerCode = await net.offer();
			if (screen === "offer") {
				renderPeer();
				input.focusFirst();
			}
		} catch (err) {
			toast(err.message);
		}
	}
	if (a === "makeanswer") {
		target.disabled = true;
		try {
			peerAnswer = await net.answer($("peer-in").value);
			setScreen("answer");
		} catch (err) {
			target.disabled = false;
			toast(err.message);
		}
	}
	if (a === "connectpeer") {
		target.disabled = true;
		try {
			await net.accept($("peer-in").value);
			$("peer-status").textContent = "Connecting cannons…";
		} catch (err) {
			target.disabled = false;
			toast(err.message);
		}
	}
	if (a === "copycode") {
		try {
			await navigator.clipboard.writeText($("peer-out").value);
			toast("Connection code copied.");
		} catch {
			$("peer-out").select();
			toast("Code selected. Copy it with your device’s copy command.");
		}
	}
	if (a === "selectcode") {
		$("peer-out").focus();
		$("peer-out").select();
	}
});
$("overlay").addEventListener("input", (e) => {
	if (e.target.dataset.pref) {
		const key = e.target.dataset.pref;
		prefs[key] = Number(e.target.value);
		audio.settings[key] = prefs[key];
		audio.apply();
		store();
		e.target.nextElementSibling.textContent =
			Math.round(prefs[key] * 100) + "%";
	}
	if (e.target.dataset.tune) {
		const key = e.target.dataset.tune;
		game.tuning[key] = Number(e.target.value);
		e.target.nextElementSibling.textContent = Number(e.target.value).toFixed(
			Number(e.target.step) < 1 ? 1 : 0,
		);
	}
});
$("pause-button").addEventListener("click", () => {
	audio.unlock();
	pause();
});
input = new Input({
	menu: () => screen !== "play",
	mode: () => updatePrompts(),
	activity: () => {
		if (attract) {
			setTitle();
			return true;
		}
		audio.unlock();
		return false;
	},
	back: () => pause(),
	blur: () => {
		if (screen === "play" && !attract && !net?.active) pause();
	},
	ui: () => audio.ui(),
});
net = new Network({
	start: (count) => {
		sessionStarted = net.kind === "hub";
		hubWait = false;
		if (net.info)
			for (const player of net.info.players) COLORS[player.id] = player.color;
		localCount = count;
		titleBackground = false;
		attract = false;
		isManualPause = false;
		graphics.setTitle(false);
		if (net.authority) {
			game.start(count, { seed: net.info?.seed || 1982 });
		}
		remoteState = null;
		$("hud").hidden = false;
		setScreen("play");
	},
	input: (seat, data) => game.setInput(seat, data),
	snapshot: (state, events) => {
		const oldPhase = remoteState?.phase;
		remoteState = state;
		for (const e of events) {
			graphics.event(e);
			audio.event(e);
			if (e.type === "wave")
				showBanner(`WAVE ${e.wave + 1} / 06`, e.name, e.hint, 3000);
			if (e.type === "warning") {
			}
		}
		if (
			oldPhase !== state.phase &&
			["victory", "gameover"].includes(state.phase)
		)
			resultAt = performance.now();
	},
	restart: (mode) => restartExpedition(mode),
	upgrade: (key) => {
		if (game.chooseUpgrade(key)) {
			upgradeShown = false;
			if (screen === "upgrade") setScreen("play");
		}
	},
	leave: (id) => {
		const p = game?.players.find((p) => p.seat === id);
		if (p) {
			p.connected = false;
			game.remove(p);
		}
		toast("A cannon left the expedition. Keep firing.");
	},
	timeup: () => net.finish(game, false),
	end: () => {
		audio.stop();
		setScreen("hubend");
	},
	status: (status) => {
		if ($("peer-status"))
			$("peer-status").textContent =
				status === "connected" ? "Cannons connected." : `Connection: ${status}`;
	},
	disconnect: () => {
		if (net.authority) {
			const p = game.players.find((p) => p.seat === 1);
			if (p) {
				p.connected = false;
				game.remove(p);
			}
			toast("Partner disconnected. You can finish this expedition solo.");
			net.active = false;
			localCount = 1;
		} else {
			isManualPause = true;
			setScreen("lost");
		}
	},
});
function hud() {
	const v = view();
	$("score").textContent = String(Math.floor(v.score || 0)).padStart(6, "0");
	$("best").textContent =
		"BEST " + String(Math.max(best, v.score || 0)).padStart(6, "0");
	$("wave-label").innerHTML =
		`${String((v.wave || 0) + 1).padStart(2, "0")} <small>/ 06</small>`;
	$("act-label").textContent = v.run
		? `ENCORE ${String(v.run).padStart(2, "0")}`
		: net.active
			? "CO-OP EXPEDITION"
			: "EXPEDITION 01";
	$("wave-pips").innerHTML = Array.from(
		{ length: 6 },
		(_, i) => `<i class="${i <= (v.wave || 0) ? "done" : ""}"></i>`,
	).join("");
	$("bunkers").innerHTML = Array.from(
		{ length: 6 },
		(_, i) => `<i class="${i < v.lives ? "" : "empty"}"></i>`,
	).join("");
	const list = remoteState
			? decodeSnapshot(remoteState)
			: [...game.entities.values()],
		players = list.filter((e) => e.kind === "player");
	$("player-strip").innerHTML = players
		.map((p) => {
			const full = Math.max(
					1,
					game.tuning.pulseCooldown - (v.upgrades?.cool || 0) * 1.8,
				),
				ready = p.pulse <= 0;
			return `<div class="player-chip"><div class="player-name" style="color:${COLORS[p.seat % 4]}">${players.length > 1 ? escapeText(net.info?.players.find((n) => n.id === p.seat)?.name || "P" + (p.seat + 1)) + " · " : ""}${p.overdrive > 0 ? "OVERDRIVE" : "PULSE"}</div><div class="pulse-track"><i style="width:${100 * Math.max(0, 1 - p.pulse / full)}%;background:${COLORS[p.seat % 4]}"></i></div><small>${ready ? "READY · " + (input.mode === "touch" ? "TWO FINGERS" : input.mode === "gamepad" ? (prefs.glyphs === "ps" ? "□" : "X") : "E") : p.pulse.toFixed(1) + "s TO RECHARGE"}</small></div>`;
		})
		.join("");
	$("combo").textContent =
		(v.combo || 0) > 2 ? "×" + Math.ceil(v.combo / 2) + " BOUNTY" : "";
	const boss = list.find((e) => e.kind === "enemy" && e.type === "boss");
	$("boss-hud").hidden = !boss;
	if (boss) {
		$("boss-health").style.width = (boss.hp / boss.maxHp) * 100 + "%";
		$("boss-status").textContent = boss.shield
			? "BREAK THE SEALS"
			: `PHASE ${boss.phaseNo || 1} · FIRE!`;
	}
	if ($("dev-stats"))
		$("dev-stats").textContent =
			`${graphics.backend} · Three R180 · Rapier 0.19.3 · ${game.entities.size} bodies · ${game.stats.collisions} contacts · ${net.sent} packets sent / ${net.received} received`;
}
function frame(now) {
	const dt = Math.min((now - last) / 1000, 0.1);
	last = now;
	input.poll(now);
	if (screen === "title" && now - input.lastInput > 10000) begin(1, true);
	if (screen === "title" && $("demo-count"))
		$("demo-count").textContent =
			`DEMONSTRATION IN ${Math.max(0, Math.ceil(10 - (now - input.lastInput) / 1000))}`;
	const paused = screen !== "play" && screen !== "upgrade" && !attract;
	const simulated =
		game.phase !== "idle" &&
		net.authority &&
		!net.ended &&
		(!paused || net.kind === "hub");
	if (simulated) {
		for (let seat = 0; seat < (net.active ? 1 : localCount); seat++) {
			const id = net.active ? net.me : seat;
			if (net.server) continue;
			const player = game.players.find((p) => p.seat === id);
			game.setInput(
				id,
				paused
					? {}
					: input.get(seat, player, graphics, {
							touchAssist: prefs.assist,
							game,
						}),
			);
		}
		accumulator += dt * game.tuning.gameSpeed;
		let steps = 0;
		while (accumulator >= 1 / 60 && steps++ < 24) {
			game.update(1 / 60);
			accumulator -= 1 / 60;
		}
	} else accumulator = 0;
	const p = remoteState
		? decodeSnapshot(remoteState).find(
				(e) => e.kind === "player" && e.seat === net.me,
			)
		: game.players.find((e) => e.seat === net.me);
	const inputData = !paused
		? input.get(0, p, graphics, {
				touchAssist: prefs.assist,
				game: remoteState ? { entities: decodeSnapshot(remoteState) } : game,
			})
		: {};
	if (net.active) {
		const sending = now - net.lastSend >= 100;
		net.tick(now, net.authority ? game.snapshot() : null, inputData, netEvents);
		if (sending) netEvents = [];
	}
	const v = view();
	if (v.phase === "upgrade" && !attract && screen === "play") {
		setScreen("upgrade");
		upgradeShown = true;
	}
	if (screen === "upgrade" && v.phase !== "upgrade") {
		upgradeShown = false;
		setScreen("play");
	}
	if (
		["victory", "gameover"].includes(v.phase) &&
		screen === "play" &&
		!attract &&
		now - resultAt > 1000 &&
		net.kind !== "hub"
	)
		setScreen(v.phase);
	if (
		attract &&
		["victory", "gameover"].includes(v.phase) &&
		now - resultAt > 4500
	)
		begin(1, true);
	if (
		net.active &&
		!net.authority &&
		(screen === "victory" || screen === "gameover") &&
		v.phase === "playing"
	)
		setScreen("play");
	if (!titleBackground) graphics.sync(v, dt);
	graphics.update(dt);
	if (!prefs.shake) graphics.shake = 0;
	graphics.render();
	audio.tick(!titleBackground ? ((v.wave || 0) > 3 ? 2 : 1) : 0);
	if (now - lastHud > 110) {
		hud();
		lastHud = now;
	}
	if (now > bannerUntil) $("wave-banner").classList.remove("visible");
	if (now > calloutUntil) $("combat-callout").textContent = "";
	if (now > toastUntil) $("toast").classList.remove("visible");
	requestAnimationFrame(frame);
}
addEventListener("resize", () => graphics.renderer && graphics.resize());
addEventListener("pagehide", () => {
	net.closePeer();
	audio.stop();
});
try {
	await RAPIER.init();
	game = new Game(RAPIER);
	game.on(handleEvent);
	$("load-status").textContent = "Painting the moon. Priming the cannon…";
	await graphics.init();
	graphics.render();
	if (window.AIHub?.active) {
		hubWait = true;
		titleBackground = false;
		graphics.setTitle(false);
		setScreen("hubwait");
		await net.init();
		if (net.active) net.hub.ready();
		else setTitle();
	} else setTitle();
	$("loading").hidden = true;
	last = performance.now();
	requestAnimationFrame(frame);
	// Read-only state plus deliberate development hooks used by the one-command suite.
	window.__bonanza = {
		get ready() {
			return true;
		},
		get state() {
			const v = view();
			return {
				...(remoteState || game.snapshot()),
				screen,
				attract,
				backend: graphics.backend,
				paused: screen === "pause",
				inputMode: input.mode,
				net: {
					kind: net.kind,
					authority: net.authority,
					active: net.active,
					sent: net.sent,
					received: net.received,
					ended: net.ended,
				},
				music: prefs.music,
			};
		},
		credits: CREDITS,
		game,
		graphics,
		audio,
		input,
		network: net,
		start: begin,
		title: setTitle,
		pause,
		show: setScreen,
		synthProbe: () => Synth.offlineProbe(),
		advance(seconds = 1) {
			for (let i = 0; i < Math.floor(seconds * 60); i++) game.update(1 / 60);
			return game.snapshot();
		},
	};
} catch (error) {
	console.error(error);
	$("load-status").textContent =
		error.message +
		" — Check your connection and reload. A browser with WebGPU or WebGL 2 is required.";
	$("loading").querySelector("h2").textContent = "The ice is stubborn.";
	window.AIHub?.fail?.(
		"Renderer or physics initialization failed: " + error.message,
	);
	window.__bonanzaError = error.message;
}
