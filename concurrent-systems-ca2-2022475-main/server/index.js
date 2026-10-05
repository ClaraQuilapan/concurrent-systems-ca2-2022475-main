// server/index.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('../client'));

const gameTurns = new Map();
const gamePlayers = new Map(); // gameId -> Set of socket IDs
let totalGamesPlayed = 0;

const playerStats = new Map(); // socket.id => { wins: 0, losses: 0 }
const gameWinners = new Map(); // gameId => "player1" o "player2"
const gamePlayerRoles = new Map(); // gameId => { socketId1: "player1", socketId2: "player2" }

//HTML for users
app.get("/games", (req, res) => {
  let html = "<h1>Active Games</h1><ul>";
  
  for (const [gameId, players] of gamePlayers.entries()) {
    html += `<li><strong>${gameId}</strong>: ${players.length} player(s)</li>`;
  }
  
  html += "</ul>";
  res.send(html);
});

//JSON for apps
app.get("/games-json", (req, res) => {
  const summary = {};
  for (const [gameId, players] of gamePlayers.entries()) {
    summary[gameId] = players.length;
  }
  res.json(summary);
});

//const PORT = 3000;



// Combat Logic: resolve who wins
function resolveCombat(attacker, defender) {
  if (attacker === defender) return "both";

  if (
    (attacker === "🧛" && defender === "🐺") ||
    (attacker === "🐺" && defender === "👻") ||
    (attacker === "👻" && defender === "🧛")
  ) {
    return "attacker";
  }

  return "defender";
}

io.on("connection", (socket) => {
  console.log("A user connected");

  // Join specific game room
  socket.on("joinGame", (gameId) => {
    socket.join(gameId);
    //console.log(`User joined game: ${gameId}`);
    // Initialize turn for this game only if it doesn't exist yet
    if (!gameTurns.has(gameId)) {
      gameTurns.set(gameId, "player1");
    }

    const players = gamePlayers.get(gameId) || [];
    if (!players.includes(socket.id)) {
      players.push(socket.id);
    }
    //players.add(socket.id);
    gamePlayers.set(gameId, players);

    const role = players[0] === socket.id ? "player1" : "player2";
    
    let roleMap = gamePlayerRoles.get(gameId) || {};
    roleMap[socket.id] = role;
    gamePlayerRoles.set(gameId, roleMap);

    if (!playerStats.has(socket.id)) {
      playerStats.set(socket.id, { wins: 0, losses: 0 });
    }

    socket.emit("assignPlayer", role);

    socket.emit("gameStats", {
      totalGamesPlayed,
      wins: playerStats.get(socket.id).wins,
      losses: playerStats.get(socket.id).losses
    });

    // Emit the current player turn immediately after joining
    io.to(gameId).emit("currentTurnChanged", gameTurns.get(gameId));
  });

  //handle turn change
  socket.on("endTurn", (gameId) => {
    const current = gameTurns.get(gameId);
    const next = current === "player1" ? "player2" : "player1";
    gameTurns.set(gameId, next);

    // Notify all players in this game
    io.to(gameId).emit("currentTurnChanged", next);
  });

  // Emit only to players in the same room
  socket.on("monsterAction", (data) => {
    io.to(data.gameId).emit("monsterAction", data);
  });

  //Handle combat request
  socket.on("combatRequest", (data) => {
    const outcome = resolveCombat(data.attacker, data.defender);

    const result = {
      gameId: data.gameId,
      from: data.from,
      to: data.to,
      outcome,
      attackerOwner: data.attackerOwner,
      defenderOwner: data.defenderOwner
    };

    // If attacker wins, include monster info
    if (outcome === "attacker") {
      result.type = data.attacker;
      result.owner = data.attackerOwner;
    }

    io.to(data.gameId).emit("combatResult", result);
  });

  socket.on("declareWinner", ({ gameId, winner }) => {
    if (gameWinners.has(gameId)) return;

    totalGamesPlayed++;
    gameWinners.set(gameId, winner);
    
    const roles = gamePlayerRoles.get(gameId);
    if (!roles) return;
    
    gameWinners.set(gameId, winner);
    
    for (const [socketId, role] of Object.entries(roles)) {
      const stats = playerStats.get(socketId);
      if (!stats) continue;
      
      if (role === winner) {
        stats.wins += 1;
      } else {
        stats.losses += 1;
      }
      
      io.to(socketId).emit("gameStats", {
        totalGamesPlayed,
        wins: stats.wins,
        losses: stats.losses
      });
      // send event to end the game
      io.to(gameId).emit("gameOver", { winner });
    }
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });

});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
