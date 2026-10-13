/* Les Dinedourelles — vitrine : lit products.json (mis à jour depuis eBay),
   affiche carrousel, catégories, tranches de prix, catalogue filtrable,
   favoris et fiche objet. Bilingue français / anglais. */
(function () {
  const $ = id => document.getElementById(id);
  const PAGE = 24;
  let data = { items: [] }, items = [];
  let filter = null, favOnly = false, shown = PAGE, slide = 0, timer = null;

  /* ---------- Traductions ---------- */
  const T = {
    fr: {
      promo: "Nouveautés chaque semaine · <b>Expédition soignée depuis l'Aude</b> · Paiement sécurisé par eBay",
      searchLabel: 'Rechercher', searchPh: 'Rechercher une pièce, une origine, une matière…',
      favs: 'Favoris', store: 'Boutique eBay', langBtn: 'EN', langAria: 'Switch to English',
      heroKicker: 'Cabinet de curiosités · Pézenas', heroTitle: 'Des pièces uniques, <i>chinées une à une.</i>',
      heroText: 'Art africain, céramiques signées, verrerie et objets anciens choisis par Jean-Pierre Cartier, brocanteur depuis quinze ans.',
      heroCta: n => `Découvrir les ${n} pièces →`,
      byCat: 'Acheter par catégorie', byPrice: 'Acheter par prix', collection: 'La collection',
      pieces: n => n + (n > 1 ? ' pièces' : ' pièce'), piecesArrow: n => `${n} ${n > 1 ? 'pièces' : 'pièce'} →`,
      sortLabel: 'Trier', sortRecent: "Nouveautés d'abord", sortAsc: 'Prix croissant', sortDesc: 'Prix décroissant',
      more: n => `Voir ${n} pièces de plus`, unique: 'Pièce unique', favAdd: 'Ajouter aux favoris', favRemove: 'Retirer des favoris',
      favFilter: 'Mes favoris', emptyT: 'Aucune pièce ne correspond', emptyS: 'Essayez un autre mot ou une autre rubrique.',
      emptyFav: 'Touchez le cœur d’une pièce pour la retrouver ici.',
      t1: 'Paiement sécurisé', t1p: 'Chaque achat passe par eBay et sa garantie client.',
      t2: 'Envoi soigné', t2p: "Emballé à la main et expédié depuis l'Aude.",
      t3: "100 % d'avis positifs", t3p: 'Plus de 176 objets déjà vendus sur eBay.',
      t4: 'Arrivages réguliers', t4p: 'De nouvelles pièces chaque semaine, chinées en brocante.',
      houseKicker: 'La maison', houseTitle: 'La brocante en coulisses',
      houseText: "Derrière Les Dinedourelles, il y a Jean-Pierre Cartier, collectionneur et brocanteur. Depuis quinze ans, il tient une brocante à Pézenas, dans l'Hérault. Les objets viennent des brocantes du sud de la France et de ses voyages en Afrique. Les colis partent d'Escales ou de Lézignan-Corbières, dans l'Aude.",
      instaCta: 'Suivre sur Instagram', linktreeCta: 'Linktree ↗',
      linktreeNote: '@broc_deco_les_dinedourelles · Selency, Vinted, WhatsApp et Facebook sur son Linktree', footText: "Art africain, objets anciens et curiosités. Brocante à Pézenas, envois depuis l'Aude.",
      footCol: 'Collection', footBuy: 'Acheter', footHouse: 'La maison', footStory: 'Notre histoire',
      updated: 'Catalogue mis à jour le ', close: 'Fermer', sheetNote: 'Commande, paiement et livraison se font sur eBay.',
      buy: 'Acheter sur eBay ↗', seeStore: 'Voir la boutique eBay ↗', category: 'Catégorie', detail: 'Détail', condition: 'État',
      shipping: 'Expédition', shipFrom: "Depuis l'Aude, France", ref: 'Référence', photo: 'Photo', priceOnEbay: 'Prix sur eBay',
      locale: 'fr-FR', under: a => `Moins de ${a}`, between: (a, b) => `${a} à ${b}`, over: a => `Plus de ${a}`,
      cols: { africa: 'Arts premiers', ceramics: 'Céramiques', glass: 'Verrerie', asia: 'Asie', collect: 'Objets de collection', cheap: 'Moins de 100 $', all: 'Toute la collection' },
    },
    en: {
      promo: 'New finds every week · <b>Carefully shipped from the south of France</b> · Secure payment through eBay',
      searchLabel: 'Search', searchPh: 'Search for a piece, an origin, a material…',
      favs: 'Favourites', store: 'eBay store', langBtn: 'FR', langAria: 'Passer en français',
      heroKicker: 'Cabinet of curiosities · Pézenas', heroTitle: 'Unique pieces, <i>found one by one.</i>',
      heroText: 'African art, signed ceramics, glassware and antiques chosen by Jean-Pierre Cartier, an antiques dealer for fifteen years.',
      heroCta: n => `Discover all ${n} pieces →`,
      byCat: 'Shop by category', byPrice: 'Shop by price', collection: 'The collection',
      pieces: n => n + (n > 1 ? ' pieces' : ' piece'), piecesArrow: n => `${n} ${n > 1 ? 'pieces' : 'piece'} →`,
      sortLabel: 'Sort', sortRecent: 'Newest first', sortAsc: 'Price: low to high', sortDesc: 'Price: high to low',
      more: n => `Show ${n} more pieces`, unique: 'One of a kind', favAdd: 'Add to favourites', favRemove: 'Remove from favourites',
      favFilter: 'My favourites', emptyT: 'No matching pieces', emptyS: 'Try another word or section.',
      emptyFav: 'Tap the heart on a piece to keep it here.',
      t1: 'Secure payment', t1p: 'Every purchase goes through eBay and its buyer guarantee.',
      t2: 'Careful shipping', t2p: 'Hand-packed and shipped from the Aude, France.',
      t3: '100% positive feedback', t3p: 'More than 176 items already sold on eBay.',
      t4: 'Regular new arrivals', t4p: 'New pieces every week, found at flea markets.',
      houseKicker: 'About', houseTitle: 'Behind the stall',
      houseText: 'Les Dinedourelles is run by Jean-Pierre Cartier, a collector and antiques dealer. He has kept a stall in Pézenas, in the south of France, for fifteen years. The pieces come from flea markets across southern France and from his travels in Africa. Parcels ship from Escales or Lézignan-Corbières, in the Aude region.',
      instaCta: 'Follow on Instagram', linktreeCta: 'Linktree ↗',
      linktreeNote: '@broc_deco_les_dinedourelles · Selency, Vinted, WhatsApp and Facebook on his Linktree', footText: 'African art, antiques and curiosities. Antiques stall in Pézenas, shipping from the Aude, France.',
      footCol: 'Collection', footBuy: 'Shop', footHouse: 'About', footStory: 'Our story',
      updated: 'Catalogue updated ', close: 'Close', sheetNote: 'Ordering, payment and delivery take place on eBay.',
      buy: 'Buy on eBay ↗', seeStore: 'Visit the eBay store ↗', category: 'Category', detail: 'Detail', condition: 'Condition',
      shipping: 'Shipping', shipFrom: 'From the Aude, France', ref: 'Reference', photo: 'Photo', priceOnEbay: 'Price on eBay',
      locale: 'en-US', under: a => `Under ${a}`, between: (a, b) => `${a} to ${b}`, over: a => `Over ${a}`,
      cols: { africa: 'Tribal art', ceramics: 'Ceramics', glass: 'Glassware', asia: 'Asian art', collect: 'Collectibles', cheap: 'Under $100', all: 'Whole collection' },
    },
  };
  const CAT_EN = { 'Antiquités': 'Antiques', 'Art': 'Art', 'Objets de collection': 'Collectibles', 'Poterie et verre': 'Pottery & glass', 'Jouets et modélisme': 'Toys & models', 'Bijoux et montres': 'Jewellery & watches', 'Maison et jardin': 'Home & garden', 'Livres': 'Books', 'Occasion': 'Used' };

  let lang = '';
  try { lang = localStorage.getItem('dd_lang') || ''; } catch (e) {}
  if (lang !== 'en') lang = 'fr'; // français par défaut, anglais seulement si le visiteur le choisit
  const t = k => T[lang][k];
  const tr = s => (lang === 'en' && CAT_EN[s]) || s;

  let favs = [];
  try { favs = JSON.parse(localStorage.getItem('dd_favs') || '[]'); } catch (e) {}
  const saveFavs = () => { try { localStorage.setItem('dd_favs', JSON.stringify(favs)); } catch (e) {} };

  /* ---------- Outils ---------- */
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const cur = () => (items[0] && items[0].currency) || 'USD';
  const fmt = (v, c) => new Intl.NumberFormat(t('locale'), { style: 'currency', currency: c || cur(), maximumFractionDigits: 0 }).format(v);
  const money = p => p.price == null ? t('priceOnEbay') : new Intl.NumberFormat(t('locale'), { style: 'currency', currency: p.currency || cur(), minimumFractionDigits: 2 }).format(p.price);
  const text = p => norm([p.title, p.category, p.subcategory].join(' '));
  const heartSvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.5 3 4.5 6.8 4.5c2.2 0 3.6 1.2 5.2 3 1.6-1.8 3-3 5.2-3 3.8 0 5.9 4 4.4 7.3C19.5 16.4 12 21 12 21Z"/></svg>';

  /* Rubriques du menu : règles de tri sur le titre, la catégorie et le détail eBay. */
  const COLLECTIONS = [
    { key: 'africa', test: p => /ethni|afric|tribal|congo|lobi|teke|baoul|dogon|senouf|senufo|fang|yoruba|ashanti|bambara|kota|fetich|fetish|mask|masque/.test(text(p)) },
    { key: 'ceramics', test: p => /ceram|faience|porcelain|porcelaine|gres|stoneware|poterie|pottery|earthenware|terre cuite/.test(text(p)) },
    { key: 'glass', test: p => /verre|glass|cristal|crystal|murano|opaline|carafe|decanter/.test(text(p)) },
    { key: 'asia', test: p => /asiat|chin|japan|japon|asian|satsuma|imari/.test(text(p)) },
    { key: 'collect', test: p => p.category === 'Objets de collection' },
    { key: 'cheap', test: p => p.price != null && p.price < 100, hot: true },
  ];

  /* ---------- Langue ---------- */
  function applyLang() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => { const v = t(el.dataset.i18n); if (typeof v === 'string') el.textContent = v; });
    document.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
    $('langBtn').textContent = t('langBtn');
    $('langBtn').setAttribute('aria-label', t('langAria'));
    if (data.updated) $('updated').textContent = t('updated') + new Date(data.updated).toLocaleDateString(t('locale'), { day: 'numeric', month: 'long', year: 'numeric' });
  }

  /* ---------- Sections fixes ---------- */
  function renderNav() {
    $('nav').innerHTML = COLLECTIONS.map(c => `<button type="button" data-col="${c.key}" class="${c.hot ? 'hot' : ''}" aria-pressed="${filter && filter.key === c.key}">${esc(t('cols')[c.key])}</button>`).join('');
    $('footCats').innerHTML = COLLECTIONS.slice(0, 5).map(c => `<li><button type="button" data-col="${c.key}">${esc(t('cols')[c.key])}</button></li>`).join('');
  }

  function renderHero() {
    const pick = re => items.find(p => re.test(p.title));
    const heroes = [pick(/lobi|stool/i), pick(/teke|fetish|statue|mask/i), pick(/chinese|japanese|dish/i)]
      .filter(Boolean).concat(items).filter((p, i, a) => a.indexOf(p) === i).slice(0, 3);
    $('heroImgs').innerHTML = heroes.map((p, i) => `<button type="button" class="${i === slide ? 'on' : ''}" data-id="${esc(p.id)}" aria-label="${esc(p.title)}"><img src="${esc(p.images[0])}" alt="${esc(p.title)}" ${i ? 'loading="lazy"' : ''} referrerpolicy="no-referrer"><span class="cap">${esc(p.title)} · ${esc(money(p))}</span></button>`).join('');
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

  function renderCats() {
    const byCat = {};
    items.forEach(p => (byCat[p.category] = byCat[p.category] || []).push(p));
    const cats = Object.entries(byCat).sort((a, b) => b[1].length - a[1].length).slice(0, 4);
    $('cats').innerHTML = cats.map(([c, list]) => `<button type="button" class="cat" data-cat="${esc(c)}"><div class="ph"><img src="${esc(list[0].images[0])}" alt="" loading="lazy" referrerpolicy="no-referrer"></div><h3>${esc(tr(c))}</h3><p>${esc(t('pieces')(list.length))}</p></button>`).join('');
  }

  const BANDS = [[0, 100], [100, 200], [200, 400], [400, Infinity]];
  function bandLabel([a, b]) { return a === 0 ? t('under')(fmt(b)) : b === Infinity ? t('over')(fmt(a)) : t('between')(fmt(a), fmt(b)); }
  function renderPrices() {
    $('prices').innerHTML = BANDS.map((b, i) => {
      const n = items.filter(p => p.price != null && p.price >= b[0] && p.price < b[1]).length;
      return `<button type="button" class="price-tile" data-band="${i}"><b>${esc(bandLabel(b))}</b><span>${esc(t('piecesArrow')(n))}</span></button>`;
    }).join('');
  }

  function renderMosaic() {
    $('mosaic').innerHTML = items.slice(8, 16).map(p => `<button type="button" data-id="${esc(p.id)}" aria-label="${esc(p.title)}"><img src="${esc(p.images[0])}" alt="" loading="lazy" referrerpolicy="no-referrer"></button>`).join('');
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

  function card(p) {
    const on = favs.includes(String(p.id));
    return `<div class="card"><button type="button" class="open" data-id="${esc(p.id)}" style="display:block;width:100%;text-align:left">
      <div class="ph"><img src="${esc(p.images[0])}" alt="${esc(p.title)}" loading="lazy" referrerpolicy="no-referrer"><span class="tag">${esc(t('unique'))}</span></div>
      <h3>${esc(p.title)}</h3><div class="sub">${esc(p.subcategory || tr(p.category))}</div><div class="pr">${esc(money(p))}</div></button>
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
    document.querySelectorAll('#nav [data-col]').forEach(b => b.setAttribute('aria-pressed', !!filter && filter.key === b.dataset.col));
  }

  function setFilter(f, scroll = true) {
    filter = f; favOnly = false; shown = PAGE;
    renderGrid();
    if (scroll) $('collection').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

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
      $('stage').innerHTML = imgs[i] ? `<img src="${esc(imgs[i])}" alt="${esc(p.title)}" referrerpolicy="no-referrer">` : '';
      $('thumbs').querySelectorAll('button').forEach((b, j) => b.setAttribute('aria-current', j === i));
    };
    $('thumbs').innerHTML = imgs.length > 1 ? imgs.map((src, i) => `<button type="button" data-i="${i}" aria-label="${esc(t('photo'))} ${i + 1}"><img src="${esc(src)}" alt="" loading="lazy" referrerpolicy="no-referrer"></button>`).join('') : '';
    $('thumbs').onclick = e => { const b = e.target.closest('[data-i]'); if (b) show(Number(b.dataset.i)); };
    show(0);
    $('sheetCat').textContent = [tr(p.category), p.subcategory].filter(Boolean).join(' · ');
    $('sheetTitle').textContent = p.title;
    $('sheetPrice').textContent = money(p);
    $('sheetBuy').href = p.url || data.storeUrl;
    $('sheetBuy').textContent = p.example ? t('seeStore') : t('buy');
    renderSheetFav();
    const rows = [[t('category'), tr(p.category)], [t('detail'), p.subcategory], [t('condition'), tr(p.condition)], [t('shipping'), t('shipFrom')], [t('ref'), p.example ? '' : p.id]].filter(r => r[1]);
    $('sheetSpecs').innerHTML = rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
    $('sheet').showModal();
  }
  function renderSheetFav() {
    if (!current) return;
    const on = favs.includes(String(current.id));
    $('sheetFav').innerHTML = `${heartSvg.replace('<svg', `<svg style="width:18px;height:18px;fill:${on ? 'currentColor' : 'none'};stroke:currentColor;stroke-width:1.7"`)} ${esc(on ? t('favRemove') : t('favAdd'))}`;
  }

  /* ---------- Événements ---------- */
  document.addEventListener('click', e => {
    const fav = e.target.closest('[data-fav]');
    if (fav) { toggleFav(fav.dataset.fav); renderGrid(); return; }
    const col = e.target.closest('[data-col]');
    if (col) { const c = COLLECTIONS.find(x => x.key === col.dataset.col); setFilter(filter && filter.key === c.key ? null : { key: c.key, label: t('cols')[c.key], test: c.test }); return; }
    const cat = e.target.closest('[data-cat]');
    if (cat) { const c = cat.dataset.cat; setFilter({ key: 'cat:' + c, label: tr(c), test: p => p.category === c }); return; }
    const band = e.target.closest('[data-band]');
    if (band) { const b = BANDS[Number(band.dataset.band)]; setFilter({ key: 'band' + band.dataset.band, label: bandLabel(b), test: p => p.price != null && p.price >= b[0] && p.price < b[1] }); return; }
    const opener = e.target.closest('[data-id]');
    if (opener && !opener.closest('#sheet')) { open(opener.dataset.id); }
  });
  $('clearFilter').addEventListener('click', () => { favOnly = false; setFilter(null, false); });
  $('favBtn').addEventListener('click', () => { favOnly = !favOnly; filter = null; shown = PAGE; renderGrid(); $('collection').scrollIntoView({ behavior: 'smooth' }); });
  $('moreBtn').addEventListener('click', () => { shown += PAGE; renderGrid(); });
  $('q').addEventListener('input', () => { shown = PAGE; renderGrid(); });
  $('q').addEventListener('keydown', e => { if (e.key === 'Enter') $('collection').scrollIntoView({ behavior: 'smooth' }); });
  $('sort').addEventListener('change', () => { shown = PAGE; renderGrid(); });
  $('sheetFav').addEventListener('click', () => { if (current) { toggleFav(current.id); renderSheetFav(); renderGrid(); } });
  $('closeSheet').addEventListener('click', () => $('sheet').close());
  $('sheet').addEventListener('click', e => { if (e.target === $('sheet')) $('sheet').close(); });
  $('langBtn').addEventListener('click', () => {
    lang = lang === 'fr' ? 'en' : 'fr';
    try { localStorage.setItem('dd_lang', lang); } catch (e) {}
    if (filter && COLLECTIONS.some(c => c.key === filter.key)) filter.label = t('cols')[filter.key];
    renderAll();
  });

  function renderAll() {
    applyLang();
    if (!items.length) return;
    renderNav(); renderHero(); renderCats(); renderPrices(); renderMosaic(); renderGrid();
  }

  $('year').textContent = new Date().getFullYear();
  applyLang();
  renderNav();
  fetch('products.json', { cache: 'no-cache' })
    .then(r => r.json())
    .then(d => {
      data = d;
      items = d.items.filter(p => p.images && p.images.length);
      if (d.storeUrl) $('storeLink').href = d.storeUrl;
      renderAll();
    })
    .catch(() => { $('grid').innerHTML = `<div class="empty"><strong>${esc(t('emptyT'))}</strong></div>`; });
})();
