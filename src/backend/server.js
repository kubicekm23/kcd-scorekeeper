const express = require('express');
const cors = require('cors');
const app = express();
const port = 3001; // Using a different port for backend

app.use(cors());
app.use(express.json()); // For parsing application/json

let gameState = {
  players: [],
  winningScore: 100, // Default winning score
  gameStarted: false,
};

// API to start a new game
app.post('/api/game/start', (req, res) => {
  const { numPlayers, winningScore } = req.body;

  if (!numPlayers || numPlayers <= 0) {
    return res.status(400).json({ message: 'Number of players must be greater than 0.' });
  }

  gameState.players = Array.from({ length: numPlayers }, (_, i) => ({
    id: i + 1,
    name: `Player ${i + 1}`,
    score: 0,
  }));
  gameState.winningScore = winningScore || 100;
  gameState.gameStarted = true;

  res.json({ message: 'Game started successfully!', gameState });
});

// API to update a player's score
app.post('/api/game/score', (req, res) => {
  const { playerId, scoreChange } = req.body;

  if (!gameState.gameStarted) {
    return res.status(400).json({ message: 'No game in progress.' });
  }

  const player = gameState.players.find((p) => p.id === playerId);

  if (player) {
    player.score += scoreChange;
    // Check for winner
    if (player.score >= gameState.winningScore) {
        return res.json({ message: `${player.name} wins!`, gameState, winner: player.name });
    }
    res.json({ message: 'Score updated successfully!', gameState });
  } else {
    res.status(404).json({ message: 'Player not found.' });
  }
});

// API to get current game state
app.get('/api/game/state', (req, res) => {
  res.json(gameState);
});

app.get('/', (req, res) => {
  res.send('KCD Scorekeeper Backend is running!');
});

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});