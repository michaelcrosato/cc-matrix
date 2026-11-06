const clamp = (n, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, Number(n) || 0));
const midi = (n) => 440 * 2 ** ((n - 69) / 12);

/** Small, entirely synthesized arcade band and sound-effects rack. */
export class AudioDirector {
	constructor() {
		this.ctx = null;
		this.analyser = null;
		this.musicVolume = 0.1;
		this.effectsVolume = 0.7;
		this.mode = "title";
		this.step = 0;
		this.nextBeat = 0;
		this.lastDot = -10;
		this.dotNote = 0;
		this.stats = {
			unlocked: false,
			musicVolume: 0.1,
			effectsVolume: 0.7,
			notes: 0,
			effects: 0,
			voices: 0,
			musicSteps: 0,
			mode: "title",
		};
	}

	async unlock() {
		if (!this.ctx) {
			const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
			if (!Context) return false;
			this.ctx = new Context();
			const c = this.ctx;
			this.musicBus = c.createGain();
			this.fxBus = c.createGain();
			this.master = c.createGain();
			this.master.gain.value = 0.8;
			this.limiter = c.createDynamicsCompressor();
			this.limiter.threshold.value = -7;
			this.limiter.knee.value = 6;
			this.limiter.ratio.value = 12;
			this.limiter.attack.value = 0.003;
			this.limiter.release.value = 0.12;
			this.analyser = c.createAnalyser();
			this.analyser.fftSize = 1024;
			this.musicBus.connect(this.master);
			this.fxBus.connect(this.master);
			this.master.connect(this.limiter);
			this.limiter.connect(this.analyser);
			this.analyser.connect(c.destination);
			this.musicBus.gain.value = this.musicVolume;
			this.fxBus.gain.value = this.effectsVolume;
			this.noiseBuffer = c.createBuffer(1, c.sampleRate, c.sampleRate);
			const samples = this.noiseBuffer.getChannelData(0);
			let seed = 12648430;
			for (let i = 0; i < samples.length; i++) {
				seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
				samples[i] = seed / 2147483648 - 1;
			}
			this._makeMotor();
			this.nextBeat = c.currentTime + 0.06;
		}
		if (this.ctx.state === "suspended") await this.ctx.resume();
		this.stats.unlocked = this.ctx.state === "running";
		return this.stats.unlocked;
	}

	setMusic(v) {
		this.musicVolume = clamp(v);
		this.stats.musicVolume = this.musicVolume;
		if (this.ctx)
			this.musicBus.gain.setTargetAtTime(
				this.musicVolume * (this.mode === "pause" ? 0.35 : 1),
				this.ctx.currentTime,
				0.03,
			);
	}

	setEffects(v) {
		this.effectsVolume = clamp(v);
		this.stats.effectsVolume = this.effectsVolume;
		if (this.ctx)
			this.fxBus.gain.setTargetAtTime(
				this.effectsVolume,
				this.ctx.currentTime,
				0.03,
			);
	}

	setMode(mode) {
		if (this.mode === mode) return;
		this.mode = mode;
		this.stats.mode = mode;
		this.setMusic(this.musicVolume);
		if (this.ctx && (mode === "win" || mode === "play"))
			this.nextBeat = Math.max(this.nextBeat, this.ctx.currentTime + 0.02);
	}

	_makeMotor() {
		const c = this.ctx;
		this.motor = c.createOscillator();
		this.motor.type = "sawtooth";
		this.motor.frequency.value = 47;
		this.motorFilter = c.createBiquadFilter();
		this.motorFilter.type = "lowpass";
		this.motorFilter.frequency.value = 150;
		this.motorGain = c.createGain();
		this.motorGain.gain.value = 0;
		this.motor.connect(this.motorFilter);
		this.motorFilter.connect(this.motorGain);
		this.motorGain.connect(this.fxBus);
		this.motor.start();
	}

	_tone(
		freq,
		when,
		duration,
		gain = 0.1,
		type = "square",
		bus = this.fxBus,
		endFreq = freq,
	) {
		const c = this.ctx;
		if (!c) return;
		const osc = c.createOscillator();
		const vca = c.createGain();
		osc.type = type;
		osc.frequency.setValueAtTime(Math.max(15, freq), when);
		osc.frequency.exponentialRampToValueAtTime(
			Math.max(15, endFreq),
			when + duration,
		);
		vca.gain.setValueAtTime(0, when);
		vca.gain.linearRampToValueAtTime(
			gain,
			when + Math.min(0.006, duration / 4),
		);
		vca.gain.exponentialRampToValueAtTime(0.0001, when + duration);
		osc.connect(vca);
		vca.connect(bus);
		osc.start(when);
		osc.stop(when + duration + 0.01);
		osc.onended = () => {
			osc.disconnect();
			vca.disconnect();
		};
		this.stats.notes++;
	}

	_noise(
		when,
		duration,
		gain,
		frequency = 4000,
		type = "highpass",
		bus = this.fxBus,
	) {
		const c = this.ctx;
		const src = c.createBufferSource();
		const filter = c.createBiquadFilter();
		const vca = c.createGain();
		src.buffer = this.noiseBuffer;
		filter.type = type;
		filter.frequency.value = frequency;
		filter.Q.value = 0.65;
		vca.gain.setValueAtTime(gain, when);
		vca.gain.exponentialRampToValueAtTime(0.0001, when + duration);
		src.connect(filter);
		filter.connect(vca);
		vca.connect(bus);
		src.start(when);
		src.stop(when + duration + 0.01);
		src.onended = () => {
			src.disconnect();
			filter.disconnect();
			vca.disconnect();
		};
	}

	_voice(when, happy = true) {
		const c = this.ctx;
		const vowels = [
			[680, 1100],
			[390, 1950],
			[270, 2250],
			[570, 850],
			[320, 720],
		];
		const syllables = happy ? 5 : 4;
		for (let s = 0; s < syllables; s++) {
			const t = when + s * 0.082;
			const source = c.createOscillator();
			const envelope = c.createGain();
			source.type = "sawtooth";
			const pitch = happy
				? [230, 290, 260, 360, 310][s]
				: [200, 170, 145, 110][s];
			source.frequency.setValueAtTime(pitch, t);
			source.frequency.exponentialRampToValueAtTime(
				pitch * (happy ? 1.13 : 0.85),
				t + 0.078,
			);
			envelope.gain.setValueAtTime(0, t);
			envelope.gain.linearRampToValueAtTime(0.07, t + 0.012);
			envelope.gain.exponentialRampToValueAtTime(0.0001, t + 0.078);
			const filters = vowels[(s + (happy ? 1 : 3)) % vowels.length].map((f) => {
				const filter = c.createBiquadFilter();
				filter.type = "bandpass";
				filter.frequency.value = f;
				filter.Q.value = 6;
				source.connect(filter);
				filter.connect(envelope);
				return filter;
			});
			envelope.connect(this.fxBus);
			source.start(t);
			source.stop(t + 0.08);
			source.onended = () => {
				source.disconnect();
				envelope.disconnect();
				filters.forEach((f) => f.disconnect());
			};
		}
		this.stats.voices++;
	}

	sfx(name) {
		if (!this.ctx || this.ctx.state !== "running") return;
		const t = this.ctx.currentTime + 0.002;
		this.stats.effects++;
		switch (name) {
			case "dot": {
				if (t - this.lastDot < 0.028) return;
				if (t - this.lastDot > 0.7) this.dotNote = 0;
				const note = [76, 79, 81, 84, 88, 84, 81, 79][this.dotNote++ % 8];
				this._tone(midi(note), t, 0.095, 0.075, "sine");
				this._tone(midi(note + 12), t + 0.008, 0.055, 0.025, "triangle");
				this.lastDot = t;
				break;
			}
			case "lane":
				this._tone(350, t, 0.075, 0.045, "triangle", this.fxBus, 720);
				this._noise(t, 0.06, 0.02, 2500);
				break;
			case "boost":
				this._noise(t, 0.48, 0.11, 1200, "bandpass");
				this._tone(100, t, 0.34, 0.08, "sawtooth", this.fxBus, 490);
				this._tone(490, t + 0.1, 0.25, 0.035, "triangle", this.fxBus, 980);
				break;
			case "hit":
				this._noise(t, 0.37, 0.25, 850, "lowpass");
				this._tone(170, t, 0.35, 0.19, "sawtooth", this.fxBus, 33);
				this._tone(85, t + 0.03, 0.24, 0.1, "square", this.fxBus, 25);
				this._voice(t + 0.11, false);
				break;
			case "clear":
			case "start": {
				const notes =
					name === "clear" ? [72, 76, 79, 84, 79, 88] : [60, 67, 72, 79];
				notes.forEach((n, i) =>
					this._tone(midi(n), t + i * 0.085, 0.22, 0.1, "triangle"),
				);
				this._voice(t + notes.length * 0.085 + 0.03);
				break;
			}
			case "over":
				[67, 64, 60, 48].forEach((n, i) =>
					this._tone(midi(n), t + i * 0.15, 0.34, 0.1, "triangle"),
				);
				this._voice(t + 0.4, false);
				break;
			case "shield":
				[72, 79, 84, 91].forEach((n, i) =>
					this._tone(midi(n), t + i * 0.045, 0.22, 0.07, "sine"),
				);
				break;
			case "voice":
				this._voice(t);
				break;
			case "combo":
				[81, 84, 88].forEach((n, i) =>
					this._tone(midi(n), t + i * 0.035, 0.15, 0.06, "triangle"),
				);
				break;
			default:
				this._tone(660, t, 0.045, 0.04, "sine", this.fxBus, 880);
		}
	}

	_musicStep(step, t) {
		const bar = Math.floor(step / 16) % 8;
		const s = step % 16;
		const roots = [36, 36, 41, 41, 43, 41, 36, 43];
		const root = roots[bar];
		const bus = this.musicBus;
		const upbeat = this.mode === "win";
		if (s === 0 || s === 6 || s === 8 || s === 14) {
			this._tone(135, t, 0.12, 0.7, "sine", bus, 38);
			this._noise(t, 0.025, 0.08, 6000, "highpass", bus);
		}
		if (s === 4 || s === 12) {
			this._noise(t, 0.12, 0.3, 1500, "highpass", bus);
			this._tone(185, t, 0.065, 0.12, "triangle", bus, 115);
		}
		this._noise(
			t,
			s % 4 === 2 ? 0.09 : 0.035,
			s % 2 ? 0.045 : 0.08,
			6500,
			"highpass",
			bus,
		);
		const bassLine = [
			0,
			null,
			12,
			null,
			0,
			7,
			null,
			10,
			0,
			null,
			12,
			7,
			null,
			10,
			7,
			null,
		];
		if (bassLine[s] !== null)
			this._tone(midi(root + bassLine[s]), t, 0.115, 0.34, "triangle", bus);
		if ([2, 7, 10, 15].includes(s)) {
			[root + 24, root + 27, root + 31, root + 34].forEach((n, i) =>
				this._tone(midi(n), t + i * 0.002, 0.075, 0.045, "square", bus),
			);
		}
		const melody = [
			0,
			null,
			7,
			10,
			null,
			12,
			null,
			10,
			7,
			null,
			3,
			5,
			null,
			7,
			3,
			null,
		];
		const lead = melody[(s + (bar % 2 ? 8 : 0)) % 16];
		if (lead !== null && (this.mode !== "pause" || s % 4 === 0)) {
			const note = midi(root + 36 + lead + (upbeat ? 12 : 0));
			this._tone(note, t, s % 4 === 0 ? 0.18 : 0.105, 0.085, "triangle", bus);
			this._tone(note * 1.002, t + 0.065, 0.16, 0.018, "sine", bus);
		}
		this.stats.musicSteps++;
	}

	tick(dt, speed = 1) {
		if (!this.ctx || this.ctx.state !== "running") return;
		const c = this.ctx;
		const driving = this.mode === "play";
		const rate = clamp(speed, 0, 3);
		this.motor.frequency.setTargetAtTime(42 + rate * 24, c.currentTime, 0.1);
		this.motorFilter.frequency.setTargetAtTime(
			130 + rate * 80,
			c.currentTime,
			0.1,
		);
		this.motorGain.gain.setTargetAtTime(
			driving ? 0.022 : 0,
			c.currentTime,
			0.07,
		);
		if (this.nextBeat < c.currentTime - 0.3)
			this.nextBeat = c.currentTime + 0.025;
		const beatLength = 60 / (this.mode === "win" ? 126 : 116) / 4;
		let scheduled = 0;
		while (this.nextBeat < c.currentTime + 0.16 && scheduled++ < 8) {
			this._musicStep(this.step, this.nextBeat);
			this.nextBeat += beatLength * (this.step % 2 === 0 ? 1.08 : 0.92);
			this.step++;
		}
	}

	async dispose() {
		if (!this.ctx) return;
		this.motor.stop();
		await this.ctx.close();
		this.ctx = null;
		this.stats.unlocked = false;
	}
}
