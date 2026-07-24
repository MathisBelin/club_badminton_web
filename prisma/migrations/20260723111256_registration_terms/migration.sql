-- AlterTable
ALTER TABLE "Form" ADD COLUMN     "termsText" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Response" ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3);
