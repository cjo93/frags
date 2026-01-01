import { ProfileForm } from "../components/ProfileForm";

export default function NewProfilePage() {
  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">New profile</h1>
        <p className="text-sm text-gray-600">Capture a display name and optional birth data.</p>
      </header>
      <ProfileForm
        actionUrl="/api/profiles"
        method="POST"
        submitLabel="Create profile"
        resetOnSuccess
      />
    </section>
  );
}
