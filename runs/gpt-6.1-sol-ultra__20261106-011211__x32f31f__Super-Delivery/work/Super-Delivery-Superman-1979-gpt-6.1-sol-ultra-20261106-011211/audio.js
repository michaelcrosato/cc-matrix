// Original procedural score, sound effects and little comic-book chatter.
// No audio assets, network requests, intervals or wall-clock timers.
export class AudioDirector {
	constructor(options = {}) {
		this.ctx = options.context || null;
		this.musicVolume = 0.1;
		this.muted = false;
		this.mode = "title";
		this.step = 0;
		this.nextBeat = 0;
		this.beatLength = 60 / 112 / 4;
		this.events = {};
		this.notesPlayed = 0;
		this.voiceCount = 0;
		this.sfxCount = 0;
		this.ready = false;
		this.lastSpeak = -10;
		if (this.ctx) this._build();
	}

	async unlock() {
		if (!this.ctx) {
			const AudioContextClass =
				globalThis.AudioContext || globalThis.webkitAudioContext;
			if (!AudioContextClass) return false;
			this.ctx = new AudioContextClass();
			this._build();
		}
		if (this.ctx.state === "suspended" && this.ctx.resume)
			await this.ctx.resume();
		this.nextBeat = Math.max(this.nextBeat, this.ctx.currentTime + 0.035);
		return this.ctx.state !== "closed";
	}

	_build() {
		if (this.ready) return;
		const c = this.ctx;
		this.master = c.createGain();
		this.master.gain.value = this.muted ? 0 : 0.72;
		this.compressor = c.createDynamicsCompressor();
		this.compressor.threshold.value = -15;
		this.compressor.knee.value = 12;
		this.compressor.ratio.value = 4;
		this.compressor.attack.value = 0.006;
		this.compressor.release.value = 0.15;
		this.analyser = c.createAnalyser();
		this.analyser.fftSize = 1024;
		this.levelData = new Float32Array(1024);
		this.master
			.connect(this.compressor)
			.connect(this.analyser)
			.connect(c.destination);
		this.musicBus = c.createGain();
		this.musicBus.gain.value = this.musicVolume;
		this.musicBus.connect(this.master);
		this.fxBus = c.createGain();
		this.fxBus.gain.value = 0.6;
		this.fxBus.connect(this.master);
		const count = Math.ceil(c.sampleRate * 2);
		this.noiseBuffer = c.createBuffer(1, count, c.sampleRate);
		const noise = this.noiseBuffer.getChannelData(0);
		let seed = 1979;
		for (let i = 0; i < count; i++) {
			seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
			noise[i] = (seed / 4294967296) * 2 - 1;
		}
		this.wind = c.createBufferSource();
		this.wind.buffer = this.noiseBuffer;
		this.wind.loop = true;
		this.windFilter = c.createBiquadFilter();
		this.windFilter.type = "lowpass";
		this.windFilter.frequency.value = 400;
		this.windGain = c.createGain();
		this.windGain.gain.value = 0;
		this.wind
			.connect(this.windFilter)
			.connect(this.windGain)
			.connect(this.fxBus);
		this.wind.start();
		this.nextBeat = c.currentTime + 0.035;
		this.ready = true;
	}

	_target(param, value, time = 0.04) {
		const now = this.ctx.currentTime;
		param.cancelScheduledValues(now);
		param.setTargetAtTime(value, now, time);
	}

	setMusicVolume(value) {
		this.musicVolume = Math.min(1, Math.max(0, Number(value) || 0));
		if (this.ready)
			this._target(this.musicBus.gain, this._paused() ? 0 : this.musicVolume);
	}

	setMuted(muted) {
		this.muted = Boolean(muted);
		if (this.ready) {
			this._target(this.master.gain, this.muted ? 0 : 0.72);
			this.nextBeat = this.ctx.currentTime + 0.035;
		}
	}

	_paused() {
		return ["pause", "paused", "dev", "settings", "about"].includes(this.mode);
	}

	setMode(mode) {
		const wasPaused = this._paused();
		this.mode = mode;
		if (!this.ready) return;
		this._target(this.musicBus.gain, this._paused() ? 0 : this.musicVolume);
		if (this._paused()) this._target(this.windGain.gain, 0);
		if (wasPaused && !this._paused())
			this.nextBeat = this.ctx.currentTime + 0.035;
	}

	_tone(
		frequency,
		time,
		duration,
		volume,
		type = "triangle",
		bus = this.fxBus,
		endFrequency = null,
	) {
		const c = this.ctx;
		const osc = c.createOscillator();
		const gain = c.createGain();
		osc.type = type;
		osc.frequency.setValueAtTime(Math.max(20, frequency), time);
		if (endFrequency)
			osc.frequency.exponentialRampToValueAtTime(
				Math.max(20, endFrequency),
				time + duration,
			);
		gain.gain.setValueAtTime(0, time);
		gain.gain.linearRampToValueAtTime(
			volume,
			time + Math.min(0.009, duration / 4),
		);
		gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
		osc.connect(gain).connect(bus);
		osc.start(time);
		osc.stop(time + duration + 0.025);
		osc.onended = () => {
			osc.disconnect();
			gain.disconnect();
		};
		return { osc, gain };
	}

	_noise(
		time,
		duration,
		volume,
		frequency = 1200,
		bus = this.fxBus,
		highpass = false,
	) {
		const c = this.ctx;
		const source = c.createBufferSource();
		source.buffer = this.noiseBuffer;
		const filter = c.createBiquadFilter();
		filter.type = highpass ? "highpass" : "lowpass";
		filter.frequency.value = frequency;
		const gain = c.createGain();
		gain.gain.setValueAtTime(volume, time);
		gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
		source.connect(filter).connect(gain).connect(bus);
		source.start(time, 0, duration);
		source.onended = () => {
			source.disconnect();
			filter.disconnect();
			gain.disconnect();
		};
	}

	_note(midi, time, duration, volume, instrument) {
		const f = 440 * Math.pow(2, (midi - 69) / 12);
		this.notesPlayed++;
		if (instrument === "brass") {
			const c = this.ctx;
			const osc = c.createOscillator();
			const filter = c.createBiquadFilter();
			const gain = c.createGain();
			osc.type = "sawtooth";
			osc.frequency.value = f;
			filter.type = "lowpass";
			filter.Q.value = 0.7;
			filter.frequency.setValueAtTime(700, time);
			filter.frequency.linearRampToValueAtTime(2600, time + 0.035);
			filter.frequency.exponentialRampToValueAtTime(500, time + duration);
			gain.gain.setValueAtTime(0, time);
			gain.gain.linearRampToValueAtTime(volume, time + 0.025);
			gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
			osc.connect(filter).connect(gain).connect(this.musicBus);
			osc.start(time);
			osc.stop(time + duration + 0.02);
			osc.onended = () => {
				osc.disconnect();
				filter.disconnect();
				gain.disconnect();
			};
		} else if (instrument === "bell") {
			this._tone(f, time, duration, volume, "sine", this.musicBus);
			this._tone(
				f * 2.98,
				time,
				duration * 0.45,
				volume * 0.12,
				"sine",
				this.musicBus,
			);
		} else {
			this._tone(
				f,
				time,
				duration,
				volume,
				instrument === "bass" ? "triangle" : "sine",
				this.musicBus,
			);
		}
	}

	_musicStep(step, t) {
		const bar = Math.floor(step / 16) % 8;
		const s = step % 16;
		// Original eight-bar D-major city theme, with a small stride-jazz bounce.
		const chords = [
			[50, 54, 57, 61],
			[47, 50, 54, 57],
			[43, 47, 50, 54],
			[45, 49, 52, 55],
			[40, 43, 47, 50],
			[43, 47, 50, 54],
			[45, 49, 52, 55],
			[38, 42, 45, 49],
		];
		const chord = chords[bar];
		const lead = [
			[74, 0, 0, 73, 74, 0, 78, 0, 81, 0, 0, 78, 76, 0, 74, 0],
			[78, 0, 0, 76, 74, 0, 73, 0, 71, 0, 74, 0, 78, 0, 0, 0],
			[79, 0, 0, 78, 76, 0, 74, 0, 71, 0, 0, 74, 76, 0, 78, 0],
			[76, 0, 73, 0, 69, 0, 0, 73, 76, 0, 78, 0, 76, 0, 0, 0],
			[76, 0, 0, 74, 71, 0, 67, 0, 71, 0, 0, 74, 76, 0, 78, 0],
			[79, 0, 0, 78, 76, 0, 74, 0, 71, 0, 74, 0, 79, 0, 0, 0],
			[81, 0, 0, 79, 78, 0, 76, 0, 73, 0, 76, 0, 81, 0, 0, 0],
			[78, 0, 76, 0, 74, 0, 0, 0, 0, 0, 0, 0, 69, 0, 73, 0],
		];
		const title = this.mode === "title" || this.mode === "menu";
		if (s % 4 === 0) {
			this._note(chord[s === 8 ? 2 : 0] - 12, t, 0.28, 0.7, "bass");
			this._tone(110, t, 0.12, 0.32, "sine", this.musicBus, 38);
		}
		if (s === 4 || s === 12)
			this._noise(t, 0.12, 0.13, 1700, this.musicBus, true);
		if (s % 2 === 0)
			this._noise(
				t,
				0.034,
				s % 4 === 2 ? 0.04 : 0.022,
				6500,
				this.musicBus,
				true,
			);
		if (s === 2 || s === 7 || s === 10 || s === 15) {
			chord
				.slice(1)
				.forEach((midi, i) =>
					this._note(midi + 12, t + i * 0.004, 0.21, 0.075, "bell"),
				);
		}
		if (lead[bar][s])
			this._note(
				lead[bar][s],
				t,
				s % 4 === 0 ? 0.29 : 0.17,
				title ? 0.19 : 0.28,
				"brass",
			);
	}

	update(dt, state = {}) {
		if (
			!this.ready ||
			this.ctx.state === "closed" ||
			this.muted ||
			this._paused()
		)
			return;
		const now = this.ctx.currentTime;
		if (this.ctx.state === "suspended" && !this.ctx.startRendering) return;
		const speed = Math.max(0, Math.min(1, (Number(state.speed) || 0) / 25));
		const flying = Boolean(state.flying);
		this._target(this.windGain.gain, flying ? 0.015 + speed * 0.11 : 0, 0.12);
		this._target(this.windFilter.frequency, 250 + speed * 1500, 0.15);
		if (this.nextBeat < now - 0.5) this.nextBeat = now + 0.02;
		let guard = 0;
		while (this.nextBeat < now + 0.13 && guard++ < 8) {
			const swing = this.step % 2 ? 0.016 : 0;
			this._musicStep(this.step, this.nextBeat + swing);
			this.step++;
			this.nextBeat += this.beatLength;
		}
	}

	sfx(name) {
		if (!this.ready || this.muted || this.ctx.state === "closed") return;
		this.events[name] = (this.events[name] || 0) + 1;
		this.sfxCount++;
		const t = this.ctx.currentTime + 0.008;
		const tone = (f, d, v, type = "triangle", offset = 0, end = null) =>
			this._tone(f, t + offset, d, v, type, this.fxBus, end);
		if (name === "launch") {
			this._noise(t, 0.48, 0.23, 1700);
			tone(180, 0.32, 0.18, "triangle", 0, 720);
			tone(370, 0.35, 0.12, "sine", 0.06, 960);
		} else if (name === "pickup") {
			tone(360, 0.12, 0.18, "triangle");
			tone(540, 0.2, 0.18, "triangle", 0.075);
			this._noise(t, 0.09, 0.13, 600);
		} else if (name === "deliver") {
			[587.33, 739.99, 880, 1174.66].forEach((f, i) =>
				tone(f, 0.24, 0.14, "triangle", i * 0.075),
			);
			this._noise(t + 0.22, 0.18, 0.15, 1000);
		} else if (name === "scan") {
			[0, 0.12, 0.24].forEach((o, i) =>
				tone(1200 - i * 180, 0.23, 0.09, "sine", o, 350 + i * 130),
			);
		} else if (name === "hit") {
			this._noise(t, 0.4, 0.22, 1200);
			tone(200, 0.45, 0.23, "sawtooth", 0, 48);
		} else if (name === "heal") {
			[440, 554.37, 659.25, 880].forEach((f, i) =>
				tone(f, 0.4, 0.14, "sine", i * 0.09),
			);
		} else if (name === "transform") {
			this._noise(t, 0.35, 0.2, 4000, this.fxBus, true);
			[293.66, 440, 587.33, 880, 1174.66].forEach((f, i) =>
				tone(f, 0.27, 0.13, "triangle", i * 0.055),
			);
		} else if (name === "subway") {
			this._noise(t, 0.6, 0.23, 800);
			tone(330, 0.5, 0.1, "sine", 0, 120);
			tone(659, 0.25, 0.15, "sine", 0.2);
			tone(523, 0.27, 0.15, "sine", 0.48);
		} else if (name === "win") {
			[587.33, 739.99, 880, 1174.66, 1108.73, 1174.66].forEach((f, i) =>
				tone(f, i === 5 ? 0.9 : 0.25, 0.18, "triangle", i * 0.15),
			);
			[146.83, 220, 293.66].forEach((f) => tone(f, 1.3, 0.13, "sine", 0.75));
			this._noise(t + 0.75, 0.7, 0.12, 5500, this.fxBus, true);
		} else {
			tone(660, 0.07, 0.08, "sine");
			tone(880, 0.07, 0.06, "sine", 0.04);
		}
	}

	speak(seed = 0) {
		if (!this.ready || this.muted || this.ctx.state === "closed") return;
		const c = this.ctx;
		if (c.currentTime - this.lastSpeak < 0.3) return;
		this.lastSpeak = c.currentTime;
		this.voiceCount++;
		let rng = ((Number(seed) || 0) + 1937) >>> 0;
		const random = () => {
			rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0;
			return rng / 4294967296;
		};
		const syllables = 5 + Math.floor(random() * 4);
		const base = 155 + random() * 100;
		for (let i = 0; i < syllables; i++) {
			const t = c.currentTime + 0.02 + i * 0.105;
			const osc = c.createOscillator();
			const vowel = c.createBiquadFilter();
			const formant = c.createBiquadFilter();
			const gain = c.createGain();
			osc.type = "sawtooth";
			const pitch =
				base * [1, 1.12, 0.89, 1.33, 1.05][Math.floor(random() * 5)];
			osc.frequency.setValueAtTime(pitch, t);
			osc.frequency.exponentialRampToValueAtTime(
				pitch * (i === syllables - 1 ? 0.75 : 1.1),
				t + 0.085,
			);
			vowel.type = "bandpass";
			vowel.frequency.value = [550, 800, 1100, 450, 700][
				Math.floor(random() * 5)
			];
			vowel.Q.value = 3;
			formant.type = "peaking";
			formant.frequency.value = 1700 + random() * 800;
			formant.Q.value = 1.5;
			formant.gain.value = 8;
			gain.gain.setValueAtTime(0, t);
			gain.gain.linearRampToValueAtTime(0.3, t + 0.012);
			gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.095);
			osc.connect(vowel).connect(formant).connect(gain).connect(this.fxBus);
			osc.start(t);
			osc.stop(t + 0.105);
			osc.onended = () => {
				osc.disconnect();
				vowel.disconnect();
				formant.disconnect();
				gain.disconnect();
			};
		}
	}

	stats() {
		let peak = 0,
			rms = 0;
		if (this.ready) {
			this.analyser.getFloatTimeDomainData(this.levelData);
			for (const sample of this.levelData) {
				peak = Math.max(peak, Math.abs(sample));
				rms += sample * sample;
			}
			rms = Math.sqrt(rms / this.levelData.length);
		}
		return {
			ready: this.ready,
			state: this.ctx?.state || "locked",
			musicVolume: this.musicVolume,
			muted: this.muted,
			mode: this.mode,
			notesPlayed: this.notesPlayed,
			sfxCount: this.sfxCount,
			voiceCount: this.voiceCount,
			events: { ...this.events },
			peak,
			rms,
		};
	}

	dispose() {
		if (!this.ready) return;
		this.wind.stop();
		this.wind.disconnect();
		this.master.disconnect();
		if (this.ctx.close) this.ctx.close();
		this.ready = false;
	}
}
