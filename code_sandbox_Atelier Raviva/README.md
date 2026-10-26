# Atelier Reviva — Site web complet

## Pages créées (10 pages)

| Fichier             | Titre                        | Statut   |
|---------------------|------------------------------|----------|
| `index.html`        | Accueil                      | ✅ Complet |
| `apropos.html`      | À propos                     | ✅ Complet |
| `services.html`     | Services + Formulaire soumission | ✅ Complet |
| `meubles.html`      | Meubles à vendre (inventaire Google Sheets, réservation + Interac) | ✅ Complet |
| `portfolio.html`    | Réalisations avant / après (onglet Réalisations du Google Sheets) | ✅ Complet |
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
| `js/boutique.js` | Page Meubles : inventaire, fiche, réservation, abonnement |
| `js/realisations.js` | Page Portfolio : curseur avant / après, fiche projet |

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

### Pages Meubles à vendre et Portfolio
Gérées sans toucher au code, depuis le Google Sheets de l'atelier (onglets **Inventaire** et **Réalisations**).
Voir `suivi-soumissions/INSTALLATION.md`.

### Page Formation (formation.html)
- 5 modules avec images
- **Calendrier 12 mois complet jusqu'en juin 2026**
- Formulaire de liste d'attente avec succès
- FAQ accordéon

## À remplacer avant la mise en ligne
2. Coordonnées : téléphone, courriel, adresse
3. Liens Instagram / Facebook
4. Photos d'atelier réelles (remplacer Unsplash)
5. Meubles et réalisations : à ajouter dans le Google Sheets de l'atelier

## Structure responsive
- Desktop : header 3 colonnes, grilles 3–4 colonnes
- Tablette (< 1024px) : grilles 2 colonnes
- Mobile (< 768px) : hamburger, toutes sections 1 colonne
