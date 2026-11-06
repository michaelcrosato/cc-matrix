/* All sound is synthesized in code. No samples, network, or prerecorded speech. */
const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, Number(v) || 0));
const hz = (n) => 440 * 2 ** ((n - 69) / 12);
const motifs = [
	[74, 78, 81, 78, 76, 74, 71, 69, 74, 78, 81, 85, 83, 81, 78, 76],
	[74, 78, 81, 86, 85, 81, 78, 76, 71, 74, 78, 81, 79, 78, 76, 74],
	[71, 74, 78, 81, 83, 81, 78, 74, 69, 73, 76, 81, 79, 76, 73, 69],
	[74, 78, 81, 78, 83, 81, 78, 76, 74, 71, 69, 73, 74, 78, 81, 86],
];
const effects = new Set([
	"jump",
	"land",
	"coin",
	"rescue",
	"checkpoint",
	"hurt",
	"balloon",
	"splash",
	"win",
	"ui",
]);

export class AudioDirector {
	constructor(options = {}) {
		this.ctx = options.context || null;
		this.musicVolume = 0.1;
		this.sfxVolume = 0.7;
		this.muted = false;
		this.mode = "title";
		this.zone = "grove";
		this.ready = false;
		this.nextBeat = 0;
		this.beat = 0;
		this.musicEvents = 0;
		this.effectEvents = 0;
		this.voiceEvents = 0;
		this.lastSfx = new Map();
		this.nodes = new Set();
		this.disposed = false;
		this._noiseBuffer = null;
		this._offline = options.offline || false;
	}

	async unlock() {
		if (this.disposed) return false;
		try {
			if (!this.ctx) {
				const Context =
					globalThis.AudioContext || globalThis.webkitAudioContext;
				if (!Context) return false;
				this.ctx = new Context({ latencyHint: "interactive" });
			}
			if (!this.ready) this._graph();
			if (this.ctx.state === "suspended" && this.ctx.resume)
				await this.ctx.resume();
			return this.ctx.state === "running" || this._offline;
		} catch (err) {
			this.error = String(err?.message || err);
			return false;
		}
	}

	_graph() {
		const c = this.ctx;
		this.master = c.createGain();
		this.master.gain.value = this.muted ? 0 : 0.75;
		this.music = c.createGain();
		this.music.gain.value = this.musicVolume;
		this.fx = c.createGain();
		this.fx.gain.value = this.sfxVolume;
		this.filter = c.createBiquadFilter();
		this.filter.type = "lowpass";
		this.filter.frequency.value = 9000;
		this.filter.Q.value = 0.55;
		this.music.connect(this.filter);
		this.filter.connect(this.master);
		this.fx.connect(this.master);
		this.compressor = c.createDynamicsCompressor();
		this.compressor.threshold.value = -10;
		this.compressor.knee.value = 8;
		this.compressor.ratio.value = 8;
		this.compressor.attack.value = 0.003;
		this.compressor.release.value = 0.1;
		this.analyser = c.createAnalyser();
		this.analyser.fftSize = 256;
		this.master.connect(this.compressor);
		this.compressor.connect(this.analyser);
		this.analyser.connect(c.destination);
		this._analysis = new Float32Array(256);
		this.ready = true;
		this.nextBeat = c.currentTime + 0.035;
		this._makeNoise();
	}

	_makeNoise() {
		const c = this.ctx;
		this._noiseBuffer = c.createBuffer(1, c.sampleRate, c.sampleRate);
		const a = this._noiseBuffer.getChannelData(0);
		let seed = 65397;
		for (let i = 0; i < a.length; i++) {
			seed = (seed * 1664525 + 1013904223) >>> 0;
			a[i] = (seed / 4294967296) * 2 - 1;
		}
	}

	_gain(param, value, time = 0.08) {
		if (!this.ready) return;
		const now = this.ctx.currentTime;
		param.cancelScheduledValues(now);
		param.setTargetAtTime(value, now, time);
	}

	setMusicVolume(v) {
		this.musicVolume = clamp(v);
		if (this.ready)
			this._gain(
				this.music.gain,
				this.musicVolume * (this.mode === "paused" ? 0.45 : 1),
			);
	}

	setSfxVolume(v) {
		this.sfxVolume = clamp(v);
		if (this.ready) this._gain(this.fx.gain, this.sfxVolume);
	}

	setMuted(v) {
		this.muted = !!v;
		if (this.ready) this._gain(this.master.gain, this.muted ? 0 : 0.75, 0.015);
	}

	setZone(name = "grove") {
		this.zone = String(name).toLowerCase();
		if (this.ready)
			this._gain(
				this.filter.frequency,
				this._isWater() ? 1500 : this._isDeep() ? 4500 : 9000,
				0.4,
			);
	}

	setMode(mode = "play") {
		this.mode = String(mode);
		if (this.ready)
			this._gain(
				this.music.gain,
				this.musicVolume * (this.mode === "paused" ? 0.45 : 1),
				0.12,
			);
	}

	_isWater() {
		return /water|river|lagoon|flood|pool|swim|lake|tide/.test(this.zone);
	}
	_isDeep() {
		return /deep|vault|lower|grotto|dark|cavern/.test(this.zone);
	}
	_isBalloon() {
		return /balloon|sky|shaft|updraft|chimney/.test(this.zone);
	}

	_tone(
		freq,
		when,
		duration = 0.2,
		volume = 0.12,
		wave = "sine",
		bus = this.fx,
		endFrequency = null,
		detune = 0,
	) {
		if (!this.ready || this.disposed || !Number.isFinite(freq)) return;
		const c = this.ctx;
		const osc = c.createOscillator();
		const gain = c.createGain();
		osc.type = wave;
		osc.frequency.setValueAtTime(Math.max(20, freq), when);
		if (endFrequency)
			osc.frequency.exponentialRampToValueAtTime(
				Math.max(20, endFrequency),
				when + duration,
			);
		osc.detune.value = detune;
		const attack = Math.min(0.012, duration * 0.15);
		gain.gain.setValueAtTime(0.00001, when);
		gain.gain.exponentialRampToValueAtTime(
			Math.max(0.00002, volume),
			when + attack,
		);
		gain.gain.exponentialRampToValueAtTime(0.00001, when + duration);
		osc.connect(gain);
		gain.connect(bus);
		const stop = when + duration + 0.02;
		this.nodes.add(osc);
		osc.onended = () => {
			this.nodes.delete(osc);
			osc.disconnect();
			gain.disconnect();
		};
		osc.start(when);
		osc.stop(stop);
	}

	_noise(when, duration, volume, frequency, type = "lowpass") {
		if (!this.ready || this.disposed) return;
		const c = this.ctx;
		const source = c.createBufferSource();
		const filter = c.createBiquadFilter();
		const gain = c.createGain();
		source.buffer = this._noiseBuffer;
		filter.type = type;
		filter.frequency.setValueAtTime(frequency, when);
		filter.frequency.exponentialRampToValueAtTime(
			Math.max(60, frequency * 0.25),
			when + duration,
		);
		gain.gain.setValueAtTime(0.00001, when);
		gain.gain.exponentialRampToValueAtTime(
			Math.max(0.00002, volume),
			when + 0.005,
		);
		gain.gain.exponentialRampToValueAtTime(0.00001, when + duration);
		source.connect(filter);
		filter.connect(gain);
		gain.connect(this.fx);
		this.nodes.add(source);
		source.onended = () => {
			this.nodes.delete(source);
			source.disconnect();
			filter.disconnect();
			gain.disconnect();
		};
		source.start(when);
		source.stop(when + duration + 0.01);
	}

	_scheduleBeat(beat, t) {
		const step = beat % 16;
		const phrase = Math.floor(beat / 16) % motifs.length;
		const water = this._isWater();
		const deep = this._isDeep();
		const balloon = this._isBalloon();
		const note = motifs[phrase][step] + (deep ? -12 : balloon ? 12 : 0);
		const f = hz(note);
		const length = water ? 0.39 : 0.25;
		this._tone(f, t, length, 0.27, "sine", this.music);
		this._tone(f * 2, t, length * 0.55, 0.055, "sine", this.music);
		if (step % 2 === 0) {
			const roots = [50, 47, 43, 45];
			const root = roots[Math.floor(step / 4)];
			this._tone(hz(root), t, 0.34, 0.21, "triangle", this.music);
		}
		if (step % 4 === 0) {
			const chord = [
				[62, 66, 69],
				[59, 62, 66],
				[55, 59, 62],
				[57, 61, 64],
			][Math.floor(step / 4)];
			for (const n of chord)
				this._tone(hz(n), t + 0.012, 0.8, 0.033, "sine", this.music);
		}
		if (!water && step % 2 === 1) {
			this._tone(1100, t, 0.026, 0.032, "triangle", this.music, 300);
		}
		if (water && step % 4 === 2) {
			this._tone(280, t + 0.09, 0.2, 0.1, "sine", this.music, 1000);
		}
		this.musicEvents++;
	}

	tick(_dt = 0) {
		if (!this.ready || this.disposed || this.ctx.state !== "running") return;
		const now = this.ctx.currentTime;
		if (this.nextBeat < now - 0.5) this.nextBeat = now + 0.025;
		const beatLength = this._isWater()
			? 0.265
			: this._isBalloon()
				? 0.205
				: 0.235;
		let n = 0;
		while (this.nextBeat < now + 0.18 && n++ < 6) {
			this._scheduleBeat(this.beat++, this.nextBeat);
			this.nextBeat += beatLength;
		}
	}

	sfx(name, at = null) {
		if (!this.ready || this.disposed || !effects.has(name)) return false;
		const t = at === null ? this.ctx.currentTime + 0.005 : at;
		const previous = this.lastSfx.get(name) ?? -Infinity;
		if (at === null && t - previous < (name === "coin" ? 0.035 : 0.055))
			return false;
		this.lastSfx.set(name, t);
		this.effectEvents++;
		const tone = (f, delay, d, v, w = "sine", end) =>
			this._tone(f, t + delay, d, v, w, this.fx, end);
		switch (name) {
			case "jump":
				tone(230, 0, 0.14, 0.2, "triangle", 650);
				tone(460, 0.02, 0.11, 0.05, "sine", 1000);
				break;
			case "land":
				this._noise(t, 0.07, 0.12, 550);
				tone(105, 0, 0.08, 0.18, "sine", 55);
				break;
			case "coin":
				tone(1318.51, 0, 0.1, 0.19);
				tone(1760, 0.055, 0.2, 0.15);
				tone(2637.02, 0.065, 0.12, 0.045);
				break;
			case "rescue":
				[74, 78, 81, 86].forEach((n, i) =>
					tone(hz(n), i * 0.105, 0.32, 0.18, "triangle"),
				);
				[62, 66, 69].forEach((n) => tone(hz(n), 0.34, 0.7, 0.075));
				break;
			case "checkpoint":
				[62, 69, 74, 78].forEach((n, i) => tone(hz(n), i * 0.075, 0.48, 0.14));
				this._noise(t + 0.02, 0.25, 0.04, 5000, "highpass");
				break;
			case "hurt":
				tone(205, 0, 0.22, 0.24, "sawtooth", 62);
				tone(212, 0.01, 0.2, 0.12, "triangle", 55);
				this._noise(t, 0.14, 0.1, 1200);
				break;
			case "balloon":
				[57, 62, 66, 69, 74, 78, 81].forEach((n, i) =>
					tone(hz(n), i * 0.07, 0.33, 0.12),
				);
				this._noise(t, 0.4, 0.045, 1800, "highpass");
				break;
			case "splash":
				this._noise(t, 0.4, 0.26, 2200);
				tone(580, 0.01, 0.12, 0.13, "sine", 150);
				tone(800, 0.09, 0.13, 0.1, "sine", 220);
				tone(480, 0.17, 0.15, 0.07, "sine", 130);
				break;
			case "win":
				[62, 66, 69, 74, 78, 81, 86].forEach((n, i) =>
					tone(hz(n), i * 0.115, 0.5, 0.16, "triangle"),
				);
				[50, 62, 66, 69, 74].forEach((n) => tone(hz(n), 0.82, 1.1, 0.11));
				break;
			case "ui":
				tone(880, 0, 0.035, 0.1);
				tone(1174.66, 0.018, 0.055, 0.07);
				break;
		}
		return true;
	}

	voice(seed = 1, at = null) {
		if (!this.ready || this.disposed) return false;
		const t = at === null ? this.ctx.currentTime + 0.01 : at;
		let n =
			typeof seed === "number"
				? seed >>> 0
				: String(seed)
						.split("")
						.reduce((a, s) => (a * 31 + s.charCodeAt(0)) >>> 0, 1);
		const random = () => {
			n = (n * 1664525 + 1013904223) >>> 0;
			return n / 4294967296;
		};
		const count = 5 + Math.floor(random() * 5);
		const vowels = [
			[700, 1200],
			[320, 1900],
			[450, 800],
			[500, 1600],
			[360, 950],
		];
		for (let i = 0; i < count; i++) {
			const time = t + i * 0.095;
			const pitch = 220 + random() * 200 + (i % 2) * 55;
			const duration = 0.055 + random() * 0.055;
			const [f1, f2] = vowels[Math.floor(random() * vowels.length)];
			const source = this.ctx.createOscillator();
			const envelope = this.ctx.createGain();
			source.type = "sawtooth";
			source.frequency.setValueAtTime(pitch, time);
			source.frequency.exponentialRampToValueAtTime(
				pitch * (0.8 + random() * 0.45),
				time + duration,
			);
			envelope.gain.setValueAtTime(0.00001, time);
			envelope.gain.exponentialRampToValueAtTime(0.105, time + 0.009);
			envelope.gain.exponentialRampToValueAtTime(0.00001, time + duration);
			const formants = [f1, f2].map((f) => {
				const filter = this.ctx.createBiquadFilter();
				filter.type = "bandpass";
				filter.frequency.value = f;
				filter.Q.value = 3.8;
				source.connect(filter);
				filter.connect(envelope);
				return filter;
			});
			envelope.connect(this.fx);
			this.nodes.add(source);
			source.onended = () => {
				this.nodes.delete(source);
				source.disconnect();
				envelope.disconnect();
				formants.forEach((f) => f.disconnect());
			};
			source.start(time);
			source.stop(time + duration + 0.01);
		}
		this.voiceEvents++;
		return true;
	}

	inspect() {
		let rms = 0;
		if (this.ready && this.analyser) {
			this.analyser.getFloatTimeDomainData(this._analysis);
			rms = Math.sqrt(
				this._analysis.reduce((s, v) => s + v * v, 0) / this._analysis.length,
			);
		}
		return {
			ready: this.ready,
			state: this.ctx?.state || "locked",
			musicVolume: this.musicVolume,
			sfxVolume: this.sfxVolume,
			muted: this.muted,
			mode: this.mode,
			zone: this.zone,
			musicEvents: this.musicEvents,
			effectEvents: this.effectEvents,
			voiceEvents: this.voiceEvents,
			activeNodes: this.nodes.size,
			rms,
			error: this.error || null,
		};
	}

	dispose() {
		if (this.disposed) return;
		this.disposed = true;
		for (const node of this.nodes) {
			try {
				node.stop();
				node.disconnect();
			} catch {}
		}
		this.nodes.clear();
		for (const node of [
			this.music,
			this.fx,
			this.filter,
			this.master,
			this.compressor,
			this.analyser,
		]) {
			try {
				node?.disconnect();
			} catch {}
		}
		if (!this._offline && this.ctx?.close) this.ctx.close().catch(() => {});
		this.ready = false;
	}
}

/** Deterministic, audible-output verification without requiring speakers. */
export async function renderAudioProbe() {
	const Context =
		globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
	if (!Context)
		return { supported: false, reason: "OfflineAudioContext unavailable" };
	const sampleRate = 22050;
	const ctx = new Context(1, sampleRate * 5, sampleRate);
	const director = new AudioDirector({ context: ctx, offline: true });
	director._graph();
	for (let i = 0; i < 20; i++) director._scheduleBeat(i, 0.05 + i * 0.235);
	[...effects].forEach((name, i) => director.sfx(name, 0.1 + i * 0.35));
	director.voice("cavern-friend", 3.7);
	const rendered = await ctx.startRendering();
	const data = rendered.getChannelData(0);
	let peak = 0;
	let sum = 0;
	let finite = true;
	let nonzero = 0;
	for (const v of data) {
		finite = finite && Number.isFinite(v);
		peak = Math.max(peak, Math.abs(v));
		sum += v * v;
		if (Math.abs(v) > 0.00001) nonzero++;
	}
	const result = {
		supported: true,
		finite,
		peak,
		rms: Math.sqrt(sum / data.length),
		nonzeroSamples: nonzero,
		samples: data.length,
		musicVolume: director.musicVolume,
		musicEvents: director.musicEvents,
		effectEvents: director.effectEvents,
		voiceEvents: director.voiceEvents,
	};
	director.dispose();
	return result;
}
