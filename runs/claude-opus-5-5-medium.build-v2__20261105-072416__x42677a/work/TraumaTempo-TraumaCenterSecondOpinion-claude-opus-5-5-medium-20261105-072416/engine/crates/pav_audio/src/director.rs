//! Runs the game's sound from its frames: music tempo from the heart, gibberish voices as text
//! types out, on any `Sink`.

use pav_core::games::surgery::content::content;
use pav_core::games::surgery::frame::{Stage, SurgeryFrame};

use crate::Sink;
use crate::music::{Follow, Sequencer};
use crate::voice;

#[derive(Default)]
pub struct Director {
    pub seq: Sequencer,
    voiced: (u16, u16, usize),
    callout: (String, usize),
    /// Blips played: tests read it.
    pub blips: u64,
}

impl Director {
    pub fn update(&mut self, sink: &mut dyn Sink, f: &SurgeryFrame, dt: f32) {
        let c = content();
        let track = match f.stage {
            Stage::Dead | Stage::Done => 0,
            _ => f.music,
        };
        let follow = Follow {
            track,
            beat_pos: f.beats as f64 + f.beat as f64,
            bpm: f.bpm,
            stopped: f.stopped,
            crisis: f.crisis,
            hush: f.hush,
        };
        self.seq.update(sink, follow, dt);

        // A story line types out, syllable by syllable.
        if let Some(st) = &f.story {
            let key = (st.scene, st.line);
            if (self.voiced.0, self.voiced.1) != key {
                self.voiced = (key.0, key.1, 0);
            }
            let typed = (st.typed as usize).min(st.text.chars().count());
            if typed > self.voiced.2 {
                if let Some(rig) = c.rigs.get(&st.who) {
                    self.blips += voice::speak(sink, &rig.voice, &st.text, self.voiced.2, typed, 1.0) as u64;
                }
                self.voiced.2 = typed;
            }
        }
        // A callout in the operation, likewise.
        if let Some(cl) = &f.callout {
            if self.callout.0 != cl.text {
                self.callout = (cl.text.clone(), 0);
            }
            let typed = ((cl.age * 38.0) as usize).min(cl.text.chars().count());
            if typed > self.callout.1 {
                if let Some(rig) = c.rigs.get(&cl.who) {
                    self.blips += voice::speak(sink, &rig.voice, &cl.text, self.callout.1, typed, 0.9) as u64;
                }
                self.callout.1 = typed;
            }
        } else {
            self.callout.0.clear();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::music::{self, Follow, Sequencer};
    use crate::{BUS_MUSIC, BUS_VOICES, Mixer, Sink};
    use pav_core::games::surgery::content::MUSIC;
    use pav_core::games::surgery::cue;

    fn peak(buf: &[f32]) -> f32 {
        buf.iter().fold(0.0f32, |m, s| m.max(s.abs()))
    }

    #[test]
    fn every_cue_renders_non_silent() {
        for (id, name) in cue::NAMES.iter().enumerate() {
            let mut m = Mixer::new(22050.0);
            for (p, d) in crate::cues::sounds(id as u16, 1.0, 1.0) {
                m.play(p, 0.0, 1.0, d);
            }
            let mut out = vec![0.0; 22050];
            m.render(&mut out);
            assert!(peak(&out) > 0.01, "cue {name} is silent: {}", peak(&out));
        }
    }

    #[test]
    fn every_track_renders_and_really_is_music() {
        for (id, name) in MUSIC.iter().enumerate().skip(1) {
            let t = music::track(id as u8).unwrap_or_else(|| panic!("track {name}"));
            assert!(t.notes.len() > 8, "{name} has a real score");
            let mut pitches: Vec<u8> = t.notes.iter().map(|n| n.midi).collect();
            pitches.sort();
            pitches.dedup();
            assert!(pitches.len() >= 6, "{name} has a melody: {} pitches", pitches.len());
            let mut m = Mixer::new(22050.0);
            let mut seq = Sequencer::default();
            let mut out = vec![0.0; 2048 * 2];
            let mut loudest = 0.0f32;
            let mut beat = 0.0f64;
            for _ in 0..60 {
                let dt = 2048.0 / 22050.0;
                beat += dt as f64 * 80.0 / 60.0;
                seq.update(&mut m, Follow { track: id as u8, beat_pos: beat, bpm: 80.0, ..Default::default() }, dt);
                m.render(&mut out);
                loudest = loudest.max(peak(&out));
            }
            assert!(loudest > 0.02, "track {name} is silent ({loudest})");
            assert!(seq.notes_played > 3, "{name}");
        }
    }

    #[test]
    fn the_bass_lands_on_the_heartbeat_and_follows_the_tempo() {
        struct Log(Vec<f32>);
        impl Sink for Log {
            fn send(&mut self, _: u8, _: crate::Patch, _: f32, _: f32, delay: f32) {
                self.0.push(delay);
            }
        }
        let mut seq = Sequencer::default();
        let mut log = Log(Vec::new());
        // Just before a beat, at 120 bpm: the bass note is due in about 0.05 s.
        seq.update(&mut log, Follow { track: 4, beat_pos: 3.0, bpm: 120.0, ..Default::default() }, 0.0);
        log.0.clear();
        seq.update(&mut log, Follow { track: 4, beat_pos: 3.9, bpm: 120.0, ..Default::default() }, 0.016);
        assert!(log.0.iter().any(|d| (*d - 0.05).abs() < 0.02), "{:?}", log.0);
    }

    #[test]
    fn voices_are_pitched_per_character_and_silent_only_when_they_should_be() {
        let c = content();
        for (id, rig) in &c.rigs {
            let mut m = Mixer::new(22050.0);
            let n = voice::speak(&mut m, &rig.voice, "Doctor, the mass moved.", 0, 23, 1.0);
            assert!(n >= 5, "{id}: {n} syllables");
            let mut out = vec![0.0; 22050];
            m.render(&mut out);
            assert!(peak(&out) > 0.02, "{id} is silent: {}", peak(&out));
            assert!(m.peak[BUS_VOICES as usize] > 0.0);
            assert_eq!(m.peak[BUS_MUSIC as usize], 0.0);
        }
        // Mara is higher than Pet, by design.
        assert!(c.rigs["mara"].voice.base > c.rigs["pet"].voice.base * 1.5);
    }

    #[test]
    fn a_bus_gain_scales_only_its_bus() {
        let mut m = Mixer::new(22050.0);
        m.bus = [1.0, 0.1, 1.0];
        let n = music::Note { at: 0.0, midi: 69, len: 1.0, vel: 1.0, instr: music::Instr::Bell };
        for (p, d) in music::voice_of(&n, 1.0, 0.0) {
            m.play_on(BUS_MUSIC, p, 0.0, 1.0, d);
        }
        let mut quiet = vec![0.0; 8192];
        m.render(&mut quiet);
        let mut m = Mixer::new(22050.0);
        m.bus = [1.0, 1.0, 1.0];
        for (p, d) in music::voice_of(&n, 1.0, 0.0) {
            m.play_on(BUS_MUSIC, p, 0.0, 1.0, d);
        }
        let mut loud = vec![0.0; 8192];
        m.render(&mut loud);
        assert!(peak(&loud) > peak(&quiet) * 5.0);
    }
}
