import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth/session";
import { familyEdgeSchema } from "@/lib/profiles/validation";

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const payload = await request.json();
    const parsed = familyEdgeSchema.parse(payload);

    const ownedProfiles = await prisma.profile.findMany({
      where: { id: { in: [parsed.fromProfileId, parsed.toProfileId] }, userId },
      select: { id: true }
    });

    if (ownedProfiles.length !== 2) {
      return NextResponse.json(
        { message: "Both profiles must belong to the authenticated user." },
        { status: 403 }
      );
    }

    const edge = await prisma.familyEdge.upsert({
      where: {
        fromProfileId_toProfileId_relationType: {
          fromProfileId: parsed.fromProfileId,
          toProfileId: parsed.toProfileId,
          relationType: parsed.relationType
        }
      },
      create: {
        ...parsed,
        label: parsed.label
      },
      update: {
        label: parsed.label
      }
    });

    return NextResponse.json(edge);
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: "Unable to create family edge" }, { status: 500 });
  }
}
