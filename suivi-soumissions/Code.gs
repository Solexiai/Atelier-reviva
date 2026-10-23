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
 *  Chaque matin (8 h) : courriel « À relancer aujourd'hui ».
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
  'Terminé':            'Demander un avis au client',
};

/* Colonnes du tableau (l'ordre peut être changé dans le Sheets, le code retrouve les colonnes par leur titre) */
const COLONNES = [
  'N°', 'Reçue le', 'Statut', 'Prochaine relance', 'Dernier contact', 'Nb relances',
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
    .addItem('Envoyer les relances du jour maintenant', 'envoyerRelancesDuJour')
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
    const existantes = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    COLONNES.filter(c => existantes.indexOf(c) === -1).forEach(c => {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(c);
    });
  }
  mettreEnForme_(sheet);

  /* Onglet des modèles de courriels */
  creerModeles_(ss);

  /* Onglet tableau de bord (recréé à chaque installation : il ne contient que des calculs) */
  creerTableauDeBord_(ss, sheet);

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
function doGet() {
  return ContentService.createTextOutput(CONFIG.NOM_ATELIER + ' — le suivi des soumissions est actif.');
}


/* ═══════════════════════════════════════════════
   CHANGEMENT DE STATUT → dates de suivi automatiques
═══════════════════════════════════════════════ */
function quandOnModifie(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
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
  if (!sheet || sheet.getLastRow() < 2) return;

  const col = indexColonnes_(sheet);
  const donnees = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  const finJournee = debutJournee_(new Date());
  finJournee.setHours(23, 59, 59, 999);

  const aRelancer = [];
  donnees.forEach((d, i) => {
    const date = d[col['Prochaine relance']];
    if (!(date instanceof Date) || date > finJournee) return;
    aRelancer.push({
      ligne: i + 2,
      numero: d[col['N°']],
      client: (d[col['Prénom']] + ' ' + d[col['Nom']]).trim(),
      statut: d[col['Statut']],
      meuble: [d[col['Type de meuble']], d[col['Service']]].filter(String).join(' — '),
      montant: d[col['Montant soumis ($)']],
      courriel: d[col['Courriel']],
      telephone: d[col['Téléphone']],
      nbRelances: d[col['Nb relances']],
      enRetard: Math.round((debutJournee_(new Date()) - debutJournee_(date)) / 86400000),
    });
  });
  if (!aRelancer.length) return;

  const lien = r => ss.getUrl() + '#gid=' + sheet.getSheetId() + '&range=A' + r.ligne;
  const lignesHtml = aRelancer.map(r =>
    '<tr>' +
      '<td style="padding:10px;border-bottom:1px solid #EDE7DA;"><a href="' + lien(r) + '" style="color:#A3624A;font-weight:600;">' + echapper_(r.numero) + '</a></td>' +
      '<td style="padding:10px;border-bottom:1px solid #EDE7DA;"><strong>' + echapper_(r.client) + '</strong><br>' +
        '<span style="color:#9C8578;font-size:13px;">' + echapper_(r.meuble) + (r.montant ? ' · ' + echapper_(r.montant) + ' $' : '') + '</span></td>' +
      '<td style="padding:10px;border-bottom:1px solid #EDE7DA;">' + echapper_(RAISON_RELANCE[r.statut] || ('Suivi : ' + r.statut)) +
        (r.enRetard > 0 ? '<br><span style="color:#A3624A;font-size:13px;">en retard de ' + r.enRetard + ' j</span>' : '') +
        (r.nbRelances ? '<br><span style="color:#9C8578;font-size:13px;">' + r.nbRelances + ' relance(s) déjà faite(s)</span>' : '') + '</td>' +
      '<td style="padding:10px;border-bottom:1px solid #EDE7DA;font-size:13px;">' +
        '<a href="mailto:' + echapper_(r.courriel) + '" style="color:#6B4F3F;">' + echapper_(r.courriel) + '</a>' +
        (r.telephone ? '<br><a href="tel:' + echapper_(String(r.telephone).replace(/[^\d+]/g, '')) + '" style="color:#6B4F3F;">' + echapper_(r.telephone) + '</a>' : '') + '</td>' +
    '</tr>'
  ).join('');

  const html =
    '<div style="font-family:Arial,sans-serif;color:#3D2E25;max-width:720px;">' +
      '<h2 style="font-family:Georgia,serif;color:#A3624A;font-weight:normal;">À relancer aujourd\'hui (' + aRelancer.length + ')</h2>' +
      '<table style="border-collapse:collapse;width:100%;font-size:14px;">' +
        '<tr style="text-align:left;color:#B89A6A;font-size:12px;text-transform:uppercase;">' +
          '<th style="padding:8px 10px;">N°</th><th style="padding:8px 10px;">Client</th><th style="padding:8px 10px;">À faire</th><th style="padding:8px 10px;">Contact</th></tr>' +
        lignesHtml +
      '</table>' +
      '<p style="font-size:13px;color:#9C8578;margin-top:20px;">Après chaque relance, changez le <strong>Statut</strong> dans le tableau : la prochaine date se met à jour toute seule. ' +
        'Des textes prêts à copier sont dans l\'onglet « ' + CONFIG.ONGLET_MODELES + ' ».</p>' +
      '<p><a href="' + ss.getUrl() + '" style="color:#A3624A;">Ouvrir le tableau de suivi</a></p>' +
    '</div>';

  MailApp.sendEmail({
    to: props.getProperty('COURRIEL_ATELIER'),
    subject: 'À relancer aujourd\'hui : ' + aRelancer.length + ' client(s) — ' + CONFIG.NOM_ATELIER,
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

  /* Formats */
  ['Reçue le'].forEach(n => col[n] !== undefined && corps(n).setNumberFormat('yyyy-mm-dd hh:mm'));
  ['Prochaine relance', 'Dernier contact', 'Soumission envoyée le'].forEach(n => {
    if (col[n] === undefined) return;
    corps(n).setNumberFormat('yyyy-mm-dd').setDataValidation(
      SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(true).build());
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
      ['Délai moyen avant soumission', '=IFERROR(ROUND(AVERAGE(FILTER(' + ENVOYEE + '-INT(' + RECUE + '),ISNUMBER(' + ENVOYEE + '),ISNUMBER(' + RECUE + '))),1)&" jours","—")', '@'],
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

  /* Demandes par mois (12 derniers mois) + graphique */
  bord.getRange('D14').setValue('DEMANDES PAR MOIS').setFontWeight('bold').setFontColor(or).setFontSize(9);
  bord.getRange('D15:F15').setValues([['Mois', 'Demandes', 'Acceptées']])
    .setFontWeight('bold').setBackground(creme).setFontColor(brun);
  for (let k = 0; k < 12; k++) {
    const r = 16 + k;
    const debut = 'DATE(YEAR(TODAY()),MONTH(TODAY())-' + (11 - k) + ',1)';
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
  bord.setColumnWidth(4, 190); bord.setColumnWidth(5, 90); bord.setColumnWidth(6, 90);
  bord.setColumnWidth(7, 190); bord.setColumnWidth(8, 90);
  bord.setHiddenGridlines(true);
}

function creerModeles_(ss) {
  if (ss.getSheetByName(CONFIG.ONGLET_MODELES)) return; // ne pas écraser les textes personnalisés
  const sheet = ss.insertSheet(CONFIG.ONGLET_MODELES);
  const modeles = [
    ['Quand', 'Objet', 'Message (remplacer les [crochets])'],
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
    ['Meuble terminé — demande d\'avis', 'Votre avis compte beaucoup pour moi',
      'Bonjour [Prénom],\n\nJ\'espère que votre [meuble] se plaît dans son nouvel espace ! ' +
      'Si vous avez deux minutes, un petit avis m\'aiderait énormément à faire connaître l\'atelier : [lien Google]. ' +
      'Et si vous avez une photo du meuble chez vous, j\'adorerais la voir.\n\nMerci encore,\n' + CONFIG.SIGNATURE],
  ];
  sheet.getRange(1, 1, modeles.length, 3).setValues(modeles).setWrap(true).setVerticalAlignment('top');
  sheet.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground('#F5F1EB').setFontColor('#6B4F3F');
  sheet.setColumnWidth(1, 240); sheet.setColumnWidth(2, 260); sheet.setColumnWidth(3, 560);
  sheet.setFrozenRows(1);
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
