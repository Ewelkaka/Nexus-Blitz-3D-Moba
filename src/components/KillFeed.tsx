import React, { useEffect, useState } from 'react';
import { GameEngine } from '../game/engine';
import { EntityType, Team } from '../game/types';
import { Skull, Sword } from 'lucide-react';

interface KillEvent {
  id: string;
  killerName: string;
  victimName: string;
  killerTeam: Team;
  victimTeam: Team;
  time: number;
}

export const KillFeed = ({ engine }: { engine: GameEngine }) => {
  const [kills, setKills] = useState<KillEvent[]>([]);

  useEffect(() => {
    // @ts-ignore
    const handleKill = (data: any) => {
      const killer = engine.entities.get(data.killerId);
      const victim = engine.entities.get(data.targetId);
      
      // Only show champion kills or significant kills
      if (!killer || !victim) return;
      if (victim.type === EntityType.MINION) return; // Ignore minion kills for feed to reduce spam

      setKills(prev => [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        killerName: killer.type === EntityType.CHAMPION ? (killer.team === Team.BLUE ? 'Blue Champion' : 'Red Champion') : killer.type,
        victimName: victim.type === EntityType.CHAMPION ? (victim.team === Team.BLUE ? 'Blue Champion' : 'Red Champion') : victim.type,
        killerTeam: killer.team,
        victimTeam: victim.team,
        time: Date.now()
      }]);
    };

    // @ts-ignore
    const cleanup = engine.on('kill', handleKill);
    return cleanup;
  }, [engine]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setKills(prev => prev.filter(k => now - k.time < 5000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute top-24 right-4 flex flex-col gap-2 pointer-events-none w-64 items-end z-50">
      {kills.map(kill => (
        <div key={kill.id} className="bg-slate-900/80 border border-slate-700 px-3 py-2 rounded shadow-lg flex items-center gap-2 text-xs backdrop-blur-sm animate-in slide-in-from-right fade-in duration-300">
          <span className={`font-bold ${kill.killerTeam === Team.BLUE ? 'text-blue-400' : 'text-red-400'}`}>
            {kill.killerName}
          </span>
          <Sword className="w-3 h-3 text-slate-500" />
          <span className={`font-bold ${kill.victimTeam === Team.BLUE ? 'text-blue-400' : 'text-red-400'}`}>
            {kill.victimName}
          </span>
        </div>
      ))}
    </div>
  );
};
