//! A hub session's own card: a pre-op board with the title, the patient, each player in their
//! colour with a ready mark, how to win, this player's controls, and the time left. It takes two
//! answers, and no menus.

use egui::{Align2, Color32, Painter, Rect, StrokeKind, pos2, vec2};

use super::glyphs::{self, Action};
use super::style::{self, GOLD, GREEN, INK, PAPER, PAPER_INK, SEATS};
use super::{Shell, ShellCmd, ShellInput, TITLE};

pub const GOAL: &str = "Keep the patient alive until the bell.";

/// A hub round in play: the HUD, the countdown, and plain words when it's over.
pub fn session(
    shell: &mut Shell,
    p: &Painter,
    rect: Rect,
    f: &pav_core::games::surgery::frame::SurgeryFrame,
    vp: glam::Mat4,
    i: &ShellInput,
) {
    use pav_core::games::surgery::frame::Stage;
    let center = rect.center();
    match f.stage {
        Stage::Op | Stage::OpStart | Stage::Code | Stage::Complete => super::hud::draw(shell, p, rect, f, vp, i),
        Stage::Results | Stage::Finished => {
            let text = "The patient lives. Stand by for the board.";
            style::outlined(p, center, Align2::CENTER_CENTER, text, 64.0, Color32::WHITE);
        }
        Stage::Dead => {
            p.rect_filled(rect, 0.0, Color32::BLACK);
            let text =
                f.death.as_ref().map(|d| format!("Time of death: {}.", d.time)).unwrap_or_else(|| "Time of death.".to_string());
            style::outlined(p, center, Align2::CENTER_CENTER, &text, 84.0, Color32::WHITE);
        }
        _ => {
            style::outlined(p, center + vec2(0.0, 200.0), Align2::CENTER_CENTER, "Scrubbing in...", 54.0, INK);
        }
    }
    if let Some(n) = shell.hub_card.as_ref().and_then(|c| c.countdown) {
        let s = n.ceil().max(1.0) as i32;
        style::outlined(p, center, Align2::CENTER_CENTER, &format!("{s}"), 240.0, GOLD);
    }
}

pub fn screen(shell: &mut Shell, p: &Painter, rect: Rect, i: &ShellInput) {
    p.rect_filled(rect, 0.0, style::with_alpha(style::BG, 0.72));
    let board = Rect::from_center_size(rect.center(), vec2(1640.0, 900.0));
    p.rect_filled(board.translate(vec2(8.0, 10.0)), 12.0, Color32::from_black_alpha(150));
    p.rect_filled(board, 12.0, PAPER);
    let x = board.min.x + 60.0;
    style::plain(p, pos2(x, board.min.y + 34.0), Align2::LEFT_TOP, TITLE, 70.0, PAPER_INK);
    style::plain(
        p,
        pos2(x, board.min.y + 118.0),
        Align2::LEFT_TOP,
        "Tonight's board: CODE BLUE, one patient, every hand",
        40.0,
        PAPER_INK,
    );
    style::line(p, pos2(x, board.min.y + 176.0), pos2(board.max.x - 60.0, board.min.y + 176.0), 3.0, PAPER_INK);
    let card = shell.hub_card.clone().unwrap_or_default();
    style::plain(p, pos2(x, board.min.y + 198.0), Align2::LEFT_TOP, "Patient: John Doe, Ward Nine", 44.0, PAPER_INK);
    style::plain(p, pos2(x, board.min.y + 258.0), Align2::LEFT_TOP, GOAL, 48.0, Color32::from_rgb(170, 30, 30));
    // Who is on tonight.
    let mut y = board.min.y + 340.0;
    for (id, name) in &card.players {
        let c = SEATS[*id as usize % 4];
        let row = Rect::from_min_size(pos2(x, y), vec2(800.0, 74.0));
        p.rect_filled(row, 8.0, style::with_alpha(c, 0.2));
        p.rect_filled(Rect::from_min_size(row.min, vec2(14.0, 74.0)), 4.0, c);
        let me = card.me == Some(*id);
        // The name is the hub's: egui text only, never markup.
        style::plain(p, row.left_center() + vec2(34.0, 0.0), Align2::LEFT_CENTER, name, 46.0, PAPER_INK);
        if me {
            style::plain(p, row.right_center() - vec2(150.0, 0.0), Align2::RIGHT_CENTER, "you", 36.0, PAPER_INK);
        }
        let ready = card.ready.contains(id);
        let t = if ready { "READY" } else { "scrubbing" };
        style::plain(
            p,
            row.right_center() - vec2(16.0, 0.0),
            Align2::RIGHT_CENTER,
            t,
            38.0,
            if ready { Color32::from_rgb(20, 120, 70) } else { Color32::from_rgb(120, 110, 100) },
        );
        y += 86.0;
    }
    // This player's controls.
    let g = shell.glyphs();
    let cx = board.min.x + 900.0;
    let mut cy = board.min.y + 348.0;
    let rows: &[(Action, &str)] = &[
        (Action::Aim, "Move the cursor"),
        (Action::Use, "Use the instrument"),
        (Action::Pick, "Pick an instrument"),
        (Action::Gift, "Your gift, on the beat"),
    ];
    for (a, label) in rows {
        shell.prompted(g, *a);
        glyphs::draw(p, pos2(cx, cy), 46.0, g, *a);
        style::plain(p, pos2(cx + 150.0, cy), Align2::LEFT_CENTER, label, 40.0, PAPER_INK);
        cy += 72.0;
    }
    // The clock and the two answers.
    let left = card.left_ms.map(|ms| format!("{:.0}", (ms / 1000.0).ceil()));
    let status = if card.starting {
        "Starting...".to_string()
    } else if card.paused {
        format!("Waiting: {} asked for more time", card.asking)
    } else if let Some(s) = left {
        format!("Scrub in: {s} seconds")
    } else {
        "Waiting for the board...".to_string()
    };
    style::plain(p, pos2(x, board.max.y - 150.0), Align2::LEFT_CENTER, &status, 50.0, PAPER_INK);
    let ready_r = Rect::from_min_size(pos2(x, board.max.y - 110.0), vec2(520.0, 86.0));
    let more_r = Rect::from_min_size(pos2(x + 560.0, board.max.y - 110.0), vec2(520.0, 86.0));
    let i_ready = card.me.is_some_and(|m| card.ready.contains(&m));
    p.rect_filled(ready_r, 12.0, if i_ready { GREEN } else { Color32::from_rgb(30, 110, 110) });
    p.rect_stroke(ready_r, 12.0, egui::Stroke::new(3.0, PAPER_INK), StrokeKind::Inside);
    shell.prompted(g, Action::Confirm);
    glyphs::draw(p, ready_r.left_center() + vec2(24.0, 0.0), 50.0, g, Action::Confirm);
    style::outlined(p, ready_r.left_center() + vec2(180.0, 0.0), Align2::LEFT_CENTER, "Ready", 52.0, Color32::WHITE);
    p.rect_filled(more_r, 12.0, if card.asked { GOLD } else { Color32::from_rgb(80, 86, 96) });
    p.rect_stroke(more_r, 12.0, egui::Stroke::new(3.0, PAPER_INK), StrokeKind::Inside);
    shell.prompted(g, Action::More);
    glyphs::draw(p, more_r.left_center() + vec2(24.0, 0.0), 50.0, g, Action::More);
    style::outlined(p, more_r.left_center() + vec2(120.0, 0.0), Align2::LEFT_CENTER, "More time", 52.0, Color32::WHITE);
    let tapped = i.tap.or(if i.click { i.pointer } else { None });
    if i.confirm || tapped.is_some_and(|q| ready_r.contains(q)) {
        shell.cmds.push(ShellCmd::HubReady);
    }
    if i.alt || tapped.is_some_and(|q| more_r.contains(q)) {
        shell.cmds.push(ShellCmd::HubMore);
    }
    let _ = INK;
}
