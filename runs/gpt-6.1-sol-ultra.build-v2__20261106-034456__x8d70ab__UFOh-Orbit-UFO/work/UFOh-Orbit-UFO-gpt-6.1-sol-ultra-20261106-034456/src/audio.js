import { MUSIC } from "./data/music.js";

// Each cue is original native chip-synth data. Layers are short and finite;
// decorative audio owns no simulation RNG and never controls world timing.
export const CUES = Object.freeze({
	shot: [
		{ wave: "pulse12", freq: 1046, to: 210, dur: 0.11, vol: 0.13 },
		{ wave: "triangle", freq: 140, to: 70, dur: 0.055, vol: 0.1 },
	],
	shield: [
		{ wave: "sine", freq: 760, to: 110, dur: 0.19, vol: 0.2 },
		{ wave: "noise", freq: 1800, to: 180, dur: 0.14, vol: 0.09 },
	],
	charge: { wave: "sine", freq: 220, to: 430, dur: 0.09, vol: 0.055 },
	ready: [
		{ wave: "triangle", freq: 659, to: 880, dur: 0.11, vol: 0.15 },
		{ wave: "sine", freq: 1318, delay: 0.09, dur: 0.2, vol: 0.13 },
	],
	damage: [
		{ wave: "noise", freq: 450, to: 60, dur: 0.3, vol: 0.22 },
		{ wave: "saw", freq: 130, to: 36, dur: 0.24, vol: 0.12 },
	],
	drifter: [
		{ wave: "noise", freq: 1600, to: 100, dur: 0.17, vol: 0.15 },
		{ wave: "triangle", freq: 200, to: 44, dur: 0.14, vol: 0.12 },
	],
	hunter: [
		{ wave: "noise", freq: 2200, to: 90, dur: 0.28, vol: 0.19 },
		{ wave: "saw", freq: 270, to: 55, dur: 0.2, vol: 0.1 },
	],
	gunship: [
		{ wave: "noise", freq: 3400, to: 50, dur: 0.4, vol: 0.19 },
		{ wave: "sine", freq: 100, to: 26, dur: 0.34, vol: 0.24 },
	],
	merge: [
		{ wave: "sine", freq: 220, to: 880, dur: 0.45, vol: 0.11 },
		{ wave: "pulse12", freq: 277, to: 1108, delay: 0.05, dur: 0.4, vol: 0.055 },
	],
	hunterCharge: {
		wave: "saw",
		freq: 130,
		to: 390,
		dur: 0.32,
		vol: 0.08,
		vib: [20, 0.025],
	},
	warning: [
		{ wave: "pulse12", freq: 466, dur: 0.13, vol: 0.1 },
		{ wave: "pulse12", freq: 466, delay: 0.2, dur: 0.13, vol: 0.1 },
	],
	missile: [
		{ wave: "noise", freq: 800, to: 4200, dur: 0.14, vol: 0.08 },
		{ wave: "triangle", freq: 190, to: 90, dur: 0.1, vol: 0.1 },
	],
	chain: [
		{
			wave: "triangle",
			freq: 440,
			dur: 0.1,
			vol: 0.13,
			arp: [0, 4, 7, 12],
			step: 0.025,
		},
		{ wave: "noise", freq: 1800, to: 240, dur: 0.1, vol: 0.07 },
	],
	rescue: [
		{
			wave: "triangle",
			freq: 392,
			dur: 0.36,
			vol: 0.18,
			arp: [0, 4, 7, 12],
			step: 0.085,
		},
		{ wave: "sine", freq: 784, delay: 0.18, dur: 0.32, vol: 0.11 },
	],
	phase: [
		{ wave: "sine", freq: 65, to: 130, dur: 0.6, vol: 0.22 },
		{ wave: "pulse12", freq: 195, to: 390, delay: 0.12, dur: 0.35, vol: 0.1 },
	],
	victory: [
		{
			wave: "triangle",
			freq: 523,
			dur: 0.65,
			vol: 0.19,
			arp: [0, 4, 7, 12, 16],
			step: 0.12,
		},
		{ wave: "sine", freq: 130, to: 261, dur: 0.55, vol: 0.16 },
	],
	defeat: [
		{ wave: "saw", freq: 220, to: 42, dur: 0.6, vol: 0.11 },
		{ wave: "noise", freq: 700, to: 35, dur: 0.48, vol: 0.15 },
	],
	focus: { wave: "triangle", freq: 580, to: 700, dur: 0.04, vol: 0.07 },
	confirm: {
		wave: "triangle",
		freq: 660,
		dur: 0.13,
		vol: 0.11,
		arp: [0, 7],
		step: 0.055,
	},
	cancel: { wave: "triangle", freq: 440, to: 220, dur: 0.11, vol: 0.09 },
});

const ALIASES = Object.freeze({
	fire: "shot",
	shieldHit: "shield",
	shieldSpent: "shield",
	shieldConsume: "shield",
	"shield-ready": "ready",
	shieldReady: "ready",
	recharge: "ready",
	hit: "damage",
	fusion: "hunterCharge",
	"fusion-warning": "merge",
	"shield-spent": "shield",
	"hull-hit": "damage",
	"gunship-warning": "warning",
	"boss-arrival": "phase",
	"boss-phase": "phase",
	"boss-warning": "warning",
	"boss-hit": "hunter",
	"boss-break": "gunship",
	"boss-defeated": "gunship",
	ricochet: "cancel",
	wreck: "damage",
	fusionStart: "merge",
	fusionComplete: "hunterCharge",
	lane: "warning",
	gunshipWarning: "warning",
	volley: "missile",
	chainKill: "chain",
	bossPhase: "phase",
	revive: "rescue",
	death: "defeat",
});
const bounded = (value, fallback) =>
	Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;

export class OrbitAudio {
	constructor(game) {
		this.game = game;
		this.native = game.audio;
		this.settings = {
			master: 0.65,
			music: 0.1,
			sfx: 0.8,
			voice: 0.55,
			muted: false,
		};
		this.unlocked = false;
		this.paused = false;
		this.stopped = false;
		this.scene = "title";
		this.lastEvent = 0;
		this.played = 0;
		this.gibberishCount = 0;
		this.handles = [];
		this.voices = new Set();
		this.lastCue = new Map();
		this.elapsed = 0;
		this.subtitle = "";
		this.subtitleUntil = 0;
		this.rechargeAt = null;
		for (const [name, voice] of Object.entries(CUES))
			this.native.define(`orbit:${name}`, voice);
		this.setSettings(this.settings);
	}

	unlock() {
		if (this.stopped) this.stopped = false;
		if (this.game.headless) return false;
		const bus = this.native.bus("sfx");
		if (!bus || !this.native.ctx) return false;
		this.unlocked = true;
		if (this.native.ctx.state === "suspended")
			this.native.ctx.resume().catch(() => {});
		this.setSettings(this.settings);
		if (!this.paused) this.startSong();
		return true;
	}

	setSettings(settings = {}) {
		for (const k of ["master", "music", "sfx", "voice"]) {
			if (Object.hasOwn(settings, k))
				this.settings[k] = bounded(settings[k], this.settings[k]);
		}
		if (Object.hasOwn(settings, "muted"))
			this.settings.muted = !!settings.muted;
		const a = this.native,
			s = this.settings;
		a.volume = s.master;
		a.musicVolume = s.music;
		a.sfxVolume = s.sfx;
		a.voiceVolume = s.voice;
		a.muted = s.muted;
		a.applyVolume();
	}

	setScene(scene) {
		if (!MUSIC[scene]) scene = "mission";
		const changed = this.scene !== scene;
		this.scene = scene;
		this.stopped = false;
		if (changed) {
			this.cancelVoices();
			if (this.unlocked && !this.paused) this.startSong();
		}
	}

	startSong() {
		if (!this.unlocked || this.paused || this.stopped) return;
		this.native.music(MUSIC[this.scene], { sync: true, fade: 0.25 });
	}

	cue(name, opts = {}) {
		name = ALIASES[name] || name;
		if (!CUES[name] || !this.unlocked || this.paused || this.stopped)
			return false;
		const gap = name === "chain" ? 0.075 : name === "drifter" ? 0.035 : 0.025;
		if (this.elapsed - (this.lastCue.get(name) ?? -100) < gap) return false;
		this.lastCue.set(name, this.elapsed);
		const pan = Number.isFinite(opts.x)
			? Math.max(-0.7, Math.min(0.7, (opts.x / 960 - 0.5) * 1.4))
			: 0;
		const depth = Math.max(1, Math.min(8, opts.depth || 1));
		const pitch = name === "chain" ? 2 ** ((depth - 1) / 12) : 1;
		const handle = this.native.sfx(`orbit:${name}`, { pan, pitch, vary: 0 });
		this.handles.push({ handle, until: this.elapsed + 1.4 });
		this.played++;
		return true;
	}

	handle(events = []) {
		for (const event of events) {
			if (!Number.isFinite(event.id) || event.id <= this.lastEvent) continue;
			this.lastEvent = event.id;
			let type = ALIASES[event.type] || event.type;
			if (type === "kill" || type === "destroy")
				type = event.enemyType || event.enemy || "drifter";
			if (type === "boss") type = "gunship";
			this.cue(type, event);
			if (type === "shot" || type === "shield")
				this.rechargeAt = this.elapsed + 0.65;
			if (type === "ready" || type === "defeat") this.rechargeAt = null;
			if (event.type === "launch") this.say("CONFIDENCE AT MAXIMUM!", 0);
			if (type === "rescue") this.say("BACK IN ORBIT!", 2);
			if (type === "phase") this.say("COMMAND SIGNAL!", 3);
			if (type === "victory") this.say("SPACE IS OURS!", 1);
		}
	}

	// Short original formant babble. The readable line is the meaning; this is
	// deliberately not sampled speech and does not imitate a human voice.
	say(subtitle, variation = 0) {
		this.subtitle = String(subtitle);
		this.subtitleUntil = this.elapsed + 2;
		if (!this.unlocked || this.paused || this.stopped || this.settings.muted)
			return;
		const c = this.native.ctx,
			bus = this.native.bus("voice");
		if (!c || !bus || c.state !== "running") return;
		const syllables = [1, 1.26, 0.94, 1.5, 1.12];
		for (let i = 0; i < syllables.length; i++) {
			const at = c.currentTime + 0.012 + i * 0.068,
				dur = 0.058 + (i % 2) * 0.012;
			const src = c.createOscillator(),
				gain = c.createGain(),
				filter = c.createBiquadFilter();
			src.type = "sawtooth";
			src.frequency.setValueAtTime((175 + variation * 24) * syllables[i], at);
			src.frequency.exponentialRampToValueAtTime(
				(180 + variation * 24) * syllables[i] * (i % 2 ? 0.8 : 1.1),
				at + dur,
			);
			filter.type = "bandpass";
			filter.Q.value = 5;
			filter.frequency.setValueAtTime(
				[900, 1350, 1900, 1100, 1700][(i + variation) % 5],
				at,
			);
			gain.gain.setValueAtTime(0, at);
			gain.gain.linearRampToValueAtTime(0.045, at + 0.006);
			gain.gain.linearRampToValueAtTime(0, at + dur);
			src.connect(filter);
			filter.connect(gain);
			gain.connect(bus);
			this.voices.add(src);
			src.onended = () => {
				this.voices.delete(src);
				src.disconnect();
				filter.disconnect();
				gain.disconnect();
			};
			src.start(at);
			src.stop(at + dur + 0.005);
		}
		this.gibberishCount++;
	}

	tick(dt) {
		this.elapsed += Math.max(0, Number.isFinite(dt) ? dt : 0);
		this.handles = this.handles.filter((x) => x.until > this.elapsed);
		if (this.rechargeAt !== null && this.elapsed >= this.rechargeAt) {
			this.rechargeAt = null;
			this.cue("charge");
		}
		if (this.subtitleUntil <= this.elapsed) this.subtitle = "";
	}

	pause(on = true) {
		on = !!on;
		if (on === this.paused) return;
		this.paused = on;
		if (on) {
			this.native.music(null);
			this.cancelVoices();
			for (const x of this.handles) x.handle.stop(0);
			this.handles.length = 0;
		} else this.startSong();
	}

	cancelVoices() {
		for (const src of this.voices) {
			try {
				src.stop();
			} catch {}
		}
		this.voices.clear();
	}

	stop() {
		this.stopped = true;
		this.native.music(null);
		this.cancelVoices();
		for (const x of this.handles) x.handle.stop(0);
		this.handles.length = 0;
		this.subtitle = "";
		this.rechargeAt = null;
	}

	resetEvents() {
		this.lastEvent = 0;
		this.rechargeAt = null;
		this.lastCue.clear();
	}

	debug() {
		const a = this.native;
		return {
			unlocked: this.unlocked,
			paused: this.paused,
			stopped: this.stopped,
			scene: this.scene,
			played: this.played,
			lastEvent: this.lastEvent,
			activeVoices: this.voices.size,
			pendingEffects: this.handles.length,
			gibberishCount: this.gibberishCount,
			settings: { ...this.settings },
			contextState: a.ctx?.state || "locked",
			buses: a.ctx
				? {
						master: a._master.gain.value,
						music: a._musBus.gain.value,
						sfx: a._sfxBus.gain.value,
						voice: a._voiceBus.gain.value,
					}
				: null,
		};
	}
}

// Test-only offline rendering of the exact native cue definitions. A detached
// native synthesizer prototype avoids disturbing the live engine or audio bus.
export async function renderAudioProbe(
	native,
	name,
	{ muted = false, volume = 0.65 } = {},
) {
	const Offline =
		globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
	if (!Offline)
		return { available: false, reason: "OfflineAudioContext unavailable" };
	if (!CUES[name]) throw new Error(`Unknown probe cue: ${name}`);
	const c = new Offline(1, 44100, 44100),
		bus = c.createGain();
	bus.gain.value = muted ? 0 : volume;
	bus.connect(c.destination);
	const a = Object.create(Object.getPrototypeOf(native));
	a.ctx = c;
	a._waves = {};
	a._ins = {};
	let seed = 147;
	a._rnd = () => {
		seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
		return seed / 4294967296;
	};
	a._noise = c.createBuffer(1, 44100, 44100);
	const noise = a._noise.getChannelData(0);
	for (let i = 0; i < noise.length; i++) noise[i] = a._rnd() * 2 - 1;
	const voices = Array.isArray(CUES[name]) ? CUES[name] : [CUES[name]];
	for (const voice of voices) a._voice(voice, bus, 0.01, 1, false);
	const buffer = await c.startRendering(),
		data = buffer.getChannelData(0);
	let sum = 0,
		peak = 0,
		finite = true,
		zeroCrossings = 0;
	for (let i = 0; i < data.length; i++) {
		const v = data[i];
		finite &&= Number.isFinite(v);
		sum += v * v;
		peak = Math.max(peak, Math.abs(v));
		if (i && v * data[i - 1] < 0) zeroCrossings++;
	}
	return {
		available: true,
		name,
		finite,
		peak,
		rms: Math.sqrt(sum / data.length),
		zeroCrossings,
		samples: data.length,
	};
}
