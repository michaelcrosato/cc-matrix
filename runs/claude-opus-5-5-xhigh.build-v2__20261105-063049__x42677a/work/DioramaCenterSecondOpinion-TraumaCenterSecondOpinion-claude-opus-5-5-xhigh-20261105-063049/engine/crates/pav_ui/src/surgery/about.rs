//! About: paged, big text. The text comes from a JSON block (the page's `about-data`, generated
//! from the exit interview), so an importing agent can add usage without rebuilding the wasm.

use egui::{Align2, Color32, Painter, Rect, vec2};
use pav_core::games::surgery::cue;
use serde::Deserialize;

use super::glyphs::Action;
use super::style::{self, INK};
use super::{Shell, ShellInput};

#[derive(Clone, Debug, Default, Deserialize)]
pub struct AboutSection {
    pub title: String,
    pub lines: Vec<String>,
}

#[derive(Clone, Debug, Default, Deserialize)]
pub struct About {
    pub sections: Vec<AboutSection>,
}

const BUILT_IN: &str = include_str!("about.json");

/// Characters on a page at 34 points, about, before it runs to another.
const PAGE_LINES: f32 = 15.0;
const CHARS_PER_LINE: f32 = 88.0;

impl About {
    pub fn built_in() -> Self {
        Self::parse(BUILT_IN).unwrap_or_default()
    }

    pub fn parse(json: &str) -> Option<Self> {
        serde_json::from_str(json).ok()
    }

    /// The text cut into screens: never a scrollbar.
    pub fn pages(&self) -> Vec<(String, Vec<String>)> {
        let mut out = Vec::new();
        for s in &self.sections {
            let (mut used, mut lines) = (0.0, Vec::new());
            for l in &s.lines {
                let need = (l.chars().count() as f32 / CHARS_PER_LINE).ceil().max(1.0) + 0.3;
                if used + need > PAGE_LINES && !lines.is_empty() {
                    out.push((s.title.clone(), std::mem::take(&mut lines)));
                    used = 0.0;
                }
                lines.push(l.clone());
                used += need;
            }
            if !lines.is_empty() {
                out.push((s.title.clone(), lines));
            }
        }
        if out.is_empty() {
            out.push(("About".to_string(), vec!["Nothing here yet.".to_string()]));
        }
        out
    }
}

pub fn screen(shell: &mut Shell, p: &Painter, rect: Rect, i: &ShellInput) {
    p.rect_filled(rect, 0.0, style::with_alpha(style::BG, 0.96));
    let pages = shell.about.pages();
    let n = pages.len();
    shell.page = shell.page.min(n - 1);
    if shell.nav(2) || i.tab_prev {
        shell.page = (shell.page + n - 1) % n;
        shell.cue(cue::NAV);
    }
    if shell.nav(3) || i.tab_next || i.confirm || (i.click && !i.back) {
        shell.page = (shell.page + 1) % n;
        shell.cue(cue::NAV);
    }
    let (title, lines) = &pages[shell.page];
    style::outlined(p, rect.min + vec2(120.0, 90.0), Align2::LEFT_CENTER, title, 66.0, Color32::WHITE);
    style::outlined(
        p,
        rect.right_top() + vec2(-120.0, 90.0),
        Align2::RIGHT_CENTER,
        &format!("{} / {}", shell.page + 1, n),
        42.0,
        style::DIM,
    );
    let mut y = rect.min.y + 170.0;
    for l in lines {
        y = style::wrapped(p, egui::pos2(rect.min.x + 120.0, y), rect.width() - 240.0, l, 34.0, INK) + 12.0;
    }
    shell.hints(p, rect, &[(Action::Adjust, "Page"), (Action::Back, "Back")]);
    if i.back {
        shell.cue(cue::BACK);
        let to = shell.came_from;
        shell.go(to);
    }
}
