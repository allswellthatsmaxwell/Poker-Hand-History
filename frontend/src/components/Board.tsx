import React from 'react';
import { Card as CardType } from '../types';
import Card from './Card';

interface BoardProps {
  cards: CardType[];
}

export default function Board({ cards }: BoardProps) {
  // Always show 5 slots; fill with dealt cards, rest are empty placeholders
  const slots = Array.from({ length: 5 }, (_, i) => cards[i] ?? null);

  return (
    <div style={{
      display: 'flex',
      gap: '6px',
      padding: '10px 16px',
      background: 'rgba(0, 0, 0, 0.25)',
      borderRadius: '12px',
    }}>
      {slots.map((card, i) => (
        <div key={i}>
          {card ? (
            <Card card={card} width={56} />
          ) : (
            <div style={{
              width: 56,
              height: 56 * (7 / 5),
              borderRadius: '6px',
              border: '2px dashed rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.05)',
            }} />
          )}
        </div>
      ))}
    </div>
  );
}
