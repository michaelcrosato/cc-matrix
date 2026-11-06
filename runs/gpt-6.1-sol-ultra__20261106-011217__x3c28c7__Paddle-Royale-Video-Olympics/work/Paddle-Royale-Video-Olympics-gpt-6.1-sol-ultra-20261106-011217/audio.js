/** Paddle Royale — all sound is synthesized here. No samples, files or speech service. */
export class AudioEngine {
	constructor(options = {}) {
		this.ctx = options.context || null;
		this.musicVolume = 0.1;
		this.sfxVolume = 0.7;
		this.muted = false;
		this.enabled = false;
		this.musicEnabled = true;
		this.step = 0;
		this.nextBeat = 0;
		this.tempo = 116;
		this.intensity = 0;
		this.nodes = 0;
		this.events = { music: 0, sfx: 0, voice: 0 };
		this.lastVoice = -100;
		this.seed = 0x197707;
		if (this.ctx) this._init();
	}

	_init() {
		if (this.master) return;
		const c = this.ctx;
		this.master = c.createGain();
		this.master.gain.value = this.muted ? 0 : 0.78;
		this.compressor = c.createDynamicsCompressor();
		this.compressor.threshold.value = -12;
		this.compressor.knee.value = 15;
		this.compressor.ratio.value = 5;
		this.compressor.attack.value = 0.003;
		this.compressor.release.value = 0.18;
		this.musicBus = c.createGain();
		this.musicBus.gain.value = this.musicVolume;
		this.sfxBus = c.createGain();
		this.sfxBus.gain.value = this.sfxVolume;
		this.voiceBus = c.createGain();
		this.voiceBus.gain.value = this.sfxVolume * 0.65;
		this.analyser = c.createAnalyser();
		this.analyser.fftSize = 512;
		this.musicBus.connect(this.master);
		this.sfxBus.connect(this.master);
		this.voiceBus.connect(this.master);
		this.master.connect(this.compressor);
		this.compressor.connect(this.analyser);
		this.analyser.connect(c.destination);
		const n = Math.floor(c.sampleRate * 1.1);
		this.noise = c.createBuffer(1, n, c.sampleRate);
		const a = this.noise.getChannelData(0);
		for (let i = 0; i < n; i++) a[i] = this._random() * 2 - 1;
		this.nextBeat = c.currentTime + 0.04;
		this.enabled = true;
	}

	_random() {
		this.seed ^= this.seed << 13;
		this.seed ^= this.seed >>> 17;
		this.seed ^= this.seed << 5;
		return (this.seed >>> 0) / 4294967296;
	}

	async resume() {
		if (!this.ctx) {
			const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
			if (!AC) return false;
			this.ctx = new AC();
		}
		this._init();
		if (this.ctx.state === "suspended" && this.ctx.resume) {
			try {
				await this.ctx.resume();
			} catch (_) {
				return false;
			}
		}
		this.enabled = true;
		return this.ctx.state !== "closed";
	}

	setMusic(value) {
		this.musicVolume = Math.max(0, Math.min(1, Number(value) || 0));
		if (this.musicBus)
			this.musicBus.gain.setTargetAtTime(
				this.musicVolume,
				this.ctx.currentTime,
				0.04,
			);
	}

	setSfx(value) {
		this.sfxVolume = Math.max(0, Math.min(1, Number(value) || 0));
		if (this.sfxBus) {
			this.sfxBus.gain.setTargetAtTime(
				this.sfxVolume,
				this.ctx.currentTime,
				0.025,
			);
			this.voiceBus.gain.setTargetAtTime(
				this.sfxVolume * 0.65,
				this.ctx.currentTime,
				0.025,
			);
		}
	}

	setMuted(value) {
		this.muted = !!value;
		if (this.master)
			this.master.gain.setTargetAtTime(
				this.muted ? 0 : 0.78,
				this.ctx.currentTime,
				0.025,
			);
	}

	_tone(
		freq,
		time,
		duration,
		gain,
		type = "triangle",
		bus = this.sfxBus,
		endFreq = null,
	) {
		const c = this.ctx;
		const o = c.createOscillator();
		const v = c.createGain();
		o.type = type;
		o.frequency.setValueAtTime(Math.max(20, freq), time);
		if (endFreq != null)
			o.frequency.exponentialRampToValueAtTime(
				Math.max(20, endFreq),
				time + duration,
			);
		v.gain.setValueAtTime(0, time);
		v.gain.linearRampToValueAtTime(
			gain,
			time + Math.min(0.008, duration * 0.1),
		);
		v.gain.exponentialRampToValueAtTime(0.0001, time + duration);
		o.connect(v);
		v.connect(bus);
		o.start(time);
		o.stop(time + duration + 0.02);
		this.nodes++;
		o.onended = () => {
			o.disconnect();
			v.disconnect();
			this.nodes--;
		};
	}

	_noise(
		time,
		duration,
		gain,
		cutoff = 5000,
		highpass = false,
		bus = this.sfxBus,
	) {
		const c = this.ctx;
		const n = c.createBufferSource();
		const f = c.createBiquadFilter();
		const v = c.createGain();
		n.buffer = this.noise;
		f.type = highpass ? "highpass" : "lowpass";
		f.frequency.value = cutoff;
		v.gain.setValueAtTime(gain, time);
		v.gain.exponentialRampToValueAtTime(0.0001, time + duration);
		n.connect(f);
		f.connect(v);
		v.connect(bus);
		n.start(time, this._random() * 0.1, duration);
		this.nodes++;
		n.onended = () => {
			n.disconnect();
			f.disconnect();
			v.disconnect();
			this.nodes--;
		};
	}

	_kick(time) {
		this._tone(145, time, 0.18, 0.48, "sine", this.musicBus, 39);
		this._noise(time, 0.018, 0.06, 1700, false, this.musicBus);
	}

	_snare(time) {
		this._noise(time, 0.12, 0.19, 1400, true, this.musicBus);
		this._tone(185, time, 0.08, 0.12, "triangle", this.musicBus, 95);
	}

	_note(midi) {
		return 440 * 2 ** ((midi - 69) / 12);
	}

	/** Call from the game's frame loop. Optional context: {intensity: 0..1, paused: boolean}. */
	tick(_dt = 0, context = {}) {
		if (
			!this.enabled ||
			!this.ctx ||
			this.ctx.state === "closed" ||
			!this.musicEnabled
		)
			return;
		this.intensity = Math.max(0, Math.min(1, Number(context.intensity) || 0));
		const now = this.ctx.currentTime;
		if (this.nextBeat < now - 0.15) this.nextBeat = now + 0.025;
		let safety = 0;
		while (this.nextBeat < now + 0.16 && safety++ < 8) {
			this._musicStep(this.step++, this.nextBeat);
			this.nextBeat += 60 / this.tempo / 4;
		}
	}

	_musicStep(step, time) {
		const i = step % 16;
		const bar = Math.floor(step / 16) % 8;
		// A minor 9 / D minor 9 / F major 7 / E7: warm arcade-lounge harmony.
		const chords = [
			[45, 60, 64, 67, 71],
			[45, 60, 64, 67, 71],
			[50, 62, 65, 69, 72],
			[50, 62, 65, 69, 72],
			[41, 60, 64, 69, 72],
			[41, 60, 64, 69, 72],
			[40, 59, 62, 68, 71],
			[40, 59, 62, 68, 71],
		];
		const chord = chords[bar];
		if (i % 4 === 0) this._kick(time);
		if (i === 4 || i === 12) this._snare(time);
		if (i % 2 === 0)
			this._noise(
				time,
				i === 14 ? 0.13 : 0.035,
				i % 4 === 2 ? 0.075 : 0.045,
				6500,
				true,
				this.musicBus,
			);
		if ([0, 3, 6, 8, 10, 14].includes(i)) {
			const interval = i === 6 || i === 14 ? 12 : i === 10 ? 7 : 0;
			this._tone(
				this._note(chord[0] + interval),
				time,
				0.17,
				0.24,
				"triangle",
				this.musicBus,
			);
			this._tone(
				this._note(chord[0] + interval + 12),
				time,
				0.08,
				0.045,
				"sine",
				this.musicBus,
			);
		}
		if (i === 2 || i === 10) {
			chord
				.slice(1)
				.forEach((n, j) =>
					this._tone(
						this._note(n),
						time + j * 0.007,
						0.15,
						0.065,
						"triangle",
						this.musicBus,
					),
				);
		}
		const melody = [
			76,
			null,
			79,
			null,
			81,
			79,
			76,
			null,
			74,
			null,
			72,
			74,
			76,
			null,
			71,
			null,
		];
		if ((bar % 2 === 1 || this.intensity > 0.5) && melody[i] != null) {
			const offset = bar >= 6 ? -1 : bar >= 4 ? 0 : bar >= 2 ? -2 : 0;
			this._tone(
				this._note(melody[i] + offset),
				time,
				0.15,
				0.075,
				"sine",
				this.musicBus,
			);
			this._tone(
				this._note(melody[i] + offset + 12),
				time,
				0.11,
				0.018,
				"triangle",
				this.musicBus,
			);
		}
		this.events.music++;
	}

	play(type, strength = 1) {
		if (!this.enabled || !this.ctx || this.ctx.state === "closed") return;
		const t = this.ctx.currentTime + 0.002;
		const s = Math.max(0.1, Math.min(2, Number(strength) || 1));
		this.events.sfx++;
		switch (type) {
			case "hit":
			case "paddle":
				this._tone(
					330 + this._random() * 100,
					t,
					0.09,
					0.18 * s,
					"triangle",
					this.sfxBus,
					150,
				);
				this._tone(950, t, 0.035, 0.055 * s, "sine", this.sfxBus, 450);
				this._noise(t, 0.035, 0.045 * s, 3300);
				break;
			case "wall":
			case "bounce":
				this._tone(185, t, 0.07, 0.11 * s, "sine", this.sfxBus, 80);
				this._noise(t, 0.025, 0.025 * s, 2200);
				break;
			case "bank":
			case "bonus":
				[784, 988, 1175].forEach((f, i) =>
					this._tone(f, t + i * 0.045, 0.16, 0.1, "triangle"),
				);
				break;
			case "goal":
			case "point":
			case "score":
				[523, 659, 784, 1047].forEach((f, i) =>
					this._tone(f, t + i * 0.075, 0.23, 0.16, "triangle"),
				);
				this._noise(t + 0.24, 0.3, 0.07, 4500, true);
				break;
			case "win":
			case "medal":
				[60, 64, 67, 72, 71, 74, 79, 84].forEach((n, i) => {
					this._tone(this._note(n), t + i * 0.105, 0.32, 0.14, "triangle");
					if (i === 7)
						[72, 76, 79].forEach((m) =>
							this._tone(this._note(m), t + i * 0.105, 0.9, 0.07, "sine"),
						);
				});
				this.speak("win");
				break;
			case "lose":
				[64, 62, 59, 57].forEach((n, i) =>
					this._tone(this._note(n), t + i * 0.15, 0.25, 0.13, "triangle"),
				);
				this.speak("lose");
				break;
			case "charge":
				this._tone(240, t, 0.28, 0.1, "sawtooth", this.sfxBus, 790);
				break;
			case "boost":
			case "power":
			case "smash":
				this._noise(t, 0.22, 0.12, 2800);
				this._tone(160, t, 0.25, 0.12, "sawtooth", this.sfxBus, 740);
				this._tone(1047, t + 0.05, 0.14, 0.09, "sine", this.sfxBus, 1568);
				break;
			case "serve":
			case "start":
				[392, 523, 784].forEach((f, i) =>
					this._tone(f, t + i * 0.07, 0.14, 0.11, "triangle"),
				);
				break;
			case "countdown":
				this._tone(660, t, 0.11, 0.12, "sine");
				break;
			case "error":
				this._tone(140, t, 0.14, 0.1, "square", this.sfxBus, 100);
				break;
			case "menu":
			case "select":
			case "click":
				this._tone(880, t, 0.055, 0.075, "sine", this.sfxBus, 1175);
				break;
			default:
				this._tone(660, t, 0.06, 0.07, "triangle");
		}
	}

	/** Short voiced, formant-filtered gibberish. Never uses SpeechSynthesis or recordings. */
	speak(mood = "happy") {
		if (!this.enabled || !this.ctx || this.ctx.state === "closed") return;
		const now = this.ctx.currentTime;
		if (now - this.lastVoice < 1.1) return;
		this.lastVoice = now;
		const vowels = [
			[780, 1150, 2650],
			[360, 2100, 2850],
			[540, 920, 2400],
			[430, 1500, 2500],
			[300, 870, 2250],
		];
		const upbeat = !["lose", "sad"].includes(mood);
		const count = mood === "win" ? 6 : 4;
		for (let i = 0; i < count; i++) {
			const time = now + 0.04 + i * 0.105;
			const dur = i === count - 1 ? 0.16 : 0.075;
			const base = (upbeat ? 220 : 160) * [1, 1.17, 0.94, 1.4, 1.2, 1.6][i];
			const o = this.ctx.createOscillator();
			o.type = "sawtooth";
			o.frequency.setValueAtTime(base, time);
			o.frequency.exponentialRampToValueAtTime(
				base * (upbeat ? 1.08 : 0.85),
				time + dur,
			);
			const v = this.ctx.createGain();
			v.gain.setValueAtTime(0, time);
			v.gain.linearRampToValueAtTime(0.052, time + 0.012);
			v.gain.setValueAtTime(0.045, time + dur * 0.65);
			v.gain.linearRampToValueAtTime(0, time + dur);
			const filters = vowels[(i + (upbeat ? 0 : 2)) % vowels.length].map(
				(freq, j) => {
					const f = this.ctx.createBiquadFilter();
					f.type = "bandpass";
					f.frequency.value = freq;
					f.Q.value = 5 + j * 2;
					o.connect(f);
					f.connect(v);
					return f;
				},
			);
			v.connect(this.voiceBus);
			o.start(time);
			o.stop(time + dur + 0.01);
			this.nodes++;
			o.onended = () => {
				o.disconnect();
				filters.forEach((f) => f.disconnect());
				v.disconnect();
				this.nodes--;
			};
			// Unvoiced consonant edges make the otherwise simple vowel bleeps feel spoken.
			this._noise(time, 0.018, 0.02, 3600, true, this.voiceBus);
		}
		this.events.voice++;
	}

	getDiagnostics() {
		let peak = 0;
		if (this.analyser) {
			const a = new Float32Array(this.analyser.fftSize);
			this.analyser.getFloatTimeDomainData(a);
			for (const n of a) peak = Math.max(peak, Math.abs(n));
		}
		return {
			state: this.ctx?.state || "locked",
			musicVolume: this.musicVolume,
			sfxVolume: this.sfxVolume,
			muted: this.muted,
			activeNodes: this.nodes,
			peak,
			events: { ...this.events },
		};
	}

	/** Offline browser test: returns audible output statistics without requiring speakers. */
	static async renderProbe() {
		const Offline =
			globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
		if (!Offline) return { supported: false };
		const ctx = new Offline(1, 48000 * 2, 48000);
		const audio = new AudioEngine({ context: ctx });
		for (let i = 0; i < 12; i++) audio._musicStep(i, 0.04 + i * 0.125);
		audio.play("hit");
		audio.play("boost");
		audio.speak("win");
		const rendered = await ctx.startRendering();
		const samples = rendered.getChannelData(0);
		let sum = 0,
			peak = 0,
			nonzero = 0,
			finite = true;
		for (const s of samples) {
			sum += s * s;
			peak = Math.max(peak, Math.abs(s));
			if (Math.abs(s) > 0.00001) nonzero++;
			if (!Number.isFinite(s)) finite = false;
		}
		return {
			supported: true,
			finite,
			rms: Math.sqrt(sum / samples.length),
			peak,
			nonzero,
			samples: samples.length,
			musicVolume: audio.musicVolume,
			events: { ...audio.events },
		};
	}

	async destroy() {
		this.enabled = false;
		if (this.ctx && this.ctx.close && this.ctx.state !== "closed")
			await this.ctx.close();
	}
}
