// Grit Bros — all sound is synthesized. No audio assets or network requests.
const midi = (n) => 440 * 2 ** ((n - 69) / 12);
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, Number(n) || 0));
const noiseBuffers = new WeakMap();

function noiseBuffer(ctx) {
	if (noiseBuffers.has(ctx)) return noiseBuffers.get(ctx);
	const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
	const d = buffer.getChannelData(0);
	let seed = 17321;
	for (let i = 0; i < d.length; i++) {
		seed = (1664525 * seed + 1013904223) >>> 0;
		d[i] = (seed / 4294967296) * 2 - 1;
	}
	noiseBuffers.set(ctx, buffer);
	return buffer;
}

function note(
	ctx,
	out,
	frequency,
	at,
	duration,
	amplitude = 0.15,
	type = "triangle",
	endFrequency = frequency,
	filterHz = 5500,
	track = null,
) {
	if (!Number.isFinite(frequency) || frequency <= 0) return;
	const osc = ctx.createOscillator();
	const gain = ctx.createGain();
	const filter = ctx.createBiquadFilter();
	osc.type = type;
	osc.frequency.setValueAtTime(Math.max(20, frequency), at);
	if (endFrequency !== frequency)
		osc.frequency.exponentialRampToValueAtTime(
			Math.max(20, endFrequency),
			at + duration * 0.8,
		);
	filter.type = "lowpass";
	filter.frequency.setValueAtTime(filterHz, at);
	filter.Q.value = 0.65;
	gain.gain.setValueAtTime(0.0001, at);
	gain.gain.linearRampToValueAtTime(
		amplitude,
		at + Math.min(0.008, duration * 0.1),
	);
	gain.gain.exponentialRampToValueAtTime(
		Math.max(0.0001, amplitude * 0.5),
		at + duration * 0.2,
	);
	gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
	osc.connect(filter).connect(gain).connect(out);
	osc.start(at);
	osc.stop(at + duration + 0.02);
	if (track) track.add(osc);
	osc.onended = () => {
		osc.disconnect();
		filter.disconnect();
		gain.disconnect();
		track?.delete(osc);
	};
}

function percussion(
	ctx,
	out,
	at,
	kind = "hat",
	amplitude = 0.12,
	track = null,
) {
	if (kind === "kick") {
		note(ctx, out, 150, at, 0.16, amplitude * 1.8, "sine", 42, 700, track);
		return;
	}
	const source = ctx.createBufferSource();
	source.buffer = noiseBuffer(ctx);
	const filter = ctx.createBiquadFilter();
	filter.type = kind === "snare" ? "bandpass" : "highpass";
	filter.frequency.value = kind === "snare" ? 1700 : 6500;
	filter.Q.value = kind === "snare" ? 0.65 : 0.6;
	const env = ctx.createGain();
	const duration = kind === "snare" ? 0.13 : 0.047;
	env.gain.setValueAtTime(amplitude, at);
	env.gain.exponentialRampToValueAtTime(0.0001, at + duration);
	source.connect(filter).connect(env).connect(out);
	source.start(at, (at * 0.137) % 0.7);
	source.stop(at + duration + 0.01);
	if (track) track.add(source);
	source.onended = () => {
		source.disconnect();
		filter.disconnect();
		env.disconnect();
		track?.delete(source);
	};
	if (kind === "snare")
		note(
			ctx,
			out,
			180,
			at,
			0.06,
			amplitude * 0.25,
			"triangle",
			90,
			1200,
			track,
		);
}

// Eight-bar original melody: short brass notes, walking bass, and swung hats.
const melody = [
	76, 0, 79, 81, 0, 79, 76, 0, 74, 76, 0, 72, 0, 0, 67, 0, 74, 0, 77, 79, 0, 77,
	74, 0, 72, 74, 0, 71, 0, 0, 67, 0, 72, 0, 76, 79, 0, 81, 79, 76, 74, 0, 72,
	71, 69, 0, 67, 0, 71, 0, 74, 77, 0, 76, 74, 0, 72, 0, 0, 79, 0, 0, 0, 0, 79,
	0, 84, 83, 0, 81, 79, 0, 76, 0, 79, 76, 74, 0, 72, 0, 77, 0, 81, 79, 0, 77,
	74, 0, 72, 0, 74, 71, 67, 0, 0, 0, 72, 76, 0, 79, 81, 0, 79, 0, 77, 76, 74,
	72, 71, 0, 67, 0, 72, 0, 76, 79, 0, 76, 74, 0, 72, 0, 0, 67, 72, 0, 0, 0,
];
const roots = [48, 50, 45, 43, 48, 53, 50, 43];
const bassWalk = [0, 7, 12, 9, 0, 4, 7, 11];
const EIGHTH = 60 / 142 / 2;

function musicStep(ctx, out, step, time, track = null) {
	const bar = Math.floor(step / 16) % 8;
	const sub = step % 16;
	const root = roots[bar];
	const n = melody[step % melody.length];
	if (n) {
		note(
			ctx,
			out,
			midi(n),
			time,
			EIGHTH * 0.73,
			0.19,
			"square",
			midi(n),
			2300,
			track,
		);
		note(
			ctx,
			out,
			midi(n - 12),
			time + 0.004,
			EIGHTH * 0.56,
			0.075,
			"triangle",
			midi(n - 12),
			3200,
			track,
		);
	}
	if (sub % 2 === 0) {
		const b = root + bassWalk[Math.floor(sub / 2)];
		note(
			ctx,
			out,
			midi(b - 12),
			time,
			EIGHTH * 1.2,
			0.34,
			"triangle",
			midi(b - 12) * 0.996,
			1100,
			track,
		);
	}
	if (sub % 4 === 2) {
		const third = bar === 1 || bar === 2 || bar === 6 ? 3 : 4;
		for (const interval of [0, third, 7])
			note(
				ctx,
				out,
				midi(root + 12 + interval),
				time,
				0.07,
				0.043,
				"sawtooth",
				midi(root + 12 + interval),
				1700,
				track,
			);
	}
	percussion(ctx, out, time, "hat", sub % 2 ? 0.055 : 0.075, track);
	if (sub % 4 === 0)
		percussion(ctx, out, time, sub % 8 === 0 ? "kick" : "snare", 0.14, track);
	if (sub === 15 && bar % 2 === 1)
		percussion(ctx, out, time, "snare", 0.06, track);
}

function syllables(ctx, out, at, mood = "hello", track = null) {
	const phrases = {
		hello: [0, 5, 9, 7, 12],
		clear: [0, 4, 7, 12, 9, 12],
		win: [0, 7, 12, 16, 12, 19],
		hurt: [7, 3, -3],
		lose: [7, 3, 0, -5],
		pow: [0, 0, 12, 7],
		kick: [0, 7, 4],
	};
	const phrase = phrases[mood] || phrases.hello;
	const vowels = [
		[730, 1090],
		[330, 2300],
		[280, 900],
		[570, 840],
		[450, 1850],
	];
	phrase.forEach((pitch, i) => {
		const t = at + i * 0.078;
		const dur = i === phrase.length - 1 ? 0.13 : 0.065;
		const osc = ctx.createOscillator();
		const env = ctx.createGain();
		osc.type = "sawtooth";
		const f = midi(58 + pitch);
		osc.frequency.setValueAtTime(f, t);
		osc.frequency.exponentialRampToValueAtTime(
			f * (i % 2 ? 0.92 : 1.08),
			t + dur,
		);
		env.gain.setValueAtTime(0.0001, t);
		env.gain.linearRampToValueAtTime(0.12, t + 0.009);
		env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
		const f1 = ctx.createBiquadFilter();
		const f2 = ctx.createBiquadFilter();
		f1.type = f2.type = "bandpass";
		[f1.frequency.value, f2.frequency.value] = vowels[i % vowels.length];
		f1.Q.value = 7;
		f2.Q.value = 10;
		osc.connect(f1).connect(env);
		osc.connect(f2).connect(env);
		env.connect(out);
		osc.start(t);
		osc.stop(t + dur + 0.01);
		if (track) track.add(osc);
		osc.onended = () => {
			osc.disconnect();
			f1.disconnect();
			f2.disconnect();
			env.disconnect();
			track?.delete(osc);
		};
	});
}

function effect(ctx, out, name, t, track = null) {
	const n = (
		f,
		offset,
		dur,
		vol = 0.25,
		type = "triangle",
		end = f,
		filter = 6000,
	) => note(ctx, out, f, t + offset, dur, vol, type, end, filter, track);
	switch (name) {
		case "jump":
			n(190, 0, 0.14, 0.23, "square", 650, 2400);
			break;
		case "bump":
			n(180, 0, 0.13, 0.4, "triangle", 72);
			n(570, 0.005, 0.07, 0.13, "square", 250, 1700);
			percussion(ctx, out, t, "snare", 0.12, track);
			break;
		case "kick":
			n(390, 0, 0.08, 0.24, "square", 120, 2500);
			n(80, 0.01, 0.18, 0.35, "triangle", 35);
			percussion(ctx, out, t, "snare", 0.2, track);
			break;
		case "coin":
			n(midi(83), 0, 0.07, 0.22, "sine");
			n(midi(95), 0.065, 0.24, 0.17, "sine");
			break;
		case "hurt":
			n(330, 0, 0.24, 0.28, "sawtooth", 75, 2000);
			n(250, 0.015, 0.2, 0.15, "square", 60, 1500);
			break;
		case "clear":
			[72, 76, 79, 84].forEach((p, i) =>
				n(
					midi(p),
					i * 0.085,
					i === 3 ? 0.45 : 0.12,
					0.23,
					"square",
					midi(p),
					3000,
				),
			);
			break;
		case "pow":
			n(135, 0, 0.54, 0.55, "sawtooth", 30, 700);
			percussion(ctx, out, t, "snare", 0.48, track);
			[43, 48, 55].forEach((p, i) =>
				n(midi(p), i * 0.025, 0.5, 0.2, "triangle", midi(p) * 0.5),
			);
			break;
		case "win":
			[72, 72, 76, 79, 84, 79, 84].forEach((p, i) => {
				n(
					midi(p),
					i * 0.13,
					i === 6 ? 0.8 : 0.17,
					0.22,
					"square",
					midi(p),
					3000,
				);
				n(midi(p - 12), i * 0.13, 0.2, 0.17, "triangle");
			});
			break;
		case "lose":
			[67, 64, 60, 55, 48].forEach((p, i) =>
				n(midi(p), i * 0.15, 0.3, 0.24, "triangle", midi(p) * 0.99),
			);
			break;
		case "select":
			n(650, 0, 0.05, 0.14, "square", 820, 3300);
			break;
		case "ready":
			[60, 67, 72].forEach((p, i) =>
				n(midi(p), i * 0.12, 0.12, 0.19, "square", midi(p), 2500),
			);
			break;
		case "freeze":
			[95, 91, 88, 84].forEach((p, i) =>
				n(midi(p), i * 0.04, 0.3, 0.1, "sine"),
			);
			break;
		case "boss":
			[36, 37, 43].forEach((p, i) =>
				n(midi(p), i * 0.12, 0.35, 0.3, "sawtooth", midi(p), 1400),
			);
			break;
		default:
			n(420, 0, 0.06, 0.12, "triangle", 500);
	}
}

export class AudioEngine {
	constructor() {
		this.ctx = null;
		this.musicVolume = 0.1;
		this.sfxVolume = 0.7;
		this.muted = false;
		this.mode = "title";
		this.musicActive = false;
		this.step = 0;
		this.nextNote = 0;
		this.events = {};
		this.activeMusic = new Set();
		this.activeEffects = new Set();
		this.lastVoice = -10;
		this.noteCount = 0;
	}

	async unlock() {
		const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
		if (!AC) return false;
		if (!this.ctx) {
			this.ctx = new AC({ latencyHint: "interactive" });
			this.master = this.ctx.createGain();
			this.music = this.ctx.createGain();
			this.sfx = this.ctx.createGain();
			this.compressor = this.ctx.createDynamicsCompressor();
			this.compressor.threshold.value = -14;
			this.compressor.knee.value = 14;
			this.compressor.ratio.value = 4;
			this.compressor.attack.value = 0.003;
			this.compressor.release.value = 0.15;
			this.analyser = this.ctx.createAnalyser();
			this.analyser.fftSize = 1024;
			this.meterData = new Float32Array(this.analyser.fftSize);
			this.music.connect(this.master);
			this.sfx.connect(this.master);
			this.master
				.connect(this.compressor)
				.connect(this.analyser)
				.connect(this.ctx.destination);
			this.master.gain.value = this.muted ? 0 : 0.72;
			this.music.gain.value = this.musicActive ? this.musicVolume : 0;
			this.sfx.gain.value = this.sfxVolume;
			this.nextNote = this.ctx.currentTime + 0.035;
		}
		if (this.ctx.state === "suspended") await this.ctx.resume();
		return this.ctx.state === "running";
	}

	update(_dt = 0, mode = this.mode) {
		this.mode = mode;
		const active = ![
			"title",
			"menu",
			"pause",
			"paused",
			"settings",
			"about",
			"credits",
			"gameover",
			"win",
			"victory",
		].includes(mode);
		if (active !== this.musicActive) {
			this.musicActive = active;
			if (this.ctx) {
				const t = this.ctx.currentTime;
				this.music.gain.cancelScheduledValues(t);
				this.music.gain.setTargetAtTime(
					active ? this.musicVolume : 0,
					t,
					0.035,
				);
				if (active) this.nextNote = t + 0.025;
				else {
					for (const source of this.activeMusic) {
						try {
							source.stop(t + 0.07);
						} catch {}
					}
				}
			}
		}
		if (!this.ctx || this.ctx.state !== "running" || !active || this.muted)
			return;
		const t = this.ctx.currentTime;
		if (this.nextNote < t - 0.1) this.nextNote = t + 0.015;
		let safety = 0;
		while (this.nextNote < t + 0.14 && safety++ < 8) {
			musicStep(
				this.ctx,
				this.music,
				this.step,
				this.nextNote,
				this.activeMusic,
			);
			// A 57:43 swing gives the boiler room a little shuffle.
			this.nextNote += EIGHTH * (this.step % 2 === 0 ? 1.14 : 0.86);
			this.step++;
			this.noteCount++;
		}
	}

	play(name) {
		this.events[name] = (this.events[name] || 0) + 1;
		if (!this.ctx || this.ctx.state !== "running" || this.muted) return;
		effect(
			this.ctx,
			this.sfx,
			name,
			this.ctx.currentTime + 0.005,
			this.activeEffects,
		);
	}

	speak(mood = "hello") {
		if (!this.ctx || this.ctx.state !== "running" || this.muted) return;
		if (this.ctx.currentTime - this.lastVoice < 0.7) return;
		this.lastVoice = this.ctx.currentTime;
		this.events.voice = (this.events.voice || 0) + 1;
		syllables(
			this.ctx,
			this.sfx,
			this.ctx.currentTime + 0.015,
			mood,
			this.activeEffects,
		);
	}

	setMusicVolume(value) {
		this.musicVolume = clamp(value, 0, 1);
		if (this.ctx)
			this.music.gain.setTargetAtTime(
				this.musicActive ? this.musicVolume : 0,
				this.ctx.currentTime,
				0.03,
			);
	}
	setSfxVolume(value) {
		this.sfxVolume = clamp(value, 0, 1);
		if (this.ctx)
			this.sfx.gain.setTargetAtTime(this.sfxVolume, this.ctx.currentTime, 0.03);
	}
	setMuted(value) {
		this.muted = Boolean(value);
		if (this.ctx)
			this.master.gain.setTargetAtTime(
				this.muted ? 0 : 0.72,
				this.ctx.currentTime,
				0.025,
			);
	}
	getDiagnostics() {
		let peak = 0,
			rms = 0;
		if (this.analyser) {
			this.analyser.getFloatTimeDomainData(this.meterData);
			for (const n of this.meterData) {
				rms += n * n;
				peak = Math.max(peak, Math.abs(n));
			}
			rms = Math.sqrt(rms / this.meterData.length);
		}
		return {
			state: this.ctx?.state || "locked",
			musicVolume: this.musicVolume,
			sfxVolume: this.sfxVolume,
			muted: this.muted,
			musicActive: this.musicActive,
			notes: this.noteCount,
			events: { ...this.events },
			peak,
			rms,
		};
	}

	async testOffline() {
		const Offline =
			globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
		if (!Offline)
			return { supported: false, reason: "OfflineAudioContext unavailable" };
		const ctx = new Offline(2, 48000 * 4, 48000);
		const music = ctx.createGain(),
			sfx = ctx.createGain(),
			master = ctx.createGain();
		music.gain.value = this.musicVolume;
		sfx.gain.value = this.sfxVolume;
		master.gain.value = 0.72;
		music.connect(master);
		sfx.connect(master);
		master.connect(ctx.destination);
		let at = 0.02;
		for (let i = 0; i < 16; i++) {
			musicStep(ctx, music, i, at);
			at += EIGHTH * (i % 2 === 0 ? 1.14 : 0.86);
		}
		effect(ctx, sfx, "jump", 0.06);
		effect(ctx, sfx, "bump", 0.32);
		effect(ctx, sfx, "kick", 0.6);
		effect(ctx, sfx, "coin", 0.9);
		syllables(ctx, sfx, 1.25, "clear");
		effect(ctx, sfx, "clear", 2.0);
		const buffer = await ctx.startRendering();
		let sum = 0,
			peak = 0,
			invalid = 0,
			nonzero = 0;
		for (let c = 0; c < buffer.numberOfChannels; c++) {
			for (const n of buffer.getChannelData(c)) {
				if (!Number.isFinite(n)) invalid++;
				sum += n * n;
				peak = Math.max(peak, Math.abs(n));
				if (Math.abs(n) > 0.0001) nonzero++;
			}
		}
		return {
			supported: true,
			frames: buffer.length,
			channels: buffer.numberOfChannels,
			sampleRate: buffer.sampleRate,
			duration: buffer.duration,
			rms: Math.sqrt(sum / (buffer.length * buffer.numberOfChannels)),
			peak,
			invalidSamples: invalid,
			nonzeroSamples: nonzero,
			musicVolume: this.musicVolume,
		};
	}

	async dispose() {
		if (this.ctx && this.ctx.state !== "closed") await this.ctx.close();
		this.ctx = null;
	}
}
