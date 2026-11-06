//! The music: a small note-event sequencer on the render thread that schedules ahead with the
//! mixer's `delay`, so tempo can follow the heart. Every melody here is written for this game.
//! Notes are text: `A4:2` is the A above middle C for two beats, `.:1` a rest, `C4+E4+G4:3` a chord.

use crate::{BUS_MUSIC, Patch, Sink, Wave};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Instr {
    Piano,
    Pad,
    Bass,
    Pluck,
    Bell,
    Strings,
    Pulse,
}

#[derive(Clone, Copy, Debug)]
pub struct Note {
    pub at: f32,
    pub midi: u8,
    pub len: f32,
    pub vel: f32,
    pub instr: Instr,
}

fn midi_of(name: &str) -> Option<u8> {
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
    let mut acc = 0i32;
    if b.get(1) == Some(&b'#') {
        acc = 1;
        i = 2;
    } else if b.get(1) == Some(&b'b') {
        acc = -1;
        i = 2;
    }
    let octave: i32 = name[i..].parse().ok()?;
    Some(((octave + 1) * 12 + base + acc) as u8)
}

/// Parses a line of notes into events, from beat 0.
pub fn line(text: &str, instr: Instr, vel: f32) -> Vec<Note> {
    let mut at = 0.0;
    let mut out = Vec::new();
    for tok in text.split_whitespace() {
        let (names, len) = tok.split_once(':').unwrap_or((tok, "1"));
        let len: f32 = len.parse().unwrap_or(1.0);
        if names != "." {
            for n in names.split('+') {
                if let Some(midi) = midi_of(n) {
                    out.push(Note { at, midi, len, vel, instr });
                }
            }
        }
        at += len;
    }
    out
}

/// A track: its loop length in beats, notes, and how it keeps time.
#[derive(Clone, Debug)]
pub struct Track {
    pub bar: u8,
    pub length: f32,
    pub notes: Vec<Note>,
    /// Beats per minute for tracks that don't follow the heart (0 = follow it).
    pub tempo: f32,
    /// A layer that fades in with the crisis.
    pub crisis: Vec<Note>,
    /// Plays once, then silence.
    pub once: bool,
}

fn join(parts: Vec<Vec<Note>>) -> Vec<Note> {
    parts.into_iter().flatten().collect()
}

/// The track table, by `content::MUSIC` id.
pub fn track(id: u8) -> Option<Track> {
    use Instr::*;
    Some(match id {
        // Title: slow, minor, a piano in an empty ward; in three, because it knows.
        1 => Track {
            bar: 3,
            length: 48.0,
            tempo: 54.0,
            once: false,
            crisis: Vec::new(),
            notes: join(vec![
                line(
                    "A4:1 C5:1 E5:1 D5:2 C5:1 B4:2 G4:1 A4:3 | E4:1 A4:1 C5:1 F5:2 E5:1 D5:1 C5:1 B4:1 C5:3",
                    Piano,
                    0.75,
                ),
                shift(line("A5:2 G5:1 F5:2 E5:1 D5:1 F5:1 A5:1 G5:3 E5:1 C5:1 D5:1 E5:2 C5:1 B4:1 A4:1 G#4:1 A4:3 .:3", Piano, 0.7), 24.0),
                line(
                    "A2+E3:3 A2+E3:3 F2+C3:3 F2+C3:3 D3+A3:3 D3+A3:3 E2+B2:3 A2+E3:3 F2+C3:3 C3+G3:3 D3+A3:3 E2+B2:3 F2+C3:3 D3+A3:3 E2+B2:3 A2+E3:3",
                    Piano,
                    0.32,
                ),
            ]),
        },
        // Tender: story's quiet scenes, a rocking major-with-doubts.
        2 => Track {
            bar: 4,
            length: 32.0,
            tempo: 66.0,
            once: false,
            crisis: Vec::new(),
            notes: join(vec![
                line("E5:2 D5:1 C5:1 G4:3 .:1 A4:1 C5:1 F5:2 E5:3 .:1 D5:1 E5:1 F5:1 A5:1 G5:2 E5:1 C5:1 D5:2 B4:2 C5:3 .:1", Piano, 0.55),
                line("C3+G3+E4:4 A2+E3+C4:4 F2+C3+A3:4 C3+G3+E4:4 D3+A3+F4:4 G2+D3+B3:4 A2+E3+C4:2 F2+C3+A3:2 G2+D3+B3:2 C3+G3+E4:2", Pad, 0.32),
            ]),
        },
        // Tense: story's dark scenes; a pedal and a falling cello line.
        3 => Track {
            bar: 4,
            length: 16.0,
            tempo: 72.0,
            once: false,
            crisis: Vec::new(),
            notes: join(vec![
                line("D2:1 .:1 D2:1 .:1 D2:1 .:1 D2:1 .:1 Bb1:1 .:1 Bb1:1 .:1 A1:1 .:1 A1:1 .:1", Bass, 0.8),
                line("A4:3 G4:1 F4:3 E4:1 D4:3 F4:1 E4:4", Strings, 0.42),
                line(".:8 D5:2 C#5:2 D5:1 F5:1 E5:2", Bell, 0.2),
            ]),
        },
        // The OR loop: its bass lands on the actual heartbeat.
        4 => Track {
            bar: 4,
            length: 16.0,
            tempo: 0.0,
            once: false,
            crisis: join(vec![
                line("A5:1 C6:1 A5:1 G5:1 F5:1 A5:1 F5:1 E5:1 D5:1 F5:1 D5:1 C5:1 B4:1 D5:1 E5:2", Pluck, 0.5),
                line("A2:0.5 A2:0.5 A2:0.5 A2:0.5 A2:0.5 A2:0.5 A2:0.5 A2:0.5 F2:0.5 F2:0.5 F2:0.5 F2:0.5 F2:0.5 F2:0.5 F2:0.5 F2:0.5 D2:0.5 D2:0.5 D2:0.5 D2:0.5 D2:0.5 D2:0.5 D2:0.5 D2:0.5 E2:0.5 E2:0.5 E2:0.5 E2:0.5 E2:0.5 E2:0.5 E2:0.5 E2:0.5", Pulse, 0.42),
            ]),
            notes: join(vec![
                line("A1:1 A1:1 A1:1 A1:1 F1:1 F1:1 F1:1 F1:1 D2:1 D2:1 D2:1 D2:1 E1:1 E1:1 E1:1 E1:1", Bass, 0.9),
                line("A3+C4+E4:4 F3+A3+C4:4 D3+F3+A3:4 E3+G#3+B3:4", Pad, 0.3),
                line(".:2 E5:1 .:1 .:2 C5:1 .:1 .:2 A4:1 .:1 .:2 B4:1 .:1", Pluck, 0.3),
            ]),
        },
        // Introit: a waltz nobody asked for, 3/4.
        5 => Track {
            bar: 3,
            length: 24.0,
            tempo: 0.0,
            once: false,
            crisis: line("E6:0.5 D#6:0.5 E6:0.5 B5:0.5 D6:0.5 C6:0.5 A5:1.5 .:1.5", Bell, 0.3),
            notes: join(vec![
                line("D5:2 F5:1 A5:2 G5:1 F5:1 E5:1 D5:1 C#5:3 D5:2 E5:1 F5:2 A5:1 G5:1 E5:1 C#5:1 D5:3", Strings, 0.5),
                line("D2:1 A3+F4:1 A3+F4:1 D2:1 A3+F4:1 A3+F4:1 A1:1 G3+E4:1 G3+E4:1 A1:1 G3+E4:1 G3+E4:1 D2:1 A3+F4:1 A3+F4:1 Bb1:1 G3+D4:1 G3+D4:1 A1:1 G3+E4:1 G3+E4:1 D2:1 A3+F4:1 A3+F4:1", Piano, 0.4),
            ]),
        },
        // Lacrimosa: a weeping 6/8.
        6 => Track {
            bar: 6,
            length: 24.0,
            tempo: 0.0,
            once: false,
            crisis: line("G5:1 Bb5:1 D6:1 C6:1 Bb5:1 A5:1", Bell, 0.25),
            notes: join(vec![
                line("D5:3 C5:1 Bb4:1 A4:1 Bb4:2 G4:1 F#4:3 G4:1 A4:1 Bb4:1 D5:1 C5:1 Bb4:1 A4:6", Strings, 0.5),
                line("G2:1 D3:1 G3:1 Bb3:1 G3:1 D3:1 D2:1 A2:1 D3:1 F#3:1 D3:1 A2:1 Eb2:1 Bb2:1 Eb3:1 G3:1 Eb3:1 Bb2:1 D2:1 A2:1 D3:1 F#3:1 D3:1 A2:1", Pluck, 0.42),
            ]),
        },
        // Dies Irae: a furious 5/4, built on the count.
        7 => Track {
            bar: 5,
            length: 20.0,
            tempo: 0.0,
            once: false,
            crisis: line("F5:0.5 E5:0.5 F5:0.5 G5:0.5 Ab5:1 G5:1 F5:1", Strings, 0.4),
            notes: join(vec![
                line("F2:1 F2:1 C3:1 F2:1 Ab2:1 Eb2:1 Eb2:1 Bb2:1 Eb2:1 G2:1 Db2:1 Db2:1 Ab2:1 Db2:1 F2:1 C2:1 C2:1 G2:1 C2:1 E2:1", Bass, 0.85),
                line("C5:2 Db5:1 C5:1 Ab4:1 Bb4:2 C5:1 Bb4:1 G4:1 Ab4:2 Bb4:1 Ab4:1 F4:1 G4:3 .:2", Strings, 0.48),
                line(".:4 F4+Ab4+C5:1 .:4 Eb4+G4+Bb4:1 .:4 Db4+F4+Ab4:1 .:4 C4+E4+G4:1", Pulse, 0.5),
            ]),
        },
        // Libera Me: everything, shifting; here in a restless 7/8.
        8 => Track {
            bar: 7,
            length: 28.0,
            tempo: 0.0,
            once: false,
            crisis: line("A5:1 G5:1 A5:1 C6:1 B5:1 A5:1 E5:1", Bell, 0.28),
            notes: join(vec![
                line("A1:1 E2:1 A2:1 E2:1 A1:1 E2:1 A2:1 F1:1 C2:1 F2:1 C2:1 F1:1 C2:1 F2:1 D2:1 A2:1 D3:1 A2:1 D2:1 A2:1 D3:1 E1:1 B1:1 E2:1 B1:1 E1:1 G#1:1 B1:1", Bass, 0.8),
                line("A4:3 C5:2 E5:2 F5:3 E5:2 C5:2 D5:3 F5:2 A5:2 G#5:3 E5:2 B4:2", Strings, 0.5),
            ]),
        },
        // Code Blue: the drive.
        9 => Track {
            bar: 4,
            length: 16.0,
            tempo: 0.0,
            once: false,
            crisis: line("D6:0.5 C6:0.5 A5:0.5 G5:0.5 A5:1 .:1", Bell, 0.3),
            notes: join(vec![
                line("D2:0.5 D2:0.5 D3:0.5 D2:0.5 D2:0.5 D2:0.5 C3:0.5 D2:0.5 Bb1:0.5 Bb1:0.5 Bb2:0.5 Bb1:0.5 F2:0.5 F2:0.5 F3:0.5 F2:0.5 G1:0.5 G1:0.5 G2:0.5 G1:0.5 G1:0.5 G1:0.5 F2:0.5 G1:0.5 A1:0.5 A1:0.5 A2:0.5 A1:0.5 A1:0.5 C#2:0.5 E2:0.5 A2:0.5", Pulse, 0.5),
                line("D5:1 F5:1 A5:2 Bb4:1 D5:1 F5:2 G4:1 Bb4:1 D5:2 A4:1 C#5:1 E5:2", Strings, 0.42),
            ]),
        },
        // Results: a small fanfare that won't quite believe it.
        10 => Track {
            bar: 4,
            length: 12.0,
            tempo: 92.0,
            once: true,
            crisis: Vec::new(),
            notes: join(vec![
                line("C5:0.5 E5:0.5 G5:1 C6:2 B5:0.5 A5:0.5 G5:1 E5:2 F5:1 A5:1 G5:1 E5:1", Bell, 0.42),
                line("C3+G3+E4:4 F3+C4+A4:2 G3+D4+B4:2 C3+G3+E4:4", Pad, 0.36),
            ]),
        },
        _ => return None,
    })
}

fn shift(mut v: Vec<Note>, by: f32) -> Vec<Note> {
    for n in &mut v {
        n.at += by;
    }
    v
}

fn hz(midi: u8) -> f32 {
    440.0 * 2f32.powf((midi as f32 - 69.0) / 12.0)
}

/// The sound of a note. `secs` is its length in seconds; `dark` low-passes it (the Hush).
pub fn voice_of(n: &Note, secs: f32, dark: f32) -> Vec<(Patch, f32)> {
    let f = hz(n.midi);
    let v = n.vel;
    let mut out = match n.instr {
        Instr::Piano => vec![
            (Patch { attack: 0.004, decay: secs.max(0.5) * 1.2, volume: 0.42 * v, cutoff: 3800.0, cutoff_end: 800.0, ..Patch::new(Wave::Triangle, f) }, 0.0),
            (Patch { attack: 0.002, decay: 0.3, volume: 0.13 * v, ..Patch::new(Wave::Sine, f * 2.0) }, 0.0),
            (Patch { attack: 0.001, decay: 0.05, volume: 0.05 * v, cutoff: 5000.0, ..Patch::new(Wave::Saw, f * 3.0) }, 0.0),
        ],
        Instr::Pad => vec![
            (Patch { attack: 0.25, decay: 0.3, sustain: 0.75, hold: (secs - 0.5).max(0.1), release: 0.35, volume: 0.22 * v, cutoff: 1100.0, cutoff_end: 700.0, ..Patch::new(Wave::Saw, f) }, 0.0),
            (Patch { attack: 0.3, decay: 0.3, sustain: 0.75, hold: (secs - 0.5).max(0.1), release: 0.35, volume: 0.16 * v, ..Patch::new(Wave::Sine, f * 1.003) }, 0.0),
        ],
        Instr::Bass => vec![
            (Patch { attack: 0.006, decay: secs.min(0.6), sustain: 0.1, release: 0.06, volume: 0.62 * v, cutoff: 500.0, cutoff_end: 200.0, ..Patch::new(Wave::Triangle, f) }, 0.0),
            (Patch { attack: 0.004, decay: 0.09, volume: 0.32 * v, ..Patch::new(Wave::Sine, f * 2.0) }, 0.0),
        ],
        Instr::Pluck => vec![(Patch { attack: 0.002, decay: 0.26, volume: 0.32 * v, cutoff: 3000.0, cutoff_end: 500.0, duty: 0.3, ..Patch::new(Wave::Square, f) }, 0.0)],
        Instr::Bell => vec![
            (Patch { attack: 0.002, decay: 0.8, volume: 0.27 * v, ..Patch::new(Wave::Sine, f) }, 0.0),
            (Patch { attack: 0.002, decay: 0.4, volume: 0.11 * v, ..Patch::new(Wave::Sine, f * 2.76) }, 0.0),
        ],
        Instr::Strings => vec![
            (Patch { attack: 0.09, decay: 0.2, sustain: 0.8, hold: (secs - 0.25).max(0.05), release: 0.18, volume: 0.26 * v, cutoff: 2200.0, cutoff_end: 1600.0, ..Patch::new(Wave::Saw, f) }, 0.0),
            (Patch { attack: 0.09, decay: 0.2, sustain: 0.8, hold: (secs - 0.25).max(0.05), release: 0.18, volume: 0.18 * v, cutoff: 2200.0, ..Patch::new(Wave::Saw, f * 1.006) }, 0.0),
        ],
        Instr::Pulse => vec![(Patch { attack: 0.003, decay: secs.min(0.2), volume: 0.34 * v, cutoff: 1500.0, cutoff_end: 500.0, duty: 0.25, ..Patch::new(Wave::Square, f) }, 0.0)],
    };
    if dark > 0.0 {
        for (p, _) in &mut out {
            p.cutoff = p.cutoff.min(4000.0 - 3500.0 * dark);
            p.cutoff_end = p.cutoff_end.min(4000.0 - 3500.0 * dark);
        }
    }
    out
}

/// What the music follows, per frame.
#[derive(Clone, Copy, Debug, Default)]
pub struct Follow {
    pub track: u8,
    /// Which beat the heart is on, with its phase: the sequencer's clock in an operation.
    pub beat_pos: f64,
    pub bpm: f32,
    pub stopped: bool,
    pub crisis: f32,
    pub hush: f32,
}

#[derive(Default)]
pub struct Sequencer {
    current: u8,
    data: Option<Track>,
    /// Musical position: beats since the track started.
    pos: f64,
    origin: f64,
    /// Everything before this has been scheduled.
    done_until: f64,
    hush_t: f32,
    pub notes_played: u64,
}

const LOOK_AHEAD: f64 = 0.28;

impl Sequencer {
    /// Advances the clock and schedules what comes due. Call once a render frame.
    pub fn update(&mut self, sink: &mut dyn Sink, f: Follow, dt: f32) {
        if f.track != self.current || self.data.is_none() && f.track != 0 {
            self.current = f.track;
            self.data = track(f.track);
            self.pos = 0.0;
            self.origin = f.beat_pos;
            self.done_until = 0.0;
        }
        // The Hush: everything low, one held note.
        if f.hush > 0.0 {
            self.hush_t -= dt;
            if self.hush_t <= 0.0 {
                self.hush_t = 2.8;
                let n = Note { at: 0.0, midi: 69, len: 3.0, vel: 0.9, instr: Instr::Pad };
                for (p, d) in voice_of(&n, 3.0, 0.3) {
                    sink.send(BUS_MUSIC, p, 0.0, 1.0, d);
                }
            }
        } else {
            self.hush_t = 0.0;
        }
        let Some(data) = self.data.clone() else { return };
        if f.stopped {
            return;
        }
        let bpm = if data.tempo > 0.0 { data.tempo } else { f.bpm.clamp(40.0, 200.0) };
        if data.tempo > 0.0 {
            self.pos += dt as f64 * bpm as f64 / 60.0;
        } else {
            // Heart time: the bass lands on the actual beat.
            let p = f.beat_pos - self.origin;
            if p < self.pos - 8.0 {
                self.origin = f.beat_pos;
                self.done_until = 0.0;
            }
            self.pos = (f.beat_pos - self.origin).max(self.pos);
        }
        let ahead = self.pos + LOOK_AHEAD * bpm as f64 / 60.0;
        let (from, to) = (self.done_until.max(self.pos - 0.01), ahead);
        if to <= from {
            return;
        }
        let quiet = f.hush > 0.0;
        self.schedule(sink, &data.notes, data.length, data.once, from, to, bpm, if quiet { 0.25 } else { 1.0 }, f.hush);
        if f.crisis > 0.02 && !quiet {
            let n = data.crisis.iter().map(|c| c.at + c.len).fold(0.0f32, f32::max).max(1.0);
            let length = (data.length / n).round().max(1.0) * n;
            self.schedule(sink, &data.crisis, length, data.once, from, to, bpm, f.crisis, 0.0);
        }
        self.done_until = to;
    }

    #[allow(clippy::too_many_arguments)]
    fn schedule(&mut self, sink: &mut dyn Sink, notes: &[Note], length: f32, once: bool, from: f64, to: f64, bpm: f32, gain: f32, dark: f32) {
        let length = length as f64;
        let first_loop = (from / length).floor() as i64;
        let last_loop = (to / length).floor() as i64;
        for lp in first_loop..=last_loop {
            if once && lp > 0 {
                break;
            }
            for n in notes {
                let t = lp as f64 * length + n.at as f64;
                if t >= from && t < to {
                    let delay = ((t - self.pos) * 60.0 / bpm as f64).max(0.0) as f32;
                    let secs = n.len * 60.0 / bpm;
                    for (p, d) in voice_of(n, secs, dark) {
                        sink.send(BUS_MUSIC, p, 0.0, gain, delay + d);
                    }
                    self.notes_played += 1;
                }
            }
        }
    }
}
