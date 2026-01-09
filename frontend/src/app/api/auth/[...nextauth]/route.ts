import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import AppleProvider from 'next-auth/providers/apple';

const providers = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

if (process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET) {
  providers.push(
    AppleProvider({
      clientId: process.env.APPLE_CLIENT_ID,
      clientSecret: process.env.APPLE_CLIENT_SECRET,
    })
  );
}

const handler = NextAuth({
  providers,
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account?.provider) {
        token.provider = account.provider;
      }
      if (account?.id_token) {
        token.idToken = account.id_token;
      }
      if (profile?.email) {
        token.email = profile.email;
      }
      if (account?.providerAccountId) {
        token.sub = account.providerAccountId;
      }
      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          email: token.email as string | undefined,
        },
        provider: token.provider as string | undefined,
        idToken: token.idToken as string | undefined,
      };
    },
  },
});

export { handler as GET, handler as POST };
