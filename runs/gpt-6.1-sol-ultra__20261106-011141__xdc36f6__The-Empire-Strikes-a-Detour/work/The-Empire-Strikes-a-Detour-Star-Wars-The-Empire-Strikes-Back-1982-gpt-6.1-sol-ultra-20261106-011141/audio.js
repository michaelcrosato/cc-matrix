// All sounds are synthesized. No recordings, speech samples, or audio downloads.
const midi = (n) => 440 * 2 ** ((n - 69) / 12);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, Number(v) || 0));
const noiseCache = new WeakMap();
function noiseBuffer(ctx) {
	if (noiseCache.has(ctx)) return noiseCache.get(ctx);
	const b = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 2), ctx.sampleRate);
	const d = b.getChannelData(0);
	let seed = 17691;
	for (let i = 0; i < d.length; i++) {
		seed = (seed * 16807) % 2147483647;
		d[i] = seed / 1073741823.5 - 1;
	}
	noiseCache.set(ctx, b);
	return b;
}
function envelope(ctx, dest, time, duration, volume, attack = 0.008) {
	const g = ctx.createGain();
	g.gain.setValueAtTime(0.0001, time);
	g.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), time + attack);
	g.gain.exponentialRampToValueAtTime(0.0001, time + duration);
	g.connect(dest);
	return g;
}
function tone(
	ctx,
	dest,
	hz,
	time,
	duration,
	volume,
	type = "triangle",
	endHz = hz,
) {
	const o = ctx.createOscillator();
	o.type = type;
	o.frequency.setValueAtTime(Math.max(15, hz), time);
	o.frequency.exponentialRampToValueAtTime(
		Math.max(15, endHz),
		time + duration,
	);
	const g = envelope(ctx, dest, time, duration, volume);
	o.connect(g);
	o.start(time);
	o.stop(time + duration + 0.025);
	o.onended = () => {
		o.disconnect();
		g.disconnect();
	};
	return o;
}
function noise(ctx, dest, time, duration, volume, frequency, q = 0.7) {
	const s = ctx.createBufferSource(),
		f = ctx.createBiquadFilter();
	s.buffer = noiseBuffer(ctx);
	f.type = "bandpass";
	f.frequency.setValueAtTime(frequency, time);
	f.Q.value = q;
	const g = envelope(ctx, dest, time, duration, volume, 0.006);
	s.connect(f);
	f.connect(g);
	s.start(time);
	s.stop(time + duration + 0.03);
	s.onended = () => {
		s.disconnect();
		f.disconnect();
		g.disconnect();
	};
}
function sound(ctx, dest, name, time) {
	switch (name) {
		case "laser":
			tone(ctx, dest, 1250, time, 0.115, 0.13, "sawtooth", 165);
			tone(ctx, dest, 190, time, 0.06, 0.1, "sine", 65);
			break;
		case "hit":
			noise(ctx, dest, time, 0.16, 0.36, 1500, 1);
			tone(ctx, dest, 155, time, 0.17, 0.16, "triangle", 43);
			break;
		case "explosion":
			noise(ctx, dest, time, 0.8, 0.7, 360);
			noise(ctx, dest, time + 0.05, 0.4, 0.3, 1500);
			tone(ctx, dest, 90, time, 0.7, 0.55, "sine", 22);
			tone(ctx, dest, 175, time, 0.2, 0.18, "triangle", 45);
			break;
		case "tow":
			tone(ctx, dest, 220, time, 0.44, 0.22, "sawtooth", 840);
			for (let i = 0; i < 5; i++)
				tone(
					ctx,
					dest,
					1400 + i * 140,
					time + i * 0.075,
					0.045,
					0.07,
					"square",
					400,
				);
			break;
		case "pickup":
			[74, 77, 81, 86].forEach((n, i) => {
				tone(ctx, dest, midi(n), time + i * 0.09, 0.32, 0.22, "sine");
			});
			break;
		case "boost":
			noise(ctx, dest, time, 0.75, 0.38, 670);
			tone(ctx, dest, 80, time, 0.65, 0.18, "sawtooth", 220);
			break;
		case "ui":
			tone(ctx, dest, midi(79), time, 0.06, 0.12, "sine");
			tone(ctx, dest, midi(86), time + 0.035, 0.08, 0.065, "sine");
			break;
		case "win":
			[62, 69, 74, 77, 81, 86].forEach((n, i) => {
				tone(ctx, dest, midi(n), time + i * 0.14, 0.85, 0.2, "triangle");
				tone(ctx, dest, midi(n - 12), time + i * 0.14, 0.85, 0.07, "sine");
			});
			break;
		case "lose":
			[62, 60, 58, 57, 50].forEach((n, i) => {
				tone(ctx, dest, midi(n), time + i * 0.2, 0.7, 0.23, "triangle");
			});
			break;
		default:
			tone(ctx, dest, 420, time, 0.07, 0.1, "sine");
	}
}
function babble(ctx, dest, mood, time) {
	// A short radio transmission made from changing source pitches and vowel resonances.
	const urgent = mood === "urgent" || mood === "danger";
	const cheerful = mood === "happy" || mood === "win";
	noise(ctx, dest, time, 0.08, 0.13, 2000);
	const vowels = [
		[680, 1200],
		[430, 1850],
		[320, 950],
		[550, 1550],
		[350, 2300],
	];
	const pitches = urgent
		? [62, 67, 65, 69, 62, 65, 60, 62]
		: cheerful
			? [69, 72, 74, 69, 77, 74, 72]
			: [57, 62, 60, 65, 62, 57, 60];
	pitches.forEach((n, i) => {
		const at = time + 0.1 + i * 0.105,
			length = i % 3 === 0 ? 0.1 : 0.075;
		const o = ctx.createOscillator();
		o.type = "sawtooth";
		o.frequency.setValueAtTime(midi(n) * 0.62, at);
		o.frequency.exponentialRampToValueAtTime(
			midi(n + (i % 2 ? 2 : -2)) * 0.62,
			at + length,
		);
		const pair = vowels[(i * 3 + (urgent ? 2 : 0)) % vowels.length];
		const ending = [];
		pair.forEach((f, j) => {
			const filter = ctx.createBiquadFilter();
			filter.type = "bandpass";
			filter.frequency.value = f;
			filter.Q.value = 5;
			const g = envelope(ctx, dest, at, length, j === 0 ? 0.33 : 0.18, 0.008);
			o.connect(filter);
			filter.connect(g);
			ending.push(filter, g);
		});
		o.start(at);
		o.stop(at + length + 0.02);
		o.onended = () => {
			o.disconnect();
			ending.forEach((n) => {
				n.disconnect();
			});
		};
	});
	noise(ctx, dest, time + pitches.length * 0.105 + 0.13, 0.07, 0.1, 2500);
}
const ROOTS = [38, 34, 41, 36];
const MELODY = [
	14,
	null,
	21,
	17,
	19,
	null,
	14,
	12,
	10,
	null,
	17,
	14,
	12,
	10,
	9,
	null,
	14,
	17,
	21,
	null,
	24,
	21,
	19,
	17,
	19,
	null,
	17,
	14,
	12,
	null,
	9,
	12,
];
function musicStep(ctx, dest, index, time, phase = 1) {
	const bar = Math.floor(index / 16),
		beat = index % 16;
	const root = ROOTS[bar % ROOTS.length];
	const length = 60 / 112 / 2;
	let count = 0;
	// A soft pulse, wide open fifths, and an original rising/falling signal melody.
	if (beat % 4 === 0) {
		tone(ctx, dest, midi(root), time, 0.55, 0.22, "triangle");
		tone(ctx, dest, midi(root + 7), time + 0.012, 0.6, 0.07, "sine");
		count += 2;
	}
	const arp = [12, 19, 15, 24, 19, 27, 15, 19][beat % 8];
	tone(ctx, dest, midi(root + arp), time, 0.19, 0.075, "triangle");
	count++;
	const lead = MELODY[index % MELODY.length];
	if (lead !== null && bar % 4 !== 3) {
		tone(
			ctx,
			dest,
			midi(62 + lead - 12),
			time + 0.009,
			length * 1.65,
			0.105,
			"triangle",
		);
		count++;
	}
	if (beat % 4 === 0 || (Number(phase) >= 2 && beat % 4 === 2)) {
		noise(ctx, dest, time, 0.07, 0.1, beat % 8 === 4 ? 1200 : 180);
		tone(ctx, dest, 80, time, 0.13, 0.11, "sine", 32);
		count += 2;
	}
	if (beat % 2 === 1) {
		noise(ctx, dest, time, 0.035, 0.055, 6000);
		count++;
	}
	return count;
}

export class AudioDirector {
	constructor() {
		this.ctx = null;
		this.music = 0.1;
		this.effects = 0.6;
		this.paused = false;
		this.stopped = false;
		this.ended = false;
		this.stopPromise = null;
		this.stats = {
			unlocked: false,
			notes: 0,
			effects: 0,
			voices: 0,
			musicVolume: 0.1,
			sfxVolume: 0.6,
			running: false,
			level: 0,
		};
		this.nextNote = 0;
		this.noteIndex = 0;
		this.active = false;
		this.phase = 1;
		this.lastEffect = Object.create(null);
		this.lastVoice = -10;
	}
	async unlock() {
		if (this.ended) return false;
		// Only an explicit user unlock can resume output after Hub has ended a round.
		if (this.stopPromise) await this.stopPromise;
		if (this.ended) return false;
		this.stopped = false;
		if (!this.ctx) {
			const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
			if (!Audio) return false;
			try {
				this.ctx = new Audio();
				const c = this.ctx;
				this.master = c.createGain();
				this.master.gain.value = 0.78;
				const compressor = c.createDynamicsCompressor();
				compressor.threshold.value = -12;
				compressor.knee.value = 12;
				compressor.ratio.value = 6;
				compressor.attack.value = 0.003;
				compressor.release.value = 0.18;
				this.analyser = c.createAnalyser();
				this.analyser.fftSize = 256;
				this.wave = new Float32Array(this.analyser.fftSize);
				this.master.connect(compressor);
				compressor.connect(this.analyser);
				this.analyser.connect(c.destination);
				this.musicBus = c.createGain();
				this.musicBus.gain.value = this.music;
				this.fxBus = c.createGain();
				this.fxBus.gain.value = this.effects;
				this.voiceBus = c.createGain();
				this.voiceBus.gain.value = this.effects * 0.7;
				this.musicBus.connect(this.master);
				this.fxBus.connect(this.master);
				this.voiceBus.connect(this.master);
				// Quiet continuous reactor tone and filtered airflow, modulated by the flight model.
				this.engineGain = c.createGain();
				this.engineGain.gain.value = 0;
				this.engineGain.connect(this.fxBus);
				this.engine = c.createOscillator();
				this.engine.type = "triangle";
				this.engine.frequency.value = 62;
				this.engine.connect(this.engineGain);
				this.engine.start();
				this.windSource = c.createBufferSource();
				this.windSource.buffer = noiseBuffer(c);
				this.windSource.loop = true;
				this.windFilter = c.createBiquadFilter();
				this.windFilter.type = "lowpass";
				this.windFilter.frequency.value = 420;
				this.windGain = c.createGain();
				this.windGain.gain.value = 0;
				this.windSource.connect(this.windFilter);
				this.windFilter.connect(this.windGain);
				this.windGain.connect(this.fxBus);
				this.windSource.start();
				this.nextNote = c.currentTime + 0.08;
			} catch (_) {
				this.ctx = null;
				return false;
			}
		}
		try {
			if (this.ctx.state === "suspended") await this.ctx.resume();
		} catch (_) {
			return false;
		}
		if (this.ended) {
			await this.stop(true);
			return false;
		}
		this.master.gain.setValueAtTime(0.78, this.ctx.currentTime);
		this.stats.unlocked = this.ctx.state === "running";
		return this.stats.unlocked;
	}
	setMusic(v) {
		this.music = clamp(v);
		this.stats.musicVolume = this.music;
		if (this.ctx)
			this.musicBus.gain.setTargetAtTime(
				this.paused ? this.music * 0.3 : this.music,
				this.ctx.currentTime,
				0.04,
			);
	}
	setSfx(v) {
		this.effects = clamp(v);
		this.stats.sfxVolume = this.effects;
		if (this.ctx) {
			this.fxBus.gain.setTargetAtTime(this.effects, this.ctx.currentTime, 0.04);
			this.voiceBus.gain.setTargetAtTime(
				this.effects * 0.7,
				this.ctx.currentTime,
				0.04,
			);
		}
	}
	setPaused(value) {
		this.paused = !!value;
		this.setMusic(this.music);
	}
	async stop(permanent = false) {
		this.ended = this.ended || !!permanent;
		this.stopped = true;
		this.active = false;
		this.stats.running = false;
		this.stats.level = 0;
		if (!this.ctx) return;
		const at = this.ctx.currentTime;
		this.master.gain.cancelScheduledValues(at);
		this.master.gain.setValueAtTime(0, at);
		this.engineGain.gain.cancelScheduledValues(at);
		this.engineGain.gain.setValueAtTime(0, at);
		this.windGain.gain.cancelScheduledValues(at);
		this.windGain.gain.setValueAtTime(0, at);
		this.stopPromise = this.ctx.suspend().catch(() => {});
		await this.stopPromise;
		this.stopPromise = null;
	}
	sfx(name) {
		if (this.stopped || !this.ctx || this.ctx.state !== "running") return;
		const at = this.ctx.currentTime;
		if (
			at - (this.lastEffect[name] ?? -10) <
			(name === "laser" ? 0.045 : 0.025)
		)
			return;
		this.lastEffect[name] = at;
		this.stats.effects++;
		sound(this.ctx, this.fxBus, name, at + 0.003);
	}
	voice(mood = "radio") {
		if (
			this.stopped ||
			!this.ctx ||
			this.ctx.state !== "running" ||
			this.ctx.currentTime - this.lastVoice < 1
		)
			return;
		this.lastVoice = this.ctx.currentTime;
		this.stats.voices++;
		babble(this.ctx, this.voiceBus, mood, this.ctx.currentTime + 0.01);
	}
	update(dt, state = {}) {
		if (this.stopped || !this.ctx || this.ctx.state !== "running") return;
		const c = this.ctx,
			at = c.currentTime;
		this.active = !!state.active && !this.paused;
		this.phase = state.phase ?? this.phase;
		const speed = clamp((Number(state.speed) || 0) / 65);
		const boosting = !!state.boost;
		this.engine.frequency.setTargetAtTime(
			55 + speed * 65 + (boosting ? 40 : 0),
			at,
			0.12,
		);
		this.engineGain.gain.setTargetAtTime(
			this.active ? 0.022 + speed * 0.025 : 0,
			at,
			0.15,
		);
		this.windGain.gain.setTargetAtTime(
			this.active ? speed * 0.12 + (boosting ? 0.1 : 0) : 0,
			at,
			0.2,
		);
		this.windFilter.frequency.setTargetAtTime(
			330 + speed * 1100 + (boosting ? 900 : 0),
			at,
			0.12,
		);
		// Catch up from tab suspension without scheduling a burst of missed notes.
		if (this.nextNote < at - 0.2) this.nextNote = at + 0.02;
		while (this.nextNote < at + 0.18) {
			this.stats.notes += musicStep(
				c,
				this.musicBus,
				this.noteIndex++,
				this.nextNote,
				this.phase,
			);
			this.nextNote += 60 / 112 / 2;
		}
		this.analyser.getFloatTimeDomainData(this.wave);
		let squares = 0;
		for (const value of this.wave) squares += value * value;
		this.stats.level = Math.sqrt(squares / this.wave.length);
		this.stats.running = true;
	}
	getSnapshot() {
		return {
			...this.stats,
			stopped: this.stopped,
			ended: this.ended,
			contextState: this.ctx?.state || "locked",
		};
	}
}

// Deterministic, audible offline evidence for browser tests: includes every effect,
// radio vowels and the same score synthesis used in the live game.
export async function renderAudioTest(ctx) {
	const gain = ctx.createGain();
	gain.gain.value = 0.35;
	gain.connect(ctx.destination);
	const names = [
		"laser",
		"hit",
		"explosion",
		"tow",
		"pickup",
		"boost",
		"ui",
		"win",
		"lose",
	];
	names.forEach((name, i) => {
		sound(ctx, gain, name, 0.1 + i * 0.75);
	});
	babble(ctx, gain, "radio", 7.1);
	for (let i = 0; i < 28; i++) musicStep(ctx, gain, i, 0.05 + i * 0.267857, 2);
	const rendered = await ctx.startRendering();
	const values = rendered.getChannelData(0);
	let peak = 0,
		sum = 0,
		finite = true;
	for (const x of values) {
		if (!Number.isFinite(x)) finite = false;
		peak = Math.max(peak, Math.abs(x));
		sum += x * x;
	}
	return {
		peak,
		rms: Math.sqrt(sum / values.length),
		finite,
		seconds: rendered.duration,
		effects: names.length,
		voices: 1,
	};
}
