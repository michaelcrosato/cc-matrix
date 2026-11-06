export class Synth {
	constructor(settings) {
		this.settings = settings;
		this.ctx = null;
		this.voices = 0;
		this.notes = 0;
		this.step = 0;
		this.next = 0;
		this.muted = false;
		this.stage = "title";
	}
	async unlock() {
		if (!this.ctx) {
			this.ctx = new (window.AudioContext || window.webkitAudioContext)();
			this.master = this.ctx.createGain();
			this.master.gain.value = 0.7;
			this.analyser = this.ctx.createAnalyser();
			this.analyser.fftSize = 256;
			this.master.connect(this.analyser);
			this.analyser.connect(this.ctx.destination);
			this.music = this.ctx.createGain();
			this.effects = this.ctx.createGain();
			this.music.connect(this.master);
			this.effects.connect(this.master);
			this.update();
			this.next = this.ctx.currentTime;
		}
		await this.ctx.resume();
	}
	update() {
		if (!this.ctx) return;
		this.music.gain.setTargetAtTime(
			this.settings.music / 100,
			this.ctx.currentTime,
			0.04,
		);
		this.effects.gain.setTargetAtTime(
			this.settings.sfx / 100,
			this.ctx.currentTime,
			0.04,
		);
		this.master.gain.setTargetAtTime(
			this.muted ? 0 : 0.65,
			this.ctx.currentTime,
			0.04,
		);
	}
	tone(
		freq,
		duration = 0.15,
		type = "triangle",
		volume = 0.2,
		delay = 0,
		end = null,
		bus = "effects",
	) {
		if (!this.ctx || this.muted || this.ctx.state !== "running") return;
		const c = this.ctx,
			t = c.currentTime + delay,
			o = c.createOscillator(),
			g = c.createGain();
		o.type = type;
		o.frequency.setValueAtTime(freq, t);
		if (end)
			o.frequency.exponentialRampToValueAtTime(Math.max(20, end), t + duration);
		g.gain.setValueAtTime(0, t);
		g.gain.linearRampToValueAtTime(volume, t + 0.006);
		g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
		o.connect(g);
		g.connect(this[bus]);
		o.start(t);
		o.stop(t + duration + 0.02);
		o.onended = () => {
			o.disconnect();
			g.disconnect();
		};
		this.notes++;
	}
	noise(duration = 0.25, volume = 0.15, frequency = 900) {
		if (!this.ctx || this.muted || this.ctx.state !== "running") return;
		const c = this.ctx,
			b = c.createBuffer(1, Math.ceil(c.sampleRate * duration), c.sampleRate),
			a = b.getChannelData(0);
		let seed = 7919;
		for (let i = 0; i < a.length; i++) {
			seed = (seed * 16807) % 2147483647;
			a[i] = (seed / 1073741824 - 1) * (1 - i / a.length) ** 2;
		}
		const s = c.createBufferSource(),
			g = c.createGain(),
			f = c.createBiquadFilter();
		f.type = "lowpass";
		f.frequency.value = frequency;
		s.buffer = b;
		g.gain.value = volume;
		s.connect(f);
		f.connect(g);
		g.connect(this.effects);
		s.start();
		s.onended = () => {
			s.disconnect();
			f.disconnect();
			g.disconnect();
		};
	}
	voice(mood = 0) {
		if (!this.ctx) return;
		this.voices++;
		const pattern = mood ? [520, 730, 640, 930, 800] : [360, 530, 420, 680];
		pattern.forEach((p, i) => {
			this.tone(p, 0.07, "sawtooth", 0.045, i * 0.085, p * 0.8);
			this.tone(p * 2.15, 0.06, "sine", 0.035, i * 0.085);
		});
	}
	event(e) {
		switch (e.type) {
			case "shot":
				this.tone(930, 0.075, "square", 0.055, 0, 180);
				break;
			case "burst":
				this.noise(0.18, 0.13, 1600);
				this.tone(150, 0.13, "triangle", 0.16, 0, 40);
				break;
			case "spark":
				this.tone(470, 0.055, "sawtooth", 0.07);
				break;
			case "pulse":
				this.tone(75, 0.65, "sine", 0.4, 0, 650);
				this.noise(0.3, 0.1, 2500);
				break;
			case "hit":
				this.noise(0.35, 0.22, 700);
				this.tone(160, 0.4, "sawtooth", 0.15, 0, 30);
				break;
			case "captured":
				[440, 554, 659, 880].forEach((f, i) =>
					this.tone(f, 0.19, "sine", 0.13, i * 0.065),
				);
				this.voice(1);
				break;
			case "delivered":
			case "world-clear":
				[330, 440, 554, 659, 880].forEach((f, i) =>
					this.tone(f, 0.35, "triangle", 0.15, i * 0.09),
				);
				break;
			case "warning":
				this.tone(330, 0.12, "square", 0.07);
				this.tone(330, 0.12, "square", 0.07, 0.25);
				break;
			case "laser":
				this.tone(1700, 0.3, "sawtooth", 0.05, 0, 80);
				break;
			case "dash":
				this.noise(0.2, 0.09, 2500);
				break;
			case "phase":
				this.stage = e.phase;
				this.voice();
				break;
			case "victory":
				[440, 554, 659, 880, 1108].forEach((f, i) =>
					this.tone(f, 0.9, "triangle", 0.2, i * 0.14),
				);
				this.voice(1);
				break;
			case "defeat":
				[330, 294, 220, 110].forEach((f, i) =>
					this.tone(f, 0.6, "triangle", 0.18, i * 0.25),
				);
				break;
			case "ui":
				this.tone(660, 0.055, "sine", 0.09);
				break;
		}
	}
	tick() {
		if (!this.ctx || this.muted || this.ctx.state !== "running") return;
		const c = this.ctx;
		let guard = 0;
		while (this.next < c.currentTime + 0.15 && guard++ < 5) {
			if (this.next < c.currentTime - 0.3) this.next = c.currentTime;
			const delay = this.next - c.currentTime,
				scale = [0, 3, 7, 10, 12, 15, 19, 22],
				pattern = [0, 2, 4, 2, 1, 3, 6, 3, 0, 2, 5, 4, 1, 3, 7, 6],
				root = this.stage === "finale" ? 146.83 : 130.81;
			const note = root * Math.pow(2, scale[pattern[this.step % 16]] / 12);
			this.tone(
				note,
				0.32,
				"triangle",
				0.17,
				Math.max(0, delay),
				null,
				"music",
			);
			if (this.step % 4 === 0) {
				this.tone(
					root / 2,
					0.8,
					"sine",
					0.24,
					Math.max(0, delay),
					null,
					"music",
				);
				this.tone(
					note * 2,
					1.2,
					"sine",
					0.07,
					Math.max(0, delay + 0.05),
					null,
					"music",
				);
			}
			if (this.step % 2 === 0)
				this.tone(65, 0.12, "sine", 0.13, Math.max(0, delay), 32, "music");
			this.step++;
			this.next += this.stage === "finale" ? 0.19 : 0.25;
		}
	}
	levels() {
		if (!this.analyser)
			return {
				rms: 0,
				notes: this.notes,
				voices: this.voices,
				state: "locked",
			};
		const a = new Float32Array(this.analyser.fftSize);
		this.analyser.getFloatTimeDomainData(a);
		return {
			rms: Math.sqrt(a.reduce((s, v) => s + v * v, 0) / a.length),
			notes: this.notes,
			voices: this.voices,
			state: this.ctx.state,
			music: this.settings.music,
		};
	}
}
