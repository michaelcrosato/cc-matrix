// Every sound is synthesized here. No samples, audio assets, or speech service.
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, Number(x) || 0));
const midi = (n) => 440 * 2 ** ((n - 69) / 12);
const RHYTHM = 60 / 112 / 4;

function tone(
	ctx,
	bus,
	when,
	frequency,
	duration,
	gain,
	type = "triangle",
	options = {},
) {
	const osc = ctx.createOscillator();
	const env = ctx.createGain();
	const filter = ctx.createBiquadFilter();
	osc.type = type;
	osc.frequency.setValueAtTime(Math.max(20, frequency), when);
	if (options.endFrequency)
		osc.frequency.exponentialRampToValueAtTime(
			Math.max(20, options.endFrequency),
			when + duration,
		);
	if (options.detune) osc.detune.value = options.detune;
	filter.type = "lowpass";
	filter.frequency.setValueAtTime(options.cutoff || 4500, when);
	if (options.endCutoff)
		filter.frequency.exponentialRampToValueAtTime(
			options.endCutoff,
			when + duration,
		);
	filter.Q.value = options.q || 0.4;
	env.gain.setValueAtTime(0, when);
	env.gain.linearRampToValueAtTime(
		gain,
		when + Math.min(0.008, duration * 0.08),
	);
	env.gain.exponentialRampToValueAtTime(0.0001, when + duration);
	osc.connect(filter).connect(env).connect(bus);
	osc.start(when);
	osc.stop(when + duration + 0.02);
	return osc;
}

function noiseBuffer(ctx) {
	const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
	const data = buffer.getChannelData(0);
	let seed = 0x3c4f918a;
	for (let i = 0; i < data.length; i++) {
		seed ^= seed << 13;
		seed ^= seed >>> 17;
		seed ^= seed << 5;
		data[i] = ((seed >>> 0) / 0xffffffff) * 2 - 1;
	}
	return buffer;
}

function hiss(
	ctx,
	bus,
	buffer,
	when,
	duration,
	gain,
	cutoff = 5000,
	band = false,
) {
	const source = ctx.createBufferSource();
	source.buffer = buffer;
	const filter = ctx.createBiquadFilter();
	filter.type = band ? "bandpass" : "highpass";
	filter.frequency.value = cutoff;
	filter.Q.value = band ? 0.7 : 0.3;
	const env = ctx.createGain();
	env.gain.setValueAtTime(0.0001, when);
	env.gain.linearRampToValueAtTime(gain, when + 0.005);
	env.gain.exponentialRampToValueAtTime(0.0001, when + duration);
	source.connect(filter).connect(env).connect(bus);
	source.start(when);
	source.stop(when + duration + 0.02);
}

function syllable(ctx, bus, when, pitch, vowel, duration = 0.09, gain = 0.09) {
	const formants = [
		[650, 1250],
		[400, 2050],
		[300, 2600],
		[520, 920],
		[350, 800],
	][vowel % 5];
	const osc = ctx.createOscillator();
	osc.type = "sawtooth";
	osc.frequency.setValueAtTime(pitch, when);
	osc.frequency.exponentialRampToValueAtTime(pitch * 0.78, when + duration);
	const env = ctx.createGain();
	env.gain.setValueAtTime(0, when);
	env.gain.linearRampToValueAtTime(gain, when + 0.014);
	env.gain.exponentialRampToValueAtTime(0.0001, when + duration);
	for (const f of formants) {
		const filter = ctx.createBiquadFilter();
		filter.type = "bandpass";
		filter.frequency.value = f;
		filter.Q.value = 6;
		osc.connect(filter).connect(env);
	}
	env.connect(bus);
	osc.start(when);
	osc.stop(when + duration + 0.01);
}

function musicStep(ctx, bus, buffer, step, time, event = "skate") {
	const i = step % 64;
	const roots = [45, 45, 48, 43];
	const root = roots[Math.floor(i / 16)];
	if (i % 4 === 0 || i % 16 === 14) {
		const n = root + (i % 16 === 14 ? 7 : 0);
		tone(ctx, bus, time, midi(n), RHYTHM * 3.2, 0.26, "triangle", {
			cutoff: 650,
		});
		tone(ctx, bus, time, midi(n - 12), RHYTHM * 2.7, 0.14, "sine");
	}
	if (i % 8 === 0 || i % 16 === 10) {
		tone(ctx, bus, time, 125, 0.18, 0.36, "sine", { endFrequency: 43 });
		hiss(ctx, bus, buffer, time, 0.028, 0.09, 1200);
	}
	if (i % 8 === 4) {
		hiss(ctx, bus, buffer, time, 0.14, 0.18, 1400, true);
		tone(ctx, bus, time, 175, 0.1, 0.1, "triangle", { endFrequency: 110 });
	}
	if (i % 2 === 0)
		hiss(ctx, bus, buffer, time, i % 8 === 6 ? 0.11 : 0.045, 0.055, 6500);
	if ([2, 6, 10, 14].includes(i % 16)) {
		[0, 3, 7, 10].forEach((offset, j) => {
			tone(
				ctx,
				bus,
				time + j * 0.008,
				midi(root + 24 + offset),
				0.22,
				0.08,
				"triangle",
				{ cutoff: 3100, endCutoff: 650 },
			);
		});
	}
	const melody = [
		12,
		null,
		15,
		null,
		19,
		17,
		15,
		null,
		12,
		null,
		10,
		null,
		7,
		null,
		10,
		12,
	];
	const note = melody[(i + Math.floor(i / 16) * 3) % melody.length];
	if (note !== null && i % 2 === 0) {
		const frequency = midi(root + 24 + note);
		tone(
			ctx,
			bus,
			time,
			frequency,
			RHYTHM * 2.3,
			0.12,
			event === "surf" ? "sine" : "triangle",
			{ cutoff: 3400 },
		);
		tone(ctx, bus, time + 0.17, frequency, RHYTHM * 2.2, 0.034, "triangle", {
			cutoff: 1700,
		});
		tone(ctx, bus, time + 0.32, frequency, RHYTHM * 1.4, 0.013, "sine");
	}
}

export class AudioSystem {
	constructor() {
		this.musicVolume = 0.1;
		this.effectsVolume = 0.55;
		this.context = null;
		this.unlocked = false;
		this.paused = false;
		this.step = 0;
		this.nextBeat = 0;
		this.event = "skate";
		this.eventsPlayed = 0;
		this.syllablesPlayed = 0;
		this.voicingUntil = 0;
	}
	async unlock() {
		if (!this.context) {
			const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
			if (!Context) return false;
			const ctx = (this.context = new Context());
			this.musicBus = ctx.createGain();
			this.musicBus.gain.value = this.musicVolume;
			this.effectsBus = ctx.createGain();
			this.effectsBus.gain.value = this.effectsVolume;
			this.master = ctx.createDynamicsCompressor();
			this.master.threshold.value = -7;
			this.master.knee.value = 8;
			this.master.ratio.value = 5;
			this.analyser = ctx.createAnalyser();
			this.analyser.fftSize = 512;
			this.musicBus.connect(this.master);
			this.effectsBus.connect(this.master);
			this.master.connect(this.analyser).connect(ctx.destination);
			this.noise = noiseBuffer(ctx);
			this.nextBeat = ctx.currentTime + 0.06;
		}
		this.unlocked = true;
		if (!this.paused && this.context.state !== "running")
			await this.context.resume().catch(() => {});
		return this.context.state === "running";
	}
	setMusic(volume) {
		this.musicVolume = clamp(volume);
		if (this.context)
			this.musicBus.gain.setTargetAtTime(
				this.musicVolume,
				this.context.currentTime,
				0.03,
			);
	}
	setEffects(volume) {
		this.effectsVolume = clamp(volume);
		if (this.context)
			this.effectsBus.gain.setTargetAtTime(
				this.effectsVolume,
				this.context.currentTime,
				0.03,
			);
	}
	update(dt, state = {}) {
		if (
			!this.unlocked ||
			this.paused ||
			!this.context ||
			this.context.state !== "running"
		)
			return;
		this.event = state.event || state.eventId || this.event;
		const ctx = this.context;
		if (this.nextBeat < ctx.currentTime - 0.3)
			this.nextBeat = ctx.currentTime + 0.03;
		let guard = 0;
		while (this.nextBeat < ctx.currentTime + 0.18 && guard++ < 8) {
			musicStep(
				ctx,
				this.musicBus,
				this.noise,
				this.step++,
				this.nextBeat,
				this.event,
			);
			this.nextBeat += RHYTHM;
		}
	}
	sfx(kind) {
		if (
			!this.context ||
			!this.unlocked ||
			this.paused ||
			this.context.state !== "running"
		)
			return;
		const ctx = this.context,
			bus = this.effectsBus,
			t = ctx.currentTime + 0.005;
		this.eventsPlayed++;
		if (kind === "jump") {
			tone(ctx, bus, t, 210, 0.15, 0.18, "triangle", { endFrequency: 620 });
			hiss(ctx, bus, this.noise, t, 0.12, 0.07, 3000);
		} else if (kind === "land") {
			tone(ctx, bus, t, 100, 0.14, 0.3, "sine", { endFrequency: 40 });
			hiss(ctx, bus, this.noise, t, 0.1, 0.14, 850, true);
		} else if (kind === "score") {
			[72, 76, 79].forEach((n, i) =>
				tone(ctx, bus, t + i * 0.055, midi(n), 0.22, 0.14, "triangle"),
			);
		} else if (kind === "bail") {
			hiss(ctx, bus, this.noise, t, 0.33, 0.28, 1200, true);
			tone(ctx, bus, t, 185, 0.38, 0.2, "sawtooth", {
				endFrequency: 52,
				cutoff: 1200,
			});
		} else if (kind === "count") {
			tone(ctx, bus, t, 660, 0.11, 0.16, "sine");
		} else if (kind === "finish") {
			[60, 64, 67, 72, 76, 79, 84].forEach((n, i) =>
				tone(ctx, bus, t + i * 0.11, midi(n), 0.55, 0.13, "triangle"),
			);
			hiss(ctx, bus, this.noise, t + 0.45, 0.55, 0.14, 4500);
		} else if (kind === "splash") {
			hiss(ctx, bus, this.noise, t, 0.48, 0.22, 1800, true);
			tone(ctx, bus, t, 150, 0.25, 0.06, "sine", { endFrequency: 45 });
		} else {
			tone(ctx, bus, t, 880, 0.065, 0.12, "sine", { endFrequency: 660 });
		}
	}
	voice(kind = "cheer") {
		if (
			!this.context ||
			!this.unlocked ||
			this.paused ||
			this.context.state !== "running"
		)
			return;
		const ctx = this.context;
		if (ctx.currentTime < this.voicingUntil) return;
		const pattern =
			kind === "bail"
				? [3, 4, 1, 0]
				: kind === "finish"
					? [0, 1, 4, 2, 0, 3, 1]
					: [1, 0, 2, 4, 0];
		const base = kind === "bail" ? 180 : 255;
		pattern.forEach((v, i) =>
			syllable(
				ctx,
				this.effectsBus,
				ctx.currentTime + 0.02 + i * 0.105,
				base * [1, 1.3, 1.12, 1.5, 1.2, 1.35, 1.65][i],
				v,
				0.09,
				0.065,
			),
		);
		this.syllablesPlayed += pattern.length;
		this.voicingUntil = ctx.currentTime + pattern.length * 0.105 + 0.15;
	}
	suspend() {
		this.paused = true;
		if (this.context && this.context.state === "running")
			this.context.suspend().catch(() => {});
	}
	resume() {
		this.paused = false;
		if (this.context && this.unlocked && this.context.state === "suspended")
			this.context.resume().catch(() => {});
	}
	getDiagnostics() {
		let rms = 0,
			peak = 0;
		if (this.analyser) {
			const samples = new Float32Array(this.analyser.fftSize);
			this.analyser.getFloatTimeDomainData(samples);
			for (const sample of samples) {
				rms += sample * sample;
				peak = Math.max(peak, Math.abs(sample));
			}
			rms = Math.sqrt(rms / samples.length);
		}
		return {
			unlocked: this.unlocked,
			state: this.context?.state || "locked",
			musicVolume: this.musicVolume,
			effectsVolume: this.effectsVolume,
			musicSteps: this.step,
			eventsPlayed: this.eventsPlayed,
			syllablesPlayed: this.syllablesPlayed,
			rms,
			peak,
			paused: this.paused,
		};
	}
	async testOffline() {
		const Offline =
			globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
		if (!Offline)
			return { supported: false, rms: 0, peak: 0, nonzeroFrames: 0 };
		const ctx = new Offline(1, 44100 * 3, 44100);
		const music = ctx.createGain();
		music.gain.value = 0.1;
		music.connect(ctx.destination);
		const effects = ctx.createGain();
		effects.gain.value = 0.55;
		effects.connect(ctx.destination);
		const buffer = noiseBuffer(ctx);
		for (let s = 0; s < 16; s++)
			musicStep(ctx, music, buffer, s, 0.03 + s * RHYTHM, "surf");
		tone(ctx, effects, 0.12, 210, 0.15, 0.18, "triangle", {
			endFrequency: 620,
		});
		hiss(ctx, effects, buffer, 0.65, 0.1, 0.14, 850, true);
		[72, 76, 79].forEach((n, i) =>
			tone(ctx, effects, 1 + i * 0.055, midi(n), 0.22, 0.14, "triangle"),
		);
		[1, 0, 2, 4, 0].forEach((v, i) =>
			syllable(
				ctx,
				effects,
				1.5 + i * 0.105,
				255 * [1, 1.3, 1.12, 1.5, 1.2][i],
				v,
				0.09,
				0.065,
			),
		);
		const rendered = await ctx.startRendering();
		const samples = rendered.getChannelData(0);
		let rms = 0,
			peak = 0,
			nonzeroFrames = 0;
		for (const sample of samples) {
			rms += sample * sample;
			peak = Math.max(peak, Math.abs(sample));
			if (Math.abs(sample) > 0.00001) nonzeroFrames++;
		}
		return {
			supported: true,
			rms: Math.sqrt(rms / samples.length),
			peak,
			nonzeroFrames,
			frames: samples.length,
			musicVolume: 0.1,
			effectsVolume: 0.55,
			duration: 3,
		};
	}
}

export default AudioSystem;
