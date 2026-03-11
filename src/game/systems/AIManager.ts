import { System } from './System';
import { GameEngine } from '../engine';
import { Entity, EntityType, Team, MinionType, Vector2D, GAME_CONFIG, DamageType } from '../types';
import { getDistance, moveTowards } from '../utils';

export class AIManager implements System {
  private engine!: GameEngine;
  private waveInterval = 30000; // 30s
  private lastWaveTime = 0;
  private waveNumber = 0;
  private siegeEveryXWaves = 3;

  // Define simple lanes for top, mid, bot
  private lanes = {
    top: [
      { x: 200, y: 200 },
      { x: 200, y: GAME_CONFIG.MAP_HEIGHT - 200 },
      { x: GAME_CONFIG.MAP_WIDTH - 200, y: GAME_CONFIG.MAP_HEIGHT - 200 }
    ],
    mid: [
      { x: 200, y: 200 },
      { x: GAME_CONFIG.MAP_WIDTH / 2, y: GAME_CONFIG.MAP_HEIGHT / 2 },
      { x: GAME_CONFIG.MAP_WIDTH - 200, y: GAME_CONFIG.MAP_HEIGHT - 200 }
    ],
    bot: [
      { x: 200, y: 200 },
      { x: GAME_CONFIG.MAP_WIDTH - 200, y: 200 },
      { x: GAME_CONFIG.MAP_WIDTH - 200, y: GAME_CONFIG.MAP_HEIGHT - 200 }
    ]
  };

  init(engine: GameEngine) { 
    this.engine = engine;
    console.log("AIManager Init"); 
    this.lastWaveTime = Date.now() - this.waveInterval + 5000; // First wave in 5s
  }

  shutdown() { console.log("AIManager Shutdown"); }

  update(engine: GameEngine, deltaTime: number) {
    const now = Date.now();
    
    // Wave Spawning
    if (now - this.lastWaveTime > this.waveInterval) {
      this.spawnWave();
      this.lastWaveTime = now;
    }

    // Minion AI Update
    for (const entity of engine.entities.values()) {
      if (entity.type === EntityType.MINION && !entity.isDead) {
        this.updateMinion(entity, deltaTime);
      }
    }
  }

  private spawnWave() {
    this.waveNumber++;
    console.log(`Spawning Wave ${this.waveNumber}`);
    
    this.engine.emit('message', {
      text: 'Minions have spawned!',
      type: 'info'
    });
    
    const spawnLane = (laneId: string, waypoints: Vector2D[], team: Team) => {
      const isReverse = team === Team.RED;
      const path = isReverse ? [...waypoints].reverse() : waypoints;
      const startPos = path[0];

      // Spawn 3 Melee
      for (let i = 0; i < 3; i++) {
        this.spawnMinion(MinionType.MELEE, team, laneId, path, { x: startPos.x + (Math.random() * 50 - 25), y: startPos.y + (Math.random() * 50 - 25) });
      }
      // Spawn 3 Ranged
      for (let i = 0; i < 3; i++) {
        this.spawnMinion(MinionType.RANGED, team, laneId, path, { x: startPos.x + (Math.random() * 50 - 25), y: startPos.y + (Math.random() * 50 - 25) });
      }
      
      // Spawn Siege
      if (this.waveNumber % this.siegeEveryXWaves === 0) {
        // Siege minion could be a stronger ranged minion for now
        this.spawnMinion(MinionType.RANGED, team, laneId, path, { x: startPos.x, y: startPos.y }, true);
      }
    };

    spawnLane('top', this.lanes.top, Team.BLUE);
    spawnLane('mid', this.lanes.mid, Team.BLUE);
    spawnLane('bot', this.lanes.bot, Team.BLUE);

    spawnLane('top', this.lanes.top, Team.RED);
    spawnLane('mid', this.lanes.mid, Team.RED);
    spawnLane('bot', this.lanes.bot, Team.RED);
  }

  private spawnMinion(type: MinionType, team: Team, laneId: string, waypoints: Vector2D[], pos: Vector2D, isSiege = false) {
    const id = `minion-${team}-${laneId}-${Date.now()}-${Math.random()}`;
    
    const healthScaling = this.waveNumber * 10;
    const damageScaling = this.waveNumber * 2;

    const baseHealth = type === MinionType.MELEE ? 400 : 250;
    const baseDamage = type === MinionType.MELEE ? 20 : 35;
    const attackRange = type === MinionType.MELEE ? 50 : 450;
    const speed = 2;

    const health = baseHealth + healthScaling + (isSiege ? 200 : 0);
    const damage = baseDamage + damageScaling + (isSiege ? 20 : 0);

    const minion: Entity = {
      id,
      type: EntityType.MINION,
      minionType: type,
      team,
      pos,
      radius: isSiege ? 15 : 10,
      health,
      maxHealth: health,
      speed,
      rotationSpeed: 0.1,
      isMoving: true,
      stoppingDistance: attackRange * 0.8,
      isDead: false,
      shield: 0,
      maxShield: 0,
      isStunned: false,
      isRooted: false,
      isCasting: false,
      attackRange,
      attackDamage: damage,
      attackSpeed: 1.2,
      lastAttackTime: 0,
      goldReward: isSiege ? 40 : (type === MinionType.MELEE ? 21 : 14),
      xpReward: isSiege ? 90 : (type === MinionType.MELEE ? 60 : 30),
      items: [],
      activeBuffs: [],
      activeStatusEffects: [],
      level: 1,
      xp: 0,
      gold: 0,
      skillPoints: 0,
      minionData: {
        laneId,
        currentWaypointIndex: 1 // Skip start pos
      },
      path: waypoints
    };

    this.engine.entities.set(id, minion);

    if (this.engine.superMinionBuffs[team]) {
      this.engine.applyMinionBuff(minion);
    }
  }

  private updateMinion(minion: Entity, deltaTime: number) {
    if (minion.isStunned) return;

    const now = Date.now();
    
    // 1. Find Target (Enemy Minion > Enemy Champion > Enemy Tower)
    let target: Entity | null = null;
    let closestDist = Infinity;

    for (const other of this.engine.entities.values()) {
      if (other.team !== minion.team && !other.isDead) {
        const dist = getDistance(minion.pos, other.pos);
        if (dist <= minion.visionRange! || dist <= minion.attackRange * 1.5) {
          // Priority logic
          let priority = 0;
          if (other.type === EntityType.MINION) priority = 3;
          else if (other.type === EntityType.CHAMPION) priority = 2;
          else if (other.type === EntityType.TOWER) priority = 1;

          if (priority > 0) {
            // Simple closest by priority (could be improved)
            if (dist < closestDist) {
              closestDist = dist;
              target = other;
            }
          }
        }
      }
    }

    // 2. Combat or Move
    if (target && closestDist <= minion.attackRange) {
      minion.isMoving = false;
      if (now - minion.lastAttackTime > 1000 / minion.attackSpeed) {
        // Attack
        minion.lastAttackTime = now;
        this.engine.combatManager.dealDamage(target, {
          amount: minion.attackDamage,
          type: DamageType.PHYSICAL,
          source: 'BASIC_ATTACK',
          sourceOwnerId: minion.id,
          receiverId: target.id
        });
      }
    } else if (target) {
      // Move towards target
      if (!minion.isRooted) {
        minion.isMoving = true;
        minion.pos = moveTowards(minion.pos, target.pos, minion.speed);
      }
    } else {
      // Move along lane
      if (!minion.isRooted && minion.path && minion.minionData) {
        const targetPos = minion.path[minion.minionData.currentWaypointIndex];
        if (targetPos) {
          minion.isMoving = true;
          const distToWaypoint = getDistance(minion.pos, targetPos);
          if (distToWaypoint < 10) {
            minion.minionData.currentWaypointIndex++;
          } else {
            minion.pos = moveTowards(minion.pos, targetPos, minion.speed);
          }
        } else {
          minion.isMoving = false; // Reached end of lane
        }
      }
    }
  }
}
