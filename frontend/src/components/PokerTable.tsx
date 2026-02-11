import React, { useRef } from 'react';
import { HandHistory, TableState } from '../types';
import PlayerSeat from './PlayerSeat';
import Board from './Board';

interface PokerTableProps {
  hand: HandHistory;
  state: TableState;
  forward?: boolean;
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

// Dealer button positions: offset from each seat towards the table center
const DEALER_POSITIONS: [number, number][] = [
  [33, 72],  // 0: near bottom left seat
  [15, 38],  // 1: near left seat
  [33, 20],  // 2: near top left seat
  [60, 20],  // 3: near top right seat
  [78, 38],  // 4: near right seat
  [60, 72],  // 5: near bottom right seat
];

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
const CHIP_W = 15;
const CHIP_H = 5;
const CHIP_GAP = 1.5;
const MAX_PER_STACK = 12;
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
              fill="rgba(0,0,0,0.4)" />
            <ellipse cx={CHIP_W / 2 + 2} cy={y + CHIP_H / 2 + 2} rx={CHIP_W / 2} ry={CHIP_H / 2}
              fill="#1a1a1a"
              stroke="rgba(255,255,255,0.6)" strokeWidth="0.8" />
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

const CHIPS_PER_100 = 100;
const MAX_STACKS = 8;

function ChipPile({ amount, highlight }: { amount: number; highlight?: boolean }) {
  const totalChips = Math.max(1, Math.floor(amount / CHIPS_PER_100) || 1);
  const capped = Math.min(totalChips, MAX_STACKS * MAX_PER_STACK);
  const numStacks = Math.min(MAX_STACKS, Math.ceil(capped / MAX_PER_STACK));
  const stacks: number[] = [];
  let remaining = capped;
  for (let i = 0; i < numStacks; i++) {
    const chips = Math.min(remaining, MAX_PER_STACK);
    stacks.push(chips);
    remaining -= chips;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
      <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end' }}>
        {stacks.map((count, i) => (
          <SingleStack key={i} count={count} />
        ))}
      </div>
      <ChipLabel amount={amount} highlight={highlight} />
    </div>
  );
}

export default function PokerTable({ hand, state, forward = true }: PokerTableProps) {
  // Fixed seat map: keeps players at the same visual seat across hands
  const seatMapRef = useRef<Map<string, number>>(new Map());

  const playerNames = hand.players.map(p => p.name);
  const allMapped = playerNames.every(n => seatMapRef.current.has(n));
  if (!allMapped) {
    const m = new Map<string, number>();
    hand.players.forEach((p, i) => m.set(p.name, i));
    seatMapRef.current = m;
  }

  const visualSeat = (player: { name: string; index: number }) =>
    seatMapRef.current.get(player.name) ?? player.index;

  // Track last non-zero amounts for display during fade-out
  const displayBetsRef = useRef<number[]>(hand.players.map(() => 0));
  const displayPotRef = useRef<number>(0);

  hand.players.forEach((p) => {
    const bet = state.playerBets.get(p.index) ?? 0;
    if (bet > 0) displayBetsRef.current[p.index] = bet;
  });
  if (state.pot > 0) displayPotRef.current = state.pot;

  // Check for winner
  let winnerId: number | null = null;
  state.lastActions.forEach((action, player) => {
    if (action.action === 'win') winnerId = player;
  });

  // Pot position: slides to winner on win step
  const winnerVisualSeat = winnerId !== null
    ? (seatMapRef.current.get(hand.players.find(p => p.index === winnerId)?.name ?? '') ?? winnerId)
    : null;
  const potLeft = winnerVisualSeat !== null ? CHIP_POSITIONS[winnerVisualSeat][0] : CENTER_POS[0];
  const potTop = winnerVisualSeat !== null ? CHIP_POSITIONS[winnerVisualSeat][1] : CENTER_POS[1];
  const potVisible = state.pot > 0;
  const potAmount = potVisible ? state.pot : displayPotRef.current;

  // Dealer button follows the BTN player (index 5) to their visual seat
  const btnPlayer = hand.players.find(p => p.index === 5);
  const dealerSeat = btnPlayer ? visualSeat(btnPlayer) : 5;

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
        <ChipPile amount={potAmount} highlight={winnerId !== null} />
      </div>

      {/* Dealer button - follows the BTN player's visual seat */}
      <div style={{
        position: 'absolute',
        left: `${DEALER_POSITIONS[dealerSeat][0]}%`,
        top: `${DEALER_POSITIONS[dealerSeat][1]}%`,
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
        const displayAmount = hasBet ? bet : displayBetsRef.current[player.index];

        // When going forward and bet disappears (sweep): slide to center
        // Otherwise (backward, winner, or new bet): stay at player position
        const slideToPot = !hasBet && forward && displayBetsRef.current[player.index] > 0
          && winnerId !== player.index;
        const vs = visualSeat(player);
        const chipLeft = slideToPot ? CENTER_POS[0] : CHIP_POSITIONS[vs][0];
        const chipTop = slideToPot ? CENTER_POS[1] : CHIP_POSITIONS[vs][1];

        return (
          <div
            key={`chips-${player.index}`}
            style={{
              position: 'absolute',
              left: `${chipLeft}%`,
              top: `${chipTop}%`,
              transform: 'translate(-50%, -50%)',
              transition: slideToPot ? TRANSITION : 'opacity 0.3s ease',
              opacity: hasBet ? 1 : 0,
              pointerEvents: 'none',
            }}
          >
            {displayAmount > 0 && (
              <ChipPile amount={displayAmount} />
            )}
          </div>
        );
      })}

      {/* Player seats */}
      {hand.players.map((player) => {
        const vs = visualSeat(player);
        return (
          <div
            key={player.index}
            style={{
              position: 'absolute',
              left: `${SEAT_POSITIONS[vs][0]}%`,
              top: `${SEAT_POSITIONS[vs][1]}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <PlayerSeat
              player={player}
              lastAction={state.lastActions.get(player.index)}
              isActive={state.activePlayer === player.index}
              showCards={state.cardsDealt}
              actionSide={SEAT_POSITIONS[vs][0] < 50 ? 'left' : 'right'}
              stack={state.playerStacks.get(player.index)}
            />
          </div>
        );
      })}
    </div>
  );
}
