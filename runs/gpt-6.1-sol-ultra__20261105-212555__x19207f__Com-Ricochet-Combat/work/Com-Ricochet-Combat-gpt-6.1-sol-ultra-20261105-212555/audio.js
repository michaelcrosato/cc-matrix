// Every sound in Com-Ricochet is synthesized here. No recorded audio is used.
export class GameAudio {
	constructor() {
		this.context = null;
		this.musicVolume = 0.1;
		this.sfxVolume = 0.65;
		this.muted = false;
		this.unlocked = false;
		this.voices = new Set();
		this.loops = [];
		this.events = {
			shot: 0,
			bounce: 0,
			hit: 0,
			boost: 0,
			ui: 0,
			round: 0,
			voice: 0,
			music: 0,
		};
		this.musicStep = 0;
		this.nextNote = 0;
		this.musicEnabled = true;
		this.playing = false;
		this.peak = 0;
		this.lastVoiceAt = -10;
		this.lastBounceAt = -10;
		this.bounceChain = 0;
		this.destroyed = false;
	}

	async unlock() {
		if (this.destroyed) return false;
		if (!this.context) {
			const AudioContext =
				globalThis.AudioContext || globalThis.webkitAudioContext;
			if (!AudioContext) return false;
			this.context = new AudioContext({ latencyHint: "interactive" });
			const ctx = this.context;
			this.master = ctx.createGain();
			this.master.gain.value = this.muted ? 0 : 0.72;
			this.compressor = ctx.createDynamicsCompressor();
			this.compressor.threshold.value = -15;
			this.compressor.knee.value = 18;
			this.compressor.ratio.value = 5;
			this.compressor.attack.value = 0.003;
			this.compressor.release.value = 0.18;
			this.analyser = ctx.createAnalyser();
			this.analyser.fftSize = 1024;
			this.samples = new Float32Array(this.analyser.fftSize);
			this.musicBus = ctx.createGain();
			this.musicBus.gain.value = this.musicVolume;
			this.sfxBus = ctx.createGain();
			this.sfxBus.gain.value = this.sfxVolume;
			this.musicBus.connect(this.master);
			this.sfxBus.connect(this.master);
			this.master.connect(this.compressor);
			this.compressor.connect(this.analyser);
			this.analyser.connect(ctx.destination);
			this.noiseBuffer = this._makeNoise(2);
			this._createEngine();
			this.nextNote = ctx.currentTime + 0.04;
		}
		try {
			if (this.context.state !== "running") await this.context.resume();
			this.unlocked = this.context.state === "running";
		} catch {
			this.unlocked = false;
		}
		return this.unlocked;
	}

	_makeNoise(seconds) {
		const ctx = this.context;
		const buffer = ctx.createBuffer(
			1,
			Math.ceil(ctx.sampleRate * seconds),
			ctx.sampleRate,
		);
		const data = buffer.getChannelData(0);
		let state = 0x1977cafe;
		let smooth = 0;
		for (let i = 0; i < data.length; i++) {
			state ^= state << 13;
			state ^= state >>> 17;
			state ^= state << 5;
			const white = (state >>> 0) / 2147483648 - 1;
			smooth = (smooth + white * 0.08) / 1.08;
			data[i] = white * 0.6 + smooth * 0.9;
		}
		return buffer;
	}

	_createEngine() {
		const ctx = this.context;
		this.engineGain = ctx.createGain();
		this.engineGain.gain.value = 0;
		const filter = ctx.createBiquadFilter();
		filter.type = "lowpass";
		filter.frequency.value = 280;
		filter.Q.value = 0.7;
		this.engineFilter = filter;
		this.engineOsc = ctx.createOscillator();
		this.engineOsc.type = "sawtooth";
		this.engineOsc.frequency.value = 38;
		this.engineSub = ctx.createOscillator();
		this.engineSub.type = "triangle";
		this.engineSub.frequency.value = 19;
		const subGain = ctx.createGain();
		subGain.gain.value = 0.8;
		this.engineOsc.connect(filter);
		this.engineSub.connect(subGain);
		subGain.connect(filter);
		filter.connect(this.engineGain);
		this.engineGain.connect(this.sfxBus);
		this.engineOsc.start();
		this.engineSub.start();
		this.loops.push(this.engineOsc, this.engineSub);
		this.airGain = ctx.createGain();
		this.airGain.gain.value = 0;
		this.airFilter = ctx.createBiquadFilter();
		this.airFilter.type = "bandpass";
		this.airFilter.frequency.value = 900;
		this.airFilter.Q.value = 0.6;
		const air = ctx.createBufferSource();
		air.buffer = this.noiseBuffer;
		air.loop = true;
		air.connect(this.airFilter);
		this.airFilter.connect(this.airGain);
		this.airGain.connect(this.sfxBus);
		air.start();
		this.loops.push(air);
	}

	_available() {
		return (
			this.unlocked && this.context?.state === "running" && !this.destroyed
		);
	}

	_smooth(param, value, seconds = 0.035) {
		if (!param || !this.context) return;
		param.cancelScheduledValues(this.context.currentTime);
		param.setTargetAtTime(value, this.context.currentTime, seconds);
	}

	setMusic(volume = 0.1) {
		this.musicVolume = Math.max(0, Math.min(1, Number(volume) || 0));
		this._smooth(this.musicBus?.gain, this.musicVolume);
	}

	setSfx(volume = 0.65) {
		this.sfxVolume = Math.max(0, Math.min(1, Number(volume) || 0));
		this._smooth(this.sfxBus?.gain, this.sfxVolume);
	}

	mute(value = true) {
		this.muted = Boolean(value);
		this._smooth(this.master?.gain, this.muted ? 0 : 0.72, 0.015);
	}

	_track(source, cleanup = []) {
		this.voices.add(source);
		source.onended = () => {
			this.voices.delete(source);
			source.disconnect();
			for (const node of cleanup) node.disconnect();
		};
	}

	_tone(frequency, duration, volume, options = {}) {
		if (!this._available()) return;
		const ctx = this.context;
		const at = Math.max(ctx.currentTime, options.at ?? ctx.currentTime);
		const osc = ctx.createOscillator();
		osc.type = options.type || "square";
		osc.frequency.setValueAtTime(Math.max(8, frequency), at);
		if (options.end)
			osc.frequency.exponentialRampToValueAtTime(
				Math.max(8, options.end),
				at + duration,
			);
		if (options.detune) osc.detune.value = options.detune;
		const envelope = ctx.createGain();
		envelope.gain.setValueAtTime(0.0001, at);
		envelope.gain.exponentialRampToValueAtTime(
			Math.max(0.0002, volume),
			at + (options.attack || 0.004),
		);
		envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);
		osc.connect(envelope);
		const cleanup = [envelope];
		let output = envelope;
		if (options.cutoff) {
			const filter = ctx.createBiquadFilter();
			filter.type = "lowpass";
			filter.frequency.value = options.cutoff;
			output.connect(filter);
			output = filter;
			cleanup.push(filter);
		}
		output.connect(options.music ? this.musicBus : this.sfxBus);
		this._track(osc, cleanup);
		osc.start(at);
		osc.stop(at + duration + 0.015);
	}

	_noise(duration, volume, options = {}) {
		if (!this._available()) return;
		const ctx = this.context;
		const at = Math.max(ctx.currentTime, options.at ?? ctx.currentTime);
		const source = ctx.createBufferSource();
		source.buffer = this.noiseBuffer;
		const filter = ctx.createBiquadFilter();
		filter.type = options.type || "lowpass";
		filter.frequency.setValueAtTime(options.frequency || 1200, at);
		if (options.end)
			filter.frequency.exponentialRampToValueAtTime(options.end, at + duration);
		filter.Q.value = options.q || 0.7;
		const envelope = ctx.createGain();
		envelope.gain.setValueAtTime(0.0001, at);
		envelope.gain.exponentialRampToValueAtTime(
			Math.max(0.0002, volume),
			at + 0.003,
		);
		envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);
		source.connect(filter);
		filter.connect(envelope);
		envelope.connect(options.music ? this.musicBus : this.sfxBus);
		this._track(source, [filter, envelope]);
		source.start(at, (at * 0.137) % 1);
		source.stop(at + duration + 0.01);
	}

	shot(team = 0) {
		if (!this._available()) return;
		this.events.shot++;
		this._tone(team ? 176 : 214, 0.16, 0.22, {
			type: "square",
			end: 45,
			cutoff: 1700,
		});
		this._noise(0.095, 0.27, { frequency: 3400, end: 500 });
		this._tone(team ? 790 : 960, 0.075, 0.055, { type: "triangle", end: 230 });
	}

	bounce() {
		if (
			!this._available() ||
			this.context.currentTime - this.lastBounceAt < 0.025
		)
			return;
		this.bounceChain =
			this.context.currentTime - this.lastBounceAt < 0.65
				? (this.bounceChain + 1) % 6
				: 0;
		this.lastBounceAt = this.context.currentTime;
		this.events.bounce++;
		const rise = 2 ** (this.bounceChain / 12);
		this._tone(1150 * rise, 0.12, 0.18, { type: "triangle", end: 640 * rise });
		this._tone(1730 * rise, 0.065, 0.06, { type: "sine", end: 1080 * rise });
		this._noise(0.035, 0.07, { type: "highpass", frequency: 2500 });
	}

	hit() {
		if (!this._available()) return;
		this.events.hit++;
		this._noise(0.48, 0.48, { frequency: 3300, end: 130 });
		this._tone(92, 0.42, 0.38, { type: "sine", end: 26 });
		this._tone(150, 0.23, 0.17, { type: "sawtooth", end: 35, cutoff: 800 });
		this._tone(375, 0.15, 0.08, {
			type: "square",
			end: 45,
			at: this.context.currentTime + 0.035,
		});
	}

	boost() {
		if (!this._available()) return;
		this.events.boost++;
		this._noise(0.4, 0.25, { type: "bandpass", frequency: 500, end: 2900 });
		this._tone(110, 0.28, 0.13, { type: "sawtooth", end: 430, cutoff: 1800 });
		this._tone(330, 0.31, 0.075, { type: "triangle", end: 990 });
	}

	ui() {
		if (!this._available()) return;
		this.events.ui++;
		this._tone(640, 0.055, 0.1, { type: "triangle", end: 980 });
	}

	round(win = true) {
		if (!this._available()) return;
		this.events.round++;
		const notes = win ? [60, 64, 67, 72, 76, 79] : [67, 65, 62, 59];
		const at = this.context.currentTime;
		for (let i = 0; i < notes.length; i++) {
			this._tone(
				this._hz(notes[i]),
				i === notes.length - 1 ? 0.65 : 0.15,
				0.15,
				{
					type: "square",
					at: at + i * 0.105,
					cutoff: 2400,
				},
			);
			this._tone(this._hz(notes[i] - 12), 0.25, 0.13, {
				type: "triangle",
				at: at + i * 0.105,
			});
		}
		this.voice(win ? 77 : 31);
	}

	voice(seed = 1) {
		if (!this._available() || this.context.currentTime - this.lastVoiceAt < 0.8)
			return;
		this.lastVoiceAt = this.context.currentTime;
		this.events.voice++;
		const ctx = this.context;
		let randomState = (Math.trunc(seed) ^ 0x19a71) >>> 0;
		const random = () => {
			randomState ^= randomState << 13;
			randomState ^= randomState >>> 17;
			randomState ^= randomState << 5;
			return (randomState >>> 0) / 4294967296;
		};
		// Tiny formant-synthesized syllables: playful radio chatter, never real words.
		const vowels = [
			[480, 1450],
			[780, 1150],
			[340, 2200],
			[420, 850],
			[650, 1850],
		];
		const syllables = 4 + Math.floor(random() * 3);
		let at = ctx.currentTime;
		for (let i = 0; i < syllables; i++) {
			const duration = 0.065 + random() * 0.05;
			const vowel = vowels[Math.floor(random() * vowels.length)];
			const osc = ctx.createOscillator();
			osc.type = "sawtooth";
			const pitch = 165 + random() * 125 + Math.sin(i * 1.9) * 45;
			osc.frequency.setValueAtTime(pitch, at);
			osc.frequency.exponentialRampToValueAtTime(
				pitch * (i % 2 ? 0.84 : 1.18),
				at + duration,
			);
			const envelope = ctx.createGain();
			envelope.gain.setValueAtTime(0.0001, at);
			envelope.gain.exponentialRampToValueAtTime(0.15, at + 0.009);
			envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);
			const formantA = ctx.createBiquadFilter();
			const formantB = ctx.createBiquadFilter();
			formantA.type = formantB.type = "bandpass";
			formantA.frequency.value = vowel[0];
			formantB.frequency.value = vowel[1];
			formantA.Q.value = 5;
			formantB.Q.value = 7;
			osc.connect(formantA);
			osc.connect(formantB);
			formantA.connect(envelope);
			formantB.connect(envelope);
			envelope.connect(this.sfxBus);
			this._track(osc, [envelope, formantA, formantB]);
			osc.start(at);
			osc.stop(at + duration + 0.015);
			this._noise(0.023, 0.055, { at, type: "bandpass", frequency: 2100 });
			at += duration + 0.018;
		}
		this._noise(0.035, 0.075, { type: "highpass", frequency: 2800 });
		this._noise(0.045, 0.07, { at, type: "highpass", frequency: 2800 });
	}

	_hz(midi) {
		return 440 * 2 ** ((midi - 69) / 12);
	}

	_music(at, step) {
		// Four-bar cartridge march: a plucked lead, square bass and brushed noise kit.
		const bar = Math.floor(step / 16) % 4;
		const beat = step % 16;
		const roots = [48, 45, 53, 55];
		const root = roots[bar];
		const melody = [
			12,
			null,
			19,
			16,
			null,
			19,
			24,
			null,
			21,
			null,
			19,
			16,
			14,
			null,
			16,
			19,
		];
		if (beat % 4 === 0 || beat === 10) {
			const note = root - 12 + (beat === 8 ? 7 : beat === 12 ? 12 : 0);
			this._tone(this._hz(note), 0.21, 0.28, {
				type: "triangle",
				at,
				music: true,
			});
			this._tone(this._hz(note), 0.08, 0.055, {
				type: "square",
				at,
				music: true,
				cutoff: 900,
			});
		}
		if (melody[beat] !== null) {
			this._tone(this._hz(root + melody[beat]), 0.135, 0.15, {
				type: "square",
				at,
				music: true,
				cutoff: 2900,
			});
			this._tone(this._hz(root + melody[beat] + 12), 0.08, 0.035, {
				type: "triangle",
				at,
				music: true,
			});
		}
		if (beat % 8 === 0) {
			this._tone(100, 0.13, 0.45, { type: "sine", end: 35, at, music: true });
		}
		if (beat % 8 === 4) {
			this._noise(0.12, 0.2, {
				type: "highpass",
				frequency: 1200,
				at,
				music: true,
			});
			this._tone(190, 0.07, 0.07, {
				type: "triangle",
				end: 90,
				at,
				music: true,
			});
		}
		if (beat % 2 === 0)
			this._noise(0.035, beat % 4 ? 0.075 : 0.11, {
				type: "highpass",
				frequency: 6100,
				at,
				music: true,
			});
		this.events.music++;
	}

	update(_dt, { moving = 0, flying = false, playing = false } = {}) {
		this.playing = Boolean(playing);
		if (!this._available()) return;
		const ctx = this.context;
		const amount = Math.min(1, Math.max(0, Math.abs(Number(moving) || 0)));
		this.engineGain.gain.setTargetAtTime(
			playing ? 0.018 + amount * 0.055 : 0,
			ctx.currentTime,
			0.06,
		);
		this.engineOsc.frequency.setTargetAtTime(
			(flying ? 62 : 32) + amount * (flying ? 85 : 43),
			ctx.currentTime,
			0.055,
		);
		this.engineSub.frequency.setTargetAtTime(
			(flying ? 31 : 16) + amount * (flying ? 42.5 : 21.5),
			ctx.currentTime,
			0.055,
		);
		this.engineFilter.frequency.setTargetAtTime(
			(flying ? 600 : 240) + amount * 600,
			ctx.currentTime,
			0.08,
		);
		this.airGain.gain.setTargetAtTime(
			playing && flying ? 0.015 + amount * 0.045 : 0,
			ctx.currentTime,
			0.07,
		);
		this.airFilter.frequency.setTargetAtTime(
			650 + amount * 1600,
			ctx.currentTime,
			0.09,
		);
		if (this.musicEnabled) {
			const stepLength = 60 / 116 / 4;
			if (this.nextNote < ctx.currentTime - 0.1)
				this.nextNote = ctx.currentTime + 0.02;
			while (this.nextNote < ctx.currentTime + 0.12) {
				this._music(this.nextNote, this.musicStep++);
				this.nextNote += stepLength;
			}
		}
	}

	inspect() {
		let rms = 0;
		let peak = 0;
		if (this.analyser && this.samples) {
			this.analyser.getFloatTimeDomainData(this.samples);
			for (const sample of this.samples) {
				rms += sample * sample;
				peak = Math.max(peak, Math.abs(sample));
			}
			rms = Math.sqrt(rms / this.samples.length);
			this.peak = Math.max(this.peak, peak);
		}
		return {
			available: Boolean(
				globalThis.AudioContext || globalThis.webkitAudioContext,
			),
			unlocked: this.unlocked,
			state: this.context?.state || "locked",
			musicVolume: this.musicVolume,
			sfxVolume: this.sfxVolume,
			muted: this.muted,
			rms,
			peak,
			peakObserved: this.peak,
			activeVoices: this.voices.size,
			musicStep: this.musicStep,
			events: { ...this.events },
			procedural: true,
		};
	}

	stop() {
		for (const source of this.voices) {
			try {
				source.stop();
			} catch {
				/* A voice may have ended between frames. */
			}
		}
		this.voices.clear();
		this._smooth(this.engineGain?.gain, 0, 0.01);
		this._smooth(this.airGain?.gain, 0, 0.01);
		this.musicEnabled = false;
		this.playing = false;
	}

	async suspend() {
		this.stop();
		if (this.context?.state === "running") await this.context.suspend();
	}

	async resume() {
		this.musicEnabled = true;
		const ok = await this.unlock();
		if (this.context) this.nextNote = this.context.currentTime + 0.02;
		return ok;
	}

	async destroy() {
		this.stop();
		this.destroyed = true;
		for (const loop of this.loops) {
			try {
				loop.stop();
			} catch {
				/* Already stopped. */
			}
			loop.disconnect();
		}
		this.loops.length = 0;
		if (this.context && this.context.state !== "closed")
			await this.context.close();
		this.unlocked = false;
	}
}
