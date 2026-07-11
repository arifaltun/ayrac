#!/usr/bin/env python3
"""AsyncStorage manifest'ine anahtar yaz/sil (uygulama KAPALIYKEN çalıştır).

Kullanım:
  set-storage.py reset                 -> tüm @ayrac_* anahtarlarını sil
  set-storage.py merge <json-dosyası>  -> anahtarları birleştir (değer null ise sil)
"""
import json
import sys

MANIFEST = (
    "/Users/arifaltun/Library/Developer/CoreSimulator/Devices/"
    "66D6921C-3816-4CF2-9B2A-0CCF1FE28547/data/Containers/Data/Application/"
    "B6EE9040-9FD2-4563-9153-EB3F5067ACE0/Documents/ExponentExperienceData/"
    "@anonymous/ayrac-fefff95e-2ecf-4c87-8bea-b0e3165900e7/"
    "RCTAsyncLocalStorage/manifest.json"
)

with open(MANIFEST) as f:
    data = json.load(f)

cmd = sys.argv[1]
if cmd == "reset":
    data = {k: v for k, v in data.items() if not k.startswith("@ayrac")}
elif cmd == "merge":
    with open(sys.argv[2]) as f:
        patch = json.load(f)
    for k, v in patch.items():
        if v is None:
            data.pop(k, None)
        else:
            # AsyncStorage değerleri string saklar
            data[k] = v if isinstance(v, str) else json.dumps(v, ensure_ascii=False)
else:
    sys.exit(f"bilinmeyen komut: {cmd}")

with open(MANIFEST, "w") as f:
    json.dump(data, f, ensure_ascii=False)
print("ok:", sorted(k for k in data if k.startswith("@ayrac")))
