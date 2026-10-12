/* Vitrine : lit products.json, affiche les objets, filtre, trie et ouvre la fiche.
   Bilingue : français par défaut, anglais pour les navigateurs non francophones. */
(function () {
  const $ = id => document.getElementById(id);
  let data = { items: [] }, active = 'all';

  /* ---------- Traductions ---------- */
  const T = {
    fr: {
      'nav.collection': 'Collection', 'nav.house': 'La maison', store: 'Boutique eBay ↗', theme: 'Changer de thème',
      eyebrow: 'Cabinet de curiosités',
      hero: 'Art africain, objets anciens et curiosités, <em>choisis un par un.</em>',
      'fact.sold': '<b>176</b> objets déjà vendus', 'fact.reviews': "<b>100 %</b> d'avis positifs", 'fact.ship': '<b>Aude</b> expédié depuis le sud de la France',
      notice: "<b>Aperçu.</b> Ces objets sont un échantillon de la boutique, sans leurs photos. Le catalogue complet, avec photos et prix à jour, s'affichera automatiquement une fois la vitrine reliée à eBay.",
      'search.label': 'Rechercher', 'search.ph': 'Rechercher un objet, une origine, une matière…',
      'sort.label': 'Trier', 'sort.recent': 'Ajouts récents', 'sort.asc': 'Prix croissant', 'sort.desc': 'Prix décroissant',
      'house.eyebrow': 'La maison', 'house.title': 'Des objets qui ont déjà eu une vie.',
      'house.p1': "Derrière Les Dinedourelles, il y a Jean-Pierre Cartier, collectionneur et brocanteur. Depuis quinze ans, il tient une brocante à Pézenas, dans l'Hérault.",
      'house.p2': 'Les objets viennent des brocantes du sud de la France et de ses voyages en Afrique : statuaire, mobilier, instruments anciens, céramiques et objets de collection, chacun choisi pour son histoire.',
      'house.p3': "Les ventes passent par eBay, qui assure le paiement et le suivi. Les colis partent d'Escales ou de Lézignan-Corbières, dans l'Aude.",
      insta: 'Les nouveautés et la brocante, sur Instagram',
      'sheet.note': 'Commande, paiement et livraison se font sur eBay.', close: 'Fermer',
      all: 'Tout', one: 'objet', many: 'objets', emptyT: 'Aucun objet ne correspond', emptyS: 'Essayez un autre mot ou une autre catégorie.',
      errT: 'Catalogue indisponible', errS: 'Rechargez la page dans un instant, ou consultez directement la boutique eBay.',
      onEbay: 'Voir sur eBay ↗', storeBtn: 'Voir la boutique eBay ↗', priceOnEbay: 'Prix sur eBay',
      condition: 'État', place: 'Lieu', ref: 'Référence', updated: 'Catalogue mis à jour le ', photo: 'Photo',
      langBtn: 'EN', langAria: 'Switch to English', locale: 'fr-FR', cats: 'Catégories',
    },
    en: {
      'nav.collection': 'Collection', 'nav.house': 'About', store: 'eBay store ↗', theme: 'Change theme',
      eyebrow: 'Cabinet of curiosities',
      hero: 'African art, antiques and curiosities, <em>chosen one by one.</em>',
      'fact.sold': '<b>176</b> items already sold', 'fact.reviews': '<b>100%</b> positive feedback', 'fact.ship': '<b>France</b> shipped from the south of France',
      notice: '<b>Preview.</b> These items are a sample of the store, without their photos. The full catalogue, with photos and current prices, will appear automatically once the showcase is connected to eBay.',
      'search.label': 'Search', 'search.ph': 'Search for an object, an origin, a material…',
      'sort.label': 'Sort', 'sort.recent': 'Newest first', 'sort.asc': 'Price: low to high', 'sort.desc': 'Price: high to low',
      'house.eyebrow': 'About', 'house.title': 'Objects that have already lived a life.',
      'house.p1': 'Les Dinedourelles is run by Jean-Pierre Cartier, a collector and antiques dealer. He has kept a stall in Pézenas, in the south of France, for fifteen years.',
      'house.p2': 'The pieces come from flea markets across southern France and from his travels in Africa: statues, furniture, antique instruments, ceramics and collectibles, each chosen for its story.',
      'house.p3': 'Sales go through eBay, which handles payment and tracking. Parcels ship from Escales or Lézignan-Corbières, in the Aude region of France.',
      insta: 'New finds and the market stall, on Instagram',
      'sheet.note': 'Ordering, payment and delivery take place on eBay.', close: 'Close',
      all: 'All', one: 'item', many: 'items', emptyT: 'No matching items', emptyS: 'Try another word or category.',
      errT: 'Catalogue unavailable', errS: 'Reload the page in a moment, or visit the eBay store directly.',
      onEbay: 'View on eBay ↗', storeBtn: 'Visit the eBay store ↗', priceOnEbay: 'Price on eBay',
      condition: 'Condition', place: 'Location', ref: 'Reference', updated: 'Catalogue updated ', photo: 'Photo',
      langBtn: 'FR', langAria: 'Passer en français', locale: 'en-US', cats: 'Categories',
    },
  };
  const CAT_EN = {
    'Antiquités': 'Antiques', 'Art': 'Art', 'Objets de collection': 'Collectibles', 'Poterie et verre': 'Pottery & glass',
    'Jouets et modélisme': 'Toys & models', 'Bijoux et montres': 'Jewellery & watches', 'Maison et jardin': 'Home & garden',
    'Livres': 'Books', 'Instruments de musique': 'Musical instruments', 'Timbres': 'Stamps', 'Monnaies': 'Coins',
    'Poupées et ours': 'Dolls & bears', 'Souvenirs de divertissement': 'Entertainment memorabilia', 'Souvenirs sportifs': 'Sports memorabilia',
    'Vêtements et accessoires': 'Clothing & accessories', 'Commerce et industrie': 'Business & industrial', 'Loisirs créatifs': 'Crafts',
    'Photo': 'Cameras', 'Électronique': 'Electronics', 'Sport': 'Sporting goods',
    'Art africain': 'African art', 'Armes anciennes': 'Antique weapons', 'Sculptures': 'Sculptures', 'Dessins': 'Drawings',
    'Boîtes à musique': 'Music boxes', 'Mobilier': 'Furniture', 'Médecine ancienne': 'Antique medical', 'Cristal': 'Crystal',
    'Céramique': 'Ceramics', 'Cartes': 'Maps', 'Objets religieux': 'Religious objects', 'Occasion': 'Used',
  };

  let lang = 'fr';
  try { lang = localStorage.getItem('dd_lang') || ''; } catch (e) {}
  if (lang !== 'fr' && lang !== 'en') lang = /^fr/i.test(navigator.language || 'fr') ? 'fr' : 'en';
  const t = k => T[lang][k];
  const tr = s => (lang === 'en' && CAT_EN[s]) || s;

  function applyLang() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
    $('langBtn').textContent = t('langBtn');
    $('langBtn').setAttribute('aria-label', t('langAria'));
    $('chips').setAttribute('aria-label', t('cats'));
    if (data.updated) $('updated').textContent = t('updated') + new Date(data.updated).toLocaleDateString(t('locale'), { day: 'numeric', month: 'long', year: 'numeric' });
  }

  /* ---------- Catalogue ---------- */
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const money = p => p.price == null ? t('priceOnEbay')
    : new Intl.NumberFormat(t('locale'), { style: 'currency', currency: p.currency || 'EUR', maximumFractionDigits: 2 }).format(p.price);
  const initial = s => (String(s || '?').trim()[0] || '?').toUpperCase();
  const inv = p => p.example ? 'Inv. —' : 'Inv. ' + p.id;

  function plinth(p, i) {
    const img = p.images && p.images[0];
    return img
      ? `<img src="${esc(img)}" alt="${esc(p.title)}" loading="${i < 6 ? 'eager' : 'lazy'}" referrerpolicy="no-referrer">`
      : `<span class="ghost" aria-hidden="true">${esc(initial(p.title))}</span>`;
  }

  function filtered() {
    const q = norm($('q').value);
    let list = data.items.filter(p => (active === 'all' || p.category === active)
      && (!q || norm([p.title, p.category, p.subcategory, tr(p.category), tr(p.subcategory), p.condition].join(' ')).includes(q)));
    const sort = $('sort').value;
    if (sort === 'asc') list = list.slice().sort((a, b) => (a.price ?? 1e9) - (b.price ?? 1e9));
    if (sort === 'desc') list = list.slice().sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
    return list;
  }

  function renderChips() {
    const counts = {};
    data.items.forEach(p => { counts[p.category] = (counts[p.category] || 0) + 1; });
    const cats = ['all', ...Object.keys(counts).sort((a, b) => counts[b] - counts[a])];
    $('chips').innerHTML = cats.map(c => `<button class="chip" type="button" aria-pressed="${c === active}" data-cat="${esc(c)}">${esc(c === 'all' ? t('all') : tr(c))}<span>${c === 'all' ? data.items.length : counts[c]}</span></button>`).join('');
  }

  function render() {
    const list = filtered();
    $('count').textContent = list.length + ' ' + (list.length > 1 ? t('many') : t('one'));
    $('grid').innerHTML = list.length ? list.map((p, i) => `
      <button class="piece" type="button" data-id="${esc(p.id)}">
        <div class="plinth">${plinth(p, i)}</div>
        <div class="cartel">
          <p class="cat">${esc(tr(p.subcategory || p.category))}</p>
          <h3>${esc(p.title)}</h3>
          <div class="meta"><span class="inv">${esc(inv(p))}</span><p class="price">${esc(money(p))}</p></div>
        </div>
      </button>`).join('')
      : `<div class="empty"><strong>${t('emptyT')}</strong>${t('emptyS')}</div>`;
  }

  function open(id) {
    const p = data.items.find(x => String(x.id) === String(id));
    if (!p) return;
    const imgs = p.images || [];
    const show = i => {
      $('stage').innerHTML = imgs[i] ? `<img src="${esc(imgs[i])}" alt="${esc(p.title)}" referrerpolicy="no-referrer">` : `<span class="ghost" aria-hidden="true">${esc(initial(p.title))}</span>`;
      $('thumbs').querySelectorAll('button').forEach((b, j) => b.setAttribute('aria-current', j === i));
    };
    $('thumbs').innerHTML = imgs.length > 1 ? imgs.map((src, i) => `<button type="button" data-i="${i}" aria-label="${t('photo')} ${i + 1}"><img src="${esc(src)}" alt="" loading="lazy" referrerpolicy="no-referrer"></button>`).join('') : '';
    $('thumbs').onclick = e => { const b = e.target.closest('[data-i]'); if (b) show(Number(b.dataset.i)); };
    show(0);
    $('sheetCat').textContent = [tr(p.category), tr(p.subcategory)].filter(Boolean).join(' · ');
    $('sheetTitle').textContent = p.title;
    const rows = [[t('condition'), tr(p.condition)], [t('place'), p.location], [t('ref'), p.example ? '' : p.id]].filter(r => r[1]);
    $('sheetSpecs').innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('');
    $('sheetPrice').textContent = money(p);
    $('sheetBuy').href = p.url || data.storeUrl;
    $('sheetBuy').textContent = p.example ? t('storeBtn') : t('onEbay');
    $('sheet').showModal();
  }

  $('grid').addEventListener('click', e => { const b = e.target.closest('.piece'); if (b) open(b.dataset.id); });
  $('chips').addEventListener('click', e => { const b = e.target.closest('.chip'); if (!b) return; active = b.dataset.cat; renderChips(); render(); });
  $('q').addEventListener('input', render);
  $('sort').addEventListener('change', render);
  $('closeSheet').addEventListener('click', () => $('sheet').close());
  $('sheet').addEventListener('click', e => { if (e.target === $('sheet')) $('sheet').close(); });

  $('langBtn').addEventListener('click', () => {
    lang = lang === 'fr' ? 'en' : 'fr';
    try { localStorage.setItem('dd_lang', lang); } catch (e) {}
    applyLang(); renderChips(); render();
  });

  $('themeBtn').addEventListener('click', () => {
    const root = document.documentElement;
    const dark = root.getAttribute('data-theme') === 'dark'
      || (!root.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
    const next = dark ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('dd_theme', next); } catch (e) {}
  });

  applyLang();
  fetch('products.json', { cache: 'no-cache' })
    .then(r => r.json())
    .then(d => {
      data = d;
      ['storeLink', 'storeLink2'].forEach(id => { if (d.storeUrl) $(id).href = d.storeUrl; });
      $('exampleNotice').hidden = !d.items.some(p => p.example);
      applyLang(); renderChips(); render();
    })
    .catch(() => { $('grid').innerHTML = `<div class="empty"><strong>${t('errT')}</strong>${t('errS')}</div>`; });
})();
