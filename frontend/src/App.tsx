import React from 'react';
import './App.css';
import PokerTable from './components/PokerTable';
import { sampleHand } from './data/sampleHand';

function App() {
  return (
    <div className="App">
      <PokerTable hand={sampleHand} street="river" />
    </div>
  );
}

export default App;
