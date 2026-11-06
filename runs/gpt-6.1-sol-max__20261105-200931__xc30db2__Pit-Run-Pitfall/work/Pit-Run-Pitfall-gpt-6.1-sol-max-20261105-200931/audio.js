class JungleAudio {
	constructor() {
		this.ctx = null;
		this.music = 0.1;
		this.effects = 0.75;
		this.muted = false;
		this.next = 0;
		this.beat = 0;
		this.metrics = { notes: 0, effects: 0, syllables: 0 };
	}
	unlock() {
		if (!this.ctx) {
			const Ctx = window.AudioContext || window.webkitAudioContext;
			if (!Ctx) return;
			this.ctx = new Ctx();
			this.master = this.ctx.createGain();
			this.master.gain.value = 0.7;
			this.musicBus = this.ctx.createGain();
			this.musicBus.gain.value = this.music;
			this.fxBus = this.ctx.createGain();
			this.fxBus.gain.value = this.effects;
			this.analyser = this.ctx.createAnalyser();
			this.analyser.fftSize = 256;
			this.musicBus.connect(this.master);
			this.fxBus.connect(this.master);
			this.master.connect(this.analyser);
			this.analyser.connect(this.ctx.destination);
			this.next = this.ctx.currentTime + 0.08;
		}
		if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
	}
	levels() {
		if (!this.ctx) return;
		this.musicBus.gain.setTargetAtTime(this.music, this.ctx.currentTime, 0.03);
		this.fxBus.gain.setTargetAtTime(this.effects, this.ctx.currentTime, 0.03);
		this.master.gain.setTargetAtTime(
			this.muted ? 0 : 0.7,
			this.ctx.currentTime,
			0.03,
		);
	}
	tone(
		freq,
		time,
		length,
		type = "sine",
		gain = 0.2,
		bus = this.fxBus,
		endFreq = 0,
	) {
		if (!this.ctx || !bus) return;
		const o = this.ctx.createOscillator(),
			g = this.ctx.createGain();
		o.type = type;
		o.frequency.setValueAtTime(freq, time);
		if (endFreq)
			o.frequency.exponentialRampToValueAtTime(
				Math.max(25, endFreq),
				time + length,
			);
		g.gain.setValueAtTime(0.0001, time);
		g.gain.exponentialRampToValueAtTime(Math.max(0.001, gain), time + 0.008);
		g.gain.exponentialRampToValueAtTime(0.0001, time + length);
		o.connect(g);
		g.connect(bus);
		o.start(time);
		o.stop(time + length + 0.02);
	}
	noise(time, length, gain = 0.12, high = 1200) {
		if (!this.ctx) return;
		const b = this.ctx.createBuffer(
				1,
				Math.ceil(this.ctx.sampleRate * length),
				this.ctx.sampleRate,
			),
			d = b.getChannelData(0);
		let n = 0;
		for (let i = 0; i < d.length; i++) {
			n = (n + Math.random() * 0.8 - 0.4) * 0.75;
			d[i] = n;
		}
		const s = this.ctx.createBufferSource(),
			f = this.ctx.createBiquadFilter(),
			g = this.ctx.createGain();
		s.buffer = b;
		f.type = "highpass";
		f.frequency.value = high;
		g.gain.setValueAtTime(gain, time);
		g.gain.exponentialRampToValueAtTime(0.0001, time + length);
		s.connect(f);
		f.connect(g);
		g.connect(this.fxBus);
		s.start(time);
	}
	sfx(name) {
		if (!this.ctx || this.muted) return;
		this.metrics.effects++;
		const t = this.ctx.currentTime;
		if (name === "jump") {
			this.tone(180, t, 0.16, "triangle", 0.24, this.fxBus, 500);
			this.noise(t, 0.09, 0.05);
		}
		if (name === "land") {
			this.tone(90, t, 0.08, "sine", 0.27);
			this.noise(t, 0.08, 0.09, 700);
		}
		if (name === "grab") {
			this.tone(380, t, 0.1, "triangle", 0.25, undefined, 600);
			this.tone(690, t + 0.07, 0.12, "sine", 0.18);
		}
		if (name === "treasure") {
			[0, 4, 7, 12, 16].forEach((v, i) =>
				this.tone(440 * 2 ** (v / 12), t + i * 0.075, 0.4, "triangle", 0.2),
			);
			this.speak(1);
		}
		if (name === "hurt") {
			this.tone(170, t, 0.27, "sawtooth", 0.17, undefined, 45);
			this.noise(t, 0.25, 0.23, 400);
			this.speak(-1);
		}
		if (name === "step") this.noise(t, 0.035, 0.04, 600);
		if (name === "checkpoint") {
			[0, 7, 12].forEach((v, i) =>
				this.tone(330 * 2 ** (v / 12), t + i * 0.12, 0.5, "sine", 0.19),
			);
		}
		if (name === "menu") this.tone(520, t, 0.06, "triangle", 0.12);
		if (name === "win") {
			[0, 4, 7, 12, 7, 12, 16, 19].forEach((v, i) =>
				this.tone(330 * 2 ** (v / 12), t + i * 0.14, 0.6, "triangle", 0.24),
			);
			this.speak(2);
		}
	}
	speak(mood = 0) {
		if (!this.ctx || this.muted) return;
		const t = this.ctx.currentTime,
			seq = mood < 0 ? [260, 190, 230] : [370, 530, 460, 650, 480];
		seq.forEach((f, i) => {
			const time = t + i * 0.085,
				o = this.ctx.createOscillator(),
				form = this.ctx.createBiquadFilter(),
				g = this.ctx.createGain();
			o.type = "sawtooth";
			o.frequency.setValueAtTime(f * (mood === 2 ? 1.2 : 1), time);
			o.frequency.exponentialRampToValueAtTime(f * 0.8, time + 0.065);
			form.type = "bandpass";
			form.frequency.value = [850, 1400, 2100, 1100, 1700][i % 5];
			form.Q.value = 3;
			g.gain.setValueAtTime(0.0001, time);
			g.gain.linearRampToValueAtTime(0.11, time + 0.012);
			g.gain.exponentialRampToValueAtTime(0.0001, time + 0.08);
			o.connect(form);
			form.connect(g);
			g.connect(this.fxBus);
			o.start(time);
			o.stop(time + 0.09);
			this.metrics.syllables++;
		});
	}
	tick(cave = false, active = true) {
		if (!this.ctx || this.ctx.state !== "running" || this.muted || !active)
			return;
		const now = this.ctx.currentTime;
		if (this.next < now - 0.4) this.next = now + 0.03;
		const melody = [
			0, 7, 12, 14, 12, 7, 4, 7, 0, 7, 12, 16, 14, 12, 7, 4, 2, 9, 14, 16, 14,
			9, 5, 9, 7, 4, 2, -1, 0, 4, 7, 12,
		];
		while (this.next < now + 0.18) {
			const i = this.beat % 32,
				t = this.next;
			if (this.beat % 2 === 0) {
				const note = melody[((this.beat / 2) | 0) % 32];
				this.tone(
					220 * 2 ** (note / 12) * (cave ? 0.5 : 1),
					t,
					0.28,
					"sine",
					0.5,
					this.musicBus,
				);
				this.tone(
					440 * 2 ** (note / 12) * (cave ? 0.5 : 1),
					t,
					0.12,
					"triangle",
					0.12,
					this.musicBus,
				);
				this.metrics.notes++;
			}
			if (i % 8 === 0)
				this.tone(
					[110, 110, 123.47, 82.41][i / 8],
					t,
					0.6,
					"triangle",
					0.45,
					this.musicBus,
				);
			if (i % 4 === 0) this.tone(75, t, 0.11, "sine", 0.5, this.musicBus, 35);
			if (i % 4 === 2)
				this.tone(950, t, 0.03, "square", 0.025, this.musicBus, 500);
			if (i === 13 || i === 29)
				this.tone(1650, t, 0.18, "sine", 0.055, this.musicBus, 2300);
			this.next += 0.137;
			this.beat++;
		}
	}
	rms() {
		if (!this.analyser) return 0;
		const d = new Uint8Array(256);
		this.analyser.getByteTimeDomainData(d);
		return (
			Math.sqrt(d.reduce((s, x) => s + (x - 128) ** 2, 0) / d.length) / 128
		);
	}
}
