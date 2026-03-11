import { Entity, DamageData, DamageType, EntityType, Team } from '../types';
import { System } from './System';
import { GameEngine } from '../engine';

export class CombatManager implements System {
  private engine!: GameEngine;

  init(engine: GameEngine) { 
    this.engine = engine;
    console.log("CombatManager Init"); 
  }
  
  shutdown() { console.log("CombatManager Shutdown"); }

  dealDamage(target: Entity, damageData: DamageData) {
    if (target.isDead) return;

    // Nexus is invulnerable if there are any alive towers or inhibitors of the same team
    if (target.type === EntityType.NEXUS) {
      const hasDefenses = Array.from(this.engine.entities.values()).some(e => 
        !e.isDead && 
        e.team === target.team && 
        (e.type === EntityType.TOWER || e.type === EntityType.INHIBITOR)
      );
      if (hasDefenses) {
        return; // Ignore damage
      }
    }

    let finalDamage = damageData.amount;
    // Apply resistance
    const resistance = target.resistance || 0;
    finalDamage = finalDamage * (1 - Math.min(resistance, 0.8)); // Cap resistance at 80%
    
    // Apply Shield
    if (target.shield > 0 && target.shieldEndTime && target.shieldEndTime > Date.now()) {
      if (target.shield >= finalDamage) {
        target.shield -= finalDamage;
        finalDamage = 0;
      } else {
        finalDamage -= target.shield;
        target.shield = 0;
      }
    }

    target.health -= finalDamage;
    target.lastDamageTime = Date.now();
    
    this.engine.emit('damage', {
      targetId: target.id,
      amount: finalDamage,
      type: damageData.type,
      sourceId: damageData.sourceOwnerId,
      position: { ...target.pos } // Clone position for floating text
    });

    if (target.health <= 0) {
      target.health = 0;
      this.handleDeath(target, damageData.sourceOwnerId);
    }
  }

  private handleDeath(target: Entity, killerId: string) {
    target.isDead = true;
    target.isMoving = false;
    target.isCasting = false;
    
    const killer = this.engine.entities.get(killerId);
    
    this.engine.emit('kill', {
      targetId: target.id,
      killerId: killerId,
      targetType: target.type,
      killerType: killer?.type
    });

    if (target.type === EntityType.TOWER) {
      this.engine.emit('message', {
        text: `${target.team === Team.BLUE ? 'Blue' : 'Red'} Tower Destroyed!`,
        type: 'warning'
      });
    }

    if (target.type === EntityType.INHIBITOR) {
      this.engine.emit('message', {
        text: `${target.team === Team.BLUE ? 'Blue' : 'Red'} Inhibitor Destroyed!`,
        type: 'warning'
      });
    }

    if (killer) {
      // Grant Gold
      if (killer.type === EntityType.CHAMPION && target.goldReward) {
        this.engine.gold[killer.team] += target.goldReward * this.engine.goldGainMultiplier[killer.team];
        console.log(`Granted ${target.goldReward} gold to ${killer.id}`);
      }
      
      // Grant XP (simplified: just give to killer if champion)
      if (killer.type === EntityType.CHAMPION && target.xpReward) {
        killer.xp += target.xpReward;
        // Level up logic could go here
      }
    }

    // Trigger death event
    console.log(`Entity ${target.id} died, killed by ${killerId}`);
  }
}
