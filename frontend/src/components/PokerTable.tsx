import React from 'react';
import { HandHistory, Action, Street } from '../types';
import PlayerSeat from './PlayerSeat';
import Board from './Board';

interface PokerTableProps {
  hand: HandHistory;
  /** Which street to display (shows board cards and actions up to this street) */
  street?: Street;
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

const STREET_ORDER: Street[] = ['preflop', 'flop', 'turn', 'river'];

export default function PokerTable({ hand, street = 'river' }: PokerTableProps) {
  // Determine which board cards to show based on current street
  const streetIndex = STREET_ORDER.indexOf(street);
  let visibleCards = [];
  if (streetIndex >= 1) visibleCards.push(...hand.flopCards);
  if (streetIndex >= 2) visibleCards.push(...hand.turnCards);
  if (streetIndex >= 3) visibleCards.push(...hand.riverCards);

  // Gather last action per player up to current street
  const lastActions = getLastActions(hand, street);

  // Calculate pot at current street
  const pot = calculatePot(hand, street);

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
        <Board cards={visibleCards} />
        {pot > 0 && (
          <div style={{
            color: '#ffd54f',
            fontSize: '16px',
            fontWeight: 'bold',
            fontFamily: "'Segoe UI', Arial, sans-serif",
//             textShadow: '0 1px 3px rgba(0,0,0,0.6)',
          }}>
            Pot: {pot.toLocaleString()}
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
            lastAction={lastActions.get(player.index)}
          />
        </div>
      ))}
    </div>
  );
}

/** Get each player's last action up to and including the given street */
function getLastActions(hand: HandHistory, upToStreet: Street): Map<number, Action> {
  const result = new Map<number, Action>();
  for (const st of STREET_ORDER) {
    const actions = hand.actions[st] ?? [];
    for (const action of actions) {
      result.set(action.player, action);
    }
    if (st === upToStreet) break;
  }
  return result;
}

/** Calculate total pot up to and including the given street */
function calculatePot(hand: HandHistory, upToStreet: Street): number {
  let pot = hand.blinds.reduce((a, b) => a + b, 0)
           + hand.antes.reduce((a, b) => a + b, 0);

  for (const st of STREET_ORDER) {
    const actions = hand.actions[st] ?? [];
    for (const action of actions) {
      if (action.amount != null && action.action !== 'fold') {
        pot += action.amount;
      }
    }
    if (st === upToStreet) break;
  }
  return pot;
}
