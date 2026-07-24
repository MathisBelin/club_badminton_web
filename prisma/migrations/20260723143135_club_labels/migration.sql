-- AlterTable
ALTER TABLE "Form" ADD COLUMN     "labelResource" TEXT;

-- CreateTable
CREATE TABLE "ClubLabel" (
    "resourceName" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerEmail" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubLabel_pkey" PRIMARY KEY ("resourceName")
);

-- CreateTable
CREATE TABLE "ClubLabelMember" (
    "labelResource" TEXT NOT NULL,
    "email" TEXT NOT NULL,

    CONSTRAINT "ClubLabelMember_pkey" PRIMARY KEY ("labelResource","email")
);

-- CreateIndex
CREATE INDEX "ClubLabel_ownerEmail_idx" ON "ClubLabel"("ownerEmail");

-- CreateIndex
CREATE INDEX "ClubLabelMember_email_idx" ON "ClubLabelMember"("email");

-- AddForeignKey
ALTER TABLE "ClubLabelMember" ADD CONSTRAINT "ClubLabelMember_labelResource_fkey" FOREIGN KEY ("labelResource") REFERENCES "ClubLabel"("resourceName") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Form" ADD CONSTRAINT "Form_labelResource_fkey" FOREIGN KEY ("labelResource") REFERENCES "ClubLabel"("resourceName") ON DELETE SET NULL ON UPDATE CASCADE;
