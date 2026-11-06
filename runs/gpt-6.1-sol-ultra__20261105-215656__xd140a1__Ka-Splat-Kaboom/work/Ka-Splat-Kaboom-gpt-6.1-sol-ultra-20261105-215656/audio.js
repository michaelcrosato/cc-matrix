/** Ka-Splat! All sound is synthesized here; no sound or voice recordings. */
export class GameAudio {
	constructor({ context = null, music = 0.1, sfx = 0.65 } = {}) {
		this.ctx = context;
		this.musicVolume = music;
		this.sfxVolume = sfx;
		this.muted = false;
		this.nextBeat = 0;
		this.step = 0;
		this.wasPlaying = false;
		this.stats = {
			events: 0,
			notes: 0,
			voices: 0,
			syllables: 0,
			unlocked: false,
		};
		if (context) this._connect();
	}

	_connect() {
		const c = this.ctx;
		this.master = c.createGain();
		this.master.gain.value = this.muted ? 0 : 0.78;
		this.compressor = c.createDynamicsCompressor();
		this.compressor.threshold.value = -14;
		this.compressor.knee.value = 14;
		this.compressor.ratio.value = 5;
		this.compressor.attack.value = 0.005;
		this.compressor.release.value = 0.18;
		this.musicBus = c.createGain();
		this.musicBus.gain.value = this.musicVolume;
		this.sfxBus = c.createGain();
		this.sfxBus.gain.value = this.sfxVolume;
		this.musicBus.connect(this.master);
		this.sfxBus.connect(this.master);
		this.master.connect(this.compressor);
		this.analyser = c.createAnalyser();
		this.analyser.fftSize = 1024;
		this.compressor.connect(this.analyser);
		this.analyser.connect(c.destination);
		this.noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
		const data = this.noise.getChannelData(0);
		let seed = 84571;
		for (let i = 0; i < data.length; i++) {
			seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
			data[i] = (seed >>> 0) / 2147483648 - 1;
		}
		this.nextBeat = c.currentTime + 0.06;
	}

	async unlock() {
		try {
			if (!this.ctx) {
				const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
				if (!Audio) return false;
				this.ctx = new Audio({ latencyHint: "interactive" });
				this._connect();
			}
			if (this.ctx.state === "suspended") await this.ctx.resume();
			this.stats.unlocked = this.ctx.state === "running";
			return this.stats.unlocked;
		} catch {
			return false;
		}
	}

	_volume(bus, value) {
		if (!bus) return;
		const time = this.ctx.currentTime;
		bus.gain.cancelScheduledValues(time);
		bus.gain.setTargetAtTime(value, time, 0.025);
	}

	setMusic(value) {
		this.musicVolume = Math.max(0, Math.min(1, Number(value) || 0));
		this._volume(this.musicBus, this.musicVolume);
	}

	setSfx(value) {
		this.sfxVolume = Math.max(0, Math.min(1, Number(value) || 0));
		this._volume(this.sfxBus, this.sfxVolume);
	}

	setMuted(value) {
		this.muted = Boolean(value);
		this._volume(this.master, this.muted ? 0 : 0.78);
	}

	_tone(
		freq,
		time,
		duration,
		type = "sine",
		volume = 0.2,
		bus = this.sfxBus,
		endFreq = null,
	) {
		const c = this.ctx;
		const osc = c.createOscillator();
		const envelope = c.createGain();
		osc.type = type;
		osc.frequency.setValueAtTime(Math.max(20, freq), time);
		if (endFreq !== null)
			osc.frequency.exponentialRampToValueAtTime(
				Math.max(20, endFreq),
				time + duration * 0.85,
			);
		envelope.gain.setValueAtTime(0.0001, time);
		envelope.gain.exponentialRampToValueAtTime(
			Math.max(0.0002, volume),
			time + Math.min(0.008, duration / 4),
		);
		envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
		osc.connect(envelope);
		envelope.connect(bus);
		osc.start(time);
		osc.stop(time + duration + 0.025);
		osc.onended = () => {
			osc.disconnect();
			envelope.disconnect();
		};
		this.stats.notes++;
	}

	_noise(
		time,
		duration,
		volume,
		frequency = 1600,
		type = "bandpass",
		bus = this.sfxBus,
	) {
		const c = this.ctx;
		const source = c.createBufferSource();
		source.buffer = this.noise;
		const filter = c.createBiquadFilter();
		filter.type = type;
		filter.frequency.setValueAtTime(frequency, time);
		filter.Q.value = 0.8;
		const envelope = c.createGain();
		envelope.gain.setValueAtTime(volume, time);
		envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
		source.connect(filter);
		filter.connect(envelope);
		envelope.connect(bus);
		source.start(time);
		source.stop(time + duration + 0.015);
		source.onended = () => {
			source.disconnect();
			filter.disconnect();
			envelope.disconnect();
		};
	}

	play(name, variation = 0, at = null) {
		if (!this.ctx || this.ctx.state === "closed") return;
		const t = at ?? this.ctx.currentTime + 0.005;
		const n = Math.abs(Number(variation) || 0) % 8;
		this.stats.events++;
		if (name === "catch") {
			this._tone(
				650 + n * 65,
				t,
				0.11,
				"sine",
				0.3,
				this.sfxBus,
				1350 + n * 80,
			);
			this._tone(220 + n * 15, t, 0.065, "triangle", 0.22, this.sfxBus, 90);
			this._noise(t, 0.09, 0.23, 2800);
		} else if (name === "miss") {
			this._tone(110, t, 0.5, "sawtooth", 0.23, this.sfxBus, 28);
			this._noise(t, 0.62, 0.65, 420, "lowpass");
			this._noise(t + 0.02, 0.2, 0.3, 2200);
			this._tone(72, t + 0.06, 0.4, "sine", 0.5, this.sfxBus, 32);
		} else if (name === "splash") {
			this._noise(t, 0.5, 0.6, 3400, "lowpass");
			[360, 480, 640, 840, 1080].forEach((f, i) => {
				this._tone(f, t + i * 0.025, 0.19, "sine", 0.16, this.sfxBus, f * 1.8);
			});
		} else if (name === "select") {
			this._tone(640, t, 0.07, "triangle", 0.22);
			this._tone(960, t + 0.04, 0.1, "sine", 0.16);
		} else if (name === "wave") {
			[60, 64, 67, 72].forEach((note, i) => {
				this._tone(this._hz(note), t + i * 0.09, 0.24, "triangle", 0.25);
			});
			this._noise(t + 0.28, 0.1, 0.2, 6000, "highpass");
		} else if (name === "repair") {
			[67, 72, 76, 79, 84].forEach((note, i) => {
				this._tone(this._hz(note), t + i * 0.075, 0.32, "sine", 0.27);
				this._tone(this._hz(note + 12), t + i * 0.075, 0.18, "triangle", 0.06);
			});
		} else if (name === "win") {
			[60, 64, 67, 72, 71, 74, 79, 84].forEach((note, i) => {
				this._tone(this._hz(note), t + i * 0.13, 0.42, "triangle", 0.22);
			});
			[48, 55, 60, 64].forEach((note) => {
				this._tone(this._hz(note), t + 1.05, 1.2, "sine", 0.13);
			});
			this._noise(t + 1.03, 0.6, 0.2, 6500, "highpass");
		} else if (name === "lose") {
			[67, 65, 63, 60, 55, 48].forEach((note, i) => {
				this._tone(this._hz(note), t + i * 0.13, 0.28, "triangle", 0.22);
			});
		}
	}

	voice(mood = "cheerful", at = null) {
		if (!this.ctx || this.ctx.state === "closed") return;
		const t = at ?? this.ctx.currentTime + 0.015;
		const patterns = {
			cheerful: [1.0, 1.35, 1.15, 1.55],
			taunt: [1.25, 0.9, 1.3, 0.86, 0.78],
			win: [1.0, 1.3, 1.65, 1.4, 1.8],
		};
		const notes = patterns[mood] || patterns.cheerful;
		const base = mood === "taunt" ? 135 : 205;
		const vowels = [
			[780, 1250],
			[350, 1900],
			[520, 880],
			[410, 2200],
			[660, 1100],
		];
		notes.forEach((pitch, i) => {
			const start = t + i * 0.105;
			const duration = i === notes.length - 1 ? 0.15 : 0.075;
			const c = this.ctx;
			const source = c.createOscillator();
			source.type = "sawtooth";
			source.frequency.setValueAtTime(base * pitch, start);
			source.frequency.exponentialRampToValueAtTime(
				base * pitch * 0.78,
				start + duration,
			);
			const envelope = c.createGain();
			envelope.gain.setValueAtTime(0.0001, start);
			envelope.gain.exponentialRampToValueAtTime(0.21, start + 0.008);
			envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
			const f1 = c.createBiquadFilter();
			const f2 = c.createBiquadFilter();
			f1.type = f2.type = "bandpass";
			f1.frequency.value = vowels[i % vowels.length][0];
			f2.frequency.value = vowels[i % vowels.length][1];
			f1.Q.value = 5;
			f2.Q.value = 4;
			source.connect(f1);
			source.connect(f2);
			f1.connect(envelope);
			f2.connect(envelope);
			envelope.connect(this.sfxBus);
			source.start(start);
			source.stop(start + duration + 0.02);
			source.onended = () => {
				source.disconnect();
				f1.disconnect();
				f2.disconnect();
				envelope.disconnect();
			};
			this.stats.syllables++;
		});
		this.stats.voices++;
	}

	_hz(midi) {
		return 440 * 2 ** ((midi - 69) / 12);
	}

	_musicStep(time, step, wave) {
		// A little rooftop caper: mallet melody, walking bass, brushed drums.
		const melody = [
			76,
			null,
			79,
			81,
			79,
			76,
			74,
			null,
			72,
			null,
			74,
			76,
			74,
			72,
			69,
			null,
			72,
			null,
			76,
			79,
			81,
			79,
			76,
			null,
			74,
			76,
			74,
			71,
			67,
			null,
			72,
			null,
		];
		const index = step % melody.length;
		const transpose = wave >= 7 ? 2 : 0;
		const note = melody[index];
		if (note !== null) {
			const f = this._hz(note + transpose);
			this._tone(f, time, 0.2, "sine", 0.43, this.musicBus);
			this._tone(f * 3, time, 0.075, "sine", 0.065, this.musicBus);
		}
		if (step % 2 === 0) {
			const bass = [
				36, 43, 40, 43, 33, 40, 36, 40, 38, 45, 41, 45, 31, 38, 35, 38,
			];
			this._tone(
				this._hz(bass[(step / 2) % 16] + transpose),
				time,
				0.23,
				"triangle",
				0.38,
				this.musicBus,
			);
		}
		if (step % 4 === 0)
			this._tone(105, time, 0.15, "sine", 0.48, this.musicBus, 43);
		if (step % 4 === 2)
			this._noise(time, 0.1, 0.18, 1800, "bandpass", this.musicBus);
		this._noise(
			time,
			step % 2 ? 0.045 : 0.025,
			step % 2 ? 0.1 : 0.055,
			7500,
			"highpass",
			this.musicBus,
		);
		if (step % 8 === 0) {
			const chord = step % 32 < 16 ? [60, 64, 67] : [59, 62, 67];
			chord.forEach((n) => {
				this._tone(
					this._hz(n + transpose),
					time,
					0.55,
					"triangle",
					0.075,
					this.musicBus,
				);
			});
		}
	}

	tick(_dt, playing = true, wave = 1) {
		if (this.ctx?.state !== "running") return;
		const time = this.ctx.currentTime;
		if (!playing) {
			this.wasPlaying = false;
			this.nextBeat = time + 0.05;
			return;
		}
		if (!this.wasPlaying) {
			this.nextBeat = time + 0.03;
			this.wasPlaying = true;
		}
		if (this.nextBeat < time - 0.3) this.nextBeat = time + 0.015;
		const beat = 60 / (112 + Math.min(8, Math.max(1, wave)) * 1.5) / 2;
		while (this.nextBeat < time + 0.12) {
			this._musicStep(this.nextBeat, this.step, wave);
			this.nextBeat += beat * (this.step % 2 ? 0.93 : 1.07);
			this.step++;
		}
	}

	levels() {
		if (!this.analyser) return { rms: 0, peak: 0 };
		const samples = new Float32Array(this.analyser.fftSize);
		this.analyser.getFloatTimeDomainData(samples);
		let sum = 0,
			peak = 0;
		for (const value of samples) {
			sum += value * value;
			peak = Math.max(peak, Math.abs(value));
		}
		return { rms: Math.sqrt(sum / samples.length), peak };
	}

	static async offlineProbe() {
		const Offline =
			globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
		if (!Offline)
			return { ok: false, reason: "OfflineAudioContext unavailable" };
		const context = new Offline(1, 44100 * 6, 44100);
		const audio = new GameAudio({ context });
		[
			"catch",
			"miss",
			"splash",
			"select",
			"wave",
			"repair",
			"win",
			"lose",
		].forEach((name, i) => {
			audio.play(name, i, 0.1 + i * 0.5);
		});
		audio.voice("taunt", 4.5);
		for (let i = 0; i < 16; i++) audio._musicStep(0.1 + i * 0.25, i, 1);
		const buffer = await context.startRendering();
		let peak = 0,
			energy = 0,
			finite = true;
		for (const sample of buffer.getChannelData(0)) {
			if (!Number.isFinite(sample)) finite = false;
			peak = Math.max(peak, Math.abs(sample));
			energy += sample * sample;
		}
		const rms = Math.sqrt(energy / buffer.length);
		return {
			ok: finite && peak > 0.01 && peak < 1 && rms > 0.001,
			peak,
			rms,
			musicGain: audio.musicVolume,
			stats: audio.stats,
		};
	}
}
