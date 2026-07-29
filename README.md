# Formulaires du club — application web

Clone de Google Forms enrichi pour gérer les **formulaires d'inscription** du club de badminton.
Connexion obligatoire, au choix **Google** ou **compte interne** (e-mail + mot de passe, pour les
membres sans adresse Gmail). Deux rôles :

- **Admin** (liste d'e-mails en config) : créer des formulaires (vierges, depuis un **modèle** ou
  par duplication), les rendre accessibles ou non, consulter les répondants, la **liste d'attente**
  et les réponses, exporter en CSV.
- **Utilisateur** : remplir les formulaires reçus **par lien** (ils ne sont pas listés sur l'accueil).

Fonctions notables : **comptes internes** (inscription avec vérification d'e-mail systématique,
« Mon compte », gestion des comptes admin avec mot de passe temporaire), **documents joints** publics au formulaire
(ex. RIB), image d'en-tête, blocs de texte, questions « texte multiple », **formats de
saisie** (e-mail / téléphone / entier / décimal) avec **vérification d'adresse par e-mail**,
**conditions d'inscription** à accepter, **liste d'attente** par option, association des réponses aux
**champs de contact**, et **API d'intégration** en lecture seule pour l'application desktop.

## Pile

- **Next.js 16** (App Router, TypeScript, React) + **Tailwind CSS**
- **Auth.js (NextAuth v5)** — provider Google, sessions JWT
- **Prisma** + **PostgreSQL** (Neon en production)
- **react-select** — listes déroulantes (composant `src/components/Select.tsx`)

## Mise en route (local)

1. **Installer les dépendances**
   ```bash
   npm install
   ```

2. **Base PostgreSQL** — créer une base gratuite sur [Neon](https://neon.tech) et copier l'URL de
   connexion (« pooled »).

3. **Client OAuth Google** — dans [Google Cloud Console](https://console.cloud.google.com) →
   *API et services* → *Identifiants* → créer un **ID client OAuth** de type **Application Web** :
   - Origines JavaScript autorisées : `http://localhost:3000`
   - URI de redirection autorisés : `http://localhost:3000/api/auth/callback/google`

4. **Variables d'environnement** — copier `.env.example` en `.env` et renseigner :
   ```env
   AUTH_SECRET=…            # déjà généré dans .env
   AUTH_GOOGLE_ID=…         # ID client OAuth
   AUTH_GOOGLE_SECRET=…     # secret client OAuth
   DATABASE_URL=…           # URL Neon
   ADMIN_EMAILS=matbelin5@gmail.com
   BLOB_READ_WRITE_TOKEN=…  # store Vercel Blob (images d'en-tête)
   GMAIL_USER=…             # compte Gmail expéditeur des e-mails de vérification
   GMAIL_APP_PASSWORD=…     # mot de passe d'application Google (16 caractères, sans chevrons)
   MAIL_FROM=Club de badminton <…@gmail.com>
   INTEGRATION_API_KEY=…    # clé lue par l'app desktop (en-tête x-api-key)
   ```
   Les trois dernières familles sont facultatives en local : sans elles, seules la vérification
   d'adresse et l'API d'intégration sont indisponibles.

5. **Créer les tables**
   ```bash
   npx prisma migrate dev --name init
   ```

6. **Lancer**
   ```bash
   npm run dev
   ```
   Ouvrir http://localhost:3000 → redirection vers la connexion Google.

## Vérification rapide

- Se connecter avec un e-mail listé dans `ADMIN_EMAILS` → accès à **Administration**, créer un
  formulaire, ajouter des questions, l'**enregistrer** puis le **rendre accessible**.
- Se connecter avec un autre compte Google → seul le formulaire publié apparaît, remplissable ;
  la réponse s'affiche ensuite dans *Administration → Réponses* (+ export CSV).
- Inspecter la base : `npx prisma studio`.

## Déploiement (Vercel + Neon, gratuit)

1. Pousser le dépôt sur GitHub, importer le projet sur [Vercel](https://vercel.com).
2. Reporter les variables d'environnement (`AUTH_SECRET`, `AUTH_GOOGLE_ID/SECRET`, `DATABASE_URL`,
   `ADMIN_EMAILS`, `AUTH_URL`, `BLOB_READ_WRITE_TOKEN`, `INTEGRATION_API_KEY`, et les `GMAIL_*`
   si l'envoi d'e-mails doit fonctionner en ligne) dans les *Environment Variables* Vercel.
3. Ajouter l'URI de redirection de production dans Google Cloud :
   `https://<votre-domaine>.vercel.app/api/auth/callback/google`.
4. Migrations en prod : `npx prisma migrate deploy` (ou via un script de build).
5. Déploiement en ligne de commande : `vercel --prod --yes` (projet `bad12/bad-web`,
   alias `https://bad-web-rho.vercel.app`).

## Structure

```
prisma/schema.prisma          Modèle de données (User, Form, Question, Response, Answer)
src/auth.config.ts            Config Auth.js edge-safe (proxy)
src/auth.ts                   Instance complète Auth.js (+ persistance User)
src/proxy.ts                  Protection des routes (redirige vers /connexion)
src/lib/{prisma,admin,session,questions}.ts   Utilitaires (client DB, rôle, gardes, types de questions)
src/app/actions/{forms,responses}.ts          Server Actions (CRUD formulaires, soumission)
src/app/connexion             Page de connexion Google
src/app/page.tsx              Accueil (accès par lien pour les utilisateurs)
src/app/admin/…               Tableau de bord, modèles, constructeur, réponses, liste d'attente (+ CSV)
src/app/forms/[id]/…          Remplissage, confirmation, suivi des adresses à vérifier
src/app/verifier/[token]/…    Page publique de vérification d'adresse
src/app/api/integration/…     API lecture seule pour l'app desktop
src/components/…              AppHeader, FormBuilder, FillForm, icônes, boutons d'action
```

## API d'intégration (app desktop)

Lecture seule, en-tête `x-api-key` = `INTEGRATION_API_KEY` :
`GET /api/integration/forms?owner=<e-mail>`, `…/forms/[id]/questions`, `…/forms/[id]/responses`.
C'est la source des **formulaires d'inscription** de l'application desktop, à la place de Google Forms.

## À venir (hors MVP)

Règle « annulation » sur une option (le desktop la gère déjà), détection de doublons, gestion des
modèles depuis le constructeur, affichage de l'acceptation des conditions dans l'export CSV.
