import React, { useState, useEffect, useMemo } from 'react';
import './App.css';
import PokerTable from './components/PokerTable';
import { HandHistory } from './types';
import { buildSteps } from './replay';
import { sampleHand } from './data/sampleHand';

function App() {
  const [hand, setHand] = useState<HandHistory>(sampleHand);
  const [stepIndex, setStepIndex] = useState(0);

  // Fetch hand from API, fall back to sampleHand
  useEffect(() => {
    fetch('http://localhost:5000/api/hands/test')
      .then(res => res.json())
      .then((data: HandHistory) => {
        setHand(data);
        setStepIndex(0);
      })
      .catch(() => {
        // API unavailable, keep sampleHand
      });
  }, []);

  const steps = useMemo(() => buildSteps(hand), [hand]);

  // Arrow key navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setStepIndex(prev => Math.min(prev + 1, steps.length - 1));
      } else if (e.key === 'ArrowLeft') {
        setStepIndex(prev => Math.max(prev - 1, 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [steps.length]);

  const currentStep = steps[stepIndex];

  return (
    <div className="App">
      <PokerTable hand={hand} state={currentStep} />
      <div style={{
        textAlign: 'center',
        marginTop: '16px',
        fontFamily: "'Segoe UI', Arial, sans-serif",
        color: '#ccc',
      }}>
        <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>
          {currentStep.description}
        </div>
        <div style={{ fontSize: '13px', color: '#888' }}>
          {stepIndex} / {steps.length - 1}
          <span style={{ marginLeft: '12px', fontSize: '11px', color: '#666' }}>
            Use arrow keys to navigate
          </span>
        </div>
      </div>
    </div>
  );
}

export default App;
