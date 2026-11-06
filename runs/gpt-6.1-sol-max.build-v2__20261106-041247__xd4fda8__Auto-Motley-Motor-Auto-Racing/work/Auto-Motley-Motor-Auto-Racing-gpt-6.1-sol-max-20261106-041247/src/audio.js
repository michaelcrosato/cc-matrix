((M) => {
	M.SONGS = {
		title: {
			bpm: 116,
			steps: 4,
			tracks: [
				{
					wave: "triangle",
					vol: 0.19,
					notes:
						"C5 . E5 G5 . E5 D5 . | A4 . C5 E5 . G5 E5 . | F5 . E5 D5 . C5 A4 . | G4 . B4 D5 . E5 G5 .",
				},
				{
					wave: "triangle",
					vol: 0.15,
					notes:
						"C3 . G3 . C3 . G3 . | A2 . E3 . A2 . E3 . | F2 . C3 . F2 . C3 . | G2 . D3 . G2 . D3 .",
				},
				{ wave: "drums", vol: 0.035, notes: "k . h . s . h . k . h . s . h h" },
			],
		},
		drive: {
			bpm: 138,
			steps: 4,
			tracks: [
				{
					wave: "pulse",
					vol: 0.07,
					notes:
						"C5 . . G5 E5 . G5 . | A5 . . E5 C5 . E5 . | F5 . A5 . G5 . E5 . | D5 . B4 . G4 . B4 .",
				},
				{
					wave: "triangle",
					vol: 0.19,
					notes:
						"C3 C3 G3 C3 C3 C3 E3 G3 | A2 A2 E3 A2 A2 A2 C3 E3 | F2 F2 C3 F2 F2 F2 A2 C3 | G2 G2 D3 G2 G2 G2 B2 D3",
				},
				{ wave: "drums", vol: 0.04, notes: "k . h . s . h h k . h . s . h ." },
			],
		},
		finish: {
			bpm: 126,
			steps: 4,
			tracks: [
				{
					wave: "triangle",
					vol: 0.2,
					notes:
						"C5 E5 G5 C6 - G5 E5 . | F5 A5 C6 F6 - C6 A5 . | G5 B5 D6 G6 - D6 B5 . | C6 - G5 E5 C5 - - .",
				},
				{
					wave: "triangle",
					vol: 0.16,
					notes:
						"C3 . G3 . C3 . G3 . | F3 . C4 . F3 . C4 . | G3 . D4 . G3 . D4 . | C3 . E3 . G3 . C4 .",
				},
			],
		},
	};
	// Reusable synth primitives also render inside an OfflineAudioContext in tests.
	M.synthTone = (
		ctx,
		bus,
		{
			wave = "triangle",
			freq = 440,
			to = freq,
			dur = 0.15,
			vol = 0.08,
			at = ctx.currentTime,
		} = {},
	) => {
		const o = ctx.createOscillator(),
			g = ctx.createGain();
		o.type = wave;
		o.frequency.setValueAtTime(freq, at);
		o.frequency.exponentialRampToValueAtTime(Math.max(20, to), at + dur);
		g.gain.setValueAtTime(0, at);
		g.gain.linearRampToValueAtTime(vol, at + 0.008);
		g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
		o.connect(g).connect(bus);
		o.start(at);
		o.stop(at + dur + 0.02);
		return { o, g };
	};
	M.babble = (ctx, bus, at = ctx.currentTime) => {
		for (let i = 0; i < 5; i++)
			M.synthTone(ctx, bus, {
				wave: i % 2 ? "triangle" : "sine",
				freq: [520, 740, 610, 890, 650][i],
				to: [710, 530, 800, 660, 420][i],
				vol: 0.055,
				dur: 0.065,
				at: at + i * 0.075,
			});
	};
	class Sound {
		constructor(game) {
			this.game = game;
			this.A = game.audio;
			this.kind = null;
			this.motor = null;
			this.slip = null;
			this.eventId = 0;
			this.unlocked = false;
			this.active = false;
			this.A.musicVolume = 0.1;
			this.A.applyVolume();
		}
		unlock() {
			this.unlocked = true;
			const bus = this.A.bus("sfx");
			if (!bus) return;
			this.A.ctx.resume().catch(() => {});
			if (!this.motor) {
				const c = this.A.ctx,
					o = c.createOscillator(),
					f = c.createBiquadFilter(),
					g = c.createGain();
				o.type = "sawtooth";
				o.frequency.value = 45;
				f.type = "lowpass";
				f.frequency.value = 650;
				g.gain.value = 0;
				o.connect(f).connect(g).connect(bus);
				o.start();
				this.motor = { o, f, g };
				const so = c.createOscillator(),
					sg = c.createGain();
				so.type = "triangle";
				so.frequency.value = 650;
				sg.gain.value = 0;
				so.connect(sg).connect(bus);
				so.start();
				this.slip = { o: so, g: sg };
			}
			if (!this.kind) this.music("title");
			else if (!this.A.song) this.A.music(M.SONGS[this.kind], { sync: false });
		}
		music(kind) {
			if (kind === this.kind) return;
			this.kind = kind;
			if (this.unlocked)
				this.A.music(kind ? M.SONGS[kind] : null, { sync: false });
		}
		volumes(S) {
			this.A.volume = S.volume;
			this.A.musicVolume = S.music;
			this.A.sfxVolume = S.effects;
			this.A.voiceVolume = S.voiceVolume;
			this.A.muted = !S.sound;
			this.A.applyVolume();
		}
		voice() {
			if (this.unlocked && this.A.ready)
				M.babble(this.A.ctx, this.A.bus("voice"));
		}
		update(sim, paused = false, ended = false) {
			if (this.motor) {
				const c = this.A.ctx,
					t = c.currentTime,
					car = sim?.drivers[0]?.car,
					running = car && sim.phase === "running" && !paused && !ended;
				this.motor.o.frequency.setTargetAtTime(
					35 + Math.max(0, car?.speed || 0) * 1.1,
					t,
					0.05,
				);
				this.motor.f.frequency.setTargetAtTime(
					320 + Math.max(0, car?.speed || 0) * 5,
					t,
					0.08,
				);
				this.motor.g.gain.setTargetAtTime(running ? 0.025 : 0, t, 0.04);
				this.slip.o.frequency.setTargetAtTime(
					600 + Math.abs(car?.slide || 0) * 9,
					t,
					0.04,
				);
				this.slip.g.gain.setTargetAtTime(
					running ? Math.min(0.035, Math.abs(car?.slide || 0) * 0.0008) : 0,
					t,
					0.06,
				);
			}
			if (
				this.unlocked &&
				sim &&
				!paused &&
				!ended &&
				sim.phase === "running" &&
				sim.drivers[0].car.offroad &&
				sim.drivers[0].car.speed > 20 &&
				this.game.real - (this.lastSurfaceSound || 0) > 0.14
			) {
				this.lastSurfaceSound = this.game.real;
				this.A.sfx({
					wave: "noise",
					freq: sim.drivers[0].car.surface === "gravel" ? 530 : 120,
					to: 80,
					dur: 0.08,
					vol: 0.025,
				});
			}
			if (!sim || ended) return;
			for (const e of sim.events) {
				if (e.id <= this.eventId) continue;
				this.eventId = e.id;
				if (!this.unlocked) continue;
				if (e.type === "gate")
					this.A.sfx({
						wave: "sine",
						freq: 740,
						to: 980,
						dur: 0.065,
						vol: 0.05,
					});
				if (e.type === "go")
					this.A.sfx({
						wave: "triangle",
						freq: 400,
						to: 1000,
						dur: 0.22,
						vol: 0.13,
					});
				if (e.type === "lap")
					this.A.sfx({
						wave: "triangle",
						freq: 523,
						arp: [0, 4, 7, 12],
						step: 0.07,
						dur: 0.4,
						vol: 0.12,
					});
				if (e.type === "bump")
					this.A.sfx({
						wave: "noise",
						freq: 110,
						to: 70,
						dur: 0.07,
						vol: 0.08,
					});
				if (e.type === "crash") {
					this.A.sfx({
						wave: "noise",
						freq: e.reason === "Deep water" ? 620 : 130,
						to: 40,
						dur: 0.5,
						vol: 0.18,
					});
					this.voice();
				}
				if (e.type === "recover")
					this.A.sfx({ wave: "sine", freq: 240, to: 650, dur: 0.2, vol: 0.09 });
				if (e.type === "point") {
					this.A.sfx({
						wave: "triangle",
						freq: 392,
						arp: [0, 4, 7],
						dur: 0.38,
						vol: 0.12,
					});
					this.voice();
				}
				if (e.type === "finish") {
					this.music("finish");
					this.A.sfx({
						wave: "triangle",
						freq: 523,
						arp: [0, 4, 7, 12, 7, 12],
						step: 0.1,
						dur: 0.65,
						vol: 0.14,
					});
					this.voice();
				}
				if (e.type === "discovery" || e.type === "drag-finish")
					this.A.sfx({
						wave: "sine",
						freq: 660,
						arp: [0, 7, 12],
						dur: 0.35,
						vol: 0.1,
					});
			}
		}
		reset() {
			this.eventId = 0;
		}
		stop() {
			this.music(null);
			if (this.motor) {
				const t = this.A.ctx.currentTime;
				this.motor.g.gain.setTargetAtTime(0, t, 0.02);
				this.slip.g.gain.setTargetAtTime(0, t, 0.02);
			}
		}
	}
	M.Sound = Sound;
})(MM);
