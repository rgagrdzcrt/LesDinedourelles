/* Vitrine : lit products.json, affiche les objets, filtre, trie et ouvre la fiche. */
(function () {
  const $ = id => document.getElementById(id);
  let data = { items: [] }, active = 'Tout';

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const money = p => p.price == null ? 'Prix sur eBay'
    : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: p.currency || 'EUR', maximumFractionDigits: 2 }).format(p.price);
  const initial = t => (String(t || '?').trim()[0] || '?').toUpperCase();
  const inv = p => p.example ? 'Inv. —' : 'Inv. ' + p.id;

  function plinth(p, i) {
    const img = p.images && p.images[0];
    return img
      ? `<img src="${esc(img)}" alt="${esc(p.title)}" loading="${i < 6 ? 'eager' : 'lazy'}" referrerpolicy="no-referrer">`
      : `<span class="ghost" aria-hidden="true">${esc(initial(p.title))}</span>`;
  }

  function filtered() {
    const q = norm($('q').value);
    let list = data.items.filter(p => (active === 'Tout' || p.category === active)
      && (!q || norm([p.title, p.category, p.subcategory, p.condition].join(' ')).includes(q)));
    const sort = $('sort').value;
    if (sort === 'asc') list = list.slice().sort((a, b) => (a.price ?? 1e9) - (b.price ?? 1e9));
    if (sort === 'desc') list = list.slice().sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
    return list;
  }

  function renderChips() {
    const counts = {};
    data.items.forEach(p => { counts[p.category] = (counts[p.category] || 0) + 1; });
    const cats = ['Tout', ...Object.keys(counts).sort((a, b) => counts[b] - counts[a])];
    $('chips').innerHTML = cats.map(c => `<button class="chip" type="button" aria-pressed="${c === active}" data-cat="${esc(c)}">${esc(c)}<span>${c === 'Tout' ? data.items.length : counts[c]}</span></button>`).join('');
  }

  function render() {
    const list = filtered();
    $('count').textContent = list.length + (list.length > 1 ? ' objets' : ' objet');
    $('grid').innerHTML = list.length ? list.map((p, i) => `
      <button class="piece" type="button" data-id="${esc(p.id)}">
        <div class="plinth">${plinth(p, i)}</div>
        <div class="cartel">
          <p class="cat">${esc(p.subcategory || p.category)}</p>
          <h3>${esc(p.title)}</h3>
          <div class="meta"><span class="inv">${esc(inv(p))}</span><p class="price">${esc(money(p))}</p></div>
        </div>
      </button>`).join('')
      : '<div class="empty"><strong>Aucun objet ne correspond</strong>Essayez un autre mot ou une autre catégorie.</div>';
  }

  function open(id) {
    const p = data.items.find(x => String(x.id) === String(id));
    if (!p) return;
    const imgs = p.images || [];
    const show = i => {
      $('stage').innerHTML = imgs[i] ? `<img src="${esc(imgs[i])}" alt="${esc(p.title)}" referrerpolicy="no-referrer">` : `<span class="ghost" aria-hidden="true">${esc(initial(p.title))}</span>`;
      $('thumbs').querySelectorAll('button').forEach((b, j) => b.setAttribute('aria-current', j === i));
    };
    $('thumbs').innerHTML = imgs.length > 1 ? imgs.map((src, i) => `<button type="button" data-i="${i}" aria-label="Photo ${i + 1}"><img src="${esc(src)}" alt="" loading="lazy" referrerpolicy="no-referrer"></button>`).join('') : '';
    $('thumbs').onclick = e => { const b = e.target.closest('[data-i]'); if (b) show(Number(b.dataset.i)); };
    show(0);
    $('sheetCat').textContent = [p.category, p.subcategory].filter(Boolean).join(' · ');
    $('sheetTitle').textContent = p.title;
    const rows = [['État', p.condition], ['Lieu', p.location], ['Référence', p.example ? '' : p.id]].filter(r => r[1]);
    $('sheetSpecs').innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('');
    $('sheetPrice').textContent = money(p);
    $('sheetBuy').href = p.url || data.storeUrl;
    $('sheetBuy').textContent = p.example ? 'Voir la boutique eBay ↗' : 'Voir sur eBay ↗';
    $('sheet').showModal();
  }

  $('grid').addEventListener('click', e => { const b = e.target.closest('.piece'); if (b) open(b.dataset.id); });
  $('chips').addEventListener('click', e => { const b = e.target.closest('.chip'); if (!b) return; active = b.dataset.cat; renderChips(); render(); });
  $('q').addEventListener('input', render);
  $('sort').addEventListener('change', render);
  $('closeSheet').addEventListener('click', () => $('sheet').close());
  $('sheet').addEventListener('click', e => { if (e.target === $('sheet')) $('sheet').close(); });

  $('themeBtn').addEventListener('click', () => {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark'
      || (!document.documentElement.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
    const next = dark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('dd_theme', next); } catch (e) {}
  });

  fetch('products.json', { cache: 'no-cache' })
    .then(r => r.json())
    .then(d => {
      data = d;
      ['storeLink', 'storeLink2'].forEach(id => { if (d.storeUrl) $(id).href = d.storeUrl; });
      $('exampleNotice').hidden = !d.items.some(p => p.example);
      if (d.updated) $('updated').textContent = 'Catalogue mis à jour le ' + new Date(d.updated).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
      renderChips();
      render();
    })
    .catch(() => {
      $('grid').innerHTML = '<div class="empty"><strong>Catalogue indisponible</strong>Rechargez la page dans un instant, ou consultez directement la boutique eBay.</div>';
    });
})();
