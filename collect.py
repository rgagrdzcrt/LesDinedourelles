"""Récupère les annonces de la boutique eBay et les enregistre pour la vitrine.

Sources : API Browse d'eBay (jeton d'application, lecture seule des annonces
publiques). Sorties :
  - products.json      : catalogue lu par le site ;
  - shopify_products.csv : même catalogue au format d'import Shopify.

Identifiants attendus dans l'environnement (secrets GitHub) :
  EBAY_CLIENT_ID, EBAY_CLIENT_SECRET
"""

import base64
import csv
import json
import os
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CONFIG = json.loads((ROOT / "config.json").read_text(encoding="utf-8"))
OUT = ROOT / "products.json"
SHOPIFY_OUT = ROOT / "shopify_products.csv"

TOKEN_URL = "https://api.ebay.com/identity/v1/oauth2/token"
SEARCH_URL = "https://api.ebay.com/buy/browse/v1/item_summary/search"
SCOPE = "https://api.ebay.com/oauth/api_scope"
PAGE_SIZE = 200

# L'API exige une catégorie (ou un mot-clé) : on parcourt les grandes catégories
# eBay en filtrant sur le vendeur. Une catégorie vide ne coûte qu'une requête.
TOP_CATEGORIES = {
    "20081": "Antiquités",
    "550": "Art",
    "1": "Objets de collection",
    "870": "Poterie et verre",
    "220": "Jouets et modélisme",
    "281": "Bijoux et montres",
    "11700": "Maison et jardin",
    "267": "Livres",
    "619": "Instruments de musique",
    "260": "Timbres",
    "11116": "Monnaies",
    "237": "Poupées et ours",
    "45100": "Souvenirs de divertissement",
    "64482": "Souvenirs sportifs",
    "11450": "Vêtements et accessoires",
    "12576": "Commerce et industrie",
    "14339": "Loisirs créatifs",
    "625": "Photo",
    "293": "Électronique",
    "888": "Sport",
}


def http(url, data=None, headers=None, retries=3):
    for attempt in range(retries):
        req = urllib.request.Request(url, data=data, headers=headers or {})
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as err:
            body = err.read().decode("utf-8", "replace")[:300]
            if err.code in (429, 500, 502, 503, 504) and attempt < retries - 1:
                time.sleep(5 * (attempt + 1))
                continue
            raise RuntimeError(f"HTTP {err.code} sur {url.split('?')[0]} : {body}") from None
        except urllib.error.URLError:
            if attempt < retries - 1:
                time.sleep(5)
                continue
            raise


def get_token(client_id, client_secret):
    basic = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
    data = urllib.parse.urlencode({"grant_type": "client_credentials", "scope": SCOPE}).encode()
    resp = http(TOKEN_URL, data=data, headers={
        "Authorization": f"Basic {basic}",
        "Content-Type": "application/x-www-form-urlencoded",
    })
    return resp["access_token"]


def big_image(url):
    """Les miniatures eBay (s-l225) existent en grand format (s-l1600)."""
    return re.sub(r"/s-l\d+\.", "/s-l1600.", url or "")


def fetch_category(token, category_id):
    items, offset = [], 0
    while True:
        params = urllib.parse.urlencode({
            "category_ids": category_id,
            "filter": f"sellers:{{{CONFIG['seller']}}}",
            "limit": PAGE_SIZE,
            "offset": offset,
        })
        resp = http(f"{SEARCH_URL}?{params}", headers={
            "Authorization": f"Bearer {token}",
            "X-EBAY-C-MARKETPLACE-ID": CONFIG.get("marketplace", "EBAY_US"),
            "Accept-Language": "fr-FR",
        })
        page = resp.get("itemSummaries") or []
        items.extend(page)
        offset += PAGE_SIZE
        if not page or offset >= int(resp.get("total") or 0):
            return items


def to_product(raw, category_label):
    price = raw.get("price") or {}
    location = raw.get("itemLocation") or {}
    images = [big_image((raw.get("image") or {}).get("imageUrl"))]
    images += [big_image(i.get("imageUrl")) for i in raw.get("additionalImages") or []]
    return {
        "id": raw.get("legacyItemId") or raw.get("itemId"),
        "title": (raw.get("title") or "").strip(),
        "price": float(price["value"]) if price.get("value") else None,
        "currency": price.get("currency") or "",
        "condition": raw.get("condition") or "",
        "category": category_label,
        "subcategory": ((raw.get("categories") or [{}])[0]).get("categoryName", ""),
        "images": [i for i in images if i],
        "url": raw.get("itemWebUrl") or "",
        "location": ", ".join(x for x in (location.get("city"), location.get("country")) if x),
        "listed": raw.get("itemCreationDate") or "",
    }


def slug(text):
    text = unicodedata.normalize("NFD", text.lower())
    text = "".join(c for c in text if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", "-", text).strip("-")[:80]


def write_shopify(products):
    """Format d'import produits de Shopify : une ligne par image, la première
    porte les informations de l'article."""
    cols = ["Handle", "Title", "Body (HTML)", "Vendor", "Type", "Tags", "Published",
            "Variant Price", "Variant Inventory Qty", "Variant Inventory Policy",
            "Variant Requires Shipping", "Image Src", "Image Position", "Status"]
    tmp = SHOPIFY_OUT.with_suffix(".tmp")
    with tmp.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        for p in products:
            handle = f"{slug(p['title'])}-{p['id']}"
            for pos, img in enumerate(p["images"] or [""], start=1):
                row = {"Handle": handle, "Image Src": img, "Image Position": pos if img else ""}
                if pos == 1:
                    row.update({
                        "Title": p["title"],
                        "Body (HTML)": f"<p>{p['title']}</p><p>État : {p['condition']}</p>",
                        "Vendor": CONFIG["shopName"],
                        "Type": p["category"],
                        "Tags": ", ".join(t for t in (p["category"], p["subcategory"]) if t),
                        "Published": "TRUE",
                        "Variant Price": f"{p['price']:.2f}" if p["price"] is not None else "",
                        "Variant Inventory Qty": 1,
                        "Variant Inventory Policy": "deny",
                        "Variant Requires Shipping": "TRUE",
                        "Status": "active",
                    })
                w.writerow(row)
    tmp.replace(SHOPIFY_OUT)


def main():
    client_id = os.environ.get("EBAY_CLIENT_ID", "").strip()
    client_secret = os.environ.get("EBAY_CLIENT_SECRET", "").strip()
    if not client_id or not client_secret:
        print("Identifiants eBay absents : catalogue inchangé.")
        return 0

    token = get_token(client_id, client_secret)
    found = {}
    for cat_id, label in TOP_CATEGORIES.items():
        try:
            for raw in fetch_category(token, cat_id):
                product = to_product(raw, label)
                found.setdefault(product["id"], product)
        except RuntimeError as err:
            print(f"Catégorie {label} ignorée : {err}")
        time.sleep(.3)

    previous = []
    if OUT.exists():
        previous = json.loads(OUT.read_text(encoding="utf-8")).get("items", [])
    # Sécurité : une réponse vide (panne, jeton refusé) n'efface jamais le catalogue.
    if not found and previous and not all(p.get("example") for p in previous):
        print("Aucune annonce reçue : catalogue précédent conservé.")
        return 1

    products = sorted(found.values(), key=lambda p: p.get("listed") or "", reverse=True)
    data = {
        "shop": CONFIG["shopName"],
        "seller": CONFIG["seller"],
        "storeUrl": CONFIG["storeUrl"],
        "updated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "items": products,
    }
    tmp = OUT.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    tmp.replace(OUT)
    write_shopify(products)
    print(f"{len(products)} annonces enregistrées.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
