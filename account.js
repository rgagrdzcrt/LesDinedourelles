/* Les Dinedourelles — comptes visiteurs (Supabase) : connexion par lien envoyé par e-mail (sans mot de passe),
   favoris synchronisés sur tous les appareils, alertes par catégorie et nouveautés de la semaine.
   La structure de la base est dans supabase/schema.sql. */
(function () {
  const SB_URL = 'https://iysjxzbyvfzosyfmjnfb.supabase.co';
  const SB_KEY = 'sb_publishable_u7gQSr9rZDumGoEOtyXF0w_DtcPioEk'; // clé publique, faite pour être dans le site
  const DD = window.DD;
  if (!window.supabase || !DD) return;
  const sb = window.supabase.createClient(SB_URL, SB_KEY);
  // Nombre de personnes ayant chaque pièce en favori (chiffres seulement, aucune identité)
  sb.rpc('fav_counts').then(({ data }) => { if (data) DD.setCounts(data); });
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const T = {
    fr: {
      btn: 'Compte', title: 'Mon compte', close: 'Fermer',
      intro: 'Créez votre compte en un instant, sans mot de passe :',
      perks: ['Vos favoris sur tous vos appareils', 'Une alerte dès qu’une pièce arrive dans les catégories qui vous intéressent', 'Les nouveautés de la semaine'],
      email: 'Votre adresse e-mail', consent: 'J’accepte la <a href="confidentialite.html" target="_blank" rel="noopener">politique de confidentialité</a>.',
      send: 'Recevoir mon lien de connexion', sending: 'Envoi…',
      sent: e => `C’est envoyé à <b>${esc(e)}</b> ! Cliquez sur le lien de l’e-mail <b>sur cet appareil</b>, ou tapez ici le code à 6 chiffres qu’il contient (pratique si vous lisez vos e-mails sur un autre appareil).`,
      code: 'Code reçu par e-mail', verify: 'Me connecter', badCode: 'Ce code ne fonctionne pas. Vérifiez-le ou demandez un nouveau lien.',
      needConsent: 'Merci d’accepter la politique de confidentialité.', badEmail: 'Cette adresse e-mail ne semble pas valide.',
      error: 'Une erreur est survenue. Réessayez dans un instant.',
      hello: e => `Connecté avec <b>${esc(e)}</b>`, favs: n => `${n} pièce${n > 1 ? 's' : ''} en favori, enregistrée${n > 1 ? 's' : ''} sur votre compte.`,
      alerts: 'Mes alertes par e-mail', weekly: 'Les nouveautés de la semaine', favAlerts: 'Mes favoris : baisse de prix et rappel s\u2019ils sont toujours disponibles', catsHint: 'Prévenez-moi dès qu’une pièce arrive dans :',
      save: 'Enregistrer', saved: 'Enregistré ✓', logout: 'Se déconnecter', del: 'Supprimer mon compte',
      delConfirm: 'Supprimer définitivement votre compte, vos favoris enregistrés et vos alertes ?', deleted: 'Votre compte a été supprimé.',
    },
    en: {
      btn: 'Account', title: 'My account', close: 'Close',
      intro: 'Create your account in a moment, no password needed:',
      perks: ['Your favourites on all your devices', 'An alert as soon as a piece arrives in the categories you follow', 'This week’s new arrivals'],
      email: 'Your email address', consent: 'I accept the <a href="confidentialite.html" target="_blank" rel="noopener">privacy policy</a>.',
      send: 'Send me a sign-in link', sending: 'Sending…',
      sent: e => `Sent to <b>${esc(e)}</b>! Click the link in the email <b>on this device</b>, or type the 6-digit code it contains here (handy if you read your email on another device).`,
      code: 'Code from the email', verify: 'Sign in', badCode: 'This code does not work. Check it or ask for a new link.',
      needConsent: 'Please accept the privacy policy.', badEmail: 'This email address does not look valid.',
      error: 'Something went wrong. Please try again in a moment.',
      hello: e => `Signed in as <b>${esc(e)}</b>`, favs: n => `${n} favourite${n > 1 ? 's' : ''} saved to your account.`,
      alerts: 'My email alerts', weekly: 'This week’s new arrivals', favAlerts: 'My favourites: price drops and a reminder if still available', catsHint: 'Let me know when a piece arrives in:',
      save: 'Save', saved: 'Saved ✓', logout: 'Sign out', del: 'Delete my account',
      delConfirm: 'Permanently delete your account, saved favourites and alerts?', deleted: 'Your account has been deleted.',
    },
  };
  const t = k => T[DD.lang()][k];

  let user = null, profile = null;

  /* ---------- Favoris : fusion à la connexion, puis synchronisation à chaque clic ---------- */
  async function mergeFavs() {
    const { data, error } = await sb.from('favorites').select('item_id');
    if (error) return;
    const remote = data.map(r => String(r.item_id));
    const local = DD.favs();
    const missing = local.filter(id => !remote.includes(id));
    if (missing.length) await sb.from('favorites').insert(missing.map(item_id => ({ user_id: user.id, item_id })));
    DD.setFavs([...new Set([...remote, ...local])]);
  }
  DD.onFav = (id, added) => {
    if (!user) return;
    if (added) sb.from('favorites').insert({ user_id: user.id, item_id: String(id) }).then(() => sb.rpc('fav_counts')).then(r => { if (r && r.data) DD.setCounts(r.data); });
    else sb.from('favorites').delete().eq('user_id', user.id).eq('item_id', String(id)).then(() => {});
  };

  async function loadProfile() {
    const { data } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
    profile = data;
    // Accord donné au moment de la demande de lien (case cochée) : on le date à la première connexion.
    if (profile && !profile.consent_at) {
      const patch = { consent_at: new Date().toISOString(), lang: DD.lang() };
      await sb.from('profiles').update(patch).eq('id', user.id);
      Object.assign(profile, patch);
    }
  }

  /* ---------- Fenêtre « Mon compte » ---------- */
  function render() {
    $('accBtnLbl').textContent = t('btn');
    $('accBtn').classList.toggle('on', !!user);
    const box = $('accBody');
    $('accTitle').textContent = t('title');
    $('accClose').setAttribute('aria-label', t('close'));
    if (!user) {
      box.innerHTML = `<p class="acc-intro">${esc(t('intro'))}</p><ul class="acc-perks">${t('perks').map(p => `<li>${esc(p)}</li>`).join('')}</ul>
        <form id="accForm" novalidate>
          <label class="acc-field"><span>${esc(t('email'))}</span><input type="email" id="accEmail" autocomplete="email" required></label>
          <label class="acc-check"><input type="checkbox" id="accConsent"> <span>${t('consent')}</span></label>
          <p class="acc-msg" id="accMsg" role="status"></p>
          <button class="cta wide" type="submit" id="accSend">${esc(t('send'))}</button>
        </form>`;
      $('accForm').addEventListener('submit', sendLink);
      return;
    }
    const cats = DD.cats.filter(c => DD.hasCat(c));
    const sel = new Set((profile && profile.alert_cats) || []);
    box.innerHTML = `<p class="acc-hello">${t('hello')(user.email)}</p><p class="acc-note">${esc(t('favs')(DD.favs().length))}</p>
      <h3 class="acc-h">${esc(t('alerts'))}</h3>
      <label class="acc-check"><input type="checkbox" id="accWeekly" ${!profile || profile.newsletter ? 'checked' : ''}> <span>${esc(t('weekly'))}</span></label>
      ${profile && 'fav_alerts' in profile ? `<label class="acc-check"><input type="checkbox" id="accFavAlerts" ${profile.fav_alerts ? 'checked' : ''}> <span>${esc(t('favAlerts'))}</span></label>` : ''}
      <p class="acc-note">${esc(t('catsHint'))}</p>
      <div class="acc-cats">${cats.map(c => `<label class="acc-check"><input type="checkbox" value="${esc(c)}" ${sel.has(c) ? 'checked' : ''}> <span>${esc(DD.cn(c))}</span></label>`).join('')}</div>
      <p class="acc-msg" id="accMsg" role="status"></p>
      <button class="cta wide" type="button" id="accSave">${esc(t('save'))}</button>
      <div class="acc-foot"><button type="button" id="accOut">${esc(t('logout'))}</button><button type="button" id="accDel">${esc(t('del'))}</button></div>`;
    $('accSave').addEventListener('click', saveAlerts);
    $('accOut').addEventListener('click', async () => { await sb.auth.signOut(); });
    $('accDel').addEventListener('click', deleteAccount);
  }

  async function sendLink(e) {
    e.preventDefault();
    const email = $('accEmail').value.trim(), msg = $('accMsg');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msg.textContent = t('badEmail'); return; }
    if (!$('accConsent').checked) { msg.textContent = t('needConsent'); return; }
    $('accSend').disabled = true; $('accSend').textContent = t('sending');
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } });
    $('accSend').disabled = false; $('accSend').textContent = t('send');
    if (error) { msg.textContent = t('error'); console.warn(error); return; }
    $('accForm').innerHTML = `<p class="acc-sent">${t('sent')(email)}</p>
      <label class="acc-field"><span>${esc(t('code'))}</span><input id="accCode" inputmode="numeric" autocomplete="one-time-code" maxlength="10" pattern="[0-9]*"></label>
      <p class="acc-msg" id="accMsg" role="status"></p>
      <button class="cta wide" type="button" id="accVerify">${esc(t('verify'))}</button>`;
    $('accVerify').addEventListener('click', async () => {
      const token = $('accCode').value.replace(/\D/g, '');
      if (token.length < 6) { $('accMsg').textContent = t('badCode'); return; }
      $('accVerify').disabled = true;
      const { error } = await sb.auth.verifyOtp({ email, token, type: 'email' });
      $('accVerify').disabled = false;
      if (error) { $('accMsg').textContent = t('badCode'); return; }
      DD.track('compte/connexion', 'Connexion (code)');
    });
    DD.track('compte/lien', 'Demande de lien de connexion');
  }

  async function saveAlerts() {
    const alert_cats = [...document.querySelectorAll('#accBody .acc-cats input:checked')].map(i => i.value);
    const patch = { newsletter: $('accWeekly').checked, alert_cats, lang: DD.lang() };
    if ($('accFavAlerts')) patch.fav_alerts = $('accFavAlerts').checked;
    const { error } = await sb.from('profiles').update(patch).eq('id', user.id);
    $('accMsg').textContent = error ? t('error') : t('saved');
    if (!error) Object.assign(profile || (profile = {}), patch);
  }

  async function deleteAccount() {
    if (!confirm(t('delConfirm'))) return;
    const { error } = await sb.rpc('delete_me');
    if (error) { $('accMsg').textContent = t('error'); return; }
    await sb.auth.signOut();
    alert(t('deleted'));
  }

  /* ---------- Session ---------- */
  sb.auth.onAuthStateChange((event, session) => {
    const was = user && user.id;
    user = session ? session.user : null;
    if (user && user.id !== was) {
      // Laisser Supabase finir avant d'appeler la base (recommandation de la bibliothèque)
      setTimeout(async () => {
        await loadProfile(); await mergeFavs(); render();
        if (event === 'SIGNED_IN' && /access_token|code=/.test(location.href)) { history.replaceState(null, '', location.pathname); $('account').showModal(); DD.track('compte/connexion', 'Connexion'); }
      }, 0);
    }
    if (!user) { profile = null; }
    render();
  });

  $('accBtn').addEventListener('click', () => { render(); $('account').showModal(); });
  const closeAcc = () => (DD.closeDialog ? DD.closeDialog($('account')) : $('account').close());
  $('accClose').addEventListener('click', closeAcc);
  $('account').addEventListener('click', e => { if (e.target === $('account')) closeAcc(); });
  $('account').addEventListener('cancel', e => { if (DD.closeDialog) { e.preventDefault(); closeAcc(); } });
  document.addEventListener('dd:lang', render);
  // Lien « Gérer mes alertes » des e-mails : lesdinedourelles.com/#compte ouvre directement la fenêtre.
  const openFromHash = () => {
    if (location.hash !== '#compte') return;
    history.replaceState(null, '', location.pathname + location.search);
    render(); if (!$('account').open) $('account').showModal();
  };
  window.addEventListener('hashchange', openFromHash);
  render();
  openFromHash();
})();
