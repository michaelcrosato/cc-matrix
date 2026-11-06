// Late-bound systems: city, bus, venues2, plus those from later modules.
import { city, bus } from './city.js'; import { venues2 } from './venues2.js'; import { ambience } from './ambience.js'; import { favours } from './favours.js'; import { visit } from '../net/visit.js'; import { attract } from './attract.js'; import { festivals, contests, cheese, vesper, pimm, story2, cameos } from './year.js';
export function moreSystems() { return { cameos, ambience, favours, visit, attract, city, bus, venues2, festivals, contests, cheese, vesper, pimm, story2 }; }
