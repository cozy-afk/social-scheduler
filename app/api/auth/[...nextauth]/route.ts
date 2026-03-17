import NextAuth, { NextAuthOptions } from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';
import { NextRequest } from 'next/server';

// Get the current URL dynamically to support both production and preview deployments
function getAuthUrl(request?: NextRequest): string {
  // Use NEXTAUTH_URL if set (production)
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL;
  }

  // Otherwise, infer from the request
  if (request) {
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('host');
    if (host) {
      return `${protocol}://${host}`;
    }
  }

  return 'http://localhost:3000';
}

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
        // Add user ID from token subject
        session.user.id = token.sub!;

        // Admin users - automatically approved
        const adminEmails = ['cozygirlamy@gmail.com'];

        if (adminEmails.includes(session.user.email || '')) {
          session.user.role = 'admin';
          session.user.approvalStatus = 'approved';
        } else {
          // Default values for new users (would be updated from database in production)
          // Requires NEXTAUTH_SECRET and NEXTAUTH_URL environment variables
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

// Create handler with dynamic URL support
const handler = async (req: Request, context: { params?: Promise<Record<string, string | string[]>> }) => {
  const nextRequest = req as unknown as NextRequest;
  const dynamicUrl = getAuthUrl(nextRequest);
  // Set the URL as an environment variable for this request
  (process.env as any).NEXTAUTH_URL = dynamicUrl;
  return NextAuth(authOptions)(req, context);
};

export { handler as GET, handler as POST };
