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
  const [allHandIds, setAllHandIds] = useState<string[]>([]);
  const [filterExpression, setFilterExpression] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [filterError, setFilterError] = useState('');

  // Fetch list of hand IDs on mount
  useEffect(() => {
    fetch('http://localhost:5001/api/hands')
      .then(res => res.json())
      .then((ids: string[]) => {
        setAllHandIds(ids);
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
      if (e.target instanceof HTMLInputElement) return;
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

  const applyFilter = () => {
    const expr = filterExpression.trim();
    if (!expr) {
      clearFilter();
      return;
    }
    setFilterError('');
    fetch('http://localhost:5001/api/hands/filter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expression: expr }),
    })
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          setFilterError(data.error || 'Filter error');
        } else {
          setHandIds(data.hand_ids);
          setHandIndex(0);
          setActiveFilter(expr);
          setFilterError('');
        }
      })
      .catch(() => setFilterError('Network error'));
  };

  const clearFilter = () => {
    setFilterExpression('');
    setActiveFilter('');
    setFilterError('');
    setHandIds(allHandIds);
    setHandIndex(0);
  };

  return (
    <div className="App" style={{ position: 'relative' }}>
      {/* Filter bar */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 16px',
        background: 'rgba(0,0,0,0.85)',
        borderBottom: '1px solid #333',
        fontFamily: 'monospace',
        fontSize: '13px',
      }}>
        <span style={{ color: '#888' }}>Filter:</span>
        <input
          type="text"
          value={filterExpression}
          onChange={e => setFilterExpression(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') applyFilter(); }}
          placeholder="pluribus.net > 500"
          style={{
            flex: 1,
            background: '#1a1a1a',
            border: '1px solid #444',
            borderRadius: '3px',
            color: '#ddd',
            padding: '4px 8px',
            fontFamily: 'monospace',
            fontSize: '13px',
            outline: 'none',
          }}
        />
        <button onClick={applyFilter} style={{
          background: '#2a5a2a',
          border: '1px solid #4a8a4a',
          borderRadius: '3px',
          color: '#ccc',
          padding: '4px 12px',
          cursor: 'pointer',
          fontFamily: 'monospace',
          fontSize: '12px',
        }}>Apply</button>
        <button onClick={clearFilter} style={{
          background: '#3a3a3a',
          border: '1px solid #555',
          borderRadius: '3px',
          color: '#999',
          padding: '4px 12px',
          cursor: 'pointer',
          fontFamily: 'monospace',
          fontSize: '12px',
        }}>Clear</button>
        <span style={{ color: activeFilter ? '#7a7' : '#666', whiteSpace: 'nowrap' }}>
          {handIds.length}{allHandIds.length > 0 ? ` / ${allHandIds.length}` : ''} hands
        </span>
        {filterError && (
          <span style={{ color: '#e55', whiteSpace: 'nowrap', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {filterError}
          </span>
        )}
      </div>
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
