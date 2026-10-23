# Suivi des soumissions — Atelier Reviva

Chaque demande envoyée depuis le formulaire **Services → Demandez votre soumission** arrive dans un Google Sheets de suivi, avec les photos rangées dans Google Drive, une alerte par courriel et un rappel chaque matin des clients à relancer.

Tout se passe dans le compte Google de l'atelier. C'est gratuit, et aucun compte n'est demandé aux clients.

---

## Installation (environ 10 minutes, une seule fois)

### 1. Créer le tableau
1. Connectez-vous au compte Google de l'atelier.
2. Allez sur **sheets.new** pour créer un nouveau Google Sheets.
3. Nommez-le **Suivi des soumissions — Atelier Reviva** (en haut à gauche).

### 2. Coller le programme
1. Dans le Sheets, ouvrez le menu **Extensions → Apps Script**.
2. Un éditeur s'ouvre avec un fichier `Code.gs`. **Effacez tout son contenu.**
3. Collez à la place **tout** le contenu du fichier `Code.gs` fourni.
4. Cliquez sur l'icône **Enregistrer** (disquette), ou faites Ctrl + S.

### 3. Installer le suivi
1. Retournez dans l'onglet du Sheets et **rechargez la page** (F5).
2. Un nouveau menu **Atelier Reviva** apparaît à droite de « Aide ». Ouvrez-le, puis cliquez sur **Installer / réparer le suivi**.
3. Google demande une autorisation. C'est normal, puisque le programme vous appartient :
   - cliquez sur **Continuer** et choisissez le compte de l'atelier ;
   - si l'écran « Google n'a pas validé cette application » s'affiche, cliquez sur **Paramètres avancés**, puis sur **Accéder à … (non sécurisé)** ;
   - cliquez sur **Autoriser**.
4. Relancez **Atelier Reviva → Installer / réparer le suivi** une deuxième fois. Le message « Suivi installé » s'affiche en bas à droite.

Vous avez maintenant trois onglets : **Suivi des soumissions**, **Tableau de bord** et **Modèles de relance**. Un dossier Drive **Atelier Reviva — Photos des soumissions** a aussi été créé.

### 4. Mettre le programme en ligne
1. Revenez dans l'éditeur Apps Script.
2. En haut à droite, cliquez sur **Déployer → Nouveau déploiement**.
3. Cliquez sur la roue dentée à côté de « Sélectionnez le type », puis choisissez **Application Web**.
4. Remplissez :
   - **Description** : `Formulaire du site`
   - **Exécuter en tant que** : **Moi**
   - **Qui a accès** : **Tout le monde** (indispensable pour que les visiteurs du site puissent envoyer une demande ; ils ne voient pas le tableau)
5. Cliquez sur **Déployer** et autorisez si on vous le demande.
6. **Copiez l'URL de l'application Web.** Elle se termine par `/exec`.

### 5. Brancher le site
Envoyez cette URL à la personne qui gère le site. Elle la colle dans `services.html`, à la ligne :

```js
const SUIVI_URL = '';
```

ce qui donne :

```js
const SUIVI_URL = 'https://script.google.com/macros/s/……/exec';
```

### 6. Tester
Remplissez le formulaire du site avec votre propre courriel et une photo. Dans la minute qui suit, vous devriez avoir :
- une ligne **S-0001** dans le tableau ;
- un dossier avec la photo dans Drive ;
- un courriel d'alerte « Nouvelle soumission » ;
- l'accusé de réception dans la boîte du « client » (vous).

Supprimez ensuite cette ligne de test.

---

## Utilisation au quotidien

### Quand une demande arrive
Vous recevez un courriel avec tout le détail, un lien vers les photos et un lien vers la fiche. **Répondre au courriel écrit directement au client.**

### Le tableau
Chaque ligne est une demande. La seule chose à faire est de **changer le Statut** (liste déroulante) au fil du projet. Les dates se remplissent toutes seules :

| Statut choisi | Ce qui se met à jour |
|---|---|
| Nouvelle demande | Rappel dans 2 jours pour envoyer la soumission (promesse de 48 h) |
| Soumission envoyée | Date d'envoi notée, relance prévue **dans 3 jours** |
| Relancé | Compteur de relances +1, prochaine relance **dans 5 jours** |
| Acceptée | Plus de relance |
| En atelier | Plus de relance |
| Terminé | Rappel **dans 7 jours** pour demander un avis |
| Avis demandé | Dossier clos |
| Refusée | Dossier clos |

Pensez aussi à remplir le **Montant soumis ($)** et les **Notes**. Changez le statut **dès que le client répond** : les relances automatiques se basent sur lui. La date **Prochaine relance** peut être modifiée à la main à tout moment, par exemple si le client a demandé qu'on le rappelle en janvier.

**Couleurs automatiques :**
- 🟧 orangé : relance due aujourd'hui ou en retard ;
- 🟨 crème : nouvelle demande ;
- 🟩 vert : acceptée ou en atelier ;
- ⬜ gris : terminée, avis demandé ou refusée.

Les flèches de la première ligne permettent de **filtrer**, par exemple pour n'afficher que les « Soumission envoyée ».

### Les relances automatiques (chaque matin à 8 h)
Le programme écrit **lui-même** aux clients qui n'ont pas répondu, depuis l'adresse de l'atelier, avec les textes de l'onglet **Modèles de relance** :

| Situation du client | Ce qui part tout seul | Ensuite |
|---|---|---|
| Soumission envoyée, sans nouvelles depuis 3 jours | **Relance 1** | Statut « Relancé », nouvelle relance dans 5 jours |
| Relancé une fois, toujours sans nouvelles | **Relance 2** (dernier suivi) | Plus de courriel automatique. Rappel dans 7 jours pour fermer le dossier (« Refusée ») |
| Meuble terminé depuis 7 jours | **Demande d'avis** | Statut « Avis demandé », dossier clos |

Chaque envoi est noté dans la colonne **Notes** (« relance 1 envoyée (auto) »), et **Dernier contact** et **Nb relances** se mettent à jour. Les réponses des clients arrivent dans la boîte de l'atelier comme un courriel normal.

**Rien n'est envoyé automatiquement pour une « Nouvelle demande »** : la soumission, c'est vous qui la préparez.

**Pour qu'un client ne reçoive pas de courriel automatique** (par exemple si vous venez de lui parler au téléphone), choisissez **Non** dans sa colonne **Relance auto**. Une case vide ou « Oui » veut dire que les relances partent. Le client reste alors dans votre liste « À faire ».

### Le courriel du matin (8 h)
Vous recevez **« Suivi du jour »** avec deux parties :
- **À faire aujourd'hui** : les soumissions à préparer, les dossiers à fermer et les clients en « Non ». Pour chacun, vous avez la raison, le retard et les coordonnées en un clic.
- **Envoyé automatiquement ce matin** : la liste des relances parties toutes seules.

S'il n'y a rien à faire ni rien d'envoyé, aucun courriel n'arrive.

Pour lancer le tout à un autre moment : **Atelier Reviva → Lancer les relances du jour maintenant**. Attention, ce menu envoie aussi les relances automatiques qui sont dues.

### Modèles de relance
L'onglet **Modèles de relance** contient les textes des courriels :
- relance 1 ;
- relance 2 ;
- confirmation d'une soumission acceptée ;
- demande d'avis.

La relance 1, la relance 2 et la demande d'avis servent **tels quels** aux relances automatiques. Les mots entre crochets se remplissent tout seuls :
- `[Prénom]` : le prénom du client ;
- `[meuble]` : son meuble, par exemple « commode » ;
- `[date]` : la date de la soumission, par exemple « 21 octobre » ;
- `[lien avis]` : le lien Google pour laisser un avis, s'il est réglé.

Vous pouvez réécrire les textes à votre goût, le programme ne les écrase jamais. **N'ajoutez pas d'autres [crochets]** dans ces trois modèles. Si le programme en trouve un qu'il ne sait pas remplir, il n'envoie rien et vous prévient dans le courriel du matin. Le modèle « confirmation » est seulement à copier à la main.

### Le tableau de bord
L'onglet **Tableau de bord** se calcule tout seul à partir du suivi, sans rien à remplir. Il présente :
- **Ce mois-ci** : demandes reçues, soumissions envoyées, acceptées et montant accepté.
- **En ce moment** : clients à relancer, demandes sans réponse, soumissions en attente et meubles en atelier.
- **Depuis le début** : taux d'acceptation, montants soumis et acceptés, délai moyen avant d'envoyer une soumission.
- **Les meubles et les services les plus demandés.**
- **Les demandes par mois**, en tableau et en graphique. La case **Période** (fond crème, au-dessus du tableau) permet de choisir :
  - **12 derniers mois** (par défaut) : la période avance toute seule chaque mois, sans rien toucher ;
  - **une année précise** (2026, 2027, 2028…) : le tableau et le graphique affichent alors janvier à décembre de cette année-là.

Pour que les montants soient justes, inscrivez le **Montant soumis ($)** de chaque soumission. Les projets passés à « En atelier », « Terminé » ou « Avis demandé » comptent comme acceptés.

Ne modifiez pas cet onglet à la main. Il est recréé à neuf à chaque **Installer / réparer le suivi**.

### Sur cellulaire
L'appli **Google Sheets** permet de changer un statut en deux touches, et l'appli **Google Drive** de voir les photos.

---

## Réglages (facultatif)

En haut de `Code.gs`, le bloc `CONFIG` permet de changer :
- la signature et le téléphone des courriels ;
- l'heure du courriel du matin (`HEURE_RESUME`) ;
- l'envoi ou non de l'accusé de réception au client (`ENVOYER_ACCUSE_CLIENT`) ;
- l'arrêt de toutes les relances automatiques (`RELANCES_AUTO: false`) ;
- le lien pour laisser un avis Google (`LIEN_AVIS`), le jour où l'atelier aura une fiche Google. Il apparaît alors dans la demande d'avis.

Le bloc `REGLES_STATUT` règle le nombre de jours avant chaque relance.

**Après toute modification du code :**
1. Enregistrez.
2. Allez dans **Déployer → Gérer les déploiements**, cliquez sur le crayon, puis choisissez **Version : Nouvelle version** et **Déployer**. L'URL ne change pas.
3. Relancez **Atelier Reviva → Installer / réparer le suivi**. Rien n'est effacé.

## Limites à connaître
- Un compte Gmail gratuit peut envoyer environ **100 courriels automatiques par jour**. Chaque demande en utilise deux (alerte et accusé), ce qui permet une cinquantaine de demandes par jour.
- Les photos sont réduites automatiquement par le site, à environ 1600 px et 200–400 Ko chacune. Les **15 Go gratuits** de Google suffisent pour des milliers de demandes.
- Ne renommez pas les titres de colonnes de la première ligne. Vous pouvez par contre les déplacer ou les masquer.

## En cas de problème
- **Rien n'arrive dans le tableau.** Vérifiez que le déploiement est réglé sur « Qui a accès : Tout le monde » et que l'URL collée dans le site se termine bien par `/exec`.
- **Les couleurs ou la liste de statuts ont disparu.** Lancez **Atelier Reviva → Installer / réparer le suivi**.
- **Pour voir les erreurs**, ouvrez dans Apps Script le menu de gauche **Exécutions**.
