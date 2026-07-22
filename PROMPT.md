Je développe une application web pour gérer les FORMULAIRES D'INSCRIPTION d'un club de
badminton : un clone de Google Forms enrichi. Connexion Google obligatoire. Interface 100 % en
français. Reprends le développement dessus.

CONTEXTE PROJET
- Dépôt local : F:\Projets\Pro\bad-web  (projet SÉPARÉ du desktop WPF F:\Projets\Pro\Bad).
- Pile : Next.js 16 (App Router, TypeScript, React 19) + Tailwind CSS v4.
  Auth.js v5 (NextAuth, provider Google, sessions JWT). Prisma + PostgreSQL (Neon).
  Pas de state manager externe : Server Components + Server Actions + composants clients ciblés.
- Doc à jour et complète : lis d'abord docs/DOCUMENTATION.md (architecture, pages, modèle de
  données, auth/rôles, lien de partage, déploiement).
- But à terme : REMPLACER la dépendance Google Forms du desktop. Le desktop lira les réponses via
  une API d'intégration (à faire). Modèle de données calqué sur ce que le desktop attend
  (types de questions, e-mail vérifié, submittedAt/lastSubmittedAt).

COMMENT JE TRAVAILLE (à respecter)
- Après CHAQUE modif : vérifier les types avec `npx tsc --noEmit` (rapide, ne touche pas au moteur
  Prisma). `npm run build` fait `prisma generate && next build` mais ÉCHOUE en local si le serveur
  de dev tourne (EPERM : la DLL du moteur Prisma est verrouillée) → couper le dev, ou se contenter
  de tsc + laisser Vercel builder proprement.
- Lancer en local : `npm run dev` (http://localhost:3000). La connexion Google marche déjà en local.
- Après changement de schéma Prisma : `npx prisma migrate dev --name <nom>`.
- Réponses en français, concises.

RÈGLES IMPORTANTES
- NE JAMAIS committer .env (secrets : DATABASE_URL, AUTH_*, INTEGRATION_API_KEY) — déjà .gitignore'd
  (.env* ignoré, sauf .env.example). Le dossier .vercel est aussi ignoré.
- Ne mets JAMAIS de secret dans le code ni dans la doc : uniquement des NOMS de variables d'env.
- Connexion Google OBLIGATOIRE partout (proxy.ts protège toutes les routes sauf /connexion et
  /api/auth). Le rôle admin = liste d'e-mails dans la variable d'env ADMIN_EMAILS.
- Ne pas déployer / pousser sans demande explicite.

ÉTAT ACTUEL
- MVP en place et déployé : auth Google + garde de rôle, tableau de bord admin (créer / publier /
  supprimer), CONSTRUCTEUR de formulaire (6 types de questions, options, obligatoire, réordonner),
  REMPLISSAGE côté utilisateur (gate publié + connecté, upsert par e-mail vérifié, modification de
  réponse), VISUALISEUR de réponses (tableau + export CSV), LIEN DE PARTAGE copiable quand un
  formulaire est « accessible ».
- Déploiement : Vercel (compte « bad12 »), URL de prod https://bad-web-rho.vercel.app ; base Neon
  (déjà migrée). Déploiement via jeton : `VERCEL_TOKEN=… vercel --prod --yes`. Variables d'env de
  prod configurées (dont AUTH_URL épinglée sur l'URL de prod).
- Thème CLAIR forcé (color-scheme: light) : l'appli était illisible en mode sombre système.
- ⚠️ EN ATTENTE : la connexion Google EN LIGNE échoue tant que l'URI de redirection de prod
  `https://bad-web-rho.vercel.app/api/auth/callback/google` n'est pas ajoutée dans le client OAuth
  « Application Web » (Google Cloud) → erreur redirect_uri_mismatch. En local, l'URI localhost est
  déjà enregistrée.
- ⚠️ À VÉRIFIER : le projet Vercel est sous le compte « bad12 » (celui du jeton), s'assurer que
  c'est bien un compte de l'utilisateur.
- À FAIRE (hors MVP) : API d'intégration en lecture seule (/api/integration/…, clé
  INTEGRATION_API_KEY) pour que le desktop lise les réponses à la place de Google Forms ; règles de
  réponses (liste d'attente / annulation), validations de champs, détection de doublons ; option
  « formulaires accessibles uniquement via le lien » (aujourd'hui aussi listés sur l'accueil).

Confirme que tu as lu docs/DOCUMENTATION.md puis attends ma prochaine demande.
