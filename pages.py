"""Génère une page HTML par objet, plus le plan du site (sitemap.xml), pour
que Google puisse référencer chaque pièce séparément.

Lancement manuel (sans appel à eBay) : python pages.py
"""

import html
import json
import re
import shutil
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PAGES_DIR = ROOT / "objet"
SITE = "https://lesdinedourelles.com/"
SHOP = "Les Dinedourelles"
CONFIG = json.loads((ROOT / "config.json").read_text(encoding="utf-8"))
GC = CONFIG.get("goatcounter", "")


def slug(text):
    text = unicodedata.normalize("NFD", (text or "").lower())
    text = "".join(c for c in text if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", "-", text).strip("-")[:70] or "objet"


def page_path(p):
    return f"objet/{slug(p['title'])}-{p['id']}.html"


def money(p):
    if p.get("price") is None:
        return "Prix sur eBay"
    symbol = {"USD": "$US", "EUR": "€", "GBP": "£"}.get(p.get("currency"), p.get("currency", ""))
    return f"{p['price']:,.2f}".replace(",", " ").replace(".", ",") + f" {symbol}"


def summary(p):
    """Description courte pour Google : détails eBay, sinon texte générique."""
    aspects = ", ".join(f"{k} : {v}" for k, v in (p.get("aspects") or [])[:4])
    base = p.get("description") or ""
    parts = [p["title"] + "."]
    if aspects:
        parts.append(aspects + ".")
    if base:
        parts.append(base)
    parts.append("Pièce unique de la brocante Les Dinedourelles, Pézenas. Achat sécurisé sur eBay.")
    text = " ".join(parts)
    return text if len(text) <= 300 else text[:297].rsplit(" ", 1)[0] + "…"


def e(s):
    return html.escape(str(s or ""), quote=True)


def render(p, related):
    url = SITE + page_path(p)
    images = p.get("images") or []
    desc = summary(p)
    ld = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": p["title"],
        "image": images[:6],
        "description": desc,
        "sku": str(p["id"]),
        "category": " > ".join(x for x in (p.get("category"), p.get("subcategory")) if x),
        "brand": {"@type": "Brand", "name": SHOP},
        "offers": {
            "@type": "Offer",
            "url": p.get("url") or url,
            "priceCurrency": p.get("currency") or "USD",
            "price": f"{p['price']:.2f}" if p.get("price") is not None else None,
            "availability": "https://schema.org/InStock",
            "itemCondition": "https://schema.org/UsedCondition",
            "seller": {"@type": "Organization", "name": SHOP},
        },
    }
    if ld["offers"]["price"] is None:
        del ld["offers"]["price"]
    specs = [("Catégorie", p.get("category")), ("Détail", p.get("subcategory")), ("État", p.get("condition"))]
    specs += [(k, v) for k, v in (p.get("aspects") or [])]
    specs += [("Expédition", "Depuis l'Aude, France"), ("Référence eBay", p["id"])]
    seen, rows = set(), []
    for k, v in specs:
        if v and k not in seen:
            seen.add(k)
            rows.append(f"<dt>{e(k)}</dt><dd>{e(v)}</dd>")
    thumbs = "".join(
        f'<button type="button" data-src="{e(src)}" aria-label="Photo {i + 1}"><img src="{e(src)}" alt="" loading="lazy" referrerpolicy="no-referrer"></button>'
        for i, src in enumerate(images)
    ) if len(images) > 1 else ""
    rel = "".join(
        f'<a class="card" href="../{e(page_path(r))}"><div class="ph"><img src="{e(r["images"][0])}" alt="{e(r["title"])}" loading="lazy" referrerpolicy="no-referrer"></div>'
        f'<h3>{e(r["title"])}</h3><div class="sub">{e(r.get("subcategory") or r.get("category"))}</div><div class="pr">{e(money(r))}</div></a>'
        for r in related
    )
    long_desc = f'<p class="obj-desc">{e(p["description"])}</p>' if p.get("description") else ""
    return f"""<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{e(p['title'])} · {e(money(p))} · {SHOP}</title>
<meta name="description" content="{e(desc)}">
<link rel="canonical" href="{e(url)}">
<link rel="icon" href="../favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="../apple-touch-icon.png">
<meta property="og:type" content="product">
<meta property="og:site_name" content="{SHOP}">
<meta property="og:title" content="{e(p['title'])}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{e(url)}">
<meta property="og:image" content="{e(images[0] if images else SITE + 'og-image.png')}">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Instrument+Sans:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="../style.css">
{f'<script data-goatcounter="https://{GC}.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>' if GC else ''}
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
</head>
<body class="obj-page">
<div class="promo">Nouveautés chaque semaine · <b>Expédition soignée depuis l'Aude</b> · Paiement sécurisé par eBay</div>
<header class="site-head">
  <div class="wrap top">
    <a class="logo" href="../">Les <i>Dinedourelles</i></a>
    <span></span>
    <div class="icons"><a class="icon-link" href="../#collection">← La collection</a></div>
  </div>
</header>
<main class="wrap obj">
  <nav class="crumbs" aria-label="Fil d'Ariane"><a href="../">Accueil</a> / <a href="../#collection">{e(p.get('category'))}</a> / <span>{e(p.get('subcategory'))}</span></nav>
  <div class="obj-grid">
    <div class="gallery">
      <div class="stage" id="stage">{f'<img src="{e(images[0])}" alt="{e(p["title"])}" referrerpolicy="no-referrer">' if images else ''}</div>
      <div class="thumbs" id="thumbs">{thumbs}</div>
    </div>
    <div class="info">
      <p class="kicker">{e(p.get('subcategory') or p.get('category'))}</p>
      <h1>{e(p['title'])}</h1>
      <p class="sheet-price">{e(money(p))}</p>
      <a class="cta wide" href="{e(p.get('url'))}" target="_blank" rel="noopener" data-goatcounter-click="ebay/{e(p['id'])}" data-goatcounter-title="Clic eBay : {e(p['title'])}">Acheter sur eBay ↗</a>
      <dl class="specs">{''.join(rows)}</dl>
      {long_desc}
      <p class="note">Pièce unique. Commande, paiement et livraison se font sur eBay.</p>
    </div>
  </div>
  {f'<section class="block"><div class="head"><h2>Dans la même catégorie</h2></div><div class="products">{rel}</div></section>' if rel else ''}
</main>
<footer class="site-foot"><div class="wrap"><div class="legal"><span>© {datetime.now().year} {SHOP} · Brocante à Pézenas</span><span><a href="../">Toute la collection</a> · <a href="https://linktr.ee/jeanpierrecartier" target="_blank" rel="noopener">Linktree</a></span></div></div></footer>
<script>
document.getElementById('thumbs').addEventListener('click', function (ev) {{
  var b = ev.target.closest('[data-src]'); if (!b) return;
  document.querySelector('#stage img').src = b.dataset.src;
}});
</script>
</body>
</html>
"""


def write_feeds(items, data):
    """Catalogue Pinterest (CSV) et flux RSS des nouveautés, liés aux pages objet."""
    import csv
    from email.utils import format_datetime

    cols = ["id", "title", "description", "link", "image_link", "additional_image_link", "price",
            "availability", "condition", "brand", "product_type", "google_product_category"]
    with (ROOT / "pinterest.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        for p in items:
            if p.get("price") is None:
                continue
            w.writerow({
                "id": p["id"],
                "title": p["title"][:500],
                "description": summary(p),
                "link": SITE + p["page"],
                "image_link": p["images"][0],
                "additional_image_link": ",".join(p["images"][1:10]),
                "price": f"{p['price']:.2f} {p.get('currency') or 'USD'}",
                "availability": "in stock",
                "condition": "used",
                "brand": SHOP,
                "product_type": " > ".join(x for x in (p.get("category"), p.get("subcategory")) if x),
                "google_product_category": "Home & Garden > Decor",
            })

    def date(p):
        raw = p.get("listed") or p.get("firstSeen") or data.get("updated") or ""
        try:
            return datetime.fromisoformat(raw.replace("Z", "+00:00")[:25])
        except ValueError:
            return datetime.now(timezone.utc)
    recent = sorted(items, key=date, reverse=True)[:50]
    entries = "".join(
        f"<item><title>{e(p['title'])} · {e(money(p))}</title><link>{SITE}{p['page']}</link>"
        f"<guid isPermaLink=\"true\">{SITE}{p['page']}</guid><pubDate>{format_datetime(date(p).astimezone(timezone.utc))}</pubDate>"
        f"<description>{e(summary(p))}</description>"
        f"<enclosure url=\"{e(p['images'][0])}\" type=\"image/jpeg\" length=\"0\"/>"
        f"<media:content url=\"{e(p['images'][0])}\" medium=\"image\"/></item>\n"
        for p in recent
    )
    (ROOT / "feed.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">\n<channel>'
        f"<title>{SHOP} · Nouveautés</title><link>{SITE}</link>"
        "<description>Art africain, objets anciens et curiosités chinés à Pézenas. Nouvelles pièces chaque semaine.</description>"
        "<language>fr</language>\n" + entries + "</channel></rss>\n", encoding="utf-8")


def build(data):
    items = [p for p in data.get("items", []) if p.get("images") and not p.get("example")]
    tmp = ROOT / "objet.tmp"
    if tmp.exists():
        shutil.rmtree(tmp)
    tmp.mkdir()
    for p in items:
        p["page"] = page_path(p)
        related = [r for r in items if r is not p and r.get("subcategory") == p.get("subcategory")][:4]
        if len(related) < 4:
            related += [r for r in items if r is not p and r not in related and r.get("category") == p.get("category")][: 4 - len(related)]
        (tmp / Path(p["page"]).name).write_text(render(p, related), encoding="utf-8")
    # Remplacement d'un bloc : les pages des objets vendus disparaissent.
    if PAGES_DIR.exists():
        shutil.rmtree(PAGES_DIR)
    tmp.rename(PAGES_DIR)

    write_feeds(items, data)

    day = (data.get("updated") or datetime.now(timezone.utc).isoformat())[:10]
    urls = [f"<url><loc>{SITE}</loc><lastmod>{day}</lastmod></url>"]
    urls += [f"<url><loc>{SITE}{p['page']}</loc><lastmod>{day}</lastmod></url>" for p in items]
    (ROOT / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(urls) + "\n</urlset>\n", encoding="utf-8")
    return len(items)


if __name__ == "__main__":
    path = ROOT / "products.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    n = build(data)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{n} pages générées.")
