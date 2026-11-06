# Authoring another defense

Pause during standalone play, select Developer tools, then Shield-layout editor. The encounter continues from the same simulation in a practice category. Controller focus moves between sliders and actions: choose the cell column/row, material and plate, then Place or Remove. Pointer painting is a shortcut: left paints, right removes. Plate travel/period configure vertical movement without regenerating shield occupancy. Refuge position/width changes the protected band.

Preview encounter validates the data and starts it immediately. JSON import/export provides editable text and a downloadable file without a server. Save preset and Load preset store a validated encounter on this device. Invalid imports show an explanation and retain the previous working layout. The included `presets/glass-window.json` is a completed two-plate example with a central opening. Paste its contents into JSON import, import it, and preview. The simulation suite also exports, reloads and wins an edited encounter with ordinary actions.

A version1 encounter has these fields:

| Field | Meaning / validation |
| --- | --- |
| `version` | Exactly1 |
| `name` | Nonempty display name, up to60 characters |
| `refuge: {x,w}` | x≥70, width45–220, right edge≤610 |
| `core: {x,y,hp}` | x630–910; y40–500; integer hp1–3 |
| `plates[]` | 1–4 unique integer IDs; `amplitude`0–90px; `period`3–40s; finite `phase` in radians; x/y retained in data |
| `cells[]` | Up to600 individually persistent cells, absolute base x500–930, y20–520, existing `plate` ID, `material`=`normal` or `reflective`. Duplicate positions on the same plate are rejected. |
| `pursuers` |1–3 guided threats |
| `swirlDelay`, `swirlPeriod` | First windup5–30s; repeat7–35s |
| `introduction` | Optional short transmission |

Each plate’s sine motion offsets its cells’ base y positions. Removing a cell sets its persistent occupancy bit; moving plates never restore it. Collision and aiming use the updated position and wrapped vertical distance. A legal shot corridor must clear the projectile’s radius, not only its center.

The live balance page exposes movement speed, bite and shot cadence, bites per charge, cannon speed/windup, pursuer speed/turn rate, Swirl speed/warning, refuge outage duration and reserve count. Inputs are clamped and applied on a fixed-step boundary; Reset to Defaults restores the base balance values; developer runs remain practice. Freeze/Advance one tick remains operable while paused. Encounter/phase selection, restart, seed loading, spawn threat, collision overlays, invulnerability and infinite charge are available from the same tools. Gameplay editing is unavailable in AI Hub sessions.
