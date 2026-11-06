//! The shell without a GPU: pad, keyboard and mouse navigation through every screen, prompts that
//! follow the last device, the Xbox setting, attract at 10 s, touch-only, dev sliders, About.

use egui::Pos2;
use pav_core::Sim;
use pav_core::games::surgery::frame::SurgeryFrame;
use pav_core::input::SurgeryCmd;
use pav_ui::Device;
use pav_ui::surgery::glyphs::{Act, prompt};
use pav_ui::surgery::shell::{NavIn, Screen, Shell, ShellCmd};
use pav_ui::surgery::{SaveFile, Settings};

fn frame_of(scene: &str) -> std::sync::Arc<SurgeryFrame> {
    Sim::new(scene, 1).unwrap().frame().surgery.clone().expect("surgery frame")
}

fn run(shell: &mut Shell, nav: NavIn, f: Option<&SurgeryFrame>, dt: f32, dev: Device) -> Vec<ShellCmd> {
    let ctx = egui::Context::default();
    let raw = egui::RawInput {
        screen_rect: Some(egui::Rect::from_min_size(Pos2::ZERO, egui::vec2(1920.0, 1080.0))),
        predicted_dt: dt,
        ..Default::default()
    };
    let mut out = vec![];
    let mut full = ctx.run_ui(raw, |ui| {
        out = shell.run(&ui.ctx().clone(), &nav, f, dt, dev);
    });
    full.textures_delta.clear();
    out
}

fn confirm() -> NavIn {
    NavIn { confirm: true, any: true, ..Default::default() }
}

fn to_main(sh: &mut Shell, f: &SurgeryFrame) {
    run(sh, confirm(), Some(f), 0.016, Device::Gamepad);
    assert_eq!(sh.screen, Screen::Main);
}

#[test]
fn title_to_main_menu_pad_keyboard_and_mouse() {
    let f = frame_of("surgery/title");
    let mut sh = Shell::new(SaveFile::default());
    assert_eq!(sh.screen, Screen::Title);
    to_main(&mut sh, &f);
    run(&mut sh, NavIn { down: true, any: true, ..Default::default() }, Some(&f), 0.016, Device::Gamepad);
    run(&mut sh, NavIn { down: true, any: true, ..Default::default() }, Some(&f), 0.016, Device::Gamepad);
    assert_eq!(sh.focus, 2);
    run(&mut sh, NavIn { up: true, any: true, ..Default::default() }, Some(&f), 0.016, Device::Gamepad);
    assert_eq!(sh.focus, 1);
    let out = run(&mut sh, confirm(), Some(&f), 0.016, Device::Gamepad);
    assert_eq!(sh.screen, Screen::NewGame, "{out:?}");
    run(&mut sh, NavIn { back: true, any: true, ..Default::default() }, Some(&f), 0.016, Device::Gamepad);
    assert_eq!(sh.screen, Screen::Main);
    // Mouse: hover moves the focus, click activates. Items are 56*1.55 tall from y=220.
    let hover = NavIn { pointer: Some(Pos2::new(300.0, 220.0 + 86.8 * 4.0 + 30.0)), pointer_moved: true, any: true, ..Default::default() };
    run(&mut sh, hover, Some(&f), 0.016, Device::KeyboardMouse);
    assert_eq!(sh.focus, 4, "hover should focus Settings");
    run(&mut sh, NavIn { pointer: hover.pointer, click: true, any: true, ..Default::default() }, Some(&f), 0.016, Device::KeyboardMouse);
    assert_eq!(sh.screen, Screen::Settings(0));
    run(&mut sh, NavIn { back: true, any: true, ..Default::default() }, Some(&f), 0.016, Device::KeyboardMouse);
    assert_eq!(sh.screen, Screen::Main);
}

#[test]
fn new_game_asks_for_difficulty_and_starts_the_campaign() {
    let f = frame_of("surgery/title");
    let mut sh = Shell::new(SaveFile::default());
    to_main(&mut sh, &f);
    run(&mut sh, NavIn { down: true, any: true, ..Default::default() }, Some(&f), 0.016, Device::Gamepad);
    run(&mut sh, confirm(), Some(&f), 0.016, Device::Gamepad);
    assert_eq!(sh.screen, Screen::NewGame);
    let out = run(&mut sh, confirm(), Some(&f), 0.016, Device::Gamepad);
    assert!(out.iter().any(|c| matches!(c, ShellCmd::Sim(SurgeryCmd::NewGame { step: 0, .. }))), "{out:?}");
    assert_eq!(sh.screen, Screen::Game);
}

#[test]
fn prompts_follow_the_last_device_and_the_xbox_setting() {
    assert_eq!(prompt(Act::Confirm, Device::Gamepad, false).glyph, "cross");
    assert_eq!(prompt(Act::Back, Device::Gamepad, false).glyph, "circle");
    assert_eq!(prompt(Act::Chart, Device::Gamepad, false).glyph, "square");
    assert_eq!(prompt(Act::Gift, Device::Gamepad, false).glyph, "triangle");
    assert_eq!(prompt(Act::Confirm, Device::Gamepad, true).glyph, "A");
    assert_eq!(prompt(Act::Back, Device::Gamepad, true).glyph, "B");
    assert_eq!(prompt(Act::Use, Device::Gamepad, true).glyph, "RT");
    assert_eq!(prompt(Act::Confirm, Device::KeyboardMouse, false).glyph, "Enter");
    assert_eq!(prompt(Act::Use, Device::KeyboardMouse, true).glyph, "LMB");
    assert_eq!(prompt(Act::Gift, Device::KeyboardMouse, false).glyph, "Space");
}

#[test]
fn attract_starts_after_ten_seconds_and_any_input_exits() {
    let f = frame_of("surgery/title");
    let mut sh = Shell::new(SaveFile::default());
    let mut started = false;
    for i in 0..12 {
        let out = run(&mut sh, NavIn::default(), Some(&f), 1.0, Device::KeyboardMouse);
        if out.iter().any(|c| matches!(c, ShellCmd::Sim(SurgeryCmd::Attract))) {
            assert!(i >= 9, "attract began early at {i} s");
            started = true;
            break;
        }
    }
    assert!(started);
    assert_eq!(sh.screen, Screen::Attract);
    let out = run(&mut sh, NavIn { any: true, ..Default::default() }, Some(&f), 0.016, Device::Gamepad);
    assert!(out.iter().any(|c| matches!(c, ShellCmd::Sim(SurgeryCmd::ToTitle))));
    assert_eq!(sh.screen, Screen::Title);
    let mut sh = Shell::new(SaveFile::default());
    for _ in 0..8 {
        run(&mut sh, NavIn::default(), Some(&f), 1.0, Device::KeyboardMouse);
    }
    run(&mut sh, NavIn { any: true, ..Default::default() }, Some(&f), 0.016, Device::KeyboardMouse);
    for _ in 0..8 {
        let out = run(&mut sh, NavIn::default(), Some(&f), 1.0, Device::KeyboardMouse);
        assert!(!out.iter().any(|c| matches!(c, ShellCmd::Sim(SurgeryCmd::Attract))));
    }
}

#[test]
fn touch_only_says_controller_or_keyboard_required() {
    let f = frame_of("surgery/title");
    let mut sh = Shell::new(SaveFile::default());
    sh.touch_only = true;
    run(&mut sh, NavIn::default(), Some(&f), 0.016, Device::KeyboardMouse);
    assert!(sh.last_text.iter().any(|t| t == "Controller or keyboard required"), "{:?}", sh.last_text);
    assert!(sh.last_text.iter().any(|t| t == "Settings"));
    let mut started = false;
    for _ in 0..12 {
        if run(&mut sh, NavIn::default(), Some(&f), 1.0, Device::KeyboardMouse).iter().any(|c| matches!(c, ShellCmd::Sim(SurgeryCmd::Attract))) {
            started = true;
        }
    }
    assert!(started);
}

#[test]
fn settings_defaults_and_changes() {
    assert!((Settings::default().music - 0.10).abs() < 1e-6, "music defaults to 10%");
    assert!((Settings::default().sfx - 0.8).abs() < 1e-6);
    let f = frame_of("surgery/title");
    let mut sh = Shell::new(SaveFile::default());
    to_main(&mut sh, &f);
    for _ in 0..4 {
        run(&mut sh, NavIn { down: true, any: true, ..Default::default() }, Some(&f), 0.016, Device::Gamepad);
    }
    run(&mut sh, confirm(), Some(&f), 0.016, Device::Gamepad);
    assert_eq!(sh.screen, Screen::Settings(0));
    run(&mut sh, NavIn { right: true, any: true, ..Default::default() }, Some(&f), 0.016, Device::Gamepad);
    assert!((sh.settings.music - 0.15).abs() < 1e-5, "{}", sh.settings.music);
    run(&mut sh, NavIn { tab_r: true, any: true, ..Default::default() }, Some(&f), 0.016, Device::Gamepad);
    assert_eq!(sh.screen, Screen::Settings(1));
    let out = run(&mut sh, confirm(), Some(&f), 0.016, Device::Gamepad);
    assert!(sh.settings.xbox);
    assert!(out.iter().any(|c| matches!(c, ShellCmd::Sim(SurgeryCmd::Opt(0, v)) if *v > 0.5)));
    assert!(out.contains(&ShellCmd::Save));
    run(&mut sh, NavIn { tab_r: true, any: true, ..Default::default() }, Some(&f), 0.016, Device::Gamepad);
    assert_eq!(sh.screen, Screen::Settings(2));
}

#[test]
fn dev_mode_sliders_apply_and_reset() {
    let f = frame_of("surgery/case/3");
    let mut sh = Shell::new(SaveFile::default());
    sh.screen = Screen::Dev(0);
    let out = run(&mut sh, NavIn { right: true, any: true, ..Default::default() }, Some(&f), 0.016, Device::KeyboardMouse);
    assert!(out.iter().any(|c| matches!(c, ShellCmd::Sim(SurgeryCmd::Tune(0, v)) if *v > 1.0)), "{out:?}");
    for _ in 0..7 {
        run(&mut sh, NavIn { down: true, any: true, ..Default::default() }, Some(&f), 0.016, Device::KeyboardMouse);
    }
    let out = run(&mut sh, confirm(), Some(&f), 0.016, Device::KeyboardMouse);
    assert!(out.contains(&ShellCmd::Sim(SurgeryCmd::TuneReset)), "{out:?}");
    assert!((sh.tune[0] - 1.0).abs() < 1e-6);
    sh.screen = Screen::Dev(3);
    sh.focus = 0;
    let out = run(&mut sh, confirm(), Some(&f), 0.016, Device::KeyboardMouse);
    assert!(out.contains(&ShellCmd::Sim(SurgeryCmd::Cheat(0, true))));
}

#[test]
fn about_shows_every_required_section() {
    let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../pav_app/src/about-default.json");
    let json = std::fs::read_to_string(&path).unwrap_or_else(|e| panic!("{}: {e}", path.display()));
    let f = frame_of("surgery/title");
    let mut sh = Shell::new(SaveFile::default());
    sh.set_about_json(&json);
    let titles: Vec<String> = sh.about.pages.iter().map(|p| p.title.clone()).collect();
    for want in ["Credits", "Source Information", "Testing Feedback", "Engine Feedback", "Prompt Feedback"] {
        assert!(titles.iter().any(|t| t == want), "About lacks {want}: {titles:?}");
    }
    let all: String = sh.about.pages.iter().flat_map(|p| p.text.iter().cloned()).collect::<Vec<_>>().join("\n");
    assert!(all.contains("Usage: added on import"));
    assert!(all.contains("claude-sonnet-5-5"));
    assert!(all.contains("Barlow Condensed"));
    sh.screen = Screen::About(0);
    run(&mut sh, NavIn::default(), Some(&f), 0.016, Device::Gamepad);
    assert!(sh.last_text.iter().any(|t| t == "Credits"));
    run(&mut sh, NavIn { tab_r: true, any: true, ..Default::default() }, Some(&f), 0.016, Device::Gamepad);
    assert_eq!(sh.screen, Screen::About(1));
}

#[test]
fn pause_menu_leads_to_dev_mode_and_every_screen_draws() {
    let f = frame_of("surgery/case/0");
    let mut sh = Shell::new(SaveFile::default());
    sh.screen = Screen::Game;
    let out = run(&mut sh, NavIn { pause: true, any: true, ..Default::default() }, Some(&f), 0.016, Device::Gamepad);
    assert_eq!(sh.screen, Screen::Pause);
    assert!(out.contains(&ShellCmd::Sim(SurgeryCmd::Pause(true))));
    for _ in 0..4 {
        run(&mut sh, NavIn { down: true, any: true, ..Default::default() }, Some(&f), 0.016, Device::Gamepad);
    }
    run(&mut sh, confirm(), Some(&f), 0.016, Device::Gamepad);
    assert_eq!(sh.screen, Screen::Dev(0));
    for s in [Screen::Controls, Screen::Cases, Screen::Team, Screen::NewGame, Screen::Settings(2), Screen::About(0), Screen::Title, Screen::Main] {
        sh.screen = s;
        run(&mut sh, NavIn::default(), Some(&f), 0.016, Device::KeyboardMouse);
        run(&mut sh, NavIn::default(), Some(&f), 0.016, Device::Gamepad);
    }
}
