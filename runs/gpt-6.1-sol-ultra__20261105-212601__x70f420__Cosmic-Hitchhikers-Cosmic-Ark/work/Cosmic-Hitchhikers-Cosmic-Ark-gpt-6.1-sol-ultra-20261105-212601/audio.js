/*
 * Cosmic Hitchhikers: all sound is synthesized here. No recorded samples.
 * Integration: create AudioEngine(), call unlock() from a user gesture, then
 * update(dt, phase, urgency) each frame. Volumes use 0..1; music defaults to .1.
 * sfx(name, variant) supports shoot/hit/explode/beam/rescue/dock/warning/warp/
 * menu/win/lose/shield. voice(seed) makes a short, deterministic gibberish call.
 * Beam and warning calls are throttled; diagnostics exposes RMS and event counts.
 * renderAudioTest() synthesizes nine seconds using OfflineAudioContext and checks
 * separate music/effect/voice RMS, finite samples, and absence of clipping.
 */
const clampAudio = (n, lo = 0, hi = 1) =>
	Math.max(lo, Math.min(hi, Number(n) || 0));
const audioMidi = (n) => 440 * 2 ** ((n - 69) / 12);

function audioRandom(seed) {
	let n = (Number(seed) || 17) >>> 0;
	return () => {
		n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
		return n / 4294967296;
	};
}

export class AudioEngine {
	constructor(options = {}) {
		this.context = options.context || null;
		this.musicVolume = 0.1;
		this.masterVolume = 0.72;
		this.muted = false;
		this.phase = "title";
		this.urgency = 0;
		this.step = 0;
		this.nextNote = 0;
		this.counts = { music: 0, effects: 0, voice: 0 };
		this.lastBeam = -99;
		this.lastWarning = -99;
		this.lastVoice = -99;
		this.offline = !!options.offline;
		this.initialized = false;
		this.failed = null;
		this.rms = 0;
		this.activeNodes = 0;
		if (this.context) this._connect();
	}

	_connect() {
		if (this.initialized || !this.context) return;
		const ctx = this.context;
		this.master = ctx.createGain();
		this.master.gain.value = this.muted ? 0 : this.masterVolume;
		this.music = ctx.createGain();
		this.music.gain.value = this.musicVolume;
		this.effects = ctx.createGain();
		this.effects.gain.value = 0.66;
		this.voices = ctx.createGain();
		this.voices.gain.value = 0.48;
		this.compressor = ctx.createDynamicsCompressor();
		this.compressor.threshold.value = -9;
		this.compressor.knee.value = 8;
		this.compressor.ratio.value = 5;
		this.compressor.attack.value = 0.003;
		this.compressor.release.value = 0.15;
		this.music.connect(this.master);
		this.effects.connect(this.master);
		this.voices.connect(this.master);
		this.master.connect(this.compressor);
		this.analyser = ctx.createAnalyser();
		this.analyser.fftSize = 512;
		this.compressor.connect(this.analyser);
		this.analyser.connect(ctx.destination);
		this.samples = new Float32Array(this.analyser.fftSize);

		// A small analog-style tape echo adds a sense of space without a sample file.
		this.echo = ctx.createDelay(1);
		this.echo.delayTime.value = 0.235;
		this.echoFeedback = ctx.createGain();
		this.echoFeedback.gain.value = 0.18;
		this.echoWet = ctx.createGain();
		this.echoWet.gain.value = 0.16;
		this.echoFilter = ctx.createBiquadFilter();
		this.echoFilter.type = "lowpass";
		this.echoFilter.frequency.value = 1900;
		this.music.connect(this.echo);
		this.echo.connect(this.echoFilter);
		this.echoFilter.connect(this.echoWet);
		this.echoWet.connect(this.master);
		this.echoFilter.connect(this.echoFeedback);
		this.echoFeedback.connect(this.echo);

		this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
		const data = this.noise.getChannelData(0);
		const random = audioRandom(1982);
		let smooth = 0;
		for (let i = 0; i < data.length; i++) {
			smooth = (smooth + (random() * 2 - 1) * 0.12) / 1.12;
			data[i] = smooth * 3.7;
		}
		this.initialized = true;
		this.nextNote = ctx.currentTime + 0.04;
	}

	async unlock() {
		try {
			if (!this.context) {
				const Context =
					globalThis.AudioContext || globalThis.webkitAudioContext;
				if (!Context) throw new Error("Web Audio is unavailable");
				this.context = new Context({ latencyHint: "interactive" });
				this._connect();
			}
			if (this.context.state === "suspended" && !this.offline)
				await this.context.resume();
			this.nextNote = Math.max(this.nextNote, this.context.currentTime + 0.025);
			return true;
		} catch (error) {
			this.failed = String(error.message || error);
			return false;
		}
	}

	_gain(param, value) {
		if (!param || !this.context) return;
		param.setTargetAtTime(value, this.context.currentTime, 0.035);
	}

	setMusicVolume(value) {
		this.musicVolume = clampAudio(value);
		this._gain(this.music?.gain, this.musicVolume);
	}

	setMasterVolume(value) {
		this.masterVolume = clampAudio(value);
		this._gain(this.master?.gain, this.muted ? 0 : this.masterVolume);
	}

	setMuted(value) {
		this.muted = !!value;
		this._gain(this.master?.gain, this.muted ? 0 : this.masterVolume);
	}

	_tone(
		destination,
		frequency,
		at,
		duration,
		level,
		type = "sine",
		endFrequency = frequency,
		filterFrequency = 0,
	) {
		const ctx = this.context;
		const source = ctx.createOscillator();
		const gain = ctx.createGain();
		const start = Math.max(0, at);
		const end = start + Math.max(0.025, duration);
		source.type = type;
		source.frequency.setValueAtTime(Math.max(20, frequency), start);
		source.frequency.exponentialRampToValueAtTime(
			Math.max(20, endFrequency),
			end,
		);
		gain.gain.setValueAtTime(0.0001, start);
		gain.gain.exponentialRampToValueAtTime(
			Math.max(0.0002, level),
			start + Math.min(0.012, duration * 0.12),
		);
		gain.gain.exponentialRampToValueAtTime(0.0001, end);
		let filter;
		if (filterFrequency) {
			filter = ctx.createBiquadFilter();
			filter.type = "lowpass";
			filter.frequency.value = filterFrequency;
			source.connect(filter);
			filter.connect(gain);
		} else source.connect(gain);
		gain.connect(destination);
		source.start(start);
		source.stop(end + 0.025);
		this.activeNodes++;
		source.onended = () => {
			source.disconnect();
			filter?.disconnect();
			gain.disconnect();
			this.activeNodes--;
		};
	}

	_noise(destination, at, duration, level, frequency = 900, type = "lowpass") {
		const ctx = this.context;
		const source = ctx.createBufferSource();
		const gain = ctx.createGain();
		const filter = ctx.createBiquadFilter();
		source.buffer = this.noise;
		filter.type = type;
		filter.frequency.setValueAtTime(frequency, at);
		filter.frequency.exponentialRampToValueAtTime(
			Math.max(40, frequency * 0.18),
			at + duration,
		);
		gain.gain.setValueAtTime(Math.max(0.0001, level), at);
		gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
		source.connect(filter);
		filter.connect(gain);
		gain.connect(destination);
		source.start(at);
		source.stop(at + duration);
		this.activeNodes++;
		source.onended = () => {
			source.disconnect();
			filter.disconnect();
			gain.disconnect();
			this.activeNodes--;
		};
	}

	_musicStep(at) {
		const defense = /defen|meteor|storm|escape|final/i.test(this.phase);
		const danger = this.urgency > 0.7;
		const scale = [0, 3, 7, 10, 14, 10, 7, 3];
		const progression = [45, 41, 48, 43];
		const bar = Math.floor(this.step / 16);
		const root = progression[bar % progression.length];
		const sixteenth = 60 / (defense ? 126 : 102) / 4;
		const note =
			root + 24 + scale[(this.step + (defense ? bar : 0)) % scale.length];
		if (this.step % 2 === 0 || defense) {
			this._tone(
				this.music,
				audioMidi(note),
				at,
				sixteenth * 2.2,
				defense ? 0.16 : 0.14,
				defense ? "triangle" : "sine",
			);
			this._tone(
				this.music,
				audioMidi(note + 12) * 1.003,
				at + 0.009,
				sixteenth * 1.6,
				0.025,
				"sine",
			);
		}
		if (this.step % 4 === 0) {
			this._tone(
				this.music,
				audioMidi(root + (this.step % 8 ? 7 : 0)),
				at,
				sixteenth * 3.4,
				0.2,
				"triangle",
				audioMidi(root),
				700,
			);
			this._tone(this.music, 100, at, 0.18, 0.25, "sine", 40);
		}
		if (this.step % 8 === 4)
			this._noise(this.music, at, 0.095, 0.12, 1900, "bandpass");
		if (this.step % 2 === 1 && defense)
			this._noise(this.music, at, 0.035, 0.045, 6500, "highpass");
		if (danger && this.step % 4 === 2)
			this._tone(
				this.music,
				audioMidi(81),
				at,
				0.09,
				0.06,
				"square",
				audioMidi(78),
				1800,
			);
		this.step++;
		this.counts.music++;
		return sixteenth;
	}

	update(dt, phase = "title", urgency = 0) {
		this.phase = String(phase);
		this.urgency = clampAudio(urgency);
		if (!this.initialized || this.context.state !== "running") return;
		const now = this.context.currentTime;
		if (this.nextNote < now - 0.5) this.nextNote = now + 0.025;
		let count = 0;
		while (this.nextNote < now + 0.18 && count++ < 8)
			this.nextNote += this._musicStep(this.nextNote);
		this.analyser.getFloatTimeDomainData(this.samples);
		let energy = 0;
		for (const v of this.samples) energy += v * v;
		this.rms = Math.sqrt(energy / this.samples.length);
	}

	sfx(name, variant = 0) {
		if (!this.initialized || this.context.state !== "running") return;
		const at = this.context.currentTime + 0.004;
		if (name === "beam") {
			if (at - this.lastBeam < 0.19) return;
			this.lastBeam = at;
		}
		if (name === "warning") {
			if (at - this.lastWarning < 0.8) return;
			this.lastWarning = at;
		}
		this._effect(name, variant, at);
	}

	_effect(name, variant, at) {
		const fx = this.effects;
		const pitch = 1 + clampAudio(variant, -2, 6) * 0.035;
		const tone = (f, t, d, l, shape, end = f, filter = 0) =>
			this._tone(fx, f * pitch, at + t, d, l, shape, end * pitch, filter);
		const noise = (t, d, l, f, type) => this._noise(fx, at + t, d, l, f, type);
		switch (name) {
			case "shoot":
				tone(1500, 0, 0.095, 0.19, "sawtooth", 150, 2800);
				tone(90, 0, 0.055, 0.13, "sine", 45);
				break;
			case "hit":
				noise(0, 0.3, 0.4, 1200);
				tone(160, 0, 0.25, 0.28, "sawtooth", 36, 900);
				break;
			case "explode":
				noise(0, 0.3, 0.32, 2700);
				tone(115, 0, 0.25, 0.2, "triangle", 32);
				tone(900, 0.018, 0.11, 0.07, "square", 120, 1800);
				break;
			case "beam":
				tone(240, 0, 0.24, 0.105, "triangle", 720);
				tone(365, 0.035, 0.2, 0.055, "sine", 1080);
				break;
			case "rescue":
				[72, 79, 84, 88].forEach((n, i) =>
					tone(audioMidi(n), i * 0.07, 0.25, 0.14, "sine"),
				);
				break;
			case "dock":
				[57, 64, 69, 76].forEach((n, i) =>
					tone(audioMidi(n), i * 0.075, 0.35, 0.13, "triangle"),
				);
				tone(75, 0, 0.24, 0.13, "sine", 50);
				break;
			case "warning":
				tone(480, 0, 0.16, 0.12, "square", 580, 1700);
				tone(480, 0.24, 0.16, 0.12, "square", 580, 1700);
				break;
			case "warp":
				noise(0, 1.1, 0.25, 4600, "bandpass");
				tone(90, 0, 1.0, 0.18, "sawtooth", 1900, 1400);
				tone(135, 0.05, 1.1, 0.12, "triangle", 2850);
				break;
			case "menu":
				tone(660, 0, 0.07, 0.1, "sine", 880);
				break;
			case "win":
				[60, 64, 67, 72, 76, 79, 84].forEach((n, i) =>
					tone(audioMidi(n), i * 0.1, 0.55, 0.14, "triangle"),
				);
				[60, 64, 67, 72].forEach((n) =>
					tone(audioMidi(n), 0.85, 1.0, 0.055, "sine"),
				);
				break;
			case "lose":
				[60, 55, 51, 45].forEach((n, i) =>
					tone(audioMidi(n), i * 0.2, 0.4, 0.16, "triangle"),
				);
				break;
			case "shield":
				tone(180, 0, 0.55, 0.17, "sine", 1100);
				tone(270, 0.03, 0.55, 0.11, "triangle", 1650);
				noise(0, 0.3, 0.07, 3000, "highpass");
				break;
			default:
				tone(800, 0, 0.08, 0.08, "sine", 600);
		}
		this.counts.effects++;
	}

	voice(seed = 0) {
		if (!this.initialized || this.context.state !== "running") return;
		const at = this.context.currentTime + 0.015;
		if (at - this.lastVoice < 0.5) return;
		this.lastVoice = at;
		this._voice(seed, at);
	}

	_voice(seed, at) {
		const random = audioRandom(seed + 2929);
		const formants = [
			[650, 1150],
			[400, 2100],
			[300, 850],
			[850, 1650],
			[450, 1450],
		];
		const syllables = 4 + Math.floor(random() * 4);
		let offset = 0;
		for (let i = 0; i < syllables; i++) {
			const ctx = this.context;
			const start = at + offset;
			const duration = 0.055 + random() * 0.055;
			const pitch = 240 + random() * 220 + Math.sin(i * 1.8) * 50;
			const source = ctx.createOscillator();
			const envelope = ctx.createGain();
			const a = ctx.createBiquadFilter();
			const b = ctx.createBiquadFilter();
			const vowel = formants[Math.floor(random() * formants.length)];
			a.type = b.type = "bandpass";
			a.frequency.value = vowel[0];
			b.frequency.value = vowel[1];
			a.Q.value = 5;
			b.Q.value = 4;
			source.type = "sawtooth";
			source.frequency.setValueAtTime(pitch, start);
			source.frequency.linearRampToValueAtTime(
				pitch * (0.86 + random() * 0.4),
				start + duration,
			);
			envelope.gain.setValueAtTime(0.0001, start);
			envelope.gain.exponentialRampToValueAtTime(0.25, start + 0.012);
			envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
			source.connect(a);
			source.connect(b);
			a.connect(envelope);
			b.connect(envelope);
			envelope.connect(this.voices);
			source.start(start);
			source.stop(start + duration + 0.005);
			this.activeNodes++;
			source.onended = () => {
				source.disconnect();
				a.disconnect();
				b.disconnect();
				envelope.disconnect();
				this.activeNodes--;
			};
			offset += duration + 0.018 + random() * 0.025;
		}
		this.counts.voice++;
	}

	get diagnostics() {
		return {
			state: this.context?.state || "locked",
			sampleRate: this.context?.sampleRate || null,
			musicVolume: this.musicVolume,
			masterVolume: this.masterVolume,
			muted: this.muted,
			phase: this.phase,
			rms: this.rms,
			activeNodes: this.activeNodes,
			counts: { ...this.counts },
			error: this.failed,
		};
	}
}

export async function renderAudioTest() {
	const OfflineContext =
		globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
	if (!OfflineContext)
		return { passed: false, error: "OfflineAudioContext unavailable" };
	const context = new OfflineContext(1, 44100 * 9, 44100);
	const engine = new AudioEngine({ context, offline: true });
	engine.phase = "rescue";
	let at = 0.05;
	while (at < 2) at += engine._musicStep(at);
	engine.phase = "defense";
	while (at < 3) at += engine._musicStep(at);
	const effects = [
		"shoot",
		"hit",
		"explode",
		"beam",
		"rescue",
		"dock",
		"warning",
		"warp",
		"menu",
		"win",
		"lose",
		"shield",
	];
	effects.forEach((name, i) => engine._effect(name, i % 3, 3.1 + i * 0.31));
	engine._voice(0, 7.1);
	engine._voice(3, 8.0);
	const buffer = await context.startRendering();
	const pcm = buffer.getChannelData(0);
	const measure = (start, end) => {
		let sum = 0,
			peak = 0,
			finite = true;
		const lo = Math.floor(start * buffer.sampleRate),
			hi = Math.floor(end * buffer.sampleRate);
		for (let i = lo; i < hi; i++) {
			const value = pcm[i];
			finite &&= Number.isFinite(value);
			sum += value * value;
			peak = Math.max(peak, Math.abs(value));
		}
		return { rms: Math.sqrt(sum / (hi - lo)), peak, finite };
	};
	const music = measure(0, 3);
	const sfx = measure(3.1, 7);
	const voice = measure(7.8, 9);
	const all = measure(0, 9);
	return {
		passed:
			all.finite &&
			all.peak < 1 &&
			music.rms > 0.0001 &&
			sfx.rms > 0.001 &&
			voice.rms > 0.0005,
		duration: buffer.duration,
		sampleRate: buffer.sampleRate,
		musicDefault: engine.musicVolume,
		generated: { ...engine.counts },
		music,
		effects: sfx,
		voice,
		all,
	};
}
