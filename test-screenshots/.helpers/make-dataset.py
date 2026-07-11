#!/usr/bin/env python3
"""Test veri setini (şimdiye göre zaman damgalarıyla) üret.

Kullanım: make-dataset.py <çıktı.json> [pro|free]
"""
import json
import sys
import time

now = int(time.time() * 1000)
DAY = 86_400_000

books = [
    {
        "id": "testbook1",
        "title": "Tutunamayanlar",
        "author": "Oğuz Atay",
        "pages": 724,
        "rating": 9.5,
        "status": "finished",
        "color": "#8b5a3c",
        "genre": "Roman",
        "readingTime": 7200,
        "review": "Selim'in sesi haftalardır kafamda; bu kitap bittiğinde bir arkadaşımı kaybetmiş gibi hissettim.",
        "quote": "Ben buradayım sevgili okuyucum, sen neredesin acaba?",
        "createdAt": now - 20 * DAY,
        "finishedAt": now - 2 * DAY,
    },
    {
        "id": "testbook2",
        "title": "Kürk Mantolu Madonna",
        "author": "Sabahattin Ali",
        "pages": 160,
        "rating": 0,
        "status": "reading",
        "color": "#1d9e75",
        "genre": "Roman",
        "createdAt": now - 5 * DAY,
    },
    {
        "id": "testbook3",
        "title": "İnce Memed",
        "author": "Yaşar Kemal",
        "pages": 436,
        "rating": 0,
        "status": "want",
        "color": "#d85a30",
        "genre": "Roman",
        "createdAt": now - 3 * DAY,
    },
]

sessions = [
    {"id": "ts1", "bookId": "testbook1", "duration": 1800, "date": now - 10 * DAY},
    {"id": "ts2", "bookId": "testbook1", "duration": 2400, "date": now - 6 * DAY},
    {"id": "ts3", "bookId": "testbook1", "duration": 3000, "date": now - 2 * DAY},
]

data = {
    "@ayrac_has_entered": "true",
    "@ayrac_user_name": "Arif",
    "@ayrac_silent_prompt_seen": "true",
    "@ayrac_rating_v2": "true",
    "@ayrac_author_norm_v1": "true",
    "@ayrac_is_pro": "true" if (len(sys.argv) < 3 or sys.argv[2] == "pro") else "false",
    "@ayrac_books": books,
    "@ayrac_sessions": sessions,
    "@ayrac_active_session": None,  # senaryolar gerektiğinde ekler
}

with open(sys.argv[1], "w") as f:
    json.dump(data, f, ensure_ascii=False)
print("yazıldı:", sys.argv[1])
