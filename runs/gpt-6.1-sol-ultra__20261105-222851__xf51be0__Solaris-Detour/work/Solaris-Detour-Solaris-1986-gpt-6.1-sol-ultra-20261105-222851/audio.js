export class SoundDeck {
	constructor() {
		this.ctx = null;
		this.musicVolume = 0.1;
		this.sfxVolume = 0.65;
		this.muted = false;
		this.scene = "title";
		this.step = 0;
		this.nextStep = 0;
		this.active = new Set();
		this.counts = { musicTicks: 0, notes: 0, effects: 0, voices: 0 };
		this.lastEffect = new Map();
		this.disposed = false;
		this.timer = null;
		this.voiceUntil = 0;
		this._visibility = () => {
			if (globalThis.document?.hidden) {
				this.nextStep = this.ctx ? this.ctx.currentTime + 0.1 : 0;
			}
		};
		globalThis.document?.addEventListener("visibilitychange", this._visibility);
	}

	async unlock() {
		if (this.disposed) return false;
		const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
		if (!Context) return false;
		if (!this.ctx) {
			this.ctx = new Context({ latencyHint: "interactive" });
			this._buildGraph();
			this.nextStep = this.ctx.currentTime + 0.06;
			this.timer = setInterval(() => this._schedule(), 50);
		}
		if (this.ctx.state === "suspended") await this.ctx.resume();
		this._schedule();
		return this.ctx.state === "running";
	}

	_buildGraph() {
		const c = this.ctx;
		this.master = c.createGain();
		this.master.gain.value = this.muted ? 0 : 0.74;
		this.music = c.createGain();
		this.music.gain.value = this.musicVolume;
		this.effects = c.createGain();
		this.effects.gain.value = this.sfxVolume;
		this.compressor = c.createDynamicsCompressor();
		this.compressor.threshold.value = -13;
		this.compressor.knee.value = 12;
		this.compressor.ratio.value = 4;
		this.compressor.attack.value = 0.004;
		this.compressor.release.value = 0.16;
		this.analyser = c.createAnalyser();
		this.analyser.fftSize = 512;
		this.music.connect(this.master);
		this.effects.connect(this.master);
		this.master.connect(this.compressor);
		this.compressor.connect(this.analyser);
		this.analyser.connect(c.destination);
		this.echo = c.createDelay(1);
		this.echo.delayTime.value = 0.29;
		this.echoFeedback = c.createGain();
		this.echoFeedback.gain.value = 0.25;
		this.echoLowpass = c.createBiquadFilter();
		this.echoLowpass.type = "lowpass";
		this.echoLowpass.frequency.value = 2600;
		this.echoWet = c.createGain();
		this.echoWet.gain.value = 0.19;
		this.echo.connect(this.echoLowpass);
		this.echoLowpass.connect(this.echoFeedback);
		this.echoFeedback.connect(this.echo);
		this.echoLowpass.connect(this.echoWet);
		this.echoWet.connect(this.music);
		this.noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
		const data = this.noise.getChannelData(0);
		let seed = 1986;
		for (let i = 0; i < data.length; i++) {
			seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
			data[i] = (seed >>> 0) / 2147483648 - 1;
		}
	}

	_level(bus, value) {
		if (!bus || !this.ctx) return;
		bus.gain.cancelScheduledValues(this.ctx.currentTime);
		bus.gain.setTargetAtTime(value, this.ctx.currentTime, 0.035);
	}

	setMusic(value) {
		this.musicVolume = Math.max(0, Math.min(1, Number(value) || 0));
		this._level(this.music, this.musicVolume);
	}

	setSfx(value) {
		this.sfxVolume = Math.max(0, Math.min(1, Number(value) || 0));
		this._level(this.effects, this.sfxVolume);
	}

	setMuted(value) {
		this.muted = Boolean(value);
		this._level(this.master, this.muted ? 0 : 0.74);
	}

	setScene(scene) {
		if (
			!["title", "space", "surface", "corridor", "boss", "victory"].includes(
				scene,
			)
		)
			scene = "space";
		if (scene === this.scene) return;
		this.scene = scene;
		this.step = 0;
		this.nextStep = this.ctx ? this.ctx.currentTime + 0.05 : 0;
	}

	update() {
		this._schedule();
	}

	_track(source, nodes) {
		this.active.add(source);
		source.onended = () => {
			this.active.delete(source);
			for (const node of nodes) {
				try {
					node.disconnect();
				} catch (_) {
					/* Already disconnected by dispose. */
				}
			}
		};
	}

	_tone(
		freq,
		time,
		duration,
		type = "triangle",
		level = 0.1,
		end = freq,
		bus = this.effects,
		pan = 0,
		echo = false,
		cutoff = 7000,
	) {
		if (!this.ctx || !bus || this.active.size > 180) return;
		const c = this.ctx;
		const osc = c.createOscillator();
		const filter = c.createBiquadFilter();
		const gain = c.createGain();
		const stereo = c.createStereoPanner();
		osc.type = type;
		osc.frequency.setValueAtTime(Math.max(20, freq), time);
		osc.frequency.exponentialRampToValueAtTime(
			Math.max(20, end),
			time + Math.max(0.01, duration),
		);
		filter.type = "lowpass";
		filter.frequency.setValueAtTime(cutoff, time);
		filter.Q.value = 0.7;
		gain.gain.setValueAtTime(0, time);
		gain.gain.linearRampToValueAtTime(
			level,
			time + Math.min(0.012, duration * 0.12),
		);
		gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
		stereo.pan.value = Math.max(-1, Math.min(1, pan));
		osc.connect(filter);
		filter.connect(gain);
		gain.connect(stereo);
		stereo.connect(bus);
		if (echo) stereo.connect(this.echo);
		this._track(osc, [osc, filter, gain, stereo]);
		osc.start(time);
		osc.stop(time + duration + 0.03);
		this.counts.notes++;
	}

	_noise(
		time,
		duration,
		level,
		frequency = 1000,
		type = "lowpass",
		bus = this.effects,
		pan = 0,
	) {
		if (!this.ctx || this.active.size > 180) return;
		const c = this.ctx;
		const source = c.createBufferSource();
		const filter = c.createBiquadFilter();
		const gain = c.createGain();
		const stereo = c.createStereoPanner();
		source.buffer = this.noise;
		filter.type = type;
		filter.frequency.value = frequency;
		filter.Q.value = 0.8;
		gain.gain.setValueAtTime(0, time);
		gain.gain.linearRampToValueAtTime(level, time + 0.006);
		gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
		stereo.pan.value = pan;
		source.connect(filter);
		filter.connect(gain);
		gain.connect(stereo);
		stereo.connect(bus);
		this._track(source, [source, filter, gain, stereo]);
		source.start(time, 0.13);
		source.stop(time + duration + 0.02);
	}

	_schedule() {
		const c = this.ctx;
		if (
			!c ||
			c.state !== "running" ||
			this.disposed ||
			globalThis.document?.hidden
		)
			return;
		if (this.nextStep < c.currentTime - 0.2)
			this.nextStep = c.currentTime + 0.03;
		let guard = 0;
		while (this.nextStep < c.currentTime + 0.17 && guard++ < 8) {
			this._musicStep(this.step++, this.nextStep);
			const bpm = {
				title: 108,
				space: 120,
				surface: 110,
				corridor: 132,
				boss: 140,
				victory: 112,
			}[this.scene];
			this.nextStep += 60 / bpm / 4;
			this.counts.musicTicks++;
		}
	}

	_musicStep(step, t) {
		if (!this.musicVolume || this.muted) return;
		const s = step % 64;
		const bar = Math.floor(s / 16);
		const beat = s % 16;
		const major = this.scene === "victory";
		const root = (major ? [50, 55, 57, 53] : [50, 46, 53, 48])[bar];
		const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
		const chord = major ? [0, 4, 7, 11] : [0, 3, 7, 10];
		const fast = this.scene === "boss" || this.scene === "corridor";
		const surface = this.scene === "surface";
		const title = this.scene === "title";
		if (beat % 4 === 0) {
			this._tone(118, t, 0.18, "sine", title ? 0.27 : 0.42, 37, this.music);
			this._tone(
				hz(root - 12),
				t,
				surface ? 0.4 : 0.23,
				"triangle",
				0.24,
				hz(root - 12),
				this.music,
				0,
				false,
				650,
			);
		}
		if (beat === 4 || beat === 12) {
			this._noise(
				t,
				0.13,
				title ? 0.12 : 0.24,
				1800,
				"highpass",
				this.music,
				-0.08,
			);
			this._tone(180, t, 0.1, "triangle", 0.08, 95, this.music);
		}
		if ((beat % 2 === 0 || fast) && !title) {
			this._noise(
				t,
				beat === 14 ? 0.12 : 0.038,
				beat % 4 ? 0.06 : 0.09,
				7200,
				"highpass",
				this.music,
				beat % 4 ? -0.25 : 0.25,
			);
		}
		if (beat === 0) {
			chord.slice(0, 3).forEach((n, i) => {
				this._tone(
					hz(root + 12 + n),
					t + i * 0.015,
					1.65,
					"triangle",
					0.055,
					hz(root + 12 + n) * 1.002,
					this.music,
					(i - 1) * 0.55,
					true,
					1800,
				);
			});
		}
		if (beat % (title || surface ? 2 : 1) === 0) {
			const pattern = [0, 2, 1, 3, 2, 1, 0, 2];
			const note = root + 24 + chord[pattern[(beat + (bar % 2) * 2) % 8]];
			this._tone(
				hz(note),
				t,
				fast ? 0.15 : 0.25,
				surface ? "sine" : "triangle",
				title ? 0.065 : 0.085,
				hz(note),
				this.music,
				Math.sin(step * 0.7) * 0.65,
				true,
				fast ? 5000 : 3200,
			);
		}
		const phrase = major
			? [12, 14, 16, 19, 21, 19, 16, 14]
			: [12, 15, 19, 22, 19, 17, 15, 10];
		if (beat === 2 || beat === 8 || beat === 11) {
			const n =
				root +
				12 +
				phrase[
					(bar * 2 + (beat === 2 ? 0 : beat === 8 ? 1 : 2)) % phrase.length
				];
			this._tone(
				hz(n),
				t,
				beat === 8 ? 0.42 : 0.25,
				"square",
				0.035,
				hz(n),
				this.music,
				-0.2,
				true,
				2300,
			);
		}
	}

	sfx(name) {
		if (!this.ctx || this.ctx.state !== "running" || this.disposed) return;
		const now = this.ctx.currentTime;
		const spacing =
			{
				laser: 0.045,
				enemy: 0.07,
				hit: 0.08,
				explosion: 0.04,
				boost: 0.3,
				shield: 0.15,
				alarm: 0.6,
			}[name] || 0.035;
		if (now - (this.lastEffect.get(name) ?? -10) < spacing) return;
		this.lastEffect.set(name, now);
		this.counts.effects++;
		const t = now + 0.003;
		const tone = (...a) => this._tone(...a);
		switch (name) {
			case "laser":
				tone(1550, t, 0.11, "triangle", 0.12, 360, this.effects, -0.13);
				tone(
					2300,
					t,
					0.055,
					"square",
					0.023,
					640,
					this.effects,
					0.13,
					false,
					3800,
				);
				break;
			case "enemy":
				tone(
					470,
					t,
					0.2,
					"sawtooth",
					0.065,
					140,
					this.effects,
					0.2,
					false,
					1600,
				);
				break;
			case "hit":
				this._noise(t, 0.17, 0.25, 2600);
				tone(190, t, 0.16, "square", 0.07, 48, this.effects, 0, false, 900);
				break;
			case "explosion":
				this._noise(t, 0.65, 0.46, 850);
				this._noise(
					t + 0.03,
					0.25,
					0.15,
					3200,
					"bandpass",
					this.effects,
					-0.25,
				);
				tone(140, t, 0.48, "sine", 0.36, 24);
				break;
			case "rescue":
				[587.33, 739.99, 880, 1174.66].forEach(
					(f, i) =>
						void tone(
							f,
							t + i * 0.065,
							0.28,
							"triangle",
							0.12,
							f,
							this.effects,
							(i - 1.5) * 0.2,
						),
				);
				break;
			case "key":
				[659.25, 987.77, 1318.51].forEach(
					(f, i) => void tone(f, t + i * 0.085, 0.34, "sine", 0.17, f),
				);
				break;
			case "warp":
				this._noise(t, 1.1, 0.26, 1900, "bandpass");
				[0, 1].forEach(
					(i) =>
						void tone(
							75 + i * 5,
							t,
							1.2,
							"sawtooth",
							0.08,
							1600 + i * 80,
							this.effects,
							i ? 0.65 : -0.65,
							false,
							2400,
						),
				);
				tone(2000, t + 0.85, 0.6, "sine", 0.16, 90);
				break;
			case "dock":
				[293.66, 369.99, 440, 587.33].forEach(
					(f, i) => void tone(f, t + i * 0.09, 0.56, "triangle", 0.14, f),
				);
				break;
			case "select":
				tone(880, t, 0.065, "sine", 0.13, 1174.66);
				break;
			case "shield":
				tone(260, t, 0.38, "sine", 0.21, 960);
				tone(390, t, 0.4, "triangle", 0.09, 1440, this.effects, 0.3);
				break;
			case "boost":
				this._noise(t, 0.4, 0.14, 1700, "bandpass");
				tone(80, t, 0.4, "sawtooth", 0.05, 200, this.effects, 0, false, 800);
				break;
			case "alarm":
				[0, 0.17].forEach(
					(d) => void tone(880, t + d, 0.12, "triangle", 0.14, 660),
				);
				break;
			case "victory":
				[50, 57, 62, 66, 69, 74].forEach((n, i) => {
					const f = 440 * 2 ** ((n - 69) / 12);
					tone(
						f,
						t + i * 0.12,
						0.8,
						"triangle",
						0.16,
						f,
						this.effects,
						((i % 3) - 1) * 0.3,
					);
				});
				break;
			default:
				tone(523.25, t, 0.1, "sine", 0.08, 659.25);
		}
	}

	voice(seed = 0) {
		if (!this.ctx || this.ctx.state !== "running" || this.disposed) return;
		let value = ((Number(seed) || 0) * 73471 + 1986) >>> 0;
		const random = () => {
			value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
			return value / 4294967296;
		};
		const c = this.ctx;
		const start = Math.max(c.currentTime + 0.02, this.voiceUntil);
		if (start > c.currentTime + 1.5) return;
		const vowels = [
			[750, 1200],
			[400, 1900],
			[300, 2500],
			[600, 900],
			[350, 700],
		];
		const syllables = 4 + Math.floor(random() * 4);
		const base = 170 + random() * 110;
		let at = start;
		for (let i = 0; i < syllables; i++) {
			const duration = 0.065 + random() * 0.07;
			const pitch = base * [1, 1.25, 1.5, 1.125, 0.9][Math.floor(random() * 5)];
			const vowel = vowels[Math.floor(random() * vowels.length)];
			const osc = c.createOscillator();
			const sourceGain = c.createGain();
			const one = c.createBiquadFilter();
			const two = c.createBiquadFilter();
			const gain = c.createGain();
			const stereo = c.createStereoPanner();
			osc.type = "sawtooth";
			osc.frequency.setValueAtTime(pitch, at);
			osc.frequency.linearRampToValueAtTime(
				pitch * (i === syllables - 1 ? 0.72 : 1.12),
				at + duration,
			);
			sourceGain.gain.value = 0.3;
			one.type = two.type = "bandpass";
			one.frequency.value = vowel[0];
			two.frequency.value = vowel[1];
			one.Q.value = 5;
			two.Q.value = 8;
			gain.gain.setValueAtTime(0, at);
			gain.gain.linearRampToValueAtTime(0.44, at + 0.012);
			gain.gain.setValueAtTime(0.3, at + duration * 0.65);
			gain.gain.linearRampToValueAtTime(0, at + duration);
			stereo.pan.value = -0.32;
			osc.connect(sourceGain);
			sourceGain.connect(one);
			sourceGain.connect(two);
			one.connect(gain);
			two.connect(gain);
			gain.connect(stereo);
			stereo.connect(this.effects);
			this._track(osc, [osc, sourceGain, one, two, gain, stereo]);
			osc.start(at);
			osc.stop(at + duration + 0.01);
			if (i % 2 === 0)
				this._noise(at, 0.022, 0.07, 3500, "highpass", this.effects, -0.32);
			at += duration + 0.02 + random() * 0.022;
		}
		this.voiceUntil = at;
		this.counts.voices++;
	}

	diagnostics() {
		let rms = 0;
		if (this.analyser) {
			const data = new Float32Array(this.analyser.fftSize);
			this.analyser.getFloatTimeDomainData(data);
			rms = Math.sqrt(
				data.reduce((sum, value) => sum + value * value, 0) / data.length,
			);
		}
		return {
			context: this.ctx?.state || "locked",
			musicVolume: this.musicVolume,
			sfxVolume: this.sfxVolume,
			muted: this.muted,
			scene: this.scene,
			activeNodes: this.active.size,
			rms,
			...this.counts,
		};
	}

	async dispose() {
		this.disposed = true;
		clearInterval(this.timer);
		globalThis.document?.removeEventListener(
			"visibilitychange",
			this._visibility,
		);
		for (const source of this.active) {
			try {
				source.stop();
			} catch (_) {
				/* Finite sources may have ended already. */
			}
		}
		this.active.clear();
		if (this.ctx && this.ctx.state !== "closed") await this.ctx.close();
	}
}
