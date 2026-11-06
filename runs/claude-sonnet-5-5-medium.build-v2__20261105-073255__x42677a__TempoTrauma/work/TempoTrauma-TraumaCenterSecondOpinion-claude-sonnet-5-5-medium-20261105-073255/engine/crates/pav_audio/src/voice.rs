//! Animalese-style voices: each syllable of the text is a short pitched blip through two
//! resonant formant filters chosen from the vowel. Per-character pitch, waveform and speed.

use crate::{Patch, Wave};

#[derive(Clone, Copy)]
pub struct VoiceStyle {
    pub base: f32,
    pub wave: Wave,
    pub speed: f32,
    pub jitter: f32,
    pub gloss: f32,
}

pub fn style_of(who: &str) -> VoiceStyle {
    match who {
        "mara" => VoiceStyle { base: 330.0, wave: Wave::Saw, speed: 1.15, jitter: 0.06, gloss: 1.0 },
        "pet" => VoiceStyle { base: 150.0, wave: Wave::Saw, speed: 0.8, jitter: 0.03, gloss: 0.8 },
        "bashir" => VoiceStyle { base: 195.0, wave: Wave::Triangle, speed: 1.0, jitter: 0.0, gloss: 1.0 },
        "teddy" => VoiceStyle { base: 260.0, wave: Wave::Square, speed: 1.3, jitter: 0.22, gloss: 1.0 },
        "voss" => VoiceStyle { base: 230.0, wave: Wave::Sine, speed: 0.9, jitter: 0.02, gloss: 1.6 },
        "vane" => VoiceStyle { base: 250.0, wave: Wave::Triangle, speed: 0.95, jitter: 0.04, gloss: 1.2 },
        _ => VoiceStyle { base: 180.0, wave: Wave::Triangle, speed: 1.0, jitter: 0.0, gloss: 1.0 },
    }
}

/// Two formants (Hz) for a vowel.
fn formants(v: char) -> (f32, f32) {
    match v {
        'a' => (800.0, 1200.0),
        'e' => (500.0, 1900.0),
        'i' => (320.0, 2400.0),
        'o' => (500.0, 900.0),
        'u' => (330.0, 800.0),
        _ => (600.0, 1500.0),
    }
}

fn hash(n: u32) -> f32 {
    let mut x = n.wrapping_mul(2654435761);
    x ^= x >> 15;
    x = x.wrapping_mul(2246822519);
    ((x ^ (x >> 13)) & 0xffff) as f32 / 65535.0
}

/// Blips for `text`: (patch, delay in seconds) pairs. About 70 ms per syllable.
pub fn speak(text: &str, who: &str) -> Vec<(Patch, f32)> {
    let st = style_of(who);
    let mut out = Vec::new();
    let mut t = 0.0f32;
    let step = 0.075 / st.speed;
    let chars: Vec<char> = text.chars().collect();
    let mut i = 0;
    let mut syll = 0u32;
    while i < chars.len() {
        let c = chars[i].to_ascii_lowercase();
        if matches!(c, 'a' | 'e' | 'i' | 'o' | 'u' | 'y') {
            // find sentence end ahead for contour
            let mut end = i;
            while end < chars.len() && !matches!(chars[end], '.' | '?' | '!') && end - i < 14 {
                end += 1;
            }
            let ending = chars.get(end).copied().unwrap_or(' ');
            let near_end = end - i <= 3;
            let mut f = st.base * (1.0 + (hash(syll * 7 + i as u32) - 0.5) * 0.4 * (1.0 + st.jitter * 3.0));
            if near_end && ending == '?' {
                f *= 1.3;
            } else if near_end && matches!(ending, '.' | '!') {
                f *= 0.8;
            }
            let (f1, f2) = formants(c);
            for (fc, vol) in [(f1, 0.22), (f2, 0.12)] {
                let mut p = Patch::new(st.wave, f);
                p.freq_end = f * 0.97;
                p.glide = 0.07;
                p.attack = 0.006;
                p.decay = 0.045;
                p.release = 0.03;
                p.volume = vol;
                p.cutoff = 6000.0;
                p.cutoff_end = 4000.0;
                p.bp_freq = fc * st.gloss.min(1.2);
                p.bp_q = 4.0;
                out.push((p, t));
            }
            t += step;
            syll += 1;
            i += 1;
        } else {
            if matches!(c, '.' | '?' | '!' | ',') {
                t += step * 1.6;
            } else if c == ' ' && hash(syll * 13 + i as u32) > 0.7 {
                t += step * 0.4;
            }
            i += 1;
        }
    }
    out
}
