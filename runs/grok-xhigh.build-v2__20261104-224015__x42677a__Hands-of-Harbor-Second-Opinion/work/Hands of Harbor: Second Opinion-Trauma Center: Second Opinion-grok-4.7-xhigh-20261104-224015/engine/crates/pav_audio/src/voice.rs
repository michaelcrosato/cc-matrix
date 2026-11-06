//! Short gibberish syllables. The line picks the rhythm; the speaker picks the formants.
//! Nothing here is a spoken word.

use super::{Mixer, Patch, Wave, BUS_VOICES};

pub fn render_line(who: &str, text: &str) -> Vec<f32> {
    let sr = 22050.0;
    let mut mixer = Mixer::new(sr);
    let (f1, f2, base) = voice_of(who);
    let mut delay = 0.02;
    let chars: Vec<char> = text.chars().filter(|c| c.is_ascii_alphabetic()).collect();
    let glyphs = if chars.is_empty() { vec!['a'] } else { chars };
    for (i, ch) in glyphs.iter().enumerate() {
        if i % 2 == 1 {
            continue;
        }
        let bump = ((*ch as u8) % 7) as f32 / 24.0;
        let dur = 0.07;
        mixer.play_on(
            Patch {
                attack: 0.008,
                decay: 0.02,
                hold: 0.025,
                release: 0.018,
                sustain: 0.55,
                volume: 0.62,
                formant_hz: f1 * (1.0 + bump * 0.15),
                formant_hz2: f2 * (1.0 - bump * 0.08),
                cutoff: 3200.0,
                cutoff_end: 1400.0,
                ..Patch::new(Wave::Saw, base * (1.0 + bump))
            },
            0.0,
            1.0,
            delay,
            BUS_VOICES,
        );
        delay += dur + 0.018;
        if delay > 2.4 {
            break;
        }
    }
    let frames = ((delay + 0.12) * sr) as usize;
    let mut out = vec![0.0; frames.max(64) * 2];
    mixer.render(&mut out);
    out
}

fn voice_of(who: &str) -> (f32, f32, f32) {
    match who {
        "Pet Nwosu" => (520.0, 1600.0, 150.0),
        "Bashir Haddad" => (430.0, 1200.0, 110.0),
        "Teddy Lark" => (640.0, 1900.0, 190.0),
        "Ottoline Voss" => (480.0, 1400.0, 130.0),
        "Cordelia Vane" => (560.0, 1750.0, 165.0),
        _ => (700.0, 1400.0, 180.0),
    }
}
