//! Animalese-style voices: each syllable of the text is a short pitched blip through two resonant
//! formant filters chosen from the vowel. Per-character base pitch, waveform and speed; falling
//! pitch at full stops, rising at question marks. Gibberish: no word is ever spoken.

use pav_core::games::surgery::content::Voice;

use crate::{BUS_VOICES, Patch, Sink, Wave};

fn formants(ch: char) -> [f32; 2] {
    match ch.to_ascii_lowercase() {
        'a' => [800.0, 1200.0],
        'e' => [500.0, 1900.0],
        'i' | 'y' => [300.0, 2300.0],
        'o' => [500.0, 850.0],
        'u' => [330.0, 800.0],
        _ => [420.0, 1500.0],
    }
}

fn is_vowel(c: char) -> bool {
    matches!(c.to_ascii_lowercase(), 'a' | 'e' | 'i' | 'o' | 'u' | 'y')
}

fn wave_of(name: &str) -> Wave {
    match name {
        "sine" => Wave::Sine,
        "square" => Wave::Square,
        "saw" => Wave::Saw,
        _ => Wave::Triangle,
    }
}

/// The blip for one syllable.
pub fn blip(v: &Voice, vowel: char, bend: f32, salt: u32) -> Patch {
    let wobble = 1.0 + ((salt.wrapping_mul(2_654_435_761) >> 20) as f32 / 4096.0 - 0.5) * (0.08 + v.jitter);
    let f = v.base.max(60.0) * bend * wobble;
    let formant = formants(vowel);
    let bright = v.bright.max(0.2);
    Patch {
        freq_end: f * 0.94,
        glide: 0.07,
        attack: 0.006,
        decay: 0.058 / v.speed.max(0.4),
        sustain: 0.25,
        hold: 0.01,
        release: 0.02,
        volume: 0.52,
        cutoff: 5200.0 * bright,
        cutoff_end: 3000.0 * bright,
        formant: [formant[0] * (0.85 + bright * 0.2), formant[1] * (0.85 + bright * 0.2)],
        reso: 5.0,
        duty: 0.4,
        ..Patch::new(wave_of(&v.wave), f)
    }
}

/// Speaks the syllables of `text` between char indexes `from..to`, at this voice. A syllable starts
/// where a vowel follows a non-vowel. Returns how many it played.
pub fn speak(sink: &mut dyn Sink, v: &Voice, text: &str, from: usize, to: usize, gain: f32) -> u32 {
    let chars: Vec<char> = text.chars().collect();
    let mut played = 0;
    for i in from..to.min(chars.len()) {
        let c = chars[i];
        if !is_vowel(c) || (i > 0 && is_vowel(chars[i - 1])) {
            continue;
        }
        // The sentence's end colours its last syllables.
        let next_stop = chars[i..].iter().take(14).position(|x| matches!(x, '.' | '?' | '!'));
        let bend = match next_stop.map(|n| (n, chars[i + n])) {
            Some((n, '.')) => 1.0 - (14 - n) as f32 * 0.016,
            Some((n, '?')) => 1.0 + (14 - n) as f32 * 0.024,
            Some((n, '!')) => 1.08 + (14 - n) as f32 * 0.006,
            _ => 1.0,
        };
        sink.send(BUS_VOICES, blip(v, c, bend, i as u32 * 31 + c as u32), 0.0, gain, 0.0);
        played += 1;
    }
    played
}
