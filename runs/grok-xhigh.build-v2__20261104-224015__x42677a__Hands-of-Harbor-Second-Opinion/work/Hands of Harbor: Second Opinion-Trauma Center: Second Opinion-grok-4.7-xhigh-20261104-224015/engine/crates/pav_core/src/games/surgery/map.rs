//! The eight-way ring, and the two tools that are not on it.
//! Cryoprobe and Dressing are contextual: the ring stays 0–7, and the hazard under the cursor promotes Laser or Scanner to the probe, or any ring tool to a dressing.

use glam::Vec2;

use super::frame::HazardView;
use super::hazard::Hazard;
use super::kinds::*;

/// A hazard the ring can see. The sim and the shell both pass their own snapshot.
pub trait ToolSite {
    fn site_alive(&self) -> bool;
    fn site_kind(&self) -> u8;
    fn site_tool(&self) -> u8;
    fn site_x(&self) -> f32;
    fn site_z(&self) -> f32;
    fn site_radius(&self) -> f32;
}

impl ToolSite for Hazard {
    fn site_alive(&self) -> bool {
        self.alive
    }
    fn site_kind(&self) -> u8 {
        self.kind
    }
    fn site_tool(&self) -> u8 {
        self.tool
    }
    fn site_x(&self) -> f32 {
        self.x
    }
    fn site_z(&self) -> f32 {
        self.z
    }
    fn site_radius(&self) -> f32 {
        self.radius
    }
}

impl ToolSite for HazardView {
    fn site_alive(&self) -> bool {
        self.alive
    }
    fn site_kind(&self) -> u8 {
        self.kind
    }
    fn site_tool(&self) -> u8 {
        self.tool
    }
    fn site_x(&self) -> f32 {
        self.x
    }
    fn site_z(&self) -> f32 {
        self.z
    }
    fn site_radius(&self) -> f32 {
        self.radius
    }
}

/// Left-stick flick. Up is Scalpel, then clockwise: Forceps, Suture, Suction, Laser, Gel, Scanner, IV.
/// Short of 0.55 the stick does not change tools.
pub fn octant(stick: Vec2) -> Option<u8> {
    if stick.length() < 0.55 {
        return None;
    }
    let ang = stick.x.atan2(stick.y);
    Some((ang / std::f32::consts::FRAC_PI_4).round() as i32).map(|i| i.rem_euclid(8) as u8)
}

/// L1 / R1 and the mouse wheel. The ring is eight tools; Cryoprobe and Dressing are not stops on it.
pub fn cycle(tool: u8, forward: bool) -> u8 {
    let step = if forward { 1 } else { 7 };
    tool.wrapping_add(step) % 8
}

/// Tray click. Eight slots along z = 5.4, x = -3.5 + tool. Nothing off that row.
pub fn tray_tool(x: f32, z: f32) -> Option<u8> {
    if (z - 5.4).abs() > 0.7 {
        return None;
    }
    for t in 0..8 {
        let tx = -3.5 + t as f32;
        if (x - tx).abs() < 0.45 {
            return Some(t as u8);
        }
    }
    None
}

/// Promote the ring from the hazard under `(x, z)`.
/// Laser and Scanner become the Cryoprobe on an ember that still wants it.
/// Any ring tool becomes Dressing on a closure, or when every remaining wound is a closure.
/// An already-resolved probe or dressing is folded back to its ring first, so leaving the wound puts the ring tool back.
pub fn contextual_tool<T: ToolSite>(ring: u8, x: f32, z: f32, sites: &[T]) -> u8 {
    if ring == DEFIB || ring == TOOL_KEEP {
        return ring;
    }
    let ring = match ring {
        CRYO => LASER,
        DRESSING => GEL,
        other => other,
    };
    let mut any = false;
    let mut only_dressing = true;
    for site in sites {
        if !site.site_alive() || site.site_kind() == K_HEAT {
            continue;
        }
        any = true;
        if site.site_kind() != K_DRESSING {
            only_dressing = false;
        }
    }
    if any && only_dressing {
        return DRESSING;
    }
    let mut best_d = f32::MAX;
    let mut best_tool = None;
    for site in sites {
        if !site.site_alive() || site.site_kind() == K_HEAT {
            continue;
        }
        let dx = site.site_x() - x;
        let dz = site.site_z() - z;
        let d = (dx * dx + dz * dz).sqrt();
        if d <= site.site_radius() + 0.15 && d < best_d {
            best_d = d;
            best_tool = Some(site.site_tool());
        }
    }
    if let Some(tool) = best_tool {
        if tool == DRESSING {
            return DRESSING;
        }
        if tool == CRYO && (ring == LASER || ring == SCANNER) {
            return CRYO;
        }
    }
    if ring <= 7 { ring } else { ring % 8 }
}
