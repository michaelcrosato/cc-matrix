function tone(
	ctx,
	out,
	at,
	hz,
	duration,
	type = "sine",
	volume = 0.25,
	endHz = hz,
) {
	const o = ctx.createOscillator(),
		g = ctx.createGain();
	o.type = type;
	o.frequency.setValueAtTime(hz, at);
	o.frequency.exponentialRampToValueAtTime(Math.max(20, endHz), at + duration);
	g.gain.setValueAtTime(0.0001, at);
	g.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), at + 0.008);
	g.gain.exponentialRampToValueAtTime(0.0001, at + duration);
	o.connect(g);
	g.connect(out);
	o.start(at);
	o.stop(at + duration + 0.01);
}
function noise(ctx, out, at, duration, frequency, volume = 0.25) {
	const b = ctx.createBuffer(
			1,
			Math.ceil(ctx.sampleRate * duration),
			ctx.sampleRate,
		),
		a = b.getChannelData(0);
	let seed = 41;
	for (let i = 0; i < a.length; i++) {
		seed = (seed * 1664525 + 1013904223) >>> 0;
		a[i] = (seed / 2147483648 - 1) * (1 - i / a.length);
	}
	const s = ctx.createBufferSource();
	s.buffer = b;
	const f = ctx.createBiquadFilter();
	f.type = "bandpass";
	f.frequency.setValueAtTime(frequency, at);
	f.frequency.exponentialRampToValueAtTime(100, at + duration);
	const g = ctx.createGain();
	g.gain.setValueAtTime(volume, at);
	g.gain.exponentialRampToValueAtTime(0.0001, at + duration);
	s.connect(f);
	f.connect(g);
	g.connect(out);
	s.start(at);
}
export function sound(ctx, out, kind, at = ctx.currentTime, pitch = 1) {
	if (kind === "catch") {
		tone(ctx, out, at, 480 * pitch, 0.1, "sine", 0.3, 900 * pitch);
		noise(ctx, out, at, 0.13, 1900, 0.45);
		tone(ctx, out, at + 0.03, 220 * pitch, 0.11, "triangle", 0.1, 600 * pitch);
	}
	if (kind === "splash") {
		noise(ctx, out, at, 0.5, 3400, 0.8);
		tone(ctx, out, at, 180, 0.35, "sine", 0.35, 55);
		for (let i = 0; i < 5; i++)
			tone(
				ctx,
				out,
				at + i * 0.035,
				350 + i * 160,
				0.17,
				"triangle",
				0.12,
				1000 + i * 140,
			);
	}
	if (kind === "boom") {
		noise(ctx, out, at, 0.7, 950, 0.9);
		tone(ctx, out, at, 90, 0.65, "sine", 0.6, 25);
		tone(ctx, out, at + 0.05, 65, 0.5, "sawtooth", 0.1, 25);
	}
	if (kind === "select") {
		tone(ctx, out, at, 740, 0.07, "triangle", 0.13, 1000);
	}
	if (kind === "restore" || kind === "win") {
		const notes = kind === "win" ? [0, 4, 7, 12, 16, 19] : [0, 7, 12];
		notes.forEach((n, i) => {
			tone(ctx, out, at + i * 0.085, 330 * 2 ** (n / 12), 0.3, "triangle", 0.2);
		});
	}
	if (kind === "voice") {
		const syllables = [1, 1.35, 0.93, 1.16, 0.84];
		syllables.forEach((v, i) => {
			const o = ctx.createOscillator(),
				filter = ctx.createBiquadFilter(),
				g = ctx.createGain();
			const t = at + i * 0.095;
			o.type = "sawtooth";
			o.frequency.setValueAtTime(180 * v * pitch, t);
			o.frequency.exponentialRampToValueAtTime(220 * v * pitch, t + 0.065);
			filter.type = "bandpass";
			filter.Q.value = 6;
			filter.frequency.value = 650 + ((i * 443) % 1200);
			g.gain.setValueAtTime(0.0001, t);
			g.gain.linearRampToValueAtTime(0.15, t + 0.012);
			g.gain.exponentialRampToValueAtTime(0.0001, t + 0.085);
			o.connect(filter);
			filter.connect(g);
			g.connect(out);
			o.start(t);
			o.stop(t + 0.09);
		});
	}
	if (kind === "tick") tone(ctx, out, at, 1000 * pitch, 0.04, "triangle", 0.08);
}

export class Soundtrack {
	constructor(settings) {
		this.settings = settings;
		this.ctx = null;
		this.step = 0;
		this.next = 0;
		this.timer = null;
		this.playing = false;
		this.scheduled = 0;
		this.effects = 0;
	}
	async unlock() {
		if (!this.ctx) {
			this.ctx = new (window.AudioContext || window.webkitAudioContext)();
			this.master = this.ctx.createGain();
			this.music = this.ctx.createGain();
			this.sfx = this.ctx.createGain();
			this.voice = this.ctx.createGain();
			const compressor = this.ctx.createDynamicsCompressor();
			compressor.threshold.value = -10;
			compressor.ratio.value = 5;
			this.music.connect(this.master);
			this.sfx.connect(this.master);
			this.voice.connect(this.master);
			this.master.connect(compressor);
			this.analyser = this.ctx.createAnalyser();
			this.analyser.fftSize = 256;
			compressor.connect(this.analyser);
			this.analyser.connect(this.ctx.destination);
			this.apply();
		}
		if (this.ctx.state === "suspended") await this.ctx.resume();
		if (!this.timer) {
			this.next = this.ctx.currentTime + 0.05;
			this.timer = setInterval(() => this.schedule(), 35);
		}
		this.playing = true;
	}
	apply() {
		if (!this.ctx) return;
		const t = this.ctx.currentTime;
		for (const [g, v] of [
			[this.master, this.settings.master],
			[this.music, this.settings.music],
			[this.sfx, this.settings.sfx],
			[this.voice, this.settings.voice],
		])
			g.gain.setTargetAtTime(v, t, 0.03);
	}
	play(kind, pitch = 1) {
		if (this.ctx?.state !== "running" || !this.playing) return;
		sound(
			this.ctx,
			kind === "voice" ? this.voice : this.sfx,
			kind,
			this.ctx.currentTime + 0.003,
			pitch,
		);
		this.effects++;
	}
	schedule() {
		if (!this.ctx || !this.playing) return;
		const stepDuration = 60 / 112 / 4;
		while (this.next < this.ctx.currentTime + 0.12) {
			const s = this.step % 64,
				t = this.next;
			const root = [48, 53, 50, 55][Math.floor(s / 16)];
			if (s % 4 === 0)
				tone(
					this.ctx,
					this.music,
					t,
					440 * 2 ** ((root - 12 - 69) / 12),
					0.28,
					"triangle",
					0.4,
				);
			if (s % 8 === 0 || s % 8 === 3) {
				for (const n of [0, 4, 7, 10])
					tone(
						this.ctx,
						this.music,
						t,
						440 * 2 ** ((root + n + 12 - 69) / 12),
						0.16,
						"triangle",
						0.075,
					);
			}
			if (s % 2 === 1) noise(this.ctx, this.music, t, 0.035, 7000, 0.08);
			if (s % 8 === 4) {
				noise(this.ctx, this.music, t, 0.065, 1700, 0.16);
				tone(this.ctx, this.music, t, 150, 0.06, "triangle", 0.12, 70);
			}
			const melody = [
				12, 16, 19, 21, 19, 16, 14, 12, 16, 19, 22, 21, 19, 14, 11, 7,
			];
			if (s % 4 === 2) {
				const n = root + melody[Math.floor(s / 4)];
				tone(
					this.ctx,
					this.music,
					t,
					440 * 2 ** ((n - 69) / 12),
					0.21,
					"sine",
					0.21,
				);
			}
			this.scheduled++;
			this.step++;
			this.next += stepDuration;
		}
	}
	stop() {
		this.playing = false;
		if (this.timer) {
			clearInterval(this.timer);
			this.timer = null;
		}
		this.ctx?.suspend();
	}
	level() {
		if (!this.analyser) return 0;
		const a = new Float32Array(256);
		this.analyser.getFloatTimeDomainData(a);
		return Math.sqrt(a.reduce((v, x) => v + x * x, 0) / a.length);
	}
}
