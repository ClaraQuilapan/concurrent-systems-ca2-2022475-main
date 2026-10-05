const socket = io();
const board = document.getElementById("game-board");
const monsterTypeSelect = document.getElementById("monster-type");


let gameId = null;
let currentPlayer = null;
let myPlayer = null;
let selectedCell = null; // this will store the currently selected monster cell
let eliminatedCount = 0;
const eliminatedDisplay = document.getElementById("eliminated-count");

const player1KillsDisplay = document.getElementById("player1-kills");
const player2KillsDisplay = document.getElementById("player2-kills");
let player1Kills = 0;
let player2Kills = 0;
let player1Eliminated = false;
let player2Eliminated = false;
let winnerDeclared = false;


// Create a 10x10 grid of cells
for (let row = 0; row < 10; row++) {
  for (let col = 0; col < 10; col++) {
    const cell = document.createElement("div");
    cell.classList.add("cell");

    // Store the row and column index as data attributes
    cell.dataset.row = row;
    cell.dataset.col = col;

    // Add click event to each cell
    cell.addEventListener("click", () => handleCellClick(cell, row, col));

    // Add cell to the game board
    board.appendChild(cell);
  }
}


// Handle cell click: placing, selecting, or moving monsters
function handleCellClick(cell, row, col) {
  // Prevent actions if it's not your turn
  if (myPlayer !== currentPlayer) {
    alert("It's not your turn!");
    return;
  }
  // Block eliminated players from taking actions
  if (
    (myPlayer === "player1" && player1Eliminated) ||
    (myPlayer === "player2" && player2Eliminated)
  ) {
    alert("You have been eliminated. You can't make any more moves.");
    return;
  }
  // If no cell is selected yet
  if (!selectedCell) {
    // If the clicked cell has a monster, select it
    if (cell.classList.contains("monster") && cell.classList.contains(myPlayer)) {
      selectedCell = cell;
      selectedCell.classList.add("selected");
      //Block selection of opponent's monster
    //} else if (cell.classList.contains("monster")) {
      //alert("You can only select your own monsters!");
    } 
    // If it's a border cell and empty, place a monster
    else if (isBorderCell(row, col) && !cell.classList.contains("monster")) {
      const monsterType = monsterTypeSelect.value;
      cell.textContent = monsterType;
      cell.classList.add("monster", myPlayer); // add a player
    
      // Emit placement event
      socket.emit("monsterAction", {
        gameId,
        from: null,
        to: { row, col },
        type: monsterType,
        owner: myPlayer
      });

      //switchPlayer(); // change the turn
    
    } else {
      alert("You can only place monsters on the edge or select existing ones.");
    }
  } else {
    // A cell is already selected: try to move the monster
    if (cell === selectedCell) {
      // Clicked the same cell again — unselect
      selectedCell.classList.remove("selected");
      selectedCell = null;
      return;
    }

    const fromRow = parseInt(selectedCell.dataset.row);
    const fromCol = parseInt(selectedCell.dataset.col);

     // Prevent moving opponent's monster (safety double-check)
    if (!selectedCell.classList.contains(myPlayer)) {
      alert("You can only move your own monsters!");
      return;
    }

    if (isValidMove(fromRow, fromCol, row, col)) {
      const targetHasMonster = cell.classList.contains("monster");

      if (!targetHasMonster) {
        const monsterType = selectedCell.textContent;
        // Simple move: destination is empty
        cell.textContent = monsterType;
        cell.classList.add("monster", myPlayer);

        selectedCell.textContent = "";
        selectedCell.classList.remove("monster", "selected", "player1", "player2");
        // Emit movement event
        socket.emit("monsterAction", {
          gameId,
          from: { row: fromRow, col: fromCol},
          to: { row, col },
          type: monsterType,
          owner: myPlayer   
        });
        
        selectedCell = null;
      } else {
        // Combat logic
        const attacker = selectedCell.textContent;
        const defender = cell.textContent;

          socket.emit("combatRequest", {
            gameId,
            from: { row: fromRow, col: fromCol },
            to: { row, col },
            attacker,
            defender,
            attackerOwner: myPlayer,
            defenderOwner: cell.classList.contains("player1") ? "player1" : "player2"
          });

          //clear selection after requesting combat
          selectedCell.classList.remove("selected");
          selectedCell = null;
        }
    } else {
      alert("Invalid move! Monster can move straight or up to 2 diagonal steps.");
    }
  }        
}

// Determine if a cell is on the border
function isBorderCell(row, col) {
  return row === 0 || row === 9 || col === 0 || col === 9;
}

// Check if the move is valid based on movement rules
function isValidMove(fromRow, fromCol, toRow, toCol) {
  const rowDiff = Math.abs(toRow - fromRow);
  const colDiff = Math.abs(toCol - fromCol);

  // Same row or same column → allowed (any distance)
  if (rowDiff === 0 || colDiff === 0) return true;

  // Diagonal move: max 2 cells
  if (rowDiff === colDiff && rowDiff <= 2) return true;

  return false;
}

function switchPlayer() {
  currentPlayer = currentPlayer === "player1" ? "player2" : "player1";
  document.getElementById("current-player").textContent = currentPlayer === "player1" ? "Player 1" : "Player 2";
}

function checkForElimination() {
  if (player1Kills >= 10 && !player2Eliminated) {
    player2Eliminated = true;
    alert("Player 2 has been eliminated");
  }

  if (player2Kills >= 10 && !player1Eliminated) {
    player1Eliminated = true;
    alert("Player 1 has been eliminated");
  }

  // Check for winner
  if (player1Eliminated && !player2Eliminated) {
    alert("Player 2 wins!🥳");

    if (!winnerDeclared){
      winnerDeclared = true;
      socket.emit("declareWinner", {
        gameId,
        winner: "player2"
      });
    }
  }

  if (player2Eliminated && !player1Eliminated) {
    alert("Player 1 wins!🥳");

    if (!winnerDeclared) {
      winnerDeclared = true;
      socket.emit("declareWinner", {
        gameId,
        winner: "player1"
      });
    }
  }
}

function resolveCombat(attacker, defender) {
  // Combat rules:
  // Vampire 🧛 vs Werewolf 🐺 → 🐺 dies
  // Werewolf 🐺 vs Ghost 👻 → 👻 dies
  // Ghost 👻 vs Vampire 🧛 → 🧛 dies
  // Same type → both die

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

socket.on("monsterAction", (data) => {
  const cells = document.querySelectorAll(".cell");
  const index = (row, col) => row * 10 + col;

  if (data.from) {
    const fromCell = cells[index(data.from.row, data.from.col)];
    fromCell.textContent = "";
    fromCell.classList.remove("monster", "player1", "player2");
  }

  const toCell = cells[index(data.to.row, data.to.col)];
  toCell.textContent = data.type;
  toCell.classList.remove("player1", "player2");
  toCell.classList.add("monster", data.owner);
});

socket.on("combatResult", (data) => {
  const cells = document.querySelectorAll(".cell");
  const index = (row, col) => row * 10 + col;

  const fromCell = cells[index(data.from.row, data.from.col)];
  const toCell = cells[index(data.to.row, data.to.col)];

  // clean the origin cell
  fromCell.textContent = "";
  fromCell.classList.remove("monster", "player1", "player2");

  if (data.outcome === "attacker") {
    toCell.textContent = data.type;
    toCell.classList.remove("player1", "player2");
    toCell.classList.add("monster", data.owner);

    if (data.owner === "player1") {
      player1Kills++;
      player1KillsDisplay.textContent = player1Kills;
    } else {
      player2Kills++;
      player2KillsDisplay.textContent = player2Kills;
    }

  } else if (data.outcome === "defender") {
    // Attacker was eliminated
    if (data.owner === "player1"){
      player2Kills++;
      player2KillsDisplay.textContent = player2Kills;
    } else {
      player1Kills++;
      player1KillsDisplay.textContent = player1Kills;
    }

  } else if (data.outcome === "both") {
    toCell.textContent = "";
    toCell.classList.remove("monster", "player1", "player2");

    if (data.attackerOwner === "player1") {
      player1Kills++;
      player1KillsDisplay.textContent = player1Kills;
    } else {
      player2Kills++;
      player2KillsDisplay.textContent = player2Kills;
    }
    if (data.defenderOwner === "player1") {
      player1Kills++;
      player1KillsDisplay.textContent = player1Kills;
    } else {
      player2Kills++;
      player2KillsDisplay.textContent = player2Kills;
    }
  }

  checkForElimination();
});

socket.on("currentTurnChanged", (newTurn) => {
  currentPlayer = newTurn;
  console.log("Turn changed to:", currentPlayer);
  document.getElementById("current-player").textContent =
  newTurn === "player1" ? "Player1" : "Player2";
});

socket.on("assignPlayer", (role) => {
  myPlayer = role;
  console.log("Assign role:" , myPlayer);
});

socket.on("gameStats", ({ totalGamesPlayed, wins, losses }) => {
  document.getElementById("games-played").textContent = totalGamesPlayed;
  document.getElementById("wins").textContent = wins;
  document.getElementById("losses").textContent = losses;
});

// End Turn button logic
document.getElementById("end-turn-btn").addEventListener("click", () => {
  socket.emit("endTurn", gameId);
});

document.getElementById("join-game").addEventListener("click", () => {
  const input = document.getElementById("game-id");
  gameId = input.value.trim();

  if (gameId) {
    // Assing player randomly for now
    socket.emit("joinGame", gameId);
    document.getElementById("game-id-input").style.display = "none"; // ocultar después de unirse
  } else {
    alert("Please enter a valid Game ID.");
  }
});

socket.on("gameOver", (data) => {
  //console.log("gameOver received");
  const messageDiv = document.getElementById("winner-message");
  messageDiv.textContent = `${data.winner.toUpperCase()} WINS!`;
  messageDiv.style.display = "block";

  // Disable all board clicks
  const allCells = document.querySelectorAll(".cell");
  allCells.forEach(cell => cell.style.pointerEvents = "none");

  // Show restart button
  document.getElementById("restart-btn").style.display = "inline-block";
});

document.getElementById("restart-btn").addEventListener("click", () =>{
  window.location.reload();
});