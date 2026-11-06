/* All sound is synthesized here; no samples, speech services, or audio files. */
class SynthAudio {
	constructor() {
		this.ctx = null;
		this.musicVolume = 0.1;
		this.sfxVolume = 0.7;
		this.muted = false;
		this.paused = false;
		this.intensity = 1;
		this.playing = false;
		this.nextStep = 0;
		this.step = 0;
		this.bpm = 110;
		this.nodes = new Set();
		this.lastSounds = new Map();
		this.metrics = {
			unlocked: false,
			events: 0,
			musicSteps: 0,
			voices: 0,
			rms: 0,
		};
	}

	_attach(ctx) {
		this.ctx = ctx;
		this.musicBus = ctx.createGain();
		this.sfxBus = ctx.createGain();
		this.master = ctx.createGain();
		this.compressor = ctx.createDynamicsCompressor();
		this.compressor.threshold.value = -12;
		this.compressor.knee.value = 12;
		this.compressor.ratio.value = 5;
		this.compressor.attack.value = 0.003;
		this.compressor.release.value = 0.12;
		this.analyser = ctx.createAnalyser();
		this.analyser.fftSize = 512;
		this.levelData = new Float32Array(this.analyser.fftSize);
		this.musicBus.connect(this.master);
		this.sfxBus.connect(this.master);
		this.master.connect(this.compressor);
		this.compressor.connect(this.analyser);
		this.analyser.connect(ctx.destination);
		this.musicBus.gain.value = this.musicVolume;
		this.sfxBus.gain.value = this.sfxVolume;
		this.master.gain.value = this.muted || this.paused ? 0 : 0.75;
		this.noiseBuffer = ctx.createBuffer(
			1,
			Math.ceil(ctx.sampleRate),
			ctx.sampleRate,
		);
		const noise = this.noiseBuffer.getChannelData(0);
		let seed = 65537;
		for (let i = 0; i < noise.length; i++) {
			seed = (seed * 16807) % 2147483647;
			noise[i] = (seed / 2147483647) * 2 - 1;
		}
		this.nextStep = ctx.currentTime + 0.035;
	}

	async unlock() {
		try {
			if (!this.ctx) {
				const Context =
					globalThis.AudioContext || globalThis.webkitAudioContext;
				if (!Context) return false;
				this._attach(new Context());
			}
			if (this.ctx.state === "suspended") await this.ctx.resume();
			this.metrics.unlocked = this.ctx.state === "running";
			this.nextStep = this.ctx.currentTime + 0.035;
			return this.metrics.unlocked;
		} catch (error) {
			this.metrics.error = String(error);
			return false;
		}
	}

	_gain(node, value) {
		if (!node || !this.ctx) return;
		node.gain.cancelScheduledValues(this.ctx.currentTime);
		node.gain.setTargetAtTime(value, this.ctx.currentTime, 0.015);
	}

	setMusic(volume) {
		this.musicVolume = Math.max(0, Math.min(1, Number(volume) || 0));
		this._gain(this.musicBus, this.musicVolume);
	}

	setSfx(volume) {
		this.sfxVolume = Math.max(0, Math.min(1, Number(volume) || 0));
		this._gain(this.sfxBus, this.sfxVolume);
	}

	setMuted(value) {
		this.muted = !!value;
		this._gain(this.master, this.muted || this.paused ? 0 : 0.75);
	}

	setPaused(value) {
		const next = !!value;
		if (next === this.paused) return;
		this.paused = next;
		if (this.ctx) {
			this._gain(this.master, this.muted || next ? 0 : 0.75);
			if (next) this._stopAll();
			this.nextStep = this.ctx.currentTime + 0.04;
		}
	}

	setIntensity(wave) {
		this.intensity = Math.max(1, Math.min(12, Number(wave) || 1));
	}

	_stopAll() {
		for (const source of this.nodes) {
			try {
				source.stop();
			} catch (_) {
				/* A source may have finished this frame. */
			}
		}
		this.nodes.clear();
	}

	_remember(source, end) {
		this.nodes.add(source);
		source.onended = () => {
			this.nodes.delete(source);
			source.disconnect();
		};
		source.stop(end);
	}

	_tone(freq, duration, type, volume, time, bus, endFreq, pan = 0) {
		const ctx = this.ctx;
		if (!ctx || !Number.isFinite(freq)) return;
		const oscillator = ctx.createOscillator();
		const envelope = ctx.createGain();
		const stereo = ctx.createStereoPanner();
		const start = Math.max(ctx.currentTime, time);
		oscillator.type = type;
		oscillator.frequency.setValueAtTime(Math.max(20, freq), start);
		if (endFreq)
			oscillator.frequency.exponentialRampToValueAtTime(
				Math.max(20, endFreq),
				start + duration,
			);
		envelope.gain.setValueAtTime(0.0001, start);
		envelope.gain.exponentialRampToValueAtTime(
			Math.max(0.0002, volume),
			start + Math.min(0.008, duration * 0.12),
		);
		envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
		stereo.pan.value = Math.max(-1, Math.min(1, pan));
		oscillator.connect(envelope);
		envelope.connect(stereo);
		stereo.connect(bus || this.sfxBus);
		oscillator.start(start);
		this._remember(oscillator, start + duration + 0.02);
		oscillator.addEventListener(
			"ended",
			() => {
				envelope.disconnect();
				stereo.disconnect();
			},
			{ once: true },
		);
	}

	_noise(
		duration,
		volume,
		time,
		frequency = 1400,
		bus = this.sfxBus,
		highpass = false,
	) {
		const ctx = this.ctx;
		const source = ctx.createBufferSource();
		const filter = ctx.createBiquadFilter();
		const envelope = ctx.createGain();
		const start = Math.max(ctx.currentTime, time);
		source.buffer = this.noiseBuffer;
		filter.type = highpass ? "highpass" : "lowpass";
		filter.frequency.setValueAtTime(frequency, start);
		filter.frequency.exponentialRampToValueAtTime(
			highpass ? Math.max(400, frequency * 0.5) : 90,
			start + duration,
		);
		filter.Q.value = 0.6;
		envelope.gain.setValueAtTime(Math.max(0.0002, volume), start);
		envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
		source.connect(filter);
		filter.connect(envelope);
		envelope.connect(bus);
		source.start(start);
		this._remember(source, start + duration + 0.02);
		source.addEventListener(
			"ended",
			() => {
				filter.disconnect();
				envelope.disconnect();
			},
			{ once: true },
		);
	}

	_voice(time, mood = "wave") {
		const ctx = this.ctx;
		const patterns = {
			wave: [
				[0, 260, 0],
				[0.1, 370, 2],
				[0.21, 310, 1],
				[0.34, 460, 3],
			],
			boss: [
				[0, 130, 3],
				[0.15, 170, 0],
				[0.29, 145, 2],
				[0.43, 105, 1],
			],
			win: [
				[0, 330, 1],
				[0.1, 440, 0],
				[0.21, 550, 3],
				[0.35, 660, 2],
				[0.49, 440, 0],
			],
		};
		const vowels = [
			[750, 1150],
			[380, 2100],
			[320, 850],
			[550, 1550],
		];
		for (const [delay, base, vowel] of patterns[mood] || patterns.wave) {
			const start = Math.max(ctx.currentTime, time + delay);
			const source = ctx.createOscillator();
			source.type = "sawtooth";
			source.frequency.setValueAtTime(base, start);
			source.frequency.exponentialRampToValueAtTime(base * 1.16, start + 0.055);
			source.frequency.exponentialRampToValueAtTime(base * 0.86, start + 0.11);
			const envelope = ctx.createGain();
			envelope.gain.setValueAtTime(0.0001, start);
			envelope.gain.exponentialRampToValueAtTime(0.1, start + 0.012);
			envelope.gain.exponentialRampToValueAtTime(0.0001, start + 0.12);
			const filters = vowels[vowel].map((frequency) => {
				const filter = ctx.createBiquadFilter();
				filter.type = "bandpass";
				filter.frequency.value = frequency;
				filter.Q.value = 5;
				source.connect(filter);
				filter.connect(envelope);
				return filter;
			});
			envelope.connect(this.sfxBus);
			source.start(start);
			this._remember(source, start + 0.14);
			source.addEventListener(
				"ended",
				() => {
					filters.forEach((filter) => filter.disconnect());
					envelope.disconnect();
				},
				{ once: true },
			);
		}
		this.metrics.voices++;
	}

	_sound(name, time, pitch = 1) {
		const p = Math.max(0.25, Math.min(4, Number(pitch) || 1));
		const tone = (f, d, type, v, offset = 0, end, pan = 0) =>
			this._tone(
				f * p,
				d,
				type,
				v,
				time + offset,
				this.sfxBus,
				end ? end * p : undefined,
				pan,
			);
		switch (name) {
			case "shoot":
				tone(1250, 0.085, "square", 0.065, 0, 430);
				tone(2100, 0.035, "sine", 0.055, 0, 850);
				break;
			case "hit":
				tone(560, 0.07, "triangle", 0.19, 0, 150);
				this._noise(0.055, 0.11, time, 2600);
				break;
			case "explode":
				this._noise(0.33, 0.24, time, 3800);
				tone(150, 0.3, "sawtooth", 0.15, 0, 28);
				tone(390, 0.13, "square", 0.08, 0.02, 70);
				break;
			case "split":
				tone(320, 0.15, "square", 0.12, 0, 900, -0.6);
				tone(480, 0.18, "square", 0.1, 0.04, 1300, 0.6);
				this._noise(0.1, 0.11, time, 2700);
				break;
			case "dive":
				tone(1100, 0.42, "sawtooth", 0.1, 0, 90);
				tone(1150, 0.37, "triangle", 0.1, 0.025, 70);
				break;
			case "hurt":
				this._noise(0.26, 0.27, time, 1900);
				tone(220, 0.3, "sawtooth", 0.18, 0, 45);
				tone(185, 0.3, "square", 0.09, 0.03, 38);
				break;
			case "shield":
				tone(130, 0.36, "triangle", 0.16, 0, 900);
				[0, 0.055, 0.11, 0.165].forEach((d, i) =>
					tone(
						390 + i * 150,
						0.2,
						"sine",
						0.12,
						d,
						1100 + i * 100,
						i % 2 ? 0.5 : -0.5,
					),
				);
				this._noise(0.2, 0.15, time, 4200, this.sfxBus, true);
				break;
			case "wave":
				[0, 3, 7, 12].forEach((n, i) =>
					tone(220 * 2 ** (n / 12), 0.19, "triangle", 0.13, i * 0.075),
				);
				this._voice(time + 0.3, "wave");
				break;
			case "boss":
				[0, 0.13, 0.26].forEach((d, i) => {
					tone(98 - i * 8, 0.32, "sawtooth", 0.16, d, 48);
					this._noise(0.18, 0.16, time + d, 1000);
				});
				this._voice(time + 0.43, "boss");
				break;
			case "win":
				[0, 4, 7, 12, 7, 12, 16, 19].forEach((n, i) =>
					tone(
						330 * 2 ** (n / 12),
						0.3,
						"triangle",
						0.13,
						i * 0.11,
						undefined,
						i % 2 ? 0.3 : -0.3,
					),
				);
				this._voice(time + 0.8, "win");
				break;
			case "pickup":
				[0, 7, 12].forEach((n, i) =>
					tone(660 * 2 ** (n / 12), 0.16, "sine", 0.15, i * 0.065),
				);
				break;
			case "menu":
				tone(620, 0.045, "triangle", 0.12, 0, 810);
				break;
			default:
				tone(440, 0.09, "triangle", 0.08);
		}
		this.metrics.events++;
	}

	sfx(name, pitch = 1) {
		if (!this.ctx || this.ctx.state !== "running" || this.muted || this.paused)
			return;
		const now = this.ctx.currentTime;
		const interval =
			name === "shoot"
				? 0.045
				: name === "hit"
					? 0.025
					: name === "menu"
						? 0.05
						: 0.01;
		if (now - (this.lastSounds.get(name) ?? -Infinity) < interval) return;
		this.lastSounds.set(name, now);
		this._sound(name, now + 0.002, pitch);
	}

	_scheduleStep(step, time) {
		const sixteenth = 60 / this.bpm / 4;
		const beat = step % 16;
		const bar = Math.floor(step / 16) % 8;
		const roots = [45, 45, 41, 41, 50, 50, 40, 40];
		const root = roots[bar];
		const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
		const bus = this.musicBus;
		// A springy ostinato and a tiny music-box answer keep the menace playful.
		if (beat % 2 === 0) {
			const bass =
				root + (beat === 6 || beat === 14 ? 12 : beat === 10 ? 7 : 0);
			this._tone(
				hz(bass),
				sixteenth * 1.5,
				"triangle",
				0.38,
				time,
				bus,
				hz(bass) * 0.985,
			);
			this._tone(hz(bass) / 2, sixteenth * 1.3, "sine", 0.25, time, bus);
		}
		const chord = bar === 6 || bar === 7 ? [0, 4, 7, 11] : [0, 3, 7, 10];
		const sequence = [0, 2, 1, 3, 2, 1, 3, 2, 0, 2, 1, 2, 3, 1, 2, 3];
		if (beat % 2 === 1 || this.intensity >= 4) {
			const note = root + 24 + chord[sequence[beat]];
			this._tone(
				hz(note),
				sixteenth * 1.35,
				"triangle",
				0.16,
				time,
				bus,
				undefined,
				((beat % 4) - 1.5) * 0.32,
			);
			this._tone(hz(note) * 2.002, sixteenth * 0.6, "sine", 0.055, time, bus);
			// A single quiet echo creates space without a sample or convolution file.
			this._tone(
				hz(note),
				sixteenth * 1.4,
				"triangle",
				0.045,
				time + sixteenth * 3,
				bus,
				undefined,
				(1.5 - (beat % 4)) * 0.32,
			);
		}
		if (beat === 0 || beat === 8 || (this.intensity >= 5 && beat === 11)) {
			this._tone(135, 0.15, "sine", 0.65, time, bus, 38);
			this._noise(0.025, 0.11, time, 1300, bus);
		}
		if (beat === 4 || beat === 12) {
			this._noise(0.13, 0.3, time, 3200, bus, true);
			this._tone(185, 0.07, "triangle", 0.19, time, bus, 110);
		}
		if (beat % 2 === 0 || this.intensity >= 3)
			this._noise(
				beat === 14 ? 0.1 : 0.035,
				beat % 4 === 0 ? 0.11 : 0.065,
				time,
				6000,
				bus,
				true,
			);
		if (bar % 2 === 1 && [10, 12, 14].includes(beat)) {
			const note = hz(root + 36 + [7, 3, 0][(beat - 10) / 2]);
			this._tone(note, 0.21, "sine", 0.14, time, bus, undefined, 0.35);
		}
		this.metrics.musicSteps++;
	}

	tick(dt, playing = true) {
		if (!this.ctx || this.ctx.state !== "running") return;
		if (this.playing !== !!playing) {
			this.playing = !!playing;
			this._gain(this.musicBus, playing ? this.musicVolume : 0);
			this.nextStep = this.ctx.currentTime + 0.035;
		}
		if (this.paused || this.muted || !playing) {
			this.nextStep = this.ctx.currentTime + 0.035;
			this.metrics.rms = 0;
			return;
		}
		const now = this.ctx.currentTime;
		if (this.nextStep < now - 0.1) this.nextStep = now + 0.025;
		while (this.nextStep < now + 0.12) {
			this._scheduleStep(this.step++, this.nextStep);
			this.nextStep += 60 / this.bpm / 4;
		}
		this.analyser.getFloatTimeDomainData(this.levelData);
		let square = 0;
		for (const value of this.levelData) square += value * value;
		this.metrics.rms = Math.sqrt(square / this.levelData.length);
	}

	close() {
		this._stopAll();
		if (this.ctx && typeof this.ctx.close === "function") this.ctx.close();
		this.ctx = null;
		this.metrics.unlocked = false;
	}

	static async renderTest(sampleRate = 22050) {
		const Offline =
			globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
		if (!Offline) return { supported: false, rms: 0, peak: 0 };
		const duration = 3;
		const ctx = new Offline(2, sampleRate * duration, sampleRate);
		const synth = new SynthAudio();
		synth._attach(ctx);
		synth.setIntensity(5);
		for (let step = 0; step < 20; step++)
			synth._scheduleStep(step, 0.01 + (step * 60) / 110 / 4);
		[
			"shoot",
			"hit",
			"explode",
			"split",
			"dive",
			"shield",
			"pickup",
			"wave",
		].forEach((name, index) => synth._sound(name, 0.05 + index * 0.3));
		const buffer = await ctx.startRendering();
		let squares = 0;
		let peak = 0;
		let nonzero = 0;
		for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
			for (const value of buffer.getChannelData(channel)) {
				squares += value * value;
				peak = Math.max(peak, Math.abs(value));
				if (Math.abs(value) > 0.00001) nonzero++;
			}
		}
		return {
			supported: true,
			rms: Math.sqrt(squares / (buffer.length * buffer.numberOfChannels)),
			peak,
			nonzero,
			duration,
			musicSteps: synth.metrics.musicSteps,
			voices: synth.metrics.voices,
			events: synth.metrics.events,
		};
	}
}
