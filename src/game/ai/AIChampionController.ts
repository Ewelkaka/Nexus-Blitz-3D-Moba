import { Entity, EntityType, Team } from '../types';
import { GameEngine } from '../engine';
import { getDistance } from '../utils';

export enum AIState {
  IDLE,
  MOVE_TO_LANE,
  FARM,
  ATTACK_ENEMY_CHAMPION,
  RETREAT,
  RECALL,
  PUSH_LANE,
  DEFEND_STRUCTURE
}

export class AIChampionController {
  private engine: GameEngine;
  private entityId: string;
  public currentState: AIState = AIState.IDLE;
  private lastUpdate: number = 0;
  private updateInterval: number = 300; // 0.3 seconds
  private lane: 'top' | 'mid' | 'bot' = 'mid';

  constructor(engine: GameEngine, entityId: string) {
    this.engine = engine;
    this.entityId = entityId;
  }

  public update() {
    const now = Date.now();
    if (now - this.lastUpdate < this.updateInterval) return;
    this.lastUpdate = now;

    const entity = this.engine.entities.get(this.entityId);
    if (!entity || entity.isDead) return;

    this.evaluateGameState(entity);
    this.executeStateBehavior(entity);
  }

  private evaluateGameState(entity: Entity) {
    // Recall if low health and safe
    if (entity.health / entity.maxHealth < 0.2) {
      this.currentState = AIState.RECALL;
      return;
    }

    // Retreat if low health
    if (entity.health / entity.maxHealth < 0.4) {
      this.currentState = AIState.RETREAT;
      return;
    }

    // Attack if enemy champion in range
    const enemies = Array.from(this.engine.entities.values()).filter(
      e => e.type === EntityType.CHAMPION && e.team !== entity.team && !e.isDead
    );
    
    const nearbyEnemy = enemies.find(e => getDistance(entity.pos, e.pos) < entity.attackRange + 200);
    if (nearbyEnemy) {
      this.currentState = AIState.ATTACK_ENEMY_CHAMPION;
      return;
    }

    // Default behavior: Farm
    this.currentState = AIState.FARM;
  }

  private executeStateBehavior(entity: Entity) {
    switch (this.currentState) {
      case AIState.FARM:
        this.farm(entity);
        break;
      case AIState.ATTACK_ENEMY_CHAMPION:
        this.attackChampion(entity);
        break;
      case AIState.RETREAT:
        this.retreat(entity);
        break;
      case AIState.RECALL:
        this.recall(entity);
        break;
    }
  }

  private farm(entity: Entity) {
    const minions = Array.from(this.engine.entities.values()).filter(
      e => e.type === EntityType.MINION && e.team !== entity.team && !e.isDead
    );
    
    if (minions.length > 0) {
      const target = minions.reduce((prev, curr) => 
        getDistance(entity.pos, prev.pos) < getDistance(entity.pos, curr.pos) ? prev : curr
      );
      
      const dist = getDistance(entity.pos, target.pos);
      if (dist < entity.attackRange) {
        this.engine.handleInput('ATTACK', { targetId: target.id }, entity.id);
      } else {
        this.engine.handleInput('MOVE', { x: target.pos.x, y: target.pos.y, isWorld: true }, entity.id);
      }
    }
  }

  private attackChampion(entity: Entity) {
    const enemies = Array.from(this.engine.entities.values()).filter(
      e => e.type === EntityType.CHAMPION && e.team !== entity.team && !e.isDead
    );
    
    const target = enemies.find(e => getDistance(entity.pos, e.pos) < entity.attackRange + 200);
    if (target) {
      this.engine.handleInput('ATTACK', { targetId: target.id }, entity.id);
      
      // Use abilities
      if (entity.abilities?.q) {
        this.engine.castAbilityQ(entity);
      }
    }
  }

  private retreat(entity: Entity) {
    const basePos = entity.team === Team.BLUE ? { x: 100, y: 100 } : { x: 4900, y: 4900 };
    this.engine.handleInput('MOVE', { x: basePos.x, y: basePos.y, isWorld: true }, entity.id);
  }

  private recall(entity: Entity) {
    // Placeholder for recall logic
    this.retreat(entity);
  }
}
