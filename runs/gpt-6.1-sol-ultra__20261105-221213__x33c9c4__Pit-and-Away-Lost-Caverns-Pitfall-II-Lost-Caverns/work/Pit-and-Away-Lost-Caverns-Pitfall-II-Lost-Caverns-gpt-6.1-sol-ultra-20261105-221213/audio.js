// Every audible sound is synthesized. No recordings, samples, or audio downloads.
const MIDI = (n) => 440 * 2 ** ((n - 69) / 12);
const MELODY = [
	0, 4, 7, 12, 11, 7, 4, 2, 0, 4, 9, 7, 4, 2, 4, 7, 12, 7, 4, 2, 5, 9, 7, 4, 2,
	7, 4, 2, 0, 4, 7, 12,
];
const WALTZ = [
	0, 7, 12, 11, 7, 4, 2, 7, 11, 12, 9, 5, 4, 9, 12, 14, 12, 7, 5, 9, 12, 11, 7,
	2,
];

export class CavernAudio {
	constructor({ context = null } = {}) {
		this.ctx = context;
		this.musicVolume = 0.1;
		this.sfxVolume = 0.65;
		this.mode = "explore";
		this.active = false;
		this.started = false;
		this.beat = 0;
		this.nextBeat = 0;
		this.nodes = new Set();
		this.stats = {
			notes: 0,
			effects: 0,
			voices: 0,
			peak: 0,
			rms: 0,
			musicVolume: 0.1,
		};
	}

	async start() {
		if (!this.ctx) {
			const Context = window.AudioContext || window.webkitAudioContext;
			if (!Context) return false;
			this.ctx = new Context();
		}
		if (!this.started) {
			this.started = true;
			const c = this.ctx;
			this.master = c.createGain();
			this.master.gain.value = 0.8;
			this.musicGain = c.createGain();
			this.musicGain.gain.value = this.musicVolume;
			this.sfxGain = c.createGain();
			this.sfxGain.gain.value = this.sfxVolume;
			this.compressor = c.createDynamicsCompressor();
			this.compressor.threshold.value = -16;
			this.compressor.knee.value = 14;
			this.compressor.ratio.value = 4;
			this.analyser = c.createAnalyser();
			this.analyser.fftSize = 1024;
			this.musicGain.connect(this.master);
			this.sfxGain.connect(this.master);
			this.master.connect(this.compressor);
			this.compressor.connect(this.analyser);
			this.analyser.connect(c.destination);
			this.samples = new Float32Array(this.analyser.fftSize);
			this.noise = c.createBuffer(
				1,
				Math.floor(c.sampleRate * 0.25),
				c.sampleRate,
			);
			const values = this.noise.getChannelData(0);
			let seed = 56789;
			for (let i = 0; i < values.length; i++) {
				seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
				values[i] = (seed / 2147483648 - 1) * (1 - i / values.length);
			}
			this.nextBeat = c.currentTime + 0.04;
		}
		if (
			this.ctx.state === "suspended" &&
			!(
				typeof OfflineAudioContext !== "undefined" &&
				this.ctx instanceof OfflineAudioContext
			)
		) {
			await this.ctx.resume();
		}
		return true;
	}

	setMusic(value) {
		this.musicVolume = Math.max(0, Math.min(1, Number(value) || 0));
		this.stats.musicVolume = this.musicVolume;
		if (this.musicGain)
			this.musicGain.gain.setTargetAtTime(
				this.musicVolume,
				this.ctx.currentTime,
				0.025,
			);
	}
	setSfx(value) {
		this.sfxVolume = Math.max(0, Math.min(1, Number(value) || 0));
		if (this.sfxGain)
			this.sfxGain.gain.setTargetAtTime(
				this.sfxVolume,
				this.ctx.currentTime,
				0.025,
			);
	}

	_tone(
		hz,
		when,
		duration,
		volume,
		shape = "triangle",
		destination = this.sfxGain,
		endHz = null,
	) {
		if (!this.started || !Number.isFinite(hz)) return;
		const c = this.ctx;
		const osc = c.createOscillator();
		const gain = c.createGain();
		osc.type = shape;
		osc.frequency.setValueAtTime(hz, when);
		if (endHz)
			osc.frequency.exponentialRampToValueAtTime(
				Math.max(10, endHz),
				when + duration,
			);
		gain.gain.setValueAtTime(0.0001, when);
		gain.gain.exponentialRampToValueAtTime(
			Math.max(0.0002, volume),
			when + 0.008,
		);
		gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
		osc.connect(gain);
		gain.connect(destination);
		osc.start(when);
		osc.stop(when + duration + 0.015);
		this.nodes.add(osc);
		osc.onended = () => {
			this.nodes.delete(osc);
			osc.disconnect();
			gain.disconnect();
		};
	}

	_noise(when, duration, volume, filterHz = 1800, destination = this.sfxGain) {
		if (!this.started) return;
		const source = this.ctx.createBufferSource();
		const filter = this.ctx.createBiquadFilter();
		const gain = this.ctx.createGain();
		source.buffer = this.noise;
		filter.type = "bandpass";
		filter.frequency.value = filterHz;
		filter.Q.value = 0.7;
		gain.gain.setValueAtTime(volume, when);
		gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
		source.connect(filter);
		filter.connect(gain);
		gain.connect(destination);
		source.start(when);
		source.stop(when + duration);
		this.nodes.add(source);
		source.onended = () => {
			this.nodes.delete(source);
			source.disconnect();
			filter.disconnect();
			gain.disconnect();
		};
	}

	_scheduleBeat(when) {
		const balloon = this.mode === "balloon";
		const sad = this.mode === "sad";
		const swim = this.mode === "swim";
		const phrase = balloon ? WALTZ : MELODY;
		let interval = phrase[this.beat % phrase.length];
		if (sad && [4, 9, 11].includes(interval % 12)) interval--;
		const root = sad ? 57 : swim ? 62 : 60;
		const tempo = balloon ? 0.21 : sad ? 0.29 : swim ? 0.24 : 0.185;
		this._tone(
			MIDI(root + interval + 12),
			when,
			tempo * 1.8,
			0.14,
			"triangle",
			this.musicGain,
		);
		this._tone(
			MIDI(root + interval + 24),
			when + 0.013,
			tempo,
			0.025,
			"sine",
			this.musicGain,
		);
		const meter = balloon ? 3 : 4;
		if (this.beat % meter === 0) {
			const bass = [0, 5, 7, 0][Math.floor(this.beat / (meter * 2)) % 4];
			this._tone(
				MIDI(root + bass - 12),
				when,
				tempo * 2.5,
				0.18,
				"triangle",
				this.musicGain,
			);
			this._tone(95, when, 0.13, 0.13, "sine", this.musicGain, 42);
		} else {
			const chord = this.beat % meter === 1 ? (sad ? 3 : 4) : 7;
			this._tone(
				MIDI(root + chord),
				when,
				tempo * 0.8,
				0.06,
				"triangle",
				this.musicGain,
			);
		}
		if (!swim && this.beat % 2 === 1)
			this._noise(when, 0.045, 0.045, 4000, this.musicGain);
		if (swim && this.beat % 4 === 2)
			this._tone(240, when, 0.25, 0.045, "sine", this.musicGain, 750);
		this.stats.notes++;
		this.beat++;
		return tempo;
	}

	update(dt, state = {}) {
		if (!this.started) return;
		this.mode = ["explore", "balloon", "swim", "sad"].includes(state.mode)
			? state.mode
			: this.mode;
		const active = state.active !== false;
		if (active !== this.active) {
			this.active = active;
			this.master.gain.cancelScheduledValues(this.ctx.currentTime);
			this.master.gain.setTargetAtTime(0.8, this.ctx.currentTime, 0.035);
			this.musicGain.gain.setTargetAtTime(
				active ? this.musicVolume : 0,
				this.ctx.currentTime,
				0.035,
			);
			if (active) this.nextBeat = this.ctx.currentTime + 0.02;
		}
		if (active && this.ctx.state === "running") {
			if (this.nextBeat < this.ctx.currentTime - 0.5)
				this.nextBeat = this.ctx.currentTime;
			while (this.nextBeat < this.ctx.currentTime + 0.1)
				this.nextBeat += this._scheduleBeat(this.nextBeat);
		}
		this.analyser.getFloatTimeDomainData(this.samples);
		let square = 0,
			peak = 0;
		for (const sample of this.samples) {
			square += sample * sample;
			peak = Math.max(peak, Math.abs(sample));
		}
		this.stats.rms = Math.sqrt(square / this.samples.length);
		this.stats.peak = Math.max(this.stats.peak, peak);
	}

	effect(name) {
		if (!this.started) return;
		const t = this.ctx.currentTime + 0.005;
		this.stats.effects++;
		switch (name) {
			case "jump":
				this._tone(210, t, 0.14, 0.12, "triangle", this.sfxGain, 460);
				break;
			case "land":
				this._noise(t, 0.08, 0.1, 350);
				break;
			case "gold":
			case "collect":
				[79, 84, 88].forEach((n, i) =>
					this._tone(MIDI(n), t + i * 0.06, 0.2, 0.13, "sine"),
				);
				break;
			case "checkpoint":
				[60, 67, 72, 76].forEach((n, i) =>
					this._tone(MIDI(n), t + i * 0.1, 0.38, 0.12),
				);
				break;
			case "rescue":
			case "diamond":
				[72, 76, 79, 84, 79, 84, 88].forEach((n, i) =>
					this._tone(MIDI(n), t + i * 0.1, 0.3, 0.13),
				);
				this.voice(name === "rescue" ? 73 : 38);
				break;
			case "hit":
				this._tone(180, t, 0.4, 0.2, "sawtooth", this.sfxGain, 45);
				this._noise(t, 0.2, 0.13, 650);
				break;
			case "pop":
				this._noise(t, 0.11, 0.22, 1800);
				this._tone(620, t, 0.1, 0.08, "sine", this.sfxGain, 90);
				break;
			case "splash":
				this._noise(t, 0.24, 0.14, 1700);
				[0, 0.06, 0.13].forEach((offset, i) =>
					this._tone(
						220 + i * 100,
						t + offset,
						0.12,
						0.08,
						"sine",
						this.sfxGain,
						650 + i * 120,
					),
				);
				break;
			case "balloon":
				this._tone(170, t, 0.3, 0.1, "sine", this.sfxGain, 610);
				break;
			case "win":
				[60, 64, 67, 72, 67, 72, 76, 79, 84].forEach((n, i) =>
					this._tone(MIDI(n), t + i * 0.15, i === 8 ? 1.1 : 0.3, 0.15),
				);
				this.voice(318);
				break;
			case "pause":
			case "menu":
				this._tone(580, t, 0.07, 0.07, "sine");
				break;
			default:
				this._tone(440, t, 0.08, 0.06, "sine");
		}
	}

	voice(seed = 1) {
		if (!this.started) return;
		this.stats.voices++;
		const c = this.ctx;
		let random = (Number(seed) || 1) >>> 0;
		const rng = () => {
			random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
			return random / 4294967296;
		};
		const t = c.currentTime + 0.02;
		for (let i = 0; i < 6; i++) {
			const syllable = 0.07 + rng() * 0.035;
			const frequency = 170 + rng() * 180;
			const osc = c.createOscillator();
			const vowel = c.createBiquadFilter();
			const gain = c.createGain();
			const at = t + i * 0.11;
			osc.type = "sawtooth";
			osc.frequency.setValueAtTime(frequency, at);
			osc.frequency.linearRampToValueAtTime(
				frequency * (0.85 + rng() * 0.45),
				at + syllable,
			);
			vowel.type = "bandpass";
			vowel.frequency.value = [650, 900, 1400, 1800][Math.floor(rng() * 4)];
			vowel.Q.value = 4;
			gain.gain.setValueAtTime(0.0001, at);
			gain.gain.linearRampToValueAtTime(0.16, at + 0.012);
			gain.gain.exponentialRampToValueAtTime(0.0001, at + syllable);
			osc.connect(vowel);
			vowel.connect(gain);
			gain.connect(this.sfxGain);
			osc.start(at);
			osc.stop(at + syllable + 0.01);
			this.nodes.add(osc);
			osc.onended = () => {
				this.nodes.delete(osc);
				osc.disconnect();
				vowel.disconnect();
				gain.disconnect();
			};
		}
	}

	stop() {
		this.active = false;
		if (!this.started) return;
		this.master.gain.cancelScheduledValues(this.ctx.currentTime);
		this.master.gain.setValueAtTime(0, this.ctx.currentTime);
		for (const node of this.nodes) {
			try {
				node.stop();
			} catch {
				/* Already ended. */
			}
		}
		this.nodes.clear();
	}
	getStats() {
		return {
			...this.stats,
			active: this.active,
			contextState: this.ctx?.state || "not-started",
			liveNodes: this.nodes.size,
		};
	}

	static async auditOffline() {
		const context = new OfflineAudioContext(2, 44100 * 3, 44100);
		const audio = new CavernAudio({ context });
		await audio.start();
		for (let time = 0.02; time < 2.5; ) time += audio._scheduleBeat(time);
		audio.effect("gold");
		audio.voice(17);
		const buffer = await context.startRendering();
		const values = buffer.getChannelData(0);
		let peak = 0,
			square = 0;
		for (const value of values) {
			peak = Math.max(peak, Math.abs(value));
			square += value * value;
		}
		return {
			peak,
			rms: Math.sqrt(square / values.length),
			finite: values.every(Number.isFinite),
			musicVolume: audio.musicVolume,
			notes: audio.stats.notes,
			voices: audio.stats.voices,
			duration: buffer.duration,
		};
	}
}
