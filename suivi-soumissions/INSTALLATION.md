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

Vous avez maintenant deux onglets, **Suivi des soumissions** et **Modèles de relance**. Un dossier Drive **Atelier Reviva — Photos des soumissions** a aussi été créé.

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

Pensez aussi à remplir le **Montant soumis ($)** et les **Notes**. La date **Prochaine relance** peut être modifiée à la main à tout moment, par exemple si le client a demandé qu'on le rappelle en janvier.

**Couleurs automatiques :**
- 🟧 orangé : relance due aujourd'hui ou en retard ;
- 🟨 crème : nouvelle demande ;
- 🟩 vert : acceptée ou en atelier ;
- ⬜ gris : terminée, avis demandé ou refusée.

Les flèches de la première ligne permettent de **filtrer**, par exemple pour n'afficher que les « Soumission envoyée ».

### Le courriel du matin (8 h)
S'il y a des clients à relancer, vous recevez **« À relancer aujourd'hui »** avec la liste, la raison, le nombre de jours de retard et les coordonnées en un clic. S'il n'y a rien à faire, aucun courriel n'est envoyé.

Pour l'envoyer à n'importe quel moment : **Atelier Reviva → Envoyer les relances du jour maintenant**.

### Modèles de relance
L'onglet **Modèles de relance** contient des textes prêts à copier :
- relance après 3 jours ;
- dernier suivi ;
- confirmation d'une soumission acceptée ;
- demande d'avis.

Remplacez les [crochets], puis personnalisez les textes à votre goût. Le programme ne les écrase jamais.

### Sur cellulaire
L'appli **Google Sheets** permet de changer un statut en deux touches, et l'appli **Google Drive** de voir les photos.

---

## Réglages (facultatif)

En haut de `Code.gs`, le bloc `CONFIG` permet de changer :
- la signature et le téléphone des courriels ;
- l'heure du courriel du matin (`HEURE_RESUME`) ;
- l'envoi ou non de l'accusé de réception au client (`ENVOYER_ACCUSE_CLIENT`).

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
