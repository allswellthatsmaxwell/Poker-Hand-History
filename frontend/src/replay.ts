import { HandHistory, Action, Card, TableState, Street } from './types';

const STREET_ORDER: Street[] = ['preflop', 'flop', 'turn', 'river'];

function formatCard(card: Card): string {
  const suitSymbols: Record<string, string> = { c: '\u2663', d: '\u2666', h: '\u2665', s: '\u2660' };
  return `${card.rank}${suitSymbols[card.suit]}`;
}

function snapshot(
  boardCards: Card[],
  lastActions: Map<number, Action>,
  pot: number,
  playerBets: Map<number, number>,
  playerStacks: Map<number, number>,
  activePlayer: number | null,
  description: string,
  cardsDealt: boolean,
): TableState {
  return {
    boardCards: [...boardCards],
    lastActions: new Map(lastActions),
    pot,
    playerBets: new Map(playerBets),
    playerStacks: new Map(playerStacks),
    activePlayer,
    description,
    cardsDealt,
  };
}

export function buildSteps(hand: HandHistory): TableState[] {
  const steps: TableState[] = [];
  // collectedPot = chips swept to center from completed streets
  let collectedPot = hand.antes.reduce((a, b) => a + b, 0);
  const lastActions = new Map<number, Action>();
  const playerBets = new Map<number, number>();
  const playerStacks = new Map<number, number>();

  // Initialize stacks: starting stack minus antes and blinds
  hand.players.forEach((p, i) => {
    const ante = hand.antes[i] ?? 0;
    const blind = hand.blinds[i] ?? 0;
    playerStacks.set(p.index, p.startingStack - ante - blind);
  });

  // Blinds start as player bets, not in the center
  hand.blinds.forEach((blind, i) => {
    if (blind > 0) playerBets.set(i, blind);
  });

  // Step 0: Blinds posted
  steps.push(snapshot([], lastActions, collectedPot, playerBets, playerStacks, null,
    `Blinds posted (SB ${hand.blinds[0]}, BB ${hand.blinds[1]})`, false));

  // Step 1: Hole cards dealt
  steps.push(snapshot([], lastActions, collectedPot, playerBets, playerStacks, null,
    'Hole cards dealt', true));

  // Walk through each street
  for (const street of STREET_ORDER) {
    const actions = hand.actions[street] ?? [];

    // At street boundaries: sweep player bets into collected pot
    if (street !== 'preflop') {
      playerBets.forEach((amount) => {
        collectedPot += amount;
      });
      playerBets.clear();

      lastActions.forEach((action, player) => {
        if (action.action !== 'fold') {
          lastActions.delete(player);
        }
      });
    }

    // Current board for this street
    const currentBoard = street === 'preflop' ? [] :
      street === 'flop' ? [...hand.flopCards] :
      street === 'turn' ? [...hand.flopCards, ...hand.turnCards] :
      [...hand.flopCards, ...hand.turnCards, ...hand.riverCards];

    // Deal step for flop/turn/river
    if (street === 'flop') {
      const cardStr = hand.flopCards.map(formatCard).join(' ');
      steps.push(snapshot(currentBoard, lastActions, collectedPot, playerBets, playerStacks, null,
        `Flop: ${cardStr}`, true));
    } else if (street === 'turn') {
      const cardStr = hand.turnCards.map(formatCard).join(' ');
      steps.push(snapshot(currentBoard, lastActions, collectedPot, playerBets, playerStacks, null,
        `Turn: ${cardStr}`, true));
    } else if (street === 'river') {
      const cardStr = hand.riverCards.map(formatCard).join(' ');
      steps.push(snapshot(currentBoard, lastActions, collectedPot, playerBets, playerStacks, null,
        `River: ${cardStr}`, true));
    }

    // Action steps
    for (const action of actions) {
      lastActions.set(action.player, action);
      if (action.amount != null && action.action !== 'fold') {
        const prev = playerBets.get(action.player) ?? 0;
        playerBets.set(action.player, prev + action.amount);
        const stack = playerStacks.get(action.player) ?? 0;
        playerStacks.set(action.player, stack - action.amount);
      }

      const playerName = hand.players[action.player]?.name ?? `Player ${action.player}`;
      let desc: string;
      if (action.action === 'check') desc = `${playerName} checks`;
      else if (action.action === 'raise') desc = `${playerName} raises`;
      else if (action.action === 'fold') desc = `${playerName} folds`;
      else if (action.action === 'call') desc = `${playerName} calls`;
      else if (action.action === 'bet') desc = `${playerName} bets`;
      else desc = `${playerName} ${action.action}s`;

      if (action.amount != null) {
        desc += ` $${action.amount}`;
      }

      steps.push(snapshot(currentBoard, lastActions, collectedPot, playerBets, playerStacks, action.player,
        desc, true));
    }
  }

  // Check for fold-win: if only one player hasn't folded, they win
  const foldedPlayers = new Set<number>();
  lastActions.forEach((action, player) => {
    if (action.action === 'fold') foldedPlayers.add(player);
  });
  const activePlayers = hand.players.filter(p => !foldedPlayers.has(p.index));
  if (activePlayers.length === 1) {
    const winner = activePlayers[0];
    // Sweep all bets into collected pot, except winner's uncalled bet
    playerBets.forEach((amount, player) => {
      if (player !== winner.index) {
        collectedPot += amount;
      }
    });
    playerBets.clear();

    const winAction: Action = { player: winner.index, action: 'win', amount: collectedPot };
    lastActions.set(winner.index, winAction);
    const stack = playerStacks.get(winner.index) ?? 0;
    playerStacks.set(winner.index, stack + collectedPot);

    const lastStep = steps[steps.length - 1];
    steps.push(snapshot(lastStep.boardCards, lastActions, collectedPot, playerBets, playerStacks, winner.index,
      `${winner.name} wins $${collectedPot}`, true));
  } else if (hand.winners?.length) {
    // Showdown win: sweep remaining bets into pot, then award to winner(s)
    playerBets.forEach((amount) => {
      collectedPot += amount;
    });
    playerBets.clear();

    for (const w of hand.winners) {
      const winnerPlayer = hand.players[w.player];
      const winAction: Action = { player: w.player, action: 'win', amount: w.amount };
      lastActions.set(w.player, winAction);
      const wStack = playerStacks.get(w.player) ?? 0;
      playerStacks.set(w.player, wStack + w.amount);

      const lastStep = steps[steps.length - 1];
      steps.push(snapshot(lastStep.boardCards, lastActions, collectedPot, playerBets, playerStacks, w.player,
        `${winnerPlayer?.name ?? `Player ${w.player}`} wins $${w.amount}`, true));
    }
  }

  return steps;
}
