//! Original resort arrangements, scheduled on the sample clock. No audio assets.
use super::{Patch, Wave};
#[derive(Default)]
pub struct Sequencer {
    pub song: u8,
    pub sample: u64,
    pub step: u64,
    pub next: f64,
}
impl Sequencer {
    pub fn set(&mut self, song: u8) {
        self.song = song;
        self.sample = 0;
        self.step = 0;
        self.next = 0.;
    }
    pub fn advance(&mut self, rate: f32) -> Vec<Patch> {
        let mut out = vec![];
        if self.song == 0 {
            return out;
        }
        let tempos = [0., 84., 48., 96., 96., 110., 108., 92.];
        let bpm = tempos[self.song.min(7) as usize];
        if self.sample as f64 >= self.next {
            let n = self.step;
            let bar = n / 16;
            let slot = n % 16;
            let root = [48, 53, 50, 55][(bar % 4) as usize];
            let degrees = [0, 2, 4, 7, 9, 12, 14, 16];
            let note = |m: i32| 440. * 2_f32.powf((m as f32 - 69.) / 12.);
            let voice = |out: &mut Vec<Patch>, m: i32, w: Wave, volume: f32, decay: f32| {
                let mut p = Patch::new(w, note(m));
                p.bus = 1;
                p.volume = volume;
                p.decay = decay;
                p.release = decay * 0.4;
                out.push(p);
            };
            match self.song {
                1 => {
                    if slot % 4 == 0 {
                        voice(&mut out, root - 12 + if slot == 8 { 7 } else { 0 }, Wave::Sine, 0.15, 0.3);
                    }
                    if [0, 3, 6, 10, 14].contains(&slot) {
                        voice(&mut out, root + degrees[((n * 5 + bar) % 8) as usize], Wave::Triangle, 0.12, 0.3);
                    }
                    if slot % 8 == 4 {
                        let mut p = Patch::new(Wave::Noise, 1.);
                        p.bus = 1;
                        p.volume = 0.04;
                        p.cutoff = 1800.;
                        p.decay = 0.07;
                        out.push(p);
                    }
                }
                2 => {
                    if slot % 8 == 0 {
                        voice(&mut out, root + 12, Wave::Sine, 0.1, 1.8);
                        voice(&mut out, root + 19, Wave::Triangle, 0.045, 1.6);
                    }
                    if slot == 6 {
                        voice(&mut out, root + 24 + degrees[(bar % 5) as usize], Wave::Sine, 0.06, 0.8);
                    }
                }
                3 => {
                    if slot % 12 == 0 {
                        voice(&mut out, root - 12, Wave::Triangle, 0.16, 0.32);
                    }
                    if slot % 4 == 0 {
                        voice(&mut out, root + if slot % 12 == 4 { 4 } else { 7 }, Wave::Square, 0.04, 0.22);
                    }
                }
                4 => {
                    if slot % 4 == 0 {
                        voice(&mut out, 36, Wave::Sine, 0.32, 0.12);
                    }
                    if slot % 8 == 4 {
                        let mut p = Patch::new(Wave::Noise, 1.);
                        p.bus = 1;
                        p.volume = 0.13;
                        p.decay = 0.09;
                        p.cutoff = 3500.;
                        out.push(p);
                    }
                    if slot % 2 == 0 {
                        voice(&mut out, root + degrees[((n * 3) % 8) as usize], Wave::Triangle, 0.13, 0.1);
                    }
                    if [0, 3, 7, 10, 14].contains(&slot) {
                        voice(&mut out, root - 12 + degrees[(bar % 3) as usize], Wave::Saw, 0.06, 0.16);
                    }
                }
                5 => {
                    if slot % 2 == 0 {
                        voice(&mut out, root + 12 + degrees[((n * 3 + bar) % 8) as usize], Wave::Triangle, 0.15, 0.13);
                    }
                    if slot % 4 == 0 {
                        voice(&mut out, root - 12, Wave::Sine, 0.14, 0.15);
                    }
                }
                6 => {
                    if slot % 4 == 0 {
                        voice(&mut out, root + 12 + degrees[((n / 4) % 6) as usize], Wave::Square, 0.06, 0.24);
                        voice(&mut out, root - 12, Wave::Triangle, 0.14, 0.2);
                    }
                    if slot % 2 == 1 {
                        let mut p = Patch::new(Wave::Noise, 1.);
                        p.bus = 1;
                        p.volume = 0.07;
                        p.decay = 0.075;
                        p.cutoff = 2200.;
                        out.push(p);
                    }
                }
                _ => {
                    if slot % 4 == 0 {
                        voice(&mut out, root + 12 + degrees[((n / 4) % 8) as usize], Wave::Triangle, 0.12, 0.25);
                    }
                }
            }
            self.step += 1;
            self.next += rate as f64 * 60. / bpm as f64 / 4.;
        }
        self.sample += 1;
        out
    }
}
