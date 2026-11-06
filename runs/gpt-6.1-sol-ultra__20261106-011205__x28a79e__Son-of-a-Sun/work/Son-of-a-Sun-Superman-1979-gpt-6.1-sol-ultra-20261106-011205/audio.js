// Every sound is synthesized here. No recording, sample, or network asset is used.
const TAU = Math.PI * 2;
const midi = (n) => 440 * 2 ** ((n - 69) / 12);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, Number(v) || 0));

function noiseBuffer(ctx, seconds = 2) {
	const b = ctx.createBuffer(
		1,
		Math.ceil(ctx.sampleRate * seconds),
		ctx.sampleRate,
	);
	const data = b.getChannelData(0);
	let seed = 27917;
	let pink = 0;
	for (let i = 0; i < data.length; i++) {
		seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
		const white = seed / 2147483648 - 1;
		pink = pink * 0.96 + white * 0.04;
		data[i] = white * 0.55 + pink * 2.2;
	}
	return b;
}

function tone(
	ctx,
	dest,
	freq,
	time,
	duration,
	level = 0.12,
	type = "triangle",
	endFreq = freq,
) {
	const osc = ctx.createOscillator();
	const gain = ctx.createGain();
	osc.type = type;
	osc.frequency.setValueAtTime(Math.max(15, freq), time);
	if (endFreq !== freq)
		osc.frequency.exponentialRampToValueAtTime(
			Math.max(15, endFreq),
			time + duration,
		);
	gain.gain.setValueAtTime(0.0001, time);
	gain.gain.exponentialRampToValueAtTime(
		Math.max(0.0002, level),
		time + Math.min(0.018, duration * 0.15),
	);
	gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
	osc.connect(gain).connect(dest);
	osc.start(time);
	osc.stop(time + duration + 0.025);
}

function brass(ctx, dest, note, time, duration, level = 0.1) {
	const filter = ctx.createBiquadFilter();
	const env = ctx.createGain();
	filter.type = "lowpass";
	filter.Q.value = 0.8;
	filter.frequency.setValueAtTime(700, time);
	filter.frequency.exponentialRampToValueAtTime(3300, time + 0.06);
	filter.frequency.exponentialRampToValueAtTime(900, time + duration);
	env.gain.setValueAtTime(0.0001, time);
	env.gain.linearRampToValueAtTime(level, time + 0.025);
	env.gain.linearRampToValueAtTime(
		level * 0.65,
		time + Math.min(0.12, duration * 0.6),
	);
	env.gain.exponentialRampToValueAtTime(0.0001, time + duration);
	filter.connect(env).connect(dest);
	for (const cents of [-5, 5]) {
		const osc = ctx.createOscillator();
		osc.type = "sawtooth";
		osc.frequency.value = midi(note);
		osc.detune.value = cents;
		osc.connect(filter);
		osc.start(time);
		osc.stop(time + duration + 0.025);
	}
}

function hiss(
	ctx,
	dest,
	buffer,
	time,
	duration,
	level,
	frequency = 2500,
	kind = "highpass",
) {
	const source = ctx.createBufferSource();
	const gain = ctx.createGain();
	const filter = ctx.createBiquadFilter();
	source.buffer = buffer;
	filter.type = kind;
	filter.frequency.value = frequency;
	filter.Q.value = 0.5;
	gain.gain.setValueAtTime(0.0001, time);
	gain.gain.linearRampToValueAtTime(level, time + 0.008);
	gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
	source.connect(filter).connect(gain).connect(dest);
	source.start(time);
	source.stop(time + duration + 0.02);
}

// An original eight-bar fanfare, with a quieter answering phrase.
const FANFARE = [
	67,
	null,
	67,
	72,
	74,
	null,
	76,
	null,
	79,
	null,
	76,
	74,
	72,
	null,
	67,
	null,
	69,
	null,
	72,
	76,
	77,
	null,
	76,
	72,
	74,
	null,
	null,
	71,
	67,
	null,
	null,
	null,
	64,
	null,
	67,
	72,
	76,
	null,
	74,
	null,
	72,
	null,
	67,
	64,
	65,
	null,
	69,
	null,
	67,
	72,
	76,
	79,
	81,
	null,
	79,
	76,
	74,
	null,
	71,
	null,
	72,
	null,
	null,
	null,
];
const ROOTS = [48, 48, 45, 43, 48, 41, 48, 43];

export class AudioSystem {
	constructor() {
		this.ctx = null;
		this.musicVolume = 0.1;
		this.sfxVolume = 0.65;
		this.notesPlayed = 0;
		this.effectsPlayed = 0;
		this.voicesPlayed = 0;
		this.step = 0;
		this.nextNote = 0;
		this.danger = false;
		this.playing = true;
		this.disposed = false;
	}

	_setup(ctx) {
		this.ctx = ctx;
		this.master = ctx.createGain();
		this.master.gain.value = 0.64;
		this.limiter = ctx.createDynamicsCompressor();
		this.limiter.threshold.value = -7;
		this.limiter.knee.value = 6;
		this.limiter.ratio.value = 12;
		this.limiter.attack.value = 0.003;
		this.limiter.release.value = 0.18;
		this.master.connect(this.limiter).connect(ctx.destination);
		this.music = ctx.createGain();
		this.effects = ctx.createGain();
		this.music.gain.value = this.musicVolume;
		this.effects.gain.value = this.sfxVolume;
		this.music.connect(this.master);
		this.effects.connect(this.master);
		this.noise = noiseBuffer(ctx);
		// A short coded echo gives the score the spaciousness of a film orchestra.
		this.echo = ctx.createDelay(1);
		this.echo.delayTime.value = 0.19;
		this.echoGain = ctx.createGain();
		this.echoGain.gain.value = 0.15;
		this.music.connect(this.echo).connect(this.echoGain).connect(this.master);
		this.wind = ctx.createBufferSource();
		this.wind.buffer = this.noise;
		this.wind.loop = true;
		this.windFilter = ctx.createBiquadFilter();
		this.windFilter.type = "lowpass";
		this.windFilter.frequency.value = 600;
		this.windGain = ctx.createGain();
		this.windGain.gain.value = 0;
		this.wind
			.connect(this.windFilter)
			.connect(this.windGain)
			.connect(this.effects);
		this.wind.start();
		this.nextNote = ctx.currentTime + 0.08;
		return this;
	}

	async start() {
		if (this.disposed) return false;
		if (!this.ctx) {
			const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext;
			if (!Ctx) return false;
			this._setup(new Ctx());
		}
		if (this.ctx.state === "suspended") await this.ctx.resume();
		return this.ctx.state === "running";
	}

	_musicStep(time) {
		const ctx = this.ctx;
		const i = this.step % 64;
		const bar = Math.floor(i / 8);
		const sub = i % 8;
		const root = ROOTS[bar] - (this.danger && bar % 2 ? 1 : 0);
		let melody = FANFARE[i];
		if (melody !== null && this.danger && [64, 76].includes(melody)) melody--;
		if (melody !== null) {
			brass(ctx, this.music, melody, time, sub === 4 ? 0.46 : 0.26, 0.11);
			this.notesPlayed++;
		}
		if (sub % 2 === 0) {
			tone(ctx, this.music, midi(root - 12), time, 0.24, 0.2, "triangle");
			this.notesPlayed++;
		}
		// Pizzicato movement under the broad horn line.
		const arp = [0, 7, 12, 16, 7, 12, 16, 19][sub];
		tone(
			ctx,
			this.music,
			midi(root + arp),
			time + 0.015,
			0.18,
			0.065,
			"triangle",
		);
		this.notesPlayed++;
		if (sub === 0 || sub === 4) {
			tone(ctx, this.music, 96, time, 0.19, 0.23, "sine", 43);
			hiss(ctx, this.music, this.noise, time, 0.1, 0.09, 1400, "lowpass");
		}
		if (sub === 2 || sub === 6)
			hiss(ctx, this.music, this.noise, time, 0.12, 0.14, 1900);
		if (sub % 2) hiss(ctx, this.music, this.noise, time, 0.045, 0.045, 7000);
		if (i === 0) hiss(ctx, this.music, this.noise, time, 0.9, 0.12, 4500);
		this.step++;
	}

	update(dt, { speed = 0, danger = false, playing = true } = {}) {
		if (!this.ctx || this.ctx.state !== "running" || this.disposed) return;
		this.danger = danger;
		this.playing = playing;
		const now = this.ctx.currentTime;
		this.windGain.gain.setTargetAtTime(
			playing ? clamp(speed / 55, 0, 1) * 0.15 : 0,
			now,
			0.16,
		);
		this.windFilter.frequency.setTargetAtTime(
			400 + clamp(speed, 0, 100) * 32,
			now,
			0.15,
		);
		if (this.nextNote < now - 0.3) this.nextNote = now + 0.025;
		let guard = 0;
		while (this.nextNote < now + 0.28 && guard++ < 8) {
			this._musicStep(this.nextNote);
			this.nextNote += 60 / (danger ? 116 : 104) / 2;
		}
	}

	_sfxAt(name, t) {
		const c = this.ctx;
		const d = this.effects;
		switch (name) {
			case "fly":
				hiss(c, d, this.noise, t, 0.38, 0.25, 1100, "bandpass");
				tone(c, d, 180, t, 0.25, 0.1, "triangle", 500);
				break;
			case "boost":
				hiss(c, d, this.noise, t, 0.68, 0.34, 1100, "lowpass");
				tone(c, d, 90, t, 0.42, 0.22, "sawtooth", 420);
				tone(c, d, 240, t + 0.08, 0.38, 0.09, "sine", 1100);
				break;
			case "rescue":
				[72, 76, 79, 84].forEach((n, i) =>
					tone(c, d, midi(n), t + i * 0.075, 0.34, 0.16, "sine"),
				);
				break;
			case "freeze":
				hiss(c, d, this.noise, t, 0.38, 0.31, 3800);
				[1400, 1900, 2700].forEach((f, i) =>
					tone(c, d, f, t + i * 0.06, 0.15, 0.045, "sine", f * 0.7),
				);
				break;
			case "hit":
				tone(c, d, 130, t, 0.2, 0.39, "sine", 28);
				hiss(c, d, this.noise, t, 0.15, 0.33, 700, "lowpass");
				break;
			case "danger":
				[0, 0.23].forEach((delay) =>
					tone(c, d, 520, t + delay, 0.2, 0.16, "triangle", 390),
				);
				break;
			case "success":
				[60, 64, 67, 72, 76, 79, 84].forEach((n, i) =>
					brass(c, d, n, t + i * 0.1, i === 6 ? 1.2 : 0.32, 0.1),
				);
				hiss(c, d, this.noise, t + 0.6, 0.9, 0.18, 4300);
				break;
			case "click":
				tone(c, d, 640, t, 0.065, 0.16, "sine", 960);
				break;
			case "failure":
				[67, 63, 60, 55].forEach((n, i) =>
					brass(c, d, n, t + i * 0.19, 0.52, 0.1),
				);
				break;
			default:
				return false;
		}
		this.effectsPlayed++;
		return true;
	}

	sfx(name) {
		if (!this.ctx || this.ctx.state !== "running" || this.disposed)
			return false;
		return this._sfxAt(name, this.ctx.currentTime + 0.005);
	}

	_voiceAt(seed, time) {
		let state = (Number(seed) || 1) >>> 0;
		const random = () =>
			(state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296;
		const count = 5 + Math.floor(random() * 4);
		const base = 135 + random() * 95;
		for (let i = 0; i < count; i++) {
			const at = time + i * 0.09;
			const length = 0.055 + random() * 0.025;
			const fundamental =
				base * (0.85 + random() * 0.6) * (i === count - 1 ? 0.85 : 1);
			const osc = this.ctx.createOscillator();
			const formant = this.ctx.createBiquadFilter();
			const gain = this.ctx.createGain();
			osc.type = "sawtooth";
			osc.frequency.setValueAtTime(fundamental, at);
			osc.frequency.linearRampToValueAtTime(fundamental * 1.13, at + length);
			formant.type = "bandpass";
			formant.frequency.value = [680, 1050, 1700, 2300][
				Math.floor(random() * 4)
			];
			formant.Q.value = 4;
			gain.gain.setValueAtTime(0.0001, at);
			gain.gain.linearRampToValueAtTime(0.25, at + 0.009);
			gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
			osc.connect(formant).connect(gain).connect(this.effects);
			osc.start(at);
			osc.stop(at + length + 0.01);
		}
		this.voicesPlayed++;
	}

	voice(seed = 1) {
		if (!this.ctx || this.ctx.state !== "running" || this.disposed)
			return false;
		this._voiceAt(seed, this.ctx.currentTime + 0.01);
		return true;
	}

	setMusicVolume(v) {
		this.musicVolume = clamp(v, 0, 1);
		if (this.music && this.ctx)
			this.music.gain.setTargetAtTime(
				this.musicVolume,
				this.ctx.currentTime,
				0.03,
			);
	}

	setSfxVolume(v) {
		this.sfxVolume = clamp(v, 0, 1);
		if (this.effects && this.ctx)
			this.effects.gain.setTargetAtTime(
				this.sfxVolume,
				this.ctx.currentTime,
				0.03,
			);
	}

	async suspend() {
		if (this.ctx?.state === "running") await this.ctx.suspend();
	}

	async resume() {
		if (this.ctx?.state === "suspended") await this.ctx.resume();
	}

	async dispose() {
		this.disposed = true;
		if (this.ctx && this.ctx.state !== "closed") await this.ctx.close();
	}

	stats() {
		return {
			musicVolume: this.musicVolume,
			sfxVolume: this.sfxVolume,
			running: this.ctx?.state === "running",
			state: this.ctx?.state || "not-started",
			notesPlayed: this.notesPlayed,
			effectsPlayed: this.effectsPlayed,
			voicesPlayed: this.voicesPlayed,
		};
	}
}

export async function offlineTest() {
	const Ctx =
		globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
	if (!Ctx) return { passed: false, reason: "OfflineAudioContext unavailable" };
	const ctx = new Ctx(2, 44100 * 8, 44100);
	const synth = new AudioSystem()._setup(ctx);
	for (let i = 0; i < 26; i++) synth._musicStep(0.05 + (i * 60) / 104 / 2);
	const names = [
		"fly",
		"boost",
		"rescue",
		"freeze",
		"hit",
		"danger",
		"success",
		"click",
		"failure",
	];
	names.forEach((name, i) => synth._sfxAt(name, 0.1 + i * 0.7));
	synth._voiceAt(1979, 2.35);
	const rendered = await ctx.startRendering();
	let peak = 0;
	let sum = 0;
	let finite = true;
	for (let ch = 0; ch < rendered.numberOfChannels; ch++) {
		const data = rendered.getChannelData(ch);
		for (let i = 0; i < data.length; i++) {
			finite &&= Number.isFinite(data[i]);
			peak = Math.max(peak, Math.abs(data[i]));
			sum += data[i] * data[i];
		}
	}
	const rms = Math.sqrt(sum / (rendered.length * rendered.numberOfChannels));
	return {
		passed: finite && peak > 0.01 && peak < 0.98 && rms > 0.001,
		peak,
		rms,
		finite,
		duration: rendered.duration,
		effects: names.length,
		voices: 1,
		notes: synth.notesPlayed,
		musicVolume: synth.musicVolume,
	};
}
