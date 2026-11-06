/* ComBop — every sound is synthesized here. No samples or audio downloads. */
const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));

export class AudioSystem {
	constructor({ context = null } = {}) {
		this.ctx = null;
		this.musicVolume = 0.1;
		this.sfxVolume = 0.7;
		this.muted = false;
		this.musicPlaying = false;
		this.musicStep = 0;
		this.nextNote = 0;
		this.voices = 0;
		this.events = {};
		this.lastSounds = {};
		this.lastVoice = -10;
		this.activeNodes = 0;
		if (context) this._setup(context);
	}

	_setup(context) {
		this.ctx = context;
		this.master = context.createGain();
		this.master.gain.value = this.muted ? 0 : 0.72;
		this.limiter = context.createDynamicsCompressor();
		this.limiter.threshold.value = -14;
		this.limiter.knee.value = 12;
		this.limiter.ratio.value = 5;
		this.limiter.attack.value = 0.003;
		this.limiter.release.value = 0.14;
		this.musicBus = context.createGain();
		this.musicBus.gain.value = this.musicVolume;
		this.sfxBus = context.createGain();
		this.sfxBus.gain.value = this.sfxVolume;
		this.voiceBus = context.createGain();
		this.voiceBus.gain.value = this.sfxVolume * 0.7;
		this.musicBus.connect(this.master);
		this.sfxBus.connect(this.master);
		this.voiceBus.connect(this.master);
		this.master.connect(this.limiter);
		this.analyser = context.createAnalyser();
		this.analyser.fftSize = 256;
		this.limiter.connect(this.analyser);
		this.analyser.connect(context.destination);
		this.noise = context.createBuffer(
			1,
			context.sampleRate * 2,
			context.sampleRate,
		);
		const data = this.noise.getChannelData(0);
		let seed = 1977;
		for (let i = 0; i < data.length; i++) {
			seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
			data[i] = seed / 2147483648 - 1;
		}
	}

	async unlock() {
		try {
			if (!this.ctx) {
				const Context =
					globalThis.AudioContext || globalThis.webkitAudioContext;
				if (!Context) return false;
				this._setup(new Context());
			}
			if (this.ctx.state === "suspended" && !("startRendering" in this.ctx))
				await this.ctx.resume();
			return true;
		} catch {
			return false;
		}
	}

	_gain(parameter, value, seconds = 0.03) {
		if (parameter && this.ctx)
			parameter.setTargetAtTime(value, this.ctx.currentTime, seconds);
	}
	setMusic(value) {
		this.musicVolume = clamp01(value);
		this._gain(this.musicBus?.gain, this.musicVolume);
	}
	setSfx(value) {
		this.sfxVolume = clamp01(value);
		this._gain(this.sfxBus?.gain, this.sfxVolume);
		this._gain(this.voiceBus?.gain, this.sfxVolume * 0.7);
	}
	setMuted(value) {
		this.muted = !!value;
		this._gain(this.master?.gain, this.muted ? 0 : 0.72, 0.01);
	}
	startMusic() {
		if (this.musicPlaying) return;
		this.musicPlaying = true;
		this.musicStep = 0;
		this.nextNote = (this.ctx?.currentTime || 0) + 0.025;
	}
	stopMusic() {
		this.musicPlaying = false;
	}

	_track(source, end, nodes = []) {
		this.activeNodes++;
		source.onended = () => {
			source.disconnect();
			nodes.forEach((node) => {
				node.disconnect();
			});
			this.activeNodes = Math.max(0, this.activeNodes - 1);
		};
		source.stop(end);
	}

	_tone(
		freq,
		time,
		duration,
		volume,
		type = "triangle",
		bus = this.sfxBus,
		endFreq = freq,
		attack = 0.004,
	) {
		const ctx = this.ctx;
		const oscillator = ctx.createOscillator();
		const gain = ctx.createGain();
		oscillator.type = type;
		oscillator.frequency.setValueAtTime(Math.max(20, freq), time);
		oscillator.frequency.exponentialRampToValueAtTime(
			Math.max(20, endFreq),
			time + duration,
		);
		gain.gain.setValueAtTime(0.0001, time);
		gain.gain.exponentialRampToValueAtTime(
			Math.max(0.0002, volume),
			time + Math.min(attack, duration * 0.25),
		);
		gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
		oscillator.connect(gain);
		gain.connect(bus);
		oscillator.start(time);
		this._track(oscillator, time + duration + 0.01, [gain]);
	}

	_noise(
		time,
		duration,
		volume,
		frequency,
		type = "lowpass",
		bus = this.sfxBus,
	) {
		const ctx = this.ctx;
		const source = ctx.createBufferSource();
		source.buffer = this.noise;
		const filter = ctx.createBiquadFilter();
		filter.type = type;
		filter.frequency.value = frequency;
		filter.Q.value = 0.7;
		const gain = ctx.createGain();
		gain.gain.setValueAtTime(0.0001, time);
		gain.gain.exponentialRampToValueAtTime(
			Math.max(0.0002, volume),
			time + 0.003,
		);
		gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
		source.connect(filter);
		filter.connect(gain);
		gain.connect(bus);
		source.start(time);
		this._track(source, time + duration + 0.01, [filter, gain]);
	}

	sfx(name, intensity = 1) {
		if (!this.ctx || this.ctx.state === "closed") return;
		const t = this.ctx.currentTime + 0.002;
		if (
			t - (this.lastSounds[name] ?? -10) <
			(name === "bounce" ? 0.018 : 0.035)
		)
			return;
		this.lastSounds[name] = t;
		this.events[name] = (this.events[name] || 0) + 1;
		const v = Math.max(0.05, Math.min(1.5, intensity));
		switch (name) {
			case "shoot":
				this._tone(210, t, 0.13, 0.3 * v, "square", this.sfxBus, 48);
				this._tone(75, t, 0.18, 0.26 * v, "sine", this.sfxBus, 32);
				this._noise(t, 0.075, 0.21 * v, 2000);
				break;
			case "bounce":
				this._tone(1150, t, 0.085, 0.14 * v, "triangle", this.sfxBus, 720);
				this._tone(1670, t, 0.06, 0.06 * v, "sine", this.sfxBus, 1100);
				break;
			case "hit":
				this._tone(330, t, 0.16, 0.24 * v, "square", this.sfxBus, 85);
				this._tone(710, t, 0.095, 0.14 * v, "triangle", this.sfxBus, 240);
				this._noise(t, 0.14, 0.25 * v, 1500);
				break;
			case "explode":
				this._noise(t, 0.63, 0.65 * v, 1000);
				this._noise(t, 0.14, 0.28 * v, 2800);
				this._tone(115, t, 0.57, 0.6 * v, "sine", this.sfxBus, 24);
				this._tone(62, t + 0.055, 0.37, 0.3 * v, "triangle", this.sfxBus, 27);
				break;
			case "dash":
				this._noise(t, 0.22, 0.22 * v, 1900, "bandpass");
				this._tone(125, t, 0.2, 0.14 * v, "sawtooth", this.sfxBus, 420);
				break;
			case "pickup":
			case "respawn":
				[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
					this._tone(f, t + i * 0.065, 0.22, 0.15 * v, "triangle");
				});
				break;
			case "click":
				this._tone(620, t, 0.035, 0.12 * v, "triangle", this.sfxBus, 900);
				break;
			case "start":
				[261.63, 392, 523.25].forEach((f, i) => {
					this._tone(f, t + i * 0.11, 0.24, 0.2 * v, "square");
				});
				this._noise(t + 0.25, 0.15, 0.13 * v, 5500, "highpass");
				break;
			case "win":
				[523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5].forEach((f, i) => {
					this._tone(
						f,
						t + i * 0.145,
						i === 5 ? 0.6 : 0.23,
						0.18 * v,
						"triangle",
					);
					this._tone(f * 0.5, t + i * 0.145, 0.23, 0.055 * v, "square");
				});
				break;
			case "lose":
				[392, 349.23, 311.13, 261.63].forEach((f, i) => {
					this._tone(
						f,
						t + i * 0.17,
						0.34,
						0.19 * v,
						"triangle",
						this.sfxBus,
						f * 0.98,
					);
				});
				break;
			default:
				this._tone(440, t, 0.06, 0.1 * v, "triangle");
		}
	}

	voice(kind = "ready") {
		if (!this.ctx || this.ctx.currentTime - this.lastVoice < 0.75) return;
		const ctx = this.ctx;
		const start = ctx.currentTime + 0.02;
		this.lastVoice = ctx.currentTime;
		this.voices++;
		const phrase = {
			ready: [0, 5, 2, 7, 12],
			start: [0, 5, 2, 7, 12],
			win: [4, 7, 12, 9, 12, 16],
			lose: [5, 2, 0, -3],
			hit: [7, 0, -3],
			pickup: [0, 7, 12],
		}[kind] || [0, 3, 7, 2, 5];
		phrase.forEach((note, i) => {
			const time = start + i * 0.105;
			const length = i === phrase.length - 1 ? 0.16 : 0.085;
			const oscillator = ctx.createOscillator();
			oscillator.type = "sawtooth";
			const pitch = (kind === "lose" ? 148 : 205) * 2 ** (note / 12);
			oscillator.frequency.setValueAtTime(pitch, time);
			oscillator.frequency.exponentialRampToValueAtTime(
				pitch * (i % 2 ? 0.89 : 1.13),
				time + length,
			);
			const gain = ctx.createGain();
			gain.gain.setValueAtTime(0.0001, time);
			gain.gain.exponentialRampToValueAtTime(0.18, time + 0.012);
			gain.gain.exponentialRampToValueAtTime(0.0001, time + length);
			const vowel = i % 4;
			const formantA = ctx.createBiquadFilter();
			formantA.type = "bandpass";
			formantA.frequency.value = [710, 420, 850, 310][vowel];
			formantA.Q.value = 3;
			const formantB = ctx.createBiquadFilter();
			formantB.type = "bandpass";
			formantB.frequency.value = [1220, 2050, 1650, 980][vowel];
			formantB.Q.value = 4;
			oscillator.connect(formantA);
			oscillator.connect(formantB);
			formantA.connect(gain);
			formantB.connect(gain);
			gain.connect(this.voiceBus);
			oscillator.start(time);
			this._track(oscillator, time + length + 0.01, [formantA, formantB, gain]);
		});
	}

	_musicNote(step, t) {
		// A jaunty little toy-armour march: brushed drums, plucked bass, and brass bleeps.
		const bus = this.musicBus;
		const bar = Math.floor(step / 8) % 4;
		const root = [130.81, 130.81, 155.56, 116.54][bar];
		const eighth = step % 8;
		const bassRatio = [1, 0, 1.5, 0, 1, 0, 2, 1.5][eighth];
		if (bassRatio) {
			this._tone(root * bassRatio * 0.5, t, 0.19, 0.34, "triangle", bus);
			this._tone(root * bassRatio, t, 0.12, 0.075, "square", bus);
		}
		if (step % 4 === 0) this._tone(130, t, 0.14, 0.45, "sine", bus, 37);
		if (step % 4 === 2) {
			this._noise(t, 0.105, 0.22, 1800, "bandpass", bus);
			this._tone(180, t, 0.06, 0.1, "triangle", bus, 90);
		}
		this._noise(t, 0.035, step % 2 ? 0.075 : 0.11, 6500, "highpass", bus);
		const melody = [
			12, 0, 7, 0, 10, 7, 5, 0, 12, 0, 15, 12, 7, 0, 5, 7, 12, 0, 7, 0, 10, 7,
			5, 0, 7, 5, 3, 0, 2, 3, 7, 0,
		];
		const note = melody[step % 32];
		if (note) {
			const freq = root * 2 ** (note / 12);
			this._tone(
				freq,
				t + 0.012,
				0.19,
				0.15,
				"triangle",
				bus,
				freq * 0.996,
				0.012,
			);
			this._tone(
				freq * 2,
				t + 0.012,
				0.15,
				0.028,
				"square",
				bus,
				freq * 2,
				0.012,
			);
		}
	}

	update(_dt, _state) {
		if (!this.ctx || !this.musicPlaying || this.ctx.state === "closed") return;
		const now = this.ctx.currentTime;
		if (this.nextNote < now - 0.3) this.nextNote = now + 0.01;
		while (this.nextNote < now + 0.15) {
			this._musicNote(this.musicStep++, this.nextNote);
			this.nextNote += 60 / 112 / 2;
		}
	}

	inspect() {
		let peak = 0;
		if (this.analyser) {
			const samples = new Float32Array(this.analyser.fftSize);
			this.analyser.getFloatTimeDomainData(samples);
			for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
		}
		return {
			context: this.ctx?.state || "locked",
			musicVolume: this.musicVolume,
			sfxVolume: this.sfxVolume,
			muted: this.muted,
			musicPlaying: this.musicPlaying,
			musicStep: this.musicStep,
			voiceCount: this.voices,
			activeNodes: this.activeNodes,
			events: { ...this.events },
			peak,
		};
	}

	async dispose() {
		this.stopMusic();
		if (
			this.ctx &&
			this.ctx.state !== "closed" &&
			!("startRendering" in this.ctx)
		)
			await this.ctx.close();
	}
}
