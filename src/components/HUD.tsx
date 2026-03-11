import React from 'react';
import { motion } from 'motion/react';
import { Shield, Zap, Sword, Target, HelpCircle, Plus, Coins, ShoppingBag, Flame, Wind, Ghost, ArrowUp } from 'lucide-react';
import { Entity, Ability, Team, AbilitySlot } from '../game/types';
import { GameEngine } from '../game/engine';
import { Minimap } from './Minimap';
import { KillFeed } from './KillFeed';
import { GameMessages } from './GameMessages';

interface HUDProps {
  engine: GameEngine;
  player: Entity;
  onAbility: (key: string) => void;
  onUpgradeAbility: (key: string) => void;
  onToggleShop: () => void;
}

const ICON_MAP: { [key: string]: React.ReactNode } = {
  'Target': <Target className="w-6 h-6" />,
  'Shield': <Shield className="w-6 h-6" />,
  'Zap': <Zap className="w-6 h-6" />,
  'Sword': <Sword className="w-6 h-6" />,
  'Flame': <Flame className="w-6 h-6" />,
  'Wind': <Wind className="w-6 h-6" />,
  'Ghost': <Ghost className="w-6 h-6" />,
  'ArrowUp': <ArrowUp className="w-6 h-6" />,
};

export const HUD: React.FC<HUDProps> = ({ engine, player, onAbility, onUpgradeAbility, onToggleShop }) => {
  const abilities = player.abilities 
    ? [player.abilities.passive, player.abilities.q, player.abilities.w, player.abilities.e, player.abilities.r].filter((a): a is Ability => !!a) 
    : [];

  const xpProgress = (player.xp / (280 + (player.level * 100))) * 100;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Game Messages */}
      <GameMessages engine={engine} />

      {/* Kill Feed */}
      <KillFeed engine={engine} />

      <div className="absolute bottom-0 left-0 right-0 p-6 flex justify-center items-end gap-8">
        {/* Respawn Timer */}
      {player.isDead && player.respawnTimer && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-center z-50">
          <div className="text-red-500 font-black text-6xl drop-shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse">
            {Math.ceil((player.respawnTimer - Date.now()) / 1000)}s
          </div>
          <div className="text-slate-300 font-bold uppercase tracking-widest text-sm mt-2 bg-slate-900/80 px-4 py-1 rounded-full backdrop-blur-sm">
            Respawning
          </div>
        </div>
      )}

      {/* Stats Panel */}
      <div className="bg-slate-900/90 border border-slate-700 p-4 rounded-xl pointer-events-auto flex flex-col gap-2 w-64 backdrop-blur-sm shadow-xl">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-yellow-500 flex items-center justify-center text-yellow-500 font-bold text-sm shadow-lg shadow-yellow-500/20">
              {player.level}
            </div>
            <span className="text-slate-400 text-xs uppercase font-bold tracking-widest">Stats</span>
          </div>
          <div className="flex items-center gap-1 text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded border border-yellow-400/20">
            <Coins className="w-3 h-3" />
            <span className="font-mono text-xs font-bold">{Math.floor(player.gold)}</span>
          </div>
        </div>
        
        {/* Health */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-slate-400 uppercase font-bold">
            <span>Health</span>
            <span>{Math.ceil(player.health)}{player.shield > 0 ? ` (+${Math.ceil(player.shield)})` : ''} / {player.maxHealth}</span>
          </div>
          <div className="h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700 relative">
            <motion.div 
              className="h-full bg-emerald-500 absolute left-0 top-0"
              initial={{ width: '100%' }}
              animate={{ width: `${(player.health / player.maxHealth) * 100}%` }}
            />
            {player.shield > 0 && (
              <motion.div 
                className="h-full bg-blue-400 absolute top-0"
                initial={{ opacity: 0 }}
                animate={{ 
                  opacity: 0.8,
                  left: `${(player.health / player.maxHealth) * 100}%`,
                  width: `${(player.shield / player.maxHealth) * 100}%` 
                }}
              />
            )}
          </div>
        </div>

        {/* Mana */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-slate-400 uppercase font-bold">
            <span>Mana</span>
            <span>{Math.ceil(player.mana || 0)} / {player.maxMana || 0}</span>
          </div>
          <div className="h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700 relative">
            <motion.div 
              className="h-full bg-blue-500"
              initial={{ width: '100%' }}
              animate={{ width: `${((player.mana || 0) / (player.maxMana || 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* XP Bar */}
        <div className="h-1 bg-slate-800 rounded-full overflow-hidden mt-2">
          <motion.div 
            className="h-full bg-purple-500"
            initial={{ width: '0%' }}
            animate={{ width: `${Math.min(100, xpProgress)}%` }}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800">
          <div className="flex items-center gap-2 text-slate-300 text-xs">
            <Sword className="w-3 h-3 text-red-400" />
            <span>{Math.round(player.attackDamage)}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300 text-xs">
            <Shield className="w-3 h-3 text-blue-400" />
            <span>{Math.round(player.maxHealth)}</span>
          </div>
        </div>
      </div>

      {/* Abilities Panel */}
      <div className="flex gap-3 pointer-events-auto bg-slate-900/80 p-3 rounded-2xl border border-slate-700 backdrop-blur-md shadow-xl relative">
        {/* Skill Points Notification */}
        {player.skillPoints > 0 && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-yellow-500 text-slate-900 px-3 py-1 rounded-full text-xs font-bold animate-bounce shadow-lg shadow-yellow-500/50">
            {player.skillPoints} Skill Point{player.skillPoints > 1 ? 's' : ''} Available!
          </div>
        )}

        {abilities.map((ability) => {
          const Icon = ICON_MAP[ability.data.icon || ''] || <HelpCircle className="w-6 h-6" />;
          const onCooldown = Date.now() - ability.lastUsed < ability.data.cooldown;
          const cooldownRemaining = Math.ceil((ability.data.cooldown - (Date.now() - ability.lastUsed)) / 1000);
          const canUpgrade = player.skillPoints > 0 && ability.level < ability.maxLevel;
          
          return (
            <div key={ability.data.id} className="relative group">
              {/* Upgrade Button */}
              {canUpgrade && (
                <button
                  onClick={() => onUpgradeAbility(ability.data.id)}
                  className="absolute -top-3 -right-3 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-slate-900 hover:bg-yellow-400 transition-colors z-20 shadow-lg border-2 border-slate-900"
                >
                  <Plus className="w-4 h-4 font-bold" />
                </button>
              )}

              {/* Level Dots */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-0.5">
                {Array.from({ length: ability.maxLevel }).map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-1 h-1 rounded-full ${i < ability.level ? 'bg-yellow-500' : 'bg-slate-700'}`}
                  />
                ))}
              </div>

              <button
                onClick={() => onAbility(AbilitySlot[ability.data.slot].toLowerCase())}
                disabled={onCooldown || ability.level === 0}
                className={`w-16 h-16 bg-slate-800 border-2 rounded-xl flex items-center justify-center transition-all overflow-hidden relative
                  ${onCooldown ? 'border-slate-700 opacity-50 cursor-not-allowed' : 
                    ability.level === 0 ? 'border-slate-800 opacity-30 grayscale' :
                    'border-slate-600 hover:border-blue-400 hover:bg-slate-700 active:scale-95'}
                `}
                title={`${ability.data.name}: ${ability.data.description}`}
              >
                <div className={`text-slate-400 transition-colors ${!onCooldown && ability.level > 0 && 'group-hover:text-blue-400'}`}>
                  {Icon}
                </div>
                
                <span className="absolute bottom-1 right-1 text-[10px] font-bold text-slate-500 uppercase">
                  {ability.data.id}
                </span>

                {/* Cooldown Overlay */}
                {onCooldown && (
                  <div 
                    className="absolute inset-0 bg-slate-950/40 flex flex-col items-center justify-center z-10"
                    style={{
                      background: `conic-gradient(transparent ${((Date.now() - ability.lastUsed) / ability.data.cooldown) * 360}deg, rgba(15, 23, 42, 0.8) 0deg)`
                    }}
                  >
                    <span className="text-white font-black text-xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] z-20">
                      {cooldownRemaining}
                    </span>
                  </div>
                )}

                {!onCooldown && ability.level > 0 && (
                  <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Inventory & Shop */}
      <div className="bg-slate-900/90 border border-slate-700 p-3 rounded-xl pointer-events-auto flex flex-col gap-2 backdrop-blur-sm shadow-xl">
        <div className="grid grid-cols-3 gap-1 w-[100px]">
          {Array.from({ length: 6 }).map((_, i) => {
            const item = player.items[i];
            return (
              <div key={i} className="aspect-square bg-slate-950 rounded border border-slate-800 flex items-center justify-center relative group">
                {item ? (
                  <>
                     {/* Placeholder Icon */}
                     <div className="text-[8px] font-bold text-slate-500 truncate px-0.5">{item.name.substring(0, 2)}</div>
                     {/* Tooltip */}
                     <div className="absolute bottom-full mb-2 right-0 w-32 bg-slate-900 border border-slate-700 p-2 rounded shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none z-50 text-[10px]">
                        <div className="text-yellow-400 font-bold">{item.name}</div>
                        <div className="text-slate-400">{item.description}</div>
                     </div>
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
        
        <button 
          onClick={onToggleShop}
          className="w-full py-2 bg-yellow-600 hover:bg-yellow-500 text-slate-900 font-bold text-xs uppercase rounded flex items-center justify-center gap-2 transition-colors"
        >
          <ShoppingBag className="w-3 h-3" /> Shop
        </button>
      </div>

      {/* Minimap */}
      <div className="bg-slate-900/90 border border-slate-700 w-48 h-48 rounded-xl pointer-events-auto overflow-hidden relative backdrop-blur-sm shadow-xl">
        <Minimap engine={engine} playerTeam={player.team} />
      </div>
    </div>
  </div>
  );
};
