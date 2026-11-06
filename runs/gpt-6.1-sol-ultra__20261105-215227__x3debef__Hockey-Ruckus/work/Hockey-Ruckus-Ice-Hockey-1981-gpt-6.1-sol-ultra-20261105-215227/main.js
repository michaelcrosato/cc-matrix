import * as THREE from "three/webgpu";
import { HockeyScene } from "./scene.js";
import { HockeyGame, DEFAULTS, ARENAS, clamp, shotVector } from "./game.js";
import { HockeyAudio, renderAudioProbe } from "./audio.js";
import { HockeyNet } from "./network.js";
import { HockeyInput } from "./input.js";
import { INTERVIEW } from "./metadata.js";

const $ = (s) => document.querySelector(s),
	screen = $("#screen"),
	canvas = $("#rink");
const safeStore = {
	get(k, d) {
		try {
			return JSON.parse(localStorage.getItem("hr-" + k)) ?? d;
		} catch {
			return d;
		}
	},
	set(k, v) {
		try {
			localStorage.setItem("hr-" + k, JSON.stringify(v));
		} catch {}
	},
};
const settings = {
	music: 0.1,
	sfx: 0.65,
	glyphs: "PlayStation",
	assist: true,
	...safeStore.get("settings", {}),
};
let renderer,
	art,
	game,
	input,
	net,
	audio = new HockeyAudio(),
	view = "title",
	paused = false,
	attract = false,
	lastActivity = performance.now(),
	lastTime = 0,
	accumulator = 0,
	cupRound = 0,
	focusIndex = 0,
	returnView = "pause",
	onlineTab = "quick",
	networkStatus = "",
	toastTimer = 0,
	hubWaiting = false,
	hubEnd = false,
	pausePrev = false,
	mouseWorld = new THREE.Vector3(),
	hubStartAt = 0;
let remoteInputs = [{}, {}],
	tutorialDelay = 0,
	matchConfig = {},
	gpuBackend = "unknown",
	frameCount = 0;
audio.setMusic(settings.music);
audio.setSfx(settings.sfx);
const labels = {
	keyboard: {
		skate: "WASD",
		shoot: "SPACE",
		pass: "E",
		check: "SHIFT",
		switch: "Q",
		pause: "ESC",
		select: "ENTER",
		back: "ESC",
	},
	PlayStation: {
		skate: "L",
		shoot: "×",
		pass: "□",
		check: "○",
		switch: "△",
		pause: "OPTIONS",
		select: "×",
		back: "○",
	},
	Xbox: {
		skate: "L",
		shoot: "A",
		pass: "X",
		check: "B",
		switch: "Y",
		pause: "MENU",
		select: "A",
		back: "B",
	},
};
const sourceText = (v) =>
	String(v).replace(
		/[&<>"']/g,
		(c) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				c
			],
	);
function glyph(action) {
	const type = input?.type === "gamepad" ? settings.glyphs : "keyboard",
		text = labels[type][action] || action;
	return `<span class="glyph ${type === "PlayStation" ? "ps" : ""}" data-prompt="${action}">${text}</span>`;
}
function updatePrompts() {
	const type = input?.type === "gamepad" ? settings.glyphs : "keyboard";
	document.querySelectorAll("[data-prompt]").forEach((e) => {
		e.textContent = labels[type][e.dataset.prompt] || e.dataset.prompt;
		e.classList.toggle("ps", type === "PlayStation");
	});
	$("#menuPrompts").innerHTML =
		`<span class="prompt">${glyph("select")} SELECT</span> &nbsp; &nbsp; <span class="prompt">${glyph("back")} BACK</span>`;
	$("#playPrompts").innerHTML =
		`<span class="prompt">${glyph("skate")} SKATE</span><span class="prompt">${glyph("shoot")} HOLD / RELEASE SHOT</span><span class="prompt">${glyph("pass")} PASS</span><span class="prompt">${glyph("check")} CHECK</span><span class="prompt">${glyph("switch")} SWITCH</span>`;
}
const button = (text, action, cls = "") =>
	`<button class="${cls}" data-action="${action}">${text}</button>`;
function show(html, name) {
	view = name;
	screen.innerHTML = html;
	screen.classList.remove("hide");
	$("#menuShade").classList.remove("off");
	$("#hud").classList.toggle("hide", !paused && name !== "result");
	$("#brand").classList.toggle("hide", name !== "title");
	$("#edition").classList.toggle("hide", name !== "title");
	$("#bottomBar").classList.remove("hide");
	screen
		.querySelectorAll("button[data-action]")
		.forEach((b) => (b.onclick = () => act(b.dataset.action)));
	screen.querySelectorAll("button,input,textarea").forEach((b, i) => {
		b.addEventListener("pointerenter", () => {
			focusIndex = i;
			setFocus(false);
		});
		b.addEventListener("focus", () => {
			focusIndex = i;
			setFocus(false);
		});
	});
	focusIndex = 0;
	setFocus(false);
	updatePrompts();
}
function focusables() {
	return Array.from(
		screen.querySelectorAll("button:not(:disabled),input,textarea"),
	).filter((e) => e.offsetParent !== null);
}
function setFocus(scroll = true) {
	const list = focusables();
	focusIndex = clamp(focusIndex, 0, list.length - 1);
	list.forEach((e, i) => e.classList.toggle("focused", i === focusIndex));
	if (scroll)
		list[focusIndex]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
}
function navigate(d) {
	focusIndex = (focusIndex + d + focusables().length) % focusables().length;
	setFocus();
	audio.play("ui");
}
function adjust(d) {
	const e = focusables()[focusIndex];
	if (e?.type === "range") {
		e.value = clamp(+e.value + d * +(e.step || 1), +e.min, +e.max);
		e.dispatchEvent(new Event("input"));
	} else if (e?.dataset.action?.includes("toggle")) e.click();
}
function activate() {
	const e = focusables()[focusIndex];
	if (e?.tagName === "BUTTON") e.click();
	else e?.focus();
}
function title() {
	paused = false;
	attract = false;
	hubEnd = false;
	lastActivity = performance.now();
	audio.setPlaying(false);
	input?.clear();
	game?.reset({ mode: "attract", ai: [true, true], time: 180, skill: 0.78 });
	show(
		`<div class="titlePanel"><div class="eyebrow">TWO ON TWO. ALL OUT.</div><h1 class="display">HOCKEY<span>RUCKUS</span></h1><p class="intro">Little teams. Loud sticks.<br>Bank it, bash it, put it on ice.</p><div class="stack">${button('<span class="buttonLabel">PLAY RUCKUS CUP<small>THREE RINKS. ONE TROPHY.</small></span><span class="arrow">↗</span>', "cup", "primary wide")}<div class="row">${button("QUICK MATCH", "quick", "dark")}${button("TWO PLAYERS", "versus", "dark")}</div>${button('LEARN THE ROPES <span class="arrow">→</span>', "learn", "ghost wide")}</div><div class="titleLinks">${button("SETTINGS", "settings")}${button("ABOUT", "about")}</div></div><div class="titleStamp"><span>NO OFFSIDE. NO EXCUSES.</span><b>JUST HOCKEY.</b></div>`,
		"title",
	);
}
function modal(content, name, large = false) {
	show(
		`<section class="modal ${large ? "large" : ""}" aria-label="${name}">${content}</section>`,
		name,
	);
}
function cupBrief() {
	modal(
		`<div class="eyebrow">THE RUCKUS CUP</div><h2 class="display">EARN YOUR ICE.</h2><p class="muted">You’re the Ice Pops. Beat three home teams to lift the tin.<br>Two skaters. One stick at a time. Closest player takes control.</p><div class="arenaCards">${ARENAS.map((a, i) => `<div class="card"><div class="bigNumber">0${i + 1}</div><h3>${a.name}</h3><div class="eyebrow" style="font-size:10px">${a.time} SEC • ${a.turbo ? "TURBO" : "REGULAR"}</div><p>${a.tag}</p></div>`).join("")}</div><div class="row">${button("LET’S MAKE A RUCKUS ↗", "startCup", "primary")}${button("BACK", "title", "ghost")}</div>${safeStore.get("cup", false) ? '<p class="small accent">★ RUCKUS CUP CHAMPION — can you do it again?</p>' : ""}`,
		"cup",
		true,
	);
}
function quick() {
	modal(
		`<div class="eyebrow">YOU VS THE HOME TEAM</div><h2 class="display">PICK YOUR PACE.</h2><p class="muted">A three-minute scrap at the Dockyard.<br>Score more goals. Ties go to sudden death.</p><div class="stack">${button('<span>REGULAR ICE</span><span class="small" style="color:inherit">The classic three-minute match.</span>', "startQuick", "primary wide")}${button('<span>TURBO ICE</span><span class="small">Hot skates. A faster puck.</span>', "startTurbo", "dark wide")}${button("BACK", "title", "ghost")}</div>`,
		"quick",
	);
}
function versus() {
	modal(
		`<div class="eyebrow">SETTLE IT ON THE ICE</div><h2 class="display">BRING A FRIEND.</h2><div class="stack">${button('<span class="buttonLabel">COUCH VERSUS<small>TWO CONTROLLERS OR SHARE A KEYBOARD</small></span><span class="arrow">→</span>', "localBrief", "primary wide")}${button('<span class="buttonLabel">ONLINE VERSUS<small>DIRECT CONNECTION OR QUICK ROOM</small></span><span class="arrow">→</span>', "online", "dark wide")}${button("BACK", "title", "ghost")}</div>`,
		"versus",
	);
}
function localBrief() {
	modal(
		`<div class="eyebrow">SAME COUCH. OPPOSITE ENDS.</div><h2 class="display">PICK YOUR SIDE.</h2><div class="row"><div class="card"><h3 style="color:var(--blue)">ICE POPS →</h3><p>Controller 1<br>WASD · Space shoot<br>E pass · Shift check · Q switch</p></div><div class="card"><h3 class="coral">← DOCK RATS</h3><p>Controller 2<br>Arrow keys · J shoot<br>K pass · L check · U switch</p></div></div><p class="small">Hold and release to shoot. Left stick skates; right stick aims. One controller can play against the second keyboard layout.</p><div class="row">${button("DROP THE PUCK", "startLocal", "primary")}${button("BACK", "versus", "ghost")}</div>`,
		"localBrief",
	);
}
function learn(back = "title") {
	returnView = back;
	modal(
		`<div class="eyebrow">A LITTLE ICE TIME GOES A LONG WAY</div><h2 class="display">SLAM. BANK. SCORE.</h2><div class="controlsGrid"><div class="controlItem">${glyph("skate")}<div><b>SKATE & COLLECT</b><small>Closest skater takes control.</small></div></div><div class="controlItem">${glyph("shoot")}<div><b>HOLD, THEN RELEASE</b><small>Aim with mouse or right stick.</small></div></div><div class="controlItem">${glyph("pass")}<div><b>PASS TO YOUR PAL</b><small>Move the puck up the ice.</small></div></div><div class="controlItem">${glyph("check")}<div><b>CHECK & STEAL</b><small>Get close. Give ’em a nudge.</small></div></div></div><p class="small">Use the boards for a bank shot. Your spare skater guards the net or gets open for a pass. ${glyph("switch")} switches skaters when the puck is loose. Mouse clicks shoot; right click passes. Touch: drag anywhere on the left to skate, hold/release the contextual button to shoot or check.</p><div class="row">${button("TRY GUIDED PRACTICE", "startPractice", "primary")}${button("BACK", back, "ghost")}</div>`,
		"learn",
		true,
	);
}
function settingsMenu() {
	const back = paused ? "pause" : "title";
	modal(
		`<div class="eyebrow">MAKE YOURSELF AT HOME</div><h2 class="display">LOCKER ROOM.</h2><label class="setting">MUSIC<input type="range" id="musicRange" min="0" max="100" step="1" value="${Math.round(settings.music * 100)}"><output>${Math.round(settings.music * 100)}%</output></label><label class="setting">SOUND & VOICE<input type="range" id="sfxRange" min="0" max="100" step="1" value="${Math.round(settings.sfx * 100)}"><output>${Math.round(settings.sfx * 100)}%</output></label><div class="toggleLine"><span>CONTROLLER GLYPHS</span>${button(settings.glyphs, "toggleGlyphs", "dark")}</div><div class="toggleLine"><span>AIM ASSIST <small class="muted">(when no aim input)</small></span>${button(settings.assist ? "ON" : "OFF", "toggleAssist", "dark")}</div><p class="small">WebGPU renderer: ${gpuBackend}. Music starts at 10%. Settings save on this device. Browsers require a first click or button press for sound.</p>${button("BACK", back, "ghost wide")}`,
		"settings",
	);
	for (const [id, key, fn] of [
		["musicRange", "music", (v) => audio.setMusic(v)],
		["sfxRange", "sfx", (v) => audio.setSfx(v)],
	])
		$("#" + id).oninput = (e) => {
			settings[key] = +e.target.value / 100;
			fn(settings[key]);
			e.target.nextElementSibling.textContent = e.target.value + "%";
			safeStore.set("settings", settings);
		};
}
function pause() {
	if (attract) {
		title();
		return;
	}
	if (net?.isHub || view === "result" || hubWaiting || hubEnd) return;
	if (view === "play") {
		paused = true;
		input.clear();
		audio.setPlaying(false);
		pauseMenu();
	} else if (paused) resume();
	else if (view !== "title") back();
}
function pauseMenu() {
	modal(
		`<div class="eyebrow">TAKE A BREATHER</div><h2 class="display">ICE BREAK.</h2><div class="stack">${button("BACK ON THE ICE →", "resume", "primary")}${button("SETTINGS", "settings", "dark")}${button("CONTROLS", "controls", "dark")}${button("DEV BENCH", "dev", "dark")}${button("LEAVE MATCH", "leave", "ghost")}</div><p class="small">${net?.connected ? "Online play continues while this menu is open." : "The clock is stopped. Your skates are still warm."}</p>`,
		"pause",
	);
}
function resume() {
	paused = false;
	view = "play";
	screen.innerHTML = "";
	$("#menuShade").classList.add("off");
	$("#hud").classList.remove("hide");
	$("#bottomBar").classList.add("hide");
	input.clear();
	audio.setPlaying(true);
}
function start(config) {
	matchConfig = { ...config };
	paused = false;
	attract = false;
	hubEnd = false;
	game.reset(config);
	view = "play";
	screen.innerHTML = "";
	$("#menuShade").classList.add("off");
	$("#hud").classList.remove("hide");
	$("#brand").classList.add("hide");
	$("#edition").classList.add("hide");
	$("#bottomBar").classList.add("hide");
	$("#demoTag").classList.add("hide");
	input.clear();
	remoteInputs = [{}, {}];
	audio.setPlaying(true);
	audio.say("start");
	art.setTheme(game.theme);
	updatePrompts();
}
function event(name, data) {
	if (!art) return;
	if (name === "shot") {
		audio.play("shot", data.power / 30);
		art.burst(data.x, data.z, "shot", data.team);
	} else if (name === "check") {
		audio.play("check");
		art.burst(data.x, data.z, "check", data.team);
		toast("CLEAN CHECK!");
	} else if (name === "checkSwing") {
		audio.play("skate", 0.3);
	} else if (
		name === "pass" ||
		name === "pickup" ||
		name === "board" ||
		name === "whistle"
	) {
		audio.play(name);
		if (name === "board") art.burst(data.x, data.z, "ice", 0);
	} else if (name === "goal") {
		audio.play("goal");
		audio.say("goal");
		art.burst(data.x, data.z, "goal", data.team);
		toast(data.bank ? "OFF THE BOARDS. IN THE NET!" : "LIGHT THE LAMP!");
	} else if (name === "overtime") {
		audio.play("whistle");
		toast("TIED UP! NEXT GOAL WINS.");
	} else if (name === "lesson") {
		audio.play("ui");
		toast(data.step >= 5 ? "READY FOR THE REAL THING!" : "NICE! NEXT DRILL.");
	} else if (name === "final" && !attract && view !== "title") {
		if (net?.isHub && net.role === "host") net.finish(game.scores, game.stats);
		if (!net?.isHub)
			setTimeout(() => {
				if (game.phase === "final" && view === "play") result();
			}, 350);
	}
}
function toast(text) {
	if (view === "title") return;
	$("#toast").textContent = text;
	$("#toast").classList.add("show");
	clearTimeout(toastTimer);
	toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 2100);
}
function result() {
	paused = false;
	audio.setPlaying(false);
	const win = game.winner === 0,
		practice = game.training,
		online = matchConfig.mode === "online",
		local = matchConfig.mode === "local",
		cup = matchConfig.mode === "cup";
	if (cup && win && cupRound === 2) {
		safeStore.set("cup", true);
		audio.play("win");
		audio.say("win");
	} else audio.play(win ? "win" : "lose");
	const title = practice
		? "READY TO RUCKUS."
		: cup && win && cupRound === 2
			? "THE TIN IS YOURS!"
			: online || local
				? `${game.winner === 0 ? "ICE POPS" : "DOCK RATS"} WIN!`
				: win
					? "COOL AS ICE."
					: "A LITTLE MORE ICE TIME.";
	const s = game.stats[0];
	const next = practice
		? button("PLAY RUCKUS CUP", "cup", "primary")
		: cup
			? button(
					win ? (cupRound < 2 ? "NEXT RINK →" : "PLAY AGAIN ↗") : "REMATCH ↗",
					win ? (cupRound < 2 ? "nextRound" : "startCup") : "retry",
					"primary",
				)
			: online
				? net.role === "host"
					? button("REMATCH →", "onlineRematch", "primary")
					: '<p class="small accent">Waiting for the host to start a rematch.</p>'
				: button("REMATCH ↗", "rematch", "primary");
	modal(
		`<div class="eyebrow">${practice ? "PRACTICE COMPLETE" : cup ? `RUCKUS CUP • ROUND ${cupRound + 1} OF 3` : "THE FINAL WHISTLE"}</div><h2 class="display">${title}</h2>${practice ? "<p>You can skate, pass, shoot and check. Now go make the boards sing.</p>" : `<div class="resultScore">${game.scores[0]} <span>:</span> ${game.scores[1]}</div><div class="statsGrid"><div class="card"><b>${s.shots}</b><span>SHOTS</span></div><div class="card"><b>${s.passes}</b><span>PASSES</span></div><div class="card"><b>${s.checks}</b><span>CHECKS</span></div></div>`}<div class="stack">${next}${button("BACK TO THE CLUBHOUSE", online ? "leave" : "title", "ghost")}</div>`,
		"result",
	);
}
function dev() {
	if (net.connected) {
		toast("DEV BENCH IS FOR OFFLINE ICE TIME.");
		return;
	}
	const defs = [
		["skateSpeed", "SKATE SPEED", 4, 16, 0.1],
		["shotPower", "SHOT POWER", 12, 50, 1],
		["puckDrag", "ICE DRAG", 0, 2, 0.02],
		["checkPower", "CHECK STUN", 0.2, 2, 0.1],
		["aiSkill", "RIVAL SKILL", 0.1, 1, 0.05],
		["clockSpeed", "CLOCK RATE", 0.1, 8, 0.1],
	];
	modal(
		`<div class="eyebrow">LIVE BALANCE TOOLS</div><h2 class="display">THE DEV BENCH.</h2>${defs.map(([k, l, a, b, step]) => `<label class="setting">${l}<input type="range" data-param="${k}" min="${a}" max="${b}" step="${step}" value="${game.params[k]}"><output>${Number(game.params[k]).toFixed(2)}</output></label>`).join("")}<div class="row">${button("RESET DEFAULTS", "devReset", "dark")}${button("RESET PUCK", "devPuck", "dark")}</div><div class="row" style="margin-top:12px">${button("+ GOAL: ICE POPS", "devGoal0", "dark")}${button("+ GOAL: RIVALS", "devGoal1", "dark")}${button("END MATCH", "devEnd", "dark")}</div>${button("BACK TO PAUSE", "pause", "ghost wide back")}`,
		"dev",
		true,
	);
	screen.querySelectorAll("[data-param]").forEach(
		(e) =>
			(e.oninput = () => {
				game.params[e.dataset.param] = +e.value;
				e.nextElementSibling.textContent = (+e.value).toFixed(2);
			}),
	);
}
function about() {
	const info = INTERVIEW.sourceInformation;
	const groups = [
		["Testing Feedback", INTERVIEW.testingFeedback],
		["Engine Feedback", INTERVIEW.engineFeedback],
		["Prompt Feedback", INTERVIEW.promptFeedback],
	];
	modal(
		`<div class="eyebrow">MADE FOR THE LOVE OF THE GAME</div><h2 class="display">ABOUT THE RUCKUS.</h2><p>An original little hockey game. Inspired by Alan Miller’s <i>Ice Hockey</i>, Activision, Atari 2600 (1981). No original code, artwork, or recordings are used.</p><h3>Source Information</h3><div class="credits">${Object.entries(
			info,
		)
			.map(
				([k, v]) =>
					`<b>${sourceText(k[0].toUpperCase() + k.slice(1))}</b><span>${sourceText(v)}</span>`,
			)
			.join(
				"",
			)}</div><p class="small">Research: <a href="https://atariage.com/manual_html_page.php?SoftwareLabelID=241" target="_blank" rel="noopener">Original manual</a> · <a href="https://www.atarimania.com/game-atari-2600-vcs-ice-hockey_7344.html" target="_blank" rel="noopener">Rink references</a> · <a href="https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub" target="_blank" rel="noopener">AI Hub integration</a></p>${groups.map(([title, items]) => `<div class="rule"></div><h3>${title}</h3><div class="feedback">${items.map((x) => `<p>${sourceText(x)}</p>`).join("")}</div>`).join("")}<p class="small">Three.js r180 (MIT) · Rapier 0.19.3 (Apache-2.0) · AI Hub Session client 1.4.0 · Barlow fonts (SIL OFL). All rink models, animation clips, music, sound design and gibberish voices are generated in code.</p>${button("BACK", "title", "ghost wide back")}`,
		"about",
		true,
	);
}
function online() {
	const quick = onlineTab === "quick";
	modal(
		`<div class="eyebrow">TWO TEAMS. ANYWHERE.</div><h2 class="display">MEET AT THE RINK.</h2><div class="lobbyTabs">${button("QUICK ROOM", "tabQuick", quick ? "chosen" : "dark")}${button("DIRECT ONLINE", "tabDirect", !quick ? "chosen" : "dark")}</div>${quick ? `<p class="small">Two tabs on this website or file, on the same device. For another device, choose Direct Online. AI Hub also connects players automatically.</p><div class="row">${button("CREATE ROOM", "createQuick", "primary")}${button("JOIN ROOM", "joinQuick", "dark")}</div><input class="code" id="roomCode" aria-label="Quick room code" placeholder="ROOM CODE" maxlength="6" value="${net.roomCode || ""}" style="margin-top:18px">` : `<p class="small">Connect directly to a friend. Host makes an invitation; guest pastes it and sends an answer back. Host accepts the answer. Works over LAN or supported internet connections; restricted networks may need AI Hub.</p><div class="row">${button("MAKE INVITATION", "createDirect", "primary")}${button("JOIN INVITATION", "joinDirect", "dark")}</div><div class="stepLabel">PASTE INVITATION OR ANSWER</div><textarea id="signalIn" aria-label="Connection invitation or answer" placeholder="Paste the connection text here"></textarea><div class="row" style="margin-top:10px">${button("ACCEPT ANSWER", "acceptAnswer", "dark")}${button("COPY MY CONNECTION", "copySignal", "dark")}</div><div class="stepLabel">YOUR CONNECTION TEXT — SEND THIS TO YOUR FRIEND</div><textarea id="signalOut" aria-label="Your connection text" readonly>${sourceText(net.getSignal() || "")}</textarea>`}<div class="networkStatus" id="netStatus">${sourceText(networkStatus || "Bring your best bank shot.")}</div><div class="row">${button(net.role === "guest" ? "WAITING FOR HOST" : "START MATCH", "netStart", "primary")}${button("BACK", "onlineBack", "ghost")}</div>`,
		"online",
		true,
	);
	updateNetwork();
}
function updateNetwork() {
	if ($("#netStatus")) $("#netStatus").textContent = networkStatus;
	if ($("#signalOut")) $("#signalOut").value = net.getSignal() || "";
	const startButton = screen.querySelector('[data-action="netStart"]');
	if (startButton) startButton.disabled = !net.connected || net.role !== "host";
}
async function netAction(fn) {
	try {
		await fn();
	} catch (e) {
		networkStatus = e.message;
		toast(e.message);
	}
	updateNetwork();
}
function back() {
	if (net?.isHub || view === "title") return;
	if (paused) {
		if (view === "pause") resume();
		else pauseMenu();
	} else if (view === "online") {
		net.leave();
		versus();
	} else if (view === "localBrief") versus();
	else title();
}
async function act(a) {
	if (net?.isHub) return;
	audio.unlock();
	audio.play("ui");
	lastActivity = performance.now();
	const map = {
		title,
		cup: cupBrief,
		quick,
		versus,
		localBrief,
		learn: () => learn(),
		settings: settingsMenu,
		about,
		pause: pauseMenu,
		resume,
		dev,
		online,
		startCup: () => {
			cupRound = 0;
			startCupRound();
		},
		nextRound: () => {
			cupRound++;
			startCupRound();
		},
		retry: () => startCupRound(),
		startQuick: () =>
			start({ mode: "exhibition", time: 180, ai: [false, true], theme: 0 }),
		startTurbo: () =>
			start({
				mode: "exhibition",
				time: 180,
				turbo: true,
				ai: [false, true],
				theme: 2,
			}),
		startLocal: () =>
			start({ mode: "local", time: 180, ai: [false, false], theme: 0 }),
		startPractice: () =>
			start({ mode: "practice", ai: [false, false], time: 180, theme: 0 }),
		rematch: () => start(matchConfig),
		controls: () => learn("pause"),
		leave: () => {
			net.leave();
			title();
		},
		toggleGlyphs: () => {
			settings.glyphs =
				settings.glyphs === "PlayStation" ? "Xbox" : "PlayStation";
			safeStore.set("settings", settings);
			settingsMenu();
		},
		toggleAssist: () => {
			settings.assist = !settings.assist;
			safeStore.set("settings", settings);
			settingsMenu();
		},
		devReset: () => {
			Object.assign(game.params, DEFAULTS);
			dev();
		},
		devPuck: () => {
			game.faceoff();
			game.phase = "faceoff";
			game.phaseTime = 1;
			toast("PUCK RESET");
		},
		devGoal0: () => {
			game.phase = "play";
			game.score(0);
			toast("GOAL ADDED");
		},
		devGoal1: () => {
			game.phase = "play";
			game.score(1);
			toast("GOAL ADDED");
		},
		devEnd: () => {
			paused = false;
			game.seconds = 0;
			game.finish();
			if (game.phase === "final") result();
			else resume();
		},
		tabQuick: () => {
			onlineTab = "quick";
			online();
		},
		tabDirect: () => {
			onlineTab = "direct";
			online();
		},
		createQuick: () =>
			netAction(async () => {
				const code = net.createLocalRoom();
				$("#roomCode").value = code;
			}),
		joinQuick: () => netAction(() => net.joinRoom($("#roomCode").value)),
		createDirect: () => netAction(() => net.createRoom()),
		joinDirect: () => netAction(() => net.joinRoom($("#signalIn").value)),
		acceptAnswer: () =>
			netAction(() => net.receiveSignal($("#signalIn").value)),
		copySignal: () =>
			netAction(async () => {
				const text = net.getSignal();
				if (!text) throw new Error("Make or join an invitation first.");
				try {
					await navigator.clipboard.writeText(text);
					networkStatus = "Connection text copied.";
				} catch {
					$("#signalOut").select();
					document.execCommand("copy");
					networkStatus = "Connection text selected. Copy and send it.";
				}
			}),
		netStart: () =>
			net.startMatch({ mode: "online", time: 180, turbo: false, theme: 0 }),
		onlineRematch: () =>
			net.startMatch({ mode: "online", time: 180, turbo: false, theme: 0 }),
		onlineBack: () => {
			net.leave();
			networkStatus = "";
			versus();
		},
	};
	map[a]?.();
}
function startCupRound() {
	const a = ARENAS[cupRound];
	start({
		mode: "cup",
		round: cupRound,
		theme: cupRound,
		time: a.time,
		skill: a.skill,
		turbo: a.turbo,
		ai: [false, true],
	});
}
function activity(type) {
	if (hubEnd) return true;
	const consumed = attract;
	if (attract) {
		title();
	}
	lastActivity = performance.now();
	if (input && input._promptType !== type) {
		input._promptType = type;
		updatePrompts();
	}
	if (type !== "keyboard" || audio.ctx?.state !== "running") audio.unlock();
	return consumed;
}
function hud() {
	const playing = view === "play" || attract || paused || view === "result";
	$("#hud").classList.toggle("hide", !playing);
	if (!playing) return;
	$("#scoreHome").textContent = game.scores[0];
	$("#scoreAway").textContent = game.scores[1];
	const n = Math.max(0, Math.ceil(game.seconds));
	$("#clock").textContent = game.training
		? "∞"
		: `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
	$("#clockLabel").textContent = game.suddenDeath
		? "NEXT GOAL WINS"
		: game.turbo
			? "TURBO ICE"
			: "REGULAR ICE";
	$("#awayName").textContent =
		game.mode === "cup" ? ARENAS[game.round].team : "DOCK RATS";
	$("#matchInfo").innerHTML =
		`${game.training ? "GUIDED PRACTICE" : game.mode === "cup" ? `RUCKUS CUP / ${game.round + 1} OF 3` : game.mode === "online" ? "ONLINE VERSUS" : game.mode === "local" ? "COUCH VERSUS" : "EXHIBITION"}<b>${ARENAS[game.theme % 3].name}</b>${net.connected && !net.server ? `YOU: ${net.team === 0 ? "ICE POPS →" : "← DOCK RATS"}` : "ICE POPS ATTACK →"}`;
	$("#pauseButton").classList.toggle("hide", net.isHub || attract);
	$("#demoTag").classList.toggle("hide", !attract);
	const msg = $("#centerMessage");
	if (game.phase === "faceoff")
		msg.innerHTML = `<b>${Math.max(1, Math.ceil(game.phaseTime))}</b><span>${game.suddenDeath ? "NEXT GOAL WINS." : "STICKS DOWN. CHINS UP."}</span>`;
	else if (game.phase === "goal")
		msg.innerHTML = `<b>GOOOAL!</b><span>${game.goalTeam === 0 ? "ICE POPS" : "HOME TEAM"} LIGHT THE LAMP</span>`;
	else if (hubWaiting)
		msg.innerHTML =
			"<b>STICKS DOWN.</b><span>WAITING FOR THE HUB PUCK DROP</span>";
	else msg.innerHTML = "";
	const p = game.players[game.selected[net.team === 1 ? 1 : 0]];
	$("#chargeFill").style.width = p.charge * 100 + "%";
	$("#charge").style.opacity = p.charge > 0.01 ? 1 : 0;
	const touch = input.type === "touch";
	$("#touchAction").classList.toggle("hide", !touch || view !== "play");
	$("#touchAction").textContent = p.hasPuck ? "SHOOT" : "CHECK";
	$("#training").classList.toggle(
		"hide",
		!game.training || game.phase === "final",
	);
	if (game.training) {
		const tips = [
			[
				"GET YOUR SKATES UNDER YOU.",
				"Skate a few strides. Pick up the puck by getting close.",
			],
			[
				"SHARE THE ICE.",
				"Pass to your teammate. One good pass beats two bad skates.",
			],
			[
				"GIVE IT SOME MUSTARD.",
				"Hold the shot button, then release. Aim is helped toward the net.",
			],
			[
				"A FRIENDLY NUDGE.",
				"Skate close to the red puck carrier, then check. Goalies in their crease are protected.",
			],
			[
				"PUT IT IN THE NET.",
				"Skate toward the right goal and shoot. Try a rebound off the boards.",
			],
		][game.trainingStep];
		if (tips)
			$("#training").innerHTML =
				`<div class="eyebrow">ICE SCHOOL / ${game.trainingStep + 1} OF 5</div><h3>${tips[0]}</h3><p>${tips[1]}</p>`;
	}
}
function frame(t) {
	requestAnimationFrame(frame);
	const dt = Math.min((t - lastTime) / 1000 || 0.0167, 0.08);
	lastTime = t;
	input.poll();
	frameCount++;
	if (view === "title" && t - lastActivity > 10000 && !attract) {
		attract = true;
		screen.innerHTML = "";
		$("#brand").classList.add("hide");
		$("#edition").classList.add("hide");
		$("#menuShade").classList.add("off");
		$("#bottomBar").classList.add("hide");
		game.reset({
			mode: "attract",
			ai: [true, true],
			time: 70,
			turbo: true,
			skill: 0.85,
		});
	}
	if (hubWaiting && net.isHub && globalThis.AIHub.time() >= 0) {
		hubWaiting = false;
		game.phase = "play";
		game.phaseTime = 0;
	}
	const run =
		(!paused || net.connected) &&
		!hubEnd &&
		!hubWaiting &&
		(view === "play" ||
			attract ||
			view === "title" ||
			(net.connected && view !== "online"));
	let own = paused ? {} : input.get(0);
	const localTeam = net.connected ? Math.max(0, net.team) : 0;
	if (
		input.mouse.active &&
		input.type === "keyboard" &&
		game.owner === game.selected[localTeam]
	) {
		const ray = new THREE.Raycaster();
		ray.setFromCamera(
			new THREE.Vector2(input.mouse.x, input.mouse.y),
			art.camera,
		);
		const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
		ray.ray.intersectPlane(plane, mouseWorld);
		const p = game.players[game.selected[localTeam]];
		own.aimX = mouseWorld.x - p.x;
		own.aimZ = mouseWorld.z - p.z;
	}
	if (!settings.assist && !own.aimX && !own.aimZ) {
		own.aimX = localTeam ? -1 : 1;
		own.aimZ = own.z;
	}
	if (run) {
		if (net.connected && net.role === "guest") {
			net.sendInput(own);
			input.flush();
			if (game.phase === "final" && view === "play" && !net.isHub) result();
		} else {
			const inputs = net.connected
				? net.server
					? [...remoteInputs]
					: localTeam === 0
						? [own, remoteInputs[1]]
						: [remoteInputs[0], own]
				: [own, input.get(1)];
			accumulator += dt;
			let steps = 0;
			while (accumulator >= 1 / 60) {
				game.step(1 / 60, inputs);
				accumulator -= 1 / 60;
				steps++;
			}
			if (steps) input.flush();
			if (net.connected) net.sendSnapshot(game.snapshot());
		}
		if ((view === "title" || attract) && game.phase === "final")
			game.reset({
				mode: "attract",
				ai: [true, true],
				time: 70,
				theme: (game.theme + 1) % 3,
				turbo: true,
				skill: 0.85,
			});
	} else accumulator = 0;
	const state = game.snapshot();
	if (view === "title" && !attract) state.phase = "menu";
	if (game.owner >= 0 && view === "play") {
		const p = game.players[game.owner];
		const inp = game.ai[p.team]
			? game.aiInput(p.team)
			: net.connected
				? p.team === localTeam
					? own
					: remoteInputs[p.team]
				: p.team
					? input.get(1)
					: own;
		const direction = shotVector(p, inp, game.elapsed);
		state.aim = {
			active: !!p.charge,
			x: p.x,
			z: p.z,
			angle: Math.atan2(direction.z, direction.x),
		};
		state.charge = p.charge;
	}
	art.update(state, dt);
	hud();
	renderer.render(art.scene, art.camera);
}
async function init() {
	try {
		renderer = new THREE.WebGPURenderer({
			canvas,
			antialias: true,
			forceWebGL: new URLSearchParams(location.search).has("webgl"),
		});
		renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
		renderer.setSize(innerWidth, innerHeight);
		await renderer.init();
		gpuBackend = renderer.backend.isWebGPUBackend
			? "WebGPU"
			: "WebGL 2 fallback";
		await HockeyGame.init();
		game = new HockeyGame(event);
		art = new HockeyScene(renderer);
		art.resize(innerWidth, innerHeight);
		input = new HockeyInput(canvas, {
			activity,
			isMenu: () => view !== "play" && !attract,
			navigate,
			adjust,
			activate,
			pause,
			back,
			blur: () => {
				if (view === "play" && !net?.connected) pause();
			},
		});
		net = new HockeyNet({
			onStatus: (s) => {
				networkStatus = s;
				updateNetwork();
			},
			onSignal: () => updateNetwork(),
			onConnected: () => {
				updateNetwork();
				audio.play("ui");
			},
			onRemoteInput: (i, t) => {
				remoteInputs[t ?? 1] = i;
			},
			onSnapshot: (s) => {
				const oldPhase = game.phase,
					oldScores = [...game.scores];
				game.applySnapshot(s);
				if (s.phase === "goal" && oldPhase !== "goal")
					event("goal", {
						team: s.scores[0] > oldScores[0] ? 0 : 1,
						x: s.puck.x,
						z: s.puck.z,
					});
			},
			onStart: (c) => {
				hubEnd = false;
				start({ ...c, ai: [false, c.info?.players?.length === 1] });
				hubWaiting = !!c.hub;
				if (hubWaiting) {
					game.phase = "faceoff";
					game.phaseTime = 3;
				}
			},
			onTimeUp: () => {
				if (net.role === "host") {
					game.phase = "final";
					game.winner =
						game.scores[0] === game.scores[1]
							? -1
							: game.scores[0] > game.scores[1]
								? 0
								: 1;
					net.finish(game.scores, game.stats);
				}
			},
			onEnd: () => {
				hubEnd = true;
				hubWaiting = false;
				audio.setPlaying(false);
				if (audio.ctx) audio.ctx.suspend().catch(() => {});
				input.clear();
				game.phase = "final";
				modal(
					'<div class="eyebrow">AI HUB</div><h2 class="display">THAT’S THE HORN.</h2><p>The round is over. The Hub has your score.</p>',
					"hubEnd",
				);
			},
			onDisconnect: ({ team }) => {
				if (net.isHub) {
					if (net.role === "host" && team >= 0) game.ai[team] = true;
					toast("A PLAYER LEFT THE ICE.");
				} else {
					net.leave();
					paused = true;
					audio.setPlaying(false);
					modal(
						`<div class="eyebrow">CONNECTION CLOSED</div><h2 class="display">PAL LEFT THE RINK.</h2><p class="muted">Your opponent disconnected. Meet them in a new room or keep playing against the home team.</p><div class="stack">${button("FINISH VS COMPUTER", "finishAI", "primary")}${button("CLUBHOUSE", "leave", "ghost")}</div>`,
						"disconnect",
					);
					screen.querySelector('[data-action="finishAI"]').onclick = () => {
						game.ai = [false, true];
						resume();
					};
				}
			},
		});
		window.addEventListener("resize", () => {
			renderer.setSize(innerWidth, innerHeight);
			art.resize(innerWidth, innerHeight);
		});
		$("#pauseButton").onclick = pause;
		title();
		const hub = await net.init();
		if (hub) {
			view = "play";
			hubWaiting = true;
			screen.innerHTML = "";
			$("#menuShade").classList.add("off");
			$("#brand").classList.add("hide");
			$("#edition").classList.add("hide");
			$("#bottomBar").classList.add("hide");
			game.reset({ mode: "online", ai: [false, true] });
			net.ready();
		}
		$("#loading").remove();
		updatePrompts();
		requestAnimationFrame(frame);
		globalThis.__hockey = {
			game,
			art,
			audio,
			net,
			input,
			get view() {
				return view;
			},
			get paused() {
				return paused;
			},
			get attract() {
				return attract;
			},
			get backend() {
				return gpuBackend;
			},
			get frames() {
				return frameCount;
			},
			start,
			act,
			pause,
			resume,
			setIdle: (s) => {
				lastActivity = performance.now() - s * 1000;
			},
			renderAudioProbe,
			metadata: INTERVIEW,
		};
	} catch (e) {
		console.error(e);
		$("#loading").innerHTML =
			`<div><b>ICE DELAY.</b><p>THE RINK COULDN’T OPEN</p><small>${sourceText(e.message)}</small><p style="max-width:440px;line-height:1.6">Use a recent browser with WebGPU or WebGL 2.<br>If WebGPU failed, <a href="?webgl=1" style="color:#f7d45b">try WebGL 2</a>.</p></div>`;
	}
}
init();
