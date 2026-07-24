# Documentation technique — Formulaires du club (app web)

Application **web (Next.js 16)** de gestion des **formulaires d'inscription** d'un club de badminton :
un clone de Google Forms enrichi. **Connexion Google obligatoire**. Interface 100 % en français.

> Projet **séparé** du desktop WPF (`F:\Projets\Pro\Bad\Bad-desktop`). Il **remplace** désormais la
> dépendance Google Forms de ce desktop, qui lit les formulaires et les réponses via l'**API
> d'intégration** (§10). En production sur https://bad-web-rho.vercel.app.

---

## 1. Vue d'ensemble

- **Rôles** :
  - **Admin** (e-mails listés dans `ADMIN_EMAILS`) : crée des formulaires (vierges, depuis un
    **modèle** ou par duplication), les rend **accessibles** ou non, consulte les répondants, la
    **liste d'attente** et les réponses, exporte en CSV, récupère un **lien de partage**.
  - **Utilisateur** : remplit les formulaires **accessibles** auxquels il accède **par le lien de
    partage** (ils ne sont pas listés sur l'accueil). Connexion Google requise pour répondre.
- **Identité = e-mail Google vérifié** (comme le desktop) : une réponse par personne, regroupée par
  cet e-mail ; la dernière soumission fait foi.
- **Lecture seule Google** : authentification (scopes de base openid/email/profile) et, pour les
  **admins qui l'autorisent**, lecture des **libellés Google Contacts** (`contacts.readonly`, §10.1) ;
  **aucune écriture** dans Google.

---

## 2. Architecture

### 2.1 Pile technique
- **Next.js 16** (App Router, `src/`), **TypeScript**, **React 19**, **Tailwind CSS v4**.
- **Auth.js v5** (`next-auth`), provider **Google**, sessions **JWT** (pas d'adapter DB).
- **Prisma** (ORM) + **PostgreSQL** (**Neon** en prod).
- **Zod** pour la validation des entrées des Server Actions.
- Pas de state manager : **Server Components** + **Server Actions** + composants clients ciblés.

### 2.2 Organisation du code
```
prisma/schema.prisma          Modèle de données (User, Form, Question, Response, Answer,
                              EmailVerification, FormTemplate) + enums QuestionType / QuestionFormat / ContactField
prisma/migrations/            Migrations générées

src/auth.config.ts            Config Auth.js « edge-safe » : provider Google + provider `google-contacts`
                              (portée contacts.readonly, hors ligne), JWT, pages, callback authorized
src/auth.ts                   Instance complète Auth.js (Node) : handlers/auth/signIn/signOut, upsert User
                              et enregistrement du refresh_token Google Contacts (admins) — §10.1
src/proxy.ts                  Protection des routes (ex-« middleware », renommé pour Next 16) : redirige vers /connexion
src/app/api/auth/[...nextauth]/route.ts   Handlers OAuth (GET/POST) d'Auth.js
src/app/api/blob/upload/route.ts          Jetons d'upload Vercel Blob (images d'en-tête, admin only)
src/app/api/integration/…                 API pour l'app desktop (x-api-key) — voir §10
src/lib/integration.ts                    Contrôle de la clé d'API d'intégration
src/lib/googleContacts.ts                 Lecture des libellés Google Contacts (People API, lecture seule) — §10.1
src/app/actions/labels.ts                 Action de relecture des libellés (appelée à l'ouverture de « Nouveau formulaire »)

src/lib/prisma.ts             Singleton PrismaClient (évite les connexions multiples en dev)
src/lib/admin.ts              isAdmin(email) : lit ADMIN_EMAILS (liste séparée par virgules)
src/lib/session.ts            requireUser() / requireAdmin() (gardes serveur, redirigent)
src/lib/questions.ts          Types d'éléments (labels FR), TYPES_WITH_OPTIONS, MULTI_SEP,
                              effets d'option (liste d'attente) et champs de contact
src/lib/formStatus.ts         Statut d'un formulaire (Brouillon / Accessible / Inaccessible) + libellés/badges
src/lib/formats.ts            Formats de saisie (e-mail/tél/entier/décimal) + contrôles partagés client & serveur
src/lib/mailer.ts             Envoi des e-mails de vérification (SMTP Gmail, GMAIL_USER / GMAIL_APP_PASSWORD)

src/app/layout.tsx            Layout racine (lang fr, fond clair)
src/app/loading.tsx           Écran d'attente par défaut (toute navigation) — voir aussi
                              admin/loading.tsx et forms/[id]/loading.tsx (cadre conservé)
src/app/globals.css           Tailwind + thème CLAIR forcé (color-scheme: light)
src/app/connexion/page.tsx    Page de connexion Google (publique)
src/app/page.tsx              Accueil : rappel « accès par lien » pour les users, liste pour l'admin

src/app/admin/layout.tsx      Garde requireAdmin + en-tête
src/app/admin/page.tsx        Tableau de bord : liste, créer, publier/retirer, supprimer, lien de partage
src/app/admin/modeles/page.tsx                Gestion des modèles (liste, création d'un formulaire, suppression)
src/app/admin/forms/[id]/edit/page.tsx        Constructeur (charge le form) + barre de lien de partage
src/app/admin/forms/[id]/responses/page.tsx   Visualiseur des réponses (tableau) + bouton export CSV
src/app/admin/forms/[id]/attente/page.tsx     Liste d'attente (classée par date d'inscription)
src/app/admin/forms/[id]/responses/export/route.ts   Export CSV (route handler)

src/app/forms/[id]/page.tsx        Remplissage (gate publié + connecté, préremplissage si déjà répondu)
src/app/forms/[id]/merci/page.tsx  Confirmation (+ « modifier ma réponse » si autorisé)
src/app/forms/[id]/verification/page.tsx  Suivi des adresses à confirmer après envoi
src/app/verifier/[token]/page.tsx  Page PUBLIQUE de vérification d'adresse (lien reçu par e-mail)

src/app/actions/forms.ts      Server Actions : createForm (vierge/modèle), saveForm, setFormLabel,
                              togglePublish, duplicateForm, saveAsTemplate, deleteTemplate, deleteForm
src/app/actions/responses.ts  Server Actions : submitResponse (upsert par e-mail vérifié, liste
                              d'attente, vérifications d'adresse), resendVerification, cancelResponse

src/components/AppHeader.tsx   En-tête (marque, lien Admin si admin, e-mail, déconnexion)
src/components/FormBuilder.tsx (client) Constructeur : questions, types, options, réordonner, enregistrer
src/components/FillForm.tsx    (client) Rendu des questions par type + soumission
src/components/ShareLink.tsx   (client) CopyLinkButton + ShareLinkBar (URL absolue construite côté navigateur)
src/components/icons.tsx       Icônes SVG monochromes (œil, crayon, graphique, lien, coche, corbeille, image)
src/components/HeaderImagePicker.tsx (client) Image d'en-tête : upload direct vers Vercel Blob
src/components/DeleteFormButton.tsx  (client) Suppression d'un formulaire avec fenêtre de confirmation
src/components/ResendVerification.tsx (client) Bouton « renvoyer l'e-mail de confirmation »
src/components/BusyLink.tsx    (client) Lien de navigation avec spinner de chargement
src/components/CreateFormButton.tsx (client) Fenêtre « vierge ou à partir d'un modèle » + choix du libellé
src/components/ConnectContacts.tsx (client) Bandeau admin : autoriser la lecture de Google Contacts
src/components/FormLabelPicker.tsx (client) Constructeur : changer le libellé Contacts d'un formulaire
src/components/ResponsesFilter.tsx (client) Recherche des réponses (?q=) + masquage du tableau pendant le chargement
src/components/FormActions.tsx (client) Dupliquer, bascule d'accessibilité, enregistrer comme modèle
src/components/TemplateActions.tsx (client) Page Modèles : créer un formulaire, supprimer
src/components/FormsTable.tsx (client) Tableau de bord : liste des formulaires + recherche (titre/libellé)
src/components/TemplatesTable.tsx (client) Page Modèles : liste + recherche (nom/titre)
src/components/CancelResponseButton.tsx (client) Annulation d'inscription (avec confirmation)
src/components/NavigationProgress.tsx (client) Barre de progression dès le clic sur un lien
src/components/PageLoader.tsx  Écran d'attente commun aux fichiers loading.tsx
```

### 2.3 Navigation & protection
- **`src/proxy.ts`** (convention Next 16, remplace `middleware.ts`) applique Auth.js à toutes les
  routes **sauf** `api/auth`, `api/blob`, `api/integration`, `/connexion`, `/verifier/*` et les assets. Le callback `authorized` autorise
  uniquement les utilisateurs connectés → sinon redirection vers `/connexion`.
- **Chargement des pages**, deux niveaux complémentaires :
  1. **`NavigationProgress`** (client, monté dans le layout racine) : barre verte en haut de
     l'écran **dès le clic**, sans attendre le serveur. Elle écoute les clics sur les liens
     internes (en phase de capture) et l'événement `app:nav-start` émis par les navigations
     programmatiques (`BusyLink`, création/duplication de formulaire). Elle se retire au changement
     de `usePathname()`, avec un filet de sécurité de 15 s.
  2. Convention **`loading.tsx`** (React Suspense) — fichier racine pour toute l'application,
     complété par `admin/loading.tsx` et `forms/[id]/loading.tsx` pour garder l'en-tête et le cadre
     pendant l'attente. Rendu commun : `src/components/PageLoader.tsx`.
- Le **contrôle admin** est fait côté page serveur via `requireAdmin()` (le layout `/admin` la
  garde), et non dans le proxy.

---

## 3. Modèle de données (Prisma / PostgreSQL)

- **User** : `id`, `email` (unique), `name?`, `image?`, `createdAt`. Upsert à chaque connexion.
  Le rôle admin **n'est pas** stocké (calculé via `ADMIN_EMAILS`).
- **enum QuestionType** : `TEXT`, `PARAGRAPH`, `RADIO`, `CHECKBOX`, `DROP_DOWN`, `DATE`
  (identiques aux types du desktop `FormTemplateItem.Type`), plus deux types **propres au web** :
  - **`TEXT_BLOCK`** : bloc de texte informatif, affiché dans le formulaire, **aucune réponse
    attendue** (exclu de la soumission, du décompte de questions, du tableau des réponses et du CSV).
    Le texte affiché est porté par `title`.
  - **`TEXT_LIST`** : saisie **multi-valeurs** (ex. adresses e-mail secondaires) — un champ vide
    s'ajoute automatiquement dès que le dernier est renseigné. Les valeurs sont stockées dans
    `Answer.value` **jointes par `MULTI_SEP` (« , »)**, comme CHECKBOX.

  ⚠️ L'API d'intégration desktop (§10) devra **ignorer `TEXT_BLOCK`** et traiter `TEXT_LIST`
  comme du texte.
- **Form** : `id` (cuid), `title`, `description`, `ownerEmail`, `headerImageUrl?` (image d'en-tête,
  Vercel Blob), `termsText` (conditions d'inscription ; non vide = acceptation obligatoire),
  `isPublished` (= « accessible »), `firstPublishedAt?` (1re mise en ligne → statut,
  voir §5.2), `allowEditResponse`, `singleResponse`, `createdAt`, `updatedAt`, relations
  `questions`/`responses`.
- **Question** : `id`, `formId`, `order`, `title`, `description`, `type`, `required`,
  `options String[]` (pour RADIO/CHECKBOX/DROP_DOWN), `optionActions String[]` (aligné sur
  `options` : `NONE` ou `WAITLIST`), `contactField ContactField?`
  (`FIRST_NAME`/`LAST_NAME`/`PHONE`/`EMAIL`/`SECONDARY_EMAIL`, TEXT/TEXT_LIST), `format QuestionFormat?`
  (`EMAIL`/`PHONE`/`INTEGER`/`DECIMAL`, uniquement TEXT/TEXT_LIST) et `verifyEmail`
  (format EMAIL : adresse à confirmer, cf. §6.1). Suppression en cascade avec le Form.
- **EmailVerification** : `id`, `responseId?`, `questionId`, `email`, `token` (unique, secret du
  lien), `createdAt`, `expiresAt` (7 jours), `verifiedAt?`. `responseId` est **nullable**
  (`onDelete: SetNull`) : une adresse **vérifiée survit à l'annulation** de l'inscription et reste
  dans la liste des adresses confirmées.
- **FormTemplate** : `id`, `name`, `ownerEmail` (créateur, informatif), `content Json`
  (configuration complète sérialisée : titre, description, image, options, questions), `createdAt`.
  Sert de **modèle** à la création et est **partagé entre tous les admins**.
- **Response** : `id`, `formId`, `respondentEmail` (e-mail vérifié), `respondentName?`,
  `termsAcceptedAt?` (horodatage de l'acceptation des conditions),
  `waitlistedAt?` (1re mise en liste d'attente → ordre de priorité),
  `submittedAt` (1re soumission), `lastSubmittedAt` (dernière modif). **Unique (formId, respondentEmail)**.
- **Answer** : `id`, `responseId`, `questionId`, `value` (texte ; CHECKBOX = options jointes par « , »).

Correspondance desktop : `Question` ↔ `FormQuestionInfo` (id/titre/type/options),
`Response`+`Answer` ↔ `FormResponseRow` (e-mail vérifié + submitted/lastSubmitted + `fields[qid]=valeur`).

---

## 4. Authentification & rôles

- **Provider Google uniquement**, sessions **JWT** (`session.strategy = "jwt"`, `trustHost: true`).
- Identifiants lus automatiquement depuis `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` ; secret de
  session `AUTH_SECRET`.
- **`signIn` callback** (dans `auth.ts`, runtime Node) : **upsert** de l'utilisateur en base.
- **`authorized` callback** (dans `auth.config.ts`, edge-safe) : utilisé par le proxy pour la
  redirection.
- **Admin** : `isAdmin(email)` compare l'e-mail (insensible à la casse) à `ADMIN_EMAILS`.
- **URI de redirection OAuth** (à déclarer dans Google Cloud, client « Application Web ») :
  - Local : `http://localhost:3000/api/auth/callback/google`
  - Prod : `https://bad-web-rho.vercel.app/api/auth/callback/google`

---

## 5. Espace admin

- **Tableau de bord** (`/admin`) : liste des formulaires de l'admin (titre, statut, nb de questions
  — **hors blocs de texte**, via un `_count` filtré sur `type != TEXT_BLOCK` —, nb de réponses),
  avec un **champ de recherche** (composant client `FormsTable`) filtrant par **titre ou libellé**
  (compteur « N sur M »). **+ Créer** → fenêtre proposant un formulaire **vierge** ou la copie d'un
  **modèle** (`CreateFormButton`, liste déroulante des `FormTemplate`).
  Actions en **icônes** (intitulé en infobulle) : **Aperçu** (ouvre `/forms/[id]` dans un nouvel
  onglet, même en brouillon), **Modifier**, **Réponses**, **Dupliquer**, **Lien** (toujours
  copiable ; grisé avec une infobulle d'avertissement tant que le formulaire n'est pas accessible),
  **Supprimer** (→ fenêtre de confirmation, cf. §5.3). Seul le bouton d'accessibilité reste
  textuel : **« Rendre accessible » / « Clôturer »** (`togglePublish`), présent aussi en haut du
  constructeur.
  **Indicateurs de chargement** : « Modifier » et « Réponses » passent par `BusyLink` (navigation
  en `useTransition`, l'icône devient un **spinner** tant que la page serveur n'est pas prête) ;
  création, duplication et bascule d'accessibilité affichent le même indicateur.
  Les icônes sont des **SVG monochromes** (`src/components/icons.tsx`, trait `currentColor`,
  16 px), dans l'esprit sobre des boutons du desktop — pas d'émojis couleur.
- **Constructeur** (`/admin/forms/[id]/edit`, `FormBuilder`) : **image d'en-tête** (§5.4),
  titre/description, options du
  formulaire (autoriser la modification de réponse, une seule réponse par personne), **questions**
  (6 types, intitulé, obligatoire, options pour les choix) et **blocs de texte**
  (« + Ajouter du texte », type `TEXT_BLOCK`), bouton **Enregistrer** (`saveForm`).
  En-tête : badge de statut, bascule d'accessibilité, **« Enregistrer comme modèle »**
  (`saveAsTemplate`) et lien **Aperçu**. Si publié, bandeau rappelant la portée du lien de partage
  (message seul — la copie du lien se fait depuis la liste, bouton 🔗).
  **Réordonnancement** : poignée à droite de chaque carte → glisser-déposer HTML5, la liste est
  réordonnée **en direct au survol** (aperçu avant de lâcher, comme Google Forms) ; la carte
  déplacée est estompée. Les flèches ↑ ↓ restent disponibles (clavier / tactile).
  **Défilement automatique** pendant le glissement (`src/lib/useDragAutoScroll.ts`) : dans les
  140 px du haut ou du bas de la fenêtre, la page défile, d'autant plus vite que la souris approche
  du bord (3 → 30 px par image, accélération quadratique).
  Le champ « aide / précision » par question a été retiré de l'interface (colonne `description`
  conservée en base pour la parité desktop, mais plus alimentée).
- **Modèles** (`/admin/modeles`, accès depuis le bouton « Modèles » du tableau de bord) : nom,
  nombre de questions, **date de création**, créateur, puis **« Créer un formulaire »**
  (`createForm(templateId)`) et **suppression** avec confirmation (`deleteTemplate`). Les modèles
  sont partagés : tout admin peut les utiliser et les supprimer. **Champ de recherche** (composant
  client `TemplatesTable`) filtrant par **nom ou titre de formulaire**.
- **Réponses** (`/admin/forms/[id]/responses`) : un répondant par ligne (Nom, e-mail, Envoyé le,
  Modifié le, puis une colonne par question), **filtre de recherche** et **export CSV**.
  Le filtre (composant client `ResponsesFilter`) écrit le terme dans l'URL (`?q=`) après 300 ms ;
  la page, rendue côté serveur, applique `matchesResponse` (`src/lib/responseFilter.ts`) sur
  l'**e-mail** et le **nom** du compte Google du répondant et sur les réponses associées à un champ
  de contact **Prénom / Nom / E-mail / E-mail secondaire** (comparaison sans accents ni casse).
  Un **indicateur de chargement** (`Spinner`) s'affiche dans le champ pendant la pause de saisie puis
  le re-rendu serveur (`useTransition`).
  Le lien **Exporter CSV** reprend le `?q=` courant : **on n'exporte que les lignes affichées**.

### 5.1 `saveForm` (upsert des questions)

`saveForm` (Zod) met à jour le Form puis, en **transaction** : supprime les questions retirées
(cascade sur leurs réponses), **met à jour** les questions existantes (id connu) et **crée** les
nouvelles, en réécrivant l'`order` selon l'ordre d'affichage. Vérifie la **propriété** (ownerEmail).
L'URL de l'**image d'en-tête** (`headerImageUrl`, ou `null`) est enregistrée au même moment.

### 5.2 Statuts (`src/lib/formStatus.ts`)

| Statut | Condition | Sens |
|---|---|---|
| **Brouillon** | `!isPublished && !firstPublishedAt` | jamais mis en ligne |
| **Accessible** | `isPublished` | en ligne : listé sur l'accueil, lien de partage actif |
| **Inaccessible** | `!isPublished && firstPublishedAt` | déjà mis en ligne puis **clôturé** ; le lien renvoie « introuvable » |

`togglePublish` **exige un libellé Contacts** pour passer en *Accessible* (§10.1) et horodate
`firstPublishedAt` au premier basculement (dans les deux sens, pour couvrir
les formulaires publiés avant l'ajout du champ). Les libellés et couleurs des badges viennent de
`STATUS_LABEL` / `STATUS_BADGE` (partagés par la liste et le constructeur).

### 5.3 Suppression (confirmation)

`DeleteFormButton` (client) ouvre une **fenêtre modale d'avertissement** rappelant le titre et le
**nombre de réponses** qui seront perdues, avant d'appeler `deleteForm`. L'action supprime aussi
l'image d'en-tête du store Blob (échec silencieux si le store n'est pas configuré).

### 5.4 Image d'en-tête (Vercel Blob)

- `HeaderImagePicker` (client) accepte le **glisser-déposer** ou la sélection de fichier, et
  téléverse **directement du navigateur vers Vercel Blob** via `upload()` (`@vercel/blob/client`) ;
  l'URL publique obtenue est enregistrée par `saveForm`.
- Le jeton d'upload est délivré par `POST /api/blob/upload` (`handleUpload`) : **admin uniquement**,
  types autorisés PNG/JPEG/WebP/GIF, **5 Mo** max, suffixe aléatoire sur le nom.
- `GET /api/blob/upload` renvoie `{ configured }` : le composant l'interroge **avant** l'upload pour
  afficher un message clair, car le SDK masque toute réponse non-JSON derrière
  « Failed to retrieve the client token ». Pour la même raison, `api/blob` est **exclu du matcher du
  proxy** (`src/proxy.ts`) — la route vérifie elle-même session + rôle admin et répond en JSON au
  lieu de renvoyer une redirection HTML vers `/connexion`.
- Variable d'env **`BLOB_READ_WRITE_TOKEN`** (store Blob à créer côté Vercel) — sans elle, la route
  renvoie une erreur explicite et le reste de l'app fonctionne normalement.
- Affichage : bannière en haut du formulaire (`FillForm`) et vignette sur les cartes de l'accueil,
  en **`object-contain`** sur fond `zinc-50` (image entière, jamais rognée : les logos en portrait
  passent aussi bien que les bannières panoramiques).
  `next.config.ts` autorise `*.public.blob.vercel-storage.com` dans `images.remotePatterns`
  (rendu en `unoptimized` pour ne pas consommer le quota d'optimisation).

---

## 6. Remplissage (utilisateur)

- **`/forms/[id]`** : accessible seulement si `isPublished` (les admins peuvent **prévisualiser** un
  brouillon → bandeau « Aperçu »). Préremplissage si l'utilisateur a **déjà répondu** ; **verrouillé**
  si `allowEditResponse = false`.
- **Liste d'attente** : dans le constructeur, chaque **option** d'une question à choix porte un
  effet (`Aucun` / `Ajouter à la liste d'attente`). À la soumission, si une option retenue porte
  `WAITLIST`, `Response.waitlistedAt` est horodaté — **à la première fois seulement**, pour que la
  priorité reflète la date d'arrivée ; le champ repasse à `null` si le répondant change de choix.
  Consultation : **`/admin/forms/[id]/attente`** (bouton « Liste d'attente (n) » sur la page des
  réponses), classée par `waitlistedAt` croissant avec le rang affiché.
- **Champ de contact** : une question libre (TEXT / TEXT_LIST) peut être associée à un champ de
  fiche contact (prénom, nom, téléphone, e-mail, e-mail secondaire). L'étiquette apparaît dans
  l'en-tête du tableau des réponses. ⚠️ Le **rapprochement** avec les contacts du club n'est pas
  fait côté web (aucune base de contacts ici) : ce mappage est destiné à l'app desktop / à l'API
  d'intégration (§10).
- **Conditions d'inscription** : si `Form.termsEnabled` est coché et le texte renseigné, un bloc s'affiche **en fin de
  formulaire** — texte dépliable (`<details>`, zone défilante) + case **« J'ai lu et j'accepte les
  conditions d'inscription »** obligatoire. Le bouton Envoyer refuse tant qu'elle n'est pas cochée
  (contrôle client **et** dans `submitResponse`), et l'acceptation est horodatée dans
  `Response.termsAcceptedAt`. L'affichage est piloté par la **case « Afficher des conditions
  d'inscription »** en bas du constructeur, qui révèle le champ de texte ; l'option et le texte
  suivent les duplications et les modèles.
- **Annulation d'inscription** (`cancelResponse`) : lors de la **modification** d'une réponse
  existante, un bouton « Annuler mon inscription » (avec confirmation) supprime la réponse. Les
  demandes de vérification **en attente** sont supprimées ; les adresses **vérifiées** sont
  conservées (`responseId` passe à `null`). Retour au formulaire vierge avec `?annulee=1`.
- **`FillForm`** rend chaque type (texte / paragraphe / date / choix unique / cases / liste
  déroulante / **texte multiple** / bloc de texte). CHECKBOX et TEXT_LIST sont stockés comme valeurs
  jointes par « , ». `TextListInput` garde ses lignes en état local (stabilité pendant la frappe)
  et ne remonte que les valeurs non vides (comparaison après `trim`, les espaces ne comptent pas) :
  - un champ vide s'ajoute dès que le **dernier** champ est renseigné ;
  - vider un champ **supprime le champ suivant s'il est vide** (jamais deux champs vides) ;
  - vider un champ alors qu'il reste du texte **en dessous** supprime ce champ **à la perte du
    focus** (sinon la saisie est simplement débarrassée de ses espaces).
- **`submitResponse`** (Zod) : exige la connexion, refuse si non publié, contrôle les champs
  **obligatoires** puis les **formats** (`checkAnswer`, contrôle faisant foi), **upsert par
  (formId, e-mail)** — 1re fois → `submittedAt` ; ré-envoi → `lastSubmittedAt` (refusé si édition
  interdite). Redirige vers `/forms/[id]/merci`, ou vers `/forms/[id]/verification` si des adresses
  doivent être confirmées.

### 6.1 Formats de saisie et vérification d'adresse

- **Signalement visuel** : au remplissage, un champ refusé est **encadré en rouge** (fond rosé,
  `aria-invalid`) avec le motif sous la question — y compris **ligne par ligne** pour les questions
  « Texte multiple ». L'alerte n'apparaît qu'après la **sortie du champ** (`onBlur`) ou une
  **tentative d'envoi**, jamais pendant la première frappe.
- **Formats** (`src/lib/formats.ts`) : `EMAIL`, `PHONE` (≥ 8 chiffres), `INTEGER`, `DECIMAL`,
  proposés dans le constructeur pour les types **Texte court** et **Texte multiple** (case
  « Format imposé » → liste déroulante). Contrôlés **deux fois** : à l'envoi côté client
  (message immédiat) et dans `submitResponse` (autorité). Une valeur vide n'est pas contrôlée :
  c'est le rôle de l'option « obligatoire ». TEXT_LIST contrôle **chaque** valeur.
- **Vérification d'adresse** (format EMAIL + case « Faire vérifier l'adresse par e-mail ») :
  1. `submitResponse` enregistre la réponse puis appelle `syncVerifications`.
  2. Le répondant est redirigé vers **`/forms/[id]/verification`** s'il reste des adresses à
     confirmer, sinon directement vers **`/forms/[id]/merci`**. La page de vérification annonce
     qu'il reste **une dernière étape** avant la prise en compte, nomme l'expéditeur
     (`senderAddress()`, soit `GMAIL_USER`) et propose un bouton **« Renvoyer l'e-mail de
     confirmation »** par adresse (`resendVerification`).
  3. Le lien pointe vers **`/verifier/[token]`** — page **publique** (exclue du matcher du proxy,
     le jeton aléatoire de 32 octets faisant preuve) : elle horodate `verifiedAt` puis **redirige
     vers `/forms/[id]/merci`** (« réponse enregistrée »). Elle n'affiche une page que pour les
     liens expirés ou inconnus. ⚠️ `/merci` étant protégé, un répondant non connecté sur ce
     navigateur passera par `/connexion` avant de voir la confirmation.
  4. Le **tableau des réponses** (admin) affiche chaque adresse avec l'état *vérifiée* / *en attente*.

#### Règles de `syncVerifications` (envoi unique)

`EmailVerification` sert de **liste back-end** (jamais affichée telle quelle) des adresses ayant
reçu un e-mail de confirmation **dans les 7 derniers jours** et n'ayant pas encore répondu
(`verifiedAt = null` et `expiresAt > maintenant`). À chaque envoi de la réponse :

- l'adresse **égale à celle du répondant** (e-mail Google, déjà vérifié) **ou déjà confirmée par le
  passé** (n'importe quelle réponse, même annulée) est marquée `verifiedAt` **d'office**, sans e-mail ;
- une adresse **déjà présente dans la liste** ne redéclenche **aucun** e-mail, même si la réponse
  est modifiée plusieurs fois : seul le bouton **« Renvoyer »** relance un envoi, ce qui régénère
  le jeton et **repart pour 7 jours** ;
- une adresse **vérifiée** sort de la liste (elle reste en base, horodatée) ;
- une demande **périmée** (7 jours sans réponse) ou portant sur une adresse **retirée** de la
  réponse est supprimée — un envoi ultérieur repartira donc de zéro pour cette adresse.
- **Envoi** (`src/lib/mailer.ts`) : **SMTP Gmail du club** via `nodemailer`
  (`smtp.gmail.com:465`, transport réutilisé entre les envois), avec `GMAIL_USER`,
  `GMAIL_APP_PASSWORD` (**mot de passe d'application** Google, validation en 2 étapes requise ;
  les espaces sont tolérés) et `MAIL_FROM` facultatif (seul le nom affiché est repris, Gmail
  impose l'adresse). Sans configuration, la réponse est **quand même enregistrée** et
  la page de vérification affiche un avertissement (l'échec est journalisé côté serveur).
  Les liens sont construits à partir de l'origine de la requête (`headers()`).

---

## 7. Lien de partage (`ShareLink.tsx`)

- **`CopyLinkButton`** (liste admin) et **`ShareLinkBar`** (constructeur) construisent l'URL absolue
  **côté navigateur** (`window.location.origin` + `/forms/[id]`) → fonctionne en local comme en prod
  sans connaître l'hôte côté serveur.
- Sémantique : **toute personne disposant du lien peut répondre**, connexion Google requise. Si le
  formulaire repasse en brouillon, le lien renvoie « introuvable ».
- **Accès par lien uniquement** : l'accueil ne liste **plus** les formulaires pour un non-admin
  (message rappelant d'ouvrir le lien communiqué par le club). Seul l'admin y voit ses formulaires
  accessibles, en raccourci.

---

## 8. Export CSV

Route `GET /admin/forms/[id]/responses/export` (admin propriétaire) : en-têtes
`E-mail ; Nom ; Envoyé le ; Modifié le ; <questions…>`, séparateur `;`, **BOM UTF-8** (Excel),
cellules échappées. Nom de fichier dérivé du titre.
Le paramètre **`?q=`** applique le **même filtre que la page** (`matchesResponse`) : l'export porte
exactement sur les lignes affichées. Sans `?q=`, toutes les réponses sont exportées.

---

## 9. Déploiement (Vercel + Neon, gratuit)

- **Build** : `package.json` → `build: "prisma generate && next build"` + `postinstall:
  "prisma generate"` (garantit le client Prisma sur Vercel).
- **Variables d'env de prod** (Vercel) : `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`,
  `DATABASE_URL`, `ADMIN_EMAILS`, **`AUTH_URL`** (épinglée sur l'URL de prod pour fixer le
  `redirect_uri`). `INTEGRATION_API_KEY` pour l'API desktop (§10).
  **`BLOB_READ_WRITE_TOKEN`** pour les images d'en-tête : store **`bad-web-images`** (accès *public*,
  région iad1), créé et relié au projet via `vercel blob create-store <nom> --access public --yes`.
  La variable est ajoutée automatiquement aux 3 environnements ; en local elle est récupérée dans
  **`.env.local`** (fichier ignoré par git, généré par la même commande ou par `vercel env pull`).
- **Déploiement CLI par jeton** (non interactif) :
  `VERCEL_TOKEN=… vercel --prod --yes` (projet `bad12/bad-web`, alias `https://bad-web-rho.vercel.app`).
  Ajouter une variable : `printf '%s' 'valeur' | VERCEL_TOKEN=… vercel env add NOM production`.
- **Base Neon** déjà migrée (les tables existent). En cas de nouveau schéma : `prisma migrate deploy`.
- **Gratuité** : Vercel Hobby (non commercial) + Neon free (base en veille après ~5 min d'inactivité).

---

## 10. API d'intégration desktop (lecture + deux écritures)

Authentification par **clé partagée** : en-tête `x-api-key` = variable d'env `INTEGRATION_API_KEY`
(`src/lib/integration.ts`). Ces routes sont **exclues du proxy** d'authentification (pas de session).
Réponses en JSON, dates ISO 8601.

| Route | Contenu |
|---|---|
| `GET /api/integration/forms?owner=<e-mail>` | formulaires (id, titre, propriétaire, accessible, créé le, nb de réponses) ; `owner` filtre sur le compte créateur |
| `GET /api/integration/forms/[id]/questions` | questions (hors `TEXT_BLOCK`) avec `options`, `optionActions` (`NONE`/`WAITLIST`), `format` et `contactField` |
| `GET /api/integration/forms/[id]/responses` | réponses : e-mail vérifié, nom, `submittedAt`, `lastSubmittedAt`, `waitlistedAt`, `termsAcceptedAt`, `verifiedEmails`, `fields[questionId]` |
| **`PATCH /api/integration/forms/[id]/responses/[responseId]`** *(écriture)* | corrige une réponse : `{ answers: { "<questionId>": "valeur" } }`. Utilisé par le desktop pour « garder l'état actuel » (la valeur du contact remplace celle saisie). Les questions d'un autre formulaire sont ignorées |
| **`DELETE /api/integration/forms/[id]/responses/[responseId]`** *(écriture)* | supprime une préinscription (la personne peut de nouveau répondre). Les adresses **déjà vérifiées** sont conservées, comme pour l'annulation faite par la personne |

La liste `forms` renvoie aussi **`labelResourceName`** et **`labelName`** (libellé associé au formulaire).

Codes d'erreur : **401** clé absente/invalide, **503** `INTEGRATION_API_KEY` non configurée côté
serveur, **404** formulaire inconnu.

C'est la source utilisée par l'application desktop (page **Formulaires d'inscription**) à la place
de Google Forms.

### 10.1 Google Contacts : libellés et personnes déjà inscrites

Le site lit **lui-même** Google Contacts (People API, **lecture seule**) — plus rien n'est poussé
depuis le desktop.

**Autorisation.** Un 2e provider Auth.js, `google-contacts` (`src/auth.config.ts`), demande la portée
`contacts.readonly` en `access_type=offline` + `prompt=consent`. Les **répondants** gardent l'écran de
consentement minimal : cette autorisation n'est demandée qu'aux **admins**, via le bouton
« Connecter Google Contacts » du tableau de bord. Le `refresh_token` est enregistré dans
**`GoogleAccount`** (callback `signIn` de `src/auth.ts`, réservé aux admins) — **secret**, jamais
exposé côté client. Il permet de lire les libellés **même pendant la visite d'un répondant**.
> ⚠️ Google Cloud : activer l'**API People**, déclarer la portée sur l'écran de consentement et
> ajouter l'URI de redirection `…/api/auth/callback/google-contacts` (local ET prod).

**Lecture** (`src/lib/googleContacts.ts`), en **deux temps** pour ne pas payer le coût des membres
quand on n'en a pas besoin :
- `syncLabels` — **noms seulement** : un appel `contactGroups` (seuls les `USER_CONTACT_GROUP`).
  Réécrit `ClubLabel` (clé = `resourceName`) ; un libellé supprimé chez Google disparaît, et le
  formulaire qui y pointait retombe sans libellé (`onDelete: SetNull`).
- `isRegistered(labelResource, email)` — **membres du seul libellé concerné** : `memberResourceNames`
  puis `people:batchGet` (par 100) pour les e-mails, mis en cache dans `ClubLabelMember` avec
  `ClubLabel.membersSyncedAt`. Relecture si le cache a plus d'**une minute** — court exprès :
  une personne **dissociée** doit pouvoir répondre de nouveau presque aussitôt (bloquer à tort est
  plus gênant qu'un appel People API de plus). **On ne bloque que sur une liste fraîche** : si le
  cache est périmé **et** que la relecture chez Google échoue (autorisation expirée, People API
  indisponible…), `isRegistered` répond **« non »** — on préfère laisser passer une réponse que
  bloquer sur des données peut-être obsolètes. Corollaire : sans autorisation Google Contacts
  valide, plus personne n'est bloqué (l'admin voit le bandeau « Connecter Google Contacts »).

Un `invalid_grant` (autorisation révoquée ou expirée) supprime l'autorisation stockée et demande une
reconnexion.

**Quand la synchro a lieu.** Il n'y a **aucun bouton d'actualisation** : `syncLabelsFromGoogle`
(`src/app/actions/labels.ts`) est appelée automatiquement à l'**ouverture de la fenêtre
« Nouveau formulaire »** (la liste connue s'affiche aussitôt, puis se met à jour). Les membres, eux,
sont relus à la volée par `isRegistered`. Le tableau de bord n'affiche qu'un bandeau
`ConnectContacts`, visible **tant que** l'autorisation manque.

- **Création d'un formulaire** : le choix d'**un** libellé (liste déroulante à choix unique) est
  **obligatoire** (`createForm(templateId?, labelResource)` refuse sans). La liste est **relue chez
  Google à chaque ouverture** de la fenêtre (indicateur de chargement, « Créer » désactivé pendant
  ce temps). Une duplication reprend le libellé de l'original.
- **Changer de libellé** : bouton **🏷** dans l'en-tête du **constructeur** (`FormLabelPicker` →
  action `setFormLabel`), même liste relue chez Google à l'ouverture. Changer le libellé change
  **qui est bloqué** ; le tableau de bord affiche le libellé courant sous chaque titre.
- **Libellé obligatoire pour publier** : `togglePublish` **refuse** de rendre un formulaire accessible
  tant qu'aucun libellé n'est associé (sans libellé, impossible de savoir qui est déjà inscrit). Le
  message est affiché à côté du bouton. **Clôturer** reste toujours possible.
- **Blocage des déjà-inscrits** : si l'e-mail du visiteur est membre du libellé du formulaire, la
  page `/forms/[id]` **n'affiche pas le formulaire du tout** : elle rend une page dédiée
  « Vous êtes déjà inscrit » (nom du groupe, invitation à contacter le club, retour à l'accueil).
  Cela vaut aussi pour une **première** réponse, pas seulement pour une modification.
  `submitResponse` et `cancelResponse` **refusent** de leur côté : le contrôle est côté serveur,
  pas seulement visuel.
- Le tableau de bord affiche le libellé sous le titre de chaque formulaire.

## 10bis. À venir (hors MVP)
- Effet **« annuler l'inscription »** sur une option (le desktop sait déjà l'interpréter ; seul
  `WAITLIST` est proposé côté web).
- **Détection de doublons** entre réponses.
- **Acceptation des conditions** (`termsAcceptedAt`) dans le tableau des réponses et l'export CSV.
- **Rapprochement avec les contacts du club** côté web : le site sait désormais lire Google Contacts
  (§10.1) — il reste à comparer les réponses aux fiches contact, ce que fait aujourd'hui le desktop
  à partir de `contactField`.

---

## 11. Mise en route locale

Voir `README.md` (installer, base Neon, client OAuth Google, `.env`, `prisma migrate dev`, `npm run dev`).
Vérifier les types après chaque modif : `npx tsc --noEmit`.
