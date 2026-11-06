(() => {
	"use strict";
	const T = (globalThis.TSS = globalThis.TSS || {});
	const songs = {
		title: {
			bpm: 112,
			steps: 4,
			tracks: [
				{
					wave: "triangle",
					vol: 0.28,
					notes:
						"C5 . E5 G5 . E5 D5 . | C5 . G4 . A4 . G4 . | F5 . E5 D5 . C5 D5 . | G4 . B4 . C5 - . . ",
				},
				{
					wave: "sine",
					vol: 0.22,
					notes:
						"C3 . . . G3 . . . | A2 . . . E3 . . . | F3 . . . C3 . . . | G2 . . . C3 . . . ",
				},
			],
		},
		play: {
			bpm: 124,
			steps: 4,
			tracks: [
				{
					wave: "turtle",
					vol: 0.2,
					notes:
						"C5 . E5 . G5 . E5 D5 | C5 . C5 D5 E5 . G5 . | A5 . G5 E5 F5 . E5 D5 | G5 . E5 . D5 . C5 . | E5 . G5 . C6 . B5 G5 | A5 . G5 E5 D5 . C5 . | F5 . A5 G5 E5 . D5 . | G4 . B4 . C5 - . . ",
				},
				{
					wave: "triangle",
					vol: 0.2,
					notes:
						"C3 . G3 . C4 . G3 . | C3 . G3 . C4 . E3 . | F3 . C4 . F3 . C4 . | G3 . D4 . C3 . G3 . ",
				},
				{
					wave: "drums",
					vol: 0.07,
					notes: "k . h . . . h . | k . h . s . h . ",
				},
				{
					name: "pursuit",
					wave: "sine",
					vol: 0.1,
					on: false,
					notes: "C4 . C4 . G3 . G3 . | D4 . D4 . G3 . B3 . ",
				},
			],
		},
	};
	const cues = {
		discover: { wave: "triangle", freq: 500, to: 1000, dur: 0.13, vol: 0.2 },
		pickup: [
			{ wave: "sine", freq: "C5", dur: 0.15, vol: 0.23 },
			{ wave: "triangle", freq: "E5", delay: 0.08, dur: 0.16, vol: 0.18 },
		],
		deliver: [
			{ wave: "triangle", freq: "C5", dur: 0.15, vol: 0.25 },
			{ wave: "triangle", freq: "E5", delay: 0.11, dur: 0.2, vol: 0.23 },
			{ wave: "sine", freq: "G5", delay: 0.22, dur: 0.32, vol: 0.25 },
		],
		bomb: { wave: "sine", freq: 350, to: 120, dur: 0.14, vol: 0.25 },
		stun: [
			{ wave: "noise", freq: 1600, to: 300, dur: 0.16, vol: 0.13 },
			{ wave: "triangle", freq: 900, to: 160, dur: 0.22, vol: 0.2 },
		],
		bombExpire: { wave: "sine", freq: 400, to: 200, dur: 0.12, vol: 0.15 },
		empty: {
			wave: "square",
			freq: 170,
			dur: 0.16,
			vol: 0.1,
			arp: [0, -3, 0],
			step: 0.05,
		},
		bombBusy: { wave: "sine", freq: 310, dur: 0.09, vol: 0.14 },
		supply: [
			{ wave: "triangle", freq: 500, to: 1000, dur: 0.16, vol: 0.2 },
			{ wave: "sine", freq: 1250, delay: 0.13, dur: 0.2, vol: 0.18 },
		],
		supplyReady: { wave: "sine", freq: 880, dur: 0.12, vol: 0.09 },
		detect: { wave: "pulse", freq: 680, to: 900, dur: 0.1, vol: 0.08 },
		warning: {
			wave: "triangle",
			freq: 240,
			dur: 0.22,
			vol: 0.1,
			arp: [0, 1, 0, 1],
			step: 0.05,
		},
		escalate: { wave: "pulse", freq: 360, to: 720, dur: 0.19, vol: 0.12 },
		recover: { wave: "sine", freq: 150, to: 380, dur: 0.18, vol: 0.1 },
		hit: [
			{ wave: "noise", freq: 1100, to: 240, dur: 0.12, vol: 0.16 },
			{ wave: "triangle", freq: 420, to: 110, dur: 0.28, vol: 0.24 },
		],
		floorClear: [
			{ wave: "triangle", freq: "C5", dur: 0.18, vol: 0.2 },
			{ wave: "triangle", freq: "E5", delay: 0.14, dur: 0.18, vol: 0.2 },
			{ wave: "triangle", freq: "G5", delay: 0.28, dur: 0.18, vol: 0.2 },
			{ wave: "sine", freq: "C6", delay: 0.42, dur: 0.45, vol: 0.25 },
		],
		victory: [
			{ wave: "triangle", freq: "C5", dur: 0.2, vol: 0.25 },
			{ wave: "triangle", freq: "E5", delay: 0.15, dur: 0.2, vol: 0.25 },
			{ wave: "triangle", freq: "G5", delay: 0.3, dur: 0.25, vol: 0.25 },
			{ wave: "triangle", freq: "C6", delay: 0.5, dur: 0.7, vol: 0.25 },
		],
		loss: { wave: "triangle", freq: 450, to: 110, dur: 0.7, vol: 0.2 },
		beetleReveal: { wave: "noise", freq: 500, to: 1800, dur: 0.2, vol: 0.12 },
		home: { wave: "sine", freq: 1100, dur: 0.13, vol: 0.1 },
	};
	function vocal(ctx, bus, time, freq, dur = 0.2, vol = 0.2) {
		const source = ctx.createOscillator(),
			formant = ctx.createBiquadFilter(),
			gain = ctx.createGain();
		source.type = "sawtooth";
		source.frequency.setValueAtTime(freq * 0.5, time);
		source.frequency.exponentialRampToValueAtTime(
			freq * 0.68,
			time + dur * 0.4,
		);
		source.frequency.exponentialRampToValueAtTime(freq * 0.43, time + dur);
		formant.type = "bandpass";
		formant.Q.value = 3.5;
		formant.frequency.setValueAtTime(freq * 3, time);
		formant.frequency.exponentialRampToValueAtTime(freq * 1.9, time + dur);
		gain.gain.setValueAtTime(0, time);
		gain.gain.linearRampToValueAtTime(vol, time + 0.012);
		gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
		source.connect(formant);
		formant.connect(gain);
		gain.connect(bus);
		source.start(time);
		source.stop(time + dur + 0.02);
		const handle = {
			playing: true,
			stop() {
				if (!handle.playing) return;
				handle.playing = false;
				gain.gain.cancelScheduledValues(ctx.currentTime);
				gain.gain.setValueAtTime(0, ctx.currentTime);
				try {
					source.stop();
				} catch (_) {}
			},
		};
		source.onended = () => {
			handle.playing = false;
			source.disconnect();
			formant.disconnect();
			gain.disconnect();
		};
		return handle;
	}
	class Sound {
		constructor(game) {
			this.game = game;
			this.audio = game.audio;
			this.mode = "";
			this.lastVoice = -10;
			this.handles = [];
			this.voices = [];
			this.audio.instrument("turtle", (...args) => {
				this.voices.push(vocal(...args));
			});
			for (const [name, voice] of Object.entries(cues))
				this.audio.define("tss-" + name, voice);
		}
		music(mode) {
			if (mode === this.mode) return;
			this.mode = mode;
			this.audio.music(songs[mode] || null, { sync: true });
		}
		events(events) {
			for (const event of events || []) {
				const aliases = {
					reveal: event.outcome === "beetle" ? "beetleReveal" : "discover",
					active: "bombBusy",
					trigger: "stun",
					expire: "bombExpire",
					"supply-ready": "supplyReady",
					clear: "floorClear",
					win: "victory",
				};
				const kind =
					aliases[event.type || event.kind] || event.type || event.kind;
				if (cues[kind])
					this.handles.push(
						this.audio.sfx("tss-" + kind, {
							vary: 0,
							pan: event.x ? (event.x / 336 - 0.5) * 0.5 : 0,
						}),
					);
				if (["pickup", "deliver", "hit", "victory"].includes(kind))
					this.babble(kind);
			}
		}
		babble(kind) {
			if (this.game.real - this.lastVoice < 0.28) return;
			const bus = this.audio.bus("voice"),
				ctx = this.audio.ctx;
			if (!bus || ctx.state !== "running") return;
			this.lastVoice = this.game.real;
			const base = kind === "hit" ? 260 : kind === "pickup" ? 690 : 480;
			for (let k = 0; k < 3; k++)
				this.voices.push(
					vocal(
						ctx,
						bus,
						ctx.currentTime + k * 0.08,
						base * [1, 1.24, 0.94][k],
						0.075,
						0.13,
					),
				);
		}
		update(state) {
			this.handles = this.handles.filter((h) => h.playing).slice(-48);
			this.voices = this.voices.filter((h) => h.playing);
			if (this.mode === "play")
				this.audio.layer(
					"pursuit",
					state.enemies.some((e) => e.state === "red") ? 0.13 : 0,
					0.4,
				);
		}
		flush() {
			for (const h of [...this.handles, ...this.voices]) h.stop();
			this.handles.length = 0;
			this.voices.length = 0;
			this.lastVoice = -10;
		}
		stop() {
			this.music("");
			this.flush();
			this.audio.mute(true);
		}
	}
	T.Sound = Sound;
	T.audioSpec = { songs, cues, vocal };
})();
