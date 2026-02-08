import React from 'react';
import { HandHistory, TableState } from '../types';
import PlayerSeat from './PlayerSeat';
import Board from './Board';

interface PokerTableProps {
  hand: HandHistory;
  state: TableState;
}

/**
 * Seat positions as [left%, top%] for 6-max layout.
 * Arranged around an ellipse:
 *
 *          [2]     [3]
 *   [1]                  [4]
 *          [0]     [5]
 */
const SEAT_POSITIONS: [number, number][] = [
  [25, 82],  // 0: SB  - bottom left
  [5, 45],   // 1: BB  - left
  [25, 8],   // 2: UTG - top left
  [68, 8],   // 3: MP  - top right
  [88, 45],  // 4: CO  - right
  [68, 82],  // 5: BTN - bottom right
];

export default function PokerTable({ hand, state }: PokerTableProps) {
  return (
    <div style={{
      position: 'relative',
      width: '900px',
      height: '560px',
      margin: '0 auto',
    }}>
      {/* Table felt */}
      <svg
        viewBox="0 0 900 560"
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      >
        {/* Outer rim */}
        <ellipse cx="450" cy="280" rx="420" ry="240"
          fill="#2d1f0e" />
        {/* Rail */}
        <ellipse cx="450" cy="280" rx="405" ry="225"
          fill="#3a2a14" />
        {/* Felt */}
        <ellipse cx="450" cy="280" rx="380" ry="210"
          fill="#1a6b3c" />
        {/* Felt inner highlight */}
        <ellipse cx="450" cy="270" rx="340" ry="180"
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      </svg>

      {/* Board cards (centered) */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
      }}>
        <Board cards={state.boardCards} />
        {state.pot > 0 && (
          <div style={{
            color: '#ffd54f',
            fontSize: '16px',
            fontWeight: 'bold',
            fontFamily: "'Segoe UI', Arial, sans-serif",
          }}>
            Pot: {state.pot.toLocaleString()}
          </div>
        )}
      </div>

      {/* Player seats */}
      {hand.players.map((player, i) => (
        <div
          key={player.index}
          style={{
            position: 'absolute',
            left: `${SEAT_POSITIONS[i][0]}%`,
            top: `${SEAT_POSITIONS[i][1]}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <PlayerSeat
            player={player}
            lastAction={state.lastActions.get(player.index)}
            isActive={state.activePlayer === player.index}
            showCards={state.cardsDealt}
          />
        </div>
      ))}
    </div>
  );
}
