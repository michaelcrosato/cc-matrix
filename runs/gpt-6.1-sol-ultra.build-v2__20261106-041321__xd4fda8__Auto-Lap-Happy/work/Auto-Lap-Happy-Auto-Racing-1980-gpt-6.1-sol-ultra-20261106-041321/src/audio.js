/* Auto Lap Happy — original procedural score, effects and gibberish voices.
   No recorded samples, speech synthesis, network requests, or external assets. */
(function (root) {
	"use strict";
	const clamp = (v, lo = 0, hi = 1) =>
		Math.max(lo, Math.min(hi, Number(v) || 0));
	const DEFAULTS = Object.freeze({
		master: 0.7,
		music: 0.1,
		sfx: 0.7,
		voice: 0.45,
		mute: false,
	});
	const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
	const MELODY = [
		72, 76, 79, 76, 74, 77, 81, 77, 76, 79, 83, 79, 74, 77, 79, 71, 72, 76, 79,
		84, 83, 79, 77, 74, 76, 79, 77, 74, 72, 67, 69, 71,
	];
	const CHORDS = [
		[48, 55, 60, 64],
		[53, 60, 65, 69],
		[45, 52, 57, 60],
		[55, 62, 67, 71],
	];

	class HappyAudio {
		constructor(settings = {}, context = null) {
			this.settings = { ...DEFAULTS };
			this.ctx = context;
			this.scene = "off";
			this.unlocked = false;
			this.destroyed = false;
			this.paused = false;
			this.sources = new Set();
			this.musicStep = 0;
			this.nextMusic = 0;
			this.rng = 0x4a617070;
			this.lastVoice = -100;
			this.state = {
				speed: 0,
				maxSpeed: 100,
				slip: 0,
				surface: "road",
				brake: 0,
			};
			this.setVolumes(settings);
		}

		_random() {
			let n = this.rng | 0;
			n ^= n << 13;
			n ^= n >>> 17;
			n ^= n << 5;
			this.rng = n | 0;
			return (n >>> 0) / 4294967296;
		}

		_ensure() {
			if (this.destroyed) return false;
			if (!this.ctx) {
				const Context = root.AudioContext || root.webkitAudioContext;
				if (!Context) return false;
				try {
					this.ctx = new Context({ latencyHint: "interactive" });
				} catch (_) {
					return false;
				}
			}
			if (this.master) return true;
			const c = this.ctx;
			this.master = c.createGain();
			this.master.gain.value = this.settings.mute ? 0 : this.settings.master;
			this.limiter = c.createDynamicsCompressor();
			this.limiter.threshold.value = -10;
			this.limiter.knee.value = 12;
			this.limiter.ratio.value = 8;
			this.limiter.attack.value = 0.003;
			this.limiter.release.value = 0.12;
			this.analyser = c.createAnalyser();
			this.analyser.fftSize = 1024;
			this.master.connect(this.limiter);
			this.limiter.connect(this.analyser);
			this.analyser.connect(c.destination);
			this.buses = {};
			for (const name of ["music", "sfx", "voice"]) {
				const gain = c.createGain();
				gain.gain.value = this.settings[name];
				gain.connect(this.master);
				this.buses[name] = gain;
			}
			this.musicScene = c.createGain();
			this.musicScene.gain.value = 0;
			this.musicScene.connect(this.buses.music);
			this.noiseBuffer = c.createBuffer(
				1,
				Math.ceil(c.sampleRate),
				c.sampleRate,
			);
			const samples = this.noiseBuffer.getChannelData(0);
			for (let i = 0; i < samples.length; i++)
				samples[i] = this._random() * 2 - 1;
			this._startLoops();
			return true;
		}

		_startLoops() {
			const c = this.ctx;
			this.engineFilter = c.createBiquadFilter();
			this.engineFilter.type = "lowpass";
			this.engineFilter.frequency.value = 800;
			this.engineGain = c.createGain();
			this.engineGain.gain.value = 0;
			this.engineFilter.connect(this.engineGain);
			this.engineGain.connect(this.buses.sfx);
			this.engineA = c.createOscillator();
			this.engineA.type = "sawtooth";
			this.engineA.frequency.value = 48;
			this.engineB = c.createOscillator();
			this.engineB.type = "triangle";
			this.engineB.frequency.value = 96;
			this.engineMix = c.createGain();
			this.engineMix.gain.value = 0.45;
			this.engineA.connect(this.engineFilter);
			this.engineB.connect(this.engineMix);
			this.engineMix.connect(this.engineFilter);
			this.engineA.start();
			this.engineB.start();
			this.tyreFilter = c.createBiquadFilter();
			this.tyreFilter.type = "bandpass";
			this.tyreFilter.frequency.value = 1700;
			this.tyreFilter.Q.value = 2.3;
			this.tyreGain = c.createGain();
			this.tyreGain.gain.value = 0;
			this.tyreFilter.connect(this.tyreGain);
			this.tyreGain.connect(this.buses.sfx);
			this.tyre = c.createBufferSource();
			this.tyre.buffer = this.noiseBuffer;
			this.tyre.loop = true;
			this.tyre.connect(this.tyreFilter);
			this.tyre.start();
		}

		async unlock() {
			if (!this._ensure()) return false;
			try {
				// OfflineAudioContext is deliberately supported for actual signal tests.
				if (!this.ctx.startRendering && this.ctx.state === "suspended")
					await this.ctx.resume();
				this.unlocked = true;
				this.nextMusic = this.ctx.currentTime;
				this._sceneGain();
				return true;
			} catch (_) {
				return false;
			}
		}

		_smooth(param, value, time = 0.04) {
			if (!param || !this.ctx) return;
			const now = this.ctx.currentTime;
			param.cancelScheduledValues(now);
			param.setTargetAtTime(value, now, Math.max(0.001, time));
		}

		setVolumes(settings = {}) {
			for (const key of ["master", "music", "sfx", "voice"]) {
				if (settings[key] !== undefined)
					this.settings[key] = clamp(settings[key]);
			}
			if (settings.mute !== undefined) this.settings.mute = !!settings.mute;
			if (this.master) {
				this._smooth(
					this.master.gain,
					this.settings.mute ? 0 : this.settings.master,
					0.015,
				);
				for (const key of ["music", "sfx", "voice"])
					this._smooth(this.buses[key].gain, this.settings[key], 0.015);
			}
			return { ...this.settings };
		}

		_sceneGain() {
			if (!this.musicScene) return;
			const levels = { title: 1, driving: 0.65, results: 0.9, off: 0 };
			this._smooth(
				this.musicScene.gain,
				this.paused ? 0 : levels[this.scene],
				0.08,
			);
		}

		setScene(scene) {
			if (!["title", "driving", "results", "off"].includes(scene))
				scene = "off";
			if (this.scene === scene) return;
			this.scene = scene;
			this.musicStep = 0;
			this.nextMusic = this.ctx ? this.ctx.currentTime : 0;
			// Notes from an earlier scene must not leak into a later arrangement.
			this._clearTransient("music");
			this._sceneGain();
			if (scene !== "driving") {
				this._smooth(this.engineGain && this.engineGain.gain, 0);
				this._smooth(this.tyreGain && this.tyreGain.gain, 0);
			}
		}

		_track(source, kind) {
			source._happyKind = kind;
			this.sources.add(source);
			source.onended = () => {
				this.sources.delete(source);
				try {
					source.disconnect();
				} catch (_) {}
			};
			return source;
		}

		_tone(
			freq,
			when,
			duration,
			volume,
			type = "sine",
			bus = "sfx",
			endFreq = freq,
		) {
			if (!this.ctx || !this.buses || this.sources.size > 100) return;
			const c = this.ctx,
				osc = this._track(c.createOscillator(), bus),
				gain = c.createGain();
			const destination = bus === "music" ? this.musicScene : this.buses[bus];
			osc.type = type;
			osc.frequency.setValueAtTime(clamp(freq, 20, 12000), when);
			if (endFreq !== freq)
				osc.frequency.exponentialRampToValueAtTime(
					clamp(endFreq, 20, 12000),
					when + duration,
				);
			gain.gain.setValueAtTime(0.00001, when);
			gain.gain.exponentialRampToValueAtTime(
				Math.max(0.00001, volume),
				when + Math.min(0.008, duration / 4),
			);
			gain.gain.exponentialRampToValueAtTime(0.00001, when + duration);
			osc.connect(gain);
			gain.connect(destination);
			osc.start(when);
			osc.stop(when + duration + 0.005);
			return osc;
		}

		_noise(when, duration, volume, freq = 1200, bus = "sfx") {
			if (!this.ctx || !this.buses || this.sources.size > 100) return;
			const c = this.ctx,
				src = this._track(c.createBufferSource(), bus);
			src.buffer = this.noiseBuffer;
			const filter = c.createBiquadFilter(),
				gain = c.createGain();
			filter.type = "lowpass";
			filter.frequency.value = freq;
			gain.gain.setValueAtTime(0.00001, when);
			gain.gain.linearRampToValueAtTime(volume, when + 0.008);
			gain.gain.exponentialRampToValueAtTime(0.00001, when + duration);
			src.connect(filter);
			filter.connect(gain);
			gain.connect(this.buses[bus]);
			src.start(when, this._random() * 0.35);
			src.stop(when + duration);
		}

		_musicBeat(when) {
			const step = this.musicStep++,
				chord = CHORDS[Math.floor(step / 8) % CHORDS.length];
			const fast = this.scene === "driving";
			const melody =
				MELODY[step % MELODY.length] + (this.scene === "results" ? 12 : 0);
			this._tone(NOTE(melody), when, 0.24, 0.13, "triangle", "music");
			if (step % 2 === 0)
				this._tone(NOTE(chord[0] - 12), when, 0.31, 0.19, "sine", "music");
			if (step % 4 === 0) {
				for (const note of chord.slice(1))
					this._tone(NOTE(note), when, 0.6, 0.045, "sine", "music");
				this._tone(100, when, 0.09, 0.14, "sine", "music", 40);
			}
			if (fast && step % 2)
				this._tone(2800, when, 0.025, 0.028, "triangle", "music", 1500);
		}

		update(dt, state = {}) {
			this.state = { ...this.state, ...state };
			const paused = !!state.paused;
			if (this.paused !== paused) {
				this.paused = paused;
				this._sceneGain();
			}
			if (!this.unlocked || !this.ctx || this.destroyed) return;
			const c = this.ctx,
				s = this.state;
			const ratio = clamp(
				Math.abs(s.speed) / Math.max(1, Number(s.maxSpeed) || 100),
			);
			const driving = this.scene === "driving" && !this.paused;
			const surface = String(s.surface || "road");
			const onGrass = surface === "grass" || surface === "gravel";
			this._smooth(this.engineA.frequency, 43 + ratio * 125, 0.035);
			this._smooth(this.engineB.frequency, 86 + ratio * 251, 0.035);
			this._smooth(this.engineFilter.frequency, 450 + ratio * 1800);
			this._smooth(
				this.engineGain.gain,
				driving ? (0.018 + 0.033 * ratio) * (s.brake ? 0.7 : 1) : 0,
			);
			const slip = clamp(Math.abs(s.slip));
			this._smooth(
				this.tyreFilter.frequency,
				onGrass ? 650 : 1100 + ratio * 1400,
			);
			this._smooth(
				this.tyreGain.gain,
				driving ? slip * ratio * 0.07 + (onGrass ? ratio * 0.035 : 0) : 0,
			);
			if (this.scene === "off" || this.paused) {
				this.nextMusic = c.currentTime;
				return;
			}
			// Catch-up is bounded after hidden-tab stalls; it never queues a backlog.
			if (this.nextMusic < c.currentTime - 0.3) this.nextMusic = c.currentTime;
			let scheduled = 0;
			while (this.nextMusic < c.currentTime + 0.13 && scheduled++ < 4) {
				this._musicBeat(this.nextMusic);
				this.nextMusic += this.scene === "driving" ? 0.205 : 0.25;
			}
		}

		cue(name) {
			if (!this.unlocked || !this.ctx || this.destroyed || this.paused) return;
			const t = this.ctx.currentTime + 0.003;
			switch (name) {
				case "countdown":
					this._tone(520, t, 0.12, 0.12, "square");
					break;
				case "go":
					this._tone(1040, t, 0.32, 0.16, "triangle", "sfx", 1560);
					break;
				case "gate":
					this._tone(880, t, 0.09, 0.09, "sine");
					break;
				case "lap":
					[76, 79, 84].forEach((n, i) =>
						this._tone(NOTE(n), t + i * 0.09, 0.22, 0.13, "triangle"),
					);
					break;
				case "crash":
					this._noise(t, 0.34, 0.24, 1800);
					this._tone(150, t, 0.25, 0.16, "sawtooth", "sfx", 35);
					break;
				case "water":
					this._noise(t, 0.65, 0.2, 650);
					for (let i = 0; i < 5; i++)
						this._tone(
							360 + i * 60,
							t + i * 0.065,
							0.12,
							0.055,
							"sine",
							"sfx",
							170 + i * 30,
						);
					break;
				case "recover":
					this._tone(220, t, 0.35, 0.12, "sine", "sfx", 880);
					break;
				case "point":
					[67, 72, 76, 79].forEach((n, i) =>
						this._tone(NOTE(n), t + i * 0.085, 0.23, 0.14, "triangle"),
					);
					this.gibberish();
					break;
				case "finish":
					[72, 76, 79, 84, 79, 84].forEach((n, i) =>
						this._tone(NOTE(n), t + i * 0.12, 0.35, 0.14, "triangle"),
					);
					this.gibberish();
					break;
				case "discovery":
					[72, 79, 88].forEach((n, i) =>
						this._tone(NOTE(n), t + i * 0.13, 0.5, 0.11, "sine"),
					);
					break;
			}
		}

		gibberish() {
			if (!this.unlocked || !this.ctx || this.destroyed || this.paused) return;
			const now = this.ctx.currentTime;
			if (now - this.lastVoice < 0.7) return;
			this.lastVoice = now;
			// Oscillator syllables with changing formants: "ba-wee-bup", no actual speech.
			const syllables = [205, 310, 245, 370];
			syllables.forEach((f, i) => {
				const when = now + 0.015 + i * 0.1;
				this._tone(f, when, 0.085, 0.11, "triangle", "voice", f * 0.83);
				this._tone(f * 3.1, when, 0.075, 0.024, "sine", "voice", f * 2.6);
			});
		}

		_clearTransient(kind) {
			if (!this.ctx) return;
			for (const src of Array.from(this.sources)) {
				if (kind && src._happyKind !== kind) continue;
				try {
					src.stop();
					src.disconnect();
				} catch (_) {}
				this.sources.delete(src);
			}
		}

		stop() {
			this.scene = "off";
			this.paused = false;
			this._clearTransient();
			this._sceneGain();
			this._smooth(this.engineGain && this.engineGain.gain, 0, 0.01);
			this._smooth(this.tyreGain && this.tyreGain.gain, 0, 0.01);
		}

		destroy() {
			if (this.destroyed) return;
			this.stop();
			for (const source of [this.engineA, this.engineB, this.tyre]) {
				if (source) {
					try {
						source.stop();
						source.disconnect();
					} catch (_) {}
				}
			}
			this.destroyed = true;
			this.unlocked = false;
			if (this.ctx && !this.ctx.startRendering && this.ctx.state !== "closed")
				this.ctx.close().catch(() => {});
		}
	}
	HappyAudio.DEFAULTS = DEFAULTS;
	root.HappyAudio = HappyAudio;
})(typeof globalThis !== "undefined" ? globalThis : window);
