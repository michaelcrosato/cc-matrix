/* Jungle Scurry — every sound is synthesized at runtime. */
const NOTE = (n) => 440 * 2 ** ((n - 69) / 12);
const clamp01 = (n) => Math.max(0, Math.min(1, Number(n) || 0));

function seededNoise(context, seconds, seed = 1439) {
	const buffer = context.createBuffer(
		1,
		Math.ceil(context.sampleRate * seconds),
		context.sampleRate,
	);
	const samples = buffer.getChannelData(0);
	let value = seed >>> 0;
	for (let i = 0; i < samples.length; i++) {
		value = (value * 1664525 + 1013904223) >>> 0;
		samples[i] = value / 2147483648 - 1;
	}
	return buffer;
}

function makeGraph(context, musicVolume, sfxVolume) {
	const music = context.createGain();
	const effects = context.createGain();
	const master = context.createGain();
	const compressor = context.createDynamicsCompressor();
	const analyser = context.createAnalyser();
	const reverb = context.createConvolver();
	const reverbSend = context.createGain();
	const reverbReturn = context.createGain();
	music.gain.value = musicVolume;
	effects.gain.value = sfxVolume;
	master.gain.value = 0.72;
	compressor.threshold.value = -14;
	compressor.knee.value = 14;
	compressor.ratio.value = 3;
	compressor.attack.value = 0.006;
	compressor.release.value = 0.18;
	analyser.fftSize = 1024;
	const impulse = context.createBuffer(
		2,
		Math.floor(context.sampleRate * 0.72),
		context.sampleRate,
	);
	let seed = 25717;
	for (let channel = 0; channel < 2; channel++) {
		const samples = impulse.getChannelData(channel);
		for (let i = 0; i < samples.length; i++) {
			seed = (seed * 1664525 + 1013904223) >>> 0;
			samples[i] =
				(seed / 2147483648 - 1) * (1 - i / samples.length) ** 3 * 0.3;
		}
	}
	reverb.buffer = impulse;
	reverbSend.gain.value = 0.16;
	reverbReturn.gain.value = 0.5;
	music.connect(master);
	effects.connect(master);
	music.connect(reverbSend);
	reverbSend.connect(reverb);
	reverb.connect(reverbReturn);
	reverbReturn.connect(master);
	master.connect(compressor);
	compressor.connect(analyser);
	analyser.connect(context.destination);
	return {
		music,
		effects,
		master,
		compressor,
		analyser,
		reverb,
		reverbSend,
		reverbReturn,
	};
}

function envelope(context, destination, time, attack, decay, level) {
	const gain = context.createGain();
	gain.gain.setValueAtTime(0.00001, time);
	gain.gain.exponentialRampToValueAtTime(
		Math.max(0.00002, level),
		time + attack,
	);
	gain.gain.exponentialRampToValueAtTime(
		0.00001,
		time + Math.max(attack + 0.004, decay),
	);
	gain.connect(destination);
	return gain;
}

function tone(
	context,
	destination,
	frequency,
	time,
	duration,
	level,
	type = "sine",
	end = frequency,
	attack = 0.006,
) {
	const oscillator = context.createOscillator();
	const gain = envelope(context, destination, time, attack, duration, level);
	oscillator.type = type;
	oscillator.frequency.setValueAtTime(Math.max(10, frequency), time);
	if (end !== frequency)
		oscillator.frequency.exponentialRampToValueAtTime(
			Math.max(10, end),
			time + duration * 0.88,
		);
	oscillator.connect(gain);
	oscillator.start(time);
	oscillator.stop(time + duration + 0.025);
	oscillator.onended = () => {
		oscillator.disconnect();
		gain.disconnect();
	};
	return oscillator;
}

function hiss(
	context,
	destination,
	noise,
	time,
	duration,
	level,
	frequency = 2200,
	filterType = "highpass",
	q = 0.7,
) {
	const source = context.createBufferSource();
	const filter = context.createBiquadFilter();
	const gain = envelope(context, destination, time, 0.003, duration, level);
	source.buffer = noise;
	source.loop = true;
	filter.type = filterType;
	filter.frequency.value = frequency;
	filter.Q.value = q;
	source.connect(filter);
	filter.connect(gain);
	source.start(time);
	source.stop(time + duration + 0.015);
	source.onended = () => {
		source.disconnect();
		filter.disconnect();
		gain.disconnect();
	};
}

function marimba(context, destination, frequency, time, duration, level) {
	tone(
		context,
		destination,
		frequency,
		time,
		duration,
		level,
		"sine",
		frequency,
		0.002,
	);
	tone(
		context,
		destination,
		frequency * 2.76,
		time,
		duration * 0.36,
		level * 0.24,
		"sine",
		frequency * 2.75,
		0.001,
	);
	tone(
		context,
		destination,
		frequency * 4.01,
		time,
		duration * 0.16,
		level * 0.09,
		"sine",
		frequency * 4,
		0.001,
	);
}

function flute(context, destination, frequency, time, duration, level) {
	const osc = tone(
		context,
		destination,
		frequency,
		time,
		duration,
		level,
		"sine",
		frequency,
		0.045,
	);
	tone(
		context,
		destination,
		frequency * 2,
		time,
		duration * 0.9,
		level * 0.1,
		"sine",
		frequency * 2,
		0.05,
	);
	const vibrato = context.createOscillator();
	const depth = context.createGain();
	vibrato.frequency.value = 5.2;
	depth.gain.value = frequency * 0.004;
	vibrato.connect(depth);
	depth.connect(osc.frequency);
	vibrato.start(time);
	vibrato.stop(time + duration + 0.03);
	vibrato.onended = () => {
		vibrato.disconnect();
		depth.disconnect();
	};
}

const STAGES = [
	{
		bpm: 112,
		key: 0,
		roots: [45, 41, 48, 43],
		melody: [0, 7, 12, 14, 12, 7, 4, 7, 9, 12, 16, 14, 12, 9, 7, 4],
	},
	{
		bpm: 96,
		key: 0,
		roots: [50, 46, 53, 48],
		melody: [0, 7, 10, 12, 14, 12, 10, 7, 3, 7, 12, 15, 14, 10, 7, 3],
	},
	{
		bpm: 128,
		key: 0,
		roots: [45, 45, 41, 43],
		melody: [0, 4, 7, 12, 7, 4, 7, 14, 12, 7, 4, 7, 9, 12, 14, 16],
	},
	{
		bpm: 118,
		key: 0,
		roots: [48, 43, 45, 41],
		melody: [0, 4, 7, 12, 16, 14, 12, 7, 9, 12, 16, 19, 16, 12, 7, 4],
	},
];

export class JungleAudio {
	constructor() {
		this.context = null;
		this.ctx = null;
		this.graph = null;
		this.analyser = null;
		this.musicVolume = 0.1;
		this.sfxVolume = 0.65;
		this.stage = 0;
		this.paused = false;
		this.unlocked = false;
		this.disposed = false;
		this.nextNote = 0;
		this.step = 0;
		this.scheduledNotes = 0;
		this.effectCount = 0;
		this.voiceCount = 0;
		this.lastEffect = null;
		this.lastVoice = null;
		this.lastBubble = -10;
		this._levels = new Float32Array(1024);
	}

	async unlock() {
		if (this.disposed) return false;
		if (!this.context) {
			const AudioContext =
				globalThis.AudioContext || globalThis.webkitAudioContext;
			if (!AudioContext) return false;
			try {
				this.context = new AudioContext({ latencyHint: "interactive" });
				this.ctx = this.context;
				this.graph = makeGraph(this.context, this.musicVolume, this.sfxVolume);
				this.analyser = this.graph.analyser;
				this.noise = seededNoise(this.context, 1.1);
				this.nextNote = this.context.currentTime + 0.045;
			} catch (_) {
				return false;
			}
		}
		try {
			if (this.context.state === "suspended") await this.context.resume();
			this.unlocked = this.context.state === "running";
			if (this.unlocked) this.update(0, {});
			return this.unlocked;
		} catch (_) {
			return false;
		}
	}

	setMusicVolume(value = 0.1) {
		this.musicVolume = clamp01(value);
		this._setMusicGain();
	}

	setSfxVolume(value = 0.65) {
		this.sfxVolume = clamp01(value);
		if (this.graph)
			this.graph.effects.gain.setTargetAtTime(
				this.sfxVolume,
				this.context.currentTime,
				0.035,
			);
	}

	_setMusicGain() {
		if (this.graph)
			this.graph.music.gain.setTargetAtTime(
				this.musicVolume * (this.paused ? 0.22 : 1),
				this.context.currentTime,
				0.12,
			);
	}

	setStage(stage) {
		const nextStage = Math.max(0, Math.min(3, Math.floor(stage || 0)));
		if (nextStage === this.stage) return;
		this.stage = nextStage;
		this.step = 0;
		if (this.context) this.nextNote = this.context.currentTime + 0.08;
	}

	setPaused(value) {
		this.paused = Boolean(value);
		this._setMusicGain();
	}

	update(_dt, state = {}) {
		if (this.context?.state !== "running" || this.disposed) return;
		const now = this.context.currentTime;
		if (this.nextNote < now - 0.3) this.nextNote = now + 0.035;
		let count = 0;
		while (this.nextNote < now + 0.16 && count++ < 12) {
			this._scoreStep(this.nextNote, this.step++);
			this.nextNote += 60 / STAGES[this.stage].bpm / 4;
		}
		if (
			!this.paused &&
			this.stage === 1 &&
			state.player &&
			state.player.y < 5.5 &&
			now - this.lastBubble > 2.4
		) {
			this.lastBubble = now;
			this.sfx("bubble");
		}
	}

	_scoreStep(time, step) {
		const context = this.context;
		const bus = this.graph.music;
		const score = STAGES[this.stage];
		const beat = step % 16;
		const bar = Math.floor(step / 16);
		const root = score.roots[bar % score.roots.length];
		const quarter = 60 / score.bpm;
		if (beat % 2 === 0) {
			const melodyIndex = (bar * 8 + beat / 2) % score.melody.length;
			const pitch =
				root + 24 + score.melody[melodyIndex] - (bar % 4 === 2 ? 12 : 0);
			marimba(
				context,
				bus,
				NOTE(pitch),
				time,
				quarter * 0.8,
				beat % 4 === 0 ? 0.32 : 0.22,
			);
			this.scheduledNotes++;
		}
		if (beat % 4 === 0) {
			const bass = NOTE(root + (beat === 8 ? 7 : 0));
			tone(
				context,
				bus,
				bass,
				time,
				quarter * 0.82,
				0.3,
				"triangle",
				bass,
				0.012,
			);
			tone(
				context,
				bus,
				beat === 0 ? 160 : 190,
				time,
				0.14,
				0.21,
				"sine",
				65,
				0.001,
			);
		}
		if (beat === 4 || beat === 12) {
			hiss(context, bus, this.noise, time, 0.055, 0.12, 1000, "bandpass", 1.2);
			tone(context, bus, 310, time, 0.07, 0.09, "sine", 170, 0.001);
		}
		if (beat % 2 === 1)
			hiss(context, bus, this.noise, time, 0.038, 0.035, 5200, "highpass");
		if (bar % 2 === 1 && (beat === 0 || beat === 6 || beat === 10)) {
			const intervals = beat === 0 ? 12 : beat === 6 ? 7 : 16;
			flute(
				context,
				bus,
				NOTE(root + 24 + intervals),
				time + 0.012,
				quarter * (beat === 10 ? 1.25 : 0.85),
				this.stage === 1 ? 0.12 : 0.085,
			);
		}
		if (this.stage === 2 && (beat === 3 || beat === 11))
			tone(context, bus, 260, time, 0.1, 0.14, "sine", 110, 0.001);
		if (this.stage === 3 && beat === 14)
			marimba(context, bus, NOTE(root + 43), time, quarter * 0.5, 0.12);
	}

	sfx(name) {
		if (
			!this.context ||
			(this.context.state !== "running" && !this._offline) ||
			this.disposed
		)
			return;
		const context = this.context;
		const bus = this.graph.effects;
		const t = (this._offlineTime ?? context.currentTime) + 0.005;
		this.effectCount++;
		this.lastEffect = name;
		const play = (f, d, level = 0.2, type = "sine", end = f, delay = 0) =>
			tone(context, bus, f, t + delay, d, level, type, end);
		const noise = (d, level, f, filter = "highpass", delay = 0) =>
			hiss(context, bus, this.noise, t + delay, d, level, f, filter);
		switch (name) {
			case "jump":
				play(220, 0.16, 0.18, "triangle", 660);
				play(490, 0.08, 0.08, "sine", 900, 0.055);
				break;
			case "swing":
				noise(0.3, 0.055, 1200, "bandpass");
				play(330, 0.19, 0.06, "sine", 520);
				break;
			case "grab":
				play(690, 0.08, 0.2, "triangle", 980);
				play(1150, 0.09, 0.09, "sine", 900, 0.03);
				noise(0.035, 0.07, 1800);
				break;
			case "release":
				play(590, 0.14, 0.16, "sine", 1080);
				noise(0.12, 0.035, 2500);
				break;
			case "land":
				play(125, 0.1, 0.23, "sine", 55);
				noise(0.07, 0.09, 650, "lowpass");
				break;
			case "splash":
				noise(0.36, 0.25, 1700, "lowpass");
				play(210, 0.18, 0.13, "sine", 50);
				play(480, 0.13, 0.07, "sine", 160, 0.055);
				break;
			case "attack":
				noise(0.13, 0.14, 1800, "bandpass");
				play(550, 0.105, 0.15, "triangle", 160);
				break;
			case "pickup":
				marimba(context, bus, NOTE(81), t, 0.18, 0.24);
				marimba(context, bus, NOTE(88), t + 0.075, 0.3, 0.22);
				break;
			case "hit":
				play(145, 0.22, 0.24, "sawtooth", 55);
				noise(0.14, 0.13, 950, "lowpass");
				play(370, 0.1, 0.08, "triangle", 90);
				break;
			case "checkpoint":
				[72, 76, 79, 84].forEach((n, i) => {
					marimba(context, bus, NOTE(n), t + i * 0.085, 0.45, 0.22);
				});
				break;
			case "win":
				[72, 76, 79, 84, 79, 84, 88].forEach((n, i) => {
					marimba(context, bus, NOTE(n), t + i * 0.13, 0.65, 0.24);
					if (i > 2) flute(context, bus, NOTE(n - 12), t + i * 0.13, 0.6, 0.11);
				});
				break;
			case "menu":
				play(660, 0.045, 0.07, "sine", 880);
				break;
			case "bubble":
				[0, 0.075, 0.18].forEach((delay, i) => {
					play(340 + i * 80, 0.07, 0.055, "sine", 1000 + i * 150, delay);
				});
				break;
			default:
				play(440, 0.08, 0.08, "sine", 660);
		}
	}

	voice(mood = "hello") {
		if (
			!this.context ||
			(this.context.state !== "running" && !this._offline) ||
			this.disposed
		)
			return;
		const context = this.context;
		const bus = this.graph.effects;
		const start = (this._offlineTime ?? context.currentTime) + 0.01;
		const phrases = {
			hello: [1, 1.22, 0.95, 1.35],
			excited: [1.12, 1.38, 1.22, 1.55, 1.4],
			hurt: [0.95, 0.68, 0.79],
			rescue: [1, 1.18, 1.35, 1.18, 1.55],
			win: [1.12, 1.4, 1.25, 1.55, 1.68],
		};
		const pitches = phrases[mood] || phrases.hello;
		const vowels = [
			[550, 1850],
			[850, 1250],
			[370, 2400],
			[600, 1000],
			[450, 1700],
		];
		this.voiceCount++;
		this.lastVoice = mood;
		pitches.forEach((pitch, i) => {
			const t = start + i * 0.105;
			const duration = i === pitches.length - 1 ? 0.18 : 0.084;
			const oscillator = context.createOscillator();
			const vowelA = context.createBiquadFilter();
			const vowelB = context.createBiquadFilter();
			const gain = envelope(context, bus, t, 0.011, duration, 0.085);
			oscillator.type = "sawtooth";
			oscillator.frequency.setValueAtTime(205 * pitch, t);
			oscillator.frequency.exponentialRampToValueAtTime(
				225 * pitch,
				t + duration * 0.7,
			);
			vowelA.type = vowelB.type = "bandpass";
			vowelA.frequency.value = vowels[i % vowels.length][0];
			vowelB.frequency.value = vowels[i % vowels.length][1];
			vowelA.Q.value = 5;
			vowelB.Q.value = 7;
			oscillator.connect(vowelA);
			oscillator.connect(vowelB);
			vowelA.connect(gain);
			vowelB.connect(gain);
			oscillator.start(t);
			oscillator.stop(t + duration + 0.02);
			oscillator.onended = () => {
				oscillator.disconnect();
				vowelA.disconnect();
				vowelB.disconnect();
				gain.disconnect();
			};
			if (i % 2 === 0)
				hiss(context, bus, this.noise, t, 0.023, 0.022, 1900, "highpass");
		});
	}

	diagnostics() {
		let rms = 0;
		let peak = 0;
		if (this.analyser) {
			this.analyser.getFloatTimeDomainData(this._levels);
			for (const sample of this._levels) {
				rms += sample * sample;
				peak = Math.max(peak, Math.abs(sample));
			}
			rms = Math.sqrt(rms / this._levels.length);
		}
		return {
			supported: Boolean(
				globalThis.AudioContext || globalThis.webkitAudioContext,
			),
			unlocked: this.unlocked,
			state: this.context?.state || "locked",
			musicVolume: this.musicVolume,
			sfxVolume: this.sfxVolume,
			stage: this.stage,
			paused: this.paused,
			scheduledNotes: this.scheduledNotes,
			effects: this.effectCount,
			voices: this.voiceCount,
			lastEffect: this.lastEffect,
			lastVoice: this.lastVoice,
			rms,
			peak,
		};
	}

	async dispose() {
		this.disposed = true;
		if (this.context && this.context.state !== "closed")
			await this.context.close();
		this.unlocked = false;
	}

	static async renderOfflineTest() {
		const OfflineAudioContext =
			globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
		if (!OfflineAudioContext)
			return { supported: false, rms: 0, peak: 0, finite: true, samples: 0 };
		const context = new OfflineAudioContext(2, 22050 * 7, 22050);
		const graph = makeGraph(context, 0.1, 0.65);
		const audio = new JungleAudio();
		audio.context = context;
		audio.ctx = context;
		audio.graph = graph;
		audio.noise = seededNoise(context, 1.1);
		audio._offline = true;
		for (let stage = 0; stage < 4; stage++) {
			audio.stage = stage;
			for (let step = 0; step < 6; step++)
				audio._scoreStep(0.05 + stage * 0.55 + step * 0.08, step);
		}
		marimba(context, graph.effects, NOTE(84), 0.1, 0.3, 0.24);
		tone(context, graph.effects, 220, 0.45, 0.18, 0.18, "triangle", 660);
		hiss(context, graph.effects, audio.noise, 0.8, 0.24, 0.2, 1700, "lowpass");
		const names = [
			"jump",
			"swing",
			"grab",
			"land",
			"splash",
			"attack",
			"pickup",
			"hit",
			"checkpoint",
			"win",
			"menu",
			"bubble",
			"release",
		];
		names.forEach((name, index) => {
			audio._offlineTime = 2.2 + index * 0.16;
			audio.sfx(name);
		});
		audio._offlineTime = 5.4;
		audio.voice("rescue");
		const buffer = await context.startRendering();
		const samples = buffer.getChannelData(0);
		let sum = 0,
			peak = 0,
			finite = true,
			nonZero = 0;
		for (const sample of samples) {
			if (!Number.isFinite(sample)) finite = false;
			if (Math.abs(sample) > 0.00001) nonZero++;
			sum += sample * sample;
			peak = Math.max(peak, Math.abs(sample));
		}
		return {
			supported: true,
			rms: Math.sqrt(sum / samples.length),
			peak,
			finite,
			nonZero,
			samples: samples.length,
			musicVolume: 0.1,
			stages: 4,
			effects: audio.effectCount,
			voices: audio.voiceCount,
		};
	}
}
