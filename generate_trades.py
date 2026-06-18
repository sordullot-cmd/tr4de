import csv
import random
from datetime import date, timedelta

START = date(2026, 2, 2)   # premier lundi de fevrier
END = date(2026, 6, 11)

ACTIFS = ["NQ", "MNQ"]

MISE = 500.0  # risque de base par trade (EUR)

# Multiplicateur (USD par point) par contrat — doit correspondre a
# getContractMultiplier() dans lib/csvParsers.ts. Sert a deriver des prix
# Entry/Exit qui se reconcilient exactement avec le PnL (quantite = 1).
MULTIPLIER = {"NQ": 20.0, "MNQ": 2.0}

# 4 profils differents : winrate cible, fourchette de RR sur les gains, et
# multiple de la mise sur les pertes. Le dernier ("perdant") est negatif :
# faible winrate + gains ecourtes + pertes laissees courir.
PROFILS = [
    {"fichier": "trades-exemple-gagnant.csv", "seed": 42, "winrate": 0.72,
     "rr": (2.0, 3.5), "perte": (1.0, 1.0)},
    {"fichier": "trades-exemple-solide.csv",  "seed": 7,  "winrate": 0.58,
     "rr": (1.5, 2.5), "perte": (1.0, 1.0)},
    {"fichier": "trades-exemple-neutre.csv",  "seed": 123, "winrate": 0.50,
     "rr": (1.2, 1.8), "perte": (1.0, 1.1)},
    {"fichier": "trades-exemple-perdant.csv", "seed": 99, "winrate": 0.42,
     "rr": (0.6, 1.2), "perte": (1.2, 1.6)},
]

span = (END - START).days or 1


def base_price(date_iso, idx):
    """Prix 'Nasdaq' qui derive sur la periode + petit jitter deterministe."""
    y, m, dd = map(int, date_iso.split("-"))
    f = (date(y, m, dd) - START).days / span
    jitter = ((idx * 37) % 200) - 100          # -100 .. +99
    cents = ((idx * 13) % 100) / 100.0
    return round(21000 + f * 2800 + jitter + cents, 2)


def genere(profil):
    rng = random.Random(profil["seed"])

    # Repartition des jours/trades (lun-ven, 1 a 4 trades/jour)
    jours = []
    day = START
    while day <= END:
        if day.weekday() < 5:
            n = rng.randint(1, 4)
            for _ in range(n):
                jours.append(day)
        day += timedelta(days=1)

    n_total = len(jours)
    n_wins = round(n_total * profil["winrate"])
    resultats = ["WIN"] * n_wins + ["LOSS"] * (n_total - n_wins)
    rng.shuffle(resultats)

    trades = []
    for idx, d in enumerate(jours):
        actif = rng.choice(ACTIFS)
        direction = rng.choice(["Long", "Short"])
        heure = "{:02d}:{:02d}".format(rng.randint(8, 20), rng.choice([0, 15, 30, 45]))
        if resultats[idx] == "WIN":
            rr = rng.uniform(*profil["rr"])
            pnl = round(MISE * rr, 2)
        else:
            mult_perte = rng.uniform(*profil["perte"])
            pnl = round(-MISE * mult_perte, 2)
        trades.append({"date": d.isoformat(), "heure": heure,
                       "actif": actif, "direction": direction, "pnl": pnl})

    trades.sort(key=lambda x: (x["date"], x["heure"]))

    # Lignes au format importable du site (parser generique) :
    # Date,Symbol,Direction,Entry,Exit,PnL (separateur virgule).
    #   Long  : exit = entry + pnl / mult
    #   Short : exit = entry - pnl / mult
    out_rows = []
    for idx, t in enumerate(trades):
        mult = MULTIPLIER.get(t["actif"], 1.0)
        entry = base_price(t["date"], idx)
        move = t["pnl"] / mult
        exit_price = round(entry + move, 2) if t["direction"] == "Long" else round(entry - move, 2)
        out_rows.append([t["date"], t["actif"], t["direction"],
                         "{:.2f}".format(entry), "{:.2f}".format(exit_price),
                         "{:.2f}".format(t["pnl"])])

    with open(profil["fichier"], "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)  # separateur virgule = format du site
        w.writerow(["Date", "Symbol", "Direction", "Entry", "Exit", "PnL"])
        w.writerows(out_rows)

    wins = sum(1 for t in trades if t["pnl"] > 0)
    total_pnl = round(sum(t["pnl"] for t in trades), 2)
    print("{:32s} | {:3d} trades | WR {:4.1f}% | PnL {:+10.2f}".format(
        profil["fichier"], len(trades), 100 * wins / len(trades), total_pnl))


for p in PROFILS:
    genere(p)
