import { DefaultSession, getServerSession as nextAuthGetServerSession, NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Demo Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (credentials?.email && credentials?.password) {
          return {
            id: "demo-user",
            email: credentials.email,
            name: "Demo Config User"
          };
        }
        return null;
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async session({ session, token }) {
      return { ...session, user: { ...session.user, id: token.sub } };
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    }
  },
  secret: process.env.NEXTAUTH_SECRET
};

type SessionWithUserId = DefaultSession & {
  user?: DefaultSession["user"] & { id?: string };
};

const DEV_USER_ID = process.env.DEV_USER_ID ?? "demo-user";

export const getServerSession = () => nextAuthGetServerSession(authOptions);

export async function requireUserId() {
  const session = (await getServerSession()) as SessionWithUserId | null;
  const userId = session?.user?.id;

  if (!userId) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Unauthorized: missing session");
    }

    return DEV_USER_ID;
  }

  return userId;
}
