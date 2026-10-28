export const ITEM_DEFS = {
  ricochet: { name: "Rimshot", tier: "weak", shield: true, projectile: true },
  homing: { name: "Tagalong", tier: "mid", shield: true, projectile: true },
  crownseeker: { name: "Crownbite", tier: "strong", shield: false, projectile: true },
  slick: { name: "Butter Drop", tier: "weak", shield: true, hazard: true },
  scatter: { name: "Butter Bunch", tier: "mid", shield: false, hazard: true },
  phantom: { name: "Trick Crate", tier: "weak", shield: false, hazard: true },
  spark: { name: "Pepper", tier: "weak", boost: true },
  triSpark: { name: "Pepper Trio", tier: "mid", boost: true, charges: 3 },
  sparkStorm: { name: "Pepper Rain", tier: "strong", boost: true },
  aegis: { name: "Full Guard", tier: "strong" },
  brownout: { name: "Dimmer", tier: "strong" },
  pilfer: { name: "Snatch", tier: "mid" },
};

export const ITEM_IDS = Object.keys(ITEM_DEFS);
export const WEAK_ITEMS = ITEM_IDS.filter((id) => ITEM_DEFS[id].tier === "weak");
export const MID_ITEMS = ITEM_IDS.filter((id) => ITEM_DEFS[id].tier === "mid");
export const STRONG_ITEMS = ITEM_IDS.filter((id) => ITEM_DEFS[id].tier === "strong");
export const SHIELD_ITEMS = ITEM_IDS.filter((id) => ITEM_DEFS[id].shield);

export function weightsForPlace(place, field) {
  const size = Math.max(1, field);
  const t = size === 1 ? 0 : (Math.max(1, Math.min(size, place)) - 1) / (size - 1);
  const weak = 0.74 - t * 0.6;
  const strong = 0.05 + t * 0.58;
  const mid = Math.max(0, 1 - weak - strong);
  return { weak, mid, strong };
}

export function rollItem(place, field, rng) {
  const weights = weightsForPlace(place, field);
  const roll = rng();
  let pool = STRONG_ITEMS;
  if (roll < weights.weak) pool = WEAK_ITEMS;
  else if (roll < weights.weak + weights.mid) pool = MID_ITEMS;
  const index = Math.min(pool.length - 1, Math.floor(rng() * pool.length));
  return pool[index];
}

export function makeHeld(kind) {
  return { kind, charges: ITEM_DEFS[kind].charges || 1 };
}

export function itemName(kind) {
  return ITEM_DEFS[kind] ? ITEM_DEFS[kind].name : "Nothing";
}
