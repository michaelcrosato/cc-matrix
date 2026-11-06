//! Map queries for the Republic of Kwelara. Coordinates: x east, z south, origin at the map centre.
//! The playable square is 2048 m on a side.

use crate::rng::hash_f32;

pub const MAP: f32 = 1024.0;

pub struct Place {
    pub name: &'static str,
    pub x: f32,
    pub z: f32,
}

pub const PLACES: &[Place] = &[
    Place { name: "Airstrip", x: -120.0, z: 900.0 },
    Place { name: "Kilo 38", x: -40.0, z: 640.0 },
    Place { name: "Kilometre 40", x: 0.0, z: 380.0 },
    Place { name: "Pump House", x: 170.0, z: 470.0 },
    Place { name: "Bridge", x: 40.0, z: 40.0 },
    Place { name: "North Post", x: 40.0, z: 110.0 },
    Place { name: "South Post", x: 40.0, z: -30.0 },
    Place { name: "Ste-Odile", x: 720.0, z: 420.0 },
    Place { name: "Ferry", x: 640.0, z: 170.0 },
    Place { name: "Boat Shed", x: 830.0, z: 255.0 },
    Place { name: "Pump Station", x: -420.0, z: -30.0 },
    Place { name: "Ombe Flats", x: -520.0, z: -520.0 },
    Place { name: "Junction", x: 20.0, z: -420.0 },
    Place { name: "Flats Post", x: 60.0, z: -460.0 },
    Place { name: "Ranger's Lodge", x: -260.0, z: -700.0 },
    Place { name: "Ridge Post", x: 360.0, z: -520.0 },
    Place { name: "Hotel Splendide", x: 620.0, z: -640.0 },
    Place { name: "Quarry Post", x: -420.0, z: 480.0 },
    Place { name: "Cement Works", x: -760.0, z: 620.0 },
];

const RIVER: &[(f32, f32)] = &[
    (1024.0, 120.0),
    (760.0, 260.0),
    (420.0, 90.0),
    (120.0, 40.0),
    (-200.0, -40.0),
    (-560.0, 60.0),
    (-820.0, 220.0),
    (-1024.0, 180.0),
];

pub fn place(name: &str) -> (f32, f32) {
    PLACES.iter().find(|p| p.name == name).map(|p| (p.x, p.z)).unwrap_or((0.0, 380.0))
}

pub fn clamp_map(x: f32, z: f32) -> (f32, f32) {
    (x.clamp(-MAP, MAP), z.clamp(-MAP, MAP))
}

pub fn dist(ax: f32, az: f32, bx: f32, bz: f32) -> f32 {
    let dx = ax - bx;
    let dz = az - bz;
    (dx * dx + dz * dz).sqrt()
}

fn seg_dist(x: f32, z: f32, ax: f32, az: f32, bx: f32, bz: f32) -> f32 {
    let abx = bx - ax;
    let abz = bz - az;
    let len2 = abx * abx + abz * abz;
    if len2 < 1e-4 {
        return dist(x, z, ax, az);
    }
    let t = (((x - ax) * abx + (z - az) * abz) / len2).clamp(0.0, 1.0);
    dist(x, z, ax + abx * t, az + abz * t)
}

pub fn river_dist(x: f32, z: f32) -> f32 {
    let mut best = f32::MAX;
    for w in RIVER.windows(2) {
        best = best.min(seg_dist(x, z, w[0].0, w[0].1, w[1].0, w[1].1));
    }
    best
}

pub fn on_water(x: f32, z: f32) -> bool {
    river_dist(x, z) < 12.0
}

/// Deep enough for the outboard. The edges of the channel are shallows.
pub fn deep_water(x: f32, z: f32) -> bool {
    river_dist(x, z) < 7.0
}

/// A point `metres` further along the channel from the closest point on the centre line.
pub fn water_ahead(x: f32, z: f32, metres: f32) -> (f32, f32) {
    let mut best_i = 0usize;
    let mut best_t = 0.0f32;
    let mut best_d = f32::MAX;
    for (i, w) in RIVER.windows(2).enumerate() {
        let abx = w[1].0 - w[0].0;
        let abz = w[1].1 - w[0].1;
        let len2 = abx * abx + abz * abz;
        let t = if len2 < 1e-4 { 0.0 } else { (((x - w[0].0) * abx + (z - w[0].1) * abz) / len2).clamp(0.0, 1.0) };
        let px = w[0].0 + abx * t;
        let pz = w[0].1 + abz * t;
        let d = dist(x, z, px, pz);
        if d < best_d {
            best_d = d;
            best_i = i;
            best_t = t;
        }
    }
    let mut i = best_i;
    let mut t = best_t;
    let mut left = metres.abs();
    let forward = metres >= 0.0;
    if !forward {
        // Walk back toward the upstream end of the polyline.
        while left > 0.0 {
            let (ax, az) = RIVER[i];
            let (bx, bz) = RIVER[i + 1];
            let abx = bx - ax;
            let abz = bz - az;
            let len = (abx * abx + abz * abz).sqrt().max(0.001);
            let back = t * len;
            if left <= back {
                let u = t - left / len;
                return (ax + abx * u, az + abz * u);
            }
            left -= back;
            if i == 0 {
                return RIVER[0];
            }
            i -= 1;
            t = 1.0;
        }
    }
    while left > 0.0 && i + 1 < RIVER.len() {
        let (ax, az) = RIVER[i];
        let (bx, bz) = RIVER[i + 1];
        let abx = bx - ax;
        let abz = bz - az;
        let len = (abx * abx + abz * abz).sqrt().max(0.001);
        let remain = (1.0 - t) * len;
        if left <= remain {
            let u = t + left / len;
            return (ax + abx * u, az + abz * u);
        }
        left -= remain;
        i += 1;
        t = 0.0;
        if i + 1 >= RIVER.len() {
            return RIVER[RIVER.len() - 1];
        }
    }
    RIVER[best_i]
}

pub fn nearest_water(x: f32, z: f32) -> (f32, f32) {
    let mut best = (x, z);
    let mut best_d = f32::MAX;
    for w in RIVER.windows(2) {
        let abx = w[1].0 - w[0].0;
        let abz = w[1].1 - w[0].1;
        let len2 = abx * abx + abz * abz;
        let t = if len2 < 1e-4 { 0.0 } else { (((x - w[0].0) * abx + (z - w[0].1) * abz) / len2).clamp(0.0, 1.0) };
        let px = w[0].0 + abx * t;
        let pz = w[0].1 + abz * t;
        let d = dist(x, z, px, pz);
        if d < best_d {
            best_d = d;
            best = (px, pz);
        }
    }
    best
}

pub fn on_road(x: f32, z: f32) -> bool {
    // North-south spine, and the flats crossroad. Half-width 4 m.
    if x.abs() <= 4.0 && z >= -700.0 && z <= 900.0 {
        return true;
    }
    if (z + 420.0).abs() <= 4.0 && x >= -120.0 && x <= 520.0 {
        return true;
    }
    false
}

pub fn on_rock(x: f32, z: f32) -> bool {
    dist(x, z, 700.0, -600.0) < 36.0
}

pub fn in_town(x: f32, z: f32) -> bool {
    dist(x, z, 0.0, 380.0) < 80.0
}

pub fn tree_at(x: f32, z: f32) -> bool {
    if on_road(x, z) || on_water(x, z) || on_rock(x, z) || in_town(x, z) {
        return false;
    }
    let ix = (x / 14.0).floor() as i32;
    let iz = (z / 14.0).floor() as i32;
    hash_f32(7, ix, 3, iz) > 0.82
}

pub fn bush_at(x: f32, z: f32) -> bool {
    if on_road(x, z) || on_water(x, z) || on_rock(x, z) {
        return false;
    }
    let ix = (x / 8.0).floor() as i32;
    let iz = (z / 8.0).floor() as i32;
    hash_f32(11, ix, 1, iz) > 0.78
}

pub fn tall_grass(x: f32, z: f32) -> bool {
    if on_road(x, z) || on_water(x, z) || in_town(x, z) {
        return false;
    }
    let ix = (x / 6.0).floor() as i32;
    let iz = (z / 6.0).floor() as i32;
    hash_f32(99, ix, 0, iz) > 0.35
}

/// Fuel per 2 m cell. Roads, water and rock are breaks.
pub fn fuel(x: f32, z: f32) -> f32 {
    if on_road(x, z) || on_water(x, z) || on_rock(x, z) {
        0.0
    } else if tree_at(x, z) {
        3.0
    } else if bush_at(x, z) {
        1.5
    } else {
        1.0
    }
}

pub fn height(x: f32, z: f32) -> f32 {
    if x > 180.0 && x < 760.0 && z < -380.0 && z > -820.0 {
        ((x - 180.0) / 520.0).clamp(0.0, 1.0) * 42.0
    } else if on_water(x, z) {
        -1.2
    } else {
        0.0
    }
}

pub fn cell_of(x: f32, z: f32) -> (i32, i32) {
    (x.div_euclid(2.0) as i32, z.div_euclid(2.0) as i32)
}

pub fn cell_center(c: (i32, i32)) -> (f32, f32) {
    (c.0 as f32 * 2.0 + 1.0, c.1 as f32 * 2.0 + 1.0)
}

pub fn safe_houses() -> [(f32, f32); 3] {
    [place("Pump House"), place("Ranger's Lodge"), place("Boat Shed")]
}

pub fn nearest_safe(x: f32, z: f32) -> (f32, f32) {
    safe_houses().into_iter().min_by(|a, b| dist(x, z, a.0, a.1).total_cmp(&dist(x, z, b.0, b.1))).unwrap_or((170.0, 470.0))
}

/// Detection multiplier from posture, grass, light and motion. Distance falloff is separate.
/// Crouched in tall grass at night, still: 0.6 * 0.35 * 0.45 * 0.5.
/// Standing on a road at noon, still: 1 * 1 * 1 * 0.5.
pub fn exposure(posture: f32, grass: f32, light: f32, motion: f32) -> f32 {
    posture * grass * light * motion
}

pub fn grass_factor(x: f32, z: f32, crouched: bool) -> f32 {
    if !tall_grass(x, z) {
        1.0
    } else if crouched {
        0.35
    } else {
        0.6
    }
}

pub fn wrap_angle(a: f32) -> f32 {
    let pi = std::f32::consts::PI;
    (a + pi).rem_euclid(pi * 2.0) - pi
}

pub fn yaw_toward(x: f32, z: f32, tx: f32, tz: f32) -> f32 {
    let dx = tx - x;
    let dz = tz - z;
    dx.atan2(-dz)
}
