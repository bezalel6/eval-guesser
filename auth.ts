import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import Lichess from "@/lib/auth-providers/lichess";

export const { 
  handlers, 
  auth, 
  signIn, 
  signOut 
} = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Lichess({
      clientId: process.env.LICHESS_CLIENT_ID || "eval-rush-app",
      clientSecret: "", // Lichess doesn't require a client secret
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user && user) {
        session.user.id = user.id;
      }
      return session;
    },
    async signIn({ account }) {
      // Allow Lichess sign in
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