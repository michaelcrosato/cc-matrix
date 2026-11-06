//! Jam Cry. These tests call the shipped simulation: `World::tick`, `Gun::pull`, `FireMap::tick`.

use std::collections::BTreeSet;
use std::path::Path;

use pav_core::games::merc::fire::FireMap;
use pav_core::games::merc::geom::{self, exposure};
use pav_core::games::merc::gun::{Gun, WeaponId, clear_seconds};
use pav_core::games::merc::net::{Link, client_apply, host_publish};
use pav_core::games::merc::shell::{Device, MenuInput, glyph};
use pav_core::games::merc::world::{Body, Route, Screen, World, fiction_lines};
use pav_core::games::merc::{self, Merc};
use pav_core::games::Game;
use pav_core::input::buttons;
use pav_core::rng::Rng;
use pav_core::{InputFrame, Sim};

const DT: f32 = 1.0 / 60.0;

fn press(bit: u32) -> InputFrame {
    let mut f = InputFrame::default();
    f.held = bit;
    f.pressed = bit;
    f
}

fn hold(bit: u32) -> InputFrame {
    let mut f = InputFrame::default();
    f.held = bit;
    f
}

fn soldier(x: f32, z: f32, alert: u8) -> Body {
    let mut gun = Gun::new(WeaponId::Ar);
    gun.ammo = 400;
    gun.reserve = 400;
    gun.condition = 100.0;
    Body {
        kind: 1,
        x,
        z,
        yaw: 0.0,
        hp: 80.0,
        alive: true,
        alert,
        gun,
        see: 0.0,
        poison: 0.0,
        burn: 0.0,
        doomed: false,
        flee: 0.0,
    }
}

fn run(w: &mut World, input: &InputFrame, seconds: f32) {
    let n = (seconds / DT) as i32;
    for _ in 0..n {
        w.tick(input, DT);
    }
}

/// The rendered eye is one process slot. Two merc sims must not write it at once.
fn camera_lock() -> std::sync::MutexGuard<'static, ()> {
    static LOCK: std::sync::Mutex<()> = std::sync::Mutex::new(());
    LOCK.lock().unwrap()
}

#[test]
fn scene_boots_and_history_is_off() {
    let _cam = camera_lock();
    for seed in [1u64, 2, 9] {
        let mut sim = Sim::new(Merc::KEY, seed).unwrap();
        assert_eq!(sim.play().unwrap().key(), "merc");
        assert_eq!(sim.config.history_seconds, 0.0);
        for _ in 0..8 {
            sim.step(&InputFrame::default());
        }
        let status = sim.play().unwrap().status(&sim);
        assert_eq!(status["title"], "Jam Cry");
    }
}

#[test]
fn same_seed_matches_across_a_save() {
    let mut a = World::fresh(11);
    let mut b = World::fresh(11);
    let mut f = InputFrame::default();
    f.move_dir.y = 1.0;
    f.look.x = 0.01;
    for _ in 0..90 {
        a.tick(&f, DT);
        b.tick(&f, DT);
    }
    assert_eq!(a.fingerprint(), b.fingerprint());
    let loaded = World::load_json(&a.save_json()).unwrap();
    assert_eq!(loaded.fingerprint(), a.fingerprint());
    a.tick(&f, DT);
    let mut loaded = loaded;
    loaded.tick(&f, DT);
    assert_eq!(a.fingerprint(), loaded.fingerprint());
}

#[test]
fn look_and_stick_follow_yaw() {
    let mut w = World::fresh(3);
    let z0 = w.z;
    let mut f = InputFrame::default();
    f.move_dir.y = 1.0;
    run(&mut w, &f, 1.0);
    assert!(w.z < z0 - 3.0, "forward at yaw 0 moves north, z {z0} -> {}", w.z);
    w.yaw = std::f32::consts::FRAC_PI_2;
    let x0 = w.x;
    run(&mut w, &f, 1.0);
    assert!(w.x > x0 + 3.0, "yaw east, x {x0} -> {}", w.x);
    let mut look = InputFrame::default();
    look.look.y = 5.0;
    w.tick(&look, DT);
    assert!(w.pitch <= 1.15 + 1e-3);
    look.look.y = -5.0;
    w.tick(&look, DT);
    assert!(w.pitch >= -1.15 - 1e-3);
    let mut crouch = hold(buttons::CROUCH);
    crouch.move_dir.y = 0.0;
    run(&mut w, &crouch, 1.0);
    assert!(w.stance == 1 && (w.eye - 1.02).abs() < 0.08, "eye {}", w.eye);
    let prone = hold(buttons::CRAWL);
    run(&mut w, &prone, 1.0);
    assert!(w.stance == 2 && w.eye < 0.6, "eye {}", w.eye);
}

#[test]
fn hits_use_zones_and_walls_block() {
    let mut w = World::fresh(4);
    w.yaw = 0.0;
    w.pitch = ((1.70 - w.eye) / 10.0).atan();
    w.spawn_dummy(w.x, w.z - 10.0, 100.0);
    let mut f = hold(buttons::PRIMARY | buttons::SECONDARY);
    f.pressed = buttons::PRIMARY;
    w.tick(&f, DT);
    let hp = w.bodies[0].hp;
    assert!(hp < 100.0 - 50.0, "headshot damage, hp {hp}");
    w.bodies.clear();
    w.guns[0].cooldown = 0.0;
    w.pitch = ((0.45 - w.eye) / 10.0).atan();
    w.spawn_dummy(w.x, w.z - 10.0, 100.0);
    w.tick(&f, DT);
    let limb = w.bodies[0].hp;
    assert!(limb > 80.0 && limb < 90.0, "limb damage, hp {limb}");
    w.bodies.clear();
    w.guns[0].cooldown = 0.0;
    w.pitch = 0.0;
    w.spawn_dummy(w.x, w.z - 20.0, 100.0);
    w.add_wall([w.x - 2.0, 0.0, w.z - 16.0], [w.x + 2.0, 3.0, w.z - 14.0]);
    w.tick(&f, DT);
    assert_eq!(w.bodies[0].hp, 100.0, "wall blocks the ray");
}

#[test]
fn jams_match_the_curve_and_a_slap_shortens_the_clear() {
    let mut gun = Gun::new(WeaponId::Pistol);
    gun.condition = 35.0;
    gun.wear = 0.0;
    gun.ammo = 100_000;
    gun.reserve = 100_000;
    let mut rng = Rng::new(35);
    let mut jams = 0u32;
    for _ in 0..5000 {
        gun.cooldown = 0.0;
        gun.jammed = false;
        if gun.pull(&mut rng, 1.0, 0.0, 0.0) == pav_core::games::merc::gun::Pull::Jammed {
            jams += 1;
            gun.ammo += 1;
        }
    }
    assert!(jams > 5000 / 30 && jams < 5000 / 12, "jams {jams}");
    let mut stuck = Gun::new(WeaponId::Pistol);
    stuck.condition = 40.0;
    stuck.force_jam = true;
    stuck.ammo = 10;
    let mut rng = Rng::new(1);
    assert_eq!(stuck.pull(&mut rng, 1.0, 1.0, 8.0), pav_core::games::merc::gun::Pull::Jammed);
    let before = stuck.ammo;
    stuck.pull(&mut rng, 1.0, 1.0, 8.0);
    assert_eq!(stuck.ammo, before, "a jam spends no round");
    stuck.tap_reload();
    let clear = stuck.clear_left;
    let expect = clear_seconds(40.0);
    assert!((clear - expect).abs() < 0.01 && clear >= 1.2 && clear <= 2.5, "{clear}");
    stuck.tap_reload();
    assert!((stuck.clear_left - clear * 0.6).abs() < 0.02, "{}", stuck.clear_left);
}

#[test]
fn a_worn_gun_breaks_and_a_jammed_soldier_stops() {
    let mut w = World::fresh(8);
    w.guns[0] = Gun::new(WeaponId::Smg);
    w.guns[0].condition = 5.0;
    w.guns[0].wear = 0.0;
    w.guns[0].ammo = 9_999;
    w.guns[0].reserve = 9_999;
    let fire = hold(buttons::PRIMARY | buttons::SECONDARY);
    let mut broke = false;
    for _ in 0..(90.0 / DT) as i32 {
        if w.guns[0].jammed {
            w.tick(&press(buttons::RELOAD), DT);
        } else {
            w.tick(&fire, DT);
        }
        if w.guns[0].broken || w.flags.contains("weapon_broke") {
            broke = true;
            break;
        }
    }
    assert!(broke, "condition 5 should break inside 90s");

    let mut w = World::fresh(9);
    let mut g = Gun::new(WeaponId::Ar);
    g.condition = 5.0;
    g.wear = 0.0;
    g.ammo = 400;
    let mut body = soldier(w.x, w.z - 8.0, 2);
    body.gun = g;
    w.bodies.push(body);
    let mut saw_jam = false;
    let mut shots_at_jam = 0u32;
    for _ in 0..(20.0 / DT) as i32 {
        w.tick(&InputFrame::default(), DT);
        if w.flags.contains("enemy_jam") {
            saw_jam = true;
            shots_at_jam = w.bodies[0].gun.shots;
            break;
        }
    }
    assert!(saw_jam, "soldier should jam");
    run(&mut w, &InputFrame::default(), 1.0);
    assert_eq!(w.bodies[0].gun.shots, shots_at_jam, "a jammed soldier stops firing");
}

#[test]
fn fire_runs_downwind_and_respects_breaks() {
    let mut map = FireMap::default();
    let origin = (200.0f32, -200.0f32);
    assert!(map.ignite_at(origin.0, origin.1, 30.0, 0.0));
    let mut rng = Rng::new(2);
    let wind = pav_core::glam::Vec2::new(8.0, 0.0);
    for _ in 0..60 {
        map.tick(1.0, wind, 0.9, 30.0, 0.0, false, &mut rng);
    }
    let (down, up) = map.reach(origin, wind);
    assert!(up > 0.0, "upwind reach {up}, down {down}");
    assert!(down >= up * 3.0, "down {down} up {up}");

    let mut calm = FireMap::default();
    calm.ignite_at(origin.0, origin.1, 40.0, 0.0);
    let mut rng = Rng::new(3);
    for _ in 0..40 {
        calm.tick(1.0, pav_core::glam::Vec2::ZERO, 0.9, 40.0, 0.0, false, &mut rng);
    }
    let mut min_x = i32::MAX;
    let mut max_x = i32::MIN;
    let mut min_z = i32::MAX;
    let mut max_z = i32::MIN;
    for c in calm.cells.keys() {
        min_x = min_x.min(c.0);
        max_x = max_x.max(c.0);
        min_z = min_z.min(c.1);
        max_z = max_z.max(c.1);
    }
    let dx = (max_x - min_x).max(1) as f32;
    let dz = (max_z - min_z).max(1) as f32;
    let aspect = dx.max(dz) / dx.min(dz);
    assert!(aspect < 2.5, "calm scar aspect {aspect} dx {dx} dz {dz}");

    let mut blocked = FireMap::default();
    // South of the flats road. Wind blows north, into the road, at exactly 8 m/s.
    let south = (200.0f32, -400.0f32);
    assert!(!geom::on_road(south.0, south.1));
    blocked.ignite_at(south.0, south.1, 20.0, 0.0);
    let mut rng = Rng::new(4);
    for _ in 0..30 {
        blocked.tick(1.0, pav_core::glam::Vec2::new(0.0, -8.0), 0.9, 20.0, 0.0, false, &mut rng);
    }
    let crossed = blocked.cells.keys().any(|c| {
        let (x, z) = geom::cell_center(*c);
        z < -424.5 && x > 180.0 && x < 220.0
    });
    assert!(!crossed, "speed 8 does not jump the road");

    let mut ember = FireMap::default();
    ember.ignite_at(south.0, south.1, 20.0, 0.0);
    let mut rng = Rng::new(5);
    for _ in 0..20 {
        ember.tick(1.0, pav_core::glam::Vec2::new(0.0, -12.0), 0.9, 20.0, 0.0, false, &mut rng);
    }
    let hopped = ember.cells.keys().any(|c| {
        let (x, z) = geom::cell_center(*c);
        z < -424.5 && x > 180.0 && x < 220.0
    });
    assert!(hopped, "wind above 8 can throw an ember across the road");

    let mut ash = FireMap::default();
    ash.ignite_at(origin.0, origin.1, 1.0, 0.0);
    let mut rng = Rng::new(6);
    ash.tick(2.0, pav_core::glam::Vec2::ZERO, 0.0, 1.0, 10.0, false, &mut rng);
    assert!(!ash.ignite_at(origin.0, origin.1, 5.0, 10.0), "burnt ground refuses a new fire");
    assert!(ash.ignite_at(origin.0, origin.1, 5.0, 10.0 + 2880.0));

    let mut wet = FireMap::default();
    wet.ignite_at(origin.0, origin.1, 10.0, 0.0);
    let n = wet.tick(0.1, wind, 0.9, 10.0, 0.0, true, &mut rng);
    assert!(n > 0 && wet.burning_count() == 0);

    let mut disk = FireMap::default();
    let lit = disk.ignite_disk(origin.0, origin.1, 6.0, 10.0, 0.0);
    assert!(lit > 8, "barrel disk lit {lit}");
}

#[test]
fn exposure_smoke_and_noise() {
    let night = exposure(0.6, 0.35, 0.45, 0.5);
    let noon = exposure(1.0, 1.0, 1.0, 0.5);
    assert!((night - 0.04725).abs() < 1e-5);
    assert!((noon - 0.5).abs() < 1e-5);
    assert!(noon / night > 10.0);

    let mut quiet = World::fresh(1);
    quiet.bodies.push(soldier(quiet.x, quiet.z - 20.0, 0));
    let mut loud = quiet.clone();
    let mid = ((quiet.x + quiet.bodies[0].x) * 0.5, (quiet.z + quiet.bodies[0].z) * 0.5);
    assert!(quiet.fire.ignite_at(mid.0, mid.1, 30.0, quiet.minutes));
    run(&mut quiet, &InputFrame::default(), 2.0);
    run(&mut loud, &InputFrame::default(), 2.0);
    assert!(loud.bodies[0].see > quiet.bodies[0].see + 0.05, "smoke {} open {}", quiet.bodies[0].see, loud.bodies[0].see);

    let mut w = World::fresh(2);
    w.guns[0] = Gun::new(WeaponId::Ar);
    w.bodies.push(soldier(w.x + 50.0, w.z, 0));
    w.tick(&press(buttons::PRIMARY), DT);
    assert_eq!(w.bodies[0].alert, 1, "a loud shot makes them suspicious");
}

#[test]
fn squad_caps_shooters_and_breaks() {
    let mut w = World::fresh(3);
    for i in 0..6 {
        w.bodies.push(soldier(w.x + i as f32 * 3.0, w.z - 12.0, 2));
    }
    let x5 = w.bodies[5].x;
    run(&mut w, &InputFrame::default(), 1.0);
    let firing = w.bodies.iter().filter(|b| b.gun.shots > 0).count();
    assert!(firing <= 4, "shooters {firing}");
    assert!(w.bodies[5].x > x5 + 1.0, "the extra soldier flanks");

    let mut w = World::fresh(4);
    for i in 0..4 {
        let mut b = soldier(w.x + i as f32, w.z - 8.0, 2);
        if i < 3 {
            b.alive = false;
            b.hp = 0.0;
        }
        w.bodies.push(b);
    }
    let x = w.bodies[3].x;
    let shots = w.bodies[3].gun.shots;
    run(&mut w, &InputFrame::default(), 1.0);
    assert!(w.bodies[3].x > x + 2.0, "morale sends the last soldier away");
    assert_eq!(w.bodies[3].gun.shots, shots);
}

#[test]
fn post_remans_only_when_nobody_is_looking() {
    let mut w = World::fresh(1);
    let (px, pz) = geom::place("Kilo 38");
    w.post_clear = true;
    w.post_reman_at = w.minutes - 1.0;
    w.x = px;
    w.z = pz + 30.0;
    w.yaw = 0.0;
    w.tick(&InputFrame::default(), DT);
    assert!(!w.flags.contains("post_remanned"), "looking at the post holds it");
    w.yaw = std::f32::consts::PI;
    w.tick(&InputFrame::default(), DT);
    assert!(w.flags.contains("post_remanned"));
}

#[test]
fn fever_pills_blackout_and_healing() {
    let mut w = World::fresh(1);
    w.fever_t = w.tune.fever_interval;
    w.tick(&InputFrame::default(), DT);
    assert!(w.flags.contains("fever_warned") && w.fever_state == 1);
    run(&mut w, &hold(buttons::PILLS), 3.0);
    assert!(w.flags.contains("pill_taken") && w.fever_state == 0);
    assert_eq!(w.pills, 2);

    let mut w = World::fresh(2);
    w.pills = 0;
    w.fever_state = 2;
    w.fever_attack = 59.0;
    w.diamonds = 40;
    w.x = 200.0;
    w.z = -200.0;
    run(&mut w, &InputFrame::default(), 2.0);
    assert!(w.flags.contains("blackout"));
    assert!(w.hp >= 50.0 && w.hp < 70.0, "woke at 50 and started to recover, hp {}", w.hp);
    assert_eq!(w.diamonds, 32);
    let safe = geom::nearest_safe(200.0, -200.0);
    assert!(geom::dist(w.x, w.z, safe.0, safe.1) < 1.0);

    let mut w = World::fresh(3);
    w.hp = 40.0;
    w.tick(&press(buttons::HEAL), DT);
    run(&mut w, &InputFrame::default(), 2.0);
    assert!(w.flags.contains("syrette"));
    assert!(w.hp > 90.0, "hp {}", w.hp);

    let mut w = World::fresh(4);
    w.hp = 15.0;
    w.wound = 1;
    run(&mut w, &hold(buttons::HEAL), 4.2);
    assert!(w.flags.contains("wound_gunshot"));
    assert!(w.hp >= 40.0 && w.hp < 50.0, "treated to 40 then recovered, hp {}", w.hp);

    let mut w = World::fresh(5);
    w.hp = 0.0;
    run(&mut w, &InputFrame::default(), 4.0);
    assert!(w.flags.contains("player_rescued") && w.hp >= 50.0);
    assert!(w.companions.iter().any(|c| c.rescue_spent));
    let blob = w.save_json();
    w.hp = 0.0;
    run(&mut w, &InputFrame::default(), 4.0);
    assert!(w.hp < 5.0, "a second rescue waits until sleep, hp {}", w.hp);
    let loaded = World::load_json(&blob).unwrap();
    assert!(loaded.flags.contains("player_rescued"));
    assert!(loaded.companions.iter().any(|c| c.rescue_spent));
}

#[test]
fn vehicles_climb_break_and_float() {
    let mut w = World::fresh(1);
    w.ride.kind = 1;
    w.ride.seat = 1;
    w.ride.x = 200.0;
    w.ride.z = -520.0;
    w.x = 200.0;
    w.z = -520.0;
    w.ride.health = 100.0;
    let mut drive = InputFrame::default();
    drive.axes.y = 1.0;
    drive.axes.x = 0.0;
    w.ride.yaw = std::f32::consts::FRAC_PI_2;
    run(&mut w, &drive, 2.0);
    assert!(w.ride.pitch > 0.01, "pitch {}", w.ride.pitch);
    assert!(w.flags.contains("technical_driven"));
    w.ride.roll = 0.3;
    w.tick(&drive, DT);
    assert!(w.ride.roll < 0.3);

    w.ride.health = 100.0;
    w.ride.stage = 0;
    w.hurt_vehicle(50.0);
    assert!(w.ride.stage >= 1, "stage {}", w.ride.stage);
    w.hurt_vehicle(40.0);
    assert_eq!(w.ride.stage, 3, "health {}", w.ride.health);
    run(&mut w, &drive, 9.0);
    assert!(w.flags.contains("ignite_vehicle") || w.ride.stage == 4);

    let mut w = World::fresh(2);
    w.ride.kind = 1;
    w.ride.seat = 0;
    w.ride.health = 30.0;
    w.ride.stage = 2;
    w.ride.x = w.x;
    w.ride.z = w.z;
    run(&mut w, &hold(buttons::INTERACT), 6.5);
    assert!(w.flags.contains("repair_done"));
    assert!(w.ride.health >= 70.0);

    let mut dry = World::fresh(3);
    dry.ride.kind = 2;
    dry.ride.seat = 1;
    dry.ride.x = 200.0;
    dry.ride.z = -200.0;
    dry.x = 200.0;
    dry.z = -200.0;
    assert!(!geom::deep_water(200.0, -200.0));
    let mut throttle = InputFrame::default();
    throttle.axes.y = 1.0;
    run(&mut dry, &throttle, 1.0);
    assert!(dry.ride.speed.abs() < 0.2, "boat on grass {}", dry.ride.speed);

    let (wx, wz) = geom::nearest_water(0.0, 0.0);
    let mut wet = World::fresh(4);
    wet.ride.kind = 2;
    wet.ride.seat = 1;
    wet.ride.x = wx;
    wet.ride.z = wz;
    wet.x = wx;
    wet.z = wz;
    let (tx, tz) = geom::water_ahead(wx, wz, 40.0);
    wet.ride.yaw = geom::yaw_toward(wx, wz, tx, tz);
    run(&mut wet, &throttle, 2.0);
    assert!(wet.flags.contains("boat_driven"), "dist {} deep {}", wet.ride.dist, geom::deep_water(wet.ride.x, wet.ride.z));

    wet.ride.npc = true;
    let z0 = wet.ride.z;
    run(&mut wet, &InputFrame::default(), 1.0);
    assert!((wet.ride.x - wx).abs() > 0.5 || (wet.ride.z - z0).abs() > 0.5);

    let seat = wet.ride.seat;
    wet.tick(&press(buttons::USE), DT);
    assert_ne!(wet.ride.seat, seat);
    wet.ride.seat = 2;
    wet.tick(&hold(buttons::PRIMARY), DT);
    assert!(wet.flags.contains("mounted_gun"));
}

#[test]
fn shop_tracker_and_shell() {
    let mut w = World::fresh(1);
    w.diamonds = 0;
    let guns = w.guns.len();
    assert!(!w.try_buy());
    assert_eq!(w.guns.len(), guns);
    assert_eq!(w.diamonds, 0);

    w.tracker_cache = (w.x + 10.0, w.z);
    let near = w.tracker_rate();
    w.tracker_cache = (w.x + 50.0, w.z);
    let far = w.tracker_rate();
    assert!(near > far && far > 0.0, "{near} vs {far}");

    let mut w = World::campaign(2, Route::Human);
    assert!(w.rows().len() <= 7);
    let screens = [
        Screen::Title, Screen::Difficulty, Screen::Merc, Screen::Prologue, Screen::Pause, Screen::Settings, Screen::About,
        Screen::Dev, Screen::Mp, Screen::Attract, Screen::Ledger,
    ];
    for screen in screens {
        w.screen = screen;
        for tab in 0..6 {
            w.tab = tab;
            for page in 0..6 {
                w.page = page;
                assert!(w.rows().len() <= 7, "{screen:?} tab {tab} page {page} {:?}", w.rows());
            }
        }
    }
    w.screen = Screen::Difficulty;
    w.focus = 0;
    w.apply_menu(MenuInput { up: true, ..MenuInput::default() });
    assert_eq!(w.focus, 2);
    w.apply_menu(MenuInput { back: true, ..MenuInput::default() });
    assert_eq!(w.screen, Screen::Title);

    w.focus = 0;
    w.apply_menu(MenuInput { pointer: Some((400.0, 300.0)), ..MenuInput::default() });
    assert_eq!(w.focus, 1);
    w.apply_menu(MenuInput { pointer: Some((400.0, 230.0)), click: true, ..MenuInput::default() });
    assert_eq!(w.screen, Screen::Difficulty);

    assert_eq!(glyph("confirm", Device::Gamepad, false), "Cross");
    assert_eq!(glyph("confirm", Device::Gamepad, true), "A");
    assert_eq!(glyph("fire", Device::Keyboard, false), "LMB");
    assert_eq!(glyph("reload", Device::Gamepad, false), "Square");

    w.screen = Screen::Dev;
    w.tab = 5;
    w.page = 1;
    w.focus = 2;
    let before = w.tune.fire_spread;
    w.apply_menu(MenuInput { right: true, ..MenuInput::default() });
    assert!(w.tune.fire_spread > before, "{} -> {}", before, w.tune.fire_spread);
    w.page = 3;
    w.focus = 3;
    w.apply_menu(MenuInput { confirm: true, ..MenuInput::default() });
    assert!((w.tune.fire_spread - w.tune0.fire_spread).abs() < 1e-4);

    let mut w = World::campaign(3, Route::Human);
    run(&mut w, &InputFrame::default(), 9.0);
    assert_ne!(w.screen, Screen::Attract);
    run(&mut w, &InputFrame::default(), 1.2);
    assert_eq!(w.screen, Screen::Attract);
    let saves = w.saves_written;
    let mut acc = 0.0f32;
    while acc < 800.0 {
        w.tick(&InputFrame::default(), 0.5);
        acc += 0.5;
    }
    assert!(w.attract_loops >= 5, "loops {}", w.attract_loops);
    assert_eq!(w.attract_seen, (1u16 << 10) - 1, "seen {:b}", w.attract_seen);
    assert_eq!(w.saves_written, saves);

    let mut w = World::campaign(4, Route::Human);
    let mut seen = vec![format!("{:?}", w.screen)];
    for bit in [buttons::CONFIRM, buttons::JUMP, buttons::CONFIRM, buttons::JUMP] {
        w.tick(&press(bit), DT);
        seen.push(format!("{:?}", w.screen));
    }
    assert_eq!(w.screen, Screen::Playing, "{seen:?}");
    assert!(seen.windows(2).all(|p| p[0] != p[1]), "{seen:?}");
}

#[test]
fn fiction_has_no_source_names_and_no_audio_files() {
    let banned = [
        "jackal", "ufll", "apr", "pala", "mosate", "bowa", "leboa", "oluwagembi", "mike's bar", "marty", "alencar",
        "warren clyde", "paul ferenc", "hyppolite", "xianyong", "josip", "hakim", "bilders", "quarbani", "voorhees",
        "todo", "tbd", "placeholder", "lorem",
    ];
    for line in fiction_lines() {
        let low = line.to_lowercase();
        if low.contains("far cry 2") {
            assert!(line.contains("Source:"), "{line}");
        }
        for word in banned {
            assert!(!low.contains(word), "{word} in {line}");
        }
    }
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("src/games/merc");
    for entry in std::fs::read_dir(&root).unwrap() {
        let path = entry.unwrap().path();
        let text = std::fs::read_to_string(&path).unwrap_or_default().to_lowercase();
        for word in banned {
            assert!(!text.contains(word), "{word} in {}", path.display());
        }
    }
    let engine = Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
    let mut audio = Vec::new();
    walk_audio(&engine, &mut audio);
    assert!(audio.is_empty(), "shipped audio files: {audio:?}");
}

fn walk_audio(dir: &Path, out: &mut Vec<String>) {
    let Ok(rd) = std::fs::read_dir(dir) else { return };
    for entry in rd.flatten() {
        let path = entry.path();
        if path.file_name().and_then(|s| s.to_str()) == Some("target") {
            continue;
        }
        if path.is_dir() {
            walk_audio(&path, out);
        } else if let Some(ext) = path.extension().and_then(|s| s.to_str()) {
            if matches!(ext, "wav" | "mp3" | "ogg") {
                out.push(path.display().to_string());
            }
        }
    }
}

#[test]
fn net_loopback_shares_one_fire_cell() {
    let mut host = World::fresh(1);
    let mut client = World::fresh(2);
    assert!(host.fire.ignite_at(200.0, -200.0, 10.0, host.minutes));
    let mut link = Link::new(7, 0.15, 0.0, 0.0);
    host_publish(&host, &mut link, false);
    assert!(link.max_bytes < 1200);
    for _ in 0..10 {
        link.advance(0.1);
    }
    let bodies = link.poll();
    assert!(bodies.iter().any(|b| b.contains("\"t\":\"fire\"")));
    client_apply(&mut client, &bodies);
    let shared = host.fire.cells.keys().any(|c| client.fire.cells.get(c).is_some_and(|cell| cell.burning));
    assert!(shared, "host and client should share a burning cell within 1s");
    host_publish(&host, &mut link, true);
    assert_eq!(link.finishes, 1);
    host_publish(&host, &mut link, true);
    assert_eq!(link.finishes, 1);

    let mut lossy = Link::new(1, 0.0, 0.0, 1.0);
    lossy.send(false, "{\"t\":\"ping\"}".into());
    lossy.advance(0.1);
    assert!(lossy.poll().is_empty());
    lossy.send(true, "{\"t\":\"ping\"}".into());
    lossy.advance(0.1);
    assert_eq!(lossy.poll().len(), 1);
}

fn act(n: u32) -> InputFrame {
    let mut f = InputFrame::default();
    f.act = n;
    f
}

#[test]
fn first_person_eye_tracks_the_body() {
    let _cam = camera_lock();
    let mut sim = Sim::new(Merc::KEY, 1).unwrap();
    for bit in [buttons::CONFIRM, buttons::JUMP, buttons::CONFIRM, buttons::JUMP] {
        sim.step(&press(bit));
    }
    let (eye0, screen) = {
        let merc = sim.play().unwrap().get::<Merc>().unwrap();
        (merc.world.eye_pos(), merc.world.screen)
    };
    assert_eq!(screen, Screen::Playing);
    let cam = merc::overlook();
    assert!((cam.eye[0] - eye0.0).abs() < 0.25 && (cam.eye[1] - eye0.1).abs() < 0.25 && (cam.eye[2] - eye0.2).abs() < 0.25, "cam {:?} eye {:?}", cam.eye, eye0);

    let mut f = InputFrame::default();
    f.move_dir.y = 1.0;
    for _ in 0..90 {
        sim.step(&f);
    }
    let eye1 = sim.play().unwrap().get::<Merc>().unwrap().world.eye_pos();
    let cam = merc::overlook();
    assert!((cam.eye[0] - eye1.0).abs() < 0.3 && (cam.eye[2] - eye1.2).abs() < 0.3, "cam {:?} eye {:?}", cam.eye, eye1);
    assert!((eye1.0 - eye0.0).abs() + (eye1.2 - eye0.2).abs() > 1.0, "eye did not move {eye0:?} -> {eye1:?}");

    let mut c = InputFrame::default();
    c.held = buttons::CROUCH;
    for _ in 0..40 {
        sim.step(&c);
    }
    let eye_c = sim.play().unwrap().get::<Merc>().unwrap().world.eye_pos();
    let cam = merc::overlook();
    assert!(eye_c.1 < eye1.1 - 0.3, "crouch {} stand {}", eye_c.1, eye1.1);
    assert!((cam.eye[1] - eye_c.1).abs() < 0.25, "cam y {} eye {}", cam.eye[1], eye_c.1);

    let rifle = sim.state.entities.map.values().find(|e| e.name == "fp-rifle").expect("rifle prop");
    let dx = rifle.pos.x - cam.eye[0];
    let dy = rifle.pos.y - cam.eye[1];
    let dz = rifle.pos.z - cam.eye[2];
    let dist = (dx * dx + dy * dy + dz * dz).sqrt();
    assert!(dist > 0.15 && dist < 1.2, "rifle dist {dist}");
    let rag = sim.state.entities.map.values().find(|e| e.name == "fp-rag").expect("rag prop");
    let rdx = rag.pos.x - cam.eye[0];
    let rdy = rag.pos.y - cam.eye[1];
    let rdz = rag.pos.z - cam.eye[2];
    let rdist = (rdx * rdx + rdy * rdy + rdz * rdz).sqrt();
    assert!(rdist > 0.15 && rdist < 1.6, "rag dist {rdist}");
    let near_country = sim.state.entities.map.values().any(|e| {
        if e.name != "country" {
            return false;
        }
        let dx = e.pos.x - eye_c.0;
        let dz = e.pos.z - eye_c.2;
        dx * dx + dz * dz < 12.0 * 12.0
    });
    assert!(near_country, "country patch is not under the eye");
}

#[test]
fn ledger_confirm_earns_the_chosen_ending() {
    let mut burn = World::campaign(1, Route::Human);
    burn.present_ending();
    burn.tick(&InputFrame::default(), DT);
    assert_eq!(burn.screen, Screen::Ledger);
    assert!(!burn.flags.contains("ending_burn"));
    burn.tick(&act(1), DT);
    assert_eq!(burn.screen, Screen::Playing);
    assert_eq!(burn.finale, Some(0));
    assert!(!burn.flags.contains("ending_burn"));
    let mut t = 0.0f32;
    while !burn.flags.contains("ending_burn") && t < 8.0 {
        let input = burn.bot_input();
        burn.tick(&input, DT);
        t += DT;
    }
    assert!(burn.flags.contains("ending_burn"), "burn flag missing after {t:.1}s");

    let mut chair = World::campaign(1, Route::Chair);
    chair.present_ending();
    chair.tick(&InputFrame::default(), DT);
    assert_eq!(chair.screen, Screen::Ledger);
    chair.tick(&act(4), DT);
    chair.tick(&act(4), DT);
    assert_eq!(chair.focus, 2);
    chair.tick(&act(1), DT);
    assert_eq!(chair.finale, Some(2));
    assert!(!chair.flags.contains("ending_chair"));
    chair.tick(&press(buttons::INTERACT), DT);
    assert!(chair.flags.contains("ending_chair"));

    let mut read = World::campaign(1, Route::Read);
    read.present_ending();
    read.tick(&InputFrame::default(), DT);
    read.tick(&act(4), DT);
    assert_eq!(read.focus, 1);
    read.tick(&act(1), DT);
    assert_eq!(read.finale, Some(1));
    assert!(read.bodies.iter().any(|b| b.alive && b.kind == 1));
    assert!(!read.flags.contains("ending_read"));
    run(&mut read, &hold(buttons::CROUCH), 2.0);
    assert!(!read.flags.contains("ending_read"));
}

#[test]
fn dev_menu_teleports_spawns_and_noclip_flies() {
    let mut w = World::fresh(1);
    w.tick(&act(10), DT);
    assert_eq!(w.screen, Screen::Pause);
    for _ in 0..3 {
        w.tick(&act(4), DT);
    }
    w.tick(&act(1), DT);
    assert_eq!(w.screen, Screen::Dev);
    assert_eq!(w.tab, 0);
    w.tick(&act(4), DT);
    w.tick(&act(1), DT);
    assert_eq!(w.tab, 2, "rows {:?}", w.rows());
    w.tick(&act(1), DT);
    assert!((w.x + 120.0).abs() < 0.1 && (w.z - 900.0).abs() < 0.1, "teleport ({}, {})", w.x, w.z);

    w.tick(&act(2), DT);
    assert_eq!(w.tab, 0);
    w.tick(&act(4), DT);
    w.tick(&act(4), DT);
    w.tick(&act(1), DT);
    assert_eq!(w.tab, 3);
    let before = w.bodies.len();
    w.tick(&act(1), DT);
    assert!(w.bodies.len() > before, "spawn did not add a body");
    assert!(w.bodies.iter().any(|b| b.kind == 1));

    w.tick(&act(2), DT);
    assert_eq!(w.tab, 0);
    for _ in 0..3 {
        w.tick(&act(4), DT);
    }
    w.tick(&act(1), DT);
    assert_eq!(w.tab, 4);
    w.tick(&act(1), DT);
    assert!(w.hour() > 20.0, "hour {}", w.hour());

    w.tick(&act(2), DT);
    w.tick(&act(1), DT);
    assert_eq!(w.tab, 1);
    for _ in 0..4 {
        w.tick(&act(4), DT);
    }
    assert_eq!(w.rows().get(w.focus).map(String::as_str), Some("Noclip"));
    w.tick(&act(1), DT);
    assert!(w.dev.noclip);

    w.tick(&act(2), DT);
    w.tick(&act(2), DT);
    assert_eq!(w.screen, Screen::Pause, "focus {} rows {:?}", w.focus, w.rows());
    assert_eq!(w.rows().get(w.focus).map(String::as_str), Some("Resume"));
    w.tick(&act(1), DT);
    assert_eq!(w.screen, Screen::Playing);

    w.ride.kind = 1;
    w.ride.seat = 1;
    w.ride.x = w.x;
    w.ride.z = w.z;
    let x0 = w.x;
    let z0 = w.z;
    let eye0 = w.eye;
    let mut fly = InputFrame::default();
    fly.move_dir.y = 1.0;
    fly.look.y = 1.0;
    run(&mut w, &fly, 0.5);
    let moved = ((w.x - x0).powi(2) + (w.z - z0).powi(2)).sqrt();
    assert!(moved > 2.0, "noclip moved {moved:.2} from ({x0:.1},{z0:.1}) to ({:.1},{:.1})", w.x, w.z);
    assert!(w.eye > eye0 + 2.0, "eye {} from {eye0}", w.eye);
}

const COVERAGE: &[&str] = &[
    "map_raised", "waypoint_set", "gps_followed", "monocular_tag", "wind_rag", "jam_cleared", "enemy_jam", "weapon_broke",
    "weapon_bought", "locker_used", "syrette", "wound_gunshot", "wound_shrapnel", "wound_burn", "wound_fall", "wound_tourniquet",
    "wound_graze", "fever_warned", "pill_taken", "blackout", "player_rescued", "companion_patched", "companion_overdosed",
    "companion_died", "better_way", "ignite_flare", "ignite_rocket", "ignite_flamer", "ignite_mortar", "ignite_molotov",
    "ignite_frag", "ignite_barrel", "ignite_vehicle", "ignite_person", "ignite_lightning", "ignite_tracer", "ignite_cigarette",
    "cells_500", "enemy_panicked", "animals_fled", "explosion_chain", "rain_extinguished", "stealth_kill", "dart_kill",
    "night_contract", "sleep_used", "safe_house_claimed", "post_cleared", "post_remanned", "technical_driven", "mounted_gun",
    "repair_done", "boat_driven", "bus_taken", "tape_played", "cache_tracker", "diamonds_spent", "contract_a0", "contract_a1",
    "contract_b1", "contract_b2", "contract_b3", "contract_b4", "contract_c1", "contract_c2", "contract_c3", "contract_d1",
    "contract_d2", "ceasefire_ended", "town_burned", "ending_burn", "ending_read", "ending_chair",
];

fn play_route(route: Route, seed: u64) -> BTreeSet<String> {
    let mut w = World::campaign(seed, route);
    let mut goal = String::new();
    let mut stuck = 0.0f32;
    let cap = 60.0 * 900.0;
    let mut t = 0.0f32;
    while t < cap && !w.finished {
        let input = w.bot_input();
        let before = w.goal_name();
        w.tick(&input, DT);
        t += DT;
        let now = w.goal_name();
        if now != before {
            eprintln!("{route:?} seed {seed}: {before} -> {now} at ({:.0},{:.0}) t={t:.0}", w.x, w.z);
            goal = now;
            stuck = 0.0;
        } else {
            stuck += DT;
            let budget = w.goal_budget();
            if stuck > budget && !w.finished {
                panic!(
                    "{route:?} seed {seed} stuck on {now} for {stuck:.0}s (budget {budget:.0}) at ({:.1},{:.1}) step {} flags {}",
                    w.x, w.z, w.step, w.flags.len()
                );
            }
        }
    }
    assert!(w.finished, "{route:?} seed {seed} did not finish by {t:.0}s goal {} at ({:.0},{:.0})", w.goal_name(), w.x, w.z);
    let end = match route {
        Route::Read => "ending_read",
        Route::Chair => "ending_chair",
        _ => "ending_burn",
    };
    assert!(w.flags.contains(end), "{route:?} missing {end}");
    w.flags
}

#[test]
fn bot_plays_all_three_endings() {
    let mut union = BTreeSet::new();
    for seed in [1u64, 2] {
        let mut prefix_a = World::campaign(seed, Route::Human);
        let mut prefix_b = World::campaign(seed, Route::Human);
        for _ in 0..40 {
            let a = prefix_a.bot_input();
            let b = prefix_b.bot_input();
            prefix_a.tick(&a, DT);
            prefix_b.tick(&b, DT);
        }
        assert_eq!(prefix_a.fingerprint(), prefix_b.fingerprint());
        for route in [Route::Human, Route::Read, Route::Chair] {
            union.extend(play_route(route, seed));
        }
    }
    let missing: Vec<_> = COVERAGE.iter().copied().filter(|f| !union.contains(*f)).collect();
    assert!(missing.is_empty(), "coverage missing {missing:?}");
}
