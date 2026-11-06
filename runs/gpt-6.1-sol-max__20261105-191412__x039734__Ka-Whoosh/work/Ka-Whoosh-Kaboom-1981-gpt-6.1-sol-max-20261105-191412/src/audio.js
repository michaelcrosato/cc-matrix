export class Sound {
	constructor() {
		this.ctx = null;
		this.musicVolume = 0.1;
		this.effectsVolume = 0.65;
		this.voiceVolume = 0.55;
		this.muted = false;
		this.next = 0;
		this.step = 0;
		this.enabled = true;
	}
	async unlock() {
		if (!this.ctx) {
			const C = window.AudioContext || window.webkitAudioContext;
			if (!C) return;
			this.ctx = new C();
			this.master = this.ctx.createGain();
			this.master.gain.value = 0.75;
			this.music = this.ctx.createGain();
			this.fx = this.ctx.createGain();
			this.voice = this.ctx.createGain();
			this.analyser = this.ctx.createAnalyser();
			this.analyser.fftSize = 256;
			this.music.connect(this.master);
			this.fx.connect(this.master);
			this.voice.connect(this.master);
			this.master.connect(this.analyser);
			this.analyser.connect(this.ctx.destination);
			const len = this.ctx.sampleRate;
			this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
			const a = this.noise.getChannelData(0);
			let n = 8241;
			for (let i = 0; i < len; i++) {
				n = (Math.imul(n, 1664525) + 1013904223) | 0;
				a[i] = (n / 2147483648) * 0.75;
			}
			this.next = this.ctx.currentTime + 0.06;
		}
		if (this.ctx.state === "suspended") await this.ctx.resume();
		this.volumes();
	}
	volumes() {
		if (!this.ctx) return;
		this.master.gain.setTargetAtTime(
			this.muted || !this.enabled ? 0 : 0.75,
			this.ctx.currentTime,
			0.03,
		);
		this.music.gain.setTargetAtTime(
			this.musicVolume,
			this.ctx.currentTime,
			0.03,
		);
		this.fx.gain.setTargetAtTime(
			this.effectsVolume,
			this.ctx.currentTime,
			0.03,
		);
		this.voice.gain.setTargetAtTime(
			this.voiceVolume,
			this.ctx.currentTime,
			0.03,
		);
	}
	tone(
		freq,
		duration = 0.12,
		volume = 0.18,
		type = "sine",
		when = 0,
		bus = this.fx,
		endFreq = null,
	) {
		if (!this.ctx || !bus) return;
		const t = when || this.ctx.currentTime;
		const o = this.ctx.createOscillator(),
			g = this.ctx.createGain();
		o.type = type;
		o.frequency.setValueAtTime(Math.max(10, freq), t);
		if (endFreq)
			o.frequency.exponentialRampToValueAtTime(
				Math.max(10, endFreq),
				t + duration,
			);
		g.gain.setValueAtTime(0.0001, t);
		g.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), t + 0.006);
		g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
		o.connect(g);
		g.connect(bus);
		o.start(t);
		o.stop(t + duration + 0.02);
	}
	hiss(duration = 0.15, vol = 0.15, cutoff = 1800, when = 0) {
		if (!this.ctx) return;
		const t = when || this.ctx.currentTime,
			s = this.ctx.createBufferSource(),
			f = this.ctx.createBiquadFilter(),
			g = this.ctx.createGain();
		s.buffer = this.noise;
		f.type = "lowpass";
		f.frequency.value = cutoff;
		g.gain.setValueAtTime(vol, t);
		g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
		s.connect(f);
		f.connect(g);
		g.connect(this.fx);
		s.start(t);
		s.stop(t + duration);
	}
	play(kind, pitch = 1) {
		if (!this.ctx || !this.enabled) return;
		const t = this.ctx.currentTime;
		if (kind === "catch") {
			this.tone(590 * pitch, 0.12, 0.18, "sine", t, this.fx, 330);
			this.tone(1100 * pitch, 0.065, 0.06, "triangle", t + 0.018);
			this.hiss(0.09, 0.1, 3300);
		}
		if (kind === "perfect") {
			this.tone(880, 0.14, 0.13, "triangle");
			this.tone(1320, 0.2, 0.09, "sine", t + 0.06);
			this.hiss(0.1, 0.08, 2600);
		}
		if (kind === "gold") {
			[660, 880, 1320, 1760].forEach((f, i) => {
				this.tone(f, 0.18, 0.14, "triangle", t + i * 0.065);
			});
		}
		if (kind === "boom") {
			this.hiss(0.65, 0.5, 800);
			this.tone(95, 0.65, 0.5, "sine", 0, this.fx, 25);
			this.tone(185, 0.22, 0.12, "sawtooth", 0, this.fx, 40);
		}
		if (kind === "douse") {
			this.hiss(0.8, 0.38, 5000);
			[280, 440, 660, 880].forEach((f, i) => {
				this.tone(f, 0.4, 0.13, "sine", t + i * 0.06, this.fx, f * 0.6);
			});
		}
		if (kind === "drop") {
			this.tone(180, 0.07, 0.025, "triangle", 0, this.fx, 130);
		}
		if (kind === "click") {
			this.tone(720, 0.065, 0.07, "triangle");
		}
		if (kind === "start") {
			[330, 440, 660].forEach((f, i) => {
				this.tone(f, 0.2, 0.15, "triangle", t + i * 0.12);
			});
		}
		if (kind === "win") {
			[523, 659, 784, 1047, 784, 1047].forEach((f, i) => {
				this.tone(f, 0.26, 0.18, "triangle", t + i * 0.14);
			});
		}
		if (kind === "empty") {
			this.tone(110, 0.13, 0.1, "square", 0, this.fx, 70);
		}
	}
	babble(happy = true) {
		if (!this.ctx || !this.enabled) return;
		const t = this.ctx.currentTime;
		for (let i = 0; i < 5; i++) {
			const when = t + i * 0.085,
				o = this.ctx.createOscillator(),
				f = this.ctx.createBiquadFilter(),
				g = this.ctx.createGain();
			o.type = "sawtooth";
			o.frequency.value = (happy ? 210 : 145) + [0, 75, -25, 110, 30][i];
			f.type = "bandpass";
			f.frequency.value = [700, 1250, 500, 1700, 850][i];
			f.Q.value = 5;
			g.gain.setValueAtTime(0.0001, when);
			g.gain.exponentialRampToValueAtTime(0.18, when + 0.012);
			g.gain.exponentialRampToValueAtTime(0.0001, when + 0.08);
			o.connect(f);
			f.connect(g);
			g.connect(this.voice);
			o.start(when);
			o.stop(when + 0.09);
		}
	}
	update() {
		if (this.ctx?.state !== "running" || !this.enabled) return;
		const t = this.ctx.currentTime;
		if (this.next < t - 0.25) this.next = t + 0.02;
		const notes = [0, 4, 7, 12, 7, 4, 2, 7, 0, 4, 9, 12, 11, 7, 4, 2],
			bass = [36, 36, 41, 43];
		while (this.next < t + 0.12) {
			const k = this.step % 32,
				block = Math.floor(this.step / 8) % 4,
				root = [60, 60, 65, 67][block];
			if (k % 2 === 0)
				this.tone(
					440 * 2 ** ((root + notes[((this.step / 2) | 0) % 16] - 69) / 12),
					0.17,
					0.18,
					"triangle",
					this.next,
					this.music,
				);
			if (k % 4 === 0)
				this.tone(
					440 * 2 ** ((bass[block] - 69) / 12),
					0.22,
					0.24,
					"sine",
					this.next,
					this.music,
				);
			if (k % 4 === 2)
				this.tone(130, 0.065, 0.07, "triangle", this.next, this.music, 70);
			this.step++;
			this.next += 60 / 116 / 4;
		}
	}
	stop() {
		this.enabled = false;
		this.volumes();
	}
	resume() {
		this.enabled = true;
		this.volumes();
	}
	level() {
		if (!this.analyser) return 0;
		const a = new Float32Array(256);
		this.analyser.getFloatTimeDomainData(a);
		return Math.sqrt(a.reduce((s, v) => s + v * v, 0) / a.length);
	}
	static async offlineCheck() {
		const c = new OfflineAudioContext(1, 22050, 22050),
			o = c.createOscillator(),
			g = c.createGain();
		o.frequency.setValueAtTime(660, 0);
		o.frequency.exponentialRampToValueAtTime(220, 0.2);
		g.gain.setValueAtTime(0.3, 0);
		g.gain.exponentialRampToValueAtTime(0.0001, 0.3);
		o.connect(g);
		g.connect(c.destination);
		o.start();
		o.stop(0.3);
		const b = await c.startRendering(),
			a = b.getChannelData(0);
		return Math.sqrt(a.reduce((s, v) => s + v * v, 0) / a.length);
	}
}
