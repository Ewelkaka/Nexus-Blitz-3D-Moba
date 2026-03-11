import { Entity, StatusEffect, StatusEffectType, EntityType } from '../types';

export class StatusEffectController {
  init() { console.log("StatusEffectController Init"); }
  shutdown() { console.log("StatusEffectController Shutdown"); }

  update(entity: Entity, deltaTime: number) {
    if (entity.activeStatusEffects.length === 0) return;

    entity.activeStatusEffects = entity.activeStatusEffects.filter(effect => {
      effect.endTime -= deltaTime;
      return effect.endTime > 0;
    });

    // Apply effects
    entity.isStunned = entity.activeStatusEffects.some(e => e.type === StatusEffectType.STUN);
    entity.isRooted = entity.activeStatusEffects.some(e => e.type === StatusEffectType.ROOT);
  }

  applyEffect(entity: Entity, effect: StatusEffect) {
    if (entity.type === EntityType.TOWER || entity.type === EntityType.INHIBITOR || entity.type === EntityType.NEXUS) {
      return;
    }
    entity.activeStatusEffects.push(effect);
  }
}
