import { Entity, EntityType, Team } from '../types';

export class EconomySystem {
  private lastPassiveGoldTime: number = 0;
  private readonly PASSIVE_GOLD_INTERVAL = 5000; // 5 seconds
  private readonly PASSIVE_GOLD_AMOUNT = 3;

  constructor() {}

  update(entities: Map<string, Entity>, now: number) {
    // Passive Gold
    if (now - this.lastPassiveGoldTime >= this.PASSIVE_GOLD_INTERVAL) {
      this.lastPassiveGoldTime = now;
      for (const entity of entities.values()) {
        if (entity.type === EntityType.CHAMPION) {
          entity.gold += this.PASSIVE_GOLD_AMOUNT;
        }
      }
    }
  }

  grantGold(entity: Entity, amount: number) {
    entity.gold += amount;
  }

  grantXP(entity: Entity, amount: number) {
    if (entity.level >= 18) return;

    entity.xp += amount;
    
    // Check for level up
    let xpNeeded = this.getXPForNextLevel(entity.level);
    while (entity.xp >= xpNeeded && entity.level < 18) {
      entity.xp -= xpNeeded;
      this.levelUp(entity);
      xpNeeded = this.getXPForNextLevel(entity.level);
    }
  }

  getXPForNextLevel(level: number): number {
    // Simple formula: 280 + (level * 100)
    return 280 + (level * 100);
  }

  levelUp(entity: Entity) {
    entity.level++;
    entity.skillPoints++;
    
    // Increase stats
    // Base stats scaling (simplified)
    const hpGain = 80;
    const manaGain = 40;
    const adGain = 3;
    const asGain = 0.02;

    entity.maxHealth += hpGain;
    entity.health += hpGain; // Heal on level up
    
    if (entity.maxMana) {
      entity.maxMana += manaGain;
      if (entity.mana !== undefined) entity.mana += manaGain;
    }

    entity.attackDamage += adGain;
    entity.attackSpeed += asGain;

    // Play level up sound/effect (handled by engine/events)
    console.log(`${entity.id} leveled up to ${entity.level}!`);
  }
}
