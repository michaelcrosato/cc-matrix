//! Sparse 2 m fire grid. Spread is a wind-biased front: each tick the downwind tip and the
//! upwind tip each get one roll of `spread * fuel * dryness * exp(k * dot * speed) * dt`.

use std::collections::BTreeMap;

use glam::Vec2;
use serde::{Deserialize, Serialize};

use super::geom::{self, cell_center, cell_of};
use crate::rng::Rng;

pub const FIRE_K: f32 = 0.10;
pub const FIRE_DT: f32 = 0.25;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Cell {
    pub burning: bool,
    pub life: f32,
    pub burnt_until: f32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct FireMap {
    pub cells: BTreeMap<(i32, i32), Cell>,
    pub acc: f32,
    pub burned: u32,
    pub wind_for_test: Vec2,
}

impl Default for FireMap {
    fn default() -> Self {
        Self { cells: BTreeMap::new(), acc: 0.0, burned: 0, wind_for_test: Vec2::ZERO }
    }
}

impl FireMap {
    pub fn burning_count(&self) -> usize {
        self.cells.values().filter(|c| c.burning).count()
    }

    pub fn ignite_at(&mut self, x: f32, z: f32, life: f32, minutes: f32) -> bool {
        if geom::fuel(x, z) <= 0.0 {
            return false;
        }
        self.ignite_cell(cell_of(x, z), life, minutes)
    }

    pub fn ignite_cell(&mut self, c: (i32, i32), life: f32, minutes: f32) -> bool {
        let (x, z) = cell_center(c);
        if geom::fuel(x, z) <= 0.0 {
            return false;
        }
        if let Some(cell) = self.cells.get(&c) {
            if cell.burning {
                return false;
            }
            if minutes < cell.burnt_until {
                return false;
            }
        }
        self.cells.insert(c, Cell { burning: true, life, burnt_until: 0.0 });
        self.burned += 1;
        true
    }

    pub fn ignite_disk(&mut self, x: f32, z: f32, radius: f32, life: f32, minutes: f32) -> u32 {
        let r = radius.ceil() as i32 + 1;
        let (cx, cz) = cell_of(x, z);
        let mut n = 0;
        for iz in (cz - r)..=(cz + r) {
            for ix in (cx - r)..=(cx + r) {
                let (px, pz) = cell_center((ix, iz));
                if geom::dist(px, pz, x, z) <= radius && self.ignite_cell((ix, iz), life, minutes) {
                    n += 1;
                }
            }
        }
        n
    }

    /// Step the grid. Returns cells extinguished by rain.
    pub fn tick(&mut self, dt: f32, wind: Vec2, spread: f32, burn_time: f32, minutes: f32, rain: bool, rng: &mut Rng) -> u32 {
        self.wind_for_test = wind;
        self.acc += dt;
        let mut extinguished = 0;
        if rain {
            let keys: Vec<_> = self.cells.iter().filter(|(_, c)| c.burning).map(|(k, _)| *k).collect();
            for k in keys {
                self.cells.remove(&k);
                extinguished += 1;
            }
            self.acc = 0.0;
            return extinguished;
        }
        while self.acc >= FIRE_DT {
            self.acc -= FIRE_DT;
            self.spread_once(wind, spread, burn_time, minutes, rng);
        }
        let done: Vec<_> = self.cells.iter().filter(|(_, c)| c.burning && c.life <= 0.0).map(|(k, _)| *k).collect();
        for k in done {
            if let Some(c) = self.cells.get_mut(&k) {
                c.burning = false;
                // Two in-game days. One real second is one in-game minute, so 48 hours = 2880 minutes.
                c.burnt_until = minutes + 48.0 * 60.0;
                c.life = 0.0;
            }
        }
        self.cells.retain(|_, c| c.burning || minutes < c.burnt_until);
        extinguished
    }

    fn spread_once(&mut self, wind: Vec2, spread: f32, burn_time: f32, minutes: f32, rng: &mut Rng) {
        let speed = wind.length();
        let dir = if speed > 1e-3 { wind / speed } else { Vec2::new(0.0, -1.0) };
        let burning: Vec<(i32, i32)> = self.cells.iter().filter(|(_, c)| c.burning).map(|(k, _)| *k).collect();
        if burning.is_empty() {
            return;
        }
        // Age the flames.
        for k in &burning {
            if let Some(c) = self.cells.get_mut(k) {
                c.life -= FIRE_DT;
            }
        }
        if speed < 0.5 {
            // Calm: grow the four extremes together so the scar stays roughly round.
            let positives = [
                *burning.iter().max_by(|a, b| a.0.cmp(&b.0)).unwrap(),
                *burning.iter().min_by(|a, b| a.0.cmp(&b.0)).unwrap(),
                *burning.iter().max_by(|a, b| a.1.cmp(&b.1)).unwrap(),
                *burning.iter().min_by(|a, b| a.1.cmp(&b.1)).unwrap(),
            ];
            let offs = [(1, 0), (-1, 0), (0, 1), (0, -1)];
            let p = (spread * 0.35 * FIRE_DT).clamp(0.0, 0.5);
            for (tip, off) in positives.iter().zip(offs) {
                if rng.f32() < p {
                    let _ = self.ignite_cell((tip.0 + off.0, tip.1 + off.1), burn_time, minutes);
                }
            }
            return;
        }
        let proj = |c: (i32, i32)| {
            let (x, z) = cell_center(c);
            x * dir.x + z * dir.y
        };
        let down = *burning.iter().max_by(|a, b| proj(**a).total_cmp(&proj(**b))).unwrap();
        let up = *burning.iter().min_by(|a, b| proj(**a).total_cmp(&proj(**b))).unwrap();
        self.try_tip(down, dir, true, speed, spread, burn_time, minutes, rng);
        self.try_tip(up, dir, false, speed, spread, burn_time, minutes, rng);
        // Embers jump only above 8 m/s, far enough to cross a road.
        if speed > 8.0 && rng.f32() < 0.12 {
            let (x, z) = cell_center(down);
            let hop = 6.0 + rng.f32() * 9.0;
            let _ = self.ignite_at(x + dir.x * hop, z + dir.y * hop, burn_time, minutes);
        }
    }

    fn try_tip(&mut self, tip: (i32, i32), dir: Vec2, downwind: bool, speed: f32, spread: f32, burn_time: f32, minutes: f32, rng: &mut Rng) {
        let step = if downwind { (dir.x.signum() as i32, dir.y.signum() as i32) } else { (-dir.x.signum() as i32, -dir.y.signum() as i32) };
        let step = if step == (0, 0) { (0, -1) } else { step };
        // Prefer the axis the wind actually points along.
        let step = if dir.x.abs() >= dir.y.abs() { (step.0.signum(), 0) } else { (0, step.1.signum()) };
        let step = if step == (0, 0) { if downwind { (1, 0) } else { (-1, 0) } } else { step };
        let dot = if downwind { 1.0 } else { -1.0 };
        let wf = (FIRE_K * dot * speed).exp();
        let (x, z) = cell_center(tip);
        let fuel = geom::fuel(x, z).max(0.5);
        let p = (spread * fuel * wf * FIRE_DT).clamp(0.0, 0.95);
        if rng.f32() < p {
            let _ = self.ignite_cell((tip.0 + step.0, tip.1 + step.1), burn_time, minutes);
        }
    }

    /// Reach along the wind axis, in metres, of every cell that has burned.
    pub fn reach(&self, origin: (f32, f32), wind: Vec2) -> (f32, f32) {
        let speed = wind.length();
        let dir = if speed > 1e-3 { wind / speed } else { Vec2::new(1.0, 0.0) };
        let mut down = 0.0f32;
        let mut up = 0.0f32;
        for c in self.cells.keys() {
            let (x, z) = cell_center(*c);
            let along = (x - origin.0) * dir.x + (z - origin.1) * dir.y;
            if along > down {
                down = along;
            }
            if -along > up {
                up = -along;
            }
        }
        (down, up)
    }
}
