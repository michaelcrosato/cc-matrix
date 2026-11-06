//! The chart card, the results with the rank stamp, the death screen and the end of a run.

use egui::{Align2, Color32, Painter, Rect, pos2, vec2};
use pav_core::games::surgery::cue;
use pav_core::games::surgery::frame::SurgeryFrame;
use pav_core::input::SurgeryCmd;

use super::glyphs::Action;
use super::style::{self, GOLD, INK, PAPER, PAPER_INK, RED};
use super::{Screen, Shell, ShellInput};

fn ease(t: f32) -> f32 {
    let t = t.clamp(0.0, 1.0);
    1.0 - (1.0 - t) * (1.0 - t) * (1.0 - t)
}

pub fn chart(shell: &mut Shell, p: &Painter, rect: Rect, f: &SurgeryFrame, i: &ShellInput) {
    let Some(c) = &f.chart else { return };
    p.rect_filled(rect, 0.0, Color32::from_rgba_unmultiplied(6, 18, 20, 140));
    let slide = ease(c.t / 0.45);
    let r = Rect::from_center_size(rect.center() + vec2(0.0, (1.0 - slide) * 800.0 - 30.0), vec2(1180.0, 720.0));
    p.rect_filled(r.translate(vec2(8.0, 10.0)), 10.0, Color32::from_black_alpha(130));
    p.rect_filled(r, 10.0, PAPER);
    let x = r.min.x + 60.0;
    let mut y = r.min.y + 44.0;
    let case_label = if c.case_no == 255 { "CODE BLUE".to_string() } else { format!("CASE {}", c.case_no) };
    style::plain(p, pos2(x, y), Align2::LEFT_TOP, &case_label, 42.0, PAPER_INK);
    style::plain(p, pos2(r.max.x - 60.0, y), Align2::RIGHT_TOP, "MERCY HARBOR GENERAL", 36.0, PAPER_INK);
    y += 60.0;
    style::plain(p, pos2(x, y), Align2::LEFT_TOP, &c.case_name, 84.0, PAPER_INK);
    y += 118.0;
    style::line(p, pos2(x, y), pos2(r.max.x - 60.0, y), 3.0, PAPER_INK);
    y += 24.0;
    style::plain(p, pos2(x, y), Align2::LEFT_TOP, "Patient", 34.0, Color32::from_rgb(120, 100, 90));
    style::plain(p, pos2(x + 200.0, y - 8.0), Align2::LEFT_TOP, &c.patient, 54.0, PAPER_INK);
    y += 70.0;
    y = style::wrapped(p, pos2(x + 200.0, y), r.width() - 320.0, &c.life, 36.0, PAPER_INK) + 26.0;
    style::plain(p, pos2(x, y), Align2::LEFT_TOP, "Diagnosis", 34.0, Color32::from_rgb(120, 100, 90));
    style::wrapped(p, pos2(x + 200.0, y), r.width() - 320.0, &c.diagnosis, 36.0, PAPER_INK);
    let g = shell.glyphs();
    shell.prompted(g, Action::Confirm);
    super::glyphs::labeled(p, r.left_bottom() + vec2(60.0, -52.0), 46.0, g, Action::Confirm, "Scrub in", PAPER_INK);
    if (i.confirm || i.click) && c.t > 0.04 {
        shell.cue(cue::CONFIRM);
        shell.sim(SurgeryCmd::Advance);
    }
}

pub fn results(shell: &mut Shell, p: &Painter, rect: Rect, f: &SurgeryFrame, i: &ShellInput) {
    let Some(r0) = &f.results else { return };
    p.rect_filled(rect, 0.0, Color32::from_rgba_unmultiplied(6, 18, 20, 170));
    let t = r0.t;
    if !shell.saved_this_results {
        // The rank is the player's to keep.
        shell.saved_this_results = true;
        let n = r0.case_no;
        let rank = r0.rank.to_string();
        shell.save.record(n, &rank);
        if n < 8 && !f.attract {
            if n + 1 > shell.save.furthest {
                shell.save.furthest = (n + 1).min(7);
            }
            if !shell.case_files_mode {
                shell.save.last_case = (n + 1).min(7);
            }
        }
        shell.persist();
    }
    let slide = ease(t / 0.4);
    let card = Rect::from_center_size(rect.center() + vec2(0.0, (1.0 - slide) * 900.0 - 20.0), vec2(1240.0, 820.0));
    p.rect_filled(card.translate(vec2(8.0, 10.0)), 10.0, Color32::from_black_alpha(130));
    p.rect_filled(card, 10.0, PAPER);
    let x = card.min.x + 70.0;
    let mut y = card.min.y + 40.0;
    style::plain(p, pos2(x, y), Align2::LEFT_TOP, &r0.case_name, 70.0, PAPER_INK);
    y += 92.0;
    style::plain(p, pos2(x, y), Align2::LEFT_TOP, &r0.patient, 40.0, Color32::from_rgb(120, 100, 90));
    y += 66.0;
    style::line(p, pos2(x, y), pos2(card.max.x - 70.0, y), 3.0, PAPER_INK);
    y += 20.0;
    // Lines appear one at a time.
    let lines: Vec<(String, i32)> = vec![
        ("Technique".into(), r0.action_points),
        ("Vitals left".into(), r0.vitals_bonus),
        ("Seconds left".into(), r0.time_bonus),
        (format!("Mistakes ({})", r0.mistakes), -r0.mistake_penalty),
    ];
    let w = 680.0;
    let mut shown = 0;
    let start = 0.55;
    for (k, (name, v)) in lines.iter().enumerate() {
        let at = start + k as f32 * 0.38;
        if t < at {
            break;
        }
        shown = k + 1;
        style::plain(p, pos2(x, y), Align2::LEFT_TOP, name, 44.0, PAPER_INK);
        style::plain(p, pos2(x + w, y), Align2::RIGHT_TOP, &format!("{v}"), 44.0, PAPER_INK);
        y += 62.0;
    }
    if shown == lines.len() {
        style::line(p, pos2(x, y + 2.0), pos2(x + w, y + 2.0), 3.0, PAPER_INK);
        y += 12.0;
        style::plain(p, pos2(x, y), Align2::LEFT_TOP, "Total", 56.0, PAPER_INK);
        style::plain(p, pos2(x + w, y), Align2::RIGHT_TOP, &format!("{}", r0.total), 56.0, PAPER_INK);
        y += 80.0;
    }
    // The stamp slams.
    let stamp_at = start + 0.38 * lines.len() as f32 + 0.3;
    if t >= stamp_at {
        if !shell.stamped {
            shell.stamped = true;
            shell.cue(cue::STAMP);
        }
        let k = ((t - stamp_at) / 0.14).clamp(0.0, 1.0);
        let scale = 2.2 - 1.2 * k;
        let c = pos2(card.max.x - 240.0, card.min.y + 340.0);
        let size = if r0.rank.len() > 1 { 96.0 } else { 220.0 };
        let a = k;
        let box_r = Rect::from_center_size(c, vec2(if r0.rank.len() > 1 { 390.0 } else { 240.0 }, 240.0) * scale);
        p.rect_stroke(box_r, 16.0, egui::Stroke::new(10.0 * scale, style::with_alpha(RED, a)), egui::StrokeKind::Inside);
        style::plain(p, c, Align2::CENTER_CENTER, &r0.rank, size * scale, style::with_alpha(RED, a));
        // The patient's fate.
        if t >= stamp_at + 0.4 {
            style::wrapped(p, pos2(x, card.max.y - 180.0), card.width() - 140.0, &r0.fate, 40.0, PAPER_INK);
        }
        let g = shell.glyphs();
        shell.prompted(g, Action::Confirm);
        super::glyphs::labeled(p, card.left_bottom() + vec2(70.0, -50.0), 44.0, g, Action::Confirm, "Go on", PAPER_INK);
        if (i.confirm || i.click) && t > stamp_at + 0.15 {
            shell.cue(cue::CONFIRM);
            shell.sim(SurgeryCmd::Advance);
        }
    } else if i.confirm || i.click {
        // Don't make them wait for the arithmetic twice: skip ahead on the next frame by waiting.
    }
    let _ = y;
    if r0.scores.len() > 1 {
        let mut yy = card.min.y + 480.0;
        for (slot, score) in &r0.scores {
            let c = style::SEATS[*slot as usize % 4];
            style::plain(p, pos2(card.max.x - 340.0, yy), Align2::LEFT_TOP, &format!("Surgeon {}", slot + 1), 34.0, c);
            style::plain(p, pos2(card.max.x - 70.0, yy), Align2::RIGHT_TOP, &format!("{score}"), 34.0, PAPER_INK);
            yy += 44.0;
        }
    }
}

pub fn death(shell: &mut Shell, p: &Painter, rect: Rect, f: &SurgeryFrame, i: &ShellInput) {
    let Some(d) = &f.death else { return };
    p.rect_filled(rect, 0.0, Color32::BLACK);
    let c = rect.center();
    style::plain(p, pos2(c.x, c.y - 280.0), Align2::CENTER_CENTER, &format!("Time of death: {}.", d.time), 92.0, Color32::WHITE);
    style::wrapped(p, pos2(c.x - 620.0, c.y - 190.0), 1240.0, &d.fate, 40.0, style::DIM);
    let mut items: Vec<String> = Vec::new();
    if d.checkpoint {
        items.push("Retry from the checkpoint".into());
    }
    items.push("Retry from the start".into());
    items.push("Quit to Title".into());
    let chosen = shell.list(p, i, &items, pos2(c.x - 420.0, c.y - 20.0), 840.0, 104.0, 56.0);
    shell.hints(p, rect, &[(Action::Nav, "Choose"), (Action::Confirm, "Select")]);
    if let Some(k) = chosen {
        let name = items[k].as_str();
        match name {
            "Retry from the checkpoint" => shell.sim(SurgeryCmd::Retry { from_start: false }),
            "Retry from the start" => shell.sim(SurgeryCmd::Retry { from_start: true }),
            _ => shell.quit_to_title(),
        }
        shell.focus = 0;
    }
}

/// The run is over: back where it started from.
pub fn finished(shell: &mut Shell, p: &Painter, rect: Rect, _f: &SurgeryFrame, i: &ShellInput) {
    p.rect_filled(rect, 0.0, style::with_alpha(style::BG, 0.9));
    let c = rect.center();
    let case_files = shell.case_files_mode;
    if case_files {
        let back = if shell.scene.contains("codeblue") { Screen::Menu } else { Screen::CaseFiles };
        shell.load("surgery/title");
        shell.go(back);
        return;
    }
    style::outlined(p, pos2(c.x, c.y - 180.0), Align2::CENTER_CENTER, "End of the First Movement", 96.0, Color32::WHITE);
    style::outlined(p, pos2(c.x, c.y - 60.0), Align2::CENTER_CENTER, "The orchestra is tuning somewhere.", 48.0, GOLD);
    let total = "Thank you for scrubbing in.";
    style::outlined(p, pos2(c.x, c.y + 30.0), Align2::CENTER_CENTER, total, 44.0, INK);
    shell.hints(p, rect, &[(Action::Confirm, "Credits")]);
    if i.confirm || i.click {
        shell.load("surgery/title");
        shell.came_from = Screen::Title;
        shell.go(Screen::About);
    }
}
