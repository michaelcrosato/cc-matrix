//! Lean shaping. The window calls these, and the tests call the same functions.

use glam::Vec2;

/// Stick axis after a 0.12 deadzone, then `x^curve` (curve 1.5 by default).
pub fn shape_stick(v: f32, dead: f32, curve: f32) -> f32 {
    let a = v.abs();
    if a <= dead {
        return 0.0;
    }
    let t = ((a - dead) / (1.0 - dead)).clamp(0.0, 1.0);
    t.powf(curve) * v.signum()
}

pub fn shape_stick2(v: Vec2, dead: f32, curve: f32) -> Vec2 {
    Vec2::new(shape_stick(v.x, dead, curve), shape_stick(v.y, dead, curve)).clamp_length_max(1.0)
}

/// Keyboard: move the lean target at `rate` units/s toward the held direction, else return at `back`.
pub fn key_ramp(current: f32, held: f32, dt: f32, rate: f32, back: f32) -> f32 {
    let goal = held.clamp(-1.0, 1.0);
    let speed = if goal.abs() > 0.0 { rate } else { back };
    let d = goal - current;
    let step = speed * dt;
    if d.abs() <= step { goal } else { current + d.signum() * step }
}

pub fn key_ramp2(current: Vec2, held: Vec2, dt: f32, rate: f32, back: f32) -> Vec2 {
    Vec2::new(key_ramp(current.x, held.x, dt, rate, back), key_ramp(current.y, held.y, dt, rate, back))
}

/// Mouse: offset from the screen centre, divided by 0.38 of the window height, clamped to the disc.
pub fn mouse_lean(offset: Vec2, height_px: f32) -> Vec2 {
    let s = (0.38 * height_px).max(1.0);
    (offset / s).clamp_length_max(1.0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn stick_deadzone_and_curve() {
        assert_eq!(shape_stick(0.1, 0.12, 1.5), 0.0);
        let v = shape_stick(1.0, 0.12, 1.5);
        assert!((v - 1.0).abs() < 1e-4);
        let mid = shape_stick(0.5, 0.12, 1.5);
        assert!(mid > 0.0 && mid < 0.5);
    }

    #[test]
    fn keys_ramp_and_mouse_clamps() {
        let mut x = 0.0;
        for _ in 0..60 {
            x = key_ramp(x, 1.0, 1.0 / 60.0, 1.6, 1.2);
        }
        assert!(x > 0.9, "{x}");
        x = key_ramp(x, 0.0, 1.0 / 60.0, 1.6, 1.2);
        assert!(x < 1.0);
        let m = mouse_lean(Vec2::new(10_000.0, 0.0), 1080.0);
        assert!((m.length() - 1.0).abs() < 1e-3);
    }
}
