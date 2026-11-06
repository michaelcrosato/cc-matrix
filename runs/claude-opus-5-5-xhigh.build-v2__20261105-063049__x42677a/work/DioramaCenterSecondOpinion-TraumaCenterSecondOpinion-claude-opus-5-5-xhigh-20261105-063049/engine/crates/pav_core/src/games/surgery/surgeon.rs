//! The cursor between devices and field: how a stick moves it, and aim assist. This runs on the
//! render side (zero lag), on the same numbers the sim uses.

use glam::Vec2;

/// Keep gameplay inside this; the cursor may reach the tray below it.
pub const FIELD_X: f32 = 10.6;
pub const FIELD_Z_MIN: f32 = -5.6;
pub const FIELD_Z_MAX: f32 = 6.1;

/// Moves a pad's or the keyboard's cursor for one frame: `v = speed * s^2.2`; near a valid
/// target speed falls by up to 50% and the cursor is pulled toward it at up to 3 u/s, only while
/// the stick is moving.
pub fn integrate(
    mut cursor: Vec2,
    stick: Vec2,
    speed: f32,
    precision: bool,
    assist: f32,
    dt: f32,
    targets: impl Iterator<Item = Vec2>,
) -> Vec2 {
    let s = stick.length().min(1.0);
    if s <= 0.001 {
        return cursor;
    }
    let dir = stick / stick.length();
    let mut v = speed * s.powf(2.2);
    if precision {
        v *= 0.35;
    }
    let mut pull = Vec2::ZERO;
    if assist > 0.0 {
        let mut best: Option<(f32, Vec2)> = None;
        for t in targets {
            let d = t.distance(cursor);
            if d < 1.2 && best.is_none_or(|b| d < b.0) {
                best = Some((d, t));
            }
        }
        if let Some((d, t)) = best {
            let k = (1.0 - d / 1.2).clamp(0.0, 1.0) * assist.min(1.0);
            v *= 1.0 - 0.5 * k;
            if d > 0.02 {
                pull = (t - cursor) / d * 3.0 * k.max(0.25 * assist);
            }
        }
    }
    cursor += (dir * v + pull) * dt;
    clamp(cursor)
}

/// Where a ring place's instrument lies on the tray, in field x.
pub fn tray_x(place: usize) -> f32 {
    -7.0 + 2.0 * place as f32
}

/// The tray place at a field point, if the point is on the tray.
pub fn tray_place(p: Vec2) -> Option<usize> {
    if p.y < 4.72 {
        return None;
    }
    let i = ((p.x + 8.0) / 2.0).floor();
    (0.0..8.0).contains(&i).then_some(i as usize)
}

pub fn clamp(p: Vec2) -> Vec2 {
    Vec2::new(p.x.clamp(-FIELD_X, FIELD_X), p.y.clamp(FIELD_Z_MIN, FIELD_Z_MAX))
}

/// A flick of the left stick: which of 8 ring places it points at (0 = up, clockwise). `stick`
/// has y up.
pub fn flick(stick: Vec2) -> Option<usize> {
    if stick.length() < 0.55 {
        return None;
    }
    let a = stick.x.atan2(stick.y).rem_euclid(std::f32::consts::TAU);
    Some(((a / std::f32::consts::FRAC_PI_4 + 0.5).floor() as usize) % 8)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn flicks_land_on_the_eight_places() {
        assert_eq!(flick(Vec2::new(0.0, 1.0)), Some(0));
        assert_eq!(flick(Vec2::new(1.0, 1.0)), Some(1));
        assert_eq!(flick(Vec2::new(1.0, 0.0)), Some(2));
        assert_eq!(flick(Vec2::new(1.0, -1.0)), Some(3));
        assert_eq!(flick(Vec2::new(0.0, -1.0)), Some(4));
        assert_eq!(flick(Vec2::new(-1.0, -1.0)), Some(5));
        assert_eq!(flick(Vec2::new(-1.0, 0.0)), Some(6));
        assert_eq!(flick(Vec2::new(-1.0, 1.0)), Some(7));
        assert_eq!(flick(Vec2::new(0.2, 0.2)), None);
    }

    #[test]
    fn assist_slows_and_pulls_only_while_the_stick_moves() {
        let at = Vec2::new(0.0, 0.0);
        let target = Vec2::new(0.5, 0.0);
        let still = integrate(at, Vec2::ZERO, 15.0, false, 1.0, 0.1, [target].into_iter());
        assert_eq!(still, at);
        let free = integrate(at, Vec2::new(0.0, 0.5), 15.0, false, 0.0, 0.1, [target].into_iter());
        let helped = integrate(at, Vec2::new(0.0, 0.5), 15.0, false, 1.0, 0.1, [target].into_iter());
        assert!(helped.x > 0.0 && free.x == 0.0, "pulled toward the target");
        assert!(helped.y < free.y, "slower near the target");
        let fine = integrate(at, Vec2::new(0.0, 1.0), 15.0, true, 0.0, 0.1, std::iter::empty());
        let full = integrate(at, Vec2::new(0.0, 1.0), 15.0, false, 0.0, 0.1, std::iter::empty());
        assert!((fine.y / full.y - 0.35).abs() < 1e-4);
    }
}
