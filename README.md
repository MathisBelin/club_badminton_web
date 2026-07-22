# Formulaires du club — application web

Clone de Google Forms enrichi pour gérer les **formulaires d'inscription** du club de badminton.
Connexion **Google obligatoire**. Deux rôles :

- **Admin** (liste d'e-mails en config) : créer des formulaires, les rendre accessibles ou non,
  consulter les répondants et leurs réponses, exporter en CSV.
- **Utilisateur** : voir et remplir uniquement les formulaires **accessibles**.

## Pile

- **Next.js 16** (App Router, TypeScript, React) + **Tailwind CSS**
- **Auth.js (NextAuth v5)** — provider Google, sessions JWT
- **Prisma** + **PostgreSQL** (Neon en production)

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
   ```

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
   `ADMIN_EMAILS`) dans les *Environment Variables* Vercel.
3. Ajouter l'URI de redirection de production dans Google Cloud :
   `https://<votre-domaine>.vercel.app/api/auth/callback/google`.
4. Migrations en prod : `npx prisma migrate deploy` (ou via un script de build).

## Structure

```
prisma/schema.prisma          Modèle de données (User, Form, Question, Response, Answer)
src/auth.config.ts            Config Auth.js edge-safe (proxy)
src/auth.ts                   Instance complète Auth.js (+ persistance User)
src/proxy.ts                  Protection des routes (redirige vers /connexion)
src/lib/{prisma,admin,session,questions}.ts   Utilitaires (client DB, rôle, gardes, types de questions)
src/app/actions/{forms,responses}.ts          Server Actions (CRUD formulaires, soumission)
src/app/connexion             Page de connexion Google
src/app/page.tsx              Accueil utilisateur (formulaires accessibles)
src/app/admin/…               Tableau de bord, constructeur, réponses (+ export CSV)
src/app/forms/[id]/…          Remplissage + confirmation
src/components/…              AppHeader, FormBuilder, FillForm
```

## À venir (hors MVP)

API d'intégration en lecture seule (`/api/integration/…`, clé `INTEGRATION_API_KEY`) pour que
l'app desktop lise les réponses **à la place de Google Forms** ; règles de réponses
(liste d'attente / annulation), validations de champs, détection de doublons.
