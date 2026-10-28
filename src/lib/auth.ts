import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "admin@akshara.test" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // One generic message for every failure, so the login form can't be used to discover
        // which emails have accounts.
        const invalid = "Invalid email or password";
        if (!credentials?.email || !credentials?.password) {
          throw new Error(invalid);
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.trim().toLowerCase() },
        });

        const isPasswordValid = user?.passwordHash
          ? await bcrypt.compare(credentials.password, user.passwordHash)
          : false;

        if (!user || !isPasswordValid) {
          throw new Error(invalid);
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        return token;
      }
      // Keep role and name in the cookie in step with the database, so a role change made by an
      // admin reaches the UI (and the edge middleware) the next time the session is fetched.
      if (token.id) {
        const current = await prisma.user.findUnique({
          where: { id: token.id },
          select: { role: true, name: true },
        });
        if (current) {
          token.role = current.role;
          token.name = current.name;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
  // Never fall back to a known secret in production: NextAuth refuses to start without one,
  // which is safer than silently signing sessions with a value that's in the repo.
  secret:
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    (process.env.NODE_ENV === "production" ? undefined : "akshara-crm-dev-only-secret"),
};
