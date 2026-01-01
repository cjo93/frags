-- CreateEnum
CREATE TYPE "Fidelity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "FamilyRelation" AS ENUM ('PARENT', 'CHILD', 'SIBLING', 'PARTNER', 'OTHER');

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BirthData" (
    "profileId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TEXT,
    "tzIana" TEXT NOT NULL,
    "timeUtc" TIMESTAMP(3),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "altitude" DOUBLE PRECISION,
    "fidelity" "Fidelity" NOT NULL DEFAULT 'MEDIUM',

    CONSTRAINT "BirthData_pkey" PRIMARY KEY ("profileId")
);

-- CreateTable
CREATE TABLE "FamilyEdge" (
    "id" TEXT NOT NULL,
    "fromProfileId" TEXT NOT NULL,
    "toProfileId" TEXT NOT NULL,
    "relationType" "FamilyRelation" NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyEdge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Profile_userId_idx" ON "Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_displayName_key" ON "Profile"("userId", "displayName");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyEdge_fromProfileId_toProfileId_relationType_key" ON "FamilyEdge"("fromProfileId", "toProfileId", "relationType");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BirthData" ADD CONSTRAINT "BirthData_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyEdge" ADD CONSTRAINT "FamilyEdge_fromProfileId_fkey" FOREIGN KEY ("fromProfileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyEdge" ADD CONSTRAINT "FamilyEdge_toProfileId_fkey" FOREIGN KEY ("toProfileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
