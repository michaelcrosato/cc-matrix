// Every sound is synthesized. No samples, recordings, or fetched audio.
export class AudioEngine {
	constructor({ context = null } = {}) {
		this.context = context;
		this.analyser = null;
		this.musicVolume = 0.1;
		this.sfxVolume = 0.7;
		this.muted = false;
		this.ready = false;
		this.musicStep = 0;
		this.nextBeat = 0;
		this.dangerClock = 0;
		this.wasPlaying = false;
		this.diagnostics = {
			notes: 0,
			effects: {},
			voices: 0,
			musicVolume: 0.1,
			initialized: false,
		};
	}

	async init() {
		if (!this.context) {
			const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
			if (!Audio) return false;
			this.context = new Audio();
		}
		if (!this.ready) {
			const c = this.context;
			this.master = c.createGain();
			this.master.gain.value = this.muted ? 0 : 0.62;
			this.music = c.createGain();
			this.music.gain.value = this.musicVolume;
			this.sfx = c.createGain();
			this.sfx.gain.value = this.sfxVolume;
			this.music.connect(this.master);
			this.sfx.connect(this.master);
			this.compressor = c.createDynamicsCompressor();
			this.compressor.threshold.value = -14;
			this.compressor.knee.value = 18;
			this.compressor.ratio.value = 5;
			this.compressor.attack.value = 0.006;
			this.compressor.release.value = 0.16;
			this.analyser = c.createAnalyser();
			this.analyser.fftSize = 512;
			this.master.connect(this.compressor);
			this.compressor.connect(this.analyser);
			this.analyser.connect(c.destination);
			this.noiseBuffer = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
			const data = this.noiseBuffer.getChannelData(0);
			let seed = 12631;
			for (let i = 0; i < data.length; i++) {
				seed = (seed * 16807) % 2147483647;
				data[i] = (seed / 1073741823.5 - 1) * 0.8;
			}
			this.ready = true;
			this.nextBeat = c.currentTime + 0.06;
			this.diagnostics.initialized = true;
		}
		if (
			this.context.state === "suspended" &&
			!this.context.startRendering &&
			this.context.resume
		)
			await this.context.resume();
		return true;
	}

	setMusic(value = 0.1) {
		this.musicVolume = this.clamp(value);
		this.diagnostics.musicVolume = this.musicVolume;
		if (this.music)
			this.music.gain.setTargetAtTime(
				this.musicVolume,
				this.context.currentTime,
				0.06,
			);
	}

	setSfx(value = 0.7) {
		this.sfxVolume = this.clamp(value);
		if (this.sfx)
			this.sfx.gain.setTargetAtTime(
				this.sfxVolume,
				this.context.currentTime,
				0.03,
			);
	}

	setMuted(value) {
		this.muted = !!value;
		if (this.master)
			this.master.gain.setTargetAtTime(
				this.muted ? 0 : 0.62,
				this.context.currentTime,
				0.03,
			);
	}

	clamp(value) {
		return Math.max(0, Math.min(1, Number(value) || 0));
	}
	hz(midi) {
		return 440 * 2 ** ((midi - 69) / 12);
	}

	tone(
		freq,
		duration,
		volume = 0.1,
		type = "sine",
		delay = 0,
		endFreq = freq,
		destination = this.sfx,
	) {
		if (!this.ready) return;
		const c = this.context,
			t = c.currentTime + Math.max(0, delay);
		const osc = c.createOscillator(),
			env = c.createGain();
		osc.type = type;
		osc.frequency.setValueAtTime(Math.max(12, freq), t);
		if (endFreq !== freq)
			osc.frequency.exponentialRampToValueAtTime(
				Math.max(12, endFreq),
				t + duration,
			);
		env.gain.setValueAtTime(0.0001, t);
		env.gain.exponentialRampToValueAtTime(
			Math.max(0.0002, volume),
			t + Math.min(0.012, duration * 0.2),
		);
		env.gain.exponentialRampToValueAtTime(0.0001, t + duration);
		osc.connect(env);
		env.connect(destination);
		osc.start(t);
		osc.stop(t + duration + 0.03);
		osc.onended = () => {
			osc.disconnect();
			env.disconnect();
		};
		this.diagnostics.notes++;
	}

	noise(duration, volume = 0.1, cutoff = 1800, delay = 0, highpass = false) {
		if (!this.ready) return;
		const c = this.context,
			t = c.currentTime + delay;
		const src = c.createBufferSource(),
			env = c.createGain(),
			filter = c.createBiquadFilter();
		src.buffer = this.noiseBuffer;
		filter.type = highpass ? "highpass" : "lowpass";
		filter.frequency.setValueAtTime(cutoff, t);
		filter.frequency.exponentialRampToValueAtTime(
			Math.max(80, cutoff * 0.25),
			t + duration,
		);
		env.gain.setValueAtTime(0.0001, t);
		env.gain.exponentialRampToValueAtTime(volume, t + 0.008);
		env.gain.exponentialRampToValueAtTime(0.0001, t + duration);
		src.connect(filter);
		filter.connect(env);
		env.connect(this.sfx);
		src.start(t, (this.diagnostics.notes % 8) * 0.09);
		src.stop(t + duration + 0.02);
		src.onended = () => {
			src.disconnect();
			filter.disconnect();
			env.disconnect();
		};
	}

	play(name) {
		if (!this.ready) return;
		this.diagnostics.effects[name] = (this.diagnostics.effects[name] || 0) + 1;
		switch (name) {
			case "step":
				this.noise(0.055, 0.055, 370);
				this.tone(75, 0.055, 0.035, "sine", 0, 47);
				break;
			case "pickup":
				[69, 76, 81].forEach((n, i) => {
					this.tone(this.hz(n), 0.3, 0.11, "triangle", i * 0.07);
				});
				this.tone(this.hz(88), 0.65, 0.035, "sine", 0.15);
				break;
			case "match":
				this.noise(0.085, 0.17, 6500, 0, true);
				this.noise(0.38, 0.06, 2200, 0.055);
				this.tone(340, 0.09, 0.025, "triangle", 0.04, 170);
				break;
			case "extinguish":
				this.noise(0.43, 0.15, 2000);
				this.tone(310, 0.3, 0.065, "sine", 0, 70);
				break;
			case "ghost":
				this.tone(420, 0.65, 0.07, "sine", 0, 720);
				this.tone(427, 0.7, 0.035, "triangle", 0.04, 670);
				break;
			case "hurt":
				this.tone(220, 0.36, 0.19, "sawtooth", 0, 42);
				this.noise(0.25, 0.14, 1400);
				this.gibberish("scared");
				break;
			case "door":
				this.noise(0.25, 0.08, 480);
				this.tone(88, 0.38, 0.07, "sawtooth", 0, 139);
				this.tone(210, 0.18, 0.055, "triangle", 0.24, 110);
				break;
			case "stairs":
				[48, 51, 55, 60].forEach((n, i) => {
					this.tone(this.hz(n), 0.19, 0.08, "triangle", i * 0.085);
				});
				break;
			case "win":
				[60, 64, 67, 72, 76, 79, 84].forEach((n, i) => {
					this.tone(this.hz(n), 0.65, 0.12, "triangle", i * 0.11);
				});
				this.gibberish("happy");
				break;
			case "lose":
				[60, 59, 55, 51, 48].forEach((n, i) => {
					this.tone(this.hz(n), 0.65, 0.11, "triangle", i * 0.19);
				});
				this.noise(0.8, 0.045, 700, 0.65);
				break;
			case "menu":
				this.tone(590, 0.075, 0.065, "triangle", 0, 740);
				break;
			case "pulse":
				this.tone(115, 0.22, 0.16, "sine", 0, 37);
				this.tone(710, 0.44, 0.055, "triangle", 0, 190);
				this.noise(0.18, 0.06, 3700);
				break;
			default:
				this.tone(330, 0.1, 0.035, "triangle");
		}
	}

	gibberish(mood = "curious") {
		if (!this.ready) return;
		this.diagnostics.voices++;
		const pitches =
			mood === "happy"
				? [72, 77, 81, 79, 84]
				: mood === "scared"
					? [77, 84, 80, 87]
					: [64, 68, 63, 71];
		const vowels = [580, 1200, 750, 1650, 950];
		const c = this.context;
		pitches.forEach((pitch, i) => {
			const t = c.currentTime + i * 0.09;
			const osc = c.createOscillator(),
				formant = c.createBiquadFilter(),
				env = c.createGain();
			osc.type = "sawtooth";
			osc.frequency.setValueAtTime(this.hz(pitch) * 0.58, t);
			osc.frequency.exponentialRampToValueAtTime(
				this.hz(pitch + (i % 2 ? -2 : 3)) * 0.58,
				t + 0.07,
			);
			formant.type = "bandpass";
			formant.frequency.value = vowels[i % vowels.length];
			formant.Q.value = 6;
			env.gain.setValueAtTime(0.0001, t);
			env.gain.exponentialRampToValueAtTime(0.17, t + 0.008);
			env.gain.exponentialRampToValueAtTime(0.0001, t + 0.075);
			osc.connect(formant);
			formant.connect(env);
			env.connect(this.sfx);
			osc.start(t);
			osc.stop(t + 0.085);
			osc.onended = () => {
				osc.disconnect();
				formant.disconnect();
				env.disconnect();
			};
		});
	}

	update(dt, { danger = 0, playing = false } = {}) {
		if (
			!this.ready ||
			(this.context.state === "suspended" && !this.context.startRendering)
		)
			return;
		const now = this.context.currentTime;
		if (!playing) {
			this.nextBeat = now + 0.06;
			this.wasPlaying = false;
			this.dangerClock = 0;
			return;
		}
		if (!this.wasPlaying) this.nextBeat = now + 0.05;
		this.wasPlaying = true;
		// A 3/4 music-box ostinato. Harmony circles A minor, F, D minor, E.
		const roots = [45, 41, 38, 40];
		const melody = [
			81, 76, 72, 71, 72, 76, 80, 76, 71, 69, 68, 71, 77, 74, 69, 68, 69, 74,
			76, 71, 68, 64, 68, 71,
		];
		if (this.nextBeat < now - 0.5) this.nextBeat = now + 0.03;
		let scheduled = 0;
		while (this.nextBeat < now + 0.18 && scheduled++ < 4) {
			const delay = Math.max(0, this.nextBeat - now);
			const step = this.musicStep % 24,
				bar = Math.floor(step / 6),
				beat = step % 3;
			this.tone(
				this.hz(melody[step]),
				0.95,
				0.17,
				"sine",
				delay,
				this.hz(melody[step]),
				this.music,
			);
			this.tone(
				this.hz(melody[step] + 12),
				0.35,
				0.026,
				"triangle",
				delay,
				this.hz(melody[step] + 12),
				this.music,
			);
			if (beat === 0) {
				this.tone(
					this.hz(roots[bar]),
					1.3,
					0.2,
					"triangle",
					delay,
					this.hz(roots[bar]),
					this.music,
				);
			} else {
				const third = bar === 3 ? 4 : 3;
				[roots[bar] + 12 + third, roots[bar] + 19].forEach((n) => {
					this.tone(
						this.hz(n),
						0.55,
						0.07,
						"sine",
						delay,
						this.hz(n),
						this.music,
					);
				});
			}
			this.musicStep++;
			this.nextBeat += 0.39;
		}
		if (danger > 0.15) {
			this.dangerClock -= dt;
			if (this.dangerClock <= 0) {
				this.dangerClock = 1.15 - this.clamp(danger) * 0.65;
				this.tone(65, 0.14, 0.045 + this.clamp(danger) * 0.055, "sine", 0, 36);
				this.tone(58, 0.1, 0.025, "sine", 0.15, 32);
			}
		} else this.dangerClock = 0;
	}
}
