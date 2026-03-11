import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { GameEngine } from './src/game/engine';
import { Team } from './src/game/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  // --- Lobby System ---
  interface Player {
    id: string;
    name: string;
    heroId: string | null;
    isReady: boolean;
    team: 'BLUE' | 'RED' | null;
  }

  interface Lobby {
    id: string;
    players: Player[];
    status: 'WAITING' | 'STARTING' | 'IN_GAME';
    engine?: GameEngine;
    interval?: NodeJS.Timeout;
  }

  const lobbies: Record<string, Lobby> = {};

  const generateLobbyId = () => Math.random().toString(36).substr(2, 6).toUpperCase();

  // Chat & Lobby logic
  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // --- Chat ---
    socket.on('chat_message', (msg) => {
      io.emit('chat_message', {
        id: Date.now() + Math.random().toString(36).substr(2, 9),
        user: msg.user || 'Anonymous',
        text: msg.text,
        timestamp: new Date().toISOString()
      });
    });

    // --- Lobby ---
    socket.on('create_lobby', (data: { playerName: string }) => {
      const lobbyId = generateLobbyId();
      lobbies[lobbyId] = {
        id: lobbyId,
        players: [{ id: socket.id, name: data.playerName, heroId: null, isReady: false, team: null }],
        status: 'WAITING'
      };
      socket.join(lobbyId);
      socket.emit('lobby_created', lobbies[lobbyId]);
    });

    socket.on('join_lobby', (data: { lobbyId: string, playerName: string }) => {
      const lobby = lobbies[data.lobbyId];
      if (lobby && lobby.status === 'WAITING' && lobby.players.length < 10) {
        lobby.players.push({ id: socket.id, name: data.playerName, heroId: null, isReady: false, team: null });
        socket.join(data.lobbyId);
        io.to(data.lobbyId).emit('lobby_updated', lobby);
      } else {
        socket.emit('lobby_error', { message: 'Lobby not found or full' });
      }
    });

    socket.on('select_hero', (data: { lobbyId: string, heroId: string }) => {
      const lobby = lobbies[data.lobbyId];
      if (lobby) {
        const player = lobby.players.find(p => p.id === socket.id);
        if (player) {
          player.heroId = data.heroId;
          io.to(data.lobbyId).emit('lobby_updated', lobby);
        }
      }
    });

    socket.on('toggle_ready', (data: { lobbyId: string }) => {
      const lobby = lobbies[data.lobbyId];
      if (lobby && lobby.status === 'WAITING') {
        const player = lobby.players.find(p => p.id === socket.id);
        if (player && player.heroId) {
          player.isReady = !player.isReady;
          io.to(data.lobbyId).emit('lobby_updated', lobby);

          const allReady = lobby.players.every(p => p.isReady);
          if (allReady && lobby.players.length >= 1) { // Allowing 1 for testing, ideally 10
             // Balance teams
             const shuffled = [...lobby.players].sort(() => 0.5 - Math.random());
             let blueCount = 0;
             let redCount = 0;
             shuffled.forEach((p) => {
               if (blueCount <= redCount) {
                 p.team = 'BLUE';
                 blueCount++;
               } else {
                 p.team = 'RED';
                 redCount++;
               }
             });
             lobby.status = 'STARTING';
             io.to(data.lobbyId).emit('match_starting', lobby);
             
             setTimeout(() => {
               lobby.status = 'IN_GAME';
               
               // Initialize Server-Side Engine
               lobby.engine = new GameEngine();
               lobby.engine.multiplayer = true;
               const enginePlayers = lobby.players.map(p => ({
                 id: p.id,
                 heroId: p.heroId!,
                 team: p.team as Team
               }));
               lobby.engine.init('', enginePlayers);

               io.to(data.lobbyId).emit('game_start', lobby);

               // Start Server Game Loop
               lobby.interval = setInterval(() => {
                 if (lobby.engine) {
                   lobby.engine.update();
                   const state = {
                     entities: Array.from(lobby.engine.entities.values()),
                     projectiles: lobby.engine.projectiles,
                     gold: lobby.engine.gold,
                     gameState: lobby.engine.gameState,
                     activeEvent: lobby.engine.activeEvent,
                     activeEventEndTime: lobby.engine.activeEventEndTime,
                     sounds: lobby.engine.soundQueue
                   };
                   io.to(data.lobbyId).emit('game_state_update', state);
                   lobby.engine.soundQueue = []; // Clear queue after sending
                 }
               }, 1000 / 30); // 30 FPS

             }, 3000);
          }
        }
      }
    });

    socket.on('game_input', (data: { type: string, data: any }) => {
      // Find which lobby this user is in
      let userLobbyId = null;
      for (const lobbyId in lobbies) {
        if (lobbies[lobbyId].players.some(p => p.id === socket.id)) {
          userLobbyId = lobbyId;
          break;
        }
      }
      
      if (userLobbyId) {
        const lobby = lobbies[userLobbyId];
        if (lobby.engine) {
          lobby.engine.handleInput(data.type, data.data, socket.id);
        }
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      // Remove player from lobby
      for (const lobbyId in lobbies) {
        const lobby = lobbies[lobbyId];
        const playerIndex = lobby.players.findIndex(p => p.id === socket.id);
        if (playerIndex !== -1) {
          lobby.players.splice(playerIndex, 1);
          if (lobby.players.length === 0) {
            delete lobbies[lobbyId];
          } else {
            io.to(lobbyId).emit('lobby_updated', lobby);
          }
          break;
        }
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
