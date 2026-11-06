export class Synth {
	constructor(settings = {}) {
		this.settings = { music: 0.1, sfx: 0.7, voices: 0.45, ...settings };
		this.ctx = null;
		this.steps = 0;
		this.next = 0;
		this.calls = { music: 0, shot: 0, voice: 0, effects: 0 };
		this.muted = false;
	}
	async unlock() {
		if (!this.ctx) {
			const A = window.AudioContext || window.webkitAudioContext;
			if (!A) return;
			this.ctx = new A();
			this.master = this.ctx.createGain();
			this.master.gain.value = 0.68;
			this.master.connect(this.ctx.destination);
			this.music = this.ctx.createGain();
			this.sfx = this.ctx.createGain();
			this.voice = this.ctx.createGain();
			this.music.connect(this.master);
			this.sfx.connect(this.master);
			this.voice.connect(this.master);
			this.analyser = this.ctx.createAnalyser();
			this.analyser.fftSize = 512;
			this.master.connect(this.analyser);
			this.apply();
			this.next = this.ctx.currentTime + 0.05;
		}
		if (this.ctx.state === "suspended") await this.ctx.resume();
	}
	apply() {
		if (!this.ctx) return;
		const t = this.ctx.currentTime;
		this.music.gain.setTargetAtTime(this.settings.music, t, 0.05);
		this.sfx.gain.setTargetAtTime(this.settings.sfx, t, 0.03);
		this.voice.gain.setTargetAtTime(this.settings.voices, t, 0.03);
	}
	tone(
		freq,
		end,
		duration = 0.12,
		volume = 0.1,
		type = "triangle",
		bus = this.sfx,
		when = null,
	) {
		if (!this.ctx || this.muted) return;
		const t = when ?? this.ctx.currentTime;
		const o = this.ctx.createOscillator(),
			gain = this.ctx.createGain();
		o.type = type;
		o.frequency.setValueAtTime(freq, t);
		o.frequency.exponentialRampToValueAtTime(Math.max(20, end), t + duration);
		gain.gain.setValueAtTime(0.0001, t);
		gain.gain.linearRampToValueAtTime(volume, t + 0.006);
		gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
		o.connect(gain);
		gain.connect(bus);
		o.start(t);
		o.stop(t + duration + 0.02);
	}
	noise(duration = 0.2, volume = 0.15, cutoff = 1800, when = null) {
		if (!this.ctx || this.muted) return;
		const t = when ?? this.ctx.currentTime,
			buffer = this.ctx.createBuffer(
				1,
				Math.ceil(this.ctx.sampleRate * duration),
				this.ctx.sampleRate,
			);
		const data = buffer.getChannelData(0);
		for (let i = 0; i < data.length; i++)
			data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
		const src = this.ctx.createBufferSource(),
			f = this.ctx.createBiquadFilter(),
			g = this.ctx.createGain();
		src.buffer = buffer;
		f.type = "lowpass";
		f.frequency.value = cutoff;
		g.gain.setValueAtTime(volume, t);
		g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
		src.connect(f);
		f.connect(g);
		g.connect(this.sfx);
		src.start(t);
		src.stop(t + duration);
	}
	speak(seed = 1) {
		if (!this.ctx || this.muted) return;
		this.calls.voice++;
		const now = this.ctx.currentTime;
		for (let i = 0; i < 5; i++) {
			const t = now + i * 0.11,
				d = 0.075 + (i % 2) * 0.025,
				f = 150 + ((seed * 31 + i * 77) % 160),
				o = this.ctx.createOscillator(),
				g = this.ctx.createGain();
			o.type = "sawtooth";
			o.frequency.setValueAtTime(f, t);
			o.frequency.exponentialRampToValueAtTime(f * (i % 2 ? 0.77 : 1.3), t + d);
			g.gain.setValueAtTime(0.0001, t);
			g.gain.linearRampToValueAtTime(0.065, t + 0.012);
			g.gain.exponentialRampToValueAtTime(0.0001, t + d);
			const vowel = [650, 1100, 400, 850, 1400][(i + seed) % 5],
				f1 = this.ctx.createBiquadFilter(),
				f2 = this.ctx.createBiquadFilter();
			f1.type = f2.type = "bandpass";
			f1.frequency.value = vowel;
			f2.frequency.value = vowel * 2.7;
			f1.Q.value = 5;
			f2.Q.value = 3;
			o.connect(f1);
			o.connect(f2);
			f1.connect(g);
			f2.connect(g);
			g.connect(this.voice);
			o.start(t);
			o.stop(t + d + 0.01);
		}
	}
	tick(intensity = 0) {
		if (!this.ctx || this.muted || this.ctx.state !== "running") return;
		if (this.next < this.ctx.currentTime - 0.4)
			this.next = this.ctx.currentTime;
		const beat = 60 / (112 + intensity * 8) / 2;
		const melody = [
			0, 7, 12, 10, 7, 3, 5, 7, 0, 7, 15, 12, 10, 7, 5, 3, 0, 3, 7, 12, 15, 12,
			10, 7, 5, 7, 10, 7, 3, 5, 7, -5,
		];
		while (this.next < this.ctx.currentTime + 0.14) {
			const s = this.steps++,
				t = this.next,
				root = [146.83, 130.81, 174.61, 110][Math.floor(s / 16) % 4];
			if (s % 2 === 0 || intensity > 1) {
				const n = melody[s % melody.length],
					f = root * 2 * Math.pow(2, n / 12);
				this.tone(f, f * 0.998, beat * 1.5, 0.16, "triangle", this.music, t);
				this.calls.music++;
			}
			if (s % 4 === 0)
				this.tone(root / 2, root / 2, 0.25, 0.22, "triangle", this.music, t);
			if (s % 4 === 0) this.tone(92, 38, 0.14, 0.14, "sine", this.music, t);
			if (s % 4 === 2)
				this.tone(210, 95, 0.055, 0.045, "square", this.music, t);
			if (s % 2 === 1)
				this.tone(4200, 2100, 0.018, 0.015, "triangle", this.music, t);
			this.next += beat;
		}
	}
	event(e) {
		if (!this.ctx) return;
		this.calls.effects++;
		if (e.type === "fire") {
			this.calls.shot++;
			this.tone(980, 260, 0.085, 0.065, "square");
		}
		if (e.type === "hit") this.tone(310, 130, 0.07, 0.06, "triangle");
		if (e.type === "kill") {
			this.noise(e.enemyType === "boss" ? 0.7 : 0.13, 0.15, 2000);
			this.tone(170, 50, 0.19, 0.09, "sawtooth");
		}
		if (e.type === "split") {
			this.tone(300, 700, 0.16, 0.12, "square");
			this.tone(600, 250, 0.2, 0.06, "triangle");
		}
		if (e.type === "hurt") {
			this.noise(0.3, 0.25, 800);
			this.tone(140, 35, 0.45, 0.19, "sawtooth");
		}
		if (e.type === "pulse") {
			this.tone(80, 1100, 0.28, 0.2, "sine");
			this.noise(0.3, 0.12, 5000);
		}
		if (e.type === "dash") this.noise(0.12, 0.08, 3000);
		if (e.type === "pickup" || e.type === "blessing")
			for (let i = 0; i < 4; i++)
				this.tone(
					440 * Math.pow(2, (i * 3) / 12),
					440 * Math.pow(2, (i * 3) / 12),
					0.19,
					0.1,
					"triangle",
					this.sfx,
					this.ctx.currentTime + i * 0.055,
				);
		if (e.type === "wave" || e.type === "bossPhase") {
			this.speak(e.wave ?? e.phase ?? 1);
		}
		if (e.type === "warning") this.tone(660, 660, 0.11, 0.06, "square");
		if (["victory", "clear", "clean"].includes(e.type))
			for (let i = 0; i < 4; i++)
				this.tone(
					[440, 554, 659, 880][i],
					[440, 554, 659, 880][i],
					0.3,
					0.08,
					"triangle",
					this.sfx,
					this.ctx.currentTime + i * 0.1,
				);
		if (e.type === "gameover") {
			this.speak(7);
			this.tone(220, 55, 0.8, 0.14, "triangle");
		}
	}
	ui() {
		this.tone(720, 960, 0.045, 0.065, "triangle");
	}
	level() {
		if (!this.analyser) return 0;
		const data = new Float32Array(this.analyser.fftSize);
		this.analyser.getFloatTimeDomainData(data);
		return Math.sqrt(data.reduce((s, v) => s + v * v, 0) / data.length);
	}
	stop() {
		this.muted = true;
		this.ctx?.suspend();
	}
	static async offlineProbe() {
		const C = window.OfflineAudioContext || window.webkitOfflineAudioContext;
		if (!C) return { supported: false };
		const ctx = new C(1, 48000, 48000);
		const synth = new Synth();
		synth.ctx = ctx;
		synth.sfx = ctx.createGain();
		synth.sfx.gain.value = 0.7;
		synth.sfx.connect(ctx.destination);
		synth.voice = synth.sfx;
		synth.tone(880, 220, 0.25, 0.2, "square");
		synth.noise(0.25, 0.1);
		synth.speak(3);
		const buffer = await ctx.startRendering();
		const d = buffer.getChannelData(0);
		let energy = 0,
			peak = 0;
		for (const v of d) {
			energy += v * v;
			peak = Math.max(peak, Math.abs(v));
		}
		return {
			supported: true,
			rms: Math.sqrt(energy / d.length),
			peak,
			samples: d.length,
		};
	}
}
