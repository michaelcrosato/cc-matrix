import "../vendor/engine/my-3d2dge-3d.js";
import { GameAudio } from "./audio/audio.js";
import {
	CONTENT,
	DEFAULT_TUNING,
	Model,
	validateContent,
} from "./core/model.js";
import { Network } from "./net/network.js";
import { Interface, report } from "./ui/interface.js";
import { DungeonView } from "./view/view.js";

const E = globalThis.My3D2dge;
const INPUT = {
	up: ["KeyW", "ArrowUp", "Pad12"],
	down: ["KeyS", "ArrowDown", "Pad13"],
	left: ["KeyA", "ArrowLeft", "Pad14"],
	right: ["KeyD", "ArrowRight", "Pad15"],
	forward: ["KeyW", "ArrowUp", "PadAxisUp"],
	backward: ["KeyS", "ArrowDown", "PadAxisDown"],
	strafeLeft: ["KeyA", "ArrowLeft", "PadAxisLeft"],
	strafeRight: ["KeyD", "ArrowRight", "PadAxisRight"],
	turnLeft: ["KeyQ", "Pad4"],
	turnRight: ["KeyE", "Pad5"],
	attack: ["Mouse0", "Enter", "Pad7"],
	guard: ["Mouse2", "KeyG", "Pad6"],
	interact: ["KeyF", "Pad0"],
	pack: ["Tab", "KeyI", "Pad3"],
	swap: ["KeyX", "Pad2"],
	map: ["KeyM", "Pad10", "Pad17"],
	retreat: ["KeyR", "Pad1"],
	rest: ["KeyH"],
	use: ["KeyU"],
	inspect: ["KeyV", "Pad12"],
	target: ["KeyT", "Pad11"],
	actionLeft: ["Pad14"],
	actionRight: ["Pad15"],
	war: ["Digit1"],
	spirit: ["Digit2"],
	held: ["Digit3"],
	pause: ["Escape", "KeyP", "Pad9"],
	confirm: ["Enter", "Space", "Pad0"],
	cancel: ["Escape", "Backspace", "Pad1"],
};
const TUNING_KEYS = {
	devPlayerDamage: "playerDamage",
	devEnemyDamage: "enemyDamage",
	devMaxWar: "maxWar",
	devMaxSpirit: "maxSpirit",
	devRationWar: "rationWar",
	devRationSpirit: "rationSpirit",
	devPlanning: "planningSeconds",
	devTempo: "tempo",
};
const settings = [
	{ key: "music", value: 0.1 },
	{ key: "effects", value: 0.65 },
	{ key: "volume", value: 0.7 },
	{ key: "glyphs", value: "playstation" },
	{
		key: "voice",
		label: "Creature voices",
		group: "Sound",
		type: "slider",
		value: 0.35,
		min: 0,
		max: 1,
		step: 0.05,
	},
	{
		key: "reducedMotion",
		label: "Reduced motion",
		group: "Comfort",
		value: (game) => !!game.reduceMotion,
		help: "No walking bob, strong shake or sweeping transitions.",
	},
	{
		key: "uiScale",
		label: "Interface scale",
		group: "Display",
		type: "slider",
		value: 1,
		min: 0.8,
		max: 1.35,
		step: 0.05,
	},
	{
		key: "lookSensitivity",
		label: "Look sensitivity",
		group: "Controller",
		type: "slider",
		value: 1,
		min: 0.3,
		max: 2,
		step: 0.1,
	},
	{
		key: "touchAssist",
		label: "Touch assistance",
		group: "Touch",
		value: true,
		help: "Select the vulnerable channel and offer contextual actions.",
	},
	{
		key: "coopPlanning",
		label: "Host planning window",
		group: "Setup",
		type: "slider",
		value: 8,
		min: 2,
		max: 30,
		step: 1,
		unit: " s",
		help: "8 seconds is stock. Other durations are disclosed in the invitation and mark the shared run modified.",
	},
	{
		key: "devPlayerDamage",
		label: "Player damage ×",
		type: "slider",
		value: 1,
		min: 0.25,
		max: 3,
		step: 0.05,
	},
	{
		key: "devEnemyDamage",
		label: "Enemy damage ×",
		type: "slider",
		value: 1,
		min: 0.25,
		max: 3,
		step: 0.05,
	},
	{
		key: "devMaxWar",
		label: "Base / maximum War",
		type: "slider",
		value: 36,
		min: 12,
		max: 120,
		step: 1,
	},
	{
		key: "devMaxSpirit",
		label: "Base / maximum Spirit",
		type: "slider",
		value: 24,
		min: 12,
		max: 120,
		step: 1,
	},
	{
		key: "devRationWar",
		label: "War per ration",
		type: "slider",
		value: 8,
		min: 1,
		max: 24,
		step: 1,
	},
	{
		key: "devRationSpirit",
		label: "Spirit per ration",
		type: "slider",
		value: 5,
		min: 1,
		max: 24,
		step: 1,
	},
	{
		key: "devPlanning",
		label: "Co-op planning seconds",
		type: "slider",
		value: 8,
		min: 2,
		max: 30,
		step: 1,
	},
	{
		key: "devTempo",
		label: "Animation tempo ×",
		type: "slider",
		value: 1,
		min: 0.25,
		max: 3,
		step: 0.05,
	},
];
class Expedition {
	constructor() {
		this.game = null;
		this.ui = null;
		this.view = null;
		this.audio = null;
		this.stage = "boot";
		this.state = null;
		this.attract = false;
		this.attractModel = null;
		this.lastInput = "keyboard";
		this.lastActivity = performance.now();
		this.inputCooldown = 0;
		this.persistence = false;
		this._saved = null;
		this._lastSaveTick = -1;
		this._lastSaveTime = 0;
		this._lastPhase = "";
		this._lastFloor = -1;
		this._replay = [];
		this.devReveal = false;
		this.finishedDismissed = false;
		this.hidden = false;
		this._restoreTuning = false;
		this.net = new Network({
			onState: (s) => this.onState(s),
			onStatus: (s) => this.onStatus(s),
			onMode: () => {},
			onStart: () => this.onStart(),
			onEnd: (r) => this.onEnd(r),
			onCommandResult: (r, a) => this.result(r, a),
		});
	}
	get player() {
		return (
			this.state?.players?.[this.net.localId] ||
			Object.values(this.state?.players || {}).find((p) => p.connected) ||
			null
		);
	}
	get online() {
		return this.net.mode !== "solo";
	}
	async boot() {
		const hub = await this.net.initHub();
		if (this.net.server) {
			this.stage = "server";
			document.getElementById("boot").hidden = true;
			document.getElementById("server-status").hidden = false;
			this.net.ready();
			this.expose();
			return;
		}
		// Fail before the native renderer can wait on an unavailable backend.
		if (
			!navigator.gpu ||
			new URLSearchParams(location.search).get("backend") === "webgl"
		) {
			const probe = document.createElement("canvas");
			let context = null;
			try {
				context = probe.getContext("webgl2");
			} catch {}
			if (!context)
				throw new Error(
					"WebGL 2 is unavailable on this browser. Use a browser with WebGL 2 or WebGPU enabled.",
				);
			context.getExtension("WEBGL_lose_context")?.loseContext();
		}
		this.game = new E.Game({
			id: "advanced-dungeons-and-danger-v1",
			canvas: "screen",
			res: "wide",
			expand: true,
			bg: null,
			input: INPUT,
			autoPause: false,
			live: true,
			corner: false,
			fullscreen: "button",
			touch: false,
			backGesture: false,
			menu: {
				quit: false,
				controls: {
					up: false,
					down: false,
					left: false,
					right: false,
					forward: "Step forward",
					backward: "Step back",
					strafeLeft: "Strafe left",
					strafeRight: "Strafe right",
					turnLeft: "Quarter-turn left",
					turnRight: "Quarter-turn right",
					attack: "Commit selected action",
					guard: "Guard",
					interact: "Interact",
					pack: "Open pack",
					swap: "Swap hands",
					map: "Explored map",
					retreat: "Retreat",
					rest: "Rest",
					use: "Use held object",
					target: "Next target",
					war: "Select basic War",
					spirit: "Select Spirit spark",
					held: "Select right hand",
				},
				settings,
			},
		});
		this.game.input.touchEnabled = false;
		this.game.input.touchFilter = (event) => event.pointerType !== "touch";
		this.game.input._cornerMenu = true;
		for (const key of ["touch", "hand", "touchSize", "touchOpacity"]) {
			this.game.settings.spec(key).group = "Internal";
		}
		this.audio = new GameAudio(this.game);
		this.ui = new Interface(this);
		// Developer rows belong to the developer screen, outside ordinary preferences.
		this.ui.shell._settingsRows = (add) => {
			const S = this.game.settings;
			for (const group of [
				"Sound",
				"Display",
				"Comfort",
				"Controller",
				"Touch",
			]) {
				const keys = S.keys(group).filter(
					(k) =>
						!k.startsWith("dev") &&
						![
							"fps",
							"frameRate",
							"pixelScale",
							"filter",
							"filter3d",
							"fullscreen",
							"touchButtons",
							"touchSide",
							"motion",
							"background",
						].includes(k),
				);
				if (!keys.length) continue;
				add(this.ui.shell._el("div", "esh-k esh-sec", group));
				for (const k of keys) add(this.ui.shell._row(k));
			}
		};
		this.game.settings.onChange = (k, v) => {
			document.documentElement.style.setProperty(
				"--ui",
				this.game.settings.uiScale || 1,
			);
			if (k === "reducedMotion") this.game.settings.set("motion", v);
			if (
				TUNING_KEYS[k] &&
				!this._restoreTuning &&
				this.stage === "play" &&
				this.net.mode === "solo"
			) {
				this.net.model?.setTuning({ [TUNING_KEYS[k]]: v });
				this.onState(this.net.model.state);
			}
			if (k === "glyphs") this.ui.lastHUD = "";
		};
		document.documentElement.style.setProperty(
			"--ui",
			this.game.settings.uiScale || 1,
		);
		this.view = new DungeonView(this.game, {
			getState: () => (this.stage === "title" ? null : this.state),
			getPlayer: () => this.player,
			getSettings: () => ({
				...this.game.settings,
				reducedMotion:
					this.game.settings.reducedMotion || this.game.reduceMotion,
			}),
		});
		await this.view.init();
		this.game.debug = {
			snapshot: () => ({
				stage: this.stage,
				renderer: this.view.rendererName,
				state: this.state,
				view: this.view.snapshot(),
			}),
		};
		this.game.start({
			scene: "main",
			scenes: {
				main: {
					pausable: false,
					touch: [],
					camera: { zoom: false },
					update: (dt) => this.update(dt),
					draw: (r) => this.view.draw(r),
				},
			},
		});
		this.game.hook("input", () => this.checkAttractPad());
		this.bindEvents();
		this.expose();
		document.getElementById("boot").hidden = true;
		if (hub) {
			this.stage = "play";
			this.ui.hide();
			this.state = this.net.state;
			this.net.ready();
		} else {
			this.readSaved();
			this.stage = "title";
			this.ui.title();
		}
		this.lastActivity = performance.now();
	}
	expose() {
		globalThis.__DANGER = {
			app: this,
			game: this.game,
			net: this.net,
			ui: this.ui,
			view: this.view,
			audio: this.audio,
			Model,
			CONTENT,
			report,
			send: (a) => this.send(a),
			newSolo: () => this.newSolo(false),
			snapshot: () => this.net.model?.snapshot() || this.state,
			logical: (a) => this.game?.input.tap(a),
			setIdle: (ms) => {
				this.lastActivity = performance.now() - ms;
			},
			attractStep: (ms) => this.attractStep(ms),
			stop: () => this.dispose(),
		};
		globalThis.__gameReady = true;
	}
	onStart() {
		if (this.stage === "boot") return;
		this.stage = "play";
		this.attract = false;
		this.attractModel = null;
		this.ui?.hide();
		this.state = this.net.state;
		this._lastPhase = "";
		this._lastFloor = -1;
		this.finishedDismissed = false;
		this.syncTuningSliders();
		this.ui?.notice(
			this.online ? "Two lanterns, one descent" : "The lantern is lit",
			"Keep both strengths alive. Read each intention before committing.",
		);
	}
	syncTuningSliders() {
		if (!this.game || !this.state) return;
		this._restoreTuning = true;
		for (const [k, v] of Object.entries(TUNING_KEYS))
			this.game.settings.set(k, this.state.tuning[v]);
		this._restoreTuning = false;
	}
	onState(s) {
		if (this.attract) return;
		this.state = s;
		if (
			this.stage === "play" &&
			this.net.mode === "solo" &&
			s?.phase === "explore" &&
			this.net.model &&
			s.tick !== this._lastSaveTick &&
			performance.now() - this._lastSaveTime > 1500
		)
			this.saveCheckpoint();
	}
	onStatus(s) {
		if (this.ui?.shell.screen === "invite") {
			this.ui.invite.status = s;
			this.ui.statusInvite();
		}
		const out = document.getElementById("server-status");
		if (out && this.net.server) out.textContent = s;
	}
	onEnd(reason) {
		this.audio?.stop();
		if (this.stage === "title" || this.stage === "boot") return;
		this.ui?.hide();
		this.stage = "ended";
		const e = document.getElementById("session-ended");
		e.hidden = false;
		e.querySelector("p").textContent = reason;
		e.querySelector("button").hidden = this.net.mode === "hub";
	}
	readSaved() {
		try {
			const raw = localStorage.getItem("danger-expedition-v1");
			if (raw) {
				const parsed = JSON.parse(raw),
					m = new Model();
				if (m.load(parsed).ok) this._saved = parsed;
				else this._saved = null;
			}
			const probe = "danger-storage-probe";
			localStorage.setItem(probe, "1");
			this.persistence = localStorage.getItem(probe) === "1";
			localStorage.removeItem(probe);
		} catch {
			this.persistence = false;
			this._saved = null;
		}
		return this._saved;
	}
	saved() {
		return this._saved;
	}
	saveCheckpoint() {
		if (
			this.net.mode !== "solo" ||
			!this.net.allowSoloSave ||
			!this.net.model ||
			this.attract ||
			this.state?.phase !== "explore"
		)
			return false;
		const save = this.net.model.exportSave();
		if (this.state.content) save.content = this.state.content;
		this._saved = save;
		this._lastSaveTick = this.state.tick;
		this._lastSaveTime = performance.now();
		try {
			const raw = JSON.stringify(save);
			localStorage.setItem("danger-expedition-v1", raw);
			this.persistence = localStorage.getItem("danger-expedition-v1") === raw;
		} catch {
			this.persistence = false;
		}
		return this.persistence;
	}
	newSolo(tutorial = true) {
		this.stopAttract(false);
		this.stage = "play";
		this._lastSaveTick = -1;
		this._lastPhase = "";
		this._lastFloor = -1;
		this.finishedDismissed = false;
		document.getElementById("session-ended").hidden = true;
		this.net.startSolo();
		this.state = this.net.state;
		this.ui.hide();
		this.saveCheckpoint();
		this.view?.resetLook();
		if (tutorial)
			this.ui.show("briefing", {
				kicker: "The Lantern Vault · first descent",
				title: "Keep both fires burning.",
				text:
					"▰ WAR is your body. ◇ SPIRIT is your resolve. Either empty pool brings you down.\n\nRead each creature’s next blow. Prepare the right hand. Combat waits until you commit. A ration restores both strengths when you are safe." +
					(this.lastInput === "touch"
						? "\n\nTouch: drag the left half to step; drag the right half to look. Double-tap right for your pack. Tap with two fingers for the map."
						: ""),
				actions: [
					["Enter the vault", () => this.ui.hide()],
					["Learn the controls", () => this.ui.help()],
				],
			});
		this.syncPause();
	}
	continueSolo() {
		if (!this._saved) return;
		try {
			this.stopAttract(false);
			this.stage = "play";
			if (this._saved.content) {
				this.net.startSolo();
				this.net.model = new Model({ content: this._saved.content });
				const r = this.net.model.load(this._saved);
				if (!r.ok) throw Error(r.message);
				this.net.state = this.net.model.state;
				this.net._run = this.net.state.runId;
				this.net._emit();
			} else this.net.startSolo(this._saved);
			this.state = this.net.state;
			this._lastPhase = "";
			this._lastFloor = -1;
			this.finishedDismissed = false;
			this.ui.hide();
		} catch (e) {
			this.ui.notice("Save could not be restored", e.message);
			this.returnTitle();
		}
	}
	returnTitle() {
		if (this.net.mode === "hub" && !this.net.ended) return;
		this.saveCheckpoint();
		this.stopAttract(false);
		this.net.close();
		this.state = null;
		this.stage = "title";
		this._lastPhase = "";
		this.audio?.stop();
		this.game?.resume();
		this.ui?.title();
		this.lastActivity = performance.now();
		this.unlockPointer();
		document.getElementById("session-ended").hidden = true;
	}
	continueAfterVictory() {
		if (this.net.mode !== "solo") return;
		const r = this.net.model?.continueExpedition();
		if (r?.ok) {
			this.finishedDismissed = true;
			this.state = this.net.model.state;
			this.net.state = this.state;
			this._lastPhase = "explore";
			this.ui.hide();
			this.saveCheckpoint();
		}
	}
	retry() {
		if (this.net.mode !== "solo") return;
		const r = this.net.model?.retry();
		if (r?.ok) {
			this.net.state = this.net.model.state;
			this.state = this.net.state;
			this.stage = "play";
			this.finishedDismissed = false;
			this._lastPhase = "";
			this.ui.hide();
			this.saveCheckpoint();
		} else
			this.ui.notice(
				"Checkpoint unavailable",
				r?.message || "Start a fresh expedition.",
			);
	}
	syncPause() {
		this.net.paused =
			this.net.mode === "solo" &&
			(this.hidden || !!this.ui?.shell.screen) &&
			this.stage === "play";
		if (this.ui?.shell.screen) this.unlockPointer();
	}
	unlockPointer() {
		if (document.pointerLockElement) document.exitPointerLock?.();
	}
	send(a) {
		if (this.attract) return null;
		if (this.stage !== "play" || this.net.ended)
			return { ok: false, message: "No active expedition." };
		this._replay.push({ tick: this.state?.tick, action: structuredClone(a) });
		if (this._replay.length > 3000) this._replay.shift();
		const r = this.net.send(a);
		if (r && typeof r.ok === "boolean" && this._lastHandledResult !== r)
			this.result(r, a);
		this.state = this.net.state;
		this.ui.lastHUD = "";
		return r;
	}
	result(r, a) {
		this._lastHandledResult = r;
		if (!r || !this.ui) return;
		if (r.full) {
			this.ui.fullPack(r.target || a.target);
			return;
		}
		if (r.confirm) {
			if (r.action)
				this.ui.confirm("Commit this action?", r.message, () => {
					this.ui.hide();
					this.send(r.action);
				});
			else if (r.target) this.ui.entity(this.state.entities[r.target]);
			return;
		}
		if (!r.ok) this.ui.notice("Hold your hand", r.message);
		else if (r.waiting) this.ui.notice("Ready to descend", r.message);
		else if (a.type === "pickup" || a.type === "use")
			this.ui.notice(
				a.type === "pickup" ? "Object secured" : "Prepared",
				r.message,
			);
	}
	dev(action) {
		if (this.net.mode !== "solo") {
			this.ui.notice(
				"Read-only online",
				"Developer mutations are disabled in network expeditions.",
			);
			return;
		}
		const map = {
			floor: "jump",
			item: "spawn",
			invulnerability: "invulnerable",
		};
		const a = { ...action, type: map[action.type] || action.type };
		if (a.type === "invulnerable") a.value = action.enabled;
		const r = this.net.model.dev(a);
		this.net.state = this.net.model.state;
		this.onState(this.net.state);
		this.ui.notice(
			r.ok ? "Developer tool applied" : "Tool rejected",
			r.message,
		);
		this.ui.lastHUD = "";
	}
	devStep() {
		if (this.net.mode !== "solo") return;
		this.net.model.dev({ type: "step", ms: 1000 });
		this.onState(this.net.model.state);
	}
	resetTuning() {
		if (this.net.mode !== "solo") return;
		this._restoreTuning = true;
		for (const [k, v] of Object.entries(TUNING_KEYS))
			this.game.settings.set(k, DEFAULT_TUNING[v]);
		this._restoreTuning = false;
		this.net.model.setTuning({ ...DEFAULT_TUNING });
		this.onState(this.net.model.state);
		this.ui.dev();
	}
	startContent(content) {
		if (this.online) return;
		const check = validateContent(content);
		if (!check.ok) {
			this.ui.notice("Campaign rejected", check.errors.join("; "));
			return;
		}
		this.newSolo(false);
		this.net.model = new Model({
			content,
			seed: 1983,
			runId: "workshop-" + Date.now(),
		});
		this.net.model.state.content = structuredClone(content);
		this.net.model.state.modified = true;
		this.net.state = this.net.model.state;
		this.net._run = this.net.state.runId;
		this.net._emit();
		this.state = this.net.state;
		this.ui.hide();
	}
	download(name, text) {
		const blob = new Blob([text], { type: "application/json" }),
			url = URL.createObjectURL(blob),
			a = document.createElement("a");
		a.href = url;
		a.download = name;
		a.click();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
	}
	exportSave(diagnostic = false) {
		if (this.online || !this.net.allowSoloSave) {
			this.ui.notice(
				"Network expedition",
				"Network state does not become a solo continuation.",
			);
			return;
		}
		const save = this.net.model?.exportSave() || this._saved;
		if (!save) {
			this.ui.notice("Nothing to save", "Begin an expedition first.");
			return;
		}
		this.download(
			diagnostic ? "danger-state-replay.json" : "danger-expedition.json",
			JSON.stringify(
				diagnostic ? { ...save, replay: this._replay } : save,
				null,
				2,
			),
		);
	}
	pickJSON() {
		return new Promise((resolve) => {
			const f = document.createElement("input");
			f.type = "file";
			f.accept = ".json,application/json";
			let done = false;
			const finish = (x) => {
				if (done) return;
				done = true;
				resolve(x);
				f.remove();
			};
			f.onchange = async () => {
				try {
					if (!f.files?.[0]) return finish(null);
					if (f.files[0].size > 500000)
						return (
							this.ui.notice("Import rejected", "File exceeds 500 KB."),
							finish(null)
						);
					finish(JSON.parse(await f.files[0].text()));
				} catch (e) {
					this.ui.notice("Import rejected", e.message);
					finish(null);
				}
			};
			f.oncancel = () => finish(null);
			f.style.display = "none";
			document.body.append(f);
			f.click();
		});
	}
	async importSave() {
		const data = await this.pickJSON();
		if (!data) return;
		const m = new Model(data.content ? { content: data.content } : {}),
			r = m.load(data);
		if (!r.ok) {
			this.ui.notice("Import rejected", r.message);
			return;
		}
		this._saved = data;
		this.continueSolo();
		this.ui.notice("Expedition imported", "Your versioned save is restored.");
	}
	meaningful(type, event) {
		if (this.attract) {
			event?.preventDefault();
			event?.stopImmediatePropagation();
			this.stopAttract();
			return true;
		}
		this.lastActivity = performance.now();
		this.lastInput = type;
		if (this.game) this.game.input.lastDevice = type;
		if (event?.isTrusted && this.stage !== "ended") this.audio?.unlock();
		return false;
	}
	bindEvents() {
		const c = document.getElementById("screen");
		document.addEventListener(
			"keydown",
			(e) => {
				if (this.meaningful("keyboard", e)) return;
			},
			true,
		);
		document.addEventListener(
			"pointerdown",
			(e) => {
				this.meaningful(e.pointerType === "touch" ? "touch" : "mouse", e);
			},
			true,
		);
		document.addEventListener("wheel", (e) => this.meaningful("mouse", e), {
			capture: true,
			passive: false,
		});
		let mouse = { x: 0, y: 0 };
		document.addEventListener("pointermove", (e) => {
			if (e.pointerType !== "mouse") return;
			if (Math.hypot(e.clientX - mouse.x, e.clientY - mouse.y) > 5) {
				this.lastActivity = performance.now();
				this.lastInput = "mouse";
				mouse = { x: e.clientX, y: e.clientY };
				if (this.attract) {
					this.stopAttract();
					return;
				}
			}
			if (
				this.stage === "play" &&
				!this.ui.isOpen &&
				(document.pointerLockElement === c || e.buttons === 4)
			) {
				this.view.look(e.movementX || 0, e.movementY || 0);
			}
		});
		c.addEventListener("dblclick", (e) => {
			if (e.pointerType === "touch" || this.stage !== "play" || this.ui.isOpen)
				return;
			try {
				c.requestPointerLock?.()?.catch?.(() => {});
			} catch {}
		});
		c.addEventListener("contextmenu", (e) => e.preventDefault());
		document.addEventListener("visibilitychange", () => {
			this.hidden = document.hidden;
			if (this.net.mode === "solo") this.syncPause();
			if (this.hidden) this.audio?.stop();
		});
		document.addEventListener("pointerlockchange", () => {
			this.ui.lastHUD = "";
		});
		document.getElementById("ended-title").onclick = () => this.returnTitle();
		this.bindTouch(c);
		window.addEventListener("beforeunload", () => {
			this.saveCheckpoint();
			this.net.close();
			this.audio?.stop();
		});
	}
	bindTouch(c) {
		const fingers = new Map();
		let lastTap = 0,
			multi = false;
		c.addEventListener(
			"pointerdown",
			(e) => {
				if (
					e.pointerType !== "touch" ||
					this.stage !== "play" ||
					this.ui.isOpen
				)
					return;
				e.preventDefault();
				try {
					c.setPointerCapture(e.pointerId);
				} catch {}
				fingers.set(e.pointerId, {
					x: e.clientX,
					y: e.clientY,
					sx: e.clientX,
					sy: e.clientY,
					t: performance.now(),
					side: e.clientX < innerWidth * 0.48 ? "move" : "look",
				});
				multi = fingers.size > 1;
			},
			{ passive: false },
		);
		c.addEventListener(
			"pointermove",
			(e) => {
				const f = fingers.get(e.pointerId);
				if (!f) return;
				e.preventDefault();
				const dx = e.clientX - f.x,
					dy = e.clientY - f.y;
				f.x = e.clientX;
				f.y = e.clientY;
				if (f.side === "look") this.view.look(dx, dy);
				else if (
					performance.now() > (f.next || 0) &&
					Math.hypot(f.x - f.sx, f.y - f.sy) > 25
				) {
					this.moveRelative(
						Math.abs(f.x - f.sx) > Math.abs(f.y - f.sy)
							? f.x > f.sx
								? "right"
								: "left"
							: f.y > f.sy
								? "back"
								: "forward",
					);
					f.next = performance.now() + 320;
				}
			},
			{ passive: false },
		);
		const up = (e) => {
			const f = fingers.get(e.pointerId);
			if (!f) return;
			fingers.delete(e.pointerId);
			if (
				Math.hypot(f.x - f.sx, f.y - f.sy) < 20 &&
				performance.now() - f.t < 400
			) {
				if (multi) {
					if (!fingers.size) {
						multi = false;
						this.ui.map();
					}
				} else if (f.side === "look") {
					if (performance.now() - lastTap < 330) {
						this.ui.pack();
						lastTap = 0;
					} else {
						lastTap = performance.now();
						if (this.ui.contextEntity() || this.state?.combat)
							this.ui.contextAction();
					}
				}
			}
		};
		c.addEventListener("pointerup", up);
		c.addEventListener("pointercancel", (e) => fingers.delete(e.pointerId));
	}
	moveRelative(direction) {
		const p = this.player;
		if (!p) return;
		const d =
			(p.dir + ({ forward: 0, right: 1, back: 2, left: 3 }[direction] ?? 0)) %
			4;
		const [dx, dy] = [
			[0, -1],
			[1, 0],
			[0, 1],
			[-1, 0],
		][d];
		return this.send({ type: "move", dx, dy, epoch: this.state.epoch });
	}
	checkAttractPad() {
		const I = this.game?.input;
		if (!I || this.net.mode === "hub") return;
		const active =
			I.padPrev?.some(Boolean) ||
			Math.hypot(...(I.padMove || [0, 0])) > 0.25 ||
			Math.hypot(...(I.padAim || [0, 0])) > 0.25;
		if (active) {
			if (this.attract) {
				I.clear();
				this.stopAttract();
				this._consumePad = true;
			} else {
				this.lastActivity = performance.now();
				this.lastInput = "gamepad";
			}
		}
	}
	readInput(dt) {
		const I = this.game.input;
		if (this._consumePad) {
			this._consumePad = false;
			return;
		}
		if (this.ui.isOpen) return;
		if (
			this.state?.combat &&
			(I.pressed("actionLeft") || I.pressed("actionRight"))
		) {
			this.ui.cycleAction(I.pressed("actionLeft") ? -1 : 1);
			return;
		}
		for (const [act, fn] of [
			["pause", () => this.ui.pause()],
			["pack", () => this.ui.pack()],
			["map", () => this.ui.map()],
			["swap", () => this.send({ type: "swap" })],
			["rest", () => this.ui.rest()],
			["use", () => this.ui.useHand()],
			["inspect", () => this.ui.inspectEnemy()],
			["target", () => this.ui.cycleTarget()],
			["war", () => this.ui.choose("war")],
			["spirit", () => this.ui.choose("spirit")],
			["held", () => this.ui.choose("right")],
			["retreat", () => this.ui.retreat()],
		])
			if (I.pressed(act)) {
				fn();
				return;
			}
		if (I.pressed("turnLeft") || I.pressed("turnRight")) {
			this.view.resetLook();
			this.send({ type: "turn", delta: I.pressed("turnLeft") ? -1 : 1 });
			return;
		}
		const aim = I.padAim;
		if (aim && Math.hypot(...aim) > 0.15)
			this.view.look(aim[0] * dt * 320, aim[1] * dt * 240);
		if (this.game.real >= this.inputCooldown) {
			for (const [act, d] of [
				["forward", "forward"],
				["backward", "back"],
				["strafeLeft", "left"],
				["strafeRight", "right"],
			])
				if (I.pressed(act) || I.down(act)) {
					this.moveRelative(d);
					this.inputCooldown =
						this.game.real + 0.28 / (this.state?.tuning?.tempo || 1);
					return;
				}
		}
		if (I.pressed("guard") && this.state?.combat) {
			this.send({ type: "guard", channel: "both" });
			return;
		}
		if (I.pressed("attack")) {
			if (this.state?.combat || this.state?.phase === "preparation")
				this.ui.contextAction();
			else this.ui.interact();
			return;
		}
		if (I.pressed("interact")) {
			if (this.state?.combat) this.ui.contextAction();
			else this.ui.interact();
		}
		const dev = I.lastDevice;
		if (dev === "gamepad") this.lastInput = "gamepad";
	}
	update(dt) {
		if (this.attract) {
			this.attractStep(dt * 1000);
			this.view.update(dt);
			this.ui.update();
			return;
		}
		if (this.stage === "title") {
			if (!this.net.pc && performance.now() - this.lastActivity >= 10000)
				this.startAttract();
			this.view.update(dt);
			this.audio.update(null, this.game.settings, false);
			this.ui.update();
			return;
		}
		if (this.stage !== "play") {
			this.ui.update();
			return;
		}
		this.syncPause();
		this.state = this.net.state;
		if (!this.state) {
			this.view.update(dt);
			return;
		}
		if (this.net.running) this.readInput(dt);
		if (!this.net.paused) this.view.update(dt);
		this.audio.update(
			this.state,
			this.game.settings,
			this.hidden || this.net.paused || this.net.ended,
		);
		this.ui.update();
		if (this.state.phase !== this._lastPhase) {
			this._lastPhase = this.state.phase;
			if (this.state.phase === "victory" && !this.finishedDismissed)
				this.ui.victory();
			if (this.state.phase === "defeat") this.ui.defeat();
			if (this.state.phase === "preparation")
				this.ui.notice(
					"A seal breaks. The damage remains.",
					"A quiet beat: prepare, then face the next seal.",
				);
		}
		if (this.state.floor !== this._lastFloor) {
			this._lastFloor = this.state.floor;
			this.saveCheckpoint();
			if (this._lastFloor > 0)
				this.ui.notice(
					this.ui.content.floors[this._lastFloor].name,
					"The stair closes above you. A viable checkpoint is kept.",
				);
		}
	}
	startAttract() {
		if (this.net.mode === "hub" || this.net.pc || this.stage !== "title")
			return;
		this.attract = true;
		this.stage = "attract";
		this.attractModel = new Model({ seed: 8319, runId: "attract-isolated" });
		this.attractModel.dev({ type: "invulnerable", value: true });
		this.state = this.attractModel.state;
		this.attractTime = 0;
		this.attractCue = -1;
		this.ui.hide();
		document.getElementById("attract-banner").hidden = false;
		this.ui.hud.hidden = true;
	}
	attractStep(ms) {
		if (!this.attract) return;
		this.attractTime += ms;
		const phase = Math.floor(this.attractTime / 6000);
		if (phase !== this.attractCue) {
			this.attractCue = phase;
			const m = this.attractModel;
			if (phase === 0) {
				m.dev({ type: "encounter", target: "upper.watchman" });
			} else if (phase === 1) {
				this.ui.pack();
			} else if (phase === 2) {
				this.ui.hide();
				m.dev({ type: "jump", floor: 1 });
				m.dev({ type: "encounter", target: "spirit.sentinel" });
				m.state.players["0"].basicSpirit = true;
			} else if (phase === 3) {
				m.state.combat = null;
				m.state.phase = "explore";
				m.dev({ type: "teleport", x: 4, y: 9 });
				m.command("0", {
					type: "interact",
					target: "spirit.gate",
					choice: "spirit",
				});
			} else if (phase === 4) {
				m.dev({ type: "teleport", x: 3, y: 7 });
				m.command("0", { type: "interact", target: "spirit.secret" });
			} else if (phase === 5) {
				m.dev({ type: "jump", floor: 2 });
				m.dev({ type: "encounter", target: "guardian.warden" });
			} else if (phase >= 6) {
				this.attractTime = 0;
				this.attractCue = -1;
				this.attractModel = new Model({
					seed: 8319,
					runId: "attract-isolated",
				});
				this.attractModel.dev({ type: "invulnerable", value: true });
			}
			const s = this.attractModel.state,
				p = s.players["0"],
				e = s.combat?.enemies.map((id) => s.entities[id]).find((e) => !e.dead);
			if (e) {
				const dx = e.x - p.x,
					dy = e.y - p.y;
				p.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy > 0 ? 2 : 0;
			}
		}
		const m = this.attractModel;
		m.advance(ms);
		this.state = m.state;
		if (this.state.combat && this.attractTime % 1800 < ms) {
			const p = this.state.players["0"],
				e = this.state.entities[this.state.combat.enemies[0]];
			if (this.state.phase === "preparation")
				m.command("0", { type: "resume" });
			else
				m.command("0", {
					type: "attack",
					target: e.id,
					source: this.attractCue >= 2 ? "spirit" : "right",
				});
		}
		this.audio.update(this.state, this.game.settings, false);
	}
	stopAttract(toTitle = true) {
		if (!this.attract) return;
		this.attract = false;
		this.attractModel = null;
		this.state = null;
		this.stage = "title";
		this.ui?.hide();
		document.getElementById("attract-banner").hidden = true;
		this.lastActivity = performance.now();
		this.game?.input.clear();
		if (toTitle) this.ui.title();
	}
	dispose() {
		this.net.close();
		this.audio?.stop();
		this.view?.dispose();
		this.game?.dispose();
	}
}
const app = new Expedition();
globalThis.__app = app;
app.boot().catch((error) => {
	console.error(error);
	const b = document.getElementById("boot");
	b.hidden = false;
	b.innerHTML = "";
	const h = document.createElement("h2");
	h.textContent = "The lantern could not be lit.";
	document.getElementById("my3d2dge-error")?.remove();
	const p = document.createElement("p");
	p.textContent =
		"This browser needs WebGL 2 or WebGPU. Try current Chromium or Safari. " +
		String(error.message || error);
	const retry = document.createElement("button");
	retry.textContent = "Retry loading";
	retry.onclick = () => location.reload();
	b.append(h, p, retry);
	globalThis.__bootError = String(error.stack || error);
	if (globalThis.AIHub?.active)
		AIHub.fail("Renderer unavailable: " + error.message);
});
