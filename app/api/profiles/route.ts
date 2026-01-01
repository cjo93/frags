import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { profileCreateSchema, normalizeBirthData } from "@/lib/profiles/validation";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth/session";

export async function GET() {
  try {
    const userId = await requireUserId();
    const profiles = await prisma.profile.findMany({
      where: { userId },
      include: { birthData: true }
    });
    return NextResponse.json(profiles);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to read profiles" },
      { status: 401 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const payload = await request.json();
    const parsed = profileCreateSchema.parse(payload);
    const birthData = parsed.birthData ? normalizeBirthData(parsed.birthData) : undefined;

    const created = await prisma.profile.create({
      data: {
        userId,
        displayName: parsed.displayName,
        notes: parsed.notes,
        birthData: birthData ? { create: birthData } : undefined
      },
      include: { birthData: true }
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { message: "Profile display name already exists for this user." },
        { status: 409 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: "Unable to create profile" }, { status: 500 });
  }
}
