import { Entity, EntityType, Team, Vector2D, Ability, Projectile, GAME_CONFIG, MinionType, GameState, EffectType, BuffType, StatusEffect, StatusEffectType, GameMode, EventType, DamageData, DamageType, Item, AbilitySlot, AbilityType, AnimationState, HEROES } from './types';
import { getDistance, moveTowards, getAngle } from './utils';
import { soundManager } from './SoundManager';
import { Pathfinder } from './pathfinding';
import { EconomySystem } from './systems/EconomySystem';
import { ShopSystem } from './systems/ShopSystem';
import { CombatManager } from './systems/CombatManager';
import { StatusEffectController } from './systems/StatusEffectController';
import { AIChampionController } from './ai/AIChampionController';
import { getHeroAbilities } from './heroData';
import { MapGenerator, MonsterCamp } from './MapGenerator';

export class GameEngine {
  entities: Map<string, Entity> = new Map();
  aiControllers: Map<string, AIChampionController> = new Map();
  monsterCamps: MonsterCamp[] = [];
  lanes: { [key: string]: Vector2D[] } = {};
  projectiles: Projectile[] = [];
  projectilePool: Projectile[] = [];
  playerID: string = 'player-1';
  camera: Vector2D = { x: 0, y: 0 };
  lastUpdate: number = Date.now();
  startTime: number = Date.now();
  
  // Pathfinding
  pathfinder: Pathfinder;
  
  // Combat Systems
  combatManager: CombatManager;
  statusEffectController: StatusEffectController;
  economySystem: EconomySystem;
  shopSystem: ShopSystem;

  // Input state
  mousePos: Vector2D = { x: 0, y: 0 };
  targetMovePos: Vector2D | null = null;

  // Game State
  gold: { [key in Team]: number } = { [Team.BLUE]: 0, [Team.RED]: 0, [Team.NEUTRAL]: 0 };
  goldGainMultiplier: { [key in Team]: number } = { [Team.BLUE]: 1, [Team.RED]: 1, [Team.NEUTRAL]: 1 };
  gameState: GameState = GameState.IN_GAME;
  gameMode: GameMode = GameMode.STANDARD;
  gameStartTime: number = 0;
  lastEventTime: number = Date.now();
  activeEvent: EventType | null = null;
  activeEventEndTime: number = 0;
  destroyedInhibitors: Set<string> = new Set();
  superMinionBuffs: { [key in Team]: boolean } = { [Team.BLUE]: false, [Team.RED]: false, [Team.NEUTRAL]: false };

  // Event System
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  public multiplayer: boolean = false;

  public soundQueue: { sound: string, volume: number }[] = [];

  playSound(sound: string, volume: number = 0.5) {
    if (this.multiplayer && typeof window === 'undefined') {
      this.soundQueue.push({ sound, volume });
    } else {
      soundManager.play(sound, volume);
    }
  }

  constructor() {
    this.pathfinder = new Pathfinder(100); // 100x100 grid cells
    this.combatManager = new CombatManager();
    this.statusEffectController = new StatusEffectController();
    this.economySystem = new EconomySystem();
    this.shopSystem = new ShopSystem();
  }

  on(event: string, listener: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
    return () => this.off(event, listener);
  }

  off(event: string, listener: (data: any) => void) {
    this.listeners.get(event)?.delete(listener);
  }

  emit(event: string, data: any) {
    this.listeners.get(event)?.forEach(listener => listener(data));
  }

  init(playerHeroId: string, players?: {id: string, heroId: string, team: Team}[]) {
    this.gameStartTime = Date.now();
    this.gameState = GameState.IN_GAME;
    this.entities.clear();
    this.projectiles = [];
    this.gold = { [Team.BLUE]: 0, [Team.RED]: 0, [Team.NEUTRAL]: 0 };
    this.goldGainMultiplier = { 
      [Team.BLUE]: this.gameMode === GameMode.BLITZ ? 2 : 1, 
      [Team.RED]: this.gameMode === GameMode.BLITZ ? 2 : 1, 
      [Team.NEUTRAL]: 1 
    };
    this.pathfinder.reset();
    this.combatManager.init(this);
    this.statusEffectController.init();
    this.lastEventTime = Date.now();
    this.activeEvent = null;
    
    // Generate Map
    this.lanes = MapGenerator.generateLanes();
    const terrain = MapGenerator.generateTerrain();
    terrain.forEach(t => {
      this.entities.set(t.id, t);
      this.pathfinder.markObstacle(t.pos, t.radius);
    });

    this.monsterCamps = MapGenerator.generateMonsterCamps();
    this.monsterCamps.forEach(camp => {
      this.spawnCamp(camp);
    });

    if (players && players.length > 0) {
      players.forEach(p => {
        const hero = HEROES.find(h => h.id === p.heroId) || HEROES[0];
        const heroAbilities = getHeroAbilities(hero.id);
        const isBlue = p.team === Team.BLUE;
        
        const playerEntity: Entity = {
          id: p.id,
          type: EntityType.CHAMPION,
          heroId: hero.id,
          team: p.team,
          pos: { 
            x: isBlue ? 200 : GAME_CONFIG.MAP_WIDTH - 200, 
            y: GAME_CONFIG.MAP_HEIGHT / 2 + (Math.random() * 200 - 100)
          },
          radius: 25,
          health: hero.stats.health,
          maxHealth: hero.stats.health,
          mana: hero.stats.mana,
          maxMana: hero.stats.mana,
          gold: 500,
          speed: hero.stats.speed,
          attackRange: hero.stats.attackRange,
          attackDamage: hero.stats.attackDamage,
          attackSpeed: hero.stats.attackSpeed,
          resistance: hero.stats.resistance,
          lastAttackTime: 0,
          isDead: false,
          shield: 0,
          maxShield: 0,
          visionRange: 800,
          isVisible: true,
          rotationSpeed: 0,
          isMoving: false,
          stoppingDistance: 0,
          isStunned: false,
          isRooted: false,
          isCasting: false,
          animationState: AnimationState.IDLE,
          items: [],
          activeBuffs: [],
          activeStatusEffects: [],
          level: 1,
          xp: 0,
          skillPoints: 1,
          kills: 0,
          deaths: 0,
          assists: 0,
          totalGoldEarned: 500,
          abilities: {
            passive: { data: { id: 'passive', name: 'Passive', description: '', slot: AbilitySlot.PASSIVE, type: AbilityType.SELF, castTime: 0, cooldown: 0, manaCost: 0, range: 0, baseValue: 0, valuePerLevel: 0 }, level: 1, maxLevel: 1, lastUsed: 0, isCasting: false },
            q: { data: heroAbilities.q, level: 0, maxLevel: 5, lastUsed: 0, isCasting: false },
            w: { data: heroAbilities.w, level: 0, maxLevel: 5, lastUsed: 0, isCasting: false },
            e: { data: heroAbilities.e, level: 0, maxLevel: 5, lastUsed: 0, isCasting: false },
            r: { data: heroAbilities.r, level: 0, maxLevel: 3, lastUsed: 0, isCasting: false }
          }
        };
        this.entities.set(playerEntity.id, playerEntity);
        
        if (!this.multiplayer && p.id !== this.playerID) {
          this.aiControllers.set(playerEntity.id, new AIChampionController(this, playerEntity.id));
        }
      });
    } else {
      // Create Single Player
      const hero = HEROES.find(h => h.id === playerHeroId) || HEROES[0];
      const heroAbilities = getHeroAbilities(hero.id);

      const player: Entity = {
        id: this.playerID,
        type: EntityType.CHAMPION,
        heroId: hero.id,
        team: Team.BLUE,
        pos: { x: 200, y: GAME_CONFIG.MAP_HEIGHT / 2 },
        radius: 25,
        health: hero.stats.health,
        maxHealth: hero.stats.health,
        mana: hero.stats.mana,
        maxMana: hero.stats.mana,
        gold: 500,
        speed: hero.stats.speed,
        attackRange: hero.stats.attackRange,
        attackDamage: hero.stats.attackDamage,
        attackSpeed: hero.stats.attackSpeed,
        resistance: hero.stats.resistance,
        lastAttackTime: 0,
        isDead: false,
        shield: 0,
        maxShield: 0,
        visionRange: 800,
        isVisible: true,
        rotationSpeed: 0,
        isMoving: false,
        stoppingDistance: 0,
        isStunned: false,
        isRooted: false,
        isCasting: false,
        animationState: AnimationState.IDLE,
        items: [],
        activeBuffs: [],
        activeStatusEffects: [],
        level: 1,
        xp: 0,
        skillPoints: 1,
        abilities: {
          passive: { data: { id: 'passive', name: 'Passive', description: '', slot: AbilitySlot.PASSIVE, type: AbilityType.SELF, castTime: 0, cooldown: 0, manaCost: 0, range: 0, baseValue: 0, valuePerLevel: 0 }, level: 1, maxLevel: 1, lastUsed: 0, isCasting: false },
          q: { data: heroAbilities.q, level: 0, maxLevel: 5, lastUsed: 0, isCasting: false },
          w: { data: heroAbilities.w, level: 0, maxLevel: 5, lastUsed: 0, isCasting: false },
          e: { data: heroAbilities.e, level: 0, maxLevel: 5, lastUsed: 0, isCasting: false },
          r: { data: heroAbilities.r, level: 0, maxLevel: 3, lastUsed: 0, isCasting: false }
        }
      };
      this.entities.set(player.id, player);
    }

    // Create Blue Nexus
    const blueNexus = {
      id: 'blue-nexus',
      type: EntityType.NEXUS,
      team: Team.BLUE,
      pos: { x: 100, y: GAME_CONFIG.MAP_HEIGHT / 2 },
      radius: 80,
      health: 3000,
      maxHealth: 3000,
      speed: 0,
      attackRange: 0,
      attackDamage: 0,
      attackSpeed: 0,
      lastAttackTime: 0,
      isDead: false,
      shield: 0,
      maxShield: 0,
      visionRange: 800,
      isVisible: true,
      rotationSpeed: 0,
      isMoving: false,
      stoppingDistance: 0,
      isStunned: false,
      isRooted: false,
      isCasting: false,
      items: [],
      activeBuffs: [],
      activeStatusEffects: [],
      level: 1,
      xp: 0,
      gold: 0,
      skillPoints: 0
    };
    this.entities.set('blue-nexus', blueNexus);
    this.pathfinder.markObstacle(blueNexus.pos, blueNexus.radius);

    // Create Red Nexus
    const redNexus = {
      id: 'red-nexus',
      type: EntityType.NEXUS,
      team: Team.RED,
      pos: { x: GAME_CONFIG.MAP_WIDTH - 100, y: GAME_CONFIG.MAP_HEIGHT / 2 },
      radius: 80,
      health: 3000,
      maxHealth: 3000,
      speed: 0,
      attackRange: 0,
      attackDamage: 0,
      attackSpeed: 0,
      lastAttackTime: 0,
      isDead: false,
      shield: 0,
      maxShield: 0,
      visionRange: 800,
      isVisible: false,
      rotationSpeed: 0,
      isMoving: false,
      stoppingDistance: 0,
      isStunned: false,
      isRooted: false,
      isCasting: false,
      items: [],
      activeBuffs: [],
      activeStatusEffects: [],
      level: 1,
      xp: 0,
      gold: 0,
      skillPoints: 0
    };
    this.entities.set('red-nexus', redNexus);
    this.pathfinder.markObstacle(redNexus.pos, redNexus.radius);

    // Create Enemy Champion
    const enemyHero = HEROES[Math.floor(Math.random() * HEROES.length)];
    const enemyAbilities = getHeroAbilities(enemyHero.id);
    const enemyChampId = 'enemy-champ';
    this.entities.set(enemyChampId, {
      id: enemyChampId,
      type: EntityType.CHAMPION,
      heroId: enemyHero.id,
      team: Team.RED,
      pos: { x: GAME_CONFIG.MAP_WIDTH - 300, y: GAME_CONFIG.MAP_HEIGHT / 2 },
      radius: 25,
      health: enemyHero.stats.health,
      maxHealth: enemyHero.stats.health,
      mana: enemyHero.stats.mana,
      maxMana: enemyHero.stats.mana,
      gold: 500,
      speed: enemyHero.stats.speed,
      attackRange: enemyHero.stats.attackRange,
      attackDamage: enemyHero.stats.attackDamage,
      attackSpeed: enemyHero.stats.attackSpeed,
      resistance: enemyHero.stats.resistance,
      lastAttackTime: 0,
      isDead: false,
      shield: 0,
      maxShield: 0,
      visionRange: 800,
      isVisible: false,
      rotationSpeed: 0,
      isMoving: false,
      stoppingDistance: 0,
      isStunned: false,
      isRooted: false,
      isCasting: false,
      animationState: AnimationState.IDLE,
      items: [],
      activeBuffs: [],
      activeStatusEffects: [],
      level: 1,
      xp: 0,
      skillPoints: 1,
      abilities: {
        passive: { data: { id: 'passive', name: 'Passive', description: '', slot: AbilitySlot.PASSIVE, type: AbilityType.SELF, castTime: 0, cooldown: 0, manaCost: 0, range: 0, baseValue: 0, valuePerLevel: 0 }, level: 1, maxLevel: 1, lastUsed: 0, isCasting: false },
        q: { data: enemyAbilities.q, level: 1, maxLevel: 5, lastUsed: 0, isCasting: false },
        w: { data: enemyAbilities.w, level: 1, maxLevel: 5, lastUsed: 0, isCasting: false },
        e: { data: enemyAbilities.e, level: 1, maxLevel: 5, lastUsed: 0, isCasting: false },
        r: { data: enemyAbilities.r, level: 1, maxLevel: 3, lastUsed: 0, isCasting: false }
      }
    });
    this.aiControllers.set(enemyChampId, new AIChampionController(this, enemyChampId));

    // Create Towers
    this.spawnTower(Team.BLUE, { x: 800, y: GAME_CONFIG.MAP_HEIGHT / 2 });
    this.spawnTower(Team.RED, { x: GAME_CONFIG.MAP_WIDTH - 800, y: GAME_CONFIG.MAP_HEIGHT / 2 });
    
    // Create Inhibitors
    this.spawnInhibitor(Team.BLUE, { x: 400, y: GAME_CONFIG.MAP_HEIGHT / 2 });
    this.spawnInhibitor(Team.RED, { x: GAME_CONFIG.MAP_WIDTH - 400, y: GAME_CONFIG.MAP_HEIGHT / 2 });
    
    // Initial Minion Spawn
    this.spawnMinions();
    this.playSound('minionSpawn', 0.5);
  }

  spawnTower(team: Team, pos: Vector2D) {
    const id = `tower-${team}-${Math.random()}`;
    const radius = 50;
    this.entities.set(id, {
      id,
      type: EntityType.TOWER,
      team,
      pos,
      radius,
      health: 2000,
      maxHealth: 2000,
      speed: 0,
      attackRange: GAME_CONFIG.TOWER_RANGE,
      attackDamage: GAME_CONFIG.TOWER_DAMAGE,
      attackSpeed: 1,
      lastAttackTime: 0,
      isDead: false,
      shield: 0,
      maxShield: 0,
      visionRange: 700,
      isVisible: team === Team.BLUE,
      rotationSpeed: 0,
      isMoving: false,
      stoppingDistance: 0,
      isStunned: false,
      isRooted: false,
      isCasting: false,
      items: [],
      activeBuffs: [],
      activeStatusEffects: [],
      level: 1,
      xp: 0,
      gold: 0,
      skillPoints: 0
    });
    this.pathfinder.markObstacle(pos, radius);
  }

  spawnInhibitor(team: Team, pos: Vector2D) {
    const id = `inhibitor-${team}-${Math.random()}`;
    const radius = 60;
    this.entities.set(id, {
      id,
      type: EntityType.INHIBITOR,
      team,
      pos,
      radius,
      health: 4000,
      maxHealth: 4000,
      speed: 0,
      attackRange: 0,
      attackDamage: 0,
      attackSpeed: 0,
      lastAttackTime: 0,
      isDead: false,
      shield: 0,
      maxShield: 0,
      visionRange: 500,
      isVisible: team === Team.BLUE,
      rotationSpeed: 0,
      isMoving: false,
      stoppingDistance: 0,
      isStunned: false,
      isRooted: false,
      isCasting: false,
      items: [],
      activeBuffs: [],
      activeStatusEffects: [],
      level: 1,
      xp: 0,
      gold: 0,
      skillPoints: 0
    });
    this.pathfinder.markObstacle(pos, radius);
  }



  spawnCamp(camp: MonsterCamp) {
    camp.isDead = false;
    camp.monsterIds = [];
    
    if (camp.type === 'SMALL') {
      for (let i = 0; i < 3; i++) {
        const offset = { x: (i - 1) * 30, y: (i - 1) * 30 };
        const id = this.createMonster(camp.pos.x + offset.x, camp.pos.y + offset.y, 'SMALL', camp.id);
        camp.monsterIds.push(id);
      }
    } else if (camp.type === 'LARGE') {
      const id = this.createMonster(camp.pos.x, camp.pos.y, 'LARGE', camp.id);
      camp.monsterIds.push(id);
    } else if (camp.type === 'BOSS') {
      const id = this.createMonster(camp.pos.x, camp.pos.y, 'BOSS', camp.id);
      camp.monsterIds.push(id);
    }
  }

  createMonster(x: number, y: number, type: 'SMALL' | 'LARGE' | 'BOSS', campId: string): string {
    const id = `monster-${campId}-${Math.random()}`;
    const stats = {
      SMALL: { health: 300, damage: 20, gold: 30, xp: 50, radius: 20 },
      LARGE: { health: 800, damage: 45, gold: 100, xp: 150, radius: 35 },
      BOSS: { health: 5000, damage: 120, gold: 500, xp: 1000, radius: 60 }
    }[type];

    const monster: Entity = {
      id,
      type: type === 'BOSS' ? EntityType.BOSS : EntityType.MONSTER,
      team: Team.NEUTRAL,
      pos: { x, y },
      radius: stats.radius,
      health: stats.health,
      maxHealth: stats.health,
      speed: type === 'BOSS' ? 2 : 3,
      attackRange: type === 'BOSS' ? 150 : 80,
      attackDamage: stats.damage,
      attackSpeed: 1,
      lastAttackTime: 0,
      isDead: false,
      shield: 0,
      maxShield: 0,
      gold: 0,
      goldReward: stats.gold,
      xpReward: stats.xp,
      level: 1,
      xp: 0,
      skillPoints: 0,
      items: [],
      activeBuffs: [],
      activeStatusEffects: [],
      rotationSpeed: 0,
      isMoving: false,
      stoppingDistance: 0,
      isStunned: false,
      isRooted: false,
      isCasting: false,
      isVisible: true,
      visionRange: 400
    };

    this.entities.set(id, monster);
    return id;
  }

  updateMonsterAI(monster: Entity, now: number) {
    if (monster.isDead) return;

    // Monsters stay at their camp unless provoked
    // Provoked means someone is nearby
    let nearestEnemy: Entity | null = null;
    let minDist = monster.visionRange || 400;

    for (const other of this.entities.values()) {
      if (other.team !== Team.NEUTRAL && !other.isDead && other.type === EntityType.CHAMPION) {
        const dist = getDistance(monster.pos, other.pos);
        if (dist < minDist) {
          minDist = dist;
          nearestEnemy = other;
        }
      }
    }

    if (nearestEnemy) {
      monster.target = nearestEnemy.id;
      if (minDist < monster.attackRange) {
        if (now - monster.lastAttackTime > 1000 / monster.attackSpeed) {
          this.fireProjectile(monster, nearestEnemy, monster.attackDamage);
          monster.lastAttackTime = now;
        }
      } else {
        this.moveEntity(monster, nearestEnemy.pos);
      }
    } else {
      // Return to camp or stay idle
      // For now, just stay idle
      monster.target = undefined;
    }
  }

  spawnMinions() {
    const lanes = ['top', 'mid', 'bottom'];
    lanes.forEach(lane => {
      for (let i = 0; i < 3; i++) {
        this.createMinion(Team.BLUE, lane, MinionType.MELEE);
        this.createMinion(Team.RED, lane, MinionType.MELEE);
      }
      this.createMinion(Team.BLUE, lane, MinionType.RANGED);
      this.createMinion(Team.RED, lane, MinionType.RANGED);
    });
  }

  checkGameEnd() {
    if (this.gameState !== GameState.IN_GAME) return;

    const blueNexus = Array.from(this.entities.values()).find(e => e.type === EntityType.NEXUS && e.team === Team.BLUE);
    const redNexus = Array.from(this.entities.values()).find(e => e.type === EntityType.NEXUS && e.team === Team.RED);

    // End Game if Nexus is dead
    if (blueNexus && blueNexus.isDead) {
      this.gameState = GameState.DEFEAT;
      // Trigger event or UI update
    }
    if (redNexus && redNexus.isDead) {
      this.gameState = GameState.VICTORY;
      // Trigger event or UI update
    }
  }

  applyBuff(champion: Entity, buffType: BuffType, duration: number) {
    const now = Date.now();
    champion.activeBuffs.push({ type: buffType, endTime: now + duration });
  }

  updateBuffs(champion: Entity) {
    const now = Date.now();
    champion.activeBuffs = champion.activeBuffs.filter(buff => buff.endTime > now);

    // Reset temporary buff effects
    // This is simplified, should be handled by a proper stat system
    
    for (const buff of champion.activeBuffs) {
      if (buff.type === BuffType.BLUE_BUFF) {
        champion.cooldownReduction = (champion.cooldownReduction || 0) + 0.2;
        champion.mana = Math.min(champion.maxMana || 0, (champion.mana || 0) + 0.1);
      }
      if (buff.type === BuffType.BOSS_BUFF) {
        champion.attackDamage += 20;
      }
    }
  }

  applyStatusEffect(champion: Entity, effect: StatusEffect) {
    if (champion.type === EntityType.TOWER || champion.type === EntityType.NEXUS || champion.type === EntityType.INHIBITOR) return;

    const now = Date.now();
    const existing = champion.activeStatusEffects.find(e => e.type === effect.type);

    if (existing) {
      if (effect.type === StatusEffectType.BURN) {
        existing.endTime = now + effect.duration;
      } else if (effect.type === StatusEffectType.SLOW) {
        existing.intensity = Math.max(existing.intensity, effect.intensity);
        existing.endTime = now + effect.duration;
      }
      // Stun/Root: no stacking, just refresh if needed or ignore
    } else {
      champion.activeStatusEffects.push({ ...effect, endTime: now + effect.duration });
    }
  }

  updateStatusEffects(champion: Entity) {
    const now = Date.now();
    champion.activeStatusEffects = champion.activeStatusEffects.filter(e => e.endTime > now);
    
    // Apply effects
    for (const effect of champion.activeStatusEffects) {
      if (effect.type === StatusEffectType.SLOW) {
        champion.speed *= (1 - effect.intensity);
      }
    }
  }

  castAbility(entity: Entity, slot: 'q' | 'w' | 'e' | 'r', target?: Vector2D) {
    if (!entity.abilities || !entity.abilities[slot]) return;
    const ability = entity.abilities[slot];
    const now = Date.now();
    
    // Check Cooldown
    const cooldown = ability.data.cooldown * (1 - (entity.cooldownReduction || 0)) * (this.gameMode === GameMode.BLITZ ? 0.7 : 1);
    if (now - ability.lastUsed < cooldown) return;

    // Check Mana
    if ((entity.mana || 0) < ability.data.manaCost) return;

    // Consume Mana
    entity.mana = (entity.mana || 0) - ability.data.manaCost;
    ability.lastUsed = now;

    const targetPos = target || this.mousePos;
    
    // Execute hero-specific logic
    this.executeAbility(entity, slot, targetPos);
  }

  // Keep these for backward compatibility or AI if needed
  castAbilityQ(champion: Entity, target?: Vector2D) {
    this.castAbility(champion, 'q', target);
  }

  castAbilityW(champion: Entity, target?: Vector2D) {
    this.castAbility(champion, 'w', target);
  }

  castAbilityE(champion: Entity, target?: Vector2D) {
    this.castAbility(champion, 'e', target);
  }

  castAbilityR(champion: Entity, target?: Vector2D) {
    this.castAbility(champion, 'r', target);
  }

  createMinion(team: Team, laneId: string, type: MinionType = MinionType.MELEE) {
    const id = `minion-${team}-${laneId}-${Math.random()}`;
    const isMelee = type === MinionType.MELEE;
    const laneWaypoints = this.lanes[laneId];
    const startPos = team === Team.BLUE ? laneWaypoints[0] : laneWaypoints[laneWaypoints.length - 1];
    
    this.entities.set(id, {
      id,
      type: EntityType.MINION,
      minionType: type,
      minionData: {
        laneId,
        currentWaypointIndex: team === Team.BLUE ? 1 : laneWaypoints.length - 2
      },
      team,
      pos: { ...startPos },
      radius: 15,
      health: isMelee ? 400 : 250,
      maxHealth: isMelee ? 400 : 250,
      gold: 0,
      speed: isMelee ? 3 : 3.5,
      attackRange: isMelee ? 40 : 450,
      attackDamage: isMelee ? 12 : 10,
      attackSpeed: 0.7,
      lastAttackTime: 0,
      isDead: false,
      shield: 0,
      maxShield: 0,
      goldReward: isMelee ? 20 : 25,
      xpReward: isMelee ? 50 : 60,
      visionRange: 300,
      isVisible: team === Team.BLUE,
      rotationSpeed: 0,
      isMoving: false,
      stoppingDistance: 0,
      isStunned: false,
      isRooted: false,
      isCasting: false,
      items: [],
      activeBuffs: [],
      activeStatusEffects: [],
      level: 1,
      xp: 0,
      skillPoints: 0
    });

    if (this.superMinionBuffs[team]) {
        this.applyMinionBuff(this.entities.get(id)!);
    }
  }

  moveEntity(entity: Entity, targetPos: Vector2D) {
    const distToTarget = getDistance(entity.pos, targetPos);
    
    // Calculate desired move vector
    let vx = 0;
    let vy = 0;

    if (distToTarget > 0) {
        const angle = getAngle(entity.pos, targetPos);
        // Cap movement by distance to target (don't overshoot)
        const actualMoveDist = Math.min(entity.speed, distToTarget);
        vx = Math.cos(angle) * actualMoveDist;
        vy = Math.sin(angle) * actualMoveDist;
    }

    // Separation Force (Obstacle Avoidance)
    let sepX = 0;
    let sepY = 0;
    
    for (const other of this.entities.values()) {
      if (other.id === entity.id || other.isDead) continue;
      if (other.type === EntityType.PROJECTILE) continue; 
      
      // Simple circle collision
      const dist = getDistance(entity.pos, other.pos);
      const minDist = entity.radius + other.radius;
      
      if (dist < minDist) {
        // Push away
        const angle = getAngle(other.pos, entity.pos);
        const overlap = minDist - dist;
        // Soft collision: push by a fraction of overlap to resolve smoothly
        const force = overlap * 0.5; 
        sepX += Math.cos(angle) * force;
        sepY += Math.sin(angle) * force;
      }
    }

    // Apply forces
    entity.pos.x += vx + sepX;
    entity.pos.y += vy + sepY;

    // Map Boundaries
    entity.pos.x = Math.max(entity.radius, Math.min(GAME_CONFIG.MAP_WIDTH - entity.radius, entity.pos.x));
    entity.pos.y = Math.max(entity.radius, Math.min(GAME_CONFIG.MAP_HEIGHT - entity.radius, entity.pos.y));
  }

  triggerRandomEvent() {
    const events = [EventType.DOUBLE_DAMAGE, EventType.METEOR_ZONES, EventType.KOTH];
    this.activeEvent = events[Math.floor(Math.random() * events.length)];
    this.activeEventEndTime = Date.now() + 30000; // 30 seconds duration
    this.lastEventTime = Date.now(); // Reset timer
  }

  checkInhibitors() {
    const inhibitors = Array.from(this.entities.values()).filter(e => e.type === EntityType.INHIBITOR);
    for (const inhibitor of inhibitors) {
      if (inhibitor.isDead && !this.destroyedInhibitors.has(inhibitor.id)) {
        this.destroyedInhibitors.add(inhibitor.id);
        const buffTeam = inhibitor.team === Team.BLUE ? Team.RED : Team.BLUE;
        this.superMinionBuffs[buffTeam] = true;
        this.buffExistingMinions(buffTeam);
        console.log(`Inhibitor destroyed! ${buffTeam} minions are now stronger!`);
      }
    }
  }

  buffExistingMinions(team: Team) {
    for (const entity of this.entities.values()) {
      if (entity.type === EntityType.MINION && entity.team === team && !entity.isDead) {
        this.applyMinionBuff(entity);
      }
    }
  }

  applyMinionBuff(minion: Entity) {
    const buffMultiplier = 1.5;
    const oldMaxHealth = minion.maxHealth;
    minion.maxHealth *= buffMultiplier;
    minion.health += (minion.maxHealth - oldMaxHealth);
    minion.attackDamage *= buffMultiplier;
    minion.resistance = (minion.resistance || 0) + 0.2; // Increase resistance by 20%
    minion.radius *= 1.2; 
  }

  update() {
    const now = Date.now();
    const dt = (now - this.lastUpdate) / 1000;
    this.lastUpdate = now;

    this.checkInhibitors();
    this.checkGameEnd();

    // Event System
    if (now - this.lastEventTime > 180000) { // Every 3 minutes
      this.triggerRandomEvent();
    }
    if (this.activeEvent && now > this.activeEventEndTime) {
      this.activeEvent = null;
    }

    this.updateVisibility();
    this.economySystem.update(this.entities, now);

    // Update Entities
    for (const entity of this.entities.values()) {
      // Respawn check
      if (entity.isDead && entity.type === EntityType.CHAMPION && entity.deathTime) {
        const gameTime = (now - this.gameStartTime) / 1000;
        let respawnDuration = 10; // Early
        if (gameTime > 1200) respawnDuration = 40; // Late (20min)
        else if (gameTime > 600) respawnDuration = 20; // Mid (10min)

        if (now - entity.deathTime > respawnDuration * 1000) {
          // Respawn
          entity.isDead = false;
          entity.health = entity.maxHealth;
          entity.mana = entity.maxMana;
          entity.pos = { x: entity.team === Team.BLUE ? 200 : GAME_CONFIG.MAP_WIDTH - 200, y: GAME_CONFIG.MAP_HEIGHT / 2 };
          entity.animationState = AnimationState.IDLE;
          entity.deathTime = undefined;
          this.playSound('respawn', 0.8);
        }
      }

      if (entity.isDead) continue;

      // Shield Expiration
      if (entity.shieldEndTime && now > entity.shieldEndTime) {
        entity.shield = 0;
        entity.shieldEndTime = undefined;
      }

      // Champion Movement and Attack
      if (entity.type === EntityType.CHAMPION) {
        const isStunned = entity.stunEndTime && entity.stunEndTime > now;
        const isCasting = entity.castingAbilityEndTime && entity.castingAbilityEndTime > now;

        if (isStunned) {
           // Disable input
        } else if (isCasting) {
           // Disable movement
        } else {
          // Attack Logic
          if (entity.target) {
            const targetEntity = this.entities.get(entity.target);
            if (targetEntity && !targetEntity.isDead) {
              const dist = getDistance(entity.pos, targetEntity.pos);
              if (dist <= entity.attackRange + targetEntity.radius) {
                // Stop moving to attack
                entity.targetPosition = undefined;
                if (now - entity.lastAttackTime > 1000 / entity.attackSpeed) {
                  // Tower Damage Ramping Logic
                  let damage = entity.attackDamage;
                  if (entity.type === EntityType.TOWER) {
                    if (entity.lastTargetId === targetEntity.id) {
                       entity.consecutiveHits = (entity.consecutiveHits || 0) + 1;
                    } else {
                       entity.consecutiveHits = 1;
                       entity.lastTargetId = targetEntity.id;
                    }
                    // Ramp up damage against champions: +40% per hit, max +120%
                    if (targetEntity.type === EntityType.CHAMPION) {
                        const ramp = Math.min(3, entity.consecutiveHits - 1) * 0.4;
                        damage = damage * (1 + ramp);
                    }
                  }

                  this.fireProjectile(entity, targetEntity, damage);
                  entity.lastAttackTime = now;
                }
              } else {
                // Move towards target to get in range
                this.moveEntity(entity, targetEntity.pos);
              }
            } else {
              entity.target = undefined; // Target dead or gone
            }
          } else if (entity.targetPosition) {
            // Normal Movement
            this.moveEntity(entity, entity.targetPosition);
            if (getDistance(entity.pos, entity.targetPosition) < 5) {
              entity.targetPosition = undefined;
            }
          }
        }
      }

      // Mana Regeneration for Champions
      if (entity.type === EntityType.CHAMPION && entity.mana !== undefined && entity.maxMana !== undefined) {
        entity.mana = Math.min(entity.maxMana, entity.mana + (5 * dt));
      }

      // AI Logic (Minions, Towers, and Enemy Champions)
      if (entity.type === EntityType.TOWER) {
        this.updateTowerAI(entity, now);
      } else if (entity.type === EntityType.CHAMPION && !this.multiplayer) {
        // Only run AI if not in multiplayer, or if it's an AI bot
        if (entity.id !== this.playerID) {
          this.aiControllers.get(entity.id)?.update();
        }
      } else if (entity.type === EntityType.MINION) {
        this.updateMinionAI(entity, now);
      } else if (entity.type === EntityType.MONSTER || entity.type === EntityType.BOSS) {
        this.updateMonsterAI(entity, now);
      }
    }

    // Handle Monster Respawn
    this.monsterCamps.forEach(camp => {
      if (camp.isDead && now >= camp.respawnTime) {
        this.spawnCamp(camp);
      } else if (!camp.isDead) {
        const allDead = camp.monsterIds.every(id => {
          const m = this.entities.get(id);
          return !m || m.isDead;
        });
        if (allDead) {
          camp.isDead = true;
          camp.respawnTime = now + 90000; // 90 seconds
        }
      }
    });

    // Update Projectiles
    const activeProjectiles: Projectile[] = [];
    for (let i = 0; i < this.projectiles.length; i++) {
      const p = this.projectiles[i];
      p.pos.x += Math.cos(p.angle) * p.speed;
      p.pos.y += Math.sin(p.angle) * p.speed;
      p.distanceTravelled += p.speed;

      let hit = false;
      // Collision check
      for (const entity of this.entities.values()) {
        if (entity.team !== p.team && !entity.isDead && getDistance(p.pos, entity.pos) < entity.radius) {
          let damage = p.damage;
          // Shield logic: 50% reduction
          if (entity.shieldEndTime && entity.shieldEndTime > now) {
            damage *= 0.5;
          }
          entity.health -= damage;
          entity.lastDamageTime = now;
          entity.lastAttackerId = p.sourceId;
          this.emit('damage', { amount: damage, position: entity.pos, type: DamageType.PHYSICAL });
          if (entity.health <= 0) {
            entity.isDead = true;
            entity.deathTime = now;
            entity.deaths++;
            entity.animationState = AnimationState.DEATH;
            this.playSound('death', 0.3);
            
            // Gold & XP Logic
            const killer = p.sourceId ? this.entities.get(p.sourceId) : null;
            if (killer && killer.type === EntityType.CHAMPION) {
                killer.kills++;
                killer.totalGoldEarned += 300;
                killer.gold += 300;
            }
            
            // Assist Logic (simple: last attacker gets assist)
            for (const e of this.entities.values()) {
                if (e.type === EntityType.CHAMPION && e.id !== killer?.id && e.lastAttackerId === entity.id) {
                    e.assists++;
                }
            }
            
            let goldReward = 0;
            let xpReward = 0;
            if (entity.type === EntityType.MINION) {
              goldReward = 20;
              xpReward = 50;
            } else if (entity.type === EntityType.CHAMPION) {
              goldReward = 300;
              xpReward = 200;
            } else if (entity.type === EntityType.TOWER) {
              goldReward = 500;
              xpReward = 300;
            } else if (entity.type === EntityType.MONSTER) {
              goldReward = entity.goldReward || 30;
              xpReward = entity.xpReward || 50;
            } else if (entity.type === EntityType.BOSS) {
              goldReward = entity.goldReward || 500;
              xpReward = entity.xpReward || 1000;
              // Grant Boss Buff to the killer's team
              if (p.sourceId) {
                const killer = this.entities.get(p.sourceId);
                if (killer) {
                  for (const e of this.entities.values()) {
                    if (e.type === EntityType.CHAMPION && e.team === killer.team) {
                      this.applyBuff(e, BuffType.BOSS_BUFF, 60000); // 60 seconds
                    }
                  }
                  console.log(`Boss defeated! ${killer.team} team gains the Boss Buff!`);
                }
              }
            }
            
            if (p.sourceId) {
              const killer = this.entities.get(p.sourceId);
              if (killer && killer.type === EntityType.CHAMPION) {
                this.economySystem.grantGold(killer, goldReward * this.goldGainMultiplier[killer.team]);
                this.economySystem.grantXP(killer, xpReward);
              }
            } else if (p.team && this.gold[p.team] !== undefined) {
               // Fallback for team gold if no source
               this.gold[p.team] += goldReward * this.goldGainMultiplier[p.team];
            }

            if (entity.type === EntityType.CHAMPION) {
               // Respawn player after 5s
               entity.respawnTimer = now + 5000;
            }
          }
          if (p.onHit) {
            p.onHit(entity);
          }
          hit = true;
          break;
        }
      }

      if (!hit && p.distanceTravelled < p.range) {
        activeProjectiles.push(p);
      } else {
        this.projectilePool.push(p);
      }
    }
    this.projectiles = activeProjectiles;

    // Handle Respawn
    for (const entity of this.entities.values()) {
      if (entity.type === EntityType.CHAMPION && entity.isDead && entity.respawnTimer && now >= entity.respawnTimer) {
        entity.isDead = false;
        entity.health = entity.maxHealth;
        entity.mana = entity.maxMana;
        entity.pos = { x: entity.team === Team.BLUE ? 200 : GAME_CONFIG.MAP_WIDTH - 200, y: GAME_CONFIG.MAP_HEIGHT / 2 };
        entity.respawnTimer = undefined;
        entity.target = undefined;
        if (entity.id === this.playerID) {
          this.targetMovePos = null;
          this.playSound('respawn', 0.8);
        }
      }
    }

    // Camera follow player
    const player = this.entities.get(this.playerID);
    if (player) {
      this.camera.x = player.pos.x - GAME_CONFIG.VIEWPORT_WIDTH / 2;
      this.camera.y = player.pos.y - GAME_CONFIG.VIEWPORT_HEIGHT / 2;
      
      // Clamp camera
      this.camera.x = Math.max(0, Math.min(this.camera.x, GAME_CONFIG.MAP_WIDTH - GAME_CONFIG.VIEWPORT_WIDTH));
      this.camera.y = Math.max(0, Math.min(this.camera.y, GAME_CONFIG.MAP_HEIGHT - GAME_CONFIG.VIEWPORT_HEIGHT));
    }

    // Periodic Minion Spawning (Every 30 seconds)
    if (Math.floor(now / 30000) > Math.floor((now - dt * 1000) / 30000)) {
       this.spawnMinions();
       this.playSound('minionSpawn', 0.4);
    }
  }

  updateVisibility() {
    // Reset visibility for non-friendly entities
    for (const entity of this.entities.values()) {
      if (entity.team !== Team.BLUE) {
        entity.isVisible = false;
      } else {
        entity.isVisible = true;
      }
    }

    // Check vision
    const blueEntities = Array.from(this.entities.values()).filter(e => e.team === Team.BLUE && !e.isDead);
    const otherEntities = Array.from(this.entities.values()).filter(e => e.team !== Team.BLUE && !e.isDead);

    for (const blueEntity of blueEntities) {
      const range = blueEntity.visionRange || 0;
      if (range <= 0) continue;

      for (const other of otherEntities) {
        if (other.isVisible) continue; // Already visible

        const dist = getDistance(blueEntity.pos, other.pos);
        if (dist <= range + other.radius) {
          other.isVisible = true;
        }
      }
    }
  }

  updateTowerAI(tower: Entity, now: number) {
    const range = tower.attackRange;
    let currentTarget = tower.target ? this.entities.get(tower.target) : null;

    // 1. Check if current target is invalid (dead, out of range)
    if (currentTarget) {
      const dist = getDistance(tower.pos, currentTarget.pos);
      if (currentTarget.isDead || currentTarget.team === tower.team || dist > range) {
        tower.target = undefined;
        currentTarget = null;
        tower.consecutiveHits = 0; // Reset ramp
      }
    }

    // 2. Find all potential targets in range
    const potentialTargets = Array.from(this.entities.values()).filter(e => 
      e.team !== tower.team && 
      !e.isDead && 
      getDistance(tower.pos, e.pos) <= range
    );

    if (potentialTargets.length === 0) {
      tower.target = undefined;
      return;
    }

    // Priority Helper
    const getPriority = (target: Entity) => {
      if (target.type === EntityType.CHAMPION) {
        // Priority 1: Champion attacking allied champion
        const isAttackingAlly = Array.from(this.entities.values()).some(e => 
          e.team === tower.team && 
          e.type === EntityType.CHAMPION && 
          !e.isDead &&
          target.target === e.id &&
          getDistance(tower.pos, e.pos) <= range
        );
        if (isAttackingAlly) return 1;
        return 2; // Regular champion
      }
      return 3; // Minion
    };

    // Sort by priority then distance
    potentialTargets.sort((a, b) => {
      const pA = getPriority(a);
      const pB = getPriority(b);
      if (pA !== pB) return pA - pB;
      return getDistance(tower.pos, a.pos) - getDistance(tower.pos, b.pos);
    });

    const topTarget = potentialTargets[0];
    const topPriority = getPriority(topTarget);
    const currentPriority = currentTarget ? getPriority(currentTarget) : 4;

    // 3. Target Selection / Switching Logic
    // Switch if:
    // - No current target
    // - A higher priority target is available (e.g. champion starts attacking ally)
    if (!currentTarget || topPriority < currentPriority) {
      if (tower.target !== topTarget.id) {
        tower.target = topTarget.id;
        tower.consecutiveHits = 0;
      }
    }
    // Otherwise, stick to the current target even if it's not the closest (Stickiness)
  }

  updateMinionAI(entity: Entity, now: number) {
    const visionRange = 400;
    
    // 1. Check if current target is still valid
    let currentTarget = entity.target ? this.entities.get(entity.target) : null;
    if (currentTarget) {
      const dist = getDistance(entity.pos, currentTarget.pos);
      if (currentTarget.isDead || currentTarget.team === entity.team || dist > visionRange * 1.5) {
        entity.target = undefined;
        currentTarget = null;
      }
    }

    // 2. Find best target
    let bestTarget: Entity | null = null;
    let bestScore = -Infinity; // Higher is better

    if (currentTarget) {
      bestScore = this.calculateTowerScore(entity, currentTarget);
      bestTarget = currentTarget;
    }

    for (const other of this.entities.values()) {
      if (other.team !== entity.team && !other.isDead && other.team !== Team.NEUTRAL) {
        const dist = getDistance(entity.pos, other.pos);
        if (dist <= visionRange) {
          const score = this.calculateTowerScore(entity, other);
          
          if (score > bestScore) {
            bestScore = score;
            bestTarget = other;
          }
        }
      }
    }
    
    if (bestTarget) {
      entity.target = bestTarget.id;
      currentTarget = bestTarget;
    }

    // 3. Execute Action
    if (currentTarget) {
      const dist = getDistance(entity.pos, currentTarget.pos);
      if (dist <= entity.attackRange + currentTarget.radius) {
        // Attack
        entity.path = undefined; // Clear path when attacking
        if (now - entity.lastAttackTime > 1000 / entity.attackSpeed) {
          this.fireProjectile(entity, currentTarget, entity.attackDamage);
          entity.lastAttackTime = now;
        }
      } else {
        // Move towards target
        this.moveEntityWithPath(entity, currentTarget.pos);
      }
    } else {
      // No target, move along lane
      if (entity.minionData) {
        const lane = this.lanes[entity.minionData.laneId];
        if (lane) {
          const targetWaypoint = lane[entity.minionData.currentWaypointIndex];
          if (targetWaypoint) {
            this.moveEntityWithPath(entity, targetWaypoint);
            if (getDistance(entity.pos, targetWaypoint) < 50) {
              if (entity.team === Team.BLUE) {
                if (entity.minionData.currentWaypointIndex < lane.length - 1) {
                  entity.minionData.currentWaypointIndex++;
                }
              } else {
                if (entity.minionData.currentWaypointIndex > 0) {
                  entity.minionData.currentWaypointIndex--;
                }
              }
            }
          }
        }
      }
    }
  }

  moveEntityWithPath(entity: Entity, targetPos: Vector2D) {
    // If we have a path, follow it
    // If no path or target changed significantly, recalculate
    // For simplicity, let's recalculate if no path or end of path is far from target
    
    const needsPath = !entity.path || entity.path.length === 0 || getDistance(entity.path[entity.path.length - 1], targetPos) > 200;

    if (needsPath) {
        // Only use A* for long distances to save performance
        const dist = getDistance(entity.pos, targetPos);
        if (dist > 300) {
             entity.path = this.pathfinder.findPath(entity.pos, targetPos);
             // If path found, remove first node if it's too close (current position)
             if (entity.path.length > 0 && getDistance(entity.pos, entity.path[0]) < entity.radius) {
                 entity.path.shift();
             }
        } else {
            entity.path = [targetPos];
        }
    }

    if (entity.path && entity.path.length > 0) {
        const nextPoint = entity.path[0];
        this.moveEntity(entity, nextPoint);
        
        // Reached waypoint?
        if (getDistance(entity.pos, nextPoint) < entity.radius) {
            entity.path.shift();
        }
    } else {
        // Fallback direct movement
        this.moveEntity(entity, targetPos);
    }
  }

  fireProjectile(source: Entity, target: Entity, damage?: number) {
    const angle = getAngle(source.pos, target.pos);
    this.playSound('attack', 0.2);
    
    let p = this.projectilePool.pop();
    if (p) {
      p.id = `proj-${Math.random()}`;
      p.pos.x = source.pos.x;
      p.pos.y = source.pos.y;
      p.angle = angle;
      p.speed = 10;
      p.damage = damage ?? source.attackDamage;
      p.team = source.team;
      p.sourceId = source.id;
      p.range = source.attackRange + 100;
      p.distanceTravelled = 0;
      p.color = source.type === EntityType.TOWER ? 'red' : 'yellow';
      p.onHit = undefined;
    } else {
      p = {
        id: `proj-${Math.random()}`,
        pos: { ...source.pos },
        angle,
        speed: 10,
        damage: damage ?? source.attackDamage,
        team: source.team,
        sourceId: source.id,
        range: source.attackRange + 100,
        distanceTravelled: 0,
        color: source.type === EntityType.TOWER ? 'red' : 'yellow'
      };
    }
    this.projectiles.push(p);
  }

  upgradeAbility(abilityId: string) {
    const player = this.entities.get(this.playerID);
    if (!player || player.skillPoints <= 0) return;

    const ability = player.abilities ? Object.values(player.abilities).find(a => a.data.id === abilityId) : null;
    if (!ability) return;

    if (ability.level < ability.maxLevel) {
      ability.level++;
      player.skillPoints--;
      this.playSound('levelUp', 0.5); // Reuse level up sound or add new one
    }
  }

  buyItem(itemId: string) {
    const player = this.entities.get(this.playerID);
    if (!player) return;
    
    if (this.shopSystem.buyItem(player, itemId)) {
      this.playSound('buy', 0.5);
    }
  }

  sellItem(itemIndex: number) {
    const player = this.entities.get(this.playerID);
    if (!player) return;

    if (this.shopSystem.sellItem(player, itemIndex)) {
      this.playSound('sell', 0.5);
    }
  }

  handleInput(type: string, data: any, entityId?: string) {
    const entity = entityId ? this.entities.get(entityId) : this.entities.get(this.playerID);
    if (!entity) return;
    
    if (type === 'MOVE') {
      // Check if clicked on an enemy
      let clickedEnemy: Entity | null = null;
      
      let worldX = data.x;
      let worldY = data.y;

      if (!data.isWorld) {
          worldX += this.camera.x;
          worldY += this.camera.y;
      }
      
      for (const e of this.entities.values()) {
        if (e.team !== entity.team && !e.isDead) { // Check against entity's team
          const dist = Math.sqrt(Math.pow(e.pos.x - worldX, 2) + Math.pow(e.pos.y - worldY, 2));
          if (dist <= e.radius + 10) { // +10 for easier clicking
            clickedEnemy = e;
            break;
          }
        }
      }

      if (clickedEnemy) {
        entity.target = clickedEnemy.id;
        entity.targetPosition = undefined;
      } else {
        entity.target = undefined;
        entity.targetPosition = { x: worldX, y: worldY };
      }
      entity.isMoving = true;
    }
    if (type === 'ABILITY') {
      const player = entity;
      if (!player || player.isDead || !player.abilities) return;

      const key = data.key as 'q' | 'w' | 'e' | 'r';
      const ability = player.abilities[key];
      
      if (!ability) return;

      // Check Cooldown
      const now = Date.now();
      if (now - ability.lastUsed < ability.data.cooldown) {
          return; 
      }

      // Check Mana
      if ((player.mana || 0) < ability.data.manaCost) {
          // Optional: Play "not enough mana" sound
          return;
      }

      // Consume Mana
      player.mana = (player.mana || 0) - ability.data.manaCost;
      ability.lastUsed = now;

      let targetX = data.x;
      let targetY = data.y;
      
      if (!data.isWorld) {
          targetX += this.camera.x;
          targetY += this.camera.y;
      }

      if (data.key === 'q') {
        this.executeAbility(player, 'q', { x: targetX, y: targetY });
      } else if (data.key === 'w') {
        this.executeAbility(player, 'w', { x: targetX, y: targetY });
      } else if (data.key === 'e') {
        this.executeAbility(player, 'e', { x: targetX, y: targetY });
      } else if (data.key === 'r') {
        this.executeAbility(player, 'r', { x: targetX, y: targetY });
      }
    }
    if (type === 'UPGRADE_ABILITY') {
      const player = entity;
      if (!player || player.skillPoints <= 0) return;
      const ability = player.abilities ? Object.values(player.abilities).find(a => a.data.id === data.key) : null;
      if (!ability) return;
      if (ability.level < ability.maxLevel) {
        ability.level++;
        player.skillPoints--;
        this.playSound('levelUp', 0.5);
      }
    }
    if (type === 'BUY_ITEM') {
      const player = entity;
      if (!player) return;
      if (this.shopSystem.buyItem(player, data.itemId)) {
        this.playSound('buy', 0.5);
      }
    }
    if (type === 'SELL_ITEM') {
      const player = entity;
      if (!player) return;
      if (this.shopSystem.sellItem(player, data.itemIndex)) {
        this.playSound('sell', 0.5);
      }
    }
  }

  private executeAbility(entity: Entity, slot: 'q' | 'w' | 'e' | 'r', target: Vector2D) {
    if (!entity.abilities || !entity.abilities[slot]) return;
    const ability = entity.abilities[slot];
    const heroId = entity.heroId;

    // Common logic: Sound
    this.playSound(`ability${slot.toUpperCase()}`, 0.6);

    switch (heroId) {
      case 'valkyrie':
        this.executeValkyrieAbility(entity, slot, target);
        break;
      case 'ignis':
        this.executeIgnisAbility(entity, slot, target);
        break;
      case 'shadow':
        this.executeShadowAbility(entity, slot, target);
        break;
      case 'titan':
        this.executeTitanAbility(entity, slot, target);
        break;
      case 'hawk':
        this.executeHawkAbility(entity, slot, target);
        break;
    }
  }

  private executeValkyrieAbility(entity: Entity, slot: string, target: Vector2D) {
    if (slot === 'q') {
      // Dash Strike
      entity.pos = moveTowards(entity.pos, target, 150);
      this.dealAoEDamage(entity, entity.pos, 100, 100);
    } else if (slot === 'w') {
      // Battle Cry (Shield + Speed)
      entity.shield = 200;
      entity.maxShield = 200;
      entity.shieldEndTime = Date.now() + 3000;
      this.applyBuff(entity, BuffType.BLUE_BUFF, 3000); // Temporary speed/cdr buff
    } else if (slot === 'e') {
      // Leap
      entity.pos = moveTowards(entity.pos, target, 250);
    } else if (slot === 'r') {
      // Valkyrie's Wrath
      this.dealAoEDamage(entity, entity.pos, 300, 300);
    }
  }

  private executeIgnisAbility(entity: Entity, slot: string, target: Vector2D) {
    if (slot === 'q') {
      // Fireball
      const angle = getAngle(entity.pos, target);
      this.projectiles.push({
        id: `proj-${Math.random()}`,
        pos: { ...entity.pos },
        angle,
        speed: 12,
        damage: 120,
        team: entity.team,
        range: 800,
        distanceTravelled: 0,
        color: '#ff4400'
      });
    } else if (slot === 'w') {
      // Flame Shield
      entity.shield = 150;
      entity.maxShield = 150;
      entity.shieldEndTime = Date.now() + 4000;
    } else if (slot === 'e') {
      // Blink
      entity.pos = moveTowards(entity.pos, target, 300);
    } else if (slot === 'r') {
      // Inferno
      this.dealAoEDamage(entity, target, 400, 400);
    }
  }

  private executeShadowAbility(entity: Entity, slot: string, target: Vector2D) {
    if (slot === 'q') {
      // Shuriken
      const angle = getAngle(entity.pos, target);
      this.projectiles.push({
        id: `proj-${Math.random()}`,
        pos: { ...entity.pos },
        angle,
        speed: 20,
        damage: 80,
        team: entity.team,
        range: 700,
        distanceTravelled: 0,
        color: '#8800ff'
      });
    } else if (slot === 'w') {
      // Stealth (Speed buff)
      this.applyBuff(entity, BuffType.BLUE_BUFF, 2000);
    } else if (slot === 'e') {
      // Shadow Dash
      entity.pos = moveTowards(entity.pos, target, 200);
    } else if (slot === 'r') {
      // Assassinate
      entity.pos = moveTowards(entity.pos, target, 400);
      this.dealAoEDamage(entity, entity.pos, 100, 500);
    }
  }

  private executeTitanAbility(entity: Entity, slot: string, target: Vector2D) {
    if (slot === 'q') {
      // Ground Slam
      this.dealAoEDamage(entity, entity.pos, 150, 100);
    } else if (slot === 'w') {
      // Iron Skin
      entity.shield = 400;
      entity.maxShield = 400;
      entity.shieldEndTime = Date.now() + 5000;
    } else if (slot === 'e') {
      // Charge
      entity.pos = moveTowards(entity.pos, target, 200);
    } else if (slot === 'r') {
      // Earthshaker
      this.dealAoEDamage(entity, entity.pos, 400, 250);
    }
  }

  private executeHawkAbility(entity: Entity, slot: string, target: Vector2D) {
    if (slot === 'q') {
      // Piercing Arrow
      const angle = getAngle(entity.pos, target);
      this.projectiles.push({
        id: `proj-${Math.random()}`,
        pos: { ...entity.pos },
        angle,
        speed: 25,
        damage: 150,
        team: entity.team,
        range: 1000,
        distanceTravelled: 0,
        color: '#00ff88'
      });
    } else if (slot === 'w') {
      // Eagle Eye (Buff)
      this.applyBuff(entity, BuffType.BOSS_BUFF, 5000);
    } else if (slot === 'e') {
      // Vault (Dash backwards)
      const angle = getAngle(target, entity.pos);
      const backPos = {
        x: entity.pos.x + Math.cos(angle) * 200,
        y: entity.pos.y + Math.sin(angle) * 200
      };
      entity.pos = backPos;
    } else if (slot === 'r') {
      // Rain of Arrows
      this.dealAoEDamage(entity, target, 250, 300);
    }
  }

  private dealAoEDamage(attacker: Entity, center: Vector2D, radius: number, damage: number) {
    for (const entity of this.entities.values()) {
      if (entity.team !== attacker.team && !entity.isDead && getDistance(center, entity.pos) < radius) {
        entity.health -= damage;
        entity.lastDamageTime = Date.now();
        if (entity.health <= 0) {
          entity.isDead = true;
          attacker.xp += 100;
          attacker.gold += 300;
        }
      }
    }
  }

  private calculateTowerScore(entity: Entity, other: Entity): number {
    const dist = getDistance(entity.pos, other.pos);
    let score = -dist;

    // Minion Priority
    if (other.type === EntityType.MINION) score += 5000;
    else if (other.type === EntityType.CHAMPION) score += 3000;
    else if (other.type === EntityType.TOWER) score += 1000;
    else if (other.type === EntityType.NEXUS) score += 100;

    // Special rule: Ignore champion if a tower is in range
    if (other.type === EntityType.CHAMPION) {
      const towerInRange = Array.from(this.entities.values()).some(e => 
        e.type === EntityType.TOWER && 
        e.team !== entity.team && 
        getDistance(entity.pos, e.pos) <= entity.visionRange
      );
      if (towerInRange) score -= 10000;
    }
    
    return score;
  }
}
