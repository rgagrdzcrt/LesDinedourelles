"""Récupère les annonces de la boutique eBay et les enregistre pour la vitrine.

Sources : API Browse d'eBay (jeton d'application, lecture seule des annonces
publiques). Sorties :
  - products.json      : catalogue lu par le site ;
  - shopify_products.csv : même catalogue au format d'import Shopify.

Identifiants attendus dans l'environnement (secrets GitHub) :
  EBAY_CLIENT_ID, EBAY_CLIENT_SECRET
  DEEPL_API_KEY (facultatif) : titres et descriptions traduits en anglais.
"""

import base64
import csv
import gzip
import hashlib
import html
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

import categories
import pages

ROOT = Path(__file__).resolve().parent
CONFIG = json.loads((ROOT / "config.json").read_text(encoding="utf-8"))
OUT = ROOT / "products.json"
SHOPIFY_OUT = ROOT / "shopify_products.csv"
SOLD = ROOT / "sold.json"

TOKEN_URL = "https://api.ebay.com/identity/v1/oauth2/token"
SEARCH_URL = "https://api.ebay.com/buy/browse/v1/item_summary/search"
SCOPE = "https://api.ebay.com/oauth/api_scope"
PAGE_SIZE = 200
MAX_DETAILS_PER_RUN = 250  # largement sous le quota quotidien de l'API (5 000 appels)

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


def http(url, data=None, headers=None, retries=3, timeout=30):
    for attempt in range(retries):
        req = urllib.request.Request(url, data=data, headers=headers or {})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                body = resp.read()
                if resp.headers.get("Content-Encoding") == "gzip":
                    body = gzip.decompress(body)
                return json.loads(body.decode("utf-8"))
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


TAXONOMY_URL = "https://api.ebay.com/commerce/taxonomy/v1"


def category_tree(token):
    """Arborescence des catégories du site eBay choisi (eBay France n'a pas les
    mêmes numéros qu'eBay US). Renvoie les grandes catégories et, pour chaque
    catégorie, son chemin depuis la racine."""
    marketplace = CONFIG.get("marketplace", "EBAY_US")
    auth = {"Authorization": f"Bearer {token}"}
    tree_id = http(f"{TAXONOMY_URL}/get_default_category_tree_id?marketplace_id={marketplace}", headers=auth)["categoryTreeId"]
    tree = http(f"{TAXONOMY_URL}/category_tree/{tree_id}", headers={**auth, "Accept-Encoding": "gzip"}, timeout=180)
    root = tree["rootCategoryNode"]
    roots = {n["category"]["categoryId"]: n["category"]["categoryName"] for n in root.get("childCategoryTreeNodes") or []}
    paths, stack = {}, [(n, []) for n in root.get("childCategoryTreeNodes") or []]
    while stack:
        node, parent = stack.pop()
        path = parent + [node["category"]["categoryName"]]
        paths[node["category"]["categoryId"]] = path
        stack.extend((child, path) for child in node.get("childCategoryTreeNodes") or [])
    return roots, paths


def our_category(path, fallback):
    """Rubrique de la vitrine à partir du chemin de catégorie eBay."""
    joined = " ".join(path or [fallback]).lower()
    if re.search(r"c[ée]ramique|fa[ïi]ence|porcelaine|poterie|verre|cristal|gr[èe]s", joined):
        return "Poterie et verre"
    if "collection" in joined and not joined.startswith("art"):
        return "Objets de collection"
    if joined.startswith("art"):
        return "Art"
    if "jouet" in joined or "modélisme" in joined:
        return "Jouets et modélisme"
    return (path or [fallback])[0]


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


def to_product(raw, category_label, paths=None):
    price = raw.get("price") or {}
    leaf = (raw.get("categories") or [{}])[0]
    if paths is not None:
        category_label = our_category(paths.get(leaf.get("categoryId")), category_label)
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
        "subcategory": leaf.get("categoryName", ""),
        "images": [i for i in images if i],
        "url": raw.get("itemWebUrl") or "",
        "location": ", ".join(x for x in (location.get("city"), location.get("country")) if x),
        "listed": raw.get("itemCreationDate") or "",
    }


ITEM_URL = "https://api.ebay.com/buy/browse/v1/item/get_item_by_legacy_id"


def plain_text(raw_html, limit=700):
    """Description eBay (HTML) réduite à un paragraphe lisible."""
    text = re.sub(r"(?is)<(script|style)[^>]*>.*?</\1>", " ", raw_html or "")
    text = re.sub(r"(?s)<[^>]+>", " ", text)
    text = html.unescape(re.sub(r"\s+", " ", text)).strip()
    return text if len(text) <= limit else text[:limit].rsplit(" ", 1)[0] + "…"


def fetch_details(token, legacy_id):
    """Caractéristiques (origine, matière, époque…) et description d'une annonce."""
    params = urllib.parse.urlencode({"legacy_item_id": legacy_id})
    resp = http(f"{ITEM_URL}?{params}", headers={
        "Authorization": f"Bearer {token}",
        "X-EBAY-C-MARKETPLACE-ID": CONFIG.get("marketplace", "EBAY_US"),
        "Accept-Language": "fr-FR",
    })
    aspects = [[a.get("name", ""), a.get("value", "")] for a in resp.get("localizedAspects") or [] if a.get("value")]
    return {
        "listed": resp.get("itemCreationDate") or "",
        "aspects": aspects[:12],
        "description": plain_text(resp.get("shortDescription") or resp.get("description") or ""),
    }


DEEPL_BATCH = 50  # nombre maximal de textes par requête DeepL


def deepl(texts, key):
    """Traduit une liste de textes du français vers l'anglais (API DeepL)."""
    host = "api-free.deepl.com" if key.endswith(":fx") else "api.deepl.com"
    out = []
    for i in range(0, len(texts), DEEPL_BATCH):
        body = json.dumps({"text": texts[i:i + DEEPL_BATCH], "source_lang": "FR", "target_lang": "EN-US"}).encode()
        resp = http(f"https://{host}/v2/translate", data=body, headers={
            "Authorization": f"DeepL-Auth-Key {key}",
            "Content-Type": "application/json",
        })
        out += [t["text"] for t in resp["translations"]]
    return out


def source_hash(p):
    return hashlib.sha1(f"{p.get('title', '')}\n{p.get('description', '')}".encode()).hexdigest()[:12]


def add_english(products, previous, key):
    """Version anglaise des titres et descriptions. Une traduction est reprise
    tant que le texte français n'a pas changé : seules les nouveautés coûtent."""
    old = {str(p.get("id")): p for p in previous}
    todo = []
    for p in products:
        src, o = source_hash(p), old.get(str(p["id"])) or {}
        if o.get("title_en") and o.get("tr_src") == src:
            p["title_en"], p["description_en"], p["tr_src"] = o["title_en"], o.get("description_en", ""), src
        else:
            todo.append(p)
    if not todo:
        return
    if not key:
        print(f"Clé DeepL absente : {len(todo)} annonce(s) sans version anglaise.")
        return
    try:
        titles = deepl([p["title"] for p in todo], key)
        with_desc = [p for p in todo if p.get("description")]
        descs = deepl([p["description"] for p in with_desc], key)
    except (RuntimeError, KeyError, urllib.error.URLError) as err:
        print(f"Traduction indisponible : {err}")
        return
    for p, t in zip(todo, titles):
        p["title_en"], p["description_en"], p["tr_src"] = t, "", source_hash(p)
    for p, d in zip(with_desc, descs):
        p["description_en"] = d
    print(f"{len(todo)} annonce(s) traduite(s) en anglais.")


CORRECTIONS = ROOT / "corrections.json"


def fix_terms(products):
    """Contresens connus de DeepL sur le vocabulaire de brocante (corrections.json)."""
    if not CORRECTIONS.exists():
        return
    rules = json.loads(CORRECTIONS.read_text(encoding="utf-8")).get("termes", [])
    for p in products:
        for field, src in (("title_en", "title"), ("description_en", "description")):
            text, fr = p.get(field) or "", (p.get(src) or "").lower()
            for r in rules:
                if r["fr"] in fr:
                    text = re.sub(re.escape(r["faux"]), lambda m: r["en"] if m.group(0).islower() else r["en"].title() if field == "title_en" else r["en"].capitalize(), text, flags=re.I)
            if text:
                p[field] = text


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


def record_sold(before, found, today, partial):
    """Objets présents à la collecte précédente et absents maintenant : vendus,
    ou annonce retirée (l'API ne fait pas la différence). Ajoutés à sold.json."""
    gone = [p for pid, p in before.items() if pid not in {str(k) for k in found}]
    # Prudence : une collecte incomplète ou une chute brutale ne sont pas des ventes.
    if partial or (before and len(gone) > max(10, len(before) * .3)):
        print(f"{len(gone)} objets absents mais collecte douteuse : ventes non enregistrées.")
        return
    sold = json.loads(SOLD.read_text(encoding="utf-8")) if SOLD.exists() else []
    known = {str(s["id"]) for s in sold}
    for p in gone:
        if str(p["id"]) in known:
            continue
        first = p.get("firstSeen") or today
        try:
            days = (datetime.fromisoformat(today) - datetime.fromisoformat(first[:10])).days
        except ValueError:
            days = None
        sold.append({
            "id": p["id"], "title": p.get("title"), "price": p.get("price"), "currency": p.get("currency"),
            "category": p.get("category"), "subcategory": p.get("subcategory"),
            "cat": p.get("cat"), "sub": p.get("sub"),
            "image": (p.get("images") or [""])[0], "firstSeen": first, "goneOn": today, "days": days,
        })
    SOLD.write_text(json.dumps(sold, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(gone)} objet(s) sorti(s) du catalogue depuis la dernière collecte.")


def main():
    client_id = os.environ.get("EBAY_CLIENT_ID", "").strip()
    client_secret = os.environ.get("EBAY_CLIENT_SECRET", "").strip()
    if not client_id or not client_secret:
        print("Identifiants eBay absents : catalogue inchangé.")
        return 0

    token = get_token(client_id, client_secret)
    if CONFIG.get("marketplace", "EBAY_US") == "EBAY_US":
        roots, paths = TOP_CATEGORIES, None
    else:
        roots, paths = category_tree(token)
        print(f"{len(roots)} grandes catégories sur {CONFIG['marketplace']}.")
    found = {}
    partial = False
    for cat_id, label in roots.items():
        try:
            for raw in fetch_category(token, cat_id):
                product = to_product(raw, label, paths)
                found.setdefault(product["id"], product)
        except RuntimeError as err:
            partial = True
            print(f"Catégorie {label} ignorée : {err}")
        time.sleep(.3)

    previous_data = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else {}
    previous = previous_data.get("items", [])
    # Sécurité : une réponse vide (panne, jeton refusé) n'efface jamais le catalogue.
    if not found and previous and not all(p.get("example") for p in previous):
        print("Aucune annonce reçue : catalogue précédent conservé.")
        return 1

    real = [p for p in previous if not p.get("example")]
    if len(real) >= 20 and len(found) < len(real) * .7:
        print(f"Seulement {len(found)} annonces contre {len(real)} : catalogue précédent conservé.")
        return 1

    today = datetime.now(timezone.utc).date().isoformat()
    before = {str(p.get("id")): p for p in previous if not p.get("example")}
    for p in found.values():
        old = before.get(str(p["id"]))
        p["firstSeen"] = (old or {}).get("firstSeen") or today  # corrigée plus bas par la date eBay
    record_sold(before, found, today, partial)

    # Détails : repris du catalogue précédent, demandés à eBay pour les nouvelles annonces seulement.
    known = {str(p.get("id")): p for p in previous if "aspects" in p and p.get("listed")}
    asked = 0
    for p in found.values():
        old = known.get(str(p["id"]))
        if old:
            p["aspects"], p["description"], p["listed"] = old.get("aspects", []), old.get("description", ""), old["listed"]
        elif asked < MAX_DETAILS_PER_RUN:
            try:
                p.update(fetch_details(token, p["id"]))
            except RuntimeError as err:
                print(f"Détails indisponibles pour {p['id']} : {err}")
            asked += 1
            time.sleep(.2)
    print(f"Détails demandés pour {asked} nouvelle(s) annonce(s).")
    for p in found.values():
        if p.get("listed") and p["listed"][:10] < p["firstSeen"]:
            p["firstSeen"] = p["listed"][:10]

    products = sorted(found.values(), key=lambda p: p.get("listed") or "", reverse=True)
    deepl_key = os.environ.get("DEEPL_API_KEY", "").strip()
    add_english(products, previous, deepl_key)
    fix_terms(products)
    categories.apply(products)  # catégorie et sous-catégorie du site (categories.py)
    cat_en = previous_data.get("cat_en", {})
    missing = sorted({p.get(k) for p in products for k in ("category", "subcategory") if p.get(k)} - cat_en.keys())
    if missing and deepl_key:
        try:
            cat_en.update(zip(missing, deepl(missing, deepl_key)))
        except (RuntimeError, KeyError, urllib.error.URLError) as err:
            print(f"Catégories non traduites : {err}")
    data = {
        "shop": CONFIG["shopName"],
        "seller": CONFIG["seller"],
        "storeUrl": CONFIG["storeUrl"],
        "updated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "cat_en": cat_en,
        "items": products,
    }
    pages.build(data)  # une page par objet + sitemap.xml (ajoute le chemin "page" à chaque objet)
    tmp = OUT.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    tmp.replace(OUT)
    write_shopify(products)
    print(f"{len(products)} annonces enregistrées.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
