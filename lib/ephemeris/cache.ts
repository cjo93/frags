import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildEphemerisCacheKey,
  buildEphemerisRequest,
  EphemerisRequestInput,
  fetchHorizonsRaw,
  parseHorizonsRaw
} from "@/lib/horizons";
import { canonicalStringify, sha256Hex } from "@/lib/utils/canonical";

export interface EphemerisCacheResult {
  cacheKey: string;
  canonicalHash: string;
  canonicalJson: Prisma.JsonValue;
  rawText: string;
  fromCache: boolean;
}

export async function getOrCreateEphemeris(input: EphemerisRequestInput): Promise<EphemerisCacheResult> {
  const canonicalRequest = buildEphemerisRequest(input);
  const cacheKey = buildEphemerisCacheKey(canonicalRequest);
  const requestJson = canonicalRequest as unknown as Prisma.InputJsonValue;

  const existingRequest = await prisma.ephemerisRequest.findUnique({
    where: { cacheKey },
    include: { cache: true }
  });

  if (existingRequest?.cache) {
    return {
      cacheKey,
      canonicalHash: existingRequest.cache.canonicalHash,
      canonicalJson: existingRequest.cache.canonicalJson,
      rawText: existingRequest.cache.rawText,
      fromCache: true
    };
  }

  const requestRecord = await prisma.ephemerisRequest.upsert({
    where: { cacheKey },
    update: { requestJson },
    create: {
      cacheKey,
      requestJson
    }
  });

  const rawText = await fetchHorizonsRaw(canonicalRequest);
  const parsed = parseHorizonsRaw(rawText);
  const canonicalJson = parsed as unknown as Prisma.InputJsonValue;
  const canonicalHash = sha256Hex(canonicalStringify(parsed));

  const cache = await prisma.ephemerisCache.create({
    data: {
      ephemerisRequestId: requestRecord.id,
      rawText,
      canonicalJson,
      canonicalHash
    }
  });

  return {
    cacheKey,
    canonicalHash,
    canonicalJson: cache.canonicalJson,
    rawText,
    fromCache: false
  };
}
