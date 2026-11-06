//! Weapons, condition, jams and breaks. `Gun::pull` is the only shot roll.

use serde::{Deserialize, Serialize};

use crate::rng::Rng;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum WeaponId {
    Pistol,
    Revolver,
    Flare,
    Sawnoff,
    Ar,
    Battle,
    Smg,
    Shotgun,
    Sniper,
    Dart,
    Lmg,
    Rpg,
    Flamer,
    Mortar,
    Frag,
    Molotov,
    Machete,
}

#[derive(Clone, Copy, Debug)]
pub struct Stats {
    pub name: &'static str,
    pub family: &'static str,
    pub mag: u32,
    pub reserve: u32,
    pub rpm: f32,
    pub damage: f32,
    pub range: f32,
    pub wear: f32,
    pub noise: f32,
    pub pellets: u32,
    pub ignites: bool,
    pub silent: bool,
}

pub fn stats(id: WeaponId) -> Stats {
    use WeaponId::*;
    match id {
        Pistol => Stats { name: "Service Nine", family: "pistol", mag: 12, reserve: 60, rpm: 300.0, damage: 22.0, range: 40.0, wear: 0.10, noise: 120.0, pellets: 1, ignites: false, silent: false },
        Revolver => Stats { name: "Old Six", family: "pistol", mag: 6, reserve: 30, rpm: 120.0, damage: 48.0, range: 50.0, wear: 0.05, noise: 140.0, pellets: 1, ignites: false, silent: false },
        Flare => Stats { name: "Flare pistol", family: "launcher", mag: 1, reserve: 8, rpm: 40.0, damage: 10.0, range: 60.0, wear: 0.5, noise: 60.0, pellets: 1, ignites: true, silent: false },
        Sawnoff => Stats { name: "Sawn-off", family: "shotgun", mag: 2, reserve: 24, rpm: 120.0, damage: 12.0, range: 12.0, wear: 0.3, noise: 150.0, pellets: 8, ignites: false, silent: false },
        Ar => Stats { name: "Forty-Seven", family: "rifle", mag: 30, reserve: 180, rpm: 600.0, damage: 26.0, range: 120.0, wear: 0.14, noise: 160.0, pellets: 1, ignites: false, silent: false },
        Battle => Stats { name: "Battle rifle", family: "rifle", mag: 20, reserve: 100, rpm: 450.0, damage: 38.0, range: 180.0, wear: 0.12, noise: 180.0, pellets: 1, ignites: false, silent: false },
        Smg => Stats { name: "Folding SMG", family: "pistol", mag: 30, reserve: 180, rpm: 800.0, damage: 16.0, range: 50.0, wear: 0.16, noise: 110.0, pellets: 1, ignites: false, silent: false },
        Shotgun => Stats { name: "Pump gun", family: "shotgun", mag: 6, reserve: 36, rpm: 70.0, damage: 10.0, range: 18.0, wear: 0.25, noise: 150.0, pellets: 9, ignites: false, silent: false },
        Sniper => Stats { name: "Bolt rifle", family: "sniper", mag: 5, reserve: 40, rpm: 40.0, damage: 110.0, range: 400.0, wear: 0.35, noise: 300.0, pellets: 1, ignites: false, silent: false },
        Dart => Stats { name: "Dart rifle", family: "sniper", mag: 1, reserve: 12, rpm: 40.0, damage: 0.0, range: 80.0, wear: 0.2, noise: 8.0, pellets: 1, ignites: false, silent: true },
        Lmg => Stats { name: "Belt-fed gun", family: "rifle", mag: 100, reserve: 300, rpm: 700.0, damage: 28.0, range: 140.0, wear: 0.08, noise: 200.0, pellets: 1, ignites: false, silent: false },
        Rpg => Stats { name: "Rocket tube", family: "launcher", mag: 1, reserve: 6, rpm: 15.0, damage: 300.0, range: 150.0, wear: 1.2, noise: 260.0, pellets: 1, ignites: true, silent: false },
        Flamer => Stats { name: "Flamethrower", family: "flame", mag: 100, reserve: 300, rpm: 600.0, damage: 30.0, range: 14.0, wear: 0.05, noise: 40.0, pellets: 1, ignites: true, silent: false },
        Mortar => Stats { name: "Hand mortar", family: "launcher", mag: 1, reserve: 8, rpm: 20.0, damage: 200.0, range: 200.0, wear: 1.0, noise: 200.0, pellets: 1, ignites: true, silent: false },
        Frag => Stats { name: "Grenade", family: "launcher", mag: 1, reserve: 4, rpm: 60.0, damage: 150.0, range: 30.0, wear: 0.0, noise: 200.0, pellets: 1, ignites: true, silent: false },
        Molotov => Stats { name: "Petrol bottle", family: "flame", mag: 1, reserve: 4, rpm: 60.0, damage: 15.0, range: 24.0, wear: 0.0, noise: 30.0, pellets: 1, ignites: true, silent: false },
        Machete => Stats { name: "Machete", family: "melee", mag: 1, reserve: 0, rpm: 70.0, damage: 70.0, range: 1.6, wear: 0.0, noise: 10.0, pellets: 1, ignites: false, silent: true },
    }
}

/// Jam chance per shot. Zero above 70. At 35 this is 0.055, about one shot in eighteen.
pub fn jam_probability(condition: f32) -> f32 {
    if condition > 70.0 { 0.0 } else { 0.22 * ((70.0 - condition) / 70.0).powi(2) }
}

pub fn spread_mul(condition: f32) -> f32 {
    1.0 + (1.0 - condition.clamp(0.0, 100.0) / 100.0) * 0.8
}

pub fn clear_seconds(condition: f32) -> f32 {
    1.2 + (1.0 - condition.clamp(0.0, 100.0) / 100.0) * 1.3
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum Pull {
    Waiting,
    Dry,
    Jammed,
    Fired,
    Broke,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Gun {
    pub id: WeaponId,
    pub condition: f32,
    pub wear: f32,
    pub jammed: bool,
    pub broken: bool,
    pub ammo: u32,
    pub reserve: u32,
    pub cooldown: f32,
    pub clear_left: f32,
    pub slapped: bool,
    pub shots: u32,
    pub jams: u32,
    pub force_jam: bool,
}

impl Gun {
    pub fn new(id: WeaponId) -> Self {
        let s = stats(id);
        Self {
            id,
            condition: 100.0,
            wear: s.wear,
            jammed: false,
            broken: false,
            ammo: s.mag,
            reserve: s.reserve,
            cooldown: 0.0,
            clear_left: 0.0,
            slapped: false,
            shots: 0,
            jams: 0,
            force_jam: false,
        }
    }

    pub fn family(&self) -> &'static str {
        stats(self.id).family
    }

    /// One trigger pull. Jam is rolled before the bullet. A break is rolled on a real shot when
    /// condition is under the threshold (default 8) at 3 percent.
    pub fn pull(&mut self, rng: &mut Rng, jam_mul: f32, wear_mul: f32, break_at: f32) -> Pull {
        if self.cooldown > 0.0 {
            return Pull::Waiting;
        }
        if self.jammed {
            return Pull::Jammed;
        }
        if self.broken || self.ammo == 0 {
            return Pull::Dry;
        }
        let p = jam_probability(self.condition) * jam_mul.max(0.0);
        if self.force_jam || (p > 0.0 && rng.f32() < p) {
            self.jammed = true;
            self.force_jam = false;
            self.jams += 1;
            self.cooldown = 0.15;
            return Pull::Jammed;
        }
        self.ammo -= 1;
        self.shots += 1;
        let rpm = stats(self.id).rpm.max(1.0);
        self.cooldown = 60.0 / rpm;
        self.condition = (self.condition - self.wear * wear_mul.max(0.0)).max(0.0);
        if self.condition < break_at && rng.f32() < 0.03 {
            self.broken = true;
            return Pull::Broke;
        }
        Pull::Fired
    }

    /// Start clearing a jam, or slap the bolt. A second tap shortens the remaining time by 40%.
    pub fn tap_reload(&mut self) {
        if self.jammed && self.clear_left <= 0.0 {
            self.clear_left = clear_seconds(self.condition);
            self.slapped = false;
        } else if self.jammed && self.clear_left > 0.0 && !self.slapped {
            self.clear_left *= 0.6;
            self.slapped = true;
        } else if !self.jammed && !self.broken {
            let s = stats(self.id);
            let need = s.mag.saturating_sub(self.ammo);
            let take = need.min(self.reserve);
            self.ammo += take;
            self.reserve -= take;
        }
    }

    pub fn tick_clear(&mut self, dt: f32) {
        if self.clear_left > 0.0 {
            self.clear_left = (self.clear_left - dt).max(0.0);
            if self.clear_left == 0.0 {
                self.jammed = false;
                self.slapped = false;
            }
        }
        if self.cooldown > 0.0 {
            self.cooldown = (self.cooldown - dt).max(0.0);
        }
    }
}
