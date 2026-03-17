import NextAuth, { NextAuthOptions } from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';
import { useStore } from '@/lib/store';

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn() {
      return true;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;

        // Sync user with store (this happens server-side, store is a mock)
        // In production, this would query the database
        const user = useStore.getState().users.find(
          (u) => u.discordId === token.sub || u.email === session.user.email
        );

        if (user) {
          session.user.role = user.role;
          session.user.approvalStatus = user.approvalStatus;
          session.user.agencyId = user.agencyId;
        } else {
          // New user - will be created on first sign in
          session.user.role = 'agency';
          session.user.approvalStatus = 'pending';
        }
      }
      return session;
    },
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
  },
  pages: {
    signIn: '/auth/splash',
  },
  session: {
    strategy: 'jwt',
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
