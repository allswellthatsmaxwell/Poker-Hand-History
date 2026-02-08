import React from 'react';
import logo from './logo.svg';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;
// frontend/src/App.tsx
import { useEffect, useState } from 'react';

interface HandData {
  players: Player[];
  board: string[];
  flop_cards: string[];
  // ... etc
}

function App() {
  const [hand, setHand] = useState<HandData | null>(null);

  useEffect(() => {
    fetch('http://localhost:5000/api/hands/hand_001')
      .then(res => res.json())
      .then(data => setHand(data));
  }, []);

  if (!hand) return <div>Loading...</div>;

  return (
    <div>
      <PokerTable hand={hand} />
    </div>
  );
}
