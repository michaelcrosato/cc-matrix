// All sound is synthesized. No samples, audio assets, speech services or timers.
export class Sound {
	constructor(options = {}) {
		this.context = options.context || null;
		this.musicVolume = 0.1;
		this.sfxVolume = 0.65;
		this.muted = false;
		this.disposed = false;
		this.ready = false;
		this.sources = new Set();
		this.stats = {
			notes: 0,
			effects: 0,
			voices: 0,
			musicVolume: 0.1,
			sfxVolume: 0.65,
			unlocked: false,
		};
		this.step = 0;
		this.nextBeat = 0;
		this.voiceReadyAt = 0;
		this.intensity = 0;
	}

	_build() {
		if (this.ready || this.disposed) return;
		const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
		if (!this.context && !Context) return;
		this.context ||= new Context({ latencyHint: "interactive" });
		const ctx = this.context;
		this.master = ctx.createGain();
		this.master.gain.value = this.muted ? 0 : 0.8;
		this.musicBus = ctx.createGain();
		this.musicBus.gain.value = this.musicVolume;
		this.sfxBus = ctx.createGain();
		this.sfxBus.gain.value = this.sfxVolume;
		this.compressor = ctx.createDynamicsCompressor();
		this.compressor.threshold.value = -12;
		this.compressor.knee.value = 16;
		this.compressor.ratio.value = 5;
		this.compressor.attack.value = 0.005;
		this.compressor.release.value = 0.18;
		this.analyser = ctx.createAnalyser();
		this.analyser.fftSize = 1024;
		this.musicBus.connect(this.master);
		this.sfxBus.connect(this.master);
		this.master.connect(this.compressor);
		this.compressor.connect(this.analyser);
		this.analyser.connect(ctx.destination);
		this.noiseBuffer = ctx.createBuffer(
			1,
			Math.ceil(ctx.sampleRate * 2),
			ctx.sampleRate,
		);
		const samples = this.noiseBuffer.getChannelData(0);
		let seed = 0x7a1977;
		for (let i = 0; i < samples.length; i++) {
			seed ^= seed << 13;
			seed ^= seed >>> 17;
			seed ^= seed << 5;
			samples[i] = (seed >>> 0) / 2147483648 - 1;
		}
		this.nextBeat = ctx.currentTime + 0.035;
		this.ready = true;
	}

	async unlock() {
		if (this.disposed) return false;
		try {
			this._build();
			if (!this.ready) return false;
			const offline = typeof this.context.startRendering === "function";
			if (!offline && this.context.state === "suspended" && this.context.resume)
				await this.context.resume();
			this.stats.unlocked = this.context.state === "running" || offline;
			this.nextBeat = Math.max(this.context.currentTime + 0.02, this.nextBeat);
			return this.stats.unlocked;
		} catch {
			return false;
		}
	}

	_gain(node, value) {
		if (!node || !this.context || this.disposed) return;
		node.gain.setTargetAtTime(value, this.context.currentTime, 0.025);
	}

	setMusic(value) {
		this.musicVolume = Math.max(0, Math.min(1, Number(value) || 0));
		this.stats.musicVolume = this.musicVolume;
		this._gain(this.musicBus, this.musicVolume);
	}

	setSfx(value) {
		this.sfxVolume = Math.max(0, Math.min(1, Number(value) || 0));
		this.stats.sfxVolume = this.sfxVolume;
		this._gain(this.sfxBus, this.sfxVolume);
	}

	mute(value = true) {
		this.muted = Boolean(value);
		this._gain(this.master, this.muted ? 0 : 0.8);
	}

	_track(source, end, nodes = []) {
		this.sources.add(source);
		source.onended = () => {
			this.sources.delete(source);
			source.disconnect();
			nodes.forEach((n) => {
				n.disconnect();
			});
		};
		source.stop(end);
	}

	_tone(
		freq,
		at,
		duration,
		amplitude = 0.2,
		type = "triangle",
		bus = this.sfxBus,
		endFreq = freq,
	) {
		if (!this.ready || this.disposed) return;
		const ctx = this.context;
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = type;
		osc.frequency.setValueAtTime(Math.max(12, freq), at);
		osc.frequency.exponentialRampToValueAtTime(
			Math.max(12, endFreq),
			at + duration,
		);
		gain.gain.setValueAtTime(0, at);
		gain.gain.linearRampToValueAtTime(
			amplitude,
			at + Math.min(0.007, duration * 0.1),
		);
		gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
		osc.connect(gain);
		gain.connect(bus);
		osc.start(at);
		this._track(osc, at + duration + 0.01, [gain]);
	}

	_noise(at, duration, amplitude, cutoff, highpass = false, bus = this.sfxBus) {
		if (!this.ready || this.disposed) return;
		const ctx = this.context;
		const source = ctx.createBufferSource();
		source.buffer = this.noiseBuffer;
		const filter = ctx.createBiquadFilter();
		filter.type = highpass ? "highpass" : "lowpass";
		filter.frequency.setValueAtTime(cutoff, at);
		filter.frequency.exponentialRampToValueAtTime(
			Math.max(80, cutoff * 0.22),
			at + duration,
		);
		const gain = ctx.createGain();
		gain.gain.setValueAtTime(0, at);
		gain.gain.linearRampToValueAtTime(amplitude, at + 0.004);
		gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
		source.connect(filter);
		filter.connect(gain);
		gain.connect(bus);
		source.start(at);
		this._track(source, at + duration + 0.01, [filter, gain]);
	}

	shot() {
		if (!this.ready || this.disposed) return;
		this.stats.effects++;
		const t = this.context.currentTime + 0.002;
		this._tone(150, t, 0.15, 0.42, "triangle", this.sfxBus, 38);
		this._tone(630, t, 0.075, 0.09, "square", this.sfxBus, 175);
		this._noise(t, 0.14, 0.28, 4200);
	}

	hit(type = "") {
		if (!this.ready || this.disposed) return;
		this.stats.effects++;
		const t = this.context.currentTime + 0.002;
		const heavy = type === "boss" || type === "ship" || type === "heavy";
		this._noise(t, heavy ? 0.48 : 0.25, heavy ? 0.6 : 0.37, 2600);
		this._tone(
			heavy ? 90 : 190,
			t,
			heavy ? 0.45 : 0.24,
			0.35,
			"triangle",
			this.sfxBus,
			25,
		);
		this._tone(880, t + 0.025, 0.11, 0.1, "sine", this.sfxBus, 1320);
		this._tone(1320, t + 0.08, 0.15, 0.065, "triangle");
	}

	splash() {
		if (!this.ready || this.disposed) return;
		this.stats.effects++;
		const t = this.context.currentTime + 0.002;
		this._noise(t, 0.3, 0.18, 1100);
		for (let i = 0; i < 3; i++)
			this._tone(
				440 - i * 70,
				t + i * 0.045,
				0.09,
				0.08,
				"sine",
				this.sfxBus,
				100,
			);
	}

	hurt() {
		if (!this.ready || this.disposed) return;
		this.stats.effects++;
		const t = this.context.currentTime + 0.002;
		this._tone(330, t, 0.18, 0.2, "sawtooth", this.sfxBus, 135);
		this._tone(220, t + 0.13, 0.26, 0.18, "triangle", this.sfxBus, 65);
		this._noise(t, 0.3, 0.2, 650);
	}

	fanfare() {
		if (!this.ready || this.disposed) return;
		this.stats.effects++;
		const t = this.context.currentTime + 0.02;
		[72, 72, 76, 79, 84, 79, 84].forEach((m, i) => {
			const at = t + [0, 0.12, 0.24, 0.39, 0.58, 0.78, 0.94][i];
			this._tone(this._midi(m), at, i === 6 ? 0.65 : 0.22, 0.18, "triangle");
			this._tone(this._midi(m - 12), at, 0.24, 0.075, "square");
		});
		this.voice(1);
	}

	// Formant-filtered pitched syllables: an invented little radio language.
	voice(variant = 0) {
		if (!this.ready || this.disposed) return;
		const ctx = this.context;
		if (ctx.currentTime < this.voiceReadyAt) return;
		this.stats.voices++;
		const t = ctx.currentTime + 0.025;
		this.voiceReadyAt = t + 0.9;
		const syllables = variant
			? [1.1, 1.4, 0.96, 1.65, 1.2]
			: [1.0, 1.25, 0.88, 1.42];
		syllables.forEach((pitch, i) => {
			const at = t + i * 0.105;
			const osc = ctx.createOscillator();
			osc.type = "sawtooth";
			osc.frequency.setValueAtTime(205 * pitch, at);
			osc.frequency.exponentialRampToValueAtTime(240 * pitch, at + 0.075);
			const vowel = ctx.createBiquadFilter();
			vowel.type = "bandpass";
			vowel.frequency.value = [850, 1400, 650, 1850, 1000][i];
			vowel.Q.value = 4;
			const gain = ctx.createGain();
			gain.gain.setValueAtTime(0, at);
			gain.gain.linearRampToValueAtTime(0.28, at + 0.012);
			gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.085);
			osc.connect(vowel);
			vowel.connect(gain);
			gain.connect(this.sfxBus);
			osc.start(at);
			this._track(osc, at + 0.095, [vowel, gain]);
		});
	}

	_midi(note) {
		return 440 * 2 ** ((note - 69) / 12);
	}

	_beat(at, active) {
		// Original 6/8 harbor march. Eight bars, four harmonic changes.
		const melody = [
			72,
			76,
			79,
			76,
			74,
			72,
			67,
			null,
			67,
			71,
			74,
			79,
			77,
			76,
			74,
			72,
			74,
			76,
			79,
			null,
			76,
			74,
			72,
			null,
			72,
			76,
			79,
			84,
			83,
			79,
			77,
			null,
			77,
			76,
			74,
			71,
			72,
			74,
			76,
			79,
			76,
			74,
			72,
			null,
			67,
			71,
			72,
			null,
		];
		const i = this.step % 48;
		const root = [48, 43, 53, 48, 48, 53, 43, 48][Math.floor(i / 6)];
		const gain = active ? 0.23 : 0.16;
		if (melody[i] !== null) {
			this._tone(
				this._midi(melody[i]),
				at,
				0.19,
				gain,
				"triangle",
				this.musicBus,
			);
			this.stats.notes++;
		}
		if (i % 3 === 0) {
			this._tone(this._midi(root), at, 0.22, 0.32, "triangle", this.musicBus);
			this._tone(
				this._midi(root + 12),
				at + 0.004,
				0.15,
				0.08,
				"sine",
				this.musicBus,
			);
			this._tone(105, at, 0.09, 0.27, "sine", this.musicBus, 36);
		} else if (i % 3 === 1) {
			this._tone(
				this._midi(root + 19),
				at,
				0.095,
				0.09,
				"square",
				this.musicBus,
			);
			this._tone(
				this._midi(root + 24),
				at,
				0.095,
				0.065,
				"triangle",
				this.musicBus,
			);
		}
		if (active && i % 6 === 3)
			this._noise(at, 0.085, 0.15, 3300, true, this.musicBus);
		if (active && this.intensity > 0.55)
			this._noise(at, 0.035, 0.045, 6500, true, this.musicBus);
		this.step++;
	}

	update(_dt, active = false, intensity = 0) {
		if (!this.ready || this.disposed || this.context.state === "closed") return;
		this.intensity = Math.max(0, Math.min(1, Number(intensity) || 0));
		if (
			this.context.state !== "running" &&
			typeof this.context.startRendering !== "function"
		)
			return;
		const now = this.context.currentTime;
		if (this.nextBeat < now - 0.25) this.nextBeat = now + 0.015;
		const interval = active ? 60 / (108 + this.intensity * 8) / 2 : 60 / 92 / 2;
		let scheduled = 0;
		while (this.nextBeat < now + 0.12 && scheduled++ < 4) {
			this._beat(this.nextBeat, active);
			this.nextBeat += interval;
		}
	}

	level() {
		if (!this.analyser) return 0;
		this._samples ||= new Float32Array(this.analyser.fftSize);
		this.analyser.getFloatTimeDomainData(this._samples);
		let sum = 0;
		for (const v of this._samples) sum += v * v;
		return Math.sqrt(sum / this._samples.length);
	}

	dispose() {
		if (this.disposed) return;
		this.disposed = true;
		for (const source of this.sources) {
			try {
				source.stop();
				source.disconnect();
			} catch {
				/* Already ended. */
			}
		}
		this.sources.clear();
		if (this.master) this.master.disconnect();
		if (this.context?.close && this.context.state !== "closed")
			this.context.close().catch(() => {});
	}
}
