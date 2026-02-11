import React from 'react';
import { Card as CardType, Rank, Suit } from '../types';

const SUIT_SYMBOLS: Record<Suit, string> = {
  c: '\u2663', // ♣
  d: '\u2666', // ♦
  h: '\u2665', // ♥
  s: '\u2660', // ♠
};

// const SUIT_COLORS: Record<Suit, string> = {
//   h: '#e53935',
//   d: '#e64a19',
//   c: '#263238',
//   s: '#1a237e',
// };

const SUIT_COLORS: Record<Suit, string> = {
  h: '#e53935',
  d: '#FF6103',
  c: '#4682B4',
  s: '#263238',
};

const RANK_DISPLAY: Record<Rank, string> = {
  '2': '2', '3': '3', '4': '4', '5': '5', '6': '6',
  '7': '7', '8': '8', '9': '9', 'T': '10',
  'J': 'J', 'Q': 'Q', 'K': 'K', 'A': 'A',
};

interface CardProps {
  card?: CardType;
  faceDown?: boolean;
  width?: number;
}

export default function Card({ card, faceDown, width = 60 }: CardProps) {
  const height = width * (7 / 5);
  const vw = 70;
  const vh = 98;

  if (faceDown || !card) {
    return (
      <svg width={width} height={height} viewBox={`0 0 ${vw} ${vh}`}>
        <rect x="1.5" y="1.5" width={vw - 3} height={vh - 3} rx="8" ry="8"
          fill="#1e3a5f" stroke="#152a45" strokeWidth="1.5" />
        {/* Decorative center diamond */}
        <g opacity="0.18">
          <polygon points={`${vw/2},22 ${vw/2+14},${vh/2} ${vw/2},${vh-22} ${vw/2-14},${vh/2}`}
            fill="none" stroke="#5c8abf" strokeWidth="1.5" />
          <polygon points={`${vw/2},30 ${vw/2+9},${vh/2} ${vw/2},${vh-30} ${vw/2-9},${vh/2}`}
            fill="none" stroke="#5c8abf" strokeWidth="0.8" />
        </g>
      </svg>
    );
  }

  const color = SUIT_COLORS[card.suit];
  const symbol = SUIT_SYMBOLS[card.suit];
  const rank = RANK_DISPLAY[card.rank];

  // Vertically centered pair: rank at y=37, suit at y=61
  // Distance from top to rank center = 37, distance from bottom to suit center = 98-61 = 37
  const rankY = 29;
  const suitY = 70;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${vw} ${vh}`}>
      {/* Card body */}
      <rect x="1.5" y="1.5" width={vw - 3} height={vh - 3} rx="8" ry="8"
        fill="white" stroke="#ccc" strokeWidth="1" />

      {/* Rank */}
      <text
        x={vw / 2}
        y={rankY}
        fill={color}
        fontFamily="'Modak', 'Marker Felt', 'Trattatello', 'Noteworthy', 'Apercu', 'Segoe UI', serif"
        fontSize="54"
        fontWeight="600"
        textAnchor="middle"
        dominantBaseline="central"
        letterSpacing="-1"
      >
        {rank}
      </text>

      {/* Suit symbol */}
      <text
        x={vw / 2}
        y={suitY}
        fill={color}
        fontFamily="'-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Arial Unicode MS', sans-serif"
        fontSize="50"
        textAnchor="middle"
        dominantBaseline="central"
        style={{ fontVariantEmoji: 'text' }}
      >
        {symbol}
      </text>
    </svg>
  );
}
