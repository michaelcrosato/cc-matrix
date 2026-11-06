//! Settings: three short pages. Sound, Controls, Display.

use egui::{Align2, Color32, Painter, Rect, StrokeKind, pos2, vec2};
use pav_core::games::surgery::cue;
use pav_core::input::SurgeryCmd;

use super::glyphs::Action;
use super::style::{self, GOLD, INK, TEAL};
use super::{Shell, ShellCmd, ShellInput};

pub const PAGES: [&str; 3] = ["Sound", "Controls", "Display"];

#[derive(Clone, Copy)]
enum Row {
    Music,
    Effects,
    Voices,
    Prompts,
    CursorSpeed,
    AimAssist,
    Rumble,
    Tremor,
    Shake,
    Flashes,
    Palette,
    TextSpeed,
    Fullscreen,
}

fn rows(page: usize) -> &'static [Row] {
    match page {
        0 => &[Row::Music, Row::Effects, Row::Voices],
        1 => &[Row::Prompts, Row::CursorSpeed, Row::AimAssist, Row::Rumble, Row::Tremor],
        _ => &[Row::Shake, Row::Flashes, Row::Palette, Row::TextSpeed, Row::Fullscreen],
    }
}

/// A row as (label, value text, fraction for a slider or none for a switch).
fn describe(s: &super::save::Settings, r: Row) -> (&'static str, String, Option<f32>) {
    let pct = |v: f32| format!("{}%", (v * 100.0).round() as i32);
    let on = |b: bool| if b { "On".to_string() } else { "Off".to_string() };
    match r {
        Row::Music => ("Music", pct(s.music), Some(s.music)),
        Row::Effects => ("Effects", pct(s.effects), Some(s.effects)),
        Row::Voices => ("Voices", pct(s.voices), Some(s.voices)),
        Row::Prompts => ("Button prompts", if s.xbox { "Xbox".into() } else { "PlayStation".into() }, None),
        Row::CursorSpeed => ("Cursor speed", format!("{:.0}", s.cursor_speed), Some((s.cursor_speed - 5.0) / 25.0)),
        Row::AimAssist => ("Aim assist", pct(s.aim_assist), Some(s.aim_assist)),
        Row::Rumble => ("Rumble", on(s.rumble), None),
        Row::Tremor => ("Dr. Nwosu's tremor", on(s.tremor), None),
        Row::Shake => ("Screen shake", on(s.shake), None),
        Row::Flashes => ("Reduce flashes", on(s.reduce_flashes), None),
        Row::Palette => ("Field palette", if s.clinical { "Clinical".into() } else { "Anatomical".into() }, None),
        Row::TextSpeed => ("Text speed", format!("{:.0}", s.text_speed), Some((s.text_speed - 15.0) / 105.0)),
        Row::Fullscreen => ("Fullscreen", on(s.fullscreen), None),
    }
}

fn adjust(shell: &mut Shell, r: Row, delta: f32) {
    let s = &mut shell.save.settings;
    match r {
        Row::Music => s.music = (s.music + delta * 0.05).clamp(0.0, 1.0),
        Row::Effects => s.effects = (s.effects + delta * 0.05).clamp(0.0, 1.0),
        Row::Voices => s.voices = (s.voices + delta * 0.05).clamp(0.0, 1.0),
        Row::Prompts => s.xbox = !s.xbox,
        Row::CursorSpeed => s.cursor_speed = (s.cursor_speed + delta).clamp(5.0, 30.0),
        Row::AimAssist => s.aim_assist = (s.aim_assist + delta * 0.1).clamp(0.0, 1.0),
        Row::Rumble => s.rumble = !s.rumble,
        Row::Tremor => s.tremor = !s.tremor,
        Row::Shake => s.shake = !s.shake,
        Row::Flashes => s.reduce_flashes = !s.reduce_flashes,
        Row::Palette => s.clinical = !s.clinical,
        Row::TextSpeed => s.text_speed = (s.text_speed + delta * 5.0).clamp(15.0, 120.0),
        Row::Fullscreen => s.fullscreen = !s.fullscreen,
    }
    apply(shell, r);
}

fn set_fraction(shell: &mut Shell, r: Row, k: f32) {
    let k = k.clamp(0.0, 1.0);
    let s = &mut shell.save.settings;
    match r {
        Row::Music => s.music = k,
        Row::Effects => s.effects = k,
        Row::Voices => s.voices = k,
        Row::CursorSpeed => s.cursor_speed = 5.0 + k * 25.0,
        Row::AimAssist => s.aim_assist = k,
        Row::TextSpeed => s.text_speed = 15.0 + k * 105.0,
        _ => {}
    }
    apply(shell, r);
}

fn apply(shell: &mut Shell, r: Row) {
    let s = shell.save.settings.clone();
    match r {
        Row::Music | Row::Effects | Row::Voices => {
            shell.cmds.push(ShellCmd::Mix { music: s.music, effects: s.effects, voices: s.voices })
        }
        Row::TextSpeed => shell.cmds.push(ShellCmd::Sim(SurgeryCmd::TextSpeed(s.text_speed))),
        Row::Tremor => shell.cmds.push(ShellCmd::Sim(SurgeryCmd::Tremor(s.tremor))),
        Row::Fullscreen => shell.cmds.push(ShellCmd::Fullscreen(s.fullscreen)),
        _ => {}
    }
    shell.persist();
}

pub fn screen(shell: &mut Shell, p: &Painter, rect: Rect, i: &ShellInput) {
    p.rect_filled(rect, 0.0, style::with_alpha(style::BG, 0.9));
    style::outlined(p, rect.min + vec2(120.0, 90.0), Align2::LEFT_CENTER, "Settings", 66.0, Color32::WHITE);
    // Tabs.
    let mut x = rect.min.x + 500.0;
    let mut clicked_tab = None;
    for (k, name) in PAGES.iter().enumerate() {
        let r = Rect::from_min_size(pos2(x, rect.min.y + 58.0), vec2(250.0, 66.0));
        let on = k == shell.page;
        p.rect_filled(r, 10.0, if on { style::with_alpha(TEAL, 0.32) } else { style::with_alpha(Color32::BLACK, 0.3) });
        if on {
            p.rect_stroke(r, 10.0, egui::Stroke::new(3.0, TEAL), StrokeKind::Inside);
        }
        style::outlined(p, r.center(), Align2::CENTER_CENTER, name, 42.0, if on { Color32::WHITE } else { INK });
        if i.pointer.is_some_and(|q| r.contains(q)) && i.click {
            clicked_tab = Some(k);
        }
        x += 270.0;
    }
    if let Some(k) = clicked_tab {
        shell.page = k;
        shell.focus = 0;
        shell.cue(cue::NAV);
    }
    if i.tab_prev {
        shell.page = (shell.page + PAGES.len() - 1) % PAGES.len();
        shell.focus = 0;
        shell.cue(cue::NAV);
    }
    if i.tab_next {
        shell.page = (shell.page + 1) % PAGES.len();
        shell.focus = 0;
        shell.cue(cue::NAV);
    }
    let list = rows(shell.page);
    let n = list.len();
    shell.focus = shell.focus.min(n - 1);
    if shell.nav(0) {
        shell.focus = (shell.focus + n - 1) % n;
        shell.cue(cue::NAV);
    }
    if shell.nav(1) {
        shell.focus = (shell.focus + 1) % n;
        shell.cue(cue::NAV);
    }
    let left = rect.min.x + 160.0;
    for (k, r) in list.iter().enumerate() {
        let y = rect.min.y + 210.0 + k as f32 * 124.0;
        let row = Rect::from_min_size(pos2(left - 30.0, y), vec2(rect.width() - 260.0, 108.0));
        let over = i.pointer.is_some_and(|q| row.contains(q));
        if over && i.pointer_moved && shell.focus != k {
            shell.focus = k;
            shell.cue(cue::NAV);
        }
        let f = shell.focus == k;
        if f {
            p.rect_filled(row, 10.0, style::with_alpha(TEAL, 0.18));
            p.rect_stroke(row, 10.0, egui::Stroke::new(3.0, TEAL), StrokeKind::Inside);
        }
        let (label, value, frac) = describe(&shell.save.settings, *r);
        style::outlined(p, pos2(left, row.center().y), Align2::LEFT_CENTER, label, 50.0, if f { Color32::WHITE } else { INK });
        style::outlined(p, pos2(row.max.x - 30.0, row.center().y), Align2::RIGHT_CENTER, &value, 50.0, GOLD);
        if let Some(fr) = frac {
            let track = Rect::from_min_size(pos2(left + 560.0, row.center().y - 12.0), vec2(620.0, 24.0));
            p.rect_filled(track, 12.0, Color32::from_black_alpha(160));
            let fill = Rect::from_min_size(track.min, vec2(track.width() * fr.clamp(0.0, 1.0), 24.0));
            p.rect_filled(fill, 12.0, TEAL);
            p.circle_filled(pos2(fill.max.x, track.center().y), 20.0, Color32::WHITE);
            if i.drag {
                if let Some(q) = i.pointer {
                    if track.expand2(vec2(10.0, 30.0)).contains(q) {
                        set_fraction(shell, *r, (q.x - track.min.x) / track.width());
                    }
                }
            }
        } else if over && i.click {
            adjust(shell, *r, 1.0);
            shell.cue(cue::CONFIRM);
        }
        if i.tap.is_some_and(|q| row.contains(q)) {
            shell.focus = k;
            if frac.is_none() {
                adjust(shell, *r, 1.0);
            }
        }
    }
    let r = list[shell.focus];
    let is_slider = describe(&shell.save.settings, r).2.is_some();
    if shell.nav(2) {
        adjust(shell, r, -1.0);
        shell.cue(cue::NAV);
    }
    if shell.nav(3) {
        adjust(shell, r, 1.0);
        shell.cue(cue::NAV);
    }
    if i.confirm && !is_slider {
        adjust(shell, r, 1.0);
        shell.cue(cue::CONFIRM);
    }
    shell.hints(
        p,
        rect,
        &[(Action::TabPrev, "Page"), (Action::TabNext, "Page"), (Action::Adjust, "Change"), (Action::Back, "Back")],
    );
    if shell.touch_only {
        let back = Rect::from_center_size(pos2(rect.max.x - 190.0, rect.max.y - 70.0), vec2(280.0, 90.0));
        p.rect_filled(back, 12.0, style::with_alpha(TEAL, 0.3));
        style::outlined(p, back.center(), Align2::CENTER_CENTER, "Back", 46.0, Color32::WHITE);
        if i.tap.is_some_and(|q| back.contains(q)) {
            let to = shell.came_from;
            shell.go(to);
            return;
        }
    }
    if i.back {
        shell.cue(cue::BACK);
        let to = shell.came_from;
        shell.go(to);
    }
}
