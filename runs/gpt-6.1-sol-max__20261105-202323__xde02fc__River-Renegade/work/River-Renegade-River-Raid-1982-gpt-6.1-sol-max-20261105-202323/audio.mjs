export class Synth {
	constructor(settings) {
		this.settings = settings;
		this.ctx = null;
		this.step = 0;
		this.next = 0;
		this.events = 0;
		this.peak = 0;
	}
	init() {
		if (this.ctx) {
			this.ctx.resume().catch(() => {});
			return;
		}
		const C = window.AudioContext || window.webkitAudioContext;
		if (!C) return;
		this.ctx = new C();
		const c = this.ctx;
		this.master = c.createGain();
		this.master.gain.value = 0.65;
		this.analyser = c.createAnalyser();
		this.analyser.fftSize = 256;
		this.master.connect(this.analyser);
		this.analyser.connect(c.destination);
		this.music = c.createGain();
		this.fx = c.createGain();
		this.voice = c.createGain();
		[this.music, this.fx, this.voice].forEach((g) => {
			g.connect(this.master);
		});
		this.noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
		const a = this.noise.getChannelData(0);
		let n = 19;
		for (let i = 0; i < a.length; i++) {
			n = (n * 16807) % 2147483647;
			a[i] = (n / 2147483647) * 2 - 1;
		}
		this.engine = c.createOscillator();
		this.engine.type = "sawtooth";
		this.engine.frequency.value = 49;
		this.engineFilter = c.createBiquadFilter();
		this.engineFilter.type = "lowpass";
		this.engineFilter.frequency.value = 180;
		this.engineGain = c.createGain();
		this.engineGain.gain.value = 0;
		this.engine.connect(this.engineFilter);
		this.engineFilter.connect(this.engineGain);
		this.engineGain.connect(this.fx);
		this.engine.start();
		this.next = c.currentTime + 0.08;
		this.apply();
	}
	apply() {
		if (!this.ctx) return;
		const t = this.ctx.currentTime;
		this.music.gain.setTargetAtTime(this.settings.music, t, 0.025);
		this.fx.gain.setTargetAtTime(this.settings.sfx, t, 0.025);
		this.voice.gain.setTargetAtTime(this.settings.voices ? 0.45 : 0, t, 0.025);
		this.master.gain.setTargetAtTime(this.settings.mute ? 0 : 0.65, t, 0.025);
	}
	tone(
		freq,
		time,
		duration = 0.1,
		type = "triangle",
		volume = 0.15,
		channel = this.fx,
		slide = 0,
	) {
		const c = this.ctx;
		if (!c) return;
		const o = c.createOscillator(),
			g = c.createGain();
		o.type = type;
		o.frequency.setValueAtTime(freq, time);
		if (slide)
			o.frequency.exponentialRampToValueAtTime(
				Math.max(20, slide),
				time + duration,
			);
		g.gain.setValueAtTime(0.0001, time);
		g.gain.exponentialRampToValueAtTime(volume, time + 0.006);
		g.gain.exponentialRampToValueAtTime(0.0001, time + duration);
		o.connect(g);
		g.connect(channel);
		o.start(time);
		o.stop(time + duration + 0.02);
		this.events++;
	}
	hiss(time, duration, volume, freq = 900) {
		if (!this.ctx) return;
		const c = this.ctx,
			s = c.createBufferSource(),
			g = c.createGain(),
			f = c.createBiquadFilter();
		s.buffer = this.noise;
		f.type = "lowpass";
		f.frequency.value = freq;
		g.gain.setValueAtTime(volume, time);
		g.gain.exponentialRampToValueAtTime(0.0001, time + duration);
		s.connect(f);
		f.connect(g);
		g.connect(this.fx);
		s.start(time);
		s.stop(time + duration);
		this.events++;
	}
	sfx(kind) {
		if (!this.ctx || this.settings.mute) return;
		const t = this.ctx.currentTime;
		if (kind === "shot")
			this.tone(900, t, 0.065, "square", 0.035, this.fx, 210);
		if (kind === "enemyShot")
			this.tone(180, t, 0.1, "sine", 0.045, this.fx, 90);
		if (kind === "explosion" || kind === "hit") {
			this.hiss(
				t,
				kind === "hit" ? 0.12 : 0.42,
				kind === "hit" ? 0.13 : 0.35,
				700,
			);
			this.tone(100, t, 0.3, "sine", 0.28, this.fx, 25);
		}
		if (kind === "pulse") {
			this.hiss(t, 0.6, 0.25, 1800);
			this.tone(140, t, 0.65, "sawtooth", 0.13, this.fx, 900);
		}
		if (kind === "fuel") this.tone(660, t, 0.12, "sine", 0.085, this.fx, 980);
		if (kind === "pickup") {
			[660, 880, 1320].forEach((f, i) => {
				this.tone(f, t + i * 0.065, 0.18, "triangle", 0.11);
			});
		}
		if (kind === "menu") this.tone(500, t, 0.06, "sine", 0.06, this.fx, 700);
		if (kind === "warn") this.tone(240, t, 0.12, "square", 0.075);
		if (kind === "bridge" || kind === "win") {
			[392, 494, 587, 784].forEach((f, i) => {
				this.tone(f, t + i * 0.13, 0.38, "triangle", 0.12);
			});
			this.hiss(t, 0.7, 0.28, 600);
		}
	}
	gibberish(seed = 3) {
		if (!this.ctx || !this.settings.voices) return;
		const c = this.ctx,
			t = c.currentTime;
		for (let i = 0; i < 7; i++) {
			const at = t + i * 0.072,
				o = c.createOscillator(),
				g = c.createGain(),
				f = c.createBiquadFilter();
			o.type = "sawtooth";
			o.frequency.value = 170 + ((i * 47 + seed * 31) % 190);
			f.type = "bandpass";
			f.frequency.value = [650, 1100, 480, 1500, 800][(i + seed) % 5];
			f.Q.value = 5;
			g.gain.setValueAtTime(0.0001, at);
			g.gain.exponentialRampToValueAtTime(0.22, at + 0.013);
			g.gain.exponentialRampToValueAtTime(0.0001, at + 0.065);
			o.connect(f);
			f.connect(g);
			g.connect(this.voice);
			o.start(at);
			o.stop(at + 0.07);
			this.events++;
		}
	}
	update(active, speed = 17) {
		if (!this.ctx) return;
		const c = this.ctx;
		this.engineGain.gain.setTargetAtTime(
			active ? 0.038 : 0,
			c.currentTime,
			0.12,
		);
		this.engine.frequency.setTargetAtTime(36 + speed * 1.8, c.currentTime, 0.1);
		if (!active) {
			this.next = c.currentTime + 0.1;
			return;
		}
		const beat = 60 / 116 / 4;
		let safety = 0;
		while (this.next < c.currentTime + 0.15 && safety++ < 12) {
			const t = this.next,
				s = this.step++ % 32,
				root = [98, 98, 130.81, 116.54][Math.floor(s / 8)];
			if (s % 4 === 0) this.tone(root, t, 0.18, "triangle", 0.18, this.music);
			if (s % 8 === 4) this.tone(60, t, 0.11, "sine", 0.18, this.music, 30);
			const notes = [0, 7, 12, 7, 10, 7, 3, 7];
			if (s % 2 === 0)
				this.tone(
					root * 2 * 2 ** (notes[(s / 2) % 8] / 12),
					t,
					0.09,
					"triangle",
					s % 4 === 0 ? 0.1 : 0.055,
					this.music,
				);
			if (s % 2 === 1)
				this.tone(4200, t, 0.026, "square", 0.012, this.music, 2100);
			this.next += beat;
		}
	}
	stop() {
		if (this.ctx) {
			this.engineGain.gain.value = 0;
			this.master.gain.value = 0;
		}
	}
	levels() {
		if (!this.ctx) return { ready: false, events: 0, rms: 0 };
		const a = new Float32Array(this.analyser.fftSize);
		this.analyser.getFloatTimeDomainData(a);
		return {
			ready: true,
			events: this.events,
			rms: Math.sqrt(a.reduce((s, x) => s + x * x, 0) / a.length),
			music: this.settings.music,
			state: this.ctx.state,
		};
	}
	async offlineCheck() {
		const c = new OfflineAudioContext(1, 22050, 22050);
		const o = c.createOscillator(),
			g = c.createGain();
		o.type = "triangle";
		o.frequency.setValueAtTime(440, 0);
		o.frequency.exponentialRampToValueAtTime(110, 0.4);
		g.gain.setValueAtTime(0.2, 0);
		g.gain.exponentialRampToValueAtTime(0.0001, 0.5);
		o.connect(g);
		g.connect(c.destination);
		o.start();
		o.stop(0.6);
		const b = await c.startRendering(),
			a = b.getChannelData(0);
		return {
			rms: Math.sqrt(a.reduce((s, x) => s + x * x, 0) / a.length),
			peak: Math.max(...a.map(Math.abs)),
		};
	}
}
