export class RadioAudio {
	constructor() {
		this.ctx = null;
		this.musicVolume = 0.1;
		this.effectsVolume = 0.65;
		this.muted = false;
		this.beat = 0;
		this.nextBeat = 0;
		this.voices = 0;
		this.events = 0;
		this.engine = null;
	}
	async unlock() {
		if (!this.ctx) {
			this.ctx = new (window.AudioContext || window.webkitAudioContext)();
			this.master = this.ctx.createGain();
			this.master.gain.value = 0.6;
			this.analyser = this.ctx.createAnalyser();
			this.analyser.fftSize = 256;
			this.master.connect(this.analyser);
			this.analyser.connect(this.ctx.destination);
			this.music = this.ctx.createGain();
			this.music.gain.value = this.musicVolume;
			this.music.connect(this.master);
			this.effects = this.ctx.createGain();
			this.effects.gain.value = this.effectsVolume;
			this.effects.connect(this.master);
			this.nextBeat = this.ctx.currentTime;
		}
		if (this.ctx.state !== "running") await this.ctx.resume();
	}
	volume(music, fx) {
		this.musicVolume = music;
		this.effectsVolume = fx;
		if (this.ctx) {
			this.music.gain.setTargetAtTime(music, this.ctx.currentTime, 0.05);
			this.effects.gain.setTargetAtTime(fx, this.ctx.currentTime, 0.05);
		}
	}
	silence(value) {
		this.muted = value;
		if (this.master)
			this.master.gain.setTargetAtTime(
				value ? 0 : 0.6,
				this.ctx.currentTime,
				0.06,
			);
	}
	tone(
		freq,
		duration,
		type = "square",
		gain = 0.12,
		when = 0,
		end = freq,
		bus = this.effects,
	) {
		if (!this.ctx || this.muted) return;
		const t = this.ctx.currentTime + when;
		const o = this.ctx.createOscillator();
		const g = this.ctx.createGain();
		o.type = type;
		o.frequency.setValueAtTime(Math.max(20, freq), t);
		o.frequency.exponentialRampToValueAtTime(Math.max(20, end), t + duration);
		g.gain.setValueAtTime(0, t);
		g.gain.linearRampToValueAtTime(gain, t + 0.008);
		g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
		o.connect(g);
		g.connect(bus);
		o.start(t);
		o.stop(t + duration + 0.01);
		this.events++;
	}
	noise(duration, gain = 0.15, cutoff = 1800, when = 0) {
		if (!this.ctx || this.muted) return;
		const buffer = this.ctx.createBuffer(
			1,
			Math.ceil(this.ctx.sampleRate * duration),
			this.ctx.sampleRate,
		);
		const data = buffer.getChannelData(0);
		let seed = 237;
		for (let i = 0; i < data.length; i++) {
			seed = (seed * 16807) % 2147483647;
			data[i] = (seed / 1073741824 - 1) * (1 - i / data.length);
		}
		const source = this.ctx.createBufferSource();
		source.buffer = buffer;
		const filter = this.ctx.createBiquadFilter();
		filter.type = "lowpass";
		filter.frequency.value = cutoff;
		const g = this.ctx.createGain();
		g.gain.value = gain;
		source.connect(filter);
		filter.connect(g);
		g.connect(this.effects);
		source.start(this.ctx.currentTime + when);
		this.events++;
	}
	sfx(name) {
		if (name === "shoot") this.tone(740, 0.07, "square", 0.045, 0, 220);
		if (name === "hit") {
			this.noise(0.14, 0.2);
			this.tone(190, 0.16, "sawtooth", 0.15, 0, 45);
		}
		if (name === "explode") {
			this.noise(0.65, 0.3, 900);
			this.tone(95, 0.4, "triangle", 0.3, 0, 25);
		}
		if (name === "roll") this.tone(180, 0.5, "sawtooth", 0.11, 0, 900);
		if (name === "burst") {
			this.noise(0.8, 0.4, 3500);
			[80, 120, 180].forEach((f, i) => {
				this.tone(f, 0.6, "sawtooth", 0.14, i * 0.08, 30);
			});
		}
		if (name === "fuel")
			[440, 554, 659].forEach((f, i) => {
				this.tone(f, 0.16, "sine", 0.2, i * 0.08);
			});
		if (name === "checkpoint" || name === "win")
			[392, 494, 587, 784, 988].forEach((f, i) => {
				this.tone(f, 0.5, "triangle", 0.22, i * 0.11);
			});
		if (name === "menu") this.tone(480, 0.065, "sine", 0.12, 0, 660);
		if (name === "alarm") {
			this.tone(620, 0.18, "triangle", 0.14);
			this.tone(420, 0.18, "triangle", 0.14, 0.19);
		}
	}
	gibberish() {
		if (!this.ctx) return;
		[320, 510, 380, 640, 420, 550, 330].forEach((f, i) => {
			this.tone(f, 0.09, "sawtooth", 0.035, i * 0.085, f * 1.35);
			this.tone(f * 2.3, 0.06, "sine", 0.045, i * 0.085);
		});
		this.voices++;
	}
	update(active, intensity = 0) {
		if (!this.ctx || this.muted || !active) {
			if (this.ctx) this.nextBeat = this.ctx.currentTime;
			return;
		}
		const scale = [0, 3, 5, 7, 10, 12, 10, 7, 5, 3, 7, 5, 0, 3, -2, 0];
		let guard = 0;
		while (this.nextBeat < this.ctx.currentTime + 0.12 && guard++ < 4) {
			const b = this.beat++;
			const delay = Math.max(0, this.nextBeat - this.ctx.currentTime);
			const root = [110, 110, 130.81, 98][Math.floor(b / 16) % 4];
			this.tone(
				root * 2 ** (scale[b % 16] / 12) * 2,
				0.18,
				"triangle",
				0.28,
				delay,
				root * 2 ** (scale[b % 16] / 12) * 2,
				this.music,
			);
			if (b % 2 === 0)
				this.tone(root / 2, 0.23, "square", 0.2, delay, root / 2, this.music);
			if (b % 4 === 0) this.tone(130, 0.13, "sine", 0.4, delay, 35, this.music);
			if (b % 4 === 2)
				this.tone(170, 0.06, "square", 0.07, delay, 1100, this.music);
			this.tone(6500, 0.028, "square", 0.025, delay, 4000, this.music);
			this.nextBeat += intensity ? 0.115 : 0.14;
		}
	}
	level() {
		if (!this.analyser) return 0;
		const data = new Uint8Array(256);
		this.analyser.getByteTimeDomainData(data);
		return Math.sqrt(
			data.reduce((sum, value) => sum + ((value - 128) / 128) ** 2, 0) /
				data.length,
		);
	}
}
