"""
Batch convert all PokerStars hand history files to individual PHH files.

Tracks running stacks per session so that each hand's starting_stack
reflects chips carried over from prior hands (the raw files always
show 10000 for every player, which is incorrect).

Usage: cd backend && python convert_all.py
"""
import os
import re
import shutil
from src.pokerstars_to_phh import PokerStarsToPhhConverter

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
INPUT_DIR = os.path.join(DATA_DIR, 'vitamintk-pluribus-pokerstars')
OUTPUT_DIR = os.path.join(DATA_DIR, 'hands')


def compute_net_changes(hand_text: str) -> dict[str, int]:
    """Compute net chip change per player from raw PokerStars hand text.

    Returns a dict of player_name -> net chips gained/lost.
    """
    # Collect player names
    players = []
    for line in hand_text.split('\n'):
        m = re.search(r'Seat \d+: (\w+) \(\d+ in chips\)', line)
        if m:
            players.append(m.group(1))

    # Track per-street bet totals and overall committed chips
    committed: dict[str, int] = {name: 0 for name in players}
    street_bets: dict[str, int] = {name: 0 for name in players}
    in_summary = False

    for line in hand_text.split('\n'):
        line = line.strip()
        if not line:
            continue

        if line.startswith('*** SUMMARY ***'):
            in_summary = True

        if in_summary:
            continue

        # Street transitions: finalize previous street bets
        if (line.startswith('*** FLOP ***') or line.startswith('*** TURN ***')
                or line.startswith('*** RIVER ***')):
            for name in street_bets:
                committed[name] += street_bets[name]
                street_bets[name] = 0
            continue

        # Small blind
        m = re.search(r'(\w+): posts small blind (\d+)', line)
        if m:
            street_bets[m.group(1)] = int(m.group(2))
            continue

        # Big blind
        m = re.search(r'(\w+): posts big blind (\d+)', line)
        if m:
            street_bets[m.group(1)] = int(m.group(2))
            continue

        # Call (incremental)
        m = re.search(r'(\w+): calls (\d+)', line)
        if m:
            street_bets[m.group(1)] += int(m.group(2))
            continue

        # Bet (new bet on the street)
        m = re.search(r'(\w+): bets (\d+)', line)
        if m:
            street_bets[m.group(1)] = int(m.group(2))
            continue

        # Raise (total for the street)
        m = re.search(r'(\w+): raises \d+ to (\d+)', line)
        if m:
            street_bets[m.group(1)] = int(m.group(2))
            continue

        # Uncalled bet returned
        m = re.search(r'Uncalled bet \((\d+)\) returned to (\w+)', line)
        if m:
            street_bets[m.group(2)] -= int(m.group(1))
            continue

    # Finalize last street
    for name in street_bets:
        committed[name] += street_bets[name]

    # Parse winner collections (before summary only)
    winnings: dict[str, int] = {name: 0 for name in players}
    in_summary = False
    for line in hand_text.split('\n'):
        line = line.strip()
        if line.startswith('*** SUMMARY ***'):
            break
        m = re.search(r'(\w+) collected (\d+)(?:\.0)? from pot', line)
        if m:
            winnings[m.group(1)] += int(m.group(2))

    return {name: winnings[name] - committed[name] for name in players}


def extract_session(hand_text: str) -> str:
    """Extract session name from the table line."""
    m = re.search(r"Table '([^']+)'", hand_text)
    return m.group(1) if m else ''


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    converter = PokerStarsToPhhConverter()
    converted = 0
    skipped = 0

    # Running stacks per session, keyed by player name
    session_stacks: dict[str, dict[str, int]] = {}

    seen_hand_ids: set[str] = set()

    for filename in sorted(os.listdir(INPUT_DIR)):
        if not filename.endswith('.txt') or not filename.startswith('pluribus_'):
            continue

        filepath = os.path.join(INPUT_DIR, filename)
        with open(filepath, 'r') as f:
            content = f.read()

        chunks = [c.strip() for c in content.split('\n\n')]

        for chunk in chunks:
            if not chunk or not chunk.startswith('PokerStars Hand'):
                skipped += 1
                continue

            # Extract hand ID from header
            match = re.search(r'Hand #(\d+):', chunk)
            if not match:
                skipped += 1
                continue

            hand_id = match.group(1)
            if hand_id in seen_hand_ids:
                skipped += 1
                continue
            seen_hand_ids.add(hand_id)

            try:
                # Parse the hand
                converter.parse_pokerstars_hand(chunk)

                # Override starting stacks from session running totals
                session = extract_session(chunk)
                stacks = session_stacks.get(session)
                if stacks:
                    for player in converter.players:
                        if player.name in stacks:
                            player.starting_stack = stacks[player.name]

                # Convert to PHH
                phh_output = converter.convert_to_phh()
                output_path = os.path.join(OUTPUT_DIR, f'{hand_id}.phh')
                with open(output_path, 'w') as f:
                    f.write(phh_output)
                converted += 1

                # Update running stacks for this session
                net = compute_net_changes(chunk)
                if stacks is None:
                    # First hand: initialize from parsed starting stacks
                    stacks = {p.name: p.starting_stack for p in converter.players}
                    session_stacks[session] = stacks
                for name, delta in net.items():
                    # Cap losses at the player's actual stack. The raw data
                    # records all stacks as 10000 each hand, so all-in amounts
                    # can exceed a player's real carried-over stack.
                    old = stacks.get(name, 10000)
                    stacks[name] = max(0, old + delta)

            except Exception as e:
                print(f"Error converting hand {hand_id} from {filename}: {e}")
                skipped += 1

    # Copy test.phh into hands/ for consistency
    test_phh = os.path.join(DATA_DIR, 'test.phh')
    if os.path.exists(test_phh):
        shutil.copy2(test_phh, os.path.join(OUTPUT_DIR, 'test.phh'))
        print("Copied test.phh into hands/")

    print(f"Converted: {converted}, Skipped: {skipped}")


if __name__ == '__main__':
    main()
