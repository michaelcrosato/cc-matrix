(() => {
	const melody =
		"E5 . G5 A5 . G5 E5 D5 C5 . E5 G5 . A5 G5 . E5 . G5 B5 . A5 G5 E5 D5 . C5 D5 E5 . . .";
	const music = {
		bpm: 118,
		steps: 4,
		len: 64,
		tracks: [
			{ wave: "triangle", vol: 0.19, notes: `${melody} ${melody}` },
			{
				wave: "square",
				vol: 0.055,
				notes:
					"C3 . . . G2 . . . A2 . . . E3 . . . F3 . . . C3 . . . G2 . G3 . C3 . . .",
			},
			{
				wave: "triangle",
				vol: 0.045,
				notes: ". . C5 . . . G4 . . . E5 . . . D5 .",
			},
		],
	};
	const finale = {
		...music,
		bpm: 142,
		tracks: [
			{
				wave: "triangle",
				vol: 0.18,
				notes: "C6 . G5 E5 . G5 A5 . G5 E5 D5 . E5 G5 . .",
			},
			music.tracks[1],
		],
	};
	const specs = {
		bite: [{ wave: "triangle", freq: 420, to: 230, dur: 0.07, vol: 0.2 }],
		power: [
			{ wave: "triangle", freq: 440, to: 1320, dur: 0.2, vol: 0.23 },
			{ wave: "sine", freq: 660, to: 1760, dur: 0.24, delay: 0.09, vol: 0.16 },
		],
		catch: [
			{ wave: "square", freq: 330, to: 990, dur: 0.14, vol: 0.13 },
			{
				wave: "triangle",
				freq: 880,
				to: 1760,
				dur: 0.17,
				delay: 0.12,
				vol: 0.17,
			},
		],
		hit: [
			{ wave: "triangle", freq: 330, to: 55, dur: 0.42, vol: 0.3 },
			{ wave: "noise", freq: 800, to: 90, dur: 0.14, vol: 0.12 },
		],
		chirp: [
			{ wave: "sine", freq: 880, to: 1760, dur: 0.17, vol: 0.24 },
			{ wave: "sine", freq: 1320, to: 660, dur: 0.2, delay: 0.1, vol: 0.15 },
		],
		gate: [
			{ wave: "triangle", freq: 150, to: 240, dur: 0.11, vol: 0.12 },
			{ wave: "sine", freq: 660, dur: 0.08, delay: 0.14, vol: 0.1 },
		],
		warning: [{ wave: "square", freq: 740, to: 680, dur: 0.06, vol: 0.08 }],
		tunnel: [{ wave: "sine", freq: 220, to: 1000, dur: 0.14, vol: 0.12 }],
		respawn: [{ wave: "sine", freq: 330, to: 660, dur: 0.15, vol: 0.15 }],
		clear: [
			{ wave: "triangle", freq: 523, dur: 0.14, vol: 0.23 },
			{ wave: "triangle", freq: 659, dur: 0.14, delay: 0.15, vol: 0.23 },
			{ wave: "triangle", freq: 784, dur: 0.14, delay: 0.3, vol: 0.23 },
			{ wave: "triangle", freq: 1047, dur: 0.45, delay: 0.45, vol: 0.23 },
		],
	};
	class ChompAudio {
		constructor(game) {
			this.game = game;
			this.a = game.audio;
			this.unlocked = false;
			this.lastTarget = false;
			this.seen = new Set();
			this.events = [];
			for (const [k, v] of Object.entries(specs))
				this.a.define(`chomp-${k}`, v);
		}
		unlock() {
			if (this.unlocked) return;
			this.unlocked = true;
			this.a._init();
			this.start();
		}
		start() {
			if (this.unlocked)
				this.a.music(this.lastTarget ? finale : music, {
					sync: true,
					fade: 0.12,
				});
		}
		stop() {
			this.a.stopMusic(0);
			this.a.mute(true);
		}
		update(s) {
			const last = s.foods?.filter((f) => f.alive !== false).length <= 3;
			if (last !== this.lastTarget) {
				this.lastTarget = last;
				this.start();
			}
		}
		event(e) {
			if (!this.unlocked) return;
			const id = e.id ?? `${e.type}:${e.tick}`;
			if (this.seen.has(id)) return;
			this.seen.add(id);
			if (this.seen.size > 500)
				this.seen.delete(this.seen.values().next().value);
			const type =
				{
					food: "bite",
					eat: "bite",
					collect: "bite",
					powered: "power",
					enemy: "catch",
					"enemy-eaten": "catch",
					damage: "hit",
					reveal: "chirp",
					turn: "gate",
					"gate-turn": "gate",
					"gate-warning": "warning",
					"power-warning": "warning",
					"stage-clear": "clear",
					won: "clear",
					victory: "clear",
					respawn: "respawn",
					tunnel: "tunnel",
				}[e.type] || e.type;
			if (specs[type]) {
				this.a.sfx(`chomp-${type}`);
				this.events.push(type);
				if (this.events.length > 64) this.events.shift();
			}
			if (["hit", "clear", "power"].includes(type)) this.babble(type);
		}
		babble(kind) {
			const bus = this.a.bus("voice"),
				c = this.a.ctx;
			if (!bus || !c) return;
			const notes =
				kind === "hit"
					? [430, 290, 180]
					: kind === "clear"
						? [390, 520, 470, 660]
						: [510, 620, 750];
			notes.forEach((f, i) => {
				ChompAudio.phoneme(c, bus, c.currentTime + i * 0.085, f, 0.07, 0.07);
			});
		}
		static phoneme(c, bus, t, f, d = 0.08, vol = 0.1) {
			const o = c.createOscillator(),
				form = c.createBiquadFilter(),
				g = c.createGain();
			o.type = "sawtooth";
			o.frequency.setValueAtTime(f, t);
			o.frequency.exponentialRampToValueAtTime(f * 1.24, t + d);
			form.type = "bandpass";
			form.frequency.setValueAtTime(f * 2.8, t);
			form.Q.value = 3;
			g.gain.setValueAtTime(0, t);
			g.gain.linearRampToValueAtTime(vol, t + 0.008);
			g.gain.exponentialRampToValueAtTime(0.0001, t + d);
			o.connect(form);
			form.connect(g);
			g.connect(bus);
			o.start(t);
			o.stop(t + d + 0.01);
		}
	}
	globalThis.ChompAudio = ChompAudio;
})();
