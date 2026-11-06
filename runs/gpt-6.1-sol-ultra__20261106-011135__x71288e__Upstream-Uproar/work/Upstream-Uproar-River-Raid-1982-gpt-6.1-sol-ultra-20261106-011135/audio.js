// Every sound in Upstream Uproar is synthesized here. No recorded audio assets.
export class AudioSystem {
	constructor() {
		this.ctx = null;
		this.musicVolume = 0.1;
		this.sfxVolume = 0.7;
		this.paused = false;
		this.stopped = false;
		this.playing = false;
		this.step = 0;
		this.nextBeat = 0;
		this.lastShot = -1;
		this.counts = { notes: 0, shots: 0, explosions: 0, pickups: 0, voices: 0 };
		this._seed = 1982;
		this._rms = 0;
	}

	_random() {
		this._seed = (Math.imul(this._seed, 1664525) + 1013904223) >>> 0;
		return this._seed / 4294967296;
	}

	async unlock() {
		const AudioContextClass =
			globalThis.AudioContext || globalThis.webkitAudioContext;
		if (!AudioContextClass) return false;
		if (!this.ctx) {
			this.ctx = new AudioContextClass();
			const c = this.ctx;
			this.master = c.createGain();
			this.master.gain.value = 0.78;
			this.music = c.createGain();
			this.music.gain.value = this.musicVolume;
			this.sfx = c.createGain();
			this.sfx.gain.value = this.sfxVolume;
			this.music.connect(this.master);
			this.sfx.connect(this.master);
			const compressor = c.createDynamicsCompressor();
			compressor.threshold.value = -12;
			compressor.knee.value = 16;
			compressor.ratio.value = 3;
			this.analyser = c.createAnalyser();
			this.analyser.fftSize = 512;
			this.samples = new Float32Array(this.analyser.fftSize);
			this.master
				.connect(compressor)
				.connect(this.analyser)
				.connect(c.destination);

			// A short spring-like slap, built out of native delay/filter nodes.
			this.echo = c.createDelay(0.5);
			this.echo.delayTime.value = 0.134;
			const echoTone = c.createBiquadFilter();
			echoTone.type = "lowpass";
			echoTone.frequency.value = 2100;
			const feedback = c.createGain();
			feedback.gain.value = 0.18;
			this.echo.connect(echoTone).connect(feedback).connect(this.echo);
			const echoLevel = c.createGain();
			echoLevel.gain.value = 0.22;
			echoTone.connect(echoLevel).connect(this.music);

			this.noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
			const data = this.noise.getChannelData(0);
			for (let i = 0; i < data.length; i++) data[i] = this._random() * 2 - 1;

			this.engineFilter = c.createBiquadFilter();
			this.engineFilter.type = "lowpass";
			this.engineFilter.frequency.value = 290;
			this.engineGain = c.createGain();
			this.engineGain.gain.value = 0;
			this.engineFilter.connect(this.engineGain).connect(this.sfx);
			this.engine = c.createOscillator();
			this.engine.type = "sawtooth";
			this.engine.frequency.value = 46;
			this.engine.connect(this.engineFilter);
			this.engine.start();
			this.engineHarmonic = c.createOscillator();
			this.engineHarmonic.type = "triangle";
			this.engineHarmonic.frequency.value = 93;
			this.engineHarmonic.connect(this.engineFilter);
			this.engineHarmonic.start();
			this.nextBeat = c.currentTime + 0.06;
		}
		this.stopped = false;
		if (this.ctx.state !== "running") await this.ctx.resume();
		this.master.gain.setTargetAtTime(
			this.paused ? 0 : 0.78,
			this.ctx.currentTime,
			0.035,
		);
		return this.ctx.state === "running";
	}

	setMusic(value) {
		this.musicVolume = Math.max(0, Math.min(1, Number(value) || 0));
		if (this.music)
			this.music.gain.setTargetAtTime(
				this.musicVolume,
				this.ctx.currentTime,
				0.04,
			);
	}

	setSfx(value) {
		this.sfxVolume = Math.max(0, Math.min(1, Number(value) || 0));
		if (this.sfx)
			this.sfx.gain.setTargetAtTime(this.sfxVolume, this.ctx.currentTime, 0.04);
	}

	_tone(
		freq,
		start,
		length,
		volume = 0.1,
		type = "triangle",
		destination = this.music,
		endFreq = freq,
	) {
		const c = this.ctx;
		const osc = c.createOscillator();
		const gain = c.createGain();
		osc.type = type;
		osc.frequency.setValueAtTime(Math.max(1, freq), start);
		osc.frequency.exponentialRampToValueAtTime(
			Math.max(1, endFreq),
			start + length,
		);
		gain.gain.setValueAtTime(0, start);
		gain.gain.linearRampToValueAtTime(
			volume,
			start + Math.min(0.007, length * 0.1),
		);
		gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
		osc.connect(gain).connect(destination);
		osc.start(start);
		osc.stop(start + length + 0.015);
		osc.onended = () => {
			osc.disconnect();
			gain.disconnect();
		};
		return gain;
	}

	_noise(
		start,
		length,
		volume,
		frequency,
		type = "highpass",
		destination = this.sfx,
	) {
		const c = this.ctx;
		const source = c.createBufferSource();
		source.buffer = this.noise;
		const filter = c.createBiquadFilter();
		filter.type = type;
		filter.frequency.value = frequency;
		filter.Q.value = 0.6;
		const gain = c.createGain();
		gain.gain.setValueAtTime(volume, start);
		gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
		source.connect(filter).connect(gain).connect(destination);
		source.start(start, this._random() * 0.4);
		source.stop(start + length + 0.015);
		source.onended = () => {
			source.disconnect();
			filter.disconnect();
			gain.disconnect();
		};
	}

	_musicStep(time) {
		const beat = this.step % 16;
		const bar = Math.floor(this.step / 16) % 8;
		const roots = [38, 38, 41, 41, 43, 43, 38, 45];
		const root = roots[bar];
		const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
		const bassOffsets = [
			0,
			null,
			12,
			null,
			0,
			null,
			7,
			10,
			null,
			0,
			null,
			12,
			7,
			null,
			10,
			null,
		];
		if (bassOffsets[beat] !== null)
			this._tone(hz(root + bassOffsets[beat]), time, 0.19, 0.48, "triangle");
		if (beat === 0 || beat === 6 || beat === 8 || beat === 14) {
			this._tone(118, time, 0.15, 0.68, "sine", this.music, 38);
			this._noise(time, 0.025, 0.08, 1500, "highpass", this.music);
		}
		if (beat === 4 || beat === 12) {
			this._noise(time, 0.13, 0.36, 1300, "bandpass", this.music);
			this._tone(170, time, 0.07, 0.16, "triangle");
		}
		if (beat % 2 === 0 || beat === 15)
			this._noise(
				time,
				beat === 14 ? 0.14 : 0.045,
				beat % 4 === 0 ? 0.12 : 0.07,
				7500,
				"highpass",
				this.music,
			);

		// Dorian melody over a little electric-organ offbeat chord.
		if ([2, 6, 10, 14].includes(beat)) {
			for (const interval of [12, 15, 19])
				this._tone(hz(root + interval), time, 0.085, 0.075, "square");
		}
		const melody = [
			24,
			null,
			27,
			31,
			null,
			29,
			null,
			27,
			24,
			null,
			22,
			null,
			24,
			27,
			null,
			31,
		];
		const note = melody[(beat + (bar % 2 ? 4 : 0)) % 16];
		if (note !== null && (bar % 4 < 3 || beat < 8)) {
			const out = this._tone(hz(root + note), time, 0.2, 0.13, "triangle");
			out.connect(this.echo);
		}
		this.step++;
		this.counts.notes++;
	}

	update(dt, state = {}) {
		if (!this.ctx || this.ctx.state !== "running" || this.stopped) return;
		const c = this.ctx;
		this.playing = !!state.playing;
		if (!this.paused) {
			if (this.nextBeat < c.currentTime - 0.3)
				this.nextBeat = c.currentTime + 0.025;
			let scheduled = 0;
			while (this.nextBeat < c.currentTime + 0.15 && scheduled++ < 6) {
				this._musicStep(this.nextBeat);
				this.nextBeat += 60 / 112 / 4;
			}
		}
		const speed = Math.max(0, Math.min(2.5, Number(state.speed) || 1));
		this.engine.frequency.setTargetAtTime(37 + speed * 17, c.currentTime, 0.1);
		this.engineHarmonic.frequency.setTargetAtTime(
			75 + speed * 34,
			c.currentTime,
			0.1,
		);
		this.engineFilter.frequency.setTargetAtTime(
			200 + speed * 130,
			c.currentTime,
			0.12,
		);
		this.engineGain.gain.setTargetAtTime(
			this.playing && !this.paused ? 0.024 : 0,
			c.currentTime,
			0.08,
		);
		this.analyser.getFloatTimeDomainData(this.samples);
		let energy = 0;
		for (let i = 0; i < this.samples.length; i++)
			energy += this.samples[i] * this.samples[i];
		this._rms = Math.sqrt(energy / this.samples.length);
	}

	shoot() {
		if (!this._audible()) return;
		const t = this.ctx.currentTime;
		if (t - this.lastShot < 0.025) return;
		this.lastShot = t;
		this._tone(1050, t, 0.065, 0.11, "square", this.sfx, 270);
		this._noise(t, 0.035, 0.085, 2400);
		this.counts.shots++;
	}

	explosion() {
		if (!this._audible()) return;
		const t = this.ctx.currentTime;
		this._noise(t, 0.38, 0.62, 620, "lowpass");
		this._noise(t, 0.15, 0.22, 1800, "bandpass");
		this._tone(115, t, 0.32, 0.52, "sine", this.sfx, 24);
		this.counts.explosions++;
	}

	pickup() {
		if (!this._audible()) return;
		const t = this.ctx.currentTime;
		[587.33, 739.99, 880, 1174.66].forEach((f, i) =>
			this._tone(f, t + i * 0.055, 0.18, 0.14, "triangle", this.sfx),
		);
		this.counts.pickups++;
	}

	voice(kind = "radio") {
		if (!this._audible()) return;
		const c = this.ctx;
		const t = c.currentTime;
		const low = kind === "danger" || kind === "hit";
		const victorious =
			kind === "win" || kind === "complete" || kind === "victory";
		const syllables = victorious ? 7 : low ? 5 : 6;
		this._noise(t, 0.065, 0.08, 2100, "bandpass");
		for (let i = 0; i < syllables; i++) {
			const start = t + 0.07 + i * 0.085;
			const length = 0.055 + this._random() * 0.035;
			const pitch =
				(low ? 115 : 180) + this._random() * 120 + (victorious ? i * 14 : 0);
			const formant = c.createBiquadFilter();
			formant.type = "bandpass";
			formant.frequency.value = [740, 1250, 1800, 920, 2250, 1300][i % 6];
			formant.Q.value = 3.2;
			formant.connect(this.sfx);
			const envelope = this._tone(
				pitch,
				start,
				length,
				0.3,
				"sawtooth",
				formant,
				pitch * (i % 2 ? 0.76 : 1.19),
			);
			// Extra nasal harmonic makes the clipped syllables read like radio chatter.
			this._tone(
				pitch * 2.01,
				start,
				length * 0.8,
				0.055,
				"triangle",
				formant,
				pitch * 1.9,
			);
			setTimeout(
				() => {
					formant.disconnect();
					envelope.disconnect();
				},
				Math.ceil((start + length - c.currentTime + 0.1) * 1000),
			);
		}
		this._noise(t + syllables * 0.085 + 0.1, 0.04, 0.07, 1800, "bandpass");
		this.counts.voices++;
	}

	_audible() {
		return (
			this.ctx && this.ctx.state === "running" && !this.paused && !this.stopped
		);
	}

	pause(value) {
		this.paused = !!value;
		if (!this.ctx) return;
		this.master.gain.setTargetAtTime(
			this.paused ? 0 : 0.78,
			this.ctx.currentTime,
			0.025,
		);
		if (!this.paused) this.nextBeat = this.ctx.currentTime + 0.06;
	}

	stop() {
		this.stopped = true;
		if (!this.ctx) return;
		this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.015);
		this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.015);
	}

	diagnostics() {
		return {
			supported: !!(globalThis.AudioContext || globalThis.webkitAudioContext),
			state: this.ctx?.state || "locked",
			sampleRate: this.ctx?.sampleRate || 0,
			musicVolume: this.musicVolume,
			sfxVolume: this.sfxVolume,
			paused: this.paused,
			stopped: this.stopped,
			rms: this._rms,
			...this.counts,
		};
	}
}
