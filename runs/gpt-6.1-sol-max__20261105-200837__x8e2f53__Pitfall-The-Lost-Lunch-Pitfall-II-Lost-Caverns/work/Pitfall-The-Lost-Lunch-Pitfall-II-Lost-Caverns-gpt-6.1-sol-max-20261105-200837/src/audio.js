export class CaveAudio {
	constructor() {
		this.music = 0.1;
		this.effects = 0.65;
		this.enabled = true;
		this.ctx = null;
		this.next = 0;
		this.beat = 0;
		this.zone = 0;
		this.events = { notes: 0, effects: 0, voices: 0 };
	}
	init() {
		if (!this.ctx) {
			const Audio = window.AudioContext || window.webkitAudioContext;
			if (!Audio) return;
			this.ctx = new Audio();
			this.master = this.ctx.createGain();
			this.master.gain.value = 0.65;
			this.analyser = this.ctx.createAnalyser();
			this.analyser.fftSize = 256;
			this.master.connect(this.analyser);
			this.analyser.connect(this.ctx.destination);
			this.next = this.ctx.currentTime + 0.05;
		}
		if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
	}
	tone(
		hz,
		at,
		duration,
		volume,
		type = "triangle",
		slide = 0,
		context = this.ctx,
		output = this.master,
	) {
		if (!context || !output) return;
		const o = context.createOscillator();
		const g = context.createGain();
		o.type = type;
		o.frequency.setValueAtTime(hz, at);
		if (slide)
			o.frequency.exponentialRampToValueAtTime(
				Math.max(20, hz + slide),
				at + duration,
			);
		g.gain.setValueAtTime(0, at);
		g.gain.linearRampToValueAtTime(volume, at + 0.008);
		g.gain.exponentialRampToValueAtTime(0.0001, at + duration);
		o.connect(g);
		g.connect(output);
		o.start(at);
		o.stop(at + duration + 0.02);
	}
	tick() {
		if (!this.ctx || !this.enabled || this.ctx.state !== "running") return;
		const now = this.ctx.currentTime;
		if (this.next < now - 0.5) this.next = now + 0.03;
		const melody = [
			0, 7, 12, 14, 12, 7, 4, 7, 0, 4, 7, 9, 7, 4, 2, -5, 0, 7, 12, 16, 14, 12,
			7, 4, 2, 4, 7, 9, 7, 2, -5, 0,
		];
		while (this.next < now + 0.12) {
			const i = this.beat++;
			const root = this.zone === 1 ? 146.83 : this.zone === 3 ? 196 : 164.81;
			const f = root * 2 ** (melody[i % melody.length] / 12);
			this.tone(f * 2, this.next, 0.22, this.music * 0.16, "triangle");
			if (i % 2 === 0)
				this.tone(
					root * (i % 8 < 4 ? 0.5 : 0.75),
					this.next,
					0.35,
					this.music * 0.21,
					"sine",
				);
			if (i % 4 === 0)
				this.tone(root * 3, this.next + 0.07, 0.48, this.music * 0.08, "sine");
			this.events.notes++;
			this.next += this.zone === 1 ? 0.255 : 0.225;
		}
	}
	sfx(name) {
		if (!this.ctx || !this.enabled) return;
		const t = this.ctx.currentTime,
			v = this.effects * 0.25;
		const sounds = {
			jump: [[240, 0, 0.13, "triangle", 260]],
			splash: [
				[110, 0, 0.3, "sawtooth", -70],
				[620, 0.02, 0.18, "sine", -480],
			],
			coin: [
				[660, 0, 0.14, "sine", 200],
				[990, 0.08, 0.23, "triangle", 220],
			],
			checkpoint: [
				[330, 0, 0.2],
				[440, 0.12, 0.22],
				[660, 0.24, 0.4],
			],
			rescue: [
				[330, 0, 0.22],
				[440, 0.12, 0.25],
				[550, 0.24, 0.3],
				[880, 0.36, 0.5],
			],
			hit: [
				[190, 0, 0.25, "sawtooth", -120],
				[90, 0.09, 0.4, "triangle", -50],
			],
			balloon: [
				[220, 0, 0.4, "sine", 440],
				[440, 0.2, 0.4, "triangle", 220],
			],
			click: [[600, 0, 0.055, "sine", -100]],
			win: [
				[330, 0, 0.28],
				[440, 0.15, 0.3],
				[550, 0.3, 0.3],
				[660, 0.45, 0.3],
				[880, 0.65, 0.9],
			],
		};
		for (const [f, d, l, type, slide] of sounds[name] || sounds.click)
			this.tone(
				f,
				t + d,
				l,
				v * (name === "splash" ? 0.35 : 1),
				type || "triangle",
				slide || 0,
			);
		this.events.effects++;
	}
	voice(seed = 1) {
		if (!this.ctx || !this.enabled) return;
		const t = this.ctx.currentTime;
		for (let i = 0; i < 7; i++) {
			const f = 160 + ((seed * 37 + i * 71) % 230);
			this.tone(
				f,
				t + i * 0.095,
				0.085,
				this.effects * 0.15,
				i % 2 ? "triangle" : "sawtooth",
				i % 2 ? -40 : 100,
			);
			this.tone(f * 2.7, t + i * 0.095, 0.065, this.effects * 0.035, "sine");
		}
		this.events.voices++;
	}
	mute(value) {
		this.enabled = !value;
		if (this.master && this.ctx)
			this.master.gain.setTargetAtTime(
				value ? 0 : 0.65,
				this.ctx.currentTime,
				0.04,
			);
	}
	async verify() {
		const Ctx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
		if (!Ctx) return { supported: false };
		const c = new Ctx(1, 44100, 44100),
			g = c.createGain();
		g.connect(c.destination);
		this.tone(440, 0.03, 0.25, 0.1, "triangle", 220, c, g);
		this.tone(660, 0.15, 0.2, 0.04, "sine", 0, c, g);
		const b = await c.startRendering(),
			a = b.getChannelData(0);
		let sum = 0,
			peak = 0;
		for (const n of a) {
			sum += n * n;
			peak = Math.max(peak, Math.abs(n));
		}
		return {
			supported: true,
			rms: Math.sqrt(sum / a.length),
			peak,
			frames: a.length,
			defaultMusic: 0.1,
		};
	}
}
