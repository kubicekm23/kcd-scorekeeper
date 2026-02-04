import { useState, useEffect } from 'react';
import './App.css';

const API_BASE_URL = 'http://localhost:3001/api';

function App() {
  const [gameStarted, setGameStarted] = useState(false);
  const [players, setPlayers] = useState([]);
  const [winningScore, setWinningScore] = useState(100);
  const [numPlayersInput, setNumPlayersInput] = useState(2); // Default 2 players
  const [winningScoreInput, setWinningScoreInput] = useState(100); // Default winning score
  const [winner, setWinner] = useState(null);
  const [playerScoresInput, setPlayerScoresInput] = useState({}); // To hold input for current round scores

  // Fetch initial game state or update if game is in progress
  useEffect(() => {
    fetch(`${API_BASE_URL}/game/state`)
      .then((res) => res.json())
      .then((data) => {
        if (data.gameStarted) {
          setGameStarted(true);
          setPlayers(data.players);
          setWinningScore(data.winningScore);
        }
      })
      .catch((error) => console.error('Error fetching game state:', error));
  }, []);

  const handleStartGame = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/game/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          numPlayers: numPlayersInput,
          winningScore: winningScoreInput,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setGameStarted(true);
        setPlayers(data.gameState.players);
        setWinningScore(data.gameState.winningScore);
        setWinner(null);
        // Initialize playerScoresInput for the new game
        const initialScoresInput = {};
        data.gameState.players.forEach(player => {
          initialScoresInput[player.id] = 0;
        });
        setPlayerScoresInput(initialScoresInput);
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Error starting game:', error);
      alert('Failed to start game.');
    }
  };

  const handleScoreChange = (playerId, value) => {
    setPlayerScoresInput(prev => ({
      ...prev,
      [playerId]: parseInt(value, 10) || 0, // Ensure it's a number
    }));
  };

  const handleUpdateScores = async () => {
    try {
        // Iterate through all players and update their scores
        for (const player of players) {
            const scoreChange = playerScoresInput[player.id];
            if (scoreChange !== 0) { // Only send update if score changed
                const response = await fetch(`${API_BASE_URL}/game/score`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        playerId: player.id,
                        scoreChange: scoreChange,
                    }),
                });
                const data = await response.json();
                if (response.ok) {
                    setPlayers(data.gameState.players);
                    if (data.winner) {
                        setWinner(data.winner);
                        setGameStarted(false); // Game ends when there's a winner
                    }
                } else {
                    alert(data.message);
                    break; // Stop updating if an error occurs
                }
            }
        }
        // Reset player scores input for the next round
        const resetScoresInput = {};
        players.forEach(player => {
            resetScoresInput[player.id] = 0;
        });
        setPlayerScoresInput(resetScoresInput);

    } catch (error) {
        console.error('Error updating scores:', error);
        alert('Failed to update scores.');
    }
  };

  return (
    <div className="App">
      <h1>KCD Scorekeeper</h1>

      {winner && (
        <div className="winner-message">
          <h2>Congratulations, {winner}! You won!</h2>
          <button onClick={() => {
            setGameStarted(false);
            setWinner(null);
            setPlayers([]);
          }}>Start New Game</button>
        </div>
      )}

      {!gameStarted && !winner && (
        <div className="game-setup">
          <h2>Setup New Game</h2>
          <div>
            <label>
              Number of Players:
              <input
                type="number"
                min="1"
                value={numPlayersInput}
                onChange={(e) => setNumPlayersInput(parseInt(e.target.value, 10) || 1)}
              />
            </label>
          </div>
          <div>
            <label>
              Winning Score:
              <input
                type="number"
                min="1"
                value={winningScoreInput}
                onChange={(e) => setWinningScoreInput(parseInt(e.target.value, 10) || 100)}
              />
            </label>
          </div>
          <button onClick={handleStartGame}>Start Game</button>
        </div>
      )}

      {gameStarted && !winner && (
        <div className="scoreboard">
          <h2>Current Game</h2>
          <h3>Winning Score: {winningScore}</h3>
          {players.map((player) => (
            <div key={player.id} className="player-row">
              <span className="player-name">{player.name}:</span>
              <span className="player-score">{player.score}</span>
              <input
                type="number"
                value={playerScoresInput[player.id] || 0}
                onChange={(e) => handleScoreChange(player.id, e.target.value)}
                placeholder="Round Score"
              />
            </div>
          ))}
          <button onClick={handleUpdateScores}>End Round & Update Scores</button>
        </div>
      )}
    </div>
  );
}

export default App;