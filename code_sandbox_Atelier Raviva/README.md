# Atelier Reviva — Site web complet

## Pages créées (10 pages)

| Fichier             | Titre                        | Statut   |
|---------------------|------------------------------|----------|
| `index.html`        | Accueil                      | ✅ Complet |
| `apropos.html`      | À propos                     | ✅ Complet |
| `services.html`     | Services + Formulaire soumission | ✅ Complet |
| `meubles.html`      | Meubles à vendre (Shopify)   | ✅ Complet |
| `portfolio.html`    | Portfolio 20 projets         | ✅ Complet |
| `formation.html`    | Formation + Calendrier + Liste d'attente | ✅ Complet |
| `temoignages.html`  | Témoignages (12 avis)        | ✅ Complet |
| `faq.html`          | FAQ (accordéon, schema)      | ✅ Complet |
| `blog.html`         | Blog (10 articles + filtres) | ✅ Complet |
| `contact.html`      | Contact + formulaire + zones | ✅ Complet |

## CSS
| Fichier          | Rôle                                         |
|------------------|----------------------------------------------|
| `css/style.css`  | Styles globaux : header, hero, boutons, footer, responsive |
| `css/pages.css`  | Styles pages internes : formulaires, portfolio, boutique, FAQ, blog |

## JavaScript
| Fichier          | Rôle                                         |
|------------------|----------------------------------------------|
| `js/main.js`     | Header scroll, menu hamburger, fade-in, nav active |

## Fonctionnalités clés

### Page Services (services.html)
- 4 services détaillés avec images alternées
- Processus en 5 étapes
- **Formulaire de soumission complet** avec :
  - Coordonnées (prénom, nom, courriel, téléphone, ville)
  - Détails du meuble (type, service, matière, dimensions, budget, teinte)
  - **Upload de photos** (drag & drop + aperçu)
  - Transport, délai souhaité
  - Message de succès après envoi
- FAQ Services en accordéon
- Lien depuis l'icône "Demander une soumission" de toutes les pages

### Page Meubles à vendre (meubles.html)
- **Prête pour Shopify** : boutons "Acheter via Shopify" avec ancres `#shopify-url-*`
- Bandeau de confiance (paiement sécurisé, cartes acceptées, confirmation rapide)
- Explication du processus Shopify
- Filtres : tout, commodes, buffets, tables, chevets, chaises, appoint, nouveautés
- 6 meubles + 3 emplacements "Bientôt disponible"
- Guide d'achat en 3 étapes

### Page Portfolio (portfolio.html)
- **20 emplacements projets** : 6 avec photos réelles, 14 prêts à recevoir vos photos
- Filtres : commode, buffet, table, peinture, bois, vintage, transformation complète
- Overlay hover avec bouton "Voir le projet"
- Tags par projet

### Page Formation (formation.html)
- 5 modules avec images
- **Calendrier 12 mois complet jusqu'en juin 2026**
- Formulaire de liste d'attente avec succès
- FAQ accordéon

## À remplacer avant la mise en ligne
1. `#shopify-url-*` → URLs produits Shopify réels
2. Coordonnées : téléphone, courriel, adresse
3. Liens Instagram / Facebook
4. Photos d'atelier réelles (remplacer Unsplash)
5. Projets portfolio 7–20 : ajouter vos photos dans les emplacements vides

## Structure responsive
- Desktop : header 3 colonnes, grilles 3–4 colonnes
- Tablette (< 1024px) : grilles 2 colonnes
- Mobile (< 768px) : hamburger, toutes sections 1 colonne
