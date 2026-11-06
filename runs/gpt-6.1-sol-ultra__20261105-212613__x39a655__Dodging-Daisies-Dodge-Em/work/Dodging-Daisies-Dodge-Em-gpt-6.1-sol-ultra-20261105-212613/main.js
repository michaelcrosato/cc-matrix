import { AudioSystem, renderAudioProof } from "./audio.js";
import { DEFAULTS, Game, STAGES, trackPoint } from "./core.js";
import {
	engineFeedback,
	promptFeedback,
	sourceInformation,
	testingFeedback,
} from "./credits.js";
import { createNetwork } from "./net.js";
import { createPhysics } from "./physics.js";
import { createScene } from "./scene.js";

const $ = (id) => document.getElementById(id);
let scene,
	physics,
	game,
	net,
	ready = false,
	lastTime = 0,
	accumulator = 0,
	lastActivity = performance.now(),
	modalPage = "",
	modalBack = "",
	aboutTab = "source",
	lastMode = "",
	toastUntil = 0,
	finishSent = false,
	networkStatus = "",
	lastInput = "keyboard",
	padStyle = "playstation",
	ignoreClickUntil = 0;
let options = {
	music: 0.1,
	effects: 0.65,
	muted: false,
	pad: "playstation",
	motion: true,
};
try {
	options = {
		...options,
		...JSON.parse(localStorage.getItem("dd-options") || "{}"),
	};
} catch {}
padStyle = options.pad;
const audio = new AudioSystem();
audio.setMusic(options.music);
audio.setEffects(options.effects);
audio.setMuted(options.muted);
const keys = new Set(),
	pending = [
		{ shift: 0, pulse: false },
		{ shift: 0, pulse: false },
	],
	padStates = new Map(),
	touches = new Map();
let touchBoost = false;
let renderState = null,
	remotePrevious = null,
	remoteAt = 0,
	lastRemoteEffects = { flowers: 0, crashes: 0, stage: 1, pulse: 20 };
const esc = (s) =>
	String(s).replace(
		/[&<>"']/g,
		(c) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				c
			],
	);
function persist() {
	try {
		localStorage.setItem("dd-options", JSON.stringify(options));
	} catch {}
}
function setInput(type) {
	if (lastInput === type) return;
	lastInput = type;
	document.body.classList.toggle("touchMode", type === "touch");
	updatePrompts();
}
function activity(type) {
	if (type) setInput(type);
	lastActivity = performance.now();
	if (game?.state.attract) {
		returnTitle();
		return true;
	}
	return false;
}
function toast(text) {
	$("toast").textContent = text;
	$("toast").classList.add("show");
	toastUntil = performance.now() + 1900;
}
function updatePrompts() {
	const pad = lastInput === "gamepad",
		xbox = padStyle === "xbox";
	$("titleConfirm").textContent = pad
		? xbox
			? "A"
			: "✕"
		: lastInput === "touch"
			? "TAP"
			: "ENTER";
	$("titleHint").textContent =
		lastInput === "touch"
			? "SWIPE TO STEER. HOLD TO HURRY."
			: "START YOUR ENGINES";
	$("movePrompt").innerHTML = pad
		? "↕ <b>CHANGE LANES</b>"
		: "W / S <b>CHANGE LANES</b>";
	$("boostPrompt").innerHTML = pad
		? `${xbox ? "A / RT" : "✕ / R2"} <b>ACCELERATE</b>`
		: "SPACE <b>ACCELERATE</b>";
	$("pulsePrompt").textContent = pad
		? `${xbox ? "X" : "□"} · 2.5 SECONDS OF BRAVERY`
		: "E · 2.5 SECONDS OF BRAVERY";
	$("bottomPrompt").textContent = pad
		? `${xbox ? "A" : "✕"} SELECT · ${xbox ? "B" : "○"} BACK · ☰ PAUSE`
		: "KEYBOARD · MOUSE · CONTROLLER";
}
function unlock() {
	audio.unlock().catch(() => {});
}
function onGameEvent(event) {
	if (net?.ended) return;
	const t = event.type;
	if (["collect", "gate", "crash", "clear", "near", "start", "win"].includes(t))
		audio.play(t);
	if (t === "pulse") {
		audio.play("boost");
		audio.voice("pulse");
		toast("PETAL SHIELD! KEEP YOUR FOOT DOWN.");
	}
	if (t === "near" && game.state.nearMisses % 3 === 1)
		toast("CLOSE SHAVE! +20");
	if (t === "crash") {
		audio.voice("oops");
		toast("OOPS-A-DAISY! −25");
	}
	if (t === "start" || t === "stage") {
		audio.voice("go");
		if (t === "stage") audio.play("start");
	}
	if (t === "clear") {
		audio.voice("clear");
	}
	if (t === "collect" || t === "crash" || t === "pulse")
		scene?.burst(
			event.x,
			event.z,
			t === "crash" ? "#ed7258" : t === "pulse" ? "#a2dfcd" : "#ffd668",
		);
	if (t === "win") audio.voice("win");
}
function play(count = 1, attract = false) {
	if (!ready) return;
	closeModal();
	finishSent = false;
	lastMode = "";
	game.start(count, attract);
	keys.clear();
	for (const p of pending) {
		p.shift = 0;
		p.pulse = false;
	}
	if (!attract) unlock();
	updateUI();
}
function returnTitle() {
	if (net?.kind === "hub") return;
	net?.leave();
	closeModal();
	keys.clear();
	game?.reset("title");
	finishSent = false;
	lastMode = "";
	lastActivity = performance.now();
	audio.setMuted(options.muted);
	updateUI();
}
function request(index, direction) {
	if (!ready || !["playing", "attract"].includes(game.state.mode)) return;
	pending[index].shift = Math.max(
		-2,
		Math.min(2, pending[index].shift + direction),
	);
}
function pulse(index = 0) {
	if (net?.active) pending[0].pulse = true;
	else pending[index].pulse = true;
}
function pause() {
	if (!ready || game.state.attract) return;
	if (game.state.mode === "playing") {
		if (net?.connected && !net.isHost) {
			pending[0].command = "pause";
		} else game.pause();
		openMenu("pause");
		keys.clear();
	}
}
function resume() {
	if (net?.connected && !net.isHost) pending[0].command = "resume";
	else if (game.state.mode === "paused") game.pause();
	closeModal();
	lastMode = "";
	keys.clear();
}
function modalHead(title, kicker = "THE DD MOTOR CLUB") {
	return `<div class="modalHead"><div><div class="eyebrow">${kicker}</div><h2 id="modalTitle">${title}</h2></div><button type="button" data-action="back" aria-label="Back">×</button></div>`;
}
function buttons(rows) {
	return `<div class="modalButtons">${rows.map(([a, t, s = "", cls = ""]) => `<button type="button" class="${cls}" data-action="${a}"><span>${t}${s ? `<small>${s}</small>` : ""}</span><span>↗</span></button>`).join("")}</div>`;
}
function openMenu(page, back) {
	if (!ready) return;
	if (back !== undefined) modalBack = back;
	else if (page !== "pause" && modalPage && page !== modalPage)
		modalBack = modalPage;
	else if (!modalPage) modalBack = game.state.mode === "paused" ? "pause" : "";
	modalPage = page;
	const modal = $("modal");
	modal.classList.toggle(
		"wide",
		page === "about" || page === "dev" || page === "howto",
	);
	let html = "";
	if (page === "pause") {
		modalBack = "";
		html =
			modalHead("PIT STOP.", "TAKE A BREATHER") +
			`<p>The flowers can wait. The other drivers probably can’t.</p>` +
			buttons([
				["resume", "BACK TO THE CIRCUIT", "", "primary"],
				["settings", "SETTINGS"],
				["howto", "HOW TO PLAY"],
				...(!net?.connected || net.isHost
					? [["dev", "TUNE THE CIRCUIT", "Developer tools"]]
					: []),
				...(net?.kind === "hub" ? [] : [["title", "BACK TO THE CLUBHOUSE"]]),
			]);
	}
	if (page === "players")
		html =
			modalHead("BRING A BUDDY.") +
			`<p>Two little cars, one shared garden. Gather daisies together and watch those shared spare cars.</p>` +
			buttons([
				["couch", "COUCH CO-OP", "Two pads or one keyboard", "primary"],
				["online", "ONLINE CO-OP", "AI Hub or direct invite"],
			]) +
			`<div class="controlRow"><strong>DRIVER 1</strong> W / S · Space · E<br><strong>DRIVER 2</strong> ↑ / ↓ · Right Shift · Enter</div>`;
	if (page === "howto")
		html =
			modalHead("A LITTLE ROAD SENSE.", "FOUR LANES. THREE SPARE CARS.") +
			`<div class="instructions"><div class="instructionCard"><span class="number">01</span><h3>GATHER EVERY DAISY</h3><p>You drive forward automatically. Sweep up all 80 flowers to clear each of four circuits. The red cars drive the other way.</p></div><div class="instructionCard"><span class="number">02</span><h3>CHANGE AT THE OPENINGS</h3><p>Tap up to move inward, down to move outward. Your request waits for the next striped opening. Tap twice to skip two lanes at normal speed.</p></div><div class="instructionCard"><span class="number">03</span><h3>PUT YOUR PETAL DOWN</h3><p>Hold the accelerator for speed. While accelerating, you can move only one lane per opening. Let go to make a wider change.</p></div><div class="instructionCard"><span class="number">04</span><h3>GIVE YOURSELF SOME ROOM</h3><p>The petal shield protects you for 2.5 seconds. Gather 20 flowers to recharge it. Two crash cars join in circuit 3; amber openings close in circuit 4.</p></div></div><div class="controlRow"><strong>${lastInput === "gamepad" ? (padStyle === "xbox" ? "↕ lanes · A / RT accelerate · X shield · Menu pause" : "↕ lanes · ✕ / R2 accelerate · □ shield · Options pause") : lastInput === "touch" ? "Swipe ↑ / ↓ to steer · Hold the right side to accelerate · Tap ✿ for shield" : "W / S or ↑ / ↓ lanes · Space accelerate · E shield · Esc pause"}</strong></div><p style="font-size:11px">Mouse: click a lane to queue it. Get close without crashing for +20. Eight quick flowers start a 1.5× collection streak. A crash costs a spare car and 25 points; collected flowers stay gathered.</p>` +
			buttons([["back", "GOT IT", "", "primary"]]);
	if (page === "settings")
		html =
			modalHead("MAKE YOURSELF AT HOME.") +
			range(
				"music",
				"Music",
				options.music,
				0,
				1,
				0.01,
				"A tiny original garage groove.",
			) +
			range(
				"effects",
				"Effects & voices",
				options.effects,
				0,
				1,
				0.01,
				"Motor noises and cheerful nonsense.",
			) +
			`<div class="settingRow"><label for="padStyle">Controller prompts<small>Standard-mapping controllers supported.</small></label><select id="padStyle"><option value="playstation" ${padStyle === "playstation" ? "selected" : ""}>PlayStation · ✕ ○ □ △</option><option value="xbox" ${padStyle === "xbox" ? "selected" : ""}>Xbox · A B X Y</option></select></div><div class="settingRow"><label for="mute">Mute all audio</label><div class="toggle"><input id="mute" type="checkbox" ${options.muted ? "checked" : ""}></div></div><div class="settingRow"><label for="motion">Camera & impact motion</label><div class="toggle"><input id="motion" type="checkbox" ${options.motion ? "checked" : ""}></div></div>` +
			buttons([["back", "ALL SET", "", "primary"]]);
	if (page === "dev") {
		const d = game.settings;
		html =
			modalHead("TUNE THE CIRCUIT.", "LIVE DEVELOPER TOOLS") +
			`<p style="font-size:12px">Changes apply immediately. Resume to try them. The default circuit is always one button away.</p>` +
			range(
				"speed",
				"Your cruising speed",
				d.speed,
				3,
				16,
				0.1,
				"World units per second.",
			) +
			range(
				"enemySpeed",
				"Crash-car speed",
				d.enemySpeed,
				1,
				16,
				0.1,
				"Affects both opposing drivers.",
			) +
			range("boost", "Accelerator multiplier", d.boost, 1.1, 2.8, 0.05) +
			range("aggression", "Enemy lane-seeking", d.aggression, 0, 1, 0.01) +
			range(
				"invulnerability",
				"Crash grace · seconds",
				d.invulnerability,
				0.5,
				8,
				0.5,
			) +
			range("pulseDuration", "Shield · seconds", d.pulseDuration, 1, 8, 0.5) +
			`<div class="settingRow"><label for="god">Invincible</label><div class="toggle"><input id="god" type="checkbox" ${d.god ? "checked" : ""}></div></div><div class="settingRow"><label for="autopilot">AI driver</label><div class="toggle"><input id="autopilot" type="checkbox" ${game.autopilot ? "checked" : ""}></div></div><div class="settingRow"><label for="devStage">Jump to circuit</label><select id="devStage">${STAGES.map((s, i) => `<option value="${i + 1}" ${game.state.stage === i + 1 ? "selected" : ""}>0${i + 1} · ${s.name}</option>`).join("")}</select></div><div class="devActions"><button type="button" data-action="refill">REFILL SHIELD</button><button type="button" data-action="life">ADD SPARE CAR</button><button type="button" data-action="clear">CLEAR CIRCUIT</button><button type="button" data-action="defaults">RESET DEFAULTS</button></div>` +
			buttons([["resume", "TAKE IT FOR A SPIN", "", "primary"]]);
	}
	if (page === "about") {
		const labels = {
			source: "SOURCE INFORMATION",
			testing: "TESTING FEEDBACK",
			engine: "ENGINE FEEDBACK",
			prompt: "PROMPT FEEDBACK",
		};
		html =
			modalHead("THE PEOPLE IN THE PITS.", "ABOUT & CREDITS") +
			`<p style="font-size:12px">An original game inspired by Atari’s Dodge ’Em (1980), created by Carla Meninsky. No original game art or audio is used.</p><nav class="creditsTabs">${Object.entries(
				labels,
			)
				.map(
					([id, label]) =>
						`<button type="button" class="${aboutTab === id ? "active" : ""}" data-action="about-${id}">${label}</button>`,
				)
				.join("")}</nav>`;
		if (aboutTab === "source")
			html += `<dl class="creditsList">${Object.entries(sourceInformation)
				.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`)
				.join(
					"",
				)}</dl><p style="font-size:10px;margin-top:18px">Research: <a class="creditsLink" href="https://atari.com/pages/dodgeem" target="_blank" rel="noopener">Official Atari description</a> · <a class="creditsLink" href="https://atariage.com/manual_html_page.php?SoftwareID=984" target="_blank" rel="noopener">Original manual</a> · <a class="creditsLink" href="https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub" target="_blank" rel="noopener">AI Hub</a>. Exact original sound waveforms: unknown.</p>`;
		else {
			const questions = {
				testing: [
					"How many issues did testing catch?",
					"How many were critical or game breaking?",
					"Most helpful test?",
					"Least helpful test?",
				],
				engine: [
					"What did you like most about the engine?",
					"Did you get stuck or guess wrong?",
					"Most important thing you built yourself?",
					"Hardest part of using the engine?",
					"What did you change in the engine?",
					"One engine change you would want?",
				],
				prompt: [
					"What did you like most about the prompt?",
					"What was confusing?",
					"What was hardest?",
					"What would you change?",
				],
			};
			const answers = {
				testing: testingFeedback,
				engine: engineFeedback,
				prompt: promptFeedback,
			}[aboutTab];
			html += `<ol class="feedbackList">${answers.map((a, i) => `<li><strong>${questions[aboutTab][i]}</strong><br>${esc(a)}</li>`).join("")}</ol>`;
		}
	}
	if (page === "online")
		html =
			modalHead("A LONG-DISTANCE LAP.") +
			`<p>Share this HTML with a friend. Create an invitation, send it, and paste their reply. Both cars share the same circuit.</p><p class="onlineStatus" id="onlineStatus">${esc(networkStatus || "Choose a connection.")}</p>` +
			buttons([
				["host", "CREATE INVITATION", "", "primary"],
				["join", "I HAVE AN INVITATION"],
				["tablink", "SAME-DEVICE TAB LINK"],
			]) +
			`<p style="font-size:10px;margin-top:18px">AI Hub connects players automatically. Direct invites use WebRTC with STUN; networks requiring a relay can use AI Hub.</p>`;
	if (page === "invite")
		html =
			modalHead("SEND A LITTLE INVITE.") +
			`<p>1. Send this invitation to your friend.<br>2. Paste their reply below to connect.</p><textarea class="onlineCode" id="offerCode" readonly aria-label="Your invitation">${esc(window.__offer || "Creating invitation…")}</textarea>` +
			buttons([["copyOffer", "COPY INVITATION"]]) +
			`<textarea class="onlineCode" id="answerCode" aria-label="Friend’s reply" placeholder="Paste your friend’s reply here…"></textarea>` +
			buttons([["acceptAnswer", "CONNECT THE CARS", "", "primary"]]) +
			`<p class="onlineStatus" id="onlineStatus">${esc(networkStatus)}</p>`;
	if (page === "join")
		html =
			modalHead("A FRIEND SENT FLOWERS.") +
			`<p>Paste their invitation here, create a reply, and send it back. Keep this screen open while they connect.</p><textarea class="onlineCode" id="joinCode" aria-label="Host invitation" placeholder="Paste the host’s invitation…"></textarea>` +
			buttons([["createAnswer", "CREATE REPLY", "", "primary"]]) +
			`<textarea class="onlineCode" id="replyCode" readonly aria-label="Your reply" placeholder="Your reply appears here…"></textarea>` +
			buttons([["copyReply", "COPY REPLY"]]) +
			`<p class="onlineStatus" id="onlineStatus">${esc(networkStatus)}</p>`;
	if (page === "tablink")
		html =
			modalHead("NEXT TAB, SAME GARDEN.") +
			`<p>Open this same game in a second tab. Use the same room name, host in one tab and join in the other.</p><input id="roomName" class="inlineField" value="daisy-club" aria-label="Room name">` +
			buttons([
				["tabHost", "HOST ROOM", "", "primary"],
				["tabJoin", "JOIN ROOM"],
			]) +
			`<p class="onlineStatus" id="onlineStatus">${esc(networkStatus)}</p>`;
	if (page === "result") {
		const s = game.state;
		html =
			modalHead(
				s.won ? "GARDEN VARIETY CHAMPION!" : "OOPS-A-DAISY. ",
				s.won ? "ALL FOUR CIRCUITS CLEARED" : "THAT’S THE LAST SPARE CAR",
			) +
			`<p>${s.won ? "Every flower gathered. Every wrong-way driver thoroughly annoyed. That’s some fine gardening." : "Those crash cars don’t do small talk. Take another lap and show them your good side."}</p><div class="resultScore">${String(s.score).padStart(6, "0")}<small style="font-size:12px;letter-spacing:.1em;margin-left:12px">POINTS</small></div><div class="statGrid"><span><strong>${s.flowers}</strong><small>DAISIES</small></span><span><strong>${s.nearMisses}</strong><small>CLOSE SHAVES</small></span><span><strong>${Math.floor(s.runTime / 60)}:${String(Math.floor(s.runTime % 60)).padStart(2, "0")}</strong><small>ON THE ROAD</small></span></div>` +
			(net?.kind === "hub"
				? `<p class="onlineStatus">Round complete. AI Hub will take you back.</p>`
				: buttons([
						["again", "ONE MORE LAP", "", "primary"],
						["title", "BACK TO THE CLUBHOUSE"],
					])) +
			buttons([["about", "ABOUT & CREDITS"]]);
	}
	modal.innerHTML = html;
	$("modalBackdrop").classList.remove("hidden");
	modal.scrollTop = 0;
	setTimeout(() => {
		const focus = modal.querySelector(
			"button.primary,button:not(.modalHead button),input,select",
		);
		focus?.focus({ preventScroll: true });
	}, 0);
}
function range(id, label, value, min, max, step, hint = "") {
	const pct = max === 1;
	return `<div class="settingRow"><label for="${id}">${label}<small>${hint}</small></label><div><span class="rangeValue" id="${id}Val">${pct ? Math.round(value * 100) + "%" : Number(value).toFixed(2).replace(/0$/, "")}</span><input id="${id}" type="range" value="${value}" min="${min}" max="${max}" step="${step}"></div></div>`;
}
function closeModal() {
	modalPage = "";
	$("modalBackdrop").classList.add("hidden");
	$("modal").innerHTML = "";
}
function back() {
	if (modalPage === "result") {
		if (net?.kind !== "hub") returnTitle();
		return;
	}
	if (modalPage === "pause") {
		resume();
		return;
	}
	if (modalBack && modalBack !== modalPage) {
		const b = modalBack;
		modalBack = "";
		openMenu(b, "");
	} else {
		closeModal();
		if (game.state.mode === "paused") openMenu("pause");
	}
}
async function copy(id) {
	const node = $(id);
	if (!node) return;
	node.select();
	try {
		await navigator.clipboard.writeText(node.value);
		toast("COPIED. PASS IT ON!");
	} catch {
		document.execCommand("copy");
		toast("SELECTED. COPY AND SEND IT.");
	}
}
async function action(name) {
	if (net?.ended) return;
	if (activity(lastInput) || performance.now() < ignoreClickUntil) return;
	unlock();
	audio.play("select");
	try {
		if (name === "solo") play(1);
		else if (name === "couch") play(2);
		else if (name === "resume") resume();
		else if (name === "pause") pause();
		else if (name === "title") returnTitle();
		else if (name === "back") back();
		else if (name === "again") {
			if (net.connected && net.isHost) {
				play(2);
				net.sendState(game.snapshot());
			} else if (net.connected) toast("THE HOST CAN START THE NEXT LAP.");
			else play(game.state.playerCount);
		} else if (name === "pulse") pulse(net.connected ? 0 : 0);
		else if (name === "host") {
			openMenu("invite", "online");
			window.__offer = await net.host();
			if ($("offerCode")) $("offerCode").value = window.__offer;
		} else if (name === "acceptAnswer") {
			await net.acceptAnswer($("answerCode").value);
		} else if (name === "createAnswer") {
			const reply = await net.acceptOffer($("joinCode").value);
			if ($("replyCode")) $("replyCode").value = reply;
		} else if (name === "copyOffer") copy("offerCode");
		else if (name === "copyReply") copy("replyCode");
		else if (name === "tabHost" || name === "tabJoin")
			net.connectLocal($("roomName").value, name === "tabHost");
		else if (name === "refill") {
			game.state.pulse = 20;
			toast("PETAL SHIELD REFILLED.");
		} else if (name === "life") {
			game.state.lives = Math.min(9, game.state.lives + 1);
			toast("A SPARE CAR IN THE SHED.");
		} else if (name === "clear") {
			game.state.dots.forEach((d) => {
				d.collected = true;
			});
			toast("RESUME TO CLEAR THE CIRCUIT.");
		} else if (name === "defaults") {
			game.settings = { ...DEFAULTS };
			game.autopilot = false;
			openMenu("dev", "pause");
			toast("FACTORY FRESH.");
		} else if (name.startsWith("about-")) {
			aboutTab = name.slice(6);
			openMenu("about", modalBack);
		} else if (
			[
				"players",
				"howto",
				"settings",
				"about",
				"online",
				"join",
				"tablink",
				"dev",
			].includes(name)
		)
			openMenu(name);
	} catch (error) {
		networkStatus = error.message;
		const el = $("onlineStatus");
		if (el) el.textContent = networkStatus;
		toast(error.message);
	}
}
document.addEventListener("click", (e) => {
	const b = e.target.closest("[data-action]");
	if (b && !b.disabled) action(b.dataset.action);
});
document.addEventListener("pointerover", (e) => {
	if (e.pointerType === "touch") return;
	const b = e.target.closest("button");
	b?.focus({ preventScroll: true });
});
document.addEventListener("input", (e) => {
	if (net?.ended) return;
	activity(lastInput);
	const id = e.target.id,
		val = Number(e.target.value);
	if (["music", "effects"].includes(id)) {
		options[id] = val;
		if (id === "music") audio.setMusic(val);
		else audio.setEffects(val);
		persist();
	} else if (id in DEFAULTS) {
		game.settings[id] = e.target.type === "checkbox" ? e.target.checked : val;
	}
	if ($(id + "Val"))
		$(id + "Val").textContent =
			Number(e.target.max) === 1
				? Math.round(val * 100) + "%"
				: val.toFixed(2).replace(/0$/, "");
});
document.addEventListener("change", (e) => {
	if (net?.ended) return;
	const id = e.target.id;
	if (id === "padStyle") {
		padStyle = options.pad = e.target.value;
		persist();
		updatePrompts();
	}
	if (id === "mute") {
		options.muted = e.target.checked;
		audio.setMuted(options.muted);
		persist();
	}
	if (id === "motion") {
		options.motion = e.target.checked;
		persist();
	}
	if (id === "autopilot") game.autopilot = e.target.checked;
	if (id === "god") game.settings.god = e.target.checked;
	if (id === "devStage") {
		game.state.stage = Number(e.target.value);
		game.populate();
		game.state.countdown = 1.5;
		game.state.pulse = 20;
		toast("CIRCUIT READY. RESUME TO DRIVE.");
	}
});
function focusMove(dir) {
	const parent = modalPage ? $("modal") : $("titleScreen");
	const nodes = [
		...parent.querySelectorAll("button:not(:disabled),input,select,textarea"),
	].filter((n) => n.offsetParent !== null);
	if (!nodes.length) return;
	let i = nodes.indexOf(document.activeElement);
	i = (i + dir + nodes.length) % nodes.length;
	nodes[i].focus();
	nodes[i].scrollIntoView({ block: "nearest" });
	audio.play("select");
}
function activateFocused() {
	const f = document.activeElement;
	if (f?.tagName === "BUTTON" || f?.matches("input[type=checkbox]")) f.click();
	else if (game.state.mode === "title" && !modalPage)
		$("titleScreen").querySelector(".primary")?.click();
}
function adjustFocused(direction) {
	const f = document.activeElement;
	if (f?.tagName === "INPUT" && f.type === "range") {
		const step = Number(f.step) || 0.01;
		f.value = Number(f.value) + direction * step;
		f.dispatchEvent(new Event("input", { bubbles: true }));
		return true;
	}
	if (f?.tagName === "SELECT") {
		f.selectedIndex = Math.max(
			0,
			Math.min(f.options.length - 1, f.selectedIndex + direction),
		);
		f.dispatchEvent(new Event("change", { bubbles: true }));
		return true;
	}
	return false;
}
document.addEventListener("keydown", (e) => {
	if (!ready || net?.ended) return;
	const wasAttract = game.state.attract;
	if (activity("keyboard") || wasAttract) {
		e.preventDefault();
		return;
	}
	unlock();
	if (
		["TEXTAREA"].includes(e.target.tagName) ||
		(e.target.tagName === "INPUT" && e.target.type === "text")
	) {
		if (e.code === "Escape") {
			e.preventDefault();
			back();
		}
		return;
	}
	keys.add(e.code);
	if (e.code === "Escape" || e.code === "KeyP") {
		e.preventDefault();
		if (modalPage) back();
		else pause();
		return;
	}
	if (modalPage || game.state.mode === "title") {
		if (["ArrowUp", "KeyW", "ArrowDown", "KeyS"].includes(e.code)) {
			e.preventDefault();
			focusMove(["ArrowUp", "KeyW"].includes(e.code) ? -1 : 1);
		} else if (
			["ArrowLeft", "ArrowRight"].includes(e.code) &&
			adjustFocused(e.code === "ArrowLeft" ? -1 : 1)
		)
			e.preventDefault();
		else if (e.code === "Enter" || e.code === "Space") {
			if (e.target?.matches("input[type=range],select")) return;
			e.preventDefault();
			activateFocused();
		}
		return;
	}
	if (e.repeat) return;
	if (
		[
			"ArrowUp",
			"ArrowDown",
			"ArrowLeft",
			"ArrowRight",
			"Space",
			"Enter",
		].includes(e.code)
	)
		e.preventDefault();
	const two = game.state.playerCount === 2 && !net.connected;
	if (["KeyW", "KeyD"].includes(e.code)) request(0, 1);
	if (["KeyS", "KeyA"].includes(e.code)) request(0, -1);
	if (["ArrowUp", "ArrowRight"].includes(e.code)) request(two ? 1 : 0, 1);
	if (["ArrowDown", "ArrowLeft"].includes(e.code)) request(two ? 1 : 0, -1);
	if (e.code === "KeyE") pulse(0);
	if (e.code === "Enter" && two) pulse(1);
});
document.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("blur", () => {
	keys.clear();
	touchBoost = false;
	if (ready && game.state.mode === "playing" && !net.connected) pause();
});
document.addEventListener("pointerdown", (e) => {
	if (!ready || net?.ended) return;
	const type = e.pointerType === "touch" ? "touch" : "keyboard";
	if (activity(type)) {
		ignoreClickUntil = performance.now() + 350;
		e.preventDefault();
		return;
	}
	unlock();
	if (
		e.target.closest("button,input,select,textarea,a") ||
		modalPage ||
		game.state.mode === "title"
	)
		return;
	const index = 0;
	if (e.pointerType === "touch") {
		touches.set(e.pointerId, {
			y: e.clientY,
			x: e.clientX,
			right: e.clientX > innerWidth * 0.56,
		});
		if (e.clientX > innerWidth * 0.56) touchBoost = true;
	} else if (game.state.mode === "playing") {
		const lane = scene.pickLane?.(e.clientX, e.clientY);
		if (lane !== null && lane !== undefined) {
			const p = game.state.players[net.connected ? net.playerIndex : 0];
			pending[index].shift = Math.max(-2, Math.min(2, lane - p.lane));
		}
	}
});
document.addEventListener("pointermove", (e) => {
	if (!ready || net?.ended) return;
	if (e.pointerType !== "touch") {
		if (Math.abs(e.movementX) + Math.abs(e.movementY) > 1) activity("keyboard");
		return;
	}
	const t = touches.get(e.pointerId);
	if (!t || t.right) return;
	if (Math.abs(e.clientY - t.y) > 22) {
		request(0, e.clientY < t.y ? 1 : -1);
		t.y = e.clientY;
		lastActivity = performance.now();
	}
});
function releaseTouch(e) {
	touches.delete(e.pointerId);
	touchBoost = [...touches.values()].some((t) => t.right);
}
document.addEventListener("pointerup", releaseTouch);
document.addEventListener("pointercancel", releaseTouch);
function pollPads() {
	const pads = [...(navigator.getGamepads?.() || [])].filter(Boolean);
	const inputs = [];
	for (let i = 0; i < pads.length; i++) {
		const pad = pads[i];
		const previous = padStates.get(pad.index) || {
			buttons: [],
			axis: 0,
			nextNav: 0,
		};
		const b = pad.buttons.map((x) => x.pressed || x.value > 0.5),
			axis =
				pad.axes[1] < -0.5 || pad.axes[0] > 0.5 || b[12] || b[15]
					? 1
					: pad.axes[1] > 0.5 || pad.axes[0] < -0.5 || b[13] || b[14]
						? -1
						: 0;
		const rising = (n) => b[n] && !previous.buttons[n];
		const active =
			b.some((x, j) => x && !previous.buttons[j]) ||
			(axis !== previous.axis && axis !== 0);
		if (active) {
			const wasAttract = game.state.attract;
			activity("gamepad");
			unlock();
			if (wasAttract) {
				padStates.set(pad.index, {
					buttons: b,
					axis,
					nextNav: performance.now() + 300,
				});
				continue;
			}
		}
		if (rising(9) && !b[8]) {
			if (modalPage) back();
			else pause();
		} else if (modalPage || game.state.mode === "title") {
			if (rising(0)) {
				activateFocused();
			}
			if (rising(1) && modalPage) back();
			const navY =
				b[12] || pad.axes[1] < -0.5 ? -1 : b[13] || pad.axes[1] > 0.5 ? 1 : 0;
			const navX =
				b[14] || pad.axes[0] < -0.5 ? -1 : b[15] || pad.axes[0] > 0.5 ? 1 : 0;
			if (performance.now() > previous.nextNav && (navY || navX)) {
				if (navX) adjustFocused(navX);
				else focusMove(navY);
				previous.nextNav = performance.now() + 210;
			}
		} else {
			const index = net.connected ? 0 : i;
			if (index < 2) {
				if (axis && axis !== previous.axis) pending[index].shift = axis;
				if (rising(2)) pending[index].pulse = true;
				inputs[index] = { boost: b[0] || b[7] || false, held: axis };
			}
		}
		padStates.set(pad.index, { buttons: b, axis, nextNav: previous.nextNav });
	}
	return inputs;
}
function applyInputs(pads) {
	const s = game.state;
	if (!["playing", "attract", "paused"].includes(s.mode)) return;
	const count = net.connected ? 1 : s.playerCount;
	for (let i = 0; i < count; i++) {
		if (net.server) continue;
		const two = s.playerCount === 2 && !net.connected;
		const held =
			i === 0
				? keys.has("KeyW") ||
					keys.has("KeyD") ||
					(!two && (keys.has("ArrowUp") || keys.has("ArrowRight")))
					? 1
					: keys.has("KeyS") ||
							keys.has("KeyA") ||
							(!two && (keys.has("ArrowDown") || keys.has("ArrowLeft")))
						? -1
						: 0
				: keys.has("ArrowUp") || keys.has("ArrowRight")
					? 1
					: keys.has("ArrowDown") || keys.has("ArrowLeft")
						? -1
						: 0;
		const inp = {
			shift: pending[i].shift,
			pulse: pending[i].pulse,
			boost: i === 0 ? keys.has("Space") || touchBoost : keys.has("ShiftRight"),
			held,
			...(pending[i].command ? { command: pending[i].command } : {}),
		};
		inp.boost = inp.boost || pads[i]?.boost;
		inp.held = pads[i]?.held || held;
		let accepted = true;
		if (net.connected) accepted = net.sendInput(inp);
		else if (s.mode !== "paused") game.input(i, inp);
		if (accepted) {
			pending[i].shift = 0;
			pending[i].pulse = false;
			delete pending[i].command;
		}
	}
}
function connectCallbacks() {
	return {
		onStatus(text) {
			networkStatus = text;
			if ($("onlineStatus")) $("onlineStatus").textContent = text;
		},
		onStart(info) {
			play(info.players.length, false);
			if (info.hub) game.state.countdown = 0;
			else game.state.countdown = 3;
			if (!info.isHost) renderState = game.snapshot();
			toast(
				info.server
					? "TWO DRIVERS. ONE DEDICATED HOST."
					: "BUDDY ON BOARD. LET’S ROLL!",
			);
		},
		onInput(input, index) {
			if (!game || !net.isHost || net.ended) return;
			if (input.command === "pause" && game.state.mode === "playing") {
				game.pause();
				if (!modalPage) openMenu("pause");
			} else if (input.command === "resume" && game.state.mode === "paused") {
				game.pause();
				closeModal();
			} else if (game.state.mode !== "paused") game.input(index, input);
		},
		onState(state) {
			if (!state || !game) return;
			remotePrevious = renderState || state;
			remoteAt = performance.now();
			renderState = state;
			game.state = state;
			if (state.flowers > lastRemoteEffects.flowers) audio.play("collect");
			if (state.crashes > lastRemoteEffects.crashes) {
				audio.play("crash");
				audio.voice("oops");
			}
			if (state.stage > lastRemoteEffects.stage) audio.play("clear");
			lastRemoteEffects = {
				flowers: state.flowers,
				crashes: state.crashes,
				stage: state.stage,
				pulse: state.pulse,
			};
			if (state.mode === "paused" && !modalPage) openMenu("pause");
			if (state.mode !== "paused" && modalPage === "pause") closeModal();
		},
		onLeave(info) {
			toast("YOUR BUDDY LEFT THE CIRCUIT.");
			if (net.kind === "hub" && net.isHost) {
				const p = game.state.players[info.id];
				if (p) {
					p.bot = true;
					p.invincible = 3600;
					toast("BUDDY LEFT. THE CLUB’S AI HAS THE WHEEL.");
				}
			}
			if (net.kind !== "hub") {
				if (net.isHost) {
					game.state.players = game.state.players.slice(0, 1);
					game.state.playerCount = 1;
				} else {
					game.state.mode = "paused";
					openMenu("pause");
				}
			}
		},
		onTimeUp() {
			game.state.mode = "gameover";
			game.state.won = false;
			finishRound();
		},
		onEnd() {
			audio.setMuted(true);
			keys.clear();
			if (!["victory", "gameover"].includes(game.state.mode))
				game.state.mode = "gameover";
			openMenu("result");
		},
	};
}
function finishRound() {
	if (finishSent) return;
	finishSent = true;
	try {
		localStorage.setItem(
			"dd-best",
			String(Math.max(game.best, game.state.score)),
		);
	} catch {}
	if (net.kind === "hub" && net.isHost)
		net.finish({
			score: game.state.score,
			won: game.state.won,
			stats: {
				flowers: game.state.flowers,
				nearMisses: game.state.nearMisses,
				crashes: game.state.crashes,
				circuit: game.state.stage,
			},
		});
}
function updateUI() {
	if (!game) return;
	const s = game.state;
	const title = s.mode === "title" && net?.kind !== "hub",
		attract = s.attract;
	document.body.classList.toggle("playing", !title);
	$("titleScreen").classList.toggle("hidden", !title);
	$("masthead").classList.toggle("hidden", !title);
	$("hud").classList.toggle("hidden", title || s.mode === "waiting");
	$("attractLabel").classList.toggle("hidden", !attract);
	const n = s.dots.filter((d) => d.collected).length;
	$("roundNumber").textContent =
		`CIRCUIT 0${s.stage} / 04${net.connected ? " · CO-OP" : ""}`;
	$("roundName").textContent = STAGES[s.stage - 1].name;
	$("flowerCount").innerHTML = `${n}<span>/80</span>`;
	$("progressFill").style.width = (n / 80) * 100 + "%";
	$("score").textContent = String(s.score).padStart(6, "0");
	$("lives").textContent =
		s.lives > 5 ? `♥ × ${s.lives}` : "♥ ".repeat(Math.max(0, s.lives));
	const p =
		s.players[Math.max(0, net.connected ? net.playerIndex : 0)] || s.players[0];
	if (p) {
		$("driverLabel").textContent =
			s.playerCount === 2
				? "TWO DRIVERS · SHARED SPARE CARS"
				: "YOUR YELLOW RUNABOUT";
		$("laneStatus").innerHTML =
			`LANE ${p.lane + 1} <span>${p.queue ? `→ ${Math.max(1, Math.min(4, p.lane + p.queue + 1))} QUEUED` : "→ READY"}</span>`;
		$("pulseText").textContent =
			p.pulse > 0
				? "PETAL SHIELD ACTIVE"
				: s.pulse >= 20
					? "PETAL SHIELD READY"
					: `RECHARGING · ${s.pulse}/20`;
		$("pulseFill").style.width = (s.pulse / 20) * 100 + "%";
		$("pulseButton").style.opacity = s.pulse >= 20 || p.pulse > 0 ? "1" : ".65";
		$("pulseButton").classList.toggle(
			"hidden",
			lastInput === "touch" && s.pulse < 20 && p.pulse <= 0,
		);
	}
	$("gateNotice").classList.toggle("hidden", s.stage !== 4 || title);
	const c = $("centerMessage");
	let message = "";
	c.classList.remove("countdown");
	if (net.kind === "hub" && net.connected && net.roundTime < 0) {
		message = `<small>READY, GARDENERS?</small><strong>${Math.ceil(-net.roundTime / 1000)}</strong>`;
		c.classList.add("countdown");
	} else if (s.countdown > 0 && !title) {
		message = `<small>${s.stage === 1 ? "START YOUR LITTLE ENGINES" : STAGES[s.stage - 1].subtitle}</small><strong>${Math.ceil(s.countdown)}</strong>`;
		c.classList.add("countdown");
	} else if (s.mode === "clear") {
		message = `<small>CIRCUIT 0${s.stage} COMPLETE</small><strong>GARDEN, GATHERED!</strong><p>${s.stage < 4 ? STAGES[s.stage].subtitle : "You’ve made a clean sweep of the whole garden."}</p><span class="stageDots">${"● ".repeat(s.stage)}${"○ ".repeat(4 - s.stage)}</span>`;
	}
	c.classList.toggle("hidden", !message || !!modalPage);
	if (message) c.innerHTML = message;
	if (lastMode !== s.mode) {
		if (["victory", "gameover"].includes(s.mode) && !s.attract) {
			finishRound();
			openMenu("result");
		}
		if (s.mode === "playing" && lastMode === "title")
			$("titleScreen").classList.add("hidden");
		lastMode = s.mode;
	}
	if (performance.now() > toastUntil) $("toast").classList.remove("show");
}
function frame(now) {
	now = performance.now();
	if (!ready) {
		requestAnimationFrame(frame);
		return;
	}
	const dt = Math.min((now - lastTime) / 1000 || 0.016, 0.06);
	lastTime = now;
	const pads = net.ended ? [] : pollPads();
	if (!net.ended) applyInputs(pads);
	if (
		!net.active &&
		game.state.mode === "title" &&
		now - lastActivity > 10000
	) {
		closeModal();
		play(1, true);
	}
	const host = !net.connected || net.isHost;
	accumulator += dt;
	if (host && !net.ended) {
		while (accumulator >= 1 / 60) {
			if (!(net.kind === "hub" && net.roundTime < 0)) game.step(1 / 60);
			accumulator -= 1 / 60;
		}
		if (net.connected) net.sendState(game.snapshot());
	} else accumulator = 0;
	let visual = game.state;
	if (net.connected && !net.isHost && renderState) {
		visual = {
			...game.state,
			players: game.state.players.map((p) => ({ ...p })),
			enemies: game.state.enemies.map((p) => ({ ...p })),
		};
		const t = Math.min((now - remoteAt) / 85, 1);
		for (const car of [...visual.players, ...visual.enemies]) {
			const prev = [
				...(remotePrevious?.players || []),
				...(remotePrevious?.enemies || []),
			].find((p) => p.id === car.id);
			if (prev) {
				let delta = car.t - prev.t;
				if (delta > 0.5) delta--;
				if (delta < -0.5) delta++;
				car.t = (prev.t + delta * t + 1) % 1;
				car.renderLane =
					prev.renderLane + (car.renderLane - prev.renderLane) * t;
			}
		}
	}
	if (!options.motion) visual = { ...visual, shake: 0 };
	try {
		scene.update(visual, dt);
	} catch (e) {
		window.__renderError = e.message;
	}
	if (!net.ended) audio.update(game.state, dt);
	updateUI();
	requestAnimationFrame(frame);
}
async function init() {
	try {
		$("loadText").textContent = "Growing a WebGPU garden…";
		const [s, p] = await Promise.all([
			createScene($("world")),
			createPhysics(),
		]);
		scene = s;
		physics = p;
		game = new Game(onGameEvent, (state, dt) => physics.step(state, dt));
		try {
			game.best = Number(localStorage.getItem("dd-best")) || 0;
		} catch {}
		net = createNetwork(connectCallbacks());
		await net.init();
		ready = true;
		window.__DD = {
			get state() {
				return game.snapshot();
			},
			get settings() {
				return { ...game.settings };
			},
			get ready() {
				return ready;
			},
			get menu() {
				return modalPage;
			},
			get input() {
				return lastInput;
			},
			get debug() {
				return {
					idleAge: performance.now() - lastActivity,
					frames: scene.renderer.info.render.calls,
					visibility: document.visibilityState,
					modal: modalPage,
					keys: [...keys],
					net: net.debug,
				};
			},
			get renderer() {
				return scene.stats();
			},
			get network() {
				return net.debug;
			},
			get audio() {
				return audio.getDebug();
			},
			get physics() {
				return physics.debug();
			},
			game,
			net,
			scene,
			audioSystem: audio,
			renderAudioProof,
			play,
			pause,
			resume,
			openMenu,
			returnTitle,
			step(frames = 1) {
				for (let i = 0; i < frames; i++) game.step(1 / 60);
				updateUI();
			},
			setInput,
		};
		$("loading").classList.add("hidden");
		$("titleScreen").classList.remove("hidden");
		updatePrompts();
		updateUI();
		lastActivity = performance.now();
		lastTime = performance.now();
		if (net.kind === "hub") {
			game.state.mode = "waiting";
			$("hud").classList.add("hidden");
			$("titleScreen").classList.add("hidden");
			$("masthead").classList.add("hidden");
			toast("WAITING FOR THE STARTING FLAG…");
		}
		net.ready();
		window.addEventListener("resize", () => scene.resize());
		requestAnimationFrame(frame);
	} catch (error) {
		$("loadText").textContent =
			`Couldn’t start the garden: ${error.message}. Try a current browser with WebGPU or WebGL2.`;
		window.__bootError = error.stack;
		console.error(error);
	}
}
init();
