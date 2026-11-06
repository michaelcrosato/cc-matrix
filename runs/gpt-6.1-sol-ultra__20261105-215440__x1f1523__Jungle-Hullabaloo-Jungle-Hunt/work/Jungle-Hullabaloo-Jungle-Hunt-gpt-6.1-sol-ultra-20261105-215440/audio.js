// Jungle Hullabaloo — all instruments, effects and syllables are synthesized here.
export class JungleAudio {
	constructor() {
		this.ctx = null;
		this.musicVolume = 0.1;
		this.effectsVolume = 0.72;
		this.muted = false;
		this.paused = false;
		this.nextBeat = 0;
		this.beat = 0;
		this.stage = 0;
		this.playing = false;
		this.events = { notes: 0, effects: 0, voices: 0 };
		this._lastEffect = Object.create(null);
	}
	_connect(ctx, destination) {
		this.ctx = ctx;
		this.master = ctx.createGain();
		this.master.gain.value = this.muted ? 0 : 0.65;
		this.compressor = ctx.createDynamicsCompressor();
		this.compressor.threshold.value = -12;
		this.compressor.knee.value = 12;
		this.compressor.ratio.value = 5;
		this.compressor.attack.value = 0.003;
		this.compressor.release.value = 0.18;
		this.analyser = ctx.createAnalyser();
		this.analyser.fftSize = 256;
		this.music = ctx.createGain();
		this.effects = ctx.createGain();
		this.music.gain.value = this.musicVolume;
		this.effects.gain.value = this.effectsVolume;
		this.music.connect(this.master);
		this.effects.connect(this.master);
		this.master.connect(this.compressor);
		this.compressor.connect(this.analyser);
		this.analyser.connect(destination);
		this.samples = new Float32Array(this.analyser.fftSize);
		this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
		let seed = 15683;
		const data = this.noise.getChannelData(0);
		for (let i = 0; i < data.length; i++) {
			seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
			data[i] = seed / 2147483648 - 1;
		}
		this.nextBeat = ctx.currentTime + 0.05;
	}
	async unlock() {
		if (!this.ctx) {
			const AudioContextType =
				globalThis.AudioContext || globalThis.webkitAudioContext;
			if (!AudioContextType) return false;
			const ctx = new AudioContextType({ latencyHint: "interactive" });
			this._connect(ctx, ctx.destination);
		}
		if (this.ctx.state === "suspended" && !this.paused) await this.ctx.resume();
		return this.ctx.state === "running";
	}
	_gain(param, value) {
		if (!this.ctx || !param) return;
		param.cancelScheduledValues(this.ctx.currentTime);
		param.setTargetAtTime(value, this.ctx.currentTime, 0.025);
	}
	setMusic(value) {
		this.musicVolume = Math.max(0, Math.min(1, Number(value) || 0));
		this._gain(this.music?.gain, this.musicVolume);
	}
	setEffects(value) {
		this.effectsVolume = Math.max(0, Math.min(1, Number(value) || 0));
		this._gain(this.effects?.gain, this.effectsVolume);
	}
	setMuted(value) {
		this.muted = !!value;
		this._gain(this.master?.gain, this.muted ? 0 : 0.65);
	}
	suspend(value) {
		this.paused = !!value;
		if (!this.ctx) return;
		// A gain ramp preserves browser gesture unlock and avoids discontinuities.
		this._gain(this.master.gain, this.paused || this.muted ? 0 : 0.65);
		this.nextBeat = this.ctx.currentTime + 0.1;
	}
	_tone(
		frequency,
		when,
		duration,
		volume,
		type = "sine",
		bus = this.effects,
		endFrequency = frequency,
	) {
		const ctx = this.ctx;
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = type;
		osc.frequency.setValueAtTime(Math.max(20, frequency), when);
		osc.frequency.exponentialRampToValueAtTime(
			Math.max(20, endFrequency),
			when + duration,
		);
		gain.gain.setValueAtTime(0, when);
		gain.gain.linearRampToValueAtTime(
			volume,
			when + Math.min(0.008, duration / 5),
		);
		gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
		osc.connect(gain);
		gain.connect(bus);
		osc.start(when);
		osc.stop(when + duration + 0.01);
		osc.onended = () => {
			osc.disconnect();
			gain.disconnect();
		};
		return osc;
	}
	_noise(
		when,
		duration,
		volume,
		cutoff = 2200,
		bus = this.effects,
		highpass = false,
	) {
		const ctx = this.ctx;
		const source = ctx.createBufferSource();
		source.buffer = this.noise;
		const filter = ctx.createBiquadFilter();
		filter.type = highpass ? "highpass" : "lowpass";
		filter.frequency.value = cutoff;
		const gain = ctx.createGain();
		gain.gain.setValueAtTime(volume, when);
		gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
		source.connect(filter);
		filter.connect(gain);
		gain.connect(bus);
		source.start(when);
		source.stop(when + duration + 0.01);
		source.onended = () => {
			source.disconnect();
			filter.disconnect();
			gain.disconnect();
		};
	}
	_wood(note, when, duration = 0.22, volume = 0.32) {
		const frequency = 440 * 2 ** ((note - 69) / 12);
		this._tone(frequency, when, duration, volume, "sine", this.music);
		this._tone(
			frequency * 3.99,
			when,
			duration * 0.38,
			volume * 0.13,
			"sine",
			this.music,
		);
		this._noise(when, 0.025, volume * 0.055, 1500, this.music);
		this.events.notes++;
	}
	_drum(when, low = true, accent = false) {
		if (low) {
			this._tone(135, when, 0.18, accent ? 0.34 : 0.24, "sine", this.music, 48);
			this._noise(when, 0.04, 0.035, 700, this.music);
		} else {
			this._tone(
				accent ? 330 : 270,
				when,
				0.09,
				0.14,
				"triangle",
				this.music,
				145,
			);
			this._noise(when, 0.055, 0.06, 1900, this.music);
		}
	}
	_musicStep(step, when, stage) {
		const melodies = [
			[
				76,
				null,
				79,
				81,
				79,
				null,
				76,
				74,
				72,
				null,
				74,
				76,
				79,
				null,
				74,
				null,
				76,
				null,
				79,
				83,
				81,
				79,
				76,
				null,
				74,
				72,
				74,
				79,
				76,
				null,
				72,
				null,
			],
			[
				72,
				null,
				null,
				76,
				79,
				null,
				76,
				null,
				74,
				null,
				null,
				77,
				81,
				null,
				77,
				null,
				72,
				null,
				76,
				null,
				79,
				null,
				83,
				null,
				81,
				null,
				77,
				76,
				74,
				null,
				72,
				null,
			],
			[
				76,
				76,
				null,
				79,
				81,
				null,
				79,
				76,
				74,
				74,
				null,
				76,
				79,
				null,
				76,
				null,
				79,
				null,
				81,
				83,
				84,
				null,
				83,
				79,
				81,
				null,
				79,
				76,
				74,
				null,
				72,
				null,
			],
			[
				72,
				null,
				79,
				null,
				76,
				null,
				79,
				81,
				74,
				null,
				81,
				null,
				77,
				null,
				76,
				null,
				72,
				null,
				76,
				79,
				84,
				null,
				83,
				81,
				79,
				null,
				77,
				76,
				74,
				null,
				72,
				null,
			],
		];
		const s = Math.abs(stage | 0) % 4;
		const n = step % 32;
		if (melodies[s][n] !== null)
			this._wood(
				melodies[s][n],
				when,
				s === 1 ? 0.38 : 0.23,
				s === 1 ? 0.23 : 0.31,
			);
		if (n % 4 === 0) {
			const roots = [48, 45, 53, 55];
			this._tone(
				440 * 2 ** ((roots[Math.floor(n / 8)] - 69) / 12),
				when,
				0.31,
				0.24,
				"triangle",
				this.music,
			);
			this._drum(when, true, n % 8 === 0);
		}
		if (n % 4 === 2) this._drum(when, false, s === 3);
		if (n % 2 === 1) this._noise(when, 0.035, 0.036, 5600, this.music, true);
		if (s === 3 && (n % 8 === 3 || n % 8 === 6)) this._drum(when, false, true);
	}
	update(dt, stage = 0, playing = true) {
		this.stage =
			typeof stage === "number"
				? stage
				: { vines: 0, river: 1, boulders: 2, rescue: 3 }[stage] || 0;
		this.playing = !!playing;
		if (!this.ctx || this.ctx.state !== "running" || this.paused || !playing) {
			if (this.ctx) this.nextBeat = this.ctx.currentTime + 0.08;
			return;
		}
		const now = this.ctx.currentTime;
		if (this.nextBeat < now - 0.2) this.nextBeat = now + 0.02;
		const seconds =
			60 / (this.stage === 1 ? 104 : this.stage === 2 ? 124 : 112) / 2;
		while (this.nextBeat < now + 0.16) {
			this._musicStep(this.beat++, this.nextBeat, this.stage);
			this.nextBeat += seconds;
		}
	}
	sfx(name, when = null) {
		if (!this.ctx || this.paused || this.ctx.state === "closed") return false;
		const t = when ?? this.ctx.currentTime + 0.005;
		if (when === null && this._lastEffect[name] > t - 0.045) return false;
		this._lastEffect[name] = t;
		this.events.effects++;
		switch (name) {
			case "jump":
				this._tone(270, t, 0.16, 0.13, "triangle", this.effects, 640);
				break;
			case "grab":
				this._tone(410, t, 0.07, 0.14, "triangle", this.effects, 650);
				this._tone(810, t + 0.045, 0.11, 0.09);
				break;
			case "splash":
				this._noise(t, 0.36, 0.22, 2200);
				for (let i = 0; i < 4; i++)
					this._tone(
						320 + i * 150,
						t + i * 0.045,
						0.12,
						0.045,
						"sine",
						this.effects,
						180,
					);
				break;
			case "hit":
				this._tone(175, t, 0.23, 0.19, "sawtooth", this.effects, 65);
				this._noise(t, 0.18, 0.12, 1400);
				break;
			case "coin":
				this._tone(1046.5, t, 0.11, 0.13);
				this._tone(1568, t + 0.065, 0.19, 0.1);
				break;
			case "complete":
			case "win": {
				const notes =
					name === "win" ? [72, 76, 79, 84, 79, 84, 88] : [72, 76, 79, 84];
				notes.forEach((n, i) =>
					this._tone(
						440 * 2 ** ((n - 69) / 12),
						t + i * 0.115,
						i === notes.length - 1 ? 0.5 : 0.18,
						0.14,
						"triangle",
					),
				);
				break;
			}
			case "knife":
			case "attack":
				this._noise(t, 0.13, 0.15, 3800, this.effects, true);
				this._tone(680, t, 0.08, 0.05, "triangle", this.effects, 260);
				break;
			case "land":
				this._noise(t, 0.09, 0.1, 650);
				this._tone(105, t, 0.09, 0.07);
				break;
			case "warning":
				this._tone(660, t, 0.12, 0.12, "triangle");
				this._tone(520, t + 0.15, 0.13, 0.1, "triangle");
				break;
			case "menu":
			default:
				this._tone(650, t, 0.075, 0.075, "sine", this.effects, 850);
		}
		return true;
	}
	voice(value = "hulabalu", when = null) {
		if (!this.ctx || this.paused || this.ctx.state === "closed") return false;
		const text = String(value).slice(0, 28);
		let seed = 7;
		for (const char of text)
			seed = (Math.imul(seed, 31) + char.charCodeAt(0)) >>> 0;
		const ctx = this.ctx;
		const start = when ?? ctx.currentTime + 0.01;
		const syllables = Math.min(9, Math.max(3, Math.ceil(text.length / 2)));
		const formants = [
			[750, 1200],
			[400, 1800],
			[300, 2300],
			[600, 900],
			[350, 800],
		];
		for (let i = 0; i < syllables; i++) {
			seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
			const f = formants[seed % formants.length];
			const t = start + i * 0.105;
			const osc = ctx.createOscillator();
			osc.type = "sawtooth";
			const pitch = 200 + (seed % 190);
			osc.frequency.setValueAtTime(pitch, t);
			osc.frequency.exponentialRampToValueAtTime(
				pitch * (i % 2 ? 0.82 : 1.23),
				t + 0.085,
			);
			const gain = ctx.createGain();
			gain.gain.setValueAtTime(0, t);
			gain.gain.linearRampToValueAtTime(0.055, t + 0.012);
			gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
			osc.connect(gain);
			const filters = f.map((frequency) => {
				const filter = ctx.createBiquadFilter();
				filter.type = "bandpass";
				filter.frequency.value = frequency;
				filter.Q.value = 5;
				gain.connect(filter);
				filter.connect(this.effects);
				return filter;
			});
			osc.start(t);
			osc.stop(t + 0.1);
			osc.onended = () => {
				osc.disconnect();
				gain.disconnect();
				filters.forEach((filter) => filter.disconnect());
			};
		}
		this.events.voices++;
		return true;
	}
	diagnostics() {
		let peak = 0,
			squares = 0;
		if (this.analyser) {
			this.analyser.getFloatTimeDomainData(this.samples);
			for (const value of this.samples) {
				peak = Math.max(peak, Math.abs(value));
				squares += value * value;
			}
		}
		return {
			supported: !!(globalThis.AudioContext || globalThis.webkitAudioContext),
			state: this.ctx?.state || "locked",
			musicVolume: this.musicVolume,
			effectsVolume: this.effectsVolume,
			muted: this.muted,
			paused: this.paused,
			stage: this.stage,
			beat: this.beat,
			peak,
			rms: Math.sqrt(squares / (this.samples?.length || 1)),
			...this.events,
		};
	}
	async offlineCheck() {
		return offlineCheck();
	}
}

export async function offlineCheck() {
	const OfflineContext =
		globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
	if (!OfflineContext)
		return { supported: false, peak: 0, rms: 0, clipping: false };
	const ctx = new OfflineContext(2, 44100 * 4, 44100);
	const engine = new JungleAudio();
	engine._connect(ctx, ctx.destination);
	for (let i = 0; i < 16; i++) engine._musicStep(i, 0.05 + i * 0.235, i % 4);
	[
		"jump",
		"grab",
		"splash",
		"hit",
		"coin",
		"complete",
		"knife",
		"menu",
		"win",
	].forEach((name, i) => engine.sfx(name, 0.1 + i * 0.35));
	engine.voice("wibble-hulabalu", 0.45);
	const buffer = await ctx.startRendering();
	let peak = 0,
		squares = 0,
		nonzero = 0;
	for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
		for (const value of buffer.getChannelData(channel)) {
			peak = Math.max(peak, Math.abs(value));
			squares += value * value;
			if (Math.abs(value) > 0.00001) nonzero++;
		}
	}
	return {
		supported: true,
		peak,
		rms: Math.sqrt(squares / (buffer.length * buffer.numberOfChannels)),
		clipping: peak >= 0.999,
		nonzero,
		seconds: buffer.duration,
		channels: buffer.numberOfChannels,
		sampleRate: buffer.sampleRate,
	};
}
