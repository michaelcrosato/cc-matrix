//! 10-foot painter for Wobble Minutes. The sim owns the layout; this only draws it.

use std::sync::Arc;

use egui::{Color32, CornerRadius, FontFamily, FontId, Pos2, Rect, Stroke, StrokeKind, Vec2};

use pav_core::fit_ui::FitUi;

const FREDOKA: &[u8] = include_bytes!("../fonts/Fredoka_600SemiBold.ttf");
const NUNITO: &[u8] = include_bytes!("../fonts/Nunito_700Bold.ttf");

/// Title and body sizes at this window. At 1920×1080 they are 64 and 34.
pub fn type_px(width: f32, height: f32) -> (f32, f32) {
    let scale = (width / 1920.0).min(height / 1080.0).max(0.0);
    (64.0 * scale, 34.0 * scale)
}

pub fn install_fonts(ctx: &egui::Context) {
    let mut fonts = egui::FontDefinitions::default();
    fonts.font_data.insert("Fredoka".into(), Arc::new(egui::FontData::from_static(FREDOKA)));
    fonts.font_data.insert("Nunito".into(), Arc::new(egui::FontData::from_static(NUNITO)));
    fonts.families.insert(FontFamily::Name("Fredoka".into()), vec!["Fredoka".into(), "Nunito".into()]);
    fonts.families.insert(FontFamily::Name("Nunito".into()), vec!["Nunito".into()]);
    if let Some(prop) = fonts.families.get_mut(&FontFamily::Proportional) {
        prop.insert(0, "Nunito".into());
    }
    ctx.set_fonts(fonts);
}

fn text(painter: &egui::Painter, pos: Pos2, text: &str, size: f32, family: FontFamily, color: Color32) {
    if text.is_empty() || size < 1.0 {
        return;
    }
    let galley = painter.layout_no_wrap(text.to_string(), FontId::new(size, family), color);
    painter.galley(pos, galley, color);
}

/// Draws the stay UI in pixels. `scale` is `min(w/1920, h/1080)`.
pub fn draw(ctx: &egui::Context, ui: &FitUi) {
    let screen = ctx.content_rect();
    if screen.width() < 2.0 || screen.height() < 2.0 {
        return;
    }
    let (title_px, body_px) = type_px(screen.width(), screen.height());
    let scale = title_px / 64.0;
    let painter = ctx.layer_painter(egui::LayerId::new(egui::Order::Foreground, egui::Id::new("wobble_minutes")));
    if ui.dim > 0.01 {
        let a = (ui.dim.clamp(0.0, 1.0) * 255.0) as u8;
        painter.rect_filled(screen, CornerRadius::ZERO, Color32::from_rgba_unmultiplied(4, 6, 10, a));
    }
    let ink = Color32::from_rgb(28, 48, 56);
    let teal = Color32::from_rgb(14, 122, 132);
    let fred = FontFamily::Name("Fredoka".into());
    let nun = FontFamily::Name("Nunito".into());

    if ui.demo {
        let ribbon = Rect::from_min_size(screen.right_top() + Vec2::new(-220.0 * scale, 18.0 * scale), Vec2::new(200.0 * scale, 64.0 * scale));
        painter.rect_filled(ribbon, CornerRadius::from(18.0 * scale), Color32::from_rgb(214, 92, 58));
        text(&painter, ribbon.left_top() + Vec2::new(28.0 * scale, 8.0 * scale), "DEMO", title_px * 0.6, fred.clone(), Color32::WHITE);
    }

    text(&painter, Pos2::new(screen.center().x - title_px * ui.title.chars().count() as f32 * 0.28, 36.0 * scale), &ui.title, title_px, fred.clone(), Color32::WHITE);

    if !ui.big.is_empty() {
        text(
            &painter,
            Pos2::new(screen.center().x - title_px * ui.big.chars().count() as f32 * 0.4, screen.height() * 0.16),
            &ui.big,
            title_px * 1.4,
            fred.clone(),
            Color32::from_rgb(255, 214, 120),
        );
    }

    let mut y = 120.0 * scale;
    for line in ui.lines.iter().take(2) {
        text(&painter, Pos2::new(screen.width() * 0.18, y), line, body_px, nun.clone(), Color32::from_rgb(230, 244, 242));
        y += body_px * 1.25;
    }

    for it in &ui.items {
        let r = Rect::from_min_size(
            Pos2::new(screen.left() + it.rect[0] * screen.width(), screen.top() + it.rect[1] * screen.height()),
            Vec2::new(it.rect[2] * screen.width(), it.rect[3] * screen.height()),
        );
        painter.rect_filled(r, CornerRadius::from(36.0 * scale), Color32::WHITE);
        if it.id == ui.focus {
            painter.rect_stroke(r, CornerRadius::from(36.0 * scale), Stroke::new((8.0 * scale).max(2.0), teal), StrokeKind::Outside);
        }
        text(&painter, r.left_center() + Vec2::new(28.0 * scale, -body_px * 0.55), &it.label, body_px, nun.clone(), ink);
    }

    if let Some([x, y, ring, _]) = ui.puck {
        let c = Pos2::new(screen.center().x, screen.height() * 0.72);
        let rad = (screen.height() * 0.16 * ring).max(8.0);
        painter.circle_stroke(c, rad, Stroke::new((4.0 * scale).max(1.5), Color32::from_rgba_unmultiplied(255, 255, 255, 180)));
        for p in &ui.trace {
            let d = c + Vec2::new(p[0], -p[1]) * rad;
            painter.circle_filled(d, (6.0 * scale).max(2.0), Color32::from_rgba_unmultiplied(255, 214, 120, 170));
        }
        let dot = c + Vec2::new(x, -y) * rad;
        painter.circle_filled(dot, (14.0 * scale).max(3.0), Color32::from_rgb(255, 120, 96));
    }
    if !ui.overlay.is_empty() {
        text(&painter, Pos2::new(28.0 * scale, 28.0 * scale), &ui.overlay, body_px * 0.7, nun.clone(), Color32::from_rgb(230, 244, 242));
    }

    if ui.touch_card {
        let card = Rect::from_center_size(screen.center(), Vec2::new(screen.width() * 0.7, body_px * 4.0));
        painter.rect_filled(card, CornerRadius::from(36.0 * scale), Color32::from_rgba_unmultiplied(255, 255, 255, 235));
        text(&painter, card.left_top() + Vec2::new(24.0 * scale, 16.0 * scale), "Controller or keyboard required", body_px, nun.clone(), ink);
    }

    let prompt = if ui.footer.is_empty() { ui.glyph.clone() } else { format!("{}   {}", ui.glyph, ui.footer) };
    text(&painter, Pos2::new(screen.width() * 0.28, screen.height() - body_px * 1.6), &prompt, body_px, nun, Color32::WHITE);
}

#[cfg(test)]
mod tests {
    use super::*;
    use pav_core::{InputFrame, Sim};

    #[test]
    fn type_holds_the_ten_foot_floor() {
        let (title, body) = type_px(1920.0, 1080.0);
        assert!(title >= 64.0 && body >= 34.0, "{title} {body}");
        let (small_t, _) = type_px(320.0, 180.0);
        assert!(small_t < 64.0 && small_t > 8.0, "{small_t}");
    }

    #[test]
    fn title_prompts_follow_the_device() {
        let mut sim = Sim::new("fit", 1).expect("fit");
        let cases = [(1u8, false, "Cross"), (1, true, "A"), (2, false, "Space"), (3, false, "Click")];
        for (device, xbox, word) in cases {
            {
                let g = sim.state.play.as_mut().unwrap().get_mut::<pav_core::games::fit::FitGame>().unwrap();
                g.settings.xbox = xbox;
            }
            sim.step(&InputFrame { device, ..Default::default() });
            let frame = sim.frame();
            let mut head = crate::headless::Headless::default();
            let mut drawn = head.frame(None, &frame.hud, glam::Mat4::IDENTITY, 1920, 1080, Default::default());
            let blob = drawn.reading.hud.iter().map(|t| t.text.as_str()).collect::<Vec<_>>().join(" | ");
            drawn.paint.textures.clear();
            assert!(blob.contains("Wobble Minutes"), "{blob}");
            assert!(blob.contains("New Stay"), "{blob}");
            assert!(blob.contains(word), "device {device} xbox {xbox}: {blob}");
        }
    }
}
