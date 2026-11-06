/* All instruments, radio syllables, effects and songs are synthesized here. */
(function (root) {
	"use strict";
	const F = root.Moonriders;
	F.pluck = (ctx, bus, t, freq, dur, vol) => {
		const o = ctx.createOscillator(),
			g = ctx.createGain(),
			f = ctx.createBiquadFilter();
		o.type = "triangle";
		o.frequency.setValueAtTime(freq, t);
		f.type = "lowpass";
		f.frequency.setValueAtTime(freq * 4, t);
		f.frequency.exponentialRampToValueAtTime(Math.max(80, freq), t + dur);
		g.gain.setValueAtTime(0, t);
		g.gain.linearRampToValueAtTime(vol * 0.75, t + 0.006);
		g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.02, dur));
		o.connect(f);
		f.connect(g);
		g.connect(bus);
		o.start(t);
		o.stop(t + dur + 0.02);
		return o;
	};
	F.radioPhrase = (ctx, bus, t, voice = "pilot", strength = 0.13) => {
		const profiles = {
				pilot: [175, 760, 1230],
				navigator: [240, 1100, 1800],
				survivor: [325, 1300, 2200],
			},
			p = profiles[voice] || profiles.pilot,
			nodes = [];
		[1, 1.25, 0.9, 1.4, 1.1].forEach((pitch, i) => {
			const at = t + i * 0.085,
				osc = ctx.createOscillator(),
				formant = ctx.createBiquadFilter(),
				gain = ctx.createGain();
			osc.type = "sawtooth";
			osc.frequency.setValueAtTime(p[0] * pitch, at);
			osc.frequency.exponentialRampToValueAtTime(
				p[0] * pitch * 0.8,
				at + 0.065,
			);
			formant.type = "bandpass";
			formant.frequency.setValueAtTime(p[1] + (i % 2) * (p[2] - p[1]), at);
			formant.Q.value = 3;
			gain.gain.setValueAtTime(0, at);
			gain.gain.linearRampToValueAtTime(strength, at + 0.008);
			gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.07);
			osc.connect(formant);
			formant.connect(gain);
			gain.connect(bus);
			osc.start(at);
			osc.stop(at + 0.075);
			nodes.push(osc);
		});
		return nodes;
	};
	F.SONG = {
		bpm: 108,
		steps: 4,
		tracks: [
			{
				name: "stars",
				wave: "moon-pluck",
				vol: 0.13,
				notes:
					"D5 . . A5 . . F5 . D5 . A4 . C5 . . . | Bb4 . . F5 . . D5 . Bb4 . F4 . A4 . . . | F5 . . C6 . . A5 . F5 . C5 . E5 . . . | C5 . . G5 . . E5 . C5 . G4 . A4 . . .",
			},
			{
				name: "pulse",
				wave: "triangle",
				vol: 0.2,
				notes:
					"D2 . D3 . D2 . D3 . D2 . D3 . D2 . A2 . | Bb1 . Bb2 . Bb1 . Bb2 . Bb1 . Bb2 . Bb1 . F2 . | F2 . F3 . F2 . F3 . F2 . F3 . F2 . C3 . | C2 . C3 . C2 . C3 . C2 . C3 . A1 . A2 .",
			},
			{
				name: "threat",
				wave: "pulse12",
				on: false,
				vol: 0.04,
				notes:
					"D4 A4 D5 A4 D4 A4 D5 A4 F4 A4 F5 A4 F4 A4 F5 A4 | Bb3 F4 Bb4 F4 Bb3 F4 Bb4 F4 D4 F4 D5 F4 D4 F4 D5 F4",
			},
			{
				name: "drums",
				wave: "drums",
				vol: 0.09,
				notes: "k . h . . . h . s . h . . . h h",
			},
		],
	};
	F.VICTORY = {
		bpm: 100,
		steps: 2,
		tracks: [
			{
				wave: "moon-pluck",
				vol: 0.22,
				notes: "D5 F5 A5 D6 - A5 F5 D6 - - - -",
			},
			{ wave: "triangle", vol: 0.18, notes: "D3 - A3 - F3 - A3 - D3 - - -" },
		],
	};
	F.FAILURE = {
		bpm: 92,
		steps: 2,
		tracks: [
			{ wave: "triangle", vol: 0.15, notes: "D4 - C4 - Bb3 - A3 - D3 - - -" },
		],
	};
	const effects = {
		armed: { wave: "pulse12", freq: 340, to: 510, dur: 0.065, vol: 0.075 },
		shot: { wave: "triangle", freq: 1400, to: 450, dur: 0.065, vol: 0.14 },
		warpPreview: { wave: "sine", freq: 180, to: 540, dur: 0.14, vol: 0.25 },
		warp: { wave: "noise", freq: 1300, to: 150, dur: 0.36, vol: 0.25 },
		denied: { wave: "square", freq: 140, to: 95, dur: 0.1, vol: 0.1 },
		rescue: {
			wave: "sine",
			freq: 620,
			to: 1280,
			arp: [0, 4, 7, 12],
			step: 0.055,
			dur: 0.32,
			vol: 0.3,
		},
		crystalHit: { wave: "sine", freq: 1050, to: 340, dur: 0.19, vol: 0.27 },
		collapse: {
			wave: "triangle",
			freq: 190,
			to: 750,
			arp: [0, 7, 12],
			step: 0.06,
			dur: 0.55,
			vol: 0.2,
		},
		damage: { wave: "noise", freq: 180, to: 60, dur: 0.3, vol: 0.4 },
		destroy: { wave: "noise", freq: 260, to: 55, dur: 0.23, vol: 0.25 },
		loss: { wave: "sine", freq: 680, to: 160, dur: 0.36, vol: 0.3 },
		lay: { wave: "pulse12", freq: 130, to: 270, dur: 0.13, vol: 0.1 },
		disarm: { wave: "sine", freq: 850, to: 230, dur: 0.11, vol: 0.07 },
		hit: { wave: "noise", freq: 520, to: 110, dur: 0.045, vol: 0.1 },
		shield: { wave: "sine", freq: 240, to: 380, dur: 0.12, vol: 0.12 },
	};
	class Sound {
		constructor(game) {
			this.g = game;
			this.a = game.audio;
			this.a.instrument("moon-pluck", F.pluck);
			for (const [key, value] of Object.entries(effects))
				this.a.define("moon-" + key, value);
			this.unlocked = false;
			this.lastVoice = -10;
			this.radioTurn = 0;
			this.voices = [];
			this.lastMusic = "";
			this.paused = false;
			if (!game.headless && typeof document !== "undefined")
				document.addEventListener(
					"click",
					(e) => {
						if (this.unlocked && e.target.closest?.(".esh button"))
							this.a.sfx("confirm", { vol: 0.12 });
					},
					{ signal: game._abort.signal },
				);
		}
		unlock() {
			if (this.g.headless) return;
			this.unlocked = true;
			this.a._init();
			if (this.a.ctx?.state === "suspended")
				this.a.ctx.resume().catch(() => {});
		}
		music(key) {
			if (key === this.lastMusic) return;
			this.lastMusic = key;
			if (!key) this.a.music(null);
			else
				this.a.music(
					key === "victory"
						? F.VICTORY
						: key === "failure"
							? F.FAILURE
							: F.SONG,
					{ sync: true, loop: key !== "victory" && key !== "failure" },
				);
		}
		event(e, quiet) {
			if (quiet || !this.unlocked) return;
			if (effects[e.type]) this.a.sfx("moon-" + e.type);
			if (
				["radio", "rescue", "bossPhase", "terminal"].includes(e.type) &&
				this.g.real - this.lastVoice > 2.2 &&
				this.a.ready
			) {
				this.lastVoice = this.g.real;
				this.voices = F.radioPhrase(
					this.a.ctx,
					this.a.bus("voice"),
					this.a.ctx.currentTime + 0.01,
					e.type === "rescue"
						? "survivor"
						: e.type === "bossPhase"
							? "navigator"
							: e.type === "radio" && this.radioTurn++ % 2 === 1
								? "navigator"
								: "pilot",
				);
			}
		}
		update(state, paused) {
			if (paused && !this.paused) this.clearVoices();
			this.paused = paused;
			if (this.unlocked && state && !state.outcome) {
				this.music("flight");
				this.a.layer(
					"threat",
					state.boss ||
						state.entities.some(
							(q) =>
								q.kind !== "crystal" &&
								q.kind !== "drone" &&
								Math.abs(q.x - state.ship.x) < 320,
						)
						? 0.8
						: 0,
					0.5,
				);
				this.a.tempo(state.boss ? 128 : state.sector === 2 ? 116 : 108);
			}
		}
		clearVoices() {
			for (const o of this.voices) {
				try {
					o.stop();
				} catch (_) {}
			}
			this.voices = [];
		}
		stop() {
			this.clearVoices();
			this.music("");
			this.a.music(null);
		}
	}
	F.Sound = Sound;
})(typeof globalThis === "object" ? globalThis : window);
