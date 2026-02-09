import React, { useState, useEffect, useMemo, useRef } from 'react';
import './App.css';
import PokerTable from './components/PokerTable';
import { HandHistory } from './types';
import { buildSteps } from './replay';
import { sampleHand } from './data/sampleHand';

function App() {
  const [hand, setHand] = useState<HandHistory>(sampleHand);
  const [stepIndex, setStepIndex] = useState(0);
  const [handIds, setHandIds] = useState<string[]>([]);
  const [handIndex, setHandIndex] = useState(0);

  // Fetch list of hand IDs on mount
  useEffect(() => {
    fetch('http://localhost:5001/api/hands')
      .then(res => res.json())
      .then((ids: string[]) => {
        setHandIds(ids);
        if (ids.length > 0) {
          setHandIndex(0);
        }
      })
      .catch(() => {
        // API unavailable, keep sampleHand
      });
  }, []);

  // Fetch the current hand when handIndex or handIds change
  useEffect(() => {
    if (handIds.length === 0) return;
    const id = handIds[handIndex];
    fetch(`http://localhost:5001/api/hands/${id}`)
      .then(res => res.json())
      .then((data: HandHistory) => {
        setHand(data);
        setStepIndex(0);
      })
      .catch(() => {});
  }, [handIds, handIndex]);

  const steps = useMemo(() => buildSteps(hand), [hand]);

  // Arrow key navigation + [ ] for hand cycling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault();
        setStepIndex(prev => Math.min(prev + 1, steps.length - 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault();
        setStepIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === ']') {
        e.preventDefault();
        setHandIndex(prev => Math.min(prev + 1, handIds.length - 1));
      } else if (e.key === '[') {
        e.preventDefault();
        setHandIndex(prev => Math.max(prev - 1, 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [steps.length, handIds.length]);

  const currentStep = steps[stepIndex];

  const prevStepRef = useRef(0);
  const forward = stepIndex >= prevStepRef.current;
  useEffect(() => {
    prevStepRef.current = stepIndex;
  });

  const logEntries = steps.slice(0, stepIndex + 1);

  const currentHandId = handIds.length > 0 ? handIds[handIndex] : null;

  return (
    <div className="App" style={{ position: 'relative' }}>
      <PokerTable hand={hand} state={currentStep} forward={forward} />
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
        {currentHandId && (
          <div style={{ color: '#555', marginBottom: '4px', fontSize: '10px' }}>
            Hand #{currentHandId} ({handIndex + 1}/{handIds.length})
          </div>
        )}
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
