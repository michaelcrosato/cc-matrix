/* Solar Flair: all sound is synthesized at runtime. No samples or audio files. */
class SolarAudio {
	constructor() {
		this.ctx = null;
		this.musicVolume = 0.1;
		this.sfxVolume = 0.65;
		this.noteCount = 0;
		this.effectCount = 0;
		this.voiceCount = 0;
		this.beat = 0;
		this.nextBeat = 0;
		this.intensity = 0;
		this.enabled = true;
		this.noiseBuffers = new WeakMap();
		this.lastEffects = {};
	}

	async unlock() {
		const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
		if (!Audio) return false;
		if (!this.ctx) {
			this.ctx = new Audio({ latencyHint: "interactive" });
			const c = this.ctx;
			this.musicGain = c.createGain();
			this.sfxGain = c.createGain();
			this.master = c.createGain();
			this.master.gain.value = 0.65;
			this.musicGain.gain.value = this.musicVolume;
			this.sfxGain.gain.value = this.sfxVolume;
			this.compressor = c.createDynamicsCompressor();
			this.compressor.threshold.value = -16;
			this.compressor.knee.value = 20;
			this.compressor.ratio.value = 4;
			this.compressor.attack.value = 0.004;
			this.compressor.release.value = 0.2;
			this.analyser = c.createAnalyser();
			this.analyser.fftSize = 512;
			this.musicGain.connect(this.master);
			this.sfxGain.connect(this.master);
			this.master.connect(this.compressor);
			this.compressor.connect(this.analyser);
			this.analyser.connect(c.destination);
			this.nextBeat = c.currentTime + 0.06;
		}
		if (this.ctx.state !== "running") await this.ctx.resume();
		this.enabled = true;
		return this.ctx.state === "running";
	}

	setMusic(value) {
		this.musicVolume = Math.max(0, Math.min(1, Number(value) || 0));
		if (this.musicGain)
			this.musicGain.gain.setTargetAtTime(
				this.musicVolume,
				this.ctx.currentTime,
				0.035,
			);
	}

	setSfx(value) {
		this.sfxVolume = Math.max(0, Math.min(1, Number(value) || 0));
		if (this.sfxGain)
			this.sfxGain.gain.setTargetAtTime(
				this.sfxVolume,
				this.ctx.currentTime,
				0.035,
			);
	}

	suspend() {
		this.enabled = false;
		if (this.ctx?.state === "running") return this.ctx.suspend();
		return Promise.resolve();
	}

	async resume() {
		return this.unlock();
	}

	_tone(
		c,
		destination,
		time,
		frequency,
		duration,
		volume = 0.1,
		type = "sine",
		endFrequency = null,
		attack = 0.008,
		cutoff = 0,
	) {
		const oscillator = c.createOscillator();
		const envelope = c.createGain();
		oscillator.type = type;
		oscillator.frequency.setValueAtTime(Math.max(1, frequency), time);
		if (endFrequency)
			oscillator.frequency.exponentialRampToValueAtTime(
				Math.max(1, endFrequency),
				time + duration,
			);
		envelope.gain.setValueAtTime(0.00001, time);
		envelope.gain.exponentialRampToValueAtTime(
			Math.max(0.00001, volume),
			time + Math.min(attack, duration * 0.3),
		);
		envelope.gain.exponentialRampToValueAtTime(0.00001, time + duration);
		if (cutoff) {
			const filter = c.createBiquadFilter();
			filter.type = "lowpass";
			filter.frequency.value = cutoff;
			oscillator.connect(filter);
			filter.connect(envelope);
		} else oscillator.connect(envelope);
		envelope.connect(destination);
		oscillator.start(time);
		oscillator.stop(time + duration + 0.015);
		oscillator.onended = () => {
			oscillator.disconnect();
			envelope.disconnect();
		};
	}

	_noise(
		c,
		destination,
		time,
		duration,
		volume,
		cutoff = 1800,
		highpass = 120,
	) {
		let buffer = this.noiseBuffers.get(c);
		if (!buffer) {
			buffer = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
			const data = buffer.getChannelData(0);
			let seed = 0x5f3759df;
			for (let i = 0; i < data.length; i++) {
				seed ^= seed << 13;
				seed ^= seed >>> 17;
				seed ^= seed << 5;
				data[i] = (seed >>> 0) / 2147483648 - 1;
			}
			this.noiseBuffers.set(c, buffer);
		}
		const source = c.createBufferSource();
		source.buffer = buffer;
		const low = c.createBiquadFilter();
		low.type = "lowpass";
		low.frequency.value = cutoff;
		const high = c.createBiquadFilter();
		high.type = "highpass";
		high.frequency.value = highpass;
		const gain = c.createGain();
		gain.gain.setValueAtTime(0.00001, time);
		gain.gain.exponentialRampToValueAtTime(
			Math.max(volume, 0.00001),
			time + 0.01,
		);
		gain.gain.exponentialRampToValueAtTime(0.00001, time + duration);
		source.connect(low);
		low.connect(high);
		high.connect(gain);
		gain.connect(destination);
		source.start(time, 0, duration);
		source.stop(time + duration + 0.02);
		source.onended = () => {
			source.disconnect();
			low.disconnect();
			high.disconnect();
			gain.disconnect();
		};
	}

	update(dt, intensity = 0) {
		this.intensity = Math.max(0, Math.min(1, intensity));
		if (!this.enabled || !this.ctx || this.ctx.state !== "running") return;
		const c = this.ctx;
		if (this.nextBeat < c.currentTime - 0.5)
			this.nextBeat = c.currentTime + 0.025;
		// A minor 9 / Fmaj7 / Cmaj7 / suspended G. Radio-room warmth in open space.
		const chords = [
			[45, 52, 57, 59, 64],
			[41, 48, 53, 57, 60],
			[48, 55, 59, 62, 64],
			[43, 50, 55, 57, 62],
		];
		while (this.nextBeat < c.currentTime + 0.15) {
			const b = this.beat++,
				t = this.nextBeat;
			const chord = chords[Math.floor(b / 16) % chords.length];
			const hz = (note) => 440 * Math.pow(2, (note - 69) / 12);
			const pattern = [1, 3, 2, 4, 2, 3, 1, 4];
			this._tone(
				c,
				this.musicGain,
				t,
				hz(chord[pattern[b % 8]] + 12),
				0.62,
				0.12,
				"triangle",
				null,
				0.006,
				2100,
			);
			this.noteCount++;
			if (b % 4 === 0) {
				this._tone(
					c,
					this.musicGain,
					t,
					hz(chord[0]),
					1.1,
					0.18,
					"sine",
					null,
					0.018,
				);
				this.noteCount++;
			}
			if (b % 16 === 0) {
				for (const n of chord.slice(1, 4)) {
					this._tone(
						c,
						this.musicGain,
						t,
						hz(n),
						4.6,
						0.038,
						"sine",
						null,
						0.45,
					);
					this._tone(
						c,
						this.musicGain,
						t + 0.013,
						hz(n) * 1.003,
						4.6,
						0.02,
						"triangle",
						null,
						0.5,
						900,
					);
					this.noteCount += 2;
				}
			}
			if (b % 4 === 0 && this.intensity > 0.15) {
				this._tone(
					c,
					this.musicGain,
					t,
					130,
					0.18,
					0.16 * this.intensity,
					"sine",
					42,
				);
				this._noise(
					c,
					this.musicGain,
					t + 0.16,
					0.06,
					0.04 * this.intensity,
					5000,
					3000,
				);
			}
			if (b % 4 === 2 && this.intensity > 0.45)
				this._noise(
					c,
					this.musicGain,
					t,
					0.14,
					0.1 * this.intensity,
					2400,
					700,
				);
			this.nextBeat += 60 / 104 / 2;
		}
	}

	_fx(name, c, destination, t) {
		const tone = (f, d, v, type = "sine", end = null, offset = 0) =>
			this._tone(c, destination, t + offset, f, d, v, type, end);
		const noise = (d, v, cutoff = 1800, hp = 100, offset = 0) =>
			this._noise(c, destination, t + offset, d, v, cutoff, hp);
		switch (name) {
			case "laser":
				tone(1350, 0.12, 0.13, "sawtooth", 180);
				tone(2400, 0.07, 0.04, "sine", 600);
				break;
			case "hit":
				noise(0.16, 0.28, 1500);
				tone(170, 0.18, 0.15, "triangle", 55);
				break;
			case "explode":
				noise(0.8, 0.48, 1600, 30);
				tone(110, 0.7, 0.3, "sine", 23);
				noise(0.34, 0.15, 4000, 1400);
				break;
			case "warp":
				tone(100, 1.1, 0.23, "sawtooth", 1800);
				tone(101, 1.1, 0.1, "triangle", 2200);
				noise(1.3, 0.16, 4200, 600);
				break;
			case "rescue":
				[523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
					tone(f, 0.42, 0.2, "sine", null, i * 0.11),
				);
				break;
			case "shield":
				tone(240, 0.3, 0.19, "triangle", 980);
				tone(480, 0.42, 0.1, "sine", 1500);
				break;
			case "ui":
				tone(660, 0.075, 0.11, "sine", 880);
				break;
			case "win":
				[261.63, 329.63, 392, 523.25, 659.25, 783.99].forEach((f, i) =>
					tone(f, 1.1, 0.14, "triangle", null, i * 0.14),
				);
				break;
			case "lose":
				[392, 349.23, 293.66, 196].forEach((f, i) =>
					tone(f, 0.72, 0.15, "triangle", null, i * 0.22),
				);
				break;
			case "boost":
				noise(0.42, 0.13, 2400, 500);
				tone(90, 0.38, 0.14, "sawtooth", 200);
				break;
			default:
				tone(440, 0.1, 0.1);
		}
	}

	sfx(name = "ui") {
		if (!this.enabled || !this.ctx || this.ctx.state !== "running") return;
		const now = this.ctx.currentTime;
		const minimum = name === "laser" ? 0.045 : name === "boost" ? 0.25 : 0.025;
		if (now - (this.lastEffects[name] ?? -100) < minimum) return;
		this.lastEffects[name] = now;
		this.effectCount++;
		this._fx(name, this.ctx, this.sfxGain, now + 0.004);
	}

	_phrase(c, destination, t, mood = "radio") {
		const high = mood === "rescue" || mood === "happy" || mood === "win";
		const base = high ? 220 : mood === "warning" ? 120 : 165;
		const syllables = high
			? [1, 1.5, 1.25, 1.75, 1.4]
			: [1, 0.88, 1.2, 1.05, 0.82, 1.12];
		const formants = [
			[700, 1200],
			[350, 1900],
			[550, 1450],
			[420, 2300],
			[800, 1150],
			[310, 2100],
		];
		this._noise(c, destination, t, 0.06, 0.08, 2200, 900);
		syllables.forEach((pitch, i) => {
			const start = t + 0.07 + i * 0.11;
			const source = c.createOscillator();
			source.type = "sawtooth";
			source.frequency.setValueAtTime(base * pitch, start);
			source.frequency.exponentialRampToValueAtTime(
				base * pitch * 0.88,
				start + 0.085,
			);
			const envelope = c.createGain();
			envelope.gain.setValueAtTime(0.00001, start);
			envelope.gain.linearRampToValueAtTime(0.13, start + 0.012);
			envelope.gain.exponentialRampToValueAtTime(0.00001, start + 0.095);
			const f1 = c.createBiquadFilter();
			f1.type = "bandpass";
			f1.frequency.value = formants[i % 6][0];
			f1.Q.value = 6;
			const f2 = c.createBiquadFilter();
			f2.type = "bandpass";
			f2.frequency.value = formants[i % 6][1];
			f2.Q.value = 5;
			source.connect(f1);
			source.connect(f2);
			f1.connect(envelope);
			f2.connect(envelope);
			envelope.connect(destination);
			source.start(start);
			source.stop(start + 0.1);
			source.onended = () => {
				source.disconnect();
				f1.disconnect();
				f2.disconnect();
				envelope.disconnect();
			};
		});
		this._noise(c, destination, t + 0.8, 0.07, 0.04, 3000, 1400);
	}

	voice(mood = "radio") {
		if (!this.enabled || !this.ctx || this.ctx.state !== "running") return;
		if (this.ctx.currentTime - (this.lastVoice ?? -100) < 0.9) return;
		this.lastVoice = this.ctx.currentTime;
		this.voiceCount++;
		this._phrase(this.ctx, this.sfxGain, this.ctx.currentTime + 0.005, mood);
	}

	inspect() {
		let rms = 0,
			peak = 0;
		if (this.analyser) {
			const samples = new Float32Array(this.analyser.fftSize);
			this.analyser.getFloatTimeDomainData(samples);
			for (const n of samples) {
				rms += n * n;
				peak = Math.max(peak, Math.abs(n));
			}
			rms = Math.sqrt(rms / samples.length);
		}
		return {
			unlocked: !!this.ctx,
			state: this.ctx?.state || "locked",
			musicVolume: this.musicVolume,
			sfxVolume: this.sfxVolume,
			noteCount: this.noteCount,
			effectCount: this.effectCount,
			voiceCount: this.voiceCount,
			rms,
			peak,
		};
	}

	async selfTest() {
		const Offline =
			globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
		if (!Offline)
			return {
				supported: false,
				audible: false,
				reason: "OfflineAudioContext unavailable",
			};
		const names = [
			"laser",
			"hit",
			"explode",
			"warp",
			"rescue",
			"shield",
			"ui",
			"win",
			"lose",
			"boost",
		];
		const c = new Offline(1, 44100 * 18, 44100);
		const gain = c.createGain();
		gain.gain.value = 0.5;
		gain.connect(c.destination);
		names.forEach((name, i) => this._fx(name, c, gain, 0.1 + i * 1.5));
		this._phrase(c, gain, 15.4, "rescue");
		const rendered = await c.startRendering();
		const samples = rendered.getChannelData(0);
		const segments = {};
		let total = 0,
			peak = 0,
			nonFinite = 0;
		for (let i = 0; i < samples.length; i++) {
			const v = samples[i];
			if (!Number.isFinite(v)) nonFinite++;
			total += v * v;
			peak = Math.max(peak, Math.abs(v));
		}
		for (let i = 0; i <= names.length; i++) {
			const start = Math.floor(
				(i < names.length ? 0.1 + i * 1.5 : 15.4) * 44100,
			);
			let energy = 0;
			for (let j = start; j < start + 44100; j++)
				energy += samples[j] * samples[j];
			segments[i < names.length ? names[i] : "voice"] = Math.sqrt(
				energy / 44100,
			);
		}
		return {
			supported: true,
			audible: Object.values(segments).every((n) => n > 0.0001),
			rms: Math.sqrt(total / samples.length),
			peak,
			nonFinite,
			clipped: peak >= 1,
			segments,
		};
	}
}
