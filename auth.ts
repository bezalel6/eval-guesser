import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { 
  handlers,
  auth, 
  signIn, 
  signOut 
} = NextAuth({
  adapter: PrismaAdapter(prisma),
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
      profile(profile) {
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
    async session({ session, user }) {
      if (session.user && user) {
        session.user.id = user.id;
      }
      return session;
    },
    async signIn({ account }) {
      return account?.provider === "lichess";
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "database",
  },
  debug: process.env.NODE_ENV === "development",
});