# Documentation technique — Formulaires du club (app web)

Application **web (Next.js 16)** de gestion des **formulaires d'inscription** d'un club de badminton :
un clone de Google Forms enrichi. **Connexion Google obligatoire**. Interface 100 % en français.

> Projet **séparé** du desktop WPF (`F:\Projets\Pro\Bad`). À terme, il **remplace la dépendance
> Google Forms** de ce desktop (voir §10).

---

## 1. Vue d'ensemble

- **Rôles** :
  - **Admin** (e-mails listés dans `ADMIN_EMAILS`) : crée des formulaires, les rend **accessibles**
    ou non, consulte les répondants et leurs réponses, exporte en CSV, récupère un **lien de partage**.
  - **Utilisateur** : voit et remplit uniquement les formulaires **accessibles** (publiés), ou y
    accède **par le lien de partage**. Connexion Google requise pour répondre.
- **Identité = e-mail Google vérifié** (comme le desktop) : une réponse par personne, regroupée par
  cet e-mail ; la dernière soumission fait foi.
- **Lecture seule Google** : l'app n'utilise Google que pour l'authentification (scopes de base
  openid/email/profile) ; aucune écriture dans Google.

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
prisma/schema.prisma          Modèle de données (User, Form, Question, Response, Answer) + enum QuestionType
prisma/migrations/            Migrations générées (init)

src/auth.config.ts            Config Auth.js « edge-safe » (providers Google, JWT, pages, callback authorized) → utilisée par le proxy
src/auth.ts                   Instance complète Auth.js (Node) : handlers/auth/signIn/signOut + upsert User à la connexion
src/proxy.ts                  Protection des routes (ex-« middleware », renommé pour Next 16) : redirige vers /connexion
src/app/api/auth/[...nextauth]/route.ts   Handlers OAuth (GET/POST) d'Auth.js

src/lib/prisma.ts             Singleton PrismaClient (évite les connexions multiples en dev)
src/lib/admin.ts              isAdmin(email) : lit ADMIN_EMAILS (liste séparée par virgules)
src/lib/session.ts            requireUser() / requireAdmin() (gardes serveur, redirigent)
src/lib/questions.ts          Types de questions partagés (labels FR) + TYPES_WITH_OPTIONS + typeLabel

src/app/layout.tsx            Layout racine (lang fr, fond clair)
src/app/globals.css           Tailwind + thème CLAIR forcé (color-scheme: light)
src/app/connexion/page.tsx    Page de connexion Google (publique)
src/app/page.tsx              Accueil utilisateur : formulaires accessibles (badge « Répondu »)

src/app/admin/layout.tsx      Garde requireAdmin + en-tête
src/app/admin/page.tsx        Tableau de bord : liste, créer, publier/retirer, supprimer, lien de partage
src/app/admin/forms/[id]/edit/page.tsx        Constructeur (charge le form) + barre de lien de partage
src/app/admin/forms/[id]/responses/page.tsx   Visualiseur des réponses (tableau) + bouton export CSV
src/app/admin/forms/[id]/responses/export/route.ts   Export CSV (route handler)

src/app/forms/[id]/page.tsx        Remplissage (gate publié + connecté, préremplissage si déjà répondu)
src/app/forms/[id]/merci/page.tsx  Confirmation (+ « modifier ma réponse » si autorisé)

src/app/actions/forms.ts      Server Actions : createForm, saveForm, togglePublish, deleteForm
src/app/actions/responses.ts  Server Action : submitResponse (upsert par e-mail vérifié)

src/components/AppHeader.tsx   En-tête (marque, lien Admin si admin, e-mail, déconnexion)
src/components/FormBuilder.tsx (client) Constructeur : questions, types, options, réordonner, enregistrer
src/components/FillForm.tsx    (client) Rendu des questions par type + soumission
src/components/ShareLink.tsx   (client) CopyLinkButton + ShareLinkBar (URL absolue construite côté navigateur)
```

### 2.3 Navigation & protection
- **`src/proxy.ts`** (convention Next 16, remplace `middleware.ts`) applique Auth.js à toutes les
  routes **sauf** `api/auth`, `/connexion` et les assets. Le callback `authorized` autorise
  uniquement les utilisateurs connectés → sinon redirection vers `/connexion`.
- Le **contrôle admin** est fait côté page serveur via `requireAdmin()` (le layout `/admin` la
  garde), et non dans le proxy.

---

## 3. Modèle de données (Prisma / PostgreSQL)

- **User** : `id`, `email` (unique), `name?`, `image?`, `createdAt`. Upsert à chaque connexion.
  Le rôle admin **n'est pas** stocké (calculé via `ADMIN_EMAILS`).
- **enum QuestionType** : `TEXT`, `PARAGRAPH`, `RADIO`, `CHECKBOX`, `DROP_DOWN`, `DATE`
  (identiques aux types du desktop `FormTemplateItem.Type`).
- **Form** : `id` (cuid), `title`, `description`, `ownerEmail`, `isPublished` (= « accessible »),
  `allowEditResponse`, `singleResponse`, `createdAt`, `updatedAt`, relations `questions`/`responses`.
- **Question** : `id`, `formId`, `order`, `title`, `description`, `type`, `required`,
  `options String[]` (pour RADIO/CHECKBOX/DROP_DOWN). Suppression en cascade avec le Form.
- **Response** : `id`, `formId`, `respondentEmail` (e-mail vérifié), `respondentName?`,
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

- **Tableau de bord** (`/admin`) : liste des formulaires de l'admin (titre, statut, nb de questions,
  nb de réponses), **+ Créer** (crée un formulaire vierge et redirige vers le constructeur),
  **Rendre accessible / Retirer** (`togglePublish`), **Supprimer** (`deleteForm`), **🔗 Lien** (si
  publié → copie le lien de partage), **Réponses**.
- **Constructeur** (`/admin/forms/[id]/edit`, `FormBuilder`) : titre/description, options du
  formulaire (autoriser la modification de réponse, une seule réponse par personne), **questions**
  (6 types, intitulé/aide, obligatoire, options pour les choix, monter/descendre/supprimer),
  bouton **Enregistrer** (`saveForm`). Barre de **lien de partage** en haut si publié.
- **Réponses** (`/admin/forms/[id]/responses`) : un répondant par ligne (Nom, e-mail, Envoyé le,
  Modifié le, puis une colonne par question), **export CSV**.

### 5.1 `saveForm` (upsert des questions)
`saveForm` (Zod) met à jour le Form puis, en **transaction** : supprime les questions retirées
(cascade sur leurs réponses), **met à jour** les questions existantes (id connu) et **crée** les
nouvelles, en réécrivant l'`order` selon l'ordre d'affichage. Vérifie la **propriété** (ownerEmail).

---

## 6. Remplissage (utilisateur)

- **`/forms/[id]`** : accessible seulement si `isPublished` (les admins peuvent **prévisualiser** un
  brouillon → bandeau « Aperçu »). Préremplissage si l'utilisateur a **déjà répondu** ; **verrouillé**
  si `allowEditResponse = false`.
- **`FillForm`** rend chaque type (texte / paragraphe / date / choix unique / cases / liste
  déroulante). CHECKBOX stocké comme options jointes par « , ».
- **`submitResponse`** (Zod) : exige la connexion, refuse si non publié, contrôle les champs
  **obligatoires**, **upsert par (formId, e-mail)** — 1re fois → `submittedAt` ; ré-envoi →
  `lastSubmittedAt` (refusé si édition interdite). Redirige vers `/forms/[id]/merci`.

---

## 7. Lien de partage (`ShareLink.tsx`)

- **`CopyLinkButton`** (liste admin) et **`ShareLinkBar`** (constructeur) construisent l'URL absolue
  **côté navigateur** (`window.location.origin` + `/forms/[id]`) → fonctionne en local comme en prod
  sans connaître l'hôte côté serveur.
- Sémantique : **toute personne disposant du lien peut répondre**, connexion Google requise. Si le
  formulaire repasse en brouillon, le lien renvoie « introuvable ».
- Remarque : aujourd'hui un formulaire publié est **aussi listé sur l'accueil** de tout utilisateur
  connecté (option « lien uniquement » à ajouter si besoin).

---

## 8. Export CSV

Route `GET /admin/forms/[id]/responses/export` (admin propriétaire) : en-têtes
`E-mail ; Nom ; Envoyé le ; Modifié le ; <questions…>`, séparateur `;`, **BOM UTF-8** (Excel),
cellules échappées. Nom de fichier dérivé du titre.

---

## 9. Déploiement (Vercel + Neon, gratuit)

- **Build** : `package.json` → `build: "prisma generate && next build"` + `postinstall:
  "prisma generate"` (garantit le client Prisma sur Vercel).
- **Variables d'env de prod** (Vercel) : `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`,
  `DATABASE_URL`, `ADMIN_EMAILS`, **`AUTH_URL`** (épinglée sur l'URL de prod pour fixer le
  `redirect_uri`). `INTEGRATION_API_KEY` pour l'API desktop (§10).
- **Déploiement CLI par jeton** (non interactif) :
  `VERCEL_TOKEN=… vercel --prod --yes` (projet `bad12/bad-web`, alias `https://bad-web-rho.vercel.app`).
  Ajouter une variable : `printf '%s' 'valeur' | VERCEL_TOKEN=… vercel env add NOM production`.
- **Base Neon** déjà migrée (les tables existent). En cas de nouveau schéma : `prisma migrate deploy`.
- **Gratuité** : Vercel Hobby (non commercial) + Neon free (base en veille après ~5 min d'inactivité).

---

## 10. À venir (hors MVP)

- **API d'intégration desktop** (lecture seule, clé `INTEGRATION_API_KEY`, header `x-api-key`) :
  `GET /api/integration/forms`, `…/[id]/questions`, `…/[id]/responses` — formes calquées sur
  `GoogleFormsService` pour que le desktop lise les réponses **à la place de Google Forms**.
- **Règles de réponses** (liste d'attente / annulation), **validations** (tél/e-mail), **détection
  de doublons**, option **« accessible uniquement via le lien »**.

---

## 11. Mise en route locale

Voir `README.md` (installer, base Neon, client OAuth Google, `.env`, `prisma migrate dev`, `npm run dev`).
Vérifier les types après chaque modif : `npx tsc --noEmit`.
