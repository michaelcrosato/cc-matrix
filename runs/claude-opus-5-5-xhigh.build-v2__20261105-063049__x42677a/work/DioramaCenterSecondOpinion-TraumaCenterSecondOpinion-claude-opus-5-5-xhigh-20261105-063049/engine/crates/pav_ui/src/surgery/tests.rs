//! The shell, driven with no GPU: pad, keyboard and mouse navigation through every screen.

use egui::{Context, RawInput};
use glam::Mat4;

use super::save::{Save, Settings};
use super::*;
use pav_core::games::surgery::frame::SurgeryFrame;

fn run(shell: &mut Shell, ctx: &Context, input: ShellInput, f: Option<&SurgeryFrame>) -> Vec<ShellCmd> {
    let raw = RawInput {
        screen_rect: Some(egui::Rect::from_min_size(egui::Pos2::ZERO, egui::vec2(1920.0, 1080.0))),
        predicted_dt: 1.0 / 60.0,
        ..Default::default()
    };
    let mut out = ctx.run_ui(raw, |ui| {
        let ctx = ui.ctx().clone();
        shell.frame(&ctx, &input, f, Mat4::IDENTITY);
    });
    out.textures_delta.clear();
    std::mem::take(&mut shell.cmds)
}

fn tick(device: Device) -> ShellInput {
    ShellInput { device, dt: 1.0 / 60.0, ..Default::default() }
}

fn press(device: Device, f: impl Fn(&mut ShellInput)) -> ShellInput {
    let mut i = tick(device);
    i.any = true;
    f(&mut i);
    i
}

#[test]
fn music_defaults_to_ten_percent() {
    assert_eq!(Settings::default().music, 0.10);
    assert_eq!(Settings::default().effects, 0.80);
    assert_eq!(Settings::default().voices, 0.70);
}

#[test]
fn a_pad_walks_the_menus_and_prompts_follow_the_device() {
    let ctx = Context::default();
    let mut s = Shell::default();
    run(&mut s, &ctx, press(Device::Gamepad, |i| i.confirm = true), None);
    assert_eq!(s.screen, Screen::Menu, "any confirm leaves the title");
    run(&mut s, &ctx, tick(Device::Gamepad), None);
    assert!(s.prompts.contains(&"Cross"), "pad glyphs: {:?}", s.prompts);
    // Down to Settings: New Game, Case Files, Code Blue, Settings.
    for _ in 0..3 {
        run(&mut s, &ctx, press(Device::Gamepad, |i| i.down = true), None);
        run(&mut s, &ctx, tick(Device::Gamepad), None);
    }
    assert_eq!(s.focus, 3);
    run(&mut s, &ctx, press(Device::Gamepad, |i| i.confirm = true), None);
    assert_eq!(s.screen, Screen::Settings);
    // Tabs, then back.
    run(&mut s, &ctx, press(Device::Gamepad, |i| i.tab_next = true), None);
    assert_eq!(s.page, 1);
    run(&mut s, &ctx, press(Device::Gamepad, |i| i.confirm = true), None);
    assert!(s.save.settings.xbox, "the first switch on the Controls page");
    run(&mut s, &ctx, tick(Device::Gamepad), None);
    assert!(s.prompts.contains(&"LB"), "Xbox glyphs now: {:?}", s.prompts);
    run(&mut s, &ctx, press(Device::Gamepad, |i| i.back = true), None);
    assert_eq!(s.screen, Screen::Menu);
    // The mouse takes over at once.
    run(&mut s, &ctx, tick(Device::KeyboardMouse), None);
    assert!(s.prompts.contains(&"Enter"), "key glyphs: {:?}", s.prompts);
}

#[test]
fn hover_moves_the_focus_and_a_click_activates() {
    let ctx = Context::default();
    let mut s = Shell::default();
    s.go(Screen::Menu);
    run(&mut s, &ctx, tick(Device::KeyboardMouse), None);
    assert_eq!(s.focus, 0);
    let on_third = egui::pos2(300.0, 240.0 + 104.0 * 2.0 + 40.0);
    run(
        &mut s,
        &ctx,
        press(Device::KeyboardMouse, |i| {
            i.pointer = Some(on_third);
            i.pointer_moved = true;
        }),
        None,
    );
    assert_eq!(s.focus, 2, "hover moved the focus");
    let cmds = run(
        &mut s,
        &ctx,
        press(Device::KeyboardMouse, |i| {
            i.pointer = Some(on_third);
            i.click = true;
        }),
        None,
    );
    assert!(cmds.iter().any(|c| matches!(c, ShellCmd::Load(x) if x == "surgery/codeblue")), "{cmds:?}");
    assert_eq!(s.screen, Screen::Playing);
}

#[test]
fn attract_starts_at_ten_seconds_and_any_input_exits() {
    let ctx = Context::default();
    let mut s = Shell::default();
    for _ in 0..(9.5 * 60.0) as usize {
        run(&mut s, &ctx, tick(Device::KeyboardMouse), None);
    }
    assert_eq!(s.screen, Screen::Title);
    let mut started = false;
    for _ in 0..60 {
        let c = run(&mut s, &ctx, tick(Device::KeyboardMouse), None);
        started |= c.iter().any(|c| matches!(c, ShellCmd::Load(x) if x == "surgery/attract"));
    }
    assert!(started && s.screen == Screen::Attract);
    let c = run(&mut s, &ctx, press(Device::KeyboardMouse, |_| {}), None);
    assert!(c.iter().any(|c| matches!(c, ShellCmd::Load(x) if x == "surgery/title")));
    assert_eq!(s.screen, Screen::Title);
}

#[test]
fn touch_only_shows_the_message_and_a_settings_button_a_tap_can_use() {
    let ctx = Context::default();
    let mut s = Shell::default();
    s.touch_only = true;
    run(&mut s, &ctx, tick(Device::Touch), None);
    assert_eq!(s.screen, Screen::Title);
    // A tap anywhere else does nothing.
    run(&mut s, &ctx, press(Device::Touch, |i| i.tap = Some(egui::pos2(100.0, 100.0))), None);
    assert_eq!(s.screen, Screen::Title);
    run(&mut s, &ctx, press(Device::Touch, |i| i.tap = Some(egui::pos2(960.0, 540.0 + 260.0))), None);
    assert_eq!(s.screen, Screen::Settings);
    run(&mut s, &ctx, tick(Device::Touch), None);
    // Attract still runs.
    let mut s2 = Shell::default();
    s2.touch_only = true;
    for _ in 0..(10.5 * 60.0) as usize {
        run(&mut s2, &ctx, tick(Device::Touch), None);
    }
    assert_eq!(s2.screen, Screen::Attract);
}

#[test]
fn dev_sliders_apply_and_reset_and_the_default_is_kept() {
    let ctx = Context::default();
    let mut s = Shell::default();
    let f = SurgeryFrame::default();
    s.go(Screen::Dev);
    s.focus = 2; // the first slider: Vitals drain
    run(&mut s, &ctx, tick(Device::KeyboardMouse), Some(&f));
    let c = run(&mut s, &ctx, press(Device::KeyboardMouse, |i| i.right = true), Some(&f));
    assert!(c.iter().any(|c| matches!(c, ShellCmd::Sim(SurgeryCmd::SetTune { id: 0, .. }))), "{c:?}");
    assert!(s.dev.tune.get(0) > 1.0);
    // Reset All lives on the last Balance page.
    let pages = 4;
    s.dev.page = pages - 1;
    let reset_at = 2 + pav_core::games::surgery::tune::SLIDERS.len() % 5;
    s.focus = if pav_core::games::surgery::tune::SLIDERS.len() % 5 == 0 { 7 } else { reset_at };
    let c = run(&mut s, &ctx, press(Device::KeyboardMouse, |i| i.confirm = true), Some(&f));
    assert!(c.iter().any(|c| matches!(c, ShellCmd::Sim(SurgeryCmd::ResetTune))), "{c:?}");
    assert_eq!(s.dev.tune.get(0), 1.0);
}

#[test]
fn about_shows_every_required_section_with_no_scrollbars() {
    let a = super::about::About::parse(
        r#"{"sections":[{"title":"Credits","lines":["x"]},{"title":"Source Information","lines":["y"]},{"title":"Testing Feedback","lines":["z"]},{"title":"Engine Feedback","lines":["w"]},{"title":"Prompt Feedback","lines":["v"]}]}"#,
    )
    .unwrap();
    let titles: Vec<String> = a.pages().into_iter().map(|p| p.0).collect();
    for need in ["Credits", "Source Information", "Testing Feedback", "Engine Feedback", "Prompt Feedback"] {
        assert!(titles.iter().any(|t| t == need), "{need} missing");
    }
    // A long section runs to more screens rather than scrolling.
    let long = super::about::About {
        sections: vec![super::about::AboutSection { title: "L".into(), lines: vec!["word ".repeat(40); 30] }],
    };
    assert!(long.pages().len() > 1);
}

#[test]
fn a_save_round_trips_and_best_rank_holds() {
    let mut s = Save::default();
    assert!(s.record(2, "B"));
    assert!(!s.record(2, "C"), "a worse rank doesn't replace it");
    assert!(s.record(2, "ENCORE"));
    assert!(s.record(255, "S"));
    s.settings.music = 0.3;
    let back = Save::parse(&s.to_text()).unwrap();
    assert_eq!(back, s);
    assert!(Save::parse("{\"version\":99}").is_none());
    assert!(Save::parse("nonsense").is_none());
}

#[test]
fn every_screen_draws_without_a_panic_on_every_stage() {
    use pav_core::games::surgery::frame::Stage;
    let ctx = Context::default();
    let mut sim = pav_core::Sim::new("surgery/case/7", 1).unwrap();
    let mut s = Shell::default();
    let screens = [
        Screen::Title,
        Screen::Menu,
        Screen::Difficulty,
        Screen::CaseFiles,
        Screen::Settings,
        Screen::About,
        Screen::Controls,
        Screen::Pause,
        Screen::Dev,
        Screen::Card,
        Screen::Attract,
        Screen::Playing,
        Screen::Session,
    ];
    for t in 0..240 {
        let f = sim.bot_input();
        sim.step(&f);
        if t % 40 == 0 {
            let fr = sim.frame().surgery.clone();
            for sc in screens {
                s.screen = sc;
                run(&mut s, &ctx, tick(Device::Gamepad), fr.as_deref());
                run(&mut s, &ctx, tick(Device::KeyboardMouse), fr.as_deref());
            }
        }
    }
    // A frame per stage, by hand.
    for st in [Stage::Story, Stage::Chart, Stage::Results, Stage::Dead, Stage::Finished, Stage::Code] {
        let f = SurgeryFrame { stage: st, ..Default::default() };
        s.screen = Screen::Playing;
        run(&mut s, &ctx, tick(Device::Gamepad), Some(&f));
    }
}
