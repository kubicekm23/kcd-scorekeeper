require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database');
const authenticate = require('./middleware/auth');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Auth Routes
app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  try {
    const info = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(username, hashedPassword);
    res.status(201).json({ message: 'User registered successfully', userId: info.lastInsertRowid });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ message: 'Username already exists' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  if (user && bcrypt.compareSync(password, user.password)) {
    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET || 'super-secret-kcd-key', { expiresIn: '1d' });
    res.json({ token, user: { id: user.id, username: user.username } });
  } else {
    res.status(401).json({ message: 'Invalid username or password' });
  }
});

// Protected Game Routes
app.post('/api/game/start', authenticate, (req, res) => {
  const { numPlayers, winningScore, playerNames } = req.body;
  const userId = req.user.id;

  if (!numPlayers || numPlayers <= 0) {
    return res.status(400).json({ message: 'Number of players must be greater than 0.' });
  }

  // Deactivate any currently active games for this user
  db.prepare("UPDATE games SET status = 'finished' WHERE user_id = ? AND status = 'active'").run(userId);

  const info = db.prepare('INSERT INTO games (user_id, winning_score, status) VALUES (?, ?, ?)').run(userId, winningScore || 100, 'active');
  const gameId = info.lastInsertRowid;

  const insertPlayer = db.prepare('INSERT INTO players (game_id, name, score) VALUES (?, ?, ?)');
  const players = [];

  for (let i = 0; i < numPlayers; i++) {
    const name = (playerNames && playerNames[i]) || `Player ${i + 1}`;
    const pInfo = insertPlayer.run(gameId, name, 0);
    players.push({ id: pInfo.lastInsertRowid, name, score: 0 });
  }

  res.json({ message: 'Game started successfully!', gameState: { id: gameId, players, winningScore, gameStarted: true } });
});

app.post('/api/game/score', authenticate, (req, res) => {
  const { playerId, scoreChange } = req.body;
  const userId = req.user.id;

  // Verify game belongs to user
  const player = db.prepare(`
    SELECT p.*, g.winning_score, g.id as game_id 
    FROM players p 
    JOIN games g ON p.game_id = g.id 
    WHERE p.id = ? AND g.user_id = ? AND g.status = 'active'
  `).get(playerId, userId);

  if (!player) {
    return res.status(404).json({ message: 'Player or active game not found.' });
  }

  const newScore = player.score + scoreChange;
  db.prepare('UPDATE players SET score = ? WHERE id = ?').run(newScore, playerId);

  const gameState = {
    id: player.game_id,
    winningScore: player.winning_score,
    players: db.prepare('SELECT * FROM players WHERE game_id = ?').all(player.game_id),
    gameStarted: true
  };

  if (newScore >= player.winning_score) {
    db.prepare("UPDATE games SET status = 'finished' WHERE id = ?").run(player.game_id);
    return res.json({ message: `${player.name} wins!`, gameState, winner: player.name });
  }

  res.json({ message: 'Score updated successfully!', gameState });
});

app.get('/api/game/state', authenticate, (req, res) => {
  const userId = req.user.id;
  const activeGame = db.prepare("SELECT * FROM games WHERE user_id = ? AND status = 'active'").get(userId);

  if (activeGame) {
    const players = db.prepare('SELECT * FROM players WHERE game_id = ?').all(activeGame.id);
    res.json({
      gameStarted: true,
      id: activeGame.id,
      winningScore: activeGame.winning_score,
      players
    });
  } else {
    res.json({ gameStarted: false });
  }
});

// Serve frontend in production
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Fallback for SPA
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});
