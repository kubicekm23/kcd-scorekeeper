require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const connectDB = require('./database');
const authenticate = require('./middleware/auth');
const User = require('./models/User');
const Game = require('./models/Game');

const app = express();
const port = process.env.PORT || 3001;

// Connect to Database
connectDB();

app.use(cors());
app.use(express.json());

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const user = new User({ username, password: hashedPassword });
    await user.save();
    
    res.status(201).json({ message: 'User registered successfully', userId: user.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });

    if (user && bcrypt.compareSync(password, user.password)) {
      const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET || 'super-secret-kcd-key', { expiresIn: '1d' });
      res.json({ token, user: { id: user.id, username: user.username } });
    } else {
      res.status(401).json({ message: 'Invalid username or password' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Protected Game Routes
app.post('/api/game/start', authenticate, async (req, res) => {
  const { numPlayers, winningScore, playerNames } = req.body;
  const userId = req.user.id;

  if (!numPlayers || numPlayers <= 0) {
    return res.status(400).json({ message: 'Number of players must be greater than 0.' });
  }

  try {
    // Deactivate any currently active games for this user
    await Game.updateMany({ userId, status: 'active' }, { status: 'finished' });

    const players = [];
    for (let i = 0; i < numPlayers; i++) {
      const name = (playerNames && playerNames[i]) || `Player ${i + 1}`;
      players.push({ name, score: 0 });
    }

    const game = new Game({
      userId,
      winningScore: winningScore || 100,
      status: 'active',
      players
    });

    await game.save();

    res.json({ 
      message: 'Game started successfully!', 
      gameState: { 
        id: game.id, 
        players: game.players.map(p => ({ id: p.id, name: p.name, score: p.score })), 
        winningScore, 
        gameStarted: true 
      } 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/game/score', authenticate, async (req, res) => {
  const { playerId, scoreChange } = req.body;
  const userId = req.user.id;

  try {
    // Find the active game for this user that contains the player
    const game = await Game.findOne({ userId, status: 'active', 'players._id': playerId });

    if (!game) {
      return res.status(404).json({ message: 'Player or active game not found.' });
    }

    const player = game.players.id(playerId);
    player.score += scoreChange;

    const winner = player.score >= game.winningScore ? player.name : null;
    if (winner) {
      game.status = 'finished';
    }

    await game.save();

    const gameState = {
      id: game.id,
      winningScore: game.winningScore,
      players: game.players.map(p => ({ id: p.id, name: p.name, score: p.score })),
      gameStarted: game.status === 'active'
    };

    if (winner) {
      return res.json({ message: `${winner} wins!`, gameState, winner });
    }

    res.json({ message: 'Score updated successfully!', gameState });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/game/state', authenticate, async (req, res) => {
  const userId = req.user.id;
  try {
    const activeGame = await Game.findOne({ userId, status: 'active' });

    if (activeGame) {
      res.json({
        gameStarted: true,
        id: activeGame.id,
        winningScore: activeGame.winningScore,
        players: activeGame.players.map(p => ({ id: p.id, name: p.name, score: p.score }))
      });
    } else {
      res.json({ gameStarted: false });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Serve frontend in production
const frontendDistPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDistPath));

// Fallback for SPA
app.get('*', (req, res) => {
  // Only serve index.html if it's not an API route
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  } else {
    res.status(404).json({ message: 'API route not found' });
  }
});

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});
