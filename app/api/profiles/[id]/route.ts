import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth/session";
import { profileUpdateSchema, normalizeBirthData } from "@/lib/profiles/validation";

async function getProfileOwnedBy(userId: string, profileId: string) {
  return prisma.profile.findFirst({
    where: { id: profileId, userId },
    include: { birthData: true }
  });
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const profile = await getProfileOwnedBy(userId, params.id);

    if (!profile) {
      return NextResponse.json({ message: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to load profile" },
      { status: 401 }
    );
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const profile = await getProfileOwnedBy(userId, params.id);

    if (!profile) {
      return NextResponse.json({ message: "Profile not found" }, { status: 404 });
    }

    const payload = await request.json();
    const data = profileUpdateSchema.parse(payload);
    const updates: Parameters<typeof prisma.profile.update>[0]["data"] = {};

    if (data.displayName) updates.displayName = data.displayName;
    if (data.notes !== undefined) updates.notes = data.notes;

    if (Object.keys(updates).length > 0) {
      await prisma.profile.update({
        where: { id: profile.id },
        data: updates
      });
    }

    if (data.birthData === null) {
      await prisma.birthData.deleteMany({ where: { profileId: profile.id } });
    } else if (data.birthData) {
      const normalized = normalizeBirthData(data.birthData);
      await prisma.birthData.upsert({
        where: { profileId: profile.id },
        create: { profileId: profile.id, ...normalized },
        update: normalized
      });
    }

    const updated = await getProfileOwnedBy(userId, profile.id);
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { message: "Display name already taken" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to update profile" },
      { status: 400 }
    );
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const profile = await getProfileOwnedBy(userId, params.id);

    if (!profile) {
      return NextResponse.json({ message: "Profile not found" }, { status: 404 });
    }

    await prisma.profile.delete({ where: { id: profile.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to delete" },
      { status: 400 }
    );
  }
}
