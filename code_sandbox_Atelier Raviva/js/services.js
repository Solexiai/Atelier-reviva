/* ═══════════════════════════════════════════════
   ATELIER REVIVA — Page Services
   Photos des services et « Quelques transformations » tirées de l'onglet
   « Réalisations » du Google Sheets (projets publiés). Rien à modifier ici.
═══════════════════════════════════════════════ */
(function () {
  'use strict';

  const API = 'https://script.google.com/macros/s/AKfycbxUNcPUhB7HPZa6l9rCJaNuNPS1ngCbYOpYr_2m65ub1KtEpGh5nN0tAGjOFbc-wMHR6g/exec';
  const CLE = 'atelier-reviva-realisations';   // même cache que la page Portfolio

  function el(tag, attrs, enfants) {
    const n = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') n.className = v; else if (k === 'text') n.textContent = v; else n.setAttribute(k, v);
    });
    (enfants || []).forEach(c => c && n.appendChild(c));
    return n;
  }

  /* Curseur avant / après (souris, doigt, clavier) */
  function curseur(p) {
    const apres = p.photos && p.photos[0];
    if (!p.avant || !apres) {
      return el('div', { class: 'ba-slider ba-slider--seule' }, [el('img', { src: (apres || p.avant).mini, alt: p.nom, loading: 'lazy' })]);
    }
    const bloc = el('div', { class: 'ba-slider', style: '--pos:50%' });
    const range = el('input', { type: 'range', min: '0', max: '100', value: '50', class: 'ba-range', 'aria-label': 'Comparer avant et après : ' + p.nom });
    bloc.append(
      el('img', { class: 'ba-img-avant', src: p.avant.mini, alt: p.nom + ' avant', loading: 'lazy', draggable: 'false' }),
      el('img', { class: 'ba-img-apres', src: apres.mini, alt: p.nom + ' après', loading: 'lazy', draggable: 'false' }),
      el('span', { class: 'ba-tag ba-tag--avant', text: 'Avant' }),
      el('span', { class: 'ba-tag ba-tag--apres', text: 'Après' }),
      el('span', { class: 'ba-handle', 'aria-hidden': 'true' }, [el('span', { class: 'ba-handle-rond', text: '‹ ›' })]),
      range
    );
    const poser = v => { v = Math.max(0, Math.min(100, v)); bloc.style.setProperty('--pos', v + '%'); range.value = String(Math.round(v)); };
    range.addEventListener('input', () => poser(+range.value));
    let actif = false;
    const suivre = e => { const r = bloc.getBoundingClientRect(); poser((e.clientX - r.left) / r.width * 100); };
    bloc.addEventListener('pointerdown', e => { if (e.button) return; actif = true; try { bloc.setPointerCapture(e.pointerId); } catch (x) { /* rien */ } suivre(e); });
    bloc.addEventListener('pointermove', e => { if (actif) suivre(e); });
    ['pointerup', 'pointercancel'].forEach(t => bloc.addEventListener(t, () => { actif = false; }));
    return bloc;
  }

  function afficher(projets) {
    if (!Array.isArray(projets) || !projets.length) return;
    const utilises = new Set();

    /* Une réalisation par service (celle dont le Service correspond, sinon une autre) */
    document.querySelectorAll('.srv-media[data-service]').forEach(zone => {
      const svc = zone.dataset.service;
      const p = projets.find(x => x.service === svc && !utilises.has(x.code) && x.photos.length)
             || projets.find(x => !utilises.has(x.code) && x.photos.length);
      if (!p) return;
      utilises.add(p.code);
      const ph = p.photos[0];
      zone.innerHTML = '';
      zone.appendChild(el('img', { src: ph.mini, alt: '', loading: 'lazy' }));
      zone.appendChild(el('span', { class: 'srv-media-legende', text: p.nom }));
      zone.classList.add('has-photo');
    });

    /* Trois transformations avec curseur (de préférence celles qui ont une photo avant) */
    const avecAvant = projets.filter(p => p.avant && p.photos.length);
    const choix = (avecAvant.length ? avecAvant : projets).slice(0, 3);
    if (!choix.length) return;
    const grille = document.getElementById('transfoGrid');
    grille.innerHTML = '';
    choix.forEach(p => grille.appendChild(el('figure', { class: 'srv-transfo-item' }, [
      el('div', { class: 'srv-transfo-media' }, [curseur(p)]),
      el('figcaption', { text: p.nom }),
    ])));
    document.getElementById('transformations').hidden = false;
  }

  try {
    const memoire = JSON.parse(localStorage.getItem(CLE) || 'null');
    if (memoire && memoire.projets) afficher(memoire.projets);
  } catch (e) { /* navigation privée */ }

  fetch(API + '?action=realisations&t=' + Date.now())
    .then(r => r.json())
    .then(d => {
      if (!d.ok) return;
      try { localStorage.setItem(CLE, JSON.stringify(d)); } catch (e) { /* rien */ }
      afficher(d.projets);
    })
    .catch(err => console.warn('[Atelier Reviva] Services — réalisations indisponibles :', err.message));
})();
