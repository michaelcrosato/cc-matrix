//! Wii Fine's sound: every effect and song makes sound, the music bus works at its default,
//! and the speakers sound different.

use pav_audio::{Listener, Mixer, fit};
use pav_core::SimEvent;

fn rms(v: &[f32]) -> f32 {
    (v.iter().map(|s| s * s).sum::<f32>() / v.len().max(1) as f32).sqrt()
}

fn render(mixer: &mut Mixer, seconds: f32) -> Vec<f32> {
    let n = (seconds * mixer.sample_rate) as usize;
    let mut out = vec![0.0f32; n * 2];
    for chunk in out.chunks_mut(512) {
        mixer.render(chunk);
    }
    out
}

#[test]
fn every_sound_effect_is_audible() {
    for id in 1..=pav_core::games::fit::events::sfx::MAX {
        let mut m = Mixer::new(22050.0);
        let ev = SimEvent::Sfx { id, gain: 1.0, pitch: 1.0 };
        pav_audio::play_event(&mut m, &ev, &Listener::default(), 1.0);
        let out = render(&mut m, 1.5);
        assert!(rms(&out) > 1e-4, "sfx {id} is silent");
    }
}

#[test]
fn every_song_makes_music() {
    for id in 1..=6u8 {
        let mut m = Mixer::new(22050.0);
        m.buses = [1.0, 1.0, 1.0];
        m.set_song(id);
        let out = render(&mut m, 6.0);
        assert!(rms(&out) > 1e-3, "song {id} is silent (rms {})", rms(&out));
        assert!(m.song_seconds() > 5.0, "the song clock runs");
    }
}

#[test]
fn music_at_ten_percent_is_a_tenth_of_full_scale() {
    let full = {
        let mut m = Mixer::new(22050.0);
        m.buses = [1.0, 1.0, 1.0];
        m.set_song(1);
        rms(&render(&mut m, 8.0))
    };
    let tenth = {
        let mut m = Mixer::new(22050.0);
        assert!((m.buses[0] - 0.10).abs() < 1e-6, "default music bus is 0.10");
        m.set_song(1);
        rms(&render(&mut m, 8.0))
    };
    let ratio = tenth / full;
    assert!((ratio - 0.10).abs() < 0.015, "ratio {ratio}");
}

#[test]
fn the_speakers_sound_different() {
    let mut outs = vec![];
    for s in 0..8u8 {
        let mut m = Mixer::new(22050.0);
        let ev = SimEvent::Syllable { speaker: s, vowel: 0, pitch: 1.0 };
        pav_audio::play_event(&mut m, &ev, &Listener::default(), 1.0);
        let out = render(&mut m, 0.4);
        assert!(rms(&out) > 1e-4, "speaker {s} is silent");
        outs.push(out);
    }
    for a in 0..outs.len() {
        for b in a + 1..outs.len() {
            let d: f32 = outs[a].iter().zip(&outs[b]).map(|(x, y)| (x - y).abs()).sum::<f32>() / outs[a].len() as f32;
            assert!(d > 1e-4, "speakers {a} and {b} sound alike");
        }
    }
    // vowels differ too
    let vowel = |v: u8| {
        let mut m = Mixer::new(22050.0);
        pav_audio::play_event(&mut m, &SimEvent::Syllable { speaker: 0, vowel: v, pitch: 1.0 }, &Listener::default(), 1.0);
        render(&mut m, 0.3)
    };
    assert!(vowel(0).iter().zip(vowel(2)).map(|(a, b)| (a - b).abs()).sum::<f32>() > 1.0);
    let _ = fit::FORMANTS;
}

#[test]
fn the_music_fades_to_silence_on_song_zero() {
    let mut m = Mixer::new(22050.0);
    m.buses = [1.0, 1.0, 1.0];
    m.set_song(4);
    render(&mut m, 2.0);
    m.set_song(0);
    let _ = render(&mut m, 4.0);
    let tail = render(&mut m, 1.0);
    assert!(rms(&tail) < 1e-4, "still playing: {}", rms(&tail));
}
