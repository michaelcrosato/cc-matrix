/* Original, entirely synthesized jungle score, foley and tiny gibberish voices. */
const TAU = Math.PI * 2;
const clamp01 = (n) => Math.min(1, Math.max(0, Number(n) || 0));
const midi = (n) => 440 * 2 ** ((n - 69) / 12);

function seedNoise(length, sampleRate, context, seed = 13579) {
	const buffer = context.createBuffer(
		1,
		Math.ceil(length * sampleRate),
		sampleRate,
	);
	const data = buffer.getChannelData(0);
	let n = seed >>> 0;
	for (let i = 0; i < data.length; i++) {
		n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
		data[i] = (n / 4294967296) * 2 - 1;
	}
	return buffer;
}

function tone(
	ctx,
	out,
	{
		at,
		freq = 440,
		end = freq,
		duration = 0.24,
		gain = 0.15,
		type = "sine",
		attack = 0.004,
		cutoff = 4000,
		detune = 0,
	},
) {
	const osc = ctx.createOscillator();
	const amp = ctx.createGain();
	const filter = ctx.createBiquadFilter();
	osc.type = type;
	osc.frequency.setValueAtTime(Math.max(20, freq), at);
	osc.frequency.exponentialRampToValueAtTime(Math.max(20, end), at + duration);
	osc.detune.value = detune;
	filter.type = "lowpass";
	filter.frequency.value = cutoff;
	amp.gain.setValueAtTime(0, at);
	amp.gain.linearRampToValueAtTime(gain, at + attack);
	amp.gain.exponentialRampToValueAtTime(0.0001, at + duration);
	osc.connect(filter).connect(amp).connect(out);
	osc.start(at);
	osc.stop(at + duration + 0.025);
	osc.onended = () => {
		osc.disconnect();
		filter.disconnect();
		amp.disconnect();
	};
	return osc;
}

function marimba(ctx, out, note, at, velocity = 0.65, duration = 0.52) {
	const f = midi(note);
	tone(ctx, out, {
		at,
		freq: f,
		duration,
		gain: 0.24 * velocity,
		cutoff: f * 5,
	});
	tone(ctx, out, {
		at,
		freq: f * 4.01,
		duration: duration * 0.25,
		gain: 0.07 * velocity,
	});
	tone(ctx, out, {
		at,
		freq: f * 9.02,
		duration: 0.045,
		gain: 0.018 * velocity,
	});
}

function thump(ctx, out, at, velocity = 1) {
	tone(ctx, out, {
		at,
		freq: 155,
		end: 46,
		duration: 0.18,
		gain: 0.22 * velocity,
	});
	tone(ctx, out, {
		at,
		freq: 590,
		end: 230,
		duration: 0.032,
		gain: 0.022 * velocity,
		type: "triangle",
	});
}

function noise(
	ctx,
	out,
	buffer,
	at,
	duration,
	gain,
	freq = 1000,
	filterType = "bandpass",
) {
	const source = ctx.createBufferSource();
	const filter = ctx.createBiquadFilter();
	const amp = ctx.createGain();
	source.buffer = buffer;
	filter.type = filterType;
	filter.frequency.value = freq;
	filter.Q.value = 0.7;
	amp.gain.setValueAtTime(gain, at);
	amp.gain.exponentialRampToValueAtTime(0.0001, at + duration);
	source.connect(filter).connect(amp).connect(out);
	source.start(at);
	source.stop(at + duration + 0.015);
	source.onended = () => {
		source.disconnect();
		filter.disconnect();
		amp.disconnect();
	};
}

function syllable(ctx, out, at, pitch, vowel, gain = 0.1) {
	const osc = ctx.createOscillator();
	const f1 = ctx.createBiquadFilter();
	const f2 = ctx.createBiquadFilter();
	const amp = ctx.createGain();
	const vowelBands = [
		[750, 1200],
		[350, 2000],
		[500, 900],
		[300, 2500],
		[600, 1500],
	];
	const [first, second] = vowelBands[vowel % vowelBands.length];
	osc.type = "sawtooth";
	osc.frequency.setValueAtTime(pitch, at);
	osc.frequency.exponentialRampToValueAtTime(pitch * 1.22, at + 0.035);
	osc.frequency.exponentialRampToValueAtTime(pitch * 0.94, at + 0.115);
	f1.type = "bandpass";
	f1.frequency.value = first;
	f1.Q.value = 3.5;
	f2.type = "peaking";
	f2.frequency.value = second;
	f2.Q.value = 2;
	f2.gain.value = 10;
	amp.gain.setValueAtTime(0, at);
	amp.gain.linearRampToValueAtTime(gain, at + 0.012);
	amp.gain.setValueAtTime(gain * 0.75, at + 0.066);
	amp.gain.exponentialRampToValueAtTime(0.0001, at + 0.13);
	osc.connect(f1).connect(f2).connect(amp).connect(out);
	osc.start(at);
	osc.stop(at + 0.145);
	osc.onended = () => {
		osc.disconnect();
		f1.disconnect();
		f2.disconnect();
		amp.disconnect();
	};
}

export class JungleAudio {
	constructor() {
		this.context = null;
		this.musicVolume = 0.1;
		this.sfxVolume = 0.65;
		this.muted = false;
		this.ended = false;
		this.mode = "title";
		this.state = null;
		this.events = {};
		this.noteCount = 0;
		this.seed = 7923;
		this.nextBeat = 0;
		this.beat = 0;
		this.timer = null;
		this.lastEffects = {};
		this.voiceEnd = 0;
		this.lastPeak = 0;
		this.lastRms = 0;
		this._floatSamples = null;
	}

	random() {
		this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
		return this.seed / 4294967296;
	}

	async unlock() {
		const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
		if (!AC) return false;
		if (!this.context) {
			this.context = new AC({ latencyHint: "interactive" });
			const ctx = this.context;
			this.master = ctx.createGain();
			this.master.gain.value = 0.72;
			this.music = ctx.createGain();
			this.sfx = ctx.createGain();
			this.music.gain.value = this.musicVolume;
			this.sfx.gain.value = this.sfxVolume;
			this.compressor = ctx.createDynamicsCompressor();
			this.compressor.threshold.value = -14;
			this.compressor.knee.value = 12;
			this.compressor.ratio.value = 5;
			this.compressor.attack.value = 0.003;
			this.compressor.release.value = 0.15;
			this.analyser = ctx.createAnalyser();
			this.analyser.fftSize = 1024;
			this.music.connect(this.master);
			this.sfx.connect(this.master);
			this.master
				.connect(this.compressor)
				.connect(this.analyser)
				.connect(ctx.destination);
			// A short, quiet feedback echo gives wooden instruments an open clearing.
			this.echo = ctx.createDelay(0.6);
			this.echo.delayTime.value = 0.16;
			this.echoGain = ctx.createGain();
			this.echoGain.gain.value = 0.16;
			this.echoReturn = ctx.createGain();
			this.echoReturn.gain.value = 0.2;
			this.music.connect(this.echo);
			this.echo.connect(this.echoGain).connect(this.echo);
			this.echo.connect(this.echoReturn).connect(this.master);
			this.noiseBuffer = seedNoise(1, ctx.sampleRate, ctx);
			this._floatSamples = new Float32Array(this.analyser.fftSize);
			this.nextBeat = ctx.currentTime + 0.04;
		}
		this.ended = false;
		this.master.gain.setTargetAtTime(
			this.muted ? 0 : 0.72,
			this.context.currentTime,
			0.025,
		);
		try {
			await this.context.resume();
		} catch {
			return false;
		}
		if (!this.timer)
			this.timer = globalThis.setInterval(() => this.schedule(), 40);
		return this.context.state === "running";
	}

	setMusic(value) {
		this.musicVolume = clamp01(value);
		if (this.context)
			this.music.gain.setTargetAtTime(
				this.musicVolume * this.duck(),
				this.context.currentTime,
				0.05,
			);
	}

	setSfx(value) {
		this.sfxVolume = clamp01(value);
		if (this.context)
			this.sfx.gain.setTargetAtTime(
				this.sfxVolume,
				this.context.currentTime,
				0.03,
			);
	}

	setMuted(value) {
		this.muted = Boolean(value);
		if (this.context)
			this.master.gain.setTargetAtTime(
				this.muted || this.ended ? 0 : 0.72,
				this.context.currentTime,
				0.025,
			);
	}

	duck() {
		return /pause|settings|dev|about/.test(this.mode) ? 0.35 : 1;
	}

	update(state, dt) {
		this.state = state;
		const next = String(state?.mode ?? this.mode);
		if (next !== this.mode) {
			this.mode = next;
			if (this.context)
				this.music.gain.setTargetAtTime(
					this.musicVolume * this.duck(),
					this.context.currentTime,
					0.12,
				);
		}
		if (this.context && this.analyser && this.context.state === "running") {
			this.analyser.getFloatTimeDomainData(this._floatSamples);
			let peak = 0,
				energy = 0;
			for (const sample of this._floatSamples) {
				peak = Math.max(peak, Math.abs(sample));
				energy += sample * sample;
			}
			this.lastPeak = peak;
			this.lastRms = Math.sqrt(energy / this._floatSamples.length);
		}
	}

	schedule() {
		const ctx = this.context;
		if (!ctx || this.ended || ctx.state !== "running") return;
		if (this.nextBeat < ctx.currentTime - 0.5)
			this.nextBeat = ctx.currentTime + 0.025;
		// Eighth-note pulse at 108 bpm. Four-bar phrase, entirely original.
		const eighth = 60 / 108 / 2;
		const melody = [
			74,
			null,
			77,
			81,
			null,
			79,
			77,
			null,
			74,
			72,
			null,
			69,
			72,
			null,
			74,
			77,
			79,
			null,
			81,
			84,
			null,
			81,
			79,
			77,
			74,
			null,
			72,
			69,
			72,
			77,
			76,
			null,
		];
		while (this.nextBeat < ctx.currentTime + 0.12) {
			const at = this.nextBeat;
			const beat = this.beat % 32;
			const note = melody[beat];
			if (note !== null) {
				marimba(ctx, this.music, note, at, beat % 4 === 0 ? 0.75 : 0.48);
				this.noteCount++;
			}
			if (beat % 8 === 0) {
				const bass = beat < 16 ? 38 : 36;
				tone(ctx, this.music, {
					at,
					freq: midi(bass),
					duration: 0.72,
					gain: 0.2,
					type: "triangle",
					cutoff: 600,
				});
				tone(ctx, this.music, {
					at: at + eighth * 3,
					freq: midi(bass + 7),
					duration: 0.38,
					gain: 0.12,
					type: "triangle",
					cutoff: 700,
				});
			}
			if (beat % 4 === 0) thump(ctx, this.music, at, 0.65);
			if (beat % 4 === 2) {
				tone(ctx, this.music, {
					at,
					freq: 980,
					end: 720,
					duration: 0.052,
					gain: 0.07,
					type: "triangle",
				});
				noise(ctx, this.music, this.noiseBuffer, at, 0.055, 0.035, 1800);
			}
			if (beat % 2 === 1)
				noise(
					ctx,
					this.music,
					this.noiseBuffer,
					at,
					0.035,
					0.028,
					6500,
					"highpass",
				);
			if (beat === 3 || beat === 19) {
				const f = 1700 + this.random() * 800;
				for (let i = 0; i < 3; i++)
					tone(ctx, this.music, {
						at: at + i * 0.09,
						freq: f,
						end: f * 1.35,
						duration: 0.068,
						gain: 0.035,
						type: "sine",
					});
			}
			if (beat === 27) {
				tone(ctx, this.music, {
					at,
					freq: 460,
					end: 370,
					duration: 0.13,
					gain: 0.035,
					type: "sine",
				});
				tone(ctx, this.music, {
					at: at + 0.18,
					freq: 410,
					end: 310,
					duration: 0.14,
					gain: 0.025,
					type: "sine",
				});
			}
			this.beat++;
			this.nextBeat += eighth;
		}
	}

	effect(name) {
		this.events[name] = (this.events[name] || 0) + 1;
		const ctx = this.context;
		if (!ctx || this.ended || this.muted || ctx.state !== "running") return;
		const now = ctx.currentTime;
		if (
			now - (this.lastEffects[name] ?? -Infinity) <
			(name === "land" ? 0.12 : 0.035)
		)
			return;
		this.lastEffects[name] = now;
		const out = this.sfx;
		const notes = (sequence, spacing = 0.07, gain = 0.6) =>
			sequence.forEach((note, i) =>
				marimba(ctx, out, note, now + i * spacing, gain, 0.35),
			);
		switch (name) {
			case "jump":
				tone(ctx, out, {
					at: now,
					freq: 240,
					end: 650,
					duration: 0.15,
					gain: 0.12,
					type: "triangle",
					cutoff: 2200,
				});
				noise(ctx, out, this.noiseBuffer, now, 0.07, 0.025, 900);
				break;
			case "land":
				noise(ctx, out, this.noiseBuffer, now, 0.08, 0.14, 540, "lowpass");
				tone(ctx, out, {
					at: now,
					freq: 95,
					end: 44,
					duration: 0.065,
					gain: 0.12,
				});
				break;
			case "grab":
				notes([81, 88], 0.045, 0.5);
				break;
			case "release":
				tone(ctx, out, {
					at: now,
					freq: 470,
					end: 820,
					duration: 0.11,
					gain: 0.075,
					type: "sine",
				});
				break;
			case "coin":
				notes([86, 93], 0.055, 0.52);
				break;
			case "relic":
				notes([74, 77, 81, 86, 89], 0.065, 0.75);
				[74, 81, 86].forEach((n) =>
					tone(ctx, out, {
						at: now + 0.32,
						freq: midi(n),
						duration: 0.95,
						gain: 0.055,
					}),
				);
				this.speak("treasure");
				break;
			case "hurt":
				tone(ctx, out, {
					at: now,
					freq: 240,
					end: 80,
					duration: 0.24,
					gain: 0.16,
					type: "sawtooth",
					cutoff: 1000,
				});
				noise(ctx, out, this.noiseBuffer, now, 0.15, 0.12, 700);
				this.speak("ouch");
				break;
			case "checkpoint":
				notes([69, 74, 77, 81], 0.09, 0.6);
				this.speak("hello");
				break;
			case "win":
				notes([74, 77, 81, 86, 81, 86, 89, 93], 0.12, 0.75);
				[62, 69, 74, 77].forEach((n) =>
					tone(ctx, out, {
						at: now + 0.85,
						freq: midi(n),
						duration: 1.6,
						gain: 0.06,
						type: "triangle",
					}),
				);
				this.speak("happy");
				break;
			case "death":
				notes([74, 72, 69, 65, 62], 0.1, 0.55);
				break;
			case "menu":
				tone(ctx, out, {
					at: now,
					freq: 650,
					end: 800,
					duration: 0.042,
					gain: 0.06,
					type: "sine",
				});
				break;
			default:
				tone(ctx, out, {
					at: now,
					freq: 400,
					end: 500,
					duration: 0.06,
					gain: 0.05,
					type: "triangle",
				});
		}
	}

	speak(mood = "hello") {
		const ctx = this.context;
		if (!ctx || this.ended || this.muted || ctx.state !== "running") return;
		const at = Math.max(ctx.currentTime + 0.025, this.voiceEnd);
		if (at - ctx.currentTime > 0.4) return;
		const pitches =
			mood === "ouch"
				? [200, 165, 120]
				: mood === "happy"
					? [280, 350, 310, 420, 340]
					: mood === "treasure"
						? [270, 350, 390, 320]
						: [260, 310, 285];
		pitches.forEach((pitch, i) =>
			syllable(
				ctx,
				this.sfx,
				at + i * 0.09,
				pitch * (0.95 + this.random() * 0.1),
				Math.floor(this.random() * 5),
				0.1,
			),
		);
		this.voiceEnd = at + pitches.length * 0.09 + 0.1;
		this.events.voice = (this.events.voice || 0) + 1;
	}

	stop() {
		this.ended = true;
		if (this.timer) {
			globalThis.clearInterval(this.timer);
			this.timer = null;
		}
		if (this.context) {
			this.master.gain.cancelScheduledValues(this.context.currentTime);
			this.master.gain.setTargetAtTime(0, this.context.currentTime, 0.008);
		}
	}

	inspect() {
		return {
			initialized: Boolean(this.context),
			contextState: this.context?.state || "uninitialized",
			musicVolume: this.musicVolume,
			sfxVolume: this.sfxVolume,
			muted: this.muted,
			stopped: this.ended,
			scheduledMusicNotes: this.noteCount,
			events: { ...this.events },
			peak: Number(this.lastPeak.toFixed(5)),
			rms: Number(this.lastRms.toFixed(5)),
			mode: this.mode,
		};
	}
}

// Headless tests can verify the synthesis produces finite, audible, unclipped samples.
export async function createOfflineSample() {
	const OAC =
		globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
	if (!OAC)
		return { supported: false, reason: "OfflineAudioContext unavailable" };
	const ctx = new OAC(2, 44100 * 2, 44100);
	const mix = ctx.createGain();
	mix.gain.value = 0.4;
	mix.connect(ctx.destination);
	const buffer = seedNoise(1, ctx.sampleRate, ctx);
	[74, 77, 81, 86, 89].forEach((n, i) =>
		marimba(ctx, mix, n, 0.04 + i * 0.12, 0.7),
	);
	thump(ctx, mix, 0.1, 0.6);
	noise(ctx, mix, buffer, 0.45, 0.08, 0.08, 2000);
	[260, 350, 310, 390].forEach((p, i) =>
		syllable(ctx, mix, 1 + i * 0.1, p, i, 0.1),
	);
	const rendered = await ctx.startRendering();
	const data = rendered.getChannelData(0);
	let energy = 0,
		peak = 0,
		finite = true;
	for (const sample of data) {
		if (!Number.isFinite(sample)) finite = false;
		energy += sample * sample;
		peak = Math.max(peak, Math.abs(sample));
	}
	return {
		supported: true,
		finite,
		duration: rendered.duration,
		sampleRate: rendered.sampleRate,
		peak,
		rms: Math.sqrt(energy / data.length),
		channels: rendered.numberOfChannels,
	};
}
