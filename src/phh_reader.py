"""
Simple PHH (Poker Hand History) Reader

A lightweight class to read PHH files and provide easy access to hand information.
"""

import tomllib
from typing import List, Dict, Optional
from dataclasses import dataclass


@dataclass
class Player:
    """Represents a player in the hand"""
    index: int
    name: str
    starting_stack: int
    hole_cards: Optional[List[str]] = None


@dataclass
class Action:
    """Represents a single action"""
    player: int
    action: str
    amount: Optional[int] = None

    def __str__(self):
        if self.amount is not None:
            return f"{self.action} {self.amount}"
        return self.action


class HandHistory:
    """
    Simple class to read and inspect poker hand histories in PHH format.

    Usage:
        hh = HandHistory.from_file('hand.phh')
        print(f"Flop: {hh.flop_cards}")
        print(f"Player 0 hole cards: {hh.get_hole_cards(0)}")

        for action in hh.get_actions('river'):
            print(f"Player {action.player}: {action}")
    """

    def __init__(self, data: dict):
        """Initialize from parsed TOML data"""
        self.data = data

        # Basic game info
        self.variant = data.get('variant', 'NT')
        self.antes = data.get('antes', [])
        self.blinds = data.get('blinds_or_straddles', [])
        self.min_bet = data.get('min_bet', 0)
        self.starting_stacks = data.get('starting_stacks', [])

        # Board cards (now at root level)
        self.flop_cards = data.get('flop_cards', [])
        self.turn_cards = data.get('turn_cards', [])
        self.river_cards = data.get('river_cards', [])
        self.board = data.get('board', [])

        # Players
        self.players: List[Player] = []
        players_data = data.get('players', {})
        for i in range(len(players_data)):
            player_data = players_data.get(str(i), {})
            # Hole cards are now in the player section
            hole_cards = player_data.get('hole_cards', None)
            self.players.append(Player(
                index=i,
                name=player_data.get('name', f'Player{i}'),
                starting_stack=player_data.get('starting_stack', 0),
                hole_cards=hole_cards
            ))

        # Actions
        self.actions = data.get('actions', {})

    @classmethod
    def from_file(cls, filepath: str) -> 'HandHistory':
        """Load a hand history from a PHH file"""
        with open(filepath, 'rb') as f:
            data = tomllib.load(f)
        return cls(data)

    @classmethod
    def from_string(cls, phh_string: str) -> 'HandHistory':
        """Load a hand history from a PHH string"""
        data = tomllib.loads(phh_string)
        return cls(data)

    def get_player(self, index: int) -> Optional[Player]:
        """Get player by index"""
        if 0 <= index < len(self.players):
            return self.players[index]
        return None

    def get_player_by_name(self, name: str) -> Optional[Player]:
        """Get player by name"""
        for player in self.players:
            if player.name == name:
                return player
        return None

    def get_hole_cards(self, player_index: int) -> Optional[List[str]]:
        """Get hole cards for a specific player"""
        player = self.get_player(player_index)
        return player.hole_cards if player else None

    def get_actions(self, street: str) -> List[Action]:
        """
        Get actions for a specific street.

        Args:
            street: 'preflop', 'flop', 'turn', or 'river'

        Returns:
            List of Action objects
        """
        actions_data = self.actions.get(street, [])
        return [Action(**action_dict) for action_dict in actions_data]

    def get_all_actions(self) -> Dict[str, List[Action]]:
        """Get all actions organized by street"""
        return {
            street: self.get_actions(street)
            for street in ['preflop', 'flop', 'turn', 'river']
            if street in self.actions
        }

    def __str__(self) -> str:
        """Pretty print the hand history"""
        lines = []
        lines.append(f"=== Hand History ===")
        lines.append(f"Variant: {self.variant}")
        lines.append(f"Blinds: {self.blinds}")
        lines.append("")

        lines.append("Players:")
        for player in self.players:
            cards = f" [{', '.join(player.hole_cards)}]" if player.hole_cards else ""
            lines.append(f"  {player.index}: {player.name} (${player.starting_stack}){cards}")
        lines.append("")

        if self.board:
            lines.append(f"Board: {' '.join(self.board)}")
            if self.flop_cards:
                lines.append(f"  Flop: {' '.join(self.flop_cards)}")
            if self.turn_cards:
                lines.append(f"  Turn: {' '.join(self.turn_cards)}")
            if self.river_cards:
                lines.append(f"  River: {' '.join(self.river_cards)}")
            lines.append("")

        for street in ['preflop', 'flop', 'turn', 'river']:
            actions = self.get_actions(street)
            if actions:
                lines.append(f"{street.upper()}:")
                for action in actions:
                    player = self.get_player(action.player)
                    player_name = player.name if player else f"Player{action.player}"
                    lines.append(f"  {player_name}: {action}")
                lines.append("")

        return '\n'.join(lines)

    def summary(self) -> str:
        """Quick summary of the hand"""
        num_players = len(self.players)
        total_pot = sum(self.blinds) + sum(self.antes)
        player_names = ', '.join([p.name for p in self.players])

        return (f"{num_players}-handed {self.variant} hand\n"
                f"Players: {player_names}\n"
                f"Starting pot: ${total_pot}")


# Example usage
if __name__ == "__main__":
    # Load a hand
    hh = HandHistory.from_file('example_hand.phh')

    # Print full hand history
    print(hh)

    # Access specific information
    print("\n=== Specific Queries ===")
    print(f"Flop: {hh.flop_cards}")
    print(f"Turn: {hh.turn_cards}")
    print(f"River: {hh.river_cards}")
    print(f"Complete board: {hh.board}")

    print(f"\nPlayer 0 hole cards: {hh.get_hole_cards(0)}")
    print(f"Player 3 hole cards: {hh.get_hole_cards(3)}")

    print("\nRiver actions:")
    for action in hh.get_actions('river'):
        player = hh.get_player(action.player)
        print(f"  {player.name}: {action}")