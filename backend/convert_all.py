"""
Batch convert all PokerStars hand history files to individual PHH files.

Usage: cd backend && python convert_all.py
"""
import os
import re
import shutil
from src.pokerstars_to_phh import PokerStarsToPhhConverter

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
INPUT_DIR = os.path.join(DATA_DIR, 'vitamintk-pluribus-pokerstars')
OUTPUT_DIR = os.path.join(DATA_DIR, 'hands')


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    converter = PokerStarsToPhhConverter()
    converted = 0
    skipped = 0

    for filename in sorted(os.listdir(INPUT_DIR)):
        if not filename.endswith('.txt'):
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

            try:
                phh_output = converter.convert_string(chunk)
                output_path = os.path.join(OUTPUT_DIR, f'{hand_id}.phh')
                with open(output_path, 'w') as f:
                    f.write(phh_output)
                converted += 1
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
