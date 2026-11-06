export class Sound {
	constructor(settings) {
		this.settings = settings;
		this.ctx = null;
		this.events = 0;
		this.notes = 0;
		this.voiceCount = 0;
		this.muted = false;
		this.nextBeat = 0;
		this.beat = 0;
		this.mode = "title";
	}
	async start() {
		if (!this.ctx) {
			this.ctx = new AudioContext();
			this.master = this.ctx.createGain();
			this.master.gain.value = 0.7;
			this.analyser = this.ctx.createAnalyser();
			this.analyser.fftSize = 256;
			this.master.connect(this.analyser);
			this.analyser.connect(this.ctx.destination);
			this.music = this.ctx.createGain();
			this.sfx = this.ctx.createGain();
			this.music.connect(this.master);
			this.sfx.connect(this.master);
			this.noise = this.ctx.createBuffer(
				1,
				this.ctx.sampleRate,
				this.ctx.sampleRate,
			);
			const d = this.noise.getChannelData(0);
			for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
			this.nextBeat = this.ctx.currentTime;
		}
		await this.ctx.resume();
		this.volumes();
	}
	volumes() {
		if (!this.ctx) return;
		this.music.gain.setTargetAtTime(
			this.settings.music,
			0.0 + this.ctx.currentTime,
			0.02,
		);
		this.sfx.gain.setTargetAtTime(
			this.settings.sfx,
			this.ctx.currentTime,
			0.02,
		);
		this.master.gain.setTargetAtTime(
			this.muted ? 0 : 0.7,
			this.ctx.currentTime,
			0.03,
		);
	}
	tone(
		freq,
		duration = 0.12,
		type = "triangle",
		gain = 0.2,
		slide = 0,
		bus = "sfx",
		at = null,
	) {
		if (!this.ctx || this.muted) return;
		const t = at ?? this.ctx.currentTime,
			o = this.ctx.createOscillator(),
			g = this.ctx.createGain();
		o.type = type;
		o.frequency.setValueAtTime(freq, t);
		if (slide)
			o.frequency.exponentialRampToValueAtTime(
				Math.max(20, slide),
				t + duration,
			);
		g.gain.setValueAtTime(0.001, t);
		g.gain.exponentialRampToValueAtTime(Math.max(0.002, gain), t + 0.008);
		g.gain.exponentialRampToValueAtTime(0.001, t + duration);
		o.connect(g);
		g.connect(this[bus]);
		o.start(t);
		o.stop(t + duration + 0.03);
		this.events++;
	}
	hiss(duration = 0.2, gain = 0.2, cutoff = 1800, at = null) {
		if (!this.ctx || this.muted) return;
		const t = at ?? this.ctx.currentTime,
			s = this.ctx.createBufferSource(),
			f = this.ctx.createBiquadFilter(),
			g = this.ctx.createGain();
		s.buffer = this.noise;
		f.type = "lowpass";
		f.frequency.setValueAtTime(cutoff, t);
		f.frequency.exponentialRampToValueAtTime(80, t + duration);
		g.gain.setValueAtTime(gain, t);
		g.gain.exponentialRampToValueAtTime(0.001, t + duration);
		s.connect(f);
		f.connect(g);
		g.connect(this.sfx);
		s.start(t);
		s.stop(t + duration);
		this.events++;
	}
	play(name) {
		if (!this.ctx || this.muted) return;
		switch (name) {
			case "fire":
				this.tone(1100, 0.09, "sawtooth", 0.055, 220);
				break;
			case "enemy":
				this.tone(390, 0.16, "square", 0.035, 170);
				break;
			case "hit":
				this.hiss(0.15, 0.15);
				this.tone(160, 0.15, "sawtooth", 0.08, 70);
				break;
			case "explode":
				this.hiss(0.45, 0.24, 1600);
				this.tone(90, 0.4, "triangle", 0.2, 24);
				break;
			case "pickup":
				[660, 830, 990].forEach((n, i) => {
					this.tone(
						n,
						0.2,
						"sine",
						0.13,
						0,
						"sfx",
						this.ctx.currentTime + i * 0.07,
					);
				});
				break;
			case "warp":
				this.tone(90, 1.7, "sawtooth", 0.11, 1800);
				this.hiss(1.3, 0.09, 3800);
				break;
			case "pulse":
				this.tone(90, 0.7, "sine", 0.3, 750);
				this.hiss(0.6, 0.12, 8000);
				break;
			case "roll":
				this.tone(230, 0.25, "triangle", 0.09, 660);
				break;
			case "ui":
				this.tone(740, 0.05, "sine", 0.07);
				break;
			case "win":
				[330, 440, 550, 660, 880].forEach((n, i) => {
					this.tone(
						n,
						0.5,
						"triangle",
						0.12,
						0,
						"sfx",
						this.ctx.currentTime + i * 0.13,
					);
				});
				break;
			case "low":
				this.tone(220, 0.18, "square", 0.04, 180);
				break;
		}
	}
	voice(mood = 0) {
		if (!this.ctx || this.muted) return;
		this.voiceCount++;
		const now = this.ctx.currentTime;
		for (let i = 0; i < 6; i++) {
			const freq = [230, 390, 290, 460, 260, 340][(i + mood) % 6];
			this.tone(
				freq,
				0.08 + (i % 2) * 0.025,
				"triangle",
				0.08,
				freq * (i % 2 ? 1.2 : 0.8),
				"sfx",
				now + i * 0.09,
			);
			this.tone(freq * 2.4, 0.055, "sine", 0.018, 0, "sfx", now + i * 0.09);
		}
	}
	update() {
		if (this.ctx?.state !== "running" || this.muted) return;
		const now = this.ctx.currentTime;
		const interval = this.mode === "boss" ? 0.19 : 0.25;
		if (this.nextBeat < now - 0.5) this.nextBeat = now;
		let n = 0;
		while (this.nextBeat < now + 0.12 && n++ < 4) {
			const b = this.beat++,
				t = this.nextBeat;
			const roots = [110, 87.31, 130.81, 98],
				root = roots[Math.floor(b / 16) % 4];
			const melody = [0, 7, 12, 14, 7, 3, 10, 7, 0, 3, 7, 15, 14, 10, 7, 3];
			this.tone(root, 0.3, "triangle", 0.32, 0, "music", t);
			if (b % 2 === 0)
				this.tone(
					root * 2 * 2 ** (melody[b % 16] / 12),
					0.22,
					"sine",
					0.2,
					0,
					"music",
					t,
				);
			if (b % 4 === 0) {
				this.tone(160, 0.11, "sine", 0.25, 35, "music", t);
			}
			if (b % 4 === 2) this.tone(480, 0.045, "square", 0.04, 120, "music", t);
			this.nextBeat += interval;
			this.notes++;
		}
	}
	level() {
		if (!this.analyser) return 0;
		const d = new Uint8Array(this.analyser.fftSize);
		this.analyser.getByteTimeDomainData(d);
		return Math.sqrt(
			d.reduce((a, v) => a + ((v - 128) / 128) ** 2, 0) / d.length,
		);
	}
	stop() {
		this.muted = true;
		this.volumes();
	}
}
