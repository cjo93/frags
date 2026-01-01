-- CreateTable
CREATE TABLE "EphemerisRequest" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "requestJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EphemerisRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EphemerisCache" (
    "id" TEXT NOT NULL,
    "ephemerisRequestId" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "canonicalJson" JSONB NOT NULL,
    "canonicalHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EphemerisCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EphemerisRequest_cacheKey_key" ON "EphemerisRequest"("cacheKey");

-- CreateIndex
CREATE UNIQUE INDEX "EphemerisCache_ephemerisRequestId_key" ON "EphemerisCache"("ephemerisRequestId");

-- AddForeignKey
ALTER TABLE "EphemerisCache" ADD CONSTRAINT "EphemerisCache_ephemerisRequestId_fkey" FOREIGN KEY ("ephemerisRequestId") REFERENCES "EphemerisRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
