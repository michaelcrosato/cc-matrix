const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export class Sound {
	constructor(settings) {
		this.settings = settings;
		this.ctx = null;
		this.musicGain = null;
		this.nextBeat = 0;
		this.beat = 0;
		this.active = false;
		this.voices = 0;
		this.events = 0;
		this.lastVoice = -100;
	}
	unlock() {
		if (!this.ctx) {
			const AC = window.AudioContext || window.webkitAudioContext;
			if (!AC) return;
			this.ctx = new AC();
			this.master = this.ctx.createGain();
			this.master.gain.value = 0.68;
			this.master.connect(this.ctx.destination);
			this.fx = this.ctx.createGain();
			this.fx.connect(this.master);
			this.musicGain = this.ctx.createGain();
			this.musicGain.connect(this.master);
			this.voiceGain = this.ctx.createGain();
			this.voiceGain.connect(this.master);
			this.analyser = this.ctx.createAnalyser();
			this.analyser.fftSize = 512;
			this.master.connect(this.analyser);
			this.noise = this.ctx.createBuffer(
				1,
				this.ctx.sampleRate,
				this.ctx.sampleRate,
			);
			const d = this.noise.getChannelData(0);
			for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
			this.engine = this.ctx.createOscillator();
			this.engine.type = "sawtooth";
			this.engine.frequency.value = 50;
			const f = this.ctx.createBiquadFilter();
			f.type = "lowpass";
			f.frequency.value = 160;
			this.engineGain = this.ctx.createGain();
			this.engineGain.gain.value = 0;
			this.engine.connect(f);
			f.connect(this.engineGain);
			this.engineGain.connect(this.fx);
			this.engine.start();
			this.nextBeat = this.ctx.currentTime + 0.05;
		}
		this.ctx.resume().catch(() => {});
		this.volumes();
	}
	volumes() {
		if (!this.ctx) return;
		this.fx.gain.value = this.settings.sfx;
		this.musicGain.gain.value = this.settings.music;
		this.voiceGain.gain.value = this.settings.voice;
	}
	tone(
		freq,
		duration = 0.12,
		type = "triangle",
		gain = 0.12,
		time = null,
		dest = null,
		endFreq = null,
	) {
		if (!this.ctx) return;
		const t = time ?? this.ctx.currentTime,
			o = this.ctx.createOscillator(),
			g = this.ctx.createGain();
		o.type = type;
		o.frequency.setValueAtTime(freq, t);
		if (endFreq)
			o.frequency.exponentialRampToValueAtTime(
				Math.max(15, endFreq),
				t + duration,
			);
		g.gain.setValueAtTime(0, t);
		g.gain.linearRampToValueAtTime(gain, t + 0.008);
		g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
		o.connect(g);
		g.connect(dest || this.fx);
		o.start(t);
		o.stop(t + duration + 0.03);
		this.events++;
	}
	hiss(duration = 0.3, gain = 0.2, freq = 900, time = null) {
		if (!this.ctx) return;
		const t = time ?? this.ctx.currentTime,
			s = this.ctx.createBufferSource(),
			f = this.ctx.createBiquadFilter(),
			g = this.ctx.createGain();
		s.buffer = this.noise;
		f.type = "lowpass";
		f.frequency.value = freq;
		g.gain.setValueAtTime(gain, t);
		g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
		s.connect(f);
		f.connect(g);
		g.connect(this.fx);
		s.start(t);
		s.stop(t + duration);
		this.events++;
	}
	laser(enemy = false) {
		this.tone(
			enemy ? 370 : 890,
			0.12,
			"sawtooth",
			enemy ? 0.035 : 0.06,
			null,
			null,
			enemy ? 95 : 180,
		);
	}
	blast(big = false) {
		this.hiss(big ? 0.8 : 0.3, big ? 0.5 : 0.2, big ? 650 : 1200);
		this.tone(big ? 67 : 130, big ? 0.65 : 0.24, "sine", 0.3, null, null, 24);
	}
	cable() {
		this.tone(520, 0.3, "square", 0.04, null, null, 110);
		this.hiss(0.2, 0.07, 2300);
	}
	ping() {
		this.tone(660, 0.15, "sine", 0.12);
		this.tone(
			990,
			0.22,
			"sine",
			0.08,
			this.ctx ? this.ctx.currentTime + 0.12 : null,
		);
	}
	voice(text) {
		if (!this.ctx) return;
		const now = this.ctx.currentTime;
		if (now - this.lastVoice < 0.35) return;
		this.lastVoice = now;
		let seed = 0;
		for (const c of text) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
		const syllables = Math.min(19, Math.max(6, (text.length / 4) | 0));
		for (let i = 0; i < syllables; i++) {
			seed = (seed * 1664525 + 1013904223) >>> 0;
			const t = now + i * 0.085,
				p = 160 + (seed % 200);
			this.tone(
				p,
				0.06,
				"triangle",
				0.1,
				t,
				this.voiceGain,
				p * (i % 2 ? 1.4 : 0.8),
			);
			this.tone(p * 2.13, 0.048, "sine", 0.035, t + 0.008, this.voiceGain);
		}
		this.voices++;
	}
	update(speed = 0, playing = false, ended = false) {
		if (!this.ctx) return;
		this.volumes();
		this.master.gain.setTargetAtTime(
			ended ? 0 : 0.68,
			this.ctx.currentTime,
			0.1,
		);
		this.engineGain.gain.setTargetAtTime(
			playing ? 0.035 : 0,
			this.ctx.currentTime,
			0.1,
		);
		this.engine.frequency.setTargetAtTime(
			45 + speed * 1.3,
			this.ctx.currentTime,
			0.1,
		);
		if (ended || this.ctx.state !== "running") return;
		const now = this.ctx.currentTime;
		if (this.nextBeat < now - 0.5) this.nextBeat = now + 0.02;
		const notes = [
			62, 69, 65, 72, 69, 65, 60, 67, 64, 71, 67, 64, 58, 65, 62, 69,
		];
		while (this.nextBeat < now + 0.13) {
			const i = this.beat % 32,
				n = notes[this.beat % 16];
			const hz = 440 * 2 ** ((n - 69) / 12);
			this.tone(hz, 0.18, "triangle", 0.16, this.nextBeat, this.musicGain);
			if (i % 4 === 0) {
				this.tone(
					hz * 0.25,
					0.46,
					"sawtooth",
					0.15,
					this.nextBeat,
					this.musicGain,
				);
				this.tone(
					hz * 1.5,
					0.45,
					"triangle",
					0.045,
					this.nextBeat,
					this.musicGain,
				);
			}
			if (i % 8 === 4) {
				this.tone(92, 0.16, "sine", 0.09, this.nextBeat, this.musicGain, 30);
			}
			if (i % 2 === 1) {
				this.tone(
					1200,
					0.025,
					"triangle",
					0.018,
					this.nextBeat,
					this.musicGain,
				);
			}
			this.nextBeat += 60 / 108 / 2;
			this.beat++;
		}
	}
	level() {
		if (!this.analyser) return 0;
		const arr = new Float32Array(this.analyser.fftSize);
		this.analyser.getFloatTimeDomainData(arr);
		return Math.sqrt(arr.reduce((s, v) => s + v * v, 0) / arr.length);
	}
	async offlineProbe() {
		const C = window.OfflineAudioContext || window.webkitOfflineAudioContext;
		if (!C) return { supported: false };
		const c = new C(1, 24000, 24000),
			o = c.createOscillator(),
			g = c.createGain(),
			f = c.createBiquadFilter();
		o.type = "sawtooth";
		o.frequency.setValueAtTime(660, 0);
		o.frequency.exponentialRampToValueAtTime(90, 0.3);
		g.gain.setValueAtTime(0.08, 0);
		g.gain.exponentialRampToValueAtTime(0.0001, 0.5);
		f.type = "lowpass";
		f.frequency.value = 1800;
		o.connect(f);
		f.connect(g);
		g.connect(c.destination);
		o.start();
		o.stop(0.5);
		const data = (await c.startRendering()).getChannelData(0);
		return {
			supported: true,
			rms: Math.sqrt(data.reduce((s, v) => s + v * v, 0) / data.length),
			peak: data.reduce((m, v) => Math.max(m, Math.abs(v)), 0),
			musicDefault: 0.1,
		};
	}
}
