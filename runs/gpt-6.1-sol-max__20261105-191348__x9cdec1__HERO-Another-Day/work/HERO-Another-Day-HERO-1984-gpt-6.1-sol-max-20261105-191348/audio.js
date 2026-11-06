class SynthAudio {
	constructor() {
		this.ctx = null;
		this.masterVolume = 0.7;
		this.musicVolume = 0.1;
		this.sfxVolume = 0.75;
		this.enabled = false;
		this.muted = false;
		this.beat = 0;
		this.nextBeat = 0;
		this.sector = 0;
		this.voicesPlayed = 0;
		this.soundsPlayed = 0;
		this.musicNotes = 0;
	}
	setup(ctx) {
		this.ctx = ctx;
		this.master = ctx.createGain();
		this.master.gain.value = this.masterVolume;
		this.master.connect(ctx.destination);
		this.music = ctx.createGain();
		this.music.gain.value = this.musicVolume;
		this.music.connect(this.master);
		this.effects = ctx.createGain();
		this.effects.gain.value = this.sfxVolume;
		this.effects.connect(this.master);
		this.analyser = ctx.createAnalyser();
		this.analyser.fftSize = 256;
		this.master.connect(this.analyser);
		const n = ctx.sampleRate;
		this.noise = ctx.createBuffer(1, n, ctx.sampleRate);
		const d = this.noise.getChannelData(0);
		let s = 4321;
		for (let i = 0; i < n; i++) {
			s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
			d[i] = (s / 4294967296) * 2 - 1;
		}
		this.nextBeat = ctx.currentTime + 0.08;
	}
	async unlock() {
		if (!this.ctx)
			this.setup(new (window.AudioContext || window.webkitAudioContext)());
		await this.ctx.resume();
		this.enabled = true;
	}
	setLevels() {
		if (!this.ctx) return;
		this.master.gain.setTargetAtTime(
			this.muted ? 0 : this.masterVolume,
			this.ctx.currentTime,
			0.04,
		);
		this.music.gain.setTargetAtTime(
			this.musicVolume,
			this.ctx.currentTime,
			0.05,
		);
		this.effects.gain.setTargetAtTime(
			this.sfxVolume,
			this.ctx.currentTime,
			0.03,
		);
	}
	tone(
		freq,
		duration = 0.12,
		type = "sine",
		volume = 0.15,
		at = null,
		dest = null,
		endFreq = null,
	) {
		if (!this.ctx) return;
		const t = at ?? this.ctx.currentTime;
		const o = this.ctx.createOscillator(),
			g = this.ctx.createGain();
		o.type = type;
		o.frequency.setValueAtTime(Math.max(20, freq), t);
		if (endFreq)
			o.frequency.exponentialRampToValueAtTime(
				Math.max(20, endFreq),
				t + duration,
			);
		g.gain.setValueAtTime(0, t);
		g.gain.linearRampToValueAtTime(volume, t + 0.006);
		g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
		o.connect(g);
		g.connect(dest || this.effects);
		o.start(t);
		o.stop(t + duration + 0.01);
		return o;
	}
	hiss(duration, volume, cutoff = 1500, at = null, dest = null) {
		if (!this.ctx) return;
		const t = at ?? this.ctx.currentTime;
		const s = this.ctx.createBufferSource(),
			f = this.ctx.createBiquadFilter(),
			g = this.ctx.createGain();
		s.buffer = this.noise;
		f.type = "lowpass";
		f.frequency.setValueAtTime(cutoff, t);
		f.frequency.exponentialRampToValueAtTime(80, t + duration);
		g.gain.setValueAtTime(volume, t);
		g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
		s.connect(f);
		f.connect(g);
		g.connect(dest || this.effects);
		s.start(t);
		s.stop(t + duration);
	}
	effect(name) {
		if (!this.ctx || this.muted) return;
		this.soundsPlayed++;
		const t = this.ctx.currentTime;
		if (name === "shot") {
			this.tone(940, 0.085, "sawtooth", 0.07, t, null, 230);
			this.tone(1360, 0.045, "sine", 0.06, t);
		}
		if (name === "bomb") {
			this.tone(260, 0.12, "square", 0.08, t, null, 130);
			this.tone(520, 0.09, "square", 0.04, t + 0.12);
		}
		if (name === "tick") this.tone(900, 0.045, "square", 0.045, t);
		if (name === "blast") {
			this.hiss(0.75, 0.46, 2800);
			this.tone(105, 0.65, "sine", 0.4, t, null, 24);
			this.tone(48, 0.45, "triangle", 0.22, t);
		}
		if (name === "hurt") {
			this.tone(200, 0.3, "sawtooth", 0.13, t, null, 60);
			this.hiss(0.18, 0.13, 700);
		}
		if (name === "kill") {
			this.tone(520, 0.1, "square", 0.07, t, null, 120);
			this.hiss(0.15, 0.1, 1500);
		}
		if (name === "refill") {
			[0, 4, 7, 12].forEach((n, i) =>
				this.tone(330 * 2 ** (n / 12), 0.22, "triangle", 0.1, t + i * 0.07),
			);
		}
		if (name === "rescue") {
			[0, 7, 12].forEach((n, i) =>
				this.tone(440 * 2 ** (n / 12), 0.28, "sine", 0.12, t + i * 0.11),
			);
			this.voice(1, t + 0.1);
		}
		if (name === "deliver") {
			[0, 4, 7, 12, 16].forEach((n, i) =>
				this.tone(330 * 2 ** (n / 12), 0.4, "triangle", 0.13, t + i * 0.1),
			);
			this.voice(2, t + 0.3);
		}
		if (name === "win") {
			[0, 4, 7, 12, 7, 12, 16, 19, 24].forEach((n, i) =>
				this.tone(262 * 2 ** (n / 12), 0.7, "triangle", 0.16, t + i * 0.13),
			);
			this.voice(3, t + 0.7);
		}
		if (name === "click") this.tone(580, 0.055, "sine", 0.075, t, null, 760);
		if (name === "low") this.tone(180, 0.16, "triangle", 0.1, t);
		if (name === "splash") {
			this.hiss(0.45, 0.19, 2200);
			this.tone(260, 0.15, "sine", 0.07, t, null, 80);
		}
	}
	voice(seed = 0, at = null) {
		if (!this.ctx || this.muted) return;
		this.voicesPlayed++;
		const t = at ?? this.ctx.currentTime;
		const syllables = [1, 1.35, 0.88, 1.5, 1.1, 0.77];
		for (let i = 0; i < 6; i++) {
			const start = t + i * 0.085;
			const f = this.ctx.createBiquadFilter();
			f.type = "bandpass";
			f.frequency.value = 850 + ((seed + i * 3) % 5) * 300;
			f.Q.value = 2;
			f.connect(this.effects);
			this.tone(
				(180 + seed * 29) * syllables[(i + seed) % 6],
				0.075,
				"sawtooth",
				0.18,
				start,
				f,
			);
		}
	}
	musicStep(t, b) {
		const root = [130.81, 110, 87.31][this.sector % 3];
		const progression = [0, 0, -5, -2][Math.floor(b / 16) % 4];
		const r = root * 2 ** (progression / 12);
		const notes = [0, 7, 12, 15, 7, 10, 12, 7, 0, 7, 15, 19, 12, 10, 7, 3];
		if (b % 2 === 0) {
			this.tone(r / 2, 0.4, "triangle", 0.31, t, this.music);
			this.tone(70, 0.1, "sine", 0.36, t, this.music, 35);
		}
		if (b % 4 === 2) this.hiss(0.14, 0.12, 1300, t, this.music);
		this.hiss(0.035, 0.045, 4000, t, this.music);
		this.tone(r * 2 ** (notes[b % 16] / 12), 0.32, "sine", 0.22, t, this.music);
		if (b % 8 === 0) {
			[0, 3, 7].forEach((n) =>
				this.tone(r * 2 ** (n / 12), 1.5, "triangle", 0.055, t, this.music),
			);
		}
		this.musicNotes++;
	}
	update() {
		if (!this.ctx || !this.enabled || this.muted) return;
		const now = this.ctx.currentTime;
		if (this.nextBeat < now - 0.4) this.nextBeat = now + 0.03;
		while (this.nextBeat < now + 0.12) {
			this.musicStep(this.nextBeat, this.beat++);
			this.nextBeat += 60 / 108 / 2;
		}
	}
	stop() {
		this.muted = true;
		this.setLevels();
	}
	async probe() {
		const a = new SynthAudio();
		const c = new OfflineAudioContext(1, 48000 * 2, 48000);
		a.setup(c);
		a.enabled = true;
		for (let i = 0; i < 6; i++) a.musicStep(0.05 + i * 0.277, i);
		a.effect("shot");
		a.voice(2, 0.4);
		a.effect("blast");
		const buffer = await c.startRendering();
		let energy = 0,
			peak = 0;
		const data = buffer.getChannelData(0);
		for (const n of data) {
			energy += n * n;
			peak = Math.max(peak, Math.abs(n));
		}
		return {
			rms: Math.sqrt(energy / data.length),
			peak,
			musicDefault: a.musicVolume,
			voiceSyllables: 6,
			sampleRate: buffer.sampleRate,
		};
	}
}
const audio = new SynthAudio();
