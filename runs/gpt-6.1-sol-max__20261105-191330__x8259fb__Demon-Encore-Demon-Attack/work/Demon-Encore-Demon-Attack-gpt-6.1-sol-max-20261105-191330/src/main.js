import { AudioEngine } from "./audio.js";
import { DEFAULTS, Game, initPhysics, readSnapshot, WAVES } from "./game.js";
import { Input } from "./input.js";
import { Network } from "./network.js";
import { report, UI } from "./ui.js";
import { View } from "./view.js";

const $ = (id) => document.getElementById(id);
const SETTINGS = {
	music: 10,
	sfx: 70,
	voice: 45,
	glyphs: "ps",
	effects: matchMedia("(prefers-reduced-motion:reduce)").matches
		? "low"
		: "full",
	shake: !matchMedia("(prefers-reduced-motion:reduce)").matches,
};

class App {
	constructor() {
		this.settings = { ...SETTINGS };
		this.best = 0;
		try {
			const s = JSON.parse(localStorage.getItem("demon-encore-v1") || "null");
			if (s) {
				Object.assign(this.settings, s.settings);
				this.best = Number(s.best) || 0;
			}
		} catch {}
		this.difficulty = "arcade";
		this.seed = crypto.getRandomValues(new Uint32Array(1))[0];
		this.menu = "title";
		this.started = false;
		this.attract = false;
		this.game = null;
		this.accumulator = 0;
		this.last = performance.now();
		this.lastSeq = 0;
		this.attractClock = 0;
		this.newBest = false;
		this.assisted = false;
		this.ready = false;
		this.view = new View($("stage"), this.settings);
		this.audio = new AudioEngine(this.settings);
		this.ui = new UI(this);
		this.input = new Input(this);
		this.net = new Network(this);
		window.addEventListener("resize", () => {
			this.view.resize();
			if (this.game && this.net.host) this.game.width = this.view.width;
		});
		window.addEventListener(
			"pointerdown",
			(e) => {
				this.input.activity(e.pointerType === "touch" ? "touch" : "keyboard");
				this.audio.unlock();
			},
			{ capture: true },
		);
	}
	async init() {
		const networking = this.net.init();
		try {
			await networking;
			if (this.net.info?.server) {
				await initPhysics();
				this.view.backend = "Headless authority";
			} else await Promise.all([initPhysics(), this.view.init()]);
			$("renderer-note").textContent =
				this.view.backend.toUpperCase() + " / R180";
			this.ready = true;
			this.input.lastActivity = performance.now();
			$("boot").hidden = true;
			if (this.net.active) {
				this.ui.show("waiting");
				this.net.ready();
			} else this.ui.show("title");
			this.last = performance.now();
			requestAnimationFrame((t) => this.frame(t));
		} catch (error) {
			console.error(error);
			$("bootStatus").textContent =
				"This browser could not start the renderer. Try a browser with WebGPU or WebGL 2. " +
				error.message;
			$("boot").querySelector("h2").textContent = "THE SKY WILL HAVE TO WAIT";
			if (this.net.hub.active) this.net.hub.fail(error.message);
			window.__DE.error = error.message;
		}
	}
	save() {
		try {
			localStorage.setItem(
				"demon-encore-v1",
				JSON.stringify({ settings: this.settings, best: this.best }),
			);
		} catch {}
	}
	localPlayer() {
		return (
			this.game?.players.find((p) => p.seat === this.net.me) ||
			this.game?.players[0]
		);
	}
	begin(count = 1, mode = "solo", attract = false) {
		this.game?.dispose?.();
		this.view.clear();
		this.lastSeq = 0;
		this.accumulator = 0;
		this.newBest = false;
		this.assisted = false;
		this.attract = attract;
		this.started = true;
		this.mode = mode;
		this.attractClock = 0;
		this.input.clear();
		const ids =
			mode === "hub"
				? this.net.players.map((p) => p.id)
				: Array.from({ length: count }, (_, i) => i);
		this.game = new Game({
			seed: this.seed,
			count: ids.length,
			ids,
			difficulty: this.difficulty,
			attract,
			width: this.view.width,
			emit: (e) => this.event(e),
		});
		this.ui.show(null);
		$("hud").hidden = false;
		$("attract").hidden = !attract;
		if (!attract)
			this.ui.banner(
				"READY, PILOT?",
				"HOLD THE LINE.",
				this.input.prompt("move") +
					"  MOVE  ·  " +
					this.input.prompt("fire") +
					"  FIRE",
				false,
				2.5,
			);
	}
	beginHub() {
		this.begin(this.net.players.length, "hub");
	}
	beginRemote() {
		this.game?.dispose?.();
		this.game = null;
		this.view.clear();
		this.started = true;
		this.mode = this.net.kind;
		this.attract = false;
		this.lastSeq = 0;
		this.ui.show(null);
		this.ui.banner(
			"FORMATION LINKED",
			"TAKE YOUR WING.",
			this.input.prompt("fire") + "  FIRE",
			false,
			2.5,
		);
	}
	receive(snapshot) {
		this.game = readSnapshot(snapshot);
		for (const e of snapshot.events || [])
			if (e.seq > this.lastSeq) {
				this.event(e);
				this.lastSeq = e.seq;
			}
		if (snapshot.result && this.menu !== "result" && !this.net.ended)
			this.showResult(snapshot.result);
	}
	event(e) {
		this.view.effect(e);
		if (
			e.type !== "fire" ||
			performance.now() - (this.lastFireSound || 0) > 65
		) {
			this.audio.play(e.type);
			if (e.type === "fire") this.lastFireSound = performance.now();
		}
		if (e.type === "wave") {
			this.ui.banner(
				"ENCOUNTER " + String(e.wave + 1).padStart(2, "0") + " / 07",
				e.name,
				e.subtitle,
				e.wave === 6,
			);
			this.audio.gibberish();
		}
		if (e.type === "clear")
			this.ui.banner(
				"ENCOUNTER CLEARED",
				"NICE LITTLE MESS.",
				"+" + e.bonus + " CLEAR BONUS",
				false,
				2.4,
			);
		if (e.type === "bossPhase") {
			this.ui.banner(
				"THE HEADLINER",
				e.phase === 3 ? "FINAL VERSE." : "SECOND VERSE.",
				"The crown is cracking. Keep firing.",
				true,
				1.6,
			);
			this.audio.gibberish();
		}
		if (e.type === "kill") this.ui.float(e);
		if (e.type === "split" && this.game?.stats?.splits === 1 && !this.attract)
			this.toast("THEY SPLIT. FINISH THE HATCHLINGS.");
		if (e.type === "pickup") {
			this.toast(
				e.kind === "repair"
					? "HULL REPAIRED"
					: e.kind === "rapid"
						? "RAPID · 14 SECONDS OF BAD MANNERS"
						: "PRISM · THREE WAYS TO SAY GOODBYE",
			);
			this.audio.gibberish("victory");
		}
		if (e.type === "encore") {
			$("flash").classList.add("on");
			setTimeout(() => $("flash").classList.remove("on"), 120);
			this.toast("ENCORE!");
		}
		if (e.type === "hurt") this.audio.gibberish("hurt");
		if (e.type === "result" && !this.attract) this.showResult(e);
	}
	showResult(result) {
		if (this.net.ended) return;
		if (this.attract) {
			this.begin(1, "solo", true);
			return;
		}
		if (!this.game) return;
		this.newBest =
			result.score > this.best && !this.assisted && !this.net.hub.active;
		if (this.newBest) {
			this.best = result.score;
			this.save();
		}
		this.ui.result(result);
		this.audio.gibberish(result.won ? "victory" : "hurt");
		if (this.net.active && this.net.host) this.net.finish(result.won);
	}
	pause() {
		if (
			!this.started ||
			this.attract ||
			this.net.ended ||
			this.menu === "result"
		)
			return;
		this.input.clear();
		this.ui.show("pause");
		this.audio.play("menu");
	}
	back() {
		if (this.attract) {
			this.exitAttract();
			return;
		}
		if (!this.menu) {
			this.pause();
			return;
		}
		if (
			this.menu === "title" ||
			this.menu === "waiting" ||
			this.menu === "hubEnd"
		)
			return;
		if (this.menu === "pause") {
			this.action("resume");
			return;
		}
		if (this.menu === "result") return;
		if (this.menu === "dev") {
			this.ui.show("pause");
			return;
		}
		if (["linkHost", "linkJoin"].includes(this.menu)) {
			this.action("cancelLink");
			return;
		}
		const back = this.ui.previous || "title";
		this.ui.show(back);
	}
	async action(action) {
		this.input.lastActivity = performance.now();
		if (this.attract) {
			this.exitAttract();
			return;
		}
		if (this.net.ended) return;
		this.audio.play("confirm");
		if (action === "solo") {
			this.ui.show("difficulty", "title");
			return;
		}
		if (action.startsWith("diff:")) {
			this.difficulty = action.slice(5);
			this.ui.show("difficulty", "title");
			const b = this.ui.buttons().find((e) => e.dataset.action === action);
			if (b) this.ui.setFocus(b, false);
			return;
		}
		if (action === "launch") {
			this.net.closePeer();
			this.net.me = 0;
			this.seed = crypto.getRandomValues(new Uint32Array(1))[0];
			this.begin();
			return;
		}
		if (action === "coop") {
			this.ui.show("coop", "title");
			return;
		}
		if (action === "couch") {
			this.net.closePeer();
			this.net.me = 0;
			this.seed = crypto.getRandomValues(new Uint32Array(1))[0];
			this.begin(2, "couch");
			return;
		}
		if (action === "pause") {
			if (this.menu === "dev") this.ui.show("pause");
			else this.pause();
			return;
		}
		if (action === "resume") {
			this.input.clear();
			this.ui.show(null);
			return;
		}
		if (action === "abandon") {
			if (this.net.hub.active) return;
			this.hangar();
			return;
		}
		if (action === "retry") {
			if (this.net.active) return;
			this.seed = crypto.getRandomValues(new Uint32Array(1))[0];
			this.begin(this.mode === "couch" ? 2 : 1, this.mode);
			return;
		}
		if (action === "title") {
			this.ui.show("title");
			return;
		}
		if (action === "back") {
			this.back();
			return;
		}
		if (["settings", "controls", "about"].includes(action)) {
			this.ui.show(action, this.started ? "pause" : "title");
			return;
		}
		if (action === "resetSettings") {
			Object.assign(this.settings, SETTINGS);
			this.save();
			this.audio.apply();
			this.ui.show("settings", this.started ? "pause" : "title");
			return;
		}
		if (action.startsWith("tab:")) {
			this.ui.creditTab = action.slice(4);
			this.ui.show("about", this.started ? "pause" : "title");
			return;
		}
		if (action === "dev") {
			if (!this.net.active && this.game?.tuning) {
				this.assisted = true;
				this.ui.show("dev", "pause");
			}
			return;
		}
		if (action === "resetTuning") {
			Object.assign(this.game.tuning, DEFAULTS);
			this.ui.show("dev", "pause");
			return;
		}
		if (action === "nextWave") {
			this.game.skipWave();
			this.toast("ENCOUNTER ADVANCED");
			return;
		}
		if (action === "charge") {
			for (const p of this.game.players) p.charge = 100;
			this.toast("ENCORE CHARGED");
			return;
		}
		if (action === "drops") {
			for (const [i, k] of ["repair", "rapid", "prism"].entries())
				this.game.drop(k, (i - 1) * 2, -2);
			this.toast("PICKUPS DEPLOYED");
			return;
		}
		if (action === "nova") {
			const p = this.localPlayer();
			if (p) {
				if (this.net.host) this.game.encore(p);
				else this.net.send({ k: "i", n: true, f: true, m: 0 }, true);
			}
			return;
		}
		if (action === "link") {
			this.ui.show("link", "coop");
			return;
		}
		if (action === "joinLink") {
			this.ui.show("linkJoin", "link");
			return;
		}
		if (action === "cancelLink") {
			this.net.closePeer();
			this.ui.show("link", "coop");
			return;
		}
		if (action === "offer") {
			this.ui.show("linkHost", "link");
			try {
				const code = await this.net.offer();
				if (this.menu === "linkHost") {
					$("link-out").value = code;
					$("link-status").textContent =
						"Invitation ready. Send it to your wingmate.";
				}
			} catch (e) {
				this.linkError(e);
			}
			return;
		}
		if (action === "answerLink") {
			const code = $("link-in").value;
			this.linkBusy(true);
			try {
				const out = await this.net.answer(code);
				if (this.menu === "linkJoin") {
					$("link-out").value = out;
					$("link-status").textContent =
						"Reply ready. Send it to the host. Leave this page open.";
				}
			} catch (e) {
				this.linkError(e);
			}
			this.linkBusy(false);
			return;
		}
		if (action === "acceptLink") {
			try {
				await this.net.accept($("link-in").value);
				if ($("link-status"))
					$("link-status").textContent = "Connecting the formation…";
			} catch (e) {
				this.linkError(e);
			}
			return;
		}
		if (action === "copyCode") {
			const text = $("link-out");
			if (!text?.value) {
				this.toast("The capsule is still being built.");
				return;
			}
			try {
				await navigator.clipboard.writeText(text.value);
				this.toast("CAPSULE COPIED");
			} catch {
				text.focus();
				text.select();
				document.execCommand("copy");
				this.toast("CAPSULE SELECTED · COPY TO SEND");
			}
			return;
		}
	}
	linkBusy(busy) {
		const b = this.ui.overlay.querySelector('[data-action="answerLink"]');
		if (b) b.disabled = busy;
		if (busy && $("link-status"))
			$("link-status").textContent = "Building the reply…";
	}
	linkError(e) {
		if ($("link-status")) $("link-status").textContent = e.message;
		this.toast(e.message);
	}
	toast(s) {
		this.ui.toast(s);
	}
	hangar() {
		this.net.closePeer();
		this.game?.dispose?.();
		this.game = null;
		this.view.clear();
		this.started = false;
		this.attract = false;
		this.net.me = 0;
		this.ui.show("title");
		$("banner").classList.remove("show");
		this.input.lastActivity = performance.now();
		this.input.clear();
	}
	startAttract() {
		if (this.started || this.net.active) return;
		this.begin(1, "solo", true);
		this.game.startWave(0);
		this.attractClock = 0;
	}
	exitAttract() {
		this.hangar();
	}
	hubEnd(reason) {
		this.started = false;
		this.input.clear();
		this.audio.stop();
		this.ui.show("hubEnd");
		$("hud").hidden = true;
		$("banner").classList.remove("show");
		this.endReason = reason;
	}
	frame(now) {
		const dt = Math.min(0.1, Math.max(0.001, (now - this.last) / 1000));
		this.last = now;
		if (!this.net.info?.server) this.input.update(now);
		if (!this.net.ended) {
			const local = this.net.info?.server ? {} : this.input.read(0);
			this.net.tick(dt, local);
			if (
				!this.started &&
				!this.net.active &&
				!["linkHost", "linkJoin"].includes(this.menu) &&
				now - this.input.lastActivity >= 10000
			)
				this.startAttract();
			const running =
				this.started &&
				this.game &&
				this.net.host &&
				(!this.menu || this.net.active) &&
				!this.game.result;
			if (running && !this.manual) {
				const inputs = { ...this.net.inputs };
				if (!this.net.info?.server) inputs[this.net.me] = local;
				if (this.mode === "couch") inputs[1] = this.input.read(1);
				this.accumulator += dt;
				let stepped = false;
				while (this.accumulator >= 1 / 60) {
					this.game.step(1 / 60, inputs);
					this.accumulator -= 1 / 60;
					stepped = true;
				}
				if (stepped) {
					this.input.consume(0);
					if (this.mode === "couch") this.input.consume(1);
				}
				if (this.attract) {
					this.attractClock += dt;
					if (this.attractClock > 13) {
						this.attractClock = 0;
						if (this.game.wave < 6) this.game.startWave(this.game.wave + 1);
						else {
							this.begin(1, "solo", true);
							this.game.startWave(0);
						}
					}
					if (this.game.result) {
						this.begin(1, "solo", true);
						this.game.startWave(0);
					}
				}
			}
		}
		const title = !this.started && this.menu !== "hubEnd";
		if (!this.net.info?.server)
			this.view.render(
				this.game,
				dt,
				title,
				this.game?.tuning?.hitboxes || false,
			);
		this.ui.tick(now);
		this.frames = (this.frames || 0) + 1;
		requestAnimationFrame((t) => this.frame(t));
	}
}
const app = new App();
window.__DE = {
	app,
	Game,
	readSnapshot,
	WAVES,
	DEFAULTS,
	report,
	get ready() {
		return app.ready;
	},
	get game() {
		return app.game;
	},
	get net() {
		return app.net;
	},
	get state() {
		return {
			ready: app.ready,
			menu: app.menu,
			started: app.started,
			attract: app.attract,
			backend: app.view.backend,
			frames: app.frames || 0,
			score: app.game?.score,
			wave: app.game?.wave,
			phase: app.game?.phase,
			physics: app.game?.world?.bodies.len(),
			audio: app.audio.levels(),
			settings: { ...app.settings },
			sent: app.net.sent,
			received: app.net.received,
		};
	},
	simulate(seconds, inputs = {}) {
		if (!app.game?.step) throw new Error("No authoritative game to simulate.");
		for (let i = 0; i < Math.ceil(seconds * 60) && !app.game.result; i++)
			app.game.step(1 / 60, inputs);
		return app.game.snapshot();
	},
};
app.init();
