import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canonicalStringify, sha256Hex } from "@/lib/utils/canonical";
import { getOrCreateEphemeris } from "@/lib/ephemeris/cache";
import { EphemerisRequestInput } from "@/lib/horizons";
import { HttpError } from "@/lib/http";

type RunComputeInput = {
  userId: string;
  profileId: string;
  engineVersion: string;
  engine?: string;
  options?: Record<string, unknown>;
};

const ARTIFACT_KIND = "L_env";
const ARTIFACT_SCHEMA = "1";

function normalizeBirth(birthData: any) {
  if (!birthData) return null;
  return {
    date: birthData.date?.toISOString?.() ?? null,
    time: birthData.time ?? null,
    tzIana: birthData.tzIana ?? null,
    latitude: birthData.latitude ?? null,
    longitude: birthData.longitude ?? null,
    altitude: birthData.altitude ?? null,
    fidelity: birthData.fidelity ?? null
  };
}

async function buildCanonicalInputs(profileId: string, options: any) {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    include: { birthData: true }
  });

  if (!profile) {
    throw new HttpError(404, "Profile not found");
  }

  return {
    profileId,
    birthData: normalizeBirth(profile.birthData),
    options: options ?? {}
  };
}

function buildEphemerisInput(profile: { birthData: any }): EphemerisRequestInput {
  const birth = profile.birthData;
  const baseTimestamp =
    birth?.timeUtc?.toISOString?.() ?? birth?.date?.toISOString?.() ?? "2000-01-01T00:00:00.000Z";

  const observer =
    birth?.latitude !== null &&
    birth?.latitude !== undefined &&
    birth?.longitude !== null &&
    birth?.longitude !== undefined
      ? {
          kind: "TOPO" as const,
          latitude: birth.latitude,
          longitude: birth.longitude,
          elevation: birth?.altitude ?? 0
        }
      : ({ kind: "GEOCENTER" } as const);

  return {
    target: "sun",
    observer,
    refFrame: "ICRF",
    timescale: "UTC",
    start: baseTimestamp,
    stop: baseTimestamp,
    step: "1h",
    quantities: [1, 2],
    units: "KM"
  };
}

export async function runCompute(input: RunComputeInput) {
  const now = new Date();
  const engine = input.engine ?? "defrag-core";

  const profile = await prisma.profile.findFirst({
    where: { id: input.profileId, userId: input.userId },
    include: { birthData: true }
  });

  if (!profile) {
    throw new HttpError(404, "Profile not found");
  }

  const canonicalInputs = await buildCanonicalInputs(input.profileId, input.options);
  const inputsJson = canonicalStringify(canonicalInputs);
  const inputsHash = sha256Hex(inputsJson);

  // check cached success
  const existing = await prisma.computeRun.findUnique({
    where: {
      profileId_engineVersion_inputsHash: {
        profileId: profile.id,
        engineVersion: input.engineVersion,
        inputsHash
      }
    },
    include: {
      artifacts: {
        where: { kind: ARTIFACT_KIND, schemaVersion: ARTIFACT_SCHEMA }
      }
    }
  });

  if (existing && existing.status === "SUCCESS" && existing.artifacts[0]) {
    return {
      computeRunId: existing.id,
      cached: true,
      artifact: existing.artifacts[0].canonicalJson
    };
  }

  // upsert run to RUNNING
  const running = await prisma.computeRun.upsert({
    where: {
      profileId_engineVersion_inputsHash: {
        profileId: profile.id,
        engineVersion: input.engineVersion,
        inputsHash
      }
    },
    update: {
      status: "RUNNING",
      startedAt: now,
      finishedAt: null,
      error: null
    },
    create: {
      userId: input.userId,
      profileId: profile.id,
      engine,
      engineVersion: input.engineVersion,
      inputsHash,
      status: "RUNNING",
      startedAt: now
    }
  });

  const ephemerisInput = buildEphemerisInput(profile);
  const ephemerisRequest = ephemerisInput;
  const ephemeris = await getOrCreateEphemeris(ephemerisRequest);

  const artifactPayload = {
    engine,
    engineVersion: input.engineVersion,
    profileId: profile.id,
    inputsHash,
    birthData: canonicalInputs.birthData,
    options: canonicalInputs.options,
    ephemeris: {
      cacheKey: ephemeris.cacheKey,
      canonicalHash: ephemeris.canonicalHash,
      request: ephemerisRequest,
      canonical: ephemeris.canonicalJson
    }
  };

  const artifactJson: Prisma.InputJsonValue = artifactPayload as unknown as Prisma.InputJsonValue;

  await prisma.computeArtifact.upsert({
    where: {
      computeRunId_kind_schemaVersion: {
        computeRunId: running.id,
        kind: ARTIFACT_KIND,
        schemaVersion: ARTIFACT_SCHEMA
      }
    },
    update: {
      canonicalJson: artifactJson,
      rawJson: artifactJson
    },
    create: {
      computeRunId: running.id,
      kind: ARTIFACT_KIND,
      schemaVersion: ARTIFACT_SCHEMA,
      canonicalJson: artifactJson,
      rawJson: artifactJson
    }
  });

  await prisma.computeRun.update({
    where: { id: running.id },
    data: {
      status: "SUCCESS",
      finishedAt: new Date()
    }
  });

  return {
    computeRunId: running.id,
    cached: false,
    artifact: artifactPayload
  };
}
