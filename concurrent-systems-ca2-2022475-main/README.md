# Monster Mayhem

Monster Mayhem is a multiplayer web-based board game developed as part of the Concurrent Systems module for the BSc in Computing at CCT College Dublin.

## Game Summary

Two players join a match using a custom Game ID and take turns placing and moving monsters on a 10x10 board. Players must strategically eliminate their opponent's monsters using defined combat rules. The game ends when one player eliminates 10 enemy monsters, declaring them the winner.

### Combat Rules

- 🧛 Vampire defeats 🐺 Werewolf
- 🐺 Werewolf defeats 👻 Ghost
- 👻 Ghost defeats 🧛 Vampire
- Same type → both are eliminated


## Key Features

-**Synchronized 2-player turn system** using `"End Turn"` button
-**Each player is assigned a role** (`player1` or `player2`) by the server
-**Only the current player can act** on their turn
-**Color-coded cells** based on player ownership
-**Combat resolved centrally on the server** to ensure fairness
-**Real-time updates** for all actions using **Socket.io**
-**Game rooms (by Game ID)** allow multiple concurrent matches
- **Player stats**:
  - Kill counters per player
  -**Win/loss tracker** displayed after each match
  -**Total games played** counter shown on screen
- Movement:
  - Unlimited in straight lines
  - Max 2 cells diagonally
-  Invalid moves and actions blocked with alerts
-**Restart Game Button** appears after match ends
-**Active game monitoring endpoint**:
    - /games for HTML view
    - /games-json for raw JSON of active sessions



## Folder Structure

monster-mayhem/
|-- client/
│ |-- index.html
│ |-- style.css
│ |--script.js
|-- server/
│ |-- index.js
|-- README.md
|-- .gitignore


## Technologies Used

- HTML, CSS, JavaScript
- Node.js (Express)
- Socket.io (real-time multiplayer)
- Git & GitHub

##  How to Play Locally

1. Clone the repository  
2. Install dependencies in the `server/` folder:
     cd server
     npm install
     node index.js     
3. Open 2 browser windows at: 
     http://localhost:3000
4. Enter the same Game ID in both windows to join the same match
5. Take turns placing monsters on the edge and use End Turn to switch
6. Move monsters and engage in battles
7. When a player gets 10 kills, the game ends and both see the result
8. Use Start New Game to replay using the same Game ID

## GitHub 
https://github.com/CCT-Dublin/concurrent-systems-ca2-2022475.git


Author
Ana Clara R. Quilapan - 2022475
2025 | CCT College Dublin
