// Kapop's entire soundtrack is synthesized. No samples, files, or speech services.
export class GameAudio {
	constructor(options = {}) {
		this.ctx = options.context || null;
		this.random = options.random || Math.random;
		this.musicVolume = 0.1;
		this.sfxVolume = 0.65;
		this.unlocked = false;
		this.paused = false;
		this.active = false;
		this.wave = 1;
		this.combo = 0;
		this.step = 0;
		this.nextBeat = 0;
		this.nodes = new Set();
		this.stats = { effects: 0, syllables: 0, musicSteps: 0, notes: 0 };
		this.effects = [
			"catch",
			"splash",
			"combo",
			"dash",
			"bomb",
			"miss",
			"gameover",
			"victory",
			"start",
			"wave",
			"power",
			"ui",
		];
	}

	async unlock() {
		if (this.unlocked && this.master) {
			if (!this.offline && this.ctx.state === "suspended")
				await this.ctx.resume();
			return true;
		}
		if (!this.ctx) {
			const AudioContextClass =
				globalThis.AudioContext || globalThis.webkitAudioContext;
			if (!AudioContextClass) return false;
			this.ctx = new AudioContextClass({ latencyHint: "interactive" });
		}
		if (!this.master) this._connect();
		this.offline = typeof this.ctx.startRendering === "function";
		if (!this.offline && this.ctx.state === "suspended" && this.ctx.resume)
			await this.ctx.resume();
		this.unlocked = true;
		this.nextBeat = this.ctx.currentTime + 0.045;
		return true;
	}

	_connect() {
		const c = this.ctx;
		this.master = c.createGain();
		this.master.gain.value = 0.78;
		this.music = c.createGain();
		this.fx = c.createGain();
		this.music.gain.value = this.musicVolume;
		this.fx.gain.value = this.sfxVolume;
		this.music.connect(this.master);
		this.fx.connect(this.master);
		this.compressor = c.createDynamicsCompressor();
		this.compressor.threshold.value = -16;
		this.compressor.knee.value = 16;
		this.compressor.ratio.value = 5;
		this.compressor.attack.value = 0.004;
		this.compressor.release.value = 0.12;
		this.analyser = c.createAnalyser();
		this.analyser.fftSize = 256;
		this.meter = new Float32Array(256);
		this.master.connect(this.compressor);
		this.compressor.connect(this.analyser);
		this.analyser.connect(c.destination);
		this.noiseBuffer = c.createBuffer(1, c.sampleRate, c.sampleRate);
		const data = this.noiseBuffer.getChannelData(0);
		for (let i = 0; i < data.length; i++) data[i] = this.random() * 2 - 1;
	}

	setVolumes(music = this.musicVolume, sfx = this.sfxVolume) {
		this.musicVolume = Math.max(0, Math.min(1, Number(music) || 0));
		this.sfxVolume = Math.max(0, Math.min(1, Number(sfx) || 0));
		if (this.music) {
			this.music.gain.setTargetAtTime(
				this.paused ? 0 : this.musicVolume,
				this.ctx.currentTime,
				0.025,
			);
			this.fx.gain.setTargetAtTime(this.sfxVolume, this.ctx.currentTime, 0.025);
		}
	}

	setPaused(paused) {
		this.paused = !!paused;
		if (this.music)
			this.music.gain.setTargetAtTime(
				this.paused ? 0 : this.musicVolume,
				this.ctx.currentTime,
				0.025,
			);
		if (!this.paused && this.ctx) this.nextBeat = this.ctx.currentTime + 0.05;
	}

	_track(node, cleanup) {
		this.nodes.add(node);
		node.onended = () => {
			this.nodes.delete(node);
			node.disconnect();
			cleanup?.();
		};
	}

	_tone(
		freq,
		time,
		duration,
		volume,
		type = "triangle",
		bus = this.fx,
		endFreq = freq,
	) {
		const c = this.ctx;
		const oscillator = c.createOscillator();
		const envelope = c.createGain();
		oscillator.type = type;
		oscillator.frequency.setValueAtTime(Math.max(15, freq), time);
		if (endFreq !== freq)
			oscillator.frequency.exponentialRampToValueAtTime(
				Math.max(15, endFreq),
				time + duration,
			);
		envelope.gain.setValueAtTime(0.0001, time);
		envelope.gain.exponentialRampToValueAtTime(
			Math.max(0.0002, volume),
			time + 0.005,
		);
		envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
		oscillator.connect(envelope);
		envelope.connect(bus);
		this._track(oscillator, () => envelope.disconnect());
		oscillator.start(time);
		oscillator.stop(time + duration + 0.015);
		this.stats.notes++;
	}

	_noise(
		time,
		duration,
		volume,
		freq,
		q = 0.6,
		bus = this.fx,
		kind = "bandpass",
	) {
		const c = this.ctx;
		const source = c.createBufferSource();
		source.buffer = this.noiseBuffer;
		const filter = c.createBiquadFilter();
		filter.type = kind;
		filter.frequency.setValueAtTime(freq, time);
		filter.frequency.exponentialRampToValueAtTime(
			Math.max(100, freq * 0.45),
			time + duration,
		);
		filter.Q.value = q;
		const envelope = c.createGain();
		envelope.gain.setValueAtTime(0.0001, time);
		envelope.gain.exponentialRampToValueAtTime(
			Math.max(0.0002, volume),
			time + 0.004,
		);
		envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
		source.connect(filter);
		filter.connect(envelope);
		envelope.connect(bus);
		this._track(source, () => {
			filter.disconnect();
			envelope.disconnect();
		});
		source.start(time, this.random() * 0.35, duration + 0.02);
	}

	_midi(note) {
		return 440 * 2 ** ((note - 69) / 12);
	}

	update(_dt, state = {}) {
		this.active = !!state.active;
		this.wave = Number(state.wave) || 1;
		this.combo = Number(state.combo) || 0;
		if (
			!this.unlocked ||
			this.paused ||
			!this.active ||
			(!this.offline && this.ctx.state === "suspended")
		) {
			if (this.ctx) this.nextBeat = this.ctx.currentTime + 0.06;
			return;
		}
		const now = this.ctx.currentTime;
		if (this.nextBeat < now - 0.2) this.nextBeat = now + 0.025;
		const stepDuration = 60 / (112 + Math.min(12, this.wave * 2)) / 4;
		let safety = 0;
		while (this.nextBeat < now + 0.12 && safety++ < 4) {
			this._musicStep(this.step++, this.nextBeat, stepDuration);
			this.nextBeat += stepDuration;
			this.stats.musicSteps++;
		}
	}

	_musicStep(step, t, d) {
		const s = step % 64;
		const chord = Math.floor(s / 16);
		const roots = [38, 38, 43, 45]; // D minor spy shuffle.
		const root = roots[chord];
		if (s % 4 === 0) {
			this._tone(130, t, 0.19, 0.62, "sine", this.music, 36);
			const walk = [0, 7, 10, 12][Math.floor(s / 4) % 4];
			this._tone(
				this._midi(root + walk),
				t + 0.005,
				d * 2.8,
				0.36,
				"triangle",
				this.music,
			);
		}
		if (s % 8 === 4) {
			this._noise(t, 0.12, 0.21, 2100, 0.5, this.music, "highpass");
			this._tone(176, t, 0.075, 0.08, "triangle", this.music, 115);
		}
		if (s % 2 === 0)
			this._noise(
				t + (s % 4 ? 0.018 : 0),
				0.035,
				s % 4 ? 0.085 : 0.045,
				7200,
				0.5,
				this.music,
				"highpass",
			);
		// Offbeat, dry electric-piano stabs leave room for catches.
		if ([2, 10, 14].includes(s % 16)) {
			for (const interval of [12, 15, 19])
				this._tone(
					this._midi(root + interval),
					t,
					d * 1.3,
					0.055,
					"sine",
					this.music,
				);
		}
		const motif = [
			74,
			null,
			77,
			81,
			null,
			79,
			77,
			null,
			74,
			72,
			null,
			69,
			72,
			null,
			74,
			77,
		];
		const melody = motif[Math.floor(s / 2) % 16];
		if (s % 2 === 1 && melody !== null) {
			const note = melody + (chord === 2 ? 5 : chord === 3 ? 2 : 0);
			this._tone(
				this._midi(note),
				t + 0.012,
				d * 1.6,
				0.09,
				"triangle",
				this.music,
			);
			this._tone(
				this._midi(note + 12),
				t + 0.012,
				d * 0.7,
				0.025,
				"sine",
				this.music,
			);
		}
		if (this.combo >= 10 && s % 4 === 3)
			this._tone(
				this._midi(root + 36 + [0, 3, 7, 10][Math.floor(s / 4) % 4]),
				t,
				0.07,
				0.035,
				"sine",
				this.music,
			);
	}

	sfx(name, pitch = 0) {
		if (
			!this.unlocked ||
			!this.ctx ||
			(!this.offline && this.ctx.state === "suspended")
		)
			return;
		const t = this.ctx.currentTime + 0.005;
		const shift = 2 ** (Math.max(-24, Math.min(24, Number(pitch) || 0)) / 12);
		this.stats.effects++;
		switch (name) {
			case "catch":
			case "splash":
				this._tone(620 * shift, t, 0.13, 0.18, "sine", this.fx, 1050 * shift);
				this._tone(1240 * shift, t + 0.025, 0.12, 0.07, "triangle");
				this._noise(t, 0.12, 0.16, 2300);
				break;
			case "combo":
			case "power":
				[0, 4, 7, 12].forEach((n, i) => {
					this._tone(
						this._midi(76 + n) * shift,
						t + i * 0.045,
						0.2,
						0.13,
						"triangle",
					);
				});
				this._noise(t, 0.1, 0.08, 6000);
				break;
			case "dash":
				this._noise(t, 0.18, 0.24, 5200);
				this._tone(180, t, 0.18, 0.15, "sine", this.fx, 600);
				break;
			case "bomb":
			case "miss":
				this._noise(t, 0.55, 0.5, 1800, 0.4, this.fx, "lowpass");
				this._tone(100, t, 0.55, 0.5, "sine", this.fx, 27);
				this._tone(66, t + 0.02, 0.32, 0.15, "sawtooth", this.fx, 32);
				break;
			case "gameover":
				[69, 65, 62, 57, 50].forEach((n, i) => {
					this._tone(this._midi(n), t + i * 0.16, 0.38, 0.16, "triangle");
				});
				this._noise(t + 0.65, 0.32, 0.16, 1700);
				break;
			case "victory":
				[62, 66, 69, 74, 69, 74, 78, 81].forEach((n, i) => {
					this._tone(
						this._midi(n),
						t + i * 0.13,
						i === 7 ? 0.8 : 0.27,
						0.17,
						"triangle",
					);
				});
				[62, 66, 69].forEach((n) => {
					this._tone(this._midi(n), t + 1.04, 0.8, 0.07, "sine");
				});
				break;
			case "wave":
			case "start":
				[62, 69, 74].forEach((n, i) => {
					this._tone(this._midi(n), t + i * 0.085, 0.24, 0.16, "triangle");
				});
				break;
			default:
				this._tone(740 * shift, t, 0.065, 0.09, "triangle");
		}
	}

	gibberish(mood = "happy") {
		if (
			!this.unlocked ||
			!this.ctx ||
			(!this.offline && this.ctx.state === "suspended")
		)
			return;
		const c = this.ctx;
		const start = c.currentTime + 0.008;
		const sad = mood === "sad" || mood === "miss";
		const notes = sad ? [0, -3, -7] : [0, 5, 2, 9];
		for (let i = 0; i < notes.length; i++) {
			const t = start + i * 0.075;
			const oscillator = c.createOscillator();
			const filter = c.createBiquadFilter();
			const envelope = c.createGain();
			oscillator.type = "sawtooth";
			const f = (sad ? 195 : 285) * 2 ** ((notes[i] + this.random() * 2) / 12);
			oscillator.frequency.setValueAtTime(f, t);
			oscillator.frequency.exponentialRampToValueAtTime(
				f * (sad ? 0.8 : 1.13),
				t + 0.065,
			);
			filter.type = "bandpass";
			filter.frequency.value = [920, 1700, 1200, 2300][i % 4];
			filter.Q.value = 3.3;
			envelope.gain.setValueAtTime(0.0001, t);
			envelope.gain.exponentialRampToValueAtTime(0.16, t + 0.008);
			envelope.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
			oscillator.connect(filter);
			filter.connect(envelope);
			envelope.connect(this.fx);
			this._track(oscillator, () => {
				filter.disconnect();
				envelope.disconnect();
			});
			oscillator.start(t);
			oscillator.stop(t + 0.08);
			this.stats.syllables++;
		}
	}

	inspect() {
		let rms = 0;
		let peak = 0;
		if (this.analyser) {
			this.analyser.getFloatTimeDomainData(this.meter);
			for (const sample of this.meter) {
				rms += sample * sample;
				peak = Math.max(peak, Math.abs(sample));
			}
			rms = Math.sqrt(rms / this.meter.length);
		}
		return {
			unlocked: this.unlocked,
			contextState: this.ctx?.state || "locked",
			musicVolume: this.musicVolume,
			sfxVolume: this.sfxVolume,
			paused: this.paused,
			active: this.active,
			activeNodes: this.nodes.size,
			rms,
			peak,
			effectNames: [...this.effects],
			...this.stats,
		};
	}
}
