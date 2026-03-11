import React, { useState, useEffect } from 'react';
import { socket } from '../socket';
import { Hero, HEROES } from '../game/types';

interface Player {
  id: string;
  name: string;
  heroId: string | null;
  isReady: boolean;
  team: 'BLUE' | 'RED' | null;
}

interface LobbyData {
  id: string;
  players: Player[];
  status: 'WAITING' | 'STARTING' | 'IN_GAME';
}

interface LobbyProps {
  onStartGame: (lobby: LobbyData) => void;
  onBack: () => void;
}

export function Lobby({ onStartGame, onBack }: LobbyProps) {
  const [lobby, setLobby] = useState<LobbyData | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [joinLobbyId, setJoinLobbyId] = useState('');
  const [selectedHero, setSelectedHero] = useState<string | null>(null);

  useEffect(() => {
    socket.on('lobby_created', (data: LobbyData) => {
      setLobby(data);
    });

    socket.on('lobby_updated', (data: LobbyData) => {
      setLobby(data);
    });

    socket.on('match_starting', (data: LobbyData) => {
      setLobby(data);
    });

    socket.on('game_start', (data: LobbyData) => {
      onStartGame(data);
    });

    socket.on('lobby_error', (data: { message: string }) => {
      alert(data.message);
    });

    return () => {
      socket.off('lobby_created');
      socket.off('lobby_updated');
      socket.off('match_starting');
      socket.off('game_start');
      socket.off('lobby_error');
    };
  }, [onStartGame]);

  const handleCreateLobby = () => {
    if (!playerName) return alert('Please enter a name');
    socket.emit('create_lobby', { playerName });
  };

  const handleJoinLobby = () => {
    if (!playerName) return alert('Please enter a name');
    if (!joinLobbyId) return alert('Please enter a lobby ID');
    socket.emit('join_lobby', { lobbyId: joinLobbyId.toUpperCase(), playerName });
  };

  const handleSelectHero = (heroId: string) => {
    if (!lobby) return;
    setSelectedHero(heroId);
    socket.emit('select_hero', { lobbyId: lobby.id, heroId });
  };

  const handleToggleReady = () => {
    if (!lobby) return;
    if (!selectedHero) return alert('Please select a hero first');
    socket.emit('toggle_ready', { lobbyId: lobby.id });
  };

  if (!lobby) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-900 text-white p-8">
        <h1 className="text-4xl font-bold mb-8">Multiplayer Lobby</h1>
        
        <div className="w-full max-w-md bg-slate-800 p-6 rounded-xl shadow-xl">
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-400 mb-2">Your Name</label>
            <input 
              type="text" 
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your name"
            />
          </div>

          <div className="space-y-4">
            <button 
              onClick={handleCreateLobby}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              Create New Lobby
            </button>
            
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-slate-600"></div>
              <span className="flex-shrink-0 mx-4 text-slate-500 text-sm">OR</span>
              <div className="flex-grow border-t border-slate-600"></div>
            </div>

            <div className="flex space-x-2">
              <input 
                type="text" 
                value={joinLobbyId}
                onChange={(e) => setJoinLobbyId(e.target.value)}
                className="flex-grow bg-slate-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                placeholder="Lobby ID"
                maxLength={6}
              />
              <button 
                onClick={handleJoinLobby}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
              >
                Join
              </button>
            </div>
          </div>
          
          <button 
            onClick={onBack}
            className="mt-8 text-slate-400 hover:text-white transition-colors"
          >
            &larr; Back to Main Menu
          </button>
        </div>
      </div>
    );
  }

  const myPlayer = lobby.players.find(p => p.id === socket.id);

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-4">
          Lobby: <span className="text-blue-400 tracking-wider">{lobby.id}</span>
          <button 
            onClick={() => {
              navigator.clipboard.writeText(lobby.id);
              alert('Lobby ID copied to clipboard!');
            }}
            className="text-sm bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded-lg transition-colors"
          >
            Copy ID
          </button>
        </h1>
        <div className="text-xl">
          Status: <span className={lobby.status === 'STARTING' ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}>{lobby.status}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 flex-grow">
        {/* Players List */}
        <div className="col-span-1 bg-slate-800 rounded-xl p-6 flex flex-col">
          <h2 className="text-xl font-semibold mb-4 border-b border-slate-700 pb-2">Players ({lobby.players.length}/10)</h2>
          <div className="flex-grow overflow-y-auto space-y-3">
            {lobby.players.map(p => {
              const hero = HEROES.find(h => h.id === p.heroId);
              return (
                <div key={p.id} className={`flex items-center justify-between p-3 rounded-lg ${p.id === socket.id ? 'bg-slate-700 border border-slate-600' : 'bg-slate-700/50'}`}>
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${p.isReady ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                    <div>
                      <div className="font-medium">{p.name} {p.id === socket.id && '(You)'}</div>
                      <div className="text-xs text-slate-400">{hero ? hero.name : 'Selecting...'}</div>
                    </div>
                  </div>
                  {lobby.status === 'STARTING' && p.team && (
                    <div className={`text-xs font-bold px-2 py-1 rounded ${p.team === 'BLUE' ? 'bg-blue-900 text-blue-300' : 'bg-red-900 text-red-300'}`}>
                      {p.team}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Hero Selection */}
        <div className="col-span-2 bg-slate-800 rounded-xl p-6 flex flex-col">
          <h2 className="text-xl font-semibold mb-4 border-b border-slate-700 pb-2">Select Hero</h2>
          
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6 flex-grow overflow-y-auto">
            {HEROES.map(hero => (
              <button
                key={hero.id}
                onClick={() => handleSelectHero(hero.id)}
                disabled={myPlayer?.isReady || lobby.status !== 'WAITING'}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  selectedHero === hero.id 
                    ? 'border-blue-500 bg-blue-900/30' 
                    : 'border-slate-700 bg-slate-700/50 hover:border-slate-500'
                } ${(myPlayer?.isReady || lobby.status !== 'WAITING') ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="font-bold text-lg mb-1" style={{ color: hero.color }}>{hero.name}</div>
                <div className="text-xs text-slate-400 mb-2">{hero.class} - {hero.role}</div>
                <div className="text-sm text-slate-300 line-clamp-2">{hero.description}</div>
              </button>
            ))}
          </div>

          <div className="mt-auto pt-4 border-t border-slate-700 flex justify-between items-center">
            <div className="text-sm text-slate-400">
              {lobby.status === 'WAITING' ? 'Waiting for players to ready up...' : 'Match starting soon!'}
            </div>
            <button
              onClick={handleToggleReady}
              disabled={!selectedHero || lobby.status !== 'WAITING'}
              className={`py-3 px-8 rounded-lg font-bold text-lg transition-colors ${
                !selectedHero || lobby.status !== 'WAITING'
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : myPlayer?.isReady
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {myPlayer?.isReady ? 'Cancel Ready' : 'Ready Up'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
