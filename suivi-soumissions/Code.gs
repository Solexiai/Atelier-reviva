/**
 * ═══════════════════════════════════════════════════════════════
 *  ATELIER REVIVA — Suivi des soumissions
 * ═══════════════════════════════════════════════════════════════
 *  Ce programme tourne dans le compte Google de l'atelier.
 *
 *  À chaque demande envoyée depuis le formulaire du site :
 *    1. une ligne est ajoutée dans l'onglet « Suivi des soumissions »
 *    2. les photos sont rangées dans un dossier Google Drive
 *    3. l'atelier reçoit un courriel d'alerte
 *    4. le client reçoit un accusé de réception
 *
 *  Chaque matin (8 h) : relances automatiques + courriel « Suivi du jour ».
 *
 *  BOUTIQUE (page « Meubles à vendre » du site) :
 *    - onglet « Inventaire » : une ligne par meuble, un dossier Drive de photos par meuble
 *    - le site lit l'inventaire tout seul (statut Disponible / Réservé / Vendu)
 *    - bouton « Je le veux » → onglet « Réservations », meuble réservé, paiement Interac
 *    - inscriptions « Être averti des nouveautés » → onglet « Abonnés nouveautés »
 *
 *  RÉALISATIONS (page « Portfolio » du site) :
 *    - onglet « Réalisations » : un projet par ligne, photos avant / après dans un dossier Drive
 *
 *  Quand on change le Statut d'une ligne, les dates de suivi
 *  se remplissent toutes seules (voir REGLES_STATUT plus bas).
 *
 *  Installation : voir INSTALLATION.md (menu Atelier Reviva → Installer).
 * ═══════════════════════════════════════════════════════════════
 */

/* ───────────────────────────────────────────────
   RÉGLAGES — modifiables sans risque
─────────────────────────────────────────────── */
const CONFIG = {
  NOM_ATELIER: 'Atelier Reviva',
  SIGNATURE: 'Juliette — Atelier Reviva',
  TELEPHONE: '(514) 430-6221',
  SITE: 'https://atelierreviva.com',
  FUSEAU: 'America/Toronto',
  HEURE_RESUME: 8,                         // heure du courriel de relances (0-23)
  ONGLET_SUIVI: 'Suivi des soumissions',
  ONGLET_MODELES: 'Modèles de relance',
  ONGLET_BORD: 'Tableau de bord',
  DOSSIER_PHOTOS: 'Atelier Reviva — Photos des soumissions',
  ENVOYER_ACCUSE_CLIENT: true,             // false = pas de courriel automatique au client
  MAX_PHOTOS: 10,
  RELANCES_AUTO: true,                     // false = plus aucune relance envoyée automatiquement aux clients
  LIEN_AVIS: '',                           // lien Google pour laisser un avis (ex. https://g.page/r/…/review) — vide = pas de lien

  /* Boutique */
  ONGLET_INVENTAIRE: 'Inventaire',
  ONGLET_RESERVATIONS: 'Réservations',
  ONGLET_ABONNES: 'Abonnés nouveautés',
  DOSSIER_BOUTIQUE: 'Atelier Reviva — Photos boutique (publiques)',
  DELAI_RESERVATION_JOURS: 2,              // jours pour payer avant que le meuble soit remis en vente
  COURRIEL_INTERAC: '',                    // adresse pour les virements Interac — vide = courriel de l'atelier
  LIEU_CUEILLETTE: '',                     // ex. « à l'atelier, à Longueuil » — vide = adresse donnée par courriel
  JOURS_NOUVEAUTE: 30,                     // un meuble ajouté depuis moins de X jours porte l'étiquette « Nouveau »
  MAX_VENDUS_AFFICHES: 6,                  // nombre de meubles vendus montrés sur le site (les plus récents)

  /* Réalisations (Portfolio) */
  ONGLET_REALISATIONS: 'Réalisations',
  DOSSIER_REALISATIONS: 'Atelier Reviva — Photos réalisations (publiques)',
};

/* Statuts proposés dans la liste déroulante, dans l'ordre du parcours client */
const STATUTS = [
  'Nouvelle demande',
  'Soumission envoyée',
  'Relancé',
  'Acceptée',
  'En atelier',
  'Terminé',
  'Avis demandé',
  'Refusée',
];

/*
 * Ce qui se passe quand on choisit un statut :
 *   relance : nombre de jours avant la prochaine relance (null = aucune relance)
 *   contact : true = « Dernier contact » prend la date du jour
 */
const REGLES_STATUT = {
  'Nouvelle demande':   { relance: 2,    contact: false },  // répondre sous 48 h
  'Soumission envoyée': { relance: 3,    contact: true  },
  'Relancé':            { relance: 5,    contact: true  },
  'Acceptée':           { relance: null, contact: true  },
  'En atelier':         { relance: null, contact: false },
  'Terminé':            { relance: 7,    contact: true  },  // rappel : demander un avis
  'Avis demandé':       { relance: null, contact: true  },
  'Refusée':            { relance: null, contact: true  },
};

/* Raison affichée dans le courriel du matin, selon le statut */
const RAISON_RELANCE = {
  'Nouvelle demande':   'Soumission à préparer et envoyer',
  'Soumission envoyée': 'Relancer : pas encore de réponse à la soumission',
  'Relancé':            'Deuxième relance (ou fermer comme Refusée)',
  'Relancé (2+)':       'Pas de réponse après 2 relances : fermer comme Refusée ?',
  'Terminé':            'Demander un avis au client',
};

/* Colonnes du tableau (l'ordre peut être changé dans le Sheets, le code retrouve les colonnes par leur titre) */
const COLONNES = [
  'N°', 'Reçue le', 'Statut', 'Prochaine relance', 'Dernier contact', 'Nb relances', 'Relance auto',
  'Montant soumis ($)', 'Soumission envoyée le', 'Notes',
  'Prénom', 'Nom', 'Courriel', 'Téléphone', 'Ville / Région',
  'Type de meuble', 'Service', 'Matière', 'Dimensions', 'Budget', 'Teinte',
  'Description', 'Transport', 'Délai souhaité', 'Commentaires',
  'Photos', 'Nb photos',
];

/* Champs du formulaire du site → colonnes du tableau */
const CHAMPS_FORMULAIRE = {
  prenom: 'Prénom', nom: 'Nom', email: 'Courriel', telephone: 'Téléphone', ville: 'Ville / Région',
  typeMeuble: 'Type de meuble', typeService: 'Service', matiere: 'Matière', dimensions: 'Dimensions',
  budget: 'Budget', teinte: 'Teinte', description: 'Description', livraison: 'Transport',
  delai: 'Délai souhaité', commentaires: 'Commentaires',
};

const CHAMPS_OBLIGATOIRES = ['prenom', 'nom', 'email', 'ville', 'typeMeuble', 'typeService', 'description'];


/* ═══════════════════════════════════════════════
   MENU dans le Google Sheets
═══════════════════════════════════════════════ */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Atelier Reviva')
    .addItem('Installer / réparer le suivi', 'installer')
    .addItem('Lancer les relances du jour maintenant', 'envoyerRelancesDuJour')
    .addSeparator()
    .addItem('Mettre à jour le site maintenant (boutique et réalisations)', 'mettreAJourBoutique')
    .addToUi();
}


/* ═══════════════════════════════════════════════
   INSTALLATION — à lancer une fois depuis le menu
   (peut être relancée sans danger : rien n'est effacé)
═══════════════════════════════════════════════ */
function installer() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone(CONFIG.FUSEAU);
  detecterSeparateur_(ss);

  const props = PropertiesService.getScriptProperties();
  props.setProperty('SPREADSHEET_ID', ss.getId());
  if (!props.getProperty('COURRIEL_ATELIER')) {
    props.setProperty('COURRIEL_ATELIER', Session.getEffectiveUser().getEmail());
  }

  /* Onglet de suivi */
  let sheet = ss.getSheetByName(CONFIG.ONGLET_SUIVI);
  if (!sheet) {
    sheet = ss.getSheets().length === 1 && ss.getSheets()[0].getLastRow() === 0
      ? ss.getSheets()[0].setName(CONFIG.ONGLET_SUIVI)
      : ss.insertSheet(CONFIG.ONGLET_SUIVI, 0);
  }
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, COLONNES.length).setValues([COLONNES]);
  } else {
    // ajoute les colonnes manquantes à droite (si une version plus récente du code en ajoute)
    let existantes = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const posNb = existantes.indexOf('Nb relances');
    if (existantes.indexOf('Relance auto') === -1 && posNb !== -1) {
      sheet.insertColumnAfter(posNb + 1);
      sheet.getRange(1, posNb + 2).setValue('Relance auto');
      existantes = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    }
    COLONNES.filter(c => existantes.indexOf(c) === -1).forEach(c => {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(c);
    });
  }
  mettreEnForme_(sheet);

  /* Onglet des modèles de courriels */
  creerModeles_(ss);

  /* Onglet tableau de bord (recréé à chaque installation : il ne contient que des calculs) */
  creerTableauDeBord_(ss, sheet);

  /* Boutique : inventaire, réservations, abonnés, dossier de photos publiques */
  installerBoutique_(ss, props);

  /* Réalisations (page Portfolio) */
  installerRealisations_(ss, props);

  /* Dossier Drive des photos */
  if (!props.getProperty('DOSSIER_ID') || !dossierExiste_(props.getProperty('DOSSIER_ID'))) {
    const dossiers = DriveApp.getFoldersByName(CONFIG.DOSSIER_PHOTOS);
    const dossier = dossiers.hasNext() ? dossiers.next() : DriveApp.createFolder(CONFIG.DOSSIER_PHOTOS);
    props.setProperty('DOSSIER_ID', dossier.getId());
  }

  /* Déclencheurs : courriel du matin + mise à jour des dates quand le statut change */
  ScriptApp.getProjectTriggers().forEach(t => {
    const f = t.getHandlerFunction();
    if (f === 'envoyerRelancesDuJour' || f === 'quandOnModifie') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('envoyerRelancesDuJour')
    .timeBased().everyDays(1).atHour(CONFIG.HEURE_RESUME).inTimezone(CONFIG.FUSEAU).create();
  ScriptApp.newTrigger('quandOnModifie').forSpreadsheet(ss).onEdit().create();

  ss.toast('Suivi installé. Prochaine étape : Déployer → Nouveau déploiement (voir le guide).', CONFIG.NOM_ATELIER, 10);
}


/* ═══════════════════════════════════════════════
   RÉCEPTION D'UNE DEMANDE (appelé par le formulaire du site)
═══════════════════════════════════════════════ */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const champs = payload.champs || {};

    // Anti-pourriel : le champ caché doit rester vide
    if (payload._gotcha) return reponse_({ ok: true });

    // Boutique
    if (payload.type === 'reservation') return reponse_(traiterReservation_(payload));
    if (payload.type === 'abonnement') return reponse_(traiterAbonnement_(payload));

    const manquants = CHAMPS_OBLIGATOIRES.filter(c => !String(champs[c] || '').trim());
    if (manquants.length) return reponse_({ ok: false, erreur: 'Champs manquants : ' + manquants.join(', ') });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(champs.email).trim())) {
      return reponse_({ ok: false, erreur: 'Courriel invalide' });
    }

    lock.waitLock(30000);

    const props = PropertiesService.getScriptProperties();
    const ss = SpreadsheetApp.openById(props.getProperty('SPREADSHEET_ID'));
    const sheet = ss.getSheetByName(CONFIG.ONGLET_SUIVI);
    const col = indexColonnes_(sheet);

    const numero = 'S-' + String(Number(props.getProperty('COMPTEUR') || 0) + 1).padStart(4, '0');
    props.setProperty('COMPTEUR', numero.slice(2));

    const maintenant = new Date();
    const nomClient = (texte_(champs.prenom) + ' ' + texte_(champs.nom)).trim();

    /* Photos → dossier Drive de la demande */
    const photos = Array.isArray(payload.photos) ? payload.photos.slice(0, CONFIG.MAX_PHOTOS) : [];
    let lienPhotos = '';
    let nbPhotos = 0;
    if (photos.length) {
      const parent = DriveApp.getFolderById(props.getProperty('DOSSIER_ID'));
      const dossier = parent.createFolder(numero + ' — ' + nomClient + ' — ' + formaterDate_(maintenant));
      photos.forEach((p, i) => {
        try {
          const octets = Utilities.base64Decode(String(p.data || ''));
          const nom = String(p.nom || ('photo-' + (i + 1) + '.jpg')).replace(/[\\/:*?"<>|]/g, '_');
          dossier.createFile(Utilities.newBlob(octets, p.type || 'image/jpeg', nom));
          nbPhotos++;
        } catch (err) {
          console.warn('Photo ignorée (' + numero + ') : ' + err);
        }
      });
      lienPhotos = dossier.getUrl();
    }

    /* Nouvelle ligne */
    const ligne = new Array(sheet.getLastColumn()).fill('');
    const poser = (titre, valeur) => { if (col[titre] !== undefined) ligne[col[titre]] = valeur; };
    poser('N°', numero);
    poser('Reçue le', maintenant);
    poser('Statut', 'Nouvelle demande');
    poser('Prochaine relance', ajouterJours_(maintenant, REGLES_STATUT['Nouvelle demande'].relance));
    poser('Nb relances', 0);
    Object.keys(CHAMPS_FORMULAIRE).forEach(c => poser(CHAMPS_FORMULAIRE[c], nettoyer_(champs[c])));
    poser('Photos', lienPhotos);
    poser('Nb photos', nbPhotos);
    if (payload.photosNonTransmises) {
      poser('Notes', payload.photosNonTransmises + ' photo(s) non reçue(s) — les demander au client.');
    }

    sheet.appendRow(ligne);
    const numLigne = sheet.getLastRow();
    lock.releaseLock();

    /* Courriels (hors verrou : une erreur d'envoi ne bloque pas l'enregistrement) */
    const lienLigne = ss.getUrl() + '#gid=' + sheet.getSheetId() + '&range=A' + numLigne;
    try { alerterAtelier_(numero, champs, nbPhotos, lienPhotos, lienLigne); } catch (err) { console.error('Alerte atelier : ' + err); }
    if (CONFIG.ENVOYER_ACCUSE_CLIENT) {
      try { accuserReception_(numero, champs); } catch (err) { console.error('Accusé client : ' + err); }
    }

    return reponse_({ ok: true, numero: numero });
  } catch (err) {
    console.error('doPost : ' + (err && err.stack || err));
    return reponse_({ ok: false, erreur: 'Erreur serveur' });
  } finally {
    try { lock.releaseLock(); } catch (e2) { /* déjà libéré */ }
  }
}

/* Petite page si quelqu'un ouvre l'adresse du programme dans un navigateur */
function doGet(e) {
  if (e && e.parameter && e.parameter.action === 'realisations') {
    try {
      return reponse_(lireRealisationsPublic_());
    } catch (err) {
      console.error('Réalisations : ' + (err && err.stack || err));
      return reponse_({ ok: false, erreur: 'Réalisations indisponibles' });
    }
  }
  if (e && e.parameter && e.parameter.action === 'inventaire') {
    try {
      return reponse_(lireInventairePublic_());
    } catch (err) {
      console.error('Inventaire : ' + (err && err.stack || err));
      return reponse_({ ok: false, erreur: 'Inventaire indisponible' });
    }
  }
  return ContentService.createTextOutput(CONFIG.NOM_ATELIER + ' — le suivi des soumissions est actif.');
}


/* ═══════════════════════════════════════════════
   CHANGEMENT DE STATUT → dates de suivi automatiques
═══════════════════════════════════════════════ */
function quandOnModifie(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  if (sheet.getName() === CONFIG.ONGLET_INVENTAIRE) return quandInventaireModifie_(e);
  if (sheet.getName() === CONFIG.ONGLET_RESERVATIONS) return quandReservationModifiee_(e);
  if (sheet.getName() === CONFIG.ONGLET_REALISATIONS) return quandRealisationModifiee_(e);
  if (sheet.getName() !== CONFIG.ONGLET_SUIVI) return;

  const col = indexColonnes_(sheet);
  if (col['Statut'] === undefined) return;
  const colStatut = col['Statut'] + 1;

  // Une seule cellule ou une sélection qui touche la colonne Statut
  const premiere = e.range.getColumn();
  const derniere = premiere + e.range.getNumColumns() - 1;
  if (colStatut < premiere || colStatut > derniere) return;

  const aujourdHui = debutJournee_(new Date());
  for (let r = e.range.getRow(); r < e.range.getRow() + e.range.getNumRows(); r++) {
    if (r === 1) continue;
    const statut = String(sheet.getRange(r, colStatut).getValue()).trim();
    const regle = REGLES_STATUT[statut];
    if (!regle) continue;

    if (col['Prochaine relance'] !== undefined) {
      sheet.getRange(r, col['Prochaine relance'] + 1)
        .setValue(regle.relance === null ? '' : ajouterJours_(aujourdHui, regle.relance));
    }
    if (regle.contact && col['Dernier contact'] !== undefined) {
      sheet.getRange(r, col['Dernier contact'] + 1).setValue(aujourdHui);
    }
    if (statut === 'Soumission envoyée' && col['Soumission envoyée le'] !== undefined) {
      const cellule = sheet.getRange(r, col['Soumission envoyée le'] + 1);
      if (!cellule.getValue()) cellule.setValue(aujourdHui);
    }
    if (statut === 'Relancé' && col['Nb relances'] !== undefined) {
      const cellule = sheet.getRange(r, col['Nb relances'] + 1);
      cellule.setValue((Number(cellule.getValue()) || 0) + 1);
    }
  }
}


/* ═══════════════════════════════════════════════
   COURRIEL DU MATIN — « À relancer aujourd'hui »
═══════════════════════════════════════════════ */
function envoyerRelancesDuJour() {
  const props = PropertiesService.getScriptProperties();
  const ss = SpreadsheetApp.openById(props.getProperty('SPREADSHEET_ID'));
  const sheet = ss.getSheetByName(CONFIG.ONGLET_SUIVI);
  if (!sheet) return;

  const col = indexColonnes_(sheet);
  const donnees = sheet.getLastRow() < 2 ? [] : sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  const aujourdHui = debutJournee_(new Date());
  const finJournee = new Date(aujourdHui);
  finJournee.setHours(23, 59, 59, 999);
  const modeles = lireModeles_(ss);

  const envoyees = [];   // relances parties toutes seules
  const aRelancer = [];  // à faire par l'atelier

  donnees.forEach((d, i) => {
    const date = d[col['Prochaine relance']];
    if (!(date instanceof Date) || date > finJournee) return;

    const numLigne = i + 2;
    const statut = String(d[col['Statut']]).trim();
    const nbRelances = Number(d[col['Nb relances']]) || 0;
    const fiche = {
      ligne: numLigne,
      numero: d[col['N°']],
      prenom: texte_(d[col['Prénom']]),
      client: (texte_(d[col['Prénom']]) + ' ' + texte_(d[col['Nom']])).trim(),
      statut: statut,
      meuble: texte_(d[col['Type de meuble']]),
      service: texte_(d[col['Service']]),
      montant: d[col['Montant soumis ($)']],
      courriel: texte_(d[col['Courriel']]),
      telephone: d[col['Téléphone']],
      dateSoumission: d[col['Soumission envoyée le']],
      nbRelances: nbRelances,
      enRetard: Math.round((aujourdHui - debutJournee_(date)) / 86400000),
    };

    /* Relance automatique ? */
    const action = actionAuto_(statut, nbRelances);
    const autoPermis = CONFIG.RELANCES_AUTO && action &&
      String(d[col['Relance auto']] || 'Oui').trim().toLowerCase() !== 'non' &&
      /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(fiche.courriel);

    if (autoPermis) {
      const courriel = preparerCourriel_(modeles[action.modele], fiche);
      if (!courriel) {
        fiche.raison = 'Relance automatique impossible : le modèle « ' + action.modele + ' » contient encore des [crochets] à remplir';
      } else if (MailApp.getRemainingDailyQuota() < 3) {
        fiche.raison = 'Relance automatique reportée : limite de courriels du jour atteinte';
      } else {
        try {
          MailApp.sendEmail({
            to: fiche.courriel,
            replyTo: props.getProperty('COURRIEL_ATELIER'),
            subject: courriel.objet,
            body: courriel.texte,
            htmlBody: '<div style="font-family:Arial,sans-serif;color:#3D2E25;line-height:1.6;max-width:600px;">' +
              echapper_(courriel.texte).replace(/\n/g, '<br>') + '</div>',
            name: CONFIG.NOM_ATELIER,
          });
          appliquerApresEnvoi_(sheet, col, numLigne, action, aujourdHui, d[col['Notes']]);
          fiche.envoi = action.libelle;
          envoyees.push(fiche);
          return;
        } catch (err) {
          console.error('Relance auto ' + fiche.numero + ' : ' + err);
          fiche.raison = 'Relance automatique en échec (' + err.message + ') — à faire à la main';
        }
      }
    }

    fiche.raison = fiche.raison ||
      (statut === 'Relancé' && nbRelances >= 2 ? RAISON_RELANCE['Relancé (2+)'] : RAISON_RELANCE[statut]) ||
      ('Suivi : ' + statut);
    aRelancer.push(fiche);
  });

  reservationsAPayer_(ss, finJournee).forEach(r => aRelancer.push(r));

  if (!envoyees.length && !aRelancer.length) return;
  envoyerResume_(ss, sheet, props.getProperty('COURRIEL_ATELIER'), envoyees, aRelancer);
}

/* Quelle relance automatique pour quel statut */
function actionAuto_(statut, nbRelances) {
  if (statut === 'Soumission envoyée') {
    return { modele: 'Relance 1', libelle: 'Relance 1 envoyée', statut: 'Relancé', relance: REGLES_STATUT['Relancé'].relance, compter: true };
  }
  if (statut === 'Relancé' && nbRelances < 2) {
    // après la 2e relance, plus de courriel automatique : un dernier rappel à l'atelier dans 7 jours
    return { modele: 'Relance 2', libelle: 'Relance 2 (dernier suivi) envoyée', statut: 'Relancé', relance: 7, compter: true };
  }
  if (statut === 'Terminé') {
    return { modele: 'Meuble terminé', libelle: 'Demande d\'avis envoyée', statut: 'Avis demandé', relance: null, compter: false };
  }
  return null;
}

function appliquerApresEnvoi_(sheet, col, numLigne, action, aujourdHui, notes) {
  const poser = (titre, valeur) => { if (col[titre] !== undefined) sheet.getRange(numLigne, col[titre] + 1).setValue(valeur); };
  poser('Statut', action.statut);
  poser('Dernier contact', aujourdHui);
  poser('Prochaine relance', action.relance === null ? '' : ajouterJours_(aujourdHui, action.relance));
  if (action.compter && col['Nb relances'] !== undefined) {
    const cellule = sheet.getRange(numLigne, col['Nb relances'] + 1);
    cellule.setValue((Number(cellule.getValue()) || 0) + 1);
  }
  const trace = Utilities.formatDate(aujourdHui, CONFIG.FUSEAU, 'yyyy-MM-dd') + ' : ' + action.libelle.toLowerCase() + ' (auto)';
  poser('Notes', notes ? String(notes) + '\n' + trace : trace);
}

/* Lit les textes de l'onglet « Modèles de relance » (la cliente peut les modifier) */
function lireModeles_(ss) {
  const modeles = {};
  const sheet = ss.getSheetByName(CONFIG.ONGLET_MODELES);
  if (!sheet || sheet.getLastRow() < 2) return modeles;
  sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getValues().forEach(([quand, objet, message]) => {
    const q = String(quand);
    const cle = q.indexOf('Relance 1') === 0 ? 'Relance 1'
      : q.indexOf('Relance 2') === 0 ? 'Relance 2'
      : q.indexOf('Meuble terminé') === 0 ? 'Meuble terminé' : null;
    if (cle) modeles[cle] = { objet: String(objet), message: String(message) };
  });
  return modeles;
}

/* Remplit [Prénom], [meuble], [date], [lien avis]. Renvoie null s'il reste des [crochets] (texte pas prêt) */
function preparerCourriel_(modele, fiche) {
  if (!modele || !modele.message.trim()) return null;
  const lienAvis = CONFIG.LIEN_AVIS ? '\n\nPour laisser un avis Google : ' + CONFIG.LIEN_AVIS + '\n\n' : '';
  const meuble = (!fiche.meuble || /^autre$/i.test(fiche.meuble)) ? 'meuble' : fiche.meuble.toLowerCase();
  const date = fiche.dateSoumission instanceof Date ? dateEnFrancais_(fiche.dateSoumission) : 'récemment';
  const remplir = t => t
    .replace(/\[pr[ée]nom\]/gi, fiche.prenom || '')
    .replace(/\[meuble\]/gi, meuble)
    .replace(/\[date\]/gi, date)
    .replace(/\[lien (avis|google)\]\.?\s*/gi, lienAvis || '')
    .replace(/le récemment/g, 'récemment')
    .replace(/Bonjour ,/g, 'Bonjour,');
  const objet = remplir(modele.objet);
  const texte = remplir(modele.message);
  if (/\[[^\]]+\]/.test(objet + texte)) return null;
  return { objet: objet, texte: texte };
}

function dateEnFrancais_(date) {
  const mois = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const [, m, j] = Utilities.formatDate(date, CONFIG.FUSEAU, 'yyyy-MM-dd').split('-').map(Number);
  return (j === 1 ? '1er' : j) + ' ' + mois[m - 1];
}

function envoyerResume_(ss, sheet, destinataire, envoyees, aRelancer) {
  const lien = r => r.lien || (ss.getUrl() + '#gid=' + sheet.getSheetId() + '&range=A' + r.ligne);
  const cellule = 'padding:10px;border-bottom:1px solid #EDE7DA;';
  const ligneHtml = (r, colonneAction) =>
    '<tr>' +
      '<td style="' + cellule + '"><a href="' + lien(r) + '" style="color:#A3624A;font-weight:600;">' + echapper_(r.numero) + '</a></td>' +
      '<td style="' + cellule + '"><strong>' + echapper_(r.client) + '</strong><br>' +
        '<span style="color:#9C8578;font-size:13px;">' + echapper_([r.meuble, r.service].filter(String).join(' — ')) +
        (r.montant ? ' · ' + echapper_(r.montant) + ' $' : '') + '</span></td>' +
      '<td style="' + cellule + '">' + colonneAction + '</td>' +
      '<td style="' + cellule + 'font-size:13px;">' +
        '<a href="mailto:' + echapper_(r.courriel) + '" style="color:#6B4F3F;">' + echapper_(r.courriel) + '</a>' +
        (r.telephone ? '<br><a href="tel:' + echapper_(String(r.telephone).replace(/[^\d+]/g, '')) + '" style="color:#6B4F3F;">' + echapper_(r.telephone) + '</a>' : '') + '</td>' +
    '</tr>';
  const tableau = lignes =>
    '<table style="border-collapse:collapse;width:100%;font-size:14px;">' +
      '<tr style="text-align:left;color:#B89A6A;font-size:12px;text-transform:uppercase;">' +
        '<th style="padding:8px 10px;">N°</th><th style="padding:8px 10px;">Client</th><th style="padding:8px 10px;"></th><th style="padding:8px 10px;">Contact</th></tr>' +
      lignes + '</table>';

  let html = '<div style="font-family:Arial,sans-serif;color:#3D2E25;max-width:720px;">';
  if (aRelancer.length) {
    html += '<h2 style="font-family:Georgia,serif;color:#A3624A;font-weight:normal;">À faire aujourd\'hui (' + aRelancer.length + ')</h2>' +
      tableau(aRelancer.map(r => ligneHtml(r, echapper_(r.raison) +
        (r.enRetard > 0 ? '<br><span style="color:#A3624A;font-size:13px;">en retard de ' + r.enRetard + ' j</span>' : '') +
        (r.nbRelances ? '<br><span style="color:#9C8578;font-size:13px;">' + r.nbRelances + ' relance(s) déjà faite(s)</span>' : ''))).join('')) +
      '<p style="font-size:13px;color:#9C8578;margin-top:16px;">Après chaque échange, changez le <strong>Statut</strong> dans le tableau : la prochaine date se met à jour toute seule.</p>';
  }
  if (envoyees.length) {
    html += '<h2 style="font-family:Georgia,serif;color:#B89A6A;font-weight:normal;margin-top:28px;">Envoyé automatiquement ce matin (' + envoyees.length + ')</h2>' +
      tableau(envoyees.map(r => ligneHtml(r, '✓ ' + echapper_(r.envoi))).join('')) +
      '<p style="font-size:13px;color:#9C8578;margin-top:16px;">Les réponses des clients arriveront dans votre boîte comme un courriel normal. ' +
      'Pour qu\'un client ne reçoive plus de courriel automatique, choisissez « Non » dans sa colonne <strong>Relance auto</strong>.</p>';
  }
  html += '<p><a href="' + ss.getUrl() + '" style="color:#A3624A;">Ouvrir le tableau de suivi</a></p></div>';

  const morceaux = [];
  if (aRelancer.length) morceaux.push(aRelancer.length + ' à faire');
  if (envoyees.length) morceaux.push(envoyees.length + ' relance(s) envoyée(s)');
  MailApp.sendEmail({
    to: destinataire,
    subject: 'Suivi du jour : ' + morceaux.join(', ') + ' — ' + CONFIG.NOM_ATELIER,
    htmlBody: html,
    name: CONFIG.NOM_ATELIER,
  });
}


/* ═══════════════════════════════════════════════
   COURRIELS
═══════════════════════════════════════════════ */
function alerterAtelier_(numero, c, nbPhotos, lienPhotos, lienLigne) {
  const ligne = (titre, valeur) => valeur
    ? '<tr><td style="padding:6px 12px 6px 0;color:#9C8578;vertical-align:top;white-space:nowrap;">' + titre + '</td>' +
      '<td style="padding:6px 0;">' + echapper_(valeur).replace(/\n/g, '<br>') + '</td></tr>'
    : '';
  const html =
    '<div style="font-family:Arial,sans-serif;color:#3D2E25;max-width:640px;">' +
      '<h2 style="font-family:Georgia,serif;color:#A3624A;font-weight:normal;">Nouvelle demande de soumission ' + numero + '</h2>' +
      '<table style="border-collapse:collapse;font-size:14px;">' +
        ligne('Client', texte_(c.prenom) + ' ' + texte_(c.nom)) +
        ligne('Courriel', c.email) + ligne('Téléphone', c.telephone) + ligne('Ville', c.ville) +
        ligne('Meuble', c.typeMeuble) + ligne('Service', c.typeService) + ligne('Matière', c.matiere) +
        ligne('Dimensions', c.dimensions) + ligne('Budget', c.budget) + ligne('Teinte', c.teinte) +
        ligne('Description', c.description) + ligne('Transport', c.livraison) + ligne('Délai', c.delai) +
        ligne('Commentaires', c.commentaires) +
      '</table>' +
      '<p style="margin-top:18px;">' +
        (nbPhotos ? '<a href="' + lienPhotos + '" style="color:#A3624A;font-weight:600;">Voir les ' + nbPhotos + ' photo(s)</a> · ' : 'Aucune photo jointe · ') +
        '<a href="' + lienLigne + '" style="color:#A3624A;">Ouvrir la fiche dans le suivi</a></p>' +
      '<p style="font-size:13px;color:#9C8578;">Répondez directement à ce courriel pour écrire au client.</p>' +
    '</div>';

  MailApp.sendEmail({
    to: PropertiesService.getScriptProperties().getProperty('COURRIEL_ATELIER'),
    replyTo: String(c.email).trim(),
    subject: numero + ' — Nouvelle soumission : ' + texte_(c.typeMeuble) + ' (' + texte_(c.prenom) + ' ' + texte_(c.nom) + ')',
    htmlBody: html,
    name: CONFIG.NOM_ATELIER + ' — Site web',
  });
}

function accuserReception_(numero, c) {
  const html =
    '<div style="font-family:Arial,sans-serif;color:#3D2E25;max-width:600px;line-height:1.6;">' +
      '<p>Bonjour ' + echapper_(texte_(c.prenom)) + ',</p>' +
      '<p>Merci pour votre demande de soumission pour votre <strong>' + echapper_(texte_(c.typeMeuble).toLowerCase()) + '</strong>. ' +
        'Je l\'ai bien reçue (référence ' + numero + ') et je vous réponds dans les 48 heures ouvrables.</p>' +
      '<p>Si vous avez d\'autres photos ou des précisions, répondez simplement à ce courriel.</p>' +
      '<p>Au plaisir,<br>' + echapper_(CONFIG.SIGNATURE) + '<br>' +
        '<span style="color:#9C8578;">' + CONFIG.TELEPHONE + '</span></p>' +
    '</div>';

  MailApp.sendEmail({
    to: String(c.email).trim(),
    replyTo: PropertiesService.getScriptProperties().getProperty('COURRIEL_ATELIER'),
    subject: 'Votre demande de soumission est bien reçue — ' + CONFIG.NOM_ATELIER,
    htmlBody: html,
    name: CONFIG.NOM_ATELIER,
  });
}


/* ═══════════════════════════════════════════════
   MISE EN FORME DU TABLEAU
═══════════════════════════════════════════════ */
function mettreEnForme_(sheet) {
  const col = indexColonnes_(sheet);
  const nbCol = sheet.getLastColumn();
  const lettre = titre => columnToLetter_(col[titre] + 1);

  sheet.setFrozenRows(1);
  if (col['Statut'] !== undefined) sheet.setFrozenColumns(Math.min(col['Statut'] + 1, 3));

  sheet.getRange(1, 1, 1, nbCol)
    .setFontWeight('bold').setBackground('#F5F1EB').setFontColor('#6B4F3F').setWrap(true).setVerticalAlignment('middle');
  sheet.setRowHeight(1, 40);

  const maxLignes = Math.max(sheet.getMaxRows(), 1000);
  if (sheet.getMaxRows() < maxLignes) sheet.insertRowsAfter(sheet.getMaxRows(), maxLignes - sheet.getMaxRows());
  const corps = n => sheet.getRange(2, col[n] + 1, maxLignes - 1, 1);

  /* Liste déroulante des statuts */
  corps('Statut').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(STATUTS, true).setAllowInvalid(false).build()
  );

  /* Relance auto : vide ou « Oui » = le programme relance le client tout seul ; « Non » = c'est l'atelier qui s'en occupe */
  if (col['Relance auto'] !== undefined) {
    corps('Relance auto').setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(['Oui', 'Non'], true).setAllowInvalid(false)
        .setHelpText('Vide ou Oui : relances envoyées automatiquement au client. Non : pas de courriel automatique (ex. client déjà joint au téléphone).').build());
    sheet.setColumnWidth(col['Relance auto'] + 1, 90);
  }

  /* Formats */
  ['Reçue le'].forEach(n => col[n] !== undefined && corps(n).setNumberFormat('yyyy-mm-dd hh:mm'));
  ['Prochaine relance', 'Dernier contact', 'Soumission envoyée le'].forEach(n => {
    if (col[n] === undefined) return;
    corps(n).setNumberFormat('yyyy-mm-dd').setDataValidation(
      SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(false)
        .setHelpText('Entrez une date, par exemple 2027-01-15. Cette case se remplit aussi toute seule quand on change le Statut.').build());
  });
  if (col['Montant soumis ($)'] !== undefined) corps('Montant soumis ($)').setNumberFormat('#,##0.00 $');
  ['Description', 'Commentaires', 'Notes'].forEach(n => col[n] !== undefined && sheet.setColumnWidth(col[n] + 1, 280));
  ['Statut', 'Courriel'].forEach(n => col[n] !== undefined && sheet.setColumnWidth(col[n] + 1, 170));

  /* Couleurs automatiques */
  const plage = sheet.getRange(2, 1, maxLignes - 1, nbCol);
  const S = '$' + lettre('Statut') + '2';
  const R = '$' + lettre('Prochaine relance') + '2';
  const regles = [
    ['=AND(' + R + '<>"",' + R + '<=TODAY())', '#F8DCD0'],                  // relance due → terracotta pâle
    ['=' + S + '="Nouvelle demande"', '#FFF6E0'],                            // nouvelle → crème doré
    ['=OR(' + S + '="Acceptée",' + S + '="En atelier")', '#E3EFDD'],         // en cours → vert pâle
    ['=OR(' + S + '="Terminé",' + S + '="Avis demandé")', '#EEF0F4'],        // terminé → gris bleuté
    ['=' + S + '="Refusée"', '#EEEEEE'],                                     // refusée → gris
  ].map(([formule, couleur]) =>
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(formule_(formule)).setBackground(couleur).setRanges([plage]).build());
  sheet.setConditionalFormatRules(regles);

  if (!sheet.getFilter()) sheet.getRange(1, 1, maxLignes, nbCol).createFilter();
}

/* Statuts qui veulent dire « le client a dit oui » (le projet peut avoir avancé depuis) */
const STATUTS_ACCEPTES = ['Acceptée', 'En atelier', 'Terminé', 'Avis demandé'];

function creerTableauDeBord_(ss, suivi) {
  const col = indexColonnes_(suivi);
  const requis = ['Reçue le', 'Statut', 'Prochaine relance', 'Montant soumis ($)', 'Soumission envoyée le', 'Type de meuble', 'Service'];
  if (requis.some(t => col[t] === undefined)) return;

  /* Recréer l'onglet à neuf */
  let bord = ss.getSheetByName(CONFIG.ONGLET_BORD);
  if (bord) {
    bord.getCharts().forEach(c => bord.removeChart(c));
    bord.clear();
    bord.clearConditionalFormatRules();
  } else {
    bord = ss.insertSheet(CONFIG.ONGLET_BORD, 1);
  }

  /* Plages de l'onglet de suivi, ex. 'Suivi des soumissions'!$B$2:$B */
  const nomSuivi = "'" + CONFIG.ONGLET_SUIVI.replace(/'/g, "''") + "'!";
  const L = titre => columnToLetter_(col[titre] + 1);
  const P = titre => nomSuivi + '$' + L(titre) + '$2:$' + L(titre);
  const RECUE = P('Reçue le'), STATUT = P('Statut'), RELANCE = P('Prochaine relance'),
        MONTANT = P('Montant soumis ($)'), ENVOYEE = P('Soumission envoyée le');
  const DEBUT_MOIS = 'DATE(YEAR(TODAY()),MONTH(TODAY()),1)';

  // Somme sur les statuts « acceptés » (évite les tableaux {…} qui changent selon la langue du Sheets)
  const sommeAcceptes = modele => '(' + STATUTS_ACCEPTES.map(s => modele.replace('§', '"' + s + '"')).join('+') + ')';
  const nbAcceptes        = sommeAcceptes('COUNTIF(' + STATUT + ',§)');
  const nbAcceptesMois    = sommeAcceptes('COUNTIFS(' + STATUT + ',§,' + RECUE + ',">="&' + DEBUT_MOIS + ')');
  const montantAcceptes   = sommeAcceptes('SUMIF(' + STATUT + ',§,' + MONTANT + ')');
  const montantAccMois    = sommeAcceptes('SUMIFS(' + MONTANT + ',' + STATUT + ',§,' + RECUE + ',">="&' + DEBUT_MOIS + ')');
  const nbDemandes        = 'COUNTA(' + nomSuivi + '$A$2:$A)';
  const nbEnvoyees        = '(COUNTA(' + STATUT + ')-COUNTIF(' + STATUT + ',"Nouvelle demande"))';

  const or = '#B89A6A', terra = '#A3624A', brun = '#6B4F3F', creme = '#F5F1EB';

  /* Titre */
  bord.getRange('A1').setValue('Tableau de bord — ' + CONFIG.NOM_ATELIER)
    .setFontSize(18).setFontColor(terra).setFontFamily('Georgia');
  bord.getRange('A2').setValue('Se met à jour tout seul. Pensez à inscrire le « Montant soumis ($) » de chaque soumission pour des chiffres justes.')
    .setFontColor('#9C8578').setFontStyle('italic');

  /* Blocs d'indicateurs : [titre de section, [[libellé, formule, format], …]] */
  const blocs = [
    ['CE MOIS-CI', [
      ['Demandes reçues',              '=COUNTIFS(' + RECUE + ',">="&' + DEBUT_MOIS + ')', '0'],
      ['Soumissions envoyées',         '=COUNTIFS(' + ENVOYEE + ',">="&' + DEBUT_MOIS + ')', '0'],
      ['Acceptées (demandes du mois)', '=' + nbAcceptesMois, '0'],
      ['Montant accepté',              '=' + montantAccMois, '#,##0 $'],
    ]],
    ['EN CE MOMENT', [
      ['À relancer aujourd\'hui',      '=COUNTIFS(' + RELANCE + ',"<="&TODAY(),' + RELANCE + ',"<>")', '0'],
      ['Demandes sans réponse',        '=COUNTIF(' + STATUT + ',"Nouvelle demande")', '0'],
      ['Soumissions en attente',       '=COUNTIF(' + STATUT + ',"Soumission envoyée")+COUNTIF(' + STATUT + ',"Relancé")', '0'],
      ['Meubles en atelier',           '=COUNTIF(' + STATUT + ',"Acceptée")+COUNTIF(' + STATUT + ',"En atelier")', '0'],
    ]],
    ['DEPUIS LE DÉBUT', [
      ['Demandes reçues',              '=' + nbDemandes, '0'],
      ['Soumissions envoyées',         '=' + nbEnvoyees, '0'],
      ['Acceptées',                    '=' + nbAcceptes, '0'],
      ['Refusées',                     '=COUNTIF(' + STATUT + ',"Refusée")', '0'],
      ['Taux d\'acceptation',          '=IFERROR(' + nbAcceptes + '/' + nbEnvoyees + ',0)', '0%'],
      ['Montant total soumis',         '=SUM(' + MONTANT + ')', '#,##0 $'],
      ['Montant total accepté',        '=' + montantAcceptes, '#,##0 $'],
      ['Délai moyen avant soumission', '=IFERROR(ROUND(AVERAGE(FILTER(' + ENVOYEE + '-INT(' + RECUE + '),ISNUMBER(' + ENVOYEE + '),ISNUMBER(' + RECUE + '),' + ENVOYEE + '>=INT(' + RECUE + '))),1)&" jours","—")', '@'],
    ]],
  ];

  let ligne = 4;
  blocs.forEach(([titre, items]) => {
    bord.getRange(ligne, 1).setValue(titre).setFontWeight('bold').setFontColor(or).setFontSize(9);
    ligne++;
    items.forEach(([libelle, formule, format]) => {
      bord.getRange(ligne, 1).setValue(libelle).setFontColor(brun);
      bord.getRange(ligne, 2).setFormula(formule_(formule)).setNumberFormat(format)
        .setFontWeight('bold').setFontSize(12).setHorizontalAlignment('right');
      ligne++;
    });
    ligne++;
  });

  /* Meubles et services les plus demandés */
  const top = (colonne, depart, titre, entete) => {
    const c = L(colonne);
    bord.getRange(depart).setValue(titre).setFontWeight('bold').setFontColor(or).setFontSize(9);
    const cellule = bord.getRange(depart).offset(1, 0);
    cellule.setFormula(formule_('=IFERROR(QUERY(' + nomSuivi + '$' + c + '$2:$' + c + ',"select ' + c + ', count(' + c + ') where ' + c +
      " <> '' group by " + c + ' order by count(' + c + ') desc limit 6 label ' + c + " '" + entete + "', count(" + c + ") 'Demandes'\",0),\"Aucune demande pour l'instant\")"));
    cellule.offset(0, 0, 1, 2).setFontWeight('bold').setBackground(creme).setFontColor(brun);
  };
  top('Type de meuble', 'D4', 'MEUBLES LES PLUS DEMANDÉS', 'Meuble');
  top('Service', 'G4', 'SERVICES LES PLUS DEMANDÉS', 'Service');

  /* Demandes par mois + graphique.
     Période choisie dans la case F14 : « 12 derniers mois » (avance tout seul chaque mois)
     ou une année précise (janvier à décembre). */
  const GLISSANT = '12 derniers mois';
  const anneeDepart = 2026;
  const annees = [GLISSANT];
  for (let a = anneeDepart; a <= Math.max(new Date().getFullYear() + 10, anneeDepart + 10); a++) annees.push(String(a));

  bord.getRange('D14').setValue('DEMANDES PAR MOIS').setFontWeight('bold').setFontColor(or).setFontSize(9);
  bord.getRange('E14').setValue('Période :').setFontColor(brun).setHorizontalAlignment('right');
  bord.getRange('F14').setValue(GLISSANT)
    .setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(annees, true).setAllowInvalid(false).build())
    .setFontWeight('bold').setFontColor(terra).setBackground('#FFF6E0');
  bord.getRange('D15:F15').setValues([['Mois', 'Demandes', 'Acceptées']])
    .setFontWeight('bold').setBackground(creme).setFontColor(brun);
  for (let k = 0; k < 12; k++) {
    const r = 16 + k;
    const debut = 'IF($F$14="' + GLISSANT + '",DATE(YEAR(TODAY()),MONTH(TODAY())-' + (11 - k) + ',1),DATE(VALUE($F$14),' + (k + 1) + ',1))';
    bord.getRange(r, 4).setFormula(formule_('=' + debut)).setNumberFormat('mmm yyyy');
    bord.getRange(r, 5).setFormula(formule_('=COUNTIFS(' + RECUE + ',">="&D' + r + ',' + RECUE + ',"<"&EDATE(D' + r + ',1))'));
    bord.getRange(r, 6).setFormula(formule_('=' + sommeAcceptes('COUNTIFS(' + STATUT + ',§,' + RECUE + ',">="&D' + r + ',' + RECUE + ',"<"&EDATE(D' + r + ',1))')));
  }

  const graphique = bord.newChart()
    .setChartType(Charts.ChartType.COLUMN)
    .addRange(bord.getRange('D15:F27'))
    .setNumHeaders(1)
    .setPosition(14, 8, 0, 0)
    .setOption('title', 'Demandes par mois')
    .setOption('legend.position', 'bottom')
    .setOption('colors', [or, terra])
    .setOption('width', 520).setOption('height', 300)
    .build();
  bord.insertChart(graphique);

  bord.setColumnWidth(1, 230); bord.setColumnWidth(2, 120); bord.setColumnWidth(3, 30);
  bord.setColumnWidth(4, 190); bord.setColumnWidth(5, 90); bord.setColumnWidth(6, 130);
  bord.setColumnWidth(7, 190); bord.setColumnWidth(8, 90);
  bord.setHiddenGridlines(true);
}

const MODELE_AVIS =
  'Bonjour [Prénom],\n\nJ\'espère que votre [meuble] se plaît dans son nouvel espace ! ' +
  'Si vous avez deux minutes, quelques mots sur votre expérience m\'aideraient énormément à faire connaître l\'atelier : ' +
  'il suffit de répondre à ce courriel. [lien avis]' +
  'Et si vous avez une photo du meuble chez vous, j\'adorerais la voir.\n\nMerci encore,\n' + CONFIG.SIGNATURE;

function creerModeles_(ss) {
  const existant = ss.getSheetByName(CONFIG.ONGLET_MODELES);
  if (existant) {
    // Met à jour l'ancien texte d'avis (avec [lien Google]) seulement s'il n'a pas été personnalisé
    const valeurs = existant.getDataRange().getValues();
    valeurs.forEach((ligne, i) => {
      if (String(ligne[0]).indexOf('demande d\'avis') !== -1 && String(ligne[2]).indexOf('[lien Google]') !== -1) {
        existant.getRange(i + 1, 3).setValue(MODELE_AVIS);
      }
    });
    if (String(valeurs[0][2]).indexOf('relances automatiques') === -1) {
      existant.getRange(1, 3).setValue('Message — utilisé tel quel pour les relances automatiques ([Prénom], [meuble], [date] et [lien avis] se remplissent tout seuls)');
    }
    return; // ne pas écraser les textes personnalisés
  }
  const sheet = ss.insertSheet(CONFIG.ONGLET_MODELES);
  const modeles = [
    ['Quand', 'Objet', 'Message — utilisé tel quel pour les relances automatiques ([Prénom], [meuble], [date] et [lien avis] se remplissent tout seuls)'],
    ['Relance 1 — 3 jours après la soumission', 'Votre soumission pour votre [meuble]',
      'Bonjour [Prénom],\n\nJe fais un petit suivi concernant la soumission envoyée le [date] pour votre [meuble]. ' +
      'Avez-vous eu le temps d\'y jeter un œil ? Je suis disponible pour répondre à vos questions ou ajuster les options (teinte, finition, délai).\n\nAu plaisir,\n' + CONFIG.SIGNATURE + '\n' + CONFIG.TELEPHONE],
    ['Relance 2 — dernier suivi', 'Dernier suivi — votre [meuble]',
      'Bonjour [Prénom],\n\nJe me permets un dernier petit message au sujet de votre [meuble]. ' +
      'Si le projet est reporté, aucun souci : dites-le-moi et je garderai votre soumission de côté. ' +
      'Mon carnet se remplit vite, alors n\'hésitez pas si vous souhaitez réserver une place.\n\nBonne journée,\n' + CONFIG.SIGNATURE],
    ['Soumission acceptée — confirmation', 'C\'est confirmé pour votre [meuble] !',
      'Bonjour [Prénom],\n\nMerci pour votre confiance ! Votre [meuble] est réservé dans mon calendrier. ' +
      'Voici la suite : [dépôt / transport / date de début].\n\nÀ bientôt,\n' + CONFIG.SIGNATURE],
    ['Meuble terminé — demande d\'avis', 'Votre avis compte beaucoup pour moi', MODELE_AVIS],
  ];
  sheet.getRange(1, 1, modeles.length, 3).setValues(modeles).setWrap(true).setVerticalAlignment('top');
  sheet.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground('#F5F1EB').setFontColor('#6B4F3F');
  sheet.setColumnWidth(1, 240); sheet.setColumnWidth(2, 260); sheet.setColumnWidth(3, 560);
  sheet.setFrozenRows(1);
}


/* ═══════════════════════════════════════════════
   BOUTIQUE — inventaire, réservations, abonnés
═══════════════════════════════════════════════ */
const COLONNES_INVENTAIRE = [
  'Code', 'Statut', 'Nom', 'Catégorie', 'Prix ($)', 'Dimensions', 'Matériau', 'Finition / style',
  'Description', 'Dossier photos', 'Nb photos', 'Réservé par', 'Réservé le', 'Ajouté le',
];
const STATUTS_INVENTAIRE = ['Brouillon', 'Disponible', 'Réservé', 'Vendu'];
const CATEGORIES_MEUBLES = ['Commode', 'Buffet', 'Table', 'Chevet', 'Chaise / fauteuil', 'Bibliothèque', 'Armoire', 'Mobilier d\'appoint', 'Autre'];

const COLONNES_RESERVATIONS = [
  'N°', 'Reçue le', 'Statut', 'Payer avant le', 'Code meuble', 'Meuble', 'Prix ($)',
  'Prénom', 'Nom', 'Courriel', 'Téléphone', 'Remise', 'Message', 'Notes',
];
const STATUTS_RESERVATION = ['Nouvelle réservation', 'Paiement reçu', 'Remis au client', 'Annulée'];

const COLONNES_ABONNES = ['Inscrit le', 'Prénom', 'Courriel', 'Intérêt', 'Source'];

const CLE_CACHE_INVENTAIRE = 'inventaire_public_v1';
const REGEX_COURRIEL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;


/* ── Installation des onglets de la boutique ── */
function installerBoutique_(ss, props) {
  /* Onglet Inventaire */
  const inv = preparerOnglet_(ss, CONFIG.ONGLET_INVENTAIRE, COLONNES_INVENTAIRE);
  const ci = indexColonnes_(inv);
  const lignes = Math.max(inv.getMaxRows(), 500) - 1;
  const corpsInv = t => inv.getRange(2, ci[t] + 1, lignes, 1);
  corpsInv('Statut').setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInList(STATUTS_INVENTAIRE, true).setAllowInvalid(false)
    .setHelpText('Brouillon = pas encore sur le site. Disponible = en vente. Réservé et Vendu se mettent aussi à jour tout seuls.').build());
  corpsInv('Catégorie').setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInList(CATEGORIES_MEUBLES, true).setAllowInvalid(false).build());
  corpsInv('Prix ($)').setNumberFormat('#,##0 $');
  corpsInv('Ajouté le').setNumberFormat('yyyy-mm-dd');
  corpsInv('Réservé le').setNumberFormat('yyyy-mm-dd');
  inv.setColumnWidth(ci['Nom'] + 1, 220);
  inv.setColumnWidth(ci['Description'] + 1, 320);
  inv.setColumnWidth(ci['Dossier photos'] + 1, 160);
  const plageInv = inv.getRange(2, 1, lignes, inv.getLastColumn());
  const S = '$' + columnToLetter_(ci['Statut'] + 1) + '2';
  inv.setConditionalFormatRules([
    ['=' + S + '="Disponible"', '#E3EFDD'],
    ['=' + S + '="Réservé"', '#FFF6E0'],
    ['=' + S + '="Vendu"', '#EEEEEE'],
  ].map(([f, c]) => SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(formule_(f)).setBackground(c).setRanges([plageInv]).build()));
  inv.getRange(1, ci['Nom'] + 1).setNote('Pour ajouter un meuble : écrivez son nom ici. Le code et le dossier photos apparaissent tout seuls. ' +
    'Déposez les photos dans le dossier (nommez « avant » la photo d\'avant transformation), puis passez le Statut à Disponible.');

  /* Onglet Réservations */
  const res = preparerOnglet_(ss, CONFIG.ONGLET_RESERVATIONS, COLONNES_RESERVATIONS);
  const cr = indexColonnes_(res);
  const lignesRes = Math.max(res.getMaxRows(), 500) - 1;
  res.getRange(2, cr['Statut'] + 1, lignesRes, 1).setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInList(STATUTS_RESERVATION, true).setAllowInvalid(false)
    .setHelpText('Remis au client = le meuble passe Vendu. Annulée = le meuble est remis en vente.').build());
  res.getRange(2, cr['Reçue le'] + 1, lignesRes, 1).setNumberFormat('yyyy-mm-dd hh:mm');
  res.getRange(2, cr['Payer avant le'] + 1, lignesRes, 1).setNumberFormat('yyyy-mm-dd');
  res.getRange(2, cr['Prix ($)'] + 1, lignesRes, 1).setNumberFormat('#,##0 $');
  const plageRes = res.getRange(2, 1, lignesRes, res.getLastColumn());
  const SR = '$' + columnToLetter_(cr['Statut'] + 1) + '2';
  const PR = '$' + columnToLetter_(cr['Payer avant le'] + 1) + '2';
  res.setConditionalFormatRules([
    ['=AND(' + SR + '="Nouvelle réservation",' + PR + '<>"",' + PR + '<=TODAY())', '#F8DCD0'],
    ['=' + SR + '="Nouvelle réservation"', '#FFF6E0'],
    ['=' + SR + '="Paiement reçu"', '#E3EFDD'],
    ['=OR(' + SR + '="Remis au client",' + SR + '="Annulée")', '#EEEEEE'],
  ].map(([f, c]) => SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(formule_(f)).setBackground(c).setRanges([plageRes]).build()));

  /* Onglet Abonnés */
  const abo = preparerOnglet_(ss, CONFIG.ONGLET_ABONNES, COLONNES_ABONNES);
  abo.getRange(2, 1, Math.max(abo.getMaxRows(), 500) - 1, 1).setNumberFormat('yyyy-mm-dd');

  /* Dossier Drive des photos de la boutique, lisible par tous (ce sont les photos du site) */
  if (!props.getProperty('DOSSIER_BOUTIQUE_ID') || !dossierExiste_(props.getProperty('DOSSIER_BOUTIQUE_ID'))) {
    const dossiers = DriveApp.getFoldersByName(CONFIG.DOSSIER_BOUTIQUE);
    const dossier = dossiers.hasNext() ? dossiers.next() : DriveApp.createFolder(CONFIG.DOSSIER_BOUTIQUE);
    props.setProperty('DOSSIER_BOUTIQUE_ID', dossier.getId());
  }
  try {
    DriveApp.getFolderById(props.getProperty('DOSSIER_BOUTIQUE_ID'))
      .setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (err) {
    console.warn('Partage du dossier boutique : ' + err);
  }

  viderCacheBoutique_();
}

/* Crée l'onglet s'il manque, pose les titres, ajoute les colonnes manquantes */
function preparerOnglet_(ss, nom, colonnes) {
  let sheet = ss.getSheetByName(nom);
  if (!sheet) sheet = ss.insertSheet(nom);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, colonnes.length).setValues([colonnes]);
  } else {
    const existantes = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    colonnes.filter(c => existantes.indexOf(c) === -1).forEach(c => sheet.getRange(1, sheet.getLastColumn() + 1).setValue(c));
  }
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, colonnes.length)
    .setFontWeight('bold').setBackground('#F5F1EB').setFontColor('#6B4F3F').setWrap(true).setVerticalAlignment('middle');
  sheet.setRowHeight(1, 40);
  return sheet;
}

function mettreAJourBoutique() {
  viderCacheBoutique_();
  viderCacheRealisations_();
  const resultat = lireInventairePublic_();
  const nb = resultat.meubles.filter(m => m.statut !== 'Vendu').length;
  const nbProjets = lireRealisationsPublic_().projets.length;
  try {
    SpreadsheetApp.getActiveSpreadsheet().toast('Site à jour : ' + nb + ' meuble(s) en vente ou réservé(s), ' + nbProjets + ' réalisation(s) publiée(s).', CONFIG.NOM_ATELIER, 8);
  } catch (e) { /* lancé hors du Sheets */ }
}

function viderCacheBoutique_() {
  try { CacheService.getScriptCache().remove(CLE_CACHE_INVENTAIRE); } catch (e) { /* rien */ }
}


/* ── Ajout ou modification d'un meuble dans l'onglet Inventaire ── */
function quandInventaireModifie_(e) {
  const sheet = e.range.getSheet();
  const col = indexColonnes_(sheet);
  const props = PropertiesService.getScriptProperties();
  const debut = Math.max(2, e.range.getRow());
  const fin = e.range.getRow() + e.range.getNumRows() - 1;
  const premiere = e.range.getColumn();
  const derniere = premiere + e.range.getNumColumns() - 1;
  const touche = titre => col[titre] !== undefined && col[titre] + 1 >= premiere && col[titre] + 1 <= derniere;

  for (let r = debut; r <= fin; r++) {
    const cellule = titre => sheet.getRange(r, col[titre] + 1);
    const nom = texte_(cellule('Nom').getValue());

    /* Nouveau meuble : code, statut Brouillon, date, dossier photos */
    if (nom && !texte_(cellule('Code').getValue())) {
      const lock = LockService.getScriptLock();
      lock.waitLock(20000);
      try {
        const code = 'M-' + String(Number(props.getProperty('COMPTEUR_MEUBLES') || 0) + 1).padStart(3, '0');
        props.setProperty('COMPTEUR_MEUBLES', code.slice(2));
        cellule('Code').setValue(code);
        if (!texte_(cellule('Statut').getValue())) cellule('Statut').setValue('Brouillon');
        cellule('Ajouté le').setValue(debutJournee_(new Date()));
        const parent = DriveApp.getFolderById(props.getProperty('DOSSIER_BOUTIQUE_ID'));
        const dossier = parent.createFolder(code + ' — ' + nom.replace(/[\\/:*?"<>|]/g, '_'));
        cellule('Dossier photos').setValue(dossier.getUrl());
      } finally {
        lock.releaseLock();
      }
    }

    /* Remis en vente à la main : on efface la réservation */
    if (touche('Statut') && texte_(cellule('Statut').getValue()) === 'Disponible') {
      cellule('Réservé par').setValue('');
      cellule('Réservé le').setValue('');
    }
  }
  viderCacheBoutique_();
}


/* ── Ce que le site affiche (lu par la page « Meubles à vendre ») ── */
function lireInventairePublic_() {
  const cache = CacheService.getScriptCache();
  const enCache = cache.get(CLE_CACHE_INVENTAIRE);
  if (enCache) return JSON.parse(enCache);

  const props = PropertiesService.getScriptProperties();
  const ss = SpreadsheetApp.openById(props.getProperty('SPREADSHEET_ID'));
  const sheet = ss.getSheetByName(CONFIG.ONGLET_INVENTAIRE);
  const resultat = { ok: true, meubles: [], maj: new Date().toISOString() };
  if (!sheet || sheet.getLastRow() < 2) {
    cache.put(CLE_CACHE_INVENTAIRE, JSON.stringify(resultat), 600);
    return resultat;
  }

  const col = indexColonnes_(sheet);
  const donnees = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  const limiteNouveau = ajouterJours_(new Date(), -CONFIG.JOURS_NOUVEAUTE);
  const nbPhotosParLigne = [];
  let vendus = [];

  donnees.forEach((d, i) => {
    const statut = texte_(d[col['Statut']]);
    const nom = texte_(d[col['Nom']]);
    if (!nom || ['Disponible', 'Réservé', 'Vendu'].indexOf(statut) === -1) return;

    const photos = photosDuDossier_(texte_(d[col['Dossier photos']]));
    nbPhotosParLigne.push([i + 2, photos.apres.length + (photos.avant ? 1 : 0)]);
    const ajoute = d[col['Ajouté le']];
    const meuble = {
      code: texte_(d[col['Code']]),
      nom: nom,
      categorie: texte_(d[col['Catégorie']]) || 'Autre',
      prix: Number(d[col['Prix ($)']]) || null,
      statut: statut,
      dimensions: texte_(d[col['Dimensions']]),
      materiau: texte_(d[col['Matériau']]),
      finition: texte_(d[col['Finition / style']]),
      description: texte_(d[col['Description']]),
      nouveau: statut === 'Disponible' && ajoute instanceof Date && ajoute >= limiteNouveau,
      photos: photos.apres,
      avant: photos.avant,
    };
    if (statut === 'Vendu') {
      meuble._tri = (d[col['Réservé le']] instanceof Date ? d[col['Réservé le']] : ajoute instanceof Date ? ajoute : new Date(0)).getTime();
      vendus.push(meuble);
    } else {
      resultat.meubles.push(meuble);
    }
  });

  vendus.sort((a, b) => b._tri - a._tri);
  vendus = vendus.slice(0, CONFIG.MAX_VENDUS_AFFICHES);
  vendus.forEach(m => { delete m._tri; resultat.meubles.push(m); });

  /* Nombre de photos trouvées, pour que l'atelier voie si ses photos sont bien détectées */
  if (col['Nb photos'] !== undefined) {
    nbPhotosParLigne.forEach(([ligne, nb]) => sheet.getRange(ligne, col['Nb photos'] + 1).setValue(nb));
  }

  const json = JSON.stringify(resultat);
  if (json.length < 95000) cache.put(CLE_CACHE_INVENTAIRE, json, 600);
  return resultat;
}

/* Photos d'un dossier Drive : « avant » à part, les autres triées par nom de fichier */
function photosDuDossier_(lienDossier) {
  const resultat = { apres: [], avant: null };
  const m = /folders\/([A-Za-z0-9_-]+)/.exec(lienDossier || '') || /[?&]id=([A-Za-z0-9_-]+)/.exec(lienDossier || '');
  if (!m) return resultat;
  let dossier;
  try { dossier = DriveApp.getFolderById(m[1]); } catch (e) { return resultat; }

  const fichiers = [];
  const iterateur = dossier.getFiles();
  while (iterateur.hasNext()) {
    const f = iterateur.next();
    if (String(f.getMimeType()).indexOf('image/') !== 0) continue;
    try {
      if (f.getSharingAccess() !== DriveApp.Access.ANYONE_WITH_LINK) {
        f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      }
    } catch (err) {
      console.warn('Partage photo ' + f.getName() + ' : ' + err);
    }
    fichiers.push({ nom: f.getName(), id: f.getId() });
  }
  fichiers.sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { numeric: true }));

  const versUrl = id => ({
    url: 'https://lh3.googleusercontent.com/d/' + id + '=w1400',
    mini: 'https://lh3.googleusercontent.com/d/' + id + '=w700',
  });
  fichiers.forEach(f => {
    if (!resultat.avant && /avant|before/i.test(f.nom)) resultat.avant = versUrl(f.id);
    else resultat.apres.push(versUrl(f.id));
  });
  resultat.apres = resultat.apres.slice(0, 8);
  return resultat;
}


/* ── Réservation d'un meuble depuis le site ── */
function traiterReservation_(payload) {
  const c = payload.champs || {};
  const code = texte_(payload.code);
  const manquants = ['prenom', 'nom', 'email', 'telephone'].filter(k => !texte_(c[k]));
  if (!code || manquants.length) return { ok: false, erreur: 'Champs manquants : ' + manquants.join(', ') };
  if (!REGEX_COURRIEL.test(texte_(c.email))) return { ok: false, erreur: 'Courriel invalide' };
  if (texte_(c.consentement) === '' ) return { ok: false, erreur: 'Consentement requis' };

  const props = PropertiesService.getScriptProperties();
  const ss = SpreadsheetApp.openById(props.getProperty('SPREADSHEET_ID'));
  const inv = ss.getSheetByName(CONFIG.ONGLET_INVENTAIRE);
  const res = ss.getSheetByName(CONFIG.ONGLET_RESERVATIONS);
  if (!inv || !res) return { ok: false, erreur: 'Boutique non installée' };

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  let meuble, numero, payerAvant, numLigne;
  try {
    const ci = indexColonnes_(inv);
    const lignes = inv.getLastRow() < 2 ? [] : inv.getRange(2, 1, inv.getLastRow() - 1, inv.getLastColumn()).getValues();
    const index = lignes.findIndex(d => texte_(d[ci['Code']]) === code);
    if (index === -1) return { ok: false, erreur: 'introuvable' };
    const d = lignes[index];
    if (texte_(d[ci['Statut']]) !== 'Disponible') return { ok: false, erreur: 'deja_reserve' };

    meuble = { code: code, nom: texte_(d[ci['Nom']]), prix: Number(d[ci['Prix ($)']]) || 0 };
    const maintenant = new Date();
    const ligneInv = index + 2;
    inv.getRange(ligneInv, ci['Statut'] + 1).setValue('Réservé');
    inv.getRange(ligneInv, ci['Réservé par'] + 1).setValue(nettoyer_(texte_(c.prenom) + ' ' + texte_(c.nom)));
    inv.getRange(ligneInv, ci['Réservé le'] + 1).setValue(debutJournee_(maintenant));

    numero = 'R-' + String(Number(props.getProperty('COMPTEUR_RESERVATIONS') || 0) + 1).padStart(4, '0');
    props.setProperty('COMPTEUR_RESERVATIONS', numero.slice(2));
    payerAvant = ajouterJours_(maintenant, CONFIG.DELAI_RESERVATION_JOURS);

    const cr = indexColonnes_(res);
    const ligne = new Array(res.getLastColumn()).fill('');
    const poser = (t, v) => { if (cr[t] !== undefined) ligne[cr[t]] = v; };
    poser('N°', numero);
    poser('Reçue le', maintenant);
    poser('Statut', 'Nouvelle réservation');
    poser('Payer avant le', payerAvant);
    poser('Code meuble', code);
    poser('Meuble', meuble.nom);
    poser('Prix ($)', meuble.prix);
    poser('Prénom', nettoyer_(c.prenom));
    poser('Nom', nettoyer_(c.nom));
    poser('Courriel', nettoyer_(c.email));
    poser('Téléphone', nettoyer_(c.telephone));
    poser('Remise', texte_(c.remise) === 'livraison' ? 'Livraison à organiser' : 'Cueillette');
    poser('Message', nettoyer_(c.message));
    res.appendRow(ligne);
    numLigne = res.getLastRow();
  } finally {
    lock.releaseLock();
  }
  viderCacheBoutique_();

  const lienLigne = ss.getUrl() + '#gid=' + res.getSheetId() + '&range=A' + numLigne;
  try { alerterReservation_(numero, meuble, c, payerAvant, lienLigne); } catch (err) { console.error('Alerte réservation : ' + err); }
  try { confirmerReservation_(numero, meuble, c, payerAvant); } catch (err) { console.error('Confirmation réservation : ' + err); }

  return {
    ok: true,
    numero: numero,
    prix: meuble.prix,
    payerAvant: dateEnFrancais_(payerAvant),
    interac: courrielInterac_(),
  };
}

function courrielInterac_() {
  return CONFIG.COURRIEL_INTERAC || PropertiesService.getScriptProperties().getProperty('COURRIEL_ATELIER');
}

function alerterReservation_(numero, meuble, c, payerAvant, lienLigne) {
  const ligne = (t, v) => v ? '<tr><td style="padding:5px 12px 5px 0;color:#9C8578;">' + t + '</td><td>' + echapper_(v).replace(/\n/g, '<br>') + '</td></tr>' : '';
  MailApp.sendEmail({
    to: PropertiesService.getScriptProperties().getProperty('COURRIEL_ATELIER'),
    replyTo: texte_(c.email),
    subject: numero + ' — Réservation : ' + meuble.nom + ' (' + texte_(c.prenom) + ' ' + texte_(c.nom) + ')',
    name: CONFIG.NOM_ATELIER + ' — Boutique',
    htmlBody:
      '<div style="font-family:Arial,sans-serif;color:#3D2E25;max-width:620px;">' +
        '<h2 style="font-family:Georgia,serif;color:#A3624A;font-weight:normal;">Meuble réservé : ' + echapper_(meuble.nom) + '</h2>' +
        '<table style="border-collapse:collapse;font-size:14px;">' +
          ligne('Réservation', numero) + ligne('Meuble', meuble.code + ' — ' + meuble.nom) +
          ligne('Prix', meuble.prix ? meuble.prix + ' $' : '') +
          ligne('Client', texte_(c.prenom) + ' ' + texte_(c.nom)) + ligne('Courriel', c.email) + ligne('Téléphone', c.telephone) +
          ligne('Remise', texte_(c.remise) === 'livraison' ? 'Livraison à organiser' : 'Cueillette') +
          ligne('Message', c.message) + ligne('Paiement attendu avant le', dateEnFrancais_(payerAvant)) +
        '</table>' +
        '<p style="margin-top:16px;">Le meuble est passé à « Réservé » sur le site. Quand le virement Interac arrive, mettez la réservation à <strong>Paiement reçu</strong> ; ' +
          'quand le client repart avec, à <strong>Remis au client</strong> (le meuble passe Vendu). Si rien n\'arrive, <strong>Annulée</strong> le remet en vente.</p>' +
        '<p><a href="' + lienLigne + '" style="color:#A3624A;">Ouvrir la réservation</a></p>' +
      '</div>',
  });
}

function confirmerReservation_(numero, meuble, c, payerAvant) {
  const prix = meuble.prix ? meuble.prix + ' $' : 'le montant convenu';
  const livraison = texte_(c.remise) === 'livraison';
  const lieu = CONFIG.LIEU_CUEILLETTE ? ' ' + CONFIG.LIEU_CUEILLETTE : '';
  const texte =
    'Bonjour ' + texte_(c.prenom) + ',\n\n' +
    'Bonne nouvelle : « ' + meuble.nom + ' » vous est réservé jusqu\'au ' + dateEnFrancais_(payerAvant) + ' (référence ' + numero + ').\n\n' +
    'Pour confirmer votre achat, deux options :\n' +
    '• Virement Interac de ' + prix + ' à ' + courrielInterac_() + ', en indiquant ' + numero + ' dans le message ;\n' +
    '• ou paiement à la cueillette' + lieu + ' : répondez à ce courriel pour fixer un rendez-vous.\n\n' +
    (livraison
      ? 'Vous avez demandé une livraison : je vous écris très vite pour convenir de la date et des frais.\n\n'
      : 'Je vous écris très vite pour convenir du moment de la cueillette.\n\n') +
    'Sans nouvelles de votre part d\'ici le ' + dateEnFrancais_(payerAvant) + ', la pièce sera remise en vente.\n\n' +
    'Merci de faire vivre une deuxième vie à ce meuble !\n' + CONFIG.SIGNATURE + '\n' + CONFIG.TELEPHONE;

  MailApp.sendEmail({
    to: texte_(c.email),
    replyTo: PropertiesService.getScriptProperties().getProperty('COURRIEL_ATELIER'),
    subject: 'Votre réservation ' + numero + ' : ' + meuble.nom + ' — ' + CONFIG.NOM_ATELIER,
    body: texte,
    htmlBody: '<div style="font-family:Arial,sans-serif;color:#3D2E25;line-height:1.6;max-width:600px;">' + echapper_(texte).replace(/\n/g, '<br>') + '</div>',
    name: CONFIG.NOM_ATELIER,
  });
}


/* ── Changement de statut d'une réservation → inventaire mis à jour ── */
function quandReservationModifiee_(e) {
  const sheet = e.range.getSheet();
  const cr = indexColonnes_(sheet);
  if (cr['Statut'] === undefined) return;
  const colStatut = cr['Statut'] + 1;
  const premiere = e.range.getColumn();
  if (colStatut < premiere || colStatut > premiere + e.range.getNumColumns() - 1) return;

  const inv = sheet.getParent().getSheetByName(CONFIG.ONGLET_INVENTAIRE);
  if (!inv) return;
  const ci = indexColonnes_(inv);
  const codes = inv.getLastRow() < 2 ? [] : inv.getRange(2, ci['Code'] + 1, inv.getLastRow() - 1, 1).getValues().map(r => texte_(r[0]));

  for (let r = Math.max(2, e.range.getRow()); r < e.range.getRow() + e.range.getNumRows(); r++) {
    const statut = texte_(sheet.getRange(r, colStatut).getValue());
    const code = texte_(sheet.getRange(r, cr['Code meuble'] + 1).getValue());
    const index = codes.indexOf(code);
    if (index === -1) continue;
    const ligneInv = index + 2;
    const statutInv = inv.getRange(ligneInv, ci['Statut'] + 1);

    if (statut === 'Remis au client') {
      statutInv.setValue('Vendu');
    } else if (statut === 'Annulée' && texte_(statutInv.getValue()) === 'Réservé') {
      statutInv.setValue('Disponible');
      inv.getRange(ligneInv, ci['Réservé par'] + 1).setValue('');
      inv.getRange(ligneInv, ci['Réservé le'] + 1).setValue('');
    } else if (statut === 'Paiement reçu' || statut === 'Nouvelle réservation') {
      if (texte_(statutInv.getValue()) === 'Disponible') statutInv.setValue('Réservé');
    }
  }
  viderCacheBoutique_();
}


/* ── Réservations dont le paiement n'est pas arrivé (pour le courriel du matin) ── */
function reservationsAPayer_(ss, finJournee) {
  const res = ss.getSheetByName(CONFIG.ONGLET_RESERVATIONS);
  if (!res || res.getLastRow() < 2) return [];
  const cr = indexColonnes_(res);
  const aujourdHui = debutJournee_(new Date());
  return res.getRange(2, 1, res.getLastRow() - 1, res.getLastColumn()).getValues()
    .map((d, i) => ({ d: d, ligne: i + 2 }))
    .filter(({ d }) => texte_(d[cr['Statut']]) === 'Nouvelle réservation' &&
      d[cr['Payer avant le']] instanceof Date && d[cr['Payer avant le']] <= finJournee)
    .map(({ d, ligne }) => ({
      ligne: ligne,
      lien: ss.getUrl() + '#gid=' + res.getSheetId() + '&range=A' + ligne,
      numero: d[cr['N°']],
      client: (texte_(d[cr['Prénom']]) + ' ' + texte_(d[cr['Nom']])).trim(),
      meuble: 'Réservation boutique',
      service: texte_(d[cr['Meuble']]),
      montant: d[cr['Prix ($)']],
      courriel: texte_(d[cr['Courriel']]),
      telephone: d[cr['Téléphone']],
      nbRelances: 0,
      enRetard: Math.round((aujourdHui - debutJournee_(d[cr['Payer avant le']])) / 86400000),
      raison: 'Paiement pas encore reçu : relancer le client, ou mettre la réservation à « Annulée » pour remettre le meuble en vente',
    }));
}


/* ── Inscription « Être averti des nouveautés » ── */
function traiterAbonnement_(payload) {
  const c = payload.champs || {};
  const courriel = texte_(c.email).toLowerCase();
  if (!REGEX_COURRIEL.test(courriel)) return { ok: false, erreur: 'Courriel invalide' };
  if (texte_(c.consentement) === '') return { ok: false, erreur: 'Consentement requis' };

  const props = PropertiesService.getScriptProperties();
  const ss = SpreadsheetApp.openById(props.getProperty('SPREADSHEET_ID'));
  const abo = ss.getSheetByName(CONFIG.ONGLET_ABONNES);
  if (!abo) return { ok: false, erreur: 'Boutique non installée' };
  const ca = indexColonnes_(abo);

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const existants = abo.getLastRow() < 2 ? [] : abo.getRange(2, ca['Courriel'] + 1, abo.getLastRow() - 1, 1).getValues().map(r => texte_(r[0]).toLowerCase());
    if (existants.indexOf(courriel) !== -1) return { ok: true, deja: true };
    const ligne = new Array(abo.getLastColumn()).fill('');
    ligne[ca['Inscrit le']] = new Date();
    ligne[ca['Prénom']] = nettoyer_(c.prenom);
    ligne[ca['Courriel']] = nettoyer_(courriel);
    ligne[ca['Intérêt']] = nettoyer_(c.interet);
    ligne[ca['Source']] = 'Site — Meubles à vendre';
    abo.appendRow(ligne);
  } finally {
    lock.releaseLock();
  }

  try {
    MailApp.sendEmail({
      to: courriel,
      replyTo: props.getProperty('COURRIEL_ATELIER'),
      subject: 'Vous serez averti des nouveaux meubles — ' + CONFIG.NOM_ATELIER,
      name: CONFIG.NOM_ATELIER,
      body: 'Bonjour' + (texte_(c.prenom) ? ' ' + texte_(c.prenom) : '') + ',\n\n' +
        'Merci ! Je vous écrirai dès qu\'une nouvelle pièce revalorisée sera prête à partir.\n' +
        'Pour ne plus recevoir ces avis, répondez simplement « désabonner » à ce courriel.\n\n' +
        CONFIG.SIGNATURE + '\n' + CONFIG.TELEPHONE,
    });
  } catch (err) {
    console.error('Confirmation abonnement : ' + err);
  }
  return { ok: true };
}


/* ═══════════════════════════════════════════════
   RÉALISATIONS — page « Portfolio » du site
═══════════════════════════════════════════════ */
const COLONNES_REALISATIONS = ['Code', 'Statut', 'Nom', 'Type de meuble', 'Service', 'Description', 'Vedette', 'Dossier photos', 'Nb photos', 'Ajouté le'];
const STATUTS_REALISATION = ['Brouillon', 'Publié'];
const SERVICES_REALISATION = ['Revalorisation complète', 'Peinture et finition', 'Restauration esthétique', 'Conseils personnalisés'];
const CLE_CACHE_REALISATIONS = 'realisations_public_v1';

function installerRealisations_(ss, props) {
  const sheet = preparerOnglet_(ss, CONFIG.ONGLET_REALISATIONS, COLONNES_REALISATIONS);
  const c = indexColonnes_(sheet);
  const lignes = Math.max(sheet.getMaxRows(), 500) - 1;
  const corps = t => sheet.getRange(2, c[t] + 1, lignes, 1);
  corps('Statut').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(STATUTS_REALISATION, true).setAllowInvalid(false)
    .setHelpText('Brouillon = pas encore sur le site. Publié = visible dans le Portfolio.').build());
  corps('Type de meuble').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(CATEGORIES_MEUBLES, true).setAllowInvalid(true).build());
  corps('Service').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(SERVICES_REALISATION, true).setAllowInvalid(true).build());
  corps('Vedette').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['Oui', 'Non'], true).setAllowInvalid(false)
    .setHelpText('Oui = projet affiché en grand en haut du Portfolio. Sans vedette, le plus récent est mis en avant.').build());
  corps('Ajouté le').setNumberFormat('yyyy-mm-dd');
  sheet.setColumnWidth(c['Nom'] + 1, 220);
  sheet.setColumnWidth(c['Description'] + 1, 340);
  sheet.setColumnWidth(c['Dossier photos'] + 1, 160);
  sheet.getRange(1, c['Nom'] + 1).setNote('Pour ajouter une réalisation : écrivez son nom ici. Le code et le dossier photos apparaissent tout seuls. ' +
    'Déposez la photo d\'avant (nommez-la « avant ») et les photos d\'après, puis passez le Statut à Publié.');
  const S = '$' + columnToLetter_(c['Statut'] + 1) + '2';
  sheet.setConditionalFormatRules([SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(formule_('=' + S + '="Publié"'))
    .setBackground('#E3EFDD').setRanges([sheet.getRange(2, 1, lignes, sheet.getLastColumn())]).build()]);

  if (!props.getProperty('DOSSIER_REALISATIONS_ID') || !dossierExiste_(props.getProperty('DOSSIER_REALISATIONS_ID'))) {
    const dossiers = DriveApp.getFoldersByName(CONFIG.DOSSIER_REALISATIONS);
    const dossier = dossiers.hasNext() ? dossiers.next() : DriveApp.createFolder(CONFIG.DOSSIER_REALISATIONS);
    props.setProperty('DOSSIER_REALISATIONS_ID', dossier.getId());
  }
  try {
    DriveApp.getFolderById(props.getProperty('DOSSIER_REALISATIONS_ID')).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (err) {
    console.warn('Partage du dossier réalisations : ' + err);
  }
  viderCacheRealisations_();
}

function viderCacheRealisations_() {
  try { CacheService.getScriptCache().remove(CLE_CACHE_REALISATIONS); } catch (e) { /* rien */ }
}

function quandRealisationModifiee_(e) {
  const sheet = e.range.getSheet();
  const c = indexColonnes_(sheet);
  const props = PropertiesService.getScriptProperties();
  for (let r = Math.max(2, e.range.getRow()); r < e.range.getRow() + e.range.getNumRows(); r++) {
    const cellule = t => sheet.getRange(r, c[t] + 1);
    const nom = texte_(cellule('Nom').getValue());
    if (!nom || texte_(cellule('Code').getValue())) continue;
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      const code = 'P-' + String(Number(props.getProperty('COMPTEUR_PROJETS') || 0) + 1).padStart(3, '0');
      props.setProperty('COMPTEUR_PROJETS', code.slice(2));
      cellule('Code').setValue(code);
      if (!texte_(cellule('Statut').getValue())) cellule('Statut').setValue('Brouillon');
      cellule('Ajouté le').setValue(debutJournee_(new Date()));
      const parent = DriveApp.getFolderById(props.getProperty('DOSSIER_REALISATIONS_ID'));
      cellule('Dossier photos').setValue(parent.createFolder(code + ' — ' + nom.replace(/[\\/:*?"<>|]/g, '_')).getUrl());
    } finally {
      lock.releaseLock();
    }
  }
  viderCacheRealisations_();
}

/* Ce que la page Portfolio affiche */
function lireRealisationsPublic_() {
  const cache = CacheService.getScriptCache();
  const enCache = cache.get(CLE_CACHE_REALISATIONS);
  if (enCache) return JSON.parse(enCache);

  const props = PropertiesService.getScriptProperties();
  const ss = SpreadsheetApp.openById(props.getProperty('SPREADSHEET_ID'));
  const sheet = ss.getSheetByName(CONFIG.ONGLET_REALISATIONS);
  const resultat = { ok: true, projets: [], maj: new Date().toISOString() };

  if (sheet && sheet.getLastRow() >= 2) {
    const c = indexColonnes_(sheet);
    const donnees = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
    donnees.forEach((d, i) => {
      if (texte_(d[c['Statut']]) !== 'Publié' || !texte_(d[c['Nom']])) return;
      const photos = photosDuDossier_(texte_(d[c['Dossier photos']]));
      if (c['Nb photos'] !== undefined) sheet.getRange(i + 2, c['Nb photos'] + 1).setValue(photos.apres.length + (photos.avant ? 1 : 0));
      if (!photos.apres.length && !photos.avant) return; // rien à montrer
      const ajoute = d[c['Ajouté le']];
      resultat.projets.push({
        code: texte_(d[c['Code']]),
        nom: texte_(d[c['Nom']]),
        meuble: texte_(d[c['Type de meuble']]),
        service: texte_(d[c['Service']]),
        description: texte_(d[c['Description']]),
        vedette: texte_(d[c['Vedette']]).toLowerCase() === 'oui',
        avant: photos.avant,
        photos: photos.apres,
        _tri: ajoute instanceof Date ? ajoute.getTime() : 0,
        _ligne: i,
      });
    });
    // Plus récents d'abord (à date égale, la ligne la plus basse du tableau)
    resultat.projets.sort((a, b) => (b._tri - a._tri) || (b._ligne - a._ligne));
    resultat.projets.forEach(p => { delete p._tri; delete p._ligne; });
  }

  const json = JSON.stringify(resultat);
  if (json.length < 95000) cache.put(CLE_CACHE_REALISATIONS, json, 600);
  return resultat;
}


/* ═══════════════════════════════════════════════
   OUTILS
═══════════════════════════════════════════════ */
function indexColonnes_(sheet) {
  const titres = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
  const index = {};
  titres.forEach((t, i) => { if (t !== '') index[String(t).trim()] = i; });
  return index;
}

function reponse_(objet) {
  return ContentService.createTextOutput(JSON.stringify(objet)).setMimeType(ContentService.MimeType.JSON);
}

function nettoyer_(valeur) {
  // Texte simple, sans formule (empêche qu'une valeur commençant par = + - @ soit exécutée dans le Sheets)
  let s = String(valeur === undefined || valeur === null ? '' : valeur).trim().slice(0, 5000);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function texte_(valeur) {
  return String(valeur === undefined || valeur === null ? '' : valeur).trim();
}

function echapper_(valeur) {
  return String(valeur === undefined || valeur === null ? '' : valeur)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function debutJournee_(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function ajouterJours_(date, jours) {
  const d = debutJournee_(date);
  d.setDate(d.getDate() + jours);
  return d;
}

function formaterDate_(date) {
  return Utilities.formatDate(date, CONFIG.FUSEAU, 'yyyy-MM-dd');
}

function dossierExiste_(id) {
  try { DriveApp.getFolderById(id).getName(); return true; } catch (e) { return false; }
}

/* ── Séparateur des formules ──
   Un Sheets réglé en français (Canada) attend « ; » entre les arguments, en anglais « , ».
   On teste le Sheets une fois, puis formule_() adapte chaque formule écrite par le programme. */
let SEPARATEUR_FORMULE = ',';

function detecterSeparateur_(ss) {
  const ancien = ss.getSheetByName('_essai_formule_');
  if (ancien) ss.deleteSheet(ancien);
  const essai = ss.insertSheet('_essai_formule_');
  try {
    const cellule = essai.getRange(1, 1);
    cellule.setFormula('=SUM(1,2)');          // en français, « 1,2 » se lit 1,2 et non 1 puis 2
    SpreadsheetApp.flush();
    SEPARATEUR_FORMULE = cellule.getValue() === 3 ? ',' : ';';
  } catch (e) {
    SEPARATEUR_FORMULE = ';';
  } finally {
    ss.deleteSheet(essai);
  }
}

/* Remplace les virgules séparant les arguments, sans toucher au texte entre guillemets
   ni aux noms d'onglets entre apostrophes */
function formule_(f) {
  if (SEPARATEUR_FORMULE === ',') return f;
  let sortie = '', guillemets = false, apostrophes = false;
  for (const ch of f) {
    if (ch === '"' && !apostrophes) guillemets = !guillemets;
    else if (ch === "'" && !guillemets) apostrophes = !apostrophes;
    sortie += (ch === ',' && !guillemets && !apostrophes) ? SEPARATEUR_FORMULE : ch;
  }
  return sortie;
}

function columnToLetter_(n) {
  let s = '';
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}
