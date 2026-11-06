const midi = (n) => 440 * 2 ** ((n - 69) / 12);
export function tone(
	ctx,
	out,
	freq,
	time,
	duration = 0.15,
	type = "triangle",
	amp = 0.13,
	endFreq = freq,
) {
	const o = ctx.createOscillator(),
		g = ctx.createGain();
	o.type = type;
	o.frequency.setValueAtTime(freq, time);
	o.frequency.exponentialRampToValueAtTime(
		Math.max(20, endFreq),
		time + duration,
	);
	g.gain.setValueAtTime(0, time);
	g.gain.linearRampToValueAtTime(amp, time + 0.008);
	g.gain.exponentialRampToValueAtTime(0.0001, time + duration);
	o.connect(g);
	g.connect(out);
	o.start(time);
	o.stop(time + duration + 0.03);
}
function noise(ctx, out, time, duration = 0.12, amp = 0.1, cutoff = 4500) {
	const b = ctx.createBuffer(
			1,
			Math.ceil(ctx.sampleRate * duration),
			ctx.sampleRate,
		),
		a = b.getChannelData(0);
	for (let i = 0; i < a.length; i++)
		a[i] = ((Math.sin(i * 78.233 + 4) * 43758.5453) % 1) * 2 - 1;
	const s = ctx.createBufferSource(),
		f = ctx.createBiquadFilter(),
		g = ctx.createGain();
	s.buffer = b;
	f.type = "highpass";
	f.frequency.value = cutoff;
	g.gain.setValueAtTime(amp, time);
	g.gain.exponentialRampToValueAtTime(0.0001, time + duration);
	s.connect(f);
	f.connect(g);
	g.connect(out);
	s.start(time);
	s.stop(time + duration);
}
function syllables(ctx, out, time, seed = 1, count = 5) {
	for (let i = 0; i < count; i++) {
		const at = time + i * 0.115,
			base = 140 + ((seed * 37 + i * 61) % 120);
		const o = ctx.createOscillator(),
			g = ctx.createGain(),
			f = ctx.createBiquadFilter();
		o.type = "sawtooth";
		o.frequency.setValueAtTime(base, at);
		o.frequency.exponentialRampToValueAtTime(base * 1.3, at + 0.06);
		f.type = "bandpass";
		f.frequency.setValueAtTime([650, 1200, 850, 1600, 700][(i + seed) % 5], at);
		f.Q.value = 3.6;
		g.gain.setValueAtTime(0, at);
		g.gain.linearRampToValueAtTime(0.13, at + 0.012);
		g.gain.exponentialRampToValueAtTime(0.0001, at + 0.1);
		o.connect(f);
		f.connect(g);
		g.connect(out);
		o.start(at);
		o.stop(at + 0.11);
	}
}
function musicStep(ctx, out, step, at) {
	const roots = [45, 41, 38, 40],
		root = roots[Math.floor(step / 16) % 4],
		s = step % 16;
	if (s % 4 === 0) {
		tone(ctx, out, 110, at, 0.14, "sine", 0.28, 38);
		if (s === 4 || s === 12) noise(ctx, out, at, 0.12, 0.13, 1600);
	}
	if (s % 2 === 0) noise(ctx, out, at, 0.035, 0.055, 7000);
	if ([0, 3, 6, 8, 11, 14].includes(s))
		tone(
			ctx,
			out,
			midi(root + (s === 6 || s === 14 ? 7 : 0)),
			at,
			0.16,
			"triangle",
			0.25,
		);
	if (s === 2 || s === 10) {
		for (const n of [0, 3, 7, 10])
			tone(ctx, out, midi(root + 12 + n), at, 0.12, "sine", 0.06);
	}
	if (s % 2 === 1) {
		const melody = [12, 19, 15, 22, 19, 17, 15, 10];
		tone(
			ctx,
			out,
			midi(root + 12 + melody[Math.floor(s / 2)]),
			at,
			0.16,
			"triangle",
			0.075,
		);
	}
}
export class Sound {
	constructor() {
		this.musicVolume = 0.1;
		this.sfxVolume = 0.7;
		this.enabled = true;
		this.ctx = null;
		this.muted = false;
		this.events = 0;
	}
	async unlock() {
		if (!this.ctx) {
			const AC = window.AudioContext || window.webkitAudioContext;
			if (!AC) return;
			const ctx = (this.ctx = new AC());
			this.master = ctx.createGain();
			this.master.gain.value = 0.65;
			const comp = ctx.createDynamicsCompressor();
			comp.threshold.value = -12;
			comp.ratio.value = 4;
			this.master.connect(comp);
			comp.connect(ctx.destination);
			this.music = ctx.createGain();
			this.sfx = ctx.createGain();
			this.music.gain.value = this.musicVolume;
			this.sfx.gain.value = this.sfxVolume;
			this.music.connect(this.master);
			this.sfx.connect(this.master);
			this.analyser = ctx.createAnalyser();
			this.analyser.fftSize = 1024;
			this.master.connect(this.analyser);
			const silent = ctx.createGain();
			silent.gain.value = 0;
			this.analyser.connect(silent);
			silent.connect(ctx.destination);
			this.engine = ctx.createOscillator();
			this.engine.type = "sawtooth";
			this.engine.frequency.value = 45;
			this.engineGain = ctx.createGain();
			this.engineGain.gain.value = 0;
			this.engineFilter = ctx.createBiquadFilter();
			this.engineFilter.type = "lowpass";
			this.engineFilter.frequency.value = 300;
			this.engine.connect(this.engineFilter);
			this.engineFilter.connect(this.engineGain);
			this.engineGain.connect(this.sfx);
			this.engine.start();
			this.step = 0;
			this.nextBeat = ctx.currentTime + 0.1;
		}
		if (this.ctx.state === "suspended") await this.ctx.resume().catch(() => {});
	}
	setMusic(v) {
		this.musicVolume = v;
		if (this.music)
			this.music.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
	}
	setEffects(v) {
		this.sfxVolume = v;
		if (this.sfx) this.sfx.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
	}
	mute(value) {
		this.muted = value;
		if (this.master)
			this.master.gain.setTargetAtTime(
				value ? 0 : 0.65,
				this.ctx.currentTime,
				0.03,
			);
	}
	event(ev) {
		if (!this.ctx || this.muted) return;
		const c = this.ctx,
			t = c.currentTime,
			out = this.sfx;
		this.events++;
		if (ev.type === "token")
			tone(
				c,
				out,
				640 + (ev.token.id % 5) * 90,
				t,
				0.075,
				"triangle",
				0.065,
				1050,
			);
		if (ev.type === "switch") {
			tone(c, out, 220, t, 0.12, "sine", 0.12, 440);
			noise(c, out, t, 0.06, 0.035, 1200);
		}
		if (ev.type === "crash") {
			noise(c, out, t, 0.4, 0.26, 350);
			tone(c, out, 95, t, 0.4, "sawtooth", 0.2, 35);
			syllables(c, out, t + 0.2, 2, 3);
		}
		if (ev.type === "near") {
			tone(c, out, 1200, t, 0.17, "sine", 0.11, 550);
		}
		if (ev.type === "cell" || ev.type === "deflect") {
			[0, 4, 7, 12].forEach((n, i) =>
				tone(c, out, midi(76 + n), t + i * 0.055, 0.17, "triangle", 0.12),
			);
		}
		if (ev.type === "go") {
			tone(c, out, 880, t, 0.24, "square", 0.065);
			syllables(c, out, t + 0.14, 3, 4);
		}
		if (ev.type === "clear") {
			[0, 4, 7, 12, 16].forEach((n, i) =>
				tone(c, out, midi(60 + n), t + i * 0.12, 0.3, "triangle", 0.13),
			);
			syllables(c, out, t + 0.4, 1, 6);
		}
		if (ev.type === "finish") {
			syllables(c, out, t + 0.1, ev.won ? 4 : 0, 7);
		}
		if (ev.type === "menu") tone(c, out, 450, t, 0.06, "sine", 0.07, 600);
	}
	update(game, paused) {
		if (!this.ctx || this.ctx.state !== "running" || this.muted) return;
		const now = this.ctx.currentTime;
		if (this.nextBeat < now - 0.5) this.nextBeat = now;
		let limit = 0;
		while (this.nextBeat < now + 0.15 && limit++ < 8) {
			musicStep(this.ctx, this.music, this.step++, this.nextBeat);
			this.nextBeat += 60 / 112 / 4;
		}
		const speed = game.players[0]?.speed || 0,
			active = !paused && game.phase === "playing";
		this.engine.frequency.setTargetAtTime(38 + speed * 4.2, now, 0.1);
		this.engineFilter.frequency.setTargetAtTime(180 + speed * 24, now, 0.1);
		this.engineGain.gain.setTargetAtTime(active ? 0.026 : 0, now, 0.08);
	}
	levels() {
		if (!this.analyser) return { rms: 0, events: this.events, state: "locked" };
		const a = new Float32Array(this.analyser.fftSize);
		this.analyser.getFloatTimeDomainData(a);
		return {
			rms: Math.sqrt(a.reduce((s, x) => s + x * x, 0) / a.length),
			events: this.events,
			state: this.ctx.state,
		};
	}
	async probe() {
		const ctx = new OfflineAudioContext(2, 96000, 48000),
			out = ctx.createGain();
		out.gain.value = 0.5;
		out.connect(ctx.destination);
		for (let i = 0; i < 12; i++) musicStep(ctx, out, i, i * 0.12);
		syllables(ctx, out, 0.3, 3, 6);
		tone(ctx, out, 800, 0.1, 0.15, "triangle", 0.15, 1200);
		const buffer = await ctx.startRendering();
		const a = buffer.getChannelData(0);
		let sum = 0,
			peak = 0,
			finite = true;
		for (const x of a) {
			sum += x * x;
			peak = Math.max(peak, Math.abs(x));
			if (!Number.isFinite(x)) finite = false;
		}
		return {
			rms: Math.sqrt(sum / a.length),
			peak,
			finite,
			duration: buffer.duration,
			channels: buffer.numberOfChannels,
			defaultMusicVolume: 0.1,
		};
	}
}
