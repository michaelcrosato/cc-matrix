# Unique defects found by audio / simulation verification

Count these with the root issue ledger; do not count tests, inspection suggestions, or repeated failures as new issues.

| ID | Severity | Detecting check | Defect | Resolution |
| --- | --- | --- | --- | --- |
| SIM-001 | Critical | Fortress-overflow collision at wave boundary | The scheduler resolved a successful retreat before processing current-tick collisions and objective overflow, violating declared loss priority. | Fixed: wave advancement now follows combat and failure resolution. Regression passed. |
| SIM-002 | Moderate | Dev act jump scheduling | `dev('act')` retained the old wave's spawn index, skipping new encounter groups. | Fixed: act jumps reset the scheduler. Regression passed. |
| SIM-003 | Moderate | Modified-state snapshot restore | Complete snapshot/restore omitted live balance values, so a restored modified run would diverge from its continuation. | Fixed: snapshot state includes balance and restoration retains it. Regression passed. |
| SIM-004 | Moderate | Complete default solo bot campaign after timing adjustment | Competent early carrier kills prevented every gravity anchor from being deployed, so a full normal win missed the mandatory gravity introduction. | Fixed: explicit authored anchor introduction. Full no-cheat solo introduction regression passed. |

Audio instrument and native song probes found no unique runtime sound defect. Syntax and style corrections made before first verification are not counted as testing discoveries. Actual audio probes used Chromium's `OfflineAudioContext`, not human listening or physical speakers.
