//! Wii Fine's UI: prompts follow the device and the glyph setting, and nothing is drawn under the size rule.

use glam::Mat4;
use pav_core::games::fit::ui_model::*;
use pav_ui::Device;
use pav_ui::fit_ui::{Pointer, draw, install_fonts};
use pav_ui::glyphs::{Glyph, prompt};

fn frame_of(xbox: bool) -> UiFrame {
    UiFrame {
        layout: Layout::List,
        title: "Settings".into(),
        items: vec![Item::slider("Music", 0.1, "10%"), Item::choice("Button glyphs", "PlayStation"), Item::button("Back")],
        prompts: vec![Prompt { act: Act::Confirm, label: "Select".into() }, Prompt { act: Act::Back, label: "Back".into() }],
        xbox,
        ..Default::default()
    }
}

fn run(f: &UiFrame, device: Device) -> pav_ui::fit_ui::UiOut {
    let ctx = egui::Context::default();
    install_fonts(&ctx);
    let mut warm = ctx.run_ui(egui::RawInput::default(), |_| {});
    let mut out = None;
    for i in 0..2 {
        let raw = egui::RawInput {
            screen_rect: Some(egui::Rect::from_min_size(egui::Pos2::ZERO, egui::vec2(1920.0, 1080.0))),
            time: Some(i as f64 / 60.0),
            ..Default::default()
        };
        let mut o = ctx.run_ui(raw, |ui| {
            let c = ui.ctx().clone();
            out = Some(draw(&c, f, device, Mat4::IDENTITY, egui::vec2(1920.0, 1080.0), Pointer::default()));
        });
        o.textures_delta.clear();
    }
    warm.textures_delta.clear();
    out.unwrap()
}

#[test]
fn prompts_follow_the_device_and_the_glyph_setting() {
    assert_eq!(prompt(Act::Confirm, Device::Gamepad, false), Glyph::Cross);
    assert_eq!(prompt(Act::Back, Device::Gamepad, false), Glyph::Circle);
    assert_eq!(prompt(Act::Confirm, Device::Gamepad, true), Glyph::XboxFace('A'));
    assert_eq!(prompt(Act::Back, Device::Gamepad, true), Glyph::XboxFace('B'));
    assert_eq!(prompt(Act::StepL, Device::Gamepad, false), Glyph::Pill("L1"));
    assert_eq!(prompt(Act::StepL, Device::Gamepad, true), Glyph::Pill("LB"));
    assert_eq!(prompt(Act::Schedule, Device::Gamepad, true), Glyph::XboxFace('Y'));
    assert_eq!(prompt(Act::Confirm, Device::KeyboardMouse, false), Glyph::Keys(vec!["Space"]));
    assert_eq!(prompt(Act::Schedule, Device::KeyboardMouse, false), Glyph::Keys(vec!["Tab"]));
    let ps = run(&frame_of(false), Device::Gamepad);
    assert!(ps.glyphs.contains(&"Cross".to_string()), "{:?}", ps.glyphs);
    let xb = run(&frame_of(true), Device::Gamepad);
    assert!(xb.glyphs.contains(&"A".to_string()), "{:?}", xb.glyphs);
    let kb = run(&frame_of(false), Device::KeyboardMouse);
    assert!(kb.glyphs.contains(&"Space".to_string()), "{:?}", kb.glyphs);
}

#[test]
fn no_text_is_drawn_under_the_size_rule() {
    let mut hud = Hud { title: "Pose Parade".into(), time: 12.0, score: 340, stars: 1, puck: Some(Puck { alpha: 1.0, top: true, ..Default::default() }), ..Default::default() };
    hud.meters.push(Meter { label: "Lungs".into(), value: 0.4, guide: 0.5 });
    hud.line = "Be the heron.".into();
    hud.prompts = vec![Prompt { act: Act::Act, label: "Breathe in".into() }];
    let f = UiFrame { hud: Some(hud), ..Default::default() };
    let out = run(&f, Device::Gamepad);
    assert!(out.min_text >= 34.0, "smallest text {} px", out.min_text);
    let out = run(&frame_of(false), Device::KeyboardMouse);
    assert!(out.min_text >= 34.0, "smallest text {} px", out.min_text);
    assert!(out.rects.len() >= 3, "items publish rects");
}
