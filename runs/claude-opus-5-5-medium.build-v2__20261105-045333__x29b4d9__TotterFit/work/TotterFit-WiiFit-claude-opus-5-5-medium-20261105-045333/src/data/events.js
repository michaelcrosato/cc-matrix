import { FruitHat } from '../events/fruitHat.js';
import { Poses } from '../events/poses.js';
import { Cairn } from '../events/cairn.js';
import { StillWater } from '../events/stillWater.js';
import { LogReps } from '../events/logReps.js';
import { Plank } from '../events/plank.js';
import { Tug } from '../events/tug.js';
import { StepClass } from '../events/stepClass.js';
import { Plates } from '../events/plates.js';
import { IslandLoop } from '../events/islandLoop.js';
import { RoomService } from '../events/roomService.js';
import { Springboard } from '../events/springboard.js';
import { Raft } from '../events/raft.js';
import { GrandHold } from '../events/grandHold.js';
// The event registry. Removing a line here removes the event: the day table builds from this.
export const EVENTS = { poses: Poses, cairn: Cairn, stillWater: StillWater, logReps: LogReps, plank: Plank, tug: Tug, stepClass: StepClass, plates: Plates, islandLoop: IslandLoop, fruitHat: FruitHat, roomService: RoomService, springboard: Springboard, raft: Raft, grandHold: GrandHold };
export const FREE_ORDER = ['poses', 'fruitHat', 'logReps', 'stepClass', 'cairn', 'roomService', 'plates', 'plank', 'springboard', 'stillWater', 'islandLoop', 'raft', 'tug', 'grandHold'];
export const SESSION_SET = ['poses', 'cairn', 'logReps', 'stepClass', 'plates', 'fruitHat', 'springboard'];
// Island landmark per event: pavilion the player walks to.
export const LANDMARK = { poses: 'sunDeck', stillWater: 'lilyPond', cairn: 'quarry', logReps: 'yard', stepClass: 'bandstand', roomService: 'boardwalk', fruitHat: 'pier', plank: 'pier', springboard: 'pier', tug: 'beach', plates: 'circus', islandLoop: 'beach', raft: 'gazebo', grandHold: 'lighthouse' };
