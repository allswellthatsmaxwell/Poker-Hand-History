"""
Hand filter module — evaluate Python expressions against poker hand histories.

Provides PlayerStats per player, builds an eval context with pre-bound variables,
and filters a cache of hands by user-supplied expressions.
"""

import ast
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

from src.phh_reader import HandHistory


POSITION_NAMES = ['SB', 'BB', 'UTG', 'MP', 'CO', 'BTN']
STREETS = ['preflop', 'flop', 'turn', 'river']

SAFE_BUILTINS = {
    'len': len, 'any': any, 'all': all, 'sum': sum,
    'min': min, 'max': max, 'abs': abs,
    'True': True, 'False': False, 'None': None,
}


@dataclass
class PlayerStats:
    name: str
    index: int
    position: str
    starting_stack: int
    hole_cards: Optional[List[str]]

    net: int = 0
    won: int = 0
    is_winner: bool = False
    is_blind: bool = False

    vpip: bool = False
    pfr: bool = False
    saw_flop: bool = False
    went_to_showdown: bool = False

    donks: int = 0
    three_bets: int = 0

    folds: int = 0
    checks: int = 0
    calls: int = 0
    bets: int = 0
    raises: int = 0

    preflop_folds: int = 0
    preflop_checks: int = 0
    preflop_calls: int = 0
    preflop_bets: int = 0
    preflop_raises: int = 0

    flop_folds: int = 0
    flop_checks: int = 0
    flop_calls: int = 0
    flop_bets: int = 0
    flop_raises: int = 0

    turn_folds: int = 0
    turn_checks: int = 0
    turn_calls: int = 0
    turn_bets: int = 0
    turn_raises: int = 0

    river_folds: int = 0
    river_checks: int = 0
    river_calls: int = 0
    river_bets: int = 0
    river_raises: int = 0


def _compute_player_stats(hh: HandHistory) -> Dict[int, PlayerStats]:
    """Compute PlayerStats for every player in the hand."""
    num_players = len(hh.players)
    stats: Dict[int, PlayerStats] = {}

    for p in hh.players:
        pos = POSITION_NAMES[p.index] if p.index < len(POSITION_NAMES) else f'P{p.index}'
        stats[p.index] = PlayerStats(
            name=p.name,
            index=p.index,
            position=pos,
            starting_stack=p.starting_stack,
            hole_cards=p.hole_cards,
            is_blind=(hh.blinds[p.index] > 0 if p.index < len(hh.blinds) else False),
        )

    # Track per-street bets and total committed
    street_bets: Dict[int, int] = {i: 0 for i in range(num_players)}
    total_committed: Dict[int, int] = {i: 0 for i in range(num_players)}
    folded = set()
    folded_on_street: Dict[int, str] = {}  # player_idx -> street they folded on
    last_aggressor: Optional[int] = None  # per-street aggressor tracking
    prev_street_aggressor: Optional[int] = None

    # Blinds count as committed
    for i, blind in enumerate(hh.blinds):
        if i < num_players and blind > 0:
            street_bets[i] = blind

    # Antes
    for i, ante in enumerate(hh.antes):
        if i < num_players and ante > 0:
            total_committed[i] += ante

    for street in STREETS:
        actions = hh.actions.get(street, [])
        if not actions:
            continue

        # At the start of a new street, finalize previous street bets
        if street != 'preflop':
            for i in range(num_players):
                total_committed[i] += street_bets[i]
                street_bets[i] = 0
            prev_street_aggressor = last_aggressor
            last_aggressor = None

        # Track raise count for 3-bet detection on preflop
        preflop_raise_count = 0
        # On preflop, the BB counts as the first "raise" for 3-bet purposes,
        # and the first actual raise is a 2-bet (open), second raise is a 3-bet.
        acted_this_street: set = set()  # for donk detection

        for action_dict in actions:
            pidx = action_dict['player']
            act = action_dict['action']
            amount = action_dict.get('amount', 0)

            s = stats[pidx]

            # Per-street action counts
            street_attr = f'{street}_{act}s'
            if hasattr(s, street_attr):
                setattr(s, street_attr, getattr(s, street_attr) + 1)

            # Global action counts
            global_attr = f'{act}s'
            if hasattr(s, global_attr):
                setattr(s, global_attr, getattr(s, global_attr) + 1)

            if act == 'fold':
                folded.add(pidx)
                folded_on_street[pidx] = street

            elif act == 'check':
                pass

            elif act == 'call':
                street_bets[pidx] += amount
                # VPIP: voluntary preflop call (not just posting blind)
                if street == 'preflop':
                    s.vpip = True

            elif act == 'bet':
                # Donk detection: betting into the previous street's aggressor,
                # meaning the aggressor is still active and hasn't acted yet
                if (street != 'preflop'
                        and prev_street_aggressor is not None
                        and pidx != prev_street_aggressor
                        and prev_street_aggressor not in folded
                        and prev_street_aggressor not in acted_this_street):
                    s.donks += 1

                street_bets[pidx] = amount  # bet amount is the total on this street
                last_aggressor = pidx
                if street == 'preflop':
                    s.vpip = True

            elif act == 'raise':
                street_bets[pidx] = amount  # raise "to" amount on this street
                last_aggressor = pidx

                if street == 'preflop':
                    preflop_raise_count += 1
                    s.vpip = True
                    s.pfr = True
                    # 3-bet: the second raise preflop (first raise = open/2-bet)
                    if preflop_raise_count >= 2:
                        s.three_bets += 1

            acted_this_street.add(pidx)

        # After the last street, finalize
    for i in range(num_players):
        total_committed[i] += street_bets[i]

    # Determine winners and amounts
    winner_amounts: Dict[int, int] = {}
    for w in hh.winners:
        pidx = w['player']
        winner_amounts[pidx] = winner_amounts.get(pidx, 0) + w['amount']

    actual_pot = sum(winner_amounts.values())
    nominal_pot = sum(total_committed.values())
    uncalled = nominal_pot - actual_pot

    # Subtract uncalled bet from the last aggressor's committed
    if uncalled > 0 and last_aggressor is not None:
        total_committed[last_aggressor] -= uncalled

    # Compute net and winner info
    for i in range(num_players):
        s = stats[i]
        s.won = winner_amounts.get(i, 0)
        s.is_winner = s.won > 0
        s.net = s.won - total_committed[i]

    # Saw flop / went to showdown
    for i in range(num_players):
        s = stats[i]
        # saw_flop: didn't fold during preflop
        s.saw_flop = i not in folded or folded_on_street.get(i) != 'preflop'
        s.went_to_showdown = i not in folded

    return stats


def _count_players_on_street(hh: HandHistory, street: str) -> int:
    """Count how many players were active (not folded) at the start of a street."""
    folded = set()
    for s in STREETS:
        if s == street:
            break
        for a in hh.actions.get(s, []):
            if a['action'] == 'fold':
                folded.add(a['player'])
    return len(hh.players) - len(folded)


def build_eval_context(hh: HandHistory) -> dict:
    """Build the variable context for evaluating filter expressions."""
    player_stats = _compute_player_stats(hh)
    num_players = len(hh.players)

    ctx = {}

    # Player stats by lowercase name (dots become underscores not needed,
    # names like "MrBlue" become "mrblue")
    players_dict = {}
    for s in player_stats.values():
        key = s.name.lower().replace(' ', '_')
        ctx[key] = s
        players_dict[key] = s
    ctx['players'] = players_dict

    # Street / board info
    ctx['actions'] = set(hh.actions.keys())
    ctx['flop'] = hh.flop_cards
    ctx['turn'] = hh.turn_cards
    ctx['river'] = hh.river_cards
    ctx['board'] = hh.board

    # Pot
    ctx['pot'] = sum(w['amount'] for w in hh.winners)

    # Player counts
    ctx['num_players'] = num_players
    ctx['flop_players'] = _count_players_on_street(hh, 'flop') if 'flop' in hh.actions else 0
    ctx['turn_players'] = _count_players_on_street(hh, 'turn') if 'turn' in hh.actions else 0
    ctx['river_players'] = _count_players_on_street(hh, 'river') if 'river' in hh.actions else 0

    return ctx


def _check_ast_safety(code: str) -> Optional[str]:
    """Check the AST for disallowed constructs. Returns error message or None."""
    try:
        tree = ast.parse(code, mode='eval')
    except SyntaxError as e:
        return f"Syntax error: {e}"

    for node in ast.walk(tree):
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            return "Import statements are not allowed"
        if isinstance(node, ast.Attribute):
            if node.attr.startswith('__') and node.attr.endswith('__'):
                return f"Dunder attribute access '{node.attr}' is not allowed"
        if isinstance(node, ast.Call):
            # Check for calls to dangerous builtins
            if isinstance(node.func, ast.Name):
                if node.func.id in ('eval', 'exec', 'compile', 'open',
                                     'getattr', 'setattr', 'delattr',
                                     '__import__', 'globals', 'locals',
                                     'vars', 'dir', 'type', 'input'):
                    return f"Function '{node.func.id}' is not allowed"
    return None


def filter_hands(expression: str, hand_cache: Dict[str, HandHistory]) -> Tuple[List[str], Optional[str]]:
    """
    Filter hands by evaluating a Python expression against each hand.

    Returns (matching_hand_ids, error_message).
    error_message is None on success.
    """
    expression = expression.strip()
    if not expression:
        return sorted(hand_cache.keys()), None

    # AST safety check
    safety_error = _check_ast_safety(expression)
    if safety_error:
        return [], safety_error

    try:
        code = compile(expression, '<filter>', 'eval')
    except SyntaxError as e:
        return [], f"Syntax error: {e}"

    matching = []
    for hand_id in sorted(hand_cache.keys()):
        hh = hand_cache[hand_id]
        try:
            ctx = build_eval_context(hh)
            ctx.update(SAFE_BUILTINS)
            result = eval(code, {"__builtins__": {}}, ctx)
            if result:
                matching.append(hand_id)
        except Exception:
            # Hands where eval raises are silently skipped
            continue

    return matching, None
