export type Suit = 'c' | 'd' | 'h' | 's';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  rank: Rank;
  suit: Suit;
}

export interface Player {
  index: number;
  name: string;
  startingStack: number;
  holeCards: [Card, Card] | null;
}

export type ActionType = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'win';

export interface Action {
  player: number;
  action: ActionType;
  amount?: number;
}

export type Street = 'preflop' | 'flop' | 'turn' | 'river';

export interface HandHistory {
  variant: string;
  antes: number[];
  blinds: number[];
  minBet: number;
  players: Player[];
  flopCards: Card[];
  turnCards: Card[];
  riverCards: Card[];
  board: Card[];
  actions: Partial<Record<Street, Action[]>>;
  winners?: {player: number, amount: number}[];
}

export interface TableState {
  boardCards: Card[];
  lastActions: Map<number, Action>;
  pot: number;
  playerBets: Map<number, number>;  // current street bets per player
  playerStacks: Map<number, number>;  // live stack per player
  activePlayer: number | null;
  description: string;
  cardsDealt: boolean;
}

/** Parse a card string like "Tc" into a Card object */
export function parseCard(s: string): Card {
  return { rank: s[0] as Rank, suit: s[1] as Suit };
}
