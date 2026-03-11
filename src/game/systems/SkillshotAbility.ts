import { AbilityBase } from './AbilityBase';
import { ChampionBase } from '../ChampionBase';
import { AbilityData } from '../types';

export class SkillshotAbility extends AbilityBase {
  constructor(owner: ChampionBase, data: AbilityData) {
    super(owner, data);
  }

  canCast(): boolean {
    return !this.isOnCooldown && this.owner.mana! >= this.data.manaCost && !this.isCasting;
  }

  startCast(): void {
    this._isCasting = true;
    this.owner.isCasting = true;
    this.owner.isMoving = false; // Interrupt movement
    
    // Logic to handle cast time
    setTimeout(() => {
      this.execute();
      this.endCast();
    }, this.data.castTime * 1000);
  }

  execute(): void {
    this.owner.mana! -= this.data.manaCost;
    console.log(`Executing skillshot: ${this.data.name}`);
    // Logic to spawn projectile
  }

  endCast(): void {
    this._isCasting = false;
    this.owner.isCasting = false;
    this.startCooldown();
  }
}
