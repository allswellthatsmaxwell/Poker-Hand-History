import React from 'react';
import { Player, Action } from '../types';
import Card from './Card';

const POSITION_LABELS_6MAX: Record<number, string> = {
  0: 'SB',
  1: 'BB',
  2: 'UTG',
  3: 'MP',
  4: 'CO',
  5: 'BTN',
};

interface PlayerSeatProps {
  player: Player;
  lastAction?: Action;
  isActive?: boolean;
  showCards?: boolean;
}

export default function PlayerSeat({ player, lastAction, isActive, showCards = true }: PlayerSeatProps) {
  const isFolded = lastAction?.action === 'fold';
  const posLabel = POSITION_LABELS_6MAX[player.index] ?? '';
  const revealCards = showCards && player.holeCards;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4px',
      opacity: isFolded ? 0.4 : 1,
      transition: 'opacity 0.3s',
    }}>
      {/* Hole cards */}
      <div style={{ display: 'flex', gap: '3px' }}>
        {revealCards ? (
          <>
            <Card card={player.holeCards![0]} width={48} />
            <Card card={player.holeCards![1]} width={48} />
          </>
        ) : (
          <>
            <Card faceDown width={48} />
            <Card faceDown width={48} />
          </>
        )}
      </div>

      {/* Player info chip */}
      <div style={{
        background: isActive ? '#f9a825' : '#333',
        color: isActive ? '#000' : '#fff',
        borderRadius: '8px',
        padding: '4px 10px',
        fontSize: '12px',
        fontFamily: "'Segoe UI', Arial, sans-serif",
        textAlign: 'center',
        minWidth: '80px',
        border: isActive ? '2px solid #fff' : '1px solid #555',
      }}>
        <div style={{ fontWeight: 'bold' }}>
          <span style={{ color: isActive ? '#333' : '#aaa', marginRight: '4px', fontSize: '10px' }}>
            {posLabel}
          </span>
          {player.name}
        </div>
        <div style={{ fontSize: '11px', color: isActive ? '#333' : '#ccc' }}>
          {player.startingStack.toLocaleString()}
        </div>
      </div>

      {/* Action badge */}
      {lastAction && (
        <div style={{
          background: actionColor(lastAction.action),
          color: '#fff',
          borderRadius: '4px',
          padding: '2px 8px',
          fontSize: '11px',
          fontFamily: "'Segoe UI', Arial, sans-serif",
          fontWeight: 'bold',
          textTransform: 'uppercase',
        }}>
          {lastAction.action}
          {lastAction.amount != null && ` $${lastAction.amount}`}
        </div>
      )}
    </div>
  );
}

function actionColor(action: string): string {
  switch (action) {
    case 'fold':  return '#666';
    case 'check': return '#4caf50';
    case 'call':  return '#2196f3';
    case 'bet':   return '#ff9800';
    case 'raise': return '#f44336';
    default:      return '#888';
  }
}
