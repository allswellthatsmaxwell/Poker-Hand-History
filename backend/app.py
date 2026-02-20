from flask import Flask, jsonify, request
from flask_cors import CORS
from src.phh_reader import HandHistory
from src.hand_filter import filter_hands
import os

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000"])

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
HANDS_DIR = os.path.join(DATA_DIR, 'hands')

_hand_cache: dict | None = None


def get_hand_cache():
    global _hand_cache
    if _hand_cache is None:
        _hand_cache = {}
        for f in os.listdir(HANDS_DIR):
            if f.endswith('.phh'):
                hand_id = f[:-4]
                _hand_cache[hand_id] = HandHistory.from_file(os.path.join(HANDS_DIR, f))
    return _hand_cache


def card_to_dict(card_str: str) -> dict:
    return {"rank": card_str[0], "suit": card_str[1]}


def hand_to_json(hh: HandHistory) -> dict:
    return {
        "variant": hh.variant,
        "antes": hh.antes,
        "blinds": hh.blinds,
        "minBet": hh.min_bet,
        "players": [
            {
                "index": p.index,
                "name": p.name,
                "startingStack": p.starting_stack,
                "holeCards": [card_to_dict(c) for c in p.hole_cards] if p.hole_cards else None,
            }
            for p in hh.players
        ],
        "flopCards": [card_to_dict(c) for c in hh.flop_cards],
        "turnCards": [card_to_dict(c) for c in hh.turn_cards],
        "riverCards": [card_to_dict(c) for c in hh.river_cards],
        "board": [card_to_dict(c) for c in hh.board],
        "actions": {
            street: [
                {
                    "player": a["player"],
                    "action": a["action"],
                    **({"amount": a["amount"]} if "amount" in a else {}),
                }
                for a in actions
            ]
            for street, actions in hh.actions.items()
        },
        "winners": [
            {"player": w["player"], "amount": w["amount"]}
            for w in hh.winners
        ],
    }


@app.route("/api/hands")
def list_hands():
    hand_ids = sorted([
        f[:-4] for f in os.listdir(HANDS_DIR)
        if f.endswith('.phh')
    ])
    return jsonify(hand_ids)


@app.route("/api/hands/filter", methods=["POST"])
def filter_hands_endpoint():
    body = request.get_json(force=True)
    expression = body.get("expression", "")
    cache = get_hand_cache()
    hand_ids, error = filter_hands(expression, cache)
    if error:
        return jsonify({"error": error}), 400
    return jsonify({"hand_ids": hand_ids, "total": len(hand_ids)})


@app.route("/api/hands/<hand_id>")
def get_hand(hand_id):
    cache = get_hand_cache()
    hh = cache.get(hand_id)
    if hh is None:
        return jsonify({"error": "Hand not found"}), 404
    return jsonify(hand_to_json(hh))


if __name__ == "__main__":
    app.run(debug=True, port=5001)
