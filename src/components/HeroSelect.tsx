import React from 'react';
import { HEROES, Hero } from '../game/types';
import { motion } from 'motion/react';
import { Sword, Zap, Ghost, Shield, Target, Info } from 'lucide-react';

interface HeroSelectProps {
  onSelect: (hero: Hero) => void;
}

const getHeroIcon = (heroClass: string) => {
  switch (heroClass) {
    case 'Warrior': return <Sword className="w-6 h-6" />;
    case 'Mage': return <Zap className="w-6 h-6" />;
    case 'Assassin': return <Ghost className="w-6 h-6" />;
    case 'Tank': return <Shield className="w-6 h-6" />;
    case 'Ranger': return <Target className="w-6 h-6" />;
    default: return <Sword className="w-6 h-6" />;
  }
};

export const HeroSelect: React.FC<HeroSelectProps> = ({ onSelect }) => {
  const [selectedHero, setSelectedHero] = React.useState<Hero | null>(null);

  return (
    <div className="flex flex-col items-center justify-center h-full w-full p-8 space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-5xl font-black uppercase italic tracking-tighter text-white">Select Your Hero</h2>
        <p className="text-slate-400 font-mono tracking-widest uppercase text-sm">Choose your champion for the Rift</p>
      </div>

      <div className="grid grid-cols-5 gap-6 max-w-6xl w-full">
        {HEROES.map((hero) => (
          <motion.div
            key={hero.id}
            whileHover={{ scale: 1.05, y: -10 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedHero(hero)}
            className={`
              relative cursor-pointer rounded-3xl overflow-hidden border-2 transition-all duration-300
              ${selectedHero?.id === hero.id ? 'border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.5)]' : 'border-slate-800 hover:border-slate-600'}
              bg-slate-900/50 backdrop-blur-xl aspect-[3/4]
            `}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/20 to-slate-950/90" />
            
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-4">
              <div 
                className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-2xl"
                style={{ backgroundColor: `${hero.color}20`, color: hero.color, border: `1px solid ${hero.color}40` }}
              >
                {getHeroIcon(hero.class)}
              </div>
              
              <div className="space-y-1">
                <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white">{hero.name}</h3>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                    {hero.class}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-400 line-clamp-2">{hero.description}</p>
            </div>

            {selectedHero?.id === hero.id && (
              <motion.div 
                layoutId="selection-glow"
                className="absolute inset-0 border-4 border-blue-500/50 pointer-events-none"
              />
            )}
          </motion.div>
        ))}
      </div>

      <div className="h-40 w-full max-w-4xl flex items-center justify-center">
        {selectedHero ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-8 bg-slate-900/80 border border-slate-700 p-8 rounded-3xl w-full"
          >
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-4">
                <h3 className="text-3xl font-black uppercase italic tracking-tighter text-white">{selectedHero.name}</h3>
                <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  {selectedHero.role}
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Health</span>
                  <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${(selectedHero.stats.health / 1200) * 100}%` }} />
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Damage</span>
                  <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500" style={{ width: `${(selectedHero.stats.attackDamage / 100) * 100}%` }} />
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Speed</span>
                  <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${(selectedHero.stats.speed / 6) * 100}%` }} />
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => onSelect(selectedHero)}
              className="px-12 py-5 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black uppercase tracking-widest text-lg shadow-2xl shadow-blue-500/40 transition-all active:scale-95"
            >
              Confirm Selection
            </button>
          </motion.div>
        ) : (
          <div className="flex items-center gap-2 text-slate-500 font-mono uppercase text-sm animate-pulse">
            <Info className="w-4 h-4" /> Select a hero to view details
          </div>
        )}
      </div>
    </div>
  );
};
