// Events as data. Rounds: [track, laps, {hour, rain}]. pool entries: car id plus an optional tuned install.
const T1 = { parts: { exhaust: 1, intake: 1, engine: 1, suspension: 1, weight: 1 }, tyre: 'sport' };
const T2 = { parts: { exhaust: 1, intake: 1, engine: 2, suspension: 2, weight: 2, brakes: 1 }, tyre: 'semi' };
const r = (track, laps, o = {}) => ({ track, laps, ...o });
export const POINTS = [10, 8, 6, 5, 4, 3, 2, 1], PRIZE_RATIO = [1, 0.6, 0.4, 0.2];
export const EVENTS = [
  { id: 'dawn', name: 'DAWN PATROL CUP', needs: 'C', limit: { maxPS: 210 }, limitText: '210 PS OR LESS', rounds: [r('kestrel', 2), r('harbour', 2, { hour: 18.5 }), r('kestrel', 3)], pace: [0.82, 0.87], pool: [['pico'], ['kite'], ['moth']], prize: 2500, bonus: 5000,
    intro: 'A CUP FOR THOSE WHO RISE EARLY AND HAVE NOT YET SPENT MUCH.' },
  { id: 'fellow', name: 'FRONT-DRIVE FELLOWSHIP', needs: 'C', limit: { maxPS: 230, layout: 'FF' }, limitText: 'FRONT DRIVE, 230 PS OR LESS', rounds: [r('cedar', 2), r('saltline', 4)], pace: [0.84, 0.88], pool: [['kite'], ['kite', T1], ['pico', T1]], prize: 3500, bonus: 8000,
    intro: 'THE MEMBERS MEET ANNUALLY TO DISCUSS UNDERSTEER. THEY ARE IN FAVOUR.' },
  { id: 'feather', name: 'FEATHERWEIGHT TROPHY', needs: 'B', limit: { maxKg: 1100 }, limitText: '1,100 KG OR LESS', rounds: [r('cedar', 3), r('kestrel', 3), r('harbour', 3, { hour: 18.5 })], pace: [0.85, 0.89], pool: [['moth'], ['kiteCup'], ['pico', T1]], prize: 5000, bonus: 12000, prizeCar: 'kiteCup',
    intro: 'THE SCALES ARE CHECKED EACH MORNING. THE DRIVERS HAVE STOPPED EATING LUNCH.' },
  { id: 'society', name: 'REAR-DRIVE SOCIETY', needs: 'B', limit: { layout: 'FR' }, limitText: 'FRONT ENGINE, REAR DRIVE', rounds: [r('kestrel', 3, { rain: true }), r('saltline', 5)], pace: [0.87, 0.91], pool: [['ginga'], ['brandt32'], ['longhorn']], prize: 6000, bonus: 15000,
    intro: 'A GENTLE SOCIETY. IT MEETS IN THE RAIN, ON PURPOSE.' },
  { id: 'clay', name: 'RED CLAY RALLY', needs: 'B', limit: {}, limitText: 'ANY CAR. DIRT TYRES ADVISED', rally: true, rounds: [r('redclay', 2), r('redclay', 2), r('redclay', 2)], pace: [0.86, 0.92], pool: [['ryu'], ['ryuRally']], prize: 7000, bonus: 10000, prizeCar: 'ryuRally',
    intro: 'THREE LEGS AGAINST ONE RIVAL EACH. WIN TWO. THE CLOCK DECIDES.' },
  { id: 'touring', name: 'PENINSULA TOURING TROPHY', needs: 'A', limit: { maxPS: 520 }, limitText: '520 PS OR LESS', rounds: [r('cedar', 3), r('harbour', 3, { hour: 21 }), r('saltline', 6), r('kestrel', 4)], pace: [0.89, 0.93], pool: [['brandt32'], ['heck'], ['libeccio'], ['longhorn'], ['ryu', T1]], prize: 12000, bonus: 50000, prizeCar: 'corsa',
    intro: 'FOUR ROUNDS, THE WHOLE PENINSULA. BRING A SANDWICH.' },
  { id: 'h200', name: 'HARBOUR LIGHTS 200', needs: 'A', limit: {}, limitText: 'ANY CAR. ONE PIT STOP NEEDED', endurance: true, rounds: [r('harbour', 10, { hour: 18.5, hourEnd: 21 })], pace: [0.88, 0.92], pool: [['heck'], ['libeccio'], ['brandt32', T2]], prize: 40000, bonus: 20000, prizeCar: 'works', field: 8,
    intro: 'TEN LAPS, DUSK INTO NIGHT. THE TYRES WILL NOT LAST. THE FUEL WILL NOT LAST. PLEASE STOP ONCE.' },
  { id: 'gp', name: 'THE HALCYON GRAND PRIX', needs: 'A', needsEvent: ['touring', 'h200'], limit: {}, limitText: 'ANY CAR', rounds: [r('kestrel', 5), r('cedar', 5), r('saltline', 8), r('harbour', 5, { hour: 21 })], pace: [0.92, 0.955], pool: [['works'], ['corsa'], ['libeccio', T2]], prize: 50000, bonus: 100000, prizeCar: 'type9', ending: true,
    intro: 'THE LAST EVENT. THE PENINSULA WILL BE WATCHING, IN ITS QUIET WAY.' },
];
export const EVENT = Object.fromEntries(EVENTS.map((e) => [e.id, e]));
export const DRIVERS = ['A. MORETTI', 'K. HANDA', 'J. OAKES', 'L. BRANDVOLD', 'S. AOKI', 'P. DELACROIX', 'T. WREN', 'R. OSEI', 'M. VANTER', 'D. IGARASHI', 'C. HOLLOWAY', 'E. RASK'];
