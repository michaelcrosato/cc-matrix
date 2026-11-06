(function (B) {
	"use strict";
	B.synthTone = function (
		ctx,
		bus,
		t,
		freq,
		dur = 0.12,
		vol = 0.15,
		wave = "triangle",
	) {
		const o = ctx.createOscillator(),
			g = ctx.createGain();
		o.type = wave;
		o.frequency.setValueAtTime(freq, t);
		o.frequency.exponentialRampToValueAtTime(
			Math.max(40, freq * 0.94),
			t + dur,
		);
		g.gain.setValueAtTime(0, t);
		g.gain.linearRampToValueAtTime(vol, t + 0.008);
		g.gain.exponentialRampToValueAtTime(0.00001, t + dur);
		o.connect(g);
		g.connect(bus);
		o.start(t);
		o.stop(t + dur + 0.01);
		return o;
	};
	B.Audio = function (game) {
		const A = game.audio;
		let mode = "",
			paused = false,
			last = 0;
		const nodes = new Set();
		const melodies = {
			title: "D5 F5 E5 D#5 E5 A5 G5 F5 | E5 . D5 . A4 . C5 .",
			live: "D5 Eb5 E5 F5 E5 Eb5 D5 C#5 | D5 A5 F5 E5 G5 F5 E5 C#5 | D5 F5 A5 C6 Bb5 A5 G5 E5 | F5 E5 Eb5 D5 C#5 E5 A4 .",
			boss: "D5 Eb5 E5 F5 Ab5 G5 F#5 F5 | E5 G5 Bb5 A5 F5 E5 C#5 A4",
			win: "D5 . F5 A5 . C6 . A5 | D6 . . . A5 . F5 .",
			loss: "F5 . E5 . Eb5 . D5 . | C#5 . A4 . D4 - - .",
		};
		function song(name) {
			return {
				bpm: name === "boss" ? 158 : 144,
				steps: 4,
				tracks: [
					{
						wave: "pulse12",
						vol: 0.13,
						notes: melodies[name] || melodies.live,
					},
					{
						wave: "triangle",
						vol: 0.19,
						notes:
							"D3 . A3 . D3 . F3 . | Bb2 . F3 . A2 . C#3 . | D3 . A3 . D3 . F3 . | G2 . D3 . A2 . C#3 .",
					},
					{
						wave: "noise",
						vol: 0.025,
						notes: "C5 . . . . . C6 . | C5 . . . . . C6 .",
					},
				],
			};
		}
		function babble(pitch = 500) {
			if (game.headless || globalThis.AIHub?.server) return;
			const bus = A.bus("voice"),
				ctx = A.ctx;
			if (!ctx || !bus || paused) return;
			for (let i = 0; i < 5; i++) {
				const n = B.synthTone(
					ctx,
					bus,
					ctx.currentTime + i * 0.055,
					pitch * [1, 1.37, 0.89, 1.62, 1.18][i],
					0.05,
					0.07,
					"square",
				);
				nodes.add(n);
				n.onended = () => nodes.delete(n);
			}
		}
		const defs = {
			spray: { wave: "noise", freq: 1600, to: 400, dur: 0.075, vol: 0.14 },
			convert: { wave: "triangle", freq: 270, to: 730, dur: 0.12, vol: 0.25 },
			shatter: { wave: "noise", freq: 900, to: 200, dur: 0.1, vol: 0.15 },
			feed: {
				wave: "sine",
				freq: 690,
				arp: [0, 4, 7, 12],
				step: 0.045,
				dur: 0.24,
				vol: 0.26,
			},
			call: { wave: "sine", freq: 980, to: 1400, dur: 0.13, vol: 0.21 },
			hive: {
				wave: "pulse12",
				freq: 180,
				arp: [0, 3, 7],
				step: 0.07,
				dur: 0.22,
				vol: 0.18,
			},
			warning: { wave: "saw", freq: 100, to: 240, dur: 0.28, vol: 0.16 },
			grow: { wave: "triangle", freq: 130, to: 440, dur: 0.14, vol: 0.15 },
			swap: { wave: "triangle", freq: 160, to: 660, dur: 0.27, vol: 0.24 },
			hop: { wave: "sine", freq: 230, to: 680, dur: 0.16, vol: 0.2 },
			stock: {
				wave: "pulse12",
				freq: 520,
				arp: [0, 4, 7, 12],
				step: 0.08,
				dur: 0.36,
				vol: 0.23,
			},
			shieldOpen: {
				wave: "triangle",
				freq: 340,
				arp: [0, 7, 12],
				step: 0.08,
				dur: 0.3,
				vol: 0.23,
			},
			shieldBreak: {
				wave: "saw",
				freq: 250,
				arp: [0, 4, 7, 12],
				step: 0.06,
				dur: 0.32,
				vol: 0.2,
			},
			bossHit: { wave: "triangle", freq: 180, to: 370, dur: 0.1, vol: 0.22 },
			birdHit: { wave: "sine", freq: 700, to: 160, dur: 0.2, vol: 0.18 },
			retreat: { wave: "sine", freq: 470, to: 130, dur: 0.4, vol: 0.16 },
			clear: {
				wave: "pulse12",
				freq: 440,
				arp: [0, 4, 7, 12],
				step: 0.1,
				dur: 0.5,
				vol: 0.19,
			},
		};
		return {
			set(name) {
				if (mode === name) return;
				mode = name;
				if (!paused && !globalThis.AIHub?.server)
					A.music(song(name), { sync: true });
				if (name === "win" || name === "loss")
					babble(name === "win" ? 620 : 330);
			},
			update(w) {
				if (!w) return;
				for (const e of w.events) {
					if (e.id <= last) continue;
					if (e.kind === "entry" && !paused && !globalThis.AIHub?.server)
						A.sfx({
							wave: "saw",
							freq: e.fast ? 190 : 115,
							to: e.fast ? 245 : 135,
							dur: 0.14,
							vol: 0.025,
						});
					if (defs[e.kind] && !paused && !globalThis.AIHub?.server)
						A.sfx(defs[e.kind]);
					if (["encounter", "birdReturn", "retreat"].includes(e.kind))
						babble(e.kind === "encounter" ? 360 : 850);
				}
				last = w.eventId;
			},
			resetEvents(id = 0) {
				last = id;
			},
			pause(on) {
				if (paused === on) return;
				paused = on;
				if (on) {
					A.music(null);
					for (const n of nodes) {
						try {
							n.stop();
						} catch {}
					}
					nodes.clear();
				} else if (mode && !globalThis.AIHub?.server)
					A.music(song(mode), { sync: true });
			},
			stop() {
				paused = true;
				A.music(null);
				for (const n of nodes) {
					try {
						n.stop();
					} catch {}
				}
				nodes.clear();
				if (A.ctx && A.ctx.state === "running") A.ctx.suspend().catch(() => {});
			},
			get mode() {
				return mode;
			},
			get paused() {
				return paused;
			},
			get activeNodes() {
				return nodes.size;
			},
			song,
		};
	};
})((globalThis.BCP = globalThis.BCP || {}));
