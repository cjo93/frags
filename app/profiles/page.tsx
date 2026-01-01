import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUserIdOrRedirect } from "@/lib/auth/guards";

export default async function ProfilesPage() {
  const userId = await requireUserIdOrRedirect();
  const profiles = await prisma.profile.findMany({
    where: { userId },
    include: { birthData: true },
    orderBy: { createdAt: "desc" }
  });

  return (
    <section>
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Profiles</h1>
        <Link
          href="/profiles/new"
          className="rounded bg-blue-700 px-4 py-2 text-white hover:bg-blue-600"
        >
          New profile
        </Link>
      </header>
      {profiles.length === 0 ? (
        <p className="mt-6 text-sm text-gray-700">No profiles yet.</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {profiles.map((profile) => (
            <li key={profile.id} className="rounded border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-medium">{profile.displayName}</p>
                  <p className="text-sm text-gray-500">
                    Created {new Date(profile.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-3 text-sm font-semibold text-blue-600">
                  <Link href={`/profiles/${profile.id}`}>Edit</Link>
                  <Link href={`/profiles/${profile.id}/insights`}>Insights</Link>
                </div>
              </div>
              {profile.birthData && (
                <div className="mt-3 text-sm text-gray-600">
                  <p>Birth date: {new Date(profile.birthData.date).toLocaleDateString()}</p>
                  <p>Timezone: {profile.birthData.tzIana}</p>
                  <p>Latitude / Longitude: {profile.birthData.latitude ?? "n/a"} /{" "}
                    {profile.birthData.longitude ?? "n/a"}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
