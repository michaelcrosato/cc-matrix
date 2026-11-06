//! A small note-event sequencer: it runs on the render thread and schedules ahead with
//! `Mixer::play_bus`'s delay, so tempo can follow the heart. Tracks are written as melodies
//! in text (`"A4:1 C5:1 E5:2"`), with a bass line per bar and a pad.

use crate::{BUS_MUSIC, Mixer, Patch, Wave};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Mus {
    Silence,
    Title,
    Tender,
    Tense,
    Or,
    Introit,
    Lacrimosa,
    DiesIrae,
    Libera,
    Fanfare,
    CodeBlue,
}

pub const ALL: [Mus; 10] = [Mus::Title, Mus::Tender, Mus::Tense, Mus::Or, Mus::Introit, Mus::Lacrimosa, Mus::DiesIrae, Mus::Libera, Mus::Fanfare, Mus::CodeBlue];

pub fn default_bpm(m: Mus) -> f32 {
    def(m).bpm
}

pub fn from_name(n: &str) -> Mus {
    match n {
        "title" => Mus::Title,
        "tender" => Mus::Tender,
        "tense" => Mus::Tense,
        "or" => Mus::Or,
        "introit" => Mus::Introit,
        "lacrimosa" => Mus::Lacrimosa,
        "dies_irae" => Mus::DiesIrae,
        "libera" => Mus::Libera,
        "fanfare" => Mus::Fanfare,
        "codeblue" | "crisis" => Mus::CodeBlue,
        _ => Mus::Silence,
    }
}

struct Def {
    meter: u32,
    bpm: f32,
    /// Melody notes, one loop; beats are quarter-note units of this track's meter.
    lead: &'static str,
    /// Bass root per bar.
    bass: &'static str,
    wave: Wave,
    pad: bool,
    once: bool,
}

fn def(m: Mus) -> Def {
    match m {
        Mus::Title => Def {
            meter: 4,
            bpm: 66.0,
            lead: "A4:2 C5:1 E5:1 D5:2 C5:2 | B4:1.5 C5:.5 D5:2 G4:4 | A4:1 C5:1 E5:2 F5:2 E5:1 D5:1 | C5:3 B4:1 A4:4",
            bass: "A2 F2 C3 G2 A2 F2 E2 A2",
            wave: Wave::Triangle,
            pad: true,
            once: false,
        },
        Mus::Tender => Def {
            meter: 4,
            bpm: 58.0,
            lead: "E5:1.5 D5:.5 C5:2 | D5:1.5 C5:.5 A4:2 | C5:2 E5:1 G5:1 | F5:3 E5:1 | D5:2 C5:2 | B4:2 A4:2",
            bass: "A2 F2 C3 G2 F2 E2",
            wave: Wave::Sine,
            pad: true,
            once: false,
        },
        Mus::Tense => Def {
            meter: 4,
            bpm: 84.0,
            lead: "E4:.5 r:.5 E4:.5 F4:.5 E4:1 r:1 | E4:.5 r:.5 E4:.5 F4:.5 G4:1 F4:1 | D4:.5 r:.5 D4:.5 Eb4:.5 D4:1 r:1 | C4:1 B3:1 A3:2",
            bass: "A2 A2 D2 A2",
            wave: Wave::Saw,
            pad: false,
            once: false,
        },
        Mus::Or => Def {
            meter: 4,
            bpm: 72.0,
            lead: "r:2 A4:1 r:1 | r:1 E4:1 r:1 C5:1 | r:2 G4:1 r:1 | r:1 D4:2 r:1",
            bass: "A2 A2 F2 G2",
            wave: Wave::Triangle,
            pad: true,
            once: false,
        },
        Mus::Introit => Def {
            // 3/4: a waltz that should not exist
            meter: 3,
            bpm: 72.0,
            lead: "E5:1 D5:1 C5:1 | B4:2 r:1 | E5:1 D5:1 C5:1 | D5:2 r:1 | G5:1 F5:1 E5:1 | D5:1 C5:1 B4:1 | A4:3",
            bass: "A2 A2 F2 E2 A2 D2 A2",
            wave: Wave::Triangle,
            pad: false,
            once: false,
        },
        Mus::Lacrimosa => Def {
            // 6/8 as six pulses
            meter: 6,
            bpm: 120.0,
            lead: "D5:1 F5:1 A5:1 G5:1 F5:1 E5:1 | D5:1 F5:1 A5:1 Bb5:2 A5:1 | G5:1 F5:1 E5:1 D5:1 C5:1 D5:1 | A4:3 r:3",
            bass: "D2 D2 Bb1 A1",
            wave: Wave::Sine,
            pad: true,
            once: false,
        },
        Mus::DiesIrae => Def {
            // 5/4
            meter: 5,
            bpm: 88.0,
            lead: "D4:1 C#4:1 D4:1 A3:1 r:1 | D4:1 C#4:1 D4:1 F4:1 E4:1 | D4:1 F4:1 E4:1 D4:1 C#4:1 | D4:3 r:2",
            bass: "D2 D2 Bb1 A1",
            wave: Wave::Saw,
            pad: false,
            once: false,
        },
        Mus::Libera => Def {
            // shifting meter: 7/8
            meter: 7,
            bpm: 100.0,
            lead: "A4:1 B4:1 C5:1 E5:2 D5:1 C5:1 | B4:1 C5:1 D5:1 G5:2 F5:1 E5:1 | E5:1 D5:1 C5:1 B4:2 A4:1 G#4:1 | A4:4 r:3",
            bass: "A2 F2 D2 E2",
            wave: Wave::Triangle,
            pad: true,
            once: false,
        },
        Mus::Fanfare => Def {
            meter: 4,
            bpm: 108.0,
            lead: "C5:.5 E5:.5 G5:1 C6:2 | G5:.5 C6:.5 E6:2 r:1 | C6:4",
            bass: "C3 G2 C3",
            wave: Wave::Square,
            pad: false,
            once: true,
        },
        Mus::CodeBlue => Def {
            meter: 4,
            bpm: 128.0,
            lead: "E4:.5 E4:.5 G4:.5 E4:.5 A4:.5 E4:.5 B4:.5 E4:.5 | E4:.5 E4:.5 G4:.5 E4:.5 D5:.5 B4:.5 A4:.5 G4:.5",
            bass: "E2 E2 C2 D2",
            wave: Wave::Saw,
            pad: false,
            once: false,
        },
        Mus::Silence => Def { meter: 4, bpm: 60.0, lead: "r:4", bass: "A2", wave: Wave::Sine, pad: false, once: false },
    }
}

/// MIDI note number from a name like "C#4", "Bb1", "A3".
pub fn midi(name: &str) -> Option<i32> {
    let b = name.as_bytes();
    let base = match b.first()? {
        b'C' => 0,
        b'D' => 2,
        b'E' => 4,
        b'F' => 5,
        b'G' => 7,
        b'A' => 9,
        b'B' => 11,
        _ => return None,
    };
    let mut i = 1;
    let mut acc = 0;
    if b.get(i) == Some(&b'#') {
        acc = 1;
        i += 1;
    } else if b.get(i) == Some(&b'b') {
        acc = -1;
        i += 1;
    }
    let oct: i32 = name[i..].parse().ok()?;
    Some((oct + 1) * 12 + base + acc)
}

pub fn hz(m: i32) -> f32 {
    440.0 * 2f32.powf((m as f32 - 69.0) / 12.0)
}

fn parse_lead(s: &str) -> Vec<(Option<i32>, f32)> {
    s.split_whitespace()
        .filter(|t| *t != "|")
        .filter_map(|t| {
            let (n, l) = t.split_once(':')?;
            let len: f32 = l.parse().ok()?;
            Some((if n == "r" { None } else { midi(n) }, len))
        })
        .collect()
}

pub struct Music {
    pub track: Mus,
    pub overlay: Mus,
    pub bpm: f32,
    pub level: f32,
    pub hush: bool,
    pub crisis: f32,
    lead: Vec<(Option<i32>, f32)>,
    lead_i: usize,
    lead_t: f64,
    ov_lead: Vec<(Option<i32>, f32)>,
    ov_i: usize,
    ov_t: f64,
    bar: u32,
    beat_now: f64,
    done: bool,
    hush_t: f32,
    last_bar: i64,
    pub beat_bass: bool,
}

impl Default for Music {
    fn default() -> Self {
        Self::new()
    }
}

fn pluck(wave: Wave, f: f32, vol: f32, len: f32, cutoff: f32) -> Patch {
    let mut p = Patch::new(wave, f);
    p.attack = 0.004;
    p.decay = len * 0.7;
    p.sustain = 0.15;
    p.hold = len * 0.1;
    p.release = len * 0.3;
    p.volume = vol;
    p.cutoff = cutoff;
    p.cutoff_end = cutoff * 0.5;
    p
}

impl Music {
    pub fn new() -> Self {
        Self {
            track: Mus::Silence,
            overlay: Mus::Silence,
            bpm: 72.0,
            level: 1.0,
            hush: false,
            crisis: 0.0,
            lead: vec![],
            lead_i: 0,
            lead_t: 0.0,
            ov_lead: vec![],
            ov_i: 0,
            ov_t: 0.0,
            bar: 0,
            beat_now: 0.0,
            done: false,
            hush_t: 0.0,
            last_bar: -1,
            beat_bass: false,
        }
    }

    pub fn set_track(&mut self, t: Mus) {
        if t == self.track {
            return;
        }
        self.track = t;
        let d = def(t);
        self.lead = parse_lead(d.lead);
        self.lead_i = 0;
        self.lead_t = self.beat_now.ceil();
        self.bar = 0;
        self.last_bar = -1;
        self.done = false;
        if d.once {
            self.bpm = d.bpm;
        }
    }

    pub fn set_overlay(&mut self, t: Mus) {
        if t == self.overlay {
            return;
        }
        self.overlay = t;
        self.ov_lead = if t == Mus::Silence { vec![] } else { parse_lead(def(t).lead) };
        self.ov_i = 0;
        self.ov_t = self.beat_now.ceil();
    }

    /// A heartbeat: the OR loop's bass lands on it.
    pub fn heartbeat(&mut self, mixer: &mut Mixer) {
        if self.track != Mus::Or || self.hush || self.beat_bass {
            return;
        }
        let d = def(self.track);
        let roots: Vec<&str> = d.bass.split_whitespace().collect();
        let r = roots[(self.bar as usize) % roots.len()];
        if let Some(m) = midi(r) {
            let mut p = pluck(Wave::Sine, hz(m), 0.5, 0.5, 700.0);
            p.freq_end = hz(m) * 0.96;
            p.glide = 0.15;
            mixer.play_bus(p, 0.0, 1.0, 0.0, BUS_MUSIC);
        }
        self.bar = self.bar.wrapping_add(1) % 4096;
    }

    /// Schedules the notes that fall in the next `dt` seconds.
    pub fn update(&mut self, mixer: &mut Mixer, dt: f32) {
        if self.track == Mus::Silence && self.overlay == Mus::Silence && self.crisis <= 0.01 {
            return;
        }
        let spb = 60.0 / self.bpm.max(30.0);
        let beats = (dt / spb) as f64;
        let end = self.beat_now + beats;
        if self.hush {
            // everything low-passed: one held note and one heartbeat
            self.hush_t -= dt;
            if self.hush_t <= 0.0 {
                self.hush_t = 2.6;
                let mut p = Patch::new(Wave::Sine, 110.0);
                p.attack = 0.8;
                p.decay = 1.0;
                p.sustain = 0.5;
                p.hold = 0.6;
                p.release = 1.0;
                p.volume = 0.35;
                mixer.play_bus(p, 0.0, 1.0, 0.0, BUS_MUSIC);
            }
            self.beat_now = end;
            return;
        }
        let d = def(self.track);
        let cut = if self.hush { 500.0 } else { 3000.0 };
        // lead
        while self.track != Mus::Silence && !self.done && self.lead_t < end && !self.lead.is_empty() {
            let (n, l) = self.lead[self.lead_i];
            if let Some(m) = n {
                let delay = ((self.lead_t - self.beat_now).max(0.0) as f32) * spb;
                let len = l * spb;
                let mut p = pluck(d.wave, hz(m), 0.30, len.max(0.25) * 1.6, cut);
                if matches!(d.wave, Wave::Saw | Wave::Square) {
                    p.volume = 0.12;
                }
                mixer.play_bus(p, 0.15, 1.0, delay, BUS_MUSIC);
                if d.pad || self.track == Mus::Title {
                    let mut q = pluck(Wave::Sine, hz(m) * 2.0, 0.07, len.max(0.25) * 2.0, 6000.0);
                    q.attack = 0.01;
                    mixer.play_bus(q, -0.15, 1.0, delay, BUS_MUSIC);
                }
            }
            self.lead_t += l as f64;
            self.lead_i += 1;
            if self.lead_i >= self.lead.len() {
                self.lead_i = 0;
                if d.once {
                    self.done = true;
                }
            }
        }
        // bass and pad: per bar
        let bar_beats = d.meter as f64;
        if self.track != Mus::Silence && self.track != Mus::Or {
            let roots: Vec<&str> = d.bass.split_whitespace().collect();
            let mut b = (self.last_bar + 1) as f64;
            while b * bar_beats < end && !self.done {
                let start = b * bar_beats;
                if start >= self.beat_now - 0.001 {
                    let delay = ((start - self.beat_now).max(0.0) as f32) * spb;
                    let r = roots[(b as usize) % roots.len()];
                    if let Some(m) = midi(r) {
                        let mut p = pluck(Wave::Sine, hz(m), 0.45, bar_beats as f32 * spb * 0.9, 600.0);
                        p.freq_end = hz(m);
                        mixer.play_bus(p, 0.0, 1.0, delay, BUS_MUSIC);
                        if d.meter != 4 {
                            // an accent mid-bar keeps odd meters moving
                            let mid = ((bar_beats / 2.0) as f32).floor() * spb;
                            let q = pluck(Wave::Sine, hz(m + 7), 0.2, 0.5, 700.0);
                            mixer.play_bus(q, 0.0, 1.0, delay + mid, BUS_MUSIC);
                        }
                        if d.pad {
                            for off in [0, 3, 7] {
                                let mut q = Patch::new(Wave::Saw, hz(m + 24 + off));
                                q.attack = 0.4;
                                q.decay = bar_beats as f32 * spb * 0.6;
                                q.sustain = 0.4;
                                q.hold = bar_beats as f32 * spb * 0.2;
                                q.release = 0.6;
                                q.volume = 0.035;
                                q.cutoff = 900.0;
                                q.cutoff_end = 600.0;
                                mixer.play_bus(q, if off == 3 { -0.3 } else { 0.3 }, 1.0, delay, BUS_MUSIC);
                            }
                        }
                    }
                }
                self.last_bar = b as i64;
                b += 1.0;
            }
        } else if self.track == Mus::Or {
            // OR loop: a quiet pad under the heartbeat bass
            let roots: Vec<&str> = d.bass.split_whitespace().collect();
            let mut b = (self.last_bar + 1) as f64;
            while b * bar_beats < end {
                let start = b * bar_beats;
                if start >= self.beat_now - 0.001 {
                    let delay = ((start - self.beat_now).max(0.0) as f32) * spb;
                    let r = roots[(b as usize) % roots.len()];
                    if let Some(m) = midi(r) {
                        let mut q = Patch::new(Wave::Saw, hz(m + 24));
                        q.attack = 0.5;
                        q.decay = 2.0;
                        q.sustain = 0.4;
                        q.hold = 1.0;
                        q.release = 0.8;
                        q.volume = 0.03;
                        q.cutoff = 700.0;
                        mixer.play_bus(q, 0.0, 1.0, delay, BUS_MUSIC);
                    }
                }
                self.last_bar = b as i64;
                b += 1.0;
            }
        }
        // overlay motif (a strain in its own meter)
        let od = def(self.overlay);
        while self.overlay != Mus::Silence && self.ov_t < end && !self.ov_lead.is_empty() {
            let (n, l) = self.ov_lead[self.ov_i];
            if let Some(m) = n {
                let delay = ((self.ov_t - self.beat_now).max(0.0) as f32) * spb;
                let mut p = pluck(od.wave, hz(m), 0.12, l * spb * 1.8, 2200.0);
                p.attack = 0.01;
                mixer.play_bus(p, -0.2, 1.0, delay, BUS_MUSIC);
            }
            self.ov_t += l as f64;
            self.ov_i = (self.ov_i + 1) % self.ov_lead.len();
        }
        // crisis layer: tremolo minor seconds that grow as vitals fall
        if self.crisis > 0.02 {
            let step = spb * 0.5;
            let k = (self.beat_now / step as f64).floor();
            let k1 = (end / step as f64).floor();
            if k1 > k {
                for (j, m) in [(0, 81), (1, 82)] {
                    let mut p = Patch::new(Wave::Triangle, hz(m));
                    p.attack = 0.01;
                    p.decay = step * 0.8;
                    p.release = 0.05;
                    p.volume = 0.12 * self.crisis;
                    p.cutoff = 4000.0;
                    mixer.play_bus(p, if j == 0 { -0.4 } else { 0.4 }, 1.0, 0.0, BUS_MUSIC);
                }
            }
        }
        self.beat_now = end;
    }
}
