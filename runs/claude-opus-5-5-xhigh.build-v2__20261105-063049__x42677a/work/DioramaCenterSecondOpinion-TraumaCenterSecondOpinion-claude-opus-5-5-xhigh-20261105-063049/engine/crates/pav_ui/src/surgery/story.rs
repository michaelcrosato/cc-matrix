//! The story player's screen: a large dialogue box, the backlog, the prompts. And the cameo: the
//! same rig data, flattened into a mesh for the HUD.

use egui::epaint::{Mesh, Vertex};
use egui::{Align2, Color32, Painter, Pos2, Rect, StrokeKind, pos2, vec2};
use pav_core::games::surgery::content;
use pav_core::games::surgery::frame::SurgeryFrame;
use pav_core::games::surgery::paper;
use pav_core::input::SurgeryCmd;

use super::glyphs::Action;
use super::style::{self, INK};
use super::{Shell, ShellInput};

/// A rig, flattened: (colour, points, triangles), back to front.
pub struct Cameo {
    parts: Vec<(Color32, Vec<Pos2>, Vec<[u32; 3]>)>,
    open: Vec<Pos2>,
    closed: Vec<Pos2>,
    open_t: Vec<[u32; 3]>,
    closed_t: Vec<[u32; 3]>,
}

fn build_cameo(who: &str) -> Option<Cameo> {
    let content = content::get();
    let r = content.rigs.get(who)?;
    let mut order: Vec<&content::PartDef> = r.part.iter().collect();
    order.sort_by(|a, b| a.z.total_cmp(&b.z));
    let mut parts = Vec::new();
    for pd in order {
        let c = r.palette.get(&pd.color).copied().unwrap_or([255, 255, 255]);
        let color = Color32::from_rgb(c[0], c[1], c[2]);
        let out = pd.outline();
        let mut push = |pts: Vec<glam::Vec2>| {
            let t = paper::triangulate(&pts);
            parts.push((color, pts.iter().map(|q| pos2(q.x, -q.y)).collect(), t));
        };
        push(out.clone());
        if pd.mirror {
            push(out.iter().rev().map(|q| glam::Vec2::new(-q.x, q.y)).collect());
        }
    }
    let shape = |list: &[[f32; 2]]| {
        let v: Vec<glam::Vec2> = list.iter().map(|q| glam::Vec2::new(q[0], q[1])).collect();
        let v = paper::chaikin(&v, 1);
        let t = paper::triangulate(&v);
        (v.iter().map(|q| pos2(q.x, -q.y)).collect::<Vec<_>>(), t)
    };
    let e = r.expr.get("neutral")?;
    let (open, open_t) = shape(&e.open);
    let (closed, closed_t) = shape(&e.closed);
    Some(Cameo { parts, open, closed, open_t, closed_t })
}

/// Draws a character's head and shoulders in a rect.
pub fn cameo(shell: &mut Shell, p: &Painter, r: Rect, who: &str, _expr: &str, talking: bool) {
    if !shell.cameos_ref().contains_key(who) {
        if let Some(c) = build_cameo(who) {
            shell.cameos_mut().insert(who.to_string(), c);
        }
    }
    let content = content::get();
    let accent = content.rigs.get(who).map(|x| x.accent).unwrap_or([60, 70, 80]);
    p.rect_filled(r, 10.0, Color32::from_rgb(accent[0] / 3, accent[1] / 3, accent[2] / 3));
    let Some(c) = shell.cameos_ref().get(who) else { return };
    let scale = r.height() / 4.6;
    let origin = r.center() + vec2(0.0, r.height() * 0.08);
    let clip = p.with_clip_rect(r);
    let mut m = Mesh::default();
    let mut add = |pts: &[Pos2], tris: &[[u32; 3]], col: Color32| {
        let b = m.vertices.len() as u32;
        for q in pts {
            let at = origin + vec2(q.x, q.y) * scale;
            m.vertices.push(Vertex { pos: at, uv: egui::epaint::WHITE_UV, color: col });
        }
        for t in tris {
            m.indices.extend_from_slice(&[b + t[0], b + t[1], b + t[2]]);
        }
    };
    for (col, pts, tris) in &c.parts {
        add(pts, tris, *col);
    }
    let dark = Color32::from_rgb(92, 30, 40);
    if talking {
        add(&c.open, &c.open_t, dark);
    } else {
        add(&c.closed, &c.closed_t, dark);
    }
    clip.add(m);
}

impl Shell {
    pub fn cameos_ref(&self) -> &std::collections::HashMap<String, Cameo> {
        &self.cameos
    }
    pub fn cameos_mut(&mut self) -> &mut std::collections::HashMap<String, Cameo> {
        &mut self.cameos
    }
}

/// Draws the dialogue box; returns nothing. Shared with attract's story segment.
fn dialogue(p: &Painter, rect: Rect, f: &SurgeryFrame) -> Rect {
    let Some(s) = &f.story else { return rect };
    let box_r = Rect::from_min_size(rect.left_bottom() + vec2(120.0, -320.0), vec2(rect.width() - 240.0, 240.0));
    p.rect_filled(box_r.translate(vec2(6.0, 8.0)), 16.0, Color32::from_black_alpha(120));
    p.rect_filled(box_r, 16.0, Color32::from_rgba_unmultiplied(8, 22, 26, 238));
    let content = content::get();
    let narrator = &*s.who == "narrator";
    let (title, accent) = content
        .rigs
        .get(&*s.who)
        .map(|r| (r.title.clone(), Color32::from_rgb(r.accent[0], r.accent[1], r.accent[2])))
        .unwrap_or((String::new(), INK));
    p.rect_stroke(box_r, 16.0, egui::Stroke::new(3.0, style::with_alpha(accent, 0.8)), StrokeKind::Inside);
    if !title.is_empty() {
        let tag = Rect::from_min_size(box_r.left_top() + vec2(40.0, -34.0), vec2(title.len() as f32 * 21.0 + 44.0, 62.0));
        p.rect_filled(tag, 10.0, accent);
        style::plain(p, tag.center(), Align2::CENTER_CENTER, &title, 44.0, Color32::from_rgb(8, 16, 20));
    }
    let shown: String = s.text.chars().take(s.chars as usize).collect();
    let color = if narrator { Color32::from_rgb(206, 226, 226) } else { Color32::WHITE };
    style::wrapped(p, box_r.left_top() + vec2(44.0, 44.0), box_r.width() - 110.0, &shown, 42.0, color);
    box_r
}

pub fn draw_attract(_shell: &mut Shell, p: &Painter, rect: Rect, f: &SurgeryFrame) {
    dialogue(p, rect, f);
}

pub fn draw(shell: &mut Shell, p: &Painter, rect: Rect, f: &SurgeryFrame, i: &ShellInput) {
    let Some(s) = &f.story else { return };
    if s.flash > 0.0 && !shell.save.settings.reduce_flashes {
        p.rect_filled(rect, 0.0, style::with_alpha(Color32::WHITE, (s.flash * 0.9).min(0.9)));
    }
    let box_r = dialogue(p, rect, f);
    // A mark when the line is done, and the click area: anywhere.
    if s.typed {
        let beat = (shell.time * 4.0).sin() * 6.0;
        let g = shell.glyphs();
        shell.prompted(g, Action::Confirm);
        super::glyphs::draw(p, box_r.right_bottom() + vec2(-78.0, -42.0 + beat), 44.0, g, Action::Confirm);
    }
    let auto_label = if shell.auto_advance { "Auto: on" } else { "Auto: off" };
    shell.hints(
        p,
        rect,
        &[(Action::Skip, "Skip scene"), (Action::Backlog, "Backlog"), (Action::Auto, auto_label), (Action::Pause, "Pause")],
    );
    if shell.backlog {
        backlog(p, rect, f);
        if i.chart || i.back || i.click || i.confirm {
            shell.backlog = false;
        }
        return;
    }
    if i.chart {
        shell.backlog = true;
        return;
    }
    if i.alt {
        shell.auto_advance = !shell.auto_advance;
        shell.cue(pav_core::games::surgery::cue::NAV);
    }
    // Hold to skip the scene.
    if i.confirm_held {
        shell.hold += i.dt;
        if shell.hold > 0.25 {
            let k = ((shell.hold - 0.25) / 0.8).clamp(0.0, 1.0);
            let r = Rect::from_min_size(box_r.left_bottom() + vec2(0.0, 6.0), vec2(box_r.width() * k, 10.0));
            p.rect_filled(r, 5.0, style::GOLD);
        }
        if shell.hold > 1.05 {
            shell.hold = 0.0;
            shell.sim(SurgeryCmd::SkipScene);
            return;
        }
    } else {
        shell.hold = 0.0;
    }
    if i.confirm || i.click {
        shell.sim(SurgeryCmd::Advance);
        shell.auto_t = 0.0;
    } else if shell.auto_advance && s.typed {
        shell.auto_t += i.dt;
        if shell.auto_t > 1.6 {
            shell.auto_t = 0.0;
            shell.sim(SurgeryCmd::Advance);
        }
    }
}

fn backlog(p: &Painter, rect: Rect, f: &SurgeryFrame) {
    let Some(s) = &f.story else { return };
    p.rect_filled(rect, 0.0, style::with_alpha(style::BG, 0.96));
    style::outlined(p, rect.min + vec2(120.0, 80.0), Align2::LEFT_CENTER, "Backlog", 60.0, Color32::WHITE);
    let content = content::get();
    let Some(def) = content.stories.get(&*s.key) else { return };
    let upto = (s.line as usize + 1).min(def.line.len());
    let spoken: Vec<&content::LineDef> = def.line[..upto].iter().filter(|l| !l.who.is_empty()).collect();
    // The last few lines that fit: no scrollbars.
    let mut y = rect.max.y - 110.0;
    for l in spoken.iter().rev().take(7) {
        let title = content.rigs.get(&l.who).map(|r| r.title.clone()).unwrap_or_default();
        let text = if title.is_empty() { l.text.clone() } else { format!("{title}: {}", l.text) };
        let galley = p.layout(text, style::font(36.0), INK, rect.width() - 240.0);
        y -= galley.size().y + 16.0;
        if y < rect.min.y + 130.0 {
            break;
        }
        p.galley(pos2(rect.min.x + 120.0, y), galley, INK);
    }
}
