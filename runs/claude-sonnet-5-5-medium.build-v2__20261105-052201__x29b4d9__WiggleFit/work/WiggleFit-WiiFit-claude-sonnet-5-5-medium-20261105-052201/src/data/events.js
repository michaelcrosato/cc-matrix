// Registry: a designer adds an event by adding a line here and a file in src/events.
import { FruitHat } from '../events/fruitHat.js';
import { Poses } from '../events/poses.js';
import { Cairn } from '../events/cairn.js';
import { LogReps } from '../events/logReps.js';
import { StepClass } from '../events/stepClass.js';
import { Plates } from '../events/plates.js';
import { RoomService } from '../events/roomService.js';
import { Springboard } from '../events/springboard.js';
import { Raft } from '../events/raft.js';
import { GrandHold } from '../events/grandHold.js';
import { StillWater } from '../events/stillWater.js';
import { Plank } from '../events/plank.js';
import { Tug } from '../events/tug.js';
import { IslandLoop } from '../events/islandLoop.js';
export const REGISTRY = [Poses, FruitHat, LogReps, StepClass, Cairn, StillWater, RoomService, Plates, Plank, Springboard, IslandLoop, Raft, Tug, GrandHold];
export const byId = (id) => REGISTRY.find((e) => e.id === id);
