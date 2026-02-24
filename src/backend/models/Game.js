const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  score: { type: Number, default: 0 },
});

const gameSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  winningScore: { type: Number, default: 100 },
  status: { type: String, enum: ['active', 'finished'], default: 'active' },
  players: [playerSchema],
  scoreHistory: [{
    playerId: { type: mongoose.Schema.Types.ObjectId, required: true },
    playerName: { type: String, required: true }, // Store player name at the time of scoring
    scoreChange: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now },
  }],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Game', gameSchema);
