import { System } from './System';
import { GameEngine } from '../engine';

export class EconomyManager implements System {
  init(engine: GameEngine) { console.log("EconomyManager Init"); }
  shutdown() { console.log("EconomyManager Shutdown"); }
}
