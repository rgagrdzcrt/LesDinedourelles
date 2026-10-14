/* Les Dinedourelles — vitrine : lit products.json (mis à jour depuis eBay),
   affiche carrousel, catégories, tranches de prix, catalogue filtrable,
   favoris et fiche objet. Bilingue français / anglais. */
(function () {
  const $ = id => document.getElementById(id);
  const PAGE = 24;
  let data = { items: [] }, items = [];
  let soldCount = 176, sold = [];
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
      sortLabel: 'Trier', sortRecent: "Nouveautés d'abord", sortAsc: 'Prix croissant', sortDesc: 'Prix décroissant',
      more: n => `Voir ${n} pièces de plus`, unique: 'Pièce unique', fresh: 'Nouveau', favAdd: 'Ajouter aux favoris', favRemove: 'Retirer des favoris',
      favFilter: 'Mes favoris', emptyT: 'Aucune pièce ne correspond', emptyS: 'Essayez un autre mot ou une autre rubrique.',
      emptyFav: 'Touchez le cœur d’une pièce pour la retrouver ici.',
      goneTitle: 'Déjà vendus', goneSub: "Ces pièces ont trouvé preneur. D'autres arrivent chaque semaine.", soldTag: 'Vendu',
      t1: 'Paiement sécurisé', t1p: 'Chaque achat passe par eBay et sa garantie client.',
      t2: 'Envoi soigné', t2p: "Emballé à la main et expédié depuis l'Aude.",
      t3: "100 % d'avis positifs", t3p: n => `Plus de ${n} objets déjà vendus sur eBay.`,
      t4: 'Arrivages réguliers', t4p: 'De nouvelles pièces chaque semaine, chinées en brocante.',
      houseKicker: 'La maison', houseTitle: 'La brocante en coulisses',
      houseText: "Derrière Les Dinedourelles, il y a Jean-Pierre Cartier, brocanteur et collectionneur. Depuis plus d'une dizaine d'années, il tient sa brocante à Pézenas, dans l'Hérault. Il chine dans les brocantes et rapporte de ses voyages en Afrique des pièces qu'on ne trouve pas ailleurs. Chaque objet est choisi pour son histoire, sa patine ou sa signature, puis emballé à la main et expédié depuis l'Aude.",
      instaCta: 'Suivre sur Instagram', linktreeCta: 'Linktree ↗',
      linktreeNote: 'Retrouvez aussi Jean-Pierre sur Selency, Vinted, WhatsApp et Facebook, tous réunis dans le Linktree ci-dessus.', footText: "Art africain, objets anciens et curiosités. Brocante à Pézenas, envois depuis l'Aude.",
      footCol: 'Collection', footBuy: 'Acheter', footHouse: 'La maison', footStory: 'Notre histoire',
      updated: 'Catalogue mis à jour le ', close: 'Fermer', sheetNote: 'Commande, paiement et livraison se font sur eBay.',
      descTitle: 'Description', descNote: '', buy: 'Acheter sur eBay ↗', ask: 'Poser une question au vendeur ↗', seeStore: 'Voir la boutique eBay ↗', category: 'Catégorie', detail: 'Détail', condition: 'État',
      shipping: 'Expédition', shipFrom: "Depuis l'Aude, France", ref: 'Référence', photo: 'Photo', priceOnEbay: 'Prix sur eBay',
      locale: 'fr-FR', under: a => `Moins de ${a}`, between: (a, b) => `${a} à ${b}`, over: a => `Plus de ${a}`,
      cols: { africa: 'Arts premiers', sculpture: 'Sculptures et statues', ceramics: 'Céramiques', vases: 'Vases', glass: 'Verrerie', asia: 'Asie', metal: 'Bronze et métal', lighting: 'Luminaires', pictures: 'Tableaux et dessins', jewellery: 'Bijoux', furniture: 'Mobilier et miroirs', antique: 'XIXe et avant', all: 'Toute la collection' },
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
      sortLabel: 'Sort', sortRecent: 'Newest first', sortAsc: 'Price: low to high', sortDesc: 'Price: high to low',
      more: n => `Show ${n} more pieces`, unique: 'One of a kind', fresh: 'New', favAdd: 'Add to favourites', favRemove: 'Remove from favourites',
      favFilter: 'My favourites', emptyT: 'No matching pieces', emptyS: 'Try another word or section.',
      emptyFav: 'Tap the heart on a piece to keep it here.',
      goneTitle: 'Already sold', goneSub: 'These pieces have found a home. New ones arrive every week.', soldTag: 'Sold',
      t1: 'Secure payment', t1p: 'Every purchase goes through eBay and its buyer guarantee.',
      t2: 'Careful shipping', t2p: 'Hand-packed and shipped from the Aude, France.',
      t3: '100% positive feedback', t3p: n => `More than ${n} items already sold on eBay.`,
      t4: 'Regular new arrivals', t4p: 'New pieces every week, found at flea markets.',
      houseKicker: 'About', houseTitle: 'Behind the stall',
      houseText: "Les Dinedourelles is run by Jean-Pierre Cartier, an antiques dealer and collector. For more than ten years he has kept his stall in Pézenas, in the south of France. He hunts through flea markets and brings back from his travels in Africa pieces you won't find anywhere else. Each object is chosen for its history, its patina or its signature, then packed by hand and shipped from the Aude, France.",
      instaCta: 'Follow on Instagram', linktreeCta: 'Linktree ↗',
      linktreeNote: 'You can also find Jean-Pierre on Selency, Vinted, WhatsApp and Facebook, all gathered in the Linktree above.', footText: 'African art, antiques and curiosities. Antiques stall in Pézenas, shipping from the Aude, France.',
      footCol: 'Collection', footBuy: 'Shop', footHouse: 'About', footStory: 'Our story',
      updated: 'Catalogue updated ', close: 'Close', sheetNote: 'Ordering, payment and delivery take place on eBay.',
      descTitle: 'Description', descNote: 'Written by the seller in French.', descAuto: 'Automatically translated from French.', buy: 'Buy on eBay ↗', ask: 'Ask the seller a question ↗', seeStore: 'Visit the eBay store ↗', category: 'Category', detail: 'Detail', condition: 'Condition',
      shipping: 'Shipping', shipFrom: 'From the Aude, France', ref: 'Reference', photo: 'Photo', priceOnEbay: 'Price on eBay',
      locale: 'en-US', under: a => `Under ${a}`, between: (a, b) => `${a} to ${b}`, over: a => `Over ${a}`,
      cols: { africa: 'Tribal art', sculpture: 'Sculpture', ceramics: 'Ceramics', vases: 'Vases', glass: 'Glassware', asia: 'Asian art', metal: 'Bronze and metal', lighting: 'Lighting', pictures: 'Paintings and drawings', jewellery: 'Jewellery', furniture: 'Furniture and mirrors', antique: '19th century and earlier', all: 'Whole collection' },
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
  const heartSvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.5 3 4.5 6.8 4.5c2.2 0 3.6 1.2 5.2 3 1.6-1.8 3-3 5.2-3 3.8 0 5.9 4 4.4 7.3C19.5 16.4 12 21 12 21Z"/></svg>';

  /* Rubriques du menu : mots-clés cherchés dans le titre (français et anglais) et le détail eBay.
     Un objet peut appartenir à plusieurs rubriques. */
  const words = p => norm([p.title, p.title_en, p.subcategory].join(' '));
  const rule = re => p => re.test(words(p));
  const titleOnly = p => norm([p.title, p.title_en].join(' '));
  const ASIA = /asiat|\bchin(e|ois|oise|a|ese)|japan|japon|asian|satsuma|imari|vietnam|bouddha|buddha|\bthai|\binde?\b|indien|india|timor|indones|tibet|nepal|birman|meiji/;
  const COLLECTIONS = [
    { key: 'africa', test: p => /afric|tribal|congo|lobi|teke|baoul|dogon|senouf|senufo|\bfang\b|yoruba|ashanti|bambara|\bkota\b|fetich|fetish|\bmask|masque|burkina|\bmali\b|nigeria|cote d.ivoire|gabon|cameroun|somalie|berbere|\brdc\b/.test(titleOnly(p)) || (/ethni/.test(words(p)) && !ASIA.test(words(p))) },
    { key: 'sculpture', test: rule(/sculpt|statue|statuette|\bbuste?s?\b|figurine/) },
    { key: 'ceramics', test: rule(/ceram|faience|porcelain|porcelaine|\bgres\b|stoneware|poterie|pottery|earthenware|terre cuite|vallauris|barbotine|majolica/) },
    { key: 'vases', test: rule(/\bvases?\b|soliflore|tulipier/) },
    { key: 'glass', test: rule(/\bverres?\b|glass|cristal|crystal|murano|opaline|carafe|decanter|\bflacons?\b|pate de verre/) },
    { key: 'asia', test: p => ASIA.test(words(p).replace('encre de chine', '')) },
    { key: 'metal', test: rule(/bronze|laiton|brass|cuivre|copper|\betain\b|pewter|fer forge|wrought iron|\bargent|silver|\bmetal/) },
    { key: 'lighting', test: rule(/\blampes?\b|\blamps?\b|lustre|applique|eclairage|lighting|bougeoir|candlestick|chandelier/) },
    { key: 'pictures', test: p => !/palette|sucrier/.test(titleOnly(p)) && (/tableau|peinture|painting|huile sur|oil on|aquarelle|watercolou?r|gravure|engraving|lithograph|dessin|drawing|lavis|photo d.art|encre de chine/.test(titleOnly(p)) || ['Peintures', 'Dessins, lavis', "Photographies d'art"].includes(p.subcategory)) },
    { key: 'jewellery', test: p => !/boite a bijoux|jewel(le)?ry box/.test(titleOnly(p)) && /\bbagues?\b|collier|bracelet|bijou|pendentif|broche|jewel|necklace|pendant/.test(words(p)) },
    { key: 'furniture', test: rule(/tabouret|\bstool|\bsieges?\b|chaise|fauteuil|armchair|s[e]?ll?ette|plant stand|miroir|mirror|horloge|pendule|\bclock|meuble|furniture|\bconsole\b|chairs?\b/) },
    { key: 'antique', test: rule(/\bxix|\bxviii|\bxvii|19e|18e|17e|19th|18th|17th|objets du xixe et avant|napoleon|empire|louis (xv|xvi|philippe)/) },
  ];

  /* ---------- Langue ---------- */
  function applyLang() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => { const v = t(el.dataset.i18n); if (typeof v === 'string') el.textContent = v; });
    document.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
    $('langBtn').textContent = t('langBtn');
    $('soldTxt').textContent = t('t3p')(soldCount);
    $('langBtn').setAttribute('aria-label', t('langAria'));
    if (data.updated) $('updated').textContent = t('updated') + new Date(data.updated).toLocaleDateString(t('locale'), { day: 'numeric', month: 'long', year: 'numeric' });
  }

  /* ---------- Sections fixes ---------- */
  function renderNav() {
    const shown = items.length ? COLLECTIONS.filter(c => items.some(c.test)) : COLLECTIONS;
    const count = c => items.length ? `<small>${items.filter(c.test).length}</small>` : '';
    const all = `<button type="button" data-col="all" aria-pressed="${!filter && !favOnly}">${esc(t('cols').all)}${items.length ? `<small>${items.length}</small>` : ''}</button>`;
    $('nav').innerHTML = all + shown.map(c => `<button type="button" data-col="${c.key}" aria-pressed="${!!filter && filter.key === c.key}">${esc(t('cols')[c.key])}${count(c)}</button>`).join('');
    $('footCats').innerHTML = shown.slice(0, 6).map(c => `<li><button type="button" data-col="${c.key}">${esc(t('cols')[c.key])}</button></li>`).join('');
  }

  function renderHero() {
    const pick = re => items.find(p => re.test(p.title));
    const heroes = [pick(/lobi|stool/i), pick(/teke|fetish|statue|mask/i), pick(/chinese|japanese|dish/i)]
      .filter(Boolean).concat(items).filter((p, i, a) => a.indexOf(p) === i).slice(0, 3);
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
      return `<button type="button" class="cat" data-origin="${o.key}"><div class="ph"><img src="${esc(cover.images[0])}" alt="" loading="lazy" referrerpolicy="no-referrer"></div><h3>${esc(t('origins')[o.key])}</h3><p>${esc(t('pieces')(list.length))}</p></button>`;
    }).join('');
  }


  function renderMosaic() {
    $('mosaic').innerHTML = items.slice(8, 16).map(p => `<button type="button" data-id="${esc(p.id)}" aria-label="${esc(ttl(p))}"><img src="${esc(p.images[0])}" alt="" loading="lazy" referrerpolicy="no-referrer"></button>`).join('');
  }

  /* Déjà vendus : sold.json (objets sortis du catalogue), sans ceux remis en vente depuis. */
  function renderGone() {
    const live = new Set(items.map(p => String(p.id)));
    const list = sold.filter(s => s.image && !live.has(String(s.id))).sort((a, b) => b.goneOn.localeCompare(a.goneOn)).slice(0, 8);
    $('gone').hidden = !list.length;
    $('goneGrid').innerHTML = list.map(s => `<div class="gone-item"><div class="ph"><img src="${esc(s.image)}" alt="" loading="lazy" referrerpolicy="no-referrer"><span class="tag">${esc(t('soldTag'))}</span></div><h3>${esc(s.title)}</h3><div class="sub">${esc(tr(s.subcategory || s.category))}</div></div>`).join('');
  }

  /* ---------- Catalogue ---------- */
  function list() {
    const q = norm($('q').value.trim());
    let out = items.filter(p => (!filter || filter.test(p)) && (!favOnly || favs.includes(String(p.id))) && (!q || text(p).includes(q)));
    const sort = $('sort').value;
    if (sort === 'asc') out = out.slice().sort((a, b) => (a.price ?? 1e9) - (b.price ?? 1e9));
    if (sort === 'desc') out = out.slice().sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
    return out;
  }

  const isNew = p => { const d = (p.listed || p.firstSeen || '').slice(0, 10); return !!d && Date.now() - new Date(d) < 7 * 864e5; };

  function card(p) {
    const on = favs.includes(String(p.id));
    return `<div class="card"><a class="open" href="${esc(p.page || '#')}" data-id="${esc(p.id)}" style="display:block">
      <div class="ph"><img src="${esc(p.images[0])}" alt="${esc(ttl(p))}" loading="lazy" referrerpolicy="no-referrer"><span class="tag${isNew(p) ? ' new' : ''}">${esc(t(isNew(p) ? 'fresh' : 'unique'))}</span></div>
      <h3>${esc(ttl(p))}</h3><div class="sub">${esc(tr(p.subcategory || p.category))}</div><div class="pr">${esc(money(p))}</div></a>
      <button type="button" class="heart${on ? ' on' : ''}" data-fav="${esc(p.id)}" aria-pressed="${on}" aria-label="${esc(on ? t('favRemove') : t('favAdd'))}">${heartSvg}</button></div>`;
  }

  function renderGrid() {
    const all = list();
    const title = favOnly ? t('favFilter') : filter ? filter.label : t('collection');
    $('colTitle').textContent = title;
    $('count').textContent = t('pieces')(all.length);
    $('clearFilter').hidden = !filter && !favOnly;
    document.querySelectorAll('#nav [data-col]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.col === (filter ? filter.key : favOnly ? '' : 'all'))));
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
    renderGrid();
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
    favs = favs.includes(id) ? favs.filter(x => x !== id) : [...favs, id];
    saveFavs();
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
    $('thumbs').innerHTML = imgs.length > 1 ? imgs.map((src, i) => `<button type="button" data-i="${i}" aria-label="${esc(t('photo'))} ${i + 1}"><img src="${esc(src)}" alt="" loading="lazy" referrerpolicy="no-referrer"></button>`).join('') : '';
    $('thumbs').onclick = e => { const b = e.target.closest('[data-i]'); if (b) show(Number(b.dataset.i)); };
    show(0);
    $('sheetCat').textContent = [tr(p.category), tr(p.subcategory)].filter(Boolean).join(' · ');
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
    const rows = [[t('category'), tr(p.category)], [t('detail'), tr(p.subcategory)], [t('condition'), tr(p.condition)], [t('shipping'), t('shipFrom')], [t('ref'), p.example ? '' : p.id]].filter(r => r[1]);
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
    if (col) { closeSide(); const c = COLLECTIONS.find(x => x.key === col.dataset.col); setFilter(filter && filter.key === c.key ? null : { key: c.key, label: t('cols')[c.key], test: c.test }); return; }
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
    if (filter && COLLECTIONS.some(c => c.key === filter.key)) filter.label = t('cols')[filter.key];
    if (filter && filter.key.startsWith('origin:')) filter.label = t('origins')[filter.key.slice(7)];
    renderAll();
  });

  function renderAll() {
    applyLang();
    if (!items.length) return;
    renderNav(); renderHero(); renderCats(); renderMosaic(); renderGrid(); renderGone();
  }

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
