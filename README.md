# Les Dinedourelles

Vitrine en ligne de la boutique eBay [Les Dinedourelles](https://www.ebay.com/str/lesdinedourelles) : art africain, objets anciens et curiosités.

## Fonctionnement

- `index.html`, `style.css`, `app.js` : le site, publié avec GitHub Pages.
- `collect.py` : récupère les annonces du vendeur avec l'API Browse d'eBay et écrit `products.json`.
- `shopify_products.csv` : le même catalogue au format d'import produits de Shopify, prêt pour une future boutique.
- `.github/workflows/collect.yml` : lance la collecte toutes les 6 heures (et à la demande).

## Brancher eBay

1. Créer un compte sur [developer.ebay.com](https://developer.ebay.com) et une application (clés **Production**).
2. Dans le dépôt GitHub : **Settings → Secrets and variables → Actions**, ajouter :
   - `EBAY_CLIENT_ID` (App ID)
   - `EBAY_CLIENT_SECRET` (Cert ID)
3. Lancer **Actions → Mise à jour du catalogue → Run workflow**.

Sans ces clés, le site affiche un échantillon d'exemple.

## Passer sur Shopify

Dans Shopify : **Produits → Importer**, puis choisir `shopify_products.csv`.
