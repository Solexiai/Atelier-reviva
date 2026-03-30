/**
 * ATELIER REVIVA — Chargeur de portfolio dynamique
 * ─────────────────────────────────────────────────
 * Génère automatiquement les cartes portfolio
 * en lisant les fichiers meta.json de chaque dossier projet.
 *
 * ════════════════════════════════════════════════
 * MISE À JOUR SEMESTRIELLE — PROCÉDURE COMPLÈTE
 * ════════════════════════════════════════════════
 *
 * 1. Remplacer avant.jpg et apres.jpg dans le dossier du projet concerné.
 *    Chemin : assets/portfolio/projet-XX/avant.jpg
 *             assets/portfolio/projet-XX/apres.jpg
 *
 * 2. Mettre à jour le fichier meta.json du projet :
 *    - "title"       : nom affiché sous la carte
 *    - "description" : texte court affiché sous le titre
 *    - "beforeAlt"   : texte alternatif de l'image avant (SEO + accessibilité)
 *    - "afterAlt"    : texte alternatif de l'image après (SEO + accessibilité)
 *    (les champs "beforeImage" et "afterImage" restent "avant.jpg" / "apres.jpg"
 *     sauf si vous changez les noms de fichiers)
 *
 * 3. Aucune modification de portfolio.html n'est nécessaire.
 *
 * 4. Aucune modification de ce fichier n'est nécessaire,
 *    sauf pour ajouter ou retirer un projet de PROJECTS_LIST.
 *
 * 5. Pour ajouter un 11e projet :
 *    a. Créer le dossier  : assets/portfolio/projet-11/
 *    b. Y placer          : avant.jpg, apres.jpg, meta.json
 *    c. Ajouter ici       : { id: 'projet-11', fallbackTitle: 'Projet 11' }
 *
 * ════════════════════════════════════════════════
 * COMPORTEMENT EN CAS DE FICHIER MANQUANT
 * ════════════════════════════════════════════════
 * - meta.json absent, illisible ou invalide → projet ignoré silencieusement
 * - Un seul console.warn discret est émis pour chaque projet ignoré
 * - Les autres projets continuent de se charger normalement
 * - La grille ne casse jamais
 * ════════════════════════════════════════════════
 */

'use strict';

/* ─────────────────────────────────────────────────
   LISTE CENTRALE DES PROJETS
   → Seul point à modifier pour ajouter / retirer un projet
───────────────────────────────────────────────── */
const PROJECTS_LIST = [
  { id: 'projet-01', fallbackTitle: 'Projet 01' },
  { id: 'projet-02', fallbackTitle: 'Projet 02' },
  { id: 'projet-03', fallbackTitle: 'Projet 03' },
  { id: 'projet-04', fallbackTitle: 'Projet 04' },
  { id: 'projet-05', fallbackTitle: 'Projet 05' },
  { id: 'projet-06', fallbackTitle: 'Projet 06' },
  { id: 'projet-07', fallbackTitle: 'Projet 07' },
  { id: 'projet-08', fallbackTitle: 'Projet 08' },
  { id: 'projet-09', fallbackTitle: 'Projet 09' },
  { id: 'projet-10', fallbackTitle: 'Projet 10' }
];

/* ── Chemin racine des dossiers projet ── */
const BASE_PATH = 'assets/portfolio/';

/* ─────────────────────────────────────────────────
   SÉCURITÉ — Échappe les caractères HTML
   Empêche toute injection via les valeurs du meta.json
───────────────────────────────────────────────── */
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ─────────────────────────────────────────────────
   VALIDATION — Vérifie que meta.json est complet
   Un meta.json valide doit contenir :
   - title        (string non vide)
   - beforeImage  (string non vide)
   - afterImage   (string non vide)
   description, beforeAlt et afterAlt sont optionnels
───────────────────────────────────────────────── */
function isValidMeta(meta) {
  return (
    meta !== null &&
    typeof meta === 'object' &&
    typeof meta.title === 'string'       && meta.title.trim()       !== '' &&
    typeof meta.beforeImage === 'string' && meta.beforeImage.trim() !== '' &&
    typeof meta.afterImage  === 'string' && meta.afterImage.trim()  !== ''
  );
}

/* ─────────────────────────────────────────────────
   CONSTRUCTION — Génère l'élément <article> d'une carte
   Structure HTML strictement conforme à la charte Atelier Reviva :
   article.portfolio-card
     div.before-after
       div.ba-pane.ba-before > img + span.ba-label
       div.ba-pane.ba-after  > img + span.ba-label.after
     div.portfolio-card-body > h3.portfolio-card-title + p.portfolio-card-text
───────────────────────────────────────────────── */
function buildCard(meta, projectId) {
  const folder     = BASE_PATH + projectId + '/';
  const title      = escapeHtml(meta.title);
  const desc       = escapeHtml(typeof meta.description === 'string' ? meta.description : '');
  const beforeAlt  = escapeHtml(typeof meta.beforeAlt   === 'string' ? meta.beforeAlt   : meta.title + ' — avant');
  const afterAlt   = escapeHtml(typeof meta.afterAlt    === 'string' ? meta.afterAlt    : meta.title + ' — après');
  const beforeSrc  = escapeHtml(folder + meta.beforeImage);
  const afterSrc   = escapeHtml(folder + meta.afterImage);

  const article = document.createElement('article');
  article.className = 'portfolio-card';

  article.innerHTML =
    '<div class="before-after">' +
      '<div class="ba-pane ba-before">' +
        '<img src="' + beforeSrc + '" alt="' + beforeAlt + '" loading="lazy" />' +
        '<span class="ba-label">Avant</span>' +
      '</div>' +
      '<div class="ba-pane ba-after">' +
        '<img src="' + afterSrc + '" alt="' + afterAlt + '" loading="lazy" />' +
        '<span class="ba-label after">Après</span>' +
      '</div>' +
    '</div>' +
    '<div class="portfolio-card-body">' +
      '<h3 class="portfolio-card-title">' + title + '</h3>' +
      (desc ? '<p class="portfolio-card-text">' + desc + '</p>' : '') +
    '</div>';

  return article;
}

/* ─────────────────────────────────────────────────
   CHARGEMENT — Récupère meta.json et injecte la carte
   En cas d'échec (réseau, JSON invalide, champs manquants) :
   → console.warn discret, projet ignoré, grille intacte
───────────────────────────────────────────────── */
function loadProject(grid, project) {
  const metaUrl = BASE_PATH + project.id + '/meta.json';

  return fetch(metaUrl)
    .then(function (response) {
      if (!response.ok) {
        throw new Error('HTTP ' + response.status);
      }
      return response.json();
    })
    .then(function (meta) {
      if (!isValidMeta(meta)) {
        throw new Error('meta.json invalide ou incomplet pour ' + project.id);
      }
      const card = buildCard(meta, project.id);
      grid.appendChild(card);
    })
    .catch(function (err) {
      /* Avertissement discret — ne bloque pas les autres projets */
      console.warn('[Atelier Reviva Portfolio] ' + project.id + ' ignoré — ' + err.message);
    });
}

/* ─────────────────────────────────────────────────
   FILTRES — Relie les boutons de filtre aux cartes chargées
   Appelé après le chargement complet de PROJECTS_LIST
   pour que toutes les cartes soient présentes dans le DOM
───────────────────────────────────────────────── */
function bindFilters(grid) {
  const filterBtns = document.querySelectorAll('.filter-btn');
  if (!filterBtns.length) return;

  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filterBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');

      const filter = btn.getAttribute('data-filter');
      const cards  = grid.querySelectorAll('.portfolio-card');

      cards.forEach(function (card) {
        if (filter === 'all') {
          card.style.display = '';
        } else {
          const cat = card.getAttribute('data-category') || '';
          card.style.display = cat.indexOf(filter) !== -1 ? '' : 'none';
        }
      });
    });
  });
}

/* ─────────────────────────────────────────────────
   INITIALISATION — Point d'entrée principal
   Attend le DOM, puis charge chaque projet de PROJECTS_LIST
   en séquence (Promise chain) pour respecter l'ordre d'affichage
───────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {
  const grid = document.getElementById('portfolio-grid');

  /* Sécurité : si la grille n'existe pas sur la page, on s'arrête proprement */
  if (!grid) return;

  /* Chargement séquentiel via PROJECTS_LIST — aucune valeur codée en dur */
  PROJECTS_LIST.reduce(function (chain, project) {
    return chain.then(function () {
      return loadProject(grid, project);
    });
  }, Promise.resolve()).then(function () {
    bindFilters(grid);
  });
});
