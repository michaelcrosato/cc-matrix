// The car table: physics rows (carphysics.js, Appendix B) plus what the menus, sound and models need.
import { CARS as PHYS } from './carphysics.js';
const row = (id, name, marque, year, price, where, cylinders, exhaust, paint, brochure, shortName, extra = {}) => ({ id, name, marque, year, price, where, cylinders, exhaust, paint, brochure, shortName, phys: PHYS[id], ...extra });
export const CAR_LIST = [
  row('pico', 'TSUBAME PICO 660', 'TSUBAME', 1991, 4800, 'used', 3, { cut: 2600, bite: 0.5, loud: 0.8 }, 'sky', 'A city car of 660 cc, made to fit where other cars can only wish to go. At 720 kg it has little to hold back and little to push. It teaches the first lesson: momentum is expensive.', 'PICO 660'),
  row('kite', 'TSUBAME KITE 1.6 RS', 'TSUBAME', 1996, 12500, 'used', 4, { cut: 3200, bite: 0.7, loud: 0.9 }, 'red', 'The Kite was a family hatchback until the engineers stayed late. The 1.6-litre engine asks to be revved, and the front tyres do all of the work. Brake before the corner and it will thank you.', 'KITE RS', { fenn: 'A previous owner. One careful weekend. She has 88,000 kilometres and no regrets.' }),
  row('ginga', 'KAMINARI GINGA S', 'KAMINARI', 1994, 14800, 'used', 6, { cut: 2400, bite: 0.6, loud: 1 }, 'white', 'A front-engined, rear-drive coupe in good used condition. The steering speaks clearly and the rear axle answers the right foot. Many drivers learned to drive in this car. Some learned twice.', 'GINGA S', { fenn: 'One owner. He learned a great deal, and then he bought a sedan.' }),
  row('moth', 'CASTELLAN MOTH 1.8', 'CASTELLAN', 1998, 24000, 'castellan', 4, { cut: 2800, bite: 0.8, loud: 0.85 }, 'green', 'Two seats, one purpose, 860 kg. Castellan removed what the car did not need, then removed a little more. The power figure is modest. That is not the figure that matters.', 'MOTH 1.8', { fenn: 'I am told the door is optional. I did not ask a second time.' }),
  row('ryu', 'KAMINARI RYU 2.0T', 'KAMINARI', 1999, 39000, 'kaminari', 4, { cut: 2600, bite: 0.8, loud: 1 }, 'blue', 'Turbocharged, four-wheel drive, born for a rally rule that no longer exists. Power arrives late and then all at once. In the rain, very little can keep it in sight.', 'RYU 2.0T', { fenn: 'Four driven wheels. Please count them. I always do.' }),
  row('longhorn', 'IRONWOOD LONGHORN 428', 'IRONWOOD', 1969, 47000, 'ironwood', 8, { cut: 1500, bite: 0.9, loud: 1.3 }, 'navy', 'A large American coupe of the old school: seven litres, 420 PS, and brakes that remember a simpler time. It does not like corners, and it says so. On a long straight nobody asks it to apologise.', 'LONGHORN 428', { fenn: 'Seven litres. I had to sit down. Please, take your time.' }),
  row('brandt32', 'BRANDT 3.2 CSR', 'BRANDT', 2000, 58000, 'brandt', 6, { cut: 3000, bite: 0.6, loud: 1 }, 'slate', 'A four-door sedan, according to the catalogue. The straight six reaches 7,900 rpm with an even temper, and the balance is close to 50:50. Businessmen bought it for the leather. Others did not.', 'BRANDT 3.2', { fenn: 'It has a place for your briefcase. It will not be used.' }),
  row('heck', 'BRANDT HECK 3.6', 'BRANDT', 1997, 92000, 'brandt', 6, { cut: 2300, bite: 0.9, loud: 1.1 }, 'mist', 'The engine sits behind the rear axle, where Brandt has insisted for forty years that it belongs. Traction is wonderful. Lifting in mid-corner is not recommended. This is written in the manual.', 'HECK 3.6', { fenn: 'Please read page 41 of the manual. Then, please, read it again.' }),
  row('libeccio', 'VESPUCCI LIBECCIO', 'VESPUCCI', 1995, 135000, 'vespucci', 8, { cut: 3400, bite: 0.8, loud: 1.2 }, 'red', 'Named for the south-west wind. A mid-engined V8 with a low nose and a high opinion of itself. Light on the front wheels at speed. Precise, if you are.', 'LIBECCIO', { fenn: 'One thousand two hundred and fifty kilograms. Excuse me. It is the dust in here.' }),
  row('kiteCup', 'TSUBAME KITE CUP RACER', 'TSUBAME', 2000, 0, 'prize', 4, { cut: 3800, bite: 1, loud: 1.2 }, 'orange', 'A stripped Kite for a one-make series, with a roll cage where the rear seats used to be. 210 PS through the front wheels asks for a patient foot.', 'KITE CUP'),
  row('ryuRally', 'KAMINARI RYU RALLY SPEC', 'KAMINARI', 1999, 0, 'prize', 4, { cut: 2800, bite: 1, loud: 1.25 }, 'cyan', 'Works gravel specification: long travel, short gearing, and a bonnet that has seen weather. On dirt it is another species. On tarmac it seems to be looking for the exit.', 'RYU RALLY'),
  row('works', 'KAMINARI GINGA WORKS GT', 'KAMINARI', 2000, 310000, 'prize', 6, { cut: 4000, bite: 1, loud: 1.4 }, 'plum', 'The Ginga as the factory would like to remember it. 560 PS, carbon panels, and a wing with its own opinion about corner speed.', 'WORKS GT', { afterA: true }),
  row('corsa', 'VESPUCCI LIBECCIO CORSA', 'VESPUCCI', 1998, 520000, 'prize', 10, { cut: 4600, bite: 1, loud: 1.45 }, 'sand', 'Homologated in the strictest sense of the word: Vespucci built twenty-five road cars so that it could race this one. 620 PS. 1,100 kg. Do not lift.', 'CORSA', { afterA: true }),
  row('type9', 'HALCYON TYPE 9 PROTOTYPE', 'HALCYON WORKS', 2001, 0, 'prize', 12, { cut: 5200, bite: 1, loud: 1.5 }, 'teal', 'Built by a small works team on the Peninsula, in a shed, for one race. 780 PS, 930 kg, a closed cockpit and no radio. It stops as well as it goes, which takes some time to believe.', 'TYPE 9'),
];
export const CARS = Object.fromEntries(CAR_LIST.map((c) => [c.id, c]));
export const SHOWROOMS = [
  { id: 'used', name: 'USED LOT', line: 'ONE CAREFUL OWNER, OR THEREABOUTS.' },
  { id: 'kaminari', name: 'KAMINARI', line: 'SERIOUS CARS FOR SERIOUS WEEKENDS.' },
  { id: 'brandt', name: 'BRANDT', line: 'POLITE AND TERRIFYING SINCE 1948.' },
  { id: 'imports', name: 'IMPORTS', line: 'CASTELLAN, IRONWOOD AND VESPUCCI. A DIFFICULT FAMILY.' },
];
/** Dealer stock: the used lot and three showrooms; the two road-going prize cars join after Licence A. */
export function showroomCars(room, licenceA = false) {
  if (room === 'used') return CAR_LIST.filter((c) => c.where === 'used');
  if (room === 'kaminari') return CAR_LIST.filter((c) => c.where === 'kaminari' || (licenceA && c.id === 'works'));
  if (room === 'brandt') return CAR_LIST.filter((c) => c.where === 'brandt');
  return CAR_LIST.filter((c) => ['castellan', 'ironwood', 'vespucci'].includes(c.where) || (licenceA && c.id === 'corsa'));
}
export const PAINTS = ['red', 'orange', 'sand', 'lime', 'green', 'teal', 'navy', 'blue', 'sky', 'cyan', 'white', 'mist', 'slate', 'night', 'plum', 'ink'];
export const RIMS = [
  { id: 0, name: 'STEEL', hub: 'slate', spoke: 'mist' },
  { id: 1, name: 'FIVE SPOKE', hub: 'white', spoke: 'mist' },
  { id: 2, name: 'GOLD MESH', hub: 'sand', spoke: 'orange' },
  { id: 3, name: 'BLACK RACE', hub: 'ink', spoke: 'red' },
];
