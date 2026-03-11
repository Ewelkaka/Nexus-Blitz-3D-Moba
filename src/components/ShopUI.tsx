import React from 'react';
import { Entity, Item } from '../game/types';
import { ITEMS } from '../game/items';
import { Coins, X } from 'lucide-react';

interface ShopUIProps {
  player: Entity;
  onBuy: (itemId: string) => void;
  onSell: (itemIndex: number) => void;
  onClose: () => void;
}

export const ShopUI: React.FC<ShopUIProps> = ({ player, onBuy, onSell, onClose }) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 pointer-events-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-[800px] h-[600px] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-slate-100 uppercase tracking-widest">Item Shop</h2>
            <div className="flex items-center gap-2 text-yellow-400 bg-yellow-400/10 px-4 py-2 rounded-full border border-yellow-400/20">
              <Coins className="w-5 h-5" />
              <span className="font-mono font-bold">{player.gold} G</span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-8 h-8" />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Item List */}
          <div className="flex-1 p-6 overflow-y-auto grid grid-cols-4 gap-4 content-start">
            {ITEMS.map((item) => {
              const canAfford = player.gold >= item.cost;
              const isFull = player.items.length >= 6;
              
              return (
                <button
                  key={item.id}
                  onClick={() => onBuy(item.id)}
                  disabled={!canAfford || isFull}
                  className={`relative group flex flex-col items-center gap-2 p-4 rounded-xl border transition-all
                    ${canAfford && !isFull 
                      ? 'bg-slate-800 border-slate-700 hover:border-yellow-400 hover:bg-slate-700' 
                      : 'bg-slate-900 border-slate-800 opacity-50 cursor-not-allowed'}
                  `}
                >
                  <div className="w-16 h-16 bg-slate-950 rounded-lg flex items-center justify-center border border-slate-800 group-hover:border-yellow-400/50 transition-colors">
                    {/* Placeholder Icon */}
                    <div className="text-slate-500 font-bold text-xs">{item.icon}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-slate-200 font-bold text-sm">{item.name}</div>
                    <div className="text-yellow-400 text-xs font-mono">{item.cost} G</div>
                  </div>
                  
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-slate-950 border border-slate-700 p-3 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    <div className="text-xs text-slate-400 mb-2">{item.description}</div>
                    <div className="space-y-1">
                      {Object.entries(item.stats).map(([key, value]) => (
                        <div key={key} className="text-[10px] text-emerald-400 uppercase flex justify-between">
                          <span>{key}</span>
                          <span>+{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Inventory Side Panel */}
          <div className="w-64 bg-slate-950/50 border-l border-slate-800 p-6 flex flex-col gap-4">
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest">Inventory</h3>
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 6 }).map((_, i) => {
                const item = player.items[i];
                return (
                  <div 
                    key={i} 
                    className="aspect-square bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-center relative group"
                  >
                    {item ? (
                      <>
                        <div className="text-slate-300 text-xs font-bold">{item.icon}</div>
                        <button
                          onClick={() => onSell(i)}
                          className="absolute inset-0 bg-red-500/80 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity rounded-lg"
                        >
                          SELL
                        </button>
                      </>
                    ) : (
                      <div className="text-slate-800 text-xs">+</div>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="mt-auto space-y-2">
              <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest">Stats</h3>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Attack Damage</span>
                  <span className="font-mono text-emerald-400">{Math.round(player.attackDamage)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Health</span>
                  <span className="font-mono text-emerald-400">{Math.round(player.maxHealth)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Move Speed</span>
                  <span className="font-mono text-emerald-400">{player.speed.toFixed(1)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>CDR</span>
                  <span className="font-mono text-emerald-400">{Math.round((player.cooldownReduction || 0) * 100)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
