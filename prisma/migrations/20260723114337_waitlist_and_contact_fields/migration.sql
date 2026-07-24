-- CreateEnum
CREATE TYPE "ContactField" AS ENUM ('FIRST_NAME', 'LAST_NAME', 'PHONE', 'EMAIL', 'SECONDARY_EMAIL');

-- AlterTable
ALTER TABLE "Form" ADD COLUMN     "termsEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "contactField" "ContactField",
ADD COLUMN     "optionActions" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Response" ADD COLUMN     "waitlistedAt" TIMESTAMP(3);
