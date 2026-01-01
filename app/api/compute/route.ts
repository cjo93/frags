import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth/session";
import { canonicalStringify, sha256Hex } from "@/lib/utils/canonical";

type ComputeRequestBody = {
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
    date: birthData.date?.toISOString() ?? null,
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
    throw new Error("Profile not found");
  }

  return {
    profileId,
    birthData: normalizeBirth(profile.birthData),
    options: options ?? {}
  };
}

function buildArtifact({
  engine,
  engineVersion,
  profileId,
  inputsHash,
  canonicalInputs
}: {
  engine: string;
  engineVersion: string;
  profileId: string;
  inputsHash: string;
  canonicalInputs: Record<string, unknown> | null;
}) {
  return {
    engine,
    engineVersion,
    profileId,
    inputsHash,
    natal: canonicalInputs,
    computed: { placeholder: true }
  };
}

export async function POST(request: Request) {
  const now = new Date();
  let computeRunId: string | undefined;
  let inputsHash: string | undefined;
  let engineVersion: string | undefined;
  let engine: string = "defrag-core";

  try {
    const userId = await requireUserId();
    const body = (await request.json()) as ComputeRequestBody;
    engineVersion = body.engineVersion;
    engine = body.engine ?? engine;

    if (!body.profileId || !body.engineVersion) {
      return NextResponse.json({ message: "profileId and engineVersion are required" }, { status: 400 });
    }

    const profile = await prisma.profile.findFirst({
      where: { id: body.profileId, userId },
      include: { birthData: true }
    });

    if (!profile) {
      return NextResponse.json({ message: "Profile not found" }, { status: 404 });
    }

    const canonicalInputs = await buildCanonicalInputs(body.profileId, body.options);
    const inputsJson = canonicalStringify(canonicalInputs);
    inputsHash = sha256Hex(inputsJson);

    // check cached success
    const existing = await prisma.computeRun.findUnique({
      where: {
        profileId_engineVersion_inputsHash: {
          profileId: profile.id,
          engineVersion: body.engineVersion,
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
      return NextResponse.json({
        computeRunId: existing.id,
        cached: true,
        artifact: existing.artifacts[0].canonicalJson
      });
    }

    // upsert run to RUNNING
    const running = await prisma.computeRun.upsert({
      where: {
        profileId_engineVersion_inputsHash: {
          profileId: profile.id,
          engineVersion: body.engineVersion,
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
        userId,
        profileId: profile.id,
        engine,
        engineVersion: body.engineVersion,
        inputsHash,
        status: "RUNNING",
        startedAt: now
      }
    });

    computeRunId = running.id;

    const artifactPayload = buildArtifact({
      engine,
      engineVersion: body.engineVersion,
      profileId: profile.id,
      inputsHash,
      canonicalInputs
    });

    const artifactJson: Prisma.InputJsonValue = artifactPayload as Prisma.InputJsonValue;

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

    return NextResponse.json({
      computeRunId: running.id,
      cached: false,
      artifact: artifactPayload
    });
  } catch (error) {
    if (computeRunId) {
      await prisma.computeRun.update({
        where: { id: computeRunId },
        data: {
          status: "FAILED",
          finishedAt: new Date(),
          error: error instanceof Error ? error.message : "Unknown error"
        }
      });
    }
    const status = error instanceof Error && error.message === "Profile not found" ? 404 : 400;
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to process compute" },
      { status }
    );
  }
}
