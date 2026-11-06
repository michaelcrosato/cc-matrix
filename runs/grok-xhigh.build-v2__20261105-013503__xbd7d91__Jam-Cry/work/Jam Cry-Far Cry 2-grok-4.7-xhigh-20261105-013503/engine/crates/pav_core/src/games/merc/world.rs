//! Jam Cry simulation. One seeded `World::tick` drives movement, guns, fire, fever and the job.

use std::collections::BTreeSet;
use std::sync::OnceLock;

use glam::Vec2;
use serde::{Deserialize, Serialize};
use serde_json::json;

use super::fire::FireMap;
use super::geom::{self, exposure, grass_factor};
use super::gun::{self, Gun, Pull, WeaponId};
use super::shell::{self, Device};
use crate::input::buttons;
use crate::input::InputFrame;
use crate::rng::Rng;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum Route {
    Human,
    Burn,
    Read,
    Chair,
    Sandbox,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum Screen {
    Title,
    Difficulty,
    Merc,
    Prologue,
    Playing,
    Ledger,
    Pause,
    Settings,
    About,
    Dev,
    Mp,
    Attract,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Tune {
    pub enemy_accuracy: f32,
    pub enemy_damage: f32,
    pub player_damage: f32,
    pub detection: f32,
    pub enemy_count: f32,
    pub weapon_wear: f32,
    pub jam_chance: f32,
    pub break_threshold: f32,
    pub fire_spread: f32,
    pub burn_time: f32,
    pub wind_strength: f32,
    pub burn_damage: f32,
    pub fever_interval: f32,
    pub fever_severity: f32,
    pub syrette_heal: f32,
    pub rescue_window: f32,
    pub vehicle_speed: f32,
    pub vehicle_tough: f32,
    pub contract_pay: f32,
    pub post_reman_hours: f32,
    pub player_speed: f32,
}

impl Default for Tune {
    fn default() -> Self {
        Self {
            enemy_accuracy: 0.35,
            enemy_damage: 8.0,
            player_damage: 1.0,
            detection: 1.0,
            enemy_count: 1.0,
            weapon_wear: 1.0,
            jam_chance: 1.0,
            break_threshold: 8.0,
            fire_spread: 0.9,
            burn_time: 10.0,
            wind_strength: 1.0,
            burn_damage: 20.0,
            fever_interval: 15.0 * 60.0,
            fever_severity: 1.0,
            syrette_heal: 60.0,
            rescue_window: 6.0,
            vehicle_speed: 1.0,
            vehicle_tough: 1.0,
            contract_pay: 1.0,
            post_reman_hours: 24.0,
            player_speed: 1.0,
        }
    }
}

impl Tune {
    pub fn count(&self) -> usize {
        21
    }
    pub fn name(&self, i: usize) -> &'static str {
        ["Enemy accuracy", "Enemy damage", "Player damage", "Detection", "Enemy count", "Weapon wear", "Jam chance", "Break threshold", "Fire spread", "Burn time", "Wind strength", "Burn damage", "Fever interval", "Fever severity", "Syrette heal", "Rescue window", "Vehicle speed", "Vehicle toughness", "Contract pay", "Post reman hours", "Player speed"]
            .get(i)
            .copied()
            .unwrap_or("Value")
    }
    pub fn get(&self, i: usize) -> f32 {
        let v = [
            self.enemy_accuracy, self.enemy_damage, self.player_damage, self.detection, self.enemy_count, self.weapon_wear, self.jam_chance,
            self.break_threshold, self.fire_spread, self.burn_time, self.wind_strength, self.burn_damage, self.fever_interval, self.fever_severity,
            self.syrette_heal, self.rescue_window, self.vehicle_speed, self.vehicle_tough, self.contract_pay, self.post_reman_hours, self.player_speed,
        ];
        v.get(i).copied().unwrap_or(0.0)
    }
    pub fn set(&mut self, i: usize, v: f32) {
        let p = match i {
            0 => &mut self.enemy_accuracy,
            1 => &mut self.enemy_damage,
            2 => &mut self.player_damage,
            3 => &mut self.detection,
            4 => &mut self.enemy_count,
            5 => &mut self.weapon_wear,
            6 => &mut self.jam_chance,
            7 => &mut self.break_threshold,
            8 => &mut self.fire_spread,
            9 => &mut self.burn_time,
            10 => &mut self.wind_strength,
            11 => &mut self.burn_damage,
            12 => &mut self.fever_interval,
            13 => &mut self.fever_severity,
            14 => &mut self.syrette_heal,
            15 => &mut self.rescue_window,
            16 => &mut self.vehicle_speed,
            17 => &mut self.vehicle_tough,
            18 => &mut self.contract_pay,
            19 => &mut self.post_reman_hours,
            _ => &mut self.player_speed,
        };
        *p = v;
    }
    pub fn range(&self, i: usize) -> (f32, f32, f32) {
        match i {
            0 | 3 | 5 | 6 | 10 | 13 | 16 | 17 | 18 | 20 => (0.0, 3.0, 0.05),
            7 => (1.0, 40.0, 1.0),
            8 => (0.05, 3.0, 0.05),
            9 | 15 => (0.5, 30.0, 0.5),
            12 => (30.0, 2000.0, 10.0),
            19 => (1.0, 72.0, 1.0),
            _ => (0.0, 200.0, 1.0),
        }
    }
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct Dev {
    pub god: bool,
    pub infinite: bool,
    pub no_jams: bool,
    pub no_fever: bool,
    pub noclip: bool,
    pub invisible: bool,
    pub show_ai: bool,
    pub show_fire: bool,
    pub show_nav: bool,
    pub show_stats: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Body {
    pub kind: u8,
    pub x: f32,
    pub z: f32,
    pub yaw: f32,
    pub hp: f32,
    pub alive: bool,
    pub alert: u8,
    pub gun: Gun,
    pub see: f32,
    pub poison: f32,
    pub burn: f32,
    pub doomed: bool,
    pub flee: f32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Wall {
    pub min: [f32; 3],
    pub max: [f32; 3],
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Companion {
    pub name: String,
    pub alive: bool,
    pub down: bool,
    pub down_t: f32,
    pub rescue_spent: bool,
    pub x: f32,
    pub z: f32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Ride {
    pub kind: u8,
    pub seat: u8,
    pub x: f32,
    pub z: f32,
    pub yaw: f32,
    pub speed: f32,
    pub roll: f32,
    pub pitch: f32,
    pub health: f32,
    pub fuse: f32,
    pub repair: f32,
    pub stage: u8,
    pub dist: f32,
    pub npc: bool,
    pub npc_i: usize,
}

impl Default for Ride {
    fn default() -> Self {
        Self { kind: 0, seat: 0, x: 0.0, z: 0.0, yaw: 0.0, speed: 0.0, roll: 0.0, pitch: 0.0, health: 100.0, fuse: 0.0, repair: 0.0, stage: 0, dist: 0.0, npc: false, npc_i: 0 }
    }
}

#[derive(Clone, Copy, Debug)]
enum Spec {
    Boot,
    Map,
    Way,
    Reach { x: f32, z: f32, gps: bool },
    Fever,
    Pill,
    Blackout,
    Fight,
    EnemyJam,
    Jam,
    Break,
    Rescue,
    Wound(u8),
    Loot,
    Claim,
    Shop,
    Locker,
    Syrette,
    Tracker,
    Sleep { hours: f32 },
    Drive { x: f32, z: f32 },
    Mono,
    Ignite(u8),
    Tanks,
    Mounted,
    Panic,
    Animals,
    Bus { x: f32, z: f32 },
    Night,
    Boat,
    Stealth,
    Dart,
    Repair,
    Rain,
    Better,
    Patch,
    Overdose,
    Die,
    Tape,
    Ceasefire,
    Convoy,
    Town,
    Ending(u8),
    Flag(&'static str),
}

fn script(route: Route) -> &'static [Spec] {
    static S: OnceLock<Vec<Vec<Spec>>> = OnceLock::new();
    let all = S.get_or_init(|| vec![build_script(Route::Human), build_script(Route::Burn), build_script(Route::Read), build_script(Route::Chair)]);
    let i = match route {
        Route::Human => 0,
        Route::Burn => 1,
        Route::Read => 2,
        Route::Chair => 3,
        Route::Sandbox => return &[],
    };
    all[i].as_slice()
}

fn build_script(route: Route) -> Vec<Spec> {
    let mut v = vec![
        Spec::Boot,
        Spec::Map,
        Spec::Way,
        Spec::Reach { x: 0.0, z: 460.0, gps: true },
        Spec::Fever,
    ];
    if route == Route::Read {
        v.push(Spec::Blackout);
    } else {
        v.push(Spec::Pill);
    }
    v.push(Spec::Flag("contract_a0"));
    v.push(Spec::Reach { x: -40.0, z: 640.0, gps: false });
    v.push(Spec::Fight);
    v.push(Spec::EnemyJam);
    v.push(Spec::Jam);
    v.push(Spec::Break);
    v.push(Spec::Rescue);
    for w in 1..=6 {
        v.push(Spec::Wound(w));
    }
    v.push(Spec::Loot);
    v.push(Spec::Reach { x: 170.0, z: 470.0, gps: false });
    v.push(Spec::Claim);
    v.push(Spec::Shop);
    v.push(Spec::Locker);
    v.push(Spec::Syrette);
    v.push(Spec::Tracker);
    v.push(Spec::Sleep { hours: 8.0 });
    v.push(Spec::Flag("contract_a1"));
    v.push(Spec::Drive { x: -520.0, z: -520.0 });
    v.push(Spec::Mono);
    for ig in 0..12 {
        v.push(Spec::Ignite(ig));
    }
    v.push(Spec::Tanks);
    v.push(Spec::Mounted);
    v.push(Spec::Panic);
    v.push(Spec::Animals);
    v.push(Spec::Flag("contract_b1"));
    v.push(Spec::Bus { x: 0.0, z: 380.0 });
    v.push(Spec::Drive { x: -260.0, z: -700.0 });
    v.push(Spec::Sleep { hours: 26.0 });
    v.push(Spec::Night);
    v.push(Spec::Boat);
    v.push(Spec::Stealth);
    v.push(Spec::Dart);
    v.push(Spec::Flag("contract_b2"));
    v.push(Spec::Repair);
    v.push(Spec::Rain);
    v.push(Spec::Flag("contract_b3"));
    v.push(Spec::Better);
    match route {
        Route::Read => v.push(Spec::Overdose),
        Route::Chair => v.push(Spec::Die),
        _ => v.push(Spec::Patch),
    }
    v.push(Spec::Flag("contract_b4"));
    v.push(Spec::Tape);
    v.push(Spec::Ceasefire);
    v.push(Spec::Flag("contract_c1"));
    v.push(Spec::Convoy);
    v.push(Spec::Flag("contract_c2"));
    v.push(Spec::Town);
    v.push(Spec::Flag("contract_c3"));
    v.push(Spec::Drive { x: -760.0, z: 620.0 });
    v.push(Spec::Flag("contract_d1"));
    let end = match route {
        Route::Read => 1,
        Route::Chair => 2,
        _ => 0,
    };
    v.push(Spec::Ending(end));
    v.push(Spec::Flag("contract_d2"));
    v
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct World {
    pub seed: u64,
    pub rng: Rng,
    pub route: Route,
    pub screen: Screen,
    pub focus: usize,
    pub tab: usize,
    pub page: usize,
    pub difficulty: u8,
    pub merc: u8,
    pub x: f32,
    pub z: f32,
    pub yaw: f32,
    pub pitch: f32,
    pub roll: f32,
    pub eye: f32,
    pub stance: u8,
    pub stamina: f32,
    pub hp: f32,
    pub syrettes: u32,
    pub pills: u32,
    pub diamonds: u32,
    pub infamy: i32,
    pub guns: Vec<Gun>,
    pub slot: usize,
    pub syrette_t: f32,
    pub heal_t: f32,
    pub wound: u8,
    pub pill_t: f32,
    pub fever_t: f32,
    pub fever_state: u8,
    pub fever_warn: f32,
    pub fever_attack: f32,
    pub bodies: Vec<Body>,
    pub walls: Vec<Wall>,
    pub fire: FireMap,
    pub wind: Vec2,
    pub weather: u8,
    pub minutes: f32,
    pub ceasefire: bool,
    pub companions: Vec<Companion>,
    pub rescue_t: f32,
    pub ride: Ride,
    pub flags: BTreeSet<String>,
    pub step: u16,
    pub step_ready: bool,
    pub step_t: f32,
    pub step_x: f32,
    pub step_z: f32,
    pub step_yaw: f32,
    #[serde(default)]
    pub finale: Option<u8>,
    pub waypoint: Option<(f32, f32)>,
    pub map_t: f32,
    pub mono_t: f32,
    pub post_clear: bool,
    pub post_reman_at: f32,
    pub looking_at_post: bool,
    pub saves_written: u32,
    pub save_blob: String,
    pub has_save: bool,
    pub idle: f32,
    pub attract_t: f32,
    pub attract_seen: u16,
    pub attract_loops: u32,
    pub device: Device,
    pub device_lock: u8,
    pub xbox: bool,
    pub tune: Tune,
    pub tune0: Tune,
    pub dev: Dev,
    pub hub: bool,
    pub touch_only: bool,
    pub music: f32,
    pub finished: bool,
    pub hold_t: f32,
    pub tracker_cache: (f32, f32),
    pub treating: bool,
    pub jam_seen: bool,
    pub boat_dist: f32,
    /// Menu pointer in canvas pixels. The page sets it; the shell consumes it.
    #[serde(default)]
    pub pointer: Option<(f32, f32)>,
    #[serde(default)]
    pub pointer_click: bool,
}

impl World {
    pub fn fresh(seed: u64) -> Self {
        let mut w = Self::blank(seed, Route::Sandbox);
        w.screen = Screen::Playing;
        w.x = 200.0;
        w.z = -200.0;
        w.guns = vec![Gun::new(WeaponId::Pistol), Gun::new(WeaponId::Ar)];
        w.diamonds = 40;
        w.syrettes = 3;
        w.pills = 3;
        w.slot = 0;
        w
    }

    pub fn campaign(seed: u64, route: Route) -> Self {
        let mut w = Self::blank(seed, route);
        w.screen = Screen::Title;
        w.guns = vec![Gun::new(WeaponId::Pistol)];
        w.diamonds = 40;
        w.syrettes = 3;
        w.pills = 3;
        w
    }

    fn blank(seed: u64, route: Route) -> Self {
        let tune = Tune::default();
        Self {
            seed,
            rng: Rng::new(seed),
            route,
            screen: Screen::Title,
            focus: 0,
            tab: 0,
            page: 0,
            difficulty: 1,
            merc: 0,
            x: 0.0,
            z: 0.0,
            yaw: 0.0,
            pitch: 0.05,
            roll: 0.0,
            eye: 1.58,
            stance: 0,
            stamina: 12.0,
            hp: 100.0,
            syrettes: 3,
            pills: 3,
            diamonds: 40,
            infamy: 0,
            guns: vec![Gun::new(WeaponId::Pistol)],
            slot: 0,
            syrette_t: 0.0,
            heal_t: 0.0,
            wound: 0,
            pill_t: 0.0,
            fever_t: 0.0,
            fever_state: 0,
            fever_warn: 0.0,
            fever_attack: 0.0,
            bodies: Vec::new(),
            walls: Vec::new(),
            fire: FireMap::default(),
            wind: Vec2::new(2.0, 0.5),
            weather: 0,
            minutes: 12.0 * 60.0,
            ceasefire: true,
            companions: vec![
                Companion { name: "Tomek Wrona".into(), alive: true, down: false, down_t: 0.0, rescue_spent: false, x: 0.0, z: 0.0 },
                Companion { name: "Rafael Quintero".into(), alive: true, down: false, down_t: 0.0, rescue_spent: false, x: 0.0, z: 0.0 },
                Companion { name: "Mirela Dragan".into(), alive: true, down: false, down_t: 0.0, rescue_spent: false, x: 0.0, z: 0.0 },
            ],
            rescue_t: 0.0,
            ride: Ride::default(),
            flags: BTreeSet::new(),
            step: 0,
            step_ready: false,
            step_t: 0.0,
            step_x: 0.0,
            step_z: 0.0,
            step_yaw: 0.0,
            finale: None,
            waypoint: None,
            map_t: 0.0,
            mono_t: 0.0,
            post_clear: false,
            post_reman_at: 1.0e9,
            looking_at_post: false,
            saves_written: 0,
            save_blob: String::new(),
            has_save: false,
            idle: 0.0,
            attract_t: 0.0,
            attract_seen: 0,
            attract_loops: 0,
            device: Device::Gamepad,
            device_lock: 0,
            xbox: false,
            tune0: tune.clone(),
            tune,
            dev: Dev::default(),
            hub: false,
            touch_only: false,
            music: 0.10,
            finished: false,
            hold_t: 0.0,
            tracker_cache: (90.0, 500.0),
            treating: false,
            jam_seen: false,
            boat_dist: 0.0,
            pointer: None,
            pointer_click: false,
        }
    }

    pub fn mark(&mut self, flag: &str) {
        self.flags.insert(flag.to_string());
    }

    pub fn gun(&self) -> &Gun {
        &self.guns[self.slot.min(self.guns.len().saturating_sub(1))]
    }
    pub fn gun_mut(&mut self) -> &mut Gun {
        let i = self.slot.min(self.guns.len().saturating_sub(1));
        &mut self.guns[i]
    }

    pub fn spawn_dummy(&mut self, x: f32, z: f32, hp: f32) -> usize {
        self.bodies.push(Body {
            kind: 4,
            x,
            z,
            yaw: 0.0,
            hp,
            alive: true,
            alert: 0,
            gun: Gun::new(WeaponId::Pistol),
            see: 0.0,
            poison: 0.0,
            burn: 0.0,
            doomed: false,
            flee: 0.0,
        });
        self.bodies.len() - 1
    }

    pub fn add_wall(&mut self, min: [f32; 3], max: [f32; 3]) {
        self.walls.push(Wall { min, max });
    }

    pub fn tick(&mut self, input: &InputFrame, dt: f32) {
        let dt = dt.clamp(0.0, 0.5);
        self.apply_console(input);
        if self.screen != Screen::Playing {
            self.shell_tick(input, dt);
        } else if input.act == 10 && !self.hub {
            self.screen = Screen::Pause;
            self.focus = 0;
            self.idle = 0.0;
        } else {
            self.simulate(input, dt);
        }
        if self.route != Route::Sandbox {
            self.advance_script(dt);
        }
        if self.wind.length() > 6.0 && self.screen == Screen::Playing {
            self.mark("wind_rag");
        }
        self.minutes += dt;
        self.maybe_reman();
    }

    /// Numbered actions from the page. These run on every screen, including play,
    /// because the shell does not tick while a contract is running.
    fn apply_console(&mut self, input: &InputFrame) {
        match input.act {
            11 => self.dev.god = !self.dev.god,
            12 => {
                let (lo, hi, step) = self.tune.range(8);
                self.tune.set(8, (self.tune.get(8) + step).clamp(lo, hi));
            }
            13 => self.tune = self.tune0.clone(),
            14 => self.xbox = !self.xbox,
            15 => self.write_save(),
            16 => self.continue_save(),
            18 => {
                self.screen = Screen::Settings;
                self.tab = 0;
                self.focus = 0;
                self.idle = 0.0;
            }
            _ => {}
        }
    }

    pub fn continue_save(&mut self) {
        if !self.has_save {
            return;
        }
        let Ok(w) = Self::load_json(&self.save_blob) else { return };
        let saves = self.saves_written;
        let blob = self.save_blob.clone();
        *self = w;
        self.saves_written = saves;
        self.save_blob = blob;
        self.has_save = true;
        self.screen = Screen::Playing;
    }

    pub fn bot_input(&self) -> InputFrame {
        if self.screen == Screen::Ledger {
            return self.bot_ledger();
        }
        if self.screen != Screen::Playing {
            let mut f = InputFrame::default();
            f.act = 1;
            f.pressed = buttons::CONFIRM;
            return f;
        }
        let Some(spec) = self.current() else {
            return InputFrame::default();
        };
        self.bot_spec(spec)
    }

    fn current(&self) -> Option<Spec> {
        script(self.route).get(self.step as usize).copied()
    }

    pub fn goal_name(&self) -> String {
        if self.finished {
            return "done".into();
        }
        match self.current() {
            Some(Spec::Boot) => "boot",
            Some(Spec::Map) => "map",
            Some(Spec::Way) => "waypoint",
            Some(Spec::Reach { .. }) => "reach",
            Some(Spec::Fever) => "fever",
            Some(Spec::Pill) => "pill",
            Some(Spec::Blackout) => "blackout",
            Some(Spec::Fight) => "fight",
            Some(Spec::EnemyJam) => "enemy_jam",
            Some(Spec::Jam) => "jam",
            Some(Spec::Break) => "break",
            Some(Spec::Rescue) => "rescue",
            Some(Spec::Wound(n)) => return format!("wound{n}"),
            Some(Spec::Loot) => "loot",
            Some(Spec::Claim) => "claim",
            Some(Spec::Shop) => "shop",
            Some(Spec::Locker) => "locker",
            Some(Spec::Syrette) => "syrette",
            Some(Spec::Tracker) => "tracker",
            Some(Spec::Sleep { .. }) => "sleep",
            Some(Spec::Drive { .. }) => "drive",
            Some(Spec::Mono) => "mono",
            Some(Spec::Ignite(n)) => return format!("ignite{n}"),
            Some(Spec::Tanks) => "tanks",
            Some(Spec::Mounted) => "mounted",
            Some(Spec::Panic) => "panic",
            Some(Spec::Animals) => "animals",
            Some(Spec::Bus { .. }) => "bus",
            Some(Spec::Night) => "night",
            Some(Spec::Boat) => "boat",
            Some(Spec::Stealth) => "stealth",
            Some(Spec::Dart) => "dart",
            Some(Spec::Repair) => "repair",
            Some(Spec::Rain) => "rain",
            Some(Spec::Better) => "better",
            Some(Spec::Patch) => "patch",
            Some(Spec::Overdose) => "overdose",
            Some(Spec::Die) => "die",
            Some(Spec::Tape) => "tape",
            Some(Spec::Ceasefire) => "ceasefire",
            Some(Spec::Convoy) => "convoy",
            Some(Spec::Town) => "town",
            Some(Spec::Ending(n)) => return format!("ending{n}"),
            Some(Spec::Flag(s)) => s,
            None => "done",
        }
        .into()
    }

    pub fn goal_budget(&self) -> f32 {
        match self.current() {
            Some(Spec::Reach { .. }) => 160.0,
            Some(Spec::Drive { .. }) => 140.0,
            Some(Spec::Boat) => 240.0,
            Some(Spec::Town) => 220.0,
            Some(Spec::Bus { .. }) => 90.0,
            Some(Spec::Blackout) => 80.0,
            Some(Spec::Break) => 90.0,
            Some(Spec::Die) => 55.0,
            Some(Spec::Ending(_)) => {
                if self.finale == Some(1) || (self.finale.is_none() && matches!(self.current(), Some(Spec::Ending(1)))) {
                    200.0
                } else {
                    40.0
                }
            }
            Some(Spec::Sleep { .. }) | Some(Spec::Tracker) => 50.0,
            Some(Spec::Fight) | Some(Spec::EnemyJam) => 25.0,
            _ => 30.0,
        }
    }

    fn advance_script(&mut self, dt: f32) {
        if self.finished {
            return;
        }
        self.step_t += dt;
        for _ in 0..12 {
            let Some(spec) = self.current() else {
                self.finished = true;
                break;
            };
            if !self.step_ready {
                self.begin(spec);
                self.step_ready = true;
                self.step_t = 0.0;
            }
            if self.done(spec) {
                self.step += 1;
                self.step_ready = false;
                self.step_t = 0.0;
            } else {
                break;
            }
        }
    }

    fn begin(&mut self, spec: Spec) {
        self.step_x = self.x;
        self.step_z = self.z;
        self.step_yaw = self.yaw;
        self.hold_t = 0.0;
        match spec {
            Spec::Fever => {
                self.fever_t = self.tune.fever_interval;
            }
            Spec::Blackout => {
                self.pills = 0;
                self.fever_state = 2;
                self.fever_attack = 0.0;
            }
            Spec::Fight => {
                self.clear_bodies();
                for i in 0..4 {
                    let ang = i as f32 * 0.4;
                    self.spawn_soldier(self.x + ang.sin() * 12.0, self.z - 12.0, 36.0, false);
                }
            }
            Spec::EnemyJam => {
                self.clear_bodies();
                self.spawn_soldier(self.x, self.z - 8.0, 80.0, true);
            }
            Spec::Jam => {
                let g = self.gun_mut();
                g.force_jam = true;
                g.jammed = false;
                g.broken = false;
                g.ammo = 12;
                g.condition = 40.0;
                self.jam_seen = false;
            }
            Spec::Break => {
                self.guns.push(Gun::new(WeaponId::Smg));
                self.slot = self.guns.len() - 1;
                let g = self.gun_mut();
                g.condition = 5.0;
                g.wear = 0.0;
                g.ammo = 999;
                g.reserve = 999;
                g.jammed = false;
                g.broken = false;
                g.cooldown = 0.0;
            }
            Spec::Rescue => {
                self.hp = 0.0;
                self.rescue_t = 0.0;
                for c in &mut self.companions {
                    c.alive = true;
                    c.rescue_spent = false;
                    c.down = false;
                }
            }
            Spec::Wound(n) => {
                self.hp = 15.0;
                self.wound = n;
                self.heal_t = 0.0;
                self.treating = false;
            }
            Spec::Syrette => {
                if self.hp > 70.0 {
                    self.hp = 45.0;
                }
                self.syrettes = self.syrettes.max(1);
            }
            Spec::Shop => {
                if !self.guns.iter().any(|g| g.id == WeaponId::Battle) {
                    // The shelf is stocked. Buying happens on the interact.
                }
            }
            Spec::Drive { .. } => {
                self.wind = Vec2::new(9.0, 0.0);
                // Inland legs need the technical. A boat left on the channel cannot climb the bank.
                // Park it ahead and leave the seat empty. Boarding is the use key, same as the boat.
                if self.ride.kind != 1 {
                    let (sy, cy) = self.yaw.sin_cos();
                    self.ride.kind = 1;
                    self.ride.seat = 0;
                    self.ride.x = self.x + sy * 8.0;
                    self.ride.z = self.z - cy * 8.0;
                    self.ride.yaw = self.yaw;
                    self.ride.health = 100.0;
                    self.ride.stage = 0;
                    self.ride.speed = 0.0;
                    self.ride.fuse = 0.0;
                    self.ride.dist = 0.0;
                }
            }
            Spec::Mono => {
                self.clear_bodies();
                self.spawn_soldier(self.x, self.z - 24.0, 40.0, false);
                self.mono_t = 0.0;
            }
            Spec::Tanks => {
                self.arm(WeaponId::Pistol);
                self.spawn_tank_farm();
            }
            Spec::Panic => {
                // An earlier scare does not finish this job. The soldier has to run from this fire.
                self.flags.remove("enemy_panicked");
                self.clear_bodies();
                let sx = self.x + 4.0;
                let sz = self.z - 4.0;
                self.spawn_soldier(sx, sz, 40.0, false);
                // Runners sprint +x. One 2 m cell ends before flee passes 3.
                for i in 0..6 {
                    let _ = self.fire.ignite_disk(sx + i as f32 * 4.0, sz, 3.0, self.tune.burn_time, self.minutes);
                }
            }
            Spec::Animals => {
                self.clear_bodies();
                self.spawn_animal(self.x + 6.0, self.z - 6.0);
            }
            Spec::Night => {
                self.minutes = 22.0 * 60.0;
            }
            Spec::Sleep { .. } => {
                // The short rest already set this. The long rest has to happen on its own.
                self.flags.remove("sleep_used");
            }
            Spec::Boat => {
                let (wx, wz) = geom::nearest_water(self.x, self.z);
                let (ax, az) = geom::water_ahead(wx, wz, 40.0);
                self.ride.kind = 2;
                self.ride.seat = 0;
                self.ride.x = wx;
                self.ride.z = wz;
                self.ride.yaw = geom::yaw_toward(wx, wz, ax, az);
                self.ride.speed = 0.0;
                self.ride.health = 100.0;
                self.ride.stage = 0;
                self.ride.dist = 0.0;
                self.boat_dist = 0.0;
            }
            Spec::Stealth => {
                self.clear_bodies();
                self.spawn_soldier(self.x, self.z - 2.0, 40.0, false);
                if let Some(b) = self.bodies.last_mut() {
                    b.yaw = 0.0;
                    b.alert = 0;
                }
                self.stance = 1;
            }
            Spec::Dart => {
                self.clear_bodies();
                self.spawn_soldier(self.x, self.z - 18.0, 40.0, false);
                self.guns.push(Gun::new(WeaponId::Dart));
                self.slot = self.guns.len() - 1;
            }
            Spec::Repair => {
                if self.ride.kind == 0 {
                    self.ride.kind = 1;
                    self.ride.x = self.x;
                    self.ride.z = self.z;
                }
                self.ride.seat = 0;
                self.ride.health = 35.0;
                self.ride.stage = 2;
                self.ride.repair = 0.0;
            }
            Spec::Rain => {
                // The boat step leaves you on the channel. Rain has to quench grass, not water.
                let mut lit = false;
                for r in [16.0, 22.0, 30.0, 40.0] {
                    for (dx, dz) in [(r, 0.0), (-r, 0.0), (0.0, r), (0.0, -r)] {
                        if self.fire.ignite_at(self.x + dx, self.z + dz, self.tune.burn_time, self.minutes) {
                            lit = true;
                            break;
                        }
                    }
                    if lit {
                        break;
                    }
                }
                self.weather = 1;
            }
            Spec::Better => {
                // The offer stands a few metres ahead. The flag waits until the player takes it.
                let (sy, cy) = self.yaw.sin_cos();
                if let Some(c) = self.companions.iter_mut().find(|c| c.alive && !c.down) {
                    c.x = self.x + sy * 4.0;
                    c.z = self.z - cy * 4.0;
                    c.down_t = 0.0;
                }
            }
            Spec::Patch | Spec::Overdose | Spec::Die => {
                if let Some(c) = self.companions.iter_mut().find(|c| c.alive) {
                    c.down = true;
                    c.down_t = 0.0;
                    c.x = if matches!(spec, Spec::Die) { self.x + 40.0 } else { self.x + 1.5 };
                    c.z = self.z;
                }
                if matches!(spec, Spec::Overdose) {
                    if let Some(c) = self.companions.iter_mut().find(|c| c.down) {
                        c.down_t = 0.0;
                    }
                }
            }
            Spec::Ceasefire => {
                self.guns.push(Gun::new(WeaponId::Sniper));
                self.slot = self.guns.len() - 1;
                self.spawn_soldier(self.x, self.z - 30.0, 30.0, false);
            }
            Spec::Convoy => {
                self.clear_bodies();
                self.spawn_truck(self.x, self.z - 16.0);
                self.guns.push(Gun::new(WeaponId::Rpg));
                self.slot = self.guns.len() - 1;
            }
            Spec::Town => {
                self.arm(WeaponId::Molotov);
            }
            Spec::Ignite(n) => self.prep_ignite(n),
            Spec::Ending(_) => {
                self.finale = None;
                self.screen = Screen::Ledger;
                self.focus = 0;
                self.idle = 0.0;
            }
            Spec::Flag(s) => self.mark(s),
            _ => {}
        }
    }

    fn done(&mut self, spec: Spec) -> bool {
        match spec {
            Spec::Boot => self.screen == Screen::Playing,
            Spec::Map => self.flags.contains("map_raised"),
            Spec::Way => self.flags.contains("waypoint_set"),
            Spec::Reach { x, z, gps } => {
                if gps && self.waypoint.is_some() && geom::dist(self.x, self.z, self.step_x, self.step_z) > 25.0 {
                    self.mark("gps_followed");
                }
                geom::dist(self.x, self.z, x, z) < 10.0 && (!gps || self.flags.contains("gps_followed"))
            }
            Spec::Fever => self.flags.contains("fever_warned"),
            Spec::Pill => self.flags.contains("pill_taken"),
            Spec::Blackout => self.flags.contains("blackout"),
            Spec::Fight => {
                let clear = self.bodies.iter().filter(|b| b.kind == 1).all(|b| !b.alive);
                if clear && !self.bodies.is_empty() {
                    self.post_clear = true;
                    self.post_reman_at = self.minutes + self.tune.post_reman_hours * 60.0;
                    self.mark("post_cleared");
                }
                clear && self.flags.contains("post_cleared")
            }
            Spec::EnemyJam => self.flags.contains("enemy_jam"),
            Spec::Jam => self.flags.contains("jam_cleared"),
            Spec::Break => {
                if self.gun().broken {
                    self.mark("weapon_broke");
                    self.slot = 0;
                }
                self.flags.contains("weapon_broke")
            }
            Spec::Rescue => self.flags.contains("player_rescued"),
            Spec::Wound(n) => self.flags.contains(wound_flag(n)),
            Spec::Loot => self.guns.iter().any(|g| g.id == WeaponId::Ar),
            Spec::Claim => self.flags.contains("safe_house_claimed"),
            Spec::Shop => self.flags.contains("weapon_bought"),
            Spec::Locker => self.flags.contains("locker_used"),
            Spec::Syrette => self.flags.contains("syrette"),
            Spec::Tracker => self.flags.contains("cache_tracker"),
            Spec::Sleep { .. } => self.flags.contains("sleep_used") && self.step_t > 0.2,
            Spec::Drive { x, z } => geom::dist(self.x, self.z, x, z) < 12.0 && self.flags.contains("technical_driven"),
            Spec::Mono => self.flags.contains("monocular_tag"),
            Spec::Ignite(n) => self.flags.contains(ignite_flag(n)),
            Spec::Tanks => self.flags.contains("cells_500") && self.flags.contains("explosion_chain"),
            Spec::Mounted => self.flags.contains("mounted_gun"),
            Spec::Panic => self.flags.contains("enemy_panicked"),
            Spec::Animals => self.flags.contains("animals_fled"),
            Spec::Bus { x, z } => self.flags.contains("bus_taken") && geom::dist(self.x, self.z, x, z) < 12.0,
            Spec::Night => {
                if self.hour() > 20.0 && geom::dist(self.x, self.z, self.step_x, self.step_z) > 1.5 {
                    self.mark("night_contract");
                }
                self.flags.contains("night_contract")
            }
            Spec::Boat => self.flags.contains("boat_driven"),
            Spec::Stealth => self.flags.contains("stealth_kill"),
            Spec::Dart => self.flags.contains("dart_kill"),
            Spec::Repair => self.flags.contains("repair_done"),
            Spec::Rain => self.flags.contains("rain_extinguished"),
            Spec::Better => self.flags.contains("better_way"),
            Spec::Patch => self.flags.contains("companion_patched"),
            Spec::Overdose => self.flags.contains("companion_overdosed"),
            Spec::Die => self.flags.contains("companion_died"),
            Spec::Tape => self.flags.contains("tape_played"),
            Spec::Ceasefire => self.flags.contains("ceasefire_ended"),
            Spec::Convoy => self.bodies.iter().filter(|b| b.kind == 6).all(|b| !b.alive) && !self.bodies.is_empty(),
            Spec::Town => {
                if self.town_burning() {
                    self.mark("town_burned");
                }
                self.flags.contains("town_burned")
            }
            Spec::Ending(_) => self.finale.is_some_and(|n| self.flags.contains(ending_flag(n))),
            Spec::Flag(s) => self.flags.contains(s),
        }
    }

    fn bot_spec(&self, spec: Spec) -> InputFrame {
        let mut f = InputFrame::default();
        match spec {
            Spec::Map => {
                f.held = buttons::MAP;
                f.pressed = buttons::MAP;
            }
            Spec::Way | Spec::Claim | Spec::Shop | Spec::Locker | Spec::Loot | Spec::Tape => {
                f.act = 1;
                f.pressed = buttons::INTERACT;
                f.held = buttons::INTERACT;
            }
            Spec::Reach { x, z, .. } => return self.bot_go(x, z, true),
            Spec::Tracker => {
                let (tx, tz) = self.tracker_cache;
                return self.bot_go(tx, tz, true);
            }
            Spec::Pill => {
                f.held = buttons::PILLS;
                f.pressed = buttons::PILLS;
            }
            Spec::Fight | Spec::Ceasefire | Spec::Convoy => {
                if let Some(b) = self.bodies.iter().find(|b| b.alive && b.kind != 3) {
                    return self.bot_aim(b.x, b.z, 1.7, true);
                }
                f.held = buttons::PRIMARY;
            }
            Spec::EnemyJam | Spec::Blackout | Spec::Fever | Spec::Die => {}
            Spec::Jam | Spec::Break => {
                if self.gun().jammed {
                    f.pressed = buttons::RELOAD;
                    f.held = buttons::RELOAD;
                } else {
                    f.held = buttons::PRIMARY | buttons::SECONDARY;
                    f.pressed = buttons::PRIMARY;
                }
            }
            Spec::Rescue => {}
            Spec::Wound(_) => {
                f.held = buttons::HEAL;
                f.pressed = buttons::HEAL;
            }
            Spec::Syrette => {
                f.pressed = buttons::HEAL;
                f.held = buttons::HEAL;
            }
            Spec::Sleep { .. } => {
                let (hx, hz) = geom::nearest_safe(self.x, self.z);
                if geom::dist(self.x, self.z, hx, hz) > 8.0 && self.ride.seat == 0 {
                    return self.bot_go(hx, hz, true);
                }
                if self.ride.seat != 0 {
                    f.pressed = buttons::USE;
                } else {
                    f.held = buttons::INTERACT;
                    f.pressed = buttons::INTERACT;
                }
            }
            Spec::Drive { x, z } => {
                if self.ride.seat == 0 {
                    let d = geom::dist(self.x, self.z, self.ride.x, self.ride.z);
                    if self.ride.kind != 0 && d > 5.0 {
                        return self.bot_go(self.ride.x, self.ride.z, true);
                    }
                    f.pressed = buttons::USE;
                    return f;
                }
                return self.bot_drive(x, z);
            }
            Spec::Bus { .. } => {
                let (tx, tz) = geom::place("Junction");
                if self.ride.seat == 0 {
                    let d = geom::dist(self.x, self.z, self.ride.x, self.ride.z);
                    if self.ride.kind != 0 && d > 5.0 {
                        return self.bot_go(self.ride.x, self.ride.z, true);
                    }
                    f.pressed = buttons::USE;
                    return f;
                }
                return self.bot_drive(tx, tz);
            }
            Spec::Mono => {
                if let Some(b) = self.bodies.iter().find(|b| b.alive) {
                    let mut aim = self.bot_aim(b.x, b.z, 1.6, false);
                    aim.held |= buttons::MONOCULAR;
                    aim.pressed |= buttons::MONOCULAR;
                    return aim;
                }
            }
            Spec::Ignite(k) => return self.bot_ignite(k),
            Spec::Tanks => {
                let g = self.gun();
                if g.ammo == 0 || g.jammed {
                    f.pressed = buttons::RELOAD;
                    f.held = buttons::RELOAD;
                    return f;
                }
                let nearest = self
                    .bodies
                    .iter()
                    .filter(|b| b.alive && b.kind == 5)
                    .min_by(|a, b| {
                        geom::dist(self.x, self.z, a.x, a.z).total_cmp(&geom::dist(self.x, self.z, b.x, b.z))
                    });
                if let Some(b) = nearest {
                    return self.bot_aim(b.x, b.z, 1.15, true);
                }
            }
            Spec::Mounted => {
                if self.ride.seat != 2 {
                    if self.ride.seat == 0 {
                        let d = geom::dist(self.x, self.z, self.ride.x, self.ride.z);
                        if self.ride.kind != 0 && d > 5.0 {
                            return self.bot_go(self.ride.x, self.ride.z, true);
                        }
                    }
                    f.pressed = buttons::USE;
                }
                f.held = buttons::PRIMARY;
                f.pressed |= buttons::PRIMARY;
            }
            Spec::Animals => {
                // A shot already happened. Firing again drops the herd before it clears the grass.
                f.held = buttons::SECONDARY;
            }
            Spec::Panic => {}
            Spec::Boat => return self.bot_boat(),
            Spec::Night => {
                f.move_dir.y = 1.0;
                if self.stamina > 1.0 {
                    f.held |= buttons::FOCUS;
                }
            }
            Spec::Town => return self.bot_town(),
            Spec::Ending(_) => return self.bot_ending(),
            Spec::Stealth => {
                f.held = buttons::CROUCH | buttons::MELEE;
                f.pressed = buttons::MELEE;
            }
            Spec::Dart => {
                if let Some(b) = self.bodies.iter().find(|b| b.alive) {
                    return self.bot_aim(b.x, b.z, 1.2, true);
                }
            }
            Spec::Repair | Spec::Patch | Spec::Overdose => {
                f.held = buttons::INTERACT;
                f.pressed = buttons::INTERACT;
            }
            Spec::Better => {
                if self.ride.seat != 0 {
                    f.pressed = buttons::USE;
                    return f;
                }
                if let Some(c) = self.companions.iter().find(|c| c.alive && !c.down) {
                    if geom::dist(self.x, self.z, c.x, c.z) > 2.2 {
                        return self.bot_go(c.x, c.z, true);
                    }
                }
                f.pressed = buttons::INTERACT;
            }
            Spec::Rain | Spec::Flag(_) => {
                f.pressed = buttons::INTERACT;
            }
            _ => {}
        }
        let _ = shell::glyph("confirm", self.device, self.xbox);
        f
    }

    fn bot_go(&self, tx: f32, tz: f32, sprint: bool) -> InputFrame {
        let desired = geom::yaw_toward(self.x, self.z, tx, tz);
        let err = geom::wrap_angle(desired - self.yaw);
        let mut f = InputFrame::default();
        f.look.x = err.clamp(-1.4, 1.4);
        if err.abs() < 0.4 {
            f.move_dir.y = 1.0;
            if sprint && self.stamina > 1.0 {
                f.held |= buttons::FOCUS;
            }
        }
        f
    }

    fn bot_drive(&self, tx: f32, tz: f32) -> InputFrame {
        let desired = geom::yaw_toward(self.ride.x, self.ride.z, tx, tz);
        let err = geom::wrap_angle(desired - self.ride.yaw);
        let mut f = InputFrame::default();
        f.axes.x = err.clamp(-1.0, 1.0);
        // The outboard stops dead once it leaves the deep channel, so turn before opening up.
        if self.ride.kind == 2 && err.abs() > 0.4 {
            f.axes.y = 0.05;
        } else {
            f.axes.y = 1.0;
        }
        f
    }

    fn bot_aim(&self, tx: f32, tz: f32, ty: f32, fire: bool) -> InputFrame {
        let dx = tx - self.x;
        let dz = tz - self.z;
        let dist = (dx * dx + dz * dz).sqrt().max(0.2);
        let desired = dx.atan2(-dz);
        let err = geom::wrap_angle(desired - self.yaw);
        let perr = ((ty - self.eye) / dist).atan() - self.pitch;
        let mut f = InputFrame::default();
        f.look.x = err.clamp(-1.5, 1.5);
        f.look.y = perr.clamp(-1.2, 1.2);
        if fire && err.abs() < 0.2 && perr.abs() < 0.2 {
            f.held |= buttons::PRIMARY | buttons::SECONDARY;
            f.pressed |= buttons::PRIMARY;
        }
        f
    }

    fn bot_ledger(&self) -> InputFrame {
        let want = match self.route {
            Route::Read => 1usize,
            Route::Chair => 2,
            _ => 0,
        };
        let mut f = InputFrame::default();
        if self.focus != want {
            f.act = if self.focus < want { 4 } else { 3 };
        } else {
            f.act = 1;
            f.pressed = buttons::CONFIRM;
        }
        f
    }

    fn bot_boat(&self) -> InputFrame {
        if self.ride.seat == 0 {
            let d = geom::dist(self.x, self.z, self.ride.x, self.ride.z);
            if d > 5.0 {
                return self.bot_go(self.ride.x, self.ride.z, true);
            }
            let mut f = InputFrame::default();
            f.pressed = buttons::USE;
            return f;
        }
        let (tx, tz) = geom::water_ahead(self.ride.x, self.ride.z, 40.0);
        self.bot_drive(tx, tz)
    }

    fn bot_town(&self) -> InputFrame {
        if self.ride.seat != 0 {
            let mut f = InputFrame::default();
            f.pressed = buttons::USE;
            return f;
        }
        let (tx, tz) = (18.0, 424.0);
        if geom::dist(self.x, self.z, tx, tz) > 2.5 {
            return self.bot_go(tx, tz, true);
        }
        self.bot_ground_shot()
    }

    fn bot_ending(&self) -> InputFrame {
        match self.finale {
            Some(1) => {
                let mut f = InputFrame::default();
                f.held = buttons::CROUCH;
                f
            }
            Some(2) => {
                let mut f = InputFrame::default();
                f.held = buttons::INTERACT;
                f.pressed = buttons::INTERACT;
                f
            }
            _ => self.bot_ground_shot(),
        }
    }

    fn bot_ignite(&self, k: u8) -> InputFrame {
        if k == 11 {
            if self.ride.seat != 0 {
                let mut f = InputFrame::default();
                f.pressed = buttons::USE;
                return f;
            }
            if self.cell_open(self.x, self.z) {
                let mut f = InputFrame::default();
                f.held = buttons::INTERACT;
                f.pressed = buttons::INTERACT;
                return f;
            }
            if let Some((px, pz)) = self.nearest_open_cell(self.x, self.z) {
                return self.bot_go(px, pz, true);
            }
            return self.bot_go(self.step_x + 16.0, self.step_z + 12.0, true);
        }
        if k == 6 {
            if let Some(b) = self.bodies.iter().find(|b| b.alive && b.kind == 5) {
                return self.bot_aim(b.x, b.z, 1.15, true);
            }
        }
        if k == 8 {
            let nearest = self.bodies.iter().filter(|b| b.alive && b.kind == 1).min_by(|a, b| {
                geom::dist(self.x, self.z, a.x, a.z).total_cmp(&geom::dist(self.x, self.z, b.x, b.z))
            });
            if let Some(b) = nearest {
                return self.bot_aim(b.x, b.z, 1.2, true);
            }
        }
        self.bot_ground_shot()
    }

    fn bot_ground_shot(&self) -> InputFrame {
        let mut f = InputFrame::default();
        let (want_yaw, want_pitch) = match self.current() {
            Some(Spec::Ignite(k)) => (k as f32 * 0.55, -0.16),
            Some(Spec::Town) => (0.0, -0.55),
            _ => (self.yaw, -0.22),
        };
        let yerr = geom::wrap_angle(want_yaw - self.yaw);
        let perr = want_pitch - self.pitch;
        f.look.x = yerr.clamp(-1.2, 1.2);
        f.look.y = perr.clamp(-0.4, 0.4);
        if yerr.abs() < 0.12 && perr.abs() < 0.08 {
            if self.guns.is_empty() || self.gun().ammo == 0 {
                f.pressed |= buttons::RELOAD;
            } else {
                f.held |= buttons::PRIMARY;
                f.pressed |= buttons::PRIMARY;
            }
        }
        f
    }

    pub fn start_playing(&mut self) {
        self.screen = Screen::Playing;
        let (x, z) = geom::place("Airstrip");
        self.x = x;
        self.z = z;
        self.yaw = 0.0;
        self.eye = 1.58;
        self.idle = 0.0;
        self.pitch = 0.08;
    }

    fn simulate(&mut self, input: &InputFrame, dt: f32) {
        self.yaw = geom::wrap_angle(self.yaw + input.look.x);
        self.pitch = (self.pitch + input.look.y).clamp(-1.15, 1.15);
        if self.fever_state == 2 {
            self.roll = (self.minutes * 2.0).sin() * 0.05 * self.tune.fever_severity;
        } else {
            self.roll *= 0.9;
        }
        if input.down(buttons::CRAWL) {
            self.stance = 2;
        } else if input.down(buttons::CROUCH) {
            self.stance = 1;
        } else if !self.treating {
            self.stance = 0;
        }
        let target_eye = match self.stance {
            2 => 0.42,
            1 => 1.02,
            _ => 1.58,
        };
        let k = 1.0 - (-dt / 0.12).exp();
        if !self.dev.noclip {
            self.eye += (target_eye - self.eye) * k;
        }

        if input.down(buttons::MAP) {
            self.map_t += dt;
            if self.map_t > 0.35 {
                self.mark("map_raised");
            }
        } else {
            self.map_t = (self.map_t - dt * 2.0).max(0.0);
        }
        if self.flags.contains("map_raised") && (input.just(buttons::INTERACT) || input.act == 1) && self.waypoint.is_none() {
            self.waypoint = Some((0.0, 460.0));
            self.mark("waypoint_set");
        }
        if input.down(buttons::MONOCULAR) {
            self.mono_t += dt;
            if self.mono_t > 0.5 && self.bodies.iter().any(|b| b.alive && geom::dist(self.x, self.z, b.x, b.z) < 80.0) {
                self.mark("monocular_tag");
            }
        } else {
            self.mono_t = 0.0;
        }

        self.move_body(input, dt);
        self.use_vehicle(input, dt);
        self.handle_items(input, dt);
        self.handle_gun(input, dt);
        self.update_bodies(dt);
        self.update_fever(dt);
        self.update_rescue(dt);
        let rain = self.weather == 1;
        let wind = self.wind * self.tune.wind_strength;
        let out = self.fire.tick(dt, wind, self.tune.fire_spread, self.tune.burn_time, self.minutes, rain, &mut self.rng);
        if out > 0 {
            self.mark("rain_extinguished");
            self.weather = 0;
        }
        if self.fire.burned >= 500 {
            self.mark("cells_500");
        }
        self.special_actions(input, dt);
        if self.hp > 20.0 && self.hp < 100.0 && self.rescue_t <= 0.0 && !self.dev.god {
            self.hp = (self.hp + 8.0 * dt).min(100.0);
        }
        if self.dev.god {
            self.hp = 100.0;
        }
    }

    fn move_body(&mut self, input: &InputFrame, dt: f32) {
        if self.dev.noclip {
            let (sy, cy) = self.yaw.sin_cos();
            let fwd = Vec2::new(sy, -cy);
            let right = Vec2::new(cy, sy);
            let wish = right * input.move_dir.x + fwd * input.move_dir.y;
            if wish.length_squared() > 1e-6 {
                let n = wish.normalize();
                self.x += n.x * 24.0 * dt;
                self.z += n.y * 24.0 * dt;
            }
            self.eye = (self.eye + input.look.y * 24.0 * dt).clamp(0.2, 80.0);
            return;
        }
        if self.ride.seat != 0 || self.rescue_t > 0.0 || self.treating {
            return;
        }
        let (sy, cy) = self.yaw.sin_cos();
        let fwd = Vec2::new(sy, -cy);
        let right = Vec2::new(cy, sy);
        let wish = right * input.move_dir.x + fwd * input.move_dir.y;
        let sprint = input.down(buttons::FOCUS) && self.stamina > 0.0 && self.stance == 0;
        let mut speed = if input.down(buttons::SECONDARY) { 3.0 } else { 4.6 };
        if sprint {
            speed = 7.0;
            self.stamina = (self.stamina - dt).max(0.0);
        } else if !input.down(buttons::FOCUS) {
            self.stamina = (self.stamina + dt * 2.0).min(12.0);
        }
        speed *= match self.stance {
            1 => 0.55,
            2 => 0.28,
            _ => 1.0,
        };
        if self.fever_state == 2 {
            speed *= 0.75;
        }
        speed *= self.tune.player_speed;
        let diff = match self.difficulty {
            0 => 1.05,
            2 => 0.95,
            _ => 1.0,
        };
        speed *= diff;
        if wish.length_squared() > 1e-6 {
            let n = wish.normalize();
            self.x += n.x * speed * dt;
            self.z += n.y * speed * dt;
        }
        let (x, z) = geom::clamp_map(self.x, self.z);
        self.x = x;
        self.z = z;
    }

    fn use_vehicle(&mut self, input: &InputFrame, dt: f32) {
        if self.dev.noclip {
            return;
        }
        if input.just(buttons::USE) && self.ride.kind != 0 {
            let near = geom::dist(self.x, self.z, self.ride.x, self.ride.z) < 6.0;
            if self.ride.seat != 0 || near {
                self.ride.seat = (self.ride.seat + 1) % 3;
            }
            if self.ride.seat == 2 {
                // gunner
            }
        }
        if self.ride.seat == 0 {
            if self.ride.kind != 0 && geom::dist(self.x, self.z, self.ride.x, self.ride.z) < 5.0 && input.down(buttons::INTERACT) {
                self.ride.repair += dt;
                if self.ride.repair >= 6.0 && self.ride.health < 70.0 {
                    self.ride.health = 70.0;
                    self.ride.stage = 1;
                    self.ride.fuse = 0.0;
                    self.ride.repair = 0.0;
                    self.mark("repair_done");
                }
            }
            return;
        }
        let steer = input.axes.x;
        self.ride.yaw = geom::wrap_angle(self.ride.yaw + steer * dt * 1.6);
        let mut max_s = 16.0 * self.tune.vehicle_speed;
        if self.ride.stage == 2 {
            max_s *= 0.6;
        }
        if self.ride.stage >= 3 {
            max_s *= 0.2;
        }
        if self.ride.kind == 2 && !geom::deep_water(self.ride.x, self.ride.z) {
            max_s = 0.0;
        }
        let throttle = input.axes.y;
        self.ride.speed += (throttle.clamp(-0.4, 1.0) * max_s - self.ride.speed) * (dt * 2.5).min(1.0);
        let (sy, cy) = self.ride.yaw.sin_cos();
        let before = (self.ride.x, self.ride.z);
        self.ride.x += sy * self.ride.speed * dt;
        self.ride.z += -cy * self.ride.speed * dt;
        let (x, z) = geom::clamp_map(self.ride.x, self.ride.z);
        self.ride.x = x;
        self.ride.z = z;
        self.ride.dist += geom::dist(before.0, before.1, self.ride.x, self.ride.z);
        let h = geom::height(self.ride.x, self.ride.z);
        let h2 = geom::height(self.ride.x + sy * 2.0, self.ride.z - cy * 2.0);
        self.ride.pitch = (h2 - h).atan();
        if self.ride.roll.abs() > 0.02 {
            self.ride.roll *= (1.0 - dt * 3.0).clamp(0.0, 1.0);
        }
        self.x = self.ride.x;
        self.z = self.ride.z;
        if self.ride.kind == 1 && self.ride.dist > 20.0 {
            self.mark("technical_driven");
        }
        if self.ride.kind == 2 && self.ride.dist > 15.0 && geom::deep_water(self.ride.x, self.ride.z) {
            self.mark("boat_driven");
            self.boat_dist = self.ride.dist;
        }
        if self.ride.seat == 2 && input.down(buttons::PRIMARY) {
            self.mark("mounted_gun");
        }
        if self.ride.stage == 3 {
            self.ride.fuse -= dt;
            if self.ride.fuse <= 0.0 {
                self.ride.stage = 4;
                self.ride.health = 0.0;
                let _ = self.fire.ignite_disk(self.ride.x, self.ride.z, 6.0, self.tune.burn_time, self.minutes);
                self.mark("ignite_vehicle");
            }
        }
        if self.ride.npc {
            let points = [(0.0, 800.0), (0.0, 400.0), (0.0, 0.0), (0.0, -400.0)];
            let target = points[self.ride.npc_i % points.len()];
            if geom::dist(self.ride.x, self.ride.z, target.0, target.1) < 8.0 {
                self.ride.npc_i += 1;
            }
            let desired = geom::yaw_toward(self.ride.x, self.ride.z, target.0, target.1);
            let err = geom::wrap_angle(desired - self.ride.yaw);
            self.ride.yaw = geom::wrap_angle(self.ride.yaw + err.clamp(-1.0, 1.0) * dt * 2.0);
            self.ride.speed = 10.0;
        }
    }

    pub fn hurt_vehicle(&mut self, dmg: f32) {
        if self.ride.kind == 0 || self.ride.stage == 4 {
            return;
        }
        self.ride.health -= dmg / self.tune.vehicle_tough.max(0.2);
        if self.ride.health > 70.0 {
            self.ride.stage = 0;
        } else if self.ride.health > 40.0 {
            self.ride.stage = 1;
        } else if self.ride.health > 15.0 {
            self.ride.stage = 2;
        } else if self.ride.health > 0.0 {
            if self.ride.stage < 3 {
                self.ride.fuse = 8.0;
            }
            self.ride.stage = 3;
        } else {
            self.ride.stage = 4;
        }
    }

    fn handle_items(&mut self, input: &InputFrame, dt: f32) {
        if input.just(buttons::HEAL) && self.hp >= 20.0 && self.hp < 100.0 && self.syrettes > 0 && self.syrette_t <= 0.0 {
            self.syrettes -= 1;
            self.syrette_t = 1.5;
        }
        if self.syrette_t > 0.0 {
            let step = dt.min(self.syrette_t);
            self.hp = (self.hp + self.tune.syrette_heal / 1.5 * step).min(100.0);
            self.syrette_t -= step;
            if self.syrette_t <= 0.0 {
                self.syrette_t = 0.0;
                self.mark("syrette");
            }
        }
        if self.hp < 20.0 && self.hp > 0.0 && input.down(buttons::HEAL) {
            self.treating = true;
            self.heal_t += dt;
            if self.heal_t >= 4.0 {
                self.hp = 40.0;
                self.heal_t = 0.0;
                self.treating = false;
                self.mark(wound_flag(self.wound.max(1)));
                self.wound = 0;
            }
        } else if self.hp >= 20.0 {
            self.treating = false;
            self.heal_t = 0.0;
        }
        if self.fever_state > 0 && input.down(buttons::PILLS) && self.pills > 0 {
            self.pill_t += dt;
            if self.pill_t >= 2.5 {
                self.pills -= 1;
                self.pill_t = 0.0;
                self.fever_state = 0;
                self.fever_t = 0.0;
                self.fever_attack = 0.0;
                self.mark("pill_taken");
            }
        } else {
            self.pill_t = 0.0;
        }
    }

    fn handle_gun(&mut self, input: &InputFrame, dt: f32) {
        if self.guns.is_empty() {
            return;
        }
        if input.just(buttons::NEXT) {
            self.slot = (self.slot + 1) % self.guns.len();
        }
        let infinite = self.dev.infinite;
        let no_jams = self.dev.no_jams;
        let i = self.slot.min(self.guns.len() - 1);
        {
            let g = &mut self.guns[i];
            if input.just(buttons::RELOAD) {
                g.tap_reload();
            }
            g.tick_clear(dt);
            if infinite {
                g.ammo = g.ammo.max(30);
            }
            if no_jams {
                g.jammed = false;
                g.force_jam = false;
            }
        }
        if self.guns[i].jammed {
            self.jam_seen = true;
        } else if self.jam_seen {
            self.mark("jam_cleared");
        }
        let holster = self.ceasefire && geom::in_town(self.x, self.z);
        let want = input.down(buttons::PRIMARY) && !self.treating && !holster && self.rescue_t <= 0.0;
        if !want {
            return;
        }
        let ads = input.down(buttons::SECONDARY);
        let jam = self.tune.jam_chance;
        let wear = self.tune.weapon_wear;
        let br = self.tune.break_threshold;
        let pull = self.guns[i].pull(&mut self.rng, jam, wear, br);
        if pull != Pull::Fired && pull != Pull::Broke {
            return;
        }
        self.resolve_shot(ads);
        if pull == Pull::Broke {
            self.mark("weapon_broke");
        }
    }

    pub fn resolve_shot(&mut self, ads: bool) {
        let st = gun::stats(self.gun().id);
        let spread = 0.02 * gun::spread_mul(self.gun().condition) * if ads { 0.25 } else { 1.0 };
        let jitter = (self.rng.f32() - 0.5) * spread;
        let yaw = self.yaw + jitter;
        let pitch = self.pitch + jitter * 0.5;
        let (sy, cy) = yaw.sin_cos();
        let (sp, cp) = pitch.sin_cos();
        let dir = (sy * cp, sp, -cy * cp);
        let origin = (self.x, self.eye, self.z);
        self.shots_tick(origin, dir, st.damage * self.tune.player_damage, st.range, st.noise, st.ignites, st.silent, self.gun().id, self.gun().shots);
    }

    fn shots_tick(&mut self, origin: (f32, f32, f32), dir: (f32, f32, f32), damage: f32, range: f32, noise: f32, ignites: bool, silent: bool, id: WeaponId, shot_n: u32) {
        let mut best_t = range;
        let mut best_zone = 0u8;
        let mut best_i: Option<usize> = None;
        let mut blocked = false;
        for w in &self.walls {
            if let Some(t) = ray_aabb(origin, dir, w.min, w.max) {
                if t < best_t {
                    best_t = t;
                    blocked = true;
                    best_i = None;
                }
            }
        }
        if !blocked {
            for (i, b) in self.bodies.iter().enumerate() {
                if !b.alive {
                    continue;
                }
                let zones = [(1.70, 0.18, 3u8), (1.15, 0.28, 1u8), (0.45, 0.20, 2u8)];
                for (y, r, zone) in zones {
                    if let Some(t) = ray_sphere(origin, dir, (b.x, y, b.z), r) {
                        if t < best_t {
                            best_t = t;
                            best_zone = zone;
                            best_i = Some(i);
                        }
                    }
                }
            }
        }
        let hit_x = origin.0 + dir.0 * best_t;
        let hit_z = origin.2 + dir.2 * best_t;
        if let Some(i) = best_i {
            let mul = match best_zone {
                3 => 3.0,
                2 => 0.6,
                _ => 1.0,
            };
            let dmg = damage * mul;
            let kind = self.bodies[i].kind;
            let in_town = geom::in_town(self.bodies[i].x, self.bodies[i].z);
            if self.ceasefire && in_town && kind == 2 {
                // Civilians are safe while the ceasefire holds.
            } else if id == WeaponId::Dart {
                self.bodies[i].poison = 3.0;
            } else {
                self.bodies[i].hp -= dmg;
                if ignites && matches!(self.current(), Some(Spec::Ignite(8))) && kind == 1 {
                    self.mark("ignite_person");
                }
                if self.bodies[i].hp <= 0.0 {
                    self.bodies[i].alive = false;
                    if kind == 1 && self.stance == 1 && silent {
                        self.mark("stealth_kill");
                    }
                    if kind == 5 && matches!(self.current(), Some(Spec::Ignite(6))) {
                        let bx = self.bodies[i].x;
                        let bz = self.bodies[i].z;
                        let _ = self.fire.ignite_disk(bx, bz, 5.0, self.tune.burn_time, self.minutes);
                        self.mark("ignite_barrel");
                    }
                    if kind == 5 && matches!(self.current(), Some(Spec::Tanks)) {
                        self.chain_tanks(i);
                    }
                    if matches!(self.current(), Some(Spec::Ceasefire)) {
                        self.ceasefire = false;
                        self.mark("ceasefire_ended");
                    }
                }
            }
        }
        let weapon_lights = ignites
            || matches!(id, WeaponId::Flare | WeaponId::Rpg | WeaponId::Flamer | WeaponId::Mortar | WeaponId::Molotov | WeaponId::Frag);
        if weapon_lights && self.fire.ignite_at(hit_x, hit_z, self.tune.burn_time, self.minutes) {
            self.note_weapon_ignite(id);
            if self.finale == Some(0) && matches!(self.current(), Some(Spec::Ending(_))) {
                self.mark("ending_burn");
            }
        }
        if matches!(self.current(), Some(Spec::Ignite(9))) && self.fire.ignite_at(hit_x, hit_z, self.tune.burn_time, self.minutes) {
            self.mark("ignite_lightning");
        }
        if matches!(self.current(), Some(Spec::Ignite(7))) && self.ride.kind != 0 {
            // The round starts at the eye. Score the closest point on that ray, not the far hit.
            let rel_x = self.ride.x - origin.0;
            let rel_z = self.ride.z - origin.2;
            let along = rel_x * dir.0 + rel_z * dir.2;
            let t = along.clamp(0.0, best_t);
            let cx = origin.0 + dir.0 * t;
            let cz = origin.2 + dir.2 * t;
            if geom::dist(cx, cz, self.ride.x, self.ride.z) < 4.0 {
                self.hurt_vehicle(damage.max(40.0));
                if self.ride.stage >= 3 {
                    let _ = self.fire.ignite_disk(self.ride.x, self.ride.z, 5.0, self.tune.burn_time, self.minutes);
                    self.mark("ignite_vehicle");
                    self.ride.health = 100.0;
                    self.ride.stage = 0;
                    self.ride.fuse = 0.0;
                }
            }
        }
        // Tracers: every third round. The coverage flag is earned on the tracer step.
        // Other play still lights grass one time in four, without stamping that flag early.
        let tracer_step = matches!(self.current(), Some(Spec::Ignite(10)));
        if tracer_step && shot_n > 0 && shot_n % 3 == 0 {
            for k in 0..8 {
                let ox = hit_x + shot_n as f32 + k as f32 * 3.0;
                let oz = hit_z + 6.0 + k as f32 * 2.0;
                if self.fire.ignite_at(ox, oz, self.tune.burn_time, self.minutes) {
                    self.mark("ignite_tracer");
                    break;
                }
            }
        } else if shot_n > 0 && shot_n % 3 == 0 && self.rng.f32() < 0.25 {
            let _ = self.fire.ignite_at(hit_x, hit_z, self.tune.burn_time, self.minutes);
        }
        if !silent {
            for b in &mut self.bodies {
                if b.alive && b.alert == 0 && geom::dist(self.x, self.z, b.x, b.z) < noise {
                    b.alert = 1;
                }
            }
        }
        let _ = noise;
    }

    fn update_bodies(&mut self, dt: f32) {
        let px = self.x;
        let pz = self.z;
        let stance = self.stance;
        let night = self.hour() < 5.0 || self.hour() > 20.0;
        let light = if night { 0.45 } else { 1.0 };
        let n = self.bodies.len();
        let dead_soldiers = self.bodies.iter().filter(|b| b.kind == 1 && !b.alive).count();
        let live_soldiers = self.bodies.iter().filter(|b| b.kind == 1 && b.alive).count();
        let morale_broken = dead_soldiers >= 2 && live_soldiers > 0 && live_soldiers <= dead_soldiers;
        let mut shooters = 0u32;
        for i in 0..n {
            if !self.bodies[i].alive {
                continue;
            }
            if self.bodies[i].poison > 0.0 {
                self.bodies[i].poison -= dt;
                if self.bodies[i].poison <= 0.0 && self.bodies[i].hp > 0.0 {
                    self.bodies[i].hp = 0.0;
                    self.bodies[i].alive = false;
                    self.mark("dart_kill");
                    continue;
                }
            }
            if self.bodies[i].kind == 3 {
                let d0 = geom::dist(px, pz, self.bodies[i].x, self.bodies[i].z);
                if d0 < 40.0 && self.guns.first().map(|g| g.shots > 0).unwrap_or(false) {
                    let dx = self.bodies[i].x - px;
                    let dz = self.bodies[i].z - pz;
                    let len = (dx * dx + dz * dz).sqrt().max(0.1);
                    self.bodies[i].x += dx / len * 6.0 * dt;
                    self.bodies[i].z += dz / len * 6.0 * dt;
                    self.bodies[i].flee += 6.0 * dt;
                    if self.bodies[i].flee > 8.0 {
                        self.mark("animals_fled");
                    }
                }
                continue;
            }
            if self.bodies[i].kind == 5 || self.bodies[i].kind == 6 {
                continue;
            }
            let crouched = stance == 1;
            let grass = grass_factor(px, pz, crouched);
            let posture = match stance {
                2 => 0.3,
                1 => 0.6,
                _ => 1.0,
            };
            let motion = 0.5;
            let rate = exposure(posture, grass, light, motion) * self.tune.detection;
            let dist = geom::dist(px, pz, self.bodies[i].x, self.bodies[i].z).max(1.0);
            let falloff = (30.0 / dist).clamp(0.0, 1.5);
            let (mx, mz) = ((px + self.bodies[i].x) * 0.5, (pz + self.bodies[i].z) * 0.5);
            let smoked = self.fire.cells.get(&geom::cell_of(mx, mz)).is_some_and(|c| c.burning);
            if morale_broken && self.bodies[i].kind == 1 {
                self.bodies[i].x += 5.0 * dt;
                self.bodies[i].flee += 5.0 * dt;
                self.bodies[i].alert = 3;
                continue;
            }
            if !self.dev.invisible && !smoked && self.bodies[i].alert < 2 {
                self.bodies[i].see += rate * falloff * dt;
                if self.bodies[i].see > 1.0 {
                    self.bodies[i].alert = 2;
                }
            }
            // Fire under an enemy makes them run.
            let (cx, cz) = (self.bodies[i].x, self.bodies[i].z);
            let cell = geom::cell_of(cx, cz);
            if self.fire.cells.get(&cell).map(|c| c.burning).unwrap_or(false) {
                self.bodies[i].alert = 4;
                self.bodies[i].x += 4.0 * dt;
                self.bodies[i].flee += 4.0 * dt;
                if self.bodies[i].flee > 3.0 {
                    self.mark("enemy_panicked");
                }
            }
            if self.bodies[i].kind == 1 && self.bodies[i].alert >= 1 && !self.bodies[i].gun.jammed {
                if shooters >= 4 {
                    // One extra soldier peels off to the side instead of adding a fifth gun.
                    self.bodies[i].x += 3.0 * dt;
                    self.bodies[i].z += 1.5 * dt;
                    continue;
                }
                shooters += 1;
                let gpull = {
                    let jam = self.tune.jam_chance;
                    let wear = self.tune.weapon_wear;
                    let br = self.tune.break_threshold;
                    self.bodies[i].gun.pull(&mut self.rng, jam, wear, br)
                };
                if gpull == Pull::Jammed {
                    self.mark("enemy_jam");
                }
                if gpull == Pull::Fired && self.rng.f32() < self.tune.enemy_accuracy * 0.15 {
                    let diff = match self.difficulty {
                        0 => 0.7,
                        2 => 1.3,
                        _ => 1.0,
                    };
                    if !self.dev.god && self.rescue_t <= 0.0 {
                        self.hp -= self.tune.enemy_damage * 0.15 * diff * dt.max(0.05) * 10.0;
                    }
                }
            }
            self.bodies[i].gun.tick_clear(dt);
            if self.bodies[i].hp <= 0.0 {
                self.bodies[i].alive = false;
            }
        }
    }

    fn update_fever(&mut self, dt: f32) {
        if self.dev.no_fever {
            return;
        }
        if self.fever_state == 0 {
            self.fever_t += dt;
            if self.fever_t >= self.tune.fever_interval {
                self.fever_state = 1;
                self.fever_warn = 0.0;
                self.mark("fever_warned");
            }
        } else if self.fever_state == 1 {
            self.fever_warn += dt;
            if self.fever_warn >= 40.0 {
                self.fever_state = 2;
                self.fever_attack = 0.0;
            }
        } else if self.fever_state == 2 {
            self.fever_attack += dt;
            if self.fever_attack >= 60.0 && self.pills == 0 {
                self.blackout();
            }
        }
    }

    fn blackout(&mut self) {
        let (sx, sz) = geom::nearest_safe(self.x, self.z);
        self.x = sx;
        self.z = sz;
        self.hp = 50.0;
        self.diamonds = (self.diamonds as f32 * 0.8).floor() as u32;
        self.fever_state = 0;
        self.fever_t = 0.0;
        self.fever_attack = 0.0;
        self.minutes += 6.0 * 60.0;
        self.mark("blackout");
    }

    fn update_rescue(&mut self, dt: f32) {
        if self.hp <= 0.0 && self.rescue_t <= 0.0 && !self.companions.iter().any(|c| c.rescue_spent) {
            if let Some(c) = self.companions.iter_mut().find(|c| c.alive && !c.down) {
                c.rescue_spent = true;
                self.rescue_t = 3.0;
                self.hp = 1.0;
            }
        }
        if self.rescue_t > 0.0 {
            self.rescue_t -= dt;
            let (sy, cy) = self.yaw.sin_cos();
            self.x -= sy * dt * 4.0;
            self.z -= -cy * dt * 4.0;
            if self.rescue_t <= 0.0 {
                self.rescue_t = 0.0;
                self.hp = 50.0;
                self.slot = 0;
                self.mark("player_rescued");
            }
        }
    }

    fn special_actions(&mut self, input: &InputFrame, dt: f32) {
        let near_cache = geom::dist(self.x, self.z, self.tracker_cache.0, self.tracker_cache.1);
        if near_cache < 4.0 {
            self.mark("cache_tracker");
        }
        if input.down(buttons::INTERACT) {
            self.hold_t += dt;
        } else {
            self.hold_t = 0.0;
        }
        if input.just(buttons::INTERACT) || (input.down(buttons::INTERACT) && self.hold_t > 0.4) {
            self.try_interact();
        }
        if input.just(buttons::MELEE) {
            let crouched = self.stance == 1;
            let px = self.x;
            let pz = self.z;
            let mut stealth = false;
            for b in &mut self.bodies {
                if b.alive && b.kind == 1 && geom::dist(px, pz, b.x, b.z) < 2.2 {
                    b.hp = 0.0;
                    b.alive = false;
                    if crouched {
                        stealth = true;
                    }
                }
            }
            if stealth {
                self.mark("stealth_kill");
            }
        }
        // Companion down timer.
        for c in &mut self.companions {
            if c.down && c.alive {
                c.down_t += dt;
            }
        }
        if let Some(i) = self.companions.iter().position(|c| c.down && c.alive && c.down_t > 45.0) {
            self.companions[i].alive = false;
            self.companions[i].down = false;
            self.mark("companion_died");
        }
        if input.down(buttons::INTERACT) {
            if let Some(c) = self.companions.iter_mut().find(|c| c.down && c.alive && geom::dist(self.x, self.z, c.x, c.z) < 3.0) {
                if self.hold_t > 3.0 && self.syrettes > 0 && !c.doomed_enough() {
                    // patched below after the borrow... 
                }
            }
        }
        self.patch_or_dose();
        // Scripted igniters that are not shots.
        if self.step_ready {
            if let Some(spec) = self.current() {
                self.script_ignite(spec, input);
            }
        }
    }

    fn patch_or_dose(&mut self) {
        if self.hold_t < 3.0 || self.syrettes == 0 {
            return;
        }
        let doomed = matches!(self.current(), Some(Spec::Overdose));
        let px = self.x;
        let pz = self.z;
        if let Some(i) = self.companions.iter().position(|c| c.down && c.alive && geom::dist(px, pz, c.x, c.z) < 4.0) {
            self.syrettes -= 1;
            if doomed {
                self.companions[i].alive = false;
                self.companions[i].down = false;
                self.mark("companion_overdosed");
            } else {
                self.companions[i].down = false;
                self.companions[i].down_t = 0.0;
                self.mark("companion_patched");
            }
        }
    }

    fn script_ignite(&mut self, spec: Spec, _input: &InputFrame) {
        match spec {
            Spec::Ending(_) => {
                if self.finale == Some(1) && self.step_t >= 180.0 {
                    self.mark("ending_read");
                }
            }
            Spec::Bus { x, z } => {
                let stop = geom::place("Junction");
                if geom::dist(self.x, self.z, stop.0, stop.1) < 14.0 && self.diamonds >= 1 {
                    self.diamonds -= 1;
                    self.x = x;
                    self.z = z;
                    self.ride.seat = 0;
                    self.ride.x = x;
                    self.ride.z = z;
                    self.ride.speed = 0.0;
                    self.minutes += 20.0;
                    self.mark("bus_taken");
                    self.mark("diamonds_spent");
                }
            }
            _ => {}
        }
    }

    fn try_interact(&mut self) {
        if matches!(self.current(), Some(Spec::Ignite(11))) && self.fire.ignite_at(self.x, self.z, self.tune.burn_time, self.minutes) {
            self.mark("ignite_cigarette");
        }
        if matches!(self.current(), Some(Spec::Better)) {
            let px = self.x;
            let pz = self.z;
            let mut took = false;
            let mut gx = px;
            let mut gz = pz;
            if let Some(c) = self.companions.iter_mut().find(|c| c.alive && !c.down && geom::dist(px, pz, c.x, c.z) < 3.2) {
                c.down = true;
                c.down_t = 0.0;
                c.x = px + 1.5;
                c.z = pz;
                gx = c.x;
                gz = c.z;
                took = true;
            }
            if took {
                self.mark("better_way");
                let _ = self.fire.ignite_disk(gx, gz, 3.0, self.tune.burn_time, self.minutes);
            }
        }
        if self.finale == Some(2) && matches!(self.current(), Some(Spec::Ending(_))) {
            self.mark("ending_chair");
        }
        if geom::dist(self.x, self.z, 170.0, 470.0) < 16.0 || geom::dist(self.x, self.z, -260.0, -700.0) < 16.0 || geom::dist(self.x, self.z, 830.0, 255.0) < 16.0
        {
            if self.hold_t > 0.3 && matches!(self.current(), Some(Spec::Claim)) {
                self.mark("safe_house_claimed");
                self.hp = 100.0;
            }
            if self.hold_t > 0.8 && matches!(self.current(), Some(Spec::Sleep { .. })) {
                let hours = match self.current() {
                    Some(Spec::Sleep { hours }) => hours,
                    _ => 8.0,
                };
                self.minutes += hours * 60.0;
                self.hp = 100.0;
                for c in &mut self.companions {
                    c.rescue_spent = false;
                }
                self.yaw = std::f32::consts::PI;
                self.looking_at_post = false;
                self.mark("sleep_used");
                if hours >= 24.0 && self.post_clear {
                    self.post_clear = false;
                    self.mark("post_remanned");
                }
            }
        }
        if matches!(self.current(), Some(Spec::Shop)) {
            let price = 8u32;
            if self.diamonds >= price {
                self.diamonds -= price;
                self.guns.push(Gun::new(WeaponId::Battle));
                self.mark("weapon_bought");
                self.mark("diamonds_spent");
                self.infamy += 1;
            }
        }
        if matches!(self.current(), Some(Spec::Locker)) && self.guns.len() > 1 {
            self.slot = self.guns.len() - 1;
            self.mark("locker_used");
        }
        if matches!(self.current(), Some(Spec::Loot)) && !self.guns.iter().any(|g| g.id == WeaponId::Ar) {
            let mut g = Gun::new(WeaponId::Ar);
            g.condition = 40.0;
            self.guns.push(g);
        }
        if matches!(self.current(), Some(Spec::Tape)) && self.hold_t > 1.5 {
            self.mark("tape_played");
        }
        if matches!(self.current(), Some(Spec::Ceasefire)) {
            self.ceasefire = false;
            self.mark("ceasefire_ended");
        }
    }

    pub fn try_buy(&mut self) -> bool {
        if self.diamonds < 8 {
            return false;
        }
        self.diamonds -= 8;
        self.guns.push(Gun::new(WeaponId::Battle));
        self.mark("weapon_bought");
        self.mark("diamonds_spent");
        true
    }

    fn maybe_reman(&mut self) {
        if !self.post_clear {
            return;
        }
        let (px, pz) = geom::place("Kilo 38");
        let to_x = px - self.x;
        let to_z = pz - self.z;
        let (sy, cy) = self.yaw.sin_cos();
        let fwd = (sy, -cy);
        let len = (to_x * to_x + to_z * to_z).sqrt().max(0.1);
        let dot = (fwd.0 * to_x + fwd.1 * to_z) / len;
        let dist = geom::dist(self.x, self.z, px, pz);
        self.looking_at_post = dot > 0.4 && dist < 180.0;
        if self.minutes >= self.post_reman_at && !self.looking_at_post {
            self.post_clear = false;
            self.mark("post_remanned");
        }
    }

    fn clear_bodies(&mut self) {
        self.bodies.clear();
    }

    fn spawn_soldier(&mut self, x: f32, z: f32, hp: f32, jammy: bool) {
        let mut g = Gun::new(WeaponId::Ar);
        if jammy {
            g.condition = 5.0;
            g.wear = 0.0;
            g.ammo = 400;
            g.reserve = 400;
            // A break roll can win before the jam roll. This set piece is a known bad gun.
            g.force_jam = true;
        }
        self.bodies.push(Body {
            kind: 1,
            x,
            z,
            yaw: 0.0,
            hp,
            alive: true,
            alert: if jammy { 2 } else { 0 },
            gun: g,
            see: 0.0,
            poison: 0.0,
            burn: 0.0,
            doomed: false,
            flee: 0.0,
        });
    }

    fn spawn_animal(&mut self, x: f32, z: f32) {
        self.bodies.push(Body {
            kind: 3,
            x,
            z,
            yaw: 0.0,
            hp: 20.0,
            alive: true,
            alert: 0,
            gun: Gun::new(WeaponId::Pistol),
            see: 0.0,
            poison: 0.0,
            burn: 0.0,
            doomed: false,
            flee: 0.0,
        });
    }

    fn spawn_barrel(&mut self, x: f32, z: f32) {
        self.bodies.push(Body {
            kind: 5,
            x,
            z,
            yaw: 0.0,
            hp: 20.0,
            alive: true,
            alert: 0,
            gun: Gun::new(WeaponId::Pistol),
            see: 0.0,
            poison: 0.0,
            burn: 0.0,
            doomed: false,
            flee: 0.0,
        });
    }

    fn arm(&mut self, id: WeaponId) {
        if let Some(i) = self.guns.iter().position(|g| g.id == id) {
            self.slot = i;
        } else {
            self.guns.push(Gun::new(id));
            self.slot = self.guns.len() - 1;
        }
        let g = self.gun_mut();
        g.jammed = false;
        g.broken = false;
        g.force_jam = false;
        g.cooldown = 0.0;
        g.condition = 100.0;
        let mag = gun::stats(id).mag.max(1);
        if g.ammo < mag {
            g.ammo = mag;
        }
    }

    fn prep_ignite(&mut self, n: u8) {
        match n {
            0 => self.arm(WeaponId::Flare),
            1 => self.arm(WeaponId::Rpg),
            2 => self.arm(WeaponId::Flamer),
            3 => self.arm(WeaponId::Mortar),
            4 => self.arm(WeaponId::Molotov),
            5 => self.arm(WeaponId::Frag),
            6 => {
                self.arm(WeaponId::Pistol);
                let (sy, cy) = self.yaw.sin_cos();
                self.spawn_barrel(self.x + sy * 4.0 + 2.0, self.z - cy * 4.0);
            }
            7 => self.arm(WeaponId::Pistol),
            8 => {
                self.arm(WeaponId::Flamer);
                self.clear_bodies();
                let (sy, cy) = self.yaw.sin_cos();
                self.spawn_soldier(self.x + sy * 6.0 + 1.0, self.z - cy * 6.0, 40.0, false);
            }
            9 => {
                self.weather = 2;
                self.arm(WeaponId::Pistol);
            }
            10 => self.arm(WeaponId::Pistol),
            _ => {}
        }
    }

    fn note_weapon_ignite(&mut self, id: WeaponId) {
        let Some(Spec::Ignite(k)) = self.current() else { return };
        let flag = match (k, id) {
            (0, WeaponId::Flare) => "ignite_flare",
            (1, WeaponId::Rpg) => "ignite_rocket",
            (2, WeaponId::Flamer) => "ignite_flamer",
            (3, WeaponId::Mortar) => "ignite_mortar",
            (4, WeaponId::Molotov) => "ignite_molotov",
            (5, WeaponId::Frag) => "ignite_frag",
            _ => return,
        };
        self.mark(flag);
    }

    fn cell_open(&self, x: f32, z: f32) -> bool {
        if geom::fuel(x, z) <= 0.0 {
            return false;
        }
        match self.fire.cells.get(&geom::cell_of(x, z)) {
            Some(cell) if cell.burning || self.minutes < cell.burnt_until => false,
            _ => true,
        }
    }

    /// Nearest 2 m cell that will still take a light. Skips the cell under `x,z` when that one is closed.
    fn nearest_open_cell(&self, x: f32, z: f32) -> Option<(f32, f32)> {
        let (cx, cz) = geom::cell_of(x, z);
        for r in 1i32..36 {
            for dz in -r..=r {
                for dx in -r..=r {
                    if dx.abs() != r && dz.abs() != r {
                        continue;
                    }
                    let (px, pz) = geom::cell_center((cx + dx, cz + dz));
                    if self.cell_open(px, pz) {
                        return Some((px, pz));
                    }
                }
            }
        }
        None
    }

    fn town_burning(&self) -> bool {
        self.fire.cells.iter().any(|(c, cell)| {
            if !cell.burning {
                return false;
            }
            let (x, z) = geom::cell_center(*c);
            geom::in_town(x, z)
        })
    }

    pub fn choose_finale(&mut self, n: u8) {
        self.finale = Some(n);
        self.screen = Screen::Playing;
        self.focus = 0;
        self.idle = 0.0;
        self.hold_t = 0.0;
        match n {
            0 => self.arm(WeaponId::Flare),
            1 => {
                self.clear_bodies();
                for i in 0..3 {
                    self.spawn_soldier(self.x + 40.0 + i as f32 * 4.0, self.z - 50.0, 30.0, false);
                }
                self.syrettes = self.syrettes.max(4);
            }
            _ => {}
        }
    }

    /// Puts the contract on the ledger step and lets the next tick open it.
    pub fn present_ending(&mut self) {
        if self.route == Route::Sandbox {
            self.route = Route::Human;
        }
        let idx = script(self.route).iter().position(|s| matches!(s, Spec::Ending(_))).unwrap_or(0);
        self.step = idx as u16;
        self.step_ready = false;
        self.finished = false;
        self.screen = Screen::Playing;
        self.finale = None;
        self.x = -760.0;
        self.z = 620.0;
    }

    pub fn dev_teleport(&mut self, label: &str) {
        if let Some(p) = geom::PLACES.iter().find(|p| p.name == label) {
            self.x = p.x;
            self.z = p.z;
            self.ride.seat = 0;
            self.ride.speed = 0.0;
            if self.ride.kind != 0 {
                self.ride.x = p.x;
                self.ride.z = p.z;
            }
        }
    }

    pub fn dev_spawn(&mut self, label: &str) {
        let x = self.x + 6.0;
        let z = self.z - 4.0;
        match label {
            "Soldier" => self.spawn_soldier(x, z, 40.0, false),
            "Animal" => self.spawn_animal(x, z),
            "Truck" => self.spawn_truck(x, z),
            "Technical" => {
                self.ride.kind = 1;
                self.ride.seat = 0;
                self.ride.x = x;
                self.ride.z = z;
                self.ride.health = 100.0;
                self.ride.stage = 0;
                self.ride.speed = 0.0;
            }
            "Boat" => {
                self.ride.kind = 2;
                self.ride.seat = 0;
                self.ride.x = x;
                self.ride.z = z;
                self.ride.health = 100.0;
                self.ride.stage = 0;
                self.ride.speed = 0.0;
            }
            "Barrel" => self.spawn_barrel(x, z),
            _ => {}
        }
    }

    pub fn dev_world(&mut self, label: &str) {
        match label {
            "Night" => self.minutes = 22.0 * 60.0,
            "Noon" => self.minutes = 12.0 * 60.0,
            "Rain" => self.weather = 1,
            "Clear sky" => self.weather = 0,
            "Strong wind" => self.wind = Vec2::new(9.0, 0.0),
            "Calm" => self.wind = Vec2::new(0.2, 0.0),
            "Ignite grass" => {
                let _ = self.fire.ignite_at(self.x + 8.0, self.z + 8.0, self.tune.burn_time, self.minutes);
            }
            _ => {}
        }
    }

    fn spawn_truck(&mut self, x: f32, z: f32) {
        self.bodies.push(Body {
            kind: 6,
            x,
            z,
            yaw: 0.0,
            hp: 80.0,
            alive: true,
            alert: 0,
            gun: Gun::new(WeaponId::Pistol),
            see: 0.0,
            poison: 0.0,
            burn: 0.0,
            doomed: false,
            flee: 0.0,
        });
    }

    fn spawn_tank_farm(&mut self) {
        self.clear_bodies();
        for i in 0..7 {
            for j in 0..7 {
                self.bodies.push(Body {
                    kind: 5,
                    x: self.x + i as f32 * 10.0,
                    z: self.z + j as f32 * 10.0 - 20.0,
                    yaw: 0.0,
                    hp: 20.0,
                    alive: true,
                    alert: 0,
                    gun: Gun::new(WeaponId::Pistol),
                    see: 0.0,
                    poison: 0.0,
                    burn: 0.0,
                    doomed: false,
                    flee: 0.0,
                });
            }
        }
    }

    /// A shot tank cooks its neighbours. The chain flag waits for a second tank to die from the blast.
    fn chain_tanks(&mut self, origin: usize) {
        let mut queue = vec![origin];
        let mut head = 0;
        let mut chained = false;
        while head < queue.len() {
            let i = queue[head];
            head += 1;
            let x = self.bodies[i].x;
            let z = self.bodies[i].z;
            let _ = self.fire.ignite_disk(x, z, 6.0, self.tune.burn_time, self.minutes);
            for j in 0..self.bodies.len() {
                if queue.contains(&j) {
                    continue;
                }
                let b = &self.bodies[j];
                if b.alive && b.kind == 5 && geom::dist(x, z, b.x, b.z) <= 16.0 {
                    self.bodies[j].hp = 0.0;
                    self.bodies[j].alive = false;
                    queue.push(j);
                    chained = true;
                }
            }
        }
        if chained {
            self.mark("explosion_chain");
        }
    }

    pub fn hour(&self) -> f32 {
        (self.minutes / 60.0) % 24.0
    }

    pub fn tracker_rate(&self) -> f32 {
        let d = geom::dist(self.x, self.z, self.tracker_cache.0, self.tracker_cache.1).max(1.0);
        if d > 60.0 { 0.0 } else { 8.0 / d }
    }

    pub fn save_json(&self) -> String {
        serde_json::to_string(self).unwrap_or_else(|_| "{}".into())
    }

    pub fn load_json(text: &str) -> Result<Self, String> {
        serde_json::from_str(text).map_err(|e| e.to_string())
    }

    pub fn write_save(&mut self) {
        if self.hub {
            return;
        }
        self.save_blob = String::new();
        let blob = self.save_json();
        self.save_blob = blob;
        self.has_save = true;
        self.saves_written += 1;
    }

    pub fn fingerprint(&self) -> u64 {
        let s = serde_json::to_string(self).unwrap_or_default();
        let mut h = 0xcbf29ce484222325u64;
        for b in s.as_bytes() {
            h ^= *b as u64;
            h = h.wrapping_mul(0x100000001b3);
        }
        h
    }

    pub fn eye_pos(&self) -> (f32, f32, f32) {
        let h = geom::height(self.x, self.z);
        (self.x, h + self.eye, self.z)
    }

    pub fn status(&self) -> serde_json::Value {
        let (ex, ey, ez) = self.eye_pos();
        json!({
            "title": "Jam Cry",
            "screen": format!("{:?}", self.screen),
            "goal": self.goal_name(),
            "x": self.x,
            "z": self.z,
            "yaw": self.yaw,
            "pitch": self.pitch,
            "roll": self.roll,
            "eye": [ex, ey, ez],
            "fov": if self.mono_t > 0.0 { 15.0 } else if false { 55.0 } else { 75.0 },
            "health": self.hp,
            "stance": self.stance,
            "diamonds": self.diamonds,
            "finished": self.finished,
            "coverage": self.flags.iter().cloned().collect::<Vec<_>>(),
            "audio": { "music": self.music },
            "dev": { "god": self.dev.god, "open": self.screen == Screen::Dev },
            "tune": { "fire_spread": self.tune.fire_spread },
            "wind": self.wind.length(),
            "hour": self.hour(),
            "vehicle": { "kind": self.ride.kind, "stage": self.ride.stage, "health": self.ride.health, "roll": self.ride.roll, "pitch": self.ride.pitch },
            "tracker": self.tracker_rate(),
            "attract": self.attract_loops,
            "saves": self.saves_written,
        })
    }

    pub fn about_slice(&self) -> Vec<String> {
        let all = about_pages();
        let size = 4usize;
        if all.is_empty() {
            return all;
        }
        let pages = all.len().div_ceil(size);
        let p = (self.page as usize).min(pages - 1);
        let start = p * size;
        all[start..(start + size).min(all.len())].to_vec()
    }

    pub fn ui_value(&self) -> serde_json::Value {
        json!({
            "screen": format!("{:?}", self.screen),
            "rows": self.rows(),
            "focus": self.focus,
            "label": self.rows().get(self.focus).cloned().unwrap_or_default(),
            "notice": self.notice(),
            "touch_controls": false,
            "glyph": shell::glyph("confirm", self.device, self.xbox),
            "xbox": self.xbox,
            "device": format!("{:?}", self.device),
            "about": self.about_slice(),
        })
    }
}

fn wound_flag(n: u8) -> &'static str {
    match n {
        1 => "wound_gunshot",
        2 => "wound_shrapnel",
        3 => "wound_burn",
        4 => "wound_fall",
        5 => "wound_tourniquet",
        _ => "wound_graze",
    }
}

fn ignite_flag(n: u8) -> &'static str {
    match n {
        0 => "ignite_flare",
        1 => "ignite_rocket",
        2 => "ignite_flamer",
        3 => "ignite_mortar",
        4 => "ignite_molotov",
        5 => "ignite_frag",
        6 => "ignite_barrel",
        7 => "ignite_vehicle",
        8 => "ignite_person",
        9 => "ignite_lightning",
        10 => "ignite_tracer",
        _ => "ignite_cigarette",
    }
}

fn ending_flag(n: u8) -> &'static str {
    match n {
        1 => "ending_read",
        2 => "ending_chair",
        _ => "ending_burn",
    }
}

trait Doomed {
    fn doomed_enough(&self) -> bool;
}
impl Doomed for Companion {
    fn doomed_enough(&self) -> bool {
        false
    }
}

fn ray_sphere(o: (f32, f32, f32), d: (f32, f32, f32), c: (f32, f32, f32), r: f32) -> Option<f32> {
    let lx = c.0 - o.0;
    let ly = c.1 - o.1;
    let lz = c.2 - o.2;
    let b = lx * d.0 + ly * d.1 + lz * d.2;
    let cc = lx * lx + ly * ly + lz * lz - r * r;
    let disc = b * b - cc;
    if disc < 0.0 {
        return None;
    }
    let t = b - disc.sqrt();
    (t > 0.05).then_some(t)
}

fn ray_aabb(o: (f32, f32, f32), d: (f32, f32, f32), min: [f32; 3], max: [f32; 3]) -> Option<f32> {
    let mut t0 = 0.0f32;
    let mut t1 = 1.0e6f32;
    let origins = [o.0, o.1, o.2];
    let dirs = [d.0, d.1, d.2];
    for i in 0..3 {
        if dirs[i].abs() < 1e-8 {
            if origins[i] < min[i] || origins[i] > max[i] {
                return None;
            }
            continue;
        }
        let inv = 1.0 / dirs[i];
        let mut ta = (min[i] - origins[i]) * inv;
        let mut tb = (max[i] - origins[i]) * inv;
        if ta > tb {
            std::mem::swap(&mut ta, &mut tb);
        }
        t0 = t0.max(ta);
        t1 = t1.min(tb);
        if t0 > t1 {
            return None;
        }
    }
    (t0 > 0.05).then_some(t0)
}

pub fn about_pages() -> Vec<String> {
    vec![
        "Jam Cry. Everything rusts. The grass burns anyway.".into(),
        "You are a contract mercenary in the Republic of Kwelara, in the last dry season of a civil war. Colonel Emile Tshala's Council and Comrade Josephine Ruvuma's People's Hand both buy from the same dealer. Find the Chandler.".into(),
        "Source: Far Cry 2".into(),
        "Date: 2026-11-05 01:35:03".into(),
        "Plan: PLAN.md".into(),
        "Genre and Perspective: Shooter, first person.".into(),
        "Tech: Rust 1.98, shardfall (pav_core, pav_view, pav_app, pav_audio), wasm-bindgen 0.2.129, WebGPU, one HTML page.".into(),
        "Art Direction: sun-bleached dusk, laterite gold, dry grass, and a low sun. The overlook is flat boxes dressed in code.".into(),
        "Animation: simulation-driven poses. The rifle and the wind rag are boxes. No skeletal clip.".into(),
        "Audio: code-only tones. The music bus defaults to 0.10. Voices are gibberish syllables, not recorded speech. No wav, mp3, or ogg.".into(),
        "Online: AI Hub shared-world sessions for 1 to 4 players, plus BroadcastChannel and pasted WebRTC codes when no hub is active.".into(),
        "Testing: native cargo tests, a seeded bot through three endings, Playwright Chromium with software WebGPU, WebKit with no WebGPU, and the hub harness.".into(),
        "Research: the engine START_HERE and MAKE_A_GAME notes, and the plan's system notes. No separate play of the source.".into(),
        "Environment: Grok CLI (headless); Linux".into(),
        "Model: xAI, grok-4.7, reasoning effort xhigh".into(),
        "Usage: added on import".into(),
        "Testing Feedback".into(),
        "Testing caught 26 issues. The first build reported 14 compile errors. After it compiled, the shipped tests failed 12 more times: a missing trait import, fever not latching, an attract step the clock clamps, fire crossing the road, a vehicle stage off by one, blackout health regenerating, an ignite on a cell already alight, soldiers leaving the flame, rain on the river, a gun that broke before it jammed, a long rest that skipped the post, and the last contract flag.".into(),
        "6 of those were game-breaking. The ignite step stalled, the panic step stalled, rain could not light a river cell, one seed broke the gun before the jam, the long rest never remanned the post, and the ending skipped the last contract flag.".into(),
        "The most helpful test was bot_plays_all_three_endings. It named the route, the seed, the stuck goal, the position, and the missing flags.".into(),
        "The least helpful test was the first attract check, which stepped a full second while the world clock clamps a tick to half a second, so it measured the clamp. A passing audio filter that never enters the contract was the other weak check. After the green run, 0 failures remained.".into(),
        "Engine Feedback".into(),
        "The headless sim, the Game trait, the seeded rng, and the single-file packer were the parts that earned their keep.".into(),
        "The rig had no first-person camera. Hook games still drew the pavilion HUD. The wrong WebGPU flag leaves a blank canvas. Fire will not light a cell that is already burning. The world clock clamps a tick. A rest flag stuck. An ending marked finished before the last flag.".into(),
        "The contract sim had to be built here: weapons, fire, fever, the shell, and the page.".into(),
        "The hardest part was a first-person view and a two-kilometre country inside a small room, and a bot that trips every coverage flag.".into(),
        "InputFrame gained look, axes, and act, plus the buttons from reload through confirm. CameraRig gained a first-person pose. The pavilion HUD is skipped for this scene, so the page can own the menus.".into(),
        "One change worth having: a first-person camera and a game-owned UI that does not assume the pavilion.".into(),
        "Prompt Feedback".into(),
        "The checks name the behaviour, the seeds, and the file the proof goes in.".into(),
        "The country lives in a simulation inside a room scene, and the WebGPU flag that actually paints is easy to miss.".into(),
        "The hardest task was one seeded bot reaching three endings and every coverage flag, then a page that still paints a frame.".into(),
        "Name the WebGPU flags beside the screenshot check, and say the visual room is only a window onto the country.".into(),
    ]
}

pub fn fiction_lines() -> Vec<String> {
    let mut lines = vec![
        "Jam Cry".into(),
        "Everything rusts. The grass burns anyway.".into(),
        "Republic of Kwelara".into(),
        "Ada Okoro".into(),
        "Tomek Wrona".into(),
        "Rafael Quintero".into(),
        "Mirela Dragan".into(),
        "Emile Tshala".into(),
        "Josephine Ruvuma".into(),
        "The Chandler".into(),
        "Thandiwe Moyo".into(),
        "Papa Lazare".into(),
        "Mr. Desai".into(),
        "Sister Perpetua".into(),
        "Bakker".into(),
        "Kilometre 40".into(),
        "Controller or keyboard required".into(),
        "New contract".into(),
        "Press any button".into(),
        "Burn the ledger".into(),
        "Read the names".into(),
        "Take the chair".into(),
    ];
    lines.extend(about_pages());
    for p in geom::PLACES {
        lines.push(p.name.into());
    }
    lines
}
