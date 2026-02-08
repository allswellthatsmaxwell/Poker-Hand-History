import React, { useRef } from 'react';
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

const DEALER_BUTTON = { left: '60%', top: '72%' };

// Chip positions: between each seat and the table center
const CHIP_POSITIONS: [number, number][] = [
  [37, 68],  // 0: SB
  [18, 47],  // 1: BB
  [37, 28],  // 2: UTG
  [59, 28],  // 3: MP
  [76, 47],  // 4: CO
  [59, 68],  // 5: BTN
];

const CENTER_POS: [number, number] = [50, 58];

const CHIP_COLORS = ['#e53935', '#1e88e5', '#43a047', '#8e24aa', '#f9a825'];
const CHIP_W = 20;
const CHIP_H = 5;
const CHIP_GAP = 3;
const MAX_PER_STACK = 6;
const TRANSITION = 'left 0.3s ease, top 0.3s ease, opacity 0.3s ease';

function SingleStack({ count }: { count: number }) {
  const totalH = count * CHIP_GAP + CHIP_H;
  return (
    <svg width={CHIP_W + 4} height={totalH + 4} viewBox={`0 0 ${CHIP_W + 4} ${totalH + 4}`}>
      {Array.from({ length: count }, (_, i) => {
        const y = totalH - (i * CHIP_GAP) - CHIP_H;
        return (
          <React.Fragment key={i}>
            <ellipse cx={CHIP_W / 2 + 2} cy={y + CHIP_H + 2} rx={CHIP_W / 2} ry={CHIP_H / 2}
              fill="rgba(0,0,0,0.3)" />
            <ellipse cx={CHIP_W / 2 + 2} cy={y + CHIP_H / 2 + 2} rx={CHIP_W / 2} ry={CHIP_H / 2}
              fill={CHIP_COLORS[i % CHIP_COLORS.length]}
              stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
          </React.Fragment>
        );
      })}
    </svg>
  );
}

function ChipLabel({ amount, highlight }: { amount: number; highlight?: boolean }) {
  return (
    <span style={{
      color: highlight ? '#ffd700' : '#fff',
      fontSize: '10px',
      fontFamily: "'Segoe UI', Arial, sans-serif",
      fontWeight: 'bold',
      textShadow: highlight
        ? '0 0 4px rgba(255,215,0,0.6), 0 1px 2px rgba(0,0,0,0.8)'
        : '0 1px 2px rgba(0,0,0,0.8)',
    }}>
      {amount}
    </span>
  );
}

function ChipStack({ amount, maxAmount, highlight }: { amount: number; maxAmount: number; highlight?: boolean }) {
  const count = Math.max(1, Math.min(MAX_PER_STACK, Math.round((amount / Math.max(maxAmount, 1)) * MAX_PER_STACK)));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
      <SingleStack count={count} />
      <ChipLabel amount={amount} highlight={highlight} />
    </div>
  );
}

function PotChips({ amount, minBet, highlight }: { amount: number; minBet: number; highlight?: boolean }) {
  const totalChips = Math.max(1, Math.min(24, Math.round(amount / Math.max(minBet, 50))));
  const numStacks = Math.ceil(totalChips / MAX_PER_STACK);
  const stacks: number[] = [];
  let remaining = totalChips;
  for (let i = 0; i < numStacks; i++) {
    const chips = Math.min(remaining, MAX_PER_STACK);
    stacks.push(chips);
    remaining -= chips;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
      <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end' }}>
        {stacks.map((count, i) => (
          <SingleStack key={i} count={count} />
        ))}
      </div>
      <ChipLabel amount={amount} highlight={highlight} />
    </div>
  );
}

export default function PokerTable({ hand, state }: PokerTableProps) {
  // Track last non-zero amounts for display during fade-out transitions
  const lastBetsRef = useRef<number[]>(hand.players.map(() => 0));
  const lastPotRef = useRef<number>(0);

  // Update refs with current non-zero values
  hand.players.forEach((p) => {
    const bet = state.playerBets.get(p.index) ?? 0;
    if (bet > 0) lastBetsRef.current[p.index] = bet;
  });
  if (state.pot > 0) lastPotRef.current = state.pot;

  // Check for winner
  let winnerId: number | null = null;
  state.lastActions.forEach((action, player) => {
    if (action.action === 'win') winnerId = player;
  });

  // Pot position: slides to winner on win step
  const potLeft = winnerId !== null ? CHIP_POSITIONS[winnerId][0] : CENTER_POS[0];
  const potTop = winnerId !== null ? CHIP_POSITIONS[winnerId][1] : CENTER_POS[1];
  const potVisible = state.pot > 0;
  const potAmount = potVisible ? state.pot : lastPotRef.current;

  // Max bet for scaling player chip stacks
  const betValues = hand.players.map(p => state.playerBets.get(p.index) ?? 0);
  const maxBet = Math.max(200, ...betValues);

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

      {/* Board cards (centered, fixed position) */}
      <div style={{
        position: 'absolute',
        top: '44%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      }}>
        <Board cards={state.boardCards} />
      </div>

      {/* Pot chips - always rendered, slides to winner on win */}
      <div style={{
        position: 'absolute',
        left: `${potLeft}%`,
        top: `${potTop}%`,
        transform: 'translate(-50%, -50%)',
        transition: TRANSITION,
        opacity: potVisible ? 1 : 0,
        pointerEvents: 'none',
      }}>
        <PotChips amount={potAmount} minBet={hand.minBet} highlight={winnerId !== null} />
      </div>

      {/* Dealer button */}
      <div style={{
        position: 'absolute',
        left: DEALER_BUTTON.left,
        top: DEALER_BUTTON.top,
        transform: 'translate(-50%, -50%)',
        width: '28px',
        height: '28px',
        borderRadius: '50%',
        background: '#fff',
        color: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '10px',
        fontWeight: 'bold',
        fontFamily: "'Segoe UI', Arial, sans-serif",
        border: '2px solid rgba(0,0,0,0.3)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
      }}>
        D
      </div>

      {/* Player chip bets - always rendered, slide to center when swept */}
      {hand.players.map((player, i) => {
        const bet = state.playerBets.get(player.index) ?? 0;
        const hasBet = bet > 0;
        const displayAmount = hasBet ? bet : lastBetsRef.current[player.index];
        return (
          <div
            key={`chips-${player.index}`}
            style={{
              position: 'absolute',
              left: `${hasBet ? CHIP_POSITIONS[i][0] : CENTER_POS[0]}%`,
              top: `${hasBet ? CHIP_POSITIONS[i][1] : CENTER_POS[1]}%`,
              transform: 'translate(-50%, -50%)',
              transition: TRANSITION,
              opacity: hasBet ? 1 : 0,
              pointerEvents: 'none',
            }}
          >
            {displayAmount > 0 && (
              <ChipStack amount={displayAmount} maxAmount={maxBet} />
            )}
          </div>
        );
      })}

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
