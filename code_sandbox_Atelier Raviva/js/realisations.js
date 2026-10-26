/* ═══════════════════════════════════════════════
   ATELIER REVIVA — Portfolio « Réalisations »
   Les projets viennent de l'onglet « Réalisations » du Google Sheets de l'atelier.
   Pour ajouter un projet : aucune modification de ce fichier n'est nécessaire.
═══════════════════════════════════════════════ */
(function () {
  'use strict';

  const API = 'https://script.google.com/macros/s/AKfycbxUNcPUhB7HPZa6l9rCJaNuNPS1ngCbYOpYr_2m65ub1KtEpGh5nN0tAGjOFbc-wMHR6g/exec';
  const CLE_STOCKAGE = 'atelier-reviva-realisations';

  const $ = id => document.getElementById(id);
  const grille = $('realGrid');
  if (!grille) return;
  const dialog = $('realDialog');
  let projets = [];

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

  const tags = p => [p.meuble, p.service].filter(Boolean).join(' · ');

  /* ── Curseur avant / après ──
     Glisser au doigt ou à la souris (le défilement vertical reste possible sur cellulaire),
     ou flèches du clavier grâce au curseur caché. */
  function curseur(p, taille, nom) {
    const apres = p.photos && p.photos[0];
    const src = photo => photo ? (taille === 'grand' ? photo.url : photo.mini) : '';
    if (!p.avant || !apres) {
      const seule = apres || p.avant;
      return el('div', { class: 'ba-slider ba-slider--seule' }, [el('img', { src: src(seule), alt: nom || p.nom, loading: 'lazy' })]);
    }
    const bloc = el('div', { class: 'ba-slider', style: '--pos:50%' });
    const range = el('input', { type: 'range', min: '0', max: '100', value: '50', step: '1', class: 'ba-range', 'aria-label': 'Comparer avant et après : ' + p.nom });
    bloc.append(
      el('img', { class: 'ba-img ba-img-avant', src: src(p.avant), alt: p.nom + ' avant sa transformation', loading: 'lazy', draggable: 'false' }),
      el('img', { class: 'ba-img ba-img-apres', src: src(apres), alt: p.nom + ' après sa transformation', loading: 'lazy', draggable: 'false' }),
      el('span', { class: 'ba-tag ba-tag--avant', text: 'Avant' }),
      el('span', { class: 'ba-tag ba-tag--apres', text: 'Après' }),
      el('span', { class: 'ba-handle', 'aria-hidden': 'true' }, [el('span', { class: 'ba-handle-rond', text: '‹ ›' })]),
      range
    );
    const poser = v => {
      const val = Math.max(0, Math.min(100, v));
      bloc.style.setProperty('--pos', val + '%');
      range.value = String(Math.round(val));
    };
    range.addEventListener('input', () => poser(Number(range.value)));
    let actif = false;
    const depuisPointeur = e => {
      const r = bloc.getBoundingClientRect();
      poser(((e.clientX - r.left) / r.width) * 100);
    };
    bloc.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      actif = true;
      bloc.classList.add('is-dragging');
      try { bloc.setPointerCapture(e.pointerId); } catch (err) { /* rien */ }
      depuisPointeur(e);
    });
    bloc.addEventListener('pointermove', e => { if (actif) depuisPointeur(e); });
    const fin = () => { actif = false; bloc.classList.remove('is-dragging'); };
    bloc.addEventListener('pointerup', fin);
    bloc.addEventListener('pointercancel', fin);
    bloc.addEventListener('click', e => e.stopPropagation());
    return bloc;
  }

  /* ── Chargement ── */
  function lireStockage() {
    try { return JSON.parse(localStorage.getItem(CLE_STOCKAGE) || 'null'); } catch (e) { return null; }
  }
  function ecrireStockage(d) {
    try { localStorage.setItem(CLE_STOCKAGE, JSON.stringify(d)); } catch (e) { /* navigation privée */ }
  }

  async function charger() {
    $('realError').hidden = true;
    const enMemoire = lireStockage();
    if (enMemoire && Array.isArray(enMemoire.projets)) afficher(enMemoire.projets);
    try {
      const controleur = new AbortController();
      const minuterie = setTimeout(() => controleur.abort(), 15000);
      const reponse = await fetch(API + '?action=realisations&t=' + Date.now(), { signal: controleur.signal });
      clearTimeout(minuterie);
      const donnees = await reponse.json();
      if (!donnees.ok || !Array.isArray(donnees.projets)) throw new Error(donnees.erreur || 'réponse invalide');
      ecrireStockage(donnees);
      afficher(donnees.projets);
    } catch (err) {
      console.warn('[Atelier Reviva] Réalisations —', err.message);
      if (!enMemoire) {
        grille.innerHTML = '';
        grille.setAttribute('aria-busy', 'false');
        $('realError').hidden = false;
      }
    }
  }

  /* ── Affichage ── */
  function afficher(liste) {
    projets = liste;
    grille.setAttribute('aria-busy', 'false');
    grille.innerHTML = '';
    $('realCount').textContent = liste.length
      ? liste.length + (liste.length > 1 ? ' meubles transformés' : ' meuble transformé')
      : '';
    $('realEmpty').hidden = liste.length > 0;

    /* Projet à la une : celui marqué Vedette, sinon le plus récent qui a un avant */
    const vedette = liste.find(p => p.vedette) || liste.find(p => p.avant && p.photos.length) || null;
    const zone = $('realVedette');
    zone.hidden = !vedette || liste.length < 2;
    if (!zone.hidden) {
      $('realVedetteMedia').innerHTML = '';
      $('realVedetteMedia').appendChild(curseur(vedette, 'grand'));
      $('realVedetteTitre').textContent = vedette.nom;
      $('realVedetteTags').textContent = tags(vedette);
      $('realVedetteDesc').textContent = vedette.description || '';
      $('realVedetteDesc').hidden = !vedette.description;
      $('realVedetteBtn').onclick = () => ouvrir(vedette);
    }

    liste.filter(p => zone.hidden || p !== vedette).forEach(p => grille.appendChild(carte(p)));
    ouvrirDepuisAdresse();
  }

  function carte(p) {
    const bouton = el('button', { type: 'button', class: 'real-card-lien', text: 'Voir le projet' });
    bouton.addEventListener('click', () => ouvrir(p));
    const titre = el('h3', { class: 'real-card-titre' }, [el('a', { href: '#projet-' + p.code, text: p.nom })]);
    titre.querySelector('a').addEventListener('click', e => { e.preventDefault(); ouvrir(p); });
    return el('article', { class: 'real-card' }, [
      el('div', { class: 'real-card-media' }, [curseur(p, 'mini')]),
      el('div', { class: 'real-card-body' }, [
        titre,
        tags(p) ? el('p', { class: 'real-tags', text: tags(p) }) : null,
        bouton,
      ]),
    ]);
  }

  /* ── Fiche d'un projet ── */
  function ouvrir(p) {
    const media = $('rdMedia');
    const thumbs = $('rdThumbs');
    const montrerComparaison = () => { media.innerHTML = ''; media.appendChild(curseur(p, 'grand')); marquer('comparaison'); };
    const montrerPhoto = (ph, i) => {
      media.innerHTML = '';
      media.appendChild(el('div', { class: 'ba-slider ba-slider--seule' }, [el('img', { src: ph.url, alt: p.nom + ' — photo ' + (i + 1) })]));
      marquer(ph.url);
    };
    const marquer = cle => thumbs.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.cle === cle));

    thumbs.innerHTML = '';
    const aComparaison = p.avant && p.photos.length;
    if (aComparaison && p.photos.length > 1) {
      const b = el('button', { type: 'button', 'data-cle': 'comparaison', 'aria-label': 'Comparer avant et après' },
        [el('img', { src: p.photos[0].mini, alt: '' }), el('span', { text: 'Avant / après' })]);
      b.addEventListener('click', montrerComparaison);
      thumbs.appendChild(b);
    }
    if (p.photos.length > 1 || !aComparaison) {
      p.photos.forEach((ph, i) => {
        const b = el('button', { type: 'button', 'data-cle': ph.url, 'aria-label': 'Voir la photo ' + (i + 1) }, [el('img', { src: ph.mini, alt: '' })]);
        b.addEventListener('click', () => montrerPhoto(ph, i));
        thumbs.appendChild(b);
      });
    }
    if (thumbs.children.length < 2) thumbs.innerHTML = '';   // une seule image : pas de vignettes
    if (aComparaison) montrerComparaison();
    else montrerPhoto(p.photos[0] || p.avant, 0);

    $('rdTitre').textContent = p.nom;
    $('rdTags').textContent = tags(p);
    $('rdDescription').textContent = p.description || '';
    $('rdDescription').hidden = !p.description;

    history.replaceState(null, '', '#projet-' + p.code);
    if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
    document.body.style.overflow = 'hidden';
    dialog.querySelector('.meuble-dialog-grid').scrollTop = 0;
  }

  const fermer = () => { if (dialog.open) dialog.close(); };
  dialog.addEventListener('close', () => {
    document.body.style.overflow = '';
    if (location.hash.indexOf('#projet-') === 0) history.replaceState(null, '', location.pathname);
  });
  $('rdFermer').addEventListener('click', fermer);
  dialog.addEventListener('click', e => { if (e.target === dialog) fermer(); });

  function ouvrirDepuisAdresse() {
    const h = decodeURIComponent(location.hash.slice(1));
    if (h.indexOf('projet-') !== 0 || dialog.open) return;
    const p = projets.find(x => x.code === h.slice(7));
    if (p) ouvrir(p);
  }

  $('realRetry').addEventListener('click', charger);
  window.addEventListener('hashchange', ouvrirDepuisAdresse);
  charger();
})();
