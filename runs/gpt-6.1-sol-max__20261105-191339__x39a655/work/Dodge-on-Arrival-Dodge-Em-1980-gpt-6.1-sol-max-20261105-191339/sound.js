class SynthGarage {
	constructor() {
		this.ctx = null;
		this.musicVolume = 0.1;
		this.effectsVolume = 0.65;
		this.enabled = true;
		this.musicStep = 0;
		this.nextBeat = 0;
		this.events = { dot: 0, crash: 0, voice: 0, slip: 0, music: 0 };
	}
	async unlock() {
		if (!this.enabled) return;
		if (!this.ctx) {
			const Audio = window.AudioContext || window.webkitAudioContext;
			if (!Audio) return;
			this.ctx = new Audio();
			this.master = this.ctx.createGain();
			this.master.gain.value = 0.6;
			this.analyser = this.ctx.createAnalyser();
			this.analyser.fftSize = 1024;
			const limiter = this.ctx.createDynamicsCompressor();
			limiter.threshold.value = -12;
			limiter.ratio.value = 8;
			this.master
				.connect(limiter)
				.connect(this.analyser)
				.connect(this.ctx.destination);
			this.music = this.ctx.createGain();
			this.fx = this.ctx.createGain();
			this.music.connect(this.master);
			this.fx.connect(this.master);
			this.noise = this.ctx.createBuffer(
				1,
				this.ctx.sampleRate,
				this.ctx.sampleRate,
			);
			const out = this.noise.getChannelData(0);
			let seed = 1549;
			for (let i = 0; i < out.length; i++) {
				seed = (seed * 1664525 + 1013904223) >>> 0;
				out[i] = (seed / 4294967296) * 2 - 1;
			}
			this.motor = this.ctx.createOscillator();
			this.motor.type = "sawtooth";
			this.motor.frequency.value = 42;
			this.motorFilter = this.ctx.createBiquadFilter();
			this.motorFilter.type = "lowpass";
			this.motorFilter.frequency.value = 230;
			this.motorGain = this.ctx.createGain();
			this.motorGain.gain.value = 0;
			this.motor
				.connect(this.motorFilter)
				.connect(this.motorGain)
				.connect(this.fx);
			this.motor.start();
			this.nextBeat = this.ctx.currentTime + 0.08;
		}
		this.setVolumes(this.musicVolume, this.effectsVolume);
		if (this.ctx.state === "suspended") await this.ctx.resume();
	}
	setVolumes(music, effects) {
		this.musicVolume = music;
		this.effectsVolume = effects;
		if (!this.ctx) return;
		this.music.gain.setTargetAtTime(music, this.ctx.currentTime, 0.03);
		this.fx.gain.setTargetAtTime(effects, this.ctx.currentTime, 0.03);
	}
	tone(
		frequency,
		duration = 0.1,
		type = "triangle",
		volume = 0.2,
		delay = 0,
		bus = this.fx,
		endFrequency = frequency,
	) {
		if (!this.ctx || !this.enabled || this.ctx.state !== "running") return;
		const t = this.ctx.currentTime + delay;
		const osc = this.ctx.createOscillator();
		const gain = this.ctx.createGain();
		osc.type = type;
		osc.frequency.setValueAtTime(frequency, t);
		osc.frequency.exponentialRampToValueAtTime(
			Math.max(10, endFrequency),
			t + duration,
		);
		gain.gain.setValueAtTime(0, t);
		gain.gain.linearRampToValueAtTime(volume, t + 0.005);
		gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
		osc.connect(gain).connect(bus);
		osc.start(t);
		osc.stop(t + duration + 0.02);
		osc.onended = () => {
			osc.disconnect();
			gain.disconnect();
		};
	}
	hiss(duration = 0.15, volume = 0.2, cutoff = 900, delay = 0, bus = this.fx) {
		if (!this.ctx || !this.enabled || this.ctx.state !== "running") return;
		const t = this.ctx.currentTime + delay;
		const src = this.ctx.createBufferSource();
		src.buffer = this.noise;
		const filter = this.ctx.createBiquadFilter();
		filter.type = "highpass";
		filter.frequency.value = cutoff;
		const gain = this.ctx.createGain();
		gain.gain.setValueAtTime(volume, t);
		gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
		src.connect(filter).connect(gain).connect(bus);
		src.start(t);
		src.stop(t + duration + 0.02);
		src.onended = () => {
			src.disconnect();
			filter.disconnect();
			gain.disconnect();
		};
	}
	dot(combo = 0) {
		this.events.dot++;
		this.tone(
			520 + (combo % 8) * 63,
			0.07,
			"triangle",
			0.14,
			0,
			this.fx,
			910 + (combo % 8) * 45,
		);
	}
	click() {
		this.tone(320, 0.06, "square", 0.06, 0, this.fx, 220);
	}
	gate() {
		this.hiss(0.08, 0.08, 2200);
		this.tone(180, 0.09, "triangle", 0.1, 0, this.fx, 400);
	}
	near() {
		this.tone(420, 0.19, "sine", 0.24, 0, this.fx, 1300);
		this.hiss(0.16, 0.12, 1300);
	}
	slip() {
		this.events.slip++;
		this.tone(120, 0.6, "sawtooth", 0.16, 0, this.fx, 780);
		this.hiss(0.35, 0.18, 600);
	}
	crash() {
		this.events.crash++;
		this.hiss(0.65, 0.65, 180);
		this.tone(140, 0.45, "sawtooth", 0.4, 0, this.fx, 25);
		this.tone(64, 0.4, "sine", 0.5);
	}
	cheer() {
		[0, 4, 7, 12, 16, 19].forEach((n, i) =>
			this.tone(220 * 2 ** (n / 12), 0.32, "triangle", 0.19, i * 0.09),
		);
		this.voice(2);
	}
	voice(mood = 0) {
		if (!this.ctx || !this.enabled) return;
		this.events.voice++;
		const syllables =
			mood === 2
				? [1, 1.45, 1.2, 1.8]
				: mood === 1
					? [1.3, 0.85, 0.65]
					: [1.0, 1.2, 0.9];
		syllables.forEach((pitch, i) => {
			const t = this.ctx.currentTime + i * 0.105;
			const osc = this.ctx.createOscillator();
			const filter = this.ctx.createBiquadFilter();
			const gain = this.ctx.createGain();
			osc.type = "sawtooth";
			osc.frequency.setValueAtTime(190 * pitch, t);
			osc.frequency.linearRampToValueAtTime(225 * pitch, t + 0.075);
			filter.type = "bandpass";
			filter.frequency.setValueAtTime([850, 1400, 620, 1800][i % 4], t);
			filter.Q.value = 5;
			gain.gain.setValueAtTime(0, t);
			gain.gain.linearRampToValueAtTime(0.15, t + 0.012);
			gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
			osc.connect(filter).connect(gain).connect(this.fx);
			osc.start(t);
			osc.stop(t + 0.1);
			osc.onended = () => {
				osc.disconnect();
				filter.disconnect();
				gain.disconnect();
			};
		});
	}
	update(driving, boosted, paused, danger = false) {
		if (!this.ctx || this.ctx.state !== "running" || !this.enabled) return;
		const now = this.ctx.currentTime;
		this.motorGain.gain.setTargetAtTime(
			driving && !paused ? (boosted ? 0.045 : 0.025) : 0,
			now,
			0.1,
		);
		this.motor.frequency.setTargetAtTime(
			boosted ? 95 : danger ? 63 : 47,
			now,
			0.12,
		);
		this.motorFilter.frequency.setTargetAtTime(boosted ? 530 : 240, now, 0.12);
		if (paused) {
			this.nextBeat = now + 0.1;
			return;
		}
		if (this.nextBeat < now - 1) this.nextBeat = now + 0.04;
		const bass = [0, 0, 7, 0, 3, 3, 10, 7, 5, 5, 12, 7, 3, 10, 7, 10];
		const melody = [
			19, 22, 24, 26, 24, 22, 19, 15, 19, 22, 27, 26, 24, 22, 19, 17,
		];
		let safety = 0;
		while (this.nextBeat < now + 0.12 && safety++ < 4) {
			const step = this.musicStep++;
			const delay = Math.max(0, this.nextBeat - now);
			if (step % 2 === 0) {
				this.tone(
					55 * 2 ** (bass[(step / 2) % 16] / 12),
					0.25,
					"triangle",
					0.65,
					delay,
					this.music,
				);
				this.tone(95, 0.14, "sine", 0.6, delay, this.music, 32);
			}
			if (step % 4 === 2) this.hiss(0.12, 0.27, 1200, delay, this.music);
			this.hiss(0.035, step % 2 ? 0.12 : 0.07, 6000, delay, this.music);
			if (step % 2 === 1)
				this.tone(
					220 * 2 ** (melody[Math.floor(step / 2) % 16] / 12),
					0.18,
					"sine",
					0.22,
					delay,
					this.music,
				);
			this.events.music++;
			this.nextBeat += 60 / 116 / 2;
		}
	}
	stop() {
		this.enabled = false;
		if (this.ctx) {
			this.master.gain.value = 0;
			this.ctx.suspend().catch(() => {});
		}
	}
	level() {
		if (!this.analyser) return 0;
		const buffer = new Float32Array(this.analyser.fftSize);
		this.analyser.getFloatTimeDomainData(buffer);
		return Math.sqrt(buffer.reduce((s, v) => s + v * v, 0) / buffer.length);
	}
}
