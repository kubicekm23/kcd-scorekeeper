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
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Game', gameSchema);
