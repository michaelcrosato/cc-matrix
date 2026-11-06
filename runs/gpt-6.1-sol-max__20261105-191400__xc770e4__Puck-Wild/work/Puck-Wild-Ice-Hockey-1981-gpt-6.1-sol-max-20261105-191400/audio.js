export function tone(
	ctx,
	out,
	freq,
	time,
	duration = 0.15,
	type = "square",
	volume = 0.08,
	endFreq = null,
) {
	const osc = ctx.createOscillator(),
		gain = ctx.createGain();
	osc.type = type;
	osc.frequency.setValueAtTime(freq, time);
	if (endFreq)
		osc.frequency.exponentialRampToValueAtTime(endFreq, time + duration);
	gain.gain.setValueAtTime(0.0001, time);
	gain.gain.exponentialRampToValueAtTime(
		Math.max(0.0002, volume),
		time + 0.008,
	);
	gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
	osc.connect(gain).connect(out);
	osc.start(time);
	osc.stop(time + duration + 0.02);
}
export function noise(
	ctx,
	out,
	time,
	duration = 0.1,
	volume = 0.1,
	filter = 2000,
) {
	const b = ctx.createBuffer(
			1,
			Math.ceil(ctx.sampleRate * duration),
			ctx.sampleRate,
		),
		a = b.getChannelData(0);
	for (let i = 0; i < a.length; i++)
		a[i] = (Math.random() * 2 - 1) * (1 - i / a.length);
	const s = ctx.createBufferSource(),
		f = ctx.createBiquadFilter(),
		g = ctx.createGain();
	s.buffer = b;
	f.type = "bandpass";
	f.frequency.value = filter;
	f.Q.value = 0.6;
	g.gain.value = volume;
	s.connect(f).connect(g).connect(out);
	s.start(time);
}
export class RinkAudio {
	constructor() {
		this.ctx = null;
		this.musicVolume = 0.1;
		this.sfxVolume = 0.7;
		this.masterVolume = 0.8;
		this.musicOn = true;
		this.nextBeat = 0;
		this.beat = 0;
		this.ended = false;
		this.voiceCount = 0;
	}
	async unlock() {
		if (!this.ctx) {
			const A = window.AudioContext || window.webkitAudioContext;
			if (!A) return;
			this.ctx = new A();
			this.master = this.ctx.createGain();
			this.master.gain.value = this.masterVolume;
			this.analyser = this.ctx.createAnalyser();
			this.analyser.fftSize = 512;
			this.master.connect(this.analyser).connect(this.ctx.destination);
			this.music = this.ctx.createGain();
			this.sfx = this.ctx.createGain();
			this.music.connect(this.master);
			this.sfx.connect(this.master);
			this.setVolumes();
			this.nextBeat = this.ctx.currentTime + 0.1;
		}
		if (this.ctx.state === "suspended") await this.ctx.resume();
	}
	setVolumes() {
		if (!this.ctx) return;
		this.music.gain.value = this.musicOn ? this.musicVolume : 0;
		this.sfx.gain.value = this.sfxVolume;
		this.master.gain.value = this.ended ? 0 : this.masterVolume;
	}
	update() {
		if (!this.ctx || this.ended || this.ctx.state !== "running") return;
		const now = this.ctx.currentTime;
		if (this.nextBeat < now - 0.3) this.nextBeat = now + 0.02;
		while (this.nextBeat < now + 0.12) {
			this.musicBeat(this.beat++, this.nextBeat);
			this.nextBeat += 0.205;
		}
	}
	musicBeat(beat, t) {
		const ctx = this.ctx,
			out = this.music;
		const roots = [48, 48, 53, 55],
			root = roots[Math.floor(beat / 16) % 4],
			midi = (n) => 440 * 2 ** ((n - 69) / 12);
		const melody = [12, 0, 7, 12, 15, 12, 7, 10, 12, 0, 7, 12, 19, 15, 12, 7];
		if (beat % 2 === 0) {
			tone(
				ctx,
				out,
				midi(root + (beat % 4 === 2 ? 7 : 0)),
				t,
				0.18,
				"triangle",
				0.17,
			);
			tone(ctx, out, midi(root + melody[beat % 16]), t, 0.15, "square", 0.065);
		}
		if (beat % 4 === 0) {
			tone(ctx, out, 110, t, 0.1, "sine", 0.3, 38);
			for (const n of [0, 4, 7])
				tone(ctx, out, midi(root + 12 + n), t, 0.35, "triangle", 0.04);
		}
		if (beat % 4 === 2) noise(ctx, out, t, 0.12, 0.12, 1800);
		noise(ctx, out, t, 0.035, 0.045, 7000);
	}
	event(e) {
		if (!this.ctx || this.ended) return;
		const c = this.ctx,
			t = c.currentTime,
			o = this.sfx;
		if (e.type === "shot") {
			noise(c, o, t, 0.13, 0.3, 2200);
			tone(c, o, 180, t, 0.09, "triangle", 0.22, 55);
		}
		if (e.type === "pass") {
			tone(c, o, 600, t, 0.08, "triangle", 0.13, 240);
			noise(c, o, t, 0.07, 0.12, 3500);
		}
		if (e.type === "check") {
			noise(c, o, t, 0.25, 0.42, 700);
			tone(c, o, 95, t, 0.2, "sawtooth", 0.12, 35);
			this.voice("hit");
		}
		if (e.type === "swing") noise(c, o, t, 0.1, 0.1, 3100);
		if (e.type === "save") {
			tone(c, o, 700, t, 0.08, "triangle", 0.16, 300);
			this.voice("save");
		}
		if (e.type === "drop") {
			tone(c, o, 1450, t, 0.18, "sine", 0.14);
			this.voice("go");
		}
		if (e.type === "goal") {
			for (const n of [0, 4, 7, 12, 7, 12, 16])
				tone(c, o, 440 * 2 ** (n / 12), t + n * 0.014, 0.28, "square", 0.09);
			noise(c, o, t, 1.4, 0.3, 1100);
			tone(c, o, 180, t, 0.8, "sawtooth", 0.09, 184);
			this.voice("goal");
		}
		if (e.type === "drill") {
			tone(c, o, 740, t, 0.14, "triangle", 0.16);
			tone(c, o, 990, t + 0.12, 0.25, "triangle", 0.14);
		}
		if (e.type === "end" || e.type === "training-complete")
			for (let i = 0; i < 6; i++)
				tone(
					c,
					o,
					[523, 659, 784, 1047, 784, 1047][i],
					t + i * 0.16,
					0.3,
					"square",
					0.08,
				);
		if (e.type === "skate" && Math.random() < 0.2)
			noise(c, o, t, 0.08, 0.035, 6500);
		if (e.type === "period" || e.type === "overtime")
			tone(c, o, 1100, t, 0.6, "sine", 0.09, 1000);
	}
	voice(kind) {
		if (!this.ctx) return;
		const c = this.ctx,
			t = c.currentTime + 0.03;
		this.voiceCount++;
		const syllables = kind === "goal" ? 6 : 3;
		for (let i = 0; i < syllables; i++) {
			const o = c.createOscillator(),
				g = c.createGain(),
				f = c.createBiquadFilter();
			o.type = "sawtooth";
			const freq = kind === "goal" ? 190 : kind === "hit" ? 130 : 220;
			o.frequency.setValueAtTime(freq + (i % 3) * 45, t + i * 0.105);
			o.frequency.exponentialRampToValueAtTime(
				freq * 0.8,
				t + i * 0.105 + 0.09,
			);
			f.type = "bandpass";
			f.frequency.value = [800, 1500, 500, 1900, 950, 1200][i % 6];
			f.Q.value = 5;
			g.gain.setValueAtTime(0.0001, t + i * 0.105);
			g.gain.linearRampToValueAtTime(0.11, t + i * 0.105 + 0.015);
			g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.105 + 0.09);
			o.connect(f).connect(g).connect(this.sfx);
			o.start(t + i * 0.105);
			o.stop(t + i * 0.105 + 0.1);
		}
	}
	ui() {
		if (this.ctx)
			tone(
				this.ctx,
				this.sfx,
				680,
				this.ctx.currentTime,
				0.045,
				"triangle",
				0.06,
			);
	}
	silence() {
		this.ended = true;
		this.setVolumes();
	}
}
