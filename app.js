/* Les Dinedourelles — vitrine : lit products.json (mis à jour depuis eBay),
   affiche carrousel, catégories, tranches de prix, catalogue filtrable,
   favoris et fiche objet. Bilingue français / anglais. */
(function () {
  const $ = id => document.getElementById(id);
  const PAGE = 24;
  let data = { items: [] }, items = [];
  let soldCount = 176, sold = [], heroPick = null;
  // Curseur de prix : paliers (plus fins là où se trouvent la plupart des pièces). Le dernier palier = « et plus ».
  const STEPS = [0, 20, 50, 75, 100, 150, 200, 300, 500, 750, 1000, 1500];
  const LAST = STEPS.length - 1;
  let filter = null, favOnly = false, shown = PAGE, slide = 0, timer = null;

  /* ---------- Traductions ---------- */
  const T = {
    fr: {
      promo: "Nouveautés chaque semaine · <b>Expédition soignée depuis l'Aude</b> · Paiement sécurisé par eBay",
      searchLabel: 'Rechercher', searchPh: 'Rechercher une pièce, une origine, une matière…',
      favs: 'Favoris', store: 'Boutique eBay', themeAria: 'Changer de mode (jour / nuit)', langBtn: 'EN', langAria: 'Switch to English',
      heroKicker: 'Cabinet de curiosités · Pézenas', heroTitle: 'Des pièces uniques, <i>chinées une à une.</i>',
      heroText: 'Art africain, céramiques signées, verrerie et objets anciens choisis par Jean-Pierre Cartier, brocanteur depuis plus de dix ans.',
      heroCta: n => `Découvrir les ${n} pièces →`,
      byCat: 'Explorer la collection', origins: { africa: 'Afrique', europe: 'Europe', asia: 'Asie', signed: 'Signatures et grands noms' }, catsTitle: 'Catégories', byPrice: 'Acheter par prix', collection: 'La collection',
      pieces: n => n + (n > 1 ? ' pièces' : ' pièce'), piecesArrow: n => `${n} ${n > 1 ? 'pièces' : 'pièce'} →`,
      priceTitle: 'Prix', priceAll: 'Tous les prix', priceMin: 'Prix minimum', priceMax: 'Prix maximum',
      priceUp: a => `${a} et plus`, priceUpTo: a => `Jusqu'à ${a}`, priceFromTo: (a, b) => `De ${a} à ${b}`,
      sortLabel: 'Trier', sortRecent: "Nouveautés d'abord", sortAsc: 'Prix croissant', sortDesc: 'Prix décroissant',
      more: n => `Voir ${n} pièces de plus`, unique: 'Pièce unique', fresh: 'Nouveau', favAdd: 'Ajouter aux favoris', favRemove: 'Retirer des favoris',
      favFilter: 'Mes favoris', emptyT: 'Aucune pièce ne correspond', emptyS: 'Essayez un autre mot ou une autre rubrique.',
      emptyFav: 'Touchez le cœur d’une pièce pour la retrouver ici.',
      goneTitle: 'Déjà vendus', goneSub: "Ces pièces ont trouvé preneur. D'autres arrivent chaque semaine.", soldTag: 'Vendu',
      revTitle: 'Ils sont passés à la brocante', revGoogle: 'Avis Google', revAll: 'Tous les avis',
      revNote: "Extraits d'avis Google des deux brocantes, choisis parmi les plus détaillés. Notes moyennes relevées sur Google en octobre 2026.",
      t1: 'Paiement sécurisé', t1p: 'Chaque achat passe par eBay et sa garantie client.',
      t2: 'Envoi soigné', t2p: "Emballé à la main et expédié depuis l'Aude.",
      t3: "100 % d'avis positifs", t3p: n => `Plus de ${n} objets déjà vendus sur eBay.`,
      t4: 'Arrivages réguliers', t4p: 'De nouvelles pièces chaque semaine, chinées en brocante.',
      houseKicker: 'La maison', portraitAlt: 'Jean-Pierre Cartier en dessin : moustache, nœud papillon et lunettes sur le front', houseTitle: 'La brocante en coulisses',
      houseText: "<p>Derrière Les Dinedourelles, il y a Jean-Pierre Cartier, brocanteur et collectionneur, et sa femme Isabelle Chancerel, couturière et co-gérante de la brocante d'Escales. Le nom fait référence à l'hirondelle, l'oiseau qui figure sur le logo. Depuis plus d'une dizaine d'années, il tient sa brocante à Pézenas, dans l'Hérault, et il en tient aussi une à Escales, dans l'Aude.</p><p>Ses trouvailles viennent de deux horizons. Il y a d'abord les brocantes, où il déniche céramiques de Vallauris, verrerie de Murano, porcelaines de Chine et du Japon, objets du XIXe siècle et pièces signées de grands noms. Et puis il y a ses voyages en Afrique, d'où il rapporte des statues, des masques et des tabourets, dogon, senoufo ou lobi, qu'on ne trouve pas ailleurs.</p><p>Chaque objet est choisi pour son histoire, sa patine ou sa signature. Ce sont des pièces uniques : une fois vendues, elles ne reviennent pas. Jean-Pierre les emballe lui-même, avec soin, et les expédie depuis l'Aude.</p>", hours: "<h3>Nos brocantes, ouvertes tous les jours</h3><dl><dt>Pézenas <small>(Hérault)</small></dt><dd>10&nbsp;h&nbsp;30 – 12&nbsp;h&nbsp;30 et 14&nbsp;h – 19&nbsp;h<br><a class=\"addr\" href=\"https://www.google.com/maps/search/?api=1&amp;query=4+Av.+Aristide+Briand%2C+34120+P%C3%A9zenas\" target=\"_blank\" rel=\"noopener\">4 Av. Aristide Briand, 34120 Pézenas ↗</a></dd><dt>Escales <small>(Aude)</small></dt><dd>10&nbsp;h – 19&nbsp;h<br><a class=\"addr\" href=\"https://www.google.com/maps/search/?api=1&amp;query=5+ter+Impasse+des+Pins%2C+11200+Escales\" target=\"_blank\" rel=\"noopener\">5 ter Impasse des Pins, 11200 Escales ↗</a></dd></dl><p class=\"tel\">Téléphone : <a href=\"tel:+33678522504\">06 78 52 25 04</a></p>",
      instaCta: 'Suivre sur Instagram', linktreeCta: 'Linktree ↗',
      linktreeNote: 'Retrouvez aussi Jean-Pierre sur Selency, Vinted, WhatsApp et Facebook, tous réunis dans le Linktree ci-dessus.', footText: "Art africain, objets anciens et curiosités. Brocantes à Pézenas et à Escales, envois depuis l'Aude.",
      footCol: 'Collection', footBuy: 'Acheter', footHouse: 'La maison', footStory: 'Notre histoire',
      updated: 'Catalogue mis à jour le ', close: 'Fermer', sheetNote: 'Commande, paiement et livraison se font sur eBay.',
      descTitle: 'Description', descNote: '', buy: 'Acheter sur eBay ↗', ask: 'Poser une question au vendeur ↗', seeStore: 'Voir la boutique eBay ↗', category: 'Catégorie', detail: 'Détail', condition: 'État',
      shipping: 'Expédition', shipFrom: "Depuis l'Aude, France", ref: 'Référence', photo: 'Photo', priceOnEbay: 'Prix sur eBay',
      locale: 'fr-FR', under: a => `Moins de ${a}`, between: (a, b) => `${a} à ${b}`, over: a => `Plus de ${a}`,
      cols: { all: 'Toute la collection' },
    },
    en: {
      promo: 'New finds every week · <b>Carefully shipped from the south of France</b> · Secure payment through eBay',
      searchLabel: 'Search', searchPh: 'Search for a piece, an origin, a material…',
      favs: 'Favourites', store: 'eBay store', themeAria: 'Switch light / dark mode', langBtn: 'FR', langAria: 'Passer en français',
      heroKicker: 'Cabinet of curiosities · Pézenas', heroTitle: 'Unique pieces, <i>found one by one.</i>',
      heroText: 'African art, signed ceramics, glassware and antiques chosen by Jean-Pierre Cartier, an antiques dealer for more than ten years.',
      heroCta: n => `Discover all ${n} pieces →`,
      byCat: 'Explore the collection', origins: { africa: 'Africa', europe: 'Europe', asia: 'Asia', signed: 'Signatures and big names' }, catsTitle: 'Categories', byPrice: 'Shop by price', collection: 'The collection',
      pieces: n => n + (n > 1 ? ' pieces' : ' piece'), piecesArrow: n => `${n} ${n > 1 ? 'pieces' : 'piece'} →`,
      priceTitle: 'Price', priceAll: 'All prices', priceMin: 'Minimum price', priceMax: 'Maximum price',
      priceUp: a => `${a} and up`, priceUpTo: a => `Up to ${a}`, priceFromTo: (a, b) => `${a} to ${b}`,
      sortLabel: 'Sort', sortRecent: 'Newest first', sortAsc: 'Price: low to high', sortDesc: 'Price: high to low',
      more: n => `Show ${n} more pieces`, unique: 'One of a kind', fresh: 'New', favAdd: 'Add to favourites', favRemove: 'Remove from favourites',
      favFilter: 'My favourites', emptyT: 'No matching pieces', emptyS: 'Try another word or section.',
      emptyFav: 'Tap the heart on a piece to keep it here.',
      goneTitle: 'Already sold', goneSub: 'These pieces have found a home. New ones arrive every week.', soldTag: 'Sold',
      revTitle: 'What visitors say', revGoogle: 'Google reviews', revAll: 'All reviews',
      revNote: 'Excerpts from Google reviews of both shops (in French), picked among the most detailed. Average ratings taken from Google in October 2026.',
      t1: 'Secure payment', t1p: 'Every purchase goes through eBay and its buyer guarantee.',
      t2: 'Careful shipping', t2p: 'Hand-packed and shipped from the Aude, France.',
      t3: '100% positive feedback', t3p: n => `More than ${n} items already sold on eBay.`,
      t4: 'Regular new arrivals', t4p: 'New pieces every week, found at flea markets.',
      houseKicker: 'About', portraitAlt: 'Jean-Pierre Cartier as a drawing: moustache, bow tie and glasses on his forehead', houseTitle: 'Behind the stall',
      houseText: "<p>Les Dinedourelles is run by Jean-Pierre Cartier, an antiques dealer and collector, and his wife Isabelle Chancerel, a seamstress and co-manager of the Escales shop. The name refers to the swallow, the bird on the logo. For more than ten years he has kept his antiques shop in Pézenas, in the Hérault, and he runs a second one in Escales, in the Aude, in the south of France.</p><p>His finds come from two places. First, flea markets, where he hunts down Vallauris ceramics, Murano glass, Chinese and Japanese porcelain, 19th-century objects and signed pieces by famous makers. Then his travels in Africa, from which he brings back statues, masks and stools, Dogon, Senufo or Lobi, that you won't find anywhere else.</p><p>Each object is chosen for its history, its patina or its signature. Every piece is one of a kind: once sold, it won't come back. Jean-Pierre packs each one carefully himself and ships it from the Aude.</p>", hours: "<h3>Our shops, open every day</h3><dl><dt>Pézenas <small>(Hérault)</small></dt><dd>10:30 am – 12:30 pm and 2 – 7 pm<br><a class=\"addr\" href=\"https://www.google.com/maps/search/?api=1&amp;query=4+Av.+Aristide+Briand%2C+34120+P%C3%A9zenas\" target=\"_blank\" rel=\"noopener\">4 Av. Aristide Briand, 34120 Pézenas ↗</a></dd><dt>Escales <small>(Aude)</small></dt><dd>10 am – 7 pm<br><a class=\"addr\" href=\"https://www.google.com/maps/search/?api=1&amp;query=5+ter+Impasse+des+Pins%2C+11200+Escales\" target=\"_blank\" rel=\"noopener\">5 ter Impasse des Pins, 11200 Escales ↗</a></dd></dl><p class=\"tel\">Phone: <a href=\"tel:+33678522504\">+33 6 78 52 25 04</a></p>",
      instaCta: 'Follow on Instagram', linktreeCta: 'Linktree ↗',
      linktreeNote: 'You can also find Jean-Pierre on Selency, Vinted, WhatsApp and Facebook, all gathered in the Linktree above.', footText: 'African art, antiques and curiosities. Antiques shops in Pézenas and Escales, shipping from the Aude, France.',
      footCol: 'Collection', footBuy: 'Shop', footHouse: 'About', footStory: 'Our story',
      updated: 'Catalogue updated ', close: 'Close', sheetNote: 'Ordering, payment and delivery take place on eBay.',
      descTitle: 'Description', descNote: 'Written by the seller in French.', descAuto: 'Automatically translated from French.', buy: 'Buy on eBay ↗', ask: 'Ask the seller a question ↗', seeStore: 'Visit the eBay store ↗', category: 'Category', detail: 'Detail', condition: 'Condition',
      shipping: 'Shipping', shipFrom: 'From the Aude, France', ref: 'Reference', photo: 'Photo', priceOnEbay: 'Price on eBay',
      locale: 'en-US', under: a => `Under ${a}`, between: (a, b) => `${a} to ${b}`, over: a => `Over ${a}`,
      cols: { all: 'Whole collection' },
    },
  };
  const CAT_EN = { 'Antiquités': 'Antiques', 'Art': 'Art', 'Objets de collection': 'Collectibles', 'Poterie et verre': 'Pottery & glass', 'Jouets et modélisme': 'Toys & models', 'Bijoux et montres': 'Jewellery & watches', 'Maison et jardin': 'Home & garden', 'Livres': 'Books', 'Occasion': 'Used' };


  // Sous-catégories eBay (reçues en français).
  Object.assign(CAT_EN, {
    'Arts, objets ethniques': 'Tribal & ethnographic art', 'Sculptures, statues': 'Sculptures & statues',
    'Vases, tulipiers, soliflores': 'Vases', 'Peintures': 'Paintings', 'Asiatiques': 'Asian art',
    'Grands noms étrangers': 'Famous foreign makers', 'Autres': 'Other', 'Crucifix': 'Crucifixes',
    'Grands céramistes du XXe': '20th-century ceramists', 'Pipes': 'Pipes', 'Verres, flûtes, services': 'Glasses & glassware sets',
    'Vallauris': 'Vallauris pottery', 'Allemagne': 'German pottery', 'Cendriers, coupes, coupelles': 'Bowls & ashtrays',
    'Coupes, coupelles, cendriers': 'Bowls & ashtrays', 'Dessins, lavis': 'Drawings', 'Absinthe, cuillère': 'Absinthe items',
    'Flacons': 'Perfume bottles', 'Sciences médicales': 'Medical antiques', 'Statues, figurines': 'Statues & figurines',
    'Bouteilles': 'Bottles', 'Voitures, camions et fourgons': 'Model cars & trucks', 'Bougeoirs, lampes': 'Candlesticks & lamps',
    "Photographies d'art": 'Fine art photography', 'France': 'French militaria', 'Carafes, bouteilles': 'Carafes & bottles',
    'Carafes, bouteilles, flacons': 'Carafes & bottles', 'Produits dérivés': 'Advertising collectibles',
    'Salières, poivrières': 'Salt & pepper shakers', 'Plats, soupières': 'Dishes & tureens',
    '1ère guerre mondiale 14-18': 'World War I (1914-1918)', 'Plateaux, pots': 'Trays & pots', 'Encriers': 'Inkwells',
    'Petits soldats': 'Toy soldiers', 'Cartes': 'Maps', 'Malicorne': 'Malicorne faience', 'Italie': 'Italian ceramics',
    'Rouen': 'Rouen faience', 'Chapeaux, coiffes': 'Hats & headdresses', 'Estampes, gravures': 'Prints & engravings',
  });

  let lang = '';
  try { lang = localStorage.getItem('dd_lang') || ''; } catch (e) {}
  if (lang !== 'en') lang = 'fr'; // français par défaut, anglais seulement si le visiteur le choisit
  const t = k => T[lang][k];
  const tr = s => (lang === 'en' && CAT_EN[s]) || s;
  const ttl = p => (lang === 'en' && p.title_en) || p.title;

  let favs = [];
  try { favs = JSON.parse(localStorage.getItem('dd_favs') || '[]'); } catch (e) {}
  const saveFavs = () => { try { localStorage.setItem('dd_favs', JSON.stringify(favs)); } catch (e) {} };

  /* ---------- Statistiques (GoatCounter, sans cookies) ---------- */
  const track = (path, title) => { try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path, title, event: true }); } catch (e) {} };
  fetch('config.json', { cache: 'no-cache' }).then(r => r.json()).then(c => {
    if (c.soldCount) { soldCount = c.soldCount; $('soldTxt').textContent = t('t3p')(soldCount); }
    if (!c.goatcounter) return;
    const sc = document.createElement('script');
    sc.async = true; sc.src = 'https://gc.zgo.at/count.js';
    sc.dataset.goatcounter = `https://${c.goatcounter}.goatcounter.com/count`;
    document.head.appendChild(sc);
  }).catch(() => {});

  /* ---------- Outils ---------- */
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const cur = () => (items[0] && items[0].currency) || 'USD';
  const fmt = (v, c) => new Intl.NumberFormat(t('locale'), { style: 'currency', currency: c || cur(), maximumFractionDigits: 0 }).format(v);
  const money = p => p.price == null ? t('priceOnEbay') : new Intl.NumberFormat(t('locale'), { style: 'currency', currency: p.currency || cur(), minimumFractionDigits: 2 }).format(p.price);
  const text = p => norm([p.title, p.title_en, p.category, p.subcategory].join(' '));
  // Vignettes : photo eBay en 500 px (7 fois plus légère que l'originale en 1600 px). Carrousel et fiche gardent la grande.
  const thumb = u => String(u || '').replace('/s-l1600.', '/s-l500.');
  const heartSvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.5 3 4.5 6.8 4.5c2.2 0 3.6 1.2 5.2 3 1.6-1.8 3-3 5.2-3 3.8 0 5.9 4 4.4 7.3C19.5 16.4 12 21 12 21Z"/></svg>';

  const ASIA = /asiat|\bchin(e|ois|oise|a|ese)|japan|japon|asian|satsuma|imari|vietnam|bouddha|buddha|\bthai|\binde?\b|indien|india|timor|indones|tibet|nepal|birman|meiji/;

  /* Catégories et sous-catégories du menu : calculées à chaque mise à jour du catalogue par categories.py
     (champs p.cat et p.sub de products.json). Une pièce = une catégorie, une sous-catégorie. */
  const CAT_ORDER = ["Arts d'Afrique", 'Asie et Orient', 'Céramique et faïence', 'Verre et cristal', 'Sculptures et bronzes',
    'Tableaux et dessins', 'Luminaires et bougeoirs', 'Mobilier et décoration', 'Cabinet de curiosités', 'Arts de la table', 'Bijoux', 'Papiers, livres et jeux'];
  const SITE_EN = {
    "Arts d'Afrique": 'African art', 'Masques': 'Masks', 'Statues et fétiches': 'Statues and fetishes', 'Sièges et appuie-tête': 'Stools and headrests', 'Objets rituels et du quotidien': 'Ritual and everyday objects',
    'Asie et Orient': 'Asia and the Orient', 'Japon': 'Japan', 'Chine': 'China', 'Inde, Tibet et Népal': 'India, Tibet and Nepal', 'Asie du Sud-Est et Océanie': 'Southeast Asia and Oceania', 'Maghreb et Orient': 'North Africa and the Middle East',
    'Céramique et faïence': 'Ceramics and earthenware', 'Vallauris et céramistes du XXe': 'Vallauris and 20th-century ceramists', 'Faïence et porcelaine': 'Faience and porcelain', 'Grès, terre cuite et céramique': 'Stoneware, terracotta and pottery',
    'Verre et cristal': 'Glass and crystal', 'Murano et verre italien': 'Murano and Italian glass', 'Art Déco et Art Nouveau': 'Art Deco and Art Nouveau', 'Design scandinave': 'Scandinavian design', 'Carafes, flacons et verres': 'Decanters, bottles and glasses',
    'Sculptures et bronzes': 'Sculpture and bronzes', 'Bronzes et régules': 'Bronzes and spelter', 'Marbre, pierre et terre cuite': 'Marble, stone and terracotta', 'Bois sculpté': 'Carved wood',
    'Tableaux et dessins': 'Paintings and drawings', 'Peintures': 'Paintings', 'Dessins et gravures': 'Drawings and prints', "Photographie d'art": 'Fine art photography',
    'Luminaires et bougeoirs': 'Lighting and candlesticks', 'Lampes': 'Lamps', 'Bougeoirs et candélabres': 'Candlesticks and candelabra',
    'Mobilier et décoration': 'Furniture and decor', 'Miroirs': 'Mirrors', 'Horloges et pendules': 'Clocks', 'Petits meubles et sièges': 'Small furniture and seating', 'Objets de décoration': 'Decorative objects',
    'Cabinet de curiosités': 'Cabinet of curiosities', 'Art religieux': 'Religious art', 'Médecine, sciences et naturalia': 'Medicine, science and naturalia', 'Souvenirs historiques et médailles': 'Historical memorabilia and medals', 'Pipes et fumeurs': 'Pipes and smoking', 'Instruments de musique': 'Musical instruments', 'Écriture et bureau': 'Writing and desk items',
    'Arts de la table': 'Tableware', 'Ustensiles et vaisselle anciens': 'Antique kitchenware and tableware',
    'Bijoux': 'Jewellery', 'Bijoux berbères en argent': 'Berber silver jewellery', 'Perles, or et montres': 'Pearls, gold and watches', 'Bijoux vintage': 'Vintage jewellery',
    'Papiers, livres et jeux': 'Paper, books and toys', 'BD et magazines': 'Comics and magazines', 'Livres, journaux et affiches': 'Books, newspapers and posters', 'Jouets et miniatures': 'Toys and models',
  };
  const cn = s => (lang === 'en' && SITE_EN[s]) || s;
  const catFilter = c => ({ key: 'cat:' + c, cat: c, label: cn(c), test: p => p.cat === c });
  const subFilter = (c, sb) => ({ key: 'sub:' + c + '|' + sb, cat: c, sub: sb, label: cn(sb), test: p => p.cat === c && p.sub === sb });
  // Pièces mises en avant (carrousel) : pas les magazines, les bijoux fantaisie ni la vaisselle.
  const featured = p => !['Papiers, livres et jeux', 'Bijoux', 'Arts de la table'].includes(p.cat);

  /* ---------- Langue ---------- */
  function applyLang() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => { const v = t(el.dataset.i18n); if (typeof v === 'string') el.textContent = v; });
    document.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
    document.querySelectorAll('[data-i18n-alt]').forEach(el => { el.alt = t(el.dataset.i18nAlt); });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
    $('langBtn').textContent = t('langBtn');
    $('soldTxt').textContent = t('t3p')(soldCount);
    $('langBtn').setAttribute('aria-label', t('langAria'));
    if (data.updated) $('updated').textContent = t('updated') + new Date(data.updated).toLocaleDateString(t('locale'), { day: 'numeric', month: 'long', year: 'numeric' });
  }

  /* ---------- Sections fixes ---------- */
  function renderNav() {
    const cats = CAT_ORDER.filter(c => items.some(p => p.cat === c));
    const open = filter && filter.cat;
    const n = f => items.filter(f).length;
    const all = `<button type="button" data-col="all" aria-pressed="${!filter && !favOnly}">${esc(t('cols').all)}${items.length ? `<small>${items.length}</small>` : ''}</button>`;
    $('nav').innerHTML = all + cats.map(c => {
      const btn = `<button type="button" class="cat-btn${open === c ? ' open' : ''}" data-cat="${esc(c)}" aria-expanded="${open === c}" aria-pressed="${!!filter && filter.key === 'cat:' + c}">${esc(cn(c))}<small>${n(p => p.cat === c)}</small></button>`;
      if (open !== c) return btn;
      const subs = [...new Set(items.filter(p => p.cat === c).map(p => p.sub))]
        .map(sb => [sb, n(p => p.cat === c && p.sub === sb)]).sort((x, y) => y[1] - x[1]);
      return btn + `<div class="subs">${subs.map(([sb, k]) => `<button type="button" data-cat="${esc(c)}" data-sub="${esc(sb)}" aria-pressed="${!!filter && filter.key === 'sub:' + c + '|' + sb}">${esc(cn(sb))}<small>${k}</small></button>`).join('')}</div>`;
    }).join('');
    $('footCats').innerHTML = cats.slice(0, 6).map(c => `<li><button type="button" data-cat="${esc(c)}">${esc(cn(c))}</button></li>`).join('');
  }

  function renderHero() {
    // 6 pièces tirées au hasard à chaque visite, parmi les pièces à 50 € et plus des grandes catégories (pas de magazines ni de petits objets).
    // Le tirage est gardé pour la visite : changer de langue ne mélange pas à nouveau.
    if (!heroPick) {
      const pool = items.filter(p => p.price >= 50 && featured(p));
      const list = (pool.length >= 6 ? pool : items).slice();
      for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
      heroPick = list.slice(0, 6);
    }
    const heroes = heroPick;
    $('heroImgs').innerHTML = heroes.map((p, i) => `<button type="button" class="${i === slide ? 'on' : ''}" data-id="${esc(p.id)}" aria-label="${esc(ttl(p))}"><img src="${esc(p.images[0])}" alt="${esc(ttl(p))}" ${i ? 'loading="lazy"' : ''} referrerpolicy="no-referrer"><span class="cap">${esc(ttl(p))} · ${esc(money(p))}</span></button>`).join('');
    $('dots').innerHTML = `<b id="slideNo">${slide + 1}</b>/${heroes.length} ` + heroes.map((_, i) => `<span class="${i === slide ? 'on' : ''}"></span>`).join('');
    $('heroCta').textContent = t('heroCta')(items.length);
    clearInterval(timer);
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches && heroes.length > 1) {
      timer = setInterval(() => {
        const imgs = $('heroImgs').children, dots = $('dots').querySelectorAll('span');
        imgs[slide].classList.remove('on'); dots[slide].classList.remove('on');
        slide = (slide + 1) % imgs.length;
        imgs[slide].classList.add('on'); dots[slide].classList.add('on');
        $('slideNo').textContent = slide + 1;
      }, 4500);
    }
  }

  /* Explorer la collection (origine, pièces signées) : mots-clés dans le titre, le détail eBay et les caractéristiques (« Origine »…). */
  const place = p => norm([p.title, p.title_en, p.subcategory, ...(p.aspects || []).map(a => a[1])].join(' ')).replace('encre de chine', '');
  const ORIGINS = [
    { key: 'africa', re: /afric|tribal|congo|lobi|teke|baoul|dogon|senouf|senufo|\bfang\b|yoruba|ashanti|bambara|\bkota\b|fetich|fetish|burkina|\bmali\b|nigeria|cote d.ivoire|gabon|cameroun|somalie|berbere|\brdc\b|maroc|morocc|tunisi|alger|egypt|ethiopi|\bdan\b|\blega\b|\bbobo\b|ngombe|kenya|senegal/ },
    { key: 'europe', re: /murano|venise|venetian|\bital|allemagne|german|kienzle|vienne|vienna|autriche|austria|anglais|angleterre|english|england|scandinav|suede|swedish|orrefors|danois|danish|norv|espagn|spanish|portug|belg|suisse|swiss|boheme|bohemi|tcheque|czech|\bruss|hollande|dutch|delft|\bgrec|greek|foret noire|black forest|franc(e|ais|aise)\b|french|vallauri|vallaurys|limoges|quimper|\bgien\b|sarreguemines|longwy|nancy|daum|lalique|legras|moustiers|\bbiot\b|paris|provence|corse|normandie|bretagne|alsace|marseille|cassis|rambervilliers|desvres|luneville|baccarat|christofle|languedoc|poilus|guerlain|solido|renault|gardelle/ },
    { key: 'asia', re: ASIA },
    { key: 'signed', re: /\bsigne|\bsigned|\bsignature|attribue|monogramm|lalique|legras|daum|orrefors|gardelle|christofle|baccarat|verlys|\blotz\b|loetz|delatte|badessi|flavio poli|seguso|venini|jonasson|ohrstrom|gustave asch|mdina/ },
  ];
  function renderCats() {
    // Photo de vignette : une pièce pas déjà montrée dans le carrousel ni sur une autre vignette.
    const used = new Set([...$('heroImgs').querySelectorAll('[data-id]')].map(b => b.dataset.id));
    $('cats').innerHTML = ORIGINS.map(o => {
      const list = items.filter(p => o.re.test(place(p)));
      if (!list.length) return '';
      const cover = list.find(p => !used.has(String(p.id))) || list[0];
      used.add(String(cover.id));
      return `<button type="button" class="cat" data-origin="${o.key}"><div class="ph"><img src="${esc(thumb(cover.images[0]))}" alt="" loading="lazy" referrerpolicy="no-referrer"></div><h3>${esc(t('origins')[o.key])}</h3><p>${esc(t('pieces')(list.length))}</p></button>`;
    }).join('');
  }


  function renderMosaic() {
    // Une pièce par catégorie du menu (Afrique, Asie, Céramique…), sans doublon ni pièce du carrousel.
    const used = new Set([...$('heroImgs').querySelectorAll('[data-id]')].map(b => b.dataset.id)), pick = [];
    CAT_ORDER.forEach(c => { const p = items.find(x => x.cat === c && x.price >= 50 && !used.has(String(x.id))) || items.find(x => x.cat === c && !used.has(String(x.id))); if (p) { used.add(String(p.id)); pick.push(p); } });
    $('mosaic').innerHTML = pick.map(p => `<button type="button" data-id="${esc(p.id)}" aria-label="${esc(ttl(p))}"><img src="${esc(thumb(p.images[0]))}" alt="" loading="lazy" referrerpolicy="no-referrer"></button>`).join('');
  }

  /* Déjà vendus : sold.json (objets sortis du catalogue), sans ceux remis en vente depuis. */
  function renderGone() {
    const live = new Set(items.map(p => String(p.id)));
    const list = sold.filter(s => s.image && !live.has(String(s.id))).sort((a, b) => b.goneOn.localeCompare(a.goneOn)).slice(0, 8);
    $('gone').hidden = !list.length;
    $('goneGrid').innerHTML = list.map(s => `<div class="gone-item"><div class="ph"><img src="${esc(thumb(s.image))}" alt="" loading="lazy" referrerpolicy="no-referrer"><span class="tag">${esc(t('soldTag'))}</span></div><h3>${esc(s.title)}</h3><div class="sub">${esc(s.sub ? cn(s.sub) : tr(s.subcategory || s.category))}</div></div>`).join('');
  }

  /* ---------- Curseur de prix ---------- */
  const lo = () => Number($('pMin').value), hi = () => Number($('pMax').value);
  const priceOk = p => {
    if (lo() === 0 && hi() === LAST) return true;
    if (p.price == null) return false;
    return p.price >= STEPS[lo()] && (hi() === LAST || p.price <= STEPS[hi()]);
  };
  function renderPrice() {
    const a = lo(), b = hi(), f = i => fmt(STEPS[i], 'EUR');
    $('priceVal').textContent = a === 0 && b === LAST ? t('priceAll') : b === LAST ? t('priceUp')(f(a)) : a === 0 ? t('priceUpTo')(f(b)) : t('priceFromTo')(f(a), f(b));
    $('rangeFill').style.left = (a / LAST * 100) + '%';
    $('rangeFill').style.right = (100 - b / LAST * 100) + '%';
    $('priceReset').hidden = a === 0 && b === LAST;
  }
  ['pMin', 'pMax'].forEach(id => $(id).addEventListener('input', () => {
    // Les deux poignées ne se croisent pas : au moins un palier d'écart.
    if (lo() >= hi()) { if (id === 'pMin') $('pMin').value = hi() - 1; else $('pMax').value = lo() + 1; }
    shown = PAGE; renderPrice(); renderGrid();
  }));
  $('priceReset').addEventListener('click', () => { $('pMin').value = 0; $('pMax').value = LAST; shown = PAGE; renderPrice(); renderGrid(); });

  /* ---------- Catalogue ---------- */
  function list() {
    const q = norm($('q').value.trim());
    let out = items.filter(p => (!filter || filter.test(p)) && (!favOnly || favs.includes(String(p.id))) && (!q || text(p).includes(q)) && priceOk(p));
    const sort = $('sort').value;
    if (sort === 'asc') out = out.slice().sort((a, b) => (a.price ?? 1e9) - (b.price ?? 1e9));
    if (sort === 'desc') out = out.slice().sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
    return out;
  }

  const isNew = p => { const d = (p.listed || p.firstSeen || '').slice(0, 10); return !!d && Date.now() - new Date(d) < 7 * 864e5; };

  function card(p) {
    const on = favs.includes(String(p.id));
    return `<div class="card"><a class="open" href="${esc(p.page || '#')}" data-id="${esc(p.id)}" style="display:block">
      <div class="ph"><img src="${esc(thumb(p.images[0]))}" alt="${esc(ttl(p))}" loading="lazy" referrerpolicy="no-referrer"><span class="tag${isNew(p) ? ' new' : ''}">${esc(t(isNew(p) ? 'fresh' : 'unique'))}</span></div>
      <h3>${esc(ttl(p))}</h3><div class="sub">${esc(p.sub ? cn(p.sub) : tr(p.subcategory || p.category))}</div><div class="pr">${esc(money(p))}</div></a>
      <button type="button" class="heart${on ? ' on' : ''}" data-fav="${esc(p.id)}" aria-pressed="${on}" aria-label="${esc(on ? t('favRemove') : t('favAdd'))}">${heartSvg}</button></div>`;
  }

  function renderGrid() {
    const all = list();
    const title = favOnly ? t('favFilter') : filter ? filter.label : t('collection');
    $('colTitle').textContent = title;
    $('count').textContent = t('pieces')(all.length);
    $('clearFilter').hidden = !filter && !favOnly;
    $('clearFilter').textContent = title;
    $('grid').innerHTML = all.length ? all.slice(0, shown).map(card).join('')
      : `<div class="empty"><strong>${esc(t('emptyT'))}</strong>${esc(favOnly ? t('emptyFav') : t('emptyS'))}</div>`;
    const rest = all.length - shown;
    $('moreBtn').hidden = rest <= 0;
    if (rest > 0) $('moreBtn').textContent = t('more')(Math.min(rest, PAGE));
    $('favCount').textContent = favs.length;
    $('favBtn').setAttribute('aria-pressed', favOnly);
  }

  function setFilter(f, scroll = true) {
    filter = f; favOnly = false; shown = PAGE;
    renderNav(); renderGrid();
    if (scroll) $('collection').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  /* Panneau des catégories (téléphone et tablette) */
  function openSide() { document.body.classList.add('side-open'); $('sideBackdrop').hidden = false; $('catsBtn').setAttribute('aria-expanded', 'true'); }
  function closeSide() { document.body.classList.remove('side-open'); $('sideBackdrop').hidden = true; $('catsBtn').setAttribute('aria-expanded', 'false'); }
  $('catsBtn').addEventListener('click', openSide);
  $('sideClose').addEventListener('click', closeSide);
  $('sideBackdrop').addEventListener('click', closeSide);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSide(); });

  function toggleFav(id) {
    id = String(id);
    const added = !favs.includes(id);
    favs = added ? [...favs, id] : favs.filter(x => x !== id);
    saveFavs();
    if (window.DD.onFav) window.DD.onFav(id, added); // compte connecté : favori enregistré en ligne
  }

  /* ---------- Fiche objet ---------- */
  let current = null;
  function open(id) {
    const p = items.find(x => String(x.id) === String(id));
    if (!p) return;
    current = p;
    const imgs = p.images || [];
    const show = i => {
      $('stage').innerHTML = imgs[i] ? `<img src="${esc(imgs[i])}" alt="${esc(ttl(p))}" referrerpolicy="no-referrer">` : '';
      $('thumbs').querySelectorAll('button').forEach((b, j) => b.setAttribute('aria-current', j === i));
    };
    $('thumbs').innerHTML = imgs.length > 1 ? imgs.map((src, i) => `<button type="button" data-i="${i}" aria-label="${esc(t('photo'))} ${i + 1}"><img src="${esc(thumb(src))}" alt="" loading="lazy" referrerpolicy="no-referrer"></button>`).join('') : '';
    $('thumbs').onclick = e => { const b = e.target.closest('[data-i]'); if (b) show(Number(b.dataset.i)); };
    show(0);
    $('sheetCat').textContent = p.cat ? [cn(p.cat), cn(p.sub)].join(' · ') : [tr(p.category), tr(p.subcategory)].filter(Boolean).join(' · ');
    $('sheetTitle').textContent = ttl(p);
    $('sheetPrice').textContent = money(p);
    $('sheetBuy').href = p.url || data.storeUrl;
    $('sheetBuy').textContent = p.example ? t('seeStore') : t('buy');
    // m2mOpen=1 : eBay ouvre directement la fenêtre de message au vendeur.
    $('sheetAsk').hidden = !!p.example;
    $('sheetAsk').href = `${new URL(data.storeUrl || 'https://www.ebay.fr').origin}/itm/${p.id}?m2mOpen=1`;
    $('sheetAsk').textContent = t('ask');
    renderSheetFav();
    const descEn = lang === 'en' && String(p.description_en || '').trim();
    const desc = descEn || String(p.description || '').trim();
    $('sheetDesc').hidden = !desc;
    $('sheetDescTitle').textContent = t('descTitle');
    $('sheetDescText').textContent = desc;
    $('sheetDesc').dataset.note = descEn ? t('descAuto') : t('descNote');
    const rows = [[t('category'), p.cat ? cn(p.cat) : tr(p.category)], [t('detail'), p.sub ? cn(p.sub) : tr(p.subcategory)], [t('condition'), tr(p.condition)], [t('shipping'), t('shipFrom')], [t('ref'), p.example ? '' : p.id]].filter(r => r[1]);
    $('sheetSpecs').innerHTML = rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
    $('sheet').showModal();
    track('fiche/' + p.id, p.title);
  }
  function renderSheetFav() {
    if (!current) return;
    const on = favs.includes(String(current.id));
    $('sheetFav').innerHTML = `${heartSvg.replace('<svg', `<svg style="width:18px;height:18px;fill:${on ? 'currentColor' : 'none'};stroke:currentColor;stroke-width:1.7"`)} ${esc(on ? t('favRemove') : t('favAdd'))}`;
  }

  /* ---------- Événements ---------- */
  document.addEventListener('click', e => {
    const fav = e.target.closest('[data-fav]');
    if (fav) { toggleFav(fav.dataset.fav); if (favs.includes(String(fav.dataset.fav))) track('favori/' + fav.dataset.fav, 'Favori'); renderGrid(); return; }
    const col = e.target.closest('[data-col]');
    if (col && col.dataset.col === 'all') { closeSide(); setFilter(null); return; }
    const cb = e.target.closest('[data-cat]');
    if (cb && cb.dataset.sub) { closeSide(); setFilter(subFilter(cb.dataset.cat, cb.dataset.sub)); return; }
    // Catégorie : un clic l'ouvre (et filtre), un second clic la referme. Sur téléphone le panneau reste ouvert pour choisir une sous-catégorie.
    if (cb) { const c = cb.dataset.cat, again = filter && filter.key === 'cat:' + c; if (!cb.closest('#nav')) closeSide(); setFilter(again ? null : catFilter(c), !cb.closest('#nav') || !document.body.classList.contains('side-open')); return; }
    const origin = e.target.closest('[data-origin]');
    if (origin) { const o = ORIGINS.find(x => x.key === origin.dataset.origin); setFilter({ key: 'origin:' + o.key, label: t('origins')[o.key], test: p => o.re.test(place(p)) }); return; }
    const opener = e.target.closest('[data-id]');
    if (opener && !opener.closest('#sheet')) {
      // Ctrl/Cmd-clic ou clic molette : la page de l'objet s'ouvre dans un nouvel onglet.
      if (opener.tagName === 'A' && (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1)) return;
      e.preventDefault();
      open(opener.dataset.id);
    }
  });
  $('clearFilter').addEventListener('click', () => { favOnly = false; setFilter(null, false); });
  $('favBtn').addEventListener('click', () => { favOnly = !favOnly; filter = null; shown = PAGE; renderGrid(); $('collection').scrollIntoView({ behavior: 'smooth' }); });
  $('moreBtn').addEventListener('click', () => { shown += PAGE; renderGrid(); });
  $('q').addEventListener('input', () => { shown = PAGE; renderGrid(); });
  $('q').addEventListener('keydown', e => { if (e.key === 'Enter') $('collection').scrollIntoView({ behavior: 'smooth' }); });
  $('sort').addEventListener('change', () => { shown = PAGE; renderGrid(); });
  $('sheetFav').addEventListener('click', () => { if (current) { toggleFav(current.id); renderSheetFav(); renderGrid(); } });
  $('sheetBuy').addEventListener('click', () => { if (current) track('ebay/' + current.id, 'Clic eBay : ' + current.title); });
  $('sheetAsk').addEventListener('click', () => { if (current) track('question/' + current.id, 'Question : ' + current.title); });
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href*="instagram.com"], a[href*="linktr.ee"], #storeLink');
    if (a) track(a.href.includes('instagram') ? 'sortie/instagram' : a.href.includes('linktr') ? 'sortie/linktree' : 'sortie/boutique-ebay', a.textContent.trim());
  });
  $('closeSheet').addEventListener('click', () => $('sheet').close());
  $('sheet').addEventListener('click', e => { if (e.target === $('sheet')) $('sheet').close(); });
  $('themeBtn').addEventListener('click', () => {
    const root = document.documentElement;
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('dd_theme', root.dataset.theme); } catch (e) {}
  });
  $('langBtn').addEventListener('click', () => {
    lang = lang === 'fr' ? 'en' : 'fr';
    try { localStorage.setItem('dd_lang', lang); } catch (e) {}
    document.dispatchEvent(new Event('dd:lang'));
    if (filter && filter.cat) filter.label = cn(filter.sub || filter.cat);
    if (filter && filter.key.startsWith('origin:')) filter.label = t('origins')[filter.key.slice(7)];
    renderAll();
  });

  function renderAll() {
    applyLang();
    if (!items.length) return;
    renderNav(); renderHero(); renderCats(); renderMosaic(); renderPrice(); renderGrid(); renderGone();
  }

  // Passerelle pour account.js (comptes visiteurs) : favoris, langue, catégories.
  window.DD = {
    favs: () => favs.slice(),
    setFavs: list => { favs = list.map(String); saveFavs(); if (items.length) renderGrid(); renderSheetFav(); },
    lang: () => lang, cats: CAT_ORDER, cn: s => cn(s), hasCat: c => items.some(p => p.cat === c), track,
  };

  $('year').textContent = new Date().getFullYear();
  applyLang();
  renderNav();
  fetch('products.json', { cache: 'no-cache' })
    .then(r => r.json())
    .then(d => {
      data = d;
      Object.entries(d.cat_en || {}).forEach(([fr, en]) => { if (!CAT_EN[fr]) CAT_EN[fr] = en; });
      items = d.items.filter(p => p.images && p.images.length);
      if (d.storeUrl) $('storeLink').href = d.storeUrl;
      renderAll();
    })
    .then(() => fetch('sold.json', { cache: 'no-cache' }))
    .then(r => r.json())
    .then(s => { sold = Array.isArray(s) ? s : []; renderGone(); }, () => {})
    .catch(() => { $('grid').innerHTML = `<div class="empty"><strong>${esc(t('emptyT'))}</strong></div>`; });
})();
