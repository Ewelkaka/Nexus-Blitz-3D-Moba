import React from 'react';
import { Entity, Team } from '../game/types';

interface ScoreboardProps {
  entities: Entity[];
  onClose: () => void;
}

export const Scoreboard: React.FC<ScoreboardProps> = ({ entities, onClose }) => {
  const champions = entities.filter(e => e.type === 'CHAMPION');
  const blueTeam = champions.filter(c => c.team === Team.BLUE);
  const redTeam = champions.filter(c => c.team === Team.RED);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-4xl text-white">
        <h2 className="text-2xl font-bold mb-4">Scoreboard</h2>
        
        <div className="grid grid-cols-2 gap-8">
          <div>
            <h3 className="text-blue-400 font-bold mb-2">Blue Team</h3>
            {blueTeam.map(c => (
              <div key={c.id} className="flex justify-between p-2 border-b border-zinc-800">
                <span>{c.heroId} (Lvl {c.level})</span>
                <span>{c.kills}/{c.deaths}/{c.assists}</span>
                <span>{c.totalGoldEarned}g</span>
              </div>
            ))}
          </div>
          <div>
            <h3 className="text-red-400 font-bold mb-2">Red Team</h3>
            {redTeam.map(c => (
              <div key={c.id} className="flex justify-between p-2 border-b border-zinc-800">
                <span>{c.heroId} (Lvl {c.level})</span>
                <span>{c.kills}/{c.deaths}/{c.assists}</span>
                <span>{c.totalGoldEarned}g</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
