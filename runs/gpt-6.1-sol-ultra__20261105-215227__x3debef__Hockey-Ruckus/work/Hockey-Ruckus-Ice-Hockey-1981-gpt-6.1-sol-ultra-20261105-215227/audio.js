// Hockey Ruckus: every sound is synthesized at runtime. No sound assets are loaded.
const audioClamp = (v, min = 0, max = 1) =>
	Math.max(min, Math.min(max, Number(v) || 0));
const audioMidi = (n) => 440 * 2 ** ((n - 69) / 12);

export class HockeyAudio {
	constructor(options = {}) {
		this.ctx = options.context || null;
		this.musicVolume = 0.1;
		this.sfxVolume = 0.72;
		this.playing = false;
		this.offline = !!options.offline;
		this.nextBeat = 0;
		this.beat = 0;
		this.timer = null;
		this.graphReady = false;
		this.lastEvents = {};
		this.voiceUntil = 0;
		this.seed = 0x81c0ffee;
		if (this.ctx) this.buildGraph();
	}

	random() {
		this.seed ^= this.seed << 13;
		this.seed ^= this.seed >>> 17;
		this.seed ^= this.seed << 5;
		return (this.seed >>> 0) / 4294967296;
	}

	async unlock() {
		if (!this.ctx) {
			const AudioContextClass =
				globalThis.AudioContext || globalThis.webkitAudioContext;
			if (!AudioContextClass) return false;
			this.ctx = new AudioContextClass({ latencyHint: "interactive" });
		}
		this.buildGraph();
		if (this.ctx.state === "suspended") await this.ctx.resume();
		if (!this.offline && !this.timer) {
			this.timer = setInterval(() => this.schedule(), 80);
		}
		this.nextBeat = Math.max(this.nextBeat, this.ctx.currentTime + 0.05);
		this.schedule();
		return this.ctx.state === "running";
	}

	buildGraph() {
		if (this.graphReady || !this.ctx) return;
		const ctx = this.ctx;
		this.master = ctx.createGain();
		this.master.gain.value = 0.76;
		this.limiter = ctx.createDynamicsCompressor();
		this.limiter.threshold.value = -12;
		this.limiter.knee.value = 12;
		this.limiter.ratio.value = 7;
		this.limiter.attack.value = 0.002;
		this.limiter.release.value = 0.13;
		this.master.connect(this.limiter);
		this.analyser = ctx.createAnalyser();
		this.analyser.fftSize = 512;
		this.limiter.connect(this.analyser);
		this.analyser.connect(ctx.destination);
		this.music = ctx.createGain();
		this.music.gain.value = this.musicVolume;
		this.music.connect(this.master);
		this.effects = ctx.createGain();
		this.effects.gain.value = this.sfxVolume;
		this.effects.connect(this.master);
		this.voice = ctx.createGain();
		this.voice.gain.value = this.sfxVolume * 0.65;
		this.voice.connect(this.master);

		// A short rink-like slapback, kept quieter than the dry effects.
		this.echo = ctx.createDelay(0.5);
		this.echo.delayTime.value = 0.115;
		this.echoGain = ctx.createGain();
		this.echoGain.gain.value = 0.12;
		this.echoTone = ctx.createBiquadFilter();
		this.echoTone.type = "lowpass";
		this.echoTone.frequency.value = 1800;
		this.effects.connect(this.echo);
		this.echo.connect(this.echoTone);
		this.echoTone.connect(this.echoGain);
		this.echoGain.connect(this.master);

		this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
		const data = this.noise.getChannelData(0);
		let low = 0;
		for (let i = 0; i < data.length; i++) {
			const white = this.random() * 2 - 1;
			low = low * 0.7 + white * 0.3;
			data[i] = white * 0.65 + low * 0.35;
		}
		this.graphReady = true;
		if (!this.offline) {
			ctx.addEventListener("statechange", () => {
				if (ctx.state === "running") this.nextBeat = ctx.currentTime + 0.08;
			});
		}
	}

	setMusic(value) {
		this.musicVolume = audioClamp(value);
		if (this.music)
			this.music.gain.setTargetAtTime(
				this.musicVolume,
				this.ctx.currentTime,
				0.04,
			);
	}

	setSfx(value) {
		this.sfxVolume = audioClamp(value);
		if (this.effects) {
			this.effects.gain.setTargetAtTime(
				this.sfxVolume,
				this.ctx.currentTime,
				0.025,
			);
			this.voice.gain.setTargetAtTime(
				this.sfxVolume * 0.65,
				this.ctx.currentTime,
				0.025,
			);
		}
	}

	setPlaying(value) {
		const changed = this.playing !== !!value;
		this.playing = !!value;
		if (changed && this.ctx) this.nextBeat = this.ctx.currentTime + 0.06;
		if (this.music && !this.offline) {
			this.music.gain.setTargetAtTime(
				this.playing ? this.musicVolume : 0,
				this.ctx.currentTime,
				0.09,
			);
		}
		if (this.playing) this.schedule();
	}

	schedule() {
		if (
			!this.ctx ||
			!this.graphReady ||
			this.offline ||
			!this.playing ||
			this.ctx.state !== "running"
		)
			return;
		if (this.nextBeat < this.ctx.currentTime)
			this.nextBeat = this.ctx.currentTime + 0.03;
		while (this.nextBeat < this.ctx.currentTime + 0.18) {
			this.musicBeat(this.beat++, this.nextBeat);
			this.nextBeat += 60 / 138 / 2;
		}
	}

	tone(
		frequency,
		time,
		duration,
		volume,
		type = "sine",
		destination = this.effects,
		endFrequency = frequency,
		pan = 0,
	) {
		const ctx = this.ctx;
		const oscillator = ctx.createOscillator();
		const envelope = ctx.createGain();
		const panner = ctx.createStereoPanner();
		oscillator.type = type;
		oscillator.frequency.setValueAtTime(Math.max(20, frequency), time);
		if (endFrequency !== frequency)
			oscillator.frequency.exponentialRampToValueAtTime(
				Math.max(20, endFrequency),
				time + duration * 0.88,
			);
		envelope.gain.setValueAtTime(0.0001, time);
		envelope.gain.exponentialRampToValueAtTime(
			Math.max(0.0002, volume),
			time + Math.min(0.009, duration * 0.15),
		);
		envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
		panner.pan.value = audioClamp(pan, -1, 1);
		oscillator.connect(envelope);
		envelope.connect(panner);
		panner.connect(destination);
		oscillator.start(time);
		oscillator.stop(time + duration + 0.025);
		oscillator.onended = () => {
			oscillator.disconnect();
			envelope.disconnect();
			panner.disconnect();
		};
	}

	hiss(
		time,
		duration,
		volume,
		frequency = 2800,
		q = 0.8,
		destination = this.effects,
		pan = 0,
		type = "bandpass",
	) {
		const ctx = this.ctx;
		const source = ctx.createBufferSource();
		const filter = ctx.createBiquadFilter();
		const envelope = ctx.createGain();
		const panner = ctx.createStereoPanner();
		source.buffer = this.noise;
		source.loop = true;
		filter.type = type;
		filter.frequency.value = frequency;
		filter.Q.value = q;
		envelope.gain.setValueAtTime(0.0001, time);
		envelope.gain.linearRampToValueAtTime(
			volume,
			time + Math.min(0.015, duration / 4),
		);
		envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
		panner.pan.value = audioClamp(pan, -1, 1);
		source.connect(filter);
		filter.connect(envelope);
		envelope.connect(panner);
		panner.connect(destination);
		source.start(time, this.random());
		source.stop(time + duration + 0.01);
		source.onended = () => {
			source.disconnect();
			filter.disconnect();
			envelope.disconnect();
			panner.disconnect();
		};
	}

	organ(note, time, duration, volume = 0.15) {
		const f = audioMidi(note);
		this.tone(f, time, duration, volume, "sine", this.music, f, -0.12);
		this.tone(
			f * 2,
			time,
			duration * 0.92,
			volume * 0.45,
			"sine",
			this.music,
			f * 2,
			0.12,
		);
		this.tone(
			f * 3,
			time,
			duration * 0.8,
			volume * 0.12,
			"triangle",
			this.music,
			f * 3,
		);
	}

	musicBeat(step, time) {
		// Original 8-bar shuffle: F major, D minor, Bb, C. Two eighth notes per beat.
		const bar = Math.floor(step / 8) % 8;
		const eighth = step % 8;
		const roots = [41, 41, 38, 38, 46, 46, 48, 48];
		const chords = [
			[65, 69, 72],
			[65, 69, 72],
			[62, 65, 69],
			[62, 65, 69],
			[62, 65, 70],
			[62, 65, 70],
			[64, 67, 72],
			[64, 67, 72],
		];
		const riffs = [
			[77, 0, 76, 74, 72, 0, 69, 72],
			[74, 72, 69, 0, 67, 69, 72, 0],
			[74, 0, 72, 69, 65, 0, 69, 72],
			[74, 72, 69, 0, 65, 69, 72, 0],
			[77, 0, 77, 74, 70, 0, 74, 77],
			[79, 77, 74, 0, 72, 74, 77, 0],
			[76, 0, 74, 72, 67, 0, 72, 74],
			[76, 74, 72, 0, 67, 69, 71, 72],
		];
		const swing = eighth % 2 ? 0.028 : 0;
		const t = time + swing;
		if (eighth % 2 === 0) {
			const bass = roots[bar] + (eighth === 4 ? 7 : 0);
			this.tone(audioMidi(bass), t, 0.19, 0.27, "triangle", this.music);
			this.tone(105, t, 0.1, 0.28, "sine", this.music, 42);
		}
		if (eighth === 2 || eighth === 6) {
			this.hiss(t, 0.09, 0.21, 1750, 0.7, this.music);
			for (const note of chords[bar]) this.organ(note, t, 0.135, 0.1);
		}
		this.hiss(
			t,
			eighth % 2 ? 0.035 : 0.022,
			0.065,
			6700,
			0.65,
			this.music,
			eighth % 2 ? -0.3 : 0.3,
			"highpass",
		);
		const note = riffs[bar][eighth];
		if (note) this.organ(note, t, 0.145, bar === 7 ? 0.16 : 0.12);
	}

	play(name, strength = 1) {
		if (!this.graphReady || (!this.offline && this.ctx.state !== "running"))
			return;
		const t = this.ctx.currentTime + 0.005;
		const s = audioClamp(strength, 0.1, 1.5);
		const minimumInterval =
			{ board: 0.065, pickup: 0.1, ui: 0.045, skate: 0.15, crowd: 1.5 }[name] ||
			0.025;
		if (
			this.lastEvents[name] !== undefined &&
			t - this.lastEvents[name] < minimumInterval
		)
			return;
		this.lastEvents[name] = t;
		switch (name) {
			case "shot":
				this.hiss(t, 0.095, 0.43 * s, 2100, 0.65);
				this.tone(210, t, 0.095, 0.5 * s, "triangle", this.effects, 65);
				this.tone(1300, t, 0.025, 0.16 * s, "sine", this.effects, 620);
				break;
			case "pass":
				this.hiss(t, 0.055, 0.28 * s, 2800, 0.7);
				this.tone(360, t, 0.055, 0.27 * s, "triangle", this.effects, 140);
				break;
			case "pickup":
				this.tone(740, t, 0.035, 0.12 * s, "triangle", this.effects, 980);
				this.tone(1480, t, 0.018, 0.035 * s);
				break;
			case "check":
				this.tone(120, t, 0.19, 0.65 * s, "sine", this.effects, 36);
				this.hiss(t, 0.15, 0.42 * s, 600, 0.5);
				this.hiss(t + 0.04, 0.19, 0.22 * s, 3200, 1);
				break;
			case "board":
				this.tone(180, t, 0.07, 0.3 * s, "triangle", this.effects, 95);
				this.tone(570, t, 0.035, 0.13 * s, "triangle", this.effects, 340);
				this.hiss(t, 0.045, 0.22 * s, 1400, 0.8);
				break;
			case "goal":
				for (const f of [146.83, 220, 293.66]) {
					this.tone(
						f * 0.98,
						t,
						0.85,
						0.14 * s,
						"sawtooth",
						this.effects,
						f * 1.01,
					);
					this.tone(f, t + 0.97, 0.5, 0.12 * s, "triangle");
				}
				this.hiss(t + 0.1, 1.5, 0.28 * s, 1600, 0.6);
				this.cheer(t + 0.15, s);
				break;
			case "whistle":
				for (const delay of [0, 0.18]) {
					this.tone(
						2850,
						t + delay,
						0.13,
						0.17 * s,
						"sine",
						this.effects,
						3150,
					);
					this.tone(3500, t + delay, 0.11, 0.065 * s);
					this.hiss(t + delay, 0.11, 0.07 * s, 3100, 8);
				}
				break;
			case "crowd":
				this.cheer(t, s);
				break;
			case "ui":
				this.tone(660, t, 0.045, 0.1 * s, "triangle", this.effects, 880);
				this.tone(1320, t + 0.025, 0.04, 0.035 * s);
				break;
			case "win":
				[60, 64, 67, 72, 76, 79, 84].forEach((note, i) => {
					this.tone(
						audioMidi(note),
						t + i * 0.11,
						i === 6 ? 0.6 : 0.17,
						0.16 * s,
						"triangle",
					);
					this.tone(audioMidi(note - 12), t + i * 0.11, 0.2, 0.1 * s);
				});
				this.cheer(t + 0.35, s);
				break;
			case "lose":
				[67, 65, 62, 60, 55].forEach((note, i) =>
					this.tone(audioMidi(note), t + i * 0.19, 0.25, 0.17 * s, "triangle"),
				);
				break;
			case "skate":
				this.hiss(t, 0.16, 0.1 * s, 4600, 0.65);
				break;
			case "count":
				this.tone(440, t, 0.12, 0.18 * s, "triangle");
				this.tone(880, t, 0.085, 0.06 * s);
				break;
			default:
				break;
		}
	}

	cheer(time, strength = 1) {
		this.hiss(time, 1.25, 0.28 * strength, 950, 0.45, this.effects, -0.35);
		this.hiss(time + 0.14, 1.1, 0.22 * strength, 2100, 0.65, this.effects, 0.4);
		for (let i = 0; i < 9; i++) {
			const t = time + i * 0.095 + this.random() * 0.04;
			const f = 380 + this.random() * 410;
			this.tone(
				f,
				t,
				0.28,
				0.022 * strength,
				"triangle",
				this.effects,
				f * 1.35,
				this.random() * 1.5 - 0.75,
			);
		}
	}

	say(event = "ready") {
		if (!this.graphReady || (!this.offline && this.ctx.state !== "running"))
			return;
		const now = this.ctx.currentTime + 0.02;
		if (now < this.voiceUntil - 0.05) return;
		const phrases = {
			goal: [1, 4, 2, 5, 6, 3, 6, 7],
			ready: [2, 0, 4, 1, 5],
			win: [1, 3, 6, 5, 7, 7],
			lose: [3, 2, 1, 0],
			check: [5, 1, 4],
			overtime: [1, 4, 2, 6, 3, 7],
			hello: [0, 3, 1, 5],
		};
		const phrase = phrases[event] || phrases.ready;
		const rising = event === "goal" || event === "win";
		let time = now;
		for (let i = 0; i < phrase.length; i++) {
			const vowel = phrase[i];
			const duration =
				i === phrase.length - 1 ? 0.19 : 0.08 + this.random() * 0.045;
			const pitch = 155 + vowel * 15 + (rising ? i * 9 : -i * 3);
			this.syllable(pitch, vowel, time, duration);
			time += duration + 0.025 + (i === 2 ? 0.075 : 0);
		}
		this.voiceUntil = time;
	}

	syllable(pitch, vowel, time, duration) {
		const ctx = this.ctx;
		const vowels = [
			[700, 1150],
			[400, 1900],
			[330, 2300],
			[500, 900],
			[350, 700],
			[780, 1450],
			[580, 1700],
			[450, 2100],
		];
		const oscillator = ctx.createOscillator();
		const envelope = ctx.createGain();
		oscillator.type = "sawtooth";
		oscillator.frequency.setValueAtTime(pitch, time);
		oscillator.frequency.exponentialRampToValueAtTime(
			pitch * (1.08 + this.random() * 0.15),
			time + duration,
		);
		envelope.gain.setValueAtTime(0.0001, time);
		envelope.gain.linearRampToValueAtTime(0.13, time + 0.013);
		envelope.gain.setValueAtTime(0.1, time + duration * 0.65);
		envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
		const formants = vowels[vowel % vowels.length].map((frequency) => {
			const filter = ctx.createBiquadFilter();
			filter.type = "bandpass";
			filter.frequency.value = frequency;
			filter.Q.value = 5;
			oscillator.connect(filter);
			filter.connect(envelope);
			return filter;
		});
		envelope.connect(this.voice);
		oscillator.start(time);
		oscillator.stop(time + duration + 0.01);
		oscillator.onended = () => {
			oscillator.disconnect();
			envelope.disconnect();
			formants.forEach((filter) => filter.disconnect());
		};
		this.hiss(time, 0.025, 0.04, 1800 + vowel * 270, 2, this.voice);
	}

	getLevels() {
		if (!this.analyser) return { rms: 0, peak: 0 };
		const samples = new Float32Array(this.analyser.fftSize);
		this.analyser.getFloatTimeDomainData(samples);
		let square = 0;
		let peak = 0;
		for (const sample of samples) {
			square += sample * sample;
			peak = Math.max(peak, Math.abs(sample));
		}
		return { rms: Math.sqrt(square / samples.length), peak };
	}

	dispose() {
		if (this.timer) clearInterval(this.timer);
		this.timer = null;
		this.playing = false;
		if (this.ctx && !this.offline && this.ctx.state !== "closed")
			return this.ctx.close();
	}
}

export async function renderAudioProbe(
	OfflineContext = globalThis.OfflineAudioContext ||
		globalThis.webkitOfflineAudioContext,
) {
	if (!OfflineContext) throw new Error("OfflineAudioContext is unavailable");
	const metrics = {};
	for (const kind of ["music", "effects", "voice"]) {
		const ctx = new OfflineContext(2, 44100 * 3, 44100);
		const audio = new HockeyAudio({ context: ctx, offline: true });
		if (kind === "music") {
			for (let i = 0; i < 12; i++)
				audio.musicBeat(i, 0.04 + i * (60 / 138 / 2));
		} else if (kind === "effects") {
			audio.play("goal");
			audio.play("shot");
			audio.play("check");
			audio.play("whistle");
		} else audio.say("goal");
		const buffer = await ctx.startRendering();
		const samples = buffer.getChannelData(0);
		let square = 0;
		let peak = 0;
		let nonFinite = 0;
		for (const sample of samples) {
			if (!Number.isFinite(sample)) nonFinite++;
			square += sample * sample;
			peak = Math.max(peak, Math.abs(sample));
		}
		metrics[kind] = {
			rms: Math.sqrt(square / samples.length),
			peak,
			nonFinite,
		};
	}
	return { musicVolume: 0.1, ...metrics };
}
