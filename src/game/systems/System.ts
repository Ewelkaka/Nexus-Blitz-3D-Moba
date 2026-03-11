import { GameEngine } from '../engine';

export interface System {
  init(engine: GameEngine): void;
  shutdown(): void;
  update?(engine: GameEngine, deltaTime: number): void;
  fixedUpdate?(engine: GameEngine, deltaTime: number): void;
  lateUpdate?(engine: GameEngine, deltaTime: number): void;
}
