"""E-mails aux inscrits (comptes du site, base Supabase), envoyés par Brevo.

  python alertes.py              après chaque mise à jour du catalogue : les nouvelles pièces sont envoyées
                                 aux inscrits qui suivent leur catégorie (alertes).
  python alertes.py --hebdo      le lundi : récapitulatif des pièces arrivées dans les 7 derniers jours
                                 pour les inscrits à « Les nouveautés de la semaine ».

Variables d'environnement (secrets GitHub) : SUPABASE_SECRET_KEY, BREVO_API_KEY.
TEST_TO="a@x.fr,b@y.fr" : envoie un exemple de chaque e-mail à ces adresses seulement (aucun inscrit touché,
état non modifié).
"""
import html
import json
import os
import re
import sys
import urllib.error
import urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).parent
SITE = "https://lesdinedourelles.com"
SB_URL = "https://iysjxzbyvfzosyfmjnfb.supabase.co"
SENDER = {"name": "Les Dinedourelles", "email": "contact@lesdinedourelles.com"}
STATE = ROOT / "alertes_etat.json"  # pièces déjà annoncées (évite les doublons d'une collecte à l'autre)
MAX_PIECES = 12  # pièces montrées au plus dans un e-mail


def http_json(url, headers, data=None, method=None):
    body = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(url, data=body, headers={**headers, "Content-Type": "application/json"}, method=method)
    with urllib.request.urlopen(req, timeout=30) as r:
        raw = r.read()
        return json.loads(raw) if raw else None


def sb_headers():
    key = os.environ["SUPABASE_SECRET_KEY"]
    return {"apikey": key, "Authorization": f"Bearer {key}"} if not key.startswith("sb_secret_") else {"apikey": key}


def subscribers():
    base = f"{SB_URL}/rest/v1/profiles?select=id,email,newsletter,alert_cats,lang,unsub_token"
    try:
        return http_json(base + ",fav_alerts", sb_headers())
    except urllib.error.HTTPError:  # colonne fav_alerts pas encore créée (supabase/ajout-favoris.sql)
        return [dict(s, fav_alerts=False) for s in http_json(base, sb_headers())]


def favorites():
    try:
        return http_json(f"{SB_URL}/rest/v1/favorites?select=user_id,item_id,created_at,reminded_at", sb_headers())
    except urllib.error.HTTPError:
        return []


def send(to, subject, content, text):
    http_json("https://api.brevo.com/v3/smtp/email", {"api-key": os.environ["BREVO_API_KEY"], "accept": "application/json"},
              {"sender": SENDER, "to": [{"email": to}], "subject": subject, "htmlContent": content, "textContent": text})
    print(f"Envoyé : {subject} -> {to[:3]}…")


def money(p):
    if p.get("price") is None:
        return ""
    return f"{p['price']:,.2f} €".replace(",", " ").replace(".", ",")


def card(p):
    """Une pièce : photo et titre cliquables (vers sa page sur le site), plus un lien « Voir la pièce »."""
    url = f"{SITE}/{p['page']}" if p.get("page") else SITE
    img = html.escape((p.get("images") or [""])[0])
    link = 'style="color:#1d1914;text-decoration:none"'
    return (f'<tr><td width="96" valign="top" style="padding:12px 14px 12px 0;border-top:1px solid #e3d8c6">'
            f'<a href="{url}"><img src="{img}" width="96" alt="{html.escape(p["title"])}" style="display:block;width:96px;height:auto;max-height:128px;border-radius:6px;border:0"></a></td>'
            f'<td valign="top" style="padding:12px 0;border-top:1px solid #e3d8c6;font-family:Arial,sans-serif">'
            f'<a href="{url}" {link}><span style="font-size:15px;line-height:1.35;font-weight:bold">{html.escape(p["title"])}</span></a>'
            f'<div style="margin-top:4px;font-size:13px;color:#6e655a">{html.escape(p.get("sub") or "")}</div>'
            f'<div style="margin-top:6px;font-size:15px;font-weight:bold">{money(p)}</div>'
            f'<div style="margin-top:8px"><a href="{url}" style="font-size:14px;font-weight:bold;color:#9c4a2a">Voir la pièce →</a></div>'
            f'</td></tr>')


def layout(title, intro, pieces, unsub_token=None, preheader=""):
    rows = "".join(card(p) for p in pieces[:MAX_PIECES])
    more = f'<p style="font:14px Arial,sans-serif;color:#6e655a">… et {len(pieces) - MAX_PIECES} autre(s) sur le site.</p>' if len(pieces) > MAX_PIECES else ""
    unsub = f"{SITE}/desinscription.html?t={unsub_token}" if unsub_token else f"{SITE}/desinscription.html"
    hidden = f'<div style="display:none;max-height:0;overflow:hidden;opacity:0">{html.escape(preheader)}{"&#8199;&#847;" * 40}</div>' if preheader else ""
    return f'''{hidden}<div style="margin:0;padding:32px 16px;background:#f6efe2;font-family:Georgia,serif;color:#1d1914">
  <div style="max-width:560px;margin:0 auto;padding:32px 28px;background:#fffcf6;border-radius:10px">
    <p style="margin:0 0 14px;text-align:center"><a href="{SITE}"><img src="{SITE}/logo-mail.png" width="78" height="88" alt="Les Dinedourelles" style="display:inline-block;border:0"></a></p>
    <p style="margin:0 0 4px;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#9c4a2a;font-family:Arial,sans-serif;text-align:center">Les Dinedourelles</p>
    <h1 style="margin:0 0 12px;font-size:28px;font-weight:400">{html.escape(title)}</h1>
    <p style="margin:0 0 18px;font:16px/1.5 Arial,sans-serif">{intro}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">{rows}</table>
    {more}
    <p style="margin:24px 0"><a href="{SITE}/#collection" style="display:inline-block;padding:14px 26px;border-radius:999px;background:#1d1914;color:#fffcf6;text-decoration:none;font-family:Arial,sans-serif;font-weight:bold">Voir toute la collection</a></p>
    <p style="margin:0;font:12px/1.5 Arial,sans-serif;color:#6e655a">Vous recevez cet e-mail car vous avez choisi ces alertes sur lesdinedourelles.com.
    <a href="{SITE}/#compte" style="color:#9c4a2a">Gérer mes alertes</a> · <a href="{unsub}" style="color:#9c4a2a">Me désinscrire</a><br>
    Les Dinedourelles · 5 ter Impasse des Pins, 11200 Escales</p>
  </div>
</div>'''


def text_version(title, intro, pieces, unsub_token=None):
    plain = html.unescape(re.sub("<[^>]+>", "", intro))
    lines = [title, "", plain, ""]
    for p in pieces[:MAX_PIECES]:
        lines.append(f"- {p['title']} — {money(p)}")
        lines.append(f"  {SITE}/{p.get('page', '')}")
    lines += ["", f"Toute la collection : {SITE}/#collection", f"Gérer mes alertes : {SITE}/#compte",
              f"Me désinscrire : {SITE}/desinscription.html" + (f"?t={unsub_token}" if unsub_token else ""),
              "Les Dinedourelles · 5 ter Impasse des Pins, 11200 Escales"]
    return "\n".join(lines)


def alert_mail(pieces, cats, token=None):
    n = len(pieces)
    names = ", ".join(cats)
    subject = f"Nouveau aux Dinedourelles : {pieces[0]['title']}" if n == 1 else f"{n} nouvelles pièces aux Dinedourelles"
    intro = f"Jean-Pierre vient de mettre en ligne {'une nouvelle pièce' if n == 1 else f'{n} nouvelles pièces'} dans les catégories que vous suivez ({html.escape(names)}). Pièces uniques : premier arrivé, premier servi !"
    pre = f"{pieces[0]['title']} · {money(pieces[0])}" + (f" et {n - 1} autre(s)" if n > 1 else "")
    return subject, layout("Nouvelles pièces pour vous", intro, pieces, token, pre), text_version("Nouvelles pièces pour vous", intro, pieces, token)


def drop_mail(pieces, old_prices, token=None):
    n = len(pieces)
    first = pieces[0]
    subject = f"Baisse de prix : {first['title']}" if n == 1 else f"Baisse de prix sur {n} de vos favoris"
    lines = "<br>".join(f"{html.escape(p['title'])} : <s>{money({'price': old_prices[str(p['id'])]})}</s> → <b>{money(p)}</b>" for p in pieces)
    intro = f"Bonne nouvelle : {'une pièce' if n == 1 else f'{n} pièces'} de vos favoris {'vient' if n == 1 else 'viennent'} de baisser.<br>{lines}"
    pre = f"{first['title']} passe à {money(first)}"
    return subject, layout("Baisse de prix sur vos favoris", intro, pieces, token, pre), text_version("Baisse de prix sur vos favoris", intro, pieces, token)


def reminder_mail(pieces, token=None):
    n = len(pieces)
    subject = f"Toujours disponible : {pieces[0]['title']}" if n == 1 else f"{n} de vos favoris sont toujours disponibles"
    intro = (f"Vous aviez mis {'cette pièce' if n == 1 else 'ces pièces'} de côté il y a quelques semaines : "
             f"{'elle est' if n == 1 else 'elles sont'} toujours disponible{'s' if n > 1 else ''}. Chaque pièce est unique : "
             "si elle vous plaît encore, c'est le moment.")
    pre = "Vos favoris vous attendent encore aux Dinedourelles"
    return subject, layout("Toujours disponible", intro, pieces, token, pre), text_version("Toujours disponible", intro, pieces, token)


def favorite_alerts(items, subs, old_prices):
    """Baisses de prix et rappel « toujours disponible » 15 jours après la mise en favori (une seule fois)."""
    favs = favorites()
    if not favs:
        return
    by_id = {str(p["id"]): p for p in items}
    people = {s["id"]: s for s in subs if s.get("fav_alerts")}
    dropped = {i for i, p in by_id.items() if p.get("price") is not None and old_prices.get(i) is not None and p["price"] < old_prices[i]}
    limit = (datetime.now(timezone.utc) - timedelta(days=15)).isoformat()
    drops, reminders = {}, {}
    for f in favs:
        who, item = f["user_id"], str(f["item_id"])
        if who not in people or item not in by_id:
            continue
        if item in dropped:
            drops.setdefault(who, []).append(by_id[item])
        elif not f.get("reminded_at") and f["created_at"] < limit:
            reminders.setdefault(who, []).append(by_id[item])
    for who, pieces in drops.items():
        s = people[who]
        send(s["email"], *drop_mail(pieces, old_prices, s.get("unsub_token")))
    for who, pieces in reminders.items():
        s = people[who]
        send(s["email"], *reminder_mail(pieces, s.get("unsub_token")))
        ids = ",".join(str(p["id"]) for p in pieces)
        http_json(f"{SB_URL}/rest/v1/favorites?user_id=eq.{who}&item_id=in.({ids})", sb_headers(),
                  {"reminded_at": datetime.now(timezone.utc).isoformat()}, method="PATCH")


def weekly_mail(pieces, token=None):
    n = len(pieces)
    subject = f"Les nouveautés de la semaine · {n} pièce{'s' if n > 1 else ''}"
    intro = f"Voici les {n} pièce{'s' if n > 1 else ''} arrivée{'s' if n > 1 else ''} cette semaine à la brocante. Chacune est unique."
    pre = " · ".join(p["title"] for p in pieces[:3])
    return subject, layout("Les nouveautés de la semaine", intro, pieces, token, pre), text_version("Les nouveautés de la semaine", intro, pieces, token)


def main():
    items = json.loads((ROOT / "products.json").read_text(encoding="utf-8"))["items"]
    weekly = "--hebdo" in sys.argv
    test_to = [e.strip() for e in os.environ.get("TEST_TO", "").split(",") if e.strip()]

    if test_to:  # exemples, sans toucher aux inscrits ni à l'état
        recent = sorted(items, key=lambda p: p.get("firstSeen") or "", reverse=True)
        cat = recent[0].get("cat")
        sample = [p for p in recent if p.get("cat") == cat][:3]
        for to in test_to:
            s, c, txt = alert_mail(sample, [cat]); send(to, "[TEST] " + s, c, txt)
            s, c, txt = weekly_mail(recent[:6]); send(to, "[TEST] " + s, c, txt)
            first = recent[0]
            s, c, txt = drop_mail([first], {str(first["id"]): round((first.get("price") or 100) * 1.2)}); send(to, "[TEST] " + s, c, txt)
            s, c, txt = reminder_mail(recent[1:3]); send(to, "[TEST] " + s, c, txt)
        return 0

    if not os.environ.get("BREVO_API_KEY") or not os.environ.get("SUPABASE_SECRET_KEY"):
        print("Clés Brevo / Supabase absentes : aucun e-mail envoyé.")
        return 0
    subs = subscribers()

    if weekly:
        since = (date.today() - timedelta(days=7)).isoformat()
        pieces = sorted([p for p in items if (p.get("firstSeen") or "") >= since], key=lambda p: p["firstSeen"], reverse=True)
        if not pieces:
            print("Aucune nouveauté cette semaine.")
            return 0
        for s in subs:
            if s.get("newsletter"):
                subject, content, txt = weekly_mail(pieces, s.get("unsub_token"))
                send(s["email"], subject, content, txt)
        return 0

    ids = [str(p["id"]) for p in items]
    prices = {str(p["id"]): p.get("price") for p in items}
    if not STATE.exists():  # première fois : on mémorise le catalogue actuel, sans rien envoyer
        STATE.write_text(json.dumps({"ids": ids, "prices": prices}), encoding="utf-8")
        print("État initialisé : les prochaines nouvelles pièces seront annoncées.")
        return 0
    state = json.loads(STATE.read_text(encoding="utf-8"))
    if isinstance(state, list):  # ancien format : liste des pièces déjà annoncées
        state = {"ids": state, "prices": {}}
    known, old_prices = set(state["ids"]), state.get("prices", {})
    new = [p for p in items if str(p["id"]) not in known]
    STATE.write_text(json.dumps({"ids": sorted(known | set(ids)), "prices": prices}), encoding="utf-8")
    favorite_alerts(items, subs, old_prices)
    if not new:
        print("Pas de nouvelle pièce.")
        return 0
    for s in subs:
        cats = set(s.get("alert_cats") or [])
        mine = [p for p in new if p.get("cat") in cats]
        if mine:
            subject, content, txt = alert_mail(mine, sorted({p["cat"] for p in mine}), s.get("unsub_token"))
            send(s["email"], subject, content, txt)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except urllib.error.HTTPError as err:
        print(f"Erreur {err.code} : {err.read().decode()[:300]}")
        sys.exit(1)
