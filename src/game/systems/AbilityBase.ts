import { AbilityData, Ability } from '../types';
import { ChampionBase } from '../ChampionBase';

export abstract class AbilityBase {
  protected data: AbilityData;
  protected owner: ChampionBase;
  protected currentCooldown: number = 0;
  protected _isCasting: boolean = false;

  constructor(owner: ChampionBase, data: AbilityData) {
    this.owner = owner;
    this.data = data;
  }

  abstract canCast(): boolean;
  abstract startCast(): void;
  abstract execute(): void;
  abstract endCast(): void;

  update(deltaTime: number) {
    if (this.currentCooldown > 0) {
      this.currentCooldown -= deltaTime;
    }
  }

  protected startCooldown() {
    const cdr = this.owner.cooldownReduction || 0;
    this.currentCooldown = this.data.cooldown * (1 - cdr);
  }

  get isOnCooldown(): boolean {
    return this.currentCooldown > 0;
  }

  get isCasting(): boolean {
    return this._isCasting;
  }

  get dataRef(): AbilityData {
    return this.data;
  }
}
