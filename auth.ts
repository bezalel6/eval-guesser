import NextAuth from "next-auth/next";
import type { NextAuthConfig } from "next-auth";

interface LichessProfile {
  id: string;
  username: string;
  email?: string;
}

// Export authOptions separately for use in API route
export const authOptions: NextAuthConfig = {
  providers: [
    {
      id: "lichess",
      name: "Lichess",
      type: "oauth" as const,
      authorization: {
        url: "https://lichess.org/oauth",
        params: {
          scope: "email:read",  // Request email:read scope to get user's email if available
        },
      },
      token: "https://lichess.org/api/token",
      userinfo: "https://lichess.org/api/account",
      clientId: process.env.LICHESS_CLIENT_ID || "eval-rush-app",
      clientSecret: "",  // Lichess doesn't require a secret for public clients
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      checks: ["pkce" as any, "state" as any],
      client: {
        token_endpoint_auth_method: "none" as const,
      },
      profile(profile: LichessProfile) {
        // Only use the real email if provided by Lichess
        return {
          id: profile.id,
          name: profile.username,
          email: profile.email || null,  // Use null if no email, not a fake one
          image: null,
        };
      },
    },
  ],
  callbacks: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async jwt({ token, account, profile }: any) {
      // On initial sign-in, account will be present
      if (account && profile) {
        token.id = profile.id;
        token.username = profile.username;
        token.provider = "lichess";
        // Store the real email if provided
        token.email = profile.email || null;
      }
      return token;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.username as string;
        session.user.provider = token.provider as string;
        // Pass through the real email or null
        session.user.email = token.email as string | null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/signin",  // Redirect back to signin with error in URL params
  },
  session: {
    strategy: "jwt" as const,
  },
  secret: process.env.NEXTAUTH_SECRET || "development-secret-change-in-production",
  debug: process.env.NODE_ENV === "development",
};

// Export auth functions for use in server components and actions
export const { auth, signIn, signOut } = NextAuth(authOptions);