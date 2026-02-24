import { useState, useEffect } from 'react';
import './App.css';
import { useAuth, AuthProvider } from './AuthContext';
import AuthPage from './AuthPage';

const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3001/api' 
  : '/api';

function AppContent() {
  const { user, token, logout, loading } = useAuth();
  const [gameStarted, setGameStarted] = useState(false);
  const [players, setPlayers] = useState([]);
  const [winningScore, setWinningScore] = useState(100);
  const [numPlayersInput, setNumPlayersInput] = useState(2);
  const [winningScoreInput, setWinningScoreInput] = useState(100);
  const [winner, setWinner] = useState(null);
  const [playerScoresInput, setPlayerScoresInput] = useState({});
  const [showHistory, setShowHistory] = useState(false); // New state for history view
  const [gameHistory, setGameHistory] = useState([]); // State to store game history
  const [currentScoreHistory, setCurrentScoreHistory] = useState([]); // New state for current game's score history

  // Function to fetch game history
  const fetchGameHistory = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE_URL}/game/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setGameHistory(data);
      } else {
        console.error('Failed to fetch game history');
      }
    } catch (error) {
      console.error('Error fetching game history:', error);
    }
  };

  useEffect(() => {
    if (token) {
      fetch(`${API_BASE_URL}/game/state`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.gameStarted) {
            setGameStarted(true);
            setPlayers(data.players);
            setWinningScore(data.winningScore);
            setCurrentScoreHistory(data.scoreHistory || []);
            
            const initialScoresInput = {};
            data.players.forEach(player => {
              initialScoresInput[player.id] = 0;
            });
            setPlayerScoresInput(initialScoresInput);
          }
        })
        .catch((error) => console.error('Error fetching game state:', error));
    }
  }, [token]);

  useEffect(() => {
    if (token && showHistory) {
      fetchGameHistory();
    }
  }, [token, showHistory]);

  const handleStartGame = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/game/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
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
        setShowHistory(false); // Hide history when starting a new game
        setCurrentScoreHistory([]); // Reset score history for new game
        
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
      [playerId]: parseInt(value, 10) || 0,
    }));
  };

  const handleUpdateScores = async () => {
    try {
      let updatedPlayers = [...players];
      let currentWinner = null;
      let newScoreHistory = [...currentScoreHistory];

      for (const player of players) {
        const scoreChange = playerScoresInput[player.id];
        if (scoreChange !== 0) {
          const response = await fetch(`${API_BASE_URL}/game/score`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              playerId: player.id,
              scoreChange: scoreChange,
            }),
          });
          const data = await response.json();
          if (response.ok) {
            updatedPlayers = data.gameState.players;
            // Assuming the backend sends back the updated scoreHistory
            // For now, we'll manually add to the frontend state for immediate display
            // A more robust solution would refetch game state or receive full game object
            newScoreHistory.push({
              playerId: player.id,
              playerName: player.name, // Assuming player.name is available
              scoreChange: scoreChange,
              timestamp: new Date().toISOString(),
            });
            setCurrentScoreHistory(newScoreHistory);

            if (data.winner) {
              currentWinner = data.winner;
              setWinner(data.winner);
              setGameStarted(false);
              fetchGameHistory(); // Refresh history when a game finishes
            }
          } else {
            alert(data.message);
            break;
          }
        }
      }
      setPlayers(updatedPlayers);
      
      const resetScoresInput = {};
      updatedPlayers.forEach(player => {
        resetScoresInput[player.id] = 0;
      });
      setPlayerScoresInput(resetScoresInput);

    } catch (error) {
      console.error('Error updating scores:', error);
      alert('Failed to update scores.');
    }
  };

  if (loading) return <div>Loading...</div>;

  if (!user) {
    return (
      <div className="full-center">
        <AuthPage />
      </div>
    );
  }

  return (
    <div className="App">
      <header>
        <span>Logged in as {user.username}</span>
        <div>
          <button onClick={() => setShowHistory(!showHistory)}>
            {showHistory ? 'Back to Current Game' : 'View Game History'}
          </button>
          <button onClick={logout}>Logout</button>
        </div>
      </header>

      <h1>KCD Scorekeeper</h1>

      {showHistory ? (
        <div className="game-history">
          <h2>Game History</h2>
          {gameHistory.length === 0 ? (
            <p>No games played yet.</p>
          ) : (
            gameHistory.map(game => (
              <div key={game._id} className="history-game-item">
                <h3>Game on {new Date(game.createdAt).toLocaleString()}</h3>
                <p>Winning Score: {game.winningScore}</p>
                <ul>
                  {game.players.map(player => (
                    <li key={player._id}>{player.name}: {player.score}</li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      ) : (
        <>
          {winner && (
            <div className="winner-message">
              <h2>Congratulations, {winner}! You won!</h2>
              <button onClick={() => {
                setGameStarted(false);
                setWinner(null);
                setPlayers([]);
                setShowHistory(false); // Ensure history is hidden when starting new game from winner screen
                setCurrentScoreHistory([]);
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

              {currentScoreHistory.length > 0 && (
                <div className="score-history-display">
                  <h4>Score Changes:</h4>
                  <ul>
                    {currentScoreHistory.map((entry, index) => (
                      <li key={index}>
                        {new Date(entry.timestamp).toLocaleTimeString()}: {entry.playerName} scored {entry.scoreChange > 0 ? '+' : ''}{entry.scoreChange}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
