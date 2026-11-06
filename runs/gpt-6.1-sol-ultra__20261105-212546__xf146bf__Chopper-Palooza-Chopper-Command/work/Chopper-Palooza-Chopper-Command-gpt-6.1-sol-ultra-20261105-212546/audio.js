/** Chopper Palooza — original Web Audio score, effects, rotor, and radio gibberish. */
export class AudioEngine {
	constructor({ context = null } = {}) {
		this.context = context;
		this.musicVolume = 0.1;
		this.effectsVolume = 0.65;
		this.ready = false;
		this.playing = false;
		this.step = 0;
		this.nextBeat = 0;
		this.boss = false;
		this.last = Object.create(null);
		this.stats = {
			notes: 0,
			effects: 0,
			voices: 0,
			musicSteps: 0,
			rotorUpdates: 0,
		};
		this.randomState = 1982;
	}

	random() {
		this.randomState =
			(Math.imul(this.randomState, 1664525) + 1013904223) >>> 0;
		return this.randomState / 4294967296;
	}

	async start() {
		if (this.ready) {
			if (
				this.context.state === "suspended" &&
				this.context.resume &&
				!this.context.startRendering
			)
				await this.context.resume();
			return;
		}
		const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
		if (!this.context && !Context) return;
		this.context ||= new Context();
		const c = this.context;
		this.master = c.createGain();
		this.master.gain.value = 0.58;
		this.compressor = c.createDynamicsCompressor();
		this.compressor.threshold.value = -14;
		this.compressor.knee.value = 12;
		this.compressor.ratio.value = 5;
		this.compressor.attack.value = 0.008;
		this.compressor.release.value = 0.15;
		this.master.connect(this.compressor).connect(c.destination);
		this.music = c.createGain();
		this.music.gain.value = this.musicVolume;
		this.music.connect(this.master);
		this.effects = c.createGain();
		this.effects.gain.value = this.effectsVolume;
		this.effects.connect(this.master);
		this.noiseBuffer = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
		const samples = this.noiseBuffer.getChannelData(0);
		let brown = 0;
		for (let i = 0; i < samples.length; i++) {
			brown = (brown + (this.random() * 2 - 1) * 0.08) / 1.025;
			samples[i] = brown * 2.2;
		}
		this.rotor = c.createOscillator();
		this.rotor.type = "triangle";
		this.rotor.frequency.value = 47;
		this.rotorLow = c.createBiquadFilter();
		this.rotorLow.type = "lowpass";
		this.rotorLow.frequency.value = 175;
		this.rotorAmp = c.createGain();
		this.rotorAmp.gain.value = 0;
		this.rotorPulse = c.createOscillator();
		this.rotorPulse.frequency.value = 17;
		this.rotorPulse.type = "sine";
		this.rotorDepth = c.createGain();
		this.rotorDepth.gain.value = 0.016;
		this.rotorPulse.connect(this.rotorDepth).connect(this.rotorAmp.gain);
		this.rotor
			.connect(this.rotorLow)
			.connect(this.rotorAmp)
			.connect(this.effects);
		this.rotor.start();
		this.rotorPulse.start();
		this.ready = true;
		this.nextBeat = c.currentTime + 0.08;
		if (c.state === "suspended" && c.resume && !c.startRendering)
			await c.resume();
	}

	setVolume(music = this.musicVolume, sfx = this.effectsVolume) {
		this.musicVolume = Math.max(0, Math.min(1, Number(music)));
		this.effectsVolume = Math.max(0, Math.min(1, Number(sfx)));
		if (!this.ready) return;
		const t = this.context.currentTime;
		this.music.gain.setTargetAtTime(this.musicVolume, t, 0.035);
		this.effects.gain.setTargetAtTime(this.effectsVolume, t, 0.035);
	}

	note(
		freq,
		duration,
		amplitude = 0.1,
		type = "triangle",
		at = null,
		bus = null,
		slide = null,
	) {
		if (!this.ready) return;
		const c = this.context,
			t = at ?? c.currentTime;
		const osc = c.createOscillator(),
			env = c.createGain();
		osc.type = type;
		osc.frequency.setValueAtTime(Math.max(15, freq), t);
		if (slide != null)
			osc.frequency.exponentialRampToValueAtTime(
				Math.max(15, slide),
				t + duration,
			);
		env.gain.setValueAtTime(0.0001, t);
		env.gain.exponentialRampToValueAtTime(
			Math.max(0.0002, amplitude),
			t + 0.006,
		);
		env.gain.exponentialRampToValueAtTime(0.0001, t + duration);
		osc.connect(env).connect(bus || this.effects);
		osc.start(t);
		osc.stop(t + duration + 0.02);
		this.stats.notes++;
	}

	noise(
		duration,
		amp,
		at = null,
		frequency = 1800,
		bus = null,
		type = "bandpass",
	) {
		if (!this.ready) return;
		const c = this.context,
			t = at ?? c.currentTime;
		const source = c.createBufferSource(),
			filter = c.createBiquadFilter(),
			env = c.createGain();
		source.buffer = this.noiseBuffer;
		filter.type = type;
		filter.frequency.value = frequency;
		filter.Q.value = 0.7;
		env.gain.setValueAtTime(Math.max(0.0002, amp), t);
		env.gain.exponentialRampToValueAtTime(0.0001, t + duration);
		source
			.connect(filter)
			.connect(env)
			.connect(bus || this.effects);
		source.start(t, this.random() * 0.8);
		source.stop(t + duration + 0.02);
	}

	update(dt, { playing = false, throttle = 0, danger = 0, boss = false } = {}) {
		if (!this.ready) return;
		const c = this.context,
			t = c.currentTime;
		this.playing = playing;
		this.boss = boss;
		this.rotorAmp.gain.setTargetAtTime(
			playing ? 0.045 + Math.abs(throttle) * 0.02 : 0,
			t,
			0.1,
		);
		this.rotorDepth.gain.setTargetAtTime(playing ? 0.018 : 0, t, 0.1);
		this.rotor.frequency.setTargetAtTime(43 + Math.abs(throttle) * 19, t, 0.12);
		this.rotorPulse.frequency.setTargetAtTime(
			16 + Math.abs(throttle) * 8,
			t,
			0.12,
		);
		this.stats.rotorUpdates++;
		// Audio-clock scheduling keeps the sequencer steady through variable render timing.
		if (this.nextBeat < t - 0.25) this.nextBeat = t + 0.02;
		let scheduled = 0;
		while (this.nextBeat < t + 0.14 && scheduled++ < 8) {
			this.musicStep(this.step++, this.nextBeat, playing, danger, boss);
			this.nextBeat +=
				(60 / (boss ? 122 : 112) / 4) * (this.step % 2 ? 1.075 : 0.925);
		}
	}

	musicStep(step, at, playing, danger, boss) {
		const beat = step % 16,
			bar = Math.floor(step / 16) % 8;
		const chords = [45, 45, 48, 43, 45, 45, 41, 43];
		const root = chords[bar] + (boss ? 12 : 0);
		const hz = (n) => 440 * 2 ** ((n - 69) / 12);
		const bus = this.music;
		this.stats.musicSteps++;
		if (beat === 0 || beat === 8 || (boss && beat === 11)) {
			this.note(128, 0.19, 0.7, "sine", at, bus, 43);
			this.noise(0.032, 0.17, at, 700, bus);
		}
		if (beat === 4 || beat === 12) {
			this.noise(0.16, 0.48, at, 1600, bus, "highpass");
			this.note(176, 0.09, 0.12, "triangle", at, bus, 112);
		}
		if (beat % 2 === 0 || boss)
			this.noise(beat === 14 ? 0.1 : 0.035, 0.13, at, 4800, bus, "highpass");
		if ([0, 3, 6, 8, 10, 14].includes(beat)) {
			const offset = beat === 6 || beat === 14 ? 12 : beat === 10 ? 7 : 0;
			this.note(hz(root - 12 + offset), 0.18, 0.3, "triangle", at, bus);
			this.note(hz(root - 12 + offset) * 2, 0.07, 0.06, "sine", at, bus);
		}
		if (beat === 2 || beat === 10) {
			for (const n of [0, 3, 7])
				this.note(hz(root + 12 + n), 0.13, 0.055, "triangle", at, bus);
		}
		const melody = [
			12,
			null,
			15,
			19,
			null,
			17,
			15,
			12,
			10,
			null,
			7,
			10,
			12,
			null,
			15,
			7,
		];
		if ((playing || step % 2 === 0) && melody[beat] !== null) {
			const semitone = melody[beat] + (bar % 4 === 3 ? -2 : 0);
			this.note(
				hz(root + 12 + semitone),
				beat === 15 ? 0.23 : 0.12,
				playing ? 0.1 : 0.065,
				"triangle",
				at,
				bus,
			);
			if (boss || danger > 0.7)
				this.note(hz(root + semitone), 0.08, 0.025, "sawtooth", at, bus);
		}
	}

	sfx(name) {
		if (!this.ready) return;
		const t = this.context.currentTime;
		const spacing = name === "shoot" ? 0.045 : name === "boom" ? 0.06 : 0.015;
		if (t - (this.last[name] ?? -100) < spacing) return;
		this.last[name] = t;
		this.stats.effects++;
		const tone = (f, d, a = 0.12, type = "triangle", delay = 0, slide = null) =>
			this.note(f, d, a, type, t + delay, null, slide);
		switch (name) {
			case "shoot":
				tone(740 + this.random() * 80, 0.065, 0.105, "triangle", 0, 210);
				this.noise(0.045, 0.12, t, 1900);
				break;
			case "hit":
				this.noise(0.12, 0.31, t, 1100);
				tone(170, 0.13, 0.18, "square", 0, 65);
				break;
			case "boom":
				this.noise(0.65, 0.9, t, 470, null, "lowpass");
				this.noise(0.24, 0.36, t, 1700);
				tone(132, 0.48, 0.45, "sine", 0, 28);
				break;
			case "rescue":
			case "pickup":
				[523.25, 659.25, 783.99, 1046.5].forEach((n, i) => {
					tone(n, 0.22, 0.15, "triangle", i * 0.08);
				});
				break;
			case "flare":
				this.noise(0.7, 0.6, t, 2600);
				tone(190, 0.45, 0.24, "sine", 0, 1200);
				tone(850, 0.5, 0.1, "triangle", 0.06, 90);
				break;
			case "menu":
				tone(660, 0.07, 0.09, "sine");
				tone(880, 0.05, 0.07, "sine", 0.04);
				break;
			case "start":
				[220, 330, 440, 660].forEach((n, i) => {
					tone(n, 0.26, 0.17, "triangle", i * 0.09);
				});
				break;
			case "victory":
				[440, 554.37, 659.25, 880, 659.25, 880, 1108.73].forEach((n, i) => {
					tone(n, i === 6 ? 0.8 : 0.32, 0.17, "triangle", i * 0.16);
				});
				break;
			case "loss":
				[440, 392, 329.63, 220].forEach((n, i) => {
					tone(n, 0.47, 0.17, "triangle", i * 0.22);
				});
				break;
			default:
				tone(440, 0.08, 0.06, "sine");
		}
	}

	voice(seed = "copy") {
		if (!this.ready) return;
		const c = this.context,
			t = c.currentTime;
		let value =
			typeof seed === "number"
				? seed
				: [...String(seed)].reduce(
						(n, x) => Math.imul(n, 31) + x.charCodeAt(0),
						7,
					);
		const rand = () => {
			value = (Math.imul(value, 1103515245) + 12345) >>> 0;
			return value / 4294967296;
		};
		const vowels = [
			[600, 1100],
			[350, 2200],
			[500, 900],
			[300, 800],
			[650, 1700],
		];
		const syllables = 5 + Math.floor(rand() * 4);
		for (let i = 0; i < syllables; i++) {
			const at = t + i * 0.085,
				d = 0.055 + rand() * 0.033;
			const vowel = vowels[Math.floor(rand() * vowels.length)];
			const osc = c.createOscillator(),
				env = c.createGain();
			osc.type = "sawtooth";
			osc.frequency.setValueAtTime(165 + rand() * 175, at);
			osc.frequency.exponentialRampToValueAtTime(160 + rand() * 220, at + d);
			env.gain.setValueAtTime(0.0001, at);
			env.gain.exponentialRampToValueAtTime(0.095, at + 0.007);
			env.gain.exponentialRampToValueAtTime(0.0001, at + d);
			for (const f of vowel) {
				const formant = c.createBiquadFilter();
				formant.type = "bandpass";
				formant.frequency.value = f;
				formant.Q.value = 5;
				osc.connect(formant).connect(env);
			}
			env.connect(this.effects);
			osc.start(at);
			osc.stop(at + d + 0.01);
		}
		this.stats.voices++;
	}

	diagnostics() {
		return {
			...this.stats,
			ready: this.ready,
			musicVolume: this.musicVolume,
			effectsVolume: this.effectsVolume,
			state: this.context?.state || "not-started",
		};
	}

	async dispose() {
		if (!this.ready) return;
		this.rotor.stop();
		this.rotorPulse.stop();
		this.master.disconnect();
		if (this.context.close && this.context.state !== "closed")
			await this.context.close();
		this.ready = false;
	}
}
