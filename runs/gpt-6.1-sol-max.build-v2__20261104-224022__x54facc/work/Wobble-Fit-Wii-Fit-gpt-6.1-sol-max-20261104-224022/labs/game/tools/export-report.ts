/** @file Exports the exact canonical in-game report for the game importer. */
import { writeFileSync } from 'node:fs';
import { REPORT } from '../ui/about-data';
writeFileSync('../exit-interview.json', JSON.stringify(REPORT, null, 2) + '\n');
