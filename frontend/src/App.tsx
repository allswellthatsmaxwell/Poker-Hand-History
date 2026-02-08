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
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault();
        setStepIndex(prev => Math.min(prev + 1, steps.length - 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault();
        setStepIndex(prev => Math.max(prev - 1, 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [steps.length]);

  const currentStep = steps[stepIndex];

  const logEntries = steps.slice(0, stepIndex + 1);

  return (
    <div className="App" style={{ position: 'relative' }}>
      <PokerTable hand={hand} state={currentStep} />
      {/* Action log */}
      <div style={{
        position: 'fixed',
        right: '24px',
        bottom: '24px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        fontFamily: "'Ayuthaya', 'Papyrus', sans-serif",
        fontSize: '11px',
        color: '#aaa',
        gap: '1px',
        maxHeight: '80vh',
        overflow: 'hidden',
        alignItems: 'flex-end',
      }}>
        {[...logEntries].reverse().map((step, i) => {
          const originalIndex = stepIndex - i;
          return (
            <div key={originalIndex} style={{
              color: i === 0 ? '#fff' : '#777',
              whiteSpace: 'nowrap',
              textAlign: 'right',
            }}>
              {step.description}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default App;
