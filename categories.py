"""Classement des pièces : une catégorie et une sous-catégorie par pièce, d'après le titre (français et anglais)
et la catégorie eBay. Les règles sont lues dans l'ordre : la première qui correspond l'emporte.
Pour corriger une pièce mal rangée : ajouter son numéro dans classement.json, ex. {"257624060508": ["Verre et cristal", "Murano"]}."""
import json
import re
import unicodedata
from pathlib import Path

OVERRIDES = Path(__file__).with_name("classement.json")


def norm(s):
    s = unicodedata.normalize("NFD", (s or "").lower())
    return "".join(c for c in s if unicodedata.category(c) != "Mn")


AFRICA = (r"afric|congo|\brdc\b|lobi|loby|baoul|dogon|do gon|senouf|senuf|teke|\blega\b|punu|gabon|chokwe|\bkota\b|luba|bakongo"
          r"|yoruba|nigeria|\bbobo\b|burkina|\bdan\b|ngombe|masai|katanga|cameroun|\bmali\b|malien|somalie|\bboni\b|ethiopi")
JAPAN = r"japon|japanese|meiji|samourai|samurai|jingasa|satsuma|imari"
CHINA = r"\bchin(e|ois|oise|ese)s?\b|nankin|pagode|immortel|bouddh|buddh|dragon|cloisonn|pierre a encre|pierre de lard|opi"
INDIA = r"\binde\b|indien|indou|india|tibet|thibet|nepal|phurbu|kharal|moucharabieh"
SEASIA = r"birman|myanmar|indones|\bthai|timor|vietnam|indochine|hong kong|asiatique|\basie|papouasie|\blaque"
ORIENT = r"berbere|maroc|perse\b|khanjar|orientalist"
ASIA_ANY = "|".join([JAPAN, CHINA, INDIA, SEASIA, ORIENT])

# (catégorie, sous-catégorie, motif)
RULES = [
    ("Papiers, livres et jeux", "BD et magazines", r"magazine|pilote du|charlie|circus|echo des savanes"),
    ("Papiers, livres et jeux", "Livres, journaux et affiches", r"catalogue nicolas|crapouillot|sourire de reims|albums caran|affiche|calendrier"),
    ("Papiers, livres et jeux", "Jouets et miniatures", r"solido|miniature 1/|figurines du premier empire|petits soldats|pantin|maquette"),
    ("Bijoux", "Bijoux berbères en argent", r"bracelet berbere"),
    ("Bijoux", "Perles, or et montres", r"perle de culture|montre femme"),
    ("Bijoux", "Bijoux vintage", r"^(paire de )?(bracelet|collier)|boucle de ceinture"),
    ("Tableaux et dessins", "Photographie d'art", r"photo(graphie)? d.art"),
    ("Tableaux et dessins", "Dessins et gravures", r"dessin|gravure|encre de chine|lavis"),
    ("Tableaux et dessins", "Peintures", r"huile sur|huile miniature|tableau|\btoiles?\b|peinture (a\.|orientaliste)|^peinture|nature morte|portrait|serge carre"),
    ("Luminaires et bougeoirs", "Lampes", r"\blampes?\b|applique|veilleuse"),
    ("Luminaires et bougeoirs", "Bougeoirs et candélabres", r"bougeoir|candelabre"),
    ("Arts d'Afrique", "Masques", r"masque|cimier|egungun"),
    ("Arts d'Afrique", "Statues et fétiches", r"statue|statuette|fetiche|fertilite|bronze dogon|sculpture bronze malienne"),
    ("Arts d'Afrique", "Sièges et appuie-tête", r"tabouret|siege|appuie tete|repose tete"),
    ("Arts d'Afrique", "Objets rituels et du quotidien", r"."),
    ("Cabinet de curiosités", "Art religieux", r"crucifix|\bcroix\b|benitier|paroissien|de jesus|pique cierge"),
    ("Cabinet de curiosités", "Médecine, sciences et naturalia", r"chirurgien|reanimation|medecin|septaria|geolog|agathe|appareil photo|oeuf d.autruche"),
    ("Cabinet de curiosités", "Souvenirs historiques et médailles", r"legion d.honneur|poilus|kepi|napoleon bonaparte|franc-maconnerie|dieu et mon droit|medaille"),
    ("Cabinet de curiosités", "Pipes et fumeurs", r"\bpipes?\b|pyrogene|fourneau"),
    ("Cabinet de curiosités", "Instruments de musique", r"mandoline|xylophone|boite a musique|harpe|tambour|percussion"),
    ("Cabinet de curiosités", "Écriture et bureau", r"encrier|porte plume|porte buvard|presse papier|classeur de bureau"),
    ("Asie et Orient", "Japon", JAPAN),
    ("Asie et Orient", "Chine", CHINA),
    ("Asie et Orient", "Inde, Tibet et Népal", INDIA),
    ("Asie et Orient", "Asie du Sud-Est et Océanie", SEASIA),
    ("Asie et Orient", "Maghreb et Orient", ORIENT),
    ("Arts de la table", "Ustensiles et vaisselle anciens", r"\bmoules?\b|marmite|mortier|louche|\bseau\b|emporte|ramasse miettes|gobelet|sucrier|saleron|soupiere|plateau|theiere|pince a sagou|ciseau|paniere|tasse"),
    ("Verre et cristal", "Murano et verre italien", r"murano|venini|flavio poli|mdina"),
    ("Verre et cristal", "Art Déco et Art Nouveau", r"legras|verlys|lotz|delatte|lalique|pate de verre"),
    ("Verre et cristal", "Design scandinave", r"orrefors|ohrstrom|jonasson|engleson|scandinave|suedois"),
    ("Verre et cristal", "Carafes, flacons et verres", r"carafe|flacon|topette|absinthe|bouteille|\bverres?\b|cristal|crystal|bonbonniere|bombonniere|aiguiere"),
    ("Céramique et faïence", "Vallauris et céramistes du XXe", r"vallaur|gardelle|portanier|atterberg|cytere|rambervilliers|dages|poeterie|irlo|badessi|parent-saura|annees 1960|mouchoir"),
    ("Céramique et faïence", "Faïence et porcelaine", r"faience|sinceny|\brouen\b|malicorne|jacquot|porcelaine"),
    ("Sculptures et bronzes", "Bronzes et régules", r"bronze|regule|plomb"),
    ("Mobilier et décoration", "Miroirs", r"miroir"),
    ("Mobilier et décoration", "Horloges et pendules", r"horloge|pendule"),
    ("Mobilier et décoration", "Petits meubles et sièges", r"fauteuil|gueridon|selette|\btable\b"),
    ("Sculptures et bronzes", "Marbre, pierre et terre cuite", r"marbre|albatre|(sculpt|statue|\btete\b|buste|venus).*(terre cuite|platre)|(terre cuite|platre).*(sculpt|\btete\b)|venus"),
    ("Sculptures et bronzes", "Bois sculpté", r"(\bbois\b|bambou).*(sculpt|statue|figur)|(sculpt|statue).*(\bbois\b|bambou)|totem|^sculpture"),
    ("Céramique et faïence", "Grès, terre cuite et céramique", r"ceramique|\bgres\b|\bgre\b|terre cuite|pichet|cruche|\bvases?\b|assiette|\bcoupes?\b|\bplats?\b|\bbol\b|\bpots?\b"),
    ("Mobilier et décoration", "Objets de décoration", r"."),
]
RULES = [(c, s, re.compile(p)) for c, s, p in RULES]

# Ordre d'affichage dans le menu
ORDER = ["Arts d'Afrique", "Asie et Orient", "Céramique et faïence", "Verre et cristal", "Sculptures et bronzes",
         "Tableaux et dessins", "Luminaires et bougeoirs", "Mobilier et décoration", "Cabinet de curiosités",
         "Arts de la table", "Bijoux", "Papiers, livres et jeux"]


def is_african(p, t):
    if re.search(AFRICA, t):
        return True
    sub = norm(p.get("subcategory"))
    return ("ethni" in sub or "afrique" in sub) and not re.search(ASIA_ANY + r"|sud americaine|art populaire", t)


def classify(p, overrides=None):
    if overrides and str(p.get("id")) in overrides:
        return tuple(overrides[str(p["id"])])
    t = norm(p.get("title", "") + " " + (p.get("title_en") or ""))
    african = is_african(p, t)
    for cat, sub, rx in RULES:
        if cat == "Arts d'Afrique" and not african:
            continue
        if cat == "Asie et Orient" and african:
            continue
        if rx.search(t):
            return cat, sub
    return "Mobilier et décoration", "Objets de décoration"


def apply(products):
    """Ajoute p["cat"] et p["sub"] à chaque pièce."""
    overrides = json.loads(OVERRIDES.read_text(encoding="utf-8")) if OVERRIDES.exists() else {}
    overrides = {k: v for k, v in overrides.items() if not k.startswith("_")}
    for p in products:
        p["cat"], p["sub"] = classify(p, overrides)
