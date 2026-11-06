//! Painter description for Wobble Minutes. The simulation builds it; `pav_ui` only draws it.

use serde::{Deserialize, Serialize};

/// One clickable row. `rect` is normalized (x, y, w, h), origin top-left, y down.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct FitItem {
    pub id: u16,
    pub label: String,
    pub rect: [f32; 4],
}

/// What the 10-foot UI draws this frame.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct FitUi {
    pub screen: String,
    pub title: String,
    pub lines: Vec<String>,
    pub items: Vec<FitItem>,
    pub focus: u16,
    pub device: u8,
    pub xbox: bool,
    /// Short name of the glyph for the primary action ("Cross", "A", "Space", "Click").
    pub glyph: String,
    pub action: String,
    pub demo: bool,
    pub touch_card: bool,
    /// Balance puck: cob x, cob y, ring radius, target radius. None hides it.
    pub puck: Option<[f32; 4]>,
    pub big: String,
    pub footer: String,
    pub camera_yaw: Option<f32>,
    /// 0 pad, shown as PlayStation unless `xbox`. 1 keyboard. 2 mouse. 3 touch.
    pub prompt_kind: u8,
    /// Full-screen dim, 0 clear, 1 black. The eyes-closed check uses this.
    #[serde(default)]
    pub dim: f32,
    /// Recent balance dots (cob x, cob y) when the dev trace is on.
    #[serde(default)]
    pub trace: Vec<[f32; 2]>,
    /// Corner line for the dev input viewer and engine stats. Empty when both are off.
    #[serde(default)]
    pub overlay: String,
}

/// Glyph label for an action. `device`: 1 pad, 2 keyboard, 3 mouse, 4 touch.
pub fn prompt(action: &str, device: u8, xbox: bool) -> String {
    let pad = device == 1 || device == 0;
    match action {
        "confirm" if pad && xbox => "A".into(),
        "confirm" if pad => "Cross".into(),
        "confirm" if device == 3 || device == 4 => "Click".into(),
        "confirm" => "Space".into(),
        "back" if pad && xbox => "B".into(),
        "back" if pad => "Circle".into(),
        "back" if device == 3 => "Right click".into(),
        "back" => "Esc".into(),
        "schedule" if pad && xbox => "Y".into(),
        "schedule" if pad => "Triangle".into(),
        "schedule" => "Tab".into(),
        "wave" if pad && xbox => "X".into(),
        "wave" if pad => "Square".into(),
        "wave" => "F".into(),
        "pause" if pad && xbox => "Menu".into(),
        "pause" if pad => "Options".into(),
        "pause" => "Esc".into(),
        "step_l" if pad && xbox => "LB".into(),
        "step_l" if pad => "L1".into(),
        "step_l" if device == 3 => "Left click".into(),
        "step_l" => "Q".into(),
        "step_r" if pad && xbox => "RB".into(),
        "step_r" if pad => "R1".into(),
        "step_r" if device == 3 => "Right click".into(),
        "step_r" => "E".into(),
        "brace" if pad && xbox => "LT+RT".into(),
        "brace" if pad => "L2+R2".into(),
        "brace" => "Q+E".into(),
        "lean" if pad => "Left stick".into(),
        "lean" if device == 3 || device == 4 => "Mouse".into(),
        "lean" => "WASD".into(),
        other => other.into(),
    }
}

/// Up to six stacked cards, centred.
pub fn stack_rects(n: usize) -> Vec<[f32; 4]> {
    let n = n.min(6);
    let h = 0.09;
    let gap = 0.018;
    let w = 0.46;
    let total = n as f32 * h + (n.saturating_sub(1) as f32) * gap;
    let y0 = (1.0 - total) * 0.55;
    (0..n)
        .map(|i| {
            let y = y0 + i as f32 * (h + gap);
            [0.27, y, w, h]
        })
        .collect()
}
