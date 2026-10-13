"""Kit Instagram hebdomadaire : 5 pièces mises en avant, un visuel de post
(1080x1350) et un visuel de story (1080x1920) pour chacune, avec la légende.

Sorties : instagram/AAAA-MM-JJ/*.jpg, instagram/kit.json, instagram/featured.json.
Lancement : python instagram.py
"""

import io
import json
import re
import shutil
import textwrap
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "instagram"
FONTS = ROOT / "fonts"
PER_WEEK = 5
INK, PAPER, SOFT, ACCENT, MUTED = (20, 20, 20), (255, 255, 255), (246, 245, 242), (156, 74, 42), (107, 107, 107)
SITE = "rgagrdzcrt.github.io/LesDinedourelles"


def font(name, size, weight=None):
    f = ImageFont.truetype(str(FONTS / name), size)
    if weight:
        try:
            f.set_variation_by_axes([100, weight])  # largeur normale, graisse demandée
        except Exception:
            pass
    return f


def photo(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return Image.open(io.BytesIO(r.read())).convert("RGB")


def money(p):
    symbol = {"USD": "$", "EUR": "€"}.get(p.get("currency"), p.get("currency", ""))
    return f"{p['price']:,.0f} {symbol}".replace(",", " ") if p.get("price") is not None else ""


def wrap(draw, text, fnt, width, max_lines):
    words, lines, cur = text.split(), [], ""
    for w in words:
        test = (cur + " " + w).strip()
        if draw.textlength(test, font=fnt) <= width:
            cur = test
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    if len(lines) > max_lines:
        lines = lines[:max_lines]
        while draw.textlength(lines[-1] + "…", font=fnt) > width and " " in lines[-1]:
            lines[-1] = lines[-1].rsplit(" ", 1)[0]
        lines[-1] += "…"
    return lines


def kicker(p, new):
    return "Nouveauté" if new else (p.get("subcategory") or p.get("category") or "Pièce unique")


def post(img, p, new):
    W, H = 1080, 1350
    c = Image.new("RGB", (W, H), PAPER)
    c.paste(ImageOps.fit(img, (W, 960), Image.LANCZOS, centering=(.5, .45)), (0, 0))
    d = ImageDraw.Draw(c)
    x, y = 72, 1004
    d.text((x, y), kicker(p, new).upper(), font=font("InstrumentSans.ttf", 26, 650), fill=ACCENT)
    y += 46
    for line in wrap(d, p["title"], font("InstrumentSerif-Regular.ttf", 58), W - 2 * x, 2):
        d.text((x, y), line, font=font("InstrumentSerif-Regular.ttf", 58), fill=INK)
        y += 64
    d.text((x, H - 112), money(p), font=font("InstrumentSans.ttf", 44, 700), fill=INK)
    brand = "Les Dinedourelles"
    f = font("InstrumentSerif-Italic.ttf", 40)
    d.text((W - x - d.textlength(brand, font=f), H - 108), brand, font=f, fill=ACCENT)
    d.text((x, H - 54), "Lien en bio · pièce unique, achat sécurisé sur eBay", font=font("InstrumentSans.ttf", 24, 450), fill=MUTED)
    return c


def story(img, p, new):
    W, H = 1080, 1920
    c = Image.new("RGB", (W, H), SOFT)
    d = ImageDraw.Draw(c)
    f = font("InstrumentSerif-Italic.ttf", 56)
    brand = "Les Dinedourelles"
    d.text(((W - d.textlength(brand, font=f)) / 2, 150), brand, font=f, fill=ACCENT)
    pic = ImageOps.contain(img, (900, 1000), Image.LANCZOS)
    frame = Image.new("RGB", (pic.width + 40, pic.height + 40), PAPER)
    frame.paste(pic, (20, 20))
    c.paste(frame, ((W - frame.width) // 2, 270 + (1040 - frame.height) // 2))
    y = 1360
    k = kicker(p, new).upper()
    fk = font("InstrumentSans.ttf", 30, 650)
    d.text(((W - d.textlength(k, font=fk)) / 2, y), k, font=fk, fill=ACCENT)
    y += 56
    ft = font("InstrumentSerif-Regular.ttf", 66)
    for line in wrap(d, p["title"], ft, W - 160, 2):
        d.text(((W - d.textlength(line, font=ft)) / 2, y), line, font=ft, fill=INK)
        y += 74
    fp = font("InstrumentSans.ttf", 52, 700)
    m = money(p)
    d.text(((W - d.textlength(m, font=fp)) / 2, y + 26), m, font=fp, fill=INK)
    cta = "Voir la pièce · lien en bio"
    fc = font("InstrumentSans.ttf", 34, 600)
    bw = d.textlength(cta, font=fc) + 90
    d.rounded_rectangle(((W - bw) / 2, H - 230, (W + bw) / 2, H - 140), radius=45, fill=INK)
    d.text(((W - d.textlength(cta, font=fc)) / 2, H - 205), cta, font=fc, fill=PAPER)
    return c


TAGS_BASE = ["#brocante", "#chine", "#antiquites", "#objetsanciens", "#curiosites", "#cabinetdecuriosites",
             "#decovintage", "#pezenas", "#herault", "#occitanie", "#ebay"]
TAGS_BY = [
    (r"ethni|afric|tribal|lobi|dogon|teke|baoul|senouf|punu|kota|lega|luba|chokwe|yoruba|bobo|mangbetu",
     ["#artafricain", "#artpremier", "#arttribal", "#africanart", "#tribalart", "#masqueafricain"]),
    (r"ceram|faience|porcelain|gres|vallauris|poterie", ["#ceramique", "#ceramiquevintage", "#poterie", "#vallauris"]),
    (r"verre|glass|cristal|murano|legras|loetz|lotz", ["#verreancien", "#murano", "#artdeco", "#cristal"]),
    (r"chin|japon|japan|asiat|tibet|nepal|indonesi|bouddh", ["#artasiatique", "#asianart", "#chinoiserie"]),
    (r"peinture|painting|huile|oil|dessin|drawing|gravure|photo", ["#peinture", "#artancien", "#tableau", "#oeuvredart"]),
    (r"sculpture|statue|bronze|buste|platre", ["#sculpture", "#bronze", "#statue"]),
    (r"art deco|art nouveau", ["#artdeco", "#artnouveau"]),
]


def caption(p, new):
    text = " ".join([p["title"], p.get("category", ""), p.get("subcategory", ""), p.get("description", "")]).lower()
    tags = list(TAGS_BASE)
    for pat, extra in TAGS_BY:
        if re.search(pat, text):
            tags += [t for t in extra if t not in tags]
    desc = re.sub(r"\s+", " ", p.get("description") or "").strip()
    desc = textwrap.shorten(desc, 320, placeholder="…") if desc else ""
    head = "✦ Nouvelle pièce à la brocante" if new else "✦ Pièce de la semaine"
    lines = [head, "", p["title"]]
    if desc:
        lines += ["", desc]
    lines += ["", f"Prix : {money(p)}", "Pièce unique, paiement sécurisé et envoi soigné depuis l'Aude.",
              "👉 Lien en bio pour voir toutes les photos et l'acheter.", "", " ".join(tags[:28])]
    return "\n".join(lines)


def main():
    data = json.loads((ROOT / "products.json").read_text(encoding="utf-8"))
    items = [p for p in data["items"] if p.get("images") and p.get("price") is not None and p.get("page")]
    OUT.mkdir(exist_ok=True)
    featured_path = OUT / "featured.json"
    featured = json.loads(featured_path.read_text(encoding="utf-8")) if featured_path.exists() else {}
    now = datetime.now(timezone.utc)
    week_ago = (now - timedelta(days=7)).date().isoformat()

    def listed(p):
        return (p.get("listed") or p.get("firstSeen") or "")[:10]

    new = [p for p in items if listed(p) >= week_ago and str(p["id"]) not in featured]
    new.sort(key=listed, reverse=True)
    # Compléter avec des pièces jamais mises en avant, les plus chères d'abord.
    rest = sorted((p for p in items if str(p["id"]) not in featured and p not in new), key=lambda p: -p["price"])
    if len(new) + len(rest) < PER_WEEK:  # tout le catalogue a tourné : on recommence
        featured = {}
        rest = sorted((p for p in items if p not in new), key=lambda p: -p["price"])
    # Variété : pas deux pièces au titre trop proche, au plus deux par sous-catégorie.
    picks, seen_titles, per_sub = [], set(), {}
    for p in new + rest:
        key = " ".join(re.findall(r"[a-z]+", p["title"].lower())[:2])
        sub = p.get("subcategory") or p.get("category")
        if key in seen_titles or per_sub.get(sub, 0) >= 2:
            continue
        picks.append(p)
        seen_titles.add(key)
        per_sub[sub] = per_sub.get(sub, 0) + 1
        if len(picks) == PER_WEEK:
            break

    day = now.date().isoformat()
    folder = OUT / day
    if folder.exists():
        shutil.rmtree(folder)
    folder.mkdir()
    kit = []
    for i, p in enumerate(picks, 1):
        is_new = p in new
        try:
            img = photo(p["images"][0])
        except Exception as err:
            print(f"Photo indisponible pour {p['id']} : {err}")
            continue
        base = f"{i:02d}-{p['id']}"
        post(img, p, is_new).save(folder / f"{base}-post.jpg", quality=90)
        story(img, p, is_new).save(folder / f"{base}-story.jpg", quality=90)
        kit.append({"id": p["id"], "title": p["title"], "new": is_new, "price": money(p),
                    "post": f"instagram/{day}/{base}-post.jpg", "story": f"instagram/{day}/{base}-story.jpg",
                    "page": p["page"], "caption": caption(p, is_new)})
        featured[str(p["id"])] = day

    # On garde les 4 dernières semaines de visuels.
    weeks = sorted(d for d in OUT.iterdir() if d.is_dir())
    for old in weeks[:-4]:
        shutil.rmtree(old)
    (OUT / "kit.json").write_text(json.dumps({"week": day, "items": kit}, ensure_ascii=False, indent=1), encoding="utf-8")
    featured_path.write_text(json.dumps(featured, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"Kit du {day} : {len(kit)} pièce(s), dont {sum(k['new'] for k in kit)} nouveauté(s).")


if __name__ == "__main__":
    main()
