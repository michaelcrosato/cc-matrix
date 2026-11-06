/* All music, effects and character gibberish are synthesized at runtime. */
((root) => {
	const T = (root.TallTale = root.TallTale || {});
	const SONGS = {
		climb: {
			bpm: 114,
			steps: 4,
			tracks: [
				{
					name: "melody",
					wave: "triangle",
					vol: 0.31,
					notes:
						"D5 - . F5 A5 - F5 . G5 - E5 . F5 - D5 . | E5 - . G5 Bb5 - G5 . A5 - F5 . E5 - C5 . | D5 - F5 . A5 - C6 . Bb5 - A5 - G5 - E5 . | F5 . D5 . E5 . C5 . D5 - - - . . . .",
				},
				{
					name: "sparkle",
					wave: "pulse12",
					vol: 0.045,
					notes:
						"A4 . D5 . F5 . D5 . A4 . C5 . E5 . C5 . | Bb4 . D5 . G5 . D5 . A4 . C5 . F5 . C5 . | A4 . D5 . F5 . D5 . Bb4 . D5 . G5 . D5 . | A4 . C5 . E5 . C5 . A4 . D5 . F5 . A5 .",
				},
				{
					name: "bass",
					wave: "triangle",
					vol: 0.34,
					notes:
						"D3 . A3 . D3 . A3 . C3 . G3 . C3 . G3 . | G2 . D3 . G2 . D3 . F2 . C3 . F2 . C3 . | D3 . A3 . D3 . A3 . G2 . D3 . G2 . D3 . | A2 . E3 . A2 . E3 . D3 . A3 . D3 . A3 .",
				},
				{
					name: "brushes",
					wave: "drums",
					vol: 0.045,
					notes: "k . h . . . h . s . h . . . h .",
				},
			],
		},
		upper: {
			bpm: 122,
			steps: 4,
			tracks: [
				{
					wave: "triangle",
					vol: 0.29,
					notes:
						"G5 - . Bb5 D6 - Bb5 . C6 - A5 . Bb5 - G5 . | A5 - . C6 Eb6 - C6 . D6 - Bb5 . A5 - F5 . | G5 - Bb5 . D6 - F6 . Eb6 - D6 - C6 - A5 . | Bb5 . G5 . A5 . F5 . G5 - - - . . . .",
				},
				{
					wave: "pulse12",
					vol: 0.05,
					notes:
						"D5 . G5 . Bb5 . G5 . C5 . F5 . A5 . F5 . | Eb5 . G5 . C6 . G5 . D5 . F5 . Bb5 . F5 .",
				},
				{
					wave: "triangle",
					vol: 0.32,
					notes:
						"G2 . D3 . G2 . D3 . F2 . C3 . F2 . C3 . | C3 . G3 . C3 . G3 . Bb2 . F3 . Bb2 . F3 .",
				},
				{ wave: "drums", vol: 0.06, notes: "k . h . s . h . k . h h s . h ." },
			],
		},
		heart: {
			bpm: 152,
			steps: 4,
			tracks: [
				{
					wave: "pulse",
					vol: 0.16,
					notes:
						"D5 F5 A5 C6 D6 - A5 . C6 A5 F5 A5 D6 - - . | Bb5 D6 F6 D6 C6 A5 F5 E5 F5 A5 D6 C6 D6 - - .",
				},
				{
					wave: "triangle",
					vol: 0.32,
					notes:
						"D3 . D4 . A2 . A3 . C3 . C4 . F2 . F3 . | Bb2 . Bb3 . F2 . F3 . A2 . A3 . D3 . D4 .",
				},
				{
					wave: "square",
					vol: 0.035,
					notes: "F5 . A5 . F5 . A5 . E5 . G5 . E5 . G5 .",
				},
				{ wave: "drums", vol: 0.065, notes: "k h . h s . h . k h . h s h h ." },
			],
		},
		rescue: {
			bpm: 118,
			steps: 4,
			loop: false,
			tracks: [
				{
					wave: "triangle",
					vol: 0.34,
					notes:
						"D5 . F5 . A5 . D6 - C6 - A5 - F5 - D5 . | G5 . Bb5 . D6 . G6 - F6 - D6 - Bb5 - G5 . | A5 . C6 . E6 . A6 - G6 - E6 - C6 - A5 . | D6 - - - A5 - F5 - D6 - - - - - - -",
				},
				{
					wave: "pulse12",
					vol: 0.055,
					notes:
						"F5 . A5 . D6 . F6 - E6 - C6 - A5 - F5 . | Bb5 . D6 . G6 . Bb6 - A6 - F6 - D6 - Bb5 . | C6 . E6 . A6 . C7 - Bb6 - G6 - E6 - C6 . | F6 - - - D6 - A5 - F6 - - - - - - -",
				},
				{
					wave: "triangle",
					vol: 0.35,
					notes:
						"D3 - . A3 D3 - . A3 C3 - . G3 C3 - . G3 | G2 - . D3 G2 - . D3 Bb2 - . F3 Bb2 - . F3 | A2 - . E3 A2 - . E3 A2 - . E3 A2 - . E3 | D3 - - - - - - - D2 - - - - - - -",
				},
			],
		},
		fail: {
			bpm: 90,
			steps: 4,
			loop: false,
			tracks: [
				{
					wave: "triangle",
					vol: 0.3,
					notes: "A4 - . F4 - . D4 - C#4 - - - D4 - - -",
				},
				{
					wave: "triangle",
					vol: 0.35,
					notes: "D3 - - - A2 - - - D2 - - - - - - -",
				},
			],
		},
	};
	const FX = {
		jump: { wave: "triangle", freq: 225, to: 520, dur: 0.12, vol: 0.21 },
		land: { wave: "noise", freq: 190, to: 80, dur: 0.045, vol: 0.055 },
		"window-open": [
			{ wave: "triangle", freq: 370, to: 580, dur: 0.1, vol: 0.12 },
			{ wave: "noise", freq: 1500, to: 600, dur: 0.07, vol: 0.035 },
		],
		"window-warning": [
			{ wave: "square", freq: 690, dur: 0.025, vol: 0.065 },
			{ wave: "square", freq: 530, dur: 0.025, delay: 0.13, vol: 0.065 },
		],
		heart: [
			{ wave: "triangle", freq: 523, dur: 0.1, vol: 0.2 },
			{ wave: "triangle", freq: 659, delay: 0.08, dur: 0.14, vol: 0.19 },
			{ wave: "triangle", freq: 784, delay: 0.16, dur: 0.22, vol: 0.17 },
			{ wave: "pulse", freq: 1047, delay: 0.23, dur: 0.16, vol: 0.07 },
		],
		"heart-warning": [
			{ wave: "triangle", freq: 660, to: 500, dur: 0.06, vol: 0.12 },
			{
				wave: "triangle",
				freq: 500,
				to: 330,
				delay: 0.15,
				dur: 0.1,
				vol: 0.12,
			},
		],
		smash: [
			{ wave: "noise", freq: 400, to: 80, dur: 0.15, vol: 0.2 },
			{ wave: "triangle", freq: 220, to: 800, dur: 0.14, vol: 0.16 },
		],
		hit: [
			{ wave: "noise", freq: 600, to: 80, dur: 0.16, vol: 0.19 },
			{ wave: "triangle", freq: 330, to: 87, dur: 0.24, vol: 0.19 },
		],
		bumper: [
			{ wave: "triangle", freq: 150, to: 440, dur: 0.11, vol: 0.2 },
			{ wave: "noise", freq: 1600, to: 800, dur: 0.04, vol: 0.08 },
		],
		drop: [
			{ wave: "triangle", freq: 650, to: 100, dur: 0.3, vol: 0.11 },
			{ wave: "noise", freq: 200, to: 80, delay: 0.23, dur: 0.12, vol: 0.1 },
		],
		split: [
			{ wave: "noise", freq: 1700, to: 300, dur: 0.08, vol: 0.17 },
			{ wave: "triangle", freq: 360, to: 180, dur: 0.12, vol: 0.17 },
			{
				wave: "triangle",
				freq: 440,
				to: 220,
				delay: 0.04,
				dur: 0.14,
				vol: 0.12,
			},
		],
		bird: {
			wave: "sine",
			freq: 1300,
			to: 2100,
			dur: 0.08,
			vol: 0.075,
			arp: [0, 3, 0],
			step: 0.022,
		},
		bat: [
			{ wave: "triangle", freq: 800, to: 390, dur: 0.07, vol: 0.09 },
			{ wave: "noise", freq: 2200, to: 500, dur: 0.04, vol: 0.025 },
		],
		rat: { wave: "triangle", freq: 1100, to: 800, dur: 0.032, vol: 0.045 },
		checkpoint: [
			{ wave: "triangle", freq: 392, dur: 0.12, vol: 0.17 },
			{ wave: "triangle", freq: 523, delay: 0.09, dur: 0.12, vol: 0.17 },
			{ wave: "triangle", freq: 659, delay: 0.18, dur: 0.23, vol: 0.16 },
		],
		rescue: [
			{ wave: "triangle", freq: 523, dur: 0.18, vol: 0.2 },
			{ wave: "triangle", freq: 659, delay: 0.08, dur: 0.2, vol: 0.17 },
			{ wave: "triangle", freq: 784, delay: 0.16, dur: 0.28, vol: 0.17 },
		],
		plane: {
			wave: "saw",
			freq: 70,
			to: 160,
			dur: 0.8,
			vol: 0.035,
			vib: [14, 0.025],
		},
		section: { wave: "triangle", freq: 392, to: 784, dur: 0.35, vol: 0.13 },
	};
	class Audio {
		constructor(E, game, opts = {}) {
			this.E = E;
			this.game = game;
			this.native = game.audio;
			this.silent = !!opts.silent;
			this.activated = false;
			this.stopped = false;
			this.mode = null;
			this.seen = new Set();
			this.sources = new Set();
			this.handles = [];
			this.eventCount = 0;
			this.voiceCount = 0;
			this._counter = 0;
			this._sim = null;
			this.analyser = null;
			this.controller =
				typeof AbortController === "function" ? new AbortController() : null;
			if (
				!this.silent &&
				!game.headless &&
				typeof addEventListener === "function"
			)
				for (const ev of ["pointerdown", "keydown", "touchstart"])
					addEventListener(ev, () => this.activate(), {
						once: false,
						capture: true,
						passive: true,
						signal: this.controller?.signal,
					});
		}
		activate() {
			if (
				this.silent ||
				this.stopped ||
				root.AIHub?.server ||
				(root.AIHub?.active && root.AIHub.me === null)
			)
				return false;
			this.activated = true;
			if (!this.native.ctx) this.native.bus("music");
			const c = this.native.ctx;
			if (c && c.state === "suspended") c.resume().catch(() => {});
			if (c && !this.analyser) {
				this.analyser = c.createAnalyser();
				this.analyser.fftSize = 1024;
				this.native.bus("master").connect(this.analyser);
			}
			return !!c;
		}
		update(dt, sim) {
			if (this.silent || this.stopped || root.AIHub?.server || !sim) return;
			const voice = this.game.settings?.voice;
			if (typeof voice === "number" && voice !== this.native.voiceVolume) {
				this.native.voiceVolume = voice;
				this.native.applyVolume();
			}
			if (this._sim !== sim) {
				this._sim = sim;
				this.seen.clear();
				this.mode = null;
			}
			if (!this.activated) return;
			const powered = (sim.actors || []).some((a) => a.power > 0),
				key = sim.rescued
					? "rescue"
					: sim.phase === "failed"
						? "fail"
						: powered
							? "heart"
							: sim.section >= 2
								? "upper"
								: "climb";
			if (key !== this.mode) {
				this.mode = key;
				this.native.music(SONGS[key], { sync: true, fade: 0.12 });
			}
			if (this.game.paused && !this.game.live) {
				this.stopVoices();
				return;
			}
			for (const e of sim.events || []) {
				if (this.seen.has(e.id)) continue;
				this.seen.add(e.id);
				if (this.seen.size > 700)
					this.seen.delete(this.seen.values().next().value);
				const fx = FX[e.type];
				if (fx) {
					const h = this.native.sfx(fx, {
						vary: 0,
						pan: Math.max(-0.8, Math.min(0.8, ((e.x ?? 160) - 160) / 210)),
					});
					this.handles.push(h);
					this.eventCount++;
				}
				if (e.type === "heart") this.babble("mabel");
				if (e.type === "hit") this.babble("buford");
				if (e.type === "section" || e.type === "split") this.babble("hank");
				if (e.type === "rescue") this.babble("mabel");
			}
			if (this.handles.length > 50) this.handles = this.handles.slice(-30);
		}
		babble(who) {
			if (
				!this.activated ||
				this.silent ||
				root.AIHub?.server ||
				this.stopped ||
				!this.native.ready
			)
				return;
			const c = this.native.ctx,
				bus = this.native.bus("voice");
			if (!c || !bus) return;
			const base = who === "hank" ? 105 : who === "mabel" ? 420 : 230,
				n = who === "hank" ? 3 : 4,
				seed = ++this._counter;
			for (let i = 0; i < n; i++) {
				const t = c.currentTime + 0.01 + i * 0.075,
					d = 0.045 + (i % 2) * 0.019,
					f = base * (1 + ((i * 7 + seed) % 5) * 0.12),
					osc = c.createOscillator(),
					gain = c.createGain(),
					formant = c.createBiquadFilter();
				osc.type = "sawtooth";
				osc.frequency.setValueAtTime(f, t);
				osc.frequency.linearRampToValueAtTime(f * (i % 2 ? 1.13 : 0.87), t + d);
				formant.type = "bandpass";
				formant.Q.value = 3.2;
				formant.frequency.setValueAtTime(
					who === "hank" ? 620 : who === "mabel" ? 1600 : 1100,
					t,
				);
				formant.frequency.linearRampToValueAtTime(
					who === "hank" ? 1100 : who === "mabel" ? 2400 : 1650,
					t + d,
				);
				gain.gain.setValueAtTime(0, t);
				gain.gain.linearRampToValueAtTime(0.065, t + 0.007);
				gain.gain.exponentialRampToValueAtTime(0.0001, t + d);
				osc.connect(formant);
				formant.connect(gain);
				gain.connect(bus);
				osc.start(t);
				osc.stop(t + d + 0.01);
				this.sources.add(osc);
				osc.onended = () => {
					this.sources.delete(osc);
					osc.disconnect();
					formant.disconnect();
					gain.disconnect();
				};
			}
			this.voiceCount++;
		}
		stopVoices() {
			for (const s of this.sources) {
				try {
					s.stop();
				} catch (_) {}
			}
			this.sources.clear();
		}
		stop() {
			this.stopped = true;
			this.mode = null;
			this.native.stopMusic(0);
			for (const h of this.handles) h.stop(0);
			this.handles = [];
			this.stopVoices();
			if (this.analyser) {
				try {
					this.native.bus("master")?.disconnect(this.analyser);
				} catch (_) {}
				this.analyser.disconnect();
				this.analyser = null;
			}
		}
		resume() {
			if (this.silent) return;
			this.stopped = false;
			this.mode = null;
		}
		stats() {
			let peak = 0,
				rms = 0,
				finite = true;
			if (this.analyser) {
				const d = new Float32Array(this.analyser.fftSize);
				this.analyser.getFloatTimeDomainData(d);
				for (const x of d) {
					finite = finite && Number.isFinite(x);
					peak = Math.max(peak, Math.abs(x));
					rms += x * x;
				}
				rms = Math.sqrt(rms / d.length);
			}
			return {
				activated: this.activated,
				silent: this.silent,
				stopped: this.stopped,
				mode: this.mode,
				musicGain: this.native.musicVolume,
				master: this.native.volume,
				muted: this.native.muted,
				eventCount: this.eventCount,
				voiceCount: this.voiceCount,
				liveVoices: this.sources.size,
				peak,
				rms,
				finite,
				ready: this.native.ready,
			};
		}
		dispose() {
			this.stop();
			this.controller?.abort();
		}
		static async diagnostic(Offline) {
			if (!Offline) return { available: false };
			const NativeAudio = root.My3D2dge?.current?.audio?.constructor;
			if (!NativeAudio)
				return { available: false, reason: "Native ChipAudio unavailable" };
			async function render(muted) {
				const c = new Offline(1, 88200, 44100),
					a = new NativeAudio({ headless: false, time: 0, real: 0 });
				a.ctx = c;
				a._master = c.createGain();
				a._master.connect(c.destination);
				a._sfxBus = c.createGain();
				a._sfxBus.connect(a._master);
				a._musBus = c.createGain();
				a._musBus.connect(a._master);
				a._voiceBus = c.createGain();
				a._voiceBus.connect(a._master);
				a.musicVolume = 0.1;
				a.mute(muted);
				a._noise = c.createBuffer(1, 44100, 44100);
				const noise = a._noise.getChannelData(0);
				for (let i = 0; i < noise.length; i++) noise[i] = a._rnd() * 2 - 1;
				const song = SONGS.climb,
					spb = 60 / song.bpm / song.steps;
				for (const tr of song.tracks) {
					const track = {
						...tr,
						tokens: tr.notes.replace(/\|/g, " ").trim().split(/\s+/),
					};
					for (let i = 0; i < 12; i++)
						a._note(track, i, 0.01 + i * spb, spb, a._musBus);
				}
				for (const v of FX.heart) a._voice(v, a._sfxBus, 0.1);
				const b = await c.startRendering(),
					d = b.getChannelData(0);
				let peak = 0,
					sum = 0,
					finite = true;
				for (const x of d) {
					peak = Math.max(peak, Math.abs(x));
					sum += x * x;
					finite = finite && Number.isFinite(x);
				}
				return {
					finite,
					peak,
					rms: Math.sqrt(sum / d.length),
					samples: d.length,
					musicGain: a.musicVolume,
					actualBusGain: a._musBus.gain.value,
				};
			}
			const audible = await render(false),
				muted = await render(true);
			return {
				available: true,
				native: true,
				...audible,
				mutedPeak: muted.peak,
				mutedRms: muted.rms,
			};
		}
	}
	Audio.songs = SONGS;
	Audio.effects = FX;
	T.Audio = Audio;
})(typeof globalThis !== "undefined" ? globalThis : this);
