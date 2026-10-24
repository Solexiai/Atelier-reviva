/* ═══════════════════════════════════════════════
   ATELIER REVIVA — Boutique « Meubles à vendre »
   Les meubles viennent de l'onglet « Inventaire » du Google Sheets de l'atelier.
   Pour ajouter / vendre un meuble : aucune modification de ce fichier n'est nécessaire.
═══════════════════════════════════════════════ */
(function () {
  'use strict';

  /* Adresse du programme Google de l'atelier (la même que le formulaire de soumission) */
  const API = 'https://script.google.com/macros/s/AKfycbxUNcPUhB7HPZa6l9rCJaNuNPS1ngCbYOpYr_2m65ub1KtEpGh5nN0tAGjOFbc-wMHR6g/exec';
  const DELAI_RESERVATION = '48 h';
  const CLE_STOCKAGE = 'atelier-reviva-inventaire';

  const $ = id => document.getElementById(id);
  const grille = $('productGrid');
  const filtres = $('shopFilters');
  const vide = $('shopEmpty');
  const erreur = $('shopError');
  const compteur = $('shopCount');
  const filtreVide = $('shopFilterEmpty');
  const dialog = $('meubleDialog');
  if (!grille) return;

  document.querySelectorAll('.delai-texte, #promiseDelay').forEach(el => { el.textContent = DELAI_RESERVATION; });

  let meubles = [];
  let filtreActif = 'tout';
  let meubleOuvert = null;

  const prixTexte = p => p ? new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(p) : 'Prix sur demande';
  const slug = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const pluriel = { 'Commode': 'Commodes', 'Buffet': 'Buffets', 'Table': 'Tables', 'Chevet': 'Chevets', 'Chaise / fauteuil': 'Chaises et fauteuils',
    'Bibliothèque': 'Bibliothèques', 'Armoire': 'Armoires', 'Mobilier d\'appoint': 'Mobilier d\'appoint', 'Autre': 'Autres pièces' };
  const classeStatut = { 'Disponible': 'status-available', 'Réservé': 'status-reserved', 'Vendu': 'status-sold' };

  function el(tag, attrs, enfants) {
    const n = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else n.setAttribute(k, v === true ? '' : v);
    });
    (enfants || []).forEach(c => c && n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
    return n;
  }

  /* ── Chargement ── */
  function lireStockage() {
    try { return JSON.parse(localStorage.getItem(CLE_STOCKAGE) || 'null'); } catch (e) { return null; }
  }
  function ecrireStockage(donnees) {
    try { localStorage.setItem(CLE_STOCKAGE, JSON.stringify(donnees)); } catch (e) { /* navigation privée */ }
  }

  async function charger() {
    erreur.hidden = true;
    const enMemoire = lireStockage();
    if (enMemoire && Array.isArray(enMemoire.meubles)) afficher(enMemoire.meubles);

    try {
      const controleur = new AbortController();
      const minuterie = setTimeout(() => controleur.abort(), 15000);
      const reponse = await fetch(API + '?action=inventaire&t=' + Date.now(), { signal: controleur.signal });
      clearTimeout(minuterie);
      const donnees = await reponse.json();
      if (!donnees.ok || !Array.isArray(donnees.meubles)) throw new Error(donnees.erreur || 'réponse invalide');
      ecrireStockage(donnees);
      afficher(donnees.meubles);
    } catch (err) {
      console.warn('[Atelier Reviva] Boutique —', err.message);
      if (!enMemoire) {
        grille.innerHTML = '';
        grille.setAttribute('aria-busy', 'false');
        erreur.hidden = false;
        compteur.textContent = '';
      }
    }
  }

  /* ── Affichage ── */
  function afficher(liste) {
    meubles = liste;
    grille.setAttribute('aria-busy', 'false');
    const enVente = liste.filter(m => m.statut === 'Disponible');
    const reserves = liste.filter(m => m.statut === 'Réservé');

    compteur.textContent = enVente.length
      ? enVente.length + (enVente.length > 1 ? ' pièces disponibles' : ' pièce disponible') + (reserves.length ? ' · ' + reserves.length + ' réservée' + (reserves.length > 1 ? 's' : '') : '')
      : 'Nouvelle collection en préparation';

    vide.hidden = enVente.length > 0 || reserves.length > 0;
    if (!vide.hidden) {
      $('shopEmptyText').textContent = liste.length
        ? 'Toutes nos pièces ont trouvé preneur ! Les prochaines sont en train de prendre vie à l\'atelier. Inscrivez-vous pour les découvrir avant tout le monde.'
        : 'Les prochaines pièces sont en train de prendre vie à l\'atelier : décapage, réparations, teintes choisies avec soin. Inscrivez-vous pour les découvrir avant tout le monde.';
    }

    construireFiltres(liste);
    grille.innerHTML = '';
    liste.forEach(m => grille.appendChild(carte(m)));
    if (liste.length && vide.hidden === false) {
      grille.insertBefore(el('h2', { class: 'shop-sold-title', text: 'Déjà partis vers leur nouvelle maison' }), grille.firstChild);
    }
    appliquerFiltre();
    ouvrirDepuisAdresse();
  }

  function construireFiltres(liste) {
    const categories = [...new Set(liste.map(m => m.categorie))];
    filtres.innerHTML = '';
    if (categories.length < 2) { filtres.hidden = true; filtreActif = 'tout'; return; }
    filtres.hidden = false;
    const bouton = (valeur, texte) => {
      const b = el('button', { type: 'button', class: 'filter-btn' + (filtreActif === valeur ? ' active' : ''), 'data-filter': valeur, 'aria-pressed': String(filtreActif === valeur), text: texte });
      b.addEventListener('click', () => {
        filtreActif = valeur;
        filtres.querySelectorAll('.filter-btn').forEach(x => { x.classList.toggle('active', x === b); x.setAttribute('aria-pressed', String(x === b)); });
        appliquerFiltre();
        history.replaceState(null, '', valeur === 'tout' ? location.pathname : '#' + valeur);
      });
      return b;
    };
    filtres.appendChild(bouton('tout', 'Tout voir'));
    categories.forEach(c => filtres.appendChild(bouton(slug(c), pluriel[c] || c)));
  }

  function appliquerFiltre() {
    let visibles = 0;
    grille.querySelectorAll('.shop-card').forEach(c => {
      const ok = filtreActif === 'tout' || c.dataset.categorie === filtreActif;
      c.hidden = !ok;
      if (ok) visibles++;
    });
    const titreVendus = grille.querySelector('.shop-sold-title');
    if (titreVendus) titreVendus.hidden = filtreActif !== 'tout';
    filtreVide.hidden = visibles > 0 || !meubles.length;
    if (!filtreVide.hidden) {
      filtreVide.innerHTML = '';
      filtreVide.append('Aucune pièce dans cette catégorie pour le moment. ', el('a', { href: '#nouveautes', text: 'Être averti des nouveautés' }));
    }
  }

  function carte(m) {
    const photo = m.photos && m.photos[0];
    const img = el('div', { class: 'shop-card-img' + (m.avant && photo ? ' has-avant' : '') }, [
      photo
        ? el('img', { class: 'img-apres', src: photo.mini, alt: m.nom + ' — Atelier Reviva', loading: 'lazy' })
        : el('div', { class: 'shop-placeholder' }, [el('p', { class: 'shop-placeholder-label', text: 'Photos à venir' })]),
      m.avant && photo ? el('img', { class: 'img-avant', src: m.avant.mini, alt: m.nom + ' avant sa transformation', loading: 'lazy' }) : null,
      m.avant && photo ? el('span', { class: 'ba-hint', text: 'Survolez : avant' }) : null,
      el('span', { class: 'shop-card-status ' + (classeStatut[m.statut] || ''), text: m.statut === 'Disponible' && m.nouveau ? 'Nouveau' : m.statut }),
    ]);
    const details = [m.dimensions, m.materiau, m.finition].filter(Boolean).join(' · ');
    const article = el('article', {
      class: 'shop-card' + (m.statut === 'Vendu' ? ' is-sold' : ''),
      'data-categorie': slug(m.categorie),
    }, [
      img,
      el('div', { class: 'shop-card-body' }, [
        el('h2', { class: 'shop-card-name', text: m.nom }),
        details ? el('p', { class: 'shop-card-details', text: details }) : null,
        el('div', { class: 'shop-card-row' }, [
          el('span', { class: 'shop-card-price', text: m.statut === 'Vendu' ? 'Vendu' : prixTexte(m.prix) }),
          el('span', { class: 'btn btn-sm ' + (m.statut === 'Disponible' ? 'btn-primary' : 'btn-outline'), 'aria-hidden': 'true',
            text: m.statut === 'Disponible' ? 'Voir le meuble' : 'Voir' }),
        ]),
      ]),
    ]);
    /* Toute la carte ouvre la fiche (lien accessible au clavier) */
    const lien = el('a', { class: 'shop-card-link', href: '#meuble-' + m.code, 'aria-label': 'Voir la fiche : ' + m.nom + ', ' + (m.statut === 'Vendu' ? 'vendu' : prixTexte(m.prix) + ', ' + m.statut.toLowerCase()) });
    lien.addEventListener('click', e => { e.preventDefault(); ouvrir(m); });
    article.appendChild(lien);
    return article;
  }

  /* ── Fiche d'un meuble ── */
  function ouvrir(m) {
    meubleOuvert = m;
    const photos = (m.photos || []).map(p => ({ ...p, avant: false }));
    if (m.avant) photos.push({ ...m.avant, avant: true });

    const image = $('dlgImage');
    const tag = $('dlgImageTag');
    const montrer = p => {
      image.src = p ? p.url : '';
      image.alt = p ? (p.avant ? m.nom + ' avant sa transformation' : m.nom) : '';
      image.hidden = !p;
      tag.hidden = !(p && p.avant);
      $('dlgThumbs').querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.url === (p && p.url)));
    };
    $('dlgThumbs').innerHTML = '';
    if (photos.length > 1) {
      photos.forEach((p, i) => {
        const b = el('button', { type: 'button', 'data-url': p.url, 'aria-label': p.avant ? 'Voir la photo avant transformation' : 'Voir la photo ' + (i + 1) },
          [el('img', { src: p.mini, alt: '' }), p.avant ? el('span', { text: 'Avant' }) : null]);
        b.addEventListener('click', () => montrer(p));
        $('dlgThumbs').appendChild(b);
      });
    }
    montrer(photos[0]);

    const statut = $('dlgStatut');
    statut.className = 'shop-card-status ' + (classeStatut[m.statut] || '');
    statut.textContent = m.statut;
    $('dlgTitre').textContent = m.nom;
    $('dlgPrix').textContent = m.statut === 'Vendu' ? 'Vendu' : prixTexte(m.prix);

    const dl = $('dlgCaracteristiques');
    dl.innerHTML = '';
    [['Dimensions', m.dimensions], ['Matériau', m.materiau], ['Finition', m.finition], ['Catégorie', m.categorie]]
      .filter(([, v]) => v).forEach(([k, v]) => { dl.append(el('dt', { text: k }), el('dd', { text: v })); });
    $('dlgDescription').textContent = m.description || '';
    $('dlgDescription').hidden = !m.description;

    const actions = $('dlgActions');
    actions.innerHTML = '';
    const form = $('reservationForm');
    form.hidden = true;
    $('reservationOk').hidden = true;
    $('reservationErreur').hidden = true;

    if (m.statut === 'Disponible') {
      const b = el('button', { type: 'button', class: 'btn btn-primary meuble-cta', text: 'Je le veux — réserver' });
      b.addEventListener('click', () => {
        actions.hidden = true;
        form.hidden = false;
        $('resPrenom').focus();
      });
      actions.append(b, el('p', { class: 'meuble-cta-note', text: 'Réservé ' + DELAI_RESERVATION + ' pour vous · aucun paiement en ligne' }));
    } else {
      actions.append(el('p', { class: 'meuble-indispo', text: m.statut === 'Réservé'
        ? 'Ce meuble est réservé par un autre client. Il arrive qu\'une réservation ne se concrétise pas : inscrivez-vous pour être averti.'
        : 'Ce meuble a trouvé sa nouvelle maison. Inscrivez-vous pour découvrir les prochaines pièces en premier.' }),
        el('a', { href: '#nouveautes', class: 'btn btn-outline', text: 'Être averti des nouveautés' }));
      actions.querySelector('a').addEventListener('click', fermer);
    }
    actions.hidden = false;

    history.replaceState(null, '', '#meuble-' + m.code);
    if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
    document.body.style.overflow = 'hidden';
    dialog.querySelector('.meuble-dialog-grid').scrollTop = 0;
  }

  function fermer() {
    if (dialog.open) dialog.close();
  }
  dialog.addEventListener('close', () => {
    document.body.style.overflow = '';
    meubleOuvert = null;
    if (location.hash.indexOf('#meuble-') === 0) history.replaceState(null, '', location.pathname + (filtreActif !== 'tout' ? '#' + filtreActif : ''));
  });
  $('dlgFermer').addEventListener('click', fermer);
  dialog.addEventListener('click', e => { if (e.target === dialog) fermer(); });

  function ouvrirDepuisAdresse() {
    const h = decodeURIComponent(location.hash.slice(1));
    if (h.indexOf('meuble-') === 0) {
      const m = meubles.find(x => x.code === h.slice(7));
      if (m && !dialog.open) ouvrir(m);
    } else if (h && h !== 'boutique' && h !== 'nouveautes') {
      const b = filtres.querySelector('[data-filter="' + h + '"]');
      if (b) b.click();
    }
  }

  /* ── Réservation ── */
  const formRes = $('reservationForm');
  document.addEventListener('input', e => {
    if (e.target.classList && e.target.classList.contains('is-invalid')) { e.target.classList.remove('is-invalid'); e.target.removeAttribute('aria-invalid'); }
  });
  document.addEventListener('change', e => {
    if (e.target.type === 'checkbox' && e.target.classList.contains('is-invalid')) { e.target.classList.remove('is-invalid'); e.target.removeAttribute('aria-invalid'); }
  });
  function valider(form) {
    let premier = null;
    form.querySelectorAll('[required]').forEach(champ => {
      const valeur = champ.type === 'checkbox' ? champ.checked : champ.value.trim();
      let ok = !!valeur;
      if (ok && champ.type === 'email') ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valeur);
      if (ok && champ.type === 'tel') ok = valeur.replace(/\D/g, '').length >= 10;
      champ.classList.toggle('is-invalid', !ok);
      champ.setAttribute('aria-invalid', String(!ok));
      if (!ok && !premier) premier = champ;
    });
    if (premier) premier.focus();
    return !premier;
  }

  async function envoyer(corps) {
    const reponse = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(corps) });
    return reponse.json();
  }

  formRes.addEventListener('submit', async e => {
    e.preventDefault();
    const alerte = $('reservationErreur');
    alerte.hidden = true;
    if (!valider(formRes)) {
      alerte.textContent = 'Veuillez compléter les champs en rouge (courriel valide, téléphone à 10 chiffres, case cochée).';
      alerte.hidden = false;
      return;
    }
    const m = meubleOuvert;
    const bouton = $('reservationSubmit');
    bouton.disabled = true;
    bouton.textContent = 'Réservation en cours…';
    const champs = {};
    new FormData(formRes).forEach((v, k) => { if (k.charAt(0) !== '_') champs[k] = String(v); });

    try {
      const r = await envoyer({ type: 'reservation', code: m.code, champs: champs, _gotcha: formRes.elements._gotcha.value });
      if (!r.ok) {
        if (r.erreur === 'deja_reserve' || r.erreur === 'introuvable') {
          alerte.textContent = 'Oh non ! Quelqu\'un vient tout juste de réserver ce meuble. Inscrivez-vous aux nouveautés pour ne pas manquer les prochains.';
          alerte.hidden = false;
          m.statut = 'Réservé';
          charger();
          return;
        }
        throw new Error(r.erreur || 'erreur');
      }
      formRes.hidden = true;
      $('okNumero').textContent = r.numero;
      document.querySelectorAll('#reservationOk .ok-num').forEach(n => { n.textContent = r.numero; });
      $('okPrix').textContent = prixTexte(r.prix);
      $('okInterac').textContent = r.interac;
      $('okDate').textContent = r.payerAvant;
      $('reservationOk').hidden = false;
      $('reservationOk').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      m.statut = 'Réservé';
      $('dlgStatut').className = 'shop-card-status ' + classeStatut['Réservé'];
      $('dlgStatut').textContent = 'Réservé';
      afficherSansRecharger();
      try { localStorage.removeItem(CLE_STOCKAGE); } catch (err) { /* rien */ }
      formRes.reset();
    } catch (err) {
      console.warn('[Atelier Reviva] Réservation —', err.message);
      alerte.textContent = 'La réservation n\'a pas pu être envoyée. Réessayez, ou appelez-nous au (514) 430-6221.';
      alerte.hidden = false;
    } finally {
      bouton.disabled = false;
      bouton.textContent = 'Réserver ce meuble';
    }
  });

  function afficherSansRecharger() {
    const ouvert = meubleOuvert;
    const avantHash = location.hash;
    afficher(meubles);
    meubleOuvert = ouvert;
    if (avantHash !== location.hash) history.replaceState(null, '', avantHash);
  }

  /* ── Être averti des nouveautés ── */
  const formAbo = $('notifyForm');
  formAbo.addEventListener('submit', async e => {
    e.preventDefault();
    const message = $('notifyMessage');
    message.hidden = true;
    message.classList.remove('is-ok');
    if (!valider(formAbo)) {
      message.textContent = 'Entrez un courriel valide et cochez la case pour vous inscrire.';
      message.hidden = false;
      return;
    }
    const bouton = formAbo.querySelector('button[type="submit"]');
    bouton.disabled = true;
    const champs = {};
    new FormData(formAbo).forEach((v, k) => { if (k.charAt(0) !== '_') champs[k] = String(v); });
    try {
      const r = await envoyer({ type: 'abonnement', champs: champs, _gotcha: formAbo.elements._gotcha.value });
      if (!r.ok) throw new Error(r.erreur || 'erreur');
      formAbo.reset();
      message.textContent = r.deja ? 'Vous êtes déjà inscrit(e) — à très bientôt !' : 'Merci ! Vous serez parmi les premiers à découvrir les prochaines pièces.';
      message.classList.add('is-ok');
      message.hidden = false;
    } catch (err) {
      message.textContent = 'L\'inscription n\'a pas fonctionné. Réessayez dans un instant.';
      message.hidden = false;
    } finally {
      bouton.disabled = false;
    }
  });

  $('shopRetry').addEventListener('click', () => { erreur.hidden = true; charger(); });
  window.addEventListener('hashchange', ouvrirDepuisAdresse);
  charger();
})();
