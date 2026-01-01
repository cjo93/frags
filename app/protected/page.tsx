import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function ProtectedPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/");
  }

  return (
    <section>
      <h1>Protected placeholder</h1>
      <p>This page requires Auth.js session data (placeholder behavior).</p>
      <p>Session expires: {session.expires}</p>
    </section>
  );
}
