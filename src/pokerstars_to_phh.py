"""
PokerStars Hand History to PHH (Poker Hand History) Converter

Converts PokerStars text format hand histories to TOML-based PHH format
compatible with the pokerkit library.
"""

import re
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass, field


@dataclass
class Player:
    """Represents a player in the hand"""
    seat: int
    name: str
    starting_stack: int
    hole_cards: Optional[List[str]] = None


@dataclass
class Action:
    """Represents a single action in the hand"""
    player: str
    action_type: str  # 'fold', 'check', 'call', 'raise', 'bet', 'all-in'
    amount: Optional[int] = None


class PokerStarsToPhhConverter:
    """Converts PokerStars hand histories to PHH format"""

    # Card rank and suit mappings
    RANKS = {'2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7',
             '8': '8', '9': '9', 'T': 'T', 'J': 'J', 'Q': 'Q', 'K': 'K', 'A': 'A'}
    SUITS = {'c': 'c', 'd': 'd', 'h': 'h', 's': 's'}

    def __init__(self):
        self.reset()

    def reset(self):
        """Reset the converter state"""
        self.players: List[Player] = []
        self.button_seat: int = 0
        self.small_blind: int = 0
        self.big_blind: int = 0
        self.ante: int = 0
        self.actions: Dict[str, List[Action]] = {
            'preflop': [],
            'flop': [],
            'turn': [],
            'river': []
        }
        self.board: List[str] = []
        self.board_by_street: Dict[str, List[str]] = {
            'flop': [],
            'turn': [],
            'river': []
        }
        self.pot: int = 0
        self.rake: int = 0
        self.hand_id: str = ""
        self.variant: str = "NT"  # No Limit Texas Hold'em

    def parse_header(self, line: str) -> None:
        """Parse the hand header line"""
        # PokerStars Hand #100000: Hold'em No Limit (50/100)
        match = re.search(r'Hand #(\d+):', line)
        if match:
            self.hand_id = match.group(1)

        # Extract blinds
        match = re.search(r'\((\d+)/(\d+)\)', line)
        if match:
            self.small_blind = int(match.group(1))
            self.big_blind = int(match.group(2))

    def parse_button(self, line: str) -> None:
        """Parse the button line"""
        # Seat #6 is the button
        match = re.search(r'Seat #(\d+) is the button', line)
        if match:
            self.button_seat = int(match.group(1))

    def parse_seat(self, line: str) -> None:
        """Parse a seat line"""
        # Seat 1: MrBlue (10000 in chips)
        match = re.search(r'Seat (\d+): (\w+) \((\d+) in chips\)', line)
        if match:
            seat = int(match.group(1))
            name = match.group(2)
            stack = int(match.group(3))
            self.players.append(Player(seat=seat, name=name, starting_stack=stack))

    def parse_hole_cards(self, line: str) -> None:
        """Parse hole cards dealt to a player"""
        # Dealt to MrBlue [Tc Qc]
        match = re.search(r'Dealt to (\w+) \[([^\]]+)\]', line)
        if match:
            player_name = match.group(1)
            cards_str = match.group(2)
            cards = cards_str.split()

            for player in self.players:
                if player.name == player_name:
                    player.hole_cards = cards
                    break

    def parse_action(self, line: str, street: str) -> None:
        """Parse a player action"""
        player_name = None
        action_type = None
        amount = None

        # MrBlue: posts small blind 50
        if 'posts small blind' in line:
            match = re.search(r'(\w+): posts small blind (\d+)', line)
            if match:
                player_name = match.group(1)
                action_type = 'post_sb'
                amount = int(match.group(2))

        # MrBlonde: posts big blind 100
        elif 'posts big blind' in line:
            match = re.search(r'(\w+): posts big blind (\d+)', line)
            if match:
                player_name = match.group(1)
                action_type = 'post_bb'
                amount = int(match.group(2))

        # MrWhite: folds
        elif ': folds' in line:
            match = re.search(r'(\w+): folds', line)
            if match:
                player_name = match.group(1)
                action_type = 'fold'

        # MrBlue: checks
        elif ': checks' in line:
            match = re.search(r'(\w+): checks', line)
            if match:
                player_name = match.group(1)
                action_type = 'check'

        # MrBlue: calls 160
        elif ': calls' in line:
            match = re.search(r'(\w+): calls (\d+)', line)
            if match:
                player_name = match.group(1)
                action_type = 'call'
                amount = int(match.group(2))

        # MrPink: raises 110 to 210
        elif ': raises' in line:
            match = re.search(r'(\w+): raises (\d+) to (\d+)', line)
            if match:
                player_name = match.group(1)
                action_type = 'raise'
                amount = int(match.group(3))  # Total amount

        # MrBlue: bets 230
        elif ': bets' in line:
            match = re.search(r'(\w+): bets (\d+)', line)
            if match:
                player_name = match.group(1)
                action_type = 'bet'
                amount = int(match.group(2))

        # Handle all-in
        if 'and is all-in' in line:
            action_type = action_type + '_allin' if action_type else 'allin'

        if player_name and action_type:
            self.actions[street].append(Action(player_name, action_type, amount))

    def parse_board(self, line: str) -> List[str]:
        """Parse board cards from a street line"""
        # *** FLOP *** [7d 5h 9d]
        # *** TURN *** [7d 5h 9d] [7c]
        match = re.search(r'\[([^\]]+)\]', line)
        if match:
            cards_str = match.group(1)
            return cards_str.split()
        return []

    def parse_summary(self, line: str) -> None:
        """Parse summary information"""
        # Total pot 520 | Rake 0
        match = re.search(r'Total pot (\d+)(?:\.0)?\s*\|\s*Rake (\d+)', line)
        if match:
            self.pot = int(float(match.group(1)))
            self.rake = int(match.group(2))

        # Board [7d 5h 9d 7c Qh]
        if line.startswith('Board'):
            match = re.search(r'\[([^\]]+)\]', line)
            if match:
                self.board = match.group(1).split()

    def parse_pokerstars_hand(self, hand_text: str) -> None:
        """Parse a complete PokerStars hand history"""
        self.reset()

        lines = hand_text.strip().split('\n')
        current_street = 'preflop'
        in_summary = False

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # Header
            if line.startswith('PokerStars Hand'):
                self.parse_header(line)

            # Button
            elif 'is the button' in line:
                self.parse_button(line)

            # Seats
            elif line.startswith('Seat ') and ':' in line:
                self.parse_seat(line)

            # Hole cards
            elif line.startswith('Dealt to'):
                self.parse_hole_cards(line)

            # Street markers
            elif line.startswith('*** HOLE CARDS ***'):
                current_street = 'preflop'
            elif line.startswith('*** FLOP ***'):
                current_street = 'flop'
                cards = self.parse_board(line)
                self.board.extend(cards)
                self.board_by_street['flop'] = cards
            elif line.startswith('*** TURN ***'):
                current_street = 'turn'
                # Extract just the turn card (last one in brackets)
                matches = re.findall(r'\[([^\]]+)\]', line)
                if len(matches) > 1:
                    turn_card = matches[-1].split()
                    self.board.extend(turn_card)
                    self.board_by_street['turn'] = turn_card
            elif line.startswith('*** RIVER ***'):
                current_street = 'river'
                # Extract just the river card (last one in brackets)
                matches = re.findall(r'\[([^\]]+)\]', line)
                if len(matches) > 1:
                    river_card = matches[-1].split()
                    self.board.extend(river_card)
                    self.board_by_street['river'] = river_card
            elif line.startswith('*** SUMMARY ***'):
                in_summary = True

            # Actions
            elif ':' in line and not in_summary:
                self.parse_action(line, current_street)

            # Summary
            elif in_summary:
                self.parse_summary(line)

    def get_player_index(self, player_name: str) -> int:
        """Get the index of a player by name"""
        for i, player in enumerate(self.players):
            if player.name == player_name:
                return i
        return -1

    def convert_to_phh(self) -> str:
        """Convert parsed hand to PHH TOML format"""
        lines = []

        # Variant and basic info
        lines.append(f'variant = "{self.variant}"')
        lines.append('ante_trimming_status = true')

        # Antes (0 for all players if no antes)
        antes = [str(self.ante) for _ in self.players]
        lines.append(f'antes = [{", ".join(antes)}]')

        # Blinds - need to figure out positions relative to button
        num_players = len(self.players)
        blinds = ['0'] * num_players

        # Find SB and BB positions (typically button+1 and button+2 in terms of action order)
        for action in self.actions['preflop']:
            if action.action_type == 'post_sb':
                idx = self.get_player_index(action.player)
                if idx >= 0:
                    blinds[idx] = str(self.small_blind)
            elif action.action_type == 'post_bb':
                idx = self.get_player_index(action.player)
                if idx >= 0:
                    blinds[idx] = str(self.big_blind)

        lines.append(f'blinds_or_straddles = [{", ".join(blinds)}]')
        lines.append(f'min_bet = {self.big_blind}')

        # Starting stacks
        stacks = [str(player.starting_stack) for player in self.players]
        lines.append(f'starting_stacks = [{", ".join(stacks)}]')

        # Starting board (empty for Hold'em)
        lines.append('starting_board = []')

        # Board cards by street (these must come before [players] section)
        if self.board_by_street['flop']:
            flop_cards = ', '.join([f'"{card}"' for card in self.board_by_street['flop']])
            lines.append(f'flop_cards = [{flop_cards}]')
        if self.board_by_street['turn']:
            turn_cards = ', '.join([f'"{card}"' for card in self.board_by_street['turn']])
            lines.append(f'turn_cards = [{turn_cards}]')
        if self.board_by_street['river']:
            river_cards = ', '.join([f'"{card}"' for card in self.board_by_street['river']])
            lines.append(f'river_cards = [{river_cards}]')

        # Full board (all community cards)
        if self.board:
            all_cards = ', '.join([f'"{card}"' for card in self.board])
            lines.append(f'board = [{all_cards}]')

        lines.append('')

        # Players
        for i, player in enumerate(self.players):
            lines.append(f'[players.{i}]')
            lines.append(f'name = "{player.name}"')
            lines.append(f'starting_stack = {player.starting_stack}')

            # Add hole cards directly to player section
            if player.hole_cards:
                cards_str = ', '.join([f'"{card}"' for card in player.hole_cards])
                lines.append(f'hole_cards = [{cards_str}]')

            lines.append('')

        # Actions
        lines.append('[actions]')

        # Preflop actions (skip blind posts for PHH)
        preflop_actions = [a for a in self.actions['preflop']
                          if a.action_type not in ['post_sb', 'post_bb']]
        if preflop_actions:
            lines.append('preflop = [')
            for action in preflop_actions:
                lines.append(f'  {self._format_action(action)},')
            lines.append(']')

        # Flop actions
        if self.actions['flop']:
            lines.append('flop = [')
            for action in self.actions['flop']:
                lines.append(f'  {self._format_action(action)},')
            lines.append(']')

        # Turn actions
        if self.actions['turn']:
            lines.append('turn = [')
            for action in self.actions['turn']:
                lines.append(f'  {self._format_action(action)},')
            lines.append(']')

        # River actions
        if self.actions['river']:
            lines.append('river = [')
            for action in self.actions['river']:
                lines.append(f'  {self._format_action(action)},')
            lines.append(']')

        return '\n'.join(lines)

    def _format_action(self, action: Action) -> str:
        """Format an action for PHH"""
        player_idx = self.get_player_index(action.player)

        if action.action_type == 'fold':
            return f'{{ player = {player_idx}, action = "fold" }}'
        elif action.action_type == 'check':
            return f'{{ player = {player_idx}, action = "check" }}'
        elif action.action_type == 'call':
            return f'{{ player = {player_idx}, action = "call", amount = {action.amount} }}'
        elif action.action_type == 'bet':
            return f'{{ player = {player_idx}, action = "bet", amount = {action.amount} }}'
        elif action.action_type == 'raise':
            return f'{{ player = {player_idx}, action = "raise", amount = {action.amount} }}'
        else:
            # Default format
            return f'{{ player = {player_idx}, action = "{action.action_type}" }}'

    def convert_file(self, input_path: str, output_path: str) -> None:
        """Convert a PokerStars hand history file to PHH format"""
        with open(input_path, 'r') as f:
            hand_text = f.read()

        self.parse_pokerstars_hand(hand_text)
        phh_output = self.convert_to_phh()

        with open(output_path, 'w') as f:
            f.write(phh_output)

        print(f"Converted {input_path} to {output_path}")

    def convert_string(self, pokerstars_text: str) -> str:
        """Convert a PokerStars hand history string to PHH format"""
        self.parse_pokerstars_hand(pokerstars_text)
        return self.convert_to_phh()


# Example usage
if __name__ == "__main__":
    example_hand = """PokerStars Hand #100000: Hold'em No Limit (50/100) - 2019/07/12 03:46:40 ET
Table 'Pluribus Session 100' 6-max Seat #6 is the button
Seat 1: MrBlue (10000 in chips)
Seat 2: MrBlonde (10000 in chips)
Seat 3: MrWhite (10000 in chips)
Seat 4: MrPink (10000 in chips)
Seat 5: MrBrown (10000 in chips)
Seat 6: Pluribus (10000 in chips)
MrBlue: posts small blind 50
MrBlonde: posts big blind 100
*** HOLE CARDS ***
Dealt to MrBlue [Tc Qc]
Dealt to MrBlonde [8s 4c]
Dealt to MrWhite [9c 3d]
Dealt to MrPink [Ah 4h]
Dealt to MrBrown [Th 5s]
Dealt to Pluribus [6c 7s]
MrWhite: folds
MrPink: raises 110 to 210
MrBrown: folds
Pluribus: folds
MrBlue: calls 160
MrBlonde: folds
*** FLOP *** [7d 5h 9d]
MrBlue: checks
MrPink: checks
*** TURN *** [7d 5h 9d] [7c]
MrBlue: checks
MrPink: checks
*** RIVER *** [7d 5h 9d] [7c] [Qh]
MrBlue: bets 230
MrPink: folds
Uncalled bet (230) returned to MrBlue
MrBlue collected 520.0 from pot
*** SUMMARY ***
Total pot 520 | Rake 0
Board [7d 5h 9d 7c Qh]
"""

    converter = PokerStarsToPhhConverter()
    phh_output = converter.convert_string(example_hand)
    print(phh_output)