import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ComputePanel } from "./components/ComputePanel";

export default async function InsightsPage({ params }: { params: { id: string } }) {
  const profile = await prisma.profile.findUnique({
    where: { id: params.id },
    include: { birthData: true }
  });

  if (!profile) {
    notFound();
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">
            <Link href="/profiles" className="text-blue-600">
              Back to profiles
            </Link>
          </p>
          <h1 className="text-3xl font-semibold">Insights for {profile.displayName}</h1>
          <p className="text-sm text-gray-600">
            Run deterministic compute, inspect ephemeris cache, and visualize results.
          </p>
        </div>
      </div>
      <div className="rounded border p-4">
        <h2 className="text-lg font-semibold">Profile summary</h2>
        <p className="text-sm text-gray-600">Notes: {profile.notes ?? "—"}</p>
        {profile.birthData ? (
          <dl className="mt-2 grid gap-3 sm:grid-cols-3 text-sm">
            <div>
              <dt className="text-gray-500">Date</dt>
              <dd className="font-medium">
                {profile.birthData.date.toISOString().slice(0, 10)} ({profile.birthData.tzIana})
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Coords</dt>
              <dd className="font-medium">
                {profile.birthData.latitude ?? "—"}, {profile.birthData.longitude ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Fidelity</dt>
              <dd className="font-medium">{profile.birthData.fidelity}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-gray-600">No birth data provided.</p>
        )}
      </div>
      <ComputePanel profileId={profile.id} profileName={profile.displayName} />
    </section>
  );
}
