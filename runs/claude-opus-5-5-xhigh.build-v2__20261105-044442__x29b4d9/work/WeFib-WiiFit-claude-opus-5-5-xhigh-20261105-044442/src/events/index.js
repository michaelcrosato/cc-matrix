// The registry: cut an event by removing its line, and the programme quietly skips it.
import { FruitHat } from './fruitHat.js';
import { Poses } from './poses.js';
import { Cairn } from './cairn.js';
import { StillWater } from './stillWater.js';
import { LogReps } from './logReps.js';
import { Plank } from './plank.js';
import { Tug } from './tug.js';
import { StepClass } from './stepClass.js';
import { Plates } from './plates.js';
import { IslandLoop } from './islandLoop.js';
import { RoomService } from './roomService.js';
import { Springboard } from './springboard.js';
import { Raft, RaftDoll } from './raft.js';
import { GrandHold } from './grandHold.js';
import { Doll } from '../art/doll.js';

RaftDoll.cls = Doll;
export const EVENT_CLASSES = { fruitHat: FruitHat, poses: Poses, cairn: Cairn, stillWater: StillWater, logReps: LogReps, plank: Plank, tug: Tug, stepClass: StepClass, plates: Plates, islandLoop: IslandLoop, roomService: RoomService, springboard: Springboard, raft: Raft, grandHold: GrandHold };
export const hasEvent = (id) => !!EVENT_CLASSES[id];
