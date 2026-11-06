/* H.E.R.O. Blast Shift — all sound is synthesized at runtime. */
const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, Number(v) || 0));
const note = (n) => 440 * 2 ** ((n - 69) / 12);
const musicPattern = [0, 0, 7, 3, 0, 10, 7, 3, 5, 5, 12, 8, 5, 3, 7, 10];
const melody = [
	19,
	null,
	15,
	14,
	null,
	12,
	14,
	null,
	19,
	22,
	null,
	19,
	17,
	null,
	15,
	14,
];
function makeNoise(ctx) {
	const b = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 2), ctx.sampleRate);
	const d = b.getChannelData(0);
	let seed = 917314;
	for (let i = 0; i < d.length; i++) {
		seed ^= seed << 13;
		seed ^= seed >>> 17;
		seed ^= seed << 5;
		d[i] = (seed >>> 0) / 2147483648 - 1;
	}
	return b;
}
function tone(
	ctx,
	dest,
	t,
	freq,
	length = 0.18,
	gain = 0.1,
	type = "triangle",
	endFreq = freq,
	cutoff = 6500,
) {
	const o = ctx.createOscillator(),
		env = ctx.createGain(),
		filter = ctx.createBiquadFilter();
	o.type = type;
	o.frequency.setValueAtTime(Math.max(15, freq), t);
	o.frequency.exponentialRampToValueAtTime(Math.max(15, endFreq), t + length);
	filter.type = "lowpass";
	filter.frequency.setValueAtTime(cutoff, t);
	filter.Q.value = 0.5;
	env.gain.setValueAtTime(0, t);
	env.gain.linearRampToValueAtTime(gain, t + Math.min(0.009, length / 5));
	env.gain.exponentialRampToValueAtTime(0.0001, t + length);
	o.connect(filter).connect(env).connect(dest);
	o.start(t);
	o.stop(t + length + 0.03);
	o.onended = () => {
		o.disconnect();
		filter.disconnect();
		env.disconnect();
	};
}
function noise(
	ctx,
	dest,
	buffer,
	t,
	length,
	gain,
	cutoff = 2000,
	highpass = 100,
) {
	const s = ctx.createBufferSource(),
		env = ctx.createGain(),
		lo = ctx.createBiquadFilter(),
		hi = ctx.createBiquadFilter();
	s.buffer = buffer;
	lo.type = "lowpass";
	lo.frequency.value = cutoff;
	hi.type = "highpass";
	hi.frequency.value = highpass;
	env.gain.setValueAtTime(gain, t);
	env.gain.exponentialRampToValueAtTime(0.0001, t + length);
	s.connect(hi).connect(lo).connect(env).connect(dest);
	s.start(t);
	s.stop(t + length + 0.02);
	s.onended = () => {
		s.disconnect();
		hi.disconnect();
		lo.disconnect();
		env.disconnect();
	};
}
function effect(ctx, dest, buffer, name, t) {
	switch (name) {
		case "laser":
			tone(ctx, dest, t, 1450, 0.12, 0.13, "sawtooth", 220, 3800);
			tone(ctx, dest, t, 90, 0.08, 0.08, "triangle", 40);
			break;
		case "bomb":
			tone(ctx, dest, t, 510, 0.1, 0.15, "square", 510, 1700);
			tone(ctx, dest, t + 0.12, 680, 0.08, 0.11, "square", 680, 1900);
			break;
		case "explode":
			noise(ctx, dest, buffer, t, 0.75, 0.75, 3200, 35);
			tone(ctx, dest, t, 125, 0.65, 0.65, "sine", 22, 1500);
			noise(ctx, dest, buffer, t + 0.08, 0.35, 0.25, 7600, 800);
			break;
		case "rescue":
			[72, 76, 79, 84].forEach((n, i) =>
				tone(ctx, dest, t + i * 0.09, note(n), 0.38, 0.14, "triangle"),
			);
			break;
		case "hit":
			noise(ctx, dest, buffer, t, 0.22, 0.3, 1700, 300);
			tone(ctx, dest, t, 180, 0.23, 0.28, "sawtooth", 47, 1600);
			break;
		case "collect":
			tone(ctx, dest, t, note(88), 0.12, 0.12, "sine");
			tone(ctx, dest, t + 0.055, note(95), 0.2, 0.1, "triangle");
			break;
		case "checkpoint":
			[55, 62, 67, 74].forEach((n, i) =>
				tone(ctx, dest, t + i * 0.11, note(n), 0.48, 0.12, "triangle"),
			);
			break;
		case "win":
			[60, 64, 67, 72, 67, 72, 76, 79, 84].forEach((n, i) => {
				tone(ctx, dest, t + i * 0.15, note(n), 0.55, 0.12, "triangle");
				if (i % 3 === 0)
					tone(ctx, dest, t + i * 0.15, note(n - 24), 0.65, 0.15, "sine");
			});
			break;
		case "fail":
			[60, 55, 51, 48].forEach((n, i) =>
				tone(ctx, dest, t + i * 0.18, note(n), 0.3, 0.15, "triangle"),
			);
			break;
		case "click":
			tone(ctx, dest, t, 650, 0.035, 0.07, "sine", 850);
			break;
		default:
			break;
	}
}
function musicStep(ctx, dest, buffer, t, step, sector, danger) {
	const root = [38, 36, 41][Math.max(0, Math.min(2, sector | 0))];
	const idx = step % 16,
		bass = note(root + musicPattern[idx]);
	tone(ctx, dest, t, bass, 0.28, 0.28, "triangle", bass, 700);
	if (step % 2 === 0) {
		tone(ctx, dest, t, 120, 0.13, 0.26, "sine", 38, 500);
		noise(ctx, dest, buffer, t, 0.035, 0.07, 11000, 6500);
	} else noise(ctx, dest, buffer, t, 0.045, 0.075, 9000, 5500);
	if (step % 4 === 2) noise(ctx, dest, buffer, t, 0.12, 0.12, 3500, 1100);
	const m = melody[idx];
	if (m !== null) {
		tone(
			ctx,
			dest,
			t + 0.012,
			note(root + m + 12),
			0.34,
			0.1,
			"triangle",
			note(root + m + 12),
			2600,
		);
		tone(
			ctx,
			dest,
			t + 0.185,
			note(root + m + 12),
			0.3,
			0.025,
			"sine",
			note(root + m + 12),
			2600,
		);
	}
	if (step % 8 === 0) {
		[0, 7, 14].forEach((n, i) =>
			tone(ctx, dest, t + i * 0.026, note(root + n + 12), 1.7, 0.048, "sine"),
		);
	}
	if (danger && step % 4 === 0)
		tone(
			ctx,
			dest,
			t,
			note(root + 36),
			0.12,
			0.09,
			"square",
			note(root + 36),
			1500,
		);
}
function speak(ctx, dest, t, mood = "rescue") {
	const vowels = [
		[650, 1150],
		[400, 1900],
		[350, 800],
		[750, 1500],
		[450, 2200],
	];
	const phrase =
		mood === "hurt"
			? [2, 0, 3]
			: mood === "win"
				? [1, 4, 0, 3, 1, 2, 4]
				: [0, 2, 1, 4, 3];
	phrase.forEach((v, i) => {
		const when = t + i * 0.095,
			o = ctx.createOscillator(),
			env = ctx.createGain();
		o.type = "sawtooth";
		o.frequency.setValueAtTime(
			155 + (i % 3) * 43 + (mood === "win" ? 50 : 0),
			when,
		);
		o.frequency.exponentialRampToValueAtTime(200 + (i % 4) * 23, when + 0.075);
		env.gain.setValueAtTime(0, when);
		env.gain.linearRampToValueAtTime(0.035, when + 0.008);
		env.gain.exponentialRampToValueAtTime(0.0001, when + 0.085);
		const filters = vowels[v].map((f) => {
			const b = ctx.createBiquadFilter();
			b.type = "bandpass";
			b.frequency.value = f;
			b.Q.value = 5;
			o.connect(b).connect(env);
			return b;
		});
		env.connect(dest);
		o.start(when);
		o.stop(when + 0.09);
		o.onended = () => {
			o.disconnect();
			filters.forEach((f) => f.disconnect());
			env.disconnect();
		};
	});
}
export class Sound {
	constructor() {
		this.music = 0.1;
		this.sfx = 0.65;
		this.muted = false;
		this.paused = false;
		this.unlocked = false;
		this.ctx = null;
		this.step = 0;
		this.next = 0;
		this.events = {};
		this.sector = 0;
		this.lastVoice = -10;
		this.lastPlay = Object.create(null);
		this.jetNodes = [];
	}
	unlock() {
		if (!this.ctx) {
			const AudioCtx = globalThis.AudioContext || globalThis.webkitAudioContext;
			if (!AudioCtx) return Promise.resolve(false);
			try {
				this.ctx = new AudioCtx();
				const c = this.ctx;
				this.master = c.createGain();
				this.musicGain = c.createGain();
				this.sfxGain = c.createGain();
				this.limiter = c.createDynamicsCompressor();
				this.limiter.threshold.value = -8;
				this.limiter.knee.value = 12;
				this.limiter.ratio.value = 8;
				this.limiter.attack.value = 0.003;
				this.limiter.release.value = 0.16;
				this.analyser = c.createAnalyser();
				this.analyser.fftSize = 256;
				this.musicGain.connect(this.master);
				this.sfxGain.connect(this.master);
				this.master
					.connect(this.limiter)
					.connect(this.analyser)
					.connect(c.destination);
				this.master.gain.value = this.muted || this.paused ? 0 : 0.68;
				this.musicGain.gain.value = this.music;
				this.sfxGain.gain.value = this.sfx;
				this.buffer = makeNoise(c);
				this.next = c.currentTime + 0.05;
				const humFilter = c.createBiquadFilter();
				humFilter.type = "lowpass";
				humFilter.frequency.value = 650;
				this.jetGain = c.createGain();
				this.jetGain.gain.value = 0;
				humFilter.connect(this.jetGain).connect(this.sfxGain);
				[63, 126.8].forEach((f, i) => {
					const o = c.createOscillator();
					o.type = i ? "triangle" : "sawtooth";
					o.frequency.value = f;
					o.connect(humFilter);
					o.start();
					this.jetNodes.push(o);
				});
				this.jetFilter = humFilter;
			} catch {
				this.ctx = null;
				return Promise.resolve(false);
			}
		}
		this.unlocked = true;
		if (this.ctx.state === "suspended" && !this.paused)
			return this.ctx
				.resume()
				.then(() => true)
				.catch(() => false);
		return Promise.resolve(true);
	}
	update(dt, state = {}) {
		const c = this.ctx;
		if (!c || !this.unlocked || this.paused || c.state !== "running") return;
		const flying = !!state.flying,
			danger = !!state.danger;
		this.sector = state.sector || 0;
		this.jetGain.gain.setTargetAtTime(flying ? 0.052 : 0, c.currentTime, 0.06);
		this.jetFilter.frequency.setTargetAtTime(
			flying ? 900 : 330,
			c.currentTime,
			0.12,
		);
		this.jetNodes.forEach((o, i) =>
			o.frequency.setTargetAtTime(
				(i ? 126.8 : 63) * (flying ? 1.25 : 1),
				c.currentTime,
				0.07,
			),
		);
		if (this.next < c.currentTime - 0.5) this.next = c.currentTime + 0.01;
		let scheduled = 0;
		while (this.next < c.currentTime + 0.18 && scheduled++ < 8) {
			musicStep(
				c,
				this.musicGain,
				this.buffer,
				this.next,
				this.step++,
				this.sector,
				danger,
			);
			this.next += 0.24;
		}
	}
	play(name) {
		const c = this.ctx;
		if (!c || !this.unlocked || this.paused || c.state !== "running") return;
		const now = c.currentTime;
		if (now - (this.lastPlay[name] ?? -10) < (name === "laser" ? 0.07 : 0.035))
			return;
		this.lastPlay[name] = now;
		this.events[name] = (this.events[name] || 0) + 1;
		effect(c, this.sfxGain, this.buffer, name, now + 0.003);
	}
	voice(mood = "rescue") {
		const c = this.ctx;
		if (
			!c ||
			!this.unlocked ||
			this.paused ||
			c.state !== "running" ||
			c.currentTime - this.lastVoice < 0.7
		)
			return;
		this.lastVoice = c.currentTime;
		this.events.voice = (this.events.voice || 0) + 1;
		speak(c, this.sfxGain, c.currentTime + 0.01, mood);
	}
	setMusic(value) {
		this.music = clamp(value);
		if (this.ctx)
			this.musicGain.gain.setTargetAtTime(
				this.music,
				this.ctx.currentTime,
				0.03,
			);
	}
	setSfx(value) {
		this.sfx = clamp(value);
		if (this.ctx)
			this.sfxGain.gain.setTargetAtTime(this.sfx, this.ctx.currentTime, 0.03);
	}
	setMuted(value) {
		this.muted = !!value;
		if (this.ctx)
			this.master.gain.setTargetAtTime(
				this.muted || this.paused ? 0 : 0.68,
				this.ctx.currentTime,
				0.03,
			);
	}
	suspend(value = true) {
		this.paused = !!value;
		if (!this.ctx) return;
		this.master.gain.setTargetAtTime(
			this.muted || this.paused ? 0 : 0.68,
			this.ctx.currentTime,
			0.025,
		);
		if (this.paused)
			this.jetGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.025);
		else if (this.unlocked && this.ctx.state === "suspended")
			this.ctx.resume().catch(() => {});
	}
	diagnostics() {
		let rms = 0,
			peak = 0;
		if (this.analyser) {
			const data = new Float32Array(this.analyser.fftSize);
			this.analyser.getFloatTimeDomainData(data);
			for (const v of data) {
				rms += v * v;
				peak = Math.max(peak, Math.abs(v));
			}
			rms = Math.sqrt(rms / data.length);
		}
		return {
			available: !!(globalThis.AudioContext || globalThis.webkitAudioContext),
			unlocked: this.unlocked,
			state: this.ctx?.state || "locked",
			music: this.music,
			sfx: this.sfx,
			muted: this.muted,
			paused: this.paused,
			peak,
			rms,
			events: { ...this.events },
			musicSteps: this.step,
		};
	}
}
export async function renderAudioTest() {
	const Ctx =
		globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
	if (!Ctx)
		return {
			peak: 0,
			rms: 0,
			finite: false,
			samples: 0,
			error: "OfflineAudioContext unavailable",
		};
	const ctx = new Ctx(1, 44100 * 6, 44100),
		music = ctx.createGain(),
		sfx = ctx.createGain(),
		master = ctx.createGain();
	master.gain.value = 0.68;
	music.gain.value = 0.1;
	sfx.gain.value = 0.65;
	music.connect(master);
	sfx.connect(master);
	master.connect(ctx.destination);
	const buffer = makeNoise(ctx);
	for (let i = 0; i < 24; i++)
		musicStep(ctx, music, buffer, i * 0.24, i, Math.floor(i / 8), i > 16);
	[
		"laser",
		"bomb",
		"explode",
		"rescue",
		"hit",
		"collect",
		"checkpoint",
		"win",
		"click",
		"fail",
	].forEach((name, i) => effect(ctx, sfx, buffer, name, 0.2 + i * 0.45));
	speak(ctx, sfx, 1.2, "rescue");
	speak(ctx, sfx, 4.1, "win");
	const rendered = await ctx.startRendering(),
		data = rendered.getChannelData(0);
	let sum = 0,
		peak = 0,
		finite = true;
	for (const x of data) {
		finite &&= Number.isFinite(x);
		peak = Math.max(peak, Math.abs(x));
		sum += x * x;
	}
	return {
		peak,
		rms: Math.sqrt(sum / data.length),
		finite,
		samples: data.length,
		seconds: rendered.duration,
		effects: 10,
		voices: 2,
		musicDefault: 0.1,
	};
}
