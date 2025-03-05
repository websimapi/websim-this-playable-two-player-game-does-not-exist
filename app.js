import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import room from './websocket.js';

// GameCreator component for generating new games
function GameCreator() {
  const [keywords, setKeywords] = useState('');
  const [gameName, setGameName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const generateGame = async (e) => {
    e.preventDefault();
    if (!keywords.trim() || !gameName.trim()) {
      setError('Please fill out all fields');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // First LLM call - Generate game description based on keywords and name
      const gameDescription = await generateGameDescription(gameName, keywords);
      
      // Second LLM call - Generate game image based on game description
      const imageUrl = await generateGameImage(gameDescription);
      
      // Store in database
      await room.collection('games').create({
        name: gameName,
        keywords: keywords,
        description: gameDescription,
        imageUrl: imageUrl,
      });
      
      // Clear form inputs
      setKeywords('');
      setGameName('');
    } catch (err) {
      console.error('Error generating game:', err);
      setError('Failed to generate game. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate game description using LLM
  const generateGameDescription = async (name, keywords) => {
    try {
      const completion = await websim.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are a game concept generator. Create a detailed, creative description for a fictional two-player game with the following name and keywords. Make it sound like a real and playable game with unique mechanics, visual style, and gameplay. Include details about how two players would interact. Keep the description between 100-200 words.`
          },
          {
            role: "user",
            content: `Game Name: ${name}\nKeywords: ${keywords}\n\nGenerate a detailed description for this fictional game.`
          }
        ]
      });
      
      return completion.content;
    } catch (error) {
      console.error('Error generating game description:', error);
      throw new Error('Failed to generate game description');
    }
  };

  // Generate game image using LLM
  const generateGameImage = async (description) => {
    try {
      const result = await websim.imageGen({
        prompt: `A professional game screenshot for a video game called: ${description}. Show gameplay elements with two players. Vibrant colors, detailed art style.`,
        aspect_ratio: "16:9"
      });
      
      return result.url;
    } catch (error) {
      console.error('Error generating game image:', error);
      throw new Error('Failed to generate game image');
    }
  };

  return (
    <section className="creator-section">
      <h2>Create a New Game Concept</h2>
      <form className="creator-form" onSubmit={generateGame}>
        <div className="form-group">
          <label htmlFor="gameName">Game Name:</label>
          <input
            type="text"
            id="gameName"
            value={gameName}
            onChange={(e) => setGameName(e.target.value)}
            placeholder="Enter game name"
            maxLength={50}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="keywords">Keywords (separate with commas):</label>
          <textarea
            id="keywords"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="Ex: strategy, fantasy, pixel art, turn-based, roguelike"
            maxLength={200}
            required
          ></textarea>
        </div>
        {error && <p className="error">{error}</p>}
        <button 
          type="submit" 
          className="generator-button" 
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="loading-indicator">
              <div className="spinner"></div>
              <span>Generating...</span>
            </div>
          ) : (
            'Generate Game'
          )}
        </button>
      </form>
    </section>
  );
}

// GameCard component for displaying games in the gallery
function GameCard({ game, onClick }) {
  const formattedDate = new Date(game.created_at).toLocaleDateString();
  
  return (
    <div className="game-card">
      <img 
        src={game.imageUrl} 
        alt={game.name} 
        className="game-image"
        onClick={() => onClick(game)}
      />
      <div className="game-details">
        <h3 className="game-title">{game.name}</h3>
        <p className="game-description">{game.description.substring(0, 120)}...</p>
        <div className="game-creator">
          <img 
            src={`https://images.websim.ai/avatar/${game.username}`} 
            alt={game.username} 
            className="creator-avatar" 
          />
          <span className="creator-name">{game.username}</span>
          <span className="creator-date">{formattedDate}</span>
        </div>
      </div>
      <button className="play-button" onClick={() => onClick(game)}>
        View Game
      </button>
    </div>
  );
}

// GameDetail modal for viewing full game details
function GameDetail({ game, onClose }) {
  if (!game) return null;
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="close-modal" onClick={onClose}>×</button>
        <div className="game-detail-container">
          <img 
            src={game.imageUrl} 
            alt={game.name} 
            className="game-detail-image" 
          />
          <div className="game-detail-info">
            <h2>{game.name}</h2>
            <p className="game-detail-description">{game.description}</p>
            <div className="game-creator">
              <img 
                src={`https://images.websim.ai/avatar/${game.username}`} 
                alt={game.username} 
                className="creator-avatar" 
              />
              <span className="creator-name">Created by {game.username}</span>
              <span className="creator-date">
                {new Date(game.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main App component
function App() {
  const [selectedGame, setSelectedGame] = useState(null);
  const [creatorUsername, setCreatorUsername] = useState('');
  
  useEffect(() => {
    const fetchCreator = async () => {
      try {
        const creator = await window.websim.getCreatedBy();
        setCreatorUsername(creator.username);
      } catch (error) {
        console.error('Error fetching creator:', error);
      }
    };
    
    fetchCreator();
  }, []);
  
  // Get all games from the database
  const games = React.useSyncExternalStore(
    room.collection('games').subscribe,
    room.collection('games').getList
  );
  
  return (
    <>
      <header className="header">
        <h1>This Playable Two Player Game Does Not Exist</h1>
        <p>Generate fictional game concepts with AI and share them with others</p>
      </header>
      
      <GameCreator />
      
      <h2>Game Gallery</h2>
      {games.length === 0 ? (
        <div className="empty-gallery">
          <p>No games have been created yet. Be the first to create one!</p>
        </div>
      ) : (
        <div className="gallery">
          {[...games].reverse().map(game => (
            <GameCard 
              key={game.id} 
              game={game} 
              onClick={setSelectedGame} 
            />
          ))}
        </div>
      )}
      
      {selectedGame && (
        <GameDetail 
          game={selectedGame} 
          onClose={() => setSelectedGame(null)} 
        />
      )}
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

