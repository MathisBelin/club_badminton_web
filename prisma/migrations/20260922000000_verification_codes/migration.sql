-- Vérification d'e-mail par CODE (au lieu d'un lien à jeton).
-- On conserve les lignes existantes (notamment les adresses déjà vérifiées) : on ajoute
-- les colonnes `code`/`attempts` avec des valeurs par défaut, puis on retire `token`.

-- AccountVerification
DROP INDEX "AccountVerification_token_key";
ALTER TABLE "AccountVerification"
  ADD COLUMN "code" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AccountVerification" DROP COLUMN "token";

-- EmailVerification
DROP INDEX "EmailVerification_token_key";
ALTER TABLE "EmailVerification"
  ADD COLUMN "code" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "EmailVerification" DROP COLUMN "token";
