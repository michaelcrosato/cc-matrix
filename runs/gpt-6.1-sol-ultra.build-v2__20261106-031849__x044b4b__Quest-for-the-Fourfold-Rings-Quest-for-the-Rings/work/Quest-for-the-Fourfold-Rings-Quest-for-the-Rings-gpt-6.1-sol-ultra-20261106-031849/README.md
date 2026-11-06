# Quest for the Fourfold Rings

Open the sibling HTML file in a modern browser. Everything needed to play is inside that file; a server, network connection, build tool and neighboring assets are unnecessary. Online shared-world co-op is provided when AI Hub opens the game in a session. Standalone has solo play with a full companion and couch co-op, without an online lobby.

Recover the rings from the Hollow Crown, Silent Choir, Lost Suns and Hunting Clock. Each castle has two authored chambers. The opening castle is mandatory; choose the other three in any order. Two optional cache detours trade another Dread step for immediate shelter or healing. Bind the dragon at four stations and escape through the waystone.

| Action | Keyboard / mouse | Standard controller |
|---|---|---|
| Move | WASD or arrows | Left stick |
| Aim | Mouse | Right stick |
| Primary | Left mouse / J | R2 |
| Class power | Right mouse / K | L2 |
| Dodge | Space | Cross / A |
| Context, pass, revive | E; hold for revive / willing pass | Triangle / Y |
| Companion objective | Q | R1 |
| Objective | Tab | Square / X |
| Pause | Escape | Options |

An unclaimed controller joins on Options and takes the second hero at a safe transition. Keyboard plus controller and two-controller arrangements use the same game. Settings include native rebinding, PlayStation or Xbox glyphs, aim assistance, persistent crystal outlines, high contrast, reduced motion, screen shake, captions and independent audio buses. Music defaults to 10%. Touch uses invisible movement and aiming drags, automatic targeting/primary attacks, and contextual class/evade/interaction controls.

Continue restores the latest safe transition, including the second-room entrance, completed ring shortcuts, Dread and spent cache rewards. Failed-room Retry costs one Dread, capped at six. Abandon returns to the map without refunding the entry. Travel preserves wounds; chamber entry guarantees at least three health, a retry restores five, and the Hidden Mercy cache restores the whole team to five. A failed finale resets all four binding stations together and retains the four campaign rings. Storage failure leaves an in-memory checkpoint for the visit.

Dev Mode is under Pause. Its room jump, heal/revive, invulnerability, safe enemy/hazard spawn and live balance controls mark an expedition assisted. Collision, telegraph and navigation overlays are observational. Online guests can inspect; shared mutations belong to the host. The title begins a disposable, clearly labeled showcase after ten seconds idle; any meaningful input returns to the title.

Development and evidence:

```sh
node tools/build.mjs
node tools/test.mjs
```

Optional suite arguments: `syntax simulation playthrough network integration browser audio hub hubgame hubcampaign`. The test entry point prints failures and one final count. Simulation uses the native 1/120-second stepping model. Browser drivers use the installed Playwright Python environment; the Hub tests start and stop their own loopback server on an OS-selected port. The supplied Hub harness, bridge and round files stay in `vendor/hub` and are not bundled.

`docs/research.md`, `docs/engine.md`, `docs/network.md`, `docs/audio.md`, `docs/content.md` and the evidence ledger document provenance and the limits of verification. The script-driven campaign is a knowledgeable input stand-in, not a measured first-time human play duration. Physical pads, touch devices, TV viewing, remote humans and subjective listening were unavailable. The root `exit-interview.json` is also included in the in-game About screens.
