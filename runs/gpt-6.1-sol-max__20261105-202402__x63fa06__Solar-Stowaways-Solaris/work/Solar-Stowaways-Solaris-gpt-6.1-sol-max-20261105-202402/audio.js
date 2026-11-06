export class AudioEngine {
	constructor(settings) {
		this.settings = settings;
		this.ctx = null;
		this.musicClock = 0;
		this.beat = 0;
		this.events = { laser: 0, hit: 0, voice: 0, music: 0 };
		this.muted = false;
		this.noise = null;
		this.seq = 0;
	}
	async start() {
		if (!this.ctx) {
			this.ctx = new (window.AudioContext || window.webkitAudioContext)();
			this.master = this.ctx.createGain();
			this.master.gain.value = this.settings.sfx;
			this.music = this.ctx.createGain();
			this.music.gain.value = this.settings.music;
			this.analyser = this.ctx.createAnalyser();
			this.analyser.fftSize = 1024;
			this.master.connect(this.analyser);
			this.music.connect(this.analyser);
			this.analyser.connect(this.ctx.destination);
			this.noise = this.ctx.createBuffer(
				1,
				this.ctx.sampleRate,
				this.ctx.sampleRate,
			);
			const d = this.noise.getChannelData(0);
			let s = 123456;
			for (let i = 0; i < d.length; i++) {
				s = (s * 1664525 + 1013904223) >>> 0;
				d[i] = (s / 4294967296) * 2 - 1;
			}
		}
		if (this.ctx.state === "suspended") await this.ctx.resume();
		this.musicClock = this.ctx.currentTime + 0.08;
	}
	updateSettings() {
		if (!this.ctx) return;
		this.master.gain.setTargetAtTime(
			this.muted ? 0 : this.settings.sfx,
			this.ctx.currentTime,
			0.04,
		);
		this.music.gain.setTargetAtTime(
			this.muted ? 0 : this.settings.music,
			this.ctx.currentTime,
			0.04,
		);
	}
	setMuted(b) {
		this.muted = b;
		this.updateSettings();
	}
	tone(
		freq,
		duration = 0.1,
		type = "sine",
		volume = 0.12,
		slide = 1,
		when = 0,
		dest = null,
	) {
		if (!this.ctx || this.muted || this.ctx.state !== "running") return;
		const t = when || this.ctx.currentTime,
			o = this.ctx.createOscillator(),
			g = this.ctx.createGain();
		o.type = type;
		o.frequency.setValueAtTime(Math.max(10, freq), t);
		o.frequency.exponentialRampToValueAtTime(
			Math.max(10, freq * slide),
			t + duration,
		);
		g.gain.setValueAtTime(0.0001, t);
		g.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), t + 0.005);
		g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
		o.connect(g);
		g.connect(dest || this.master);
		o.start(t);
		o.stop(t + duration + 0.02);
	}
	noiseBurst(duration = 0.25, volume = 0.2, freq = 1000) {
		if (!this.ctx || this.muted || this.ctx.state !== "running") return;
		const t = this.ctx.currentTime,
			s = this.ctx.createBufferSource(),
			g = this.ctx.createGain(),
			f = this.ctx.createBiquadFilter();
		s.buffer = this.noise;
		f.type = "lowpass";
		f.frequency.setValueAtTime(freq, t);
		f.frequency.exponentialRampToValueAtTime(70, t + duration);
		g.gain.setValueAtTime(volume, t);
		g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
		s.connect(f);
		f.connect(g);
		g.connect(this.master);
		s.start(t);
		s.stop(t + duration);
	}
	laser() {
		this.events.laser++;
		this.tone(980, 0.085, "sawtooth", 0.065, 0.23);
		this.tone(1900, 0.045, "sine", 0.025, 0.6);
	}
	hit() {
		this.events.hit++;
		this.tone(130, 0.13, "triangle", 0.2, 0.3);
		this.noiseBurst(0.11, 0.12, 1800);
	}
	explosion(big = false) {
		this.noiseBurst(big ? 0.9 : 0.35, big ? 0.6 : 0.3, big ? 1800 : 2400);
		this.tone(big ? 65 : 110, big ? 0.8 : 0.3, "sine", 0.35, 0.25);
	}
	pickup() {
		[440, 554.37, 659.25, 880].forEach((f, i) => {
			this.tone(
				f,
				0.22,
				"sine",
				0.16,
				1,
				this.ctx ? this.ctx.currentTime + i * 0.07 : 0,
			);
		});
	}
	pulse() {
		this.tone(65, 0.8, "sawtooth", 0.15, 12);
		this.noiseBurst(0.6, 0.24, 4000);
	}
	warp() {
		this.tone(70, 1.4, "sawtooth", 0.12, 15);
		this.tone(120, 1.7, "sine", 0.16, 8);
	}
	menu() {
		this.tone(560, 0.045, "sine", 0.05, 1.25);
	}
	voice(seed = 1) {
		if (!this.ctx || this.muted || this.ctx.state !== "running") return;
		this.events.voice++;
		const t = this.ctx.currentTime;
		for (let i = 0; i < 9; i++) {
			const p = (seed * 7 + i * 11) % 13,
				f = 125 + p * 16,
				at = t + i * 0.105;
			this.tone(f, 0.075, "triangle", 0.08, 1.22, at);
			this.tone(f * (2 + (i % 3) * 0.7), 0.065, "sine", 0.035, 0.9, at);
		}
	}
	tick(active) {
		if (!this.ctx || this.muted || this.ctx.state !== "running") return;
		const now = this.ctx.currentTime;
		if (this.musicClock < now - 0.3) this.musicClock = now + 0.05;
		while (this.musicClock < now + 0.13) {
			const t = this.musicClock,
				step = this.beat % 32,
				roots = [146.83, 130.81, 174.61, 110],
				root = roots[Math.floor(step / 8)],
				notes = [1, 1.5, 2, 2.5, 1.333, 2, 1.5, 3];
			if (step % 4 === 0)
				this.tone(root / 2, 1.1, "sine", 0.2, 1, t, this.music);
			this.tone(
				root * notes[step % 8],
				0.23,
				"triangle",
				active ? 0.09 : 0.065,
				1,
				t,
				this.music,
			);
			if (step % 8 === 0) {
				this.tone(root, 0.9, "sine", 0.055, 1, t, this.music);
				this.tone(root * 1.5, 1.1, "sine", 0.04, 1, t, this.music);
			}
			if (active && step % 2 === 0)
				this.tone(step % 4 ? 90 : 48, 0.09, "sine", 0.13, 0.4, t, this.music);
			this.musicClock += 0.19;
			this.beat++;
			this.events.music++;
		}
	}
	level() {
		if (!this.ctx) return 0;
		const a = new Uint8Array(this.analyser.fftSize);
		this.analyser.getByteTimeDomainData(a);
		return Math.sqrt(
			a.reduce((s, v) => s + ((v - 128) / 128) ** 2, 0) / a.length,
		);
	}
}
