const NOTES = [110, 164.8138, 220, 261.6256, 146.8324, 220, 293.6648, 329.6276];
function envelope(ctx, gain, t, amp, duration) {
	gain.gain.setValueAtTime(0.0001, t);
	gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, amp), t + 0.012);
	gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
}
function note(
	ctx,
	out,
	freq,
	t,
	duration = 0.3,
	amp = 0.1,
	type = "triangle",
	end = freq,
) {
	const o = ctx.createOscillator(),
		g = ctx.createGain();
	o.type = type;
	o.frequency.setValueAtTime(freq, t);
	o.frequency.exponentialRampToValueAtTime(Math.max(10, end), t + duration);
	envelope(ctx, g, t, amp, duration);
	o.connect(g).connect(out);
	o.start(t);
	o.stop(t + duration + 0.02);
}
function noise(ctx, out, t, duration = 0.3, amp = 0.1, freq = 800) {
	const b = ctx.createBuffer(
			1,
			Math.ceil(ctx.sampleRate * duration),
			ctx.sampleRate,
		),
		a = b.getChannelData(0);
	let r = 127;
	for (let i = 0; i < a.length; i++) {
		r = (r * 16807) % 2147483647;
		a[i] = ((r / 2147483647) * 2 - 1) * (1 - i / a.length);
	}
	const s = ctx.createBufferSource(),
		f = ctx.createBiquadFilter(),
		g = ctx.createGain();
	s.buffer = b;
	f.type = "lowpass";
	f.frequency.setValueAtTime(freq, t);
	f.frequency.exponentialRampToValueAtTime(90, t + duration);
	envelope(ctx, g, t, amp, duration);
	s.connect(f).connect(g).connect(out);
	s.start(t);
	s.stop(t + duration + 0.02);
}
function voice(ctx, out, t, phrase = 0) {
	const vowels = [650, 1100, 430, 890, 1450, 550];
	for (let i = 0; i < 7; i++) {
		const at = t + i * 0.086;
		const o = ctx.createOscillator(),
			f = ctx.createBiquadFilter(),
			g = ctx.createGain();
		o.type = "sawtooth";
		o.frequency.setValueAtTime(135 + ((i * 37 + phrase * 11) % 75), at);
		o.frequency.linearRampToValueAtTime(155 + ((i * 19) % 55), at + 0.06);
		f.type = "bandpass";
		f.frequency.value = vowels[(i + phrase) % vowels.length];
		f.Q.value = 5;
		envelope(ctx, g, at, 0.11, 0.075);
		o.connect(f).connect(g).connect(out);
		o.start(at);
		o.stop(at + 0.08);
	}
}
export class AudioSystem {
	constructor(settings) {
		this.settings = settings;
		this.ctx = null;
		this.next = 0;
		this.beat = 0;
		this.counts = { shot: 0, hit: 0, voice: 0, music: 0 };
		this.stopped = false;
	}
	init() {
		if (!this.ctx) {
			const C = window.AudioContext || window.webkitAudioContext;
			if (!C) return;
			this.ctx = new C();
			this.master = this.ctx.createGain();
			this.master.gain.value = this.settings.master;
			const limiter = this.ctx.createDynamicsCompressor();
			limiter.threshold.value = -10;
			limiter.ratio.value = 8;
			this.master.connect(limiter).connect(this.ctx.destination);
			this.music = this.ctx.createGain();
			this.sfx = this.ctx.createGain();
			this.music.connect(this.master);
			this.sfx.connect(this.master);
			this.music.gain.value = this.settings.music;
			this.sfx.gain.value = this.settings.sfx;
			this.analyser = this.ctx.createAnalyser();
			this.master.connect(this.analyser);
			this.next = this.ctx.currentTime + 0.05;
		}
		this.stopped = false;
		this.ctx.resume().catch(() => {});
	}
	apply() {
		if (!this.ctx) return;
		const t = this.ctx.currentTime;
		this.master.gain.setTargetAtTime(
			this.stopped ? 0 : this.settings.master,
			t,
			0.03,
		);
		this.music.gain.setTargetAtTime(this.settings.music, t, 0.03);
		this.sfx.gain.setTargetAtTime(this.settings.sfx, t, 0.03);
	}
	update(active = true) {
		if (!this.ctx || this.stopped || this.ctx.state !== "running") return;
		const c = this.ctx;
		let n = 0;
		while (this.next < c.currentTime + 0.22 && n++ < 5) {
			const t = Math.max(this.next, c.currentTime),
				step = this.beat % 32,
				root = NOTES[Math.floor(step / 8) * 2];
			note(c, this.music, root / 2, t, 0.9, 0.13, "sine");
			note(
				c,
				this.music,
				NOTES[step % 8] * (step % 4 === 3 ? 2 : 1),
				t,
				0.44,
				0.12,
				"triangle",
			);
			if (step % 4 === 0) noise(c, this.music, t, 0.035, 0.045, 2500);
			if (active && step % 8 === 4)
				note(c, this.music, root * 2, t, 1.15, 0.06, "sine");
			this.beat++;
			this.next = t + 0.26;
			this.counts.music++;
		}
	}
	fx(type) {
		if (!this.ctx || this.stopped) return;
		const c = this.ctx,
			t = c.currentTime,
			o = this.sfx;
		switch (type) {
			case "shot":
				note(c, o, 920, t, 0.105, 0.08, "sawtooth", 160);
				note(c, o, 1320, t, 0.07, 0.04, "triangle", 360);
				this.counts.shot++;
				break;
			case "enemy":
				note(c, o, 210, t, 0.18, 0.07, "square", 85);
				break;
			case "hit":
				noise(c, o, t, 0.15, 0.2, 1800);
				note(c, o, 120, t, 0.12, 0.18, "triangle", 38);
				this.counts.hit++;
				break;
			case "explode":
				noise(c, o, t, 0.65, 0.4, 1500);
				note(c, o, 72, t, 0.6, 0.3, "sine", 18);
				break;
			case "jump":
				note(c, o, 65, t, 1.8, 0.16, "sawtooth", 1600);
				note(c, o, 68, t, 1.7, 0.1, "triangle", 2100);
				break;
			case "nova":
				noise(c, o, t, 1.2, 0.4, 3200);
				note(c, o, 450, t, 0.8, 0.3, "sine", 20);
				break;
			case "dock":
				for (let i = 0; i < 4; i++)
					note(
						c,
						o,
						[261.6, 329.6, 392, 523.2][i],
						t + i * 0.14,
						0.5,
						0.12,
						"triangle",
					);
				break;
			case "ui":
				note(c, o, 660, t, 0.055, 0.045, "sine", 880);
				break;
			case "warn":
				note(c, o, 220, t, 0.2, 0.09, "square", 180);
				break;
			case "victory":
				for (let i = 0; i < 8; i++)
					note(
						c,
						o,
						[261, 329, 392, 523, 392, 523, 659, 784][i],
						t + i * 0.18,
						0.6,
						0.13,
						"triangle",
					);
				break;
		}
	}
	say(index = 0) {
		if (this.ctx && !this.stopped) {
			voice(this.ctx, this.sfx, this.ctx.currentTime, index);
			this.counts.voice++;
		}
	}
	stop() {
		this.stopped = true;
		if (this.ctx) {
			this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.02);
			this.ctx.suspend().catch(() => {});
		}
	}
	async proof() {
		const C = window.OfflineAudioContext || window.webkitOfflineAudioContext;
		if (!C) return { available: false };
		const c = new C(1, 48000, 48000),
			g = c.createGain();
		g.gain.value = 0.4;
		g.connect(c.destination);
		note(c, g, 220, 0, 0.6, 0.12);
		note(c, g, 920, 0.1, 0.1, 0.08, "sawtooth", 160);
		noise(c, g, 0.25, 0.25, 0.2);
		voice(c, g, 0.25, 2);
		const b = await c.startRendering(),
			a = b.getChannelData(0);
		let peak = 0,
			sum = 0,
			nonzero = 0;
		for (const x of a) {
			peak = Math.max(peak, Math.abs(x));
			sum += x * x;
			if (Math.abs(x) > 0.0001) nonzero++;
		}
		return {
			available: true,
			peak,
			rms: Math.sqrt(sum / a.length),
			nonzero,
			samples: a.length,
			musicDefault: 0.1,
		};
	}
}
