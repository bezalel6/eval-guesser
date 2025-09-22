import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";

const config: NextAuthConfig = {
  providers: [
    {
      id: "lichess",
      name: "Lichess",
      type: "oauth",
      authorization: {
        url: "https://lichess.org/oauth",
        params: {
          scope: "preference:read",
        },
      },
      token: "https://lichess.org/api/token",
      userinfo: "https://lichess.org/api/account",
      client: {
        token_endpoint_auth_method: "none",
      },
      checks: ["pkce", "state"],
      profile(profile: any) {
        return {
          id: profile.id,
          name: profile.username,
          email: `${profile.username}@lichess.org`,
          image: null,
        };
      },
      clientId: process.env.LICHESS_CLIENT_ID || "eval-rush-app",
      clientSecret: "",
    }
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.id = profile.id;
        token.username = profile.username;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.name = token.username as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

export const { handlers, auth, signIn, signOut } = NextAuth(config);