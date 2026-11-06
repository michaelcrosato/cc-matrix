/* Space Fort After Dark — original procedural score, effects and radio babble. */
((root) => {
	root.SF = root.SF || {};
	const SF = root.SF;
	const clamp = (v, fallback) =>
		Number.isFinite(+v) ? Math.max(0, Math.min(1, +v)) : fallback;
	const melody =
		"D4 . A4 . F4 . E4 D4 | . . A3 . C4 D4 F4 . | G4 . F4 E4 D4 . C4 . | A3 . C4 . D4 - . .";
	const bass =
		"D2 . D2 . A2 . A2 . | C2 . C2 . G2 . G2 . | Bb1 . Bb1 . F2 . F2 . | A1 . A1 . A2 . C3 .";
	const songs = {
		title: {
			bpm: 76,
			steps: 2,
			tracks: [
				{ wave: "sf-horn", vol: 0.16, notes: melody },
				{ wave: "sf-bass", vol: 0.17, notes: bass },
				{
					wave: "sf-tick",
					vol: 0.055,
					notes: ". . D5 . . . D5 . | . . D5 . . . D5 .",
				},
			],
		},
		act0: {
			bpm: 106,
			steps: 2,
			tracks: [
				{ wave: "sf-horn", vol: 0.14, notes: melody },
				{ wave: "sf-bass", vol: 0.19, notes: bass },
				{
					wave: "sf-tick",
					vol: 0.07,
					notes: "D5 . D5 D5 . D5 D5 . | D5 . D5 . D5 D5 D5 .",
				},
			],
		},
		act1: {
			bpm: 121,
			steps: 2,
			tracks: [
				{
					wave: "sf-horn",
					vol: 0.15,
					notes:
						"D4 A4 . A4 F4 . E4 D4 | C4 G4 . G4 E4 . D4 C4 | Bb3 F4 . F4 D4 . C4 Bb3 | A3 E4 . G4 E4 . C4 .",
				},
				{ wave: "sf-bass", vol: 0.19, notes: bass },
				{
					wave: "sf-tick",
					vol: 0.075,
					notes: "D5 . D5 D5 D5 . D5 . | D5 D5 . D5 D5 . D5 D5",
				},
			],
		},
		act2: {
			bpm: 134,
			steps: 2,
			tracks: [
				{
					wave: "sf-horn",
					vol: 0.16,
					notes:
						"D4 F4 A4 . A4 . G4 F4 | C4 E4 G4 . G4 . F4 E4 | Bb3 D4 F4 . F4 . E4 D4 | A3 C4 E4 . G4 E4 C4 .",
				},
				{ wave: "sf-bass", vol: 0.2, notes: bass },
				{
					wave: "sf-tick",
					vol: 0.08,
					notes: "D5 D5 . D5 D5 . D5 D5 | . D5 D5 D5 D5 . D5 .",
				},
			],
		},
		boss: {
			bpm: 146,
			steps: 2,
			tracks: [
				{
					wave: "sf-horn",
					vol: 0.17,
					notes:
						"D4 . D4 Eb4 D4 . A3 . | D4 . F4 E4 Eb4 . C4 . | Bb3 . D4 E4 F4 . E4 D4 | A3 . C4 . E4 G4 E4 C4",
				},
				{
					wave: "sf-bass",
					vol: 0.21,
					notes:
						"D2 D2 . D2 A1 A1 . A1 | C2 C2 . C2 G1 G1 . G1 | Bb1 Bb1 . Bb1 F1 F1 . F1 | A1 A1 C2 A1 E2 A1 C2 A1",
				},
				{
					wave: "sf-tick",
					vol: 0.09,
					notes: "D5 . D5 D5 D5 D5 . D5 | D5 D5 D5 . D5 D5 D5 .",
				},
			],
		},
		win: {
			bpm: 116,
			steps: 2,
			loop: false,
			tracks: [
				{
					wave: "sf-horn",
					vol: 0.2,
					notes:
						"D4 F4 A4 - D5 - A4 . | C5 D5 F5 - E5 - D5 - | D5 - - - - - . .",
				},
				{
					wave: "sf-bass",
					vol: 0.2,
					notes: "D2 . A2 . D3 - . . | C3 . G2 . A2 - . . | D2 - - - - - . .",
				},
			],
		},
		lose: {
			bpm: 72,
			steps: 2,
			loop: false,
			tracks: [
				{
					wave: "sf-horn",
					vol: 0.17,
					notes: "D4 - C4 . Bb3 - A3 . | D3 - - - - - . .",
				},
				{
					wave: "sf-bass",
					vol: 0.19,
					notes: "D2 - . . A1 - . . | D1 - - - - - . .",
				},
			],
		},
	};
	const effects = {
		shot: [{ wave: "sf-laser", freq: 900, dur: 0.065, vol: 0.1 }],
		hit: [{ wave: "sf-tick", freq: 620, dur: 0.07, vol: 0.13 }],
		kill: [
			{ wave: "sf-burst", freq: 190, dur: 0.28, vol: 0.23 },
			{ wave: "sf-laser", freq: 230, dur: 0.19, vol: 0.1 },
		],
		damage: [
			{ wave: "sf-burst", freq: 1700, dur: 0.24, vol: 0.24 },
			{ wave: "sf-horn", freq: 82, dur: 0.2, vol: 0.13 },
		],
		pulse: [{ wave: "sf-pulse", freq: 120, dur: 0.48, vol: 0.24 }],
		pickup: [
			{ wave: "sf-horn", freq: 660, dur: 0.13, vol: 0.12 },
			{ wave: "sf-horn", freq: 990, dur: 0.15, vol: 0.1, delay: 0.09 },
		],
		gravity: [{ wave: "sf-pulse", freq: 68, dur: 0.6, vol: 0.18 }],
		tractor: [
			{ wave: "sf-laser", freq: 280, dur: 0.32, vol: 0.15 },
			{ wave: "sf-horn", freq: 140, dur: 0.35, vol: 0.08 },
		],
		warning: [
			{ wave: "sf-horn", freq: 740, dur: 0.13, vol: 0.18 },
			{ wave: "sf-horn", freq: 560, dur: 0.13, vol: 0.16, delay: 0.17 },
		],
	};

	class SiegeAudio {
		constructor(game, settings = {}) {
			this.game = game;
			this.audio = game.audio;
			this.scene = "title";
			this.unlocked = false;
			this.sleeping = false;
			this.stopped = false;
			this.sources = new Set();
			this.cooldowns = Object.create(null);
			this.handles = [];
			this.elapsed = 0;
			this.duckUntil = 0;
			this.eventCount = 0;
			this.noteCount = 0;
			this.setSettings(settings);
			for (const name of [
				"horn",
				"bass",
				"tick",
				"laser",
				"burst",
				"pulse",
				"radio",
			]) {
				this.audio.instrument(`sf-${name}`, (ctx, bus, time, freq, dur, vol) =>
					this._instrument(name, ctx, bus, time, freq, dur, vol),
				);
			}
			for (const [name, voices] of Object.entries(effects))
				this.audio.define(`sf-${name}`, voices);
		}
		_instrument(name, c, bus, time, freq, dur, vol) {
			if (this.sleeping || this.stopped || this.mutedBySettings) return;
			const end = time + Math.max(0.025, Math.min(2, dur));
			const envelope = c.createGain();
			envelope.gain.setValueAtTime(0, time);
			envelope.gain.linearRampToValueAtTime(
				Math.min(0.35, Math.max(0, vol)),
				time + 0.006,
			);
			envelope.gain.exponentialRampToValueAtTime(0.0001, end);
			const filter = c.createBiquadFilter();
			filter.type = name === "radio" ? "bandpass" : "lowpass";
			filter.frequency.setValueAtTime(
				name === "radio" ? freq * 3 : name === "bass" ? 800 : 3500,
				time,
			);
			filter.Q.value = name === "radio" ? 5 : 0.7;
			filter.connect(envelope);
			envelope.connect(bus);
			const oscillator = c.createOscillator();
			oscillator.type =
				name === "bass" || name === "pulse"
					? "triangle"
					: name === "horn" || name === "radio"
						? "sawtooth"
						: "square";
			oscillator.frequency.setValueAtTime(Math.max(24, freq), time);
			if (name === "laser")
				oscillator.frequency.exponentialRampToValueAtTime(
					Math.max(35, freq * 0.22),
					end,
				);
			if (name === "tick")
				oscillator.frequency.exponentialRampToValueAtTime(36, end);
			if (name === "pulse") {
				oscillator.frequency.exponentialRampToValueAtTime(
					freq * 3,
					time + dur * 0.3,
				);
				oscillator.frequency.exponentialRampToValueAtTime(28, end);
			}
			if (name === "burst") {
				for (let i = 0; i < 12; i++)
					oscillator.frequency.setValueAtTime(
						40 + ((i * 97 + Math.floor(freq)) % 1300),
						time + (dur * i) / 12,
					);
			}
			if (name === "radio") {
				oscillator.frequency.exponentialRampToValueAtTime(
					freq * 1.5,
					time + dur * 0.3,
				);
				oscillator.frequency.exponentialRampToValueAtTime(freq * 0.8, end);
			}
			oscillator.connect(filter);
			this.sources.add(oscillator);
			this.noteCount++;
			oscillator.onended = () => {
				this.sources.delete(oscillator);
				oscillator.disconnect();
				filter.disconnect();
				envelope.disconnect();
			};
			oscillator.start(time);
			oscillator.stop(end + 0.02);
		}
		unlock() {
			if (this.game.headless) return Promise.resolve(false);
			if (this.unlocked && this.audio.ready) return Promise.resolve(true);
			this.stopped = false;
			const bus = this.audio.bus("music");
			if (!bus || !this.audio.ctx) return Promise.resolve(false);
			this.unlocked = true;
			const c = this.audio.ctx;
			return c
				.resume()
				.then(() => {
					if (!this.sleeping) this._startScene();
					return c.state === "running";
				})
				.catch(() => false);
		}
		setSettings(settings = {}) {
			const wasMuted = this.mutedBySettings;
			this.settings = {
				music: clamp(settings.music, 0.1),
				sfx: clamp(settings.sfx, 0.6),
				voice: clamp(settings.voice, 0.4),
			};
			this.audio.musicVolume = this.settings.music;
			this.audio.sfxVolume = this.settings.sfx;
			this.audio.voiceVolume = this.settings.voice;
			this.audio.setVolume(0.72);
			this.audio.applyVolume();
			this.mutedBySettings = Object.values(this.settings).every((v) => v === 0);
			if (this.mutedBySettings) this._silence();
			else if (wasMuted) this._startScene();
		}
		setScene(name) {
			name = songs[name] ? name : "title";
			if (name === this.scene && this.audio.song && !this.stopped) return;
			this.scene = name;
			this.stopped = false;
			if (this.unlocked && !this.sleeping) this._startScene();
		}
		_startScene() {
			if (
				!this.unlocked ||
				this.sleeping ||
				this.stopped ||
				this.mutedBySettings ||
				!this.audio.ready
			)
				return;
			this.audio.music(songs[this.scene], {
				sync: false,
				restart: true,
				fade: 0.03,
				loop: songs[this.scene].loop !== false,
			});
		}
		event(event = {}) {
			const kind = event.kind || event.type;
			if (
				!kind ||
				!this.unlocked ||
				this.sleeping ||
				this.stopped ||
				!this.audio.ready
			)
				return;
			const priority = ["warning", "damage", "radio", "win", "lose"].includes(
				kind,
			);
			const now = this.audio.ctx.currentTime;
			const wait =
				kind === "shot" ? 0.055 : kind === "hit" ? 0.045 : priority ? 0.5 : 0.1;
			if (now - (this.cooldowns[kind] ?? -100) < wait) return;
			this.cooldowns[kind] = now;
			this.eventCount++;
			if (priority) {
				this.duckUntil = this.elapsed + 1.2;
				this.audio.duck(true);
			}
			if (kind === "win" || kind === "lose") {
				this.setScene(kind);
				this._babble(kind === "win" ? 4 : 2);
				return;
			}
			if (kind === "radio") {
				this._babble(3);
				return;
			}
			if (!effects[kind]) return;
			const pan = Number.isFinite(event.x)
				? Math.max(-0.8, Math.min(0.8, (event.x / (SF.W || 1280) - 0.5) * 1.5))
				: 0;
			const handle = this.audio.sfx(`sf-${kind}`, {
				vary: kind === "warning" ? 0 : 0.045,
				pan,
			});
			this.handles.push({ handle, until: this.elapsed + 1.2 });
			if (kind === "warning") this._babble(2);
		}
		_babble(length) {
			const c = this.audio.ctx,
				bus = this.audio.bus("voice");
			if (!c || !bus) return;
			const syllables = [
				180, 275, 215, 325, 165, 260, 195, 350, 240, 170, 300, 225,
			];
			const start = c.currentTime + 0.015;
			for (let i = 0; i < length * 3; i++) {
				const f = syllables[(i + this.eventCount * 3) % syllables.length];
				this._instrument(
					"radio",
					c,
					bus,
					start + i * 0.09 + (i > 3 ? 0.07 : 0),
					f,
					0.065 + (i % 3) * 0.015,
					0.12,
				);
			}
		}
		update(dt) {
			if (Number.isFinite(dt)) this.elapsed += Math.max(0, Math.min(0.25, dt));
			if (this.audio.ducked && this.elapsed > this.duckUntil)
				this.audio.duck(false);
			this.handles = this.handles.filter((x) => x.until > this.elapsed);
			if (
				this.unlocked &&
				!this.stopped &&
				!this.sleeping &&
				this.audio.ctx?.state === "running" &&
				!this.audio.song
			)
				this._startScene();
		}
		_silence() {
			this.audio.stopMusic(0.02);
			this.audio.duck(false);
			for (const entry of this.handles) entry.handle.stop(0);
			this.handles.length = 0;
			for (const source of this.sources) {
				try {
					source.stop();
					source.disconnect();
				} catch (_) {
					/* already ended */
				}
			}
			this.sources.clear();
		}
		suspend() {
			if (this.sleeping) return;
			this.sleeping = true;
			this._silence();
		}
		resume() {
			if (!this.sleeping && !this.stopped) return;
			this.sleeping = false;
			this.stopped = false;
			if (this.unlocked && this.audio.ctx && this.audio.ctx.state !== "closed")
				this.audio.ctx
					.resume()
					.then(() => this._startScene())
					.catch(() => {});
		}
		stop() {
			this.stopped = true;
			this._silence();
			this.cooldowns = Object.create(null);
		}
		diagnostics() {
			return {
				unlocked: this.unlocked,
				scene: this.scene,
				sleeping: this.sleeping,
				stopped: this.stopped,
				muted: this.mutedBySettings,
				sources: this.sources.size,
				events: this.eventCount,
				notes: this.noteCount,
				music: this.settings.music,
				sfx: this.settings.sfx,
				voice: this.settings.voice,
				context: this.audio.ctx?.state || "locked",
				failed: this.audio.failed || null,
				musicPlaying: !!this.audio.song && !this.audio.song.ended,
			};
		}
	}
	SiegeAudio.songs = songs;
	SF.Audio = SiegeAudio;
})(globalThis);
