// Demon Rumble: every sound is synthesized; no samples, speech service or audio files.
const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));
const frequency = (midi) => 440 * 2 ** ((midi - 69) / 12);

export class AudioDirector {
	constructor(options = {}) {
		this.context = null;
		this.musicVolume = 0.1;
		this.sfxVolume = 0.75;
		this.muted = false;
		this.paused = false;
		this.intensity = 0;
		this.step = 0;
		this.nextBeat = 0;
		this.events = {};
		this.scheduledNotes = 0;
		this.lastEvents = {};
		this.voiceSerial = 0;
		this.noiseSeed = 0x51f15e;
		if (options.context) this._initialize(options.context);
	}

	_initialize(context) {
		if (this.context) return;
		this.context = context;
		this.master = context.createGain();
		this.master.gain.value = this.muted ? 0 : 0.72;
		this.compressor = context.createDynamicsCompressor();
		this.compressor.threshold.value = -14;
		this.compressor.knee.value = 12;
		this.compressor.ratio.value = 5;
		this.compressor.attack.value = 0.003;
		this.compressor.release.value = 0.16;
		this.analyser = context.createAnalyser();
		this.analyser.fftSize = 256;
		this.master.connect(this.compressor);
		this.compressor.connect(this.analyser);
		this.analyser.connect(context.destination);
		this.musicBus = context.createGain();
		this.sfxBus = context.createGain();
		this.musicBus.gain.value = this.musicVolume;
		this.sfxBus.gain.value = this.sfxVolume;
		this.musicBus.connect(this.master);
		this.sfxBus.connect(this.master);
		// A short, filtered tape echo gives melodies depth without muddying shots.
		this.echo = context.createDelay(1);
		this.echo.delayTime.value = 3 / 22;
		this.echoFilter = context.createBiquadFilter();
		this.echoFilter.type = "lowpass";
		this.echoFilter.frequency.value = 1900;
		this.echoFeedback = context.createGain();
		this.echoFeedback.gain.value = 0.22;
		this.echoReturn = context.createGain();
		this.echoReturn.gain.value = 0.16;
		this.echo.connect(this.echoFilter);
		this.echoFilter.connect(this.echoFeedback);
		this.echoFeedback.connect(this.echo);
		this.echoFilter.connect(this.echoReturn);
		this.echoReturn.connect(this.musicBus);
		const frames = Math.ceil(context.sampleRate * 0.5);
		this.noiseBuffer = context.createBuffer(1, frames, context.sampleRate);
		const samples = this.noiseBuffer.getChannelData(0);
		let seed = this.noiseSeed;
		for (let index = 0; index < frames; index++) {
			seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
			samples[index] = (seed >>> 0) / 2147483648 - 1;
		}
		this.nextBeat = context.currentTime + 0.04;
	}

	async unlock() {
		if (!this.context) {
			const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
			if (!Context) return false;
			this._initialize(new Context());
		}
		if (
			this.context.state === "suspended" &&
			typeof this.context.startRendering !== "function"
		) {
			await this.context.resume();
		}
		this.paused = false;
		this.nextBeat = Math.max(this.nextBeat, this.context.currentTime + 0.015);
		return this.context.state !== "closed";
	}

	_gain(parameter, value) {
		if (!parameter || !this.context || this.context.state === "closed") return;
		parameter.cancelScheduledValues(this.context.currentTime);
		parameter.setTargetAtTime(value, this.context.currentTime, 0.025);
	}

	setMusic(value) {
		this.musicVolume = clamp01(value);
		this._gain(this.musicBus?.gain, this.musicVolume);
	}

	setSfx(value) {
		this.sfxVolume = clamp01(value);
		this._gain(this.sfxBus?.gain, this.sfxVolume);
	}

	setMuted(value) {
		this.muted = !!value;
		this._gain(this.master?.gain, this.muted ? 0 : 0.72);
	}

	suspend() {
		this.paused = true;
		if (
			this.context?.state === "running" &&
			typeof this.context.startRendering !== "function"
		) {
			this.context.suspend().catch(() => {});
		}
	}

	resume() {
		this.paused = false;
		if (
			this.context?.state === "suspended" &&
			typeof this.context.startRendering !== "function"
		) {
			this.context.resume().catch(() => {});
		}
		if (this.context) this.nextBeat = this.context.currentTime + 0.025;
	}

	_tone({
		time,
		duration = 0.12,
		freq = 440,
		endFreq,
		type = "triangle",
		gain = 0.15,
		bus = this.sfxBus,
		echo = false,
		pan = 0,
	}) {
		const context = this.context;
		const oscillator = context.createOscillator();
		const envelope = context.createGain();
		oscillator.type = type;
		oscillator.frequency.setValueAtTime(Math.max(12, freq), time);
		if (endFreq)
			oscillator.frequency.exponentialRampToValueAtTime(
				Math.max(12, endFreq),
				time + duration,
			);
		envelope.gain.setValueAtTime(0.0001, time);
		envelope.gain.exponentialRampToValueAtTime(
			Math.max(0.0002, gain),
			time + Math.min(0.008, duration * 0.15),
		);
		envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
		oscillator.connect(envelope);
		if (pan && context.createStereoPanner) {
			const panner = context.createStereoPanner();
			panner.pan.value = Math.max(-1, Math.min(1, pan));
			envelope.connect(panner);
			panner.connect(bus);
		} else envelope.connect(bus);
		if (echo) envelope.connect(this.echo);
		oscillator.start(time);
		oscillator.stop(time + duration + 0.01);
		this.scheduledNotes++;
	}

	_noise(
		time,
		duration,
		gain,
		cutoff = 2500,
		bus = this.sfxBus,
		highpass = false,
	) {
		const context = this.context;
		const source = context.createBufferSource();
		const filter = context.createBiquadFilter();
		const envelope = context.createGain();
		source.buffer = this.noiseBuffer;
		filter.type = highpass ? "highpass" : "lowpass";
		filter.frequency.setValueAtTime(cutoff, time);
		filter.Q.value = 0.7;
		envelope.gain.setValueAtTime(gain, time);
		envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
		source.connect(filter);
		filter.connect(envelope);
		envelope.connect(bus);
		source.start(time);
		source.stop(time + duration + 0.01);
	}

	_voice(time, kind) {
		// Burbling oscillator syllables through two formants: invented creature chatter.
		const patterns = {
			wave: [0, 4, 2, 7],
			boss: [-7, -10, -5, -12, -7],
			pickup: [7, 12, 9],
			victory: [0, 4, 7, 12, 7, 14],
		};
		const syllables = patterns[kind] || patterns.wave;
		const vowels = [
			[480, 1450],
			[720, 1100],
			[350, 2000],
			[600, 1700],
			[420, 850],
		];
		const context = this.context;
		const serial = this.voiceSerial++;
		syllables.forEach((note, index) => {
			const at = time + index * 0.105;
			const duration = 0.082 + (index % 2) * 0.018;
			const oscillator = context.createOscillator();
			const envelope = context.createGain();
			oscillator.type = "sawtooth";
			const base = frequency((kind === "boss" ? 47 : 64) + note);
			oscillator.frequency.setValueAtTime(base * 0.9, at);
			oscillator.frequency.exponentialRampToValueAtTime(
				base * 1.15,
				at + duration * 0.45,
			);
			oscillator.frequency.exponentialRampToValueAtTime(
				base * 0.97,
				at + duration,
			);
			const vowel = vowels[(index + serial) % vowels.length];
			vowel.forEach((formant, band) => {
				const filter = context.createBiquadFilter();
				filter.type = "bandpass";
				filter.frequency.value = formant;
				filter.Q.value = band ? 5 : 3;
				oscillator.connect(filter);
				filter.connect(envelope);
			});
			envelope.gain.setValueAtTime(0.0001, at);
			envelope.gain.exponentialRampToValueAtTime(0.23, at + 0.012);
			envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);
			envelope.connect(this.sfxBus);
			oscillator.start(at);
			oscillator.stop(at + duration + 0.005);
			this.scheduledNotes++;
		});
	}

	update(dt, intensity = 0) {
		this.intensity = clamp01(intensity);
		if (!this.context || this.paused || this.context.state === "closed") return;
		const now = this.context.currentTime;
		if (this.nextBeat < now - 0.1) this.nextBeat = now + 0.015;
		// 132 BPM, sixteenth-note sequencer; D minor / B-flat / G minor / A.
		const beatLength = 60 / 132 / 4;
		let scheduled = 0;
		while (this.nextBeat < now + 0.14 && scheduled++ < 8) {
			this._musicStep(this.nextBeat, this.step++);
			this.nextBeat += beatLength;
		}
	}

	_musicStep(time, step) {
		const local = step % 16;
		const bar = Math.floor(step / 16) % 8;
		const roots = [38, 38, 34, 34, 43, 43, 45, 45];
		const root = roots[bar];
		const bus = this.musicBus;
		if ([0, 3, 6, 8, 11, 14].includes(local)) {
			this._tone({
				time,
				freq: frequency(root + (local === 14 ? 12 : 0)),
				duration: 0.17,
				type: "triangle",
				gain: 0.48,
				bus,
			});
			this._tone({
				time,
				freq: frequency(root),
				duration: 0.12,
				type: "sine",
				gain: 0.2,
				bus,
			});
		}
		if (local === 0 || local === 8 || (this.intensity > 0.6 && local === 11)) {
			this._tone({
				time,
				freq: 145,
				endFreq: 43,
				duration: 0.17,
				type: "sine",
				gain: 0.5,
				bus,
			});
			this._noise(time, 0.028, 0.13, 2300, bus);
		}
		if (local === 4 || local === 12) {
			this._noise(time, 0.13, 0.25, 4200, bus, true);
			this._tone({
				time,
				freq: 185,
				endFreq: 100,
				duration: 0.07,
				type: "triangle",
				gain: 0.2,
				bus,
			});
		}
		if (local % 2 === 0 || this.intensity > 0.55) {
			this._noise(
				time,
				local === 14 ? 0.09 : 0.035,
				local % 4 === 2 ? 0.11 : 0.065,
				7200,
				bus,
				true,
			);
		}
		const motifA = [
			12,
			null,
			19,
			15,
			null,
			19,
			22,
			null,
			24,
			null,
			22,
			19,
			15,
			null,
			19,
			null,
		];
		const motifB = [
			24,
			null,
			19,
			null,
			22,
			19,
			15,
			null,
			19,
			null,
			15,
			12,
			null,
			10,
			12,
			null,
		];
		const note = (bar % 2 ? motifB : motifA)[local];
		if (note !== null) {
			const pitch = root + 12 + note;
			this._tone({
				time,
				freq: frequency(pitch),
				duration: local % 4 === 0 ? 0.22 : 0.105,
				type: "triangle",
				gain: 0.18,
				bus,
				echo: true,
				pan: ((local % 3) - 1) * 0.25,
			});
			if (this.intensity > 0.72 && local % 4 === 0) {
				this._tone({
					time: time + 0.01,
					freq: frequency(pitch - 12) * 1.003,
					duration: 0.17,
					type: "square",
					gain: 0.025,
					bus,
					echo: true,
				});
			}
		}
		if (local === 0) {
			[0, 7, bar === 6 || bar === 7 ? 4 : 3].forEach((interval, index) => {
				this._tone({
					time: time + index * 0.016,
					freq: frequency(root + 24 + interval),
					duration: 0.35,
					type: "triangle",
					gain: 0.06,
					bus,
					echo: true,
					pan: (index - 1) * 0.5,
				});
			});
		}
	}

	event(name) {
		this.events[name] = (this.events[name] || 0) + 1;
		if (!this.context || this.paused || this.context.state === "closed") return;
		const time = this.context.currentTime + 0.003;
		const throttle =
			{ shoot: 0.035, hit: 0.055, kill: 0.035, split: 0.07, menu: 0.045 }[
				name
			] || 0;
		if (time - (this.lastEvents[name] ?? -10) < throttle) return;
		this.lastEvents[name] = time;
		const tone = (options) => this._tone({ time, ...options });
		switch (name) {
			case "shoot":
				tone({
					freq: 1150,
					endFreq: 380,
					duration: 0.075,
					type: "square",
					gain: 0.055,
				});
				tone({
					freq: 1900,
					endFreq: 700,
					duration: 0.035,
					type: "triangle",
					gain: 0.045,
				});
				break;
			case "hit":
				this._noise(time, 0.14, 0.3, 2600);
				tone({
					freq: 180,
					endFreq: 43,
					duration: 0.23,
					type: "sawtooth",
					gain: 0.13,
				});
				break;
			case "kill":
				this._noise(time, 0.11, 0.19, 3300);
				tone({
					freq: 330,
					endFreq: 58,
					duration: 0.17,
					type: "triangle",
					gain: 0.2,
				});
				break;
			case "split":
				tone({
					freq: 220,
					endFreq: 650,
					duration: 0.14,
					type: "sawtooth",
					gain: 0.07,
					pan: -0.35,
				});
				this._tone({
					time: time + 0.025,
					freq: 330,
					endFreq: 980,
					duration: 0.14,
					type: "triangle",
					gain: 0.13,
					pan: 0.35,
				});
				break;
			case "dash":
				this._noise(time, 0.19, 0.22, 5000, this.sfxBus, true);
				tone({
					freq: 120,
					endFreq: 650,
					duration: 0.14,
					type: "sine",
					gain: 0.16,
				});
				break;
			case "pulse":
				tone({
					freq: 72,
					endFreq: 28,
					duration: 0.55,
					type: "sine",
					gain: 0.56,
				});
				tone({
					freq: 1400,
					endFreq: 90,
					duration: 0.46,
					type: "sawtooth",
					gain: 0.12,
				});
				this._noise(time, 0.43, 0.34, 6500);
				[0, 7, 12, 19].forEach((interval, index) =>
					this._tone({
						time: time + 0.04 + index * 0.025,
						freq: frequency(74 + interval),
						duration: 0.25,
						gain: 0.1,
						type: "triangle",
						pan: index / 2 - 0.75,
					}),
				);
				break;
			case "pickup":
				[0, 7, 12].forEach((note, index) =>
					this._tone({
						time: time + index * 0.065,
						freq: frequency(77 + note),
						duration: 0.13,
						type: "triangle",
						gain: 0.15,
					}),
				);
				this._voice(time + 0.06, name);
				break;
			case "boss":
				tone({
					freq: 70,
					endFreq: 39,
					duration: 0.8,
					type: "sawtooth",
					gain: 0.11,
				});
				this._noise(time, 0.7, 0.2, 1400);
				this._voice(time + 0.15, name);
				break;
			case "wave":
				[0, 3, 7, 12].forEach((note, index) =>
					this._tone({
						time: time + index * 0.085,
						freq: frequency(62 + note),
						duration: 0.2,
						type: "triangle",
						gain: 0.12,
					}),
				);
				this._voice(time + 0.1, name);
				break;
			case "victory":
				[0, 4, 7, 12, 7, 12, 16, 19].forEach((note, index) =>
					this._tone({
						time: time + index * 0.13,
						freq: frequency(65 + note),
						duration: 0.3,
						type: "triangle",
						gain: 0.16,
						echo: true,
					}),
				);
				this._voice(time + 0.2, name);
				break;
			case "defeat":
				[12, 7, 3, 0, -12].forEach((note, index) =>
					this._tone({
						time: time + index * 0.17,
						freq: frequency(57 + note),
						duration: 0.35,
						type: "triangle",
						gain: 0.18,
					}),
				);
				break;
			case "menu":
				tone({
					freq: 660,
					endFreq: 880,
					duration: 0.065,
					type: "sine",
					gain: 0.1,
				});
				break;
			default:
				break;
		}
	}

	diagnostics() {
		let rms = 0;
		if (this.analyser) {
			const samples = new Float32Array(this.analyser.fftSize);
			this.analyser.getFloatTimeDomainData(samples);
			rms = Math.sqrt(
				samples.reduce((sum, sample) => sum + sample * sample, 0) /
					samples.length,
			);
		}
		return {
			state: this.context?.state || "locked",
			musicVolume: this.musicVolume,
			sfxVolume: this.sfxVolume,
			muted: this.muted,
			paused: this.paused,
			sequencerStep: this.step,
			scheduledNotes: this.scheduledNotes,
			events: { ...this.events },
			rms,
			voices: this.voiceSerial,
		};
	}

	dispose() {
		this.paused = true;
		if (this.context && typeof this.context.close === "function")
			this.context.close().catch(() => {});
	}
}

export async function renderAudioProbe() {
	const OfflineContext =
		globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
	if (!OfflineContext) return { supported: false };
	const context = new OfflineContext(2, 48000, 48000);
	const director = new AudioDirector({ context });
	director.update(0.016, 0.8);
	director.event("shoot");
	director.event("pickup");
	director.event("pulse");
	const rendered = await context.startRendering();
	let sum = 0;
	let peak = 0;
	let finite = true;
	for (let channel = 0; channel < rendered.numberOfChannels; channel++) {
		for (const sample of rendered.getChannelData(channel)) {
			finite &&= Number.isFinite(sample);
			sum += sample * sample;
			peak = Math.max(peak, Math.abs(sample));
		}
	}
	return {
		supported: true,
		finite,
		rms: Math.sqrt(sum / (rendered.length * rendered.numberOfChannels)),
		peak,
		frames: rendered.length,
		musicVolume: director.musicVolume,
		voices: director.voiceSerial,
		events: { ...director.events },
	};
}
