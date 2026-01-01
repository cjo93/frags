import Link from "next/link";
import { getServerSession } from "@/lib/auth/session";

export default async function HomePage() {
  const session = await getServerSession();

  return (
    <section>
      <h1>Frags Scaffold</h1>
      <p>Your Next.js + Prisma + Auth.js + Stripe starter.</p>
      <p>
        {session
          ? `Signed in as ${session.user?.email ?? session.user?.name}`
          : "Not signed in yet."}
      </p>
      <p>
        <Link href="/protected">Go to a placeholder protected route</Link>
      </p>
    </section>
  );
}
