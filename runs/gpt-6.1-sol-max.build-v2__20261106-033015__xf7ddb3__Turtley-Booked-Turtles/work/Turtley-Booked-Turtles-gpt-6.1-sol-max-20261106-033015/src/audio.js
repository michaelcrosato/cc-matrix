((T) => {
	T.formant = (ctx, bus, time, freq = 310, dur = 0.18, vol = 0.12) => {
		const osc = ctx.createOscillator(),
			filter = ctx.createBiquadFilter(),
			gain = ctx.createGain();
		osc.type = "sawtooth";
		osc.frequency.setValueAtTime(freq, time);
		osc.frequency.exponentialRampToValueAtTime(freq * 1.4, time + dur * 0.45);
		osc.frequency.exponentialRampToValueAtTime(freq * 0.78, time + dur);
		filter.type = "bandpass";
		filter.frequency.setValueAtTime(880, time);
		filter.frequency.exponentialRampToValueAtTime(1700, time + dur * 0.55);
		filter.Q.value = 3.5;
		gain.gain.setValueAtTime(0, time);
		gain.gain.linearRampToValueAtTime(vol, time + 0.012);
		gain.gain.setValueAtTime(vol * 0.6, time + dur * 0.55);
		gain.gain.linearRampToValueAtTime(0, time + dur);
		osc.connect(filter);
		filter.connect(gain);
		gain.connect(bus);
		osc.start(time);
		osc.stop(time + dur + 0.01);
		osc.onended = () => {
			osc.disconnect();
			filter.disconnect();
			gain.disconnect();
		};
		return osc;
	};
	T.SONG = {
		bpm: 116,
		steps: 2,
		tracks: [
			{
				name: "bells",
				wave: "triangle",
				vol: 0.24,
				notes:
					"D5 . F#5 A5 . F#5 E5 . | D5 . B4 D5 A4 . . . | G4 B4 D5 . E5 D5 B4 . | A4 C#5 E5 . D5 . . .",
			},
			{
				name: "patter",
				wave: "triangle",
				vol: 0.14,
				notes:
					"D3 . A3 . D3 . A3 . | B2 . F#3 . B2 . F#3 . | G2 . D3 . G2 . D3 . | A2 . E3 . A2 . E3 .",
			},
			{
				name: "scat",
				wave: "turtle-voice",
				vol: 0.08,
				notes:
					". . D4 . . A4 . . | . . F#4 . . D4 . . | . . G4 . . B4 . . | A4 . . C#4 . D4 . .",
			},
			{
				name: "pursuit",
				wave: "drums",
				vol: 0.16,
				on: false,
				notes: "k . h . s . h . k . h . s . h .",
			},
		],
	};
	const cues = {
		pickup: [560, 930, 0.16],
		delivery: [620, 1240, 0.24],
		plant: [240, 140, 0.12],
		trigger: [120, 620, 0.28],
		expire: [380, 150, 0.13],
		empty: [150, 95, 0.23],
		busy: [300, 240, 0.08],
		refill: [420, 880, 0.2],
		"supply-ready": [780, 1040, 0.12],
		decoy: [360, 170, 0.25],
		sight: [920, 1280, 0.1],
		warning: [520, 620, 0.12],
		escalate: [650, 340, 0.16],
		recovery: [390, 660, 0.12],
		hit: [260, 90, 0.3],
		clear: [440, 880, 0.4],
		victory: [660, 1320, 0.55],
		floor: [360, 720, 0.2],
	};
	class Sound {
		constructor(game) {
			this.game = game;
			this.audio = game.audio;
			this.last = 0;
			this.nodes = new Set();
			this.playing = false;
			this.audio.instrument("turtle-voice", (ctx, bus, time, freq, dur, vol) =>
				T.formant(ctx, bus, time, freq, Math.min(dur, 0.2), vol),
			);
			for (const [name, [freq, to, dur]] of Object.entries(cues))
				this.audio.define("tb-" + name, {
					wave: name === "trigger" ? "noise" : "triangle",
					freq,
					to,
					dur,
					vol: name === "hit" ? 0.3 : 0.18,
					arp: name === "delivery" ? [0, 4, 7] : undefined,
					step: 0.07,
				});
		}
		music(on = true) {
			if (on === this.playing) return;
			this.playing = on;
			this.audio.music(on ? T.SONG : null, { sync: true });
		}
		voice(seat = 0) {
			const bus = this.audio.bus("voice"),
				ctx = this.audio.ctx;
			if (!bus || !ctx || !this.audio.ready) return;
			const n = T.formant(
				ctx,
				bus,
				ctx.currentTime,
				seat === 0 ? 320 : 400,
				0.21,
				0.15,
			);
			this.nodes.add(n);
			n.addEventListener("ended", () => this.nodes.delete(n));
		}
		update(st) {
			if (!st) return;
			for (const e of st.events || [])
				if (e.id > this.last) {
					this.last = e.id;
					if (cues[e.type]) this.audio.sfx("tb-" + e.type);
					if (["pickup", "delivery", "hit"].includes(e.type))
						this.voice(e.seat);
				}
			this.audio.layer(
				"pursuit",
				st.enemies.some((b) => b.state === "red" && b.stun <= 0) ? 0.55 : 0,
				0.4,
			);
		}
		stop() {
			this.music(false);
			for (const n of this.nodes)
				try {
					n.stop();
				} catch {}
			this.nodes.clear();
		}
	}
	T.Sound = Sound;
})(globalThis.TB);
