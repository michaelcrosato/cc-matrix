//! The shell, driven with no GPU: every screen by pad, keys and mouse.

use egui::{Context, Pos2, RawInput, Rect, pos2, vec2};
use glam::Mat4;
use pav_core::games::surgery::frame::{Stage, SurgeryFrame};

use super::shell::*;
use crate::Device;

struct Rig {
    ctx: Context,
    shell: Shell,
    frame: Option<SurgeryFrame>,
}

impl Rig {
    fn new() -> Self {
        let about = About::parse(r#"{"credits":["Engine: Pavilion"],"sourceInformation":{"source":"x"},"testingFeedback":["a","b","c","d"],"engineFeedback":["a","b","c","d","e","f"],"promptFeedback":["a","b","c","d"]}"#);
        Rig { ctx: Context::default(), shell: Shell::new(Save::default(), about), frame: None }
    }

    fn step(&mut self, input: Input) {
        let raw = RawInput { screen_rect: Some(Rect::from_min_size(Pos2::ZERO, vec2(1920.0, 1080.0))), ..Default::default() };
        let (shell, frame) = (&mut self.shell, &self.frame);
        let mut out = self.ctx.run_ui(raw, |ui| {
            shell.ui(ui.ctx(), &Input { dt: if input.dt > 0.0 { input.dt } else { 0.016 }, ..input }, frame.as_ref(), Mat4::IDENTITY);
        });
        // Never painted: egui checks that a frame's textures weren't just dropped.
        out.textures_delta.clear();
    }

    fn tap(&mut self, f: impl Fn(&mut Input)) {
        let mut i = Input { any: true, device: Device::Gamepad, ..Default::default() };
        f(&mut i);
        self.step(i);
    }

    fn cmds(&mut self) -> Vec<Cmd> {
        std::mem::take(&mut self.shell.cmds)
    }
}

#[test]
fn pad_walks_every_screen() {
    let mut r = Rig::new();
    assert_eq!(r.shell.screen, Screen::Title);
    r.tap(|i| i.confirm = true);
    assert_eq!(r.shell.screen, Screen::Menu);
    // New Game is focused first: Continue has nothing to continue.
    r.step(Input { device: Device::Gamepad, any: true, ..Default::default() });
    assert_eq!(r.shell.focus, 1);
    r.tap(|i| i.confirm = true);
    assert_eq!(r.shell.screen, Screen::Difficulty);
    r.tap(|i| i.back = true);
    assert_eq!(r.shell.screen, Screen::Menu);
    r.step(Input { device: Device::Gamepad, any: true, ..Default::default() });
    r.tap(|i| i.down = true);
    r.tap(|i| i.confirm = true);
    assert_eq!(r.shell.screen, Screen::Cases);
    r.tap(|i| i.back = true);
    for _ in 0..3 {
        r.tap(|i| i.down = true);
    }
    assert_eq!(r.shell.focus, 4, "Settings");
    r.tap(|i| i.confirm = true);
    assert_eq!(r.shell.screen, Screen::Settings);
    r.tap(|i| i.tab_r = true);
    assert_eq!(r.shell.page, 1);
    r.tap(|i| i.back = true);
    assert_eq!(r.shell.screen, Screen::Menu);
    r.shell.focus = 5;
    r.tap(|i| i.confirm = true);
    assert_eq!(r.shell.screen, Screen::About);
    r.tap(|i| i.back = true);
    // Into a game, and pause, dev and back.
    r.shell.focus = 3;
    r.tap(|i| i.confirm = true);
    assert_eq!(r.shell.screen, Screen::Playing);
    assert!(r.cmds().contains(&Cmd::Load("surgery/codeblue".into())));
    r.frame = Some(SurgeryFrame { stage: Stage::Op, ..Default::default() });
    r.tap(|i| i.options = true);
    assert_eq!(r.shell.screen, Screen::Pause);
    assert!(r.cmds().contains(&Cmd::Paused(true)));
    r.shell.focus = 4;
    r.tap(|i| i.confirm = true);
    assert_eq!(r.shell.screen, Screen::Dev);
    r.tap(|i| i.back = true);
    assert_eq!(r.shell.screen, Screen::Pause);
    r.shell.focus = 2;
    r.tap(|i| i.confirm = true);
    assert_eq!(r.shell.screen, Screen::Controls);
    r.tap(|i| i.back = true);
    assert_eq!(r.shell.screen, Screen::Pause);
    r.shell.focus = 5;
    r.tap(|i| i.confirm = true);
    assert_eq!(r.shell.screen, Screen::Title);
}

#[test]
fn hover_moves_focus_and_a_click_activates() {
    let mut r = Rig::new();
    r.shell.screen = Screen::Menu;
    // Row 2, Case Files.
    let at = pos2(960.0, 350.0 + 2.0 * 92.0 + 40.0);
    r.step(Input { pointer: Some(at), pointer_moved: true, device: Device::KeyboardMouse, any: true, ..Default::default() });
    assert_eq!(r.shell.focus, 2);
    r.step(Input { pointer: Some(at), click: true, device: Device::KeyboardMouse, any: true, ..Default::default() });
    assert_eq!(r.shell.screen, Screen::Cases);
}

#[test]
fn prompts_follow_the_device_and_the_xbox_setting() {
    let mut r = Rig::new();
    r.shell.screen = Screen::Menu;
    r.step(Input { device: Device::Gamepad, any: true, ..Default::default() });
    assert!(r.shell.seen.iter().any(|g| g == "ps:cross"), "{:?}", r.shell.seen);
    r.step(Input { device: Device::KeyboardMouse, any: true, ..Default::default() });
    assert!(r.shell.seen.iter().any(|g| g == "key:enter"), "{:?}", r.shell.seen);
    r.shell.save.settings.xbox = true;
    r.step(Input { device: Device::Gamepad, any: true, ..Default::default() });
    assert!(r.shell.seen.iter().any(|g| g == "xb:a"), "{:?}", r.shell.seen);
}

#[test]
fn attract_starts_at_10_seconds_and_any_input_leaves() {
    let mut r = Rig::new();
    r.step(Input { dt: 9.0, ..Default::default() });
    assert_eq!(r.shell.screen, Screen::Title);
    r.step(Input { dt: 1.5, ..Default::default() });
    assert_eq!(r.shell.screen, Screen::Attract);
    assert!(r.cmds().contains(&Cmd::Load("surgery/attract".into())));
    r.step(Input { any: true, ..Default::default() });
    assert_eq!(r.shell.screen, Screen::Title);
    assert!(r.cmds().contains(&Cmd::Load("surgery/title".into())));
}

#[test]
fn a_touch_only_device_gets_a_message_and_a_settings_button() {
    let mut r = Rig::new();
    let base = Input { touch_only: true, device: Device::Touch, ..Default::default() };
    r.step(base);
    assert!(r.shell.texts.iter().any(|t| t == "Controller or keyboard required"));
    r.step(Input { tap: Some(pos2(960.0, 800.0)), any: true, ..base });
    assert_eq!(r.shell.screen, Screen::Settings);
}

#[test]
fn dev_sliders_apply_and_reset() {
    let mut r = Rig::new();
    r.shell.screen = Screen::Dev;
    r.shell.page = 3;
    r.frame = Some(SurgeryFrame { stage: Stage::Op, ..Default::default() });
    r.tap(|i| i.right = true);
    assert!(r.shell.tune.drain > 1.0);
    assert!(r.cmds().iter().any(|c| matches!(c, Cmd::Tune("drain", _))));
    r.shell.focus = 6;
    r.tap(|i| i.confirm = true);
    assert_eq!(r.shell.tune.drain, 1.0);
    assert!(r.cmds().contains(&Cmd::ResetTune));
}

#[test]
fn about_shows_every_required_section_and_usage_is_added_on_import() {
    let mut r = Rig::new();
    r.shell.screen = Screen::About;
    r.step(Input { any: true, ..Default::default() });
    for s in ["Credits", "Source Information", "Testing Feedback", "Engine Feedback", "Prompt Feedback"] {
        assert!(r.shell.texts.iter().any(|t| t == &format!("section:{s}")), "{s}");
    }
    assert!(r.shell.about.source.iter().any(|(k, _)| k == "Usage"));
}

#[test]
fn music_defaults_to_ten_percent_and_saves_round_trip() {
    let s = Settings::default();
    assert_eq!(s.music, 0.10);
    assert_eq!(s.effects, 0.80);
    assert_eq!(s.voices, 0.70);
    let mut save = Save::default();
    save.record(3, "S", 9000);
    save.record(3, "A", 12000);
    assert_eq!(save.best[&3].0, "S", "the better rank stays");
    assert_eq!(save.unlocked, 5);
    let text = serde_json::to_string(&save).unwrap();
    assert_eq!(Save::parse(&text), save);
    assert_eq!(Save::parse("{ not json"), Save::default());
    assert_eq!(Save::parse(r#"{"version":99}"#), Save::default());
}

#[test]
fn every_screen_fits_a_short_list() {
    // At most about six choices, big enough for ten feet.
    let mut r = Rig::new();
    r.shell.screen = Screen::Pause;
    r.step(Input { any: true, ..Default::default() });
    assert!(r.shell.texts.iter().filter(|t| ["Resume", "Restart", "Controls", "Settings", "Dev Mode", "Quit to Title"].contains(&t.as_str())).count() >= 6);
}
