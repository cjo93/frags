-- CreateEnum
CREATE TYPE "ComputeStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "ComputeRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "engine" TEXT NOT NULL DEFAULT 'defrag-core',
    "engineVersion" TEXT NOT NULL,
    "inputsHash" TEXT NOT NULL,
    "status" "ComputeStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComputeRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComputeArtifact" (
    "id" TEXT NOT NULL,
    "computeRunId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "canonicalJson" JSONB NOT NULL,
    "rawJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComputeArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ComputeRun_userId_idx" ON "ComputeRun"("userId");

-- CreateIndex
CREATE INDEX "ComputeRun_profileId_createdAt_idx" ON "ComputeRun"("profileId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ComputeRun_profileId_engineVersion_inputsHash_key" ON "ComputeRun"("profileId", "engineVersion", "inputsHash");

-- CreateIndex
CREATE UNIQUE INDEX "ComputeArtifact_computeRunId_kind_schemaVersion_key" ON "ComputeArtifact"("computeRunId", "kind", "schemaVersion");

-- AddForeignKey
ALTER TABLE "ComputeRun" ADD CONSTRAINT "ComputeRun_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComputeArtifact" ADD CONSTRAINT "ComputeArtifact_computeRunId_fkey" FOREIGN KEY ("computeRunId") REFERENCES "ComputeRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
