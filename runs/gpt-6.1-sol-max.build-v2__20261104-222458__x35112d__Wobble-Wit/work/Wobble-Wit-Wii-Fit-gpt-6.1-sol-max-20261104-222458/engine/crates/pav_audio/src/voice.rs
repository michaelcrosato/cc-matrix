use super::{Patch, Wave};
pub fn syllable(speaker: u8, vowel: u8, pitch: f32) -> Patch {
    let base = [420., 220., 86., 520., 340.][speaker.min(4) as usize];
    let formants = [[800., 1150.], [400., 1900.], [300., 2300.], [450., 800.], [325., 650.]][vowel.min(4) as usize];
    let mut p = Patch::new(Wave::Saw, base * pitch);
    p.freq_end = base * pitch * 0.85;
    p.glide = 0.08;
    p.attack = if speaker == 1 { 0.008 } else { 0.002 };
    p.decay = if speaker == 3 { 0.035 } else { 0.06 };
    p.release = 0.025;
    p.volume = if speaker == 2 { 0.21 } else { 0.12 };
    p.formants = formants;
    p.bus = 2;
    p
}
pub fn sfx(id: u8, gain: f32, pitch: f32) -> Vec<(Patch, f32)> {
    use Wave::*;
    let spec = [
        (Triangle, 740., 0.06),
        (Triangle, 1040., 0.13),
        (Triangle, 520., 0.08),
        (Noise, 1., 0.17),
        (Saw, 130., 0.23),
        (Square, 330., 0.05),
        (Noise, 1., 0.06),
        (Sine, 240., 0.16),
        (Noise, 1., 0.10),
        (Sine, 500., 0.1),
        (Noise, 1., 0.35),
        (Saw, 840., 0.12),
        (Noise, 1., 0.20),
        (Noise, 1., 0.08),
        (Triangle, 880., 0.3),
        (Square, 110., 0.15),
        (Sine, 440., 0.3),
        (Noise, 1., 0.12),
        (Noise, 1., 0.07),
        (Sine, 600., 0.13),
        (Triangle, 1320., 0.24),
        (Sine, 250., 0.17),
        (Triangle, 660., 0.4),
        (Noise, 1., 0.5),
        (Noise, 1., 0.7),
        (Noise, 1., 0.09),
        (Triangle, 790., 0.14),
        (Sine, 280., 0.2),
        (Noise, 1., 0.25),
        (Sine, 420., 0.15),
        (Triangle, 1560., 0.3),
        (Sine, 990., 0.26),
    ];
    let (w, f, d) = spec[id.min(31) as usize];
    let mut p = Patch::new(w, f * pitch);
    p.freq_end = if matches!(id, 4 | 7 | 10 | 21) { f * pitch * 0.3 } else { f * pitch * 1.08 };
    p.decay = d;
    p.release = d * 0.3;
    p.volume = if w == Noise { 0.15 } else { 0.14 } * gain;
    p.cutoff = if w == Noise { 1800. } else { 7000. };
    p.cutoff_end = if w == Noise { 300. } else { 5500. };
    let mut out = vec![(p, 0.)];
    if matches!(id, 14 | 20 | 22 | 30) {
        for (n, m) in [4., 7., 12.].iter().enumerate() {
            let mut q = p;
            q.freq *= 2_f32.powf(*m / 12.);
            q.freq_end = q.freq;
            q.volume *= 0.65;
            out.push((q, 0.07 * (n + 1) as f32));
        }
    }
    out
}
