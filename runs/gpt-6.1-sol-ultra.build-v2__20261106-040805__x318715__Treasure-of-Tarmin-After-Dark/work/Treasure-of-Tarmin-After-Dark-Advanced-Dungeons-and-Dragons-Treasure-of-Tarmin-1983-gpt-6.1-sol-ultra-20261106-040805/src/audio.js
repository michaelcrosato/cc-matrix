// Every audible source is a Web Audio oscillator or deterministic synthesized noise.
// The native engine provides the sequencer, envelopes, effects mixer and pause clock.
const clamp = (v) => Math.max(0, Math.min(1, Number(v)));
const SFX = {
	step: {
		wave: "noise",
		freq: 850,
		to: 260,
		dur: 0.075,
		vol: 0.12,
		filter: "lowpass",
	},
	turn: { wave: "noise", freq: 1300, to: 600, dur: 0.045, vol: 0.04 },
	war: [
		{ wave: "triangle", freq: 140, to: 63, dur: 0.15, vol: 0.22 },
		{
			wave: "noise",
			freq: 1800,
			to: 500,
			dur: 0.09,
			vol: 0.12,
			filter: "highpass",
		},
	],
	spirit: [
		{ wave: "sine", freq: 360, to: 920, dur: 0.17, vol: 0.16 },
		{ wave: "triangle", freq: 720, to: 210, dur: 0.27, vol: 0.09, delay: 0.04 },
	],
	bow: [
		{ wave: "noise", freq: 3000, to: 1500, dur: 0.055, vol: 0.13 },
		{ wave: "triangle", freq: 230, to: 83, dur: 0.15, vol: 0.08 },
	],
	guard: [
		{ wave: "square", freq: 360, to: 260, dur: 0.045, vol: 0.08 },
		{ wave: "triangle", freq: 171, to: 90, dur: 0.16, vol: 0.18 },
	],
	hurt: [
		{ wave: "noise", freq: 230, to: 90, dur: 0.17, vol: 0.18 },
		{ wave: "sine", freq: 130, to: 55, dur: 0.15, vol: 0.2 },
	],
	pickup: {
		wave: "triangle",
		freq: 440,
		arp: [0, 7, 12],
		step: 0.065,
		dur: 0.21,
		vol: 0.15,
	},
	key: {
		wave: "sine",
		freq: 880,
		arp: [0, 7, 12, 19],
		step: 0.05,
		dur: 0.24,
		vol: 0.12,
	},
	door: [
		{
			wave: "noise",
			freq: 240,
			to: 70,
			dur: 0.65,
			vol: 0.1,
			filter: "lowpass",
		},
		{ wave: "triangle", freq: 65, to: 45, dur: 0.3, vol: 0.12, delay: 0.4 },
	],
	gate: [
		{
			wave: "noise",
			freq: 280,
			to: 2200,
			dur: 0.75,
			vol: 0.12,
			filter: "bandpass",
		},
		{ wave: "sine", freq: 100, to: 600, dur: 0.7, vol: 0.1, vib: [9, 0.015] },
	],
	rest: [
		{
			wave: "triangle",
			freq: 294,
			arp: [0, 4, 7, 12],
			step: 0.12,
			dur: 0.65,
			vol: 0.12,
		},
		{ wave: "noise", freq: 500, to: 160, dur: 0.32, vol: 0.045 },
	],
	page: { wave: "noise", freq: 2800, to: 1000, dur: 0.1, vol: 0.06 },
	secret: [
		{
			wave: "sine",
			freq: 523,
			arp: [0, 3, 7, 12, 15],
			step: 0.075,
			dur: 0.45,
			vol: 0.12,
		},
		{ wave: "triangle", freq: 131, to: 262, dur: 0.5, vol: 0.08 },
	],
	down: [
		{ wave: "triangle", freq: 180, to: 45, dur: 0.7, vol: 0.16 },
		{ wave: "noise", freq: 650, to: 70, dur: 0.5, vol: 0.08 },
	],
	phase: [
		{ wave: "triangle", freq: 82, to: 62, dur: 0.7, vol: 0.18 },
		{ wave: "sine", freq: 740, to: 220, dur: 0.6, vol: 0.12, delay: 0.15 },
	],
	select: { wave: "sine", freq: 620, to: 800, dur: 0.045, vol: 0.055 },
	victory: {
		wave: "triangle",
		freq: 392,
		arp: [0, 4, 7, 12, 7, 16, 19],
		step: 0.1,
		dur: 0.9,
		vol: 0.16,
	},
};
const VAULT = {
	bpm: 66,
	steps: 4,
	tracks: [
		{
			name: "stone",
			wave: "triangle",
			vol: 0.18,
			notes:
				"D2 - - - - - - - | D2 - - - - - - - | Bb1 - - - - - - - | A1 - - - - - - -",
		},
		{
			name: "lantern",
			wave: "tarminBell",
			vol: 0.11,
			notes:
				". . D4 . . . A4 . | . . F4 . . . E4 . | . . D4 . . . G4 . | E4 . . . C#4 . . .",
		},
		{
			name: "water",
			wave: "sine",
			vol: 0.05,
			notes:
				". . . . . . . D5 | . . . . . . . . | . . . . . . . A5 | . . . . . . . .",
		},
	],
};
const SPIRIT = {
	bpm: 70,
	steps: 4,
	tracks: [
		{
			wave: "sine",
			vol: 0.2,
			notes:
				"G2 - - - - - - - | Eb2 - - - - - - - | C2 - - - - - - - | D2 - - - - - - -",
		},
		{
			wave: "tarminBell",
			vol: 0.12,
			notes:
				"G4 . . D5 . . Bb4 . | G4 . F4 . Eb4 . . . | C5 . . G4 . . Eb4 . | D4 . F#4 . A4 . . .",
		},
		{
			wave: "triangle",
			vol: 0.035,
			notes:
				". . Bb5 . . . A5 . | . . G5 . . . . . | . . Eb5 . . . D5 . | . . F#5 . . . . .",
		},
	],
};
const BATTLE = {
	bpm: 106,
	steps: 4,
	tracks: [
		{
			wave: "triangle",
			vol: 0.2,
			notes:
				"D2 . D2 . . A2 . D2 | C2 . C2 . . G2 . C2 | Bb1 . Bb1 . . F2 . Bb1 | A1 . . A2 . . A1 .",
		},
		{
			wave: "tarminBell",
			vol: 0.09,
			notes:
				"D4 . A4 . F4 . E4 . | C4 . G4 . E4 . D4 . | Bb3 . F4 . D4 . C4 . | A3 . C#4 . E4 . A4 .",
		},
		{ wave: "drums", vol: 0.055, notes: "k . . h . . k . | . . s . . . h ." },
	],
};
const WARDEN = {
	bpm: 112,
	steps: 4,
	tracks: [
		{
			wave: "triangle",
			vol: 0.22,
			notes:
				"D2 . D2 . D2 . A1 . | Eb2 . Eb2 . Eb2 . Bb1 . | C2 . C2 . C2 . G1 . | A1 . A1 . A1 . A2 .",
		},
		{
			wave: "tarminBell",
			vol: 0.11,
			notes:
				"D4 A4 D5 . C5 Bb4 A4 . | Eb4 Bb4 Eb5 . D5 C5 Bb4 . | C4 G4 C5 . Bb4 A4 G4 . | A3 E4 A4 . C#5 E5 A5 .",
		},
		{ wave: "drums", vol: 0.075, notes: "k . h . s . . h | k . . k s . h ." },
	],
};
const WIN = {
	bpm: 86,
	steps: 4,
	tracks: [
		{
			wave: "triangle",
			vol: 0.18,
			notes:
				"D2 - - - A2 - - - | G2 - - - A2 - - - | Bb2 - - - G2 - - - | D2 - - - - - - -",
		},
		{
			wave: "tarminBell",
			vol: 0.15,
			notes:
				"D4 . F#4 . A4 . D5 . | B4 . G4 . A4 - . . | Bb4 . D5 . G5 . F#5 . | D5 - - - - - - -",
		},
	],
};

export class DungeonAudio {
	constructor({ game, getSettings = () => ({}) } = {}) {
		this.game = game;
		this.audio = game?.audio;
		this.getSettings = getSettings;
		this.unlocked = false;
		this.stopped = false;
		this.suspended = false;
		this.mode = null;
		this.eventIds = new Set();
		this.voices = new Set();
		this.handles = new Set();
		this.mix = { master: 0.7, music: 0.1, effects: 0.75, voice: 0.6 };
		this.eventsPlayed = 0;
		this.lastPos = null;
		this.lastEquipment = null;
		this.probe = null;
		if (this.audio) {
			for (const [id, spec] of Object.entries(SFX))
				this.audio.define("tarmin-" + id, spec);
			this.audio.instrument("tarminBell", (ctx, bus, time, freq, dur, vol) => {
				for (const [partial, gain] of [
					[1, 0.62],
					[2, 0.22],
					[3.01, 0.08],
				]) {
					const osc = ctx.createOscillator(),
						env = ctx.createGain();
					osc.type = "sine";
					osc.frequency.value = freq * partial;
					env.gain.setValueAtTime(0, time);
					env.gain.linearRampToValueAtTime(vol * gain, time + 0.006);
					env.gain.exponentialRampToValueAtTime(
						0.0001,
						time + Math.max(0.12, dur) * 1.8,
					);
					osc.connect(env);
					env.connect(bus);
					osc.start(time);
					osc.stop(time + Math.max(0.12, dur) * 1.8 + 0.03);
				}
			});
			this.applyMix();
		}
	}
	applyMix() {
		if (!this.audio) return;
		this.audio.volume = this.mix.master;
		this.audio.musicVolume = this.mix.music;
		this.audio.sfxVolume = this.mix.effects;
		this.audio.voiceVolume = this.mix.voice;
		this.audio.applyVolume();
		if (this.stopped && this.audio._master) this.audio._master.gain.value = 0;
	}
	setMix(values = {}) {
		for (const k of ["master", "music", "effects", "voice"])
			if (values[k] !== undefined) this.mix[k] = clamp(values[k]);
		this.applyMix();
	}
	async unlock() {
		if (this.stopped) return false;
		if (this.game?.paused && this.unlocked) return true;
		if (!this.audio) return false;
		// sfx() is the native audio initialization entry point; no autoplay dependency.
		const h = this.audio.sfx({ wave: "sine", freq: 440, dur: 0.012, vol: 0 });
		const ctx = this.audio.ctx;
		if (!ctx) return false;
		try {
			if (ctx.state === "suspended") await ctx.resume();
		} catch {
			return false;
		}
		this.unlocked = ctx.state === "running";
		this.suspended = false;
		if (this.unlocked && !this.probe) {
			this.probe = ctx.createAnalyser();
			this.probe.fftSize = 512;
			this.audio._master.connect(this.probe);
			this.probeSink = ctx.createGain();
			this.probeSink.gain.value = 0;
			this.probe.connect(this.probeSink);
			this.probeSink.connect(ctx.destination);
		}
		if (this.unlocked && this.mode) this.playMode(this.mode, true);
		return this.unlocked;
	}
	playMode(mode, force = false) {
		if (this.stopped || !this.audio) return;
		if (!force && mode === this.mode) return;
		this.mode = mode;
		if (!this.unlocked) return;
		const songs = {
			vault: VAULT,
			spirit: SPIRIT,
			battle: BATTLE,
			warden: WARDEN,
			victory: WIN,
		};
		this.audio.music(songs[mode] || VAULT, { sync: true, fade: 0.35 });
	}
	sfx(name, options = {}) {
		if (
			!this.unlocked ||
			this.stopped ||
			this.suspended ||
			!this.audio ||
			!SFX[name]
		)
			return;
		this.eventsPlayed++;
		const h = this.audio.sfx("tarmin-" + name, options);
		if (h.playing) {
			this.handles.add(h);
			if (this.handles.size > 256)
				this.handles.delete(this.handles.values().next().value);
		}
		return h;
	}
	gibberish(kind = "warden") {
		if (!this.unlocked || this.stopped || this.suspended || !this.audio?.ctx)
			return;
		const c = this.audio.ctx,
			bus = this.audio.bus("voice");
		if (!bus || c.state !== "running") return;
		const now = c.currentTime + 0.005,
			base = kind === "warden" ? 85 : 240;
		const syllables =
			kind === "warden"
				? [
						[1, 0.13, 800],
						[1.24, 0.1, 1100],
						[0.83, 0.18, 600],
						[1.1, 0.12, 950],
					]
				: [
						[1, 0.09, 1600],
						[1.5, 0.08, 2200],
						[1.2, 0.11, 1850],
					];
		let offset = 0;
		for (const [pitch, dur, formant] of syllables) {
			const osc = c.createOscillator(),
				form = c.createBiquadFilter(),
				gain = c.createGain();
			osc.type = "sawtooth";
			osc.frequency.setValueAtTime(base * pitch, now + offset);
			osc.frequency.linearRampToValueAtTime(
				base * pitch * 0.78,
				now + offset + dur,
			);
			form.type = "bandpass";
			form.frequency.value = formant;
			form.Q.value = 3;
			gain.gain.setValueAtTime(0, now + offset);
			gain.gain.linearRampToValueAtTime(0.13, now + offset + 0.012);
			gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + dur);
			osc.connect(form);
			form.connect(gain);
			gain.connect(bus);
			osc.start(now + offset);
			osc.stop(now + offset + dur + 0.02);
			this.voices.add(osc);
			osc.onended = () => {
				this.voices.delete(osc);
				form.disconnect();
				gain.disconnect();
			};
			offset += dur + 0.025;
		}
	}
	event(e) {
		if (!e || this.eventIds.has(e.id)) return;
		this.eventIds.add(e.id);
		if (this.eventIds.size > 500)
			this.eventIds.delete(this.eventIds.values().next().value);
		const type = e.type;
		if (type === "attack" || type === "damage" || type === "enemyAttack")
			this.sfx(e.channel === "spirit" ? "spirit" : "war");
		else if (type === "move" || type === "step") this.sfx("step");
		else if (type === "guard") this.sfx("guard");
		else if (type === "rest" || type === "heal" || type === "revive")
			this.sfx("rest");
		else if (type === "pickup" || type === "loot" || type === "handoff")
			this.sfx("pickup");
		else if (type === "key") this.sfx("key");
		else if (type === "door") this.sfx("door");
		else if (type === "secret" || type === "reveal" || type === "sight")
			this.sfx("secret");
		else if (type === "gate" || type === "descend") this.sfx("gate");
		else if (
			type === "equip" ||
			type === "swap" ||
			type === "item" ||
			type === "use"
		)
			this.sfx("page");
		else if (type === "down" || type === "defeat" || type === "death")
			this.sfx("down");
		else if (
			type === "phase" ||
			type === "bossPhase" ||
			type === "boss-phase"
		) {
			this.sfx("phase");
			this.gibberish("warden");
		} else if (type === "victory" || type === "treasure") {
			this.sfx("victory");
		}
		if (
			type === "encounter" &&
			(e.kind === "minotaur" ||
				String(e.enemyId || e.target || "").includes("warden"))
		)
			this.gibberish("warden");
	}
	update(dt, state) {
		if (this.stopped) return;
		const s = this.getSettings() || {};
		this.setMix({
			master: s.master ?? s.volume ?? this.mix.master,
			music: s.music ?? this.mix.music,
			effects: s.effects ?? s.sfxVolume ?? this.mix.effects,
			voice: s.voice ?? this.mix.voice,
		});
		if (this.stopped) return;
		const mode =
			state?.status === "victory" || state?.treasureClaimed
				? "victory"
				: state?.encounter
					? (state.enemies || []).some(
							(e) =>
								e.kind === "minotaur" &&
								e.alive !== false &&
								e.war > 0 &&
								e.spirit > 0,
						)
						? "warden"
						: "battle"
					: state?.floor === 1
						? "spirit"
						: "vault";
		this.playMode(mode);
		for (const e of state?.events || []) this.event(e);
		const p =
			state?.players &&
			(state.players[state.localPlayerId] || Object.values(state.players)[0]);
		if (p) {
			const pos = state.floor + ":" + p.x + "," + p.y;
			if (this.lastPos && this.lastPos !== pos) this.sfx("step");
			this.lastPos = pos;
			const equipment = p.right?.id + "|" + p.left?.id;
			if (this.lastEquipment && this.lastEquipment !== equipment)
				this.sfx("page");
			this.lastEquipment = equipment;
		}
	}
	async suspend() {
		this.suspended = true;
		for (const h of this.handles) h.stop();
		this.handles.clear();
		for (const v of this.voices)
			try {
				v.stop();
			} catch {}
		if (this.audio?.ctx?.state === "running")
			try {
				await this.audio.ctx.suspend();
			} catch {}
	}
	async resume() {
		if (this.stopped) return;
		this.suspended = false;
		if (this.unlocked && this.audio?.ctx?.state === "suspended")
			try {
				await this.audio.ctx.resume();
			} catch {}
	}
	reset() {
		this.stopped = false;
		this.suspended = false;
		this.mode = null;
		this.eventIds.clear();
		this.lastPos = null;
		this.lastEquipment = null;
		this.applyMix();
	}
	stop() {
		this.stopped = true;
		this.mode = null;
		this.audio?.music(null);
		if (this.audio?._master) this.audio._master.gain.value = 0;
		for (const h of this.handles) h.stop(0);
		this.handles.clear();
		for (const v of this.voices)
			try {
				v.stop();
			} catch {}
		this.voices.clear();
		this.suspend();
	}
	diagnostics() {
		let rms = 0,
			peak = 0;
		if (this.probe) {
			const values = new Float32Array(this.probe.fftSize);
			this.probe.getFloatTimeDomainData(values);
			for (const v of values) {
				rms += v * v;
				peak = Math.max(peak, Math.abs(v));
			}
			rms = Math.sqrt(rms / values.length);
		}
		return {
			unlocked: this.unlocked,
			stopped: this.stopped,
			contextState: this.audio?.ctx?.state || "locked",
			mix: { ...this.mix },
			mode: this.mode,
			eventsPlayed: this.eventsPlayed,
			activeVoices: this.voices.size,
			rms,
			peak,
			finite: Number.isFinite(rms) && Number.isFinite(peak),
			nativeSequencer: !!this.audio?.song,
		};
	}
	static async renderProbe(
		OfflineAudioContextClass = globalThis.OfflineAudioContext,
	) {
		if (!OfflineAudioContextClass) return { supported: false };
		const ctx = new OfflineAudioContextClass(1, 44100, 44100),
			bus = ctx.createGain();
		bus.gain.value = 0.1;
		bus.connect(ctx.destination);
		for (const [start, freq] of [
			[0.05, 196],
			[0.23, 294],
			[0.45, 392],
			[0.65, 523.25],
		]) {
			const osc = ctx.createOscillator(),
				env = ctx.createGain();
			osc.type = "triangle";
			osc.frequency.value = freq;
			env.gain.setValueAtTime(0, start);
			env.gain.linearRampToValueAtTime(0.6, start + 0.006);
			env.gain.exponentialRampToValueAtTime(0.0001, start + 0.25);
			osc.connect(env);
			env.connect(bus);
			osc.start(start);
			osc.stop(start + 0.28);
		}
		const result = await ctx.startRendering(),
			data = result.getChannelData(0);
		let sum = 0,
			peak = 0,
			finite = true;
		for (const v of data) {
			finite &&= Number.isFinite(v);
			sum += v * v;
			peak = Math.max(peak, Math.abs(v));
		}
		return {
			supported: true,
			finite,
			rms: Math.sqrt(sum / data.length),
			peak,
			samples: data.length,
			musicGain: bus.gain.value,
		};
	}
}
