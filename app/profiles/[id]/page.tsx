import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserIdOrRedirect } from "@/lib/auth/guards";
import { ProfileForm } from "../components/ProfileForm";

interface ProfileEditParams {
  params: {
    id: string;
  };
}

export default async function ProfileEditPage({ params }: ProfileEditParams) {
  const userId = await requireUserIdOrRedirect();
  const profile = await prisma.profile.findFirst({
    where: { id: params.id, userId },
    include: { birthData: true }
  });

  if (!profile) {
    notFound();
  }

  const initialProfile = {
    displayName: profile.displayName,
    notes: profile.notes ?? undefined,
    birthData: profile.birthData
      ? {
          date: profile.birthData.date.toISOString().split("T")[0],
          time: profile.birthData.time ?? "",
          tzIana: profile.birthData.tzIana,
          timeUtc: profile.birthData.timeUtc
            ? profile.birthData.timeUtc.toISOString().slice(0, 16)
            : undefined,
          latitude:
            profile.birthData.latitude !== null && profile.birthData.latitude !== undefined
              ? String(profile.birthData.latitude)
              : undefined,
          longitude:
            profile.birthData.longitude !== null && profile.birthData.longitude !== undefined
              ? String(profile.birthData.longitude)
              : undefined,
          altitude:
            profile.birthData.altitude !== null && profile.birthData.altitude !== undefined
              ? String(profile.birthData.altitude)
              : undefined,
          fidelity: profile.birthData.fidelity as "LOW" | "MEDIUM" | "HIGH"
        }
      : undefined
  };

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Edit profile</h1>
        <p className="text-sm text-gray-500">Update profile details or birth data.</p>
      </header>
      <ProfileForm
        initial={initialProfile}
        actionUrl={`/api/profiles/${profile.id}`}
        method="PATCH"
        submitLabel="Save profile"
        resetOnSuccess={false}
      />
    </section>
  );
}
