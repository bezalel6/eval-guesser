import type { NextAuthConfig } from "next-auth";

export default {
  providers: [], // Will be added in auth.ts with database access
  pages: {
    signIn: "/auth/signin",
    verifyRequest: "/auth/verify",
    error: "/auth/error",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
      const isOnRush = nextUrl.pathname.startsWith("/rush");
      
      if (isOnDashboard || isOnRush) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      }
      
      return true; // Allow access to public pages
    },
  },
} satisfies NextAuthConfig;