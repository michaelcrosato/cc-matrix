import "../vendor/engine/my-3d2dge.js";
import "../vendor/engine/my-3d2dge-3d.js";
import { DungeonView } from "./view.js";
import { DungeonAudio } from "./audio.js";
import {
	createRun,
	command,
	advance,
	snapshot,
	restore,
	availableInteractions,
	inspectTarget,
	validateContent,
	developer,
	retryCheckpoint,
	setTuning,
	importContent,
	attackPreview,
} from "./core.js";
import { ITEMS, ENEMIES, FLOORS, DEFAULT_TUNING, CONTENT } from "./content.js";
import { createSoloController, connectHub, createPeerLobby } from "./net.js";
import { SoloSave, download } from "./save.js";
import REPORT from "../report.json";
import CONTENT_OVERRIDE from "../build/content-override.json";
if (CONTENT_OVERRIDE) {
	const imported = importContent(CONTENT_OVERRIDE);
	if (!imported.ok) throw Error(imported.reason);
}

const E = globalThis.My3D2dge;
const TITLE = "Treasure of Tarmin After Dark";
const ui = document.querySelector("#ui"),
	hud = document.querySelector("#hud");
const save = new SoloSave();
const qs = new URLSearchParams(location.search),
	testMode = qs.get("test") === "1";
let game,
	view,
	audio,
	controller,
	lobby,
	screen = "loading",
	returnScreen = "title",
	packSlot = 0,
	selectedAction = "held",
	lastInput = performance.now(),
	lastHud = "",
	lastHudAt = 0,
	lastSaveAt = 0,
	lastMilestone = "",
	toastUntil = 0,
	attract = false,
	attractTime = 0,
	attractStage = -1,
	attractState = null,
	attractActionAt = 0,
	titleState = createRun({
		players: [{ id: "preview", name: "The Lantern Bearer" }],
		seed: 1983,
		mode: "solo",
	}),
	lastStateStatus = "",
	busy = false,
	stopped = false,
	devReveal = false,
	devCollision = false,
	wasPaused = false,
	sessionEnded = false;
let touchMode = matchMedia("(pointer:coarse)").matches,
	customContent = null;
const esc = (x) =>
	String(x ?? "").replace(
		/[&<>"']/g,
		(c) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				c
			],
	);
const state = () =>
	attract ? attractState : (controller?.state ?? titleState);
const me = () => {
	const s = state();
	return (
		s?.players?.[attract ? "demo" : controller?.localId] ??
		Object.values(s?.players ?? {})[0]
	);
};
const active = () =>
	controller && screen !== "title" && !attract && controller.state;
const network = () => controller && controller.mode !== "solo";
const itemName = (id) => ITEMS[id]?.name ?? id ?? "Empty hand";
const icon = (id) =>
	({
		blade: "⚔",
		bow: "⌒",
		throwing: "➶",
		rune: "◇",
		scroll: "≋",
		shield: "⬡",
		armor: "♜",
		ring: "◉",
		potion: "⚱",
		warBook: "▤",
		spiritBook: "▤",
		sightBook: "▧",
		food: "◒",
		arrows: "➶",
		key: "⚷",
	})[id] ?? "·";
const itemId = (x) =>
	typeof x === "string" ? x : (x?.item ?? x?.kind ?? null);
const pname = (p) => p?.name ?? "Adventurer";
function settings() {
	return {
		...(game?.settings ?? {}),
		reducedMotion: !!game?.settings?.motion,
		devReveal,
		devCollision,
		touchAssist: game?.settings?.touchAssist !== false,
		uiScale: game?.settings?.uiScale ?? 1,
	};
}
function toast(text) {
	const el = document.querySelector("#toast");
	el.textContent = text;
	el.classList.add("show");
	toastUntil = performance.now() + 3200;
}
function meaningful(e) {
	if (
		e.type === "pointermove" &&
		Math.abs(e.movementX) + Math.abs(e.movementY) < 3
	)
		return;
	lastInput = performance.now();
	if (attract) {
		e.preventDefault();
		e.stopImmediatePropagation();
		exitAttract();
		return;
	}
	if (e.type === "pointerdown" || e.type === "keydown")
		if (!sessionEnded) audio?.unlock();
}
for (const type of ["keydown", "pointerdown", "pointermove", "wheel"])
	window.addEventListener(type, meaningful, { capture: true, passive: false });
function focusFirst() {
	queueMicrotask(() => {
		const b = ui.querySelector("button:not([disabled]),input,textarea,select");
		b?.focus({ preventScroll: true });
	});
}
function bind() {
	for (const b of ui.querySelectorAll("button")) {
		b.onpointerenter = () => b.focus({ preventScroll: true });
	}
	focusFirst();
}
function panel(
	title,
	body,
	{ kicker = "", narrow = false, back = true, cls = "" } = {},
) {
	if (game?.scene) game.scene.pausable = false;
	document.exitPointerLock?.();
	ui.innerHTML = `<div class="overlay-shade ${cls}"><section class="panel ${narrow ? "narrow" : ""}">${back ? '<button class="close" data-ui="back" aria-label="Close">×</button>' : ""}<div class="eyebrow">${esc(kicker)}</div><h2>${esc(title)}</h2>${body}</section></div>`;
	bind();
}
function showTitle() {
	if (sessionEnded && controller?.mode === "hub") return;
	screen = "title";
	sessionEnded = false;
	busy = false;
	lastInput = performance.now();
	hud.innerHTML = "";
	lastHud = "";
	ui.innerHTML = `<div class="title-screen"><div class="title-stamp">THE LANTERN VAULTS<strong>Three floors. One way down.</strong>AN ORIGINAL DUNGEON EXPEDITION</div><div class="title-copy"><div class="eyebrow">An expedition in two strengths</div><h1><span>Treasure of</span><span>Tarmin</span><span class="sub">After Dark</span></h1><div class="title-rule"></div><p class="tagline">Steel can fail. Spirit can falter.<br>Bring enough of both into the dark.</p><div class="title-actions"><button class="primary" data-ui="new">New expedition <span>↗</span></button><button data-ui="continue" ${save.read() ? "" : "disabled"}>Continue expedition <span>↗</span></button><button data-ui="coop">Two lanterns · co-op <span>↗</span></button><div class="secondary"><button data-ui="settings">Settings</button><button data-ui="help">How to play</button><button data-ui="credits">About</button></div></div><div class="save-status">${esc(save.error || "Solo · one or two adventurers · 10–25 minutes")}</div></div><div class="title-decor">THE EYE SEES WHAT YOU CARRY</div><div class="title-footer"><span>Inspired by Treasure of Tarmin · 1983</span><span>Any input returns from the demonstration</span></div></div>`;
	bind();
	if (game) {
		game.resume();
		game.live = false;
		game.o.autoPause = false;
		game.go("title");
	}
	audio?.resume();
}
function closeOverlay() {
	if (screen === "title") return;
	if (screen === "coop" || screen === "host" || screen === "join") {
		lobby?.cancel();
		lobby = null;
		showTitle();
		return;
	}
	if (screen === "credits" || screen === "help" || screen === "saves") {
		if (returnScreen === "title") showTitle();
		else enterPlay();
		return;
	}
	if (screen === "dev" || screen === "editor") {
		enterPlay();
		return;
	}
	if (controller) enterPlay();
	else showTitle();
}
function enterPlay() {
	screen = "play";
	if (game?.scene) game.scene.pausable = true;
	view?.setPlayer(controller?.localId ?? "preview");
	ui.innerHTML = "";
	lastHud = "";
	if (game) {
		game.resume();
		game.live = !!network();
		game.o.autoPause = !network();
		if (game.sceneName !== "play") game.go("play");
	}
	controller?.pause?.(false);
	audio?.resume();
	updateHud(true);
}
function receiveState(s, result) {
	if (result && !result.ok && result.reason) toast(result.reason);
	if (!s) return;
	if (controller?.server) return;
	const status = s.status;
	if (status === "victory" && screen !== "victory") showVictory();
	if (status === "defeat" && screen !== "defeat") showDefeat();
	if (
		controller?.mode === "solo" &&
		!attract &&
		s.status === "playing" &&
		!s.encounter
	) {
		const milestone =
			s.floor +
			":" +
			(s.stats?.kills ?? s.stats?.enemiesDefeated ?? 0) +
			":" +
			(s.bossDefeated ?? false);
		if (milestone !== lastMilestone || performance.now() - lastSaveAt > 20000) {
			save.write(s);
			lastSaveAt = performance.now();
			lastMilestone = milestone;
		}
	}
	lastStateStatus = status;
	lastHud = "";
}
function endSession(reason) {
	sessionEnded = true;
	audio?.stop();
	if (controller?.server) return;
	screen = "ended";
	hud.innerHTML = "";
	panel(
		"The lanterns are extinguished.",
		`<p>${esc(typeof reason === "string" ? reason : "The shared expedition has ended.")}</p><p class="muted">${controller?.mode === "hub" ? "Return through AI Hub to begin another expedition." : "The host has left. A new direct expedition can be started from the title."}</p>${controller?.mode === "hub" ? "" : '<div class="actions"><button data-ui="title">Return to title</button></div>'}`,
		{ kicker: "Session ended", back: false, narrow: true },
	);
}
function newSolo(imported = null) {
	audio?.reset();
	lobby?.cancel();
	lobby = null;
	controller?.close();
	controller = createSoloController({
		state: imported ?? undefined,
		onState: receiveState,
		onStatus: () => {},
	});
	lastMilestone = "";
	lastStateStatus = "";
	selectedAction = "held";
	sessionEnded = false;
	enterPlay();
	save.write(controller.state);
	if (touchMode && !game.settings.touchTutorialDismissed) showTouchTutorial();
	else if (!imported)
		toast("Descend. Defeat the guardian. Claim the treasure.");
}
function showHelp() {
	returnScreen = controller && screen !== "title" ? "play" : "title";
	screen = "help";
	panel(
		"Carry wisdom into the dark.",
		`<p>Descend three floors, defeat the Horned Warden, then <b>claim the treasure</b>. The world waits while you decide.</p><div class="help-grid"><b>WASD / left stick</b><span>Step and strafe on the grid</span><b>Q E / shoulders</b><span>Quarter turn; mouse/right stick looks</span><b>F / ✕ Cross</b><span>Inspect, pick up, open, or interact</span><b>C / right stick click</b><span>Cycle Held, Basic, Spark, Guard, Revive</span><b>Click / R2 / Enter</b><span>Commit the selected combat action</span><b>Right click / L2</b><span>Choose Guard; confirm to commit</span><b>Tab / △ Triangle</b><span>Six-slot pack; equip or use an item</span><b>X / □ Square</b><span>Swap right and left hands</span><b>M / L3 / touchpad</b><span>Explored automap</span><b>R / ○ Circle</b><span>Preview a retreat and its parting blow</span><b>T / menu Rest</b><span>Preview food-funded recovery</span><b>Escape / Options</b><span>Pause; settings and developer tools</span></div><h3>Read both strengths</h3><p><span style="color:var(--war)">⚔ War</span> is protected by armor and a left-hand shield. <span style="color:var(--spirit)">◇ Spirit</span> is protected by a ring. Losing either incapacitates you. Enemies also fall when either pool reaches zero.</p><p>Reusable implements never spend your strength. Bows spend arrows; darts and scrolls vanish on a valid use. Basic Strike and Spark remain available after the rune is learned.</p><p>In co-op, the first committed action opens one shared planning window. Ready together or the other adventurer guards. Descend together; revive a nearby ally with one ration.</p><div class="actions"><button class="primary" data-ui="back">The lantern is ready</button><button data-ui="bindings">Rebind controls</button></div>`,
		{ kicker: "The short manual" },
	);
}
function showTouchTutorial() {
	screen = "touch-help";
	panel(
		"A lantern in each hand.",
		`<p class="touch-hint">Slide your <b>left thumb</b> to step. Drag your <b>right thumb</b> to look; a deliberate sideways swipe turns a corner.</p><p class="touch-hint">Tap the contextual prompt to inspect or collect. In battle, tap an action, then <b>Commit</b>. The menu opens your pack, map, rest, and settings.</p><div class="actions"><button class="primary" data-ui="touch-ready">Enter the vault</button></div>`,
		{ kicker: "Touch gestures", narrow: true, back: false },
	);
}
function showCredits() {
	returnScreen = controller && screen !== "title" ? "play" : "title";
	screen = "credits";
	const r = REPORT;
	const source = Object.entries(r.sourceInformation)
		.map(
			([k, v]) =>
				`<p><b>${esc(k.replace(/([A-Z])/g, " $1"))}:</b> ${esc(v)}</p>`,
		)
		.join("");
	const qa = (title, questions, answers) =>
		`<h3>${title}</h3>${answers.map((v, i) => `<p><b>${esc(questions[i])}</b><br>${esc(v)}</p>`).join("")}`;
	panel(
		"About the expedition",
		`<div class="credits"><p class="settings-small">Right stick / Page Up and Page Down scroll this report.</p><p>An original, unofficial tribute. Original source names and trademarks belong to their owners. Original campaign, writing, creatures, and synthesized score for this expedition.</p><h3>Source Information</h3>${source}<p>Research sources: <a href="https://mocagh.org/intvaction/addtot-manual.pdf" target="_blank" rel="noopener">Mattel manual</a> · <a href="https://history.blueskyrangers.com/instructions/addtarmininst.html" target="_blank" rel="noopener">official transcript</a> · <a href="https://history.blueskyrangers.com/mattelelectronics/games/addtarmin.html" target="_blank" rel="noopener">publisher history and screenshot</a>.</p>${qa("Testing Feedback", ["Issues caught", "Critical / game breaking", "Most helpful test", "Least helpful test"], r.testingFeedback)}${qa("Engine Feedback", ["Liked most", "Stuck or guessed wrong", "Built ourselves", "Hardest part", "Engine changes", "Suggested improvement"], r.engineFeedback)}${qa("Prompt Feedback", ["Liked most", "Confusing", "Hardest", "Suggested change"], r.promptFeedback)}<h3>Open-source licenses</h3><p>my-3D2dge v0.89.1 · Michael Crosato · MIT. Three.js 0.182.0 · Three.js Authors · MIT. Rapier 0.19.3 · Dimforge · Apache 2.0. AI Hub session client 1.4.0 · Michael Crosato · MIT. All dependencies are bundled locally; no CDN is needed.</p><p>Direct co-op uses WebRTC offer and answer codes. No TURN relay is provided; some networks cannot connect. Real controller hardware, real iOS devices, cross-network reachability, and human listening: unknown.</p></div><div class="actions"><button class="primary" data-ui="back">Back</button><button data-ui="download-report">Export credits & feedback</button></div>`,
		{ kicker: TITLE },
	);
}
function showCoop() {
	screen = "coop";
	panel(
		"Two lanterns burn brighter.",
		`<p>Share one dungeon in two browsers, with a personal pack and strength for each adventurer.</p><div class="columns"><div><h3>Carry the first lantern</h3><p>Host an expedition. Send an offer code to your partner, then paste their answer.</p><div class="actions"><button class="primary" data-ui="host">Host expedition</button></div></div><div><h3>Answer the call</h3><p>Join by pasting the host’s offer. Return your answer code and wait for the connection.</p><div class="actions"><button data-ui="join">Join expedition</button></div></div></div><p class="warning">Direct WebRTC works on local networks and some internet connections. No relay is provided; restrictive NAT or firewalls may prevent connection. No camera or microphone is used.</p><div class="actions"><button data-ui="back">Back</button></div>`,
		{ kicker: "1–2 player cooperative expedition" },
	);
}
function netStatus(status, detail) {
	const el = document.querySelector("#connection-status");
	if (el) el.textContent = detail || status;
	if (status === "error") toast(detail || "The connection failed.");
}
function peerReady(c) {
	audio?.reset();
	controller?.close();
	controller = c;
	lobby = null;
	lastMilestone = "";
	enterPlay();
	toast("Two lanterns. One shared expedition.");
}
function setupPeer(role) {
	lobby?.cancel();
	screen = role === "host" ? "host" : "join";
	panel(
		role === "host" ? "Light the first lantern." : "Find the other lantern.",
		`<p>${role === "host" ? "Create your offer, send it to your partner, then paste their answer below." : "Paste the host’s offer below. Create your answer, return it, and wait for the lanterns to meet."}</p><div id="connection-status" class="connection-status">Ready for a direct connection.</div>${role === "host" ? '<div class="actions"><button class="primary" data-ui="make-offer">Create offer code</button></div>' : ""}<label for="invite-in">${role === "host" ? "Partner’s answer" : "Host’s offer"}</label><textarea id="invite-in" placeholder="Paste a complete TARMIN1 code" spellcheck="false"></textarea><div class="actions"><button data-ui="accept-code" class="primary">${role === "host" ? "Connect using answer" : "Create answer code"}</button></div><label for="invite-out">${role === "host" ? "Your offer to send" : "Your answer to send"}</label><textarea id="invite-out" readonly spellcheck="false" aria-label="Your connection code"></textarea><div class="code-actions"><button data-ui="copy-code">Copy code</button><button data-ui="select-code">Select code</button></div><p class="settings-small">Ordinary text selection works when clipboard access is unavailable. Codes include gathered ICE candidates. Connection expires after 90 seconds.</p><div class="actions"><button data-ui="retry-peer">Retry</button><button data-ui="cancel-peer">Cancel</button></div>`,
		{ kicker: "Standalone co-op", narrow: true },
	);
	try {
		lobby = createPeerLobby({
			role,
			onStatus: netStatus,
			onReady: peerReady,
			onState: receiveState,
			onEnd: endSession,
		});
	} catch (e) {
		netStatus("error", e.message);
	}
}
async function peerCode(type) {
	if (!lobby || busy) return;
	busy = true;
	try {
		let code;
		if (type === "offer") code = await lobby.makeOffer();
		else if (lobby.role === "guest")
			code = await lobby.acceptOffer(
				document.querySelector("#invite-in").value,
			);
		else await lobby.acceptAnswer(document.querySelector("#invite-in").value);
		if (code && document.querySelector("#invite-out"))
			document.querySelector("#invite-out").value = code;
	} catch (e) {
		netStatus("error", e.message);
	} finally {
		busy = false;
	}
}
function actionPreview(action) {
	const s = state(),
		p = me();
	if (action.type === "rest")
		return `Spend 1 ration. Restore ${Math.min(s.tuning.rationWar, p.maxWar - p.war)} War and ${Math.min(s.tuning.rationSpirit, p.maxSpirit - p.spirit)} Spirit.`;
	if (action.type === "retreat")
		return "Retreat to the last safe tile. The enemy takes its announced parting strike before you escape.";
	if (action.type === "descend")
		return "The ladder leads down. You cannot climb back. Your party must be ready to leave this floor.";
	return "Commit this action?";
}
function send(action, { confirm = false } = {}) {
	if (!controller || attract || sessionEnded) return;
	const result = controller.send(action);
	if (
		result?.needs ||
		result?.confirm ||
		(result?.reason && /confirm/i.test(result.reason))
	) {
		const needs = result.needs;
		if (
			needs === "swap" ||
			needs?.type === "swap" ||
			result.reason?.toLowerCase().includes("pack is full")
		) {
			showPickupSwap(action);
			return result;
		}
		if (!action.confirm) {
			const text = result.reason ?? needs?.text ?? actionPreview(action);
			showConfirm(
				"Consider your next step.",
				typeof text === "string" ? text : JSON.stringify(text),
				() => {
					enterPlay();
					send({ ...action, confirm: true });
				},
			);
		}
	} else if (result && !result.ok && result.reason) {
		toast(result.reason);
	}
	if (result?.ok && screen === "play") updateHud(true);
	return result;
}
function showConfirm(title, text, fn) {
	screen = "confirm";
	panel(
		title,
		`<p>${esc(text)}</p>${network() ? '<div class="live-label">Shared world · the expedition continues</div>' : ""}<div class="actions"><button class="primary" id="confirm-action">Commit</button><button data-ui="back">Keep considering</button></div>`,
		{ kicker: "A deliberate choice", narrow: true },
	);
	document.querySelector("#confirm-action").onclick = fn;
}
function interactions() {
	try {
		return availableInteractions(state(), controller?.localId ?? "solo") ?? [];
	} catch {
		return [];
	}
}
function contextInteract() {
	const list = interactions();
	if (!list.length) {
		send({ type: "interact" });
		return;
	}
	const a = list[0];
	const target = a.id ?? a.target;
	const kind = a.type ?? a.kind;
	if (kind === "ladder" || kind === "descend") {
		showConfirm(
			"Commit to the deeper maze?",
			actionPreview({ type: "descend" }),
			() => {
				enterPlay();
				send({ type: "descend", confirm: true });
			},
		);
		return;
	}
	if (kind === "gate") {
		showConfirm(
			"One way through.",
			(a.text ?? a.description ?? "One-way transfer.") +
				` Current War ${me().war} → ${Math.max(1, Math.min(me().maxWar, me().war + (a.warDelta ?? 0)))}; Spirit ${me().spirit} → ${Math.max(1, Math.min(me().maxSpirit, me().spirit + (a.spiritDelta ?? 0)))}.`,
			() => {
				enterPlay();
				send({ type: "interact", target, confirm: true });
			},
		);
		return;
	}
	if (kind === "trap") {
		showTrap(target);
		return;
	}
	if (kind === "revive") {
		showConfirm(
			"Raise the other lantern.",
			`Spend 1 ration to revive ${a.name.replace(/^Revive /, "")}: at least ${a.war} War and ${a.spirit} Spirit, preserving any higher strength.`,
			() => {
				enterPlay();
				send({ type: "revive", target });
			},
		);
		return;
	}
	send({ type: "interact", target });
}
function showTrap(target) {
	const feature =
		state().features?.find((f) => f.id === target) ??
		FLOORS[state().floor].features.find((f) => f.id === target);
	screen = "trap";
	panel(
		"A wire beneath the lid.",
		`<p>${esc(feature?.text ?? "A thin wire joins the lid and hinge. Inspect it before opening.")}</p><div class="actions"><button data-ui="inspect-trap" data-target="${esc(target)}" ${feature?.inspected ? "disabled" : ""}>Inspect the wire</button><button data-ui="disarm-trap" data-target="${esc(target)}" ${!feature?.inspected || feature?.disarmed ? "disabled" : ""}>Disarm carefully</button><button data-ui="open-trap" data-target="${esc(target)}" ${feature?.opened ? "disabled" : ""}>${feature?.disarmed ? "Open the coffer" : "Open with wire armed"}</button><button data-ui="back">Leave it</button></div>`,
		{ kicker: "Wired coffer", narrow: true },
	);
}
function showPickupSwap(action) {
	const target = state().loot.find((x) => x.id === action.target);
	screen = "pickup-swap";
	showPack(true, { ...action, target: target?.id ?? action.target });
}
function showPack(swap = false, swapAction = null) {
	if (!controller) return;
	screen = swap ? "pickup-swap" : "pack";
	const p = me(),
		s = state(),
		pack = p.pack ?? Array(6).fill(null);
	const id = itemId(pack[packSlot]),
		item = ITEMS[id];
	panel(
		swap ? "Six slots. One choice." : "Your burden, your advantage.",
		`<div class="pack-layout"><div><div class="pack-grid">${Array.from(
			{ length: 6 },
			(_, i) => {
				const it = itemId(pack[i]);
				return `<button class="slot ${packSlot === i ? "picked" : ""}" data-ui="slot" data-slot="${i}"><span class="slot-num">${i + 1}</span><span class="item-icon">${icon(it)}</span><span class="item-name">${esc(it ? itemName(it) : "Empty slot")}</span><span class="item-kind">${esc(ITEMS[it]?.reuse ?? "available")}</span></button>`;
			},
		).join(
			"",
		)}</div><div class="hand-row"><span><b>LEFT HAND</b>${esc(itemName(itemId(p.left)))}</span><span><b>RIGHT HAND</b>${esc(itemName(itemId(p.right)))}</span></div><div class="hand-row"><span><b>WORN ARMOR</b>${esc(p.armor ? itemName(itemId(p.armor)) : "None")}</span><span><b>SPIRIT RING</b>${esc(p.ring ? itemName(itemId(p.ring)) : "None")}</span></div></div><div class="item-detail"><div class="eyebrow">${swap ? "Compare before collecting" : `Slot ${packSlot + 1} · ${esc(item?.reuse ?? "empty")}`}</div><div class="item-icon">${icon(id)}</div><h3>${esc(item?.name ?? "Room for what comes next.")}</h3><p>${esc(item?.description ?? "Pick up an object to keep it here. Food, arrows, and shared keys do not use pack slots.")}</p>${item?.channel ? `<p class="selected-note">${icon(id)} ${item.power} ${esc(item.channel.toUpperCase())} · range ${item.range} tile${item.range === 1 ? "" : "s"}</p>` : ""}${swap ? `<p class="warning">${esc(itemName(state().loot.find((x) => x.id === swapAction?.target)?.item))} stays in the world if you cancel.</p><div class="actions"><button class="primary" id="replace-loot">Replace slot ${packSlot + 1}</button></div>` : `<div class="actions"><button data-ui="equip" ${!id ? "disabled" : ""}>Equip right</button><button data-ui="use" ${!id ? "disabled" : ""}>Use / wear</button><button data-ui="swap-hands">Swap hands</button><button data-ui="drop" ${!id ? "disabled" : ""}>Drop here</button>${network() ? '<button data-ui="handoff" ' + (!id ? "disabled" : "") + ">Hand to ally</button>" : ""}</div>`}<p class="muted">◒ ${p.food} rations &nbsp; ➶ ${p.arrows} arrows<br>Keyring: ${esc((s.keys ?? s.keyring ?? []).join?.(", ") || "empty")}</p><p class="settings-small">Equipping, swapping, using, and handing off are one combat action. Inspecting is free.</p></div></div>${network() ? '<div class="live-label">Shared world · the planning deadline continues</div>' : ""}<div class="actions"><button class="primary" data-ui="back">Return to the dungeon</button><button data-ui="rest">Rest preview</button></div>`,
		{ kicker: "Six pack slots · two hands" },
	);
	if (swap) {
		document.querySelector("#replace-loot").onclick = () => {
			const a = { ...swapAction, replace: packSlot };
			enterPlay();
			send(a);
		};
		for (const b of ui.querySelectorAll("[data-ui=slot]"))
			b.onclick = (e) => {
				e.stopPropagation();
				packSlot = +b.dataset.slot;
				showPack(true, swapAction);
			};
	}
}
function mapMarkup(s = state(), editable = false) {
	const floor = editable
			? (customContent?.floors?.[s.floor] ?? FLOORS[s.floor])
			: {
					...FLOORS[s.floor],
					rows: s.floors?.[s.floor]?.rows ?? FLOORS[s.floor].rows,
				},
		p = me();
	const rows = floor.rows;
	const explored = s.explored ?? {};
	const isSeen = (x, y) =>
		devReveal ||
		editable ||
		(Array.isArray(explored)
			? explored.includes(`${x},${y}`)
			: (explored[p?.id] ?? explored)[y]?.[x]) ||
		explored[`${x},${y}`] ||
		explored[`${s.floor}:${x},${y}`] ||
		(p && Math.abs(x - p.x) + Math.abs(y - p.y) < 3);
	return `<div class="map-grid" style="grid-template-columns:repeat(${rows[0].length},1fr)">${rows
		.flatMap((row, y) =>
			[...row].map((c, x) => {
				const visible = isSeen(x, y),
					hero = p?.x === x && p?.y === y,
					en = (s.enemies ?? []).find(
						(e) =>
							e.x === x && e.y === y && e.alive && e.war > 0 && e.spirit > 0,
					),
					loot = (s.loot ?? []).find(
						(e) => e.x === x && e.y === y && !e.claimed,
					),
					feature = (s.features ?? floor.features ?? []).find(
						(e) => e.x === x && e.y === y,
					);
				let mark = hero
					? ["↑", "→", "↓", "←"][p.dir ?? 0]
					: en
						? "◆"
						: loot
							? "·"
							: floor.ladder?.x === x && floor.ladder?.y === y
								? "⇣"
								: feature?.kind === "mural"
									? "◉"
									: feature?.kind === "gate"
										? "◇"
										: feature?.kind === "secret"
											? "┆"
											: feature?.kind === "treasure"
												? "♛"
												: "";
				return `<${editable ? "button" : "div"} class="map-cell ${c === "#" ? "wall" : ""} ${!visible ? "unseen" : ""} ${hero ? "hero" : ""} ${en ? "enemy" : ""} ${feature?.kind === "secret" ? "secret" : ""}" ${editable ? `data-ui="edit-tile" data-x="${x}" data-y="${y}" aria-label="Edit tile ${x}, ${y}"` : ""}>${visible ? mark : ""}</${editable ? "button" : "div"}>`;
			}),
		)
		.join("")}</div>`;
}
function showMap() {
	if (!controller) return;
	screen = "map";
	panel(
		"What the lantern remembers.",
		`<div class="map-layout">${mapMarkup()}<div><div class="eyebrow">${esc(FLOORS[state().floor]?.name)}</div><p class="floor-note">${esc(FLOORS[state().floor]?.subtitle)}</p><div class="map-legend">↑ Your lantern and heading<br>◆ A living threat<br>· Supplies or equipment<br>◉ Eye mural<br>◇ One-way gate<br>┆ A suspicious seam<br>⇣ Ladder down &nbsp; ♛ Treasure</div><p class="muted">Unknown passages remain dark. Wall-sight reveals nearby secrets for a limited time.</p>${state().encounter ? '<p class="warning">The encounter is marked. Tactical movement costs an action.</p>' : ""}</div></div><div class="actions"><button class="primary" data-ui="back">Return to the dungeon</button></div>`,
		{ kicker: "Explored automap" },
	);
}
function combatTarget() {
	const s = state();
	const activeIds = s.encounter?.enemies ?? s.encounter?.enemyIds ?? [];
	return (
		(s.enemies ?? []).find(
			(e) =>
				e.alive &&
				e.war > 0 &&
				e.spirit > 0 &&
				(activeIds.includes?.(e.id) || s.encounter?.enemyId === e.id),
		) ??
		(s.enemies ?? []).find(
			(e) =>
				e.alive &&
				e.war > 0 &&
				e.spirit > 0 &&
				Math.abs(e.x - me().x) + Math.abs(e.y - me().y) < 5,
		)
	);
}
function previewRevive() {
	const p = me(),
		ally = Object.values(state().players).find(
			(a) =>
				a.id !== p.id &&
				a.connected !== false &&
				a.down &&
				Math.abs(a.x - p.x) + Math.abs(a.y - p.y) <= 1,
		);
	if (!ally) {
		toast("A downed ally must be within one tile.");
		return;
	}
	if (p.food < 1) {
		toast("Reviving an ally requires one ration. Find supplies or continue.");
		return;
	}
	showConfirm(
		"Raise the other lantern.",
		`Spend 1 ration. ${ally.name} recovers to at least ${Math.ceil(ally.maxWar * 0.3)} War and ${Math.ceil(ally.maxSpirit * 0.3)} Spirit, preserving higher remaining strength. This is one combat action.`,
		() => {
			enterPlay();
			send({ type: "revive", target: ally.id });
		},
	);
}
function showInspect() {
	const e = inspectTarget(state(), controller.localId);
	if (!e) {
		toast("No threat is in sight.");
		return;
	}
	screen = "inspect";
	const held = attackPreview(state(), controller.localId, {
		type: "attack",
		target: e.id,
	});
	panel(
		e.name,
		`<p>${esc(e.description)}</p><p><span style="color:var(--war)">⚔ ${e.war}/${e.maxWar} War · armor ${e.armor}</span><br><span style="color:var(--spirit)">◇ ${e.spirit}/${e.maxSpirit} Spirit · ward ${e.ward}</span></p><p class="warning">${esc(e.intent?.label)} · ${e.intent?.power ?? 0} ${esc(e.intent?.channel)} → ${esc(pname(state().players[e.intent?.target]))}</p><p>${held?.ok ? `${esc(held.name)}: ${held.power} ${held.channel} − ${held.defense} defense = <b>${held.damage} damage</b>. Range ${held.range}. ${esc(held.cost)}.` : esc(held?.reason)}</p><p class="muted">Inspection and quarter turns are free. Choose an action, then commit.</p><div class="actions"><button class="primary" data-ui="back">Return to the encounter</button><button data-ui="pack">Prepare pack</button>${Object.values(state().players).some((a) => a.id !== controller.localId && a.connected !== false && a.down) ? '<button data-ui="revive-preview">Revive ally</button>' : ""}</div>`,
		{ kicker: "Read the threat", narrow: true },
	);
}
function commitSelected() {
	if (screen !== "play" || !state()?.encounter) return;
	if (state().encounter.preparation) {
		send({ type: "continueBoss" });
		return;
	}
	if (selectedAction === "revive") {
		previewRevive();
		return;
	}
	if (screen !== "play" || !state()?.encounter) return;
	const target = combatTarget()?.id;
	const action =
		selectedAction === "guard"
			? { type: "guard" }
			: selectedAction === "held"
				? { type: "attack", target }
				: { type: "attack", channel: selectedAction, target };
	send(action);
}
function updateHud(force = false) {
	if (
		!controller ||
		!state() ||
		screen === "title" ||
		attract ||
		controller.server ||
		sessionEnded
	) {
		if (!attract && hud.innerHTML) hud.innerHTML = "";
		return;
	}
	const s = state(),
		p = me();
	if (!p) return;
	const e = s.encounter ? combatTarget() : null;
	const enemy = e ? (ENEMIES[e.kind] ?? {}) : {};
	const intents = s.encounter?.intents ?? s.encounter?.intentions ?? [];
	const intent =
		(Array.isArray(intents) ? intents[0] : intents[e?.id]) ?? e?.intent;
	const words =
		typeof intent === "string" ? intent : (intent?.text ?? intent?.label);
	let prompt = "";
	const list = interactions();
	const obj = list[0];
	if (obj) {
		prompt = obj.label ?? obj.name ?? obj.text ?? "Inspect what is nearby";
	}
	const log = (s.log ?? [])
		.slice(-3)
		.map((l) => (typeof l === "string" ? l : (l.text ?? l.message ?? "")));
	const allies = Object.values(s.players ?? {}).filter(
		(x) => x.id !== p.id && x.connected !== false,
	);
	const round = s.encounter?.round ?? s.round ?? 1;
	const deadline = s.encounter?.deadline;
	const seconds = deadline
		? Math.max(
				0,
				Math.ceil((deadline - (controller.now ?? performance.now())) / 1000),
			)
		: null;
	const intentChannel = intent?.channel ?? e?.channel ?? enemy.channel;
	const targetName = pname(
		s.players?.[intent?.target ?? intent?.playerId] ?? p,
	);
	const sig = JSON.stringify([
		screen,
		p,
		s.floor,
		e,
		s.encounter,
		log,
		prompt,
		selectedAction,
		game.input.lastDevice,
		Math.floor(controller.countdown ?? 0),
		seconds,
	]);
	if (!force && sig === lastHud) return;
	lastHud = sig;
	const top = `<div class="hud-top"><div><div class="eyebrow">${network() ? "Two lanterns · shared expedition" : "The lantern vaults"}${s.modified ? " · modified" : ""}</div><div class="place-name">${esc(FLOORS[s.floor]?.name ?? "The vault")}</div><div class="objective">Descend · defeat the guardian · claim the treasure${controller.mode === "hub" ? ` · ${Math.ceil(controller.countdown / 60000)} min left` : ""}</div></div><div class="compass"><span>${["N", "E", "S", "W"][((p.dir ?? 0) + 3) % 4]}</span><strong>${["N", "E", "S", "W"][p.dir ?? 0]}</strong><span>${["N", "E", "S", "W"][((p.dir ?? 0) + 1) % 4]}</span></div><button class="hud-menu" data-hud="pause">☰ <span class="desktop-menu">${label("pause")}</span></button></div>`;
	const vitals = `<div class="hud-bottom"><div class="vitals"><div class="vital war"><div class="label"><span>⚔ WAR</span><b>${p.war} <span class="muted">/ ${p.maxWar}</span></b></div><div class="meter"><i style="width:${Math.max(0, (p.war / p.maxWar) * 100)}%"></i></div></div><div class="vital spirit"><div class="label"><span>◇ SPIRIT</span><b>${p.spirit} <span class="muted">/ ${p.maxSpirit}</span></b></div><div class="meter"><i style="width:${Math.max(0, (p.spirit / p.maxSpirit) * 100)}%"></i></div></div><div class="supplies"><span>◒ ${p.food} RATIONS</span><span>➶ ${p.arrows} ARROWS</span><span>⬡ ${p.armor ? 2 : 0} &nbsp; ◉ ${p.ring ? 2 : 0}</span></div></div><div class="hands-label"><b>LEFT</b> ${esc(itemName(itemId(p.left)))}<br><b>RIGHT</b> ${esc(itemName(itemId(p.right)))}<br><span class="muted">${esc(label("pack"))} Pack &nbsp; ${esc(label("map"))} Map &nbsp; ${esc(label("swap"))} Swap</span></div></div>`;
	let combat = "";
	if (s.encounter) {
		combat = `<div class="combat-card"><div class="eyebrow">Round ${round} ${e?.kind === "minotaur" ? `· Seal ${e.phase ?? s.bossPhase ?? 1} / 3` : ""}</div><h3>${esc(e?.name ?? enemy.name ?? "A threat in the dark")}</h3><div class="enemy-bars"><div class="war">⚔ WAR ${e?.war ?? "?"} / ${e?.maxWar ?? enemy.war ?? "?"}<div class="meter"><i style="width:${e ? (e.war / (e.maxWar ?? enemy.war)) * 100 : 100}%"></i></div></div><div class="spirit">◇ SPIRIT ${e?.spirit ?? "?"} / ${e?.maxSpirit ?? enemy.spirit ?? "?"}<div class="meter"><i style="width:${e ? (e.spirit / (e.maxSpirit ?? enemy.spirit)) * 100 : 100}%"></i></div></div></div><div class="intent">${esc(words ?? (e?.kind === "brute" ? "The hammer rises. Read its next strike." : "The creature gathers itself to strike."))}<span class="channel">${intentChannel === "spirit" ? "◇ SPIRIT" : "⚔ WAR"} ${intent?.power ?? intent?.damage ?? enemy.power ?? ""} → ${esc(targetName)} · armor ${e?.armor ?? enemy.armor ?? 0} / ward ${e?.ward ?? enemy.ward ?? 0}</span></div></div><div class="turn-note">${p.down ? "YOUR LANTERN IS DOWN · an ally can revive you" : s.encounter?.preparation ? "A SEAL IS BROKEN · PREPARE, THEN CONTINUE" : seconds !== null ? `PLANNING · ${seconds}s · ${allies.map((a) => esc(pname(a)) + (s.encounter?.plans?.[a.id] ? " READY" : " considering")).join(" · ")}` : "THE WORLD WAITS · C / R3 CHOOSE · R2 COMMIT · ✕ INSPECT"}</div><div class="combat-actions">${s.encounter?.preparation ? '<button class="primary" data-hud="continue-boss">Face the next seal</button><button data-hud="pack">Prepare pack</button><button data-hud="rest">Rest</button>' : `<button class="${selectedAction === "held" ? "selected" : ""}" data-select="held">Held · ${icon(itemId(p.right))}</button><button class="${selectedAction === "war" ? "selected" : ""}" data-select="war">⚔ Basic 3</button><button class="${selectedAction === "spirit" ? "selected" : ""}" data-select="spirit" ${!p.unlocks?.spirit ? "disabled" : ""}>◇ Spark 3</button><button class="${selectedAction === "guard" ? "selected" : ""}" data-select="guard">⬡ Guard</button>${allies.some((a) => a.down) ? `<button class="${selectedAction === "revive" ? "selected" : ""}" data-select="revive">Revive ally</button>` : ""}<button class="primary" data-hud="commit">Commit ${esc(label("attack"))}</button><button data-hud="retreat">Retreat</button>`}</div>`;
	} else if (prompt) {
		combat = `<div class="explore-prompt"><span>${esc(prompt.length > 110 ? prompt.slice(0, 107) + "…" : prompt)}</span><span class="minor">${esc(label("interact"))} · inspect / interact</span>${touchMode ? '<button data-hud="interact">Interact</button>' : ""}</div>`;
	}
	if (p.down)
		combat += `<div class="explore-prompt">Your lantern has fallen.<span class="minor">An ally nearby can spend one ration to revive you.</span></div>`;
	hud.className =
		(s.encounter ? "combat-layout " : "") + (touchMode ? "touch-mode" : "");
	hud.innerHTML =
		top +
		'<div class="crosshair"></div>' +
		vitals +
		combat +
		`<div class="log-line">${log.map((l) => "<p>" + esc(l) + "</p>").join("")}</div>`;
}
function label(action) {
	return (
		game?.input.label(action) ??
		{
			interact: "F",
			attack: "Enter",
			pack: "Tab",
			map: "M",
			swap: "X",
			pause: "Esc",
		}[action] ??
		action
	);
}
function showDefeat() {
	toastUntil = 0;
	document.querySelector("#toast").classList.remove("show");
	screen = "defeat";
	hud.innerHTML = "";
	panel(
		"One strength was not enough.",
		`<p>Both flesh and spirit must endure. Your next expedition begins with what you have learned.</p><div class="actions">${!network() ? '<button class="primary" data-ui="retry-floor">Retry from floor entry</button><button data-ui="new">New expedition</button><button data-ui="title">Return to title</button>' : '<button data-ui="credits">About this expedition</button>'}</div>`,
		{ kicker: "The lantern has fallen", narrow: true, back: false },
	);
}
function showVictory() {
	toastUntil = 0;
	document.querySelector("#toast").classList.remove("show");
	screen = "victory";
	hud.innerHTML = "";
	const s = state(),
		stats = s.stats ?? {};
	panel(
		"The dark has given up its treasure.",
		`<div class="sigil">♛</div><p>Beyond the horns, your hand closes on the old gold.<br>Both strengths carried you here.</p><div class="run-stats"><span><strong>III</strong>Floors descended</span><span><strong>${stats.kills ?? stats.enemiesDefeated ?? s.enemies?.filter((e) => e.dead).length ?? 0}</strong>Threats overcome</span><span><strong>${stats.rounds ?? s.round ?? 0}</strong>Deliberate rounds</span></div><p class="muted">${s.modified ? "Modified expedition · unscored" : "Treasure claimed · expedition complete"}</p><div class="actions">${!network() ? '<button class="primary" data-ui="continue-victory">Continue exploring</button><button data-ui="new">New expedition</button>' : ""}<button data-ui="credits">Credits & report</button></div>`,
		{ kicker: "Treasure claimed", back: false, cls: "victory" },
	);
}
function openPause() {
	if (!controller || screen === "title") {
		showMenuSettings();
		return;
	}
	if (screen !== "play") {
		closeOverlay();
		return;
	}
	if (network()) {
		game.live = true;
		game.o.autoPause = false;
	}
	game.menu(undefined, { pause: !network() });
	if (!network()) controller.pause?.(true);
	if (!network()) audio?.suspend();
}
function showMenuSettings() {
	if (screen === "title") lastInput = performance.now();
	game.menu("settings", { pause: !network() });
}
function showSaves() {
	returnScreen = controller && screen !== "title" ? "play" : "title";
	screen = "saves";
	panel(
		"Keep a flame for later.",
		`<p>${esc(save.durable ? "Local storage has confirmed it can read and write saves. Solo progress is saved at safe milestones." : save.error || "Only a visit-long save is available. Export an expedition to keep it.")}</p><textarea id="save-code" spellcheck="false" aria-label="Export or import expedition save">${controller?.mode === "solo" ? esc(save.export(controller.state)) : ""}</textarea><div class="actions"><button data-ui="export-save">Download solo save</button><button data-ui="import-save">Import pasted save</button><button data-ui="back">Back</button></div>`,
		{ kicker: "Solo expedition archive", narrow: true },
	);
}
const tuneSpecs = [
	["playerDamage", "Player damage", "×", 0.25, 3, 0.05],
	["enemyDamage", "Enemy damage", "×", 0, 3, 0.05],
	["maxWar", "Base maximum War", "points", 12, 100, 1],
	["maxSpirit", "Base maximum Spirit", "points", 10, 80, 1],
	["rationWar", "War per ration", "points", 1, 30, 1],
	["rationSpirit", "Spirit per ration", "points", 1, 25, 1],
	["planningSeconds", "Co-op planning window", "seconds", 3, 30, 1],
	["tempo", "Animation tempo", "×", 0.4, 2, 0.1],
];
function showDev() {
	if (!controller) return;
	game.shell?.hide();
	screen = "dev";
	const s = state(),
		readonly = network();
	panel(
		readonly ? "The lantern’s workings." : "A hand upon the dungeon.",
		`<p class="${readonly ? "muted" : "warning"}">${readonly ? "Shared expeditions expose read-only diagnostics. Balance and content mutations are disabled." : "Developer tools modify this solo expedition and mark it unscored. Changes use the authoritative model."}</p><div class="diagnostic">Seed ${s.seed} · floor ${s.floor + 1} · tick ${s.tick ?? 0} · round ${s.encounter?.round ?? s.round ?? 0} · ${esc(JSON.stringify(controller.diagnostics()))}</div>${
			readonly
				? ""
				: `<div class="dev-grid">${tuneSpecs.map(([key, name, unit, min, max, step]) => `<label><span class="tune-label">${name}<b id="tune-${key}">${s.tuning[key]} ${unit}</b></span><input data-tune="${key}" aria-label="${name}" type="range" min="${min}" max="${max}" step="${step}" value="${s.tuning[key]}"><span class="settings-small">Default ${DEFAULT_TUNING[key]} ${unit}</span></label>`).join("")}</div><div class="dev-tools"><button data-ui="reset-tuning">Reset defaults</button><button data-ui="god">Invulnerability: ${s.invulnerable ? "on" : "off"}</button><button data-ui="supplies">Restore & supply</button><button data-ui="reveal">Reveal map: ${devReveal ? "on" : "off"}</button><button data-ui="collision">Geometry: ${devCollision ? "on" : "off"}</button><button data-ui="retry-floor">Reload checkpoint</button><button data-ui="dev-step">Step simulation 1s</button></div><h3>Jump to authored content</h3><div class="dev-tools">${FLOORS.map((f, i) => `<button data-ui="jump-floor" data-floor="${i}">${esc(f.name)}</button>`).join("")}<button data-ui="jump-boss">Warden preparation</button>${s.enemies.map((e) => `<button data-ui="jump-encounter" data-target="${e.id}">${esc(e.name)}</button>`).join("")}</div><h3>Spawn equipment at your feet</h3><div class="dev-tools"><select id="spawn-item">${Object.entries(
						ITEMS,
					)
						.map(([id, it]) => `<option value="${id}">${esc(it.name)}</option>`)
						.join(
							"",
						)}</select><button data-ui="spawn">Spawn item</button><button data-ui="editor">Content editor / import / export</button></div>`
		}<h3>Enemy intentions and serialized state</h3><pre>${esc(JSON.stringify({ encounter: s.encounter, players: s.players, objective: { bossDefeated: s.bossDefeated, treasureClaimed: s.treasureClaimed } }, null, 2))}</pre><div class="actions"><button class="primary" data-ui="back">Return to the dungeon</button><button data-ui="export-state">Export diagnostic snapshot</button></div>`,
		{ kicker: "Developer mode" },
	);
}
function dev(action) {
	if (network()) return;
	const s = controller.state,
		id = controller.localId;
	let result;
	switch (action.tool) {
		case "tune":
			result = setTuning(s, { [action.key]: action.value });
			break;
		case "resetTuning":
			result = setTuning(s, { ...DEFAULT_TUNING });
			break;
		case "god":
			result = developer(s, id, "invulnerable", !s.invulnerable);
			break;
		case "retry":
			result = retryCheckpoint(s);
			break;
		case "floor":
			result = developer(s, id, "floor", action.floor);
			break;
		case "teleport": {
			const p = s.players[id];
			if (s.floors[s.floor].rows[action.y]?.[action.x] === ".")
				Object.assign(p, {
					x: action.x,
					y: action.y,
					dir: action.dir ?? p.dir,
				});
			s.modified = true;
			result = { ok: true };
			break;
		}
		case "content": {
			result = importContent(action.content);
			if (result.ok) {
				const fresh = createRun({
					players: [{ id, name: me().name }],
					seed: s.seed,
					tuning: s.tuning,
					mode: "solo",
				});
				developer(fresh, id, "floor", s.floor);
				fresh.modified = true;
				controller.replaceState(fresh);
			}
			break;
		}
		default:
			result = developer(
				s,
				id,
				action.tool,
				action.item ?? (action.tool === "step" ? 1000 : undefined),
			);
	}
	if (action.tool === "encounter" && result?.ok) {
		const p = s.players[id],
			e = s.enemies.find((e) => s.encounter?.enemies.includes(e.id));
		if (e) p.dir = e.x > p.x ? 1 : e.x < p.x ? 3 : e.y > p.y ? 2 : 0;
	}
	if (result && !result.ok) toast(result.reason);
	receiveState(controller.state, result);
	lastHud = "";
	return result;
}
function showEditor() {
	if (network()) return;
	screen = "editor";
	customContent ??= structuredClone(CONTENT);
	panel(
		"Stone is data.",
		`<p>Click a map tile to toggle wall and floor. Import and export all maps, entities, item definitions, and balance as validated JSON. Apply to rebuild this floor.</p><div class="map-layout">${mapMarkup({ ...state(), content: customContent }, true)}<div><div class="eyebrow">${esc(customContent.floors[state().floor].name)}</div><p class="compact-list">Validation checks references, starts, reachable objectives, keys and locks, gate landings, geometry, and campaign supplies.</p><div class="actions"><button data-ui="apply-content">Validate & apply</button><button data-ui="export-content">Export content</button></div></div></div><h3>Content JSON</h3><textarea id="content-code" spellcheck="false">${esc(JSON.stringify(customContent, null, 2))}</textarea><div class="actions"><button data-ui="import-content">Import JSON</button><button data-ui="dev">Back to developer tools</button><button data-ui="back">Return to the dungeon</button></div>`,
		{ kicker: "Designer tools" },
	);
}
function tune(key, value) {
	if (network()) return;
	dev({ tool: "tune", key, value });
	const spec = tuneSpecs.find((x) => x[0] === key);
	const el = document.querySelector("#tune-" + key);
	if (el) el.textContent = value + " " + spec[2];
}
function startAttract() {
	if (lobby || ["host", "join", "coop"].includes(screen)) return;
	if (
		(controller && screen !== "title") ||
		network() ||
		attract ||
		screen === "loading"
	)
		return;
	attract = true;
	attractTime = 0;
	attractStage = -1;
	game?.shell?.hide();
	screen = "attract";
	hud.innerHTML = "";
	ui.innerHTML =
		'<div class="attract-banner"><span class="eyebrow">A lantern goes before you</span><small>DEMONSTRATION · ANY INPUT RETURNS</small></div>';
	attractState = createRun({
		players: [{ id: "demo", name: "The Lantern Bearer" }],
		seed: 1983,
		mode: "solo",
	});
	attractState.attract = true;
	game?.resume();
	game?.go("attract");
	audio?.resume();
}
function exitAttract() {
	attract = false;
	attractState = null;
	attractTime = 0;
	lastInput = performance.now();
	showTitle();
}
function animateAttract(dt) {
	attractTime += dt;
	const stage = Math.floor(attractTime / 6) % 6;
	if (stage !== attractStage) {
		attractStage = stage;
		attractActionAt = attractTime;
		const f = stage < 2 ? 0 : stage < 4 ? 1 : 2;
		const fresh = createRun({
			players: [{ id: "demo", name: "The Lantern Bearer" }],
			seed: 1983,
			mode: "solo",
		});
		developer(fresh, "demo", "floor", f);
		fresh.attract = true;
		fresh.invulnerable = true;
		attractState = fresh;
		const p = fresh.players.demo;
		if (stage === 0) {
			p.x = 1;
			p.y = 3;
			p.dir = 1;
		} else if (stage === 1) {
			p.x = 6;
			p.y = 5;
			p.dir = 1;
			p.right = { id: "demo-rune", kind: "rune" };
		} else if (stage === 2) {
			p.x = 4;
			p.y = 1;
			p.dir = 1;
			p.right = { id: "demo-rune", kind: "rune" };
		} else if (stage === 3) {
			p.x = 7;
			p.y = 3;
			p.dir = 1;
			p.right = { id: "demo-sight", kind: "sightBook" };
		} else if (stage === 4) {
			p.x = 7;
			p.y = 7;
			p.dir = 0;
			p.right = { id: "demo-scroll", kind: "scroll" };
		} else {
			p.x = 7;
			p.y = 5;
			p.dir = 1;
			p.right = { id: "demo-blade", kind: "blade" };
		}
		const captions = [
			"Read the eye. Choose the route.",
			"Steel wounds flesh. Runes wound spirit.",
			"A shield is only half a defense.",
			"The stone keeps a secret.",
			"Six slots. Choose what to carry.",
			"Three seals bind the Horned Warden.",
		];
		ui.innerHTML = `<div class="attract-banner"><span class="eyebrow">${captions[stage]}</span><small>DEMONSTRATION · ANY INPUT RETURNS</small></div>`;
	}
	if (attractState) {
		const p = attractState.players.demo;
		p.war = p.maxWar;
		p.spirit = p.maxSpirit;
		p.arrows = 99;
		if (attractTime - attractActionAt > 1.2) {
			attractActionAt = attractTime;
			const e = attractState.encounter;
			if (e?.preparation)
				command(
					attractState,
					"demo",
					{ type: "continueBoss" },
					attractTime * 1000,
				);
			else if (e)
				command(attractState, "demo", { type: "attack" }, attractTime * 1000);
			else if (stage === 0)
				command(
					attractState,
					"demo",
					{ type: "move", dx: 1, dy: 0 },
					attractTime * 1000,
				);
			else if ([1, 2, 5].includes(stage))
				command(attractState, "demo", { type: "attack" }, attractTime * 1000);
			else if (stage === 3) {
				command(
					attractState,
					"demo",
					{ type: "interact", target: "sighing-wall" },
					attractTime * 1000,
				);
			} else if (stage === 4) {
				ui.innerHTML =
					'<div class="attract-banner"><span class="eyebrow">Six slots. Choose what to carry.</span><small>DEMONSTRATION · ANY INPUT RETURNS</small><div style="display:flex;gap:1em;margin-top:1em">' +
					["shield", "potion", "throwing", "rune", "scroll", "sightBook"]
						.map(
							(k) => '<span title="' + itemName(k) + '">' + icon(k) + "</span>",
						)
						.join("") +
					"</div></div>";
			}
		}
	}
}
function moveRelative(dx, dy) {
	const p = me();
	if (!p || p.down) return;
	const dirs = [
			[0, -1],
			[1, 0],
			[0, 1],
			[-1, 0],
		],
		f = dirs[p.dir ?? 0],
		r = dirs[((p.dir ?? 0) + 1) % 4];
	send({
		type: "move",
		dx: f[0] * -dy + r[0] * dx,
		dy: f[1] * -dy + r[1] * dx,
	});
}
let moveWait = 0,
	turnWait = 0;
function inputStep(dt) {
	if (!game) return;
	const q = game.input;
	if (attract) {
		if (
			q.padValues?.some((x) => x > 0.6) ||
			q.padAxes?.some((x) => Math.abs(x) > 0.55)
		) {
			exitAttract();
			return;
		}
		animateAttract(dt);
		return;
	}
	if (q.lastDevice === "touch") {
		touchMode = true;
		document.body.classList.add("touch-mode");
	}
	if (
		q.padValues?.some((x) => x > 0.6) ||
		q.padAxes?.some((x) => Math.abs(x) > 0.55)
	)
		lastInput = performance.now();
	if (screen !== "play") {
		if (!game.shell?.screen) menuPad(q, dt);
		return;
	}
	if ((game.paused && !network()) || game.shell?.screen) return;
	if (q.pressed("cycleAction")) {
		const options = [
			"held",
			"war",
			...(me().unlocks.spirit ? ["spirit"] : []),
			"guard",
			...(Object.values(state().players).some(
				(p) => p.id !== controller.localId && p.connected !== false && p.down,
			)
				? ["revive"]
				: []),
		];
		selectedAction =
			options[(options.indexOf(selectedAction) + 1) % options.length];
		updateHud(true);
		return;
	}
	if (q.pressed("pack")) {
		showPack();
		return;
	}
	if (q.pressed("map")) {
		showMap();
		return;
	}
	if (q.pressed("swap")) {
		send({ type: "swap" });
		return;
	}
	if (q.pressed("interact")) {
		if (state().encounter) showInspect();
		else contextInteract();
		return;
	}
	if (q.pressed("rest")) {
		send({ type: "rest" });
		return;
	}
	if (q.pressed("retreat")) {
		send({ type: "retreat" });
		return;
	}
	if (q.pressed("guard")) {
		selectedAction = "guard";
		updateHud(true);
		return;
	}
	if (q.pressed("attack")) {
		if (state().encounter) commitSelected();
		else contextInteract();
		return;
	}
	moveWait = Math.max(0, moveWait - dt);
	turnWait = Math.max(0, turnWait - dt);
	if (turnWait === 0) {
		let turn =
			q.pressed("turnRight") || q.down("turnRight")
				? 1
				: q.pressed("turnLeft") || q.down("turnLeft")
					? -1
					: 0;
		const aim = q.padAim;
		if (aim && Math.abs(aim[1]) > 0.3) view?.setLook(0, -aim[1] * dt);
		if (aim && Math.abs(aim[0]) > 0.3 && Math.abs(aim[0]) <= 0.65)
			view?.setLook(aim[0] * dt * 0.5, 0);
		if (!turn && aim && Math.abs(aim[0]) > 0.65) turn = Math.sign(aim[0]);
		if (turn) {
			send({ type: "turn", delta: turn });
			view?.setLook(-(view.look?.[0] ?? 0), 0);
			turnWait = 0.24;
		}
	}
	if (!moveWait) {
		const m = [...q.move()];
		if (q.pressed("up")) m[1] = -1;
		else if (q.pressed("down")) m[1] = 1;
		else if (q.pressed("left")) m[0] = -1;
		else if (q.pressed("right")) m[0] = 1;
		if (Math.abs(m[0]) > 0.5 || Math.abs(m[1]) > 0.5) {
			if (Math.abs(m[0]) > Math.abs(m[1])) moveRelative(Math.sign(m[0]), 0);
			else moveRelative(0, Math.sign(m[1]));
			moveWait = 0.3;
		}
	}
}
let menuWait = 0;
function menuPad(q, dt = 1 / 120) {
	if (!ui.querySelector("button")) return;
	const panel = ui.querySelector(".panel"),
		aim = q.padAim;
	if (panel && aim && Math.abs(aim[1]) > 0.25)
		panel.scrollTop += aim[1] * 440 * dt;
	if (panel && (q.down("menuScrollDown") || q.down("menuScrollUp")))
		panel.scrollTop += (q.down("menuScrollDown") ? 1 : -1) * 440 * dt;
	const now = performance.now(),
		h =
			q.pressed("right") || q.down("right")
				? 1
				: q.pressed("left") || q.down("left")
					? -1
					: 0,
		focused = document.activeElement;
	if (h && focused?.matches("input[type=range],select")) {
		if (q.lastDevice === "gamepad" && now > menuWait) {
			if (focused.tagName === "SELECT")
				focused.selectedIndex = Math.max(
					0,
					Math.min(focused.options.length - 1, focused.selectedIndex + h),
				);
			else
				focused.value = String(
					Math.max(
						Number(focused.min || 0),
						Math.min(
							Number(focused.max || 100),
							Number(focused.value) + h * Number(focused.step || 1),
						),
					),
				);
			focused.dispatchEvent(new Event("input", { bubbles: true }));
			focused.dispatchEvent(new Event("change", { bubbles: true }));
			menuWait = now + 160;
		}
		return;
	}
	const nav =
		q.pressed("down") || q.down("down")
			? 1
			: q.pressed("up") || q.down("up")
				? -1
				: h;
	if (nav && now > menuWait) {
		const list = [
				...ui.querySelectorAll("button:not([disabled]),input,textarea,select"),
			],
			i = list.indexOf(focused),
			next = list[(i + nav + list.length) % list.length];
		next?.focus();
		next?.scrollIntoView({ block: "nearest" });
		menuWait = now + 180;
	}
	if (q.pressed("confirm") && document.activeElement?.tagName === "BUTTON")
		document.activeElement.click();
	if (q.pressed("cancel")) closeOverlay();
}
window.addEventListener("keydown", (e) => {
	if (attract) return;
	if (["TEXTAREA", "INPUT", "SELECT"].includes(e.target.tagName)) return;
	if (
		screen !== "play" &&
		screen !== "loading" &&
		!game?.shell?.screen &&
		[
			"ArrowDown",
			"ArrowUp",
			"ArrowRight",
			"ArrowLeft",
			"Enter",
			"Space",
			"Escape",
		].includes(e.code)
	)
		e.preventDefault();
});
window.addEventListener("mousemove", (e) => {
	if (
		screen === "play" &&
		!game?.paused &&
		view &&
		(document.pointerLockElement === document.querySelector("#screen") ||
			e.buttons === 4)
	)
		view.setLook(e.movementX * 0.0024, e.movementY * 0.0024);
});
let touchPoints = new Map();
function setupTouch() {
	const canvas = document.querySelector("#screen");
	window.addEventListener("keydown", (e) => {
		if (e.code === "KeyL" && screen === "play") {
			try {
				canvas.requestPointerLock()?.catch?.(() => {});
			} catch {}
		}
	});
	canvas.addEventListener("pointerdown", (e) => {
		if (e.pointerType !== "touch" || screen !== "play") return;
		touchMode = true;
		touchPoints.set(e.pointerId, {
			x: e.clientX,
			y: e.clientY,
			lastX: e.clientX,
			lastY: e.clientY,
			side: e.clientX < innerWidth * 0.5 ? "left" : "right",
			t: performance.now(),
		});
	});
	canvas.addEventListener("pointermove", (e) => {
		const t = touchPoints.get(e.pointerId);
		if (!t || screen !== "play") return;
		if (t.side === "right") {
			view?.setLook(
				(e.clientX - t.lastX) * 0.003,
				(e.clientY - t.lastY) * 0.003,
			);
			t.lastX = e.clientX;
			t.lastY = e.clientY;
		}
	});
	const end = (e) => {
		const t = touchPoints.get(e.pointerId);
		if (!t) return;
		touchPoints.delete(e.pointerId);
		const dx = e.clientX - t.x,
			dy = e.clientY - t.y;
		if (
			t.side === "right" &&
			Math.abs(dx) > 75 &&
			Math.abs(dx) > Math.abs(dy) * 1.5
		)
			send({ type: "turn", delta: Math.sign(dx) });
		else if (
			Math.hypot(dx, dy) < 12 &&
			performance.now() - t.t < 500 &&
			!state().encounter
		)
			contextInteract();
	};
	canvas.addEventListener("pointerup", end);
	canvas.addEventListener("pointercancel", (e) =>
		touchPoints.delete(e.pointerId),
	);
}
ui.addEventListener("click", async (event) => {
	const b = event.target.closest("[data-ui]");
	if (!b || b.disabled) return;
	const a = b.dataset.ui;
	audio?.unlock();
	switch (a) {
		case "new":
			newSolo();
			break;
		case "continue": {
			const s = save.read();
			if (s) newSolo(s);
			else toast(save.error || "No solo expedition is saved.");
			break;
		}
		case "title":
			lobby?.cancel();
			lobby = null;
			controller?.close();
			controller = null;
			showTitle();
			break;
		case "continue-victory":
			if (!network()) {
				const s = snapshot(state());
				s.status = "playing";
				controller.replaceState(s);
			}
			enterPlay();
			toast("The treasure is yours. The halls remain open.");
			break;
		case "back":
			closeOverlay();
			break;
		case "settings":
			showMenuSettings();
			break;
		case "bindings":
			game.menu("controls", { pause: !network() });
			break;
		case "help":
			showHelp();
			break;
		case "credits":
			showCredits();
			break;
		case "download-report":
			download(
				"tarmin-after-dark-credits.json",
				JSON.stringify(REPORT, null, 2),
			);
			break;
		case "pack":
			showPack();
			break;
		case "revive-preview":
			previewRevive();
			break;
		case "coop":
			showCoop();
			break;
		case "host":
			setupPeer("host");
			break;
		case "join":
			setupPeer("guest");
			break;
		case "make-offer":
			await peerCode("offer");
			break;
		case "accept-code":
			await peerCode("accept");
			break;
		case "copy-code": {
			const t = document.querySelector("#invite-out");
			try {
				await navigator.clipboard.writeText(t.value);
				toast("Connection code copied.");
			} catch {
				t.select();
				toast("Code selected. Copy it using your browser.");
			}
			break;
		}
		case "select-code":
			document.querySelector("#invite-out").select();
			break;
		case "cancel-peer":
			lobby?.cancel();
			lobby = null;
			showCoop();
			break;
		case "retry-peer":
			setupPeer(screen === "host" ? "host" : "guest");
			break;
		case "slot":
			packSlot = +b.dataset.slot;
			showPack();
			break;
		case "equip":
			enterPlay();
			send({ type: "equip", slot: packSlot });
			break;
		case "use":
			enterPlay();
			send({ type: "use", slot: packSlot });
			break;
		case "swap-hands":
			enterPlay();
			send({ type: "swap" });
			break;
		case "drop":
			enterPlay();
			send({ type: "drop", slot: packSlot });
			break;
		case "handoff": {
			const other = Object.values(state().players).find(
				(p) => p.id !== controller.localId && p.connected !== false,
			);
			enterPlay();
			send({ type: "handoff", slot: packSlot, to: other?.id });
			break;
		}
		case "rest":
			enterPlay();
			send({ type: "rest" });
			break;
		case "inspect-trap":
			send({
				type: "interact",
				target: b.dataset.target,
				operation: "inspect",
			});
			showTrap(b.dataset.target);
			break;
		case "disarm-trap":
			send({ type: "interact", target: b.dataset.target, operation: "disarm" });
			showTrap(b.dataset.target);
			break;
		case "open-trap": {
			const target = b.dataset.target,
				f = state().features.find((f) => f.id === target);
			const open = () => {
				enterPlay();
				send({ type: "interact", target, operation: "open", confirm: true });
			};
			if (!f.disarmed)
				showConfirm(
					"The copper wire is still armed.",
					`Opening now triggers 6 Spirit damage before your ring’s ${ITEMS[itemId(me().ring)]?.defense ?? 0} defense. Inspecting and disarming is safe. Open anyway?`,
					open,
				);
			else open();
			break;
		}
		case "touch-ready":
			game.settings.set("touchTutorialDismissed", true);
			enterPlay();
			break;
		case "dev":
			showDev();
			break;
		case "saves":
			showSaves();
			break;
		case "export-save":
			if (controller?.mode === "solo")
				download("tarmin-after-dark-save.json", save.export(controller.state));
			else toast("Start a solo expedition before exporting.");
			break;
		case "import-save":
			try {
				newSolo(save.import(document.querySelector("#save-code").value));
				toast("Solo expedition imported.");
			} catch (e) {
				toast("Import failed: " + e.message);
			}
			break;
		case "retry-floor":
			if (!network()) {
				dev({ tool: "retry" });
				enterPlay();
			}
			break;
		case "reset-tuning":
			dev({ tool: "resetTuning" });
			showDev();
			break;
		case "god":
			dev({ tool: "god" });
			showDev();
			break;
		case "supplies":
			dev({ tool: "supplies" });
			showDev();
			break;
		case "reveal":
			devReveal = !devReveal;
			if (devReveal) dev({ tool: "reveal" });
			showDev();
			break;
		case "collision":
			devCollision = !devCollision;
			showDev();
			break;
		case "dev-step":
			dev({ tool: "step" });
			showDev();
			break;
		case "jump-floor":
			dev({ tool: "floor", floor: +b.dataset.floor });
			showDev();
			break;
		case "jump-encounter":
			dev({ tool: "encounter", item: b.dataset.target });
			enterPlay();
			break;
		case "jump-boss":
			dev({ tool: "floor", floor: 2 });
			dev({ tool: "teleport", x: 7, y: 7, dir: 0 });
			enterPlay();
			break;
		case "spawn":
			dev({ tool: "spawn", item: document.querySelector("#spawn-item").value });
			showDev();
			break;
		case "export-state":
			download(
				"tarmin-after-dark-state.json",
				JSON.stringify(snapshot(state()), null, 2),
			);
			break;
		case "editor":
			showEditor();
			break;
		case "edit-tile": {
			const rows = customContent.floors[state().floor].rows,
				y = +b.dataset.y,
				x = +b.dataset.x;
			let line = [...rows[y]];
			line[x] = line[x] === "#" ? "." : "#";
			rows[y] = line.join("");
			showEditor();
			break;
		}
		case "export-content":
			download(
				"tarmin-after-dark-content.json",
				JSON.stringify(customContent ?? CONTENT, null, 2),
			);
			break;
		case "import-content":
			try {
				customContent = JSON.parse(
					document.querySelector("#content-code").value,
				);
				const v = validateContent(customContent);
				if (Array.isArray(v) && v.length) throw Error(v.join("; "));
				if (v?.ok === false) throw Error(v.errors.join("; "));
				showEditor();
				toast("Validated content imported. Apply to use it.");
			} catch (e) {
				toast("Content rejected: " + e.message);
			}
			break;
		case "apply-content": {
			try {
				customContent = JSON.parse(
					document.querySelector("#content-code").value,
				);
				const v = validateContent(customContent);
				if (Array.isArray(v) && v.length) throw Error(v.join("; "));
				if (v?.ok === false) throw Error(v.errors.join("; "));
				dev({ tool: "content", content: customContent });
				enterPlay();
				toast("Validated content applied.");
			} catch (e) {
				toast("Content rejected: " + e.message);
			}
			break;
		}
	}
});
ui.addEventListener("input", (e) => {
	if (e.target.dataset.tune) tune(e.target.dataset.tune, +e.target.value);
});
hud.addEventListener("click", (e) => {
	const sel = e.target.closest("[data-select]");
	if (sel) {
		selectedAction = sel.dataset.select;
		updateHud(true);
		return;
	}
	const b = e.target.closest("[data-hud]");
	if (!b) return;
	switch (b.dataset.hud) {
		case "pause":
			openPause();
			break;
		case "commit":
			commitSelected();
			break;
		case "interact":
			contextInteract();
			break;
		case "pack":
			showPack();
			break;
		case "revive-preview":
			previewRevive();
			break;
		case "rest":
			send({ type: "rest" });
			break;
		case "retreat":
			send({ type: "retreat" });
			break;
		case "continue-boss":
			send({ type: "continueBoss" });
			break;
	}
});
function exposeTests() {
	if (!testMode) return;
	globalThis.__gameTest = {
		get state() {
			return state();
		},
		get controller() {
			return controller;
		},
		get screen() {
			return screen;
		},
		get attract() {
			return attract;
		},
		get game() {
			return game;
		},
		get view() {
			return view;
		},
		get audio() {
			return audio;
		},
		get report() {
			return REPORT;
		},
		start: () => newSolo(),
		command: (a) => controller?.send(a),
		advance: (ms) => advance(controller.state, performance.now() + ms),
		snapshot: () => snapshot(state()),
		load: (s) => {
			if (controller?.mode !== "solo") newSolo(s);
			else controller.replaceState(s);
		},
		showPack,
		showMap,
		showDev,
		showCredits,
		showHelp,
		showSaves,
		showCoop,
		setupPeer,
		peerCode,
		get lobby() {
			return lobby;
		},
		idle: (ms) => {
			lastInput = performance.now() - ms;
		},
		interactions,
		saveExport: () => save.export(state()),
		saveImport: (x) => save.import(x),
		diagnostics: () => ({
			screen,
			backend: E.World3D.backend,
			errors: game?.errors,
			network: controller?.diagnostics(),
			audio: audio?.diagnostics(),
			saveDurable: save.durable,
		}),
		stop: () => {
			controller?.close();
			lobby?.cancel();
			audio?.stop();
			game?.stop();
			stopped = true;
		},
		CONTENT,
	};
}
async function boot() {
	try {
		controller = await connectHub({
			onState: receiveState,
			onStatus: netStatus,
			onEnd: endSession,
		});
		if (controller?.server) {
			screen = "server";
			ui.innerHTML = "";
			document.body.dataset.ready = "true";
			exposeTests();
			return;
		}
		if (!navigator.gpu || qs.get("backend") === "webgl") {
			const probe = document.createElement("canvas");
			let gl = null;
			try {
				gl = probe.getContext("webgl2");
			} catch {}
			if (!gl)
				throw Error(
					"This browser did not provide a WebGL 2 graphics context. Enable graphics or use a supported browser.",
				);
			gl.getExtension("WEBGL_lose_context")?.loseContext();
		}
		const customSettings = [
			{ key: "music", value: 0.1 },
			{ key: "glyphs", value: "playstation" },
			{
				key: "voice",
				label: "Gibberish voice",
				group: "Sound",
				type: "slider",
				value: 0.65,
				min: 0,
				max: 1,
				step: 0.05,
			},
			{
				key: "uiScale",
				label: "Interface scale",
				group: "Display",
				type: "slider",
				value: 1,
				min: 0.8,
				max: 1.4,
				step: 0.05,
			},
			{
				key: "touchAssist",
				label: "Touch aim assistance",
				group: "Comfort",
				type: "toggle",
				value: true,
			},
			{
				key: "touchTutorialDismissed",
				label: "Touch tutorial dismissed",
				group: "Game",
				type: "toggle",
				value: false,
			},
		];
		game = new E.Game({
			id: "treasure-of-tarmin-after-dark",
			canvas: "screen",
			res: [480, 270],
			expand: true,
			bg: null,
			autoPause: false,
			corner: false,
			fullscreen: false,
			live: !!controller,
			input: {
				up: ["KeyW", "ArrowUp", "Pad12"],
				down: ["KeyS", "ArrowDown", "Pad13"],
				left: ["KeyA", "ArrowLeft", "Pad14"],
				right: ["KeyD", "ArrowRight", "Pad15"],
				turnLeft: ["KeyQ", "Pad4"],
				turnRight: ["KeyE", "Pad5"],
				interact: ["KeyF", "Pad0"],
				attack: ["Enter", "Mouse0", "Pad7"],
				guard: ["Mouse2", "Pad6"],
				cycleAction: ["KeyC", "Pad11"],
				menuScrollUp: ["PageUp"],
				menuScrollDown: ["PageDown"],
				pack: ["Tab", "Pad3"],
				swap: ["KeyX", "Pad2"],
				map: ["KeyM", "Pad10", "Pad17"],
				rest: ["KeyT"],
				retreat: ["KeyR", "Pad1"],
				confirm: ["Enter", "Space", "Pad0"],
				cancel: ["Escape", "Pad1"],
				pause: ["Escape", "Pad9"],
				start: ["Enter", "Pad9"],
			},
			menu: {
				items: () => [
					[
						"Pack",
						() => {
							game.shell.hide();
							showPack();
						},
					],
					[
						"Automap",
						() => {
							game.shell.hide();
							showMap();
						},
					],
					[
						"Rest",
						() => {
							game.shell.hide();
							enterPlay();
							send({ type: "rest" });
						},
					],
					...(!network()
						? [
								[
									"Expedition archive",
									() => {
										game.shell.hide();
										showSaves();
									},
								],
							]
						: []),
					["Developer tools", () => showDev()],
					[
						"How to play",
						() => {
							game.shell.hide();
							showHelp();
						},
					],
					[
						"About / Credits",
						() => {
							game.shell.hide();
							showCredits();
						},
					],
					...(!network()
						? [
								[
									"New expedition",
									() => {
										game.shell.hide();
										newSolo();
									},
								],
								[
									"Return to title",
									() => {
										game.shell.hide();
										controller?.close();
										controller = null;
										showTitle();
									},
								],
							]
						: []),
				],
				settings: [...E.World3D.SETTINGS, ...customSettings],
				controls: {
					interact: "Inspect / interact",
					attack: "Commit combat action",
					guard: "Choose guard",
					cycleAction: "Cycle combat action",
					menuScrollUp: "Scroll menu up",
					menuScrollDown: "Scroll menu down",
					pack: "Six-slot pack",
					swap: "Swap hands",
					map: "Automap",
					rest: "Rest preview",
					retreat: "Retreat preview",
					turnLeft: "Turn left",
					turnRight: "Turn right",
				},
				quit: false,
			},
		});
		window.game = game;
		game.live = !!network();
		new E.Shell(game, {
			tv: true,
			theme: {
				accent: "#dfbf7f",
				ink: "#eee6d3",
				paper: "#101c23",
				line: "#6b786c",
				muted: "#abb3a6",
				font: "Trebuchet MS, Arial, sans-serif",
				titleFont: "Georgia, serif",
			},
		});
		audio = new DungeonAudio({ game, getSettings: settings });
		view = await DungeonView.create({
			game,
			getState: state,
			playerId: controller?.localId ?? "preview",
			getSettings: settings,
			onEvent: (e) => audio?.event(e),
		});
		const scene = {
			pausable: true,
			update(dt) {
				inputStep(dt);
				view.update(dt);
				audio.update(dt, state());
			},
			draw(r) {
				view.draw(r);
			},
		};
		game.start({
			scenes: {
				title: { ...scene, pausable: false },
				play: scene,
				attract: { ...scene, pausable: false },
			},
			scene: controller ? "play" : "title",
		});
		game.hook("input", (dt) => {
			const q = game.input;
			if (
				controller?.mode === "hub" &&
				q.padValues[8] > 0.5 &&
				q.padValues[9] > 0.5
			) {
				q.consume("pause");
				q.consume("map");
				if (game.paused && game.pauseReason === "player") {
					game.shell?.hide();
					game.resume();
				}
			}
			if (game.paused && !network()) {
				if (!wasPaused) {
					controller?.pause?.(true);
					audio?.suspend();
					wasPaused = true;
				}
			} else if (wasPaused) {
				controller?.pause?.(false);
				audio?.resume();
				wasPaused = false;
			}
		});
		setupTouch();
		if (controller) {
			enterPlay();
		} else showTitle();
		document.body.dataset.ready = "true";
		exposeTests();
		requestAnimationFrame(frame);
	} catch (error) {
		console.error(error);
		screen = "error";
		ui.innerHTML = `<div class="overlay-shade"><div class="panel narrow"><div class="eyebrow">The lantern needs attention</div><h2>The 3D renderer could not start.</h2><p>${esc(error.message)}</p><p>This expedition needs WebGL 2 or WebGPU. Try a current Chromium, Safari, or Edge browser with graphics enabled.</p><div class="actions"><button onclick="location.reload()">Try again</button></div></div></div>`;
		document.body.dataset.error = error.message;
		exposeTests();
	}
}
function frame() {
	if (stopped) return;
	const now = performance.now();
	if (
		!attract &&
		!controller &&
		!lobby &&
		!["host", "join", "coop"].includes(screen) &&
		screen !== "loading" &&
		screen !== "error" &&
		now - lastInput >= 10000
	)
		startAttract();
	if (
		!attract &&
		screen === "title" &&
		controller == null &&
		!lobby &&
		game?.shell?.screen &&
		now - lastInput >= 10000
	)
		startAttract();
	if (now > toastUntil)
		document.querySelector("#toast").classList.remove("show");
	if (now - lastHudAt > 100) {
		updateHud();
		lastHudAt = now;
	}
	document.documentElement.style.setProperty(
		"--scale",
		game?.settings.uiScale ?? 1,
	);
	if (
		controller?.state?.status === "victory" &&
		screen === "play" &&
		lastStateStatus !== "victory"
	)
		showVictory();
	requestAnimationFrame(frame);
}
boot();
