import { HandHistory, Action, Card, TableState, Street } from './types';

const STREET_ORDER: Street[] = ['preflop', 'flop', 'turn', 'river'];

function formatCard(card: Card): string {
  const suitSymbols: Record<string, string> = { c: '\u2663', d: '\u2666', h: '\u2665', s: '\u2660' };
  return `${card.rank}${suitSymbols[card.suit]}`;
}

export function buildSteps(hand: HandHistory): TableState[] {
  const steps: TableState[] = [];
  let pot = hand.blinds.reduce((a, b) => a + b, 0)
           + hand.antes.reduce((a, b) => a + b, 0);
  const lastActions = new Map<number, Action>();

  // Step 0: Blinds posted
  steps.push({
    boardCards: [],
    lastActions: new Map(lastActions),
    pot,
    activePlayer: null,
    description: `Blinds posted (SB ${hand.blinds[0]}, BB ${hand.blinds[1]})`,
    cardsDealt: false,
  });

  // Step 1: Hole cards dealt
  steps.push({
    boardCards: [],
    lastActions: new Map(lastActions),
    pot,
    activePlayer: null,
    description: 'Hole cards dealt',
    cardsDealt: true,
  });

  // Walk through each street
  for (const street of STREET_ORDER) {
    const actions = hand.actions[street] ?? [];

    // Deal step for flop/turn/river
    let boardCards: Card[];
    if (street === 'flop') {
      boardCards = [...hand.flopCards];
      const cardStr = boardCards.map(formatCard).join(' ');
      steps.push({
        boardCards: [...boardCards],
        lastActions: new Map(lastActions),
        pot,
        activePlayer: null,
        description: `Flop: ${cardStr}`,
        cardsDealt: true,
      });
    } else if (street === 'turn') {
      boardCards = [...hand.flopCards, ...hand.turnCards];
      const cardStr = hand.turnCards.map(formatCard).join(' ');
      steps.push({
        boardCards: [...boardCards],
        lastActions: new Map(lastActions),
        pot,
        activePlayer: null,
        description: `Turn: ${cardStr}`,
        cardsDealt: true,
      });
    } else if (street === 'river') {
      boardCards = [...hand.flopCards, ...hand.turnCards, ...hand.riverCards];
      const cardStr = hand.riverCards.map(formatCard).join(' ');
      steps.push({
        boardCards: [...boardCards],
        lastActions: new Map(lastActions),
        pot,
        activePlayer: null,
        description: `River: ${cardStr}`,
        cardsDealt: true,
      });
    } else {
      // preflop: board stays empty, no deal step (already handled above)
      boardCards = [];
    }

    // Current board for this street
    const currentBoard = street === 'preflop' ? [] :
      street === 'flop' ? [...hand.flopCards] :
      street === 'turn' ? [...hand.flopCards, ...hand.turnCards] :
      [...hand.flopCards, ...hand.turnCards, ...hand.riverCards];

    // Action steps
    for (const action of actions) {
      lastActions.set(action.player, action);
      if (action.amount != null && action.action !== 'fold') {
        pot += action.amount;
      }

      const playerName = hand.players[action.player]?.name ?? `Player ${action.player}`;
      let desc = `${playerName} ${action.action}s`;
      // Fix grammar: "folds", "checks", "calls", "bets", "raises"
      if (action.action === 'check') desc = `${playerName} checks`;
      else if (action.action === 'raise') desc = `${playerName} raises`;
      else if (action.action === 'fold') desc = `${playerName} folds`;
      else if (action.action === 'call') desc = `${playerName} calls`;
      else if (action.action === 'bet') desc = `${playerName} bets`;

      if (action.amount != null) {
        desc += ` $${action.amount}`;
      }

      steps.push({
        boardCards: [...currentBoard],
        lastActions: new Map(lastActions),
        pot,
        activePlayer: action.player,
        description: desc,
        cardsDealt: true,
      });
    }
  }

  return steps;
}
